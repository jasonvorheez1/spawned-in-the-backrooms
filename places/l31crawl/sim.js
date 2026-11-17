// The crawl under Level 31: each visit is its own copy, laid whole on its first tick (scripts/lib/l31crawl.js).
import { buildCrawl } from "../../scripts/lib/l31crawl.js";
export const cadence = "500ms";
export function tick(ctx) {
  const s = ctx.place.state;
  if (s.built === 1) return;
  s.built = 1;
  buildCrawl(ctx);
}
