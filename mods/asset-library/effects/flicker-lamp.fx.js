// Flickering Lamp — a bulb on its way out: mostly steady, with brief dropouts when
// the contact loses it. The stutter is slow noise through a narrow smoothstep, and it
// never falls to black — a failing lamp guts down to an ember, it doesn't strobe.
// params.hue is the light's hue in degrees (75 = the usual sodium-warm bulb).
const {
  fx,
  pop,
  attr,
  range,
  curve,
  curl,
  drag,
  cone,
  noise,
  time,
  flicker,
  disc,
  sprite,
  light,
} = require("builtin/fx");

export function effect(ctx) {
  const hue = ctx.params && typeof ctx.params.hue === "number" ? ctx.params.hue : 75;
  const warm = "oklch(0.87 0.13 " + hue + ")";
  const bulb = disc({ r: 0.03 });

  // The stutter. noise() at 2.6Hz hovers well above the 0.18 gate, so the lamp mostly
  // holds; when it dips it drops for a fraction of a second. The .add(0.24) floor is
  // deliberate — dropouts are a gutter, not a blackout, and the slow flicker() on top
  // keeps the "steady" stretches faintly alive. Nothing here strobes.
  const gutter = noise(time().mul(2.6)).smoothstep(0.18, 0.34).mul(0.76).add(0.24).mul(flicker(1.4, 0.07));

  // One particle carrying both sinks: the light itself and the faint halo around the
  // glass, so the halo can only ever be as bright as the bulb driving it.
  const bulbGlow = pop("bulb", {
    count: 1,
    at: bulb.center({ lift: 0.04 }),
    attrs: { glo: gutter },
    size: attr("glo").mul(0.34).add(0.2),
    color: warm,
    alpha: attr("glo").mul(0.4),
    render: [
      sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
      light({ color: warm, intensity: attr("glo").mul(4.4), radius: 7 }),
    ],
  });

  // A couple of things circling the glass — dust, or whatever the light drew in.
  // Slow curl drift, a twinkle on the alpha, and they wander off after a few seconds.
  const motes = pop("motes", {
    spawn: { rate: 2.4, on: disc({ r: 0.55, lift: 0.3 }) },
    lifetime: [2.5, 4.5],
    init: { v: cone(75).mul(range(0.05, 0.22)), size: range(0.012, 0.028) },
    accel: curl(0.8).mul(0.5).add(drag(1.1)),
    size: attr("size"),
    color: warm,
    alpha: curve([0, 0], [0.15, 0.85], [0.8, 0.7], [1, 0]).mul(flicker(6, 0.5)),
    render: sprite({ texture: "/cdn/effect-magic-mote.png", blend: "add" }),
  });

  return fx(bulbGlow, motes);
}
