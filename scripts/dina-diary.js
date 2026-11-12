import { questVoice } from "./lib/dina-quest.js";
// Dina's diary on her sleeping bag (Level 1): reading it plays the cutscene on the reader's own screen (scripts/lib/dina-quest.js)
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by), s = p?.state; if (!s || s.dcut) return;
    if (s.dinaDiary) {
      s.sub = { who: "DINA'S DIARY", t: "River copied the return test. Cabin 23, SS Fun. If I miss the handoff, look there.", at: ctx.now(), d: 9500 }; questVoice(ctx, "q-dina", "River copied the return test. Cabin 23, SS Fun. If I miss the handoff, look there.", p.id);
      return;
    }
    s.dcut = { at: ctx.now() };
  },
};
