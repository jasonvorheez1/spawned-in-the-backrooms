// Level 2, "Abandoned Utility Halls": one seeded layout every script reads (geometry, sim, hounds, player).
// 24 x 24 cells of 5 m: a carved maze of tight maintenance tunnels with 45 degree corners, a few warehouse rooms,
// dead circuits in whole sectors, and the Survivors' camp at the west wall by the door home to Level 1.
import L from "./data/level2.yml";

export const N = L.cells, S = L.cellSize, H = L.height, HALF = (N * S) / 2;
export const ARRIVE = { cx: L.arrive[0], cz: L.arrive[1] };
export function hash(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * S - HALF, z: (cz + 0.5) * S - HALF });
export const cellAt = (x, z) => ({ cx: Math.floor((x + HALF) / S), cz: Math.floor((z + HALF) / S) });
const inCamp = (cx, cz) => cx >= 0 && cx <= 2 && Math.abs(cz - ARRIVE.cz) <= 1;

// open[i]: bit 1 = +x, 2 = +z, 4 = -x, 8 = -z
const open = new Uint8Array(N * N), room = new Int16Array(N * N).fill(-1);
const DIRS = [[1, 0, 1, 4], [0, 1, 2, 8], [-1, 0, 4, 1], [0, -1, 8, 2]];
function link(cx, cz, d) { const [dx, dz, a, b] = DIRS[d], nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) return; open[cz * N + cx] |= a; open[nz * N + nx] |= b; }
(() => {
  let seed = L.seed >>> 0;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seen = new Uint8Array(N * N), stack = [[ARRIVE.cx, ARRIVE.cz]]; seen[ARRIVE.cz * N + ARRIVE.cx] = 1;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const opts = [0, 1, 2, 3].filter((d) => { const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; return nx >= 0 && nz >= 0 && nx < N && nz < N && !seen[nz * N + nx]; });
    if (!opts.length) { stack.pop(); continue; }
    // long straight runs: keep going the way we came most of the time
    const d = opts[Math.floor(rnd() * opts.length)];
    link(cx, cz, d); const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1]; seen[nz * N + nx] = 1; stack.push([nx, nz]);
  }
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) if (rnd() < L.loops) link(cx, cz, Math.floor(rnd() * 2));
  for (let r = 0; r < L.rooms; r++) { // warehouse rooms: blocks with every inner wall gone
    const w = 2 + Math.floor(rnd() * 2), d = 2 + Math.floor(rnd() * 2), x0 = 4 + Math.floor(rnd() * (N - 5 - w)), z0 = 1 + Math.floor(rnd() * (N - 2 - d));
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) { room[z * N + x] = r; if (x < x0 + w - 1) link(x, z, 0); if (z < z0 + d - 1) link(x, z, 1); }
  }
  for (let x = L.hall.x0; x < L.hall.x0 + L.hall.w; x++) for (let z = L.hall.z0; z < L.hall.z0 + L.hall.d; z++) { room[z * N + x] = -1; if (x < L.hall.x0 + L.hall.w - 1) link(x, z, 0); if (z < L.hall.z0 + L.hall.d - 1) link(x, z, 1); }
  for (let cx = 0; cx <= 2; cx++) for (let cz = ARRIVE.cz - 1; cz <= ARRIVE.cz + 1; cz++) { if (cx < 2) link(cx, cz, 0); if (cz < ARRIVE.cz + 1) link(cx, cz, 1); }
})();
export const isOpen = (cx, cz, d) => cx >= 0 && cz >= 0 && cx < N && cz < N && !!(open[cz * N + cx] & DIRS[d][2]);
export const openings = (cx, cz) => [0, 1, 2, 3].filter((d) => isOpen(cx, cz, d));
export const roomOf = (cx, cz) => (cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : room[cz * N + cx]);
export const darkSector = (cx, cz) => !inCamp(cx, cz) && hash(Math.floor(cx / 4), Math.floor(cz / 4), 77) < L.darkShare;
export function zoneOf(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= N || cz >= N) return "void";
  if (inCamp(cx, cz)) return "camp";
  if (inHall(cx, cz)) return "hall";
  if (sideOf(cx, cz)) return "side";
  if (inPipes(cx, cz)) return "pipes";
  if (darkSector(cx, cz)) return "dark";
  if (roomOf(cx, cz) >= 0) return "room";
  return "tunnel";
}
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
// the ways out: the door home in the camp's west wall, the sealed stencilled door at the far east wall
export const BACK = { x: -HALF, z: cellCenter(0, ARRIVE.cz).z };
export const SEALED = { x: HALF, z: cellCenter(N - 1, 6).z };
export const L2_NAMES = { l2_tunnel: "Utility Tunnels", l2_room: "Packing Warehouse", l2_dark: "Dead Circuit", l2_camp: "Survivors' Camp", l2_side: "Side Room", l2_hall: "Boiler Hall", l2_pipes: "Pipe Maze", l2_void: "Utility Tunnels" };

// ---- the revamp: the boiler hall, the pipe maze, flickering sectors and the side rooms behind doors
const HL = L.hall, PZ = L.pipes;
export const HALL_H = HL.height, CATWALK = HL.catwalk;
export const inHall = (cx, cz) => cx >= HL.x0 && cx < HL.x0 + HL.w && cz >= HL.z0 && cz < HL.z0 + HL.d;
export const inPipes = (cx, cz) => cx >= PZ.x0 && cx < PZ.x0 + PZ.w && cz >= PZ.z0 && cz < PZ.z0 + PZ.d;
export const HALL = { x0: HL.x0 * S - HALF, x1: (HL.x0 + HL.w) * S - HALF, z0: HL.z0 * S - HALF, z1: (HL.z0 + HL.d) * S - HALF };
export const flickerSector = (cx, cz) => inPipes(cx, cz) || hash(Math.floor(cx / 4), Math.floor(cz / 4), 91) < L.flickerShare;
// SIDE: [{ cx, cz, o (the way out: 0 +x, 1 +z, 2 -x, 3 -z), type, lock, i }]; the door stands in the o edge
export const SIDE = (() => {
  const out = [], picks = [];
  for (let cz = 0; cz < N; cz++) for (let cx = 3; cx < N; cx++) {
    const o = openings(cx, cz); if (o.length !== 1 || inCamp(cx, cz) || inHall(cx, cz) || inPipes(cx, cz) || roomOf(cx, cz) >= 0) continue;
    const [dx, dz] = DIRS[o[0]]; if (inHall(cx + dx, cz + dz)) continue;
    picks.push({ cx, cz, o: o[0], r: hash(cx, cz, 4242) });
  }
  picks.sort((a, b) => a.r - b.r);
  for (const p of picks) {
    if (out.length >= L.sideRooms) break;
    if (out.some((q) => Math.max(Math.abs(q.cx - p.cx), Math.abs(q.cz - p.cz)) < 3)) continue;
    const type = L.sideOrder[out.length % L.sideOrder.length], T = L.types[type], i = out.length;
    let lock = T.lock ?? "";
    if (!lock && hash(p.cx, p.cz, 4243) < L.skillLockShare) lock = "lockpick:" + (hash(p.cx, p.cz, 4244) < 0.6 ? 25 : 50);
    out.push({ cx: p.cx, cz: p.cz, o: p.o, type, lock, i });
  }
  return out;
})();
const sideIdx = new Int16Array(N * N).fill(-1); for (const r of SIDE) sideIdx[r.cz * N + r.cx] = r.i;
export const sideOf = (cx, cz) => (cx < 0 || cz < 0 || cx >= N || cz >= N ? null : SIDE[sideIdx[cz * N + cx]] ?? null);
