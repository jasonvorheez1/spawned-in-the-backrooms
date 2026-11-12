// LAGSCOPE panel: the same look as Corrode's F3 inspector (lib/look.js carries its paint). Two ways in:
//   default export: the LAGSCOPE tab on the god-mode rail (Tab, then G): works in every game with the mod installed, nothing to wire
//   overlay(ctx, player): the same panel floating over play, F3 opens it; a game draws it from its ui.js with one line:
//     import { overlay } from "mods/lagscope/panel.js";   …   return `…your hud…${overlay(ctx, player)}`;
// Builders only (player.isEditor): players never see it, their machines only save reports.
// Only what the mod samples is drawn; a field it cannot read says n/a, never a guess.
import { analyze, pacing, memory, reportText } from "./lib/core.js";
import { brief, briefText } from "./lib/brief.js";
import { C, COLS, LOGO, STYLE, esc, DIM, glow, CARD, ROW, bar, TD, TABLE, SEC, BTN, line } from "./lib/look.js";

const JOIN = "https://spawn.co/@yuidev/corrode-beta";
const RANK = { bad: 0, warn: 1, ok: 2 };
const N = 160, SER = { fps: [], cpu: [], gpu: [], draw: [], tri: [], ping: [], ft: [], shad: [] }, FT = [], HEAP = [];
const S = { tab: "scene", x: null, y: null, min: false, details: true, dock: "top", paused: false, adv: false };
let LASTAT = 0, AN = null, ANAT = 0, SESSION = {}, OPENAT = 0, STALLS = [], ROWNOW = null, INPUT = null, CTX = null;

const fin = Number.isFinite, f = (v, d = 0) => (fin(v) ? (+v).toFixed(d) : "–"), na = (v, d = 0, u = "") => (fin(v) ? (+v).toFixed(d) + u : "n/a");
const lastOf = (a) => { for (let i = a.length - 1; i >= 0; i--) if (fin(a[i])) return a[i]; return NaN; };
const push = (k, v) => { const a = SER[k]; a.push(v == null ? NaN : +v); if (a.length > N) a.shift(); };
const send = (a) => { try { sendAction("lagscope:act", a); } catch {} };
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const kTri = (n) => (!fin(n) ? "–" : n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(Math.round(n)));
const LINE = (lab, v, tone) => `<div class="lsl"><span>${lab}</span><b style="color:${tone ? COLS[tone] : C.ink}">${v}</b></div>`;
const mname = (r) => r[5] || String(r[0]).split("/").pop().slice(6, 16);

function ingest(r) {
  if (!r || r.at === LASTAT || S.paused) return; LASTAT = r.at; ROWNOW = r; if (!OPENAT) OPENAT = now();
  push("fps", r.fps); push("cpu", r.cpu); push("gpu", r.gpu); push("draw", r.draw); push("tri", r.tri); push("ping", r.ping); push("shad", r.scene?.shadows);
  const g = (r.ft || []).filter(fin); push("ft", g.length ? g.reduce((a, b) => a + b, 0) / g.length : (r.fps > 0 ? 1000 / r.fps : NaN));
  for (const d of g) FT.push(d); while (FT.length > 3600) FT.shift();
  if (r.heap) { HEAP.push([now(), r.heap[0] / 1048576]); if (HEAP.length > 360) HEAP.shift(); }
  STALLS = (r.stalls || []).filter((s) => s.wall > Date.now() - 60000);
}
const mins = () => Math.max(0.05, (now() - OPENAT) / 60000);
function A() {
  if (AN && (S.paused || now() - ANAT < 500)) return AN; ANAT = now();
  const sc = SESSION.lsRow?.scene || null;
  INPUT = { fps: SER.fps, ft: FT.length > 30 ? FT : null, ftReal: FT.length > 30, worst: [], cpu: SER.cpu, gpu: SER.gpu, draw: SER.draw, tri: SER.tri, heap: HEAP,
    stalls: STALLS.map((s) => ({ t: s.wall, ms: s.ms, kind: s.kind, cause: s.cause })), minutes: mins(), js: 0, top: null, ui: 0, sys: [], sim: null, scene: sc, ping: lastOf(SER.ping), pingSer: SER.ping,
    pixel: ROWNOW?.pixel, quality: ROWNOW?.quality, device: ROWNOW?.device };
  return (AN = analyze(INPUT));
}
const P = () => pacing(FT.length ? FT : SER.fps.filter((x) => x > 0).map((x) => 1000 / x), mins());
const pct = (q) => { const fr = FT.filter((v) => v > 0 && v < 1000).sort((a, b) => a - b); return fr.length ? fr[Math.min(fr.length - 1, Math.floor(fr.length * q))] : NaN; };

// ---- the always-on top: tone word, four readouts, where the lag is, fix next (the F3 terminal) ----
function terminal() {
  const an = A(), L = P(), sc = an.score, tone = an.level || "ok";
  const word = tone === "ok" ? "SMOOTH" : an.verdict.some((v) => /stutter|uneven|slowest 1%|froze/.test(v[2] || v[1])) ? "STUTTER" : "HEAVY";
  const vd = an.verdict.slice().sort((x, y) => RANK[x[0]] - RANK[y[0]]);
  const lines = vd.filter((v) => v[0] !== "ok" || !v[3]).slice(0, 6).map((v) => [v[0], v[2] || v[1]]);
  const fps = lastOf(SER.fps), ping = lastOf(SER.ping), cpu = lastOf(SER.cpu), fx = an.fixes.slice(0, 4);
  const tile = (lab, v, unit, k, col) => `<div class="lst"><div class="lstk">${lab}</div><div class="lse" style="${glow(col)};font-size:24px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums">${v}<span style="font-size:10px;color:${C.dim};font-weight:400"> ${unit}</span></div>${line(SER[k], col)}</div>`;
  const ml = (k) => (k === "ok" ? `<span style="color:${C.dim}">○</span>` : `<span style="color:${COLS[k]}">●</span>`);
  return `<div class="lse" style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px"><span style="${glow(COLS[tone])};font-weight:700;font-size:15px;letter-spacing:.24em">${word}</span><span style="color:${C.dim};font-size:10px;letter-spacing:.14em">HEALTH ${sc ?? "…"} / 100</span></div>
    <div class="lstiles">${tile("FPS", f(fps), "", "fps", fps < 30 ? C.bad : fps < 55 ? C.warn : C.ink)}${tile("1% LOW", f(L.low1), "fps", "ft", L.low1 < 20 ? C.bad : L.low1 < 40 ? C.warn : C.ink)}${tile("PING", f(ping), "ms", "ping", ping > 200 ? C.bad : ping > 90 ? C.warn : C.ink)}${tile("CPU", f(cpu, 1), "ms", "cpu", cpu > 14 ? C.bad : cpu > 8 ? C.warn : C.ink)}</div>
    <div class="lsh">WHERE THE LAG IS</div>${lines.length ? lines.map(([k, t]) => `<div class="lse lsv" style="color:${k === "ok" ? C.sub : COLS[k]}">${ml(k)} ${esc(t)}</div>`).join("") : `<div>${DIM("measuring…")}</div>`}
    <div class="lsh">FIX NEXT</div>${fx.length ? fx.map(([k, t, d], i) => `<div class="lse lsv"><span style="color:${COLS[k]};font-weight:700">${String(i + 1).padStart(2, "0")}</span> ${esc(t)} ${DIM("— " + esc(d))}</div>`).join("") : `<div>${DIM("nothing to fix here")}</div>`}`;
}

// ---- tabs: only the ones the mod has data for ----
function overview() {
  const L = P(), ping = lastOf(SER.ping), del = L.p50 * 2 + (fin(ping) ? ping / 2 : 0), h = HEAP.at(-1)?.[1];
  return ROW(CARD("cpu", na(lastOf(SER.cpu), 1, " ms")) + CARD("gpu", na(lastOf(SER.gpu), 1, " ms")) + CARD("draw calls", na(lastOf(SER.draw))) + CARD("triangles", kTri(lastOf(SER.tri))))
    + SEC("pacing") + LINE("stutter p99", f(L.p99) + " ms", L.p99 > 100 ? "bad" : L.p99 > 34 ? "warn" : null) + LINE("hitches / min", f(L.hitchPerMin), L.hitchPerMin > 8 ? "bad" : L.hitchPerMin > 2 ? "warn" : null)
    + LINE("jitter", "±" + f(L.jitter, 2) + " ms", L.jitter > 3 ? "warn" : null) + LINE("input delay ≈", f(del) + " ms", del > 120 ? "warn" : null) + LINE("heap", fin(h) ? f(h) + " MB" : "hidden by browser");
}
const HB = [[0, 8.4, "< 8.3 ms"], [8.4, 16.8, "8.3–16.7"], [16.8, 33.4, "16.7–33"], [33.4, 50, "33–50"], [50, 100, "50–100"], [100, 1e9, "> 100 ms"]];
function hist() { const n = FT.length || 1; return TABLE(["frame", "count", "", "share"], HB.map(([a, b, lab], i) => { const c = FT.filter((v) => v >= a && v < b).length; return TD([lab, c, bar(c / n, i >= 4 ? C.bad : i >= 3 ? C.warn : C.ink), ((c / n) * 100).toFixed(1) + "%"], ["", "", "w", ""]); }).join(""), ["", "7ch", "14ch", "7ch"], ["", "", "w", ""]); }
function stallTable(all) {
  const L = all ? (ROWNOW?.stalls || []) : STALLS; if (!L.length) return `<div>${DIM("no stalls ♥")}</div>`;
  return TABLE(["time", "ms", "kind", "likely cause"], L.slice(0, all ? 99 : 10).map((s) => TD([new Date(s.wall).toTimeString().slice(0, 8), `<span style="color:${s.ms > 100 ? C.bad : C.warn}">${f(s.ms)}</span>`, esc(s.kind), `<span title="${esc(s.cause)}">${esc(s.cause)}</span>`])).join(""), ["9ch", "5ch", "7ch", ""]).replace(/text-align:right">(<span title)/g, 'text-align:left">$1');
}
function frame() {
  const L = P();
  return ROW(CARD("median frame", na(L.p50, 2, " ms")) + CARD("p90 frame", na(pct(0.9), 2, " ms")) + CARD("p99 frame", na(L.p99, 1, " ms"), "", L.p99 > 100 ? "bad" : L.p99 > 34 ? "warn" : null) + CARD("worst frame", na(FT.length ? Math.max(...FT) : NaN, 1, " ms"))
    + CARD("1% low", na(L.low1, 0, " fps")) + CARD("0.1% low", na(L.low01, 0, " fps")) + CARD("hitches / min", na(L.hitchPerMin, 1)) + CARD("jitter", fin(L.jitter) ? "±" + L.jitter.toFixed(2) + " ms" : "n/a"))
    + SEC("frame times", `${FT.length} real frames`) + hist() + SEC("stall log", "frames over 50 ms, last minute") + stallTable(false);
}
function memoryTab() {
  const h = ROWNOW?.heap, M = memory(HEAP), MB = (b) => (fin(b) ? (b / 1048576).toFixed(0) + " MB" : "n/a");
  if (!h) return `<div style="margin-top:8px">${DIM("this browser hides the JS heap from pages (only Chromium shows it): memory reads n/a here")}</div>`;
  return ROW(CARD("heap used", MB(h[0])) + CARD("heap total", MB(h[1])) + CARD("heap limit", MB(h[2])) + CARD("floor / min", fin(M.floorPerMin) ? M.floorPerMin.toFixed(1) + " MB" : "n/a", "", M.floorPerMin > 6 ? "warn" : null)
    + CARD("churn / min", fin(M.churnPerMin) ? M.churnPerMin.toFixed(0) + " MB" : "n/a", "garbage") + CARD("sweeps", M.sweeps, fin(M.sweepEvery) ? "every " + M.sweepEvery.toFixed(0) + " s" : ""))
    + `<div style="margin-top:6px">${DIM("floor = the heap after each sweep; a floor that climbs is a leak, churn alone is garbage")}</div>`;
}
function scene() {
  const sc = SESSION.lsRow?.scene; if (!sc) return `<div style="margin-top:8px">${DIM("scanning what stands within 250 m…")}</div>`;
  const M = (sc.models || []).map((r) => ({ name: mname(r), n: r[1], one: r[2], tt: r[1] * r[2], sh: r[6], sk: r[4] })).sort((a, b) => b.tt - a.tt);
  const mod = M.reduce((a, r) => a + r.tt, 0), tot = lastOf(SER.tri), rest = fin(tot) ? Math.max(0, tot - mod) : NaN, sk = M.filter((r) => r.sk).reduce((a, r) => a + r.n, 0), sum = mod || 1;
  const nr = (sc.noRangeTop || []).map(([k, n]) => esc(k) + " ×" + n).join(" · ");
  const rows = M.slice(0, 14).map((r) => { const s = r.tt / sum, col = s > 0.35 ? C.bad : s > 0.2 ? C.warn : C.ink;
    return TD([`<span title="${esc(r.name)}">${esc(r.name)}${r.sk ? DIM(" [skinned]") : ""}</span>`, r.n, r.sh || DIM("–"), r.tt.toLocaleString("en-US"), bar(s / (M[0]?.tt / sum || 1), col), `<span style="color:${col}">${(s * 100).toFixed(1)}%</span>`], ["", "", "", "", "w", ""]); }).join("");
  const tags = (sc.tags || []).slice(0, 8).map(([t, n]) => TD([esc(t), n])).join("");
  return ROW(CARD("objects ≤250 m", sc.total ?? 0, `${sc.near50 ?? 0} within 50 m`) + CARD("model kinds", sc.kinds ?? 0) + CARD("model tris", kTri(mod), "all copies at full detail") + CARD("shadow casters", sc.shadows ?? 0, `${sc.smallShadows ?? 0} are small props`, sc.smallShadows > 40 ? "warn" : null)
    + CARD("lights", sc.lights ?? 0, `${sc.shLights ?? 0} cast shadows`, sc.shLights > 4 ? "warn" : null) + CARD("effects", sc.fx ?? 0, "particle emitters", sc.fx > 30 ? "warn" : null) + CARD("no draw distance", sc.noRange ?? 0, nr ? "never culled: " + nr : "never culled by range", sc.noRange > 60 ? "warn" : null) + CARD("skinned", sk, "animated bodies")
    + CARD("on screen tris", kTri(tot), "the engine's count") + CARD("ground + rest", kTri(rest), "terrain, shapes, far models"))
    + SEC("triangles by model", "copies × triangles, heaviest first") + (M.length ? TABLE(["model", "copies", "shadow", "tris total", "", "share"], rows, ["", "7ch", "7ch", "10ch", "13ch", "7ch"], ["", "", "", "", "w", ""]) : `<div>${DIM("no models near")}</div>`)
    + SEC("objects by tag") + (tags ? TABLE(["tag", "count"], tags, ["", "8ch"]) : `<div>${DIM("no tags")}</div>`);
}
function network() {
  const v = SER.ping.filter(fin), m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN, sd = v.length ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) : NaN;
  return ROW(CARD("ping now", na(lastOf(SER.ping), 0, " ms")) + CARD("ping avg", na(m, 0, " ms")) + CARD("ping min", na(v.length ? Math.min(...v) : NaN, 0, " ms")) + CARD("ping max", na(v.length ? Math.max(...v) : NaN, 0, " ms"), "", Math.max(...v) > 400 ? "warn" : null)
    + CARD("jitter", fin(sd) ? "±" + sd.toFixed(0) + " ms" : "n/a", "", sd > 60 ? "warn" : null) + CARD("server tick", "n/a", "the host game's own"));
}
function dev() {
  const n = typeof navigator !== "undefined" ? navigator : {}, r = ROWNOW || {}, ua = String(n.userAgent || "");
  const br = (ua.match(/(Edg|OPR|Chrome|Firefox|Version)\/[\d]+/) || ["n/a"])[0].replace("Version", "Safari"), os = (ua.match(/Windows NT [\d.]+|Mac OS X [\d_]+|Android [\d.]+|iPhone OS [\d_]+|CrOS|Linux/) || ["n/a"])[0];
  return [["class", r.device ? r.device.class + (r.device.coarse ? " · touch" : "") : "n/a"], ["quality", r.quality ?? "n/a"], ["render scale", r.pixel > 0.05 ? "×" + r.pixel.toFixed(2) : "auto"], ["pixel ratio", typeof devicePixelRatio !== "undefined" ? devicePixelRatio.toFixed(2) : "n/a"],
    ["screen", typeof screen !== "undefined" && screen.width ? screen.width + "×" + screen.height : "n/a"], ["window", typeof innerWidth !== "undefined" ? innerWidth + "×" + innerHeight : "n/a"], ["cpu threads", n.hardwareConcurrency ?? "n/a"], ["ram", n.deviceMemory ? n.deviceMemory + " GB" : "n/a"],
    ["browser", br], ["os", os], ["gpu", "n/a"]];
}
function device() { return ROW(dev().map(([k, v]) => CARD(k, esc(v))).join("")); }

// ADVANCED: every raw field the mod samples, dense, in the spirit of the engine's renderer inspector
const GC = { fps: "#7cf0a6", ft: "#ffd166", cpu: "#6cc6ff", gpu: "#c792ea", draw: "#ff9f68", tri: "#f78fb3", shad: "#a3e635", ping: "#5eead4" };
function mini(lab, k, d = 0, u = "") {
  const v = (SER[k] || []).filter(fin), col = GC[k] || C.sub, lo = v.length ? Math.min(...v) : NaN, hi = v.length ? Math.max(...v) : NaN, fmt = (x) => (k === "tri" ? kTri(x) : na(x, d));
  return `<div class="lsmg"><div class="lse"><span style="color:${col}">${lab}</span> <b>${k ? fmt(lastOf(SER[k] || [])) : "n/a"}</b>${u && v.length ? DIM(u) : ""}</div><div class="lse" style="color:${C.dim};font-size:9px">${v.length ? `(${fmt(lo)}-${fmt(hi)})` : "(n/a)"}</div>${k ? line(SER[k], col, 120, 22) : `<svg width="100%" height="22"></svg>`}</div>`;
}
const KV = (pairs) => `<div class="lskv">${pairs.map(([k, v]) => `<div class="lse"><span style="color:${C.dim}">${k}</span> ${v}</div>`).join("")}</div>`;
function advanced() {
  const r = ROWNOW || {}, sc = SESSION.lsRow?.scene || {}, L = P(), h = r.heap, MB = (b) => (fin(b) ? (b / 1048576).toFixed(1) + " MB" : "n/a");
  const pv = SER.ping.filter(fin), pm = pv.length ? pv.reduce((a, b) => a + b, 0) / pv.length : NaN, psd = pv.length ? Math.sqrt(pv.reduce((a, b) => a + (b - pm) ** 2, 0) / pv.length) : NaN;
  const byScript = {}; for (const s of r.stalls || []) if (s.kind === "script") { const k = String(s.cause).split(" ").slice(1, 3).join(" "); (byScript[k] ||= [0, 0]); byScript[k][0]++; byScript[k][1] += s.ms; }
  const M = (sc.models || []).slice().sort((a, b) => b[1] * b[2] - a[1] * a[2]), msum = M.reduce((a, m) => a + m[1] * m[2], 0) || 1;
  return `<div class="lsmgs">${mini("FPS", "fps")}${mini("FRAME", "ft", 1, " ms")}${mini("CPU", "cpu", 1, " ms")}${mini("GPU", "gpu", 1, " ms")}${mini("DRAWS", "draw")}${mini("TRIS", "tri")}${mini("SHADOW", "shad")}${mini("SERVER", null)}${mini("PING", "ping", 0, " ms")}</div>
    ${SEC("renderer", "ctx.view, every 250 ms")}${KV([["draw calls", na(r.draw)], ["triangles", fin(r.tri) ? r.tri.toLocaleString("en-US") : "n/a"], ["cpu ms", na(r.cpu, 2)], ["gpu ms", na(r.gpu, 2)], ["fps (engine)", na(r.fps, 1)], ["render scale", r.pixel > 0.05 ? r.pixel.toFixed(2) : "auto"], ["programs", "n/a"], ["geometries", "n/a"], ["textures", "n/a"], ["lights (scene)", sc.lights ?? "n/a"], ["shadowed lights", sc.shLights ?? "n/a"], ["shadow maps", "n/a"]])}
    ${SEC("frame time", `${FT.length} frames · last row ${r.frames ?? "n/a"} frames in ${r.span ?? "n/a"} ms, worst gap ${na(r.worst, 1)} ms`)}${KV([["p50", na(L.p50, 2, " ms")], ["p90", na(pct(0.9), 2, " ms")], ["p99", na(L.p99, 2, " ms")], ["max", na(FT.length ? Math.max(...FT) : NaN, 1, " ms")], ["1% low", na(L.low1, 1, " fps")], ["0.1% low", na(L.low01, 1, " fps")], ["hitches", L.hitches ?? "n/a"], ["jitter", na(L.jitter, 2, " ms")]])}${hist()}
    ${SEC("scripts", "stalls named by script; the game thread above says if scripts run late")}${Object.keys(byScript).length ? TABLE(["script", "stalls", "ms total"], Object.entries(byScript).sort((a, b) => b[1][1] - a[1][1]).map(([k, [n, ms]]) => TD([esc(k), n, ms.toFixed(0)])).join(""), ["", "7ch", "9ch"]) : `<div>${DIM("no script named in a stall")}</div>`}
    ${SEC("stalls", `every one kept (${(r.stalls || []).length}) · long tasks last row ${r.long ? r.long[0] + " / " + r.long[1] + " ms" : "n/a"}`)}${stallTable(true)}
    ${SEC("heap", h ? "" : "this browser keeps it private (only chrome exposes it to pages)")}${h ? KV([["used", MB(h?.[0])], ["total", MB(h?.[1])], ["limit", MB(h?.[2])], ["samples", HEAP.length]]) : ""}
    ${SEC("game thread", "a 50 ms heartbeat in the game worker: scripts, physics, sweeps")}${(() => { const t = r.thread; return t ? KV([["late a beat", na(t.avg, 1, " ms")], ["p99 late", na(t.p99, 0, " ms")], ["worst", na(t.max + 50, 0, " ms")], ["busy", Math.round(t.busy * 100) + "%"], ["freezes", t.freezes], ["beats", t.beats]]) : `<div>${DIM("warming up…")}</div>`; })()}
    ${SEC("load nearby", "what each kind of work costs, with who does it")}${KV([["particles", sc.particles ?? "n/a"], ["dynamic bodies", sc.dynamic ?? "n/a"], ["characters", sc.chars ?? "n/a"], ["skinned", sc.skinned ?? "n/a"], ["looping sounds", sc.loops ?? "n/a"], ["broken scripts", sc.broken ?? "n/a"], ["place objects", r.entN ?? "n/a"], ["growth", r.ents ? (r.ents.perMin >= 0 ? "+" : "") + Math.round(r.ents.perMin) + "/min" : "n/a"]])}
    ${[["particles", sc.particlesTop], ["dynamic", sc.dynamicTop], ["skinned", sc.skinnedTop], ["loops", sc.loopsTop], ["broken", sc.brokenTop]].filter(([, a]) => a?.length).map(([k, a]) => `<div class="lsw" style="color:${C.dim}">${k}: ${a.map(([n, c]) => esc(n) + " ×" + c).join(" · ")}</div>`).join("")}
    ${SEC("network", "ping is the trip to the room; it never lowers fps, it delays what you see")}${KV([["ping", na(r.ping, 0, " ms")], ["avg", na(pm, 0, " ms")], ["min", na(pv.length ? Math.min(...pv) : NaN, 0, " ms")], ["max", na(pv.length ? Math.max(...pv) : NaN, 0, " ms")], ["jitter", na(psd, 1, " ms")], ["feel", fin(pm) ? (pm < 80 ? "snappy" : pm < 160 ? "fine" : pm < 260 ? "laggy hits" : "very laggy") : "n/a"]])}
    ${SEC("device")}${KV(dev().map(([k, v]) => [k, esc(v)]))}
    ${SEC("scene snapshot", sc.err ? "error: " + esc(sc.err) : "within 250 m, every 5 s")}${KV([["objects", sc.total ?? "n/a"], ["≤50 m", sc.near50 ?? "n/a"], ["model kinds", sc.kinds ?? "n/a"], ["shadow casters", sc.shadows ?? "n/a"], ["small casters", sc.smallShadows ?? "n/a"], ["lights", sc.lights ?? "n/a"], ["lights no range", sc.lightsNR ?? "n/a"], ["effects", sc.fx ?? "n/a"], ["sprites", sc.sprites ?? "n/a"], ["scripted", sc.scripted ?? "n/a"], ["no draw dist", sc.noRange ?? "n/a"], ["mode", esc(sc.mode ?? "n/a")]])}
    ${(sc.scriptedTop || []).length ? `<div class="lsw" style="color:${C.dim}">scripted: ${sc.scriptedTop.map(([k, n]) => esc(k) + " ×" + n).join(" · ")}</div>` : ""}${(sc.noRangeTop || []).length ? `<div class="lsw" style="color:${C.dim}">no draw distance: ${sc.noRangeTop.map(([k, n]) => esc(k) + " ×" + n).join(" · ")}</div>` : ""}
    ${SEC("by model", `${M.length} kinds, all sampled`)}${M.length ? TABLE(["model", "×", "each", "total", "shadow", "%"], M.map((m) => TD([`<span title="${esc(m[0])}">${esc(mname(m))}${m[4] ? DIM(" [sk]") : ""}</span>`, m[1], kTri(m[2]), kTri(m[1] * m[2]), m[6] || "–", ((m[1] * m[2]) / msum * 100).toFixed(1)])).join(""), ["", "4ch", "7ch", "7ch", "6ch", "5ch"]) : `<div>${DIM("n/a")}</div>`}
    ${SEC("by tag", `${(sc.tags || []).length} tags`)}${(sc.tags || []).length ? TABLE(["tag", "count"], sc.tags.map(([t, n]) => TD([esc(t), n])).join(""), ["", "8ch"]) : `<div>${DIM("n/a")}</div>`}`;
}

function reports() {
  const R = SESSION.lsReports, one = SESSION.lsReport, d = R?.day || {}, lv = R?.level || null;
  if (!R && !S.asked) { S.asked = 1; send({ op: "list" }); }
  const LV = { bad: ["RED", C.bad], warn: ["YELLOW", C.warn], manual: ["SENT", C.ink], ok: ["SMOOTH AGAIN", C.sub] };
  const ago = (t) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + "m" : m < 1440 ? Math.round(m / 60) + "h" : Math.round(m / 1440) + "d"; };
  const card = (r) => { const [lab, col] = LV[r.lv] || ["?", C.sub];
    return `<div class="lscard"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-width:0"><b style="color:${col};font-size:10px;letter-spacing:.14em">● ${lab}</b><b class="lse">${esc(r.name)}</b><span class="lse" style="color:${C.dim}">${r.fps != null ? r.fps + " fps · " : ""}${esc(r.place)} · ${ago(r.at)} · #${r.id}</span><span style="flex:1"></span>${r.savi ? `<span class="lstag">savi ✓ ${ago(r.savi)}</span>` : `<span class="lstag new">new</span>`}${r.posted ? `<span class="lstag">discord ✓</span>` : ""}${BTN("full", { op: "one", id: r.id })}</div>
      ${(r.why || []).map((w, i) => `<div class="lsw" style="color:${C.sub}">${i + 1}. ${esc(w)}</div>`).join("")}${(r.fix || []).map((w) => `<div class="lsw" style="color:${C.dim}">› ${esc(w)}</div>`).join("")}</div>`; };
  const fil = (lab, v) => BTN(lab, { op: "list", level: v }, lv === v);
  return `<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-top:8px">${fil("all", null)}${fil("new", "new")}${fil("red", "bad")}${fil("yellow", "warn")}<span style="flex:1"></span>${BTN("refresh", { op: "list", level: lv })}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px"><span style="color:${C.dim}">24 h: <b style="color:${C.bad}">${d.bad || 0}</b> red · <b style="color:${C.warn}">${d.warn || 0}</b> yellow · <b>${R?.unsent ?? 0}</b> not sent</span><span style="flex:1"></span>${BTN("send all to savi ✦", { op: "savi", level: lv === "new" ? null : lv }, false, true)}${BTN(S.wipe && Date.now() - S.wipe < 4000 ? "sure? press again" : "clear all", { ui: "wipe" })}</div>
    <div style="color:${C.dim};margin-top:4px">sent reports clear themselves after ${SESSION.lsCfg?.keepSentH ?? 24} h, every report after ${SESSION.lsCfg?.keepDays ?? 7} days</div>
    ${one ? `<div style="margin-top:6px"><div style="display:flex;color:${C.dim}">report #${one.id} · click, ctrl+a, ctrl+c<span style="flex:1"></span>${BTN("close", { ui: "close1" })}</div><textarea readonly onfocus="this.select()" class="lsin" style="width:100%;height:130px;font-size:11px">${esc(one.text)}</textarea></div>` : ""}
    ${!R ? `<div style="color:${C.dim};margin-top:8px">loading…</div>` : R.rows.length ? R.rows.map(card).join("") : `<div style="color:${C.dim};margin-top:8px">no reports. nobody's lagging ♥</div>`}`;
}
function settings() {
  const c = SESSION.lsCfg || {}; if (!c.at && !S.got) { S.got = 1; send({ op: "get" }); }
  if (!S.dirty || !S.cfg) S.cfg = { discord: !!c.discord, auto: c.auto ?? true, yellow: c.yellow ?? true, red: c.red ?? 30, warn: c.warn ?? 50, cap: c.cap ?? 40, keepSentH: c.keepSentH ?? 24, keepDays: c.keepDays ?? 7 };
  const d = S.cfg;
  const tog = (k, lab, note) => `<div class="lsrow"><span>${lab}<br><span style="color:${C.dim}">${note}</span></span><button class="lssw${d[k] ? " on" : ""}" onclick='lsPanel({ui:"tog",k:"${k}"})'><i></i></button></div>`;
  const stp = (k, lab, note, st) => `<div class="lsrow"><span>${lab}<br><span style="color:${C.dim}">${note}</span></span><span class="lsstep"><button onclick='lsPanel({ui:"step",k:"${k}",d:-${st}})'>−</button><b>${d[k]}</b><button onclick='lsPanel({ui:"step",k:"${k}",d:${st}})'>+</button></span></div>`;
  return `${SEC("discord", "reports always save in this game's database")}${tog("discord", d.discord ? "posting to discord: on" : "posting to discord: off", d.discord ? "new reports also post to your channel" : "reports stay here only, nothing goes to discord")}
    <div style="display:flex;gap:6px;margin-top:6px;min-width:0"><input class="lsin" type="password" autocomplete="off" spellcheck="false" style="flex:1;min-width:0" placeholder="${c.tail ? "saved ••••" + esc(c.tail) : "discord webhook link"}" oninput="globalThis.__lsHook=this.value">${BTN("save", { ui: "hook" }, false, true)}${BTN("test", { op: "test" })}${c.tail ? BTN("clear", { op: "clear" }) : ""}</div>
    <div style="color:${C.dim};margin-top:3px">only builders' machines ever read the webhook; players never see it</div>
    ${SEC("auto reports")}${tog("auto", "players report on their own", "a machine saves one report when it turns red")}${tog("yellow", "yellow too", "off = only red")}
    ${SEC("lines")}${stp("red", "red under fps", "average fps that counts as red", 5)}${stp("warn", "yellow under fps", "average fps that counts as yellow", 5)}${stp("cap", "discord posts / hour", "red first", 5)}
    ${SEC("cleanup")}${stp("keepSentH", "clear sent reports after", "hours after send all to savi", 6)}${stp("keepDays", "clear every report after", "days", 1)}
    <div style="margin-top:10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">${BTN(S.dirty ? "save settings •" : "save settings", { ui: "save" }, false, true)}<span style="color:${C.dim}">saves for every builder</span></div>`;
}
const TABS = [["overview", overview], ["frame", frame], ["memory", memoryTab], ["scene", scene], ["network", network], ["device", device], ["reports", reports], ["settings", settings], ["advanced", advanced]];
const tabs = () => TABS.filter(([t]) => t !== "advanced" || S.adv);

function copyText(t) {
  try { if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(t).catch(() => { S.copyFail = t; }); return true; } } catch {}
  try { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); if (!ok) S.copyFail = t; return ok; } catch { S.copyFail = t; return false; }
}
globalThis.lsPanel = (a) => {
  if (!a.ui) {
    if (a.op === "fixall") S.fixAt = Date.now();
    if (a.op === "list") S.asked = 1; if (a.op === "report") S.sentAt = Date.now(); if (a.op === "savi" && a.hdr) S.saviAt = Date.now();
    return send(a.hdr ? { op: a.op, level: a.level ?? null } : a);
  }
  const u = a.ui;
  if (u === "tab") { if (S.tab === a.t && S.details && a.hdr) S.details = false; else { S.tab = a.t; S.details = true; S.min = false; } if (a.t === "reports") send({ op: "list" }); if (a.t === "settings") send({ op: "get" }); }
  else if (u === "details") S.details = !S.details;
  else if (u === "pause") S.paused = !S.paused;
  else if (u === "min") S.min = !S.min;
  else if (u === "dock") { S.dock = S.dock === "top" ? "bottom" : "top"; S.x = S.y = null; try { localStorage.removeItem("lagscope.pos"); } catch {} }
  else if (u === "adv") { S.adv = !S.adv; try { localStorage.setItem("lagscope.adv", S.adv ? "1" : "0"); } catch {} if (S.adv) { S.tab = "advanced"; S.details = true; S.min = false; } else if (S.tab === "advanced") S.tab = "scene"; }
  else if (u === "copy") { const an = A(); S.copyFail = null; copyText(briefText(brief(INPUT, an)) + "\n---- raw reading ----\n" + reportText(INPUT, an, { place: CTX?.place?.id, server: CTX?.world?.mode, who: "panel", trigger: "copied from the panel" })); S.copiedAt = Date.now(); }
  else if (u === "copyclose") S.copyFail = null;
  else if (u === "tog") { S.cfg[a.k] = !S.cfg[a.k]; if (a.k === "discord") { send({ op: "cfg", cfg: S.cfg }); S.dirty = false; } else S.dirty = true; }
  else if (u === "step") { S.cfg[a.k] = (+S.cfg[a.k] || 0) + a.d; S.dirty = true; }
  else if (u === "save") { send({ op: "cfg", cfg: S.cfg }); S.dirty = false; }
  else if (u === "hook") { send({ op: "save", url: globalThis.__lsHook || "" }); globalThis.__lsHook = ""; }
  else if (u === "wipe") { if (S.wipe && Date.now() - S.wipe < 4000) { S.wipe = 0; send({ op: "wipe" }); } else S.wipe = Date.now(); }
  else if (u === "close1") { SESSION.lsReport = null; send({ op: "one", id: 0 }); }
  else if (u === "home") { S.x = S.y = null; try { localStorage.removeItem("lagscope.pos"); } catch {} }
  else if (u === "close") send({ op: "open", on: false });
  else if (u === "join") { copyText(JOIN); S.joined = Date.now(); }
};
globalThis.lsDrag = (e) => {
  const el = document.getElementById("ls-float"); if (!el || e.button > 0 || e.target?.closest?.("button,input,textarea")) return;
  const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; e.preventDefault();
  const mv = (ev) => { S.x = Math.round(Math.max(0, Math.min(innerWidth - 120, ev.clientX - ox))); S.y = Math.round(Math.max(0, Math.min(innerHeight - 40, ev.clientY - oy))); el.style.left = S.x + "px"; el.style.top = S.y + "px"; el.style.right = "auto"; el.style.bottom = "auto"; };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); try { localStorage.setItem("lagscope.pos", JSON.stringify([S.x, S.y])); } catch {} };
  addEventListener("pointermove", mv); addEventListener("pointerup", up);
};
try { const p = JSON.parse(localStorage.getItem("lagscope.pos") || "null"); if (Array.isArray(p)) { S.x = p[0]; S.y = p[1]; } S.adv = localStorage.getItem("lagscope.adv") === "1"; if (S.adv) S.tab = "advanced"; } catch {}

function head(ctx, an, floating) {
  const tone = an.level || "ok", sc = an.score ?? 0, R = 15, CI = 2 * Math.PI * R, rec = (t) => t && Date.now() - t < 3000;
  const T = (lab, t) => BTN(lab, { ui: "tab", t, hdr: 1 }, S.details && S.tab === t);
  const sub = `${esc(String(ctx.place?.id || ""))} · ${esc(String(ctx.world?.state?.server?.profile ?? ctx.world?.mode ?? ""))}${S.paused ? " · paused" : ""}`;
  return `<div class="lshd" ${floating ? `onpointerdown="lsDrag(event)" ondblclick='lsPanel({ui:"home"})' title="drag to move · double-click to snap back"` : ""}>
    <img src="${LOGO}" style="width:26px;height:26px;flex:none;filter:drop-shadow(0 0 6px rgba(255,255,255,.45))">
    <div style="line-height:1.1;min-width:0;flex:1 1 0"><div style="font-weight:700;letter-spacing:.32em;font-size:13px">LAGSCOPE</div><div class="lse" style="color:${C.dim};font-size:9px;letter-spacing:.2em;text-transform:uppercase">${sub} <span style="display:inline-block;width:5px;height:5px;border-radius:3px;background:${COLS[tone]};animation:lsblink 1.2s infinite;vertical-align:middle"></span></div></div>
    <svg width="38" height="38" viewBox="0 0 38 38" style="flex:none"><circle cx="19" cy="19" r="${R}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"/><circle cx="19" cy="19" r="${R}" fill="none" stroke="${COLS[tone]}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(CI * sc / 100).toFixed(1)} ${CI.toFixed(1)}" transform="rotate(-90 19 19)"/><text x="19" y="23" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="LSMono,monospace">${an.score ?? "…"}</text></svg>
    <div class="lsbtns">${BTN(S.paused ? "resume" : "pause", { ui: "pause" }, S.paused)}${BTN(rec(S.copiedAt) ? (S.copyFail ? "copy ✗" : "copied ✓") : "copy", { ui: "copy" }, rec(S.copiedAt))}${BTN(rec(S.sentAt) ? "sent ✓" : SESSION.lsCfg?.discord === false ? "save report" : "discord", { op: "report" }, rec(S.sentAt))}${T("reports", "reports")}${T("⚙", "settings")}${BTN("advanced", { ui: "adv" }, S.adv)}${floating ? BTN(S.dock === "top" ? "↓" : "↑", { ui: "dock" }) : ""}${BTN(S.min ? "+" : "–", { ui: "min" })}${floating ? BTN("✕", { ui: "close" }) : ""}</div></div>`;
}
const STYLE2 = `.lsl{display:flex;justify-content:space-between;gap:10px;padding:2px 0;border-bottom:1px solid ${C.line};min-width:0}.lsl>span{color:${C.sub};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lsl>b{white-space:nowrap}
.lsw{white-space:normal;overflow-wrap:anywhere}
.lsfix{display:block;width:calc(100% - 28px);margin:4px 14px 6px;min-height:42px;padding:10px 12px;border:0;border-radius:8px;background:#fff;color:#0a0a0c;font:700 13px LSMono,monospace;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 0 18px rgba(255,255,255,.28);pointer-events:auto}.lsfix:hover{box-shadow:0 0 26px rgba(255,255,255,.5)}.lsfix.on{background:#9ae6b4}
.lsmgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px;margin-top:8px}.lsp.nar .lsmgs{grid-template-columns:1fr 1fr 1fr}.lsmg{min-width:0;background:rgba(0,0,0,.25);border:1px solid ${C.line};border-radius:6px;padding:3px 6px;font-size:10px;line-height:1.3}
.lskv{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));column-gap:2ch;font-size:11px}
.lsp table{width:100%;table-layout:fixed}.lsp td,.lsp th{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lsp td:first-child,.lsp th:first-child{width:auto}
.lsbtns{display:flex;flex-wrap:wrap;gap:3px;justify-content:flex-end;min-width:0}.lshd{flex-wrap:wrap;row-gap:6px}.lstabs{display:flex;flex-wrap:wrap;gap:3px}
.lsscroll{overflow:auto;scrollbar-width:none;min-height:0}.lsscroll::-webkit-scrollbar{display:none}
@container lsp (max-width:440px){.lstiles{grid-template-columns:1fr 1fr}.lsv{white-space:normal!important;overflow-wrap:anywhere;padding:1px 0}[class="lst"] .lse{font-size:19px!important}.lskv{grid-template-columns:1fr}.lsmgs{grid-template-columns:1fr 1fr 1fr}.lsp td:nth-child(5),.lsp th:nth-child(5){display:none}.lsbtns{justify-content:flex-start;width:100%}}
.lsp{container:lsp/inline-size;min-width:0;max-width:100%}
@media (max-width:700px),(max-height:520px){#ls-float{left:8px!important;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 8px)!important;top:auto!important;bottom:8px!important;width:auto!important;max-height:62vh!important}}`;

function panel(ctx, player, floating) {
  SESSION = ctx.session || {}; CTX = ctx; ingest(SESSION.lsRow);
  const an = A(), m = SESSION.lsMsg, msg = m && Date.now() - m.at < 8000 ? `<div class="lse" style="padding:4px 14px;color:${/fail|error|couldn|not /.test(m.msg) ? C.bad : C.ink}">› ${esc(m.msg)}</div>` : "";
  const T = tabs(); if (!T.some(([t]) => t === S.tab)) S.tab = "scene";
  const tabRow = T.map(([t]) => `<button class="lstab${S.tab === t ? " on" : ""}" onclick='lsPanel({ui:"tab",t:"${t}"})'>${t}</button>`).join("");
  const copyBox = S.copyFail ? `<div style="padding:6px 14px"><div style="color:${C.warn}">the browser blocked the copy: click the box, ctrl+a, ctrl+c ${BTN("hide", { ui: "copyclose" })}</div><textarea readonly onfocus="this.select()" class="lsin" style="width:100%;height:110px;font-size:11px">${esc(S.copyFail)}</textarea></div>` : "";
  const mid = S.min ? "" : `<div class="lsscroll"><div class="lstop">${terminal()}<div class="lstabs">${BTN(S.details ? "hide details" : "details", { ui: "details" }, S.details)}<span style="width:6px"></span>${S.details ? tabRow : DIM(floating ? "F3 close" : "")}</div></div>${S.details ? `<div class="lsbody">${T.find(([t]) => t === S.tab)[1]()}</div>` : ""}</div>`;
  const foot = `<div class="lsft"><span>made by <b style="color:#fff">yui</b> ♥</span><span style="flex:1"></span><button class="lsb solid" style="font-size:10px;text-transform:none;letter-spacing:.04em" onclick='lsPanel({ui:"join"})'>${S.joined && Date.now() - S.joined < 3000 ? "link copied ♥" : "join my game · play corrode ▸"}</button></div>`;
  const fixing = S.fixAt && Date.now() - S.fixAt < 6000, big = `<button class="lsfix${fixing ? " on" : ""}" onclick='lsPanel({op:"fixall"})'>${fixing ? "sent ✓ savi is on it" : "send to savi to fix all lag"}</button>`;
  return `<style>${STYLE}${STYLE2}</style><div class="lsp${floating ? "" : " nar"}" style="${floating ? "max-height:100%" : ""}">${head(ctx, an, floating)}${big}${msg}${copyBox}${mid}${foot}</div>`;
}
// the god-mode rail tab: a 320 px column
export default function render(ctx, player) {
  if (!ctx || !player?.isEditor) return `<div style="padding:12px;color:#999;font:12px monospace">LAGSCOPE · builders only</div>`;
  if (!ctx.session?.lsOpen && !S.opened) { S.opened = 1; send({ op: "open", on: true }); }
  return panel(ctx, player, false);
}
export function onMount() { S.opened = 0; send({ op: "open", on: true }); }
export function onDestroy() { S.opened = 0; send({ op: "open", on: false }); }
// the floating overlay for a game's ui.js: F3 opens it
export function overlay(ctx, player) {
  if (!player?.isEditor || !ctx?.session?.lsOpen) return "";
  const pos = S.x != null ? `left:${S.x}px;top:${S.y}px` : `right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 20px);${S.dock === "top" ? "top:56px" : "bottom:24px"}`;
  return `<div id="ls-float" style="position:fixed;${pos};width:clamp(300px,30vw,560px);max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset, 50px) - 32px);max-height:calc(100vh - 80px);display:flex;flex-direction:column;z-index:2147483100;pointer-events:auto">${panel(ctx, player, true)}</div>`;
}
