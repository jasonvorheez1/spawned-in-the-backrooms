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
  counter: C("aaddade70e65d95cf0f42bc5fff2d5405f8249413bf41f180cea81b979b48bf0"), gondola: C("4a04f4607b01ff67aa72590bb7d9442f9e8b7274f1ba0421c9607bbf270b3fb0"), skatewall: C("c16242187a987b783d4ec41253eb5b35d380f85024c333a06a5792ddff6c09fa"), gondola2: C("2efc26b2c1f37438d0a05c90875a8ae8a96a284be52043288237e943fad280c4"), prizeA: C("6821235152b886261fff99fe01905e40e7f513cdf87f57fb257fbb47d67a565b"), prizeB: C("1db3369ae5651b0713ea11b828a365bd4efac29c4315df2ff6be34723cdea778"), // Tripo v3, Nov 12
  neon: C("8eeb18c99bfd4d8d7eeab25ae7d204179f7de76980db3dfea83cda5bdff30c03"),
};
const E = -90, W = 90, N = 0, S = 180; // yaw that turns a prop's front to face east / west / north / south
const WX = -41.8, NZ = -11.8, SZ = 11.8; // inner faces of the shop's wall linings
const CREAM = "oklch(0.8 0.05 75)", TEAL = "oklch(0.52 0.09 200)";
export function layShop(ctx) {
  const UP = 4; // the shop stands on the mezzanine (ZONES.mezz.y)
  const sp = (id, spec) => ctx.spawn("l31-shop-" + id, { ...spec, feetPosition: { ...spec.feetPosition, y: (spec.feetPosition?.y ?? 0) + UP } });
  const wall = (id, x, y, z, w, h, d, color) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material: color === CREAM ? { texture: "cdn/texture-painted-cinder-block-wall-cream.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.9 0.03 75)", roughness: 0.9 } : { color, roughness: 0.85 }, physics: "static" });
  const prop = (id, m, x, y, z, yaw, solid = true, extra = {}) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: M[m], forward: "+z" }, ...(solid ? { physics: { body: "static", collider: "box" } } : {}), ...extra });
  // the blueprint's spot becomes the shop's vinyl floor
  sp("bp", { feetPosition: { x: -35, y: 0, z: 0 }, primitive: { kind: "box", width: 13.7, height: 0.012, depth: 23.7 }, material: { texture: "cdn/texture-speckled-vct-vinyl-floor-tile-warm-grey.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.86 0.02 60)", roughness: 0.55 } });
  // linings on the three walls, teal wainscot under cream
  wall("wall-w", -41.9, 0, 0, 0.2, 4, 24, CREAM); wall("wall-n", -35, 0, -11.9, 13.6, 4, 0.2, CREAM); wall("wall-s", -35, 0, 11.9, 13.6, 4, 0.2, CREAM);
  wall("base-n", -35, 0, -11.79, 13.6, 0.9, 0.03, TEAL); wall("base-s", -35, 0, 11.79, 13.6, 0.9, 0.03, TEAL);
  // shopfront: two stubs and a header over a 14 m opening
  // shopfront stubs: four Tripo teal-and-chrome memphis pilasters each (file 0.29 x 1 x 0.48 m), a hidden box per stub for collision
  for (const [k, z0] of [["n", -9.5], ["s", 9.5]]) {
    sp("front-" + k, { feetPosition: { x: -28.125, y: 0, z: z0 }, primitive: { kind: "box", width: 0.25, height: 2.8, depth: 5 }, render: false, physics: "static",
      children: [0, 1, 2, 3].map((i) => ({ id: "p" + i, feetPosition: { x: 0, y: 0, z: (i - 1.5) * 1.25 }, model: "/cdn/value.8faca840ae55cd7013f7d9933f73bf8da283dabe7217ff98753b8c4752aeb954.glb", scale: { x: 1.05, y: 2.8, z: 2.6 } })) });
  } wall("header", -28.125, 2.8, 0, 0.25, 1.2, 24, "oklch(0.3 0.05 200)");
  prop("neon", "neon", -27.96, 2.9, 0, E, false);
  // west wall: slatwall behind the counter, tees to the north, plush and CDs to the south
  prop("tees-w", "tees", WX + 0.049, 0.85, -7, E, false); prop("tees-n", "tees", -36, 0.85, NZ + 0.049, S, false);
  prop("plush", "plush", WX + 0.21, 0, 5.2, E); prop("plush-2", "plush", WX + 0.21, 0, 6.9, E);
  prop("cds-a", "cds", WX + 0.13, 0, 8.3, E); prop("cds-b", "cds", WX + 0.13, 0, 8.72, E);
  // the L counter: one case facing the aisle, one turned south, goods on the glass
  // the checkout: one Tripo memphis counter (file 0.70 x 0.80 x 0.99 m, long side along z) at x1.35 = 1.08 m tall, 1.33 m long
  const tr = (id, m, x, y, z, yaw, sc, solid = true) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: M[m], scale: sc, ...(solid ? { physics: { body: "static", collider: "box" } } : {}) });
  // ticket prize walls (Tripo, from Shelly's prize-wall photo): file ~0.25 x 0.75 x 1.0 m, long side along z, x3.2 = 2.4 m tall, 3.2 m long
  const prize = (id, m, z, sc) => sp(id, { feetPosition: { x: WX + 0.42, y: 0, z }, rotation: { yaw: 0 }, model: M[m], scale: sc });
  // live bounds at x1: A 1.82 m tall x 2.48 long, B 2.13 x 2.75 -> both ~2.4 m tall
  prize("prize-a", "prizeA", -1.75, 1.32); prize("prize-b", "prizeB", 1.75, 1.13);
  tr("counter", "counter", -38.45, 0, -0.1, 0, 1.12); /* Shelly Nov 13 "the counter is too big": x1.12 = 0.90 m tall, 1.11 m long */ tr("case-side", "case", -39.3, 0, 1.25, S, 1);
  // two stocked gift gondolas down the middle (file 0.91 x 1.0 x 0.94 m) at x1.55 = 1.55 m tall, eye level for a 1.7 m player
  const gon = (id, z) => sp(id, { feetPosition: { x: -34.2, y: 0, z }, rotation: { yaw: E }, model: M.gondola2, scale: 2.25, /* file 0.90 x 0.71 x 0.43 m read live -> 2.0 x 1.6 x 0.97 m */ physics: { body: "static", collider: "box" } });
  gon("gondola-n", -4.2); gon("gondola-s", 4.2);
  // skate walls on the south wall (file 0.24 x 0.97 x 1.0 m, faces along x) at x1.9 = 1.83 m tall, hung 0.35 m up
  tr("skates-a", "skatewall", -35.6, 0.35, SZ - 0.25, 90, 1.9, false); tr("skates-b", "skatewall", -33.3, 0.35, SZ - 0.25, 90, 1.9, false);
  prop("spinner", "spinner", -30.6, 0, 6.2, 20); prop("spinner-2", "spinner", -30.6, 0, -6.2, -25); prop("fridge", "fridge", -39.2, 0, SZ - 0.34, N);
  // by the entrance, on the aisle side of the south stub
  prop("stickers", "stickers", -27.79, 0, 9.3, E); prop("gumball", "gumball", -27.78, 0, 8.3, E);
  // a taped note by the fridge
  sp("note", { feetPosition: { x: -38.4, y: 1.5, z: SZ - 0.006 }, rotation: { yaw: N, roll: -3 }, vector: "<svg viewBox='0 0 100 70' width='0.3m'><rect x='2' y='4' width='96' height='64' fill='#f6f1dc'/><rect x='36' y='0' width='28' height='9' fill='#e8d9a0' opacity='0.8'/><text x='50' y='30' text-anchor='middle' font-family='serif' font-style='italic' font-size='15' fill='#223a8a'>door sticks</text><text x='50' y='52' text-anchor='middle' font-family='serif' font-style='italic' font-size='15' fill='#223a8a'>pull hard</text></svg>" });
  // light: warm over the counter, pink north, cyan south, a pink wash under the sign
  const lamp = (id, x, y, z, color, intensity, distance) => sp(id, { feetPosition: { x, y, z }, light: { kind: "point", color, intensity, distance } });
  lamp("light-counter", -37, 3.4, 0, "oklch(0.92 0.07 80)", 1.4, 12); lamp("light-mid", -33, 3.4, 0, "oklch(0.9 0.06 80)", 0.9, 10); lamp("light-n", -36, 3.2, -8, "oklch(0.8 0.13 350)", 1, 10);
  lamp("light-s", -36, 3.2, 8, "oklch(0.85 0.1 210)", 1, 10); lamp("light-sign", -26.6, 3.4, 0, "oklch(0.75 0.2 350)", 0.7, 7);
  // Dottie, a faceling, behind the counter
  sp("keeper", {
    tags: ["npc", "faceling"], feetPosition: { x: -39.5, y: 0, z: -0.1 }, rotation: { yaw: E }, physics: "character",
    ...critterSpec(npcLook("l31-shop-keeper", { species: "faceling", sex: "f", topw: "tee", top: "#f06aa8", botw: "pants", bottom: "#2b2b33", shoes: "sneakers" }, "trader", 31)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name: "Dottie · Gift Counter", role: "trader", voice: "l31-shop-keeper#f", faction: "rink", factionName: "the gift counter at the Roller Rink", docile: true, home: { x: -39.5, z: -0.1 }, line: "Everything in the case is from home.", ...npcState(ctx, "trader", 100) },
  });
}
