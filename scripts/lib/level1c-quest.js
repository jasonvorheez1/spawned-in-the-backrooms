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
  tips: { 1: "Reach the far side of the Tunnel Gang's hut at the end of Sector 2. Negotiate with Blade, pay, find a way around, or fight.", 2: "Beyond the hut, find the orange M.E.G. logger on the cordon barrier at the end of Sector 3. Read its crossing count.", 3: "Return to Ines at Post One in Sector 1 and report the logger's count." },
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
      return { reply: past ? "You've already been past the hut? Good. Our crossing logger is the orange box on the cordon barrier at the far end of the dark sector. We haven't read it in nine days. Bring me the count and I can decide whether to move this post." : "We count what comes out of Sector 4. The logger's on the cordon barrier, past the dark stretch, but Blade's people have blocked our route to it for nine days. Get past their hut, read the orange box and bring me the count. I need to know whether this post is still far enough back.", mood: "calm" };
    }
    if (t.includes("about the gang") && (q === 1 || q === 2)) {
      return { reply: q === 1 ? `Blade charges ${money(TOLL)} to pass. He thinks the light beyond the cordon is a way home, though none of them has reached it. Our medic says Marrow's leg is infected. Tobias also found a service gap behind the pipes in the south wall, just before their barricade. Talk, pay, or try the gap. I'd rather we didn't add more bodies to this hall.` : "Past the hut, keep your light on. The third sector is dark and there are Smilers in it. The hall widens at the cordon; the logger is the orange box fixed to the barrier. Read the number and come back the way you can.", mood: "calm" };
    }
    if (t.includes("cordon logger") && q === 3) {
      const r = s.l1cRoute, quiet = r && r !== "fight";
      finishLevelQuest(ctx, p, Q.key, Q, { xp: PAY.xp + (quiet ? QUIET_XP : 0), cents: PAY.cents, rep: [["meg", PAY.rep]], by: "meg", payKey: "l1c-walk-the-line" });
      return { reply: (s.l1cLogBad ? "Forty-one in nine days. The last count was four. I'll ask for another team and see whether we can move the post back. " : "") + (r === "fight" ? "I heard what happened at the hut. I'll send someone to check on the people there. Here's your pay." : r === "gap" ? "Tobias's gap got you through, then. I'll make sure the next runner knows about it. Here's your pay." : "Blade let you through. That's useful to know; perhaps we can arrange a regular run without another fight. Here's your pay."), mood: r === "fight" ? "sad" : "happy" };
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
      return { reply: "You'd go first? All right. If you make it back, tell us what you saw between here and the light. Marrow, let them through.", mood: "calm" };
    }
    if (t.includes("favouring his leg")) {
      const c = rollCheck(ctx, s, MED);
      if (!c.ok) { s.l1cMedFail = true; return { reply: "He says you didn't clean the cut properly. Leave him alone. Pay the toll or turn around.", mood: "annoyed" }; }
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
