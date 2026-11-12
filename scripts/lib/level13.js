// Level 13's floor plan, shared by places/level13/sim.js and everything that lives there.
// Two halls joined by a connector make the S: hall A along z=0 (x -42..1.2), the connector at x=0 (z -1.2..11.2),
// hall B along z=10 (x -1.2..42). Flats are 8 m wide and 9 m deep off both sides of each hall:
// a main room (kitchen + living) 5 m deep at the hall, then a bedroom (4.6 m wide) and bathroom (3.4 m) behind it.
export const H = 2.6, HALL = 1.2, T = 0.12; // ceiling height, hall half-width, wall thickness
export const UNIT = { w: 8, main: 5, back: 4, bedW: 4.6, doorX: 2, bedDoorX: 2.3, bathDoorX: 6.3, doorW: 1, doorH: 2.1 };
export const HALLS = { A: { z: 0, x0: -42, x1: 1.2, ux: -42 }, B: { z: 10, x0: -1.2, x1: 42, ux: 2 } };
export const SPAWN = { x: -40.4, y: 0.05, z: 0 }, EXIT0 = { x: 41.9, z: 10 }; // in from Level 12 at hall A's west end; the bland door to Level 0 caps hall B
// kind: shut (a closed door, nothing built inside) | empty | tenant (a thrower's flat) | lurk (the drag-in flat) | resident | chess | bntg (Free Home flats)
const KIND = { a1: "shut", a2: "empty", a3: "tenant", a4: "shut", a5: "lurk", a6: "resident", a7: "shut", a8: "tenant", a9: "chess", a10: "shut",
  b1: "bntg", b2: "bntg", b3: "shut", b4: "bntg", b5: "shut", b6: "bntg", b7: "shut", b8: "bntg", b9: "shut", b10: "shut" };
function build() {
  const out = [];
  for (const hall of ["A", "B"]) for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const h = HALLS[hall], id = `${hall.toLowerCase()}${k + 1 + (s > 0 ? 5 : 0)}`, x0 = h.ux + k * UNIT.w, x1 = x0 + UNIT.w;
    const zf = h.z + s * HALL, zm = zf + s * UNIT.main, zb = zm + s * UNIT.back, lo = Math.min, hi = Math.max;
    const rect = (xa, xb, za, zc) => ({ x0: xa, x1: xb, z0: lo(za, zc), z1: hi(za, zc), cx: (xa + xb) / 2, cz: (za + zc) / 2 });
    out.push({ id, hall, s, k, kind: KIND[id], open: KIND[id] !== "shut", num: (hall === "A" ? 100 : 283 * 100) + k * 2 + (s > 0 ? 2 : 1), x0, x1, zf, zm, zb,
      door: { x: x0 + UNIT.doorX, z: zf }, // the hall doorway's centre
      main: rect(x0, x1, zf, zm), bed: rect(x0, x0 + UNIT.bedW, zm, zb), bath: rect(x0 + UNIT.bedW, x1, zm, zb), all: rect(x0, x1, zf, zb) });
  }
  return out;
}
export const APTS = build();
export const apt = (id) => APTS.find((a) => a.id === id);
// the flat a point stands in (open flats only), or null in the halls
export function aptAt(x, z) { for (const a of APTS) if (a.open && x > a.all.x0 && x < a.all.x1 && z > a.all.z0 && z < a.all.z1) return a; return null; }
export const roomAt = (a, x, z) => (Math.abs(z - a.zf) < UNIT.main ? "main" : x < a.x0 + UNIT.bedW ? "bed" : "bath");
export const inHall = (x, z) => (Math.abs(z) < HALL && x > -42 && x < 1.2) || (Math.abs(x) < HALL && z > -1.2 && z < 11.2) || (Math.abs(z - 10) < HALL && x > -1.2 && x < 42);
