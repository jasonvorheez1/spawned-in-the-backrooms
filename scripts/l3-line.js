// a Level 3 assembly line running for nobody: boxes ride the belt end to end, the cabinet lamps blink.
// sits on an invisible root at the line's middle; state { len, beltY, box, n }
import { animate } from "builtin/tween";

const LAMPS = [["oklch(0.65 0.22 25)", 0], ["oklch(0.8 0.17 80)", 0.33], ["oklch(0.72 0.2 145)", 0.66]]; // red, amber, green, staggered

export function onSpawn(ctx) {
  const s = ctx.self.state, len = s.len ?? 12, n = s.n ?? 5, secs = len / 0.45; // my pick: 0.45 m/s belt
  const root = ctx.self.id;
  for (let i = 0; i < n; i++) {
    const id = ctx.spawn({ parent: root, feetPosition: { x: -len / 2, y: s.beltY ?? 0.8, z: 0 }, rotation: { yaw: (i * 37) % 20 - 10 },
      model: s.box, layout: { box: { min: { x: -0.24, y: 0, z: -0.2 }, max: { x: 0.24, y: 0.34, z: 0.2 } } }, castShadow: false, visibleRange: { max: 40 }, interpolation: { teleportThreshold: 2 } });
    animate(ctx, ctx.getObject(id), { "feetPosition.x": [-len / 2, len / 2] }, { duration: secs, easing: "linear", loop: true, delay: (secs / n) * i });
  }
  // the cabinet's three lamps, at the downstream end
  LAMPS.forEach(([color, off], i) => {
    const id = ctx.spawn({ parent: root, feetPosition: { x: len / 2 + 0.3, y: 1.35 - i * 0.18, z: 0.9 }, light: { kind: "point", color, intensity: 0.6, distance: 3, shadow: { enabled: false } }, visibleRange: { max: 30 } });
    animate(ctx, ctx.getObject(id), { "light.intensity": [0.05, 0.9, 0.05] }, { duration: 1.6 + i * 0.4, easing: "linear", loop: true, delay: off });
  });
}
