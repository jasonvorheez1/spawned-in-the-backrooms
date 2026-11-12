// Level 31 · shop zone (map: scripts/lib/level31.js ZONES.shop). One export, called once per lay by places/level31/sim.js.
// "Dottie's": the rink's gift counter on the west wall. Props are Blender builds (art/l31shop/build1.py, build2.py).
import { critterSpec } from "./critter-model.js";
import { npcLook } from "./clothes.js";
import { npcState } from "./stats.js";
const C = (h) => `/cdn/value.${h}.glb`;
const M = {
  case: C("4e4232d504243753b8093ecbded15cf7a15d83caa454d9a7267753de18ec803b"), fridge: C("771b5071459bb3232354e8687c5907232ca21fd30fa6bf4ce677fe1f892ca307"),
  gumball: C("8a56aca6ef6b1538521554450fdbbcb8ab9938be6cd66a2acd5673970b5e5966"), spinner: C("be7eb6c9bc6772c442cbd253702e165b10228b7f25c091d9b7fe1a9fee5eef61"),
  stickers: C("ac26ad98d9c72af404cfccb160ac08446c310e266a0a9934600985c9350931ba"), plush: C("9a00dc6793f313bcdee2cc9d0d5a3dc265139fdc0dd27f40d6f60f8edffdd70f"),
  tees: C("9b6b13b71bbffdf8cd0ced1035a3dff0d8e4f1b32840180d74251faad3c40166"), cds: C("6b3a28ca3cb58efe606cf0ffe79bdd5aaa1a72a65d5552c16ab832e2b9ce4cf6"),
  till: C("f2663b8e02cbce4a46bcfac7649bc914ec716a82c522683d3afa35ae62387855"), goods: C("853325a6c5a79f84ff8856bdec753180a3d7bd7e5b51e26f672b7c91003fa264"),
  slatA: C("1e06f865e3bab819652a7465866afc2c45f18e4e921be428e2aa3ee858166281"), slatB: C("e7314085a43f0e52bed0ee5bdf56f3a8cd3effa57fc716faa8c431493d8eb3c0"),
  neon: C("8eeb18c99bfd4d8d7eeab25ae7d204179f7de76980db3dfea83cda5bdff30c03"),
};
const E = -90, W = 90, N = 0, S = 180; // yaw that turns a prop's front to face east / west / north / south
const WX = -41.8, NZ = -11.8, SZ = 11.8; // inner faces of the shop's wall linings
const CREAM = "oklch(0.8 0.05 75)", TEAL = "oklch(0.52 0.09 200)";
export function layShop(ctx) {
  const sp = (id, spec) => ctx.spawn("l31-shop-" + id, spec);
  const wall = (id, x, y, z, w, h, d, color) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material: color === CREAM ? { texture: "cdn/texture-painted-cinder-block-wall-cream.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.9 0.03 75)", roughness: 0.9 } : { color, roughness: 0.85 }, physics: "static" });
  const prop = (id, m, x, y, z, yaw, solid = true, extra = {}) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: M[m], forward: "+z" }, ...(solid ? { physics: { body: "static", collider: "box" } } : {}), ...extra });
  // the blueprint's spot becomes the shop's vinyl floor
  sp("bp", { feetPosition: { x: -35, y: 0, z: 0 }, primitive: { kind: "box", width: 13.7, height: 0.012, depth: 23.7 }, material: { texture: "cdn/texture-speckled-vct-vinyl-floor-tile-warm-grey.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.86 0.02 60)", roughness: 0.55 } });
  // linings on the three walls, teal wainscot under cream
  wall("wall-w", -41.9, 0, 0, 0.2, 5, 24, CREAM); wall("wall-n", -35, 0, -11.9, 13.6, 5, 0.2, CREAM); wall("wall-s", -35, 0, 11.9, 13.6, 5, 0.2, CREAM);
  wall("base-n", -35, 0, -11.79, 13.6, 0.9, 0.03, TEAL); wall("base-s", -35, 0, 11.79, 13.6, 0.9, 0.03, TEAL);
  // shopfront: two stubs and a header over a 14 m opening
  // shopfront stubs: four Tripo teal-and-chrome memphis pilasters each (file 0.29 x 1 x 0.48 m), a hidden box per stub for collision
  for (const [k, z0] of [["n", -9.5], ["s", 9.5]]) {
    sp("front-" + k, { feetPosition: { x: -28.125, y: 0, z: z0 }, primitive: { kind: "box", width: 0.25, height: 3.2, depth: 5 }, render: false, physics: "static",
      children: [0, 1, 2, 3].map((i) => ({ id: "p" + i, feetPosition: { x: 0, y: 0, z: (i - 1.5) * 1.25 }, model: "/cdn/value.8faca840ae55cd7013f7d9933f73bf8da283dabe7217ff98753b8c4752aeb954.glb", scale: { x: 1.05, y: 3.2, z: 2.6 } })) });
  } wall("header", -28.125, 3.2, 0, 0.25, 1.8, 24, "oklch(0.3 0.05 200)");
  prop("neon", "neon", -27.96, 3.35, 0, E, false);
  // west wall: slatwall behind the counter, tees to the north, plush and CDs to the south
  prop("slat-a", "slatA", WX + 0.094, 0, -1.55, E, false); prop("slat-b", "slatB", WX + 0.094, 0, 1.55, E, false);
  prop("tees-w", "tees", WX + 0.049, 0.85, -7, E, false); prop("tees-n", "tees", -36, 0.85, NZ + 0.049, S, false);
  prop("plush", "plush", WX + 0.21, 0, 5.2, E); prop("plush-2", "plush", WX + 0.21, 0, 6.9, E);
  prop("cds-a", "cds", WX + 0.13, 0, 8.3, E); prop("cds-b", "cds", WX + 0.13, 0, 8.72, E);
  // the L counter: one case facing the aisle, one turned south, goods on the glass
  prop("case-a", "case", -38.5, 0, 0, E); prop("case-b", "case", -39.1, 0, 1.2, S);
  prop("till", "till", -38.5, 1.0, -0.45, W, false); prop("goods", "goods", -39.1, 1.0, 1.2, S, false);
  prop("spinner", "spinner", -34.3, 0, 4.6, 20); prop("spinner-2", "spinner", -34.3, 0, -4.6, -25); prop("fridge", "fridge", -39.2, 0, SZ - 0.34, N);
  // by the entrance, on the aisle side of the south stub
  prop("stickers", "stickers", -27.79, 0, 9.3, E); prop("gumball", "gumball", -27.78, 0, 8.3, E);
  // a taped note by the fridge
  sp("note", { feetPosition: { x: -38.4, y: 1.5, z: SZ - 0.006 }, rotation: { yaw: N, roll: -3 }, vector: "<svg viewBox='0 0 100 70' width='0.3m'><rect x='2' y='4' width='96' height='64' fill='#f6f1dc'/><rect x='36' y='0' width='28' height='9' fill='#e8d9a0' opacity='0.8'/><text x='50' y='30' text-anchor='middle' font-family='serif' font-style='italic' font-size='15' fill='#223a8a'>door sticks</text><text x='50' y='52' text-anchor='middle' font-family='serif' font-style='italic' font-size='15' fill='#223a8a'>pull hard</text></svg>" });
  // light: warm over the counter, pink north, cyan south, a pink wash under the sign
  const lamp = (id, x, y, z, color, intensity, distance) => sp(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance } });
  lamp("light-counter", -37, 3.4, 0, "oklch(0.92 0.07 80)", 1.4, 12); lamp("light-mid", -33, 3.4, 0, "oklch(0.9 0.06 80)", 0.9, 10); lamp("light-n", -36, 3.2, -8, "oklch(0.8 0.13 350)", 1, 10);
  lamp("light-s", -36, 3.2, 8, "oklch(0.85 0.1 210)", 1, 10); lamp("light-sign", -26.6, 3.6, 0, "oklch(0.75 0.2 350)", 0.7, 7);
  // Dottie, a faceling, behind the counter
  sp("keeper", {
    tags: ["npc", "faceling"], feetPosition: { x: -39.5, y: 0, z: -0.1 }, rotation: { yaw: E }, physics: "character",
    ...critterSpec(npcLook("l31-shop-keeper", { species: "faceling", sex: "f", topw: "tee", top: "#f06aa8", botw: "pants", bottom: "#2b2b33", shoes: "sneakers" }, "trader", 31)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Dottie · Gift Counter", role: "trader", voice: "l31-shop-keeper#f", faction: "rink", factionName: "the gift counter at the Roller Rink", docile: true, home: { x: -39.5, z: -0.1 }, line: "Everything in the case is from home.", ...npcState(ctx, "trader", 100) },
  });
}
