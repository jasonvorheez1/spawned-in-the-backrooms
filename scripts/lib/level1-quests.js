// Level 1 talk quests (Shelly, Nov 9: "more quests where you talk to NPCS and at least one that gives you a unique weapon",
// "at least 3 stages ... alternate ways to do them ... killing them, passing a check, pickpocketing"; factions ride on every route).
// Each quest's step lives on player.state (<key>: 1..n, 99 done). Choices are offered at the top of an npc's card (l1Choice),
// answered here (handleDialogueQuest1), and the two non-talk routes ring in from interact.js (a lift) and player.js (a kill).
// Every number is Savi's pick.
import { rollCheck, keyOf } from "./npc-talk.js";
import { addRep, addKarma, GROUPS, repOf } from "./rep.js";
const NAMES = Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, v.name]));
import { setQuest, endQuest } from "./quests.js";
import { pushFeed } from "./feed.js";
import { setDinaStep } from "./dina-quest.js";
import { heard } from "./hear.js";

const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const MARK = (id) => ({ place: "level1", id });
export const UNIQUE = "revolver~lucky13"; // Callum's Lucky Thirteen: the one gun in the game nobody else has (scripts/lib/data/weapons.yml variants)

export const QUESTS1 = {
  rations: {
    key: "rationsQ", name: "Short Rations",
    tips: {
      1: "Find out who's been taking cans from Callum's crates",
      2: "Ale's been eating well. Deal with her",
      3: "Tell Callum what happened to his rations",
      4: "Tell Callum what happened to his rations",
    },
    marks: { 1: MARK("meg-ortiz"), 2: MARK("meg-ale"), 3: MARK("meg-callum"), 4: MARK("meg-callum") },
  },
  water: {
    key: "waterQ", name: "Bad Water",
    tips: {
      1: "Get purification tablets out of Callum for Dr. Ortiz",
      2: "Bring the purification tablets to Dr. Ortiz",
      3: "See Dr. Ortiz about the sick wanderer",
    },
    marks: { 1: MARK("meg-callum"), 2: MARK("meg-ortiz"), 3: MARK("meg-ortiz") },
  },
};

// ---- what the player can say (exact text is the key the handler answers)
const C = {
  rStart: "You're counting those cans like they owe you money. Something wrong?",
  rOrtiz: "Callum's rations are going missing. Seen anyone eating better than they should?",
  rTrack: "Let me look at the crates. Somebody always leaves a trail.",
  rAleSpeech: "Callum's cans. I know it's you, Ale. Why?",
  rAleBarter: "Twenty Backdollars and the cans stop walking. Deal?",
  rAleThreat: "Put them back or I tell Callum and he tells the M.E.G.",
  rAid: "Take two bottles of my almond water. Help me find a way to keep that family fed.",
  rResolve: "Ale took the cans for a family. I brought water. Can we help them instead of punishing her?",
  rTruth: "It was Ale. She's been taking your cans.",
  rCover: "Rats got into the crates. Gnawed tins everywhere. Nobody took anything.",
  rKilled: "It was Ale. She won't be taking anything anymore.",
  rVossTip: "Callum's cans are walking. You see everything that moves here. Who?",
  dVossAsk: "Found this chit in a bedroll on the SS Fun. Yours. Who'd you give it to?",
  dVossPay: "Fifty Backdollars says you remember the face.",
  dVossLean: "That drive starts a war, Voss. You want your name on it when it does?",
  rVossSell: "Ale's skimming Callum's crates for a family in the east halls. What's that worth to you?",
  wStart: "You look worried, doc. What's going on?",
  wAsk: "Ortiz needs purification tablets. She says you've got a tin.",
  wMed: "Bad water means sick runners, and sick runners eat your rations lying down.",
  wBuy: "Fifteen Backdollars for the tin. Paperwork can wait.",
  wGive: "Here. Purification tablets, straight from Callum's shelf.",
  wDone: "How's the patient?",
};
const TAG = { rTrack: "Survival 30", rAleSpeech: "Speech 40", rAleBarter: "Barter 30", rAleThreat: "Speech 55", rCover: "Speech 45", rVossTip: "Barter 35", dVossLean: "Speech 50", wMed: "Medicine 35", wBuy: "Barter 25" };
const CHECK = { rTrack: ["survival", 30], rAleSpeech: ["speech", 40], rAleBarter: ["barter", 30], rAleThreat: ["speech", 55], rCover: ["speech", 45], rVossTip: ["barter", 35], dVossLean: ["speech", 50], wMed: ["medicine", 35], wBuy: ["barter", 25] };
const opt = (k, tag) => ({ text: C[k], tag: tag ?? TAG[k] ?? "Quest" });
const who = (it) => String(it?.id ?? "").split("/").pop();

export function l1Choice(ctx, it, s, list) {
  if (!Array.isArray(list) || !s) return list;
  const id = who(it), r = s.rationsQ ?? 0, w = s.waterQ ?? 0, add = [], failed = s.l1Fail ?? {};
  if (id === "meg-callum") {
    if (!r && (s.rep?.meg ?? 0) > -35) add.push(opt("rStart", "Quest"));
    if (r === 1 && !s.rTracked) add.push(opt("rTrack"));
    if (r === 3) { add.push(opt(s.rAleDead ? "rKilled" : "rTruth", "Quest")); if (!s.rAleDead) { if (s.rAleTalked === "rAid") add.push(opt("rResolve", "Quest")); add.push(opt("rCover")); } }
    if (r === 4) add.push(opt(s.rAleDead ? "rKilled" : "rTruth", "Quest"));
    if (w === 1 && repOf(s, "meg") > -35) { add.push(opt("wAsk", "Quest")); add.push(opt("wMed")); if ((s.cents ?? 0) >= 1500) add.push(opt("wBuy")); }
  } else if (id === "meg-ortiz" && repOf(s, "meg") > -35) {
    if (r === 1) add.push(opt("rOrtiz", "Quest"));
    if (!w) add.push(opt("wStart", "Quest"));
    if (w === 2) add.push(opt("wGive", "Quest"));
    if (w === 3) add.push(opt("wDone", "Quest"));
  } else if (id === "bntg-voss" && repOf(s, "bntg") > -35) {
    if (r === 1 && (s.cents ?? 0) >= 1000) add.push(opt("rVossTip"));
    if (r === 3 && !s.rAleDead && s.rAleTalked && s.rAleTalked !== "lift") add.push(opt("rVossSell", "Quest"));
  }
  if (id === "bntg-voss" && s.dinaQ === 6) { // The Undelivered step 6 (dina-quest.js): who bought the chit. Talk, pay, or lean on him; or lift his ledger (questLift1)
    add.push(opt("dVossAsk", "Quest")); if ((s.cents ?? 0) >= 5000) add.push(opt("dVossPay", "$50")); add.push(opt("dVossLean"));
  }
  if (false) {
  } else if (id === "meg-ale") {
    if (r === 2) { add.push(opt("rAleSpeech")); if ((s.cents ?? 0) >= 2000) add.push(opt("rAleBarter")); add.push(opt("rAleThreat")); if ((s.almonds ?? 0) >= 2) add.push(opt("rAid", "2 almond water")); }
  }
  for (let i = add.length - 1; i >= 0; i--) if (failed[Object.keys(C).find((k) => C[k] === add[i].text)]) add.splice(i, 1);
  if (!add.length) return list;
  return [...add, ...list.filter((c) => !add.some((a) => a.text === c?.text))].slice(0, Math.max(4, add.length));
}

// ---- steps, rewards, standing
function note(ctx, p, text, kind = "info") { const s = p.state, now = ctx.now(); s.notice = { text, at: now }; pushFeed(s, text, now, kind); }
function ding(ctx, p, clip = CHIME, v = 0.7) { const pos = p.worldFeetPosition ?? p.feetPosition; if (pos) heard(ctx, { clip, position: pos, volume: v, maxDistance: 16 }, { audience: { player: p.id } }); }
export function setStep1(ctx, p, q, step, text, doneSummary, outcome) {
  const Q = QUESTS1[q], s = p?.state; if (!Q || !s) return;
  if ((s[Q.key] ?? 0) >= step && step !== 99) return;
  s[Q.key] = step;
  const id = Q.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (Q.tips[step]) setQuest(s, id, { name: Q.name, step: Q.tips[step], mark: Q.marks[step] ?? null });
  else endQuest(s, id, doneSummary ?? text, outcome);
  if (text) note(ctx, p, text); ding(ctx, p);
}
// friends pay better: Liked +25 %, Accepted +10 % on the giver's faction (her pick)
const BONUS = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };
function finish(ctx, p, q, { xp = 100, cents = 0, items = [], text, rep = [], by = "meg" }) {
  const s = p.state, msgs = [text], b = BONUS(s, by);
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${NAMES[by] ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  setStep1(ctx, p, q, 99, null, text);
  for (const [g, d] of rep) { if (!d) continue; const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d); msgs.push(tier || `${g === "karma" ? "Karma" : NAMES[g] ?? g} ${d > 0 ? "+" : ""}${d}`); }
  s.cents = (s.cents ?? 0) + cents;
  s.payout = { xp, items, text }; // scripts/craft.js hands these over on the player's own machine
  note(ctx, p, msgs.filter(Boolean).join(" · "), "good"); ding(ctx, p, FANFARE, 0.85);
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: `+${xp} XP`, color: "#ffc44d", size: 1.1 }, { audience: { player: p.id } });
}
function roll(ctx, p, it, k) {
  const [skill, difficulty] = CHECK[k], c = rollCheck(ctx, p.state, { skill, difficulty });
  ding(ctx, p, c.ok ? CHIME : FAIL, 0.5);
  if (!c.ok) p.state.l1Fail = { ...(p.state.l1Fail ?? {}), [k]: true };
  return c.ok;
}

// Ale's own memory of what you did: cold greeting and no favours, or a friend (scripts/talk.js reads rapport)
function aleFeels(ctx, p, v) { const a = ctx.getObject("meg-ale"); if (a && !a.state.dead) a.state.rapport = { ...(a.state.rapport ?? {}), [keyOf(p)]: v }; }

export function handleDialogueQuest1(ctx, p, it, text) {
  const s = p?.state; if (!s) return null;
  const k = Object.keys(C).find((x) => C[x] === text); if (!k) return null;
  const id = who(it), r = s.rationsQ ?? 0, w = s.waterQ ?? 0;

  // ---------------- Short Rations
  if (k === "rStart" && id === "meg-callum" && !r) {
    setStep1(ctx, p, "rations", 1, "Quest started: Short Rations");
    return { reply: "Forty-one cans Monday. Thirty-four now. Nobody here eats seven cans in two days, and the crates don't have legs. Find out who it is. Quietly.", mood: "annoyed" };
  }
  if (k === "rTrack" && id === "meg-callum" && r === 1) {
    s.rTracked = true;
    if (roll(ctx, p, it, k)) { setStep1(ctx, p, "rations", 2, "Scuffs lead from the crates to the scouts' bunks. Small boots. Ale's."); return { reply: "Small boots, light step, heads for the scouts' bunks. Only one scout here walks like that. Huh.", mood: "calm" }; }
    return { reply: "You're looking at the wrong crate. That's the bandages. Ask around instead, the doc sees everyone.", mood: "annoyed" };
  }
  if (k === "rOrtiz" && id === "meg-ortiz" && r === 1) {
    setStep1(ctx, p, "rations", 2, "Ortiz: Ale cut her hand on a tin lid. Fresh cut.");
    return { reply: "Ale came in yesterday with a cut across her palm. Tin lid, clean edge. She told me it was a door. Doors don't do that.", mood: "calm" };
  }
  if (id === "meg-ale" && r === 2 && k === "rAid") {
    if ((s.almonds ?? 0) < 2) return { reply: "You said two bottles. Come back when you have them.", mood: "annoyed" };
    s.almonds -= 2; s.rAleTalked = "rAid";
    setStep1(ctx, p, "rations", 3, "Gave Ale two almond waters. Ask Callum to help the family.");
    return { reply: "Two bottles. They'll last the kids a few days. It's a family out east. Callum won't like it, but maybe he'll listen to you.", mood: "happy" };
  }
  if (id === "meg-ale" && r === 2 && (k === "rAleSpeech" || k === "rAleBarter" || k === "rAleThreat")) {
    if (k === "rAleBarter" && (s.cents ?? 0) < 2000) return { reply: "Come back when you've got the twenty.", mood: "annoyed" };
    if (!roll(ctx, p, it, k)) {
      if (k === "rAleThreat") { addRep(s, "meg", -2); return { reply: "Tell him. He'll ask you where your proof is, and you'll have nothing. Walk.", mood: "angry" }; }
      return { reply: k === "rAleBarter" ? "Twenty? Cute. I don't sell my reasons." : "No idea what you're talking about. Go count something.", mood: "annoyed" };
    }
    s.rAleTalked = k;
    if (k === "rAleBarter") s.cents -= 2000;
    setStep1(ctx, p, "rations", 3, k === "rAleBarter" ? "Paid Ale $20. The cans stop walking." : "Ale admitted it. The cans go to a family hiding in the east halls.");
    return { reply: k === "rAleBarter" ? "Fine. Deal. It stops. Don't make that face, they were going to a good cause." : "There's a family in the east halls. Two kids. M.E.G. won't take them in without papers. So yeah, Callum's short. Tell him or don't.", mood: "calm" };
  }
  if (id === "meg-callum" && r === 3 && k === "rResolve" && s.rAleTalked === "rAid" && !s.rAleDead) {
    aleFeels(ctx, p, 45);
    finish(ctx, p, "rations", { xp: 130, cents: 500, items: ["bandage"], text: "Quest completed: Short Rations · found help for Ale's family", rep: [["meg", 3], ["survivors", 8], ["karma", 5]] });
    return { reply: "She should have asked. But the kids need to eat. I'll set aside a share, and Ale can run it out there. You paid in already. Take this for the road.", mood: "calm" };
  }
  if (id === "meg-callum" && (r === 3 || r === 4) && (k === "rTruth" || k === "rKilled")) {
    if (k === "rKilled") {
      finish(ctx, p, "rations", { xp: 90, cents: 2500, items: [], text: "Quest completed: Short Rations · +$25.00", rep: [["meg", -4]] });
      return { reply: "...I asked you to find out. Not that. Take your money and don't stand near my crates.", mood: "scared" };
    }
    const kind = s.rAleTalked !== "rAleBarter"; // she told you why
    aleFeels(ctx, p, -60);
    finish(ctx, p, "rations", { xp: 150, cents: 1500, items: ["weapon:" + UNIQUE, "ammo"], text: "Quest completed: Short Rations · Callum's Lucky Thirteen", rep: [["meg", 10], ["survivors", kind ? -3 : 0]] });
    return { reply: "Ale. Figures. I'll handle her. Here. My old thirty-eight, thirteen notches on the grip. Never jammed on me once. You earned it.", mood: "happy" };
  }
  if (k === "rCover" && id === "meg-callum" && (r === 3 || r === 4)) {
    if (!roll(ctx, p, it, k)) { setStep1(ctx, p, "rations", 4); addRep(s, "meg", -3); return { reply: "Rats don't open tins with a knife. Try again, and this time don't lie to me.", mood: "angry" }; }
    aleFeels(ctx, p, 45);
    finish(ctx, p, "rations", { xp: 120, cents: 1000, items: ["almond", "almond", "ration"], text: "Quest completed: Short Rations · you covered for Ale", rep: [["survivors", 8], ["karma", 5]] });
    return { reply: "Rats. Great. I'll set traps. Here, for your time. Don't tell anyone how many cans we have left.", mood: "calm" };
  }

  // ---------------- B.N.T.G.: buy the name, or sell Ale out
  if (id === "bntg-voss" && k === "rVossTip" && r === 1) {
    if ((s.cents ?? 0) < 1000) return { reply: "Come back with the ten.", mood: "annoyed" };
    if (!roll(ctx, p, it, k)) return { reply: "Information costs more than a smile. Come back with a better offer.", mood: "calm" };
    s.cents -= 1000; addRep(s, "bntg", 2);
    setStep1(ctx, p, "rations", 2, "Paid Voss $10: Ale's been trading tins in the east halls.");
    return { reply: "Ten. Pleasure. Ale's been swapping tins in the east halls. Not to me, which is the part that annoys me.", mood: "happy" };
  }
  if (id === "bntg-voss" && k === "rVossSell" && r === 3) {
    aleFeels(ctx, p, -80);
    finish(ctx, p, "rations", { xp: 110, cents: 4000, items: [], by: "bntg", text: "Quest completed: Short Rations · sold Ale's debt to the B.N.T.G.", rep: [["bntg", 12], ["survivors", -6], ["karma", -5]] });
    return { reply: "Unlicensed supply line. That's a debt now, and debts get paid. She'll work it off hauling for us. Forty, and you never heard my name.", mood: "happy" };
  }

  // ---------------- The Undelivered, step 6: the stowaway's chit
  if (id === "bntg-voss" && s.dinaQ === 6 && (k === "dVossAsk" || k === "dVossPay" || k === "dVossLean")) {
    if (k === "dVossAsk") return { reply: "I hand out a lot of chits. Memory's a service, friend. Services cost.", mood: "calm" };
    if (k === "dVossPay") {
      if ((s.cents ?? 0) < 5000) return { reply: "That's not fifty.", mood: "annoyed" };
      s.cents -= 5000; addRep(s, "bntg", 3);
      setDinaStep(ctx, s, 7, "Quest Updated: The Undelivered");
      return { reply: "Fifty. Lovely. Skinny kid, wet coat, wanted passage below the ship's waterline. Paid me in batteries. Said he had a buyer at the Electrical Station. That's all you bought.", mood: "happy" };
    }
    if (!roll(ctx, p, it, k)) { addRep(s, "bntg", -2); return { reply: "Threats from a nobody. Cute. Walk away before that gets expensive.", mood: "angry" }; }
    addRep(s, "bntg", -4);
    setDinaStep(ctx, s, 7, "Quest Updated: The Undelivered");
    return { reply: "...Fine. Keep my name out of it. Skinny kid, wet coat. Said his buyer waits at the Electrical Station. I never saw what he was carrying.", mood: "annoyed" };
  }

  // ---------------- Bad Water
  if (k === "wStart" && id === "meg-ortiz" && !w) {
    setStep1(ctx, p, "water", 1, "Quest started: Bad Water");
    return { reply: "Runner came in drinking from the dark puddles. Fever, shakes. I need purification tablets and Callum sits on the only tin like it's gold. Get it from him. However you get it.", mood: "calm" };
  }
  if (id === "meg-callum" && w === 1 && (k === "wAsk" || k === "wMed" || k === "wBuy")) {
    if (k === "wAsk") return { reply: "That tin is for emergencies. Fill out a form. We don't have forms. So, no.", mood: "annoyed" };
    if (k === "wBuy" && (s.cents ?? 0) < 1500) return { reply: "With what? Your charm?", mood: "annoyed" };
    if (!roll(ctx, p, it, k)) return { reply: k === "wBuy" ? "Fifteen? That tin's worth more than you." : "Nice speech. Still no.", mood: "annoyed" };
    if (k === "wBuy") s.cents = (s.cents ?? 0) - 1500;
    setStep1(ctx, p, "water", 2, "Got the purification tablets from Callum.");
    return { reply: k === "wBuy" ? "Sold. You didn't get it from me." : "...Fine. You're right, I hate that. Take it.", mood: "calm" };
  }
  if (k === "wGive" && id === "meg-ortiz" && w === 2) {
    setStep1(ctx, p, "water", 3, "Ortiz is treating the sick wanderer.");
    return { reply: "Good. Give me an hour with him. Come back and I'll have something for you.", mood: "happy" };
  }
  if (k === "wDone" && id === "meg-ortiz" && w === 3) {
    finish(ctx, p, "water", { xp: 110, cents: 0, items: ["firstaid", "bandage", "bandage"], text: "Quest completed: Bad Water", rep: [["meg", 8], ["karma", 3]] });
    return { reply: "Fever broke. He'll live, and he'll stop drinking puddles. Take these. A runner with a kit lives twice as long.", mood: "happy" };
  }
  return null;
}

// ---- the routes that aren't talk: called from interact.js liftOne (a pocket lifted clean) and player.js (a kill)
export function questLift1(ctx, p, it) {
  const s = p?.state, id = who(it); if (!s) return;
  if (id === "meg-ale" && (s.rationsQ === 1 || s.rationsQ === 2)) { s.rAleTalked = "lift"; setStep1(ctx, p, "rations", 3, "In Ale's pocket: Callum's crate tags, torn off seven cans."); }
  if (id === "bntg-voss" && s.dinaQ === 6) setDinaStep(ctx, s, 7, "In Voss's ledger: one chit, paid in batteries, \"buyer at the Electrical Station\".");
  if (id === "meg-callum" && s.waterQ === 1) setStep1(ctx, p, "water", 2, "Lifted the purification tablets off Callum.");
}
export function questKill1(ctx, p, victim) {
  const s = p?.state, id = who(victim); if (!s) return;
  if (id === "meg-ale" && (s.rationsQ === 1 || s.rationsQ === 2)) { s.rAleDead = true; setStep1(ctx, p, "rations", 3, "Callum's crate tags are in Ale's pocket."); }
  if (id === "meg-callum" && (s.rationsQ ?? 0) > 0 && (s.rationsQ ?? 0) < 99) setStep1(ctx, p, "rations", 99, "Short Rations failed: Callum is dead.", undefined, "failed");
  if (id === "meg-callum" && s.waterQ === 1) setStep1(ctx, p, "water", 2, "Took the purification tablets from Callum's body.");
  if (id === "meg-ortiz" && (s.waterQ ?? 0) > 0 && (s.waterQ ?? 0) < 99) setStep1(ctx, p, "water", 99, "Bad Water failed: Dr. Ortiz is dead.", undefined, "failed");
}
