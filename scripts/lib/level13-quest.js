// Level 13 "Still Home": Noor (b6) asks you to check on Bea in the tenant flat a8. player.state.l13q: 1 go look, 2 get proof,
// 3 bring it back, 99 done. Proof is Bea's locket: off the kitchen counter (l13p-keepsake) or off the Tenant once it is down
// (l13p-keepsake-body, laid by questTick). Turn in to Noor, or hand it to the clerk as lost property (less cash, more B.N.T.G. standing).
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep } from "./rep.js";
import { setQuest, endQuest, tellQuest, claimReward } from "./quests.js";
import { apt, aptAt } from "./level13.js";
export const QID = "l13-still-home", QNAME = "Still Home";
export const NOOR = "l13p-noor", CLERK = "l13p-oona", KEEP = "l13p-keepsake", KEEP_BODY = "l13p-keepsake-body";
const A8 = apt("a8");
const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const TAKE = "/cdn/moodboard-realistic-gritty/sfx-small-metal-locket-chain-picked-up-off-hard-surface.mp3";
const PAY = { noor: { xp: 150, cents: 12000, rep: 8 }, clerk: { xp: 110, cents: 6000, rep: 15 } }; // my picks
const TIPS = {
  1: `Check on Bea in Flat ${A8?.num ?? "?"}, first hall, next to the chess players`,
  2: "Bring Noor proof: Bea's locket is on the kitchen counter. Grab it and run, or put the Tenant down and take it from the body",
  3: "Bring Bea's locket back to Noor before she leaves",
};
const MARKS = { 1: { place: "level13", id: "l13-door-a8" }, 2: { place: "level13", id: KEEP }, 3: { place: "level13", id: NOOR } };
const posOf = (p) => p.worldFeetPosition ?? p.feetPosition;
const tell = tellQuest; // scripts/lib/quests.js, shared
export function setL13(ctx, p, step, text, clip) {
  p.state.l13q = step; setQuest(p.state, QID, { name: QNAME, step: TIPS[step], mark: MARKS[step] }); if (text) tell(ctx, p, text, clip);
}
function finish(ctx, p, who) {
  const s = p.state, pay = PAY[who]; if (!claimReward(s, QID)) { s.l13q = 99; return; } s.l13q = 99; s.l13locket = false; s.l13end = who;
  endQuest(s, QID, who === "noor" ? "Gave Bea's locket to Noor" : "Handed Bea's locket in at the desk");
  s.cents = (s.cents ?? 0) + pay.cents;
  const tier = addRep(s, "bntg", pay.rep);
  const text = [`Quest Completed: ${QNAME} (+${pay.xp} XP, +$${(pay.cents / 100).toFixed(2)})`, tier || `B.N.T.G. +${pay.rep}`].join(" · ");
  s.payout = { xp: pay.xp, items: [], text }; s.notice = { text, at: ctx.now() }; pushFeed(s, text, ctx.now(), "good");
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
  if (!q) { s.notice = { text: "A little brass locket. Somebody's. Not yours.", at: ctx.now() }; return; }
  if (q >= 3) { s.notice = { text: "You already have Bea's locket.", at: ctx.now() }; return; }
  s.l13locket = true; s.l13route = route === "body" ? "body" : "counter";
  setL13(ctx, p, 3, `Bea's locket · ${route === "body" ? "taken from the Tenant" : "lifted off the counter"}`, TAKE);
}
export function l13Choices(id, s) {
  const q = s?.l13q ?? 0, out = [];
  if (id === NOOR) {
    if (!q) out.push({ text: "You look worried about more than packing.", tag: "Quest Start" });
    if (q === 1 || q === 2) out.push({ text: "Tell me about Bea again.", tag: "Quest" });
    if (q === 3) out.push({ text: "I found Bea's locket.", tag: "Quest Turn-In" });
  } else if (id === CLERK && q === 3) out.push({ text: "Found this locket in a flat. Lost property?", tag: "Quest Turn-In" });
  return out;
}
export function handleDialogueQuest13(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state;
  if (!s || !npc) return null;
  const id = String(npc.id ?? "").split("/").pop(), q = s.l13q ?? 0;
  if (id === NOOR) {
    if (t.includes("more than packing") && !q) {
      setL13(ctx, p, 1, `Quest Started: ${QNAME} · Check on Bea in Flat ${A8?.num ?? "?"}`);
      return { reply: "Bea. First hall, the flat next to the chess players. We came in together. She stopped answering a week ago and I'm a coward about doors. Go look. If she's in there, tell her I'm leaving tonight with or without her.", mood: "sad" };
    }
    if (t.includes("about bea") && (q === 1 || q === 2)) {
      return { reply: q === 1 ? "First hall. Next door to the two with the chess board. Knock first. She hated people who didn't knock." : "So it's like that. Then bring me her locket. Brass, little dent in the lid. She kept it by the kettle. I need to hold something or I won't believe you.", mood: "sad" };
    }
    if (t.includes("bea's locket") && q === 3) {
      finish(ctx, p, "noor");
      return { reply: s.l13route === "body" ? "You took it off her. Don't tell me how. Thank you. Here, I was saving this for a flat somewhere else. I don't want a flat anymore." : "That's the dent. That's hers. So she's still in there, and she isn't. Alright. Take this. I'm gone in an hour, and you should be too.", mood: "sad" };
    }
    return null;
  }
  if (id === CLERK && t.includes("lost property") && q === 3) {
    finish(ctx, p, "clerk");
    return { reply: "Lovely, thank you! Straight into the lost property drawer. The Project appreciates an honest applicant. Finder's fee, sign nothing, off you go.", mood: "happy" };
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
