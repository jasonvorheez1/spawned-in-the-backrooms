const PREVIEW=require("lib/export-preview.js");
// ui-export.js — File ▸ Export…, the whole-book (or whole-shelf) export sheet. PURE: render(ui) -> html string, "" when closed — no api, no SQL, no state writes. The realm refuses window.open and the async clipboard without a gesture, so the download is an anchor click, Copy falls back to selection copy, and the <pre> is always there underneath.

const REFS = require("lib/refs.js");
const ZIP = require("lib/zip.js");
const ERR = require("lib/ui-err.js");
const SCHEMA = require("lib/schema.js");
const POLICY = require("lib/document-export-policy.js");

let ZIP_CACHE = { key: "", val: null };
const ZIP_CHAR_CAP = 600000;

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function scopeBtn(id, label, active) {
  return `<button class="sbx-tab${active ? " on" : ""}" data-interactive
    onclick="event.stopPropagation();sendAction('expScope', { scope: '${Q(id)}', bookId: '' })">${E(label)}</button>`;
}

// Same door as the scope tabs: the pane must always show the bytes the save button would write.
export function shapeBtn(id, label, active) {
  return `<button class="sbx-tab${active ? " on" : ""}" data-interactive
    onclick="event.stopPropagation();sendAction('expScope', { format: '${Q(id)}' })">${E(label)}</button>`;
}

// His ask: a download is named "<author>-<what>-<YYYY-MM-DD>.<ext>" — the date is stamped in the
//   realm at click time (the sandbox has no clock). Tidiness, never access control.
export function mdName(name, ext) {
  const e = String(ext || "md");
  const s = ZIP.safeName(name || "Book").replace(/\.(md|json)$/i, "");
  return s + (e === "json" ? ".cards.json" : ".md");
}

export function authorOf(x) {
  const a = ZIP.safeName(String((x && x.author) || "").trim() || "author");
  return a || "author";
}


export function stemFor(x, what) {
  const w = ZIP.safeName(String(what || "Book")).replace(/\.(md|json)$/i, "");
  return authorOf(x) + "-" + (w || "Book");
}

// The archive's root folder: the app for a whole-shelf export, the book's own name when one leaves alone.
export function bundleRootOf(x, ui) {
  if (x && x.bundle && String(x.scope || "book") !== "all") {
    const addr = String((x && x.addr) || "").split(" — ")[0];
    if (addr.trim()) return addr.trim();
  }
  return projectNameOf();
}


export function shapeOf(x) {
  return String((x && x.format) || "text") === "json" ? "json" : "text";
}

// Inline realm JS producing the final name into `n`. Kept in one place so both lanes stamp alike.
export function nameJs(stem, ext) {
  return (
    "var dt=new Date();var pad=function(v){return(v<10?'0':'')+v;};" +
    "var n='" +
    Q(stem) +
    "-'+dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate())+'." +
    Q(ext) +
    "';"
  );
}

// His caution beat: first press arms, second saves.
export function armJs(btnId) {
  return (
    "var btn=document.getElementById('" +
    Q(btnId) +
    "');" +
    "if(btn&&btn.getAttribute('data-armed')!=='1'){btn.setAttribute('data-armed','1');" +
    "btn.textContent='Yes — save '+n;" +
    "if(note)note.textContent='this saves a file onto your device. only keep files from a source you trust.';" +
    "return;}"
  );
}


export function projectNameOf() {
  return SCHEMA.PROJECT_NAME;
}

// Cheap content signature: names, lengths, every 64th character — enough to notice an edit.
export function sig(entries) {
  let h = 5381;
  for (const e of entries) {
    const n = String(e.name || "");
    const t = String(e.text || "");
    for (let i = 0; i < n.length; i++) h = ((h * 33) ^ n.charCodeAt(i)) >>> 0;
    h = ((h * 33) ^ t.length) >>> 0;
    for (let i = 0; i < t.length; i += 64) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
  }
  return entries.length + ":" + h;
}

export function buildZip(x, ui) {
  if (x.bookId && !POLICY.isExportable(x.bookId)) return { ok: false, reason: "excluded" };
  const folder = ZIP.safeName(bundleRootOf(x, ui));
  const ext = shapeOf(x) === "json" ? "json" : "md";
  const raw = Array.isArray(x.files) ? x.files.filter((f) => f && (f.text || f.name)) : [];
  let entries;
  let degraded = false;
  // A bundle already spells its own paths — index.json, cards/003-Ilya.json, a book folder per book.
  //   Those names are the archive's shape, kept exactly; only the root folder is added here.
  if (x.bundle && raw.length) {
    entries = raw.map((f, i) => ({
      name: folder + "/" + String(f.name || "file-" + (i + 1)).replace(/^\/+/, ""),
      text: String(f.text || ""),
    }));
  } else if (raw.length) {
    entries = raw.map((f, i) => ({
      name: folder + "/" + mdName(f.name || "Book " + (i + 1), ext),
      text: String(f.text || ""),
    }));
  } else {
    // No per-book text yet: package the one text we were handed rather than an empty archive.
    degraded = true;
    entries = [{ name: folder + "/" + mdName(folder, ext), text: String(x.text || "") }];
  }
  let chars = 0;
  for (const e of entries) chars += e.text.length;
  if (!chars) return { ok: false, reason: "empty", folder };
  if (chars > ZIP_CHAR_CAP) return { ok: false, reason: "too-large", folder, chars };

  const key = folder + "|" + sig(entries);
  if (ZIP_CACHE.key === key && ZIP_CACHE.val) return ZIP_CACHE.val;
  const bytes = ZIP.zipFiles(entries);
  const val = {
    ok: true,
    folder,
    degraded,
    count: entries.length,
    bytes: bytes.length,
    b64: ZIP.toBase64(bytes),
    zipName: folder + ".zip",
  };
  ZIP_CACHE = { key, val };
  return val;
}

// `window.` is spelled out on purpose: an inline handler resolves bare names through document
// first, and document.URL is a string.
const NOTE = "var note=document.getElementById('sb-export-dlnote');";
const AFTER =
  "if(note)note.textContent='saving '+n+' — if no file arrived, this window is not permitted to write files: use Copy instead.';";
const FAILED =
  "if(note)note.textContent='this window refused the download ('+((e&&e.message)||e)+') — use Copy instead.';";

// Compatibility hooks for callers of the old button helpers. The shortened
// preview is never a clipboard/download source.
export function dlMdJs(){return "exportPreviewAction(event,'book','document')";}
export function dlZipJs(){return "exportPreviewAction(event,'book','zip')";}
export function copyJs(){return "exportPreviewAction(event,'book','copy')";}

// What compile = N kept out of THIS export, said plainly beside the books line.
export function notCompiledNote(x) {
  const f = Math.max(0, Number((x && x.foldersLeftOut) || 0));
  const c = Math.max(0, Number((x && x.cardsLeftOut) || 0));
  const bits = [];
  if (f) bits.push(f + " folder" + (f === 1 ? "" : "s"));
  if (c) bits.push(c + " card" + (c === 1 ? "" : "s"));
  if (!bits.length) return "";
  return " \u00b7 " + bits.join(" and ") + " set to stay out of exports " + (f + c === 1 ? "was" : "were") + " skipped";
}

export function render(ui) {
  let x = (ui && ui.exportWin) || null;
  if (!x || !x.open) return "";
  // Refuse a stale/forged selected-book payload before touching its contents.
  if (x.bookId && !POLICY.isExportable(x.bookId)) x = {
    open: true, scope: "book", error: "This book is not available for document export."
  };
  const scope = String(x.scope || "book");
  const shape = shapeOf(x);
  const ext = shape === "json" ? "cards.json" : "md";
  const mime = shape === "json" ? "application/json" : "text/markdown";
  const body = x.loading
    ? `<div class="sbx-empty">${shape === "json" ? "gathering the cards…" : "gathering the text…"}</div>`
    : x.text
    ? PREVIEW.markup({...x,requestId:PREVIEW.token(x),stem:stemFor(x,(scope==="all"||shape==="json"&&x.bundle)?bundleRootOf(x,ui):(x.addr||x.title||"Book"))},"book","sbx-text","sb-export-all-text")
    : `<div class="sbx-empty">nothing to export here yet</div>`;


  let actions = "";
  const asZip = scope === "all" || (shape === "json" && !!x.bundle);
  if (!x.loading && x.text) {
    actions = `<button class="sbx-btn" id="sb-export-dl" data-interactive onclick="exportPreviewAction(event,'book','${asZip?'zip':'document'}')">Download .${asZip?'zip':shape==='json'?'json':'md'}</button><button class="sbx-btn ghost" data-interactive onclick="exportPreviewAction(event,'book','copy')">Copy complete ${shape==='json'?'file':'text'}</button>`;
  }

  return `${styles()}
  <div id="sb-exportwin" data-modal onclick="event.stopPropagation();sendAction('expClose', {})">
    <div class="sbx-win" onclick="event.stopPropagation()">
      <div class="sbx-head">
        <span class="sbx-title">Export</span>
        <span class="sbx-addr">${E(x.addr || "")}</span>
        <button class="sbx-x" data-interactive title="Close"
          onclick="event.stopPropagation();sendAction('expClose', {})">✕</button>
      </div>
      <div class="sbx-tabs">
        ${scopeBtn("book", "This Book", scope === "book")}
        ${scopeBtn("all", "All books", scope === "all")}
        <span class="sbx-gap"></span>
        ${shapeBtn("text", "Markdown", shape !== "json")}
        ${shapeBtn("json", "Cards (.json)", shape === "json")}
      </div>
      <div class="sbx-tabs sbx-books" aria-label="Document books">
        ${POLICY.exportBooks((ui.library && ui.library.books) || []).map((b) =>
          `<button class="sbx-tab${x.bookId === b.id && scope !== "all" ? " on" : ""}" data-interactive
          onclick="event.stopPropagation();sendAction('expScope', {scope:'book',bookId:'${Q(b.id)}'})">${E(b.name)}</button>`).join("")}
        <span class="sbx-note">Documents only · references stay references; no source or model files</span>
      </div>
      ${ERR.line(x.error, "export", "sbx-err")}
      <div class="sbx-body">${body}</div>
      <div class="sbx-foot">
        ${actions ? `<div class="sbx-acts">${actions}</div><div class="sbx-dlnote" id="sb-export-dlnote"></div>` : ""}
        <span class="sbx-note">${
          shape === "json"
            ? "an index, one file per card, and every picture's address — File ▸ Import… reads any of it back"
            : "markdown, exactly as written"
        }${
          scope === "all" ? "; books set to stay out of exports are skipped" : ""
        }${notCompiledNote(x)} — use Copy for the complete document</span>
      </div>
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-exportwin { position: absolute; inset: 0; z-index: 72; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-exportwin .sbx-win { width: min(560px, 94%); max-height: 86%; display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-exportwin .sbx-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-exportwin .sbx-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-exportwin .sbx-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-exportwin .sbx-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(17px * var(--sb-fs, 1));
    cursor: pointer; padding: 2px 6px; }
  #sb-exportwin .sbx-x:hover { color: var(--sb-accent); }
  #sb-exportwin .sbx-tabs { display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--sb-line); }
  #sb-exportwin .sbx-books { flex-wrap: wrap; max-height: 140px; overflow: auto; }
  #sb-exportwin .sbx-tab { min-height: 32px; padding: 0 12px; border-radius: 5px; cursor: pointer; font-size: calc(12px * var(--sb-fs, 1));
    border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-exportwin .sbx-tab.on { color: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-exportwin .sbx-gap { flex: 1 1 auto; }
  #sb-exportwin .sbx-err { padding: 8px 14px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-exportwin .sbx-body { flex: 1 1 auto; overflow: auto; padding: 8px 12px; -webkit-overflow-scrolling: touch; }
  #sb-exportwin .sbx-empty { padding: 26px 14px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-exportwin .sbx-text { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: calc(12px * var(--sb-fs, 1));
    line-height: 1.45; color: var(--sb-ink); user-select: text; -webkit-user-select: text; }
  #sb-exportwin .sbx-foot { padding: 9px 14px; border-top: 1px solid var(--sb-line); }
  #sb-exportwin .sbx-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 6px; }
  #sb-exportwin .sbx-btn { min-height: 34px; padding: 0 14px; border-radius: 5px; cursor: pointer; font-size: calc(12px * var(--sb-fs, 1));
    font-weight: 600; color: var(--sb-ink); border: 1px solid var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 18%, var(--sb-panel)); }
  #sb-exportwin .sbx-btn:hover { background: color-mix(in oklch, var(--sb-accent) 30%, var(--sb-panel)); }
  #sb-exportwin .sbx-btn.ghost { border-color: var(--sb-line); background: var(--sb-panel);
    color: var(--sb-ink-dim); font-weight: 500; }
  #sb-exportwin .sbx-btn.ghost:hover { color: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-exportwin .sbx-meta { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-exportwin .sbx-dlnote { font-size: calc(10px * var(--sb-fs, 1)); line-height: 1.4; color: var(--sb-ink-dim); min-height: 12px;
    margin-bottom: 4px; }
  #sb-exportwin .sbx-note { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  </style>`;
}

module.exports = { render };
