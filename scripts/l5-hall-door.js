// A guest-room door leaf on Level 5 (kinematic, pivot on its hinge edge): E toggles it, walking up opens it,
// and it swings shut again a while after the doorway empties. state: { open, openYaw (+90 or -90), baseYaw, auto }
const NEAR = 1.6, SHUT_AFTER = 9000, RATE = 220;
export const ears = {
  press: (ctx) => { const s = ctx.self.state; s.open = !s.open; s.held = s.open ? ctx.now() : 0; sound(ctx, s.open); },
};
function sound(ctx, open) { ctx.emit("playSound", { clip: open ? "/cdn/moodboard-realistic-gritty/sfx-old-wooden-hotel-door-creak-open.mp3" : "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3", position: ctx.self.worldFeetPosition, volume: 0.45 }); }
export function update(ctx, dt) {
  const s = ctx.self.state, me = ctx.self.feetPosition, base = s.baseYaw ?? 0;
  let near = false; for (const p of ctx.place.players) { const f = p.feetPosition; if (f && Math.hypot(f.x - me.x, f.z - me.z) < NEAR) { near = true; break; } }
  if (near) { ctx.self.session.seen = ctx.now(); if (!s.open) { s.open = true; s.held = 0; sound(ctx, true); } }
  else if (s.open && !s.held && ctx.now() - (ctx.self.session.seen ?? 0) > SHUT_AFTER) { s.open = false; sound(ctx, false); }
  else if (s.open && s.held && ctx.now() - s.held > SHUT_AFTER * 4) { s.held = 0; }
  const target = s.open ? s.openYaw ?? 90 : 0, cur = ctx.self.session.yaw ?? (s.open ? target : 0);
  if (Math.abs(cur - target) > 0.01) { const nx = cur + Math.sign(target - cur) * Math.min(Math.abs(target - cur), RATE * dt); ctx.self.session.yaw = nx; ctx.self.rotation = { yaw: base + nx }; }
  else { ctx.self.session.yaw = target; ctx.sleep(0.25); }
}
