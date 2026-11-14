// Level 109 "Keep It Closed" (Doctors' outpost). player.state.l109q: 1 asked by Halloran, 2 at the open door ew0_6p,
// 3 door shut with every entity dead (route "clear") or herded back in (route "lure"), 4 note found, 99 done.
// l109route = "clear" | "lure"; l109tell = "truth" | "cover". Rep: The Doctors only (helping them hurts no one).
import { addRep, addKarma } from "./rep.js";
import { tellQuest, finishLevelQuest, setQuest } from "./quests.js";
import { doorOpen, looseCount, penCount, inside } from "./containment.js";
import { slotInfo, corridor } from "./level109.js";
import C from "./data/l109-outpost.yml";
export const QID = "keep-it-closed", QNAME = "Keep It Closed", BREACH = "ew0_6p";
export const CHOICES = { take: "I'll deal with the breach.", truth: "A wanderer opened it. Here's their note.", cover: "Door was jammed. Nobody's fault." };
// markers carry world points so they stand when the room is not streamed in
export const Q = { key: "l109q", name: QNAME,
  tips: { 1: "Corporal Ruiz heard a door go, west along the outpost corridor. Find it", 2: "Deal with what got out, or lead it back inside, then shut the door", 3: "Look inside for whoever opened it", 4: "Tell Dr. Halloran what happened" },
  marks: {} };
const posOf = (p) => p?.feetPosition;
const g0 = (ctx) => ctx.place.state.l109geo?.breachDoor;
function geo(ctx) { // the breach room writes its own points when it loads; before that they come from the layout
  const st = ctx.place.state, g = st.l109geo ?? {};
  if (g.breachDoor && g.note && g.box) return g;
  if (!st.l109seed) return null;
  const c = corridor(st.l109seed, "ew", 0), info = slotInfo(st.l109seed, c, 6, 1); if (!info) return null;
  const um = info.r * 32 + 16, at = (a, b) => ({ x: um + a, y: 0, z: c.c + info.side * (1.5 + b) });
  return { ...g, breachDoor: at(-8, -1.5), note: at(3.8, 10.8), box: info.box, ...(g.halloran ? {} : { halloran: { x: 436, y: 0, z: -114.5 } }) };
}
function marks(ctx) { const g = geo(ctx); if (!g) return; Q.marks = { 1: { place: "level109", ...g.breachDoor, label: "Open door" }, 2: { place: "level109", ...g.breachDoor, label: "Shut it" }, 3: { place: "level109", ...g.note, label: "Note" }, 4: { place: "level109", ...g.halloran, label: "Dr. Halloran" } }; }
const step = (ctx, p, n, text) => { marks(ctx); p.state.l109q = n; const tip = Q.tips[n], s = p.state; s.quest = { name: QNAME, step: tip, mark: Q.marks[n] ?? null, at: Date.now() };
  setQuest(s, QID, { name: QNAME, step: tip, mark: Q.marks[n] ?? null }); if (text) tellQuest(ctx, p, text); };
const inBox = (b, f) => f && f.x > b.x0 && f.x < b.x1 && f.z > b.z0 && f.z < b.z1;
export function breachFoes(ctx) { return ctx.query({ tags: ["pen-foe"] }).filter((f) => (f.state?.penKind && (f.state.home ?? f.state.penHome ?? f.state.from ?? f.state.penId ?? f.state.pen0 ?? f.state.penRoom) === BREACH) || f.state?.pen === BREACH || f.state?.penFrom === BREACH || f.state?.origin === BREACH); }
const alive = (f) => !(f.state?.dead || (f.state?.hp ?? 1) <= 0);
// one check per sim tick (cheap): stage 2 by distance, stage 3 by the books, stage 4 by the note
// door shut: an escaped one standing inside the room is penned again (the lure route); then the books decide
function route(ctx, g) {
  const live = breachFoes(ctx).filter(alive);
  for (const f of live) if (!f.state.pen && inside(g.box, f.feetPosition, -0.4)) { f.state.pen = BREACH; f.state.penBox = g.box; f.state.penFrom = null; }
  if (looseCount(ctx, BREACH) > 0) return null;
  const inRoom = live.filter((f) => f.state.pen === BREACH).length + penCount(ctx, BREACH);
  return inRoom ? "lure" : "clear";
}
export function questTick(ctx) {
  const st = ctx.place.state;
  if (!ctx.place.players.some((p) => { const q = p.state?.l109q ?? 0; return q > 0 && q < 4; })) return;
  const g = geo(ctx); if (!g) return;
  for (const p of ctx.place.players) {
    const q = p.state?.l109q ?? 0, f = posOf(p); if (!q || q >= 4 || !f) continue;
    if (q === 1 && Math.hypot(f.x - g.breachDoor.x, f.z - g.breachDoor.z) < C.quest.reachRadius) {
      const n = looseCount(ctx, BREACH); // the journal says what is actually out, counted from the books
      step(ctx, p, 2, n ? "The door hangs open. Claw marks on the inside of the frame, and the room is quiet." : "The door hangs open. Whatever was in there isn't moving.");
      if (n) { setQuest(p.state, QID, { name: QNAME, step: `${Q.tips[2]} (${n} still loose)`, mark: Q.marks[2] ?? null }); }
    }
    else if (q === 2 && st.l109breachSet && st.pens?.[BREACH] && !doorOpen(ctx, BREACH)) {
      const r = route(ctx, g);
      if (r === "clear") { p.state.l109route = "clear"; st.l109breachEnd = { route: "clear" }; step(ctx, p, 3, "Door shut. Nothing left to put back."); }
      else if (r === "lure") { p.state.l109route = "lure"; st.l109breachEnd = { route: "lure" }; step(ctx, p, 3, "Door shut on them. Something thumps the inside, once."); }
    } else if (q === 3 && Math.hypot(f.x - g.note.x, f.z - g.note.z) < C.quest.noteRadius) { p.state.l109note = 1; step(ctx, p, 4, "A note: \"Sorry. I heard someone crying in there. It wasn't someone. Tell them I'm sorry. M.\""); }
  }
}
export const ASK = { take: "Need a hand with anything?", status: "About the open door.", exit: "Any way out of here?" };
const say = (reply, mood = "calm") => ({ reply, mood });
export function handleDialogueQuest109(ctx, p, npc, text) {
  const s = p?.state; if (!s || npc?.state?.dlg !== "l109-halloran") return null;
  const t = String(text ?? ""), q = s.l109q ?? 0;
  if (q === 0 && (t === ASK.take || t === CHOICES.take)) { step(ctx, p, 1, "New quest: Keep It Closed");
    const ruiz = ctx.getObject("l109o-ew0_13m-guard0"), w = ctx.place.state.l109geo?.outpost?.care?.west; // Ruiz shows you, rather than Halloran telling you
    if (ruiz?.state && w && !ruiz.state.dead) { ruiz.state.rounds = [{ x: w.x, y: 0, z: w.z, dwell: 3600, act: null, look: g0(ctx) ? { x: g0(ctx).x, z: g0(ctx).z } : { x: w.x, z: w.z } }]; ruiz.state.ri = 0; ruiz.state.l109restoreAt = ctx.now() + 20000; ruiz.state.line = { t: "that way. heard it go about an hour ago. nobody's come back from looking because nobody's looked.", at: ctx.now(), d: 5200 }; ruiz.state.talkAt = ctx.now(); }
    return say("Ruiz heard a door go west of here and nobody's been to look. I can't spare him. Go see. If it's open, it doesn't stay open."); }
  if (t === ASK.status) {
    if (q === 0) return say("You heard. Ask me if I need a hand and I'll tell you.");
    if (q < 4) return say(["", "Still open. Go.", "Shut it. Whatever it takes.", "Shut. Good. Someone opened it, though. Look around in there."][q]);
    if (q === 4) return say("So? Who was it? Tell me straight or tell me something.");
  }
  if (q === 4 && (t === CHOICES.truth || t === CHOICES.cover)) {
    const truth = t === CHOICES.truth; s.l109tell = truth ? "truth" : "cover";
    ctx.place.state.l109breachEnd = { route: s.l109route ?? ctx.place.state.l109breachEnd?.route ?? "clear", tell: s.l109tell }; // the outpost's whiteboard and talk follow this
    if (!finishLevelQuest(ctx, p, Q.key, Q, { xp: C.quest.xp, cents: C.quest.cents, items: C.quest.items.flatMap(([id, n]) => Array(n).fill(id)), by: "doctors",
      rep: [["doctors", truth ? C.quest.repTruth : C.quest.repCover], ["karma", truth ? C.quest.karmaTruth : C.quest.karmaCover]], text: "Quest Completed: Keep It Closed" })) return say("We settled up already. Go easy.");
    s.l109exit = 1;
    return say((truth ? "Poor kid. I'll put the name on the board, not as a culprit. " : "Jammed. Sure. I'll pretend I believe that. ")
      + "Here, supplies and pay. And since you earned it: the EXIT door, metal, about 1.3 km west on this same corridor. Level 114 on the other side. Go easy.", truth ? "sad" : "annoyed");
  }
  if (t === ASK.exit) return q === 99 ? say("Metal door marked EXIT, 1.3 km west down this corridor. Level 114. Don't open anything on the way.") : say("Not that I hand out to strangers. Earn a little trust first.");
  return null;
}
// rows Halloran's card shows (scripts/lib/npc-starters.js questChoices); no node, so talk.js hands them to the handler above
export function l109Choices(npc, s) {
  if (npc?.state?.dlg !== "l109-halloran") return [];
  const q = s?.l109q ?? 0;
  if (q === 0) return [{ text: ASK.take, tag: "Quest Start" }, { text: ASK.exit, tag: "Talk" }];
  if (q < 4) return [{ text: ASK.status, tag: "Talk" }];
  if (q === 4) return [{ text: CHOICES.truth, tag: "Quest Turn-In" }, { text: CHOICES.cover, tag: "Quest Turn-In" }];
  return [{ text: ASK.exit, tag: "Talk" }];
}
