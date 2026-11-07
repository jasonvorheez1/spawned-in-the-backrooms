// Level 4 "Abandoned Office": one floor, 64 x 64 m. 24 perimeter offices (8 wide, 6 deep) any wanderer can claim as home,
// four corner rooms (the lift lobby from Level 3, M.E.G. Base Omega, the stairwell to Level 5, the break room), and the
// open floor between them: columns, a few water fountains, nothing else. Geometry, sim and player read this one plan.
export const HALF = 32, H = 3, DEEP = 6, W = 8, DOOR = 1.2, DOORH = 2.1, T = 0.1;
export const TRAPS = [5, 14, 21]; // offices whose window was never blacked out: don't go near it
export const ROOMS = [];
const SIDES = { n: { ax: "z", at: -HALF, inward: 1 }, s: { ax: "z", at: HALF, inward: -1 }, w: { ax: "x", at: -HALF, inward: 1 }, e: { ax: "x", at: HALF, inward: -1 } };
for (const [side, sd] of Object.entries(SIDES)) for (let i = 1; i <= 6; i++) {
  const no = ROOMS.length + 1;
  const a0 = -HALF + i * W, a1 = a0 + W, d0 = sd.at, d1 = sd.at + sd.inward * DEEP, lo = Math.min(d0, d1), hi = Math.max(d0, d1);
  const r = sd.ax === "z" ? { x0: a0, x1: a1, z0: lo, z1: hi } : { x0: lo, x1: hi, z0: a0, z1: a1 };
  ROOMS.push({ id: `l4-office-${no}`, no, label: `4-${String(no).padStart(2, "0")}`, side, kind: TRAPS.includes(no) ? "trap" : "office", ...r,
    door: { ax: sd.ax, at: d1, c: (a0 + a1) / 2 + (i % 2 ? -2 : 2) }, outer: { ax: sd.ax, at: sd.at }, inward: sd.inward, mid: (a0 + a1) / 2 });
}
const corner = (id, kind, x0, z0, doorZ, doorX, w = DOOR) => ROOMS.push({ id, kind, x0, x1: x0 + 8, z0, z1: z0 + 8, door: { ax: "z", at: doorZ, c: doorX, w } });
corner("l4-omega", "omega", -HALF, -HALF, -HALF + 8, -25);
corner("l4-lift", "lift", HALF - 8, -HALF, -HALF + 8, 25, 1.8);
corner("l4-stairs", "stairs", -HALF, HALF - 8, HALF - 8, -25);
corner("l4-break", "break", HALF - 8, HALF - 8, HALF - 8, 25, 1.8);
// every interior wall, merged per line: [ax, at, a, b, gaps[[g0, g1]]]; ax "z" = a wall at z = at running along x
export const WALLS = (() => {
  const lines = new Map(), add = (ax, at, a, b) => { const k = `${ax}:${at}`; if (!lines.has(k)) lines.set(k, { ax, at, iv: [], gaps: [] }); lines.get(k).iv.push([a, b]); return lines.get(k); };
  for (const r of ROOMS) {
    if (Math.abs(r.z0) !== HALF) add("z", r.z0, r.x0, r.x1); if (Math.abs(r.z1) !== HALF) add("z", r.z1, r.x0, r.x1);
    if (Math.abs(r.x0) !== HALF) add("x", r.x0, r.z0, r.z1); if (Math.abs(r.x1) !== HALF) add("x", r.x1, r.z0, r.z1);
  }
  for (const r of ROOMS) { const w = r.door.w ?? DOOR; lines.get(`${r.door.ax}:${r.door.at}`).gaps.push([r.door.c - w / 2, r.door.c + w / 2]); }
  const out = [];
  for (const l of lines.values()) {
    const iv = l.iv.sort((p, q) => p[0] - q[0]), m = [];
    for (const [a, b] of iv) { if (m.length && a <= m[m.length - 1][1] + 1e-6) m[m.length - 1][1] = Math.max(m[m.length - 1][1], b); else m.push([a, b]); }
    for (const [a, b] of m) out.push([l.ax, l.at, a, b, l.gaps.filter(([g0, g1]) => g0 >= a && g1 <= b)]);
  }
  return out;
})();
export const COLUMNS = (() => { const o = []; for (const x of [-18, -8, 8, 18]) for (const z of [-18, -8, 8, 18]) o.push([x, z]); return o; })();
export const FOUNTAINS = [[-4, -20, 0], [4, 20, 180], [-20, 4, -90], [20, -4, 90]]; // [x, z, yaw]: on columns' faces in the open
export const LIFT = { x: HALF - T, z: -28 }, STAIRS = { x: -28, z: HALF - T };
export const facing = (dx, dz) => (dz > 0 ? 180 : dz < 0 ? 0 : dx > 0 ? -90 : 90); // yaw that turns a front (-Z) toward a direction
export function roomAt(x, z) { for (const r of ROOMS) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r; return null; }
export function zoneAt(x, z, home) { const r = roomAt(x, z); if (!r) return "open"; if (r.kind === "office" && home && r.id === home) return "home"; return r.kind; }
export const DRAIN4 = { open: 0.04, office: 0.02, home: -1.5, trap: 1.2, omega: -0.4, lift: 0.04, stairs: 0.08, break: 0 }; // sanity per second; negative gives it back
export const L4_NAMES = { l4_open: "Level 4 · Abandoned Office", l4_office: "Level 4 · Vacant Office", l4_home: "Level 4 · Home", l4_trap: "Level 4 · The Window Room", l4_omega: "M.E.G. Base Omega", l4_lift: "Level 4 · Lift Lobby", l4_stairs: "Level 4 · Stairwell", l4_break: "Level 4 · Break Room" };
