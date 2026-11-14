// The world's program: the referee. Behaviors write their own rows (ctx.self.state.*); this reads what
// changed and writes the rows everyone reads: ctx.world.state.* and ctx.place.state.*.
// Nov 12: the whole-place restyle sweep ran every second over every object (a 1247 ms tick in Level 5).
// Now each occupied place keeps a queue of ids, refilled when it runs dry, and a tick restyles a few.
export const cadence = "250ms";
import { setStyle, restyle } from "./scripts/lib/critter-model.js";
import { noNpcs, noStory } from "./scripts/lib/run-opts.js";
const PER_TICK = 40; // objects looked at per tick across all places (her pick: ~160/s, a 550-thing level in ~4 s)
const queues = new Map(); // place id -> { ids, ward } ; this machine's working memory, not shared state
function refill(pl) {
  const skip = new Set((pl.players ?? []).map((p) => p.id));
  const all = Object.keys(pl.objects ?? {}), ward = new Set();
  for (const k of all) { const i = k.indexOf("/critter-ward-"); if (i > 0) ward.add(k.slice(0, i)); }
  return { ids: all.filter((id) => !skip.has(id) && !id.startsWith("player/")), ward };
}
const npcSweep = new Map(); // place id -> last sweep ms (this machine's)
// Shelly Nov 14: an expedition started with NPCs off clears people (tag "npc") from the places its player stands in; monsters stay
function sweepNpcs(ctx, id, pl) {
  const ps = pl.players ?? [], npcs = ps.length > 0 && ps.every((p) => noNpcs(p.state)), story = ps.length > 0 && ps.every((p) => noStory(p.state)); // shared places: only when everyone there picked it
  if (!npcs && !story) return;
  const now = ctx.now(); if (now - (npcSweep.get(id) ?? 0) < 1500) return; npcSweep.set(id, now);
  // story off: Phoebe only lives in the story (cutscenes, the Hub), so she isn't there at all
  for (const r of ctx.query({ tags: [npcs ? "npc" : "phoebe"], place: id })) if (!r.id.startsWith("player/")) ctx.destroy(r.id);
}
export function tick(ctx) {
  setStyle(ctx.world.state.bodyStyle); // this machine's spawns follow the BODIES pick
  const live = new Set();
  for (const p of ctx.world.players) { const id = p.place?.id ?? p.place; if (id) live.add(id); }
  for (const id of [...queues.keys()]) if (!live.has(id)) queues.delete(id);
  let budget = PER_TICK, n = 0;
  for (const id of live) {
    const pl = ctx.world.places[id]; if (!pl) continue;
    sweepNpcs(ctx, id, pl);
    let q = queues.get(id);
    if (!q || !q.ids.length) { q = refill(pl); queues.set(id, q); }
    while (q.ids.length && budget > 0) {
      const o = pl.objects[q.ids.pop()];
      if (!o || o.audience === "local" || !o.model) continue;
      budget--; if (restyle(ctx, o, q.ward)) n++;
    }
    if (budget <= 0) break;
  }
  if (n) ctx.log("restyle", n);
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
