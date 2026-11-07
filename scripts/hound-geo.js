// Retired: the hound is a rigged Blender mesh now (art/hound/build.py). scripts/hounds.js swaps any row that
// still names this script onto the model on its first tick; until then this is a speck no one sees.
import { sphere } from "./lib/shapes.js";
export function geometry(ctx) { ctx.color("oklch(0.5 0.02 40)"); sphere(ctx, [0, 0.4, 0], 0.002, 3); }
