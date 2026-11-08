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

export const MID = (L.hub[0] + L.hub[1]) / 2; // the safe room's centre cell
const B = L.zoneBlock ?? 6;
export function zoneOf(cx, cz) {
  if (inHub(cx, cz)) return "hub";
  const rx = Math.floor(cx / B), rz = Math.floor(cz / B), hb = Math.floor(MID / B);
  if (Math.abs(rx - hb) <= 0 && Math.abs(rz - hb) <= 0) return "halls"; // the block round the safe room stays plain
  const r = hash(rx, rz, 7);
  if (r < 0.1) return "red";
  if (r < 0.22) return "dark";
  if (r < 0.32) return "pillars";
  if (r < 0.43) return "arches";
  if (r < 0.52) return "holes";
  if (r < 0.7) return "expanse";
  if (r < 0.8) return "offices";
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
  if (cz >= L.hub[0] && cz <= L.hub[1] && hubEdge(cx, cx + 1)) return cz !== L.hub[0] + 1 && cz !== L.hub[0] + 2; // two-cell doorway
  if (inHub(cx, cz) && inHub(cx + 1, cz)) return false;
  const z1 = zoneOf(cx, cz), z2 = zoneOf(cx + 1, cz);
  const p = Math.min(L.wallChance[z1] ?? 0.38, L.wallChance[z2] ?? 0.38);
  if (z1 === "offices" && z2 === "offices") return (cz % 3 !== 1) && hash(cx, cz, 11) < 0.85 && cx % 2 === 1; // partition rows with doorways
  return hash(cx, cz, 11) < p || (z1 === "halls" && z2 === "halls" && hash(cx, cz >> 2, 51) < 0.12 && cz % 4 !== 0);
}
// wall on the +z side of cell (cx,cz)
export function wallZ(cx, cz) {
  if (cz < 0 || cz >= N - 1) return true;
  if (cx >= L.hub[0] && cx <= L.hub[1] && hubEdge(cz, cz + 1)) return cx !== L.hub[0] + 1 && cx !== L.hub[0] + 2;
  if (inHub(cx, cz) && inHub(cx, cz + 1)) return false;
  const z1 = zoneOf(cx, cz), z2 = zoneOf(cx, cz + 1);
  const p = Math.min(L.wallChance[z1] ?? 0.38, L.wallChance[z2] ?? 0.38);
  if (z1 === "offices" && z2 === "offices") return (cx % 3 !== 1) && hash(cx, cz, 13) < 0.85 && cz % 2 === 1;
  return hash(cx, cz, 13) < p || (z1 === "halls" && z2 === "halls" && hash(cx >> 2, cz, 53) < 0.12 && cx % 4 !== 0);
}
export const isArchWall = (cx, cz, dir) => zoneOf(cx, cz) === "arches" || (dir === "x" ? zoneOf(cx + 1, cz) : zoneOf(cx, cz + 1)) === "arches";
export const hasPit = (cx, cz) => zoneOf(cx, cz) === "holes" && hash(cx, cz, 17) < 0.6;
export const hasPillar = (cx, cz) => { const z = zoneOf(cx, cz); return z === "pillars" || (z === "expanse" && cx % 3 === 1 && cz % 3 === 1 && hash(cx, cz, 21) < 0.85) || (z === "halls" && !inHub(cx, cz) && hash(cx, cz, 19) < 0.1); };
export const hasLight = (cx, cz) => zoneOf(cx, cz) !== "dark" && (inHub(cx, cz) || hash(cx, cz, 23) < (zoneOf(cx, cz) === "expanse" ? 0.85 : 0.7));

// the way down: a flickering wall far from the safe room
export const EXIT = { cx: 0, cz: N - 3 }; // against the west outer wall

import { L3_NAMES } from "./level3.js";
import { L4_NAMES } from './level4.js'
import { L5_NAMES } from './level5.js'
import { L21_NAMES } from './level21.js'
export const ZONE_NAMES = {
  ...L3_NAMES, ...L4_NAMES, ...L5_NAMES, ...L21_NAMES, l8_cave: "Level 8 · Cave Systems",
  l6_halls: "Level 6 · Lights Out", l7_room1: "Level 7 · The Floating House", l7_pier: "Level 7 · Entrance Pier", l7_seawatch: "Level 7 · M.E.G. Outpost Seawatch", l7_fort: "Level 7 · Fort Surrender", l7_sea: "Level 7 · The Abyssal Ocean", l7_ocean: "Level 7 · The Abyssal Ocean", manila: "The Manila Room", hub: "The Safe Room", halls: "The Yellow Halls", arches: "Arch Rooms", pillars: "Pillar Field",
  holes: "The Pits", red: "Red Room", dark: "Blackout Zone", expanse: "The Expanse", offices: "Abandoned Offices",
  l1_halls: "Level 1 · The Halls", l1_storage: "Level 1 · Storage Racks", l1_corridors: "Level 1 · The Corridors", l1_camp: "Level 1 · M.E.G. Waypoint", l1_pipes: "Level 1 · The Pipeworks", l1_void: "Level 1 · The Halls",
};
