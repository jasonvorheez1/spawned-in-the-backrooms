// LAGSCOPE scene + machine sampler. Runs in the local player's body (watch.js). Reads only what every Spawn game has:
// the engine's view counters (ctx.view), the page's long frames (PerformanceObserver), the JS heap, and what stands
// within 250 m (ctx.query + ctx.world.assets). Spread over frames: a pass reads at most ~1.5 ms a frame and repeats every 5 s,
// so the inspector never makes the hitch it reports.
const clock = typeof performance !== "undefined" && performance.now ? () => performance.now() : () => Date.now();
const R = (globalThis.__lagscope ||= { stalls: [], loaf: false, lt: false, obs: false, longN: 0, longMs: 0 });

// ---- stalls with their cause: Long Animation Frames name the script file that held the frame ----
const base = (u) => String(u || "").split("?")[0].split("/").pop().slice(0, 40) || "inline";
export function addStall(s) { s.wall = Date.now() - (clock() - s.t); R.stalls.unshift(s); if (R.stalls.length > 60) R.stalls.pop(); }
if (!R.obs && typeof PerformanceObserver !== "undefined") {
  R.obs = true;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) {
      R.longN++; R.longMs += e.duration;
      const end = e.startTime + e.duration, layout = e.styleAndLayoutStart ? end - e.styleAndLayoutStart : 0, render = e.renderStart ? (e.styleAndLayoutStart || end) - e.renderStart : 0;
      let top = null; for (const sc of e.scripts || []) if (!top || sc.duration > top.duration) top = sc;
      let kind = "engine", cause = "engine / browser (no script named)";
      if (top && top.duration >= e.duration * 0.4) {
        const file = base(top.sourceURL), fn = top.sourceFunctionName || top.invoker || "", eng = /browser-client|engine|vendor|chunk/i.test(file);
        kind = eng ? "engine" : "script"; cause = `${eng ? "engine code" : "script"} ${file}${fn ? " " + String(fn).slice(0, 40) : ""} ${top.duration.toFixed(0)} ms${top.forcedStyleAndLayoutDuration > 5 ? ", forced layout " + top.forcedStyleAndLayoutDuration.toFixed(0) + " ms" : ""}`;
      } else if (layout >= e.duration * 0.4) { kind = "hud"; cause = `style + layout ${layout.toFixed(0)} ms (the HUD)`; }
      else if (render >= e.duration * 0.4) { kind = "render"; cause = `render step ${render.toFixed(0)} ms`; }
      addStall({ t: e.startTime, ms: e.duration, kind, cause });
    } }).observe({ type: "long-animation-frame", buffered: false });
    R.loaf = true;
  } catch {}
  if (!R.loaf) try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { R.longN++; R.longMs += e.duration; addStall({ t: e.startTime, ms: e.duration, kind: "engine", cause: "long task on the game page" }); } }).observe({ type: "longtask", buffered: false }); R.lt = true; } catch {}
}
export function heapNow() { const m = typeof performance !== "undefined" ? performance.memory : null; return m ? m.usedJSHeapSize / 1048576 : NaN; }
// a stall beside a heap drop of 2 MB+ was most likely the garbage sweep
export function tagGc(heap) {
  for (const s of R.stalls) { if (s.gcChecked) continue; const i = heap.findIndex((q, k) => k && Math.abs(q[0] - s.t) < 1200 && heap[k - 1][1] - q[1] > 2); if (i > 0) { s.kind = "gc"; s.cause = `garbage sweep (heap fell ${(heap[i - 1][1] - heap[i][1]).toFixed(0)} MB)`; } if (clock() - s.t > 2000) s.gcChecked = true; }
}
export const stalls = () => R.stalls;
// annotate a stall with what happened beside it (watch.js calls this with the place's object-count history)
export function noteStalls(ents) {
  for (const s of R.stalls) { if (s.noted) continue; if (clock() - s.t < 2500) continue; s.noted = true;
    let a = null, b = null; for (const q of ents) { if (q[0] <= s.t - 500) a = q; if (!b && q[0] >= s.t + 500) b = q; }
    if (a && b && b[1] - a[1] >= 60) { s.burst = b[1] - a[1]; s.cause += `, while ${s.burst} objects spawned at once`; } }
}
export const stallSource = () => (R.loaf ? "LoAF" : R.lt ? "longtask" : "none");

// ---- the panel's row: one every 250 ms while the panel is open ----
let lastAt = 0, frames = 0, worst = 0, prevT = 0, gaps = [];
export function sample(ctx) {
  const t = clock();
  if (prevT) { const d = t - prevT; if (d > worst) worst = d; if (d > 0 && d < 1000 && gaps.length < 600) gaps.push(Math.round(d * 100) / 100); } prevT = t; frames++;
  if (t - lastAt < 250) return null;
  const span = t - (lastAt || t - 250); lastAt = t;
  const v = ctx.view || {}, m = typeof performance !== "undefined" ? performance.memory : null;
  const row = { at: Date.now(), span: Math.round(span), frames, worst: +worst.toFixed(1), fps: v.fps ?? null, cpu: v.cpuMs ?? null, gpu: v.gpuMs ?? null,
    draw: v.drawCalls ?? null, tri: v.triangles ?? null, pixel: v.pixel ?? null, ping: ctx.self?.latencyMs ?? null,
    heap: m ? [m.usedJSHeapSize, m.totalJSHeapSize, m.jsHeapSizeLimit] : null, long: [R.longN, Math.round(R.longMs)], quality: ctx.quality ?? null,
    device: ctx.device ? { class: ctx.device.class, coarse: !!ctx.device.coarse } : null, scene: sceneStep(ctx, 120),
    stalls: R.stalls.slice(0, 24).map((s) => ({ wall: s.wall, ms: s.ms, kind: s.kind, cause: s.cause })), ft: gaps };
  gaps = []; frames = 0; worst = 0; R.longN = 0; R.longMs = 0;
  return row;
}

// ---- what stands within 250 m: models by copies × triangles, shadow casters, lights, effects, things with no draw distance ----
let scAt = 0, scRow = null, SC = null;
const FACT = new Map();
function facts(ctx, id, t) {
  let f = FACT.get(id); if (f && t - f.at < 30000) return f;
  const o = ctx.place.objects?.[id] ?? ctx.getObject(id); if (!o) { FACT.delete(id); return null; }
  const m = o.model, ref = typeof m === "string" ? m : m?.id, tags = o.tags || [], fp = o.feetPosition, drawn = o.visible !== false, cast = drawn && !!o.castShadow;
  let small = false; if (cast) { const z = o.bounds?.size; small = !!z && Math.max(z.x, z.y, z.z) < 1.2; }
  f = { at: t, tags: tags.slice ? tags.slice() : [], x: fp?.x, z: fp?.z, spr: !!o.sprite, beh: o.behavior ? (Array.isArray(o.behavior) ? o.behavior.length : 1) : 0, light: !!o.light, shL: !!o.light?.shadow?.enabled, fx: !!o.fx, ref: ref || null,
    cast, small, nr: drawn && !!(ref || o.primitive) && !o.visibleRange, tpl: o.template ? String(o.template) : "" };
  f.key = keyOf(o, id, tags); f.id = id;
  f.scr = [].concat(o.behavior || []).map((b) => (typeof b === "string" ? b : b?.script || "")).filter(Boolean).slice(0, 3);
  let scx = o.scatter; if (!scx && o.primitive == null && o.model == null) { try { scx = ctx.getObject(id)?.scatter; } catch {} } // place.objects' handle carries no scatter; getObject does
  if (scx) f.scat = [f.key, Math.round(+scx.count || 0), Number.isFinite(+scx.maxDistance) ? +scx.maxDistance : null];
  const ph = o.physics, body = typeof ph === "string" ? ph : ph?.body; f.dyn = body === "dynamic"; f.chr = body === "character"; f.mesh = !!ph && typeof ph === "object" && ph.collider === "mesh";
  const au = o.audio; f.aud = !!(au && au.loop); f.audAll = !!(au && au.loop && au.spatial === false);
  if (f.fx) { try { f.fxp = ctx.getFxState?.(id)?.totalExpectedAlive || 0; } catch { f.fxp = 0; } }
  try { const br = o.behaviorHealth?.broken; f.brk = br && br.length ? br.map((h) => `${String(h.script || h.file || "").split("/").pop()} ${h.hook || ""}`.trim()).slice(0, 2) : null; } catch { f.brk = null; }
  FACT.set(id, f); return f;
}
// a readable name for what an object IS, so "no draw distance: ? ×131" names the forest scatter instead:
// template export → its own state.name/kind → its id without the counters ("crys-forest-w/scatter") → first tag
function keyOf(o, id, tags) {
  if (o.template) return String(o.template).split("#").pop().slice(0, 28);
  let st = null; try { st = o.state; } catch {}
  const nm = st && (typeof st.name === "string" ? st.name : typeof st.kind === "string" ? st.kind : null);
  if (nm && nm.length <= 28) return nm;
  const seg = String(id || "").split("/").filter((x) => x && !/^\d+$/.test(x) && !/^[0-9a-f]{12,}$/.test(x) && x !== "object").map((x) => x.replace(/[-_]?\d+$/, ""));
  if (seg.length) return seg.slice(-2).join("/").slice(0, 28);
  const t = (tags || []).filter((x) => x !== "player" && !/^den:/.test(x));
  return t[t.length - 1] || tags?.[0] || "?";
}
function scStart(ctx) {
  const me = ctx.self?.feetPosition; let rows = []; try { rows = ctx.query({ radius: 250, select: "ids" }) || []; } catch {}
  if (FACT.size > 6000) FACT.clear();
  return { rows, i: 0, me: me ? { x: me.x, z: me.z } : null, A: ctx.world?.assets || {}, models: {}, tags: {}, total: rows.length, shadows: 0, smallShadows: 0, lights: 0, shLights: 0, lightsNR: 0, fx: 0, noRange: 0, near50: 0, sprites: 0, scripted: 0, particles: 0, dynamic: 0, chars: 0, loops: 0, loopsAll: 0, skinned: 0, broken: 0, veg: [], refs: {}, who: {}, scr: {}, meshCol: 0 };
}
export function sceneStep(ctx, budget = 120) {
  const t = clock();
  if (!SC) { if (scRow && t - scAt < 5000) return scRow; SC = scStart(ctx); }
  const S = SC, end = Math.min(S.rows.length, 3000, S.i + budget * 4), stop = t + 1.5;
  try {
    for (; S.i < end; S.i++) {
      if ((S.i & 7) === 7 && clock() > stop) break;
      const id = S.rows[S.i], f = facts(ctx, typeof id === "string" ? id : id?.id, t); if (!f) continue;
      for (const tg of f.tags) S.tags[tg] = (S.tags[tg] || 0) + 1;
      if (S.me && f.x != null && Math.hypot(f.x - S.me.x, f.z - S.me.z) < 50) S.near50++;
      if (f.light) { S.lights++; if (f.shL) S.shLights++; if (f.nr) S.lightsNR++; }
      const key = f.key || "?";
      note(S, "all", key, f, 1);
      if (f.light) { note(S, "lights", key, f, 1); if (f.shL) note(S, "shLights", key, f, 1); }
      if (f.fx && f.fxp) note(S, "particles", key, f, f.fxp);
      if (f.dyn) note(S, "dynamic", key, f, 1);
      if (f.chr) note(S, "chars", key, f, 1);
      if (f.mesh) { S.meshCol++; note(S, "meshCol", key, f, 1); }
      if (f.aud) note(S, "loops", key, f, 1);
      if (f.brk) note(S, "broken", key, f, 1);
      if (f.ref && S.A[f.ref]?.skinned) note(S, "skinned", key, f, 1);
      if (f.cast) { note(S, "shadows", key, f, 1); if (f.small) note(S, "smallShadows", key, f, 1); }
      if (f.nr) note(S, "noRange", key, f, 1);
      for (const p of f.scr) { const r = S.scr[p] || (S.scr[p] = { path: p, n: 0, ids: [], sx: 0, sz: 0, m: 0, tpl: f.tpl || null, names: [] }); r.n++; if (r.ids.length < 3) r.ids.push(f.id); if (f.x != null) { r.sx += f.x; r.sz += f.z; r.m++; } if (r.names.length < 3 && !r.names.includes(key)) r.names.push(key); }
      if (f.fx) { S.fx++; if (f.fxp) { S.particles += f.fxp; (S.fp ||= {})[key] = (S.fp[key] || 0) + f.fxp; } }
      if (f.dyn) { S.dynamic++; (S.dy ||= {})[key] = (S.dy[key] || 0) + 1; }
      if (f.chr) S.chars++;
      if (f.aud) { S.loops++; if (f.audAll) S.loopsAll++; (S.au ||= {})[key] = (S.au[key] || 0) + 1; }
      if (f.brk) { S.broken++; for (const b of f.brk) (S.bk ||= {})[b] = (S.bk[b] || 0) + 1; }
      if (f.ref && S.A[f.ref]?.skinned) { S.skinned++; (S.skn ||= {})[key] = (S.skn[key] || 0) + 1; }
      if (f.scat) S.veg.push(f.scat);
      if (f.spr) S.sprites++;
      if (f.beh) { S.scripted++; const bk = f.key || "?"; (S.sb ||= {})[bk] = (S.sb[bk] || 0) + 1; }
      if (f.cast) { S.shadows++; if (f.small) S.smallShadows++; }
      if (f.nr) { S.noRange++; const nk = f.key || "?"; (S.nr ||= {})[nk] = (S.nr[nk] || 0) + 1; }
      const ref = f.ref; if (!ref) continue;
      const A = S.A, row = S.models[ref] || (S.models[ref] = [ref, 0, A[ref]?.triangles || 0, A[ref]?.bytes || 0, A[ref]?.skinned ? 1 : 0, A[ref]?.name || f.key || null, 0]); row[1]++; if (f.cast) row[6]++; if (f.nr) row[7] = (row[7] || 0) + 1; S.refs[ref] = A[ref]?.bytes || 0;
    }
  } catch (e) { S.err = String(e?.message || e).slice(0, 120); S.i = S.rows.length; }
  if (S.i < Math.min(S.rows.length, 3000)) return scRow;
  SC = null; scAt = t;
  const list = Object.values(S.models).sort((x, y) => y[2] * y[1] - x[2] * x[1]).slice(0, 40), top = Object.entries(S.tags).sort((x, y) => y[1] - x[1]).slice(0, 16);
  return (scRow = { total: S.total, kinds: Object.keys(S.models).length, models: list, tags: top, err: S.err, shadows: S.shadows, smallShadows: S.smallShadows, lights: S.lights, shLights: S.shLights, lightsNR: S.lightsNR, fx: S.fx, noRange: S.noRange, noRangeTop: Object.entries(S.nr || {}).sort((a, b) => b[1] - a[1]).slice(0, 4), near50: S.near50, sprites: S.sprites, scripted: S.scripted, scriptedTop: Object.entries(S.sb || {}).sort((a, b) => b[1] - a[1]).slice(0, 4),
    particles: Math.round(S.particles), particlesTop: top4(S.fp), dynamic: S.dynamic, dynamicTop: top4(S.dy), chars: S.chars, loops: S.loops, loopsAll: S.loopsAll, loopsTop: top4(S.au), skinned: S.skinned, skinnedTop: top4(S.skn), broken: S.broken, brokenTop: top4(S.bk), vegBeds: S.veg.sort((a, b) => b[1] - a[1]).slice(0, 4), meshCol: S.meshCol, who: whoOut(S), scripts: Object.values(S.scr).sort((a, b) => b.n - a.n).slice(0, 12).map((r) => ({ path: r.path, n: r.n, ids: r.ids, tpl: r.tpl, names: r.names, at: r.m ? [Math.round(r.sx / r.m), Math.round(r.sz / r.m)] : null })), assetMB: +(Object.values(S.refs).reduce((a, b) => a + b, 0) / 1048576).toFixed(1), mode: ctx.place?.mode || "3d" });
}
export const sceneSnap = () => scRow;
export function sceneFresh() { scRow = null; scAt = 0; SC = null; FACT.clear(); } // the next sceneStep starts a new pass: a scan asked for now reads now
// who does it (2.0): per category, the kinds behind the count with their template, scripts, three example ids and where they stand
function note(S, cat, key, f, w) {
  if (String(f.id).startsWith("player/")) return; // a player's own body and what it wears is never the fix's address
  const m = S.who[cat] || (S.who[cat] = {}), r = m[key] || (m[key] = { name: key, n: 0, tpl: f.tpl || null, scr: f.scr, ids: [], sx: 0, sz: 0, m: 0 });
  r.n += w; r.c = (r.c || 0) + 1; if (r.ids.length < 3) r.ids.push(f.id); if (f.x != null) { r.sx += f.x; r.sz += f.z; r.m++; }
}
function whoOut(S) {
  const out = {};
  for (const cat in S.who) out[cat] = Object.values(S.who[cat]).sort((a, b) => b.n - a.n).slice(0, 5).map((r) => ({ name: r.name, n: r.c && r.c !== r.n ? r.c : Math.round(r.n), ...(r.c && r.c !== r.n ? { amt: Math.round(r.n) } : {}), ...(r.tpl ? { tpl: r.tpl } : {}), ...(r.scr?.length ? { scr: r.scr } : {}), ids: r.ids, ...(r.m ? { at: [Math.round(r.sx / r.m), Math.round(r.sz / r.m)] } : {}) }));
  out.models = Object.values(S.models).sort((x, y) => y[2] * y[1] - x[2] * x[1]).slice(0, 5).map((r) => ({ name: r[5] || String(r[0]).split("/").pop().slice(0, 18), n: r[1], model: r[0] }));
  return out;
}
function top4(m) { return Object.entries(m || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => [k, Math.round(n)]); }

export function env(ctx) {
  const v = ctx.view || {}, n = typeof navigator !== "undefined" ? navigator : {};
  const ua = String(n.userAgent || ""), br = (ua.match(/(Edg|OPR|Chrome|Firefox|Version)\/[\d]+/) || ["?"])[0].replace("Version", "Safari"), os = (ua.match(/Windows NT [\d.]+|Mac OS X [\d_]+|Android [\d.]+|iPhone OS [\d_]+|CrOS|Linux/) || ["?"])[0];
  const scr = typeof screen !== "undefined" && screen.width ? `${screen.width}x${screen.height}@${(globalThis.devicePixelRatio || 1).toFixed(2)}` : null;
  return [`${ctx.device?.class ?? "?"}${ctx.device?.coarse ? " touch" : ""}`, `quality ${ctx.quality ?? "auto"}`, v.pixel > 0.1 ? `render scale ×${v.pixel.toFixed(2)}` : null, scr, n.hardwareConcurrency ? n.hardwareConcurrency + " threads" : null, n.deviceMemory ? n.deviceMemory + " GB RAM" : null, br !== "?" ? br : null, os !== "?" ? os : null, `stalls ${stallSource()}`].filter(Boolean).join(" · ");
}
