// Level 8 "The 9th Road" - Quests & Survival Camp Operations
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, endQuest, qid, questStep } from "./quests.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";
import { rollCheck } from "./npc-talk.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level8", id });

export const QUESTS8 = {
  carla: {
    key: "carlaQ",
    name: "Carla's Melody",
    tips: {
      1: "Speak to Carla huddled by the 9th Road campfire",
      2: "Find the Stone Kazoo in the glowing niche on Hyperspace Lane",
      3: "Deliver the Stone Kazoo to Carla at the camp fire",
    },
    marks: { 1: MARK("l8-carla-kid"), 2: MARK("l8-kazoo"), 3: MARK("l8-carla-kid") },
  },
  spider: {
    key: "spiderQ",
    name: "Plate for the Perimeter",
    tips: {
      1: "Speak to Hobb at the 9th Road campfire regarding camp sentry defenses",
      2: "Collect 3 Chitin Plates from cave spiders past the red glyph",
      3: "Deliver 3 Chitin Plates to Hobb to reinforce camp barriers",
    },
    marks: { 1: MARK("l8-hobb"), 2: MARK("l8-glyph"), 3: MARK("l8-hobb") },
  },
  karst: {
    key: "karstQ",
    name: "The Karst Survey",
    tips: {
      1: "Speak to Ivo at the Harmouth Field Transceiver desk",
      2: "Crawl through the looping karst tunnel past Marker 78 twice",
      3: "Report your compass readings of Face Rock back to Ivo",
    },
    marks: { 1: MARK("l8-ivo"), 2: MARK("l8-crawl-end"), 3: MARK("l8-ivo") },
  },
};

const syncHUD = (p, qKey, step, doneSummary) => questStep(p?.state, QUESTS8[qKey], step, doneSummary); // scripts/lib/quests.js, shared

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

const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export function finishQuest8(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "survivors" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS8[qKey];
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

// Dialogue quest triggers & turn-ins for Level 8
export function handleDialogueQuest8(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();
  const pos = p.worldFeetPosition ?? p.feetPosition;

  // 1. Carla
  if (npcId === "l8-carla-kid") {
    if (t.includes("kazoo") || t.includes("music") || t.includes("melody") || t.includes("cheer you up")) {
      if (!s.carlaQ) {
        setCarlaStep(ctx, p, s.kazoo ? 3 : 2, "Quest Started: Carla's Melody · Search for the Stone Kazoo on Hyperspace Lane");
        return {
          reply: "I had a tin whistle before the water came. Mum says there's a stone kazoo in a flowstone niche on Hyperspace Lane. Somebody carved it. If you find it, can I have it? I'll give you my good bandage. And cold water.",
          mood: "happy",
        };
      }
    }
    if (t.includes("found this stone kazoo") || t.includes("brought the kazoo") || (t.includes("kazoo") && s.kazoo)) {
      if ((s.carlaQ === 1 || s.carlaQ === 2 || s.carlaQ === 3 || s.kazoo) && !s.kazooGiven && s.kazoo) {
        s.kazoo = false;
        s.kazooGiven = true;
        s.sanity = Math.min(100, (s.sanity ?? 80) + 35);
        finishQuest8(ctx, p, "carla", {
          xp: 90,
          cents: 0,
          items: ["almond", "bandage"],
          rep: [["survivors", 8], ["karma", 4]],
          text: "Quest Completed: Carla's Melody · +90 XP, +35 Sanity, Almond Water, Clean Bandage",
        });
        return {
          reply: "Mum, look what they found! Here, my good bandage. I kept the water cold in the stream. Do you want to hear me play?",
          mood: "happy",
        };
      }
    }
  }

  // 2. Hobb
  if (npcId === "l8-hobb") {
    if (t.includes("plate for the perimeter") || t.includes("spider chitin") || t.includes("help defend the camp")) {
      if (!s.spiderQ) {
        if (repOf(s, "survivors") <= -35) return { reply: "I know what you did to camp folk. Hands off my fence.", mood: "angry" };
        const plates = s.scrap?.chitin ?? 0;
        setSpiderStep(ctx, p, plates >= 3 ? 3 : 2, "Quest Started: Plate for the Perimeter · Slay cave spiders and gather 3 Chitin Plates");
        return {
          reply: "Spiders past the red glyph are testing the wire. Bullets bounce off their backs, but that shell makes good plating. Three plates. Bring 'em and the camp pays.",
          mood: "calm",
        };
      }
    }
    if (t.includes("brought 3 chitin plates") || t.includes("brought the 3 spider chitin plates") || t.includes("spider chitin plates for camp defense")) {
      const sc = s.scrap ?? {};
      const plates = sc.chitin ?? 0;
      if ((s.spiderQ === 1 || s.spiderQ === 2 || s.spiderQ === 3) && plates >= 3) {
        sc.chitin = plates - 3;
        s.scrap = sc;
        finishQuest8(ctx, p, "spider", {
          xp: 120,
          cents: 6000,
          items: ["ammo", "firstaid"],
          rep: [["survivors", 10], ["karma", 2]],
          text: "Quest Completed: Plate for the Perimeter · +120 XP, +$60.00, Ammo Crate, First Aid Kit",
        });
        return {
          reply: "These'll fit between the posts. Carla, bring me the wire, will you? Here's your sixty and the ammo from the reserve.",
          mood: "happy",
        };
      } else if (s.spiderQ >= 1 && s.spiderQ < 99 && plates < 3) {
        return {
          reply: `You only have ${plates} of the 3 chitin plates, wanderer. Break cocoons or take down cave spiders near Marker 76, then come back.`,
          mood: "calm",
        };
      }
    }
  }

  // 3. Ivo
  if (npcId === "l8-ivo") {
    if (t.includes("looping karst") || t.includes("face rock") || t.includes("survey the crawl")) {
      if (!s.karstQ) {
        if (repOf(s, "survivors") <= -35) return { reply: "The Society doesn't work with killers. Leave my desk alone.", mood: "angry" };
        setKarstStep(ctx, p, (s.l8Loops ?? 0) >= 1 ? 3 : 2, "Quest Started: The Karst Survey · Crawl through the loop tube past Marker 78");
        return {
          reply: "The crevice past Marker 78 eats compasses. It loops. You pass the Face Rock, then you pass it again, and you never turned round. Crawl it, feel the loop, bring me the readings. Dell got this far.",
          mood: "calm",
        };
      }
    }
    if (t.includes("deduce the loop vector") || t.includes("harmouth telemetry")) {
      if ((s.karstQ === 1 || s.karstQ === 2) && !s.karstSciFailed) {
        const c = rollCheck(ctx, s, { skill: "science", difficulty: 45 });
        if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } });
        if (!c.ok) {
          s.karstSciFailed = true;
          return { reply: "Your numbers are twelve degrees off. You can't do this one on paper. You have to crawl it.", mood: "annoyed" };
        }
        s.l8Loops = Math.max(1, s.l8Loops ?? 0);
        finishQuest8(ctx, p, "karst", {
          xp: 125,
          cents: 5000,
          items: ["battery", "battery", "kit"],
          rep: [["survivors", 8], ["meg", 4]],
          text: "Quest Completed: The Karst Survey · Calculated the loop vector for Ivo (+125 XP, +$50.00)",
        });
        return {
          reply: "You got the fold from the compass drift. Hang on. Dell wrote the same number in the margin. Here, take the batteries, the toolkit and the stipend.",
          mood: "happy",
        };
      }
    }
    if (t.includes("mapped the looping crawl tunnel") || t.includes("face rock readings") || (t.includes("karst") && (s.l8Loops ?? 0) >= 1)) {
      if ((s.karstQ === 1 || s.karstQ === 2 || s.karstQ === 3) && (s.l8Loops ?? 0) >= 1) {
        finishQuest8(ctx, p, "karst", {
          xp: 110,
          cents: 5000,
          items: ["battery", "battery", "kit"],
          rep: [["survivors", 8], ["meg", 4]],
          text: "Quest Completed: The Karst Survey · +110 XP, +$50.00, 2 Caver Batteries, Repair Kit",
        });
        return {
          reply: "That's it. That's the second fold, exactly where Dell said it would be. Take the batteries and the toolkit from the trunk. I'm going to write her name on this map.",
          mood: "happy",
        };
      } else if (s.karstQ >= 1 && s.karstQ < 99 && (s.l8Loops ?? 0) < 1) {
        return {
          reply: "You haven't hit the loop yet. Past Marker 78, the tight tube. You'll know it when you see the Face Rock twice.",
          mood: "calm",
        };
      }
    }
  }

  return null;
}
