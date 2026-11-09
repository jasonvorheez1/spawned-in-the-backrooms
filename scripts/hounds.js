import { clearSight } from './lib/sight.js';
// Level 1's hounds: one manager steps the pack. They roam the halls, hunt when they see or hear you,
// hunt harder in a Flickering, and never cross into the corridors (safe ground).
import { knocked } from "./lib/knock.js";
import { crouchMul } from "./lib/sneak.js";
import { heard } from "./lib/hear.js";
import L from "./lib/data/level1.yml";
import { zoneAt, safeZone, cellCenter, N } from "./lib/level1.js";
import { zoneAt as zoneAt2 } from "./lib/level2.js";
import { npcMul, derived, dmgAfterArmor } from "./lib/stats.js";
import { zoneAt as zoneAt3, cellAt as cellAt3, cellCenter as cellCenter3, openings as openings3 } from "./lib/level3.js";
import { zoneAt as zoneAt5 } from "./lib/level5.js";
import { stepToward as stepToward1 } from "./lib/maze1path.js";
import { stepToward as stepToward2 } from "./lib/maze2path.js";
import { stepToward as stepToward21 } from "./lib/maze21path.js";
import { stepToward as stepToward3, cellNear } from "./lib/maze3path.js";
import { stepToward as stepTowardBoiler } from "./lib/boilerpath.js";
import { stepToward6 } from "./lib/level6path.js";
import C from "./lib/data/creatures3.yml";
const H3 = C.hounds3;
const sn = (p) => (p?.state?.attr ? derived(p.state).sneak : 1);
const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;

function hasClearSight(ctx,a,b,ignoreId,targetId) {
  return clearSight(ctx,{x:a.x,y:a.y+0.7,z:a.z},{x:b.x,y:b.y+1,z:b.z},[ignoreId,targetId]);
}
// The body: a rigged Blender mesh (art/hound/build.py) with its own clips; every row the sims spawn wears it.
const MODEL = "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb";
// The hunt, every level: howl once on sight (calls hounds within callRadius), pounce from pounceRange, maul, bleed.
const T = { callRadius: 30, callHold: 12, howlMs: 1300, pounceRange: 5, pounceMin: 1.8, pounceMs: 550, pounceSpeed: 10, pounceLift: 4.5, pounceCd: 4000,
  pounceDmg: 1.2, knock: 9, playerStunMs: 500, maulMs: 1100, bleedMs: 4000, bleedDmg: 2, staggerMs: 0, deathMs: 2600 };
const anim = (h, m, clip, loop = true, speed = 1) => { if (m.clip === clip) return; m.clip = clip; h.anim.main = { clip, loop, speed, clampWhenFinished: !loop, weight: 1 }; };
function hitPrey(ctx, h, prey, dmg, now, color = "#ff5040") {
  prey.state.hp -= dmgAfterArmor(prey.state.look, dmg); // worn clothes soak the hit (lib/clothes.yml DR)
  const at = { x: prey.feetPosition.x, y: prey.feetPosition.y + 1, z: prey.feetPosition.z };
  ctx.emit("damageNumber", { position: at, value: dmg, color });
  return at;
}
const POOF = `fx
pop dust burst=16 life=.6..1 on=box(.5,.5,.8).c(.5) v=sdir()*(.4..1)+up(.4) size=.2..0.4 acc=drag(1.4) col=<.4,.38,.36> a=0>.4:.5>0 sz=$size*(.6>1.5) r=sprite(smoke-puff,alpha)`;
const BLOOD = `fx
pop drip burst=6..9 life=.4..0.7 v=sdir()*(.6..1.4)+up(.3) size=.03..0.06 acc=grav()*.8 col=<.35,.02,.03> a=1>0 sz=$size floor=die r=sprite(soft-disc,alpha)`;
// line of sight: nothing static between the hound's head and the prey's chest
function sees(ctx,h,p) {
  return clearSight(ctx,{x:h.feetPosition.x,y:h.feetPosition.y+0.7,z:h.feetPosition.z},{x:p.feetPosition.x,y:p.feetPosition.y+(p.state?.crouch?0.65:1),z:p.feetPosition.z},[h.id,p.id]);
}
export function update(ctx, dt) {
  const place = ctx.self.place;
  const L6 = place === "level6", L3 = place === "level3", L2 = place === "level2", L5 = place === "level5", L21 = place === "level21", L1 = !L2 && !L3 && !L5 && !L6 && !L21;
  const safeAt = L6 || L21 ? () => false : L3 ? (x, z) => zoneAt3(x, z) === "gamma" : L2 ? (x, z) => zoneAt2(x, z) === "camp" : L5 ? (x, z) => zoneAt5(x, z)?.id !== "boiler" : (x, z) => safeZone(zoneAt(x, z));
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // empty level: the pack rests (perf)
  const now = ctx.now(), dark = ctx.place.state.flicker === "dark", mem = (ctx.self.session.m ??= {});
  const players = ctx.place.players.filter((p) => !safeAt(p.feetPosition.x, p.feetPosition.z) && !(p.state?.downAt && now - p.state.downAt < 4500));
  const byId = (id) => players.find((p) => p.id === id) ?? ctx.place.players.find((p) => p.id === id) ?? ctx.getObject(id) ?? null;
  if (!mem.houndsAt || now > mem.houndsAt || !mem.allHounds) {
    mem.houndsAt = now + 1200;
    mem.allHounds = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  }
  const allHounds = mem.allHounds;
  const lead = allHounds.reduce((a, h) => (!a || String(h.id) < String(a.id) ? h : a), null); // one hound steps the whole pack; the rest stand down
  if (lead && lead.id !== ctx.self.id && String(ctx.self.id) > String(lead.id)) { ctx.sleep(1); return; }
  for (const h of allHounds) {
    if (!(h.id in ctx.place.objects)) { mem.allHounds = null; delete mem[h.id]; continue; } // gone since the census: re-count next tick
    const m = (mem[h.id] ??= {}), pos = h.feetPosition, st = h.state ?? {}, mu = npcMul(st);
    if (knocked(ctx, h, now, dt)) { if (st.sneakTarget) st.sneakTarget = null; continue; } // kicked flat or shoved: it tumbles, no AI till it is up
    if (ctx.self.place === "level5" && !st.dead && zoneAt5(pos.x, pos.z)?.id !== "boiler") { h.feetPosition = { x: [37.5, 28.5, 40.5][Math.floor(ctx.random() * 3)], y: 0.05, z: [2.5, -0.5, -9.5][Math.floor(ctx.random() * 3)] }; m.roam = null; continue; } // level 5: the pack lives in the Boiler Room alone
    if (now >= (m.meshChk ?? 0)) { m.meshChk = now + 2000; const o = ctx.getObject(h.id); if (o && !String(o.model?.id ?? o.model ?? "").includes(MODEL.slice(5))) { o.primitive = null; o.model = { id: MODEL }; } } // the old coded body gives way to the mesh
    if (m.bleed && now >= m.bleed.next) { // the maul's wound: 2 a second for 4 s, dealt from here
      const v = now < m.bleed.until ? byId(m.bleed.id) : null;
      if (v && !v.state?.dead && (v.state?.hp ?? 0) > 0) { hitPrey(ctx, h, v, T.bleedDmg, now, "#a0101a"); ctx.emit("fx", { position: { x: v.feetPosition.x, y: v.feetPosition.y + 0.9, z: v.feetPosition.z }, script: BLOOD }); m.bleed.next = now + 1000; }
      else m.bleed = null;
    }
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!m.deadAt) { m.deadAt = now; anim(h, m, "death", false); h.velocity = { x: 0, y: -2, z: 0 }; heard(ctx, { maxDistance: 32, refDistance: 5, clip: SND("hound-death-yelp"), position: pos, volume: 0.8 }); }
      else if (!m.gone && now - m.deadAt > T.deathMs && now > (st.inspectUntil ?? 0)) { m.gone = true; ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, script: POOF }); ctx.destroy(h.id); }
      continue;
    }
    if (now < (st.stunUntil ?? 0)) { // the baton: it reels, no step and no bite until it clears
      anim(h, m, "stagger", true); h.velocity = { x: 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: 0 }; m.pounceAt = 0; m.maulUntil = 0; continue;
    }
    if (m.pounceAt && now - m.pounceAt < T.pounceMs) { // mid-leap: the body flies; contact lands the blow once
      const v = byId(m.pounceOn);
      if (v && !m.pounceHit && Math.hypot(v.feetPosition.x - pos.x, v.feetPosition.z - pos.z) < 1.5 && !safeAt(v.feetPosition.x, v.feetPosition.z) && sees(ctx, h, v)) {
        m.pounceHit = true; const dmg = Math.round(L.houndBite * mu.dmg * T.pounceDmg), at = hitPrey(ctx, h, v, dmg, now);
        const kx = v.feetPosition.x - pos.x, kz = v.feetPosition.z - pos.z, kd = Math.hypot(kx, kz) || 1;
        ctx.emit("impulse", { target: v.id, impulse: { x: kx / kd * T.knock * 70, y: 220, z: kz / kd * T.knock * 70 } });
        v.state.stunUntil = now + T.playerStunMs;
        heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("hound-bite-snap"), position: at, volume: 1 });
        ctx.emit("screenShake", { intensity: 0.6, duration: 0.35 }, { audience: { player: v.id } });
        ctx.emit("cameraPunch", { direction: { x: kx / kd, y: 0.3, z: kz / kd }, intensity: 0.8 }, { audience: { player: v.id } });
        ctx.emit("hitstop", { duration: 0.04 }, { audience: { player: v.id } });
        m.maulUntil = now + T.maulMs; m.maulOn = v.id; m.next = now + 400;
      }
      continue;
    }
    if (m.pounceAt) { m.pounceAt = 0; if (!m.pounceHit) m.clip = null; }
    if (now < (m.howlUntil ?? 0)) { h.velocity = { x: 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: 0 }; continue; } // rearing back, jaw open
    const sight = L.houndSight * mu.sight * (dark ? L.houndSightFlicker : 1);
    let prey = null, best = Infinity;
    const checkTarget = (p, isNpc) => {
      const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
      const loud = (p.state?.sprinting ? L.houndHear : 0) || (dark && p.state?.light ? L.houndHearLight : 0);
      if (!(d < Math.max(sight * crouchMul(p), loud) * sn(p) && d < best)) return;
      if (!sees(ctx,h,p)) {
        if (!isNpc && loud && d<loud*sn(p)) m.lastSeen={x:p.feetPosition.x,z:p.feetPosition.z,at:now};
        return;
      }
      best = d; prey = p;
    };
    for (const p of players) checkTarget(p, false);
    for (const n of ctx.query({ tags: ["npc"], radius: sight, center: pos })) {
      if (!n.state?.dead && !safeAt(n.feetPosition.x, n.feetPosition.z)) checkTarget(n, true);
    }
    if (st.horde) { const hp = players.find((p) => p.id === st.horde); if (hp && Math.hypot(hp.feetPosition.x-pos.x,hp.feetPosition.z-pos.z)<sight*sn(hp) && sees(ctx,h,hp)) { prey = hp; best = Math.hypot(hp.feetPosition.x - pos.x, hp.feetPosition.z - pos.z); } } // a blackout horde hunts its player
    if (L3) { // brigades: share the spotter's prey, and lie in wait in dead ends
    }
    if (prey && !m.hunting && !m.howled) { // it HOWLS once on sight: head back, jaw wide, and every hound in 30 m comes
      m.howled = true; m.howlUntil = now + T.howlMs; anim(h, m, "howl", false);
      h.rotation = { yaw: Math.atan2(-(prey.feetPosition.x - pos.x), -(prey.feetPosition.z - pos.z)) * 57.2958 };
      heard(ctx, { clip: SND("hound-bark-howl-call"), position: pos, volume: 1, maxDistance: 60 });
      for (const o of ctx.query({ tags: ["hound"], radius: T.callRadius, center: pos })) if (o.id !== h.id) { const om = (mem[o.id] ??= {}); om.lastSeen={x:prey.feetPosition.x,z:prey.feetPosition.z,at:now}; om.pack = prey.id; om.packUntil = now + T.callHold * 1000; om.howled = true; }
    }
    if (!prey && m.pack && now < m.packUntil) {
      prey = players.find((p) => p.id === m.pack) ?? (() => { const n = ctx.getObject(m.pack); return n && !n.state?.dead ? n : null; })() ?? null;
      if (prey && (Math.hypot(prey.feetPosition.x-pos.x,prey.feetPosition.z-pos.z)>sight*sn(prey) || !sees(ctx,h,prey))) prey=null;
      if (prey) best = Math.hypot(prey.feetPosition.x - pos.x, prey.feetPosition.z - pos.z);
    }
    if (prey) m.lastSeen = { x: prey.feetPosition.x, z: prey.feetPosition.z, at: now };
    if (L3) {
      if (!prey) { // ambush: crouched in a dead end until someone walks past or turns their back
        m.home ??= { x: pos.x, z: pos.z };
        if (!m.lurkAt) { const hc = cellAt3(m.home.x, m.home.z), c = cellNear(() => ctx.random(), hc.cx, hc.cz, H3.lurkSearch, (x, z) => openings3(x, z).length === 1); m.lurkAt = c ? cellCenter3(c[0], c[1]) : m.home; }
        if (Math.hypot(m.lurkAt.x - pos.x, m.lurkAt.z - pos.z) < 0.8) {
          if (!st.lurk) { h.state.lurk = true; h.scale = { x: 1, y: H3.lurkScale, z: 1 }; }
          for (const p of players) {
            const dx = pos.x - p.feetPosition.x, dz = pos.z - p.feetPosition.z, d = Math.hypot(dx, dz), yaw = (p.camera?.rotation?.yaw ?? 0) / 57.2958;
            const back = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) < 0; // the hound is behind where they look
            if ((d < H3.pounceNear * sn(p) || (back && d < H3.pounceBack * sn(p))) && sees(ctx,h,p)) { prey = p; best = d; m.pounceUntil = now + H3.pounceTime * 1000; break; }
          }
        }
      }
      if (prey && st.lurk) { h.state.lurk = false; h.scale = 1; m.lurkAt = null; }
      if (!prey && m.hunting) m.lurkAt = null; // a lost hunt picks a fresh hiding spot
    }
    if ((st.sneakTarget ?? null) !== (prey?.id ?? null)) st.sneakTarget = prey?.id ?? null;
    let goal;
    if (prey) goal = prey.feetPosition;
    else if (L3 && m.lurkAt) goal = m.lurkAt;
    else if (m.lastSeen && now - (m.lastSeen.at ?? now) < 5000 && Math.hypot(m.lastSeen.x - pos.x, m.lastSeen.z - pos.z) > 1) goal = m.lastSeen; // sniff where it last saw them
    else { m.lastSeen = null; if (!m.roam || now > m.until) { const a = ctx.random() * 6.283; m.roam = { x: pos.x + Math.cos(a) * 14, z: pos.z + Math.sin(a) * 14 }; m.until = now + 4000; } goal = m.roam; }
    const directSight = prey && hasClearSight(ctx, pos, prey.feetPosition, h.id, prey.id);
    let way = null;
    if (!directSight) {
      if (L6) way = stepToward6(pos.x, pos.z, goal.x, goal.z, 30);
      else if (L3) way = stepToward3(pos.x, pos.z, goal.x, goal.z, 30);
      else if (L2) way = stepToward2(pos.x, pos.z, goal.x, goal.z, 30);
      else if (L21) way = stepToward21(pos.x, pos.z, goal.x, goal.z, 30);
      else if (L5) way = stepTowardBoiler(pos.x, pos.z, goal.x, goal.z, 30);
      else way = stepToward1(pos.x, pos.z, goal.x, goal.z, 30);
    }
    if (!way && !prey && !directSight && !m.lastSeen) m.roam = null;
    const tgt = way && way.cells > 0 ? way.next : goal;
    const dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz) || 1;
    let ux = dx / d, uz = dz / d;
    let sp = prey ? mu.speed * L.houndSpeed * (dark ? 1.15 : 1) : 2;
    if (L3 && prey && now < (m.pounceUntil ?? 0)) sp *= H3.pounceBoost;
    if (L3 && st.lurk) sp = 0;
    if (now < (st.stunUntil ?? 0)) sp *= H3.stunSpeed; // stunned, every level
    // stuck detection: if moving but trapped against a collider, sidestep & repath
    m.sk ??= { x: pos.x, z: pos.z, at: now };
    if (now - m.sk.at > 800) {
      const moved = Math.hypot(pos.x - m.sk.x, pos.z - m.sk.z);
      if (sp > 1 && moved < 0.25) { m.side = { s: ctx.random() < 0.5 ? -1 : 1, until: now + 500 }; m.roam = null; }
      m.sk = { x: pos.x, z: pos.z, at: now };
    }
    if (m.side && now < m.side.until) { const s = m.side.s; ux = ux * 0.4 + -uz * s * 0.9; uz = uz * 0.4 + (dx / d) * s * 0.9; }
    // pack separation: push away from nearby hounds so pack flanks rather than collapsing
    if (now >= (m.sepAt ?? 0)) {
      m.sepAt = now + 250; let sx = 0, sz = 0;
      for (const o of allHounds) { if (o.id === h.id) continue; const ox = pos.x - o.feetPosition.x, oz = pos.z - o.feetPosition.z, od = Math.hypot(ox, oz) || 0.01; if (od < 1.2) { sx += ox / od * (1.2 - od); sz += oz / od * (1.2 - od); } }
      m.sep = { x: sx, z: sz };
    }
    if (m.sep) { ux += m.sep.x * 1.1; uz += m.sep.z * 1.1; }
    const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
    const nx = pos.x + ux * sp * dt, nz = pos.z + uz * sp * dt;
    if (safeAt(nx, nz)) sp = 0; // the corridors turn them back
    const near = way && way.cells > 0 ? 0.35 : 1.2;
    h.velocity = { x: d > near ? ux * sp : 0, y: (h.velocity?.y ?? 0) - 20 * dt, z: d > near ? uz * sp : 0 };
    if (sp > 0) h.rotation = { yaw: Math.atan2(-ux, -uz) * 57.2958 };
    if (prey && sp > 0 && best < T.pounceRange && best > T.pounceMin && now >= (m.nextPounce ?? 0)) { // the leap
      const px = prey.feetPosition.x - pos.x, pz = prey.feetPosition.z - pos.z, pd = Math.hypot(px, pz) || 1;
      m.pounceAt = now; m.pounceOn = prey.id; m.pounceHit = false; m.nextPounce = now + T.pounceCd; anim(h, m, "pounce", false);
      h.velocity = { x: px / pd * T.pounceSpeed, y: T.pounceLift, z: pz / pd * T.pounceSpeed }; h.rotation = { yaw: Math.atan2(-px, -pz) * 57.2958 };
      heard(ctx, { maxDistance: 24, refDistance: 4, clip: SND("hound-snarl-growl"), position: pos, volume: 1, pitch: 1.3 });
      continue;
    }
    const mauling = now < (m.maulUntil ?? 0);
    anim(h, m, mauling ? "maul" : sp <= 0.1 ? "idle" : sp > 3.5 ? "sprint" : "prowl", true);
    if (mauling) h.velocity = { x: 0, y: h.velocity.y, z: 0 };
    if (prey && !m.hunting) { m.hunting = true; heard(ctx, { clip: SND("hound-snarl-growl"), position: pos, volume: 0.9, maxDistance: 35 }); }
    if (!prey && m.hunting) { m.hunting = false; m.howled = false; }
    if (prey && best < 1.6 && now >= (m.next ?? 0) && !safeAt(prey.feetPosition.x, prey.feetPosition.z) && sees(ctx, h, prey)) { // no bite through a door or a wall
      m.next = now + L.houndCooldown * 1000; const at = hitPrey(ctx, h, prey, Math.round(L.houndBite * mu.dmg), now);
      m.maulUntil = now + T.maulMs; m.clip = null; m.bleed = { id: prey.id, until: now + T.bleedMs, next: now + 1000 }; // the thrash opens a wound
      ctx.emit("fx", { position: at, script: BLOOD });
      heard(ctx, { maxDistance: 20, refDistance: 3, clip: SND("hound-bite-snap"), position: at, volume: 0.9 });
      ctx.emit("screenShake", { intensity: 0.3, duration: 0.2 }, { audience: { player: prey.id } });
    }
  }
}
