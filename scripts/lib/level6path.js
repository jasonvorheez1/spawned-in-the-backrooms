// Level 6 "Lights Out" corridor navigation: BFS over the carved corridor tree,
// so hounds and smilers navigate the dark labyrinth corners cleanly.
import { W, H, C, START, cx, cz, plan } from "./level6.js";

const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(W * H);

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

export function stepToward6(x, z, tx, tz, maxCells = 35) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (a.i === b.i && a.j === b.j) return { cells: 0, next: { x: tx, z: tz } };

  const { open } = plan();
  if (!open[a.i]?.[a.j]) {
    // Stepping from a boundary or solid wall to nearest open neighbor
    for (let d = 0; d < 4; d++) {
      const ni = a.i + DX[d], nj = a.j + DZ[d];
      if (ni >= 0 && nj >= 0 && ni < W && nj < H && open[ni][nj]) {
        return { cells: 1, next: cellCenter(ni, nj) };
      }
    }
    return null;
  }

  let targetI = b.i, targetJ = b.j;
  if (!open[targetI]?.[targetJ]) {
    let bestDist = Infinity, bestI = -1, bestJ = -1;
    for (let d = 0; d < 4; d++) {
      const ni = targetI + DX[d], nj = targetJ + DZ[d];
      if (ni >= 0 && nj >= 0 && ni < W && nj < H && open[ni][nj]) {
        const dist = Math.hypot(ni - a.i, nj - a.j);
        if (dist < bestDist) { bestDist = dist; bestI = ni; bestJ = nj; }
      }
    }
    if (bestI >= 0) { targetI = bestI; targetJ = bestJ; }
    else return null;
  }

  prev.fill(-1);
  const start = a.j * W + a.i, goal = targetJ * W + targetI;
  prev[start] = start;
  const q = [start];
  let found = false;

  for (let h = 0; h < q.length && !found; h++) {
    const curr = q[h], ci = curr % W, cj = (curr / W) | 0;
    for (let d = 0; d < 4; d++) {
      const ni = ci + DX[d], nj = cj + DZ[d];
      if (ni < 0 || nj < 0 || ni >= W || nj >= H || !open[ni][nj]) continue;
      const nextIdx = nj * W + ni;
      if (prev[nextIdx] !== -1) continue;
      prev[nextIdx] = curr;
      if (nextIdx === goal) { found = true; break; }
      if (q.length < maxCells * 4) q.push(nextIdx);
    }
  }

  if (!found) {
    // Partial path fallback: pick the reached node closest to goal
    let bestDist = Infinity, bestIdx = -1;
    for (let h = 1; h < q.length; h++) {
      const idx = q[h], ci = idx % W, cj = (idx / W) | 0;
      const dist = Math.hypot(ci - targetI, cj - targetJ);
      if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
    }
    if (bestIdx === -1) return null;
    let curr = bestIdx, steps = 0;
    while (prev[curr] !== start && prev[curr] !== -1 && steps < maxCells) {
      curr = prev[curr];
      steps++;
    }
    return { cells: steps + 1, next: cellCenter(curr % W, (curr / W) | 0) };
  }

  let curr = goal, steps = 0;
  while (prev[curr] !== start && steps < maxCells) {
    curr = prev[curr];
    steps++;
  }
  return { cells: steps + 1, next: cellCenter(curr % W, (curr / W) | 0) };
}

