// Level 0 cell steering: a breadth-first walk over open doorways (walls and pits block, safe room forbidden),
// so smilers and lurkers navigate corners and partition walls cleanly instead of charging into walls.
import { N, cellAt, cellCenter, wallX, wallZ, inHub, hasPit } from "./maze.js";

const DX = [1, 0, -1, 0], DZ = [0, 1, 0, -1];
const prev = new Int16Array(N * N), depth = new Int16Array(N * N);
const routes = new Map();

export function canPass0(cx, cz, d) {
  if (d === 0) return cx < N - 1 && !wallX(cx, cz);
  if (d === 1) return cz < N - 1 && !wallZ(cx, cz);
  if (d === 2) return cx > 0 && !wallX(cx - 1, cz);
  if (d === 3) return cz > 0 && !wallZ(cx, cz - 1);
  return false;
}

// returns { cells: path length, next: {x,z} } toward (tx,tz), or null when no way
export function stepToward(x,z,tx,tz,maxCells=35) {
  const a=cellAt(x,z), b=cellAt(tx,tz);
  if(a.cx===b.cx && a.cz===b.cz) return search(x,z,tx,tz,maxCells);
  const key=`${a.cx},${a.cz}>${b.cx},${b.cz}:${maxCells}`;
  if(!routes.has(key)) {
    // This grid is generated from immutable walls; only cell-to-cell routes are shared.
    routes.set(key,search(x,z,tx,tz,maxCells));
    if(routes.size>256) routes.delete(routes.keys().next().value);
  }
  const r=routes.get(key); return r?{cells:r.cells,next:{...r.next}}:null;
}
function search(x, z, tx, tz, maxCells) {
  const a = cellAt(x, z), b = cellAt(tx, tz);
  if (inHub(b.cx, b.cz) || hasPit(b.cx, b.cz) || b.cx < 0 || b.cz < 0 || b.cx >= N || b.cz >= N) return null;
  if (a.cx < 0 || a.cz < 0 || a.cx >= N || a.cz >= N) return null;
  if (a.cx === b.cx && a.cz === b.cz) return { cells: 0, next: { x: tx, z: tz } };
  prev.fill(-1);
  const start = a.cz * N + a.cx, goal = b.cz * N + b.cx;
  prev[start] = start; depth[start]=0;
  const q = [start];
  let found = false;
  for (let h = 0; h < q.length && !found; h++) {
    const i = q[h], cx = i % N, cz = (i / N) | 0;
    if(depth[i]>=maxCells) continue;
    for (let d = 0; d < 4; d++) {
      if (!canPass0(cx, cz, d)) continue;
      const nx = cx + DX[d], nz = cz + DZ[d];
      if (inHub(nx, nz) || hasPit(nx, nz)) continue;
      const j = nz * N + nx;
      if (prev[j] !== -1) continue;
      prev[j] = i; depth[j]=depth[i]+1;
      if (j === goal) { found = true; break; }
      q.push(j);
    }
  }
  if (!found) return null;
  let j = goal, n = 1;
  while (prev[j] !== start) { j = prev[j]; n++; }
  if (n > maxCells) return null;
  // aim through the doorway: a point 0.6 m past the shared edge, centred on it, so a pillar in the next cell's middle is never the waypoint
  const ac = cellCenter(a.cx, a.cz), bc = cellCenter(j % N, (j / N) | 0);
  return { cells: n, next: { x: ac.x + (bc.x - ac.x) * 0.65, z: ac.z + (bc.z - ac.z) * 0.65 } };
}

// a random reachable cell near (cx,cz) within r cells, filtered by ok(cx,cz)
export function cellNear(rand, cx, cz, r, ok = () => true) {
  const c = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      if (x >= 0 && z >= 0 && x < N && z < N && !inHub(x, z) && !hasPit(x, z) && ok(x, z)) {
        c.push([x, z]);
      }
    }
  }
  return c.length ? c[Math.floor(rand() * c.length)] : null;
}

