// Level 2.1 "Locked": one seeded layout every script reads (geometry, sim, hounds, player).
// 30 x 30 cells of 4 m: a carved maze of storage halls (thin walls, 3.1 m ceilings), named rooms with their inner walls gone, a wide lane of
// rock-cut tunnels (The Edges) running east to a cave mouth in the far wall, and the stairwell down to Level 2 at the west end.
import L from "./data/level21.yml";

export const N = L.cells, S = L.cellSize, H = L.height, HALF = (N * S) / 2;
export const hash = (x, z, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * S - HALF, z: (cz + 0.5) * S - HALF });
export const cellAt = (x, z) => ({ cx: Math.floor((x + HALF) / S), cz: Math.floor((z + HALF) / S) });
export const ARRIVE = { cx: L.arrive[0], cz: L.arrive[1] };
export const EDGE_X = L.edgeX, LANE = L.lane;
export const laneCell = (cx, cz) => cx >= EDGE_X && cz >= LANE.z0 && cz < LANE.z0 + LANE.d;

// open bits: 1 = +x, 2 = +z, 4 = -x, 8 = -z
const open = new Uint8Array(N * N), roomIdx = new Int16Array(N * N).fill(-1);
const DIRS = [[1, 0, 1, 4], [0, 1, 2, 8], [-1, 0, 4, 1], [0, -1, 8, 2]];
function link(cx, cz, d) { const [dx, dz, a, b] = DIRS[d], nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) return; open[cz * N + cx] |= a; open[nz * N + nx] |= b; }
export const ROOMS = L.rooms.map((r, i) => ({ ...r, i }));
(() => {
  let seed = L.seed >>> 0;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seen = new Uint8Array(N * N), stack = [[L.arrive[0], L.arrive[1]]]; seen[L.arrive[1] * N + L.arrive[0]] = 1;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const opts = [0, 1, 2, 3].filter((d) => { const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; return nx >= 0 && nz >= 0 && nx < N && nz < N && !seen[nz * N + nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const d = opts[Math.floor(rnd() * opts.length)];
    link(cx, cz, d); const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; seen[nz * N + nx] = 1; stack.push([nx, nz]);
  }
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) if (rnd() < L.loops) link(cx, cz, Math.floor(rnd() * 2));
  for (const r of ROOMS) for (let x = r.x0; x < r.x0 + r.w; x++) for (let z = r.z0; z < r.z0 + r.d; z++) { roomIdx[z * N + x] = r.i; if (x < r.x0 + r.w - 1) link(x, z, 0); if (z < r.z0 + r.d - 1) link(x, z, 1); }
  // the lane: three cells wide, open all the way to the east wall
  for (let x = EDGE_X; x < N; x++) for (let z = LANE.z0; z < LANE.z0 + LANE.d; z++) { if (x < N - 1) link(x, z, 0); if (z < LANE.z0 + LANE.d - 1) link(x, z, 1); }
  link(L.arrive[0], L.arrive[1], 0); // the landing opens into the base atrium
})();
export const isOpen = (cx, cz, d) => cx >= 0 && cz >= 0 && cx < N && cz < N && !!(open[cz * N + cx] & DIRS[d][2]);
export const openings = (cx, cz) => [0, 1, 2, 3].filter((d) => isOpen(cx, cz, d));
export const roomAt = (cx, cz) => (cx < 0 || cz < 0 || cx >= N || cz >= N || roomIdx[cz * N + cx] < 0 ? null : ROOMS[roomIdx[cz * N + cx]]);
export function zoneOf(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= N || cz >= N) return "void";
  if (cx <= 1 && cz === ARRIVE.cz) return "landing";
  const r = roomAt(cx, cz); if (r) return r.type;
  if (laneCell(cx, cz)) return "edge";
  if (cx >= EDGE_X) return "edgecave";
  return "hall";
}
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
export const isEdge = (cx, cz) => cx >= EDGE_X;
export const heightOf = (cx, cz) => (cx < 0 || cz < 0 || cx >= N || cz >= N ? H : isEdge(cx, cz) ? L.edgeHeight : zoneOf(cx, cz) === "base" ? H + 0.5 : H);
// the ways out: the stairwell down to Level 2 in the west wall; the cave mouth in the east wall (the lane's middle row)
export const DOWN = { x: -HALF, z: cellCenter(0, ARRIVE.cz).z };
export const CAVE = { x: HALF, z: cellCenter(N - 1, LANE.z0 + 1).z };
export const L21_NAMES = { l21_landing: "Stairwell Landing", l21_hall: "The Halls", l21_base: "M.E.G. Base Alef", l21_explo: "Exploration Wing", l21_bunks: "Quarters", l21_office: "Administration", l21_lockers: "Locker Room", l21_restroom: "Restroom", l21_fridges: "Refrigerator Paradise", l21_store: "Storage Room", l21_break: "Break Room", l21_edge: "The Edges", l21_edgecave: "The Edges", l21_void: "The Halls" };
