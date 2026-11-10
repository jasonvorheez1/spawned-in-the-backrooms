// The eased swing every hinged door shares: fast start, soft stop over DUR s, a creak as it opens and a latch as it lands shut.
// swingTo(ctx, goalYaw, open, kind): call from update(); returns true while moving. kind "wood" | "metal" picks the sounds.
const DUR = 0.6;
const SFX = {
  wood: ["/cdn/moodboard-realistic-gritty/sfx-old-wooden-hotel-door-creak-open.mp3", "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3"],
  metal: ["/cdn/moodboard-realistic-gritty/sfx-heavy-steel-door-creak-open.mp3", "/cdn/moodboard-realistic-gritty/sfx-steel-door-latch-clank-shut.mp3"],
};
export function sfx(ctx, open, kind = "wood") { ctx.emit("playSound", { clip: (SFX[kind] ?? SFX.wood)[open ? 0 : 1], position: ctx.self.worldFeetPosition, volume: 0.5, refDistance: 3, maxDistance: 22 }); }
export function swingTo(ctx, goal, open, kind = "wood", quiet = false) {
  const m = ctx.self.session;
  if (m.dg == null) { m.dg = goal; m.dy = goal; m.dopen = open; ctx.self.rotation = { yaw: goal }; return false; } // a fresh machine: stand where state says, no sound
  if (goal !== m.dg) { m.df = m.dy; m.dg = goal; m.dt = ctx.now(); if (open && !m.dopen && !quiet) sfx(ctx, true, kind); m.dopen = open; m.dl = !open; }
  if (m.dt == null) return false;
  const t = Math.min(1, (ctx.now() - m.dt) / (DUR * 1000)), e = 1 - Math.pow(1 - t, 3);
  m.dy = m.df + (m.dg - m.df) * e; ctx.self.rotation = { yaw: m.dy };
  if (t >= 1) { m.dt = null; if (m.dl && !quiet) sfx(ctx, false, kind); m.dl = false; return false; }
  return true;
}
