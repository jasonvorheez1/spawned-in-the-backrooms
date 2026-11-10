// A Level 2 side-room door: a scripts/door-geo.js leaf whose feet ARE its hinge; swings eased (scripts/lib/door-swing.js) to state.yaw0 shut or yaw0 - 95 open,
// creak on open, latch on shut. scripts/interact.js flips state.open.
import { swingTo } from "./lib/door-swing.js";
export function update(ctx) {
  const st = ctx.self.state;
  if (!swingTo(ctx, (st.yaw0 ?? 0) + (st.open ? -95 : 0), !!st.open, st.sfx ?? "wood")) ctx.sleep();
}
