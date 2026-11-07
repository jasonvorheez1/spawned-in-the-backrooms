// Level 5's resident director (entity "l5-people"): spawns the cast in scripts/lib/data/level5-people.yml, keeps them alive,
// swaps day/night rounds and sets two of them talking. The stash trunks of the four suites are laid here too.
import { tickPeople, PEOPLE5 as P } from "./lib/l5-people.js";
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  for (const [sid, v] of Object.entries(P.suites)) {
    if (!ctx.getObject(`l5-people-trunk-${sid}`)) { const [x, z, yaw] = v.trunk; ctx.spawn(`l5-people-trunk-${sid}`, { tags: ["usable", "l5-trunk"], feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: "static", primitive: { kind: "scripted", script: "scripts/l5-stash-geo.js", params: { kind: "trunk" } }, material: { pbr: true }, behavior: "scripts/l5-stash.js", state: { kind: "trunk", suite: sid, name: "Steamer trunk", verb: "Open", info: "Your suite's stash. Keeps what you leave.", tint: "#c9a227", items: "", stash: {} } }); }
    if (!ctx.getObject(`l5-people-rack-${sid}`)) { const [x, z, yaw] = v.rack; ctx.spawn(`l5-people-rack-${sid}`, { tags: ["usable", "l5-rack"], feetPosition: { x, y: 0, z }, rotation: { yaw }, physics: "static", primitive: { kind: "scripted", script: "scripts/l5-stash-geo.js", params: { kind: "rack" } }, material: { pbr: true }, behavior: "scripts/l5-stash.js", state: { kind: "rack", suite: sid, name: "Luggage rack", verb: "Stow", info: "Stow your spare water, pins, salt and meat in the trunk.", tint: "#c9a227" } }); }
  }
  if (ctx.place.players.length) tickPeople(ctx);
}
