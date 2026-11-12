// Level 26's referee: the ship is laid in its cell files; this only dresses its two ways off (scripts/lib/thresholds.js).
import { dressThresholds } from "../../scripts/lib/thresholds.js";
export const cadence = "1s";
export function tick(ctx) { dressThresholds(ctx); }
