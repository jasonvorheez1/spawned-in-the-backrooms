// Level 31 "Side B" (Shelly Nov 12: choose B.N.T.G. or the facelings, the loser goes hostile, long, a new item, FNV feel).
// player.state.l31q: 1 ask the Coach and the DJ about the master tape, 2 get it out of the crate behind the cinema screen,
// 3 decide who gets it, 4 the route's last leg, 99 done. l31route: "bntg" | "rink" | "dub". l31qh = { coach, dj } hints heard.
// Siding writes rep: the losing group drops to Vilified, so its people (meg-agent, fists only: Level 31 has no weapons) attack on sight.
// The new item is the mixtape "Side B" (snacks.yml mixtape: a keepsake you play for sanity).
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep } from "./rep.js";
import { setQuest, endQuest, tellQuest, claimReward } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
export const QID = "l31-side-b", QNAME = "Side B";
export const MARLOWE = "l31-q-marlowe", DEZ = "l31-q-dez", CRATE = "l31-q-crate", DECK = "l31-dj-deck";
const DJ = "l31-dj", COACH = "l31-coach", CLERK = "l31-food-clerk";
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3", FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const CLUNK = "/cdn/moodboard-realistic-gritty/sfx-old-metal-lockbox-latch-snaps-open-lid-creaks.mp3";
const DUB = "/cdn/moodboard-toon-vibrant/sfx-cassette-deck-high-speed-dubbing-whir-then-click.mp3";
// my picks: what each ending pays
const PAY = { bntg: { xp: 320, cents: 20000 }, bntgHi: { xp: 340, cents: 35000 }, rink: { xp: 360, cents: 4000 }, dub: { xp: 420, cents: 15000 } };
const M = (id) => ({ place: "level31", id });
const TIPS = {
  1: "Ask the Coach at the skate rental counter and the DJ in the booth over the rink about Side B.",
  2: "Open the steel crate in the dark back corner behind the cinema screen. A green card from the arcade fits the slot, or pick the lock (Lockpick 40).",
  3: "Decide who gets Side B: sell it to Marlowe at the B.N.T.G. stall on the south carpet (Barter 45 for more, Speech 50 to sell him a copy instead), or give it back to the DJ in the booth.",
  "4bntg": "Collect the rest of your pay from Dez in the dark corner by the plywood exit. The rink regulars want you hurt.",
  "4rink": "Tell the Coach at skate rental that the DJ has his master back. Marlowe's crew want you hurt.",
  "4dub": "Dub a copy on the tape deck in the DJ booth.",
};
const MARKS = { 2: M(CRATE), 3: M(MARLOWE), "4bntg": M(DEZ), "4rink": M(COACH), "4dub": M(DECK) };
const CHOICES = {
  start: "Nice table. Buying or selling?",
  remind: "Where should I look for the tape?",
  sell: "Here's your tape.",
  barter: "[Barter 45] The master is worth more than three hundred.",
  speech: "[Speech 50] Sell a copy. Leave the DJ his master.",
  copy: "Here's the dub.",
  coachHint: "What do you know about the DJ's master tape?",
  coachReturn: "The DJ has the master again.",
  coachAfter: "About the tape...",
  djHint: "Is there a master tape?",
  djReturn: "I found your tape. I want you to have it back.",
  clerkHint: "Where does the DJ go on break?",
  collect: "Marlowe said you have the rest of my pay.",
  marAfter: "How's business?",
  djAfter: "How does it sound now?",
};
function logStep(s) {
  const step = s.l31q;
  const key = step === 4 ? "4" + s.l31route : step;
  const hints = s.l31qh ?? {};
  const copyReady = key === "4dub" && s.l31dub;
  const tip = copyReady ? "Bring Marlowe the copy at the B.N.T.G. stall on the south carpet. The master stays with the DJ."
    : step === 1 && hints.coach ? "Ask the DJ in the booth over the rink about Side B."
    : step === 1 && hints.dj ? "Ask the Coach at the skate rental counter about Side B."
    : TIPS[key];
  const mark = copyReady ? M(MARLOWE) : step === 1 ? M(hints.coach ? DJ : COACH) : MARKS[key];
  setQuest(s, QID, { name: QNAME, step: tip, mark });
}
const posOf = (p) => p.worldFeetPosition ?? p.feetPosition;
const tell = tellQuest; // scripts/lib/quests.js, shared
function setStep(ctx, p, step, text, clip) {
  const s = p.state; s.l31q = step;
  logStep(s);
  if (text) tell(ctx, p, text, clip);
}
function giveTape(s) { s.snacks = { ...(s.snacks ?? {}), mixtape: (s.snacks?.mixtape ?? 0) + 1 }; }
// the side you pick: the other side's people go Vilified (attack on sight); B.N.T.G. proper hears about it too
function side(ctx, p, route) {
  const s = p.state; s.l31route = route; s.l31tape = route === "dub";
  const rep = { ...(s.rep ?? {}) };
  if (route === "bntg") { rep.rink = -100; rep.bntg = Math.max(rep.bntg ?? 0, 40); }
  if (route === "rink") { rep.concession = -100; rep.rink = Math.max(rep.rink ?? 0, 60); }
  s.rep = rep;
  if (route === "bntg") addRep(s, "bntg", 10); if (route === "rink") addRep(s, "bntg", -15);
  if (route === "dub") { addRep(s, "rink", 20); addRep(s, "bntg", 20); }
}
function finish(ctx, p, payKey, text) {
  const s = p.state, pay = PAY[payKey]; if (!claimReward(s, QID)) { s.l31q = 99; return; } s.l31q = 99; s.l31tape = false; giveTape(s);
  endQuest(s, QID, text);
  s.cents = (s.cents ?? 0) + pay.cents;
  const line = `Side B complete. You receive a mixtape, ${pay.xp} XP and $${(pay.cents / 100).toFixed(2)}.`;
  s.payout = { xp: pay.xp, items: [], text: line }; s.notice = { text: line, at: ctx.now() }; pushFeed(s, line, ctx.now(), "good");
  const pos = posOf(p);
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: "QUEST COMPLETED: SIDE B", color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
}
function hint(ctx, p, who) {
  const s = p.state; s.l31qh = { ...(s.l31qh ?? {}), [who]: true };
  if (s.l31q === 1 && s.l31qh.coach && s.l31qh.dj) setStep(ctx, p, 2, "The master is in a crate behind the cinema screen.");
  else logStep(s);
}
// the crate behind the screen: a green card from the arcade opens it, or Lockpick 40
export function openCrate(ctx, p) {
  const s = p?.state; if (!s) return; const now = ctx.now();
  if (!s.l31q || s.l31q < 2) { s.notice = { text: "A green stripe runs along the card slot under the lock.", at: now }; return; }
  if (s.l31q > 2) { s.notice = { text: "The cassette left a clean rectangle in the dust.", at: now }; return; }
  if (!s.l31card) {
    if (now - (s.l31pickAt ?? -1e9) < 15000) { s.notice = { text: "Try the lock again in a moment, or use a green card from the arcade.", at: now }; return; }
    s.l31pickAt = now;
    const c = rollCheck(ctx, s, { skill: "lockpick", difficulty: 40 });
    if (!c.ok) { tell(ctx, p, "[Lockpick 40] The pin won't set. Try the arcade's green card.", FAIL); return; }
  }
  s.l31tape = true; s.l31tapeHow = s.l31card ? "card" : "pick";
  setStep(ctx, p, 3, "You take Side B. The label is in the DJ's handwriting.", CLUNK);
}
// the DJ deck: on the dub route, a press runs the copy
export function useDeck(ctx, p) {
  const s = p?.state; if (!s) return; const now = ctx.now();
  if (s.l31q === 4 && s.l31route === "dub" && !s.l31dub) {
    s.l31dub = true;
    tell(ctx, p, "The deck clicks off. You take the copy and leave the master with the DJ.", DUB);
    logStep(s);
    return;
  }
  s.notice = { text: "The tape deck has a second well for a blank cassette.", at: now };
}
export function l31Choices(id, s) {
  const q = s?.l31q ?? 0, h = s?.l31qh ?? {}, r = s?.l31route, out = [];
  if (id === MARLOWE) {
    if (!q) out.push({ text: CHOICES.start, tag: "Quest Start" });
    if (q === 1 || q === 2) out.push({ text: CHOICES.remind, tag: "Quest" });
    if (q === 3) {
      out.push({ text: CHOICES.sell, tag: "Quest Turn-In" });
      if (!s.l31barterFail) out.push({ text: CHOICES.barter, tag: "Quest" });
      if (!s.l31speechFail) out.push({ text: CHOICES.speech, tag: "Quest" });
    }
    if (q === 4 && r === "dub" && s.l31dub) out.push({ text: CHOICES.copy, tag: "Quest Turn-In" });
    if (q === 99 && !s.l31marAfter && r !== "rink") out.push({ text: CHOICES.marAfter, tag: "Quest" });
  }
  if (id === COACH) {
    if (q === 1 && !h.coach) out.push({ text: CHOICES.coachHint, tag: "Quest" });
    if (q === 4 && r === "rink") out.push({ text: CHOICES.coachReturn, tag: "Quest Turn-In" });
    if (q === 99 && !s.l31coachAfter) out.push({ text: CHOICES.coachAfter, tag: "Quest" });
  }
  if (id === DJ) {
    if (q === 1 && !h.dj) out.push({ text: CHOICES.djHint, tag: "Quest" });
    if (q === 3) out.push({ text: CHOICES.djReturn, tag: "Quest Turn-In" });
    if (q === 99 && !s.l31djAfter && r !== "bntg") out.push({ text: CHOICES.djAfter, tag: "Quest" });
  }
  if (id === CLERK && q === 1 && !h.dj) out.push({ text: CHOICES.clerkHint, tag: "Quest" });
  if (id === DEZ && q === 4 && r === "bntg") out.push({ text: CHOICES.collect, tag: "Quest Turn-In" });
  return out;
}
export function handleDialogueQuest31(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  const chose = (key, previous) => t === CHOICES[key].toLowerCase() || (previous && t.includes(previous));
  if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(), q = s.l31q ?? 0, pos = posOf(p);
  const roll = (skill, difficulty) => { const c = rollCheck(ctx, s, { skill, difficulty }); if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 16 }, { audience: { player: p.id } }); return c.ok; };
  if (id === MARLOWE) {
    if (chose("start") && !q) {
      setStep(ctx, p, 1, "Side B started. Ask the Coach and the DJ about the master.");
      return { reply: "Both. Always both. Here's the pitch. The faceling in the booth has a tape. One tape. Every song in this rink is on it, and it's why the place feels like your eighth birthday party. I dub that, I sell comfort by the cassette from here to Level 11. Three hundred backdollars to whoever brings it. Ask the coach where it lives. He'll lie nicely. And if anyone with no face asks, you're here for the skating.", mood: "happy" };
    }
    if (chose("remind", "what i'm stealing") && (q === 1 || q === 2)) {
      return { reply: q === 1 ? "Borrowing. The DJ's master tape. Talk to the coach and the faceling in the booth. Somebody knows where he hides it." : "Behind the cinema screen. Crate with a card lock. Arcade cards fit everything in here, it's a real design flaw.", mood: "calm" };
    }
    if (chose("sell") && q === 3) {
      side(ctx, p, "bntg"); setStep(ctx, p, 4, "Marlowe has the master. The rink regulars turn on you.");
      s.cents = (s.cents ?? 0) + 10000;
      return { reply: "Look at that. Hundred now. The other two hundred is with Dez at the plywood door, because I am not walking around with three hundred dollars in a building full of faces that just found out. Oh. They found out. Run.", mood: "happy" };
    }
    if (chose("barter") && q === 3) {
      if (!roll("barter", 45)) { s.l31barterFail = true; return { reply: "Price is the price, friend. I've got a family. I don't, but I could.", mood: "annoyed" }; }
      side(ctx, p, "bntg"); s.l31hi = true; setStep(ctx, p, 4, "[Barter 45] Marlowe agrees to $450. The rink regulars turn on you.");
      s.cents = (s.cents ?? 0) + 10000;
      return { reply: "You're a crook. I like crooks. Four-fifty. Hundred now, the rest with Dez at the door. Go fast, they're already looking at you funny. Funnier. No faces, it's hard to tell.", mood: "happy" };
    }
    if (chose("speech") && q === 3) {
      if (!roll("speech", 50)) { s.l31speechFail = true; return { reply: "A copy of a copy sounds like a copy. I want the master. Cute speech though.", mood: "annoyed" }; }
      side(ctx, p, "dub"); setStep(ctx, p, 4, "[Speech 50] Marlowe agrees to take a copy.");
      return { reply: "Huh. Nobody gets hurt, I still have product, and I don't get punched by a guy with no face. Fine. Dub it on his own deck. Bring me the copy. I'm told I'm reasonable sometimes.", mood: "calm" };
    }
    if (chose("copy", "one dub") && q === 4 && s.l31route === "dub" && s.l31dub) {
      finish(ctx, p, "dub", "The DJ kept the master. Marlowe got a copy.");
      return { reply: "Hiss on the B side. Customers will call that vintage. Pleasure. There's an extra dub in there for you, I'm not a monster.", mood: "happy" };
    }
    if (chose("marAfter") && q === 99 && s.l31route !== "rink") {
      s.l31marAfter = true;
      return s.l31route === "dub"
        ? { reply: "Booming. Copies sell, nobody bleeds, and the faceling in the booth nods at me now. I think it's a nod. I'm calling it a nod. You ever want work that doesn't keep me up at night, you know where the table is.", mood: "happy" }
        : { reply: "Shipped forty dubs to Level 11 yesterday. People cry when they play it. Good crying, mostly. The regulars here won't look at me. Course, they can't look at anyone. Keep your head down on the carpet, friend. They remember you better than me.", mood: "calm" };
    }
    return null;
  }
  if (id === COACH) {
    if (chose("coachHint") && q === 1 && !s.l31qh?.coach) {
      hint(ctx, p, "coach");
      return { reply: "So Marlowe found you. Yeah, there's a tape. Every song you hear in here is on it. I don't know if the tape makes the rink or the rink makes the tape, and I've decided I'd rather not find out. If you take it, take it because you mean it. Not for three hundred bucks.", mood: "sad" };
    }
    if (chose("coachReturn", "back where it belongs") && q === 4 && s.l31route === "rink") {
      finish(ctx, p, "rink", "Returned the master to the DJ and collected a copy from the Coach.");
      return { reply: "I heard. The whole building heard, it's playing louder. The DJ left something on my counter for you. He doesn't make a lot of those. Take care of it. And go see somewhere else for a while, huh?", mood: "happy" };
    }
    if (chose("coachAfter") && q === 99) {
      s.l31coachAfter = true; const r = s.l31route;
      return { reply: r === "bntg" ? "I'm not mad. I'm a little sad. They'll sell it to people who'll never come here, and it'll sound like a room they can't find. Lace up if you want. They won't, but I will." : r === "dub" ? "A copy and a master. That's the most grown up thing anybody's done in here in a while." : "You did a kind thing for somebody who can't say thank you. That's the best kind.", mood: r === "bntg" ? "sad" : "happy" };
    }
    return null;
  }
  if (id === DJ) {
    if (chose("djHint") && q === 1 && !s.l31qh?.dj) {
      hint(ctx, p, "dj");
      return { reply: "You mean Side B. I hide it in the cinema, behind the screen, where it's dark. If it's in here with me, I just keep playing it. Please don't take it far.", mood: "calm" };
    }
    if (chose("djReturn", "giving it back") && q === 3) {
      side(ctx, p, "rink"); setStep(ctx, p, 4, "The DJ has the master. Marlowe's crew turns on you.");
      return { reply: "Oh. Oh, you brought it back. Listen, it sounds right again. I don't have anything for you. The Coach will. I'll tell him.", mood: "happy" };
    }
    if (chose("djAfter") && q === 99 && s.l31route !== "bntg") {
      s.l31djAfter = true;
      return s.l31route === "dub"
        ? { reply: "Like it's in the room. The master stays in the dark behind the screen, and a copy goes walking. I didn't know a song could be in two places at once. I think I like it. Skate a lap. This one's for you.", mood: "happy" }
        : { reply: "Right. It sounds right. Listen, the bass is coming back into the floor. That's the rink breathing. Thank you for not selling it. Skate a lap before you go.", mood: "happy" };
    }
    return null;
  }
  if (id === CLERK && chose("clerkHint") && q === 1) {
    hint(ctx, p, "dj");
    return { reply: "The cinema. Back corner. He carries something small and he walks like it's heavy. I don't ask. I make pizza.", mood: "calm" };
  }
  if (id === DEZ && chose("collect", "rest of my money") && q === 4 && s.l31route === "bntg") {
    finish(ctx, p, s.l31hi ? "bntgHi" : "bntg", "Sold the master to Marlowe and collected the balance from Dez.");
    return { reply: "You made it across. Marlowe had odds on that. Here's your money, and a dub, he says it's a thank you, I say it's advertising. Don't come back here for a while.", mood: "calm" };
  }
  return null;
}
