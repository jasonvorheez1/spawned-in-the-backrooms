// One escalator step: rides its loop on the room clock, starting from wherever it stands.
// state.dir = "up" | "down". Geometry matches scripts/lib/data/bonus.yml escalators (foot z 0 y 0, head z -10 y 5.5).
import { animate } from "builtin/tween";

const D = 10 / 27, HT = 0.2347, VH = 1.2 * Math.cos(28.81 * Math.PI / 180);
const yAt = (zl) => -0.55 * zl + 0.04 - HT;

function start(ctx) {
  const zl = Math.min(-0.001, Math.max(-9.999, ctx.self.feetPosition.z + D / 2));
  const pts = ctx.self.state?.dir === "down"
    ? [[0, -zl / VH], [-10, 0.001], [zl, (zl + 10) / VH]]
    : [[-10, (zl + 10) / VH], [0, 0.001], [zl, -zl / VH]];
  const leg = (f) => pts.map(([z, d]) => ({ value: f(z), duration: d, easing: "linear" }));
  animate(ctx, ctx.self.id, { "feetPosition.z": leg((z) => z - D / 2), "feetPosition.y": leg(yAt) }, { loop: true, easing: "linear" });
  ctx.self.session.running = ctx.self.state?.dir ?? "up";
}

export function onSpawn(ctx) { start(ctx); }

export function update(ctx) {
  if (ctx.self.session.running !== (ctx.self.state?.dir ?? "up")) start(ctx);
  ctx.sleep();
}
