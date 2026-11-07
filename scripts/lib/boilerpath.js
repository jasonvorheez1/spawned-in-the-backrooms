// Level 5 Boiler Room cell steering: walks between the turbines, furnaces, boilers and tanks,
// so entities in the Boiler Room flank and pursue through aisles instead of walking into machines.
import { BOILER } from "./level5.js";
import { MACHINES } from "./l5-boiler-plan.js";

const NX = BOILER.nx, NZ = BOILER.nz, S = BOILER.cell;
const blocked = new Uint8Array(NX * NZ);

// Mark machine footprints
for (const m of MACHINES) {
  const [i0, j0, wi, wj] = m.cells;
  for (let i = i0; i < i0 + wi && i < NX; i++) {
    for (let j = j0; j < j0 + wj && j < NZ; j++) {
      blocked[j * NX + i] = 1;
    }
  }
}

export function cellAt(x, z) {
  return {
    i: Math.floor((x - BOILER.x0) / S),
    j: Math.floor((z - BOILER.z0) / S),
  };
}

export function cellCenter(i, j) {
  return {
    x: BOILER.x0 + S * (i + 0.5),
    z: BOILER.z0 + S * (j + 0.5),
  };
}

export function isWalkable(i, j) {
  return i >= 0 && j >= 0 && i < NX && j < NZ && !blocked[j * NX + i];
}

const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(NX * NZ);

// returns { cells: path length, next: {x,z} } toward (tx,tz), or null when no way
export function stepToward(x, z, tx, tz, maxCells = 30) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (a.i === b.i && a.j === b.j) return { cells: 0, next: { x: tx, z: tz } };
  if (!isWalkable(a.i, a.j)) {
    // If starting inside a machine boundary, step to nearest open neighbor
    for (let d = 0; d < 4; d++) {
      if (isWalkable(a.i + DX[d], a.j + DZ[d])) return { cells: 1, next: cellCenter(a.i + DX[d], a.j + DZ[d]) };
    }
  }
  let targetI = b.i, targetJ = b.j;
  if (!isWalkable(targetI, targetJ)) {
    // Find closest walkable cell to goal
    let bestD = Infinity, best = null;
    for (let d = 0; d < 4; d++) {
      const ni = b.i + DX[d], nj = b.j + DZ[d];
      if (isWalkable(ni, nj)) {
        const cc = cellCenter(ni, nj), dist = Math.hypot(cc.x - tx, cc.z - tz);
        if (dist < bestD) { bestD = dist; best = [ni, nj]; }
      }
    }
    if (!best) return null;
    targetI = best[0]; targetJ = best[1];
  }
  prev.fill(-1);
  const start = a.j * NX + a.i, goal = targetJ * NX + targetI;
  if (start < 0 || start >= NX * NZ) return null;
  prev[start] = start;
  const q = [start];
  let found = false;
  for (let h = 0; h < q.length && !found; h++) {
    const k = q[h], ci = k % NX, cj = (k / NX) | 0;
    for (let d = 0; d < 4; d++) {
      const ni = ci + DX[d], nj = cj + DZ[d];
      if (!isWalkable(ni, nj)) continue;
      const j = nj * NX + ni;
      if (prev[j] !== -1) continue;
      prev[j] = k;
      if (j === goal) { found = true; break; }
      q.push(j);
    }
  }
  if (!found) return null;
  let j = goal, n = 1;
  while (prev[j] !== start) { j = prev[j]; n++; }
  if (n > maxCells) return null;
  return { cells: n, next: cellCenter(j % NX, (j / NX) | 0) };
}

