// Magic Aura — motes spiralling up out of a glowing pool of light, sized to sit on
// a person or a relic: everything stays inside ~0.8m of the axis and ~1.8m tall, so
// parent it to a body and it reads as an enchantment rather than a bonfire.
// params.hue is degrees on the colour wheel: 285 violet, 30 amber, 140 emerald.
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  buoyancy,
  drag,
  vortex,
  attract,
  cone,
  up,
  flicker,
  count,
  hdr,
  rgb,
  disc,
  sprite,
  light,
} = require("builtin/fx");

// Plain JS HSV→RGB — runs once when effect(ctx) does, and again on any params patch.
export function hueRgb(hueDeg, sat, val) {
  const h = ((((hueDeg % 360) + 360) % 360) / 60) % 6;
  const i = h - (h % 1);
  const f = h - i;
  const p = val * (1 - sat);
  const q = val * (1 - sat * f);
  const t = val * (1 - sat * (1 - f));
  if (i === 0) return [val, t, p];
  if (i === 1) return [q, val, p];
  if (i === 2) return [p, val, t];
  if (i === 3) return [p, q, val];
  if (i === 4) return [t, p, val];
  return [val, p, q];
}

export function effect(ctx) {
  const hue = ctx.params && typeof ctx.params.hue === "number" ? ctx.params.hue : 285;
  const hot = hueRgb(hue, 0.4, 1); // near-white core of the hue
  const deep = hueRgb(hue, 0.9, 1); // saturated tail
  const core = hdr(hot[0] * 3.4, hot[1] * 3.4, hot[2] * 3.4);
  const tail = hdr(deep[0] * 1.5, deep[1] * 1.5, deep[2] * 1.5);
  const fade = hdr(deep[0] * 0.7, deep[1] * 0.7, deep[2] * 0.7);
  const lamp = rgb(deep[0], deep[1], deep[2]);

  const ground = disc({ r: 0.42, jitter: 0.4, lift: 0.05 });
  const pool = disc({ r: 0.6, jitter: 0.3, lift: 0.04 });

  // Core: motes lifted by buoyancy and swung around the axis by vortex; attract is
  // the leash that keeps the spiral inside the 0.8m envelope instead of flinging out.
  const motes = pop("motes", {
    spawn: { rate: flicker(0.5, 0.25).mul(75), on: ground },
    lifetime: [1.4, 2.2],
    init: { v: up(0.8).add(cone(40).mul(range(0.1, 0.45))), size: range(0.05, 0.12) },
    accel: vortex(3.2).add(attract(2.4)).add(buoyancy(1.25)).add(drag(1.3)).add(curl(0.6).mul(0.35)),
    size: attr("size").mul(curve([0, 0.4], [0.25, 1], [1, 0.25])),
    color: curve([0, core], [0.45, tail], [1, fade]),
    alpha: curve([0, 0], [0.12, 1], [0.7, 0.8], [1, 0]),
    render: sprite({ texture: "/cdn/effect-magic-mote.png", blend: "add" }),
  });

  // Accent: the rare fast spark that shoots higher than the rest.
  const sparks = pop("sparks", {
    spawn: { rate: 6, on: ground, burst: { count: [2, 4], every: [0.6, 1.6] } },
    lifetime: [0.5, 0.95],
    init: { v: up(1.9).add(cone(28).mul(range(0.2, 0.7))), size: range(0.02, 0.045) },
    accel: vortex(2.2).add(attract(2.8)).add(drag(1.1)),
    size: attr("size").mul(curve([0, 1], [1, 0.3])),
    color: core,
    alpha: curve([0, 0], [0.1, 1], [1, 0]).mul(flicker(9, 0.35)),
    render: sprite({ texture: "/cdn/effect-ember-glow.png", blend: "add", align: "velocity", stretch: 0.02 }),
  });

  // Bed: a flat pool of glow lying on the ground, breathing slowly. align "ground"
  // keeps it lying down instead of standing up as a billboard.
  const ring = pop("ring", {
    count: 18,
    on: pool,
    init: { size: range(0.3, 0.55) },
    size: attr("size").mul(flicker(0.35, 0.25)),
    color: tail,
    alpha: flicker(0.45, 0.4).mul(0.22),
    render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add", align: "ground" }),
  });

  // One faint light in the hue, tied to how much aura is alive.
  const aurlight = pop("aurlight", {
    count: 1,
    at: pool.center({ lift: 0.8 }),
    attrs: { glo: flicker(0.8, 0.22).mul(count(motes).div(60).clamp01()) },
    render: light({ color: lamp, intensity: attr("glo").mul(2.2), radius: 4 }),
  });

  return fx(motes, sparks, ring, aurlight);
}
