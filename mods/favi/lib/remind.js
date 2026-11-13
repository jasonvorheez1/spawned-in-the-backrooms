// /autoremind: one task Favi holds at world.state.favi.remind and nudges Savi about while it's unfinished.
// r = { id, task, doneWhen, at, last, progress, nudges, nextAt, done, stopped }. Savi writes r.last on every step,
// r.done when finished. Favi's nudge is a plain ctx.notifyDm: no model call, nothing of hers spends fuel.
export const QUIET_MS = 30000, GAP_MS = 30000, MAX_NUDGES = 30;
export function remindTick(ctx) {
  const f = ctx.world.state.favi, r = f?.remind; if (!r || r.done || r.stopped) return;
  const now = ctx.now();
  if (now - (r.last ?? r.at ?? now) < QUIET_MS || now < (r.nextAt ?? 0)) return;
  if ((r.nudges ?? 0) >= MAX_NUDGES) {
    r.stopped = "too many nudges"; r.nextAt = null;
    try { ctx.notifyDm(`favi /autoremind: i nudged ${MAX_NUDGES} times about "${r.task}" and it's still open, so i'm stopping. tell the creator where it stands.`, { wake: true }); } catch {}
    return;
  }
  r.nudges = (r.nudges ?? 0) + 1; r.nextAt = now + GAP_MS;
  try {
    ctx.notifyDm(`favi /autoremind (nudge ${r.nudges}): "${r.task}" isn't finished. done when: ${r.doneWhen || "the creator's ask is fully built"}. last progress: ${r.progress || "none noted"}. pick it up where you stopped (mods/favi/commands/autoremind.md); stamp world.state.favi.remind.last after each step and set .done = true when it's finished.`, { wake: true });
  } catch (e) { try { ctx.log("favi remind failed", String(e)); } catch {} }
}
