// Level 9 "The Suburbs": the referee. Rolls the room's seed once (place.state.l9seed: kept with everything looted here, so a reload
// finds the same streets and the same emptied drawers; another room rolls its own), lays the streets, houses and lamps from it,
// and runs the fog banks. Layout: scripts/lib/level9.js. House kit: scripts/lib/data/l9-houses.yml. Props: l9-props.yml.
import { rotate } from "builtin/vec3";
import { rollLoot } from "../../scripts/lib/loot.js";
import FURN from "../../scripts/lib/data/furniture.yml";
import { layout, hashStr, HOUSES, PAINTS, PROPS, TUNE, FWD, ROAD_W, WALK } from "../../scripts/lib/level9.js";
export const cadence = "1s";
const V = 7; // 3: Tripo house models on the lots; 6: plaster insides; 7: wallpaper box-mapped, a bedroom wall, furniture and loot inside; 5 (4 hung them on the back): door holes cut, a hinged front door and a stoop on each (keeps seed and loot)
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BLUE = { kind: "scripted", script: "engine/blueprint" };
const ASPHALT = { texture: "cdn/texture-worn-dark-grey-asphalt-road-coarse-aggregate-damp-patches-cracks.png", wrap: "repeat", repeat: [0.3, 0.3], color: "oklch(0.42 0.01 250)", roughness: 0.62, metalness: 0 }; // Shelly "why are level 9 roads water": 0.16 roughness mirrored the sky; damp, not a puddle
const SODIUM = "oklch(0.8 0.13 70)";
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const model = (key) => PROPS[key]?.model ? { model: { id: PROPS[key].model, forward: FWD }, layout: { box: { min: { x: -PROPS[key].size[0] / 2, y: 0, z: -PROPS[key].size[2] / 2 }, max: { x: PROPS[key].size[0] / 2, y: PROPS[key].size[1], z: PROPS[key].size[2] / 2 } } } } : null;

// inside a house (Shelly #325044): one wall splits a bedroom off the living room, both furnished from the mall's catalog
// (Tripo pieces), and the bookshelf, the TV stand and the nightstand are searchable. Frame: yaw Y, the front door at +z.
const WALLPAPER = { texture: "cdn/texture-faded-cream-floral-wallpaper-water-stained.png", wrap: "repeat", repeat: [0.8, 0.8], color: "oklch(0.8 0.03 85)", roughness: 0.92 };
const LOOT = { bookshelf: "Bookshelf", crt_tv: "TV stand", lava_lamp: "Nightstand" };
function furnish(ctx, sp, l, H, D, Y) {
  const hw = H.w / 2 - 0.9, hd = D.z - 0.45, side = D.x >= 0 ? 1 : -1, P = -side * hw * 0.3, fy = D.y;
  const at = (x, z, up = 0) => { const r = rotate({ yaw: Y }, { x, y: 0, z }); return T(l.x + r.x, l.z + r.z, fy + up); };
  for (const [k, z0, z1] of [["a", -hd - 0.3, -0.5], ["b", 0.5, hd + 0.3]]) // the bedroom wall, a doorway in its middle
    sp(`l9-${l.id}-wall${k}`, { feetPosition: at(P, (z0 + z1) / 2), rotation: { yaw: Y }, primitive: { kind: "box", width: 0.1, height: 2.3, depth: z1 - z0 }, physics: "static", material: WALLPAPER });
  const piece = (k, x, z, yaw = 180) => { const F = FURN.pieces[k]; if (!F) return; const [w, h, d] = F.size, id = `l9-${l.id}-${k}`;
    sp(id, { tags: LOOT[k] ? ["l9furn", "container"] : ["l9furn"], feetPosition: at(x, z), rotation: { yaw: Y + yaw }, model: { id: F.model, forward: F.forward ?? "-z" }, layout: { box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 40 },
      state: LOOT[k] ? { name: LOOT[k], mat: "wood", items: rollLoot(ctx, 1, 1, "l5").join(",") } : { name: F.name } }); };
  const lx = (P + side * hw) / 2, bx = (P - side * hw) / 2;
  piece("sofa", lx, -hd + 0.55); piece("coffee_table", lx, -hd + 1.6, 0); piece("floor_lamp", lx - side * 1.4, -hd + 0.3);
  if (hd * 2 > 4.4) piece("crt_tv", lx, -hd + 2.9, 0);
  piece("bookshelf", side * hw - side * 0.5, -hd + 0.25); piece("fiddle_plant", side * hw - side * 0.45, hd - 0.45);
  piece("double_bed", bx, -hd + 1.05); piece("lava_lamp", bx + side * 1.3, -hd + 0.3);
}

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
      sp(`l9-${l.id}-door`, { feetPosition: at(D.x - W / 2, D.z - 0.04), rotation: { yaw: Y }, physics: "kinematic", tags: ["usable"], behavior: "scripts/home11-door.js", state: { open: false, closedYaw: Y, openYaw: Y - 95, kind: "door", name: "Front Door", verb: "Open", hinge: `l9-${l.id}-door` },
        children: [{ id: "leaf", tags: ["usable"], feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "leaf" } }, material: { pbr: true }, physics: "static", behavior: "scripts/home11-door.js", state: { kind: "door", name: "Front Door", verb: "Open", hinge: `l9-${l.id}-door` } }] });
      sp(`l9-${l.id}-jamb`, { feetPosition: at(D.x, D.z - 0.04), rotation: { yaw: Y }, physics: { body: "static", collider: "auto" }, castShadow: false, primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { ...dp, part: "frame" } }, material: { pbr: true } });
      for (let i = 0; i < 3; i++) { const h = D.y * (i + 1) / 3, r = rotate({ yaw: Y }, { x: D.x, y: 0, z: D.z + 0.9 - i * 0.3 });  // a stoop: three concrete steps up to the threshold, flush with the floor inside
        sp(`l9-${l.id}-step${i}`, { feetPosition: T(l.x + r.x, l.z + r.z, 0), rotation: { yaw: Y }, primitive: { kind: "box", width: 1.5, height: h + 0.05, depth: 0.32 }, physics: "static", material: { texture: "cdn/texture-weathered-poured-concrete-stoop-hairline-cracks.png", color: "oklch(0.62 0.01 80)", roughness: 0.9 } }); }
      if (l.seed % 4 === 0) { const c = rotate({ yaw: Y }, { x: 0, y: 0, z: 0 }); sp(`l9-${l.id}-lamp`, { feetPosition: T(l.x + c.x, l.z + c.z, D.y + 2.3), light: { kind: "point", color: "oklch(0.85 0.09 75)", intensity: 1.2, distance: 9 } }); } // someone left a lamp on: a warm window down the street, a lit room to walk into
      const f = rotate({ yaw: l.yaw }, { x: 0, y: 0, z: 0 }); // the floor inside: the shell is hollow, so a plank floor at the threshold's height under the whole footprint
      sp(`l9-${l.id}-floor`, { feetPosition: T(l.x + f.x, l.z + f.z, D.y - 0.04), rotation: { yaw: l.yaw }, primitive: { kind: "box", width: H.w - 1.2, height: 0.04, depth: D.z * 2 - 0.4 }, physics: "static", material: { texture: "cdn/texture-dusty-worn-oak-hardwood-floor-planks.png", wrap: "repeat", repeat: [0.5, 0.5], color: "oklch(0.55 0.05 60)", roughness: 0.8 } });
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
  if (ctx.place.players.length) fog(ctx, s);
}
