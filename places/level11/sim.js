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
import { terminalSpec } from "../../scripts/lib/terminal.js";
import { layVaults } from "../../scripts/lib/level11-vaults.js";
import { layShop } from "../../scripts/lib/level11-shop.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";
import MODELS from "../../scripts/lib/data/level11-models.yml";

export const cadence = "1s";
const V = 103; // bump to rebuild the city in rooms that are already open

// Photorealistic PBR textures from CDN
const T = (name, rep = 1) => ({ texture: `cdn/texture-${name}.png`, repeat: [rep, rep], wrap: "repeat" });

const ASPHALT = { ...T("cracked-dark-asphalt-road", 4), color: "oklch(0.4 0.01 250)", roughness: 0.85 };
const SIDEWALK = { ...T("plain-light-grey-concrete-pavement-slab-fine-aggregate", 3), color: "oklch(0.93 0.004 250)", roughness: 0.85 };
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

// big skyline pieces stay in view far off; everything else stops drawing past 70 m (fog has eaten it by then)
export const L11_FAR = /^l11-(b|ntower|hero|tower|skydeck|bb)/
export function l11Lean(id, spec) {
  if (!spec) return spec
  const kids = Array.isArray(spec.children) ? spec.children.map((c) => l11Lean(id, c)) : spec.children // children carry their own range and shadow (lagscope #109-113: l11-taxi/child, payphone/child...)
  const o = { ...spec }
  if (kids !== undefined) o.children = kids
  if (!o.visibleRange) o.visibleRange = { max: L11_FAR.test(id) ? 260 : 70 }
  const pr = o.primitive
  if (pr && pr.kind === "box" && Math.max(pr.width ?? 1, pr.height ?? 1, pr.depth ?? 1) < 1.2 && o.castShadow === undefined) o.castShadow = false
  if (pr && pr.kind === "cylinder" && (pr.height ?? 1) < 1.2 && o.castShadow === undefined) o.castShadow = false
  if (o.light) {
    const lgt = { ...o.light }
    if (lgt.shadow === undefined) lgt.shadow = { enabled: false }
    if (!lgt.visibleRange) lgt.visibleRange = { max: Math.min(45, (lgt.distance ?? 10) * 2.5) }
    o.light = lgt
  }
  return o
}
// perf (Nov 8, lagscope #105-113): lay() used to spawn ~830 things and destroy the old ones in ONE tick (a 345-520 ms freeze on
// every rebuild). Now it only writes a queue; tick() lays LAY_STEP a tick, solids first so nobody falls, each id replacing
// its old self in place, and the stale roots go once the queue is empty.
const LAY_STEP = 60;
function lay(ctx) {
  const st = ctx.place.state;
  // the rows themselves stay on the machine laying them (ctx.session): only the cursor rides place.state, which every player downloads
  const q = ctx.session.l11q = { rows: [], keep: {}, v: V };
  if (!st.lq) st.lq = { i: 0 };
  const sp = (id, spec) => { q.rows.push([id, l11Lean(id, spec)]); q.keep[id] = true; return id; }; // every row gets a draw distance, small clutter casts no shadow
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

  // Back road to Level 10 (wiki: "certain streets have a back road that leads to Level 10"): the south street runs out into a dirt lane
  sp("lv10-arrive", { feetPosition: { x: 0, y: 0.25, z: 70 }, rotation: { yaw: 0 } });
  bx("lv10-lane", 0, -0.04, 88, 5, 0.12, 24, { texture: "cdn/texture-terrain-packed-brown-farm-track-dirt-tire-ruts.png", repeat: [2, 10], color: "oklch(0.55 0.04 70)", roughness: 0.95 });
  bx("lv10-lane-verge-w", -4.5, -0.05, 88, 4, 0.1, 24, { texture: "cdn/texture-terrain-rough-overcast-meadow-grass.png", repeat: [2, 10], color: "oklch(0.55 0.07 130)", roughness: 0.95 });
  bx("lv10-lane-verge-e", 4.5, -0.05, 88, 4, 0.1, 24, { texture: "cdn/texture-terrain-rough-overcast-meadow-grass.png", repeat: [2, 10], color: "oklch(0.55 0.07 130)", roughness: 0.95 });
  sp("lv10-backroad", { tags: ["door"], feetPosition: { x: 0, y: 0, z: 98 }, primitive: { kind: "box", width: 13, height: 4, depth: 1.5 }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to: "level10#l10-from-l11" } });
  sp("lv10-sign", { feetPosition: { x: 3.2, y: 0.9, z: 80 }, rotation: { yaw: 195 }, primitive: { kind: "box", width: 1.2, height: 0.42, depth: 0.04 }, material: { color: "oklch(0.78 0.02 90)", roughness: 0.9 },
    ui: '<div face="front" width="1.2m" style="font-family:Arial,sans-serif;font-weight:800;color:#2b2b2b;text-align:center;font-size:110px;line-height:1">FARM RD</div>' });
  bx("lv10-sign-post", 3.2, 0, 80.05, 0.08, 1.1, 0.08, { color: "oklch(0.4 0.03 60)", roughness: 0.9 });

  // Return doorway back to Level 6.1
  bx("l11-to-l61-frame", -29.6, 0.2, 12, 0.2, 3.2, 2.4, { color: "oklch(0.3 0.01 250)", metalness: 0.7 });
  sp("l11-to-l61", {
    tags: ["door"],
    feetPosition: { x: -29.4, y: 0.2, z: 12 },
    rotation: { yaw: -90 },
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
  sp("l11-sw-west-mid", { feetPosition: { x: -12, y: 0.08, z: -6 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 24, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } }); // stops at the 11th street crossing (z 6..18) so cars drive through
  sp("l11-sw-west-south", { feetPosition: { x: -12, y: 0.08, z: 48 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 56, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } });
  sp("l11-sw-west-north", { feetPosition: { x: -12, y: 0.08, z: -55 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 50, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } });
  bx("l11-curb-w-mid", -8.1, 0.08, -6, 0.2, 0.28, 24, CURB_MAT);
  bx("l11-curb-w-south", -8.1, 0.08, 48, 0.2, 0.28, 56, CURB_MAT);
  bx("l11-curb-w-north", -8.1, 0.08, -55, 0.2, 0.28, 50, CURB_MAT);

  sp("l11-sw-east-mid", { feetPosition: { x: 12, y: 0.08, z: -6 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 24, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } }); // stops at the 11th street crossing (z 6..18) so cars drive through
  sp("l11-sw-east-south", { feetPosition: { x: 12, y: 0.08, z: 48 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 56, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } });
  sp("l11-sw-east-north", { feetPosition: { x: 12, y: 0.08, z: -55 }, primitive: { kind: "scripted", script: "scripts/sidewalk11.js", params: { w: 7.6, d: 50, h: 0.25 } }, material: SIDEWALK, physics: { body: "static", collider: "box" } });
  bx("l11-curb-e-mid", 8.1, 0.08, -6, 0.2, 0.28, 24, CURB_MAT);
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
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 2.2, height: 11.5, depth: 0.06 },
    material: { color: "#e85d04", roughness: 0.5 },
    ui: `<div face="front" width="2.2m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e85d04;color:#ffffff;font-family:Arial Black,Impact,sans-serif;font-weight:900;font-size:125px;flex-direction:column;line-height:1.05;text-align:center"><span>P</span><span>E</span><span>G</span><span>A</span><span>S</span><span>U</span><span>S</span></div>`,
  });

  // Overhead Traffic Light Gantry at Intersection Z: 12
  cyl("l11-tlight-mast", -7.8, 0.1, 7.5, 0.16, 0.2, 5.8, IRON_RAIL);
  bx("l11-tlight-arm", 0, 5.7, 7.5, 15.5, 0.14, 0.14, IRON_RAIL);

  [[-9.6, 4.6, 0], [9.6, 10.4, 180]].forEach(([x, z, yaw], k) => md(`l11-signal-pole-${k}`, "traffic_signal", x, 0.1, z, undefined, "cylinder", { rotation: { yaw }, layout: { box: { min: { x: -6, y: 0, z: -6 }, max: { x: 6, y: 5.6, z: 6 } } } }));

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
      ui: `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:90px;text-align:center">WALK</div>`,
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
  sp("l11-embank-south", { feetPosition: { x: 0, y: -4.25, z: CANAL_Z + CANAL_W / 2 + 0.5 }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "quay", L: 120, t: 1.0, H: 4.4, side: -1 } }, physics: "static" });
  sp("l11-embank-north", { feetPosition: { x: 0, y: -4.25, z: CANAL_Z - CANAL_W / 2 - 0.5 }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "quay", L: 120, t: 1.0, H: 4.4, side: 1 } }, physics: "static" });
  for (const s of [-1, 1]) { // coping stops at the bridge so the avenue rolls straight across
    bx(`l11-cope-south-${s}`, s * 34.25, 0.2, CANAL_Z + CANAL_W / 2 + 0.5, 51.5, 0.3, 1.3, CURB_MAT);
    bx(`l11-cope-north-${s}`, s * 34.25, 0.2, CANAL_Z - CANAL_W / 2 - 0.5, 51.5, 0.3, 1.3, CURB_MAT);
  }

  // Wrought Iron Promenade Safety Railings
  for (let rx = -58; rx <= 58; rx += 5) {
    if ((rx > -12 && rx < 12) || rx === 42) continue; // 42: the iron footbridge (l11-footbridge)
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
  bx("l11-bridge-deck", 0, -0.45, CANAL_Z, 17, 0.6, CANAL_W + 4, ASPHALT);
  sp("l11-bridge-arch-w", { feetPosition: { x: -8.5, y: -2.4, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "arch", L: CANAL_W + 4, t: 1.2, H: 4.2, S: CANAL_W - 3, r: 2.9 } }, physics: "static" });
  sp("l11-bridge-arch-e", { feetPosition: { x: 8.5, y: -2.4, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "arch", L: CANAL_W + 4, t: 1.2, H: 4.2, S: CANAL_W - 3, r: 2.9 } }, physics: "static" });
  sp("l11-bridge-parapet-w", { feetPosition: { x: -8.4, y: 0.5, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "parapet", L: CANAL_W + 4, t: 0.4, H: 0.95 } }, physics: "static" });
  sp("l11-bridge-parapet-e", { feetPosition: { x: 8.4, y: 0.5, z: CANAL_Z }, primitive: { kind: "scripted", script: "scripts/l11-masonry.js", params: { kind: "parapet", L: CANAL_W + 4, t: 0.4, H: 0.95 } }, physics: "static" });

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

  // ==========================================
  // SKYDECK PANORAMIC GLASS ELEVATOR SYSTEM
  // ==========================================
  // Vertical structural guide rails
  cyl("l11-elev-guide-1", 17.35, 0.1, 34.35, 0.07, 0.07, 36.2, STEEL_BRUSHED);
  cyl("l11-elev-guide-2", 17.35, 0.1, 36.65, 0.07, 0.07, 36.2, STEEL_BRUSHED);
  cyl("l11-elev-guide-3", 19.65, 0.1, 34.35, 0.07, 0.07, 36.2, STEEL_BRUSHED);
  cyl("l11-elev-guide-4", 19.65, 0.1, 36.65, 0.07, 0.07, 36.2, STEEL_BRUSHED);

  // Horizontal structural bracings at 6m intervals
  for (const yb of [6, 12, 18, 24, 30]) {
    bx(`l11-elev-brace-n-${yb}`, 18.5, yb, 34.35, 2.3, 0.12, 0.12, STEEL_BRUSHED);
    bx(`l11-elev-brace-s-${yb}`, 18.5, yb, 36.65, 2.3, 0.12, 0.12, STEEL_BRUSHED);
    bx(`l11-elev-brace-e-${yb}`, 19.65, yb, 35.5, 0.12, 0.12, 2.3, STEEL_BRUSHED);
  }

  // Moving Glass Elevator Cab with interior lighting and glass panorama
  sp("l11-elevator-cab", {
    tags: ["usable"],
    feetPosition: { x: 18.5, y: 0.3, z: 35.5 },
    primitive: { kind: "box", width: 2.4, height: 0.14, depth: 2.4 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-elevator.js",
    state: { kind: "elev-cab", name: "Skydeck Panoramic Glass Elevator", verb: "Enter Elevator" },
    children: [
      // Roof canopy
      { feetPosition: { x: 0, y: 2.52, z: 0 }, primitive: { kind: "box", width: 2.4, height: 0.16, depth: 2.4 }, material: STEEL_BRUSHED },
      // 4 Sleek steel corner pillars
      { feetPosition: { x: -1.12, y: 0.08, z: -1.12 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.45 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 1.12, y: 0.08, z: -1.12 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.45 }, material: STEEL_BRUSHED },
      { feetPosition: { x: -1.12, y: 0.08, z: 1.12 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.45 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 1.12, y: 0.08, z: 1.12 }, primitive: { kind: "cylinder", radiusTop: 0.06, radiusBottom: 0.06, height: 2.45 }, material: STEEL_BRUSHED },
      // 3 Tinted glass panoramic wall panels
      { feetPosition: { x: 1.14, y: 0.1, z: 0 }, primitive: { kind: "box", width: 0.06, height: 2.38, depth: 2.2 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 0.1, z: 1.14 }, primitive: { kind: "box", width: 2.2, height: 2.38, depth: 0.06 }, material: GLASS_TINT },
      { feetPosition: { x: 0, y: 0.1, z: -1.14 }, primitive: { kind: "box", width: 2.2, height: 2.38, depth: 0.06 }, material: GLASS_TINT },
      // Recessed ceiling LED luminaire
      { feetPosition: { x: 0, y: 2.42, z: 0 }, light: { kind: "point", color: "oklch(0.96 0.06 85)", intensity: 3.5, distance: 8.0 } },
      { feetPosition: { x: 0, y: 2.48, z: 0 }, primitive: { kind: "box", width: 0.8, height: 0.04, depth: 0.8 }, material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 2.2 } },
    ],
  });

  // Animated sliding glass doors
  sp("l11-elev-door-l", {
    feetPosition: { x: 17.34, y: 0.3, z: 34.68 },
    primitive: { kind: "box", width: 0.06, height: 2.38, depth: 0.56 },
    material: GLASS_TINT,
  });
  sp("l11-elev-door-r", {
    feetPosition: { x: 17.34, y: 0.3, z: 36.32 },
    primitive: { kind: "box", width: 0.06, height: 2.38, depth: 0.56 },
    material: GLASS_TINT,
  });

  // Cab interior button panel & digital floor display
  sp("l11-elev-btn-interior", {
    tags: ["usable"],
    feetPosition: { x: 19.55, y: 1.5, z: 36.0 },
    primitive: { kind: "box", width: 0.15, height: 0.32, depth: 0.08 },
    material: { color: "#2ecc71", emissive: "#2ecc71", emissiveIntensity: 2.5 },
    behavior: "scripts/level11-elevator.js",
    state: { kind: "elev-interior", name: "Elevator Panel · Next: Skydeck [14]", verb: "Ride to Skydeck [14]" },
  });
  sp("l11-elev-ind-cab", {
    feetPosition: { x: 17.36, y: 2.65, z: 35.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.48, height: 0.18, depth: 0.04 },
    material: { color: "#000000" },
    ui: `<div face="front" width="0.45m" style="width:100%;height:100%;background:#060d16;border:2px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-weight:900;font-size:26px;text-align:center;padding:4px 6px;letter-spacing:2px;text-shadow:0 0 10px #00d2d3;display:flex;align-items:center;justify-content:center">[ G ]</div>`,
  });

  // Ground Lobby Landing Call Station
  sp("l11-elev-btn-ground", {
    tags: ["usable"],
    feetPosition: { x: 17.15, y: 1.3, z: 34.0 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.18, height: 0.32, depth: 0.08 },
    material: { color: "#00d2d3", emissive: "#00d2d3", emissiveIntensity: 2.5 },
    behavior: "scripts/level11-elevator.js",
    state: { kind: "elev-call-ground", name: "Skydeck Elevator Call Station", verb: "Call Elevator to Lobby" },
  });
  sp("l11-elev-ind-ground", {
    feetPosition: { x: 17.15, y: 2.7, z: 35.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.48, height: 0.18, depth: 0.04 },
    material: { color: "#000000" },
    ui: `<div face="front" width="0.45m" style="width:100%;height:100%;background:#060d16;border:2px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-weight:900;font-size:26px;text-align:center;padding:4px 6px;letter-spacing:2px;text-shadow:0 0 10px #00d2d3;display:flex;align-items:center;justify-content:center">[ G ]</div>`,
  });

  // Rooftop Skydeck Landing Call Station
  sp("l11-elev-btn-roof", {
    tags: ["usable"],
    feetPosition: { x: 17.15, y: 36.7, z: 34.0 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.18, height: 0.32, depth: 0.08 },
    material: { color: "#00d2d3", emissive: "#00d2d3", emissiveIntensity: 2.5 },
    behavior: "scripts/level11-elevator.js",
    state: { kind: "elev-call-roof", name: "Skydeck Elevator Call Station", verb: "Call Elevator to Skydeck" },
  });
  sp("l11-elev-ind-roof", {
    feetPosition: { x: 17.15, y: 38.1, z: 35.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.48, height: 0.18, depth: 0.04 },
    material: { color: "#000000" },
    ui: `<div face="front" width="0.45m" style="width:100%;height:100%;background:#060d16;border:2px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-weight:900;font-size:26px;text-align:center;padding:4px 6px;letter-spacing:2px;text-shadow:0 0 10px #00d2d3;display:flex;align-items:center;justify-content:center">[ 14 ]</div>`,
  });

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
  // Sedco Building Shell: walkable (Shelly: "make sedco spotlight an actual enterable building"). Walls, not a block; the
  // front (-X, the sign side) is glass with a door gap at the centre; inside a showroom floor under drop-ceiling light.
  const SX0 = SEDCO_X - SEDCO_W / 2, SX1 = SEDCO_X + SEDCO_W / 2, SZ0 = SEDCO_Z - SEDCO_D / 2, SZ1 = SEDCO_Z + SEDCO_D / 2, WT = 0.3, DOOR = 1.6;
  sp("l11-sedco-shell", { feetPosition: { x: SEDCO_X, y: 0.1, z: SEDCO_Z }, primitive: { kind: "scripted", script: "scripts/l11-sedco-shell.js", params: { w: SEDCO_W, d: SEDCO_D, h: SEDCO_H, t: WT, door: DOOR } }, physics: "static" });
  bx("l11-sedco-floor", SEDCO_X, 0.1, SEDCO_Z, SEDCO_W - WT, 0.04, SEDCO_D - WT, { color: "oklch(0.62 0.02 80)", roughness: 0.35 }); // waxed vinyl tile
  bx("l11-sedco-ceiling", SEDCO_X, SEDCO_H - 0.1, SEDCO_Z, SEDCO_W, 0.2, SEDCO_D, { color: "oklch(0.86 0.01 90)", roughness: 0.9 });
  for (const [i, dx] of [[0, -2.5], [1, 1.5]].values()) for (const [j, dz] of [[0, -2], [1, 2]].values()) {
    bx(`l11-sedco-troffer-${i}${j}`, SEDCO_X + dx, SEDCO_H - 0.13, SEDCO_Z + dz, 1.2, 0.03, 0.6, { color: "#fffbe8", emissive: "#fff4d0", emissiveIntensity: 1.4 }, { physics: undefined });
  }
  for (const [i, dx] of [-2.5, 1.5].entries()) sp(`l11-sedco-lamp-${i}`, { feetPosition: { x: SEDCO_X + dx, y: SEDCO_H - 0.6, z: SEDCO_Z }, light: { kind: "point", color: "#fff1d0", intensity: 2.2, distance: 9 } });
  // the front door: locked glass, released from the Sedco security panel (Storefront doors > UNLOCK); slides down into its slot
  sp("l11-sedco-door", { tags: ["usable"], feetPosition: { x: SX0 + WT / 2, y: 0.14, z: SEDCO_Z }, rotation: { yaw: 90 }, primitive: { kind: "box", width: DOOR, height: 2.75, depth: 0.08 }, material: GLASS_TINT, physics: { body: "kinematic", collider: "box" }, behavior: "scripts/l11-gate.js",
    state: { key: "sedcofront", host: "SEDCO-SEC-01", name: "Sedco Spotlight", verb: "Locked:", info: "after hours. SEDCO-SEC-01 controls it", drop: 2.8 },
    children: [{ feetPosition: { x: 0, y: 1.0, z: -0.08 }, primitive: { kind: "box", width: 1.2, height: 0.05, depth: 0.05 }, material: STEEL_BRUSHED }, { feetPosition: { x: 0, y: 1.6, z: -0.05 }, primitive: { kind: "plane", width: 0.5, height: 0.18 }, material: { color: "#111" }, ui: `<div face="front" width="0.5m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#d33;font:900 70px Arial;background:#111">CLOSED</div>` }] });
  sp("l11-sedco-door-mat", { feetPosition: { x: SX0 + 0.9, y: 0.15, z: SEDCO_Z }, primitive: { kind: "box", width: 1.2, height: 0.02, depth: 1.6 }, material: { color: "oklch(0.25 0.02 30)", roughness: 1 } });
  bx("l11-sedco-roof-trim", SEDCO_X, SEDCO_H + 0.1, SEDCO_Z, SEDCO_W + 0.3, 0.3, SEDCO_D + 0.3, CURB_MAT);
  cyl("l11-sedco-vent1", SEDCO_X - 2.5, SEDCO_H + 0.25, SEDCO_Z - 1.5, 0.4, 0.35, 0.6, STEEL_BRUSHED);
  cyl("l11-sedco-vent2", SEDCO_X + 2.0, SEDCO_H + 0.25, SEDCO_Z + 1.2, 0.4, 0.35, 0.6, STEEL_BRUSHED);
  bx("l11-sedco-ac", SEDCO_X + 2.5, SEDCO_H + 0.25, SEDCO_Z - 1.5, 1.4, 0.9, 1.2, STEEL_BRUSHED);

  // Iconic Illuminated "SEDCO SPOTLIGHT" Horizontal Neon Sign
  sp("l11-sedco-sign", {
    feetPosition: { x: SEDCO_X - SEDCO_W / 2 - 0.08, y: SEDCO_H - 0.7, z: SEDCO_Z },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 7.2, height: 1.0, depth: 0.14 },
    material: { color: "#111111" },
    ui: `<div face="front" width="7.2m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#181818;border:3px solid #ff6a00;box-sizing:border-box;color:#ff6a00;font-family:Arial Black,sans-serif;font-weight:900;font-size:105px;letter-spacing:6px;text-shadow:0 0 16px #ff6a00">SEDCO SPOTLIGHT</div>`,
  });

  // Display Windows with Vintage Spotlight Display
  for (const k of [-1, 1]) bx(`l11-sedco-glass-${k < 0 ? "n" : "s"}`, SEDCO_X - SEDCO_W / 2 + 0.15, 0.4, SEDCO_Z + k * (DOOR / 2 + 1.25), 0.06, 2.6, 2.5, GLASS_TINT);
  // the shop floor (a 2006 AV/security store): counter at the back, two gondolas either side of a 3 m aisle, CCTV wall, fresnels on stands, staff door
  const SPOT = (id, x, z, tx, tz, lit, extra = {}) => sp(id, { feetPosition: { x, y: 0.14, z }, rotation: { lookAt: { x: tx, y: 0.14, z: tz } }, primitive: null, material: null, model: { id: MODELS.sedco_spot, forward: "-z" }, physics: { body: "static", collider: "cylinder" },
    children: lit ? [{ feetPosition: { x: 0, y: 1.85, z: -0.3 }, light: { kind: "point", color: "#ffe0a0", intensity: 3.5, distance: 8 } }] : undefined, ...extra });
  SPOT("l11-sedco-spotlight1", SX0 + 0.8, SEDCO_Z - 1.9, SEDCO_X, SEDCO_Z - 3, true);
  SPOT("l11-sedco-int-spot-0", SX0 + 1.0, SZ1 - 0.8, SEDCO_X, SEDCO_Z, false, {
    tags: ["usable"],
    behavior: "scripts/level11-use.js",
    state: { kind: "sedco-spot", name: "Stage Fresnel Spotlight", verb: "Calibrate Spotlight" },
  });
  SPOT("l11-sedco-int-spot-1", SX1 - 1.4, SZ0 + 0.8, SEDCO_X, SEDCO_Z + 1, false);
  md("l11-sedco-int-counter", "sedco_counter", SX1 - 2.0, 0.14, SEDCO_Z + 0.5, { laminate: { texture: "cdn/texture-wood-grain-laminate.png", color: "#d8c8b0", roughness: 0.6 }, pkgW: { texture: "cdn/texture-white-formica-countertop.png", roughness: 0.4 } }, "box", {
    rotation: { yaw: 90 },
    tags: ["usable"],
    behavior: "scripts/level11-use.js",
    state: { kind: "sedco-counter", name: "Sedco Sales Counter & Register", verb: "Search Counter" },
  });
  for (const [i, dz] of [-2.0, 2.0].entries()) md(`l11-sedco-int-gondola-${i}`, "sedco_gondola", SEDCO_X - 1, 0.14, SEDCO_Z + dz, { peg: { texture: "cdn/texture-brown-pegboard-holes.png", repeat: [4, 2.5], roughness: 0.85 }, steel: { texture: "cdn/texture-brushed-steel.png", roughness: 0.4, metalness: 0.7 } });
  md("l11-sedco-int-monitors", "sedco_monitors", SEDCO_X - 1, 0.14, SZ0 + 0.45, { crt: { color: "#1c2a26", emissive: "#9fc0b0", emissiveIntensity: 0.55, roughness: 0.15 }, beige: { texture: "cdn/texture-smooth-off-white-abs-plastic.png", color: "#e8dcc0", roughness: 0.55 } }, "box", {
    rotation: { yaw: 180 },
    tags: ["usable"],
    behavior: "scripts/level11-use.js",
    state: { kind: "sedco-monitors", name: "CCTV Surveillance Monitor Wall", verb: "Review Camera Feeds" },
  });
  md("l11-sedco-int-door", "sedco_door", SX1 - WT - 0.06, 0.14, SZ1 - 1.2, undefined, "box", {
    rotation: { yaw: 90 },
    tags: ["usable"],
    behavior: "scripts/level11-use.js",
    state: { kind: "sedco-door", name: "Staff Room Door", verb: "Inspect Door" },
    children: [{ feetPosition: { x: 0, y: 1.53, z: -0.055 }, primitive: { kind: "plane", width: 0.4, height: 0.14 }, material: { color: "#f2efe6" }, ui: `<div face="front" width="0.4m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f2efe6;color:#a01818;font:900 64px Arial">STAFF ONLY</div>` }]
  });

  // Interactive Sedco Closed-Circuit Security Terminal (BackOS)
  bx("l11-sedco-desk", SEDCO_X - SEDCO_W / 2 - 1.2, 0.1, SEDCO_Z - 2.8, 0.9, 0.76, 0.75, STEEL_BRUSHED);
  sp("l11-sedco-terminal", terminalSpec({
    host: "SEDCO-SEC-01",
    lock: "science:10",
    name: "Sedco Closed-Circuit Security Terminal",
    at: { x: SEDCO_X - SEDCO_W / 2 - 1.2, y: 0.86, z: SEDCO_Z - 2.8 },
    yaw: 90,
    tint: "#00d2d3",
    note: "pw: spotlight",
  }));

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
  sp("l11-mall-shell", { feetPosition: { x: MALL_X, y: 0.1, z: MALL_Z }, primitive: { kind: "scripted", script: "scripts/l11-mall.js", params: { kind: "shell", w: MALL_W, h: MALL_H, d: MALL_D } }, physics: { body: "static", collider: "mesh" } });
  bx("l11-mall-sandstone-pil1", MALL_X + MALL_W / 2 - 0.2, 0.1, MALL_Z - MALL_D / 2 + 0.5, 0.4, MALL_H, 1.2, SANDSTONE_WALL);
  bx("l11-mall-sandstone-pil2", MALL_X + MALL_W / 2 - 0.2, 0.1, MALL_Z + MALL_D / 2 - 0.5, 0.4, MALL_H, 1.2, SANDSTONE_WALL);
  
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
  sp("l11-mall-awning-1", { feetPosition: { x: MALL_X + MALL_W / 2, y: 3.75, z: MALL_Z - 6.5 }, primitive: { kind: "scripted", script: "scripts/l11-mall.js", params: { kind: "awning", p: 2.0, d: 7.0, r: 0.85 } } });
  sp("l11-mall-awning-2", { feetPosition: { x: MALL_X + MALL_W / 2, y: 3.75, z: MALL_Z }, primitive: { kind: "scripted", script: "scripts/l11-mall.js", params: { kind: "awning", p: 2.0, d: 5.5, r: 0.85 } } });
  sp("l11-mall-awning-3", { feetPosition: { x: MALL_X + MALL_W / 2, y: 3.75, z: MALL_Z + 6.5 }, primitive: { kind: "scripted", script: "scripts/l11-mall.js", params: { kind: "awning", p: 2.0, d: 7.0, r: 0.85 } } });

  // Storefront 1: Centro Dermatológico (Left)
  sp("l11-mall-sign-derma", { // a backlit box sign, its face toward the street (+X)
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.33, y: 3.57, z: MALL_Z - 6.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 4.6, height: 1.53, depth: 0.12 },
    material: { texture: "/cdn/value.a4659ffdbe2739ef5037fe9ae5acaf3f02bb949cf11b5b0bd914940d0ea6d298.png", color: "#ffffff", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: 0.35, emissiveMap: "/cdn/value.a4659ffdbe2739ef5037fe9ae5acaf3f02bb949cf11b5b0bd914940d0ea6d298.png" },
    ui: null,
  });

  // Storefront 2: IS LAB (Center)
  sp("l11-mall-sign-islab", { // a backlit box sign, its face toward the street (+X)
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.33, y: 3.7, z: MALL_Z },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 4.2, height: 1.4, depth: 0.12 },
    material: { texture: "/cdn/value.0b4a4ce24244c5eda36fc29774505e1a9e45e11c61d55faa2854be3791c3e751.png", color: "#ffffff", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: 0.35, emissiveMap: "/cdn/value.0b4a4ce24244c5eda36fc29774505e1a9e45e11c61d55faa2854be3791c3e751.png" },
    ui: null,
  });

  // Storefront 3: Marroka Pizzeria (Right - Enterable!)
  sp("l11-mall-sign-pizza", { // a backlit box sign, its face toward the street (+X)
    feetPosition: { x: MALL_X + MALL_W / 2 + 0.33, y: 3.57, z: MALL_Z + 6.5 },
    rotation: { yaw: 90 },
    primitive: { kind: "box", width: 4.6, height: 1.53, depth: 0.12 },
    material: { texture: "/cdn/value.84d3cf5aa956aa729dd601b744605f186624a542c7ceefe9d8d35e746f6b5290.png", color: "#ffffff", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: 0.35, emissiveMap: "/cdn/value.84d3cf5aa956aa729dd601b744605f186624a542c7ceefe9d8d35e746f6b5290.png" },
    ui: null,
  });
  { // shopfront glazing like the photo: clear panes in white aluminum frames, the lab's glass tinted green with a frosted band
    const FX = MALL_X + MALL_W / 2 + 0.06, AL = { color: "oklch(0.94 0.005 250)", metalness: 0.6, roughness: 0.35 };
    const CLEAR = { color: "oklch(0.86 0.02 210)", metalness: 0.1, roughness: 0.05, opacity: 0.22, transparent: true };
    const GREEN = { color: "oklch(0.55 0.11 165)", metalness: 0.1, roughness: 0.08, opacity: 0.55, transparent: true };
    for (const [k, zc, w, glass] of [["derma", MALL_Z - 6.5, 5.5, CLEAR], ["islab", MALL_Z, 4.2, GREEN], ["pizza", MALL_Z + 6.5, 5.5, CLEAR]]) {
      const DW = 1.3, side = (w - DW) / 2; // two panes either side of an open doorway
      bx(`l11-mall-pane-${k}`, FX - 0.04, 0.5, zc - DW / 2 - side / 2, 0.03, 2.8, side, glass);
      bx(`l11-mall-pane-${k}-b`, FX - 0.04, 0.5, zc + DW / 2 + side / 2, 0.03, 2.8, side, glass);
      bx(`l11-mall-door-${k}-l`, FX, 0.5, zc - DW / 2, 0.09, 2.3, 0.07, AL, { physics: undefined });
      bx(`l11-mall-door-${k}-r`, FX, 0.5, zc + DW / 2, 0.09, 2.3, 0.07, AL, { physics: undefined });
      bx(`l11-mall-door-${k}-head`, FX, 2.8, zc, 0.09, 0.07, DW, AL, { physics: undefined });
      sp(`l11-mall-int-${k}`, { feetPosition: { x: MALL_X, y: 0.52, z: zc }, primitive: { kind: "scripted", script: "scripts/l11-mall.js", params: { kind: "interior", shop: k, w: MALL_W - 1.0, d: w - 0.3 } }, physics: "none" });
      { // the interior mesh's own collider closed over the aisle; its counters stand as plain invisible blocks instead
        const X1 = MALL_X + (MALL_W - 1.0) / 2, X0 = MALL_X - (MALL_W - 1.0) / 2, hd = (w - 0.3) / 2, HIDE = { visible: false, castShadow: false };
        const blocks = k === "derma" ? [[X1 - 4.75, X1 - 3.8, -1.5, 1.5, 1.1]]
          : k === "islab" ? [[X1 - 4.2, X1 - 3.6, -hd + 0.3, hd - 0.3, 1.05], [X0 + 0.3, X0 + 0.9, hd - 1.0, hd - 0.3, 1.9]]
          : [[X1 - 3.6, X1 - 2.98, -hd + 0.6, hd - 1.4, 1.37], [X0 + 0.25, X0 + 0.7, -hd + 0.4, hd - 0.4, 2.2]];
        blocks.forEach(([a, b, z0, z1, h], i) => bx(`l11-mall-col-${k}-${i}`, (a + b) / 2, 0.52, zc + (z0 + z1) / 2, b - a, h, z1 - z0, null, HIDE));
      }
      sp(`l11-mall-light-${k}`, { feetPosition: { x: MALL_X + 3, y: 3.1, z: zc }, light: { kind: "point", color: k === "pizza" ? "oklch(0.9 0.08 80)" : "oklch(0.96 0.02 220)", intensity: 2.2, distance: 11 } });
      bx(`l11-mall-frame-${k}-top`, FX, 3.3, zc, 0.08, 0.1, w, AL, { physics: undefined });
      for (const sgn of [-1, 1]) bx(`l11-mall-frame-${k}-sill${sgn}`, FX, 0.46, zc + sgn * (0.65 + (w - 1.3) / 4), 0.1, 0.06, (w - 1.3) / 2, AL, { physics: undefined });
      bx(`l11-mall-frame-${k}-transom`, FX, 2.55, zc, 0.07, 0.06, w, AL, { physics: undefined });
      const n = Math.round(w / 1.4);
      for (let i = 0; i <= n; i++) if (Math.abs(-w / 2 + (w * i) / n) > 0.75) bx(`l11-mall-frame-${k}-m${i}`, FX, 0.4, zc - w / 2 + (w * i) / n, 0.08, 2.9, 0.07, AL, { physics: undefined });
    }
    bx("l11-mall-frost-islab", FX - 0.02, 1.0, MALL_Z, 0.02, 0.35, 4.1, { color: "oklch(0.9 0.02 165)", opacity: 0.7, transparent: true, roughness: 0.6 }, { physics: undefined });
  }

  // --- CLINIC + LAB INTERIORS (Shelly's photo: Centro Dermatológico, isi LAB) ---
  {
    const FX = MALL_X + MALL_W / 2 - 0.3, Y0 = 0.36;
    const fit = (id, model, x, z, yaw, size) => sp(id, { feetPosition: { x, y: Y0, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, physics: { body: "static", collider: "box" } });
    const CHAIR = "/cdn/value.59da33e3f4850a0af05bd48a4fca8fe649c4dfc3c46bc5e1fba075fbc78ac8a9.glb" /* tripo: chrome + blue vinyl waiting chair */, RECEPTION = "/cdn/value.2c088503b2d0bc2059170d8cfd3c309ff0c962ab60e22a79372dd44229ef85be.glb" /* tripo: curved mint reception desk */, PLANT = "/cdn/value.88c7684212164aa0495a65fc294a12752ef506c35708f70485202b9366795b43.glb", DESK = "/cdn/value.53a6ef111aac797583ca330cad268f4e401bd0fe5613021c07eda571623e5ea2.glb", CAB = "/cdn/value.6b73846286fe58c95018a876f85d847e8af3c7a0187d06a8838072345f9ca49e.glb";
    const VINYL = { texture: "cdn/texture-white-speckled-clinic-vinyl-floor.png", repeat: [1, 1], wrap: "repeat", roughness: 0.6 };
    const WHITE = { color: "oklch(0.95 0.008 95)", roughness: 0.85 };
    // floors and the wall between clinic and lab, the lab's back wall
    bx("l11-derma-floor", MALL_X + 1, Y0 - 0.02, MALL_Z - 6.5, 13.6, 0.04, 5.6, VINYL, { physics: undefined });
    bx("l11-lab-floor", MALL_X + 1, Y0 - 0.02, MALL_Z - 0.5, 13.6, 0.04, 5.6, VINYL, { physics: undefined });
    bx("l11-derma-div", MALL_X + 1, Y0, MALL_Z - 3.4, 13.6, 4.4, 0.15, WHITE);
    for (const [k, z] of [["derma", MALL_Z - 6.5], ["lab", MALL_Z - 0.6]]) {
      bx(`l11-${k}-troffer`, MALL_X + 2, 3.9, z, 1.2, 0.04, 0.6, { color: "#f4fbff", emissive: "#eef6ff", emissiveIntensity: 1.5 }, { physics: undefined });
      sp(`l11-${k}-light`, { feetPosition: { x: MALL_X + 2, y: 3.6, z }, light: { kind: "point", color: "oklch(0.97 0.01 230)", intensity: 1.6, distance: 9 } });
    }
    // clinic: reception desk facing the door, waiting row by the glass, a plant, a cabinet
    fit("l11-derma-desk", RECEPTION, MALL_X - 1.5, MALL_Z - 6.5, 90, [2.6, 1.15, 1.3]);
    for (const [i, z] of [[1, -8.5], [2, -7.4], [3, -5.0]]) fit(`l11-derma-chair-${i}`, CHAIR, FX - 1.2, MALL_Z + z, -90, [0.75, 0.9, 0.75]);
    fit("l11-derma-plant", PLANT, FX - 1.0, MALL_Z - 4.0, 0, [0.55, 1.2, 0.55]);
    fit("l11-derma-cab", CAB, MALL_X - 4.6, MALL_Z - 6.5, 90, [1.6, 0.85, 0.45]);
    sp("l11-derma-poster", { feetPosition: { x: MALL_X - 5.1, y: 1.9, z: MALL_Z - 8.2 }, rotation: { yaw: 90 }, ui: `<div face="front" width="1.1m" style="width:1100px;height:1400px;background:#f7fbfa;border:18px solid #1b8a5a;font-family:Arial,sans-serif;color:#13324a;padding:60px;box-sizing:border-box"><div style="font-size:110px;font-weight:900;color:#1b8a5a">dermika</div><div style="font-size:60px;margin-top:40px">cuida tu piel</div><div style="font-size:46px;margin-top:80px;line-height:1.5">consultas · láser · cosmética</div></div>`, primitive: { kind: "box", width: 1.1, height: 1.4, depth: 0.02 }, material: { color: "#ffffff" } });
    // lab: a sample counter with a divider, two chairs, a plant
    bx("l11-lab-counter", MALL_X - 1.2, Y0, MALL_Z - 0.6, 0.8, 1.05, 3.4, { color: "oklch(0.93 0.01 230)", roughness: 0.5 });
    bx("l11-lab-counter-top", MALL_X - 1.2, Y0 + 1.05, MALL_Z - 0.6, 0.95, 0.05, 3.55, { color: "oklch(0.45 0.12 250)", roughness: 0.3 }, { physics: undefined });
    bx("l11-lab-glass", MALL_X - 1.35, Y0 + 1.1, MALL_Z - 0.6, 0.03, 0.7, 3.2, GLASS_TINT, { physics: undefined });
    fit("l11-lab-chair-1", CHAIR, FX - 1.2, MALL_Z - 1.6, -90, [0.75, 0.9, 0.75]);
    fit("l11-lab-chair-2", CHAIR, FX - 1.2, MALL_Z + 0.4, -90, [0.75, 0.9, 0.75]);
    fit("l11-lab-plant", PLANT, MALL_X - 4.5, MALL_Z + 1.6, 30, [0.5, 1.1, 0.5]);
    sp("l11-lab-hum", { feetPosition: { x: MALL_X, y: 3, z: MALL_Z - 3.5 }, audio: { clip: "cdn/sfx-quiet-office-air-vent-hvac-room-tone-loop.mp3", loop: true, gain: 0.08, spatial: true, maxDistance: 10 } });
  }

  // --- ENTERABLE MARROKA PIZZERIA INTERIOR ---
  bx("l11-pizza-floor", MALL_X + 2, 0.36, MALL_Z + 6.5, 10, 0.06, 8, TERRACOTTA_TILES);
  bx("l11-pizza-wall-div", MALL_X + 2, 0.38, MALL_Z + 2.5, 10, 4.6, 0.2, STUCCO_MALL);

  // Brick Wood-Fired Pizza Oven with Animated Flickering Embers & Hearth
  bx("l11-pizza-oven-base", MALL_X - 1.5, 0.38, MALL_Z + 8.5, 2.4, 1.2, 2.4, BRICK_BLDG);
  cyl("l11-pizza-oven-dome", MALL_X - 1.5, 1.58, MALL_Z + 8.5, 1.1, 1.2, 1.0, BRICK_BLDG);
  bx("l11-pizza-oven-logs", MALL_X - 0.7, 0.45, MALL_Z + 8.5, 0.8, 0.22, 0.8, { color: "#301605", roughness: 0.95 });
  bx("l11-pizza-oven-embers", MALL_X - 0.6, 0.67, MALL_Z + 8.5, 0.7, 0.12, 0.7, { color: "#ff4500", emissive: "#ff3300", emissiveIntensity: 3.5 });
  sp("l11-pizza-oven-fire", {
    feetPosition: { x: MALL_X - 0.4, y: 1.1, z: MALL_Z + 8.5 },
    primitive: { kind: "cylinder", radiusTop: 0.25, radiusBottom: 0.35, height: 0.4 },
    material: { color: "oklch(0.65 0.22 40)", emissive: "oklch(0.65 0.22 40)", emissiveIntensity: 3.5 },
    light: { kind: "point", color: "oklch(0.75 0.2 45)", intensity: 4.8, distance: 9 },
  });

  // Physical Baker's Peel (slides pizzas into hearth)
  sp("l11-pizza-peel", {
    tags: ["usable"],
    feetPosition: { x: MALL_X - 0.2, y: 0.38, z: MALL_Z + 9.5 },
    rotation: { pitch: 12, yaw: 30 },
    primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: 1.7 },
    material: { ...T("worn-hardwood-grain", 1), color: "oklch(0.72 0.08 65)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "pizza-peel", name: "Baker's Wood Pizza Peel", verb: "Bake Pizza in Hearth Oven" },
    children: [
      { feetPosition: { x: 0, y: 1.4, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.22, radiusBottom: 0.22, height: 0.03 }, material: { ...T("worn-hardwood-grain", 1), color: "oklch(0.75 0.08 65)" } },
    ],
  });

  // Pizza Service Counter & Cutting Board
  md("l11-pizza-counter", "pizza_counter", MALL_X + 2.8, 0.38, MALL_Z + 7.5, undefined, "box", { rotation: { yaw: 0 }, layout: { box: { min: { x: -6, y: 0, z: -6 }, max: { x: 6, y: 2.4, z: 6 } } } });

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

  // tripo pastry display case against the divider, its glass toward the shop
  sp("l11-pizza-case", { feetPosition: { x: MALL_X + 3.0, y: 0.38, z: MALL_Z + 3.15 }, rotation: { yaw: 0 }, model: { id: "/cdn/value.a619c121b4e830206d2c59969fdebd9d2a47dac9189109031f381cc44c28a2b3.glb" }, layout: { box: { min: { x: -0.95, y: 0, z: -0.42 }, max: { x: 0.95, y: 1.3, z: 0.42 } } }, physics: { body: "static", collider: "box" } });
  sp("l11-pizza-case-light", { feetPosition: { x: MALL_X + 3.0, y: 1.25, z: MALL_Z + 3.4 }, light: { kind: "point", color: "oklch(0.95 0.04 85)", intensity: 0.6, distance: 2.5 } });

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

  // the gutted ground floor (scripts/l11-reno.js shell): block walls, a half-built stud wall, slab and beams, chamfered columns,
  // a half-tiled T-bar grid, a round spiral duct on straps, the storefront frame on the street face (door gap z -2..0)
  const RENO_KIT = (kind) => ({ kind: "scripted", script: "scripts/l11-reno.js", params: { kind } });
  const RENO_PAINT = { color: "oklch(1 0 0)", roughness: 0.85 };
  sp("l11-reno-shell", { feetPosition: { x: RENO_X, y: 0, z: RENO_Z }, primitive: RENO_KIT("shell"), material: RENO_PAINT, physics: { body: "static", collider: "mesh" } });
  bx("l11-reno-floor", RENO_X, 0.22, RENO_Z, RENO_W - 0.6, 0.1, RENO_D - 0.6, SIDEWALK);

  // Large Glass Windows into Renovation Office, set in the storefront frame
  bx("l11-reno-glass-e", RENO_X + RENO_W / 2 - 0.2, 0.2, 4, 0.03, 4.2, 8, GLASS_TINT);
  bx("l11-reno-glass-e2", RENO_X + RENO_W / 2 - 0.2, 0.2, -5, 0.03, 4.2, 6, GLASS_TINT);
  // the realty doorway: a dark aluminium frame in the 2 m gap (z -2..0), transom glass above, the door held open against the glass
  {
    const DX = RENO_X + RENO_W / 2 - 0.2, AL = { color: "oklch(0.25 0.01 250)", metalness: 0.6, roughness: 0.4 };
    bx("l11-realty-jamb-n", DX, 0.2, -1.97, 0.12, 2.45, 0.08, AL);
    bx("l11-realty-jamb-s", DX, 0.2, -0.03, 0.12, 2.45, 0.08, AL);
    bx("l11-realty-header", DX, 2.6, -1, 0.14, 0.12, 2.0, AL, { physics: undefined });
    bx("l11-realty-transom", DX, 2.72, -1, 0.03, 1.68, 1.9, GLASS_TINT, { physics: undefined });
    bx("l11-realty-threshold", DX, 0.2, -1, 0.3, 0.03, 1.9, AL, { physics: undefined });
    sp("l11-realty-door", { tags: ["usable"], feetPosition: { x: DX, y: 0.24, z: -1 }, rotation: { yaw: 90 }, pivot: [0, 0.5, 0.5], primitive: { kind: "box", width: 1.86, height: 2.32, depth: 0.04 }, material: GLASS_TINT, physics: "kinematic",
      behavior: "scripts/l5-hall-door.js", state: { name: "B.N.T.G. Realty", verb: "Open", info: "Glass door", open: false, openYaw: -90, baseYaw: 90 },
      children: [
        { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "box", width: 1.9, height: 0.1, depth: 0.06 }, material: AL },
        { feetPosition: { x: 0, y: 2.24, z: 0 }, primitive: { kind: "box", width: 1.9, height: 0.08, depth: 0.06 }, material: AL },
        { feetPosition: { x: 0.92, y: 0, z: 0 }, primitive: { kind: "box", width: 0.06, height: 2.32, depth: 0.06 }, material: AL },
        { feetPosition: { x: -0.92, y: 0, z: 0 }, primitive: { kind: "box", width: 0.06, height: 2.32, depth: 0.06 }, material: AL },
        { feetPosition: { x: 0.75, y: 1.0, z: 0.06 }, primitive: { kind: "cylinder", radiusTop: 0.015, radiusBottom: 0.015, height: 0.35 }, material: { color: "oklch(0.8 0.01 90)", metalness: 0.9, roughness: 0.2 } },
        { feetPosition: { x: 0.75, y: 1.0, z: -0.06 }, primitive: { kind: "cylinder", radiusTop: 0.015, radiusBottom: 0.015, height: 0.35 }, material: { color: "oklch(0.8 0.01 90)", metalness: 0.9, roughness: 0.2 } },
      ] });
    sp("l11-realty-door-decal", { feetPosition: { x: DX - 0.05, y: 2.75, z: -1 }, rotation: { yaw: 90 }, primitive: { kind: "plane", width: 1.6, height: 0.3 }, material: { color: "#ffffff", opacity: 0 },
      ui: `<div face="front" width="1.6m" style="width:1600px;height:300px;display:flex;align-items:center;justify-content:center;color:#e9e2c8;font-family:Georgia,serif;font-size:120px;letter-spacing:12px">B.N.T.G.</div>` });
  }

  // Unfinished Drywall Partition Boards
  bx("l11-drywall-stack", -28.5, 0.22, -4.5, 1.2, 2.4, 0.35, DRYWALL_MAT, { rotation: { pitch: 12 } });
  bx("l11-drywall-wall-w", -25, 0.22, -6.8, 6.5, 4.2, 0.15, DRYWALL_MAT);
  bx("l11-reno-int-glass", -23, 0.22, 1.5, 0.04, 4.2, 6.0, GLASS_TINT);

  // B.N.T.G. Realty: a temporary office in the renovation building; the agent sells the green house (Shelly: "i should go to an npc for that preferably in a building")
  // B.N.T.G. Realty suite: a finished room carved out of the gutted floor (x -22.9..-16.4, z -5.2..3.2), entered from the glass front
  {
    const WALLP = { color: "oklch(0.8 0.045 135)", roughness: 0.92 };
    const PANEL = { texture: "cdn/texture-dark-walnut-wood-wainscot-paneling.png", repeat: [1, 1], wrap: "repeat", color: "oklch(0.8 0.03 60)", roughness: 0.55 };
    const CARPET = { texture: "cdn/texture-short-pile-office-carpet-deep-green.png", repeat: [1, 1], wrap: "repeat", roughness: 1 };
    const TRIMW = { color: "oklch(0.9 0.02 85)", roughness: 0.5 };
    const TILE = { texture: "cdn/texture-acoustic-ceiling-tile-white.png", repeat: [1, 1], wrap: "repeat", roughness: 1 };
    const X0 = -22.9, X1 = -16.4, Z0 = -5.2, Z1 = 3.2, Y = 0.32, H = 2.9, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, L = X1 - X0, D = Z1 - Z0;
    bx("l11-realty-carpet", cx, Y, cz, L, 0.02, D, CARPET, { physics: undefined });
    for (const [id, x, z, w, d] of [["n", cx, Z0, L, 0.12], ["s", cx, Z1, L, 0.12], ["w", X0, cz, 0.12, D]]) {
      bx(`l11-realty-wall-${id}`, x, Y, z, w, H, d, WALLP);
      bx(`l11-realty-wains-${id}`, x, Y, z, w + (d > w ? 0.06 : 0), 1.0, d + (w > d ? 0.06 : 0), PANEL, { physics: undefined });
      bx(`l11-realty-rail-${id}`, x, Y + 1.0, z, w + (d > w ? 0.09 : 0), 0.06, d + (w > d ? 0.09 : 0), TRIMW, { physics: undefined });
      bx(`l11-realty-base-${id}`, x, Y, z, w + (d > w ? 0.08 : 0), 0.12, d + (w > d ? 0.08 : 0), TRIMW, { physics: undefined });
      bx(`l11-realty-crown-${id}`, x, Y + H - 0.08, z, w + (d > w ? 0.1 : 0), 0.08, d + (w > d ? 0.1 : 0), TRIMW, { physics: undefined });
    }
    bx("l11-realty-ceil", cx, Y + H, cz, L, 0.06, D, TILE, { physics: undefined });
    for (const [i, z] of [[1, -2.6], [2, 0.6]]) {
      bx(`l11-realty-troffer-${i}`, -19.6, Y + H - 0.03, z, 1.2, 0.03, 0.6, { color: "#fff6e0", emissive: "#fff2d6", emissiveIntensity: 1.6 }, { physics: undefined });
      sp(`l11-realty-light-${i}`, { feetPosition: { x: -19.6, y: Y + H - 0.2, z }, light: { kind: "point", color: "oklch(0.95 0.04 85)", intensity: 1.8, distance: 8 } });
    }
    sp("l11-realty-desk", { feetPosition: { x: -19.5, y: Y, z: -1 }, rotation: { yaw: -90 }, model: { id: "/cdn/value.53a6ef111aac797583ca330cad268f4e401bd0fe5613021c07eda571623e5ea2.glb", forward: "+z" }, physics: { body: "static", collider: "box" } });
    const fit = (id, model, x, z, yaw, size) => sp(id, { feetPosition: { x, y: Y, z }, rotation: { yaw }, model: { id: model }, layout: { box: { min: { x: -size[0] / 2, y: 0, z: -size[2] / 2 }, max: { x: size[0] / 2, y: size[1], z: size[2] / 2 } } }, physics: { body: "static", collider: "box" } });
    fit("l11-realty-chair-1", "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb", -17.7, -2.0, -100, [0.8, 0.95, 0.8]);
    fit("l11-realty-chair-2", "/cdn/value.324d9a05c6aca4bc72f791c510f751bee89cfbbc0e2104e59ad075531e70a750.glb", -17.7, 0.1, -80, [0.8, 0.95, 0.8]);
    fit("l11-realty-credenza", "/cdn/value.6b73846286fe58c95018a876f85d847e8af3c7a0187d06a8838072345f9ca49e.glb", -22.55, -1, 90, [1.6, 0.85, 0.45]);
    fit("l11-realty-plant-1", "/cdn/value.88c7684212164aa0495a65fc294a12752ef506c35708f70485202b9366795b43.glb", -22.4, 2.7, 0, [0.6, 1.3, 0.6]);
    fit("l11-realty-plant-2", "/cdn/value.88c7684212164aa0495a65fc294a12752ef506c35708f70485202b9366795b43.glb", -16.9, -4.7, 40, [0.5, 1.1, 0.5]);
    fit("l11-realty-desklamp", "/cdn/value.0871d1626b929961d73cb28c05f82070ad822c5cc2e6b8deec5046248fb4086d.glb", -22.5, -0.2, 90, [0.3, 0.55, 0.3]);
    sp("l11-realty-desklamp-glow", { feetPosition: { x: -22.4, y: Y + 1.3, z: -0.2 }, light: { kind: "point", color: "oklch(0.85 0.09 70)", intensity: 0.8, distance: 4 } });
    // hung pictures: the house listing behind the desk, the city print on the north wall
    sp("l11-realty-listing", { feetPosition: { x: X0 + 0.08, y: Y + 1.25, z: -1 }, rotation: { yaw: 90 }, primitive: { kind: "plane", width: 0.9, height: 1.2 }, material: { texture: "/cdn/value.1fadd79ab1f3ae48c1a9cd77004080a7542e2fef7af365ba28561e6538aa85cd.png", roughness: 0.8 } });
    sp("l11-realty-print", { feetPosition: { x: -19.6, y: Y + 1.25, z: Z0 + 0.08 }, primitive: { kind: "plane", width: 1.6, height: 1.2 }, material: { texture: "/cdn/value.fb4fd1bce78afb472b7cbd3bd320f1cd347c29d25dd6472074d65d9cbf283692.png", roughness: 0.7 } });
    sp("l11-realty-hum", { feetPosition: { x: -19.6, y: 2.8, z: -1 }, audio: { clip: "cdn/sfx-quiet-office-air-vent-hvac-room-tone-loop.mp3", loop: true, gain: 0.1, spatial: true, maxDistance: 8 } });
    for (const id of ["l11-realty-lamp"]) if (ctx.place.objects[id]) ctx.destroy(id);
  }
  sp("l11-realty-sign", { feetPosition: { x: -16.05, y: 3.0, z: -1 }, rotation: { yaw: 90 }, vector: `<svg viewBox='0 0 400 90' width='2.6m'><rect x='2' y='2' width='396' height='86' rx='6' fill='#1f3d2c' stroke='#e9dfc4' stroke-width='4'/><text x='200' y='44' text-anchor='middle' font-family='serif' font-weight='bold' font-size='34' fill='#e9dfc4'>B.N.T.G. REALTY</text><text x='200' y='74' text-anchor='middle' font-family='sans-serif' font-size='18' fill='#e9dfc4'>homes, keys, no questions</text></svg>` });
  sp("l11-realty-agent", {
    tags: ["npc", "bntg"], feetPosition: { x: -20.25, y: 0.32, z: -1 }, rotation: { yaw: -90 }, physics: "character",
    ...critterSpec(npcLook("l11-realty-agent", { species: "badger", sex: "f", topw: "blazer", top: "#2e4a3a", botw: "skirt", bottom: "#2b2b33", shoes: "heels", eyew: "glasses" }, "trader", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Mara · B.N.T.G. Realty", role: "trader", voice: "l11-realty-agent#f", faction: "bntg", factionName: "B.N.T.G., the Backrooms Nonaligned Trade Group",
      home: { x: -20.25, z: -1 }, line: "Looking for a place? I've got one house on the books and it's a nice one.",
      ...npcState(ctx, "trader", 100),
    },
  });

  // Contractor Step Ladder (climbable in center of room!)
  sp("l11-reno-ladder", {
    tags: ["usable"],
    feetPosition: { x: -25, y: 0.27, z: 0 },
    primitive: RENO_KIT("ladder"), material: { color: "oklch(1 0 0)", metalness: 0.5, roughness: 0.4 },
    physics: { body: "static", collider: "box" },
    behavior: "scripts/level11-use.js",
    state: { kind: "ladder", name: "Contractor Step Ladder", verb: "Climb Ladder" },
  });

  // Construction Work Light Tripod casting bright halogen beam
  sp("l11-reno-worklight", {
    feetPosition: { x: -23, y: 0.27, z: -3 }, rotation: { yaw: 200 },
    primitive: RENO_KIT("worklight"), material: { color: "oklch(1 0 0)", roughness: 0.5 },
    children: [{ feetPosition: { x: 0, y: 1.72, z: 0.2 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 8.5, distance: 18 } }],
  });

  // Work Table with City Blueprints & B.R.C. Task Clipboard: plywood on sawhorses
  sp("l11-reno-table", { feetPosition: { x: -27, y: 0.27, z: 3 }, primitive: RENO_KIT("sawhorse"), material: RENO_PAINT, physics: { body: "static", collider: "box" } });
  bx("l11-reno-blueprints", -27, 1.13, 3, 1.6, 0.01, 0.9, { color: "oklch(0.4 0.12 240)", roughness: 0.8 }, { physics: undefined, rotation: { yaw: 4 } });

  // Interactive B.R.C. Work Order Clipboard
  sp("l11-reno-clipboard", {
    tags: ["usable"],
    feetPosition: { x: -26.5, y: 1.14, z: 2.6 },
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
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 2.4, height: 0.8, depth: 0.04 },
    material: { color: "oklch(0.2 0.01 250)" },
    ui: `<div face="front" width="2.4m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;font-weight:900;color:#ff3333;text-align:center"><div style="font-size:75px">DANGER: UNMAPPED EXITS</div><div style="font-size:32px;color:#ffffff">100+ NOCLIP RIFTS AHEAD · DO NOT ENTER</div></div>`,
  });

  // Memorial Site: Tamsin Clarke Memorial ("For my little strawberry")
  sp("l11-memorial-wreath", {
    feetPosition: { x: BARRICADE_X + 0.5, y: 0.1, z: BARRICADE_Z + 2.0 },
    rotation: { yaw: -90 },
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
  layShop(ctx, { sp }); // Thrift Mode, the clothing shop on the cross street
  layVaults(ctx, { sp, bx, cyl }); // hackable gates -> the subway platform and the Sedco vault

  // First Capital Municipal Street ATM (Animated Cash Dispenser)
  sp("l11-atm", {
    tags: ["usable"],
    feetPosition: { x: 9.0, y: 0.1, z: 8.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "cabinet", w: 0.9, h: 1.9, d: 0.8, r: 0.08 } },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "atm", name: "First Capital Bank ATM", verb: "Withdraw Capital Credits" },
    children: [
      // Illuminated header marquee
      { feetPosition: { x: 0, y: 1.72, z: 0.41 }, primitive: { kind: "box", width: 0.86, height: 0.26, depth: 0.04 }, material: { color: "#000000" }, ui: `<div face="front" width="0.86m" style="width:100%;height:100%;background:#092318;border:2px solid #2ecc71;box-sizing:border-box;color:#2ecc71;font-family:Arial Black,sans-serif;font-size:28px;text-align:center;padding:4px;letter-spacing:1px;font-weight:900;display:flex;align-items:center;justify-content:center">FIRST CAPITAL BANK · ATM</div>` },
      // Keypad & card entry slot
      { feetPosition: { x: 0, y: 1.05, z: 0.42 }, primitive: { kind: "box", width: 0.45, height: 0.12, depth: 0.04 }, material: { color: "#111111" } },
      // Cash dispense shutter cavity
      { feetPosition: { x: 0, y: 0.88, z: 0.42 }, primitive: { kind: "box", width: 0.52, height: 0.14, depth: 0.06 }, material: { color: "#06120e" } },
    ],
  });

  // Dynamic ATM Screen UI
  sp("l11-atm-screen", {
    feetPosition: { x: 8.58, y: 1.28, z: 8.5 },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.55, height: 0.38, depth: 0.02 },
    material: { color: "#041512" },
    ui: `<div face="front" width="0.55m" style="width:100%;height:100%;background:#041512;border:3px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:'Courier New',monospace;font-size:20px;font-weight:bold;text-align:center;padding:12px;line-height:1.3;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div style="font-size:16px;color:#10ac84">FIRST CAPITAL MUNICIPAL BANK</div>
      <div style="font-size:24px;margin:8px 0;letter-spacing:1px;color:#fff">ATM #11-04</div>
      <div style="font-size:17px;color:#2ecc71">INSERT CARD OR PRESS [E]</div>
      <div style="font-size:14px;color:#888;margin-top:4px">50 CREDITS PER WITHDRAWAL</div>
    </div>`,
  });

  // Physical Collectible Banknote Bundle (ejects to cash tray on withdrawal)
  sp("l11-atm-cash", {
    tags: ["usable"],
    feetPosition: { x: 8.52, y: -20, z: 8.5 }, // starts retracted, drops into tray on dispense
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 0.24, height: 0.03, depth: 0.14 },
    material: { color: "#2ecc71", emissive: "#27ae60", emissiveIntensity: 1.5 },
    behavior: "scripts/level11-use.js",
    state: { kind: "atm-cash", name: "Capital Credits Banknote ($50)", verb: "Take 50 Capital Credits" },
  });

  // Almond Water Street Vending Machine (Animated Illuminated Cabinet)
  sp("l11-vending", {
    tags: ["usable"],
    feetPosition: { x: -8.8, y: 0.1, z: 20 },
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "cabinet", w: 1.2, h: 2.1, d: 0.95, r: 0.07 } },
    material: { color: "oklch(0.25 0.1 230)" },
    behavior: "scripts/level11-use.js",
    state: { kind: "vending", name: "Almond Water Vending Machine", verb: "Buy Cold Almond Water" },
    children: [
      // Backlit Marquee Header
      { feetPosition: { x: 0, y: 1.88, z: 0.48 }, primitive: { kind: "box", width: 1.12, height: 0.24, depth: 0.04 }, material: { color: "#000" }, ui: `<div face="front" width="1.12m" style="width:100%;height:100%;background:#052444;border:2px solid #00d2d3;box-sizing:border-box;color:#00d2d3;font-family:Arial Black,sans-serif;font-size:32px;text-align:center;padding:4px;letter-spacing:2px;font-weight:900;display:flex;align-items:center;justify-content:center">ALMOND WATER · CHILLED</div>` },
      // Illuminated Product Display Glass with Coils & Cans
      { feetPosition: { x: 0, y: 1.18, z: 0.48 }, primitive: { kind: "box", width: 1.08, height: 1.02, depth: 0.04 }, material: { color: "#031526" }, ui: `<div face="front" width="1.08m" style="width:100%;height:100%;background:#02101e;border:2px solid #0984e3;box-sizing:border-box;padding:8px;display:flex;flex-direction:column;justify-content:space-around">
        <div style="background:#0984e3;color:#fff;font-family:sans-serif;font-weight:bold;font-size:18px;text-align:center;padding:4px;border-radius:4px">ORIGINAL · RESTORES SANITY & THIRST</div>
        <div style="display:flex;justify-content:space-around;font-family:monospace;font-size:14px;color:#00d2d3">
          <span style="border:1px solid #00d2d3;padding:2px 8px">[01] COLD $2.50</span>
          <span style="border:1px solid #00d2d3;padding:2px 8px">[02] SPARKLING</span>
          <span style="border:1px solid #00d2d3;padding:2px 8px">[03] SWEET</span>
        </div>
        <div style="color:#74b9ff;font-family:sans-serif;font-size:13px;text-align:center">BOTTLED LOCALLY AT LEVEL 11 MUNICIPAL PLANT</div>
      </div>` },
      // Mechanical Can Retrieval Hopper Flap
      { feetPosition: { x: 0, y: 0.42, z: 0.49 }, primitive: { kind: "box", width: 0.65, height: 0.28, depth: 0.08 }, material: { color: "oklch(0.2 0.01 250)" } },
    ],
  });

  // Physical Collectible Chilled Can (drops to hopper flap on purchase)
  sp("l11-vending-can", {
    tags: ["usable"],
    feetPosition: { x: -8.32, y: -20, z: 20 }, // starts inside chute, drops to y: 0.42 on purchase
    rotation: { yaw: 90 },
    primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.22 },
    material: { color: "#00d2d3", roughness: 0.15, metalness: 0.8, emissive: "#007a87", emissiveIntensity: 0.6 },
    behavior: "scripts/level11-use.js",
    state: { kind: "vending-can", name: "Chilled Can of Almond Water", verb: "Take Chilled Almond Water" },
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

    // the window entity (Level 12's door): a warm lit window in a wall nobody lives behind. scripts/level12-window.js
    {
      const WX = AX - W / 2 + 0.16, WZ = Z0 + 4.5;
      const FRAME = { color: "oklch(0.93 0.01 90)", roughness: 0.5 };
      bx("l11-win12-wall", WX - 0.16, 0, WZ, 0.3, 3.4, 2.4, BRICK);
      sp("l11-win12", {
        feetPosition: { x: WX, y: 1.0, z: WZ }, rotation: { yaw: 90 },
        primitive: { kind: "box", width: 1.1, height: 1.4, depth: 0.02 },
        material: { color: "oklch(0.95 0.04 85)", emissive: "oklch(0.9 0.09 80)", emissiveIntensity: 1.6, roughness: 0.15 },
        physics: { body: "static", collider: "box", trigger: true },
        behavior: "scripts/level12-window.js",
        children: [
          { feetPosition: { x: 0, y: -0.06, z: 0.03 }, primitive: { kind: "box", width: 1.26, height: 0.07, depth: 0.12 }, material: FRAME },
          { feetPosition: { x: 0, y: 1.4, z: 0.03 }, primitive: { kind: "box", width: 1.26, height: 0.07, depth: 0.12 }, material: FRAME },
          { feetPosition: { x: -0.6, y: 0, z: 0.03 }, primitive: { kind: "box", width: 0.07, height: 1.4, depth: 0.12 }, material: FRAME },
          { feetPosition: { x: 0.6, y: 0, z: 0.03 }, primitive: { kind: "box", width: 0.07, height: 1.4, depth: 0.12 }, material: FRAME },
          { feetPosition: { x: 0, y: 0.68, z: 0.03 }, primitive: { kind: "box", width: 1.1, height: 0.04, depth: 0.05 }, material: FRAME },
          { feetPosition: { x: 0, y: 0, z: 0.03 }, primitive: { kind: "box", width: 0.04, height: 1.4, depth: 0.05 }, material: FRAME },
          { feetPosition: { x: 0, y: -0.14, z: 0.1 }, primitive: { kind: "box", width: 1.4, height: 0.06, depth: 0.22 }, material: FRAME },
          { feetPosition: { x: 0, y: 0.7, z: 0.6 }, light: { kind: "point", color: "oklch(0.92 0.08 80)", intensity: 1.4, distance: 6 } },
        ],
        audio: { clip: "cdn/moodboard-realistic-gritty/sfx-faint-warm-room-tone-and-soft-tv-murmur-behind-glass-loop.mp3", loop: true, gain: 0.15, spatial: true, maxDistance: 7 },
      });
    }
    sp("l11-spamton-dumpster", {
      tags: ["usable"],
      feetPosition: { x: AX + 0.4, y: 0.08, z: Z0 + LEN - 1.1 },
      primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "dumpster", w: 2.0, h: 1.25, d: 1.15 } },
      material: { ...T("grimy-scratched-steel-plate", 1), color: "oklch(0.42 0.09 150)", metalness: 0.55, roughness: 0.6 },
      physics: "static",
      behavior: "scripts/spamton.js",
      state: { kind: "spamton", name: "Dumpster", verb: "Inspect dumpster", info: "Something inside is giggling.", up: null },
      children: [
        { id: "lid", feetPosition: { x: 0, y: 1.25, z: 0.55 }, pivot: [0.5, 0, 1], primitive: { kind: "box", width: 2.05, height: 0.07, depth: 1.2 }, material: { color: "oklch(0.36 0.08 150)", metalness: 0.5, roughness: 0.65 } },
        { id: "rim", feetPosition: { x: 0, y: 1.1, z: 0 }, primitive: { kind: "box", width: 2.08, height: 0.12, depth: 1.22 }, material: { color: "oklch(0.3 0.05 150)", metalness: 0.6, roughness: 0.5 } },
        { id: "wheel-l", feetPosition: { x: -0.8, y: -0.08, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.08, height: 0.08 }, rotation: { roll: 90 }, material: { color: "#111" } },
        { id: "wheel-r", feetPosition: { x: 0.8, y: -0.08, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.08, height: 0.08 }, rotation: { roll: 90 }, material: { color: "#111" } },
        { id: "spamton", visible: false, feetPosition: { x: 0, y: 0.75, z: 0 }, sprite: { texture: "/cdn/spr-cutscene-14-spamton-0-u28geao1a.webp", size: [0.95, 1.29], billboard: "yaw", filter: "pixel" } }, // Shelly's own sprite (Nov 8), not a model
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
    feetPosition: { x: -6.95, y: 0.08, z: -8.5 }, // parked at the west kerb, out of the intersection
    rotation: { yaw: 0 },
    physics: { body: "kinematic", collider: "box" },
    behavior: "scripts/level11-car.js",
    state: { kind: "taxi", name: "Level 11 Express Taxi", verb: "Drive Taxi" },
    primitive: null, material: null, scale: 1.25, model: { id: MODELS.taxi, forward: "+x", offset: [0, 0.02, 0] }, // Tripo 2006 Crown Victoria cab: 4.16 m raw x1.25 = 5.2 m, wheels in the mesh
    children: [
      { feetPosition: { x: 0, y: 0.5, z: -3.5 }, light: { kind: "point", color: "oklch(0.98 0.08 90)", intensity: 7.5, distance: 24, shadow: { enabled: false } } },
    ],
  });

  // the Tripo cab carries its own wheels; the old separate wheel models are retired
  sp("l11-porsche", { // a real car (scripts/level11-porsche.js): dynamic hull on four sprung wheels, 1.35x a real 911 so a critter fits
    tags: ["usable", "vehicle"],
    feetPosition: { x: -21, y: 0.3, z: 16.4 },
    rotation: { yaw: 90 },
    physics: { body: "dynamic", collider: "none", mass: 300, centerOfMass: [0, 0.45, 0], angularDamping: 0.4 },
    behavior: "scripts/level11-porsche.js",
    state: { kind: "car", name: "1995 Porsche 911 Carrera RS", verb: "Get in" },
    model: { id: "/cdn/value.d9a163ec75298c9660fd165f4d3aa796afedebd6aa6fa6c07827511611edab15.glb" },
    layout: { box: { min: { x: -1.28, y: 0, z: -2.9 }, max: { x: 1.28, y: 1.75, z: 2.9 } } },
    visibleRange: { max: 160 },
    children: [{ id: "hull", feetPosition: { x: 0, y: 0.32, z: 0 }, primitive: { kind: "box", width: 2.3, height: 0.95, depth: 5.5 }, visible: false, physics: "static" }],
  });

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
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "skiff", w: 1.8, h: 0.75, d: 4.2 } },
    material: { ...T("worn-hardwood-grain", 1), color: "oklch(0.35 0.05 240)", roughness: 0.7 },
    children: [
      { feetPosition: { x: 0, y: 0.45, z: -0.3 }, primitive: { kind: "box", width: 1.5, height: 0.35, depth: 0.6 }, material: { color: "oklch(0.6 0.06 60)", roughness: 0.8 } },
      { feetPosition: { x: 0, y: 0.6, z: 1.7 }, primitive: { kind: "cylinder", radiusTop: 0.14, radiusBottom: 0.16, height: 0.55 }, material: STEEL_BRUSHED },
    ],
  });

  // ==========================================
  // 13. STREET PAYPHONE BOOTH
  // ==========================================
  // the green house's B.N.T.G. yard sign (Shelly: a player home you buy from the B.N.T.G.); $2,500 is Savi's pick
  sp("l11-house-sale", {
    tags: ["breakable"], feetPosition: { x: -19.8, y: 0.1, z: 48.3 }, rotation: { lookAt: { x: -10, y: 0, z: 48.3 } },
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "yardsign" } }, physics: { body: "static", collider: "box" },
    state: { mat: "wood", needs: "home11", stayGone: true }, // no E; the owner smashes it
    ui: `<div face="front" at="0.5 0.62" width="0.86m" style="width:860px;height:560px;background:#f3ead2;color:#1c2a22;font-family:Georgia,serif;text-align:center;padding:30px 24px;box-sizing:border-box;border:14px solid #2f4a3a"><div style="font-size:150px;font-weight:bold;letter-spacing:6px;line-height:1">FOR SALE</div><div style="font-size:52px;margin-top:22px">3 bed · porch · quiet street</div><div style="font-size:92px;font-weight:bold;color:#7a1f1a;margin-top:18px">$2,500</div><div style="font-size:40px;margin-top:14px;letter-spacing:3px">B.N.T.G. REALTY</div></div>`,
  });
  sp("l11-from-home", { feetPosition: { x: -24.4, y: 1.0, z: 51.85 }, rotation: { yaw: -90 } }); // where you step out of the house
  sp("l11-house-door", {
    tags: ["usable"], feetPosition: { x: -23.45, y: 0.9, z: 51.85 }, visible: false, // just proud of the wall collider (x -23.6) so the look ray reaches it
    primitive: { kind: "box", width: 0.2, height: 2, depth: 1.2 },
    behavior: "scripts/level11-use.js",
    state: { kind: "house-door", name: "Front Door", verb: "Go inside" },
  });
  sp("l11-payphone", {
    tags: ["usable"],
    feetPosition: { x: -8.8, y: 0.1, z: 15.5 },
    rotation: { yaw: 90 },
    primitive: null, material: null, scale: 1.15, model: { id: MODELS.payphone_tripo, forward: "-x" }, physics: { body: "static", collider: "box" }, // tripo street payphone, 1.8 m raw x1.15
    behavior: "scripts/level11-use.js",
    state: { kind: "payphone", name: "Municipal Street Payphone", verb: "Answer Payphone" },
  });

  // ==========================================
  // 14. AL'S HOT DOG & PRETZEL CART
  // ==========================================
  sp("l11-foodcart", {
    feetPosition: { x: 9.2, y: 0.1, z: 15 },
    rotation: { yaw: -90 },
    primitive: null, material: null, scale: 1.8, model: { id: MODELS.foodcart, forward: "+x" }, // tripo hot dog cart, 1.2 m raw x1.8 = 2.2 m with the umbrella
    fx: { script: STEAM_CART },
  });

  sp("l11-food-pretzel", {
    tags: ["usable"],
    parent: "l11-foodcart",
    feetPosition: { x: 0.1, y: 0.97, z: -0.25 },
    primitive: null, material: null, model: { id: MODELS.pretzels, forward: "-z" },
    behavior: "scripts/level11-use.js",
    state: { kind: "food-pretzel", name: "Hot Salted Capital Pretzel", verb: "Buy Hot Pretzel" },
  });

  sp("l11-food-hotdog", {
    tags: ["usable"],
    parent: "l11-foodcart",
    feetPosition: { x: 0.1, y: 0.97, z: 0.4 },
    primitive: null, material: null, model: { id: MODELS.dogwell, forward: "-z" },
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

  // M.E.G. Base Beta Tactical BackOS Terminal
  sp("l11-meg-terminal", terminalSpec({
    host: "BETA-DISPATCH-01",
    lock: "",
    name: "M.E.G. Base Beta Tactical Terminal",
    at: { x: OUTPOST_X, y: 0.95, z: OUTPOST_Z },
    yaw: 180,
    tint: "#45b649",
    note: "pw: pegasus11",
  }));

  // Cmdr. Harris's expedition log "Matrix": the only way to learn the Level 12 ritual (scripts/level12-use.js)
  sp("l11-harris-log", {
    tags: ["usable"],
    feetPosition: { x: OUTPOST_X + 0.35, y: 0.86, z: OUTPOST_Z + 0.1 }, rotation: { yaw: 200 },
    primitive: { kind: "box", width: 0.24, height: 0.07, depth: 0.15 },
    material: { color: "oklch(0.25 0.01 250)", roughness: 0.6 },
    behavior: "scripts/level12-use.js",
    state: { kind: "harris-log", name: "Tape Recorder · \"MATRIX\"", verb: "Play Tape" },
    children: [
      { feetPosition: { x: -0.05, y: 0.07, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: 0.01 }, material: { color: "oklch(0.85 0.01 90)" } },
      { feetPosition: { x: 0.05, y: 0.07, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.025, radiusBottom: 0.025, height: 0.01 }, material: { color: "oklch(0.85 0.01 90)" } },
      { feetPosition: { x: 0, y: 0.07, z: 0.05 }, primitive: { kind: "box", width: 0.07, height: 0.012, depth: 0.03 }, material: { color: "oklch(0.55 0.15 25)" } },
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
    ...critterSpec(npcLook("l11-vance", { species: "human", sex: "m", topw: "megjacket", top: "#4a5a3a", botw: "cargo", bottom: "#3a3a30", shoes: "boots" }, "guard", 11)),
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
    model: { id: "/cdn/value.180d1072a97d34551e1394960b70202777c9d0b51fb0ca67779a59e429ef6fa7.glb" },
    anim: { main: { clip: "idle", loop: true, speed: 0.85 } },
    behavior: "scripts/level11-use.js",
    state: {
      kind: "pet-hound",
      name: "Docile Level 11 Hound",
      verb: "Pet Friendly Hound",
      info: "Affected by the Level 11 Effect. Completely calm and friendly, like a domestic stray dog.",
    },
  });
  cyl("l11-hound-bowl", 7.8, 0.1, -5, 0.22, 0.26, 0.12, STEEL_BRUSHED, {
    children: [
      { feetPosition: { x: 0, y: 0.08, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.2, radiusBottom: 0.2, height: 0.02 }, material: { color: "#00d2d3", roughness: 0.1, metalness: 0.3 } },
    ],
  });

  sp("l11-commuter-faceling", {
    tags: ["npc", "faceling"],
    feetPosition: { x: -11.5, y: 0.1, z: 24 },
    rotation: { yaw: 180 },
    physics: "character",
    ...critterSpec(npcLook("l11-faceling1", { species: "faceling", sex: "f", topw: "jacket", top: "#2a2a35", botw: "pants", bottom: "#202028", shoes: "boots" }, "wanderer", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
    state: {
      name: "Commuter Faceling",
      job: "route", route: W_LOOP,
      role: "survivor",
      voice: "wren",
      line: "Pardon me, heading to the commercial plaza before the streetlights turn.",
      ...npcState(ctx, "faceling", 90),
    },
  });

  // ==========================================
  // 17. SCENE: SPONTANEOUS SIMULATED ROADWORKS (Wikidot Image 2 & Section "Further Fluidity")
  // ==========================================
  // "A handful of cars and a simulated roadworks site."
  // "Roadworks and city maintenance appear spontaneously, alongside scaffolding, graffiti, waste bins, etc."
  const RW_X = -6.6; // tucked into the parking lane against the west kerb, the driving lanes stay open
  const RW_Z = 52.0;

  // Steel trench excavation plate over asphalt cut
  bx("l11-roadwork-plate", RW_X, 0.08, RW_Z, 2.2, 0.05, 3.4, STEEL, { rotation: { yaw: 2 } });
  // Trench Steam Seep
  sp("l11-roadwork-steam", {
    feetPosition: { x: RW_X + 0.9, y: 0.12, z: RW_Z },
    fx: { script: `fx
pop steam rate=8 on=box(0.1,0.05,2.8) life=1.2..2.2 v=up(0.6..1.2)+sdir()*0.05 size=0.15..0.35 acc=drag(1.1)+buoy(0.2) col=<0.95,0.95,0.98> a=0.35>0 sz=$size*(1>2.4) r=sprite(smoke-puff,alpha)` },
  });

  // A-Frame Striped Orange/White Road Barricades (scripts/roadwork11.js: steel A-legs, chevron rails, lamp)
  [-1.8, 1.8].forEach((dz, k) => {
    sp(`l11-roadwork-barricade-${k}`, {
      feetPosition: { x: RW_X, y: 0.1, z: RW_Z + dz }, rotation: { yaw: k ? 3 : -4 },
      primitive: { kind: "scripted", script: "scripts/roadwork11.js", params: { kind: "barricade", w: 2.2, h: 0.9 } },
      material: { color: "#ffffff", roughness: 0.6 }, physics: "static",
      children: [{ feetPosition: { x: 0.92, y: 1.04, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.12 }, material: { color: "#ff9900", emissive: "#ff9900", emissiveIntensity: 2.5 } }],
    });
  });

  // Orange Rubber Traffic Cones, set down by hand: not a ruler line
  [[-1.2, 0, 7], [-0.4, 0.06, -12], [0.4, -0.04, 20], [1.2, 0.05, 41]].forEach(([dz, dx, yaw], k) => {
    sp(`l11-roadwork-cone-${k}`, {
      feetPosition: { x: RW_X + 1.3 + dx, y: 0.1, z: RW_Z + dz }, rotation: { yaw },
      primitive: { kind: "scripted", script: "scripts/roadwork11.js", params: { kind: "cone" } },
      material: { color: "#ffffff", roughness: 0.55 }, physics: "static",
    });
  });

  // Diesel Air Compressor & Generator
  sp("l11-roadwork-gen", {
    tags: ["usable"],
    feetPosition: { x: RW_X - 1.2, y: 0.1, z: RW_Z - 0.6 },
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "cabinet", w: 1.1, h: 0.9, d: 1.6, r: 0.18 } },
    material: { color: "oklch(0.78 0.18 85)", metalness: 0.7, roughness: 0.35 },
    behavior: "scripts/level11-use.js",
    state: { kind: "roadwork-gen", name: "B.R.C. Infrastructure Diesel Compressor", verb: "Inspect Compressor" },
    children: [
      { feetPosition: { x: 0, y: 0.95, z: 0.4 }, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.04, height: 0.45 }, material: STEEL_BRUSHED },
      { feetPosition: { x: 0.56, y: 0.55, z: -0.3 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.04 }, rotation: { pitch: 90 }, material: STEEL_BRUSHED },
    ],
  });

  // Pneumatic Jackhammer Tool
  sp("l11-roadwork-drill", {
    tags: ["usable"],
    feetPosition: { x: RW_X - 0.4, y: 0.1, z: RW_Z + 0.8 },
    rotation: { pitch: 18, yaw: 45 },
    primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.05, height: 1.1 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "roadwork-drill", name: "Heavy Pneumatic Pavement Drill", verb: "Inspect Drill" },
    children: [
      { feetPosition: { x: 0, y: 0.95, z: 0 }, primitive: { kind: "box", width: 0.32, height: 0.06, depth: 0.08 }, material: { color: "#111" } },
      { feetPosition: { x: 0, y: -0.1, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.01, height: 0.35 }, material: STEEL_BRUSHED },
    ],
  });

  // B.R.C. Roadwork Sign
  sp("l11-roadwork-sign", {
    feetPosition: { x: RW_X, y: 0.6, z: RW_Z - 2.8 },
    children: [{ feetPosition: { x: 0, y: -0.5, z: 0 }, primitive: { kind: "scripted", script: "scripts/roadwork11.js", params: { kind: "sign", w: 1.8, y0: 0.5 } }, material: { color: "#ffffff", roughness: 0.5 } }],
    rotation: { yaw: 180 },
    primitive: { kind: "box", width: 1.8, height: 1.1, depth: 0.05 },
    material: { color: "#ff6600" },
    ui: `<div face="front" width="1.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ff6600;color:#000000;font-family:Arial Black,sans-serif;font-weight:900;text-align:center;border:4px solid #000;box-sizing:border-box;padding:8px">
      <div style="font-size:52px;letter-spacing:1px">ROAD WORK AHEAD</div>
      <div style="font-size:24px;margin-top:6px;font-family:monospace">B.R.C. PERMIT #74-ROADS</div>
      <div style="font-size:18px;color:#111">SPONTANEOUS INFRASTRUCTURE WORK</div>
    </div>`,
  });

  // ==========================================
  // 17b. THE U.E.C. - THEBES (Wikidot lore + Shelly's ref "The perimeter of Thebes")
  // The south avenue is cut off by moveable chain-link fences with furniture junk piled high behind them.
  // One gate, heavily policed. Entities are shot on sight; outsiders are turned away.
  // ==========================================
  {
    const TZ = -130, TH = (k) => MODELS[`th_${k}`];
    const THM = { fence: { forward: "+x", scale: 1.06 }, junk: { forward: "+x", scale: 1.7 }, booth: { forward: "+x", scale: 1.05 }, sandbag: { forward: "+x", scale: 1.1 }, gate: { forward: "+x", scale: 1.22 } }; // tripo comes in metres: fence 3.4 m, gate 3.3 m, junk 3.8 m wide before these
    const piece = (id, k, x, z, yaw, box, collider = "box") => TH(k)
      ? sp(id, { feetPosition: { x, y: 0.1, z }, rotation: { yaw }, model: { id: TH(k), forward: THM[k].forward }, scale: THM[k].scale, physics: { body: "static", collider } })
      : bx(id, x, 0.1, z, box[0], box[1], box[2], { color: "oklch(0.6 0.01 240)", metalness: 0.6, roughness: 0.5, opacity: 0.55, transparent: true }, { rotation: { yaw } });
    // the fence line, wall to wall, a 4 m gap for the gate
    [3.75, 7.25, 10.75, 14.25, 17.25].forEach((ax, i) => [-1, 1].forEach((sgn) => piece(`l11-th-fence-${i}-${sgn}`, "fence", sgn * ax, TZ, 180, [3.5, 2.1, 0.12])));
    piece("l11-th-gate", "gate", 0, TZ, 180, [4, 2.4, 0.15]);
    // furniture junk heaped high behind the wire
    [[-12.5, 2], [-6.5, -1.5], [6.5, 1.5], [12.5, -2]].forEach(([x, dz], i) => piece(`l11-th-junk-${i}`, "junk", x, TZ - 3.2 + dz * 0.3, i * 37 % 360, [5.5, 3.2, 3], "box"));
    // the checkpoint outside the gate
    piece("l11-th-booth", "booth", 5.2, TZ + 3.2, 180, [2.2, 2.6, 2.2]);
    piece("l11-th-sandbag-0", "sandbag", -4.6, TZ + 3.4, 180, [2.2, 0.9, 0.8]);
    piece("l11-th-sandbag-1", "sandbag", -1.6, TZ + 5.2, 160, [2.2, 0.9, 0.8]);
    // floodlights on poles, the gate lit like a stage
    [[-2.6, 1], [2.6, -1]].forEach(([x, k], i) => {
      cyl(`l11-th-pole-${i}`, x, 0.1, TZ + 0.4, 0.07, 0.09, 4.6, { color: "oklch(0.35 0.01 240)", metalness: 0.7, roughness: 0.5 });
      sp(`l11-th-flood-${i}`, { feetPosition: { x, y: 4.5, z: TZ + 0.6 }, primitive: { kind: "box", width: 0.5, height: 0.32, depth: 0.25 }, material: { color: "#d8dbe0", emissive: "#fff6e0", emissiveIntensity: 2.2 }, light: { kind: "spot", color: "oklch(0.97 0.03 90)", intensity: 9, distance: 22, angle: 50, penumbra: 0.5, aim: { x: x * 0.5, y: 0, z: TZ + 8 } }, castShadow: false });
    });
    // the sign wired over the gate
    sp("l11-th-sign", {
      feetPosition: { x: 0, y: 2.55, z: TZ + 0.1 }, rotation: { yaw: 180 },
      primitive: { kind: "box", width: 3.6, height: 1.0, depth: 0.04 }, material: { color: "#f2efe6", roughness: 0.8 },
      ui: `<div face="front" width="3.6m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f2efe6;color:#141414;font-family:Arial Black,Arial,sans-serif;text-align:center;border:10px solid #9b1b1b;box-sizing:border-box"><div style="font-size:120px;line-height:1;letter-spacing:6px">THEBES</div><div style="font-size:40px;margin-top:10px">U.E.C. SETTLEMENT · RESIDENTS AND PERMITS ONLY</div><div style="font-size:36px;color:#9b1b1b;margin-top:6px">ENTITIES WILL BE SHOT ON SIGHT</div></div>`,
    });
    // two guards on the gate, rifles out, facing the city
    const GUARDS = [
      ["l11-th-guard-0", -2.4, "l11-th-luke", { species: "wolf", sex: "m", topw: "megjacket", top: "#3a3e44", botw: "cargo", bottom: "#2c2c2c", shoes: "boots" }, "Gate Guard Logan · U.E.C. Thebes", "Gate's shut. If you've got a permit, show it. If you don't, the city's that way."],
      ["l11-th-guard-1", 2.4, "l11-th-diana", { species: "fox", sex: "f", topw: "megjacket", top: "#3a3e44", botw: "cargo", bottom: "#2c2c2c", shoes: "boots" }, "Gate Guard Stewards · U.E.C. Thebes", "Nobody gets in without the council's say. And if you're carrying anything that smiles too wide, keep walking."],
    ];
    for (const [id, x, seed, look, name, line] of GUARDS) sp(id, {
      tags: ["npc", "uec"], feetPosition: { x, y: 0.1, z: TZ + 1.6 }, rotation: { yaw: 180 }, physics: "character",
      ...critterSpec(npcLook(seed, look, "guard", 11)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
      state: { name, role: "guard", voice: "reyes", faction: "uec", factionName: "U.E.C. Thebes", home: { x, z: TZ + 1.6 }, line, ...npcState(ctx, "agent", 140) },
    });
    sp("l11-th-hum", { feetPosition: { x: 0, y: 3, z: TZ - 4 }, audio: { clip: "cdn/sfx-distant-muffled-voices-and-hammering-behind-a-wall-loop.mp3", loop: true, gain: 0.16, spatial: true, maxDistance: 26 } });
  }

  // ==========================================
  // 17b. OLD TOWN (Wikidot refs: the cobbled tram street, the B.N.T.G. painted gable, a stripped office floor) + a second canal crossing
  // ==========================================
  {
    const OT = (k) => MODELS[`ot_${k}`];
    const fit = (id, k, x, y, z, yaw, scale, collider = "box", extra = {}) => sp(id, { feetPosition: { x, y, z }, rotation: { yaw }, model: { id: OT(k), forward: "+x" }, scale, physics: collider ? { body: "static", collider } : undefined, ...extra }); // scale from the glb's measured metres: tripo pieces stand full size
    const COBBLE = { ...T("worn-grey-granite-cobblestone-street-setts", 1), repeat: [5, 24], color: "oklch(0.62 0.02 70)", roughness: 0.9 };
    const RAIL = { color: "oklch(0.55 0.01 250)", metalness: 0.9, roughness: 0.35 };
    // the avenue between the 84 and 156 cross streets is laid in setts with two tram tracks; cars still drive it
    const AX = -140, Z0 = 92, Z1 = 150, ZM = (Z0 + Z1) / 2, L = Z1 - Z0;
    bx("l11-ot-cobble", AX, 0.155, ZM, 11.6, 0.06, L, COBBLE, { physics: "none" });
    [-2.2, 2.2].forEach((tx, t) => [-0.72, 0.72].forEach((rx, r) => bx(`l11-ot-rail-${t}-${r}`, AX + tx + rx, 0.2, ZM, 0.08, 0.05, L, RAIL, { physics: "none" })));
    // green cast-iron wire poles both kerbs, every 14 m, arms reaching over the tracks; the wires sag between them
    for (let i = 0, z = Z0 + 4; z <= Z1 - 4; z += 14, i++) {
      fit(`l11-ot-pole-w-${i}`, "trampole", AX - 6.6, 0.15, z, 0, 2.9, "cylinder");
      fit(`l11-ot-pole-e-${i}`, "trampole", AX + 6.6, 0.15, z, 180, 2.9, "cylinder");
    }
    [-2.5, 2.5].forEach((tx, t) => sp(`l11-ot-wire-${t}`, { feetPosition: { x: AX + tx, y: 8.25 - (L - 6) / 2, z: ZM }, rotation: { pitch: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: L - 6, radialSegments: 5 }, material: { color: "#1a1a1a", metalness: 0.6, roughness: 0.5 }, castShadow: false }));
    // the stripped office: a concrete shell behind the gable, open to the avenue, ducts and foil overhead, the drywall half up
    const OX = -164, OZ = 136, OW = 22, OD = 26, OH = 4.6;
    const SLAB = { ...T("water-stained-streaked-old-poured-concrete-column", 2), color: "oklch(0.66 0.015 80)", roughness: 0.9 };
    // the painted gable: the office's south end wall rises bare above it, the old advert fading on it, read from the avenue walking north
    bx("l11-ot-gable", OX, 0.1, OZ - OD / 2 - 0.45, OW, 24, 0.5, { texture: "cdn/texture-weathered-pale-grey-lime-render-wall-with-damp-streaks.png", repeat: [3, 3], wrap: "repeat", color: "oklch(0.8 0.015 80)", roughness: 0.95 });
    bx("l11-ot-chimney", OX - 6, 24.1, OZ - OD / 2 - 0.45, 1.6, 2.6, 1.1, SEDCO_BRICK); // the old stack still on the firewall // a firewall left standing when its building came down, taller than the brick block in front
    sp("l11-ot-ad", { feetPosition: { x: OX + 1.5, y: 14.5, z: OZ - OD / 2 - 0.72 }, rotation: { yaw: 180 }, primitive: { kind: "plane", width: 10.4, height: 15.6 }, material: { texture: MODELS.ot_wallad, roughness: 0.95, opacity: 0.88, transparent: true } }); // painted straight on the render, faded, filling the wall
    sp("l11-ot-gable-lamp", { feetPosition: { x: OX + 9.5, y: 15.4, z: OZ - OD / 2 - 1.0 }, primitive: { kind: "sphere", radius: 0.16 }, material: { color: "#fff2d0", emissive: "#ffd890", emissiveIntensity: 2 }, light: { kind: "point", color: "oklch(0.9 0.08 75)", intensity: 2, distance: 12 } });
    bx("l11-ot-off-floor", OX, 0.02, OZ, OW, 0.14, OD, SLAB);
    bx("l11-ot-off-roof", OX, OH, OZ, OW, 0.5, OD, SLAB);
    bx("l11-ot-off-wall-w", OX - OW / 2, 0.1, OZ, 0.4, OH, OD, SEDCO_BRICK);
    bx("l11-ot-off-wall-n", OX, 0.1, OZ + OD / 2, OW, OH, 0.4, SEDCO_BRICK);
    bx("l11-ot-off-wall-s", OX, 0.1, OZ - OD / 2, OW, OH, 0.4, SEDCO_BRICK);
    // the avenue face: brick piers with the openings left bare
    [-12, -6, 0, 6, 12].forEach((dz, i) => bx(`l11-ot-off-pier-${i}`, OX + OW / 2, 0.1, OZ + dz, 0.6, OH, 0.9, SEDCO_BRICK));
    bx("l11-ot-off-lintel", OX + OW / 2, OH - 0.7, OZ, 0.6, 0.7, OD, SEDCO_BRICK);
    // the frame inside: raw columns on a 6 m grid
    [-5.5, 0.5, 6.5].forEach((dx, i) => [-6, 0, 6].forEach((dz, j) => cyl(`l11-ot-off-col-${i}-${j}`, OX + dx, 0.1, OZ + dz, 0.32, 0.32, OH - 0.1, PILLAR_MAT)));
    // the foil-wrapped duct runs under the slab and the bare tubes that light it
    [-4, 4].forEach((dx, i) => sp(`l11-ot-off-duct-${i}`, { feetPosition: { x: OX + dx, y: OH - 0.55 - (OD - 1.2) / 2, z: OZ }, rotation: { pitch: 90 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.3, radiusBottom: 0.3, height: OD - 1.2, radialSegments: 20 }, material: SILVER_FOIL }));
    [-6, 0, 6].forEach((dz, i) => sp(`l11-ot-off-tube-${i}`, { feetPosition: { x: OX, y: OH - 0.32, z: OZ + dz }, primitive: { kind: "box", width: 3, height: 0.06, depth: 0.12 }, material: { color: "#f4f6f0", emissive: "#f4f8ff", emissiveIntensity: 1.6 }, light: { kind: "point", color: "oklch(0.96 0.02 220)", intensity: 1.6, distance: 11 } }));
    // half-hung drywall: a studded partition with the boards stopping short
    for (let k = 0; k < 9; k++) bx(`l11-ot-off-stud-${k}`, OX - 1 + k * 0.6, 0.15, OZ + 9.5, 0.09, OH - 0.15, 0.06, WOOD, { physics: k % 4 ? "none" : "static" });
    bx("l11-ot-off-board-0", OX - 1.5, 0.15, OZ + 9.55, 1.2, 2.4, 0.03, DRYWALL_MAT);
    bx("l11-ot-off-board-1", OX - 0.3, 0.15, OZ + 9.55, 1.2, 2.4, 0.03, DRYWALL_MAT);
    // the work left where it stopped
    fit("l11-ot-off-ladder", "ladder", OX + 4.5, 0.1, OZ - 3.5, 25, 1.35);
    fit("l11-ot-off-drywall", "drywall", OX - 6.5, 0.1, OZ + 4, 90, 0.68);
    fit("l11-ot-off-spool-0", "spool", OX - 7.5, 0.1, OZ - 7.5, 0, 2.2, "cylinder");
    fit("l11-ot-off-spool-1", "spool", OX - 6.1, 0.1, OZ - 8.4, 70, 1.6, "cylinder");
    sp("l11-ot-off-hum", { feetPosition: { x: OX, y: 3.6, z: OZ }, audio: { clip: "cdn/sfx-empty-concrete-office-floor-fluorescent-tube-buzz-and-ventilation-drone-loop.mp3", loop: true, gain: 0.14, spatial: true, maxDistance: 18 } });
    // a second crossing over the canal: a white steel footbridge, west of the road bridge
    const CZ = -30;
    fit("l11-canal-footbridge", "footbridge", -36, 0.32, CZ, 45, 5.2, "mesh"); // spans the canal north to south
  }

  // ==========================================
  // 18. SCENE: BUILDING SCAFFOLDING & STREET GRAFFITI (Wikidot Lore)
  // ==========================================
  const SCAF_X = 22.0;
  const SCAF_Z = 31.0;


  // Walkway decks (Tier 1 at y: 2.4, Tier 2 at y: 4.8)
  md("l11-scaf-shed", "scaffold_shed", SCAF_X, 0.1, SCAF_Z, undefined, "mesh", { rotation: { yaw: 0 }, layout: { box: { min: { x: -6, y: 0, z: -6 }, max: { x: 6, y: 3.2, z: 6 } } } });
  bx("l11-scaf-deck1", SCAF_X, 2.4, SCAF_Z, 3.4, 0.08, 4.6, WOOD, { visible: false });

  // Outer guardrails


  // Green safety mesh debris netting

  // Climbable scaffold ladder
  sp("l11-scaf-ladder", {
    tags: ["usable"],
    feetPosition: { x: SCAF_X - 1.5, y: 0.1, z: SCAF_Z + 1.8 },
    primitive: { kind: "box", width: 0.55, height: 4.8, depth: 0.2 },
    material: STEEL_BRUSHED,
    behavior: "scripts/level11-use.js",
    state: { kind: "ladder", name: "Construction Scaffold Ladder", verb: "Climb Scaffolding" },
    children: [
      ...[0.8, 1.6, 2.4, 3.2, 4.0].map((ry) => ({
        feetPosition: { x: 0, y: ry, z: 0 },
        primitive: { kind: "box", width: 0.48, height: 0.04, depth: 0.08 },
        material: STEEL_BRUSHED,
      })),
    ],
  });

  // Street Graffiti on Wall Behind Scaffold
  sp("l11-street-graffiti", {
    feetPosition: { x: SCAF_X + 1.55, y: 1.8, z: SCAF_Z },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 3.8, height: 1.6, depth: 0.02 },
    material: { color: "oklch(0.2 0.01 250)", transparent: true, opacity: 0.0 },
    ui: `<div face="front" width="3.8m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Courier New',monospace;font-weight:900;text-align:center;line-height:1.2">
      <div style="font-size:60px;color:#e74c3c;letter-spacing:4px">THE CITY NEVER SLEEPS</div>
      <div style="font-size:36px;color:#f1c40f">BRC RENOVATIONS · 1974</div>
      <div style="font-size:26px;color:#3498db">DON'T PROVOKE THE HOUNDS</div>
    </div>`,
  });

  // ==========================================
  // 19. SCENE: THE CAPITAL CENTRAL MARKET (Wikidot Image 1)
  // ==========================================
  // "A high density city street jam packed with people and stalls for various foodstuffs."
  // "The Capital is the main residential hub for the entirety of Level 11."
  const MKT_X = -13.8;
  const MKT_Z = 50.5; // moved off the mall front (Shelly: "move that fruit stand somewhere else")

  // Timber market stall frame
  md("l11-market-stall", "market_stall", MKT_X - 0.8, 0.1, MKT_Z, undefined, "box", { rotation: { yaw: 0 }, layout: { box: { min: { x: -6, y: 0, z: -6 }, max: { x: 6, y: 3.3, z: 6 } } } });

  // Sign: B.N.T.G. Provisions Stall
  sp("l11-market-sign", {
    feetPosition: { x: MKT_X + 0.1, y: 2.5, z: MKT_Z },
    rotation: { yaw: -90 },
    primitive: { kind: "box", width: 3.6, height: 0.65, depth: 0.04 },
    material: { color: "#111" },
    ui: `<div face="front" width="3.6m" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a252f;border:2px solid #f39c12;box-sizing:border-box;color:#ffffff;font-family:Georgia,serif;text-align:center">
      <div style="font-size:52px;font-weight:bold;color:#f39c12">B.N.T.G. PROVISIONS & RATIONS</div>
      <div style="font-size:24px;letter-spacing:3px;color:#ecf0f1">CAPITAL CENTRAL MARKET · POST #11</div>
    </div>`,
  });

  // Produce Crate: Free Citizen Food Rations (Noclipping Goods)
  sp("l11-market-produce-crate", {
    tags: ["usable"],
    feetPosition: { x: MKT_X - 0.2, y: 1.05, z: MKT_Z - 1.1 },
    primitive: { kind: "box", width: 0.7, height: 0.35, depth: 0.9 },
    material: WOOD,
    behavior: "scripts/level11-use.js",
    state: { kind: "market-produce", name: "Crate of Capital Apples & Fresh Bread", verb: "Take Free Citizen Ration" },
    children: [
      { feetPosition: { x: -0.15, y: 0.22, z: 0 }, primitive: { kind: "sphere", radius: 0.1 }, material: { color: "#e74c3c", roughness: 0.3 } },
      { feetPosition: { x: 0.15, y: 0.22, z: 0 }, primitive: { kind: "sphere", radius: 0.1 }, material: { color: "#c0392b", roughness: 0.3 } },
      { feetPosition: { x: 0, y: 0.24, z: 0.2 }, primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.09, height: 0.3 }, rotation: { roll: 90 }, material: { color: "#d35400", roughness: 0.9 } },
    ],
  });

  // Pamphlet Display Stand: "A Different Kind of Urban" (Wikidot Lore)
  sp("l11-market-guide", {
    tags: ["usable"],
    feetPosition: { x: MKT_X - 0.2, y: 1.05, z: MKT_Z + 1.1 },
    primitive: { kind: "box", width: 0.35, height: 0.05, depth: 0.45 },
    material: { color: "#2980b9" },
    behavior: "scripts/level11-use.js",
    state: { kind: "capital-guide", name: "'A Different Kind of Urban' Booklet", verb: "Read Capital Guide (1974)" },
    children: [
      { feetPosition: { x: 0, y: 0.04, z: 0 }, primitive: { kind: "box", width: 0.32, height: 0.02, depth: 0.42 }, material: { color: "#ecf0f1" } },
    ],
  });

  // B.N.T.G. Merchant NPC: Trader Kael
  sp("l11-trader-kael", {
    tags: ["npc", "bntg"],
    feetPosition: { x: MKT_X - 1.1, y: 0.1, z: MKT_Z },
    rotation: { yaw: 90 },
    physics: "character",
    ...critterSpec(npcLook("l11-kael", { species: "fox", sex: "m", topw: "vest", top: "#8e44ad", botw: "pants", bottom: "#2c3e50", shoes: "boots" }, "trader", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Trader Kael · B.N.T.G. Merchant",
      role: "merchant",
      voice: "reyes",
      faction: "bntg",
      factionName: "Backrooms Non-Commercial Traders Guild",
      home: { x: MKT_X - 1.1, z: MKT_Z },
      line: "Greetings, citizen! Fresh bread and apples just noclipped into our crates this morning. The Capital always keeps its people fed.",
      ...npcState(ctx, "trader", 100),
    },
  });

  // ==========================================
  // 20. ENTITY 14: LUCKY CRANE (Wikidot Lore Docile Entity)
  // ==========================================
  // "Common creatures, like Facelings and Hounds, are the most numerous entities on Level 11, and rarer ones like Lucky Cranes appear less often."
  // Entity 14 (Lucky Cranes) are gentle origami paper birds that flock to peaceful hubs.
  const CRANE_X = -6.5;
  const CRANE_Z = CANAL_Z + 10.5;

  sp("l11-lucky-crane", {
    tags: ["usable", "pet"],
    feetPosition: { x: CRANE_X, y: 0.35, z: CRANE_Z },
    rotation: { yaw: -45 },
    primitive: { kind: "cylinder", radiusTop: 0.08, radiusBottom: 0.12, height: 0.22 },
    material: { color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35, roughness: 0.8 },
    behavior: "scripts/level11-use.js",
    state: {
      kind: "lucky-crane",
      name: "Entity 14 · Docile Lucky Crane",
      verb: "Pet Paper Crane",
      info: "A sentient origami paper crane resting on the canal wall. Completely docile under the Level 11 Effect.",
    },
    children: [
      // Left Wing
      { feetPosition: { x: -0.16, y: 0.14, z: 0 }, rotation: { roll: 25 }, primitive: { kind: "box", width: 0.26, height: 0.02, depth: 0.16 }, material: { color: "#ffffff", roughness: 0.8 } },
      // Right Wing
      { feetPosition: { x: 0.16, y: 0.14, z: 0 }, rotation: { roll: -25 }, primitive: { kind: "box", width: 0.26, height: 0.02, depth: 0.16 }, material: { color: "#ffffff", roughness: 0.8 } },
      // Slender Origami Neck & Beak
      { feetPosition: { x: 0, y: 0.24, z: -0.1 }, rotation: { pitch: -35 }, primitive: { kind: "cylinder", radiusTop: 0.02, radiusBottom: 0.04, height: 0.2 }, material: { color: "#ffffff", roughness: 0.8 } },
      // Folded Tail
      { feetPosition: { x: 0, y: 0.18, z: 0.12 }, rotation: { pitch: 45 }, primitive: { kind: "cylinder", radiusTop: 0.01, radiusBottom: 0.03, height: 0.16 }, material: { color: "#ffffff", roughness: 0.8 } },
    ],
  });

  // B.N.T.G. North Canal Spillway Pumping Station & Water Lock Valve
  sp("l11-canal-pump", {
    tags: ["usable"],
    feetPosition: { x: 22, y: 0.35, z: CANAL_Z + 10.5 },
    rotation: { yaw: 0 },
    primitive: { kind: "scripted", script: "scripts/props11.js", params: { kind: "cabinet", w: 1.1, h: 1.2, d: 0.8, r: 0.1 } },
    material: { ...T("smooth-cold-poured-concrete-wall", 1), color: "oklch(0.42 0.04 150)", roughness: 0.7 },
    physics: "static",
    behavior: "scripts/level11-use.js",
    state: {
      kind: "canal-pump",
      name: "B.N.T.G. Canal Spillway Valve Station",
      verb: "Operate Spillway Valve",
      info: "Controls water level and Almond Water runoff between the Grand Canal and the B.N.T.G. cargo locks.",
    },
    children: [
      { feetPosition: { x: 0, y: 1.2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.28, radiusBottom: 0.28, height: 0.08 }, rotation: { pitch: 90 }, material: { color: "#c0392b" } },
      { feetPosition: { x: 0, y: 0.7, z: 0.42 }, primitive: { kind: "cylinder", radiusTop: 0.12, radiusBottom: 0.12, height: 0.04 }, rotation: { pitch: 90 }, material: { color: "#f39c12" } },
    ],
  });

  // ==========================================
  // 21. SCENE: ENTERABLE CAPITAL CITIZEN APARTMENT (Wikidot Lore)
  // ==========================================
  // "45,000 people who predominantly live in small apartments."
  // "Appliances are fully operational, which at minimum encompasses lighting, heating, and taps."
  const APT_X = -44.5; // was -27 (Nov 8): the hero house and glass tower now stand on that lot and buried it; this lot is clear, door on the alley
  const APT_Z = 58.0;
  const APT_W = 10.0;
  const APT_D = 8.0;
  const APT_H = 3.6;

  // Real Blender models (art/l11-apartment/build.py): built in world coordinates, so each sits at its own world feet with no turn.
  // Floor top y 0.32, open east doorway at x -39.5 (mesh collider keeps the doorway, the door leaf stands open against the inside north wall).
  const APT_M = {
    shell: "/cdn/value.f4c84c38b5240fd2028d6129595d812d1b5007e4872b9db9b23756e864e461c0.glb", // 8664 tris
    floor: "/cdn/value.530ae8b88219c78fd76bd72a38e08bfd2feaedc34c0ff9b80e3e72d8def289a7.glb", // 12 tris
    stoop: "/cdn/value.fe9768df75103e8dc063cd0cdd2431962754bab5fe4e89b5bf13e11be63a9e4f.glb", // 456 tris
    rail: "/cdn/value.bab60998b05d8ad63dbc5c8a9b42f10e62d61088081f25af8195e327bde0f39b.glb", // 1252 tris
    armchair: "/cdn/value.489be19551f9d119c874b6c82431e8dc8f8cfc2b2e28eeb3bda07604979a5295.glb", // 6384 tris
    table: "/cdn/value.e1941be0f86353a27cd90194795fe9f47c65004f156ea640ab78c2644a8af9a6.glb", // 1812 tris
    radio: "/cdn/value.d956a0d365c6a08548a02b734591e6ac957d50c649ef5ae107692450a2d58678.glb", // 848 tris
    radiator: "/cdn/value.950ca1b89a4aaff1f8c4f9287542eccc7742aaddee4908d127d77cc2cd8564f5.glb", // 6056 tris
    counter: "/cdn/value.301c531760c14fb2d96e9c8ec54af281b24c5c06fc1e4be3c5ba8ad279708de3.glb", // 3028 tris
    sink: "/cdn/value.18a480ae5d52befed00dc4387541120951cbceea53c08a0f8783f3c54bb55b06.glb", // 1228 tris
    bed: "/cdn/value.bbb131df37a157d3a350b610fec1a89a205b93e7532cabfbe2e676b2a98f802f.glb", // 5816 tris
    bookshelf: "/cdn/value.1eb5a4d0d74feb46ccccd20ebf5c2f0ea69a16afd52c50bb36f6566d9513bf46.glb", // 2504 tris
    floorlamp: "/cdn/value.7d76f4495138c0fe29b3eff6b210f8716c98a3efa9f0b877a01352cee0a1255b.glb", // 616 tris
    pendant: "/cdn/value.3d0956944dc04c4e4fc8bcad1c0342ed7cb079d26caa035077a3811de5a1dcd1.glb", // 440 tris
    rug: "/cdn/value.455dde0ca22a985f649dee005f80bad45966342485d248a0fa95d86fb0a2d2c3.glb", // 2208 tris
    picture: "/cdn/value.cd86b7692f547b7047b915e29c7369bd1a0e9da5c6ae2f71710d550c98aa72c8.glb", // 940 tris
  };
  const AP = {
    shell: [-44.4503, -0.05, 58.0],
    floor: [-44.5, 0.0, 58.0],
    stoop: [-38.47, -0.05, 58.0],
    rail: [-38.409, 0.107, 57.06],
    armchair: [-46.9105, 0.32, 58.3],
    table: [-46.9, 0.32, 57.25],
    radio: [-47.0075, 0.972, 57.25],
    radiator: [-44.4235, 0.3, 54.3],
    counter: [-42.5, 0.32, 61.5331],
    sink: [-42.3, 1.014, 61.5784],
    bed: [-48.275, 0.32, 61.27],
    bookshelf: [-49.1625, 0.32, 55.4],
    floorlamp: [-47.65, 0.32, 59.25],
    pendant: [-44.5, 2.82, 58.0],
    rug: [-45.7998, 0.324, 58.0],
    picture: [-47.3, 1.585, 54.172],
  };
  const at = (k, dx = 0, dz = 0) => ({ x: AP[k][0] + dx, y: AP[k][1], z: AP[k][2] + dz });
  const tx = (name, color, more = {}) => ({ texture: `cdn/texture-${name}.png`, wrap: "repeat", repeat: [1, 1], color, ...more });
  const GLOW = (c, i) => ({ color: c, emissive: c, emissiveIntensity: i });
  const AM = {
    brick: tx("grimy-red-brick-wall", "oklch(0.72 0.03 40)", { roughness: 0.95 }),
    plaster: tx("cream-painted-plaster-wall", "oklch(0.96 0.03 90)", { roughness: 0.9 }),
    ceiling: tx("painted-plaster-wall", "oklch(0.93 0.015 90)", { roughness: 0.95 }),
    paint: tx("painted-plaster-wall", "oklch(0.95 0.012 95)", { roughness: 0.6 }),
    concrete: tx("smooth-cold-poured-concrete-wall", "oklch(0.88 0.01 80)", { roughness: 0.95 }),
    stone: tx("water-stained-streaked-old-poured-concrete-column", "oklch(0.9 0.015 80)", { roughness: 0.9 }),
    trim: tx("worn-hardwood-grain", "oklch(0.62 0.07 55)", { roughness: 0.55 }),
    wainscot: tx("worn-hardwood-grain", "oklch(0.58 0.08 50)", { roughness: 0.55 }),
    wood: tx("worn-hardwood-grain", "oklch(0.6 0.08 50)", { roughness: 0.5 }),
    floor: tx("worn-oak-floorboards", "oklch(0.8 0.05 65)", { roughness: 0.6 }),
    brass: tx("brushed-stainless-steel", "oklch(0.78 0.11 80)", { metalness: 1, roughness: 0.35 }),
    steel: tx("brushed-stainless-steel", "oklch(0.95 0 0)", { metalness: 1, roughness: 0.3 }),
    iron: tx("black-wrought-iron", "oklch(0.6 0 0)", { metalness: 0.6, roughness: 0.6 }),
    pipe: tx("rusted-corroded-steel", "oklch(0.75 0.02 50)", { metalness: 0.5, roughness: 0.75 }),
    radpaint: tx("grimy-scratched-steel-plate", "oklch(0.95 0.03 95)", { metalness: 0.4, roughness: 0.55 }),
    rubber: tx("grimy-scratched-steel-plate", "oklch(0.35 0 0)", { roughness: 0.9 }),
    glass: { color: "oklch(0.75 0.03 220)", opacity: 0.32, transparent: true, roughness: 0.05, metalness: 0.2 },
    bulb: GLOW("#ffe2a8", 3.2),
    velvet: tx("green-velvet-upholstery", "oklch(0.75 0.08 150)", { roughness: 0.95 }),
    cloth: tx("burlap-sack-weave", "oklch(0.75 0.05 75)", { roughness: 0.95 }),
    bakelite: tx("worn-hardwood-grain", "oklch(0.35 0.04 45)", { roughness: 0.3 }),
    dial: { ...GLOW("#ffb142", 2.4), emissive: "#ff9f1a" },
    cabinet: tx("painted-plaster-wall", "oklch(0.86 0.06 150)", { roughness: 0.55 }),
    counter: tx("worn-cream-formica-countertop", "oklch(0.97 0.02 90)", { roughness: 0.4 }),
    ceramic: tx("painted-plaster-wall", "oklch(0.97 0.01 90)", { roughness: 0.2 }),
    coffee: { color: "#1c0f06", roughness: 0.08 },
    blanket: tx("red-wool-blanket-weave", "oklch(0.8 0.05 25)", { roughness: 0.95 }),
    linen: tx("worn-canvas-fabric", "oklch(0.97 0.01 90)", { roughness: 0.9 }),
    book_a: tx("worn-canvas-fabric", "oklch(0.45 0.14 28)", { roughness: 0.75 }),
    book_b: tx("worn-canvas-fabric", "oklch(0.45 0.1 150)", { roughness: 0.75 }),
    book_c: tx("worn-canvas-fabric", "oklch(0.4 0.1 260)", { roughness: 0.75 }),
    pages: tx("worn-canvas-fabric", "oklch(0.93 0.03 90)", { roughness: 0.9 }),
    shade: { ...tx("worn-canvas-fabric", "oklch(0.95 0.05 85)"), emissive: "#ffcf80", emissiveIntensity: 0.55, roughness: 0.9 },
    rug: { texture: "cdn/texture-persian-rug-woven-pattern.png", color: "oklch(0.92 0.02 60)", roughness: 0.95 },
    fringe: tx("worn-canvas-fabric", "oklch(0.9 0.03 85)", { roughness: 0.95 }),
  };
  const slots = (...ks) => Object.fromEntries(ks.map((k) => [k, AM[k]]));
  const am = (id, k, sl, collider, extra = {}) =>
    sp(id, { feetPosition: at(k), model: { id: APT_M[k], forward: "-z", materials: slots(...sl) }, ...(collider ? { physics: { body: "static", collider } } : {}), ...extra });
  const USE = (kind, name, verb) => ({ tags: ["usable"], behavior: "scripts/level11-use.js", state: { kind, name, verb } });

  // Shell, floor, stoop and railings
  am("l11-apt-shell", "shell", ["brick", "plaster", "ceiling", "concrete", "stone", "trim", "paint", "wainscot", "brass", "glass", "iron", "bulb", "pipe"], "mesh");
  am("l11-apt-floor", "floor", ["floor"], "box");
  am("l11-apt-stoop", "stoop", ["concrete"], "mesh");
  sp("l11-apt-stoop-rail--1", { feetPosition: at("rail"), model: { id: APT_M.rail, forward: "-z", materials: slots("iron") }, physics: { body: "static", collider: "box" } });
  sp("l11-apt-stoop-rail-1", { feetPosition: at("rail", 0, 1.88), model: { id: APT_M.rail, forward: "-z", materials: slots("iron") }, physics: { body: "static", collider: "box" } });
  // Lived-in furnishings
  am("l11-apt-rug", "rug", ["rug", "fringe"], null);
  am("l11-apt-chair", "armchair", ["wood", "velvet", "brass"], "box");
  am("l11-apt-table", "table", ["wood", "ceramic", "coffee"], "box");
  am("l11-apt-bed", "bed", ["wood", "linen", "blanket"], "box");
  am("l11-apt-bookshelf", "bookshelf", ["wood", "book_a", "book_b", "book_c", "pages"], "box");
  am("l11-apt-floorlamp", "floorlamp", ["brass", "bulb", "shade"], "box");
  am("l11-apt-counter", "counter", ["rubber", "cabinet", "steel", "counter", "wood", "iron", "ceramic"], "mesh");
  am("l11-apt-picture-0", "picture", ["wood", "brass"], null, { model: { id: APT_M.picture, forward: "-z", materials: { ...slots("wood", "brass"), canvas: { texture: "cdn/texture-oil-painting-countryside-landscape.png", roughness: 0.7 } } } });
  sp("l11-apt-picture-1", { feetPosition: { x: -45.6, y: 1.585, z: 61.828 }, rotation: { yaw: 180 }, model: { id: APT_M.picture, forward: "-z", materials: { ...slots("wood", "brass"), canvas: { texture: "cdn/texture-oil-painting-harbor-boats.png", roughness: 0.7 } } } });
  // The three working appliances keep their use contract (scripts/level11-use.js)
  am("l11-apt-radio", "radio", ["wood", "bakelite", "cloth", "brass", "dial"], "box", USE("apt-radio", "Capital Vacuum-Tube Radio", "Tune Radio"));
  am("l11-apt-radiator", "radiator", ["radpaint", "pipe", "brass", "iron"], "box", USE("apt-radiator", "Autonomous Steam Radiator", "Warm Hands at Radiator"));
  am("l11-apt-sink", "sink", ["steel", "rubber", "ceramic"], "box", USE("apt-tap", "Kitchen Tap (Pure Almond Water)", "Drink Municipal Tap Water"));
  // Fabric-shade pendant with its bulb's light
  am("l11-apt-light", "pendant", ["brass", "iron", "bulb", "shade"], null, { light: { kind: "point", color: "oklch(0.92 0.09 75)", intensity: 4.8, distance: 12 } });
}


// ==========================================
// SIDEWALK WALKERS: commuters on routes; each leg is a findPath over the city's colliders (scripts/l61-staff.js waypoint()),
// so they go round hydrants, benches and cars. Laid on their own version so a new walker never rebuilds the city.
// ==========================================
const WALK_V = 2; // 2: NPC looks rerolled (clothes.js NPC_GEN g2)
const W_LOOP = [{ x: -10, z: 24, dwell: 1 }, { x: -10, z: 62, dwell: 1 }, { x: -14, z: 70, dwell: 4, act: "wave" }, { x: -14, z: 30, dwell: 1 }, { x: -10, z: 19 }, { x: -10, z: -12, dwell: 3 }, { x: -14, z: 10 }];
const E_LOOP = [{ x: 10, z: -10, dwell: 1 }, { x: 10, z: 14 }, { x: 10, z: 19 }, { x: 10, z: 55, dwell: 3 }, { x: 14, z: 66, dwell: 2 }, { x: 14, z: 22 }, { x: 14, z: -12, dwell: 2 }];
const CROSS = [{ x: -10, z: -4, dwell: 1 }, { x: -10, z: -21 }, { x: -6, z: -24 }, { x: 6, z: -24 }, { x: 10, z: -20 }, { x: 10, z: 6, dwell: 4 }, { x: 10, z: -21 }, { x: 6, z: -24 }, { x: -6, z: -24 }, { x: -10, z: -20 }];
const WALKERS = [
  { id: "l11-commuter-faceling", seed: "l11-faceling1", look: { species: "faceling", sex: "f", trait: "gentle", topw: "jacket", top: "#2a2a35", botw: "pants", bottom: "#202028", shoes: "boots" }, at: { x: -11.5, z: 24 }, route: W_LOOP, name: "Commuter Faceling", voice: "wren", line: "Pardon me, heading to the commercial plaza before the streetlights turn." },
  { id: "l11-walker-1", seed: "l11-walker-1", look: { species: "human", sex: "m", trait: "perky", topw: "hoodie", top: "#5a3a2a", botw: "jeans", bottom: "#2a3550", shoes: "sneakers" }, at: { x: -10, z: -4 }, route: CROSS, name: "Courier", voice: "reyes", line: "Can't stop, kid. Package for the twelfth floor and the elevator's moody." },
  { id: "l11-walker-2", seed: "l11-walker-2", look: { species: "human", sex: "f", trait: "dreamy", topw: "sweater", top: "#d8c8a8", botw: "pants", bottom: "#3a2a40", shoes: "sneakers" }, at: { x: 10, z: -10 }, route: E_LOOP, name: "Office Temp", voice: "wren", line: "Third week in the city. The coffee cart guy knows my order already. Is that bad?" },
  { id: "l11-walker-3", seed: "l11-walker-3", look: { species: "human", sex: "m", trait: "cynical", topw: "jacket", top: "#3a3a2a", botw: "pants", bottom: "#25252a", shoes: "boots" }, at: { x: 14, z: 40 }, route: [...E_LOOP.slice(3), ...E_LOOP.slice(0, 3)], name: "Night Shift Janitor", voice: "reyes", line: "Every block looks like the last one if you walk it long enough. Keep your map close, wanderer." },
];
function layWalkers(ctx) {
  for (const w of WALKERS) {
    const live = ctx.getObject(w.id);
    if (live) { live.state.job = "route"; live.state.route = w.route; continue; } // keep the body, hand it the route
    ctx.spawn(w.id, {
      tags: ["npc", "l11walker", ...(w.id.includes("faceling") ? ["faceling"] : [])],
      feetPosition: { x: w.at.x, y: 0.35, z: w.at.z },
      physics: "character",
      ...critterSpec(npcLook(w.seed, w.look, "wanderer", 11)),
      behavior: ["scripts/humanoid-locomotion.js", "scripts/l61-staff.js"],
      state: { name: w.name, role: "survivor", voice: w.voice, line: w.line, job: "route", route: w.route, ...npcState(ctx, w.id.includes("faceling") ? "faceling" : "survivor", 90) },
    });
  }
}

const L11_VOICES = {
  "l11-meg-agent-vance": "reyes",
  "l11-trader-kael": "reyes",
  "l11-commuter-faceling": "wren",
  "l11-walker-1": "reyes",
  "l11-walker-2": "wren",
  "l11-walker-3": "reyes",
  "l11-tm-clerk": "wren", // Dee at Thrift Mode
};

// Master tick simulation loop
const mem = { ringAt: 0, adAt: 0, lightAt: 0, lightPhase: 0 };
export function tick(ctx) {
  if (!ctx.place.players?.length) return;
  const st = ctx.place.state, now = ctx.now();
  if ((st.builtV ?? 0) < V && !st.lq) lay(ctx);
  const lq = st.lq;
  if (lq) {
    let q = ctx.session.l11q;
    if (!q || q.v !== V) { lay(ctx); q = ctx.session.l11q; } // a fresh machine (or a new version) rebuilds the list; the cursor carries on
    if (lq.rows || lq.keep) { delete lq.rows; delete lq.keep; } // an older build's list, carried in shared state, is dropped
    if (!q.sorted) { q.rows.sort((a, b) => (a[1].physics && a[1].physics !== "none" ? 0 : 1) - (b[1].physics && b[1].physics !== "none" ? 0 : 1)); q.sorted = true; }
    let i = lq.i ?? 0;
    const end = Math.min(q.rows.length, i + LAY_STEP);
    for (; i < end; i++) {
      const [id, spec] = q.rows[i], old = ctx.place.objects[id];
      if (old && (!!old.model !== !!spec.model || (old.model && spec.model?.id && (old.model.id ?? old.model) !== spec.model.id) || !!old.primitive !== !!spec.primitive || (old.primitive && spec.primitive && (old.primitive.kind !== spec.primitive.kind || old.primitive.script !== spec.primitive.script)) || (!spec.children && ctx.place.objects[id + "/child-0"]) || (spec.tags && !old.tags?.includes("wreck") && spec.tags.join() !== (old.tags ?? []).join()) || (spec.physics?.collider && old.physics?.collider && spec.physics.collider !== old.physics.collider) || (spec.feetPosition && old.feetPosition && !old.tags?.includes("wreck") && old.physics?.body !== "dynamic" && !old.behavior?.length && Math.hypot((spec.feetPosition.x ?? 0) - old.feetPosition.x, (spec.feetPosition.z ?? 0) - old.feetPosition.z) > 0.3))) { ctx.destroy(id); break; } // a box row turned model: clear it, lay it fresh next tick
      ctx.spawn(id, spec);
      const now2 = old && ctx.place.objects[id]; // a piece that already stood takes its new place, turn and size too
      if (now2) { if (spec.feetPosition) now2.feetPosition = spec.feetPosition; if (spec.rotation !== undefined) now2.rotation = spec.rotation; if (spec.scale !== undefined) now2.scale = spec.scale; }
    }
    lq.i = i;
    if (i >= q.rows.length) {
      for (const w of WALKERS) q.keep[w.id] = true;
      let n = 0;
      for (const id of Object.keys(ctx.place.objects ?? {})) if (/^l11-/.test(id) && !id.includes("/") && !q.keep[id] && n++ < 120) ctx.destroy(id);
      if (n <= 120) { delete st.lq; delete ctx.session.l11q; st.builtV = V; st.walkV = 0; }
    }
    return;
  }
  if ((st.walkV ?? 0) < WALK_V) { st.walkV = WALK_V; layWalkers(ctx); }
  if (!mem.ringAt) mem.ringAt = now + 35000;
  tickCity(ctx, mem, heard);
  tickChatter(ctx, CHATTER.level11, L11_VOICES);

  // Dynamic traffic light controller cycling green -> amber -> red
  if (!mem.lightAt || now > mem.lightAt) {
    mem.lightPhase = ((mem.lightPhase ?? 2) + 1) % 3;
    // 0: Green (22s), 1: Amber (4s), 2: Red (22s)
    mem.lightAt = now + (mem.lightPhase === 1 ? 4000 : 22000);
    ctx.place.state.l11Light = mem.lightPhase; // the moving cars read this to stop

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
          ? `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ffffff;font-family:Arial,sans-serif;font-weight:900;font-size:90px;text-align:center">WALK</div>`
          : `<div face="front" width="0.35m" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0a0a;border:2px solid #333;color:#ff4400;font-family:Arial,sans-serif;font-weight:900;font-size:90px;text-align:center">WAIT</div>`;
      }
    });

    if (isGreen) {
      heard(ctx, {
        clip: "cdn/sfx-soft-bright-two-note-success-chime.mp3",
        position: { x: 0, y: 3.2, z: 12 },
        volume: 0.65,
        maxDistance: 45,
      });
    }
  }

  // Periodic distant phone ring
  if (now > mem.ringAt) {
    mem.ringAt = now + 45000 + ctx.random() * 30000;
    const phone = ctx.getObject("l11-payphone");
    if (phone) heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-old-payphone-mechanical-bell-ringing-loop.mp3", position: phone.feetPosition, volume: 0.75, maxDistance: 32 });
  }
}
