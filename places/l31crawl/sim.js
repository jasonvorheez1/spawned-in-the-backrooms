// The crawl under Level 31: each visit is its own copy, laid whole on its first tick (scripts/lib/l31crawl.js).
import { buildCrawl } from "../../scripts/lib/l31crawl.js";
export const cadence = "500ms";
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.built !== 1) { s.built = 1; buildCrawl(ctx); }
  for (const p of ctx.place.players) { // arrived before the floor was laid: back onto the landing under the hatch
    if (p.feetPosition.y < -1) { p.velocity = { x: 0, y: 0, z: 0 }; p.feetPosition = { x: 0, y: 0.1, z: 1.5 }; }
  }
}
