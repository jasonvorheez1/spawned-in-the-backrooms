// Ground Mist — low sheets lying over a ~14m patch. Two layers: big soft puffs that
// give the body, and flat pooled discs lying on the ground under them. Nothing rises
// (a puff that climbs reads as smoke), peak alpha stays under 0.2 — the density comes
// from overlap, never from opacity — and soft: fades each sprite out where it meets
// geometry instead of knifing a hard edge through the terrain and the grass.
const { fx, pop, attr, range, curve, curl, drag, vec3, cone, spin, rgb, disc, sprite } = require("builtin/fx");

export function effect(ctx) {
  const spread = disc({ r: 6.5, jitter: 0.35, lift: 0.4 });
  const floorDisc = disc({ r: 7, jitter: 0.3, lift: 0.06 });

  // Body: rate × mean lifetime ≈ 22 puffs alive, drifting downwind at ~0.15 m/s.
  const sheets = pop("sheets", {
    spawn: { rate: 1.9, on: spread },
    lifetime: [8, 16],
    init: { v: cone(88).mul(range(0.03, 0.14)), size: range(2.8, 5.2) },
    accel: vec3(0.05, 0, 0.03).add(drag(0.35)).add(curl(0.05).mul(0.04)),
    size: attr("size").mul(curve([0, 0.65], [0.35, 1], [1, 1.3])),
    color: range(rgb(0.82, 0.85, 0.9), rgb(0.72, 0.76, 0.83)),
    alpha: curve([0, 0], [0.22, 0.18], [0.7, 0.16], [1, 0]),
    rotation: spin(0.03),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 1.5 }),
  });

  // Bed: wide flat discs lying on the ground so the mist reads as pooled, not floating.
  const pool = pop("pool", {
    spawn: { rate: 1.1, on: floorDisc },
    lifetime: [10, 18],
    init: { v: cone(89).mul(range(0.02, 0.09)), size: range(4.5, 8) },
    accel: vec3(0.04, 0, 0.02).add(drag(0.3)),
    size: attr("size").mul(curve([0, 0.7], [0.4, 1], [1, 1.25])),
    color: rgb(0.84, 0.87, 0.92),
    alpha: curve([0, 0], [0.25, 0.12], [0.7, 0.11], [1, 0]),
    rotation: spin(0.02),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", align: "ground", soft: 1.2 }),
  });

  return fx(sheets, pool);
}
