// Level 31 "Side B" set (Shelly Nov 12: Tripo + AAA pass, a B.N.T.G. vs facelings quest). Laid by places/level31/sim.js through layParts.
// Marlowe's B.N.T.G. concession on the south carpet, Dez by the plywood door, the DJ's crate behind the cinema screen,
// three rink facelings (faction "rink") and two concession guards (faction "concession"): whoever you cross goes Vilified and swings (fists only, no weapons on Level 31).
// Tripo models: the stall and the crate. Origins are floor centres; fronts face -Z at yaw 0.
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
export const GLB = {
  stall: "/cdn/value.f7e6008506e6d256bf36d1f08245b4133e7dd14034aaa56def75706efb87180d.glb",
  crate: "/cdn/value.edc3dbc2625d0cd95fa6298f7feec879b0363ba630c437dd962f7ea561952bd1.glb",
};
// target sizes in metres (my picks): width x height x depth the model is fitted into
const FIT = { stall: [2.0, 1.35, 1.0], crate: [0.95, 0.6, 0.55] };
const box = (k) => { const [w, h, d] = FIT[k]; return { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } }; };
export const FWD = { stall: "+x", crate: "+z" };
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
    vector: `<svg viewBox='0 0 360 70' width='2.6m'><rect x='4' y='6' width='352' height='58' fill='#e9e2cc' transform='rotate(-1.5 180 35)'/><text x='180' y='34' text-anchor='middle' font-family='sans-serif' font-weight='700' font-size='22' fill='#1e3b2a'>B.N.T.G. RINK CONCESSION</text><text x='180' y='54' text-anchor='middle' font-family='serif' font-style='italic' font-size='14' fill='#5a2a1a'>we buy · we sell · we don't ask</text></svg>` });
  sp("stall-lamp", { feetPosition: { x: -12, y: 2.3, z: 27.6 }, light: { kind: "point", color: "#ffd59a", intensity: 1.6, distance: 7 } });
  // the crew's shifts (Savi's picks): muscle walks a beat round the stall and the rink's north aisle, Dez paces the dark back corner, Marlowe minds the counter
  const beat = (x, z, dwell, lx = 0, lz = 0) => ({ x, y: 0, z, dwell, look: { x: lx, z: lz } });
  const SHIFT = {
    marlowe: [beat(-12, 28.8, 14, -12, 20), beat(-13.4, 29.1, 6, -13.4, 31), beat(-10.6, 28.9, 8, -12, 20)],
    guard1: [beat(-14.7, 27.9, 10), beat(-18, 25, 7), beat(-22, 21, 9), beat(-16, 24, 6)],
    guard2: [beat(-9.3, 27.9, 9), beat(-5, 24.5, 8), beat(-1.5, 25.5, 7), beat(-6, 25, 6)],
    dez: [beat(-27.4, 28.6, 12, -12, 28), beat(-31, 26, 8, -24, 4), beat(-27, 23, 9), beat(-24, 27, 7, -12, 28)],
  };
  person("marlowe", -12, 28.8, 0, { species: "human", sex: "m", topw: "jacket", top: "#4a5a3a", botw: "pants", bottom: "#2c2a26", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "Marlowe · B.N.T.G.", "trader", { voice: "l31-q-marlowe", essential: true, line: "Batteries, almond water, mild optimism.", rounds: SHIFT.marlowe });
  person("guard1", -14.7, 27.9, 15, { species: "human", sex: "f", topw: "hoodie", top: "#3b4a36", botw: "pants", bottom: "#24241f", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "B.N.T.G. Muscle", "agent", { rounds: SHIFT.guard1 });
  person("guard2", -9.3, 27.9, -15, { species: "human", sex: "m", topw: "tee", top: "#56603f", botw: "pants", bottom: "#2a2622", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "B.N.T.G. Muscle", "agent", { rounds: SHIFT.guard2 });
  person("dez", -27.4, 28.6, -20, { species: "human", sex: "m", topw: "jacket", top: "#2e2f2a", botw: "pants", bottom: "#1f1f22", shoes: "boots" },
    "concession", "B.N.T.G. Rink Concession", "Dez · B.N.T.G.", "agent", { voice: "l31-q-dez", essential: true, rounds: SHIFT.dez, nerve: "brave" });

  // the DJ's crate, back corner behind the left curtain, where it's dark
  if (GLB.crate) M("crate", "crate", -6.1, -29.3, 0, { tags: ["usable", "l31-q"], behavior: "scripts/l31-crate.js", state: { name: "Steel crate", verb: "Open", info: "Padlocked. A card slot under the lock." } });
  else sp("crate", { feetPosition: { x: -6.1, y: 0, z: -29.3 }, primitive: { kind: "box", width: 0.95, height: 0.6, depth: 0.55 }, material: { color: "#4a5236", roughness: 0.7, metalness: 0.4 }, physics: "static", tags: ["usable", "l31-q"], behavior: "scripts/l31-crate.js", state: { name: "Steel crate", verb: "Open", info: "Padlocked. A card slot under the lock." } });
  sp("crate-glow", { feetPosition: { x: -6.1, y: 0.9, z: -28.9 }, light: { kind: "point", color: "#9ab6ff", intensity: 0.25, distance: 2.5 } });

  // their beat round the carpet aisle outside the rail: a few stops each, watching the skaters (Savi's picks)
  const st = (x, z, dwell) => ({ x, y: 0, z, dwell, look: { x: 0, z: 0 } });
  const LAPS = {
    face1: [st(-11, -16.8, 9), st(-5, -16.8, 7), st(5.5, -16.8, 8), st(11, -16.8, 6)],
    face2: [st(16, -15, 8), st(24, -9, 6), st(24, 3, 9), st(24, -9, 7)],
    face3: [st(-24, 12, 8), st(-24, 4, 7), st(-24, -6, 9), st(-24, 4, 6)],
  };
  // three rink facelings: blank faces, regulars who belong to the place. Docile until you sell their song.
  const F = (id, x, z, yaw, sex, top) => person(id, x, z, yaw, { species: "faceling", sex, topw: "tee", top, botw: "pants", bottom: "#22232b", shoes: "sneakers" },
    "rink", "the Roller Rink", "Rink Regular", "regular", { docile: true, rounds: LAPS[id] });
  F("face1", -11, -16.8, 180, "f", "#8a3f6a"); F("face2", 16, -15, 200, "m", "#2f6a7a"); F("face3", -24, 12, 120, "m", "#a8743a");
}
