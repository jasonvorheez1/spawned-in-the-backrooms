// Level 169 piece, filled by its build lane. Contract: places/level169/sim.js calls these.
import Q from "./data/l169-quest.yml";
import { setQuest, tellQuest, finishLevelQuest } from "./quests.js";
import { siteOf } from "./l169-road.js";
import { giveKey, hasKey } from "./hubkeys.js";
import { noStory } from "./run-opts.js";
// Two quests (Savi's design, Nov 14, from Shelly's brief: the well, Ferry's house and its people, the checkpoint road north, a keyed Hub door).
// player.state.l169q  "Welcome to the Desert": 1 walk north to the house, 2 meet the residents, 99 done
// player.state.l169r  "The Road North":        1 reach Checkpoint A, 2 reach the edge, 99 done (Hub key for Level 169)
// player.state.l169met: ids talked to; l169pkg: the desert day Ferry's package was last taken
const W = { key: "l169q", id: "welcome-to-the-desert", name: "Welcome to the Desert" };
const R = { key: "l169r", id: "the-road-north", name: "The Road North" };
const near = (f, at, r) => f && at && Math.hypot(f.x - at.x, f.z - at.z) < r;
const mk = (at, label) => (at ? { place: "level169", x: at.x, y: 0, z: at.z, label } : null);
function step(ctx, p, q, n, tip, mark, text) {
  p.state[q.key] = n; setQuest(p.state, q.id, { name: q.name, step: tip, mark });
  if (text) tellQuest(ctx, p, text);
}
const metCount = (s) => (s.l169met ?? []).length;
export function questTick(ctx, L) {
  for (const p of ctx.place.players) {
    const s = p.state, f = p.feetPosition; if (!s || !f) continue;
    const w = s.l169q ?? 0, r = s.l169r ?? 0;
    if (!w) { step(ctx, p, W, 1, "Ferry's house is north, up the track from the well", mk(L.house.door, "Ferry's house"), "New quest: Welcome to the Desert"); continue; }
    if (w === 1 && near(f, L.house.door, Q.reach.site)) { step(ctx, p, W, 2, `Meet the people who live here (0/${Q.meet})`, mk(L.house.center, "Ferry's house"), "A house, out here. The door's not locked."); continue; }
    if (w === 2) { // who you've spoken to: the talk system writes talkWith while you're in a conversation
      const who = s.talkWith; let met = s.l169met ?? [];
      if (who && (/^l169-friend-\d$/.test(who) || who.startsWith("l169-ferry")) && !met.includes(who)) {
        met = [...met, who]; s.l169met = met;
        if (met.length < Q.meet) setQuest(s, W.id, { name: W.name, step: `Meet the people who live here (${met.length}/${Q.meet})`, mark: mk(L.house.center, "Ferry's house") });
      }
      if (metCount(s) >= Q.meet) {
        finishLevelQuest(ctx, p, W.key, { key: W.key, name: W.name, id: W.id }, { xp: 150, cents: 0, items: [], by: "ferry", text: "Quest Completed: Welcome to the Desert" });
        s.l169q = 99;
      }
      continue;
    }
    if (w === 99 && !r) {
      const a = siteOf("a", L);
      step(ctx, p, R, 1, `Walk the checkpoint road north to ${a?.name ?? "Checkpoint A"}. Travel by night`, mk(a, a?.name ?? "Checkpoint A"), "New quest: The Road North");
      continue;
    }
    if (r === 1) { const a = siteOf("a", L);
      if (near(f, a, Q.reach.site)) { const e = siteOf("edge", L);
        step(ctx, p, R, 2, "Follow the checkpoint road to the edge. Use the route boards at night and rest under cover at B½.", mk(e, "The edge"), "Checkpoint A. The logbook is under the shelter if you want to see who came through."); }
      continue;
    }
    if (r === 2 && near(f, siteOf("edge", L), Q.reach.edge)) {
      if (!hasKey(s, "level169")) giveKey(ctx, p, "level169");
      finishLevelQuest(ctx, p, R.key, { key: R.key, name: R.name, id: R.id }, { xp: 300, cents: 0, items: [], by: "ferry", text: "Quest Completed: The Road North. A Hub key for Level 169 is yours" });
      s.l169r = 99;
    }
  }
}
// things you press (scripts/l169-quest-use.js): state.qthing names what it is
export function useThing(ctx, p, thing) {
  const s = p?.state, k = thing?.state?.qthing; if (!s || !k) return;
  if (k === "package") { // Ferry's Supply Package: once per desert day
    const L = ctx.place.state; const per = thing.state.periodMs ?? 20 * 60 * 1000, day = Math.floor(ctx.now() / per);
    if (s.l169pkg === day) return tellQuest(ctx, p, "Already took today's. Ferry's magnets spell: TOMORROW.");
    s.l169pkg = day; s.almonds = (s.almonds ?? 0) + Q.package.bottles; s.hunger = Math.min(100, (s.hunger ?? 50) + 30 * Q.package.tins);
    return tellQuest(ctx, p, `Ferry's package: ${Q.package.bottles} bottles of almond water and a tin.`);
  }
  if (k === "logA") { const end = s.l169exp ?? "none"; return tellQuest(ctx, p, Q.logA?.[end] ?? Q.logA?.none ?? ""); }
}
