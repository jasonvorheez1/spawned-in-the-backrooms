// Level 70 quest objects (valves, breaker, cellar note, Froston footlocker): a press runs scripts/lib/level70-quest.js.
import { press70 } from "./lib/level70-quest.js";
export const ears = { press: (ctx, { by }) => { const p = by && ctx.getObject(by); if (p) press70(ctx, p, ctx.self); } };
