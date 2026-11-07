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
  for (let cx = 0; cx <= 2; cx++) for (let cz = ARRIVE.cz - 1; cz <= ARRIVE.cz + 1; cz++) { if (cx < 2) link(cx, cz, 0); if (cz < ARRIVE.cz + 1) link(cx, cz, 1); }
})();
export const isOpen = (cx, cz, d) => cx >= 0 && cz >= 0 && cx < N && cz < N && !!(open[cz * N + cx] & DIRS[d][2]);
export const openings = (cx, cz) => [0, 1, 2, 3].filter((d) => isOpen(cx, cz, d));
export const roomOf = (cx, cz) => (cx < 0 || cz < 0 || cx >= N || cz >= N ? -1 : room[cz * N + cx]);
export const darkSector = (cx, cz) => !inCamp(cx, cz) && hash(Math.floor(cx / 4), Math.floor(cz / 4), 77) < L.darkShare;
export function zoneOf(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= N || cz >= N) return "void";
  if (inCamp(cx, cz)) return "camp";
  if (darkSector(cx, cz)) return "dark";
  if (roomOf(cx, cz) >= 0) return "room";
  return "tunnel";
}
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
// the ways out: the door home in the camp's west wall, the sealed stencilled door at the far east wall
export const BACK = { x: -HALF, z: cellCenter(0, ARRIVE.cz).z };
export const SEALED = { x: HALF, z: cellCenter(N - 1, 6).z };
export const L2_NAMES = { l2_tunnel: "Utility Tunnels", l2_room: "Packing Warehouse", l2_dark: "Dead Circuit", l2_camp: "Survivors' Camp", l2_void: "Utility Tunnels" };
