// Errands (Shelly: "more errands and tasks to run for npcs who currently may or may not have a purpose").
// Every job is a row in scripts/lib/data/errands.yml; this one handler offers, tracks, finishes and pays them all.
// Saved as player.state.errands = { [id]: { stage, n, k0?, done? } }; each live job shows in the quest journal as "err-<id>"
// with its stage count ("2 / 4"). Talking to a giver offers their job. A dialogue node may also carry do: "errand:<id>"
// (offer) or do: "errand-alt:<id>" (try the second way). Runs on the player's own machine from scripts/main-menu.js.
import ROWS from "./data/errands.yml";
import SNACKS from "./data/snacks.yml";
import BRK from "./data/breakables.yml";
import { setQuest, endQuest, MAX_TRACK } from "./quests.js";
import { pushFeed } from "./feed.js";
import { addRep, fameOf, infamyOf, GROUPS } from "./rep.js";
import { skillsOf } from "./stats.js";
import { entryOf } from "./dialogue.js";

export const ERRANDS = Object.fromEntries((ROWS ?? []).map((r) => [r.id, r]));
const BY_GIVER = {}; for (const r of ROWS ?? []) (BY_GIVER[r.giver] ??= []).push(r);
const NEAR = 4;
const sidOf = (id) => String(id ?? "").split("/").pop();
const qidOf = (id) => `err-${id}`;

// what the player carries of one item token, and taking it
export function held(s, tok) {
  if (tok === "almond") return s.almonds ?? 0;
  if (SNACKS[tok]) return s.snacks?.[tok] ?? 0;
  if (BRK.scrap?.[tok]) return s.scrap?.[tok] ?? 0;
  return 0;
}
function take(s, tok, n) {
  if (tok === "almond") { s.almonds = Math.max(0, (s.almonds ?? 0) - n); return; }
  const b = SNACKS[tok] ? "snacks" : BRK.scrap?.[tok] ? "scrap" : null; if (!b) return;
  s[b] = { ...(s[b] ?? {}), [tok]: Math.max(0, (s[b]?.[tok] ?? 0) - n) };
}
const tell = (ctx, s, text, kind = "good") => { s.notice = { text, at: ctx.now() }; pushFeed(s, text, ctx.now(), kind); };

// the journal line for a job's current stage
export function errandText(s, id) {
  const e = ERRANDS[id], r = s.errands?.[id], g = e?.stages?.[r?.stage]; if (!g) return null;
  const c = g.count ?? 1, n = Math.min(c, liveN(s, g, r));
  return c > 1 ? `${g.text}: ${n} / ${c}` : g.text;
}
function liveN(s, g, r) {
  if (g.kind === "fetch") return held(s, g.target);
  if (g.kind === "clear") return Math.max(0, (s.kills ?? 0) - (r.k0 ?? s.kills ?? 0));
  return r.n ?? 0;
}
function sync(s, id) {
  const e = ERRANDS[id], g = e.stages[s.errands[id].stage];
  const mark = g && g.kind !== "fetch" && g.kind !== "clear" && (s.trail?.word || e.place === "thehub") ? { place: e.place, id: g.target } : null; // a map mark prints a place's name: only once the player has a word for places
  setQuest(s, qidOf(id), { name: e.title, step: errandText(s, id), mark });
}
function enter(s, id, stage) {
  const r = { stage, n: 0 }, g = ERRANDS[id].stages[stage];
  if (g?.kind === "clear") r.k0 = s.kills ?? 0;
  s.errands = { ...(s.errands ?? {}), [id]: r };
}

// a job with needs: { group, fame } waits until that faction knows your name that well (New Vegas: Accepted 12, Liked 35);
// any job's giver turns you away while their faction hates you. Told once a session, then quiet.
export function standingOk(s, e) {
  const g = e?.needs?.group ?? e?.reward?.rep?.group;
  if (g && infamyOf(s, g) >= 35 && fameOf(s, g) < 35) return { ok: false, why: `${GROUPS[g]?.name ?? g} won't give you work while they hate you.` };
  if (e?.needs?.group && fameOf(s, e.needs.group) < (e.needs.fame ?? 0)) return { ok: false, why: e.needs.text ?? `${GROUPS[e.needs.group]?.name ?? e.needs.group} has more work, once they trust you.` };
  return { ok: true };
}
export function offerErrand(ctx, s, id) {
  const e = ERRANDS[id]; if (!e || s.errands?.[id]) return false;
  const gate = standingOk(s, e);
  if (!gate.ok) { const ss = ctx.session ?? {}; if (!ss.errGate?.[id]) { ss.errGate = { ...(ss.errGate ?? {}), [id]: 1 }; tell(ctx, s, gate.why, "info"); } return false; }
  enter(s, id, 0); sync(s, id);
  if (!(s.qtrack ?? []).includes(qidOf(id)) && (s.qtrack ?? []).length < MAX_TRACK) s.qtrack = [...(s.qtrack ?? []), qidOf(id)];
  tell(ctx, s, `New job: ${e.title}`, "info");
  return true;
}

export function payErrand(ctx, s, id, scale = 1, how = null) {
  const e = ERRANDS[id], w = e.reward ?? {}, r = s.errands?.[id]; if (!e || !r || r.done) return null;
  const cents = Math.round((w.cents ?? 0) * scale), xp = Math.round((w.xp ?? 0) * scale), items = [...(w.item ?? [])];
  s.cents = (s.cents ?? 0) + cents;
  const prev = s.payout; s.payout = { xp: (prev?.xp ?? 0) + xp, items: [...(prev?.items ?? []), ...items], text: null }; // scripts/craft.js hands these over
  const msgs = [`${e.title} done. ${xp} XP, $${(cents / 100).toFixed(2)}`];
  if (w.rep?.group && w.rep.d) { const t = addRep(s, w.rep.group, w.rep.d, `Completed ${e.title}`); if (t) msgs.push(t); }
  if (how) msgs.unshift(how);
  s.errands = { ...s.errands, [id]: { stage: e.stages.length, n: 0, done: 1 } };
  endQuest(s, qidOf(id), deliberateErrands(e.place) ? (how || `${e.title} completed for ${e.giver.replace(/^hub-(meg|amber)-/, '')}.`) : false);
  let hint = null;
  if (w.trail && e.hint && !s.trail?.[w.trail] && (e.hintNeeds !== "name" || s.trail?.name)) { hint = e.hint; s.errHints = [...(s.errHints ?? []).filter((h) => h !== hint), hint].slice(-12); } // a lead, never the trail key itself
  tell(ctx, s, msgs.join(". "));
  if (hint) pushFeed(s, hint, ctx.now(), "info");
  return { id, cents, xp, items, rep: w.rep ?? null, hint };
}

// step one job with what just happened: who you are talking to (sid) and where you stand (me)
function step(ctx, s, id, sid, me) {
  const e = ERRANDS[id];
  for (let guard = 0; guard < 8; guard++) {
    const r = s.errands[id]; if (!r || r.done) return;
    const g = e.stages[r.stage]; if (!g) { payErrand(ctx, s, id); return; }
    const c = g.count ?? 1; let ok = false;
    if (g.kind === "fetch") ok = held(s, g.target) >= c;
    else if (g.kind === "clear") ok = liveN(s, g, r) >= c;
    else if (g.kind === "talk") ok = sid === g.target;
    else if (g.kind === "carry") { if (sid === g.target && held(s, g.item) >= c) { take(s, g.item, c); ok = true; } }
    else if ((g.kind === "find" || g.kind === "repair") && me) {
      const o = ctx.getObject(g.target), p = o && (o.worldFeetPosition ?? o.feetPosition);
      const d = p ? Math.hypot(p.x - me.x, p.z - me.z) : Infinity;
      if (d <= NEAR) {
        if (g.kind === "find") ok = true;
        else if (held(s, g.item) > 0) { take(s, g.item, 1); s.errands = { ...s.errands, [id]: { ...r, n: (r.n ?? 0) + 1 } }; ok = (r.n ?? 0) + 1 >= c; if (!ok) tell(ctx, s, `Fixed. ${(r.n ?? 0) + 1} / ${c}`, "info"); }
      }
    }
    if (!ok) { sync(s, id); return; }
    if (r.stage + 1 >= e.stages.length) { payErrand(ctx, s, id); return; }
    enter(s, id, r.stage + 1); sync(s, id);
  }
}

// A Hub hand-in is an explicit dialogue choice, including for jobs already in progress.
export const deliberateErrands = (place) => ["main", "level01", "level02", "level1", "level2", "level21", "level3", "level4", "level5", "level6", "level61", "level7", "level8", "level9", "level10", "level11", "thehub"].includes(place);
export function turnInErrand(ctx, s, id, npc) {
  const e = ERRANDS[id], r = s.errands?.[id];
  if (!e || !deliberateErrands(e.place) || !r || r.done) return false;
  const g = e.stages[r.stage];
  if (!g || !["talk", "carry"].includes(g.kind) || g.target !== npc) return false;
  const before = r.stage; step(ctx, s, id, npc, null);
  return !!s.errands[id]?.done || s.errands[id]?.stage !== before;
}

// the second way through, tried in a conversation with the giver
export function tryAlt(ctx, s, id) {
  const e = ERRANDS[id], a = e?.alt, r = s.errands?.[id]; if (!a || !r || r.done) return false;
  if (a.kind === "item" && held(s, a.item) >= (a.count ?? 1)) { take(s, a.item, a.count ?? 1); payErrand(ctx, s, id, 1, a.text); return true; }
  if (a.kind === "speech" && (skillsOf(s).speech ?? 0) >= (a.sk ?? 100)) { payErrand(ctx, s, id, a.pay ?? 0.5, a.text); return true; }
  return false;
}

const findNode = (v, q) => { if (!v || typeof v !== "object") return null; if (v.q === q) return v; for (const c of Array.isArray(v) ? v : Object.values(v)) { const n = findNode(c, q); if (n) return n; } return null; };

// once per tick from scripts/main-menu.js
export function errandTick(ctx, ses, s, place) {
  if (!ses || place === "tutorial0" || place === "bonus" || place === "intake") return;
  const sid = s.talkWith ? sidOf(s.talkWith) : null, fresh = sid && ses.errTalk !== sid;
  ses.errTalk = sid;
  if (fresh) {
    for (const e of BY_GIVER[sid] ?? []) {
      if (e.place !== place || deliberateErrands(e.place)) continue;
      const r = s.errands?.[e.id];
      if (!r) offerErrand(ctx, s, e.id);
      else if (!r.done) { step(ctx, s, e.id, sid, null); if (!s.errands[e.id].done && ses.errMet?.[e.id]) tryAlt(ctx, s, e.id); }
      ses.errMet = { ...(ses.errMet ?? {}), [e.id]: 1 };
    }
    for (const [id, r] of Object.entries(s.errands ?? {})) if (!r.done && ERRANDS[id] && !deliberateErrands(ERRANDS[id].place) && ERRANDS[id].giver !== sid) step(ctx, s, id, sid, null);
  }
  // do: "errand:<id>" / "errand-alt:<id>" on any dialogue node
  const asked = ctx.self.session?.askedNow; // scripts/talk.js keeps the asked questions on the body's own session
  if (sid && asked?.length && (ses.errSeen ?? 0) < asked.length) {
    let ent = null; try { const it = ctx.getObject(s.talkWith); ent = it ? entryOf(it, place)?.e : null; } catch { ent = null; }
    for (let i = ses.errSeen ?? 0; i < asked.length; i++) {
      const d = findNode(ent?.ask, String(asked[i] ?? ""))?.do;
      if (typeof d !== "string") continue;
      if (d.startsWith("errand:")) offerErrand(ctx, s, d.slice(7));
      else if (d.startsWith("errand-alt:")) tryAlt(ctx, s, d.slice(11));
    }
  }
  ses.errSeen = asked?.length ?? 0;
  // the rest of the time, twice a second: counts, places reached, fixes made
  const now = ctx.now(); if (now - (ses.errAt ?? 0) < 500) return; ses.errAt = now;
  const me = ctx.self.feetPosition;
  for (const [id, r] of Object.entries(s.errands ?? {})) {
    const e = ERRANDS[id]; if (r.done || !e) continue;
    const g = e.stages[r.stage]; if (!g || g.kind === "talk" || g.kind === "carry") { if (g && s.quests?.[qidOf(id)]?.step !== errandText(s, id)) sync(s, id); continue; }
    step(ctx, s, id, null, e.place === place ? me : null);
  }
}
