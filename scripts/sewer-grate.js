// A sewer grate you climb down through (Level 9's storm drain, Level 11's street grate) into Level 34, or a hatch that will not open.
// Press E on it: state.to is where you come out; with no state.to it only tells you state.info.
// The grate itself answers: it heaves up off its seat and slides aside as you drop, then clanks back. Level 34's iron rungs only shudder.
// A stuck grate still pays once in a while: something always washes into the slots.
import { carryAcross } from "./lib/carry.js";
import { animate } from "builtin/tween";
import { puff, ready } from "./lib/use-kick.js";
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const FINDS = [ // what's wedged in the bars of a grate that won't open: [cents, line]
  [25, "A Backquarter's wedged in the bars under a wad of gum. You work it loose."],
  [5, "Bottle cap, a dead AA, and a Backnickel. You keep the nickel."],
  [100, "A Backdollar, folded into a tiny paper boat. Someone was bored down here."],
  [0, "Just a soggy bus transfer for Route 9. Expired 1996."],
];
const rungs = (o) => o.primitive?.params?.kind === "rungs";
const base = (ctx) => (ctx.self.state.base ??= { ...ctx.self.feetPosition, roll: ctx.self.rotation?.roll ?? 0 });
export function settle(ctx) {
  const b = ctx.self.state.base; if (!b) return;
  animate(ctx, ctx.self, { "feetPosition.x": b.x, "feetPosition.y": b.y, "feetPosition.z": b.z, "rotation.roll": b.roll }, { duration: 0.5, easing: "easeInQuad" });
  ctx.after(0.5, "clank", {});
}
export function clank(ctx) { ctx.emit("playSound", { clip: G("heavy-cast-iron-grate-dropped-back-into-frame-clank"), position: ctx.self.worldFeetPosition, volume: 0.7, maxDistance: 18 }); }
export const ears = {
  press: (ctx, { by }) => {
    const who = ctx.getObject(by), w = who?.state; if (!w || w.level == null) return;
    const to = ctx.self.state.to, now = ctx.now(), pos = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, at = { ...pos, y: pos.y + 0.1 };
    if (!to) {
      animate(ctx, ctx.self, { "rotation.roll": [0, 2.5, -2, 1, 0] }, { duration: 0.35, easing: "easeOutQuad" });
      puff(ctx, "dust", at);
      ctx.emit("playSound", { clip: G("rusted-iron-hatch-rattling-stuck-will-not-open"), position: pos, volume: 0.7 });
      if (ready(w, "grate:" + ctx.self.id, 20 * 60000, now)) {
        const [c, line] = FINDS[Math.floor(ctx.random() * FINDS.length) % FINDS.length];
        if (c) { w.cents = (w.cents ?? 0) + c; ctx.emit("damageNumber", { position: { ...at, y: at.y + 0.5 }, text: `+$${(c / 100).toFixed(2)}`, color: "#9fcf8a" }, { audience: { player: who.id } }); }
        w.notice = { text: line, at: now };
      } else w.notice = { text: ctx.self.state.info ?? "Bolted from underneath. You can hear water, not footsteps.", at: now };
      return;
    }
    if (rungs(ctx.self)) { // Level 34's iron rungs: they shudder in the bolts as you take them
      animate(ctx, ctx.self, { "rotation.roll": [0, 1.2, -0.8, 0] }, { duration: 0.3, easing: "easeOutQuad" });
      puff(ctx, "drops", { ...pos, y: pos.y + 1.6 });
      ctx.emit("playSound", { clip: G("boots-on-wet-iron-ladder-rungs-climbing"), position: pos, volume: 0.7, maxDistance: 14 });
    } else { // the grate heaves up and scrapes aside, then drops back behind you
      const b = base(ctx);
      animate(ctx, ctx.self, { "feetPosition.y": [b.y, b.y + 0.14, b.y + 0.1], "feetPosition.x": [b.x, b.x, b.x + 0.55], "rotation.roll": [b.roll, b.roll - 9, b.roll - 4] }, { duration: 0.6, easing: "easeOutCubic" });
      puff(ctx, "steam", at);
      ctx.after(1.8, "settle", {});
      ctx.emit("playSound", { clip: G("heavy-iron-sewer-grate-lifted-scraping-on-concrete"), position: pos, volume: 0.8 });
    }
    ctx.emit("screenFlash", { color: "#000000", duration: 0.9, intensity: 1 }, { audience: { player: who.id } });
    w.clipKind = "floor";
    carryAcross(ctx, who, to);
    ctx.cross(who, to);
  },
};
