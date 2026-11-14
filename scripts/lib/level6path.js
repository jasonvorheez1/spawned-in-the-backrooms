// Level 6 "Lights Out" corridor navigation: BFS over the carved corridor tree.
import { W, H, C, cx, cz, plan } from "./level6.js";
import { createGridPather } from "./grid-path.js";

export function cellAt(x, z) {
  return {
    i: Math.max(0, Math.min(W - 1, Math.round(x / C + (W - 1) / 2))),
    j: Math.max(0, Math.min(H - 1, Math.round(z / C + (H - 1) / 2))),
  };
}

export function cellCenter(i, j) {
  return { x: cx(i), z: cz(j) };
}

export function isWalkable(i, j) {
  if (i < 0 || j < 0 || i >= W || j >= H) return false;
  const { open } = plan();
  return !!open[i]?.[j];
}

const pather = createGridPather({
  nx: W,
  nz: H,
  coordMode: "ij",
  cellAt,
  cellCenter,
  canStep: (_i, _j, _d, ni, nj) => isWalkable(ni, nj),
  isBlockedCell: (i, j) => !isWalkable(i, j),
  recoverStart: true,
  nearestGoalOpen: "startCell",
  partialFallback: true,
  maxQueueFactor: 4,
});

export const stepToward6 = (x, z, tx, tz, maxCells = 35) => pather.stepToward(x, z, tx, tz, maxCells);
