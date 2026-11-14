// Level 3 cell steering: breadth-first walk over open edges (gamma never entered).
import { N, cellAt, cellCenter, isOpen, inGamma } from "./level3.js";
import { createGridPather } from "./grid-path.js";

const pather = createGridPather({
  nx: N,
  cellAt,
  cellCenter,
  canStep: (cx, cz, d, nx, nz) => isOpen(cx, cz, d) && !inGamma(nx, nz),
  isBlockedCell: (x, z) => inGamma(x, z),
});

export const stepToward = (x, z, tx, tz, maxCells = 40) => pather.stepToward(x, z, tx, tz, maxCells);
export const cellNear = pather.cellNear;
