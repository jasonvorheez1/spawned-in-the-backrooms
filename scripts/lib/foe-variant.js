// Leveled variant picks for creature families: scripts/lib/data/foe-variants.yml. A spawner rolls once and stamps state.variant;
// every reader multiplies by vmul(family, state.variant).
import V from "./data/foe-variants.yml";
const ONE = { hp: 1, dmg: 1, speed: 1, sight: 1, snap: 1, xp: 1 };
export function placeLevel(ctx) { let lv = 1; for (const p of ctx.place.players ?? []) lv = Math.max(lv, p.state?.level ?? 1); return lv; }
export function pickVariant(ctx, family, level = placeLevel(ctx)) {
  const rows = (V[family] ?? []).filter((r) => level >= (r.minLevel ?? 1));
  const w = rows.map((r) => Math.min(r.cap ?? 1e9, (r.weight ?? 0) + (r.grow ?? 0) * (level - (r.minLevel ?? 1))));
  let t = ctx.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < rows.length; i++) { t -= w[i]; if (t <= 0) return rows[i].id; }
  return "base";
}
export function vrow(family, id) { return (V[family] ?? []).find((r) => r.id === id) ?? null; }
export function vmul(family, id) { const r = vrow(family, id); return r ? { ...ONE, ...r } : ONE; }
