// A level with no grade of its own: just the game's 2006 compact camera (scripts/lib/photo2006.js).
import { photoBase, photoFinish } from './lib/photo2006.js';
export function look(ctx) { return photoFinish(ctx, photoBase(ctx)); }
