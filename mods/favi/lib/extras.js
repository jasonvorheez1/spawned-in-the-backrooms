// Favi's four extras, all under world.state.favi:
//   watch: Playtest Eyes. { active, pid, name, started, until, n, busy, report: { summary, stuck[], bored[], lost[], fixes[] }, at, error }
//          the favi-brain row samples the watched player once a second (samples stay in this script's memory, never in state),
//          then one llm:generate turns the numbers into what got them stuck, bored or lost.
//   spark: the daily spark. { text, why, at, busy } · sparks: { kept: [{ text, at }] }
//   forge.files[id].check: plan vs game. { busy, items: [{ item, status: done|half|missing, note }], summary, at, error }
//   moodboard: the active refs set, drawn in chat; its name rides every Main Favi message through sight.js.
import { J } from "./brain.js";
import { sight } from "./sight.js";
import { compactFile } from "./forge.js";
const clip = (s, n) => String(s ?? "").slice(0, n);
const seen = (ctx, n) => { try { return sight(ctx).slice(0, n); } catch { return "(unreadable)"; } };
const WATCH_S = 60;
// every player in the room: world.players, else each place's own list (the host's world list can come back empty)
function everyone(ctx) {
  const a = ctx.world.players ?? []; if (a.length) return a;
  const out = []; try { for (const pl of Object.values(ctx.world.places ?? {})) for (const x of pl?.players ?? []) out.push(x); } catch {}
  try { if (!out.length) out.push(...(ctx.place?.players ?? [])); } catch {}
  return out;
}

// ---------- Playtest Eyes ----------
// samples ride the watch row itself (a minute of [t,x,y,z] is tiny) so whichever machine ticks the runner sees the whole trail
// a press never writes the watch row itself: it drops a request (f.watchReq) and the brain, the row's only writer, acts on it.
// two machines writing one row was why "done, read it now" could sit on "wrapping up" forever: the brain's next sample
// overwrote the press. requests carry their own id, so each one lands exactly once.
export function startWatch(ctx, f, pid, who) { f.watchReq = { k: "start", pid, name: who ?? "you", id: "r" + Math.floor(ctx.now()).toString(36) + Math.floor(ctx.random() * 1e6).toString(36) }; }
// stop and cancel go to the brain; when her heartbeat is quiet (no brain ticking in this room) the press finishes it itself,
// so "wrapping up" can never hang. cancel always lands at once: nothing the brain does depends on it.
const quiet = (ctx, f) => !f.beat || ctx.now() - (f.beat.at ?? 0) > 5000;
export function stopWatch(ctx, f) {
  const id = "r" + Math.floor(ctx.now()).toString(36) + Math.floor(ctx.random() * 1e6).toString(36);
  f.watchReq = { k: "stop", id, at: ctx.now() };
  if (quiet(ctx, f)) { f.watchReqDone = id; finish(ctx, f.watch); }
}
export function cancelWatch(ctx, f) {
  const id = "r" + Math.floor(ctx.now()).toString(36) + Math.floor(ctx.random() * 1e6).toString(36);
  f.watchReq = { k: "cancel", id, at: ctx.now() }; f.watchReqDone = id;
  const w = f.watch; if (w) { w.active = false; w.busy = false; w.tok = null; w.trail = []; w.stopping = false; }
}
function finish(ctx, w) {
  if (!w?.active) return;
  w.active = false; w.stopping = false; const s = (w.trail ?? []).map(([t, x, y, z, pl]) => ({ t, x, y, z, pl })); w.trail = []; w.n = s.length; report(ctx, w, s);
}
function takeReq(ctx, f) {
  const r = f.watchReq; if (!r || r.id === f.watchReqDone) return;
  f.watchReqDone = r.id; const w = f.watch;
  if (r.k === "start") { if (w?.active || w?.busy) return; f.watch = { trail: [], last: 0, active: true, pid: r.pid, name: r.name, started: ctx.now(), until: ctx.now() + WATCH_S * 1000, n: 0, busy: false, report: w?.report ?? null, error: null }; }
  else if (r.k === "stop") { if (w?.active) w.until = ctx.now(); }
  else if (r.k === "cancel") { if (w) { w.active = false; w.busy = false; w.tok = null; w.trail = []; w.stopping = false; } }
}
// the favi-brain row calls this every tick
export function watchTick(ctx) {
  const f0 = ctx.world.state.favi; if (!f0) return; takeReq(ctx, f0);
  const f = f0, w = f.watch; if (!w) return;
  if (w.busy && ctx.now() - (w.busyAt ?? 0) > 90000) { w.busy = false; w.tok = null; w.error = "favi took too long writing it up. watch again?"; }
  if (!w.active) return;
  const now = ctx.now();
  if (now - (w.last ?? 0) >= 1000) {
    w.last = now;
    const p = everyone(ctx).find((x) => x.id === w.pid) ?? everyone(ctx)[0];
    if (p?.feetPosition) { const q = p.feetPosition; w.trail = [...(w.trail ?? []), [+((now - w.started) / 1000).toFixed(1), +q.x.toFixed(1), +q.y.toFixed(1), +q.z.toFixed(1), String(p.place?.id ?? p.place ?? "")]].slice(-90); w.n = w.trail.length; }
  }
  if (now >= w.until) finish(ctx, w);
}
function stats(s) {
  if (s.length < 3) return null;
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  let path = 0; const jumps = [], idle = [], cells = {};
  for (let i = 1; i < s.length; i++) { const k = d(s[i], s[i - 1]); if (k > 6 || s[i].pl !== s[i - 1].pl) jumps.push({ t: s[i].t, from: [s[i - 1].x, s[i - 1].y, s[i - 1].z], to: [s[i].x, s[i].y, s[i].z], place: s[i].pl }); else path += k; }
  let run = 0;
  for (let i = 1; i < s.length; i++) { if (d(s[i], s[i - 1]) < 0.3) run++; else { if (run >= 5) idle.push({ at: [s[i - 1].x, s[i - 1].y, s[i - 1].z], seconds: run, t: s[i - 1].t - run }); run = 0; } }
  if (run >= 5) { const l = s[s.length - 1]; idle.push({ at: [l.x, l.y, l.z], seconds: run, t: l.t - run }); }
  for (const p of s) { const key = `${Math.round(p.x / 4) * 4},${Math.round(p.y / 4) * 4},${Math.round(p.z / 4) * 4}`; cells[key] = (cells[key] ?? 0) + 1; }
  const top = Object.entries(cells).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c} for ${n}s`);
  const xs = s.map((p) => p.x), ys = s.map((p) => p.y), zs = s.map((p) => p.z);
  const trail = s.filter((_, i) => i % 3 === 0).map((p) => `${p.t.toFixed(0)}s:(${p.x},${p.y},${p.z})`).join(" ");
  return `SECONDS WATCHED: ${s.length}\nDISTANCE WALKED: ${path.toFixed(0)} m (${(path / s.length).toFixed(1)} m/s average)\nAREAS VISITED (4 m cells): ${Object.keys(cells).length}\nWHERE TIME WENT: ${top.join("; ")}\nSPAN: x ${Math.min(...xs)}..${Math.max(...xs)}, y ${Math.min(...ys)}..${Math.max(...ys)}, z ${Math.min(...zs)}..${Math.max(...zs)}\nSTOOD STILL (5s+): ${idle.map((x) => `${x.seconds}s at (${x.at}) from ${x.t.toFixed(0)}s`).join("; ") || "never"}\nTELEPORTS / RESPAWNS / PLACE CHANGES: ${jumps.map((j) => `${j.t.toFixed(0)}s (${j.from}) → (${j.to})${j.place ? " in " + j.place : ""}`).join("; ") || "none"}\nTRAIL every 3s: ${trail}`;
}
const WATCH_SCHEMA = { type: "object", required: ["summary", "stuck", "bored", "lost", "fixes"], properties: { summary: { type: "string" },
  stuck: { type: "array", maxItems: 3, items: { type: "string" } }, bored: { type: "array", maxItems: 3, items: { type: "string" } },
  lost: { type: "array", maxItems: 3, items: { type: "string" } }, fixes: { type: "array", maxItems: 3, items: { type: "string" } } } };
function report(ctx, w, s) {
  const st = stats(s);
  if (!st) { w.error = "favi couldn't see you move. play in the game (out of god mode) while she watches, then try again."; return; }
  const tok = "w" + Math.floor(ctx.now()).toString(36); w.busy = true; w.busyAt = ctx.now(); w.tok = tok; w.error = null;
  J(ctx, "llm:generate", { conversationId: "favi-watch:" + tok, model: "smart",
    system: "You are Favi from Idea Forge, a warm, sharp game design buddy, reading a playtest. You get movement numbers from one minute of the creator playing their own game, plus a read of the game itself (its objects and ids with positions you can match against). Say where they got STUCK (stood still long, respawned or fell, circled one area), where they got BORED (long empty walks, nothing near them, slow stretches), where they got LOST (back-and-forth, revisits, wandering away from what matters). Name places by what stands there (nearest object id or area), plus coordinates. Only claim what the numbers show; an empty list is fine. summary: 1-2 lowercase sentences in your voice. fixes: up to 3 concrete changes to the game, each one short sentence. Every item one short sentence, lowercase.",
    message: `PLAYTEST NUMBERS:\n${st}\n\nTHE GAME:\n${seen(ctx, 3500)}`, schema: WATCH_SCHEMA }, (r) => {
    const f = ctx.world.state.favi, g = f?.watch; if (!g || g.tok !== tok) return;
    g.busy = false; g.tok = null; const o = r && r.ok ? r.data?.object : null;
    if (!o?.summary) { g.error = "favi's write-up didn't come through. watch again?"; return; }
    const L = (a) => (a ?? []).slice(0, 3).map((x) => clip(x, 220));
    g.report = { summary: clip(o.summary, 400), stuck: L(o.stuck), bored: L(o.bored), lost: L(o.lost), fixes: L(o.fixes), seconds: s.length, at: ctx.now() };
  });
}

// ---------- Daily spark ----------
const SPARK_SCHEMA = { type: "object", required: ["text", "why"], properties: { text: { type: "string" }, why: { type: "string" } } };
export function maybeSpark(ctx, f, force = false) {
  const sp = f.spark;
  if (sp?.busy && ctx.now() - (sp.busyAt ?? 0) < 90000) return;
  if (!force && sp?.text && ctx.now() - (sp.at ?? 0) < 20 * 3600 * 1000) return;
  const tok = "k" + Math.floor(ctx.now()).toString(36);
  f.spark = { ...(sp ?? {}), busy: true, busyAt: ctx.now(), tok };
  const kept = (f.sparks?.kept ?? []).map((x) => x.text), tossed = (f.sparks?.tossed ?? []).slice(-12);
  J(ctx, "llm:generate", { conversationId: "favi-spark:" + tok, model: "fast",
    system: "You are Favi from Idea Forge, a warm, sharp game design buddy. Give the creator ONE small, concrete idea for their actual game below: something buildable in an afternoon that makes it more alive, fun or memorable (a moment, a mechanic twist, a detail, a secret). text: the idea in one lowercase sentence under 22 words, specific to THIS game (name its places and things). why: under 14 words, what it adds. Never repeat or rephrase an idea already kept or tossed.",
    message: `ALREADY KEPT: ${kept.join(" | ") || "none"}\nTOSSED: ${tossed.join(" | ") || "none"}\n\nTHE GAME:\n${seen(ctx, 3500)}`, schema: SPARK_SCHEMA }, (r) => {
    const g = ctx.world.state.favi; if (g?.spark?.tok !== tok) return;
    const o = r && r.ok ? r.data?.object : null;
    g.spark = o?.text ? { text: clip(o.text, 220), why: clip(o.why, 140), at: ctx.now(), busy: false } : { ...(g.spark ?? {}), busy: false, failed: true };
  });
}
export function sparkOp(ctx, f, op) {
  f.sparks ??= { kept: [], tossed: [] };
  const t = f.spark?.text;
  if (op === "keep" && t) { f.sparks = { ...f.sparks, kept: [{ text: t, at: ctx.now() }, ...(f.sparks.kept ?? [])].slice(0, 30) }; f.spark = { ...f.spark, kept: true }; return; }
  if (op === "toss" && t) { f.sparks = { ...f.sparks, tossed: [...(f.sparks.tossed ?? []), t].slice(-30) }; maybeSpark(ctx, f, true); return; }
  if (op === "another") { maybeSpark(ctx, f, true); return; }
  if (op === "forget") { f.sparks = { ...f.sparks, kept: [] }; return; }
}

// ---------- Plan vs game ----------
const CHECK_SCHEMA = { type: "object", required: ["summary", "items"], properties: { summary: { type: "string" },
  items: { type: "array", maxItems: 18, items: { type: "object", required: ["item", "status", "note"], properties: { item: { type: "string" }, status: { type: "string", enum: ["done", "half", "missing"] }, note: { type: "string" } } } } } };
export function checkPlan(ctx, p) {
  if (p.check?.busy && ctx.now() - (p.check.busyAt ?? 0) < 110000) return;
  const tok = "c" + Math.floor(ctx.now()).toString(36);
  p.check = { ...(p.check ?? {}), busy: true, busyAt: ctx.now(), tok, error: null };
  J(ctx, "llm:generate", { conversationId: "favi-check:" + tok, model: "smart",
    system: "You compare a game's design file (the plan) with the game as it is actually built (the live read). List the plan's concrete deliverables, most important first (core loop, win/lose, controls, key content, ui, art, audio), up to 18. For each: item = the thing in 2-6 words; status = done (clearly built), half (some of it stands), missing (no sign of it); note = under 14 words naming the evidence (an object id, a file, a tag) or what's absent. Judge only from the live read, never assume. summary: one lowercase sentence, how far along it is.",
    message: `THE PLAN:\nTITLE: ${p.title}\nPITCH: ${p.pitch}\n${compactFile(p).slice(0, 7000)}\n\nTHE GAME AS BUILT:\n${seen(ctx, 5000)}`, schema: CHECK_SCHEMA }, (r) => {
    const q = ctx.world.state.favi?.forge?.files?.[p.id]; if (!q || q.check?.tok !== tok) return;
    const o = r && r.ok ? r.data?.object : null;
    if (!o?.items?.length) { q.check = { ...q.check, busy: false, tok: null, error: "favi couldn't line them up this time. check again?" }; return; }
    const items = o.items.slice(0, 18).map((x) => ({ item: clip(x.item, 60), status: ["done", "half", "missing"].includes(x.status) ? x.status : "missing", note: clip(x.note, 140) }));
    q.check = { busy: false, tok: null, items, summary: clip(o.summary, 240), at: ctx.now(), pct: Math.round(items.reduce((n, x) => n + (x.status === "done" ? 1 : x.status === "half" ? 0.5 : 0), 0) / items.length * 100) };
  });
}
