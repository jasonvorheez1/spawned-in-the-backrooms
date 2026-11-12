// Bea's locket (Level 13 "Still Home"): a usable thing; the press hands it to the presser's quest (scripts/lib/level13-quest.js).
import { takeKeepsake } from "./lib/level13-quest.js";
export const ears = { press: (ctx, { by }) => { const p = by && ctx.getObject(by); if (p) takeKeepsake(ctx, p, ctx.self.state.route); } };
