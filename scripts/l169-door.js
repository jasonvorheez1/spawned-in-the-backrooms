// A door in Ferry's house: E swings it open or shut on its hinge (the leaf's local x = 0). state: { yaw0, swing: +1|-1, open }
export const ears = { press: (ctx) => { const s = ctx.self.state; s.open = !s.open; s.verb = s.open ? "Close" : "Open"; ctx.emit("playSound", { clip: s.open ? "/cdn/moodboard-realistic-gritty/sfx-old-wooden-door-creak-open.mp3" : "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-thud.mp3", position: ctx.self.feetPosition, volume: 0.5 }); } };
export function update(ctx, dt) {
  const s = ctx.self.state, goal = (s.yaw0 ?? 0) + (s.open ? 90 * (s.swing ?? 1) : 0);
  const k = ctx.self.session; k.yaw ??= goal;
  if (Math.abs(k.yaw - goal) < 0.3) { k.yaw = goal; ctx.self.rotation = goal; ctx.sleep(); return; }
  k.yaw += (goal - k.yaw) * Math.min(1, dt * 7); ctx.self.rotation = k.yaw;
}
