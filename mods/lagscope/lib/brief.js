// LAGSCOPE brief (2.0): the part of a report an AI reads once and acts on. Pure: no DOM, no ctx.
//   brief(I, a)     -> { v, bound, headline, numbers, culprits[], next[] }   I = the watch's input, a = core.analyze(I)
//   briefText(ai)   -> the same as plain text (the report's tail, the Savi message, the panel's "copy for AI")
//   mergeBriefs([]) -> many reports' briefs folded into one ranked list (send-to-Savi, /lagscope)
// A culprit is one cause with everything needed to fix it without another question:
//   { rank, key, side, sev, impact, evidence, who[], files[], fix, code, check, next }
//   side: gpu (drawing on the graphics card) | cpu (the renderer's CPU: draw calls, object count) | sim (the game thread:
//         scripts, physics) | mem | net | load.   who[]: { name, n, tpl, scr[], ids[], at:[x,z] } = the things that do it.
//   impact ranks them: severity x how far over budget x2 when the cause sits on the side this machine is bound by.
const fin = Number.isFinite;
const SEV = { bad: 3, warn: 2, hint: 1 };
const r1 = (v) => (fin(v) ? +v.toFixed(1) : null);
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const SCAN = "ctx.emit('lagscope:scan', { why: 'after fix' }) in run_script, wait 6 s, then read the newest lagscope_reports row";

// where to look when the scan could not name the things behind a cause
const LOOK = {
  "spawn-burst": "grep -rn \"spawn(\" scripts sim.js places | grep -v lib/ (the loop that spawns many in one call)",
  "memory-leak": "grep -rn \"\\.push(\\|new Map\\|ctx.on(\" scripts sim.js (a list that only grows, an ear armed per tick)",
  "gc-churn": "grep -rn \"\\.map(\\|\\.filter(\\|\\.\\.\\.\" scripts | grep -v lib/ (allocations inside update())",
  "hud-layout": "ui.js / scripts/ui.js: what changes in the markup every render",
  "render-scale": "the gpu culprits in this list; spawn perf --frame",
  "ping": "nothing in the game: the player's connection",
  "sprites": "spawn perf --frame (scene groups) ; grep -rn \"sprite:\" scripts templates",
  "state-chatter": "spawn perf (the network by owner) ; grep -rn \"state\\.[a-z]* =\" scripts | grep -v lib/",
};
// which side holds this machine's frame: the first thing an AI needs, because a GPU fix does nothing for a script problem
export function boundOf(I, a) {
  const s = a?.stats || {}, th = s.thread, fps = s.fps;
  if (!fin(fps)) return { side: "unknown", why: "no frames measured yet" };
  const simHot = !!th && (th.avg > 6 || th.freezes > 2), gpuHot = fin(s.gpu) && s.gpu > 10, cpuHot = fin(s.cpu) && s.cpu > 10, hitch = s.stallPerMin > 2;
  if (fps >= 55 && !simHot && !hitch) return { side: "ok", why: `${Math.round(fps)} fps, game thread on time, no hitches` };
  if (gpuHot && s.gpu >= (s.cpu || 0)) return { side: "gpu", why: `the graphics card takes ${s.gpu.toFixed(1)} ms a frame (render CPU ${fin(s.cpu) ? s.cpu.toFixed(1) : "?"}): lights, shadows, particles, triangles, resolution` };
  if (cpuHot) return { side: "cpu", why: `the renderer's CPU takes ${s.cpu.toFixed(1)} ms a frame (GPU ${fin(s.gpu) ? s.gpu.toFixed(1) : "?"}): draw calls, object count, animated bodies, shadow casters` };
  if (simHot) return { side: "sim", why: `the game thread lands ${th.avg.toFixed(1)} ms late a beat with ${th.freezes} freezes: scripts and physics. It runs beside the picture, so fps can read fine while the game itself stutters` };
  if (hitch) return { side: "hitch", why: `${(s.stallPerMin || 0).toFixed(1)} freezes over 50 ms a minute with an otherwise cheap frame: one-off work (a spawn burst, a big loop, a sweep), not a steady load` };
  return { side: "outside", why: `${fin(fps) ? (1000 / Math.max(1, fps)).toFixed(1) : "?"} ms a frame but render CPU ${fin(s.cpu) ? s.cpu.toFixed(1) : "?"} + GPU ${fin(s.gpu) ? s.gpu.toFixed(1) : "?"} ms: most of the frame is outside the game (browser, vsync, another tab, a throttled or weak device)` };
}

// the engine's default player scripts and this mod ride every player: never a culprit's address unless they are all there is AND measured hot
const NOISE = /^(scripts\/(humanoid-locomotion|player|camera)\.js|templates\/(player|camera)\.js|mods\/lagscope\/)/;
const noisy = (p) => NOISE.test(String(p || "").split("#")[0]);
const clean = (w) => { if (!w || String(w.ids?.[0] || "").startsWith("player/") || noisy(w.tpl) && !(w.scr || []).some((x) => !noisy(x))) return null;
  const scr = (w.scr || []).filter((x) => !noisy(x)); return { ...w, ...(w.tpl && noisy(w.tpl) ? { tpl: undefined } : {}), scr }; };
const cleanWho = (who) => (who || []).map(clean).filter(Boolean);
const whoOf = (sc, cat, legacy) => {
  const w = cleanWho(sc?.who?.[cat]); if (w.length) return w.slice(0, 5);
  return (legacy || []).slice(0, 4).filter(([name]) => !/^player\b/.test(String(name))).map(([name, n]) => ({ name, n }));
};
const filesOf = (who, extra) => {
  const out = []; const push = (p) => { p = String(p || "").split("#")[0]; if (p && !out.includes(p) && out.length < 6) out.push(p); };
  for (const p of extra || []) push(p);
  for (const w of who || []) { if (!noisy(w.tpl)) push(w.tpl); for (const s of w.scr || []) if (!noisy(s) || w.hot) push(s); }
  return out;
};

export function brief(I, a) {
  const s = a?.stats || {}, sc = I?.scene || null, th = s.thread || I?.thread || null, en = s.ents || I?.ents || null, vw = I?.view || {}, P = s.P || {}, M = s.M || {};
  const B = boundOf(I, a), C = [];
  const add = (key, side, sev, over, evidence, who, o) => C.push({ key, side, sev, over: clampN(fin(over) ? over : 1, 1, 4), evidence, who: who || [], files: filesOf(who, o.files), fix: o.fix, code: o.code || null, check: o.check || null, saves: o.saves || null, next: o.next || null, look: (who || []).length ? null : o.look || o.next || LOOK[key] || "spawn perf" });
  const sevBy = (v, warn, bad) => (v > bad ? "bad" : v > warn ? "warn" : "hint");
  // measured time per script when the watch carries it (I.sim.scripts [{path, ms, calls}] or I.scriptMs {path: ms}); counts otherwise
  const msRows = Array.isArray(I?.sim?.scripts) ? I.sim.scripts : I?.scriptMs && typeof I.scriptMs === "object" ? Object.entries(I.scriptMs).map(([path, ms]) => ({ path, ms })) : [];
  const msOf = (p) => { const r = msRows.find((q) => q.path === p || String(q.path).endsWith("/" + p) || p.endsWith("/" + q.path)); return r && fin(r.ms) ? r.ms : null; };
  const all = (sc?.scripts || []).map((r) => ({ ...r, ms: msOf(r.path) })).sort((x, y) => (y.ms ?? -1) - (x.ms ?? -1) || y.n - x.n);
  const game = all.filter((r) => !noisy(r.path)), hotNoise = all.filter((r) => noisy(r.path) && r.ms > 2);
  const scripts = game.length ? game : hotNoise.map((r) => ({ ...r, hot: true })), topScr = scripts[0];
  const sRow = (r, nm) => ({ name: nm || r.path.split("/").pop(), n: r.n, scr: [r.path], ...(r.tpl && !noisy(r.tpl) ? { tpl: r.tpl } : {}), ids: r.ids, at: r.at, ...(r.hot ? { hot: true } : {}) });
  const msTxt = (r) => (r && fin(r.ms) ? ` (${r.ms.toFixed(1)} ms a tick measured)` : "");
  const perf = (p) => `spawn perf --script ${p}`;

  // ---- sim: the game thread ----
  const physSusp = !scripts.length && (sc?.dynamic ?? 0) > 150; // no game script near, many loose bodies: the thread's load is physics
  const physNote = physSusp ? `; no game script runs near but ${sc.dynamic} dynamic bodies do: physics is the likely load (see dynamic-bodies)${I?.phys ? `, physics step p95 ${I.phys.p95} ms` : ""}` : "";
  if (th && (th.avg > 3 || th.freezes > 0)) add("game-thread", "sim", th.avg > 18 || th.freezes > 8 ? "bad" : th.avg > 6 || th.freezes > 2 ? "warn" : "hint", Math.max(th.avg / 6, th.freezes / 3),
    `game thread ${th.avg} ms late a beat (p99 ${th.p99}, worst ${th.max}), ${Math.round(th.busy * 100)}% busy, ${th.freezes} freezes over 70 ms in ${th.beats} beats${I?.tick ? `; update() ran at ${I.tick.hz} Hz of 30, worst gap ${I.tick.worst} ms` : ""}}${physNote}`,
    scripts.slice(0, 5).map((r) => sRow(r)),
    { saves: topScr && fin(topScr.ms) ? `up to ${topScr.ms.toFixed(1)} ms a tick (${topScr.path}, measured)` : `${th.freezes} freezes over 70 ms and ${th.avg} ms late a beat`,
      look: "spawn perf (its tick table ranks each script's ms) ; grep -rln \"export function update\" scripts sim.js places", fix: "the heaviest update() or sim tick holds the thread. Read the tick table, open its top script row, then: sleep when idle, look (query, raycast, findPath) a few times a second instead of every tick, spread big loops over ticks with a cursor.",
      code: "const S = ctx.self.session; if (ctx.now() - (S.lookAt ?? 0) > 250) { S.lookAt = ctx.now(); S.near = ctx.query({ tags: [\"x\"], radius: 20 }); } // look 4x a second, move every tick\nif (!moving) ctx.sleep(0.5);",
      check: "spawn perf: the tick reads on-budget and the script's row is under 2 ms; a new scan reads game thread under 6 ms late, 0 freezes", next: topScr ? perf(topScr.path) : "spawn perf" });
  const thHot = !!th && (th.avg > 6 || th.freezes > 2), many = game.filter((r) => r.n >= 20);
  if (sc && sc.scripted > 40) add("scripts-per-object", "sim", (thHot && many.length && (th.avg > 18 || th.freezes > 8 || sc.scripted > 120)) || (many[0]?.n ?? 0) >= 100 ? "bad" : thHot && many.length ? "warn" : sevBy(sc.scripted, 120, 400), Math.max(sc.scripted / 120, (many[0]?.n ?? 0) / 50, thHot && many.length ? Math.max(th.avg / 6, th.freezes / 3) : 0),
    `${sc.scripted} things within 250 m each run their own script` + (game.length ? `: ${game.slice(0, 4).map((r) => `${r.path} x${r.n}${msTxt(r)}`).join(", ")}` : "") + (thHot && many.length ? `; the game thread is ${th.avg} ms late with ${th.freezes} freezes while they run` : ""),
    scripts.slice(0, 5).map((r) => sRow(r, r.names?.[0])),
    { saves: topScr ? `${topScr.n - 1} fewer update() calls a tick (${topScr.path} x${topScr.n} -> x1)${msTxt(topScr)}` : null, fix: "N copies of one script are N update() calls a tick. Move the work into ONE manager object that steps every row (the rows keep their tag, lose their behavior); what stays per object sleeps the moment it has nothing to do.",
      code: "// scripts/<kind>-manager.js on one invisible object\nexport function update(ctx, dt) {\n  for (const w of ctx.query({ tags: [\"<tag>\"] })) { /* one dot write per row: w.velocity = ... */ }\n}",
      check: `${topScr ? perf(topScr.path) + ": its row drops from x" + topScr.n + " to x1; " : ""}a new scan reads fewer than 40 scripted things`, next: topScr ? perf(topScr.path) : null });
  const sx = (I?.stalls || []).filter((q) => q.kind === "script" || q.kind === "thread").sort((x, y) => y.ms - x.ms)[0];
  // who froze: the script the stall itself names (Long Animation Frames); a game-thread freeze names none, so the suspects are the
  // scripts with few copies (one heavy call, not many light ones), told as suspects: a script with 100 copies is scripts-per-object's
  const thrSt = (I?.stalls || []).filter((q) => q.kind === "thread" && fin(q.t)).map((q) => q.t).sort((x, y) => x - y), gaps = thrSt.slice(1).map((t, i) => t - thrSt[i]).sort((x, y) => x - y);
  const frzEvery = gaps.length >= 2 ? +(gaps[gaps.length >> 1] / 1000).toFixed(1) : null;
  const named = sx?.script ? scripts.filter((r) => r.path === sx.script || String(r.path).endsWith("/" + sx.script)) : [];
  const frzWho = named.length ? named.slice(0, 1).map((r) => sRow(r)) : scripts.filter((r) => r.n <= 3 || fin(r.ms) && r.ms > 20).slice(0, 3).map((r) => ({ ...sRow(r), suspect: true }));
  const burstOnly = !!sx?.burst && !named.length && !frzWho.length; // the freeze came with a spawn burst and no game script is in reach: a tool or the editor, most likely
  if (sx && sx.ms >= 100) add("freeze", "sim", burstOnly ? "hint" : sx.ms > 250 ? "bad" : "warn", burstOnly ? 1 : sx.ms / 100, `worst freeze ${Math.round(sx.ms)} ms: ${sx.cause}${burstOnly ? " (it came with a spawn burst and no game script runs near: likely a run_script or the editor, see spawn-burst)" : ""}${frzEvery ? `; freezes repeat about every ${frzEvery} s (a timer or a counter in one script)` : ""}${physNote}`, frzWho,
    { saves: `a ${Math.round(sx.ms)} ms freeze (measured)`, look: "spawn perf ('the longest pause' names the script) ; grep -rn \"for (\" scripts sim.js | grep -v lib/", fix: "one call did everything at once. Spread the batch over ticks (N items per update, a cursor in a variable), build only what changed, or move a heavy computation into a job (jobs/<id>.js runs off the game loop).",
      code: "let cursor = 0; // module variable\nexport function update(ctx) { const end = Math.min(list.length, cursor + 50); for (; cursor < end; cursor++) step(list[cursor]); if (cursor >= list.length) ctx.sleep(); }",
      check: "spawn perf: no row with 'the longest pause' past 33 ms; a new scan lists no freeze over 100 ms", next: "spawn perf" });
  if (sc && sc.dynamic > 60) add("dynamic-bodies", "sim", physSusp && th && (th.avg > 6 || th.freezes > 2) ? "bad" : sevBy(sc.dynamic, 150, 400), physSusp && th && (th.avg > 6 || th.freezes > 2) ? Math.max(sc.dynamic / 150, th.freezes / 3, th.avg / 6) : sc.dynamic / 150, `${sc.dynamic} dynamic physics bodies within 250 m` + (I?.phys ? `; physics step ${I.phys.p50} ms p50, ${I.phys.p95} ms p95, worst ${I.phys.max} ms (measured)` : ""), whoOf(sc, "dynamic", sc.dynamicTop),
    { saves: `${sc.dynamic - 60} fewer bodies solved every physics step`, fix: "every loose body is solved every step. Debris gets a lifetime, settled things become static, scripted movers are kinematic, piles are one body.", code: "lifetime: 6,            // on the debris template\nphysics: \"static\",     // once it has settled: obj.physics = \"static\"",
      check: "a new scan reads under 150 dynamic bodies; physics step p95 under 5 ms" + (I?.phys ? " (now " + I.phys.p95 + " ms)" : ""), next: "spawn perf" });
  if (sc && sc.chars > 40) add("character-bodies", "sim", sevBy(sc.chars, 90, 200), sc.chars / 90, `${sc.chars} character bodies within 250 m, each running a character controller`, whoOf(sc, "chars"),
    { saves: `${sc.chars - 40} fewer character controllers a step`, fix: "far NPCs do not need a controller: march them with an animate over feetPosition, or keep physics \"kinematic\" until a player is within ~40 m.", check: "a new scan reads under 90 character bodies" });
  if (sc && sc.meshCol > 30) add("mesh-colliders", "sim", sevBy(sc.meshCol, 80, 250), sc.meshCol / 80, `${sc.meshCol} things within 250 m collide by their full mesh`, whoOf(sc, "meshCol"),
    { saves: `${sc.meshCol} triangle-mesh tests become box tests`, fix: "a mesh collider tests every triangle. Props collide as a box, capsule or cylinder; keep mesh for the ground and buildings a body walks into.", code: "physics: { body: \"static\", collider: \"box\" }", check: "a new scan reads under 30 mesh colliders" });
  if (en && en.perMin > 20 && en.gain > 80 && (!("steady" in en) || en.steady === true)) add("entity-leak", "sim", en.perMin > 160 ? "bad" : en.perMin > 40 ? "warn" : "hint", en.perMin / 40,
    `objects piling up in ${en.place}: ${en.n} now, +${Math.round(en.perMin)} a minute${en.grower ? `, mostly tagged '${en.grower}'` : ""}`, whoOf(sc, "tag:" + (en.grower || "")),
    { saves: `about ${Math.round(en.perMin)} objects a minute stop piling up`, fix: `something spawns and never leaves. Find the ctx.spawn that makes ${en.grower ? "'" + en.grower + "'" : "them"} (grep the tag) and give its spec a lifetime, or destroy the old one before spawning the next; cap the count.`,
      code: "ctx.spawn({ template: \"templates/x.js#shell\", lifetime: 8 }); // dies on its own", check: `run_script: Object.keys(ctx.place.objects).length stays flat over a minute`, next: en.grower ? `grep -rn "${en.grower}" scripts templates sim.js places` : null });
  const bursts = (I?.stalls || []).filter((q) => q.burst);
  if (bursts.length) add("spawn-burst", "sim", bursts.length >= 3 && sx?.script ? "warn" : "hint", bursts.length, `${bursts.length} freezes came with a spawn burst (up to ${Math.max(...bursts.map((q) => q.burst))} objects at once); origin not seen in a game script: a run_script, the editor or a tool spawns like this too. Act only if a game script spawns that many in one call`, [],
    { saves: `${Math.max(...bursts.map((q) => q.burst))} spawns in one call become ~20 a tick`, fix: "spawn big groups across ticks, ~20 a tick, from a cursor; or make the group ONE object (a scatter, an instanced template).", code: "const n = Math.min(20, todo.length); for (let i = 0; i < n; i++) ctx.spawn(todo.pop());", check: "a new scan lists no stall with 'objects spawned at once'", look: "grep -rn \"spawn(\" scripts sim.js places | grep -v lib/ (a loop that spawns many in one call; none = the burst came from outside the game's scripts, ignore it)" });
  if (sc && sc.broken) add("broken-scripts", "sim", sc.broken >= 5 ? "warn" : "hint", sc.broken / 3, `${sc.broken} things within 250 m have a script throwing every call`, whoOf(sc, "broken", sc.brokenTop),
    { saves: `${sc.broken} throws a call stop`, fix: "each throw is caught and counted, every call. Read the error rows and fix the line each names.", check: "run_script: getLogs({ level: 'error' }) returns no 'Behavior error' row", next: "run_script: return getLogs({ level: 'error', limit: 20 })" });

  // ---- gpu ----
  if (sc && sc.shLights > 2) add("shadow-lights", "gpu", sevBy(sc.shLights, 4, 10), sc.shLights / 4, `${sc.shLights} lights cast shadows within 250 m (budget 4)`, whoOf(sc, "shLights"),
    { saves: `${Math.max(0, sc.shLights - 1)} fewer shadow passes, each redrawing ${sc.shadows ?? "?"} casters (estimate before batching: up to ${(Math.max(0, sc.shLights - 1) * (sc.shadows || 0)).toLocaleString("en-US")} fewer shadow draws)`, fix: "each shadowed light draws the scene again. Keep shadows on the sun and one hero lamp; the rest light without them.", code: "light: { kind: \"point\", intensity: 2, distance: 20, shadow: { enabled: false } }", check: "a new scan reads 4 or fewer shadowed lights; spawn perf --frame shows the shadow pass shrink", next: "spawn perf --frame" });
  if (sc && (sc.lights > 24 || sc.lightsNR > 12)) add("lights", "gpu", sevBy(sc.lights, 48, 128), Math.max(sc.lights / 48, (sc.lightsNR || 0) / 12), `${sc.lights} lights within 250 m` + (sc.lightsNR ? `, ${sc.lightsNR} never switch off by distance` : ""), whoOf(sc, "lights"),
    { saves: (sc.lightsNR ? `${sc.lightsNR} lights stop lighting the frame past their range; ` : "") + `${Math.max(0, sc.lights - 24)} fewer lights per shaded pixel at best`, fix: "give every lamp a visibleRange so far ones stop lighting the frame, shorten light.distance to what it really reaches, and replace rows of small lamps by one wider light plus emissive material on the bulbs.", code: "visibleRange: { max: 60 }, light: { kind: \"point\", intensity: 2, distance: 12 }", check: "a new scan reads under 24 lights, none with no range, and GPU ms lower" });
  if (sc && sc.particles > 1500) add("particles", "gpu", sevBy(sc.particles, 4000, 12000), sc.particles / 4000, `${sc.particles} particles alive within 250 m from ${sc.fx} emitters`, whoOf(sc, "particles", sc.particlesTop),
    { saves: `${Math.max(0, sc.particles - 4000).toLocaleString("en-US")} fewer particles drawn (to the 4000 budget)`, fix: "lower rate / n on the emitters named, add a per-device branch, give emitter rows a visibleRange, end one-off effects with a life. Big soft alpha sprites cost the most fill.", code: "pop smoke rate=?mobile:8|low:12|30 ...   // per-viewer branch in the fx program\nvisibleRange: { max: 70 }              // on the emitter's row", check: "a new scan reads under 4000 particles" });
  else if (sc && sc.fx > 30) add("fx-count", "gpu", "hint", sc.fx / 30, `${sc.fx} effects running within 250 m`, whoOf(sc, "particles", sc.particlesTop), { fix: "check for leftover or stacked emitters: an endless fx stays until destroyed.", check: "a new scan reads under 30 effects" });
  if (fin(s.tri) && s.tri > 8e5) add("triangles", "gpu", sevBy(s.tri, 1.2e6, 3e6), s.tri / 1.2e6, `${(s.tri / 1e6).toFixed(2)}M triangles in the frame (view + shadow maps)`, whoOf(sc, "models"),
    { saves: `${((s.tri - 1.2e6) / 1e6).toFixed(2)}M fewer triangles to reach 1.2M`, fix: "the models listed carry the frame. Give them a visibleRange, swap a lighter twin past ~30 m, cut copies, and take small props out of the shadow pass.", code: "visibleRange: { max: 90 }, castShadow: false", check: "ctx.view.triangles under 1.2M on a new scan", next: "spawn perf --frame" });
  const mods = sc ? (sc.models || []).map((r) => ({ ref: r[0], n: r[1], tri: r[2], bytes: r[3], name: r[5] || String(r[0]).split("/").pop().slice(0, 18), nr: r[7] || 0 })) : [];
  const heavy = mods.filter((r) => r.tri * r.n > 250000).sort((x, y) => y.tri * y.n - x.tri * x.n)[0];
  if (heavy) add("heavy-model", "gpu", heavy.tri * heavy.n > 1e6 ? "bad" : "warn", (heavy.tri * heavy.n) / 5e5, `${heavy.name}: ${heavy.n} copies x ${heavy.tri.toLocaleString("en-US")} triangles = ${((heavy.tri * heavy.n) / 1e6).toFixed(2)}M (${heavy.nr} copies with no draw distance)`,
    [{ name: heavy.name, n: heavy.n, model: heavy.ref }], { saves: `${((heavy.tri * heavy.n) / 1e6).toFixed(2)}M triangles from one model`, fix: "decimate this model (an ordinary prop is under 20k triangles), or give its rows a visibleRange and a lighter twin for the far band.", code: "visibleRange: { max: 40 }   // the full mesh\n// + a second row, a 2-5k twin: visibleRange: { min: 40, max: 200 }", check: "the model's row leaves 'heaviest models' in spawn perf", next: "spawn perf --frame" });
  const vegBeds = sc ? (sc.vegBeds || []).filter((b) => b[1] > 20000 || b[2] > 150) : [];
  if (vegBeds.length) add("vegetation", "gpu", "warn", vegBeds[0][1] / 20000, `scatter bed ${vegBeds[0][0]}: ${vegBeds[0][1]} plants drawn out to ${vegBeds[0][2] ?? "?"} m`, [{ name: vegBeds[0][0], n: 1 }],
    { saves: `${Math.max(0, vegBeds[0][1] - 7000)} fewer plants drawn`, fix: "a bed reads full at 6-8k plants; give it a maxDistance of 60-100 m.", code: "scatter: { count: 7000, maxDistance: 80, ... }", check: "spawn perf scene groups: the scatter row's triangles fall" });
  if (fin(vw.renderScale) && vw.renderScale > 0 && vw.renderScale < 0.8) add("render-scale", "gpu", "hint", 1 / vw.renderScale, `the engine draws at ${Math.round(vw.renderScale * 100)}% resolution to hold the frame`, [],
    { fix: "a symptom, not a cause: the GPU is over budget. Fix the gpu culprits above and the picture sharpens on its own.", check: "ctx.view.renderScale back to 1" });
  if (fin(vw.gpuMemoryMB) && vw.gpuMemoryMB > 1500) add("gpu-memory", "gpu", sevBy(vw.gpuMemoryMB, 2048, 3500), vw.gpuMemoryMB / 2048, `GPU memory ${Math.round(vw.gpuMemoryMB)} MB (textures and buffers); phones drop past ~1.5 GB`, whoOf(sc, "models"),
    { saves: `${Math.round(vw.gpuMemoryMB - 1500)} MB of GPU memory to reach 1.5 GB`, fix: "fewer, smaller textures: 1k for props, 2k for heroes, one material reused across kinds. Uploaded models often carry 4k maps.", check: "ctx.view.gpuMemoryMB under 1500", next: "spawn perf (memory lines)" });

  // ---- cpu: the renderer's side ----
  if (fin(s.draw) && s.draw > 500) add("draw-calls", "cpu", sevBy(s.draw, 800, 1500), s.draw / 800, `${Math.round(s.draw)} draw calls a frame (every pass, shadow maps included)`, whoOf(sc, "noRange", sc?.noRangeTop),
    { saves: `${Math.round(s.draw - 800)} fewer draw calls a frame to reach 800`, fix: "many copies of ONE model or primitive batch into one draw; many distinct models and materials do not. Reuse a template, share materials, drop castShadow on clutter (each caster draws again per shadow map), give props a visibleRange.", code: "castShadow: false, visibleRange: { max: 80 }", check: "ctx.view.drawCalls under 800 on a new scan", next: "spawn perf --frame" });
  if (sc && sc.noRange > 40) add("no-draw-distance", "cpu", sevBy(sc.noRange, 60, 400), sc.noRange / 60, `${sc.noRange} drawn things within 250 m have no visibleRange`, whoOf(sc, "noRange", sc.noRangeTop),
    { saves: `up to ${sc.noRange} things stop drawing past their range`, fix: "set visibleRange on the template (one edit fixes every copy): small props 40-80 m, buildings 200+.", code: "visibleRange: { max: 80 }", check: "a new scan reads under 60 things with no draw distance" });
  if (sc && sc.smallShadows > 25) add("small-shadows", "cpu", sevBy(sc.smallShadows, 40, 300), sc.smallShadows / 40, `${sc.smallShadows} props under 1.2 m cast shadows within 250 m (${sc.shadows} casters in all)`, whoOf(sc, "smallShadows"),
    { saves: `${sc.smallShadows} fewer shadow casters x ${Math.max(1, sc.shLights || 1)} shadow maps = up to ${(sc.smallShadows * Math.max(1, sc.shLights || 1)).toLocaleString("en-US")} fewer shadow draws (estimate before batching${fin(s.draw) ? `; ${Math.round(s.draw)} draw calls measured` : ""})`, fix: "clutter's shadow is nearly invisible and each caster draws again per shadow map. castShadow: false on the template.", code: "castShadow: false", check: "a new scan reads under 40 small shadow casters; draw calls fall" });
  else if (sc && sc.shadows > 1500) add("shadow-casters", "cpu", sevBy(sc.shadows, 2000, 5000), sc.shadows / 2000, `${sc.shadows} shadow casters within 250 m`, whoOf(sc, "shadows"), { saves: `${sc.shadows - 1500} fewer shadow casters`, fix: "walls deep inside a base and far pieces can skip castShadow.", code: "castShadow: false", check: "under 2000 casters on a new scan" });
  if (sc && sc.skinned > 30) add("skinned-bodies", "cpu", sevBy(sc.skinned, 70, 200), sc.skinned / 70, `${sc.skinned} animated (skinned) bodies within 250 m`, whoOf(sc, "skinned", sc.skinnedTop),
    { saves: `${sc.skinned - 30} fewer skeletons posed a frame`, fix: "every rigged body poses its bones each frame while drawn. Give mobs and NPCs a visibleRange so far ones stop drawing and animating; stop clips on idle crowds.", code: "visibleRange: { max: 60 }", check: "a new scan reads under 70 skinned bodies; spawn perf's prepare/models step shrinks", next: "spawn perf --frame" });
  if (sc && sc.near50 > 500) add("dense-objects", "cpu", sevBy(sc.near50, 800, 2000), sc.near50 / 800, `${sc.near50} objects within 50 m (${sc.total} within 250 m)`, whoOf(sc, "all"),
    { saves: `${sc.near50 - 500} fewer objects within 50 m`, fix: "each piece is its own object. Merge repeated detail into one scripted primitive or a scatter, build walls from bigger pieces.", check: "a new scan reads under 800 objects within 50 m" });
  if (sc && sc.sprites > 1500) add("sprites", "cpu", "warn", sc.sprites / 1500, `${sc.sprites} sprites within 250 m`, [], { saves: `${sc.sprites - 1500} fewer sprites`, fix: "draw tile maps as tiles (ctx.place.tiles) or one sheet, pool bullets, give far sprites a visibleRange.", check: "under 1500 sprites" });
  const hud = (I?.stalls || []).filter((q) => q.kind === "hud").length;
  if (hud) add("hud-layout", "cpu", hud > 5 ? "warn" : "hint", hud / 3, `${hud} freezes in HUD style + layout`, [], { files: ["ui.js", "scripts/ui.js"], fix: "the HUD rebuilt a lot of HTML at once. Keep the render's output identical when nothing changed (no timestamps or random ids in the markup), move long lists behind a tab, cap list rows.", check: "a new scan lists no 'hud' stalls" });

  // ---- memory, network, loading ----
  if (M.floorPerMin > 2) add("memory-leak", "mem", M.floorPerMin > 6 ? "warn" : "hint", M.floorPerMin / 6, `JS memory kept after each sweep rises ${M.floorPerMin.toFixed(1)} MB a minute (now ${Math.round(M.now)} MB)`, [],
    { fix: "something keeps references: an array or Map in a script that only grows, an ear armed with ctx.on() every tick. Cap the list, clear it when its owner dies, declare ears in `export const ears`.", check: "the floor stays flat over 3 minutes on a new scan" });
  if (M.churnPerMin > 90 && (s.kinds?.gc || 0) > 0) add("gc-churn", "mem", "warn", M.churnPerMin / 90, `allocating ${Math.round(M.churnPerMin)} MB a minute; ${s.kinds.gc} freezes line up with garbage sweeps`, [],
    { fix: "per-frame code makes new arrays and objects every call. Reuse them: hoist scratch vectors to module scope, avoid .map/.filter/spread in update().", check: "allocation under 90 MB/min, no 'gc' stalls" });
  if (fin(vw.netInBytes) && vw.netInBytes > 60000) add("state-chatter", "net", sevBy(vw.netInBytes, 150000, 400000), vw.netInBytes / 150000, `the room sends this machine ${Math.round(vw.netInBytes / 1024)} KB a second${fin(vw.netInMessages) ? ` in ${vw.netInMessages} messages` : ""}${fin(vw.netOutBytes) ? `; it sends ${Math.round(vw.netOutBytes / 1024)} KB` : ""}`,
    scripts.slice(0, 3).map((r) => sRow(r)),
    { saves: `${Math.round((vw.netInBytes - 60000) / 1024)} KB a second off the wire`, fix: "a value written to state every tick rides the wire to every player. Keep per-tick values in a variable or ctx.self.session; write state when it changes, or at a few Hz.", code: "if (next !== ctx.self.state.phase) ctx.self.state.phase = next; // on change, never per tick", check: "ctx.view.netInBytes under 60 KB/s on a new scan", next: "spawn perf (the network by owner)" });
  if (sc && (sc.loops > 24 || sc.loopsAll > 3)) add("audio-loops", "load", "hint", Math.max(sc.loops / 24, sc.loopsAll / 3), `${sc.loops} looping sounds within 250 m, ${sc.loopsAll} of them to the whole place`, whoOf(sc, "loops", sc.loopsTop),
    { saves: `${Math.max(0, sc.loops - 24)} fewer looping voices`, fix: "one ambience bed per zone, not one per prop; spatial: true and maxDistance 30-60 on the rest.", code: "audio: { clip, loop: true, spatial: true, maxDistance: 40, gain: 0.15 }", check: "under 24 loops on a new scan" });
  if (sc && sc.assetMB > 80) add("download-weight", "load", "hint", sc.assetMB / 80, `the models within 250 m weigh ${Math.round(sc.assetMB)} MB to download`, whoOf(sc, "models"), { saves: `${Math.round(sc.assetMB - 80)} MB less to download`, fix: "compress textures to 1k-2k and decimate hero meshes; phones stream all of it on arrival.", check: "under 80 MB on a new scan" });
  if (fin(I?.ping) && I.ping > 150) add("ping", "net", "hint", I.ping / 150, `ping ${Math.round(I.ping)} ms`, [], { fix: "the connection, never fps: nothing in the game's files lowers it. Judge hits on the striker's machine and predict the player's own moves locally so it is felt less.", check: "n/a" });

  // impact: severity x how far over budget x2 on the bound side. The game thread is its own clock (fps can read fine while it
  // stutters), so a 'bad' sim cause counts as bound too; ties go to bad sim causes, then to the bound side
  for (const c of C) if (c.who.length && !c.files.length && !c.look) { const nm = String(c.who[0].name || "").replace(/[^\w\-./]/g, ""); if (nm) c.look = `grep -rn "${nm}" scripts sim.js places`; }
  const simFirst = (c) => (c.side === "sim" && c.sev === "bad" ? 2 : c.side === B.side ? 1 : 0);
  // a fix on the side that does not hold the frame recovers nothing now: weighed down and told so. Draw-count hints weigh by the
  // draws measured: under 300 the engine already batches the copies, so their gain is small
  const gpuLight = fin(s.gpu) && s.gpu > 0 && s.gpu < 4, cpuLight = fin(s.cpu) && s.cpu > 0 && s.cpu < 4, bound = ["gpu", "cpu", "sim", "hitch", "outside"].includes(B.side);
  const DRAWN = ["no-draw-distance", "small-shadows", "shadow-casters", "dense-objects", "draw-calls"];
  for (const c of C) {
    if (bound && c.side === "gpu" && gpuLight) { c.over *= 0.25; c.offside = `does not help now: the GPU takes ${s.gpu.toFixed(1)} ms a frame; fix it for weaker graphics cards`; }
    else if (bound && c.side === "cpu" && cpuLight) { c.over *= 0.25; c.offside = `does not help now: render CPU takes ${s.cpu.toFixed(1)} ms a frame`; }
    else if (bound && (c.side === "gpu" || c.side === "cpu") && B.side !== c.side && B.side !== "gpu" && B.side !== "cpu") c.over *= 0.5;
    if (DRAWN.includes(c.key) && fin(s.draw) && s.draw > 0 && s.draw < 300) { c.over *= 0.5; if (c.sev === "bad") c.sev = "warn"; c.evidence += ` (only ${Math.round(s.draw)} draw calls measured: the engine already batches these copies)`; }
    if (c.offside) { c.evidence += ` [${c.offside}]`; if (c.sev === "bad") c.sev = "warn"; }
  }
  for (const c of C) { c.impact = Math.round(SEV[c.sev] * 10 * c.over * (!c.offside && (c.side === B.side || (c.side === "sim" && c.sev === "bad" && B.side !== "ok")) ? 2 : B.side === "ok" ? 0.5 : 1)); delete c.over; }
  C.sort((x, y) => y.impact - x.impact || SEV[y.sev] - SEV[x.sev] || simFirst(y) - simFirst(x));
  // a bad sim culprit is never buried under drawing hints: the worst one stands in the top 2
  { const i = C.findIndex((c) => c.side === "sim" && c.sev === "bad"); if (i > 1) C.splice(1, 0, C.splice(i, 1)[0]); }
  C.forEach((c, i) => { c.rank = i + 1; });
  const next = []; for (const c of C) if (c.next && !next.includes(c.next) && next.length < 5) next.push(c.next);
  if (!next.includes("spawn perf")) next.push("spawn perf");
  const numbers = { fps: r1(s.fps), low1: r1(P.low1), frameMs: fin(s.fps) && s.fps > 0 ? r1(1000 / s.fps) : null, renderCpuMs: r1(s.cpu), gpuMs: r1(s.gpu), cpuP99: r1(I?.cost?.cpuP99), gpuP99: r1(I?.cost?.gpuP99), threadLateMs: th ? th.avg : null, threadFreezes: th ? th.freezes : null, tickHz: I?.tick?.hz ?? null,
    draws: fin(s.draw) ? Math.round(s.draw) : null, tris: fin(s.tri) ? Math.round(s.tri) : null, objects250: sc?.total ?? null, objects50: sc?.near50 ?? null, lights: sc?.lights ?? null, shadowLights: sc?.shLights ?? null, shadowCasters: sc?.shadows ?? null, particles: sc?.particles ?? null, dynamic: sc?.dynamic ?? null, scripted: sc?.scripted ?? null,
    stallsPerMin: r1(s.stallPerMin), heapMB: fin(M.now) ? Math.round(M.now) : null, gpuMemMB: fin(vw.gpuMemoryMB) ? Math.round(vw.gpuMemoryMB) : null, renderScale: fin(vw.renderScale) ? +vw.renderScale.toFixed(2) : null, netInKB: fin(vw.netInBytes) ? Math.round(vw.netInBytes / 1024) : null, ping: fin(I?.ping) ? Math.round(I.ping) : null, physMs: I?.phys ? I.phys.p95 : null };
  const top = C[0];
  const headline = B.side === "ok" ? (top ? `smooth now; ${C.length} thing${C.length > 1 ? "s" : ""} worth fixing before a weaker device meets them, first ${top.key}` : "smooth, nothing over budget")
    : `bound by ${B.side}; fix ${top ? top.key : "nothing named: read spawn perf"} first${top && top.side !== B.side && top.side === "sim" && (B.side === "cpu" || B.side === "gpu") ? " (the game thread freezes too: that is the 1% low)" : ""}`;
  return { v: 2, bound: B.side, why: B.why, headline, numbers, culprits: C.slice(0, 10), scripts: all.slice(0, 8).map((r) => ({ path: r.path, n: r.n })), next };
}

const whoLine = (w, k = 2) => `${w.suspect ? "suspect (not timed) " : ""}${w.scr?.length === 1 && String(w.scr[0]).endsWith("/" + w.name) ? w.scr[0] : w.name + (w.scr?.length ? " (" + w.scr.join(", ") + ")" : "")} x${w.n}${fin(w.amt) ? ` (${w.amt.toLocaleString("en-US")} particles)` : ""}${w.tpl ? " template " + w.tpl : ""}${w.model ? " model " + w.model : ""}${w.ids?.length ? " ids " + w.ids.slice(0, k).join(", ") : ""}${w.at ? ` near (${w.at[0]}, ${w.at[1]})` : ""}`;
// past the top four a fix keeps its action: the explaining first sentence goes, what to do stays
const shortFix = (f) => { const p = String(f).split(/(?<=\.) /); return p.length > 2 ? p.slice(1).join(" ") : String(f); };
export function briefText(ai, max = 10, cap = 5990) {
  if (!ai) return "";
  // the most detail that fits: every culprit keeps who/open/fix/saves/check; code goes first from the bottom, then fix wording
  for (let full = max; full >= 0; full--) { const t = briefAt(ai, max, full); if (t.length <= cap) return t; }
  for (const tight of [1, 2, 3]) { const t = briefAt(ai, max, 0, tight); if (t.length <= cap || tight === 3) return cutTo(t, cap); } // tight: past #3 one who row, one id; then past #5 short fix and check
  return "";
}
const cutTo = (t, cap) => { if (t.length <= cap) return t; const cut = t.lastIndexOf("\n", cap - 40); return t.slice(0, cut > 0 ? cut : cap - 40) + "\n(brief cut at " + cap + " characters)"; };
function briefAt(ai, max, full, tight = false) {
  const n = ai.numbers || {}, v = (x, u = "") => (x == null ? "?" : x + u), L = [];
  L.push(`AI BRIEF v${ai.v} · ${ai.headline}`);
  L.push(`bound: ${ai.bound} (${ai.why})`);
  L.push(`numbers: fps ${v(n.fps)} (1% low ${v(n.low1)}) · frame ${v(n.frameMs, " ms")} of 16.7 = render CPU ${v(n.renderCpuMs)} (p99 ${v(n.cpuP99)}) + GPU ${v(n.gpuMs)} (p99 ${v(n.gpuP99)}) · game thread ${v(n.threadLateMs, " ms late")} ${v(n.threadFreezes)} freezes, ${v(n.tickHz)} Hz · draws ${v(n.draws)} · tris ${v(n.tris)} · objects ${v(n.objects250)} (${v(n.objects50)} in 50 m) · lights ${v(n.lights)} (${v(n.shadowLights)} shadowed) · casters ${v(n.shadowCasters)} · particles ${v(n.particles)} · dynamic ${v(n.dynamic)} · physics ${v(n.physMs, " ms p95")} · scripted ${v(n.scripted)} · stalls ${v(n.stallsPerMin)}/min (page frames over 50 ms + game-thread freezes) · heap ${v(n.heapMB, " MB")} · GPU mem ${v(n.gpuMemMB, " MB")} · render scale ${v(n.renderScale)} · net in ${v(n.netInKB, " KB/s")} · ping ${v(n.ping, " ms")}`);
  L[2] = L[2].split(" · ").filter((x) => !/^[a-zA-Z0-9 %]+\?$/.test(x.trim())).join(" · ").replace(/ \((1% low|p99) \?\)/g, "").replace(/, \? Hz/, ""); // an unmeasured number is left out, never shown as ?
  if (!ai.culprits?.length) L.push("culprits: none");
  const seenWho = {}, seenOpen = {}; let seenOff = 0, seenBat = 0;
  for (const c of (ai.culprits || []).slice(0, max)) {
    let ev = String(c.evidence); const off = ev.match(/ \[does not help now[^\]]*\]/); if (off && tight && seenOff) ev = ev.replace(off[0], " [does not help now: see #" + seenOff + "]"); else if (off) seenOff = c.rank; // the off-side note once in full
    const bat = ev.match(/ \(only \d+ draw calls measured[^)]*\)/); if (bat && tight && seenBat) ev = ev.replace(bat[0], " (batched: see #" + seenBat + ")"); else if (bat) seenBat = c.rank;
    L.push(`${c.rank}. [${c.key} · ${c.side} · ${c.sev} · impact ${c.impact}${c.seen ? " · in " + c.seen + " reports" : ""}] ${ev}`);
    const deep = c.rank <= 3, wl = c.who?.length ? c.who.slice(0, deep ? 4 : tight ? 1 : 2).map((w) => whoLine(w, deep || !tight ? 2 : 1)).join(" | ") : "", wk = (c.who || []).map((w) => w.name + "|" + (w.scr || []).join()).sort().join(";"), same = wl && seenWho[wk]; if (wl && !same) seenWho[wk] = c.rank; // the first five carry everything; the rest stay short so the whole brief reads at once
    if (same) L.push(`   who: same as #${same}`);
    else if (wl) L.push("   who: " + wl + (c.look && !(tight >= 3 && c.rank > 5) ? " · find: " + c.look : ""));
    else L.push("   who: not named by the scan; look: " + (c.look || c.next || "spawn perf"));
    const of = (c.files || []).join(", "), ok = [...(c.files || [])].sort().join(); if (of) L.push("   open: " + (seenOpen[ok] ? `same as #${seenOpen[ok]}` : of)); if (of && !seenOpen[ok]) seenOpen[ok] = c.rank;
    const trim = (x, k) => (tight >= 2 && c.rank > (tight >= 3 ? 3 : 5) && String(x).length > k ? String(x).slice(0, k - 1).replace(/[ ,;:(]+[^ ]*$/, "") + "…" : x);
    L.push("   fix: " + trim(c.rank <= Math.max(full, 2) ? c.fix : shortFix(c.fix), tight >= 3 ? 110 : 170));
    if (c.code && (c.rank <= Math.max(full, 1) || (c.code.length < 70 && c.rank <= full + 3 && !(tight >= 2 && c.rank > 3)))) L.push("   code: " + c.code.split("\n").join("\n         "));
    if (c.saves) L.push("   saves: " + trim(c.saves, tight >= 3 ? 90 : 140));
    if (c.check) L.push("   check: " + trim(String(c.check).replace(/a new scan reads/g, "rescan reads"), tight >= 3 ? 90 : 140));
  }
  if (ai.scripts?.length && !(ai.culprits || []).some((c) => c.key === "scripts-per-object")) L.push("scripts running near (objects each): " + ai.scripts.map((r) => `${r.path} x${r.n}`).join(", "));
  if (full > 0) L.push("next reads: " + (ai.next || []).join(" ; ")); // tight: each culprit already names its own next read
  L.push("verify a fix: " + SCAN + ".");
  return L.join("\n");
}

// many machines' briefs as one: a culprit's impact is summed over the reports that carry it, its worst evidence kept
export function mergeBriefs(list) {
  const by = new Map(), bound = {}; let n = 0;
  for (const ai of list || []) { if (!ai?.culprits) continue; n++; bound[ai.bound] = (bound[ai.bound] || 0) + 1;
    for (const c of ai.culprits) { const m = by.get(c.key); if (!m) by.set(c.key, { ...c, seen: 1, sum: c.impact }); else { m.seen++; m.sum += c.impact; if (c.impact > m.impact) Object.assign(m, { ...c, seen: m.seen, sum: m.sum }); for (const f of c.files || []) if (!m.files.includes(f) && m.files.length < 8) m.files.push(f); } } }
  const C = [...by.values()].sort((x, y) => y.sum - x.sum); C.forEach((c, i) => { c.rank = i + 1; c.impact = c.sum; delete c.sum; });
  const side = Object.entries(bound).sort((x, y) => y[1] - x[1])[0]?.[0] || "unknown", top = C[0];
  const next = []; for (const c of C) if (c.next && !next.includes(c.next) && next.length < 5) next.push(c.next); if (!next.includes("spawn perf")) next.push("spawn perf");
  return { v: 2, merged: n, bound: side, why: Object.entries(bound).map(([k, v]) => `${k} x${v}`).join(", ") + " across " + n + " reports", headline: top ? `${n} reports; fix ${top.key} first (in ${top.seen})` : `${n} reports, no culprit named`, numbers: {}, culprits: C.slice(0, 10), next };
}
// the short form for a chat message (notifyDm holds ~2000 characters)
export function briefShort(ai, max = 5) {
  if (!ai) return "";
  const L = [`${ai.headline} · bound: ${ai.bound}`];
  for (const c of (ai.culprits || []).slice(0, max)) L.push(`${c.rank}. ${c.key} (${c.side}, ${c.sev}${c.seen ? ", " + c.seen + "x" : ""}): ${String(c.evidence).slice(0, 110)}${c.files?.length ? " → " + c.files.slice(0, 2).join(", ") : ""}`);
  return L.join("\n");
}
