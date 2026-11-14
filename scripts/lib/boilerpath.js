// Level 5 Boiler Room cell steering: walks between the turbines, furnaces, boilers and tanks.
import { BOILER } from "./level5.js";
import { MACHINES } from "./l5-boiler-plan.js";
import { createGridPather } from "./grid-path.js";

const NX = BOILER.nx, NZ = BOILER.nz, S = BOILER.cell;
const blocked = new Uint8Array(NX * NZ);

for (const m of MACHINES) {
  const [i0, j0, wi, wj] = m.cells;
  for (let i = i0; i < i0 + wi && i < NX; i++) {
    for (let j = j0; j < j0 + wj && j < NZ; j++) blocked[j * NX + i] = 1;
  }
}

export function cellAt(x, z) {
  return { i: Math.floor((x - BOILER.x0) / S), j: Math.floor((z - BOILER.z0) / S) };
}

export function cellCenter(i, j) {
  return { x: BOILER.x0 + S * (i + 0.5), z: BOILER.z0 + S * (j + 0.5) };
}

export function isWalkable(i, j) {
  return i >= 0 && j >= 0 && i < NX && j < NZ && !blocked[j * NX + i];
}

const pather = createGridPather({
  nx: NX,
  nz: NZ,
  coordMode: "ij",
  cellAt,
  cellCenter,
  canStep: (_i, _j, _d, ni, nj) => isWalkable(ni, nj),
  isBlockedCell: (i, j) => !isWalkable(i, j),
  recoverStart: true,
  nearestGoalOpen: "coords",
});

export const stepToward = (x, z, tx, tz, maxCells = 30) => pather.stepToward(x, z, tx, tz, maxCells);
