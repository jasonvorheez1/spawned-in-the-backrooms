// Spawn 3D Modeling Studio on a player's screen, no god mode needed: a 🎨 3D studio button bottom-left (or M) opens
// the same panel the god-mode Studio tab draws. Wire it into the world's ui.js: import * as modelingStudio from
// "../mods/modeling-studio/hud.js", re-export its window hooks (export { m3dDraft, m3dPose, m3dPick, m3dPreview, m3dUpload,
// m3dAsk, m3dClearRefs, m3dGuide } from "../mods/modeling-studio/hud.js"), and append modelingStudio.render(ctx, player).
import * as panel from "lib/panel.js";
export { m3dPvDown, m3dPvWheel, m3dPvReset, m3dPvTool, m3dPvDraft, m3dPvEdit, m3dPvClear, m3dTkMeasure, m3dTkDown, m3dTkWheel, m3dTkReset, m3dMpvMove, m3dMpvSize };
export { m3dDraft, m3dPose, m3dPick, m3dPreview, m3dUpload, m3dAsk, m3dClearRefs, m3dGuide, m3dJobs } from "lib/panel.js";
const ST = `<style>
#msx .btn{position:fixed;left:24px;bottom:150px;pointer-events:auto;font:600 13px "Fredoka",sans-serif;cursor:pointer;border:0;border-radius:10px;padding:8px 12px;color:#3a1d04;background:linear-gradient(#ffe08a,#ffb347 55%,#e0812a);box-shadow:inset 0 1px 0 #fff8,0 0 0 2px #8a4b12,0 3px 0 #5a2e08}
@media (max-width:640px),(pointer:coarse){#msx .btn{display:none}}
#msx .btn kbd{font:700 11px monospace;margin-left:6px;padding:1px 5px;border-radius:4px;background:#3a1d0422}
#msx .pan{position:fixed;left:16px;top:50%;transform:translateY(-50%);width:min(400px,calc(100vw - 2 * (var(--spawn-chrome-reservation-right-inset,50px) + 16px)));max-height:88vh;overflow:auto;pointer-events:auto;border-radius:16px}
#msx .x{position:sticky;top:0;float:right;z-index:3;margin:6px 6px -40px 0;font:700 16px sans-serif;cursor:pointer;border:0;border-radius:50%;width:32px;height:32px;color:#fff3dc;background:#2a170ccc;box-shadow:0 0 0 2px #e0b45a}
</style>`;
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const PV = `<style>
#mpv{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1100px,62vw);pointer-events:auto;font:500 13px "Fredoka",sans-serif;color:#fff3dc}
#mpv .fr{border-radius:16px;padding:0;box-shadow:0 0 0 2px #e0b45a,0 0 0 4px #4a2a14,0 10px 30px #000c}
#mpv .pl{padding:10px;background:linear-gradient(#3a2212f2,#24140af2),url(/cdn/value.cf03aed3135e757557824f0694f7f545c56153192186fe53570b67a28c0b1777.png) center/200px}
#mpv .top{border-radius:16px 16px 0 0}#mpv .bot{border-radius:0 0 16px 16px}
#mpv .bar{display:flex;align-items:center;gap:8px;cursor:move;touch-action:none}
#mpv .rz{position:absolute;right:-6px;bottom:-6px;width:22px;height:22px;cursor:nwse-resize;touch-action:none;border-radius:4px;background:linear-gradient(135deg,transparent 45%,#e0b45a 45%,#e0b45a 55%,transparent 55%,transparent 65%,#e0b45a 65%,#e0b45a 75%,transparent 75%);z-index:5}
#mpv .ti{font:700 12px "Fredoka",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#e0b45a;text-shadow:0 1px 0 #000}
#mpv .nm{font-weight:700;font-size:20px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mpv .tag{font-size:10px;font-weight:700;padding:1px 6px;border-radius:5px;color:#062a2e;background:linear-gradient(#b8ffff,#3fe0e8)}
#mpv .win.orb{pointer-events:auto;cursor:grab;touch-action:none}#mpv .win.orb:active{cursor:grabbing}
#mpv .hint{position:absolute;left:12px;bottom:10px;font-size:11px;color:#c9ffff;text-shadow:0 1px 2px #000;pointer-events:none}
#mpv .win{position:relative;margin:0 10px;outline:10px solid #2c190cf0;height:min(660px,56vh);border-radius:10px;box-shadow:inset 0 0 0 2px #3fe0e8aa,0 0 16px #3fe0e855;background:radial-gradient(60% 55% at 50% 60%,#3fe0e818,#00000030);overflow:hidden;pointer-events:none}
#mpv .win img{width:100%;height:100%;object-fit:contain;background:#14100cee}
#mpv .win .cn{position:absolute;width:16px;height:16px;border:2px solid #e0b45a}
#mpv .win img.ref{position:absolute;right:10px;bottom:10px;width:110px;height:110px;object-fit:cover!important;border-radius:8px;box-shadow:0 0 0 2px #e0b45a;background:#f6e2b5!important}
#mpv .mt{font-size:12px;color:#e8d3b0;max-height:54px;overflow:auto}
#mpv button{font:600 13px "Fredoka",sans-serif;cursor:pointer;border:0;border-radius:8px;padding:6px 11px;color:#fff3dc;background:linear-gradient(#6b4122,#3e2311);box-shadow:inset 0 1px 0 #ffffff30,0 0 0 1.5px #a8752e,0 2px 0 #0009}
#mpv button.go{color:#3a1d04;background:linear-gradient(#ffe08a,#ffb347 55%,#e0812a);box-shadow:0 0 0 2px #8a4b12}
#mpv .row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
#mpv .win.sel{cursor:crosshair}#mpv .win.sel:active{cursor:crosshair}
#mpv .box{position:absolute;border:2px dashed #3fe0e8;background:#3fe0e822;box-shadow:0 0 0 9999px #00000040,0 0 12px #3fe0e8aa;border-radius:4px;pointer-events:none}
#mpv .box b{position:absolute;left:0;top:-20px;font:700 10px "Fredoka",sans-serif;letter-spacing:.1em;color:#062a2e;background:linear-gradient(#b8ffff,#3fe0e8);padding:1px 6px;border-radius:4px;white-space:nowrap}
#mpv .poly{position:absolute;inset:0;pointer-events:none}#mpv .poly svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 6px #3fe0e8aa)}
#mpv .poly b{position:absolute;font:700 10px "Fredoka",sans-serif;letter-spacing:.1em;color:#062a2e;background:linear-gradient(#b8ffff,#3fe0e8);padding:1px 6px;border-radius:4px;white-space:nowrap}
#mpv .tools{position:absolute;left:10px;top:10px;display:flex;border-radius:9px;box-shadow:0 0 0 2px #a8752e;overflow:hidden}
#mpv .tools button{border-radius:0;box-shadow:none;padding:5px 10px;font-size:12px;border-right:1px solid #0006}#mpv .tools button:last-child{border-right:0}
#mpv .tools button.on{color:#062a2e;text-shadow:none;background:linear-gradient(#b8ffff,#3fe0e8)}
#mpv .ed{display:flex;gap:8px;align-items:stretch;margin-top:8px;padding:8px;border-radius:10px;background:#1a0f08cc;box-shadow:inset 0 0 0 1.5px #a8752e}
#mpv .ed input{flex:1;min-width:0;background:#fffaf0;color:#3a1d04;border:2px solid #b98a4e;border-radius:8px;padding:8px 10px;font:500 14px "Fredoka",sans-serif}
#mpv .ed input:focus{outline:none;border-color:#3fe0e8;box-shadow:0 0 0 3px #3fe0e855}
#mpv .ed .go2{color:#062a2e;text-shadow:0 1px 0 #c8ffff;background:linear-gradient(#b8ffff,#3fe0e8 55%,#16a8b8);box-shadow:0 0 0 2px #0b6670,0 3px 0 #06444b}
#mpv .ed .who{font-size:11px;color:#c9ffff;align-self:center;white-space:nowrap}
#mpv .sent{font-size:12px;color:#4ade80;margin-top:6px}
#mpv .tks{display:flex;gap:12px;margin:0 10px}
#mpv .tk{flex:1;min-width:0;display:flex;flex-direction:column;border-radius:12px;background:linear-gradient(#2c190cf0,#2c190cf0) top/100% 8px no-repeat,linear-gradient(#2c190cf0,#2c190cf0) bottom/100% calc(100% - 8px - min(470px,42vh)) no-repeat;box-shadow:0 0 0 2px #a8752e,0 0 0 4px #2c190c}
#mpv .tk .tw{position:relative;height:min(470px,42vh);margin:8px 8px 0;outline:8px solid #2c190cf0;border-radius:9px;box-shadow:inset 0 0 0 2px #3fe0e8aa,0 0 14px #3fe0e844;background:radial-gradient(60% 55% at 50% 60%,#3fe0e818,#00000030);cursor:grab;touch-action:none}
#mpv .tk .tw:active{cursor:grabbing}
#mpv .tk .tl{position:absolute;left:8px;top:8px;font:700 11px "Fredoka",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#062a2e;background:linear-gradient(#b8ffff,#3fe0e8);padding:2px 8px;border-radius:5px}
#mpv .tk .tn{font-size:12px;color:#e8d3b0;padding:6px 10px 0;min-height:32px}
#mpv .tk button.pick{margin:8px;font-size:15px;padding:9px;color:#04310f;text-shadow:0 1px 0 #c8ffd8;background:linear-gradient(#b6ffcb,#4ade80 55%,#1f9c4a);box-shadow:0 0 0 2px #0f5a2a,0 3px 0 #08381a}
#mpv .tk button.pick:hover{filter:brightness(1.1)}
#mpv .ask{font-size:13px;color:#c9ffff;margin:0 10px 8px}
</style>`;
// orbit and zoom: this screen keeps the view, the player's own body moves the model (a few writes a second, never per pixel)
let V = { yaw: 0, pitch: 0, depth: 2.6 }, vFor = null, vAt = 0, vTimer = null;
function vSend() { const now = performance.now(); clearTimeout(vTimer); if (now - vAt < 50) { vTimer = setTimeout(vSend, 50 - (now - vAt)); return; } vAt = now; sendAction("modeling-studio:studio", { op: "view", ...V }); }
let TOOL = "orbit", BOX = null, EDRAFT = "", SENT = null;
let POLY = null;
let TKSIG = null; // (v2) which takes this screen last stood in the three windows
// the Preview Window's own place on screen: dragged by its top bar, scaled from its corner; kept on this screen only
let MPV = null; // { l, t, k }
const mpvStyle = () => MPV ? ` style="left:${MPV.l}px;top:${MPV.t}px;transform:scale(${MPV.k});transform-origin:0 0"` : "";
function mpvSet(el) { el.style.left = MPV.l + "px"; el.style.top = MPV.t + "px"; el.style.transform = `scale(${MPV.k})`; el.style.transformOrigin = "0 0"; }
function mpvStart(el) { if (!MPV) { const r = el.getBoundingClientRect(); MPV = { l: r.left, t: r.top, k: 1 }; mpvSet(el); } }
function mpvDone() { TKSIG = null; PVSIG = null; RELAY?.(); }
function m3dMpvMove(e) {
  if (e.target.closest("button") || e.button !== 0) return; e.preventDefault(); const el = document.getElementById("mpv"); if (!el) return; mpvStart(el);
  let x = e.clientX, y = e.clientY;
  const mv = (ev) => { MPV.l = Math.max(-200, Math.min(innerWidth - 120, MPV.l + ev.clientX - x)); MPV.t = Math.max(0, Math.min(innerHeight - 60, MPV.t + ev.clientY - y)); x = ev.clientX; y = ev.clientY; mpvSet(el); };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); mpvDone(); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
function m3dMpvSize(e) {
  if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); const el = document.getElementById("mpv"); if (!el) return; mpvStart(el);
  const w0 = el.offsetWidth, k0 = MPV.k, x0 = e.clientX, y0 = e.clientY, h0 = el.offsetHeight;
  const mv = (ev) => { MPV.k = Math.max(0.45, Math.min(1.8, k0 + Math.max((ev.clientX - x0) / w0, (ev.clientY - y0) / h0))); mpvSet(el); };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); mpvDone(); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
// the one model's window: where it sits on screen → camera metres at the preview depth, and how much the window is scaled
let PVSIG = null, RELAY = null;
let BUGNOTE = "";
function m3dPvBugDraft(el) { BUGNOTE = el.value; }
function m3dPvBug(id) { // the window's own rect on this screen; the frame is captured here, cropped to it and uploaded before the report goes
  const w = document.getElementById("mpv"); if (!w) return; const r = w.getBoundingClientRect();
  const d = { op: "bug", id, note: BUGNOTE.slice(0, 400), rect: [r.left, r.top, r.width, r.height].map(Math.round), vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio || 1, view: { ...V }, tool: TOOL };
  BUGNOTE = ""; const i = document.getElementById("mpv-bug"); if (i) i.value = "";
  (async () => {
    try {
      const blob = await window.spawn.view.captureFrame({ type: "image/jpeg", quality: 0.9 });
      const img = await createImageBitmap(blob), k = img.width / innerWidth;
      const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(r.width * k)); c.height = Math.max(1, Math.round(r.height * k));
      c.getContext("2d").drawImage(img, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, c.width, c.height);
      const cut = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.9));
      const up = await window.spawn.assets.upload({ blob: cut, name: "studio-bug-" + id + ".jpg" });
      if (up?.url) d.snap = up.url;
    } catch (e) { d.snapErr = String(e?.code ?? e?.message ?? e).slice(0, 120); }
    sendAction("modeling-studio:studio", d);
  })();
}
function m3dPvMeasure() {
  const w = document.querySelector("#mpv .win.orb"); if (!w) return; const r = w.getBoundingClientRect(); if (!r.width) return;
  const vw = innerWidth, vh = innerHeight, sig = [r.left, r.top, r.width, r.height, vw, vh].map(Math.round).join(","); if (sig === PVSIG) return; PVSIG = sig;
  const hv = Math.tan(25 * Math.PI / 180) * 2.6, hh = hv * vw / vh, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  sendAction("modeling-studio:studio", { op: "pvat", x: +((cx / vw * 2 - 1) * hh).toFixed(3), y: +(-(cy / vh * 2 - 1) * hv - 0.04).toFixed(3), k: +(MPV?.k ?? 1).toFixed(3) });
}
function m3dTkMeasure(editId, n) {
  if (TKSIG?.split(":")[0] !== editId) TV = []; // where each take window sits on screen → camera-frame metres (the takes ride the camera at fov 50, depth 2.6)
  const ws = [...document.querySelectorAll("#mpv .tk .tw")]; if (!ws.length) return;
  const vw = innerWidth, vh = innerHeight, r0 = ws[0].getBoundingClientRect(), sig = editId + ":" + n + ":" + vw + "x" + vh + ":" + [r0.left, r0.top, r0.width].map(Math.round).join(","); if (sig === TKSIG) return;
  if (!ws[0].getBoundingClientRect().width) { setTimeout(() => m3dTkMeasure(editId, n), 120); return; } TKSIG = sig;
  const hv = Math.tan(25 * Math.PI / 180) * 2.6, hh = hv * vw / vh;
  const slots = ws.map((w) => { const r = w.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
    return { x: +((cx / vw * 2 - 1) * hh).toFixed(3), y: +(-(cy / vh * 2 - 1) * hv).toFixed(3), s: +(Math.min(r.width / vw * 2 * hh, r.height / vh * 2 * hv) * 0.72).toFixed(3),
      w: +(r.width / vw * 2 * hh).toFixed(3), h: +(r.height / vh * 2 * hv).toFixed(3), wy: +(-((r.top + r.height / 2) / vh * 2 - 1) * hv).toFixed(3) }; });
  sendAction("modeling-studio:studio", { op: "takes", edit: editId, slots });
}
function takesHtml(it, e, player) {
  const vs = (e.variants ?? []).slice(0, 3), id = esc(e.id); // three takes at most
  return `<div class="ask">✏ "${esc(e.text)}" · savi made ${vs.length} take${vs.length === 1 ? "" : "s"}. each window is its own view: drag to orbit, scroll to zoom, hold the middle mouse button to slide it up or down, double-click to reset. then pick the best one. the gallery card only changes when you pick.</div>
<div class="tks">${vs.map((v, n) => `<div class="tk"><div class="tw" onpointerdown="m3dTkDown(event,${n})" onwheel="m3dTkWheel(event,${n})" onauxclick="event.preventDefault()" ondblclick="m3dTkReset(${n})"><span class="tl">take ${n + 1}</span></div><div class="tn">${esc(v.note ?? "")}</div><button class="pick" onclick="sendAction('modeling-studio:pick',{edit:'${id}',n:${n}})">✓ select take ${n + 1}</button></div>`).join("")}</div>`;
} // { pts: [{x,y}], closed, hover }
function boxHtml() {
  if (POLY && POLY.pts.length) {
    const P = POLY.pts.map((q) => `${(q.x * 100).toFixed(2)},${(q.y * 100).toFixed(2)}`).join(" "), f = POLY.pts[0], h = POLY.hover;
    const tail = !POLY.closed && h ? `<line x1="${(POLY.pts[POLY.pts.length - 1].x * 100).toFixed(2)}" y1="${(POLY.pts[POLY.pts.length - 1].y * 100).toFixed(2)}" x2="${(h.x * 100).toFixed(2)}" y2="${(h.y * 100).toFixed(2)}" stroke="#3fe0e8" stroke-width="2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>` : "";
    const dots = POLY.pts.map((q, i) => `<circle cx="${(q.x * 100).toFixed(2)}" cy="${(q.y * 100).toFixed(2)}" r="${i === 0 && !POLY.closed && POLY.pts.length > 2 ? 1.3 : 0.7}" fill="${i === 0 ? "#fff3a0" : "#3fe0e8"}" stroke="#062a2e" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join("");
    const shape = POLY.closed ? `<polygon points="${P}" fill="#3fe0e833" stroke="#3fe0e8" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>` : `<polyline points="${P}" fill="none" stroke="#3fe0e8" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    const lab = POLY.closed ? `<b style="left:${(Math.min(...POLY.pts.map((q) => q.x)) * 100).toFixed(1)}%;top:calc(${(Math.min(...POLY.pts.map((q) => q.y)) * 100).toFixed(1)}% - 20px)">edit here</b>` : "";
    return `<div id="mpv-box" class="poly"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${shape}${tail}${dots}</svg>${lab}</div>`;
  }
  if (!BOX) return ""; const x = Math.min(BOX.x0, BOX.x1) * 100, y = Math.min(BOX.y0, BOX.y1) * 100, w = Math.abs(BOX.x1 - BOX.x0) * 100, h = Math.abs(BOX.y1 - BOX.y0) * 100; return `<div class="box" id="mpv-box" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"><b>edit here</b></div>`; }
function m3dPvTool(t) { TOOL = t; if (POLY && !POLY.closed) m3dPvClear(); const w = document.querySelector("#mpv .win"); if (w) { w.classList.toggle("sel", t === "select" || t === "lasso"); } document.querySelectorAll("#mpv .tools button").forEach((b) => b.classList.toggle("on", b.dataset.t === t)); }
function m3dPvClear() { BOX = null; POLY = null; document.getElementById("mpv-box")?.remove(); const h = document.getElementById("mpv-who"); if (h) h.textContent = "whole model"; }
function m3dPvDraft(el) { EDRAFT = el.value; }
function m3dPvEdit(id) {
  const t = document.getElementById("mpv-ed"); if (t) EDRAFT = t.value; if (!EDRAFT.trim()) { t?.focus(); return; }
  const pl = POLY?.closed ? POLY.pts.map((q) => ({ x: +q.x.toFixed(3), y: +q.y.toFixed(3) })) : null;
  const b = pl ? { x0: Math.min(...pl.map((q) => q.x)), y0: Math.min(...pl.map((q) => q.y)), x1: Math.max(...pl.map((q) => q.x)), y1: Math.max(...pl.map((q) => q.y)) }
    : BOX && { x0: Math.min(BOX.x0, BOX.x1), y0: Math.min(BOX.y0, BOX.y1), x1: Math.max(BOX.x0, BOX.x1), y1: Math.max(BOX.y0, BOX.y1) };
  sendAction("modeling-studio:ask", { text: EDRAFT, mode: "model", refs: [], sel: [], edit: { of: id, box: b, poly: pl, view: { ...V } } });
  SENT = EDRAFT; EDRAFT = ""; if (t) t.value = ""; m3dPvClear();
  const s = document.getElementById("mpv-sent"); if (s) s.textContent = "✓ sent to savi. she's making 3 takes, they show up here to pick from.";
}
const PXM = () => 2 * Math.tan(25 * Math.PI / 180) * 2.6 / innerHeight; // metres one screen pixel spans at the preview's depth
function panDrag(e, get, set) { // middle mouse: grab the model and slide it up and down
  e.preventDefault(); e.stopPropagation(); let y = e.clientY;
  const mv = (ev) => { set(Math.max(-1.2, Math.min(1.2, get() - (ev.clientY - y) * PXM()))); y = ev.clientY; };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
function m3dPvDown(e) {
  if (e.button === 1) return panDrag(e, () => V.lift ?? 0, (v) => { V.lift = v; vSend(); });
  if (e.button !== undefined && e.button !== 0) return; if (e.target.closest("button")) return; e.preventDefault();
  if (TOOL === "lasso") {
    const w = e.currentTarget, r = w.getBoundingClientRect(), p = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
    const draw = () => { document.getElementById("mpv-box")?.remove(); w.insertAdjacentHTML("beforeend", boxHtml()); };
    if (!POLY || POLY.closed) { BOX = null; POLY = { pts: [p], closed: false, hover: p }; }
    else {
      const f = POLY.pts[0], near = Math.hypot((p.x - f.x) * r.width, (p.y - f.y) * r.height) < 16;
      if (near && POLY.pts.length >= 3) { POLY.closed = true; POLY.hover = null; const h = document.getElementById("mpv-who"); if (h) h.textContent = "selected shape"; document.getElementById("mpv-ed")?.focus(); }
      else POLY.pts.push(p);
    }
    if (!w.dataset.lassoMv) { w.dataset.lassoMv = "1"; w.addEventListener("pointermove", (ev) => { if (TOOL !== "lasso" || !POLY || POLY.closed) return; const rr = w.getBoundingClientRect(); POLY.hover = { x: (ev.clientX - rr.left) / rr.width, y: (ev.clientY - rr.top) / rr.height }; const f = POLY.pts[0]; if (POLY.pts.length >= 3 && Math.hypot((POLY.hover.x - f.x) * rr.width, (POLY.hover.y - f.y) * rr.height) < 16) POLY.hover = { ...f }; draw(); }); }
    draw(); return;
  }
  if (TOOL === "select") {
    const w = e.currentTarget, r = w.getBoundingClientRect(), at = (ev) => ({ x: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) });
    const p = at(e); BOX = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    const draw = () => { document.getElementById("mpv-box")?.remove(); w.insertAdjacentHTML("beforeend", boxHtml()); };
    const mv = (ev) => { const q = at(ev); BOX.x1 = q.x; BOX.y1 = q.y; draw(); };
    const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); if (Math.abs(BOX.x1 - BOX.x0) < 0.02 || Math.abs(BOX.y1 - BOX.y0) < 0.02) m3dPvClear(); else { const h = document.getElementById("mpv-who"); if (h) h.textContent = "selected area"; document.getElementById("mpv-ed")?.focus(); } };
    draw(); addEventListener("pointermove", mv); addEventListener("pointerup", up); return;
  }
  let x = e.clientX, y = e.clientY;
  const mv = (ev) => { V.yaw += (ev.clientX - x) * 0.45; V.pitch = Math.max(-80, Math.min(80, V.pitch + (ev.clientY - y) * 0.35)); x = ev.clientX; y = ev.clientY; vSend(); };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
function m3dPvWheel(e) { e.preventDefault(); e.stopPropagation(); V.depth = Math.max(1.5, Math.min(7, V.depth * (e.deltaY > 0 ? 1.1 : 1 / 1.1))); vSend(); }
// each take window is its own view: drag orbits that take, the wheel zooms it, the middle button slides it up and down
let TV = [];
const tvOf = (n) => (TV[n] ??= { yaw: 0, pitch: 0, zoom: 1, lift: 0 });
const tvT = []; const tvA = [];
function tvLim(n) { let L = null; try { L = JSON.parse(document.querySelectorAll("#mpv .tk .tw")[n]?.dataset.lim || "null"); } catch {} const v = tvOf(n); if (!L) return; v.zoom = Math.min(v.zoom, L.z); v.lift = Math.max(L.lo, Math.min(L.hi, v.lift)); }
function tvSend(n) { const now = performance.now(); clearTimeout(tvT[n]); if (now - (tvA[n] ?? 0) < 50) { tvT[n] = setTimeout(() => tvSend(n), 50); return; } tvA[n] = now; sendAction("modeling-studio:studio", { op: "tkview", n, ...tvOf(n) }); }
function m3dTkDown(e, n) {
  if (e.target.closest("button")) return; const v = tvOf(n);
  if (e.button === 1) return panDrag(e, () => v.lift, (x) => { v.lift = x; tvSend(n); });
  if (e.button !== undefined && e.button !== 0) return; e.preventDefault();
  let x = e.clientX, y = e.clientY;
  const mv = (ev) => { v.yaw += (ev.clientX - x) * 0.45; v.pitch = Math.max(-80, Math.min(80, v.pitch + (ev.clientY - y) * 0.35)); x = ev.clientX; y = ev.clientY; tvSend(n); };
  const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
  addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
}
function m3dTkWheel(e, n) { e.preventDefault(); e.stopPropagation(); const v = tvOf(n); v.zoom = Math.max(0.4, Math.min(3.5, v.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1))); tvSend(n); }
function m3dTkReset(n) { TV[n] = { yaw: 0, pitch: 0, zoom: 1, lift: 0 }; sendAction("modeling-studio:studio", { op: "tkview", n, reset: true }); }
function m3dPvReset() { V = { yaw: 0, pitch: 0, depth: 2.6 }; sendAction("modeling-studio:studio", { op: "view", reset: true }); }
function bugHtml(ctx, it, player) {
  const b = (ctx.world.state.m3d?.bugs ?? []).find((x) => x.item === it.id && x.by === (player.displayName ?? ""));
  const st = !b ? "" : b.snap ? `<span><img src="${esc(b.snap)}" onclick="this.classList.toggle('big')" title="click to enlarge" style="cursor:zoom-in;height:34px;border-radius:5px;vertical-align:middle;box-shadow:0 0 0 1.5px #ff6b5a"></span> filed ${esc(b.id)}` : b.failed ? `✗ snap failed for ${esc(b.id)}: ${esc(b.failed)}` : `<span class="pulse">📸 snapping the window, keep it open a few seconds…</span>`;
  const sent = b?.mailed ? ` · ${esc(b.mailed)}` : "";
  return `<div class="ed" style="margin-top:6px"><span class="who" style="background:#ff6b5a33;color:#ffb3a8">🐞 bug</span><input id="mpv-bug" value="${esc(BUGNOTE)}" placeholder="what's wrong? e.g. arch has a wall in the doorway" oninput="m3dPvBugDraft(this)" onkeydown="if(event.key==='Enter'){m3dPvBug('${esc(it.id)}')}"><button style="background:linear-gradient(#ff8a7a,#d8432f);color:#fff" onclick="m3dPvBug('${esc(it.id)}')">🐞 report bug</button></div>${st ? `<div class="sent" style="font-size:11.5px">${st}${sent}</div>` : ""}`;
}
function previewWin(ctx, player) {
  const id = player.state?.studioPreview; if (!id) { TKSIG = null; vFor = null; return ""; }
  const it = (ctx.world.state.m3d?.items ?? []).find((i) => i.id === id); if (!it) return "";
  if (vFor !== id) { vFor = id; V = { yaw: 0, pitch: 0, depth: 2.6 }; BOX = null; POLY = null; EDRAFT = ""; SENT = null; }
  const pic = it.thumb ?? it.url, model = it.kind === "model";
  const e = model ? (ctx.world.state.m3d?.edits ?? []).find((x) => x.of === it.id) : null, tk = e && (e.variants ?? []).length;
  if (!tk && TKSIG) { TKSIG = null; sendAction("modeling-studio:studio", { op: "preview", id: it.id }); } // takes picked or gone: the one model comes back
  if (tk) { const eid = e.id; RELAY = () => m3dTkMeasure(eid, tk); setTimeout(RELAY, 80); } else if (model) { RELAY = m3dPvMeasure; setTimeout(m3dPvMeasure, 80); } // the windows are laid out; the takes stand where they are
  const busy = e && !tk ? `✓ sent to savi: "${esc(e.text)}". she's making 3 takes, they show up here to pick from.` : "";
  const cn = [["left:6px;top:6px;border-right:0;border-bottom:0"], ["right:6px;top:6px;border-left:0;border-bottom:0"], ["left:6px;bottom:6px;border-right:0;border-top:0"], ["right:6px;bottom:6px;border-left:0;border-top:0"]].map(([c]) => `<i class="cn" style="${c}"></i>`).join("");
  return `${PV}<div id="mpv" data-modal${mpvStyle()}><i class="rz" onpointerdown="m3dMpvSize(event)" title="drag to resize"></i><div class="fr">
<div class="pl top"><div class="bar" onpointerdown="m3dMpvMove(event)" title="drag to move"><span class="ti">preview window</span><span class="nm">${esc(it.name ?? it.prompt)}</span><span class="tag">${model ? "3D" : "picture"}</span><button onclick="sendAction('modeling-studio:studio',{op:'unpreview'})" title="close">✕</button></div></div>
${tk ? takesHtml(it, e, player) : `<div class="win${model ? " orb" : ""}${model && (TOOL === "select" || TOOL === "lasso") ? " sel" : ""}"${model ? ` onpointerdown="m3dPvDown(event)" onauxclick="event.preventDefault()" onwheel="m3dPvWheel(event)"` : ""}>${model ? `<span class="hint">orbit: drag to turn · select: drag a box · lasso: click points, click the first to close · scroll to zoom</span><div class="tools"><button data-t="orbit" class="${TOOL === "orbit" ? "on" : ""}" onclick="m3dPvTool('orbit')">🖐 orbit</button><button data-t="select" class="${TOOL === "select" ? "on" : ""}" onclick="m3dPvTool('select')">⬚ select</button><button data-t="lasso" class="${TOOL === "lasso" ? "on" : ""}" onclick="m3dPvTool('lasso')">⬠ lasso</button></div>${boxHtml()}` : ""}${model ? (pic ? `<img class="ref" src="${esc(pic)}" alt="concept">` : "") : `<img src="${esc(pic)}" alt="">`}${cn}</div>`}
<div class="pl bot"><div class="mt">${esc(it.by ?? "")}${it.made ? " · " + esc(it.made) : ""}${model ? " · turning in 3D" : ""}<br>${esc((it.prompt ?? "").slice(0, 240))}</div>
${model ? `<div class="ed"><span class="who" id="mpv-who">${POLY?.closed ? "selected shape" : BOX ? "selected area" : "whole model"}</span><input id="mpv-ed" value="${esc(EDRAFT)}" placeholder="change it: make this part glow amber, add moss here…" oninput="m3dPvDraft(this)" onkeydown="if(event.key==='Enter'){m3dPvEdit('${esc(it.id)}')}"><button onclick="m3dPvClear()" title="clear the selection">✕ clear</button><button class="go2" onclick="m3dPvEdit('${esc(it.id)}')">✏ edit model</button></div><div class="sent" id="mpv-sent">${busy}</div>` : ""}
${bugHtml(ctx, it, player)}
<div class="row"><button class="go" onclick="sendAction('modeling-studio:show',{id:'${esc(it.id)}'})">${model ? "on pedestal" : "on canvas"}</button><button onclick="sendAction('modeling-studio:studio',{op:'unpreview'})">close</button>${model ? `<button onclick="m3dPvReset()">⟲ reset view</button>` : ""}${tk ? `<button onclick="sendAction('modeling-studio:pick',{edit:'${esc(e.id)}',keep:true})">keep the original</button>` : ""}</div></div>
</div></div>`;
}
export { m3dPvBug, m3dPvBugDraft };
export function render(ctx, player) {
  if (ctx?.world?.mode === "live" || !player) return "";
  return studioHud(ctx, player) + previewWin(ctx, player);
}
function studioHud(ctx, player) {
  if (!player.state?.studioOpen) return `${ST}<div id="msx"><button class="btn" onclick="sendAction('modeling-studio:studio',{op:'open'})">🎨 3D studio<kbd>M</kbd></button></div>`;
  return `${ST}<div id="msx"><div class="pan" data-modal><button class="x" title="close" onclick="sendAction('modeling-studio:studio',{op:'close'},{relockPointer:true})">✕</button>${panel.render(ctx, player)}</div></div>`;
}
