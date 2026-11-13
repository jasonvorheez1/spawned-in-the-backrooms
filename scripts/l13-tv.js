// Level 13 television: always on. Watch = the flat's line on the presser's screen, and a click of the dial.
// Flat a8 on "Still Home": the press tries to retune it to Bea's weather (scripts/lib/level13-quest.js tuneTv).
import { heard } from "./lib/hear.js";
import { tuneTv } from "./lib/level13-quest.js";
const WEATHER = "A weather report for a town that is not on any map. Clear skies, forever. The Tenant sways in time with it.";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by); if (!p) return;
    if (tuneTv(ctx, p, ctx.self.state.flat)) { if ((p.state.l13calm ?? 0) > ctx.now() && ctx.self.state.line !== WEATHER) ctx.self.state.line = WEATHER; return; }
    p.state.notice = { text: ctx.self.state.line ?? "Snow.", at: ctx.now() };
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-old-crt-television-dial-click-static-burst.mp3", position: ctx.self.worldFeetPosition, volume: 0.4, maxDistance: 8 });
  },
};
