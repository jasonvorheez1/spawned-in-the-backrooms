// Level 6.1 ("The Snackrooms") cross-level quests & rewritten Snackrooms hooks.
// Anchors four Level 6.1 crews to surrounding levels and integrates with Level 11's "The Paper Bird's Blessing":
//   1. "Coat of Red, Bus to Nowhere" (Wren / Camp Amber -> Level 11 bus route -> The Hub Camp Amber -> Level 6.1)
//   2. "Sealed 6.1-02: No Candles Allowed" (M.E.G. Guard -> Stockroom Seal 6.1-02 -> Level 3 Vent -> Base Gamma Vale [opt. Level 6 Relay] -> Level 6.1)
//   3. "Four Hundred and Thirteen" (Guild of Many -> Level 3 Suction Grille -> Level 4 Vending / Base Omega -> Guild or M.E.G. in Level 6.1)
//   4. "Two Menus Short" (Sal at Burger Bop -> Level 10 Outpost Bountiful Wren -> Level 11 Kael -> Level 6.1)
//   5. Cross-level Guild customs & spillway clearance for Level 11's "The Paper Bird's Blessing" (craneQ).

import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { setQuest, questStep, tellQuest, claimReward } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";

const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const M61 = (id) => ({ place: "level61", id });
const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

export const QUESTS61 = {
  bee: {
    key: "l61BeeQ",
    name: "Coat of Red, Bus to Nowhere",
    tips: {
      1: "Search the 11th Avenue crossing bus bench in Level 11 for traces of Bee's red coat, or ask the commuters nearby.",
      2: "Follow Bee's Hub transfer ticket through the tunnels to Camp Amber in The Hub and ask Jo or Pip.",
      3: "Bring word of Bee back to Wren at Camp Amber in Level 6.1.",
    },
    marks: {
      1: { place: "level11", id: "l11-bee-clue" },
      2: { place: "thehub", id: "hub-amber-jo" },
      3: M61("l61-amber-a"),
    },
  },
  seal: {
    key: "l61SealQ",
    name: "Sealed 6.1-02: No Candles Allowed",
    tips: {
      1: "Go through the back service door and inspect M.E.G. Seal 6.1-02 ('PARTY ROOM') at the end of the Level 6.1 Stockroom.",
      2: "Take the east suction vent to Level 3 and consult Scanner Tech Vale inside Base Gamma (bring NVG to pull Level 6's relay tape along the way if you can).",
      3: "Return to the M.E.G. Guard at the Level 6 checkpoint in Level 6.1 (or clamp Vale's dampener onto Seal 6.1-02 in the Stockroom first).",
    },
    marks: {
      1: M61("l61-service-sealed"),
      2: { place: "gamma", id: "gamma-vale" },
      3: M61("l61-guard-a"),
    },
  },
  guild: {
    key: "l61GuildQ",
    name: "Four Hundred and Thirteen",
    tips: {
      1: "Take the east suction vent out of Level 6.1 and inspect the Guild chalk plate under the Level 3 arrival grille.",
      2: "Take the lift from Level 3 up to Level 4, test a break-room vending machine (or ask Sgt. Okafor at Base Omega) to log the one-way drop into Level 6.1.",
      3: "Bring the completed survey back to the Guild of Many in Level 6.1 — or hand the unguarded vent telemetry to the M.E.G. Guard.",
    },
    marks: {
      1: { place: "level3", id: "l3-guild-plate" },
      2: { place: "level4", id: "omega-okafor" },
      3: M61("l61-guild-a"),
    },
  },
  sal: {
    key: "l61SalQ",
    name: "Two Menus Short",
    tips: {
      1: "Go out the east glass doors to Level 11 and follow Farm Road south to Level 10. Trade with Wren at Outpost Bountiful for stone-ground flour.",
      2: "On your way back through Level 11, pick up a tin of real roasted coffee from Trader Kael's market stall.",
      3: "Carry the Level 10 flour and Level 11 coffee back through the glass doors to Sal at Burger Bop in Level 6.1.",
    },
    marks: {
      1: { place: "level10", id: "l10-meg-wren" },
      2: { place: "level11", id: "l11-trader-kael" },
      3: M61("l61-sal"),
    },
  },
};

export function setStep61(ctx, p, qKey, step, noteText) {
  const s = p?.state, q = QUESTS61[qKey];
  if (!s || !q || (s[q.key] ?? 0) >= step) return false;
  s[q.key] = step;
  questStep(s, q, step);
  tellQuest(ctx, p, noteText || `${q.name} · ${q.tips[step] ?? ""}`);
  return true;
}

export function finishQuest61(ctx, p, qKey, { xp = 140, cents = 5000, items = [], text = "", rep = [], by = "survivors" } = {}) {
  const s = p?.state, q = QUESTS61[qKey];
  if (!s || !q || s[q.key] === 99) return false;
  const b = BONUS(s, by), msgs = [];
  if (b && cents) {
    const extra = Math.round(cents * b);
    cents += extra;
    msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`);
  }
  s[q.key] = 99;
  questStep(s, q, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d, `Completed ${q.name}`);
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
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: `QUEST COMPLETED: ${q.name.toUpperCase()}`, color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
  ctx.emit("milestone", { step: 1, name: `quest-${qKey}` }, { audience: { player: p.id } });
  return true;
}

const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const hasQuest = (s, k) => (s?.[k] ?? 0) > 0 && s[k] < 99;

export function handleDialogueQuest61(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const id = short(npc);

  // ---- 1. Coat of Red, Bus to Nowhere (Wren / Camp Amber -> Level 11 -> The Hub -> Level 6.1) ----
  if (id === "l61-amber-a") {
    const q = s.l61BeeQ ?? 0;
    if ((t.includes("looking for bee") || t.includes("named bee")) && !q) {
      if (repOf(s, "amber") <= -35) return { reply: "Sorry, honey. Camp Amber keeps our missing board closed to folks who've made trouble with us.", mood: "sad" };
      setStep61(ctx, p, "bee", 1, "Quest Started: Coat of Red, Bus to Nowhere · Search the 11th Ave crossing in Level 11 for Bee");
      return { reply: "Her partner pinned that card three sleeps back. Bright red wool coat, tall, came off the 8:15 bus route out through the glass doors onto 11th Avenue. Nobody's seen her since. Check the crossing bench out there, or ask the commuters, then bring word straight back here.", mood: "calm" };
    }
    if (t.includes("word on bee") && q === 3 && s.l61BeeSafe) {
      const med = !!s.l61BeeMed;
      finishQuest61(ctx, p, "bee", {
        xp: med ? 170 : 140,
        cents: med ? 6000 : 4500,
        items: med ? ["firstaid", "firstaid", "bandage"] : ["firstaid", "almond"],
        by: "amber",
        rep: [["amber", med ? 15 : 12], ["survivors", med ? 6 : 4], ["karma", med ? 5 : 3]],
        text: `Quest Completed: Coat of Red, Bus to Nowhere · Bee is safe at Camp Amber in the Hub (+${med ? 170 : 140} XP, +$${med ? "60.00" : "45.00"})`,
      });
      return med
        ? { reply: "She made it through the tenth tunnel and Jo got those frostbitten fingers wrapped in time? Bless you, sweetie. I'll pull her card off the board right now and tuck Jo's note under the thermos. Take the good kits and sixty for the miles.", mood: "happy" }
        : { reply: "She's pouring kettle water for Jo at the Hub camp? Oh, thank goodness. Half the cards on this corkboard never come down. I'll cross her off tonight and leave her pin with our kit. Forty-five and a spare aid pack — you earned it.", mood: "happy" };
    }
    if (t.includes("bee settling in") && q === 99) {
      return { reply: "Jo sent a tally slip back down the line with an orange-jacket runner: Bee swapped shifts with Pip twice already and refused to let anyone throw out her torn red sleeve. We kept the pin on the corkboard for luck.", mood: "happy" };
    }
  }
  if (id === "l11-commuter-faceling" && s.l61BeeQ === 1 && t.includes("red wool coat")) {
    if (t.includes("remember which tunnel")) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 30 });
      if (!c.ok) return { reply: "Oh, so many coats at eight fifteen. Red ones, grey ones. Perhaps check by the corner bench where people tie their boots.", mood: "calm" };
      s.l61BeeClue = 1;
      setStep61(ctx, p, "bee", 2, "Coat of Red · The commuter pointed you toward Camp Amber in The Hub");
      return { reply: "Why yes! She adjusted a torn cuff on the corner bench and asked which avenue met the tenth tunnel to Camp Amber in the Hub. A bright coat like that stays in one's paper.", mood: "happy" };
    }
    return { reply: "Tall lady in red? Dropped a stitched cuff over by the corner crossing bench before she crossed toward the parkway.", mood: "calm" };
  }
  if ((id === "hub-amber-jo" || id === "hub-amber-pip") && s.l61BeeQ === 2) {
    if (t.includes("red coat from 6.1") || t.includes("frostbite from the tenth tunnel")) {
      if (t.includes("frostbite")) {
        const c = rollCheck(ctx, s, { skill: "medicine", difficulty: 35 });
        if (!c.ok) return { reply: "Kind of you to look at her hands, pilgrim, but don't wrap them tighter unless you know cold-burn dressing.", mood: "calm" };
        s.l61BeeMed = 1;
      }
      s.l61BeeSafe = 1;
      setStep61(ctx, p, "bee", 3, "Coat of Red · Bee is safe at Camp Amber in The Hub · Tell Wren in Level 6.1");
      return s.l61BeeMed
        ? { reply: "Good hands, pilgrim — warm saline, loose gauze, no rubbing. Bee's asleep by the stove now in a dry parka. Tell Wren in 6.1 she's off the road and keeping both feet warm.", mood: "happy" }
        : { reply: "Bee? Aye, she walked out of the tenth tunnel three nights ago wearing half a red sleeve. Traded it for a dry wool parka and took the second kettle shift. Tell Wren in 6.1 we've got her — safe and stubborn.", mood: "happy" };
    }
  }
  if ((id === "hub-amber-jo" || id === "hub-amber-pip") && s.l61BeeQ === 99 && t.includes("how's bee doing")) {
    return { reply: "Still brewing tea stronger than radiator rust. Wren sent her three cans of peaches through the traders. Tells everyone she likes the quiet here better than the neon.", mood: "happy" };
  }

  // ---- 2. Sealed 6.1-02: No Candles Allowed (M.E.G. Guard -> Seal 6.1-02 -> Level 6/Gamma Vale -> Level 6.1) ----
  if (id === "l61-guard-a" || id === "l61-guard-b") {
    const q = s.l61SealQ ?? 0;
    if (t.includes("seal 6.1-02") && !q && id === "l61-guard-a") {
      if (repOf(s, "meg") <= -35) return { reply: "Check your standing, walker. M.E.G. doesn't put hostile eyes behind our Stockroom seals.", mood: "angry" };
      setStep61(ctx, p, "seal", 1, "Quest Started: Sealed 6.1-02 · Inspect the Party Room seal behind the back service door");
      return { reply: "That plywood job at the north end of the Stockroom? Bolted it two weeks ago after someone reported birthday music behind the drywall at 03:14. Go put an ear to the inspection tag, then crawl the east suction vent down to Level 3 and have Vale at Base Gamma's scanner read the frequency. Grab the relay tape through the Level 6 door too if you've got night vision.", mood: "calm" };
    }
    if (t.includes("diagnostics on seal 6.1-02") && q === 3 && s.l61SealRuling) {
      const best = s.l61SealRuling === "verified" || !!s.l61SealClamped;
      finishQuest61(ctx, p, "seal", {
        xp: best ? 185 : 145,
        cents: best ? 8000 : 5500,
        items: best ? ["battery", "battery", "ammo", "kit"] : ["battery", "ammo"],
        by: "meg",
        rep: [["meg", best ? 15 : 10], ...(best ? [["karma", 3]] : [])],
        text: `Quest Completed: Sealed 6.1-02 (${best ? "Verified Harmonic Clear" : "Caution Protocol"}) · +${best ? 185 : 145} XP, +$${best ? "80.00" : "55.00"}`,
      });
      return best
        ? { reply: "Flooded relay bleed off Level 6's wire — and you already clamped Vale's harmonic dampener onto the studs? Best news I've logged all shift. That beats swinging at cake hallucinations at three in the morning. Eighty bucks, cells, rounds, and a kit from the locker.", mood: "happy" }
        : { reply: "Gamma flagged it caution-only until someone walks the Level 6 relay side, huh? Fair enough — Vale's clamp spec goes straight into the shift binder. Fifty-five, a spare cell, and a box of rounds. Keep your eyes off that drywall after three.", mood: "calm" };
    }
    if (t.includes("seal 6.1-02 staying quiet") && q === 99) {
      return s.l61SealRuling === "verified" || s.l61SealClamped
        ? { reply: "Dead silent at 03:14 for three nights running. Only sound back there is the overflow vending machines clunking in their sleep.", mood: "happy" }
        : { reply: "Still hums faint around three in the morning, but the bolts haven't shifted a millimeter since we doubled the timber braces.", mood: "calm" };
    }
  }
  if (id === "gamma-vale" && s.l61SealQ === 2) {
    if (t.includes("harmonic") || t.includes("relay tape from level 6") || t.includes("readings from seal 6.1-02")) {
      if (t.includes("harmonic")) {
        const c = rollCheck(ctx, s, { skill: "science", difficulty: 40 });
        if (!c.ok) return { reply: "Steady on — your chalkboard scribble's missing half the phase curve. Either walk through the Level 6 checkpoint for Relay 6-A's actual tape, or take my standard caution dampener.", mood: "calm" };
        s.l61SealRuling = "verified";
      } else if (t.includes("relay tape") && s.l61RelayTape) {
        s.l61SealRuling = "verified";
      } else {
        s.l61SealRuling = "caution";
      }
      setStep61(ctx, p, "seal", 3, "Sealed 6.1-02 · Return Vale's dampener ruling to the M.E.G. Guard in Level 6.1");
      return s.l61SealRuling === "verified"
        ? { reply: "Aha! Look at that waveform — 60-hertz ballast buzz modulated by a wet transformer loop off Level 6's wire, not a Partygoer breach at all. Take this frequency dampener clamp back to 6.1; bolt it onto Seal 6.1-02 or hand it straight to the post guard.", mood: "happy" }
        : { reply: "No relay blackbox to cross-check? Grand, I'll mark it 'Caution — Acoustic Anomaly' and lend you a spare harmonic bolt anyway. Tell the Level 6 door guard to double-brace 6.1-02 unless someone grabs the Level 6 tape.", mood: "calm" };
    }
  }
  if (id === "gamma-vale" && s.l61SealQ === 99 && t.includes("seal 6.1-02")) {
    return { reply: "Still holding! Funny how half the ghosts in the Backrooms turn out to be wet conduit and bad plywood once you put a meter on them. Half, anyway.", mood: "happy" };
  }

  // ---- 3. Four Hundred and Thirteen (Guild of Many -> Level 3 Grille -> Level 4 Vending/Omega -> Guild or M.E.G.) ----
  if (id === "l61-guild-a") {
    const q = s.l61GuildQ ?? 0;
    if (t.includes("page 413") && !q) {
      if (repOf(s, "survivors") <= -35) return { reply: "The road remembers who broke faith with wanderers, traveller. Walk awhile elsewhere.", mood: "angry" };
      setStep61(ctx, p, "guild", 1, "Quest Started: Four Hundred and Thirteen · Climb through the east suction vent and inspect the Level 3 grille plate");
      return { reply: "Four hundred and twelve thresholds fill the Book, yet two beside this very kitchen stay rumors. Go down the east suction vent to Level 3 and touch the Guild chalk plate beneath the grille. Then ride the lift to Level 4 to record how its office vending drop spills wanderers through our stock wall. Return with truth, not guesswork.", mood: "calm" };
    }
    if ((t.includes("book of ways: page 413") || t.includes("mark b4 one-way")) && q === 3) {
      let hazard = false;
      if (t.includes("mark b4 one-way")) {
        const c = rollCheck(ctx, s, { skill: "survival", difficulty: 40 });
        if (!c.ok) return { reply: "Your ink shakes, traveller. Tell us simply what you saw at the Level 3 grille and the office machines.", mood: "calm" };
        hazard = true;
      }
      s.l61GuildTo = hazard ? "guild-warn" : "guild";
      finishQuest61(ctx, p, "guild", {
        xp: hazard ? 180 : 150,
        cents: hazard ? 7500 : 5500,
        items: hazard ? ["royal_ration", "battery", "almond"] : ["almond", "battery", "ration"],
        by: "survivors",
        rep: [["survivors", hazard ? 12 : 10], ...(hazard ? [["amber", 5]] : []), ["karma", hazard ? 5 : 3]],
        text: `Quest Completed: Four Hundred and Thirteen (${hazard ? "Marked Hazard Route" : "Guild Archive"}) · +${hazard ? 180 : 150} XP, +$${hazard ? "75.00" : "55.00"}`,
      });
      return hazard
        ? { reply: "Red ink for one-way glass — a mercy for every hungry soul in Level 4's break room. Page 413 enters the Book, and Camp Amber will carry copies to the hubs. Take our reserve ration and seventy-five.", mood: "happy" }
        : { reply: "Level 3 suction below, Level 4 glass above. Page 413 is dry and bound. Dina once tore margins from pages just like this; we will copy it twice so nothing is lost. Fifty-five and travel stores, traveller.", mood: "happy" };
    }
    if (t.includes("413 holding up") && q === 99) {
      return s.l61GuildTo === "meg"
        ? { reply: "The M.E.G. welded mesh across half the intake louvres after you sold our draft. More locks never shortened the road, traveller.", mood: "annoyed" }
        : { reply: "Three newcomers carried our Page 413 slip out through the vent this week alone without losing a boot. The Book grows truer by one leaf.", mood: "happy" };
    }

    // Rewritten "The Paper Bird's Blessing" (craneQ) cross-level Guild customs & spillway clearance!
    if (hasQuest(s, "craneQ") && (t.includes("kael says your barge") || t.includes("spillway head")) && !s.craneWaybill) {
      s.craneWaybill = 1;
      if (t.includes("spillway head")) {
        const c = rollCheck(ctx, s, { skill: "science", difficulty: 35 });
        if (c.ok) s.craneSci = 1;
      }
      return { reply: s.craneSci
        ? "Aha, Kael's coffee barge! The pilot won't risk dirty water in the lock. Take our signed Guild Barge Waybill back through the glass doors — and note the canal gate builds vacuum behind folded paper. Ease the bypass bleed before forcing the wheel."
        : "That's our barge waiting outside Kael's canal lock. Carry this stamped Guild Barge Waybill back to Trader Kael on Level 11 so both piers can unload once the almond water runs clear.", mood: "happy" };
    }
    if (s.craneQ === 99 && s.craneGuildClear && !s.craneGuildPaid && t.includes("customs waybill cleared") && claimReward(s, "crane-guild-bonus")) {
      s.craneGuildPaid = 1;
      s.payout = { xp: 45, items: ["almond", "battery", "ration"], text: "Guild Barge Dividend: +45 XP · Almond Water, Battery, Ration" };
      addRep(s, "survivors", 4, "Cleared Guild barge customs between Level 6.1 and Level 11");
      return { reply: "Word already reached the glass doors: our barge docked with every sack of beans dry. Kael isn't the only trader who keeps his books — take a pilgrim dividend from the forward crate.", mood: "happy" };
    }
  }
  if (id === "l61-guard-a" && s.l61GuildQ === 3 && t.includes("unguarded vent telemetry")) {
    s.l61GuildTo = "meg";
    finishQuest61(ctx, p, "guild", {
      xp: 160,
      cents: 9000,
      items: ["ammo", "firstaid"],
      by: "meg",
      rep: [["meg", 12], ["survivors", -4], ["karma", -3]],
      text: "Quest Completed: Four Hundred and Thirteen · Sold route telemetry to M.E.G. (+160 XP, +$90.00)",
    });
    return { reply: "Exact coordinates on the Level 3 vent and which break-room machines spill people in here? Better in M.E.G. lockboxes than scribbled on Guild napkins. Ninety bucks, rounds, and a kit. Watch how the pilgrims look at you.", mood: "calm" };
  }
  if (id === "omega-okafor" && s.l61GuildQ === 2 && (t.includes("vending drop into 6.1") || t.includes("telemetry from base omega"))) {
    if (t.includes("telemetry")) {
      const c = rollCheck(ctx, s, { skill: "science", difficulty: 35 });
      if (!c.ok) return { reply: "Omega doesn't hand sensor printouts to someone waving a chalk notebook. Go hit a break-room machine in the south hall yourself if you want field proof.", mood: "annoyed" };
    } else {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 30 });
      if (!c.ok) return { reply: "Lost two runners pressed B4 hungry last month. Unless you buy a bar from those break-room machines yourself, I've got perimeter work.", mood: "calm" };
    }
    s.l61VendSurvey = 1;
    setStep61(ctx, p, "guild", 3, "Four Hundred and Thirteen · Logged Level 4's B4 drop · Return to Level 6.1 (Guild or M.E.G.)");
    return { reply: "Six disappearances logged at the south break room, all pressing B4. Only three ever walked back up through Level 3's lift to say they landed beside a Snackrooms stock bench. Stamp your page and get off Omega's carpet.", mood: "calm" };
  }

  // ---- 4. Two Menus Short (Sal -> Level 10 Wren -> Level 11 Kael -> Level 6.1) ----
  if (id === "l61-sal") {
    const q = s.l61SalQ ?? 0;
    if (t.includes("real supplies") && !q) {
      if (repOf(s, "survivors") <= -35) return { reply: "Facelings might wipe down your booth, kid, but my kitchen isn't hiring someone the camps don't trust.", mood: "angry" };
      const fastWarm = (s.l61TraysReturned ?? 0) >= 2;
      setStep61(ctx, p, "sal", 1, "Quest Started: Two Menus Short · Head through Level 11 out Farm Road to Level 10 and trade Wren for flour");
      return { reply: (fastWarm ? "You actually bused your trays, kid — that puts you ahead of ninety percent of the room. " : "") + "Here's the secret: the facelings can press patties forever, but real stone-ground flour has to come up Farm Road from Level 10's Outpost Bountiful, and real roasted coffee sits at Trader Kael's stall in Level 11. Grab one sack from Wren on the farm, swing by Kael on the way back, and bring them to my counter.", mood: "happy" };
    }
    if (t.includes("bus your tray") && (s.l61TraysReturned ?? 0) >= 1 && !s.l61TrayBonus && claimReward(s, "l61-tray-master")) {
      s.l61TrayBonus = 1;
      s.payout = { xp: 25, items: ["burger", "coke"], text: "Sal's Counter Regular: +25 XP · Cheeseburger & Coca-Cola" };
      return { reply: "See? You stack a plastic tray like a civil human being and the whole kitchen puts extra pickles on yours. Here — one off the hot plate, and don't tell the Liquorette.", mood: "happy" };
    }
    if ((t.includes("flour and coffee") || (t.includes("flour") && t.includes("coffee"))) && q === 3 && s.l61SalFlour && s.l61SalCoffee) {
      finishQuest61(ctx, p, "sal", {
        xp: 165,
        cents: 6500,
        items: ["burger", "burger", "bread", "almond"],
        by: "survivors",
        rep: [["survivors", 10], ["amber", 4], ["karma", 3]],
        text: "Quest Completed: Two Menus Short · Real flour and coffee reached Burger Bop (+165 XP, +$65.00)",
      });
      return { reply: "Smell that — real wheat, real dark roast! Even the faceling on the deep fryer paused for a second when I popped the tin. Sixty-five bucks, two hot burgers, a loaf off the rack, and almond water for the road. You keep folks sane in here, kid.", mood: "happy" };
    }
    if (t.includes("new batches turning out") && q === 99) {
      return { reply: "Best biscuits this side of the wire. Camp Amber's taking a tray over to Clippers every dusk now, and I stopped worrying why the soda fountain never runs dry.", mood: "happy" };
    }
  }
  if (id === "l10-meg-wren" && s.l61SalQ === 1) {
    if (t.includes("sal's feeding stragglers")) {
      const c = rollCheck(ctx, s, { skill: "speech", difficulty: 35 });
      if (!c.ok) return { reply: "Look, I like diners fine, but cooper counts every flour sack twice against the worm seasons. Trade fair or pay the pot fee.", mood: "calm" };
      s.l61SalFlour = 1;
      setStep61(ctx, p, "sal", 2, "Two Menus Short · Got Wren's stone-ground flour · Stop by Trader Kael in Level 11 for coffee");
      return { reply: "Feeding kids who tripped out of Level 6 blind? Okay, yeah, take the double-stitched sack off the wagon and tell Sal to send back clean wax paper next caravan.", mood: "happy" };
    }
    if (t.includes("stone-ground flour")) {
      const cheap = t.includes("barter") ? rollCheck(ctx, s, { skill: "barter", difficulty: 35 }).ok : false;
      const cost = cheap ? 800 : 1500;
      if ((s.cents ?? 0) < cost) return { reply: `Cooper's tariff's $${(cost / 100).toFixed(2)} for a full sack unless you want to talk me into a charity crate.`, mood: "calm" };
      s.cents -= cost;
      s.l61SalFlour = 1;
      setStep61(ctx, p, "sal", 2, "Two Menus Short · Bought Level 10 flour · Pick up roasted coffee from Kael in Level 11");
      return { reply: cheap ? "All right, sharp tongue — eight bucks it is. Heft it before Cooper asks why the wagon's lighter." : "Fifteen straight for the stew fund. Good wheat, zero purple kernels. Tell Kael I said stop hoarding all the mugs.", mood: "happy" };
    }
  }
  if (id === "l11-trader-kael" && s.l61SalQ === 2 && t.includes("tin of roasted coffee for sal")) {
    if (s.craneQ === 99) {
      s.l61SalCoffee = 1;
      setStep61(ctx, p, "sal", 3, "Two Menus Short · Carry the flour and coffee back through the glass doors to Sal in Level 6.1");
      return { reply: "You cleared the lock so that Guild barge could dock, boss — remember 'first pot off her is yours'? Take this sealed roast tin straight through the glass doors to Sal, zero charge.", mood: "happy" };
    }
    const deal = t.includes("half off") ? rollCheck(ctx, s, { skill: "barter", difficulty: 35 }).ok : false;
    const cost = deal ? 1000 : 2000;
    if ((s.cents ?? 0) < cost) return { reply: `Channel beans aren't cheap while the lock's cranky, boss — $${(cost / 100).toFixed(2)}, or go unlock my canal barge first.`, mood: "calm" };
    s.cents -= cost;
    s.l61SalCoffee = 1;
    setStep61(ctx, p, "sal", 3, "Two Menus Short · Carry the flour and coffee back through the glass doors to Sal in Level 6.1");
    return { reply: deal ? "Ten bucks for Sal's counter and a promise to keep facelings off my apple crates. Deal." : "Twenty even. Real beans, roasted before the lights went out. Run it through the glass doors before it loses its seal.", mood: "happy" };
  }

  return null;
}

export function l61Choices(id, s) {
  const out = [];
  if (id === "l61-amber-a") {
    const q = s?.l61BeeQ ?? 0;
    if (!q && repOf(s, "amber") > -35) out.push({ text: "That board mentions someone named Bee in a red coat.", tag: "Quest Start" });
    if (q === 3 && s?.l61BeeSafe) out.push({ text: "I have word on Bee from Camp Amber in the Hub.", tag: "Quest Turn-In" });
    if (q === 99) out.push({ text: "How's Bee settling in at the Hub?", tag: "Talk" });
  } else if (id === "l61-guard-a") {
    const q = s?.l61SealQ ?? 0;
    if (!q && repOf(s, "meg") > -35) out.push({ text: "What's behind Seal 6.1-02 in the back stockroom?", tag: "Quest Start" });
    if (q === 3 && s?.l61SealRuling) out.push({ text: "I brought Vale's diagnostics on Seal 6.1-02.", tag: "Quest Turn-In" });
    if (q === 99) out.push({ text: "Is Seal 6.1-02 staying quiet?", tag: "Talk" });
    if ((s?.l61GuildQ ?? 0) === 3) out.push({ text: "Here's the unguarded vent telemetry from my Level 3 and 4 survey.", tag: "Quest Turn-In" });
  } else if (id === "l61-guard-b") {
    if ((s?.l61SealQ ?? 0) === 3 && s?.l61SealRuling) out.push({ text: "I brought Vale's diagnostics on Seal 6.1-02.", tag: "Quest Turn-In" });
  } else if (id === "l61-guild-a") {
    const q = s?.l61GuildQ ?? 0;
    if (!q && repOf(s, "survivors") > -35) out.push({ text: "If 412 ways are written, what belongs on Page 413?", tag: "Quest Start" });
    if (q === 3) {
      out.push({ text: "Here are the Level 3 and 4 threshold notes for the Book of Ways: Page 413.", tag: "Quest Turn-In" });
      out.push({ text: "Mark B4 one-way in red ink on Page 413 so hungry wanderers don't fall blind.", tag: "Survival 40", check: { skill: "survival", difficulty: 40 } });
    }
    if (q === 99) out.push({ text: "How's Page 413 holding up in the Book?", tag: "Talk" });
    if (hasQuest(s, "craneQ") && !s?.craneWaybill) {
      out.push({ text: "Kael says your barge from 6.1 is stuck outside Level 11's canal lock.", tag: "Quest" });
      out.push({ text: "Kael's barge is stuck — does the Guild know anything about that spillway head?", tag: "Science 35", check: { skill: "science", difficulty: 35 } });
    }
    if (s?.craneQ === 99 && s?.craneGuildClear && !s?.craneGuildPaid) out.push({ text: "Kael signed off — your barge's customs waybill cleared the lock.", tag: "Quest" });
  } else if (id === "l61-sal") {
    const q = s?.l61SalQ ?? 0;
    if (!q && repOf(s, "survivors") > -35) out.push({ text: "Can a faceling burger ever run on real supplies?", tag: "Quest Start" });
    if ((s?.l61TraysReturned ?? 0) >= 1 && !s?.l61TrayBonus) out.push({ text: "I made sure to bus your tray on the rack earlier.", tag: "Talk" });
    if (q === 3 && s?.l61SalFlour && s?.l61SalCoffee) out.push({ text: "Got your Level 10 flour and Kael's coffee tin.", tag: "Quest Turn-In" });
    if (q === 99) out.push({ text: "How are the new batches turning out?", tag: "Talk" });
  } else if (id === "l11-commuter-faceling" && s?.l61BeeQ === 1) {
    out.push({ text: "Did you see a tall woman in a red wool coat come off the 8:15 bus?", tag: "Quest" });
    out.push({ text: "Please — about the red wool coat, do you remember which tunnel she asked about?", tag: "Speech 30", check: { skill: "speech", difficulty: 30 } });
  } else if ((id === "hub-amber-jo" || id === "hub-amber-pip")) {
    if (s?.l61BeeQ === 2) {
      out.push({ text: "Camp Amber in 6.1 sent me — did a woman in a red coat from 6.1 make it here?", tag: "Quest" });
      if (id === "hub-amber-jo") out.push({ text: "If she picked up frostbite from the tenth tunnel, let me check and wrap her hands.", tag: "Medicine 35", check: { skill: "medicine", difficulty: 35 } });
    }
    if (s?.l61BeeQ === 99) out.push({ text: "How's Bee doing since I checked in?", tag: "Talk" });
  } else if (id === "gamma-vale") {
    if (s?.l61SealQ === 2) {
      if (s?.l61RelayTape) out.push({ text: "I pulled the M.E.G. relay tape from Level 6 for Seal 6.1-02.", tag: "Quest" });
      out.push({ text: "Can we read the 03:14 harmonic off my Seal 6.1-02 notes right here?", tag: "Science 40", check: { skill: "science", difficulty: 40 } });
      out.push({ text: "Just give me the caution dampener and your readings from Seal 6.1-02.", tag: "Quest" });
    }
    if (s?.l61SealQ === 99) out.push({ text: "Any stray signals from Seal 6.1-02 lately?", tag: "Talk" });
  } else if (id === "omega-okafor" && s?.l61GuildQ === 2) {
    out.push({ text: "Logging the B4 vending drop into 6.1 for the Guild — any incident slips?", tag: "Speech 30", check: { skill: "speech", difficulty: 30 } });
    out.push({ text: "Cross-check your sensor telemetry from Base Omega on that south break room.", tag: "Science 35", check: { skill: "science", difficulty: 35 } });
  } else if (id === "l10-meg-wren" && s?.l61SalQ === 1) {
    out.push({ text: "Sal's feeding stragglers out of Level 6 at Burger Bop — spare one sack of wheat?", tag: "Speech 35", check: { skill: "speech", difficulty: 35 } });
    out.push({ text: "How much for a sack of stone-ground flour? [$15]", tag: "Quest" });
    out.push({ text: "Call it $8 on a barter slip for a sack of stone-ground flour?", tag: "Barter 35", check: { skill: "barter", difficulty: 35 } });
  } else if (id === "l11-trader-kael" && s?.l61SalQ === 2) {
    out.push({
      text: s?.craneQ === 99 ? "Need a tin of roasted coffee for Sal back in 6.1 (on that lock favor?)." : "Need a tin of roasted coffee for Sal back in 6.1 [$20].",
      tag: "Quest",
    });
    if (s?.craneQ !== 99) out.push({ text: "Give me half off that tin of roasted coffee for Sal — he clears your crates [$10].", tag: "Barter 35", check: { skill: "barter", difficulty: 35 } });
  }
  return out;
}
