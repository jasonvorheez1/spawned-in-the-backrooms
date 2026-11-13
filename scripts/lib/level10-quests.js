// Level 10 "Bumper Crop" - Quests & Agrarian Gameplay Systems
// Canonical Wikidot lore quests:
// 1. "The Golden Bumper" (Homesteader Cooper / Wheat Reaping / Windmill Quern / Farmhouse Hearth Oven)
// 2. "The Still Watcher" (Dr. Maeve / Entity 17 Anomalous Scarecrow / Field Document 24)
// 3. "Cellar in the Shadows" (Storm Cellar / Emergency Agricultural Cache / Subterranean Hatch)

import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, endQuest, qid, questStep } from "./quests.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level10", id });

export const QUESTS10 = {
  wheat: {
    key: "wheatQ",
    name: "The Golden Bumper",
    tips: {
      1: "Ask Cooper about the harvest at Outpost Bountiful.",
      2: "Cut three sheaves of golden wheat.",
      3: "Grind the wheat at the windmill.",
      4: "Bake a loaf in the outpost hearth.",
      5: "Bring the loaf to Cooper for the city caravan.",
    },
    marks: {
      1: MARK("l10-meg-cooper"),
      2: MARK("l10-wheat-patch-1"),
      3: MARK("l10-windmill-quern"),
      4: MARK("l10-hearth-oven"),
      5: MARK("l10-meg-cooper"),
    },
  },
  watcher: {
    key: "watcherQ",
    name: "The Still Watcher",
    tips: {
      1: "Ask Dr. Maeve about the scarecrow at Outpost Bountiful.",
      2: "Search the scarecrow's coat in the east barley field.",
      3: "Bring the notebook from the coat to Dr. Maeve.",
    },
    marks: {
      1: MARK("l10-meg-maeve"),
      2: MARK("l10-scarecrow-east"),
      3: MARK("l10-meg-maeve"),
    },
  },
  cellar: {
    key: "cellarQ",
    name: "Cellar in the Shadows",
    tips: {
      1: "Check the storm cellar behind the farmhouse.",
      2: "Tell Cooper what you found in the cellar.",
    },
    marks: {
      1: MARK("l10-storm-cellar"),
      2: MARK("l10-meg-cooper"),
    },
  },
};

const syncHUD = (p, qKey, step, doneSummary) => questStep(p?.state, QUESTS10[qKey], step, doneSummary); // scripts/lib/quests.js, shared

export function setWheatStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.wheatQ ?? 0) >= step) return;
  s.wheatQ = step;
  syncHUD(p, "wheat", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setWatcherStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.watcherQ ?? 0) >= step) return;
  s.watcherQ = step;
  syncHUD(p, "watcher", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setCellarStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.cellarQ ?? 0) >= step) return;
  s.cellarQ = step;
  syncHUD(p, "cellar", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export function finishQuest(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "meg" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS10[qKey];
  if (!q) return;

  const b = BONUS(s, by), msgs = [];
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  s[q.key] = 99;
  syncHUD(p, qKey, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d);
    msgs.push(tier || `${g === "karma" ? "Karma" : GROUPS[g]?.name ?? g} ${d > 0 ? "+" : ""}${d}`);
  }

  // Rewards
  s.cents = (s.cents ?? 0) + cents;
  const summary = [text || `Quest Completed: ${q.name}! +${xp} XP · +$${(cents / 100).toFixed(2)}`, ...msgs].filter(Boolean).join(" · ");
  s.payout = { xp, items, text: summary };
  const now = ctx.now();
  s.notice = { text: summary, at: now };
  pushFeed(s, summary, now, "good");

  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", {
      position: { x: pos.x, y: pos.y + 1.8, z: pos.z },
      text: `QUEST COMPLETED: ${q.name.toUpperCase()}`,
      color: "#f1c40f",
      size: 1.2,
    }, { audience: { player: p.id } });
  }
}

// Dialogue quest triggers & turn-ins for Level 10
export function handleDialogueQuest10(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  // 1. Homesteader Cooper
  if (npcId === "l10-meg-cooper") {
    // 1a. Start "The Golden Bumper"
    if (t.includes("harvest") || t.includes("golden bumper") || t.includes("help outpost bountiful")) {
      if (!s.wheatQ) {
        if (repOf(s, "meg") <= -35) return { reply: "Bountiful doesn't hire enemies of M.E.G. Off my porch.", mood: "angry" };
        const nextStep = (s.bread ?? 0) >= 1 ? 5 : (s.flour ?? 0) >= 1 ? 4 : (s.wheat ?? 0) >= 3 ? 3 : 2;
        setWheatStep(ctx, p, nextStep, "Quest Started: The Golden Bumper · Reap 3 Golden Wheat Sheaves");
        return {
          reply: "Ha! Good. Three sheaves of the gold wheat, through the quern at the windmill, then into the hearth oven. Bring me the loaf. It's going to the city with the caravan.",
          mood: "happy",
        };
      }
    }
    // 1b. Turn-in "The Golden Bumper"
    if (t.includes("baked a fresh") || t.includes("homestead loaf") || t.includes("fresh loaf")) {
      if ((s.wheatQ >= 1 && s.wheatQ < 99) && (s.bread ?? 0) >= 1) {
        s.bread -= 1;
        finishQuest(ctx, p, "wheat", {
          xp: 150,
          cents: 7500,
          items: ["royal_ration", "cloth:hat:beret:d4b060"],
          rep: [["meg", 10], ["survivors", 4], ["karma", 2]],
          text: "Quest Completed: The Golden Bumper · +150 XP, +$75.00, Royal Ration, Farmstead Straw Hat",
        });
        return {
          reply: "You got a good crust on it. I'll wrap it for the caravan. Here's seventy-five, a Royal Ration, and my spare straw hat. Keep the hat dry.",
          mood: "happy",
        };
      }
    }
    // 1c. Start or Turn-in "Cellar in the Shadows"
    if (t.includes("storm cellar") || t.includes("cellar in the shadows") || t.includes("subterranean pantry")) {
      if (!s.cellarQ) {
        if (repOf(s, "meg") <= -35) return { reply: "Stay out of our cellars.", mood: "angry" };
        setCellarStep(ctx, p, 1, "Quest Started: Cellar in the Shadows · Inspect the Storm Cellar near the farmhouse");
        return {
          reply: "Storm cellar behind the farmhouse has been rattling since the fog came in. Unlatch it, look in the pantry, tell me what's down there. If it's something, just tell me. Don't fight it.",
          mood: "calm",
        };
      }
      if (s.cellarQ === 2) {
        finishQuest(ctx, p, "cellar", {
          xp: 95,
          cents: 3500,
          items: ["kit", "almond"],
          rep: [["meg", 6], ["survivors", 4]],
          text: "Quest Completed: Cellar in the Shadows · +95 XP, +$35.00, Repair Kit, Almond Water",
        });
        return {
          reply: "The jars are still sealed? Good. I'll wedge the door shut. Here's thirty-five and the repair kit. I haven't been down there since the last flood.",
          mood: "happy",
        };
      }
    }
  }

  // 2. Dr. Maeve
  if (npcId === "l10-meg-maeve") {
    // 2a. Start "The Still Watcher"
    if (t.includes("scarecrow") || t.includes("still watcher") || t.includes("investigate the eastern")) {
      if (!s.watcherQ) {
        if (repOf(s, "meg") <= -35) return { reply: "I don't share field work with hostiles.", mood: "angry" };
        const has24 = String(s.pages ?? "").split(",").includes("24");
        setWatcherStep(ctx, p, has24 ? 3 : 2, "Quest Started: The Still Watcher · Locate the Eastern Scarecrow in the barley field");
        return {
          reply: "Good timing. The scarecrow in the east barley turns, and when it turns my compass jumps. Go look at it. The coat, the pockets, anything. Don't watch it while you do. Seriously.",
          mood: "calm",
        };
      }
    }
    // 2b. Turn-in "The Still Watcher"
    if (t.includes("found document 24") || t.includes("still watcher") || t.includes("scarecrow's coat")) {
      if (s.watcherQ === 3) {
        finishQuest(ctx, p, "watcher", {
          xp: 120,
          cents: 5000,
          items: ["almond", "almond", "firstaid"],
          rep: [["meg", 10], ["karma", 2]],
          text: "Quest Completed: The Still Watcher · +120 XP, +$50.00, 2x Almond Water, First Aid Kit",
        });
        return {
          reply: "Document twenty-four. Look at this diagram. The scarecrows mark the points where the field is pinned. Here, your stipend and the med kit. Leave the east field alone tonight.",
          mood: "happy",
        };
      }
    }
  }

  return null;
}
