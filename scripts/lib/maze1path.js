// Level 1 cell steering: a breadth-first walk over open halls and push doors,
// so hounds and skin-stealers navigate storage racks and warehouse walls without hitting walls.
import { N, S, HALF, cellAt, cellCenter, zoneOf, safeZone, edge } from "./level1.js";

const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(N * N);

export function canPass1(cx, cz, d) {
  const nx = cx + DX[d], nz = cz + DZ[d];
  if (nx < 0 || nz < 0 || nx >= N || nz >= N || safeZone(zoneOf(nx, nz))) return false;
  if (d === 0) { const e = edge(cx, cz, "x"); return e === null || e.door !== null; }
  if (d === 1) { const e = edge(cx, cz, "z"); return e === null || e.door !== null; }
  if (d === 2) { const e = edge(cx - 1, cz, "x"); return e === null || e.door !== null; }
  if (d === 3) { const e = edge(cx, cz - 1, "z"); return e === null || e.door !== null; }
  return false;
}

// returns doorway point if edge between (cx,cz) and (nx,nz) has a door, else null
export function doorPoint1(cx, cz, nx, nz) {
  if (cx !== nx) {
    const minX = Math.min(cx, nx);
    const e = edge(minX, cz, "x");
    if (e && e.door != null) {
      return { x: (minX + 1) * S - HALF, z: cz * S - HALF + e.door };
    }
  } else if (cz !== nz) {
    const minZ = Math.min(cz, nz);
    const e = edge(cx, minZ, "z");
    if (e && e.door != null) {
      return { x: cx * S - HALF + e.door, z: (minZ + 1) * S - HALF };
    }
  }
  return null;
}

// returns { cells: path length, next: {x,z} } toward (tx,tz), or null when no way
export function stepToward(x, z, tx, tz, maxCells = 35) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (a.cx === b.cx && a.cz === b.cz) return { cells: 0, next: { x: tx, z: tz } };
  if (safeZone(zoneOf(b.cx, b.cz)) || b.cx < 0 || b.cz < 0 || b.cx >= N || b.cz >= N) return null;
  if (a.cx < 0 || a.cz < 0 || a.cx >= N || a.cz >= N) return null;
  prev.fill(-1);
  const start = a.cz * N + a.cx, goal = b.cz * N + b.cx;
  prev[start] = start;
  const q = [start];
  let found = false;
  for (let h = 0; h < q.length && !found; h++) {
    const i = q[h], cx = i % N, cz = (i / N) | 0;
    for (let d = 0; d < 4; d++) {
      if (!canPass1(cx, cz, d)) continue;
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
  const nextCx = j % N, nextCz = (j / N) | 0;
  const door = doorPoint1(a.cx, a.cz, nextCx, nextCz);
  return { cells: n, next: door ?? cellCenter(nextCx, nextCz) };
}

// a random reachable cell near (cx,cz) within r cells, filtered by ok(cx,cz)
export function cellNear(rand, cx, cz, r, ok = () => true) {
  const c = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      if (x >= 0 && z >= 0 && x < N && z < N && !safeZone(zoneOf(x, z)) && ok(x, z)) {
        c.push([x, z]);
      }
    }
  }
  return c.length ? c[Math.floor(rand() * c.length)] : null;
}

