// Level 21 "Numbered Doors": every entity, one manager (rows tagged "l21d-foe"; places/doors21/sim.js lays and re-lays them).
// Clickers and stalkers are BLIND: nothing here reads sight. A body is heard by how it moves (walk / sprint radius from the
// row's brain, nothing while crouch-walking or standing off), gunfire and thrown things by the shared "noise" event. A sound
// leaves an investigate point: they run to where it WAS, listen, and strike only what they hear or walk into within reach.
// Each keeps its own hall (fence()), never enters the square, stops at this shift's fallen bay, and walks home past its leash.
// Wardens (dark wing) are a file of three: front engages, the next steps in when the front is under 40%, one horn turns all.
// No clips: the meshes are single bodies, so lean, sway, rear-back and lunge are written as rotation here.
import { targetsOf } from "./lib/decoys.js";
import { dmgAfterArmor } from "./lib/stats.js";
import { heard } from "./lib/hear.js";
import { C, HW, SEG, SEGS, SHIFT_MS, HALLS, at, blocks, DW } from "./lib/l21d-layout.js";
import L from "./lib/data/l21d.yml";
import { TUNE as T } from "./lib/l21d-foes-tune.js";
const GOTH = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const S = {
  click: GOTH("wet-throat-clicking-echolocation-in-hallway"), alert: GOTH("eyeless-creature-alert-screech-shrill-rasp"),
  swipe: GOTH("creature-claw-swipe-lunge-snarl"), pounce: GOTH("creature-crouch-hiss-then-leap-rush"),
  horn: GOTH("low-horn-like-moan-call-down-dark-corridor"), blow: GOTH("heavy-fist-blow-thud-on-cloth-body"),
  hit: GOTH("claw-rake-across-cloth-thud"), die: GOTH("shadow-creature-dissolve-hiss"),
};
const SMOKE = `fx
pop smoke burst=24 on=sphere(.4) life=1.2..2.2 v=up(1)+sdir()*.5 size=.25..0.5 acc=buoy(.6)+drag(1) sz=$size*(.6>2) col=<.03,.03,.03> a=0>.6:.5>.6:.3>0 r=sprite(smoke-puff,alpha)`;
const SAFE = L.safeRadius ?? 14, DEG = 180 / Math.PI;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const arc = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export const ears = {
  noise(ctx, n) { const p = n?.position; if (!p) return; const q = (ctx.self.session.noise ??= []);
    q.push({ x: p.x, z: p.z, r: n.radius ?? 25, loud: /gun|shot|expl|blast|bang|fire/i.test(String(n.kind ?? "")), at: ctx.now() }); if (q.length > 10) q.shift(); },
};
function hallOf(p) { if (Math.abs(p.z - DW.z) < 300) return -1; let b = 0, bd = -1e9; HALLS.forEach((H, i) => { const d = p.x * H.dir[0] + p.z * H.dir[1]; if (d > bd) { bd = d; b = i; } }); return b; }
// the point nearest (x, z) this foe may stand on: its own hall, outside the square, its side of the fallen bay
function fence(m, x, z, blk) {
  if (m.hall < 0) { const lz = DW.z + DW.lanes[m.lane]; return { x: clamp(x, DW.x + 0.6, DW.x + DW.len - 0.6), z: clamp(z, lz - DW.hw + 0.4, lz + DW.hw - 0.4) }; }
  const H = HALLS[m.hall], d = x * H.dir[0] + z * H.dir[1], lat = x * H.right[0] + z * H.right[1];
  let lo = Math.max(SAFE, C) + 0.6, hi = C + SEGS * SEG - 0.6; const bs = C + blk[m.hall] * SEG, be = bs + SEG;
  if (m.homeD < bs) hi = Math.min(hi, bs - 0.6); else if (m.homeD > be) lo = Math.max(lo, be + 0.6);
  return at(m.hall, clamp(d, lo, hi), clamp(lat, -(HW - 0.4), HW - 0.4));
}
function init(s, pos, now) {
  const home = s.home ?? pos, hall = s.hall ?? hallOf(home), m = { hall, born: now, yaw: 0, yawT: 0, next: 0, clickAt: now + 1500, nSeen: now, mode: "wander" };
  if (hall < 0) { let b = 0; DW.lanes.forEach((lz, i) => { if (Math.abs(home.z - DW.z - lz) < Math.abs(home.z - DW.z - DW.lanes[b])) b = i; }); m.lane = s.lane ?? b; }
  else m.homeD = home.x * HALLS[hall].dir[0] + home.z * HALLS[hall].dir[1];
  return m;
}
// how far this body carries right now (0 = silent)
function carries(t, B, v, d) {
  if (!ISP.has(t.id)) return B.hearWalk;                               // a decoy is a noise-maker
  if (t.state?.crouch && v < T.crouchSlow) return T.crouchBump; // the stealth play
  if (v < 0.5) return T.stillBump;
  return v > T.sprintAt ? B.hearSprint : B.hearWalk;
}
function strike(ctx, f, B, v, pos, clip) {
  const q = v.feetPosition, dmg = dmgAfterArmor(v.state?.look, B.dmg), p = { x: q.x, y: q.y + 1.1, z: q.z };
  v.state.hp = Math.max(0, (v.state.hp ?? 100) - dmg);
  ctx.emit("damageNumber", { position: p, value: dmg, color: "#ff4040" });
  ctx.emit("playSound", { clip, position: p, volume: 0.9 });
  ctx.emit("squash", { target: f.id, axis: "z", intensity: 0.18, duration: 0.2 });
  ctx.emit("cameraPunch", { direction: { x: q.x - pos.x, y: 0, z: q.z - pos.z }, intensity: 0.35 }, { audience: { player: v.id } });
}
const ISP = new Set(), TV = new Map(); // this machine's read of who is a real player and how fast each body moves
export function update(ctx, dt) {
  const foes = ctx.query({ tags: ["l21d-foe"], radius: 1e5, center: { x: 0, y: 0, z: 0 } });
  if (!foes.length) return ctx.sleep(2);
  const now = ctx.now(), ses = ctx.self.session, mem = (ses.m ??= {}), sqs = (ses.sq ??= {}), pl = (ses.pl ??= {});
  const real = ctx.place.players, ids = new Set(real.map((p) => p.id));
  const targets = targetsOf(ctx, real).filter((p) => !(p.state?.hp <= 0) && !p.state?.dead);
  for (const t of targets) { // each body's speed, measured (blind things read motion, not a flag)
    const q = t.feetPosition, r = (pl[t.id] ??= { x: q.x, z: q.z, v: 0 }), raw = Math.min(12, Math.hypot(q.x - r.x, q.z - r.z) / Math.max(dt, 0.001));
    r.v += (raw - r.v) * 0.35; r.x = q.x; r.z = q.z; if (ids.has(t.id)) ISP.add(t.id); else ISP.delete(t.id); TV.set(t.id, r.v); // engine handles take no ad-hoc fields
  }
  const blk = blocks(Math.floor(now / SHIFT_MS)), noise = ses.noise ?? [];
  // the files: who stands where in each squad
  for (const f of foes) { const s = f.state; if (s.squad == null) continue; const q = (sqs[s.squad] ??= { order: [], dir: 1, ptAt: 0, hornAt: 0, swapAt: 0 }); (q.live ??= {})[f.id] = (s.hp ?? 1) > 0 && !s.dead ? (s.hp ?? 1) / (s.maxHp || 1) : -1; q.seen = now; }
  for (const k in sqs) { const q = sqs[k]; if (q.seen !== now) { delete sqs[k]; continue; }
    q.order = q.order.filter((id) => q.live[id] >= 0); for (const id in q.live) if (q.live[id] >= 0 && !q.order.includes(id)) q.order.push(id);
    const fr = q.order[0]; if (fr && q.live[fr] < T.swapFrac && now > q.swapAt && q.order.some((id) => q.live[id] >= T.swapFrac)) { q.order.push(q.order.shift()); while (q.live[q.order[0]] < T.swapFrac) q.order.push(q.order.shift()); q.swapAt = now + T.swapMs; }
    q.live = {};
  }
  for (const f of foes) {
    const s = f.state, B = s.brain; if (!B) continue;
    const pos = f.feetPosition, kind = s.kind, m = (mem[f.id] ??= init(s, pos, now));
    if ((s.hp ?? 1) <= 0 || s.dead) {
      if (!m.diedAt) { m.diedAt = now; s.dead = s.dead || true; ctx.place.state.l21dDead = { ...(ctx.place.state.l21dDead ?? {}), [f.id]: now }; heard(ctx, { clip: S.die, position: pos, volume: 0.8, maxDistance: 26 }); f.material = { dissolve: 0 }; }
      const k = Math.min(1, (now - m.diedAt) / 1500);
      f.rotation = { yaw: m.yaw, pitch: -78 * k * k, roll: 0 }; f.material = { dissolve: k };
      if (k >= 1) { ctx.emit("fx", { position: { x: pos.x, y: 0.5, z: pos.z }, script: SMOKE }); delete mem[f.id]; ctx.destroy(f.id); }
      continue;
    }
    if ((s.stunUntil ?? 0) > now) continue;
    const home = s.home ?? pos, sq = s.squad != null ? sqs[s.squad] : null, rank = sq ? sq.order.indexOf(f.id) : 0, front = rank <= 0;
    let nd = 1e9; for (const p of real) nd = Math.min(nd, flat(p.feetPosition, pos));
    if (nd > T.wake && !m.pt && !m.act && !s.awake) continue; // nobody near: hold
    // ---- hearing
    let loud = null, ld = 1e9;
    const hear = (p) => {
      const fresh = !m.pt; m.pt = { x: p.x, z: p.z }; m.ptAt = now; m.linger = 0; m.stuck = 0;
      if (sq) { if (fresh && now > sq.hornAt) { sq.hornAt = now + T.hornMs; heard(ctx, { clip: S.horn, position: pos, volume: 1, maxDistance: 70 }); } sq.pt = m.pt; sq.ptAt = now; }
      else if (fresh && now > (m.screechAt ?? 0)) { m.screechAt = now + 5000; heard(ctx, { clip: S.alert, position: pos, volume: 0.9, maxDistance: 45 }); if (!m.act) m.act = { type: "alert", until: now + 350 }; }
    };
    if (m.mode !== "home") {
      for (const t of targets) { const q = t.feetPosition, d = flat(q, pos); if (d > 95 || Math.abs(q.y - pos.y) > 5 || Math.hypot(q.x, q.z) < SAFE) continue;
        const R = t.id === s.hunt && now - m.born < T.nestKnowMs ? 60 : carries(t, B, TV.get(t.id) ?? 0, d); if (d < R && d < ld) { ld = d; loud = t; } }
      if (loud) hear(loud.feetPosition);
      else for (const n of noise) if (n.at > m.nSeen && flat(n, pos) < (n.loud ? B.hearShot : Math.min(n.r, B.hearShot))) hear(n);
    }
    m.nSeen = now;
    if (sq && sq.ptAt > (m.ptAt ?? 0) && sq.pt) { m.pt = sq.pt; m.ptAt = sq.ptAt; m.linger = 0; } // all three turn together
    if (flat(pos, home) > B.leash) { m.mode = "home"; m.pt = null; if (sq) sq.pt = null; }
    // ---- what it does this tick
    let goal = null, speed = 0, stopAt = 0.35, pitch = 0, y = 0, face = null;
    const a = m.act;
    if (a) {
      if (a.type === "wind") { pitch = 16 * Math.min(1, (now - a.t0) / 200); face = a.at;
        if (now >= a.until) { const v = targets.find((t) => t.id === a.vid); if (v && flat(v.feetPosition, pos) <= B.reach * 1.25) strike(ctx, f, B, v, pos, kind === "warden" ? S.blow : S.hit); m.act = { type: "recover", until: now + 300 }; m.next = now + B.cooldown * 1000; } }
      else if (a.type === "crouch") { pitch = -14; face = a.at; if (now >= a.until) { const to = fence(m, a.at.x, a.at.z, blk), d = flat(to, pos); m.act = { type: "leap", from: { x: pos.x, z: pos.z }, to, t0: now, until: now + Math.max(120, (d / T.pounceSpeed) * 1000) }; } }
      else if (a.type === "leap") { const k = clamp((now - a.t0) / (a.until - a.t0), 0, 1); goal = { x: a.from.x + (a.to.x - a.from.x) * k, z: a.from.z + (a.to.z - a.from.z) * k }; speed = 99; stopAt = 0; y = Math.sin(Math.PI * k) * 0.8; pitch = 18 - 40 * k;
        if (k >= 1) { const v = targets.find((t) => flat(t.feetPosition, pos) <= B.reach); if (v) strike(ctx, f, B, v, pos, S.hit); m.act = { type: "recover", until: now + 450 }; m.next = now + B.cooldown * 1000; } }
      else if (a.type === "recover") { pitch = -20 * Math.max(0, (a.until - now) / 300); if (now >= a.until) m.act = null; }
      else if (now >= a.until) m.act = null; // alert: a held beat, head up
      else pitch = 10;
    } else if (loud && front && now >= m.next && ld <= B.reach) {
      const w = T.wind[kind] ?? 0.45; m.act = { type: "wind", t0: now, until: now + w * 1000, vid: loud.id, at: { x: loud.feetPosition.x, z: loud.feetPosition.z } };
      heard(ctx, { clip: S.swipe, position: pos, volume: 0.8, maxDistance: 24 }); ctx.emit("squash", { target: f.id, axis: "y", intensity: 0.14, duration: w });
    } else if (loud && kind === "stalker" && now >= m.next && ld <= T.pounceAt) {
      m.act = { type: "crouch", until: now + T.pounceCrouch * 1000, at: { x: loud.feetPosition.x, z: loud.feetPosition.z } };
      heard(ctx, { clip: S.pounce, position: pos, volume: 0.9, maxDistance: 28 }); ctx.emit("squash", { target: f.id, axis: "y", intensity: 0.3, duration: T.pounceCrouch });
    } else if (sq && !front && sq.order[0] && mem[sq.order[0]]) { // keep the file behind the front
      const fr = ctx.getObject(sq.order[0])?.feetPosition; if (fr) { goal = { x: fr.x - sq.dir * T.file * rank, z: DW.z + DW.lanes[m.lane] + (m.hall < 0 ? 0 : 0) }; if (m.hall >= 0) goal.z = fr.z; speed = m.pt ? B.speed : B.wander * 1.4; stopAt = 0.3; }
      if (m.pt && now - m.ptAt > T.forgetMs) m.pt = null;
    } else if (m.mode === "home") { goal = home; speed = B.wander * 1.6; if (flat(pos, home) < 3) m.mode = "wander"; }
    else if (m.pt) {
      goal = m.pt; speed = B.speed; stopAt = loud ? B.reach * 0.7 : 0.9;
      if (flat(pos, m.pt) <= stopAt + 0.3 || m.stuck > 0.5) { m.linger ||= now; goal = null; face = m.pt; if (now - m.linger > T.lingerMs) { m.pt = null; if (sq && sq.pt && now - sq.ptAt > T.lingerMs) sq.pt = null; } }
      else if (now - m.ptAt > T.forgetMs) m.pt = null;
    } else { // wander: slow legs along the hall about home, with listening pauses
      if (!m.wUntil || now > m.wUntil || (m.w && flat(pos, m.w) < 0.6)) {
        m.wUntil = now + 3000 + ctx.random() * 5000;
        if (m.w && ctx.random() < 0.35) m.w = null;
        else { const o = (ctx.random() * 2 - 1) * T.roam, l = (ctx.random() * 2 - 1) * (HW - 0.6); m.w = m.hall < 0 ? fence(m, home.x + o, DW.z + DW.lanes[m.lane] + l, blk) : fence(m, home.x + HALLS[m.hall].dir[0] * o + HALLS[m.hall].right[0] * l, home.z + HALLS[m.hall].dir[1] * o + HALLS[m.hall].right[1] * l, blk); }
      }
      if (m.w) { goal = m.w; speed = B.wander; }
    }
    // ---- move, fenced
    let nx = pos.x, nz = pos.z, sp = 0;
    if (goal) { const gx = goal.x - pos.x, gz = goal.z - pos.z, gd = Math.hypot(gx, gz);
      if (gd > stopAt) { const k = Math.min(1, (speed * dt) / gd); nx += gx * k; nz += gz * k; sp = Math.min(speed, gd / Math.max(dt, 0.001)); m.yawT = Math.atan2(-gx, -gz) * DEG; if (sq && front && Math.abs(gx) > 0.5) sq.dir = Math.sign(gx); } }
    if (face && flat(face, pos) > 0.2) m.yawT = Math.atan2(-(face.x - pos.x), -(face.z - pos.z)) * DEG;
    const p2 = fence(m, nx, nz, blk), went = Math.hypot(p2.x - pos.x, p2.z - pos.z);
    m.stuck = sp > 0.5 && went < sp * dt * 0.25 ? (m.stuck ?? 0) + dt : 0;
    m.yaw += arc(m.yawT - m.yaw) * Math.min(1, dt * 9);
    const run = Math.min(1, sp / (B.speed || 6)), beat = now / (kind === "warden" ? 260 : kind === "stalker" ? 110 : 150) + (s.n ?? 0);
    const idle = sp < 0.2 ? Math.sin(now / 900 + (s.n ?? 0) * 1.7) * 2 : 0;
    f.feetPosition = { x: p2.x, y: y + Math.abs(Math.sin(beat)) * 0.05 * run, z: p2.z };
    f.rotation = { yaw: m.yaw, pitch: pitch - run * (kind === "warden" ? 5 : 11) + idle, roll: Math.sin(beat) * (kind === "warden" ? 2.2 : 3.5) * (0.3 + run) * (sp > 0.2 ? 1 : 0) + (a?.type === "alert" ? 7 : 0) };
    if (kind !== "warden" && now >= m.clickAt && nd < T.clickEar) { m.clickAt = now + (m.pt ? 1400 + ctx.random() * 1400 : 3500 + ctx.random() * 4500); heard(ctx, { clip: S.click, position: pos, volume: m.pt ? 0.85 : 0.6, maxDistance: 34 }); }
  }
  for (const id in mem) if (!ctx.place.objects[id] && now - (mem[id].born ?? 0) > 5000) delete mem[id];
}
