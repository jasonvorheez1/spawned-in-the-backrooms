// The tracked quests' markers in the world: a diamond over each goal with its distance, in the quest's own tint, drawn for this
// player alone. Also keeps the journal (scripts/lib/quests.js): folds every older quest's player.state.quest into it, and P opens it.
import { questMark } from "./lib/quest-mark.js";
import { setQuest, endQuest, tracked, toggleTrack, qid, MAX_TRACK, PLACE_NAMES } from "./lib/quests.js";
import { canOpen, openWrist } from "./lib/screen.js";
import { NVG_Q } from "./l5-goggles.js";
export const updateSchedule = { every: { seconds: 0.25 } };
const art = (c, exit) => `<svg viewBox='0 0 100 86' width='0.9m' billboard='full'><g stroke='#1a1004' stroke-width='3'>${exit ? `<rect x='34' y='8' width='32' height='40' rx='2' fill='${c}'/><path d='M43 28 H57 M52 22 L58 28 L52 34' stroke-width='3' fill='none'/>` : `<path d='M50 4 L66 26 L50 48 L34 26 Z' fill='${c}'/><path d='M50 14 L58 26 L50 38 L42 26 Z' fill='#fffbe8'/>`}</g><g fill='${c}' stroke='#1a1004' stroke-width='3' paint-order='stroke' font-family='sans-serif' font-weight='bold' text-anchor='middle'><text x='50' y='64' font-size='12'>${exit ? (PLACE_NAMES[exit] ?? exit) : ''}</text><text x='50' y='${exit ? 80 : 68}' font-size='15'>{{ state.d }} m</text></g></svg>`;
// Ines's goggles keeps its own table (scripts/l5-goggles.js), so the journal and the quest never disagree
const REG_STATE = { list: null, asked: false }; // the older quests' own tables: { key, name, tips, marks } rows, read once
function registry() {
  if (REG_STATE.asked) return; REG_STATE.asked = true;
  Promise.all([import("./lib/level10-quests.js"), import("./lib/level11-quests.js"), import("./lib/level21-quests.js"), import("./lib/level8-quests.js"), import("./lib/zenith-quest.js"), import("./lib/remodel-quest.js"), import("./lib/level1-quests.js")])
    .then(([a, b, c, d, z, r, l1]) => { REG_STATE.list = [...Object.values(l1.QUESTS1 ?? {}), ...Object.values(r.QUESTS02 ?? {}), ...Object.values(a.QUESTS10 ?? {}), ...Object.values(b.QUESTS ?? {}), ...Object.values(c.QUESTS21 ?? {}), ...Object.values(d.QUESTS8 ?? {}), { key: "zenQ", name: "The Zenith Survey", tips: z.TIPS ?? {}, marks: z.MARKS ?? {} }, NVG_Q].filter((q) => q?.key && q?.name && q?.tips); })
    .catch(() => { REG_STATE.list = []; });
}
function fold(ctx, s, ses) {
  const q = s.quest, sig = q?.step ? q.name + "|" + q.step : "";
  if (sig !== ses.qsig) {
    if (q?.step) setQuest(s, qid(q.name), { name: q.name, step: q.step, mark: q.mark });
    ses.qsig = sig; ses.qlast = q?.step ? q.name : null;
  }
  const now = ctx.now(); if (now - (ses.qregAt ?? -1e9) < 2000) return; ses.qregAt = now;
  registry(); if (!REG_STATE.list) { ses.qregAt = now - 1500; return; }
  for (const r of REG_STATE.list) { // each older quest's own step number is the truth: in progress = in the journal, finished = out of it
    const id = qid(r.name), step = s[r.key];
    const { step: tip, mark } = r.progress?.(s, ctx.self.place, ctx.place.state) ?? { step: r.tips[step], mark: r.marks?.[step] ?? null };
    if (step === -1) continue; // failed for good: its record is already in the journal log
    if (tip) setQuest(s, id, { name: r.name, step: tip, mark }); else if (s.quests?.[id]) endQuest(s, id);
  }
}
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (input.pressed?.journal) {
    if (s.jrnOpen) s.jrnOpen = false; else if (canOpen(s, ctx.self.place, "journal")) openWrist(s, "journal");
    ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-paper-notebook-page-flip.mp3", volume: 0.5 }, { audience: { player: ctx.self.id } });
  }
  if (input.pressed?.qselect && s.jrnOpen) {
    const d = input.actionData?.qselect
    if (d?.f && ['all', 'active', 'completed', 'failed'].includes(d.f)) s.qfilter = d.f
    const id = d?.id;
    if (typeof id === "string" && (Object.hasOwn(s.quests ?? {}, id) || Object.hasOwn(s.qdone ?? {}, id))) s.qview = id;
  }
  if (input.pressed?.qtrack) {
    const id = input.actionData?.qtrack?.id, r = toggleTrack(s, String(id ?? ""));
    if (r === null) s.notice = { text: `Tracking ${MAX_TRACK} quests already. Untrack one first.`, at: ctx.now() };
    else ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-pencil-tick-mark-on-paper.mp3", volume: 0.5 }, { audience: { player: ctx.self.id } });
  }
}
export function update(ctx) {
  const me = ctx.self; if (!me.isLocal) return ctx.sleep(5);
  const s = me.state; if (s.level == null) return;
  fold(ctx, s, ctx.session);
  const list = tracked(s), p = me.feetPosition, base = "qmark-" + me.id.split(":").pop(), off = !!(s.cut || s.dcut || s.l26cut || s.menuOpen);
  const exits = new Set();
  for (let i = 0; i < MAX_TRACK; i++) {
    const id = base + "-" + i, have = ctx.place.objects[id], q = list[i];
    const t = q && !off ? questMark(ctx, me, q) : null, d = t ? Math.hypot(t.x - p.x, t.z - p.z) : 0;
    if (!t || (t.exit ? exits.has(t.exit) : d < 2.5)) { if (have) ctx.destroy(id); continue; }
    if (t.exit) exits.add(t.exit);
    const at = { x: t.x, y: t.y + 2.5 + i * 0.01, z: t.z }, dd = Math.round(d);
    if (have && (have.state.c !== q.tint || have.state.via !== (t.via ?? ""))) { ctx.destroy(id); continue; }
    if (!have) { ctx.spawn(id, { feetPosition: at, audience: "local", scope: "session", vector: art(q.tint, t.via), state: { d: dd, c: q.tint, via: t.via ?? "" } }); continue; }
    const f = have.feetPosition;
    if (Math.abs(f.x - at.x) + Math.abs(f.y - at.y) + Math.abs(f.z - at.z) > 0.2) have.feetPosition = at;
    if (have.state.d !== dd) have.state.d = dd;
  }
  const old = ctx.place.objects[base]; if (old) ctx.destroy(base); // the single marker from before the journal
}
