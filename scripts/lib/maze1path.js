// Level 1 cell steering: breadth-first walk over open halls and push doors.
import { N, S, HALF, cellAt, cellCenter, zoneOf, safeZone, edge } from "./level1.js";
import { createGridPather, DIRS } from "./grid-path.js";

export function canPass1(cx, cz, d) {
  const nx = cx + DIRS[d][0], nz = cz + DIRS[d][1];
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
    const minX = Math.min(cx, nx), e = edge(minX, cz, "x");
    if (e && e.door != null) return { x: (minX + 1) * S - HALF, z: cz * S - HALF + e.door };
  } else if (cz !== nz) {
    const minZ = Math.min(cz, nz), e = edge(cx, minZ, "z");
    if (e && e.door != null) return { x: cx * S - HALF + e.door, z: (minZ + 1) * S - HALF };
  }
  return null;
}

const pather = createGridPather({
  nx: N,
  cellAt,
  cellCenter,
  canStep: canPass1,
  isBlockedCell: (x, z) => safeZone(zoneOf(x, z)),
  nextPoint: (ax, az, nxx, nxz) => doorPoint1(ax, az, nxx, nxz) ?? cellCenter(nxx, nxz),
});

export const stepToward = (x, z, tx, tz, maxCells = 35) => pather.stepToward(x, z, tx, tz, maxCells);
export const cellNear = pather.cellNear;
