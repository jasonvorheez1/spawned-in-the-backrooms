// Level 8's living cave (one manager, places/level8/sim.js): the flooded cavern's water rises and falls, light guides dance on Hyperspace Lane and lead you on, the spider nest
// and its wanderers hunt (they cannot swim), the pool of tar sends up its hands, and now and then the rock rumbles and something far off screams.
// Spiders are tag l8spider: scripts/player.js and scripts/lib/ballistics.js let you hit them; scripts/meg-agent.js has the camp fight them.
import L8 from "./lib/data/level8.yml";
import { heard } from "./lib/hear.js";
import { npcState, dmgAfterArmor } from "./lib/stats.js";
import { spawnRemains } from "./lib/loot.js";
export const updateSchedule = { every: { seconds: 0.1 } };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const SPIDER = "/cdn/value.74a6298847904cccb7a38e00bdc5f6ddfe8254138ddc0e1ae65c75ba6eef6859.glb";
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function P(s, side = 0, up = 0) {
  const R = L8.road; let i = 0; while (i < R.length - 2 && R[i + 1][0] <= s) i++;
  const [s0, x0, y0, z0, h0] = R[i], [s1, x1, y1, z1, h1] = R[i + 1], t = Math.max(0, Math.min(1, (s - s0) / (s1 - s0))), h = ((h0 + (h1 - h0) * t) * Math.PI) / 180;
  return { x: x0 + (x1 - x0) * t + Math.cos(h) * side, y: y0 + (y1 - y0) * t + up, z: z0 + (z1 - z0) * t + Math.sin(h) * side, yaw: -(h0 + (h1 - h0) * t) };
}
const sOf = (p) => { let b = 0, bd = 1e9; for (const r of L8.road) { const d = Math.hypot(r[1] - p.x, r[3] - p.z); if (d < bd) { bd = d; b = r[0]; } } return b; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const STAR = `fx
pop trail rate=14 life=.6..1.0 on=point() v=sdir()*.15 size=.03..0.07 col=hdr(.5,2.4,2.2) a=.8>0 sz=$size r=sprite(soft-disc,add)`;
const HAND = { color: "oklch(0.05 0.005 280)", roughness: 0.15 };

function spiderAt(ctx, n, at, nestId) {
  const sc = 0.85 + ctx.random() * 0.6;
  return ctx.spawn(`l8-spider-${nestId}-${n}-${Math.floor(ctx.now() / 1000) % 100000}`, {
    tags: ["l8spider", "l8-hostile"], feetPosition: { x: at.x, y: at.y + 0.1, z: at.z }, rotation: { yaw: ctx.random() * 360 }, scale: { x: sc, y: sc, z: sc },
    model: { id: SPIDER }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: 0.5, z: 0.6 } } }, physics: { body: "character", collider: "capsule" },
    state: { ...npcState(ctx, "rat", 38 * sc, { xp: 18 }), kind: "spider", name: "Cave spider", nest: nestId, home: { x: at.x, z: at.z } },
  });
}

export function update(ctx, dt) {
  const me = ctx.self, now = ctx.now(), m = (me.session.m ??= { spiders: {}, tar: {}, drown: {}, next: now + 40000 }), S = me.state;
  const players = ctx.place.players.filter((p) => (p.state?.hp ?? 1) > 0);
  // ---- the flood: the water in the third cavern climbs past the ankles, the knees and the chin, holds, and drains
  const flood = ctx.getObject("l8-flood");
  if (flood) {
    const F = P(176).y, ph = ((now / 1000) % 330) / 330, L = 0.12 + 3.5 * (smooth(0.3, 0.55, ph) * (1 - smooth(0.72, 0.95, ph))), surf = F + L;
    flood.feetPosition = { x: flood.feetPosition.x, y: surf - 4.5, z: flood.feetPosition.z };
    const fp = P(176);
    for (const p of players) {
      const f = p.feetPosition, inside = Math.abs(f.x - fp.x) < 15 && Math.abs(f.z - fp.z) < 15 && f.y < F + 4;
      const head = f.y + 1.7 < surf;
      m.drown[p.id] = inside && head ? (m.drown[p.id] ?? 0) + dt : 0;
      if (m.drown[p.id] > 12) { p.state.hp -= 7 * dt; if (!m.drowned?.[p.id] || now - m.drowned[p.id] > 4000) { (m.drowned ??= {})[p.id] = now; p.state.notice = { text: "The waters are over your head. You must swim. Your chest burns.", at: now }; } }
      if (inside && f.y + 0.4 < surf && !(m.wet?.[p.id] > now - 60000)) { (m.wet ??= {})[p.id] = now; p.state.notice = { text: surf - f.y > 1.6 ? "The waters are at your chin." : "The water has risen past your ankles. The ledge is ahead, several feet above it.", at: now }; }
    }
  }
  // ---- the light guides: little blue-green lights that dance over the lane's stream, and the first of them waits for you and leads you down the lane
  if (!ctx.getObject("l8-guide-0")) for (let k = 0; k < 7; k++) { const a = P(222 + k * 7, (k % 2 ? 1 : -1) * 1.5, 2.2); ctx.spawn(`l8-guide-${k}`, { feetPosition: { x: a.x, y: a.y, z: a.z }, primitive: { kind: "sphere", radius: 0.16 }, material: { color: "oklch(0.8 0.12 190)", emissive: "oklch(0.85 0.16 185)", emissiveIntensity: 3 }, fx: { script: STAR }, state: { k, home: { x: a.x, y: a.y, z: a.z } }, children: [{ feetPosition: { x: 0, y: 0, z: 0 }, light: { kind: "point", color: "oklch(0.78 0.14 190)", intensity: 1.6, distance: 11 } }] }); }
  for (let k = 0; k < 7; k++) {
    const g = ctx.getObject(`l8-guide-${k}`); if (!g) continue;
    const home = g.state.home, t = now / 1000, near = players.find((p) => flat(p.feetPosition, home) < 16);
    let tx = home.x + Math.cos(t * 0.7 + k) * 1.4, tz = home.z + Math.sin(t * 0.9 + k * 2) * 1.4, ty = home.y + Math.sin(t * 1.3 + k) * 0.4;
    if (k === 0 && near) { const ahead = P(Math.min(268, Math.max(222, sOf(near.feetPosition) + 9)), 0.8, 2.0); if (flat(near.feetPosition, g.feetPosition) < 7 || flat(ahead, g.feetPosition) > 3) { tx = ahead.x; tz = ahead.z; ty = ahead.y + Math.sin(t * 2) * 0.2; } }
    const gp = g.feetPosition, k2 = Math.min(1, dt * (k === 0 ? 1.6 : 1.1)); g.feetPosition = { x: gp.x + (tx - gp.x) * k2, y: gp.y + (ty - gp.y) * k2, z: gp.z + (tz - gp.z) * k2 };
  }
  // ---- the spiders: a nest of them where the road meets the chamber (the glyph on the wall), a few wanderers in the hall
  const nestC = P(312, 0, 0);
  const all = ctx.query({ tags: ["l8spider"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }), live = all.filter((o) => !o.state?.dead && (o.state?.hp ?? 1) > 0);
  if (now > (m.refill ?? 0) && live.length < 14) { m.refill = now + (live.length ? 20000 : 90000); const n = 14 - live.length; for (let i = 0; i < n && i < 3; i++) { const a = ctx.random() * 6.28, r = 3 + ctx.random() * 7; spiderAt(ctx, i, { x: nestC.x + Math.cos(a) * r, y: nestC.y, z: nestC.z + Math.sin(a) * r }, "nest"); } }
  for (const sp of all) {
    const st = sp.state ?? {}, mm = (m.spiders[sp.id] ??= { bite: 0 });
    if (st.dead || (st.hp ?? 1) <= 0) { if (!mm.dead) { mm.dead = now; if (!st.dead) sp.state.dead = true; { const sc = sp.scale?.x ?? 1, items = []; for (let i = 0, n = 1 + Math.floor(ctx.random() * (sc > 1.1 ? 3 : 2)); i < n; i++) items.push("chitin"); for (let i = 0, n = 1 + Math.floor(ctx.random() * 3); i < n; i++) items.push("spider_silk"); spawnRemains(ctx, sp.feetPosition, items, "Cave spider remains"); } sp.rotation = { yaw: sp.rotation?.yaw ?? 0, roll: 180 }; sp.velocity = { x: 0, y: 0, z: 0 }; heard(ctx, { clip: G("spider-skittering-squeal-and-crunch"), position: sp.feetPosition, volume: 0.7, maxDistance: 22 }); } else if (now - mm.dead > 6000) ctx.destroy(sp.id); continue; }
    const p = sp.feetPosition, home = st.home ?? nestC;
    let tgt = null, bd = st.nest === "nest" ? 15 : 10;
    for (const pl of players) { const d = flat(pl.feetPosition, p); if (d < bd && !(pl.feetPosition.y < P(sOf(pl.feetPosition)).y - 0.7 && sOf(pl.feetPosition) < 40)) { bd = d; tgt = pl; } } // they cannot swim
    let vx = 0, vz = 0;
    if (tgt) {
      const dx = tgt.feetPosition.x - p.x, dz = tgt.feetPosition.z - p.z, d = Math.hypot(dx, dz) || 1, sp0 = 4.6;
      if (d > 1.2) { vx = (dx / d) * sp0; vz = (dz / d) * sp0; }
      sp.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
      if (d < 1.5 && now - mm.bite > 1000) { mm.bite = now; const look = tgt.state?.look, dmg = Math.max(1, Math.round(dmgAfterArmor(look, 7 + ctx.random() * 3)));
        tgt.state.hp -= dmg; tgt.state.sanity = Math.max(0, (tgt.state.sanity ?? 80) - 2);
        ctx.emit("damageNumber", { position: { x: tgt.feetPosition.x, y: tgt.feetPosition.y + 1.4, z: tgt.feetPosition.z }, value: dmg, color: "#ff5040" });
        ctx.emit("flash", { target: tgt.id, color: "#ffffff", duration: 0.08 }); ctx.emit("cameraPunch", { direction: { x: dx / d, y: 0, z: dz / d }, intensity: 0.3 }, { audience: { player: tgt.id } }); }
      if (now - (mm.chat ?? 0) > 4000) { mm.chat = now; heard(ctx, { clip: G("many-small-claws-clicking-and-chittering-in-cave"), position: p, volume: 0.5, maxDistance: 20 }); }
    } else { const wa = now / 1500 + (sp.id.length % 7); if (flat(p, home) > 5) { const dx = home.x - p.x, dz = home.z - p.z, d = Math.hypot(dx, dz) || 1; vx = (dx / d) * 1.5; vz = (dz / d) * 1.5; sp.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI }; } else { vx = Math.cos(wa) * 0.5; vz = Math.sin(wa * 1.3) * 0.5; } }
    sp.velocity = { x: vx, y: (sp.velocity?.y ?? 0) - 24 * dt, z: vz };
  }
  // ---- the pool of tar: stand too near and the hands come up; they drag you in; what comes after is not Level 8
  const tar = ctx.getObject("l8-tar"), tc = tar?.state?.c;
  if (tc) for (const p of players) {
    const d = flat(p.feetPosition, tc), T = (m.tar[p.id] ??= { t: 0 });
    if (d < 4.6) {
      T.t += dt;
      if (T.t > 0.6 && !T.hands) { T.hands = [0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * 6.28 + ctx.random(); return ctx.spawn(`l8-hand-${p.id.slice(-6)}-${k}`, { feetPosition: { x: tc.x + Math.cos(a) * 2.4, y: tar.feetPosition.y, z: tc.z + Math.sin(a) * 2.4 }, primitive: { kind: "box", width: 0.14, height: 1.4, depth: 0.14 }, material: HAND, rotation: { roll: (k - 2) * 10 } }); }); p.state.notice = { text: "The tar ripples. A group of tar-covered hands reaches out from the pool.", at: now }; heard(ctx, { clip: G("thick-tar-bubbling-and-wet-gurgle"), position: { x: tc.x, y: tar.feetPosition.y, z: tc.z }, volume: 0.8, maxDistance: 24 }); }
      if (T.hands) { const dx = tc.x - p.feetPosition.x, dz = tc.z - p.feetPosition.z, dd = Math.hypot(dx, dz) || 1; ctx.emit("impulse", { target: p.id, impulse: { x: (dx / dd) * 55, y: 0, z: (dz / dd) * 55 } }); p.state.hp -= 9 * dt; if (d < 1.6) T.in = (T.in ?? 0) + dt; }
      if (T.in > 2.2) { T.in = 0; T.t = 0; const a = P(31, 0, 0.3); p.feetPosition = { x: a.x, y: a.y, z: a.z }; p.state.hp = Math.max(8, (p.state.hp ?? 100) * 0.4); p.state.sanity = Math.max(0, (p.state.sanity ?? 80) - 20); p.state.notice = { text: "You lose consciousness in the boiling dark. You wake on a shore of a lake you do not know. (The few who survive the hands wake on Level 41 or 91.)", at: now }; }
    } else { T.t = Math.max(0, T.t - dt); T.in = 0; if (T.hands && d > 8) { for (const h of T.hands) ctx.destroy(h); T.hands = null; } }
  }
  // ---- the rock: a distant rumble (a wrangler somewhere in the deep), far screams, chittering
  if (now > m.next && players.length) {
    m.next = now + 70000 + ctx.random() * 110000; const r = ctx.random();
    if (r < 0.5) { for (const p of players) { ctx.emit("screenShake", { intensity: 0.2, duration: 1.8 }, { audience: { player: p.id } }); heard(ctx, { clip: G("deep-rock-rumble-from-far-underground"), position: p.feetPosition, volume: 0.75, maxDistance: 60 }, { audience: { player: p.id } }); p.state.notice = { text: "A distant rumble travels through the rock under your feet.", at: now }; } }
    else if (r < 0.8) for (const p of players) heard(ctx, { clip: G("faint-distant-human-scream-echoing-in-cave"), position: { x: p.feetPosition.x + 40, y: p.feetPosition.y, z: p.feetPosition.z - 40 }, volume: 0.5, maxDistance: 120 }, { audience: { player: p.id } });
    else for (const p of players) heard(ctx, { clip: G("chittering-and-clicking-of-unseen-creatures-echo-cave"), position: p.feetPosition, volume: 0.45, maxDistance: 50 }, { audience: { player: p.id } });
  }
}
