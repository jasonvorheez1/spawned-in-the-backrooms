// what every Level 0 hunter shares: hearing a wanderer through walls, and guessing where a lost one went.
import L from "./data/level0.yml";
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
