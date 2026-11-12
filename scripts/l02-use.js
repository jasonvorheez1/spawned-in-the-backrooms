// Level 0.2's pressables: a Reality Freshener to take (quest slot or one a player set down), the crew's papers, Toaster.
import { gotFresh, pickPlaced, gotPaint } from "./lib/remodel-quest.js";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by), st = ctx.self.state; if (!p?.state) return;
    if (st.kind === "fresh") gotFresh(ctx, p, st.slot);
    else if (st.kind === "placed") pickPlaced(ctx, p, ctx.self.id);
    else if (st.kind === "paint") gotPaint(ctx, p, ctx.self.id);
    else if (st.kind === "lamp") { // a work lamp: E flips it; places/level02 sim reads l02grid.lamps and freezes the walls it lights
      const g = ctx.place.state.l02grid; const on = !(g?.lamps?.[ctx.self.id]);
      if (g) g.lamps = { ...(g.lamps ?? {}), [ctx.self.id]: on };
      ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-heavy-rocker-switch-click-halogen-work-light.mp3", position: ctx.self.worldFeetPosition, volume: 0.6, maxDistance: 12 });
    }
    else if (st.text) p.state.notice = { text: st.text, at: ctx.now() };
  },
};
