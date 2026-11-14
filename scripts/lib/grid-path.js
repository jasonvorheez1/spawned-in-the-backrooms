// Shared 4-neighbor grid BFS pathfinder used by cell-based level pathers (Levels 0, 1, 2, 2.1, 3, 5 Boiler, 6).
export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function createGridPather({
  nx,
  nz = nx,
  coordMode = "cx",
  cellAt,
  cellCenter,
  canStep,
  isBlockedCell = () => false,
  nearBlocked = isBlockedCell,
  recoverStart = false,
  nearestGoalOpen = null, // null | "coords" | "startCell"
  partialFallback = false,
  enforceMaxDuringBfs = false,
  maxQueueFactor = Infinity,
  nextPoint = (_ax, _az, nxCell, nzCell) => cellCenter(nxCell, nzCell),
  cacheLimit = 0,
}) {
  const size = nx * nz;
  const prev = new Int16Array(size);
  const depth = enforceMaxDuringBfs ? new Int16Array(size) : null;
  const routes = cacheLimit > 0 ? new Map() : null;
  const colOf = (c) => (coordMode === "ij" ? c.i : c.cx);
  const rowOf = (c) => (coordMode === "ij" ? c.j : c.cz);
  const inBounds = (x, z) => x >= 0 && z >= 0 && x < nx && z < nz;

  function search(x, z, tx, tz, maxCells) {
    const a = cellAt(x, z), b = cellAt(tx, tz);
    const ax = colOf(a), az = rowOf(a);
    let bx = colOf(b), bz = rowOf(b);
    if (ax === bx && az === bz) return { cells: 0, next: { x: tx, z: tz } };

    if (!inBounds(ax, az) || isBlockedCell(ax, az)) {
      if (recoverStart) {
        for (let d = 0; d < 4; d++) {
          const sx = ax + DIRS[d][0], sz = az + DIRS[d][1];
          if (inBounds(sx, sz) && !isBlockedCell(sx, sz)) return { cells: 1, next: cellCenter(sx, sz) };
        }
      }
      return null;
    }

    if (!inBounds(bx, bz) || isBlockedCell(bx, bz)) {
      if (!nearestGoalOpen) return null;
      let bestD = Infinity, bestX = -1, bestZ = -1;
      for (let d = 0; d < 4; d++) {
        const sx = bx + DIRS[d][0], sz = bz + DIRS[d][1];
        if (!inBounds(sx, sz) || isBlockedCell(sx, sz)) continue;
        const dist = nearestGoalOpen === "coords"
          ? (() => { const cc = cellCenter(sx, sz); return Math.hypot(cc.x - tx, cc.z - tz); })()
          : Math.hypot(sx - ax, sz - az);
        if (dist < bestD) { bestD = dist; bestX = sx; bestZ = sz; }
      }
      if (bestX < 0) return null;
      bx = bestX; bz = bestZ;
    }

    prev.fill(-1);
    const start = az * nx + ax, goal = bz * nx + bx;
    prev[start] = start;
    if (depth) depth[start] = 0;
    const q = [start];
    let found = false;

    for (let h = 0; h < q.length && !found; h++) {
      const curr = q[h], cx = curr % nx, cz = (curr / nx) | 0;
      if (depth && depth[curr] >= maxCells) continue;
      for (let d = 0; d < 4; d++) {
        const sx = cx + DIRS[d][0], sz = cz + DIRS[d][1];
        if (!inBounds(sx, sz) || isBlockedCell(sx, sz)) continue;
        if (canStep && !canStep(cx, cz, d, sx, sz)) continue;
        const j = sz * nx + sx;
        if (prev[j] !== -1) continue;
        prev[j] = curr;
        if (depth) depth[j] = depth[curr] + 1;
        if (j === goal) { found = true; break; }
        if (q.length < maxCells * maxQueueFactor) q.push(j);
      }
    }

    if (!found) {
      if (!partialFallback) return null;
      let bestD = Infinity, bestIdx = -1;
      for (let h = 1; h < q.length; h++) {
        const idx = q[h], dist = Math.hypot((idx % nx) - bx, ((idx / nx) | 0) - bz);
        if (dist < bestD) { bestD = dist; bestIdx = idx; }
      }
      if (bestIdx === -1) return null;
      let curr = bestIdx, steps = 0;
      while (prev[curr] !== start && prev[curr] !== -1 && steps < maxCells) { curr = prev[curr]; steps++; }
      return { cells: steps + 1, next: nextPoint(ax, az, curr % nx, (curr / nx) | 0) };
    }

    let j = goal, n = 1;
    while (prev[j] !== start && (n < maxCells || !partialFallback)) { j = prev[j]; n++; }
    if (!partialFallback && n > maxCells) return null;
    return { cells: n, next: nextPoint(ax, az, j % nx, (j / nx) | 0) };
  }

  function stepToward(x, z, tx, tz, maxCells = 35) {
    if (!routes) return search(x, z, tx, tz, maxCells);
    const a = cellAt(x, z), b = cellAt(tx, tz);
    const ax = colOf(a), az = rowOf(a), bx = colOf(b), bz = rowOf(b);
    if (ax === bx && az === bz) return search(x, z, tx, tz, maxCells);
    const key = `${ax},${az}>${bx},${bz}:${maxCells}`;
    if (!routes.has(key)) {
      routes.set(key, search(x, z, tx, tz, maxCells));
      if (routes.size > cacheLimit) routes.delete(routes.keys().next().value);
    }
    const r = routes.get(key);
    return r ? { cells: r.cells, next: { ...r.next } } : null;
  }

  function cellNear(rand, cx, cz, r, ok = () => true) {
    const c = [];
    for (let x = cx - r; x <= cx + r; x++) {
      for (let z = cz - r; z <= cz + r; z++) {
        if (inBounds(x, z) && !nearBlocked(x, z) && ok(x, z)) c.push([x, z]);
      }
    }
    return c.length ? c[Math.floor(rand() * c.length)] : null;
  }

  return { stepToward, cellNear };
}
