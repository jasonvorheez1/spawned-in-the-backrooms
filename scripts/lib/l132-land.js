// Level 132 · the countryside and the town's edge: ten cottages with gardens, the LUMIRIA gate and dry-stone wall, five fingerposts,
// the windmill, hay bales, oaks and orchards, warning posts at the chalk edge. Roads and meadow: places/level132/config.yaml terrain marks/decorations.
// lay(ctx, L) builds in stages, one a second (ctx.place.state.landStage), then stamps ctx.place.state.landV. Numbers: data/l132-land.yml.
import { animate } from "builtin/tween";
import D from "./data/l132-land.yml";
const toC = (p) => (Math.atan2(p.x, p.z) * 180) / Math.PI; // yaw that points -Z at the centre
const hid = (w, h, d) => ({ primitive: { kind: "box", width: w, height: h, depth: d }, visible: false });
const BOX = { body: "static", collider: "box" };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function roadDist(L, x, z) {
  let best = 1e9;
  for (const k in L.roads) { const P = L.roads[k]; for (let i = 0; i + 1 < P.length; i++) {
    const ax = P[i][0], az = P[i][1], dx = P[i + 1][0] - ax, dz = P[i + 1][1] - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  } }
  return best;
}
let TREES = null;
function trees(L) {
  if (TREES) return TREES;
  const T = D.trees, R = rng(T.seed), out = [];
  const ok = (x, z) => { const r = Math.hypot(x, z); return r > 68 && r < 345 && roadDist(L, x, z) > T.roadClear && Math.hypot(x - L.keep.x, z - L.keep.z) > 52 && Math.hypot(x - D.mill.x, z - D.mill.z) > 20; };
  const add = (kind, x, z, s) => { if (ok(x, z)) out.push([kind, +x.toFixed(1), +z.toFixed(1), +s.toFixed(2), Math.round(R() * 360)]); };
  for (const c of T.copses) for (let i = 0; i < T.perCopse; i++) { const a = R() * 6.283, d = Math.sqrt(R()) * T.copseR; add("oak", c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, 0.75 + R() * 0.5); }
  for (const o of T.orchards) { const yaw = R() * 3.14, cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const u = (i - 1.5) * 7 + R() - 0.5, v = (j - 1) * 7 + R() - 0.5; add((i + j) % 2 ? "pear" : "apple", o[0] + u * cs - v * sn, o[1] + u * sn + v * cs, 0.85 + R() * 0.3); } }
  for (let i = 0; i < T.loose; i++) { const a = R() * 6.283, d = 80 + Math.sqrt(R()) * 260; add(R() < 0.8 ? "oak" : "apple", Math.cos(a) * d, Math.sin(a) * d, 0.8 + R() * 0.5); }
  return (TREES = out);
}
function town(ctx, L) {
  const M = D.models, G = L.ground ?? 0, put = (id, spec) => ctx.spawn(id, spec);
  D.cottages.forEach((c, i) => {
    const p = { x: c[0], z: c[1] }, r = Math.hypot(p.x, p.z), yaw = toC(p), ux = -p.x / r, uz = -p.z / r, f = D.depth[c[2]] / 2 + D.garden.off;
    put("l132-cottage-" + i, { feetPosition: { x: p.x, y: G, z: p.z }, rotation: { yaw }, model: { id: M[c[2]] }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land", "l132-cottage"] });
    put("l132-garden-" + i, { feetPosition: { x: +(p.x + ux * f + uz * c[4]).toFixed(2), y: G, z: +(p.z + uz * f - ux * c[4]).toFixed(2) }, rotation: { yaw }, model: { id: M[c[3]] }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land"] });
  });
  const g = D.gate;
  put("l132-gate", { feetPosition: { x: g.x, y: G, z: g.z }, rotation: { yaw: g.yaw }, model: { id: M.gate }, castShadow: true, receiveShadow: true, tags: ["l132-land"] });
  for (const s of [-1, 1]) put("l132-gate-col-" + (s < 0 ? "w" : "e"), { ...hid(g.post[1], g.post[2], g.post[1]), feetPosition: { x: g.x + s * g.post[0], y: G, z: g.z }, physics: "static" });
  D.wall.angles.forEach((a, i) => { for (const s of [-1, 1]) { const t = (s * a * Math.PI) / 180, p = { x: +(D.wall.r * Math.sin(t)).toFixed(2), z: +(D.wall.r * Math.cos(t)).toFixed(2) };
    put(`l132-wall-${s < 0 ? "w" : "e"}${i}`, { feetPosition: { x: p.x, y: G, z: p.z }, rotation: { yaw: toC(p) }, model: { id: M.wall }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land"] }); } });
  D.posts.forEach((q) => { const p = { x: q[1], z: q[2] };
    put("l132-post-" + q[0].slice(2), { feetPosition: { x: p.x, y: G, z: p.z }, rotation: { yaw: toC(p) }, model: { id: M[q[0]] }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land", "l132-fingerpost"], state: { name: q[3] } }); });
}
function fields(ctx, L) {
  const M = D.models, put = (id, spec) => ctx.spawn(id, spec), m = D.mill, mp = { x: m.x, z: m.z }, r = Math.hypot(m.x, m.z), yaw = toC(mp);
  put("l132-mill", { feetPosition: { x: m.x, y: { terrain: -m.sink }, z: m.z }, rotation: { yaw }, model: { id: M.mill }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land"] });
  put("l132-mill-sails", { feetPosition: { x: +(m.x - (m.x / r) * m.out).toFixed(2), y: { terrain: m.hubY - m.sailR - m.sink }, z: +(m.z - (m.z / r) * m.out).toFixed(2) }, rotation: { yaw, pitch: 0, roll: 0 }, pivot: "center", model: { id: M.sails }, castShadow: true, tags: ["l132-land"] });
  Object.keys(L.roads).forEach((k) => { const e = L.roads[k][L.roads[k].length - 1], d = Math.hypot(e[0], e[1]), p = { x: +((e[0] / d) * D.warn.r).toFixed(1), z: +((e[1] / d) * D.warn.r).toFixed(1) };
    put("l132-warn-" + k, { feetPosition: { x: p.x, y: { terrain: -D.warn.sink }, z: p.z }, rotation: { yaw: toC(p) }, model: { id: M.warn }, physics: BOX, castShadow: true, tags: ["l132-land", "l132-warnpost"] }); });
  let R = rng(7);
  D.bales.forEach((b, i) => put("l132-bale-" + i, { feetPosition: { x: b[0], y: { terrain: -0.07 }, z: b[1] }, rotation: { yaw: Math.round(R() * 360) }, model: { id: M.bale }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land"] }));
}
function wood(ctx, L, from, to) {
  const T = trees(L), M = D.models;
  for (let i = from; i < Math.min(to, T.length); i++) { const t = T[i], oak = t[0] === "oak", near = Math.hypot(t[1], t[2]) < D.trees.shadowR;
    ctx.spawn("l132-tree-" + i, { feetPosition: { x: t[1], y: { terrain: -0.15 }, z: t[2] }, rotation: { yaw: t[4] }, scale: t[3], model: { id: M[t[0]] }, castShadow: near, receiveShadow: false, tags: ["l132-land", "l132-landtree"] });
    ctx.spawn("l132-tree-col-land-" + i, { primitive: { kind: "cylinder", radius: (oak ? 0.55 : 0.22) * t[3], height: 3 }, visible: false, feetPosition: { x: t[1], y: { terrain: -0.2 }, z: t[2] }, physics: "static" }); }
}
// the cliff rim: a ring of unseen colliders (nobody walks off), and a run of dry-stone wall at each road's bearing, a lookout over the sea
function edge(ctx, L) {
  const E = D.edge, M = D.models, put = (id, spec) => ctx.spawn(id, spec);
  for (let i = 0; i < E.ring; i++) { const t = (i / E.ring) * 2 * Math.PI, p = { x: +(E.r * Math.sin(t)).toFixed(2), z: +(E.r * Math.cos(t)).toFixed(2) }, w = 2 * (E.r + 0.6) * Math.sin(Math.PI / E.ring) + 0.6;
    put("l132-rim-col-" + i, { ...hid(+w.toFixed(2), E.height, 1), feetPosition: { x: p.x, y: { terrain: -1 }, z: p.z }, rotation: { yaw: toC(p) }, physics: "static", tags: ["l132-land"] }); }
  Object.keys(L.roads).forEach((k) => { const e = L.roads[k][L.roads[k].length - 1], a0 = Math.atan2(e[0], e[1]), step = E.seg / E.r;
    for (let j = 0; j < E.perLookout; j++) { const t = a0 + (j - (E.perLookout - 1) / 2) * step, p = { x: +(E.r * Math.sin(t)).toFixed(2), z: +(E.r * Math.cos(t)).toFixed(2) };
      put(`l132-rim-${k}-${j}`, { feetPosition: { x: p.x, y: { terrain: -E.sink }, z: p.z }, rotation: { yaw: toC(p) + (j % 3) - 1 }, model: { id: M.wall }, physics: BOX, castShadow: true, receiveShadow: true, tags: ["l132-land", "l132-rim"] }); } });
}
export function lay(ctx, L) {
  const st = ctx.place.state;
  if (st.landEdgeV !== D.edge.v) { edge(ctx, L); st.landEdgeV = D.edge.v; }
  if (st.landV === D.v) return;
  const s = st.landStage ?? 0, n = trees(L).length, C = D.trees.chunk;
  if (s === 0) town(ctx, L); else if (s === 1) fields(ctx, L); else wood(ctx, L, (s - 2) * C, (s - 1) * C);
  if (s >= 2 && (s - 1) * C >= n) { st.landV = D.v; st.landStage = 0; st.landTrees = n; } else st.landStage = s + 1;
}
let spun = false;
export function tick(ctx, L) {
  if (spun || !ctx.getObject("l132-mill-sails")) return;
  spun = true; // one endless turn per machine; the tween rides the room's clock
  animate(ctx, "l132-mill-sails", { "rotation.roll": "+=360" }, { duration: D.mill.turn, easing: "linear", loop: true });
}
