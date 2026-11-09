// Dina's diary on her sleeping bag (Level 1): reading it plays the cutscene on the reader's own screen (scripts/lib/dina-quest.js)
export const ears = {
  press: (ctx, d) => {
    const p = ctx.getObject(d?.by), s = p?.state; if (!s || s.dcut) return;
    s.dcut = { at: ctx.now() };
  },
};
