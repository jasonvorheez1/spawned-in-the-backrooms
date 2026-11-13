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
// the Trader's Keep (Shelly Nov 13 "expand upon b.n.t.g"): the B.N.T.G.'s home base fills the Gild Sector storage block in the far north-west,
// its racks the company stock, its west wall the Trader's Vault of roll-up storage rooms. Guarded: hounds and stealers keep out.
export const KEEP = { x0: -120, x1: -80, z0: -80, z1: -40 };
export const inKeep = (x, z) => x > KEEP.x0 && x < KEEP.x1 && z > KEEP.z0 && z < KEEP.z1;
export const zoneAt = (x, z) => { if (inKeep(x, z)) return "keep"; const { cx, cz } = cellAt(x, z); return zoneOf(cx, cz); };
export const safeZone = (z) => z === "corridors" || z === "camp" || z === "void" || z === "keep";

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
  for (const r of RACK.rows) for (const y of [0.69, 1.165, 1.72]) for (const dx of [-2.1, -0.9, 0.9, 2.1]) out.push({ x: c.x + dx, y, z: c.z + r });
  return out;
}

// lamps: a long fluorescent fixture every other cell in the open, a bare bulb in some corridor rooms
export function lampAt(cx, cz) {
  const z = zoneOf(cx, cz);
  if (z === "corridors") return hash(cx, cz, 71) < 0.45 ? "bulb" : null;
  if (z === "camp") return cx === ARRIVE.cx && cz === ARRIVE.cz ? "tube" : null;
  return cx % 2 === 0 && cz % 2 === 0 ? "tube" : null;
}

// the ways out: back into Level 0 at the flickering wall, and the pipes threshold toward Level 2.
// The wall stands in the far west halls (Nov 11: "reaching the M.E.G. camp should take more effort"): about 130 m
// of hound country from the camp, which used to be 9 m away. M.E.G. marks the way from it (scripts/lib/thresholds.js).
export const BACK_OLD = { x: cellCenter(ARRIVE.cx, ARRIVE.cz).x - 9.2, z: cellCenter(ARRIVE.cx, ARRIVE.cz).z }; // where it stood (sim moves rooms laid before)
export const BACK = { x: -HALF + 0.81, z: cellCenter(0, 22).z }; // Nov 13 (Shelly: "improve and move this"): flush into the west wall, was free-standing 2.7 m out at -HALF + 3
// where the tutorial's soft floor drops a newcomer (places/level1/config.yaml defaultSpawnPoint): the south-west halls
export const DROP = { x: cellCenter(7, 27).x, z: cellCenter(7, 27).z };
export const ONWARD = { x: HALF - 0.6, z: cellCenter(N - 1, 12).z };

export const L1_NAMES = {
  l1_halls: "The Halls", l1_storage: "Storage Racks", l1_corridors: "The Corridors", l1_camp: "M.E.G. Waypoint", l1_pipes: "The Pipeworks", l1_keep: "The Trader's Keep", l1_void: "The Halls",
};

// the upper deck (Shelly: "there should be at least a second floor"): a second parking floor over the long hall band,
// reached by two ramps cut through the ground floor's ceiling. Cells inclusive; a ramp is two cells along x, rising by dir.
export const DECK = { cx0: 8, cx1: 19, cz0: 10, cz1: 13, y: 4.5, h: 3.6 }; // floor top at 4.5 (ceiling 4.2 + 0.3 slab), 3.6 m to its own ceiling
export const RAMPS = [{ cx: 9, cz: 11, dir: 1 }, { cx: 17, cz: 13, dir: -1 }]; // cells cx and cx+1 in row cz
export const rampCell = (cx, cz) => RAMPS.some((r) => r.cz === cz && (cx === r.cx || cx === r.cx + 1));
export const onDeck = (cx, cz) => cx >= DECK.cx0 && cx <= DECK.cx1 && cz >= DECK.cz0 && cz <= DECK.cz1;
// a ramp's footprint in metres: low end xl (ground), high end xh (deck), z from za to zb
export const rampBox = (r) => { const x0 = r.cx * S - HALF, x1 = x0 + 2 * S, z0 = r.cz * S - HALF; return { xl: r.dir > 0 ? x0 : x1, xh: r.dir > 0 ? x1 : x0, za: z0 + 1, zb: z0 + S - 1, x0, x1, z0, z1: z0 + S }; };
// a ceiling run along axis ("x" or "z") at cross-position c from a to b, cut where it would cross a ramp opening: [[a, b], …]
export function runs(axis, c, a, b) {
  let out = [[a, b]];
  for (const r of RAMPS) { const k = rampBox(r), lo = axis === "x" ? k.x0 : k.z0, hi = axis === "x" ? k.x1 : k.z1, c0 = axis === "x" ? k.z0 : k.x0, c1 = axis === "x" ? k.z1 : k.x1;
    if (c <= c0 + 0.3 || c >= c1 - 0.3) continue;
    out = out.flatMap(([p, q]) => q <= lo || p >= hi ? [[p, q]] : [p < lo ? [p, lo] : null, q > hi ? [hi, q] : null].filter(Boolean)); }
  return out;
}
export const inHole = (x, z) => RAMPS.some((r) => { const k = rampBox(r); return x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1; });
