// Level 178 "Kyoto Dreams": the house is authored in cells/x0z0.scene; this keeps its eight residents (no hostiles, ever)
// walking their rounds (scripts/meg-agent.js reads state.rounds) and lays the Hub's return marker once.
import L from "../../scripts/lib/data/level178.yml";
import { sweepProps } from "../../scripts/lib/breakables.js";
import { weaponBody } from "../../scripts/lib/loot.js";
import { keepPeople, every } from "../../scripts/lib/level-kit.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import { setQuest, tellQuest, finishLevelQuest } from "../../scripts/lib/quests.js";
const Q = { key: "l178q", id: L.quest.id, name: L.quest.name };
const mk = (u, label) => ({ place: "level178", x: L.uses[u].c[0], y: 0, z: L.uses[u].c[2], label });
function quest(ctx, p) { // A Place to Rest: eat at the low table, then doze on a futon (stamps written by scripts/l178-prop.js)
  const ps = p.state; if (!ps || ps[Q.key] === 99) return;
  const front = () => { ps.qtrack = [Q.id, ...(ps.qtrack ?? []).filter((k) => k !== Q.id)].slice(0, 3); };
  if (!ps[Q.key]) { ps[Q.key] = 1; setQuest(ps, Q.id, { name: Q.name, step: "Irawan's crew leaves breakfast out. Sit at the low table in the dining room", mark: mk("l178-table-dining", "Dining room") }); front(); tellQuest(ctx, p, "New quest: A Place to Rest"); return; }
  if (ps[Q.key] === 1 && ps.l178meal) { ps[Q.key] = 2; setQuest(ps, Q.id, { name: Q.name, step: "Lie down on a futon in the north bedrooms", mark: mk("l178-futon-2", "Bedrooms") }); return; }
  if (ps[Q.key] === 2 && ps.l178rest && ps.l178rest >= ps.l178meal) finishLevelQuest(ctx, p, Q.key, Q, { xp: 100, cents: 0, items: [], by: "survivors", text: "Quest Completed: A Place to Rest" });
}
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
  if (ctx.place.players?.length) sweepProps(ctx); // lanterns, shoji paper, tableware break and regrow (breakables.yml idMat)
  if ((s.layoutV ?? 0) < L.layoutV + 1) { s.layoutV = L.layoutV + 1; for (const id of IDS) if (!ctx.place.objects[id]) person(ctx, id); }
  if ((s.findsV ?? 0) < 1) { s.findsV = 1; for (const f of L.finds ?? []) ctx.spawn("l178-find-" + f.kind, { tags: ["weapon"], state: { kind: f.kind }, feetPosition: { x: f.x, y: f.y, z: f.z }, rotation: { yaw: f.yaw ?? 0 }, visibleRange: { max: 40 }, ...weaponBody(f.kind) }); }
  if (!ctx.place.players.length) return;
  if (every(ctx, "l178people", 5000)) keepPeople(ctx, IDS, person);
  for (const p of ctx.place.players) quest(ctx, p);
  tickChatter(ctx, CHATTER.level178 ?? [], Object.fromEntries(IDS.map((id) => [id, L.people[id]?.voice ?? id]))); // the house talks in its own words, never the Backrooms pool
}
