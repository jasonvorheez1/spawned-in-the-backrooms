// Level 7's creatures, one manager (Shelly: "work on creatures in level 7").
// Tidecrawlers: dog-sized barnacled crab-things on the island shores; they skitter at you, rear up and slam both claws.
//   Killed, they leave Crawler meat; gone for an hour of real time, then a new one claims the shore (Shelly's rule).
// The Deep: Thalassophobia's leviathan. Swim out past the islands and it notices, circles under you, then takes you.
//   On a boat you're safe, but now and then its shadow slides under the hull.
import { heard } from "./lib/hear.js";
import { derived, dmgAfterArmor } from "./lib/stats.js";
import { becomeCorpse, killerOf } from "./lib/l5-hostile.js";
import { RESPAWN_MS } from "./lib/npc-respawn.js";
import { ISLES } from "./terrain7.js";
import F from "./lib/data/l7-fauna.yml";
const C = F.crawler, D = F.deep;
const CRAB = "/cdn/value.d45b62412b61ac278ec9d7423b82bd1455089ab060fff05e3978e8e7da8af1c2.glb";
const DEEP = "/cdn/value.f00891cabdc5122448487aa19d15b9becf7f875e69d35f37a6b9e6e712f908a5.glb";
const S = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const CLICK = S("wet-crab-chitin-legs-clicking-skittering-on-rock");
const SLAM = S("heavy-crab-claw-snapping-shut-wet-crunch");
const HISS = S("crab-creature-wet-bubbling-hiss-warning");
const DIE = S("crab-creature-shell-cracking-death-gurgle");
const GROAN = S("enormous-deep-sea-creature-low-groan-underwater");
const BREACH = S("massive-sea-creature-bursting-from-water-jaws-crunch");
const SPLASH = `fx
pop spray burst=70 life=.8..1.6 on=disc(2.5) v=up(7..12)+sdir()*(1.5..3) size=.12..0.3 acc=grav()*1.1+drag(.5) col=<.7,.8,.85> a=.9>0 sz=$size*(1>.5) floor=die r=sprite(soft-disc,alpha)
pop foam burst=24 life=1.5..2.5 on=disc(3) v=sdir()*(.3..1) size=.8..1.6 acc=drag(1) col=<.85,.9,.92> a=0>.1:.6>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const CHIPS = `fx
pop chip burst=10..14 life=.5..0.9 v=sdir()*(1.5..3)+up(1.5) size=.03..0.06 acc=grav()*.9 col=<.45,.5,.42> a=1>0 sz=$size spin=-8..8 rot=$age*$spin floor=stick r=sprite(soft-disc,alpha)`;
const isle = (x, z) => ISLES.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + D.openFrom);
const anim = (o, m, clip, loop = true, speed = 1) => { if (m.clip === clip) return; m.clip = clip; o.anim.main = { clip, loop, speed, clampWhenFinished: !loop, weight: 1 }; };
const yawTo = (a, b) => (Math.atan2(-(b.x - a.x), -(b.z - a.z)) * 180) / Math.PI; // front is -Z
function hurt(ctx, p, dmg, color = "#ff5040") {
  p.state.hp -= dmgAfterArmor(p.state.look, dmg);
  ctx.emit("damageNumber", { position: { x: p.feetPosition.x, y: p.feetPosition.y + 1.1, z: p.feetPosition.z }, value: dmg, color });
}
function shoreY(ctx, x, z) { return Math.max(0.05, ctx.place.terrain.heightAt(x, z) ?? 0.05); }
function spawnCrawler(ctx, i) {
  const [x, z] = C.sites[i];
  return ctx.spawn(`l7-crawler-${i}`, {
    tags: ["moths", "moth", "l7beast", "hostile"], feetPosition: { x, y: shoreY(ctx, x, z), z }, rotation: ctx.random() * 360,
    model: { id: CRAB, materials: { shell: { texture: "cdn/texture-wet-barnacle-crusted-dark-green-crab-shell.png", color: "oklch(0.92 0.07 150)", roughness: 0.3, emissive: "oklch(0.3 0.05 160)", emissiveIntensity: 0.25 }, barnacle: { color: "oklch(0.72 0.02 90)", roughness: 0.9 }, flesh: { color: "oklch(0.6 0.06 30)" }, eye: { color: "#000000", roughness: 1, metalness: 0 } } },
    physics: { body: "character", collider: "capsule" }, scale: 1,
    state: { kind: "tidecrawler", name: "Tidecrawler", hp: C.hp, maxHp: C.hp, home: { x, z } },
  });
}
export function update(ctx, dt) {
  const now = ctx.now(), mem = (ctx.self.session.m ??= {}), st = ctx.self.state;
  const players = ctx.place.players.filter((p) => (p.state?.hp ?? 1) > 0 && !p.state?.dead);
  // ---- the crawlers: keep each shore's crawler, an hour after one dies a new one comes ----
  if (now >= (mem.keepAt ?? 0)) {
    mem.keepAt = now + 4000; const gone = { ...(st.gone ?? {}) }; let ch = false;
    C.sites.forEach((_, i) => {
      const id = `l7-crawler-${i}`;
      if (id in ctx.place.objects) return;
      if (gone[i] == null && st.laid) { gone[i] = now; ch = true; return; }
      if (!st.laid || now - gone[i] >= RESPAWN_MS) { spawnCrawler(ctx, i); delete gone[i]; ch = true; }
    });
    if (!st.laid) { st.laid = true; ch = true; }
    if (ch) st.gone = gone;
  }
  for (let i = 0; i < C.sites.length; i++) {
    const o = ctx.place.objects[`l7-crawler-${i}`]; if (!o) continue;
    const m = (mem[o.id] ??= {}), cs = o.state, pos = o.feetPosition, home = cs.home;
    const fall = (o.velocity?.y ?? 0) - 24 * dt;
    if (cs.dead || (cs.hp ?? 1) <= 0) {
      if (!m.deadAt) {
        m.deadAt = now; anim(o, m, "death", false); o.velocity = { x: 0, y: fall, z: 0 };
        heard(ctx, { clip: DIE, position: pos, volume: 0.8, refDistance: 4, maxDistance: 28 });
        ctx.emit("fx", { position: { x: pos.x, y: pos.y + 0.4, z: pos.z }, script: CHIPS });
        const k = killerOf(ctx, pos);
        o.tags = [...new Set([...(o.tags ?? []).filter((t) => t !== "hostile" && t !== "moths" && t !== "moth"), "container", "remains"])];
        cs.name = "Tidecrawler shell"; cs.items = ctx.random() < 0.5 ? "meat:crab,meat:crab" : "meat:crab"; cs.corpseAt = now;
        if (k) { k.state.l7crawlers = (k.state.l7crawlers ?? 0) + 1; }
      } else if (now - m.deadAt > 90000) ctx.destroy(o.id); // the shell sits on the sand a while, then the tide takes it
      continue;
    }
    if (m.hp != null && cs.hp < m.hp) { m.hitUntil = now + 350; anim(o, m, "hit", false); m.clip = "hit"; m.angryAt = now; }
    m.hp = cs.hp;
    // pick prey: nearest on dry ground in sight, sneak shrinks it; a player in the water is out of its reach
    let prey = null, best = Infinity;
    for (const p of players) {
      const pp = p.feetPosition; if (pp.y < -0.4 || p.controlling) continue;
      const d = Math.hypot(pp.x - pos.x, pp.z - pos.z), sight = C.sight * (1 - Math.min(0.5, (derived(p.state).sneak ?? 0) / 200)) * (p.state?.crouch ? 0.6 : 1);
      if ((d < sight || (m.prey === p.id && d < C.sight * 2) || (m.angryAt && now - m.angryAt < 8000 && d < 30)) && d < best && Math.hypot(pp.x - home.x, pp.z - home.z) < C.leash) { best = d; prey = p; }
    }
    if (prey && m.prey !== prey.id) { m.prey = prey.id; heard(ctx, { clip: HISS, position: pos, volume: 0.7, refDistance: 3, maxDistance: 24 }); }
    if (!prey) m.prey = null;
    let goal = null, speed = 0;
    if (now < (m.hitUntil ?? 0)) { o.velocity = { x: 0, y: fall, z: 0 }; continue; }
    if (prey) {
      const pp = prey.feetPosition;
      o.rotation = { yaw: yawTo(pos, pp) };
      if (best <= C.reach) {
        if (now >= (m.biteAt ?? 0)) { m.biteAt = now + C.biteMs; m.strikeAt = now + 420; m.clip = null; anim(o, m, "attack", false); }
        o.velocity = { x: 0, y: fall, z: 0 };
      } else if (!m.strikeAt) { goal = pp; speed = C.run; }
      if (m.strikeAt && now >= m.strikeAt) { // the slam lands at the bottom of the swing
        m.strikeAt = 0;
        if (Math.hypot(pp.x - pos.x, pp.z - pos.z) < C.reach + 0.4) {
          hurt(ctx, prey, C.bite);
          heard(ctx, { clip: SLAM, position: pos, volume: 0.9, refDistance: 4, maxDistance: 26 });
          ctx.emit("cameraPunch", { direction: { x: pp.x - pos.x, y: 0, z: pp.z - pos.z }, intensity: 0.45 }, { audience: { player: prey.id } });
          ctx.emit("squash", { target: prey.id, axis: "y", intensity: 0.15, duration: 0.15 });
        }
      }
    } else {
      if (!m.roam || now > m.roamUntil || Math.hypot(pos.x - home.x, pos.z - home.z) > C.leash) {
        const a = ctx.random() * Math.PI * 2, r = 2 + ctx.random() * 5;
        m.roam = Math.hypot(pos.x - home.x, pos.z - home.z) > C.leash * 0.6 ? { x: home.x, z: home.z } : { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r };
        m.roamUntil = now + 4000 + ctx.random() * 5000; m.rest = ctx.random() < 0.4;
      }
      if (!m.rest) { goal = m.roam; speed = C.walk; }
    }
    if (goal) {
      const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
      if (d > 0.4 && (ctx.place.terrain.heightAt(pos.x + dx / d, pos.z + dz / d) ?? -9) > 0.15) {
        o.velocity = { x: (dx / d) * speed, y: fall, z: (dz / d) * speed }; o.rotation = { yaw: yawTo(pos, goal) };
        anim(o, m, speed > 2 ? "scuttle" : "walk");
        if (speed > 2 && now >= (m.clickAt ?? 0)) { m.clickAt = now + 900; heard(ctx, { clip: CLICK, position: pos, volume: 0.45, refDistance: 3, maxDistance: 18 }); }
      } else { o.velocity = { x: 0, y: fall, z: 0 }; if (!m.strikeAt && now >= (m.biteAt ?? 0) - C.biteMs + 800) anim(o, m, "idle"); }
    } else if (!m.strikeAt && (!m.biteAt || now >= m.biteAt - C.biteMs + 800)) { o.velocity = { x: 0, y: fall, z: 0 }; anim(o, m, "idle"); }
  }
  // ---- the Deep ----
  let deep = ctx.place.objects["l7-deep"];
  if (!deep) deep = ctx.place.objects[ctx.spawn("l7-deep", { audience: "all", feetPosition: { x: 0, y: -60, z: -400 }, model: { id: DEEP, materials: { hide: { color: "oklch(0.18 0.02 170)", roughness: 0.2 }, eye: { color: "oklch(0.85 0.08 180)", emissive: "oklch(0.7 0.1 180)", emissiveIntensity: 2 } } }, scale: 1.4, interpolation: { teleportThreshold: 40 } })];
  if (!deep) return;
  const dm = (mem.deep ??= { clip: null, exp: {} });
  // exposure: seconds each swimmer has spent out past the islands
  let mark = null, worst = 0;
  for (const p of players) {
    const pp = p.feetPosition, out = pp.y < -0.3 && !p.controlling && !isle(pp.x, pp.z);
    dm.exp[p.id] = out ? (dm.exp[p.id] ?? 0) + dt : Math.max(0, (dm.exp[p.id] ?? 0) - dt * 3);
    if (dm.exp[p.id] > worst) { worst = dm.exp[p.id]; mark = p; }
  }
  if (dm.lunge) { // the breach plays out: rise, gape, drop back
    const t = (now - dm.lunge.at) / 1000, L = dm.lunge;
    if (t < 1.6) { deep.feetPosition = { x: L.x, y: -9 + Math.min(1, t / 0.55) * 9.5 - Math.max(0, t - 1.0) * 10, z: L.z }; return; }
    dm.lunge = null; dm.clip = null; deep.feetPosition = { x: L.x, y: -60, z: L.z }; return;
  }
  if (mark && worst > D.noticeS && now > (dm.coolUntil ?? 0)) {
    const pp = mark.feetPosition, a = (now / 1000) * 0.55, r = Math.max(4, 14 - (worst - D.noticeS) * 1.2), depth = -9 + Math.min(4, (worst - D.noticeS) * 0.5);
    const x = pp.x + Math.cos(a) * r, z = pp.z + Math.sin(a) * r;
    deep.feetPosition = { x, y: depth, z }; deep.rotation = { yaw: (-a * 180) / Math.PI - 180 };
    if (dm.clip !== "swim") { dm.clip = "swim"; deep.anim.main = { clip: "swim", loop: true, weight: 1 }; }
    if (now >= (dm.groanAt ?? 0)) { dm.groanAt = now + 7000; ctx.emit("playSound", { clip: GROAN, position: { x, y: 0, z }, volume: 1, refDistance: 12, maxDistance: 90 }); mark.state.sanity = Math.max(0, (mark.state.sanity ?? 100) - 4); ctx.emit("screenShake", { intensity: 0.12, duration: 1.2 }, { audience: { player: mark.id } }); }
    if (worst > D.strikeS) { // it takes the swimmer
      dm.lunge = { at: now, x: pp.x, z: pp.z + 1.5 }; dm.coolUntil = now + D.coolS * 1000; dm.exp[mark.id] = 0; dm.clip = "lunge";
      deep.rotation = { yaw: 0, pitch: 0 }; deep.feetPosition = { x: pp.x, y: -9, z: pp.z + 1.5 };
      deep.anim.main = { clip: "lunge", loop: false, clampWhenFinished: true, weight: 1 };
      ctx.after(0.55, "bite", { id: mark.id });
      ctx.emit("playSound", { clip: BREACH, position: { x: pp.x, y: 0, z: pp.z }, volume: 1, refDistance: 14, maxDistance: 120 });
    }
    return;
  }
  // a boat out on the water: now and then the shadow passes under the hull
  const rower = players.find((p) => p.controlling && !isle(p.feetPosition.x, p.feetPosition.z));
  if (dm.pass) {
    const t = (now - dm.pass.at) / 1000, P = dm.pass;
    if (t > 9) { dm.pass = null; deep.feetPosition = { x: P.x, y: -60, z: P.z }; }
    else { const k = t / 9; deep.feetPosition = { x: P.x + P.dx * (k - 0.5) * 60, y: -7, z: P.z + P.dz * (k - 0.5) * 60 }; }
    return;
  }
  if (rower && now >= (dm.passAt ?? now + 1)) {
    const a = ctx.random() * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    dm.pass = { at: now, x: rower.feetPosition.x, z: rower.feetPosition.z, dx, dz }; dm.passAt = now + D.boatPassS * 1000 * (0.7 + ctx.random() * 0.6);
    deep.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI }; deep.anim.main = { clip: "swim", loop: true, weight: 1 }; dm.clip = "swim";
    ctx.emit("playSound", { clip: GROAN, position: rower.feetPosition, volume: 0.8, refDistance: 10, maxDistance: 80 });
    ctx.emit("screenShake", { intensity: 0.2, duration: 1.4 }, { audience: { player: rower.id } });
    return;
  }
  if (dm.passAt == null) dm.passAt = now + D.boatPassS * 500;
  if (deep.feetPosition.y > -50) deep.feetPosition = { x: deep.feetPosition.x, y: -60, z: deep.feetPosition.z };
}
export function bite(ctx, { id }) {
  const p = ctx.place.players.find((q) => q.id === id); if (!p) return;
  hurt(ctx, p, D.bite, "#c01020");
  ctx.emit("fx", { position: { x: p.feetPosition.x, y: 0, z: p.feetPosition.z }, script: SPLASH });
  ctx.emit("screenShake", { intensity: 0.8, duration: 0.6 }, { audience: { player: p.id } });
  ctx.emit("screenFlash", { color: "#300808", duration: 0.5, intensity: 0.6 }, { audience: { player: p.id } });
  p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 15);
  p.state.notice = { text: "Something took you from below. Stay near the islands.", at: ctx.now() };
}
