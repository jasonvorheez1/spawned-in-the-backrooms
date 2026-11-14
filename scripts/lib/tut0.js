// The tutorial Level 0 (johnadams2, Nov 8): one hand-laid route from the ceiling drop to Level 1.
// Read by scripts/tut0-geo.js (the mesh), places/tutorial0/sim.js (props, lights) and scripts/lib/tut0-cut.js (the beats).
export const H = 3
export const PACE = 1.7 // every tutorial scene plays this many times slower than its authored seconds (Shelly, Nov 8: "the pacing is too fast")
// [axis, p, a, b]: axis "x" = a wall at x = p running z a..b; axis "z" = at z = p running x a..b
export const WALLS = [
  // the drop room
  ["x", -5, -5, 5], ["x", 5, -5, 5], ["z", 5, -5, 5], ["z", -5, -5, -1.5], ["z", -5, 1.5, 5],
  // corridor A north, with the almond water alcove on its west side
  ["x", -1.5, -25, -18], ["x", -1.5, -14, -5], ["x", 1.5, -25, -5],
  ["z", -18, -5, -1.5], ["z", -14, -5, -1.5], ["x", -5, -18, -14],
  // room B, the bend
  ["z", -25, -4, -1.5], ["z", -25, 1.5, 4], ["z", -31, -4, 4], ["x", -4, -31, -25], ["x", 4, -31, -29.5], ["x", 4, -26.5, -25],
  // hall C east: the long hall where the lights die
  ["z", -29.5, 4, 40], ["z", -26.5, 4, 40],
  // room D, where the wall comes up behind you
  ["x", 40, -33, -29.5], ["x", 40, -26.5, -23], ["x", 48, -33, -23], ["z", -33, 40, 48], ["z", -23, 40, 42.5], ["z", -23, 45.5, 48],
  // corridor E south
  ["x", 42.5, -23, -8], ["x", 45.5, -23, -8],
  // room F, the soft floor
  ["z", -8, 38, 42.5], ["z", -8, 45.5, 52], ["z", 4, 38, 52], ["x", 38, -8, 4], ["x", 52, -8, 4],
]
export const PILLARS = [[41.5, -3.5], [48.5, -3.5], [41.5, 1.5], [48.5, 1.5]]
// light panels [x, z, hall] (hall = the blackout hall's own lights)
export const LIGHTS = [
  [-2.5, -2.5], [2.5, 2.5], [-2.5, 2.5], [2.5, -2.5],
  [0, -9], [0, -15], [-3.2, -16], [0, -21], [0, -28],
  [7, -28, 1], [13, -28, 1], [19, -28, 1], [25, -28, 1], [31, -28, 1], [37, -28, 2],
  [44, -30], [44, -26], [44, -18], [44, -12], [41, -5], [49, -5], [41, 2], [49, 2],
]
export const BOUNDS = { x0: -6, x1: 53, z0: -34, z1: 6 }
export const SHIFT = { x: 40, z0: -29.5, z1: -26.5 } // the wall that rises across hall C
export const ALMOND = { x: -4.2, y: 0.76, z: -16 }   // on the alcove desk
export const DESK = { x: -4.2, z: -16 }
export const UNIT = { x: -4.25, y: 0.76, z: -15.55 }  // the HALOGEN wrist unit beside the bottle
export const SMILER = { x: 36.5, z: -28 }
export const SOFT = { x: 45, z: -1.5, r: 1.6 }       // the wet patch that gives way
// the first entity (johnadams2, Nov 8: "i get cornered, i improvise with a table leg nearby and knock it down and run"): room B
export const ENC = { from: { x: 9, z: -28 }, corner: { x: -3.0, z: -30.0 }, desk: { x: -2.9, z: -29.6 }, leg: { x: -1.7, z: -30.4 } }
// the HALOGEN issue machine, Backrooms Robotics, against room D's east wall facing the room
export const HALO = { x: 47.35, z: -27.5, yaw: -90, stand: { x: 46.3, z: -27.5 } }
// the drawings someone taped up in corridor E and room F: [n, x, z, yaw, size]; they point at the wet spot
export const DRAWINGS = [[2, 42.78, -19.5, 90, 0.8], [1, 45.22, -16.2, -90, 0.8], [3, 42.78, -12.4, 90, 0.8], [4, 45, 3.72, 180, 1.1]]
// beats, in order: where each one starts (a box the player walks into)
export const BEATS = [
  { id: "encounter", box: [-1.5, 1.5, -27.2, -25.2] },
  { id: "smiler", box: [20, 24, -29.5, -26.5] }, // hall C: the lights die from the far end in, and something grins in the dark (Shelly, Nov 8)
  { id: "halogen", box: [41.8, 48, -33, -23] },
  { id: "drawings", box: [42.5, 45.5, -22, -20.4] },
  { id: "final", circle: SOFT },
]
