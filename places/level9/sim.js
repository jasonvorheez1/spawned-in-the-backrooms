import { stealerModel } from "../../scripts/lib/stealer-body.js";
// Level 9 "The Suburbs": the referee. Rolls the room's seed once (place.state.l9seed: kept with everything looted here, so a reload
// finds the same streets and the same emptied drawers; another room rolls its own), lays the streets, houses and lamps from it,
// and runs the fog banks. Layout: scripts/lib/level9.js. House kit: scripts/lib/data/l9-houses.yml. Props: l9-props.yml.
import { rotate } from "builtin/vec3";
import { rollLoot } from "../../scripts/lib/loot.js";
import { npcState } from "../../scripts/lib/stats.js";
import FURN from "../../scripts/lib/data/furniture.yml";
import { layout, hashStr, HOUSES, PAINTS, PROPS, TUNE, FWD, ROAD_W, WALK } from "../../scripts/lib/level9.js";
export const cadence = "1s";
const V = 19; // 19: houses pick one of four TVs (Shelly Nov 14); 18: motel-pack variants furnish about a third of houses (Shelly Nov 14); 17: 17: lit houses (lot.lit) get the window lamp and a porch bulb, a third of doors locked; // 16: 16: per-house interior styles (paper, floor, rug, layout, ransacked) and picklable front doors; // 14: dining set split into table + chairs, dresser + kitchen cabinet, only storage is searchable; // 3: Tripo house models on the lots; 6: plaster insides; 7: wallpaper box-mapped, a bedroom wall, furniture and loot inside; 5 (4 hung them on the back): door holes cut, a hinged front door and a stoop on each (keeps seed and loot)
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BLUE = { kind: "scripted", script: "engine/blueprint" };
const ASPHALT = { texture: "cdn/texture-worn-dark-grey-asphalt-road-coarse-aggregate-damp-patches-cracks.png", wrap: "repeat", repeat: [0.3, 0.3], color: "oklch(0.42 0.01 250)", roughness: 0.62, metalness: 0 }; // Shelly "why are level 9 roads water": 0.16 roughness mirrored the sky; damp, not a puddle
const SODIUM = "oklch(0.8 0.13 70)";
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const model = (key) => PROPS[key]?.model ? { model: { id: PROPS[key].model, forward: FWD }, layout: { box: { min: { x: -PROPS[key].size[0] / 2, y: 0, z: -PROPS[key].size[2] / 2 }, max: { x: PROPS[key].size[0] / 2, y: PROPS[key].size[1], z: PROPS[key].size[2] / 2 } } } } : null;

// inside a house (Shelly #325044; "interiors look disgusting", Nov 13): the Tripo shell's inside is lumpy, so every house gets
// clean rooms of its own: papered walls just inside the shell, a flat plaster ceiling, a baseboard, a warm ceiling light per room,
// a bedroom behind a wall with a doorway, furniture against the walls. Frame: yaw Y, the front door at +z (the door's own frame).
const WALLPAPER = { texture: "cdn/texture-faded-cream-floral-wallpaper-water-stained.png", wrap: "repeat", repeat: [0.7, 0.7], color: "oklch(0.86 0.035 88)", roughness: 0.92 };
const PLASTER = { texture: "cdn/texture-popcorn-ceiling-off-white-stained.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.9 0.012 85)", roughness: 0.95 };
const BASE = { color: "oklch(0.42 0.05 55)", roughness: 0.6 };
const RUG = { texture: "cdn/texture-faded-persian-rug-worn-red-and-cream.png", color: "oklch(0.75 0.04 40)", roughness: 1 };
const LOOT = { lava_lamp: "Nightstand drawer", dresser: "Dresser drawers", kitchen_cabinet: "Kitchen cabinet" }; // Shelly: only real storage gets searched
// what every piece breaks as (scripts/lib/breakables.js: tag "breakable" + state { mat, hp, maxHp }; numbers in data/breakables.yml)
const MAT = { floor_lamp: ["fixture", 25], lava_lamp: ["fixture", 25], crt_tv: ["machine", 60], tv_console: ["wood", 50], tv_silver: ["machine", 50], tv_portable: ["machine", 30], fiddle_plant: ["wood", 20] };
const FLOOR = { texture: "cdn/texture-dusty-worn-oak-hardwood-floor-planks.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.55 0.05 60)", roughness: 0.8 };
// interior variety (Shelly Nov 14; picks mine): each house rolls its paper, floor, rug, layout and how it was left
const PAPERS = [WALLPAPER,
  { texture: "cdn/texture-mustard-1970s-geometric-wallpaper-peeling-seams.png", wrap: "repeat", repeat: [0.7, 0.7], color: "oklch(0.86 0.04 85)", roughness: 0.92 },
  { texture: "cdn/texture-dusty-blue-pinstripe-wallpaper-faded-stained.png", wrap: "repeat", repeat: [0.7, 0.7], color: "oklch(0.86 0.02 240)", roughness: 0.92 },
  { texture: "cdn/texture-green-damask-wallpaper-water-damaged.png", wrap: "repeat", repeat: [0.7, 0.7], color: "oklch(0.84 0.03 140)", roughness: 0.92 },
  { texture: "cdn/texture-dark-wood-veneer-wall-paneling-1970s-grooves.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.8 0.03 60)", roughness: 0.75 }];
const FLOORS = [null, // the oak
  { texture: "cdn/texture-flat-grey-beige-apartment-carpet-low-pile.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.7 0.02 80)", roughness: 1 },
  { texture: "cdn/texture-soaked-brown-beige-berber-office-carpet.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.68 0.03 70)", roughness: 1 },
  { texture: "cdn/texture-burnt-orange-shag-carpet-matted-worn.png", wrap: "repeat", repeat: [0.6, 0.6], color: "oklch(0.7 0.06 55)", roughness: 1 },
  { texture: "cdn/texture-cream-speckled-linoleum-kitchen-floor.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.82 0.02 85)", roughness: 0.5 }];
const RUGS = [null, null, { texture: "cdn/texture-braided-oval-rag-rug-faded-blue-and-brown.png", color: "oklch(0.75 0.03 60)", roughness: 1 }]; // null + the persian (index 1 swapped in below)
const roll = (seed, k, n) => { let h = (seed * 2654435761 + k * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return h % n; };
const ROOM_H = 2.35, IN = { visibleRange: { max: 40 }, castShadow: false };
function furnish(ctx, sp, l, H, D, Y) {
  const sd = l.seed ?? 1, PAPER = PAPERS[roll(sd, 1, PAPERS.length)], FL = FLOORS[roll(sd, 2, FLOORS.length)] ?? FLOOR, RG = [null, RUG, RUGS[2]][roll(sd, 3, 3)];
  const plan = roll(sd, 4, 3), wrecked = roll(sd, 5, 4) === 0, gone = (k) => wrecked && roll(sd, 20 + k.length * 7 + k.charCodeAt(0), 3) === 0; // a ransacked house lost a third of its things
  const R = H.inside ?? { x0: -H.w / 2 + 0.9, x1: H.w / 2 - 0.9, z0: -D.z + 0.4, z1: D.z - 0.15 }, fy = D.y + 0.07; // a hair above the shell's own lumpy floor, so it never pokes through
  const x0 = R.x0 + 0.2, x1 = R.x1 - 0.2, z0 = R.z0 + 0.2, z1 = Math.min(R.z1, D.z - 0.12);
  const at = (x, z, up = 0) => { const r = rotate({ yaw: Y }, { x, y: 0, z }); return T(l.x + r.x, l.z + r.z, fy + up); };
  const box = (k, x, z, w, d, h, mat, up = 0, phys = "static") => sp(`l9-${l.id}-${k}`, { ...IN, feetPosition: at(x, z, up), rotation: { yaw: Y }, primitive: { kind: "box", width: w, height: h, depth: d }, physics: phys, material: mat });
  const wall = (k, ax, az, bx, bz) => { const w = Math.max(0.1, Math.abs(bx - ax)), d = Math.max(0.1, Math.abs(bz - az)), x = (ax + bx) / 2, z = (az + bz) / 2;
    box(`w${k}`, x, z, w, d, ROOM_H, PAPER); box(`b${k}`, x, z, w + 0.03, d + 0.03, 0.11, BASE, 0, "none"); };
  // the room's skin, just inside the shell: back, sides, the front split round the door
  wall("bk", x0, z0 - 0.05, x1, z0 - 0.05); wall("l", x0 - 0.05, z0, x0 - 0.05, z1); wall("r", x1 + 0.05, z0, x1 + 0.05, z1);
  wall("f1", x0, z1 + 0.05, D.x - 0.58, z1 + 0.05); wall("f2", D.x + 0.58, z1 + 0.05, x1, z1 + 0.05);
  box("floor", (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 0.2, z1 - z0 + 0.2, 0.03, FL, -0.03);
  box("ceil", (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 0.2, z1 - z0 + 0.2, 0.06, PLASTER, ROOM_H);
  // the bedroom: the end away from the door, behind a wall with a doorway toward the front
  const toR = D.x < (x0 + x1) / 2, bw = Math.min(3.8, Math.max(3, (x1 - x0) * 0.4)), P = toR ? x1 - bw : x0 + bw, s = toR ? 1 : -1;
  const lv0 = toR ? x0 : P, lv1 = toR ? P : x1, Lc = (lv0 + lv1) / 2, Bc = (P + (toR ? x1 : x0)) / 2, outer = toR ? x0 : x1, os = toR ? 1 : -1;
  wall("pa", P, z0, P, z1 - 1.7); wall("pb", P, z1 - 0.65, P, z1);
  for (const [k, x] of [["liv", Lc], ["bed", Bc]]) sp(`l9-${l.id}-dome${k}`, { ...IN, feetPosition: at(x, (z0 + z1) / 2, ROOM_H - 0.09), primitive: { kind: "sphere", radius: 0.22, widthSegments: 20, heightSegments: 8, thetaLength: 1.6 }, rotation: { yaw: Y, pitch: 180 }, material: { color: "#fff3d8", emissive: "#ffd9a0", emissiveIntensity: 2.2 }, physics: "none",
    children: [{ id: "glow", feetPosition: { x: 0, y: -0.3, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.07 78)", intensity: 2.6, distance: 9, shadow: { enabled: false } } }] });
  const motel = roll(sd, 9, 3) === 0; // a third of houses were furnished from the same motel liquidation (Shelly's pack)
  const piece = (k0, x, z, yaw, tag = k0) => { const k = motel && MOTEL[k0] ? MOTEL[k0] : k0, F = FURN.pieces[k]; if (!F) return; const [w, h, d] = F.size, [mat, hp] = MAT[k] ?? ["wood", 45];
    if (!LOOT[k] && gone(tag)) return;
    const tip = wrecked && (k === "floor_lamp" || k === "dining_chair") && roll(sd, 40 + tag.length, 2) === 0; // knocked over where it stood
    const takeBook = k0 === "lava_lamp" && !ctx.place.state.suburbsBookPlaced;
    if (takeBook) ctx.place.state.suburbsBookPlaced = true;
    const items = LOOT[k] ? [takeBook ? "ubook:l9_suburbs_survival" : "", ...rollLoot(ctx, 1, 1, "l5")].filter(Boolean).join(",") : "";
    sp(`l9-${l.id}-${tag}`, { ...IN, tags: LOOT[k] ? ["l9furn", "container", "breakable"] : ["l9furn", "breakable"], feetPosition: at(x, z, tip ? Math.min(w, d) / 2 : 0), rotation: tip ? { yaw: Y + yaw, roll: 88 } : { yaw: Y + yaw }, model: { id: F.model, forward: F.forward ?? "-z" }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: { body: "static", collider: "box" },
      state: { mat, hp, maxHp: hp, ...(LOOT[k] ? { name: LOOT[k], verb: "Search", items } : { name: F.name }) } }); };
  // living room: sofa on the back wall, rug and table before it, the TV facing it, a shelf on the outer wall, dining by the front
  if (plan === 1) { // armchairs round the set instead of a sofa, a second shelf on the back wall
    piece("armchair", Lc - 0.8, z0 + 0.6, 180, "armA"); piece("armchair", Lc + 0.8, z0 + 0.6, 180, "armB");
    piece("bookshelf", Lc + 1.8 > lv1 - 0.4 ? Lc - 1.8 : Lc + 1.8, z0 + 0.25, 180, "shelfB");
  } else piece("sofa", Lc, z0 + 0.55, 180);
  if (RG) box("rug", Lc, z0 + 1.75, 2.2, 1.6, 0.012, RG, 0, "none");
  if (plan !== 2) piece("coffee_table", Lc, z0 + 1.7, 0);
  if (z1 - z0 > 4.6) piece(["crt_tv", "tv_console", "tv_silver", "tv_console"][Math.abs(Math.round(Lc * 7 + z0 * 13)) % 4], Lc, z0 + 3.2, 0, "crt_tv"); // each house its own set (Shelly Nov 14: tv variants)
  piece("floor_lamp", Lc + (plan === 1 ? -1.6 : 1.45), z0 + 0.35, 0);
  if (plan === 2) { piece("fiddle_plant", Lc - 1.3, z0 + 0.35, 0, "plantB"); piece("armchair", Lc + 1.1, z0 + 1.9, -120, "armA"); } // a reading corner, no table
  piece("bookshelf", outer + os * 0.28, z0 + 1.6, os > 0 ? 90 : -90);
  if (lv1 - lv0 > 4.4 && z1 - z0 > 5.2) { const tx = outer + os * 1.2, tz = z1 - 1.1; piece("dining_table", tx, tz, 0); piece("dining_chair", tx - 0.78, tz, CH.l, "chairA"); piece("dining_chair", tx + 0.78, tz, CH.r, "chairB"); }
  piece("kitchen_cabinet", P - s * 0.34, z0 + 1.0, CAB(s));
  piece("fiddle_plant", D.x + (toR ? -1.1 : 1.1), z1 - 0.45, 0);
  // bedroom: headboard to the back wall, the lamp on the nightstand side, a chair in the corner by the doorway
  piece("double_bed", Bc, z0 + 1.05, 180); piece("lava_lamp", Bc + s * 1.3 > (toR ? x1 - 0.3 : x0 + 0.3) === toR ? Bc - s * 1.3 : Bc + s * 1.3, z0 + 0.3, 180);
  if (z1 - z0 > 5) piece("armchair", Bc + s * 0.9, z1 - 0.6, 180);
  piece("dresser", (toR ? x1 : x0) - s * 0.28, (z0 + z1) / 2 + 0.7, DRS(s));
  if (wrecked) for (let i = 0; i < 6; i++) { // torn paper and pulled drawers' junk on the floor
    const px = x0 + 0.4 + (roll(sd, 60 + i, 100) / 100) * (x1 - x0 - 0.8), pz = z0 + 0.4 + (roll(sd, 70 + i, 100) / 100) * (z1 - z0 - 0.8);
    sp(`l9-${l.id}-junk${i}`, { ...IN, feetPosition: at(px, pz), rotation: { yaw: Y + roll(sd, 80 + i, 360) }, primitive: { kind: "box", width: 0.21, height: 0.004, depth: 0.29 }, material: { color: i % 2 ? "oklch(0.88 0.02 90)" : "oklch(0.8 0.03 80)", roughness: 1 } });
  }
}

const MOTEL = { sofa: "motel_couch", double_bed: "motel_bed", armchair: "wingback_chair", floor_lamp: "bulb_lamp", dining_table: "pedestal_table", dining_chair: "leather_chair" };
const CH = { l: 90, r: -90 }, CAB = (s) => (s > 0 ? -90 : 90), DRS = (s) => (s > 0 ? -90 : 90); // facings, checked by eye
function lay(ctx, L) {
  const keep = {};
  for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l9-/.test(id) && !id.includes("/")) { const o = ctx.place.objects[id]; if (o?.tags?.includes("container")) keep[id] = { ...o.state }; ctx.destroy(id); }
  const sp = (id, spec) => { if (keep[id] && spec.state) for (const k of ["items", "scavved", "lock"]) if (keep[id][k] !== undefined) spec.state[k] = keep[id][k]; if (spec.light) spec.light.shadow ??= { enabled: false }; return ctx.spawn(id, spec); };
  // arrivals and the ways out (lore: the road back into the caves, the wheat past the last houses, the city glow up the road)
  sp("l9-from-l8", { feetPosition: T(0, 30, 0.2), rotation: { yaw: 0 } });
  sp("l9-from-hub", { feetPosition: T(2, 24, 0.2), rotation: { yaw: 0 } });
  sp("l9-to-l8", { ...DOOR("level8#l8-from-l9", 9, 4, 2), feetPosition: T(0, 61, 0) });
  sp("l9-to-l10", { ...DOOR("level10#l10-from-l11", 3, 4, 14), feetPosition: T(-58, 44, 0) });
  const [nx, nz] = L.north;
  sp("l9-to-l11", { ...DOOR("level11#lv10-arrive", 9, 4, 2), feetPosition: T(nx, nz - 2, 0) });
  sp("l9-city-glow", { feetPosition: { x: nx, y: 14, z: nz - 60 }, light: { kind: "point", color: "oklch(0.75 0.1 60)", intensity: 40, distance: 160 }, visibleRange: { max: 400 } });
  // streets: wet, unpainted, kerbed
  for (const s of L.streets) {
    sp(`l9-road-${s.id}`, { tags: ["l9road"], spline: { kind: "road", points: s.pts.map(([x, z]) => [x, 0.04, z]), width: ROAD_W, snapToTerrain: true, yOffset: 0.04, roadside: { markings: false, sidewalks: { width: WALK, height: 0.14 }, lampPosts: false, hedges: false } }, material: ASPHALT, state: { floor: "asphalt" }, physics: "static", visibleRange: { max: 320 } }); // sounds dry: the texture name says rain-soaked (Shelly: "the roads have water sounds")
  }
  for (const [i, b] of L.bulbs.entries()) sp(`l9-bulb-${i}`, { feetPosition: T(b.x, b.z, 0.03), primitive: { kind: "cylinder", radiusTop: b.r, radiusBottom: b.r, height: 0.06, radialSegments: 40 }, material: ASPHALT, physics: "static", visibleRange: { max: 320 } });
  // streetlights: most are dead
  const SL = PROPS.streetlight, lm = model("streetlight");
  for (const l of L.lamps) {
    const kids = l.lit ? [{ id: "glow", feetPosition: { x: SL.lamp[0], y: SL.lamp[1] - 0.25, z: -SL.lamp[2] }, light: { kind: "spot", color: SODIUM, intensity: 26, distance: 26, angle: 62, penumbra: 0.7, aim: { x: 0, y: -1, z: 0 }, shadow: { enabled: false } } },
      { id: "bulb", feetPosition: { x: SL.lamp[0], y: SL.lamp[1] - 0.12, z: -SL.lamp[2] }, primitive: { kind: "box", width: 0.26, height: 0.06, depth: 0.6 }, material: { color: "#ffd9a0", emissive: SODIUM, emissiveIntensity: 5 }, castShadow: false }] : [];
    sp(`l9-lamp-${l.id}`, { tags: ["l9lamp"], feetPosition: T(l.x, l.z), rotation: { yaw: l.yaw }, physics: { body: "static", collider: "box" }, visibleRange: { max: 260 }, state: { lit: l.lit, flick: l.flick },
      ...(lm ?? { primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.11, height: SL.size[1] }, material: BLUE, physics: "none" }), children: kids,
      ...(l.lit ? { audio: { clip: "cdn/sfx-sodium-streetlight-ballast-electrical-buzz-hum-loop.mp3", gain: 0.18, loop: true, spatial: true, maxDistance: 16 } } : {}) });
  }
  // houses: the model when the kit has it, a blueprint box on the lot until then
  for (const l of L.lots) {
    const H = HOUSES[l.kind], p = PAINTS[l.paint];
    if (H.model) sp(`l9-${l.id}`, { tags: ["l9house"], feetPosition: T(l.x, l.z, 0.02), rotation: { yaw: l.yaw }, model: { id: H.model, forward: "+z", materials: { interior: { color: "oklch(0.8 0.03 85)", roughness: 0.92, texture: "cdn/texture-faded-cream-floral-wallpaper-water-stained.png", wrap: "repeat", repeat: [0.8, 0.8] }, ceiling: { color: "oklch(0.86 0.015 85)", roughness: 0.95, texture: "cdn/texture-popcorn-ceiling-off-white-stained.png", wrap: "repeat", repeat: [0.5, 0.5] } } }, physics: { body: "static", collider: "mesh" }, visibleRange: { max: 300 }, state: { kind: l.kind, seed: l.seed } });
    if (H.model && H.door) { // the front door: a kinematic hinge at the left jamb, the leaf its child; E swings it inward (scripts/home11-door.js "door")
      const D = H.door, W = 0.96, Y = l.yaw + 180, at = (lx, lz) => { const r = rotate({ yaw: Y }, { x: lx, y: 0, z: lz }); return T(l.x + r.x, l.z + r.z, 0.02 + D.y); };
      const dp = { style: "wood", w: W, h: 2.05, hingeSide: "left", swing: 1, d: 0.08, seed: l.seed % 97 };
      const LV = [0, 0, 0, 0, 25, 50][roll(l.seed ?? 1, 9, 6)]; // a third of the doors locked (2 of 6 rolls), Lockpick 25 or 50 (picks mine)
      sp(`l9-${l.id}-door`, { feetPosition: at(D.x - W / 2, D.z - 0.04), rotation: { yaw: Y }, physics: "kinematic", tags: ["usable"], behavior: "scripts/home11-door.js", state: { ...(LV ? { lock: `lockpick:${LV}` } : {}), open: false, closedYaw: Y, openYaw: Y - 95, kind: "door", name: "Front Door", verb: "Open", hinge: `l9-${l.id}-door` },
        children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: { kind: "door", name: "Front Door", verb: "Open", hinge: `l9-${l.id}-door` } }] });
      sp(`l9-${l.id}-jamb`, { feetPosition: at(D.x, D.z - 0.04), rotation: { yaw: Y }, physics: { body: "static", collider: "auto" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "frame" } }, material: { pbr: true } });
      for (let i = 0; i < 3; i++) { const h = D.y * (i + 1) / 3, r = rotate({ yaw: Y }, { x: D.x, y: 0, z: D.z + 0.9 - i * 0.3 });  // a stoop: three concrete steps up to the threshold, flush with the floor inside
        sp(`l9-${l.id}-step${i}`, { feetPosition: T(l.x + r.x, l.z + r.z, 0), rotation: { yaw: Y }, primitive: { kind: "box", width: 1.5, height: h + 0.05, depth: 0.32 }, physics: "static", material: { texture: "cdn/texture-weathered-poured-concrete-stoop-hairline-cracks.png", color: "oklch(0.62 0.01 80)", roughness: 0.9 } }); }
      if (l.lit) { const c = rotate({ yaw: Y }, { x: 0, y: 0, z: 0 }), po = rotate({ yaw: Y }, { x: D.x, y: 0, z: D.z + 0.55 }); // someone left a lamp on: a warm window down the street and a porch bulb; smilers only take the dark houses (lot.lit)
        sp(`l9-${l.id}-lamp`, { feetPosition: T(l.x + c.x, l.z + c.z, D.y + 2.0), light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 2.4, distance: 11 } });
        sp(`l9-${l.id}-porch`, { feetPosition: T(l.x + po.x, l.z + po.z, D.y + 2.35), visibleRange: { max: 220 }, light: { kind: "point", color: "oklch(0.86 0.1 80)", intensity: 0.9, distance: 7 } }); }
      furnish(ctx, sp, l, H, D, Y);
    }
    else if (!H.model) sp(`l9-${l.id}`, { tags: ["l9house"], feetPosition: T(l.x, l.z), rotation: { yaw: l.yaw }, primitive: { kind: "box", width: H.w, height: H.stories * 2.9 + 1.2, depth: H.d }, material: BLUE, physics: "none", state: { kind: l.kind, seed: l.seed } });
  }
  if ((ctx.world.files ?? []).includes("scripts/l9-mangled.js")) sp("l9-mangled-mgr", { feetPosition: T(0, 0), behavior: "scripts/l9-mangled.js", audience: "all" });
  sp("l9-ambience", { feetPosition: T(0, 0), audience: "local", audio: { clip: "cdn/ambience-dead-quiet-suburb-midnight-light-wind-distant-wet-road-hiss-no-crickets-loop.mp3", gain: 0.16, loop: true, spatial: false, bus: "Ambience" } });
}

// Sparse, seeded curbside details make the repeated streets readable without blocking their centre.
function dressStreets(ctx, L) {
  for (const l of L.lots) {
    const side = l.seed % 2 ? 1 : -1, tx = -l.fz * side, tz = l.fx * side;
    for (const [kind, every, along, back] of [["mailbox", 3, 2.4, 0.8], ["trash_bin", 5, -2.5, 1.2]]) {
      if (l.seed % every !== 0) continue;
      const shape = model(kind); if (!shape) continue;
      const id = `l9-dress-${l.id}-${kind}`; if (ctx.place.objects[id]) continue;
      ctx.spawn(id, { feetPosition: T(l.kerb.x + tx * along - l.fx * back, l.kerb.z + tz * along - l.fz * back), rotation: { yaw: l.yaw }, ...shape, physics: { body: "static", collider: "box" }, castShadow: false, visibleRange: { max: 65 } });
    }
  }
}

const FOG_CLEAR = { near: 12, far: 120 }, FOG_BANK = { near: 1.5, far: 17 };
const between = (ctx, [a, b]) => (a + ctx.random() * (b - a)) * 1000;
// the fog: a bank rolls in over ~14 s, sits, rolls out. place.state.l9fog = { on, until } is what scripts/l9-mangled.js hunts by.
function fog(ctx, s) {
  const now = ctx.now();
  if (!s.l9fog) s.l9fog = { on: false, until: now + between(ctx, [100, 160]) }; // the first bank comes early: a new arrival meets it (my pick)
  if (now >= s.l9fog.until) {
    const on = !s.l9fog.on; s.l9fog = { on, until: now + between(ctx, on ? TUNE.fogLasts : TUNE.fogEvery), at: now };
    if (on) ctx.emit("playSound", { clip: "cdn/sfx-distant-air-raid-siren-single-slow-wail-far-across-a-suburb-at-night.mp3", volume: 0.5 }, { audience: { place: ctx.place.id ?? "level9" } });
  }
  const t = Math.min(1, (now - (s.l9fog.at ?? 0)) / 14000), k = s.l9fog.on ? t : 1 - t, f = ctx.place.atmosphere.fog;
  const near = FOG_CLEAR.near + (FOG_BANK.near - FOG_CLEAR.near) * k, far = FOG_CLEAR.far + (FOG_BANK.far - FOG_CLEAR.far) * k;
  if (Math.abs((f?.far ?? 0) - far) > 0.4) ctx.place.atmosphere.fog = { kind: "linear", near, far, color: k > 0.5 ? "oklch(0.2 0.015 250)" : "oklch(0.1 0.02 262)" };
}
export function tick(ctx) {
  if (ctx.place.objects["sewer9-drain"]?.behavior?.length) ctx.destroy("sewer9-drain"); // v1 led down: gone
  if (!ctx.place.objects["sewer9-drain"]) { // where Level 34's sewer lets you out (Shelly Nov 13: "a reliable way to get TO level 9", in from Level 11): exit only, nothing leads down
    ctx.spawn("sewer9-drain", { feetPosition: T(4.2, 27, 0.02), primitive: { kind: "box", width: 0.9, height: 0.06, depth: 0.6 }, physics: "static", material: { texture: "cdn/texture-rusty-cast-iron-storm-drain-grate-slots.png", color: "oklch(0.35 0.03 50)", roughness: 0.7, metalness: 0.5 } });
    ctx.spawn("l9-from-l34", { feetPosition: T(4.2, 25.6, 0.2), rotation: { yaw: 0 } });
  }
  const s = ctx.place.state;
  if (s.l9seed == null) s.l9seed = (hashStr(String(ctx.getRoomId?.() ?? "main")) ^ Math.floor(ctx.random() * 0x7fffffff)) >>> 0; // rolled once per room, kept with the room
  if (s.l9V !== V) { lay(ctx, layout(s.l9seed)); s.l9V = V; s.l9DressV = 0; }
  if (s.l9DressV !== 1) { dressStreets(ctx, layout(s.l9seed)); s.l9DressV = 1; }
  if (ctx.place.players.length) { fog(ctx, s); hounds(ctx, s, layout(s.l9seed)); }
}

// hounds (Wikidot: Level 9's streets have them): one pack manager (scripts/hounds.js, its Level 9 branch keeps them on the street,
// so a house is shelter), topped up to TUNE.hounds in threes, each pack arriving far from every player on a street point.
function hounds(ctx, s, L) {
  const now = ctx.now();
  if (!s.packMgr || !(s.packMgr in ctx.place.objects)) s.packMgr = ctx.spawn({ behavior: "scripts/hounds.js" });
  if (s.houndAt && now - s.houndAt < TUNE.houndEvery * 1000) return;
  s.houndAt = now;
  const have = ctx.query({ tags: ["hound"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((h) => !h.state?.dead).length;
  const ps = ctx.place.players.map((p) => p.feetPosition);
  const far = () => { const pts = L.streets.flatMap((st) => st.pts); for (let i = 0; i < 40; i++) { const [x, z] = pts[Math.floor(ctx.random() * pts.length)]; if (ps.every((p) => Math.hypot(p.x - x, p.z - z) > TUNE.houndFar)) return { x, z }; } return null; };
  if (ctx.world.files.includes("templates/deathmoths.js")) { // deathmoths: a swarm round a lit streetlight, drawn to a flashlight
    if (!s.mothMgr || !(s.mothMgr in ctx.place.objects)) s.mothMgr = ctx.spawn({ behavior: "scripts/deathmoths.js" });
    const lit = L.lamps.filter((l) => l.lit && ps.every((p) => Math.hypot(p.x - l.x, p.z - l.z) > 25));
    const mh = ctx.query({ tags: ["moths"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((m) => !m.state?.dead && !m.tags?.includes("l5rat")).length;
    for (let i = mh; i < TUNE.moths && lit.length; i++) { const l = lit.splice(Math.floor(ctx.random() * lit.length), 1)[0]; ctx.spawn({ template: "templates/deathmoths.js#swarm", feetPosition: { x: l.x, y: 3.2, z: l.z }, state: { home: { x: l.x, z: l.z } } }); }
  }
  // smilers (Wikidot: Level 9): one to a dark house, its grin in the hall; the street has hounds, the dark houses have these
  const sm = ctx.query({ tags: ["l9-smiler"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((e) => !e.state?.dead);
  const taken = new Set(sm.map((e) => e.state?.lot));
  const dark = L.lots.filter((l) => !l.lit && !taken.has(l.id) && ps.every((p) => Math.hypot(p.x - l.x, p.z - l.z) > 30));
  for (let i = sm.length; i < TUNE.smilers && dark.length; i++) {
    const lot = dark.splice(Math.floor(ctx.random() * dark.length), 1)[0], H = HOUSES[lot.kind];
    const R = H.inside ?? { x0: -H.w / 2 + 0.9, x1: H.w / 2 - 0.9, z0: -H.d / 2 + 0.9, z1: H.d / 2 - 0.9 }, m = 1.1, rot = { yaw: lot.yaw };
    const W = (lx, lz) => { const v = rotate(rot, { x: lx, y: 0, z: lz }); return [+(lot.x + v.x).toFixed(2), +(lot.z + v.z).toFixed(2)]; };
    const route = [W(R.x0 + m, R.z0 + m), W(R.x1 - m, R.z0 + m), W(R.x1 - m, R.z1 - m), W(R.x0 + m, R.z1 - m)];
    const fy = (ctx.place.terrain.heightAt(lot.x, lot.z) ?? 0) + (H.door?.y ?? 0.4) + 0.12, c = W((R.x0 + R.x1) / 2, (R.z0 + R.z1) / 2);
    ctx.spawn({ tags: ["smiler", "l9-smiler", "hostile"], feetPosition: { x: c[0], y: fy, z: c[1] }, castShadow: false, visibleRange: { max: 40 },
      model: { id: "/cdn/value.fb443f6a23bcd4977c437db42b3f9abe2510fcb6cf2076ee4956fb235d581b26.glb", forward: "+x" },
      layout: { box: { min: { x: -0.4, y: 0, z: -0.35 }, max: { x: 0.4, y: 1.7, z: 0.35 } } },
      physics: { body: "character" }, behavior: "scripts/l9-smiler.js",
      state: { hp: 90, maxHp: 90, name: "Smiler", lot: lot.id, home: { x: c[0], z: c[1] }, leash: Math.max(R.x1 - R.x0, R.z1 - R.z0) / 2 + 0.6, route, leg: 0 } });
  }
  // skin-stealers (Wikidot: Level 9): a critter on the pavement, until it is close
  if (!s.stealMgr || !(s.stealMgr in ctx.place.objects)) s.stealMgr = ctx.spawn({ behavior: "scripts/stealers.js" });
  const sh = ctx.query({ tags: ["stealer"], radius: 1e5, center: { x: 0, y: 0, z: 0 } }).filter((e) => !e.state?.dead).length;
  for (let i = sh; i < TUNE.stealers; i++) { const c = far(); if (!c) break; ctx.spawn({ tags: ["stealer"], feetPosition: T(c.x, c.z, 0.05), physics: { body: "character" }, model: stealerModel(false), state: npcState(ctx, "stealer", TUNE.stealerHp, { xp: 60 }) }); }
  for (let i = have, c = null; i < TUNE.hounds; i++) {
    if (i % 3 === 0 || !c) c = far(); if (!c) break;
    ctx.spawn({ tags: ["hound"], feetPosition: T(c.x + (i % 3) * 0.9, c.z + (i % 3) * 0.5, 0.05), physics: { body: "character" }, primitive: { kind: "scripted", script: "scripts/hound-geo.js" }, state: npcState(ctx, "hound", TUNE.houndHp, { xp: 45 }) });
  }
}
