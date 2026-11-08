// Level 8's living cave (one manager, places/level8/sim.js): the flooded cavern's water rises and falls, light guides dance on Hyperspace Lane and lead you on, the spider nest
// (and its Broodmother) hunt (they cannot swim), the pool of tar sends up articulated grasping hands, and now and then the rock rumbles and something far off screams.
// Spiders are tag l8spider: scripts/player.js and scripts/lib/ballistics.js let you hit them; scripts/meg-agent.js has the camp fight them.
import L8 from "./lib/data/level8.yml";
import { heard } from "./lib/hear.js";
import { npcState, dmgAfterArmor } from "./lib/stats.js";
import { spawnRemains } from "./lib/loot.js";
export const updateSchedule = { every: { seconds: 0.1 } };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const SPIDER = "/cdn/value.f2baeaec87cf017372e92e66ec42fae95179b52161e15051d3253036b89b9323.glb";
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
const HAND = { color: "oklch(0.06 0.008 280)", roughness: 0.14, metalness: 0.28 };

function spiderAt(ctx, n, at, nestId, boss = false) {
  const sc = boss ? 1.85 : 0.85 + ctx.random() * 0.6;
  const id = boss ? `l8-broodmother-${Math.floor(ctx.now() / 1000) % 100000}` : `l8-spider-${nestId}-${n}-${Math.floor(ctx.now() / 1000) % 100000}`;
  return ctx.spawn(id, {
    tags: ["l8spider", "l8-hostile"], feetPosition: { x: at.x, y: at.y + 0.1, z: at.z }, rotation: { yaw: ctx.random() * 360 }, scale: { x: sc, y: sc, z: sc },
    model: { id: SPIDER }, layout: { box: { min: { x: -0.6, y: 0, z: -0.6 }, max: { x: 0.6, y: 0.5, z: 0.6 } } }, physics: { body: "character", collider: "capsule" },
    state: { ...npcState(ctx, "rat", boss ? 320 : 46 * sc, { xp: boss ? 55 : 18 }), kind: "spider", boss, name: boss ? "Broodmother arachnid" : "Cave spider", nest: nestId, home: { x: at.x, z: at.z } },
    ...(boss ? { children: [{ feetPosition: { x: 0, y: 0.45, z: -0.35 }, light: { kind: "point", color: "oklch(0.62 0.24 25)", intensity: 1.6, distance: 7 } }] } : {}),
  });
}

function spawnTarHand(ctx, id, x, y, z, yaw) {
  return ctx.spawn(id, {
    feetPosition: { x, y, z }, rotation: { yaw },
    primitive: { kind: "cylinder", radiusTop: 0.085, radiusBottom: 0.11, height: 0.78 }, material: HAND,
    children: [
      { feetPosition: { x: 0, y: 0.72, z: 0.08 }, primitive: { kind: "cylinder", radiusTop: 0.075, radiusBottom: 0.085, height: 0.58 }, rotation: { pitch: 28 }, material: HAND }, // upper forearm
      { feetPosition: { x: 0, y: 1.22, z: 0.24 }, primitive: { kind: "box", width: 0.22, height: 0.24, depth: 0.09 }, rotation: { pitch: 18 }, material: HAND }, // palm
      { feetPosition: { x: -0.13, y: 1.28, z: 0.28 }, primitive: { kind: "cylinder", radiusTop: 0.018, radiusBottom: 0.028, height: 0.22 }, rotation: { pitch: 35, roll: 38 }, material: HAND }, // thumb
      ...[-0.075, -0.025, 0.025, 0.075].map((fx, fi) => ({
        feetPosition: { x: fx, y: 1.42, z: 0.29 }, primitive: { kind: "cylinder", radiusTop: 0.014, radiusBottom: 0.025, height: 0.26 - Math.abs(fi - 1.5) * 0.03 }, rotation: { pitch: 38 + (fi % 2) * 8, roll: (fi - 1.5) * -8 }, material: HAND,
      })),
    ],
  });
}

export function update(ctx, dt) {
  if (!ctx.place.players.length) { ctx.sleep(2); return; } // nobody in this level: rest
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
      if (m.drown[p.id] > 10) {
        p.state.hp = Math.max(1, (p.state.hp ?? 100) - 12 * dt);
        ctx.emit("cameraPunch", { direction: { x: 0, y: -0.15, z: 0 }, intensity: 0.2 }, { audience: { player: p.id } });
      }
      if (inside && f.y + 0.4 < surf && !(m.wet?.[p.id] > now - 45000)) {
        (m.wet ??= {})[p.id] = now;
        heard(ctx, { clip: G("water-pour-splash-short"), position: f, volume: 0.55, maxDistance: 16 }, { audience: { player: p.id } });
      }
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
  // ---- the spiders: a nest of them where the road meets the chamber (the glyph on the wall), plus the Broodmother guarding the deep nest
  const nestC = P(312, 0, 0), bossHome = P(328, 3.2, 0);
  const slicks = ctx.query({ tags: ["soupslick"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  const all = ctx.query({ tags: ["l8spider"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }), live = all.filter((o) => !o.state?.dead && (o.state?.hp ?? 1) > 0);
  if (now > (m.bossAt ?? 0) && !live.some((o) => o.state?.boss)) { m.bossAt = now + 180000; spiderAt(ctx, 99, bossHome, "nest", true); }
  if (now > (m.refill ?? 0) && live.length < 18) { m.refill = now + (live.length ? 14000 : 75000); const n = 18 - live.length; for (let i = 0; i < n && i < 3; i++) { const a = ctx.random() * 6.28, r = 3 + ctx.random() * 7; spiderAt(ctx, i, { x: nestC.x + Math.cos(a) * r, y: nestC.y, z: nestC.z + Math.sin(a) * r }, "nest"); } }
  for (const sp of all) {
    const st = sp.state ?? {}, mm = (m.spiders[sp.id] ??= { bite: 0 });
    if (st.dead || (st.hp ?? 1) <= 0) {
      if (!mm.dead) {
        mm.dead = now; if (!st.dead) sp.state.dead = true;
        const sc = sp.scale?.x ?? 1, items = st.boss ? ["chitin", "chitin", "chitin", "chitin", "spider_silk", "spider_silk", "spider_silk", "firstaid", "ammo"] : [];
        if (!st.boss) {
          for (let i = 0, n = 1 + Math.floor(ctx.random() * (sc > 1.1 ? 3 : 2)); i < n; i++) items.push("chitin");
          for (let i = 0, n = 1 + Math.floor(ctx.random() * 3); i < n; i++) items.push("spider_silk");
        }
        spawnRemains(ctx, sp.feetPosition, items, st.boss ? "Broodmother remains" : "Cave spider remains");
        { // it goes limp: a loose body thrown by the last blow, tumbling over onto its back (her pick: mass, spin)
          const ms = st.boss ? 70 : 9, a = ctx.random() * 6.283;
          sp.physics = { body: "dynamic", collider: "box", mass: ms, friction: 0.9, restitution: 0.1 };
          ctx.emit("impulse", { target: sp.id, impulse: { x: Math.cos(a) * ms * 1.6, y: ms * 4.2, z: Math.sin(a) * ms * 1.6 }, angularImpulse: { x: ms * (ctx.random() - 0.5) * 1.2, y: ms * 0.4, z: ms * 1.5 } });
        }
        heard(ctx, { clip: G("spider-skittering-squeal-and-crunch"), position: sp.feetPosition, volume: st.boss ? 0.95 : 0.7, maxDistance: 26 });
      } else if (now - mm.dead > 25000) ctx.destroy(sp.id);
      continue;
    }
    const p = sp.feetPosition, home = st.home ?? nestC;
    let tgt = null, bd = st.boss ? 26 : st.nest === "nest" ? 22 : 16;
    for (const pl of players) { const d = flat(pl.feetPosition, p); if (d < bd && !(pl.feetPosition.y < P(sOf(pl.feetPosition)).y - 0.7 && sOf(pl.feetPosition) < 40)) { bd = d; tgt = pl; } } // they cannot swim
    let vx = 0, vz = 0;
    if (tgt) {
      const dx = tgt.feetPosition.x - p.x, dz = tgt.feetPosition.z - p.z, d = Math.hypot(dx, dz) || 1, sp0 = st.boss ? 6.2 : 5.8;
      if (d > 1.2) { vx = (dx / d) * sp0; vz = (dz / d) * sp0; }
      const ph = sp.id.length * 1.7, rear = now - mm.bite < 260 ? -24 : 0; // scuttling: the body rocks with the legs, rears up on the bite
      sp.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI, pitch: rear + Math.sin(now / 55 + ph) * 5, roll: Math.cos(now / 45 + ph) * 6 };
      if (d > 2.2 && d < 5.5 && now - (mm.lunge ?? 0) > (st.boss ? 2200 : 2800)) { // the lunge: it springs the last metres at you
        mm.lunge = now; mm.lungeUntil = now + 380; const ls = st.boss ? 12 : 11;
        sp.velocity = { x: (dx / d) * ls, y: 4.5, z: (dz / d) * ls };
        heard(ctx, { clip: G("spider-skittering-squeal-and-crunch"), position: p, volume: 0.55, maxDistance: 20 });
      }
      const reach = st.boss ? 2.1 : 1.5;
      if (d < reach && now - mm.bite > (st.boss ? 700 : 750)) {
        mm.bite = now; const look = tgt.state?.look, rawDmg = (st.boss ? 22 : 11) + ctx.random() * (st.boss ? 8 : 4), dmg = Math.max(1, Math.round(dmgAfterArmor(look, rawDmg)));
        tgt.state.hp -= dmg; tgt.state.sanity = Math.max(0, (tgt.state.sanity ?? 80) - (st.boss ? 6 : 3));
        ctx.emit("damageNumber", { position: { x: tgt.feetPosition.x, y: tgt.feetPosition.y + 1.4, z: tgt.feetPosition.z }, value: dmg, color: "#ff5040" });
        ctx.emit("flash", { target: tgt.id, color: "#ffffff", duration: 0.08 }); ctx.emit("cameraPunch", { direction: { x: dx / d, y: 0, z: dz / d }, intensity: st.boss ? 0.45 : 0.3 }, { audience: { player: tgt.id } });
      }
      if (now - (mm.chat ?? 0) > 4000) { mm.chat = now; heard(ctx, { clip: G("many-small-claws-clicking-and-chittering-in-cave"), position: p, volume: st.boss ? 0.75 : 0.5, maxDistance: 22 }); }
    } else { const wa = now / 1500 + (sp.id.length % 7); if (flat(p, home) > 5) { const dx = home.x - p.x, dz = home.z - p.z, d = Math.hypot(dx, dz) || 1; vx = (dx / d) * 1.5; vz = (dz / d) * 1.5; sp.rotation = { yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI }; } else { vx = Math.cos(wa) * 0.5; vz = Math.sin(wa * 1.3) * 0.5; } }
    if (now < (st.stunUntil ?? 0) || slicks.some((k) => flat(k.feetPosition, p) < 1.3)) { // soup: legs skid, it rolls over and scrabbles
      if (!(now < (st.stunUntil ?? 0))) st.stunUntil = now + 1200;
      sp.rotation = { yaw: (sp.rotation?.yaw ?? 0) + 9, pitch: Math.sin(now / 40) * 25, roll: 70 + Math.sin(now / 33) * 30 };
      const v0 = sp.velocity ?? { x: 0, y: 0, z: 0 }; sp.velocity = { x: v0.x * 0.9, y: v0.y - 24 * dt, z: v0.z * 0.9 }; continue;
    }
    if (now < (mm.lungeUntil ?? 0)) { const v0 = sp.velocity ?? { x: 0, y: 0, z: 0 }; sp.velocity = { x: v0.x, y: v0.y - 24 * dt, z: v0.z }; continue; }
    if (!tgt) sp.rotation = { yaw: sp.rotation?.yaw ?? 0, pitch: Math.sin(now / 400 + sp.id.length) * 2, roll: 0 }; // at rest: breathing
    sp.velocity = { x: vx, y: (sp.velocity?.y ?? 0) - 24 * dt, z: vz };
  }
  // ---- the pool of tar: stand too near and articulated tar-covered arms & hands rise up to drag you in
  const tar = ctx.getObject("l8-tar"), tc = tar?.state?.c;
  if (tc) for (const p of players) {
    const d = flat(p.feetPosition, tc), T = (m.tar[p.id] ??= { t: 0 });
    if (d < 4.6) {
      T.t += dt;
      if (T.t > 0.6 && !T.hands) {
        T.hands = [0, 1, 2, 3, 4].map((k) => {
          const a = (k / 5) * 6.28 + ctx.random() * 0.5, hx = tc.x + Math.cos(a) * 2.2, hz = tc.z + Math.sin(a) * 2.2;
          const yaw = (Math.atan2(p.feetPosition.x - hx, p.feetPosition.z - hz) * 180) / Math.PI;
          return spawnTarHand(ctx, `l8-hand-${p.id.slice(-6)}-${k}`, hx, tar.feetPosition.y - 0.15, hz, yaw);
        });
        heard(ctx, { clip: G("thick-tar-bubbling-and-wet-gurgle"), position: { x: tc.x, y: tar.feetPosition.y, z: tc.z }, volume: 0.9, maxDistance: 24 });
      }
      if (T.hands) {
        const dx = tc.x - p.feetPosition.x, dz = tc.z - p.feetPosition.z, dd = Math.hypot(dx, dz) || 1;
        ctx.emit("impulse", { target: p.id, impulse: { x: (dx / dd) * 55, y: 0, z: (dz / dd) * 55 } });
        p.state.hp -= 9 * dt; if (d < 1.6) T.in = (T.in ?? 0) + dt;
        // Animate the reaching tar hands toward the player
        T.hands.forEach((hid, k) => {
          const ho = ctx.getObject(hid); if (!ho) return;
          const hp = ho.feetPosition, yaw = (Math.atan2(p.feetPosition.x - hp.x, p.feetPosition.z - hp.z) * 180) / Math.PI;
          ho.rotation = { yaw, pitch: Math.sin(now / 180 + k) * 14, roll: Math.cos(now / 220 + k) * 10 };
        });
      }
      if (T.in > 2.2) {
        T.in = 0; T.t = 0;
        ctx.emit("screenFlash", { color: "#000000", duration: 2.5, intensity: 1.0 }, { audience: { player: p.id } });
        heard(ctx, { clip: G("thick-tar-bubbling-and-wet-gurgle"), position: tc, volume: 1.0, maxDistance: 30 });
        const a = P(31, 0, 0.3);
        p.feetPosition = { x: a.x, y: a.y, z: a.z };
        p.state.hp = Math.max(8, (p.state.hp ?? 100) * 0.4);
        p.state.sanity = Math.max(0, (p.state.sanity ?? 80) - 20);
        heard(ctx, { clip: G("swimmer-surfacing-gasping-breath"), position: a, volume: 0.95, maxDistance: 16 }, { audience: { player: p.id } });
        heard(ctx, { clip: G("water-pour-splash-short"), position: a, volume: 0.6, maxDistance: 12 }, { audience: { player: p.id } });
        ctx.emit("cameraPunch", { direction: { x: 0, y: 0.7, z: 0 }, intensity: 0.5 }, { audience: { player: p.id } });
      }
    } else { T.t = Math.max(0, T.t - dt); T.in = 0; if (T.hands && d > 8) { for (const h of T.hands) ctx.destroy(h); T.hands = null; } }
  }
  // ---- the rock: a distant rumble (a wrangler somewhere in the deep), far screams, chittering
  if (now > m.next && players.length) {
    m.next = now + 70000 + ctx.random() * 110000; const r = ctx.random();
    if (r < 0.5) {
      for (const p of players) {
        ctx.emit("screenShake", { intensity: 0.28, duration: 2.2 }, { audience: { player: p.id } });
        heard(ctx, { clip: G("deep-rock-rumble-from-far-underground"), position: p.feetPosition, volume: 0.85, maxDistance: 60 }, { audience: { player: p.id } });
      }
    }
    else if (r < 0.8) for (const p of players) heard(ctx, { clip: G("faint-distant-human-scream-echoing-in-cave"), position: { x: p.feetPosition.x + 40, y: p.feetPosition.y, z: p.feetPosition.z - 40 }, volume: 0.5, maxDistance: 120 }, { audience: { player: p.id } });
    else for (const p of players) heard(ctx, { clip: G("chittering-and-clicking-of-unseen-creatures-echo-cave"), position: p.feetPosition, volume: 0.45, maxDistance: 50 }, { audience: { player: p.id } });
  }
}
