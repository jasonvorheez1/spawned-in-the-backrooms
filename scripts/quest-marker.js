// The tracked quests' markers in the world: a diamond over each goal with its distance, in the quest's own tint, drawn for this
// player alone. Also keeps the journal (scripts/lib/quests.js): folds every older quest's player.state.quest into it, and P opens it.
import { questMark } from "./lib/quest-mark.js";
import { setQuest, endQuest, tracked, toggleTrack, qid, MAX_TRACK } from "./lib/quests.js";
import { canOpen, openWrist } from "./lib/screen.js";
export const updateSchedule = { every: { seconds: 0.25 } };
const art = (c) => `<svg viewBox='0 0 60 80' width='0.55m' billboard='full'><g filter='drop-shadow(0 0 5px ${c})'><path d='M30 4 L46 26 L30 48 L14 26 Z' fill='${c}' stroke='#1a1004' stroke-width='3'/><path d='M30 14 L38 26 L30 38 L22 26 Z' fill='#fffbe8'/></g><text x='30' y='72' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle' fill='${c}' stroke='#1a1004' stroke-width='3' paint-order='stroke'>{{ state.d }} m</text></svg>`;
let REG = null, regAsked = false; // the older quests' own tables: { key, name, tips } rows, read once
function registry() {
  if (regAsked) return; regAsked = true;
  Promise.all([import("./lib/level10-quests.js"), import("./lib/level11-quests.js"), import("./lib/level21-quests.js"), import("./lib/level8-quests.js"), import("./lib/zenith-quest.js")])
    .then(([a, b, c, d, z]) => { REG = [...Object.values(a.QUESTS10 ?? {}), ...Object.values(b.QUESTS ?? {}), ...Object.values(c.QUESTS21 ?? {}), ...Object.values(d.QUESTS8 ?? {}), { key: "zenQ", name: "The Zenith Survey", tips: z.TIPS ?? {} }].filter((q) => q?.key && q?.name && q?.tips); })
    .catch(() => { REG = []; });
}
function fold(ctx, s, ses) {
  const q = s.quest, sig = q?.step ? q.name + "|" + q.step : "";
  if (sig !== ses.qsig) {
    if (q?.step) setQuest(s, qid(q.name), { name: q.name, step: q.step, mark: q.mark });
    else if (ses.qlast) endQuest(s, qid(ses.qlast));
    ses.qsig = sig; ses.qlast = q?.step ? q.name : null;
  }
  const now = ctx.now(); if (now - (ses.qregAt ?? -1e9) < 2000) return; ses.qregAt = now;
  registry(); if (!REG) { ses.qregAt = now - 1500; return; }
  for (const r of REG) { // each older quest's own step number is the truth: in progress = in the journal, finished = out of it
    const id = qid(r.name), tip = r.tips[s[r.key]];
    if (tip) setQuest(s, id, { name: r.name, step: tip }); else if (s.quests?.[id]) endQuest(s, id);
  }
  if ((s.nvgQ ?? 0) >= 4 && s.quests?.["ines-s-goggles"]) endQuest(s, "ines-s-goggles");
}
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (input.pressed?.journal) {
    if (s.jrnOpen) s.jrnOpen = false; else if (canOpen(s, ctx.self.place, "journal")) openWrist(s, "journal");
    ctx.emit("playSound", { clip: "cdn/moodboard-realistic-gritty/sfx-paper-notebook-page-flip.mp3", volume: 0.5 }, { audience: { player: ctx.self.id } });
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
  for (let i = 0; i < MAX_TRACK; i++) {
    const id = base + "-" + i, have = ctx.place.objects[id], q = list[i];
    const t = q && !off ? questMark(ctx, me, q) : null, d = t ? Math.hypot(t.x - p.x, t.z - p.z) : 0;
    if (!t || d < 2.5) { if (have) ctx.destroy(id); continue; }
    const at = { x: t.x, y: t.y + 2.5 + i * 0.01, z: t.z }, dd = Math.round(d);
    if (have && have.state.c !== q.tint) { ctx.destroy(id); continue; }
    if (!have) { ctx.spawn(id, { feetPosition: at, audience: "local", scope: "session", vector: art(q.tint), state: { d: dd, c: q.tint } }); continue; }
    const f = have.feetPosition;
    if (Math.abs(f.x - at.x) + Math.abs(f.y - at.y) + Math.abs(f.z - at.z) > 0.2) have.feetPosition = at;
    if (have.state.d !== dd) have.state.d = dd;
  }
  const old = ctx.place.objects[base]; if (old) ctx.destroy(base); // the single marker from before the journal
}
