// Level 11 "The Infinite City" - Master Simulation & World Generator
// Wikidot lore: "The City That Never Sleeps" (backrooms-wiki.wikidot.com/level-11)
// An endless realistic Western metropolis featuring multi-lane asphalt avenues, detailed curbs,
// crosswalks, a grand urban canal with crossing roadway bridge, neoclassical masonry high-rises,
// modern glass towers, low-density strip malls, an office under renovation, M.E.G. Base Beta outpost,
// drivable city taxi cab, canal boat, interactive payphone, street food cart, and peaceful Level 11 entities.

import { heard } from "../../scripts/lib/hear.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { layCity, layStreet, tickCity } from "../../scripts/lib/level11-city.js";

export const cadence = "1s";
const V = 6; // bump to rebuild the city in rooms that are already open

// Photorealistic PBR textures from CDN
const T = (name, rep = 1) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });

const ASPHALT = { ...T("cracked-dark-asphalt-road", 4), color: "oklch(0.28 0.01 250)", roughness: 0.85 };
const SIDEWALK = { ...T("stained-concrete-floor", 3), color: "oklch(0.78 0.02 85)", roughness: 0.7 };
const CURB_MAT = { ...T("smooth-cold-poured-concrete-wall", 1), color: "oklch(0.72 0.02 85)", roughness: 0.65 };
const STONE_TOWER = { ...T("large-grey-brick-wall-dusty-mortar", 3), color: "oklch(0.82 0.025 80)", roughness: 0.75 };
const BRICK_BLDG = { ...T("old-red-brick-wall", 3), color: "oklch(0.58 0.1 35)", roughness: 0.8 };
const CONCRETE_CANAL = { ...T("smooth-cold-poured-concrete-wall", 2), color: "oklch(0.65 0.02 240)", roughness: 0.6 };
const PILLAR_MAT = { ...T("water-stained-streaked-old-poured-concrete-column", 1), color: "oklch(0.7 0.02 85)", roughness: 0.75 };
const MARBLE_FLOOR = { ...T("black-white-checkered-marble-floor", 2), roughness: 0.25 };
const STEEL_BRUSHED = { ...T("brushed-stainless-steel", 1), metalness: 0.85, roughness: 0.25 };
const IRON_RAIL = { ...T("black-wrought-iron", 1), color: "oklch(0.2 0.01 250)", metalness: 0.9, roughness: 0.4 };
const BARK_MAT = { ...T("smooth-grey-fig-tree-bark", 1), color: "oklch(0.48 0.03 60)", roughness: 0.85 };
const LEAF_MAT = { ...T("green-baize-felt", 2), color: "oklch(0.42 0.14 135)", roughness: 0.8 };

const GLASS_TINT = { color: "oklch(0.45 0.06 230)", opacity: 0.45, transparent: true, roughness: 0.05, metalness: 0.8 };
const WATER_MAT = { color: "oklch(0.38 0.09 220)", opacity: 0.88, transparent: true, roughness: 0.06, metalness: 0.2 };
const YELLOW_PAINT = { color: "oklch(0.84 0.18 88)", roughness: 0.45 };
const WHITE_PAINT = { color: "oklch(0.95 0.01 90)", roughness: 0.45 };
const TAXI_YELLOW = { color: "oklch(0.82 0.19 86)", roughness: 0.35, metalness: 0.2 };

// Particle effects
const WATER_RIPPLE = `fx
pop wave rate=8 on=box(60,.1,20) life=2..3.5 v=sdir()*.05 size=.4..0.9 acc=drag(1) col=<.75,.85,.9> a=0>.2:.25>0 sz=$size*(1>1.5) r=sprite(soft-disc,alpha)`;

const STEAM_CART = `fx
pop steam rate=12 on=box(.4,.2,.4) life=1.2..2 v=up(.6..1.2)+sdir()*.08 size=.08..0.22 acc=drag(1.2)+buoy(.2) col=<.95,.95,.98> a=.4>0 sz=$size*(1>2.2) r=sprite(smoke-puff,alpha)`;

const RIFT_VOID = `fx
pop void rate=18 on=sphere(.8) life=.8..1.6 v=sdir()*.2+up(.15) size=.04..0.12 col=hdr(0.4,1.8,2.8) a=0>.8:1>0 sz=$size*flick(14,.4) r=sprite(soft-disc,add)
pop pulse rate=4 on=point() life=1.2..1.8 v=up(.2) size=.3..0.6 col=hdr(0.2,0.8,2.2) a=0>.5:.5>0 sz=$size*(.5>2) r=sprite(smoke-puff,alpha)`;

function lay(ctx) {
  // Clear any existing level11 entities
  for (const id of Object.keys(ctx.place.objects ?? {})) {
    if (/^l11-/.test(id) && !id.includes("/")) ctx.destroy(id);
  }

  const sp = (id, spec) => ctx.spawn(id, spec);
  const bx = (id, x, y, z, w, h, d, material, extra = {}) =>
    sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const cyl = (id, x, y, z, rT, rB, h, material, extra = {}) =>
    sp(id, { feetPosition: { x, y, z }, primitive: { kind: "cylinder", radiusTop: rT, radiusBottom: rB, height: h }, material, physics: "static", ...extra });

  // ==========================================
  // 1. ARRIVAL MARKERS & THRESHOLDS
  // ==========================================
  // Entrance from Level 6.1 (The Snackrooms Restaurant exit)
  sp("l11-from-l61", {
    feetPosition: { x: -28, y: 0.25, z: 12 },
    rotation: { yaw: 90 },
  });

  // Return doorway back to Level 6.1
  bx("l11-to-l61-frame", -29.6, 0.2, 12, 0.2, 3.2, 2.4, { color: "oklch(0.3 0.01 250)", metalness: 0.7 });
  sp("l11-to-l61", {
    tags: ["door"],
    feetPosition: { x: -29.4, y: 0.2, z: 12 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 0.4, height: 3.0, depth: 2.2 },
    visible: false,
    physics: { body: "static", trigger: true },
    behavior: "scripts/level-door.js",
    state: { to: "level61#l61-from-l11" },
  });

  // Default plaza spawn point
  sp("l11-spawn", {
    feetPosition: { x: 0, y: 0.25, z: 12 },
    rotation: { yaw: 0 },
  });

  // ==========================================
  // 2. THE GRAND CENTRAL AVENUE & ROAD NETWORK
  // ==========================================
  // Main Boulevard: North-South from Z: -80 to Z: +80, width 16m
  bx("l11-road-north", 0, -0.05, -55, 16, 0.2, 50, ASPHALT);
  bx("l11-road-mid", 0, -0.05, 0, 16, 0.2, 36, ASPHALT);
  bx("l11-road-south", 0, -0.05, 48, 16, 0.2, 56, ASPHALT);

  // Cross Street (11th Avenue): East-West across intersection Z: 12
  bx("l11-cross-street", 0, -0.05, 12, 70, 0.2, 12, ASPHALT);

  // --- Real Road Markings ---
  // Double Yellow Centerline along Central Boulevard
  for (let z = -78; z <= 72; z += 6) {
    if (z > -36 && z < -24) continue; // canal bridge handled separately
    if (z > 6 && z < 18) continue;   // intersection
    bx(`l11-line-y1-${z}`, -0.08, 0.06, z, 0.1, 0.01, 5.4, YELLOW_PAINT, { physics: undefined });
    bx(`l11-line-y2-${z}`, 0.08, 0.06, z, 0.1, 0.01, 5.4, YELLOW_PAINT, { physics: undefined });
  }

  // White Dashed Lane Lines (both sides of center)
  for (let z = -76; z <= 70; z += 6) {
    if ((z > -36 && z < -24) || (z > 6 && z < 18)) continue;
    bx(`l11-dash-w-l-${z}`, -4.0, 0.06, z, 0.12, 0.01, 3.0, WHITE_PAINT, { physics: undefined });
    bx(`l11-dash-w-r-${z}`, 4.0, 0.06, z, 0.12, 0.01, 3.0, WHITE_PAINT, { physics: undefined });
  }

  // Zebra Pedestrian Crosswalks at Intersection Z: 12
  for (const crossZ of [5.2, 18.8]) {
    for (let x = -7.0; x <= 7.0; x += 1.4) {
      bx(`l11-crosswalk-${crossZ}-${Math.round(x * 10)}`, x, 0.06, crossZ, 0.8, 0.01, 3.2, WHITE_PAINT, { physics: undefined });
    }
  }

  // --- Concrete Sidewalks & Beveled Curbs ---
  // West Sidewalk
  bx("l11-sw-west-mid", -12, 0.08, 0, 7.6, 0.25, 36, SIDEWALK);
  bx("l11-sw-west-south", -12, 0.08, 48, 7.6, 0.25, 56, SIDEWALK);
  bx("l11-sw-west-north", -12, 0.08, -55, 7.6, 0.25, 50, SIDEWALK);
  // West Curb Edging
  bx("l11-curb-w-mid", -8.1, 0.08, 0, 0.2, 0.28, 36, CURB_MAT);
  bx("l11-curb-w-south", -8.1, 0.08, 48, 0.2, 0.28, 56, CURB_MAT);
  bx("l11-curb-w-north", -8.1, 0.08, -55, 0.2, 0.28, 50, CURB_MAT);

  // East Sidewalk
  bx("l11-sw-east-mid", 12, 0.08, 0, 7.6, 0.25, 36, SIDEWALK);
  bx("l11-sw-east-south", 12, 0.08, 48, 7.6, 0.25, 56, SIDEWALK);
  bx("l11-sw-east-north", 12, 0.08, -55, 7.6, 0.25, 50, SIDEWALK);
  // East Curb Edging
  bx("l11-curb-e-mid", 8.1, 0.08, 0, 0.2, 0.28, 36, CURB_MAT);
  bx("l11-curb-e-south", 8.1, 0.08, 48, 0.2, 0.28, 56, CURB_MAT);
  bx("l11-curb-e-north", 8.1, 0.08, -55, 0.2, 0.28, 50, CURB_MAT);

  // Storm Drain Gutter Grates along Curb
  for (const gz of [-45, -12, 28, 58]) {
    bx(`l11-drain-w-${gz}`, -8.0, 0.06, gz, 0.7, 0.01, 1.2, IRON_RAIL, { physics: undefined });
    bx(`l11-drain-e-${gz}`, 8.0, 0.06, gz, 0.7, 0.01, 1.2, IRON_RAIL, { physics: undefined });
  }

  // ==========================================
  // 3. THE GRAND CANAL & ROADWAY BRIDGE (Wikidot Image 4)
  // ==========================================
  const CANAL_Z = -30;
  const CANAL_W = 20;

  // Canal Water Bed & Reflective Water Surface
  bx("l11-canal-bed", 0, -4.5, CANAL_Z, 120, 0.4, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-canal-water", 0, -2.2, CANAL_Z, 120, 0.08, CANAL_W, WATER_MAT, {
    fx: { script: WATER_RIPPLE },
  });

  // Embankment Retaining Seawalls
  bx("l11-embank-south", 0, -2.2, CANAL_Z + CANAL_W / 2 + 0.5, 120, 4.4, 1.0, CONCRETE_CANAL);
  bx("l11-embank-north", 0, -2.2, CANAL_Z - CANAL_W / 2 - 0.5, 120, 4.4, 1.0, CONCRETE_CANAL);

  // Stone Coping Capstones along Promenade
  bx("l11-cope-south", 0, 0.2, CANAL_Z + CANAL_W / 2 + 0.5, 120, 0.3, 1.3, CURB_MAT);
  bx("l11-cope-north", 0, 0.2, CANAL_Z - CANAL_W / 2 - 0.5, 120, 0.3, 1.3, CURB_MAT);

  // Wrought Iron Promenade Safety Railings
  for (let rx = -58; rx <= 58; rx += 5) {
    if (rx > -12 && rx < 12) continue; // bridge opening
    bx(`l11-rail-s-${rx}`, rx, 0.45, CANAL_Z + CANAL_W / 2 + 0.5, 4.8, 0.85, 0.06, IRON_RAIL);
    bx(`l11-rail-n-${rx}`, rx, 0.45, CANAL_Z - CANAL_W / 2 - 0.5, 4.8, 0.85, 0.06, IRON_RAIL);
  }

  // Floating Wooden Boat Dock & Stairs
  bx("l11-dock-stairs", -14, -1.2, CANAL_Z + 7.5, 2.6, 2.2, 4.0, CONCRETE_CANAL);
  bx("l11-dock-pier", -14, -2.0, CANAL_Z + 2.5, 4.5, 0.35, 6.5, { ...T("worn-hardwood-grain", 1), color: "oklch(0.5 0.06 60)", roughness: 0.85 });

  // The Grand Canal Bridge (carries avenue across canal)
  bx("l11-bridge-deck", 0, -0.05, CANAL_Z, 17, 0.6, CANAL_W + 4, ASPHALT);
  bx("l11-bridge-arch-w", -8.5, -2.4, CANAL_Z, 1.2, 4.2, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-bridge-arch-e", 8.5, -2.4, CANAL_Z, 1.2, 4.2, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-bridge-parapet-w", -8.4, 0.5, CANAL_Z, 0.4, 0.95, CANAL_W + 4, CURB_MAT);
  bx("l11-bridge-parapet-e", 8.4, 0.5, CANAL_Z, 0.4, 0.95, CANAL_W + 4, CURB_MAT);

  // Bridge Lamps (warm lanterns lighting the bridge at dusk)
  [-7.5, 7.5].forEach((lx, k) => {
    cyl(`l11-blamp-pole-${k}`, lx, 1.4, CANAL_Z, 0.06, 0.08, 1.8, IRON_RAIL);
    sp(`l11-blamp-light-${k}`, {
      feetPosition: { x: lx, y: 3.2, z: CANAL_Z },
      light: { kind: "point", color: "oklch(0.9 0.14 85)", intensity: 4.5, distance: 14, shadow: { enabled: false } },
    });
  });

  // ==========================================
  // 4-6. THE CITY (art/level11/build.py models; scripts/lib/level11-city.js): the neoclassical grand tower with its skydeck terrace, the glass towers,
  //      the strip mall, brick apartments, houses, the road grid and the canal out to the fog. Shelly: realistic, not blocky, interesting.
  // ==========================================
  const city = layCity(ctx, { sp, bx, cyl });
  const TOWER_X = city.TOWER.x, TOWER_Z = city.TOWER.z, SKY_Y = 35.7;
  sp("l11-ntower-lobby-light", { feetPosition: { x: TOWER_X - 10, y: 4.5, z: TOWER_Z }, light: { kind: "point", color: "oklch(0.96 0.08 85)", intensity: 6.5, distance: 16 } });
  // the Skydeck Express call panel beside the tower's entrance, and the way back down from the terrace
  sp("l11-elev-btn-up", { tags: ["usable"], feetPosition: { x: TOWER_X - 8.55, y: 1.3, z: TOWER_Z + 4.5 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.2, height: 0.34, depth: 0.08 }, material: { color: "oklch(0.85 0.18 85)", emissive: "oklch(0.85 0.18 85)", emissiveIntensity: 2.0 }, behavior: "scripts/level11-use.js", state: { kind: "elevator-up", name: "Skydeck Express Elevator", verb: "Ascend to the Skydeck", dest: { x: TOWER_X - 5, y: SKY_Y + 0.1, z: TOWER_Z + 1 } } });
  sp("l11-elev-btn-down", { tags: ["usable"], feetPosition: { x: TOWER_X + 3.0, y: SKY_Y + 1.3, z: TOWER_Z + 5.6 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.2, height: 0.34, depth: 0.08 }, material: { color: "oklch(0.85 0.18 85)", emissive: "oklch(0.85 0.18 85)", emissiveIntensity: 2.0 }, behavior: "scripts/level11-use.js", state: { kind: "elevator-down", name: "Lobby Express Elevator", verb: "Descend to the street", dest: { x: TOWER_X - 12, y: 0.3, z: TOWER_Z + 4.5 } } });
  sp("l11-skydeck-binoculars", { tags: ["usable"], feetPosition: { x: TOWER_X - 5.2, y: SKY_Y, z: TOWER_Z - 4.5 }, rotation: { yaw: 90 }, primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.22, height: 1.35 }, material: STEEL_BRUSHED, behavior: "scripts/level11-use.js", state: { kind: "binoculars", name: "Panoramic Observation Viewfinder", verb: "Look through Viewfinder" }, children: [{ feetPosition: { x: 0, y: 1.3, z: -0.15 }, primitive: { kind: "box", width: 0.35, height: 0.18, depth: 0.45 }, material: STEEL_BRUSHED }] });

  // ==========================================
  // 7. OFFICE UNDER RENOVATION (Wikidot Image 5)
  // ==========================================
  const RENO_X = -22;
  const RENO_Z = 0;
  const RENO_W = 18;
  const RENO_D = 22;

  // Building Shell
  bx("l11-reno-shell", RENO_X, 0, RENO_Z, RENO_W, 8.5, RENO_D, BRICK_BLDG);
  bx("l11-reno-floor", RENO_X, 0.22, RENO_Z, RENO_W - 0.6, 0.1, RENO_D - 0.6, SIDEWALK);

  // Large Glass Display Windows Showing the Renovation
  bx("l11-reno-glass-e", RENO_X + RENO_W / 2, 0.2, RENO_Z, 0.1, 4.2, 16, GLASS_TINT);

  // Exposed Cylindrical Concrete Columns
  [[-26, -5], [-18, -5], [-26, 5], [-18, 5]].forEach(([cx, cz], k) => {
    cyl(`l11-reno-col-${k}`, cx, 0.2, cz, 0.42, 0.42, 4.8, PILLAR_MAT);
  });

  // Contractor Step Ladder (climbable!)
  sp("l11-reno-ladder", {
    tags: ["usable"],
    feetPosition: { x: -22, y: 0.2, z: 0 },
    primitive: { kind: "box", width: 0.65, height: 2.8, depth: 0.5 },
    material: { color: "oklch(0.78 0.14 85)", metalness: 0.6, roughness: 0.35 },
    behavior: "scripts/level11-use.js",
    state: { kind: "ladder", name: "Contractor Step Ladder", verb: "Climb Ladder" },
    children: [
      { feetPosition: { x: 0, y: 0.6, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.05, depth: 0.18 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.05, depth: 0.18 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 1.8, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.05, depth: 0.18 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 2.4, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.05, depth: 0.18 }, material: STEEL_BRUSHED },
    ],
  });

  // Construction Work Light Tripod casting bright halogen beam
  sp("l11-reno-worklight", {
    feetPosition: { x: -20, y: 0.2, z: -3 },
    primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.06, height: 1.8 },
    material: { color: "oklch(0.8 0.18 85)" },
    children: [
      { feetPosition: { x: 0, y: 1.8, z: 0 }, primitive: { kind: "box", width: 0.45, height: 0.25, depth: 0.2 }, material: { color: "oklch(0.8 0.18 85)" } },
      { feetPosition: { x: 0, y: 1.8, z: 0.2 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 8.5, distance: 18 } },
    ],
  });

  // Work Table with City Blueprints
  bx("l11-reno-table", -24, 0.2, 3, 2.4, 0.85, 1.2, { ...T("worn-hardwood-grain", 1), color: "oklch(0.55 0.06 65)" });
  bx("l11-reno-blueprints", -24, 1.06, 3, 1.6, 0.02, 0.9, { color: "oklch(0.4 0.12 240)", roughness: 0.8 }, { physics: undefined });

  // Contractor Supply Tool Chest
  sp("l11-reno-chest", {
    tags: ["usable"],
    feetPosition: { x: -25.5, y: 0.2, z: 3 },
    primitive: { kind: "box", width: 0.9, height: 0.55, depth: 0.5 },
    material: { color: "oklch(0.45 0.15 25)", metalness: 0.8, roughness: 0.35 },
    behavior: "scripts/level11-use.js",
    state: { kind: "supply-chest", name: "Contractor Heavy Tool Chest", verb: "Open Tool Chest" },
  });

  // ==========================================
  // 8. BARRICADED ANOMALOUS STREET & MEMORIAL (Wikidot Lore)
  // ==========================================
  const BARRICADE_X = -32;
  const BARRICADE_Z = 12;

  // Wood Pallet Barricade across Alleyway
  bx("l11-barricade-wood1", BARRICADE_X, 0, BARRICADE_Z - 2.5, 1.2, 2.2, 3.8, { ...T("worn-hardwood-grain", 1), color: "oklch(0.48 0.05 55)", roughness: 0.9 });
  bx("l11-barricade-wood2", BARRICADE_X, 0, BARRICADE_Z + 2.5, 1.2, 2.2, 3.8, { ...T("worn-hardwood-grain", 1), color: "oklch(0.48 0.05 55)", roughness: 0.9 });
  bx("l11-barricade-corrugated", BARRICADE_X, 0.4, BARRICADE_Z, 0.1, 2.4, 8.5, { ...T("grimy-scratched-steel-plate", 1), color: "oklch(0.5 0.04 40)", metalness: 0.7, roughness: 0.6 });

  // Spray-Painted Hazard Warning Signs
  sp("l11-barricade-sign1", {
    feetPosition: { x: BARRICADE_X + 0.6, y: 2.0, z: BARRICADE_Z - 1.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 2.4, height: 0.8, depth: 0.04 },
    material: { color: "oklch(0.2 0.01 250)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#ff3333;text-align:center"><div style="font-size:75px">DANGER: UNMAPPED EXITS</div><div style="font-size:32px;color:#ffffff">100+ NOCLIP RIFTS AHEAD · DO NOT ENTER</div></div>`,
  });

  // Memorial Site: Tamsin Clarke Memorial ("For my little strawberry")
  sp("l11-memorial-wreath", {
    feetPosition: { x: BARRICADE_X + 0.5, y: 0.1, z: BARRICADE_Z + 2.0 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 1.8, height: 0.7, depth: 0.04 },
    material: { color: "oklch(0.95 0.01 90)" },
    ui: `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif;font-style:italic;color:#333333;text-align:center"><div style="font-size:60px;color:#c01020">For my little strawberry</div><div style="font-size:28px">Tamsin Clarke · We will never stop searching</div></div>`,
  });

  // Memorial Candle Flame
  sp("l11-memorial-candle", {
    feetPosition: { x: BARRICADE_X + 0.8, y: 0.1, z: BARRICADE_Z + 1.2 },
    primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 0.22 },
    material: { color: "oklch(0.9 0.05 85)" },
    children: [
      { feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.18 75)", intensity: 2.2, distance: 4.5 } },
    ],
  });

  // Dimensional Rift beyond the barricade
  sp("l11-anomalous-rift", {
    feetPosition: { x: BARRICADE_X - 6, y: 1.4, z: BARRICADE_Z },
    fx: { script: RIFT_VOID },
  });

  // ==========================================
  // 9. STREET FURNITURE & REALISTIC DETAILS
  // ==========================================
  // the street: lamps, trees, benches, parked cars, billboards, manholes and a subway stair (scripts/lib/level11-city.js)
  const street = layStreet(ctx, { sp, bx, cyl });

  // Overhead Traffic Light Gantry at Intersection Z: 12
  cyl("l11-tlight-mast", -7.8, 0.1, 7.5, 0.16, 0.2, 5.8, IRON_RAIL);
  bx("l11-tlight-arm", 0, 5.7, 7.5, 15.5, 0.14, 0.14, IRON_RAIL);
  // 3-Aspect Signal Housings (Green, Amber, Red)
  [-3.5, 3.5].forEach((hx, k) => {
    sp(`l11-tlight-sig-${k}`, {
      feetPosition: { x: hx, y: 5.1, z: 7.5 },
      primitive: { kind: "box", width: 0.4, height: 1.1, depth: 0.3 },
      material: { color: "oklch(0.2 0.01 250)" },
      children: [
        { feetPosition: { x: 0, y: 0.35, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.85 0.22 145)", emissive: "oklch(0.85 0.22 145)", emissiveIntensity: 3.0 } },
        { feetPosition: { x: 0, y: 0, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.3 0.05 85)" } },
        { feetPosition: { x: 0, y: -0.35, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.3 0.05 25)" } },
      ],
    });
  });

  // ==========================================
  // 10. DRIVABLE YELLOW CITY TAXI CAB ("Level 11 Express")
  // ==========================================
  // Parked at the avenue curb at X: -5.5, Z: 6
  sp("l11-taxi", {
    tags: ["usable", "vehicle", "taxi"],
    feetPosition: { x: -5.5, y: 0.08, z: 6 },
    rotation: { yaw: 0 },
    physics: { body: "kinematic", collider: "box" },
    behavior: "scripts/level11-car.js",
    state: { kind: "taxi", name: "Level 11 Express Taxi", verb: "Drive Taxi" },
    primitive: { kind: "box", width: 2.2, height: 1.1, depth: 4.6 },
    material: TAXI_YELLOW,
    children: [
      // Cabin Roof
      { feetPosition: { x: 0, y: 1.05, z: -0.2 }, primitive: { kind: "box", width: 1.9, height: 0.65, depth: 2.3 }, material: TAXI_YELLOW },
      // Windshield & Rear Glass
      { feetPosition: { x: 0, y: 1.08, z: -1.35 }, rotation: { pitch: -28 }, primitive: { kind: "box", width: 1.82, height: 0.65, depth: 0.05 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 1.08, z: 0.95 }, rotation: { pitch: 28 }, primitive: { kind: "box", width: 1.82, height: 0.65, depth: 0.05 }, material: GLASS_TINT },
      // Side Windows
      { feetPosition: { x: -0.96, y: 1.08, z: -0.2 }, primitive: { kind: "box", width: 0.05, height: 0.55, depth: 2.1 }, material: GLASS_TINT },
      { feetPosition: { x: 0.96, y: 1.08, z: -0.2 }, primitive: { kind: "box", width: 0.05, height: 0.55, depth: 2.1 }, material: GLASS_TINT },
      // Illuminated Roof TAXI Sign
      { feetPosition: { x: 0, y: 1.75, z: -0.2 }, primitive: { kind: "box", width: 0.65, height: 0.22, depth: 0.25 }, material: { color: "oklch(0.95 0.15 85)", emissive: "oklch(0.95 0.15 85)", emissiveIntensity: 2.5 } },
      // Chrome Bumpers
      { feetPosition: { x: 0, y: 0.18, z: -2.35 }, primitive: { kind: "box", width: 2.1, height: 0.2, depth: 0.15 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 0.18, z: 2.35 }, primitive: { kind: "box", width: 2.1, height: 0.2, depth: 0.15 }, material: STEEL_BRUSHED },
      // Headlights with Forward Light Beam
      { feetPosition: { x: -0.75, y: 0.5, z: -2.32 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0.75, y: 0.5, z: -2.32 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0, y: 0.5, z: -3.5 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 7.5, distance: 24, shadow: { enabled: false } } },
      // Rear Red Taillights
      { feetPosition: { x: -0.85, y: 0.55, z: 2.32 }, primitive: { kind: "box", width: 0.28, height: 0.15, depth: 0.05 }, material: { color: "oklch(0.55 0.22 25)", emissive: "oklch(0.55 0.22 25)", emissiveIntensity: 2.0 } },
      { feetPosition: { x: 0.85, y: 0.55, z: 2.32 }, primitive: { kind: "box", width: 0.28, height: 0.15, depth: 0.05 }, material: { color: "oklch(0.55 0.22 25)", emissive: "oklch(0.55 0.22 25)", emissiveIntensity: 2.0 } },
    ],
  });

  // Front Wheels (Steerable children of vehicle)
  cyl("l11-taxi-wheel-fl", -1.05, 0.28, -1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  cyl("l11-taxi-wheel-fr", 1.05, 0.28, -1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  // Rear Wheels
  cyl("l11-taxi-wheel-rl", -1.05, 0.28, 1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  cyl("l11-taxi-wheel-rr", 1.05, 0.28, 1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });

  // ==========================================
  // 11. CANAL WATER SKIFF (Moored at Floating Dock)
  // ==========================================
  sp("l11-boat", {
    tags: ["usable", "vehicle", "boat"],
    feetPosition: { x: -14, y: -2.25, z: CANAL_Z + 1.5 },
    rotation: { yaw: 90 },
    physics: { body: "kinematic", collider: "box" },
    behavior: "scripts/level11-boat.js",
    state: { kind: "boat", name: "Canal Motor Skiff", verb: "Pilot Canal Boat" },
    primitive: { kind: "box", width: 1.8, height: 0.75, depth: 4.2 },
    material: { ...T("worn-hardwood-grain", 1), color: "oklch(0.35 0.05 240)", roughness: 0.7 },
    children: [
      { feetPosition: { x: 0, y: 0.45, z: -0.3 }, primitive: { kind: "box", width: 1.5, height: 0.35, depth: 0.6 }, material: { color: "oklch(0.6 0.06 60)", roughness: 0.8 } },
      { feetPosition: { x: 0, y: 0.6, z: 1.7 }, primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.16, height: 0.55 }, material: STEEL_BRUSHED },
    ],
  });

  // ==========================================
  // 12. WORKING STREET PAYPHONE BOOTH
  // ==========================================
  sp("l11-payphone", {
    tags: ["usable"],
    feetPosition: { x: -8.8, y: 0.1, z: 15.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 1.0, height: 2.3, depth: 1.0 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "payphone", name: "Municipal Street Payphone", verb: "Answer Payphone" },
    children: [
      // Glass Booth Panels
      { feetPosition: { x: -0.48, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.04, height: 1.8, depth: 0.9 }, material: GLASS_TINT },
      { feetPosition: { x: 0.48, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.04, height: 1.8, depth: 0.9 }, material: GLASS_TINT },
      // Telephone Housing & Handset
      { feetPosition: { x: 0, y: 1.35, z: -0.38 }, primitive: { kind: "box", width: 0.32, height: 0.48, depth: 0.18 }, material: { color: "oklch(0.25 0.01 250)" } },
      { feetPosition: { x: 0, y: 1.45, z: -0.26 }, primitive: { kind: "box", width: 0.28, height: 0.08, depth: 0.08 }, material: { color: "oklch(0.15 0.01 250)" } },
      // Illuminated Top Sign
      { feetPosition: { x: 0, y: 2.2, z: 0 }, primitive: { kind: "box", width: 0.9, height: 0.25, depth: 0.9 }, material: { color: "oklch(0.4 0.16 240)", emissive: "oklch(0.4 0.16 240)", emissiveIntensity: 2.0 } },
    ],
  });

  // ==========================================
  // 13. AL'S LEVEL 11 HOT DOG & PRETZEL CART
  // ==========================================
  sp("l11-foodcart", {
    feetPosition: { x: 9.2, y: 0.1, z: 15 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 1.4, height: 0.95, depth: 2.2 },
    material: STEEL_BRUSHED,
    fx: { script: STEAM_CART },
    children: [
      // Umbrella
      { feetPosition: { x: 0, y: 1.8, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 1.8 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 2.7, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 1.4, height: 0.45 }, material: { color: "oklch(0.85 0.18 85)", roughness: 0.7 } },
      // Condiment Bottles (Mustard / Ketchup)
      { feetPosition: { x: 0.35, y: 1.02, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.22 }, material: { color: "oklch(0.85 0.2 85)" } },
      { feetPosition: { x: 0.35, y: 1.02, z: 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.22 }, material: { color: "oklch(0.55 0.22 25)" } },
    ],
  });

  // Interactive Pretzel Tray
  sp("l11-food-pretzel", {
    tags: ["usable"],
    parent: "l11-foodcart",
    feetPosition: { x: 0.1, y: 0.96, z: -0.4 },
    primitive: { kind: "box", width: 0.5, height: 0.15, depth: 0.5 },
    material: { color: "oklch(0.7 0.12 65)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "food-pretzel", name: "Hot Salted Capital Pretzel", verb: "Buy Hot Pretzel" },
  });

  // Interactive Hot Dog Grill
  sp("l11-food-hotdog", {
    tags: ["usable"],
    parent: "l11-foodcart",
    feetPosition: { x: 0.1, y: 0.96, z: 0.3 },
    primitive: { kind: "box", width: 0.5, height: 0.15, depth: 0.6 },
    material: { color: "oklch(0.45 0.15 28)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "food-hotdog", name: "New York Style Street Dog", verb: "Order Street Dog" },
  });

  // ==========================================
  // 14. M.E.G. BASE BETA FORWARD OUTPOST
  // ==========================================
  const OUTPOST_X = 22;
  const OUTPOST_Z = -14;

  // Sandbag Emplacements
  bx("l11-meg-sandbag1", OUTPOST_X - 6, 0.1, OUTPOST_Z - 3, 0.6, 0.85, 3.5, { ...T("burlap-sack-weave", 1), color: "oklch(0.65 0.06 70)" });
  bx("l11-meg-sandbag2", OUTPOST_X - 6, 0.1, OUTPOST_Z + 3, 0.6, 0.85, 3.5, { ...T("burlap-sack-weave", 1), color: "oklch(0.65 0.06 70)" });

  // M.E.G. Command Canopy & Table
  bx("l11-meg-table", OUTPOST_X, 0.1, OUTPOST_Z, 2.2, 0.85, 1.2, STEEL_BRUSHED);
  sp("l11-meg-terminal", {
    tags: ["usable"],
    feetPosition: { x: OUTPOST_X, y: 0.95, z: OUTPOST_Z },
    primitive: { kind: "box", width: 0.55, height: 0.45, depth: 0.4 },
    material: { color: "oklch(0.3 0.01 250)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "terminal", name: "M.E.G. Tactical Terminal", verb: "Read Level 11 Dossier" },
    children: [
      { feetPosition: { x: 0, y: 0.1, z: 0.2 }, primitive: { kind: "box", width: 0.45, height: 0.3, depth: 0.02 }, material: { color: "oklch(0.4 0.16 145)", emissive: "oklch(0.4 0.16 145)", emissiveIntensity: 2.2 } },
    ],
  });

  // M.E.G. Supply Cache Chest
  sp("l11-meg-cache", {
    tags: ["usable"],
    feetPosition: { x: OUTPOST_X + 2.5, y: 0.1, z: OUTPOST_Z - 2 },
    primitive: { kind: "box", width: 0.9, height: 0.55, depth: 0.6 },
    material: { color: "oklch(0.4 0.08 140)", metalness: 0.7, roughness: 0.4 },
    behavior: "scripts/level11-use.js",
    state: { kind: "supply-chest", name: "M.E.G. Emergency Rations Crate", verb: "Salvage Supplies" },
  });

  // M.E.G. Operative Vance
  sp("l11-meg-agent-vance", {
    tags: ["npc", "meg"],
    feetPosition: { x: OUTPOST_X - 4.5, y: 0.1, z: OUTPOST_Z },
    rotation: { yaw: -90 },
    physics: "character",
    ...critterSpec(npcLook("l11-vance", { species: "wolf", sex: "m", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, "guard", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Specialist Vance · M.E.G. Base Beta",
      role: "guard",
      voice: "reyes",
      faction: "meg",
      factionName: "M.E.G. Base Beta Command",
      home: { x: OUTPOST_X - 4.5, z: OUTPOST_Z },
      line: "Welcome to Level 11, wanderer. You made it to the City. Keep your wits about you, but breathe easy.",
      ...npcState(ctx, "agent", 120),
    },
  });

  // ==========================================
  // 15. FRIENDLY LEVEL 11 ENTITIES (Level 11 Effect)
  // ==========================================
  // Friendly Hound lying on sidewalk rug (Wikidot lore: entities become docile)
  bx("l11-hound-rug", 8.8, 0.1, -5, 1.8, 0.02, 1.4, { ...T("worn-canvas-fabric", 1), color: "oklch(0.45 0.06 60)" }, { physics: undefined });
  sp("l11-friendly-hound", {
    tags: ["usable", "hound"],
    feetPosition: { x: 8.8, y: 0.1, z: -5 },
    rotation: { yaw: -90 },
    physics: "character",
    model: { id: "/cdn/value.34685ffaa43d04fc4ca5c09a807d8858ec4f514bf6df96b86dcf38da41d60155.glb", forward: "+z" },
    behavior: "scripts/level11-use.js",
    state: {
      kind: "pet-hound",
      name: "Docile Level 11 Hound",
      verb: "Pet Friendly Hound",
      info: "Affected by the Level 11 Effect. Completely calm and friendly, like a domestic stray dog.",
    },
  });

  // Commuter Faceling in business trench coat walking the sidewalk
  sp("l11-commuter-faceling", {
    tags: ["npc", "faceling"],
    feetPosition: { x: -11.5, y: 0.1, z: 24 },
    rotation: { yaw: 180 },
    physics: "character",
    ...critterSpec(npcLook("l11-faceling1", { species: "cat", sex: "f", topw: "jacket", top: "#2a2a35", botw: "pants", bottom: "#202028", shoes: "boots" }, "wanderer", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
    state: {
      name: "Commuter Faceling",
      role: "survivor",
      voice: "wren",
      line: "Pardon me, heading to the commercial plaza before the streetlights turn.",
      ...npcState(ctx, "faceling", 90),
    },
  });
}

export function onSpawn(ctx) {
  lay(ctx);
  ctx.place.state.builtV = V;
}

export function tick(ctx) {
  if (!ctx.place.players?.length) return;
  const st = ctx.place.state;
  if ((st.builtV ?? 0) < V) { lay(ctx); st.builtV = V; }
}

export function update(ctx, dt) {
  // Level 11 continuous environment pulse
  const now = ctx.now();
  const mem = (ctx.self.session.l11 ??= {
    bellAt: now + 12000,
    ringAt: now + 35000,
  });

  tickCity(ctx, mem, heard); // billboards, parked cars, far-off sirens (scripts/lib/level11-city.js)

  // Periodic distant phone ring to guide wanderers
  if (now > mem.ringAt) {
    mem.ringAt = now + 45000 + ctx.random() * 30000;
    const phone = ctx.getObject("l11-payphone");
    if (phone) {
      heard(ctx, {
        clip: "/cdn/moodboard-realistic-gritty/sfx-old-payphone-mechanical-bell-ringing-loop.mp3",
        position: phone.feetPosition,
        volume: 0.75,
        maxDistance: 32,
      });
    }
  }
}
