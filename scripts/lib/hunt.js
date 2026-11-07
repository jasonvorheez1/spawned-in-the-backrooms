// what every Level 0 hunter shares: hearing a wanderer through walls, and guessing where a lost one went.
import L from "./data/level0.yml";
// the nearest wanderer this hunter hears from pos (sprinting carries far, walking near, crouching never)
export function hearOf(pos, players, skip) {
  let best = null, bd = Infinity;
  for (const p of players) {
    if (skip && skip(p)) continue;
    if (p.state?.crouch) continue;
    const v = p.velocity ?? {}, sp = Math.hypot(v.x ?? 0, v.z ?? 0);
    const r = sp > L.walkSpeed + 0.5 ? L.hearSprint : sp > 1 ? L.hearWalk : 0;
    const d = Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z);
    if (d < r && d < bd) { best = p; bd = d; }
  }
  return best;
}
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
