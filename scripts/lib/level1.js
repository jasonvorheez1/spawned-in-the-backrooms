// Level 1, "The Habitable Zone": one seeded layout every script reads (geometry, sim, entities, player).
// 30 x 30 cells of 8 m. Zones come in 5 x 5 cell blocks: open concrete halls with pillars, storage racks,
// and the corridors (walled rooms behind push doors under green EXIT signs: entities don't go in).
import L from "./data/level1.yml";

export const N = L.cells, S = L.cellSize, H = L.height, HALF = (N * S) / 2, B = L.block;
export const ARRIVE = { cx: L.arrive[0], cz: L.arrive[1] };

export function hash(x, z, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const cellCenter = (cx, cz) => ({ x: (cx + 0.5) * S - HALF, z: (cz + 0.5) * S - HALF });
export const cellAt = (x, z) => ({ cx: Math.floor((x + HALF) / S), cz: Math.floor((z + HALF) / S) });

export function zoneOf(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= N || cz >= N) return "void";
  if (Math.abs(cx - ARRIVE.cx) <= 1 && Math.abs(cz - ARRIVE.cz) <= 1) return "camp";
  const bx = Math.floor(cx / B), bz = Math.floor(cz / B);
  if (bx === N / B - 1 && bz === 2) return "pipes"; // the smooth threshold toward Level 2
  if (bx === Math.floor(ARRIVE.cx / B) && bz === Math.floor(ARRIVE.cz / B)) return "halls";
  const r = hash(bx, bz, 11);
  if (r < 0.34) return "corridors";
  if (r < 0.56) return "storage";
  return "halls";
}
export const zoneAt = (x, z) => { const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
export const safeZone = (z) => z === "corridors" || z === "camp" || z === "void";

// sectors: the faint differences wanderers navigate by. The pillar band is the sector's colour.
export const SECTORS = [
  { name: "Aquila Sector", band: "oklch(0.78 0.15 95)" },
  { name: "Gild Sector", band: "oklch(0.7 0.12 70)" },
  { name: "Gothic Sector", band: "oklch(0.45 0.08 300)" },
  { name: "Ouroboros Sector", band: "oklch(0.6 0.12 160)" },
];
export const sectorOf = (cx, cz) => {
  const bx = Math.floor(cx / B), bz = Math.floor(cz / B);
  if (Math.abs(bx - Math.floor(ARRIVE.cx / B)) <= 1 && Math.abs(bz - Math.floor(ARRIVE.cz / B)) <= 1) return SECTORS[0];
  return SECTORS[Math.floor(hash(bx, bz, 13) * SECTORS.length)];
};

// an edge between cell (cx,cz) and its +x (axis "x") or +z (axis "z") neighbour.
// null = open; { door: offset along the edge (m from the edge's start) | null, sign: green EXIT above it }
export function edge(cx, cz, axis) {
  const nx = axis === "x" ? cx + 1 : cx, nz = axis === "z" ? cz + 1 : cz;
  const a = zoneOf(cx, cz), b = zoneOf(nx, nz);
  if (a === "void" && b === "void") return null;
  if (a === "void" || b === "void") return { door: null, sign: false }; // the outer wall
  const ca = a === "corridors", cb = b === "corridors";
  if (!ca && !cb) return null;
  const off = 2 + hash(cx, cz, axis === "x" ? 51 : 53) * (S - 4);
  if (ca && cb) return hash(cx, cz, axis === "x" ? 55 : 57) < 0.35 ? null : { door: off, sign: false };
  // the boundary of a corridor block: push doors under green signs about half the time
  return hash(cx, cz, axis === "x" ? 59 : 61) < 0.5 ? { door: S / 2, sign: true } : { door: null, sign: false };
}
export const DOOR = 1.5; // door gap width

// a pillar at grid corner (i, j) (world x = i*S - HALF): where none of the four cells round it is a corridor
export function hasPillar(i, j) {
  if (i <= 0 || j <= 0 || i >= N || j >= N) return false;
  for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (zoneOf(a, b) === "corridors") return false;
  if (Math.abs(i - ARRIVE.cx - 0.5) < 1 && Math.abs(j - ARRIVE.cz - 0.5) < 1) return false;
  return hash(i, j, 63) > 0.07;
}

// storage racks: two rows along x in each storage cell. Returns the shelf levels where crates sit.
export const RACK = { len: 6, depth: 0.8, levels: [0.12, 0.95, 1.78], top: 2.6, rows: [-2.2, 2.2] };
export function shelfSlots(cx, cz) {
  if (zoneOf(cx, cz) !== "storage") return [];
  const c = cellCenter(cx, cz), out = [];
  for (const r of RACK.rows) for (const y of RACK.levels) for (const dx of [-2.2, -0.75, 0.75, 2.2]) out.push({ x: c.x + dx, y, z: c.z + r });
  return out;
}

// lamps: a long fluorescent fixture every other cell in the open, a bare bulb in some corridor rooms
export function lampAt(cx, cz) {
  const z = zoneOf(cx, cz);
  if (z === "corridors") return hash(cx, cz, 71) < 0.45 ? "bulb" : null;
  if (z === "camp") return cx === ARRIVE.cx && cz === ARRIVE.cz ? "tube" : null;
  return cx % 2 === 0 && cz % 2 === 0 ? "tube" : null;
}

// the ways out: back into Level 0 at the camp's flickering wall, and the pipes threshold toward Level 2
export const BACK = { x: cellCenter(ARRIVE.cx, ARRIVE.cz).x - 9.2, z: cellCenter(ARRIVE.cx, ARRIVE.cz).z };
export const ONWARD = { x: HALF - 0.6, z: cellCenter(N - 1, 12).z };

export const L1_NAMES = {
  l1_halls: "The Halls", l1_storage: "Storage Racks", l1_corridors: "The Corridors", l1_camp: "M.E.G. Waypoint", l1_pipes: "The Pipeworks", l1_void: "The Halls",
};
