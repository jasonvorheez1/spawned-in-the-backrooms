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
