// The green house, inside (Shelly: "give it a new interior worldspace when entering"). Living room front, bedroom back, kitchen nook.
export const cadence = "1s";
const V = 18;
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
  kitchen: "/cdn/value.9caf2cbe22f44c137564612f993d6658276fc78b2bc181a2ad9d9355fd71aeed.glb",
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
  fit("h-rug", M.rug, -2.4, 1.6, 0, [2.6, 0.02, 1.9], { physics: undefined });
  fit("h-sofa", M.sofa, -2.4, 3.3, 90, [1.2, 1.15, 2.05]); // tripo: tan rolled-arm sofa, plaid pillows, back to the west wall facing the TV
  fit("h-recliner", M.recliner, -4.2, 1.4, -60, [0.95, 1.05, 0.95]); // tripo: leather recliner angled at the TV
  fit("h-tv", M.tv, -2.4, -0.5, 270, [0.72, 1.12, 1.1]); // tripo: silver CRT on a black glass stand, DVD and VCR on the shelves
  sp("h-tv-screen", { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "tv", name: "TV", verb: "Change channel", ch: 0 }, physics: { body: "static", collider: "box" }, feetPosition: { x: -2.4, y: 0.915, z: -0.215 }, rotation: { yaw: 180 }, primitive: { kind: "plane", width: 0.66, height: 0.45 }, material: { texture: "/cdn/value.e12ab4672a2ccf5ac1309d6f656dfa64bf207aa5ae73dfadd76b7b1eb2b10023.mp4", emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.2 }, castShadow: false }); // archive.org: Disney Channel commercial breaks, Oct 18 2002, looping
  sp("h-tv-sound", { feetPosition: { x: -2.4, y: 0.9, z: -0.2 }, audio: { clip: "/cdn/value.a1e84936f3b37819bf6f8106656aa51133a932e421d4d2e67298fb0577c9d9fa.mp3", loop: true, gain: 0.35, spatial: true, maxDistance: 12, bus: "Ambience" } });
  sp("h-tv-glow", { feetPosition: { x: -2.4, y: 0.9, z: 0.2 }, light: { kind: "point", color: "oklch(0.8 0.06 240)", intensity: 0.5, distance: 4 } });
  fit("h-table", M.table, -2.4, 1.7, 90, [0.8, 0.5, 1.02]); // tripo: oak coffee table, remote and a magazine on it
  fit("h-shelf", M.bookshelf, -4.6, 4.2, 90, [1.6, 2.0, 0.4]);
  fit("h-lamp-1", M.lamp, -3.75, 3.6, 0, [0.5, 1.6, 0.5]);
  fit("h-kitchen", M.kitchen, 4.5, 3.4, 90, [0.95, 0.92, 1.0]); // tripo: honey oak sink base, brass knobs, beige laminate top, against the east wall
  sp("h-light-living", { feetPosition: { x: 0, y: 2.6, z: 2.5 }, light: { kind: "point", color: "oklch(0.92 0.07 75)", intensity: 2.2, distance: 9 } });

  // bedroom: the bed is where you rest
  fit("h-bed", M.bed, -2.8, -4.7, 0, [1.65, 1.1, 2.1], { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "bed", name: "Your Bed", verb: "Sleep" } });
  fit("h-dresser", M.dresser, 3.6, -5.55, 90, [0.45, 1.6, 0.95]); // tripo: oak dresser with arched mirror
  const poster = (id, tex, x, y, z, yaw) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "plane", width: 0.6, height: 0.8 }, material: { texture: tex, roughness: 0.7 }, castShadow: false }); // tacked-up 2000s posters
  poster("h-poster-sponge", "/cdn/value.d6647818cc1864e1a57ae459da01d37274878ab52fa91397bc0bbf8f3b07b94b.png", -4.93, 1.2, -1.9, 90);
  poster("h-poster-kitty", "/cdn/value.5b3fa0a1b106e04b6db787f988eda22e31496b76d9b76c508f5041e6c2192afa.png", 1.4, 1.2, -5.93, 0);
  const hang = (id, model, x, y, z, yaw, size) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } } }); // tripo pieces off the floor: no collider
  hang("h-fan", "/cdn/value.fe9b7013b5254e87f285b50c7bfaa2c091275f57b5479249698a7535f2894259.glb", -2.4, 2.05, 1.7, 0, [1.15, 0.8, 1.15]); // brass ceiling fan with an alabaster bowl light
  hang("h-curtains", "/cdn/value.970a63a9bb4e3d521cd133a1ec921f884ac24ea444813ecfd0981b2fa3d37ec3.glb", -4.82, 0.75, -3.5, 0, [0.3, 1.5, 1.6]); // white mini-blinds and burgundy curtains over the bedroom window
  hang("h-photos", "/cdn/value.572ad0fe124cdd180aec4d28d259719e1057e02d8cc6c54b996c7b22ada303e7.glb", -4.88, 1.35, 4.2, 0, [0.12, 0.6, 0.55]); // family photos and a wall clock by the front of the living room
  fit("h-plant", "/cdn/value.5c55541c98397f0fd38ea7e850e3e15e4fd78fd4a5951439cde327b41abe9e09.glb", -4.3, 5.3, 0, [0.6, 0.85, 0.6]); // pothos on a wicker stand in the corner
  hang("h-wii", "/cdn/value.45d3abcae444b2dc2d981a3a199513b6d2eca018818ad98ff4aaf0a799b7d642.glb", -1.65, 0.1, -0.6, 270, [0.35, 0.32, 0.3]); // white wii, sensor bar and two wiimotes beside the TV stand
  hang("h-kitty", "/cdn/value.a9f9d3c6172c17966216abe7310be269dde6da0bf1b828779638c4c7152f6575.glb", -2.3, 0.62, -5.2, 160, [0.3, 0.32, 0.26]); // hello kitty plush propped on the pillows
  hang("h-boombox", "/cdn/value.b65239e4484936755ff171a40f1ea0104ad73cf5d0d2b21261bab60345e000f9.glb", -1.5, 0.1, -5.6, 180, [0.5, 0.36, 0.2]); // pink CD boombox by the bed
  fit("h-pcdesk", "/cdn/value.c19a3a1207063b8231b343d67d98657a158515407d7c01b6c2286a1bd2d5c18c.glb", 1.2, -5.25, 180, [1.3, 1.35, 1.2]); // beige tower, CRT monitor and swivel chair against the north wall
  hang("h-sponge", "/cdn/value.584040f232cb11ac6bd83395b7bb8d36daf263e276a0a8745ae05e6ae1526e54.glb", 3.25, 0.93, -5.42, 20, [0.24, 0.3, 0.16]); // spongebob plush on the dresser top
  hang("h-coke1", "/cdn/value.8dbfe9caef376c3d74354e97aa627d7a842fdc981ef4f60ddfd2c24d34aea0fd.glb", 1.65, 0.86, -5.45, 0, [0.066, 0.12, 0.066]); // coke can by the keyboard
  hang("h-coke2", "/cdn/value.8dbfe9caef376c3d74354e97aa627d7a842fdc981ef4f60ddfd2c24d34aea0fd.glb", -1.62, 0.46, -5.62, 40, [0.066, 0.12, 0.066]); // another on the boombox
  fit("h-lamp-2", M.lamp, -0.9, -5.5, 0, [0.4, 1.2, 0.4]);
  sp("h-light-bed", { feetPosition: { x: -1, y: 2.5, z: -3.5 }, light: { kind: "point", color: "oklch(0.85 0.08 65)", intensity: 1.4, distance: 7 } });
  sp("h-window", { feetPosition: { x: -4.9, y: 1.0, z: -3.5 }, primitive: { kind: "box", width: 0.05, height: 1.1, depth: 1.4 }, material: { color: "oklch(0.95 0.04 85)", emissive: "#fff1d0", emissiveIntensity: 1.2 } });
  sp("h-hum", { feetPosition: { x: 3.7, y: 1, z: 4.4 }, audio: { clip: "cdn/sfx-old-refrigerator-compressor-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  st.builtV = V;
}
