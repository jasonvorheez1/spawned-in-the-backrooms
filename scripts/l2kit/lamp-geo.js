// Level 2 kit module "lamp": one instance set over the whole level (scripts/lib/l2kit.js). Visual only; level2-geo.js is the collider.
import D from "../lib/l2kit-data/lamp.js";
import { kit } from "../lib/l2kit.js";
export const geometry = (ctx) => kit(ctx, "lamp", D);
export const collider = () => null;
