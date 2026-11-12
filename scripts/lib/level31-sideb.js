// Level 31 "Side B" set (Shelly Nov 12: Tripo + AAA pass, a B.N.T.G. vs facelings quest). Laid by places/level31/sim.js through layParts.
// Marlowe's B.N.T.G. concession on the south carpet, Dez by the plywood door, the DJ's crate behind the cinema screen,
// three rink facelings (faction "rink") and two concession guards (faction "concession"): whoever you cross goes Vilified and swings (fists only, no weapons on Level 31).
// Tripo models: the stall, the crate, extra arcade cabinets and food-court table sets. Origins are floor centres; fronts face -Z at yaw 0.
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
export const GLB = {
  stall: "/cdn/value.f7e6008506e6d256bf36d1f08245b4133e7dd14034aaa56def75706efb87180d.glb",
  cabinet: "/cdn/value.d75ae9bc77f161906cecfccf99fe925485c060e50d6cf18b26de36704a7122cf.glb",
  tables: "/cdn/value.ba18fd1befb4a4e07b0e56659d24b45c722dcb2b89b4bc3ed4c98f4f6f370f53.glb",
  crate: null,
};
// target sizes in metres (my picks): width x height x depth the model is fitted into
const FIT = { stall: [2.0, 1.35, 1.0], cabinet: [0.7, 1.85, 0.85], tables: [1.9, 0.95, 1.9], crate: [0.95, 0.6, 0.55] };
const box = (k) => { const [w, h, d] = FIT[k]; return { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } }; };
export const FWD = { stall: "+x", cabinet: "+z", tables: "+z", crate: "+z" };
export function laySideB(ctx) {
  for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l31-q-") && !id.includes("/")) ctx.destroy(id);
  const sp = (id, spec) => ctx.spawn("l31-q-" + id, spec);
  const M = (id, key, x, z, yaw, extra = {}) => GLB[key] && sp(id, { feetPosition: { x, y: 0, z }, rotation: { yaw }, model: { id: GLB[key], forward: FWD[key] }, layout: { box: box(key) }, physics: { body: "static", collider: "box" }, ...extra });
  const person = (id, x, z, yaw, look, faction, factionName, name, kind, extra = {}) => sp(id, {
    feetPosition: { x, y: 0.05, z }, rotation: { yaw }, physics: "character", tags: ["npc", "usable", "l31q-crew", ...(look.species === "faceling" ? ["faceling"] : [])],
    ...critterSpec(npcLook("l31-q-" + id, look, kind, 31)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name, role: kind, faction, factionName, home: { x, z }, stay: true, ...npcState(ctx, "agent", 90), ...extra } });

  // the B.N.T.G. concession: a folding table of almond water and batteries on the south carpet, a lamp hung off a mic stand
  M("stall", "stall", -12, 27.4, 0, { tags: ["l31-q"] });
  sp("stall-sign", { feetPosition: { x: -12, y: 2.05, z: 29.82 }, castShadow: false,
    vector: `<svg viewBox='0 0 240 70' width='1.9m'><rect x='4' y='6' width='232' height='58' fill='#e9e2cc' transform='rotate(-1.5 120 35)'/><text x='120' y='34' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='22' fill='#1e3b2a'>B.N.T.G. RINK CONCESSION</text><text x='120' y='54' text-anchor='middle' font-family='serif' font-style='italic' font-size='14' fill='#5a2a1a'>we buy · we sell · we don't ask</text></svg>` });
  sp("stall-lamp", { feetPosition: { x: -12, y: 2.3, z: 27.6 }, light: { kind: "point", color: "#ffd59a", intensity: 1.6, distance: 7 } });
  person("marlowe", -12, 28.8, 0, { species: "human", sex: "m", topw: "jacket", top: "#4a5a3a", botw: "pants", bottom: "#2c2a26", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "Marlowe · B.N.T.G.", "trader", { voice: "l31-q-marlowe", essential: true, line: "Batteries, almond water, mild optimism." });
  person("guard1", -14.7, 27.9, 15, { species: "human", sex: "f", topw: "hoodie", top: "#3b4a36", botw: "pants", bottom: "#24241f", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "B.N.T.G. Muscle", "agent");
  person("guard2", -9.3, 27.9, -15, { species: "human", sex: "m", topw: "tee", top: "#56603f", botw: "pants", bottom: "#2a2622", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "B.N.T.G. Muscle", "agent");
  person("dez", -27.4, 28.6, -20, { species: "human", sex: "m", topw: "jacket", top: "#2e2f2a", botw: "pants", bottom: "#1f1f22", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "Dez · B.N.T.G.", "agent", { voice: "l31-q-dez", essential: true });

  // the DJ's crate, back corner behind the left curtain, where it's dark
  if (GLB.crate) M("crate", "crate", -6.1, -29.3, 0, { tags: ["usable", "l31-q"], behavior: "scripts/l31-crate.js", state: { name: "Steel crate", verb: "Open", info: "Padlocked. A card slot under the lock." } });
  else sp("crate", { feetPosition: { x: -6.1, y: 0, z: -29.3 }, primitive: { kind: "box", width: 0.95, height: 0.6, depth: 0.55 }, material: { color: "#4a5236", roughness: 0.7, metalness: 0.4 }, physics: "static", tags: ["usable", "l31-q"], behavior: "scripts/l31-crate.js", state: { name: "Steel crate", verb: "Open", info: "Padlocked. A card slot under the lock." } });
  sp("crate-glow", { feetPosition: { x: -6.1, y: 0.9, z: -28.9 }, light: { kind: "point", color: "#9ab6ff", intensity: 0.25, distance: 2.5 } });

  // three rink facelings: blank faces, regulars who belong to the place. Docile until you sell their song.
  const F = (id, x, z, yaw, sex, top) => person(id, x, z, yaw, { species: "faceling", sex, topw: sex === "f" ? "jacket" : "tee", top, botw: "pants", bottom: "#22232b", shoes: "sneakers" },
    "rink", "the Roller Rink", "Rink Regular", "regular", { docile: true });
  F("face1", -3.2, -22.6, 180, "f", "#8a3f6a"); F("face2", 16, -14.5, 200, "m", "#2f6a7a"); F("face3", -20, 14.5, 120, "m", "#a8743a");

  // Tripo arcade cabinets: two more old uprights along the aisle wall of the arcade
  M("cab1", "cabinet", 29.2, -27.6, 180, { tags: ["l31-arcade"] }); M("cab2", "cabinet", 30.2, -27.6, 180, { tags: ["l31-arcade"] });
  // Tripo table sets: two more four-tops on the carpet by the rink rail, where skaters rest
  M("tables1", "tables", -24.5, -16, 12, { tags: ["seat"] }); M("tables2", "tables", 24.5, 16.5, -20, { tags: ["seat"] });
}
