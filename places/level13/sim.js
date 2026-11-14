import { sweepProps } from "../../scripts/lib/breakables.js";
// Level 13 "The Boiling Frogs": the shell lives in the scene file; scripts handle furniture, residents and creatures.
// Lethargy: the longer you stay inside one flat, the heavier you get (player.state.leth13, 0..1).
import { aptAt } from "../../scripts/lib/level13.js";
import { layFurnish } from "../../scripts/lib/level13-furnish.js";
import { layFoes } from "../../scripts/lib/level13-foes.js";
import { layPeople } from "../../scripts/lib/level13-people.js";
import { layDress } from "../../scripts/lib/level13-dress.js";
import { layTape } from "../../scripts/lib/level13-tape.js";
import { restyleSigns } from "../../scripts/lib/sign-style.js";
import { dressThresholds } from "../../scripts/lib/thresholds.js";
export const cadence = "1s";
export const LETH = { startS: 45, fullS: 180, coolS: 20 };
const STAY = new Map();
export function tick(ctx) {
  if (ctx.place.players?.length) sweepProps(ctx); // props become breakable (scripts/lib/breakables.js)
  if (!("l13-floor" in ctx.place.objects)) return;
  restyleSigns(ctx, "level13"); dressThresholds(ctx);
  layFurnish(ctx); layFoes(ctx); layPeople(ctx); layDress(ctx); layTape(ctx);
  // the lethargy: seconds spent inside one flat, written only when its step (a tenth) changes
  for (const p of ctx.place.players) {
    let m = STAY.get(p.id); if (!m) STAY.set(p.id, m = { apt: null, s: 0 }); const a = aptAt(p.feetPosition.x, p.feetPosition.z);
    if (a && a.id === m.apt) m.s += 1; else if (a) { m.apt = a.id; m.s = Math.max(0, m.s - 5); } else { m.apt = null; m.s = Math.max(0, m.s - (LETH.fullS / LETH.coolS)); }
    const v = Math.round(Math.max(0, Math.min(1, (m.s - LETH.startS) / (LETH.fullS - LETH.startS))) * 10) / 10;
    if ((p.state.leth13 ?? 0) !== v) p.state.leth13 = v;
  }
}
