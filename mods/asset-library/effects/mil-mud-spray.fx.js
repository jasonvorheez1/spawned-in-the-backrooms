// Mud Spray — wet ground thrown up: a track biting into a flooded field, a
// round landing in the shell-hole slurry, a boot pulling out. Heavy gouts that
// arc and stick where they land, a fine spatter that beads and splats, and a
// dirty veil hanging over the whole thing.
//
// One-shot; it winds down and removes itself. Throw it in a direction with
// params.dir (the way the track is turning), or leave it for a straight-up
// splash.
//
// params.power  0.5 = a boot, 1 = a tank track, 2 = a shell in the slurry
// params.dir    [x, y, z] the spray is thrown along (default straight up)
// params.wet    0 = dust-dry clay, 1 = soaked (default 1) — darkens and slows it
const { fx, pop, attr, range, curve, curl, drag, gravity, up, cone, vec3, spin, rgb, when, disc, sphere, sprite } = require("builtin/fx");

export function effect(ctx) {
  const p = ctx.params || {};
  const power = typeof p.power === "number" ? p.power : 1;
  const wet = typeof p.wet === "number" ? p.wet : 1;
  const raw = Array.isArray(p.dir) && p.dir.length === 3 ? p.dir : [0, 1, 0];
  const len = Math.hypot(raw[0], raw[1], raw[2]) || 1;
  const throwV = vec3((raw[0] / len) * 5 * power, (raw[1] / len) * 5 * power, (raw[2] / len) * 5 * power);

  // Wet mud is darker and heavier than dry clay.
  const bodyCol = rgb(0.19 - 0.06 * wet, 0.15 - 0.05 * wet, 0.11 - 0.035 * wet);
  const paleCol = rgb(0.3 - 0.08 * wet, 0.25 - 0.07 * wet, 0.19 - 0.05 * wet);
  const seat = disc({ r: 0.4 * power, jitter: 0.4 });

  // The gouts: fat slugs of mud on real arcs. They land and STICK — the clamp
  // is what says wet; dry dirt would bounce.
  const gouts = pop("gouts", {
    spawn: { burst: { count: [14 * power, 24 * power] }, on: sphere({ radius: 0.16 * power }) },
    lifetime: [0.9, 1.7],
    init: { v: throwV.add(cone(50).mul(range(1.5, 5.5 * power))), size: range(0.1, 0.26) },
    accel: gravity().add(drag(0.3 + 0.3 * wet)),
    floor: "stick",
    size: attr("size").mul(power),
    color: range(bodyCol, paleCol),
    alpha: curve([0, 1], [0.8, 1], [1, 0]),
    rotation: spin(2),
    render: sprite({ texture: "/cdn/effect-mud-blob.png", blend: "alpha" }),
  });

  // The spatter: fine wet flecks, faster and looser, dying the moment they
  // touch ground so each one can leave a mark.
  const spatter = pop("spatter", {
    spawn: { burst: { count: [40 * power, 60 * power] }, on: seat },
    lifetime: [0.5, 1.1],
    init: { v: throwV.mul(1.25).add(cone(70).mul(range(2, 8 * power))), size: range(0.03, 0.08) },
    accel: gravity().add(drag(0.6)),
    floor: "die",
    size: attr("size"),
    color: bodyCol,
    alpha: 0.95,
    render: sprite({ texture: "/cdn/effect-droplet-round-soft.png", blend: "alpha", align: "velocity", stretch: 0.05 }),
  });

  // The payoff: a flat dark splat lying on the ground wherever a fleck landed,
  // spreading and fading out. This is the population that sells "mud".
  const splat = pop("splat", {
    spawn: when(spatter.dies, 0.7),
    inherit: { p: spatter.p },
    lifetime: [0.7, 1.4],
    init: { size: range(0.1, 0.24) },
    size: attr("size").mul(power).mul(curve([0, 0.4], [0.3, 1], [1, 1.25])),
    color: bodyCol,
    alpha: curve([0, 0], [0.15, 0.85], [0.7, 0.7], [1, 0]),
    rotation: spin(0.2),
    render: sprite({ texture: "/cdn/effect-mud-blob.png", blend: "alpha", align: "ground" }),
  });

  // The veil: dirty air over the churn, low and short-lived, so the spray has
  // something to read against.
  const veil = pop("veil", {
    spawn: { burst: { count: [10 * power, 16 * power] }, on: disc({ r: 0.6 * power, lift: 0.1 }) },
    lifetime: [0.7, 1.3],
    init: { v: up(1.2).add(cone(65).mul(range(0.5, 2.2))), size: range(0.35, 0.6) },
    accel: drag(2.6).add(curl(0.5).mul(0.5)),
    size: attr("size").mul(power).mul(curve([0, 0.6], [1, 2.2])),
    color: paleCol,
    alpha: curve([0, 0], [0.15, 0.36], [1, 0]),
    rotation: spin(0.35),
    render: sprite({ texture: "/cdn/effect-smoke-puff.png", blend: "alpha", soft: 0.4 }),
  });

  return fx(gouts, spatter, splat, veil);
}
