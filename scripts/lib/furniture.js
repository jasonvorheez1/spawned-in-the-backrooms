// Searchable furniture: the loot that used to sit in crates now lives in what a place would really hold
// (filing cabinets and dropped backpacks on Level 0, bins and lockers on Level 1, fuse cabinets and a dead
// worker's satchel on Level 3). Kinds in data/furniture-loot.yml; Level 2 keeps its own (spawnContainerL2).
// Everything stands back-to-a-wall facing out. Contract kept for interact.js: tag "container", state.items, state.name, state.lock.
import D from "./data/furniture-loot.yml";
import L2 from "./data/level2.yml";
import B from "./data/breakables.yml";
import { rollItem, rollItemL1, rollLock } from "./loot.js";
import { rollTableL3 } from "./loot3.js";
import * as M0 from "./maze.js";
import * as M1 from "./level1.js";
import * as M3 from "./level3.js";

export const sizeOf = (kind) => D.kinds[kind]?.size ?? L2.containers[kind]?.size ?? [0.6, 0.6, 0.6];
const ROLL = { main: (ctx) => rollItem(ctx), level1: (ctx) => rollItemL1(ctx), level3: (ctx, t) => rollTableL3(ctx, t) };

// a kind for this level by its weights; r is 0..1
export function pickKind(level, r) {
  const E = Object.entries(D.levels[level] ?? {}), tot = E.reduce((a, [, w]) => a + w, 0);
  let x = r * tot; for (const [k, w] of E) { x -= w; if (x <= 0) return k; }
  return E[0][0];
}

// spot = { x, z, dx, dz }: a point on the wall's face and the unit direction INTO the wall. along: metres slid along it.
export function spawnFurniture(ctx, level, kind, spot, opts = {}) {
  const K = D.kinds[kind], [w, , d] = sizeOf(kind), lk = opts.noLock ? null : rollLock(ctx);
  const back = d / 2 + 0.015, x = spot.x - spot.dx * back, z = spot.z - spot.dz * back;
  const yaw = Math.round(Math.atan2(spot.dx, spot.dz) * 180 / Math.PI);
  const table = opts.table ?? D.tables3[kind] ?? "crate";
  const n = K.n[0] + Math.floor(ctx.random() * (K.n[1] - K.n[0] + 1)) + (lk ? lk.bonus : 0) + (opts.bonus ?? 0), items = [];
  for (let i = 0; i < n; i++) items.push(ROLL[level](ctx, table));
  const hp = Math.round((B.materials[K.mat]?.hp ?? 80) * 0.5), name = opts.name ?? K.name;
  return ctx.spawn({ tags: ["container", "furniture", "lootfurn", "breakable"], feetPosition: { x, y: (spot.y ?? 0.01) + (K.y ?? 0), z }, rotation: { yaw }, physics: { body: "static", collider: "box" },
    primitive: { kind: "scripted", script: K.geo === "l2" ? "scripts/l2-props-geo.js" : "scripts/loot-bags-geo.js", params: { kind, seed: Math.floor(ctx.random() * 1000) } },
    state: { kind, mat: K.mat, hp, maxHp: hp, name: lk ? `${name} (locked)` : name, items: items.join(","), ...(lk ? { lock: lk.lock } : {}), ...(opts.state ?? {}) } });
}

// the face point of side d of a cell (0 +x, 1 +z, 2 -x, 3 -z), slid `along` metres; T = half wall thickness
const DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function face(c, S, T, d, along) { const [dx, dz] = DIR[d]; return { x: c.x + dx * (S / 2 - T) - dz * along, z: c.z + dz * (S / 2 - T) + dx * along, dx, dz }; }
const slide = (S, T, w, r, pad = 0.08) => (r - 0.5) * 2 * Math.max(0, S / 2 - T - w / 2 - pad);

// Level 0: a solid wall of cell (cx, cz) that is not an arch, not broken; null when the cell has none
export function wallSpot0(ctx, cx, cz, kind, r1, r2) {
  const br = ctx.place.state?.broken ?? {}, T = 0.1, [w] = sizeOf(kind);
  const sides = [[0, "x:" + cx + ":" + cz, M0.wallX(cx, cz), "x", cx, cz], [1, "z:" + cx + ":" + cz, M0.wallZ(cx, cz), "z", cx, cz], [2, "x:" + (cx - 1) + ":" + cz, M0.wallX(cx - 1, cz), "x", cx - 1, cz], [3, "z:" + cx + ":" + (cz - 1), M0.wallZ(cx, cz - 1), "z", cx, cz - 1]]
    .filter(([, key, solid, ax, a, b]) => solid && !br[key] && !M0.isArchWall(a, b, ax));
  if (!sides.length) return null;
  const d = sides[Math.floor(r1 * sides.length)][0];
  return face(M0.cellCenter(cx, cz), M0.S, T, d, slide(M0.S, T, w, r2, 0.25));
}

// Level 1: a wall (corridor block or outer) of cell (cx, cz), clear of its door gap and the corner pillars
export function wallSpot1(cx, cz, kind, r1, r2) {
  const S = M1.S, T = 0.12, [w] = sizeOf(kind);
  const E = [[0, M1.edge(cx, cz, "x")], [1, M1.edge(cx, cz, "z")], [2, M1.edge(cx - 1, cz, "x")], [3, M1.edge(cx, cz - 1, "z")]].filter(([, e]) => e);
  if (!E.length) return null;
  const [d, e] = E[Math.floor(r1 * E.length)];
  let t = 0.9 + w / 2 + r2 * (S - 1.8 - w); // metres from the edge's start
  if (e.door != null && Math.abs(t - e.door) < M1.DOOR / 2 + w / 2 + 0.3) t = e.door < S / 2 ? Math.min(S - 0.9 - w / 2, e.door + M1.DOOR / 2 + w / 2 + 0.4) : Math.max(0.9 + w / 2, e.door - M1.DOOR / 2 - w / 2 - 0.4);
  const along = (t - S / 2) * (d === 0 || d === 3 ? 1 : -1); // the edge runs +z (x sides) or +x (z sides)
  return face(M1.cellCenter(cx, cz), S, T, d, along);
}

// Level 3: a closed side (no opening, no bars) of cell (cx, cz)
export function wallSpot3(cx, cz, kind, r1, r2) {
  if (M3.zoneOf(cx, cz) === "tight") return null; // a crawl hall's walls stand 0.5 m from its centre: nothing fits against them
  const T = 0.3, [w] = sizeOf(kind), sides = [0, 1, 2, 3].filter((d) => !M3.isOpen(cx, cz, d) && !M3.isBars(cx, cz, d));
  if (!sides.length) return null;
  return face(M3.cellCenter(cx, cz), M3.S, T, sides[Math.floor(r1 * sides.length)], slide(M3.S, T, w, r2));
}
