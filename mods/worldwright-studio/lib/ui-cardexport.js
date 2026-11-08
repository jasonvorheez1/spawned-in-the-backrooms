const PREVIEW=require("lib/export-preview.js");
// ui-cardexport.js — the export sheet for ONE card or page: Copy text · Markdown file · JSON file.
// PURE render, no api. doc = { title, text, json, stem }; a missing `json` drops that button.

export function E(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function Q(s) {
  return String(s === undefined || s === null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * panel(doc, closeAttr) -> html
 * doc: { title, text, json, stem }
 * closeAttr: the onclick body for the ✕ (each surface closes through its own op).
 */
export function panel(doc, closeAttr) {
  if (!doc) return "";
  const hasJson=!!String(doc.json||"");
  return `<div class="sbp-export" id="sb-export-panel">
    <div class="sbp-pop-head"><span>${E(doc.title||"Export")}</span><button class="sb-btn ghost" data-interactive onclick="${closeAttr}">✕</button></div>
    ${doc.loading?'<p>Gathering this card…</p>':PREVIEW.markup(doc,"card","sbp-export-text","sb-export-text")}
    ${doc.loading?'':`<div class="sbp-ex-acts"><button class="sb-btn" data-interactive onclick="exportPreviewAction(event,'card','copy')">Copy complete text</button><button class="sb-btn" id="sb-cardex-md" data-interactive onclick="exportPreviewAction(event,'card','document')">Markdown file</button>${hasJson?`<button class="sb-btn" id="sb-cardex-json" data-interactive onclick="exportPreviewAction(event,'card','json')">JSON file</button>`:''}</div>`}
    <div class="sbp-pop-foot" id="sb-cardex-note">${hasJson?'The JSON file imports straight back into any book. ':''}Copy and download keep the complete document.</div>
  </div>`;
}

export function styles() {
  return `<style>
  #sb-app .sbp-ex-acts { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 12px 2px; }
  #sb-app .sbp-ex-acts .sb-btn { min-height: 34px; padding: 0 12px; }
  /* Folder view has none of the page window's chrome, so the sheet brings its own when it opens
     there. Scoped to the wrapper — page edit view keeps its own look untouched. */
  #sb-app .sb-cardex-wrap { position: absolute; inset: 0; z-index: 44; display: grid; place-items: center;
    background: color-mix(in oklch, var(--sb-shadow, black) 42%, transparent); }
  #sb-app .sb-cardex-wrap .sbp-export { width: min(620px, 92%); max-height: 82%; overflow: auto;
    background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px;
    box-shadow: 0 18px 44px color-mix(in oklch, var(--sb-shadow, black) 55%, transparent); }
  #sb-app .sb-cardex-wrap .sbp-pop-head { display: flex; align-items: center; gap: 8px;
    padding: 8px 10px 8px 12px; border-bottom: 1px solid var(--line); font-weight: 600; }
  #sb-app .sb-cardex-wrap .sbp-pop-head span { flex: 1 1 auto; }
  #sb-app .sb-cardex-wrap .sbp-export-text { margin: 0; padding: 10px 12px; white-space: pre-wrap;
    word-break: break-word; max-height: 46vh; overflow: auto; font-size: calc(11.5px * var(--sb-fs, 1));
    color: var(--ink); }
  #sb-app .sb-cardex-wrap .sbp-pop-foot { padding: 6px 12px 10px; color: var(--ink-2);
    font-size: calc(10.5px * var(--sb-fs, 1)); }
  </style>`;
}

/** The same sheet, standing on its own over a pane that has no window chrome of its own. */
export function overlay(doc, closeAttr) {
  if (!doc) return "";
  return `<div class="sb-cardex-wrap" id="sb-cardex-wrap" data-interactive
    onclick="if(event.target===this){${closeAttr}}">${panel(doc, closeAttr)}</div>${styles()}`;
}

module.exports = { panel, overlay, styles };
