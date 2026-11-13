// Who saw a kill. Fallout-style: an npc with a clear line to the body sees it happen; a crouched killer is only seen up close.
// The body remembers (state.killedBy, state.witnesses); scripts/l5-corpse-crew.js lets residents find it and talk it over.
import { clearSight } from "./sight.js";
import { alliedWitnesses, recordIncident } from "./forgive.js";
const SEE = 16, SNEAK_SEE = 5; // metres (Savi's picks)
export function markKill(ctx, victim, killer) {
  const v = victim.feetPosition, eye = { x: v.x, y: v.y + 1, z: v.z }, sneaking = !!killer?.state?.crouch, seen = [];
  for (const n of ctx.query({ tags: ["npc"], center: v, radius: SEE })) {
    if (n.id === victim.id || n.state?.dead || (n.state?.hp ?? 1) <= 0) continue;
    const p = n.feetPosition, d = Math.hypot(p.x - v.x, p.z - v.z); if (sneaking && d > SNEAK_SEE) continue;
    const from = { x: p.x, y: p.y + 1.5, z: p.z }, k = killer.feetPosition;
    if (clearSight(ctx, from, eye, [n.id, victim.id, killer.id])
      && clearSight(ctx, from, { ...k, y: k.y + 1.1 }, [n.id, victim.id, killer.id])) seen.push(n.id);
    if (seen.length >= 4) break;
  }
  // factions: a witness of the victim's own faction turns on the killer; anyone else only remembers what they saw
  const witnesses = seen.map(id => ctx.getObject(id)).filter(Boolean);
  const allies = new Set(alliedWitnesses(ctx, victim, killer, witnesses).map(n => n.id));
  for (const n of witnesses) {
    if (allies.has(n.id)) recordIncident(ctx, n, killer, "murder");
    n.state.sawKill = { by: killer.id, name: killer.displayName, victim: victim.state?.name ?? null, at: ctx.now() } }
  // karma and reputation for the killing: scripts/lib/rep.js repKill (called by the caller with the witnesses this returns)
  victim.state.killedBy = killer?.displayName ?? "someone";
  victim.state.witnesses = seen; victim.state.corpseAt ??= ctx.now(); victim.state.sneakKill = sneaking && !seen.length;
  return seen;
}
