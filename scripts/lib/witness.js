// Who saw a kill. Fallout-style: an npc with a clear line to the body sees it happen; a crouched killer is only seen up close.
// The body remembers (state.killedBy, state.witnesses); scripts/l5-corpse-crew.js lets residents find it and talk it over.
import { raycast } from "builtin/physics";
const SEE = 16, SNEAK_SEE = 5; // metres (Savi's picks)
export function markKill(ctx, victim, killer) {
  const v = victim.feetPosition, eye = { x: v.x, y: v.y + 1, z: v.z }, sneaking = !!killer?.state?.crouch, seen = [];
  for (const n of ctx.query({ tags: ["npc"], center: v, radius: SEE })) {
    if (n.id === victim.id || n.state?.dead) continue;
    const p = n.feetPosition, d = Math.hypot(p.x - v.x, p.z - v.z); if (sneaking && d > SNEAK_SEE) continue;
    const from = { x: p.x, y: p.y + 1.5, z: p.z }, dir = { x: eye.x - from.x, y: eye.y - from.y, z: eye.z - from.z }, len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const wall = raycast(ctx, from, { x: dir.x / len, y: dir.y / len, z: dir.z / len }, { distance: len - 0.3, physicsOnly: true, bodies: "static", ignoreEntities: [n.id, victim.id] });
    if (!wall) seen.push(n.id);
    if (seen.length >= 4) break;
  }
  victim.state.killedBy = killer?.displayName ?? "someone";
  victim.state.witnesses = seen; victim.state.corpseAt ??= ctx.now(); victim.state.sneakKill = sneaking && !seen.length;
  return seen;
}
