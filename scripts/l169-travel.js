// Level 169 road interactions (scripts/lib/l169-road.js lays them): state.kind = board | read | void | guide.
// board: E opens the leg panel (player.state.l169board, drawn by scripts/l169-road-ui.js). read: E shows a page. void: the catch under the rim.
// guide: a session child of the player that hears the panel's buttons (sendAction('make', { k: 'l169go' | 'l169close' })).
import L from "./lib/data/level169.yml";
import { go, legsFrom, takeLocker, sleepBed } from "./lib/l169-road.js";
function guide(ctx, p) {
  if (p.state.l169guide && ctx.getObject(p.state.l169guide)) return;
  p.state.l169guide = ctx.spawn({ parent: p.id, scope: "session", tags: ["l169-guide"], behavior: "scripts/l169-travel.js", state: { kind: "guide" } });
}
export function onSpawn(ctx) {
  const st = ctx.self.state ?? {}; if (st.kind !== "board") return;
  for (const to of [st.next, st.prev]) if (to) ctx.on("ui:go-" + to, (ctx, { by }) => { const p = ctx.getObject(by); if (p) go(ctx, p, ctx.self.state.site, to, L); });
}
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by), st = ctx.self.state ?? {}; if (!p?.state) return;
    if (st.kind === "board") { p.state.l169read = null; p.state.l169board = { site: st.site, id: ctx.self.id, at: Math.round(ctx.now()), legs: legsFrom(ctx, p.state, st.site, L), msg: "" }; guide(ctx, p); }
    else if (st.kind === "locker") takeLocker(ctx, p, st.site, L);
    else if (st.kind === "bed") sleepBed(ctx, p, L);
    else if (st.kind === "read") { p.state.l169board = null; p.state.l169read = { id: ctx.self.id, at: Math.round(ctx.now()), title: st.title, lines: st.lines }; guide(ctx, p); }
  },
  l169apply: (ctx, v) => { if (ctx.self.state?.kind !== "guide") return; try { if (typeof ctx.session.sun === "number") ctx.session.sun = v.sun; if (typeof ctx.session.chill === "number") ctx.session.chill = v.chill; } catch (e) {} },
};
export function onInput(ctx, input) {
  if (ctx.self.state?.kind !== "guide") return;
  const d = input.actionData?.make; if (!input.pressed?.make || !d) return;
  const p = ctx.getObject(ctx.self.parent?.id ?? ctx.self.parent); if (!p?.state) return;
  if (d.k === "l169close") { p.state.l169board = null; p.state.l169read = null; }
  else if (d.k === "l169go" && p.state.l169board) go(ctx, p, p.state.l169board.site, String(d.to), L);
}
export function onTriggerEnter(ctx, other) {
  if (ctx.self.state?.kind !== "void" || !other?.state || other.userId === undefined) return;
  if (!other.state.l169fall) other.state.l169fall = { at: ctx.now() };
}
