// Level 3's steel doors through the brick (Shelly Nov 12: "found blocky doors + could be used to go in"): where a wall stands
// between two walkable halls, about one wall in 25 carries a door on both faces. Open it (E) and step in: you come out of
// the matching door on the far side. Shared by the details mesh (which leaves those faces bare) and the sim (which lays them).
import { N, S, isOpen, isBars, zoneOf, hash, cellCenter } from "./level3.js";
export const T = 0.3, D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const ok = (cx, cz) => cx >= 0 && cz >= 0 && cx < N && cz < N && !["vault", "tight"].includes(zoneOf(cx, cz));
const solid = (cx, cz, d) => !isOpen(cx, cz, d) && !isBars(cx, cz, d);
const pick = (cx, cz, d) => ok(cx, cz) && solid(cx, cz, d) && hash(cx * 4 + d, cz, 409) < 0.04;
// is there a door on this face (picked here, or picked from the other side of the same wall)
export function hatchAt(cx, cz, d) {
  const [nx, nz] = D4[d], ox = cx + nx, oz = cz + nz, od = (d + 2) % 4;
  if (!ok(cx, cz) || !ok(ox, oz) || !solid(cx, cz, d)) return false;
  return pick(cx, cz, d) || pick(ox, oz, od);
}
export function hatches() {
  const out = [];
  for (let cx = 0; cx < N; cx++) for (let cz = 0; cz < N; cz++) for (const d of [0, 1]) if (hatchAt(cx, cz, d)) out.push({ cx, cz, d, i: out.length });
  return out;
}
// the face of the wall seen from cell (cx, cz) toward d: its centre on the brick, the way into the hall, the tangent
export function face(cx, cz, d) {
  const c = cellCenter(cx, cz), [nx, nz] = D4[d];
  return { x: c.x + nx * (S / 2 - T), z: c.z + nz * (S / 2 - T), nx, nz, tx: -nz, tz: nx };
}
