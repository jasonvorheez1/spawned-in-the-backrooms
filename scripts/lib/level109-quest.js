// Level 109 "Keep It Closed" (Doctors' outpost). player.state.l109q: 1 asked by Halloran, 2 at the open door ew0_6p,
// 3 door shut with every entity dead (route "clear") or herded back in (route "lure"), 4 note found, 99 done.
// l109route = "clear" | "lure"; l109tell = "truth" | "cover". Rep: The Doctors only (helping them hurts no one).
import { addRep, addKarma } from "./rep.js";
import { tellQuest, finishLevelQuest, setQuest } from "./quests.js";
import { doorOpen, looseCount } from "./containment.js";
import C from "./data/l109-outpost.yml";
export const QID = "keep-it-closed", QNAME = "Keep It Closed", BREACH = "ew0_6p";
export const CHOICES = { take: "I'll deal with the breach.", truth: "A wanderer opened it. Here's their note.", cover: "Door was jammed. Nobody's fault." };
// markers carry world points so they stand when the room is not streamed in
export const Q = { key: "l109q", name: QNAME,
  tips: { 1: "Find the open door near ew0_6p, west along the cross corridor", 2: "Kill what got out, or lure it back inside, then shut the door", 3: "Look inside for whoever opened it", 4: "Tell Dr. Halloran what happened" },
  marks: {} };
const posOf = (p) => p?.feetPosition;
function geo(ctx) { return ctx.place.state.l109geo ?? null; }
function marks(ctx) { const g = geo(ctx); if (!g) return; Q.marks = { 1: { place: "level109", ...g.breachDoor, label: "Open door" }, 2: { place: "level109", ...g.breachDoor, label: "Shut it" }, 3: { place: "level109", ...g.note, label: "Note" }, 4: { place: "level109", ...g.halloran, label: "Dr. Halloran" } }; }
const step = (ctx, p, n, text) => { marks(ctx); p.state.l109q = n; const tip = Q.tips[n], s = p.state; s.quest = { name: QNAME, step: tip, mark: Q.marks[n] ?? null, at: Date.now() };
  setQuest(s, QID, { name: QNAME, step: tip, mark: Q.marks[n] ?? null }); if (text) tellQuest(ctx, p, text); };
const inBox = (b, f) => f && f.x > b.x0 && f.x < b.x1 && f.z > b.z0 && f.z < b.z1;
export function breachFoes(ctx) { return ctx.query({ tags: ["pen-foe"] }).filter((f) => (f.state?.penKind && (f.state.home ?? f.state.penHome ?? f.state.from ?? f.state.penId ?? f.state.pen0 ?? f.state.penRoom) === BREACH) || f.state?.pen === BREACH || f.state?.penFrom === BREACH || f.state?.origin === BREACH); }
const alive = (f) => !(f.state?.dead || (f.state?.hp ?? 1) <= 0);
// one check per sim tick (cheap): stage 2 by distance, stage 3 by the books, stage 4 by the note
export function questTick(ctx) {
  const g = geo(ctx); if (!g) return;
  for (const p of ctx.place.players) {
    const q = p.state?.l109q ?? 0, f = posOf(p); if (!q || q >= 4 || !f) continue;
    if (q === 1 && Math.hypot(f.x - g.breachDoor.x, f.z - g.breachDoor.z) < C.quest.reachRadius) step(ctx, p, 2, "The door stands open. Something got out.");
    else if (q === 2 && !doorOpen(ctx, BREACH)) {
      const foes = breachFoes(ctx).filter(alive), loose = looseCount(ctx, BREACH);
      if (loose === 0 && foes.length === 0) { p.state.l109route = "clear"; step(ctx, p, 3, "Door shut. Nothing left to put back."); }
      else if (foes.length && foes.every((x) => inBox(g.box, x.feetPosition))) { p.state.l109route = "lure"; step(ctx, p, 3, "Door shut on them. They're back where they belong."); }
    } else if (q === 3 && Math.hypot(f.x - g.note.x, f.z - g.note.z) < C.quest.noteRadius) { p.state.l109note = 1; step(ctx, p, 4, "A note: \"Sorry. I heard someone crying in there. It wasn't someone. Tell them I'm sorry. M.\""); }
  }
}
export function handleDialogueQuest109(ctx, p, npc, text) {
  const s = p?.state; if (!s || npc?.state?.dlg !== "l109-halloran") return null;
  const t = String(text ?? ""), q = s.l109q ?? 0;
  if (q === 0 && (t === "Need a hand with anything?" || t === CHOICES.take)) { step(ctx, p, 1, "New quest: Keep It Closed"); return "Yes. Six doors west on this corridor someone opened a room. Five things walked out. Kill them or walk them home, I don't care which. Then shut the door."; }
  if (t === "About the open door.") {
    if (q === 0) return "You heard. Ask me if I need a hand and I'll tell you.";
    if (q < 4) return ["", "Still open. Go.", "Shut it. Whatever it takes.", "Shut. Good. Someone opened it, though. Look around in there."][q];
    if (q === 4) return "So? Who was it? Tell me straight or tell me something.";
  }
  if (q === 4 && (t === CHOICES.truth || t === CHOICES.cover)) {
    const truth = t === CHOICES.truth; s.l109tell = truth ? "truth" : "cover";
    finishLevelQuest(ctx, p, Q.key, Q, { xp: C.quest.xp, cents: C.quest.cents, items: C.quest.items.map(([id, n]) => ({ id, n })), by: "doctors",
      rep: [["doctors", truth ? C.quest.repTruth : C.quest.repCover], ["karma", truth ? C.quest.karmaTruth : C.quest.karmaCover]], text: "Quest Completed: Keep It Closed" });
    s.l109exit = 1;
    return (truth ? "Poor kid. I'll put their name on the board, not as a culprit. " : "Jammed. Sure. I'll pretend I believe that. ")
      + "Here, supplies and pay. And since you earned it: the EXIT door, metal, about 1.3 km west on this same corridor. Level 114 on the other side. Go easy.";
  }
  if (t === "Any way out of here?" && (s.l109q ?? 0) === 99) return "Metal door marked EXIT, 1.3 km west down this corridor. Level 114. Don't open anything on the way.";
  return null;
}
// rows the dialogue card shows (appended by talk.js)
export function questChoices109(p, npc) { const q = p?.state?.l109q ?? 0; if (npc?.state?.dlg !== "l109-halloran") return []; return q === 4 ? [CHOICES.truth, CHOICES.cover] : []; }
