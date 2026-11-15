// Level 1.1's small things: notes and the cordon logger you press, and the seams, stretches of wall that are not there.
// A seam is the corridor's only other way out: step through and Level 1 has you, somewhere, a little worse for it.
import { notify } from "./lib/notify.js";
import { heard } from "./lib/hear.js";
import { carryAcross } from "./lib/carry.js";
import { readLogger } from "./lib/level1c-quest.js";
import { clearSector, L1_SPOTS } from "./lib/level1c-fx.js";
import { DATA as L } from "./lib/level1c.js";
export const ears = {
  press(ctx, { by }) {
    const p = by && ctx.getObject(by), k = ctx.self.state.kind; if (!p?.state) return;
    if (k === "note") return notify(ctx, p, ctx.self.state.text);
    if (k === "logger") { ctx.emit("playSound", { clip: "cdn/sfx-small-plastic-button-click-soft-electronic-beep.mp3", position: ctx.self.worldFeetPosition, volume: 0.6 }); return readLogger(ctx, p); }
  },
};
export function onTriggerEnter(ctx, other) {
  if (ctx.self.state.kind !== "seam" || !other?.state || other.state.level == null) return;
  const s = other.state, now = ctx.now();
  if (now - (ctx.self.session.at?.[other.id] ?? -1e9) < 3000) return;
  ctx.self.session.at = { ...(ctx.self.session.at ?? {}), [other.id]: now };
  s.hp = Math.max(1, (s.hp ?? 100) - L.seam.hurt); s.sanity = Math.max(0, (s.sanity ?? 100) - L.seam.sanity); // it never kills outright, and it is never free
  ctx.emit("screenFlash", { color: "#ff40d0", duration: 0.9, intensity: 1 }, { audience: { player: other.id } });
  ctx.emit("screenShake", { intensity: 0.8, duration: 0.5 }, { audience: { player: other.id } });
  heard(ctx, { maxDistance: 22, refDistance: 3, clip: "/cdn/moodboard-realistic-gritty/sfx-static-burst-glitch-threshold.mp3", position: other.feetPosition, volume: 0.9 }, { audience: { player: other.id } });
  const link = "level1#" + L1_SPOTS[Math.floor(ctx.random() * L1_SPOTS.length)];
  clearSector(other);
  s.clipKind = "wall"; s.notice = { text: "The wall wasn't there. Neither, for a moment, were you.", at: now };
  carryAcross(ctx, other, link);
  ctx.cross(other, link);
}
