import { regrowWrecks } from "../../scripts/lib/breakables.js";
// Level 7 "Thalassophobia" Simulation:
// Wikidot Backrooms Level 7 - An infinite subterranean ocean beneath a towering cavern void.
// Wanderers emerge from the Level 6 staircase landing into the Drowned Parlor atop a basalt sea rock,
// descending weathered stone steps to a dilapidated stilted timber pier stretching into the freezing abyssal sea.
// Channel buoys bob in the swells, and Entity 20 ("The Thing on Level 7") cruises submerged in the bay.

export const cadence = "2s";

// Tripo models for the props (Savi, Nov 7): each fits a layout box; breakables take tag + { mat, hp, maxHp } (lib/breakables.js)
const GLB = {"dresser": "/cdn/value.6b73846286fe58c95018a876f85d847e8af3c7a0187d06a8838072345f9ca49e.glb", "sideboard": "/cdn/value.4594d9a21e6d7e2e5f94a71011243747c652c77035a1fc981fbcf4bee983324f.glb", "floorlamp": "/cdn/value.0871d1626b929961d73cb28c05f82070ad822c5cc2e6b8deec5046248fb4086d.glb", "plant": "/cdn/value.88c7684212164aa0495a65fc294a12752ef506c35708f70485202b9366795b43.glb", "boxes": "/cdn/value.03043a5c4b3b53a18930a0c88c7326a0dc9d5b573d956151044390dfab77c966.glb", "painting": "/cdn/value.4a21d3a89bea899be89b163f7a8f7dff6154ed42a4cc293f4dc61d1417ddb01d.glb", "vase": "/cdn/value.b0e16d774955bb71599f3de00b0530daf0091b38a420dd17e70fd067c6fc317e.glb", "debris": "/cdn/value.8d1753333c511dbe2a78f3262c0c0a43906f3f976c835839c27c1540ade2075d.glb", "armchair": "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb", "bookcase": "/cdn/value.e5cb5f63f8bafd91816ef7385146f9277f104159e7e936e7c42095649e736239.glb", "boulder": "/cdn/value.42d919dcb3a5731dd59103721bf944cc852d5f72e23cbb63b6c5050708d6593c.glb", "buoy": "/cdn/value.d5523049085d74c40e3d4beced2fa139b38ef940839ffff99aae7f482aeff80c.glb", "crate": "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb", "rowboat": "/cdn/value.a8149ca591b3615ade17735a3a0a1e972028c35be8f1351899565924f9d32a16.glb", "table": "/cdn/value.ae333c2667c26f3447936196f710a35594496dcf39c35d76b8c06a720189174d.glb"};
const fit = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const brk = (mat, hp) => ({ mat, hp, maxHp: hp });
// every breakable here, by id: laid with the level, re-laid 15 min after it is smashed (nobody within 8 m)
export function breakables(FY, PY) {
  const R = {
    "l7-crate": { tags: ["container", "breakable"], feetPosition: { x: -2.1, y: FY, z: -1.8 }, rotation: { yaw: 12 }, model: GLB.crate, layout: fit(0.8, 0.8, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Waterlogged M.E.G. crate", items: "almond,ration,rope,battery", ...brk("wood", 45) } },
    "l7-pier-crate": { tags: ["container", "breakable"], feetPosition: { x: -0.9, y: PY + 0.04, z: -32.5 }, rotation: { yaw: -20 }, model: GLB.crate, layout: fit(0.6, 0.6, 0.6), physics: { body: "static", collider: "box" }, state: { name: "Salt-crusted maritime locker", items: "almond,battery,bandage", ...brk("wood", 35) } },
    "l7-bookcase": { tags: ["breakable"], feetPosition: { x: -2.72, y: FY, z: 0.3 }, rotation: { yaw: 0 }, model: GLB.bookcase, layout: fit(1.5, 2.3, 1.5), physics: { body: "static", collider: "box" }, state: brk("wood", 90) },
    "l7-armchair": { tags: ["breakable"], feetPosition: { x: 1.7, y: FY, z: 0.2 }, rotation: { yaw: -115 }, model: GLB.armchair, layout: fit(0.95, 0.95, 0.95), physics: { body: "static", collider: "box" }, state: brk("wood", 50) },
    "l7-table": { tags: ["breakable"], feetPosition: { x: 1.15, y: FY, z: -0.9 }, rotation: { yaw: 8 }, model: GLB.table, layout: fit(1.15, 0.5, 1.15), physics: { body: "static", collider: "box" }, state: brk("wood", 40) },
    // the drowned-house pile (ref: a flooded parlour, furniture stacked where the water left it)
    "l7-dresser": { tags: ["container", "breakable"], feetPosition: { x: 2.4, y: FY, z: -2.15 }, rotation: { yaw: 84 }, model: GLB.dresser, layout: fit(1.0, 1.1, 1.0), physics: { body: "static", collider: "box" }, state: { name: "Swollen chest of drawers", items: "almond,bandage", ...brk("wood", 70) } },
    "l7-dresser-top": { tags: ["breakable"], feetPosition: { x: 1.15, y: FY + 0.5, z: -0.9 }, rotation: { yaw: 172, roll: 4 }, model: GLB.dresser, layout: fit(0.75, 0.8, 0.75), physics: { body: "static", collider: "box" }, state: brk("wood", 50) },
    "l7-sideboard": { tags: ["container", "breakable"], feetPosition: { x: 2.42, y: FY, z: 2.2 }, rotation: { yaw: 90 }, model: GLB.sideboard, layout: fit(1.15, 1.25, 1.15), physics: { body: "static", collider: "box" }, state: { name: "Waterlogged sideboard", items: "ration,battery", ...brk("wood", 80) } },
    "l7-boxes": { tags: ["breakable"], feetPosition: { x: 1.25, y: FY, z: 2.45 }, rotation: { yaw: 6 }, model: GLB.boxes, layout: fit(0.8, 1.05, 0.8), physics: { body: "static", collider: "box" }, state: { items: "rope", ...brk("wood", 20) } },
    "l7-lamp": { tags: ["breakable"], feetPosition: { x: -2.5, y: FY, z: 2.3 }, rotation: { yaw: 210, roll: -9 }, model: GLB.floorlamp, layout: fit(0.9, 1.7, 0.9), physics: { body: "static", collider: "box" },
      children: [{ feetPosition: { x: 0, y: 1.45, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.11 70)", intensity: 0.7, distance: 4 } }], state: brk("wood", 25) },
    "l7-plant": { tags: ["breakable"], feetPosition: { x: -1.3, y: FY, z: 2.5 }, rotation: { yaw: 40 }, model: GLB.plant, layout: fit(0.6, 0.75, 0.6), physics: { body: "static", collider: "box" }, state: brk("wood", 15) },
    "l7-vase": { tags: ["breakable"], feetPosition: { x: 1.0, y: FY + 1.28, z: -0.85 }, rotation: { yaw: 20 }, model: GLB.vase, layout: fit(0.35, 0.75, 0.35), physics: { body: "static", collider: "box" }, state: brk("wood", 10) },
    "l7-dresser-2": { tags: ["breakable"], feetPosition: { x: 2.4, y: FY + 1.08, z: -2.1 }, rotation: { yaw: 70, roll: -6 }, model: GLB.boxes, layout: fit(0.7, 0.9, 0.7), physics: { body: "static", collider: "box" }, state: { items: "ration", ...brk("wood", 20) } },
    "l7-boxes-2": { tags: ["breakable"], feetPosition: { x: -2.35, y: FY, z: -0.95 }, rotation: { yaw: 80, roll: 3 }, model: GLB.boxes, layout: fit(0.7, 0.9, 0.7), physics: { body: "static", collider: "box" }, state: brk("wood", 20) },
    "l7-vase-2": { tags: ["breakable"], feetPosition: { x: 2.35, y: FY + 1.25, z: 2.0 }, rotation: { yaw: 160 }, model: GLB.vase, layout: fit(0.3, 0.6, 0.3), physics: { body: "static", collider: "box" }, state: brk("wood", 10) },
    "l7-plant-2": { tags: ["breakable"], feetPosition: { x: -2.2, y: FY + 0.8, z: -1.8 }, rotation: { yaw: 250 }, model: GLB.plant, layout: fit(0.5, 0.6, 0.5), physics: { body: "static", collider: "box" }, state: brk("wood", 15) },
    "l7-painting": { feetPosition: { x: -1.6, y: FY + 1.0, z: 2.86 }, rotation: { yaw: 180, roll: 5 }, model: GLB.painting, layout: fit(1.3, 1.1, 1.3) },
    "l7-debris-1": { feetPosition: { x: -0.95, y: FY + 0.12, z: 0.9 }, rotation: { yaw: 30 }, model: GLB.debris, layout: fit(0.8, 0.45, 0.8) },
    "l7-debris-2": { feetPosition: { x: -1.5, y: FY + 0.12, z: -2.3 }, rotation: { yaw: 200 }, model: GLB.debris, layout: fit(0.65, 0.4, 0.65) },
  };
  [[-9, -6, 1.3, 1], [-12, 4, 1.8, 2], [8, -7, 1.1, 3], [13, 2, 2.2, 4], [-6, 12, 1.5, 5], [10, 11, 1.2, 6], [-17, -3, 2.6, 7], [17, -9, 2, 8], [3, -11, 0.8, 9], [-4, -9, 0.7, 10]].forEach(([x, z, sc, seed], i) => {
    R[`l7-boulder-${i}`] = { tags: ["breakable"], feetPosition: { x, z, y: { terrain: -0.15 * sc } }, rotation: { yaw: seed * 47 }, model: GLB.boulder, layout: fit(1.9 * sc, 1.9 * sc, 1.9 * sc), physics: { body: "static", collider: "auto" }, state: brk("concrete", Math.round(140 * sc)) };
  });
  return R;
}
const V = 9;
const GONE = ["l7-tide-s", "l7-lantern", "l7-ring", "l7-boat", "l7-chair", "l7-bulb"]; // v1 leftovers

const CONCRETE = {
  color: "oklch(0.48 0.01 240)",
  roughness: 0.95,
  texture: "cdn/texture-smooth-cold-poured-concrete-wall.png",
  repeat: [1, 1],
  wrap: "repeat",
};
const WOOD = {
  color: "oklch(0.36 0.03 60)",
  roughness: 0.9,
  texture: "cdn/texture-weathered-grey-sea-soaked-wood-planks.png",
  repeat: [1, 1],
  wrap: "repeat",
};
const PAPER = { color: "oklch(0.8 0.05 85)", roughness: 0.95, texture: "cdn/texture-faded-water-stained-vintage-floral-wallpaper.png", repeat: [1, 1], wrap: "repeat" };
const RUST = { color: "oklch(0.38 0.06 45)", metalness: 0.6, roughness: 0.8 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const FY = 4.0; // The landing room floor elevation atop the basalt rock
const PY = 1.1; // Pier deck elevation above sea level (y = 0)

const chalk = (text, w = "1.6m") =>
  `<svg viewBox='0 0 320 120' width='${w}'><text x='160' y='65' text-anchor='middle' font-family='sans-serif' font-weight='600' font-size='22' fill='#d8e2e6' fill-opacity='0.85'>${text}</text></svg>`;

const box = (ctx, id, x, y, z, w, h, d, material, extra = {}) =>
  ctx.spawn(id, {
    feetPosition: { x, y, z },
    physics: "static",
    primitive: { kind: "box", width: w, height: h, depth: d },
    material,
    ...extra,
  });

function lay(ctx) {
  // =========================================================================
  // 1. ROOM 1: THE DROWNED PARLOR / STAIR LANDING (Atop Basalt Rock at y = 4)
  // =========================================================================
  // Flooded concrete chamber: 6.4m x 6.4m x 2.8m high
  box(ctx, "l7-floor", 0, FY - 0.3, 0, 6.4, 0.3, 6.4, { color: "oklch(0.42 0.04 75)", roughness: 1, texture: "cdn/texture-soaked-brown-beige-berber-office-carpet.png", repeat: [1, 1], wrap: "repeat" });
  box(ctx, "l7-ceil", 0, FY + 2.7, 0, 6.4, 0.25, 6.4, { ...CONCRETE, color: "oklch(0.36 0.008 240)" });

  // Walls with North doorway opening out to the ocean
  box(ctx, "l7-wall-e", 3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-w", -3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-n1", -2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n2", 2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n3", 0, FY + 2.1, -3.05, 1.6, 0.6, 0.3, CONCRETE); // Door lintel North
  box(ctx, "l7-wall-s1", -1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s2", 1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s3", 0, FY + 2.2, 3.05, 1.2, 0.5, 0.3, CONCRETE); // Door lintel South

  // Ankle-deep seawater puddle on the room floor with rippling water shader
  ctx.spawn("l7-puddle", {
    feetPosition: { x: 0, y: FY, z: 0 },
    primitive: { kind: "box", width: 5.84, height: 0.32, depth: 5.84 },
    material: { kind: "water", color: "oklch(0.3 0.045 80)", opacity: 0.88, waveIntensity: 0.12 },
  });

  // Green sea-moss and high-tide watermark line on walls
  for (const [id, x, z, w, d] of [["e", 2.89, 0, 0.01, 6.0], ["w", -2.89, 0, 0.01, 6.0], ["s1", -1.9, 2.89, 2.4, 0.01], ["s2", 1.9, 2.89, 2.4, 0.01], ["n1", -2.0, -2.89, 2.2, 0.01], ["n2", 2.0, -2.89, 2.2, 0.01]]) {
    ctx.spawn(`l7-tide-${id}`, {
      feetPosition: { x, y: FY + 0.05, z },
      primitive: { kind: "box", width: w, height: 0.75, depth: d },
      material: { color: "oklch(0.32 0.05 65 / 0.55)", transparent: true, roughness: 1.0 },
    });
  }

  // Staircase ascending into the darkness back to Level 6 (South)
  for (let k = 0; k < 6; k++) {
    box(ctx, `l7-step-${k}`, 0, FY + k * 0.32, 3.4 + k * 0.32, 1.2, 0.32, 0.34, { ...CONCRETE, color: "oklch(0.29 0.008 240)" });
  }
  box(ctx, "l7-shaft-e", 0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE);
  box(ctx, "l7-shaft-w", -0.8, FY, 4.4, 0.4, 3.6, 2.4, CONCRETE);
  box(ctx, "l7-shaft-top", 0, FY + 2.7, 4.4, 1.2, 1.0, 2.4, CONCRETE);
  box(ctx, "l7-shaft-end", 0, FY, 5.7, 1.2, 3.6, 0.3, { color: "oklch(0.01 0 0)" });

  // Transition trigger to return to Level 6
  ctx.spawn("l7-back", {
    feetPosition: { x: 0, y: FY + 1.2, z: 5.1 },
    physics: { body: "static", trigger: true },
    primitive: { kind: "box", width: 1.2, height: 2.2, depth: 0.8 },
    visible: false,
    behavior: "scripts/level-door.js",
    state: { to: "level6#l6-from-l7" },
  });
  ctx.spawn("l7-back-note", {
    feetPosition: { x: -1.88, y: FY + 1.5, z: 2.85 },
    rotation: { yaw: 180 },
    vector: chalk("↑ 6 · LIGHTS OUT"),
  });

  // Arrival spawn point from Level 6 (facing North toward the sea)
  ctx.spawn("l7-from-l6", {
    feetPosition: { x: 0, y: FY + 0.1, z: 1.4 },
    rotation: { yaw: 180 },
  });

  // Flooded room props
  ctx.spawn("l7-tally", {
    feetPosition: { x: 2.88, y: FY + 1.4, z: 0.6 },
    rotation: { yaw: -90 },
    vector: chalk("DAY 9. THE WATER NEVER ENDS"),
  });


  // =========================================================================
  // 2. BASALT ROCK STEPS & TRANSITION DOWN TO PIER
  // =========================================================================
  // Steps descending from the rock top (FY = 4.0) down to the pier deck (PY = 1.1)
  for (let k = 0; k < 6; k++) {
    box(ctx, `l7-rstep-${k}`, 0, FY - 0.5 - k * 0.55, -3.8 - k * 0.9, 1.8, 0.55, 0.95, {
      ...CONCRETE,
      color: "oklch(0.34 0.015 240)",
    });
  }

  // =========================================================================
  // 3. THE WEATHERED STILTED TIMBER PIER (North into the Ocean, z = -9 to -34)
  // =========================================================================
  // Spawn modular high-detail pier sections using l7-ocean-geo.js
  const pierSections = [-12, -18, -24, -30];
  pierSections.forEach((pz, idx) => {
    ctx.spawn(`l7-pier-geo-${idx}`, {
      feetPosition: { x: 0, y: PY, z: pz },
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
    });
  });

  // Static collision boxes for the pier deck and safety
  box(ctx, "l7-pier-deck-col", 0, PY - 0.1, -21.5, 3.4, 0.2, 26, {}, { visible: false });
  // Side safety colliders (prevent falling through gaps while exploring)
  box(ctx, "l7-pier-rail-w", -1.6, PY, -21.5, 0.2, 1.2, 26, {}, { visible: false });
  box(ctx, "l7-pier-rail-e", 1.6, PY, -21.5, 0.2, 1.2, 26, {}, { visible: false });

  // Mooring Bollards on the pier
  ctx.spawn("l7-bollard-1", {
    feetPosition: { x: 1.4, y: PY + 0.04, z: -16 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "bollard" } },
  });
  ctx.spawn("l7-bollard-2", {
    feetPosition: { x: 1.4, y: PY + 0.04, z: -31 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "bollard" } },
  });

  // Maritime Lifebuoy Ring mounted on post
  ctx.spawn("l7-lifebuoy", {
    feetPosition: { x: -1.5, y: PY + 0.5, z: -20 },
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lifebuoy" } },
  });

  // Ship's Hurricane Storm Lanterns along the wharf
  ctx.spawn("l7-lantern-mid", {
    feetPosition: { x: -1.45, y: PY + 0.88, z: -18 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [
      {
        feetPosition: { x: 0, y: 0.22, z: 0 },
        light: { kind: "point", color: "oklch(0.85 0.15 75)", intensity: 1.8, distance: 10 },
      },
    ],
  });
  ctx.spawn("l7-lantern-end", {
    feetPosition: { x: 1.35, y: PY + 0.88, z: -33 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [
      {
        feetPosition: { x: 0, y: 0.22, z: 0 },
        light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.2, distance: 14 },
      },
    ],
  });

  // Chalk warning carved into the wet pierhead timber
  ctx.spawn("l7-pier-note", {
    feetPosition: { x: 0, y: PY + 0.05, z: -32.5 },
    rotation: { pitch: -90, yaw: 180 },
    vector: chalk("IT IS UNDER THE WATER. DO NOT SWIM.", "1.8m"),
  });

  // Weathered Clinker Wooden Rowboat moored alongside the pier
  ctx.spawn("l7-rowboat", {
    feetPosition: { x: 2.5, y: -0.4, z: -31 },
    rotation: { yaw: 14, roll: 3 },
    model: GLB.rowboat, layout: fit(3.8, 1.2, 3.8),
  });

  // Pierhead M.E.G. supply cache

  // =========================================================================
  // 4. NAVIGATIONAL CHANNEL WARNING BUOYS (Bobbing out in the bay)
  // =========================================================================
  const buoys = [
    { id: "l7-buoy-1", x: -22, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 28, z: -72, phase: 1.9 },
    { id: "l7-buoy-3", x: -12, z: -105, phase: 3.5 },
  ];
  buoys.forEach((b) => {
    ctx.spawn(b.id, {
      feetPosition: { x: b.x, y: -0.7, z: b.z },
      model: GLB.buoy, layout: fit(4.2, 4.2, 4.2),
      children: [
        {
          id: `${b.id}-light`,
          feetPosition: { x: 0, y: 3.9, z: 0 },
          light: { kind: "point", color: "oklch(0.85 0.22 45)", intensity: 2.8, distance: 18 },
        },
      ],
    });
  });

  // =========================================================================
  // 5. ENTITY 20: THE THING ON LEVEL 7 (THE LEVIATHAN)
  // =========================================================================
  // Colossal aquatic titan submerged beneath the waves in the bay
  ctx.spawn("l7-leviathan", {
    feetPosition: { x: 30, y: -6.0, z: -75 },
    rotation: { yaw: 70 },
    scale: { x: 6.8, y: 6.8, z: 6.8 },
    model: { id: "/cdn/value.9b4a90ae389f944ed526ecec2050a232d444b96450179d461a5e034d52671d24.glb" },
    children: [
      {
        feetPosition: { x: 0, y: 0.6, z: -1.2 },
        light: { kind: "point", color: "oklch(0.85 0.22 175)", intensity: 5.0, distance: 22 },
      },
      {
        feetPosition: { x: 0.5, y: 0.7, z: -1.1 },
        material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 },
        primitive: { kind: "sphere", radius: 0.09 },
      },
      {
        feetPosition: { x: -0.5, y: 0.7, z: -1.1 },
        material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 },
        primitive: { kind: "sphere", radius: 0.09 },
      },
    ],
  });


  // =========================================================================
  // 7. THE ROOM AS THE WIKI KNOWS IT: bookcase left, coffee table, one chair, one fluorescent lamp
  // =========================================================================
  for (const [id, spec] of Object.entries(breakables(FY, PY))) ctx.spawn(id, spec);
  ctx.spawn("l7-troffer", { feetPosition: { x: 0, y: FY + 2.6, z: 0 }, primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "troffer" } },
    children: [{ feetPosition: { x: 0, y: -0.15, z: 0 }, light: { kind: "point", color: "oklch(0.9 0.09 85)", intensity: 7, distance: 12 } }],
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-buzzing-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 } });
  // a caged work lamp over the sea door, so the room is a light seen from the water
  ctx.spawn("l7-door-lamp", { feetPosition: { x: 0, y: FY + 2.5, z: -3.32 }, primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.11, height: 0.18 }, material: { color: "#ffffff", emissive: "oklch(0.88 0.1 80)", emissiveIntensity: 3 },
    children: [{ feetPosition: { x: 0, y: -0.2, z: -0.3 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 2, distance: 14 } }] });
  // rust weeping down the outer walls under the roofline
  for (let i = 0; i < 9; i++) { const x = -2.9 + i * 0.72 + ((i * 37) % 7) * 0.04, h = 0.8 + ((i * 53) % 5) * 0.3;
    ctx.spawn(`l7-stain-${i}`, { feetPosition: { x, y: FY + 2.85 - h, z: -3.21 }, primitive: { kind: "box", width: 0.08 + (i % 3) * 0.05, height: h, depth: 0.01 }, material: { color: "oklch(0.3 0.05 50 / 0.7)", transparent: true, roughness: 1 } }); }

  // =========================================================================
  // 8. LEVEL 7 IS A ROOM: the concrete ceiling over the whole sea, the room hanging from it, pillars lost in the fog
  // =========================================================================
  const CEIL = { color: "oklch(0.3 0.008 240)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [0.25, 0.25], wrap: "repeat" };
  ctx.spawn("l7-sky-ceiling", { feetPosition: { x: 0, y: 34, z: -100 }, primitive: { kind: "box", width: 1600, height: 3, depth: 1600 }, material: CEIL, castShadow: false });
  ctx.spawn("l7-hanger", { feetPosition: { x: 0, y: FY + 2.85, z: 1 }, primitive: { kind: "box", width: 6.4, height: 34 - FY - 2.85, depth: 9 }, material: { ...CEIL, color: "oklch(0.33 0.008 240)" }, castShadow: false });
  [[-140, -160, 14], [120, -230, 18], [-60, -330, 22], [210, -60, 16], [-230, -40, 16], [40, -420, 24]].forEach(([x, z, w], i) =>
    ctx.spawn(`l7-pillar-${i}`, { feetPosition: { x, y: -30, z }, primitive: { kind: "box", width: w, height: 64, depth: w }, material: CEIL, castShadow: false }));

  // =========================================================================
  // 9. THE ROCK: slumped basalt, tar seeping where the wiki says the deep is made of it
  // =========================================================================
  [[-7, -9, 1.4], [6, 8, 1], [-14, 8, 1.8], [12, -4, 0.9]].forEach(([x, z, r], i) =>
    ctx.spawn(`l7-tar-${i}`, { feetPosition: { x, z, y: { terrain: 0.02 } }, primitive: { kind: "cylinder", radiusTop: r, radiusBottom: r * 1.05, height: 0.04 }, scale: { x: 1, y: 1, z: 0.65 }, material: { color: "oklch(0.1 0.01 60)", roughness: 0.08, metalness: 0.2 } }));

  // =========================================================================
  // 6. SPATIAL MARITIME AUDIO BEDS
  // =========================================================================
  ctx.spawn("l7-sea-bed", {
    feetPosition: { x: 0, y: 2, z: -18 },
    audio: {
      clip: G("vast-open-ocean-waves-rolling-under-overcast-sky-loop"),
      loop: true,
      gain: 0.32,
      spatial: false,
    },
  });
  ctx.spawn("l7-waves-rock", {
    feetPosition: { x: 0, y: 0.5, z: -8 },
    audio: {
      clip: G("heavy-waves-slapping-wet-rocks-and-pier-posts-loop"),
      loop: true,
      gain: 0.55,
      spatial: true,
      refDistance: 12,
      maxDistance: 45,
    },
  });
}

export function tick(ctx) {
  if (ctx.now() - (ctx.session.wreckAt ?? 0) > 5000) { ctx.session.wreckAt = ctx.now(); regrowWrecks(ctx); } // smashed props stand again after an hour
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    for (const id of Object.keys(ctx.place.objects)) if (GONE.includes(id) || /^l7-(plank|post)-/.test(id)) ctx.destroy(id);
    lay(ctx);
    s.builtV = V;
  }

  const now = ctx.now();

  // smashed props grow back after 15 min, never in someone's face
  if (now - (ctx.session.regrowAt ?? -1e9) > 5000) {
    ctx.session.regrowAt = now; s.smashed ??= {};
    for (const [id, spec] of Object.entries(breakables(FY, PY))) {
      if (ctx.place.objects[id]) { if (s.smashed[id]) delete s.smashed[id]; continue; }
      if (!s.smashed[id]) { s.smashed[id] = now; continue; }
      const f = spec.feetPosition;
      if (now - s.smashed[id] > 60 * 60000 && !ctx.place.players.some((p) => Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z) < 8)) { ctx.spawn(id, spec); delete s.smashed[id]; }
    }
  }

  // 1. DYNAMIC OCEAN WATER BOBBING & SWELL
  // Clinker rowboat bobs and sways with the wave period
  const boat = ctx.getObject("l7-rowboat");
  if (boat) {
    const bob = Math.sin(now * 0.0016) * 0.07;
    const roll = Math.cos(now * 0.0012) * 2.8;
    const yawDrift = Math.sin(now * 0.0008) * 1.6;
    boat.feetPosition = { x: 2.5, y: -0.4 + bob, z: -31 };
    boat.rotation = { yaw: 14 + yawDrift, roll: 3 + roll };
  }

  // Warning Buoys bob and pitch with phase offsets
  const buoys = [
    { id: "l7-buoy-1", x: -22, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 28, z: -72, phase: 1.9 },
    { id: "l7-buoy-3", x: -12, z: -105, phase: 3.5 },
  ];
  buoys.forEach((b) => {
    const buoy = ctx.getObject(b.id);
    if (buoy) {
      const bob = Math.sin(now * 0.002 + b.phase) * 0.09;
      const pitch = Math.sin(now * 0.0018 + b.phase) * 4.5;
      const roll = Math.cos(now * 0.0015 + b.phase) * 4.5;
      buoy.feetPosition = { x: b.x, y: -0.7 + bob, z: b.z };
      buoy.rotation = { pitch, roll };
    }
  });

  // 2. THE THING (ENTITY 20) SLOW AQUATIC CRUISE
  // Moves smoothly in a colossal oceanic patrol arc in the deep bay
  const lev = ctx.getObject("l7-leviathan");
  if (lev) {
    const angle = now * 0.00028;
    const lx = 26 + Math.cos(angle) * 14;
    const lz = -75 + Math.sin(angle) * 18;
    const ly = -6.0 + Math.sin(now * 0.0007) * 0.7;
    lev.feetPosition = { x: lx, y: ly, z: lz };
    lev.rotation = { yaw: (-angle * 57.2958) + 90 };
  }

  // 3. PERIODIC DISTANT WHALE GROAN FROM THE DEEP
  if (ctx.place.playerCount && now > (s.groanAt ?? 0)) {
    if (s.groanAt) {
      ctx.emit("playSound", {
        clip: G("deep-whale-like-groan-from-far-under-dark-water"),
        position: { x: 50, y: -10, z: -120 },
        volume: 0.75,
        refDistance: 100,
        maxDistance: 600,
      });
    }
    s.groanAt = now + 65000 + ctx.random() * 65000;
  }

  // 4. THALASSOPHOBIA OBSERVATION AT PIERHEAD
  // When a wanderer reaches the end of the pier and gazes into the dark abyss
  for (const p of ctx.place.players) {
    if (p.feetPosition.z < -28) {
      s.thalClock ??= {};
      const last = s.thalClock[p.id] ?? 0;
      if (now - last > 90000) {
        s.thalClock[p.id] = now;
        p.state.notice = {
          text: "A colossal shadow moves through the black water beneath the waves. The Thing on Level 7 watches.",
          at: now,
        };
        p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 8);
        ctx.emit("screenShake", { intensity: 0.18, duration: 1.2 }, { audience: { player: p.id } });
      }
    }
  }
}
