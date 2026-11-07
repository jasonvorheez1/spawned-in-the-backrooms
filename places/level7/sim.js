// Level 7 "Thalassophobia" Simulation:
// Wikidot Backrooms Level 7 - An infinite subterranean ocean beneath a towering concrete ceiling void.
// - Room 1 ("The Floating House" / Drowned Parlor): knee-deep floodwater, floral wallpaper, white wainscoting,
//   stone hearth, stacked drawers on the coffee table, bookcase, wire rack, armchair, and buzzing fluorescent tube.
// - Stilted Timber Pier, Ferry Rowboats & Drifting Furniture Flotsam Rafts across the Daylight Zone.
// - Near Island (x: 46, z: -120): M.E.G. Outpost "Seawatch" with Salvage Workbench, Deep-Trench Sonar Console,
//   Warming Brazier, Locked Dive Locker, and Specialist Diver Vance.
// - Far Island (x: -95, z: -230): "Fort Surrender" (Society of the Pushing) with Lashed-Furniture Palisades,
//   Leviathan Ribcage Tar Altar, Seawater Distillation Still, Brother Jude & Sister Mara (Trader),
//   and the Submersible Diving Bell over the Underwater Tar Cavern toward Level 8 ("Cave System").
// - Dual Abyssal Titans: Entity 20 ("The Thing on Level 7") and "Tiny" prowling the Twilight & Midnight Zones.

import { keepPeople, every } from "../../scripts/lib/level-kit.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
export const cadence = "2s";

// Tripo models for the props (Savi, Nov 7): each fits a layout box; breakables take tag + { mat, hp, maxHp } (lib/breakables.js)
const GLB = {
  dresser: "/cdn/value.6b73846286fe58c95018a876f85d847e8af3c7a0187d06a8838072345f9ca49e.glb",
  sideboard: "/cdn/value.4594d9a21e6d7e2e5f94a71011243747c652c77035a1fc981fbcf4bee983324f.glb",
  floorlamp: "/cdn/value.0871d1626b929961d73cb28c05f82070ad822c5cc2e6b8deec5046248fb4086d.glb",
  plant: "/cdn/value.88c7684212164aa0495a65fc294a12752ef506c35708f70485202b9366795b43.glb",
  boxes: "/cdn/value.03043a5c4b3b53a18930a0c88c7326a0dc9d5b573d956151044390dfab77c966.glb",
  painting: "/cdn/value.4a21d3a89bea899be89b163f7a8f7dff6154ed42a4cc293f4dc61d1417ddb01d.glb",
  vase: "/cdn/value.b0e16d774955bb71599f3de00b0530daf0091b38a420dd17e70fd067c6fc317e.glb",
  debris: "/cdn/value.8d1753333c511dbe2a78f3262c0c0a43906f3f976c835839c27c1540ade2075d.glb",
  armchair: "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb",
  bookcase: "/cdn/value.e5cb5f63f8bafd91816ef7385146f9277f104159e7e936e7c42095649e736239.glb",
  boulder: "/cdn/value.42d919dcb3a5731dd59103721bf944cc852d5f72e23cbb63b6c5050708d6593c.glb",
  buoy: "/cdn/value.d5523049085d74c40e3d4beced2fa139b38ef940839ffff99aae7f482aeff80c.glb",
  crate: "/cdn/value.f486431ac39339f8b882a258015ef61fde74d5aebc0c828678d0af923f2d02d9.glb",
  rowboat: "/cdn/value.a8149ca591b3615ade17735a3a0a1e972028c35be8f1351899565924f9d32a16.glb",
  table: "/cdn/value.ae333c2667c26f3447936196f710a35594496dcf39c35d76b8c06a720189174d.glb",
  thing: "/cdn/value.9b4a90ae389f944ed526ecec2050a232d444b96450179d461a5e034d52671d24.glb",
};

const fit = (w, h, d) => ({ box: { min: { x: -w / 2, y: 0, z: -d / 2 }, max: { x: w / 2, y: h, z: d / 2 } } });
const brk = (mat, hp) => ({ mat, hp, maxHp: hp });

// Every breakable here, by id: laid with the level, re-laid 15 min after it is smashed (nobody within 8 m)
export function breakables(FY, PY) {
  const R = {
    // ---- Room 1 (The Floating House / Drowned Parlor) ----
    "l7-crate": { tags: ["container", "breakable"], feetPosition: { x: -2.1, y: FY, z: -1.8 }, rotation: { yaw: 12 }, model: GLB.crate, layout: fit(0.8, 0.8, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Waterlogged M.E.G. crate", items: "almond,ration,wire,battery", ...brk("wood", 45) } },
    "l7-pier-crate": { tags: ["container", "breakable"], feetPosition: { x: -0.9, y: PY + 0.04, z: -32.5 }, rotation: { yaw: -20 }, model: GLB.crate, layout: fit(0.6, 0.6, 0.6), physics: { body: "static", collider: "box" }, state: { name: "Salt-crusted maritime locker", items: "weapon:fishing_rod,cloth:topw:hoodie:d49b27,almond,battery,bandage", ...brk("wood", 35) } },
    "l7-bookcase": { tags: ["breakable"], feetPosition: { x: -2.72, y: FY, z: 0.3 }, rotation: { yaw: 0 }, model: GLB.bookcase, layout: fit(1.5, 2.3, 1.5), physics: { body: "static", collider: "box" }, state: brk("wood", 90) },
    "l7-armchair": { tags: ["breakable"], feetPosition: { x: 1.7, y: FY, z: 0.2 }, rotation: { yaw: -115 }, model: GLB.armchair, layout: fit(0.95, 0.95, 0.95), physics: { body: "static", collider: "box" }, state: brk("wood", 50) },
    "l7-table": { tags: ["breakable"], feetPosition: { x: 1.15, y: FY, z: -0.9 }, rotation: { yaw: 8 }, model: GLB.table, layout: fit(1.15, 0.5, 1.15), physics: { body: "static", collider: "box" }, state: brk("wood", 40) },
    "l7-dresser": { tags: ["container", "breakable"], feetPosition: { x: 2.4, y: FY, z: -2.15 }, rotation: { yaw: 84 }, model: GLB.dresser, layout: fit(1.0, 1.1, 1.0), physics: { body: "static", collider: "box" }, state: { name: "Swollen chest of drawers", items: "almond,bandage,bobbypin", ...brk("wood", 70) } },
    "l7-dresser-top": { tags: ["breakable"], feetPosition: { x: 1.15, y: FY + 0.5, z: -0.9 }, rotation: { yaw: 172, roll: 4 }, model: GLB.dresser, layout: fit(0.75, 0.8, 0.75), physics: { body: "static", collider: "box" }, state: brk("wood", 50) },
    "l7-sideboard": { tags: ["container", "breakable"], feetPosition: { x: 2.42, y: FY, z: 2.2 }, rotation: { yaw: 90 }, model: GLB.sideboard, layout: fit(1.15, 1.25, 1.15), physics: { body: "static", collider: "box" }, state: { name: "Waterlogged sideboard", items: "ration,battery", ...brk("wood", 80) } },
    "l7-boxes": { tags: ["breakable"], feetPosition: { x: 1.25, y: FY, z: 2.45 }, rotation: { yaw: 6 }, model: GLB.boxes, layout: fit(0.8, 1.05, 0.8), physics: { body: "static", collider: "box" }, state: { items: "wire", ...brk("wood", 20) } },
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

    // ---- Daylight Zone Drifting Flotsam Salvage ----
    "l7-flotsam-crate-0": { tags: ["container", "breakable"], feetPosition: { x: 8.2, y: 0.22, z: -43.5 }, rotation: { yaw: 35 }, model: GLB.crate, layout: fit(0.7, 0.7, 0.7), physics: { body: "static", collider: "box" }, state: { name: "Drifting flotsam crate", items: "almond,wire,bobbypin,cloth:hat:beanie:d46a28", ...brk("wood", 35) } },
    "l7-flotsam-crate-1": { tags: ["container", "breakable"], feetPosition: { x: 25.5, y: 0.22, z: -69.5 }, rotation: { yaw: -40 }, model: GLB.crate, layout: fit(0.7, 0.7, 0.7), physics: { body: "static", collider: "box" }, state: { name: "Barnacled cargo box", items: "ration,shells,bandage,cloth:botw:overalls:28322c", ...brk("wood", 40) } },

    // ---- Near Island (M.E.G. Outpost Seawatch, y = 7.0) ----
    "l7-meg-locker": { tags: ["container", "breakable"], feetPosition: { x: 42.5, y: 7.0, z: -117.5 }, rotation: { yaw: 25 }, model: GLB.crate, layout: fit(0.85, 0.85, 0.85), physics: { body: "static", collider: "box" }, state: { name: "M.E.G. Waterproof Dive Locker", lock: "lockpick:35", items: "weapon:revolver,cloth:topw:jacket:2b4c5e,cloth:shoes:boots:1c1e22,ammo,kit,blue,battery", ...brk("wood", 95) } },
    "l7-seawatch-boxes": { tags: ["container", "breakable"], feetPosition: { x: 48.2, y: 7.0, z: -116.5 }, rotation: { yaw: -15 }, model: GLB.boxes, layout: fit(0.8, 1.0, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Seawatch supply cartons", items: "almond,tape,fuse,ration", ...brk("wood", 30) } },

    // ---- Far Island (Fort Surrender, y = 11.0) ----
    "l7-cult-chest": { tags: ["container", "breakable"], feetPosition: { x: -91.5, y: 11.0, z: -232.0 }, rotation: { yaw: -60 }, model: GLB.sideboard, layout: fit(1.1, 1.15, 1.1), physics: { body: "static", collider: "box" }, state: { name: "Fort Surrender Reliquary Chest", lock: "lockpick:45", items: "weapon:carbine,cloth:topw:apron:1c282e,cloth:neck:cape:c85a28,ammo,shells,royal_ration,firesalt,firstaid", ...brk("wood", 110) } },
    "l7-fort-dresser": { tags: ["container", "breakable"], feetPosition: { x: -98.5, y: 11.0, z: -226.5 }, rotation: { yaw: 15 }, model: GLB.dresser, layout: fit(1.0, 1.1, 1.0), physics: { body: "static", collider: "box" }, state: { name: "Lashed drift-furniture cabinet", items: "almond,bandage,bobbypin,cloth:hat:cap:b88838", ...brk("wood", 65) } },
    "l7-fort-crate": { tags: ["container", "breakable"], feetPosition: { x: -93.0, y: 11.0, z: -224.0 }, rotation: { yaw: 110 }, model: GLB.crate, layout: fit(0.8, 0.8, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Tar-caulked provision crate", items: "meat:fish,ration,almond,battery", ...brk("wood", 50) } },
  };

  // Basalt boulders across the Entrance Rock, Seawatch Island, and Fort Surrender for 7DTD stone/concrete harvesting
  [
    [-9, -6, 1.3, 1], [-12, 4, 1.8, 2], [8, -7, 1.1, 3], [13, 2, 2.2, 4], [-6, 12, 1.5, 5],
    [10, 11, 1.2, 6], [-17, -3, 2.6, 7], [17, -9, 2, 8], [3, -11, 0.8, 9], [-4, -9, 0.7, 10],
    [36, -126, 1.6, 11], [55, -114, 1.9, 12], [-82, -238, 2.1, 13], [-106, -220, 1.8, 14],
  ].forEach(([x, z, sc, seed], i) => {
    R[`l7-boulder-${i}`] = { tags: ["breakable"], feetPosition: { x, z, y: { terrain: -0.15 * sc } }, rotation: { yaw: seed * 47 }, model: GLB.boulder, layout: fit(1.9 * sc, 1.9 * sc, 1.9 * sc), physics: { body: "static", collider: "auto" }, state: brk("concrete", Math.round(140 * sc)) };
  });
  return R;
}

const V = 11;
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
const WAINSCOT = { color: "oklch(0.84 0.02 85)", roughness: 0.75, texture: "cdn/texture-weathered-wood-planks.png", repeat: [3, 1], wrap: "repeat" };
const RUST = { color: "oklch(0.38 0.06 45)", metalness: 0.6, roughness: 0.8 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const FY = 4.0; // The landing room floor elevation atop the basalt rock
const PY = 1.1; // Pier deck elevation above sea level (y = 0)

const chalk = (text, w = "1.6m") =>
  `<svg viewBox='0 0 360 120' width='${w}'><text x='180' y='65' text-anchor='middle' font-family='sans-serif' font-weight='600' font-size='21' fill='#d8e2e6' fill-opacity='0.88'>${text}</text></svg>`;

const box = (ctx, id, x, y, z, w, h, d, material, extra = {}) =>
  ctx.spawn(id, {
    feetPosition: { x, y, z },
    physics: "static",
    primitive: { kind: "box", width: w, height: h, depth: d },
    material,
    ...extra,
  });

// Level 7 NPC definitions (Seawatch M.E.G. Outpost & Fort Surrender)
const L7_NPCS = {
  "l7-vance": {
    name: "Diver Vance · M.E.G. Outpost Seawatch",
    role: "quarter",
    voice: "reyes",
    faction: "meg",
    factionName: "M.E.G. Outpost Seawatch (marine research & salvage station on Level 7's near island)",
    gun: "shotgun",
    at: [46.0, 7.0, -119.5],
    yaw: 165,
    rounds: [
      { x: 46.0, y: 7.0, z: -119.5, dwell: 18, act: null, look: { x: 48.0, z: -124.5 } },
      { x: 47.2, y: 7.0, z: -123.5, dwell: 14, act: null, look: { x: 30.0, z: -140.0 } },
      { x: 44.5, y: 7.0, z: -117.5, dwell: 16, act: null, look: { x: 43.0, z: -118.0 } },
    ],
    look: { species: "otter", sex: "m", eye: "#38a89d", belly: "#e6d2b5", nose: "#221814", topw: "jacket", top: "#1e3b4b", botw: "overalls", bottom: "#28322c", shoes: "boots", shoec: "#141618", hat: "cap", hatc: "#b88838", eyew: "none", neck: "cape", neckc: "#c85a28", expr: "calm" }, // Seawatch dive coat, tar-caulked waders, lead-ballast boots, brass-rimmed dive hood, cork lifebelt mantle
  },
  "l7-jude": {
    name: "Brother Jude · Fort Surrender",
    role: "scout",
    voice: "hollis",
    faction: "surrender",
    factionName: "Fort Surrender (The Society of the Pushing, who surrendered to Thalassophobia and revere The Thing on Level 7)",
    gun: "wrench",
    at: [-95.0, 11.0, -232.5],
    yaw: 0,
    rounds: [
      { x: -95.0, y: 11.0, z: -232.5, dwell: 24, act: null, look: { x: -95.0, z: -236.0 } },
      { x: -92.5, y: 11.0, z: -227.5, dwell: 15, act: null, look: { x: -85.0, z: -215.0 } },
      { x: -97.5, y: 11.0, z: -230.0, dwell: 18, act: null, look: { x: -108.0, z: -250.0 } },
    ],
    look: { species: "deer", sex: "m", eye: "#5ae0d0", belly: "#d8cbb8", nose: "#1e1816", topw: "apron", top: "#1c282e", botw: "overalls", bottom: "#28322c", shoes: "boots", shoec: "#141618", neck: "cape", neckc: "#3a4e54", expr: "calm" },
  },
  "l7-mara": {
    name: "Sister Mara · Fort Surrender Trader",
    role: "trader",
    voice: "mags",
    faction: "surrender",
    factionName: "Fort Surrender (The Society of the Pushing, quartermaster and salvager on Level 7)",
    gun: "knife",
    at: [-92.0, 11.0, -227.0],
    yaw: -45,
    rounds: [
      { x: -92.0, y: 11.0, z: -227.0, dwell: 28, act: null, look: { x: -95.0, z: -229.0 } },
      { x: -96.5, y: 11.0, z: -227.5, dwell: 16, act: null, look: { x: -98.0, z: -226.5 } },
    ],
    look: { species: "raccoon", sex: "f", eye: "#e0a838", belly: "#dcd8d0", nose: "#1c1816", topw: "hoodie", top: "#3a4842", botw: "overalls", bottom: "#28322c", shoes: "boots", shoec: "#1c1e22", hat: "beanie", hatc: "#24343e", expr: "smirk" },
  },
};

function spawnL7People(ctx) {
  Promise.all([
    import("../../scripts/lib/critter-model.js"),
    import("../../scripts/lib/clothes.js"),
    import("../../scripts/lib/stats.js"),
    import("../../scripts/lib/weapon-look.js"),
  ]).then(([{ critterSpec }, { npcLook }, { npcState }, { weaponBody }]) => {
    for (const [id, g] of Object.entries(L7_NPCS)) {
      if (ctx.place.objects[id]) continue;
      ctx.spawn(id, {
        tags: ["npc", "l7-npc"],
        feetPosition: { x: g.at[0], y: g.at[1], z: g.at[2] },
        rotation: { yaw: g.yaw },
        physics: "character",
        ...critterSpec(npcLook(id, g.look, "l7", 15)),
        behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: {
          name: g.name,
          role: g.role,
          voice: g.voice,
          faction: g.faction,
          factionName: g.factionName,
          rounds: g.rounds,
          ri: 0,
          home: { x: g.at[0], z: g.at[2] },
          ...npcState(ctx, "agent", 140),
        },
      });
      if (g.gun) {
        ctx.spawn({
          parent: id,
          attachment: { bone: "RightHand" },
          state: { kind: g.gun },
          ...weaponBody(g.gun),
        });
      }
    }
  });
}

function lay(ctx) {
  // =========================================================================
  // 1. ROOM 1: THE FLOATING HOUSE / DROWNED PARLOR (Atop Basalt Rock at y = 4)
  // =========================================================================
  // Flooded parlor chamber: 6.4m x 6.4m x 2.8m high
  box(ctx, "l7-floor", 0, FY - 0.3, 0, 6.4, 0.3, 6.4, {
    color: "oklch(0.42 0.04 75)",
    roughness: 1,
    texture: "cdn/texture-soaked-brown-beige-berber-office-carpet.png",
    repeat: [1, 1],
    wrap: "repeat",
  });
  box(ctx, "l7-ceil", 0, FY + 2.7, 0, 6.4, 0.25, 6.4, { ...CONCRETE, color: "oklch(0.36 0.008 240)" });

  // Walls with faded vintage wallpaper & North doorway opening out to the ocean
  box(ctx, "l7-wall-e", 3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-w", -3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-n1", -2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n2", 2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n3", 0, FY + 2.1, -3.05, 1.6, 0.6, 0.3, CONCRETE); // Door lintel North
  box(ctx, "l7-wall-s1", -1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s2", 1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s3", 0, FY + 2.2, 3.05, 1.2, 0.5, 0.3, CONCRETE); // Door lintel South

  // White vertical beadboard wainscoting paneling along the lower walls (matching the Wikidot photo!)
  for (const [id, x, z, w, d] of [
    ["e", 2.88, 0, 0.03, 5.9],
    ["w", -2.88, 0, 0.03, 5.9],
    ["s1", -1.9, 2.88, 2.3, 0.03],
    ["s2", 1.9, 2.88, 2.3, 0.03],
    ["n1", -2.0, -2.88, 2.1, 0.03],
    ["n2", 2.0, -2.88, 2.1, 0.03],
  ]) {
    ctx.spawn(`l7-wainscot-${id}`, {
      feetPosition: { x, y: FY, z },
      primitive: { kind: "box", width: w, height: 1.15, depth: d },
      material: WAINSCOT,
    });
  }

  // Knee-deep dark reflective floodwater inside the parlor
  ctx.spawn("l7-puddle", {
    feetPosition: { x: 0, y: FY, z: 0 },
    primitive: { kind: "box", width: 5.84, height: 0.32, depth: 5.84 },
    material: { kind: "water", color: "oklch(0.26 0.04 75)", opacity: 0.9, waveIntensity: 0.1 },
  });

  // Wikidot lore: Hydro-static doorway meniscus where the Floating House's internal gravity meets the ocean air
  ctx.spawn("l7-meniscus", {
    feetPosition: { x: 0, y: FY, z: -3.02 },
    primitive: { kind: "box", width: 1.56, height: 2.1, depth: 0.02 },
    material: { color: "oklch(0.7 0.08 215 / 0.14)", transparent: true, roughness: 0.1 },
  });

  // High-tide brown flood stain line on walls
  for (const [id, x, z, w, d] of [
    ["e", 2.86, 0, 0.01, 6.0],
    ["w", -2.86, 0, 0.01, 6.0],
    ["s1", -1.9, 2.86, 2.4, 0.01],
    ["s2", 1.9, 2.86, 2.4, 0.01],
    ["n1", -2.0, -2.86, 2.2, 0.01],
    ["n2", 2.0, -2.86, 2.2, 0.01],
  ]) {
    ctx.spawn(`l7-tide-${id}`, {
      feetPosition: { x, y: FY + 0.05, z },
      primitive: { kind: "box", width: w, height: 0.72, depth: d },
      material: { color: "oklch(0.32 0.05 65 / 0.55)", transparent: true, roughness: 1.0 },
    });
  }

  // Wikidot reference photo architectural details inside Room 1:
  // 1) Stone chimney hearth & timber mantelpiece on the East wall
  ctx.spawn("l7-hearth", {
    feetPosition: { x: 2.72, y: FY, z: 0.55 },
    rotation: { yaw: -90 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "hearth" } },
  });
  // 2) Turned-wood round pedestal table with white saucer top beside the hearth
  ctx.spawn("l7-pedestal", {
    feetPosition: { x: 2.25, y: FY, z: -0.35 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "pedestal" } },
  });
  // 3) Metal wire shelving rack with emerald-green bottle vase & ceramic planter beside the armchair
  ctx.spawn("l7-wirerack", {
    feetPosition: { x: -1.65, y: FY, z: 2.15 },
    rotation: { yaw: 180 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "wirerack" } },
  });
  // 4) Draped white fabric sheet hanging off the left bookcase edge (as in the photo)
  ctx.spawn("l7-cloth-drape", {
    feetPosition: { x: -2.32, y: FY + 0.75, z: -0.38 },
    rotation: { yaw: 12, roll: -6 },
    primitive: { kind: "box", width: 0.08, height: 1.15, depth: 0.42 },
    material: { color: "oklch(0.9 0.015 85)", roughness: 0.9 },
  });

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

  ctx.spawn("l7-tally", {
    feetPosition: { x: 2.84, y: FY + 1.55, z: -1.3 },
    rotation: { yaw: -90 },
    vector: chalk("DAY 9. THE WATER NEVER ENDS"),
  });

  // =========================================================================
  // 2. BASALT ROCK STEPS & TRANSITION DOWN TO PIER
  // =========================================================================
  for (let k = 0; k < 6; k++) {
    box(ctx, `l7-rstep-${k}`, 0, FY - 0.5 - k * 0.55, -3.8 - k * 0.9, 1.8, 0.55, 0.95, {
      ...CONCRETE,
      color: "oklch(0.34 0.015 240)",
    });
  }

  // =========================================================================
  // 3. THE WEATHERED STILTED TIMBER PIER (North into the Ocean, z = -9 to -34)
  // =========================================================================
  const pierSections = [-12, -18, -24, -30];
  pierSections.forEach((pz, idx) => {
    ctx.spawn(`l7-pier-geo-${idx}`, {
      feetPosition: { x: 0, y: PY, z: pz },
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
    });
  });

  // Static collision boxes for the pier deck and side railings
  box(ctx, "l7-pier-deck-col", 0, PY - 0.1, -21.5, 3.4, 0.2, 26, {}, { visible: false });
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
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.15 75)", intensity: 1.8, distance: 10 } }],
  });
  ctx.spawn("l7-lantern-end", {
    feetPosition: { x: 1.35, y: PY + 0.88, z: -33 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.2, distance: 14 } }],
  });

  // Chalk warning carved into the wet pierhead timber
  ctx.spawn("l7-pier-note", {
    feetPosition: { x: 0, y: PY + 0.05, z: -32.5 },
    rotation: { pitch: -90, yaw: 180 },
    vector: chalk("IT IS UNDER THE WATER. TAKE THE SKIFF.", "1.9m"),
  });

  // Salvaged Fishing Rods resting at the Entrance Pier and Seawatch Jetty (ready to pick up and cast!)
  for (const [rid, rx, ry, rz, ryaw] of [
    ["l7-rod-pier", 0.95, PY + 0.04, -31.2, 155],
    ["l7-rod-seawatch", 37.1, PY + 0.04, -93.6, -140],
  ]) {
    ctx.spawn(rid, {
      tags: ["weapon"],
      state: { kind: "fishing_rod" },
      feetPosition: { x: rx, y: ry, z: rz },
      rotation: { yaw: ryaw },
      primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: "fishing_rod" } },
    });
  }

  // Interactive Ferry Rowboat moored at the Entrance Pier -> rows to M.E.G. Outpost Seawatch!
  ctx.spawn("l7-rowboat", {
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: 2.3, y: -0.4, z: -31 },
    rotation: { yaw: 14, roll: 3 },
    model: { id: GLB.rowboat, forward: "+x" }, // the dory was built along X: its bow turned onto -Z, the way you row
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js", // a boat you row yourself: E sits, WASD rows, E steps out
    state: { name: "Moored wooden dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true },
  });

  // =========================================================================
  // 3B. DRIFTING FURNITURE FLOTSAM RAFTS IN THE DAYLIGHT ZONE
  // =========================================================================
  const rafts = [
    { id: "l7-raft-0", x: 8, z: -44, yaw: 18 },
    { id: "l7-raft-1", x: 17, z: -57, yaw: -25 },
    { id: "l7-raft-2", x: 26, z: -70, yaw: 12 },
    { id: "l7-raft-3", x: 33, z: -82, yaw: -14 },
  ];
  rafts.forEach((rf) => {
    ctx.spawn(rf.id, {
      feetPosition: { x: rf.x, y: 0.02, z: rf.z },
      rotation: { yaw: rf.yaw },
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "raft" } },
    });
    box(ctx, `${rf.id}-col`, rf.x, 0.08, rf.z, 3.3, 0.2, 2.8, {}, { visible: false, rotation: { yaw: rf.yaw } });
  });

  // =========================================================================
  // 3C. NEAR ISLAND (x: 46, z: -120, y = 7.0): M.E.G. OUTPOST "SEAWATCH"
  // =========================================================================
  // Seawatch South Jetty (x: 38, z: -93, y = 1.1)
  ctx.spawn("l7-seawatch-pier-0", {
    feetPosition: { x: 38, y: PY, z: -92 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  ctx.spawn("l7-seawatch-pier-1", {
    feetPosition: { x: 38, y: PY, z: -98 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  box(ctx, "l7-seawatch-pier-col", 38, PY - 0.1, -95, 3.4, 0.2, 13, {}, { visible: false });
  ctx.spawn("l7-seawatch-lantern", {
    feetPosition: { x: 36.6, y: PY + 0.88, z: -90 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.5, distance: 16 } }],
  });

  // Stone steps climbing Seawatch Island from Jetty (y = 1.1) to Summit (y = 7.0)
  for (let k = 0; k < 10; k++) {
    box(ctx, `l7-sw-step-${k}`, 38 + k * 0.65, PY + 0.4 + k * 0.58, -101.5 - k * 1.3, 2.2, 0.6, 1.4, {
      ...CONCRETE,
      color: "oklch(0.35 0.015 240)",
    });
  }

  // Ferry Skiff back to Entrance Pier
  ctx.spawn("l7-boat-to-pier", { // rowed by hand like the pier dory (Shelly: "why is it just fast travel now")
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: 35.6, y: -0.4, z: -91.5 },
    rotation: { yaw: -12, roll: -2 },
    model: { id: GLB.rowboat, forward: "+x" },
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js",
    state: { name: "Seawatch dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true, home: { x: 35.6, z: -91.5, yaw: -12 } },
  });

  // Ferry Skiff onward to Fort Surrender (Far Island)
  ctx.spawn("l7-boat-to-fort", { // rowed by hand like the pier dory (Shelly: "why is it just fast travel now")
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: 40.4, y: -0.4, z: -92.5 },
    rotation: { yaw: 145, roll: 3 },
    model: { id: GLB.rowboat, forward: "+x" },
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js",
    state: { name: "Deep-water outrigger dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true, home: { x: 40.4, z: -92.5, yaw: 145 } },
  });

  // Seawatch Outpost Summit Checkpoint & Signboard (x: 46, y: 7.0, z: -120)
  ctx.spawn("l7-seawatch-spawn", { feetPosition: { x: 45.0, y: 7.1, z: -116.0 }, rotation: { yaw: 180 } });
  ctx.spawn("l7-seawatch-sign", {
    feetPosition: { x: 44.5, y: 9.2, z: -114.5 },
    rotation: { yaw: 0 },
    primitive: { kind: "box", width: 2.8, height: 0.55, depth: 0.06 },
    material: { color: "oklch(0.24 0.03 230)" },
    ui: '<div face="front" width="2.8m" style="font-size:135px;font-weight:900;color:#9fe8ff;text-align:center;line-height:1.05">M.E.G. OUTPOST SEAWATCH<div style="font-size:66px;color:#cfe8f0">HYDROPHONE ARRAY 07 · SALVAGE &amp; WORKBENCH</div></div>',
  });

  // M.E.G. Salvage Workbench (7DTD / Fallout crafting bench!)
  box(ctx, "l7-bench", 43.8, 7.0, -120.5, 1.6, 0.85, 0.8, WOOD, {
    tags: ["bench"],
    state: { name: "M.E.G. Marine Salvage Workbench" },
    children: [
      { feetPosition: { x: 0, y: 1.6, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.12 80)", intensity: 2.6, distance: 11 } },
    ],
  });

  // Warming Driftwood & Oil-Drum Brazier at Seawatch
  ctx.spawn("l7-brazier-seawatch", {
    tags: ["usable"],
    feetPosition: { x: 46.8, y: 7.0, z: -118.2 },
    physics: "static",
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "brazier" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "brazier",
      name: "Driftwood warming brazier",
      verb: "Warm hands & dry gear",
      info: "Restores health, sanity & warmth",
      tint: "#ff9e58",
      c: { x: 46.8, y: 7.6, z: -118.2 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.1, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.18 50)", intensity: 3.2, distance: 14 } },
    ],
  });

  // M.E.G. Deep-Trench Hydrophone & Sonar Console
  ctx.spawn("l7-sonar", {
    tags: ["usable"],
    feetPosition: { x: 47.8, y: 7.0, z: -124.8 },
    rotation: { yaw: 180 },
    physics: "static",
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "sonar" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "sonar",
      name: "M.E.G. Deep-Trench Sonar Console",
      verb: "Ping Abyssal Trench",
      info: "Track Entity 20 & 'Tiny' [Science / Survival]",
      tint: "#58f2c8",
      c: { x: 47.8, y: 7.9, z: -124.8 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.3, z: 0.3 }, light: { kind: "point", color: "oklch(0.8 0.18 165)", intensity: 1.8, distance: 7 } },
    ],
  });

  // =========================================================================
  // 3D. FAR ISLAND (x: -95, z: -230, y = 11.0): FORT SURRENDER (WIKIDOT FACTION)
  // =========================================================================
  // Fort Surrender Southeast Wharf (x: -72, y: 1.1, z: -193)
  ctx.spawn("l7-fort-pier-0", {
    feetPosition: { x: -72, y: PY, z: -192 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  ctx.spawn("l7-fort-pier-1", {
    feetPosition: { x: -72, y: PY, z: -198 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  box(ctx, "l7-fort-pier-col", -72, PY - 0.1, -195, 3.4, 0.2, 13, {}, { visible: false });
  ctx.spawn("l7-fort-lantern", {
    feetPosition: { x: -70.6, y: PY + 0.88, z: -190 },
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.5, distance: 16 } }],
  });

  // Ferry Skiff from Fort Surrender back to M.E.G. Seawatch
  ctx.spawn("l7-boat-from-fort", { // rowed by hand like the pier dory (Shelly: "why is it just fast travel now")
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: -69.5, y: -0.4, z: -192.5 },
    rotation: { yaw: -35, roll: 2 },
    model: { id: GLB.rowboat, forward: "+x" },
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js",
    state: { name: "Fort Surrender dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true, home: { x: -69.5, z: -192.5, yaw: -35 } },
  });

  // Winding stone steps from Fort Surrender Wharf (y = 1.1) up to Summit Compound (y = 11.0)
  for (let k = 0; k < 14; k++) {
    box(ctx, `l7-ft-step-${k}`, -73.5 - k * 1.35, PY + 0.45 + k * 0.7, -201.5 - k * 1.65, 2.4, 0.72, 1.7, {
      ...CONCRETE,
      color: "oklch(0.32 0.015 240)",
    });
  }

  // Fort Surrender Summit Checkpoint & Lashed-Furniture Palisades (x: -95, y: 11.0, z: -230)
  ctx.spawn("l7-fort-spawn", { feetPosition: { x: -93.0, y: 11.1, z: -224.0 }, rotation: { yaw: 180 } });
  [
    ["l7-palisade-0", -90.5, -222.5, 25],
    ["l7-palisade-1", -99.5, -223.5, -20],
    ["l7-palisade-2", -101.5, -231.0, -75],
    ["l7-palisade-3", -88.5, -231.0, 75],
  ].forEach(([id, px, pz, yaw]) => {
    ctx.spawn(id, {
      feetPosition: { x: px, y: 11.0, z: pz },
      rotation: { yaw },
      physics: "static",
      primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "palisade" } },
    });
  });

  ctx.spawn("l7-fort-sign", {
    feetPosition: { x: -95.0, y: 13.4, z: -222.5 },
    rotation: { yaw: 0 },
    primitive: { kind: "box", width: 3.2, height: 0.6, depth: 0.06 },
    material: { color: "oklch(0.18 0.02 55)" },
    ui: '<div face="front" width="3.2m" style="font-size:135px;font-weight:900;color:#f2d184;text-align:center;line-height:1.05">FORT SURRENDER<div style="font-size:64px;color:#d8c8a8">SOCIETY OF THE PUSHING · CEASE SWIMMING, EMBRACE THE DEEP</div></div>',
  });

  // Fort Surrender Warming Brazier
  ctx.spawn("l7-brazier-fort", {
    tags: ["usable"],
    feetPosition: { x: -95.0, y: 11.0, z: -228.5 },
    physics: "static",
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "brazier" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "brazier",
      name: "Tar & driftwood ritual brazier",
      verb: "Warm hands & rest",
      info: "Restores health, sanity & warmth",
      tint: "#ff9e58",
      c: { x: -95.0, y: 11.6, z: -228.5 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.1, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.18 50)", intensity: 3.5, distance: 16 } },
    ],
  });

  // Copper Seawater Distillation Still (produces Almond Water)
  ctx.spawn("l7-still", {
    tags: ["usable"],
    feetPosition: { x: -90.2, y: 11.0, z: -227.5 },
    physics: "static",
    primitive: { kind: "cylinder", radiusTop: 0.35, radiusBottom: 0.42, height: 1.25 },
    material: { color: "oklch(0.58 0.12 60)", metalness: 0.75, roughness: 0.35 },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "still",
      name: "Copper Seawater Condenser Still",
      verb: "Draw distilled Almond Water",
      info: "Boils Level 7 brine into pure Almond Water",
      tint: "#7fd6ff",
      c: { x: -90.2, y: 11.7, z: -227.5 },
    },
  });

  // Leviathan Ribcage Shrine & Abyssal Tar Altar at Fort Surrender Summit
  ctx.spawn("l7-shrine", {
    tags: ["usable"],
    feetPosition: { x: -95.0, y: 11.0, z: -236.0 },
    physics: "static",
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "shrine" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "altar",
      name: "Altar of the Thing on Level 7",
      verb: "Commune with the Abyss",
      info: "Leviathan ribcage & bubbling abyssal tar [Survival / Speech 35]",
      tint: "#58f2e0",
      c: { x: -95.0, y: 11.8, z: -236.0 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.4, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.19 180)", intensity: 2.8, distance: 12 } },
    ],
  });

  // Rusted Submersible Diving Bell & Level 8 Tar Cavern Winch on the North Cliff (x: -106, y: 4.2, z: -248)
  ctx.spawn("l7-diving-bell", {
    tags: ["usable"],
    feetPosition: { x: -106.0, y: 4.2, z: -248.0 },
    rotation: { yaw: 160 },
    physics: "static",
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "divingbell" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "divingbell",
      name: "Submersible Diving Bell (Level 8 Tar Cavern)",
      verb: "Haul Abyssal Winch Cable",
      info: "Hangs over the skeletal tar cave mouth to Level 8",
      tint: "#58f2c8",
      c: { x: -106.0, y: 5.2, z: -248.0 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.5, z: 0 }, light: { kind: "point", color: "oklch(0.8 0.18 175)", intensity: 2.5, distance: 12 } },
    ],
  });

  // =========================================================================
  // 4. NAVIGATIONAL CHANNEL WARNING BUOYS (Marking the route to the islands)
  // =========================================================================
  const buoys = [
    { id: "l7-buoy-1", x: -18, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 24, z: -76, phase: 1.9 },
    { id: "l7-buoy-3", x: -14, z: -155, phase: 3.5 },
  ];
  buoys.forEach((b) => {
    ctx.spawn(b.id, {
      feetPosition: { x: b.x, y: -0.7, z: b.z },
      model: GLB.buoy,
      layout: fit(4.2, 4.2, 4.2),
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
  // 5. DUAL ABYSSAL TITANS: ENTITY 20 ("THE THING ON LEVEL 7") & "TINY"
  // =========================================================================
  // 1) Entity 20 ("The Thing on Level 7"): Colossal aquatic titan patrolling the bay
  ctx.spawn("l7-leviathan", {
    feetPosition: { x: 30, y: -6.0, z: -75 },
    rotation: { yaw: 70 },
    scale: { x: 6.8, y: 6.8, z: 6.8 },
    model: { id: GLB.thing },
    children: [
      { feetPosition: { x: 0, y: 0.6, z: -1.2 }, light: { kind: "point", color: "oklch(0.85 0.22 175)", intensity: 5.0, distance: 22 } },
      { feetPosition: { x: 0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
      { feetPosition: { x: -0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
    ],
  });

  // 2) "Tiny" (The Second Leviathan from Wikidot Lore): Prowling the Midnight Trench off Fort Surrender
  ctx.spawn("l7-tiny", {
    feetPosition: { x: -135, y: -7.2, z: -255 },
    rotation: { yaw: -40 },
    scale: { x: 5.8, y: 5.8, z: 5.8 },
    model: { id: GLB.thing },
    children: [
      { feetPosition: { x: 0, y: 0.6, z: -1.2 }, light: { kind: "point", color: "oklch(0.78 0.24 295)", intensity: 4.8, distance: 20 } },
      { feetPosition: { x: 0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.78 0.24 295)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
      { feetPosition: { x: -0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.78 0.24 295)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
    ],
  });

  // =========================================================================
  // 7. BREAKABLES, LIGHTING & NPC RESIDENTS
  // =========================================================================
  for (const [id, spec] of Object.entries(breakables(FY, PY))) ctx.spawn(id, spec);
  spawnL7People(ctx);

  ctx.spawn("l7-troffer", {
    feetPosition: { x: 0, y: FY + 2.6, z: 0 },
    primitive: { kind: "scripted", script: "scripts/l7-room-geo.js", params: { kind: "troffer" } },
    children: [{ feetPosition: { x: 0, y: -0.15, z: 0 }, light: { kind: "point", color: "oklch(0.9 0.09 85)", intensity: 7, distance: 12 } }],
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-single-fluorescent-tube-buzzing-hum-loop.mp3", loop: true, gain: 0.12, spatial: true, maxDistance: 9 },
  });

  ctx.spawn("l7-door-lamp", {
    feetPosition: { x: 0, y: FY + 2.5, z: -3.32 },
    primitive: { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.11, height: 0.18 },
    material: { color: "#ffffff", emissive: "oklch(0.88 0.1 80)", emissiveIntensity: 3 },
    children: [{ feetPosition: { x: 0, y: -0.2, z: -0.3 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 2, distance: 14 } }],
  });

  for (let i = 0; i < 9; i++) {
    const x = -2.9 + i * 0.72 + ((i * 37) % 7) * 0.04, h = 0.8 + ((i * 53) % 5) * 0.3;
    ctx.spawn(`l7-stain-${i}`, {
      feetPosition: { x, y: FY + 2.85 - h, z: -3.21 },
      primitive: { kind: "box", width: 0.08 + (i % 3) * 0.05, height: h, depth: 0.01 },
      material: { color: "oklch(0.3 0.05 50 / 0.7)", transparent: true, roughness: 1 },
    });
  }

  // =========================================================================
  // 8. LEVEL 7 IS A ROOM: Concrete ceiling over the whole sea & megalithic pillars
  // =========================================================================
  const CEIL = { color: "oklch(0.3 0.008 240)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [0.25, 0.25], wrap: "repeat" };
  ctx.spawn("l7-sky-ceiling", { feetPosition: { x: 0, y: 34, z: -100 }, primitive: { kind: "box", width: 1600, height: 3, depth: 1600 }, material: CEIL, castShadow: false });
  ctx.spawn("l7-hanger", { feetPosition: { x: 0, y: FY + 2.85, z: 1 }, primitive: { kind: "box", width: 6.4, height: 34 - FY - 2.85, depth: 9 }, material: { ...CEIL, color: "oklch(0.33 0.008 240)" }, castShadow: false });
  [
    [-140, -160, 14], [120, -230, 18], [-60, -330, 22],
    [210, -60, 16], [-230, -40, 16], [40, -420, 24],
  ].forEach(([x, z, w], i) =>
    ctx.spawn(`l7-pillar-${i}`, { feetPosition: { x, y: -30, z }, primitive: { kind: "box", width: w, height: 64, depth: w }, material: CEIL, castShadow: false })
  );

  // =========================================================================
  // 9. ABYSSAL TAR SEEPS ON THE ROCKS (Wikidot Tar Beds)
  // =========================================================================
  [
    [-7, -9, 1.4], [6, 8, 1], [-14, 8, 1.8], [12, -4, 0.9],
    [52, -124, 1.6], [-88, -238, 2.2], [-104, -245, 2.6],
  ].forEach(([x, z, r], i) =>
    ctx.spawn(`l7-tar-${i}`, {
      feetPosition: { x, z, y: { terrain: 0.02 } },
      primitive: { kind: "cylinder", radiusTop: r, radiusBottom: r * 1.05, height: 0.04 },
      scale: { x: 1, y: 1, z: 0.65 },
      material: { color: "oklch(0.1 0.01 60)", roughness: 0.08, metalness: 0.2 },
    })
  );

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
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    for (const id of Object.keys(ctx.place.objects)) if (GONE.includes(id) || /^l7-(plank|post)-/.test(id)) ctx.destroy(id);
    lay(ctx);
    s.builtV = V;
  }

  if (!ctx.getObject("l7-fauna")) ctx.spawn("l7-fauna", { behavior: "scripts/l7-fauna.js" }); // tidecrawlers on the shores, the Deep in open water
  // Ensure NPCs come back home after respawn window via level-kit
  if (every(ctx, "people", 5000)) {
    keepPeople(ctx, Object.keys(L7_NPCS), () => spawnL7People(ctx));
  }

  const now = ctx.now();
  tickChatter(ctx, CHATTER.level7, { "l7-vance": "reyes", "l7-jude": "hollis", "l7-mara": "mags" }); // the fort talks among itself, Vance talks to his radio

  // Smashed props grow back after 60 min, never in someone's face
  if (every(ctx, "regrow", 5000)) {
    s.smashed ??= {};
    for (const [id, spec] of Object.entries(breakables(FY, PY))) {
      if (ctx.place.objects[id]) {
        if (s.smashed[id]) delete s.smashed[id];
        continue;
      }
      if (!s.smashed[id]) {
        s.smashed[id] = now;
        continue;
      }
      const f = spec.feetPosition;
      if (now - s.smashed[id] > 60 * 60000 && !ctx.place.players.some((p) => Math.hypot(p.feetPosition.x - f.x, p.feetPosition.z - f.z) < 8)) {
        ctx.spawn(id, spec);
        delete s.smashed[id];
      }
    }
  }

  // 1. DYNAMIC OCEAN WATER BOBBING & SWELL
  const boat = null; // the dory rocks itself now (scripts/l7-dory.js)
  if (boat) {
    const bob = Math.sin(now * 0.0016) * 0.07;
    const roll = Math.cos(now * 0.0012) * 2.8;
    const yawDrift = Math.sin(now * 0.0008) * 1.6;
    boat.feetPosition = { x: 2.3, y: -0.4 + bob, z: -31 };
    boat.rotation = { yaw: 14 + yawDrift, roll: 3 + roll };
  }

  // Warning Buoys bob and pitch with phase offsets
  const buoys = [
    { id: "l7-buoy-1", x: -18, z: -46, phase: 0 },
    { id: "l7-buoy-2", x: 24, z: -76, phase: 1.9 },
    { id: "l7-buoy-3", x: -14, z: -155, phase: 3.5 },
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

  // 2. DUAL ABYSSAL TITANS: ENTITY 20 ("THE THING") & "TINY" PATROL ARCS
  const lev = ctx.getObject("l7-leviathan");
  if (lev) {
    const angle = now * 0.00028;
    const lx = 18 + Math.cos(angle) * 18;
    const lz = -75 + Math.sin(angle) * 22;
    const ly = -6.0 + Math.sin(now * 0.0007) * 0.7;
    lev.feetPosition = { x: lx, y: ly, z: lz };
    lev.rotation = { yaw: (-angle * 57.2958) + 90 };
  }

  const tiny = ctx.getObject("l7-tiny");
  if (tiny) {
    const angle = -now * 0.00022 + 1.4;
    const tx = -125 + Math.cos(angle) * 24;
    const tz = -250 + Math.sin(angle) * 20;
    const ty = -7.2 + Math.cos(now * 0.0006) * 0.8;
    tiny.feetPosition = { x: tx, y: ty, z: tz };
    tiny.rotation = { yaw: (angle * 57.2958) - 90 };
  }

  // 3. PERIODIC DISTANT WHALE GROAN FROM THE DEEP
  if (ctx.place.playerCount && now > (s.groanAt ?? 0)) {
    if (s.groanAt) {
      ctx.emit("playSound", {
        clip: G("deep-whale-like-groan-from-far-under-dark-water"),
        position: { x: 30, y: -10, z: -130 },
        volume: 0.75,
        refDistance: 100,
        maxDistance: 600,
      });
    }
    s.groanAt = now + 65000 + ctx.random() * 65000;
  }

  // 4. THALASSOPHOBIA, FREEZING WATER EXPOSURE & BRAZIER WARMTH
  for (const p of ctx.place.players) {
    const fp = p.feetPosition;
    // Brazier warmth recovery at Seawatch Outpost or Fort Surrender
    if (Math.hypot(fp.x - 46.8, fp.z + 118.2) < 5.5 || Math.hypot(fp.x + 95.0, fp.z + 228.5) < 5.5) {
      p.state.sanity = Math.min(100, (p.state.sanity ?? 80) + 1.5);
      continue;
    }

    // Freezing open-ocean immersion hazard (Wikidot Daylight/Twilight Zone hypothermia & Leviathan attraction)
    // Level 7 unique diving & oilskin armor insulates against the abyssal chill!
    const onPier = Math.abs(fp.x) < 3.0 && fp.z <= -8 && fp.z >= -35;
    const onRock = Math.hypot(fp.x, fp.z) < 22 || Math.hypot(fp.x - 46, fp.z + 120) < 30 || Math.hypot(fp.x + 95, fp.z + 230) < 48;
    if (fp.y < 0.25 && !onPier && !onRock) {
      s.chillClock ??= {};
      if (now - (s.chillClock[p.id] ?? 0) > 12000) {
        s.chillClock[p.id] = now;
        const lk = p.state.look ?? {};
        const l7Hex = ["2b4c5e", "1e3b4b", "d49b27", "3a4842", "1c282e", "142024", "28322c", "2b3036", "1c1e22", "141618", "d46a28", "24343e", "b88838", "c85a28", "3a4e54"];
        const suitPieces = [lk.top, lk.bottom, lk.shoec, lk.hatc, lk.neckc].filter((c) => c && l7Hex.includes(String(c).replace("#", "").toLowerCase())).length;
        if (suitPieces >= 2) {
          p.state.notice = {
            text: "Your insulated Level 7 dive & oilskin gear seals out the freezing abyssal brine!",
            at: now,
          };
        } else {
          p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - (suitPieces === 1 ? 2 : 4));
          p.state.hp = Math.max(5, (p.state.hp ?? 100) - (suitPieces === 1 ? 1 : 2));
          p.state.notice = {
            text: "The freezing abyssal water numbs your limbs! Wear Level 7 dive/oilskin armor, board a skiff, or climb onto a raft!",
            at: now,
          };
        }
      }
    }

    // Pierhead / deep-sea observation dread
    if (fp.z < -28) {
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
