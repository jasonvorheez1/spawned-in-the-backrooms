// Level 22 "Ruins Left Behind": three exploration quests over the papers Emstable left (scripts/lib/data/l22-records.yml).
// Canon (scripts/lib/data/lore/level-22.md): the car park, the floors paying upward, the "Hilda" diary held by the Kalag Institute,
// the Floor 10 census found on the top floor, other confidential papers held by the M.E.G. GAME-ORIGINAL: the quests, their names
// and rewards, the in-situ transcript sheets, and Wren Adeyemi (the Level 69 surveyor in Boom Town) wanting any of it.
//   ruins  "Ruins Left Behind"   stand on Floors 2, 13 and 21, find a way out, tell Wren
//   hilda  "Hilda"               read the three Kalag transcript sheets, tell Wren
//   census "Twenty-Six Thousand" read the census on Floor 1, stand on the top, middle and bottom tiers, tell Wren
// State lives ONLY in player.state.l22q = { started, floors: [], read: [], done: {} }, written whole on change. The journal rows
// (player.state.quests, via quests.js) are drawn from it. The sim calls startL22 on arrival and noteFloor on a deck's first step.
import { setQuest, endQuest, tellQuest, payOnce, queuePayout, qid } from "./quests.js";
import R from "./data/l22-records.yml";
import { WREN } from "./level69-quest.js";
const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const TIERS = [[1, 2], [13, 14], [20, 21]]; // the founders' top, the middle, the bottom (the decks the place builds)
const recs = (quest) => R.records.filter((r) => r.quest === quest).map((r) => r.id);
const HILDA = recs("hilda"), CENSUS = recs("census");
const count = (list, have) => list.filter((x) => have.includes(x)).length;
const tiers = (q) => TIERS.filter((t) => t.some((f) => q.floors.includes(f))).length;
// rewards are Savi's picks
export const Q22 = {
  key: "l22q", turnIn: WREN,
  quests: {
    ruins: { id: qid("Ruins Left Behind"), name: "Ruins Left Behind", xp: 260, cents: 6000, need: [2, 13, 21],
      on: (q) => !!q.started, n: (q) => count([2, 13, 21], q.floors), of: 3,
      tip: (q, n) => `Emstable was built downward. Stand on Floor 2, Floor 13 and Floor 21. ${n} of 3.`,
      ready: "You have stood on the top, the middle and the bottom. Find a way out of Level 22 and tell Wren Adeyemi in Boom Town.",
      done: "Ruins Left Behind: you walked Emstable from the cookers to the mines, and came back out." },
    hilda: { id: qid("Hilda"), name: "Hilda", xp: 180, cents: 4000,
      on: (q) => count(HILDA, q.read) > 0, n: (q) => count(HILDA, q.read), of: HILDA.length,
      tip: (q, n) => `The Kalag Institute left transcript sheets where the pages of a diary called Hilda were found. Read all three. ${n} of 3.`,
      ready: "You have read the three sheets. Tell Wren Adeyemi in Boom Town what Jacobs Opal wrote.",
      done: "Hilda: three pages, read where they were written." },
    census: { id: qid("Twenty-Six Thousand"), name: "Twenty-Six Thousand", xp: 200, cents: 4500,
      on: (q) => count(CENSUS, q.read) > 0, n: (q) => tiers(q), of: 3,
      tip: (q, n) => `The census counts 26,158. Stand where it counted them: the top floors, the middle, the bottom. ${n} of 3.`,
      ready: "You have stood on all three tiers of the count. Tell Wren Adeyemi in Boom Town.",
      done: "Twenty-Six Thousand: you stood where the census counted." },
  },
};
const blank = () => ({ started: false, floors: [], read: [], done: {} });
const stateOf = (s) => { const q = s?.l22q; return q ? { started: !!q.started, floors: [...(q.floors ?? [])], read: [...(q.read ?? [])], done: { ...(q.done ?? {}) } } : blank(); };
const isReady = (k, q) => { const d = Q22.quests[k]; return d.on(q) && !q.done[k] && d.n(q) >= d.of; };
// the journal rows, redrawn from l22q; returns the keys whose row is new
function sync(s, q) {
  const fresh = [];
  for (const [k, d] of Object.entries(Q22.quests)) {
    if (q.done[k] || !d.on(q)) continue;
    if (setQuest(s, d.id, { name: d.name, step: isReady(k, q) ? d.ready : d.tip(q, d.n(q)) })) fresh.push(k);
  }
  return fresh;
}
// one change to l22q: written whole, the journal follows, and the player is told what moved
function change(ctx, p, fn) {
  const s = p?.state; if (!s) return false;
  const q = stateOf(s), was = Object.keys(Q22.quests).map((k) => [k, Q22.quests[k].on(q) ? Q22.quests[k].n(q) : -1, isReady(k, q)]);
  if (fn(q) === false) return false;
  s.l22q = q;
  const fresh = sync(s, q);
  for (const [k, n0, r0] of was) {
    const d = Q22.quests[k]; if (q.done[k] || !d.on(q)) continue;
    const n = d.n(q), r = isReady(k, q);
    if (fresh.includes(k)) tellQuest(ctx, p, `Quest Started: ${d.name}`);
    else if (r && !r0) tellQuest(ctx, p, `${d.name} · ${d.ready}`);
    else if (n > n0) tellQuest(ctx, p, `${d.name} · ${n} of ${d.of}`);
  }
  return true;
}
export function startL22(ctx, player) {
  if (player?.state?.l22q?.started) return false;
  return change(ctx, player, (q) => { q.started = true; });
}
export function noteFloor(ctx, player, floorNumber) {
  const f = Number(floorNumber), cur = player?.state?.l22q;
  if (!player?.state || !Number.isFinite(f) || (cur?.started && (cur.floors ?? []).includes(f))) return false;
  return change(ctx, player, (q) => { q.started = true; if (!q.floors.includes(f)) q.floors.push(f); });
}
export function noteRecord(ctx, player, recId) {
  const id = String(recId ?? "").split("/").pop();
  if (!player?.state || !R.records.some((r) => r.id === id) || (player.state.l22q?.read ?? []).includes(id)) return false;
  return change(ctx, player, (q) => { q.read.push(id); });
}
function finish(ctx, p, k) {
  const s = p.state, d = Q22.quests[k], q = stateOf(s);
  if (!isReady(k, q)) return false;
  q.done[k] = 1; s.l22q = q;
  endQuest(s, d.id, d.done);
  if (!payOnce(s, "l22q-" + k)) return true;
  s.cents = (s.cents ?? 0) + d.cents;
  const text = `Quest Completed: ${d.name}! +${d.xp} XP · +$${(d.cents / 100).toFixed(2)}`;
  queuePayout(s, { xp: d.xp, text });
  tellQuest(ctx, p, text, FANFARE);
  ctx.emit("milestone", { step: 1, name: "quest-l22-" + k }, { audience: { player: p.id } });
  return true;
}
// Wren's lines are game-original. She states only what the lore file states; she offers no cause and no fates.
const ASK = { start: "You ever survey a car park? Level 22.", remind: "Remind me what you want out of Level 22.", ruins: "I walked Emstable, top to bottom.", hilda: "I read the Hilda transcripts.", census: "I found the Floor 10 census." };
export function l22Choices(id, s) {
  if (id !== WREN) return [];
  const q = stateOf(s), out = [];
  if (!q.started) out.push({ text: ASK.start, tag: "Quest Start" });
  for (const k of ["ruins", "hilda", "census"]) if (isReady(k, q)) out.push({ text: ASK[k], tag: "Quest Turn-In" });
  if (q.started && Object.keys(Q22.quests).some((k) => !q.done[k] && !isReady(k, q))) out.push({ text: ASK.remind, tag: "Quest" });
  return out;
}
export function handleDialogueQuest22(ctx, p, npc, text) {
  const t = String(text ?? "").toLowerCase(), s = p?.state; if (!s || !npc) return null;
  if (String(npc.id ?? "").split("/").pop() !== WREN) return null;
  const q = stateOf(s);
  if (t.includes("survey a car park") && !q.started) {
    startL22(ctx, p);
    return { reply: "Nobody surveys it. That's the trouble. A multi-storey car park that called itself a country. Emstable. Shut most of its own doors by 1990 and let almost nobody in after, so what we hold is a diary the Kalag Institute keeps and one census off the top floor. If you find a way in, I want three floors walked: two, thirteen, twenty-one. Top, middle, bottom. Read what they left lying about. Don't climb the holes. Then find a way out, which is the part I can't help with.", mood: "neutral" };
  }
  if (t.includes("out of level 22") && q.started) {
    const bits = [];
    if (!q.done.ruins) bits.push(`Floors two, thirteen and twenty-one under your boots. You've got ${Q22.quests.ruins.n(q)} of three.`);
    if (!q.done.hilda) bits.push(Q22.quests.hilda.on(q) ? `The Kalag people left transcript sheets where the diary pages turned up. ${Q22.quests.hilda.n(q)} of three read.` : "If you see a sheet with a Kalag Institute header, read it. They leave copies where the pages were found.");
    if (!q.done.census) bits.push(Q22.quests.census.on(q) ? `You've seen the census. Now stand on the top floors, the middle and the bottom. ${Q22.quests.census.n(q)} of three.` : "There was a census on the top floor. A copy may still be up there.");
    return { reply: bits.join(" ") || "Nothing more. You've done all of it.", mood: "neutral" };
  }
  if (t.includes("walked emstable") && finish(ctx, p, "ruins")) return { reply: "Two, thirteen, twenty-one. Then you saw the cookers and you saw the sleeping bags, and however many ramps there are between them. I'll write it up as walked. Here. That's survey pay, and it isn't enough for that place.", mood: "happy" };
  if (t.includes("hilda transcripts") && finish(ctx, p, "hilda")) return { reply: "Hilda's the diary, not the writer. Jacobs Opal wrote it. Mining concrete to get a family one floor up. I've read the same three dates you have and I still go back to the last one. The Institute keeps the rest. Take this. I'd rather pay for reading than for digging.", mood: "sad" };
  if (t.includes("floor 10 census") && finish(ctx, p, "census")) return { reply: "Twenty-six thousand, one hundred and fifty-eight. Eighteen of them on Floor 1. I've had that sheet on my clipboard for a year and never stood on one of those floors. You've stood on three kinds. That's worth more than my copy. Here.", mood: "neutral" };
  return null;
}
