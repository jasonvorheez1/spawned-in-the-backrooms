// A built door (scripts/lib/build-piece.js, a scripts/door-geo.js leaf whose feet ARE its hinge): interact.js flips state.open on E;
// this swings the leaf about its hinge, eased (scripts/lib/door-swing.js) with a creak open and a latch shut.
import { swingTo } from "./lib/door-swing.js";
const SWING = 100 // her pick: degrees open
export function update(ctx) {
  const s = ctx.self.state;
  if (!swingTo(ctx, (s.yaw0 ?? 0) + (s.open ? SWING : 0), !!s.open, s.mat === "metal" ? "metal" : "wood")) ctx.sleep();
}
