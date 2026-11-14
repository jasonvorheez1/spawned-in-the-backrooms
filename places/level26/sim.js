// Level 26's referee: the ship is laid in its cell files; this only dresses its two ways off (scripts/lib/thresholds.js).
import { shipTick } from "../../scripts/lib/ssfun-voyage.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
export const cadence = "1s";
export function tick(ctx) {
  dressThresholds(ctx);
  shipTick(ctx, null, "level26");
  if (!ctx.place.state.purserChest) {
    ctx.place.state.purserChest = true;
    ctx.spawn("l26-purser-chest", {
      tags: ["container", "breakable"],
      feetPosition: { x: 0, y: 1, z: -2 },
      rotation: { yaw: 0 },
      primitive: { kind: "box", width: 0.65, height: 0.42, depth: 0.42 },
      material: { color: "oklch(0.34 0.06 55)", roughness: 0.55, metalness: 0.3 },
      physics: { body: "static", collider: "box" },
      visibleRange: { max: 40 },
      state: { name: "Purser's Brass-Bound Strongbox", mat: "wood", hp: 75, maxHp: 75, lock: "lockpick:50", items: "ubook:l26_cabin_lockpick,bobbypin,bobbypin,cash:50" },
    });
  }
}
