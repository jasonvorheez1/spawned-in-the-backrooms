// Ticks Favi's chat brain (lib/brain.js) and her playtest eyes (lib/extras.js) four times a second on the room's host machine.
// One brain answers at a time: a lease in world.state.favi.beat names it, refreshed each second; a second brain
// (one favi.js stood in another place, or near a creator who spawns far from the origin) waits until the lease goes stale.
// A brain also walks itself to the nearest player so the world's 500 m tick bubble never puts it to sleep.
import { faviTick } from "lib/brain.js";
import { watchTick } from "lib/extras.js";
import { remindTick } from "lib/remind.js";
export const updateSchedule = { every: { seconds: 0.25 } };
export function update(ctx) {
  const s = ctx.world.state; s.favi ??= {}; const f = s.favi, now = ctx.now(), me = ctx.self.id;
  const b = f.beat;
  if (b && b.id !== me && now - (b.at ?? 0) < 4000) return;
  if (!b || b.id !== me || now - (b.at ?? 0) > 1000) {
    f.beat = { id: me, at: now };
    try {
      const pp = ctx.place.players ?? []; const p = ctx.self.feetPosition;
      if (pp.length && p) {
        let best = null, d = Infinity; for (const q of pp) { const k = Math.hypot(q.feetPosition.x - p.x, q.feetPosition.z - p.z); if (k < d) { d = k; best = q; } }
        if (best && d > 200) ctx.self.feetPosition = { x: best.feetPosition.x, y: best.feetPosition.y - 40, z: best.feetPosition.z };
      }
    } catch {}
  }
  // each part on its own: a chat fault must never stop her eyes (or the other way round)
  try { faviTick(ctx); } catch (e) { try { ctx.log("favi chat tick failed", String(e?.stack ?? e)); } catch {} }
  try { remindTick(ctx); } catch (e) { try { ctx.log("favi remind tick failed", String(e?.stack ?? e)); } catch {} }
  try { watchTick(ctx); } catch (e) { try { ctx.log("favi watch tick failed", String(e?.stack ?? e)); } catch {} }
}
