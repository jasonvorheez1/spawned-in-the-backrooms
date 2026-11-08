// ui-find.js — Edit ▸ Find & Replace…, the window over the app. PURE: render(ui) -> html string, "" when closed — no api, no SQL, no state writes, no engine calls. Every payload carries both typed fields read off the DOM, so a toggle can never lose them.

const REFS = require("lib/refs.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Fields read off the DOM at press time — the window is pure; the realm holds the typed text.
const READ = "var q=document.getElementById('sb-find-q');var r=document.getElementById('sb-find-r');";

export function send(action, extra) {
  return (
    "event.stopPropagation();(function(){" +
    READ +
    "sendAction('" +
    Q(action) +
    "', { query: q?q.value:'', replacement: r?r.value:''" +
    (extra ? ", " + extra : "") +
    " });})()"
  );
}

const FIELD_LABEL = { title: "title", summary: "summary", section: "section", page: "page", tag: "tag" };

export function optToggle(id, label, on, title) {
  return `<button class="sbf-opt${on ? " on" : ""}" data-interactive title="${E(title || label)}"
    onclick="${send("findOpt", "opt: '" + Q(id) + "', on: " + (on ? "false" : "true"))}">${E(label)}</button>`;
}

export function fieldToggle(id, label, on) {
  return `<button class="sbf-field${on ? " on" : ""}" data-interactive
    onclick="${send("findOpt", "field: '" + Q(id) + "', on: " + (on ? "false" : "true"))}">${E(label)}</button>`;
}

export function marked(m) {
  const s = String(m.excerpt || "");
  const a = Math.max(0, Math.min(s.length, Math.floor(Number(m.excerptStart) || 0)));
  const b = Math.max(a, Math.min(s.length, Math.floor(Number(m.excerptEnd) || a)));
  if (b <= a) return E(s);
  return `${E(s.slice(0, a))}<mark class="sbf-hit">${E(s.slice(a, b))}</mark>${E(s.slice(b))}`;
}

export function whereOf(m) {
  const kind = FIELD_LABEL[String(m.field || "")] || String(m.field || "");
  if (m.field === "section" && m.sectionName) return kind + " · " + String(m.sectionName);
  if (m.field === "page" && m.pageTitle) return kind + " · " + String(m.pageTitle);
  return kind;
}

export function matchRow(m, gi, mi) {
  const locked = !!m.locked;
  const ids =
    "g: " + gi + ", m: " + mi +
    ", cardId: '" + Q(m.cardId) + "'" +
    ", pageId: '" + Q(m.pageId || "") + "'" +
    ", field: '" + Q(m.field) + "'";
  const replace = locked
    ? `<span class="sbf-lock" title="${E(
        m.field === "tag"
          ? "a tag's name is project-wide — rename it in the tag editor"
          : "this hit sits inside a #[…] reference token and is left alone"
      )}">locked</span>`
    : `<button class="sbf-row-btn" data-interactive title="Replace this one"
        onclick="${send("findReplaceOne", ids)}">Replace</button>`;
  return `<div class="sbf-row">
    <span class="sbf-where">${E(whereOf(m))}</span>
    <span class="sbf-line">${E("L" + (m.line || 1))}</span>
    <span class="sbf-ex">${marked(m)}</span>
    <span class="sbf-acts">
      <button class="sbf-row-btn ghost" data-interactive title="Open this card"
        onclick="${send("findGo", ids)}">Go</button>
      ${replace}
    </span>
  </div>`;
}

export function group(g, gi) {
  const rows = (g.matches || []).map((m, mi) => matchRow(m, gi, mi)).join("");
  const n = (g.matches || []).length;
  return `<div class="sbf-group">
    <div class="sbf-card">
      <span class="sbf-name">${E(g.cardName || "(untitled)")}</span>
      <span class="sbf-path">${E(g.folderPath || "")}</span>
      <span class="sbf-count">${n} hit${n === 1 ? "" : "s"}</span>
    </div>
    ${rows}
  </div>`;
}

export function body(x) {
  if (x.running) return `<div class="sbf-empty">searching the book…</div>`;
  const groups = Array.isArray(x.results) ? x.results : [];
  if (!x.ran) {
    return `<div class="sbf-empty">type a word and press Search — every card in this open book is
      walked: titles, summaries, sections, pages and tags.</div>`;
  }
  if (!groups.length) {
    return `<div class="sbf-empty">no hits for <b>${E(x.query || "")}</b> in this book${
      x.opts && x.opts.wholeWord ? " (whole word)" : ""
    }${x.opts && x.opts.caseSensitive ? " (case sensitive)" : ""}</div>`;
  }
  return groups.map((g, i) => group(g, i)).join("");
}

export function render(ui) {
  const x = (ui && ui.findWin) || null;
  if (!x || !x.open) return "";
  const o = Object.assign({ caseSensitive: false, wholeWord: false, regex: false }, x.opts || {});
  const f = Object.assign({ title: true, summary: true, section: true, page: true, tags: true }, o.fields || {});
  const groups = Array.isArray(x.results) ? x.results : [];
  const total = Number(x.total || 0) || groups.reduce((n, g) => n + ((g.matches || []).length || 0), 0);
  const cards = Number(x.cards || 0) || groups.length;
  const replaceable = Math.max(0, total - Number(x.locked || 0));

  const foot = !x.ran || !groups.length
    ? `<span class="sbf-note">replacements never touch a #[…] reference token — hits inside one are
        listed and left alone</span>`
    : x.confirm
    ? `<span class="sbf-warn">replace ${replaceable} hit${replaceable === 1 ? "" : "s"} across
        ${cards} card${cards === 1 ? "" : "s"}? one undo takes it all back.</span>
      <button class="sbf-btn danger" data-interactive
        onclick="${send("findReplaceAll", "confirm: true")}">Yes — replace ${replaceable}</button>
      <button class="sbf-btn ghost" data-interactive
        onclick="${send("findReplaceAll", "cancel: true")}">Cancel</button>`
    : `<button class="sbf-btn" data-interactive ${replaceable ? "" : "disabled"}
        onclick="${send("findReplaceAll", "confirm: false")}">Replace All (${replaceable})</button>
      <span class="sbf-note">${E(
        total + " hit" + (total === 1 ? "" : "s") + " in " + cards + " card" + (cards === 1 ? "" : "s") +
          (x.truncated ? " — list capped, narrow the search" : "") +
          (Number(x.locked || 0) ? " · " + x.locked + " locked inside references" : "")
      )}</span>`;

  return `${styles()}
  <div id="sb-findwin" data-modal onclick="${send("findWinClose")}">
    <div class="sbf-win" onclick="event.stopPropagation()">
      <div class="sbf-head">
        <span class="sbf-title">Find &amp; Replace</span>
        <span class="sbf-addr">${E(x.bookName || "")}</span>
        <button class="sbf-x" data-interactive title="Close"
          onclick="${send("findWinClose")}">✕</button>
      </div>

      <div class="sbf-fields">
        <label class="sbf-lab">Find</label>
        <input id="sb-find-q" class="sbf-in" type="text" spellcheck="false" data-interactive
          placeholder="what to look for" value="${E(x.query || "")}"
          onkeydown="if(event.key==='Enter'){${send("findRun")}}" />
        <label class="sbf-lab">Replace</label>
        <input id="sb-find-r" class="sbf-in" type="text" spellcheck="false" data-interactive
          placeholder="what to put there" value="${E(x.replacement || "")}"
          onkeydown="if(event.key==='Enter'){${send("findRun")}}" />
        <button class="sbf-btn" data-interactive onclick="${send("findRun")}">Search</button>
      </div>

      <div class="sbf-opts">
        ${optToggle("caseSensitive", "Aa", !!o.caseSensitive, "Case sensitive")}
        ${optToggle("wholeWord", "W", !!o.wholeWord, "Whole word")}
        ${optToggle("regex", ".*", !!o.regex, "Regular expression")}
        <span class="sbf-sep"></span>
        ${fieldToggle("title", "titles", f.title !== false)}
        ${fieldToggle("summary", "summaries", f.summary !== false)}
        ${fieldToggle("section", "sections", f.section !== false)}
        ${fieldToggle("page", "pages", f.page !== false)}
        ${fieldToggle("tags", "tags", f.tags !== false)}
      </div>

      ${
        x.error
          ? `<div class="sbf-err"><button class="sbf-err-x" data-interactive title="Dismiss"
              onclick="${send("errClear", "scope: 'findWin'")}">✕</button><span>${E(x.error)}</span></div>`
          : ""
      }
      ${x.notice ? `<div class="sbf-notice">${E(x.notice)}</div>` : ""}

      <div class="sbf-body">${body(Object.assign({}, x, { opts: o }))}</div>
      <div class="sbf-foot">${foot}</div>
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-findwin { position: absolute; inset: 0; z-index: 73; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-findwin .sbf-win { width: min(680px, 95%); max-height: 88%; display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-findwin .sbf-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-findwin .sbf-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-findwin .sbf-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-findwin .sbf-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(17px * var(--sb-fs, 1));
    cursor: pointer; padding: 2px 6px; }
  #sb-findwin .sbf-x:hover { color: var(--sb-accent); }
  #sb-findwin .sbf-fields { display: grid; grid-template-columns: auto 1fr auto 1fr auto; gap: 8px;
    align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--sb-line); }
  #sb-findwin .sbf-lab { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-findwin .sbf-in { min-height: 32px; padding: 0 8px; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink);
    background: var(--sb-panel); border: 1px solid var(--sb-line); border-radius: 5px; }
  #sb-findwin .sbf-in:focus { outline: none; border-color: var(--sb-accent); }
  #sb-findwin .sbf-opts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 12px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-findwin .sbf-sep { width: 1px; height: 18px; background: var(--sb-line); margin: 0 4px; }
  #sb-findwin .sbf-opt, #sb-findwin .sbf-field { min-height: 26px; padding: 0 9px; border-radius: 5px;
    cursor: pointer; font-size: calc(11px * var(--sb-fs, 1)); border: 1px solid var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink-dim); }
  #sb-findwin .sbf-opt.on, #sb-findwin .sbf-field.on { color: var(--sb-accent); border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel)); }
  #sb-findwin .sbf-err { display: flex; align-items: flex-start; gap: 7px; padding: 7px 12px; font-size: calc(11px * var(--sb-fs, 1));
    color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-findwin .sbf-err-x { flex: 0 0 auto; width: 18px; height: 18px; line-height: calc(16px * var(--sb-fs, 1)); padding: 0;
    border-radius: 4px; cursor: pointer; font-size: calc(11px * var(--sb-fs, 1)); background: none;
    border: 1px solid color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 45%, transparent);
    color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-findwin .sbf-err-x:hover { background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 18%, transparent); }
  #sb-findwin .sbf-notice { padding: 7px 12px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-findwin .sbf-body { flex: 1 1 auto; overflow: auto; padding: 6px 6px 10px; -webkit-overflow-scrolling: touch; }
  #sb-findwin .sbf-empty { padding: 26px 18px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.5;
    color: var(--sb-ink-dim); }
  #sb-findwin .sbf-group { margin: 6px 6px 10px; border: 1px solid var(--sb-line); border-radius: 5px;
    background: var(--sb-panel); overflow: hidden; }
  #sb-findwin .sbf-card { display: flex; align-items: baseline; gap: 8px; padding: 7px 10px;
    background: color-mix(in oklch, var(--sb-accent) 8%, var(--sb-panel)); border-bottom: 1px solid var(--sb-line); }
  #sb-findwin .sbf-name { font-weight: 600; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink); }
  #sb-findwin .sbf-path { flex: 1 1 auto; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-findwin .sbf-count { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-findwin .sbf-row { display: flex; align-items: center; gap: 8px; padding: 5px 10px;
    border-top: 1px solid color-mix(in oklch, var(--sb-line) 55%, transparent); }
  #sb-findwin .sbf-row:first-of-type { border-top: none; }
  #sb-findwin .sbf-where { flex: 0 0 auto; min-width: 74px; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-findwin .sbf-line { flex: 0 0 auto; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); opacity: 0.75; }
  #sb-findwin .sbf-ex { flex: 1 1 auto; font-size: calc(11.5px * var(--sb-fs, 1)); line-height: 1.45; color: var(--sb-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-findwin .sbf-hit { background: color-mix(in oklch, var(--sb-accent) 34%, transparent);
    color: var(--sb-ink); border-radius: 2px; padding: 0 1px; }
  #sb-findwin .sbf-acts { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; }
  #sb-findwin .sbf-row-btn { min-height: 24px; padding: 0 9px; border-radius: 4px; cursor: pointer; font-size: calc(11px * var(--sb-fs, 1));
    border: 1px solid var(--sb-accent); color: var(--sb-ink);
    background: color-mix(in oklch, var(--sb-accent) 16%, var(--sb-panel)); }
  #sb-findwin .sbf-row-btn.ghost { border-color: var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-findwin .sbf-row-btn:hover { border-color: var(--sb-accent); color: var(--sb-accent); }
  #sb-findwin .sbf-lock { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); border: 1px dashed var(--sb-line);
    border-radius: 4px; padding: 2px 6px; }
  #sb-findwin .sbf-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 14px;
    border-top: 1px solid var(--sb-line); }
  #sb-findwin .sbf-btn { min-height: 32px; padding: 0 14px; border-radius: 5px; cursor: pointer; font-size: calc(12px * var(--sb-fs, 1));
    font-weight: 600; color: var(--sb-ink); border: 1px solid var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 18%, var(--sb-panel)); }
  #sb-findwin .sbf-btn:hover { background: color-mix(in oklch, var(--sb-accent) 30%, var(--sb-panel)); }
  #sb-findwin .sbf-btn[disabled] { opacity: 0.45; cursor: default; }
  #sb-findwin .sbf-btn.ghost { border-color: var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink-dim); font-weight: 500; }
  #sb-findwin .sbf-btn.danger { border-color: var(--sb-warn, oklch(0.72 0.16 30));
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 20%, var(--sb-panel)); }
  #sb-findwin .sbf-warn { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-findwin .sbf-note { font-size: calc(10px * var(--sb-fs, 1)); line-height: 1.4; color: var(--sb-ink-dim); }
  </style>`;
}

module.exports = { render, styles };
