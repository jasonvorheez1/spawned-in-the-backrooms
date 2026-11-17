// Level 22 "Ruins Left Behind": the one map every Level 22 file reads. Six decks of the Emstable car park in three tiers,
// joined by two "Cuts" (mined shafts with scaffold stairs past the sealed floors) and car ramps inside each tier.
// Canon (scripts/lib/data/lore/level-22.md): founders on the highest floor, easy lives 10-15 down, starvation below 16,
// concrete mined out from under everyone. Which six floors we show, and every coordinate, are Savi's picks.
export const FF = 3.2, H = 2.7, HX = 24, HZ = 36;
export const COLX = [-20, -12, -4, 4, 12, 20], COLZ = [-32, -24, -16, -8, 0, 8, 16, 24, 32];
export const col = (ix, iz) => ix * 9 + iz;
export const RAMP = [12.6, -10, 19.4, 10];          // every in-tier car ramp: rises toward +z from the lower deck
export const CUT1 = [-19.4, 8.6, -12.6, 15.4];      // Floor 2 -> Floor 13
export const CUT2 = [-19.4, -23.4, -12.6, -16.6];   // Floor 14 -> Floor 20
export const MINE = [-11.4, -7.4, 3.4, -0.6];       // cut through Floor 20's slab; a fallen slab is the way down
export const PIT = [-3.4, 8.6, 11.4, 23.4];         // Floor 21: the big mine. No bottom you can reach.
export const EXIT = [-3.4, -33.4, 3.4, -26.6];      // Floor 1's ceiling fell in: the rubble climbs to Level 21
// fragile slab panels: they creak, shed dust, then go. id, floor, rect
export const PANELS = [
  { id: "p13a", floor: 13, r: [-3, 20, 0, 23] }, { id: "p14a", floor: 14, r: [4.6, -3, 7.6, 0] },
  { id: "p20a", floor: 20, r: [-8, 12, -5, 15] }, { id: "p20b", floor: 20, r: [6, -20, 9, -17] },
  { id: "p21a", floor: 21, r: [-6.4, 10, -3.4, 13] }, { id: "p21b", floor: 21, r: [-3.4, 5.6, -0.4, 8.6] }, { id: "p21c", floor: 21, r: [11.4, 18, 14.4, 21] },
];
const pan = (f) => PANELS.filter((p) => p.floor === f).map((p) => p.r);
export const DECKS = [
  { floor: 1, y: 0, tier: "top", lit: 0.8, p: { holes: [[...RAMP, "wen"]], ceilHoles: [EXIT], ramps: [{ r: [-3, -33, 3, -27], dir: "-z", fallen: true }], mouth: true } },
  { floor: 2, y: -FF, tier: "top", lit: 0.6, p: { holes: [[...CUT1, "sew"]], ceilHoles: [RAMP], ramps: [{ r: RAMP, dir: "+z" }] } },
  { floor: 13, y: -FF * 12, tier: "mid", lit: 0.35, p: { holes: [[...RAMP, "wen"], ...pan(13)], ceilHoles: [CUT1], stripped: [col(1, 2), col(4, 7)] } },
  { floor: 14, y: -FF * 13, tier: "mid", lit: 0.25, p: { holes: [[...CUT2, "s"], ...pan(14)], ceilHoles: [RAMP, ...pan(13)], ramps: [{ r: RAMP, dir: "+z" }], stripped: [col(0, 6), col(2, 1), col(3, 6)] } },
  { floor: 20, y: -FF * 19, tier: "low", lit: 0.24, p: { holes: [[...RAMP, "w"], MINE, ...pan(20)], ceilHoles: [CUT2], stripped: [col(1, 4), col(2, 6), col(3, 2), col(4, 1), col(5, 6), col(0, 2)], missing: [col(2, 3), col(4, 5)] } },
  { floor: 21, y: -FF * 20, tier: "low", lit: 0.18, p: { holes: [PIT, ...pan(21)], ceilHoles: [RAMP, MINE, ...pan(20)], ramps: [{ r: RAMP, dir: "+z", gap: [0.42, 0.56] }, { r: [-11, -6.6, -3, -1.4], dir: "-x", fallen: true }],
      stripped: [col(1, 5), col(1, 6), col(2, 4), col(3, 4), col(4, 4), col(4, 7), col(0, 7), col(2, 8), col(5, 3), col(1, 1), col(3, 1)], missing: [col(2, 7), col(4, 6), col(4, 2)] } },
];
export const CUTS = [
  { id: "l22-cut1", r: CUT1, y: -FF, depth: FF * 11, flights: 15, floors: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "l22-cut2", r: CUT2, y: -FF * 13, depth: FF * 6, flights: 8, floors: [15, 16, 17, 18, 19] },
  { id: "l22-pit", r: PIT, y: -FF * 20, depth: 26, flights: 0, floors: [22, 23, 24, 25, 26, 27, 28] },
];
export const deckOf = (y) => { let best = null; for (const d of DECKS) if (y > d.y - 0.6 && y < d.y + H) best = d; return best; };
export const inRect = (x, z, r, m = 0) => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m;
