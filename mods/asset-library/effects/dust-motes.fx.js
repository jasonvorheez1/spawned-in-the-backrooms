// Dust Motes — the specks that hang in a shaft of window light. A ~2m-wide, ~5m-tall
// column of tiny bright flecks with almost no gravity, nudged around by a slow curl.
// Two bands seeded at different heights fill the column evenly instead of banding at
// one spawn plane. Additive blend + a slow per-speck noise is the catch-the-light
// twinkle. No light population — dust doesn't glow, it only gets lit.
const { fx, pop, attr, range, curve, curl, drag, up, sphereDir, noise, time, hdr, disc, sprite } = require("builtin/fx");

export function effect(ctx) {
  // One band definition, seeded twice — the second sits two metres higher.
  const band = (name, lift) =>
    pop(name, {
      spawn: { rate: 5, on: disc({ r: 0.9, jitter: 0.5, lift }) },
      lifetime: [11, 18],
      init: { v: sphereDir().mul(range(0.03, 0.15)), size: range(0.018, 0.045) },
      // Near-zero gravity: they sink a couple of centimetres a second at most.
      accel: curl(0.35).mul(0.09).add(up(-0.012)).add(drag(0.08)),
      size: attr("size"),
      color: range(hdr(2.4, 2.2, 1.8), hdr(3.4, 3.1, 2.5)),
      alpha: curve([0, 0], [0.1, 1], [0.88, 1], [1, 0]).mul(
        noise(time().mul(0.5).add(attr("rand").mul(30))).mul(0.55).add(0.45)
      ),
      render: sprite({ texture: "/cdn/effect-soft-glow-disc.png", blend: "add" }),
    });

  return fx(band("motesLow", 1.2), band("motesHigh", 3.3));
}
