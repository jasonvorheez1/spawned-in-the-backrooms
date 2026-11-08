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
const V = 13;
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
    if (ctx.getObject(id)) ctx.destroy(id);
    const drawn = spec.primitive || spec.model;
    if (drawn && !spec.scatter && !spec.visibleRange && !/npc/.test(String(spec.tags))) spec.visibleRange = { max: BIG.test(id) ? 320 : 110 };
    if (drawn && SMALL.test(id) && spec.castShadow === undefined) spec.castShadow = false;
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
  // the road out: a leaning farm sign where the track leaves, and the city's glow felt in the fog at the far end
  sp("l10-sign-city", { feetPosition: T(4, -270, 0), rotation: { yaw: 15 }, primitive: { kind: "box", width: 1.4, height: 0.5, depth: 0.05 }, material: { color: "oklch(0.75 0.02 90)", roughness: 0.9 },
    ui: '<div face="front" width="1.4m" style="font-family:Arial,sans-serif;font-weight:800;color:#2b2b2b;text-align:center;font-size:120px;line-height:1">CITY →</div>' });
  sp("l10-sign-post", { feetPosition: T(4, -270, -0.3), primitive: { kind: "cylinder", radiusTop: 0.05, radiusBottom: 0.06, height: 2.3 }, material: { color: "oklch(0.4 0.03 60)", roughness: 0.9 } });

  // Outpost Welcome Marker
  sp("l10-outpost-sign", {
    feetPosition: T(-5, -34, 0), rotation: { yaw: 90 },
    primitive: { kind: "box", width: 2.2, height: 0.8, depth: 0.06 },
    material: { color: "oklch(0.82 0.03 80)", roughness: 0.9 },
    ui: '<div face="front" width="2.2m" style="font-family:serif;font-weight:700;color:#2c1810;text-align:center;padding:12px;box-sizing:border-box;border:3px double #5a3825;background:#eedcbe"><div style="font-size:42px;letter-spacing:2px">M.E.G. OUTPOST BOUNTIFUL</div><div style="font-size:20px;color:#6b4423;margin-top:4px">LEVEL 10 AGRARIAN SETTLEMENT · WANDERERS WELCOME</div></div>',
  });

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
    feetPosition: T(-24, -42, 2.8),
    primitive: { kind: "cylinder", radiusTop: 0.1, radiusBottom: 0.12, height: 0.35 },
    material: { color: "oklch(0.3 0.02 50)" },
    light: { kind: "point", color: "oklch(0.9 0.16 75)", intensity: 3.2, distance: 9 },
  });

  // Outpost Shortwave Radio on Porch
  sp("l10-outpost-radio", {
    tags: ["usable"],
    feetPosition: T(-28, -42.2, 0.48),
    rotation: { yaw: 180 },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "radio" } },
    behavior: "scripts/level10-use.js",
    state: { kind: "outpost-radio", name: "M.E.G. Agrarian Shortwave Radio", verb: "Tune Radio" },
  });

  // Outpost Hearth Baking Oven
  sp("l10-hearth-oven", {
    tags: ["usable"],
    feetPosition: T(-16, -38, 0),
    rotation: { yaw: -90 },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "oven" } }, physics: "static",
    light: { kind: "point", color: "oklch(0.88 0.18 55)", intensity: 2.2, distance: 6 },
    behavior: "scripts/level10-use.js",
    state: { kind: "hearth-oven", name: "Outpost Hearth Oven", verb: "Bake Homestead Bread" },
  });

  // Stone Water Well (Aquifer Pump)
  sp("l10-farm-well", {
    tags: ["usable"],
    feetPosition: T(-12, -32, 0),
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
    feetPosition: T(-55, -33.2, 0),
    primitive: { kind: "cylinder", radiusTop: 0.65, radiusBottom: 0.75, height: 0.8 },
    material: { color: "oklch(0.65 0.02 70)", roughness: 0.9 },
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
    feetPosition: T(-42, -18.5, 0),
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "hopper" } }, physics: "static",
    behavior: "scripts/level10-use.js",
    state: { kind: "silo-hopper", name: "Grain Discharge Chute", verb: "Inspect Grain Reserves" },
  });

  // ==========================================
  // 5. SPLIT-RAIL WOODEN FENCES
  // ==========================================
  sp("l10-fence-road-1", {
    feetPosition: T(-5, -20, 0),
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/fence10.js", params: { len: 14, rails: 2 } },
    physics: "static",
  });
  sp("l10-fence-road-2", {
    feetPosition: T(-5, -38, 0),
    rotation: { yaw: 90 },
    primitive: { kind: "scripted", script: "scripts/fence10.js", params: { len: 16, rails: 2 } },
    physics: "static",
  });
  sp("l10-fence-yard-west", {
    feetPosition: T(-62, -45, 0),
    rotation: { yaw: 0 },
    primitive: { kind: "scripted", script: "scripts/fence10.js", params: { len: 18, rails: 2 } },
    physics: "static",
  });

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
  wheatPatch("l10-wheat-patch-1", -8, -25);
  wheatPatch("l10-wheat-patch-2", 15, -42);
  wheatPatch("l10-wheat-patch-3", 10, -110);

  // ==========================================
  // 7. ANOMALOUS SCARECROWS (ENTITY 17 / THE WATCHERS)
  // ==========================================
  // Eastern barley plot (carries Document #24)
  sp("l10-scarecrow-east", {
    tags: ["usable", "scarecrow"],
    feetPosition: T(65, -40, 0),
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
  // Homesteader Cooper (Head Agrarian Coordinator)
  sp("l10-meg-cooper", {
    tags: ["npc", "meg"],
    feetPosition: T(-22, -42.4, 0.45),
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
      home: { x: -22, z: -42.4 },
      line: "Welcome to Outpost Bountiful, wanderer! Fresh bread is in the oven and the wheat is ripe.",
      ...npcState(ctx, "agent", 120),
    },
  });

  // Dr. Maeve (M.E.G. Research Wing / Agronomist)
  sp("l10-meg-maeve", {
    tags: ["npc", "meg"],
    feetPosition: T(-26, -42.4, 0.45),
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
      home: { x: -26, z: -42.4 },
      line: "Keep your compass steady in the fields. The scarecrows aren't hostile, but they certainly aren't ordinary.",
      ...npcState(ctx, "agent", 100),
    },
  });

  // the rest of the outpost's people: who keeps the stores, who works the rows, who keeps the radio
  const MEG = (id, at, yaw, look, role, hp, name, voice, line) => sp(id, { tags: ["npc", "meg"], feetPosition: at, rotation: { yaw }, physics: "character",
    ...critterSpec(npcLook(id.replace("l10-meg-", "l10-"), look, role, hp)), behavior: ["scripts/humanoid-locomotion.js", "scripts/meg-agent.js"],
    state: { name, role, voice, faction: "meg", factionName: "M.E.G. Outpost Bountiful", home: { x: at.x, z: at.z }, line, ...npcState(ctx, "agent", hp * 10) } });
  MEG("l10-meg-hale", T(-14.2, -36.5, 0), -90, { species: "bear", sex: "m", topw: "shirt", top: "#6b6a4a", botw: "pants", bottom: "#3b3226", shoes: "boots" }, "quarter", 12,
    "Quartermaster Hale · M.E.G. Outpost Bountiful", "hollis", "Everything that leaves this farm gets weighed. Everything.");
  MEG("l10-meg-wren", T(-6, -40, 0), 120, { species: "rabbit", sex: "f", topw: "tank", top: "#c9a86a", botw: "overalls", bottom: "#41587a", shoes: "boots", hat: "cap" }, "scout", 9,
    "Wren · Outpost Farmhand", "mags", "Mind your boots in the rows. And don't dig past your ankles.");
  MEG("l10-meg-sully", T(-29, -43, 0.45), 200, { species: "raccoon", sex: "m", topw: "jacket", top: "#4a5240", botw: "pants", bottom: "#2a2a26", shoes: "boots", hat: "beanie" }, "default", 10,
    "Sully · Outpost Radio Operator", "reyes", "Bountiful to Alpha, still green out here. Over.");
  // the cookfire the outpost eats around: a stone ring, split logs, stumps to sit on
  const fire = T(-13, -49, 0);
  for (let i = 0; i < 9; i++) { const a = i * 0.698; sp(`l10-fire-stone-${i}`, { feetPosition: { x: fire.x + Math.cos(a) * 0.75, y: fire.y, z: fire.z + Math.sin(a) * 0.75 }, rotation: { yaw: i * 47 }, scale: { x: 1, y: 0.6, z: 0.8 }, primitive: { kind: "sphere", radius: 0.2, widthSegments: 7, heightSegments: 5 }, material: { color: "oklch(0.5 0.01 80)", roughness: 0.95 }, castShadow: false, visibleRange: { max: 60 } }); }
  for (let i = 0; i < 3; i++) sp(`l10-fire-log-${i}`, { feetPosition: { x: fire.x, y: fire.y + 0.08, z: fire.z }, rotation: { yaw: i * 60, roll: 90, pitch: 18 }, pivot: "center", primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.08, height: 0.9, radialSegments: 7 }, material: { color: "oklch(0.25 0.03 50)", roughness: 1 }, castShadow: false });
  [[1.9, 0.4], [-1.6, 1.1], [0.3, -2]].forEach(([dx, dz], i) => sp(`l10-fire-stump-${i}`, { tags: ["seat"], feetPosition: { x: fire.x + dx, y: fire.y, z: fire.z + dz }, primitive: { kind: "cylinder", radiusTop: 0.24, radiusBottom: 0.28, height: 0.42, radialSegments: 10 }, material: { color: "oklch(0.42 0.05 60)", texture: "cdn/texture-worn-hardwood-grain.png", roughness: 0.95 }, physics: "static", visibleRange: { max: 80 } }));
  sp("l10-fire", { feetPosition: { x: fire.x, y: fire.y + 0.05, z: fire.z }, fx: { script: `fx
pop flame rate=flick(.45,.2)*50 on=disc(.25) life=.5..0.9 v=up(1.4)+cone(22)*(.3..0.8) size=.2..0.38 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5) sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=4 on=disc(.25) life=.7..1.4 v=up(2.2)+cone(30)*(.4..1.2) size=.02..0.05 acc=curl(.8)+grav()*.45+drag(.5) col=hdr(5,2.8,.8)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.2 inh=p;v:$v*.4 life=2..3.2 size=.18..0.3 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.25:.3>.7:.2>0 r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.2).c(.45) glo=fire()*(#flame/35)~ r=light(<1,.55,.24>,$glo*22,10)` },
    audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-small-campfire-wood-crackling-popping-loop.mp3", gain: 0.25, loop: true, spatial: true, maxDistance: 14 } });
  // the M.E.G. flag over the yard
  const fl = T(-20, -33, 0);
  sp("l10-flagpole", { feetPosition: fl, primitive: { kind: "cylinder", radiusTop: 0.04, radiusBottom: 0.06, height: 7, radialSegments: 8 }, material: { color: "oklch(0.7 0.01 250)", metalness: 0.7, roughness: 0.4 }, physics: "static" });
  sp("l10-flag", { feetPosition: { x: fl.x + 0.8, y: fl.y + 6.0, z: fl.z }, primitive: { kind: "plane", width: 1.6, height: 0.95, widthSegments: 8 }, material: { color: "oklch(0.32 0.06 250)", side: "double", roughness: 0.9 }, castShadow: false,
    vector: "<svg viewBox='0 0 160 95' width='1.6m'><rect width='160' height='95' fill='#1f2c45'/><circle cx='80' cy='44' r='26' fill='none' stroke='#e8dcb0' stroke-width='4'/><text x='80' y='53' font-family='sans-serif' font-size='24' font-weight='700' text-anchor='middle' fill='#e8dcb0'>MEG</text><text x='80' y='88' font-family='sans-serif' font-size='10' text-anchor='middle' fill='#e8dcb0'>OUTPOST BOUNTIFUL</text></svg>" });

  // ==========================================
  // 9. THE BIG BRICK BARN, STABLE & SHEDS
  // ==========================================
  sp("l10-barn", { ...BARN(18, 9, 4.6, 8.4, "brick", 4.2), feetPosition: T(-48, -55, 0), rotation: { yaw: 180 } });
  sp("l10-stable", { ...BARN(12, 7, 3.4, 5.8, "brick", 3), feetPosition: T(-58, -105, 0), rotation: { yaw: 90 } });
  sp("l10-shed-a", { ...BARN(5, 4, 2.6, 3.9, "plank", 1.8), feetPosition: T(36, -150, 0), rotation: { yaw: -20 } });
  sp("l10-shed-b", { ...BARN(4.5, 3.6, 2.5, 3.6, "plank", 1.6), feetPosition: T(95, -60, 0), rotation: { yaw: 200 } });

  // Supply crates & Tool chests
  const crate = (id, x, z, name, items, yaw = 0) => sp(id, {
    tags: ["container", "breakable"], feetPosition: T(x, z, 0.06), rotation: { yaw },
    primitive: { kind: "scripted", script: "scripts/props10.js", params: { kind: "crate" }, seed: x * 31 + z },
    physics: "static",
    state: { name, items, ...BRK("wood", 40) },
  });
  crate("l10-barn-bin", -54, -57, "Grain feed bin", "wheat_sheaf,wheat_sheaf,ration,almond", 10);
  crate("l10-barn-chest", -42, -52, "Agrarian tool chest", "weapon:crowbar,tape,battery,bobbypin", -8);
  crate("l10-stable-bin", -58, -103, "Tack box", "bandage,ration,cloth:topw:jacket:5a4630", 90);
  crate("l10-shed-a-box", 36, -150, "Nail box", "wire,tape,bobbypin", 0);
  crate("l10-cellar-chest", -34, -56, "Cellar reserve cache", "ration,ration,battery,almond", 0);

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
    primitive: { kind: "cylinder", radiusTop: 0.75, radiusBottom: 0.75, height: 1.2 },
    pivot: "center",
    material: { texture: "cdn/texture-golden-rolled-straw-hay-bale.png", color: "oklch(0.82 0.08 85)" },
    physics: "static",
    state: { name: "Hay bale", ...BRK("cloth", 30) },
  });
  bale("l10-bale-0", -40, 0, -63, 0);
  bale("l10-bale-1", -38.4, 0, -63.3, 10);
  bale("l10-bale-2", -56, 0, -65, 70);

  // ==========================================
  // 10. HEDGEROWS, REEDS & CANOLA
  // ==========================================
  const rows = [];
  // the farmyard (x -72..-4, z -76..-4) is kept clear: the rows that cross it are split around it
  const span = (a0, a1, cut0, cut1) => (a1 < cut0 || a0 > cut1) ? [[a0, a1]] : [[a0, cut0], [cut1, a1]].filter(([u, v]) => v - u > 6);
  for (const x of [-120, -40, 40, 120]) for (const [z0, z1] of (x === -40 ? span(-290, 70, -76, -4) : [[-290, 70]])) rows.push({ cx: x, cz: (z0 + z1) / 2, w: 5, d: z1 - z0 });
  for (const z of [-270, -210, -150, -90, -30, 30]) for (const [x0, x1] of (z === -30 ? span(-160, 160, -72, -4) : [[-160, 160]])) rows.push({ cx: (x0 + x1) / 2, cz: z, w: x1 - x0, d: 5 });
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

  // Lake reeds
  sp("l10-reeds", {
    feetPosition: T(70, -95),
    scatter: {
      bounds: { shape: "ring", innerRadius: 24, outerRadius: 29 },
      count: 220,
      seed: 9,
      variation: { scale: [1.2, 1.9], yaw: [0, 360] },
      templates: [{ primitive: { kind: "scripted", script: "scripts/wheat10.js", params: { h: 1.2, n: 9, head: 0.18 }, seed: 5 }, material: { color: "oklch(0.86 0.03 85)" }, visibleRange: { max: 70 }, castShadow: false }],
    },
  });

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
  const s = ctx.place.state;
  if ((s.builtV ?? 0) < V) {
    s.builtV = V;
    lay(ctx);
  }
  if (ctx.place.players?.length) tickChatter(ctx, CHATTER.level10 ?? [], { "l10-meg-cooper": "reyes", "l10-meg-maeve": "elena", "l10-meg-hale": "hollis", "l10-meg-wren": "mags", "l10-meg-sully": "reyes" }); // the outpost talks among itself
}
