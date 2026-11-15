// Chapter 2: "The Dead Signal" + supporting side quests leading up to Level !.
// Flows forward from Dina's River trail (dinaQ >= 9) into Level 11, IS LAB, Level 34, Base Gamma, and Level !.
import { addRep, repOf } from "./rep.js";
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { endQuest, payOnce, setQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { noNpcs } from "./run-opts.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";

export const CH2 = {
  id: "the-dead-signal",
  name: "The Dead Signal",
  kind: "main",
  briefing: "Dina's River signal dropped out past Level 11. Follow her clinic note, decode the carrier on IS LAB's bench, confirm Base Gamma's old intake ledger, and step through the red hospital door.",
};

export const CH2_ECHO = {
  id: "frequency-lock",
  name: "Frequency Lock",
  kind: "side",
  briefing: "IS LAB's bench in Level 11's strip mall blew a splitter relay trying to lock the dead carrier. Scavenge a waterproof relay in the Level 34 sewers, get Pip at Base Gamma to calibrate one, buy a conduit key from Level 11's night janitor, or bypass the board directly.",
};

export const CH2_TONE = {
  id: "wait-for-the-tone",
  name: "Wait for the Tone",
  kind: "side",
  briefing: "A timed pace click rides under the static on 11th Avenue's payphone. Answer the phone, ask Ivy at Base Gamma about Camera 4's timestamp, and recover the runner's dropped satchel near Level 11's barricaded alley.",
};

export const megHostileCh2 = (s) => repOf(s, "meg") <= -30;

export const REPLIES = {
  vance_q1: "Dina? Yeah, checked through Base Beta three sleeps back with half her pack missing, asking about some observer in yellow near the strip mall. Didn't stay for rations, either. She walked straight past Centro Dermatologico muttering about a carrier signal bleeding through the concrete. Look behind the clinic desk if she left a spare cache. If you want to read that static properly, check the test bench next door at IS LAB while you're in the mall.",
  kael_q1: "She didn't buy supplies from me, friend. Too busy staring at that strip mall on the west edge. Said the dead frequencies were humming right behind Centro Dermatologico's exam wall, and she talked to the night tech over at IS LAB before she vanished. Try the clinic back room first, and keep your ears open near the 11th Ave payphone if it starts clicking.",
  jo_hostile_q1: "M.E.G. pulled down Dina's chalk notes on 11th Avenue because Base Beta doesn't like unlogged signals near their perimeter. Check Centro Dermatologico in Level 11's strip mall anyway. She always tucks a spare strip of tape and an address behind clinic cabinets before taking a bad door, and IS LAB next door still has working test gear.",
  moss_q3_need_bench: "That red hospital corridor keeps pulling runners in off wild seams. Dina wasn't the last person to catch it either: Base Gamma logged a courier named Mike Sunderland, River's brother, on that exact frequency before Dina ever stepped into Level 11. He survived the run back to our intake desk, barely standing. The archive file is yours. Before forcing that hospital latch, decode the carrier on IS LAB's bench back in Level 11's strip mall.",
  moss_q3_ready: "Dina isn't the first name Base Gamma logged on that red hospital signal. Years back, Mike Sunderland, River's brother, got pulled through a door off Level 11 and dragged himself back to our intake desk, barely standing. Now that you've locked the carrier at IS LAB, both halves match. Head back to the strip mall hospital door with your eyes open.",
  vale_q3_need_bench: "Every red-wall anomaly we've logged since 2021 shares that 400-hertz drop before the door swings. Dina followed it out of Level 11, same as River's brother Mike Sunderland did before reaching our intake ledger. You know who survived it once. Now go back to IS LAB in Level 11's strip mall and lock that carrier frequency on their bench before you touch the door.",
  vale_q3_ready: "Same carrier pattern we pulled off the relay logs. Dina isn't the first person Gamma saw walk out of a red hospital corridor: Mike Sunderland, River's brother, caught that signal from Level 11, ran until his lungs gave out, and lived to sign our intake sheet. With IS LAB's frequency decode in hand, go force the red hospital door by Level 11's strip mall.",
  jo_hostile_q3_need_bench: "M.E.G. patrols won't hand you Base Gamma's intake binders, so here's what Camp Amber copied off them before the freeze: Mike Sunderland, River's brother, came out of a red hospital corridor off Level 11 half-conscious, raving about exit signs and gurneys, before going quiet up in Level 989. You still need IS LAB's bench in Level 11's strip mall to lock the carrier before forcing that door.",
  jo_hostile_q3_ready: "Here's what Camp Amber copied out of Base Gamma's intake sheets before M.E.G. cut access: courier Mike Sunderland, River's brother, survived a red hospital corridor off Level 11, left notes on the pacing, and later disappeared toward Level 989. You've already locked the carrier at IS LAB, so go force the red hospital door by Level 11's strip mall.",
  phoebe_mike: "Huh. You actually asked M.E.G. about Mike Sunderland before coming down here? Most folks never bother checking the old logs, just run till their shoes fall off. Yeah, I watched him sprint half a mile down a hallway just like this once. Weird guy. Carried a fishing lure in his jacket pocket like it was good luck. You made better time than he did, though.",
  phoebe_reminded: "Just waiting for the static to settle down so you wouldn't bolt back into the hallway and get chewed up. You know how noisy that exit is at first? Sort of reminded me of this wanderer Mike Sunderland I pulled behind a pillar years back, before he got obsessed with some quiet pier somewhere. You landed cleaner than he did, though.",
  phoebe_want: "Right now? Mostly a breather and someone to talk to who isn't screaming. Look, that hallway spits people out down my neck of the woods maybe twice a year, and most of them bleed out behind a tipped gurney because nobody propped the alcove latch. I dragged you behind the plaster. You don't owe me a speech, just don't die in my hallway.",
  phoebe_sooner: "Hey, nobody pays me hazard wages to sprint ten kilometers down a burning hallway, pal. I didn't build those gurneys, and I definitely didn't send the crowd behind you. I dragged you behind the only load-bearing pillar before your knees locked up. Take the save and catch your breath.",
  phoebe_thanks: "You're welcome. Don't make it weird. Honestly, most people who survive the sprint spend the first five minutes checking if I have teeth in my sleeves before they say thanks. You handled the turn alright once I waved you into the alcove.",
  phoebe_whisper: "Still got good ears, I see. Yeah, that's the Mike I meant. Ran a red hall, kept his jacket mostly together, talked nonstop about going fishing once he got out of the city. Strange taste in hobbies, if you ask me.",
  phoebe_prep: "You kept a steady cadence on that run instead of blowing your legs out before the third turn. Looks like somebody found Mike's old pacing notes before stepping through the red door.",
  phoebe_finish: "That unmarked cream door on the south wall runs straight out of this ward into Level 109. Clean tiles, bright bulbs, and people in scrubs who keep every ward door shut. If you're still chasing Dina's signal forward, go through there. The east door back to Level 11's strip mall stays open if you need supplies first.",
};

function shortId(it) {
  return String(it?.id ?? it ?? "").split("/").pop();
}

export function addPayout(s, { xp = 0, items = [], text = null } = {}) {
  const prev = s.payout;
  if (!prev && !items.length && text == null) {
    s.payout = { xp };
    return;
  }
  const out = { xp: (prev?.xp ?? 0) + xp };
  const mergedItems = [...(prev?.items ?? []), ...(items ?? [])];
  if (mergedItems.length) out.items = mergedItems;
  const mergedText = text ?? prev?.text;
  if (mergedText) out.text = mergedText;
  s.payout = out;
}

function questBanner(ctx, st, msg, clip = CHIME) {
  const now = ctx.now();
  st.notice = { text: msg, at: now };
  pushFeed(st, msg, now, "good");
  const pos = ctx.self?.worldFeetPosition ?? ctx.self?.feetPosition;
  if (pos) heard(ctx, { clip, position: pos, volume: 0.75, maxDistance: 14 });
}

function stage3Info(s) {
  const dec = !!s.ch2SignalDecoded;
  const arc = !!s.ch2Archive;
  const hostile = megHostileCh2(s);
  if (dec && !arc) {
    return {
      step: hostile
        ? "Carrier locked. Ask Jo at Camp Amber (The Hub) who ran a red hall like that before Dina"
        : "Carrier locked. Ask Moss or Vale at Base Gamma (or check GAMMA-DB-01, Vance [Speech 45], or Jo in The Hub) about who ran the red hall before Dina",
      mark: hostile
        ? { place: "thehub", x: 0, z: -18, label: "Camp Amber (The Hub)" }
        : { place: "gamma", x: 15, z: 29.5, label: "Base Gamma (Moss / Archive)" },
    };
  }
  if (!dec && arc) {
    return {
      step: "Gamma records point to Mike Sunderland. Decode the carrier on IS LAB's bench in Level 11",
      mark: { place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" },
    };
  }
  return {
    step: hostile
      ? "Decode the carrier on IS LAB's bench in Level 11, then ask Camp Amber in The Hub about Base Gamma's old intake ledger"
      : "Decode the carrier on IS LAB's bench in Level 11 and confirm Base Gamma's old intake ledger (Base Gamma, GAMMA-DB-01, or Vance)",
    mark: { place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" },
  };
}

export const STEP = {
  1: (s) => megHostileCh2(s)
    ? { step: "Search Centro Dermatologico in Level 11's strip mall, or ask Jo at Camp Amber about Dina", mark: { place: "level11", x: -25.45, z: 28.9, label: "Strip Mall Clinic" } }
    : { step: "Ask Vance at Base Beta, Trader Kael, or Sedco's courier on 11th Ave about Dina's trail in Level 11", mark: { place: "level11", x: 19.35, z: -13.15, label: "Base Beta (Vance)" } },
  2: () => ({ step: "Search Centro Dermatologico in Level 11's strip mall for Dina's note", mark: { place: "level11", x: -25.45, z: 28.9, label: "Strip Mall Clinic" } }),
  3: (s) => stage3Info(s),
  4: () => ({ step: "Enter the red hospital door by Level 11's strip mall", mark: { place: "level11", x: -29.25, z: 31, label: "Red Hospital Door" } }),
  5: () => ({ step: "Run the red hospital corridor and survive the horde", mark: { place: "levelrun", x: 0, z: -185, label: "Exit Alcove" } }),
  6: () => ({ step: "Speak with Phoebe in the Safe Alcove", mark: { place: "levelrun", x: 0, z: -200, label: "Phoebe" } }),
};

export const ECHO_STEP = {
  1: () => ({ step: "Inspect the shorted receiver bench inside IS LAB in Level 11's strip mall", mark: { place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" } }),
  2: (s) => s.ch2Relay
    ? { step: "Slot the replacement relay into IS LAB's bench inside Level 11's strip mall", mark: { place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" } }
    : { step: "Source a working relay (Level 34 sewers, Pip at Base Gamma, IS LAB commuter, or Level 11's janitor) or bypass the bench [Science 40 / Repair 35 / Repair 20 + parts]", mark: { place: "level34", x: 17.2, z: 25, label: "Level 34 East Sewer" } },
  3: () => ({ step: "Slot the replacement relay into IS LAB's bench inside Level 11's strip mall", mark: { place: "level11", x: -25.2, z: 34.85, label: "IS LAB Bench" } }),
};

export const TONE_STEP = {
  1: () => ({ step: "Answer the ringing payphone on 11th Avenue in Level 11", mark: { place: "level11", x: -8.8, z: 15.5, label: "11th Ave Payphone" } }),
  2: (s) => s.ch2RunnerData
    ? { step: "Bring the field satchel pacing log to Ivy at Base Gamma, Vance at Base Beta, or Kael in Central Market", mark: { place: "gamma", x: -26, z: 2, label: "Base Gamma (Ivy)" } }
    : { step: "Ask Ivy at Base Gamma about Camera 4's timestamp, or search near Level 11's barricaded alley", mark: { place: "gamma", x: -26, z: 2, label: "Base Gamma (Ivy)" } },
  3: (s) => !s.ch2RunnerData
    ? { step: "Recover the dropped field satchel behind Level 11's barricaded alley pallets", mark: { place: "level11", x: -30.9, z: 8.7, label: "Barricaded Alley Satchel" } }
    : { step: "Report the pacing notes to Ivy at Base Gamma, Vance at Base Beta, or Kael in Central Market", mark: { place: "level11", x: -17.06, z: 53.73, label: "Central Market (Trader Kael)" } },
};

export function syncCh2(s) {
  if (!s || s.ch2Done) return false;
  const q = s.ch2Q ?? 0;
  if (!q) return false;
  const fn = STEP[q];
  if (!fn) return false;
  const info = fn(s);
  return setQuest(s, CH2.id, { name: CH2.name, step: info.step, mark: info.mark, main: true, briefing: CH2.briefing });
}

export function syncCh2Echo(s) {
  if (!s || s.ch2EchoDone) return false;
  const q = s.ch2EchoQ ?? 0;
  if (!q) return false;
  const fn = ECHO_STEP[q];
  if (!fn) return false;
  const info = fn(s);
  return setQuest(s, CH2_ECHO.id, { name: CH2_ECHO.name, step: info.step, mark: info.mark, kind: "side", briefing: CH2_ECHO.briefing });
}

export function syncCh2Tone(s) {
  if (!s || s.ch2ToneDone) return false;
  const q = s.ch2ToneQ ?? 0;
  if (!q) return false;
  const fn = TONE_STEP[q];
  if (!fn) return false;
  const info = fn(s);
  return setQuest(s, CH2_TONE.id, { name: CH2_TONE.name, step: info.step, mark: info.mark, kind: "side", briefing: CH2_TONE.briefing });
}

export function setCh2Step(ctx, st, n, noteText) {
  if (!st || st.ch2Done) return false;
  if (n <= (st.ch2Q ?? 0) || !STEP[n]) return false;
  st.ch2Q = n;
  syncCh2(st);
  if (n === 3 && st.ch2SignalDecoded && st.ch2Archive) {
    return maybeUnlockStage4(ctx, st);
  }
  if (noteText) {
    questBanner(ctx, st, noteText);
  } else {
    const info = STEP[n](st);
    questBanner(ctx, st, `${CH2.name}: ${info.step}`);
  }
  return true;
}

export function maybeUnlockStage4(ctx, st) {
  if (!st || st.ch2Done || (st.ch2Q ?? 0) !== 3) return false;
  if (!st.ch2SignalDecoded || !st.ch2Archive) {
    syncCh2(st);
    return false;
  }
  return setCh2Step(ctx, st, 4, "Both halves match: IS LAB locked the carrier and Base Gamma named Mike Sunderland. Force the red hospital door in Level 11.");
}

export function setCh2EchoStep(ctx, st, n, noteText) {
  if (!st || st.ch2EchoDone) return false;
  if (n <= (st.ch2EchoQ ?? 0) || !ECHO_STEP[n]) return false;
  st.ch2EchoQ = n;
  syncCh2Echo(st);
  const info = ECHO_STEP[n](st);
  questBanner(ctx, st, noteText || `${CH2_ECHO.name}: ${info.step}`);
  return true;
}

export function setCh2ToneStep(ctx, st, n, noteText) {
  if (!st || st.ch2ToneDone) return false;
  if (n <= (st.ch2ToneQ ?? 0) || !TONE_STEP[n]) return false;
  st.ch2ToneQ = n;
  syncCh2Tone(st);
  const info = TONE_STEP[n](st);
  questBanner(ctx, st, noteText || `${CH2_TONE.name}: ${info.step}`);
  return true;
}

export function completeCh2Echo(ctx, st, noteText) {
  if (!st || st.ch2EchoDone || !payOnce(st, "ch2-echo")) return false;
  st.ch2EchoDone = 1;
  st.ch2EchoQ = 99;
  st.ch2SignalDecoded = 1;
  st.cents = (st.cents ?? 0) + 6500;
  endQuest(st, CH2_ECHO.id, "Bypassed the shorted splitter on IS LAB's bench and locked the Level 11 carrier onto the red hospital signal.");
  addPayout(st, { xp: 120, items: ["almond", "circuit"], text: noteText || "Frequency Lock Complete (+120 XP, +$65.00, +1 Almond Water, +1 Circuit)" });
  questBanner(ctx, st, noteText || "Frequency Lock Complete: IS LAB bench locked (+120 XP, +$65.00)", FANFARE);
  maybeUnlockStage4(ctx, st);
  return true;
}

export function completeCh2Tone(ctx, st, noteText) {
  if (!st || st.ch2ToneDone || !payOnce(st, "ch2-tone")) return false;
  st.ch2ToneDone = 1;
  st.ch2ToneQ = 99;
  st.ch2Prep = 1;
  st.knowsMike = 1;
  endQuest(st, CH2_TONE.id, "Matched 11th Avenue's payphone click to Base Gamma Camera 4 and recovered Mike Sunderland's stride notes from the barricaded alley.");
  addPayout(st, { xp: 135, items: ["almond", "almond", "bandage", "bandage", "firstaid"], text: noteText || "Wait for the Tone Complete (+135 XP, pre-run med kit, Runner's Cadence bonus)" });
  questBanner(ctx, st, noteText || "Wait for the Tone Complete: Mike's pacing notes recovered (+135 XP, Runner's Cadence bonus)", FANFARE);
  return true;
}

export function ch2Tick(ctx, ses, st, place) {
  if (!st) return false;
  let dirty = false;

  if (!st.ch2Q && !st.ch2Done && !noNpcs(st) && (st.dinaQ ?? 0) >= 9 && place !== "intake" && place !== "tutorial0" && place !== "bonus") {
    st.ch2Q = 1;
    syncCh2(st);
    st.notice = { text: "New Lead: The Dead Signal (Dina's trail picks up past Level 11)", at: ctx.now() };
    pushFeed(st, "Chapter 2 begun: follow Dina's trail to Level 11.", ctx.now(), "info");
    dirty = true;
  }

  if (st.ch2Done) return dirty;
  if (st.ch2Q && !st.quests?.[CH2.id] && !st.qdone?.[CH2.id]) {
    if (syncCh2(st)) dirty = true;
  }
  if (st.ch2EchoQ && !st.ch2EchoDone && !st.quests?.[CH2_ECHO.id] && !st.qdone?.[CH2_ECHO.id]) {
    if (syncCh2Echo(st)) dirty = true;
  }
  if (st.ch2ToneQ && !st.ch2ToneDone && !st.quests?.[CH2_TONE.id] && !st.qdone?.[CH2_TONE.id]) {
    if (syncCh2Tone(st)) dirty = true;
  }
  if (st.ch2Q === 3 && st.ch2SignalDecoded && st.ch2Archive) {
    if (maybeUnlockStage4(ctx, st)) dirty = true;
  }
  if (place === "levelrun" && !st.lrunRescued && !st.ch2Done && (st.ch2Q ?? 0) >= 4 && (st.ch2Q ?? 0) < 5) {
    if (setCh2Step(ctx, st, 5)) dirty = true;
  }
  if (st.lrunRescued && !st.ch2Done && (st.ch2Q ?? 0) < 6) {
    if (setCh2Step(ctx, st, 6)) dirty = true;
  }
  return dirty;
}

export function completeChapter2(ctx, s) {
  if (!s || s.ch2Done || !payOnce(s, "ch2-main")) return false;
  const now = ctx.now();
  s.ch2Done = 1;
  s.ch3Unlocked = 1;
  s.ch2Q = 99;
  s.ch2DoneAt = now;
  s.lrunRescued = 1;
  s.lrunCut = null;
  s.ch3Ready = { from: "levelrun", reaction: s.phoebeReaction, at: now };
  endQuest(s, CH2.id, "Decoded IS LAB's dead signal, confirmed Mike Sunderland's intake log, survived Level !, and met Phoebe in the Safe Alcove.");
  pointCh3(s);
  addPayout(s, { xp: 450 });
  questBanner(ctx, s, "Chapter 2 Complete: The Dead Signal (+450 XP) - South hospital door to Level 109 open", FANFARE);
  ctx.emit("milestone", { step: 2, name: "chapter-2" }, { audience: { player: ctx.self.id } });
  return true;
}

function relayChoices(id, s) {
  const out = [];
  if (s.ch2Done) return out;
  const echoQ = s.ch2EchoQ ?? 0;
  const toneQ = s.ch2ToneQ ?? 0;
  const ch2q = s.ch2Q ?? 0;

  if (id === "l11-meg-agent-vance") {
    if (!s.ch2EchoDone) {
      if (!echoQ && ch2q >= 1) {
        out.push({ text: "You mentioned IS LAB next door to the clinic. Is their receiver still running?", tag: "Side Quest" });
      } else if (echoQ === 1 || (echoQ === 2 && !s.ch2Relay)) {
        out.push({ text: "Where would M.E.G. salvage a waterproof relay in Level 11?", tag: "Ask" });
      }
    }
    if (toneQ === 3 && s.ch2RunnerData && !s.ch2ToneDone && !megHostileCh2(s)) {
      out.push({ text: "Recovered Mike Sunderland's stride log near the barricaded alley. Want a copy for Base Beta?", tag: "Turn In" });
    }
  }

  if (id === "l11-trader-kael") {
    if (!s.ch2EchoDone && !echoQ && ch2q >= 1) {
      out.push({ text: "Anyone at IS LAB still keeping the signal bench alive?", tag: "Side Quest" });
    }
    if (!s.ch2ToneDone && !toneQ && ch2q >= 1) {
      out.push({ text: "Why does the 11th Ave payphone keep clicking on the quarter-beat?", tag: "Side Quest" });
    } else if (toneQ === 3 && s.ch2RunnerData && !s.ch2ToneDone) {
      out.push({ text: "I pulled a runner's field satchel out of the barricaded alley. Name inside says Mike Sunderland.", tag: "Turn In" });
    }
  }

  if (id === "l11-walker-2") {
    if (!s.ch2EchoDone && !echoQ) {
      out.push({ text: "You commute past IS LAB. What shorted out their radio bench?", tag: "Side Quest" });
    } else if (!s.ch2EchoDone && echoQ === 2 && !s.ch2Relay && !s.ch2Walker2Tried) {
      out.push({ text: "Didn't the night shift keep a boxed spare relay in IS LAB's supply locker? [Speech 40]", tag: "Speech 40", check: { skill: "speech", difficulty: 40 } });
    }
    if (!s.ch2ToneDone && !toneQ && ch2q >= 1) {
      out.push({ text: "Heard that payphone outside clicking in four-four time. Any idea who timed it?", tag: "Side Quest" });
    }
  }

  if (id === "l11-walker-3" && echoQ === 2 && !s.ch2Relay && !s.ch2EchoDone) {
    if (!s.ch2JanBarTried) {
      out.push({ text: "I need a waterproof relay for IS LAB's bench. Still got a spare off your conduit cart? [Barter 35]", tag: "Barter 35", check: { skill: "barter", difficulty: 35 } });
    }
    if ((s.cents ?? 0) >= 3000) {
      out.push({ text: "Here's $30 for a spare waterproof relay off your maintenance cart.", tag: "Pay $30" });
    }
  }

  if (id === "gamma-pip" && echoQ === 2 && !s.ch2Relay && !s.ch2EchoDone) {
    if (!s.ch2PipRepTried) {
      out.push({ text: "IS LAB in Level 11 blew a splitter relay. Can we wire a waterproof bypass from Gamma parts? [Repair 35]", tag: "Repair 35", check: { skill: "repair", difficulty: 35 } });
    }
    if (!s.ch2PipSciTried) {
      out.push({ text: "Can you calibrate a 400-hertz carrier relay from the Level 3 switchboard logs? [Science 35]", tag: "Science 35", check: { skill: "science", difficulty: 35 } });
    }
    if ((s.batteries ?? 0) >= 1) {
      out.push({ text: "Trade you a spare flashlight battery if you pull a sealed relay for IS LAB.", tag: "Give Battery" });
    }
    if ((s.scrap?.circuit ?? 0) >= 1) {
      out.push({ text: "Here's a circuit board. Can you flash it into a Level 11 carrier relay?", tag: "Give Circuit" });
    }
  }

  if (id === "gamma-ivy" && !s.ch2ToneDone) {
    if (!toneQ && ch2q >= 1) {
      out.push({ text: "Did Camera 4 pick up an audio bleed off Level 11's 11th Ave payphone?", tag: "Side Quest" });
    } else if (toneQ === 2 && !s.ch2CamLogged) {
      out.push({ text: "Cross-check Camera 4's timestamp bleed against the 11th Ave payphone click.", tag: "Camera 4" });
    } else if (toneQ === 3 && s.ch2RunnerData && !s.ch2ToneDone) {
      out.push({ text: "Found Mike Sunderland's field satchel by Level 11's barricaded alley.", tag: "Turn In" });
    }
  }

  return out;
}

export function ch2Choices(ctx, it, s) {
  if (!it || !s) return [];
  const id = shortId(it);
  const q = s.ch2Q ?? 0;
  const out = [];

  if (!s.ch2Done) {
    if (q === 1) {
      if (id === "l11-meg-agent-vance" && !megHostileCh2(s)) {
        out.push({ text: "I followed Dina's relay frequency past The Hub. Any sight of her at Base Beta?", tag: "Main Quest" });
      }
      if (id === "l11-trader-kael") {
        out.push({ text: "You sell supplies to M.E.G. patrols. Seen a runner carrying field batteries pass through?", tag: "Main Quest" });
      }
      if (id === "l11-walker-1") {
        out.push({ text: "You run manifests along 11th Ave. Spot a runner heading toward the strip mall clinic?", tag: "Main Quest" });
      }
      if (id === "hub-amber-jo" && megHostileCh2(s)) {
        out.push({ text: "M.E.G. cut off Base Beta's logs. Where did Dina drop her strip mall cache in Level 11?", tag: "Main Quest" });
      }
    }

    if (q === 3 && !s.ch2Archive) {
      if (id === "l11-meg-agent-vance" && !megHostileCh2(s) && !s.ch2VanceArchiveTried) {
        out.push({ text: "Pull Base Beta's mirrored intake index on who survived that red hospital corridor before Dina. [Speech 45]", tag: "Speech 45", check: { skill: "speech", difficulty: 45 } });
      }
      if (id === "gamma-moss" && !megHostileCh2(s)) {
        out.push({ text: "I found Dina's note in Level 11. Did Base Gamma's old intake logs mention a red hospital hall?", tag: "Main Quest" });
      }
      if (id === "gamma-vale" && !megHostileCh2(s)) {
        out.push({ text: "Dina mentioned Base Gamma's old intake sheets and a red hallway past Level 11.", tag: "Main Quest" });
      }
      if (id === "hub-amber-jo") {
        if (megHostileCh2(s)) {
          out.push({ text: "M.E.G. locked me out of Base Gamma. Does Camp Amber know who survived that red hospital door?", tag: "Main Quest" });
        } else {
          if (!s.ch2JoArchiveTried) {
            out.push({ text: "Camp Amber copied Base Gamma's intake ledgers before the split. Could you check who survived that red hospital door? [Speech 40]", tag: "Speech 40", check: { skill: "speech", difficulty: 40 } });
          }
          if ((s.cents ?? 0) >= 2500) {
            out.push({ text: "Here's $25 for Camp Amber's supply crate if you let me read your copied Gamma intake ledger.", tag: "Pay $25" });
          }
        }
      }
    }
  }

  out.push(...relayChoices(id, s));

  if (id === "phoebe-lrun" && q >= 6 && !s.ch2Done) {
    if (!s.phoebeTalked) {
      if (s.knowsMike) out.push({ text: "Did you really watch Mike Sunderland sprint down one of these halls?" });
      if (s.heardMike && !s.knowsMike && !s.phoebeWhispered) out.push({ text: "Wait. You mentioned Mike earlier. Who is he?" });
      out.push({ text: "If you're friendly, what were you waiting for?" });
      out.push({ text: "Who are you? What do you want?" });
      out.push({ text: "You could've helped sooner." });
      out.push({ text: "Thanks, I think." });
    } else {
      if (s.heardMike && !s.knowsMike && !s.phoebeWhispered) out.push({ text: "Wait. You mentioned Mike earlier. Who is he?" });
      if (s.phoebeReaction === "reminded" && !s.phoebeAskedMike) out.push({ text: "Did you know Mike well?" });
      if (s.ch2Prep && !s.phoebeNotedPrep) out.push({ text: "Think those pacing notes from Level 11 actually kept me upright?" });
      out.push({ text: "Where does that cream hospital door go?" });
    }
  }

  return out;
}

function handleRelayDialogue(ctx, st, npc, text, id) {
  if (id === "l11-meg-agent-vance") {
    if (!st.ch2EchoDone && text.includes("IS LAB next door")) {
      setCh2EchoStep(ctx, st, 1);
      return { reply: "Their test rack still draws municipal power off the strip mall transformer, yeah. Tech walked out two days ago after the splitter relay popped trying to lock a 400-hertz hum. Look at the bench inside IS LAB if you want that signal decoded.", mood: "calm" };
    }
    if (!st.ch2EchoDone && text.includes("salvage a waterproof relay")) {
      return { reply: "Not off Base Beta's perimeter wire. Storm-rated relays go down the 11th Street sewer grate into Level 34, otherwise talk to Pip back at Base Gamma or buy a spare off the night janitor hanging by the east block.", mood: "calm" };
    }
    if (!st.ch2ToneDone && st.ch2ToneQ === 3 && st.ch2RunnerData && text.includes("Mike Sunderland's stride log")) {
      completeCh2Tone(ctx, st);
      return { reply: "Sunderland's pace tables? Good work, citizen. I'll log those straight onto Base Beta's runner alert board. Keep his spare bandages and almond water off our shelf before stepping through the mall threshold.", mood: "friendly" };
    }
  }

  if (id === "l11-trader-kael") {
    if (text.includes("signal bench alive") && !st.ch2EchoDone) {
      setCh2EchoStep(ctx, st, 1);
      return { reply: "Bench is intact, splitter relay is cooked black. Check IS LAB right next to Centro Dermatologico. You'll need a waterproof relay from down the 11th Street sewer or Base Gamma unless you can wire a bypass yourself.", mood: "calm" };
    }
    if (text.includes("payphone keep clicking") && !st.ch2ToneDone) {
      setCh2ToneStep(ctx, st, 1);
      return { reply: "Not random static. Hits the same four-four tempo every time it rings since last Tuesday. Answer the handset down 11th Ave, then ask Ivy at Base Gamma if Camera 4's timestamp bleed caught whoever set that pace.", mood: "calm" };
    }
    if (text.includes("Name inside says Mike Sunderland") && st.ch2ToneQ === 3 && st.ch2RunnerData && !st.ch2ToneDone) {
      completeCh2Tone(ctx, st);
      return { reply: "Sunderland. Right, he stopped through here before he got quiet up north. Keep his pace tape and take the spare almond water and bandages from my crate. If that red door pulls you in, keep your stride steady to his count.", mood: "friendly" };
    }
  }

  if (id === "l11-walker-2") {
    if (text.includes("shorted out their radio bench") && !st.ch2EchoDone) {
      setCh2EchoStep(ctx, st, 1);
      return { reply: "Splitter module burned straight through its resin casing when that clinic-side hum spiked. Examine the bench inside IS LAB. Somebody can bypass it with decent Science or Repair, or drop in a waterproof relay from the sewers.", mood: "calm" };
    }
    if (text.includes("supply locker") && st.ch2EchoQ === 2 && !st.ch2Relay && !st.ch2EchoDone && !st.ch2Walker2Tried) {
      st.ch2Walker2Tried = 1;
      const c = rollCheck(ctx, st, { skill: "speech", difficulty: 40 });
      ctx._lastCheck = c;
      if (!c.ok) {
        return { reply: "I'm a temp, not management. If you want IS LAB spares, go crawl Level 34 or talk to Base Gamma yourself.", mood: "annoyed" };
      }
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Convinced the IS LAB commuter to hand over the spare locker relay");
      return { reply: "Alright, keep your voice down. Here's the sealed spare relay they keep behind the specimen fridge. Snap it straight onto IS LAB's counter bench.", mood: "calm" };
    }
    if (text.includes("four-four time") && !st.ch2ToneDone) {
      setCh2ToneStep(ctx, st, 1);
      return { reply: "Same beat a guy in a wet jacket kept tapping against the curb before he went down the barricaded alley. Pick up the 11th Ave payphone yourself and listen to the click.", mood: "calm" };
    }
  }

  if (id === "l11-walker-3" && st.ch2EchoQ === 2 && !st.ch2Relay && !st.ch2EchoDone) {
    if (text.includes("conduit cart") && !st.ch2JanBarTried) {
      st.ch2JanBarTried = 1;
      const c = rollCheck(ctx, st, { skill: "barter", difficulty: 35 });
      ctx._lastCheck = c;
      if (!c.ok) {
        return { reply: "Union tag says thirty backdollars on sealed switchgear, pal. I don't write the sheet for free.", mood: "annoyed" };
      }
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Talked Level 11's night janitor out of a waterproof relay for IS LAB");
      return { reply: "Alright, alright, you sound like you actually wire boxes for a living. Keep this sealed relay off my manifest and slot it straight into IS LAB's bench.", mood: "calm" };
    }
    if (text.includes("$30 for a spare waterproof relay")) {
      if ((st.cents ?? 0) < 3000) {
        return { reply: "Short on scrip, friend. Thirty flat, or show me you know switchgear.", mood: "calm" };
      }
      st.cents -= 3000;
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Bought a waterproof relay ($30) from Level 11's night janitor for IS LAB");
      return { reply: "Fair price for clean brass contacts. Dry it off before you snap it onto IS LAB's rack.", mood: "calm" };
    }
  }

  if (id === "gamma-pip" && st.ch2EchoQ === 2 && !st.ch2Relay && !st.ch2EchoDone) {
    if (text.includes("[Repair 35]") && !st.ch2PipRepTried) {
      st.ch2PipRepTried = 1;
      const c = rollCheck(ctx, st, { skill: "repair", difficulty: 35 });
      ctx._lastCheck = c;
      if (!c.ok) {
        return { reply: "Your pinout calls are off by two rails. Bring me a spare flashlight battery or a clean circuit board if you don't want to crawl Level 34's East sewer.", mood: "calm" };
      }
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Wired a waterproof relay with Pip at Base Gamma for IS LAB");
      return { reply: "Clean bridge across the secondary lug. Here, sealed housing and all. Take it straight back to IS LAB's bench in Level 11.", mood: "friendly" };
    }
    if (text.includes("[Science 35]") && !st.ch2PipSciTried) {
      st.ch2PipSciTried = 1;
      const c = rollCheck(ctx, st, { skill: "science", difficulty: 35 });
      ctx._lastCheck = c;
      if (!c.ok) {
        return { reply: "Harmonics aren't lining up off memory alone. Bring a battery or circuit board, or snag a sealed case down in Level 34.", mood: "calm" };
      }
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Calibrated a 400 Hz carrier relay with Pip at Base Gamma for IS LAB");
      return { reply: "Good ear for notch filters. I flashed a Gamma relay to lock 400 hertz cleanly. Plug it into IS LAB's bench in Level 11.", mood: "friendly" };
    }
    if (text.includes("spare flashlight battery")) {
      if ((st.batteries ?? 0) < 1) return { reply: "Pockets look light on spare cells, runner.", mood: "calm" };
      st.batteries -= 1;
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Traded a spare battery to Pip at Base Gamma for an IS LAB relay");
      return { reply: "Nice fresh cell, saves my bench lamp. Swap is yours: sealed relay, tested up to ten amps. Take it back to IS LAB.", mood: "friendly" };
    }
    if (text.includes("flash it into a Level 11 carrier relay")) {
      if ((st.scrap?.circuit ?? 0) < 1) return { reply: "You don't have a spare circuit board on you.", mood: "calm" };
      st.scrap = { ...(st.scrap ?? {}), circuit: (st.scrap?.circuit ?? 1) - 1 };
      st.ch2Relay = 1;
      setCh2EchoStep(ctx, st, 3, "Flashed a circuit board into an IS LAB carrier relay with Pip at Base Gamma");
      return { reply: "Half a minute on the soldering iron and that board is waterproofed. Go drop it into IS LAB's bench in Level 11.", mood: "friendly" };
    }
  }

  if (id === "gamma-ivy" && !st.ch2ToneDone) {
    if (text.includes("Camera 4 pick up an audio bleed")) {
      st.ch2CamLogged = 1;
      setCh2ToneStep(ctx, st, 3, "Ivy pulled Camera 4's bleed: search behind Level 11's barricaded alley pallets");
      return { reply: "Yeah, logged it Tuesday at 04:12. Same 134 beats per minute we scraped off a runner's canvas bag near Level 11's barricaded alley before he noclipped out. Nobody retrieved the bag behind those pallets yet.", mood: "calm" };
    }
    if (text.includes("Cross-check Camera 4's timestamp bleed")) {
      st.ch2CamLogged = 1;
      setCh2ToneStep(ctx, st, 3, "Ivy matched Camera 4 to Level 11's barricaded alley: search the pallets for the dropped satchel");
      return { reply: "Right there on tape: 134 beats a minute clicking under Camera 4's static, matching a guy sprinting along the west barricade in Level 11. He dropped his satchel behind the pallets before the alley went wild.", mood: "calm" };
    }
    if (text.includes("Found Mike Sunderland's field satchel") && st.ch2ToneQ === 3 && st.ch2RunnerData) {
      completeCh2Tone(ctx, st);
      return { reply: "Mike Sunderland's stride tables, intact! Half of Gamma's runners swore he never wrote down how he survived that red corridor. Take these meds from Camp stores, and keep his breath count in mind if that door ever opens on you.", mood: "friendly" };
    }
  }

  return null;
}

export function handleDialogueCh2(ctx, player, npc, text) {
  const st = player?.state;
  if (!st || !npc || !text) return null;
  const id = shortId(npc);
  const q = st.ch2Q ?? 0;

  if (!st.ch2Done) {
    if (q === 1) {
      if (id === "l11-meg-agent-vance" && !megHostileCh2(st) && text.includes("Dina's relay frequency")) {
        st.ch2Yellow = 1;
        setCh2Step(ctx, st, 2);
        return { reply: REPLIES.vance_q1, mood: "calm" };
      }
      if (id === "l11-trader-kael" && text.includes("carrying field batteries")) {
        st.ch2Yellow = 1;
        setCh2Step(ctx, st, 2);
        return { reply: REPLIES.kael_q1, mood: "calm" };
      }
      if (id === "l11-walker-1" && text.includes("strip mall clinic")) {
        st.ch2Yellow = 1;
        setCh2Step(ctx, st, 2);
        return { reply: "Yeah, two nights ago, walking faster than the regular commuters toward Centro Dermatologico. Told the IS LAB tech something behind their clinic drywall sounded wrong. Look behind the clinic desk if she dropped a note.", mood: "calm" };
      }
      if (id === "hub-amber-jo" && megHostileCh2(st) && text.includes("Base Beta's logs")) {
        st.ch2Yellow = 1;
        setCh2Step(ctx, st, 2);
        return { reply: REPLIES.jo_hostile_q1, mood: "guarded" };
      }
    }

    if (q === 3 && !st.ch2Archive) {
      if (id === "l11-meg-agent-vance" && !megHostileCh2(st) && !st.ch2VanceArchiveTried && text.includes("mirrored intake index")) {
        st.ch2VanceArchiveTried = 1;
        const c = rollCheck(ctx, st, { skill: "speech", difficulty: 45 });
        ctx._lastCheck = c;
        if (!c.ok) {
          return { reply: "Not touching sealed Gamma intake sheets over the open desk radio. Walk down to Base Gamma in Level 3 yourself and talk to Moss or Vale.", mood: "guarded" };
        }
        st.ch2Archive = 1;
        st.knowsMike = 1;
        const ready = !!st.ch2SignalDecoded;
        maybeUnlockStage4(ctx, st);
        return {
          reply: ready
            ? "Alright, keep this off the dispatch log: Base Gamma logged courier Mike Sunderland, River's brother, surviving a red hospital threshold off Level 11 years before Dina. With IS LAB locked, force that strip mall door cleanly."
            : "Alright, keep this off the dispatch log: Base Gamma logged courier Mike Sunderland, River's brother, surviving a red hospital threshold off Level 11 years before Dina. Now go lock that 400-hertz carrier on IS LAB's bench.",
          mood: "calm",
        };
      }
      if (id === "gamma-moss" && !megHostileCh2(st) && text.includes("red hospital hall")) {
        st.ch2Archive = 1;
        st.knowsMike = 1;
        addRep(st, "meg", 6, "Followed Dina's archive lead to Base Gamma");
        const ready = !!st.ch2SignalDecoded;
        maybeUnlockStage4(ctx, st);
        return { reply: ready ? REPLIES.moss_q3_ready : REPLIES.moss_q3_need_bench, mood: "calm" };
      }
      if (id === "gamma-vale" && !megHostileCh2(st) && text.includes("Base Gamma's old intake")) {
        st.ch2Archive = 1;
        st.knowsMike = 1;
        addRep(st, "meg", 6, "Shared Dina's Level 11 telemetry with Base Gamma");
        const ready = !!st.ch2SignalDecoded;
        maybeUnlockStage4(ctx, st);
        return { reply: ready ? REPLIES.vale_q3_ready : REPLIES.vale_q3_need_bench, mood: "calm" };
      }
      if (id === "hub-amber-jo") {
        if (megHostileCh2(st) && text.includes("red hospital door")) {
          st.ch2Archive = 1;
          st.knowsMike = 1;
          addRep(st, "amber", 6, "Trusted Camp Amber over M.E.G. logs");
          const ready = !!st.ch2SignalDecoded;
          maybeUnlockStage4(ctx, st);
          return { reply: ready ? REPLIES.jo_hostile_q3_ready : REPLIES.jo_hostile_q3_need_bench, mood: "friendly" };
        }
        if (!megHostileCh2(st) && !st.ch2JoArchiveTried && text.includes("copied Base Gamma's intake ledgers")) {
          st.ch2JoArchiveTried = 1;
          const c = rollCheck(ctx, st, { skill: "speech", difficulty: 40 });
          ctx._lastCheck = c;
          if (!c.ok) {
            return { reply: "We kept those copies out of courtesy to people passing through, not as a free library for Base Beta regulars. Drop $25 into the camp box or ask Moss at Gamma.", mood: "guarded" };
          }
          st.ch2Archive = 1;
          st.knowsMike = 1;
          const ready = !!st.ch2SignalDecoded;
          maybeUnlockStage4(ctx, st);
          return { reply: ready ? REPLIES.jo_hostile_q3_ready : REPLIES.jo_hostile_q3_need_bench, mood: "friendly" };
        }
        if (!megHostileCh2(st) && text.includes("$25 for Camp Amber's supply crate")) {
          if ((st.cents ?? 0) < 2500) return { reply: "Twenty-five flat for the box, runner.", mood: "calm" };
          st.cents -= 2500;
          st.ch2Archive = 1;
          st.knowsMike = 1;
          addRep(st, "amber", 4, "Supported Camp Amber supply crate");
          const ready = !!st.ch2SignalDecoded;
          maybeUnlockStage4(ctx, st);
          return { reply: ready ? REPLIES.jo_hostile_q3_ready : REPLIES.jo_hostile_q3_need_bench, mood: "friendly" };
        }
      }
    }
  }

  const relayRes = handleRelayDialogue(ctx, st, npc, text, id);
  if (relayRes) return relayRes;

  if (id === "phoebe-lrun" && q >= 6 && !st.ch2Done) {
    if (text.includes("mentioned Mike earlier")) {
      st.knowsMike = 1;
      st.phoebeWhispered = 1;
      return { reply: REPLIES.phoebe_whisper, mood: "friendly" };
    }
    if (!st.phoebeTalked) {
      if (text.includes("watch Mike Sunderland")) {
        st.phoebeTalked = 1;
        st.phoebeStance = "curious";
        st.phoebeReaction = "mike";
        return { reply: REPLIES.phoebe_mike, mood: "friendly" };
      }
      if (text.includes("what were you waiting for")) {
        st.phoebeTalked = 1;
        st.phoebeStance = "curious";
        st.phoebeReaction = "reminded";
        st.knowsMike = 1;
        return { reply: REPLIES.phoebe_reminded, mood: "friendly" };
      }
      if (text.includes("What do you want")) {
        st.phoebeTalked = 1;
        st.phoebeStance = "suspicious";
        st.phoebeReaction = "want";
        return { reply: REPLIES.phoebe_want, mood: "guarded" };
      }
      if (text.includes("could've helped sooner")) {
        st.phoebeTalked = 1;
        st.phoebeStance = "frustrated";
        st.phoebeReaction = "sooner";
        return { reply: REPLIES.phoebe_sooner, mood: "annoyed" };
      }
      if (text.includes("Thanks, I think")) {
        st.phoebeTalked = 1;
        st.phoebeStance = "relieved";
        st.phoebeReaction = "thanks";
        return { reply: REPLIES.phoebe_thanks, mood: "warm" };
      }
    } else {
      if (text.includes("mentioned Mike earlier")) {
        st.knowsMike = 1;
        return { reply: REPLIES.phoebe_whisper, mood: "friendly" };
      }
      if (text.includes("Did you know Mike")) {
        st.knowsMike = 1;
        st.phoebeAskedMike = 1;
        return { reply: REPLIES.phoebe_whisper, mood: "friendly" };
      }
      if (text.includes("pacing notes from Level 11")) {
        st.phoebeNotedPrep = 1;
        return { reply: REPLIES.phoebe_prep, mood: "friendly" };
      }
      if (text.includes("cream hospital door") || text.includes("heading back to Level 11")) {
        completeChapter2(ctx, st);
        npc.state.leaveAt = ctx.now() + 9000;
        return { reply: REPLIES.phoebe_finish, mood: "friendly" };
      }
    }
  }

  return null;
}

// Chapter 3 opens on Level 109 (shelly Nov 14: Level ! leads to 109 as the next main quest goal). The chapter's own beats are written on Level 109.
export const CH3 = { id: "the-neon-hospital", name: "The Neon Hospital" };
export function pointCh3(s) {
  if (!s || s.ch3Q) return false;
  return setQuest(s, CH3.id, { name: CH3.name, main: true, step: "Step through the unmarked cream door on the alcove's south wall into Level 109.", mark: { place: "levelrun", id: "lrun-to-l109" } });
}
export function startCh3(ctx, player) {
  const s = player?.state; if (!s || s.ch3Q) return false;
  s.ch3Q = 1;
  setQuest(s, CH3.id, { name: CH3.name, main: true, step: "A clean hospital corridor with no end and no signs. Every door is shut for a reason. Find whoever keeps them that way.", mark: { place: "level109", id: "l109-halloran", at: { x: 432, y: 0, z: -88 } } });
  questBanner(ctx, s, "Chapter 3: The Neon Hospital");
  return true;
}
