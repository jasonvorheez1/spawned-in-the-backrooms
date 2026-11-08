// ui-search.js — the results pane for SearchSystem, plus the back chip that survives opening a hit. PURE: render(ui) -> html string, "" when there is nothing to draw — no api, no SQL, no state writes. Every payload carries `query`, read live off the input, so a toggle or scope click never loses it.

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const READ = "var q=document.getElementById('sb-search-q');";

export function send(action, extra) {
  return (
    "event.stopPropagation();(function(){" +
    READ +
    "sendAction('" +
    Q(action) +
    "', { query: q?q.value:''" +
    (extra ? ", " + extra : "") +
    " });})()"
  );
}

const FIELD_LABEL = { name: "title", tag: "tag", summary: "summary", section: "section", page: "page" };
const SCOPE_LABEL = { all: "All books", book: "This Book", folder: "This Folder" };

// why.marks are [{ at, len }] into why.excerpt. Each slice is escaped on its own, so a marked run
// can never split an entity.
export function marked(why) {
  const s = String((why && why.excerpt) || "");
  const marks = Array.isArray(why && why.marks) ? why.marks : [];
  if (!s) return "";
  if (!marks.length) return E(s);
  let out = "";
  let at = 0;
  for (const m of marks) {
    const a = Math.max(at, Math.min(s.length, Math.floor(Number(m && m.at) || 0)));
    const b = Math.max(a, Math.min(s.length, a + (Math.floor(Number(m && m.len)) || 0)));
    if (b <= a) continue;
    out += E(s.slice(at, a)) + `<mark class="sbs-hit">${E(s.slice(a, b))}</mark>`;
    at = b;
  }
  return out + E(s.slice(at));
}


export function scopeChip(id, label, on, sub) {
  return `<button class="sbs-chip${on ? " on" : ""}" data-interactive title="${E(sub || label)}"
    onclick="${send("searchScope", "scope: '" + Q(id) + "'")}">${E(label)}</button>`;
}

export function optToggle(id, label, on, title) {
  return `<button class="sbs-opt${on ? " on" : ""}" data-interactive title="${E(title)}"
    onclick="${send("searchOpt", "opt: '" + Q(id) + "', on: " + (on ? "false" : "true"))}">${E(label)}</button>`;
}


export function whoOf(w) {
  const kind = FIELD_LABEL[String(w.field || "")] || String(w.field || "");
  const inside = String(w.fieldIn || "");
  return inside && (w.field === "section" || w.field === "page") ? kind + " · " + inside : kind;
}

export function whyLine(w, card) {
  const body = `<span class="sbs-who">${E(whoOf(w))}</span><span class="sbs-ex">${marked(w)}</span>`;
  if (!w.pageId) return `<div class="sbs-why">${body}</div>`;
  const ids =
    "cardId: '" + Q(card.cardId) + "', bookId: '" + Q(card.bookId) + "', folderId: '" + Q(card.folderId || "") +
    "', pageId: '" + Q(w.pageId) + "', field: '" + Q(w.field) + "'";
  return `<button class="sbs-why open" data-interactive title="Open this page"
    onclick="${send("searchGo", ids)}">${body}</button>`;
}

export function cardBlock(c, current) {
  const ids =
    "cardId: '" + Q(c.cardId) + "', bookId: '" + Q(c.bookId) + "', folderId: '" + Q(c.folderId || "") +
    "', field: '" + Q((c.why && c.why[0] && c.why[0].field) || "name") + "'";
  const whys = (c.why || []).map((w) => whyLine(w, c)).join("");
  const on = current && String(current) === String(c.cardId);
  return `<div class="sbs-card${on ? " on" : ""}">
    <button class="sbs-open" data-interactive title="Open this card"
      onclick="${send("searchGo", ids)}">
      <span class="sbs-name">${E(c.name || "(untitled)")}</span>
      <span class="sbs-path">${E(c.folderPath || "")}</span>
      <span class="sbs-hits">${Number(c.hits || 0)}</span>
    </button>
    ${whys}
  </div>`;
}

export function groupBlock(g, current) {
  const cards = (g.cards || []).map((c) => cardBlock(c, current)).join("");
  const n = Number(g.count || (g.cards || []).length || 0);
  return `<div class="sbs-group">
    <div class="sbs-book"><span class="sbs-bname">${E(g.bookName || "Book")}</span>
      <span class="sbs-bcount">${n} card${n === 1 ? "" : "s"}</span></div>
    ${cards}
  </div>`;
}

// x.assets comes from lib/assetshelf.js via app-shell — the mod's shelf, so a row opens nothing.
const KIND_GLYPH = { model: "◆", image: "▣", sound: "♪", animation: "▶", set: "▤" };

export function assetRow(r) {
  const kind = String((r && r.kind) || "");
  const thumb = String((r && r.thumb) || "");
  const tags = Array.isArray(r && r.tags) ? r.tags : [];
  const face = thumb
    ? `<img class="sbs-athumb" src="${E(thumb)}" alt="" aria-hidden="true" />`
    : `<span class="sbs-athumb sbs-aglyph" aria-hidden="true">${KIND_GLYPH[kind.toLowerCase()] || KIND_GLYPH.model}</span>`;
  const chips = tags.map((t) => `<span class="sbs-atag">${E(t)}</span>`).join("");
  return `<div class="sbs-asset" title="${E((r && r.path) || (r && r.name) || "")}">
    ${face}
    <span class="sbs-abody">
      <span class="sbs-aline"><span class="sbs-aname">${E((r && r.name) || (r && r.id) || "")}</span><span
        class="sbs-akind">${E(kind)}</span></span>
      ${chips ? `<span class="sbs-atags">${chips}</span>` : ""}
    </span>
  </div>`;
}

export function shelfBlock(assets) {
  const rows = Array.isArray(assets) ? assets : [];
  if (!rows.length) return "";
  const n = rows.length;
  return `<div class="sbs-group sbs-shelf">
    <div class="sbs-book"><span class="sbs-bname">On the Asset Library shelf</span>
      <span class="sbs-bcount">${n} item${n === 1 ? "" : "s"}</span></div>
    ${rows.map(assetRow).join("")}
    <div class="sbs-shelfnote">From the Asset Library mod — Worldwright Studio reads this shelf, it never
      changes it.</div>
  </div>`;
}

// x.atmos is ours (lib/atmos.js usage rows), so this group draws whether the Kitchen is installed or not.
export function atmoRow(a) {
  const bits = [];
  if (a.sections) bits.push(a.sections + (a.sections === 1 ? " section" : " sections"));
  if (a.pages) bits.push(a.pages + (a.pages === 1 ? " page" : " pages"));
  if (a.inline) bits.push(a.inline + " inline");
  return `<div class="sbs-atmo">
    <span class="sbs-atmo-g" aria-hidden="true">◐</span>
    <span class="sbs-atmo-n">${E(a.atmo)}</span>
    <span class="sbs-atmo-w">${E(bits.join(" · "))}</span>
  </div>`;
}

export function atmoBlock(atmos) {
  const rows = Array.isArray(atmos) ? atmos : [];
  if (!rows.length) return "";
  const n = rows.length;
  return `<div class="sbs-group sbs-atmos">
    <div class="sbs-book"><span class="sbs-bname">Atmospheres</span>
      <span class="sbs-bcount">${n} mood${n === 1 ? "" : "s"}</span></div>
    ${rows.map(atmoRow).join("")}
  </div>`;
}


export function body(x, groups, current) {
  const min = Math.max(1, Math.floor(Number(x.minChars) || 2));
  const typed = String(x.query || "").trim();
  if (typed.length < min) {
    return `<div class="sbs-empty">type at least ${min} characters — titles, summaries, tags,
      sections and pages are all read.</div>`;
  }
  if (x.running) return `<div class="sbs-empty">searching…</div>`;
  if (!x.ran) return `<div class="sbs-empty">press Enter to search “${E(typed)}”</div>`;
  if (!groups.length) {
    const strict =
      (x.matchCase ? " · match case" : "") + (x.wholeWord ? " · whole word" : "");
    const wider =
      String(x.scope || "all") === "all"
        ? ""
        : `<div class="sbs-wider"><button class="sbs-btn ghost" data-interactive
            title="Search every book on the shelf"
            onclick="${send("searchScope", "scope: 'all'")}">search all books</button></div>`;
    return `<div class="sbs-empty">nothing matches “${E(typed)}”${E(strict)}</div>${wider}`;
  }
  return groups.map((g) => groupBlock(g, current)).join("");
}

export function pager(x) {
  const pages = Math.max(1, Math.floor(Number(x.pages) || 1));
  if (pages < 2) return "";
  const page = Math.max(0, Math.min(pages - 1, Math.floor(Number(x.page) || 0)));
  return `<div class="sbs-pager">
    <button class="sbs-btn ghost" data-interactive ${page <= 0 ? "disabled" : ""}
      onclick="${send("searchRun", "page: " + (page - 1))}">‹ Prev</button>
    <span class="sbs-pnote">page ${page + 1} of ${pages}</span>
    <button class="sbs-btn ghost" data-interactive ${page >= pages - 1 ? "disabled" : ""}
      onclick="${send("searchRun", "page: " + (page + 1))}">Next ›</button>
  </div>`;
}

export function backChip(x) {
  const n = Number(x.total || 0);
  if (!n) return "";
  const who = x.opened && x.opened.name ? String(x.opened.name) : "";
  return `${styles()}
  <div id="sb-searchback">
    <button class="sbs-back" data-interactive title="${E(
      who ? "back to the results for “" + String(x.query || "") + "”" : "back to results"
    )}" onclick="event.stopPropagation();sendAction('searchBack', {})">
      ‹ back to results<span class="sbs-bn">${n}</span>
    </button>
  </div>`;
}

export function render(ui) {
  const x = (ui && ui.searchWin) || null;
  if (!x) return "";
  if (!x.open) return x.stashed ? backChip(x) : "";

  const scope = String(x.scope || "all");
  const groups = Array.isArray(x.groups) ? x.groups : [];
  const total = Number(x.total || 0);
  const hits = Number(x.hits || 0);
  const current = x.opened && x.opened.cardId ? x.opened.cardId : "";
  const skipped = Array.isArray(x.skipped) ? x.skipped : [];

  const count = !x.ran
    ? ""
    : `${total} card${total === 1 ? "" : "s"}${hits ? " · " + hits + " hit" + (hits === 1 ? "" : "s") : ""}`;

  return `${styles()}
  <div id="sb-searchwin">
    <div class="sbs-head">
      <span class="sbs-title">Search</span>
      <span class="sbs-count">${E(count)}</span>
      <button class="sbs-x" data-interactive title="Close search"
        onclick="${send("searchClose")}">✕</button>
    </div>

    <div class="sbs-q">
      <input id="sb-search-q" class="sbs-in" type="text" spellcheck="false" data-interactive
        placeholder="find a word" value="${E(x.query || "")}"
        onkeydown="if(event.key==='Enter'){${send("searchRun", "force: true")}}"
        oninput="${send("searchRun")}" />
      ${optToggle("matchCase", "Aa", !!x.matchCase, "Match case")}
      ${optToggle("wholeWord", "ab|", !!x.wholeWord, "Whole word only")}
    </div>

    <div class="sbs-scopes">
      ${scopeChip("all", SCOPE_LABEL.all, scope === "all", "Every book on the shelf")}
      ${scopeChip("book", SCOPE_LABEL.book, scope === "book", x.bookName || "The open book")}
      ${scopeChip("folder", SCOPE_LABEL.folder, scope === "folder", x.folderName || "The open folder")}
      <span class="sbs-where">${E(
        scope === "book" ? x.bookName || "" : scope === "folder" ? x.folderName || "" : ""
      )}</span>
    </div>

    ${ERR.line(x.error || "", "searchWin", "sbs-err")}

    <div class="sbs-body">${body(x, groups, current)}${
      x.ran && !x.running ? atmoBlock(x.atmos) + shelfBlock(x.assets) : ""
    }</div>

    <div class="sbs-foot">
      ${pager(x)}
      <span class="sbs-note">${
        x.truncated
          ? "showing the first results — narrow the words or the scope" +
            (skipped.length ? " (not read: " + E(skipped.join(", ")) + ")" : "")
          : "titles rank above bodies · click a result, then use ‹ back to results"
      }</span>
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-searchwin { position: absolute; top: 34px; bottom: 26px; right: 0; width: min(430px, 92%);
    z-index: 71; display: flex; flex-direction: column; background: var(--sb-panel-2);
    border-left: 1px solid var(--sb-line);
    box-shadow: -18px 0 44px color-mix(in oklch, var(--sb-shadow) 40%, transparent); }
  #sb-searchwin .sbs-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-searchwin .sbs-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-searchwin .sbs-count { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(16px * var(--sb-fs, 1));
    cursor: pointer; padding: 2px 4px; }
  #sb-searchwin .sbs-x:hover { color: var(--sb-accent); }
  #sb-searchwin .sbs-q { display: flex; align-items: center; gap: 6px; padding: 8px 12px 4px; }
  #sb-searchwin .sbs-in { flex: 1 1 auto; min-width: 0; min-height: 30px; padding: 0 9px; font: inherit;
    font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink); background: var(--sb-field); border: 1px solid var(--sb-line);
    border-radius: 4px; }
  #sb-searchwin .sbs-in:focus { outline: none; border-color: var(--sb-accent); }
  #sb-searchwin .sbs-opt { min-width: 32px; min-height: 30px; padding: 0 7px; font-size: calc(11px * var(--sb-fs, 1));
    border-radius: 4px; cursor: pointer; border: 1px solid var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-opt.on { color: var(--sb-accent); border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel)); }
  #sb-searchwin .sbs-scopes { display: flex; align-items: center; gap: 6px; padding: 4px 12px 9px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-searchwin .sbs-chip { min-height: 27px; padding: 0 10px; border-radius: 13px; cursor: pointer;
    font-size: calc(11px * var(--sb-fs, 1)); border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-chip.on { color: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-searchwin .sbs-where { flex: 1 1 auto; min-width: 0; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; }
  #sb-searchwin .sbs-err { display: flex; align-items: center; gap: 6px; padding: 7px 12px;
    font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-danger, oklch(0.72 0.16 30)); }
  #sb-searchwin .sbs-body { flex: 1 1 auto; overflow: auto; padding: 6px 8px 10px;
    -webkit-overflow-scrolling: touch; }
  #sb-searchwin .sbs-empty { padding: 26px 14px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.5;
    color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-wider { display: flex; justify-content: center; padding-bottom: 8px; }
  #sb-searchwin .sbs-group { margin-bottom: 10px; }
  #sb-searchwin .sbs-book { display: flex; align-items: baseline; gap: 8px; padding: 4px 6px 5px;
    position: sticky; top: -6px; background: var(--sb-panel-2); z-index: 1; }
  #sb-searchwin .sbs-bname { font-size: calc(11px * var(--sb-fs, 1)); font-weight: 600; letter-spacing: 0.4px;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-accent) 78%, var(--sb-ink-dim)); }
  #sb-searchwin .sbs-bcount { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-card { border: 1px solid transparent; border-radius: 5px; margin-bottom: 4px;
    background: color-mix(in oklch, var(--sb-panel) 70%, transparent); }
  #sb-searchwin .sbs-card:hover { border-color: color-mix(in oklch, var(--sb-accent) 45%, var(--sb-line)); }
  #sb-searchwin .sbs-card.on { border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 10%, var(--sb-panel)); }
  #sb-searchwin .sbs-open { display: flex; align-items: baseline; gap: 8px; width: 100%; text-align: left;
    padding: 7px 9px 4px; background: none; border: 0; font: inherit; cursor: pointer; color: var(--sb-ink); }
  #sb-searchwin .sbs-name { flex: 0 1 auto; font-size: calc(12.5px * var(--sb-fs, 1)); font-weight: 600; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-searchwin .sbs-path { flex: 1 1 auto; min-width: 0; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-searchwin .sbs-hits { flex: 0 0 auto; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); opacity: 0.8; }
  #sb-searchwin .sbs-why { display: block; width: 100%; text-align: left; padding: 2px 9px 4px;
    background: none; border: 0; font: inherit; font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.45; color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-why.open { cursor: pointer; }
  #sb-searchwin .sbs-why.open:hover .sbs-ex { color: var(--sb-ink); }
  #sb-searchwin .sbs-who { display: inline-block; min-width: 54px; margin-right: 6px; font-size: calc(9.5px * var(--sb-fs, 1));
    letter-spacing: 0.5px; text-transform: uppercase;
    color: color-mix(in oklch, var(--sb-ink-dim) 80%, var(--sb-accent)); vertical-align: top; }
  #sb-searchwin .sbs-ex { display: inline; }
  #sb-searchwin mark.sbs-hit { background: color-mix(in oklch, var(--sb-accent) 34%, transparent);
    color: var(--sb-ink); border-radius: 2px; padding: 0 1px; }
  #sb-searchwin .sbs-foot { border-top: 1px solid var(--sb-line); padding: 7px 12px; }
  #sb-searchwin .sbs-pager { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
  #sb-searchwin .sbs-pnote { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-btn { min-height: 28px; padding: 0 11px; border-radius: 4px; cursor: pointer;
    font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink); border: 1px solid var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 16%, var(--sb-panel)); }
  #sb-searchwin .sbs-btn.ghost { border-color: var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-btn.ghost:hover { color: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-searchwin .sbs-btn[disabled] { opacity: 0.35; cursor: default; }
  #sb-searchwin .sbs-note { font-size: calc(10px * var(--sb-fs, 1)); line-height: 1.4; color: var(--sb-ink-dim); }

  /* the shelf group — the mod's rows, drawn as labels: no hover lift, nothing to press */
  #sb-searchwin .sbs-shelf { margin-top: 6px; }
  #sb-searchwin .sbs-asset { display: flex; align-items: center; gap: 9px; padding: 5px 8px;
    margin-bottom: 4px; border: 1px solid transparent; border-radius: 5px;
    background: color-mix(in oklch, var(--sb-panel) 70%, transparent); }
  #sb-searchwin .sbs-athumb { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 4px;
    object-fit: cover; background: color-mix(in oklch, var(--sb-line) 55%, transparent); }
  #sb-searchwin .sbs-aglyph { display: inline-flex; align-items: center; justify-content: center;
    font-size: calc(15px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-abody { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  #sb-searchwin .sbs-aline { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
  #sb-searchwin .sbs-aname { flex: 0 1 auto; font-size: calc(12.5px * var(--sb-fs, 1)); font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-searchwin .sbs-akind { flex: 0 0 auto; padding: 1px 6px; border-radius: 8px;
    font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--sb-ink-dim); border: 1px solid var(--sb-line); }
  #sb-searchwin .sbs-atags { display: flex; flex-wrap: wrap; gap: 4px; }
  #sb-searchwin .sbs-atag { padding: 0 5px; border-radius: 7px; font-size: calc(9.5px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); background: color-mix(in oklch, var(--sb-line) 45%, transparent); }
  /* the mood group — ours, drawn as labels: where a mood is used, nothing to press */
  #sb-searchwin .sbs-atmos { margin-top: 6px; }
  #sb-searchwin .sbs-atmo { display: flex; align-items: center; gap: 9px; padding: 5px 8px;
    margin-bottom: 4px; border-radius: 5px;
    background: color-mix(in oklch, var(--sb-panel) 70%, transparent); }
  #sb-searchwin .sbs-atmo-g { opacity: 0.7; color: oklch(0.62 0.12 285); }
  #sb-searchwin .sbs-atmo-n { flex: 1 1 auto; font-weight: 600; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-searchwin .sbs-atmo-w { flex: 0 0 auto; font-size: calc(9.5px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); }
  #sb-searchwin .sbs-shelfnote { padding: 3px 8px 2px; line-height: 1.4;
    font-size: calc(9.5px * var(--sb-fs, 1));
    color: color-mix(in oklch, var(--sb-ink-dim) 78%, transparent); }

  #sb-searchback { position: absolute; right: 14px; bottom: 34px; z-index: 68; }
  #sb-searchback .sbs-back { display: flex; align-items: center; gap: 8px; min-height: 30px;
    padding: 0 12px; border-radius: 15px; cursor: pointer; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1));
    color: var(--sb-ink); border: 1px solid var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 20%, var(--sb-panel-2));
    box-shadow: 0 8px 22px color-mix(in oklch, var(--sb-shadow) 45%, transparent); }
  #sb-searchback .sbs-back:hover { background: color-mix(in oklch, var(--sb-accent) 32%, var(--sb-panel-2)); }
  #sb-searchback .sbs-bn { font-size: calc(10px * var(--sb-fs, 1)); padding: 1px 6px; border-radius: 9px; color: var(--sb-panel-2);
    background: var(--sb-accent); }
  </style>`;
}

module.exports = { render, backChip };
