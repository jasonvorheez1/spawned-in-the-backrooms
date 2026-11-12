// Level 31: the DJ's console (Tripo). On the "Side B" dub route a press runs the copy (scripts/lib/level31-quest.js).
import { useDeck } from "./lib/level31-quest.js";
export const ears = { press: (ctx, { by }) => { const p = by && ctx.getObject(by); if (p) useDeck(ctx, p); } };
