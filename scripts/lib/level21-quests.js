// Level 2.1 "Locked" - Quests & Refrigerator Paradise Operations
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, endQuest, qid, questStep, payOnce } from "./quests.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";
import { rollCheck } from "./npc-talk.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level21", id });

export const QUESTS21 = {
  saltine: {
    key: "saltineQ",
    name: "The Saltine Quota",
    tips: {
      1: "Speak to Ned at the Refrigerator Paradise workbench",
      2: "Find 3 Copper Wire coils in the Exploration Wing toolboxes",
      3: "Deliver 3 Copper Wire coils to Ned to repair the cooler condenser",
    },
    marks: {
      1: MARK("l21-ned"),
      2: MARK("l21-berries"),
      3: MARK("l21-ned"),
    },
  },
  edges: {
    key: "edgesQ",
    name: "The Edges Sentry",
    tips: {
      1: "Speak to Goknar at the corridor doorway post",
      2: "Walk the dark corridor past John Banks's blast site until the lights give out at The Edges",
      3: "Report the perimeter status back to Goknar",
    },
    marks: {
      1: MARK("l21-goknar"),
      2: MARK("l21-blaster"),
      3: MARK("l21-goknar"),
    },
  },
};

const syncHUD = (p, qKey, step, doneSummary) => questStep(p?.state, QUESTS21[qKey], step, doneSummary); // scripts/lib/quests.js, shared

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

const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export function finishQuest21(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "survivors" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS21[qKey];
  if (!q) return;
  if (s[q.key] === 99 || !payOnce(s, "l21-" + qKey)) return; // paid once per save

  const b = BONUS(s, by), msgs = [];
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  s[q.key] = 99;
  syncHUD(p, qKey, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d);
    msgs.push(tier || `${g === "karma" ? "Karma" : GROUPS[g]?.name ?? g} ${d > 0 ? "+" : ""}${d}`);
  }

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

// Dialogue quest triggers & turn-ins for Level 2.1
export function handleDialogueQuest21(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();
  const pos = p.worldFeetPosition ?? p.feetPosition;

  // 1. Ned (Quartermaster)
  if (npcId === "l21-ned") {
    // 1a. Start Saltine Quota / Condenser Repair quest
    if (t.includes("condenser") || t.includes("copper wire") || t.includes("errand board") || t.includes("help with supplies")) {
      if (!s.saltineQ) {
        if (repOf(s, "survivors") <= -35) return { reply: "Rules. Enemies of the camp don't go near the food.", mood: "angry" };
        const items = String(s.items ?? "").split(",").filter(Boolean);
        const wireCount = items.filter((x) => x === "wire" || x === "copper").length + (s.scrap?.wire ?? 0);
        setSaltineStep(ctx, p, wireCount >= 3 ? 3 : 2, "Quest Started: The Saltine Quota · Search the Exploration Wing for 3 Copper Wire coils");
        return {
          reply: "Third freezer bank's weeping coolant. Coil freezes over, we lose forty sleeves to damp. Three coils of clean copper wire, from the toolboxes in the Exploration Wing. Bring them to my bench.",
          mood: "calm",
        };
      }
    }
    // 1b. Repair check alternate route
    if (t.includes("inspect the condenser manifold") || t.includes("solder the bypass line") || t.includes("repair check")) {
      if ((s.saltineQ === 1 || s.saltineQ === 2) && !s.nedRepFailed) {
        const c = rollCheck(ctx, s, { skill: "repair", difficulty: 35 });
        if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } });
        if (!c.ok) {
          s.nedRepFailed = true;
          return { reply: "Whoa, easy with the torch, you nearly cracked the seal. Just bring me the wire.", mood: "annoyed" };
        }
        finishQuest21(ctx, p, "saltine", {
          xp: 130,
          cents: 5500,
          items: ["ration", "ration", "almond", "almond", "kit"],
          by: "survivors",
          rep: [["survivors", 10], ["karma", 3]],
          text: "Quest Completed: The Saltine Quota · Soldered the condenser bypass directly (+130 XP, +$55.00)",
        });
        return {
          reply: "Let it run a minute. There, dry all the way around the bypass. Here's fifty-five, two sleeves, cold coil water and my spare toolkit.",
          mood: "happy",
        };
      }
    }
    if (t.includes("freezer still holding") && s.saltineQ === 99) return { reply: "Cold as a grave, and the saltines are dry. You're the first runner in a month who brought back what they said they would.", mood: "calm" };
    // 1c. Turn in Saltine Quota quest
    if (t.includes("brought 3 copper wire") || t.includes("brought the copper wire") || t.includes("fix the condenser water tubes") || t.includes("copper wire coils to fix")) {
      const items = String(s.items ?? "").split(",").filter(Boolean);
      const wireCount = items.filter((x) => x === "wire" || x === "copper").length;
      const sc = s.scrap ?? {};
      const wireScrap = sc.wire ?? 0;
      const totalWire = wireCount + wireScrap;
      if ((s.saltineQ === 1 || s.saltineQ === 2 || s.saltineQ === 3) && totalWire >= 3) {
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
          by: "survivors",
          rep: [["survivors", 8], ["karma", 2]],
          text: "Quest Completed: The Saltine Quota · +110 XP, +$50.00, 2 Saltine Cartons, 2 Cold Coil Waters",
        });
        return {
          reply: "Good copper. Give me twenty minutes with the iron and I can get the freezer back on. Here's fifty, two sleeves and cold water.",
          mood: "happy",
        };
      } else if (s.saltineQ >= 1 && s.saltineQ < 99 && totalWire < 3) {
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
        if (repOf(s, "meg") <= -35) return { reply: "I don't work with hostiles. Back off the door.", mood: "angry" };
        setEdgesStep(ctx, p, s.l21Scouted ? 3 : 2, "Quest Started: The Edges Sentry · Scout the perimeter toward The Edges");
        return {
          reply: "Tubes blew out in the corridor to the Edges yesterday. Three Smilers hanging past the line. Walk it till the lights give out, see if anything's moving our way, and come back. Don't go chasing grins in the dark.",
          mood: "calm",
        };
      }
    }
    // 2b. Turn in Edges Sentry quest
    // 2b'. Survival read on the Smilers: a better report, a better plan
    if (t.includes("smilers stop where the light stops")) {
      if (s.edgesQ >= 1 && s.edgesQ < 99 && s.l21Scouted && !s.edgesSurvFailed) {
        const c = rollCheck(ctx, s, { skill: "survival", difficulty: 30 });
        if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } });
        if (!c.ok) { s.edgesSurvFailed = true; return { reply: "Light keeps them off? Tell that to the last man who trusted a tube. Just give me what you saw.", mood: "annoyed" }; }
        finishQuest21(ctx, p, "edges", { xp: 180, cents: 7000, items: ["ammo", "firstaid", "battery"], by: "meg", rep: [["meg", 14], ["survivors", 4], ["karma", 2]],
          text: "Quest Completed: The Edges Sentry · read the Smilers' line (+180 XP, +$70.00, Ammo Crate, First Aid Kit, Battery)" });
        return { reply: "They hold at the dark. Huh. Then we spend batteries, not bullets. Take a cell for your torch, and the rounds anyway. I'll put a lamp on that line tonight.", mood: "happy" };
      }
    }
    // 2c. after the job: Goknar remembers it
    if (t.includes("how's the line holding") && s.edgesQ === 99) return { reply: "Lamp's burning on your line. They sit out there grinning at it. Haven't lost a night's sleep since.", mood: "calm" };
    if (t.includes("surveyed the edges") || t.includes("secured the dark corridor") || t.includes("walked the dark corridor to the edges")) {
      if ((s.edgesQ === 1 || s.edgesQ === 2 || s.edgesQ === 3) && s.l21Scouted) {
        finishQuest21(ctx, p, "edges", {
          xp: 140,
          cents: 7000,
          items: ["ammo", "firstaid"],
          by: "meg",
          rep: [["meg", 10], ["survivors", 4], ["karma", 2]],
          text: "Quest Completed: The Edges Sentry · +140 XP, +$70.00, Ammo Crate, First Aid Kit",
        });
        return {
          reply: "Good. Quiet's all I asked for. Ned and I can sleep in shifts again. Seventy and a box of rounds from Alef stock.",
          mood: "happy",
        };
      } else if (s.edgesQ >= 1 && s.edgesQ < 99 && !s.l21Scouted) {
        return {
          reply: "The blast site is only halfway. Keep going until the lights cut out. That's the stretch I need checked.",
          mood: "calm",
        };
      }
    }
  }

  return null;
}
