// Level 13's creatures, one manager (l13e-mgr) stepping all of them the way scripts/hounds.js steps its pack.
// TENANT: sways at its TV; sees you in its flat or down the hall through its doorway and throws plates and tins in a real arc.
//   It can not cross its own doorway. Six throws, then four seconds at the counter restocking: that is when you rush it.
// HALL LURKER: waits in a5's bedroom. Walk past its doorway without looking at it and it drags you in. Look at the doorway and it hisses and stays.
import { raycast } from "builtin/physics";
import D from "./lib/data/level13.yml";
import { apt, aptAt, inHall } from "./lib/level13.js";
import { SLOTS, homeOf, foeSpec } from "./lib/level13-foes.js";
import { knocked } from "./lib/knock.js";
import { clearSight } from "./lib/sight.js";
import { heard } from "./lib/hear.js";
import { shotAt } from "./lib/hunt.js";
import { crouchMul } from "./lib/sneak.js";
import { sneakMul, dmgAfterArmor } from "./lib/stats.js";
import { becomeCorpse } from "./lib/l5-hostile.js";
import { rollCash, rollWeapon, rollMeat } from "./lib/loot.js";
const F = D.foes, TN = F.tenant, LK = F.lurker;
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const S = { clink: "ceramic-plates-clinking-picked-off-a-stack", throw: "quick-cloth-sleeve-whoosh-arm-throw", smash: "ceramic-plate-smashing-on-hard-floor", tin: "tin-can-clattering-off-a-wall",
  shove: "dull-two-handed-body-shove-thud", tHurt: "muffled-tired-old-grunt-behind-cloth", tDie: "long-tired-sigh-and-body-slumping-in-robe",
  drag: "heavy-body-dragged-fast-across-carpet", lamp: "lightbulb-filament-pop-going-dark", hiss: "dry-breathy-hiss-from-a-dark-room", lHurt: "dry-rasping-airless-shriek-short", lDie: "dry-rattle-collapse-of-thin-limbs-on-carpet", swipe: "fast-long-arm-swipe-whoosh" };
const CLIP = { idle: "cdn/clip-idle-loop.glb", walk: "cdn/clip-walk-loop.glb", throw: "cdn/clip-throw.glb", hit: "cdn/clip-attack.glb", hurt: "cdn/clip-hit-react.glb", pick: "cdn/clip-pickup.glb", low: "cdn/clip-crouch-idle-loop.glb", crawl: "cdn/clip-crouch-walk-loop.glb" };
const SHARDS = `fx
pop shard burst=10..14 life=.5..0.9 v=sdir()*(1.4..3.4)+up(1.2) size=.03..0.06 acc=grav()+drag(.5) col=<%r|.92,%g|.9,%b|.84> a=1>.8:1>0 sz=$size floor=bounce(.3) r=sprite(soft-disc,alpha)
pop dust burst=5 life=.4..0.7 v=sdir()*(.3..0.8) size=.12..0.2 acc=drag(1.5) col=<.8,.78,.72> a=0>.3:.3>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
const POOF = `fx
pop dust burst=14 life=.6..1 on=box(.5,.4,.8).c(.4) v=sdir()*(.3..0.8)+up(.3) size=.2..0.4 acc=drag(1.4) col=<.6,.57,.5> a=0>.3:.4>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
const yawTo = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;
const flat = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const sn = (p) => (p?.state?.attr ? sneakMul(p.state) : 1);
const alive = (p, now) => !(p.state?.dead || (p.state?.hp ?? 1) <= 0 || (p.state?.downAt && now - p.state.downAt < 4500));
const anim = (o, m, clip, loop = true) => { if (m.clip === clip) return; m.clip = clip; o.anim.main = { clip, loop, clampWhenFinished: !loop, weight: 1, blend: 0.18 }; };
const say = (ctx, clip, position, volume = 0.9, maxDistance = 26) => heard(ctx, { clip: SND(clip), position, volume, maxDistance, refDistance: 3 });
const head = (o, y = 1.45) => ({ x: o.feetPosition.x, y: o.feetPosition.y + y, z: o.feetPosition.z });
function hurtPlayer(ctx, p, dmg, dir, punch = 0.6) {
  p.state.hp -= dmgAfterArmor(p.state.look, dmg); // worn clothes soak it, as with the hounds
  const at = head(p, 1);
  ctx.emit("damageNumber", { position: at, value: dmg, color: "#ff5040" });
  ctx.emit("cameraPunch", { direction: { x: dir.x, y: 0.25, z: dir.z }, intensity: punch }, { audience: { player: p.id } });
  ctx.emit("screenShake", { intensity: 0.35, duration: 0.25 }, { audience: { player: p.id } });
  return at;
}
// walk: straight at a point, gravity kept, turned to face it. Returns the distance left.
function walk(o, to, speed, dt, face = true) {
  const p = o.feetPosition, dx = to.x - p.x, dz = to.z - p.z, d = Math.hypot(dx, dz), vy = (o.velocity?.y ?? 0) - 20 * dt;
  if (d < 0.25) { o.velocity = { x: 0, y: vy, z: 0 }; return d; }
  o.velocity = { x: (dx / d) * speed, y: vy, z: (dz / d) * speed };
  if (face) o.rotation = { yaw: yawTo(dx, dz) };
  return d;
}
const stand = (o, dt) => { o.velocity = { x: 0, y: (o.velocity?.y ?? 0) - 20 * dt, z: 0 }; };
// a point kept inside a room's rectangle, a margin off its walls
const inside = (r, p, pad = 0.55) => ({ x: Math.min(r.x1 - pad, Math.max(r.x0 + pad, p.x)), z: Math.min(r.z1 - pad, Math.max(r.z0 + pad, p.z)) });
const inRect = (r, p, pad = 0) => p.x > r.x0 - pad && p.x < r.x1 + pad && p.z > r.z0 - pad && p.z < r.z1 + pad;
const inFlat = (a, p) => aptAt(p.x, p.z)?.id === a.id;

// ---------- thrown crockery: real arcs the manager flies, a ray ahead of each step ----------
function launch(ctx, mem, o, target, now) {
  const from = head(o, 1.5), to = { x: target.feetPosition.x, y: target.feetPosition.y + 1.0, z: target.feetPosition.z };
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz) || 0.01, h = to.y - from.y, v = TN.speed, g = TN.gravity;
  const disc = v ** 4 - g * (g * d * d + 2 * h * v * v), th = disc >= 0 ? Math.atan2(v * v - Math.sqrt(disc), g * d) : Math.PI / 4;
  const vel = { x: (dx / d) * v * Math.cos(th), y: v * Math.sin(th), z: (dz / d) * v * Math.cos(th) };
  const pos = { x: from.x + (dx / d) * 0.45, y: from.y, z: from.z + (dz / d) * 0.45 }, can = ctx.random() < 0.4;
  const id = ctx.spawn({ tags: ["l13e", "l13e-shot"], lifetime: 6, feetPosition: pos, pivot: "center", castShadow: true,
    ...(can ? { primitive: { kind: "cylinder", radiusTop: 0.038, radiusBottom: 0.038, height: 0.11, radialSegments: 20 }, material: { color: "oklch(0.72 0.02 80)", metalness: 0.9, roughness: 0.35 } }
      : { primitive: { kind: "sphere", radius: 0.13, widthSegments: 24, heightSegments: 12 }, scale: { x: 1, y: 0.12, z: 1 }, material: { color: "oklch(0.93 0.015 90)", roughness: 0.25 } }) });
  (mem.shots ??= []).push({ id, pos, vel, by: o.id, can, at: now, yaw: yawTo(dx, dz) });
  say(ctx, S.throw, from, 0.7, 18);
}
function shatter(ctx, sh, at) {
  ctx.emit("fx", { position: at, script: SHARDS, params: sh.can ? { r: 0.7, g: 0.7, b: 0.68 } : {} });
  say(ctx, sh.can ? S.tin : S.smash, at, 1, 30);
  ctx.emit("noise", { position: at, radius: 14, kind: "smash" }, { audience: { nearby: at, radius: 14 } });
  ctx.destroy(sh.id);
}
function flyShots(ctx, mem, players, now, dt) {
  if (!mem.shots?.length) return;
  mem.shots = mem.shots.filter((sh) => {
    if (!(sh.id in ctx.place.objects)) return false;
    if (now - sh.at > 5000) { ctx.destroy(sh.id); return false; }
    sh.vel.y -= TN.gravity * dt;
    const step = { x: sh.vel.x * dt, y: sh.vel.y * dt, z: sh.vel.z * dt }, len = Math.hypot(step.x, step.y, step.z) || 0.001;
    for (const k of [0.5, 1]) { // a body in the way: checked at the half step and the end, so 14 m/s never skips a player
      const q = { x: sh.pos.x + step.x * k, y: sh.pos.y + step.y * k, z: sh.pos.z + step.z * k };
      for (const p of players) {
        const f = p.feetPosition;
        if (Math.hypot(q.x - f.x, q.z - f.z) < 0.5 && q.y > f.y - 0.1 && q.y < f.y + 1.95) {
          const hv = Math.hypot(sh.vel.x, sh.vel.z) || 1;
          hurtPlayer(ctx, p, TN.dmg, { x: sh.vel.x / hv, z: sh.vel.z / hv }, 0.7);
          ctx.emit("playSound", { clip: SND(S.smash), position: q, volume: 1 }, { audience: { player: p.id } });
          shatter(ctx, sh, q); return false;
        }
      }
    }
    const hit = raycast(ctx, sh.pos, { x: step.x / len, y: step.y / len, z: step.z / len }, { distance: len + 0.08, physicsOnly: true, bodies: "all", excludeTags: ["player", "l13e-shot"], ignoreEntities: [sh.by, sh.id] });
    if (hit) { shatter(ctx, sh, hit.position); return false; }
    sh.pos = { x: sh.pos.x + step.x, y: sh.pos.y + step.y, z: sh.pos.z + step.z };
    if (sh.pos.y < 0.03) { shatter(ctx, sh, { ...sh.pos, y: 0.04 }); return false; }
    const o = ctx.getObject(sh.id), t = (now - sh.at) / 1000;
    o.feetPosition = sh.pos; o.rotation = sh.can ? { yaw: sh.yaw, pitch: t * 1100, roll: 0 } : { yaw: sh.yaw + t * 900, pitch: 18, roll: 0 };
    return true;
  });
}

// ---------- the Tenant ----------
function tenant(ctx, mem, o, m, a, players, now, dt) {
  const pos = o.feetPosition, st = o.state, home = (m.home ??= homeOf({ kind: "tenant", flat: a.id }));
  const room = a.main;
  if (!inRect(room, pos, -0.3)) { const c = inside(room, pos, 0.45); if (flat(c, pos) > 0.08) o.feetPosition = { x: c.x, y: pos.y, z: c.z }; } // it can not cross its own doorway, whatever shoved it
  if (now < (st.stunUntil ?? 0)) { stand(o, dt); anim(o, m, CLIP.hurt, false); m.windAt = 0; return; }
  let prey = null, best = 1e9;
  for (const p of players) {
    const d = flat(pos, p.feetPosition), own = inFlat(a, p.feetPosition);
    if (a.id === "a8" && (p.state?.l13calm ?? 0) > now) continue; // Still Home: Bea's set is on her weather, and she watches it (scripts/lib/level13-quest.js tuneTv)
    if (!own && !(inHall(p.feetPosition.x, p.feetPosition.z) && d < TN.hallRange * crouchMul(p) * sn(p))) continue;
    if (d >= best || !clearSight(ctx, head(o), head(p, p.state?.crouch ? 0.65 : 1), [o.id, p.id])) continue;
    best = d; prey = p;
  }
  if ((st.sneakTarget ?? null) !== (prey?.id ?? null)) st.sneakTarget = prey?.id ?? null;
  if (prey) m.seenAt = now;
  const sh = shotAt(st, now); if (sh && !prey && (m.shotSeen ?? 0) < sh.at) { m.shotSeen = sh.at; m.seenAt = now; }
  if (m.restock) { // out of crockery: back to the counter, four seconds with its back turned
    if (!m.restockUntil) { anim(o, m, CLIP.walk); if (walk(o, home, TN.walk * 1.3, dt) < 0.3) { m.restockUntil = now + TN.restockMs; say(ctx, S.clink, pos, 0.8, 18); } return; }
    stand(o, dt); anim(o, m, CLIP.pick); o.rotation = { yaw: yawTo(home.x - a.main.cx, 0) };
    if (now >= m.restockUntil) { m.restock = false; m.restockUntil = 0; m.ammo = TN.throws; m.next = now + 300; }
    return;
  }
  if (m.windAt) { // arm back, then the release
    stand(o, dt);
    if (prey) o.rotation = { yaw: yawTo(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) };
    if (now - m.windAt >= TN.windMs) { m.windAt = 0; if (prey) { launch(ctx, mem, o, prey, now); m.ammo = (m.ammo ?? TN.throws) - 1; if (m.ammo <= 0) m.restock = true; } m.holdUntil = now + 450; }
    return;
  }
  if (now < (m.holdUntil ?? 0)) { stand(o, dt); return; }
  if (prey) {
    o.rotation = { yaw: yawTo(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) };
    if (best < TN.shoveRange) { // too close to throw: both hands, a shove
      stand(o, dt);
      if (now >= (m.shoveAt ?? 0)) {
        m.shoveAt = now + TN.shoveMs; m.clip = null; anim(o, m, CLIP.hit, false);
        const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, d = Math.hypot(dx, dz) || 1;
        hurtPlayer(ctx, prey, TN.shoveDmg, { x: dx / d, z: dz / d }, 0.5);
        ctx.emit("impulse", { target: prey.id, impulse: { x: (dx / d) * TN.shoveKnock, y: 160, z: (dz / d) * TN.shoveKnock } });
        prey.state.stunUntil = now + TN.stunMs;
        say(ctx, S.shove, pos, 0.9, 16);
      }
      return;
    }
    stand(o, dt);
    if (now >= (m.next ?? 0)) { m.next = now + TN.everyMs; m.windAt = now; m.clip = null; anim(o, m, CLIP.throw, false); say(ctx, S.clink, pos, 0.8, 18); }
    else if (now - (m.next - TN.everyMs) > 1100) anim(o, m, CLIP.idle);
    return;
  }
  if (m.seenAt && now - m.seenAt < TN.forgetMs) { // lost you: it shuffles to its doorway and stops there
    const at = inside(room, { x: a.door.x, z: a.zf + a.s * TN.doorIn }, 0.45);
    if (walk(o, at, TN.walk, dt) < 0.3) { anim(o, m, CLIP.idle); o.rotation = { yaw: yawTo(0, -a.s) }; } else anim(o, m, CLIP.walk);
    return;
  }
  if (walk(o, home, TN.walk, dt) < 0.3) { anim(o, m, CLIP.idle); o.rotation = { yaw: yawTo(home.tv.x - pos.x, home.tv.z - pos.z) + Math.sin(now / 1700) * 6 }; } else anim(o, m, CLIP.walk);
}

// ---------- the Hall Lurker ----------
const lamp = (ctx, a, on) => { const l = ctx.getObject(`l13-lamp-${a.id}`); if (l) l.light = { kind: "point", color: "oklch(0.9 0.06 80)", intensity: on ? LK.lampOn : 0, distance: 8 }; };
const camYaw = (p) => { const r = p.camera?.rotation; if (!r) return 0; if (typeof r.yaw === "number") return r.yaw; // camera.rotation reads as a quaternion
  if (typeof r.w === "number") return (Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.x * r.x + r.y * r.y)) * 180) / Math.PI; return 0; };
const looking = (p, to) => { // is the player's camera within lookDeg of this point?
  const f = p.feetPosition, dx = to.x - f.x, dz = to.z - f.z, d = Math.hypot(dx, dz);
  const yaw = camYaw(p) / 57.2958;
  return d < 0.2 || (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d > Math.cos(LK.lookDeg / 57.2958);
};
function along(pts, u) { // a point u (0..1) of the way along a polyline
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = flat(pts[i - 1], pts[i]); seg.push(l); total += l; }
  let left = Math.min(1, Math.max(0, u)) * total;
  for (let i = 0; i < seg.length; i++) { if (left <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, left / seg[i]) : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, z: pts[i].z + (pts[i + 1].z - pts[i].z) * k }; } left -= seg[i]; }
  return pts[pts.length - 1];
}
const deep = (a, p) => a.s * (p.z - a.zm) > 0; // behind the inner wall (bedroom or bathroom)
const doorX = (a, p) => (p.x < a.x0 + 4.6 ? a.x0 + 2.3 : a.x0 + 6.3);
function route(a, from, to) { // next point toward `to` through the flat's two inner doorways
  const fd = deep(a, from), td = deep(a, to);
  if (fd === td && (!fd || doorX(a, from) === doorX(a, to))) return to;
  if (fd) { const x = doorX(a, from); return Math.abs(from.x - x) < 0.3 ? { x, z: a.zm - a.s * 0.9 } : { x, z: a.zm + a.s * 0.7 }; }
  const x = doorX(a, to); return Math.abs(from.x - x) < 0.3 ? { x, z: a.zm + a.s * 0.9 } : { x, z: a.zm - a.s * 0.7 };
}
function release(ctx, o, m, a, now, hurt) {
  const g = m.grab; m.grab = null; lamp(ctx, a, true);
  const p = g && ctx.place.players.find((q) => q.id === g.id);
  if (p) {
    if (p.state.freeze && p.state.freeze.by === "l13e") p.state.freeze = null; // the lock dies on its own clock anyway
    if (hurt && alive(p, now)) { hurtPlayer(ctx, p, LK.grabDmg, { x: 0, z: a.s }, 0.8); p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - LK.grabSanity); }
  }
  m.bathUntil = now + LK.bathMs; m.mode = "bath";
}
function lurker(ctx, mem, o, m, a, players, now, dt) {
  const pos = o.feetPosition, st = o.state, home = (m.home ??= homeOf({ kind: "lurker", flat: a.id }));
  const door = { x: a.door.x, z: a.zf }, peer = { x: a.door.x, z: a.zf + a.s * 1.6 }; // peer: a point inside the doorway: watching means facing into the flat
  const hitNow = m.hp != null && (st.hp ?? 0) < m.hp;
  m.mode ??= "wait";
  if (m.grab) { // lunge out, then haul the victim back along the same line; the victim's own lock expires by itself
    const g = m.grab, p = players.find((q) => q.id === g.id), t = now - g.at;
    if (!p || t >= LK.dragMs) { release(ctx, o, m, a, now, !!p); return; }
    const k = t < LK.lungeMs ? 0 : (t - LK.lungeMs) / (LK.dragMs - LK.lungeMs), e = k * k * (3 - 2 * k);
    const me = t < LK.lungeMs ? along(g.path, Math.max(0.04, 1 - t / LK.lungeMs) * 0.86) : along(g.path, Math.min(1, e + 0.14));
    const pp = along(g.path, e * 0.86);
    o.velocity = { x: 0, y: 0, z: 0 }; o.feetPosition = { x: me.x, y: pos.y, z: me.z }; o.rotation = { yaw: yawTo(pp.x - me.x, pp.z - me.z) };
    if (t >= LK.lungeMs) p.feetPosition = { x: pp.x, y: p.feetPosition.y, z: pp.z };
    anim(o, m, CLIP.crawl);
    return;
  }
  if (now < (st.stunUntil ?? 0)) { stand(o, dt); anim(o, m, CLIP.hurt, false); m.swingAt = 0; return; }
  if (m.tell) { // the lamp is out and the carpet is moving: half a second to turn and look, or to hit it
    stand(o, dt);
    const p = players.find((q) => q.id === m.tell.id);
    if (!p || hitNow || looking(p, peer)) { m.tell = null; m.coolUntil = now + LK.coolMs; lamp(ctx, a, true); say(ctx, S.hiss, { x: door.x, y: 1, z: door.z }, 1, 22); return; }
    if (now - m.tell.at >= LK.tellMs) {
      m.tell = null;
      if (flat(p.feetPosition, door) > LK.trigger + 1.2 || !inHall(p.feetPosition.x, p.feetPosition.z)) { m.coolUntil = now + 1500; lamp(ctx, a, true); return; }
      const f = p.feetPosition, bx = a.x0 + 2.3;
      m.grab = { id: p.id, at: now, path: [{ x: f.x, z: f.z }, { x: door.x, z: a.zf + a.s * 0.2 }, { x: bx, z: a.zm - a.s * 0.5 }, { x: bx, z: a.zm + a.s * 0.6 }, { x: a.bed.cx, z: a.bed.cz }, { x: a.bed.cx, z: a.bed.cz + a.s * 0.9 }] };
      p.state.freeze = { until: now + Math.min(3000, LK.lockMaxMs), yaw: camYaw(p), pitch: 0, by: "l13e" }; // the same self-expiring hold Phoebe uses: nothing here has to run for it to end
      ctx.emit("screenShake", { intensity: 0.7, duration: 0.5 }, { audience: { player: p.id } });
      say(ctx, S.drag, f, 1, 26);
    }
    return;
  }
  // who is in the flat with it
  let prey = null, best = 1e9;
  for (const p of players) { if (!inFlat(a, p.feetPosition)) continue; const d = flat(pos, p.feetPosition); if (d < best) { best = d; prey = p; } }
  if (m.mode === "bath") { // after a drag it goes to ground in the bathroom
    if (now >= m.bathUntil || hitNow) { m.mode = prey ? "fight" : "wait"; if (!hitNow) m.angryUntil = 0; } // a dragged victim gets the whole bathMs to get up and run
    else { const to = route(a, pos, { x: a.bath.cx, z: a.bath.cz }); anim(o, m, walk(o, to, LK.speed * 1.6, dt) < 0.3 ? CLIP.low : CLIP.crawl); return; }
  }
  if (hitNow || shotAt(st, now)) m.angryUntil = now + 8000;
  if (prey && (m.mode === "fight" || best < 3.2 || now < (m.angryUntil ?? 0) || clearSight(ctx, head(o, 0.9), head(prey, 1), [o.id, prey.id]))) m.mode = "fight";
  else if (!prey && m.mode === "fight") m.mode = "wait";
  if ((st.sneakTarget ?? null) !== (m.mode === "fight" ? prey?.id ?? null : null)) st.sneakTarget = m.mode === "fight" ? prey?.id ?? null : null;
  if (m.mode === "fight" && prey) {
    if (m.swingAt) { // a slow swipe: the arm comes round, then lands if you are still there
      stand(o, dt);
      if (now - m.swingAt >= LK.swipeWindMs) { m.swingAt = 0;
        if (best < LK.swipeRange + 0.4) { const dx = prey.feetPosition.x - pos.x, dz = prey.feetPosition.z - pos.z, d = Math.hypot(dx, dz) || 1; hurtPlayer(ctx, prey, LK.swipeDmg, { x: dx / d, z: dz / d }, 0.8); ctx.emit("impulse", { target: prey.id, impulse: { x: (dx / d) * 300, y: 120, z: (dz / d) * 300 } }); } }
      return;
    }
    if (best < LK.swipeRange) {
      stand(o, dt); o.rotation = { yaw: yawTo(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z) };
      if (now >= (m.nextSwipe ?? 0)) { m.nextSwipe = now + LK.swipeMs; m.swingAt = now; m.clip = null; anim(o, m, CLIP.hit, false); say(ctx, S.swipe, pos, 0.8, 16); } else if (now > (m.nextSwipe ?? 0) - 500) anim(o, m, CLIP.low);
      return;
    }
    const to = route(a, pos, prey.feetPosition);
    walk(o, a.s * (to.z - a.zf) < 0.5 ? { x: to.x, z: a.zf + a.s * 0.5 } : to, LK.speed, dt); anim(o, m, CLIP.crawl);
    return;
  }
  // waiting by the bedroom door, watching the hall through two doorways
  const d = walk(o, route(a, pos, home), LK.speed, dt);
  if (d < 0.3 && !deep(a, pos) === false) { anim(o, m, CLIP.low); o.rotation = { yaw: yawTo(0, -a.s) }; } else anim(o, m, CLIP.crawl);
  if (now < (m.coolUntil ?? 0) || flat(pos, home) > 1.2) return;
  for (const p of players) {
    const f = p.feetPosition;
    if (!inHall(f.x, f.z) || flat(f, door) > LK.trigger * sn(p)) continue;
    if (looking(p, peer)) { m.coolUntil = now + LK.coolMs; say(ctx, S.hiss, { x: door.x, y: 1, z: door.z }, 1, 22); return; } // watched: it stays in the dark
    m.tell = { id: p.id, at: now }; lamp(ctx, a, false);
    say(ctx, S.lamp, { x: a.main.cx, y: 2.3, z: a.main.cz }, 0.8, 18); say(ctx, S.drag, home, 0.7, 20);
    return;
  }
}

// ---------- death, loot, respawn ----------
function dead(ctx, o, m, slot, now, book) {
  const pos = o.feetPosition, T = slot.kind === "tenant";
  if (!m.deadAt) {
    m.deadAt = now; if (!book[slot.id]) ctx.self.state.deadAt = { ...book, [slot.id]: now };
    if (m.grab) release(ctx, o, m, apt(slot.flat), now, false);
    if (!T) lamp(ctx, apt(slot.flat), true);
    if (o.state.sneakTarget) o.state.sneakTarget = null;
    say(ctx, T ? S.tDie : S.lDie, pos, 0.9, 28);
    if (!o.tags?.includes("remains")) becomeCorpse(ctx, o, (T ? "Tenant" : "Hall Lurker") + "'s body", []);
    const mine = T ? [rollMeat(ctx), ...(ctx.random() < 0.6 ? ["ration"] : []), ...(ctx.random() < 0.7 ? [ctx.random() < 0.6 ? "cash:5" : "cash:25"] : [])]
      : ["weapon:" + rollWeapon(ctx, "l5", 8), "cash:100", ...(ctx.random() < 0.5 ? ["bandage"] : []), ...(ctx.random() < 0.35 ? ["royal_ration"] : [])];
    o.state.items = [...String(o.state.items ?? "").split(",").filter(Boolean), ...mine].join(",");
    return;
  }
  // an emptied body fades once the inspect window has passed; a full one waits for whoever killed it
  if (!String(o.state.items ?? "") && now - m.deadAt > F.corpseMinMs && now > (o.state.inspectUntil ?? 0)) { ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.3, z: pos.z }, script: POOF }); ctx.destroy(o.id); }
}
export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // empty level: nothing steps
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), book = ctx.self.state.deadAt ?? {};
  const players = ctx.place.players.filter((p) => alive(p, now));
  flyShots(ctx, mem, players, now, dt);
  for (const slot of SLOTS) {
    const here = slot.id in ctx.place.objects, o = here ? ctx.getObject(slot.id) : null, a = apt(slot.flat);
    const m = (mem[slot.id] ??= {});
    const isDead = o && (o.state?.dead || (o.state?.hp ?? 1) <= 0);
    if (!o || isDead) { // back in its flat five minutes after it died, never while someone is near enough to watch
      if (now >= (m.respChk ?? 0)) {
        m.respChk = now + 1000;
        const at = book[slot.id] ?? m.deadAt, h = homeOf(slot);
        if ((!o && !at) || (at && now - at > F.respawnMs)) {
          if (!ctx.place.players.some((p) => flat(p.feetPosition, h) < F.respawnClear)) {
            if (o) ctx.destroy(slot.id);
            else { ctx.spawn(slot.id, foeSpec(slot)); mem[slot.id] = {}; if (book[slot.id]) { const b = { ...book }; delete b[slot.id]; ctx.self.state.deadAt = b; } }
            continue;
          }
        }
      }
      if (o) dead(ctx, o, m, slot, now, book);
      else if (m.grab) m.grab = null;
      continue;
    }
    if (knocked(ctx, o, now, dt)) { if (o.state.sneakTarget) o.state.sneakTarget = null; if (m.grab) release(ctx, o, m, a, now, false); m.windAt = 0; m.tell && lamp(ctx, a, true); m.tell = null; m.hp = o.state.hp; continue; }
    if (m.hp != null && (o.state.hp ?? 0) < m.hp && now >= (m.hurtSnd ?? 0)) { m.hurtSnd = now + 500; say(ctx, slot.kind === "tenant" ? S.tHurt : S.lHurt, o.feetPosition, 0.9, 24); }
    if (slot.kind === "tenant") tenant(ctx, mem, o, m, a, players, now, dt); else lurker(ctx, mem, o, m, a, players, now, dt);
    m.hp = o.state.hp;
  }
}
