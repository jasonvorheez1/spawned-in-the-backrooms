// Chapter 2 ("The Dead Signal") quest state machine, Dina arc extensions, Base Gamma/Sunderland lore, and Phoebe post-rescue conclusion.
// Pure quest state helpers cleanly separated from Level ! physics so tests and dialogue run deterministically.
import { setQuest, endQuest, tellQuest } from "./quests.js";
import { pushFeed } from "./feed.js";
import { addRep, isVilified } from "./rep.js";

export const CH2 = { id: "the-dead-signal", name: "The Dead Signal" };

const short = (it) => String(it?.id ?? it ?? "").split("/").pop();
const has = (s, fn) => typeof fn === "function" && fn(s);

export const megHostileCh2 = (s) => isVilified(s, { id: "l11-meg-agent-vance", state: { faction: "meg" } });

const CH2_WHISPER_LINE = "Same pace. Do not waste it on a locked door.";
const WV = (w) => `/cdn/voice-soft-breathy-young-woman-whispering-amused-saying-${encodeURIComponent(w)}.mp3`;

// Phoebe's five answers in the Safe Alcove. She is curious, not fond. Mike is only what others told you.
export const REPLIES = [
  { id: "mike", stance: "curious", tag: "Ask", key: "who is mike", q: "Who is Mike?",
    a: "River's sister. Quick learner. A red hospital seam took her. I wanted to see if you'd go the same way.",
    note: "You asked about Mike. Phoebe compared you to her, and didn't say who came out ahead." },
  { id: "reminded", stance: "curious", tag: "Ask", key: "reminded you of someone", q: "I reminded you of someone.",
    a: "You run like her. Same bad habits. I wanted to see if the ending changed.",
    note: "Phoebe admitted you reminded her of Mike. Not sentiment. A rerun." },
  { id: "want", stance: "suspicious", tag: "Suspicious", key: "what do you want", q: "What do you want from me?",
    a: "Nothing yet. I like watching what people do when a room wants them dead.",
    note: "You asked what she wants. She wants to keep watching." },
  { id: "sooner", stance: "frustrated", tag: "Angry", key: "could've helped sooner", q: "You could've helped sooner.",
    a: "Sure. Then I'd never know how far you get. Now I do. Six meters short.",
    note: "You called her out for waiting. She didn't deny it was a test." },
  { id: "thanks", stance: "relieved", tag: "Grateful", key: "thanks, i think", q: "Thanks, I think.",
    a: "Don't. I was curious. You were interesting. Stay that way.",
    note: "You thanked her. She said curiosity saved you, not kindness." },
];

const STEP = {
  1: (s) => ({
    step: megHostileCh2(s)
      ? "M.E.G. dispatch won't talk to you. Ask trader Kael on Level 11 or check the clinic across from him for Dina's dead-drop."
      : "Chapter 2 begins on Level 11. Ask M.E.G. Agent Vance at Base Beta Dispatch (or trader Kael) where Dina left her relay drop.",
    mark: megHostileCh2(s) ? { place: "level11", id: "l11-trader-kael" } : { place: "level11", id: "l11-meg-agent-vance" },
  }),
  2: () => ({
    step: "Dina stashed her drive packet inside the shuttered Centro Dermatologico clinic on Level 11's strip mall. Recover the sealed clinic cache.",
    mark: { place: "level11", id: "l11-dina-cache" },
  }),
  3: () => ({
    step: "Dina's note warns that someone cut a red-lit threshold behind the clinic and copied her route. Ask Commander Moss or Vale at Base Gamma (or Jo at Camp Amber) about the older pattern.",
    mark: { place: "gamma", id: "gamma-moss" },
  }),
  4: () => ({
    step: "Moss and Vale tied the doorway cadence to Mike Sunderland, River's sister, and a silent observer in yellow. Return to Level 11 and step through the anomalous hospital door behind the clinic.",
    mark: { place: "level11", id: "l11-to-levelrun" },
  }),
  5: () => ({
    step: "Run. Keep your balance over the gurneys and outrun the corridor collapse down to the EXIT sign.",
    mark: { place: "levelrun", id: "lrun-exit-sign" },
  }),
  6: () => ({
    step: "You survived the corridor collapse only because Phoebe pulled you through a ward. Speak with her in the alcove before heading back to Level 11.",
    mark: { place: "levelrun", id: "phoebe-lrun" },
  }),
};

export function syncCh2(s) {
  if (!s) return false;
  if (s.ch2Done) return false;
  const q = s.ch2Q ?? 0;
  if (!q || !STEP[q]) return false;
  const info = STEP[q](s);
  return setQuest(s, CH2.id, {
    name: CH2.name,
    step: info.step,
    mark: info.mark,
    main: true,
    kind: "main",
    briefing: "Chapter 2: Dina's trail through Level 11's clinic and Base Gamma's archive leads to an unstable hospital anomaly behind the strip mall.",
  });
}

export function setCh2Step(ctx, st, n, noticeText) {
  if (!st || st.ch2Done) return false;
  if (n <= (st.ch2Q ?? 0) || !STEP[n]) return false;
  st.ch2Q = n;
  syncCh2(st);
  if (noticeText) {
    st.notice = { text: noticeText, at: ctx.now() };
    pushFeed(st, noticeText, ctx.now(), "info");
  }
  if (n === 4 && !st.ch2WhisperDone) {
    st.ch2Whisper = { at: ctx.now() + 3000 };
  }
  return true;
}

export function ch2Tick(ctx, _ses, st, place = ctx.self?.place) {
  if (!st || st.menuOpen || st.cut || st.dcut || st.l26cut || st.hubcut || st.lrunCut || st.level == null) return false;

  // Tick restrained Chapter 2 Phoebe whisper once outside cutscenes/menus.
  if (st.ch2Whisper && !st.ch2WhisperDone && ctx.now() >= st.ch2Whisper.at) {
    st.ch2Whisper = null;
    st.ch2WhisperDone = 1;
    ctx.emit("playSound", { clip: WV(CH2_WHISPER_LINE), volume: 0.85, bus: "Voice" }, { audience: { player: ctx.self.id } });
    ctx.emit("uiEvent", { name: "caption", payload: { who: "???", text: CH2_WHISPER_LINE, ms: 4200 } }, { audience: { player: ctx.self.id } });
    pushFeed(st, `A voice, distant but dry: "${CH2_WHISPER_LINE}"`, ctx.now(), "info");
  }

  // Start Chapter 2 cleanly once Chapter 1 (dinaQ >= 9) is completed and player steps out of intake/tutorial.
  if (!st.ch2Q && !st.ch2Done && (st.dinaQ ?? 0) >= 9 && place !== "intake" && place !== "tutorial0" && place !== "bonus") {
    st.ch2Q = 1;
    syncCh2(st);
    const note = "Chapter 2 Started: The Dead Signal";
    st.notice = { text: note, at: ctx.now() };
    pushFeed(st, note, ctx.now(), "info");
    return false;
  }

  // If the player already crossed into Level ! while at Stage 4, update objective to the chase.
  if (place === "levelrun" && !st.lrunRescued && !st.ch2Done && (st.ch2Q ?? 0) >= 4 && (st.ch2Q ?? 0) < 5) {
    setCh2Step(ctx, st, 5);
  }
  if (st.lrunRescued && !st.ch2Done && (st.ch2Q ?? 0) < 6) {
    setCh2Step(ctx, st, 6);
  }

  syncCh2(st);
  return false;
}

export function completeChapter2(ctx, player, stance) {
  const s = player?.state;
  if (!s || s.ch2Done) return false;
  syncCh2(s);
  if (stance) s.phoebeStance = stance;
  s.ch2Done = 1;
  s.ch3Unlocked = 1;
  s.knowsMike = 1;
  s.ch2Q = 99;
  s.phoebeRescued = 1;
  s.lrunRescued = 1;
  s.phoebeReaction ??= REPLIES.find((r) => r.stance === s.phoebeStance)?.id ?? "thanks";
  // Chapter 3 waits quietly: conditions set, no title card. Chapter 3 owns ch3Q once it is written.
  s.ch3Ready = { from: "levelrun", reaction: s.phoebeReaction, at: ctx.now() };
  const stanceNote = REPLIES.find((r) => r.id === s.phoebeReaction)?.note ?? "She pulled you out to see what you'd do next.";

  endQuest(s, CH2.id, `Survived Level ! and spoke with Phoebe. ${stanceNote}`, "completed");
  s.payout = { xp: 450 };
  tellQuest(ctx, player, "Chapter 2 Complete: The Dead Signal · +450 XP");
  pushFeed(s, "Chapter 2 Complete: The Dead Signal (+450 XP)", ctx.now(), "info");
  return true;
}

export function ch2Choices(_ctx, it, s) {
  if (!it || !s || s.ch2Done) return [];
  const id = short(it);
  const q = s.ch2Q ?? 0;
  const out = [];

  if (id === "l11-meg-agent-vance" && q >= 1) {
    if (q === 1 && !megHostileCh2(s)) {
      out.push({ text: "Base Beta flagged Dina's relay frequency on Level 11. Where did she go?", tag: "Main Quest" });
    } else if (!s.ch2VanceDina && q >= 2) {
      out.push({ text: "What did M.E.G. actually want from River's drive?", tag: "Dina" });
    }
  }

  if (id === "l11-trader-kael" && q >= 1) {
    if (q === 1) {
      out.push({ text: "You trade near the strip mall. Did a woman carrying field batteries pass through here?", tag: "Main Quest" });
    } else if (!s.ch2KaelNote && q >= 2) {
      out.push({ text: "Did Dina say anything to you before she headed toward the clinic?", tag: "Dina" });
    }
  }

  if ((id === "gamma-moss" || id === "gamma-vale") && q === 3) {
    out.push({ text: "Dina's note mentioned an unmarked red threshold and someone matching old intake logs. Who came before?", tag: "Main Quest" });
  }
  if (id === "gamma-moss" && q >= 3 && s.knowsMike && !s.ch2MossFollow) {
    out.push({ text: "What else is in Base Gamma's file on Mike Sunderland?", tag: "Ask" });
  }
  if (id === "hub-amber-jo" && q === 3 && megHostileCh2(s)) {
    out.push({ text: "Dina left a warning on Level 11 about a red hospital door and an old runner. Do you know the name?", tag: "Main Quest" });
  }

  if (id === "phoebe-lrun" && q >= 6 && !s.ch2Done) {
    if (!s.ch2StancePicked) {
      for (const r of REPLIES) out.push({ text: r.q, tag: r.tag });
    } else {
      if (!s.ch2AskDina) out.push({ text: "What happens to Dina now? Did she get clear of Level 11?", tag: "Dina" });
      if (!s.ch2AskWard) out.push({ text: "How did you stop those things at the door?", tag: "Ask" });
      if (!s.ch2AskMike && !s.ch2SaidMike) out.push({ text: "Did you know Mike?", tag: "Ask" });
      out.push({ text: "Open the alcove threshold. I'm heading back to Level 11.", tag: "Finish Chapter 2" });
    }
  }

  return out;
}

export function handleDialogueCh2(ctx, player, npc, text) {
  const s = player?.state;
  if (!s || !npc || s.ch2Done) return null;
  const id = short(npc);
  const t = String(text ?? "").toLowerCase();
  const q = s.ch2Q ?? 0;

  // Stage 1 -> 2 via M.E.G. Agent Vance (Level 11 Base Beta)
  if (id === "l11-meg-agent-vance") {
    if (q === 1 && !megHostileCh2(s) && t.includes("dina's relay frequency")) {
      s.ch2Yellow = 1;
      setCh2Step(ctx, s, 2, "Objective Updated: Search Dina's cache in the Level 11 clinic");
      tellQuest(ctx, player, "Check the shuttered Centro Dermatologico clinic across the plaza.");
      return {
        reply: "She came through before dawn with two battery packs, wouldn't sign a manifest, and slipped into the shuttered clinic across the plaza. Weird part is there was an observer in yellow standing by the curb watching her go in.",
        mood: "calm",
      };
    }
    if (t.includes("river's drive") && !s.ch2VanceDina) {
      s.ch2VanceDina = 1;
      addRep(s, "meg", 1);
      return {
        reply: "Command wanted a reliable back-door index out of the upper levels. Dina told dispatch she'd deliver warnings to runners, not hand a tollbook to brass. Say what you want about her nerve, she kept three stragglers out of Level 6 last week.",
        mood: "calm",
      };
    }
  }

  // Stage 1 -> 2 (or lore beat) via Trader Kael (Level 11)
  if (id === "l11-trader-kael") {
    if (q === 1 && t.includes("carrying field batteries")) {
      s.ch2Yellow = 1;
      setCh2Step(ctx, s, 2, "Objective Updated: Search Dina's cache in the Level 11 clinic");
      tellQuest(ctx, player, "Search the reception desk inside Centro Dermatologico.");
      return {
        reply: "Short jacket, scuffed bag, counted her change down to the cent. She traded two fuses for gauze and slipped into the Centro Dermatologico across the street. Nobody followed her inside, though somebody in a faded yellow coat stood under the streetlamp watching the door until she left. Eyes caught the light funny. White, like a cat's.",
        mood: "calm",
      };
    }
    if (t.includes("anything to you before she headed") && !s.ch2KaelNote) {
      s.ch2KaelNote = 1;
      return {
        reply: "Only told me not to walk behind the clinic exam room after dusk. Said the hallway behind that wall didn't belong to the strip mall anymore, and she wasn't leaving River's drive anywhere near a shifting door.",
        mood: "calm",
      };
    }
  }

  // Stage 3 -> 4 via Base Gamma (Moss or Vale) or Camp Amber (Jo if M.E.G. hostile)
  if ((id === "gamma-moss" || id === "gamma-vale") && q === 3 && t.includes("old intake logs")) {
    s.knowsMike = 1;
    s.ch2Archive = 1;
    s.ch2Yellow = 1;
    setCh2Step(ctx, s, 4, "Chapter 2 Finale Ready: Enter the red door behind Level 11's clinic");
    tellQuest(ctx, player, "Return to Level 11 behind the Centro Dermatologico clinic.");
    if (id === "gamma-vale") {
      return {
        reply: "Only one intake sheet matches a red hospital hallway cutting behind concrete. Mike Sunderland. River's sister, no rank, no special kit. She just read exits faster than anyone else around here, until a corridor like that pulled her off the grid. Dina found the same seam behind the Level 11 clinic and sealed it before moving on.",
        mood: "calm",
      };
    }
    return {
      reply: "Mike Sunderland. River's sister. Plain gear, no rank, just quick on her feet and smart about which doors to skip. Scouts spotted somebody in yellow watching her runs before a red hospital hall swallowed her. If Dina marked that clinic door sealed, go in ready to run.",
      mood: "calm",
    };
  }

  if (id === "gamma-moss" && s.knowsMike && !s.ch2MossFollow && t.includes("file on mike sunderland")) {
    s.ch2MossFollow = 1;
    return {
      reply: "Thin folder. Boot tallies and water chits, mostly. What the debriefs noted was plain enough: she adapted faster than people with twice her training, right up until a shift caught her without a light.",
      mood: "calm",
    };
  }

  if (id === "hub-amber-jo" && q === 3 && megHostileCh2(s) && t.includes("red hospital door")) {
    s.knowsMike = 1;
    s.ch2Archive = 1;
    setCh2Step(ctx, s, 4, "Chapter 2 Finale Ready: Enter the red door behind Level 11's clinic");
    tellQuest(ctx, player, "Return to Level 11 behind the Centro Dermatologico clinic.");
    return {
      reply: "Mike Sunderland. People barely remember her unless they knew River. Just a lone runner who figured out floor rules twice as fast as M.E.G. scouts, until a red hospital seam took her. Dina left word not to open the one behind the Level 11 clinic unless you can sprint.",
      mood: "calm",
    };
  }

  // Stage 6 -> Phoebe Post-Rescue Finale inside Level ! Safe Alcove
  if (id === "phoebe-lrun" && q >= 6) {
    if (!s.ch2StancePicked) {
      const r = REPLIES.find((x) => t === x.q.toLowerCase() || t.includes(x.key));
      if (r) {
        s.ch2StancePicked = r.stance;
        s.phoebeStance = r.stance;
        s.phoebeReaction = r.id;
        if (r.id === "mike") { s.knowsMike = 1; s.ch2SaidMike = 1; }
        return { reply: r.a, mood: "calm" };
      }
    }

    if (s.ch2StancePicked) {
      if (t.includes("what happens to dina")) {
        s.ch2AskDina = 1;
        return {
          reply: "Dina reads her own notes. People who read their notes live. Mostly.",
          mood: "calm",
        };
      }
      if (t.includes("stop those things at the door")) {
        s.ch2AskWard = 1;
        return {
          reply: "I didn't stop them. I moved the hallway. They're still back there, running at a wall that isn't.",
          mood: "calm",
        };
      }
      if (t.includes("did you know mike")) {
        s.ch2AskMike = 1;
        s.knowsMike = 1;
        s.ch2SaidMike = 1;
        return {
          reply: "Knew of her. River's sister. Learned fast. A red seam took her before I got a good look. You, I got a good look at.",
          mood: "calm",
        };
      }
      if (t.includes("heading back to level 11")) {
        completeChapter2(ctx, player, s.phoebeStance ?? s.ch2StancePicked);
        npc.state.leaveAt = ctx.now() + 3500;
        const agiNote = (s.ch2AgilityUsed ?? 0) >= 6 || (s.attr ? Number(String(s.attr).split(",")[1]) >= 7 : false)
          ? "Good legs. Keep them."
          : "Slow legs. Smart head. We'll see which wins.";
        return {
          reply: `Door's open. Clinic's on the other side. ${agiNote}`,
          mood: "calm",
        };
      }
    }
  }

  return null;
}
