// The world's program: the referee. Behaviors write their own rows (ctx.self.state.*); this reads what
// changed and writes the rows everyone reads: ctx.world.state.* and ctx.place.state.*.
export const cadence = "1s";
import { setStyle, restylePlace } from "./scripts/lib/critter-model.js";
export function tick(ctx) {
  setStyle(ctx.world.state.bodyStyle); // this machine's spawns follow the BODIES pick
  // every person standing in a level someone is in follows it too (NPCs, scene-laid people, corpses); restyle skips what already matches
  const seen = new Set();
  for (const p of ctx.world.players) { const id = p.place?.id ?? p.place; if (!id || seen.has(id)) continue; seen.add(id); const pl = ctx.world.places[id]; if (pl) { const n = restylePlace(ctx, pl); if (n) ctx.log("restyle", id, n) } }
}

// Something that falls below a place's worldBounds would respawn at the place's spawn point, which is
// where players arrive: fallen creatures used to pile up in front of every arrival (Shelly 2026-11-08).
// A player still respawns as normal; a creature goes back to its home, or is gone (its manager respawns it).
export function onOutOfBounds(ctx, event) {
  const o = ctx.self;
  if (!o || o.tags?.includes("player") || o.tags?.includes("helper") || String(o.id).startsWith("player/") || ctx.place.players.some((p) => p.id === o.id)) return true;
  const h = o.state?.home;
  if (h && h.x != null && h.z != null) {
    o.velocity = { x: 0, y: 0, z: 0 };
    o.feetPosition = { x: h.x, y: (h.y ?? 0) + 0.3, z: h.z };
    return false;
  }
  ctx.destroy(o.id);
  return false;
}
