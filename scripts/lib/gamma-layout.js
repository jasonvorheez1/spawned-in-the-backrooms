// Base Gamma's interior plan (place "gamma"): rooms, walls, openings, lights. Metres, x east, z south, entry at the south (z = 40).
// Shared by the shell geometry, the props and places/gamma/sim.js. Savi's picks; tune freely.
export const BAL = 4.5;            // balcony ring floor height in the atrium
export const VOID = [-15, 15, -6, 12]; // atrium void x0 x1 z0 z1 (the balcony ring is the rest of the atrium)
export const STAIRS = [[-15, -13], [13, 15]]; // x spans; each climbs from z 10 (floor) north to z 2.2 (balcony), 30 degrees
export const STAIR = { zLow: 10, zHigh: 2.2, land0: 0.6 };
// rooms: x0 x1 z0 z1 ceiling floor-kind
export const ROOMS = {
  sec: [-6, 6, 18, 40, 8, "terrazzo"],
  atr: [-22, 22, -12, 18, 12, "terrazzo"],
  old: [-30, -22, -12, 18, 4.5, "wood"],
  lng: [22, 30, 4, 18, 3.4, "carpet"],
  adm: [8, 22, 18, 32, 3.6, "carpet2"],
  res: [-30, 30, -40, -12, 16, "asphalt"],
};
// walls: axis, at, from, to, height, gaps [[a, b, top]]
export const WALLS = [
  ["z", 40, -6, 6, 8, [[-1.8, 1.8, 4]]],
  ["x", -6, 18, 40, 8, []], ["x", 6, 18, 40, 8, []],
  ["z", 18, -22, 22, 12, [[-3, 3, 4], [13, 15.2, 2.7]]],
  ["z", 18, -30, -22, 4.5, [[-27.5, -24.5, 3]]],
  ["x", -22, -12, 18, 12, [[-2, 6, 3.9]]],
  ["x", -30, -12, 18, 4.5, []],
  ["x", 22, -12, 18, 12, [[9, 12, 2.7]]],
  ["x", 30, 4, 18, 3.4, []], ["z", 4, 22, 30, 3.4, []],
  ["z", -12, -30, 30, 16, [[-4, 4, 6.5]]],
  ["x", -30, -40, -12, 16, []], ["x", 30, -40, -12, 16, []], ["z", -40, -30, 30, 16, []],
  ["z", 32, 8, 22, 3.6, []], ["x", 8, 18, 32, 3.6, []], ["x", 22, 18, 32, 3.6, []],
];
export const TUN = { x0: -28, x1: -24, z0: 18, z1: 37, rampTo: 34, depth: -3.6, h: 3 };
export const tunnelY = (z) => z <= 19 ? 0 : z >= TUN.rampTo ? TUN.depth : TUN.depth * (z - 19) / (TUN.rampTo - 19);
// the town under the residence roof: houses x0 x1 z0 z1 colour (porch faces the street at x = 0)
export const HOUSES = [
  [-16, -7, -21, -15, "oklch(0.72 0.12 25)"], [-16, -7, -29, -23, "oklch(0.78 0.11 200)"], [-16, -7, -37, -31, "oklch(0.82 0.12 95)"],
  [7, 16, -21, -15, "oklch(0.75 0.1 150)"], [7, 16, -29, -23, "oklch(0.72 0.11 320)"], [7, 16, -37, -31, "oklch(0.8 0.09 60)"],
  [19, 28, -19, -14, "oklch(0.7 0.1 260)"],
];
export const GAS = [18, 29, -37, -23];   // the gas station lot
export const APT = [-30, -18, -38, -16]; // the apartment block, corridor x -25..-23 running z -16 -> -36
// lights: x y z colour intensity distance fixture (troffer | pendant | lamp | red | flood | warm | cold | crt)
export const LIGHTS = [
  [0, 7.7, 37, "oklch(0.95 0.03 95)", 5, 16, "troffer"], [0, 7.7, 29, "oklch(0.95 0.03 95)", 5, 16, "troffer"], [0, 7.7, 21, "oklch(0.95 0.03 95)", 5, 16, "troffer"],
  [-12, 11.6, 0, "oklch(0.93 0.06 80)", 9, 28, "pendant"], [12, 11.6, 0, "oklch(0.93 0.06 80)", 9, 28, "pendant"], [0, 11.6, 9, "oklch(0.93 0.06 80)", 9, 28, "pendant"], [0, 11.6, -4, "oklch(0.93 0.06 80)", 9, 28, "pendant"],
  [-18.5, 4.2, -6, "oklch(0.9 0.08 75)", 4, 12, "troffer"], [18.5, 4.2, -6, "oklch(0.9 0.08 75)", 4, 12, "troffer"], [-18.5, 4.2, 12, "oklch(0.9 0.08 75)", 4, 12, "troffer"], [18.5, 4.2, 12, "oklch(0.9 0.08 75)", 4, 12, "troffer"],
  [-26, 4.2, 10, "oklch(0.85 0.12 65)", 4, 12, "warm"], [-26, 4.2, -4, "oklch(0.85 0.12 65)", 4, 12, "warm"],
  [26, 3.2, 8, "oklch(0.8 0.1 330)", 3, 10, "warm"], [26, 3.2, 15, "oklch(0.85 0.08 60)", 3, 10, "warm"],
  [15, 3.4, 22, "oklch(0.97 0.02 90)", 5, 12, "troffer"], [15, 3.4, 28, "oklch(0.97 0.02 90)", 5, 12, "troffer"],
  [-26, 2.6, 24, "oklch(0.8 0.13 65)", 2.2, 8, "bulb"], [-26, -1.0, 33, "oklch(0.7 0.14 50)", 1.6, 7, "bulb"],
  [-5.6, 4.6, -18, "oklch(0.85 0.1 75)", 3.5, 14, "lamp"], [5.6, 4.6, -26, "oklch(0.85 0.1 75)", 3.5, 14, "lamp"], [-5.6, 4.6, -34, "oklch(0.85 0.1 75)", 3.5, 14, "lamp"],
  [23.5, 4.6, -30, "oklch(0.6 0.22 25)", 5, 16, "red"], [-24, 2.4, -26, "oklch(0.85 0.03 220)", 1.6, 9, "cold"], [-24, 2.4, -34, "oklch(0.85 0.03 220)", 1.6, 9, "cold"],
];
