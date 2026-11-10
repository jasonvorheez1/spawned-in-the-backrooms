// what every Level 0 hunter shares: hearing a wanderer through walls, and guessing where a lost one went.
import L from "./data/level0.yml";
import { raycast } from "builtin/physics";
// the nearest wanderer this hunter hears from pos (sprinting carries far, walking near, crouching never)
let clock = () => 0;
const now = () => clock();
export function hearOf(pos, players, skip, ctx) {
  if (ctx) clock = () => ctx.now();
  let best = null, bd = Infinity;
  for (const p of players) {
    if (skip && skip(p)) continue;
    const v = p.velocity ?? {}, sp = Math.hypot(v.x ?? 0, v.z ?? 0), loud = p.state?.loud;
    const fight = loud && now() - loud.at < 2500 ? (loud.gun ? L.hearGun ?? 34 : L.hearFight ?? 14) : 0; // a swing, a smash, a shot: crouching won't hide that
    const r = Math.max(fight, p.state?.crouch ? 0 : sp > L.walkSpeed + 0.5 ? L.hearSprint : sp > 1 ? L.hearWalk : 0);
    const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
    if (d < r && d < bd) { best = p; bd = d; }
  }
  return best;
}
// the pack call: a hunter that spots a wanderer shrieks, and every other hunter within callRange comes to look
export function raise(ctx, p) {
  const st = ctx.place.state, a = st.l0alert, t = ctx.now();
  if (a && t - a.at < 1500) return; // one call a moment, not one per hunter per look
  st.l0alert = { x: p.feetPosition.x, z: p.feetPosition.z, vx: p.velocity?.x ?? 0, vz: p.velocity?.z ?? 0, at: t };
}
export function alertFor(ctx, pos) {
  const a = ctx.place.state.l0alert;
  if (!a || ctx.now() - a.at > 5000) return null;
  return Math.hypot(a.x - pos.x, a.z - pos.z) < (L.callRange ?? 24) ? a : null;
}
// where the thing that just hit this creature stood (player.js hitTarget writes state.shot): known at any distance for 8 s, never through a hide
export function shotAt(st, now) { const a = st?.shot; return a && now - a.at < 8000 ? a : null }
// walls on any level: a short ray along the way it is going (every 120 ms); a wall in the way turns the heading away along it. Returns the new unit heading.
export function wallSteer(ctx, m, now, pos, ux, uz, selfId) {
  if (now >= (m.wsAt ?? 0)) {
    m.wsAt = now + 120
    const hit = raycast(ctx, { x: pos.x, y: pos.y + 0.6, z: pos.z }, { x: ux, y: 0, z: uz }, { distance: 1.4, physicsOnly: true, ignoreEntities: [selfId] })
    m.ws = hit?.normal && Math.abs(hit.normal.y) < 0.5 ? { nx: hit.normal.x, nz: hit.normal.z, k: 1 - Math.min(1, (hit.distance ?? 0.7) / 1.4) } : null
  }
  if (!m.ws) return [ux, uz]
  const f = 1.2 * m.ws.k + 0.3, vx = ux + m.ws.nx * f, vz = uz + m.ws.nz * f, l = Math.hypot(vx, vz) || 1
  return [vx / l, vz / l]
}
// a body that has not budged for ~2.4 s while walking (a wall slid onto it, a corner): true once, and the caller backs it off
export function wedged(m, moved, walking) { m.wedge = moved < 0.05 && walking ? (m.wedge ?? 0) + 1 : 0; if (m.wedge >= 3) { m.wedge = 0; return true } return false }
// lit: a wanderer standing under a working fluorescent is seen farther than one in a dead patch
export function litMul(p) { return p.state?.dark ? 0.75 : 1; }
// the last sighting, plus where the wanderer was heading
export function sighting(p, now) {
  const v = p.velocity ?? {};
  return { x: p.feetPosition.x, z: p.feetPosition.z, vx: v.x ?? 0, vz: v.z ?? 0, at: now };
}
// where to search: the spot they vanished, pushed along their heading
export function leadOf(last) {
  const k = L.leadSeconds ?? 1.6;
  return { x: last.x + (last.vx ?? 0) * k, z: last.z + (last.vz ?? 0) * k };
}
