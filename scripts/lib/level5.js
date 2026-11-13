// Level 5 "Terror Hotel": one floor of an endless 1930s hotel, 96 x 60 m. Every system reads this one plan:
// the base geometry (scripts/level5-geo.js), the sim (places/level5/sim.js), the zone lanes (scripts/lib/l5/*.js), player.js sanity.
// x runs west (-48) to east (+48), z north (-30) to south (+30). Floors at y = 0. Each zone draws its own walls inset T on its own side,
// so a shared edge is two thin walls back to back, each in its own room's wallpaper; an OPENING cuts both.
export const T = 0.15, DOORH = 2.4;
// zone: { id, kind, x0, x1, z0, z1, h (ceiling), name, drain (sanity / min, negative heals) }
export const ZONES = [
  { id: "office", kind: "office", name: "The Proprietor's Office", x0: -46, x1: -30, z0: -22, z1: -13, h: 3.6, drain: 0.6 }, // Entity 18's (scripts/lib/l5-beast.js)
  { id: "lobby", kind: "lobby", name: "The Main Hall · Lobby", x0: -46, x1: -30, z0: -13, z1: 13, h: 7.5, drain: 0.15 },
  { id: "gallery", kind: "hall", name: "The Main Hall", x0: -30, x1: -6, z0: -3, z1: 3, h: 5, drain: 0.15 },
  { id: "crossN", kind: "hall", name: "The Main Hall", x0: -19, x1: -16, z0: -10, z1: -3, h: 3.6, drain: 0.15 },
  { id: "crossS", kind: "hall", name: "The Main Hall", x0: -19, x1: -16, z0: 3, z1: 10, h: 3.6, drain: 0.15 },
  { id: "corrN", kind: "corridor", name: "Guest Wing North", x0: -30, x1: -6, z0: -13, z1: -10, h: 3.6, drain: 0.15 },
  { id: "corrS", kind: "corridor", name: "Guest Wing South", x0: -30, x1: -6, z0: 10, z1: 13, h: 3.6, drain: 0.15 },
  // north row off corrN (doors on z = -13)
  { id: "library", kind: "library", name: "Lost Hall Society Library", x0: -30, x1: -22, z0: -21, z1: -13, h: 3.6, drain: 0.15 },
  { id: "room-n3", kind: "guest", x0: -22, x1: -18, z0: -21, z1: -13, h: 3.2, drain: 0.15 },
  { id: "room-n4", kind: "guest", x0: -18, x1: -14, z0: -21, z1: -13, h: 3.2, drain: 0.15 },
  { id: "room-n5", kind: "guest", x0: -14, x1: -10, z0: -21, z1: -13, h: 3.2, drain: 0.15 },
  { id: "stairs4", kind: "stairs", name: "Old Stairway · up to Level 4", x0: -10, x1: -6, z0: -21, z1: -13, h: 3.6, drain: 0.5 },
  // south row off corrS (doors on z = 13)
  { id: "room-s1", kind: "guest", x0: -30, x1: -26, z0: 13, z1: 21, h: 3.2, drain: 0.15 },
  { id: "room-s2", kind: "guest", x0: -26, x1: -22, z0: 13, z1: 21, h: 3.2, drain: 0.15 },
  { id: "room-s3", kind: "guest", x0: -22, x1: -18, z0: 13, z1: 21, h: 3.2, drain: 0.15 },
  { id: "room-s4", kind: "guest", x0: -18, x1: -14, z0: 13, z1: 21, h: 3.2, drain: 0.15 },
  { id: "kitchen", kind: "kitchen", name: "Homely Hotel · Dining Room", x0: -14, x1: -6, z0: 13, z1: 21, h: 3.6, drain: -0.4 },
  // suites between the corridors and the gallery (doors on the corridor side): Homely Hotel's rentals
  { id: "suite-nw", kind: "suite", x0: -30, x1: -19, z0: -10, z1: -3, h: 3.4, drain: 0.4 },
  { id: "suite-ne", kind: "suite", x0: -16, x1: -6, z0: -10, z1: -3, h: 3.4, drain: 0.4 },
  { id: "suite-sw", kind: "suite", x0: -30, x1: -19, z0: 3, z1: 10, h: 3.4, drain: 0.4 },
  { id: "suite-se", kind: "suite", x0: -16, x1: -6, z0: 3, z1: 10, h: 3.4, drain: 0.4 },
  // the Eternal Ballroom and its neighbours
  { id: "beverly", kind: "ballroom", name: "The Beverly Room", x0: -6, x1: 18, z0: -12, z1: 12, h: 9, drain: 1.2 },
  { id: "salon", kind: "salon", name: "The Originals' Salon", x0: -2, x1: 14, z0: -24, z1: -12, h: 4.5, drain: -0.2 },
  { id: "housekeeping", kind: "outpost", name: "M.E.G. Outpost \"Housekeeping\"", x0: -6, x1: 18, z0: 12, z1: 24, h: 3.6, drain: -0.5 },
  // the Boiler Room: hot, loud, a maze of machines (scripts/lib/l5/boiler.js lays its insides from BOILER)
  { id: "boiler", kind: "boiler", name: "The Boiler Room", x0: 18, x1: 46, z0: -26, z1: 26, h: 6, drain: 1.5, hot: true },
  // M.E.G.'s cold room, the strip of floor under the hotel wall in the boiler room's northeast, behind the painted line: a chiller keeps it cool, the hounds won't cross into it (scripts/hounds.js reads any non-boiler zone as safe)
];
// openings: { ax, at, a0, a1, h, kind }. ax "z" = in a wall at z = at, spanning x a0..a1; ax "x" = in a wall at x = at, spanning z a0..a1
export const OPENINGS = [
  { ax: "z", at: -13, a0: -35.2, a1: -34.0, h: DOORH, kind: "arch" }, // lobby ↔ the proprietor's office
  // lobby ↔ gallery (an arch), lobby ↔ both corridors
  { ax: "x", at: -30, a0: -2.2, a1: 2.2, h: 4.2, kind: "arch" },
  { ax: "x", at: -30, a0: -12.6, a1: -10.4, h: DOORH, kind: "arch" },
  { ax: "x", at: -30, a0: 10.4, a1: 12.6, h: DOORH, kind: "arch" },
  // gallery ↔ cross halls ↔ corridors
  { ax: "z", at: -3, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" }, { ax: "z", at: -10, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" },
  { ax: "z", at: 3, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" }, { ax: "z", at: 10, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" },
  // the corridors dead-end at the Beverly Room's west wall (an elevator waits at corrS's end); the gallery opens east into the ballroom
  { ax: "x", at: -6, a0: -1.6, a1: 1.6, h: 3.4, kind: "double", placard: "The Beverly Room" },
  // guest doors (single, gold placards); the library's and kitchen's are doubles
  { ax: "z", at: -13, a0: -27, a1: -25, h: DOORH, kind: "double", room: "library" },
  ...[["room-n3", -20], ["room-n4", -16], ["room-n5", -12], ["stairs4", -8]].map(([room, c]) => ({ ax: "z", at: -13, a0: c - 0.55, a1: c + 0.55, h: DOORH, kind: "door", room })),
  ...[["room-s1", -28], ["room-s2", -24], ["room-s3", -20], ["room-s4", -16]].map(([room, c]) => ({ ax: "z", at: 13, a0: c - 0.55, a1: c + 0.55, h: DOORH, kind: "door", room })),
  { ax: "z", at: 13, a0: -11, a1: -9, h: DOORH, kind: "double", room: "kitchen" },
  ...[["suite-nw", -10, -25], ["suite-ne", -10, -11], ["suite-sw", 10, -25], ["suite-se", 10, -11]].map(([room, at, c]) => ({ ax: "z", at, a0: c - 0.55, a1: c + 0.55, h: DOORH, kind: "door", room })),
  // ballroom ↔ salon (north), housekeeping (south), boiler (east)
  { ax: "z", at: -12, a0: 4.8, a1: 7.2, h: 3, kind: "double", room: "salon" },
  { ax: "z", at: 12, a0: 4.8, a1: 7.2, h: 3, kind: "double", room: "housekeeping" },
  { ax: "x", at: 18, a0: -1.1, a1: 1.1, h: 2.6, kind: "metal", placard: "BOILER ROOM · STAFF ONLY" },
  // housekeeping ↔ boiler: M.E.G. guide the way in
  { ax: "x", at: 18, a0: 17, a1: 19, h: 2.6, kind: "metal" },
];
// the ways in and out (sim lays each; scripts/level-door.js crosses). to: a live place, or sealed: words for a door that won't open yet
export const EXITS = [
  // the elevator from Level 3 arrives in the lobby's west wall; the old stairway climbs to Level 4
  { id: "l5-lift3", at: { x: -45.2, z: 0 }, yaw: -90, to: "level3#l3-from-l5", label: "LEVEL 3", kind: "lift" },
  { id: "l5-stairs-up", at: { x: -8, z: -20.8 }, yaw: 180, to: "level4#l4-from-l5", label: "LEVEL 4", kind: "stairs" },
  // the lore's other doors, sealed for now (pressing one says why)
  { id: "l5-door-9", at: { x: -38, z: -12.8 }, yaw: 180, sealed: "LEVEL 9 · A dark wooden door. Cold air under it. It won't give.", kind: "door" },
  { id: "l5-door-98", at: { x: -30.2, z: 6.5 }, yaw: 90, sealed: "LEVEL 98 · A metal door, warm to the touch. Bolted from the other side.", kind: "door" },
  { id: "l5-door-63", at: { x: 17.8, z: -8 }, yaw: 90, sealed: "LEVEL 63 · Birdsong behind this one. Leaves under the door. Locked fast.", kind: "door" },
  { id: "l5-gate-84", at: { x: -1, z: 11.8 }, yaw: 0, sealed: "LEVEL 84 · A tall wooden gate. Barred. It hasn't opened in years.", kind: "gate" },
  { id: "l5-door-6", at: { x: 45.8, z: 20 }, yaw: 90, sealed: "LEVEL 6 (Auxiliary Bulkhead) · Welded shut by boiler steam. Scratched into the rust: an arrow, north along the wall, and 'not this one'.", kind: "metal" },
  { id: "l5-door-78", at: { x: 45.8, z: -20 }, yaw: 90, sealed: "LEVEL 78 · An airlock. The wheel won't turn without pressure.", kind: "airlock" },
];
// arrival markers other places cross into (+ checkpoints for death respawn)
export const ARRIVALS = {
  "l5-from-l3": { x: -42.5, z: 0, yaw: 90 },
  "l5-from-l4": { x: -8, z: -17.5, yaw: 180 },
  "l5-from-l6": { x: 43.6, z: 6, yaw: -90 },
  "l5-lobby": { x: -38, z: 0, yaw: 90 },
};
// one arrival just inside each bookable room's door: the Bonus Room kiosk drops a resident here (Shelly Nov 12)
for (const o of OPENINGS) {
  const r = o.room && ZONES.find((q) => q.id === o.room); if (!r || (r.kind !== "guest" && r.kind !== "suite")) continue;
  const c = (o.a0 + o.a1) / 2, mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
  if (o.ax === "z") { const s = Math.sign(mz - o.at) || 1; ARRIVALS["l5-home-" + r.id] = { x: c, z: o.at + s * 1.4, yaw: s > 0 ? 180 : 0 }; }
  else { const s = Math.sign(mx - o.at) || 1; ARRIVALS["l5-home-" + r.id] = { x: o.at + s * 1.4, z: c, yaw: s > 0 ? -90 : 90 }; }
}
// guest elevators: floors 1-12 move you to another bank on this same floor; 13 and up you don't come back from
export const ELEVATORS = [
  { id: "l5-elev-lobby-n", at: { x: -45.2, z: -7 }, yaw: -90, style: "copper", name: "Lobby (copper cage)" },
  { id: "l5-elev-lobby-s", at: { x: -45.2, z: 7 }, yaw: -90, style: "modern", name: "Lobby" },
  { id: "l5-elev-corrS", at: { x: -6.2, z: 11.5 }, yaw: 90, style: "modern", name: "Guest Wing South" },
  { id: "l5-elev-salon", at: { x: 13.8, z: -18 }, yaw: 90, style: "copper", name: "The Salon" },
  { id: "l5-elev-maint", at: { x: 45.8, z: 0 }, yaw: 90, style: "freight", name: "Boiler Room (maintenance)" },
];
// the Boiler Room's machine grid: 3 m cells over its footprint; boiler.js blocks some with machines, keeps a walkable maze
export const BOILER = { x0: 18, z0: -26, cell: 3, nx: 9, nz: 17 };
export const facing = (dx, dz) => (dz > 0 ? 180 : dz < 0 ? 0 : dx > 0 ? -90 : 90); // yaw that turns a front (-Z) toward a direction
export function zoneAt(x, z) {
  // the smallest zone containing the point (cross halls sit inside nothing else, rooms don't overlap)
  let best = null;
  for (const r of ZONES) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) { if (!best || (r.x1 - r.x0) * (r.z1 - r.z0) < (best.x1 - best.x0) * (best.z1 - best.z0)) best = r; }
  return best;
}
export const DRAIN5 = Object.fromEntries(ZONES.map((r) => [r.id, r.drain]));
export const ZONE_NAMES = Object.fromEntries(ZONES.map((r) => [r.id, r.name ?? (r.kind === "guest" ? "Guest Room" : r.kind === "suite" ? "Suite" : r.id)]));
// a guest room's gold placard: numbers that follow no pattern (stable per room)
export const PLACARDS = { "room-n3": "217", "room-n4": "1408", "room-n5": "9", "room-s1": "313", "room-s2": "66", "room-s3": "1932", "room-s4": "4½", "suite-nw": "800", "suite-ne": "12A", "suite-sw": "237", "suite-se": "0" };
export const L5_NAMES = Object.fromEntries(
  ZONES.map((r) => [
    "l5_" + r.id,
    "Level 5 · " + (r.name ?? (r.kind === "guest" ? `Guest Room ${PLACARDS[r.id] ?? ""}` : r.kind === "suite" ? `Suite ${PLACARDS[r.id] ?? ""}` : r.id)),
  ])
);
export const HOT = ZONES.filter((r) => r.hot).map((r) => r.id);
// every lamp the sim lights; dressing lanes hang the fixture mesh at the same point (kind says which)
export const LIGHTS = (() => {
  const L = [], warm = "oklch(0.86 0.09 75)", add = (x, y, z, kind, intensity, distance, color = warm) => L.push({ x, y, z, kind, intensity, distance, color });
  add(-38, 6.6, -6, "chandelier", 18, 26); add(-38, 6.6, 6, "chandelier", 18, 26); // lobby: two crystal chandeliers
  for (let x = -27; x <= -9; x += 6) add(x, 4.4, 0, "pendant", 9, 13); // gallery pendants
  for (let x = -27; x <= -9; x += 6) { add(x, 2.3, -10.2, "sconce", 4.5, 8); add(x, 2.3, 12.8, "sconce", 4.5, 8); } // corridor sconces, one wall
  for (let x = -24; x <= -12; x += 6) { add(x, 2.3, -12.8, "sconce", 3.5, 7); add(x, 2.3, 10.2, "sconce", 3.5, 7); } // and the other wall, staggered
  add(-17.5, 3.3, -6.5, "flush", 5, 8); add(-17.5, 3.3, 6.5, "flush", 5, 8);
  for (const r of ZONES) if (r.kind === "guest" || r.kind === "suite") add((r.x0 + r.x1) / 2, r.h - 0.5, (r.z0 + r.z1) / 2, "lamp", r.kind === "suite" ? 5 : 4, 9, "oklch(0.8 0.1 65)");
  add(-26, 3.2, -17, "lamp", 5, 10, "oklch(0.82 0.1 70)"); add(-10, 3.3, 17, "flush", 6, 11, "oklch(0.92 0.05 90)"); add(-8, 3.2, -17, "bulb", 3, 7, "oklch(0.75 0.12 55)");
  for (const [x, z] of [[0, -6], [12, -6], [0, 6], [12, 6], [6, 0]]) add(x, 7.8, z, "chandelier", x === 6 ? 22 : 14, 22); // the Beverly Room
  add(6, 4, -18, "chandelier", 10, 15, "oklch(0.78 0.11 60)"); // the salon: low and red-gold
  for (const x of [-2, 6, 14]) add(x, 3.3, 18, "tube", 6, 11, "oklch(0.93 0.03 120)"); // Housekeeping: work lights
  for (let x = 22; x <= 44; x += 8) for (let z = -22; z <= 22; z += 11) add(x, 5.2, z, "cage", 5, 12, "oklch(0.68 0.17 45)"); // the Boiler Room: caged bulbs, orange
  return L;
})();
// radios playing the polonaise (the creator's track): one per lived-in space; E turns one off and on (scripts/l5-radio.js)
export const POLONAISE = "/cdn/music-violin-polonaise-classical-dance-zqs6sbbs.mp3";
export const RADIOS = [
  { id: "l5-radio-desk", x: -42.6, y: 0.95, z: 3.2, yaw: -90, where: "the front desk" },
  { id: "l5-radio-ball", x: 15.5, y: 0.95, z: -10.6, yaw: 0, where: "the Beverly Room's bandstand" },
  { id: "l5-radio-salon", x: 0.2, y: 0.8, z: -22.6, yaw: 0, where: "the Originals' salon" },
  { id: "l5-radio-kitchen", x: -7, y: 1.0, z: 20.4, yaw: 180, where: "Homely Hotel's dining room" },
  { id: "l5-radio-hk", x: 16.8, y: 0.95, z: 22.8, yaw: 180, where: "Housekeeping" },
  { id: "l5-radio-room", x: -15, y: 0.7, z: -20.4, yaw: 0, where: "Room 1408" },
  { id: "l5-radio-boiler", x: 20, y: 1.2, z: 23.5, yaw: -90, where: "the Boiler Room's foreman's desk" },
];
