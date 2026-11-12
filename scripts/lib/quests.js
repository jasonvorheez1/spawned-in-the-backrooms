// The quest journal (Shelly, Nov 9: "track down multiple quests ... up to 3"). Every quest a player has lives in
// player.state.quests = { <id>: { name, step, mark, main, at } }; player.state.qtrack = up to three ids, each drawn with its
// own tracker row, world marker and compass pip in its own tint. Older quests still write player.state.quest; scripts/quest-marker.js
// folds those in, so nothing a quest giver wrote is lost when a second quest starts.
export const MAX_TRACK = 3; // her number
export const TINT = ["#ffc44d", "#8fd8ff", "#a6f08e"]; // slot 1 amber, 2 pale blue, 3 pale green (my picks)
export const PLACE_NAMES = {
  main: "Level 0", level01: "Zenith Station", level02: "Level 0.2", level1: "Level 1", level2: "Level 2", level21: "Level 2.1", level31: "Level 31",
  level3: "Level 3", gamma: "Base Gamma", level4: "Level 4", level5: "Level 5", level6: "Level 6",
  level61: "Level 6.1", level7: "Level 7", level8: "Level 8", level10: "Level 10", level11: "Level 11", level13: "Level 13", level26: "SS Fun", testlab: "Test Range",
};
export const qid = (name) => String(name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function setQuest(s, id, q) {
  const cur = s.quests ?? {}, old = cur[id], mark = q.mark === undefined ? old?.mark ?? null : q.mark, main = !!(q.main ?? old?.main);
  if (old && old.step === q.step && old.name === q.name && !!old.main === main && JSON.stringify(old.mark ?? null) === JSON.stringify(mark)) return false;
  const history = old?.step && old.step !== q.step
    ? [...(old.history ?? []).filter((step) => step !== old.step && step !== q.step), old.step].slice(-12)
    : old?.history;
  s.quests = { ...cur, [id]: { name: q.name, step: q.step, mark, main, at: Date.now(), ...(history?.length ? { history } : {}) } };
  const tr = (s.qtrack ?? []).filter((k) => s.quests[k]);
  if (!old && !tr.includes(id)) { if (q.main) { tr.unshift(id); tr.length = Math.min(tr.length, MAX_TRACK); } else if (tr.length < MAX_TRACK) tr.push(id); } // a new quest is tracked while a slot is free; the main quest always takes one
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
      s.qdone = { ...(s.qdone ?? {}), [id]: { name: old.name, text: typeof doneText === "string" ? doneText : "Completed", place, main: !!old.main, outcome, at: Date.now(), ...(old.history?.length ? { history: old.history } : {}) } };
    }
  } else if (typeof doneText === "string" && id) {
    s.qdone = { ...(s.qdone ?? {}), [id]: { name: s.qdone?.[id]?.name ?? id, text: doneText, outcome, at: Date.now() } };
  }
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
