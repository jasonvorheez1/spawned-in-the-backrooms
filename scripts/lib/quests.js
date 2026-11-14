// The quest journal (Shelly, Nov 9: "track down multiple quests ... up to 3"). Every quest a player has lives in
// player.state.quests = { <id>: { name, step, mark, main, at } }; player.state.qtrack = up to three ids, each drawn with its
// own tracker row, world marker and compass pip in its own tint. Older quests still write player.state.quest; scripts/quest-marker.js
// folds those in, so nothing a quest giver wrote is lost when a second quest starts.
import { pushFeed } from "./feed.js";
import { heard } from "./hear.js";
import { addRep, addKarma, repOf, GROUPS } from "./rep.js";
export { PLACE_NAMES } from "./places.js";
export const MAX_TRACK = 3; // her number
export const TINT = ["#ffc44d", "#8fd8ff", "#a6f08e"]; // slot 1 amber, 2 pale blue, 3 pale green (my picks)
export const qid = (name) => String(name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function setQuest(s, id, q) {
  const cur = s.quests ?? {}, old = cur[id], mark = q.mark === undefined ? old?.mark ?? null : q.mark, main = !!(q.main ?? old?.main), kind = q.kind ?? old?.kind ?? null;
  if (old && old.step === q.step && old.name === q.name && !!old.main === main && (old.kind ?? null) === kind && JSON.stringify(old.mark ?? null) === JSON.stringify(mark)) return false;
  const history = old?.step && old.step !== q.step
    ? [...(old.history ?? []).filter((step) => step !== old.step && step !== q.step), old.step].slice(-12)
    : old?.history;
  s.quests = { ...cur, [id]: { name: q.name, step: q.step, mark, main, at: Date.now(), ...(kind ? { kind } : {}), ...(history?.length ? { history } : {}), ...(q.briefing ?? old?.briefing ? { briefing: q.briefing ?? old.briefing } : {}) } };
  const tr = (s.qtrack ?? []).filter((k) => s.quests[k]);
  if (!old && !tr.includes(id) && kind !== "errand") { if (q.main) { tr.unshift(id); tr.length = Math.min(tr.length, MAX_TRACK); } else if (tr.length < MAX_TRACK) tr.push(id); } // a new quest is tracked while a slot is free; the main quest always takes one; an errand waits to be tracked by hand
  s.qtrack = tr;
  return !old;
}
export function endQuest(s, id, doneText, outcome = "completed") {
  const old = s.quests?.[id];
  if (old) {
    const { [id]: gone, ...rest } = s.quests; s.quests = rest;
    s.qtrack = (s.qtrack ?? []).filter((k) => k !== id);
    if (doneText !== false) {
      const place = old.mark?.place ?? null;
      s.qdone = { ...(s.qdone ?? {}), [id]: { name: old.name, text: typeof doneText === "string" ? doneText : "Completed", place, main: !!old.main, outcome, at: Date.now(), ...(old.kind ? { kind: old.kind } : {}), ...(old.history?.length ? { history: old.history } : {}), ...(old.briefing ? { briefing: old.briefing } : {}) } };
    }
  } else if (typeof doneText === "string" && id) {
    s.qdone = { ...(s.qdone ?? {}), [id]: { name: s.qdone?.[id]?.name ?? id, text: doneText, outcome, at: Date.now() } };
  }
}
// Errands (Nov 13): the boards and odd jobs that pay through player.state.payout, in the journal as kind "errand" — listed
// after the quests, never tracked on their own. A one-press job with no open entry is logged straight into the archive.
export const errandId = (key) => "errand-" + qid(key);
export function errandStep(s, key, name, step, mark = null) { return s ? setQuest(s, errandId(key), { name, step, mark, kind: "errand" }) : false; }
export function errandDone(s, key, name, text) {
  if (!s) return; const id = errandId(key);
  if (s.quests?.[id]) endQuest(s, id, text);
  else s.qdone = { ...(s.qdone ?? {}), [id]: { name, text, outcome: "completed", kind: "errand", at: Date.now() } };
}
export const tracked = (s) => (s?.qtrack ?? []).filter((id) => s.quests?.[id]).slice(0, MAX_TRACK).map((id, i) => ({ id, ...s.quests[id], tint: TINT[i] }));
// true = now tracked, false = untracked, null = all three slots taken
export function toggleTrack(s, id) {
  if (!s.quests?.[id]) return false;
  const tr = (s.qtrack ?? []).filter((k) => s.quests[k]);
  if (tr.includes(id)) { s.qtrack = tr.filter((k) => k !== id); return false; }
  if (tr.length >= MAX_TRACK) return null;
  s.qtrack = [...tr, id]; return true;
}


// ---- shared by every level's quest file (Shelly Nov 13: fix once, every level gets it) ----
export const CHIME = "cdn/sfx-soft-bright-two-note-success-chime.mp3";
// a quest row's step into the journal and tracker: q = { name, tips: [...], marks?: [...] }; past the last tip it closes
export function questStep(s, q, step, doneSummary) {
  if (!q || !s) return;
  const tip = q.tips?.[step], id = qid(q.name), mark = q.marks?.[step] ?? null;
  if (tip) { s.quest = { name: q.name, step: tip, mark, at: Date.now() }; setQuest(s, id, { name: q.name, step: tip, mark }); }
  else { if (s.quest?.name === q.name) s.quest = null; endQuest(s, id, doneSummary); }
}
// a quest beat told to one player: the notice, the feed line and a chime only they hear
export function tellQuest(ctx, p, text, clip = CHIME) {
  const s = p.state, now = ctx.now(); s.notice = { text, at: now }; pushFeed(s, text, now, "good");
  const pos = p.worldFeetPosition ?? p.feetPosition; if (pos) heard(ctx, { clip, position: pos, volume: 0.7, maxDistance: 16 }, { audience: { player: p.id } });
}

// one payout per quest per save (Shelly Nov 13 save brief): every quest's reward asks here first; a finished quest never pays again
export function claimReward(s, id) {
  if (!id || s.claimed?.[id] || s.qdone?.[id]) return false;
  s.claimed = { ...(s.claimed ?? {}), [id]: 1 };
  return true;
}

// the same promise for finishers that end their quest in the same breath: one mark per quest, kept apart from qdone (which they have just written)
export function payOnce(s, id) {
  if (!s || !id) return false;
  if (s.paid?.[id]) return false;
  s.paid = { ...(s.paid ?? {}), [id]: 1 };
  return true;
}

const FANFARE = "/cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3";
const repBonus = (s, g) => { const v = repOf(s, g); return v >= 35 ? 0.25 : v >= 12 ? 0.1 : 0; };

// Shared forward-only quest step advancement used across level quest modules
export function advanceQuest(ctx, p, q, step, noteText) {
  const s = p?.state;
  if (!s || !q || (s[q.key] ?? 0) >= step) return false;
  s[q.key] = step;
  questStep(s, q, step);
  tellQuest(ctx, p, noteText || `${q.name} · ${q.tips?.[step] ?? ""}`);
  return true;
}

export function queuePayout(s, { xp = 0, items = [], text = null } = {}) {
  const prev = s.payout;
  s.payout = {
    xp: (prev?.xp ?? 0) + xp,
    items: [...(prev?.items ?? []), ...items],
    text: text ?? prev?.text ?? null,
  };
}

// Shared quest completion payout (reputation bonus, karma/rep, cash, XP, feed, banner, fanfare, milestone)
export function finishLevelQuest(ctx, p, qKey, q, { xp = 100, cents = 5000, items = [], text = "", rep = [], by = "survivors", payKey } = {}) {
  const s = p?.state;
  if (!s || !q || s[q.key] === 99 || !payOnce(s, payKey ?? q.key)) return false;
  const b = repBonus(s, by), msgs = [];
  if (b && cents) { const extra = Math.round(cents * b); cents += extra; msgs.push(`${GROUPS[by]?.name ?? by} bonus +$${(extra / 100).toFixed(2)}`); }
  s[q.key] = 99;
  questStep(s, q, 99, text || `Completed ${q.name}`);
  for (const [g, d] of rep) {
    if (!d) continue;
    const tier = g === "karma" ? addKarma(s, d) : addRep(s, g, d, `Completed ${q.name}`);
    msgs.push(tier || `${g === "karma" ? "Karma" : GROUPS[g]?.name ?? g} ${d > 0 ? "+" : ""}${d}`);
  }
  s.cents = (s.cents ?? 0) + cents;
  const summary = [text || `Quest Completed: ${q.name}! +${xp} XP · +$${(cents / 100).toFixed(2)}`, ...msgs].filter(Boolean).join(" · ");
  queuePayout(s, { xp, items, text: summary });
  const now = ctx.now();
  s.notice = { text: summary, at: now };
  pushFeed(s, summary, now, "good");
  const pos = p.worldFeetPosition ?? p.feetPosition;
  if (pos) {
    heard(ctx, { clip: FANFARE, position: pos, volume: 0.85, maxDistance: 24 }, { audience: { player: p.id } });
    ctx.emit("damageNumber", { position: { x: pos.x, y: pos.y + 1.8, z: pos.z }, text: `QUEST COMPLETED: ${q.name.toUpperCase()}`, color: "#f1c40f", size: 1.2 }, { audience: { player: p.id } });
  }
  ctx.emit("milestone", { step: 1, name: `quest-${qKey}` }, { audience: { player: p.id } });
  return true;
}
