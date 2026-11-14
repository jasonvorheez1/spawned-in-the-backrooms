// Fall guard: after a crossing the floor of the new level can stream in a moment after the body lands.
// Hold the body still until a ray finds ground under it, remember the last place it stood, and catch a fall below the level.
import { raycast } from "builtin/physics";
const HOLD_MAX_MS = 6000; // my pick: give the floor up to 6 s to appear
export function update(ctx, dt) {
  const me = ctx.self;
  if (!me.isLocal && me.isLocal !== undefined) return ctx.sleep(5);
  const s = ctx.self.session;
  const place = me.place;
  if (s.fgPlace !== place) { s.fgPlace = place; s.fgHoldUntil = ctx.now() + HOLD_MAX_MS; s.fgHolding = true; s.fgSafe = null; }
  const p = me.feetPosition;
  if (s.fgHolding) {
    const hit = raycast(ctx, { x: p.x, y: p.y + 1, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 6 });
    if (hit || ctx.now() > s.fgHoldUntil) s.fgHolding = false;
    else { me.velocity = { x: 0, y: 0, z: 0 }; return; }
  }
  if (me.grounded && ctx.now() - (s.fgSavedAt ?? 0) > 500) { s.fgSafe = { x: p.x, y: p.y + 0.3, z: p.z }; s.fgSavedAt = ctx.now(); }
}
export function onOutOfBounds(ctx) {
  const s = ctx.self.session;
  if (!s.fgSafe) return true; // nothing safe known yet: the level's own spawn
  ctx.self.feetPosition = s.fgSafe;
  ctx.self.velocity = { x: 0, y: 0, z: 0 };
  s.fgHolding = true; s.fgHoldUntil = ctx.now() + HOLD_MAX_MS;
  return false;
}
