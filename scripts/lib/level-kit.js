// The level kit: what every place's sim.js shares, so a new level is its layout and nothing else.
//   keepPeople(ctx, ids, spawn)  - named NPCs that come back an hour after they die (meg.yml respawn)
//   every(ctx, key, ms)          - a throttle for slow work inside a tick
// Smashed props and looted containers refill on their own (lib/breakables.js regrowWrecks, run near players by interact.js).
import { RESPAWN_MS } from "./npc-respawn.js";
export { RESPAWN_MS };

export function every(ctx, key, ms) {
  const s = ctx.session, k = "__every_" + key, now = ctx.now();
  if (now - (s[k] ?? -1e12) < ms) return false;
  s[k] = now; return true;
}

// ids: the NPC ids this place keeps; spawn(ctx, id): lays one fresh. Missing or dead for RESPAWN_MS → back home.
export function keepPeople(ctx, ids, spawn) {
  const s = ctx.place.state, now = ctx.now();
  let gone = s.npcGone ?? {}, changed = false;
  for (const id of ids) {
    const o = ctx.place.objects[id], down = !o || o.state?.dead || (o.state?.hp ?? 1) <= 0;
    if (!down) { if (gone[id] != null) { gone = { ...gone }; delete gone[id]; changed = true; } continue; }
    if (gone[id] == null) { gone = { ...gone, [id]: now }; changed = true; continue; }
    if (now - gone[id] < RESPAWN_MS) continue;
    gone = { ...gone }; delete gone[id]; changed = true;
    if (o) ctx.destroy(id);
    spawn(ctx, id);
  }
  if (changed) s.npcGone = gone;
}
