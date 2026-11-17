// A steel service door in the Level 31 crawl: E swings it on its hinge edge, with a sound each way.
const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export const ears = {
  press: (ctx) => {
    const open = (ctx.self.state.open = !ctx.self.state.open);
    ctx.self.state.verb = open ? "Close" : "Open";
    ctx.emit("playSound", { clip: SND(open ? "heavy-steel-service-door-creaks-open-rusty-hinge" : "heavy-steel-door-slams-shut-echo"), position: ctx.self.worldFeetPosition, volume: 0.7 });
  },
};
export function update(ctx, dt) {
  const target = ctx.self.state.open ? 100 : 0, yaw = ctx.self.state.yaw ?? 0;
  if (yaw === target) return ctx.sleep();
  const y = yaw + Math.sign(target - yaw) * Math.min(Math.abs(target - yaw), 220 * dt);
  ctx.self.state.yaw = y; ctx.self.rotation = { yaw: y };
}
