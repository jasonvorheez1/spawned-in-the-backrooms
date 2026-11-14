// scripts/effects/magic.fx.js — god-mode Magic prefab. Edit freely: every placed Magic uses this script.
const { fx, pop, attr, range, curve, drag, up, flicker, spin, hdr, count, when, sphereDir, sphere, sprite, light, vortex, attract } = require("builtin/fx");

// Rotate a linear-rgb color around the gray axis. hue is the deck param (1 = the authored
// cyan/violet/orchid palette) — the rotation is plain JS, so one param re-tints every layer together.
function shiftHue(c, hue) {
  const a = (hue - 1) * Math.PI;
  const cs = Math.cos(a);
  const w = (1 - cs) / 3;
  const s = Math.sin(a) * Math.sqrt(1 / 3);
  const r = c[0] * (cs + w) + c[1] * (w - s) + c[2] * (w + s);
  const g = c[0] * (w + s) + c[1] * (cs + w) + c[2] * (w - s);
  const b = c[0] * (w - s) + c[1] * (w + s) + c[2] * (cs + w);
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

export function effect(ctx) {
  const intensity = ctx.params.intensity ?? 1; // spawn density (rates + volley counts)
  const scale = ctx.params.scale ?? 1; // particle + volume size
  const swirl = ctx.params.swirl ?? 1; // orbit strength of the arcane motes
  const hue = ctx.params.hue ?? 1; // palette rotation: 1 = cyan/violet, toward 0 or 2 = emerald/ember
  const boost = Math.min(intensity, 3); // caps ride the blessed 0-3 slider range, then clamp gracefully

  // Art-directed palette (linear rgb; components above 1 bloom under add blending).
  const C = (r, g, b) => {
    const c = shiftHue([r, g, b], hue);
    return hdr(c[0], c[1], c[2]);
  };
  const cyan = C(0.5, 1.15, 1.7);
  const violet = C(0.72, 0.52, 1.65);
  const orchid = C(1.55, 0.5, 1.35);
  const indigo = C(0.3, 0.2, 0.95);
  const afterglow = C(0.42, 0.16, 0.5);
  const white = hdr(2.6, 2.5, 2.2); // the flare accent stays white-hot at every hue

  // Core: the signature star-twinkle. Stars swell out of nothing around the anchor, drift up,
  // slide cyan -> violet -> orchid, and sparkle out (the flicker rides the alpha curve).
  const shimmer = pop("shimmer", {
    spawn: { rate: 30 * intensity, on: sphere({ radius: 0.62 * scale }) },
    lifetime: [1.5, 2.6],
    init: { v: sphereDir().mul(range(0.12, 0.45)).add(up(1).mul(range(0.25, 0.55))), size: range(0.14 * scale, 0.3 * scale) },
    accel: drag(0.5).add(up(0.35)),
    size: attr("size").mul(curve([0, 0.05], [0.16, 1], [0.55, 0.78], [1, 0.05])),
    color: curve([0, cyan], [0.45, violet], [0.8, orchid], [1, afterglow]),
    alpha: curve([0, 0], [0.15, 1], [0.7, 0.95], [1, 0]).mul(flicker(7, 0.3)).clamp01(),
    rotation: spin(0.25),
    maxParticles: Math.ceil(200 * boost),
    render: sprite({ texture: "particles/star_02", blend: "add" }),
  });

  // Orbit: arcane motes caught by the anchor. Vortex + attract + a touch of lift spiral them
  // inward and upward in slow helices; swirl is the creator's grip on the orbit.
  const motes = pop("motes", {
    spawn: { rate: 22 * intensity, on: sphere({ radius: 0.9 * scale }) },
    lifetime: [2.2, 3.6],
    init: { v: sphereDir().mul(range(0.05, 0.2)), size: range(0.05 * scale, 0.11 * scale) },
    accel: vortex(4.6 * swirl).add(attract(2.1)).add(up(0.4)).add(drag(1.25)),
    size: attr("size").mul(curve([0, 0.2], [0.2, 1], [0.85, 0.9], [1, 0.1])),
    color: curve([0, indigo], [0.5, violet], [1, cyan]),
    alpha: curve([0, 0], [0.12, 0.9], [0.8, 0.8], [1, 0]),
    maxParticles: Math.ceil(220 * boost),
    render: sprite({ texture: "textures/mote", blend: "add" }),
  });

  // Surge: staggered volleys of white-hot streaks thrown off the core — the moments that break
  // the loop's rhythm. Velocity stretch draws each as a short streak along its flight.
  const flares = pop("flares", {
    spawn: { burst: { count: [Math.round(5 * intensity), Math.round(9 * intensity)], every: [0.8, 1.6] }, on: sphere({ radius: 0.22 * scale }) },
    lifetime: [0.5, 0.95],
    init: { v: sphereDir().mul(range(1.4, 2.6)).add(up(1).mul(range(0.3, 0.9))), size: range(0.05 * scale, 0.1 * scale) },
    accel: drag(2.6).add(up(0.5)),
    size: attr("size").mul(curve([0, 1], [0.7, 0.75], [1, 0.15])),
    color: curve([0, white], [0.35, orchid], [1, afterglow]),
    alpha: curve([0, 0], [0.08, 1], [0.75, 0.9], [1, 0]),
    maxParticles: Math.ceil(64 * boost),
    render: sprite({ texture: "textures/ember", blend: "add", align: "velocity", stretch: 0.05 }),
  });

  // Payoff: when a shimmer star dies it pops into a puff of tiny stardust motes carrying the
  // parent's exact color at that moment (the inherit hand-off).
  const stardust = pop("stardust", {
    spawn: when(shimmer.dies, 0.4),
    inherit: { p: shimmer.p, tint: shimmer.color },
    lifetime: [0.35, 0.7],
    init: { v: sphereDir().mul(range(0.25, 0.7)), size: range(0.03 * scale, 0.07 * scale) },
    accel: drag(1.6).add(up(0.4)),
    size: attr("size").mul(curve([0, 1], [1, 0.2])),
    color: attr("tint").mul(1.35),
    alpha: curve([0, 0], [0.12, 0.9], [1, 0]),
    maxParticles: Math.ceil(48 * boost),
    render: sprite({ texture: "textures/mote", blend: "add" }),
  });

  // Bed: a persistent heart of soft glow discs at the core, breathing on slow flicker — the
  // effect reads as SOMETHING even from across the map.
  const glowheart = pop("glowheart", {
    count: 4,
    on: sphere({ radius: 0.14 * scale }),
    init: { size: range(0.5 * scale, 0.75 * scale) },
    size: attr("size").mul(flicker(1.3, 0.16)),
    color: range(indigo, violet).mul(flicker(0.8, 0.2)),
    alpha: flicker(0.9, 0.2).mul(0.38).clamp01(),
    rotation: range(0, 6.283),
    maxParticles: 6,
    render: sprite({ texture: "textures/soft-disc", blend: "add" }),
  });

  // Ground: one real point light. Intensity breathes on slow flicker and is coupled to the live
  // shimmer count, so pausing or dimming the effect dims the light with it. Fields stay
  // emitter-scoped (time/count/flicker), which the GPU light stand-in reproduces faithfully.
  const glimmer = pop("glimmer", {
    count: 1,
    at: sphere({ radius: 0.6 * scale }).center({ lift: 0.85 * scale }),
    attrs: { pulse: flicker(0.8, 0.22).mul(count(shimmer).div(42).clamp01()) },
    maxParticles: 1,
    render: light({ color: C(0.62, 0.5, 1.05), intensity: attr("pulse").mul(2.7), radius: 6 * scale }),
  });

  return fx(shimmer, motes, flares, stardust, glowheart, glimmer);
}
