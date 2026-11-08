// LAGSCOPE core: one judge for the panel, the auto reports, Discord and send-to-Savi, so every place says the same words
// about the same numbers. Pure: no DOM, no ctx. Made by yui. Ported from Corrode's perf core (2026-10-13).
// Pure: no DOM, no ctx. analyze(input) -> { score, level, verdict, fixes, stats }; reportText(input, a, meta) -> the pasteable text.
//
// input (every field optional; a missing one is left out of the judgement, never guessed):
//   fps[]          engine fps samples (ctx.view.fps)              ft[]     frame ms, one per real frame when rAF ran, else 1000/fps
//   worst[]        worst frame gap per sample (ms)                cpu[] gpu[] draw[] tri[]   engine view counters
//   heap[]         [tMs, MB] of the game page's JS heap           stalls[] { t, ms, cause, kind } newest first
//   minutes        how long this window covers                    longN, longMs   long tasks (>50 ms) in the window
//   js             game scripts ms/frame   top { name, perFrame, max }   ui  HUD ms/frame
//   sim            { tickMs, lanes:[[name, avg, worst]], players }   scene  lib/scene.js sceneStep row   ping  ms
//   pixel quality device  (for the report's header)
const fin = Number.isFinite;
const mean = (a) => { let s = 0, n = 0; for (const v of a || []) if (fin(v)) { s += v; n++; } return n ? s / n : NaN; };
const lastOf = (a) => { for (let i = (a || []).length - 1; i >= 0; i--) if (fin(a[i])) return a[i]; return NaN; };
const f = (v, d = 1) => (fin(v) ? v.toFixed(d) : "n/a");
export const BUDGET = { frame: 16.7, draw: 800, drawBad: 1500, tri: 1.2e6, triBad: 3e6, smallShadows: 40, noRange: 60, shLights: 4, fx: 30, leak: 6, churn: 90, particles: 4000, dynamic: 150, chars: 90, skinned: 70, loops: 24, entGrow: 40 };

// frame pacing from real frames: 1% low, 0.1% low, p99 frame, hitches (>50 ms) a minute, jitter
export function pacing(ft, minutes) {
  const fr = (ft || []).filter((v) => fin(v) && v > 0 && v < 1000).sort((a, b) => a - b), n = fr.length;
  if (!n) return { low1: NaN, low01: NaN, p99: NaN, p50: NaN, hitchPerMin: NaN, jitter: NaN, n: 0 };
  const at = (q) => fr[Math.min(n - 1, Math.floor(n * q))], m = fr.reduce((a, b) => a + b, 0) / n;
  // 1% low = the average fps of the slowest 1% of frames (the way benchmark tools read it), not one percentile frame
  const tail = (q) => { const k = Math.max(1, Math.floor(n * q)), s = fr.slice(n - k); return 1000 / (s.reduce((a, b) => a + b, 0) / k); };
  const hitches = fr.filter((v) => v > 50).length;
  return { low1: tail(0.01), low01: tail(0.001), p99: at(0.99), p50: at(0.5), hitchPerMin: minutes > 0 ? hitches / minutes : NaN, hitches, jitter: Math.sqrt(fr.reduce((a, b) => a + (b - m) ** 2, 0) / n), n };
}

// memory: a JS heap is a sawtooth (allocate, collect). Its slope alone reads every sawtooth as a leak. What is kept is the
// floor after each collection: the minimum of each 20 s bucket. Churn is how fast it allocates; a sweep is a drop of 4 MB+.
export function memory(heap) {
  const p = (heap || []).filter((q) => q && fin(q[0]) && fin(q[1]));
  if (p.length < 4) return { now: p.length ? p[p.length - 1][1] : NaN, floorPerMin: NaN, churnPerMin: NaN, sweeps: 0, sweepEvery: NaN, minutes: 0 };
  const t0 = p[0][0], t1 = p[p.length - 1][0], mins = Math.max(1 / 60, (t1 - t0) / 60000);
  let up = 0, sweeps = 0; for (let i = 1; i < p.length; i++) { const d = p[i][1] - p[i - 1][1]; if (d > 0) up += d; else if (d < -4) sweeps++; }
  const B = new Map(); for (const [t, h] of p) { const k = Math.floor((t - t0) / 20000); const b = B.get(k); if (!b || h < b[1]) B.set(k, [t, h]); }
  const fl = [...B.values()]; let floorPerMin = NaN;
  if (fl.length >= 4) { const n = fl.length, mx = fl.reduce((a, q) => a + q[0], 0) / n, my = fl.reduce((a, q) => a + q[1], 0) / n; let nu = 0, de = 0; for (const [t, h] of fl) { nu += (t - mx) * (h - my); de += (t - mx) ** 2; } floorPerMin = de ? (nu / de) * 60000 : 0; }
  return { now: p[p.length - 1][1], floor: Math.min(...fl.map((q) => q[1])), floorPerMin, churnPerMin: up / mins, sweeps, sweepEvery: sweeps ? (mins * 60) / sweeps : NaN, minutes: mins };
}

// a stall's likely cause from what was seen beside it. kind: script | gc | hud | render | engine
export function stallCause(st) {
  if (st.cause) return st.cause;
  return "engine / browser (no game script over 8 ms)";
}

export function analyze(I) {
  const fps = mean(I.fps), fpsNow = lastOf(I.fps), cpu = mean(I.cpu), gpu = mean(I.gpu), draw = lastOf(I.draw), tri = lastOf(I.tri);
  const P = pacing(I.ft && I.ft.length ? I.ft : (I.fps || []).map((v) => (v > 0 ? 1000 / v : NaN)), I.minutes || 0);
  const W = (I.worst || []).filter(fin).sort((a, b) => a - b), worst99 = W.length ? W[Math.floor(W.length * 0.99)] : NaN;
  const M = memory(I.heap), sc = I.scene || null, sim = I.sim || null, js = fin(I.js) ? I.js : 0, ui = fin(I.ui) ? I.ui : 0;
  const stalls = I.stalls || [], kinds = {}; for (const s of stalls) kinds[s.kind || "engine"] = (kinds[s.kind || "engine"] || 0) + 1;
  const stallPerMin = I.minutes > 0 ? stalls.length / I.minutes : NaN;
  if (!fin(fps)) return { score: null, level: "ok", verdict: [["ok", "measuring…"]], fixes: [], stats: { P, M } };

  let s = 100;
  s -= Math.max(0, 60 - fps) * 1.4;
  if (fin(P.low1)) s -= Math.max(0, 45 - P.low1) * 0.6;
  const hitch = fin(worst99) ? worst99 : P.p99;
  if (fin(hitch)) s -= Math.min(15, Math.max(0, hitch - 34) / 8);
  if (fin(draw)) s -= Math.min(12, Math.max(0, draw - 600) / 80);
  if (fin(tri)) s -= Math.min(10, Math.max(0, tri - 1e6) / 2e5);
  s -= Math.min(12, Math.max(0, js - 2) * 2);
  if (sim && fin(sim.tickMs)) s -= Math.min(10, Math.max(0, sim.tickMs - 5));
  if (fin(stallPerMin)) s -= Math.min(12, Math.max(0, stallPerMin - 2) * 0.8);
  if (M.floorPerMin > BUDGET.leak) s -= 8;
  const score = Math.max(0, Math.min(100, Math.round(s)));

  // a verdict row: [tone, report words (Discord + KEYS read these), plain words for the F3 terminal, hint]. A hint names a flaw worth fixing
  // but does not by itself turn the watch yellow or red (yui 2026-10-13: "add more things to it to discover even more flaws").
  const V = [], X = [], trs = fin(tri) ? (tri / 1e6).toFixed(2) + "M" : "?";
  if (fin(gpu) && gpu > 12 && (!fin(cpu) || gpu > cpu)) V.push(["bad", `GPU bound: drawing takes ${gpu.toFixed(1)} ms a frame (${f(draw, 0)} draws, ${trs} tris)`, `the graphics card is the bottleneck: ${gpu.toFixed(1)} ms a frame drawing (aim < 12)`]);
  if (js > 4) V.push([js > 8 ? "bad" : "warn", `game scripts take ${js.toFixed(1)} ms a frame; heaviest ${I.top ? I.top.name + " " + I.top.perFrame.toFixed(2) + " ms" : "?"}`, `game scripts eat ${js.toFixed(1)} ms of every frame, most in ${I.top ? I.top.name : "?"}`]);
  if (fin(cpu) && cpu > 12 && js < cpu * 0.5 && sc) X.push(["warn", `engine CPU ${cpu.toFixed(1)} ms with ${sc.total} objects within 250 m`, "give props a visibleRange, merge or instance repeated rocks and nodes, and sleep idle behaviors"]);
  if (fin(cpu) && cpu > 12 && js < cpu * 0.5) V.push(["warn", `engine CPU ${cpu.toFixed(1)} ms with scripts only ${js.toFixed(1)}: physics, animation or object count (${sc ? sc.total : "?"} near)`, `the engine is busy ${cpu.toFixed(1)} ms a frame with ${sc ? sc.total : "?"} things near you`]);
  if (stalls.length) {
    const top = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0], label = { thread: "the game thread (scripts, physics)", dip: "the drawing side", gc: "garbage collection", script: "a game script", hud: "the HUD's layout", render: "rendering", engine: "the engine / browser" }[top[0]] || top[0];
    V.push([stallPerMin > 8 ? "bad" : stallPerMin > 2 ? "warn" : "ok", `${stalls.length} stall${stalls.length > 1 ? "s" : ""} over 50 ms (${f(stallPerMin, 1)}/min), mostly ${label}`, `${stalls.length} freeze${stalls.length > 1 ? "s" : ""} over 50 ms, mostly ${label}`]);
  }
  if (sim && sim.tickMs > 15) V.push(["bad", `server referee ${sim.tickMs.toFixed(1)} ms a tick; heaviest lane ${sim.lanes?.[0]?.[0] || "?"}`, `the server is slow: ${sim.tickMs.toFixed(1)} ms a tick, most in ${sim.lanes?.[0]?.[0] || "?"}`]);
  if (M.floorPerMin > BUDGET.leak) V.push(["warn", `memory kept after cleanup is rising ${M.floorPerMin.toFixed(1)} MB/min: something holds on (a leak)`, `memory keeps growing ${M.floorPerMin.toFixed(1)} MB/min after cleanups: a leak`]);
  else if (M.churnPerMin > BUDGET.churn) V.push([kinds.gc ? "warn" : "ok", `allocating ${M.churnPerMin.toFixed(0)} MB/min, swept every ${f(M.sweepEvery, 0)} s${kinds.gc ? "; sweeps line up with stalls" : "; the floor holds, no leak"}`, `the game makes ${M.churnPerMin.toFixed(0)} MB of garbage a minute${kinds.gc ? " and the cleanups freeze it" : ""}`]);
  if (fin(draw) && draw > BUDGET.draw) V.push([draw > BUDGET.drawBad ? "bad" : "warn", `${draw.toFixed(0)} draw calls: past ~800 the CPU spends the frame submitting them`, `too many things drawn near you: ${draw.toFixed(0)} draws (aim < 800)`]);
  if (fin(tri) && tri > BUDGET.tri) V.push([tri > BUDGET.triBad ? "bad" : "warn", `${trs} triangles in view`, `too many triangles on screen: ${trs} (aim < 1.2M)`]);
  // stutter is a level of its own (yuidev 2026-10-13: "it should send when it's not smooth"): the slowest 1% under 20 fps with 3+
  // hitches is red whatever the average says; under 40 is yellow
  if (fin(P.low1) && P.low1 < 40) V.push([P.low1 < 20 && (P.hitches ?? 0) >= 3 ? "bad" : "warn", fin(fps) && fps > 55 ? `smooth average (${fps.toFixed(0)} fps) but the slowest 1% of frames run at ${P.low1.toFixed(0)} fps: that's the stutter you feel` : `not smooth: the slowest 1% of frames run at ${P.low1.toFixed(0)} fps (${f(P.hitchPerMin, 0)} hitches over 50 ms a minute)`, `stutter: the slowest 1% of frames run at ${P.low1.toFixed(0)} fps${fin(fps) ? " (average " + fps.toFixed(0) + ")" : ""}`]);
  if (fin(fps) && fps >= 1 && fps < 50 && !V.some((o) => o[0] === "bad")) {
    const ft = 1000 / fps, known = (fin(cpu) ? cpu : 0) + (fin(gpu) ? gpu : 0);
    V.push(["bad", `below 60: ${ft.toFixed(1)} ms a frame; CPU ${f(cpu, 1)} + GPU ${f(gpu, 1)} + scripts ${js.toFixed(1)} ms${known + js < ft * 0.5 ? ". Most of it is outside those: browser, vsync, another tab, or a throttled GPU" : ""}`, `under 60 fps: ${ft.toFixed(1)} ms a frame (aim < 16.7)`]);
  }

  // ---- more flaw detectors (yui 2026-10-13), each a hint: named in the report and the signature, never a level on its own ----
  const mods = sc ? (sc.models || []).map((r) => (Array.isArray(r) ? { name: r[5] || String(r[0]).split("/").pop().slice(0, 14), n: r[1], tri: r[2], bytes: r[3], sh: r[6], nrN: r[7] || 0 } : r)) : [];
  const T = mods.map((r) => ({ ...r, tt: r.tri * r.n })).sort((a, b) => b.tt - a.tt), sumT = T.reduce((a, r) => a + r.tt, 0) || 1, share = T[0] ? T[0].tt / sumT : 0;
  // a share alone is no cost (twelve light idols in an empty field are 100% of almost nothing): the model must also weigh 250k+ triangles near you
  if (share > 0.2 && T[0].tt > 250000) V.push([share > 0.35 ? "bad" : "warn", `one model carries ${(share * 100).toFixed(0)}% of nearby triangles: ${T[0].name} ${T[0].n} copies × ${T[0].tri.toLocaleString()} tris`, `${T[0].name}: ${T[0].n} copies, ${(share * 100).toFixed(0)}% of all triangles near you`, true]);
  if (sc && sc.shadows > 2000) V.push(["warn", `${sc.shadows} shadow casters near you (aim < 2000)`, `${sc.shadows} things cast shadows near you (aim < 2000)`, true]);
  if (sc && fin(sc.lightsNR) && sc.lightsNR > 12) V.push(["warn", `${sc.lightsNR} lights near you never switch off by distance`, `${sc.lightsNR} lamps near you never switch off by distance (aim < 12)`, true]);
  let spike = null; for (const r of I.sys || []) if (r && fin(r.max) && r.max > 16 && (!spike || r.max > spike.max)) spike = r;
  if (spike) V.push(["warn", `${spike.name} spiked to ${spike.max.toFixed(1)} ms in one call`, `${spike.name} froze a frame: one call took ${spike.max.toFixed(1)} ms (aim < 16)`, true]);
  const swing = P.p50 > 0 && P.n >= 60 ? P.p99 / P.p50 : NaN;
  if (swing > 3) V.push(["warn", `frame time swings ${swing.toFixed(1)}x: p99 ${P.p99.toFixed(1)} ms vs median ${P.p50.toFixed(1)} ms`, `frames are uneven: the slow ones take ${swing.toFixed(1)}× the usual (${P.p99.toFixed(1)} vs ${P.p50.toFixed(1)} ms)`, true]);
  if (sc && sc.near50 > 800) V.push(["warn", `${sc.near50} objects within 50 m (dense base)`, `dense base: ${sc.near50} things within 50 m (aim < 800)`, true]);
  if (M.floorPerMin > 2 && M.floorPerMin <= BUDGET.leak) V.push(["warn", `heap floor creeping up ${M.floorPerMin.toFixed(1)} MB/min`, `memory creeping up ${M.floorPerMin.toFixed(1)} MB/min after cleanups: watch it`, true]);
  // every kind of game: what a fighter, shooter, moba, rhythm or 2d game feels before the fps counter does
  const lat = fin(P.p50) ? P.p50 * 2 + (fin(I.ping) ? I.ping / 2 : 0) : NaN; // press → picture: about two frames, plus half the trip to the server
  if (fin(lat) && lat > 120) V.push([lat > 180 ? "bad" : "warn", `input delay about ${lat.toFixed(0)} ms`, `a press takes about ${lat.toFixed(0)} ms to show: fighting, shooting and timing games feel mushy past 100`, lat <= 180]);
  if (fin(P.jitter) && P.jitter > 3 && fin(fps) && fps > 40) V.push(["warn", `uneven frames ±${P.jitter.toFixed(1)} ms at ${fps.toFixed(0)} fps`, `frames arrive unevenly (±${P.jitter.toFixed(1)} ms): aiming and combos feel off even at ${fps.toFixed(0)} fps`, true]);
  if (sc && sc.mode && sc.mode !== "3d" && fin(fps) && fps < 55) V.push(["warn", `a ${sc.mode} game under 60 fps (${fps.toFixed(0)})`, `a ${sc.mode} game should hold 60: ${fps.toFixed(0)} fps here`, fps >= 45]);
  if (sc && fin(sc.sprites) && sc.sprites > 1500) V.push(["warn", `${sc.sprites} sprites nearby`, `${sc.sprites} sprites near you: tiles and bullets drawn one by one`, true]);
  if (sc && fin(sc.scripted) && sc.scripted > 250) V.push(["warn", `${sc.scripted} scripted things nearby`, `${sc.scripted} things near you each run their own script` + (sc.scriptedTop?.length ? ` (most: ${sc.scriptedTop.map(([k, n]) => k + "×" + n).join(", ")})` : ""), true]);
  let plo = Infinity, phi = -Infinity, pn = 0; for (const v of I.pingSer || []) if (fin(v) && v > 0) { pn++; if (v < plo) plo = v; if (v > phi) phi = v; }
  if (pn >= 8 && phi - plo > 80) V.push(["warn", `ping jitter ${(phi - plo).toFixed(0)} ms (${plo.toFixed(0)}–${phi.toFixed(0)})`, `shaky connection: ping jumps between ${plo.toFixed(0)} and ${phi.toFixed(0)} ms`, true]);
  // ---- 1.5: the game thread, particles, physics, sound, broken scripts, objects piling up (yui 2026-10-14: "find everything") ----
  const th = I.thread || null, en = I.ents || null, tops = (a) => (a?.length ? " (most: " + a.map(([k, n]) => `${k}×${n}`).join(", ") + ")" : "");
  if (th && th.avg > 6) V.push([th.avg > 18 ? "bad" : "warn", `game thread runs ${th.avg.toFixed(1)} ms late a beat (${Math.round(th.busy * 100)}% busy): scripts and physics overloaded`, `the game's scripts + physics are overloaded: every beat lands ${th.avg.toFixed(1)} ms late`, th.avg <= 10]);
  if (th && th.freezes) V.push([th.freezes > 8 ? "bad" : "warn", `game thread froze ${th.freezes}× over 70 ms (worst ${th.max + 50} ms)`, `the game logic froze ${th.freezes} time${th.freezes > 1 ? "s" : ""} (worst ${th.max + 50} ms): a script, physics or a garbage sweep`, th.freezes <= 2]);
  if (kinds.dip && !(th && th.freezes)) V.push(["warn", `${kinds.dip} frame dip${kinds.dip > 1 ? "s" : ""} while the game thread stayed on time: drawing or the browser`, `the picture dipped ${kinds.dip}× while the game logic was fine: drawing, a shader compiling, or the browser`, kinds.dip <= 2]);
  if (sc && sc.particles > BUDGET.particles) V.push([sc.particles > BUDGET.particles * 3 ? "bad" : "warn", `${sc.particles} particles alive nearby${tops(sc.particlesTop)}`, `${sc.particles} particles near you${tops(sc.particlesTop)}`, sc.particles <= BUDGET.particles * 2]);
  if (sc && sc.dynamic > BUDGET.dynamic) V.push(["warn", `${sc.dynamic} dynamic physics bodies nearby${tops(sc.dynamicTop)}`, `${sc.dynamic} loose physics bodies near you${tops(sc.dynamicTop)}`, true]);
  if (sc && sc.chars > BUDGET.chars) V.push(["warn", `${sc.chars} character bodies walking nearby`, `${sc.chars} walking bodies near you each run a character controller`, true]);
  if (sc && sc.skinned > BUDGET.skinned) V.push(["warn", `${sc.skinned} animated (skinned) bodies nearby${tops(sc.skinnedTop)}`, `${sc.skinned} animated bodies near you${tops(sc.skinnedTop)}`, true]);
  if (sc && sc.loops > BUDGET.loops) V.push(["warn", `${sc.loops} looping sounds nearby${tops(sc.loopsTop)}`, `${sc.loops} looping sounds near you${tops(sc.loopsTop)}`, true]);
  if (sc && sc.broken) V.push(["warn", `${sc.broken} objects have scripts throwing errors${tops(sc.brokenTop)}`, `${sc.broken} things near you have a broken script${tops(sc.brokenTop)}: each throw costs time, every call`, sc.broken < 5]);
  if (en && en.perMin > BUDGET.entGrow && en.gain > 150) V.push([en.perMin > BUDGET.entGrow * 4 ? "bad" : "warn", `objects piling up: +${Math.round(en.perMin)}/min in ${en.place} (${en.n} now)${en.grower ? ", mostly " + en.grower : ""}`, `things keep spawning and never leave: +${Math.round(en.perMin)} a minute${en.grower ? ", mostly " + en.grower : ""}`]);
  // ---- 1.6 (yui 2026-11-01: the in-game half of the FPS-boost list): vegetation, LOD, GPU memory, render scale, network, whole-place sound, download weight ----
  const vw = I.view || {}, veg = sc ? (sc.vegBeds || []).filter((b) => b[1] > 20000 || b[2] > 150) : [];
  if (veg.length) V.push(["warn", `scatter bed ${veg[0][0]}: ${veg[0][1]} plants drawn out to ${veg[0][2] ?? "?"} m`, `a plant bed (${veg[0][0]}) draws ${veg[0][1]} plants out to ${veg[0][2] ?? "?"} m`, true]);
  const noLod = mods.filter((r) => r.tri > 50000 && r.nrN > 0).sort((a, b) => b.tri * b.nrN - a.tri * a.nrN)[0];
  if (noLod) V.push(["warn", `${noLod.name}: ${noLod.tri.toLocaleString("en-US")} tris each, ${noLod.nrN} copies with no far LOD`, `${noLod.name} draws all ${noLod.tri.toLocaleString("en-US")} triangles even far away (${noLod.nrN} copies)`, true]);
  if (fin(vw.gpuMemoryMB) && vw.gpuMemoryMB > 2048) V.push([vw.gpuMemoryMB > 3500 ? "bad" : "warn", `GPU memory ${Math.round(vw.gpuMemoryMB)} MB (textures and buffers)`, `the graphics card holds ${Math.round(vw.gpuMemoryMB)} MB: phones start dropping past 1.5 GB`, vw.gpuMemoryMB <= 3500]);
  if (fin(vw.renderScale) && vw.renderScale > 0 && vw.renderScale < 0.8) V.push(["warn", `the engine draws at ${Math.round(vw.renderScale * 100)}% resolution to keep up`, `the picture went soft: drawn at ${Math.round(vw.renderScale * 100)}% to hold the frame rate`, true]);
  if (fin(vw.netInBytes) && vw.netInBytes > 150000) V.push(["warn", `the room sends ${Math.round(vw.netInBytes / 1024)} KB/s to this machine`, `the game streams ${Math.round(vw.netInBytes / 1024)} KB every second to this player`, true]);
  if (sc && sc.loopsAll > 3) V.push(["warn", `${sc.loopsAll} looping sounds play to the whole place`, `${sc.loopsAll} sounds loop everywhere at once (spatial off)`, true]);
  if (sc && fin(sc.assetMB) && sc.assetMB > 80) V.push(["warn", `models nearby weigh ${Math.round(sc.assetMB)} MB to download`, `the models near you are ${Math.round(sc.assetMB)} MB: slow to arrive on a phone`, true]);
  const bursts = stalls.filter((q) => q.burst); if (bursts.length) V.push(["warn", `${bursts.length} freeze${bursts.length > 1 ? "s" : ""} came with a spawn burst (up to ${Math.max(...bursts.map((q) => q.burst))} objects at once)`, `the game froze while spawning ${Math.max(...bursts.map((q) => q.burst))} things at once`, true]);
  if (!V.some((v) => !v[3])) { const t = V.length ? `fps is fine (${fps.toFixed(0)}); the hints above can still be felt` : `healthy: ${fps.toFixed(0)} fps, nothing over budget`; V.push(["ok", t, t]); }

  // X declared above (before the verdicts that push fixes into it)
  if (sc) {
    if (share > 0.2) X.push([share > 0.35 ? "bad" : "warn", `${T[0].name} carries ${(share * 100).toFixed(0)}% of nearby model triangles`, `${T[0].n} copies × ${T[0].tri.toLocaleString()} tris. A lighter mesh or a far LOD cuts the biggest slice.`]);
    if (sc.smallShadows > BUDGET.smallShadows) X.push(["warn", `${sc.smallShadows} small props cast shadows`, "every side under 1.2 m. Each caster draws again per shadow cascade; castShadow: false on clutter is nearly invisible."]);
    if (sc.noRange > BUDGET.noRange) X.push(["warn", `${sc.noRange} objects have no draw distance`, "visibleRange { max } lets the engine skip them far away" + (sc.noRangeTop?.length ? "; most: " + sc.noRangeTop.map(([k, n]) => `${k}×${n}`).join(", ") : "")]);
    if (sc.shLights > BUDGET.shLights) X.push([sc.shLights > 10 ? "bad" : "warn", `${sc.shLights} lights cast shadows nearby`, "each renders the scene again. Keep shadows on the few that matter."]);
    if (sc.fx > BUDGET.fx) X.push(["warn", `${sc.fx} effects running nearby`, "particles cost fill rate; check for leftover or stacked emitters."]);
    const fat = mods.filter((r) => r.bytes > 4 * 1048576).sort((a, b) => b.bytes - a.bytes)[0];
    if (fat) X.push(["warn", `${fat.name} is a ${(fat.bytes / 1048576).toFixed(1)} MB file`, "slow to stream on phones; smaller textures shrink the download most."]);
  }
  if (th && (th.avg > 6 || th.freezes > 2)) X.push([th.avg > 18 || th.freezes > 8 ? "bad" : "warn", `game thread ${th.avg.toFixed(1)} ms late a beat, ${th.freezes} freezes`, "find the heaviest update() and sim tick: ctx.sleep when idle, look (query, raycast, findPath) a few times a second instead of every tick, spread big loops over ticks."]);
  if (sc && sc.particles > BUDGET.particles) X.push(["warn", `${sc.particles} particles alive nearby`, "lower rate/n on the emitters named, add ?mobile: branches, give emitters a visibleRange, end one-off effects with a lifetime" + tops(sc.particlesTop)]);
  if (sc && sc.dynamic > BUDGET.dynamic) X.push(["warn", `${sc.dynamic} dynamic bodies`, "settled debris goes static or is destroyed; scripted movers are kinematic" + tops(sc.dynamicTop)]);
  if (sc && sc.skinned > BUDGET.skinned) X.push(["warn", `${sc.skinned} skinned bodies animate`, "give mobs and NPCs a visibleRange so far ones stop drawing and animating" + tops(sc.skinnedTop)]);
  if (sc && sc.loops > BUDGET.loops) X.push(["warn", `${sc.loops} looping sounds`, "one ambience bed per zone, not one per prop; maxDistance 30–60 on the rest" + tops(sc.loopsTop)]);
  if (sc && sc.broken) X.push(["warn", `${sc.broken} broken scripts nearby`, "read getLogs({ level: 'error' }) and fix the line each names" + tops(sc.brokenTop)]);
  if (en && en.perMin > BUDGET.entGrow && en.gain > 150) X.push(["bad", `objects piling up +${Math.round(en.perMin)}/min`, `something spawns without a lifetime or destroy${en.grower ? ": find the ctx.spawn that makes '" + en.grower + "'" : ""}`]);
  if (veg.length) X.push(["warn", `scatter bed ${veg[0][0]} draws ${veg[0][1]} plants to ${veg[0][2] ?? "?"} m`, "give the bed a maxDistance of 60–100 m and a lower count (a bed reads full at 6–8k); plants past that cost the GPU and add nothing"]);
  if (noLod) X.push(["warn", `${noLod.name}: ${noLod.tri.toLocaleString("en-US")} tris each, no far LOD`, "swap a lighter twin (2–5k tris) in past ~30 m, or give the full one a visibleRange { max }: nobody sees chisel marks at 80 m"]);
  if (fin(vw.gpuMemoryMB) && vw.gpuMemoryMB > 2048) X.push(["warn", `GPU memory ${Math.round(vw.gpuMemoryMB)} MB`, "fewer, smaller textures: 1k for props, 2k for heroes, one material reused across kinds; uploaded models often carry 4k maps"]);
  if (fin(vw.renderScale) && vw.renderScale > 0 && vw.renderScale < 0.8) X.push(["warn", `the engine draws at ${Math.round(vw.renderScale * 100)}% resolution`, "the GPU is over budget, so the picture went soft: cut what the GPU lines name (shadows, particles, triangles) and it sharpens on its own"]);
  if (fin(vw.netInBytes) && vw.netInBytes > 150000) X.push(["warn", `the room sends ${Math.round(vw.netInBytes / 1024)} KB/s`, "a value written to state every tick rides the wire to every player: keep per-frame values in ctx.session or variables and write state when it changes"]);
  if (sc && sc.loopsAll > 3) X.push(["warn", `${sc.loopsAll} looping sounds play to the whole place`, "spatial: false is for one bed; give the rest spatial: true and a maxDistance of 30–60 m"]);
  if (sc && fin(sc.assetMB) && sc.assetMB > 80) X.push(["warn", `models nearby weigh ${Math.round(sc.assetMB)} MB to download`, "compress their textures (1k–2k) and decimate hero meshes; phones stream all of it on arrival"]);
  if (bursts.length) X.push(["warn", "spawn bursts freeze the game", "spawn big groups across ticks (20 a tick) instead of all in one call"]);
  if (fin(draw) && draw > BUDGET.draw) X.push([draw > BUDGET.drawBad ? "bad" : "warn", `${draw.toFixed(0)} draw calls`, "many copies of one model batch; many distinct models and materials do not."]);
  if (kinds.gc) X.push(["warn", `${kinds.gc} stall${kinds.gc > 1 ? "s" : ""} at a garbage sweep`, `the game allocates ${f(M.churnPerMin, 0)} MB/min; reuse arrays and objects in per-frame code instead of making new ones.`]);
  if (kinds.script) { const sx = stalls.find((q) => q.kind === "script"); X.push(["warn", `a script froze the page ${sx ? sx.ms.toFixed(0) + " ms" : ""}`, sx ? sx.cause : "see the stall log"]); }
  if (kinds.hud) X.push(["warn", `${kinds.hud} stall${kinds.hud > 1 ? "s" : ""} in HUD layout`, "the HUD rebuilt a lot of HTML at once; cache unchanged panels."]);
  if (I.top && I.top.perFrame > 0.8) X.push([I.top.perFrame > 2 ? "bad" : "warn", `${I.top.name} costs ${I.top.perFrame.toFixed(2)} ms a frame`, "the heaviest game script here. ctx.sleep when idle, or spread work across ticks."]);
  if (ui > 1.5) X.push(["warn", `HUD render ${ui.toFixed(2)} ms a frame`, "the HUD rebuilds a lot of HTML; cache unchanged parts."]);
  if (sim?.lanes?.[0] && sim.lanes[0][1] > 2) X.push([sim.lanes[0][1] > 5 ? "bad" : "warn", `server lane ${sim.lanes[0][0]} ${sim.lanes[0][1].toFixed(2)} ms a tick`, `the referee's heaviest lane with ${sim.players} here.`]);
  if (M.floorPerMin > BUDGET.leak) X.push(["warn", `heap floor rising ${M.floorPerMin.toFixed(1)} MB/min`, "memory kept after each sweep grows: something keeps references (a list that only grows, listeners never removed)."]);
  if (sc && sc.shadows > 2000) X.push(["warn", `${sc.shadows} shadow casters near you`, "every caster draws again per shadow cascade: walls deep inside a base and far pieces can skip castShadow."]);
  if (sc && fin(sc.lightsNR) && sc.lightsNR > 12) X.push(["warn", `${sc.lightsNR} lights near you never switch off by distance`, "give each lamp a visibleRange { max: 60 } so far ones stop lighting the frame."]);
  if (spike) X.push(["warn", `${spike.name} spiked to ${spike.max.toFixed(1)} ms in one call`, "one call ran past a whole frame: spread its work over several ticks or cache what it recomputes."]);
  if (swing > 3) X.push(["warn", `frame time swings ${swing.toFixed(1)}x`, "uneven frames feel like stutter even at high fps: cap fps to the screen's refresh (vsync) and look for freezes in details > frame."]);
  if (sc && sc.near50 > 800) X.push(["warn", `${sc.near50} objects within 50 m (dense base)`, "each piece is its own object: bigger pieces, fewer deployables, or far-only detail cut the count."]);
  if (fin(lat) && lat > 120) X.push([lat > 180 ? "bad" : "warn", `input delay about ${lat.toFixed(0)} ms`, fin(I.ping) && I.ping > 120 ? "most of it is the connection: predict the player's own moves locally, judge hits on the striker's machine." : "most of it is frame time: raise fps first (see above); a busy main thread delays every press."]);
  if (fin(P.jitter) && P.jitter > 3 && fin(fps) && fps > 40) X.push(["warn", "uneven frame delivery", "something lands on some frames and not others: spread per-tick work across ticks, avoid allocating every frame, keep GC quiet."]);
  if (sc && fin(sc.sprites) && sc.sprites > 1500) X.push(["warn", `${sc.sprites} sprites nearby`, "draw tile maps as tiles (ctx.place.tiles) or one sheet, pool bullets, give far sprites a visibleRange."]);
  if (sc && fin(sc.scripted) && sc.scripted > 250) X.push(["warn", `${sc.scripted} scripted things nearby`, "minions, bullets and units run best as rows one manager script steps, not one script each; idle ones call ctx.sleep()."]);
  if (pn >= 8 && phi - plo > 80) X.push(["warn", `ping jitter ${(phi - plo).toFixed(0)} ms`, "shows as rubber-banding, not low fps: wired over wi-fi, close downloads, pick a nearer server."]);
  const order = { bad: 0, warn: 1, ok: 2 }; X.sort((a, b) => order[a[0]] - order[b[0]]);

  const level = score < 55 || (fin(fps) && fps < 30) || V.some((v) => v[0] === "bad" && !v[3]) ? "bad" : score < 80 || V.some((v) => v[0] === "warn" && !v[3]) ? "warn" : "ok";
  return { score, level, verdict: V, fixes: X, stats: { fps, fpsNow, cpu, gpu, draw, tri, js, ui, worst99, P, M, stallPerMin, kinds, share, spike, swing, thread: th, ents: en } };
}

const strip = (t) => String(t).replace(/<[^>]+>/g, "");
// a report's causes as short stable keys (no numbers), the Discord watch's "is this a new problem" signature. Location-bound
// lines (which model is heaviest, which file is big) are left out: walking past a rock is not a new bug.
const KEYS = [[/^one model carries/, "heavy-model"], [/shadow casters near/, "shadow-casters"], [/lights near you never switch off/, "lights-no-range"], [/^(\S+) spiked to [\d.]+ ms/, (m) => "spike:" + m[1]],
  [/^frame time swings/, "frame-swing"], [/objects within 50 m/, "dense"], [/^ping jitter/, "ping-jitter"], [/^input delay/, "input-delay"], [/^uneven frame/, "uneven"], [/sprites nearby/, "sprites"], [/scripted things/, "scripted"], [/game under 60/, "2d-fps"], [/^gpu bound/, "gpu-bound"], [/^game scripts take/, "scripts"], [/engine cpu/, "engine-cpu"], [/stalls? over 50 ms/, "freezes"],
  [/server referee/, "server-tick"], [/memory kept|heap floor/, "leak"], [/^allocating/, "churn"], [/draw calls/, "draws"], [/triangles in view/, "tris"],
  [/slowest 1%|not smooth/, "stutter"], [/^below 60/, "low-fps"], [/ carries .*nearby model/, null], [/ is a [\d.]+ mb file/, null], [/small props cast shadows/, "small-shadows"],
  [/no draw distance/, "no-draw-distance"], [/lights cast shadows/, "shadow-lights"], [/effects running/, "fx"], [/garbage sweep/, "gc-freezes"], [/a script froze/, "script-freeze"],
  [/hud layout|hud render/, "hud"], [/^(\S+) costs [\d.]+ ms a frame/, (m) => "script:" + m[1]], [/^server lane (\S+)/, (m) => "lane:" + m[1]],
  [/^game thread (runs|froze|[\d.]+ ms late)/, "game-thread"], [/frame dips? while/, "frame-dips"], [/particles alive/, "particles"], [/dynamic (physics )?bodies/, "dynamic"], [/character bodies/, "characters"],
  [/skinned (bodies|\))/, "skinned"], [/looping sounds/, "audio-loops"], [/scripts throwing|broken scripts/, "broken-scripts"], [/objects piling up/, "entity-leak"], [/spawn burst/, "spawn-burst"],
  [/^scatter bed/, "vegetation"], [/tris each.*no far lod/, "no-lod"], [/^gpu memory/, "vram"], [/draws at \d+% resolution/, "render-scale"], [/^the room sends/, "net-heavy"], [/play to the whole place/, "audio-global"], [/weigh \d+ mb to download/, "streaming"]];
export function causes(a) {
  const out = new Set();
  const add = (t) => { t = strip(t).toLowerCase(); for (const [re, k] of KEYS) { const m = t.match(re); if (m) { if (k) out.add(typeof k === "function" ? k(m) : k); return; } }
    out.add(t.replace(/\([^)]*\)/g, "").replace(/[\d][\d.,]*/g, "#").replace(/\s+/g, " ").trim().slice(0, 40)); };
  for (const v of a?.verdict || []) if (v[0] !== "ok") add(v[1]);
  for (const x of a?.fixes || []) if (x[0] !== "ok") add(x[1]);
  return [...out].sort();
}
// The one text: Copy report in F3, the Discord post's body, and what the creator pastes back to Savi.
export function reportText(I, a, meta = {}) {
  const st = a.stats || {}, P = st.P || {}, M = st.M || {}, sc = I.scene, L = [];
  L.push(`LAGSCOPE · ${meta.game ? meta.game + " · " : ""}${meta.when || new Date().toISOString()} · ${meta.place ?? "?"} · ${meta.server ?? ""} · health ${a.score ?? "?"} (${a.level})${meta.who ? " · " + meta.who : ""}${meta.trigger ? " · " + meta.trigger : ""}`);
  L.push(`FPS ${f(st.fps, 0)} (now ${f(st.fpsNow, 0)}) | median frame ${f(P.p50, 2)} ms | CPU ${f(st.cpu, 2)} | GPU ${f(st.gpu, 2)} | Scripts ${f(st.js, 2)} | HUD ${st.ui > 0 ? f(st.ui, 2) : "n/a"} | Draws ${f(st.draw, 0)} | Tris ${fin(st.tri) ? (st.tri / 1e6).toFixed(2) + "M" : "n/a"} | Heap ${fin(M.now) ? M.now.toFixed(0) + " MB" : "n/a (browser hides it)"} | Server ${I.sim ? f(I.sim.tickMs, 2) : "server line at the end"} | Ping ${f(I.ping, 0)}`);
  L.push(`pacing: 1% low ${f(P.low1, 0)} fps · 0.1% low ${f(P.low01, 0)} fps · p99 frame ${f(P.p99, 1)} ms · hitches >50 ms ${f(P.hitchPerMin, 1)}/min · jitter ±${f(P.jitter, 2)} ms · ${P.n || 0} frames over ${f(I.minutes, 1)} min${I.ftReal ? "" : " (from fps samples, no per-frame clock)"}`);
  if (fin(M.now)) L.push(`memory: heap ${f(M.now, 0)} MB · floor ${f(M.floor, 0)} MB, ${fin(M.floorPerMin) ? (M.floorPerMin >= 0 ? "+" : "") + M.floorPerMin.toFixed(1) + " MB/min kept" : "trend n/a"} · allocating ${f(M.churnPerMin, 0)} MB/min · ${M.sweeps || 0} sweeps${fin(M.sweepEvery) ? " (every " + M.sweepEvery.toFixed(0) + " s)" : ""}`);
  L.push("verdict: " + a.verdict.map((v) => `[${v[0]}] ${strip(v[1])}`).join(" | "));
  L.push("fix next: " + (a.fixes.length ? a.fixes.map((x, i) => `${i + 1}. ${strip(x[1])}: ${strip(x[2] || "")}`).join("; ") : "nothing"));
  if (I.sys?.length) L.push("client systems (ms/frame): " + I.sys.slice(0, 10).map((r) => `${r.name} ${r.perFrame.toFixed(3)}${r.max > 8 ? " (worst " + r.max.toFixed(1) + ")" : ""}`).join(", "));
  if (I.sim?.lanes?.length) L.push(`server lanes (ms/tick, ${I.sim.players ?? "?"} players): ` + I.sim.lanes.slice(0, 10).map(([n, x, w]) => `${n} ${x}${w > 10 ? " (worst " + w + ")" : ""}`).join(", "));
  if (sc) {
    const mods = (sc.models || []).map((r) => (Array.isArray(r) ? { name: r[5] || String(r[0]).split("/").pop().slice(0, 14), n: r[1], tri: r[2], bytes: r[3] } : r));
    L.push(`near: ${sc.total} objects (${sc.near50 ?? "?"} within 50 m), ${sc.shadows} shadow casters (${sc.smallShadows} small), ${sc.lights} lights (${sc.shLights} shadowed), ${sc.fx} fx, ${sc.noRange} no draw distance, ${sc.sprites ?? 0} sprites, ${sc.scripted ?? 0} scripted (${sc.mode || "3d"})`);
    L.push("top models: " + mods.sort((x, y) => y.tri * y.n - x.tri * x.n).slice(0, 8).map((r) => `${r.name}×${r.n} (${r.tri} tris, ${r.bytes ? (r.bytes / 1048576).toFixed(2) : "?"} MB)`).join(", "));
  }
  const th = I.thread; if (th) L.push(`game thread: ${th.avg} ms late a beat avg, p99 ${th.p99} ms, ${Math.round(th.busy * 100)}% busy, ${th.freezes} freezes >70 ms over ${th.beats} beats`);
  if (sc && (sc.particles || sc.dynamic || sc.skinned || sc.loops || sc.broken)) { const t = (a) => (a?.length ? " [" + a.map(([k, n]) => k + "×" + n).join(", ") + "]" : "");
    L.push(`load: ${sc.particles ?? 0} particles${t(sc.particlesTop)} · ${sc.dynamic ?? 0} dynamic bodies${t(sc.dynamicTop)} · ${sc.chars ?? 0} characters · ${sc.skinned ?? 0} skinned${t(sc.skinnedTop)} · ${sc.loops ?? 0} looping sounds${t(sc.loopsTop)} · ${sc.broken ?? 0} broken scripts${t(sc.brokenTop)}`);
    if (sc.noRangeTop?.length) L.push("no draw distance: " + sc.noRangeTop.map(([k, n]) => k + "×" + n).join(", ")); }
  if (I.ents) L.push(`objects in ${I.ents.place}: ${I.ents.n} now, ${I.ents.perMin >= 0 ? "+" : ""}${Math.round(I.ents.perMin)}/min${I.ents.grower ? ", growing: " + I.ents.grower : ""}`);
  if (I.stalls?.length) L.push("stalls: " + I.stalls.slice(0, 10).map((s) => `${meta.clock ? meta.clock(s.t) : ""}${Math.round(s.ms)}ms ${s.kind || "engine"}: ${stallCause(s)}`).join("; "));
  if (meta.env) L.push("device: " + meta.env);
  return L.join("\n");
}
