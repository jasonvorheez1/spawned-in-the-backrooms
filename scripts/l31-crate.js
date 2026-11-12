// Level 31 "Side B": the DJ's crate behind the cinema screen. A press hands it to the presser's quest (scripts/lib/level31-quest.js).
import { openCrate } from "./lib/level31-quest.js";
export const ears = { press: (ctx, { by }) => { const p = by && ctx.getObject(by); if (p) openCrate(ctx, p); } };
