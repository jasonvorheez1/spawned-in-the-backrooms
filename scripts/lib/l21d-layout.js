// Level 21 "Numbered Doors" (place id doors21): the plan every script builds to. Nov 17, Shelly: "add level 21 as a difficult area".
// Wikidot: four long hallways meet at a small open square with chairs and a desk (no entities there); doors repeat down both
// sides and can't be trusted; the red EXIT door in the hall to the right of the desk opens on three dark halls that never shift.
// All numbers here are Savi's pick.
export const PLACE = "doors21";
export const C = 8;            // the square is 16 x 16 m about the origin; floor y = 0 everywhere
export const SQ_H = 3.8;       // square ceiling
export const HW = 2;           // hall half-width
export const HH = 3;           // hall ceiling
export const SEG = 8;          // one door bay
export const SEGS = 40;        // bays per hall: 320 m each
export const CHUNK = 5;        // bays per geometry chunk (40 m)
export const DOOR_W = 1.0, DOOR_H = 2.1;
export const SHIFT_MS = 240000; // the halls re-shape every 4 minutes
// hall h: 0 east (+X, the desk's right), 1 south (+Z), 2 west (-X), 3 north (-Z). dir = outward, right = right hand walking outward.
export const HALLS = [
  { id: "e", name: "East", dir: [1, 0], right: [0, 1] }, { id: "s", name: "South", dir: [0, 1], right: [-1, 0] },
  { id: "w", name: "West", dir: [-1, 0], right: [0, -1] }, { id: "n", name: "North", dir: [0, -1], right: [1, 0] },
];
export const hash = (a, b, s = 0) => { const v = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
// world point d metres out from the origin along hall h, s metres to the right
export const at = (h, d, s = 0) => ({ x: HALLS[h].dir[0] * d + HALLS[h].right[0] * s, z: HALLS[h].dir[1] * d + HALLS[h].right[1] * s });
// yaw (degrees) that faces outward along hall h; +90 turns to the hall's left wall, -90 to its right (engine yaw: 0 faces -Z)
export const yawOut = (h) => [-90, 180, 90, 0][h];
// the fixed doors (Wikidot's known doorways, to the levels this game has)
export const KNOWN = [
  { h: 3, k: 9, label: "105", to: "main", name: "Level 0" }, { h: 2, k: 5, label: "13", to: "level13", name: "Level 13" },
  { h: 1, k: 7, label: "9", to: "level9", name: "Level 9" }, { h: 2, k: 12, label: "8", to: "level8", name: "Level 8" },
  { h: 0, k: 14, label: "11", to: "level11", name: "Level 11" }, { h: 3, k: 17, label: "10", to: "level10", name: "Level 10" },
  { h: 1, k: 21, label: "12", to: "level12", name: "Level 12" }, { h: 1, k: 27, label: "=)", to: "level26", name: "a party" },
  { h: 3, k: 4, label: "RADIO", to: "radio", name: "Radio Backrooms" },
];
export const EXIT = { h: 0, k: 30 };      // the rumoured door: neon red EXIT over it
export const HOLE = { h: 2, k: 2 };       // the west hall's floor is broken through here: Level 22's rubble heap climbs up to it
// a door's kind: exit (crosses to a level), dark (the EXIT door), warp (throws you elsewhere in the level), closet (shelves to
// search), nest (something was waiting behind it), dead (bricked up). One door per bay, sides alternating.
export function door(h, k) {
  const side = k % 2 ? 1 : -1, d = C + k * SEG + SEG / 2, p = at(h, d, side * HW);
  const base = { h, k, side, d, x: p.x, z: p.z, id: `l21d-door-${HALLS[h].id}${k}` };
  if (h === EXIT.h && k === EXIT.k) return { ...base, kind: "dark", label: "EXIT" };
  const kn = KNOWN.find((q) => q.h === h && q.k === k); if (kn) return { ...base, kind: "exit", label: kn.label, to: kn.to, name: kn.name };
  const r = hash(h + 1, k + 1, 3), n = 100 + Math.floor(hash(h + 1, k + 1, 5) * 860), label = hash(h + 1, k + 1, 7) < 0.1 ? "" : String(n === 105 ? 106 : n);
  const kind = k < 3 ? (r < 0.6 ? "closet" : "dead") : r < 0.4 ? "warp" : r < 0.66 ? "closet" : r < 0.84 ? "nest" : "dead";
  return { ...base, kind, label };
}
export const allDoors = () => HALLS.flatMap((_, h) => Array.from({ length: SEGS }, (_, k) => door(h, k)));
// where the halls are closed this shift: one fallen-in bay per hall, never between the square and bay 10, and never before the EXIT door in the east hall
export function blocks(epoch) { return HALLS.map((_, h) => { const lo = h === EXIT.h ? EXIT.k + 2 : 10; return lo + Math.floor(hash(h + 1, epoch, 11) * (SEGS - 2 - lo)); }); }
// where a warp door drops you this shift: just outside another door, never inside the first 3 bays
export function warpTo(h, k, epoch) { const h2 = Math.floor(hash(h * 41 + k, epoch, 13) * 4), k2 = 4 + Math.floor(hash(h * 41 + k, epoch, 17) * (SEGS - 8)); const p = at(h2, C + k2 * SEG + SEG / 2, 0); return { h: h2, k: k2, x: p.x, z: p.z, yaw: yawOut(h2) + 180 }; }
// the dark wing behind the EXIT door: three halls along +X that never shift, 160 m each, off a foyer. Far from the rest of the level.
export const DW = { x: 0, z: 2000, len: 160, lanes: [-10, 0, 10], foyer: [-10, -13, 0, 13], hw: 2, h: 3, seg: 8, segs: 20 };
export const dwDoor = (lane, k) => { const side = k % 2 ? 1 : -1, x = DW.x + k * DW.seg + DW.seg / 2, z = DW.z + DW.lanes[lane] + side * DW.hw; const r = hash(lane + 9, k + 1, 23);
  return { lane, k, side, x, z, id: `l21d-dw-${lane}-${k}`, kind: k < 8 ? (r < 0.6 ? "closet" : "dead") : r < 0.3 ? "closet" : r < 0.6 ? "nest" : "dead", label: String(300 + ((k * 7 + lane * 3) % (k < 8 ? 40 : 6))), rich: true }; };
export const ARRIVE = { x: 2.5, y: 0.1, z: 4 };                       // the square
export const ARRIVE22 = { ...at(HOLE.h, C + HOLE.k * SEG + SEG / 2 + 3, 0), y: 0.1 }; // beside the hole, coming up from Level 22
export const DW_ARRIVE = { x: DW.x - 5, y: 0.1, z: DW.z };
export function closestWanderer(players, pos) {
  if (!pos) return null;
  return players.filter((p) => p.feetPosition && !p.state?.dead).reduce((best, p) => !best || Math.hypot(p.feetPosition.x - pos.x, p.feetPosition.z - pos.z) < Math.hypot(best.feetPosition.x - pos.x, best.feetPosition.z - pos.z) ? p : best, null);
}
