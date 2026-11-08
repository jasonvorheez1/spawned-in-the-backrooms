// One navigation layer for every walker (M.E.G. agents, 6.1 staff, Level 5 hotel staff, Level 11 commuters).
// builtin/nav plans over the colliders as they stand; this adds what a crowd needs on top:
//  - one search budget per tick on this machine, shared by every script (no more 3 scripts × 2 searches in one frame)
//  - a short route cache: a crowd heading the same way reuses one search
//  - one body radius, so paths keep a shoulder's width off walls and counters
// Every number is Savi's pick (Nov 8, Shelly: "update navmesh system").
import { findPath } from "builtin/nav";
export const NAV = { radius: 0.32, perTick: 3, cacheMs: 4000, cacheMax: 256 };
let AT = -1, N = 0;
const CACHE = new Map();
export function navBudget(now) { if (now !== AT) { AT = now; N = 0; } return N < NAV.perTick; }
const key = (pl, a, b) => `${pl}|${Math.round(a.x)},${Math.round(a.y ?? 0)},${Math.round(a.z)}>${Math.round(b.x)},${Math.round(b.y ?? 0)},${Math.round(b.z)}`;
// → builtin/nav's answer ({ points, ok, partial }), a cached one ({ ..., cached: true }), or { wait: true } when this tick's budget is spent: keep the old path and ask next tick
export function navPath(ctx, from, to, opts = {}) {
  const now = ctx.now(), k = key(ctx.self?.place ?? "", from, to), c = CACHE.get(k);
  if (c && now - c.at < NAV.cacheMs) return { points: c.points, ok: true, partial: false, cached: true };
  if (!navBudget(now)) return { wait: true, points: null };
  N++;
  const r = findPath(ctx, { x: from.x, y: from.y ?? 0, z: from.z }, { x: to.x, y: to.y ?? from.y ?? 0, z: to.z }, { radius: NAV.radius, ...opts });
  if (r?.ok && r.points?.length) { CACHE.set(k, { points: r.points, at: now }); if (CACHE.size > NAV.cacheMax) CACHE.delete(CACHE.keys().next().value); }
  return r;
}
