// Level 70's beasts: Froidlings (packs of 3: stalk at range, circle, rush a turned back, flee fire) and white Death Rats (swarms of 5, the bite chills).
// One manager steps every one; a pack with no player within 60 m sleeps. Rows are laid by scripts/lib/level70-life.js. Players hurt them the game's way (tag "moths", state.hp).
import { SND, flat, yawTo, downed, hit, killerOf } from "./lib/l5-hostile.js";
import { route } from "./lib/level70-nav.js";
export const updateSchedule = { every: 3 };
export const F = { froidling: { hp: 110, bite: 16, biteMs: 850, stalk: 4.2, run: 8.4, ring: 10, notice: 40, loot: "froidpelt", name: "Snow Hound", lie: 0.3, bob: 9, packMs: 900 },
  deathrat70: { hp: 22, bite: 4, chill: 6, biteMs: 900, walk: 1.6, run: 7.4, notice: 16, loot: "meat:rat", name: "White Death Rat", lie: 0.16, bob: 5 } };
const mem = new Map(), packs = {}; let fires = [], firesAt = -1e9;
const yawOfRot = (r) => typeof r === "number" ? r : r?.yaw != null ? r.yaw : r?.w != null ? (Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180) / Math.PI : 0;
const heard = (ctx, clip, position, volume = 0.7) => ctx.emit("playSound", { clip: SND(clip), position, volume, refDistance: 4, maxDistance: 34 }, { audience: { nearby: position, radius: 40 } });
const flare = (p, now) => (p.state?.flare70Until ?? 0) > now || p.state?.held === "flare70" || p.state?.equipped === "flaregun70"; // a flare gun in hand burns its pilot flare
function gaitOf(ctx, r, m, K) { // a rigged body scurries on its own legs; an unrigged one lopes by its whole body
  if (m.legs !== undefined) return; m.legs = null;
  try { const res = ctx.getObjectBoneNames(r.id), names = Array.isArray(res) ? res : res?.names ?? res?.bones ?? []; const legs = names.filter((n) => /leg|thigh|upperarm|shoulder|hip_|_hip/i.test(n) && !/twist|end/i.test(n)).slice(0, 8); if (legs.length >= 2) { const tracks = {}; legs.forEach((n, i) => { tracks[n] = { pitch: i % 2 ? [28, -28, 28] : [-28, 28, -28] }; }); m.legs = { clip: { duration: 0.36, tracks }, loop: "loop", weight: 1 }; } } catch (e) { m.legs = null; }
}
export function update(ctx, dt) {
  const now = ctx.now(), all = ctx.place.players;
  if (!all.length) { ctx.sleep(2); return; }
  const live = all.filter((p) => !downed(p, now));
  if (now - firesAt > 5000) { firesAt = now; fires = ctx.query({ anyTags: ["l70-fire", "fire", "campfire"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).map((f) => f.feetPosition); }
  let awake = 0; const g = ctx.place.gravity?.y ?? -24;
  for (const r of ctx.query({ tags: ["l70foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } })) {
    const st = r.state, K = F[st.kind]; if (!K) continue;
    const pos = r.feetPosition;
    if (st.corpseAt && !st.l70loot) { // the player's own kill handler laid the body first: put the beast's drop in it and count the kill once
      st.l70loot = 1; st.items = [st.items, K.loot].filter(Boolean).join(","); st.name = K.name + " remains";
      const k = killerOf(ctx, pos); if (k) { const c = { ...(k.state.l70kills ?? {}) }; c[st.kind] = (c[st.kind] ?? 0) + 1; k.state.l70kills = c; }
      heard(ctx, st.kind === "froidling" ? "small-creature-death-shriek-icy" : "rat-death-squeal", pos, 0.85);
    }
    if (st.corpseAt) { if (now - st.corpseAt > 180000) { ctx.destroy(r.id); mem.delete(r.id); } continue; }
    let m = mem.get(r.id); if (!m) { m = { ang: (st.n ?? 0) * 2.094, hp: st.hp, ph: (st.n ?? 0) * 1.7, nextBite: 0 }; mem.set(r.id, m); }
    const pk = (packs[st.pack] ??= { rushUntil: 0, seen: 0 });
    if (st.dead || (st.hp ?? 1) <= 0) {
      const k = killerOf(ctx, pos);
      r.velocity = { x: 0, y: 0, z: 0 }; r.physics = "none"; r.anim.move = null;
      r.rotation = { yaw: yawOfRot(r.rotation), roll: 90 }; r.feetPosition = { x: pos.x, y: pos.y + K.lie, z: pos.z };
      r.tags = ["l70foe", "container", "remains"]; st.name = K.name + " remains"; st.items = K.loot; st.corpseAt = now; st.dead = true; st.l70loot = 1;
      heard(ctx, st.kind === "froidling" ? "small-creature-death-shriek-icy" : "rat-death-squeal", pos, 0.85);
      if (k) { const c = { ...(k.state.l70kills ?? {}) }; c[st.kind] = (c[st.kind] ?? 0) + 1; k.state.l70kills = c; }
      continue;
    }
    let p = null, d = 1e9; for (const q of live) { const dd = flat(q.feetPosition, pos); if (dd < d) { d = dd; p = q; } }
    if (!p || d > 60) { m.seen = 0; m.backT = 0; pk.rushUntil = 0; pk.seen = 0; if (!m.asleep) { m.asleep = true; r.velocity = { x: 0, y: 0, z: 0 }; r.anim.move = null; m.moving = false; } continue; }
    m.asleep = false; awake++; gaitOf(ctx, r, m, K);
    const hurt = (st.hp ?? 0) < (m.hp ?? st.hp); m.hp = st.hp;
    if (hurt) { m.stagger = now + 280; pk.rushUntil = now + 8000; m.hot = now + 9000; ctx.emit("flash", { target: r.id, color: "#ffffff", duration: 0.12 }); heard(ctx, st.kind === "froidling" ? "small-creature-pained-yelp-hiss" : "rat-squeak-pained", pos, 0.7); }
    const pp = p.feetPosition, tx = (pp.x - pos.x) / (d || 1), tz = (pp.z - pos.z) / (d || 1);
    let vx = 0, vz = 0, face = null;
    if (st.kind === "froidling") {
      let fire = null, fd = 8; for (const f of fires) { const dd = flat(f, pos); if (dd < fd) { fd = dd; fire = f; } }
      if (!fire && flare(p, now) && d < 12) fire = pp;
      if (fire) { m.fleeUntil = now + 2500; m.fleeFrom = { x: fire.x, z: fire.z }; pk.rushUntil = 0; }
      if (now < (m.fleeUntil ?? 0)) { const dx = pos.x - m.fleeFrom.x, dz = pos.z - m.fleeFrom.z, l = Math.hypot(dx, dz) || 1; vx = (dx / l) * 6; vz = (dz / l) * 6; if (!m.fled) { m.fled = true; heard(ctx, "small-creature-frightened-chitter", pos, 0.6); } }
      else if (d > K.notice) { m.fled = false; m.seen = 0; [vx, vz] = stroll(ctx, r, m, st, pos, now, 1.4, 9); }
      else {
        m.fled = false;
        if (!m.seen) { m.seen = now; if (now - pk.seen > 6000) { pk.seen = now; heard(ctx, "small-creature-chittering-hiss-stalking", pos, 0.6); } }
        const py = p.camera?.rotation?.yaw ?? yawOfRot(p.rotation), fx = -Math.sin((py * Math.PI) / 180), fz = -Math.cos((py * Math.PI) / 180);
        m.backT = fx * -tx + fz * -tz < -0.15 ? (m.backT ?? 0) + dt : Math.max(0, (m.backT ?? 0) - dt * 2);
        if ((m.backT > 0.9 || now - m.seen > 16000 || d < 3) && now > pk.rushUntil) { pk.rushUntil = now + 7000; heard(ctx, "small-creature-attack-screech", pos, 0.8); }
        if (now < pk.rushUntil) {
          if (now < (m.recoil ?? 0)) { vx = -tx * 4; vz = -tz * 4; } else if (d > 1.05) { vx = tx * K.run; vz = tz * K.run; } // stop at the body, never inside it
          if (d < 1.5 && now > m.nextBite && now > (pk.biteAt ?? 0)) { hit(ctx, p, K.bite); m.nextBite = now + K.biteMs; pk.biteAt = now + K.packMs; m.recoil = now + 650; heard(ctx, "creature-bite-snap", pos, 0.7); } // one jaw at a time per pack
          if (now + 200 > pk.rushUntil) { m.seen = now; m.backT = 0; }
        } else {
          m.ang += 0.32 * dt; const gx = pp.x + Math.cos(m.ang) * K.ring, gz = pp.z + Math.sin(m.ang) * K.ring, dx = gx - pos.x, dz = gz - pos.z, l = Math.hypot(dx, dz);
          const sp = l < 0.6 ? 0 : d < 6 ? 4.6 : K.stalk; vx = (dx / (l || 1)) * sp; vz = (dz / (l || 1)) * sp; face = yawTo(tx, tz);
        }
      }
    } else {
      if (d < K.notice) m.hot = now + 8000;
      if (now < (m.hot ?? 0) && d < 40) {
        if (!m.squeal) { m.squeal = true; heard(ctx, "rat-swarm-squeaking-aggressive", pos, 0.6); }
        const w = Math.sin(now / 180 + m.ph) * 0.5, sx = tx - tz * w, sz = tz + tx * w, l = Math.hypot(sx, sz) || 1;
        if (now < (m.recoil ?? 0)) { vx = -tx * 5; vz = -tz * 5; } else if (d > 0.8) { vx = (sx / l) * K.run; vz = (sz / l) * K.run; }
        if (d < 1.25 && now > m.nextBite) { hit(ctx, p, K.bite, "#9fd8ff"); p.state.chill = (p.state.chill ?? 0) + K.chill; m.nextBite = now + K.biteMs; m.recoil = now + 450; heard(ctx, "rat-bite-squeak", pos, 0.6); }
      } else { m.squeal = false; [vx, vz] = stroll(ctx, r, m, st, pos, now, K.walk, 4); }
    }
    if (now < (m.stagger ?? 0)) { vx = -tx * 3; vz = -tz * 3; }
    const sp = Math.hypot(vx, vz), cur = r.velocity ?? { y: 0 };
    r.velocity = { x: vx, y: Math.max(-30, (r.grounded ? Math.min(0, cur.y ?? 0) : cur.y ?? 0) + g * dt), z: vz };
    if (sp > 0.3 || face != null) { const yaw = face ?? yawTo(vx / sp, vz / sp); r.rotation = m.legs ? { yaw } : { yaw, pitch: sp > 0.3 ? Math.sin(now / (sp > 4 ? 70 : 130) + m.ph) * K.bob : 0, roll: sp > 0.3 ? Math.sin(now / (sp > 4 ? 140 : 260) + m.ph) * K.bob * 0.6 : 0 }; }
    const moving = sp > 0.3; if (m.legs && moving !== m.moving) { m.moving = moving; r.anim.move = moving ? m.legs : null; }
  }
  const awake = ctx.query({ tags: ["l70foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).some((r) => !r.state.corpseAt && live.some((p) => Math.hypot(p.feetPosition.x - r.feetPosition.x, p.feetPosition.z - r.feetPosition.z) < 60));
  if (!awake) ctx.sleep(2); // no pack or swarm has a player within 60 m: the manager naps until a write or 2 s pass
}
// at ease: potter round the nest; far from it, walk home on the nav graph
function stroll(ctx, r, m, st, pos, now, speed, reach) {
  const h = st.home ?? pos, dh = flat(h, pos);
  if (dh > 30 && (!m.path || now > (m.pathAt ?? 0))) { m.path = route(ctx, pos, h).points.slice(1); m.pathAt = now + 20000; }
  if (m.path?.length) { const t = m.path[0], dd = flat(t, pos); if (dd < 1.2) { m.path.shift(); return [0, 0]; } return [((t.x - pos.x) / dd) * speed * 2, ((t.z - pos.z) / dd) * speed * 2]; }
  if (!m.to || now > m.toAt) { const a = ctx.random() * 6.283, rr = ctx.random() * reach; m.to = ctx.random() < 0.35 ? null : { x: h.x + Math.cos(a) * rr, z: h.z + Math.sin(a) * rr }; m.toAt = now + 2500 + ctx.random() * 4000; }
  if (!m.to) return [0, 0];
  const dd = flat(m.to, pos); if (dd < 0.6) return [0, 0];
  return [((m.to.x - pos.x) / dd) * speed, ((m.to.z - pos.z) / dd) * speed];
}
