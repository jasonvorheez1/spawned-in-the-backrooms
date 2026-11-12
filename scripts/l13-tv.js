// Level 13 television: always on. Watch = the flat's line on the presser's screen, and a click of the dial.
import { heard } from "./lib/hear.js";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by); if (!p) return;
    p.state.notice = { text: ctx.self.state.line ?? "Snow.", at: ctx.now() };
    heard(ctx, { clip: "/cdn/moodboard-realistic-gritty/sfx-old-crt-television-dial-click-static-burst.mp3", position: ctx.self.worldFeetPosition, volume: 0.4, maxDistance: 8 });
  },
};
