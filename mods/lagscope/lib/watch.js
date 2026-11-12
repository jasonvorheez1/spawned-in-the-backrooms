// LAGSCOPE watch: rides every player's body (mod.json attach "player", via ../watch.js). On the local machine only it
//  - samples the engine's frame counters, long frames, heap and the scene within 250 m (scene.js)
//  - judges them every 3 s with core.js and, when the game stays red (or yellow, if the settings say so), saves ONE
//    report to the game's database (store.js); the same causes from the same player stay one row for 6 h
//  - feeds the panel (ctx.session.lsRow, 4 a second) while it is open, and runs the builders' panel asks.
// Nothing is written to the player's state or the world's: a game with LAGSCOPE installed plays exactly as before.
import { analyze, causes, reportText } from "./core.js";
import { brief, briefText } from "./brief.js";
import { sample, sceneStep, sceneSnap, sceneFresh, stalls, tagGc, heapNow, env, addStall, noteStalls } from "./scene.js";
import { startProbe, threadSnap } from "./probe.js";
import { cfg, cfgNow, insert, handle, drain, clean, publishCfg } from "./store.js";

const clock = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
const W = { ents: [], entAt: 0, tagBase: null, rows: [], heap: [], start: 0, at: 0, judged: 0, streak: { bad: 0, warn: 0, calm: 0 }, sentSig: null, sentAt: -1e9, pending: null, bot: null, calls: 0, callAt: 0, gap: 0, fc: [], fg: [] };
const p99 = (v) => { if (v.length < 5) return NaN; const s = v.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.99))]; };

// since (2.0): a scan on demand reads only what happened after the previous scan (4 s at least, 60 s at most), so a fix's
// "after" reading never carries the "before": fps samples, stalls, thread beats and frame costs older than it are not its own.
function input(ctx, now, since = 0) {
  const win = Math.max(4000, Math.min(60000, now - since));
  const rows = W.rows.filter((r) => now - r.t < win), mins = rows.length ? Math.max(0.1, (now - rows[0].t) / 60000) : 0.05;
  const fpsAvg = rows.reduce((a, r) => a + (r.fps || 0), 0) / Math.max(1, rows.length) || 60;
  tagGc(W.heap);
  const st = stalls().filter((s) => now - s.t < win);
  const ft = []; for (const r of rows) if (r.fps > 0) for (let k = 0; k < Math.round(r.fps / 2); k++) ft.push(1000 / r.fps);
  for (const s of st) { ft.push(s.ms); ft.splice(0, Math.round(s.ms / 16.7)); }
  return { fps: rows.map((r) => r.fps), ft, ftReal: false, worst: [], cpu: rows.map((r) => r.cpu), gpu: rows.map((r) => r.gpu), draw: rows.map((r) => r.draw), tri: rows.map((r) => r.tri),
    heap: W.heap.filter((q) => now - q[0] < 180000), stalls: st, minutes: mins, js: 0, top: null, sys: [], scene: sceneSnap(), ping: ctx.self?.latencyMs, pingSer: rows.map((r) => r.ping), sim: null, fpsAvg, thread: threadSnap(win), windowMs: Math.round(win), ents: entTrend(ctx), view: (() => { const l = rows[rows.length - 1] || {}; return { gpuMemoryMB: l.gmem, renderScale: l.rs, netInBytes: l.net, netOutBytes: l.nout, netInMessages: l.nmsg }; })(),
    tick: (() => { const r = rows.filter((q) => q.hz > 0).slice(-20); return r.length ? { hz: +(r.reduce((a, q) => a + q.hz, 0) / r.length).toFixed(1), worst: Math.round(Math.max(...r.map((q) => q.gap || 0))) } : null; })(), // how often this body's update() really ran (30 = on time) and its longest gap
    cost: { cpuP99: p99(W.fc), gpuP99: p99(W.fg) } }; // per-frame render cost from ctx.view.frames, last ~600 frames
}
// the place's object count over ~3 min: a count that only climbs is something spawning without ever leaving
function entTrend(ctx) {
  const e = W.ents; if (e.length < 12) return null;
  const a = e[0], b = e[e.length - 1], mins = (b[0] - a[0]) / 60000; if (mins < 0.5) return null; // 2.0: read from 30 s on, so one jump is told as a jump (steady false); a leak still needs 1.5 min
  let lo = Infinity; for (let i = Math.floor(e.length / 2); i < e.length; i++) lo = Math.min(lo, e[i][1]); // still high in the second half, not a passing wave
  const gain = Math.min(lo, b[1]) - a[1], perMin = gain / mins;
  let grower = null; const sc = sceneSnap(); if (sc && W.tagBase) { let best = 0; for (const [t, n] of sc.tags || []) { const d = n - (W.tagBase[t] || 0); if (d > best && t !== "player") { best = d; grower = t; } } if (best < 30) grower = null; }
  // steady (2.0): a leak climbs sample after sample; one spawn lands in a single step. rises = 2 s steps that grew,
  // jump = the biggest growth inside any 10 s (a batch streams in over a few samples). steady only when the growth is spread.
  let rises = 0, jump = 0; for (let i = 1; i < e.length; i++) { const d = e[i][1] - e[i - 1][1]; if (d > 0) rises++; const d2 = e[i][1] - e[Math.max(0, i - 5)][1]; if (d2 > jump) jump = d2; }
  const steady = gain > 0 && mins >= 1.5 && rises >= 3 && jump <= gain * 0.5;
  return { n: b[1], gain, perMin, steady, rises, jump, place: ctx.place?.id || "?", grower };
}
// a frame dip: fps fell to under half the running median while the game thread kept time (so the drawing side, not scripts)
function dips(now) {
  const r = W.rows; if (r.length < 20) return; const last = r[r.length - 1]; if (!(last.fps > 0) || W.dipAt && now - W.dipAt < 2000) return;
  const v = r.slice(-60).map((q) => q.fps).filter((x) => x > 0).sort((a, b) => a - b), med = v[v.length >> 1];
  if (med >= 30 && last.fps < med * 0.5) { const th = stalls().find((q) => q.kind === "thread" && now - q.t < 1500); if (!th) { W.dipAt = now; addStall({ t: now - 1000, ms: 1000 / Math.max(1, last.fps), kind: "dip", cause: `frame rate fell to ${last.fps} fps from ${med} (drawing or the browser; the game thread kept time)` }); } }
}
// the settings' fps lines raise the engine's own judgement: under "red under fps" is red, under "yellow under fps" at least yellow
function judge(I) {
  const a = analyze(I), c = cfgNow(), fps = a.stats?.fps;
  if (Number.isFinite(fps) && a.score != null) {
    if (fps < c.red && a.level !== "bad") { a.level = "bad"; a.verdict.unshift(["bad", `averaging ${Math.round(fps)} fps, under the red line of ${c.red}`]); }
    else if (fps < c.warn && a.level === "ok") { a.level = "warn"; a.verdict.unshift(["warn", `averaging ${Math.round(fps)} fps, under the yellow line of ${c.warn}`]); }
  }
  return a;
}
export function analyzeNow(ctx) { return judge(input(ctx, clock())); }

async function report(ctx, lv, trigger, sig, since = 0) {
  const p = ctx.self, now = clock(), I = input(ctx, now, since), a = judge(I), f = p.feetPosition || {}, start = Date.now() - now;
  const game = ctx.world?.name || ctx.world?.address || "";
  // 2.0: measured ms per script on this machine, when the engine hands its timers to a behavior (brief.js reads I.sim.scripts)
  if (W.simScripts && now - W.simAt < 30000) I.sim = { scripts: W.simScripts }; // asked when the scan began (scan()); the report never waits on it
  if (W.phys && now - W.physAt < 30000) I.phys = W.phys; // the engine's physics/step row, ms a step (p50/p95/max)
  const ai = brief(I, a);
  const text = briefText(ai) + "\n---- raw reading ----\n" + reportText(I, a, { game, place: ctx.place?.id, server: ctx.world?.mode ?? "", who: p.displayName, trigger: `${trigger} at ${Math.round(f.x ?? 0)}, ${Math.round(f.z ?? 0)}`, env: env(ctx), clock: (t) => new Date(start + t).toISOString().slice(11, 19) + " " });
  const s = a.stats || {}, sum = { fps: Number.isFinite(s.fps) ? Math.round(s.fps) : null, low1: Number.isFinite(s.P?.low1) ? Math.round(s.P.low1) : null, gpu: +(s.gpu || 0).toFixed(1), cpu: +(s.cpu || 0).toFixed(1), draw: Math.round(s.draw || 0), tri: +((s.tri || 0) / 1e6).toFixed(2), heap: Math.round(s.M?.now || 0), stalls: I.stalls.length, ping: Number.isFinite(p.latencyMs) ? Math.round(p.latencyMs) : null };
  const data = { game: String(game).slice(0, 60), why: a.verdict.filter((v) => v[0] !== "ok").map((v) => v[1]).slice(0, 5), fix: a.fixes.slice(0, 3).map((x) => `${x[1]}: ${x[2]}`), sum, pos: [Math.round(f.x ?? 0), Math.round(f.z ?? 0)], players: ctx.place?.playerCount ?? null, keys: causes(a), where: whereOf(I.scene), ai };
  ctx.session.lsBrief = { at: Date.now(), ai, text: briefText(ai), windowMs: I.windowMs, timed: !!I.sim, ents: I.ents };
  if (since || lv === "manual") { W.scanAt = now; W.fc.length = 0; W.fg.length = 0; } // the next scan's window opens here
  try { return await insert(ctx, { auto: lv !== "manual", uid: p.userId || p.id, name: p.displayName || "player", lv, trigger, score: a.score, place: ctx.place?.id || "", room: String(ctx.world?.mode || ""), sig: sig ?? causes(a).join("|"), data, text }); }
  catch (e) { ctx.log("lagscope report not saved", { e: String(e?.message || e).slice(0, 120) }); return null; }
}

// the names behind the numbers, so Savi opens the right file: which kinds have no draw distance, emit the particles, ...
function whereOf(sc) {
  if (!sc) return null; const j = (a) => (a || []).map(([k, n]) => `${k}×${n}`).join(", ");
  const m = (sc.models || []).slice().sort((x, y) => y[1] * y[2] - x[1] * x[2]).slice(0, 3).map((r) => `${r[5] || String(r[0]).split("/").pop().slice(6, 18)}×${r[1]} (${r[2]} tris)`).join(", ");
  return Object.fromEntries(Object.entries({ models: m, noRange: j(sc.noRangeTop), scripted: j(sc.scriptedTop), particles: j(sc.particlesTop), dynamic: j(sc.dynamicTop), skinned: j(sc.skinnedTop), loops: j(sc.loopsTop), broken: j(sc.brokenTop) }).filter(([, v]) => v));
}
export function onSpawn(ctx) { if (ctx.self?.isLocal) startProbe(addStall); if (ctx.self?.isLocal && ctx.self.isEditor) publishCfg(ctx).catch(() => null); }

export function update(ctx) {
  const p = ctx.self; if (!p?.isLocal) return;
  const now = clock();
  if (W.callAt) { const g = now - W.callAt; if (g > W.gap && g < 5000) W.gap = g; } /* past 5 s: a hidden tab or the boot, not the game */ W.callAt = now; W.calls++;
  if (W.pending) { try { sceneStep(ctx, 120); } catch {} }
  startProbe(addStall);
  if (ctx.session.lsOpen) { const row = sample(ctx); if (row) { row.thread = threadSnap(15000); row.ents = entTrend(ctx); row.entN = W.ents.at(-1)?.[1] ?? null; ctx.session.lsRow = row; } }
  if (now - W.entAt > 2000) { W.entAt = now; let n = 0; try { for (const _ in ctx.place.objects || {}) n++; } catch {}
    if (W.ents.length && W.ents[W.ents.length - 1][2] !== ctx.place?.id) { W.ents = []; W.tagBase = null; } // a new place starts a new count
    W.ents.push([now, n, ctx.place?.id]); if (W.ents.length > 90) W.ents.shift(); noteStalls(W.ents);
    const sc = sceneSnap(); if (sc && !W.tagBase && W.ents.length > 3) W.tagBase = Object.fromEntries(sc.tags || []); }
  if (p.isEditor) { drain(ctx).catch(() => null); clean(ctx).catch(() => null); }
  if (W.bot == null) W.bot = typeof navigator !== "undefined" && !!navigator.webdriver;
  if (typeof document !== "undefined" && document.hidden && !W.pending) { W.start = 0; return; }
  if (!W.start) { W.start = now; W.rows = []; cfg(ctx).catch(() => null); }
  if (now - W.at < 500) return; const hz = W.at ? (W.calls * 1000) / (now - W.at) : NaN, gap = W.gap; W.calls = 0; W.gap = 0; W.at = now;
  try { for (const fr of v0(ctx).frames || []) { if (fr.cpuMs >= 0) W.fc.push(fr.cpuMs); if (fr.gpuMs >= 0) W.fg.push(fr.gpuMs); } if (W.fc.length > 600) W.fc.splice(0, W.fc.length - 600); if (W.fg.length > 600) W.fg.splice(0, W.fg.length - 600); } catch {}
  const v = ctx.view || {};
  if (v.fps > 0 && v.fps < 40 && v.gpuMs > 0 && v.gpuMs < 0.5) W.soft = (W.soft || 0) + 1; else if (v.gpuMs >= 0.5) W.soft = 0;
  if (W.pending) { try { sceneStep(ctx, 40); } catch {} }
  if (W.pending && (sceneSnap() || now - W.pending.at > 6000)) { const q = W.pending; W.pending = null; report(ctx, q.lv, q.trigger, q.sig, q.since).then((id) => { if (q.lv === "manual") ctx.log("lagscope scan saved", { id, brief: ctx.session.lsBrief?.ai?.headline }); }); return; } // a scan asked for is answered on any renderer, a software one too (2.0)
  if (W.soft > 20) return; // software renderer: its numbers say nothing about the game
  W.rows.push({ t: now, ping: Number.isFinite(p.latencyMs) ? p.latencyMs : NaN, fps: v.fps, cpu: v.cpuMs, gpu: v.gpuMs, draw: v.drawCalls, tri: v.triangles, gmem: v.gpuMemoryMB, rs: v.renderScale, net: v.netInBytes, nout: v.netOutBytes, nmsg: v.netInMessages, hz, gap }); if (W.rows.length > 130) W.rows.shift();
  dips(now);
  const h = heapNow(); if (Number.isFinite(h)) { W.heap.push([now, h]); if (W.heap.length > 400) W.heap.shift(); }
  if (W.pending || W.streak.bad || W.streak.warn) { try { sceneStep(ctx, 40); } catch {} }
  if (W.bot) return; // test browsers are not players: they never report on their own, only when a scan asks (2.0)
  if (now - W.start < 30000 || now - W.judged < 3000) return; // arrival and streaming spikes are not lag
  W.judged = now;
  const c = cfgNow(); if (!c.auto) return;
  const a = judge(input(ctx, now));
  ctx.session.lsWatch = { at: Date.now(), score: a.score, level: a.level };
  W.streak.bad = a.level === "bad" ? W.streak.bad + 1 : 0;
  W.streak.warn = a.level === "warn" ? W.streak.warn + 1 : 0;
  W.streak.calm = a.level !== "bad" ? W.streak.calm + 1 : 0;
  let rough = 0, big = 0; for (const q of stalls()) { if (now - q.t > 10000) break; rough++; if (q.ms >= 250) big = 1; }
  rough = rough >= 3 || !!big;
  const sig = causes(a).join("|");
  if (a.level === "bad" && sig !== W.sentSig && (W.streak.bad >= 2 || rough) && now - W.sentAt > (W.sentSig ? 90000 : 0)) {
    W.sentSig = sig; W.sentAt = now; W.streak.calm = 0; W.pending = { lv: "bad", at: now, sig, trigger: rough ? "auto · not smooth" : "auto" }; return;
  }
  if (c.yellow && a.level === "warn" && W.streak.warn >= 10 && !W.sentSig && now - W.sentAt > 600000) { W.sentAt = now; W.pending = { lv: "warn", at: now, sig, trigger: "auto · yellow 30 s" }; return; }
  if (W.sentSig && a.level !== "bad" && W.streak.calm >= 4) { W.sentSig = null; W.pending = { lv: "ok", at: now, sig: "recovered", trigger: "auto · smooth again" }; }
}

const v0 = (ctx) => ctx.view || {};
// 2.0: a reading on demand. ctx.emit("lagscope:scan", { why }) from run_script (or any script) makes every machine in the
// room take a fresh scene pass and save one report (lv 'manual') with its AI brief: the before/after of a fix, no panel needed.
export function scan(ctx, p) {
  if (!ctx.self?.isLocal) return;
  sceneFresh(); if (!W.start) W.start = clock();
  // measured ms per script, when the engine hands its timers to a behavior: asked now, read by report() if it has landed
  try { if (typeof ctx.getPerformanceSnapshot === "function") Promise.resolve(ctx.getPerformanceSnapshot()).then((ps) => { const sr = (ps?.server?.top || []).filter((r) => r.kind === "script" && Number.isFinite(r.p50Ms)); if (sr.length) { W.simScripts = sr.map((r) => ({ path: r.name, ms: r.p50Ms, p95: r.p95Ms, max: r.maxMs })); W.simAt = clock(); } const ph = (ps?.server?.top || []).find((r) => r.name === "physics/step" && Number.isFinite(r.p95Ms)); if (ph) { W.phys = { p50: +ph.p50Ms.toFixed(2), p95: +ph.p95Ms.toFixed(2), max: +(ph.maxMs ?? ph.p95Ms).toFixed(1) }; W.physAt = clock(); } }).catch(() => null); } catch {}
  W.pending = { lv: "manual", at: clock(), sig: undefined, since: W.scanAt || 0, trigger: "scan" + (p?.why ? ": " + String(p.why).slice(0, 40) : "") };
}
// the panel's buttons (overlay mode: the game's ui.js draws the panel, presses arrive here as lagscope:act)
export function onInput(ctx, input) {
  const p = ctx.self; if (!p?.isLocal) return;
  if (input.pressed?.panel && (ctx.session.lsOpen || !(ctx.world?.files || []).includes("scripts/ui/perf.js"))) { ctx.session.lsOpen = !ctx.session.lsOpen; /* a host with its own F3 inspector (Corrode) keeps F3 */ if (ctx.session.lsOpen && p.isEditor) publishCfg(ctx, true).catch(() => null); }
  const a = input.actionData?.act ?? input.actionData?.["lagscope:act"];
  if (input.pressed?.act || a) act(ctx, a);
}
export function act(ctx, a) {
  if (!a || typeof a !== "object") return;
  if (a.op === "open") { ctx.session.lsOpen = a.on ?? !ctx.session.lsOpen; return; }
  if (a.op === "fixall") { fixAll(ctx); return; }
  if (a.op === "report") { report(ctx, "manual", "sent from the panel").then((id) => { ctx.session.lsMsg = { msg: id ? `report #${id} saved ✓` : "couldn't save the report", at: Date.now() }; }); return; }
  return handle(ctx, a);
}

// SEND TO SAVI TO FIX ALL LAG (1.6): one press takes a fresh reading of this machine right now, saves it, then hands Savi
// every report not sent yet with the instruction to fix all of it. Works with zero reports saved before: the press makes one.
async function fixAll(ctx) {
  ctx.session.lsMsg = { msg: "reading this machine now…", at: Date.now() };
  try { for (let k = 0; k < 8 && !sceneSnap(); k++) sceneStep(ctx, 400); } catch {}
  const id = await report(ctx, "manual", "send to savi: fix all lag");
  if (!id) ctx.log("lagscope fix-all: the fresh reading did not save; sending what is saved");
  return handle(ctx, { op: "savi", all: true });
}
