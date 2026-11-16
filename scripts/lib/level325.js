// Level 325 "Boom Town": the ONE map and the ONE tower clock every Level 325 file reads.
// The city is an endless square grid. A tower's whole life (foundation, a storey every two minutes, the Blue Channel threshold,
// the fifteen second collapse, rubble, the sink through the ground, the rebuild) is a pure function of one clock kept in
// world.state.l325 (global: every place, every reload agrees) and the tower's cell hash. Nothing per tower is stored but a nudge.
// Numbers are Savi's picks unless the Wikidot page gives them (120 s a storey, 250 to 330 m, 15 s).
export const CELL = 48, ROAD = 12, WALK = 3, LOT = 30, GROUND = 0.15;
export const STOREY = 3.2, SECTION = 10, FLOOR_S = 120, WARN_S = 15, FLASH_S = 4, FALL_S = 9;
export const REST_S = 45, SINK_S = 75, FOUND_S = 60, FOOT = 24, WRAP = 26;
export const hash = (ix, iz, k = 0) => { let h = (ix * 374761393 + iz * 668265263 + k * 2147483647 + 325) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const cellOf = (x, z) => ({ ix: Math.round(x / CELL), iz: Math.round(z / CELL) });
export const keyOf = (ix, iz) => ix + "_" + iz;
const DIRS = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
export function cellInfo(ix, iz) {
  const lot = (ix === 0 && iz === 0) || (ix === -6 && iz === 5) || hash(ix, iz, 1) < 0.12;
  const N = 78 + Math.floor(hash(ix, iz, 2) * 26); // 78..103 storeys = 250..330 m
  return { kind: lot ? "lot" : "tower", x: ix * CELL, z: iz * CELL, N, H: N * STOREY, lean: DIRS[Math.floor(hash(ix, iz, 3) * 4)],
    basement: !lot && hash(ix, iz, 4) < 0.14, van: lot && ((ix === -6 && iz === 5) || hash(ix, iz, 5) < 0.02), car69: lot && !(ix === 0 && iz === 0) && hash(ix, iz, 6) < 0.3 };
}
// the global clock, seconds. world.state.l325 = { base, at, nudge: { key: seconds } }: the sim rebases it every 30 s so a room
// whose ctx.now() restarts picks the city up where it stood.
export function clock(ctx) {
  const w = ctx.world.state.l325;
  if (!w) return 0;
  const d = (ctx.now() - w.at) / 1000;
  return w.base + (d >= 0 && d < 3600 * 24 * 30 ? d : 0);
}
export function keepClock(ctx) {
  const ws = ctx.world.state, now = ctx.now();
  if (!ws.l325) { ws.l325 = { base: 5000, at: now, nudge: {} }; return; }
  const d = (now - ws.l325.at) / 1000;
  if (d < 0 || d > 30) ws.l325 = { ...ws.l325, base: ws.l325.base + (d > 0 && d < 3600 * 24 * 30 ? d : 0), at: now };
}
export function period(N) { return FOUND_S + N * FLOOR_S + WARN_S + REST_S + SINK_S; }
export function towerAt(ctx, ix, iz) {
  const c = cellInfo(ix, iz);
  if (c.kind !== "tower") return null;
  const key = keyOf(ix, iz), P = period(c.N);
  const t = clock(ctx) + hash(ix, iz, 7) * P + (ctx.world.state.l325?.nudge?.[key] ?? 0);
  const cycle = Math.floor(t / P); let u = t - cycle * P;
  const out = { key, ix, iz, x: c.x, z: c.z, N: c.N, H: c.H, lean: c.lean, basement: c.basement, cycle, floors: 0, prog: 0, wt: 0, left: 0 };
  if (u < FOUND_S) return { ...out, stage: "foundation", prog: u / FOUND_S, left: P - REST_S - SINK_S - WARN_S - u };
  u -= FOUND_S;
  if (u < c.N * FLOOR_S) { const f = Math.floor(u / FLOOR_S); return { ...out, stage: c.N - f <= 3 ? "near" : "build", floors: f, prog: u / FLOOR_S - f, left: c.N * FLOOR_S - u }; }
  u -= c.N * FLOOR_S;
  if (u < WARN_S) return { ...out, stage: "warn", floors: c.N, wt: u };
  u -= WARN_S;
  if (u < REST_S) return { ...out, stage: "rubble", prog: u / REST_S, wt: u };
  u -= REST_S;
  return { ...out, stage: "sink", prog: u / SINK_S, wt: u };
}
// bring a tower to `seconds` before its collapse (tests, the first-arrival tower). Stored in the global state.
export function nudge(ctx, ix, iz, seconds = 30) {
  const t = towerAt(ctx, ix, iz); if (!t) return false;
  const P = period(t.N), key = t.key, w = ctx.world.state.l325;
  const cur = (clock(ctx) + hash(ix, iz, 7) * P + (w.nudge?.[key] ?? 0)) % P;
  const want = FOUND_S + t.N * FLOOR_S - seconds;
  ctx.world.state.l325 = { ...w, nudge: { ...(w.nudge ?? {}), [key]: (w.nudge?.[key] ?? 0) + ((want - cur) % P + P) % P } };
  return true;
}
// where a falling tower comes down: its own lot, then a tongue of wreck along its lean across the street (Savi's pick: 0.13 H)
export function lobe(t) { const reach = t.H * 0.13; return { x0: t.x, z0: t.z, x1: t.x + t.lean.x * reach, z1: t.z + t.lean.z * reach, r: 15, reach }; }
export function distToLobe(t, x, z) {
  const L = lobe(t), dx = L.x1 - L.x0, dz = L.z1 - L.z0, l2 = dx * dx + dz * dz || 1;
  const k = Math.max(0, Math.min(1, ((x - L.x0) * dx + (z - L.z0) * dz) / l2));
  return Math.hypot(x - (L.x0 + dx * k), z - (L.z0 + dz * k));
}
export function towersNear(ctx, x, z, rings = 2) {
  const c = cellOf(x, z), out = [];
  for (let i = -rings; i <= rings; i++) for (let j = -rings; j <= rings; j++) { const t = towerAt(ctx, c.ix + i, c.iz + j); if (t) out.push(t); }
  return out;
}
// what an NPC or a HUD can know: nothing before the tremor. danger 0..1, away = unit vector out of the lobe, eta = seconds to impact.
export function hazardAt(ctx, x, z) {
  let best = { danger: 0, away: { x: 0, z: 0 }, eta: null, key: null };
  for (const t of towersNear(ctx, x, z, 3)) {
    if (t.stage !== "warn" && !(t.stage === "rubble" && t.wt < 6)) continue;
    const d = distToLobe(t, x, z), danger = Math.max(0, Math.min(1, 1 - (d - 15) / 45));
    if (danger > best.danger) { const L = lobe(t), mx = (L.x0 + L.x1) / 2, mz = (L.z0 + L.z1) / 2, l = Math.hypot(x - mx, z - mz) || 1; best = { danger, away: { x: (x - mx) / l, z: (z - mz) / l }, eta: t.stage === "warn" ? WARN_S - t.wt : 0, key: t.key }; }
  }
  return best;
}
// cover: standing under a slab of a tower that is itself standing (two storeys or more above you)
export function coverAt(ctx, x, z, notKey) {
  const c = cellOf(x, z), t = towerAt(ctx, c.ix, c.iz);
  return !!t && t.key !== notKey && (t.stage === "build" || t.stage === "near") && t.floors >= 2 && Math.abs(x - t.x) < FOOT / 2 && Math.abs(z - t.z) < FOOT / 2;
}
export const L325_NAMES = { l325_lot: "An Empty Lot", l325_street: "Boom Town Streets", l325_site: "A Tower Under Construction", l325_basement: "A Tower Basement" };
export function zoneAt(x, z, y = 0) {
  const c = cellOf(x, z), i = cellInfo(c.ix, c.iz), dx = Math.abs(x - i.x), dz = Math.abs(z - i.z);
  if (dx > LOT / 2 || dz > LOT / 2) return "street";
  return i.kind === "lot" ? "lot" : y < -1 ? "basement" : "site";
}
