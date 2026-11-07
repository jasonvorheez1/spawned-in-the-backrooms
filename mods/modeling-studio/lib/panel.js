import { DEV } from "./dev.js";
// Spawn 3D Modeling Studio: the god-mode Studio tab. ask Savi to paint or build 3D (with reference pictures or
// picks from the gallery), watch what's in progress, and show, turn or remove what's made.
import { reportText } from "./joblog.js";
let draft = "", refs = [], sel = [], busy = false, jobsOpen = false, lastReport = "";
let pose = (() => { try { return localStorage.getItem("m3d-pose") || "none"; } catch { return "none"; } })(); // none | a | t: the pose a character is painted in
// the guide: one card at a time at the top of the tab, the control it talks about glows below it.
// steps tick themselves off when you actually do the thing (type, add a picture, press, a piece lands, show it).
const STEPS = [
  { id: "hi", icon: "🎨", title: "welcome to the studio", body: "turn a sentence or a picture into a 3D model. five quick steps, about a minute.", cta: "show me" },
  { id: "text", icon: "✍️", title: "describe what you want", body: "one line is enough: what it is, the style, full body. the box below is glowing.", cta: "next", example: "a cozy lighthouse keeper with a lantern, pixar style, full body" },
  { id: "pic", icon: "🖼", title: "add a picture (optional)", body: "🖼 add picture uploads a photo or sketch to guide the look. or tap a gallery thumbnail to reuse it.", cta: "next", alt: "no picture, skip" },
  { id: "make", icon: "🖌", title: "paint first, then build", body: "🖌 Paint makes a concept picture in about half a minute. 🧊 Build 3D turns it into a model in a few minutes. press one now.", cta: "i'll press later" },
  { id: "wait", icon: "⏳", title: "savi is on it", body: "the pulsing row is your ask in progress, ✕ cancels it. it lands in the gallery on its own, keep working meanwhile.", cta: "next" },
  { id: "show", icon: "🏛", title: "put it on display", body: "on canvas hangs a picture over the studio. on pedestal spins a model in the room. ↻ 180° flips one facing the wrong way.", cta: "next" },
  { id: "done", icon: "★", title: "that's the whole loop", body: "describe, picture, paint, build, show. tip: paint, tap that painting in the gallery, then Build 3D. every model gets a shelf slot with a brass plaque.", cta: "start making" },
];
let G = { i: 0, done: false, base: 0, shown: "" };
try { G = { ...G, ...JSON.parse(localStorage.getItem("m3d-guide") ?? "{}") }; } catch {}
const gSave = () => { try { localStorage.setItem("m3d-guide", JSON.stringify(G)); } catch {} };
let gLast = null; // the last render's reads, for the card to redraw itself between engine renders
function gChime(hi) { try { const a = new AudioContext(), o = a.createOscillator(), v = a.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(hi ? 880 : 660, a.currentTime); o.frequency.exponentialRampToValueAtTime(hi ? 1320 : 990, a.currentTime + 0.12); v.gain.setValueAtTime(0.08, a.currentTime); v.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35); o.connect(v).connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } catch {} }
function gTo(i, quiet) {
  const n = STEPS.length;
  if (i >= n) { G = { ...G, i: n - 1, done: true }; gChime(true); }
  else { G = { ...G, i: Math.max(0, i), done: false }; if (!quiet) gChime(false); }
  if (gLast && STEPS[G.i].id === "wait") G.base = gLast.count;
  if (gLast && STEPS[G.i].id === "show") G.shown = gLast.shown;
  gSave(); gPaint();
}
function gPaint() {
  const root = document.getElementById("m3d"), box = document.getElementById("m3d-guide"); if (!root || !box) return;
  root.dataset.step = G.done ? "" : STEPS[G.i].id; box.innerHTML = guideHtml();
  const t = root.querySelector(`[data-g="${root.dataset.step}"]`); if (t) t.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
export function m3dGuide(op) {
  if (op === "next") gTo(G.i + 1);
  else if (op === "back") gTo(G.i - 1, true);
  else if (op === "close") { G = { ...G, done: true }; gSave(); gPaint(); }
  else if (op === "replay") gTo(0, true);
  else if (op === "example") { const t = document.getElementById("m3d-text"); if (t) { t.value = STEPS[1].example; draft = t.value; t.focus(); } gTo(G.i + 1); }
}
function guideHtml() {
  if (G.done) return `<div class="row" style="justify-content:flex-end;margin:-4px 0 8px"><button class="gq" onclick="m3dGuide('replay')">？ how it works</button></div>`;
  const st = STEPS[G.i], first = G.i === 0, last = G.i === STEPS.length - 1;
  const dots = STEPS.map((_, k) => `<i class="${k === G.i ? "on" : k < G.i ? "ok" : ""}"></i>`).join("");
  return `<div class="gc" id="m3d-gc-${st.id}"><div class="row" style="justify-content:space-between;align-items:flex-start"><span class="gi">${st.icon}</span><span class="gn">${first ? "studio guide" : last ? "all done" : `step ${G.i} of ${STEPS.length - 2}`}</span><button class="gq" title="close the guide" onclick="m3dGuide('close')">✕</button></div>
<div class="gt">${esc(st.title)}</div><div class="gb">${esc(st.body)}</div>
<div class="gd">${dots}</div>
<div class="row">${!first ? `<button onclick="m3dGuide('back')">back</button>` : ""}<button class="go" onclick="m3dGuide('next')">${esc(st.cta)}</button>${st.example ? `<button class="gq" onclick="m3dGuide('example')">use an example</button>` : ""}${st.alt ? `<button class="gq" onclick="m3dGuide('next')">${esc(st.alt)}</button>` : ""}</div></div>`;
}
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const STYLE = `<style>
@font-face{font-family:"Fredoka";src:url(/cdn/value.99d6c78e043710d4f83ed90716779798b7b04eb690f73e0ad0e8f32d1f0e98c2.woff2) format("woff2");font-weight:300 700;font-display:swap}
#m3d{--ink:#3b2414;--wood:#4a2c17;--wood2:#2a170c;--brass:#e0b45a;--brass2:#9c6a26;--paper:#f6e2b5;--text:#fff3dc;--dim:#c9a97e;--hot:#ffb347;--cool:#3fe0e8;--dusk:#5b3f8f;--dusk2:#2c1d4a;
  color:var(--text);font:500 14px/1.38 "Fredoka","Geist Pixel Square",sans-serif;padding:8px;border-radius:14px;
  background:linear-gradient(#1b0f08cc,#1b0f08e6),url(/cdn/value.cf03aed3135e757557824f0694f7f545c56153192186fe53570b67a28c0b1777.png) center/260px;box-shadow:inset 0 0 0 2px var(--brass2),inset 0 0 0 4px #0008,inset 0 0 40px #000a}
#m3d .hdr{position:relative;margin:-2px -2px 10px;border-radius:12px;overflow:hidden;box-shadow:0 0 0 2px var(--brass),0 6px 18px #000a}
#m3d .hdr img{display:block;width:100%;height:150px;object-fit:cover;object-position:50% 30%}
#m3d .sub{color:var(--paper);font-size:12.5px;margin:0 2px 12px;text-shadow:0 1px 0 #000}
#m3d .box{position:relative;color:var(--ink);background:linear-gradient(#fff8e600,#c9934a33),url(/cdn/value.a6c829a014eff871c481b5f678ad1743ffe20c380108dee82e9d6e6f6bcc8e27.png) center/300px;border-radius:10px;padding:12px;margin-bottom:12px;
  box-shadow:0 0 0 2px var(--brass2),0 0 0 4px var(--wood2),0 5px 12px #000b}
#m3d .box::before,#m3d .box::after{content:"";position:absolute;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff2c0,var(--brass) 45%,var(--brass2));top:5px;box-shadow:0 1px 1px #0008}
#m3d .box::before{left:5px}#m3d .box::after{right:5px}
#m3d .box .lbl,#m3d .box .mt{color:#7a5230!important}
#m3d textarea{width:100%;box-sizing:border-box;min-height:70px;background:#fffaf0;color:var(--ink);border:2px solid #b98a4e;border-radius:8px;padding:8px;font:inherit;resize:vertical;box-shadow:inset 0 2px 4px #7a523040}
#m3d textarea:focus{outline:none;border-color:var(--cool);box-shadow:0 0 0 3px #3fe0e855}
#m3d button{font:600 13px "Fredoka",sans-serif;cursor:pointer;border:0;border-radius:8px;padding:7px 11px;color:var(--text);
  background:linear-gradient(#6b4122,#3e2311);box-shadow:inset 0 1px 0 #ffffff30,0 0 0 1.5px var(--brass2),0 2px 0 #0009;text-shadow:0 1px 0 #000}
#m3d button:hover{filter:brightness(1.15)}#m3d button:active{translate:0 1px}
#m3d button.go{color:#3a1d04;text-shadow:0 1px 0 #ffe7b0;font-size:15px;padding:9px 14px;background:linear-gradient(#ffe08a,#ffb347 55%,#e0812a);box-shadow:inset 0 1px 0 #fff8,0 0 0 2px #8a4b12,0 3px 0 #5a2e08,0 0 14px #ffb34766}
#m3d button.go2{color:#062a2e;text-shadow:0 1px 0 #c8ffff;font-size:15px;padding:9px 14px;background:linear-gradient(#b8ffff,#3fe0e8 55%,#16a8b8);box-shadow:inset 0 1px 0 #fff9,0 0 0 2px #0b6670,0 3px 0 #06444b,0 0 16px #3fe0e888}
#m3d button:disabled{opacity:.45;cursor:default}#m3d .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#m3d .lbl{font:700 11px "Fredoka",sans-serif;letter-spacing:.12em;color:var(--brass);text-transform:uppercase;margin:0 0 7px;text-shadow:0 1px 0 #000}
#m3d .box .lbl{text-shadow:none}
#m3d .refs img{width:44px;height:44px;object-fit:cover;border-radius:6px;box-shadow:0 0 0 2px var(--brass2);display:block}
#m3d .seg{gap:0;border-radius:9px;box-shadow:0 0 0 2px var(--brass2);overflow:hidden}
#m3d .seg button{border-radius:0;padding:5px 11px;font-size:12px;box-shadow:none;border-right:1px solid #0006}#m3d .seg button:last-child{border-right:0}
#m3d .seg button.on{color:#062a2e;text-shadow:none;background:linear-gradient(#b8ffff,#3fe0e8)}
#m3d .it{position:relative;display:grid;grid-template-columns:56px 1fr;gap:10px;padding:8px;margin-bottom:8px;border-radius:10px;color:var(--text);
  background:linear-gradient(#3a2212f0,#24140af0),url(/cdn/value.cf03aed3135e757557824f0694f7f545c56153192186fe53570b67a28c0b1777.png) center/200px;box-shadow:0 0 0 1.5px var(--brass2),0 3px 8px #0009}
#m3d .it img{width:56px;height:56px;object-fit:cover;border-radius:8px;display:block;cursor:pointer;background:#f6e2b5;box-shadow:0 0 0 2px var(--brass)}
#m3d .it.on{box-shadow:0 0 0 2px var(--cool),0 0 14px #3fe0e877}
#m3d .it .nm{font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#m3d .it .mt{font-size:11px;color:var(--dim)}#m3d .it button{padding:4px 8px;font-size:11.5px}
#m3d .tag{font-size:10px;font-weight:700;padding:1px 6px;margin-left:5px;border-radius:5px;color:#3a1d04;background:linear-gradient(#ffe08a,#d9a24a);vertical-align:1px}
#m3d .tag.live{color:#062a2e;background:linear-gradient(#b8ffff,#3fe0e8);box-shadow:0 0 8px #3fe0e899}
#m3d .live{color:#e0812a}
img.big{position:fixed!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%);width:min(80vw,1100px)!important;height:auto!important;z-index:99;cursor:zoom-out!important;box-shadow:0 0 0 4px #ff6b5a,0 10px 60px #000!important}
#m3d #m3d-jobs:not([data-open="1"]) .jl{display:none}
@keyframes m3dp{50%{opacity:.35}}#m3d .pulse{animation:m3dp 1.2s infinite}
#m3d .gc{position:relative;padding:14px;margin-bottom:12px;border-radius:12px;animation:m3dIn .3s ease-out;
  background:radial-gradient(120% 80% at 50% 0%,#8a5bbf 0%,var(--dusk) 40%,var(--dusk2) 100%);box-shadow:0 0 0 2px var(--cool),0 0 0 4px #0b4a52,0 0 22px #3fe0e855,0 6px 14px #000a}
#m3d .gi{font-size:28px;line-height:1;filter:drop-shadow(0 0 8px #ffb347aa)}
#m3d .gn{font:700 10px "Fredoka",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--hot);margin-top:4px}
#m3d .gt{font:700 19px/1.15 "Fredoka",sans-serif;margin:8px 0 5px;color:#c9ffff;text-shadow:0 0 10px #3fe0e8aa,0 2px 0 #0b3a40}
#m3d .gb{color:#efe3ff;font-size:13px}
#m3d .gd{display:flex;gap:5px;margin:12px 0}#m3d .gd i{width:9px;height:9px;border-radius:5px;background:#ffffff30}#m3d .gd i.on{width:24px;background:var(--hot);box-shadow:0 0 8px var(--hot)}#m3d .gd i.ok{background:var(--cool)}
#m3d button.gq{background:none;box-shadow:none;color:var(--dim);padding:4px 6px;font-size:12px}#m3d button.gq:hover{color:var(--text)}
#m3d .gc button.gq{color:#d8c8ff}
@keyframes m3dIn{from{opacity:0;translate:0 -6px}}
@keyframes m3dGlow{50%{box-shadow:0 0 0 3px var(--cool),0 0 20px var(--cool)}}
#m3d[data-step="text"] [data-g="text"],#m3d[data-step="pic"] [data-g="pic"],#m3d[data-step="make"] [data-g="make"],#m3d[data-step="wait"] [data-g="wait"],#m3d[data-step="show"] [data-g="show"]{position:relative;border-radius:8px;box-shadow:0 0 0 2px var(--cool);animation:m3dGlow 1.2s ease-in-out infinite}
#m3d[data-step="text"] [data-g="text"]::before,#m3d[data-step="pic"] [data-g="pic"]::before,#m3d[data-step="make"] [data-g="make"]::before,#m3d[data-step="wait"] [data-g="wait"]::before,#m3d[data-step="show"] [data-g="show"]::before{content:"▼ here";position:absolute;top:-18px;left:6px;font-size:11px;font-weight:700;color:#0b8a94;pointer-events:none;width:auto;height:auto;background:none;box-shadow:none;border-radius:0}
</style>`;
export function m3dDraft(el) { draft = el.value; }
export function m3dJobs(op, el) {
  if (op === "toggle") { jobsOpen = !jobsOpen; const b = document.getElementById("m3d-jobs"); if (b) b.dataset.open = jobsOpen ? "1" : ""; return; }
  if (op === "copylog") { const t = el?.dataset.log ?? ""; try { navigator.clipboard.writeText(t).then(() => { el.textContent = "✓ copied"; setTimeout(() => { el.textContent = "📋 job log"; }, 1600); }); } catch {} return; }
  if (op === "copy") { const done = () => { if (el) { el.textContent = "✓ copied"; setTimeout(() => { el.textContent = "📋 copy for bug report"; }, 1600); } };
    try { navigator.clipboard.writeText(lastReport).then(done, () => { const ta = document.getElementById("m3d-jobs-txt"); if (ta) { ta.style.display = "block"; ta.select(); } }); } catch { const ta = document.getElementById("m3d-jobs-txt"); if (ta) { ta.style.display = "block"; ta.select(); } } }
}
function inboxHtml(player) {
  const ib = player.state?.bugInbox, rows = ib?.rows ?? [], open = rows.filter((r) => !r.done).length;
  const head = `<div class="row" style="justify-content:space-between"><span class="lbl" style="margin:0">🐞 bug inbox · developer${ib?.open ? ` · ${open} open of ${rows.length}` : ""}</span><span class="row">${ib?.open ? `<button onclick="sendAction('modeling-studio:studio',{op:'inbox'})">↻</button><button onclick="sendAction('modeling-studio:studio',{op:'bugdone',close:true})">hide</button>` : `<button onclick="sendAction('modeling-studio:studio',{op:'inbox'})">open</button>`}</span></div>`;
  if (!ib?.open) return `<div class="box" id="m3d-inbox">${head}<div class="mt" style="font-size:11px">reports users send from the preview window land here, with a snap of their window.</div></div>`;
  return `<div class="box" id="m3d-inbox">${head}${ib.error ? `<div class="mt">${esc(ib.error)}</div>` : ""}${rows.map((r) => `<div style="margin-top:8px;padding:8px;border-radius:8px;background:${r.done ? "#efe7da" : "#fff1ee"};box-shadow:inset 0 0 0 1.5px ${r.done ? "#b98a4e" : "#ff6b5a"};display:flex;gap:8px${r.done ? ";opacity:.6" : ""}">
${r.snap ? `<span><img src="${esc(r.snap)}" onclick="this.classList.toggle('big')" title="click to enlarge" style="cursor:zoom-in;width:72px;height:60px;object-fit:cover;border-radius:6px"></span>` : `<div style="width:72px;height:60px;border-radius:6px;background:#e9dcc6;display:grid;place-items:center;font-size:10px;color:#8a6a44">no snap yet</div>`}
<div style="min-width:0;flex:1"><b style="font-size:12.5px">${esc(r.name || r.item)}</b><div style="font-size:12px">${esc(r.note || "(no note)")}</div><div class="mt" style="font-size:10.5px">${esc(r.id)} · ${esc(r.by_name)} · ${esc(r.item)}</div>${r.log ? `<details style="margin-top:3px"><summary style="font-size:11px;cursor:pointer">their job log</summary><pre style="white-space:pre-wrap;font-size:10.5px;max-height:180px;overflow:auto;margin:4px 0;padding:6px;background:#fffaf0;border-radius:6px">${esc(r.log)}</pre></details>` : ""}
<div class="row" style="margin-top:4px"><button onclick="sendAction('modeling-studio:studio',{op:'preview',id:'${esc(r.item)}'})">👁 open it</button>${r.log ? `<button onclick="m3dJobs('copylog',this)" data-log="${esc(r.log)}">📋 job log</button>` : ""}<button onclick="sendAction('modeling-studio:studio',{op:'bugdone',id:'${esc(r.id)}',done:${r.done ? "false" : "true"}})">${r.done ? "↺ reopen" : "✓ fixed"}</button></div></div></div>`).join("") || `<div class="mt">no reports yet.</div>`}</div>`;
}
function jobsHtml(jobs) {
  const col = { ok: "#4ade80", failed: "#ff6b5a", cancelled: "#c9a97e" };
  return `<div class="box" id="m3d-jobs" data-open="${jobsOpen ? "1" : ""}"><div class="row" style="justify-content:space-between"><span class="lbl" style="margin:0">job log · last ${jobs.length} of 5</span><span class="row"><button onclick="m3dJobs('copy',this)">📋 copy for bug report</button><button onclick="m3dJobs('toggle')">${jobsOpen ? "hide" : "show"}</button></span></div>
<div class="jl">${jobs.map((j, k) => `<div style="margin-top:8px;padding:8px;border-radius:8px;background:#fffaf0;box-shadow:inset 0 0 0 1.5px #b98a4e">
<div class="row" style="justify-content:space-between"><b>#${k + 1} ${esc(j.kind === "image" ? "paint" : "build 3D")}</b><span style="font:700 11px Fredoka,sans-serif;padding:1px 7px;border-radius:5px;color:#1b0f08;background:${col[j.status] ?? "#ffb347"}">${esc(j.status)}</span></div>
<div style="font-size:12px;margin:3px 0">${esc(String(j.prompt ?? "").slice(0, 110))}</div>
<div class="mt" style="font-size:11px">order ${esc(j.order)}${j.item ? " → " + esc(j.item) : ""} · ${esc(j.by ?? "")} · ${esc(j.date ?? "")}${j.waitS != null ? ` · queued ${j.waitS}s` : ""}</div>
${(j.steps ?? []).map((s) => `<div style="font-size:11.5px">${s.ok ? "✅" : "❌"} ${esc(s.step)}${s.s != null ? ` <b>${s.s}s</b>` : ""}${s.note ? ` <span class="mt">· ${esc(s.note)}</span>` : ""}</div>`).join("")}
${j.error ? `<div style="font-size:11.5px;color:#a3241a"><b>error:</b> ${esc(j.error)}</div>` : ""}</div>`).join("") || `<div class="mt">no jobs logged yet. the next one lands here.</div>`}</div>
<textarea id="m3d-jobs-txt" readonly style="display:none;margin-top:8px;min-height:120px;font-size:11px">${esc(lastReport)}</textarea></div>`;
}
const POSES = [["none", "free"], ["a", "A pose"], ["t", "T pose"]];
function poseHtml() { return POSES.map(([k, l]) => `<button class="ps${pose === k ? " on" : ""}" onclick="m3dPose('${k}')">${l}</button>`).join(""); }
export function m3dPose(k) { pose = k; try { localStorage.setItem("m3d-pose", k); } catch {} const b = document.getElementById("m3d-pose"); if (b) b.innerHTML = poseHtml(); }
const seenKey = "m3d-edit-seen";
function edSeen() { try { return JSON.parse(localStorage.getItem(seenKey) || "{}"); } catch { return {}; } }
export function m3dPreview(id) {
  const b = document.getElementById("m3d-ed-" + id);
  if (b) { const m = edSeen(); m[id] = Number(b.dataset.ed); try { localStorage.setItem(seenKey, JSON.stringify(m)); } catch {} b.remove(); }
  sendAction("modeling-studio:studio", { op: "preview", id });
}
export function m3dPick(id) { if (!sel.includes(id)) m3dPreview(id); sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-4); document.getElementById("m3d-it-" + id)?.classList.toggle("on", sel.includes(id)); if (sel.length && !G.done && STEPS[G.i].id === "pic") gTo(G.i + 1); }
export async function m3dUpload(input) {
  const f = input.files?.[0]; if (!f || busy) return;
  busy = true; const box = document.getElementById("m3d-refs"); if (box) box.insertAdjacentHTML("beforeend", `<span class="pulse" id="m3d-up">uploading…</span>`);
  try { const r = await window.spawn.assets.upload({ blob: f, name: f.name }); if (r?.url) { refs = [...refs, r.url].slice(-4); if (!G.done && STEPS[G.i].id === "pic") gTo(G.i + 1); } }
  catch (e) { refs = refs; }
  busy = false; input.value = "";
  if (box) box.innerHTML = refsHtml();
}
export function m3dAsk(mode) {
  const t = document.getElementById("m3d-text"); if (t) draft = t.value;
  if (!draft.trim() && !refs.length && !sel.length) return;
  sendAction("modeling-studio:ask", { text: draft, mode, refs, sel, pose });
  if (!G.done && G.i <= STEPS.findIndex((x) => x.id === "make")) gTo(STEPS.findIndex((x) => x.id === "wait"));
  draft = ""; refs = []; sel = [];
  if (t) t.value = ""; const box = document.getElementById("m3d-refs"); if (box) box.innerHTML = refsHtml();
  document.querySelectorAll("#m3d .it.on").forEach((n) => n.classList.remove("on"));
}
function refsHtml() { return refs.map((u) => `<img src="${esc(u)}" alt="ref">`).join("") + (refs.length ? `<button onclick="m3dClearRefs()">✕</button>` : ""); }
export function m3dClearRefs() { refs = []; const box = document.getElementById("m3d-refs"); if (box) box.innerHTML = refsHtml(); }
function ago(ctx, at) { const s = Math.max(0, Math.round((ctx.now() - at) / 1000)); return s < 60 ? s + "s" : Math.round(s / 60) + "m"; }
export function render(ctx, player) {
  if (!ctx) return `${STYLE}<div id="m3d" class="w-full">loading the studio…</div>`;
  const s = ctx.world.state.m3d ?? {}, items = [...(s.items ?? [])].reverse(), pend = s.pending ?? [], sw = s.showing ?? {};
  const studio = (ctx.query?.({ tags: ["modeling-studio"] }) ?? []).length;
  const shown = `${sw.image ?? ""}|${sw.model ?? ""}`;
  gLast = { count: items.length, shown };
  if (!G.done && STEPS[G.i].id === "wait" && items.length > (G.base ?? 0)) { G.i++; G.shown = shown; gSave(); gChime(false); }
  else if (!G.done && STEPS[G.i].id === "show" && items.length && G.shown !== shown) { G.i++; gSave(); gChime(false); }
  const gs = G.done ? "" : STEPS[G.i].id;
  return `${STYLE}<div id="m3d" class="w-full" data-step="${gs}">
<div class="hdr"><img src="/cdn/value.cb9c06f01973c192c52e26a7baf31b711a2c4b66b310ba3c64c7b3f833364f65.png" alt="Spawn 3D Modeling Studio"></div><div class="sub">describe it, add a picture, and Savi paints it or builds it in 3D. pictures land on the canvas, models on the pedestal and shelf.</div>
<div id="m3d-guide">${guideHtml()}</div>
${studio ? "" : `<div class="box" style="box-shadow:0 0 0 2px var(--hot)">the studio stand isn't in this place yet. ask Savi: <b>/modeling-studio</b></div>`}
<div class="box">
<div class="lbl">new ask</div>
<textarea data-g="text" id="m3d-text" placeholder="a cozy lighthouse keeper, pixar style, full body" oninput="m3dDraft(this)">${esc(draft)}</textarea>
<div class="row" style="margin:8px 0"><label class="row" data-g="pic" style="cursor:pointer"><button onclick="this.nextElementSibling.click()">🖼 add picture</button><input type="file" accept="image/*" style="display:none" onchange="m3dUpload(this)"></label><div id="m3d-refs" class="row refs">${refsHtml()}</div></div>
<div class="row" style="margin:0 0 8px;gap:8px"><span class="lbl" style="margin:0">pose</span><span id="m3d-pose" class="row seg">${poseHtml()}</span><span class="mt" style="color:var(--dim);font-size:11px">for characters</span></div>
<div class="row"><span class="row" data-g="make" style="gap:6px"><button class="go" onclick="m3dAsk('image')">🖌 Paint</button><button class="go2" onclick="m3dAsk('model')">🧊 Build 3D</button></span><span class="mt" style="color:var(--dim);font-size:11px">tap gallery cards to use them as references</span></div>
</div>
${pend.length ? `<div class="box" data-g="wait"><div class="lbl">savi is working on</div>${pend.map((p) => `<div class="row" style="justify-content:space-between;margin-bottom:4px"><span><span class="pulse live">●</span> ${p.mode === "image" ? "painting" : "building 3D"}${p.pose === "a" ? " · A pose" : p.pose === "t" ? " · T pose" : ""}: ${esc(p.text.slice(0, 60)) || "(from pictures)"} <span class="mt" style="color:var(--dim)">${ago(ctx, p.at)}</span></span><button onclick="sendAction('modeling-studio:cancel',{id:'${esc(p.id)}'})">✕</button></div>`).join("")}</div>` : ""}
${player?.userId === DEV.userId ? (lastReport = reportText(s.jobs ?? [], "Development Lab"), jobsHtml(s.jobs ?? [])) : ""}
${player?.userId === DEV.userId ? inboxHtml(player) : ""}
<div class="lbl">gallery · ${items.length}</div>
${items.length ? items.map((i, k) => {
    const on = sw.image === i.id || sw.model === i.id, pic = i.thumb ?? i.url;
    return `<div class="it${sel.includes(i.id) ? " on" : ""}" id="m3d-it-${esc(i.id)}">${pic ? `<img src="${esc(pic)}" onclick="m3dPick('${esc(i.id)}')" title="preview it, and use as reference">` : `<div style="width:56px;height:56px;border-radius:8px;background:linear-gradient(#b8ffff,#3fe0e8);display:grid;place-items:center;font-size:24px">🧊</div>`}
<div style="min-width:0"><div class="nm">${esc(i.name ?? i.prompt)}<span class="tag">${i.kind === "image" ? "picture" : "3D"}</span>${on ? `<span class="tag live">showing</span>` : ""}${i.edited && (edSeen()[i.id] ?? 0) < i.edited ? `<span id="m3d-ed-${esc(i.id)}" data-ed="${i.edited}" title="${esc(i.editNote ?? "savi changed this")}" style="display:inline-grid;place-items:center;width:18px;height:18px;margin-left:5px;border-radius:50%;background:#4ade80;color:#04310f;font:900 13px/1 'Fredoka',sans-serif;box-shadow:0 0 8px #4ade80cc,0 0 0 2px #04310f;vertical-align:middle">!</span>` : ""}</div>
<div class="mt">${esc(i.by ?? "")}${i.made ? " · " + esc(i.made) : ""}</div>
<div class="row" style="margin-top:4px"${k === 0 ? ` data-g="show"` : ""}><button onclick="m3dPreview('${esc(i.id)}')">👁 preview</button><button onclick="sendAction('modeling-studio:show',{id:'${esc(i.id)}'})">${i.kind === "image" ? "on canvas" : "on pedestal"}</button>${i.kind === "model" ? `<button onclick="sendAction('modeling-studio:turn',{id:'${esc(i.id)}'})">↻ 180°</button>` : ""}<button onclick="sendAction('modeling-studio:remove',{id:'${esc(i.id)}'})">remove</button></div></div></div>`;
  }).join("") : `<div class="mt" style="color:var(--dim)">nothing yet. your first ask lands here.</div>`}
</div>`;
}
export default render;
