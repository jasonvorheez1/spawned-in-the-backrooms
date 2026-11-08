// Level 11 "The Infinite City" - Quests & Objectives System
// Canon Wikidot lore quests:
// 1. "Spotlight on Sedco" (Courier / Vance / Sedco Spotlight AV Store & Subterranean Vault)
// 2. "The Paper Bird's Blessing" (Entity 14 Lucky Crane / Grand Canal Lock Valve / Trader Kael)
// 3. "Capital Infrastructure: The Night Shift" (Night Shift Janitor / Spontaneous Roadworks / Apartment Utilities)

import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";

export const QUESTS = {
  sedco: {
    key: "sedcoQ",
    name: "Spotlight on Sedco",
    tips: {
      1: "Breach Sedco Spotlight by overriding terminal SEDCO-SEC-01 (Password: 'spotlight')",
      2: "Search the sales counter and review CCTV camera feeds inside Sedco Spotlight",
      3: "Calibrate the Fresnel Stage Spotlight inside Sedco Spotlight",
      4: "Descend into the 14th St subway station and retrieve the Sedco Master Drive from the vault",
      5: "Deliver the Sedco Master Drive to Courier on 11th Ave or Vance at Base Beta",
    },
  },
  crane: {
    key: "craneQ",
    name: "The Paper Bird's Blessing",
    tips: {
      1: "Seek out Entity 14 (Lucky Crane) resting on the Grand Canal balustrade",
      2: "Follow the canal promenade to the North Canal Pumping Spillway",
      3: "Clear the jammed spillway valve and collect pure Canal Almond Water",
      4: "Deliver the pure Almond Water to Trader Kael at the Central Market",
    },
  },
  maint: {
    key: "maintQ",
    name: "Capital Infrastructure: The Night Shift",
    tips: {
      1: "Bleed the overpressured B.R.C. Diesel Compressor at the west lane roadworks",
      2: "Enter Apartment 11-B and vent the cast iron steam radiator",
      3: "Test the apartment Almond Water kitchen tap and tune the radio to 104.2 FM",
      4: "Report back to the Night Shift Janitor on 11th Avenue",
    },
  },
};

function syncHUD(p, qKey, step) {
  const q = QUESTS[qKey];
  if (!q) return;
  const tip = q.tips[step];
  if (tip) {
    p.state.quest = { name: q.name, step: tip, at: Date.now() };
  } else if (p.state.quest?.name === q.name) {
    p.state.quest = null;
  }
}

export function setSedcoStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.sedcoQ ?? 0) >= step) return;
  s.sedcoQ = step;
  syncHUD(p, "sedco", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setCraneStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.craneQ ?? 0) >= step) return;
  s.craneQ = step;
  syncHUD(p, "crane", step);
  const now = ctx.now();
  if (noteText) {
    s.notice = { text: noteText, at: now };
    pushFeed(s, noteText, now, "info");
  }
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: CHIME, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

export function setMaintStep(ctx, p, step, noteText) {
  const s = p?.state;
  if (!s || (s.maintQ ?? 0) >= step) return;
  s.maintQ = step;
  syncHUD(p, "maint", step);
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
  const q = QUESTS[qKey];
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
  ctx.emit("milestone", { step: 1, name: `quest-${qKey}` }, { audience: { player: p.id } });
}

// Dialogue quest triggers & turn-ins
export function handleDialogueQuest(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  // 1. Sedco Quest Start (from Courier)
  if (npcId === "l11-walker-1" && (t.includes("sedco manifest") || t.includes("need a hand"))) {
    if (!s.sedcoQ) {
      setSedcoStep(ctx, p, 1, "Quest Started: Spotlight on Sedco · Breach terminal SEDCO-SEC-01");
      return {
        reply: "You're a lifesaver, kid! The Sedco storefront alarm tripped on Cam 04 and locked the doors and the subway vault. If you can override terminal SEDCO-SEC-01 outside the store, grab the CCTV backup logs, and pull the deposit drive from the underground vault, we split the salvage fifty-fifty!",
        mood: "happy",
      };
    }
  }

  // 1b. Sedco Quest Turn-in (to Courier or Specialist Vance)
  if ((npcId === "l11-walker-1" || npcId === "l11-meg-agent-vance") && (t.includes("recovered the sedco") || t.includes("retrieved the sedco") || t.includes("master security drive"))) {
    if (s.sedcoQ === 5) {
      finishQuest(ctx, p, "sedco", {
        xp: 120,
        cents: 6000,
        items: ["firstaid", "kit"],
        text: "Quest Completed: Spotlight on Sedco · +120 XP, +$60.00, First Aid Kit, Repair Kit",
      });
      if (npcId === "l11-walker-1") {
        return {
          reply: "Holy smokes, you actually got the Sedco Master Drive out of the vault! Management won't believe this. Here's your cut: sixty Backdollars, field medical supplies, and a weapon repair kit. You're an ace, wanderer!",
          mood: "happy",
        };
      } else {
        return {
          reply: "Excellent work, wanderer. M.E.G. Base Beta intelligence has been trying to access Sedco's archived feeds for weeks. Your requisition bounty has been approved: sixty Backdollars, medical supplies, and toolkits. Stay sharp out there.",
          mood: "happy",
        };
      }
    }
  }

  // 2. Crane Quest Start (from Trader Kael)
  if (npcId === "l11-trader-kael" && (t.includes("canal shipments") || t.includes("wrong with the canal") || t.includes("canal trade route"))) {
    if (!s.craneQ) {
      setCraneStep(ctx, p, 1, "Quest Started: The Paper Bird's Blessing · Visit Entity 14 on the canal coping");
      return {
        reply: "It's the canal locks upstream, citizen. The spillway pressure valve jammed, and the B.N.T.G. freight barge from Level 6.1 can't dock! Even the Lucky Cranes along the promenade stopped chirping. Seek out the origami crane on the canal wall, its blessing will guide you to the spillway pump.",
        mood: "calm",
      };
    }
  }

  // 2b. Crane Quest Turn-in (to Trader Kael)
  if (npcId === "l11-trader-kael" && (t.includes("cleared the canal lock") || t.includes("pure almond water") || t.includes("canal water"))) {
    if (s.craneQ === 4) {
      finishQuest(ctx, p, "crane", {
        xp: 95,
        cents: 4000,
        items: ["ration", "almond", "almond"],
        text: "Quest Completed: The Paper Bird's Blessing · +95 XP, +$40.00, Fresh Provisions",
      });
      return {
        reply: "You did it! I can hear the canal locks opening right now, the B.N.T.G. coffee caravan is sailing in! As promised, forty Backdollars, fresh rations, and two bottles of pure Almond Water. The Guild won't forget your help, citizen!",
        mood: "happy",
      };
    }
  }

  // 3. Maintenance Quest Start (from Night Shift Janitor)
  if (npcId === "l11-walker-3" && (t.includes("maintenance rounds") || t.includes("need assistance") || t.includes("help with the maintenance"))) {
    if (!s.maintQ) {
      setMaintStep(ctx, p, 1, "Quest Started: Capital Infrastructure · Bleed the B.R.C. Diesel Compressor on the west lane");
      return {
        reply: "Much obliged, wanderer. The city spawned spontaneous simulated roadworks on the west lane overnight, but the compressor's relief valve is whistling like a tea kettle. Bleed the pressure on the compressor, check the cast iron radiator in Apartment 11-B, test the tap, and report back.",
        mood: "calm",
      };
    }
  }

  // 3b. Maintenance Quest Turn-in (to Night Shift Janitor)
  if (npcId === "l11-walker-3" && (t.includes("compressor is bypassed") || t.includes("utilities are running smooth") || t.includes("apartment 11-b"))) {
    if (s.maintQ === 4) {
      finishQuest(ctx, p, "maint", {
        xp: 90,
        cents: 3500,
        items: ["kit", "battery"],
        text: "Quest Completed: Capital Infrastructure · +90 XP, +$35.00, Repair Kit, Battery",
      });
      return {
        reply: "Good work, kid. The steam gauge on 11th Avenue settled right back into the green, and the apartment lines are humming quiet. Here's thirty-five Backdollars, a spare tool kit, and a fresh battery for your trouble. Keep your eyes sharp when the lights cycle down.",
        mood: "happy",
      };
    }
  }

  return null;
}
