// Level 70 waypoint graph: every NPC and foe walks route(ctx, from, to). Nodes: arrival, Kelpie Street every 20 m, each SPOT, zone rims.
// An edge is proven by builtin/nav the first time it is used and cached in place.state.l70nav; the cache drops when a building layer's version moves.
import { findPath } from "builtin/nav";
import { traverseCheck } from "builtin/physics";
import { isNavLoading } from "./nav.js";
import { ARRIVE, ZONES, SPOT } from "./level70.js";
export const NODES = {}; export const ADJ = {}; export const NAV_V = 5;
const add = (id, x, z) => { NODES[id] = { x, y: 0, z }; ADJ[id] = ADJ[id] ?? []; };
const link = (a, b) => { ADJ[a].push(b); ADJ[b].push(a); };
add("arrive", ARRIVE.x, ARRIVE.z);
for (let z = 40; z >= -120; z -= 20) { add("s" + z, 0, z); if (z < 40) link("s" + z, "s" + (z + 20)); }
link("arrive", "s40");
const rim = (k) => { const c = ZONES[k], s = c.x > 0 ? -1 : 1; add("rim-" + k, c.x + s * (c.r - 1), c.z); return "rim-" + k; };
for (const k of ["suburb", "office", "hotel", "froston", "iceshed"]) rim(k);
add("market", SPOT.market.x, SPOT.market.z); link("market", "s-60"); link("market", "s-80");
add("pocket-w", -22, -72); link("pocket-w", "market"); link("pocket-w", "rim-iceshed");
link("rim-suburb", "s-20"); link("rim-suburb", "s0"); link("rim-office", "s-20"); link("rim-hotel", "s-80"); add("froston-mouth", 7, 18); link("froston-mouth", "s20"); link("rim-froston", "froston-mouth");
add("house", SPOT.house.x + 11, SPOT.house.z + 1.8); link("house", "rim-suburb"); add("house-walk", -12, -17.2); link("house-walk", "house"); link("house-walk", "s-20");
add("igloo", SPOT.igloo.x + 3, SPOT.igloo.z + 2); link("igloo", "house"); link("igloo", "rim-suburb");
add("garage-door", SPOT.garage.x - 15, SPOT.garage.z); link("garage-door", "rim-office");
add("garage", SPOT.garage.x, SPOT.garage.z); link("garage", "garage-door");
add("valves", SPOT.valves.x - 2, SPOT.valves.z); link("valves", "garage");
add("lobby-door", SPOT.lobby.x - 11, SPOT.lobby.z); link("lobby-door", "rim-hotel");
add("lobby", SPOT.lobby.x - 3.2, SPOT.lobby.z); link("lobby", "lobby-door");
add("rig", SPOT.rig.x - 4, SPOT.rig.z); link("rig", "rim-froston");
add("ice-mid", -78, -80); link("ice-mid", "rim-iceshed");
add("camp", SPOT.camp.x + 3, SPOT.camp.z); link("camp", "ice-mid");
add("dock", SPOT.dock.x, SPOT.dock.z); link("dock", "s-120");
// door thresholds and interiors (paths layer): the house up its porch, hall, living room, kitchen and storm cellar; the igloo;
// the garage mouth and valve room; the hotel lobby; Froston's open container. Each is a chain of short, provable legs.
const chain = (rows) => { for (const [id, x, z, to, y] of rows) { add(id, x, z); if (y) NODES[id].y = y; for (const t of [].concat(to)) link(id, t); } };
chain([
  ["house-step", -32, -16.2, "house"], ["house-door", -35.2, -16.2, "house-step", 0.84], ["house-hall", -37.4, -16.2, "house-door", 0.84],
  ["house-living", -40.5, -14.6, "house-hall", 0.84], ["house-kitchen", -40.5, -18.6, ["house-hall", "house-living"], 0.84],
  ["cellar-top", -43.2, -18.9, "house-kitchen", 0.84], ["cellar", -43.2, -22.2, "cellar-top", 0.32],
  ["igloo-in", -51.2, -4, "igloo"],
  ["garage-mouth", 24.5, -22, ["garage-door", "garage"]], ["valve-door", 44.5, -22, ["garage", "valves"]],
  ["lobby-in", 27.6, -80, ["lobby-door", "lobby"]],
  ["froston-yard", 44, 21, ["rim-froston", "rig"]], ["container", 54.6, 21, "rig", 0.2],
]);
const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const key = (a, b) => (a < b ? a + ">" + b : b + ">" + a);
export function nearest(p) { let best = null, bd = 1e9; for (const [id, n] of Object.entries(NODES)) { const d = D(n, p); if (d < bd) { bd = d; best = id; } } return best; }
function dijkstra(a, b, bad) {
  const dist = { [a]: 0 }, prev = {}, open = new Set([a]), done = new Set();
  while (open.size) {
    let u = null; for (const k of open) if (u == null || dist[k] < dist[u]) u = k;
    open.delete(u); done.add(u); if (u === b) break;
    for (const v of ADJ[u]) { if (done.has(v) || bad?.has(key(u, v))) continue; const d = dist[u] + D(NODES[u], NODES[v]); if (d < (dist[v] ?? 1e9)) { dist[v] = d; prev[v] = u; open.add(v); } }
  }
  if (a !== b && !(b in prev)) return null;
  const out = [b]; while (out[0] !== a) out.unshift(prev[out[0]]); return out;
}
// the node chain between two points, no validation: used to lay a resident's round along the graph
export function legs(from, to) { return (dijkstra(nearest(from), nearest(to)) ?? []).map((id) => ({ ...NODES[id] })); }
const r1 = (v) => Math.round(v * 10) / 10;
const BLOCKED_RETRY_MS = 15000;
const PROVES_PER_TICK = 12;
let proveAt = -1, proveN = 0;
function proveBudget(now) {
  if (now !== proveAt) { proveAt = now; proveN = 0; }
  if (proveN >= PROVES_PER_TICK) return false;
  proveN++;
  return true;
}
function isBlockedEntry(v, now) {
  if (v === 0) return true;
  return v != null && typeof v === "object" && !Array.isArray(v) && now < (v.until ?? 0);
}
function checkTraverse(ctx, A, B) {
  try {
    const t = traverseCheck(ctx, A, B);
    if (t?.traversable) return [[r1(A.x), r1(A.y ?? 0), r1(A.z)], [r1(B.x), r1(B.y ?? 0), r1(B.z)]];
    if (t == null || t.loading || t.ready === false) return null;
  } catch (e) { return null; }
  return 0;
}
function prove(ctx, A, B) {
  let r = null, threw = false;
  try { r = findPath(ctx, A, B, { radius: 0.32 }); }
  catch (e) { threw = true; }
  if (r && !threw) {
    if (r.ok && r.points?.length) {
      const st = Math.max(1, Math.ceil(r.points.length / 24));
      return r.points.filter((_, i) => i % st === 0 || i === r.points.length - 1).map((p) => [r1(p.x), r1(p.y ?? 0), r1(p.z)]);
    }
    if (isNavLoading(r) || r.partial) return null;
    return checkTraverse(ctx, A, B);
  }
  return checkTraverse(ctx, A, B);
}
export function route(ctx, from, to) {
  if (!from || !to || !Number.isFinite(from.x) || !Number.isFinite(from.z) || !Number.isFinite(to.x) || !Number.isFinite(to.z)) {
    return { ok: false, partial: false, points: [] };
  }
  const ps = ctx.place?.state ?? {}, now = ctx.now?.() ?? Date.now();
  const ver = [ps.v70town, ps.v70civic, ps.v70wild, ps.v70paths, NAV_V].join("|");
  let st = ps.l70nav; if (!st || st.ver !== ver) st = { ver, e: {} };
  const e = { ...st.e }; let dirty = st !== ps.l70nav, partial = false;
  const a = nearest(from), b = nearest(to), bad = new Set(Object.keys(e).filter((k) => isBlockedEntry(e[k], now)));
  let chain = null;
  for (let tries = 0; tries < 5; tries++) {
    chain = dijkstra(a, b, bad); if (!chain) break; let fail = false;
    for (let i = 1; i < chain.length; i++) {
      const k = key(chain[i - 1], chain[i]);
      if (Array.isArray(e[k]) || isBlockedEntry(e[k], now)) continue;
      if (!proveBudget(now)) { partial = true; continue; }
      const [lo, hi] = k.split(">"), r = prove(ctx, NODES[lo], NODES[hi]);
      if (r === null) { partial = true; continue; }
      if (r === 0) { e[k] = { until: now + BLOCKED_RETRY_MS }; dirty = true; bad.add(k); fail = true; break; }
      e[k] = r; dirty = true;
    }
    if (!fail) break; chain = null;
  }
  if (dirty && ctx.place?.state) ps.l70nav = { ver, e };
  const y = from.y ?? 0, pts = [{ x: from.x, y, z: from.z }];
  if (!chain) return { ok: false, partial, points: [...pts, { x: to.x, y: to.y ?? 0, z: to.z }] };
  for (let i = 1; i < chain.length; i++) {
    const k = key(chain[i - 1], chain[i]), seg = Array.isArray(e[k]) ? e[k] : null, fwd = chain[i - 1] < chain[i];
    if (seg) { const s = fwd ? seg : [...seg].reverse(); for (const p of s) pts.push({ x: p[0], y: p[1], z: p[2] }); }
    else pts.push({ ...NODES[chain[i]] });
  }
  if (chain.length === 1) pts.push({ ...NODES[a] });
  const last = NODES[b]; let ok = true, snapped = false; // snapped: the anchor itself stands inside furniture or a mesh; the walk ends at its node beside it
  if (D(last, to) > 1.5) {
    let r = null, threw = false;
    try { r = findPath(ctx, last, { x: to.x, y: to.y ?? 0, z: to.z }, { radius: 0.32 }); } catch (err) { threw = true; }
    if (r?.ok && r.points?.length) for (const p of r.points) pts.push({ x: p.x, y: p.y ?? 0, z: p.z });
    else if (threw || isNavLoading(r) || r?.partial) { partial = true; pts.push({ x: to.x, y: to.y ?? 0, z: to.z }); }
    else if (D(last, to) < 8) snapped = true;
    else { ok = false; pts.push({ x: to.x, y: to.y ?? 0, z: to.z }); }
  }
  return { ok, partial, snapped, points: pts, nodes: chain };
}
