// Level 178 "Kyoto Dreams": the house is authored in cells/x0z0.scene; this keeps its eight residents (no hostiles, ever)
// walking their rounds (scripts/meg-agent.js reads state.rounds) and lays the Hub's return marker once.
import L from "../../scripts/lib/data/level178.yml";
import { keepPeople, every } from "../../scripts/lib/level-kit.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
const IDS = Object.keys(L.residents);
function person(ctx, id) {
  const r = L.residents[id], g = L.people[id] ?? {}, look = { species: "cat", sex: g.sex ?? "f", expr: g.expr, ...(g.hairc ? { hairc: g.hairc } : {}) };
  const rounds = (L.rounds[id] ?? []).map(([x, z, dwell]) => ({ x, y: L.arrive.y, z, dwell }));
  ctx.spawn(id, { tags: ["npc", "l178", "friendly"], feetPosition: { x: r.x, y: L.arrive.y, z: r.z }, rotation: { yaw: r.yaw ?? 0 }, physics: "character",
    ...critterSpec(npcLook(id, look, "survivor", L.residentLevel, "resident")), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: g.name, role: "resident", voice: g.voice, rounds, ...npcState(ctx, "agent", L.residentHp) } });
}
export const cadence = "1s";
export function tick(ctx) {
  const s = ctx.place.state;
  if ((s.layoutV ?? 0) < L.layoutV + 1) { s.layoutV = L.layoutV + 1; for (const id of IDS) if (!ctx.place.objects[id]) person(ctx, id); }
  if (!ctx.place.players.length) return;
  if (every(ctx, "l178people", 5000)) keepPeople(ctx, IDS, person);
}
