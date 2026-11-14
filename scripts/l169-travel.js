// E opens the road board or page, and moves the visible leaf on lockers and logbooks.
import { animate } from "builtin/tween";
import L from "./lib/data/level169.yml";
import { go, legsFrom, takeLocker, sleepBed } from "./lib/l169-road.js";

const PAGE = "cdn/moodboard-realistic-gritty/sfx-paper-notebook-page-flip.mp3";
const LATCH = "/cdn/moodboard-realistic-gritty/sfx-old-metal-lockbox-latch-snaps-open-lid-creaks.mp3";
const HOLD_MS = 3600;
function swing(ctx, open) {
  const motion = ctx.self.state.motion;
  const leaf = ctx.getObject(`${ctx.self.id}/leaf`);
  if (!leaf) return false;
  const pose = motion === "door" ? { "rotation.yaw": open ? -105 : 0 } : { "rotation.pitch": open ? -123 : 0 };
  animate(ctx, leaf, pose, { duration: open ? 0.48 : 0.62, easing: "easeInOutQuad" });
  return true;
}

function openLeaf(ctx) {
  const st = ctx.self.state;
  if (!st.motion) return;
  const now = ctx.now(), alreadyOpen = st.closeAt > now;
  if (!alreadyOpen && !swing(ctx, true)) return;
  st.closeAt = now + HOLD_MS;
  ctx.after(HOLD_MS / 1000, "closeLeaf", { at: st.closeAt });
  if (!alreadyOpen) ctx.emit("playSound", { clip: st.motion === "door" ? LATCH : PAGE, position: ctx.self.feetPosition, volume: 0.45 });
}

export function closeLeaf(ctx, { at }) {
  const st = ctx.self.state;
  if (st.closeAt !== at) return;
  st.closeAt = 0;
  swing(ctx, false);
}

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
    const p = ctx.getObject(by), st = ctx.self.state ?? {};
    if (!p?.state) return;
    if (st.kind === "board") {
      p.state.l169read = null;
      p.state.l169board = { site: st.site, id: ctx.self.id, at: Math.round(ctx.now()), legs: legsFrom(ctx, p.state, st.site, L), msg: "" };
      guide(ctx, p);
    } else if (st.kind === "locker") {
      openLeaf(ctx);
      takeLocker(ctx, p, st.site, L);
    } else if (st.kind === "bed") sleepBed(ctx, p, L);
    else if (st.kind === "read") {
      openLeaf(ctx);
      p.state.l169board = null;
      p.state.l169read = { id: ctx.self.id, at: Math.round(ctx.now()), title: st.title, lines: st.lines };
      guide(ctx, p);
    }
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
