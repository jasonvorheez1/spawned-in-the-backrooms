// Level 10 "Bumper Crop" - Quests & Agrarian Gameplay Systems
// Canonical Wikidot lore quests:
// 1. "The Golden Bumper" (Homesteader Cooper / Wheat Reaping / Windmill Quern / Farmhouse Hearth Oven)
// 2. "The Still Watcher" (Dr. Maeve / Entity 17 Anomalous Scarecrow / Field Document 24)
// 3. "Cellar in the Shadows" (Storm Cellar / Emergency Agricultural Cache / Subterranean Hatch)

import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";

export const QUESTS10 = {
  wheat: {
    key: "wheatQ",
    name: "The Golden Bumper",
    tips: {
      1: "Speak to Homesteader Cooper at M.E.G. Outpost Bountiful",
      2: "Reap 3 Golden Wheat Sheaves from the wheat fields",
      3: "Grind the wheat into flour at the Windmill Quern",
      4: "Bake a warm homestead loaf at the outpost hearth oven",
      5: "Deliver the fresh loaf to Homesteader Cooper at Outpost Bountiful",
    },
  },
  watcher: {
    key: "watcherQ",
    name: "The Still Watcher",
    tips: {
      1: "Speak to Dr. Maeve at M.E.G. Outpost Bountiful regarding the scarecrows",
      2: "Locate the Eastern Scarecrow among the tall barley and inspect its coat",
      3: "Deliver the recovered survivor notebook (Document 24) to Dr. Maeve",
    },
  },
  cellar: {
    key: "cellarQ",
    name: "Cellar in the Shadows",
    tips: {
      1: "Investigate strange scratching noises from the abandoned Storm Cellar",
      2: "Unlatch the cellar doors and salvage the emergency agricultural toolkit",
    },
  },
};

function syncHUD(p, qKey, step) {
  const q = QUESTS10[qKey];
  if (!q) return;
  const tip = q.tips[step];
  if (tip) {
    p.state.quest = { name: q.name, step: tip, at: Date.now() };
  } else if (p.state.quest?.name === q.name) {
    p.state.quest = null;
  }
}

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

export function finishQuest(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS10[qKey];
  if (!q) return;

  // Mark completed (step 99)
  s[q.key] = 99;
  if (s.quest?.name === q.name) s.quest = null;

  // Rewards
  s.cents = (s.cents ?? 0) + cents;
  s.payout = { xp, items, text };
  const now = ctx.now();
  const summary = text || `Quest Completed: ${q.name}! +${xp} XP · +$${(cents / 100).toFixed(2)}`;
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
        setWheatStep(ctx, p, 1, "Quest Started: The Golden Bumper · Talk to Cooper & Reap 3 Golden Wheat Sheaves");
        return {
          reply: "That's the spirit, wanderer! The Backrooms won't feed itself. Grab at least 3 golden wheat sheaves from the fields, take them to the Windmill Quern to grind into flour, and bake a warm loaf at the hearth oven. Bring it back to me for our caravan to Level 11!",
          mood: "happy",
        };
      }
    }
    // 1b. Turn-in "The Golden Bumper"
    if (t.includes("baked a fresh") || t.includes("homestead loaf") || t.includes("fresh loaf")) {
      if (s.wheatQ === 5 && (s.bread ?? 0) >= 1) {
        s.bread -= 1;
        finishQuest(ctx, p, "wheat", {
          xp: 150,
          cents: 7500,
          items: ["royal_ration", "cloth:hat:beret:d4b060"],
          text: "Quest Completed: The Golden Bumper · +150 XP, +$75.00, Royal Ration, Farmstead Straw Hat",
        });
        return {
          reply: "Mmm-mmm! Smell that golden crust! That's the finest loaf this side of Level 11. Here's your cut from M.E.G. agrarian requisitions: seventy-five Backdollars, a Royal Ration, and my spare woven straw hat. You're always welcome at Outpost Bountiful!",
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
        setWatcherStep(ctx, p, 1, "Quest Started: The Still Watcher · Locate the Eastern Scarecrow in the barley field");
        return {
          reply: "Fascinating timing. I've been monitoring the scarecrow stationed in the eastern barley field. Local compass readings show anomalous micro-gravitational pulses whenever it turns. Head out into the eastern barley, inspect its coat, and see if there are any field notes or physical anomalies left behind.",
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
          text: "Quest Completed: The Still Watcher · +120 XP, +$50.00, 2x Almond Water, First Aid Kit",
        });
        return {
          reply: "Astounding! These notes confirm my hypothesis, Entity 17 acts as passive spatial stabilizers across the wheat plains. Excellent fieldwork, wanderer. Here is your research stipend and emergency medical supplies from M.E.G. Research Wing.",
          mood: "happy",
        };
      }
    }
  }

  return null;
}
