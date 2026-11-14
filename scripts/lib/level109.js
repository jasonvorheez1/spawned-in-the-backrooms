// Level 109 "The Neon Hospital": the layout, as pure math from one seed (place.state.l109seed).
// Corridors are the lines of an irregular grid: "ns" corridors run along Z at x = line(seed,"ns",i), "ew" corridors run along X
// at z = line(seed,"ew",j). The stretch between two crossings is gap(): 600 m + an exponential with mean 4000 m, so the
// AVERAGE corridor is 4.6 km (the wiki's 2.9 miles), some a few hundred metres, some past 15 km. Lines sit on 32k+8.
// A corridor frame: u = metres along it (world z for ns, world x for ew), v = metres across (+v = side +1).
// Segments are SEG long (index k = floor(u/SEG)); door slots are PITCH long (r = floor(u/PITCH)), one per side,
// the door at u = PITCH*r + 8, the auditorium (ROOM x ROOM = 900 m2, the wiki's average) behind the wall.
export const W = 2.6, CEIL = 2.7, H = 3.0, SEG = 16, ROOM = 30, PITCH = 32, WALL = 0.2, DOOR_W = 1.0, DOOR_H = 2.1;
export const BASE = { ns: 8, ew: -88 }; // line 0 of each family: the arrival corridor is ns 0, its first crossing 108 m ahead
export const SPAWN = { x: 8, y: 0.1, z: 20 };
const h3 = (seed, a, b, c) => { let h = (seed ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export const rand = h3;
export function gap(seed, ax, i) { // the stretch from line i to line i+1
  const r = h3(seed, ax === "ns" ? 11 : 23, i, 7), len = 600 + Math.min(20000, -Math.log(1 - r * 0.9999) * 4000);
  return Math.max(608, Math.round(len / 32) * 32);
}
const CACHE = {};
export function line(seed, ax, i) {
  const key = seed + ax, c = (CACHE[key] ??= { p: [BASE[ax]], n: [BASE[ax]] }); // p[i] = line i, n[i] = line -i
  if (i >= 0) { while (c.p.length <= i) c.p.push(c.p[c.p.length - 1] + gap(seed, ax, c.p.length - 1)); return c.p[i]; }
  while (c.n.length <= -i) c.n.push(c.n[c.n.length - 1] - gap(seed, ax, -c.n.length)); return c.n[-i];
}
// the index of the line at or below pos
export function lineBelow(seed, ax, pos) { let i = 0; while (line(seed, ax, i + 1) <= pos) i++; while (line(seed, ax, i) > pos) i--; return i; }
// lines of a family within reach of pos: [{ i, c }]
export function linesNear(seed, ax, pos, reach) { const i = lineBelow(seed, ax, pos), out = []; for (const j of [i, i + 1]) { const c = line(seed, ax, j); if (Math.abs(c - pos) <= reach) out.push({ i: j, c }); } return out; }
export const other = (ax) => (ax === "ns" ? "ew" : "ns");
export const corridor = (seed, ax, i) => ({ ax, i, c: line(seed, ax, i) });
export const toWorld = (c, u, v, y = 0) => (c.ax === "ns" ? { x: c.c + v, y, z: u } : { x: u, y, z: c.c + v });
export const toUV = (c, p) => (c.ax === "ns" ? { u: p.z, v: p.x - c.c } : { u: p.x, v: p.z - c.c });
const N = (n) => (n < 0 ? "n" + -n : "" + n);
export const corKey = (c) => c.ax + N(c.i);
export const segKey = (c, k) => `${corKey(c)}_${N(k)}`;
export const slotKey = (c, r, side) => `${corKey(c)}_${N(r)}${side > 0 ? "p" : "m"}`;
// a crossing inside [u0, u1): the crossing line's position, or null
export function crossingIn(seed, c, u0, u1) { const ax = other(c.ax), i = lineBelow(seed, ax, u1 - 0.001), p = line(seed, ax, i); return p >= u0 && p < u1 ? { i, c: p } : null; }
// The fixed places every seed has (my picks): the first safe supply room and a dangerous ward beside the arrival point,
// The Doctors' outpost 424 m east along the first cross corridor, a marked EXIT 1.3 km west along it.
const FIXED = { "ns0_n1p": "supply", "ns0_0m": "icu", "ew0_13m": "doctors", "ew0_14m": "or_active", "ew0_13p": "icu_active", "ew0_n41p": "exit", "ew0_6p": "breach" };
const TYPES = [["supply", 0.24], ["or", 0.16], ["icu", 0.2], ["pharmacy", 0.16], ["biohazard", 0.08], ["ward", 0.16]];
// what stands behind the wall of slot r on a side: null (blank wall) or { id, type, c, r, side, u (the door), box: the room's world AABB }
export function slotInfo(seed, c, r, side) {
  const id = slotKey(c, r, side), u0 = r * PITCH, fixed = FIXED[id];
  if (!fixed) {
    if (crossingIn(seed, c, u0 - 40, u0 + PITCH + 40)) return null; // no auditorium may overlap a crossing corridor's own rooms
    const a = h3(seed, c.ax === "ns" ? 3 : 5, c.i * 7919 + r, side);
    if (a < 0.3) return null;
  }
  let type = fixed;
  if (!type) { const b = h3(seed, c.ax === "ns" ? 13 : 17, c.i * 104729 + r, side + 2); if (b < 0.015) type = "exit"; else { let t = (b - 0.015) / 0.985; for (const [n, w] of TYPES) { if (t < w) { type = n; break; } t -= w; } type ??= "ward"; } }
  const u = u0 + 8, deep = type === "exit" ? 2.4 : ROOM, v0 = side * (W / 2 + WALL), v1 = side * (W / 2 + WALL + deep);
  const a = toWorld(c, type === "exit" ? u - 1.5 : u0 + 1, Math.min(v0, v1)), b = toWorld(c, type === "exit" ? u + 1.5 : u0 + 1 + ROOM, Math.max(v0, v1));
  return { id, type, c, r, side, u, deep, door: toWorld(c, u, side * (W / 2 + WALL / 2)), box: { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) } };
}
// who is shut in a room, rolled once from the seed: an array of kinds. The wiki: about three to ten where there are any, far more is rare.
const FOES = ["hound", "skinstealer", "clump", "deathmoth"];
export const EARLY_SAFE = 75; // m from arrival: rooms with a door this close hold nobody, except ns0_0m, the one shut ICU that teaches the door (review: too much danger too early)
export function roomPop(seed, info) {
  if (info.id !== "ns0_0m" && info.type !== "breach" && Math.hypot(info.door.x - SPAWN.x, info.door.z - SPAWN.z) < EARLY_SAFE) return [];
  const q = (k) => h3(seed, 31 + k, info.r * 131 + info.c.i, info.side + (info.c.ax === "ns" ? 0 : 9));
  let n = 0;
  if (info.id === "ns0_0m") n = 4; else if (info.type === "breach") n = 5;
  else if (info.type === "supply" || info.type === "ward") n = q(0) < 0.2 ? 1 + Math.floor(q(1) * 2) : 0;
  else if (info.type === "or") n = q(0) < 0.25 ? 1 + Math.floor(q(1) * 3) : 0;
  else if (info.type === "icu") n = 3 + Math.floor(q(1) * 6);
  else if (info.type === "pharmacy") n = q(0) < 0.05 ? 14 + Math.floor(q(1) * 7) : 3 + Math.floor(q(1) * 8);
  else if (info.type === "biohazard") n = 2 + Math.floor(q(1) * 4);
  const lead = FOES[Math.floor(q(2) * FOES.length)], out = [];
  for (let i = 0; i < n; i++) out.push(q(10 + i) < 0.7 ? lead : FOES[Math.floor(q(40 + i) * FOES.length)]);
  return out;
}
// one segment's wall openings: [{ side, kind: "door" | "pass", info? }]
export function segInfo(seed, c, k) {
  const u0 = k * SEG, x = crossingIn(seed, c, u0, u0 + SEG), out = [];
  if (x) return { cross: x, gaps: [{ side: 1, kind: "pass" }, { side: -1, kind: "pass" }] };
  if (((k % 2) + 2) % 2 === 0) for (const side of [1, -1]) { const info = slotInfo(seed, c, k / 2, side); if (info) out.push({ side, kind: "door", info }); }
  return { cross: null, gaps: out };
}
// which corridor(s) a world point stands in or beside (within its rooms' depth): [{ c, u, v }]
export function corridorsAt(seed, p, reach = W / 2 + WALL + ROOM + 2) {
  const out = [];
  for (const l of linesNear(seed, "ns", p.x, reach)) { const c = { ax: "ns", i: l.i, c: l.c }; out.push({ c, u: p.z, v: p.x - l.c }); }
  for (const l of linesNear(seed, "ew", p.z, reach)) { const c = { ax: "ew", i: l.i, c: l.c }; out.push({ c, u: p.x, v: p.z - l.c }); }
  return out;
}
