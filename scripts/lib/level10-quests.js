// Level 10 "Bumper Crop", M.E.G. Outpost Bountiful. Three jobs (rewritten Nov 13 to the New Vegas standard: a reason, a way
// round the fight, a journal that says where, lines for after, a reward paid once):
// 1. "The Golden Bumper" (Cooper): Base Beta won't put copied grain on a caravan until someone bakes a loaf from it and eats it.
//    wheatQ 1 ask · 2 cut three sheaves · 3 mill at the windmill · 4 bake at the hearth · 5 bring the loaf · 99 done.
//    Survival 30 with Cooper: she hands you three sheaves she cut before the rows moved (skips the reaping, once).
// 2. "The Still Watcher" (Dr. Maeve): the east scarecrow turns, and her compass swings toward it. An earlier M.E.G. surveyor
//    left a field log (Document 24) in its coat. watcherQ 1 ask · 2 search the coat · 3 bring the log · 99 done.
//    The coat: crouch, or pass Sneak 30, and it does not turn on you; else it costs sanity (scripts/level10-use.js).
//    Science 40 at the turn-in: read the log right (the scarecrows pin the field) and Maeve gives you her old compass too.
// 3. "Cellar in the Shadows" (Cooper): the storm cellar rattles. It is a worm, boring in from the lake under the pantry.
//    cellarQ 1 look · 2 tell Cooper · 99 done. Survival 30 in the cellar shores the shelving over the burrow (cellarSealed).
// Rewards are paid at 99 only, and every turn-in line is offered only on the step before it, so nothing pays twice.
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { questStep, tellQuest } from "./quests.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";
import { rollCheck } from "./npc-talk.js";

const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level10", id });

export const QUESTS10 = {
  wheat: {
    key: "wheatQ",
    name: "The Golden Bumper",
    tips: {
      1: "Ask Cooper on the farmhouse porch at Outpost Bountiful about the harvest.",
      2: "Cut three sheaves of golden wheat in the fields around the farmhouse. Cooper may know which rows are ripe.",
      3: "Grind the sheaves into flour at the stone quern inside the windmill.",
      4: "Bake the flour into a loaf in the brick hearth oven in the farmhouse.",
      5: "Bring the loaf to Cooper on the farmhouse porch, for the Base Beta caravan.",
    },
    marks: { 1: MARK("l10-meg-cooper"), 2: MARK("l10-wheat-patch-1"), 3: MARK("l10-windmill-quern"), 4: MARK("l10-hearth-oven"), 5: MARK("l10-meg-cooper") },
  },
  watcher: {
    key: "watcherQ",
    name: "The Still Watcher",
    tips: {
      1: "Ask Dr. Maeve at Outpost Bountiful about the scarecrow.",
      2: "Search the coat of the scarecrow in the east barley field. Crouch while you reach in, or it turns while you look away.",
      3: "Bring the surveyor's log (Document 24) from the scarecrow's coat to Dr. Maeve at the outpost.",
    },
    marks: { 1: MARK("l10-meg-maeve"), 2: MARK("l10-scarecrow-east"), 3: MARK("l10-meg-maeve") },
  },
  cellar: {
    key: "cellarQ",
    name: "Cellar in the Shadows",
    tips: {
      1: "Open the storm cellar behind the farmhouse and find what is rattling in the pantry. Don't fight it.",
      2: "Tell Cooper on the farmhouse porch what is under her storm cellar.",
    },
    marks: { 1: MARK("l10-storm-cellar"), 2: MARK("l10-meg-cooper") },
  },
};

function setStep(ctx, p, qKey, step, noteText) {
  const s = p?.state, q = QUESTS10[qKey];
  if (!s || !q || (s[q.key] ?? 0) >= step) return;
  s[q.key] = step;
  questStep(s, q, step);
  if (noteText) tellQuest(ctx, p, noteText); else tellQuest(ctx, p, `${q.name} · ${q.tips[step] ?? ""}`);
}
export const setWheatStep = (ctx, p, step, noteText) => setStep(ctx, p, "wheat", step, noteText);
export const setWatcherStep = (ctx, p, step, noteText) => setStep(ctx, p, "watcher", step, noteText);
export const setCellarStep = (ctx, p, step, noteText) => setStep(ctx, p, "cellar", step, noteText);

const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export function finishQuest(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "meg" } = {}) {
  const s = p?.state, q = QUESTS10[qKey];
  if (!s || !q || s[q.key] === 99) return false; // paid once
  const b = BONUS(s, by), msgs = [];
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  s[q.key] = 99;
  questStep(s, q, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d);
    msgs.push(tier || `${g === "karma" ? "Karma" : GROUPS[g]?.name ?? g} ${d > 0 ? "+" : ""}${d}`);
  }
  s.cents = (s.cents ?? 0) + cents;
  const summary = [text || `Quest Completed: ${q.name} · +${xp} XP · +$${(cents / 100).toFixed(2)}`, ...msgs].filter(Boolean).join(" · ");
  s.payout = { xp, items, text: summary };
  const now = ctx.now();
  s.notice = { text: summary, at: now };
  pushFeed(s, summary, now, "good");
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: `QUEST COMPLETED: ${q.name.toUpperCase()}`, color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
  return true;
}

// what the talk card offers (scripts/lib/npc-starters.js questChoices); each line is answered by handleDialogueQuest10 below
export function l10Choices(id, s) {
  const out = [], meg = repOf(s, "meg") > -35;
  if (id === "l10-meg-cooper") {
    const w = s?.wheatQ ?? 0, c = s?.cellarQ ?? 0;
    if (!w && meg) out.push({ text: "Need another pair of hands for the harvest?", tag: "Quest Start" });
    if (w === 2 && !s?.cooperSheaves) out.push({ text: "The rows moved again. Which ones are ripe?", tag: "Survival 30" });
    if (w >= 1 && w < 99 && (s?.bread ?? 0) >= 1) out.push({ text: "Here. A fresh loaf, straight out of the hearth.", tag: "Quest Turn-In" });
    if (w === 99) out.push({ text: "Did the caravan take the loaf?", tag: "Talk" });
    if (!c && meg) out.push({ text: "Something's rattling in the storm cellar. Want me to look?", tag: "Quest Start" });
    if (c === 2) out.push({ text: s?.cellarSealed ? "A worm's boring in under your pantry. I shored the shelving over the hole." : "A worm's boring in under your pantry. The hole's still open.", tag: "Quest Turn-In" });
    if (c === 99) out.push({ text: "Is the cellar holding?", tag: "Talk" });
  } else if (id === "l10-meg-maeve") {
    const q = s?.watcherQ ?? 0;
    if (!q && meg) out.push({ text: "I'll go look at that scarecrow for you.", tag: "Quest Start" });
    if (q === 3) {
      out.push({ text: "Found document 24 sewn into its coat.", tag: "Quest Turn-In" });
      if (!s?.maeveSciFailed) out.push({ text: "Read the diagram again. The scarecrows aren't watching the field. They're pinning it down.", tag: "Science 40" });
    }
    if (q === 99) out.push({ text: "Any more trouble from the scarecrow?", tag: "Talk" });
  }
  return out;
}

// Dialogue quest triggers & turn-ins for Level 10 (scripts/talk.js, after Accept on a Quest Start)
export function handleDialogueQuest10(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  if (npcId === "l10-meg-cooper") {
    // The Golden Bumper
    if (t.includes("another pair of hands for the harvest") && !s.wheatQ) {
      if (repOf(s, "meg") <= -35) return { reply: "Bountiful doesn't hire enemies of M.E.G. Off my porch.", mood: "angry" };
      const next = (s.bread ?? 0) >= 1 ? 5 : (s.flour ?? 0) >= 1 ? 4 : (s.wheat ?? 0) >= 3 ? 3 : 2;
      setWheatStep(ctx, p, next, "Quest Started: The Golden Bumper · Cut three sheaves of golden wheat");
      return { reply: "Bless you. Three sheaves, through the quern in the windmill, into the hearth. Bring me the loaf and I'll eat the first slice in front of the caravan boss myself. If I don't fall over, Beta buys the crop.", mood: "happy" };
    }
    if (t.includes("which ones are ripe") && s.wheatQ === 2 && !s.cooperSheaves) {
      const c = rollCheck(ctx, s, { skill: "survival", difficulty: 30 });
      s.cooperSheaves = c.ok ? 1 : -1;
      if (c.ok) {
        s.wheat = Math.max(3, (s.wheat ?? 0) + 3);
        setWheatStep(ctx, p, 3, "The Golden Bumper · Cooper gave you three sheaves · Grind them at the windmill quern");
        return { reply: "You noticed that? Most folk think I'm going senile. The rows creep east a foot a night, so the ripe ones are always the ones nearest the lake. Here, I cut three before breakfast. Go on to the mill.", mood: "happy" };
      }
      return { reply: "Ripe ones are the gold ones, hon. They're all gold. That's the trouble. You'll have to cut them yourself.", mood: "calm" };
    }
    if (t.includes("fresh loaf") && s.wheatQ >= 1 && s.wheatQ < 99) {
      if ((s.bread ?? 0) < 1) return { reply: "That's a fine story, hon. Where's the bread?", mood: "calm" };
      s.bread -= 1;
      finishQuest(ctx, p, "wheat", {
        xp: 150, cents: 7500, items: ["royal_ration", "cloth:hat:beret:d4b060"],
        rep: [["meg", 10], ["survivors", 4], ["karma", 2]],
        text: "Quest Completed: The Golden Bumper · +150 XP, +$75.00, Royal Ration, Cooper's Sunday beret",
      });
      return { reply: "Good crust. Smells right, too. That's the test, isn't it, whether it smells like bread from home. I'll wrap it for the caravan. Seventy-five, a Royal Ration, and my Sunday beret. I haven't had a Sunday in years.", mood: "happy" };
    }
    if (t.includes("did the caravan take the loaf") && s.wheatQ === 99) {
      return { reply: "They did. The boss ate a slice in front of me, chewed it like it owed him money, and signed for the whole crop. Base Beta eats Bountiful wheat this month. You did that, hon.", mood: "happy" };
    }
    // Cellar in the Shadows
    if (t.includes("rattling in the storm cellar") && !s.cellarQ) {
      if (repOf(s, "meg") <= -35) return { reply: "Stay out of our cellars.", mood: "angry" };
      setCellarStep(ctx, p, 1, "Quest Started: Cellar in the Shadows · Open the storm cellar behind the farmhouse");
      return { reply: "Since the fog came in. A rattle like somebody shaking the jars. Unlatch the hatch, look in the pantry, come tell me. If it's alive, you leave it be. I've seen what the worms do to folk who poke them.", mood: "calm" };
    }
    if (t.includes("worm's boring in under your pantry") && s.cellarQ === 2) {
      const sealed = !!s.cellarSealed;
      finishQuest(ctx, p, "cellar", sealed
        ? { xp: 95, cents: 3500, items: ["kit", "almond"], rep: [["meg", 6], ["survivors", 4]], text: "Quest Completed: Cellar in the Shadows · Burrow shored · +95 XP, +$35.00, Repair Kit, Almond Water" }
        : { xp: 70, cents: 2000, items: ["almond"], rep: [["meg", 4], ["survivors", 2]], text: "Quest Completed: Cellar in the Shadows · Burrow reported · +70 XP, +$20.00, Almond Water" });
      return sealed
        ? { reply: "A worm. Under my peaches. And you didn't shoot it, you just shut the door on it. That's sense. Thirty-five, a repair kit and a bottle. I'll have Hale pour concrete over that hole in the morning.", mood: "happy" }
        : { reply: "A worm. Under my peaches. Well, you came back with all your fingers, and that's what I asked for. Twenty and a bottle. Hale and I will brick it up before it finds the root vegetables.", mood: "calm" };
    }
    if (t.includes("is the cellar holding") && s.cellarQ === 99) {
      return s.cellarSealed
        ? { reply: "Not a peep since. Hale poured the concrete over your shoring. Some nights I hear it turn over down there, looking for the way it came in. It won't find it.", mood: "happy" }
        : { reply: "Bricked it up the next morning. It took a jar of peaches with it. I'll forgive the worm. I won't forgive the fog.", mood: "calm" };
    }
  }

  if (npcId === "l10-meg-maeve") {
    if (t.includes("look at that scarecrow") && !s.watcherQ) {
      if (repOf(s, "meg") <= -35) return { reply: "I don't share field work with hostiles.", mood: "angry" };
      const has24 = String(s.pages ?? "").split(",").includes("24");
      setWatcherStep(ctx, p, has24 ? 3 : 2, "Quest Started: The Still Watcher · Search the scarecrow in the east barley field");
      return { reply: "Thank you. A surveyor named Pell walked the east field before me and stuffed her log in its coat the night she stopped reporting. I want the log. Keep low and keep your eyes on its head when you reach in. It turns when you look away, and people who stand over it come back with headaches and gaps in their afternoon. Pell might know why.", mood: "calm" };
    }
    if (s.watcherQ === 3 && (t.includes("found document 24") || t.includes("pinning it down"))) {
      let read = false, bonus = "";
      if (t.includes("pinning it down")) {
        const c = rollCheck(ctx, s, { skill: "science", difficulty: 40 });
        if (!c.ok) { s.maeveSciFailed = 1; return { reply: "Pinning. With what? Straw? I need a mechanism, not a metaphor. Give me the log and let me read it myself.", mood: "annoyed" }; }
        read = true; bonus = ", Maeve's old compass";
      }
      finishQuest(ctx, p, "watcher", {
        xp: read ? 160 : 120, cents: 5000, items: read ? ["almond", "almond", "firstaid", "compass"] : ["almond", "almond", "firstaid"],
        rep: [["meg", read ? 14 : 10], ["karma", 2]],
        text: `Quest Completed: The Still Watcher · +${read ? 160 : 120} XP, +$50.00, 2x Almond Water, First Aid Kit${bonus}`,
      });
      return read
        ? { reply: "Pinning. Yes. Each one stands on a survey point, and the rows shift around them, never through them. The field moves. The scarecrows don't. You've saved me a month. Take the stipend, the kit, and my compass. It's no use to me now. It only ever points at them.", mood: "happy" }
        : { reply: "Pell's log. Her diagram puts a scarecrow on every survey stake. I'll need a week with this. Here's your stipend and a med kit. Stay out of the east field after dark.", mood: "happy" };
    }
    if (t.includes("more trouble from the scarecrow") && s.watcherQ === 99) {
      return { reply: "It turned again last night. Toward the outpost this time. I've moved my desk. Not out of fear. Out of method.", mood: "calm" };
    }
  }
  return null;
}
