// Level 325 "links" layer: the ways out, and the Level 11 job ("Ground Rent", Vance) that sends wanderers in.
// Canon: a tower basement's stair usually lets out on Level 2 (rarely Level 71, not built: it stays Level 2).
// The basement pit is terrain (scripts/terrain325.js sinks a basement tower's core to -3.35); reaching its floor crosses.
import { cellOf, cellInfo } from "./level325.js";
import { carryAcross } from "./carry.js";
import { BOOM } from "./boom-quest.js";
import { advanceQuest } from "./quests.js";
export const V = 1;
export function lay(ctx) {}
export function tick(ctx) {
  for (const p of ctx.place.players) {
    const s = p.state; if (!s) continue;
    const f = p.feetPosition, c = cellOf(f.x, f.z);
    // Ground Rent: strip heaps, take glass (base is what they had salvaged before the job)
    const q = s[BOOM.key] ?? 0, l = s.l325 ?? {};
    if (q === 2 && (l.salvaged ?? 0) - (s.boomBase ?? 0) >= 2 && (s.scrap?.channel_glass ?? 0) > 0) advanceQuest(ctx, p, BOOM, 3);
    if (q >= 2 && q < 3 && (l.salvaged ?? 0) - (s.boomBase ?? 0) >= 2 && !(s.scrap?.channel_glass > 0) && !s.boomGlassTip) { s.boomGlassTip = 1; s.notice = { text: "Vance wants the blue glass. It's only where a tower's top lands.", at: ctx.now() }; }
    if (f.y > -2.6 || !cellInfo(c.ix, c.iz).basement) continue;
    s.notice = { text: "The stair keeps going past where the basement should end. The air turns warm and wet.", at: ctx.now() };
    if (q === 3) advanceQuest(ctx, p, BOOM, 4);
    ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-steam-pipe-hiss-hum.mp3", position: f, volume: 0.7, maxDistance: 14 });
    ctx.emit("screenFlash", { color: "#2a2016", duration: 0.6, intensity: 0.9 }, { audience: { player: p.id } });
    carryAcross(ctx, p, "level2"); ctx.cross(p, "level2");
  }
}
