// Level 2 cell steering: breadth-first walk over open utility tunnels and warehouse rooms.
import { N, cellAt, cellCenter, isOpen, zoneOf } from "./level2.js";
import { createGridPather, DIRS } from "./grid-path.js";

export function canPass2(cx, cz, d) {
  if (!isOpen(cx, cz, d)) return false;
  const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1];
  return nx >= 0 && nz >= 0 && nx < N && nz < N && zoneOf(nx, nz) !== "camp";
}

const pather = createGridPather({
  nx: N,
  cellAt,
  cellCenter,
  canStep: canPass2,
  isBlockedCell: (x, z) => zoneOf(x, z) === "camp",
});

export const stepToward = (x, z, tx, tz, maxCells = 40) => pather.stepToward(x, z, tx, tz, maxCells);
export const cellNear = pather.cellNear;
