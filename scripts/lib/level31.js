// Level 31 "The Roller Rink": the one map every file builds to. Metres; +x east, +z south; floor y = 0; ceiling H.
export const H = 5, T = 0.3;
export const B = { x0: -42, x1: 42, z0: -30, z1: 30 }; // the building
export const RINK = { cx: 0, cz: 0, half: 10, r: 12, rail: 12.3 }; // a stadium: a 20 m straight with a 12 m radius end each side
export const ZONES = { // dressed by their own files; each is open to the carpet aisle round the rink
  arcade: { x0: 26, x1: 42, z0: -30, z1: 6 },
  food: { x0: 26, x1: 42, z0: 6, z1: 30 },
  rental: { x0: 2, x1: 24, z0: 21, z1: 30 },
  shop: { x0: -42, x1: -28, z0: -12, z1: 12 },
  cinema: { x0: -12, x1: 12, z0: -30, z1: -19 },
  dj: { x0: -9, x1: -3, z0: 14.5, z1: 18 },
};
export const ARRIVE = { x: -30, y: 0.1, z: 27 }; // just inside the plywood door (south wall, west end)
export const DOOR = { x: -30, z: 30 };
export const onRink = (x, z) => { const dx = Math.max(0, Math.abs(x - RINK.cx) - RINK.half); return Math.hypot(dx, z - RINK.cz) <= RINK.r; };
export const zoneAt = (x, z) => { if (onRink(x, z)) return "rink"; for (const [k, r] of Object.entries(ZONES)) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return k; return "carpet"; };
