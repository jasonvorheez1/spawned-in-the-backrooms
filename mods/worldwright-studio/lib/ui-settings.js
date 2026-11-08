// SettingsWindow — the one door into Config. Tabs: Yours, Tags, Remove.
// His ruling: a row only exists here if some line of code reads its key and behaves differently.

export function esc(s) {
  return String(s === undefined || s === null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function jsq(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

const THEME = require("lib/data/ui-theme.yml");

// The unitless multiplier scripts/ui.js publishes as --sb-fs — every chrome font-size is a calc() off it.
const FONT_STEPS = [
  { value: 0.85, label: "Small" },
  { value: 1, label: "Normal" },
  { value: 1.15, label: "Large" },
  { value: 1.3, label: "Larger" },
  { value: 1.5, label: "Largest" },
];

export function fontStep(value) {
  const n = Number(value);
  let best = 1;
  for (const s of FONT_STEPS) if (Math.abs(s.value - n) < 0.001) best = s.value;
  return best;
}

const FIELDS = {
  user: [
    {
      key: "fontScale",
      label: "Font size",
      type: "fontscale",
      hint: "every word in the app at once — menus, tree, cards, the page",
    },
    { key: "cardGrid", label: "Card grid size", type: "select", options: ["small", "medium", "large"] },
    { key: "pageView", label: "Page view", type: "select", options: ["grid", "list", "page"] },
    { key: "scrollBehavior", label: "Scrolling", type: "select", options: ["smooth", "instant"] },
    { key: "depthLabels", label: "Depth labels", type: "labels", hint: "the deepest one keeps applying further down" },
    { key: "exportIncludeDefault", label: "New books included in exports", type: "bool" },
    // Appearance customization is retired; font size and paper zoom remain accessibility controls.
  ],
};

export function control(scope, field, value, locked) {
  const dis = locked ? " disabled" : "";
  const send = (expr, type) =>
    `sendAction('cfgSet', { scope: '${jsq(scope)}', key: '${jsq(field.key)}', type: '${type}', value: ${expr} })`;

  if (field.type === "bool") {
    const on = value !== false && value !== null && value !== undefined;
    return `<div class="seg">
      <button class="seg-btn${on ? " on" : ""}" data-interactive${dis}
        onclick="${send("true", "bool")}">Y</button>
      <button class="seg-btn${on ? "" : " on"}" data-interactive${dis}
        onclick="${send("false", "bool")}">N</button>
    </div>`;
  }
  if (field.type === "fontscale") {
    const cur = fontStep(value);
    return `<div class="seg fs-seg">
      ${FONT_STEPS.map(
        (s) => `<button class="fs-btn${s.value === cur ? " on" : ""}" data-interactive${dis}
        title="${esc(s.label)} — ${Math.round(s.value * 100)}%"
        onclick="${send(String(s.value), "number")}">${esc(s.label)}</button>`
      ).join("")}
    </div>`;
  }
  if (field.type === "select") {
    const cur = value === null || value === undefined ? "inherit" : String(value);
    return `<select data-interactive${dis} onchange="${send("this.value === 'inherit' ? null : this.value", "raw")}">
      ${(field.options || [])
        .map((o) => `<option value="${esc(o)}"${o === cur ? " selected" : ""}>${esc(o)}</option>`)
        .join("")}
    </select>`;
  }
  if (field.type === "choice") {
    const cur = String(value === null || value === undefined ? "" : value);
    return `<select data-interactive${dis} onchange="${send("this.value", "number")}">
      ${(field.options || [])
        .map((o) => `<option value="${esc(o.value)}"${String(o.value) === cur ? " selected" : ""}>${esc(o.label)}</option>`)
        .join("")}
    </select>`;
  }
  if (field.type === "labels") {
    const text = Array.isArray(value) ? value.join(", ") : "";
    return `<input type="text" class="labels" value="${esc(text)}" placeholder="Part, Chapter, Scene…"
      data-interactive${dis}
      onchange="${send(
        "JSON.stringify(this.value.split(',').map(function(s){return s.trim();}).filter(function(s){return s.length;}))",
        "json"
      )}" />`;
  }
  const step = field.step ? ` step="${esc(field.step)}"` : "";
  return `<div class="num-wrap">
    <input type="number"${step} value="${esc(Number(value) || 0)}" data-interactive${dis}
      onchange="${send("this.value", "number")}" />
    ${field.suffix ? `<span class="suffix">${esc(field.suffix)}</span>` : ""}
  </div>`;
}

export function rows(scope, fields, values, locked) {
  if (!values) return `<div class="cfg-empty">nothing to configure here yet.</div>`;
  return fields
    .map(
      (f) => `<div class="cfg-row">
        <div class="cfg-label">${esc(f.label)}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ""}</div>
        ${control(scope, f, values[f.key], locked)}
      </div>`
    )
    .join("");
}

// audioMaster writes a number; audioCategories re-sends the whole map with one key moved.
const SFX_ROWS = [
  { cat: "", label: "Master volume", hint: "everything the app says, scaled at once", demo: "ui.buttonPress" },
  { cat: "ui", label: "Presses", hint: "buttons, menu taps, toggles — the only sounds left", demo: "ui.menuOpen" },
];

export function level(value, fallback) {
  const n = Number(value);
  if (!isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function soundRows(values) {
  const cats = values && values.audioCategories && typeof values.audioCategories === "object" ? values.audioCategories : {};
  const base = esc(JSON.stringify(cats));
  return SFX_ROWS.map((r) => {
    const v = r.cat ? level(cats[r.cat], 1) : level(values ? values.audioMaster : 1, 1);
    const write = r.cat
      ? `sendAction('cfgSet', { scope: 'user', key: 'audioCategories', type: 'json', value: JSON.stringify(Object.assign({}, ${base}, { '${jsq(r.cat)}': Number(this.value) })) })`
      : `sendAction('cfgSet', { scope: 'user', key: 'audioMaster', type: 'number', value: this.value })`;
    return `<div class="cfg-row snd-row">
      <div class="cfg-label">${esc(r.label)}<span class="hint">${esc(r.hint)}</span></div>
      <button class="snd-test" data-interactive title="hear it"
        onclick="sendAction('sfxCue', { event: '${jsq(r.demo)}' })">♪</button>
      <input type="range" min="0" max="1" step="0.05" value="${v}" class="snd-range" data-interactive
        oninput="var o=this.closest('.snd-row').querySelector('.snd-val'); if (o) { o.textContent = Math.round(this.value * 100) + '%'; o.className = Number(this.value) > 0 ? 'snd-val' : 'snd-val off'; }"
        onchange="${write}" />
      <span class="snd-val${v > 0 ? "" : " off"}">${Math.round(v * 100)}%</span>
    </div>`;
  }).join("");
}

// The three tags lib/refs.js resolves on its own; the writer's own live in lib/tagdefs.js.
const BUILTIN_TAGS = [
  {
    chip: "#[COUNT:name]",
    say: "a running counter — the first one renders 1, the next 2, on down the page.",
  },
  {
    chip: "#[TOTAL:name]",
    say: "how many times that counter name appears in the whole rendered output, wherever it sits.",
  },
  {
    chip: "#[DATETIME:pattern]",
    say: "the date and time, stamped the moment you insert it.",
    hint: "default pattern YYYY-MM-DD HH:mm — one that arrives unstamped (imported text) is resolved as it renders and marked with an asterisk.",
  },
];

// Mirrors the collisions lib/tagdefs.js refuses on write — that copy binds, this one is just fast.
const NAME_CHECK =
  "var v=this.value.trim().toUpperCase()," +
  "e=this.closest('.tag-add').querySelector('.tag-err'),r='';" +
  "if(v){" +
  "if(v.indexOf('[')!==-1||v.indexOf(']')!==-1)r='a tag name cannot contain [ or ] — the token grammar owns those';" +
  "else if(v.indexOf(':')!==-1||v.indexOf(';')!==-1)r='a tag name cannot contain : or ; — those separate the parts of a token';" +
  "else if(v==='COUNT'||v==='TOTAL'||v==='DATETIME')r=v+' is a built-in tag — pick another name';" +
  "else if(/^[0-9A-Z]{13}$/.test(v))r='that is the shape of a card id — a tag by that name would shadow every reference to it';" +
  "}e.textContent=r;e.className=r?'tag-err on':'tag-err';";

const ADD_SEND =
  "sendAction('tagDefAct', { op: 'add'," +
  " name: this.closest('.tag-add').querySelector('.tag-name').value," +
  " value: this.closest('.tag-add').querySelector('.tag-val').value," +
  " note: this.closest('.tag-add').querySelector('.tag-note').value })";

export function builtinTagRows() {
  return BUILTIN_TAGS.map(
    (t) => `<div class="cfg-row tag-row">
      <code class="tag-chip">${esc(t.chip)}</code>
      <div class="tag-say">${esc(t.say)}${t.hint ? `<span class="hint">${esc(t.hint)}</span>` : ""}</div>
    </div>`
  ).join("");
}

// A rename is an insert plus a delete in the store, never an UPDATE of a key.
export function customTagRows(defs) {
  return defs
    .map((d) => {
      const n = jsq(d.name);
      return `<div class="cfg-row tag-def">
        <input class="tag-name" type="text" value="${esc(d.name)}" spellcheck="false" data-interactive
          onchange="sendAction('tagDefAct', { op: 'rename', name: '${n}', to: this.value })" />
        <input class="tag-val" type="text" value="${esc(d.value)}" placeholder="renders as…" data-interactive
          onchange="sendAction('tagDefAct', { op: 'set', name: '${n}', field: 'value', value: this.value })" />
        <input class="tag-note" type="text" value="${esc(d.note)}" placeholder="note" data-interactive
          onchange="sendAction('tagDefAct', { op: 'set', name: '${n}', field: 'note', value: this.value })" />
        <button class="tag-x" title="remove this tag" data-interactive
          onclick="sendAction('tagDefAct', { op: 'remove', name: '${n}' })">✕</button>
      </div>`;
    })
    .join("");
}

export function tagsBody(cfg) {
  const st = cfg.tags || {};
  const defs = Array.isArray(st.defs) ? st.defs : [];
  const draft = st.draft || {};
  const err = String(st.error || draft.reason || "");

  const builtins = `<div class="tag-head">Built in</div>
    ${builtinTagRows()}`;


  const table = defs.length
    ? `<div class="tag-cols"><span class="c1">Name</span><span class="c2">Renders as</span><span class="c3">Note</span><span class="c4"></span></div>
       ${customTagRows(defs)}`
    : `<div class="cfg-empty">define a token once — type <code class="tag-chip">#[HOUSE]</code> anywhere in a card and it renders as its value.</div>`;

  return `<div class="note">tags are the #[…] tokens inside card text. TagResolver reads them first, before references.</div>
    ${builtins}
    <div class="tag-head"><span>Yours</span><span class="spacer"></span>
      <button class="mini" data-interactive title="re-read your tags"
        onclick="sendAction('tagDefAct', { op: 'load' })">↻</button></div>
    ${table}
    <div class="tag-add">
      <div class="cfg-row tag-def">
        <input class="tag-name" type="text" placeholder="HOUSE" spellcheck="false" value="${esc(draft.name || "")}" data-interactive
          oninput="${NAME_CHECK}"
          onkeydown="if (event.key === 'Enter') { ${ADD_SEND}; }" />
        <input class="tag-val" type="text" placeholder="renders as…" value="${esc(draft.value || "")}" data-interactive
          onkeydown="if (event.key === 'Enter') { ${ADD_SEND}; }" />
        <input class="tag-note" type="text" placeholder="note (optional)" data-interactive />
        <button class="tag-btn" data-interactive onclick="${ADD_SEND}">Add</button>
      </div>
      <div class="tag-err${err ? " on" : ""}">${
        err
          ? `<button class="sb-err-x" title="Dismiss" aria-label="Dismiss" data-interactive
              onclick="event.stopPropagation();sendAction('errClear', { where: 'tags' })">✕</button><span class="sb-err-t">${esc(
              err
            )}</span>`
          : ""
      }</div>
    </div>
    <div class="note">a name is uppercase and matched as written: #[HOUSE] resolves, #[house] stays on the page as typed.</div>`;
}

export function styles() {
  return `<style>
  #sb-cfg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 55%, transparent); z-index: 70; } /* over the page bar (50) + dropdowns (60), same law as #sb-theme */
  #sb-cfg .win { width: 620px; max-width: 92%; max-height: 86%; display: flex; flex-direction: column;
    background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 55%, transparent); }
  #sb-cfg .title { display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    border-bottom: 1px solid var(--line); background: var(--panel-2); font-weight: 600; }
  #sb-cfg .title .spacer { flex: 1 1 auto; }
  #sb-cfg .x { width: 24px; height: 24px; border-radius: 4px; cursor: pointer; background: transparent;
    border: 1px solid transparent; color: var(--ink-2); }
  #sb-cfg .x:hover { background: var(--panel-3); color: var(--ink); }
  #sb-cfg .tabs { display: flex; gap: 2px; padding: 8px 10px 0; border-bottom: 1px solid var(--line); }
  #sb-cfg .tab { padding: 7px 12px; font-size: calc(12px * var(--sb-fs, 1)); cursor: pointer; color: var(--ink-2);
    background: transparent; border: 1px solid transparent; border-bottom: none;
    border-radius: 5px 5px 0 0; }
  #sb-cfg .tab.on { color: var(--ink); background: var(--panel-2); border-color: var(--line); }
  #sb-cfg .tab.off { opacity: 0.35; cursor: default; }
  #sb-cfg .body { flex: 1 1 auto; min-height: 0; padding: 12px 16px 18px; overflow-y: auto;
    -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; } /* same scroll law as #sb-theme .body */
  #sb-cfg .cfg-row { display: flex; align-items: center; gap: 12px; padding: 7px 0;
    border-bottom: 1px solid color-mix(in oklch, var(--sb-line) 50%, transparent); }
  #sb-cfg .cfg-label { flex: 1 1 auto; font-size: calc(12px * var(--sb-fs, 1)); display: flex; flex-direction: column; gap: 2px; }
  #sb-cfg .cfg-label .hint { font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-2); opacity: 0.8; }
  #sb-cfg input[type="number"] { width: 82px; }
  #sb-cfg input.labels { width: 240px; }
  #sb-cfg input, #sb-cfg select { background: var(--panel-3); color: var(--ink);
    border: 1px solid var(--line); border-radius: 4px; padding: 4px 6px; font: inherit; font-size: calc(12px * var(--sb-fs, 1)); }
  #sb-cfg input:disabled, #sb-cfg select:disabled { opacity: 0.45; }
  #sb-cfg .num-wrap { display: flex; align-items: center; gap: 6px; }
  /* the font-size steps — one segmented strip, sized in the very type it sets, so the row is a
     preview of the click. min-width:0 on the label lets it give ground at the largest step. */
  #sb-cfg .cfg-label { min-width: 0; }
  #sb-cfg .fs-seg { display: flex; flex: 0 0 auto; }
  #sb-cfg .fs-btn { padding: 3px 8px; cursor: pointer; white-space: nowrap; font: inherit;
    font-size: calc(11px * var(--sb-fs, 1)); background: var(--panel-3); color: var(--ink-2);
    border: 1px solid var(--line); border-left: 0; }
  #sb-cfg .fs-btn:first-child { border-left: 1px solid var(--line); border-radius: 4px 0 0 4px; }
  #sb-cfg .fs-btn:last-child { border-radius: 0 4px 4px 0; }
  #sb-cfg .fs-btn:hover { color: var(--ink); }
  #sb-cfg .fs-btn.on { background: var(--accent); color: var(--sb-bg); border-color: var(--accent);
    font-weight: 600; }
  #sb-cfg .fs-btn:disabled { opacity: 0.45; cursor: default; }
  #sb-cfg .suffix { font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-2); }
  #sb-cfg .note { font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-2); padding: 8px 0 2px; }
  #sb-cfg .cfg-empty { padding: 22px 0; font-size: calc(12px * var(--sb-fs, 1)); color: var(--ink-2); text-align: center; }
  /* tags — the same row rhythm as every other setting: 12px labels, 10.5px hints, one hairline
     between rows. Only the mono chip is new. */
  #sb-cfg .tag-head { display: flex; align-items: center; gap: 8px; padding: 14px 0 4px;
    font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.4px; text-transform: uppercase; color: var(--ink-2); }
  #sb-cfg .tag-head .spacer { flex: 1 1 auto; }
  #sb-cfg .tag-head .mini { font-size: calc(12px * var(--sb-fs, 1)); letter-spacing: 0; text-transform: none; line-height: 1;
    padding: 2px 6px; border-radius: 4px; cursor: pointer; color: var(--ink-2);
    background: transparent; border: 1px solid transparent; }
  #sb-cfg .tag-head .mini:hover { background: var(--panel-3); color: var(--ink); }
  #sb-cfg .snd-row { gap: 8px; }
  #sb-cfg input[type="range"] { width: 148px; padding: 0; background: transparent; border: none;
    accent-color: var(--ink-2); }
  #sb-cfg .snd-val { width: 40px; text-align: right; font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-2); }
  #sb-cfg .snd-val.off { opacity: 0.5; text-decoration: line-through; }
  #sb-cfg .snd-test { width: 24px; height: 22px; flex: 0 0 auto; border-radius: 4px; cursor: pointer;
    font: inherit; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1; background: var(--panel-3); color: var(--ink-2);
    border: 1px solid var(--line); }
  #sb-cfg .snd-test:hover { color: var(--ink); border-color: var(--ink-2); }
  #sb-cfg .tag-row { align-items: flex-start; }
  #sb-cfg .tag-chip { flex: 0 0 auto; padding: 2px 6px; border-radius: 4px; font-size: calc(11px * var(--sb-fs, 1));
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--panel-3); border: 1px solid var(--line); color: var(--ink); }
  #sb-cfg .tag-say { flex: 1 1 auto; display: flex; flex-direction: column; gap: 2px;
    font-size: calc(12px * var(--sb-fs, 1)); color: var(--ink-2); }
  #sb-cfg .tag-say .hint { font-size: calc(10.5px * var(--sb-fs, 1)); opacity: 0.8; }
  #sb-cfg .tag-cols { display: flex; gap: 8px; padding: 10px 0 3px; font-size: calc(10px * var(--sb-fs, 1));
    letter-spacing: 1.2px; text-transform: uppercase; color: var(--ink-2); opacity: 0.7; }
  #sb-cfg .tag-def { gap: 8px; }
  #sb-cfg .tag-def input { min-width: 0; }
  #sb-cfg .tag-name, #sb-cfg .tag-cols .c1 { width: 150px; flex: 0 0 auto; }
  #sb-cfg .tag-name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase; }
  #sb-cfg .tag-val, #sb-cfg .tag-note,
  #sb-cfg .tag-cols .c2, #sb-cfg .tag-cols .c3 { flex: 1 1 auto; }
  #sb-cfg .tag-cols .c4 { width: 26px; flex: 0 0 auto; }
  #sb-cfg .tag-x { width: 26px; height: 24px; flex: 0 0 auto; border-radius: 4px; cursor: pointer;
    background: transparent; border: 1px solid transparent; color: var(--ink-2); font: inherit; }
  #sb-cfg .tag-x:hover { background: var(--panel-3); color: var(--ink); }
  #sb-cfg .tag-btn { flex: 0 0 auto; padding: 4px 10px; border-radius: 4px; cursor: pointer;
    font: inherit; font-size: calc(12px * var(--sb-fs, 1)); background: var(--panel-3); color: var(--ink);
    border: 1px solid var(--line); }
  #sb-cfg .tag-btn:hover { border-color: var(--ink-2); }
  #sb-cfg .tag-add .cfg-row { border-bottom: none; }
  #sb-cfg .tag-err { min-height: 14px; padding-left: 158px; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-2); }
  #sb-cfg .tag-err.on { color: var(--sb-warn); }
  /* the door out: a count column, a typed word, one button that reads it */
  #sb-cfg .rm-n { flex: 0 0 auto; min-width: 48px; text-align: right;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--ink); }
  #sb-cfg .rm-gate { gap: 8px; align-items: center; }
  #sb-cfg .rm-word { flex: 1 1 auto; min-width: 0; font: inherit;
    font-size: calc(12px * var(--sb-fs, 1)); padding: 5px 8px; border-radius: 4px;
    background: var(--panel-2); color: var(--ink); border: 1px solid var(--line);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; }
  #sb-cfg .rm-go { border-color: var(--sb-warn); color: var(--sb-warn); }
  #sb-cfg .rm-go:hover:not(:disabled) { background: var(--sb-warn); color: var(--panel); }
  #sb-cfg .rm-go:disabled { opacity: 0.6; cursor: default; }
  </style>`;
}

// Owner-only, and gated on the typed word — lib/uninstall.js refuses anything else.
const REMOVE_SEND =
  "sendAction('appRemove', { confirm:" +
  " this.closest('.rm-gate').querySelector('.rm-word').value })";

export function removeBody(cfg) {
  const r = cfg.remove || {};
  if (r.done) {
    return `<div class="note">Worldwright Studio is out of this game — ${Number(r.dropped) || 0} tables
      dropped, nothing of it left in the database. Reload the room and the panel comes back empty,
      ready to start over, or take the tool off the game and it leaves no trace.</div>`;
  }
  const s = r.survey;
  const line = (n, one, many) =>
    `<div class="cfg-row"><div class="cfg-label">${esc(
      Number(n) === 1 ? one : many
    )}</div><div class="rm-n">${Number(n) || 0}</div></div>`;
  const census = r.loading
    ? `<div class="cfg-empty"><span class="sb-spin"></span> counting what's here…</div>`
    : s
    ? line(s.books, "book", "books") +
      line(s.cards, "card", "cards") +
      line(s.pages, "page", "pages") +
      line(s.images, "picture", "pictures")
    : `<div class="cfg-empty">nothing counted yet.</div>`;
  return `<div class="note">This removes Worldwright Studio's own tables from this game — every book,
      card, page, picture and preference it ever wrote. It cannot be undone: the
      change log is one of the things that goes. <b>Export anything you want to keep first</b>
      (Book ▸ Export). Nothing else in your game is touched.</div>
    <div class="tag-head">What would be removed</div>
    ${census}
    <div class="tag-head">Remove it</div>
    <div class="cfg-row rm-gate">
      <div class="cfg-label">type <b>${esc((s && s.confirm) || "REMOVE EVERYTHING")}</b></div>
      <input class="rm-word" type="text" spellcheck="false" placeholder="REMOVE EVERYTHING" data-interactive />
      <button class="tag-btn rm-go" data-interactive ${r.busy ? "disabled" : ""}
        onclick="${REMOVE_SEND}">${r.busy ? "Removing…" : "Remove Worldwright Studio"}</button>
    </div>
    <div class="tag-err${r.error ? " on" : ""}">${esc(r.error || "")}</div>`;
}

export function settingsWindow(ui) {
  const cfg = Object.assign({ open: false, tab: "user" }, ui.config || {});
  if (!cfg.open) return "";
  const host = !!((ui.room || {}).owner);
  const tab = ["user", "tags", "remove"].includes(cfg.tab) ? cfg.tab : "user";

  const tabs = [
    { id: "user", label: "Yours", on: true },
    { id: "tags", label: "Tags", on: true },
  ].concat(host ? [{ id: "remove", label: "Remove", on: true }] : [])
    .map((t) => {
      // One gesture, one action — two sendAction calls in one attribute swallowed the click.
      const go = `sendAction('cfgTab', { tab: '${jsq(t.id)}' })`;
      return `<button class="tab${tab === t.id ? " on" : ""}${t.on ? "" : " off"}" data-interactive
        ${t.on ? `onclick="${go}"` : "disabled"}>${esc(t.label)}</button>`;
    })
    .join("");

  let body = "";
  if (tab === "user") {
    body = `<div class="note">these follow you into every room.</div>
      ${rows("user", FIELDS.user, cfg.user, false)}
      <div class="tag-head">Sound</div>
      ${
        cfg.user
          ? soundRows(cfg.user) +
            `<div class="note">nothing here is loud on purpose — the app confirms an action, it never announces one. muting the master silences everything at once, no reload.</div>`
          : `<div class="cfg-empty">your settings haven't arrived yet.</div>`
      }`;
  } else if (tab === "remove" && host) {
    body = removeBody(cfg);
  } else {
    body = tagsBody(cfg);
  }

  return `${styles()}
  <div id="sb-cfg" data-modal>
    <div class="win">
      <div class="title"><span>Settings</span><span class="spacer"></span>
        <button class="x" data-interactive onclick="sendAction('cfgClose', {})">✕</button></div>
      <div class="tabs">${tabs}</div>
      <!-- data-interactive on the scroll pane: an unmarked drag goes to the god-mode camera
           (same law as #sb-theme .body, his 2026-08-26 report). -->
      <div class="body" data-interactive>${body}</div>
    </div>
    ${cfg.loading ? `<div class="sb-modal-veil"><div class="sb-spin"></div></div>` : ""}
  </div>`;
}

module.exports = { settingsWindow, FIELDS };
