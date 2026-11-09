// Zenith Station's cleaning automatons, one manager (places/level01/sim.js lays it): every row tagged zbot walks its route
// (state.route: [[x, z], ...]) a leg at a time, pausing to "scrub" at each stop. A leg is one tween, so the bots keep their beat.
import { animate } from "builtin/tween";
export const updateSchedule = { every: { seconds: 0.5 } };
const SPEED = 0.55; // m/s, Savi's pick: a floor cleaner's crawl
export function update(ctx) {
  const now = ctx.now();
  for (const b of ctx.query({ tags: ["zbot"] })) {
    const s = b.state; if (!s.route?.length) continue;
    if (now < (s.until ?? 0)) continue;
    const i = ((s.i ?? 0) + 1) % s.route.length, [x, z] = s.route[i], f = b.feetPosition;
    const d = Math.hypot(x - f.x, z - f.z), dur = Math.max(0.5, d / SPEED);
    b.rotation = { yaw: (Math.atan2(-(x - f.x), -(z - f.z)) * 180) / Math.PI };
    animate(ctx, b, { "feetPosition.x": x, "feetPosition.z": z }, { duration: dur, easing: "linear" });
    s.i = i; s.until = now + dur * 1000 + 1500 + ctx.random() * 2500;
  }
}
