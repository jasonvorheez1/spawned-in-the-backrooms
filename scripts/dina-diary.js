import { questVoice } from "./lib/dina-quest.js";
import { animate } from "builtin/tween";
// Dina's diary on her sleeping bag (Level 1): reading it plays the cutscene on the reader's own screen (scripts/lib/dina-quest.js)
// Every press: the diary lifts off the bag, its cover flips, a page rustles.
const PAGE = "/cdn/moodboard-realistic-gritty/sfx-worn-paperback-diary-cover-flipped-open-page-rustle.mp3";
function flip(ctx, by) {
  const y = ctx.self.feetPosition.y, yaw = ctx.self.rotation?.yaw ?? 0;
  animate(ctx, ctx.self, { "feetPosition.y": [y, y + 0.05, y], "rotation.roll": [0, -14, 0], "rotation.yaw": [yaw, yaw + 6, yaw] }, { duration: 0.45, easing: "easeOutQuad" });
  ctx.emit("playSound", { clip: PAGE, position: ctx.self.worldFeetPosition ?? ctx.self.feetPosition, volume: 0.7, maxDistance: 8 }, { audience: { player: by } });
}
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by), s = p?.state; if (!s || s.dcut) return;
    flip(ctx, p.id);
    if (s.dinaDiary) {
      s.sub = { who: "DINA'S DIARY", t: "River copied the return test. Cabin 23, SS Fun. If I miss the handoff, look there.", at: ctx.now(), d: 9500 }; questVoice(ctx, "q-dina", "River copied the return test. Cabin 23, SS Fun. If I miss the handoff, look there.", p.id);
      return;
    }
    s.dcut = { at: ctx.now() };
  },
};
