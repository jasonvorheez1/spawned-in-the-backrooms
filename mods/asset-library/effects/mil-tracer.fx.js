// Tracer — one round leaving a barrel and running downrange: a white-hot head
// with a burning tail behind it, thrown along params.dir, and a flash of muzzle
// smoke left where it started.
//
// The direction is a construction-time param, so re-aiming a live tracer is one
// fx.params patch. Spawn it per shot: it is a one-shot and removes itself.
//
// params.dir    [x, y, z] — it is normalised here, so any length works
// params.speed  metres per second (default 110)
// params.range  metres before it burns out (default 140)
// params.hue    0 = the standard orange-red, 1 = a green enemy tracer
const { fx, pop, attr, range, curve, curl, drag, gravity, cone, up, vec3, spin, hdr, rgb, when, disc, sphere, sprite, ribbon, light } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const raw = Array.isArray(p.dir) && p.dir.length === 3 ? p.dir : [0, 0.03, -1];
  const len = Math.hypot(raw[0], raw[1], raw[2]) || 1;
  const dir = [raw[0] / len, raw[1] / len, raw[2] / len];
  const speed = typeof p.speed === "number" ? p.speed : 110;
  const reach = typeof p.range === "number" ? p.range : 140;
  const hue = typeof p.hue === "number" ? p.hue : 0;
  const flight = Math.max(0.15, reach / speed);

  const shot = vec3(dir[0] * speed, dir[1] * speed, dir[2] * speed);
  // Standard tracer burns orange-red; the green is what you see coming back.
  const hot = hue > 0.5 ? hdr(1.4, 9, 2.2) : hdr(9, 3.4, 0.9);
  const cool = hue > 0.5 ? hdr(0.3, 2.6, 0.6) : hdr(2.6, 0.7, 0.15);
  const lightColor = hue > 0.5 ? rgb(0.4, 1, 0.5) : rgb(1, 0.55, 0.25);

  // The round itself: one particle, stretched along its own velocity so the
  // head IS a streak, with a ribbon burning out behind it and a small light
  // riding along so it lights what it passes.
  const head = pop("head", {
    spawn: { burst: { count: 1 }, on: sphere({ radius: 0.02 }) },
    lifetime: flight,
    init: { v: shot },
    accel: gravity().mul(0.25).add(drag(0.05)),
    color: curve([0, hot], [0.6, hot.mul(0.7)], [1, cool]),
    alpha: curve([0, 1], [0.85, 0.9], [1, 0]),
    size: curve([0, 0.16], [1, 0.1]),
    render: [
      sprite({ texture: "/cdn/effect-glow-streak-soft.png", blend: "add", align: "velocity", stretch: 0.022 }),
      ribbon({ length: 0.16, width: curve([0, 0.09], [1, 0]), color: cool.mul(0.8) }),
      light({ color: lightColor, intensity: 2.4, radius: 6 }),
    ],
  });

  // The burn: a few more sparks travelling with the round on a slightly loose
  // heading — what gives the streak thickness and a frayed edge.
  const burn = pop("burn", {
    spawn: { burst: { count: [5, 8] }, on: sphere({ radius: 0.03 }) },
    lifetime: [flight * 0.5, flight * 0.9],
    init: { v: shot.mul(range(0.94, 1.0)).add(cone(80).mul(range(0.2, 1.4))) },
    accel: gravity().mul(0.3).add(drag(0.4)),
    color: curve([0, hot.mul(0.6)], [1, cool.mul(0.4)]),
    alpha: curve([0, 0.9], [1, 0]),
    size: curve([0, 0.06], [1, 0.02]),
    render: sprite({ texture: "/cdn/effect-spark-streak.png", blend: "add", align: "velocity", stretch: 0.02 }),
  });

  // Where it was fired from: a hard little flash and a smear of smoke, gone in
  // under a second.
  const muzzle = pop("muzzle", {
    spawn: { burst: { count: [3, 5] }, on: disc({ r: 0.05 }) },
    lifetime: 0.07,
    init: { v: shot.mul(0.02) },
    color: curve([0, hdr(8, 6, 3)], [1, hdr(2.5, 1.2, 0.4)]),
    alpha: curve([0, 1], [1, 0]),
    size: curve([0, 0.3], [1, 0.6]),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
  });

  const wisp = pop("wisp", {
    spawn: { burst: { count: [2, 4] }, on: disc({ r: 0.08 }) },
    lifetime: [0.4, 0.8],
    init: { v: shot.mul(0.03).add(up(0.4)).add(cone(50).mul(range(0.1, 0.5))), size: range(0.1, 0.2) },
    accel: drag(1.6),
    size: attr("size").mul(curve([0, 0.8], [1, 2.6])),
    color: rgb(0.3, 0.28, 0.26),
    alpha: curve([0, 0], [0.2, 0.3], [1, 0]),
    rotation: spin(0.3),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha" }),
  });

  // Burn-out at the far end: the round spends itself in a handful of sparks.
  const spend = pop("spend", {
    spawn: when(head.dies, 1),
    inherit: { p: head.p, v: head.v.mul(0.06) },
    lifetime: [0.2, 0.45],
    init: { v: cone(90).mul(range(1, 4)) },
    accel: gravity().add(drag(2)),
    color: curve([0, hot.mul(0.8)], [1, cool.mul(0.3)]),
    alpha: curve([0, 1], [1, 0]),
    size: 0.05,
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add", align: "velocity", stretch: 0.03 }),
  });

  return fx(head, burn, muzzle, wisp, spend);
}
