// A sewer grate you climb down through (Level 9's storm drain, Level 11's street grate) into Level 34, or a hatch that will not open.
// Press E on it: state.to is where you come out; with no state.to it only tells you state.info.
import { carryAcross } from "./lib/carry.js";
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w || w.level == null) return;
    const to = ctx.self.state.to, now = ctx.now();
    if (!to) { w.notice = { text: ctx.self.state.info ?? "It won't budge.", at: now }; ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-rusted-iron-hatch-rattling-stuck-will-not-open.mp3", position: ctx.self.feetPosition, volume: 0.7 }); return; }
    ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: who.id } });
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-iron-sewer-grate-lifted-scraping-on-concrete.mp3", position: ctx.self.feetPosition, volume: 0.8 });
    w.clipKind = "floor";
    carryAcross(ctx, who, to);
    ctx.cross(who, to);
  },
};
