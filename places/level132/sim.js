// Level 132 "The Duchy of Morigont": Lumiria. No hostiles, ever. Each part lives in its own module and lays itself once;
// this only calls them. Layout: scripts/lib/data/level132.yml.
import L from "../../scripts/lib/data/level132.yml";
import { sweepProps } from "../../scripts/lib/breakables.js";
import * as square from "../../scripts/lib/l132-square.js";
import * as stalls from "../../scripts/lib/l132-stalls.js";
import * as shops from "../../scripts/lib/l132-shops.js";
import * as land from "../../scripts/lib/l132-land.js";
import * as people from "../../scripts/lib/l132-people.js";
import * as duke from "../../scripts/lib/l132-duke.js";
import * as quests from "../../scripts/lib/l132-quests.js";
const PARTS = [square, stalls, shops, land, people, duke, quests];
export const cadence = "1s";
export function tick(ctx) {
  for (const p of PARTS) p.lay?.(ctx, L);       // each guards itself with its own place.state version stamp
  if (!ctx.place.players.length) return;
  sweepProps(ctx);
  for (const p of PARTS) p.tick?.(ctx, L);
}
