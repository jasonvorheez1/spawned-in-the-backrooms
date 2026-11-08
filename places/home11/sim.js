// The green house, inside (Shelly: "give it a new interior worldspace when entering"). Living room front, bedroom back, kitchen nook.
export const cadence = "1s";
const V = 6;
const T = (name, rep, color) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat", color, roughness: 0.9 });
const FLOOR = T("worn-oak-floorboards", 0.6, "oklch(0.92 0.03 70)");
const CARPET = T("beige-berber-loop-carpet-slightly-worn", 0.7, "oklch(0.9 0.02 80)"); // 2000s wall-to-wall in the living room and bedroom
const VINYL = T("almond-checker-sheet-vinyl-kitchen-floor", 0.8, "oklch(0.95 0.01 85)");
const PAPER = T("eggshell-painted-drywall-light-orange-peel", 0.6, "oklch(0.93 0.025 85)"); // builder-beige paint
const BORDER = T("country-ivy-wallpaper-border-strip", 1, "oklch(0.95 0.02 110)");
const CEIL = T("white-popcorn-acoustic-ceiling-texture", 0.8, "oklch(0.96 0.005 90)");
const TRIM = { color: "oklch(0.9 0.02 85)", roughness: 0.6 };
const M = {
  bed: "/cdn/value.4c61843b2bcb94ee80364a2a654397ea5d979690794ce7e085addb70cfb31aae.glb",
  armchair: "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb",
  bookshelf: "/cdn/value.1eb5a4d0d74feb46ccccd20ebf5c2f0ea69a16afd52c50bb36f6566d9513bf46.glb",
  dresser: "/cdn/value.05e39c76bde213827151738e055d8ee1b7af522032767812cb1e662f75992599.glb",
  tv: "/cdn/value.b06d0c09b1cda983be988ee780d72e0a4105b28ed612b279c94d5cd545017813.glb",
  sofa: "/cdn/value.0feff3db97a7d03c96c612e304e76e62ee1a577e754a9073a4ca0d3ddfb2c023.glb",
  kitchen: "/cdn/value.a913b60b5860de57e7072069c2b3384708d80abc5c3df3ac13c9341b06c3e2fe.glb",
  lamp: "/cdn/value.0871d1626b929961d73cb28c05f82070ad822c5cc2e6b8deec5046248fb4086d.glb",
  rug: "/cdn/value.455dde0ca22a985f649dee005f80bad45966342485d248a0fa95d86fb0a2d2c3.glb",
  table: "/cdn/value.a749a8b797903df85e052391facf77d67915ec4b704e8f32b969e139f78b6719.glb",
  recliner: "/cdn/value.6ec1a2b9d968af70d73a7b98c25363a35ce9a32fb8df9cdca48104a25d629670.glb",
};
const W = 10, D = 12, H = 2.8; // room x -5..5, z -6..6; front door on the +z wall

export function tick(ctx) {
  const st = ctx.place.state;
  if (st.builtV === V) return;
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); ctx.spawn(id, spec); };
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const fit = (id, model, x, z, yaw, size, extra = {}) => sp(id, { feetPosition: { x, y: 0.1, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, physics: { body: "static", collider: "box" }, ...extra });

  bx("h-floor", 0, 0, 0, W, 0.1, D, FLOOR);
  bx("h-carpet-living", -0.7, 0.1, 2.5, W - 1.6, 0.012, 6.6, CARPET, { physics: "none" }); // carpet to the kitchen edge
  bx("h-vinyl-kitchen", 4.15, 0.1, 3.4, 1.6, 0.012, 4.6, VINYL, { physics: "none" });
  bx("h-carpet-bed", 0, 0.1, -3.5, W - 0.2, 0.012, 4.8, CARPET, { physics: "none" });
  for (const [id, x, z, w, d] of [["h-border-w", -4.9, 0, 0.03, D - 0.1], ["h-border-e", 4.9, 0, 0.03, D - 0.1], ["h-border-n", 0, -5.9, W - 0.1, 0.03], ["h-border-sl", -3, 5.9, 4, 0.03], ["h-border-sr", 3, 5.9, 4, 0.03]]) bx(id, x, 2.05, z, w, 0.18, d, BORDER, { physics: "none" }); // the wallpaper border at chair-rail-to-ceiling height
  bx("h-ceil", 0, H, 0, W, 0.1, D, CEIL);
  bx("h-wall-w", -W / 2, 0, 0, 0.15, H, D, PAPER);
  bx("h-wall-e", W / 2, 0, 0, 0.15, H, D, PAPER);
  bx("h-wall-n", 0, 0, -D / 2, W, H, 0.15, PAPER);
  bx("h-wall-s-l", -3, 0, D / 2, 4, H, 0.15, PAPER);
  bx("h-wall-s-r", 3, 0, D / 2, 4, H, 0.15, PAPER);
  bx("h-wall-s-top", 0, 2.2, D / 2, 2, H - 2.2, 0.15, PAPER);
  bx("h-wall-mid-l", -3.25, 0, -1, 3.5, H, 0.12, PAPER); // bedroom partition with a doorway
  bx("h-wall-mid-r", 3.25, 0, -1, 3.5, H, 0.12, PAPER);
  bx("h-wall-mid-top", 0, 2.1, -1, 3, H - 2.1, 0.12, PAPER);
  for (const [id, x, z, w, d] of [["h-base-w", -4.9, 0, 0.04, D], ["h-base-e", 4.9, 0, 0.04, D], ["h-base-n", 0, -5.9, W, 0.04]]) bx(id, x, 0.05, z, w, 0.12, d, TRIM, { physics: "none" });

  // the front door: back out to the porch
  sp("h-door", { tags: ["usable"], feetPosition: { x: 0, y: 0.05, z: 5.95 }, primitive: { kind: "box", width: 1.0, height: 2.1, depth: 0.08 }, material: { color: "oklch(0.32 0.08 25)", roughness: 0.6 }, physics: "static", behavior: "scripts/home11-door.js", state: { kind: "exit", name: "Front Door", verb: "Go outside" } });
  sp("h-knob", { feetPosition: { x: 0.38, y: 1.0, z: 5.88 }, primitive: { kind: "sphere", radius: 0.04 }, material: { color: "oklch(0.8 0.1 85)", metalness: 0.9, roughness: 0.3 } });
  sp("home-from-l11", { feetPosition: { x: 0, y: 0.1, z: 4.6 }, rotation: { yaw: 0 } });

  // living room
  fit("h-rug", M.rug, -1.6, 2.5, 90, [2.6, 0.02, 1.9], { physics: undefined });
  fit("h-sofa", M.sofa, -4.35, 2.5, 0, [1.2, 1.15, 2.05]); // tripo: tan rolled-arm sofa, plaid pillows, back to the west wall facing the TV
  fit("h-recliner", M.recliner, -2.3, 0.1, -35, [0.95, 1.05, 0.95]); // tripo: leather recliner angled at the TV
  fit("h-tv", M.tv, 2.7, 2.5, 180, [0.72, 1.12, 1.1]); // tripo: silver CRT on a black glass stand, DVD and VCR on the shelves
  fit("h-table", M.table, -2.6, 2.5, 0, [0.8, 0.5, 1.02]); // tripo: oak coffee table, remote and a magazine on it
  fit("h-shelf", M.bookshelf, -4.6, 4.2, 90, [1.6, 2.0, 0.4]);
  fit("h-lamp-1", M.lamp, 3.9, 0.3, 0, [0.5, 1.6, 0.5]);
  fit("h-kitchen", M.kitchen, 3.7, 4.4, -90, [2.6, 1.0, 0.7]);
  sp("h-light-living", { feetPosition: { x: 0, y: 2.6, z: 2.5 }, light: { kind: "point", color: "oklch(0.92 0.07 75)", intensity: 2.2, distance: 9 } });

  // bedroom: the bed is where you rest
  fit("h-bed", M.bed, -2.8, -4.7, 0, [1.65, 1.1, 2.1], { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "bed", name: "Your Bed", verb: "Sleep" } });
  fit("h-dresser", M.dresser, 3.6, -5.6, 0, [1.1, 1.75, 0.5]); // tripo: oak dresser with arched mirror
  fit("h-lamp-2", M.lamp, -0.9, -5.5, 0, [0.4, 1.2, 0.4]);
  sp("h-light-bed", { feetPosition: { x: -1, y: 2.5, z: -3.5 }, light: { kind: "point", color: "oklch(0.85 0.08 65)", intensity: 1.4, distance: 7 } });
  sp("h-window", { feetPosition: { x: -4.9, y: 1.0, z: -3.5 }, primitive: { kind: "box", width: 0.05, height: 1.1, depth: 1.4 }, material: { color: "oklch(0.95 0.04 85)", emissive: "#fff1d0", emissiveIntensity: 1.2 } });
  sp("h-hum", { feetPosition: { x: 3.7, y: 1, z: 4.4 }, audio: { clip: "cdn/sfx-old-refrigerator-compressor-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  st.builtV = V;
}
