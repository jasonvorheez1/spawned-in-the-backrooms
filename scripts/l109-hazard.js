// Level 109 biohazard zone: rides the tape line of a biohazard room. Anyone standing past the line loses sanity slowly.
// state.box = { x0, x1, z0, z1 } world; the numbers live in scripts/lib/data/l109-rooms.yml (hazard).
import D from "./lib/data/l109-rooms.yml";
const HZ = D.hazard;
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  const s = ctx.self.state, b = s.box; if (!b) return;
  if (s.purged || (s.roomId && ctx.place.state?.l109Purged?.[s.roomId])) { s.purged = true; return ctx.sleep(); }
  const now = ctx.now();
  for (const p of ctx.place.players) {
    const f = p.feetPosition; if (!f || f.x < b.x0 || f.x > b.x1 || f.z < b.z0 || f.z > b.z1) continue;
    p.state.sanity = Math.max(0, (p.state.sanity ?? 100) - HZ.sanityPerSecond);
    const k = "l109hz" + p.id; if (now - (ctx.self.session[k] ?? -1e9) > HZ.noticeEveryS * 1000) { ctx.self.session[k] = now; p.state.notice = { text: HZ.notice + " (Find the green Decon Purge Switch by the strip curtain.)", at: now }; }
  }
}
