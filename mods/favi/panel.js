// Favi's tab on the god-mode rail: home (three doors) → Main Favi · Forge Files · Reference Images. Phone-first, one column.
import { FAVI_IMG, GREETING } from "lib/persona.js";
import { PRESETS, RATE_AXES, count, plainData } from "lib/forge.js";
import { CATALOG } from "lib/catalog.js";
// the full descriptions (95 KB) load after the world stands, on the panel's first draw; until then a detail shows the gist
let FULL = {}, fullAsked = false;
function wantFull() { if (fullAsked) return; fullAsked = true; try { import("lib/catalog-full.js").then((m) => { FULL = m.FULL ?? {}; }).catch(() => {}); } catch {} }

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const js = (s) => esc(JSON.stringify(s));
const COVER = "/cdn/value.865576583164ca68ca34c71311d4d36e31d855e8b9691c00fddf0a7a37e684e4.jpg"; // favi's painted cover, 720 px, 64 KB
const QUICK = ["what's my game missing?", "give me 3 wild ideas", "quiz me on my game"];

function me() { return document.getElementById("favi-root")?.dataset.me || ""; }
// the page you tapped is remembered on this device too, so a slow or missed round trip can't snap you back to her doors
let localView = null;
export function fv(action, payload) { if (action === "nav" && payload && typeof payload.view === "string") localView = payload.view; sendAction("favi:" + action, { n: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...(payload || {}), me: me() }); }
// clear: wipes the whole chat backlog (every message, the queue, a reply in flight) after one tap-to-confirm
// confirm() is blocked inside the tab's sandbox (it silently answers no), so the button asks itself: first tap arms it, second clears
let clearArmed = 0;
export function faviArm(el, ask, go) {
  if (el.dataset.armed && Date.now() - Number(el.dataset.armed) < 3000) { delete el.dataset.armed; go(); return; }
  const was = el.textContent; el.dataset.armed = String(Date.now()); el.textContent = ask;
  setTimeout(() => { if (el.dataset.armed) { delete el.dataset.armed; el.textContent = was; } }, 3000);
}
export function faviClear(el) {
  const b = el || document.getElementById("favi-clear");
  if (Date.now() - clearArmed < 3000) { clearArmed = 0; fv("clear"); if (b) b.textContent = "cleared"; return; }
  clearArmed = Date.now(); if (b) { b.textContent = "tap again to clear"; setTimeout(() => { if (clearArmed && Date.now() - clearArmed >= 2900) { clearArmed = 0; b.textContent = "🗑 clear"; } }, 3000); }
}
export function faviSend(text) {
  const el = document.getElementById("favi-in"); const v = (text ?? (el && el.value) ?? "").trim();
  if (!v) { el && el.focus(); return; } if (/^\/clear$/i.test(v)) { fv("clear"); if (el) el.value = ""; return; } fv("send", { text: v, n: "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }); if (el && text == null) el.value = "";
}
export function faviKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); faviSend(); } }
export function faviVal(id) { return document.getElementById(id)?.value ?? ""; }
export function faviPick(qid, text) { const el = document.getElementById("fa-" + qid); if (el) { el.value = text; el.classList.add("border-sky-400"); } }
export function faviAnswers() { const out = {}; document.querySelectorAll("[data-q]").forEach((el) => { if (el.value.trim()) out[el.dataset.q] = el.value; }); return out; }
export function faviCopy(id) {
  const el = document.getElementById(id); if (!el) return; el.select?.();
  try { navigator.clipboard.writeText(el.value); } catch { try { document.execCommand("copy"); } catch {} }
  const b = document.getElementById(id + "-btn"); if (b) { b.textContent = "copied"; setTimeout(() => (b.textContent = "copy"), 1200); }
}

const btn = (label, onclick, kind = "") => `<button onclick="${onclick}" class="${kind === "main" ? "bg-sky-500 active:bg-sky-600 text-white font-semibold" : kind === "danger" ? "border border-rose-400/40 text-rose-200" : "border border-white/15 text-slate-200 active:bg-white/10"} rounded-full px-3 py-1.5 text-[12px]">${label}</button>`;
const top = (title, sub, back, extra = "") => `<div class="flex items-center gap-2 pb-2 border-b border-white/10">
  ${back ? `<button onclick="${back}" class="text-slate-300 text-[18px] px-1 active:text-white">‹</button>` : ""}
  <img src="${FAVI_IMG}" class="w-9 h-9 rounded-full object-cover ring-2 ring-sky-400/60"/>
  <div class="flex-1 min-w-0"><div class="font-semibold text-[15px] truncate">${title}</div><div class="text-[11px] text-slate-400 truncate">${sub}</div></div>${extra}</div>`;
const errBox = (u) => u.err ? `<div class="rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-100 text-[12px] px-3 py-2">${esc(u.err)}</div>` : "";
const home = `fv('nav',{view:'home'})`;

function homeView(f) {
  const door = (view, icon, title, sub) => `<button onclick="fv('nav',{view:'${view}'})" class="w-full text-left flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-3 py-3 active:bg-sky-500/20">
    <div class="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-[20px] shrink-0">${icon}</div>
    <div class="min-w-0"><div class="font-semibold text-[14px]">${title}</div><div class="text-[11px] text-slate-400 leading-snug">${sub}</div></div></button>`;
  const nFiles = f.forge?.order?.length ?? 0, nStyles = Object.keys(f.refs?.styles ?? {}).length;
  return `<div class="relative rounded-2xl overflow-hidden ring-1 ring-sky-400/40"><img src="${COVER}" class="w-full block" style="aspect-ratio:16/9;object-fit:cover"/><div class="absolute inset-x-0 bottom-0 px-3 py-1.5 text-[12px] text-slate-200" style="background:linear-gradient(transparent,rgba(5,7,15,0.85))">forge + savi. pick a door.</div></div>
  ${sparkCard(f)}
  ${door("forge", "📜", "Access Forge Files", nFiles ? `${nFiles} file${nFiles === 1 ? "" : "s"} · edit, finalize, prompts` : "your Idea Forge files, mini, with finalize")}
  ${door("chat", "💬", "Main Favi", f.typing ? "typing…" : "favi from Idea Forge, but she sees this game")}
  ${door("refs", "🖼️", "Get Reference Images", nStyles ? `${nStyles} style${nStyles === 1 ? "" : "s"} saved · /style uses them` : "name a style, get 10+ images for Savi's /style")}
  ${door("watch", "👀", "Playtest Eyes", f.watch?.active ? "watching you play…" : f.watch?.busy ? "writing up what she saw…" : f.watch?.report ? "read ready · where you got stuck, bored, lost" : "favi watches you play a minute, then tells you")}
  ${door("market", "🧩", "Mod Market", `${CATALOG.length} mods · favi knows them all${f.mods?.installed?.length ? ` · ${f.mods.installed.length} in your game` : ""}`)}
  <div class="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 flex flex-col gap-1"><div class="text-[11px] uppercase tracking-wide text-slate-400">type these to Savi</div>
    <div class="text-[12px] leading-snug"><b class="text-sky-300">/style</b> <span class="text-slate-400">the active image set becomes her references</span></div>
    <div class="text-[12px] leading-snug"><b class="text-sky-300">/mods</b> <span class="text-slate-400">${f.mods?.installed?.length ? `${f.mods.installed.length} installed: ${esc(f.mods.installed.map((m) => m.name).join(", "))}` : "favi picks the mods your plan needs, installs them"}</span></div></div>`;
}

function sparkCard(f) {
  const sp = f.spark ?? {};
  const body = sp.text ? `<div class="text-[13px] leading-snug text-amber-50">${esc(sp.text)}</div>${sp.why ? `<div class="text-[11px] text-amber-200/70 leading-snug">${esc(sp.why)}</div>` : ""}`
    : sp.busy ? `<div class="text-[12px] text-amber-100 animate-pulse">favi's thinking up today's spark…</div>` : `<div class="text-[12px] text-amber-100/80">${sp.failed ? "the spark fizzled." : "no spark yet."}</div>`;
  const acts = sp.text && !sp.busy ? (sp.kept ? `<span class="text-[11px] text-emerald-300">✓ kept · favi remembers it</span>${btn("another", "fv('extra',{op:'spark',what:'another'})")}` : `${btn("keep", "fv('extra',{op:'spark',what:'keep'})", "main")}${btn("toss", "fv('extra',{op:'spark',what:'toss'})")}`) : sp.busy ? "" : btn("spark me", "fv('extra',{op:'spark',what:'another'})", "main");
  const n = f.sparks?.kept?.length ?? 0;
  return `<div class="rounded-2xl px-3 py-2 flex flex-col gap-1.5" style="background:linear-gradient(135deg,rgba(232,176,74,0.22),rgba(232,176,74,0.06));border:1px solid rgba(232,176,74,0.45)">
    <div class="flex justify-between items-center"><div class="text-[10px] uppercase tracking-widest text-amber-300">✦ today's spark</div>${n ? `<div class="text-[10px] text-amber-200/70">${n} kept</div>` : ""}</div>
    ${body}<div class="flex gap-1.5 items-center flex-wrap">${acts}</div></div>`;
}
function watchView(f) {
  const w = f.watch ?? {}, R = w.report;
  let body;
  const starting = f.watchReq?.k === "start" && f.watchReq.id !== f.watchReqDone;
  if (starting && !w.active) body = `<div class="flex flex-col items-center gap-2 py-8 text-center"><div class="text-[34px] animate-pulse">👀</div><div class="text-[13px] text-sky-200">favi's opening her eyes…</div></div>`;
  else if (w.active) body = `<div class="flex flex-col items-center gap-2 py-4 text-center"><div class="text-[34px] animate-pulse">👀</div><div class="text-[14px] font-semibold">favi's watching${w.name ? " " + esc(w.name) : ""}</div>
    <div class="text-[12px] text-slate-300 leading-snug">close god mode and play like a stranger would. she stops by herself after a minute.</div>
    <div class="text-[11px] ${(w.n ?? 0) ? "text-sky-300" : "text-amber-300"}">${(w.n ?? 0) ? `${w.n}s of play seen` : "waking her eyes up…"}</div>${f.watchReq?.k === "stop" && f.watchReq.id !== f.watchReqDone ? `<div class="flex flex-col items-center gap-1.5"><div class="text-[12px] text-sky-200 animate-pulse">wrapping up…</div>${btn("cancel", "fv('extra',{op:'cancel'})")}</div>` : `<div class="flex gap-1.5">${btn("done, read it now", "fv('extra',{op:'stop'})", "main")}${btn("cancel", "fv('extra',{op:'cancel'})")}</div>`}</div>`;
  else if (w.busy) body = `<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">writing up what she saw…</div>`;
  else body = `${w.error ? `<div class="rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-100 text-[12px] px-3 py-2">${esc(w.error)}</div>` : ""}
    ${R ? `<div class="flex items-end gap-2"><img src="${FAVI_IMG}" class="w-7 h-7 rounded-full object-cover shrink-0"/><div class="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-[13px] leading-snug">${esc(R.summary)}</div></div>
    <div class="flex flex-col gap-1.5 overflow-y-auto pr-1" style="max-height:40vh">${[["🧱", "stuck", R.stuck, "text-rose-200"], ["🥱", "bored", R.bored, "text-amber-200"], ["🧭", "lost", R.lost, "text-sky-200"], ["🔧", "try this", R.fixes, "text-emerald-200"]].map(([i, t, xs, c]) => `<div class="rounded-xl bg-white/5 border border-white/10 px-3 py-2"><div class="text-[11px] uppercase tracking-wide ${c}">${i} ${t}</div>${(xs ?? []).length ? xs.map((x) => `<div class="text-[12px] leading-snug mt-1">${esc(x)}</div>`).join("") : `<div class="text-[12px] text-slate-500 mt-1">nothing here</div>`}</div>`).join("")}</div>
    <div class="text-[10px] text-slate-500">from ${R.seconds}s of play · main favi knows this read too</div>` : `<div class="flex items-end gap-2"><img src="${FAVI_IMG}" class="w-7 h-7 rounded-full object-cover shrink-0"/><div class="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-[13px] leading-snug">let me watch you play for a minute. i'll tell you where you got stuck, bored or lost.</div></div>`}
    <button onclick="fv('extra',{op:'watch'})" class="w-full rounded-2xl bg-sky-500 active:bg-sky-600 text-white font-semibold py-2.5 text-[14px]">${R ? "watch me again" : "watch me play"} · 60s</button>`;
  return `${top("Playtest Eyes", "favi watches, then tells you", home)}${body}`;
}
function moodStrip(f) {
  const r = f.refs, set = r?.active ? r.styles?.[r.active] : null; if (!set || !(set.images ?? []).length) return "";
  return `<button onclick="fv('nav',{view:'refs'})" class="w-full text-left rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 active:bg-white/10"><div class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">moodboard · ${esc(set.name)} · favi keeps answers on style</div>
    <div class="flex gap-1 overflow-hidden">${set.images.slice(0, 8).map((img) => `<img src="${esc(img.url ?? img)}" class="w-9 h-9 rounded object-cover shrink-0 bg-black/30"/>`).join("")}</div></button>`;
}
function checkView(p, back) {
  const C = p.check ?? {};
  if (C.busy) return `${top("Plan vs game", esc(p.title), back)}<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">laying your file next to the game…</div>`;
  if (!C.items) return `${top("Plan vs game", esc(p.title), back)}<div class="text-[12px] text-rose-200">${esc(C.error ?? "no check yet.")}</div>${btn("check now", `fv('forge',{op:'check',pid:'${p.id}',again:true})`, "main")}`;
  const mark = { done: ["✓", "text-emerald-300"], half: ["◐", "text-amber-300"], missing: ["○", "text-rose-300"] };
  const n = (k) => C.items.filter((x) => x.status === k).length;
  return `${top("Plan vs game", esc(p.title), back)}
  <div class="flex items-center gap-3"><div class="text-[34px] font-bold text-sky-300">${C.pct}%</div><div class="text-[12px] text-slate-300 leading-snug">${esc(C.summary)}<div class="text-[11px] text-slate-400 mt-0.5">${n("done")} done · ${n("half")} half · ${n("missing")} missing</div></div></div>
  <div class="h-1.5 rounded bg-white/10"><div class="h-1.5 rounded bg-sky-400" style="width:${C.pct}%"></div></div>
  <div class="flex flex-col gap-1 overflow-y-auto pr-1" style="max-height:44vh">${C.items.map((x) => `<div class="flex gap-2 rounded-lg bg-white/5 px-2 py-1.5"><span class="${mark[x.status][1]} text-[14px] w-4 shrink-0">${mark[x.status][0]}</span><div class="min-w-0"><div class="text-[13px] font-semibold leading-snug">${esc(x.item)}</div><div class="text-[11px] text-slate-400 leading-snug">${esc(x.note)}</div></div></div>`).join("")}</div>
  <div>${btn("check again", `fv('forge',{op:'check',pid:'${p.id}',again:true})`)}</div>`;
}

function chatView(f) {
  const log = f.log ?? [{ who: "favi", text: GREETING }];
  const bubbles = log.map((m) => m.who === "you"
    ? `<div class="flex justify-end"><div class="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500 text-white px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap">${esc(m.text)}</div></div>`
    : `<div class="flex items-end gap-2"><img src="${FAVI_IMG}" class="w-6 h-6 rounded-full object-cover shrink-0"/><div class="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 text-slate-100 px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap">${esc(m.text).replace(/\*\*(.+?)\*\*/g, '<b class="text-sky-200">$1</b>').replace(/`([^`]+)`/g, '<span class="text-sky-200">$1</span>')}</div></div>`).join("");
  const typing = f.typing ? `<div class="flex items-end gap-2"><img src="${FAVI_IMG}" class="w-6 h-6 rounded-full object-cover"/><div class="rounded-2xl bg-white/10 px-3 py-2 text-slate-300 text-[13px] animate-pulse">looking at your game…</div></div>` : "";
  const waiting = Object.values(f.inbox ?? {}).filter((m) => !m.retry).sort((a, b) => a.at - b.at).map((m) => `<div class="flex justify-end"><div class="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500/60 text-white px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap">${esc(m.text)}<div class="text-[10px] text-sky-100/80 mt-0.5">sending…</div></div></div>`).join("");
  const queued = (f.queue ?? []).length ? `<div class="text-[11px] text-slate-400 text-right">${f.queue.length} up next</div>` : "";
  const retry = f.retry && !f.typing ? `<div class="flex justify-start pl-8">${btn("↻ retry", "fv('retry')", "main")}</div>` : "";
  const chips = ((f.chips ?? []).length ? f.chips : QUICK).map((q) => `<button onclick="faviSend(${js(q)})" class="shrink-0 rounded-full border border-sky-400/40 text-sky-200 px-2.5 py-1 text-[12px] active:bg-sky-500/30">${q}</button>`).join("");
  return `${top("Main Favi", f.typing ? "typing…" : "she can see your game", home, `<button id="favi-clear" onclick="faviClear(this)" class="shrink-0 rounded-full border border-rose-400/50 text-rose-200 active:bg-rose-500/20 px-3 py-1.5 text-[12px] font-semibold">🗑 clear</button>`)}
  ${moodStrip(f)}
  <div class="flex flex-col gap-2 overflow-y-auto pr-1" style="max-height:${moodStrip(f) ? 42 : 50}vh;display:flex;flex-direction:column-reverse"><div class="flex flex-col gap-2">${bubbles}${waiting}${typing}${retry}${queued}</div></div>
  <div class="flex gap-1.5 overflow-x-auto pb-1">${chips}</div>
  <div class="flex gap-2 items-end">
    <textarea id="favi-in" rows="1" onkeydown="faviKey(event)" placeholder="talk to favi…" class="flex-1 resize-none rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-[14px] text-white placeholder-slate-400 outline-none focus:border-sky-400"></textarea>
    <button onclick="faviSend()" class="rounded-full bg-sky-500 active:bg-sky-600 text-white font-semibold px-4 py-2 text-[14px]">send</button></div>`;
}

function forgeList(f, u) {
  const fs = f.forge;
  const rows = fs.order.map((id) => fs.files[id]).filter(Boolean).map((p) => { const c = count(p);
    return `<button onclick="fv('forge',{op:'open',pid:'${p.id}'})" class="w-full text-left rounded-xl bg-white/5 border border-white/10 px-3 py-2 active:bg-white/10">
      <div class="flex justify-between gap-2"><span class="font-semibold text-[13px] truncate">${esc(p.title)}</span><span class="text-[11px] text-sky-300 shrink-0">${c.pct}%</span></div>
      <div class="text-[11px] text-slate-400 truncate">${esc(p.pitch)}</div>
      <div class="h-1 rounded bg-white/10 mt-1.5"><div class="h-1 rounded bg-sky-400" style="width:${c.pct}%"></div></div></button>`; }).join("");
  return `${top("Forge Files", "your Idea Forge, pocket size", home)}${errBox(u)}
  <div class="flex flex-col gap-1.5">${rows || `<div class="text-[12px] text-slate-400 py-2">no files yet. bring one over from Idea Forge, or start one here.</div>`}</div>
  <button onclick="fv('forge',{op:'fromGame'})" class="w-full text-left rounded-xl bg-amber-400/15 border border-amber-300/40 px-3 py-2 active:bg-amber-400/25"><div class="font-semibold text-[13px] text-amber-100">✦ Create from game</div><div class="text-[11px] text-amber-100/70 leading-snug">favi reads your plan so far and the game as it stands, writes it all into a new file, then asks what's next</div></button>
  <details class="rounded-xl bg-white/5 border border-white/10 px-3 py-2" ${fs.order.length ? "" : "open"}><summary class="text-[13px] font-semibold">bring a file from Idea Forge</summary>
    <div class="text-[11px] text-slate-400 my-1.5 leading-snug">in Idea Forge: open your file → Finalize → Plain Data → Copy. paste it here.</div>
    <textarea id="favi-import" rows="4" placeholder="GAME IDEA: …" class="w-full rounded-xl bg-black/30 border border-white/15 px-2 py-1.5 text-[12px] text-white outline-none focus:border-sky-400"></textarea>
    <div class="mt-1.5">${btn("import", "fv('forge',{op:'import',text:faviVal('favi-import')})", "main")}</div></details>
  <details class="rounded-xl bg-white/5 border border-white/10 px-3 py-2"><summary class="text-[13px] font-semibold">start a new file</summary>
    <input id="favi-pitch" placeholder="one sentence: your game idea" class="w-full mt-1.5 rounded-xl bg-black/30 border border-white/15 px-2 py-1.5 text-[13px] text-white outline-none focus:border-sky-400"/>
    <div class="mt-1.5">${btn("forge it", "fv('forge',{op:'new',pitch:faviVal('favi-pitch')})", "main")}</div></details>`;
}

function fieldRow(p, fl, u) {
  if (u.edit === fl.id) return `<div class="rounded-lg bg-sky-500/10 border border-sky-400/40 p-2"><div class="text-[11px] text-sky-200 mb-1">${esc(fl.label)}</div>
    <textarea id="favi-edit" rows="4" class="w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-[12px] text-white outline-none">${esc(fl.value)}</textarea>
    <div class="flex gap-1.5 mt-1">${btn("save", `fv('forge',{op:'save',pid:'${p.id}',fid:'${fl.id}',value:faviVal('favi-edit')})`, "main")}${btn("cancel", "fv('forge',{op:'edit',fid:null})")}</div></div>`;
  const v = String(fl.value ?? "").trim(); const fresh = fl.glow && p.lastRound?.at && fl.glow >= p.lastRound.at;
  return `<button onclick="fv('forge',{op:'edit',fid:'${fl.id}'})" class="w-full text-left rounded-lg px-2 py-1.5 active:bg-white/10"><div class="text-[11px] ${v ? "text-sky-200" : "text-slate-500"}">${esc(fl.label)}${fresh ? ' <span class="text-emerald-300">✦ new</span>' : ""}</div>
    <div class="text-[12px] leading-snug ${v ? "text-slate-100" : "text-slate-500 italic"} whitespace-pre-wrap">${v ? esc(v.length > 260 ? v.slice(0, 260) + "…" : v) : "empty · tap to fill"}</div></button>`;
}
function buildView(p, u) {
  const err = p.error ? `<div class="rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-100 text-[12px] px-3 py-2">${esc(p.error)}</div>` : "";
  const bubble = (t) => `<div class="flex items-end gap-2"><img src="${FAVI_IMG}" class="w-6 h-6 rounded-full object-cover shrink-0"/><div class="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-[13px] leading-snug">${t}</div></div>`;
  const last = p.lastRound ? `<div class="text-[11px] text-emerald-300">✦ wrote into ${p.lastRound.fields} field${p.lastRound.fields === 1 ? "" : "s"}${p.lastRound.added?.length ? " · new: " + esc(p.lastRound.added.join(", ")) : ""}</div>` : "";
  if (p.busy) return `${err}${last}${bubble(`<span class="animate-pulse">${p.busy === "game" ? "reading your plan and your game, writing it all in…" : p.busy === "questions" ? "thinking up your next questions…" : "writing that into your file…"}</span>`)}`;
  const qs = p.questions ?? [];
  if (!qs.length) return `${err}${last}${bubble(`${(p.answered ?? 0) ? `${p.answered} answered so far. ` : ""}want me to ask you some questions about this one?`)}
    <button onclick="fv('forge',{op:'ask',pid:'${p.id}'})" class="w-full rounded-2xl bg-sky-500 active:bg-sky-600 text-white font-semibold py-2.5 text-[14px]">ask me</button>`;
  const draft = p.draft ?? {};
  const cards = qs.map((q, i) => `<div class="rounded-xl bg-white/5 border border-white/10 p-2.5 flex flex-col gap-1.5">
    <div class="text-[10px] uppercase tracking-wide text-sky-300">${esc(q.category)}</div>
    <div class="text-[13px] font-semibold leading-snug">${i + 1}. ${esc(q.text)}</div>
    ${q.options.map((o) => `<button onclick="faviPick('${q.id}',${js(o)})" class="text-left rounded-lg border border-sky-400/30 text-sky-100 px-2 py-1.5 text-[12px] leading-snug active:bg-sky-500/30">${esc(o)}</button>`).join("")}
    <textarea id="fa-${q.id}" data-q="${q.id}" rows="2" placeholder="tap one, edit it, or write your own" class="w-full rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-[12px] text-white outline-none focus:border-sky-400">${esc(draft[q.id] ?? "")}</textarea></div>`).join("");
  return `${err}${last}${bubble("answer what you want, skip the rest.")}
  <div class="flex flex-col gap-2 overflow-y-auto pr-1" style="max-height:46vh">${cards}
    <details class="rounded-xl bg-white/5 border border-white/10 px-3 py-2"><summary class="text-[12px] font-semibold">or tell favi something unasked</summary>
      <textarea id="favi-sug" rows="3" placeholder="add a boss rush, make it co-op…" class="w-full mt-1.5 rounded-lg bg-black/30 border border-white/15 px-2 py-1.5 text-[12px] text-white outline-none"></textarea>
      <div class="mt-1.5">${btn("add it", `fv('forge',{op:'suggest',pid:'${p.id}',text:faviVal('favi-sug')})`)}</div></details></div>
  <div class="flex gap-2"><button onclick="fv('forge',{op:'answer',pid:'${p.id}',answers:faviAnswers()})" class="flex-1 rounded-2xl bg-sky-500 active:bg-sky-600 text-white font-semibold py-2.5 text-[14px]">send answers</button>${btn("new questions", `fv('forge',{op:'ask',pid:'${p.id}'})`)}</div>`;
}
function forgeFile(f, u, p) {
  const c = count(p);
  const tab = u.tab === "file" ? "file" : "build";
  const tb = (k, label) => `<button onclick="fv('forge',{op:'tab',tab:'${k}'})" class="flex-1 rounded-full py-1.5 text-[12px] font-semibold ${tab === k ? "bg-sky-500 text-white" : "text-slate-300"}">${label}</button>`;
  const tabs = `<div class="flex gap-1 rounded-full bg-white/5 p-1">${tb("build", "build with favi")}${tb("file", "the file")}</div>`;
  if (tab === "build") return `${top(esc(p.title), `${c.filled}/${c.total} fields · ${c.pct}%`, `fv('forge',{op:'close'})`)}${errBox(u)}${tabs}
  <div class="h-1 rounded bg-white/10"><div class="h-1 rounded bg-sky-400" style="width:${c.pct}%"></div></div>${buildView(p, u)}`;
  const cats = p.cats.map((cat) => { const n = cat.fields.filter((x) => String(x.value ?? "").trim()).length;
    return `<details class="rounded-xl bg-white/5 border border-white/10" ${cat.fields.some((x) => x.id === u.edit) ? "open" : ""}><summary class="px-3 py-2 text-[13px] font-semibold flex justify-between">${esc(cat.name)}<span class="text-[11px] text-slate-400 font-normal">${n}/${cat.fields.length}</span></summary>
      <div class="px-1 pb-1">${cat.fields.map((fl) => fieldRow(p, fl, u)).join("")}</div></details>`; }).join("");
  return `${top(esc(p.title), `${c.filled}/${c.total} fields · ${c.pct}%`, `fv('forge',{op:'close'})`)}${errBox(u)}${tabs}
  <div class="text-[12px] text-slate-300 leading-snug">${esc(p.pitch)}</div>
  <button onclick="fv('forge',{op:'finalize',pid:'${p.id}'})" class="w-full rounded-2xl bg-amber-400 active:bg-amber-500 text-slate-900 font-bold py-2.5 text-[14px]">Finalize ✦</button>
  <div class="flex flex-col gap-1.5 overflow-y-auto pr-1" style="max-height:52vh">${cats}</div>
  <div class="pt-1">${btn("delete file", `faviArm(this,'tap again to delete',()=>fv('forge',{op:'delete',pid:'${p.id}'}))`, "danger")}</div>`;
}
function outBox(id, text) {
  return `<textarea id="${id}" readonly class="w-full rounded-xl bg-black/30 border border-white/15 px-2 py-1.5 text-[11px] text-slate-100" style="height:44vh;white-space:pre-wrap">${esc(text)}</textarea>
  <div class="flex gap-1.5"><button id="${id}-btn" onclick="faviCopy('${id}')" class="bg-sky-500 active:bg-sky-600 text-white font-semibold rounded-full px-3 py-1.5 text-[12px]">copy</button></div>`;
}
function forgeFinal(f, u, p) {
  const fin = u.final, back = `fv('forge',{op:'back',pid:'${p.id}'})`;
  if (fin.kind === "menu") {
    const item = (onclick, title, sub, ready) => `<button onclick="${onclick}" class="w-full text-left rounded-xl bg-white/5 border border-white/10 px-3 py-2 active:bg-white/10"><div class="flex justify-between"><span class="text-[13px] font-semibold">${title}</span>${ready ? `<span class="text-[10px] text-emerald-300">ready</span>` : ""}</div><div class="text-[11px] text-slate-400">${sub}</div></button>`;
    return `${top("Finalize", esc(p.title), back)}
    <button onclick="fv('forge',{op:'build',pid:'${p.id}'})" class="w-full rounded-2xl bg-sky-500 active:bg-sky-600 text-white font-bold py-2.5 text-[14px]">build it with Savi ⚒</button>
    <div class="text-[11px] text-slate-400 leading-snug -mt-1">${p.sent ? "sent to Savi · tap again to resend" : "favi writes the Savi build brief and hands it over. she builds it right here."}</div>
    <div class="text-[11px] uppercase tracking-wide text-slate-400 mt-1">prompts</div>
    ${PRESETS.map(([k, name, sub]) => item(`fv('forge',{op:'prompt',pid:'${p.id}',preset:'${k}'})`, name, sub, p.prompts?.[k])).join("")}
    <div class="text-[11px] uppercase tracking-wide text-slate-400 mt-1">check it</div>
    ${item(`fv('forge',{op:'check',pid:'${p.id}'})`, "Plan vs game", p.check?.pct != null ? `${p.check.pct}% built · done, half done, missing` : "your file next to what's actually built", p.check?.items)}
    ${item(`fv('forge',{op:'rate',pid:'${p.id}'})`, "Rate it", "five scores, what's strong, what's weak", p.rating?.scores)}
    ${item(`fv('forge',{op:'card',pid:'${p.id}'})`, "Pitch card", "the one screen that sells it", p.card?.title)}
    ${item(`fv('forge',{op:'plain',pid:'${p.id}'})`, "Plain Data", "the file exactly as it stands", true)}`;
  }
  if (fin.kind === "sent") return `${top("Build it with Savi", esc(p.title), back)}${fin.busy
    ? `<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">writing Savi's build brief from every field…</div>`
    : `<div class="flex flex-col items-center gap-2 py-4 text-center"><div class="text-[32px]">⚒</div><div class="text-[14px] font-semibold">handed to Savi</div><div class="text-[12px] text-slate-300 leading-snug">she's got the whole file. watch her chat, the world starts changing in a minute.</div></div>
    <div>${btn("read the brief", `fv('forge',{op:'prompt',pid:'${p.id}',preset:'spawn'})`)}</div>`}`;
  if (fin.kind === "check") return checkView(p, back);
  if (fin.kind === "plain") return `${top("Plain Data", esc(p.title), back)}${outBox("favi-out", plainData(p))}`;
  if (fin.kind === "prompt") {
    const name = (PRESETS.find((x) => x[0] === fin.preset) ?? PRESETS[0])[1];
    if (fin.busy) return `${top("Prompt · " + name, esc(p.title), back)}<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">forging your prompt from every field…</div><div class="text-[11px] text-slate-400 text-center">under a minute. look around, it keeps going.</div>`;
    const text = p.prompts?.[fin.preset] ?? "";
    return `${top("Prompt · " + name, esc(p.title), back)}${fin.fallback ? `<div class="text-[11px] text-amber-300">the model didn't answer in time, so favi stitched it from your fields. tap rewrite to try again.</div>` : ""}${outBox("favi-out", text)}
    <div>${btn("rewrite", `fv('forge',{op:'prompt',pid:'${p.id}',preset:'${fin.preset}'})`)}</div>`;
  }
  if (fin.kind === "rate") {
    const R = p.rating ?? {};
    if (R.busy) return `${top("Rating", esc(p.title), back)}<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">reading every field…</div>`;
    if (R.failed || !R.scores) return `${top("Rating", esc(p.title), back)}<div class="text-[12px] text-rose-200">couldn't rate it this time.</div>${btn("try again", `fv('forge',{op:'rate',pid:'${p.id}'})`, "main")}`;
    const bars = RATE_AXES.map((k) => `<div class="flex items-center gap-2 text-[12px]"><span class="w-20 text-slate-300">${k}</span><div class="flex-1 h-1.5 rounded bg-white/10"><div class="h-1.5 rounded bg-sky-400" style="width:${R.scores[k] * 10}%"></div></div><span class="w-5 text-right">${R.scores[k]}</span></div>`).join("");
    return `${top("Rating", esc(p.title), back)}<div class="text-center"><span class="text-[40px] font-bold text-sky-300">${R.overall}</span><span class="text-slate-400">/100</span></div>${bars}
    <div class="text-[12px] text-slate-200 leading-snug">${esc(R.verdict)}</div>
    ${(R.good ?? []).map((g) => `<div class="text-[12px] text-emerald-200">＋ ${esc(g)}</div>`).join("")}
    ${(R.bad ?? []).map((b) => `<div class="text-[12px] text-rose-200">－ ${esc(b.point)}<div class="text-slate-400 pl-3">fix: ${esc(b.fix)}</div></div>`).join("")}
    <div>${btn("rate again", `fv('forge',{op:'rate',pid:'${p.id}'})`)}</div>`;
  }
  if (fin.kind === "card") {
    const C = p.card ?? {};
    if (C.busy) return `${top("Pitch card", esc(p.title), back)}<div class="text-[14px] text-sky-200 animate-pulse py-8 text-center">painting the card…</div>`;
    if (C.failed || !C.title) return `${top("Pitch card", esc(p.title), back)}<div class="text-[12px] text-rose-200">couldn't make the card this time.</div>${btn("try again", `fv('forge',{op:'card',pid:'${p.id}'})`, "main")}`;
    const [bg, mid, acc] = C.palette;
    return `${top("Pitch card", esc(p.title), back)}
    <div class="rounded-2xl p-4 flex flex-col gap-2" style="background:linear-gradient(160deg,${bg},${mid});border:1px solid ${acc}">
      <div class="text-[10px] uppercase tracking-widest" style="color:${acc}">${esc(C.tag)}</div>
      <div class="text-[24px] font-bold leading-tight text-white">${esc(C.title)}</div>
      <div class="text-[13px] text-white/90 leading-snug">${esc(C.hook)}</div>
      ${C.points.map((x) => `<div class="text-[12px] text-white/85">✦ ${esc(x)}</div>`).join("")}</div>
    <div>${btn("new card", `fv('forge',{op:'card',pid:'${p.id}'})`)}</div>`;
  }
  return "";
}

function refsView(f, u) {
  const r = f.refs ?? { styles: {} };
  const pend = r.pending ? `<div class="rounded-xl bg-sky-500/15 border border-sky-400/30 px-3 py-2 text-[12px] text-sky-100 leading-snug"><span class="animate-pulse">favi's out hunting</span> for <b>${esc(r.pending.name)}</b>${r.pending.like ? ` like <img src="${esc(r.pending.like)}" class="inline w-6 h-6 rounded object-cover align-middle"/>` : ""}. Savi's fetching 10+ images and saving them here. if nothing lands in a minute, type <b>/style ${esc(r.pending.name)}</b> in Savi's chat.<div class="mt-1">${btn("cancel", "fv('refs',{op:'cancel'})")}</div></div>` : "";
  const sets = Object.entries(r.styles ?? {}).sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0)).map(([key, s]) => `<div class="rounded-xl bg-white/5 border ${r.active === key ? "border-sky-400/70" : "border-white/10"} p-2">
    <div class="flex items-center justify-between gap-2 mb-1.5"><div class="min-w-0"><div class="text-[13px] font-semibold truncate">${esc(s.name)}</div><div class="text-[11px] text-slate-400">${(s.images ?? []).length} images${r.active === key ? " · /style uses this" : ""}</div></div>
      <div class="flex gap-1 shrink-0">${r.active === key ? "" : btn("use", `fv('refs',{op:'use',key:'${key}'})`)}${btn("✕", `fv('refs',{op:'forget',key:'${key}'})`, "danger")}</div></div>
    <div class="grid grid-cols-4 gap-1">${(s.images ?? []).map((img) => { const url = img.url ?? img, on = u.pick?.key === key && u.pick?.url === url;
      return `<button onclick="fv('refs',{op:'pick',key:'${key}',url:${js(url)}})" class="relative p-0 rounded-md overflow-hidden ${on ? "ring-2 ring-amber-300" : ""}"><img src="${esc(url)}" class="w-full aspect-square object-cover bg-black/30 ${u.pick?.key === key && !on ? "opacity-40" : ""}"/>${img.seed ? `<span class="absolute top-0.5 left-0.5 text-[10px] bg-amber-300 text-slate-900 rounded px-1">★</span>` : ""}</button>`; }).join("")}</div>
    ${u.pick?.key === key ? `<div class="flex items-center gap-2 mt-1.5"><button onclick="fv('refs',{op:'more',key:'${key}',url:${js(u.pick.url)}})" class="flex-1 rounded-full bg-amber-400 active:bg-amber-500 text-slate-900 font-semibold py-1.5 text-[12px]">more like this one</button>${btn("cancel", `fv('refs',{op:'pick'})`)}</div>` : `<div class="text-[10px] text-slate-500 mt-1">tap an image to get more like it</div>`}</div>`).join("");
  return `${top("Reference Images", "a style in, 10+ images out", home)}${errBox(u)}
  <div class="flex gap-2"><input id="favi-style" placeholder="an art style: ukiyo-e, ps1 horror, gouache…" class="flex-1 min-w-0 rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-[13px] text-white placeholder-slate-400 outline-none focus:border-sky-400"/>
  <button onclick="fv('refs',{op:'request',style:faviVal('favi-style')})" class="rounded-full bg-sky-500 active:bg-sky-600 text-white font-semibold px-3 py-2 text-[13px] shrink-0">find</button></div>
  <div class="text-[11px] text-slate-400 leading-snug">then type <b>/style</b> in Savi's chat: she takes the active set as if you'd uploaded every image as a reference.</div>
  ${pend}<div class="flex flex-col gap-2 overflow-y-auto pr-1" style="max-height:52vh">${sets || (pend ? "" : `<div class="text-[12px] text-slate-500">no styles saved yet.</div>`)}</div>`;
}

// before (or without) favi's ranking: words of the current plan matched against each mod's keywords and gist
function guessFit(f) {
  const p = f.forge?.files?.[f.forge?.order?.[0]]; if (!p) return {};
  const words = new Set(JSON.stringify([p.title, p.pitch, ...(p.cats ?? []).flatMap((c) => c.fields.map((x) => x.value))]).toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []);
  const out = {}; for (const m of CATALOG) { let n = 0; for (const k of m.k ?? []) if (words.has(k) || k.split("-").every((w) => words.has(w))) n += 3; for (const w of m.g.toLowerCase().match(/[a-z]{5,}/g) ?? []) if (words.has(w)) n++; out[m.n] = n; } return out;
}
function marketView(f, u) {
  wantFull();
  const inst = new Set([...(f.mods?.installed ?? []).map((m) => m.name), ...(f.installedMods ?? [])]), asked = f.modAsks ?? {};
  const R = f.marketRank ?? {}, sc = R.scores ?? {}, guess = guessFit(f), ranked = Object.keys(sc).length > 0;
  const q = (u.q ?? "").toLowerCase();
  const hits = CATALOG.filter((m) => !q || m.n.includes(q) || m.g.toLowerCase().includes(q) || m.c.some((c) => c.includes(q)) || (m.k ?? []).some((k) => k.includes(q) || q.includes(k)) || (FULL[m.n] ?? "").toLowerCase().includes(q))
    .map((m, i) => ({ m, s: sc[m.n]?.s ?? -1, g: guess[m.n] ?? 0, i }))
    .sort((a, b) => b.s - a.s || b.g - a.g || a.i - b.i).map((x) => x.m);
  const fit = (m) => sc[m.n] ? `<span class="${sc[m.n].s >= 80 ? "text-emerald-300" : sc[m.n].s >= 55 ? "text-sky-300" : "text-slate-400"}">${sc[m.n].s}% fit</span>` : "";
  if (u.mod) { const m = CATALOG.find((x) => x.n === u.mod);
    if (m) { const full = FULL[m.n] ?? m.g;
      return `${top(esc(m.n), `v${m.v} · ${m.i} installs · ${m.l} likes`, "fv('market',{op:'open'})")}
    ${sc[m.n] ? `<div class="rounded-xl bg-sky-500/10 border border-sky-400/30 px-3 py-2 text-[12px] leading-snug">${fit(m)} for ${esc(R.title ?? "your project")} · ${esc(sc[m.n].why)}</div>` : ""}
    <div class="flex gap-2 items-center">${inst.has(m.n) ? `<span class="text-[12px] text-emerald-300">✓ in your game</span>` : m.p ? `<span class="text-[11px] text-amber-300">${m.p} spoins · buy it on spawn.co/mods/${esc(m.n)}</span>` : asked[m.n] ? `<span class="text-[12px] text-sky-200">asked Savi to install it</span>` : btn("install", `fv('market',{op:'install',name:'${m.n}'})`, "main")}${btn("ask favi", `fv('market',{op:'ask',name:'${m.n}'})`)}${m.p ? "" : `<span class="text-[11px] text-emerald-300">free</span>`}</div>
    ${m.c.length ? `<div class="text-[12px] text-slate-300">commands for Savi: ${m.c.map((c) => `<b class="text-sky-300">/${esc(c)}</b>`).join(" ")}</div>` : ""}
    <div class="overflow-y-auto pr-1 text-[12px] leading-relaxed text-slate-100 whitespace-pre-wrap" style="max-height:48vh">${esc(full)}</div>`; } }
  const rows = hits.slice(0, 40).map((m) => `<button onclick="fv('market',{op:'open',name:'${m.n}'})" class="w-full text-left rounded-xl bg-white/5 border border-white/10 px-3 py-2 active:bg-white/10">
    <div class="flex justify-between gap-2"><span class="font-semibold text-[13px] truncate">${esc(m.n)}</span><span class="text-[10px] shrink-0 flex gap-1.5">${fit(m)}<span class="${inst.has(m.n) ? "text-emerald-300" : m.p ? "text-amber-300" : "text-slate-400"}">${inst.has(m.n) ? "✓ installed" : m.p ? m.p + " sp" : m.i + " ↓"}</span></span></div>
    <div class="text-[11px] text-slate-400 leading-snug" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(sc[m.n]?.why ?? m.g)}</div></button>`).join("");
  const status = R.busy ? `<span class="animate-pulse text-sky-200">ranking for ${esc(R.title ?? "your project")}…</span>` : ranked ? `sorted by fit for <b>${esc(R.title)}</b> · ${btn("re-rank", "fv('market',{op:'rank'})")}` : R.failed ? `couldn't rank this time · ${btn("try again", "fv('market',{op:'rank'})")}` : R.empty ? "start a Forge file and favi sorts these for it" : btn("rank for my project", "fv('market',{op:'rank'})");
  return `${top("Mod Market", `${CATALOG.length} mods · favi knows every one`, home)}
  <div class="flex gap-2"><input id="favi-mq" value="${esc(u.q ?? "")}" placeholder="horror, camera, ui, combat…" class="flex-1 min-w-0 rounded-2xl bg-white/10 border border-white/15 px-3 py-2 text-[13px] text-white placeholder-slate-400 outline-none focus:border-sky-400"/>
  <button onclick="fv('market',{op:'search',q:faviVal('favi-mq')})" class="rounded-full bg-sky-500 active:bg-sky-600 text-white font-semibold px-3 py-2 text-[13px] shrink-0">find</button></div>
  <div class="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">${status}</div>
  <div class="flex flex-col gap-1.5 overflow-y-auto pr-1" style="max-height:50vh">${rows || `<div class="text-[12px] text-slate-500">nothing matches that.</div>`}${hits.length > 40 ? `<div class="text-[11px] text-slate-500 text-center">${hits.length - 40} more, narrow the search</div>` : ""}</div>`;
}

export default function render(ctx, player) {
  try { return renderTab(ctx, player); }
  catch (e) { try { console.error("favi tab", e); } catch {} localView = null;
    return `<div id="favi-root" data-me="${esc(player?.id ?? "")}" class="w-full rounded-2xl p-3 text-[13px] text-rose-100" style="background:rgba(9,14,28,0.95)">favi hit a snag drawing this page: ${esc(String(e?.message ?? e)).slice(0, 160)}<br/><button onclick="fv('nav',{view:'home'})" class="mt-2 rounded-full border border-white/20 px-3 py-1.5">back to favi</button></div>`; }
}
function renderTab(ctx, player) {
  const f = ctx?.world?.state?.favi ?? { log: [{ who: "favi", text: GREETING }] };
  const su = f.ui?.[player?.id] ?? { view: "home" };
  const u = localView && su.view !== localView ? { ...su, view: localView } : su;
  f.forge ??= { files: {}, order: [] };
  let body;
  if (u.view === "chat") body = chatView(f);
  else if (u.view === "forge") { const p = u.open ? f.forge.files[u.open] : null; body = !p ? forgeList(f, u) : u.final ? forgeFinal(f, u, p) : forgeFile(f, u, p); }
  else if (u.view === "refs") body = refsView(f, u);
  else if (u.view === "market") body = marketView(f, u);
  else if (u.view === "watch") body = watchView(f);
  else body = homeView(f);
  return `<div id="favi-root" data-me="${esc(player?.id ?? "")}" class="w-full flex flex-col gap-2 text-slate-100 rounded-2xl p-2" style="font-family:system-ui,-apple-system,sans-serif;background:rgba(9,14,28,0.95);box-shadow:0 6px 24px rgba(0,0,0,0.5)">${body}</div>`;
}

// Favi floats: her tab lifts out of the rail's column into a window pinned high on the screen (top-left, clear of Savi's chat
// sheet at the bottom and Spawn's rail on the right), so she stays usable while Savi works. The HTML above still renders into it.
let lifted = null;
export function onMount(container) {
  if (container) { for (const k of ["position","top","left","right","maxWidth","maxHeight","overflowY","zIndex","padding","background","border","borderRadius","boxShadow"]) container.style[k] = ""; container.style.pointerEvents = "none"; }
  const el = globalThis.document?.getElementById("tome-creator-ui"); if (!el) return;
  lifted = { el, top: el.style.top, height: el.style.height, maxHeight: el.style.maxHeight };
  Object.assign(el.style, { top: "56px", height: "auto", maxHeight: "48vh" });
  lifted.bg = el.style.background; el.style.background = "rgba(9,14,28,0.92)";
}
export function onDestroy() { if (lifted) Object.assign(lifted.el.style, { top: lifted.top, height: lifted.height, maxHeight: lifted.maxHeight, background: lifted.bg ?? "" }); lifted = null; }
