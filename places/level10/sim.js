import { sweepProps } from "../../scripts/lib/breakables.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
// Level 10 "Bumper Crop": Historic Backrooms farmland and M.E.G. Outpost Bountiful.
// Canonical Wikidot features:
//  - M.E.G. Outpost "Bountiful" Pioneer Farmhouse with wrap-around porch, radio, Cooper & Maeve
//  - Octagonal wooden windmill with rotating sails and working stone rotary quern
//  - Corrugated metal grain silo with exterior access ladder and discharge hopper
//  - Traditional stone water well tapping into pure cold Almond Water aquifer
//  - Slanted timber storm cellar / root cellar with emergency canned supplies
//  - Anomalous scarecrows (Entity 17 / The Watchers) in wheat and barley plots
//  - Harvestable golden wheat patches, flour milling, and hearth bread baking
//  - Split-rail rustic cedar fences framing the road and farmyard
//  - Entrances & Exits: roads to Level 11, lake deep to Level 7
import { critterSpec } from "../../scripts/lib/critter-model.js";
import { npcLook } from "../../scripts/lib/clothes.js";
import { npcState } from "../../scripts/lib/stats.js";
import { tickChatter, CHATTER } from "../../scripts/lib/chatter.js";

export const cadence = "1s";
const V = 21;
const DOCK_Y = 0.2; // deck starts at the measured west-bank landing
const CEDAR = { texture: "cdn/texture-worn-hardwood-grain.png", color: "#776049", roughness: 0.92 };
const spot = ({ x, y, z }) => ({ x, y, z });
const BRK = (mat, hp) => ({ mat, hp, maxHp: hp });
const T = (x, z, up = 0) => ({ x, z, y: { terrain: up } });
const BARN = (w, d, h, ridge, wall, door) => ({ primitive: { kind: "scripted", script: "scripts/barn10.js", params: { w, d, h, ridge, wall, door } }, physics: "static" });
const DOOR = (to, w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false, physics: { body: "static", trigger: true }, behavior: "scripts/level-door.js", state: { to } });
const tree = (kind, h, seed) => ({ primitive: { kind: "scripted", script: "scripts/tree10.js", params: { kind, h }, seed }, material: { alphaTest: 0.5 }, physics: "static", visibleRange: { max: kind === "hedge" ? 160 : 280 }, castShadow: kind !== "hedge" });
const AMB = "cdn/ambience-wind-through-ripe-wheat-field-overcast-countryside-distant-crows-loop.mp3";
const WIND_CREAK = "cdn/moodboard-realistic-gritty/sfx-wood-creak-heavy-timber-settling.mp3";

function lay(ctx) {
  const BIG = /farmhouse|barn|stable|shed|silo$|windmill|tree|hedge|scarecrow|fence|flagpole|sign-city|outpost-sign/;
  const SMALL = /stone|log|stump|lamp|radio|hopper|crate|flag$|patch|oven|well|bin|fire$|sign-post|cellar/;
  const sp = (id, spec) => {
    const old = ctx.getObject(id);
    if (old && spec.tags?.includes("npc")) {
      old.state.home = spec.state.home;
      old.state.rounds = spec.state.rounds;
      old.state.ri = 0;
      if (!old.state.dead && !old.state.follow) old.feetPosition = spec.feetPosition;
      return;
    }
    if (old && spec.tags?.includes("container")) {
      for (const key of ["items", "hp", "scavved", "refillAt"]) if (old.state[key] !== undefined) spec.state[key] = old.state[key];
    }
    if (old) ctx.destroy(id);
    const drawn = spec.primitive || spec.model;
    if (drawn && !spec.scatter && !spec.visibleRange && !/npc/.test(String(spec.tags))) spec.visibleRange = { max: BIG.test(id) ? 320 : 110 };
    if (drawn && SMALL.test(id) && spec.castShadow === undefined) spec.castShadow = false;
    if (spec.light) {
      if (spec.light.shadow === undefined) spec.light.shadow = { enabled: false };
      if (!spec.light.visibleRange) spec.light.visibleRange = { max: Math.min(45, (spec.light.distance ?? 10) * 2.5) };
    }
    ctx.spawn(id, spec);
  };

  // ==========================================
  // 1. ARRIVALS AND LEVEL EXITS
  // ==========================================
  sp("l10-from-l11", { feetPosition: T(0, 30, 0.2), rotation: { yaw: 0 } });
  sp("l10-road-north", { ...DOOR("level11#lv10-arrive", 8, 4, 2), feetPosition: T(0, -282, 0) });
  sp("l10-road-south", { ...DOOR("level11#lv10-arrive", 8, 4, 2), feetPosition: T(0, 72, 0) });
  sp("l10-lake-deep", { ...DOOR("level7#l7-from-l10", 5, 1.2, 5), feetPosition: { x: 70, y: -3.9, z: -95 } });
  // what draws you down: the lake's deepest point is a dark hole in the bed, a cold column of bubbles rising out of it, the water above it a shade darker
  sp("l10-lake-hole", { feetPosition: { x: 70, y: -3.9, z: -95 }, primitive: { kind: "circle", radius: 3.4, segments: 40 }, rotation: { pitch: -90 }, material: { color: "oklch(0.06 0.01 230)", roughness: 1 } });
  sp("l10-lake-hole-rim", { feetPosition: { x: 70, y: -3.89, z: -95 }, primitive: { kind: "ring", innerRadius: 3.2, outerRadius: 5, thetaSegments: 40 }, rotation: { pitch: -90 }, material: { color: "oklch(0.2 0.025 70)", roughness: 1, transparent: true, opacity: 0.85 } });
  sp("l10-lake-bubbles", { feetPosition: { x: 70, y: -3.85, z: -95 }, visibleRange: { max: 60 }, fx: { script: `fx
pop bub rate=?mobile:8|16 on=disc(2.6) life=1.6..2.6 v=up(.8..1.4) size=.02..0.06 acc=curl(.4)*.3 col=<.8,.9,1> a=.7>.5:.7>0 sz=$size r=sprite(soft-disc,add)
pop silt rate=3 on=disc(3) life=3..5 v=up(.1..0.25) size=.3..0.6 acc=curl(.2)*.2 col=<.2,.22,.2> a=0>.25:.2>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)` } });
  sp("l10-lake-hum", { feetPosition: { x: 70, y: -3, z: -95 }, audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-deep-underwater-low-drone-with-faint-bubbles-loop.mp3", gain: 0.35, loop: true, spatial: true, maxDistance: 14, bus: "Ambience" } });
  const board = (id, x, z, yaw, title, line, width = 1.65) => {
    sp(id, { feetPosition: T(x, z, 1.47), rotation: { yaw }, castShadow: false,
      visibleRange: { max: 100 }, vector: `<svg viewBox='0 0 240 84' width='${width}m'><rect x='2' y='2' width='236' height='80' rx='3' fill='#594531' stroke='#aa9270' stroke-width='4'/><rect x='9' y='9' width='222' height='66' rx='2' fill='#dfd4ae'/><g fill='#352e23' font-family='serif' text-anchor='middle'><text x='120' y='37' font-size='21' font-weight='bold'>${title}</text><text x='120' y='60' font-size='15'>${line}</text></g></svg>`,
      children: [{ feetPosition: { x: 0, y: -1.57, z: 0.045 }, primitive: { kind: "box", width: 0.12, height: 1.39, depth: 0.13 }, material: CEDAR }] });
  };
  board("l10-sign-city", 4.3, -271, 180, "CITY ROAD", "LEVEL 11 · STRAIGHT ON");
  board("l10-sign-city-south", -3.6, 64, 0, "CITY ROAD", "LEVEL 11 · STRAIGHT ON");
  board("l10-outpost-sign", -3.5, -36.7, 180, "OUTPOST BOUNTIFUL", "← FARMYARD     EAST FIELDS →", 2.5);
  board("l10-sign-lake-fork", 3.65, -74.3, 180, "WEST BANK", "FISHING LANDING →");
  board("l10-sign-mill-yard", -39.2, -44.0, -90, "GRAIN YARD", "BARN ←     MILL →");
  board("l10-sign-shore", 39.0, -96.9, 90, "FISHING LANDING", "DEEP WATER BEYOND THE PILES");

  // ==========================================
  // 2. M.E.G. OUTPOST BOUNTIFUL FARMHOUSE
  // ==========================================
  sp("l10-farmhouse", {
    feetPosition: T(-24, -38, 0),
    rotation: { yaw: 0 },
    primitive: { kind: "scripted", script: "scripts/farmhouse10.js" },
    physics: "static",
  });

  // Farmhouse Porch Lantern
  sp("l10-porch-lamp", {
    feetPosition: T(-24, -44.65, 2.89),
    model: { id: "/cdn/value.e35d991141e696f8e60fa7772fc3debae53a38c2a91f75de29e919f908388284.glb" }, layout: { box: { min: { x: -0.13, y: 0, z: -0.13 }, max: { x: 0.13, y: 0.36, z: 0.13 } } },
    light: { kind: "point", color: "oklch(0.9 0.16 75)", intensity: 3.2, distance: 9 },
    children: [{ feetPosition: { x: 0, y: 0.35, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.015, radiusBottom: 0.015, height: 0.12 }, material: { color: "#514a3c", metalness: 0.7 } }],
  });

  // The radio faces the walkway from a worktable tucked against the house.
  sp("l10-radio-desk", { feetPosition: T(-28.65, -42.87, 0.45),
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "radio-desk" } }, physics: "static" });
  sp("l10-outpost-radio", {
    tags: ["usable"],
    feetPosition: T(-28.65, -42.87, 1.23),
    rotation: { yaw: 180 },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "radio" } },
    behavior: "scripts/level10-use.js",
    state: { kind: "outpost-radio", name: "M.E.G. Agrarian Shortwave Radio", verb: "Tune Radio" },
  });

  // Outpost Hearth Baking Oven
  sp("l10-hearth-oven", {
    tags: ["usable"],
    feetPosition: T(-17.3, -51.6),
    rotation: { yaw: 180 },
    model: { id: "/cdn/value.ae96850bb4b70e7545b3dfd206b6998a199b1d508ad96ca6599ea14f25b3fcd6.glb" }, layout: { box: { min: { x: -0.85, y: 0, z: -0.85 }, max: { x: 0.85, y: 1.7, z: 0.85 } } }, physics: { body: "static", collider: "box" }, // Tripo brick oven (Shelly: use tripo)
    light: { kind: "point", color: "oklch(0.88 0.18 55)", intensity: 2.2, distance: 6 },
    behavior: "scripts/level10-use.js",
    state: { kind: "hearth-oven", name: "Outpost Hearth Oven", verb: "Bake Homestead Bread" },
  });

  // Stone Water Well (Aquifer Pump)
  sp("l10-farm-well", {
    tags: ["usable"],
    feetPosition: T(-11.7, -36.2),
    rotation: { yaw: 45 },
    primitive: { kind: "scripted", script: "scripts/well10.js" },
    physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "farm-well", name: "Limestone Aquifer Well", verb: "Draw Almond Water" },
  });

  // Underground Storm Cellar / Root Cellar
  sp("l10-storm-cellar", {
    tags: ["usable"],
    feetPosition: T(-34, -54, 0),
    rotation: { yaw: 0 },
    primitive: { kind: "scripted", script: "scripts/cellar10.js" },
    physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "storm-cellar", name: "Farm Storm Cellar", verb: "Open Root Cellar" },
  });

  // ==========================================
  // 3. HISTORIC WOODEN WINDMILL & STONE QUERN
  // ==========================================
  sp("l10-windmill", {
    feetPosition: T(-55, -35, 0),
    rotation: { yaw: 0 },
    primitive: { kind: "scripted", script: "scripts/windmill10.js" },
    physics: "static",
    audio: { clip: WIND_CREAK, gain: 0.25, loop: true, spatial: true, maxDistance: 28 },
  });

  sp("l10-windmill-quern", {
    tags: ["usable"],
    feetPosition: T(-52.8, -39.7, 0),
    model: { id: "/cdn/value.b694bae83206a1a1d3452d6de15bf2c65e839432920cda393a3c8357e473a908.glb" }, layout: { box: { min: { x: -0.75, y: 0, z: -0.75 }, max: { x: 0.75, y: 0.8, z: 0.75 } } },
    behavior: "scripts/level10-use.js",
    state: { kind: "windmill-quern", name: "Windmill Stone Rotary Quern", verb: "Grind Flour" },
  });

  // ==========================================
  // 4. GALVANIZED STEEL GRAIN SILO
  // ==========================================
  sp("l10-silo", {
    feetPosition: T(-42, -22, 0),
    rotation: { yaw: 180 },
    primitive: { kind: "scripted", script: "scripts/silo10.js" },
    physics: "static",
  });

  sp("l10-silo-hopper", {
    tags: ["usable"],
    feetPosition: T(-42, -17.9),
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "hopper" } }, physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "silo-hopper", name: "Grain Discharge Chute", verb: "Inspect Grain Reserves" },
  });

  // ==========================================
  // 5. SPLIT-RAIL WOODEN FENCES
  // ==========================================
  const fence = (id, x, z, yaw, len) => sp(id, {
    feetPosition: T(x, z, -0.08), rotation: { yaw },
    primitive: { kind: "scripted", script: "scripts/fence10.js", params: { len, rails: 2 } }, physics: "static",
  });
  fence("l10-fence-road-1", -6, -20, 90, 15);
  fence("l10-fence-road-2", -6, -45, 90, 13);
  fence("l10-fence-yard-west", -61, -36, 90, 22);

  // ==========================================
  // 6. HARVESTABLE GOLDEN WHEAT PATCHES
  // ==========================================
  const wheatPatch = (id, x, z) => sp(id, {
    tags: ["usable", "wheat-patch"],
    feetPosition: T(x, z, 0),
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "sheaves" } }, physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "wheat-patch", name: "Ripe Golden Wheat Patch", verb: "Reap Wheat Sheaf" },
  });
  wheatPatch("l10-wheat-patch-1", -9.0, -25.5);
  wheatPatch("l10-wheat-patch-2", 15.5, -46.5);
  wheatPatch("l10-wheat-patch-3", 10, -110);

  // ==========================================
  // 7. ANOMALOUS SCARECROWS (ENTITY 17 / THE WATCHERS)
  // ==========================================
  // Eastern barley plot (carries Document #24)
  sp("l10-scarecrow-east", {
    tags: ["usable", "scarecrow"],
    feetPosition: T(66, -52.1),
    rotation: { yaw: -70 },
    primitive: { kind: "scripted", script: "scripts/scarecrow10.js" },
    physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "scarecrow", name: "Anomalous Scarecrow (Watcher)", verb: "Inspect Coat" },
  });

  // Northern wheat plot
  sp("l10-scarecrow-north", {
    tags: ["usable", "scarecrow"],
    feetPosition: T(25, -170, 0),
    rotation: { yaw: 180 },
    primitive: { kind: "scripted", script: "scripts/scarecrow10.js" },
    physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "scarecrow", name: "Solitary Field Scarecrow", verb: "Inspect Figure" },
  });

  // Western field plot
  sp("l10-scarecrow-west", {
    tags: ["usable", "scarecrow"],
    feetPosition: T(-85, -110, 0),
    rotation: { yaw: 45 },
    primitive: { kind: "scripted", script: "scripts/scarecrow10.js" },
    physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "scarecrow", name: "Torn Weathered Scarecrow", verb: "Inspect Figure" },
  });

  // ==========================================
  // 8. M.E.G. OUTPOST BOUNTIFUL NPCS
  // ==========================================
  const ROUNDS_COOPER = [
    { ...T(-22.5, -47.2), dwell: 35, look: T(-8, -41) },
    { ...T(-24.0, -44.35, 0.45), dwell: 22, look: T(-24, -46.4) },
    { ...T(-16.4, -49.6), dwell: 24, look: T(-17.3, -51.6) },
  ];
  const ROUNDS_MAEVE = [
    { ...T(-9.9, -28.0), dwell: 28, act: "cdn/clip-crouch-idle-loop.glb", look: T(-9, -25.5) },
    { ...T(-12.65, -37.5), dwell: 18, look: T(-11.7, -36.2) },
    { ...T(-26, -44.2, 0.45), dwell: 25, look: T(-24, -46.4) },
  ];
  const ROUNDS_HALE = [
    { ...T(-41.4, -45.0), dwell: 24, look: T(-48, -48.2) },
    { ...T(-48.2, -48.7), dwell: 20, look: T(-53.5, -48.5) },
    { ...T(-37.8, -48.9), dwell: 22, look: T(-34, -54) },
  ];
  const ROUNDS_WREN = [
    { ...T(-8.0, -38.0), dwell: 25, look: T(2, -40) },
    { ...T(-9.95, -24.1), dwell: 20, act: "cdn/clip-crouch-idle-loop.glb", look: T(-9, -25.5) },
    { ...T(-15.0, -34.2), dwell: 20, look: T(-11.7, -36.2) },
  ];
  const ROUNDS_SULLY = [
    { ...T(-28.65, -43.77, 0.45), dwell: 42, look: T(-28.65, -42.87, 1.23) },
    { ...T(-27.3, -44.2, 0.45), dwell: 20, look: T(-24, -46.4) },
  ];

  // Homesteader Cooper (Head Agrarian Coordinator)
  sp("l10-meg-cooper", {
    tags: ["npc", "meg"],
    feetPosition: spot(ROUNDS_COOPER[0]),
    rotation: { yaw: 180 },
    physics: "character",
    ...critterSpec(npcLook("l10-cooper", { species: "dog", sex: "m", topw: "vest", top: "#8a5a3a", botw: "pants", bottom: "#3a3a30", shoes: "boots", hat: "beret" }, "guard", 12)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Homesteader Cooper · M.E.G. Outpost Bountiful",
      role: "guard",
      voice: "reyes",
      faction: "meg",
      factionName: "M.E.G. Outpost Bountiful",
      home: { x: ROUNDS_COOPER[0].x, z: ROUNDS_COOPER[0].z },
      rounds: ROUNDS_COOPER,
      ri: 0,
      line: "Welcome to Outpost Bountiful, wanderer! Fresh bread is in the oven and the wheat is ripe.",
      ...npcState(ctx, "agent", 120),
    },
  });

  // Dr. Maeve (M.E.G. Research Wing / Agronomist)
  sp("l10-meg-maeve", {
    tags: ["npc", "meg"],
    feetPosition: spot(ROUNDS_MAEVE[0]),
    rotation: { yaw: 180 },
    physics: "character",
    ...critterSpec(npcLook("l10-maeve", { species: "cat", sex: "f", topw: "jacket", top: "#4a6a5a", botw: "pants", bottom: "#2c3e50", shoes: "boots" }, "medic", 11)),
    behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: {
      name: "Dr. Maeve · M.E.G. Agronomy Officer",
      role: "medic",
      voice: "elena",
      faction: "meg",
      factionName: "M.E.G. Outpost Bountiful",
      home: { x: ROUNDS_MAEVE[0].x, z: ROUNDS_MAEVE[0].z },
      rounds: ROUNDS_MAEVE,
      ri: 0,
      line: "Keep your compass steady in the fields. The scarecrows aren't hostile, but they certainly aren't ordinary.",
      ...npcState(ctx, "agent", 100),
    },
  });

  // the rest of the outpost's people: who keeps the stores, who works the rows, who keeps the radio
  const MEG = (id, at, yaw, look, role, hp, name, voice, line, rounds) => sp(id, { tags: ["npc", "meg"], feetPosition: spot(at), rotation: { yaw }, physics: "character",
    ...critterSpec(npcLook(id.replace("l10-meg-", "l10-"), look, role, hp)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name, role, voice, faction: "meg", factionName: "M.E.G. Outpost Bountiful", home: { x: at.x, z: at.z }, ...(rounds ? { rounds, ri: 0 } : {}), line, ...npcState(ctx, "agent", hp * 10) } });
  MEG("l10-meg-hale", ROUNDS_HALE[0], 65, { species: "bear", sex: "m", topw: "shirt", top: "#6b6a4a", botw: "pants", bottom: "#3b3226", shoes: "boots" }, "quarter", 12,
    "Quartermaster Hale · M.E.G. Outpost Bountiful", "hollis", "Everything that leaves this farm gets weighed. Everything.", ROUNDS_HALE);
  MEG("l10-meg-wren", ROUNDS_WREN[0], -90, { species: "rabbit", sex: "f", topw: "tank", top: "#c9a86a", botw: "overalls", bottom: "#41587a", shoes: "boots", hat: "cap" }, "scout", 9,
    "Wren · Outpost Farmhand", "mags", "Mind your boots in the rows. And don't dig past your ankles.", ROUNDS_WREN);
  MEG("l10-meg-sully", ROUNDS_SULLY[0], 180, { species: "raccoon", sex: "m", topw: "jacket", top: "#4a5240", botw: "pants", bottom: "#2a2a26", shoes: "boots", hat: "beanie" }, "default", 10,
    "Sully · Outpost Radio Operator", "reyes", "Bountiful to Alpha, still green out here. Over.", ROUNDS_SULLY);
  // the cookfire the outpost eats around: a stone ring, split logs, stumps to sit on
  const fire = T(-12.2, -50.7);
  sp("l10-firepit", { feetPosition: T(fire.x, fire.z), model: { id: "/cdn/value.75612d7c3340148377c006bc20318da6eb31ab37fafe9a70b189ac413d1fa87e.glb" }, layout: { box: { min: { x: -0.95, y: 0, z: -0.95 }, max: { x: 0.95, y: 0.5, z: 0.95 } } }, physics: { body: "static", collider: "cylinder" } }); // Tripo stone ring with logs
  [[1.9, 0.4], [-1.6, 1.1], [0.3, -2]].forEach(([dx, dz], i) => sp(`l10-fire-stump-${i}`, { tags: ["seat"], feetPosition: T(fire.x + dx, fire.z + dz), rotation: { yaw: i * 110 }, model: { id: "/cdn/value.faf38ade6590b20ecc867e6aab0a951600de1e16f38674f972858a1c6cf44b62.glb" }, layout: { box: { min: { x: -0.38, y: 0, z: -0.38 }, max: { x: 0.38, y: 0.42, z: 0.38 } } }, physics: { body: "static", collider: "box" }, visibleRange: { max: 80 } }));
  sp("l10-fire", { feetPosition: T(fire.x, fire.z, 0.08), fx: { script: `fx
pop flame rate=flick(.45,.2)*50 on=disc(.25) life=.5..0.9 v=up(1.4)+cone(22)*(.3..0.8) size=.2..0.38 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5) sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=4 on=disc(.25) life=.7..1.4 v=up(2.2)+cone(30)*(.4..1.2) size=.02..0.05 acc=curl(.8)+grav()*.45+drag(.5) col=hdr(5,2.8,.8)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.2 inh=p;v:$v*.4 life=2..3.2 size=.18..0.3 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.25:.3>.7:.2>0 r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.2).c(.45) glo=fire()*(#flame/35)~ r=light(<1,.55,.24>,$glo*22,10)` },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-campfire-wood-crackling-popping-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
  // the M.E.G. flag over the yard
  const fl = T(-20, -33, 0);
  sp("l10-flagpole", { feetPosition: fl, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.06, height: 7, radialSegments: 8 }, material: { color: "oklch(0.7 0.01 250)", metalness: 0.7, roughness: 0.4 }, physics: "static" });
  sp("l10-flag", { feetPosition: T(fl.x + 0.8, fl.z, 6.27), primitive: { kind: "plane", width: 1.6, height: 0.95, widthSegments: 8 }, material: { color: "oklch(0.32 0.06 250)", side: "double", roughness: 0.9 }, castShadow: false,
    vector: "<svg viewBox='0 0 160 95' width='1.6m'><rect width='160' height='95' fill='#1f2c45'/><circle cx='80' cy='44' r='26' fill='none' stroke='#e8dcb0' stroke-width='4'/><text x='80' y='53' font-family='sans-serif' font-size='24' font-weight='700' text-anchor='middle' fill='#e8dcb0'>MEG</text><text x='80' y='88' font-family='sans-serif' font-size='10' text-anchor='middle' fill='#e8dcb0'>OUTPOST BOUNTIFUL</text></svg>" });

  // ==========================================
  // 9. THE BIG BRICK BARN, STABLE & SHEDS
  // ==========================================
  sp("l10-barn", { ...BARN(18, 9, 4.6, 8.4, "brick", 4.2), feetPosition: T(-48, -55, 0), rotation: { yaw: 180 } });
  sp("l10-stable", { ...BARN(12, 7, 3.4, 5.8, "brick", 3), feetPosition: T(-58, -105, 0), rotation: { yaw: 90 } });
  // the wiki's lost family (Level 10 diary): they made the stable home. Mum's new doorstep at its door, the porridge that burnt the night they fell, the dog's bowl by the bedrolls, and the wood and nails they pulled off the sheds.
  const FAM = (id, model, x, z, box, yaw, name, verb, extra = {}) => sp(id, { tags: ["l10-family"], feetPosition: T(x, z, 0.01), rotation: { yaw, ...(extra.rot ?? {}) }, model: { id: model }, layout: { box }, physics: { body: "static", collider: "box" }, castShadow: true, state: { kind: "family-prop", name, verb } });
  FAM("l10-fam-step", "/cdn/value.a97a6c8edbdb8ff2364e17f3ed377a0c688979bdafa117c6a6a19465752647fb.glb", -64.3, -105, { min: { x: -0.7, y: 0, z: -0.09 }, max: { x: 0.7, y: 1.3, z: 0.09 } }, 90, "New wooden doorstep", "Look at the doorstep", { rot: { pitch: -90 } });
  FAM("l10-fam-pot", "/cdn/value.339b38141be827875efe734cae68c9300fb75cab6f741d60843a1662d9dd0008.glb", -55.6, -108.2, { min: { x: -0.42, y: 0, z: -0.42 }, max: { x: 0.42, y: 0.85, z: 0.42 } }, 200, "Pot of burnt porridge", "Look in the pot");
  FAM("l10-fam-beds", "/cdn/value.9857d12fb35a7c58b0ae1e2699770ac30cd38728ac32c6d0dc4fad2df28320e7.glb", -53.8, -104.2, { min: { x: -1, y: 0, z: -0.75 }, max: { x: 1, y: 0.55, z: 0.75 } }, 90, "Bedrolls and a dog bowl", "Look at the bedrolls");
  FAM("l10-fam-barrow", "/cdn/value.72c3387ca214e4fa6edfe4fb2605b6bf8f02c22f5da2bf546cdbbc167eb77ca8.glb", -56, -100.6, { min: { x: -0.8, y: 0, z: -0.45 }, max: { x: 0.8, y: 0.85, z: 0.45 } }, 160, "Barrow of salvaged planks", "Search the barrow");
  sp("l10-shed-a", { ...BARN(5, 4, 2.6, 3.9, "plank", 1.8), feetPosition: T(36, -150, 0), rotation: { yaw: -20 } });
  sp("l10-shed-b", { ...BARN(4.5, 3.6, 2.5, 3.6, "plank", 1.6), feetPosition: T(95, -60, 0), rotation: { yaw: 200 } });

  // Supply crates & Tool chests
  const crate = (id, x, z, name, items, yaw = 0, position = T(x, z, 0.012)) => sp(id, {
    tags: ["container", "breakable"], feetPosition: position, rotation: { yaw },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "crate" }, seed: x * 31 + z },
    physics: "static",
    state: { name, items, ...BRK("wood", 40) },
  });
  crate("l10-barn-bin", -54, -57, "Grain feed bin", "wheat_sheaf,wheat_sheaf,ration,almond", 10);
  crate("l10-barn-chest", -42, -52, "Agrarian tool chest", "weapon:crowbar,tape,battery,bobbypin", -8);
  crate("l10-stable-bin", -58, -103, "Tack box", "bandage,ration,cloth:topw:jacket:5a4630", 90);
  crate("l10-shed-a-box", 36, -150, "Nail box", "wire,tape,bobbypin", 0);
  crate("l10-cellar-chest", -31.7, -55.5, "Cellar reserve cache", "ration,ration,battery,almond", 0);
  crate("l10-lake-tackle", 42.5, -94.23, "Weathered Lakeside Tackle Box", "weapon:fishing_rod,wire,bobbypin,almond", 0, { x: 42.5, y: DOCK_Y + 0.14, z: -94.23 });

  sp("l10-dock-planks", {
    feetPosition: { x: 45.35, y: DOCK_Y, z: -95 },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "dock" } },
    physics: "static", visibleRange: { max: 140 },
  });

  // Lurking entity inside the distant abandoned Shed B
  sp("l10-shed-stealer", {
    tags: ["stealer"],
    feetPosition: T(95, -60, 0.05),
    physics: { body: "character" },
    primitive: { kind: "scripted", script: "scripts/stealer-geo.js", params: { revealed: false } },
    state: npcState(ctx, "stealer", 90, { xp: 45 }),
  });

  // Hay bales stacked near the barn entrance
  const bale = (id, x, y, z, yaw) => sp(id, {
    tags: ["breakable"], feetPosition: { x, y: { terrain: y }, z }, rotation: { yaw },
    model: { id: "/cdn/value.b604eba14800316ce63cb9fe06ad6449a0b7d192f5f1e963cf3a225ebdf6f0e9.glb" }, layout: { box: { min: { x: -0.6, y: 0, z: -0.75 }, max: { x: 0.6, y: 1.5, z: 0.75 } } },
    physics: { body: "static", collider: "box" },
    state: { name: "Hay bale", ...BRK("cloth", 30) },
  });
  bale("l10-bale-0", -53.6, 0, -48.6, 14);
  bale("l10-bale-1", -55.1, 0, -48.5, 24);
  bale("l10-bale-2", -44.5, 0, -49.25, -12);

  // ==========================================
  // 10. HEDGEROWS, REEDS & CANOLA
  // ==========================================
  // Leave the tracks, farmyard and water open between field boundaries.
  const rows = [];
  const spans = (from, to, cuts) => {
    const out = [];
    for (const [lo, hi] of cuts) {
      if (lo - from > 6) out.push([from, lo]);
      from = hi;
    }
    if (to - from > 6) out.push([from, to]);
    return out;
  };
  for (const [x, cuts] of [
    [-120, [[-128, -112]]], [-40, [[-126, -110], [-66, -14]]],
    [40, [[-159, -141], [-105, -85], [-50, -34]]], [120, [[-49, -31]]],
  ]) for (const [z0, z1] of spans(-290, 70, cuts)) rows.push({ cx: x, cz: (z0 + z1) / 2, w: 4, d: z1 - z0 });
  for (const [z, cuts] of [
    [-270, [[-9, 9]]], [-210, [[-7, 12]]], [-150, [[-13, 8], [27, 45]]],
    [-90, [[-12, 7], [25, 104]]], [-30, [[-72, 10]]], [30, [[-9, 9]]],
  ]) for (const [x0, x1] of spans(-160, 160, cuts)) rows.push({ cx: (x0 + x1) / 2, cz: z, w: x1 - x0, d: 4 });
  rows.forEach((r, i) => sp(`l10-hedge-${i}`, {
    feetPosition: T(r.cx, r.cz),
    scatter: {
      bounds: { shape: "rectangle", width: r.w, depth: r.d },
      count: Math.round(Math.max(r.w, r.d) / 9),
      seed: 30 + i,
      variation: { scale: [0.8, 1.25], yaw: [0, 360] },
      templates: [{ weight: 3, ...tree("hedge", 4, 1) }, { weight: 2, ...tree("oak", 12, 2) }, { weight: 1, ...tree("ash", 14, 3) }],
    },
  }));

  // Reeds collect in patches around the bank; the fishing landing stays open.
  if (ctx.getObject("l10-reeds")) ctx.destroy("l10-reeds");
  [[44.6, -104.4], [48.5, -112], [62, -120.4], [81, -119], [94, -104], [96, -89], [84, -73], [67, -69], [53, -76], [45.6, -84.5]]
    .forEach(([x, z], i) => sp("l10-reeds-" + i, {
      feetPosition: T(x, z),
      scatter: {
        bounds: { shape: "circle", radius: 3.2 }, count: 16, seed: 9 + i,
        variation: { scale: [1.1, 1.8], yaw: [0, 360] },
        templates: [{ primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 1.2, n: 9, head: 0.18 }, seed: 5 }, material: { color: "oklch(0.86 0.03 85)" }, visibleRange: { max: 70 }, castShadow: false }],
      },
    }));

  // Canola patch (Level 184 transition)
  sp("l10-canola", {
    feetPosition: T(-85, -185),
    scatter: {
      bounds: { shape: "circle", radius: 11 },
      count: 520,
      seed: 18,
      variation: { scale: [0.9, 1.3], yaw: [0, 360] },
      templates: [
        { primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 1.1, n: 6, head: 0.08 }, seed: 6 }, material: { color: "oklch(0.88 0.19 100)", emissive: "oklch(0.3 0.08 100)" }, visibleRange: { max: 70 }, castShadow: false },
        { primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 0.9, n: 8, head: 0.06 }, seed: 7 }, material: { color: "oklch(0.62 0.12 135)" }, visibleRange: { max: 70 }, castShadow: false },
      ],
    },
  });
  for (const id of ["l10-canola-in", "l10-from-l184"]) if (ctx.getObject(id)) ctx.destroy(id);

  // Ambience audio
  sp("l10-ambience", { feetPosition: T(0, 0), audience: "local", audio: { clip: AMB, gain: 0.2, loop: true, spatial: false, bus: "Ambience" } });
}

export function tick(ctx) {
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  restyleSigns(ctx, "level10"); // every sign dressed as its own board (scripts/lib/sign-style.js)
  dressThresholds(ctx); // the ways in and out, dressed with what people left there (scripts/lib/thresholds.js)
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    for (const id of Object.keys(ctx.place.objects)) {
      if (/^l10-(hedge-\d+|dock-post-[-\d.]+|sign-post)$/.test(id)) ctx.destroy(id);
    }
    lay(ctx);
    s.builtV = V;
  }
  if (ctx.place.players?.length) tickChatter(ctx, CHATTER.level10 ?? [], { "l10-meg-cooper": "reyes", "l10-meg-maeve": "elena", "l10-meg-hale": "hollis", "l10-meg-wren": "mags", "l10-meg-sully": "reyes" }); // the outpost talks among itself
}
