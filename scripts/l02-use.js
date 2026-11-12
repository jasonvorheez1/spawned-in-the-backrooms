// Level 0.2's pressables: a Reality Freshener to take (quest slot or one a player set down), the crew's papers, Toaster.
import { gotFresh, pickPlaced } from "./lib/remodel-quest.js";
import { skillsOf } from "./lib/stats.js";
export const ears = {
  press: (ctx, { by }) => {
    const p = ctx.getObject(by), st = ctx.self.state; if (!p?.state) return;
    if (st.kind === "fresh") gotFresh(ctx, p, st.slot);
    else if (st.kind === "placed") pickPlaced(ctx, p, ctx.self.id);
    else if (st.kind === "release") {
      const room = ctx.place.state;
      const ready = room.liftDown || room.liftRelease, canRepair = (skillsOf(p.state).repair ?? 0) >= 35;
      if (!ready && canRepair) room.liftRelease = true;
      p.state.notice = { text: ready ? "The freight lift is already released."
        : canRepair ? "Brake released. Stand clear of the lift."
        : "Repair 35 required. The counterweight pan takes three 14 kg paint cans.", at: ctx.now() };
    }
    else if (st.text) p.state.notice = { text: st.text, at: ctx.now() };
  },
};
