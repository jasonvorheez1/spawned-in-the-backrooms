// The Hub ("The Crossroads", backrooms-wiki.wikidot.com/the-hub): one plan every Hub script reads.
// A trunk road runs east along +X. Twelve side tunnels leave it, odd ones north (-Z), even ones south (+Z), 40 m apart.
// Two ring roads join some of them at the far end, so the place loops and confuses. Doors line the side tunnels and rings.
// Canon: the 5th tunnel holds the open door to Level 178, the 7th to Level 1, the 10th to Level 11. Doors are never numbered.
// Frame of a run: u along it (0..len), v across it (-HW..HW). ax "x": world = (x0+u, z0+v). ax "z": world = (x0+v, z0+dir*u).
export const PLACE = "thehub";
export const HW = 5.5, WALL_H = 5.0, CEIL = 6.2, ROAD = 3.5, CURB = 0.18, STEP = 40, BR = 84, RING = 95;
export const DOOR_W = 3.8, DOOR_H = 4.7, OPEN_W = 2.6, OPEN_H = 3.4;
export const ARRIVE = { x: -52, y: 0.05, z: 0 }; // where the Level 1 halls let you out: the trunk's blind west end
export const DARK_X = 505; // past the M.E.G. barricade nobody has hung a lamp
const THROUGH_N = [1, 3, 5, 7], THROUGH_S = [6, 8, 10, 12];
export const BRANCHES = Array.from({ length: 12 }, (_, k) => { const n = k + 1, side = n % 2 ? -1 : 1; return { n, x: STEP * n, side, through: (side < 0 ? THROUGH_N : THROUGH_S).includes(n) }; });
export const BAYS = {
  meg: { run: "trunk", side: "a", from: 64, to: 88, depth: 9 },     // Doorstep Carpet, x 4..28, north of the road
  amber: { run: "trunk", side: "b", from: 236, to: 254, depth: 6 }, // Camp Amber's pitch, x 176..194, south
};
const gap = (c) => [c - HW, c + HW];
function buildRuns() {
  const trunk = { id: "trunk", ax: "x", x0: -60, z0: 0, dir: 1, len: 620, capA: true, capB: true, gaps: { a: [], b: [] }, doors: { a: [], b: [] }, bays: [BAYS.meg, BAYS.amber] };
  for (const b of BRANCHES) trunk.gaps[b.side < 0 ? "a" : "b"].push(gap(b.x + 60));
  const runs = [trunk];
  for (const b of BRANCHES) runs.push({ id: "t" + b.n, n: b.n, ax: "z", x0: b.x, z0: b.side * HW, dir: b.side, len: BR, capA: false, capB: !b.through, gaps: { a: [], b: [] }, doors: { a: [14, 30, 46, 62], b: [14, 30, 46, 62] }, bays: [] });
  const rn = { id: "ringn", ax: "x", x0: 34.5, z0: -RING, dir: 1, len: 251, capA: true, capB: true, gaps: { a: [], b: THROUGH_N.map((n) => gap(STEP * n - 34.5)) }, doors: { a: [30, 70, 110, 150, 190, 230], b: [] }, bays: [] };
  const rs = { id: "rings", ax: "x", x0: 234.5, z0: RING, dir: 1, len: 251, capA: true, capB: true, gaps: { a: THROUGH_S.map((n) => gap(STEP * n - 234.5)), b: [] }, doors: { a: [], b: [21, 61, 101, 141, 181, 221] }, bays: [] };
  runs.push(rn, rs);
  return runs;
}
export const RUNS = buildRuns();
export const runOf = (id) => RUNS.find((r) => r.id === id);
// world point of a run's (u, v)
export const at = (r, u, v) => r.ax === "x" ? { x: r.x0 + u, z: r.z0 + v } : { x: r.x0 + v, z: r.z0 + r.dir * u };
// the yaw that turns a thing's front (-Z) to face into the tunnel from wall side s
export function wallYaw(r, s) {
  const inward = s === "a" ? 1 : -1; // +v from wall a, -v from wall b
  if (r.ax === "x") return inward > 0 ? 180 : 0; // v is world z
  return inward > 0 ? -90 : 90; // v is world x
}
const h32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rnd = (seed, k = 0) => { let t = (seed + 0x6d2b79f5 * (k + 1)) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// what stands behind which door. Two stand open for good; the rest take a Level Key, once.
// `place` null = a level nobody has reached from here yet: the door says so and never fakes a trip.
export const OPEN = { "t5-a2": { place: "level178", name: "Level 178" }, "t7-b1": { place: "level1", name: "Level 1" } };
export const KEYED = { // door id -> the place its key belongs to (my picks: scattered, never in level order). Shelly Nov 13: Levels 0 to 20; a level not built yet is a sealed door (SEALED below)
  "t1-b2": "level4", "t2-a0": "level8", "t3-a3": "level5", "t4-b1": "level02", "t6-a1": "level3", "t8-b3": "level7", "t9-a0": "level12", "t10-a3": "level11",
  "t11-b2": "level10", "t12-a1": "level6", "ringn-a2": "level2", "ringn-a4": "level21", "rings-b1": "level9", "rings-b4": "level13", "t2-b3": "main", "t9-b2": "level61", "t11-a0": "level14",
  "t3-b0": "level15", "t6-b2": "level16", "t8-a1": "level17", "t10-b1": "level18", "t12-b3": "level19", "ringn-a0": "level20", "rings-b2": "level109", "ringn-a1": "level169", // game-original: the wiki gives the desert no Hub door; its key is earned by jumping the edge
};
export const KEY_NAMES = { main: "Level 0", level02: "Level 0.2", level1: "Level 1", level2: "Level 2", level21: "Level 2.1", level3: "Level 3", level4: "Level 4", level5: "Level 5", level6: "Level 6", level61: "Level 6.1", level7: "Level 7", level8: "Level 8", level9: "Level 9", level10: "Level 10", level11: "Level 11", level12: "Level 12", level13: "Level 13", level14: "Level 14", level15: "Level 15", level16: "Level 16", level17: "Level 17", level18: "Level 18", level19: "Level 19", level20: "Level 20", level109: "Level 109", level169: "Level 169", level178: "Level 178" };
// a door whose level is not built yet: no key turns it, nothing crosses
export const sealed = (ctx, place) => !!place && !(ctx.world.files ?? []).some((f) => f.startsWith(`places/${place}/`));
export const doorOfKey = (place) => Object.keys(KEYED).find((d) => KEYED[d] === place) ?? null;
function buildDoors() {
  const out = [];
  for (const r of RUNS) for (const s of ["a", "b"]) r.doors[s].forEach((u, i) => {
    const id = `${r.id}-${s}${i}`, p = at(r, u, s === "a" ? -HW : HW);
    out.push({ id, obj: "hd-" + id, run: r.id, side: s, u, x: p.x, z: p.z, yaw: wallYaw(r, s), seed: h32("hub-door-" + id), open: OPEN[id] ?? null, to: KEYED[id] ?? null });
  });
  return out;
}
export const DOORS = buildDoors();
export const doorById = (id) => DOORS.find((d) => d.id === id || d.obj === id) ?? null;
// a point `m` metres into the tunnel in front of a door, for standing, aiming and markers
export function doorFront(d, m = 2.2) { const r = runOf(d.run), s = d.side === "a" ? 1 : -1, p = at(r, d.u, (d.side === "a" ? -HW : HW) + s * m); return { x: p.x, y: 0.2, z: p.z }; }
// lamps: one every 12 m, alternating walls, skipped where the wall is open
export function lamps() {
  const out = [];
  for (const r of RUNS) for (let k = 0, u = 6; u < r.len - 2; u += 12, k++) {
    let s = k % 2 ? "b" : "a";
    const blocked = (side) => r.gaps[side].some(([a, b]) => u > a - 0.8 && u < b + 0.8) || r.bays.some((b) => b.side === side && u > b.from - 0.8 && u < b.to + 0.8) || r.doors[side].some((d) => Math.abs(d - u) < DOOR_W / 2 + 0.7);
    if (blocked(s)) { s = s === "a" ? "b" : "a"; if (blocked(s)) continue; }
    const p = at(r, u, s === "a" ? -HW + 0.05 : HW - 0.05);
    if (r.id === "trunk" && p.x > DARK_X) continue;
    out.push({ x: p.x, y: 4.45, z: p.z, yaw: wallYaw(r, s), k: out.length });
  }
  return out;
}
// the crop-circle mark over a door: rings, satellites and spokes off its seed. Never a letter, never a number.
export function symbolSvg(seed, w = 2.2) {
  const R = (k) => rnd(seed, k), n = 2 + Math.floor(R(1) * 3), parts = [], ink = "#1c1a17";
  const c = (x, y, r, sw) => parts.push(`<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${r.toFixed(1)}' fill='none' stroke='${ink}' stroke-width='${sw}'/>`);
  const dot = (x, y, r) => parts.push(`<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${r.toFixed(1)}' fill='${ink}'/>`);
  const cx = 110 + (R(2) - 0.5) * 30, cy = 45;
  for (let i = 0; i < n; i++) c(cx, cy, 34 - i * (7 + R(3 + i) * 4), i === 0 ? 5 : 3);
  if (R(9) > 0.4) dot(cx, cy, 5 + R(10) * 4);
  const sat = 2 + Math.floor(R(11) * 5), a0 = R(12) * 6.283, arm = 48 + R(13) * 30;
  for (let i = 0; i < sat; i++) {
    const a = a0 + (i / sat) * 6.283 * (R(14) > 0.5 ? 1 : 0.5), d = arm * (0.8 + 0.4 * R(20 + i)), x = cx + Math.cos(a) * d * 1.25, y = cy + Math.sin(a) * d * 0.42, r = 4 + R(30 + i) * 7;
    if (R(40 + i) > 0.45) dot(x, y, r); else c(x, y, r, 3);
    if (R(50 + i) > 0.5) parts.push(`<line x1='${(cx + Math.cos(a) * 36).toFixed(1)}' y1='${(cy + Math.sin(a) * 30).toFixed(1)}' x2='${x.toFixed(1)}' y2='${y.toFixed(1)}' stroke='${ink}' stroke-width='3'/>`);
  }
  if (R(60) > 0.5) parts.push(`<path d='M ${(cx - 70).toFixed(1)} ${(cy + 30).toFixed(1)} Q ${cx.toFixed(1)} ${(cy + 46 + R(61) * 10).toFixed(1)} ${(cx + 70).toFixed(1)} ${(cy + 30).toFixed(1)}' fill='none' stroke='${ink}' stroke-width='3'/>`);
  return `<svg viewBox='0 0 220 90' width='${w}m'>${parts.join("")}</svg>`;
}
