// Below the SS Fun's party (Level 26): where the drive thief slept, at the dead end past Phoebe's room. Damp bedroll, a wet coat
// for a pillow, and a train stub. Searching it is the beat (show, don't tell: no caption reads it for you): rustle, a creak of the
// hull, and the quest turns from "they're still aboard" to the B.N.T.G. trader Voss on Level 1 (scripts/lib/dina-quest.js step 6).
// Every press: the bedroll slumps and heaves under your hands and gives up a breath of mildew.
import { setDinaStep } from "./lib/dina-quest.js";
import { animate } from "builtin/tween";
import { puff } from "./lib/use-kick.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by), s = p?.state; if (!s) return;
    const at = { ...ctx.self.worldFeetPosition, y: (ctx.self.worldFeetPosition?.y ?? 0) + 0.3 };
    const me = { audience: { player: p.id } };
    animate(ctx, ctx.self, { scale: [1, 0.9, 1.04, 0.98, 1], "rotation.roll": [0, -3, 2, 0] }, { duration: 0.55, easing: "easeOutQuad" }); // rummaged: it sags and springs back
    puff(ctx, "dust", at);
    ctx.emit("playSound", { clip: G("rummaging-through-damp-sleeping-bag-nylon-rustle"), position: at, volume: 0.9, maxDistance: 10 }, me);
    if ((s.dinaQ ?? 0) >= 6) return; // already searched
    ctx.emit("playSound", { clip: G("low-dread-sting-single-cello-note-swell"), position: at, volume: 0.5, maxDistance: 10 }, me);
    ctx.emit("playSound", { clip: G("old-ship-hull-deep-metal-groan-creak"), position: at, volume: 0.6, maxDistance: 20 }, me);
    setDinaStep(ctx, s, 6, "The chit bears Voss’s stamp.");
  },
};
