// Level 11 "The Infinite City" - Master Simulation & World Generator
// Wikidot lore: "The City That Never Sleeps" (backrooms-wiki.wikidot.com/level-11)
// An endless realistic Western metropolis faithfully realizing all 5 canonical Wikidot scenes:
// 1. Downtown Avenue Canyon with Pegasus Skyscraper banner, traffic lights & tree-lined sidewalks.
// 2. High/Low Transition Block with classical Stone Tower, "Sedco Spotlight" storefront & open parking lot.
// 3. Southwestern Strip Mall with blue awnings, Centro Dermatológico, IS LAB, enterable Marroka Pizzeria, & rooftop antenna.
// 4. Grand Urban Canal with reflective water, multiple crossing bridges, waterside promenade & drivable motor skiff.
// 5. Office Under Renovation with custom shell model, suspended drop-ceiling grid, ductwork, drywall sheets, step-ladder & B.R.C. clipboard.
// Plus: Drivable City Taxi, M.E.G. Base Beta outpost with custom models, working street payphone, hot dog cart, docile entities, & Spamton's alley.

import { heard } from "../../scripts/lib/hear.js";
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { layCity, layStreet, tickCity } from "../../scripts/lib/level11-city.js";
import MODELS from "../../scripts/lib/data/level11-models.yml";

export const cadence = "1s";
const V = 18; // bump to rebuild the city in rooms that are already open

// Photorealistic PBR textures from CDN
const T = (name, rep = 1) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });

const ASPHALT = { ...T("cracked-dark-asphalt-road", 4), color: "oklch(0.4 0.01 250)", roughness: 0.85 };
const SIDEWALK = { ...T("stained-concrete-floor", 3), color: "oklch(0.95 0.02 85)", roughness: 0.7 };
const CURB_MAT = { ...T("smooth-cold-poured-concrete-wall", 1), color: "oklch(0.72 0.02 85)", roughness: 0.65 };
const STONE_TOWER = { ...T("large-grey-brick-wall-dusty-mortar", 3), color: "oklch(0.82 0.025 80)", roughness: 0.75 };
const BRICK_BLDG = { ...T("old-red-brick-wall", 3), color: "oklch(0.58 0.1 35)", roughness: 0.8 };
const SEDCO_BRICK = { ...T("old-red-brick-wall", 2), color: "oklch(0.46 0.08 32)", roughness: 0.88 };
const CONCRETE_CANAL = { ...T("smooth-cold-poured-concrete-wall", 2), color: "oklch(0.65 0.02 240)", roughness: 0.6 };
const PILLAR_MAT = { ...T("water-stained-streaked-old-poured-concrete-column", 1), color: "oklch(0.7 0.02 85)", roughness: 0.75 };
const MARBLE_FLOOR = { ...T("black-white-checkered-marble-floor", 2), roughness: 0.25 };
const STEEL_BRUSHED = { ...T("brushed-stainless-steel", 1), metalness: 0.85, roughness: 0.25 };
const IRON_RAIL = { ...T("black-wrought-iron", 1), color: "oklch(0.2 0.01 250)", metalness: 0.9, roughness: 0.4 };
const STUCCO_MALL = { ...T("cream-painted-plaster-wall", 3), color: "oklch(0.92 0.03 85)", roughness: 0.85 };
const SANDSTONE_WALL = { ...T("large-grey-brick-wall-dusty-mortar", 2), color: "oklch(0.85 0.05 75)", roughness: 0.8 };
const BLUE_AWNING = { color: "oklch(0.45 0.22 250)", roughness: 0.85 };
const DRYWALL_MAT = { ...T("cream-painted-plaster-wall", 2), color: "oklch(0.88 0.025 85)", roughness: 0.9 };
const SILVER_FOIL = { color: "oklch(0.85 0.01 250)", metalness: 0.9, roughness: 0.2 };
const TERRACOTTA_TILES = { ...T("worn-red-clay-roof-tiles", 3), color: "oklch(0.6 0.12 40)", roughness: 0.75 };

const WOOD = { ...T("worn-hardwood-grain", 1.5), color: "oklch(0.62 0.05 60)", roughness: 0.9 };
const WOOD_OLD = { ...T("worn-hardwood-grain", 1.5), color: "oklch(0.55 0.02 70)", roughness: 0.95 };
const RUST = { ...T("rusted-corroded-steel", 1.5), roughness: 0.85 };
const STEEL = { ...T("grimy-scratched-steel-plate", 1.5), roughness: 0.55, metalness: 0.7 };

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
  const md = (id, kind, x, y, z, materials, collider = "box", extra = {}) =>
    sp(id, { feetPosition: { x, y, z }, model: { id: MODELS[kind], forward: "-z", materials }, physics: { body: "static", collider }, ...extra });
  const bx = (id, x, y, z, w, h, d, material, extra = {}) =>
    sp(id, { feetPosition: { x, y, z }, primitive: { kind: "box", width: w, height: h, depth: d }, material, physics: "static", ...extra });
  const cyl = (id, x, y, z, rT, rB, h, material, extra = {}) =>
    sp(id, { feetPosition: { x, y, z }, primitive: { kind: "cylinder", radiusTop: rT, radiusBottom: rB, height: h }, material, physics: "static", ...extra });

  // ==========================================
  // 1. ARRIVAL MARKERS & THRESHOLDS
  // ==========================================
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
  // 2. SCENE 1: THE GRAND BOULEVARD & DOWNTOWN CANYON (Wikidot Image 1)
  // ==========================================
  // Main Boulevard: North-South from Z: -80 to Z: +80, width 16m
  bx("l11-road-north", 0, -0.05, -55, 16, 0.2, 50, ASPHALT);
  bx("l11-road-mid", 0, -0.05, 0, 16, 0.2, 36, ASPHALT);
  bx("l11-road-south", 0, -0.05, 48, 16, 0.2, 56, ASPHALT);

  // Cross Street (11th Avenue): East-West across intersection Z: 12
  bx("l11-cross-street", 0, -0.05, 12, 70, 0.2, 12, ASPHALT);

  // Road Markings: Double Yellow Centerline
  for (let z = -78; z <= 72; z += 6) {
    if (z > -36 && z < -24) continue;
    if (z > 6 && z < 18) continue;
    bx(`l11-line-y1-${z}`, -0.08, 0.06, z, 0.1, 0.01, 5.4, YELLOW_PAINT, { physics: undefined });
    bx(`l11-line-y2-${z}`, 0.08, 0.06, z, 0.1, 0.01, 5.4, YELLOW_PAINT, { physics: undefined });
  }

  // White Dashed Lane Lines
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

  // Concrete Sidewalks & Beveled Curbs
  bx("l11-sw-west-mid", -12, 0.08, 0, 7.6, 0.25, 36, SIDEWALK);
  bx("l11-sw-west-south", -12, 0.08, 48, 7.6, 0.25, 56, SIDEWALK);
  bx("l11-sw-west-north", -12, 0.08, -55, 7.6, 0.25, 50, SIDEWALK);
  bx("l11-curb-w-mid", -8.1, 0.08, 0, 0.2, 0.28, 36, CURB_MAT);
  bx("l11-curb-w-south", -8.1, 0.08, 48, 0.2, 0.28, 56, CURB_MAT);
  bx("l11-curb-w-north", -8.1, 0.08, -55, 0.2, 0.28, 50, CURB_MAT);

  bx("l11-sw-east-mid", 12, 0.08, 0, 7.6, 0.25, 36, SIDEWALK);
  bx("l11-sw-east-south", 12, 0.08, 48, 7.6, 0.25, 56, SIDEWALK);
  bx("l11-sw-east-north", 12, 0.08, -55, 7.6, 0.25, 50, SIDEWALK);
  bx("l11-curb-e-mid", 8.1, 0.08, 0, 0.2, 0.28, 36, CURB_MAT);
  bx("l11-curb-e-south", 8.1, 0.08, 48, 0.2, 0.28, 56, CURB_MAT);
  bx("l11-curb-e-north", 8.1, 0.08, -55, 0.2, 0.28, 50, CURB_MAT);

  // Storm Drain Gutter Grates
  for (const gz of [-45, -12, 28, 58]) {
    bx(`l11-drain-w-${gz}`, -8.0, 0.06, gz, 0.7, 0.01, 1.2, IRON_RAIL, { physics: undefined });
    bx(`l11-drain-e-${gz}`, 8.0, 0.06, gz, 0.7, 0.01, 1.2, IRON_RAIL, { physics: undefined });
  }

  // --- THE ICONIC PEGASUS BANNER (Wikidot Image 1) ---
  bx("l11-pegasus-arm-top", 16.1, 21.0, 2.0, 0.8, 0.12, 0.12, STEEL_BRUSHED);
  bx("l11-pegasus-arm-bot", 16.1, 9.5, 2.0, 0.8, 0.12, 0.12, STEEL_BRUSHED);
  sp("l11-pegasus-banner", {
    feetPosition: { x: 16.0, y: 9.5, z: 2.0 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 2.2, height: 11.5, depth: 0.06 },
    material: { color: "#e85d04", roughness: 0.5 },
    ui: `<div face="front" width="2.2m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e85d04;color:#ffffff;font-family:Arial Black,Impact,sans-serif;font-weight:900;font-size:125px;writing-mode:vertical-rl;letter-spacing:18px;text-align:center">PEGASUS</div>`,
  });

  // Overhead Traffic Light Gantry at Intersection Z: 12
  cyl("l11-tlight-mast", -7.8, 0.1, 7.5, 0.16, 0.2, 5.8, IRON_RAIL);
  bx("l11-tlight-arm", 0, 5.7, 7.5, 15.5, 0.14, 0.14, IRON_RAIL);

  // Blue Intersection Street Name Signs
  sp("l11-st-sign-11th", {
    feetPosition: { x: -6.5, y: 5.2, z: 7.5 },
    primitive: { kind: "box", width: 2.0, height: 0.45, depth: 0.05 },
    material: { color: "oklch(0.3 0.12 240)" },
    ui: `<div face="front" width="2.0m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#155490;border:3px solid #ffffff;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:80px;letter-spacing:2px">11TH AVE</div>`,
  });
  sp("l11-st-sign-blvd", {
    feetPosition: { x: -4.2, y: 5.2, z: 7.5 },
    primitive: { kind: "box", width: 2.4, height: 0.45, depth: 0.05 },
    material: { color: "oklch(0.3 0.12 240)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#155490;border:3px solid #ffffff;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:75px;letter-spacing:2px">METROPOLITAN BLVD</div>`,
  });

  // 3-Aspect Signal Housings (Green, Amber, Red)
  [-3.5, 3.5].forEach((hx, k) => {
    sp(`l11-tlight-sig-${k}`, {
      feetPosition: { x: hx, y: 5.1, z: 7.5 },
      primitive: { kind: "box", width: 0.4, height: 1.1, depth: 0.3 },
      material: { color: "oklch(0.2 0.01 250)" },
      children: [
        { id: "lamp-g", feetPosition: { x: 0, y: 0.35, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.85 0.22 145)", emissive: "oklch(0.85 0.22 145)", emissiveIntensity: 3.0 } },
        { id: "lamp-y", feetPosition: { x: 0, y: 0, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.3 0.05 85)" } },
        { id: "lamp-r", feetPosition: { x: 0, y: -0.35, z: 0.16 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.05 }, rotation: { pitch: 90 }, material: { color: "oklch(0.3 0.05 25)" } },
      ],
    });
  });

  // Pedestrian Signal Housing Boxes
  [-7.7, 7.7].forEach((sx, k) => {
    sp(`l11-pedsig-${k}`, {
      feetPosition: { x: sx, y: 2.4, z: 7.5 },
      primitive: { kind: "box", width: 0.35, height: 0.65, depth: 0.25 },
      material: { color: "oklch(0.2 0.01 250)" },
      ui: `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:120px;text-align:center">WALK</div>`,
    });
  });

  // ==========================================
  // 3. SCENE 4: THE GRAND CANAL & PROMENADE (Wikidot Image 4)
  // ==========================================
  const CANAL_Z = -30;
  const CANAL_W = 20;

  // Canal Water Bed & Reflective Water Surface
  bx("l11-canal-bed", 0, -4.5, CANAL_Z, 120, 0.4, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-canal-water", 0, -2.2, CANAL_Z, 120, 0.08, CANAL_W, WATER_MAT, {
    fx: { script: WATER_RIPPLE },
  });

  // Embankment Retaining Seawalls & Coping
  bx("l11-embank-south", 0, -2.2, CANAL_Z + CANAL_W / 2 + 0.5, 120, 4.4, 1.0, CONCRETE_CANAL);
  bx("l11-embank-north", 0, -2.2, CANAL_Z - CANAL_W / 2 - 0.5, 120, 4.4, 1.0, CONCRETE_CANAL);
  bx("l11-cope-south", 0, 0.2, CANAL_Z + CANAL_W / 2 + 0.5, 120, 0.3, 1.3, CURB_MAT);
  bx("l11-cope-north", 0, 0.2, CANAL_Z - CANAL_W / 2 - 0.5, 120, 0.3, 1.3, CURB_MAT);

  // Wrought Iron Promenade Safety Railings
  for (let rx = -58; rx <= 58; rx += 5) {
    if (rx > -12 && rx < 12) continue;
    bx(`l11-rail-s-${rx}`, rx, 0.45, CANAL_Z + CANAL_W / 2 + 0.5, 4.8, 0.85, 0.06, IRON_RAIL);
    bx(`l11-rail-n-${rx}`, rx, 0.45, CANAL_Z - CANAL_W / 2 - 0.5, 4.8, 0.85, 0.06, IRON_RAIL);
  }

  // Canal Life Buoys Mounted on Posts
  [-16, 16].forEach((bxPos, k) => {
    sp(`l11-canal-buoy-${k}`, {
      feetPosition: { x: bxPos, y: 0.2, z: CANAL_Z + CANAL_W / 2 + 0.5 },
      primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 1.1 },
      material: STEEL_BRUSHED,
      children: [
        { feetPosition: { x: 0, y: 0.9, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.32, radiusBottom: 0.32, height: 0.08 }, rotation: { pitch: 90 }, material: { color: "#e74c3c" } },
        { feetPosition: { x: 0, y: 0.9, z: -0.1 }, primitive: { kind: "cylinder", radiusTop: 0.16, radiusBottom: 0.16, height: 0.09 }, rotation: { pitch: 90 }, material: { color: "oklch(0.2 0.01 250)" } },
      ],
    });
  });

  // Floating Wooden Boat Dock & Stairs
  bx("l11-dock-stairs", -14, -1.2, CANAL_Z + 7.5, 2.6, 2.2, 4.0, CONCRETE_CANAL);
  bx("l11-dock-pier", -14, -2.0, CANAL_Z + 2.5, 4.5, 0.35, 6.5, { ...T("worn-hardwood-grain", 1), color: "oklch(0.5 0.06 60)", roughness: 0.85 });

  // The Grand Canal Bridge
  bx("l11-bridge-deck", 0, -0.05, CANAL_Z, 17, 0.6, CANAL_W + 4, ASPHALT);
  bx("l11-bridge-arch-w", -8.5, -2.4, CANAL_Z, 1.2, 4.2, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-bridge-arch-e", 8.5, -2.4, CANAL_Z, 1.2, 4.2, CANAL_W + 4, CONCRETE_CANAL);
  bx("l11-bridge-parapet-w", -8.4, 0.5, CANAL_Z, 0.4, 0.95, CANAL_W + 4, CURB_MAT);
  bx("l11-bridge-parapet-e", 8.4, 0.5, CANAL_Z, 0.4, 0.95, CANAL_W + 4, CURB_MAT);

  // Bridge Warm Lanterns
  [-7.5, 7.5].forEach((lx, k) => {
    cyl(`l11-blamp-pole-${k}`, lx, 1.4, CANAL_Z, 0.06, 0.08, 1.8, IRON_RAIL);
    sp(`l11-blamp-light-${k}`, {
      feetPosition: { x: lx, y: 3.2, z: CANAL_Z },
      light: { kind: "point", color: "oklch(0.9 0.14 85)", intensity: 4.5, distance: 14, shadow: { enabled: false } },
    });
  });

  // ==========================================
  // 4. THE CITY BACKBONE (art/level11/build.py models)
  // ==========================================
  const city = layCity(ctx, { sp, bx, cyl });
  const TOWER_X = city.TOWER.x, TOWER_Z = city.TOWER.z, SKY_Y = 35.7;
  sp("l11-ntower-lobby-light", { feetPosition: { x: TOWER_X - 10, y: 4.5, z: TOWER_Z }, light: { kind: "point", color: "oklch(0.96 0.08 85)", intensity: 6.5, distance: 16 } });

  // Skydeck Express call panel & observation deck
  sp("l11-elev-btn-up", { tags: ["usable"], feetPosition: { x: TOWER_X - 8.55, y: 1.3, z: TOWER_Z + 4.5 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.2, height: 0.34, depth: 0.08 }, material: { color: "oklch(0.85 0.18 85)", emissive: "oklch(0.85 0.18 85)", emissiveIntensity: 2.0 }, behavior: "scripts/level11-use.js", state: { kind: "elevator-up", name: "Skydeck Express Elevator", verb: "Ascend to the Skydeck", dest: { x: TOWER_X - 5, y: SKY_Y + 0.1, z: TOWER_Z + 1 } } });
  sp("l11-elev-btn-down", { tags: ["usable"], feetPosition: { x: TOWER_X + 3.0, y: SKY_Y + 1.3, z: TOWER_Z + 5.6 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 0.2, height: 0.34, depth: 0.08 }, material: { color: "oklch(0.85 0.18 85)", emissive: "oklch(0.85 0.18 85)", emissiveIntensity: 2.0 }, behavior: "scripts/level11-use.js", state: { kind: "elevator-down", name: "Lobby Express Elevator", verb: "Descend to the street", dest: { x: TOWER_X - 12, y: 0.3, z: TOWER_Z + 4.5 } } });
  sp("l11-skydeck-binoculars", { tags: ["usable"], feetPosition: { x: TOWER_X - 5.2, y: SKY_Y, z: TOWER_Z - 4.5 }, rotation: { yaw: 90 }, primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.22, height: 1.35 }, material: STEEL_BRUSHED, behavior: "scripts/level11-use.js", state: { kind: "binoculars", name: "Panoramic Observation Viewfinder", verb: "Look through Viewfinder" }, children: [{ feetPosition: { x: 0, y: 1.3, z: -0.15 }, primitive: { kind: "box", width: 0.35, height: 0.18, depth: 0.45 }, material: STEEL_BRUSHED }] });

  // ==========================================
  // 5. SCENE 2: HIGH/LOW TRANSITION BLOCK WITH "SEDCO SPOTLIGHT" & PARKING LOT (Wikidot Image 2)
  // ==========================================
  const SEDCO_X = 22;
  const SEDCO_Z = 15;
  const SEDCO_W = 10;
  const SEDCO_H = 4.4;
  const SEDCO_D = 8;

  // Sedco Building Shell
  bx("l11-sedco-shell", SEDCO_X, 0.1, SEDCO_Z, SEDCO_W, SEDCO_H, SEDCO_D, SEDCO_BRICK);
  bx("l11-sedco-roof-trim", SEDCO_X, SEDCO_H + 0.1, SEDCO_Z, SEDCO_W + 0.3, 0.3, SEDCO_D + 0.3, CURB_MAT);
  cyl("l11-sedco-vent1", SEDCO_X - 2.5, SEDCO_H + 0.25, SEDCO_Z - 1.5, 0.4, 0.35, 0.6, STEEL_BRUSHED);
  cyl("l11-sedco-vent2", SEDCO_X + 2.0, SEDCO_H + 0.25, SEDCO_Z + 1.2, 0.4, 0.35, 0.6, STEEL_BRUSHED);
  bx("l11-sedco-ac", SEDCO_X + 2.5, SEDCO_H + 0.25, SEDCO_Z - 1.5, 1.4, 0.9, 1.2, STEEL_BRUSHED);

  // Iconic Illuminated "SEDCO SPOTLIGHT" Horizontal Neon Sign
  sp("l11-sedco-sign", {
    feetPosition: { x: SEDCO_X - SEDCO_W / 2 - 0.08, y: SEDCO_H - 0.7, z: SEDCO_Z },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 7.2, height: 1.0, depth: 0.14 },
    material: { color: "#111111" },
    ui: `<div face="front" width="7.2m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#181818;border:3px solid #ff6a00;box-sizing:border-box;color:#ff6a00;font-family:Arial Black,sans-serif;font-weight:900;font-size:105px;letter-spacing:6px;text-shadow:0 0 16px #ff6a00">SEDCO SPOTLIGHT</div>`,
  });

  // Display Windows with Vintage Spotlight Display
  bx("l11-sedco-glass", SEDCO_X - SEDCO_W / 2 - 0.05, 0.4, SEDCO_Z, 0.1, 2.6, 5.8, GLASS_TINT);
  cyl("l11-sedco-spotlight1", SEDCO_X - SEDCO_W / 2 + 0.8, 1.2, SEDCO_Z - 1.5, 0.22, 0.28, 0.5, STEEL_BRUSHED, {
    rotation: { pitch: 30, yaw: -30 },
    children: [{ feetPosition: { x: 0, y: 0.5, z: 0 }, light: { kind: "point", color: "#ffe0a0", intensity: 3.5, distance: 8 } }],
  });

  // Interactive Sedco CCTV Surveillance Console
  sp("l11-sedco-cctv", {
    tags: ["usable"],
    feetPosition: { x: SEDCO_X - SEDCO_W / 2 - 1.2, y: 0.1, z: SEDCO_Z - 2.8 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 0.65, height: 1.1, depth: 0.5 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "sedco-cctv", name: "Sedco Closed-Circuit Security Terminal", verb: "Cycle CCTV Surveillance" },
    children: [
      { feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.55, height: 0.42, depth: 0.35 }, material: { color: "oklch(0.2 0.01 250)" } },
      { feetPosition: { x: 0, y: 1.1, z: 0.18 }, primitive: { kind: "box", width: 0.45, height: 0.32, depth: 0.02 }, material: { color: "oklch(0.65 0.2 145)", emissive: "oklch(0.65 0.2 145)", emissiveIntensity: 2.2 } },
    ],
  });

  // Open Transition Parking Lot
  const LOT_X = 14;
  const LOT_Z = 24;
  bx("l11-sedco-lot", LOT_X, -0.04, LOT_Z, 9.5, 0.2, 18, ASPHALT);

  [-4, 0, 4].forEach((bz, k) => {
    bx(`l11-sedco-bumper-${k}`, LOT_X - 3.5, 0.08, LOT_Z + bz, 0.3, 0.18, 2.0, CURB_MAT);
    bx(`l11-sedco-stall-${k}`, LOT_X, 0.06, LOT_Z + bz - 1.2, 6.0, 0.01, 0.12, YELLOW_PAINT, { physics: undefined });
  });

  cyl("l11-sedco-lamp-pole", LOT_X + 3.8, 0.1, LOT_Z - 7.5, 0.12, 0.15, 6.2, IRON_RAIL);
  bx("l11-sedco-lamp-arm", LOT_X + 2.5, 6.1, LOT_Z - 7.5, 2.8, 0.1, 0.1, IRON_RAIL);
  sp("l11-sedco-lamp-lum", {
    feetPosition: { x: LOT_X + 1.2, y: 6.0, z: LOT_Z - 7.5 },
    primitive: { kind: "box", width: 0.7, height: 0.18, depth: 0.35 },
    material: STEEL_BRUSHED,
    light: { kind: "point", color: "oklch(0.9 0.12 85)", intensity: 5.5, distance: 20 },
  });

  // ==========================================
  // 6. SCENE 3: SOUTHWESTERN STRIP MALL WITH BLUE AWNINGS, CLINIC, LAB, PIZZERIA & ANTENNA (Wikidot Image 3)
  // ==========================================
  const MALL_X = -24;
  const MALL_Z = 36;
  const MALL_W = 16;
  const MALL_H = 5.2;
  const MALL_D = 22;

  // Strip Mall Building Shell
  bx("l11-mall-shell", MALL_X, 0.1, MALL_Z, MALL_W, MALL_H, MALL_D, STUCCO_MALL);
  bx("l11-mall-sandstone-pil1", MALL_X + MALL_W / 2 - 0.2, 0.1, MALL_Z - MALL_D / 2 + 0.5, 0.4, MALL_H, 1.2, SANDSTONE_WALL);
  bx("l11-mall-sandstone-pil2", MALL_X + MALL_W / 2 - 0.2, 0.1, MALL_Z + MALL_D / 2 - 0.5, 0.4, MALL_H, 1.2, SANDSTONE_WALL);
  bx("l11-mall-roof-parapet", MALL_X, MALL_H + 0.1, MALL_Z, MALL_W + 0.2, 0.4, MALL_D + 0.2, CURB_MAT);

  // Raised Concrete Walkway in Front of Stores
  bx("l11-mall-walkway", MALL_X + MALL_W / 2 + 1.2, 0.22, MALL_Z, 2.4, 0.3, MALL_D, SIDEWALK);

  // Wheelchair Access Ramp with White Metal Handrails
  bx("l11-mall-ramp-slope", MALL_X + MALL_W / 2 + 1.2, 0.08, MALL_Z - MALL_D / 2 - 2.5, 2.4, 0.16, 5.0, SIDEWALK);
  for (const rx of [-1.1, 1.1]) {
    cyl(`l11-mall-ramp-post1-${rx}`, MALL_X + MALL_W / 2 + 1.2 + rx, 0.1, MALL_Z - MALL_D / 2 - 4.5, 0.03, 0.03, 0.9, { color: "#ffffff" });
    cyl(`l11-mall-ramp-post2-${rx}`, MALL_X + MALL_W / 2 + 1.2 + rx, 0.2, MALL_Z - MALL_D / 2 - 2.5, 0.03, 0.03, 0.9, { color: "#ffffff" });
    cyl(`l11-mall-ramp-post3-${rx}`, MALL_X + MALL_W / 2 + 1.2 + rx, 0.35, MALL_Z - MALL_D / 2 - 0.5, 0.03, 0.03, 0.9, { color: "#ffffff" });
    bx(`l11-mall-ramp-rail-${rx}`, MALL_X + MALL_W / 2 + 1.2 + rx, 0.7, MALL_Z - MALL_D / 2 - 2.5, 0.04, 0.04, 4.8, { color: "#ffffff" });
  }

  // CONTINUOUS VIVID BLUE CANVAS AWNINGS (Wikidot Image 3)
  bx("l11-mall-awning-1", MALL_X + MALL_W / 2 + 1.0, 3.2, MALL_Z - 6.5, 2.0, 0.12, 7.0, BLUE_AWNING, { rotation: { pitch: -16 } });
  bx("l11-mall-awning-2", MALL_X + MALL_W / 2 + 1.0, 3.2, MALL_Z, 2.0, 0.12, 5.5, BLUE_AWNING, { rotation: { pitch: -16 } });
  bx("l11-mall-awning-3", MALL_X + MALL_W / 2 + 1.0, 3.2, MALL_Z + 6.5, 2.0, 0.12, 7.0, BLUE_AWNING, { rotation: { pitch: -16 } });

  // Storefront 1: Centro Dermatológico (Left)
  sp("l11-mall-sign-derma", {
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.05, y: 4.1, z: MALL_Z - 6.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 5.5, height: 0.85, depth: 0.06 },
    material: { color: "#ffffff" },
    ui: `<div face="front" width="5.5m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ffffff;border:2px solid #0066cc;color:#0066cc;font-family:Arial,sans-serif;font-weight:900;font-size:75px"><span style="color:#00aa44;font-size:95px;margin-right:12px">+</span>CENTRO DERMATOLÓGICO</div>`,
  });
  bx("l11-mall-glass-derma", MALL_X + MALL_W / 2 + 0.02, 0.4, MALL_Z - 6.5, 0.08, 2.6, 5.5, GLASS_TINT);

  // Storefront 2: IS LAB (Center)
  sp("l11-mall-sign-islab", {
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.05, y: 4.1, z: MALL_Z },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 4.2, height: 0.85, depth: 0.06 },
    material: { color: "#ffffff" },
    ui: `<div face="front" width="4.2m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#ffffff;border:2px solid #0088cc;color:#0088cc;font-family:Arial Black,sans-serif;font-weight:900;font-size:95px">IS LAB</div>`,
  });
  bx("l11-mall-glass-islab", MALL_X + MALL_W / 2 + 0.02, 0.4, MALL_Z, 0.08, 2.6, 4.2, GLASS_TINT);

  // Storefront 3: Marroka Pizzeria (Right - Enterable!)
  sp("l11-mall-sign-pizza", {
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.05, y: 4.1, z: MALL_Z + 6.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 5.5, height: 0.85, depth: 0.06 },
    material: { color: "#181818" },
    ui: `<div face="front" width="5.5m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#181818;border:2px solid #c0392b;color:#ffffff;font-family:Georgia,serif;text-align:center"><div style="font-size:90px;font-style:italic;font-weight:bold;color:#f39c12">Marroka</div><div style="font-size:40px;letter-spacing:6px;color:#e74c3c">PIZZERIA & TRATTORIA</div></div>`,
  });
  bx("l11-mall-glass-pizza", MALL_X + MALL_W / 2 + 0.02, 0.4, MALL_Z + 8.2, 0.08, 2.6, 2.4, GLASS_TINT);

  // --- ENTERABLE MARROKA PIZZERIA INTERIOR ---
  bx("l11-pizza-floor", MALL_X + 2, 0.36, MALL_Z + 6.5, 10, 0.06, 8, TERRACOTTA_TILES);
  bx("l11-pizza-wall-div", MALL_X + 2, 0.38, MALL_Z + 2.5, 10, 4.6, 0.2, STUCCO_MALL);

  // Brick Wood-Fired Pizza Oven
  bx("l11-pizza-oven-base", MALL_X - 1.5, 0.38, MALL_Z + 8.5, 2.4, 1.2, 2.4, BRICK_BLDG);
  cyl("l11-pizza-oven-dome", MALL_X - 1.5, 1.58, MALL_Z + 8.5, 1.1, 1.2, 1.0, BRICK_BLDG);
  sp("l11-pizza-oven-fire", {
    feetPosition: { x: MALL_X - 0.4, y: 1.1, z: MALL_Z + 8.5 },
    primitive: { kind: "cylinder", radiusTop: 0.25, radiusBottom: 0.35, height: 0.4 },
    material: { color: "oklch(0.65 0.22 40)", emissive: "oklch(0.65 0.22 40)", emissiveIntensity: 3.5 },
    light: { kind: "point", color: "oklch(0.75 0.2 45)", intensity: 4.5, distance: 9 },
  });

  // Pizza Service Counter & Cutting Board
  bx("l11-pizza-counter", MALL_X + 2.8, 0.38, MALL_Z + 7.5, 1.2, 1.1, 4.2, { ...T("worn-hardwood-grain", 1), color: "oklch(0.55 0.06 60)" });
  bx("l11-pizza-boxes", MALL_X + 2.8, 1.5, MALL_Z + 6.2, 0.8, 0.4, 0.8, { color: "oklch(0.85 0.04 80)", roughness: 0.8 }, { physics: undefined });

  // Interactive Fresh Slice of Marroka Pizza
  sp("l11-pizza-slice", {
    tags: ["usable"],
    feetPosition: { x: MALL_X + 2.8, y: 1.48, z: MALL_Z + 8.0 },
    primitive: { kind: "cylinder", radiusTop: 0.28, radiusBottom: 0.3, height: 0.04 },
    material: { color: "oklch(0.72 0.18 65)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "food-pizza", name: "Fresh Slice of Marroka Pizza", verb: "Eat Hot Pizza Slice" },
    children: [
      { feetPosition: { x: 0, y: 0.04, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.24, height: 0.02 }, material: { color: "oklch(0.55 0.22 30)" } },
    ],
  });

  // Dining Bistro Table & Chairs
  cyl("l11-pizza-table", MALL_X + 0.5, 0.38, MALL_Z + 4.5, 0.7, 0.7, 0.85, STEEL_BRUSHED);
  cyl("l11-pizza-chair1", MALL_X + 0.5, 0.38, MALL_Z + 3.4, 0.25, 0.25, 0.55, STEEL_BRUSHED);
  cyl("l11-pizza-chair2", MALL_X + 0.5, 0.38, MALL_Z + 5.6, 0.25, 0.25, 0.55, STEEL_BRUSHED);

  // --- ROOFTOP COMMUNICATIONS RIG (Wikidot Image 3) ---
  cyl("l11-mall-dish-base", MALL_X + 2.0, MALL_H + 0.3, MALL_Z - 5.0, 0.12, 0.15, 0.8, STEEL_BRUSHED);
  cyl("l11-mall-dish-bowl", MALL_X + 2.0, MALL_H + 1.1, MALL_Z - 5.0, 1.2, 0.4, 0.35, { color: "#f0f0f0", roughness: 0.4 }, {
    rotation: { pitch: 45, yaw: -45 },
  });

  const MAST_X = MALL_X - 2.0;
  const MAST_Z = MALL_Z + 4.0;
  bx("l11-mall-mast-base", MAST_X, MALL_H + 0.1, MAST_Z, 1.8, 0.6, 1.8, STEEL_BRUSHED);
  const MAST_SEGS = [
    { y: MALL_H + 0.7, h: 3.2, col: "#d63031" },
    { y: MALL_H + 3.9, h: 3.2, col: "#ffffff" },
    { y: MALL_H + 7.1, h: 3.2, col: "#d63031" },
    { y: MALL_H + 10.3, h: 3.2, col: "#ffffff" },
    { y: MALL_H + 13.5, h: 3.2, col: "#d63031" },
  ];
  MAST_SEGS.forEach((seg, k) => {
    cyl(`l11-mall-mast-seg-${k}`, MAST_X, seg.y, MAST_Z, 0.18 - k * 0.02, 0.22 - k * 0.02, seg.h, { color: seg.col, metalness: 0.7 });
  });
  sp("l11-mall-mast-beacon", {
    feetPosition: { x: MAST_X, y: MALL_H + 16.8, z: MAST_Z },
    primitive: { kind: "sphere", radius: 0.22 },
    material: { color: "oklch(0.65 0.25 25)", emissive: "oklch(0.65 0.25 25)", emissiveIntensity: 4.5 },
    light: { kind: "point", color: "oklch(0.65 0.25 25)", intensity: 5.0, distance: 35 },
  });

  // Strip Mall Parking Apron
  const MALL_LOT_X = MALL_X + MALL_W / 2 + 5.5;
  bx("l11-mall-lot", MALL_LOT_X, -0.04, MALL_Z, 6.2, 0.2, MALL_D, ASPHALT);
  [-6, 0, 6].forEach((mz, k) => {
    bx(`l11-mall-bumper-${k}`, MALL_LOT_X - 1.8, 0.08, MALL_Z + mz, 0.3, 0.18, 2.0, CURB_MAT);
    bx(`l11-mall-stall-${k}`, MALL_LOT_X + 0.8, 0.06, MALL_Z + mz - 1.1, 4.5, 0.01, 0.12, WHITE_PAINT, { physics: undefined });
  });

  // ==========================================
  // 7. SCENE 5: OFFICE UNDER RENOVATION (Wikidot Image 5)
  // ==========================================
  const RENO_X = -25;
  const RENO_Z = 0;
  const RENO_W = 18;
  const RENO_D = 18;

  // Real modelled shell from wisp (art/level11/build.py reno_shell)
  md("l11-reno-shell", "reno_shell", RENO_X, 0, RENO_Z, { brick: BRICK_BLDG, concrete: SIDEWALK, trim: CURB_MAT, dark: { color: "oklch(0.25 0.01 250)" } }, "mesh");
  bx("l11-reno-floor", RENO_X, 0.22, RENO_Z, RENO_W - 0.6, 0.1, RENO_D - 0.6, SIDEWALK);

  // Large Glass Windows into Renovation Office
  bx("l11-reno-glass-e", RENO_X + RENO_W / 2 - 0.2, 0.2, 4, 0.1, 4.2, 8, GLASS_TINT);
  bx("l11-reno-glass-e2", RENO_X + RENO_W / 2 - 0.2, 0.2, -5, 0.1, 4.2, 6, GLASS_TINT);

  // Cylindrical Concrete Columns
  [[-29, -5], [-21, -5], [-29, 5], [-21, 5]].forEach(([cx, cz], k) => {
    cyl(`l11-reno-col-${k}`, cx, 0.2, cz, 0.42, 0.42, 4.8, PILLAR_MAT);
  });

  // --- SUSPENDED DROP-CEILING GRID & DUCTWORK (Wikidot Image 5) ---
  for (let gx = -31; gx <= -19; gx += 2.4) {
    bx(`l11-reno-grid-x-${Math.round(gx)}`, gx, 4.6, RENO_Z, 0.04, 0.06, 16.0, STEEL_BRUSHED);
  }
  for (let gz = -7; gz <= 7; gz += 2.4) {
    bx(`l11-reno-grid-z-${Math.round(gz)}`, RENO_X, 4.6, gz, 16.0, 0.06, 0.04, STEEL_BRUSHED);
  }
  // Silver Insulation Foil Blankets in Ceiling Void
  bx("l11-reno-foil1", -26, 4.85, -2, 5.0, 0.04, 4.0, SILVER_FOIL);
  bx("l11-reno-foil2", -23, 4.85, 3, 4.5, 0.04, 3.5, SILVER_FOIL);
  // HVAC Ducting
  bx("l11-reno-duct-main", RENO_X, 5.4, 0, 15.0, 0.7, 0.9, STEEL_BRUSHED);
  bx("l11-reno-duct-branch", -27, 5.4, 3.5, 0.8, 0.6, 6.0, STEEL_BRUSHED);

  // Unfinished Drywall Partition Boards
  bx("l11-drywall-stack", -28.5, 0.22, -4.5, 1.2, 2.4, 0.35, DRYWALL_MAT, { rotation: { pitch: 12 } });
  bx("l11-drywall-wall-w", -25, 0.22, -6.8, 6.5, 4.2, 0.15, DRYWALL_MAT);
  bx("l11-reno-int-glass", -23, 0.22, 1.5, 0.08, 4.2, 6.0, GLASS_TINT);

  // Contractor Step Ladder (climbable in center of room!)
  sp("l11-reno-ladder", {
    tags: ["usable"],
    feetPosition: { x: -25, y: 0.2, z: 0 },
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
    feetPosition: { x: -23, y: 0.2, z: -3 },
    primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.06, height: 1.8 },
    material: { color: "oklch(0.8 0.18 85)" },
    children: [
      { feetPosition: { x: 0, y: 1.8, z: 0 }, primitive: { kind: "box", width: 0.45, height: 0.25, depth: 0.2 }, material: { color: "oklch(0.8 0.18 85)" } },
      { feetPosition: { x: 0, y: 1.8, z: 0.2 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 8.5, distance: 18 } },
    ],
  });

  // Work Table with City Blueprints & B.R.C. Task Clipboard
  bx("l11-reno-table", -27, 0.2, 3, 2.4, 0.85, 1.2, { ...T("worn-hardwood-grain", 1), color: "oklch(0.55 0.06 65)" });
  bx("l11-reno-blueprints", -27, 1.06, 3, 1.6, 0.02, 0.9, { color: "oklch(0.4 0.12 240)", roughness: 0.8 }, { physics: undefined });

  // Interactive B.R.C. Work Order Clipboard
  sp("l11-reno-clipboard", {
    tags: ["usable"],
    feetPosition: { x: -26.5, y: 1.06, z: 2.6 },
    primitive: { kind: "box", width: 0.35, height: 0.04, depth: 0.45 },
    material: { color: "oklch(0.7 0.08 70)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "brc-clipboard", name: "B.R.C. Renovation Work Order", verb: "Read B.R.C. Work Order" },
  });

  // Contractor Heavy Tool Chest
  sp("l11-reno-chest", {
    tags: ["usable"],
    feetPosition: { x: -28.5, y: 0.2, z: 3 },
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

  // Real modelled pallet and corrugated barricades from wisp
  md("l11-barricade-wood1", "barricade_pallets", BARRICADE_X, 0, BARRICADE_Z - 2.5, { wood: WOOD, woodOld: WOOD_OLD });
  md("l11-barricade-wood2", "barricade_pallets", BARRICADE_X, 0, BARRICADE_Z + 2.5, { wood: WOOD, woodOld: WOOD_OLD }, "box", { rotation: { yaw: 180 } });
  md("l11-barricade-corrugated", "corrugated", BARRICADE_X, 0, BARRICADE_Z, { corr: { ...STEEL, color: "oklch(0.8 0.01 240)" }, rust: RUST, metal: STEEL });

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

  sp("l11-memorial-candle", {
    feetPosition: { x: BARRICADE_X + 0.8, y: 0.1, z: BARRICADE_Z + 1.2 },
    primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 0.22 },
    material: { color: "oklch(0.9 0.05 85)" },
    children: [
      { feetPosition: { x: 0, y: 0.22, z: 0 }, light: { kind: "point", color: "oklch(0.85 0.18 75)", intensity: 2.2, distance: 4.5 } },
    ],
  });

  sp("l11-anomalous-rift", {
    feetPosition: { x: BARRICADE_X - 6, y: 1.4, z: BARRICADE_Z },
    fx: { script: RIFT_VOID },
  });

  // ==========================================
  // 9. STREET FURNITURE & LIVING DETAILS
  // ==========================================
  const street = layStreet(ctx, { sp, bx, cyl });

  // First Capital Municipal Street ATM
  sp("l11-atm", {
    tags: ["usable"],
    feetPosition: { x: 9.0, y: 0.1, z: 8.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.9, height: 1.9, depth: 0.8 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "atm", name: "First Capital Bank ATM", verb: "Withdraw Capital Credits" },
    children: [
      { feetPosition: { x: 0, y: 1.2, z: 0.41 }, primitive: { kind: "box", width: 0.55, height: 0.38, depth: 0.02 }, material: { color: "#00d2d3", emissive: "#00d2d3", emissiveIntensity: 2.5 } },
      { feetPosition: { x: 0, y: 1.7, z: 0 }, primitive: { kind: "box", width: 0.85, height: 0.25, depth: 0.75 }, material: { color: "#10ac84" } },
    ],
  });

  // Almond Water Street Vending Machine
  sp("l11-vending", {
    tags: ["usable"],
    feetPosition: { x: -8.8, y: 0.1, z: 20 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 1.2, height: 2.1, depth: 0.95 },
    material: { color: "oklch(0.25 0.1 230)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "vending", name: "Almond Water Vending Machine", verb: "Buy Cold Almond Water" },
    children: [
      { feetPosition: { x: 0, y: 1.2, z: 0.48 }, primitive: { kind: "box", width: 0.95, height: 1.1, depth: 0.02 }, material: { color: "#2980b9", emissive: "#2980b9", emissiveIntensity: 2.0 } },
    ],
  });

  // ==========================================
  // 10. SPAMTON'S ALLEY & DUMPSTER
  // ==========================================
  {
    const AX = 44, Z0 = 19, LEN = 13, W = 4.2;
    const BRICK = { ...T("grimy-red-brick-wall", 2), color: "oklch(0.42 0.07 35)", roughness: 0.92 };
    const GRIME = { ...T("stained-concrete-floor", 3), color: "oklch(0.32 0.012 80)", roughness: 0.95 };
    md("l11-spam-wall-back", "spam_alley", AX, 0, Z0 + LEN / 2, { brick: BRICK, metal: STEEL, rust: RUST, door: { ...STEEL, color: "oklch(0.55 0.03 250)" }, concrete: GRIME }, "mesh");
    bx("l11-spam-floor", AX, 0.04, Z0 + LEN / 2, W, 0.08, LEN, GRIME);
    bx("l11-spam-puddle", AX - 0.6, 0.085, Z0 + 5, 1.6, 0.01, 1.1, { color: "oklch(0.2 0.02 240)", roughness: 0.05, metalness: 0.3 }, { physics: undefined });

    sp("l11-spamton-dumpster", {
      tags: ["usable"],
      feetPosition: { x: AX + 0.4, y: 0.08, z: Z0 + LEN - 1.1 },
      primitive: { kind: "box", width: 2.0, height: 1.25, depth: 1.15 },
      material: { ...T("grimy-scratched-steel-plate", 1), color: "oklch(0.42 0.09 150)", metalness: 0.55, roughness: 0.6 },
      physics: "static",
      behavior: "scripts/spamton.js",
      state: { kind: "spamton", name: "Dumpster", verb: "Inspect dumpster", info: "Something inside is giggling.", up: null },
      children: [
        { id: "lid", feetPosition: { x: 0, y: 1.25, z: 0.55 }, pivot: [0.5, 0, 1], primitive: { kind: "box", width: 2.05, height: 0.07, depth: 1.2 }, material: { color: "oklch(0.36 0.08 150)", metalness: 0.5, roughness: 0.65 } },
        { id: "rim", feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "box", width: 2.08, height: 0.12, depth: 1.22 }, material: { color: "oklch(0.3 0.05 150)", metalness: 0.6, roughness: 0.5 } },
        { id: "wheel-l", feetPosition: { x: -0.8, y: -0.08, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.08, height: 0.08 }, rotation: { roll: 90 }, material: { color: "#111" } },
        { id: "wheel-r", feetPosition: { x: 0.8, y: -0.08, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.08, height: 0.08 }, rotation: { roll: 90 }, material: { color: "#111" } },
        { id: "spamton", visible: false, feetPosition: { x: 0, y: 0.75, z: 0 }, model: { id: "/cdn/value.e9d590488230d5a2ed1f5feea9e1f31046fb80e5d52f61e88491b67335bc79bb.glb", forward: "+z" } },
        { id: "glow", feetPosition: { x: 0, y: 1.3, z: 0 }, light: { kind: "point", color: "#ff6fd0", intensity: 0, distance: 5 } },
      ],
    });

    for (const [i, x, z, s] of [[0, AX - 1.3, Z0 + LEN - 0.8, 0.7], [1, AX - 0.8, Z0 + LEN - 1.6, 0.55], [2, AX + 1.6, Z0 + LEN - 2.4, 0.5]])
      sp(`l11-spam-bag-${i}`, { feetPosition: { x, y: 0.08, z }, primitive: { kind: "sphere", radius: s / 2 }, scale: { x: 1.15, y: 0.85, z: 1 }, material: { color: "oklch(0.18 0.01 260)", roughness: 0.35 }, physics: "static", castShadow: false });
    bx("l11-spam-box", AX - 1.4, 0.08, Z0 + 6.5, 0.7, 0.35, 0.5, { color: "oklch(0.55 0.07 70)", roughness: 0.95 }, { rotation: { yaw: 23 }, castShadow: false });
    sp("l11-spam-bulb", { feetPosition: { x: AX + W / 2 - 0.1, y: 2.7, z: Z0 + 8 }, primitive: { kind: "sphere", radius: 0.09 }, material: { color: "#ffe9b0", emissive: "#ffcf70", emissiveIntensity: 3 }, light: { kind: "point", color: "#ffcf8a", intensity: 2.2, distance: 9 }, castShadow: false });
    sp("l11-spam-sign", { feetPosition: { x: AX - W / 2 + 0.02, y: 2.0, z: Z0 + LEN - 1 }, rotation: { yaw: 90 }, primitive: { kind: "box", width: 1.1, height: 0.5, depth: 0.03 }, material: { color: "oklch(0.92 0.02 90)", roughness: 0.8 },
      ui: `<div face="front" width="1.1m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:Arial Black,Arial,sans-serif;color:#1b1b1b;font-size:64px;text-align:center;line-height:1">NO DUMPING<br><span style="font-size:34px;color:#b01818">VIOLATORS WILL BE [[PROSECUTED]]</span></div>` });
  }

  // ==========================================
  // 11. DRIVABLE YELLOW CITY TAXI CAB ("Level 11 Express")
  // ==========================================
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
      { feetPosition: { x: 0, y: 1.05, z: -0.2 }, primitive: { kind: "box", width: 1.9, height: 0.65, depth: 2.3 }, material: TAXI_YELLOW },
      { feetPosition: { x: 0, y: 1.08, z: -1.35 }, rotation: { pitch: -28 }, primitive: { kind: "box", width: 1.82, height: 0.65, depth: 0.05 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 1.08, z: 0.95 }, rotation: { pitch: 28 }, primitive: { kind: "box", width: 1.82, height: 0.65, depth: 0.05 }, material: GLASS_TINT },
      { feetPosition: { x: -0.96, y: 1.08, z: -0.2 }, primitive: { kind: "box", width: 0.05, height: 0.55, depth: 2.1 }, material: GLASS_TINT },
      { feetPosition: { x: 0.96, y: 1.08, z: -0.2 }, primitive: { kind: "box", width: 0.05, height: 0.55, depth: 2.1 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 1.75, z: -0.2 }, primitive: { kind: "box", width: 0.65, height: 0.22, depth: 0.25 }, material: { color: "oklch(0.95 0.15 85)", emissive: "oklch(0.95 0.15 85)", emissiveIntensity: 2.5 } },
      { feetPosition: { x: 0, y: 0.18, z: -2.35 }, primitive: { kind: "box", width: 2.1, height: 0.2, depth: 0.15 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 0.18, z: 2.35 }, primitive: { kind: "box", width: 2.1, height: 0.2, depth: 0.15 }, material: STEEL_BRUSHED },
      { feetPosition: { x: -0.75, y: 0.5, z: -2.32 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0.75, y: 0.5, z: -2.32 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.06 }, rotation: { pitch: 90 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 3.5 } },
      { feetPosition: { x: 0, y: 0.5, z: -3.5 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 7.5, distance: 24, shadow: { enabled: false } } },
      { feetPosition: { x: -0.85, y: 0.55, z: 2.32 }, primitive: { kind: "box", width: 0.28, height: 0.15, depth: 0.05 }, material: { color: "oklch(0.55 0.22 25)", emissive: "oklch(0.55 0.22 25)", emissiveIntensity: 2.0 } },
      { feetPosition: { x: 0.85, y: 0.55, z: 2.32 }, primitive: { kind: "box", width: 0.28, height: 0.15, depth: 0.05 }, material: { color: "oklch(0.55 0.22 25)", emissive: "oklch(0.55 0.22 25)", emissiveIntensity: 2.0 } },
    ],
  });

  cyl("l11-taxi-wheel-fl", -1.05, 0.28, -1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  cyl("l11-taxi-wheel-fr", 1.05, 0.28, -1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  cyl("l11-taxi-wheel-rl", -1.05, 0.28, 1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });
  cyl("l11-taxi-wheel-rr", 1.05, 0.28, 1.35, 0.32, 0.32, 0.25, { color: "oklch(0.2 0.01 250)", roughness: 0.9 }, { rotation: { roll: 90 }, parent: "l11-taxi" });

  // ==========================================
  // 12. DRIVABLE CANAL MOTOR SKIFF
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
  // 13. STREET PAYPHONE BOOTH
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
      { feetPosition: { x: -0.48, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.04, height: 1.8, depth: 0.9 }, material: GLASS_TINT },
      { feetPosition: { x: 0.48, y: 1.1, z: 0 }, primitive: { kind: "box", width: 0.04, height: 1.8, depth: 0.9 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 1.35, z: -0.38 }, primitive: { kind: "box", width: 0.32, height: 0.48, depth: 0.18 }, material: { color: "oklch(0.25 0.01 250)" } },
      { feetPosition: { x: 0, y: 1.45, z: -0.26 }, primitive: { kind: "box", width: 0.28, height: 0.08, depth: 0.08 }, material: { color: "oklch(0.15 0.01 250)" } },
      { feetPosition: { x: 0, y: 2.2, z: 0 }, primitive: { kind: "box", width: 0.9, height: 0.25, depth: 0.9 }, material: { color: "oklch(0.4 0.16 240)", emissive: "oklch(0.4 0.16 240)", emissiveIntensity: 2.0 } },
    ],
  });

  // ==========================================
  // 14. AL'S HOT DOG & PRETZEL CART
  // ==========================================
  sp("l11-foodcart", {
    feetPosition: { x: 9.2, y: 0.1, z: 15 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 1.4, height: 0.95, depth: 2.2 },
    material: STEEL_BRUSHED,
    fx: { script: STEAM_CART },
    children: [
      { feetPosition: { x: 0, y: 1.8, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.03, radiusBottom: 0.03, height: 1.8 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0, y: 2.7, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 1.4, height: 0.45 }, material: { color: "oklch(0.85 0.18 85)", roughness: 0.7 } },
      { feetPosition: { x: 0.35, y: 1.02, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.22 }, material: { color: "oklch(0.85 0.2 85)" } },
      { feetPosition: { x: 0.35, y: 1.02, z: 0.6 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.05, height: 0.22 }, material: { color: "oklch(0.55 0.22 25)" } },
    ],
  });

  sp("l11-food-pretzel", {
    tags: ["usable"],
    parent: "l11-foodcart",
    feetPosition: { x: 0.1, y: 0.96, z: -0.4 },
    primitive: { kind: "box", width: 0.5, height: 0.15, depth: 0.5 },
    material: { color: "oklch(0.7 0.12 65)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "food-pretzel", name: "Hot Salted Capital Pretzel", verb: "Buy Hot Pretzel" },
  });

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
  // 15. M.E.G. BASE BETA FORWARD OUTPOST
  // ==========================================
  const OUTPOST_X = 22;
  const OUTPOST_Z = -14;

  md("l11-meg-sandbag1", "sandbags", OUTPOST_X - 6, 0.1, OUTPOST_Z - 3, { burlap: { ...T("burlap-sack-weave", 2), color: "oklch(0.8 0.05 75)" } }, "box", { rotation: { yaw: 180 } });
  md("l11-meg-sandbag2", "sandbags", OUTPOST_X - 6, 0.1, OUTPOST_Z + 3, { burlap: { ...T("burlap-sack-weave", 2), color: "oklch(0.8 0.05 75)" } }, "box", { rotation: { yaw: 180 } });
  md("l11-meg-table", "meg_table", OUTPOST_X, 0.1, OUTPOST_Z, { metal: STEEL_BRUSHED });

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

  sp("l11-meg-cache", {
    tags: ["usable"],
    feetPosition: { x: OUTPOST_X + 2.5, y: 0.1, z: OUTPOST_Z - 2 },
    model: { id: MODELS.meg_cache, forward: "-z", materials: { metal: STEEL } },
    physics: { body: "static", collider: "box" },
    behavior: "scripts/level11-use.js",
    state: { kind: "supply-chest", name: "M.E.G. Emergency Rations Crate", verb: "Salvage Supplies" },
  });

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
  // 16. DOCILE LEVEL 11 ENTITIES (Level 11 Effect)
  // ==========================================
  bx("l11-hound-rug", 8.8, 0.1, -5, 1.8, 0.02, 1.4, { ...T("worn-canvas-fabric", 1), color: "oklch(0.45 0.06 60)" }, { physics: undefined });
  sp("l11-friendly-hound", {
    tags: ["usable", "pet"],
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

// Master tick simulation loop
const mem = { ringAt: 0, adAt: 0, lightAt: 0, lightPhase: 0 };
export function tick(ctx) {
  if (!ctx.place.players?.length) return;
  const st = ctx.place.state, now = ctx.now();
  if ((st.builtV ?? 0) < V) { st.builtV = V; lay(ctx); }
  if (!mem.ringAt) mem.ringAt = now + 35000;
  tickCity(ctx, mem, heard);

  // Dynamic traffic light controller cycling green -> amber -> red
  if (!mem.lightAt || now > mem.lightAt) {
    mem.lightPhase = (mem.lightPhase + 1) % 3;
    // 0: Green (22s), 1: Amber (4s), 2: Red (22s)
    mem.lightAt = now + (mem.lightPhase === 1 ? 4000 : 22000);

    const isGreen = mem.lightPhase === 0;
    const isAmber = mem.lightPhase === 1;
    const isRed = mem.lightPhase === 2;

    [-3.5, 3.5].forEach((hx, k) => {
      const sig = ctx.getObject(`l11-tlight-sig-${k}`);
      if (sig?.children) {
        if (sig.children[0]) {
          sig.children[0].material = isGreen
            ? { color: "oklch(0.85 0.22 145)", emissive: "oklch(0.85 0.22 145)", emissiveIntensity: 3.2 }
            : { color: "oklch(0.25 0.05 145)" };
        }
        if (sig.children[1]) {
          sig.children[1].material = isAmber
            ? { color: "oklch(0.85 0.2 85)", emissive: "oklch(0.85 0.2 85)", emissiveIntensity: 3.2 }
            : { color: "oklch(0.25 0.05 85)" };
        }
        if (sig.children[2]) {
          sig.children[2].material = isRed
            ? { color: "oklch(0.65 0.24 25)", emissive: "oklch(0.65 0.24 25)", emissiveIntensity: 3.2 }
            : { color: "oklch(0.25 0.05 25)" };
        }
      }
    });

    [-7.7, 7.7].forEach((sx, k) => {
      const pedsig = ctx.getObject(`l11-pedsig-${k}`);
      if (pedsig) {
        pedsig.ui = isGreen
          ? `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:120px;text-align:center">WALK</div>`
          : `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ff4400;font-family:Arial,sans-serif;font-weight:900;font-size:100px;text-align:center">WAIT</div>`;
      }
    });
  }

  // Periodic distant phone ring
  if (now > mem.ringAt) {
    mem.ringAt = now + 45000 + ctx.random() * 30000;
    const phone = ctx.getObject("l11-payphone");
    if (phone) heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-old-payphone-mechanical-bell-ringing-loop.mp3", position: phone.feetPosition, volume: 0.75, maxDistance: 32 });
  }
}
