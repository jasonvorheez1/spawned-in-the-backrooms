// A killed NPC stays gone for an hour of real time, then returns home (Shelly, 2026-11-07).
// The clock starts the first tick the place's sim finds the NPC missing (its body vanishes ~90 s after death).
import MEG from "./data/meg.yml";
export const RESPAWN_MS = (MEG.respawn ?? 3600) * 1000;
// true when this missing NPC may be spawned again now; stamps and clears place.state.npcGone itself
export function mayReturn(ctx, id) {
  const s = ctx.place.state, g = s.npcGone ?? {};
  if (g[id] == null) { s.npcGone = { ...g, [id]: ctx.now() }; return false; }
  if (ctx.now() - g[id] < RESPAWN_MS) return false;
  const { [id]: _, ...rest } = g; s.npcGone = rest; return true;
}
// a fresh place (never built) spawns everyone at once
export const firstLay = (ctx) => !ctx.place.state.npcGone;
