// Level 3 loot: crates, generator-room caches, assembly-line output. Tables in data/loot3.yml.
import T from "./data/loot3.yml";
import { rollWeapon, rollLock } from "./loot.js";
import { rollVariant } from "./weapons.js";
import P from "./data/l3items.yml";
import { rollCloth } from "./clothes.js";
import { SKILLS } from "./stats.js";
const bookOf = (ctx) => "book:" + SKILLS[Math.floor(ctx.random() * SKILLS.length)].k;
export function rollWeaponL3(ctx) { const q = ctx.random(); if (q < 0.06) return rollVariant(ctx, "smg"); if (q < 0.16) return rollVariant(ctx, "knife"); return ctx.random() < (T.weaponL3 ?? 0.45) ? rollVariant(ctx, ctx.random() < 0.5 ? "stun_baton" : "lineman_machete") : rollWeapon(ctx); }
export function rollTableL3(ctx, table = "crate") {
  const E = Object.entries(T.tables[table] ?? T.tables.crate), total = E.reduce((a, [, w]) => a + w, 0);
  let r = ctx.random() * total;
  for (const [k, w] of E) { r -= w; if (r <= 0) return k === "weapon" ? "weapon:" + rollWeaponL3(ctx) : k === "book" ? bookOf(ctx) : k === "cloth" ? rollCloth(ctx) : k === "page" ? "page:" + (1 + Math.floor(ctx.random() * (P.pages ?? 8))) : k; }
  return "almond";
}
export const rollItemL3 = (ctx) => rollTableL3(ctx, "crate");
export function spawnCrateL3(ctx, p, table = "crate", name) {
  const [a, b] = T.crateItems, n = a + Math.floor(ctx.random() * (b - a + 1)), items = [];
  for (let i = 0; i < n; i++) items.push(rollTableL3(ctx, table));
  const lk = rollLock(ctx); if (lk) for (let i = 0; i < lk.bonus; i++) items.push(rollTableL3(ctx, table));
  const nm = lk ? lk.name : name ?? ["Parts crate", "Electrician's toolbox", "Cable drum crate", "Wooden crate", "Spares bin"][Math.floor(ctx.random() * 5)];
  return ctx.spawn({ tags: ["container", "crate", "breakable"], feetPosition: { x: p.x, y: p.y ?? 0.01, z: p.z }, rotation: Math.floor(ctx.random() * 4) * 90, physics: "static", primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind: "crate" } }, state: { mat: "wood", hp: 60, maxHp: 60, name: nm, items: items.join(","), ...(lk ? { lock: lk.lock } : {}) } });
}
