// Signal Flare — a magnesium star swinging under a parachute, coming down slow
// and lighting the ground it passes over. Spawn it high (30–50 m over the spot
// you want lit); it burns for params.burn seconds and takes itself away.
//
// The descent is AUTHORED rather than integrated: pos: replaces integration, so
// the star, its canopy, its smoke trail and its spitting sparks all read the
// same descent expression and stay locked together. Because the smoke reads the
// flare's position AT ITS OWN BIRTH TIME (time() minus age), the trail hangs in
// the air where the flare has been instead of falling with it.
//
// params.burn     seconds the star burns (default 26)
// params.fall     descent in m/s under the canopy (default 2.2)
// params.heading  degrees the wind carries it toward
// params.wind     sideways drift in m/s (default 1.1)
const { fx, pop, attr, range, curve, curl, time, cone, vec3, flicker, hdr, rgb, disc, point, sprite, light } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const burn = typeof p.burn === "number" ? p.burn : 26;
  const fall = typeof p.fall === "number" ? p.fall : 2.2;
  const heading = typeof p.heading === "number" ? p.heading : 40;
  const wind = typeof p.wind === "number" ? p.wind : 1.1;

  const rad = (heading * Math.PI) / 180;
  const driftX = -Math.sin(rad) * wind;
  const driftZ = -Math.cos(rad) * wind;

  const T = time();
  const age = attr("age");
  const born = T.sub(age); // when this particle's flare-position was true

  // Where the star is at any moment: a straight sink downwind, plus the slow
  // pendulum every parachute load swings through.
  function pathAt(tf) {
    return vec3(driftX, -fall, driftZ)
      .mul(tf)
      .add(vec3(1, 0, 0).mul(tf.mul(0.75).sin().mul(0.8)))
      .add(vec3(0, 0, 1).mul(tf.mul(0.58).cos().mul(0.6)));
  }

  const here = pathAt(T); // the star, now
  const wasThere = pathAt(born); // where it was when this particle was born

  // The star: one particle, blinding white with a warm edge, flickering the way
  // burning magnesium does, and carrying the light that does the actual work.
  const star = pop("star", {
    count: 1,
    at: point().center(),
    space: "local",
    pos: here,
    attrs: { burnT: flicker(6, 0.22) },
    color: hdr(9, 8.2, 6).mul(attr("burnT")),
    alpha: 1,
    size: attr("burnT").mul(0.7),
    render: [
      sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
      light({ color: rgb(1, 0.94, 0.82), intensity: attr("burnT").mul(9), radius: 45 }),
    ],
  });

  // The canopy: a pale dome riding two metres above the star, lit from below by
  // it, rocking on the same swing.
  const canopy = pop("canopy", {
    count: 1,
    at: point().center(),
    space: "local",
    pos: here.add(vec3(0, 2.1, 0)),
    color: rgb(0.95, 0.88, 0.72),
    alpha: 0.9,
    size: 2.6,
    rotation: T.mul(0.5).sin().mul(0.16),
    render: sprite({ texture: "/cdn/effect-parachute-canopy.png", blend: "alpha" }),
  });

  // The trail: smoke born at the flare and left behind in the air. Each puff
  // holds the position the star occupied when it was born, then drifts on its
  // own — so the trail draws the path the flare came down.
  const trail = pop("trail", {
    spawn: { rate: 22, on: disc({ r: 0.05 }) },
    window: [0, burn],
    lifetime: [3, 5],
    space: "local",
    init: { away: cone(70).mul(range(0.05, 0.3)), size: range(0.25, 0.5) },
    pos: wasThere.add(attr("away").mul(age)).add(vec3(0, 0.25, 0).mul(age)).add(curl(0.3).mul(0.6)),
    size: attr("size").mul(curve([0, 0.5], [1, 3])),
    color: curve([0, rgb(0.5, 0.48, 0.45)], [1, rgb(0.32, 0.31, 0.3)]),
    alpha: curve([0, 0], [0.15, 0.3], [0.65, 0.2], [1, 0]),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.6 }),
  });

  // Spit: burning magnesium flecks dropping off the star on their own arcs.
  const spit = pop("spit", {
    spawn: { rate: 16, on: disc({ r: 0.05 }) },
    window: [0, burn],
    lifetime: [0.5, 1.1],
    space: "local",
    init: { kick: cone(75).mul(range(0.8, 3)) },
    pos: wasThere.add(attr("kick").mul(age)).add(vec3(0, -4.9, 0).mul(age.mul(age))),
    color: curve([0, hdr(8, 7, 4.5)], [1, hdr(2, 1.1, 0.3)]),
    alpha: curve([0, 1], [1, 0]),
    size: curve([0, 0.07], [1, 0.02]),
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add" }),
  });

  return fx(star, canopy, trail, spit);
}
