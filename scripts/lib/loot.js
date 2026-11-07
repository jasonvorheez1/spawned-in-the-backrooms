// Loot: one place that knows how almond water and weapons appear in the maze, whether from the
// floor spawner (places/main/sim.js) or from a smiler that just died (scripts/player.js).
import L from "./data/level0.yml";
import W from "./data/weapons.yml";

const scatter = (ctx, c) => ({ x: c.x + (ctx.random() - 0.5) * 2, y: 0.01, z: c.z + (ctx.random() - 0.5) * 2 });

export function spawnAlmond(ctx, c) {
  ctx.spawn({ tags: ["almond"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, scale: 1.7, primitive: { kind: "scripted", script: "scripts/almond-geo.js" }, material: { emissiveIntensity: 1.6 } });
}

export function spawnWeapon(ctx, c, kind) {
  ctx.spawn({ tags: ["weapon"], state: { kind }, feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "scripted", script: "scripts/weapon-geo.js", params: { kind } } });
}

export function spawnAmmo(ctx, c) {
  ctx.spawn({ tags: ["ammo"], feetPosition: scatter(ctx, c), rotation: ctx.random() * 360, primitive: { kind: "box", width: 0.14, height: 0.07, depth: 0.09 }, material: { color: "oklch(0.72 0.12 85)", metalness: 0.7, roughness: 0.4, emissive: "oklch(0.6 0.1 85)", emissiveIntensity: 0.5 } });
}

// Weighted pick over every found weapon; rarer ones carry a smaller weight in weapons.yml.
export function rollWeapon(ctx) {
  const kinds = W.order.slice(1), total = kinds.reduce((a, k) => a + (W[k].weight ?? 1), 0);
  let r = ctx.random() * total;
  for (const k of kinds) { r -= W[k].weight ?? 1; if (r <= 0) return k; }
  return kinds[0];
}

// A dead smiler may leave almond water, or a weapon.
export function dropLoot(ctx, pos) {
  if (ctx.random() < W.dropChance.almond) spawnAlmond(ctx, pos);
  if (ctx.random() < W.dropChance.ammo) spawnAmmo(ctx, pos);
  if (ctx.random() < W.dropChance.weapon) spawnWeapon(ctx, pos, rollWeapon(ctx));
}
