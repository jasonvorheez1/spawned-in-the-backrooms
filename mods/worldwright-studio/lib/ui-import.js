// ui-import.js — File ▸ Import…, the window over the app.
// PURE: render(ui) -> html string, "" when closed — no api, no SQL, no state writes.

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");

const TREE_ROWS = 160; // past this the tree is a count, not a list

// One input.action payload caps at 16KB JSON-serialized; longer text rides sbiPump in numbered pieces.
const WIRE_TEXT = 13000;
const MAX_FILE = 716800; // 700KB
const MAX_ZIP = 6291456;

// Handler text lands in an HTML attribute, so & < > " ride as entities. Never for Q() output — escaped already.
export function A(js) {
  return String(js)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const READ =
  "var t=document.getElementById('sb-import-text');var n=document.getElementById('sb-import-name');";

// Past WIRE_TEXT, `text` is OMITTED — importAct reads `p.text === undefined` as "keep what you have".
export function send(action, extra) {
  return (
    "event.stopPropagation();(function(){" +
    READ +
    "var v=t?t.value:'';var p={ name: n?n.value:''" +
    (extra ? ", " + extra : "") +
    " };if(!(v.length>" +
    WIRE_TEXT +
    "))p.text=v;sendAction('" +
    Q(action) +
    "', p);})()"
  );
}

// sbiPump(name, text, extra): pieces that each fit one action, sent 80ms apart (cap 60/s; same name
//   twice in a tick collapses), each carrying its index and the total.
const PUMP =
  "var sbiPump=function(nm,s,ex){" +
  "var parts=[],at=0;" +
  "while(at<s.length){" +
  "var len=Math.min(13000,s.length-at);" +
  "while(len>256&&JSON.stringify(s.substr(at,len)).length>14000)len=Math.floor(len*0.7);" +
  "parts.push(s.substr(at,len));at+=len;}" +
  "if(!parts.length)parts=[''];" +
  "var tot=parts.length,k=0;" +
  "var go=function(){" +
  "var p={name:nm,i:k,n:tot,text:parts[k]};" +
  "for(var q in ex)p[q]=ex[q];" +
  "sendAction('importFile',p);k++;" +
  "if(k<tot)window.setTimeout(go,80);};" +
  "go();};";

const REFUSE = "var sbiNo=function(nm,why){sendAction('importFile',{name:nm,i:0,n:1,text:'',refuse:why});};";

// Our archives are store-only (lib/zip.js writes method 0), so cards.json lifts out with no inflate
//   code; a deflated archive is refused in words.
const ZIP_LIFT =
  "var a=new window.Uint8Array(r.result);var lim=a.length;var at=0;var found=null;var comp=false;" +
  "while(at+30<=lim){" +
  "if(a[at]===80&&a[at+1]===75&&a[at+2]===3&&a[at+3]===4){" +
  "var mth=a[at+8]+a[at+9]*256;" +
  "var cs=a[at+18]+a[at+19]*256+a[at+20]*65536+a[at+21]*16777216;" +
  "var us=a[at+22]+a[at+23]*256+a[at+24]*65536+a[at+25]*16777216;" +
  "var nl=a[at+26]+a[at+27]*256;var xl=a[at+28]+a[at+29]*256;" +
  "var fn='';for(var q=0;q<nl;q++)fn+=String.fromCharCode(a[at+30+q]);" +
  "var st=at+30+nl+xl;" +
  "if(/(^|\\/)cards\\.json$/i.test(fn)){if(mth!==0)comp=true;else found=a.subarray(st,st+us);break;}" +
  "at=st+(cs>0?cs:0);" +
  "}else at++;}" +
  "if(comp)sbiNo(nm,'zipcomp');" +
  "else if(!found)sbiNo(nm,'zipnone');" +
  "else if(found.length>" +
  MAX_FILE +
  ")sbiNo(nm,'big');" +
  "else{var s2='';" +
  "if(window.TextDecoder)s2=new window.TextDecoder('utf-8').decode(found);" +
  "else{for(var z=0;z<found.length;z+=8192)s2+=String.fromCharCode.apply(null,found.subarray(z,z+8192));" +
  "try{s2=decodeURIComponent(escape(s2));}catch(e2){}}" +
  "sbiPump(nm+' \\u25b8 cards.json',s2,{zip:1});}";

const FILE_JS =
  "event.stopPropagation();(function(){" +
  PUMP +
  REFUSE +
  "var el=document.getElementById('sb-import-file');" +
  "var f=el&&el.files&&el.files[0];if(!f)return;" +
  "var nm=String(f.name||'file');" +
  "var isZip=nm.toLowerCase().slice(-4)==='.zip';" +
  "if(f.size>(isZip?" +
  MAX_ZIP +
  ":" +
  MAX_FILE +
  ")){sbiNo(nm,'big');try{el.value='';}catch(x){}return;}" +
  "var r=new window.FileReader();" +
  "r.onerror=function(){sbiNo(nm,'read');};" +
  "r.onload=function(){try{" +
  "if(isZip){" +
  ZIP_LIFT +
  "}else{var s=String(r.result||'');" +
  "if(s.length>" +
  MAX_FILE +
  ")sbiNo(nm,'big');else sbiPump(nm,s,{});}" +
  "}catch(e){sbiNo(nm,'read');}" +
  "try{el.value='';}catch(x){}};" +
  "if(isZip)r.readAsArrayBuffer(f);else r.readAsText(f);" +
  "})()";

const READ_JS =
  "event.stopPropagation();(function(){" +
  READ +
  "var v=t?t.value:'';var nm=n?n.value:'';" +
  "if(!(v.length>" +
  WIRE_TEXT +
  ")){sendAction('importParse',{ text: v, name: nm });return;}" +
  PUMP +
  "sbiPump('pasted text',v,{paste:1,book:nm});" +
  "})()";

const FORMAT_LABEL = {
  auto: "Auto",
  "codexbuilder-md": "Worldwright Studio export",
  markdown: "Markdown",
  csv: "CSV",
  json: "JSON cards",
};

export function formatBtn(id, active, detected) {
  const label = id === "auto" && detected ? "Auto · " + (FORMAT_LABEL[detected] || detected) : FORMAT_LABEL[id] || id;
  return `<button class="sbi-tab${active ? " on" : ""}" data-interactive
    onclick="${send("importParse", "format: '" + Q(id) + "'")}">${E(label)}</button>`;
}

export function modeBtn(id, label, active, hint) {
  return `<button class="sbi-mode${active ? " on" : ""}" data-interactive title="${E(hint)}"
    onclick="${send("importMode", "mode: '" + Q(id) + "'")}">${E(label)}</button>`;
}

export function chip(label) {
  return `<span class="sbi-chip">${E(label)}</span>`;
}

export function jsonLine(node) {
  const bits = [];
  const secs = (node.sections || []).length;
  const pgs = (node.pages || []).length;
  const tags = node.tags || [];
  if (node.status) bits.push(String(node.status));
  if (secs) bits.push(secs + " section" + (secs === 1 ? "" : "s"));
  if (pgs) bits.push(pgs + " page" + (pgs === 1 ? "" : "s"));
  if (tags.length) bits.push(tags.map((t) => "#" + t).join(" "));
  if (node.folderLabel) bits.push("▸ " + node.folderLabel);
  if (node.openQuestion) bits.push("open question");
  if (!bits.length) bits.push("title and summary only — no sections, pages or tags");
  return bits.join(" · ");
}

export function cardRow(node, depth, json) {
  const pad = 8 + depth * 14;
  if (json) {
    return `<div class="sbi-row" style="padding-left:${pad}px">
      <span class="sbi-ic">▪</span><span class="sbi-nm">${E(node.name)}</span>
      ${node.summary ? `<span class="sbi-sum">${E(String(node.summary).slice(0, 90))}</span>` : ""}
    </div>
    <div class="sbi-sub" style="padding-left:${pad + 16}px">${E(jsonLine(node))}</div>`;
  }
  const bits = [];
  if (node.status) bits.push(String(node.status));
  if ((node.sections || []).length) bits.push((node.sections || []).length + " sec");
  if ((node.pages || []).length) bits.push((node.pages || []).length + " pg");
  if ((node.tags || []).length) bits.push((node.tags || []).map((t) => "#" + t).join(" "));
  if (node.openQuestion) bits.push("open question");
  return `<div class="sbi-row" style="padding-left:${pad}px">
    <span class="sbi-ic">▪</span><span class="sbi-nm">${E(node.name)}</span>
    ${node.summary ? `<span class="sbi-sum">${E(String(node.summary).slice(0, 90))}</span>` : ""}
    <span class="sbi-meta">${E(bits.join(" · "))}</span>
  </div>`;
}

export function folderRow(node, depth) {
  const kids = (node.children || []).length;
  return `<div class="sbi-row folder" style="padding-left:${8 + depth * 14}px">
    <span class="sbi-ic">▸</span><span class="sbi-nm">${E(node.name)}</span>
    <span class="sbi-meta">${kids} inside</span>
  </div>`;
}

export function treeRows(nodes, depth, out, json) {
  for (let i = 0; i < (nodes || []).length; i++) {
    const n = nodes[i];
    if (!n) continue;
    if (out.length >= TREE_ROWS) {
      out.more += 1;
      continue;
    }
    if (n.kind === "folder") {
      out.push(folderRow(n, depth));
      treeRows(n.children, depth + 1, out, json);
    } else {
      out.push(cardRow(n, depth, json));
    }
  }
  return out;
}

export function tree(preview) {
  const books = (preview && preview.books) || [];
  const json = String((preview && preview.format) || "") === "json";
  const out = [];
  out.more = 0;
  const parts = [];
  for (let i = 0; i < books.length; i++) {
    parts.push(`<div class="sbi-book">${E(books[i].name)}</div>`);
    const rows = [];
    rows.more = 0;
    treeRows(books[i].children, 0, rows, json);
    parts.push(rows.join(""));
    out.more += rows.more;
  }
  if (out.more) parts.push(`<div class="sbi-more">…and ${out.more} more not listed here</div>`);
  return parts.join("");
}

export function counts(preview) {
  const c = (preview && preview.counts) || {};
  const bits = [];
  if (Number(c.books) > 1) bits.push(c.books + " books");
  bits.push((Number(c.cards) || 0) + " card" + (Number(c.cards) === 1 ? "" : "s"));
  if (Number(c.folders)) bits.push(c.folders + " folder" + (Number(c.folders) === 1 ? "" : "s"));
  if (Number(c.sections)) bits.push(c.sections + " section" + (Number(c.sections) === 1 ? "" : "s"));
  if (Number(c.pages)) bits.push(c.pages + " page" + (Number(c.pages) === 1 ? "" : "s"));
  if (Number(c.tags)) bits.push(c.tags + " tag" + (Number(c.tags) === 1 ? "" : "s"));
  if (Number(c.words)) bits.push(c.words + " words");
  return bits.map(chip).join("");
}

export function warnings(preview, x) {
  const list = (preview && preview.warnings) || [];
  if (!list.length) return "";
  const rows = list.slice(0, 8).map((w) => `<li>${E(w)}</li>`).join("");
  const more = list.length > 8 ? `<li>…and ${list.length - 8} more</li>` : "";
  return `<div class="sbi-warn"><div class="sbi-warn-h">${
    x && x.preview && x.preview.truncated ? "read with cuts" : "worth knowing"
  }</div><ul>${rows}${more}</ul></div>`;
}

export function bookOptions(x) {
  const books = (x.books || []).slice(0, 40);
  if (!books.length) return `<span class="sbi-note">no books on the shelf yet</span>`;
  const sel = String((x.target || {}).bookId || "");
  return books
    .map(
      (b) => `<button class="sbi-pick${String(b.id) === sel ? " on" : ""}" data-interactive
        onclick="${send("importTarget", "bookId: '" + Q(b.id) + "'")}">${E(b.name)}</button>`
    )
    .join("");
}

export function folderOptions(x) {
  const folders = (x.folders || []).slice(0, 40);
  const sel = String((x.target || {}).folderId || "");
  const root = `<button class="sbi-pick${!sel || sel === String((x.target || {}).bookId || "") ? " on" : ""}" data-interactive
    onclick="${send("importTarget", "folderId: ''")}">book root</button>`;
  return (
    root +
    folders
      .map(
        (f) => `<button class="sbi-pick${String(f.id) === sel ? " on" : ""}" data-interactive
        onclick="${send("importTarget", "folderId: '" + Q(f.id) + "'")}">${E(
          (f.depth ? "· ".repeat(Math.min(4, Number(f.depth) || 0)) : "") + f.name
        )}</button>`
      )
      .join("")
  );
}

export function targetLine(x) {
  const t = x.target || {};
  if (x.mode === "new book") return "a new book on the shelf, named below";
  const where = t.folderName ? t.bookName + " ▸ " + t.folderName : t.bookName || "no book chosen";
  return x.mode === "merge by name" ? "into " + where + ", matching names merge" : "into " + where;
}

export function render(ui) {
  const x = (ui && ui.importWin) || null;
  if (!x || !x.open) return "";

  if (x.loading) {
    return `${styles()}
    <div id="sb-importwin" data-modal>
      <div class="sbi-scrim" data-interactive onclick="${send("importWinClose")}"></div>
      <div class="sbi-win" data-interactive onclick="event.stopPropagation()">
        <div class="sbi-head">
          <span class="sbi-title">Import</span>
          <span class="sbi-addr"></span>
          <button class="sbi-x" data-interactive title="Close" onclick="${send("importWinClose")}">✕</button>
        </div>
        <div class="sbi-loading">
          <div class="sbi-wheel" aria-hidden="true"></div>
          <div class="sbi-note">reading your shelf…</div>
        </div>
      </div>
    </div>`;
  }

  const format = String(x.format || "auto");
  const mode = String(x.mode || "new book");
  const preview = x.preview || null;
  const ready = !!(preview && preview.ok && !x.parsing);
  const cards = ready ? Number((preview.counts || {}).cards || 0) : 0;

  const body = x.parsing
    ? `<div class="sbi-empty">reading that text…</div>`
    : !preview
    ? `<div class="sbi-empty">paste a document above and press <b>Read it</b> — nothing is written until you say so.</div>`
    : !preview.ok
    ? `<div class="sbi-empty">${E(
        ((preview.warnings || [])[0] || "nothing card-shaped was found in that text") + ""
      )}</div>`
    : `<div class="sbi-counts">${counts(preview)}</div>${warnings(preview, x)}<div class="sbi-tree">${tree(preview)}</div>`;

  const foot = x.running
    ? `<span class="sbi-note">writing it in…</span>`
    : !ready
    ? `<span class="sbi-note">choose a file or paste the text, press Read it, then import</span>`
    : x.confirm
    ? `<span class="sbi-ask">import ${cards} card${cards === 1 ? "" : "s"} ${E(targetLine(x))}? one undo takes it all back.</span>
       <button class="sbi-btn danger" data-interactive onclick="${send("importApply", "confirm: true")}">Yes — import ${cards}</button>
       <button class="sbi-btn ghost" data-interactive onclick="${send("importApply", "cancel: true")}">Cancel</button>`
    : `<button class="sbi-btn" data-interactive onclick="${send("importApply", "confirm: false")}">Import ${cards} card${
        cards === 1 ? "" : "s"
      }</button>
       <span class="sbi-note">${E(targetLine(x))}</span>`;

  return `${styles()}
  <div id="sb-importwin" data-modal>
    <div class="sbi-scrim" data-interactive onclick="${send("importWinClose")}"></div>
    <div class="sbi-win" data-interactive onclick="event.stopPropagation()">
      <div class="sbi-head">
        <span class="sbi-title">Import</span>
        <span class="sbi-addr">${E(x.notice || "")}</span>
        <button class="sbi-x" data-interactive title="Close" onclick="${send("importWinClose")}">✕</button>
      </div>

      <div class="sbi-paste">
        <div class="sbi-file">
          <label class="sbi-fbtn" for="sb-import-file" data-interactive>Choose a file…</label>
          <input id="sb-import-file" class="sbi-fin" type="file" data-interactive
            accept=".json,.md,.txt,.zip" onchange="${A(FILE_JS)}" />
          <span class="sbi-fname">${E(
            x.fileBusy
              ? "reading " + (x.fileName || "that file") + "…"
              : x.fileName
              ? x.fileName
              : "cards.json, a file from the cards/ folder, a Markdown export, or a Cards .zip"
          )}</span>
        </div>
        <div class="sbi-lab">…or paste the document here
          <span class="sbi-hint">— # Book / ## Folder / ### Card, or a JSON card block. If the picker
            does not open on your device, paste still works.</span>
        </div>
        <textarea id="sb-import-text" class="sbi-ta" data-interactive spellcheck="false"
          placeholder="# Book&#10;&#10;## Folder&#10;&#10;### Card&#10;status: draft&#10;&#10;a summary line…">${E(
            x.text || ""
          )}</textarea>
      </div>

      <div class="sbi-tabs">
        ${formatBtn("auto", format === "auto", preview ? preview.detected : "")}
        ${formatBtn("codexbuilder-md", format === "codexbuilder-md", "")}
        ${formatBtn("markdown", format === "markdown", "")}
        ${formatBtn("csv", format === "csv", "")}
        ${formatBtn("json", format === "json", "")}
        <button class="sbi-btn" data-interactive onclick="${A(READ_JS)}">Read it</button>
        ${
          preview && preview.why
            ? `<span class="sbi-why">${E(
                (preview.override ? "read as " + (FORMAT_LABEL[preview.format] || preview.format) + " — auto said: " : "") +
                  preview.why
              )}</span>`
            : ""
        }
      </div>

      ${ERR.line(x.error, "importWin", "sbi-err")}
      <div class="sbi-body">${body}</div>

      <div class="sbi-where">
        <div class="sbi-modes">
          ${modeBtn("new book", "New book", mode === "new book", "everything lands in a fresh book on the shelf")}
          ${modeBtn("into folder", "Into folder", mode === "into folder", "add it inside the book and folder you pick")}
          ${modeBtn(
            "merge by name",
            "Merge by name",
            mode === "merge by name",
            "cards and folders with the same name are filled in, never overwritten"
          )}
        </div>
        ${
          mode === "new book"
            ? `<div class="sbi-row-in"><label class="sbi-lab2">Book name</label>
                <input id="sb-import-name" class="sbi-in" type="text" spellcheck="false" data-interactive
                  placeholder="${E((preview && preview.bookName) || "Imported Book")}"
                  value="${E(x.bookName || "")}" /></div>`
            : `<div class="sbi-picks"><span class="sbi-lab2">Book</span>${bookOptions(x)}</div>
               <div class="sbi-picks"><span class="sbi-lab2">Folder</span>${folderOptions(x)}</div>
               <input id="sb-import-name" type="hidden" value="${E(x.bookName || "")}" />`
        }
      </div>

      <div class="sbi-foot">${foot}</div>
    </div>
  </div>`;
}

export function styles() {
  return `<style>
  /* The close-on-outside click belongs to a scrim BEHIND the window, not to the window's own parent:
     the engine grants pointer-events only to interactive elements, so a click on plain text inside
     the window used to fall through to the parent's close handler and shut it. */
  #sb-importwin { position: absolute; inset: 0; z-index: 74; display: flex; align-items: center; justify-content: center;
    pointer-events: none; }
  #sb-importwin .sbi-scrim { position: absolute; inset: 0; pointer-events: auto;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-importwin .sbi-win { position: relative; pointer-events: auto;
    width: min(700px, 95%); max-height: 90%; display: flex; flex-direction: column;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 6px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-importwin .sbi-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-importwin .sbi-title { font-weight: 600; letter-spacing: 0.3px; color: var(--sb-accent); }
  #sb-importwin .sbi-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; }
  #sb-importwin .sbi-x { background: none; border: none; color: var(--sb-ink-dim); font-size: calc(17px * var(--sb-fs, 1));
    cursor: pointer; padding: 2px 6px; }
  #sb-importwin .sbi-x:hover { color: var(--sb-accent); }
  #sb-importwin .sbi-paste { padding: 9px 12px 6px; border-bottom: 1px solid var(--sb-line); }
  /* The file door. The real <input type=file> is clipped (never display:none — a display:none input
     is not reliably activated by its label on every engine); the LABEL is the tap target, sized for
     a thumb. */
  #sb-importwin .sbi-file { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; margin-bottom: 8px; }
  #sb-importwin .sbi-fbtn { display: inline-flex; align-items: center; min-height: 38px; padding: 0 15px;
    border-radius: 6px; cursor: pointer; font-size: calc(12px * var(--sb-fs, 1)); font-weight: 600;
    color: var(--sb-accent); border: 1px solid var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel)); }
  #sb-importwin .sbi-fbtn:active { background: color-mix(in oklch, var(--sb-accent) 26%, var(--sb-panel)); }
  #sb-importwin .sbi-fin { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; opacity: 0; }
  #sb-importwin .sbi-fname { flex: 1 1 160px; min-width: 0; font-size: calc(11px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-importwin .sbi-lab { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink); margin-bottom: 5px; }
  #sb-importwin .sbi-hint { color: var(--sb-ink-dim); }
  #sb-importwin .sbi-ta { width: 100%; box-sizing: border-box; min-height: 96px; max-height: 190px; resize: vertical;
    padding: 7px 8px; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.4; color: var(--sb-ink); background: var(--sb-panel);
    border: 1px solid var(--sb-line); border-radius: 5px; font-family: inherit; user-select: text;
    -webkit-user-select: text; }
  #sb-importwin .sbi-ta:focus { outline: none; border-color: var(--sb-accent); }
  #sb-importwin .sbi-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 12px;
    border-bottom: 1px solid var(--sb-line); }
  #sb-importwin .sbi-tab { min-height: 30px; padding: 0 10px; border-radius: 5px; cursor: pointer; font-size: calc(11px * var(--sb-fs, 1));
    border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-tab.on { color: var(--sb-accent); border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel)); }
  #sb-importwin .sbi-why { flex: 1 1 100%; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-err { padding: 8px 14px; font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  #sb-importwin .sbi-body { flex: 1 1 auto; overflow: auto; padding: 8px 12px; -webkit-overflow-scrolling: touch; }
  #sb-importwin .sbi-empty { padding: 22px 14px; text-align: center; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.5;
    color: var(--sb-ink-dim); }
  #sb-importwin .sbi-counts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  #sb-importwin .sbi-chip { font-size: calc(10px * var(--sb-fs, 1)); padding: 2px 7px; border-radius: 999px; color: var(--sb-ink-dim);
    border: 1px solid var(--sb-line); background: var(--sb-panel); }
  #sb-importwin .sbi-warn { margin: 0 0 8px; padding: 6px 9px; border-radius: 5px; font-size: calc(10px * var(--sb-fs, 1));
    color: var(--sb-warn, oklch(0.72 0.16 30));
    border: 1px solid color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 40%, transparent);
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 10%, transparent); }
  #sb-importwin .sbi-warn-h { font-weight: 600; margin-bottom: 3px; }
  #sb-importwin .sbi-warn ul { margin: 0; padding-left: 14px; }
  #sb-importwin .sbi-tree { border: 1px solid var(--sb-line); border-radius: 5px; background: var(--sb-panel);
    overflow: hidden; }
  #sb-importwin .sbi-book { padding: 6px 10px; font-weight: 600; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink);
    background: color-mix(in oklch, var(--sb-accent) 8%, var(--sb-panel)); border-bottom: 1px solid var(--sb-line); }
  #sb-importwin .sbi-row { display: flex; align-items: baseline; gap: 7px; padding: 3px 10px 3px 8px;
    font-size: calc(11px * var(--sb-fs, 1)); border-top: 1px solid color-mix(in oklch, var(--sb-line) 45%, transparent); }
  #sb-importwin .sbi-row.folder .sbi-nm { color: var(--sb-accent); }
  #sb-importwin .sbi-ic { flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-nm { flex: 0 0 auto; color: var(--sb-ink); }
  #sb-importwin .sbi-sum { flex: 1 1 auto; color: var(--sb-ink-dim); overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; }
  #sb-importwin .sbi-meta { flex: 0 0 auto; margin-left: auto; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  /* The JSON preview's second line: what this card is bringing with it, quiet under its title. */
  #sb-importwin .sbi-sub { padding-top: 0; padding-bottom: 3px; font-size: calc(10px * var(--sb-fs, 1));
    color: var(--sb-ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-importwin .sbi-more { padding: 5px 10px; font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim);
    border-top: 1px solid var(--sb-line); }
  #sb-importwin .sbi-where { padding: 8px 12px; border-top: 1px solid var(--sb-line); display: flex;
    flex-direction: column; gap: 6px; }
  #sb-importwin .sbi-modes { display: flex; flex-wrap: wrap; gap: 6px; }
  #sb-importwin .sbi-mode { min-height: 28px; padding: 0 10px; border-radius: 5px; cursor: pointer; font-size: calc(11px * var(--sb-fs, 1));
    border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-mode.on { color: var(--sb-accent); border-color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel)); }
  #sb-importwin .sbi-picks { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
  #sb-importwin .sbi-lab2 { font-size: calc(10px * var(--sb-fs, 1)); color: var(--sb-ink-dim); min-width: 44px; }
  #sb-importwin .sbi-pick { min-height: 24px; padding: 0 8px; border-radius: 4px; cursor: pointer; font-size: calc(10px * var(--sb-fs, 1));
    border: 1px solid var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-pick.on { color: var(--sb-accent); border-color: var(--sb-accent); }
  #sb-importwin .sbi-row-in { display: flex; align-items: center; gap: 8px; }
  #sb-importwin .sbi-in { flex: 1 1 auto; min-height: 30px; padding: 0 8px; font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink);
    background: var(--sb-panel); border: 1px solid var(--sb-line); border-radius: 5px; }
  #sb-importwin .sbi-in:focus { outline: none; border-color: var(--sb-accent); }
  #sb-importwin .sbi-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 9px 14px;
    border-top: 1px solid var(--sb-line); }
  #sb-importwin .sbi-btn { min-height: 30px; padding: 0 12px; border-radius: 5px; cursor: pointer; font-size: calc(12px * var(--sb-fs, 1));
    border: 1px solid var(--sb-accent); background: color-mix(in oklch, var(--sb-accent) 16%, var(--sb-panel));
    color: var(--sb-accent); }
  #sb-importwin .sbi-btn.ghost { border-color: var(--sb-line); background: var(--sb-panel); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-btn.danger { border-color: var(--sb-warn, oklch(0.72 0.16 30));
    color: var(--sb-warn, oklch(0.72 0.16 30));
    background: color-mix(in oklch, var(--sb-warn, oklch(0.72 0.16 30)) 14%, var(--sb-panel)); }
  #sb-importwin .sbi-btn[disabled] { opacity: 0.45; cursor: default; }
  #sb-importwin .sbi-note { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  #sb-importwin .sbi-ask { font-size: calc(11px * var(--sb-fs, 1)); color: var(--sb-warn, oklch(0.72 0.16 30)); }
  /* The shell it wears before its lists arrive. */
  #sb-importwin .sbi-loading { min-height: 220px; display: flex; flex-direction: column; gap: 12px;
    align-items: center; justify-content: center; }
  #sb-importwin .sbi-wheel { width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid color-mix(in oklch, var(--sb-ink) 18%, transparent);
    border-top-color: var(--sb-accent, oklch(0.78 0.13 82)); animation: sbi-spin 0.9s linear infinite; }
  @keyframes sbi-spin { to { transform: rotate(360deg); } }
  /* Everything drawn inside the window takes clicks, so nothing lands on the scrim by accident. */
  #sb-importwin .sbi-win * { pointer-events: auto; }
  </style>`;
}

module.exports = { render, styles };
