// A guest-room door leaf on Level 5 (scripts/door-geo.js, kinematic, its feet ARE the hinge): E toggles it, walking up opens it,
// and it swings shut again a while after the doorway empties. Eased swing + creak/latch: scripts/lib/door-swing.js.
// state: { open, openYaw (+90 or -90), baseYaw, auto, c: the opening's centre (proximity is measured there) }
import { swingTo } from "./lib/door-swing.js";
import { heard } from "./lib/hear.js";
const NEAR = 1.6, SHUT_AFTER = 9000;
export const ears = {
  press: (ctx) => { const s = ctx.self.state; s.open = !s.open; s.held = s.open ? ctx.now() : 0; sound(ctx, s.open); },
};
// the sounds go through heard(): NPCs that listen hear a door too
function sound(ctx, open) { heard(ctx, { maxDistance: 18, refDistance: 3, clip: open ? "/cdn/moodboard-realistic-gritty/sfx-old-wooden-hotel-door-creak-open.mp3" : "/cdn/moodboard-realistic-gritty/sfx-wooden-door-close-latch-click.mp3", position: ctx.self.worldFeetPosition, volume: 0.5 }); }
export function update(ctx) {
  const s = ctx.self.state, me = s.c ?? ctx.self.feetPosition, base = s.baseYaw ?? 0;
  let near = false; for (const p of ctx.place.players) { const f = p.feetPosition; if (f && Math.hypot(f.x - me.x, f.z - me.z) < NEAR) { near = true; break; } }
  if (near && !s.lock) { ctx.self.session.seen = ctx.now(); if (!s.open) { s.open = true; s.held = 0; sound(ctx, true); } }
  else if (s.open && !s.held && ctx.now() - (ctx.self.session.seen ?? 0) > SHUT_AFTER) { s.open = false; sound(ctx, false); }
  else if (s.open && s.held && ctx.now() - s.held > SHUT_AFTER * 4) s.held = 0;
  if (!swingTo(ctx, base + (s.open ? s.openYaw ?? 90 : 0), !!s.open, "wood", true)) ctx.sleep(0.25);
}
