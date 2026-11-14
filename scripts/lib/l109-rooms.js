// What stands inside a Level 109 auditorium. buildRoom(ctx, R) is called once each time a room loads.
// R = { id, type, info, seed, sp(key, spec) -> id, at(a, b, up) -> world feet, yawIn, yawAlong, abandoned, pop }
//   a = metres along the door wall from the room's centre (-15..15), b = metres in from the door wall (0..30); the door is at a = -8, b = 0.
//   sp() tags what it spawns so the room's unload removes it; pass plain specs (feetPosition from R.at).
import { buildOutpost } from "./l109-outpost.js";
export function buildRoom(ctx, R) { if (["doctors", "or_active", "icu_active", "breach"].includes(R.type) && buildOutpost(ctx, R)) return; }
