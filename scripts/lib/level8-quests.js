// Level 8 "The 9th Road" - Quests & Survival Camp Operations
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, endQuest, qid, questStep, payOnce } from "./quests.js";
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
      1: "Talk to Carla at the soup pot by the 9th Road campfire",
      2: "Find the stone kazoo on a flowstone shelf on Hyperspace Lane, back up the Road past the tar pool where the lights turn blue. Or mend her tin whistle [Repair 35]",
      3: "Give the stone kazoo to Carla at the soup pot by the 9th Road campfire",
    },
    marks: { 1: MARK("l8-carla-kid"), 2: MARK("l8-kazoo"), 3: MARK("l8-carla-kid") },
  },
  spider: {
    key: "spiderQ",
    name: "Plate for the Perimeter",
    tips: {
      1: "Talk to Hobb by the 9th Road campfire about the camp fence",
      2: "Take 3 chitin plates off the cave spiders past the red NEVER ENTER glyph, or bring Hobb 6 spider silk and 3 tar pitch to build plates [Repair 35]",
      3: "Bring the 3 chitin plates to Hobb by the 9th Road campfire",
    },
    marks: { 1: MARK("l8-hobb"), 2: MARK("l8-glyph"), 3: MARK("l8-hobb") },
  },
  karst: {
    key: "karstQ",
    name: "The Karst Survey",
    tips: {
      1: "Talk to Ivo at the Harmouth field transceiver desk in the 9th Road camp",
      2: "Crawl the tight tube past Marker 78, back up the Road near the entrance, until it brings you out under Marker 74 by the Face Rock. Or work the loop out from Ivo's telemetry [Science 45]",
      3: "Tell Ivo at the 9th Road camp what the compass did at the Face Rock",
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
  if (s[q.key] === 99 || !payOnce(s, "l8-" + qKey)) return; // paid once per save

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

// ---- Dialogue: the choices each giver offers (scripts/lib/npc-starters.js) and what they do (talk.js sends the text here).
// Every quest has a way through that needs no fight: Carla's whistle [Repair 35], Hobb's silk plates [Repair 35], Ivo's telemetry [Science 45].
// A failed check is spent (one try, as in New Vegas), and the plain route stays open.
export const CHOICES8 = {
  carlaStart: "You look fed up, Carla. What would cheer you up?",
  carlaMend: "Let me see that squashed tin whistle. I might straighten it.",
  carlaGive: "Close your eyes. I brought the kazoo.",
  carlaAfter: "How's the music coming, Carla?",
  hobbStart: "Your sentries look jumpy. Need plate for the perimeter?",
  hobbBuild: "Silk and pitch, layered and set. Let me build the plates myself.",
  hobbGive: "Brought 3 chitin plates. Still sticky.",
  hobbAfter: "How's the fence holding?",
  ivoStart: "I'll go crawl that looping karst crevice for you.",
  ivoMath: "Give me your Harmouth telemetry. I think I can do it on paper.",
  ivoGive: "Passed the Face Rock twice. Here are the Face Rock readings.",
  ivoAfter: "How's Dell's map?",
};
const C = CHOICES8, scrapOf = (s, k) => Number(s?.scrap?.[k]) || 0;
export function l8Choices(id, s) {
  const out = [], hated = repOf(s, "survivors") <= -35;
  if (id === "l8-carla-kid") {
    const q = s?.carlaQ ?? 0;
    if (!q) out.push({ text: C.carlaStart, tag: "Quest Start" });
    else if (q < 99) {
      if (s.kazoo && !s.kazooGiven) out.push({ text: C.carlaGive, tag: "Quest Turn-In" });
      else if (!s.carlaRepFailed) out.push({ text: C.carlaMend, tag: "Repair 35" });
    } else out.push({ text: C.carlaAfter, tag: "Talk" });
  } else if (id === "l8-hobb") {
    const q = s?.spiderQ ?? 0;
    if (!q) { if (!hated) out.push({ text: C.hobbStart, tag: "Quest Start" }); }
    else if (q < 99) {
      if (scrapOf(s, "chitin") >= 3) out.push({ text: C.hobbGive, tag: "Quest Turn-In" });
      if (!s.spiderRepFailed) out.push({ text: C.hobbBuild, tag: "Repair 35" });
    } else out.push({ text: C.hobbAfter, tag: "Talk" });
  } else if (id === "l8-ivo") {
    const q = s?.karstQ ?? 0;
    if (!q) { if (!hated) out.push({ text: C.ivoStart, tag: "Quest Start" }); }
    else if (q < 99) {
      if ((s.l8Loops ?? 0) >= 1) out.push({ text: C.ivoGive, tag: "Quest Turn-In" });
      else if (!s.karstSciFailed) out.push({ text: C.ivoMath, tag: "Science 45" });
    } else out.push({ text: C.ivoAfter, tag: "Talk" });
  }
  return out;
}

// a roll, its sound, and the [Skill N] verdict on the player's screen
function check8(ctx, p, skill, difficulty, label) {
  const s = p.state, c = rollCheck(ctx, s, { skill, difficulty }), pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } });
  const text = `[${label} ${difficulty}] ${c.ok ? "SUCCEEDED" : "FAILED"}`;
  s.notice = { text, at: ctx.now() }; pushFeed(s, text, ctx.now(), c.ok ? "good" : "info");
  return c.ok;
}
// what a giver says once the job is done, in turn, so the pitch never replays
function after(p, key, lines) {
  const ses = (p.session ??= {}), seen = (ses.l8after ??= {}), n = (seen[key] = (seen[key] ?? -1) + 1);
  return lines[n % lines.length];
}

const CARLA_PAY = { xp: 90, cents: 0, items: ["almond", "bandage"], rep: [["survivors", 8], ["karma", 4]] };
// Carla gets her music: the stone kazoo, or her own whistle mended. Paid once (carlaQ 99, kazooGiven).
export function deliverKazoo(ctx, p, how = "kazoo") {
  const s = p?.state;
  if (!s || s.carlaQ === 99 || s.kazooGiven) return false;
  if (how === "kazoo") { if (!s.kazoo) return false; s.kazoo = false; }
  else s.carlaWhistle = true;
  s.kazooGiven = true;
  s.sanity = Math.min(100, (s.sanity ?? 80) + 35);
  finishQuest8(ctx, p, "carla", { ...CARLA_PAY, text: `Quest Completed: Carla's Melody${how === "whistle" ? " · mended her tin whistle" : ""} · +90 XP, +35 Sanity, Almond Water, Clean Bandage` });
  return true;
}

const HOBB_PAY = { xp: 120, cents: 6000, items: ["ammo", "firstaid"], rep: [["survivors", 10], ["karma", 2]] };
const KARST_PAY = { cents: 5000, items: ["battery", "battery", "kit"], rep: [["survivors", 8], ["meg", 4]] };

export function handleDialogueQuest8(ctx, p, npc, text) {
  const t = String(text ?? "");
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  if (npcId === "l8-carla-kid") {
    if (t === C.carlaStart && !s.carlaQ) {
      setCarlaStep(ctx, p, s.kazoo ? 3 : 2, s.kazoo ? "Quest Started: Carla's Melody · You already carry a stone kazoo. Give it to Carla" : "Quest Started: Carla's Melody · Find the stone kazoo on Hyperspace Lane");
      return s.kazoo
        ? { reply: "Wait. What's in your pocket? That's a kazoo! That's the one Mum said! Can I have it? Please?", mood: "happy" }
        : { reply: "Really? It's back up the Road, past the hot tar, where the lights go blue. It's on a little stone shelf in the wall. Don't touch the tar. And if they sing, don't sing back. Hobb says.", mood: "happy" };
    }
    if (t === C.carlaGive && s.carlaQ && s.carlaQ < 99) {
      if (!deliverKazoo(ctx, p, "kazoo")) return { reply: "You don't have it. You're tricking me. That's not funny.", mood: "sad" };
      return { reply: "It's cold! Hhhmmm... it BUZZES! Mum, listen! Here, my good bandage, and the water's been in the stream, it's the coldest. Now when they sing, I'll play louder.", mood: "happy" };
    }
    if (t === C.carlaMend && s.carlaQ && s.carlaQ < 99 && !s.carlaRepFailed) {
      if (!check8(ctx, p, "repair", 35, "Repair")) {
        s.carlaRepFailed = true;
        return { reply: "Now it just goes fffff. ...It's okay. It was already broken. The kazoo, then? On Hyperspace Lane?", mood: "sad" };
      }
      deliverKazoo(ctx, p, "whistle");
      return { reply: "It works! It's wonky but it WORKS! Listen. ...That's Mum's note. That's the one she does. Here, my good bandage. And the cold water. You fixed Mum's whistle.", mood: "happy" };
    }
    if (t === C.carlaAfter && s.carlaQ === 99) {
      const what = s.carlaWhistle ? "whistle" : "kazoo";
      return { reply: after(p, "carla", [
        `I played the ${what} at the singing last night. Hobb pretended to be asleep. They stopped before I did. I win.`,
        "I'm learning Mum's song. I've got the start. The middle's hard. She'll show me when she's back.",
        `Hobb says the ${what} is very loud. He says it nicely, though. Like he likes it.`,
      ]), mood: "happy" };
    }
  }

  if (npcId === "l8-hobb") {
    if (t === C.hobbStart && !s.spiderQ) {
      if (repOf(s, "survivors") <= -35) return { reply: "I know what you did to camp folk. Hands off my fence.", mood: "angry" };
      const plates = scrapOf(s, "chitin");
      setSpiderStep(ctx, p, plates >= 3 ? 3 : 2, "Quest Started: Plate for the Perimeter · Bring Hobb 3 chitin plates, or build them from silk and pitch");
      return { reply: plates >= 3
        ? "You've three on you already? Then why are we talking, butty. Hand them over."
        : "Good. The glyph's back up the Road, red, says NEVER ENTER. They mean it. Go for the small ones. And if you'd sooner not fight, I'll not think less of you: silk off the cocoons and pitch off the seeps, laid right, makes a plate near as good. I never had the knack.", mood: "calm" };
    }
    if (t === C.hobbGive && s.spiderQ && s.spiderQ < 99) {
      const plates = scrapOf(s, "chitin");
      if (plates < 3) return { reply: `That's ${plates} of the three, butty. Spiders past the red glyph. Or silk and pitch, if you've the hands.`, mood: "calm" };
      s.scrap = { ...s.scrap, chitin: plates - 3 };
      finishQuest8(ctx, p, "spider", { ...HOBB_PAY, text: "Quest Completed: Plate for the Perimeter · +120 XP, +$60.00, Ammo Crate, First Aid Kit" });
      return { reply: "These'll sit between the posts lovely. Carla, love, fetch me the wire. Here's your sixty, and a crate from the reserve. Don't tell M.E.G. where it went.", mood: "happy" };
    }
    if (t === C.hobbBuild && s.spiderQ && s.spiderQ < 99 && !s.spiderRepFailed) {
      const silk = scrapOf(s, "spider_silk"), pitch = scrapOf(s, "pitch");
      if (silk < 6 || pitch < 3) return { reply: `Six silk and three pitch, butty. You've ${silk} and ${pitch}. Cocoons in the webs, and the tar seeps by the pool. Then we'll see your hands.`, mood: "calm" };
      if (!check8(ctx, p, "repair", 35, "Repair")) {
        s.spiderRepFailed = true;
        return { reply: "It's sagging already. Feel that? A spider'd go through it like a curtain. No shame. I couldn't do it either. Chitin, then. Keep your silk.", mood: "calm" };
      }
      s.scrap = { ...s.scrap, spider_silk: silk - 6, pitch: pitch - 3 };
      finishQuest8(ctx, p, "spider", { ...HOBB_PAY, text: "Quest Completed: Plate for the Perimeter · built silk-and-pitch plates · +120 XP, +$60.00, Ammo Crate, First Aid Kit" });
      return { reply: "Well, look at that. Tight as a drum, and not a spider died for it. Better than I'd have done with ten fingers. Sixty, and a crate from the reserve.", mood: "happy" };
    }
    if (t === C.hobbAfter && s.spiderQ === 99) {
      return { reply: after(p, "hobb", [
        "Not a spider over the wire since. Carla's named the plates. Don't ask me the names.",
        "Slept a whole night, butty. First in a month. Woke up sure something was wrong.",
        "The singing still comes. Plates don't stop that. Nothing does. Keep your lamp lit.",
      ]), mood: "calm" };
    }
  }

  if (npcId === "l8-ivo") {
    if (t === C.ivoStart && !s.karstQ) {
      if (repOf(s, "survivors") <= -35) return { reply: "The Society doesn't work with killers. Leave my desk alone.", mood: "angry" };
      const looped = (s.l8Loops ?? 0) >= 1;
      setKarstStep(ctx, p, looped ? 3 : 2, looped ? "Quest Started: The Karst Survey · You've already crawled the loop. Tell Ivo" : "Quest Started: The Karst Survey · Crawl the tight tube past Marker 78");
      return { reply: looped
        ? "You already crawled it? And came out under Marker 74? Then you have the reading already. Sit. Tell me everything."
        : "Th-thank you. The tight tube past Marker 78, back up the Road, near where you came in. When you come out somewhere you have already been, that is the loop. Do not panic. Dell did not panic. Then come and tell me what the compass did.", mood: "calm" };
    }
    if (t === C.ivoMath && (s.karstQ === 1 || s.karstQ === 2) && !s.karstSciFailed) {
      if (!check8(ctx, p, "science", 45, "Science")) {
        s.karstSciFailed = true;
        return { reply: "Your numbers are twelve degrees off. It is not your fault, the rock lies. You cannot do this one on paper. You have to crawl it.", mood: "annoyed" };
      }
      s.l8Loops = Math.max(1, s.l8Loops ?? 0);
      finishQuest8(ctx, p, "karst", { ...KARST_PAY, xp: 125, text: "Quest Completed: The Karst Survey · worked the loop out on paper · +125 XP, +$50.00, 2 Caver Batteries, Repair Kit" });
      return { reply: "You got the fold from the compass drift. Hang on. Dell wrote the same number in the margin. The same number. Here: batteries, the toolkit, the stipend. I am going to write her name on this map.", mood: "happy" };
    }
    if (t === C.ivoGive && s.karstQ && s.karstQ < 99) {
      if ((s.l8Loops ?? 0) < 1) return { reply: "You haven't hit the loop yet. The tight tube past Marker 78. You'll know it when you see the Face Rock twice.", mood: "calm" };
      finishQuest8(ctx, p, "karst", { ...KARST_PAY, xp: 110, text: "Quest Completed: The Karst Survey · +110 XP, +$50.00, 2 Caver Batteries, Repair Kit" });
      return { reply: "That's it. That's the second fold, exactly where Dell said it would be. Take the batteries and the toolkit from the trunk. I'm going to write her name on this map.", mood: "happy" };
    }
    if (t === C.ivoAfter && s.karstQ === 99) {
      return { reply: after(p, "ivo", [
        "Closed. Every passage. I wrote her name in the corner, small, the way she signed things. You are in the margin too. I h-hope that is alright.",
        "I have started on the Road itself now. It is very long. It is a very good problem.",
        "The compass still drifts twelve degrees by the crevice. I leave it. Some things should stay a little wrong.",
      ]), mood: "calm" };
    }
  }

  return null;
}
