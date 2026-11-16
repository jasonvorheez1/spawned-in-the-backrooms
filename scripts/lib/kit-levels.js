// Dresses the usables these level sims spawn (rows in data/kit-levels.json, keyed place → id, "glob*" or "#tag"):
// adds scripts/usable-kit.js beside the thing's own press script (motion, sound, light, a small once-per-cd gift),
// seats its moving part. Patches live rows, so no lay() has to rerun. A look every 5 s, a dozen rows a pass.
import ROWS from "./data/kit-levels.json";
import { match, seatPart } from "./usable-kit.js";
const LAST = {};
export function dressLevel(ctx, place) {
  const rows = ROWS[place]; if (!rows || !ctx.place.players?.length) return 0;
  const now = ctx.now(); if (now - (LAST[place] ?? -1e9) < 5000) return 0; LAST[place] = now;
  const V = "L" + ROWS.v; let n = 0;
  for (const r of ctx.query({ tags: ["usable"] })) {
    const row = match(rows, r.id, r.tags); if (!row) continue;
    if (r.state?.kitV === V && (!row.p || ctx.getObject(`${r.id}/kit-${row.p}`))) continue;
    const o = ctx.getObject(r.id); if (!o) continue;
    const beh = Array.isArray(o.behavior) ? o.behavior : o.behavior ? [o.behavior] : [];
    if (!beh.includes("scripts/usable-kit.js")) o.behavior = [...beh, "scripts/usable-kit.js"];
    const { i, ...kit } = row; o.state.kit = kit; if (i) o.state.info = i;
    for (const k of ["lever", "dial", "button", "flap", "screen", "lamp"]) if (k !== row.p && ctx.getObject(`${r.id}/kit-${k}`)) ctx.destroy(`${r.id}/kit-${k}`);
    if (row.p && o.bounds) seatPart(ctx, o, row);
    o.state.kitV = V; n++;
    if (n >= 12) break;
  }
  return n;
}
