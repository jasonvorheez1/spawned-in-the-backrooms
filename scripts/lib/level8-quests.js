// Level 8 "The 9th Road" - Quests & Survival Camp Operations
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";

export const QUESTS8 = {
  carla: {
    key: "carlaQ",
    name: "Carla's Melody",
    tips: {
      1: "Speak to Carla huddled by the 9th Road campfire",
      2: "Find the Stone Kazoo in the glowing niche on Hyperspace Lane",
      3: "Deliver the Stone Kazoo to Carla at the camp fire",
    },
  },
  spider: {
    key: "spiderQ",
    name: "Plate for the Perimeter",
    tips: {
      1: "Speak to Hobb at the 9th Road campfire regarding camp sentry defenses",
      2: "Collect 3 Chitin Plates from cave spiders past the red glyph",
      3: "Deliver 3 Chitin Plates to Hobb to reinforce camp barriers",
    },
  },
  karst: {
    key: "karstQ",
    name: "The Karst Survey",
    tips: {
      1: "Speak to Ivo at the Harmouth Field Transceiver desk",
      2: "Crawl through the looping karst tunnel past Marker 78 twice",
      3: "Report your compass readings of Face Rock back to Ivo",
    },
  },
};

function syncHUD(p, qKey, step) {
  const q = QUESTS8[qKey];
  if (!q) return;
  const tip = q.tips[step];
  if (tip) {
    p.state.quest = { name: q.name, step: tip, at: Date.now() };
  } else if (p.state.quest?.name === q.name) {
    p.state.quest = null;
  }
}

export function setCarlaStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.carlaQ ?? 0) >= step) return;
  s.carlaQ = step;
  syncHUD(p, "carla", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setSpiderStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.spiderQ ?? 0) >= step) return;
  s.spiderQ = step;
  syncHUD(p, "spider", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setKarstStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.karstQ ?? 0) >= step) return;
  s.karstQ = step;
  syncHUD(p, "karst", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function finishQuest8(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS8[qKey];
  if (!q) return;

  s[q.key] = 99;
  if (s.quest?.name === q.name) s.quest = null;

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

// Dialogue quest triggers & turn-ins for Level 8
export function handleDialogueQuest8(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  // 1. Carla
  if (npcId === "l8-carla-kid") {
    // 1a. Start Carla's quest
    if (t.includes("kazoo") || t.includes("music") || t.includes("melody") || t.includes("cheer you up")) {
      if (!s.carlaQ) {
        setCarlaStep(ctx, p, 1, "Quest Started: Carla's Melody · Search for the Stone Kazoo on Hyperspace Lane");
        return {
          reply: "I used to have a tin whistle before the water flooded our camp. Mum says there is an old carved stone kazoo tucked into a flowstone niche on Hyperspace Lane. If you find it, can I have it? I'll trade you my clean bandage and cold water!",
          mood: "happy",
        };
      }
    }
    // 1b. Turn in Carla's quest
    if (t.includes("found this stone kazoo") || t.includes("brought the kazoo") || (t.includes("kazoo") && s.kazoo)) {
      if ((s.carlaQ === 1 || s.carlaQ === 2 || s.kazoo) && !s.kazooGiven) {
        s.kazoo = false;
        s.kazooGiven = true;
        s.sanity = Math.min(100, (s.sanity ?? 80) + 35);
        finishQuest8(ctx, p, "carla", {
          xp: 90,
          cents: 3000,
          items: ["almond", "bandage"],
          text: "Quest Completed: Carla's Melody · +90 XP, +$30.00, +35 Sanity, Almond Water, Clean Bandage",
        });
        return {
          reply: "A kazoo! Listen to this! Thank you so much! Mum, look what the runner brought me! Here, take my spare bottle of water and this clean bandage. You're the best!",
          mood: "happy",
        };
      }
    }
  }

  // 2. Hobb
  if (npcId === "l8-hobb") {
    // 2a. Start Spider Plate quest
    if (t.includes("plate for the perimeter") || t.includes("spider chitin") || t.includes("help defend the camp")) {
      if (!s.spiderQ) {
        setSpiderStep(ctx, p, 1, "Quest Started: Plate for the Perimeter · Slay cave spiders and gather 3 Chitin Plates");
        return {
          reply: "Glad you offered. The cave spiders past the red glyph have been testing our perimeter wire. Small rounds bounce right off their thorax, but that tough chitin makes unbeatable barricade plating. Bring me three plates and the camp will pay you proper.",
          mood: "calm",
        };
      }
    }
    // 2b. Turn in Spider Plate quest
    if (t.includes("brought 3 chitin plates") || t.includes("brought the 3 spider chitin plates") || t.includes("spider chitin plates for camp defense")) {
      const sc = s.scrap ?? {};
      const plates = sc.chitin ?? 0;
      if (s.spiderQ === 1 && plates >= 3) {
        sc.chitin = plates - 3;
        s.scrap = sc;
        finishQuest8(ctx, p, "spider", {
          xp: 120,
          cents: 6000,
          items: ["ammo", "firstaid"],
          text: "Quest Completed: Plate for the Perimeter · +120 XP, +$60.00, Ammo Crate, First Aid Kit",
        });
        return {
          reply: "These will do nicely. Dense, uncracked, and light enough to lash to the fence timber. Here is sixty Backdollars and fresh rounds from our reserve. You did the 9th Road a real service today.",
          mood: "happy",
        };
      } else if (s.spiderQ === 1 && plates < 3) {
        return {
          reply: `You only have ${plates} of the 3 chitin plates, wanderer. Break cocoons or take down cave spiders near Marker 76, then come back.`,
          mood: "calm",
        };
      }
    }
  }

  // 3. Ivo
  if (npcId === "l8-ivo") {
    // 3a. Start Karst Survey quest
    if (t.includes("looping karst") || t.includes("face rock") || t.includes("survey the crawl")) {
      if (!s.karstQ) {
        setKarstStep(ctx, p, 1, "Quest Started: The Karst Survey · Crawl through the loop tube past Marker 78");
        return {
          reply: "The Harmouth Society has lost two compass logs in that karst crevice past Marker 78. Spatial curvature loops back on itself until you pass the Face Rock formation twice. Crawl through, confirm the loop discharge, and bring me the readings so I can finish the chart.",
          mood: "calm",
        };
      }
    }
    // 3b. Turn in Karst Survey quest
    if (t.includes("mapped the looping crawl tunnel") || t.includes("face rock readings") || (t.includes("karst") && (s.l8Loops ?? 0) >= 1)) {
      if (s.karstQ === 1 && (s.l8Loops ?? 0) >= 1) {
        finishQuest8(ctx, p, "karst", {
          xp: 110,
          cents: 5000,
          items: ["battery", "battery", "kit"],
          text: "Quest Completed: The Karst Survey · +110 XP, +$50.00, 2 Caver Batteries, Repair Kit",
        });
        return {
          reply: "Remarkable! The orientation vector in your notes matches the second fold exactly. That proves Dell's anomaly hypothesis. Take these fresh batteries and this toolkit from our survey trunk. The Society is in your debt.",
          mood: "happy",
        };
      } else if (s.karstQ === 1 && (s.l8Loops ?? 0) < 1) {
        return {
          reply: "You need to crawl through the narrow tube past Marker 78 until you experience the loop threshold and spot the Face Rock twice. Be careful in there.",
          mood: "calm",
        };
      }
    }
  }

  return null;
}
