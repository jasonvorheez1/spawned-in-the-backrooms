import { retextureOnce } from "../../scripts/lib/retexture.js";
import { sweepProps } from "../../scripts/lib/breakables.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
import { rotationFromDirection } from "builtin/vec3";
// Level 7 "Thalassophobia" Simulation:
// Wikidot Backrooms Level 7 - An infinite subterranean ocean beneath a towering concrete ceiling void.
// - Room 1 ("The Floating House" / Drowned Parlor): knee-deep floodwater, floral wallpaper, white wainscoting,
//   stone hearth, stacked drawers on the coffee table, bookcase, wire rack, armchair, and buzzing fluorescent tube.
// - Stilted Timber Pier, Ferry Rowboats & Drifting Furniture Flotsam Rafts across the Daylight Zone.
// - Near Island (x: 46, z: -120): M.E.G. Outpost "Seawatch" with Salvage Workbench, Deep-Trench Sonar Console,
//   Warming Brazier, Locked Dive Locker, and Specialist Diver Vance.
// - Nearest island (x: -70, z: -95): "Fort Surrender", a haphazard shelter of broken furniture held together with tar (art/level7 fort_surrender.glb), 4 to 9 worshippers of the Thing,
//   Leviathan Ribcage Tar Altar, Seawater Distillation Still, Brother Jude & Sister Mara (Trader),
//   and the Submersible Diving Bell over the Underwater Tar Cavern toward Level 8 ("Cave System").
// - Dual Abyssal Titans: Entity 20 ("The Thing on Level 7") and "Tiny" prowling the Twilight & Midnight Zones.

import { keepPeople, every } from "../../scripts/lib/level-kit.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import { layExtras } from "../../scripts/lib/level7-extras.js";
import { layFort2, FORT_MATS } from "../../scripts/lib/level7-fort2.js";
import { layHouse } from "../../scripts/lib/level7-house.js";
import { ammobenchSpec, ensureBenches } from "../../scripts/lib/benches.js";
export const cadence = "2s";

// Tripo models for the props (Savi, Nov 7): each fits a layout box; breakables take tag + { mat, hp, maxHp } (lib/breakables.js)
const GLB = {
  fort: "/cdn/value.ae43401a6490aca8dc769b1307703673ac02e403222b4ddf4f0782d076e99ba1.glb", circle: "/cdn/value.4de05de0a92bd78ed14fe0b2955f6b4fe0ecd0ec4e7c9d870956ee666aec2edd.glb", skeleton: "/cdn/value.2de5857513c7f3b7e1c18aae534bd2f525f58f06ca035b9e09fdf46a98695635.glb", // art/level7/build.py
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

const FORT_FLOOR = 11.65;
const FORT_YAW = 38.7;
const fortAngle = FORT_YAW * Math.PI / 180;
function fortPoint(p) {
  const x = p.x + 70, z = p.z + 93;
  return { ...p, x: -70 + x * Math.cos(fortAngle) + z * Math.sin(fortAngle), z: -93 - x * Math.sin(fortAngle) + z * Math.cos(fortAngle) };
}
const isFortResident = (o) => o?.state?.faction === "surrender" && o.tags?.includes("l7-npc");
function fortResident(g) {
  const [x, , z] = g.at, home = fortPoint({ x, y: FORT_FLOOR + 0.03, z });
  return { home, rounds: g.rounds.map((r) => ({ ...fortPoint(r), y: home.y, look: fortPoint(r.look) })) };
}
const fortProps = ["l7-cult-chest", "l7-fort-dresser", "l7-fort-crate"];
function fortBreakables(floor, pier) {
  const specs = breakables(floor, pier);
  for (const id of fortProps) {
    const spec = specs[id];
    spec.feetPosition = fortPoint({ ...spec.feetPosition, y: FORT_FLOOR });
    spec.rotation.yaw += FORT_YAW;
  }
  return specs;
}

// Every breakable here, by id: laid with the level, re-laid 15 min after it is smashed (nobody within 8 m)
export function breakables(FY, PY) {
  const R = {
    // ---- Room 1 (The Floating House / Drowned Parlor) ----
    "l7-crate": { tags: ["container", "breakable"], feetPosition: { x: -2.1, y: FY, z: -1.8 }, rotation: { yaw: 12 }, model: GLB.crate, layout: fit(0.8, 0.8, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Waterlogged M.E.G. crate", items: "almond,ration,wire,battery", ...brk("wood", 45) } },
    "l7-pier-crate": { tags: ["container", "breakable"], feetPosition: { x: -0.9, y: PY + 0.04, z: -32.5 }, rotation: { yaw: -20 }, model: GLB.crate, layout: fit(0.6, 0.6, 0.6), physics: { body: "static", collider: "box" }, state: { name: "Salt-crusted maritime locker", items: "weapon:fishing_rod,cloth:topw:hoodie:d49b27,almond,battery,bandage", ...brk("wood", 35) } },
    "l7-boxes": { tags: ["breakable"], feetPosition: { x: 1.25, y: FY, z: 2.45 }, rotation: { yaw: 6 }, model: GLB.boxes, layout: fit(0.8, 1.05, 0.8), physics: { body: "static", collider: "box" }, state: { items: "wire", ...brk("wood", 20) } },
    "l7-lamp": { tags: ["breakable"], feetPosition: { x: -2.5, y: FY, z: 2.3 }, rotation: { yaw: 210, roll: -9 }, model: GLB.floorlamp, layout: fit(0.9, 1.7, 0.9), physics: { body: "static", collider: "box" },
      children: [{ feetPosition: { x: 0, y: 1.45, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.11 70)", intensity: 0.7, distance: 4, shadow: { enabled: false }, visibleRange: { max: 35 } } }], state: brk("wood", 25) },
    "l7-plant": { tags: ["breakable"], feetPosition: { x: -1.3, y: FY, z: 2.5 }, rotation: { yaw: 40 }, model: GLB.plant, layout: fit(0.6, 0.75, 0.6), physics: { body: "static", collider: "box" }, state: brk("wood", 15) },
    "l7-debris-1": { feetPosition: { x: -0.95, y: FY + 0.12, z: 0.9 }, rotation: { yaw: 30 }, model: GLB.debris, layout: fit(0.8, 0.45, 0.8) },
    "l7-debris-2": { feetPosition: { x: -1.5, y: FY + 0.12, z: -2.3 }, rotation: { yaw: 200 }, model: GLB.debris, layout: fit(0.65, 0.4, 0.65) },

    // ---- Daylight Zone Drifting Flotsam Salvage ----
    "l7-flotsam-crate-0": { tags: ["container", "breakable"], feetPosition: { x: 8.2, y: 0.22, z: -43.5 }, rotation: { yaw: 35 }, model: GLB.crate, layout: fit(0.7, 0.7, 0.7), physics: { body: "static", collider: "box" }, state: { name: "Drifting flotsam crate", items: "almond,wire,bobbypin,cloth:hat:beanie:d46a28", ...brk("wood", 35) } },
    "l7-flotsam-crate-1": { tags: ["container", "breakable"], feetPosition: { x: 25.5, y: 0.22, z: -69.5 }, rotation: { yaw: -40 }, model: GLB.crate, layout: fit(0.7, 0.7, 0.7), physics: { body: "static", collider: "box" }, state: { name: "Barnacled cargo box", items: "ration,shells,bandage,cloth:botw:overalls:28322c", ...brk("wood", 40) } },

    // ---- Near Island (M.E.G. Outpost Seawatch, y = 7.0) ----
    "l7-meg-locker": { tags: ["container", "breakable"], feetPosition: { x: 42.5, y: 7.0, z: -117.5 }, rotation: { yaw: 25 }, model: GLB.crate, layout: fit(0.85, 0.85, 0.85), physics: { body: "static", collider: "box" }, state: { name: "M.E.G. Waterproof Dive Locker", lock: "lockpick:35", items: "ubook:l7_seawatch_explosives,weapon:revolver,cloth:topw:jacket:2b4c5e,cloth:shoes:boots:1c1e22,ammo,kit,blue,battery", ...brk("wood", 95) } },
    "l7-seawatch-boxes": { tags: ["container", "breakable"], feetPosition: { x: 48.2, y: 7.0, z: -116.5 }, rotation: { yaw: -15 }, model: GLB.boxes, layout: fit(0.8, 1.0, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Seawatch supply cartons", items: "almond,tape,fuse,ration", ...brk("wood", 30) } },

    // ---- Far Island (Fort Surrender, y = 11.0) ----
    "l7-cult-chest": { tags: ["container", "breakable"], feetPosition: { x: -66.5, y: 11.0, z: -97.0 }, rotation: { yaw: -60 }, model: GLB.sideboard, layout: fit(1.1, 1.15, 1.1), physics: { body: "static", collider: "box" }, state: { name: "Fort Surrender Reliquary Chest", lock: "lockpick:45", items: "weapon:carbine,cloth:topw:apron:1c282e,cloth:neck:cape:c85a28,ammo,shells,royal_ration,firesalt,firstaid", ...brk("wood", 110) } },
    "l7-fort-dresser": { tags: ["container", "breakable"], feetPosition: { x: -73.5, y: 11.0, z: -91.5 }, rotation: { yaw: 15 }, model: GLB.dresser, layout: fit(1.0, 1.1, 1.0), physics: { body: "static", collider: "box" }, state: { name: "Lashed drift-furniture cabinet", items: "almond,bandage,bobbypin,cloth:hat:cap:b88838", ...brk("wood", 65) } },
    "l7-fort-crate": { tags: ["container", "breakable"], feetPosition: { x: -68.0, y: 11.0, z: -89.0 }, rotation: { yaw: 110 }, model: GLB.crate, layout: fit(0.8, 0.8, 0.8), physics: { body: "static", collider: "box" }, state: { name: "Tar-caulked provision crate", items: "meat:fish,ration,almond,battery", ...brk("wood", 50) } },
  };

  // Basalt boulders across the Entrance Rock, Seawatch Island, and Fort Surrender for 7DTD stone/concrete harvesting
  [
    [-9, -6, 1.3, 1], [-12, 4, 1.8, 2], [8, -7, 1.1, 3], [13, 2, 2.2, 4], [-6, 12, 1.5, 5],
    [10, 11, 1.2, 6], [-17, -3, 2.6, 7], [17, -9, 2, 8], [3, -11, 0.8, 9], [-4, -9, 0.7, 10],
    [36, -126, 1.6, 11], [55, -114, 1.9, 12], [-57, -103, 2.1, 13], [-81, -85, 1.8, 14],
  ].forEach(([x, z, sc, seed], i) => {
    R[`l7-boulder-${i}`] = { tags: ["breakable"], feetPosition: { x, z, y: { terrain: -0.15 * sc } }, rotation: { yaw: seed * 47 }, model: GLB.boulder, layout: fit(1.9 * sc, 1.9 * sc, 1.9 * sc), physics: { body: "static", collider: "auto" }, state: brk("concrete", Math.round(140 * sc)) };
  });
  for (const sp of Object.values(R)) { sp.visibleRange ??= { max: 65 }; const b = sp.layout?.box; if (b && Math.max(b.max.x - b.min.x, b.max.y - b.min.y) < 1.2) { sp.castShadow = false; sp.visibleRange = { max: 45 }; } else { sp.castShadow = false; } } // lag pass (#138)
  return R;
}

const V = 28;
// 24: Wikidot canonical drowned antique entrance room (stacked bureau drawers, armoire with draped linen & silver tea service, stone hearth, turned pedestal, show-don't-tell)
const V_OLD = 14; // 12: Fort Surrender moved to the nearest island, new fort, circle and skeletons
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
const PAPER = { color: "oklch(0.72 0.06 150)", roughness: 0.95 }; // a 2000s sage-green paint
const WAINSCOT = { color: "oklch(0.86 0.04 88)", roughness: 0.85 }; // cream lower walls under a chair rail
const RUST = { color: "oklch(0.38 0.06 45)", metalness: 0.6, roughness: 0.8 };
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
// Entity 720 "Tiny" (Shelly Nov 12 "massively overhaul Tiny"): a 2.44 m tar-coated amphibian, Tripo body from the painted concept; scripts/l7-tiny.js hunts
const TINY = () => ({
  tags: ["entity", "tiny"],
  feetPosition: { x: -128, y: -7, z: 0 }, rotation: { yaw: -40, pitch: -80 }, pivot: "center",
  visibleRange: { max: 80 }, castShadow: false, audience: "all",
  model: { id: "/cdn/value.271c43e9768ffdc53d8343eeff9dc8afb77f782c5f60fcb12a28998b8cb320ca.glb", forward: "+x" }, // Tripo-rigged (mixamo bones): the library swim and attack clips play on him
  layout: { box: { min: { x: -0.8, y: 0, z: -0.45 }, max: { x: 0.8, y: 2.44, z: 0.45 } } },
  behavior: "scripts/l7-tiny.js",
  state: { name: "Tiny", home: { x: -150, z: 0 } },
  children: [
    { id: "eyes", feetPosition: { x: 0, y: 2.2, z: -0.25 }, light: { kind: "point", color: "oklch(0.85 0.16 185)", intensity: 2.5, distance: 9, shadow: { enabled: false }, visibleRange: { max: 50 } } },
  ],
});

const FY = 4.0; // The landing room floor elevation atop the basalt rock
const PY = 1.1; // Pier deck elevation above sea level (y = 0)

const chalk = (text, w = "1.6m") =>
  `<svg viewBox='0 0 360 120' width='${w}'><text x='180' y='65' text-anchor='middle' font-family='sans-serif' font-weight='600' font-size='21' fill='#d8e2e6' fill-opacity='0.88'>${text}</text></svg>`;

const box = (ctx, id, x, y, z, w, h, d, material, extra = {}) =>
  ctx.spawn(id, {
    feetPosition: { x, y, z },
    physics: "static",
    visibleRange: { max: Math.max(w, h, d) > 4 ? 75 : 45 },
    castShadow: Math.max(w, h, d) > 1.2,
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
    look: { species: "otter", sex: "m", eye: "#38a89d", belly: "#e6d2b5", nose: "#221814", topw: "jacket", top: "#1e3b4b", botw: "overalls", bottom: "#28322c", shoes: "boots", shoec: "#141618", hat: "cap", hatc: "#b88838", eyew: "none", neck: "scarf", neckc: "#c85a28", expr: "calm" }, // Seawatch dive coat, tar-caulked waders, lead-ballast boots, brass-rimmed dive hood, cork lifebelt mantle
  },
  "l7-jude": {
    name: "Brother Jude · Fort Surrender",
    role: "scout",
    voice: "hollis",
    faction: "surrender",
    factionName: "Fort Surrender (broken furniture held together with tar; they worship The Thing on Level 7 and are hostile to outsiders)",
    gun: "wrench",
    at: [-70.0, 11.0, -97.5],
    yaw: 0,
    rounds: [
      { x: -70.0, y: 11.0, z: -97.5, dwell: 24, act: null, look: { x: -70.0, z: -101.0 } , topw: "jacket", botw: "pants", hat: "beanie", neck: "scarf", neckc: "#8a7a5a" },
      { x: -67.5, y: 11.0, z: -92.5, dwell: 15, act: null, look: { x: -60.0, z: -80.0 } },
      { x: -72.5, y: 11.0, z: -95.0, dwell: 18, act: null, look: { x: -83.0, z: -115.0 } },
    ],
    look: { species: "deer", sex: "m", eye: "#5ae0d0", belly: "#d8cbb8", nose: "#1e1816", topw: "longsleeve", top: "#b8a888", topp: "weave", botw: "longskirt", bottom: "#4a3e30", botp: "weave", shoes: "boots", shoec: "#3a2c22", neck: "scarf", neckc: "#7a2e24", expr: "calm" },
  },
  "l7-ezra": {
    name: "Ezra · Fort Surrender Watch",
    role: "scout",
    voice: "hollis",
    faction: "surrender",
    factionName: "Fort Surrender (broken furniture held together with tar; they worship The Thing on Level 7 and are hostile to outsiders)",
    gun: "hatchet",
    at: [-66.0, 11.0, -86.0],
    yaw: 0,
    nerve: "frenzied",
    rounds: [
      { x: -66.0, y: 11.0, z: -86.0, dwell: 20, act: null, look: { x: -70.0, z: -93.0 } , topw: "tarpponcho", botw: "overalls", hat: "souwester", hatc: "#c8a030" },
      { x: -72.0, y: 11.0, z: -86.0, dwell: 20, act: null, look: { x: -70.0, z: -93.0 } },
      { x: -70.0, y: 11.0, z: -84.0, dwell: 14, act: null, look: { x: -70.0, z: -93.0 } },
    ],
    look: { species: "wolf", sex: "m", eye: "#d84a4a", belly: "#d8cbb8", nose: "#1e1816", topw: "sweater", top: "#5a6a5e", topp: "knit", botw: "pants", bottom: "#4e4434", botp: "weave", shoes: "boots", shoec: "#2a2420", neck: "scarf", neckc: "#7a3a2a" },
  },
  "l7-ines": {
    name: "Sister Ines · Fort Surrender Tar-Bearer",
    role: "scout",
    voice: "mags",
    faction: "surrender",
    factionName: "Fort Surrender (broken furniture held together with tar; they worship The Thing on Level 7 and are hostile to outsiders)",
    gun: "knife",
    at: [-75.0, 11.0, -97.0],
    yaw: 0,
    nerve: "steady",
    rounds: [
      { x: -75.0, y: 11.0, z: -97.0, dwell: 25, act: null, look: { x: -70.0, z: -93.0 } , topw: "tarpponcho", botw: "pants", neck: "scarf", neckc: "#7a3020" },
      { x: -73.0, y: 11.0, z: -92.0, dwell: 18, act: null, look: { x: -70.0, z: -93.0 } },
    ],
    look: { species: "sheep", sex: "f", eye: "#e0d048", belly: "#d8cbb8", nose: "#1e1816", topw: "longsleeve", top: "#a8987a", topp: "gingham", botw: "overalls", bottom: "#5a4a36", shoes: "boots", shoec: "#2e2620", neck: "scarf", neckc: "#3e6a6a" },
  },
  "l7-tobit": {
    name: "Tobit · Fort Surrender Watch",
    role: "scout",
    voice: "reyes",
    faction: "surrender",
    factionName: "Fort Surrender (broken furniture held together with tar; they worship The Thing on Level 7 and are hostile to outsiders)",
    gun: "wrench",
    at: [-64.0, 11.0, -98.0],
    yaw: 0,
    nerve: "frenzied",
    rounds: [
      { x: -64.0, y: 11.0, z: -98.0, dwell: 22, act: null, look: { x: -70.0, z: -93.0 } , topw: "bntgvest", botw: "overalls", neck: "necklace" },
      { x: -67.0, y: 11.0, z: -99.0, dwell: 16, act: null, look: { x: -70.0, z: -93.0 } },
    ],
    look: { species: "bear", sex: "m", eye: "#d84a4a", belly: "#d8cbb8", nose: "#1e1816", topw: "jacket", top: "#6e5c44", topp: "canvas", botw: "pants", bottom: "#3e4a44", botp: "weave", shoes: "boots", shoec: "#241e1a", hat: "beanie", hatc: "#6a3a2a", neck: "none" },
  },
  "l7-mara": {
    name: "Sister Mara · Fort Surrender Trader",
    role: "trader",
    voice: "mags",
    faction: "surrender",
    factionName: "Fort Surrender (a worshipper of the Thing who salvages and trades with those they tolerate)",
    gun: "knife",
    at: [-67.0, 11.0, -92.0],
    yaw: -45,
    rounds: [
      { x: -67.0, y: 11.0, z: -92.0, dwell: 28, act: null, look: { x: -70.0, z: -94.0 } , topw: "hoodie", botw: "shorts", hat: "souwester", hatc: "#c8a030" },
      { x: -71.5, y: 11.0, z: -92.5, dwell: 16, act: null, look: { x: -73.0, z: -91.5 } },
    ],
    look: { species: "raccoon", sex: "f", eye: "#e0a838", belly: "#dcd8d0", nose: "#1c1816", topw: "hoodie", top: "#4e6a5e", botw: "pants", bottom: "#6a5a42", botp: "weave", shoes: "boots", shoec: "#1c1e22", hat: "beanie", hatc: "#8a5a2a", expr: "smirk" },
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
      const fort = g.faction === "surrender";
      const { home, rounds } = fort ? fortResident(g) : { home: { x: g.at[0], y: g.at[1], z: g.at[2] }, rounds: g.rounds };
      ctx.spawn(id, {
        tags: ["npc", "l7-npc"],
        feetPosition: home,
        rotation: { yaw: g.yaw + (fort ? FORT_YAW : 0) },
        physics: "character",
        ...critterSpec(npcLook(id, g.look, "l7", 15)),
        behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
        state: {
          name: g.name,
          role: g.role,
          voice: g.voice,
          faction: g.faction,
          factionName: g.factionName,
          rounds,
          ...(g.nerve ? { nerve: g.nerve } : {}), // the fort's watch are hostile to outsiders (scripts/meg-agent.js)
          ri: 0,
          home,
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
  box(ctx, "l7-ceil", 0, FY + 2.7, 0, 6.4, 0.25, 6.4, { color: "oklch(0.88 0.015 90)", roughness: 1 }); // popcorn ceiling

  // Walls with faded vintage wallpaper & North doorway opening out to the ocean
  box(ctx, "l7-wall-e", 3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-w", -3.05, FY, 0, 0.3, 2.7, 6.4, PAPER);
  box(ctx, "l7-wall-n1", -2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n2", 2.0, FY, -3.05, 2.4, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-n3", 0, FY + 2.1, -3.05, 1.6, 0.6, 0.3, CONCRETE); // Door lintel North
  box(ctx, "l7-wall-s1", -1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s2", 1.9, FY, 3.05, 2.6, 2.7, 0.3, PAPER);
  box(ctx, "l7-wall-s3", 0, FY + 2.5, 3.05, 1.2, 0.2, 0.3, CONCRETE); // Door lintel South: high enough to clear your head on the first steps

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
  // 2) Turned-wood round pedestal table with white saucer top beside the hearth
  // 3) Metal wire shelving rack with emerald-green bottle vase & ceramic planter beside the armchair
  // 4) Draped white fabric sheet hanging off the left bookcase edge (as in the photo)

  // Staircase ascending into the darkness back to Level 6 (South)
  for (let k = 0; k < 6; k++) { // 0.26 m risers: a body climbs 0.3 at most
    box(ctx, `l7-step-${k}`, 0, FY + k * 0.26, 3.4 + k * 0.3, 1.2, 0.26, 0.42, { ...CONCRETE, color: "oklch(0.29 0.008 240)" });
  }
  box(ctx, "l7-shaft-e", 0.8, FY, 4.4, 0.4, 4.0, 2.4, CONCRETE);
  box(ctx, "l7-shaft-w", -0.8, FY, 4.4, 0.4, 4.0, 2.4, CONCRETE);
  box(ctx, "l7-shaft-top", 0, FY + 3.1, 4.4, 1.2, 1.0, 2.4, CONCRETE); // headroom over the climbing steps
  box(ctx, "l7-shaft-end", 0, FY, 5.7, 1.2, 4.0, 0.3, { color: "oklch(0.01 0 0)" });

  // Transition trigger to return to Level 6
  ctx.spawn("l7-back", {
    feetPosition: { x: 0, y: FY + 0.3, z: 4.3 }, // met on the third step, before the shaft's lid at FY + 2.7 meets your head
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
    visibleRange: { max: 40 }, castShadow: false,
  });

  // Ship's Hurricane Storm Lanterns along the wharf
  ctx.spawn("l7-lantern-mid", {
    feetPosition: { x: -1.45, y: PY + 0.88, z: -18 },
    visibleRange: { max: 40 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.15 75)", intensity: 1.8, distance: 10, shadow: { enabled: false }, visibleRange: { max: 35 } } }],
  });
  ctx.spawn("l7-lantern-end", {
    feetPosition: { x: 1.35, y: PY + 0.88, z: -33 },
    visibleRange: { max: 40 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.2, distance: 14, shadow: { enabled: false }, visibleRange: { max: 35 } } }],
  });

  // Chalk warning carved into the wet pierhead timber
  ctx.spawn("l7-pier-note", {
    feetPosition: { x: 0, y: PY + 0.05, z: -32.5 },
    rotation: { pitch: -90, yaw: 180 },
    visibleRange: { max: 40 },
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
      visibleRange: { max: 40 }, castShadow: false,
      primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind: "fishing_rod" } },
    });
  }

  // Interactive Ferry Rowboat moored at the Entrance Pier -> rows to M.E.G. Outpost Seawatch!
  ctx.spawn("l7-rowboat", {
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: 2.3, y: -0.4, z: -31 },
    rotation: { yaw: 14, roll: 3 },
    visibleRange: { max: 65 }, castShadow: false,
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
    visibleRange: { max: 40 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.5, distance: 16, shadow: { enabled: false }, visibleRange: { max: 35 } } }],
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
    visibleRange: { max: 65 }, castShadow: false,
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
    visibleRange: { max: 65 }, castShadow: false,
    model: { id: GLB.rowboat, forward: "+x" },
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js",
    state: { name: "Deep-water outrigger dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true, home: { x: 40.4, z: -92.5, yaw: 145 } },
  });

  // Seawatch Outpost Summit Checkpoint & Signboard (x: 46, y: 7.0, z: -120)
  // Arrival from Level 10's lake: you come up out of deep water a short swim off the Seawatch pier
  ctx.spawn("l7-from-l10", { feetPosition: { x: 36, y: -2.2, z: -96 }, rotation: { yaw: 200 } });
  ctx.spawn("l7-seawatch-spawn", { feetPosition: { x: 45.0, y: 7.1, z: -116.0 }, rotation: { yaw: 180 } });
  ctx.spawn("l7-seawatch-sign", {
    feetPosition: { x: 44.5, y: 9.2, z: -114.5 },
    rotation: { yaw: 0 },
    visibleRange: { max: 45 }, castShadow: false,
    primitive: { kind: "box", width: 2.8, height: 0.55, depth: 0.06 },
    material: { color: "oklch(0.24 0.03 230)" },
    ui: '<div face="front" width="2.8m" style="font-size:135px;font-weight:900;color:#9fe8ff;text-align:center;line-height:1.05">M.E.G. OUTPOST SEAWATCH<div style="font-size:66px;color:#cfe8f0">HYDROPHONE ARRAY 07 · SALVAGE &amp; WORKBENCH</div></div>',
  });

  // M.E.G. Salvage Workbench (7DTD / Fallout crafting bench!)
  box(ctx, "l7-bench", 43.8, 7.0, -120.5, 1.6, 0.85, 0.8, WOOD, {
    tags: ["bench"],
    state: { name: "M.E.G. Marine Salvage Workbench" },
    children: [
      { feetPosition: { x: 0, y: 1.6, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.12 80)", intensity: 2.6, distance: 11, shadow: { enabled: false }, visibleRange: { max: 35 } } },
    ],
  });

  // Warming Driftwood & Oil-Drum Brazier at Seawatch
  ctx.spawn("l7-brazier-seawatch", {
    tags: ["usable"],
    feetPosition: { x: 46.8, y: 7.0, z: -118.2 },
    physics: "static",
    visibleRange: { max: 45 }, castShadow: false,
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
      { feetPosition: { x: 0, y: 1.1, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.18 50)", intensity: 3.2, distance: 14, shadow: { enabled: false }, visibleRange: { max: 35 } } },
    ],
  });

  // M.E.G. Deep-Trench Hydrophone & Sonar Console
  ctx.spawn("l7-sonar", {
    tags: ["usable"],
    feetPosition: { x: 47.8, y: 7.0, z: -124.8 },
    rotation: { yaw: 180 },
    physics: "static",
    visibleRange: { max: 45 }, castShadow: false,
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
      { feetPosition: { x: 0, y: 1.3, z: 0.3 }, light: { kind: "point", color: "oklch(0.8 0.18 165)", intensity: 1.8, distance: 7, shadow: { enabled: false }, visibleRange: { max: 35 } } },
    ],
  });

  // =========================================================================
  // 3D. FAR ISLAND (x: -70, z: -95, y = 11.0): FORT SURRENDER (WIKIDOT FACTION)
  // =========================================================================
  // Fort Surrender Southeast Wharf (x: -47, y: 1.1, z: -58)
  ctx.spawn("l7-fort-pier-0", {
    feetPosition: { x: -47, y: PY, z: -57 },
    visibleRange: { max: 55 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  ctx.spawn("l7-fort-pier-1", {
    feetPosition: { x: -47, y: PY, z: -63 },
    visibleRange: { max: 55 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "pier" } },
  });
  box(ctx, "l7-fort-pier-col", -47, PY - 0.1, -60, 3.4, 0.2, 13, {}, { visible: false });
  ctx.spawn("l7-fort-lantern", {
    feetPosition: { x: -45.6, y: PY + 0.88, z: -55 },
    visibleRange: { max: 40 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "lantern" } },
    children: [{ feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.88 0.16 75)", intensity: 2.5, distance: 16, shadow: { enabled: false }, visibleRange: { max: 35 } } }],
  });

  // Ferry Skiff from Fort Surrender back to M.E.G. Seawatch
  ctx.spawn("l7-boat-from-fort", { // rowed by hand like the pier dory (Shelly: "why is it just fast travel now")
    tags: ["seat", "boat"],
    physics: { body: "kinematic", collider: "box" },
    feetPosition: { x: -44.5, y: -0.4, z: -57.5 },
    rotation: { yaw: -35, roll: 2 },
    visibleRange: { max: 65 }, castShadow: false,
    model: { id: GLB.rowboat, forward: "+x" },
    layout: fit(3.8, 1.2, 3.8),
    behavior: "scripts/l7-dory.js",
    state: { name: "Fort Surrender dory", verb: "Get in", seat: { d: 0.35, y: 0.3 }, boat: true, home: { x: -44.5, z: -57.5, yaw: -35 } },
  });

  // Winding stone steps from Fort Surrender Wharf (y = 1.1) up to Summit Compound (y = 11.0)
  for (let k = 0; k < 14; k++) {
    box(ctx, `l7-ft-step-${k}`, -48.5 - k * 1.35, PY + 0.45 + k * 0.7, -66.5 - k * 1.65, 2.4, 0.72, 1.7, {
      ...CONCRETE,
      color: "oklch(0.32 0.015 240)",
    }, { visible: false }); // invisible walking collider: the timber stair l7w-stair (scene) is what shows
  }

  // Fort Surrender Summit Checkpoint & Lashed-Furniture Palisades (x: -70, y: 11.0, z: -95)
  ctx.spawn("l7-fort-spawn", { feetPosition: { x: -68.0, y: 11.1, z: -89.0 }, rotation: { yaw: 180 } });
  // the fort itself: two rows of wardrobes, dressers, beds and doors stacked and tarred, lean-to shanties inside, a watchtower of lashed wardrobes; the gate faces the wharf (south)
  ctx.spawn("l7-fort", { feetPosition: { x: -70.0, y: 10.95, z: -93.0 }, rotation: { yaw: 0 }, model: { id: GLB.fort, materials: FORT_MATS }, receiveShadow: true, visibleRange: { max: 70 } });
  // the Thing's worshippers keep tar lamps along the wall: the only light here, low and red-black
  [[-6, -7], [6, -7], [-8, 1], [8, 1], [0, -9]].forEach(([dx, dz], i) => ctx.spawn(`l7-fort-lamp-${i}`, { feetPosition: { x: -70 + dx, y: 12.4, z: -93 + dz }, light: { kind: "point", color: "oklch(0.7 0.16 45)", intensity: 1.6, distance: 11, shadow: { enabled: false }, visibleRange: { max: 35 } } }));

  ctx.spawn("l7-fort-sign", {
    feetPosition: { x: -70.0, y: 15.1, z: -83.55 },
    rotation: { yaw: 0 },
    visibleRange: { max: 45 }, castShadow: false,
    primitive: { kind: "box", width: 3.2, height: 0.6, depth: 0.06 },
    material: { color: "oklch(0.18 0.02 55)" },
    ui: '<div face="front" width="3.2m" style="font-size:135px;font-weight:900;color:#f2d184;text-align:center;line-height:1.05">FORT SURRENDER<div style="font-size:64px;color:#d8c8a8">BROKEN FURNITURE · HELD WITH TAR · NOT FOR VISITORS</div></div>',
  });

  // Fort Surrender Warming Brazier
  ctx.spawn("l7-brazier-fort", {
    tags: ["usable"],
    feetPosition: { x: -70.0, y: 11.0, z: -93.5 },
    physics: "static",
    visibleRange: { max: 45 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "brazier" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "brazier",
      name: "Tar & driftwood ritual brazier",
      verb: "Warm hands & rest",
      info: "Restores health, sanity & warmth",
      tint: "#ff9e58",
      c: { x: -70.0, y: 11.6, z: -93.5 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.1, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.18 50)", intensity: 3.5, distance: 16, shadow: { enabled: false }, visibleRange: { max: 35 } } },
    ],
  });

  // Copper Seawater Distillation Still (produces Almond Water)
  ctx.spawn("l7-still", {
    tags: ["usable"],
    feetPosition: { x: -65.2, y: 11.0, z: -92.5 },
    physics: { body: "static", collider: "box" },
    visibleRange: { max: 45 }, castShadow: false,
    model: { id: "/cdn/value.d1a1c3e07217e0227ce8b234f2b09498eb8c2b424fb48699c11ebf9fc96bbd93.glb" }, layout: { box: { min: { x: -0.55, y: 0, z: -0.4 }, max: { x: 0.55, y: 1.45, z: 0.4 } } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "still",
      name: "Copper Seawater Condenser Still",
      verb: "Draw distilled Almond Water",
      info: "Boils Level 7 brine into pure Almond Water",
      tint: "#7fd6ff",
      c: { x: -65.2, y: 11.7, z: -92.5 },
    },
  });

  // Leviathan Ribcage Shrine & Abyssal Tar Altar at Fort Surrender Summit
  ctx.spawn("l7-shrine", {
    tags: ["usable"],
    feetPosition: { x: -70.0, y: 11.0, z: -101.0 },
    physics: "static",
    visibleRange: { max: 45 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "shrine" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "altar",
      name: "Altar of the Thing on Level 7",
      verb: "Commune with the Abyss",
      info: "Leviathan ribcage & bubbling abyssal tar [Survival / Speech 35]",
      tint: "#58f2e0",
      c: { x: -70.0, y: 11.8, z: -101.0 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.4, z: 0 }, light: { kind: "point", color: "oklch(0.82 0.19 180)", intensity: 2.8, distance: 12, shadow: { enabled: false }, visibleRange: { max: 35 } } },
    ],
  });

  // Rusted Submersible Diving Bell & Level 8 Tar Cavern Winch on the North Cliff (x: -81, y: 4.2, z: -113)
  ctx.spawn("l7-diving-bell", {
    tags: ["usable"],
    feetPosition: { x: -81.0, y: { terrain: 0.05 }, z: -113.0 },
    rotation: { yaw: 160 },
    physics: "static",
    visibleRange: { max: 45 }, castShadow: false,
    primitive: { kind: "scripted", script: "scripts/l7-ocean-geo.js", params: { kind: "divingbell" } },
    behavior: "scripts/l7-use.js",
    state: {
      kind: "divingbell",
      name: "Submersible Diving Bell (Level 8 Tar Cavern)",
      verb: "Haul Abyssal Winch Cable",
      info: "Hangs over the skeletal tar cave mouth to Level 8",
      tint: "#58f2c8",
      c: { x: -81.0, y: 11.4, z: -113.0 },
    },
    children: [
      { feetPosition: { x: 0, y: 1.5, z: 0 }, light: { kind: "point", color: "oklch(0.8 0.18 175)", intensity: 2.5, distance: 12, shadow: { enabled: false }, visibleRange: { max: 35 } } },
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
      visibleRange: { max: 70 },
      children: [
        {
          id: `${b.id}-light`,
          feetPosition: { x: 0, y: 3.9, z: 0 },
          light: { kind: "point", color: "oklch(0.85 0.22 45)", intensity: 2.8, distance: 18, shadow: { enabled: false }, visibleRange: { max: 45 } },
        },
      ],
    });
  });

  // =========================================================================
  // 4B. THE CIRCULAR FORMATION (about 150 m west of the entrance) and the dead of the deep
  // =========================================================================
  // pipes and cut stone pillars round a circular stone platform on the sea floor, a wooden door in its floor (to Level 9); Tiny's lair
  ctx.spawn("l7-circle", { feetPosition: { x: -150, y: { terrain: -0.3 }, z: 0 }, physics: { body: "static", collider: "mesh" }, model: { id: GLB.circle }, visibleRange: { max: 65 } });
  ctx.spawn("l7-circle-glow", { feetPosition: { x: -150, y: -20.6, z: 0 }, light: { kind: "point", color: "oklch(0.7 0.1 175)", intensity: 1.2, distance: 14, shadow: { enabled: false }, visibleRange: { max: 45 } } });
  // skeletons on the sea floor and washed up on the shore: humanoid, large jaws, flipper-like legs (they thicken toward the Twilight zone, the first full ones)
  [[-60, 40, 0], [-110, -50, 1], [-30, -30, 2], [20, 60, 3], [70, -60, 4], [-180, -30, 5], [-125, 28, 6], [-165, 22, 7], [-40, -150, 8], [90, -30, 9], [-95, 75, 10], [5, -88, 11]].forEach(([x, z, k]) => {
    ctx.spawn(`l7-skeleton-${k}`, { feetPosition: { x, z, y: { terrain: 0.02 } }, rotation: { yaw: k * 61 }, scale: 1.0 + (k % 3) * 0.12, model: { id: GLB.skeleton }, visibleRange: { max: 45 } });
  });

  ctx.spawn("l7-from-l8", { feetPosition: { x: -79.0, y: { terrain: 0.4 }, z: -110.5 }, rotation: { yaw: 20 } }); // where Level 8's lake sends you back: beside the diving bell
  layExtras(ctx, GLB, fit);
  layHouse(ctx, FY); // the entrance room as a 2000s living room

  // =========================================================================
  // 5. DUAL ABYSSAL TITANS: ENTITY 20 ("THE THING ON LEVEL 7") & "TINY"
  // =========================================================================
  // 1) Entity 20 ("The Thing on Level 7"): Colossal aquatic titan patrolling the bay
  ctx.spawn("l7-leviathan", {
    feetPosition: { x: 30, y: -15.0, z: -75 }, // the Thing keeps to the Midnight Zone and the upper Abyss: far down, its light the only sign
    rotation: { yaw: 70 },
    scale: { x: 6.8, y: 6.8, z: 6.8 },
    visibleRange: { max: 70 },
    model: { id: GLB.thing },
    children: [
      { feetPosition: { x: 0, y: 0.6, z: -1.2 }, light: { kind: "point", color: "oklch(0.85 0.22 175)", intensity: 5.0, distance: 22, shadow: { enabled: false }, visibleRange: { max: 50 } } },
      { feetPosition: { x: 0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
      { feetPosition: { x: -0.5, y: 0.7, z: -1.1 }, material: { color: "#ffffff", emissive: "oklch(0.85 0.22 175)", emissiveIntensity: 4.5 }, primitive: { kind: "sphere", radius: 0.09 } },
    ],
  });

  // 2) "Tiny" (Entity 720): stays in the Daylight and Twilight zones, near its lair at the circular formation west of the entrance (wiki: ~150 m west)
  ctx.spawn("l7-tiny", TINY());

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
  const PILLAR = { color: "oklch(0.36 0.01 230)", roughness: 0.9, texture: "cdn/texture-water-stained-streaked-old-poured-concrete-column.png", repeat: [0.12, 0.08], wrap: "repeat" };
  const CEIL = { color: "oklch(0.3 0.008 240)", roughness: 0.95, texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", repeat: [0.25, 0.25], wrap: "repeat" };
  ctx.spawn("l7-sky-ceiling", { feetPosition: { x: 0, y: 34, z: -100 }, primitive: { kind: "box", width: 1600, height: 3, depth: 1600 }, material: CEIL, castShadow: false });
  // the house hangs from the ceiling on one concrete column standing on its ridge (ridge at FY + 4.42)
  ctx.spawn("l7-hanger", { feetPosition: { x: 0, y: FY + 4.3, z: 0 }, primitive: { kind: "box", width: 1.6, height: 34 - FY - 4.3, depth: 1.6 }, material: { ...CEIL, color: "oklch(0.33 0.008 240)" }, castShadow: false });
  // the outside of the entrance room: a 2000s suburban house, vinyl lap siding, shuttered windows with mini-blinds, an asphalt-shingle gable, gutters, a dish
  ctx.spawn("l7-house-shell", { feetPosition: { x: 0, y: FY, z: 0 }, model: { id: "/cdn/value.ad21f35b53f1aafe0159d86fee9eb07e67a3aa1fcd646a46690ed6177cc755bb.glb", offset: [0, -1.6, -0.985], materials: { // the foundation hangs 1.6 m below the floor line; the front stoop shifts the bounds centre 0.985 m
    siding: { texture: "cdn/texture-grimy-weathered-pale-sage-vinyl-siding-paint.png", color: "oklch(0.78 0.03 110)", roughness: 0.6 },
    shingle: { texture: "cdn/texture-weathered-charcoal-asphalt-roof-shingle-granules.png", color: "oklch(0.42 0.005 250)", roughness: 0.95 },
    concrete: { texture: "cdn/texture-smooth-cold-poured-concrete-wall.png", color: "oklch(0.6 0.01 240)", roughness: 0.95 },
    trim: { color: "oklch(0.9 0.005 90)", roughness: 0.5 },
    shutter: { color: "oklch(0.32 0.05 165)", roughness: 0.6 },
    door: { color: "oklch(0.36 0.11 25)", roughness: 0.45 },
    glass: { color: "oklch(0.16 0.02 230)", roughness: 0.05, metalness: 0.3 },
  } }, receiveShadow: true }); // looks only: the room's own walls carry the collision, so the doorways stay open
  ctx.spawn("l7-house-porchlight", { feetPosition: { x: 1.0, y: FY + 1.75, z: 3.6 }, light: { kind: "point", color: "oklch(0.85 0.1 75)", intensity: 1.2, distance: 6 } });
  [
    [-140, -160, 14], [120, -230, 18], [-60, -330, 22],
    [210, -60, 16], [-230, -40, 16], [40, -420, 24],
  ].forEach(([x, z, w], i) =>
    ctx.spawn(`l7-pillar-${i}`, { feetPosition: { x, y: -30, z }, primitive: { kind: "cylinder", radiusTop: w * 0.5, radiusBottom: w * 0.56, height: 64, radialSegments: 20 }, material: PILLAR, castShadow: false, children: [
      { feetPosition: { x: 0, y: 29.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: w * 0.535, radiusBottom: w * 0.545, height: 2.2, radialSegments: 20 }, material: { color: "oklch(0.2 0.03 160)", roughness: 0.5, texture: "cdn/texture-slimy-dark-green-algae-tide-line-on-wet-concrete.png", repeat: [0.3, 0.5], wrap: "repeat" } }, // the tide band: slime where the sea licks it
      { feetPosition: { x: 0, y: 61.5, z: 0 }, primitive: { kind: "cylinder", radiusTop: w * 0.9, radiusBottom: w * 0.5, height: 2.5, radialSegments: 20 }, material: PILLAR }, // a flared capital where it meets the ceiling
    ] })
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

let lastFortLift = 0;
export function tick(ctx) {
  retextureOnce(ctx); // graphics pass: bare props get real surfaces
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  restyleSigns(ctx, "level7"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  if (!ctx.place.players?.length) return; // empty level: nothing to run (perf)
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    for (const id of Object.keys(ctx.place.objects)) if (GONE.includes(id) || /^l7-(plank|post)-/.test(id)) ctx.destroy(id);
    // rooms built before the fort moved still hold its old pieces (and the worshippers, standing where it was): clear them so the new ones are laid and the people come back
    for (const id of Object.keys(ctx.place.objects)) if (/^(l7x-|l7h-|l7-(from-l8$|wall-|wainscot-|step-|back$|shaft-|ceil$|hearth$|pedestal$|wirerack$|cloth-drape$|painting$|vase|dresser-top$|fort|ft-step|palisade|brazier-fort|still$|shrine$|diving-bell$|cult-chest|boat-from-fort|boulder-1[23]$|jude$|mara$|ezra$|ines$|tobit$))/.test(id)) ctx.destroy(id);
    s.npcGone = {};
    s.fortPlacementV = 0;
    // lag pass (LAGSCOPE #137, #138): clutter gets a draw distance, and nothing under 1.2 m casts a shadow
    const real = ctx.spawn, KEEP = /ocean|sea|island|isle|sky|fort$|lighthouse|seawatch$|sonar|vance|fauna|from-|spawn$/;
    const small = (sp) => { const b = sp.layout?.box, pr = sp.primitive; if (b) return Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) < 1.2;
      if (pr && pr.kind !== "scripted") return Math.max(pr.width ?? 0, pr.height ?? 0, pr.depth ?? 0, (pr.radius ?? pr.radiusTop ?? 0) * 2) < 1.2; return false; };
    try { ctx.spawn = (a, b) => { const id = typeof a === "string" ? a : a?.id ?? "", sp = typeof a === "string" ? b : a;
      if (sp && (sp.model || sp.primitive) && !KEEP.test(id)) { sp.visibleRange ??= { max: 90 }; if (small(sp)) sp.castShadow = false; }
      return b === undefined ? real.call(ctx, a) : real.call(ctx, a, b); }; } catch (e) {}
    try { lay(ctx); } finally { try { ctx.spawn = real; } catch (e) {} }
    s.builtV = V;
  }

  if ((s.stairV ?? 0) < 1) { // the concrete steps hide under the timber stair: rooms built before keep them as invisible colliders
    for (let k = 0; k < 14; k++) { const o = ctx.getObject(`l7-ft-step-${k}`); if (o) o.visible = false; }
    s.stairV = 1;
  }
  if ((s.fort2V ?? 0) < 3) { // Fort Surrender pass 2 (scripts/lib/level7-fort2.js): its fire, smoke, textures and sound
    for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l7f-")) ctx.destroy(id);
    layFort2(ctx); s.fort2V = 3;
  }
  if ((s.fortPathV ?? 0) < 1) { // Shelly: "make the path actually walkable without having to jump and rotate fort surrender so it connects"
    // 1) the stepped colliders (0.7 m risers) give way to one smooth 18 degree ramp under the timber stair, wharf (y 1.2) to the fort floor
    for (let k = 0; k < 14; k++) ctx.destroy(`l7-ft-step-${k}`);
    const at = (k) => ({ x: -48.5 - 1.35 * k, y: 2.27 + 0.7 * k, z: -66.5 - 1.65 * k });
    const A = at(-1.55), B = at(13.3), d = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, len = Math.hypot(d.x, d.y, d.z);
    const f = { x: d.x / len, y: d.y / len, z: d.z / len };
    ctx.spawn("l7-ft-ramp", { feetPosition: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - 0.17, z: (A.z + B.z) / 2 }, pivot: "center",
      rotation: rotationFromDirection(f), primitive: { kind: "box", width: 2.6, height: 0.3, depth: len }, physics: "static", visible: false, material: { color: "oklch(0.4 0.03 60)" } });
    // 2) the fort turns 38.7 degrees about its centre so the gate gap faces where the stair meets the palisade
    const th = fortAngle, cx = -70, cz = -93, qy = { x: 0, y: Math.sin(th / 2), z: 0, w: Math.cos(th / 2) };
    const mul = (a, b) => ({ w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w });
    for (const id of Object.keys(ctx.place.objects)) {
      if (id.startsWith("l7-ft-") || id.startsWith("l7w-") || isFortResident(ctx.place.objects[id])) continue;
      const o = ctx.place.objects[id]; if (!o || o.parent || o.tags?.includes?.("player")) continue;
      const p = o.feetPosition; if (!p || p.y < 8.5 || Math.hypot(p.x - cx, p.z - cz) > 13) continue;
      const dx = p.x - cx, dz = p.z - cz;
      o.feetPosition = { x: cx + dx * Math.cos(th) + dz * Math.sin(th), y: p.y, z: cz - dx * Math.sin(th) + dz * Math.cos(th) };
      const r = o.rotation; const q = r && typeof r === "object" && "w" in r ? r : { x: 0, y: 0, z: 0, w: 1 };
      o.rotation = mul(qy, q);
      if (o.state?.ladder) o.state.ladder = { ...o.state.ladder, yaw: (o.state.ladder.yaw ?? 0) + 38.7 };
      if (o.state?.home && typeof o.state.home.x === "number") { const h = o.state.home, hx = h.x - cx, hz = h.z - cz; o.state.home = { ...h, x: cx + hx * Math.cos(th) + hz * Math.sin(th), z: cz - hx * Math.sin(th) + hz * Math.cos(th) }; }
    }
    s.fortPathV = 1;
  }
  if ((s.fortPathV ?? 0) < 2) { // the old gate ramp sat 1.5 m over the new slope after the turn: one even ramp, wharf (1.2) to the gate lip (11.75)
    for (const id of Object.keys(ctx.place.objects)) if (id.startsWith("l7f-gate-ramp")) ctx.destroy(id);
    ctx.destroy("l7-ft-ramp");
    const xz = (k) => ({ x: -48.5 - 1.35 * k, z: -66.5 - 1.65 * k });
    const a = xz(-1.55), b = xz(12.3), A = { ...a, y: 1.2 }, B = { ...b, y: 11.75 };
    const d = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, len = Math.hypot(d.x, d.y, d.z), hz = Math.hypot(d.x, d.z);
    const f = { x: d.x / len, y: d.y / len, z: d.z / len }, drop = 0.15 * hz / len;
    ctx.spawn("l7-ft-ramp", { feetPosition: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - drop, z: (A.z + B.z) / 2 }, pivot: "center",
      rotation: rotationFromDirection(f), primitive: { kind: "box", width: 2.8, height: 0.3, depth: len + 0.4 }, physics: "static", visible: false });
    s.fortPathV = 2;
  }
  if ((s.fortPathV ?? 0) < 3) { // Shelly Nov 12 "cant enter or exit fort surrender": the ramp's top end stood 0.2 m proud of the fort floor (11.65) with a steep end face; it now ends flush at the gate, its spare length only at the wharf end
    ctx.destroy("l7-ft-ramp");
    const xz = (k) => ({ x: -48.5 - 1.35 * k, z: -66.5 - 1.65 * k });
    const a = xz(-1.55), b = xz(12.3), B = { ...b, y: 11.62 }, A0 = { ...a, y: 1.2 };
    const d0 = { x: B.x - A0.x, y: B.y - A0.y, z: B.z - A0.z }, l0 = Math.hypot(d0.x, d0.y, d0.z), f = { x: d0.x / l0, y: d0.y / l0, z: d0.z / l0 };
    const A = { x: A0.x - f.x * 0.6, y: A0.y - f.y * 0.6, z: A0.z - f.z * 0.6 }, len = l0 + 0.6, hz = Math.hypot(f.x, f.z), drop = 0.15 * hz;
    ctx.spawn("l7-ft-ramp", { feetPosition: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - drop, z: (A.z + B.z) / 2 }, pivot: "center",
      rotation: rotationFromDirection(f), primitive: { kind: "box", width: 2.8, height: 0.3, depth: len }, physics: "static", visible: false });
    s.fortPathV = 3;
  }
  if ((s.fortPathV ?? 0) < 4) { // Shelly Nov 12 "i can no longer climb": the ramp's end met the gate as an edge; it now stops just short and a flat landing at the fort floor (11.63) runs through the gate
    ctx.destroy("l7-ft-ramp"); ctx.destroy("l7-ft-landing");
    const xz = (k) => ({ x: -48.5 - 1.35 * k, z: -66.5 - 1.65 * k });
    const A = { ...xz(-1.8), y: 1.0 }, B = { ...xz(11.7), y: 11.6 };
    const d = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, len = Math.hypot(d.x, d.y, d.z), hz = Math.hypot(d.x, d.z);
    const f = { x: d.x / len, y: d.y / len, z: d.z / len }, drop = 0.15 * hz / len;
    ctx.spawn("l7-ft-ramp", { feetPosition: { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - drop, z: (A.z + B.z) / 2 }, pivot: "center",
      rotation: rotationFromDirection(f), primitive: { kind: "box", width: 2.8, height: 0.3, depth: len }, physics: "static", visible: false });
    const L0 = xz(11.4), L1 = xz(13.6), yaw = Math.atan2(-(L1.x - L0.x), -(L1.z - L0.z)) * 180 / Math.PI;
    ctx.spawn("l7-ft-landing", { feetPosition: { x: (L0.x + L1.x) / 2, y: 11.63 - 0.3, z: (L0.z + L1.z) / 2 }, rotation: { yaw },
      primitive: { kind: "box", width: 2.8, height: 0.3, depth: Math.hypot(L1.x - L0.x, L1.z - L0.z) }, physics: "static", visible: false });
    s.fortPathV = 4;
  }
  if ((s.fortPathV ?? 0) < 5) { // Shelly Nov 12 "cant enter or exit fort surrender": the fort shell's mesh collider sealed the gate and roofed the yard; its walls, posts, tower and floor already stand as their own blocks (level7-fort2.js, l7-fort-walk-floor)
    const f = ctx.place.objects["l7-fort"]; if (f) f.physics = "none";
    s.fortPathV = 5;
  }
  if ((s.fortPathV ?? 0) < 6) { // Shelly Nov 12 "i still cant get in its entrance": the ramp's top end stood 0.01 m proud of the landing, a 70-degree lip at the gate; it now tucks 0.12 m under the landing
    const r = ctx.place.objects["l7-ft-ramp"]; if (r) r.feetPosition = { ...r.feetPosition, y: r.feetPosition.y - 0.12 };
    s.fortPathV = 6;
  }
  if (!s.fortPlacementV) {
    // The mesh courtyard was supported only by terrain 0.7 m below the plank surface.
    ctx.spawn("l7-fort-walk-floor", { feetPosition: { x: -70, y: FORT_FLOOR - 0.22, z: -93 }, primitive: { kind: "cylinder", radiusTop: 8.5, radiusBottom: 8.5, height: 0.22 }, physics: "static", visible: false });
    const fixed = fortBreakables(FY, PY);
    for (const id of fortProps) {
      const o = ctx.place.objects[id]; if (!o) continue;
      o.feetPosition = fixed[id].feetPosition;
      o.rotation = fixed[id].rotation;
    }
    for (const id of ["l7-brazier-fort", "l7-still", "l7-shrine", "l7-fort-spawn"]) {
      const o = ctx.place.objects[id]; if (!o) continue;
      const p = o.feetPosition;
      const safe = id === "l7-fort-spawn" ? fortPoint({ x: -70.7, z: -87.5 }) : p;
      o.feetPosition = { ...safe, y: FORT_FLOOR + (id === "l7-fort-spawn" ? 0.08 : 0) };
    }
    for (const [id, g] of Object.entries(L7_NPCS)) {
      const o = ctx.place.objects[id];
      if (!isFortResident(o) || o.state.dead || o.state.follow) continue;
      const { home, rounds } = fortResident(g);
      if (Math.hypot(o.feetPosition.x + 70, o.feetPosition.z + 93) < 13) o.feetPosition = home;
      o.state.home = home;
      o.state.rounds = rounds;
      o.state.ri = 0;
    }
    s.fortPlacementV = 1;
  }
  // Shelly Nov 12 "npcs in fort surrender are under the fort": a resident who drops through to the rock (10.9) under the floor (FORT_FLOOR) is set back on the floor, every 3 s
  if (ctx.now() >= (lastFortLift ?? 0)) { lastFortLift = ctx.now() + 3000;
    for (const id of Object.keys(L7_NPCS)) { const o = ctx.place.objects[id];
      if (!isFortResident(o) || o.state.dead || o.state.follow) continue;
      const p = o.feetPosition; if (Math.hypot(p.x + 70, p.z + 93) < 14 && p.y < FORT_FLOOR - 0.3) { o.feetPosition = o.state.home?.x != null ? { ...o.state.home, y: FORT_FLOOR + 0.05 } : { x: p.x, y: FORT_FLOOR + 0.05, z: p.z }; o.velocity = { x: 0, y: 0, z: 0 }; } } }
  if ((s.fortPathV ?? 0) < 7) { // the walk floor (r 8.5) stopped short of the palisade (r ~9) and Ezra's round (r 9): people walked off its rim into the rock under the deck
    ctx.destroy("l7-fort-walk-floor");
    ctx.spawn("l7-fort-walk-floor", { feetPosition: { x: -70, y: FORT_FLOOR - 0.22, z: -93 }, primitive: { kind: "cylinder", radiusTop: 9.4, radiusBottom: 9.4, height: 0.22, radialSegments: 48 }, physics: "static", visible: false });
    s.fortPathV = 7;
  }
  if ((s.fortGateV ?? 0) < 4) { // Shelly Nov 12 "an actual doorway thats animated and interactable": two tarred wooden leaves on hinges, E swings them (home11-door.js)
    const leaf = { primitive: { kind: "scripted", script: "scripts/door-geo.js", params: { d: 0.14, h: 3.1, hingeSide: "left", part: "leaf", seed: 10, style: "wood", swing: 1, w: 2.3 } }, physics: "static", material: { pbr: true, color: "#8a5a3a" } };
    const gates = [["l7f-gate-0", { x: -66.65, y: 11.66, z: -84.66 }, 0, 38.68, 133.68], ["l7f-gate-1", { x: -62.59, y: 11.66, z: -87.91 }, -141.36, 218.68, 123.68]];
    for (const [id, at, yaw, closedYaw, openYaw] of gates) {
      if (ctx.place.objects[id]) ctx.destroy(id); // v2: hung closed on the wall line, leaves sized to the gap
      const pair = id === "l7f-gate-0" ? "l7f-gate-1" : "l7f-gate-0";
      const st = { hinge: id, pair, kind: "door", name: "Fort Surrender Gate", verb: "Open" };
      // v4: tagged usable like every other door (scripts/interact.js only focuses tagged things), the leaf answers E too
      ctx.spawn(id, { feetPosition: at, rotation: { yaw: closedYaw }, physics: "kinematic", tags: ["usable"], behavior: ["scripts/home11-door.js"], state: { ...st, closedYaw, openYaw, open: false }, children: [{ id: "leaf", ...leaf, tags: ["usable"], behavior: "scripts/home11-door.js", state: st }] });
    }
    s.fortGateV = 4;
  }
  if ((s.catV ?? 0) < 1 && !s.catBusy) { // Shelly Nov 12 "level 7 is still using the old npcs": the fort's people stood before the cat bodies; refit them in place (same path as Cap'n and Rico), state and weapons kept
    s.catBusy = 1;
    Promise.all([import("../../scripts/lib/critter-model.js"), import("../../scripts/lib/clothes.js")]).then(([{ refitBody }, { npcLook }]) => {
      for (const [id, g] of Object.entries(L7_NPCS)) {
        const o = ctx.place.objects[id]; if (!o) continue;
        const l = npcLook(id, g.look, "l7", 15);
        refitBody(ctx, o, l);
      }
      s.catV = 1; delete s.catBusy;
    }).catch((e) => { ctx.log("l7 cat refit", String(e)); delete s.catBusy; });
  }
  if (!ctx.getObject("l7-fauna")) ctx.spawn("l7-fauna", { behavior: "scripts/l7-fauna.js" }); // tidecrawlers on the shores, the Deep in open water
  // Ensure NPCs come back home after respawn window via level-kit
  if (every(ctx, "people", 5000)) {
    keepPeople(ctx, Object.keys(L7_NPCS), () => spawnL7People(ctx));
  }

  const now = ctx.now();
  tickChatter(ctx, CHATTER.level7, { "l7-vance": "reyes", "l7-jude": "hollis", "l7-mara": "mags", "l7-ezra": "reyes", "l7-ines": "mags", "l7-tobit": "hollis" }); // the fort talks among itself, Vance talks to his radio

  if (!s.lag139) { s.lag139 = 1; // lag pass (#139): what stood before the build pass keeps its old spec, so set it on the handles
    const KEEP = /ocean|sea|island|isle|sky|fort$|lighthouse|seawatch$|sonar|vance|fauna|from-|spawn$|dory|boat/;
    for (const [id, o] of Object.entries(ctx.place.objects)) { if (!/^l7/.test(id) || KEEP.test(id)) continue;
      try { o.visibleRange = { max: 90 }; if (/stain|bone|skeleton|crate|bottle|can|mound|shell|rope|net/.test(id)) o.castShadow = false; } catch (e) {} } }
  if (!s.lag138) { s.lag138 = 1; s.smashed = {}; for (const [id, spec] of Object.entries(fortBreakables(FY, PY))) if (!ctx.place.objects[id]) ctx.spawn(id, spec); } // re-lay what the failed build pass left out
  // Smashed props grow back after 60 min, never in someone's face
  if (every(ctx, "regrow", 5000)) {
    s.smashed ??= {};
    for (const [id, spec] of Object.entries(fortBreakables(FY, PY))) {
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

  // Tiny swims himself now (scripts/l7-tiny.js)
  if ((s.tinyV ?? 0) < 2 && ctx.place.objects["l7-tiny"]) { ctx.destroy("l7-tiny"); ctx.spawn("l7-tiny", TINY()); s.tinyV = 2; }
  if ((s.campBenchV ?? 0) < 1) {
    s.campBenchV = 1;
    ensureBenches(ctx, [
      ["l7-ammobench", ammobenchSpec({ x: 43.8, y: 7.0, z: -122.4 }, { yaw: 90, name: "Seawatch Reloading Bench", light: true })],
    ]);
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
          ctx.emit("damageNumber", { position: { x: fp.x, y: fp.y + 1.2, z: fp.z }, text: "INSULATED GEAR (PROTECTED)", color: "#ffd460" }, { audience: { player: p.id } });
        } else {
          p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - (suitPieces === 1 ? 2 : 4));
          p.state.hp = Math.max(5, (p.state.hp ?? 100) - (suitPieces === 1 ? 1 : 2));
          ctx.emit("screenFlash", { color: "#40a0ff", duration: 0.55, intensity: 0.35 }, { audience: { player: p.id } });
          ctx.emit("damageNumber", { position: { x: fp.x, y: fp.y + 1.2, z: fp.z }, text: "FREEZING BRINE (-HP, -SANITY)", color: "#74d4f8" }, { audience: { player: p.id } });
        }
      }
    }

    // Pierhead / deep-sea observation dread: deep abyssal groan, screen shake, dread badge
    if (fp.z < -28) {
      s.thalClock ??= {};
      const last = s.thalClock[p.id] ?? 0;
      if (now - last > 90000) {
        s.thalClock[p.id] = now;
        p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - 8);
        ctx.emit("screenShake", { intensity: 0.22, duration: 1.2 }, { audience: { player: p.id } });
        ctx.emit("screenFlash", { color: "#040b12", duration: 0.8, intensity: 0.4 }, { audience: { player: p.id } });
        ctx.emit("playSound", { clip: G("deep-whale-like-groan-from-far-under-dark-water"), position: { x: 0, y: -10, z: -80 }, volume: 0.8, refDistance: 40, maxDistance: 250 }, { audience: { player: p.id } });
        ctx.emit("damageNumber", { position: { x: fp.x, y: fp.y + 1.2, z: fp.z }, text: "ABYSSAL DREAD (-8 SANITY)", color: "#c060ff" }, { audience: { player: p.id } });
      }
    }
  }
}
