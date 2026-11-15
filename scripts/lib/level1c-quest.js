// Level 1.1 "Walk the Line": Ines at Post One has not had a reading off the cordon logger in nine days, because the Tunnel
// Gang sits across the hall at the end of Sector 2. player.state.l1cq: 1 get past the gang, 2 read the logger at the cordon,
// 3 report to Ines, 99 done. Getting past Blade (player.state.l1cPass, read by places/level1c/sim.js): pay the toll, talk
// (Speech 35), dress Marrow's leg (Medicine 30), take the service gap in the south wall, or fight. l1cRoute records which.
import { advanceQuest, finishLevelQuest, tellQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import L from "./data/level1c.yml";
export const INES = "l1c-meg-ines", BLADE = "l1c-gang-blade", LOGGER = "l1c-cordon-log";
const P = "level1c";
export const Q = { key: "l1cq", name: "Walk the Line",
  tips: { 1: "Get past the Tunnel Gang's hut at the end of Sector 2: pay Blade, talk to him, find another way round, or fight", 2: "Read the M.E.G. logger at the cordon, at the end of Sector 3. Smilers keep to the dark there", 3: "Take the logger's reading back to Ines at Post One" },
  marks: { 1: { place: P, id: BLADE }, 2: { place: P, id: LOGGER }, 3: { place: P, id: INES } } };
const PAY = { xp: 180, cents: 9000, rep: 8 }, QUIET_XP = 40; // my picks: a little more for getting through with nobody hurt
const SPEECH = { skill: "speech", difficulty: 35 }, MED = { skill: "medicine", difficulty: 30 };
const TOLL = L.toll, money = (c) => "$" + (c / 100).toFixed(2);
const C = {
  start: "Is there work on this line?",
  about: "Tell me about the gang again.",
  turnin: "I read the cordon logger. Here are the numbers.",
  after: "What happens to the line now?",
  toll: "What does it cost to walk through?",
  pay: `Here. ${money(TOLL)}.`,
  speech: "You want the light. Let me walk the dark ahead of you and come back with what's in it.",
  med: "The one by the stove is favouring his leg. Let me dress it, and I walk through.",
};
const pass = (ctx, p, route, text) => { const s = p.state; s.l1cPass = true; s.l1cRoute ??= route; if (s.l1cq === 1) advanceQuest(ctx, p, Q, 2); tellQuest(ctx, p, text); };
export function l1cChoices(id, s) {
  const q = s?.l1cq ?? 0, out = [];
  if (id === INES) {
    if (!q) out.push({ text: C.start, tag: "Quest Start" });
    if (q === 1 || q === 2) out.push({ text: C.about, tag: "Quest" });
    if (q === 3) out.push({ text: C.turnin, tag: "Quest Turn-In" });
    if (q === 99 && !s.l1cAfter) out.push({ text: C.after, tag: "Quest" });
  } else if (id === BLADE && !s?.l1cPass) {
    out.push({ text: C.toll, tag: "Ask" });
    if ((s?.cents ?? 0) >= TOLL) out.push({ text: C.pay, tag: `Pay ${money(TOLL)}` });
    if (!s?.l1cSpeechFail) out.push({ text: C.speech, tag: "Speech 35", check: SPEECH });
    if (!s?.l1cMedFail) out.push({ text: C.med, tag: "Medicine 30", check: MED });
  }
  return out;
}
export function handleDialogueQuest1c(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(), q = s.l1cq ?? 0;
  if (id === INES) {
    if (t.includes("work on this line") && !q) {
      const past = !!s.l1cPass || !!s.l1cBeyond;
      advanceQuest(ctx, p, Q, past ? 2 : 1, `Quest Started: ${Q.name} · ${Q.tips[past ? 2 : 1]}`);
      return { reply: past ? "You've already been past the hut? Then you know the way. The logger is the orange box on the cordon barrier. Bring me the count." : "Good. Blade first, then the dark, then the orange box on the cordon barrier. Bring me the count, and bring yourself.", mood: "calm" };
    }
    if (t.includes("about the gang") && (q === 1 || q === 2)) {
      return { reply: q === 1 ? `Blade takes a toll. ${money(TOLL)} last I heard. He'll also listen, which is the strange thing about him. He thinks the light past Sector 4 is a door home and he's working up the nerve to walk at it. One of his people has a bad leg. And Tobias swears there's a service gap in the south wall a few steps before their barricade, behind the pipes. Any of those. I'd rather not hear you used the fourth.` : "You're past them. Good. Sector 3 is dark and it stays dark, a torch gets you a few feet. If you smell a hospital, that's normal. If you see teeth, don't stand still. The cordon is where the hall goes wide. The logger is the orange box on the barrier.", mood: "calm" };
    }
    if (t.includes("cordon logger") && q === 3) {
      const r = s.l1cRoute, quiet = r && r !== "fight";
      finishLevelQuest(ctx, p, Q.key, Q, { xp: PAY.xp + (quiet ? QUIET_XP : 0), cents: PAY.cents, rep: [["meg", PAY.rep]], by: "meg", payKey: "l1c-walk-the-line" });
      return { reply: (s.l1cLogBad ? "Forty-one crossings out. In nine days. It was four the time before. Something in Sector 4 is being pushed toward us. " : "") + (r === "fight" ? "And the hut is quiet, I'm told. I asked you not to, and I gave you no better way, so that one is mine to carry as well. Take your pay." : r === "gap" ? "And you went round them. Tobias will be unbearable about his gap. Take your pay, and thank you for leaving six fools alive." : "And they let you through. Then they can be talked to, which I'll remember. Take your pay."), mood: r === "fight" ? "sad" : "happy" };
    }
    if (t.includes("happens to the line") && q === 99) {
      s.l1cAfter = true;
      return { reply: s.l1cRoute === "fight" ? "We read the logger ourselves again. I sent Wren down to bury what was in the hut. Past the cordon nothing changes: we count, and we don't go in." : "I'm moving the cordon twenty yards back toward us and doubling the lamps. And I sent a crate of rations to the hut with a note that says the light is not a door. Blade sent the crate back empty and the note back unread. That's nearly a conversation.", mood: "calm" };
    }
    return null;
  }
  if (id === BLADE && !s.l1cPass) {
    if (t.includes("cost to walk through")) return { reply: `${money(TOLL)}, or something worth it. Everybody who walks past us walks toward our way out. We found it. We sat here and kept it. You want to look at it, you pay the people who kept it.`, mood: "annoyed" };
    if (t.includes(money(TOLL).toLowerCase()) && t.includes("here")) {
      if ((s.cents ?? 0) < TOLL) return { reply: "Count it again. Then come back.", mood: "annoyed" };
      s.cents -= TOLL; pass(ctx, p, "toll", `Paid the Tunnel Gang ${money(TOLL)} · They wave you through`);
      return { reply: "That'll do. Marrow, let them by. Keep to the middle of the floor past the tape. You'll see why.", mood: "calm" };
    }
    if (t.includes("walk the dark ahead of you")) {
      const c = rollCheck(ctx, s, SPEECH);
      if (!c.ok) { s.l1cSpeechFail = true; return { reply: "And never come back, and I've given the door away for a promise. No. Money, or turn round.", mood: "annoyed" }; }
      pass(ctx, p, "speech", "Blade lets you through to scout the dark for him");
      return { reply: "...Huh. Nobody's offered to go first before. Fine. You walk it. You come back and tell me what's between here and the light. If you don't come back, that tells me something too.", mood: "calm" };
    }
    if (t.includes("favouring his leg")) {
      const c = rollCheck(ctx, s, MED);
      if (!c.ok) { s.l1cMedFail = true; return { reply: "Marrow says you hold a bandage like a sandwich. Hands off him. Money, or turn round.", mood: "annoyed" }; }
      pass(ctx, p, "medicine", "You clean and dress Marrow's leg · The Tunnel Gang lets you through");
      return { reply: "He's stopped swearing. That's the first time in a week. Go on, then. And if you find anything for a fever down there, we're buying.", mood: "happy" };
    }
  }
  return null;
}
// every sim second: who has got past the hut, who has reached the cordon
export function questTick1c(ctx) {
  for (const p of ctx.place.players) {
    const s = p.state, f = p.feetPosition; if (!s || !f) continue;
    if (f.x > L.gangEnd + 4 && !s.l1cBeyond) { s.l1cBeyond = true; if (!s.l1cPass) s.l1cRoute ??= s.l1cTrespass ? "fight" : "gap"; }
    if (s.l1cq === 1 && s.l1cBeyond) advanceQuest(ctx, p, Q, 2);
  }
}
// the orange logger on the cordon barrier (places/level1c/sim.js lays it; scripts/l1c-use.js presses it)
export function readLogger(ctx, p) {
  const s = p.state;
  if (s.l1cq === 2) { s.l1cLogBad = true; advanceQuest(ctx, p, Q, 3, `${Q.name} · The logger reads 41 crossings out of Sector 4 in nine days · ${Q.tips[3]}`); return; }
  s.notice = { text: s.l1cq >= 3 ? "The counter has not moved since you read it" : "M.E.G. CROSSING LOGGER · OUT OF SECTOR 4: 41 · LAST READ: 9 DAYS", at: ctx.now() };
}
