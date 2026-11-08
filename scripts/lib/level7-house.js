// The Level 7 entrance room (The Drowned Antique Parlor) matching the canonical Wikidot reference photo:
// - Central submerged wooden table with a 3-tier pyramid stack of antique bureau drawers with brass pulls
// - Tall dark walnut antique armoire on the left with open doors, draped white linen towel, and silver tea service
// - Rustic stone masonry fireplace hearth & carved timber mantel on the east wall with turned candlestick
// - Turned round pedestal table on 3 cabriole legs with white porcelain saucer top
// - Wire storage shelving unit with tall emerald-green bottle vase and ceramic planter
// - Antique sideboard credenza with large dried floral bouquet in an urn
// - Antique spindle-back dining chair standing in knee-deep dark reflective floodwater

const HARDWOOD = "cdn/texture-worn-hardwood-grain.png";
const ROCK = "cdn/texture-terrain-wet-dark-basalt-rock.png";
const DAMASK = "cdn/texture-yellow-chevron-damask-wallpaper-aged.png";
const WAINSCOT = { color: "oklch(0.86 0.04 88)", roughness: 0.85 };

export function layHouse(ctx, FY) {
  const sp = (id, spec) => ctx.spawn(`l7h-${id}`, spec);

  // 1. Stacked Antique Bureau Drawers on Submerged Table (Central / Foreground Right, matching reference photo!)
  sp("drawers", {
    tags: ["container", "usable"],
    feetPosition: { x: 0.95, y: FY, z: -0.65 },
    rotation: { yaw: -18 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "drawers" } },
    physics: { body: "static", collider: "box" },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "drawers",
      name: "Stacked bureau drawers",
      verb: "Search drawers",
      info: "Antique mahogany drawers pulled from dressers and stacked above the floodwater.",
      items: "scrap_metal,wire,bobbypin,almond,page:14",
    },
  });

  // 2. Towering Antique Dark Walnut Armoire with open doors, hanging towel, & silver tea service (Left Wall)
  sp("armoire", {
    tags: ["container", "usable"],
    feetPosition: { x: -2.3, y: FY, z: -0.4 },
    rotation: { yaw: 82 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "armoire" } },
    physics: { body: "static", collider: "box" },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "armoire",
      name: "Drowned antique armoire",
      verb: "Search armoire",
      info: "A towering dark walnut wardrobe with open doors, draped linen, and an antique silver tea service.",
      items: "cloth:topw:hoodie:d49b27,bandage,firstaid,almond:blue",
    },
  });

  // 3. Rustic Stone Hearth & Carved Timber Mantel (East Wall)
  sp("hearth", {
    feetPosition: { x: 2.82, y: FY, z: 0.35 },
    rotation: { yaw: -90 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "hearth" } },
    physics: { body: "static", collider: "box" },
  });

  // 4. Turned-Wood Round Pedestal Table with White Saucer Top (Right of camera / beside hearth)
  sp("pedestal", {
    feetPosition: { x: 2.15, y: FY, z: -1.35 },
    rotation: { yaw: 25 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "pedestal" } },
    physics: { body: "static", collider: "box" },
  });

  // 5. Wire Shelving Unit with Emerald Green Bottle Vase & Ceramic Planter (Beside Armoire)
  sp("wirerack", {
    feetPosition: { x: -2.38, y: FY, z: 1.55 },
    rotation: { yaw: 85 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "wirerack" } },
    physics: { body: "static", collider: "box" },
  });

  // 6. Antique Sideboard Credenza with Large Dried Floral Bouquet in Ceramic Urn (South-East Wall)
  sp("sideboard-base", {
    feetPosition: { x: -0.85, y: FY, z: 2.35 },
    rotation: { yaw: 180 },
    primitive: { kind: "box", width: 1.35, height: 0.95, depth: 0.52 },
    material: { color: "oklch(0.28 0.04 45)", roughness: 0.5, texture: HARDWOOD },
    physics: { body: "static", collider: "box" },
  });
  sp("bouquet", {
    feetPosition: { x: -0.85, y: FY + 0.95, z: 2.35 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "bouquet" } },
  });

  // 7. Antique Turned Spindle Chair standing in the knee-deep floodwater
  sp("chair", {
    feetPosition: { x: 1.65, y: FY, z: 0.55 },
    rotation: { yaw: -65 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "chair" } },
    physics: { body: "static", collider: "box" },
  });

  // 8. Faded Vintage Damask Wallpaper Panels on Upper Walls (above wainscot chair rail)
  const DAMASK_MAT = {
    color: "oklch(0.58 0.04 85)",
    roughness: 0.9,
    texture: DAMASK,
    repeat: [1.2, 0.8],
    wrap: "repeat",
  };
  sp("paper-w", { feetPosition: { x: -2.87, y: FY + 1.15, z: 0 }, primitive: { kind: "box", width: 0.01, height: 1.5, depth: 5.8 }, material: DAMASK_MAT });
  sp("paper-e", { feetPosition: { x: 2.87, y: FY + 1.15, z: 0 }, primitive: { kind: "box", width: 0.01, height: 1.5, depth: 5.8 }, material: DAMASK_MAT });
  sp("paper-s1", { feetPosition: { x: -1.9, y: FY + 1.15, z: 2.87 }, primitive: { kind: "box", width: 2.3, height: 1.5, depth: 0.01 }, material: DAMASK_MAT });
  sp("paper-s2", { feetPosition: { x: 1.9, y: FY + 1.15, z: 2.87 }, primitive: { kind: "box", width: 2.3, height: 1.5, depth: 0.01 }, material: DAMASK_MAT });

  // 9. Floating Waterlogged Flotsam in the Floodwater (wooden drawer divider & drift paper)
  sp("flotsam-wood", {
    feetPosition: { x: 0.25, y: FY + 0.31, z: 0.4 },
    rotation: { yaw: 35, roll: 4 },
    primitive: { kind: "box", width: 0.45, height: 0.02, depth: 0.12 },
    material: { color: "oklch(0.32 0.04 50)", roughness: 0.9, texture: HARDWOOD },
  });
  sp("flotsam-paper", {
    feetPosition: { x: -0.45, y: FY + 0.32, z: -0.8 },
    rotation: { yaw: -18, pitch: -2 },
    primitive: { kind: "box", width: 0.22, height: 0.005, depth: 0.28 },
    material: { color: "oklch(0.82 0.02 85)", roughness: 0.95 },
  });

  // 10. Ambient water drop sound in the drowned parlor
  sp("drip-audio", {
    feetPosition: { x: 0, y: FY + 1.5, z: 0 },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-water-drop-single-echo-cave.mp3", loop: true, gain: 0.35, spatial: true, maxDistance: 12 },
  });
}
