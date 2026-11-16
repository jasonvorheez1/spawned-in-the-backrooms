// one of the Gentleman's things (scripts/lib/l5-beast.js): the register, the 1408 card slot, his portraits, the windows
// The errand's outcome stays in pressProp; this file makes the thing itself answer the hand first.
import { pressProp } from "./lib/l5-beast.js";
import { animate } from "builtin/tween";
import { heard } from "./lib/hear.js";
import { maxSan } from "./player.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const rot = (o, a) => { const r = o.rotation ?? {}; return typeof r === "number" ? (a === "yaw" ? r : 0) : r[a] ?? 0; };
const MOVE = {
  // the ledger flips open a hand's width and settles
  register: (ctx, o) => { const y = o.feetPosition.y, w = rot(o, "yaw"); animate(ctx, o, { "feetPosition.y": [y, y + 0.05, y], "rotation.yaw": [w, w + 8, w] }, { duration: 0.45, easing: "easeOutQuad" }); return "heavy-ledger-book-thump-pages"; },
  // the brass flap sinks and snaps back on its spring
  slot: (ctx, o) => { animate(ctx, o, { "scale.y": [1, 0.35, 1.08, 1] }, { duration: 0.35, easing: "easeOutQuad" }); return "brass-letter-slot-flap-spring-clack"; },
  // the frame swings crooked on its wire, and stays a little crooked
  portrait: (ctx, o) => { const r = rot(o, "roll"), end = r > 1 ? 0 : 2.5; animate(ctx, o, { "rotation.roll": [r, r + 6, r - 4, end + 1.5, end] }, { duration: 1.1, easing: "linear" }); return "picture-frame-wire-creak-wall-scrape"; },
  // daylight swells through the glass, then pulls back
  window: (ctx, o) => { ctx.spawn({ parent: o.id, feetPosition: { x: 0, y: 1, z: 0.4 }, lifetime: 1.6, castShadow: false, light: { kind: "point", color: "#fff1c8", intensity: 2.2, distance: 5, shadow: { enabled: false } } }); return "faint-outdoor-breeze-through-glass"; },
};
export const ears = {
  press: (ctx, p) => {
    const me = ctx.self, kind = me.state.kind, who = ctx.getObject(p?.by);
    const clip = MOVE[kind]?.(ctx, me);
    if (clip) heard(ctx, { clip: G(clip), position: { ...me.worldFeetPosition, y: (me.worldFeetPosition?.y ?? 0) + 0.5 }, volume: 0.55, maxDistance: 10 });
    pressProp(ctx, kind, who);
    // real daylight is worth something down here: a little sanity, once every few minutes
    if (kind === "window" && who?.state && ctx.now() - (who.state.l5SunAt ?? -1e12) > 240000) {
      const s = who.state; s.l5SunAt = ctx.now();
      s.sanity = Math.min(maxSan(s.level ?? 1, s), (s.sanity ?? 0) + 5);
      ctx.emit("screenFlash", { color: "#fff1c8", duration: 0.6, intensity: 0.25 }, { audience: { player: who.id } });
    }
  },
};
