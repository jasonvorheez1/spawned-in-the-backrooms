// A salvage heap on fresh Boom Town rubble (scripts/lib/level325-quest.js lays it). E pulls what the collapse left:
// scaffold bamboo and cable everywhere, rebar and concrete, and blue Channel glass only where the tower's top came down.
// Each wanderer takes once per heap; the heap sinks with its rubble (Savi's picks: 2 bamboo, 1 cable, 1 rebar, 1 glass at the crown).
import { finishLevelQuest } from "./lib/quests.js";
import { Q325, step325 } from "./lib/level325-quest.js";
const SFX = (n) => "/cdn/moodboard-realistic-gritty/sfx-" + n + ".mp3";
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), w = who?.state;
    if (!w) return;
    const taken = s.taken ?? [];
    if (taken.includes(by)) { w.notice = { text: "You've already stripped this heap.", at: ctx.now() }; return; }
    s.taken = [...taken, by];
    const got = { ...(s.yield ?? { bamboo_pole: 2, steel_cable: 1 }) };
    const sc = { ...(w.scrap ?? {}) }, names = [];
    const N = { bamboo_pole: "Scaffold bamboo", steel_cable: "Steel cable", rebar_rod: "Rebar rod", rubble: "Concrete rubble", channel_glass: "Channel glass" };
    for (const [k, n] of Object.entries(got)) { sc[k] = (sc[k] ?? 0) + n; names.push(`${N[k] ?? k} x${n}`); }
    w.scrap = sc; w.pickedAt = ctx.now();
    const l = { ...(w.l325 ?? {}) }; l.salvaged = (l.salvaged ?? 0) + 1; if (got.channel_glass) l.glass = true; w.l325 = l;
    w.notice = { text: names.join(" · "), at: ctx.now() };
    ctx.emit("playSound", { clip: SFX(got.channel_glass ? "glass-shard-pickup-tinkle" : "bamboo-and-rebar-pulled-from-rubble"), position: ctx.self.feetPosition, volume: 0.7, maxDistance: 18 });
    ctx.emit("squash", { target: ctx.self.id, axis: "y", intensity: 0.12, duration: 0.25 });
    step325(ctx, who);
  },
};
