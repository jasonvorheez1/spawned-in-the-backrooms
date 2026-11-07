// Loot: one place that knows how almond water and weapons appear in the maze, whether from the
// floor spawner (places/main/sim.js) or from a smiler that just died (scripts/player.js).
import L from "./data/level0.yml";
import W from "./data/weapons.yml";

const scatter = (ctx, c) => ({ x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 });

export function spawnAlmond(ctx, c) {
  ctx.spawn({ tags: ["almond"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, model: "/cdn/value.a762c3c5b45b825a10d0e93b00d009ae455200b423a5b63cda9e8d34bbc7750c.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } });
}

export function spawnWeapon(ctx, c, kind) {
  ctx.spawn({ tags: ["weapon"], state: { kind }, feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind } } });
}

export function spawnAmmo(ctx, c) {
  ctx.spawn({ tags: ["ammo"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "box", width: 0.14, height: 0.07, depth: 0.09 }, material: { color: "oklch(0.72 0.12 85)", metalness: 0.7, roughness: 0.4, emissive: "oklch(0.6 0.1 85)", emissiveIntensity: 0.5 } });
}

export function spawnShells(ctx, c) {
  ctx.spawn({ tags: ["shells"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "box", width: 0.16, height: 0.07, depth: 0.1 }, material: { color: "oklch(0.55 0.2 25)", roughness: 0.6, emissive: "oklch(0.5 0.18 25)", emissiveIntensity: 0.5 } });
}

// Weighted pick over every found weapon; rarer ones carry a smaller weight in weapons.yml.
export function rollWeapon(ctx) {
  const kinds = W.order.slice(1), total = kinds.reduce((a, k) => a + (W[k].weight ?? 1), 0);
  let r = ctx.random() * total;
  for (const k of kinds) { r -= W[k].weight ?? 1; if (r <= 0) return k; }
  return kinds[0];
}

// ---- containers: a crate in the maze, or the remains of what you killed. Their contents are tokens (scripts/lib/items.js).
const ITEM_WEIGHTS = [["almond", 40], ["ammo", 16], ["shells", 7], ["weapon", 22]];
export function rollItem(ctx) {
  const total = ITEM_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of ITEM_WEIGHTS) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeapon(ctx) : k; }
  return "almond";
}

export function spawnCrate(ctx, c) {
  const n = 1 + Math.floor(ctx.random() * 3), items = [];
  for (let i = 0; i < n; i++) items.push(rollItem(ctx));
  ctx.spawn({ tags: ["container", "crate"], feetPosition: { x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 }, rotation: ctx.random() * 360, physics: "static", primitive: { kind: "box", width: 0.7, height: 0.5, depth: 0.55 }, material: { color: "oklch(0.58 0.07 70)", roughness: 0.9 }, state: { name: "Supply crate", items: items.join(",") } });
}

export function spawnRemains(ctx, pos, items, name = "Remains") {
  ctx.spawn({ tags: ["container", "remains"], feetPosition: { x: pos.x, y: 0.02, z: pos.z }, rotation: ctx.random() * 360, lifetime: 150, primitive: { kind: "cylinder", radiusTop: 0.42, radiusBottom: 0.47, height: 0.05 }, material: { color: "#14101a", roughness: 0.2, emissive: "#44238a", emissiveIntensity: 0.5 }, state: { name, items: items.join(",") } });
}

// What a dead smiler or lurker leaves: a body to search, if it was carrying anything.
export function dropLoot(ctx, pos, name = "Remains") {
  const items = [];
  if (ctx.random() < W.dropChance.almond) items.push("almond");
  if (ctx.random() < W.dropChance.ammo) items.push("ammo");
  if (ctx.random() < W.dropChance.shells) items.push("shells");
  if (ctx.random() < W.dropChance.weapon) items.push("weapon:" + rollWeapon(ctx));
  if (items.length) spawnRemains(ctx, pos, items, name);
}
