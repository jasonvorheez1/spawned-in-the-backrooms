// Level 2 cell steering: a breadth-first walk over open utility tunnels and warehouse rooms,
// so hounds follow the winding pipes without hitting walls.
import { N, cellAt, cellCenter, isOpen, zoneOf } from "./level21.js";

const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(N * N);

export function canPass21(cx, cz, d) {
  if (!isOpen(cx, cz, d)) return false;
  const nx = cx + DX[d], nz = cz + DZ[d];
  if (nx < 0 || nz < 0 || nx >= N || nz >= N || false) return false;
  return true;
}

// returns { cells: path length, next: {x,z} } toward (tx,tz), or null when no way
export function stepToward(x, z, tx, tz, maxCells = 40) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (a.cx === b.cx && a.cz === b.cz) return { cells: 0, next: { x: tx, z: tz } };
  if (b.cx < 0 || b.cz < 0 || b.cx >= N || b.cz >= N) return null;
  if (a.cx < 0 || a.cz < 0 || a.cx >= N || a.cz >= N) return null;
  prev.fill(-1);
  const start = a.cz * N + a.cx, goal = b.cz * N + b.cx;
  prev[start] = start;
  const q = [start];
  let found = false;
  for (let h = 0; h < q.length && !found; h++) {
    const i = q[h], cx = i % N, cz = (i / N) | 0;
    for (let d = 0; d < 4; d++) {
      if (!canPass21(cx, cz, d)) continue;
      const nx = cx + DX[d], nz = cz + DZ[d];
      const j = nz * N + nx;
      if (prev[j] !== -1) continue;
      prev[j] = i;
      if (j === goal) { found = true; break; }
      q.push(j);
    }
  }
  if (!found) return null;
  let j = goal, n = 1;
  while (prev[j] !== start) { j = prev[j]; n++; }
  if (n > maxCells) return null;
  return { cells: n, next: cellCenter(j % N, (j / N) | 0) };
}

// a random reachable cell near (cx,cz) within r cells, filtered by ok(cx,cz)
export function cellNear(rand, cx, cz, r, ok = () => true) {
  const c = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      if (x >= 0 && z >= 0 && x < N && z < N && zoneOf(x, z) !== "camp" && ok(x, z)) {
        c.push([x, z]);
      }
    }
  }
  return c.length ? c[Math.floor(rand() * c.length)] : null;
}

