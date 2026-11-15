import { interactiveSpec } from './prop-interactions.js'
// Loot: one place that knows how almond water and weapons appear in the maze, whether from the
// floor spawner (places/main/sim.js) or from a smiler that just died (scripts/player.js).
import L from "./data/level0.yml";
import L3 from "./data/loot3.yml";
import W, { rollVariant, rarityIdx, rarityCap, authoredVariant } from "./weapons.js";
import { SKILL_KEYS } from "./stats.js";
import { rollManual } from "./manuals.js";
import { weaponBody } from "./weapon-look.js";
import { rollCloth, rollLevel, wornTokens, CLOTHES as CL } from "./clothes.js";

const scatter = (ctx, c) => ({ x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 });

export function spawnAlmond(ctx, c) {
  ctx.spawn({ tags: ["almond"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, visibleRange: { max: 35 }, castShadow: false, model: "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } });
}

export function spawnWeapon(ctx, c, kind, extra) {
  ctx.spawn({ tags: ["weapon"], state: extra ? { kind, ...extra } : { kind }, feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, visibleRange: { max: 40 }, castShadow: false, ...weaponBody(kind) });
}

export function spawnAmmo(ctx, c) {
  ctx.spawn({ tags: ["ammo"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 0.14, height: 0.07, depth: 0.09 }, material: { color: "oklch(0.72 0.12 85)", metalness: 0.7, roughness: 0.4, emissive: "oklch(0.6 0.1 85)", emissiveIntensity: 0.5 } });
}

export function spawnShells(ctx, c) {
  ctx.spawn({ tags: ["shells"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, visibleRange: { max: 35 }, castShadow: false, primitive: { kind: "box", width: 0.16, height: 0.07, depth: 0.1 }, material: { color: "oklch(0.55 0.2 25)", roughness: 0.6, emissive: "oklch(0.5 0.18 25)", emissiveIntensity: 0.5 } });
}

// Loot pools: a weapon with `pools: [l4, l5]` in weapons.yml turns up only where its pool is rolled (l0 lobby, l1 garage, l2 pipes, l3 station and Gamma,
// l4 offices, l5 hotel); a weapon with none is a base weapon rolled everywhere. poolOf maps a place id to its pool.
export const POOL = {
  main: "l0", level01: "l01", level02: "l02",
  level1: "l1", level2: "l2", level21: "l2",
  level3: "l3", gamma: "l3", level4: "l4",
  level5: "l5", level6: "l5", level61: "l5",
  level7: "l7", level8: "l2", level9: "l5",
  level10: "l10", level11: "l11", level13: "l13", level26: "l26",
  level31: "l31", level34: "l2", level70: "l70", level109: "l109",
  level114: "l114", level169: "l169", level178: "l178",
};
export const poolOf = (place) => POOL[place] ?? "l0";
export const PLACE_CATEGORY = {
  main: "office", level01: "office", level02: "hazardous",
  level1: "industrial", level2: "maintenance", level21: "abandoned_settlement",
  level3: "industrial", gamma: "expedition", level4: "office",
  level5: "residential", level6: "hazardous", level61: "food_service",
  level7: "expedition", level8: "hazardous", level9: "residential",
  level10: "abandoned_settlement", level11: "security", level13: "residential", level26: "residential",
  level31: "residential", level34: "maintenance", level70: "expedition", level109: "medical",
  level114: "residential", level169: "expedition", level178: "retreat",
};

// Contextual category tables: weighted items & matched temporary skill magazines (never infini-respawning permanent Skill Books).
export const LOOT_CATEGORIES = {
  office: [
    ["almond", 24], ["cloudy_almond", 7], ["warm_tea", 7], ["lobby_wafer", 14], ["bar", 9],
    ["bobbypin", 12], ["battery", 9], ["tape", 6], ["keycard", 4], ["painkillers", 5], ["compass", 2.5],
    ["bandage", 5], ["weapon", 9], ["cloth", 6], ["mag:science", 2.5], ["mag:speech", 2.5],
    ["mag:lockpick", 2], ["mag:barter", 2], ["manual:tools", 3], ["manual:aid", 2],
  ],
  residential: [
    ["almond", 18], ["cloudy_almond", 7], ["warm_tea", 8], ["beans", 9], ["bar", 9],
    ["stale_ration", 8], ["meat", 12], ["bandage", 7], ["painkillers", 6], ["antiseptic", 4],
    ["bobbypin", 9], ["cloth", 9], ["weapon", 9], ["ammo", 7],
    ["mag:survival", 2.5], ["mag:sneak", 2.5], ["mag:melee", 2], ["mag:unarmed", 2], ["manual:armor", 3], ["manual:food", 3],
  ],
  medical: [
    ["almond", 18], ["bandage", 20], ["firstaid", 14], ["medkit", 7], ["painkillers", 14],
    ["antiseptic", 12], ["splint", 9], ["stim_shot", 5], ["charcoal", 7], ["warm_tea", 6],
    ["cloth", 3], ["mag:medicine", 4], ["mag:science", 2], ["manual:aid", 6],
  ],
  industrial: [
    ["battery", 16], ["tape", 14], ["kit", 10], ["fuse", 8], ["valve", 6],
    ["bobbypin", 9], ["ammo", 12], ["shells", 6], ["weapon", 14], ["cloth", 6],
    ["ration", 6], ["stale_ration", 6], ["painkillers", 5], ["splint", 4], ["firesalt", 4],
    ["mag:repair", 3], ["mag:energy", 2], ["mag:explosives", 2], ["manual:tools", 4], ["manual:weapons", 3],
  ],
  maintenance: [
    ["tape", 16], ["battery", 15], ["kit", 9], ["fuse", 9], ["valve", 8],
    ["bobbypin", 10], ["almond", 10], ["cloudy_almond", 6], ["warm_tea", 5],
    ["bandage", 6], ["antiseptic", 5], ["charcoal", 4], ["weapon", 12], ["cloth", 5],
    ["mag:repair", 3.5], ["mag:lockpick", 2.5], ["mag:science", 2], ["manual:tools", 5], ["manual:aid", 2],
  ],
  food_service: [
    ["almond", 22], ["warm_tea", 14], ["cloudy_almond", 10], ["bar", 14], ["beans", 14],
    ["ration", 10], ["stale_ration", 9], ["meat", 16], ["charcoal", 6], ["painkillers", 4],
    ["bandage", 4], ["cloth", 4], ["mag:survival", 2.5], ["mag:barter", 2.5], ["manual:food", 6],
  ],
  retreat: [
    ["l178_water", 14], ["l178_barley_tea", 12], ["l178_onigiri", 10], ["l178_miso", 8],
    ["l178_bento", 3], ["l178_towel", 6], ["cloth", 10], ["bandage", 4], ["manual:food", 6],
  ],
  expedition: [
    ["almond", 16], ["warm_tea", 9], ["ration", 12], ["bandage", 10], ["firstaid", 8],
    ["medkit", 4], ["ammo", 12], ["shells", 7], ["battery", 9], ["kit", 6],
    ["bobbypin", 7], ["compass", 5], ["repellent", 2], ["cashew", 1.5], ["weapon", 12], ["cloth", 8],
    ["mag:survival", 3], ["mag:guns", 2.5], ["mag:medicine", 2], ["mag:sneak", 2], ["manual:food", 3], ["manual:armor", 3], ["manual:weapons", 2],
  ],
  security: [
    ["ammo", 20], ["shells", 11], ["weapon", 18], ["kit", 8], ["firstaid", 8],
    ["medkit", 5], ["stim_shot", 5], ["painkillers", 6], ["bandage", 7], ["bobbypin", 9],
    ["keycard", 4], ["cloth", 7], ["molotov", 3], ["frag", 3],
    ["mag:guns", 3], ["mag:explosives", 2.5], ["mag:melee", 2], ["mag:lockpick", 2], ["manual:ammo", 5], ["manual:weapons", 4],
  ],
  abandoned_settlement: [
    ["stale_ration", 16], ["cloudy_almond", 12], ["ration", 7], ["beans", 8], ["bar", 7],
    ["meat", 8], ["bandage", 8], ["antiseptic", 6], ["splint", 5], ["painkillers", 6],
    ["bobbypin", 9], ["battery", 8], ["cloth", 7], ["weapon", 10],
    ["mag:survival", 2.5], ["mag:repair", 2.5], ["mag:sneak", 2],
  ],
  hazardous: [
    ["almond", 14], ["cloudy_almond", 8], ["charcoal", 12], ["antiseptic", 10], ["bandage", 9],
    ["firstaid", 6], ["stim_shot", 5], ["firesalt", 8], ["repellent", 4], ["cashew", 2], ["battery", 9],
    ["ammo", 8], ["weapon", 9], ["cloth", 4],
    ["mag:medicine", 2.5], ["mag:explosives", 2.5], ["mag:energy", 2],
  ],
  rare_cache: [
    ["medkit", 10], ["stim_shot", 9], ["royal_ration", 6], ["firstaid", 10], ["ammo", 14],
    ["shells", 9], ["weapon", 18], ["cloth", 10], ["kit", 8], ["molotov", 5], ["frag", 5],
    ["mag:guns", 3], ["mag:medicine", 3], ["mag:science", 2.5], ["mag:lockpick", 2.5],
  ],
};
const POOL_TIER = { l0: 1, l01: 6, l02: 7, l1: 4, l2: 8, l21: 9, l3: 12, l4: 10, l5: 14, l6: 15, l7: 16, l8: 17, l9: 13, l10: 11, l11: 12, l12: 14, l13: 15, l26: 9, l27: 13, l31: 7, l34: 11, l61: 14, l70: 15, l109: 11, l114: 15, l169: 14, l184: 16, gamma: 12 };
export function leveledWeaponScale(k, lv) {
  const unlocked = Math.max(W[k]?.minLevel ?? 1, [1, 3, 6, 10][rarityIdx(k)] ?? 1);
  const age = Math.max(0, lv - unlocked);
  if (unlocked <= 2) return Math.max(0.2, 1 - Math.max(0, age - 2) * 0.09);
  return Math.max(0.45, 1.5 - Math.max(0, age - 2) * 0.12);
}

const LOCAL_WEAPONS = {
  l1: [0.55, [["rebar", 5], ["wrench", 4]]],
  l2: [0.72, [["screwdriver", 6], ["table_leg", 3], ["pipe_scrap", 4], ["crowbar", 5], ["wrench", 5], ["sledgehammer", 3]]],
  l3: [L3.weaponL3 ?? 0.45, [["knife", 3], ["stun_baton", 5], ["lineman_machete", 5], ["smg", 3]]],
  l5: [0.7, [["knife", 5], ["cleaver", 4], ["revolver", 4], ["coach_gun", 3], ["smg", 4]]],
};
const COMMON_WEAPONS = W.order.slice(1)
  .filter((k) => !W[k].level1 && !W[k].level2 && !W[k].level3)
  .map((k) => [k, W[k].weight ?? 1]);

function pickWeapon(ctx, rows, lv, cap, minLevel, pool) {
  const eligible = rows.filter(([k, weight]) =>
    weight > 0 && W[k] && !W[k].unique && (W[k].weight ?? 1) > 0 &&
    (!pool || !W[k].pools?.length || W[k].pools.includes(pool)) &&
    rarityIdx(k) <= cap && (W[k].minLevel ?? 1) <= lv && (W[k].minLevel ?? 1) >= minLevel);
  if (!eligible.length) return null;
  const weighted = eligible.map(([k, weight]) => [k, weight * leveledWeaponScale(k, lv)]);
  let r = ctx.random() * weighted.reduce((total, [, weight]) => total + weight, 0);
  for (const [k, weight] of weighted) if ((r -= weight) <= 0) return rollVariant(ctx, k, lv, { cap });
  return weighted[weighted.length - 1][0];
}

export function rollWeapon(ctx, pool = "l0", cap, level, minLevel = 1) {
  const lv = level == null ? rollLevel(ctx, POOL_TIER[pool] ?? 1) : Math.max(1, Number(level) || 1);
  const ceiling = Math.min(cap ?? 3, rarityCap(lv));
  const [chance, local] = LOCAL_WEAPONS[pool] ?? [];
  const nearby = local && ctx.random() < chance ? pickWeapon(ctx, local, lv, ceiling, minLevel) : null;
  return nearby ?? pickWeapon(ctx, COMMON_WEAPONS, lv, ceiling, minLevel, pool) ?? (minLevel === 1 ? "table_leg" : null);
}
// A found thing too good for this player's level steps down; at higher levels, starter junk has a chance to roll up into fitting gear.
export function gateItems(ctx, items, level, pool = "l0") {
  const lv = Math.max(1, Number(level) || 1), cap = rarityCap(lv);
  return String(items ?? "").split(",").filter(Boolean).map((t) => {
    if (!t.startsWith("weapon:")) return t;
    const k = t.slice(7);
    if (!W[k] || W[k].unique || W[k].weight === 0 || authoredVariant(k)) return t; // keep authored discoveries
    if (rarityIdx(k) > cap || (W[k].minLevel ?? 1) > lv) return "weapon:" + rollWeapon(ctx, pool, cap, lv);
    if (lv >= 7 && (W[k]?.minLevel ?? 1) <= 2 && rarityIdx(k) === 0 && ctx.random() < Math.min(0.65, (lv - 5) * 0.08)) {
      const better = rollWeapon(ctx, pool, cap, lv, 3);
      if (better) return "weapon:" + better;
    }
    return t;
  }).join(",");
}

// ---- containers: a crate in the maze, or the remains of what you killed. Their contents are tokens (scripts/lib/items.js).
const MAG_BY_POOL = {
  l0: ["mag:science", "mag:speech", "mag:lockpick", "mag:barter"],
  l01: ["mag:science", "mag:speech", "mag:lockpick", "mag:barter"],
  l1: ["mag:repair", "mag:survival", "mag:melee", "mag:unarmed"],
  l2: ["mag:repair", "mag:lockpick", "mag:explosives", "mag:science"],
  l3: ["mag:energy", "mag:science", "mag:repair", "mag:explosives"],
  l4: ["mag:science", "mag:speech", "mag:barter", "mag:lockpick"],
  l5: ["mag:sneak", "mag:medicine", "mag:guns", "mag:survival"],
  l7: ["mag:survival", "mag:explosives", "mag:guns", "mag:medicine"],
  l10: ["mag:survival", "mag:unarmed", "mag:repair", "mag:barter"],
  l11: ["mag:guns", "mag:medicine", "mag:barter", "mag:lockpick"],
  l26: ["mag:lockpick", "mag:sneak", "mag:speech", "mag:barter"],
  l31: ["mag:sneak", "mag:barter", "mag:unarmed", "mag:speech"],
  l70: ["mag:survival", "mag:medicine", "mag:guns", "mag:repair"],
  l109: ["mag:medicine", "mag:science", "mag:lockpick", "mag:sneak"],
};
export function magOf(ctx, pool = "l0") {
  const list = MAG_BY_POOL[pool] ?? MAG_BY_POOL.l0;
  return list[Math.floor(ctx.random() * list.length)];
}
const ITEM_WEIGHTS = [["lobby_wafer", 11], ["warm_tea", 3], ["cloudy_almond", 3], ["painkillers", 3], ["antiseptic", 2], ["meat", 5], ["beans", 6], ["bar", 7], ["ration", 3], ["almond", 34], ["ammo", 15], ["shells", 7], ["weapon", 10], ["kit", 4], ["bobbypin", 10], ["molotov", 1.5], ["mag", 3], ["manual", 6], ["firesalt", 2.5], ["repellent", 0.4], ["compass", 2.5], ["cloth", CL.crateWeight]]; // compass: Nov 15, Shelly wanted beginners finding them
// some containers are locked, Fallout style: a Lockpick or Science level you need to have. Locked ones hold more.
export function rollLock(ctx) {
  const r = ctx.random(); if (r > 0.3) return null;
  const sci = r < 0.07, q = ctx.random(), lv = q < 0.4 ? 25 : q < 0.7 ? 50 : q < 0.9 ? 75 : 100;
  return { lock: (sci ? "science:" : "lockpick:") + lv, name: sci ? "Secured locker" : "Locked crate", bonus: 1 + (lv >= 75 ? 1 : 0) };
}
// money found loose: mostly coins, sometimes a bill or a wad (Savi's picks)
export function rollCash(ctx) { const r = ctx.random(); return r < 0.3 ? 'cash:1' : r < 0.5 ? 'cash:5' : r < 0.72 ? 'cash:25' : r < 0.92 ? 'cash:100' : 'cash:' + (100 * (2 + Math.floor(ctx.random() * 9))); }
export function rollCategoryItem(ctx, category = "office", pool = "l0") {
  if (ctx.random() < 0.12) return rollCash(ctx);
  const table = LOOT_CATEGORIES[category] ?? LOOT_CATEGORIES.office;
  const total = table.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of table) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeapon(ctx, pool) : k === "mag" ? magOf(ctx, pool) : k === "cloth" ? rollCloth(ctx) : k === "meat" ? rollMeat(ctx) : k; }
  return "almond";
}
export function rollItem(ctx, pool = "l0") {
  const place = ctx?.self?.place ?? ctx?.place?.id;
  const source = POOL[place] === pool ? place : Object.keys(POOL).find((id) => POOL[id] === pool);
  if (PLACE_CATEGORY[source] && pool !== "l0") return rollCategoryItem(ctx, PLACE_CATEGORY[source], pool);
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = ITEM_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of ITEM_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeapon(ctx, pool) : k === "manual" ? rollManual(ctx, pool) : k === "mag" ? magOf(ctx, pool) : k === "cloth" ? rollCloth(ctx) : k === "meat" ? rollMeat(ctx) : k; }
  return "almond";
}

export function spawnCrate(ctx, c, pool = "l0") {
  const n = 1 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItem(ctx, pool));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItem(ctx, pool));
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 }, rotation: ctx.random() * 360, physics: "static", visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { mat: "wood", hp: 60, maxHp: 60, name: lk ? lk.name : "Supply crate", items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}

export function spawnRemains(ctx, pos, items, name = "Remains") {
  ctx.spawn({ tags: ["container", "remains"], feetPosition: { x: pos.x, y: 0.02, z: pos.z }, rotation: ctx.random() * 360, lifetime: 3600, visibleRange: { max: 40 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: name === "Dropped bag" ? "sack" : name.startsWith("Lurker") ? "lurker" : "smiler" } }, state: { name, items: items.join(",") } });
}

// What a dead critter NPC (M.E.G. agent, survivor) was wearing, as cloth tokens of its exact garments: looting them strips the body
export const garmentsOf = (look) => wornTokens(look);
// one garment a searcher spots in a container on first search: chance findBase x2 x clothFind (Observation, Luck)
export function spotCloth(ctx, clothMul = 1) { return ctx.random() < CL.findBase * 2 * clothMul ? rollCloth(ctx) : null; }

// What a dead smiler or lurker leaves: a body to search, if it was carrying anything.
// clothMul: the killer's eye for a wearable (derived(s).clothFind: Observation, then Luck)
export function rollLoot(ctx, luck = 1, clothMul = 1, pool = "l0") {
  const items = [];
  if (ctx.random() < 0.45) items.push(rollCash(ctx));
  if (ctx.random() < CL.findBase * luck * clothMul) items.push(rollCloth(ctx));
  if (ctx.random() < W.dropChance.almond * luck) items.push("almond");
  if (ctx.random() < W.dropChance.ammo * luck) items.push("ammo");
  if (ctx.random() < W.dropChance.shells * luck) items.push("shells");
  if (ctx.random() < W.dropChance.weapon * luck) items.push("weapon:" + rollWeapon(ctx, pool));
  return items;
}
export function dropLoot(ctx, pos, name = "Remains", luck = 1, clothMul = 1, pool = "l0") {
  const items = rollLoot(ctx, luck, clothMul, pool);
  if (items.length) spawnRemains(ctx, pos, items, name);
}

// Level 1's crates: rations, bandages, field mags, manuals and batteries join the roll.
const L1_WEIGHTS = [["bobbypin", 8], ["compass", 3], ["firesalt", 4], ["repellent", 0.5], ["cashew", 1], ["meat", 2.5], ["ration", 4], ["stale_ration", 2], ["almond", 3.5], ["warm_tea", 1], ["bandage", 2.5], ["painkillers", 1], ["splint", 0.8], ["battery", 3], ["ammo", 2], ["shells", 1], ["weapon", 1.2], ["kit", 1.6], ["mag", 1.4], ["manual", 3.2], ["cloth", 2.2], ["molotov", 0.5]];
export const rollWeaponL1 = (ctx, level) => rollWeapon(ctx, "l1", undefined, level);
export function rollItemL1(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L1_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L1_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL1(ctx) : k === "manual" ? rollManual(ctx, "l1") : k === "mag" ? magOf(ctx, "l1") : k === "cloth" ? rollCloth(ctx) : k === "meat" ? rollMeat(ctx) : k; }
  return "ration";
}
export function spawnCrateL1(ctx, p) {
  const n = 2 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItemL1(ctx));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItemL1(ctx));
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: Math.floor(ctx.random() * 4) * 90, physics: "static", visibleRange: { max: 45 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { mat: "wood", hp: 60, maxHp: 60, name: lk ? lk.name : ctx.random() < 0.25 ? "Rations crate" : "Wooden crate", items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}
// Level 2: a tool depot. More batteries and ammo, fewer rations; maintenance magazines and trauma triage.
const L2_WEIGHTS = [["frag", 2], ["firesalt", 5], ["repellent", 0.6], ["cashew", 0.6], ["meat", 5], ["molotov", 3], ["almond", 12], ["cloudy_almond", 3], ["bobbypin", 7], ["ammo", 17], ["shells", 9], ["battery", 14], ["bandage", 8], ["antiseptic", 3], ["splint", 2], ["painkillers", 2], ["ration", 5], ["stale_ration", 2], ["weapon", 10], ["kit", 5], ["mag", 4], ["manual", 8], ["cloth", 8], ["tape", 6], ["fuse", 4], ["valve", 3], ["keycard", 2], ["beans", 5], ["bar", 6], ["firstaid", 3], ["compass", 2]];
export function rollItemL2(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L2_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L2_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL2(ctx) : k === "manual" ? rollManual(ctx, "l2") : k === "mag" ? magOf(ctx, "l2") : k === "cloth" ? rollCloth(ctx) : k === "meat" ? rollMeat(ctx) : k; }
  return "battery";
}
export const rollWeaponL2 = (ctx, level) => rollWeapon(ctx, "l2", undefined, level);
export function spawnCrateL2(ctx, p) {
  const n = 2 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItemL2(ctx));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItemL2(ctx));
  const name = lk ? lk.name : ["Toolbox", "Metal crate", "Parts bin", "Wooden crate"][Math.floor(ctx.random() * 4)];
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: Math.floor(ctx.random() * 4) * 90, physics: "static", visibleRange: { max: 45 }, castShadow: false, model: { id: crateModel(name), forward: PROPS.forward }, layout: fitBox(name === "Toolbox" ? PROPS.toolboxSize : PROPS.crateSize), state: { name, mat: name === "Wooden crate" ? "wood" : "metal", hp: 60, maxHp: 60, items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}

// Level 2 side-room containers: a kind from level2.yml containers (locker, toolbox, vending …), rolled from its own loot table
import L2C from "./data/level2.yml";
import { PROPS, fitBox, containerModel, crateModel } from "./l2props.js";
const L2_TABLE_MAGS = {
  office: ["mag:science", "mag:lockpick", "mag:speech"],
  locker: ["mag:survival", "mag:sneak", "mag:melee"],
  tools: ["mag:repair", "mag:explosives", "mag:energy"],
  food: ["mag:survival", "mag:barter"],
  cage: ["mag:guns", "mag:explosives", "mag:lockpick"],
};
export function rollTableL2(ctx, table) {
  const T = Object.entries(L2C.tables[table] ?? {}), total = T.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  const pickMag = () => { const list = L2_TABLE_MAGS[table] ?? MAG_BY_POOL.l2; return list[Math.floor(ctx.random() * list.length)]; };
  for (const [k, w] of T) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL2(ctx) : k === "manual" ? rollManual(ctx, "l2") : k === "mag" ? pickMag() : k; }
  return rollItemL2(ctx);
}
export function fillContainerL2(ctx, kind, bonus = 0) {
  const C = L2C.containers[kind] ?? L2C.containers.locker, n = C.n[0] + Math.floor(ctx.random() * (C.n[1] - C.n[0] + 1)) + bonus, items = [];
  for (let i = 0; i < n; i++) items.push(rollTableL2(ctx, C.table));
  return items.join(",");
}
// containers modelled in Blender (art/props/build.py): the lockers and fridges are real objects with louvres, handles and rounded edges; the rest still draw as scripted boxes
const L2MODEL = {
  locker: { id: "/cdn/value.c6241c9ef9004df7d80aae0e234ed284e1f3e9ea13a77cc4183bbf4f92977eca.glb", paints: ["#8c8c84", "#7d8a7c", "#9a9484", "#6f7a86", "#8a6a4a", "#a8a8a2"] },
  // fridge: the Tripo fridge (l2props containers) faces its room; the old Blender one stood backwards (Shelly: "break room has backwards placement")
};
export function spawnContainerL2(ctx, kind, p, yaw, opts = {}) {
  const C0 = L2C.containers[kind], C = opts.size ? { ...C0, size: opts.size } : C0, lk = opts.noLock ? null : rollLock(ctx), M = opts.model ?? L2MODEL[kind] ?? (containerModel(kind) ? { id: containerModel(kind), tripo: true } : null), seed = Math.floor(ctx.random() * 1000);
  const items = opts.items !== undefined ? opts.items : fillContainerL2(ctx, kind, (opts.bonus ?? 0) + (lk ? lk.bonus : 0));
  const name = opts.name ?? (lk ? `${C.name} (locked)` : C.name);
  return ctx.spawn(interactiveSpec({
    tags: ["container", "l2box"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: { yaw }, physics: { body: "static", collider: "box" }, visibleRange: { max: 45 }, castShadow: false,
    ...(M ? { model: M.tripo ? { id: M.id, forward: PROPS.forward } : { id: M.id, materials: { paint: { color: M.paints[seed % M.paints.length], roughness: 0.55, metalness: 0.15 } } }, layout: { box: { min: { x: -C.size[0] / 2, y: 0, z: -C.size[2] / 2 }, max: { x: C.size[0] / 2, y: C.size[1], z: C.size[2] / 2 } } } } : { primitive: { kind: "scripted", script: "scripts/l2-props-geo.js", params: { kind, seed } } }),
    state: { name, kind, items, ...(lk ? { lock: lk.lock } : {}), room: opts.room ?? -1 }
  }));
}

// ---- Level 5 (Terror Hotel): what a hotel room's dresser, wardrobe or kitchen holds. Meat feeds Samantha; the SMG and knife are this floor's guns.
export const L5_WEIGHTS = [["almond", 22], ["warm_tea", 4], ["ammo", 17], ["meat", 20], ["ration", 5], ["stale_ration", 3], ["bandage", 5], ["painkillers", 3], ["antiseptic", 2], ["battery", 5], ["bobbypin", 8], ["weapon", 6], ["mag", 2.5], ["manual", 4], ["cloth", 6], ["royal_ration", 1]] // nvg: Ines's quest only (scripts/l5-goggles.js);
export const MEAT5 = [["steak", 3], ["fish", 4], ["chicken", 6], ["spam", 8], ["sardines", 8], ["jerky", 7], ["hotdog", 4], ["rat", 6]];
export function rollMeat(ctx) { const t = MEAT5.reduce((a, [, w]) => a + w, 0); let r = ctx.random() * t; for (const [k, w] of MEAT5) { r -= w; if (r <= 0) return "meat:" + k; } return "meat:rat"; }
export const rollWeaponL5 = (ctx, level) => rollWeapon(ctx, "l5", undefined, level);
export function rollItemL5(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L5_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L5_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL5(ctx) : k === "meat" ? rollMeat(ctx) : k === "manual" ? rollManual(ctx, "l5") : k === "mag" ? magOf(ctx, "l5") : k === "cloth" ? rollCloth(ctx) : k; }
  return "almond";
}
