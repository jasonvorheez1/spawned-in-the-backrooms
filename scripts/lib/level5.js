// Level 5 "Terror Hotel": one floor of an endless 1930s hotel, 96 x 60 m. Every system reads this one plan:
// the base geometry (scripts/level5-geo.js), the sim (places/level5/sim.js), the zone lanes (scripts/lib/l5/*.js), player.js sanity.
// x runs west (-48) to east (+48), z north (-30) to south (+30). Floors at y = 0. Each zone draws its own walls inset T on its own side,
// so a shared edge is two thin walls back to back, each in its own room's wallpaper; an OPENING cuts both.
export const T = 0.15, DOORH = 2.4;
// zone: { id, kind, x0, x1, z0, z1, h (ceiling), name, drain (sanity / min, negative heals) }
export const ZONES = [
  { id: "lobby", kind: "lobby", name: "The Main Hall · Lobby", x0: -46, x1: -30, z0: -13, z1: 13, h: 7.5, drain: 0.6 },
  { id: "gallery", kind: "hall", name: "The Main Hall", x0: -30, x1: -6, z0: -3, z1: 3, h: 5, drain: 0.8 },
  { id: "crossN", kind: "hall", name: "The Main Hall", x0: -19, x1: -16, z0: -10, z1: -3, h: 3.6, drain: 0.8 },
  { id: "crossS", kind: "hall", name: "The Main Hall", x0: -19, x1: -16, z0: 3, z1: 10, h: 3.6, drain: 0.8 },
  { id: "corrN", kind: "corridor", name: "Guest Wing North", x0: -30, x1: -6, z0: -13, z1: -10, h: 3.6, drain: 1.0 },
  { id: "corrS", kind: "corridor", name: "Guest Wing South", x0: -30, x1: -6, z0: 10, z1: 13, h: 3.6, drain: 1.0 },
  // north row off corrN (doors on z = -13)
  { id: "library", kind: "library", name: "Lost Hall Society Library", x0: -30, x1: -22, z0: -21, z1: -13, h: 3.6, drain: 0.3 },
  { id: "room-n3", kind: "guest", x0: -22, x1: -18, z0: -21, z1: -13, h: 3.2, drain: 0.9 },
  { id: "room-n4", kind: "guest", x0: -18, x1: -14, z0: -21, z1: -13, h: 3.2, drain: 0.9 },
  { id: "room-n5", kind: "guest", x0: -14, x1: -10, z0: -21, z1: -13, h: 3.2, drain: 0.9 },
  { id: "stairs4", kind: "stairs", name: "Old Stairway · up to Level 4", x0: -10, x1: -6, z0: -21, z1: -13, h: 3.6, drain: 0.5 },
  // south row off corrS (doors on z = 13)
  { id: "room-s1", kind: "guest", x0: -30, x1: -26, z0: 13, z1: 21, h: 3.2, drain: 0.9 },
  { id: "room-s2", kind: "guest", x0: -26, x1: -22, z0: 13, z1: 21, h: 3.2, drain: 0.9 },
  { id: "room-s3", kind: "guest", x0: -22, x1: -18, z0: 13, z1: 21, h: 3.2, drain: 0.9 },
  { id: "room-s4", kind: "guest", x0: -18, x1: -14, z0: 13, z1: 21, h: 3.2, drain: 0.9 },
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
];
// openings: { ax, at, a0, a1, h, kind }. ax "z" = in a wall at z = at, spanning x a0..a1; ax "x" = in a wall at x = at, spanning z a0..a1
export const OPENINGS = [
  // lobby ↔ gallery (an arch), lobby ↔ both corridors
  { ax: "x", at: -30, a0: -2.2, a1: 2.2, h: 4.2, kind: "arch" },
  { ax: "x", at: -30, a0: -12.6, a1: -10.4, h: DOORH, kind: "arch" },
  { ax: "x", at: -30, a0: 10.4, a1: 12.6, h: DOORH, kind: "arch" },
  // gallery ↔ cross halls ↔ corridors
  { ax: "z", at: -3, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" }, { ax: "z", at: -10, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" },
  { ax: "z", at: 3, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" }, { ax: "z", at: 10, a0: -18.8, a1: -16.2, h: 3.2, kind: "arch" },
  // the corridors end in the Beverly Room's west wall? no: they dead-end in a window bay; the gallery opens east into the ballroom
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
  { id: "l5-stairs-up", at: { x: -8, z: -20.2 }, yaw: 0, to: "level4#l4-from-l5", label: "LEVEL 4", kind: "stairs" },
  // the lore's other doors, sealed for now (pressing one says why)
  { id: "l5-door-9", at: { x: -38, z: -12.8 }, yaw: 180, sealed: "LEVEL 9 · A dark wooden door. Cold air under it. It won't give.", kind: "door" },
  { id: "l5-door-98", at: { x: -29.8, z: 7 }, yaw: 90, sealed: "LEVEL 98 · A metal door, warm to the touch. Bolted from the other side.", kind: "door" },
  { id: "l5-door-63", at: { x: 17.8, z: -8 }, yaw: 90, sealed: "LEVEL 63 · Birdsong behind this one. Leaves under the door. Locked fast.", kind: "door" },
  { id: "l5-gate-84", at: { x: 6, z: 11.8 }, yaw: 180, sealed: "LEVEL 84 · A tall wooden gate. Barred. It hasn't opened in years.", kind: "gate" },
  { id: "l5-door-6", at: { x: 45.8, z: 20 }, yaw: 90, sealed: "LEVEL 6 · The handle burns your palm. The heat behind it is unbearable.", kind: "metal" },
  { id: "l5-door-78", at: { x: 45.8, z: -20 }, yaw: 90, sealed: "LEVEL 78 · An airlock. The wheel won't turn without pressure.", kind: "airlock" },
];
// arrival markers other places cross into (+ checkpoints for death respawn)
export const ARRIVALS = {
  "l5-from-l3": { x: -42.5, z: 0, yaw: 90 },
  "l5-from-l4": { x: -8, z: -17.5, yaw: 180 },
  "l5-lobby": { x: -38, z: 0, yaw: 90 },
};
// guest elevators: floors 1-12 move you to another bank on this same floor; 13 and up you don't come back from
export const ELEVATORS = [
  { id: "l5-elev-lobby-n", at: { x: -45.2, z: -7 }, yaw: -90, style: "copper", name: "Lobby (copper cage)" },
  { id: "l5-elev-lobby-s", at: { x: -45.2, z: 7 }, yaw: -90, style: "modern", name: "Lobby" },
  { id: "l5-elev-corrS", at: { x: -29.8, z: 11.5 }, yaw: 90, style: "modern", name: "Guest Wing South", face: "west" },
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
export const HOT = ZONES.filter((r) => r.hot).map((r) => r.id);
