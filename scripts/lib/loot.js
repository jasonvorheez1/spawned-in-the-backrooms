// Loot: one place that knows how almond water and weapons appear in the maze, whether from the
// floor spawner (places/main/sim.js) or from a smiler that just died (scripts/player.js).
import L from "./data/level0.yml";
import W, { rollVariant } from "./weapons.js";
import { SKILL_KEYS } from "./stats.js";
import { weaponBody } from "./weapon-look.js";
import { rollCloth, wornTokens, CLOTHES as CL } from "./clothes.js";

const scatter = (ctx, c) => ({ x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 });

export function spawnAlmond(ctx, c) {
  ctx.spawn({ tags: ["almond"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, model: "/cdn/value.a762c3c5b45b825a10d0e93b00d009ae455200b423a5b63cda9e8d34bbc7750c.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } });
}

export function spawnWeapon(ctx, c, kind) {
  ctx.spawn({ tags: ["weapon"], state: { kind }, feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, ...weaponBody(kind) });
}

export function spawnAmmo(ctx, c) {
  ctx.spawn({ tags: ["ammo"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "box", width: 0.14, height: 0.07, depth: 0.09 }, material: { color: "oklch(0.72 0.12 85)", metalness: 0.7, roughness: 0.4, emissive: "oklch(0.6 0.1 85)", emissiveIntensity: 0.5 } });
}

export function spawnShells(ctx, c) {
  ctx.spawn({ tags: ["shells"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "box", width: 0.16, height: 0.07, depth: 0.1 }, material: { color: "oklch(0.55 0.2 25)", roughness: 0.6, emissive: "oklch(0.5 0.18 25)", emissiveIntensity: 0.5 } });
}

// Loot pools: a weapon with `pools: [l4, l5]` in weapons.yml turns up only where its pool is rolled (l0 lobby, l1 garage, l2 pipes, l3 station and Gamma,
// l4 offices, l5 hotel); a weapon with none is a base weapon rolled everywhere. poolOf maps a place id to its pool.
export const POOL = { main: "l0", level1: "l1", level2: "l2", level3: "l3", gamma: "l3", level4: "l4", level5: "l5", level7: "l7", level8: "l2" };
export const poolOf = (place) => POOL[place] ?? "l0";
// Weighted pick over every found weapon this pool can hold; rarer ones carry a smaller weight in weapons.yml.
export function rollWeapon(ctx, pool = "l0") {
  const kinds = W.order.slice(1).filter((k) => !W[k].level1 && !W[k].level2 && !W[k].level3 && (!W[k].pools?.length || W[k].pools.includes(pool))), total = kinds.reduce((a, k) => a + (W[k].weight ?? 1), 0);
  let r = ctx.random() * total;
  for (const k of kinds) { r -= W[k].weight ?? 1; if (r <= 0) return rollVariant(ctx, k); }
  return kinds[0];
}

// ---- containers: a crate in the maze, or the remains of what you killed. Their contents are tokens (scripts/lib/items.js).
const ITEM_WEIGHTS = [["lobby_wafer", 12], ["beans", 6], ["bar", 7], ["ration", 3], ["almond", 40], ["ammo", 16], ["shells", 7], ["weapon", 22], ["kit", 4], ["bobbypin", 10], ["book", 3], ["cloth", CL.crateWeight]];
const bookOf = (ctx) => { const ks = SKILL_KEYS.filter((k) => k !== "energy" && k !== "explosives"); return "book:" + ks[Math.floor(ctx.random() * ks.length)]; };
// some containers are locked, Fallout style: a Lockpick or Science level you need to have. Locked ones hold more.
export function rollLock(ctx) {
  const r = ctx.random(); if (r > 0.3) return null;
  const sci = r < 0.07, q = ctx.random(), lv = q < 0.4 ? 25 : q < 0.7 ? 50 : q < 0.9 ? 75 : 100;
  return { lock: (sci ? "science:" : "lockpick:") + lv, name: sci ? "Secured locker" : "Locked crate", bonus: 1 + (lv >= 75 ? 1 : 0) };
}
// money found loose: mostly coins, sometimes a bill or a wad (Savi's picks)
export function rollCash(ctx) { const r = ctx.random(); return r < 0.3 ? 'cash:1' : r < 0.5 ? 'cash:5' : r < 0.72 ? 'cash:25' : r < 0.92 ? 'cash:100' : 'cash:' + (100 * (2 + Math.floor(ctx.random() * 9))); }
export function rollItem(ctx, pool = "l0") {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = ITEM_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of ITEM_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeapon(ctx, pool) : k === "book" ? bookOf(ctx) : k === "cloth" ? rollCloth(ctx) : k; }
  return "almond";
}

export function spawnCrate(ctx, c, pool = "l0") {
  const n = 1 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItem(ctx, pool));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItem(ctx, pool));
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 }, rotation: ctx.random() * 360, physics: "static", primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { mat: "wood", hp: 60, maxHp: 60, name: lk ? lk.name : "Supply crate", items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}

export function spawnRemains(ctx, pos, items, name = "Remains") {
  ctx.spawn({ tags: ["container", "remains"], feetPosition: { x: pos.x, y: 0.02, z: pos.z }, rotation: ctx.random() * 360, lifetime: 150, primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: name.startsWith("Lurker") ? "lurker" : "smiler" } }, state: { name, items: items.join(",") } });
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

// Level 1's crates: rations, bandages and batteries join the roll. Weights are Savi's picks.
const L1_WEIGHTS = [["bobbypin", 8], ["ration", 5], ["almond", 4], ["bandage", 3], ["battery", 3], ["ammo", 2], ["shells", 1], ["weapon", 1.2], ["kit", 1.6], ["book", 1.4], ["cloth", 2.2], ["compass", 1]]; // cloth: Savi's pick
export function rollItemL1(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L1_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L1_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + (ctx.random() < 0.6 ? rollVariant(ctx, ctx.random() < 0.55 ? "rebar" : "wrench") : rollWeapon(ctx, "l1")) : k === "book" ? bookOf(ctx) : k === "cloth" ? rollCloth(ctx) : k; }
  return "ration";
}
export function spawnCrateL1(ctx, p) {
  const n = 2 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItemL1(ctx));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItemL1(ctx));
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: Math.floor(ctx.random() * 4) * 90, physics: "static", primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { mat: "wood", hp: 60, maxHp: 60, name: lk ? lk.name : ctx.random() < 0.25 ? "Rations crate" : "Wooden crate", items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}
// Level 2: a tool depot. More batteries and ammo, fewer rations; its own tools.
const L2_WEIGHTS = [["almond", 14], ["bobbypin", 7], ["ammo", 18], ["shells", 9], ["battery", 14], ["bandage", 10], ["ration", 6], ["weapon", 20], ["kit", 5], ["book", 4], ["cloth", 8], ["tape", 6], ["fuse", 4], ["valve", 3], ["keycard", 2], ["beans", 5], ["bar", 6], ["firstaid", 3], ["compass", 2]]; // cloth: Savi's pick; the rest are Level 2's own finds
export function rollItemL2(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L2_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L2_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL2(ctx) : k === "book" ? bookOf(ctx) : k === "cloth" ? rollCloth(ctx) : k; }
  return "battery";
}
export function rollWeaponL2(ctx) { const r = ctx.random(); return r < 0.4 ? rollVariant(ctx, "screwdriver") : r < 0.55 ? rollVariant(ctx, "sledgehammer") : r < 0.75 ? rollVariant(ctx, "wrench") : rollWeapon(ctx, "l2"); }
export function spawnCrateL2(ctx, p) {
  const n = 2 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItemL2(ctx));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollItemL2(ctx));
  const name = lk ? lk.name : ["Toolbox", "Metal crate", "Parts bin", "Wooden crate"][Math.floor(ctx.random() * 4)];
  ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: Math.floor(ctx.random() * 4) * 90, physics: "static", primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { name, items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}

// Level 2 side-room containers: a kind from level2.yml containers (locker, toolbox, vending …), rolled from its own loot table
import L2C from "./data/level2.yml";
export function rollTableL2(ctx, table) {
  const T = Object.entries(L2C.tables[table] ?? {}), total = T.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of T) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL2(ctx) : k === "book" ? bookOf(ctx) : k; }
  return rollItemL2(ctx);
}
export function fillContainerL2(ctx, kind, bonus = 0) {
  const C = L2C.containers[kind], n = C.n[0] + Math.floor(ctx.random() * (C.n[1] - C.n[0] + 1)) + bonus, items = [];
  for (let i = 0; i < n; i++) items.push(rollTableL2(ctx, C.table));
  return items.join(",");
}
export function spawnContainerL2(ctx, kind, p, yaw, opts = {}) {
  const C = L2C.containers[kind], lk = opts.noLock ? null : rollLock(ctx);
  return ctx.spawn({ tags: ["container", "l2box"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: { yaw }, physics: { body: "static", collider: "box" },
    primitive: { kind: "scripted", script: "scripts/l2-props-geo.js", params: { kind, seed: Math.floor(ctx.random() * 1000) } },
    state: { name: lk ? `${C.name} (locked)` : C.name, kind, items: fillContainerL2(ctx, kind, (opts.bonus ?? 0) + (lk ? lk.bonus : 0)), ...(lk ? { lock: lk.lock } : {}), room: opts.room ?? -1 } });
}

// ---- Level 5 (Terror Hotel): what a hotel room's dresser, wardrobe or kitchen holds. Meat feeds Samantha; the SMG and knife are this floor's guns.
export const L5_WEIGHTS = [["almond", 26], ["ammo", 18], ["meat", 22], ["ration", 6], ["bandage", 6], ["battery", 5], ["bobbypin", 8], ["weapon", 6], ["book", 2], ["cloth", 6], ["royal_ration", 1]] // nvg: Ines's quest only (scripts/l5-goggles.js);
export const MEAT5 = [["steak", 3], ["fish", 4], ["chicken", 6], ["spam", 8], ["sardines", 8], ["rat", 6]];
export function rollMeat(ctx) { const t = MEAT5.reduce((a, [, w]) => a + w, 0); let r = ctx.random() * t; for (const [k, w] of MEAT5) { r -= w; if (r <= 0) return "meat:" + k; } return "meat:rat"; }
export function rollWeaponL5(ctx) { const q = ctx.random(); return q < 0.3 ? rollVariant(ctx, "smg") : q < 0.65 ? rollVariant(ctx, "knife") : rollWeapon(ctx, "l5"); }
export function rollItemL5(ctx) {
  if (ctx.random() < 0.14) return rollCash(ctx);
  const total = L5_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of L5_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL5(ctx) : k === "meat" ? rollMeat(ctx) : k === "book" ? bookOf(ctx) : k === "cloth" ? rollCloth(ctx) : k; }
  return "almond";
}
