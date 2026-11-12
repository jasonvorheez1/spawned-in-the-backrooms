// Level 0.2's pressables: a Reality Freshener to take (quest slot or one a player set down), the crew's papers, Toaster.
import { gotFresh, pickPlaced } from "./lib/remodel-quest.js";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by), st = ctx.self.state; if (!p?.state) return;
    if (st.kind === "fresh") gotFresh(ctx, p, st.slot);
    else if (st.kind === "placed") pickPlaced(ctx, p, ctx.self.id);
    else if (st.text) p.state.notice = { text: st.text, at: ctx.now() };
  },
};
