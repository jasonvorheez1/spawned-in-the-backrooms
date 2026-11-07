// Level 0's layout: one seeded function every script reads, so the walls, the lights, the pickups
// and the smilers all agree on where things are.
import L from "./data/level0.yml";

export const N = L.cells, S = L.cellSize, H = L.wallHeight, HALF = (N * S) / 2;

export function hash(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const inHub = (cx, cz) => cx >= L.hub[0] && cx <= L.hub[1] && cz >= L.hub[0] && cz <= L.hub[1];

export function zoneOf(cx, cz) {
  if (inHub(cx, cz)) return "hub";
  const rx = Math.floor(cx / 6), rz = Math.floor(cz / 6);
  if (rx >= 2 && rx <= 3 && rz >= 2 && rz <= 3) return "halls"; // the halls round the safe room stay plain
  const r = hash(rx, rz, 7);
  if (r < 0.13) return "red";
  if (r < 0.3) return "dark";
  if (r < 0.45) return "pillars";
  if (r < 0.6) return "arches";
  if (r < 0.72) return "holes";
  return "halls";
}

// cell <-> world
export const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * S - HALF, z: (cz + 0.5) * S - HALF });
export const cellAt = (x, z) => ({ cx: Math.floor((x + HALF) / S), cz: Math.floor((z + HALF) / S) });
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return cx < 0 || cz < 0 || cx >= N || cz >= N ? "halls" : zoneOf(cx, cz); };

const hubEdge = (a, b) => (a === L.hub[0] - 1 && b === L.hub[0]) || (a === L.hub[1] && b === L.hub[1] + 1);

// wall on the +x side of cell (cx,cz)
export function wallX(cx, cz) {
  if (cx < 0 || cx >= N - 1) return true;
  if (cz >= L.hub[0] && cz <= L.hub[1] && hubEdge(cx, cx + 1)) return cz !== 17 && cz !== 18; // two-cell doorway
  if (inHub(cx, cz) && inHub(cx + 1, cz)) return false;
  const z1 = zoneOf(cx, cz), z2 = zoneOf(cx + 1, cz);
  const p = Math.min(L.wallChance[z1] ?? 0.38, L.wallChance[z2] ?? 0.38);
  return hash(cx, cz, 11) < p;
}
// wall on the +z side of cell (cx,cz)
export function wallZ(cx, cz) {
  if (cz < 0 || cz >= N - 1) return true;
  if (cx >= L.hub[0] && cx <= L.hub[1] && hubEdge(cz, cz + 1)) return cx !== 17 && cx !== 18;
  if (inHub(cx, cz) && inHub(cx, cz + 1)) return false;
  const z1 = zoneOf(cx, cz), z2 = zoneOf(cx, cz + 1);
  const p = Math.min(L.wallChance[z1] ?? 0.38, L.wallChance[z2] ?? 0.38);
  return hash(cx, cz, 13) < p;
}
export const isArchWall = (cx, cz, dir) => zoneOf(cx, cz) === "arches" || (dir === "x" ? zoneOf(cx + 1, cz) : zoneOf(cx, cz + 1)) === "arches";
export const hasPit = (cx, cz) => zoneOf(cx, cz) === "holes" && hash(cx, cz, 17) < 0.6;
export const hasPillar = (cx, cz) => zoneOf(cx, cz) === "pillars" || (zoneOf(cx, cz) === "halls" && !inHub(cx, cz) && hash(cx, cz, 19) < 0.12);
export const hasLight = (cx, cz) => zoneOf(cx, cz) !== "dark" && (inHub(cx, cz) || hash(cx, cz, 23) < 0.7);

// the way down: a flickering wall far from the safe room
export const EXIT = { cx: 2, cz: 33 };

export const ZONE_NAMES = {
  hub: "THE SAFE ROOM", halls: "THE HALLS", arches: "ARCH ROOMS", pillars: "PILLAR FIELD",
  holes: "THE PITS", red: "RED ROOM", dark: "BLACKOUT ZONE",
};
