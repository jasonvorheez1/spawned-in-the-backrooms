import { builtSpec } from "../../scripts/lib/build-piece.js";
// The green house, inside (Shelly: "give it a new interior worldspace when entering"). Living room front, bedroom back, kitchen nook.
export const cadence = "1s";
const V = 41;
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
  const owner = ctx.place.players.find((p) => p.state?.home11 && typeof p.state.homeFridge === "string");
  const fr = ctx.place.objects["h-fridge"];
  const homeOwner = ctx.place.players.find((p) => p.state?.home11);
  if (homeOwner && st.keepFor !== homeOwner.userId) { // this house wears its owner's own save: the tote's contents and where they set things
    const k = homeOwner.state.homeKeep ?? {};
    st.packed = k.packed ?? {}; st.moved = k.moved ?? {}; st.keepFor = homeOwner.userId; st.builtV = 0;
  }
  if (st.builtV === V) { if (fr && owner && !fr.state.loaded) { fr.state.items = owner.state.homeFridge; fr.state.loaded = true; } return; } // the owner's saved fridge fills it once they're home
  const fridgeKeep = ctx.place.objects["h-fridge"]?.state?.items; // what you stored survives a rebuild
  const packed = st.packed ?? {}, moved = st.moved ?? {}; // the tote's contents and where you set things down: kept in this home's own state
  const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); if (packed[id]) return; const m = moved[id]; ctx.spawn(id, m ? { ...spec, feetPosition: m.p, rotation: { yaw: m.yaw } } : spec); };
  const bx = (id, x, y, z, w, h, d, material, extra = {}) => sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const fit = (id, model, x, z, yaw, size, extra = {}) => sp(id, { feetPosition: { x, y: 0.1, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, physics: { body: "static", collider: "box" }, ...extra });

  { // what the owner built here in B mode (scripts/build.js saves it to their homeKeep.built), back where they put it
    const built = homeOwner?.state?.homeKeep?.built ?? {};
    for (const o of Object.values(ctx.place.objects)) if (o.id?.startsWith?.("hb-") && !built[o.id]) ctx.destroy(o.id);
    for (const [id, b] of Object.entries(built)) { const spec = builtSpec(b.kind, b, homeOwner.id, { byUser: homeOwner.userId, id, owner: homeOwner.state }); if (!spec) continue; if (ctx.place.objects[id]) ctx.destroy(id); ctx.spawn(id, spec); }
  }
  const use = (kind, name, verb, extra = {}) => ({ tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind, name, verb, ...extra } });
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
  // the hallway (Shelly: "add a hallway"): z -1..-2.6, living room doorway in the middle, bedroom door at the west end, bath door at the east
  const HZ = -2.6;
  bx("h-hall-wall-l", -4.75, 0, HZ, 0.5, H, 0.12, PAPER);
  bx("h-hall-wall-r", -0.175, 0, HZ, 6.65, H, 0.12, PAPER);
  bx("h-hall-wall-r2", 4.525, 0, HZ, 0.95, H, 0.12, PAPER);
  bx("h-hall-wall-top2", 3.6, 2.1, HZ, 0.9, H - 2.1, 0.12, PAPER);
  bx("h-hall-wall-top", -4.0, 2.1, HZ, 1.0, H - 2.1, 0.12, PAPER);
  for (const [id, x, w] of [["h-case-l", -4.52, 0.05], ["h-case-r", -3.48, 0.05]]) bx(id, x, 0, HZ, w, 2.12, 0.16, TRIM, { physics: "none" }); // bedroom door casing
  bx("h-case-top", -4.0, 2.08, HZ, 1.1, 0.06, 0.16, TRIM, { physics: "none" });
  for (const [id, z] of [["h-base-hall-s", HZ + 0.07], ["h-base-hall-n", HZ - 0.07]]) bx(id, 0.75, 0.05, z, 8.5, 0.12, 0.02, TRIM, { physics: "none" });
  bx("h-hall-runner", -0.4, 0.112, -1.8, 7.6, 0.01, 0.9, { color: "oklch(0.42 0.09 30)", roughness: 0.95 }, { physics: "none" }); // a worn burgundy runner down the hall
  bx("h-bed-wall-e", 2.2, 0, -4.3, 0.12, H, 3.4, PAPER); // the bedroom's east wall; the bathroom sits behind it
  bx("h-base-bed-e", 2.13, 0.05, -4.3, 0.02, 0.12, 3.4, TRIM, { physics: "none" });
  // the bathroom (Shelly: "give this door a room too"): x 2.2..5, z -2.6..-6
  for (const id of ["h-bath-knob", "h-faucet", "h-shower-curtain", "h-shower-rod", "h-toilet-bowl", "h-toilet-lid", "h-toilet-seat", "h-toilet-tank", "h-tub-skirt", "h-tub-water-line", "h-towel"]) if (ctx.place.objects[id]) ctx.destroy(id); // old block fixtures under the tripo pieces, and a second knob on the bath door
  const BY = 0.1, TILE = T("white-square-ceramic-bathroom-floor-tile", 0.6, "oklch(0.95 0.01 90)"), PORC = { color: "oklch(0.97 0.006 95)", roughness: 0.25 }, CHROME = { color: "oklch(0.85 0.01 250)", metalness: 0.9, roughness: 0.2 };
  // hinged doors (Shelly: "make openable and closeable doors"): a kinematic hinge at the jamb, the leaf its child; E on the leaf swings the hinge
  // the leaf child is scripts/door-geo.js: its origin IS the hinge (the root's feet), running toward dir; the frame stands at the opening's centre
  const swing = (id, hx, hz, dir, w, open, name) => {
    const dp = { style: "wood", w, h: 2.05, hingeSide: dir > 0 ? "left" : "right", swing: open * dir > 0 ? -1 : 1, d: 0.12, seed: id.length };
    sp(id, { feetPosition: { x: hx, y: 0.05, z: hz }, rotation: { yaw: 0 }, physics: "kinematic", tags: ["usable"], behavior: "scripts/home11-door.js", state: { open: false, openYaw: open, kind: "door", name, verb: "Open", hinge: id }, // the leaf's collider joins this root, so a look at the door lands here

      children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: { kind: "door", name, verb: "Open", hinge: id } }] });
    sp(id + "-frame", { feetPosition: { x: hx + dir * w / 2, y: 0.05, z: hz }, rotation: { yaw: 0 }, physics: { body: "static", collider: "auto" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "frame" } }, material: { pbr: true } });
  };
  swing("h-bed-door", -3.5, HZ, -1, 0.98, -95, "Bedroom Door");
  swing("h-bath-door", 3.15, HZ, 1, 0.88, 95, "Bathroom Door");
  fit("h-tote", "/cdn/value.4217a4d0fbbdf5acae70d131990e12dfa9c8a5a692a2643c6ef67c5bac4ea413.glb", -1.6, -3.3, 15, [0.6, 0.5, 0.45], { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "tote", name: "Storage Tote", verb: "Take out" } }); // tripo: blue-lid tote at the foot of the bed
  bx("h-bath-floor", 3.6, BY, -4.3, 2.7, 0.015, 3.3, TILE, { physics: "none" });
  bx("h-bath-tile-wall", 3.6, BY, -5.9, 2.7, 1.2, 0.03, TILE, { physics: "none" }); // tiled wainscot behind the tub
  const TUB = "/cdn/value.41d0f172f22f0963c0cdb6b958c4a3e95e6b3aa065b3c91c096683efc4c87a4b.glb", LOO = "/cdn/value.28601a408e0ea5cc0d4ad5e63b60d0044db81cc693682addc38ae0e75b28cea5.glb", VAN = "/cdn/value.a30ff86587854900fffcfd845866aa93ccabcb94e10e503cb75a73dcc64bac6f.glb";
  fit("h-tub", TUB, 3.7, -5.4, 0, [1.75, 1.0, 0.85], use("tub", "Bathtub", "Run it hottest")); sp("h-from-l27", { feetPosition: { x: 3.7, y: 0.1, z: -4.2 }, rotation: { yaw: 0 } }); // Level 27: the tap at its hottest, eyes closed // tripo: porcelain soaking tub with a gooseneck tap, along the tiled north wall
  fit("h-toilet", LOO, 4.6, -3.9, 270, [0.45, 0.8, 0.7]); // tripo: two-piece toilet, lid down, facing the room
  fit("h-vanity", VAN, 2.55, -3.6, 90, [0.95, 0.9, 0.55]); // tripo: oak vanity, cultured-marble top and sink, under the mirror
  sp("h-mirror", { feetPosition: { x: 2.27, y: 1.1, z: -3.6 }, primitive: { kind: "box", width: 0.02, height: 0.8, depth: 0.7 }, material: { color: "oklch(0.92 0.01 230)", metalness: 1, roughness: 0.05 } });
  sp("h-vanity-bar", { feetPosition: { x: 2.3, y: 1.95, z: -3.6 }, primitive: { kind: "box", width: 0.08, height: 0.1, depth: 0.75 }, material: { color: "oklch(0.97 0.03 90)", emissive: "oklch(0.95 0.05 85)", emissiveIntensity: 1 }, light: { kind: "point", color: "oklch(0.9 0.06 80)", intensity: 1.2, distance: 5 } });
  sp("h-towel", { feetPosition: { x: 4.88, y: 0.85, z: -4.8 }, rotation: { yaw: 270 }, model: { id: "/cdn/value.e91dbe5d0f3513c532c9d868514bf97938bb8b3178451df26274996f7495eb31.glb" }, layout: { box: { min: { x: -0.6 / 2, y: 0, z: -0.16 / 2 }, max: { x: 0.6 / 2, y: 0.62, z: 0.16 / 2 } } } }); // tripo: seafoam towel over a chrome bar on the east wall
  sp("h-curtain", { feetPosition: { x: 4.0, y: 0.45, z: -4.98 }, rotation: { yaw: 0 }, model: { id: "/cdn/value.d86ecf170b9702b0d9fed4701b6ed8e3a4ba112783ec2d3037af9acfc48b403a.glb" }, layout: { box: { min: { x: -1.25 / 2, y: 0, z: -0.14 / 2 }, max: { x: 1.25 / 2, y: 1.75, z: 0.14 / 2 } } } }); // tripo: wave-print vinyl curtain on a curved chrome rod, half drawn over the tub
  sp("h-light-hall", { feetPosition: { x: -1.2, y: 2.55, z: -1.8 }, primitive: { kind: "cylinder", radiusTop: 0.17, radiusBottom: 0.12, height: 0.12 }, material: { color: "oklch(0.97 0.02 90)", emissive: "oklch(0.9 0.05 85)", emissiveIntensity: 0.6 }, light: { kind: "point", color: "oklch(0.88 0.07 70)", intensity: 1.0, distance: 6 } }); // frosted flush-mount dome
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
  fit("h-lamp-1", M.lamp, -3.75, 3.6, 0, [0.5, 1.6, 0.5], use("lamp", "Floor Lamp", "Switch", { light: "h-lamp-1-light", int: 0.9 }));
  fit("h-kitchen", M.kitchen, 4.5, 3.4, 90, [0.95, 0.92, 1.0]); // tripo: honey oak sink base, brass knobs, beige laminate top, against the east wall
  sp("h-light-living", { feetPosition: { x: 0, y: 2.6, z: 2.5 }, light: { kind: "point", color: "oklch(0.92 0.07 75)", intensity: 2.2, distance: 9 } });

  // bedroom: the bed is where you rest
  fit("h-bed", M.bed, -2.8, -4.7, 0, [1.65, 1.1, 2.1], { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "bed", name: "Your Bed", verb: "Sleep" } });
  fit("h-dresser", M.dresser, -0.8, -2.9, 270, [0.45, 1.6, 0.95]); // tripo: oak dresser with arched mirror
  const poster = (id, tex, x, y, z, yaw, w = 0.6, ht = 0.8) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, primitive: { kind: "plane", width: w, height: ht }, material: { texture: tex, roughness: 0.7, side: "double" }, castShadow: false }); // tacked-up 2000s posters
  poster("h-poster-sponge", "/cdn/value.d6647818cc1864e1a57ae459da01d37274878ab52fa91397bc0bbf8f3b07b94b.png", -4.93, 1.2, -1.9, 90);
  poster("h-poster-shrek2", "/cdn/image-u81jyu5u5.webp", -4.89, 0.95, 3.0, 90, 0.72, 1.07); // Shelly's Shrek 2 one-sheet, living room
  poster("h-poster-pika", "/cdn/value.70e29ede116e97ae449b47d1c7365397318d37affe52789dcbbdfcf72a654c5c.png", -0.5, 1.1, -5.89, 0); // Pokemon, bedroom
  poster("h-calendar", "/cdn/value.ecf1cb61cb71e7905bd7a69c33c76ed9569c3b22dfdd90550b8b8914beb50f2c.png", 4.89, 1.15, 4.6, -90); // March 2004, kitchen
  poster("h-poster-kitty", "/cdn/value.5b3fa0a1b106e04b6db787f988eda22e31496b76d9b76c508f5041e6c2192afa.png", 1.4, 1.2, -5.89, 0);
  const nice = (id) => id.replace(/^h-/, "").replace(/-\d+$/, "").replace(/-/g, " ");
  const hang = (id, model, x, y, z, yaw, size) => sp(id, { tags: ["homeprop"], state: { name: nice(id) }, physics: { body: "static", collider: "box" }, feetPosition: { x, y, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } } }); // tripo pieces off the floor: no collider
  hang("h-fan", "/cdn/value.fe9b7013b5254e87f285b50c7bfaa2c091275f57b5479249698a7535f2894259.glb", -2.4, 2.05, 1.7, 0, [1.15, 0.8, 1.15]); // brass ceiling fan with an alabaster bowl light
  hang("h-curtains", "/cdn/value.970a63a9bb4e3d521cd133a1ec921f884ac24ea444813ecfd0981b2fa3d37ec3.glb", -4.82, 0.75, -3.5, 0, [0.3, 1.5, 1.6]); // white mini-blinds and burgundy curtains over the bedroom window
  hang("h-photos", "/cdn/value.572ad0fe124cdd180aec4d28d259719e1057e02d8cc6c54b996c7b22ada303e7.glb", -4.88, 1.35, 4.2, 0, [0.12, 0.6, 0.55]); // family photos and a wall clock by the front of the living room
  fit("h-plant", "/cdn/value.5c55541c98397f0fd38ea7e850e3e15e4fd78fd4a5951439cde327b41abe9e09.glb", -4.3, 5.3, 0, [0.6, 0.85, 0.6]); // pothos on a wicker stand in the corner
  hang("h-wii", "/cdn/value.45d3abcae444b2dc2d981a3a199513b6d2eca018818ad98ff4aaf0a799b7d642.glb", -1.65, 0.1, -0.6, 270, [0.35, 0.32, 0.3]); // white wii, sensor bar and two wiimotes beside the TV stand
  hang("h-kitty", "/cdn/value.a9f9d3c6172c17966216abe7310be269dde6da0bf1b828779638c4c7152f6575.glb", -2.3, 0.62, -5.2, 160, [0.3, 0.32, 0.26]); // hello kitty plush propped on the pillows
  hang("h-boombox", "/cdn/value.b65239e4484936755ff171a40f1ea0104ad73cf5d0d2b21261bab60345e000f9.glb", -1.5, 0.1, -5.6, 90, [0.2, 0.36, 0.5]); sp("h-boombox-use", { tags: ["usable"], behavior: "scripts/home11-door.js", state: { kind: "boombox", name: "Boombox", verb: "Change station" }, feetPosition: { x: -1.5, y: 0.1, z: -5.6 }, primitive: { kind: "box", width: 0.52, height: 0.38, depth: 0.24 }, material: { opacity: 0, transparent: true } }); // pink CD boombox by the bed
  fit("h-pcdesk", "/cdn/value.c19a3a1207063b8231b343d67d98657a158515407d7c01b6c2286a1bd2d5c18c.glb", 1.2, -5.25, 180, [1.3, 1.35, 1.2]); // beige tower, CRT monitor and swivel chair against the north wall
  hang("h-sponge", "/cdn/value.584040f232cb11ac6bd83395b7bb8d36daf263e276a0a8745ae05e6ae1526e54.glb", -0.45, 0.93, -3.03, 200, [0.24, 0.3, 0.16]); // spongebob plush on the dresser top
  hang("h-coke1", "/cdn/value.8dbfe9caef376c3d74354e97aa627d7a842fdc981ef4f60ddfd2c24d34aea0fd.glb", 1.75, 0.86, -5.0, 0, [0.066, 0.12, 0.066]); // coke can by the keyboard
  hang("h-coke2", "/cdn/value.8dbfe9caef376c3d74354e97aa627d7a842fdc981ef4f60ddfd2c24d34aea0fd.glb", -1.62, 0.46, -5.62, 40, [0.066, 0.12, 0.066]); // another on the boombox
  fit("h-lamp-2", M.lamp, -0.9, -5.5, 0, [0.4, 1.2, 0.4], use("lamp", "Lamp", "Switch", { light: "h-lamp-2-light", int: 0.8 }));
  sp("h-light-bed", { feetPosition: { x: -1, y: 2.5, z: -4.3 }, light: { kind: "point", color: "oklch(0.85 0.08 65)", intensity: 1.4, distance: 7 } });
  // things to use (Shelly: "add interactibles")
  fit("h-fridge", "/cdn/value.d0d0dc823edfbfe08bea35729295b7b5dd01a2864bcd7c46d08a7d8599993e53.glb", 4.5, 1.55, 270, [0.75, 1.75, 0.75], { tags: ["container", "storage"], state: { name: "Fridge", cap: 30, saveKey: "homeFridge", loaded: !!owner, items: owner ? owner.state.homeFridge : (fridgeKeep ?? "coke,snapple,almond:grey,pizza") } }); // almond two-door, magnets and papers
  hang("h-micro", "/cdn/value.1d3dc84f3f95564053f8162e486d92ab5dfd9678eb26b82aed879a7371f33bea.glb", 4.45, 0.9, 3.4, 270, [0.36, 0.28, 0.5]); sp("h-micro-use", { ...use("microwave", "Microwave", "Heat your food"), feetPosition: { x: 4.45, y: 0.9, z: 3.4 }, primitive: { kind: "box", width: 0.36, height: 0.28, depth: 0.5 }, material: { opacity: 0, transparent: true }, physics: { body: "static", collider: "box" } });
  hang("h-lava", "/cdn/value.8413072e1fc1e8e8482a7d553210352afec9f63c4aca06ab7775be80044401c7.glb", 1.7, 0.86, -5.6, 0, [0.13, 0.42, 0.13]); // red lava lamp on the desk
  sp("h-lava-light", { feetPosition: { x: 1.7, y: 1.1, z: -5.45 }, light: { kind: "point", color: "oklch(0.65 0.22 25)", intensity: 0.6, distance: 2.5 } });
  sp("h-lava-use", { ...use("lamp", "Lava Lamp", "Switch", { light: "h-lava-light", int: 0.6 }), feetPosition: { x: 1.7, y: 0.86, z: -5.6 }, primitive: { kind: "box", width: 0.16, height: 0.44, depth: 0.16 }, material: { opacity: 0, transparent: true }, physics: { body: "static", collider: "box" } });
  hang("h-ipod", "/cdn/value.d4492ec79dc96b8f287d8aad99b6b5ea0866070d9e08500ba2b9bf5d30e73875.glb", -1.0, 0.93, -3.03, 180, [0.1, 0.15, 0.1]); // white iPod on its dock, dresser top
  hang("h-razr", "/cdn/value.726b4ce1eb3fc52d4e35252d822b6f420f37c4c28ce628366a59b8cb7449f3e8.glb", -2.55, 0.62, -4.35, 30, [0.06, 0.1, 0.12]); sp("h-razr-use", { ...use("phone", "Razr", "Check texts"), feetPosition: { x: -2.55, y: 0.6, z: -4.35 }, primitive: { kind: "box", width: 0.2, height: 0.12, depth: 0.2 }, material: { opacity: 0, transparent: true } });
  hang("h-dvds", "/cdn/value.854240d4e72d45668e1d95134e4600a44ca99ac98485d362c0b6c023f2f128b6.glb", -3.25, 0.1, -0.55, 10, [0.2, 0.3, 0.15]); // DVD stack by the TV stand
  fit("h-blowup", "/cdn/value.afa0c785ed6f8de02e08eba83bb07a5b8b9afdb7a0cd08c5469c281133c00d57.glb", 1.4, -3.4, 200, [0.95, 0.75, 0.9]); // lime inflatable chair in the bedroom
  sp("h-lamp-1-light", { feetPosition: { x: -3.75, y: 1.55, z: 3.6 }, light: { kind: "point", color: "oklch(0.88 0.09 70)", intensity: 0.9, distance: 4 } });
  sp("h-lamp-2-light", { feetPosition: { x: -0.9, y: 1.15, z: -5.5 }, light: { kind: "point", color: "oklch(0.88 0.09 70)", intensity: 0.8, distance: 4 } });
  sp("h-window", { feetPosition: { x: -4.9, y: 1.0, z: -3.5 }, primitive: { kind: "box", width: 0.05, height: 1.1, depth: 1.4 }, material: { color: "oklch(0.95 0.04 85)", emissive: "#fff1d0", emissiveIntensity: 1.2 } });
  sp("h-hum", { feetPosition: { x: 3.7, y: 1, z: 4.4 }, audio: { clip: "cdn/sfx-old-refrigerator-compressor-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  st.builtV = V;
}
