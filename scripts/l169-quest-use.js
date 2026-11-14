// Level 169 quest things you press (scripts/interact.js `usable`): the bucket, the sign, lockers, bundles, the B½ record.
import { useThing } from "./lib/level169-quest.js";
export const ears = { press: (ctx, { by }) => { const p = ctx.getObject(by); if (p) useThing(ctx, p, ctx.self); } };
