// Level 1.1 "Corrupted Corridor": one plan every script of the level reads (geometry, sim, foes, quest).
// A single straight hall off Level 1 running east along +X, cut into 2 m slices. u = x along it, v = z across it.
//   Sector 1  white block, blue tile, humming tubes. Safe. Team Corridor's two staffed posts.
//   Sector 2  the floor tilts and drops, colours go wrong, stretches repeat. An empty cache; the Tunnel Gang's hut at its end.
//   Sector 3  tall and dark, the width never the same twice, pools of light from nowhere. Smilers. A cache; the cordon at its end.
//   Sector 4  black and white. The hall sways and rolls, parts of the floor are only a picture of floor. Past the last
//             real tile it draws on toward Sector 5's light, which nobody reaches.
import L from "./data/level1c.yml";
export const PLACE = "level1c";
export const [S1, S2, S3, S4, END] = L.sectors;
export const VOID_END = L.voidEnd, BEACON = L.beacon, HW = L.width / 2, DX = 2, CHUNK = 40, DEEP = -6;
export const SLICES = VOID_END / DX, CHUNKS = Math.ceil(VOID_END / CHUNK);
export const sectorAt = (x) => (x < S2 ? 1 : x < S3 ? 2 : x < S4 ? 3 : 4);
export const SECTOR_NAMES = ["", "Sector 1", "Sector 2", "Sector 3", "Sector 4"];
export const hash = (a, b = 0, c = 0) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Sector 2's floor: height along the hall, straight lines between these. On a DROP's side the floor falls sheer at `from`.
const P2 = [[170, 0], [186, 0], [198, 3.2], [206, 3.2], [214, 0.8], [226, 0.8], [236, -2], [262, -2], [274, 1.2], [282, 1.2], [290, -0.5], [296, 0], [330, 0]];
export const DROPS = [{ from: 206, to: 214, side: -1 }, { from: 282, to: 290, side: 1 }];
const p2 = (u) => { for (let k = 1; k < P2.length; k++) if (u <= P2[k][0]) { const [a, ya] = P2[k - 1], [b, yb] = P2[k]; return ya + ((u - a) / (b - a)) * (yb - ya); } return 0; };
// the middle of the hall: only Sector 4 sways
export const centre = (u) => (u < S4 ? 0 : Math.min(1, (u - S4) / 40) * 1.6 * Math.sin((u - S4) / 19));
const wave = (u) => Math.min(1.5, ((u - S4) / 30) * 1.5) * Math.sin((u - S4) / 6.5);
// floor height under (u, v)
export function floorY(u, v = 0) {
  if (u < S2) return 0;
  if (u < S3) { for (const d of DROPS) if (u >= d.from && u < d.to && (v < 0 ? -1 : 1) === d.side) return p2(d.to); return p2(u); }
  return u < S4 ? 0 : wave(u);
}
// floor to ceiling. Sector 1: 7 to 12 ft by the 10 m; Sector 3: 20 ft; Sector 4 breathes
const H1 = [3.66, 3.66, 3.05, 2.13, 2.6, 3.66, 2.35, 3.3];
export function ceilH(u) {
  if (u < S2) return WIDE.some(([a, b]) => u >= a - 4 && u < b + 4) || BAYS.some((b) => u >= b.from - 4 && u < b.to + 4) || u < 10 ? 3.66 : H1[Math.floor(hash(Math.floor(u / 10), 3, 11) * H1.length)];
  if (u < S3) return 3.0;
  if (u < S4) return 6.1;
  return 3.7 + 0.9 * Math.sin((u - S4) / 11);
}
export const ceilY = (u) => (u < S2 ? 0 : u < S3 ? p2(u) : u < S4 ? 0 : wave(u)) + ceilH(u);
// stretches held at one half-width: Post Two, the gang's room, the mouth of Sector 3, the second cache, the cordon
export const WIDE = [[114, 130, 4.2], [302, 328, 5], [328, 340, 2.0], [396, 410, 2.2], [464, 480, 3.05]];
const W3 = [0.92, 1.3, 1.83, 2.4, 3.05]; // Sector 3: 6 to 20 ft
export function halfW(u) {
  for (const [a, b, w] of WIDE) if (u >= a && u < b) return w;
  if (u < S3) return HW;
  if (u < S4) return W3[Math.floor(hash(Math.floor(u / 10), 7, 5) * W3.length)];
  return HW * (1 + 0.22 * Math.sin((u - S4) / 13));
}
// rooms let into a wall: side -1 is north (-Z), +1 is south (+Z)
export const BAYS = [
  { id: "post1", from: 40, to: 54, side: -1, depth: 6 },   // Post One: staffed
  { id: "cache1", from: 240, to: 250, side: 1, depth: 5 }, // the first cache, down in Sector 2's trough
  { id: "cache2", from: 398, to: 408, side: -1, depth: 5 }, // the second, in the dark
];
export const bay = (id) => BAYS.find((b) => b.id === id);
// the service gap round the gang's room: in through the south wall before the hut, out into Sector 3's mouth
export const PASS = [{ from: 298, to: 300, v: [0, 7.5] }, { from: 300, to: 334, v: [6.3, 7.5] }, { from: 332, to: 334, v: [0, 7.5] }];
// ducts and pipe runs that fill half the hall: [u, side]
export const BLOCKS = [[178, -1], [220, 1], [254, -1], [278, 1]];
// Sector 4's floor: three lanes; one real path wanders between them, the rest are sometimes only drawn
const laneSafe = (i) => { const k = Math.floor((i - S4 / DX) / 3); let l = 1; for (let j = 1; j <= k; j++) { const r = hash(j, 91, 4); l = Math.max(0, Math.min(2, l + (r < 0.36 ? -1 : r > 0.64 ? 1 : 0))); } return l; };
export function voidLane(i, lane) {
  const u = i * DX;
  if (u < S4 + 12) return false;
  if (u >= END) return true;
  const a = laneSafe(i), b = laneSafe(i + 1), c = laneSafe(i - 1);
  if (lane === a || lane === b || lane === c) return false;
  return hash(i, lane, 57) < 0.1 + 0.55 * ((u - S4) / (END - S4));
}
// which third of the hall v falls in at u
export const laneAt = (u, v) => { const c = centre(u), w = halfW(u); return Math.max(0, Math.min(2, Math.floor(((v - (c - w)) / (2 * w)) * 3))); };
// is there floor to stand on here (Sector 4 only says no)
export const solidAt = (u, v) => u < S4 || !voidLane(Math.floor(u / DX), laneAt(u, v));

const merge = (list) => { const s = list.slice().sort((a, b) => a[0] - b[0]), out = []; for (const [a, b] of s) { const t = out[out.length - 1]; if (t && a <= t[1] + 1e-6) t[1] = Math.max(t[1], b); else out.push([a, b]); } return out; };
// one 2 m slice: where it is open across the hall
export function slice(i) {
  if (i < 0 || i >= SLICES) return { i, open: [] };
  const u0 = i * DX, um = u0 + DX / 2, c = centre(um), w = halfW(um), iv = [[c - w, c + w]];
  for (const b of BAYS) if (um > b.from && um < b.to) iv.push(b.side < 0 ? [-w - b.depth, 0] : [0, w + b.depth]);
  for (const p of PASS) if (um > p.from && um < p.to) iv.push(p.v);
  return { i, u0, u1: u0 + DX, um, sec: sectorAt(um), c, w, open: merge(iv) };
}
// [a,b] pieces of A not covered by B
export function minus(A, B) {
  let out = A.map((x) => x.slice());
  for (const [a, b] of B) out = out.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, a], [b, y]].filter(([p, q]) => q - p > 0.01)));
  return out;
}
export const DATA = L;
