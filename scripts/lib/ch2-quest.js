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
  const stanceNote = {
    suspicious: "You pushed back against her motives. She admitted she only intervened to keep watching what you might become.",
    frustrated: "You called out her waiting until collapse. She did not deny treating your near-death as a filter.",
    curious: "You pressed her on Mike Sunderland. She confirmed she watched River's sister once too, before losing the answer she wanted.",
    relieved: "You thanked her, and she cut it flat. Curiosity, not loyalty, kept you alive.",
  }[s.phoebeStance] ?? "Phoebe pulled you out of Level ! out of cold curiosity about how far you can adapt.";

  endQuest(s, CH2.id, `Survived Level ! and spoke with Phoebe. ${stanceNote} Chapter 3 awaits on the other side of Level 11.`, "completed");
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
      out.push({ text: "Why did you pull me out of there?", tag: "Suspicious" });
      out.push({ text: "You stood by and waited until the corridor collapsed on me.", tag: "Frustrated" });
      out.push({ text: "Is this about Mike Sunderland? You mentioned River's sister back on the ship.", tag: "Curious" });
      out.push({ text: "I shouldn't be breathing right now. Thank you.", tag: "Relieved" });
    } else {
      if (!s.ch2AskDina) out.push({ text: "What happens to Dina now? Did she get clear of Level 11?", tag: "Dina" });
      if (!s.ch2AskWard) out.push({ text: "How did you stop those things at the door?", tag: "Ask" });
      if (!s.ch2AskMike && !s.ch2SaidMike) out.push({ text: "Who was Mike Sunderland to you?", tag: "Ask" });
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
        reply: "She came through before dawn with two battery packs and refused to sign her manifest. Told me if Base Beta wanted River's routes, we could chart them ourselves instead of buying salvage off ships. Saw her duck into the shuttered clinic across from the café, and some quiet observer in yellow was watching from the curb ten seconds later.",
        mood: "calm",
      };
    }
    if (t.includes("river's drive") && !s.ch2VanceDina) {
      s.ch2VanceDina = 1;
      addRep(s, "meg", 1);
      return {
        reply: "Command wanted a reliable back-door index out of the upper levels. Dina told the dispatcher she'd hand-deliver warnings to runners, not hand a tollbook to brass. Say what you want about her nerve, she kept three stragglers out of Level 6 last week.",
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
        reply: "Short jacket, scuffed satchel, counted her change down to the cent. She traded two fuses for sterile gauze and slipped behind the Centro Dermatologico glass across the asphalt. Funny part? Nobody followed her inside, yet someone in a faded yellow coat waited by the streetlamp reading nothing until she left.",
        mood: "calm",
      };
    }
    if (t.includes("anything to you before she headed") && !s.ch2KaelNote) {
      s.ch2KaelNote = 1;
      return {
        reply: "Only told me not to walk behind the clinic exam room after dusk. Said the hallway behind the dry concrete wall didn't belong to the strip mall anymore, and she wasn't leaving River's drive anywhere near a shifting door.",
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
        reply: "Only one intake sheet matches that kind of sudden red hallway behind concrete. Mike Sunderland. River's sister, not an officer, not anyone with special kit. Just kept reading exits before anyone else spotted them, until a hospital corridor pulled her off the grid. Dina found the same seam behind that Level 11 clinic and sealed it before moving on.",
        mood: "calm",
      };
    }
    return {
      reply: "Mike Sunderland. River's sister. Ordinary gear, no rank, no tricks, just fast to read a bad room and stubborn enough to outlast veterans who froze. Before she vanished into an emergency hall like the one behind your Level 11 clinic, lookouts logged an unaffiliated observer in yellow watching her runs from afar. If Dina marked that door sealed, do not step through it unprepared.",
      mood: "calm",
    };
  }

  if (id === "gamma-moss" && s.knowsMike && !s.ch2MossFollow && t.includes("file on mike sunderland")) {
    s.ch2MossFollow = 1;
    return {
      reply: "Thin ledger, mostly boot tallies and water chits. No legends, no anomalies tied to her name. What stood out in debriefs was simple: she adapted faster than people twice her training, right up until a shift caught her without daylight.",
      mood: "calm",
    };
  }

  if (id === "hub-amber-jo" && q === 3 && megHostileCh2(s) && t.includes("red hospital door")) {
    s.knowsMike = 1;
    s.ch2Archive = 1;
    setCh2Step(ctx, s, 4, "Chapter 2 Finale Ready: Enter the red door behind Level 11's clinic");
    tellQuest(ctx, player, "Return to Level 11 behind the Centro Dermatologico clinic.");
    return {
      reply: "Mike Sunderland. People barely remember her unless they knew River. Just another lone runner who learned the floor rules twice as fast as anyone on M.E.G. payroll, until a red hospital seam swallowed her cold. Dina left word not to open the one behind the Level 11 clinic unless you can sprint.",
      mood: "calm",
    };
  }

  // Stage 6 -> Phoebe Post-Rescue Finale inside Level ! Safe Alcove
  if (id === "phoebe-lrun" && q >= 6) {
    if (!s.ch2StancePicked) {
      if (t.includes("why did you pull me out")) {
        s.ch2StancePicked = "suspicious";
        s.phoebeStance = "suspicious";
        return {
          reply: "Because a corpse stops giving me data. You didn't freeze when the chains snapped, you read the gurneys at full tilt, and you kept moving even when your lungs gave out. Most people with triple your gear die thirty meters past that sign.",
          mood: "calm",
        };
      }
      if (t.includes("waited until the corridor collapsed")) {
        s.ch2StancePicked = "frustrated";
        s.phoebeStance = "frustrated";
        return {
          reply: "If I pulled you out at the first siren, I would never know whether you could run through an ambush or only talk your way past clerks. You lasted to the final six meters. Now I know what you actually do when the margin hits zero.",
          mood: "calm",
        };
      }
      if (t.includes("mike sunderland")) {
        s.ch2StancePicked = "curious";
        s.phoebeStance = "curious";
        s.knowsMike = 1;
        s.ch2SaidMike = 1;
        return {
          reply: "Yes. Mike was River's sister. No bloodline secret, no hidden gift, nobody at all on paper. She just learned faster than the rooms changed, until one door beat her before I saw how far she could go. You have the same habit of surviving thin odds. I want to see what you become.",
          mood: "calm",
        };
      }
      if (t.includes("thank you")) {
        s.ch2StancePicked = "relieved";
        s.phoebeStance = "relieved";
        return {
          reply: "Keep your thanks. I did not step in out of loyalty or kindness, and you do not owe me a song. Stay alive long enough to stay interesting. That is the whole exchange.",
          mood: "calm",
        };
      }
    }

    if (s.ch2StancePicked) {
      if (t.includes("what happens to dina")) {
        s.ch2AskDina = 1;
        return {
          reply: "Dina kept out of the red hall by listening to her own notes instead of chasing ghosts behind concrete. If she stays as careful with River's drive as she was with your trail on Level 11, she will still be walking tomorrow.",
          mood: "calm",
        };
      }
      if (t.includes("stop those things at the door")) {
        s.ch2AskWard = 1;
        return {
          reply: "A local fold around the threshold, nothing grand enough to clear a horde. Hold a corridor seam open for two seconds, pull one stubborn runner through, let the wards bruise instead of breaking. Try standing there yourself and you will see what it costs.",
          mood: "calm",
        };
      }
      if (t.includes("who was mike sunderland")) {
        s.ch2AskMike = 1;
        s.knowsMike = 1;
        s.ch2SaidMike = 1;
        return {
          reply: "River's sister. Plain coat, worn boots, sharp eyes for exit patterns. She got farther than anyone expected with half-empty pockets and died before I had my answer. Don't confuse recognition with destiny. You are only yourself.",
          mood: "calm",
        };
      }
      if (t.includes("heading back to level 11")) {
        completeChapter2(ctx, player, s.phoebeStance ?? s.ch2StancePicked);
        npc.state.leaveAt = ctx.now() + 3500;
        const agiNote = (s.ch2AgilityUsed ?? 0) >= 6 || (s.attr ? Number(String(s.attr).split(",")[1]) >= 7 : false)
          ? "You kept your stride clean under pressure. Keep that habit when the next door opens."
          : "Catch your breath before you take another blind corridor. I will be watching to see what you grow into.";
        return {
          reply: `The alcove door leads back onto the clinic alley in Level 11. ${agiNote}`,
          mood: "calm",
        };
      }
    }
  }

  return null;
}
