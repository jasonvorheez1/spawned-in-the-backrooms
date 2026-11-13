// Level 13 "Still Home": Noor (b6) asks you to check on Bea in the tenant flat a8. player.state.l13q: 1 go look, 2 get proof,
// 3 bring it back, 99 done (step numbers fixed: old saves). Proof is Bea's locket: off the kitchen counter (l13p-keepsake) or off
// the Tenant once it is down (l13p-keepsake-body, laid by questTick). The quiet way (Nov 13): Noor says Bea only ever watched the
// weather; retune a8's set to it ([Science 35], scripts/l13-tv.js → tuneTv) and the Tenant sways at the screen and throws nothing
// at you for two minutes (player.state.l13calm, read by scripts/l13-foes.js). Turn in to Noor, or hand it to the clerk as lost
// property (less cash, more B.N.T.G. standing). l13route: "counter" | "body" | "tv". l13end: "noor" | "clerk".
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep } from "./rep.js";
import { setQuest, endQuest, tellQuest } from "./quests.js";
import { rollCheck } from "./npc-talk.js";
import { apt, aptAt } from "./level13.js";
export const QID = "l13-still-home", QNAME = "Still Home";
export const NOOR = "l13p-noor", CLERK = "l13p-oona", KEEP = "l13p-keepsake", KEEP_BODY = "l13p-keepsake-body";
const A8 = apt("a8"), B6 = apt("b6");
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3", FAIL = "cdn/sfx-dull-low-wooden-thunk-fail-buzz.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const TAKE = "/cdn/moodboard-realistic-gritty/sfx-small-metal-locket-chain-picked-up-off-hard-surface.mp3";
const DIAL = "/cdn/moodboard-realistic-gritty/sfx-old-crt-television-dial-click-static-burst.mp3";
// my picks: what each ending pays; the quiet route adds a little (it is the harder thing to think of)
const PAY = { noor: { xp: 150, cents: 12000, rep: 8 }, clerk: { xp: 110, cents: 6000, rep: 15 } }, QUIET_XP = 40;
export const TUNE = { skill: "science", difficulty: 35, calmMs: 120000, retryMs: 12000 }; // my picks
const FLAT = A8?.num ?? "?", HOME = B6?.num ?? "?";
const TIPS = {
  1: `Check on Bea in Flat ${FLAT}, first hall, next door to the chess players`,
  2: `Bea is the Tenant now. Bring Noor her brass locket from the kitchen counter in Flat ${FLAT}: grab it and run, put the Tenant down, or retune its TV to the weather (Science 35) so it stays still`,
  "2tv": `The Tenant is swaying at the weather. Take Bea's locket off the kitchen counter in Flat ${FLAT} while it watches`,
  3: `Bring Bea's locket to Noor in Flat ${HOME}, or hand it in at Oona's desk by the lift as lost property`,
};
const MARKS = { 1: { place: "level13", id: "l13-door-a8" }, 2: { place: "level13", id: KEEP }, "2tv": { place: "level13", id: KEEP }, 3: { place: "level13", id: NOOR } };
const CHOICES = {
  start: "You look worried about more than packing.",
  about: "Tell me about Bea again.",
  weather: "Is there anything Bea loved? Anything that might reach her?",
  noor: "I found Bea's locket.",
  clerk: "Found this locket in a flat. Lost property?",
  after: "Are you really going tonight?",
};
const posOf = (p) => p.worldFeetPosition ?? p.feetPosition;
const tell = tellQuest; // scripts/lib/quests.js, shared
export function setL13(ctx, p, step, text, clip) {
  const s = p.state; s.l13q = step;
  const key = step === 2 && s.l13tuned ? "2tv" : step;
  setQuest(s, QID, { name: QNAME, step: TIPS[key], mark: MARKS[key] }); if (text) tell(ctx, p, text, clip);
}
function finish(ctx, p, who) {
  const s = p.state; if (s.l13q === 99) return; // paid once
  const pay = PAY[who], quiet = s.l13route === "tv", xp = pay.xp + (quiet ? QUIET_XP : 0);
  s.l13q = 99; s.l13locket = false; s.l13end = who;
  endQuest(s, QID, (who === "noor" ? "Gave Bea's locket to Noor" : "Handed Bea's locket in at the desk as lost property")
    + (s.l13route === "body" ? ". The Tenant in Flat " + FLAT + " is dead." : quiet ? ". Bea is still in there, watching the weather." : "."));
  s.cents = (s.cents ?? 0) + pay.cents;
  const tier = addRep(s, "bntg", pay.rep);
  const text = [`Quest Completed: ${QNAME} (+${xp} XP, +$${(pay.cents / 100).toFixed(2)})`, tier || `B.N.T.G. +${pay.rep}`].join(" · ");
  s.payout = { xp, items: [], text }; s.notice = { text, at: ctx.now() }; pushFeed(s, text, ctx.now(), "good");
  const pos = posOf(p);
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: "QUEST COMPLETED: STILL HOME", color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
}
// the locket, taken from the counter ("counter") or the downed Tenant ("body")
export function takeKeepsake(ctx, p, route) {
  const s = p?.state; if (!s) return;
  const q = s.l13q ?? 0;
  if (!q) { s.notice = { text: "A little brass locket with a dent in the lid. Somebody's. Not yours.", at: ctx.now() }; return; }
  if (q >= 3) { s.notice = { text: "You already have Bea's locket.", at: ctx.now() }; return; }
  s.l13locket = true; s.l13route = route === "body" ? "body" : s.l13tuned && (s.l13calm ?? 0) > ctx.now() ? "tv" : "counter";
  setL13(ctx, p, 3, `Bea's locket · ${s.l13route === "body" ? "taken from the Tenant" : s.l13route === "tv" ? "lifted while it watched the weather" : "snatched off the counter"}`, TAKE);
}
// Flat a8's television (scripts/l13-tv.js): on step 1 or 2, a Science roll turns it off the game show and onto the weather. true = handled.
export function tuneTv(ctx, p, flat) {
  const s = p?.state; if (!s || flat !== "a8") return false;
  const q = s.l13q ?? 0, now = ctx.now(); if (q !== 1 && q !== 2) return false;
  if ((s.l13calm ?? 0) > now) { s.notice = { text: "Clear skies over a town that isn't anywhere. The Tenant sways along. Leave it be.", at: now }; return true; }
  if (now - (s.l13tuneAt ?? -1e9) < TUNE.retryMs) { s.notice = { text: "Your hands are shaking. Give it a moment.", at: now }; return true; }
  s.l13tuneAt = now;
  const c = rollCheck(ctx, s, TUNE), pos = posOf(p);
  if (pos) heard(ctx, { clip: c.ok ? CHIME : FAIL, position: pos, volume: 0.5, maxDistance: 12 }, { audience: { player: p.id } });
  if (!c.ok) { tell(ctx, p, `[Science ${TUNE.difficulty}] Failed · The dial jumps channels and the game show roars back. Try again`, DIAL); return true; }
  s.l13calm = now + TUNE.calmMs; s.l13tuned = true;
  if (q === 1) s.l13q = 2;
  setL13(ctx, p, 2, `[Science ${TUNE.difficulty}] Succeeded · The weather comes in clear. The Tenant stops, and sways, and watches`, DIAL);
  return true;
}
export function l13Choices(id, s) {
  const q = s?.l13q ?? 0, out = [];
  if (id === NOOR) {
    if (!q) out.push({ text: CHOICES.start, tag: "Quest Start" });
    if (q === 1 || q === 2) out.push({ text: CHOICES.about, tag: "Quest" });
    if (q === 2 && !s.l13weather) out.push({ text: CHOICES.weather, tag: "Quest" });
    if (q === 3) out.push({ text: CHOICES.noor, tag: "Quest Turn-In" });
    if (q === 99 && !s.l13after) out.push({ text: CHOICES.after, tag: "Quest" });
  } else if (id === CLERK && q === 3) out.push({ text: CHOICES.clerk, tag: "Quest Turn-In" });
  return out;
}
export function handleDialogueQuest13(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(), q = s.l13q ?? 0;
  if (id === NOOR) {
    if (t.includes("more than packing") && !q) {
      setL13(ctx, p, 1, `Quest Started: ${QNAME} · Check on Bea in Flat ${FLAT}`);
      return { reply: "Bea. We came up the stairs together, two bags each, swore we'd only stop one night. She took the flat next to the chess players. A week ago she stopped answering. I knock and the telly gets louder. Go and look for me. If she's still Bea, tell her I'm leaving tonight, with or without her.", mood: "sad" };
    }
    if (t.includes("about bea") && (q === 1 || q === 2)) {
      return { reply: q === 1 ? `Flat ${FLAT}. First hall, next door to the two with the chess board. Knock first. She hated people who didn't knock.` : "So it's like that. Then bring me her locket. Brass, little dent in the lid where she dropped it on the stairs. She kept it by the kettle. I need to hold something, or I'll stand outside that door forever.", mood: "sad" };
    }
    if (t.includes("anything bea loved") && q === 2) {
      s.l13weather = true; setL13(ctx, p, 2);
      return { reply: "The weather. Not the forecast, the weather, the one on the late channel for a town nobody's from. Clear skies, forever. She said it was the only honest thing on. That game show in there isn't hers. If you can get the set back on her channel, maybe she'll sit still for it. Mind the plates while you try.", mood: "sad" };
    }
    if (t.includes("bea's locket") && q === 3) {
      const r = s.l13route; finish(ctx, p, "noor");
      return { reply: r === "body" ? "You took it off her. Don't tell me how. I can see how on your sleeve. Thank you. Here, I was saving this for a flat somewhere else. I don't want a flat anymore." : r === "tv" ? "She was watching the weather? Of course she was. Clear skies. You didn't hurt her. I don't know why that matters so much, but it does. Take this. And thank you for being gentle with what's left." : "That's the dent. That's hers. So she's still in there, and she isn't. Alright. Take this. I'm gone in an hour, and you should be too.", mood: "sad" };
    }
    if (t.includes("really going tonight") && q === 99) {
      s.l13after = true; const r = s.l13route, e = s.l13end;
      return { reply: e === "clerk" ? "Oona told me someone handed in a brass locket. Lost property. As if Bea was an umbrella. I signed for it. Of course I signed for it. I'm going. Don't sit down." : r === "body" ? "Bag's packed. Locket's on a string round my neck. I keep thinking I hear plates. I don't. Nobody's throwing anything in that flat now. Stay on your feet, walker." : r === "tv" ? "Tonight. I went and stood in her doorway. She didn't throw anything. Just watched her weather. I said goodbye to the back of her head, which is more than most people get. Stay on your feet." : "Tonight. One bag in, one bag out. Thank you for knocking when I couldn't. Stay on your feet.", mood: "sad" };
    }
    return null;
  }
  if (id === CLERK && t.includes("lost property") && q === 3) {
    finish(ctx, p, "clerk");
    return { reply: "Lovely, thank you! Straight into the lost property drawer. Somebody always comes back for these. The Project appreciates an honest applicant. Finder's fee, sign nothing, off you go.", mood: "happy" };
  }
  return null;
}
// every sim second: arriving at a8 moves 1 to 2; a Tenant put down in a8 leaves the locket on the body
export function questTick(ctx) {
  let want = false;
  for (const p of ctx.place.players) {
    const q = p.state?.l13q; if (q !== 1 && q !== 2) continue;
    const f = posOf(p); if (!f || !A8) continue;
    if (q === 1 && (aptAt(f.x, f.z)?.id === "a8" || Math.hypot(f.x - A8.door.x, f.z - A8.door.z) < 1.6)) setL13(ctx, p, 2, "This isn't Bea anymore · Noor will want proof");
    want = true;
  }
  if (!want || ctx.place.objects[KEEP_BODY] || !A8) return;
  const ids = new Set(ctx.place.players.map((p) => p.id));
  for (const o of ctx.query({ radius: 9, center: { x: A8.all.cx, y: 0, z: A8.all.cz } })) {
    if (ids.has(o.id) || o.id.startsWith("l13p-") || o.tags?.includes("npc") || o.tags?.includes("player")) continue;
    const st = o.state ?? {}; if (!(st.dead || (st.hp != null && st.hp <= 0))) continue;
    if (aptAt(o.feetPosition.x, o.feetPosition.z)?.id !== "a8") continue;
    ctx.spawn(KEEP_BODY, keepsakeSpec({ x: o.feetPosition.x + 0.25, y: 0.02, z: o.feetPosition.z + 0.2 }, "body"));
    break;
  }
}
const BRASS = { color: "oklch(0.72 0.11 85)", metalness: 0.9, roughness: 0.35 };
export const keepsakeSpec = (at, route) => ({
  tags: ["usable", "l13p"], feetPosition: at, rotation: { yaw: 35 }, castShadow: false,
  primitive: { kind: "sphere", radius: 0.5, widthSegments: 24, heightSegments: 14 }, scale: { x: 0.055, y: 0.02, z: 0.07 }, material: BRASS,
  behavior: "scripts/l13-keepsake.js",
  state: { name: "Bea's locket", verb: "Take", info: route === "body" ? "It was still around her neck." : "Brass, with a dent in the lid. By the kettle.", tint: "#e8c96a", route },
  children: [{ feetPosition: { x: 0, y: 0.5, z: -0.62 }, rotation: { pitch: 90 }, primitive: { kind: "torus", radius: 0.16, tube: 0.04, radialSegments: 8, tubularSegments: 20 }, material: BRASS, castShadow: false }],
});
