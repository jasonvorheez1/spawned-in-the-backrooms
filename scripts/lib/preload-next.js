// Shelly Nov 12 "add preloading": when you come within reach of a door to another level, that level's most-used models
// start downloading in the background (the engine's preload act), so the crossing shows them sooner. No screen, no wait.
import P from "./data/preload.yml";
const REACH = 30, SCAN_MS = 2000; // her picks: metres from a door, how often the player's machine looks

export function preloadTick(ctx) {
  const ses = ctx.self.session, now = ctx.now();
  if (now - (ses.preAt ?? 0) < SCAN_MS) return;
  ses.preAt = now;
  const done = (ses.preDone ??= {}), f = ctx.self.feetPosition; if (!f) return;
  for (const [door, place] of Object.entries(P.doors ?? {})) {
    if (done[place] || place === ctx.self.place) continue;
    const o = ctx.place.objects[door]; if (!o) continue;
    const p = o.worldFeetPosition ?? o.feetPosition;
    if (Math.hypot(p.x - f.x, p.z - f.z) > REACH) continue;
    const refs = P.models?.[place]; if (!refs?.length) { done[place] = true; continue; }
    done[place] = true;
    ctx.emit("preload", { refs }, { audience: { player: ctx.self.id } });
  }
}
