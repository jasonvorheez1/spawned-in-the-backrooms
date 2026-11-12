// A Level 3 steel door leaf: feet at the hinge, swung eased (lib/door-swing.js) open into the hall; interact.js flips state.open.
// The leaf's own doorway trigger (scripts/l3-hatch-pass.js) carries whoever steps in to the twin door through the wall.
import { swingTo } from "./lib/door-swing.js";
export function update(ctx) {
  const st = ctx.self.state;
  if (!swingTo(ctx, (st.yaw0 ?? 0) + (st.open ? st.swing ?? 95 : 0), !!st.open, "metal")) ctx.sleep();
}
