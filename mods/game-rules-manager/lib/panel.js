// The Game Rules Manager's screen. The host ui.js splices rulesHtml(ctx, player) into its render and
// re-exports grm + grmType as page globals; the draft lives in this module, saves go out as
// sendAction("rulesSave", { all?, game? }).
import { FILES, SKIP, parse, parseSkip, serialize, serializeSkip } from "lib/rules-format.js";
import { zip, unzip } from "lib/zip.js";

const CSS = `<style>
#grm-dock{position:fixed;left:14px;top:278px;display:flex;gap:4px;align-items:stretch;z-index:30;pointer-events:none}
#grm-btn{display:flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;background:#1e1e1e;color:#f7f7f7;border:2px solid #cfcfcf;font:14px Georgia,serif;cursor:pointer;pointer-events:auto;box-shadow:3px 3px 0 rgba(0,0,0,.35);z-index:30}
#grm-btn:hover{background:#333333}
#grm-btn .dot{min-width:18px;height:18px;border-radius:9px;background:#cfcfcf;color:#1e1e1e;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
#grm-veil{position:fixed;inset:0;background:rgba(0,0,0,.6);pointer-events:auto;z-index:40;display:flex;align-items:center;justify-content:center;padding:24px calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px) 24px 24px}
#grm{width:min(860px,100%);max-height:min(86vh,900px);display:flex;flex-direction:column;background:#f7f7f7;color:#1e1e1e;border:3px solid #1e1e1e;border-radius:14px;box-shadow:6px 6px 0 rgba(0,0,0,.35);font:15px/1.5 Georgia,serif;overflow:hidden}
#grm header{display:flex;align-items:center;gap:12px;padding:14px 18px 0;background:#1e1e1e;color:#f7f7f7}
#grm h2{margin:0 0 12px;font-size:20px;letter-spacing:.04em;flex:1}
#grm .gx{background:#333333;border:2px solid #e2e2e2;border-radius:10px;color:#f7f7f7;font:14px Georgia,serif;padding:6px 12px;cursor:pointer;margin-bottom:12px}
#grm .gx:hover{background:#cfcfcf;color:#1e1e1e;border-color:#cfcfcf}
#grm .tabs{display:flex;gap:4px;padding:0 18px;background:#1e1e1e}
#grm .tab{padding:9px 16px;border:0;border-radius:10px 10px 0 0;background:#8a8a8a;color:#f7f7f7;font:inherit;cursor:pointer}
#grm .tab.on{background:#f7f7f7;color:#1e1e1e;font-weight:700}
#grm .file{padding:10px 18px;background:#e2e2e2;border-bottom:1px solid #8a8a8a;font-size:13px}
#grm .file b{font-family:ui-monospace,Menlo,monospace;font-size:13px}
#grm .file code{font-family:ui-monospace,Menlo,monospace;font-size:12px;opacity:.8;user-select:all}
#grm .legend{padding:6px 18px;font-size:12px;color:#555555;border-bottom:1px solid #e2e2e2;display:flex;gap:14px;flex-wrap:wrap}
#grm ol{list-style:none;margin:0;padding:6px 10px;overflow:auto;flex:1}
#grm li{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:start;padding:10px 8px;border-bottom:1px solid #e2e2e2}
#grm li.dirty{background:#fff6dc}
#grm .n{font-weight:700;font-size:17px;text-align:right;padding-top:1px}
#grm .t{white-space:pre-wrap;word-break:break-word}
#grm textarea{width:100%;min-height:70px;font:inherit;padding:6px 8px;border:2px solid #cfcfcf;border-radius:8px;resize:vertical;background:#fff;color:#1e1e1e}
#grm .ctl{display:flex;gap:4px;align-items:center}
#grm .ctl button{width:30px;height:30px;border-radius:8px;border:1px solid #8a8a8a;background:#fff;color:#1e1e1e;cursor:pointer;font-size:14px}
#grm .ctl button:hover:not(:disabled){background:#e2e2e2}
#grm .ctl button:disabled{opacity:.3;cursor:default}
#grm .ctl .del:hover{background:#f6d6d0}
.grm-b{display:inline-block;margin-top:4px;font:11px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;padding:3px 7px;border-radius:6px;text-transform:uppercase}
.grm-b.applied{background:#d8efdc;color:#1d5c2e;border:1px solid #6aa877}
.grm-b.pending{background:#fbeccc;color:#7a5a12;border:1px solid #cfcfcf}
.grm-b.out{background:#f3dede;color:#8a2b2b;border:1px solid #c98a8a;margin-left:4px}
.grm-b.inn{background:#ececec;color:#1e1e1e;border:1px solid #8a8a8a;margin-left:4px}
#grm .ctl .tog{width:auto;padding:0 8px;font-size:12px}
#grm .tab.outt{background:#a07a7a}#grm .tab.outt.on{background:#f7f7f7;color:#8a2b2b}
.grm-b.unsaved{background:#eaeaea;color:#1e1e1e;border:1px dashed #8a8a8a}
#grm footer{display:flex;gap:10px;align-items:center;padding:12px 18px;background:#e2e2e2;border-top:2px solid #1e1e1e;flex-wrap:wrap}
#grm footer .msg{flex:1;font-size:13px;min-width:180px}
#grm footer button{padding:9px 16px;border-radius:10px;font:inherit;cursor:pointer;border:2px solid #1e1e1e}
#grm .add{background:#fff;color:#1e1e1e}
#grm .save{background:#1e1e1e;color:#f7f7f7;font-weight:700}
#grm .save:disabled{opacity:.4;cursor:default}
#grm .empty{padding:24px;text-align:center;opacity:.7}
/* dark theme (default): the same layout, night colours */
#grm.dk{background:#141414;color:#e2e2e2;border-color:#8a8a8a}
#grm.dk header,#grm.dk .tabs{background:#0a0a0a}
#grm.dk .tab{background:#333333;color:#e2e2e2}
#grm.dk .tab.on{background:#141414;color:#cfcfcf}
#grm.dk .tab.outt{background:#5a3f46}#grm.dk .tab.outt.on{background:#141414;color:#e8a0a0}
#grm.dk .file{background:#1f1f1f;border-bottom-color:#333333;color:#e2e2e2}
#grm.dk .legend{color:#a8a8a8;border-bottom-color:#1e1e1e}
#grm.dk li{border-bottom-color:#1e1e1e}
#grm.dk li.dirty{background:#3a3320}
#grm.dk textarea{background:#0a0a0a;color:#f7f7f7}
#grm.dk .ctl button{background:#1e1e1e;color:#e2e2e2;border-color:#444444}
#grm.dk .ctl button:hover:not(:disabled){background:#333333}
#grm.dk .ctl .del:hover{background:#6a2f2f}
#grm.dk .grm-b.applied{background:#1f3a27;color:#9be0ab;border-color:#3f7a4f}
#grm.dk .grm-b.pending{background:#3d3218;color:#f0d38a;border-color:#a0832e}
#grm.dk .grm-b.unsaved{background:#262626;color:#cccccc;border-color:#707070}
#grm.dk .grm-b.out{background:#43252a;color:#f0b0b0;border-color:#8a4a4a}
#grm.dk .grm-b.inn{background:#2a2a2a;color:#d4d4d4;border-color:#5a5a5a}
#grm.dk footer{background:#0a0a0a;border-top-color:#333333}
#grm.dk .add{background:#1e1e1e;color:#e2e2e2;border-color:#8a8a8a}
#grm.dk .save{background:#cfcfcf;color:#141414;border-color:#cfcfcf}
#grm .mode{margin-right:0}
#grm-veil.emb{position:static;inset:auto;background:none;padding:0;display:block}
#grm.emb{width:100%;max-height:none;border-width:0;border-radius:0;box-shadow:none;font-size:13px}
#grm.emb header{flex-wrap:wrap;gap:6px;padding:10px 10px 0}
#grm.emb h2{flex-basis:100%;font-size:16px;margin:0 0 4px}
#grm.emb header .gx{font-size:12px;padding:4px 8px;margin-bottom:8px}
#grm.emb .tabs{padding:0 6px;flex-wrap:wrap}
#grm.emb .tab{padding:6px 8px;font-size:12px}
#grm.emb .file,#grm.emb .legend{padding:6px 10px}
#grm.emb li{grid-template-columns:24px 1fr;gap:6px}
#grm.emb li .ctl{grid-column:2;flex-wrap:wrap}
#grm.emb footer{padding:8px 10px}
#grm .file{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
#grm .file .fx{margin-left:auto;display:flex;gap:6px}
#grm .file .fx button{padding:4px 10px;border-radius:8px;border:1px solid #8a8a8a;background:#fff;color:#1e1e1e;font:12px Georgia,serif;cursor:pointer}
#grm .file .fx button:hover{background:#cfcfcf}
#grm.dk .file .fx button{background:#1e1e1e;color:#e2e2e2;border-color:#555555}
#grm.dk .file .fx button:hover{background:#333333}
#grm header .gx{position:static}
#grm{position:relative}
#grm-ask{position:absolute;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:2}
#grm-ask .box{width:min(440px,90%);background:#f7f7f7;color:#1e1e1e;border:3px solid #9b2c2c;border-radius:14px;box-shadow:6px 6px 0 rgba(0,0,0,.35);padding:18px 20px}
#grm.dk #grm-ask .box{background:#141414;color:#e2e2e2}
#grm-ask h3{margin:0 0 8px;font-size:18px}
#grm-ask q{display:block;margin:0 0 10px;padding:8px 10px;border-left:3px solid #cfcfcf;background:rgba(140,140,140,.15);font-style:italic;quotes:none;white-space:pre-wrap;word-break:break-word;max-height:30vh;overflow:auto}
#grm-ask p{margin:0 0 14px;font-size:13px;opacity:.8}
#grm-ask .grow{display:flex;gap:10px;justify-content:flex-end}
#grm-ask button{padding:8px 16px;border-radius:10px;font:inherit;cursor:pointer;border:2px solid #1e1e1e;background:#fff;color:#1e1e1e}
#grm-ask .yes{background:#9b2c2c;border-color:#9b2c2c;color:#fff;font-weight:700}
</style>`;

let ver = 0, lastKey = "", lastOut = "";
let open = false, hidden = false, isEd = false, tab = "all", editing = null, msg = "";
let seeding = false;
// embedded = drawn inside the mod's own god-mode tab (a 320 px column): always open, no dock button, no veil
let embedded = false;
let saved = { all: [], game: [], skip: [] }, draft = null, savedAt = -1, waiting = false, asked = false;
// touched = the editor changed the draft by hand. Only then does a draft outlive fresh file data: an
// untouched draft made before the files arrived was empty, and must never be mistaken for edits.
let touched = false;
// the row text when its edit began, and whether the row was born by "add": Cancel puts it back (or drops the new row)
let editOrig = null, editNew = false;
// the row index waiting on "delete this rule?"; null = no question open
let askDel = null;
// light/dark: dark unless this browser chose light before
let dark = true;
try { dark = globalThis.localStorage?.getItem("grm-theme") !== "light"; } catch {}
const reset = () => { draft = fresh(); touched = false; };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clone = (rows) => rows.map((r) => ({ ...r }));
const fresh = () => { const sk = new Set(saved.skip); return { all: saved.all.map((r) => ({ ...r, out: sk.has(r.text) })), game: clone(saved.game) }; };
// the tab "out" is a filtered view of the all-games rows; every press there acts on draft.all
const sc = () => (tab === "out" ? "all" : tab);
const skipOf = (rows) => rows.filter((r) => r.out && r.text.trim()).map((r) => r.text.trim());
const skipDirty = () => !!draft && JSON.stringify(skipOf(draft.all)) !== JSON.stringify(saved.all.filter((r) => saved.skip.includes(r.text)).map((r) => r.text));
const texts = (rows) => JSON.stringify(rows.map((r) => r.text.trim()));
const dirtyScopes = () => draft ? Object.keys(FILES).filter((s) => texts(draft[s]) !== texts(saved[s])) : [];
const anyDirty = () => dirtyScopes().length > 0 || skipDirty();
const rowDirty = (s, r, i) => saved[s][i]?.text !== r.text.trim();
const pendingCount = () => Object.keys(FILES).reduce((n, s) => n + saved[s].filter((r) => r.status === "pending").length, 0);

function rowHtml(s, r, i, n, view) {
  const ed = editing === i, dirty = rowDirty(s, r, i) || (s === "all" && !!r.out !== saved.skip.includes(saved.all[i]?.text) && saved.all[i]?.text === r.text.trim());
  const known = saved[s].find((o) => o.text === r.text.trim());
  const badge = dirty && !known ? `<span class="grm-b unsaved">● unsaved</span>` : (known ?? r).status === "applied" ? `<span class="grm-b applied">✓ applied · running</span>` : `<span class="grm-b pending">◌ saved · pending</span>`;
  const moved = (dirty && known && rowDirty(s, r, i) ? ` <span class="grm-b unsaved">↕ moved</span>` : "") + (s === "all" ? (r.out ? ` <span class="grm-b out">🚫 not in this game</span>` : ` <span class="grm-b inn">🎮 in this game</span>`) : "");
  const tog = s === "all" ? `<button class="tog" onclick="grm('out',${i})" title="${r.out ? "Use this rule in this game" : "Mark as not used in this game"}">${r.out ? "＋ use here" : "🚫 not here"}</button>` : "";
  const arrows = view === "out" ? "" : `<button onclick="grm('up',${i})" title="Move up" ${i === 0 ? "disabled" : ""}>▲</button><button onclick="grm('down',${i})" title="Move down" ${i === n - 1 ? "disabled" : ""}>▼</button>`;
  return `<li class="${dirty ? "dirty" : ""}"><span class="n">${i + 1}.</span><div>${ed ? `<textarea id="grm-ta-${s}-${i}" oninput="grmType(${i}, this.value)" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();grm('edit',${i})}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();grm('cancel',${i})}">${esc(r.text)}</textarea>` : `<div class="t" ondblclick="grm('edit',${i})">${esc(r.text) || "<i style='opacity:.5'>(empty)</i>"}</div>`}${badge}${moved}</div>
    <div class="ctl">${ed ? `<button class="tog" onclick="grm('edit',${i})" title="Keep this text (Enter)">✓ Done</button><button class="tog" onclick="grm('cancel',${i})" title="Discard this edit (Esc)">↶ Cancel</button>` : `${tog}${arrows}<button onclick="grm('edit',${i})" title="Edit">✎</button><button class="del" onclick="grm('del',${i})" title="Delete rule">🗑</button>`}</div></li>`;
}

// page globals (re-exported by the host ui.js). The engine repaints the HUD only when game state it reads
// moves; a press here changes this module's own state, so every press repaints #grm-root itself, at once.
function paint(focus) {
  ver++;
  const el = typeof document !== "undefined" && document.getElementById("grm-root");
  if (!el) return;
  el.innerHTML = inner();
  if (focus) { const ta = document.getElementById(focus); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
}
export function grmType(i, v) { if (draft?.[sc()]?.[i]) { draft[sc()][i].text = v; touched = true; } }
export function grm(a, i, s) {
  const rows = draft?.[sc()];
  if (a === "toggle") { open = !open; hidden = false; editing = null; msg = ""; if (open) { if (!touched || !anyDirty()) reset(); sendAction("rulesLoad"); } return paint(); }
  if (a === "close") { open = false; editing = null; askDel = null; return paint(); }
  if (a === "export") return doExport(s);
  if (a === "import") return pickImport(s);
  if (a === "theme") { dark = !dark; try { globalThis.localStorage?.setItem("grm-theme", dark ? "dark" : "light"); } catch {} return paint(editing !== null ? `grm-ta-${sc()}-${editing}` : null); }
  if (a !== "edit" && a !== "cancel") editing = null;
  msg = "";
  if (["up", "down", "delYes", "add", "out"].includes(a)) touched = true;
  if (a !== "del" && a !== "delYes") askDel = null;
  if (a === "tab") tab = s;
  else if (a === "up" && i > 0) [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
  else if (a === "down" && i < rows.length - 1) [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
  else if (a === "edit") { if (editing === i) editing = null; else { editing = i; editOrig = rows[i]?.text ?? ""; editNew = false; } }
  else if (a === "cancel" && rows?.[i]) { if (editNew) rows.splice(i, 1); else rows[i].text = editOrig ?? rows[i].text; editing = null; }
  else if (a === "del") askDel = i;
  else if (a === "delNo") askDel = null;
  else if (a === "delYes") { if (askDel !== null && rows?.[askDel]) rows.splice(askDel, 1); askDel = null; }
  else if (a === "out" && rows[i]) rows[i].out = !rows[i].out;
  else if (a === "add") { rows.push({ text: "", status: "pending" }); editing = rows.length - 1; editOrig = ""; editNew = true; }
  else if (a === "revert") reset();
  else if (a === "save") {
    const d = dirtyScopes(); if ((!d.length && !skipDirty()) || waiting) return;
    const payload = Object.fromEntries(d.map((k) => [k, draft[k].map((r) => ({ text: r.text })).filter((r) => r.text.trim())]));
    if (skipDirty() || d.includes("all")) payload.skip = skipOf(draft.all);
    const paths = d.map((k) => FILES[k].path).concat(payload.skip ? [SKIP.path] : []);
    waiting = true; msg = "Saving to " + paths.join(" and ") + "…";
    sendAction("rulesSave", payload);
  }
  paint(editing !== null ? `grm-ta-${sc()}-${editing}` : null);
}

function inner() {
  if (!isEd) return "";
  const pend = pendingCount();
  const btn = `<div id="grm-dock"><button id="grm-btn" onclick="grm('toggle')">📜 Game Rules${pend ? `<span class="dot" title="${pend} waiting to apply">${pend}</span>` : ""}</button></div>`;
  if (embedded) open = true;
  if (!open) return btn;
  const rows = draft[sc()], f = FILES[sc()], dirty = dirtyScopes(), outN = draft.all.filter((r) => r.out).length;
  const list = tab === "out" ? rows.map((r, i) => (r.out ? rowHtml("all", r, i, rows.length, "out") : "")).join("") : rows.map((r, i) => rowHtml(sc(), r, i, rows.length)).join("");
  const any = dirty.length || skipDirty();
  return (embedded ? "" : btn) + `<div id="grm-veil" class="${embedded ? "emb" : ""}" ${embedded ? "" : `data-modal onclick="if(event.target===this)grm('close')"`}><div id="grm" class="${dark ? "dk" : ""}${embedded ? " emb" : ""}" role="dialog">
    <header><h2>📜 Game Rules Manager</h2><button class="gx" onclick="grm('export',0,'every')" title="Download every list as one .zip (JSON + Markdown)">⬇ Export all</button><button class="gx" onclick="grm('import',0,'every')" title="Import a .zip, .json or .md: each list lands in its own tab">⬆ Import all</button><button class="gx mode" onclick="grm('theme')" title="Switch to ${dark ? "light" : "dark"} theme">${dark ? "☀ Light" : "🌙 Dark"}</button>${embedded ? "" : `<button class="gx" onclick="grm('close')" title="Close">Close ✕</button>`}</header>
    <div class="tabs">${Object.keys(FILES).map((k) => `<button class="tab ${k === tab ? "on" : ""}" onclick="grm('tab',0,'${k}')">${k === "all" ? "🌐 All games" : "🎮 Only this game"} (${draft[k].length})${dirty.includes(k) ? " ●" : ""}</button>`).join("")}<button class="tab outt ${tab === "out" ? "on" : ""}" onclick="grm('tab',0,'out')">🚫 Not in this game (${outN})${skipDirty() ? " ●" : ""}</button></div>
    <div class="file">${tab === "out" ? `Rules from <b>${esc(FILES.all.path.split("/").pop())}</b> this game does not use · list kept in <code>${esc(SKIP.path)}</code> <span style="opacity:.7">(this world's files)</span>` : `File: <b>${esc(f.path.split("/").pop())}</b> &nbsp;·&nbsp; Full path: <code>${esc(f.path)}</code> <span style="opacity:.7">(this world's files)</span>${tab === "all" ? ` &nbsp;·&nbsp; ${outN} not in this game` : ""}`}<span class="fx"><button onclick="grm('export',0,'${tab}')" title="Download this tab as a .zip (JSON + Markdown)">⬇ Export</button><button onclick="grm('import',0,'${tab}')" title="Import a .zip, .json or .md into this tab">⬆ Import</button></span></div>
    <div class="legend"><span><span class="grm-b applied">✓ applied · running</span> Savi follows it now</span><span><span class="grm-b pending">◌ saved · pending</span> in the file, Savi syncs it next</span><span><span class="grm-b unsaved">● unsaved</span> only on your screen</span></div>
    <ol>${list || `<div class="empty">${seeding && tab !== "out" ? "⏳ Syncing your rules… Savi is filling these files from your own notes. Or ⬆ Import a backup now." : tab === "out" ? "Every all-games rule is used in this game." : "No rules yet. Add one below."}</div>`}</ol>
    <footer><span class="msg">${esc(msg || (any ? `Unsaved changes in: ${dirty.map((k) => FILES[k].label).concat(skipDirty() ? ["Not in this game"] : []).join(", ")}` : "Everything saved."))}</span>${any ? `<button class="add" onclick="grm('revert')">↺ Undo changes</button>` : ""}${tab === "out" ? "" : `<button class="add" onclick="grm('add')">＋ Add rule</button>`}${embedded ? "" : `<button class="add" onclick="grm('close')">Close</button>`}<button class="save" onclick="grm('save')" ${any && !waiting ? "" : "disabled"}>${waiting ? "Saving…" : "💾 Save"}</button></footer>${askDel !== null && rows[askDel] ? `<div id="grm-ask" onclick="if(event.target===this)grm('delNo')"><div class="box" role="alertdialog"><h3>🗑 Delete rule ${askDel + 1}?</h3><q>${esc(rows[askDel].text) || "(empty)"}</q><p>It leaves the list now and is gone from ${esc(FILES[sc()].path)} when you press Save. Until then, ↺ Undo changes brings it back.</p><div class="grow"><button onclick="grm('delNo')">Keep it</button><button class="yes" onclick="grm('delYes')">Delete</button></div></div></div>` : ""}
  </div></div>`;
}

// the host render calls this and splices the string in; the same inner() the presses paint with
export function rulesHtml(ctx, player, opts) {
  if (opts?.embedded && !embedded) { embedded = true; ver++; }
  const g = ctx?.world?.state?.grm;
  if (g && g.savedAt !== savedAt) {
    savedAt = g.savedAt;
    saved = { all: clone(g.all?.rows ?? []), game: clone(g.game?.rows ?? []), skip: [...(g.skip ?? [])] };
    seeding = !!g.seeding;
    ver++;
    if (waiting) { waiting = false; msg = "Saved ✓ written to the file and this game. Savi is syncing pending rules."; touched = false; }
    if (!touched || !anyDirty()) reset();
  }
  if (!g && !asked) { asked = true; sendAction("rulesLoad"); }
  if (!draft) reset();
  isEd = embedded || !!player?.isEditor;
  if (!isEd) return "";
  const key = ver + "|" + savedAt;
  if (key !== lastKey) { lastKey = key; lastOut = CSS + `<div id="grm-root">${inner()}</div>`; }
  return lastOut;
}


// ---- export / import (all in the browser; imports land in the draft, Save writes them) ----
const TABN = { all: "All games", game: "Only this game", out: "Not in this game" };
const STEM = { all: "ALL_GAMES_RULES", game: "GAME_RULES", out: "NOT_IN_THIS_GAME" };
const statusOf = (s, t) => saved[s].find((o) => o.text === t)?.status ?? "pending";
const rowsFor = (s) => draft[s].filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim(), status: statusOf(s, r.text.trim()) }));
const jsonRows = (s) => rowsFor(s).map((r, i) => ({ n: i + 1, text: r.text, status: r.status, ...(s === "all" ? { notInThisGame: !!draft.all.find((o) => o.text.trim() === r.text)?.out } : {}) }));
const md = (k) => (k === "out" ? serializeSkip(skipOf(draft.all)) : serialize(k, rowsFor(k)));
const filesFor = (k, stamp) => {
  const keys = k === "every" ? ["all", "game", "out"] : [k];
  const data = { format: "game-rules-manager", version: 1, exportedAt: stamp };
  for (const x of keys) data[x === "out" ? "notInThisGame" : x] = x === "out" ? skipOf(draft.all) : jsonRows(x);
  const name = k === "every" ? "rules" : STEM[k];
  return [{ name: name + ".json", text: JSON.stringify(data, null, 2) + "\n" }, ...keys.map((x) => ({ name: STEM[x] + ".md", text: md(x) }))];
};
function doExport(k) {
  if (!draft) return;
  const stamp = new Date().toISOString(), day = stamp.slice(0, 10);
  const bytes = zip(filesFor(k, stamp));
  const name = `game-rules-${k === "every" ? "all-tabs" : k === "out" ? "not-in-this-game" : k === "all" ? "all-games" : "only-this-game"}-${day}.zip`;
  try {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    msg = `⬇ Exported ${name}` + (anyDirty() ? " (includes your unsaved changes)" : "");
  } catch (e) { msg = "Export failed: " + (e?.message ?? e); }
  paint();
}
function pickImport(k) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".zip,.json,.md,.txt"; inp.multiple = true; inp.style.display = "none";
  inp.onchange = async () => {
    try {
      const got = [];
      for (const f of inp.files) {
        const buf = new Uint8Array(await f.arrayBuffer());
        if (/\.zip$/i.test(f.name) || (buf[0] === 0x50 && buf[1] === 0x4b)) got.push(...(await unzip(buf)));
        else got.push({ name: f.name, text: new TextDecoder().decode(buf) });
      }
      applyImport(k, got);
    } catch (e) { msg = "Import failed: " + (e?.message ?? e); }
    inp.remove(); paint();
  };
  document.body.appendChild(inp); inp.click();
}
// which list a file holds: by its name, then its title line; null = unmarked (goes to the tab you pressed in)
const scopeOfMd = (name, text) => {
  const n = name.toUpperCase(), head = (String(text).split("\n").find((l) => l.trim()) ?? "").toLowerCase();
  if (/NOT_IN_THIS_GAME|NOT-IN-THIS-GAME/.test(n) || head.includes("not used in this game")) return "out";
  if (/ALL_GAMES|ALL-GAMES/.test(n) || head.includes("all games")) return "all";
  if (/GAME_RULES|ONLY-THIS-GAME/.test(n) || head.includes("this game")) return "game";
  return null;
};
function collect(k, files) {
  const lists = { all: [], game: [], out: [] }, cur = k === "every" ? "game" : k;
  const jsons = files.filter((f) => /\.json$/i.test(f.name));
  const take = (x, texts) => lists[x].push(...texts.map((t) => String(t?.text ?? t ?? "").replace(/\s+/g, " ").trim()).filter(Boolean));
  for (const f of jsons) {
    let d; try { d = JSON.parse(f.text); } catch { continue; }
    if (Array.isArray(d)) { take(cur, d); continue; }
    if (Array.isArray(d.all)) { take("all", d.all); take("out", d.all.filter((r) => r?.notInThisGame)); }
    if (Array.isArray(d.game)) take("game", d.game);
    if (Array.isArray(d.notInThisGame)) take("out", d.notInThisGame);
  }
  if (!jsons.length) for (const f of files) {
    if (!/\.(md|txt)$/i.test(f.name)) continue;
    const x = scopeOfMd(f.name, f.text) ?? cur;
    if (x === "out") take("out", parseSkip(f.text));
    else { const rows = parse(f.text); take(x, rows.length ? rows : String(f.text).split("\n").map((l) => /^\s*[-*]\s+(.+)$/.exec(l)?.[1]).filter(Boolean)); }
  }
  return lists;
}
function applyImport(k, files) {
  const lists = collect(k, files), want = k === "every" ? ["all", "game", "out"] : [k];
  const done = [];
  for (const x of want) {
    const texts = [...new Set(lists[x])];
    if (!texts.length) continue;
    let added = 0, marked = 0;
    if (x === "out") {
      for (const t of texts) {
        const row = draft.all.find((r) => r.text.trim() === t);
        if (row) { if (!row.out) { row.out = true; marked++; } }
        else { draft.all.push({ text: t, status: "pending", out: true }); added++; marked++; }
      }
      if (marked) done.push(`${marked} marked not in this game${added ? ` (${added} new)` : ""}`);
    } else {
      const have = new Set(draft[x].map((r) => r.text.trim()));
      for (const t of texts) if (!have.has(t)) { draft[x].push({ text: t, status: "pending" }); have.add(t); added++; }
      if (added) done.push(`${added} new in ${TABN[x]}`);
    }
  }
  if (done.length) { touched = true; editing = null; msg = `⬆ Imported: ${done.join(", ")}. Rules already listed were skipped. Press 💾 Save to write them.`; }
  else msg = files.length ? "Nothing new to import: every rule in that file is already here." : "No rules found in that file.";
}
