// Level 11 "The Infinite City" - Quests & Objectives System
// Canon Wikidot lore quests:
// 1. "Spotlight on Sedco" (Courier / Vance / Sedco Spotlight AV Store & Subterranean Vault)
// 2. "The Paper Bird's Blessing" (Entity 14 Lucky Crane / Grand Canal Lock Valve / Trader Kael)
// 3. "Capital Infrastructure: The Night Shift" (Night Shift Janitor / Spontaneous Roadworks / Apartment Utilities)

import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, questStep, tellQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";

const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level11", id });

export const QUESTS = {
  sedco: {
    key: "sedcoQ",
    name: "Spotlight on Sedco",
    tips: {
      1: "Get into terminal SEDCO-SEC-01 on the desk outside Sedco Spotlight (log in, or hack it), then release the front door from its security panel.",
      2: "Inside Sedco, search the sales counter and review the camera feeds on the monitor wall.",
      3: "Reset the stage spotlight in the corner of the shop. Camera four is blind while it points at the lens.",
      4: "Open the Sedco crate in the vault under the 14th Street subway station and take the master drive.",
      5: "Bring the drive to the courier on the street by the canal, or to Specialist Vance at the Base Beta outpost.",
    },
    marks: { 1: MARK("l11-sedco-terminal"), 2: MARK("l11-sedco-int-counter"), 3: MARK("l11-sedco-int-spot-0"), 4: MARK("l11-vault-crate-sedco"), 5: MARK("l11-walker-1") },
    progress(s) {
      const n = s.sedcoQ;
      if (n === 2 && s.sedcoCounterChecked && !s.sedcoMonitorsChecked) return { step: "Review the camera feeds on Sedco's monitor wall.", mark: MARK("l11-sedco-int-monitors") };
      if (n === 2 && s.sedcoMonitorsChecked && !s.sedcoCounterChecked) return { step: "Search the sales counter for the CCTV instructions.", mark: MARK("l11-sedco-int-counter") };
      return { step: this.tips[n], mark: this.marks[n] ?? null };
    },
  },
  crane: {
    key: "craneQ",
    name: "The Paper Bird's Blessing",
    tips: {
      1: "Find the paper crane perched on the canal wall (or ask the Guild of Many in Level 6.1 for their barge waybill).",
      2: "Follow the canal walkway to the spillway valve station and free the jammed valve.",
      3: "Press the valve station again to draw a sample of the lock water.",
      4: "Bring the lock-water sample to Kael's stall at the market (with the Guild waybill from 6.1 if you have it).",
    },
    marks: { 1: MARK("l11-lucky-crane"), 2: MARK("l11-canal-pump"), 3: MARK("l11-canal-pump"), 4: MARK("l11-trader-kael") },
  },
  maint: {
    key: "maintQ",
    name: "Capital Infrastructure: The Night Shift",
    tips: {
      1: "Bleed the compressor at the roadworks on the west lane.",
      2: "Go into Apartment 11-B and bleed the radiator.",
      3: "In 11-B, run the kitchen tap and tune the radio to 104.2. The boiler keeps time by that station.",
      4: "Tell the janitor on his rounds that 11-B has heat and water again.",
    },
    marks: { 1: MARK("l11-roadwork-gen"), 2: MARK("l11-apt-radiator"), 3: MARK("l11-apt-sink"), 4: MARK("l11-walker-3") },
    progress(s) {
      const n = s.maintQ;
      if (n === 3 && s.aptTapTested && !s.aptRadioTested) return { step: "Tune the apartment radio to 104.2 FM.", mark: MARK("l11-apt-radio") };
      if (n === 3 && s.aptRadioTested && !s.aptTapTested) return { step: "Run the kitchen tap in Apartment 11-B.", mark: MARK("l11-apt-sink") };
      return { step: this.tips[n], mark: this.marks[n] ?? null };
    },
  },
};
// "The Lit Window" (Vance): the window entity in the alley eats whoever walks into it, unless they know Cmdr. Harris's
// ritual. Steps are journal text only (player.state.quests['the-lit-window']); know12 is the ritual (scripts/player.js,
// on hearing the "Matrix" tape), and walking through pays once (scripts/level12-window.js).
export const WINDOW = {
  id: "the-lit-window", name: "The Lit Window",
  tape: { step: "Take Cmdr. Harris's tape recorder, marked MATRIX, from the radio desk at the Base Beta outpost and play the tape on your HALOGEN to the end.", mark: MARK("l11-harris-log") },
  walk: { step: "Walk straight into the lit window in the alley with the green dumpster. Don't stop, don't look away.", mark: MARK("l11-win12") },
};
export function windowStep(s) {
  if (!s || s.qdone?.[WINDOW.id]) return;
  const w = s.know12 ? WINDOW.walk : WINDOW.tape;
  setQuest(s, WINDOW.id, { name: WINDOW.name, step: w.step, mark: w.mark });
}

function setStep(ctx, p, qKey, step, noteText) {
  const s = p?.state, q = QUESTS[qKey];
  if (!s || !q || (s[q.key] ?? 0) >= step) return;
  s[q.key] = step;
  questStep(s, q, step);
  tellQuest(ctx, p, noteText || `${q.name} · ${q.tips[step] ?? ""}`);
}
export const setSedcoStep = (ctx, p, step, noteText) => setStep(ctx, p, "sedco", step, noteText);
export const setCraneStep = (ctx, p, step, noteText) => setStep(ctx, p, "crane", step, noteText);
export const setMaintStep = (ctx, p, step, noteText) => setStep(ctx, p, "maint", step, noteText);

const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export function finishQuest(ctx, p, qKey, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "survivors" } = {}) {
  const s = p?.state;
  if (!s) return;
  const q = QUESTS[qKey];
  if (!q || s[q.key] === 99) return false; // paid once

  const b = BONUS(s, by), msgs = [];
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  s[q.key] = 99;
  questStep(s, q, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d, `Completed ${q.name}`);
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
  ctx.emit("milestone", { step: 1, name: `quest-${qKey}` }, { audience: { player: p.id } });
}

// Dialogue quest triggers & turn-ins
export function handleDialogueQuest(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase();
  const s = p?.state;
  if (!s || !npc) return null;
  const npcId = String(npc.id ?? "").split("/").pop();

  // B.N.T.G. Realty: Mara sells the green house; the price is said, then a yes buys it
  if (npcId === "l11-realty-agent") {
    const price = 250000, usd = "$2,500";
    if (s.home11 && /house|home|buy|key/.test(t)) return { reply: "It's yours already. Go rest. And move the keys out from under the mat.", mood: "happy" };
    const asked = s.homeAsk && ctx.now() - s.homeAsk < 120000;
    if (asked && /\b(yes|yeah|yep|deal|sure|ok|okay)\b|buy it|i'll take|sign/.test(t)) {
      s.homeAsk = 0;
      if ((s.cents ?? 0) < price) return { reply: `It's ${usd} and you've got $${((s.cents ?? 0) / 100).toFixed(2)}. Come back when the math works.`, mood: "neutral" };
      s.cents -= price; s.home11 = true;
      s.notice = { text: `You bought the green house for ${usd}. Rest at its front door any time.`, at: ctx.now() };
      ctx.emit("playSound", { clip: "cdn/sfx-cash-register-ka-ching-bell.mp3", volume: 0.8 }, { audience: { player: p.id } });
      return { reply: "Sold. Keys are under the mat. Terrible place for keys. Move them. Welcome home.", mood: "happy" };
    }
    if (/house|home|buy|property|place|green/.test(t)) {
      s.homeAsk = ctx.now();
      return { reply: `The green house down the street. Porch, two floors, a lock that actually works. ${usd}, cash. Want it?`, mood: "happy" };
    }
  }

  // ---- Spotlight on Sedco (the courier; Vance takes the drive too) ----
  if (npcId === "l11-walker-1") {
    if (t.includes("sedco manifest") && !s.sedcoQ) {
      if (repOf(s, "survivors") <= -35) return { reply: "Word on the avenue says you're trouble. Find your own work.", mood: "angry" };
      setSedcoStep(ctx, p, 1, "Quest Started: Spotlight on Sedco · Get into terminal SEDCO-SEC-01 outside the shop");
      return { reply: "Okay, here's the deal, chief. Sedco's night alarm tripped on camera four and the whole shop time-locked, vault and all, with a week of my signed manifests inside. No manifests, no pay. Get in, blind camera four so it doesn't trip again, and pull the master drive from the vault under 14th Street. Whatever cash is down there, we split it down the middle.", mood: "happy" };
    }
    if (t.includes("night password") && s.sedcoQ === 1 && !s.sedcoPwAsk) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 30 });
      s.sedcoPwAsk = c.ok ? 1 : -1;
      if (c.ok) return { reply: "You didn't hear it from me. 'Spotlight.' All lower case. The night guy wrote it on a sticky note on the desk anyway. Some security.", mood: "happy" };
      return { reply: "Chief, I carry boxes. I don't carry passwords. Figure the terminal out yourself. Hacking's a thing, right?", mood: "calm" };
    }
    if (t.includes("master security drive") && s.sedcoQ === 5) {
      if (t.includes("sixty-forty") && !s.sedcoHaggle) {
        const c = rollCheck(ctx, s, { skill: "speech", difficulty: 45 });
        s.sedcoHaggle = c.ok ? 1 : -1;
        if (!c.ok) return { reply: "Sixty-forty? I found the job, chief. Half. Take it or keep the drive and explain it to Sedco yourself.", mood: "annoyed" };
      }
      const cents = s.sedcoHaggle === 1 ? 10500 : 7500;
      s.sedcoTo = "courier";
      finishQuest(ctx, p, "sedco", {
        xp: 120, cents, items: ["firstaid", "kit"], by: "survivors", rep: [["survivors", 8], ["bntg", 6]],
        text: `Quest Completed: Spotlight on Sedco · Split the vault with the courier (+120 XP, +$${(cents / 100).toFixed(2)})`,
      });
      return s.sedcoHaggle === 1
        ? { reply: "Sixty-forty. Fine. You did crawl into a vault for me. A hundred and five, and the two kits. If management asks, I ran the route myself and you were never here.", mood: "happy" }
        : { reply: "That's the one. Under the parcels it goes. Seventy-five, your half, and the two kits I swiped off the depot shelf. If management asks, I ran the route myself.", mood: "happy" };
    }
    if (t.includes("any trouble from sedco") && s.sedcoQ === 99) {
      return s.sedcoTo === "vance"
        ? { reply: "You gave it to the uniforms. My manifests are in an evidence box at Beta now. Thanks a lot, chief. No, really. They're paying me hazard rate until they give them back.", mood: "annoyed" }
        : { reply: "Sedco reopened the next morning like nothing happened. New guard, same sticky note. My manifests are signed and I got paid. Best week I've had in this city.", mood: "happy" };
    }
  }
  if (npcId === "l11-meg-agent-vance") {
    if (t.includes("master security drive") && s.sedcoQ === 5) {
      s.sedcoTo = "vance";
      finishQuest(ctx, p, "sedco", {
        xp: 135, cents: 6000, items: ["firstaid", "kit", "ammo"], by: "meg", rep: [["meg", 12], ["karma", 3]],
        text: "Quest Completed: Spotlight on Sedco · Turned the drive over to M.E.G. Base Beta (+135 XP, +$60.00)",
      });
      return { reply: "Sedco's camera four looks down the 14th Street platform, citizen. Past the dead train there's a service tunnel nobody on our roster has walked out of. Beta's wanted that footage for weeks. Bounty's approved. Sixty, a med kit, tools and a box of rounds.", mood: "happy" };
    }
    if (t.includes("what did beta find on the drive") && s.sedcoQ === 99 && s.sedcoTo === "vance") {
      return { reply: "Three nights of the platform. Something in a work coat walks out of that tunnel at two in the morning, stands by the train, walks back. Same route, same minute, every night. It moves like it's still on shift. Stay off the platform after midnight.", mood: "calm" };
    }
    // ---- The Lit Window ----
    if (t.includes("don't look in that window") && !s.quests?.[WINDOW.id] && !s.qdone?.[WINDOW.id]) {
      windowStep(s);
      tellQuest(ctx, p, `Quest Started: The Lit Window · ${s.know12 ? "Walk into the lit window in the alley" : "Find Cmdr. Harris's MATRIX tape at the outpost"}`);
      return s.know12
        ? { reply: "You've heard Harris's tape already. Then you know more than I do. Go on. Straight in, no flinching. I'll log you as on patrol.", mood: "calm" }
        : { reply: "Harris's recorder is on the radio desk here at the outpost. Take it. Play the whole tape before you go near that alley. If it tells you something different from me, believe the tape.", mood: "calm" };
    }
    if (t.includes("what did harris say") && s.quests?.[WINDOW.id] && !s.know12 && !s.vanceWinAsk) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 35 });
      s.vanceWinAsk = c.ok ? 1 : -1;
      if (!c.ok) return { reply: "I'm not putting a dead man's words in your mouth, citizen. Play the tape.", mood: "calm" };
      s.know12 = true; s.u12At = ctx.now(); windowStep(s);
      tellQuest(ctx, p, "The Lit Window · Vance told you Harris's way through · Walk into the lit window in the alley");
      return { reply: "Fine. Off the record. Harris said it lets you in if you walk at it like you live there. No stopping, no looking away, no hand out to feel for the glass. Everyone it kills hesitates at the sill. Don't hesitate.", mood: "calm" };
    }
    if (t.includes("walked through that window") && s.qdone?.[WINDOW.id]) {
      return { reply: "And came back. Harris did too. Neither of you blinks enough afterward. I've written it in the log. Don't make me write it twice.", mood: "calm" };
    }
  }

  // ---- The Paper Bird's Blessing (Kael <-> Level 6.1 Guild barge) ----
  if (npcId === "l11-trader-kael") {
    if (t.includes("wrong with the canal") && !s.craneQ) {
      if (repOf(s, "bntg") <= -35) return { reply: "The B.N.T.G.'s got your name on a blacklist, boss. Step away from my stall.", mood: "angry" };
      setCraneStep(ctx, p, 1, "Quest Started: The Paper Bird's Blessing · Find the paper crane on the canal wall");
      return { reply: "Spillway valve's jammed, boss, so the lock won't fill, and the Guild of Many barge from Level 6.1 is sitting outside it with my coffee on board. The pilot won't bring her in till someone draws a sample proving the lock water's still almond water — and checking in with the Guild back through the glass doors speeds up customs too. Canal folk say the paper crane on the wall roosts by whatever's broken.", mood: "calm" };
    }
    if ((t.includes("cleared the canal lock") || t.includes("customs waybill from 6.1")) && s.craneQ === 4) {
      const guildClear = t.includes("customs waybill from 6.1") && !!s.craneWaybill;
      if (t.includes("cut of the cargo") && !s.kaelHaggle) {
        const c = rollCheck(ctx, s, { skill: "barter", difficulty: 40 });
        s.kaelHaggle = c.ok ? 1 : -1;
        if (!c.ok) return { reply: "A cut? Boss, that coffee's spoken for three times over. Forty, as agreed, and the provisions. Hand me the sample.", mood: "annoyed" };
      }
      if (guildClear) s.craneGuildClear = 1;
      const cents = guildClear ? 7500 : s.kaelHaggle === 1 ? 6500 : 4000;
      finishQuest(ctx, p, "crane", {
        xp: guildClear ? 130 : 95, cents, items: ["ration", "almond", "almond"], by: "bntg",
        rep: [["bntg", 10], ["survivors", guildClear ? 10 : 4], ["karma", guildClear ? 4 : 2]],
        text: `Quest Completed: The Paper Bird's Blessing${guildClear ? " (Joint Guild Customs)" : ""} · +${guildClear ? 130 : 95} XP, +$${(cents / 100).toFixed(2)}, Fresh Provisions`,
      });
      if (guildClear) {
        return { reply: "Signed straight from the Guild chronicler in 6.1? That cuts an hour off pier tallying! Hear the lock filling? Seventy-five, rations, sealed bottles — and tell the Guild in 6.1 their customs dividend is open whenever you head back through.", mood: "happy" };
      }
      return s.kaelHaggle === 1
        ? { reply: "Hear the lock filling? Fine, fine, a cut. Sixty-five, the rations and two sealed bottles. You'd make a good Guild trader, boss. That's not a compliment.", mood: "happy" }
        : { reply: "Clear as tap water. Hear the lock filling? That's our barge. Forty, the rations and two sealed bottles. First pot of coffee off her is yours.", mood: "happy" };
    }
    if (t.includes("barge come in all right") && s.craneQ === 99) {
      return s.craneGuildClear
        ? { reply: "Docked clean on the first tide, customs stamped at both piers. Coffee, batteries, and the Guild even tucked an extra crate under Sal's label for the Snackrooms. The paper crane vanished the moment the lock topped out.", mood: "happy" }
        : { reply: "Came in Tuesday. Or what passes for Tuesday. Coffee, batteries, and a crate of something the pilot wouldn't name. The paper crane left the wall the morning the lock filled. Nobody's seen it since. I miss it, boss. Bad for business, missing things.", mood: "calm" };
    }
  }

  // ---- Capital Infrastructure: The Night Shift (the janitor) ----
  if (npcId === "l11-walker-3") {
    if (t.includes("maintenance rounds") && !s.maintQ) {
      if (repOf(s, "survivors") <= -35) return { reply: "I don't want you near my steam lines. Move along.", mood: "angry" };
      setMaintStep(ctx, p, 1, "Quest Started: The Night Shift · Bleed the compressor at the west-lane roadworks");
      return { reply: "City dropped a roadworks on the west lane overnight and tied its compressor into the steam main, so it's whistling like a kettle. Bleed it before it blows. Then 11-B: the tenant's had no heat for three nights. Bleed the radiator, run the tap, and put the radio on 104.2. The boiler keeps time off that station. Off the station, it thinks it's always midnight.", mood: "calm" };
    }
    if (t.includes("apartment 11-b has hot water") && s.maintQ === 4) {
      finishQuest(ctx, p, "maint", {
        xp: 90, cents: 3500, items: ["kit", "battery"], by: "survivors", rep: [["survivors", 8], ["karma", 2]],
        text: "Quest Completed: Capital Infrastructure · +90 XP, +$35.00, Repair Kit, Battery",
      });
      return s.maintBurned
        ? { reply: "Got scalded on that compressor, didn't you? I can see it on your hand. Still, Eleventh's back in the green. Thirty-five, a repair kit and a battery. Next time, wrap a rag round the valve.", mood: "happy" }
        : { reply: "Clean bleed, too. I heard it from three blocks. Eleventh's back in the green and 11-B's off my call sheet. Thirty-five, a repair kit and a battery. Get inside before the streetlights go down.", mood: "happy" };
    }
    if (t.includes("11-b still warm") && s.maintQ === 99) {
      return { reply: "Warm as toast. The tenant left a note on my cart. 'Thank you.' Just that. Nobody's ever thanked the night shift. City put another roadworks on Fourth since. Course it did.", mood: "calm" };
    }
  }

  return null;
}

// what the talk card offers (scripts/lib/npc-starters.js questChoices); handleDialogueQuest above answers each one
export function l11Choices(id, s) {
  const out = [], surv = repOf(s, "survivors") > -35;
  if (id === "l11-walker-1") {
    const q = s?.sedcoQ ?? 0;
    if (!q && surv) out.push({ text: "That's a lot of parcels. Need a hand with a Sedco manifest?", tag: "Quest Start" });
    if (q === 1 && !s?.sedcoPwAsk) out.push({ text: "You've run Sedco parcels for months. You know the night password.", tag: "Speech 30" });
    if (q === 5) {
      out.push({ text: "Got it. The master security drive, out of the vault.", tag: "Quest Turn-In" });
      if (!s?.sedcoHaggle) out.push({ text: "Here's the master security drive. I did the crawling, so it's sixty-forty.", tag: "Speech 45" });
    }
    if (q === 99) out.push({ text: "Any trouble from Sedco since?", tag: "Talk" });
  } else if (id === "l11-meg-agent-vance") {
    const q = s?.sedcoQ ?? 0;
    if (q === 5) out.push({ text: "I pulled the master security drive out of Sedco's vault. Want it?", tag: "Quest Turn-In" });
    if (q === 99 && s?.sedcoTo === "vance") out.push({ text: "What did Beta find on the drive?", tag: "Talk" });
    if (!s?.quests?.[WINDOW.id] && !s?.qdone?.[WINDOW.id]) out.push({ text: "You said don't look in that window. What is it?", tag: "Quest Start" });
    if (s?.quests?.[WINDOW.id] && !s?.know12 && !s?.vanceWinAsk) out.push({ text: "You've heard the tape. What did Harris say?", tag: "Speech 35" });
    if (s?.qdone?.[WINDOW.id]) out.push({ text: "I walked through that window. And back.", tag: "Talk" });
  } else if (id === "l11-trader-kael") {
    const q = s?.craneQ ?? 0;
    if (!q && repOf(s, "bntg") > -35) out.push({ text: "Docks are dead quiet. Something wrong with the canal?", tag: "Quest Start" });
    if (q === 4) {
      if (s?.craneWaybill) out.push({ text: "I brought the Guild of Many's customs waybill from 6.1 and cleared the canal lock.", tag: "Quest Turn-In" });
      else out.push({ text: "Valve's free. I cleared the canal lock myself.", tag: "Quest Turn-In" });
      if (!s?.kaelHaggle && !s?.craneWaybill) out.push({ text: "I cleared the canal lock. I want a cut of the cargo.", tag: "Barter 40" });
    }
    if (q === 99) out.push({ text: "Did the barge come in all right?", tag: "Talk" });
  } else if (id === "l11-walker-3") {
    const q = s?.maintQ ?? 0;
    if (!q && surv) out.push({ text: "Rough night on the maintenance rounds?", tag: "Quest Start" });
    if (q === 4) out.push({ text: "Pressure's bled, and apartment 11-B has hot water again.", tag: "Quest Turn-In" });
    if (q === 99) out.push({ text: "Is 11-B still warm?", tag: "Talk" });
  }
  return out;
}
