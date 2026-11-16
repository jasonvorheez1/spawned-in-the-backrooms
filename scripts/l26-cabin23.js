// Cabin 23 on the SS Fun (Level 26): where Dina's diary pointed. River's drive case lies open on the bunk, foam cut to
// the drive's shape, empty. Opening it is the beat: the lid creaks, the hum of the party drops out for a breath, and the
// quest turns from "find the cabin" to "find who beat you here" (scripts/lib/dina-quest.js step 4). Show, don't tell:
// no caption reads the scene for you; the wet boot prints out the door and the cut foam say it.
// Every press: the case jolts on the bunk as the latches give, and water beads flick off the shell.
import { setDinaStep } from "./lib/dina-quest.js";
import { animate } from "builtin/tween";
import { puff } from "./lib/use-kick.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by), s = p?.state; if (!s) return;
    const at = { ...ctx.self.worldFeetPosition, y: (ctx.self.worldFeetPosition?.y ?? 0) + 0.6 };
    const me = { audience: { player: p.id } };
    const y = ctx.self.feetPosition.y;
    animate(ctx, ctx.self, { "feetPosition.y": [y, y + 0.03, y], "rotation.pitch": [0, -5, 2, 0] }, { duration: 0.4, easing: "easeOutQuad" }); // latches give, the shell jumps
    puff(ctx, "drops", at);
    ctx.emit("playSound", { clip: G("hard-plastic-case-latches-snap-open-lid-creak"), position: at, volume: 0.9, maxDistance: 10 }, me);
    if ((s.dinaQ ?? 0) >= 4) return; // already seen: the latches still snap, nothing new
    ctx.emit("playSound", { clip: G("low-dread-sting-single-cello-note-swell"), position: at, volume: 0.55, maxDistance: 10 }, me);
    ctx.emit("screenShake", { intensity: 0.12, duration: 0.4 }, me);
    setDinaStep(ctx, s, 4, "River’s drive is gone. The case is still wet.");
  },
};
