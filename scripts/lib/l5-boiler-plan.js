// The Boiler Room's insides (zone "boiler", BOILER grid in scripts/lib/level5.js): which 3 m cells hold which machine,
// where the leaks drip, where the steam vents burst, where the loot sits. Geometry, the vents and the heat all read this.
import { BOILER } from "./level5.js";
export const cellC = (i, j) => ({ x: BOILER.x0 + BOILER.cell * (i + 0.5), z: BOILER.z0 + BOILER.cell * (j + 0.5) });
export const MARGIN = 0.25; // each machine stands this far inside its cells: lanes between machines are >= 3.5 m before pipes and clutter
// [kind, i, j, wi, wj, yaw] (yaw turns the machine's front, -Z, toward the lane it faces)
const ROWS = [
  ["tank", 1, 0, 1, 1, 180], ["boiler", 2, 0, 2, 2, 90], ["turbine", 5, 0, 2, 2, 180], ["pump", 0, 2, 1, 1, -90], ["panel", 5, 2, 1, 2, 90],
  ["furnace", 2, 3, 2, 2, 0], ["coal", 0, 3, 1, 2, -90], ["boiler", 7, 3, 2, 2, 90], ["furnace", 4, 5, 2, 2, 90], ["turbine", 1, 6, 2, 2, 0],
  ["pump", 7, 6, 1, 1, 90], ["condenser", 7, 7, 2, 1, 0], ["panel", 5, 8, 1, 2, 90], ["boiler", 0, 10, 2, 2, 180], ["condenser", 3, 10, 1, 2, 90],
  ["tank", 3, 12, 1, 1, 90], ["turbine", 7, 10, 2, 1, 0], ["furnace", 5, 11, 2, 2, 0], ["pump", 8, 12, 1, 1, 90], ["coal", 1, 13, 1, 2, -90],
  ["tank", 8, 13, 1, 1, 90], ["boiler", 3, 14, 2, 2, 0], ["panel", 6, 14, 2, 1, 180], ["compressor", 2, 16, 2, 1, 0], ["coal", 6, 16, 2, 1, 0],
];
export const MACHINES = ROWS.map(([kind, i, j, wi, wj, yaw], n) => {
  const a = cellC(i, j), b = cellC(i + wi - 1, j + wj - 1), W = wi * BOILER.cell - 2 * MARGIN, D = wj * BOILER.cell - 2 * MARGIN;
  const turned = Math.abs(yaw) === 90; // the geometry is modelled with width along its own x: a turned machine swaps its sides
  return { id: `l5-boil-m${n}`, kind, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, yaw, w: turned ? D : W, d: turned ? W : D, cells: [i, j, wi, wj] };
});
// the furnaces' mouths (fire, flicker light, whispers, the heat's sources)
export const FURNACES = MACHINES.filter((m) => m.kind === "furnace").map((m) => {
  const r = (m.yaw * Math.PI) / 180, fx = -Math.sin(r), fz = -Math.cos(r);
  return { id: m.id, x: m.x + fx * (m.d / 2 + 0.05), z: m.z + fz * (m.d / 2 + 0.05), yaw: m.yaw, cx: m.x, cz: m.z };
});
// ceiling pipe runs (y up near the 6 m ceiling) the leaks hang from; wall runs are drawn round the room by the pipe geometry
export const RUNS_X = [{ z: -21.5, y: 5.45 }, { z: -0.5, y: 5.5 }, { z: 11.5, y: 5.4 }, { z: 14.5, y: 5.6 }]; // along x from wall to wall
export const RUNS_Z = [{ x: 22.5, y: 5.0 }, { x: 31.5, y: 5.05 }, { x: 37.5, y: 4.95 }]; // along z, slung under the others
// almond water dripping from leaking joints: cools whoever stands under it
export const LEAKS = [
  { id: "l5-boil-leak-0", x: 22.5, z: -12.5, y: 5.0 }, { id: "l5-boil-leak-1", x: 31.5, z: -0.5, y: 5.05 },
  { id: "l5-boil-leak-2", x: 37.5, z: 14.5, y: 4.95 }, { id: "l5-boil-leak-3", x: 25.5, z: 11.5, y: 5.4 }, { id: "l5-boil-leak-4", x: 40.5, z: -21.5, y: 5.45 },
];
// floor steam vents: hiss 1 s (the tell), then a 1.6 s jet that scalds anyone standing in it
export const VENTS = [
  { id: "l5-boil-vent-0", x: 31.5, z: -12.5, period: 9, phase: 0 }, { id: "l5-boil-vent-1", x: 25.5, z: 1.5, period: 11, phase: 3.5 },
  { id: "l5-boil-vent-2", x: 34.5, z: 14.5, period: 8, phase: 5 }, { id: "l5-boil-vent-3", x: 40.5, z: -9.5, period: 10, phase: 1.5 },
  { id: "l5-boil-vent-4", x: 25.5, z: 20.5, period: 12, phase: 7 },
];
export const VENT = { tell: 1.0, burst: 1.6, radius: 0.7, height: 3.2, damage: 4 };
export const HEAT = { base: 1.2, furnace: 3.2, furnaceReach: 7, boiler: 0.6, boilerReach: 4, leakCool: 7, leakReach: 2.0, outsideCool: 5, hurtAt: 70, hurtEvery: 2.5, hurt: 1 };
