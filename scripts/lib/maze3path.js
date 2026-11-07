// Level 3 cell steering: a breadth-first walk over the maze's open edges (bars and walls block),
// so anything flying or running the halls goes centre to centre through real openings.
import { N, cellAt, cellCenter, isOpen, inGamma } from "./level3.js";
const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(N * N);
// returns { cells: path length, next: {x,z} } toward (tx,tz), or null when no way (gamma never entered)
export function stepToward(x, z, tx, tz, maxCells = 40) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (a.cx === b.cx && a.cz === b.cz) return { cells: 0, next: { x: tx, z: tz } };
  if (inGamma(b.cx, b.cz) || b.cx < 0 || b.cz < 0 || b.cx >= N || b.cz >= N) return null;
  prev.fill(-1); const start = a.cz * N + a.cx, goal = b.cz * N + b.cx;
  if (start < 0 || start >= N * N) return null;
  prev[start] = start; const q = [start]; let found = false;
  for (let h = 0; h < q.length && !found; h++) {
    const i = q[h], cx = i % N, cz = (i / N) | 0;
    for (let d = 0; d < 4; d++) {
      if (!isOpen(cx, cz, d)) continue;
      const nx = cx + DX[d], nz = cz + DZ[d], j = nz * N + nx;
      if (prev[j] !== -1 || inGamma(nx, nz)) continue;
      prev[j] = i; if (j === goal) { found = true; break; } q.push(j);
    }
  }
  if (!found) return null;
  let j = goal, n = 1; while (prev[j] !== start) { j = prev[j]; n++; }
  if (n > maxCells) return null;
  return { cells: n, next: cellCenter(j % N, (j / N) | 0) };
}
// a random reachable cell near (cx,cz) within r cells, filtered by ok(cx,cz)
export function cellNear(rand, cx, cz, r, ok = () => true) {
  const c = [];
  for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) if (x >= 0 && z >= 0 && x < N && z < N && !inGamma(x, z) && ok(x, z)) c.push([x, z]);
  return c.length ? c[Math.floor(rand() * c.length)] : null;
}
