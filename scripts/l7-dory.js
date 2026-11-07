// Level 7's pier dory: a boat you row yourself. E sits you in (it's a seat), the boat takes your keys:
// W/S row forward/back, A/D turn, E steps you out. It stays where you leave it; left empty and
// unwatched for 3 minutes it drifts home to the pier. Shallows and anything solid ahead stop it.
import { raycast } from "builtin/physics";
const MAX = 5.8, ACC = 4.5, TURN = 70, HOME = { x: 2.3, z: -31, yaw: 14 }, RIDE_Y = -0.4; // Savi's picks
const WAKE = `fx
pop foam rate=%r|0*30 on=disc(.5) life=.8..1.4 v=sdir()*.3+up(.1) size=.25..0.45 acc=drag(1.5) col=<.85,.9,.92> a=.5>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const OAR = "/cdn/moodboard-realistic-gritty/sfx-single-wooden-oar-blade-dipping-softly-into-calm-sea-water-and-pulling.mp3";
const CREAK = "/cdn/moodboard-realistic-gritty/sfx-old-wooden-rowboat-oarlock-creak-rope-and-wood.mp3";
const HULL = "/cdn/moodboard-realistic-gritty/sfx-calm-sea-water-lapping-against-small-wooden-boat-hull-loop.mp3";
const yawOf = (r) => (typeof r === "number" ? r : r?.yaw ?? 0);
const mem = (ctx) => (ctx.self.session.dory ??= { v: 0, turn: 0, mz: 0, mx: 0, stroke: 0 });

// ---- the oars: two real oars in oarlocks that row. Each is three nested pivots (yaw sweep > roll lift > pitch feather) so every rotation is about one axis;
// the stroke cycle: catch (blade drops in), drive (sweeps aft, blade vertical in the water), finish (squeezed out), recovery (blade up and flat, sweeps forward).
// Rotations follow three.js: yaw +Y, pitch +X, roll +Z. A right oar (+x outward) swings its blade forward with positive yaw; a left oar with negative.
const LOCK_Y = 0.62, LOCK_Z = 0.05, LOCK_X = 0.62, INBOARD = 0.5, OAR_LEN = 2.2;
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
function strokeAt(ph) { // sweep (deg, + forward), lift (deg, blade up), feather (deg, 0 vertical, 80 flat)
  const lerp = (a, b, k) => a + (b - a) * k;
  if (ph < 0.05) return { a: 36, lift: lerp(10, -2, smooth(ph / 0.05)), feather: lerp(75, 0, smooth(ph / 0.05)) };            // the catch: blade drops
  if (ph < 0.5) return { a: lerp(36, -24, smooth((ph - 0.05) / 0.45)), lift: -2, feather: 0 };                                // the drive
  if (ph < 0.58) return { a: -24, lift: lerp(-2, 12, smooth((ph - 0.5) / 0.08)), feather: lerp(0, 75, smooth((ph - 0.5) / 0.08)) }; // the finish
  return { a: lerp(-24, 36, smooth((ph - 0.58) / 0.42)), lift: 12, feather: 75 };                                              // the recovery
}
const REST = { a: -8, lift: 14, feather: 70 };
function oarsOf(ctx, b) {
  const s = b.state, ids = s.oars;
  if (ids && ctx.getObject(ids.R.a) && ctx.getObject(ids.L.a)) return ids;
  const wood = { color: "oklch(0.55 0.07 65)", roughness: 0.85 }, make = (sx, tag) => {
    const a = `l7-oar-${tag}-a`, bb = `l7-oar-${tag}-b`, c = `l7-oar-${tag}-c`;
    for (const id of [a, bb, c, `${c}-blade`]) { const o = ctx.getObject(id); if (o) ctx.destroy(id); }
    ctx.spawn(a, { parent: b.id, feetPosition: { x: sx * LOCK_X, y: LOCK_Y, z: LOCK_Z } });
    ctx.spawn(bb, { parent: a });
    ctx.spawn(c, { parent: bb, feetPosition: { x: sx * (OAR_LEN / 2 - INBOARD), y: 0, z: 0 }, castShadow: true, primitive: { kind: "box", width: OAR_LEN, height: 0.045, depth: 0.05 }, material: wood });
    ctx.spawn(`${c}-blade`, { parent: c, feetPosition: { x: sx * (OAR_LEN / 2 - 0.26), y: 0, z: 0 }, castShadow: true, primitive: { kind: "box", width: 0.52, height: 0.17, depth: 0.025 }, material: { color: "oklch(0.5 0.07 65)", roughness: 0.85 } });
    return { a, b: bb, c };
  };
  return (s.oars = { R: make(1, "R"), L: make(-1, "L") });
}
// where the rower's hands are: the inboard end of each oar, in the world, for the body's IK (scripts/lib/body3.js reads player.state.rowHands)
function handle(base, sx, aDeg, liftDeg) {
  const th = sx * liftDeg * Math.PI / 180, ps = sx * aDeg * Math.PI / 180, vx = -sx * INBOARD * Math.cos(th), vy = -sx * INBOARD * Math.sin(th)
  const x1 = vx * Math.cos(ps), z1 = -vx * Math.sin(ps), lx = sx * LOCK_X + x1, ly = LOCK_Y + vy, lz = LOCK_Z + z1
  const r = base.yaw * Math.PI / 180, c = Math.cos(r), s = Math.sin(r)
  return [base.x + lx * c + lz * s, base.y + ly, base.z - lx * s + lz * c];
}

export const ears = {
  press: (ctx, { by }) => { if (!ctx.self.controller) { ctx.self.controller = by; ctx.self.state.rower = by; ctx.self.state.leftAt = null; } },
};
export function onControlBegin(ctx, player) {
  const p = ctx.getObject(player.id ?? player);
  if (p?.state) p.state.notice = { text: "W/S row  ·  A/D turn  ·  E step out", at: ctx.now() };
  return true;
}
export function onControlEnd(ctx) { const m = mem(ctx); m.mz = 0; m.mx = 0; ctx.self.state.leftAt = ctx.now(); }
export function onInput(ctx, input) {
  const m = mem(ctx);
  m.mz = input.axes?.moveZ ?? 0; m.mx = input.axes?.moveX ?? 0;
  if (input.pressed?.interact) {
    const rider = ctx.self.state.rower;
    ctx.self.controller = null; ctx.self.state.rower = null;
    if (rider) ctx.emit("boatOff", { boat: ctx.self.id }, { to: rider });
  }
}
export function update(ctx, dt) {
  const b = ctx.self, m = mem(ctx), s = b.state, now = ctx.now();
  const p = b.feetPosition; let yaw = yawOf(b.rotation) - (m.roll != null ? 0 : 0);
  // a boat nobody rows for 3 min, with no one near, goes home to the pier
  if (!b.controller && s.leftAt && now - s.leftAt > 180000 && !ctx.place.players.some((q) => Math.hypot(q.feetPosition.x - p.x, q.feetPosition.z - p.z) < 30)) {
    s.leftAt = null; m.v = 0; m.base = { x: HOME.x, z: HOME.z, yaw: HOME.yaw };
  }
  m.base ??= { x: p.x, z: p.z, yaw: s.yaw ?? yaw };
  const target = b.controller ? -m.mz * MAX * (m.mz < 0 ? 1 : -0.5) : 0; // moveZ -1 is forward
  m.v += Math.sign(target - m.v) * Math.min(Math.abs(target - m.v), (b.controller && Math.abs(m.mz) > 0.1 ? ACC : 1.4) * dt); // glides a few metres when you let go
  const turnAim = b.controller ? -m.mx * TURN * (0.75 + 0.25 * Math.min(1, Math.abs(m.v) / 2)) : 0; // full turning even standing still
  m.turn += (turnAim - m.turn) * Math.min(1, dt * 6);
  m.base.yaw += m.turn * dt;
  const r = (m.base.yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
  if (Math.abs(m.v) > 0.05) {
    const dir = Math.sign(m.v), ahead = { x: m.base.x + fx * dir * 2.4, z: m.base.z + fz * dir * 2.4 };
    const ground = ctx.place.terrain?.heightAt?.(ahead.x, ahead.z);
    const hit = raycast(ctx, { x: m.base.x, y: 0.4, z: m.base.z }, { x: fx * dir, y: 0, z: fz * dir }, { distance: 2.2, physicsOnly: true, ignoreEntities: [b.id, s.rower].filter(Boolean) });
    if ((ground != null && ground > -0.45) || (hit && !String(hit.id ?? "").startsWith("l7-sea"))) {
      if (Math.abs(m.v) > 1.5) ctx.emit("screenShake", { intensity: 0.15, duration: 0.2 }, { audience: { nearby: m.base, radius: 6 } });
      m.v = 0;
    } else { m.base.x += fx * m.v * dt; m.base.z += fz * m.v * dt; }
  }
  // the swell rocks it, a little more when it moves
  const bob = Math.sin(now * 0.0016) * 0.07, roll = Math.cos(now * 0.0012) * 2.8 - m.turn * 0.05, pitch = Math.sin(now * 0.0011) * 1.5 + m.v * 0.6;
  b.feetPosition = { x: m.base.x, y: RIDE_Y + bob, z: m.base.z };
  b.rotation = { yaw: m.base.yaw, pitch, roll };
  // the oars row: a stroke while a key is down (backwards for S, one side harder when turning), at rest raised and feathered; the rower's hands ride the handles
  const oars = oarsOf(ctx, b), rowing = !!b.controller && (Math.abs(m.mz) > 0.1 || Math.abs(m.mx) > 0.1)
  m.ph ??= 0; m.amp ??= { R: 0, L: 0 };
  if (rowing) {
    m.ph = (m.ph + (m.mz > 0.1 ? -1 : 1) * 0.8 * dt + 1) % 1;
    const turn = Math.abs(m.mz) < 0.1 ? m.mx : m.mx * 0.5 // D (mx > 0) turns right: the left oar pulls, the right holds
    m.amp.L += ((turn > 0.1 ? 1 : turn < -0.1 ? 0.35 : 1) - m.amp.L) * Math.min(1, dt * 6); m.amp.R += ((turn < -0.1 ? 1 : turn > 0.1 ? 0.35 : 1) - m.amp.R) * Math.min(1, dt * 6);
  }
  const pose = {};
  for (const [side, sx] of [["R", 1], ["L", -1]]) {
    const o = oars[side], k = strokeAt(m.ph), A = m.amp[side], rest = rowing ? 0 : 1; m.rest ??= { R: 1, L: 1 };
    m.rest[side] += (rest ? 1 - m.rest[side] : -m.rest[side]) * Math.min(1, dt * 3);
    const e = m.rest[side], a = (k.a * A) * (1 - e) + REST.a * e, lift = k.lift * (1 - e) + REST.lift * e, fe = k.feather * (1 - e) + REST.feather * e
    const oa = ctx.getObject(o.a), ob = ctx.getObject(o.b), oc = ctx.getObject(o.c);
    if (oa) oa.rotation = { yaw: sx * a }; if (ob) ob.rotation = { roll: sx * lift }; if (oc) oc.rotation = { pitch: fe };
    pose[side] = [a, lift];
  }
  const rider = s.rower ? ctx.getObject(s.rower) : null;
  if (rider && now - (m.handsAt ?? 0) > 100) {
    m.handsAt = now; const base = { x: m.base.x, y: RIDE_Y + bob, z: m.base.z, yaw: m.base.yaw };
    rider.state.rowHands = { r: handle(base, 1, pose.R[0], pose.R[1]).map((v) => Math.round(v * 100) / 100), l: handle(base, -1, pose.L[0], pose.L[1]).map((v) => Math.round(v * 100) / 100), at: now };
  } else if (!s.rower && m.hadRider) { const o = ctx.getObject(m.hadRider); if (o?.state) o.state.rowHands = null; m.hadRider = null; }
  if (s.rower) m.hadRider = s.rower;
  // oar strokes and a wake, at their own pace
  const moving = Math.abs(m.v) > 0.4;
  const rowing = b.controller && Math.abs(m.mz) + Math.abs(m.mx) > 0.2;
  if (rowing && now - m.stroke > 1050) { // one soft stroke a beat, a creak every other one
    m.stroke = now; m.n = (m.n ?? 0) + 1;
    ctx.emit("playSound", { clip: OAR, position: { x: m.base.x, y: 0.2, z: m.base.z }, volume: 0.32, pitch: 0.92 + ctx.random() * 0.16, maxDistance: 18 });
    if (m.n % 2) ctx.emit("playSound", { clip: CREAK, position: { x: m.base.x, y: 0.4, z: m.base.z }, volume: 0.18, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 10 });
  }
  // the hull's own water: a quiet lap at rest that swells as you move, written only when it changes
  const g = Math.round((0.08 + Math.min(1, Math.abs(m.v) / MAX) * 0.22) * 50) / 50;
  if (g !== m.g) { m.g = g; b.audio = { clip: HULL, loop: true, gain: g, spatial: true, maxDistance: 16, pitch: 0.9 + Math.min(1, Math.abs(m.v) / MAX) * 0.2 }; }
  if (moving !== !!m.wake) { m.wake = moving; b.fx = moving ? { script: WAKE, params: { r: 1 } } : null; }
  if (!b.controller && !moving && now - (m.saved ?? 0) > 3000) { m.saved = now; s.yaw = m.base.yaw; }
}
