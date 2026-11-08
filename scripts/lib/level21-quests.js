// Level 21 "Numbered Doors" - Quests & Refrigerator Paradise Operations
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";

export const QUESTS21 = {
  saltine: {
    key: "saltineQ",
    name: "The Saltine Quota",
    tips: {
      1: "Speak to Ned at the Refrigerator Paradise workbench",
      2: "Find 3 Copper Wire coils in the Exploration Wing toolboxes",
      3: "Deliver 3 Copper Wire coils to Ned to repair the cooler condenser",
    },
  },
  edges: {
    key: "edgesQ",
    name: "The Edges Sentry",
    tips: {
      1: "Speak to Goknar at the corridor doorway post",
      2: "Patrol the dark threshold toward The Edges and defeat hostile entities",
      3: "Report the perimeter status back to Goknar",
    },
  },
};

function syncHUD(p, qKey, step) {
  const q = QUESTS21[qKey];
  if (!q) return;
  const tip = q.tips[step];
  if (tip) {
    p.state.quest = { name: q.name, step: tip, at: Date.now() };
  } else if (p.state.quest?.name === q.name) {
    p.state.quest = null;
  }
}

export function setSaltineStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.saltineQ ?? 0) >= step) return;
  s.saltineQ = step;
  syncHUD(p, "saltine", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setEdgesStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.edgesQ ?? 0) >= step) return;
  s.edgesQ = step;
  syncHUD(p, "edges", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function finishQuest21(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS21[qKey];
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

// Dialogue quest triggers & turn-ins for Level 21
export function handleDialogueQuest21(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  // 1. Ned (Quartermaster)
  if (npcId === "l21-ned") {
    // 1a. Start Saltine Quota / Condenser Repair quest
    if (t.includes("condenser") || t.includes("copper wire") || t.includes("errand board") || t.includes("help with supplies")) {
      if (!s.saltineQ) {
        setSaltineStep(ctx, p, 1, "Quest Started: The Saltine Quota · Search the Exploration Wing for 3 Copper Wire coils");
        return {
          reply: "The copper coil on our third freezer bank is weeping refrigerant. If the coil freezes over, we lose forty sleeves of crackers to damp rot. Search the toolboxes and supply lockers down in the Exploration Wing for three coils of clean copper wire. Bring them to my workbench and I'll pay you from our emergency scrip reserve.",
          mood: "calm",
        };
      }
    }
    // 1b. Turn in Saltine Quota quest
    if (t.includes("brought 3 copper wire") || t.includes("brought the copper wire") || t.includes("fix the condenser water tubes") || t.includes("copper wire coils to fix")) {
      const items = String(s.items ?? "").split(",").filter(Boolean);
      const wireCount = items.filter((x) => x === "wire" || x === "copper").length;
      const sc = s.scrap ?? {};
      const wireScrap = sc.wire ?? 0;
      const totalWire = wireCount + wireScrap;
      if (s.saltineQ === 1 && totalWire >= 3) {
        // Deduct 3 wires
        let rem = 3;
        const nextItems = [];
        for (const it of items) {
          if ((it === "wire" || it === "copper") && rem > 0) { rem--; }
          else nextItems.push(it);
        }
        s.items = nextItems.join(",");
        if (rem > 0) { sc.wire = Math.max(0, (sc.wire ?? 0) - rem); s.scrap = sc; }
        finishQuest21(ctx, p, "saltine", {
          xp: 110,
          cents: 5000,
          items: ["ration", "ration", "almond", "almond"],
          text: "Quest Completed: The Saltine Quota · +110 XP, +$50.00, 2 Saltine Cartons, 2 Cold Coil Waters",
        });
        return {
          reply: "That is clean electrical grade copper. I will have this soldered to the bypass line in twenty minutes. Here is fifty Backdollars, two full sleeves of crisp Saltines, and fresh cold water from the condenser jug. You have got a standing credit in Refrigerator Paradise, wanderer.",
          mood: "happy",
        };
      } else if (s.saltineQ === 1 && totalWire < 3) {
        return {
          reply: `You only have ${totalWire} of the 3 copper wire coils. Check the rusted toolboxes and storage cabinets in the Exploration Wing west of Base Alef.`,
          mood: "calm",
        };
      }
    }
  }

  // 2. Goknar (M.E.G. Agent)
  if (npcId === "l21-goknar") {
    // 2a. Start Edges Sentry quest
    if (t.includes("edges sentry") || t.includes("the edges perimeter") || t.includes("secure the dark corridor") || t.includes("patrol the hallway")) {
      if (!s.edgesQ) {
        setEdgesStep(ctx, p, 1, "Quest Started: The Edges Sentry · Scout the perimeter toward The Edges");
        return {
          reply: "The fluorescent tubes in the corridor leading toward The Edges blew out yesterday. We logged three Smilers lingering past the perimeter line. Patrol down to the sign for The Edges, confirm the breaker voltage is holding, and make sure nothing is crawling toward our door. Keep your weapon ready and your light focused.",
          mood: "calm",
        };
      }
    }
    // 2b. Turn in Edges Sentry quest
    if (t.includes("surveyed the edges") || t.includes("secured the dark corridor") || t.includes("the edges perimeter and secured")) {
      if (s.edgesQ === 1) {
        finishQuest21(ctx, p, "edges", {
          xp: 140,
          cents: 7000,
          items: ["ammo", "firstaid"],
          text: "Quest Completed: The Edges Sentry · +140 XP, +$70.00, Ammo Crate, First Aid Kit",
        });
        return {
          reply: "Good shooting and sharp eyes. With that corridor secured, Ned and I can keep the freezers humming without watching our backs every five seconds. Here is seventy Backdollars and reserve ammo from Base Alef stock. Keep that barrel clean, agent.",
          mood: "happy",
        };
      }
    }
  }

  return null;
}
