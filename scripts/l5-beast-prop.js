// one of the Gentleman's things (scripts/lib/l5-beast.js): the register, the 1408 card slot, his portraits, the windows
import { pressProp } from "./lib/l5-beast.js";
export const ears = { press: (ctx, p) => pressProp(ctx, ctx.self.state.kind, ctx.getObject(p?.by)) };
