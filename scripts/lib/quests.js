// The quest journal (Shelly, Nov 9: "track down multiple quests ... up to 3"). Every quest a player has lives in
// player.state.quests = { <id>: { name, step, mark, main, at } }; player.state.qtrack = up to three ids, each drawn with its
// own tracker row, world marker and compass pip in its own tint. Older quests still write player.state.quest; scripts/quest-marker.js
// folds those in, so nothing a quest giver wrote is lost when a second quest starts.
export const MAX_TRACK = 3; // her number
export const TINT = ["#ffc44d", "#8fd8ff", "#a6f08e"]; // slot 1 amber, 2 pale blue, 3 pale green (my picks)
export const qid = (name) => String(name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function setQuest(s, id, q) {
  const cur = s.quests ?? {}, old = cur[id];
  if (old && old.step === q.step && old.name === q.name && JSON.stringify(old.mark ?? null) === JSON.stringify(q.mark ?? old.mark ?? null)) return false;
  s.quests = { ...cur, [id]: { name: q.name, step: q.step, mark: q.mark ?? old?.mark ?? null, main: !!(q.main ?? old?.main), at: Date.now() } };
  const tr = (s.qtrack ?? []).filter((k) => s.quests[k]);
  if (!old && !tr.includes(id)) { if (tr.length < MAX_TRACK) tr.push(id); else if (q.main) tr[MAX_TRACK - 1] = id; } // a new quest is tracked while a slot is free; the main quest always takes one
  s.qtrack = tr;
  return !old;
}
export function endQuest(s, id) {
  if (!s.quests?.[id]) return;
  const { [id]: gone, ...rest } = s.quests; s.quests = rest;
  s.qtrack = (s.qtrack ?? []).filter((k) => k !== id);
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
