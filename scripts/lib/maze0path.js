// Level 0 cell steering: breadth-first walk over open doorways (walls and pits block, safe room forbidden).
import { N, cellAt, cellCenter, wallX, wallZ, inHub, hasPit } from "./maze.js";
import { createGridPather } from "./grid-path.js";

export function canPass0(cx, cz, d) {
  if (d === 0) return cx < N - 1 && !wallX(cx, cz);
  if (d === 1) return cz < N - 1 && !wallZ(cx, cz);
  if (d === 2) return cx > 0 && !wallX(cx - 1, cz);
  if (d === 3) return cz > 0 && !wallZ(cx, cz - 1);
  return false;
}

const pather = createGridPather({
  nx: N,
  cellAt,
  cellCenter,
  canStep: canPass0,
  isBlockedCell: (x, z) => inHub(x, z) || hasPit(x, z),
  enforceMaxDuringBfs: true,
  cacheLimit: 256,
  // aim 0.65 of the way toward the next cell's centre so doorway pillars never catch the mover
  nextPoint: (ax, az, nxx, nxz) => {
    const ac = cellCenter(ax, az), bc = cellCenter(nxx, nxz);
    return { x: ac.x + (bc.x - ac.x) * 0.65, z: ac.z + (bc.z - ac.z) * 0.65 };
  },
});

export const stepToward = (x, z, tx, tz, maxCells = 35) => pather.stepToward(x, z, tx, tz, maxCells);
export const cellNear = pather.cellNear;
