const SOUND_ORIGIN=require("lib/sound-origin.js");
// ui-cards.js — the centre pane's card surfaces: folder view, stack view, the card edit modal, search results. CONTRACT: render(state) -> html string. House rule 4: every scrap of author text goes through refs.escapeText on the way into the html.

const REFS = require("lib/refs.js");
const ERR = require("lib/ui-err.js");
const PL = require("lib/pagelayout.js");
const PREFS = require("lib/ui-prefs.js");
const STATUS = require("lib/status.js");
const CARDEX = require("lib/ui-cardexport.js");
const PIN = require("lib/pinned.js");
// REALM_V and bootScript() are read off the module — never copied — so one bump moves both lanes.
const REFPICK = require("lib/refpick.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

// For text that lands inside a JS string inside an HTML attribute.
export function Q(s) {
  return String(s === undefined || s === null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function act(op, extra) {
  const body = extra ? ", " + extra : "";
  return "sendAction('cardAct', { op: '" + Q(op) + "'" + body + " })";
}

// No regex literal here on purpose.
const RX_SPECIALS = ".*+?^()|[]{}/-\\";

export function rxEscape(s) {
  const str = String(s);
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    out += RX_SPECIALS.indexOf(ch) === -1 ? ch : "\\" + ch;
  }
  return out;
}

export function hlTerms(terms) {
  const list = (Array.isArray(terms) ? terms : String(terms || "").split(/\s+/))
    .map((t) => String(t || "").trim())
    .filter((t) => t !== "");
  // Longest first, so "testcard" wins over "test" when both are typed.
  return list.sort((a, b) => b.length - a.length).slice(0, 8);
}

export function HL(s, terms) {
  const escd = E(s);
  const list = hlTerms(terms);
  if (!list.length || !escd) return escd;
  let re;
  try {
    re = new RegExp("(" + list.map(rxEscape).join("|") + ")", "gi");
  } catch (e) {
    return escd;
  }
  return escd
    .split(/(&#?\w+;)/)
    .map((chunk, i) => (i % 2 === 1 ? chunk : chunk.replace(re, '<mark class="sb-hit">$1</mark>')))
    .join("");
}

const MENUS = {
  book: ["Move Up", "Duplicate", "Trash", "Move Down"],
  folder: ["Move Left", "Duplicate", "Trash", "Move Right"],
  card: ["Shift Left", "Create Stack", "Move To…", "Shift Right"],
  stack: ["Shift Left", "Duplicate Card", "Move To…", "Shift Right"],
};

// doc 26's per-view editor bar, in his words and his order.
const EDITOR_BAR = {
  // his ask: Export sits immediately RIGHT of Edit; the three choices live in the sheet it opens.
  folder: ["Open Pages", "Edit", "Export", "Move Left", "Move Right", "Move to Folder", "Duplicate", "Trash"],
  stack: ["Open Pages", "Edit", "Export", "Move Up", "Move Down", "Set as Primary", "Duplicate to New Stack", "Trash"],
  folderSel: ["Rename", "Move Left", "Move Right", "Duplicate", "Trash"],
};

// The word for the depth you are creating INTO: 0 = Folder, 1 = Subfolder, 2 = Sub-subfolder, (L4)…
export function folderWord(depth, labels) {
  const d = Math.max(0, Math.floor(Number(depth) || 0));
  if (Array.isArray(labels) && labels.length) {
    return String(labels[Math.min(d, labels.length - 1)] || "Folder");
  }
  if (d === 0) return "Folder";
  if (d === 1) return "Subfolder";
  if (d === 2) return "Sub-subfolder";
  return "Folder (L" + (d + 1) + ")";
}

export function folderDefaultName(depth, labels) {
  return "New " + folderWord(depth, labels);
}

// ── THE DESIGNATION ────────────────────────────────────────────────────────────────────────────── jace, 2026-08-28: "We will want a cinematic folder… We can add a flag to it… Not just cinema. js reads it; this is only its vocabulary on the surface. `seg` is the word on the metadata pane's switch (folders get no ⋯ menu — the designation lives in metadata only).
const DOCS = [
  { id: "", label: "Story", seg: "Story", short: "", glyph: "" },
  { id: "cinematic", label: "Cinematic doc", seg: "Cinematic", short: "cinematic", glyph: "◈" },
  { id: "level", label: "Level doc", seg: "Level", short: "level", glyph: "⬚" },
];

export function docRow(doc) {
  const want = String(doc === undefined || doc === null ? "" : doc);
  for (const d of DOCS) {
    if (d.id === want) return d;
  }
  return DOCS[0];
}

export function docMark(f) {
  const d = docRow(f && f.doc);
  if (!d.id) return "";
  return `<span class="sb-docmark ${E(d.id)}" title="${E(d.label)} — this folder compiles">${E(d.glyph)}&nbsp;${E(
    d.short
  )}</span>`;
}

const OPS = {
  "Shift Left": "shiftLeft",
  "Shift Right": "shiftRight",
  "Move Left": "shiftLeft",
  "Move Right": "shiftRight",
  "Move Up": "shiftUp",
  "Move Down": "shiftDown",
  "Create Stack": "newStack",
  "Create New Stack": "newStack",
  "Move To…": "moveTo",
  "Move to Folder": "moveTo",
  Duplicate: "duplicate",
  "Duplicate Card": "dupVersion",
  "Duplicate to New Stack": "dupStack",
  "Set as Primary": "primary",
  "Open Pages": "openPages",
  Trash: "trash",
  Edit: "edit",
  Export: "exportCard",
  Rename: "renameStart",
};

// Which ops CHANGE the book — cards.js throws on every one for a locked book.
const WRITE_OPS = {
  shiftLeft: 1, shiftRight: 1, shiftUp: 1, shiftDown: 1,
  newStack: 1, moveTo: 1, duplicate: 1, dupVersion: 1, dupStack: 1,
  primary: 1, trash: 1, edit: 1, renameStart: 1,
};

export function readsOnly(label) {
  return !WRITE_OPS[OPS[label] || ""];
}

export function roNote() {
  return `<div class="sb-empty-note">read-only — this book is written for you.</div>`;
}

// GESTURE — his approved desktop mapping: click = tap, double-click = double-tap, right-click = hold.
const GESTURE = {
  cycleOnFlick: true,
  flickMs: 250,
  flickPx: 40,
  flickRatio: 2,
  pickupMs: 180,
  holdMs: 700,
  slopPx: 6,
};

const SORTS = [
  { id: "default", label: "Default", hint: "Insertion order" },
  { id: "status", label: "Status", hint: "Grouped by status" },
  { id: "openq", label: "Open Q", hint: "Open questions first" },
  { id: "alpha", label: "Alphabetical", hint: "Card name A–Z" },
  { id: "age", label: "Age", hint: "Oldest first" },
];

export function lower(s) {
  return String(s == null ? "" : s).toLowerCase();
}

export function cmpText(a, b) {
  const x = lower(a);
  const y = lower(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function sortTiles(list, sort) {
  const mode = String((sort && sort.mode) || "default");
  const desc = String((sort && sort.dir) || "asc") === "desc";
  const rows = (list || []).map((c, i) => ({ c, i }));
  const by = {
    default: (a, b) => a.i - b.i,
    status: (a, b) => {
      const sa = lower(a.c.status);
      const sb = lower(b.c.status);
      if (sa !== sb) {
        if (!sa) return 1;
        if (!sb) return -1;
        return sa < sb ? -1 : 1;
      }
      return cmpText(a.c.name, b.c.name) || a.i - b.i;
    },
    openq: (a, b) => {
      const oa = a.c.openQuestion ? 0 : 1;
      const ob = b.c.openQuestion ? 0 : 1;
      return oa - ob || cmpText(a.c.name, b.c.name) || a.i - b.i;
    },
    alpha: (a, b) => cmpText(a.c.name, b.c.name) || a.i - b.i,
    age: (a, b) => (Number(a.c.createdAt) || 0) - (Number(b.c.createdAt) || 0) || a.i - b.i,
  };
  const f = by[mode] || by.default;
  rows.sort(f);
  if (desc) rows.reverse();
  return rows.map((r) => r.c);
}

// his row-wrap rule needs no column count: the grid is row-major and dense.
export function wrapMove(order, id, dir) {
  const ids = (order || []).map((v) => String(v));
  const i = ids.indexOf(String(id));
  if (i < 0) return null;
  if (dir === "left") {
    if (i === 0) return null;
    return { beforeId: ids[i - 1] };
  }
  if (i === ids.length - 1) return null;
  return { afterId: ids[i + 1] };
}

export function wordCount(text) {
  const t = String(text == null ? "" : text).trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function pageWords(p) {
  const pg = p || {};
  return wordCount(pg.header) + wordCount(pg.content) + wordCount(pg.footer);
}

export function address(segments, maxChars) {
  const parts = (segments || []).map((s) => String(s == null ? "" : s)).filter((s) => s !== "");
  const cap = Number(maxChars) || 46;
  if (parts.length <= 2) return parts;
  const full = parts.join(" > ");
  if (parts.length <= 3 && full.length <= cap) return parts;
  return [parts[0], "…", parts[parts.length - 1]];
}

// his ruling (2026-08-16): the status palette is STANDARD — one colour per status under every theme.
const STATUSES = STATUS.STATUSES;
const STATUS_HUE = STATUS.STATUS_HUE;

export function statusOptions(current) {
  const cur = String(current || "");
  const known = Object.prototype.hasOwnProperty.call(STATUS_HUE, lower(cur));
  let out = `<option value=""${cur ? "" : " selected"}>— unset —</option>`;
  for (const s of STATUSES) {
    out += `<option value="${E(s.name)}"${lower(cur) === lower(s.name) ? " selected" : ""}>${E(s.name)}</option>`;
  }
  if (cur && !known) out += `<option value="${E(cur)}" selected>${E(cur)}</option>`;
  return out;
}

export function statusPill(status) {
  const s = String(status || "");
  if (!s) return "";
  const col = STATUS.statusColor(s);
  const ink = STATUS.statusInk(s);
  return `<span class="sb-pill" style="background:${col};border-color:color-mix(in oklch, ${col} 72%, black);color:${ink}">${E(s)}</span>`;
}

// his call: on a card tile the NAME rides in this strip, the status word small beside it.
export function statusBanner(status, priority, nameHtml, trim) {
  const t = trim || {};
  const s = String(status || "");
  const dots = t.prio === false ? "" : priorityDots(priority);
  const named = nameHtml ? `<span class="sb-banner-n">${nameHtml}</span>` : "";
  const mark = t.mark || "";
  const word =
    t.word === false
      ? ""
      : nameHtml
        ? `<span class="sb-banner-s">${E(s || "unset")}</span>`
        : `<span class="sb-banner-t">${E(s || "unset")}</span>`;
  if (!s) {
    return `<div class="sb-banner none${nameHtml ? " named" : ""}">${named}${mark}${word}${dots}</div>`;
  }
  const col = STATUS.statusColor(s);
  const ink = STATUS.statusInk(s);
  return `<div class="sb-banner${nameHtml ? " named" : ""}" style="background:linear-gradient(${col}, color-mix(in oklch, ${col} 90%, black));border-bottom-color:color-mix(in oklch, ${col} 72%, black);color:${ink}">
      ${named}${mark}${word}${dots}
    </div>`;
}

const BADGES = [
  { key: "words", one: "word", many: "words", title: "words" },
  { key: "pages", one: "page", many: "pages", title: "pages" },
  { key: "sections", one: "section", many: "sections", title: "sections" },
  { key: "tags", one: "tag", many: "tags", title: "tags" },
  { key: "refsOut", one: "ref out", many: "refs out", title: "references out" },
  { key: "refsIn", one: "ref in", many: "refs in", title: "references in" },
];

const ALWAYS = { words: true, pages: true, sections: true, tags: true };

export function statBadges(stats) {
  const s = stats && typeof stats === "object" ? stats : {};
  let out = "";
  for (const b of BADGES) {
    const n = Math.max(0, Math.floor(Number(s[b.key]) || 0));
    if (!n && !ALWAYS[b.key]) continue;
    const shown = n > 999 ? Math.round(n / 100) / 10 + "k" : String(n);
    const word = n === 1 ? b.one : b.many;
    out += `<span class="sb-badge${n ? "" : " zero"}" title="${n} ${b.title}">${E(shown)}&nbsp;${E(word)}</span>`;
  }
  return out ? `<div class="sb-badges">${out}</div>` : "";
}

// Priority reads as a word and a number — his call: dots looked like a menu affordance.
export function priorityDots(priority) {
  const n = Math.max(0, Math.min(5, Math.floor(Number(priority) || 0)));
  if (!n) return "";
  return `<span class="sb-prio" title="Priority ${n}">Priority: ${n}</span>`;
}

export function folderGlyph() {
  return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <path d="M3.5 6.5h5.2l1.7 2.1h10.1v9.4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`;
}

export function holdsText(counts) {
  const c = counts && typeof counts === "object" ? counts : {};
  const f = Math.max(0, Math.floor(Number(c.folders) || 0));
  const n = Math.max(0, Math.floor(Number(c.cards) || 0));
  const parts = [];
  if (f) parts.push(f + (f === 1 ? " folder" : " folders"));
  if (n) parts.push(n + (n === 1 ? " card" : " cards"));
  return parts.length ? parts.join(", ") : "empty";
}

export function stackGlyph() {
  return `<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
    <rect x="1.5" y="4.5" width="9" height="9" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.2"/>
    <path d="M4.5 3.2h7.3a1.2 1.2 0 0 1 1.2 1.2v7.1" fill="none" stroke="currentColor" stroke-width="1.2"/>
  </svg>`;
}

const STACK_MAX_LAYERS = 6;
const STACK_STEP = 8;
const STACK_COMPRESS = 0.62;

export function stackOffsets(size, scale) {
  const shown = Math.max(1, Math.min(STACK_MAX_LAYERS, Math.floor(Number(size) || 1)));
  const k = Number(scale) > 0 ? Number(scale) : 1;
  const out = [];
  let off = 0;
  let step = STACK_STEP * k;
  for (let i = 0; i < shown; i++) {
    out.push(off);
    off += step;
    step *= STACK_COMPRESS;
  }
  return out;
}

export function stackLayers(size, scale) {
  const offs = stackOffsets(size, scale);
  let html = "";
  for (let i = offs.length - 1; i >= 1; i--) {
    const o = Math.round(offs[i] * 100) / 100;
    const fade = 0.86 - i * 0.09;
    html += `<div class="sb-layer" style="transform:translate(${o}px, ${o}px);opacity:${Math.max(0.3, fade)}"></div>`;
  }
  return html;
}

const GLYPH_ITEMS = {
  "Shift Left": "\u2039",
  "Shift Right": "\u203a",
  "Move Up": "\u2039",
  "Move Down": "\u203a",
};

export function tileMenu(kind, id) {
  const items = (MENUS[kind] || MENUS.card)
    .map((label) => {
      const glyph = GLYPH_ITEMS[label];
      const cls = glyph ? "sb-mi glyph" : "sb-mi";
      return `<button class="${cls}" data-interactive title="${E(label)}" aria-label="${E(label)}"
          onclick="event.stopPropagation();${act(OPS[label] || "noop", "id: '" + Q(id) + "'")}">${
            glyph ? glyph : E(label)
          }</button>`;
    })
    .join("");
  return `<div class="sb-ctx" id="sb-ctx-${E(id)}" data-sb-dismiss="menuCard" data-sb-menu-value="${E(id)}">${items}</div>`;
}

export function nameField(c, state) {
  const id = String((c.isStack && c.topId) || c.id);
  if (state.locked || String(state.renaming || "") !== id) return `<span class="sb-name">${HL(c.name, state.hl)}</span>`;
  const commit = act("rename", "id: '" + Q(id) + "', value: this.value");
  const cancel = act("renameCancel", "id: '" + Q(id) + "'");
  // value — the ELEMENT's live text, never a re-read of re-rendered state — and the engine's morph gate refuses to touch a FOCUSED input, so a repaint mid-typing cannot wipe what he typed. Two repairs here: `data-autofocus` was inert (nothing in the realm reads that attribute), so the caret now arrives on the CSS animation's first frame — the only live JS an inserted node gets in this realm; and the id keeps morphdom matching this input to ITSELF across repaints instead of by position. js) commits this box when a tap lands ANYWHERE else — a tablet tap on a non-focusable surface never fires blur, and a blur-commit that shares cardAct with the tap's own click gets clobbered by the engine's same-frame action fold.
  return `<input class="sb-name-edit rename" type="text" id="sb-name-edit-${E(id)}" value="${E(c.name)}" data-interactive
      data-tapcommit-action="renameField" data-tapcommit-id="${E(id)}"
      onanimationstart="this.focus(); this.select();"
      onclick="event.stopPropagation()" ondblclick="event.stopPropagation()"
      onkeydown="event.stopPropagation(); if (event.key === 'Enter') { ${commit}; this.blur(); } else if (event.key === 'Escape') { this.dataset.esc='1'; ${cancel}; this.blur(); }"
      onblur="if (this.dataset.esc !== '1') { ${commit} }" />`;
}

// THE UNREAD DOT (his ask: "a little glowing dot… bottom left corner of cards when it has not been read").
export function unreadDot(c) {
  if (!c || !c.unread) return "";
  return `<span class="sb-unread" title="unread — you have not opened this card yet" aria-label="unread"></span>`;
}

// The rollup: fainter and smaller, so a buried unread card is findable without shouting.
export function unreadUnderDot(f) {
  if (!f || !f.unreadUnder) return "";
  return `<span class="sb-unread sub" title="unread cards inside" aria-label="unread inside"></span>`;
}

export function folderTile(f, i, state) {
  const id = String(f.id);
  const sel = state.selected && String(state.selected.id) === id;
  const busy = (state.moving || {})[id] ? " moving" : "";
  const word = folderWord((state.folderPath || []).length, state.depthLabels);
  return `<div class="sb-tile is-folder${sel ? " sel" : ""}${f.pending ? " pending" : ""}${busy}" id="sb-card-${E(id)}"
      data-interactive${
        state.locked ? "" : ` data-card-id="${E(id)}" data-kind="folder" data-index="${i}" data-drop="folder"`
      }
      onclick="${act("select", "id: '" + Q(id) + "', kind: 'folder'")}">
      <div class="sb-face">
        <div class="sb-banner folder"><span class="sb-banner-t">${E(word.toLowerCase())}</span>${docMark(f)}</div>
        <div class="sb-body">
          <div class="sb-t-top"><span class="sb-fglyph">${folderGlyph()}</span>${nameField(f, state)}</div>
          <div class="sb-sum dim">${E(holdsText(f.childCounts))}</div>
          <div class="sb-t-foot">${unreadUnderDot(f)}<span class="sb-grow"></span>
            <button class="sb-chip open" data-interactive title="Open this ${E(word.toLowerCase())}"
              onclick="event.stopPropagation();${act("folderOpen", "id: '" + Q(id) + "'")}">open ›</button></div>
        </div>
      </div>
      ${sel && state.menu && !state.locked ? tileMenu("folder", id) : ""}
    </div>`;
}

export function cardImage(src) {
  const im = (src && src.image) || null;
  return {
    url: im ? String(im.url || "") : "",
    prompt: im ? String(im.prompt || "") : "",
    version: Number((im && im.version) || 0),
  };
}

export function tileThumb(img, corner) {
  if (!img.url) return "";
  return `<div class="sb-thumb">${corner || ""}<img class="sb-thumb-pic" src="${E(img.url)}" alt="" draggable="false"
      onerror="this.style.display='none'" /></div>`;
}

export function tileUnsaved(c, state) {
  if (c && c.pending) return true;
  const d = state && state.draft;
  if (!d || !d.dirty) return false;
  const id = String((c && c.id) || "");
  return id !== "" && String(d.cardId || "") === id;
}

export function tile(c, i, state) {
  if (c && c.isFolder) return folderTile(c, i, state);
  const wear = shellGeom(state).chrome;
  const id = String(c.id);
  const kind = c.isStack ? "stack" : "card";
  const sel = state.selected && String(state.selected.id) === id;
  const size = Math.max(1, Number(c.stackSize) || 1);
  const remainder = size > STACK_MAX_LAYERS ? size - STACK_MAX_LAYERS : 0;
  const openq = c.openQuestion
    ? `<span class="sb-oq" title="Open question">?</span>`
    : "";
  const badge = remainder
    ? `<span class="sb-more" title="${remainder} more card${remainder === 1 ? "" : "s"} in this stack">+${remainder}</span>`
    : "";
  const chip = c.isStack
    ? `<span class="sb-chip" title="${size} cards in this stack">${stackGlyph()}${size}</span>`
    : "";
  const openChip = state.tileClick
    ? ""
    : `<button class="sb-chip open" data-interactive title="${
        c.isStack ? "Open this stack's versions" : "Open this card's pages"
      }" onclick="event.stopPropagation();${act(c.isStack ? "stackOpen" : "openPages", "id: '" + Q(id) + "'")}">open ›</button>`;
  const summary = c.summary
    ? `<div class="sb-sum">${HL(c.summary, state.hl)}</div>`
    : `<div class="sb-sum dim">no summary</div>`;
  // HIS CALL: the open-question mark rides the picture's top-left corner, half off the edge.
  const thumb = tileThumb(cardImage(c), openq);

  const wiring = state.tileClick
    ? ` data-result="1"`
    : state.locked
      ? ""
      : ` data-card-id="${E(id)}" data-kind="${E(kind)}" data-index="${i}" data-drop="tile"`;
  const fire = state.tileClick
    ? act(String(state.tileClick), "id: '" + Q(id) + "', bookId: '" + Q(c.bookId || "") + "', folderId: '" + Q(c.folderId || "") + "'")
    : act("select", "id: '" + Q(id) + "', kind: '" + Q(kind) + "'");

  const busy = (state.moving || {})[id] ? " moving" : "";
  return `<div class="sb-tile${c.isStack ? " is-stack" : ""}${sel ? " sel" : ""}${busy}" id="sb-card-${E(id)}"
      data-interactive${wiring}
      onclick="${fire}">
      ${c.isStack ? `<div class="sb-layers">${stackLayers(size, gridGeom(state).layer)}</div>` : ""}
      <div class="sb-face">
        ${statusBanner(c.status, c.priority, nameField(c, state), {
          word: wear.word,
          prio: wear.prio,
          mark:
            wear.unsaved && tileUnsaved(c, state)
              ? `<span class="sb-tile-unsaved" title="unsaved — not written to the book yet" aria-label="unsaved"></span>`
              : "",
        })}
        ${thumb}
        <div class="sb-body">
          ${!thumb && openq ? `<div class="sb-t-top">${openq}</div>` : ""}
          ${summary}
          <div class="sb-t-foot">${unreadDot(c)}${wear.badges === false ? "" : statBadges(c.stats)}<span class="sb-grow"></span>${chip}${openChip}</div>
        </div>
      </div>
      ${badge}
      ${sel && state.menu && !state.locked ? tileMenu(kind, id) : ""}
    </div>`;
}

export function crumb(state) {
  const parts = address([state.bookName].concat(state.folderPath || []), 52);
  return parts
    .map((p, i) => (i ? `<span class="sep">›</span>${E(p)}` : `${E(p)}`))
    .join(" ");
}

export function sortControl(state) {
  const sort = Object.assign({ mode: "default", dir: "asc" }, state.sort || {});
  const cur = SORTS.find((s) => s.id === sort.mode) || SORTS[0];
  const items = SORTS.map(
    (s) =>
      `<button class="sb-mi${s.id === sort.mode ? " on" : ""}" data-interactive title="${E(s.hint)}"
        onclick="event.stopPropagation();${act("sort", "mode: '" + Q(s.id) + "'")}">${E(s.label)}</button>`
  ).join("");
  return `<div class="sb-sortwrap" data-sb-menu-scope>
    <button class="sb-btn" data-interactive title="Sort mode"
      onclick="event.stopPropagation();${act("sortMenu")}">Sort: ${E(cur.label)} <span class="sb-caret">▾</span></button>
    <button class="sb-btn sb-dir" data-interactive title="${sort.dir === "asc" ? "Ascending" : "Descending"}"
      onclick="event.stopPropagation();${act("sortDir")}">${sort.dir === "asc" ? "▲" : "▼"}</button>
    ${state.sortMenu ? `<div class="sb-drop" id="sb-sort-drop" data-sb-dismiss="sortMenu">${items}</div>` : ""}
  </div>`;
}

export function moveToMenu(state) {
  if (!state.moveMenu || !state.selected) return "";
  const here = String(state.folderId || state.bookId || "");
  const tree = (state.folders || []).filter((f) => f && String(f.id) !== String(state.bookId || ""));
  const dests = [{ id: String(state.bookId || ""), name: String(state.bookName || "Book root"), depth: 0 }].concat(
    tree
  );
  const rows = dests
    .map((f) => {
      const depth = Math.max(0, Math.floor(Number(f.depth) || 0));
      const pad = 10 + depth * 12;
      return `<button class="sb-mi${String(f.id) === here ? " on" : ""}" data-interactive
        style="padding-left:${pad}px" title="${E(f.path || f.name)}"
        onclick="event.stopPropagation();${act("moveToFolder", "folderId: '" + Q(f.id) + "'")}">${E(f.name)}</button>`;
    })
    .join("");
  const note = tree.length ? "" : `<div class="sb-note">this book has no folders yet</div>`;
  return `<div class="sb-drop sb-moveto" id="sb-moveto" data-sb-dismiss="moveMenu">${rows}${note}</div>`;
}

// THE DESIGNATION lives in the metadata pane and nowhere else — jace, 2026-08-28: "Folders do not
// have a ... menu. Only metadata." lib/ui-meta.js renders the switch off this file's DOCS.
export function editorBar(state) {
  const sel = state.selected;
  const view = String(state.view || "folder");
  const barKey = view === "stack" ? "stack" : "folder";
  // his ruling: no make-buttons on the bar — the grid's own ＋ tiles are where making happens.
  const depth = (state.folderPath || []).length;
  const back =
    view === "stack"
      ? `<button class="sb-btn ghost" id="sb-stack-back" data-interactive title="Back to the folder"
          onclick="event.stopPropagation();${act("backToFolder")}">‹ Back</button>`
      : depth
        ? `<button class="sb-btn ghost" id="sb-folder-back" data-interactive title="Up one level"
          onclick="event.stopPropagation();${act("folderUp")}">‹ Back</button>`
        : "";

  if (!sel) {
    return `<div class="doc-head" id="sb-editor-bar">
      <div class="crumb">${back}${crumb(state)}</div>
      ${sortControl(state)}
    </div>`;
  }
  const id = String(sel.id);
  const barName = sel.kind === "folder" ? "folderSel" : barKey;
  const labels = (EDITOR_BAR[barName] || EDITOR_BAR.folder).filter((l) => (!state.locked || readsOnly(l)) && !(l === "Export" && ["CODEX0000BOOK","WWSCODE0BOOK"].includes(state.bookId)));
  const buttons = labels
    .map((label) => {
      let caption = label === "Open Pages" ? "Open" : label;
      let off = false;
      let hint = label === "Open Pages" ? "Open in the card’s selected editor" : label;
      const fire = off ? "" : act(OPS[label] || "noop", "id: '" + Q(id) + "'");
      const tour = "";
      // his note: the 'film this scene' button read too big beside the rest of the bar.
      return `<button class="sb-btn${off ? " off" : ""}"${tour} data-interactive${off ? " disabled" : ""}
        title="${E(hint)}"${OPS[label] === "moveTo" ? ' data-sb-menu-trigger="moveMenu"' : ""}
        onclick="event.stopPropagation();${fire}">${E(caption)}</button>`;
    })
    .join("");
  const kindWord = sel.kind === "folder" ? "folder" : sel.kind === "stack" ? "stack of " + (sel.size || 2) : "card";
  return `<div class="doc-head sel" id="sb-editor-bar">
    <div class="crumb">${back}<span class="sb-selname">${E(sel.name || "")}</span>
      <span class="sb-selkind">${E(kindWord)}</span>
      <button class="sb-btn ghost sb-selclear" data-interactive title="Clear selection"
        onclick="${act("clear")}">✕</button></div>
    <div class="sb-bar-acts">${buttons}${moveToMenu(state)}</div>
  </div>`;
}

const CARD_GRID = {
  small: {
    min: 132, max: 158, gapY: 12, gapX: 10, pad: "12px 14px 20px",
    name: 12, nameLines: 2, sum: 11, sumLines: 4, body: "6px 8px 6px", gap: 4, layer: 0.6,
    thumb: 52, sumLinesImg: 1,
  },
  medium: {
    min: 200, max: 250, gapY: 18, gapX: 16, pad: "16px 18px 26px",
    name: 14, nameLines: 3, sum: 12, sumLines: 9, body: "9px 11px 9px", gap: 6, layer: 1,
    thumb: 78, sumLinesImg: 2,
  },
  large: {
    min: 268, max: 336, gapY: 24, gapX: 20, pad: "20px 22px 32px",
    name: 16.5, nameLines: 3, sum: 13.5, sumLines: 13, body: "12px 14px 12px", gap: 8, layer: 1.35,
    thumb: 104, sumLinesImg: 3,
  },
};

// SHELL CONTRACT v2 — two shells. 'full' is the IDENTITY row: every multiplier 1, no rail, all furniture kept.
const SHELL = {
  full: {
    tile: 1, gap: 1, type: 1, thumb: 1, rail: 0, pad: null,
    chrome: { badges: true, prio: true, word: true, unsaved: false },
  },
  // his ruling (SHELL CONTRACT v4): cards in notepad view are half size — two columns, interior back at identity.
  notepad: {
    tile: 0.67, gap: 0.8, type: 1, thumb: 1, rail: 0, pad: [12, 14, 22],
    chrome: { badges: false, prio: false, word: false, unsaved: true },
  },
};

export function shellName(state) {
  const raw = String((state && state.shell) || "");
  return Object.prototype.hasOwnProperty.call(SHELL, raw) ? raw : "full";
}

export function shellGeom(state) {
  return SHELL[shellName(state)] || SHELL.full;
}

export function cardGridName(state) {
  return PREFS.cardGrid(state);
}

export function gridGeom(state) {
  const base = CARD_GRID[cardGridName(state)] || CARD_GRID.medium;
  const sh = shellGeom(state);
  if (sh === SHELL.full) return base;
  const one = (n, m) => Math.round(Number(n) * m * 10) / 10;
  return Object.assign({}, base, {
    min: Math.round(base.min * sh.tile),
    max: Math.round(base.max * sh.tile),
    gapY: Math.round(base.gapY * sh.gap),
    gapX: Math.round(base.gapX * sh.gap),
    pad: sh.pad
      ? sh.pad[0] + "px " + sh.pad[1] + "px " + sh.pad[2] + "px " + (sh.rail + sh.pad[1]) + "px"
      : base.pad,
    name: one(base.name, sh.type),
    sum: one(base.sum, sh.type),
    thumb: Math.round(base.thumb * sh.thumb),
    layer: one(base.layer, sh.tile),
  });
}

export function gridVars(state) {
  const g = gridGeom(state);
  return [
    "--sb-tile-min:" + g.min + "px",
    "--sb-tile-max:" + g.max + "px",
    "--sb-grid-gap-y:" + g.gapY + "px",
    "--sb-grid-gap-x:" + g.gapX + "px",
    "--sb-grid-pad:" + g.pad,
    "--sb-tile-name:" + g.name + "px",
    "--sb-tile-name-lines:" + g.nameLines,
    "--sb-tile-sum:" + g.sum + "px",
    "--sb-tile-sum-lines:" + g.sumLines,
    "--sb-tile-body-pad:" + g.body,
    "--sb-tile-body-gap:" + g.gap + "px",
    "--sb-tile-thumb:" + g.thumb + "px",
    "--sb-tile-sum-lines-img:" + g.sumLinesImg,
  ].join(";");
}

export function grid(state) {
  const all = state.list || [];
  const folders = all.filter((c) => c && c.isFolder);
  const cards = sortTiles(all.filter((c) => !(c && c.isFolder)), state.sort);
  const list = folders.concat(cards);
  const tiles = list.map((c, i) => tile(c, i, state)).join("");
  const depth = (state.folderPath || []).length;
  const word = folderWord(depth, state.depthLabels);
  const folderTile = state.folderBusy
    ? `<button class="sb-tile add folder busy" id="sb-add-folder-tile" data-interactive>
      <span class="sb-spin mini"></span><small>Making…</small></button>`
    : `<button class="sb-tile add folder" id="sb-add-folder-tile" data-interactive
      onclick="${act("newFolder")}"><span>＋</span><small>New ${E(word)}</small></button>`;
  const add = state.locked
    ? ""
    : `<button class="sb-tile add" id="sb-add-tile" data-interactive
      onclick="${act("new")}"><span>＋</span><small>New Card</small></button>
    ${folderTile}`;
  const empty = list.length
    ? ""
    : state.locked
      ? roNote()
      : `<div class="sb-empty-note">nothing in here yet — make one with New Card or New ${E(word)}</div>`;
  const shellAttr = shellName(state) === "full" ? "" : ` data-shell="${E(shellName(state))}"`;
  return `<div class="sb-grid" id="sb-grid" style="${gridVars(state)}"${shellAttr}
      data-card-grid="${E(cardGridName(state))}"
      data-flick-ms="${GESTURE.flickMs}" data-flick-px="${GESTURE.flickPx}"
      data-flick-ratio="${GESTURE.flickRatio}" data-pickup-ms="${GESTURE.pickupMs}"
      data-hold-ms="${GESTURE.holdMs}" data-slop-px="${GESTURE.slopPx}"
      data-cycle-flick="${GESTURE.cycleOnFlick ? 1 : 0}">
      ${tiles}${add}
    </div>${empty}`;
}

// THE DRAFT: the card modal is a working copy, not a live wire.
export function fieldValue(draft, card, key, fallback) {
  const e = draft && draft.edits;
  if (e && Object.prototype.hasOwnProperty.call(e, key)) return e[key];
  if (arguments.length > 3) return fallback;
  return card ? card[key] : undefined;
}

const DRAFT_LABELS = {
  name: "the title",
  status: "the status",
  priority: "the priority",
  openQuestion: "the open-question flag",
  summary: "the summary",
};

export function plural(n, one) {
  return n + " " + one + (n === 1 ? "" : "s");
}

export function draftLosses(draft) {
  const e = (draft && draft.edits) || {};
  const parts = [];
  let secs = 0;
  let pages = 0;
  Object.keys(e).forEach((k) => {
    if (DRAFT_LABELS[k]) parts.push(DRAFT_LABELS[k]);
    else if (k.slice(0, 8) === "section:") secs++;
    else if (k.slice(0, 5) === "page:") pages++;
  });
  if (secs) parts.push(plural(secs, "section edit"));
  if (pages) parts.push(plural(pages, "page title"));
  const added = ((draft && draft.secNew) || []).length;
  const removed = ((draft && draft.secDel) || []).length;
  if (added) parts.push(plural(added, "new section"));
  if (removed) parts.push(plural(removed, "removed section"));
  const t = (draft && draft.tags) || {};
  if ((t.add || []).length) parts.push(plural(t.add.length, "added tag"));
  if ((t.remove || []).length) parts.push(plural(t.remove.length, "removed tag"));
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

// THE ATMOSPHERE CHIP — set, it always shows; unset, it only offers when the Atmosphere Kitchen is installed.
export function atmoChip(s, draft) {
  const set = String((s && s.atmo) || "");
  const offer = !!(s && s.atmoOffer);
  if (!set && !offer) return "";
  const open = offer && String((s && s.atmoPick) || "") === String(s.id);
  const label = String((s && s.atmoLabel) || set) || "add a mood";
  const press = `onclick="${act(open ? "atmoPickClose" : "atmoPickOpen", "id: '" + Q(s.id) + "'")}"`;
  const chip = `<button class="sb-atmo-chip${set ? " on" : ""}${open ? " open" : ""}" type="button"
      data-interactive title="${E(set ? "Atmosphere: " + label : "Give this section a mood")}"
      ${offer ? press : "disabled"}><span class="sb-atmo-g" aria-hidden="true">◐</span><span
      class="sb-atmo-n">${E(label)}</span></button>`;
  if (!open) return chip;
  const rows = (Array.isArray(s.atmoPresets) ? s.atmoPresets : [])
    .map(
      (p) => `<button class="sb-atmo-opt${set === p.id ? " on" : ""}" type="button" data-interactive
        title="${E(p.mood || p.name)}"
        onclick="${act("atmoSet", "id: '" + Q(s.id) + "', atmo: '" + Q(p.id) + "'")}">${E(p.name)}</button>`
    )
    .join("");
  return `${chip}<div class="sb-atmo-panel" id="sb-atmo-${E(s.id)}">
    <div class="sb-atmo-opts">${rows}</div>
    <input class="sb-atmo-own" type="text" data-interactive
      placeholder="…or your own words" value=""
      onchange="sendAction('atmoSet', { id: '${Q(s.id)}', atmo: this.value })" />
    <div class="sb-atmo-foot">
      ${
        set
          ? `<button class="sb-atmo-clear" type="button" data-interactive
              onclick="${act("atmoClear", "id: '" + Q(s.id) + "'")}">clear</button>`
          : ""
      }
      <button class="sb-atmo-done" type="button" data-interactive
        onclick="${act("atmoPickClose", "id: '" + Q(s.id) + "'")}">done</button>
    </div>
  </div>`;
}

export function sectionRow(s, editable, draft) {
  const name = draft ? fieldValue(draft, null, "section:" + s.id + ":name", s.name) : s.name;
  const content = draft ? fieldValue(draft, null, "section:" + s.id + ":content", s.content) : s.content;
  const lines = PL.sectionLines(content, s.lineLimit);
  const over = lines.over ? " over" : "";
  const setAct = draft
    ? act("draftSet", "field: 'section:" + Q(s.id) + ":content', value: this.value")
    : act("sectionSet", "id: '" + Q(s.id) + "', value: this.value");
  const nameAct = draft
    ? act("draftSet", "field: 'section:" + Q(s.id) + ":name', value: this.value")
    : act("sectionRename", "id: '" + Q(s.id) + "', value: this.value");
  // data-sbrp-free='1' turns the page-zone visual-fit law OFF in the realm's commit — without it a scrolling box refuses every insert.
  const pick = draft
    ? `data-sbrp-free="1"
        oninput="if(window.__SBRP)window.__SBRP.sync(this);"
        onkeydown="if(window.__SBRP&&window.__SBRP.key(this,event)){event.preventDefault();return false;}"
        onkeyup="if(window.__SBRP)window.__SBRP.sync(this);"
        onclick="if(window.__SBRP)window.__SBRP.sync(this);"
        onfocus="if(window.__SBRP)window.__SBRP.focus(this);"
        onblur="if(window.__SBRP)window.__SBRP.blur(this);"`
    : "";
  // data-draft-field rides ONLY the draft lane (the card modal): the tap-commit sweep folds these
  // into the draft; the non-draft lane (sectionSet/sectionRename) commits live and keeps blur-only.
  const mark = draft ? (k) => ` data-draft-field="section:${E(s.id)}:${k}"` : () => "";
  const box = editable
    ? `<textarea class="sb-sec-text" rows="3" data-interactive ${pick}${mark("content")}
        onchange="${setAct}">${E(content)}</textarea>`
    : `<div class="sb-sec-prev">${E(String(content || "")) || "<span class=\"dim\">empty</span>"}</div>`;
  return `<div class="sb-sec" id="sb-sec-${E(s.id)}">
    <div class="sb-sec-head">
      <input class="sb-inline" type="text" value="${E(name)}" data-interactive${mark("name")}
        onchange="${nameAct}" />
      ${atmoChip(s, draft)}
      <span class="sb-lines${over}" title="line count vs limit">${E(lines.text)}</span>
      <span class="sb-page-len dim" title="words in this section">${wordCount(content)} ${
        wordCount(content) === 1 ? "word" : "words"
      }</span>
      <button class="sb-x" data-interactive title="Delete section"
        onclick="${act("sectionDelete", "id: '" + Q(s.id) + "'")}">✕</button>
    </div>
    ${box}
  </div>`;
}

export function backlinkList(links, label) {
  const rows = (links || []).length
    ? links
        .map(
          (l) =>
            `<button class="sb-link" data-interactive
          onclick="${act("openCard", "id: '" + Q(l.cardId || l.id) + "', bookId: '" + Q(l.bookId || "") + "'")}">${E(
              l.name || l.cardId || l.id
            )}</button>`
        )
        .join("")
    : `<span class="dim">none</span>`;
  return `<div class="sb-field"><label>${E(label)}</label><div class="sb-links">${rows}</div></div>`;
}

export function imageField(cardId, img, err, busy) {
  const id = String(cardId || "");
  const has = !!img.url;
  const pic = has
    ? `<img class="sb-img-pic" id="sb-img-pic" src="${E(img.url)}" alt="" draggable="false"
        onerror="this.style.display='none'" />`
    : `<span class="sb-img-none">no picture yet</span>`;
  const make = `<button class="sb-btn sb-img-make" id="sb-img-make" data-interactive${busy ? " disabled" : ""}
      title="${has ? "Make a new picture — the one it has stays served for anything still pointing at it" : "Make a picture for this card"}"
      onclick="${busy ? "" : "sendAction('cardImageMake', { id: '" + Q(id) + "' })"}">${
        busy ? "Working…" : has ? "Regenerate" : "Generate"
      }</button>`;
  const clear = has
    ? `<button class="sb-btn ghost sb-img-clear" data-interactive title="Take this picture off the card"
        onclick="sendAction('cardImageClear', { id: '${Q(id)}' })">Remove</button>`
    : "";
  return `<div class="sb-field sb-imgfield" id="sb-img-field">
    <label>Picture</label>
    <div class="sb-img-plate${has ? " has" : ""}" id="sb-img-plate">${pic}</div>
    ${has && img.prompt ? `<div class="sb-img-cap">${E(img.prompt)}</div>` : ""}
    ${ERR.line(err, "cardImage", "sb-err")}
    <div class="sb-img-row">
      <div class="sb-img-say">
        <textarea class="sb-input sb-img-prompt" id="sb-img-prompt" rows="2" data-interactive
          placeholder="describe the picture…"
          onchange="sendAction('cardImagePrompt', { id: '${Q(id)}', text: this.value })">${E(img.prompt)}</textarea>
        ${img.prompt ? "" : `<div class="sb-hint sb-img-hint">leave it blank and I'll read the card</div>`}
      </div>
      <div class="sb-img-acts">${make}${clear}</div>
    </div>
  </div>`;
}

// ONE LANE PER DOCUMENT: these ids are also emitted by lib/ui-page.js — the two can never be on screen together.
export function refPickLane(m) {
  const cands = m && m.refCandidates && typeof m.refCandidates === "object" ? m.refCandidates : null;
  if (!cands) return "";
  let json = "{}";
  try {
    json = JSON.stringify({
      tags: cands.tags || [],
      cards: cands.cards || [],
      assets: cands.assets || [],
      shots: cands.shots || [],
      atmos: cands.atmos || [],
    });
  } catch (e) {
    json = "{}";
  }
  return `<img id="sb-refpick-boot" alt="" aria-hidden="true" src="data:,v${REFPICK.REALM_V}" style="display:none"
      onerror="${E(REFPICK.bootScript())}" />
    <div id="sb-refpick-data" style="display:none" aria-hidden="true"
      data-version="${E(String(cands.version || 0))}" data-cands="${E(json)}"></div>`;
}

// THE SHOOT SECTION — his ruling: the credit line is permanent, and every warning is drawn verbatim.
export function shootRelay(sh) {
  const list = Array.isArray(sh.deliver) ? sh.deliver : [];
  const token = String(sh.token || "");
  if (!list.length || !token) return "";
  let json = "[]";
  try {
    json = JSON.stringify(list);
  } catch (e) {
    json = "[]";
  }
  const js =
    "(function(el){try{if(el.dataset.fired==='1')return;el.dataset.fired='1';" +
    "if(window.__SBSHOTSENT===el.id)return;window.__SBSHOTSENT=el.id;" +
    "var q=JSON.parse(el.getAttribute('data-send')||'[]');" +
    "for(var i=0;i<q.length;i++){ if(q[i]&&q[i].action){ window.sendAction(q[i].action, q[i].data||{}); } }" +
    "}catch(e){}})(this)";
  return `<img id="sb-shoot-relay-${E(token)}" alt="" aria-hidden="true" src="data:,shoot${E(token)}"
    style="display:none" data-send="${E(json)}" onerror="${E(js)}" />`;
}

export function cueAt(n) {
  return (isFinite(Number(n)) ? Number(n).toFixed(3) : "0.000") + "s";
}

export function cueSort(sh) {
  const rows = (sh && Array.isArray(sh.cues) ? sh.cues : []).slice();
  rows.sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0) || (Number(a.onIndex) || 0) - (Number(b.onIndex) || 0));
  return rows;
}

export function cueFile(c) {
  const clip = String(c.clip || "");
  return c.sourceKind === "roll" ? "piano roll" : clip.split("/").pop() || clip;
}

export function cueShotName(c) {
  return String(c.shot || "") || "shot " + (String(c.onShot || "") || (Number(c.onIndex) || 0) + 1);
}

// PLAIN STRINGS out, not html — the caller escapes them into its own line and a title attribute.
export function cueSummary(sh) {
  const rows = cueSort(sh);
  if (!rows.length) return { short: "", full: "", count: 0 };
  const one = (c) =>
    cueAt(c.time) + " " + (String(c.source || "") || cueFile(c)) + (c.loop ? " loop→" + cueAt(c.until) : "");
  const rest = rows.length - 2;
  return {
    short:
      (rows.length === 1 ? "1 cue" : rows.length + " cues") +
      " — " +
      rows.slice(0, 2).map(one).join(" · ") +
      (rest > 0 ? " · +" + rest + " more" : ""),
    full: rows.map((c) => one(c) + " · " + cueFile(c) + " · speaker " + SOUND_ORIGIN.label(c.emitter) + " · on " + cueShotName(c)).join("\n"),
    count: rows.length,
  };
}

export function cueRows(sh) {
  const rows = cueSort(sh);
  if (!rows.length) return "";
  const at = cueAt;
  const CHIP =
    "flex:0 0 auto;padding:0 5px;border:1px solid var(--line);border-radius:2px;" +
    "font-size:calc(9.5px * var(--sb-fs, 1));letter-spacing:.5px;text-transform:uppercase;white-space:nowrap";
  const body = rows
    .map((c) => {
      const clip = String(c.clip || "");
      const file = cueFile(c);
      const shot = cueShotName(c);
      const kind = (c.loop ? "loop" : "play") + " → " + at(c.until);
      const slice = "source " + at(c.from || 0) + " – " + (c.to == null ? "end" : at(c.to));
      return `<div style="display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;padding:2px 0;line-height:1.35;min-height:20px">
        <span style="flex:0 0 auto;min-width:42px;font-variant-numeric:tabular-nums;color:var(--accent)">${E(at(c.time))}</span>
        <span style="${CHIP}">${E(kind)}</span>
        <span style="flex:0 1 auto;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${E(clip)}">${E(String(c.source || file))}</span>
        <span class="dim" style="flex:1 1 90px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${E(clip)}">${E(file)}</span>
        <span class="dim" style="flex:0 0 auto">${E(slice)}</span>
        <span class="dim" style="flex:0 0 auto">speaker ${E(SOUND_ORIGIN.label(c.emitter))}</span>
        <span class="dim" style="flex:0 0 auto">on ${E(shot)}</span>
      </div>`;
    })
    .join("");
  return `<div class="sb-cue-sched" style="margin:4px 0;padding:3px 6px;border:1px solid var(--line);border-radius:2px;
      background:color-mix(in oklch, var(--panel-2) 60%, transparent);font-size:calc(11px * var(--sb-fs, 1));
      max-height:136px;overflow:auto;-webkit-overflow-scrolling:touch">
      <div class="dim" style="letter-spacing:1.1px;text-transform:uppercase;font-size:calc(9.5px * var(--sb-fs, 1));padding-bottom:2px">
        Cue schedule — ${rows.length === 1 ? "one cue" : rows.length + " cues"}</div>
      ${body}
    </div>`;
}

export function shootSection(state, cardId) {
  const sh = state.shoot && typeof state.shoot === "object" ? state.shoot : {};
  const dep = sh.dep && typeof sh.dep === "object" ? sh.dep : null;
  const busy = !!sh.busy;
  const id = String(cardId || "");
  // THE TARGET PILL IS STRUCK (his ruling, 2026-09-01: "Cinema and film kit should not be chosen between. They should work at the same time.") — one Compile/Shoot press feeds every installed target, each lane gating softly on its own mod; the two results draw on their own lines below.
  const fdep = sh.filmDep && typeof sh.filmDep === "object" ? sh.filmDep : null;
  const press = (action) => `sendAction('${action}', { cardId: '${Q(id)}' })`;
  const f = sh.file && typeof sh.file === "object" ? sh.file : null;
  const filmRows = f
    ? `<div class="dim sb-shoot-file" style="margin:2px 0;font-size:calc(11px * var(--sb-fs, 1))">
          ${E(String(f.path || ""))} — ${f.exists ? E(String(f.shots || 0)) + " shot" + (Number(f.shots) === 1 ? "" : "s") + " in it" : "not written yet"}${
            f.mine ? ", " + E(String(f.mine)) + " from this card" : ""
          }</div>`
    : "";
  const WARN = ' style="margin:2px 0;padding:4px 6px;border-left:2px solid rgba(255,180,80,.7);opacity:.95"';
  const TAP = ' style="min-height:44px;min-width:88px"';
  const warnings = (Array.isArray(sh.warnings) ? sh.warnings : [])
    .map((w) => `<div class="sb-shoot-warn"${WARN}>${E(w)}</div>`)
    .join("");
  const err = String(sh.error || "");
  const ferr = String(sh.filmError || "");
  const line = String(sh.line || "");
  const fline = String(sh.filmLine || "");
  const shots = Number(sh.shots || 0);
  const verb = String(sh.verb || "");
  // Each lane its own line: Cinema first (it owns the room), film-kit under it. A strike is
  // cinema-only — film-kit's file is not the set, so its bit stays quiet on that verb.
  const cinemaBit = err
    ? `<div class="sb-shoot-warn"${WARN}>Cinema — ${E(err)}</div>`
    : line || verb
      ? `<div class="sb-shoot-line">${E(
          verb === "strike" ? line : "Cinema — " + (shots === 1 ? "1 shot" : shots + " shots") + (line ? " · " + line : "")
        )}</div>`
      : "";
  const filmBit =
    verb === "strike"
      ? ""
      : ferr
        ? `<div class="sb-shoot-warn"${WARN}>film-kit — ${E(ferr)}</div>`
        : fline
          ? `<div class="sb-shoot-line">film-kit — ${E(fline)}</div>`
          : "";
  const result = busy
    ? `<div class="dim sb-pad">${verb === "shoot" ? "shooting…" : "reading the set…"}</div>`
    : cinemaBit || filmBit
      ? cinemaBit + filmBit
      : `<div class="dim sb-pad">not shot yet — Compile builds the shots for every target without touching the room</div>`;
  const notice = dep && !dep.installed && dep.notice ? `<div class="sb-shoot-warn"${WARN}>${E(dep.notice)}</div>` : "";
  const fnotice = fdep && !fdep.installed && fdep.notice ? `<div class="sb-shoot-warn"${WARN}>${E(fdep.notice)}</div>` : "";
  const credit = `<div class="dim sb-shoot-credit">${E(
    (dep && dep.credit) || "Playback by Absolute Cinema, a mod by ress."
  )}${fdep && fdep.credit ? " · " + E(fdep.credit) : ""}</div>`;
  return `<div class="sb-field sb-shoot">
      <label>Shoot <span class="dim">— #[cardId] places a card, #[cam: …] moves the camera</span></label>
      <div class="sb-shoot-row" style="display:flex;gap:8px;flex-wrap:wrap;margin:4px 0">
        <button class="sb-btn" data-interactive${busy ? " disabled" : ""}${TAP} title="Compile this scene for every target without touching the room"
          onclick="${press("shootPreview")}">Compile</button>
        <button class="sb-btn primary" data-interactive${busy ? " disabled" : ""}${TAP} title="Dress the set and roll — and write film-kit's shot list"
          onclick="${press("shootGo")}">Shoot</button>
        <button class="sb-btn" data-interactive${busy ? " disabled" : ""}${TAP} title="Clear every set piece this lane put in the room"
          onclick="sendAction('shootStrike', {})">Strike</button>
      </div>
      ${result}
      ${filmRows}
      ${cueRows(sh)}
      ${warnings}
      ${notice}
      ${fnotice}
      ${credit}
      ${shootRelay(sh)}
    </div>`;
}

export function modal(state) {
  const m = state.modal;
  if (!m || state.locked) return "";
  const card = m.card || {};
  const draft = state.draft && String(state.draft.cardId) === String(card.id || "") ? state.draft : null;
  const work = draft || { edits: {}, tags: { add: [], remove: [] } };
  const dirty = !!(draft && draft.dirty);
  const saving = !!(draft && draft.saving);
  const name = fieldValue(draft, card, "name");
  const status = fieldValue(draft, card, "status");
  const priority = Number(fieldValue(draft, card, "priority")) || 0;
  const openQ = !!fieldValue(draft, card, "openQuestion");
  const summary = fieldValue(draft, card, "summary");
  const imgBase = cardImage(m && m.image ? m : card);
  const imgTyped = fieldValue(work, null, "image:prompt", null);
  const img = imgTyped === null ? imgBase : { url: imgBase.url, prompt: String(imgTyped), version: imgBase.version };
  const imgErr = String((m && m.imageError) || state.imageError || "");
  const imgBusy = !!(m && m.imageBusy);

  const dropped = ((work.tags || {}).remove || []).map(String);
  const added = ((work.tags || {}).add || []).map(String);
  const tagPill = (tid, label, pending) =>
    `<span class="sb-tag${pending ? " pending" : ""}"${
      pending ? ' title="new — lands when you press Done"' : ""
    }>${E(label)}<button class="sb-x" data-interactive title="Remove tag"
        onclick="${act("draftTag", "remove: '" + Q(tid) + "'")}">✕</button></span>`;
  const tags = (m.tags || [])
    .filter((t) => dropped.indexOf(String(t.id)) === -1)
    .map((t) => tagPill(String(t.id), t.name || t.id, false))
    .concat(added.map((n) => tagPill("pending:" + n, n, true)))
    .join("");
  const secGone = ((work.secDel || [])).map(String);
  const secAdded = ((work.secNew || [])).map(String);
  const secRows = (m.sections || [])
    .filter((s) => secGone.indexOf(String(s.id)) === -1)
    .concat(secAdded.map((id) => ({ id: String(id), name: "", content: "", lineLimit: 0 })));
  const sections = secRows.length
    ? secRows.map((s) => sectionRow(s, true, work)).join("")
    : `<div class="dim sb-pad">no sections yet</div>`;
  const pages = (m.pages || []).length
    ? (m.pages || [])
        .map(
          (p, i) => `<div class="sb-page-row" id="sb-page-${E(p.id)}">
        <span class="sb-page-n">${i + 1}</span>
        <input class="sb-inline" type="text" value="${E(
          fieldValue(work, null, "page:" + p.id + ":title", p.title)
        )}" data-interactive placeholder="untitled page" data-draft-field="page:${E(p.id)}:title"
          onchange="${act("draftSet", "field: 'page:" + Q(p.id) + ":title', value: this.value")}" />
        <span class="sb-page-len dim" title="words on this page — header, body and footer">${pageWords(p)} ${
            pageWords(p) === 1 ? "word" : "words"
          }</span>
        <button class="sb-btn tiny" data-interactive title="Write on this page"
          onclick="event.stopPropagation();${act(
            "openPages",
            "id: '" + Q(String(card.id || "")) + "', pageId: '" + Q(p.id) + "'"
          )}">Open</button>
        <button class="sb-x" data-interactive title="Delete page"
          onclick="${act("pageDelete", "id: '" + Q(p.id) + "'")}">✕</button>
      </div>`
        )
        .join("")
    : `<div class="dim sb-pad">no pages yet</div>`;

  return `<div id="sb-card-modal" data-modal data-interactive
    onpointerdown="this.dataset.veil = (event.target === this) ? '1' : '';(function(root){try{var o={},h=0,n=root.querySelectorAll('[data-draft-field]');for(var i=0;i<n.length;i++){var el=n[i],dv;if(el.tagName==='SELECT'){dv=null;for(var j=0;j<el.options.length;j++){if(el.options[j].defaultSelected){dv=el.options[j].value;break;}}if(dv===null&&el.options.length)dv=el.options[0].value;}else{dv=el.defaultValue;}if(String(el.value)!==String(dv==null?'':dv)){o[el.getAttribute('data-draft-field')]=el.value;h=1;}}if(h)window.sendAction('draftFields',{fields:o});}catch(e){}})(this)"
    onclick="if (event.target === this && this.dataset.veil === '1') { this.dataset.veil = ''; ${act("editTryClose")} }">
    <div class="sb-modal-card" onpointerdown="if (this.parentNode) { this.parentNode.dataset.veil = ''; }">
      <div class="sb-modal-head">
        <span class="sb-modal-title">Edit Card</span>
        ${
          dirty
            ? `<span class="sb-unsaved" title="held in memory — press Done to write them"><i class="sb-dot"></i>unsaved changes</span>`
            : ""
        }
        <span class="sb-modal-addr">${address([m.bookName].concat(m.folderPath || [], [name || ""]), 60)
          .map((p) => E(p))
          .join(' <span class="sep">›</span> ')}</span>
        <button class="sb-x big" data-interactive title="Close" onclick="${act("editTryClose")}">✕</button>
      </div>
      <div class="sb-modal-body">
        ${m.loading ? `<div class="sb-modal-veil"><div class="sb-spin"></div></div>` : ""}
        ${imageField(card.id, img, imgErr, imgBusy)}
        <div class="sb-field">
          <label>Title</label>
          <input class="sb-input" type="text" value="${E(name)}" data-interactive data-draft-field="name"
            onkeydown="if (event.key === 'Enter') { ${act("draftSet", "field: 'name', value: this.value")}; this.blur(); }"
            onchange="${act("draftSet", "field: 'name', value: this.value")}" />
        </div>
        <div class="sb-two">
          <div class="sb-field">
            <label>Status</label>
            <select class="sb-input sb-select" data-interactive data-draft-field="status"
              onchange="${act("draftSet", "field: 'status', value: this.value")}">${statusOptions(status)}</select>
          </div>
          <div class="sb-field">
            <label>Priority</label>
            <input class="sb-input" type="number" min="0" max="5" value="${E(priority)}" data-interactive data-draft-field="priority"
              onchange="${act("draftSet", "field: 'priority', value: this.value")}" />
          </div>
          <div class="sb-field">
            <label>Open question</label>
            <div class="seg">
              <button class="seg-btn open${openQ ? " on" : ""}" data-interactive
                onclick="${act("draftSet", "field: 'openQuestion', value: true")}">${
                  openQ ? "✓ " : ""
                }Open</button>
              <button class="seg-btn${openQ ? "" : " on"}" data-interactive
                onclick="${act("draftSet", "field: 'openQuestion', value: false")}">${
                  openQ ? "" : "✓ "
                }Settled</button>
            </div>
          </div>
        </div>
        <div class="sb-field">
          <label>Summary</label>
          <textarea class="sb-input" rows="3" data-interactive placeholder="what this card is…" data-draft-field="summary"
            onchange="${act("draftSet", "field: 'summary', value: this.value")}">${E(summary)}</textarea>
        </div>
        <div class="sb-field">
          <label>Tags</label>
          <div class="sb-tags">${tags || `<span class="dim">none</span>`}
            <input class="sb-inline sb-tag-add" type="text" placeholder="+ tag" data-interactive
              onkeydown="if (event.key === 'Enter') { ${act("draftTag", "add: this.value")}; this.value = ''; }" />
          </div>
          <div class="sb-hint">Type a word and press Enter to tag this card. Tags group cards across
            folders — the same tag on a card in any book gathers them together.</div>
        </div>
        <div class="sb-field">
          <label>Sections <button class="sb-mini" data-interactive onclick="${act("sectionNew")}">＋ add</button></label>
          <div class="sb-secs">${sections}</div>
        </div>
        <div class="sb-field">
          <label>Pages <button class="sb-mini" data-interactive onclick="${act("pageNew")}">＋ add</button></label>
          <div class="sb-pages">${pages}</div>
        </div>
        ${shootSection(state, card.id)}
        <div class="sb-two">
          ${backlinkList(m.backlinks && m.backlinks.sameBook, "Referenced by cards — this book")}
          ${backlinkList(m.backlinks && m.backlinks.crossBook, "Referenced by cards — other books")}
        </div>
        ${
          m.lineage
            ? `<div class="sb-field"><label>Lineage</label><div class="dim">duplicated from ${E(m.lineage)}</div></div>`
            : ""
        }
      </div>
      ${refPickLane(m)}
      <div class="sb-modal-foot">
        <span class="dim">${E(card.id)}</span>
        <span class="sb-grow"></span>
        ${
          dirty && !saving
            ? `<span class="dim sb-foot-hint">nothing is written until you press Done — sections included</span>`
            : ""
        }
        <button class="sb-btn primary" id="sb-card-done" data-interactive${saving ? " disabled" : ""}
          onclick="${saving ? "" : act("draftDone")}">${saving ? "Saving…" : "Done"}</button>
      </div>
    </div>
    ${
      draft && draft.confirm
        ? `<div class="sb-confirm-wrap" id="sb-card-confirm">
      <div class="sb-confirm">
        <div class="sb-confirm-t">Unsaved changes</div>
        <div class="sb-confirm-b">Closing now throws away ${E(draftLosses(draft) || "your edits")}.
          None of it has been written to the book yet.</div>
        <div class="sb-confirm-acts">
          <button class="sb-btn ghost" data-interactive onclick="${act("draftConfirm", "open: false")}">Keep Editing</button>
          <button class="sb-btn" data-interactive onclick="${act("draftDiscard")}">Discard</button>
          <button class="sb-btn primary" data-interactive onclick="${act("draftDone")}">Save &amp; Close</button>
        </div>
      </div>
    </div>`
        : ""
    }
  </div>`;
}

export function stackView(state) {
  const members = state.stack || [];
  const primaryId = String(state.stackId || "");
  const rows = members
    .map(
      (m, i) => `<div class="sb-member${i === 0 ? " top" : ""}" id="sb-member-${E(m.id)}"
      title="double-click to open this version's pages"
      onclick="${act("select", "id: '" + Q(m.id) + "', kind: 'card'")}"
      ondblclick="event.stopPropagation();${act("openPages", "id: '" + Q(m.id) + "'")}">
      <span class="sb-member-n">${i + 1}</span>
      <span class="sb-name">${E(m.name)}</span>
      ${String(m.id) === primaryId ? `<span class="sb-pill primary" title="primary — references resolve here">primary</span>` : ""}
      ${statusPill(m.status)}
      <span class="sb-grow"></span>
      ${
        state.locked
          ? ""
          : `<button class="sb-btn tiny" data-interactive onclick="event.stopPropagation();${act(
              "primary",
              "id: '" + Q(m.id) + "'"
            )}">Set as Primary</button>`
      }
      <button class="sb-btn tiny" data-interactive title="Open this card's pages"
        onclick="event.stopPropagation();${act("openPages", "id: '" + Q(m.id) + "'")}">Open</button>
      ${
        state.locked
          ? ""
          : `<button class="sb-btn tiny" data-interactive title="Copy this card into the stack as a new version"
        onclick="event.stopPropagation();${act("dupVersion", "id: '" + Q(m.id) + "'")}">Duplicate Card</button>
      <button class="sb-btn tiny" data-interactive onclick="event.stopPropagation();${act("edit", "id: '" + Q(m.id) + "'")}">Edit</button>
      <button class="sb-btn tiny" data-interactive onclick="event.stopPropagation();${act("trash", "id: '" + Q(m.id) + "'")}">Trash</button>`
      }
    </div>`
    )
    .join("");
  return `<div class="sb-stackview" id="sb-stackview">
    <div class="sb-cyc">
      <button class="sb-btn" data-interactive onclick="${act("cycle", "dir: 'left'")}">◀ cycle</button>
      <span class="dim">top card is the first entry in stack order</span>
      <button class="sb-btn" data-interactive onclick="${act("cycle", "dir: 'right'")}">cycle ▶</button>
    </div>
    ${rows || `<div class="sb-empty-note">this stack is empty</div>`}
  </div>`;
}

export function pageView(state) {
  const card = state.card || {};
  const pages = state.pages || [];
  const body = pages.length
    ? pages
        .map(
          (p, i) => `<div class="sb-page" id="sb-pageview-${E(p.id)}">
        <div class="sb-page-head"><span class="sb-page-n">${i + 1}</span>${E(p.title) || '<span class="dim">untitled</span>'}</div>
        <textarea class="sb-page-body" rows="10" data-interactive placeholder="write…"
          onchange="${act("pageContent", "id: '" + Q(p.id) + "', value: this.value")}">${E(p.content)}</textarea>
      </div>`
        )
        .join("")
    : `<div class="sb-empty-note">this card has no pages yet</div>`;
  return `<div class="sb-pageview" id="sb-pageview">
    <div class="sb-page-bar">
      <span class="sb-name">${E(card.name)}</span>
      <span class="dim">page edit view — lib/ui-page.js renders the ruled page here when that lane lands</span>
      <span class="sb-grow"></span>
      <button class="sb-btn" data-interactive onclick="${act("pageNew")}">＋ page</button>
      <button class="sb-btn" data-interactive onclick="${act("backToFolder")}">Back to folder</button>
    </div>
    ${body}
  </div>`;
}

export function styles() {
  return `<style>
  #sb-app .sb-btn {
    display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px;
    font: inherit; font-size: calc(12px * var(--sb-fs, 1)); cursor: pointer; white-space: nowrap;
    background: var(--sb-chip); color: var(--sb-chip-ink);
    border: 1px solid var(--sb-chip-edge); border-radius: 3px;
  }
  #sb-app .sb-btn:hover { border-color: var(--accent); color: var(--accent); }
  #sb-app .sb-btn.primary { background: var(--accent); color: var(--sb-bg); border-color: var(--accent); font-weight: 600; }
  #sb-app .sb-btn.primary:hover { background: color-mix(in oklch, var(--sb-accent) 80%, var(--sb-lift)); color: var(--sb-bg); }
  #sb-app .sb-btn.ghost { background: transparent; padding: 0 7px; }
  #sb-app .sb-btn.tiny { height: 21px; font-size: calc(11px * var(--sb-fs, 1)); padding: 0 7px; }
  #sb-app .sb-mini { margin-left: 6px; padding: 0 6px; height: 17px; font: inherit; font-size: calc(10px * var(--sb-fs, 1));
    background: transparent; color: var(--ink-dim); border: 1px solid var(--line); border-radius: 3px; cursor: pointer; }
  #sb-app .sb-mini:hover { color: var(--accent); border-color: var(--accent); }
  #sb-app .sb-grow { flex: 1 1 auto; }
  #sb-app .dim { color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); }

  /* editor bar */
  #sb-center .doc-head.sel { background: color-mix(in oklch, var(--sb-panel-2) 55%, var(--sb-hover)); }
  /* THE RIBBON SITS AT THE FOOT (his, 2026-08-25: the chat and the wisp flames overlay the top of
     the panel, and a selected card's action row was underneath them). Flex order on #sb-center's
     column — markup, ids and handlers untouched. */
  #sb-center.doc-open > .doc-head { order: 60; border-bottom: 0; border-top: 1px solid var(--line); }
  /* a menu that dropped DOWN out of a top bar opens UP out of a foot bar */
  #sb-center.doc-open > .doc-head .sb-drop { top: auto; bottom: calc(100% + 4px); }
  #sb-center .sb-selname { font-weight: 600; }
  #sb-center .sb-selkind { margin-left: 8px; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.2px;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  #sb-center .sb-bar-acts { position: relative; display: flex; align-items: center; gap: 6px; }
  #sb-center .sb-sortwrap { position: relative; display: flex; align-items: center; gap: 0; }
  #sb-center .sb-sortwrap .sb-btn { border-radius: 3px 0 0 3px; }
  #sb-center .sb-sortwrap .sb-dir { border-radius: 0 3px 3px 0; border-left: 0; width: 26px; justify-content: center; padding: 0; }
  #sb-app .sb-caret { color: var(--ink-dim); font-size: calc(10px * var(--sb-fs, 1)); }
  #sb-app .sb-drop {
    position: absolute; top: calc(100% + 4px); left: 0; min-width: 168px; z-index: 45;
    background: var(--panel-2); border: 1px solid var(--line); padding: 3px 0;
    box-shadow: 0 12px 28px color-mix(in oklch, var(--sb-shadow) 55%, transparent);
  }
  #sb-app .sb-drop .sb-mi { display: block; width: 100%; text-align: left; }
  #sb-app .sb-moveto { left: auto; right: 0; }
  /* the designation control + the Compile press — folder affordances, finger-sized */
  #sb-center .sb-docwrap { position: relative; display: inline-flex; align-items: center; }
  #sb-app .sb-docbtn.on { color: var(--accent); border-color: color-mix(in oklch, var(--sb-accent) 55%, var(--sb-chip-edge)); }
  #sb-app .sb-docdrop { left: auto; right: 0; min-width: 210px; }
  #sb-app .sb-drop .sb-mi.doc { display: flex; align-items: center; min-height: 44px; padding: 6px 14px;
    font-size: calc(12.5px * var(--sb-fs, 1)); }
  #sb-app .sb-compilebtn { font-weight: 700; color: var(--sb-bg); background: var(--accent); border-color: var(--accent); }
  #sb-app .sb-compilebtn:hover { background: color-mix(in oklch, var(--sb-accent) 82%, var(--sb-lift)); color: var(--sb-bg); }
  /* the mark a designated folder wears in its banner — small, and never a button */
  #sb-app .sb-docmark { flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); font-weight: 700; letter-spacing: 0.9px;
    padding: 1px 7px; border-radius: 999px; white-space: nowrap;
    color: var(--sb-banner-ink); background: color-mix(in oklch, var(--sb-accent) 34%, transparent);
    border: 1px solid color-mix(in oklch, var(--sb-accent) 55%, transparent); }
  #sb-app .sb-docmark.level { background: color-mix(in oklch, var(--sb-ok) 30%, transparent);
    border-color: color-mix(in oklch, var(--sb-ok) 52%, transparent); }
  @media (pointer: coarse) {
    #sb-app .sb-docbtn, #sb-app .sb-compilebtn { height: auto; min-height: 44px; padding: 0 14px; }
    #sb-app .sb-drop .sb-mi.doc { min-height: 48px; }
  }
  #sb-app .sb-note { padding: 5px 11px; font-size: calc(11px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); font-style: italic; }

  /* the grid — every measure below reads a variable the grid element publishes from CARD_GRID
     (Settings ▸ Card grid size); the fallback in each var() IS the old medium value, so a grid
     rendered without the setting is pixel-identical to what shipped before. */
  #sb-center .sb-scroll { flex: 1 1 auto; overflow: auto; min-height: 0; }
  /* jace, 2026-08-22: "Scrolling the folder view pane is a pain when on tablet. Please make a wide
     scrollbar on the side." First try widened the NATIVE bar — and on his seat nothing moved, because
     a touch browser draws overlay scrollbars and ignores ::-webkit-scrollbar / scrollbar-width there.
     So the rail is ours now: a real 22px column beside the grid with a tall thumb a thumb can catch,
     always visible, dragged with pointer events. The native bar on this scroller is hidden so there
     is exactly one. */
  #sb-center .sb-scrollwrap { flex: 1 1 auto; min-height: 0; display: flex; align-items: stretch; }
  #sb-center .sb-scrollwrap .sb-scroll { flex: 1 1 auto; }
  #sb-center .sb-scroll { scrollbar-width: none; }
  #sb-center .sb-scroll::-webkit-scrollbar { width: 0; height: 0; }
  #sb-center .sb-rail { flex: 0 0 auto; position: relative; width: 22px; touch-action: none;
    background: color-mix(in oklch, var(--sb-panel-2) 86%, var(--sb-line));
    border-right: 1px solid var(--sb-line); }
  #sb-center .sb-rail-thumb { position: absolute; left: 3px; right: 3px; top: 0; height: 0;
    border-radius: 8px; touch-action: none; cursor: grab;
    background: color-mix(in oklch, var(--sb-scroll) 82%, var(--sb-ink));
    box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--sb-line) 70%, transparent); }
  #sb-center .sb-rail-thumb:active { background: var(--sb-accent); cursor: grabbing; }
  /* Nothing to scroll: the rail STAYS — a bar that comes and goes is a bar a finger can't trust.
     It just fills its track and goes quiet. (jace: "vanishes; and is therefore useless for tablets.") */
  #sb-center .sb-rail-thumb[data-idle="1"] {
    background: color-mix(in oklch, var(--sb-panel-2) 60%, var(--sb-line)); pointer-events: none; }
  #sb-center .sb-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--sb-tile-min, 200px), 1fr));
    gap: var(--sb-grid-gap-y, 18px) var(--sb-grid-gap-x, 16px);
    padding: var(--sb-grid-pad, 16px 18px 26px); align-items: start; justify-items: start;
  }
  #sb-app .sb-tile {
    /* Playing-card proportions: a real card is 63 x 88 mm. The width flexes with the
       column, the ratio never does — a tile always reads as a card, not a box. */
    position: relative; width: 100%; max-width: var(--sb-tile-max, 250px); aspect-ratio: 63 / 88;
    padding: 0; cursor: pointer; user-select: none;
    /* A finger sliding sideways across a tile is a swipe, not a scroll: the browser keeps the
       vertical pan and hands us every horizontal move, so a flick never dies as pointercancel. */
    touch-action: pan-y; -webkit-user-select: none; -webkit-touch-callout: none;
    font: inherit; text-align: left; color: inherit; background: transparent; border: 0;
  }
  /* the head banner — status wears the top edge of the card, like a card's type line */
  #sb-app .sb-banner {
    flex: 0 0 auto; display: flex; align-items: center; gap: 6px;
    margin: -1px -1px 0; padding: 5px 9px 4px;
    border-bottom: 1px solid var(--sb-banner-edge); border-radius: 4px 4px 0 0;
    background: linear-gradient(var(--sb-banner), var(--sb-banner-2));
    color: var(--sb-banner-ink);
    font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 1.3px; text-transform: uppercase; font-weight: 600;
  }
  #sb-app .sb-banner.none { color: color-mix(in oklch, var(--sb-banner-ink) 55%, var(--sb-ink-dim)); font-weight: 500; }
  #sb-app .sb-banner .sb-banner-t { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; }
  #sb-app .sb-banner .sb-prio { color: currentColor; text-transform: none; }
  /* The named banner: the card's own name reads first, in its own case and weight, and the status
     word steps back to a small mark on the right. Both sit on the status colour, so the ink is the
     banner's ink and the name inherits it rather than the body's. */
  #sb-app .sb-banner.named { align-items: baseline; gap: 7px; padding: 6px 9px 5px; text-transform: none; letter-spacing: 0.1px; }
  #sb-app .sb-banner.named .sb-banner-n { flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; }
  #sb-app .sb-banner.named .sb-name {
    flex: 1 1 auto; min-width: 0; font-size: var(--sb-tile-name, 14px); font-weight: 700;
    line-height: 1.25; color: inherit; overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere;
  }
  #sb-app .sb-banner.named .sb-banner-s {
    flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 1.1px;
    text-transform: uppercase; font-weight: 600; opacity: 0.82;
  }

  /* quick stats along the foot */
  #sb-app .sb-badges {
    flex: 1 1 auto; display: flex; flex-wrap: wrap; gap: 3px 5px; min-width: 0;
  }
  #sb-app .sb-badge {
    display: inline-flex; align-items: center; padding: 0; white-space: nowrap;
    font-size: calc(10.5px * var(--sb-fs, 1)); font-variant-numeric: tabular-nums;
    color: color-mix(in oklch, var(--sb-ink-dim) 55%, var(--sb-ink));
  }
  #sb-app .sb-badge + .sb-badge::before {
    content: "·"; margin-right: 5px; opacity: 0.5;
  }
  #sb-app .sb-badge.zero { color: color-mix(in oklch, var(--sb-ink-dim) 42%, var(--sb-line)); }

  #sb-app .sb-tile .sb-body {
    flex: 1 1 auto; display: flex; flex-direction: column; gap: var(--sb-tile-body-gap, 6px); min-height: 0;
    padding: var(--sb-tile-body-pad, 9px 11px 9px);
  }
  #sb-app .sb-tile .sb-face {
    position: relative; z-index: 2; display: flex; flex-direction: column; gap: 0;
    height: 100%; padding: 0;
    background: linear-gradient(color-mix(in oklch, var(--sb-panel-2) 33%, var(--sb-hover)), var(--sb-status));
    border: 1px solid var(--line); border-radius: 4px;
    box-shadow: 0 6px 16px color-mix(in oklch, var(--sb-shadow) 42%, transparent);
    transition: border-color 120ms ease, transform 90ms ease, box-shadow 120ms ease;
  }
  #sb-app .sb-tile:hover .sb-face { border-color: color-mix(in oklch, var(--sb-line) 65%, var(--sb-ink-dim)); transform: translateY(-1px); }
  #sb-app .sb-tile.sel .sb-face { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 10px 22px color-mix(in oklch, var(--sb-shadow) 50%, transparent); }
  /* --- carried tiles ------------------------------------------------------------------
     The tile in hand goes ghostly where it sat, and the grid PARTS around where it will
     land: the neighbour steps aside and wears the caret on the edge the card will take.
     A folder is different — it swallows what is dropped on it, so the whole container
     lights instead of parting. Every one of these classes is put on by the pointer
     machine in ui.js and taken off again on cancel. */
  #sb-app .sb-tile { transition: transform 110ms ease; }
  #sb-app .sb-tile.dragging { opacity: 0.34; }
  #sb-app .sb-tile.drop-before { transform: translateX(11px); }
  #sb-app .sb-tile.drop-after { transform: translateX(-11px); }
  #sb-app .sb-tile.drop-before .sb-face {
    box-shadow: inset 4px 0 0 var(--accent), 0 6px 16px color-mix(in oklch, var(--sb-shadow) 42%, transparent);
  }
  #sb-app .sb-tile.drop-after .sb-face {
    box-shadow: inset -4px 0 0 var(--accent), 0 6px 16px color-mix(in oklch, var(--sb-shadow) 42%, transparent);
  }
  #sb-app .sb-tile.drop-into { transform: scale(1.045); }
  #sb-app .sb-tile.drop-into .sb-face {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent), 0 12px 26px color-mix(in oklch, var(--sb-shadow) 55%, transparent);
    background: linear-gradient(color-mix(in oklch, var(--sb-accent) 24%, var(--sb-hover)), color-mix(in oklch, var(--sb-accent) 9%, var(--sb-status)));
  }
  #sb-app .sb-layers { position: absolute; inset: 0; z-index: 1; }
  #sb-app .sb-layer {
    position: absolute; inset: 0; border: 1px solid var(--line); border-radius: 4px;
    background: var(--sb-panel-2); box-shadow: 0 4px 10px color-mix(in oklch, var(--sb-shadow) 35%, transparent);
  }
  #sb-app .sb-t-top { display: flex; align-items: flex-start; gap: 6px; }
  #sb-app .sb-tile .sb-name {
    flex: 1 1 auto; font-size: var(--sb-tile-name, 14px); font-weight: 600; letter-spacing: 0.1px; line-height: 1.28;
    color: color-mix(in oklch, var(--sb-ink) 85%, white); overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: var(--sb-tile-name-lines, 3); -webkit-box-orient: vertical;
  }
  #sb-app .sb-oq {
    flex: 0 0 auto; width: 16px; height: 16px; border-radius: 50%; font-size: calc(11px * var(--sb-fs, 1)); font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-accent) 34%, var(--sb-panel)); color: color-mix(in oklch, var(--sb-ink) 70%, white);
  }
  /* HIS CALL: the summary SCROLLS in place instead of being cut off — a long one keeps all its
     words and the tile keeps its size. overscroll-behavior stops the grid from scrolling along
     with it, and touch-action lets a thumb drag the text on a tablet without starting a card drag. */
  #sb-app .sb-sum {
    flex: 1 1 auto; min-height: 0; font-size: var(--sb-tile-sum, 12px); line-height: 1.45;
    color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-ink));
    /* WHY NOT contain: a summary fills ~70% of a tile, so on a tablet nearly every finger that
       tries to scroll the grid lands on one. "contain" blocks the pan from reaching the grid even
       when the summary has nothing to scroll — the pane only moved when a finger found the banner
       or a gap. (jace: "Super difficult to do. Rarely works.") With "auto" a summary with no
       overflow hands the gesture straight up, and a long one scrolls its own words first. */
    overflow-y: auto; overflow-x: hidden; overscroll-behavior: auto; touch-action: pan-y;
    scrollbar-width: thin; scrollbar-color: color-mix(in oklch, var(--sb-line) 80%, var(--sb-ink-dim)) transparent;
  }
  #sb-app .sb-sum::-webkit-scrollbar { width: 5px; }
  #sb-app .sb-sum::-webkit-scrollbar-thumb {
    background: color-mix(in oklch, var(--sb-line) 80%, var(--sb-ink-dim)); border-radius: 3px;
  }
  #sb-app .sb-sum::-webkit-scrollbar-track { background: transparent; }
  /* small tiles: the name and the summary are the card at that size — the vitals row would take a
     third of the face for numbers nobody can read, so it stands down until medium. */
  #sb-center .sb-grid[data-card-grid="small"] .sb-badges { display: none; }
  #sb-center .sb-grid[data-card-grid="small"] .sb-tile.add span { font-size: calc(17px * var(--sb-fs, 1)); }
  #sb-center .sb-grid[data-card-grid="small"] .sb-tile.add small { font-size: calc(10px * var(--sb-fs, 1)); }
  #sb-center .sb-grid[data-card-grid="large"] .sb-tile.add span { font-size: calc(27px * var(--sb-fs, 1)); }
  /* --- the notepad's grid ----------------------------------------------------------------------
     SHELL CONTRACT v2. With no nav pane and no metadata pane beside it, the grid IS the view: it
     takes the whole width of the panel and spends it on FEWER, BIGGER cards (every measure comes in
     as the same variables the full shell publishes — the SHELL table stretches CARD_GRID, nothing
     here re-states a number), and each tile goes quiet. The left gutter in --sb-grid-pad keeps the
     chrome lane's side rail clear; the grid element itself still runs edge to edge.
     EVERY RULE BELOW IS GATED ON data-shell — the full shell cannot see any of it. */
  /* SHELL CONTRACT v4 — jace, 2026-08-26: "Cards in notepad view should be half their current
     size." The folder grid (#sb-grid) runs TWO columns; the results grid keeps the single
     column — its rows are rows, not cards, and halving a row just breaks its line. */
  #sb-center .sb-grid[data-shell="notepad"] {
    grid-template-columns: minmax(0, 1fr); justify-items: stretch;
  }
  #sb-center #sb-grid[data-shell="notepad"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  #sb-center .sb-grid[data-shell="notepad"] .sb-tile { width: 100%; max-width: none; }
  #sb-center .sb-grid[data-shell="notepad"] .sb-t-foot {
    border-top-color: transparent; margin-top: 2px; padding-top: 4px; min-height: 0;
  }
  #sb-center .sb-grid[data-shell="notepad"] .sb-tile .sb-face {
    box-shadow: 0 8px 20px color-mix(in oklch, var(--sb-shadow) 34%, transparent);
  }
  /* v4: half-size cards wear the base banner padding — the roomy 8/11/7 dressed the giants. */
  /* the one mark that survives the thinning: words this card is holding that the book has not got.
     currentColor is the banner's own ink, so the dot reads on every status hue. */
  #sb-app .sb-tile-unsaved {
    flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: currentColor;
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--sb-shadow) 40%, transparent);
  }
  /* THE UNREAD DOT — bottom-left, first seat in the foot row, theme accent, a slow soft breath.
     Small enough that the stats beside it still read; the folder rollup is smaller and fainter. */
  #sb-app .sb-unread {
    flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%;
    background: color-mix(in oklch, var(--sb-accent) 62%, white);
    box-shadow:
      0 0 3px 1px var(--sb-accent),
      0 0 11px 4px color-mix(in oklch, var(--sb-accent) 72%, transparent);
    animation: sb-unread-breathe 2.6s ease-in-out infinite;
  }
  #sb-app .sb-unread.sub {
    width: 6px; height: 6px; opacity: 0.6;
    box-shadow:
      0 0 2px 1px var(--sb-accent),
      0 0 6px 2px color-mix(in oklch, var(--sb-accent) 45%, transparent);
    animation-duration: 3.4s;
  }
  @keyframes sb-unread-breathe {
    0%, 100% {
      opacity: 0.85;
      box-shadow: 0 0 3px 1px var(--sb-accent),
        0 0 9px 3px color-mix(in oklch, var(--sb-accent) 55%, transparent);
    }
    50% {
      opacity: 1;
      box-shadow: 0 0 5px 2px var(--sb-accent),
        0 0 16px 6px color-mix(in oklch, var(--sb-accent) 85%, transparent);
    }
  }
  @media (prefers-reduced-motion: reduce) { #sb-app .sb-unread { animation: none; } }
  #sb-app .sb-sum.dim { color: color-mix(in oklch, var(--sb-ink-dim) 47%, var(--sb-line)); font-style: italic; }
  /* --- the picture on a tile ------------------------------------------------------------------
     HIS PLACEMENT: below the name, above the summary — inside the body, so it sits in the same
     column the words do and reads as part of the card rather than a header strip. One height per
     grid size, held by every tile in the folder, so a mixed folder keeps one horizon. The plate
     carries the surface colour itself, so a filename still baking shows a quiet band — never a
     broken box — and the face keeps its 63x88 either way. */
  #sb-app .sb-tile .sb-thumb {
    /* HIS MEASURE: almost the whole card wide — 4px (~1mm) of clearance on each side and the same
       gap under the status banner — and SQUARE, so the height follows the width. object-fit crops
       a wide bake into it, so the plate never stretches. */
    position: relative; overflow: visible;
    flex: 0 0 auto; width: calc(100% - 22px); aspect-ratio: 1 / 1;
    margin: 11px 11px 0; border-radius: 3px;
    background: color-mix(in oklch, var(--sb-field) 82%, var(--sb-panel-2));
    border: 1px solid color-mix(in oklch, var(--sb-line) 62%, transparent);
  }
  #sb-app .sb-tile .sb-thumb-pic { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 2px; }
  /* the open-question mark, sitting half off the picture's top-left corner */
  #sb-app .sb-tile .sb-thumb .sb-oq {
    position: absolute; top: -6px; left: -6px; z-index: 2;
    box-shadow: 0 1px 3px color-mix(in oklch, var(--sb-shadow) 45%, transparent);
    border: 1px solid color-mix(in oklch, var(--sb-panel-2) 70%, transparent);
  }
  /* A square this size takes most of the face, so the words under it give ground first — and since
     the summary scrolls, what's left over is reachable rather than lost. */
  #sb-app .sb-tile .sb-thumb + .sb-body .sb-sum,
  #sb-app .sb-face:has(.sb-thumb) .sb-sum { min-height: 0; }
  #sb-app .sb-face:has(.sb-thumb) .sb-body { min-height: 0; overflow: hidden; }
  #sb-app .sb-t-foot {
    display: flex; align-items: center; gap: 6px; min-height: 18px;
    margin-top: 4px; padding-top: 5px; border-top: 1px solid color-mix(in oklch, var(--sb-line) 60%, transparent);
  }
  #sb-app .sb-pill {
    display: inline-block; padding: 1px 7px; border-radius: 9px; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 0.4px;
    text-transform: uppercase; border: 1px solid var(--line); background: var(--sb-hover); color: var(--ink-dim);
  }
  #sb-app .sb-pill.primary { background: var(--accent); border-color: var(--accent); color: var(--sb-bg); }
  #sb-app .sb-prio {
    display: inline-flex; align-items: center; flex: 0 0 auto; white-space: nowrap;
    font-size: calc(9.5px * var(--sb-fs, 1)); letter-spacing: 0.6px; font-weight: 600; font-variant-numeric: tabular-nums;
    opacity: 0.92;
  }
  #sb-app .sb-chip { display: inline-flex; align-items: center; gap: 3px; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-dim); }
  /* the written way in, sitting quiet on the tile until the pointer finds it */
  #sb-app button.sb-chip.open {
    margin-left: 6px; padding: 1px 7px; border-radius: 999px; cursor: pointer;
    background: transparent; border: 1px solid color-mix(in oklch, var(--sb-ink-dim) 35%, transparent);
    color: color-mix(in oklch, var(--sb-ink-dim) 85%, var(--sb-accent)); font: inherit; font-size: calc(10.5px * var(--sb-fs, 1));
  }
  #sb-app button.sb-chip.open:hover {
    border-color: var(--sb-accent);
    color: var(--sb-accent);
    background: color-mix(in oklch, var(--sb-accent) 12%, transparent);
  }
  #sb-app .sb-more {
    position: absolute; z-index: 3; right: -6px; top: -6px; min-width: 22px; height: 20px; padding: 0 6px;
    display: flex; align-items: center; justify-content: center; border-radius: 10px;
    background: var(--accent); color: var(--sb-bg); font-size: calc(11px * var(--sb-fs, 1)); font-weight: 700;
    box-shadow: 0 3px 8px color-mix(in oklch, var(--sb-shadow) 50%, transparent);
  }
  #sb-app .sb-tile.add {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
    border: 1px dashed color-mix(in oklch, var(--sb-line) 75%, var(--sb-ink-dim)); border-radius: 4px; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line));
    background: color-mix(in oklch, var(--sb-center) 50%, var(--sb-panel));
  }
  #sb-app .sb-tile.add:hover { border-color: var(--accent); color: var(--accent); }
  #sb-app .sb-tile.add span { font-size: calc(22px * var(--sb-fs, 1)); line-height: 1; }
  #sb-app .sb-tile.add small { font-size: calc(11px * var(--sb-fs, 1)); letter-spacing: 0.4px; }
  #sb-center .sb-empty-note { padding: 4px 20px 20px; color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); font-size: calc(12px * var(--sb-fs, 1)); font-style: italic; }

  /* the contextual menu — immediately below the entity */
  #sb-app .sb-ctx {
    /* Anchored to the card's LEFT edge, never centred: a centred menu on the first
       column hangs out past the grid and disappears under the nav pane. Growing
       rightwards keeps every item on screen wherever the card sits. */
    position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; right: auto; transform: none;
    display: flex; flex-wrap: nowrap; white-space: nowrap; width: max-content; overflow: hidden;
    background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px;
    box-shadow: 0 12px 26px color-mix(in oklch, var(--sb-shadow) 55%, transparent);
  }
  #sb-app .sb-ctx::before {
    content: ""; position: absolute; top: -4px; left: 22px; margin-left: -4px; width: 7px; height: 7px;
    background: var(--panel-2); border-left: 1px solid var(--line); border-top: 1px solid var(--line);
    transform: rotate(45deg);
  }
  #sb-app .sb-mi {
    padding: 6px 10px; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); cursor: pointer; white-space: nowrap;
    background: transparent; border: 0; color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim));
  }
  #sb-app .sb-ctx .sb-mi { background: var(--panel-2); text-align: center; }
  #sb-app .sb-ctx .sb-mi + .sb-mi { border-left: 1px solid var(--line); }
  #sb-app .sb-ctx .sb-mi.glyph {
    padding: 4px 9px; font-size: calc(17px * var(--sb-fs, 1)); line-height: 1; color: color-mix(in oklch, var(--sb-ink-dim) 64%, var(--sb-ink));
  }
  #sb-app .sb-ctx .sb-mi.glyph:hover { color: var(--accent); }
  #sb-app .sb-mi:hover { background: var(--sb-hover-hi); color: var(--accent); }
  #sb-app .sb-mi.on { color: var(--accent); }

  /* The #[ type-ahead's panel. It lives on document.body (outside the morph container), so it
     wears the app's own tokens — copied onto it when it opens — and needs its dressing HERE too:
     page edit view carries this block in lib/ui-page.js's styles, and that view is never on screen
     at the same time as this one. Same rules, so the list reads identically on both surfaces. */
  #sb-refpick {
    overflow-y: auto; overflow-x: hidden; border-radius: 3px;
    font-family: ui-sans-serif, system-ui, sans-serif; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.35;
    background: var(--sb-panel-2, oklch(0.26 0.01 70)); color: var(--sb-ink, oklch(0.93 0.01 70));
    border: 1px solid var(--sb-line, oklch(0.34 0.01 70));
    box-shadow: 0 10px 26px oklch(0 0 0 / 0.45);
  }
  #sb-refpick .sbrp-row {
    display: flex; align-items: baseline; gap: 6px; padding: 5px 8px; cursor: pointer;
    border-bottom: 1px solid color-mix(in oklch, var(--sb-line, oklch(0.34 0.01 70)) 60%, transparent);
  }
  #sb-refpick .sbrp-row:last-child { border-bottom: 0; }
  #sb-refpick .sbrp-row.on { background: var(--sb-select, oklch(0.42 0.06 60)); color: var(--sb-select-ink, white); }
  #sb-refpick .sbrp-n { flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  #sb-refpick .sbrp-s {
    flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: calc(10.5px * var(--sb-fs, 1)); opacity: 0.62;
  }
  #sb-refpick .sbrp-k {
    flex: 0 0 auto; font-size: calc(9px * var(--sb-fs, 1)); letter-spacing: 1px; text-transform: uppercase; opacity: 0.5;
  }
  /* SHELF MODE (the token reads asset:) — same dress as lib/ui-page.js's copy; the two are never on screen together. */
  #sb-refpick.shelf { display: flex; flex-direction: column; overflow: hidden; }
  #sb-refpick .sbrp-tabs {
    flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 2px; padding: 5px 6px 0;
    background: var(--sb-panel, oklch(0.2 0.01 70));
    border-bottom: 1px solid var(--sb-line, oklch(0.34 0.01 70));
  }
  #sb-refpick .sbrp-tab {
    display: inline-flex; align-items: baseline; gap: 5px; padding: 4px 9px 5px; cursor: pointer; margin-bottom: -1px;
    border: 1px solid transparent; border-bottom: 0; border-radius: 3px 3px 0 0;
    font-size: calc(11px * var(--sb-fs, 1)); font-weight: 600; opacity: 0.68; user-select: none;
  }
  #sb-refpick .sbrp-tab:hover { opacity: 1; background: var(--sb-hover, oklch(0.3 0.02 70)); }
  #sb-refpick .sbrp-tab.on {
    opacity: 1; background: var(--sb-panel-2, oklch(0.24 0.01 70)); color: var(--sb-accent, oklch(0.62 0.12 60));
    border-color: var(--sb-line, oklch(0.34 0.01 70));
  }
  #sb-refpick .sbrp-tc { font-size: calc(9.5px * var(--sb-fs, 1)); font-weight: 500; opacity: 0.6; }
  #sb-refpick .sbrp-list { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; }
  #sb-refpick .sbrp-hint {
    flex: 0 0 auto; padding: 4px 8px; font-size: calc(9.5px * var(--sb-fs, 1)); opacity: 0.55;
    border-top: 1px solid color-mix(in oklch, var(--sb-line, oklch(0.34 0.01 70)) 60%, transparent);
  }
  #sb-refpick .sbrp-none { padding: 10px 8px; font-size: calc(11px * var(--sb-fs, 1)); opacity: 0.6; font-style: italic; }

  /* modal */
  #sb-card-modal { position: absolute; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--sb-scrim) 62%, transparent); }
  #sb-app .sb-modal-card {
    width: min(680px, 92%); max-height: 86%; display: flex; flex-direction: column;
    background: var(--panel-2); border: 1px solid var(--line); border-radius: 5px;
    box-shadow: 0 24px 60px color-mix(in oklch, var(--sb-shadow) 62%, transparent);
  }
  #sb-app .sb-modal-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--line); }
  #sb-app .sb-modal-title { font-weight: 600; letter-spacing: 0.3px; color: var(--accent); }
  #sb-app .sb-modal-addr { flex: 1 1 auto; font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-app .sb-modal-addr .sep { color: color-mix(in oklch, var(--sb-ink-dim) 47%, var(--sb-line)); margin: 0 3px; }
  /* position: relative so the loading veil can float over the body without taking any layout —
     the head (and its ✕) stays above it and stays clickable. */
  #sb-app .sb-modal-body { position: relative; flex: 1 1 auto; overflow: auto; padding: 14px; }
  #sb-app .sb-modal-foot { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-top: 1px solid var(--line); font-size: calc(11px * var(--sb-fs, 1)); }
  /* the draft's marks: the head's unsaved dot, the pending tag, the disabled Done while saving */
  #sb-app .sb-unsaved { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto;
    font-size: calc(9.5px * var(--sb-fs, 1)); letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent); }
  #sb-app .sb-unsaved .sb-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
  #sb-app .sb-foot-hint { font-style: italic; }
  #sb-app .sb-tag.pending { border-style: dashed; }
  #sb-app .sb-btn[disabled] { opacity: 0.55; cursor: default; }
  /* The selection bar is the one a thumb lives in: every button in it is one height, taller than
     the app's 24px mouse chips, so nothing in the row reads as an odd man out. */
  #sb-app #sb-editor-bar .sb-btn { height: 32px; padding: 0 11px; }
  #sb-app .sb-confirm-wrap { position: absolute; inset: 0; z-index: 70; display: flex; align-items: center;
    justify-content: center; background: color-mix(in oklch, var(--sb-scrim) 55%, transparent); }
  #sb-app .sb-confirm { width: min(400px, 88%); padding: 14px; background: var(--panel-2);
    border: 1px solid var(--line); border-radius: 5px;
    box-shadow: 0 18px 44px color-mix(in oklch, var(--sb-shadow) 62%, transparent); }
  #sb-app .sb-confirm-t { font-weight: 600; letter-spacing: 0.3px; color: var(--accent); margin-bottom: 6px; }
  #sb-app .sb-confirm-b { font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.45; margin-bottom: 13px;
    color: color-mix(in oklch, var(--sb-ink) 80%, var(--sb-ink-dim)); }
  #sb-app .sb-confirm-acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  #sb-app .sb-field { margin-bottom: 13px; }
  #sb-app .sb-field > label { display: flex; align-items: center; margin-bottom: 4px; font-size: calc(10px * var(--sb-fs, 1));
    letter-spacing: 1.4px; text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  #sb-app .sb-two { display: flex; gap: 12px; }
  #sb-app .sb-two > .sb-field { flex: 1 1 0; min-width: 0; }
  #sb-app .sb-input, #sb-app .sb-inline {
    width: 100%; padding: 6px 8px; font: inherit; color: inherit; resize: vertical;
    background: var(--sb-field); border: 1px solid var(--line); border-radius: 3px; outline: none;
  }
  #sb-app .sb-inline { padding: 3px 6px; font-size: calc(12px * var(--sb-fs, 1)); }
  #sb-app .sb-select {
    appearance: none; cursor: pointer; padding-right: 24px;
    background-image: linear-gradient(45deg, transparent 50%, var(--sb-ink-dim) 50%),
                      linear-gradient(135deg, var(--sb-ink-dim) 50%, transparent 50%);
    background-position: right 12px center, right 7px center;
    background-size: 5px 5px, 5px 5px; background-repeat: no-repeat;
  }
  #sb-app .sb-select option { background: var(--sb-field); color: var(--ink); }
  /* the open-question switch: the chosen side is filled and says which it is */
  #sb-app .seg { display: flex; }
  #sb-app .seg-btn {
    flex: 1 1 0; padding: 6px 4px; font: inherit; font-size: calc(12px * var(--sb-fs, 1)); cursor: pointer;
    background: var(--sb-field); color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line));
    border: 1px solid var(--line); white-space: nowrap;
  }
  #sb-app .seg-btn:first-child { border-radius: 3px 0 0 3px; }
  #sb-app .seg-btn:last-child { border-radius: 0 3px 3px 0; border-left: 0; }
  #sb-app .seg-btn:hover { color: var(--ink); }
  #sb-app .seg-btn.on {
    background: var(--sb-hover-hi); color: var(--ink); border-color: var(--accent); font-weight: 600;
  }
  #sb-app .seg-btn.open.on { background: color-mix(in oklch, var(--sb-accent) 30%, var(--sb-panel)); border-color: color-mix(in oklch, var(--sb-accent) 71%, var(--sb-panel)); color: color-mix(in oklch, var(--sb-ink) 70%, white); }
  /* The editor's arrival animation is load-bearing, not decoration: its animationstart is what
     hands the field the caret (nameField's onanimationstart) — inline handlers are the only live JS
     an inserted node gets in this realm. */
  @keyframes sb-name-edit-in { from { opacity: .45; } to { opacity: 1; } }
  #sb-app .sb-name-edit {
    animation: sb-name-edit-in .12s linear 1;
    flex: 1 1 auto; min-width: 0; width: 100%; padding: 1px 4px; font: inherit; font-size: calc(14px * var(--sb-fs, 1));
    font-weight: 600; color: inherit; background: var(--sb-field);
    border: 1px solid var(--accent); border-radius: 2px; outline: none;
  }
  #sb-app .sb-input:focus, #sb-app .sb-inline:focus { border-color: var(--accent); }
  #sb-app .sb-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  /* The quiet line under a control that says how the control is used. */
  #sb-app .sb-hint {
    margin-top: 5px; font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.45;
    color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-line));
  }
  /* --- the image box in Edit Card ---------------------------------------------------------------
     The PLATE is the container and it is always painted: the app's own field surface, the app's own
     3px radius, one fixed height. The <img> lies inside it at object-fit: cover, so a picture that
     has not finished baking simply isn't there yet and the plate shows through — no broken icon, no
     spinner. The description sits under the plate in the same quiet type the hints wear. */
  #sb-app .sb-img-plate {
    /* Square here too, so the plate an author judges is the same shape the tile wears. */
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 208px; max-width: 100%; aspect-ratio: 1 / 1; margin: 0 auto; overflow: hidden;
    background: color-mix(in oklch, var(--sb-field) 82%, var(--sb-panel-2));
    border: 1px solid var(--line); border-radius: 3px;
  }
  #sb-app .sb-img-pic { display: block; width: 100%; height: 100%; object-fit: cover; }
  #sb-app .sb-img-none {
    font-size: calc(11.5px * var(--sb-fs, 1)); font-style: italic; letter-spacing: 0.3px;
    color: color-mix(in oklch, var(--sb-ink-dim) 62%, var(--sb-line));
  }
  #sb-app .sb-img-cap {
    margin-top: 5px; font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.45;
    color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-line));
  }
  #sb-app .sb-img-row { display: flex; align-items: flex-start; gap: 8px; margin-top: 7px; }
  #sb-app .sb-img-say { flex: 1 1 auto; min-width: 0; }
  #sb-app .sb-img-acts { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; }
  #sb-app .sb-img-acts .sb-btn { justify-content: center; }
  #sb-app .sb-img-prompt { min-height: 48px; }
  #sb-app .sb-img-hint { margin-top: 4px; }
  #sb-app .sb-hint code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: calc(10.5px * var(--sb-fs, 1));
    padding: 0 3px; border-radius: 2px;
    background: color-mix(in oklch, var(--sb-accent) 14%, transparent); color: var(--accent);
  }
  #sb-app .sb-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px 2px 8px;
    background: var(--sb-hover); border: 1px solid var(--line); border-radius: 10px; font-size: calc(11px * var(--sb-fs, 1)); }
  #sb-app .sb-tag-add { width: 92px; }
  #sb-app .sb-x { width: 17px; height: 17px; padding: 0; font: inherit; font-size: calc(10px * var(--sb-fs, 1)); cursor: pointer;
    background: transparent; border: 0; color: var(--ink-dim); border-radius: 3px; }
  #sb-app .sb-x:hover { background: color-mix(in oklch, var(--sb-warn) 42%, var(--sb-panel)); color: color-mix(in oklch, var(--sb-ink) 70%, white); }
  #sb-app .sb-x.big { font-size: calc(13px * var(--sb-fs, 1)); width: 22px; height: 22px; }
  #sb-app .sb-sec { margin-bottom: 9px; padding: 8px; background: color-mix(in oklch, var(--sb-center) 50%, var(--sb-panel)); border: 1px solid var(--line); border-radius: 3px; }
  #sb-app .sb-sec-head { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
  #sb-app .sb-sec-head .sb-inline { flex: 1 1 auto; }
  /* the atmosphere chip + its panel. Tablet targets: 34px tall, nothing smaller than a fingertip. */
  #sb-app .sb-atmo-chip { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto;
    min-height: 34px; padding: 0 11px 0 8px; border-radius: 17px; cursor: pointer; font: inherit;
    font-size: calc(11px * var(--sb-fs, 1));
    color: color-mix(in oklch, var(--sb-ink-dim) 80%, var(--sb-ink));
    background: color-mix(in oklch, var(--sb-chip) 70%, transparent);
    border: 1px solid var(--sb-chip-edge); }
  #sb-app .sb-atmo-chip.on { color: oklch(0.62 0.12 285);
    border-color: color-mix(in oklch, oklch(0.62 0.12 285) 55%, var(--line));
    background: color-mix(in oklch, oklch(0.62 0.12 285) 12%, var(--sb-panel)); }
  #sb-app .sb-atmo-chip.open { border-color: var(--accent); }
  #sb-app .sb-atmo-chip[disabled] { cursor: default; opacity: 0.9; }
  #sb-app .sb-atmo-chip .sb-atmo-n { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-app .sb-atmo-panel { margin: 6px 0 8px; padding: 8px; border-radius: 5px;
    background: color-mix(in oklch, var(--sb-panel) 80%, var(--sb-center));
    border: 1px solid var(--line); }
  #sb-app .sb-atmo-opts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  #sb-app .sb-atmo-opt { min-height: 34px; padding: 0 12px; border-radius: 17px; cursor: pointer;
    font: inherit; font-size: calc(11px * var(--sb-fs, 1)); color: inherit;
    background: var(--sb-field); border: 1px solid var(--line); }
  #sb-app .sb-atmo-opt.on { border-color: var(--accent); color: var(--accent); font-weight: 600; }
  #sb-app .sb-atmo-own { width: 100%; min-height: 34px; padding: 6px 10px; font: inherit;
    font-size: calc(12px * var(--sb-fs, 1)); color: inherit; background: var(--sb-field);
    border: 1px solid var(--line); border-radius: 3px; outline: none; }
  #sb-app .sb-atmo-own:focus { border-color: var(--accent); }
  #sb-app .sb-atmo-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  #sb-app .sb-atmo-clear, #sb-app .sb-atmo-done { min-height: 34px; padding: 0 14px; cursor: pointer;
    font: inherit; font-size: calc(11px * var(--sb-fs, 1)); color: var(--ink-dim);
    background: transparent; border: 1px solid var(--line); border-radius: 17px; }
  #sb-app .sb-atmo-done { color: var(--accent); border-color: color-mix(in oklch, var(--accent) 55%, var(--line)); }
  #sb-app .sb-lines { flex: 0 0 auto; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-dim); font-family: ui-monospace, Menlo, monospace; }
  #sb-app .sb-lines.over { color: var(--sb-warn); }
  #sb-app .sb-sec-text { width: 100%; padding: 6px 8px; font: inherit; font-size: calc(12px * var(--sb-fs, 1)); color: inherit; resize: vertical;
    background: var(--sb-field); border: 1px solid var(--line); border-radius: 3px; outline: none; }
  #sb-app .sb-sec-text:focus { border-color: var(--accent); }
  #sb-app .sb-sec-prev { font-size: calc(11.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 82%, var(--sb-ink));
    white-space: pre-wrap; max-height: 180px; overflow: auto; }
  #sb-app .sb-page-row { display: flex; align-items: center; gap: 7px; padding: 4px 0; }
  #sb-app .sb-page-n { width: 18px; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-dim); text-align: right; }
  #sb-app .sb-page-row .sb-inline { flex: 1 1 auto; }
  #sb-app .sb-pad { padding: 4px 2px; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-app .sb-links { display: flex; flex-wrap: wrap; gap: 5px; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-app .sb-link { padding: 2px 7px; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); cursor: pointer;
    background: color-mix(in oklch, var(--sb-panel-2) 45%, var(--sb-hover)); border: 1px solid var(--line); border-radius: 3px; color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); }
  #sb-app .sb-link:hover { border-color: var(--accent); color: var(--accent); }

  /* stack + page views */
  #sb-center .sb-stackview, #sb-center .sb-pageview { padding: 14px 18px 24px; }
  #sb-app .sb-cyc { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-app .sb-member { display: flex; align-items: center; gap: 9px; padding: 7px 10px; margin-bottom: 6px;
    background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; cursor: pointer; }
  #sb-app .sb-member.top { border-color: color-mix(in oklch, var(--sb-line) 59%, var(--sb-ink-dim)); }
  #sb-app .sb-member:hover { border-color: var(--accent); }
  #sb-app .sb-member-n { width: 16px; font-size: calc(10.5px * var(--sb-fs, 1)); color: var(--ink-dim); }
  #sb-app .sb-member .sb-name { font-size: calc(12.5px * var(--sb-fs, 1)); font-weight: 600; }
  #sb-app .sb-page-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: calc(11.5px * var(--sb-fs, 1)); }
  #sb-app .sb-page { margin-bottom: 14px; }
  #sb-app .sb-page-head { display: flex; gap: 8px; margin-bottom: 5px; font-size: calc(12px * var(--sb-fs, 1)); font-weight: 600; }
  #sb-app .sb-page-body { width: 100%; padding: 10px 12px; font: inherit; font-size: calc(12.5px * var(--sb-fs, 1)); line-height: 1.5;
    color: inherit; background: var(--sb-field); border: 1px solid var(--line); border-radius: 3px; outline: none; resize: vertical; }
  #sb-app .sb-page-body:focus { border-color: var(--accent); }
  #sb-app .sb-err { padding: 6px 18px; font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-warn); }
  /* folders in the grid: the card's chrome, a container's face. Same size, same ring, same field. */
  #sb-app .sb-tile.is-folder .sb-banner.folder {
    background: linear-gradient(color-mix(in oklch, var(--sb-accent) 26%, var(--sb-panel-2)), var(--sb-panel-2));
    border-bottom-color: color-mix(in oklch, var(--sb-accent) 34%, var(--sb-line));
    color: color-mix(in oklch, var(--sb-accent) 72%, var(--sb-ink));
  }
  #sb-app .sb-tile.is-folder .sb-fglyph {
    display: inline-flex; align-items: center; margin-right: 5px; flex: 0 0 auto;
    color: color-mix(in oklch, var(--sb-accent) 78%, var(--sb-ink-dim));
  }
  #sb-app .sb-tile.is-folder .sb-chip.open { color: color-mix(in oklch, var(--sb-ink-dim) 80%, var(--sb-accent)); }
  #sb-app .sb-tile.is-folder.pending { opacity: 0.72; }
  #sb-app .sb-tile.add.folder { border-style: dashed; }
  #sb-app .doc-head .crumb { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  /* ✕ clears the selection, so it rides with the selection's name rather than out among the ops */
  #sb-center .doc-head.sel .sb-selclear { flex: 0 0 auto; margin-left: 8px; }

  /* --- the search results view ---------------------------------------------------------------
     Same tiles as the grid, in the same columns. What is added is the grey line under each one:
     where the card lives, which field the words were found in, and the line of text they were
     found in, with the words themselves lit. */
  #sb-app .sb-reshead .sb-rescount { margin-left: 9px; font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--ink-dim); }
  #sb-app .sb-btn.on { border-color: var(--accent); color: var(--accent); }
  #sb-app .sb-res { display: flex; flex-direction: column; gap: 5px; width: 100%; max-width: 250px; }
  #sb-app .sb-where {
    display: flex; flex-wrap: wrap; align-items: center; gap: 5px;
    font-size: calc(10.5px * var(--sb-fs, 1)); line-height: 1.35; color: color-mix(in oklch, var(--sb-ink-dim) 60%, var(--sb-line));
  }
  #sb-app .sb-where .sep { opacity: 0.55; }
  #sb-app .sb-where .sb-field {
    padding: 0 5px; border: 1px solid var(--line); border-radius: 8px;
    text-transform: uppercase; letter-spacing: 0.5px; font-size: calc(9.5px * var(--sb-fs, 1));
  }
  #sb-app .sb-snip {
    font-size: calc(11px * var(--sb-fs, 1)); line-height: 1.45; color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-ink));
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  }
  #sb-app mark.sb-hit {
    padding: 0 1px; border-radius: 2px; background: var(--sb-mark); color: var(--sb-mark-ink);
  }
  #sb-app .sb-res-all { padding: 0 20px 20px; }
  </style>`;
}

const FIELD_WORD = { name: "name", summary: "summary", section: "section text", page: "page text", text: "text" };

export function searchState(state) {
  return Object.assign(
    { query: "", scope: "book", loading: false, results: [], count: 0, open: false, error: "" },
    (state && state.search) || {}
  );
}

export function isSearching(state) {
  const s = searchState(state);
  return String(s.query || "").trim() !== "" && !s.open;
}

export function resultRow(r, i, tstate, terms) {
  const card = {
    id: String(r.id || r.cardId || ""),
    name: String(r.name || ""),
    summary: String(r.summary || ""),
    status: String(r.status || ""),
    priority: Number(r.priority || 0),
    openQuestion: !!r.openQuestion,
    stats: r.stats || null,
    isStack: false,
    stackSize: 1,
    bookId: String(r.bookId || ""),
    folderId: String(r.folderId || ""),
  };
  const trail = [String(r.bookName || "")]
    .concat(String(r.where || "").split(" › "))
    .map((p) => String(p || "").trim())
    .filter((p) => p !== "");
  const path = trail.map((p) => E(p)).join(' <span class="sep">›</span> ');
  const field = FIELD_WORD[String(r.field || "text")] || "text";
  const inWhat = String(r.fieldIn || "").trim() ? " · " + E(r.fieldIn) : "";
  const snip = String(r.snippet || "").trim() ? `<div class="sb-snip">${HL(r.snippet, terms)}</div>` : "";
  return `<div class="sb-res">
      ${tile(card, i, tstate)}
      <div class="sb-where">${path || "—"}<span class="sb-field">${E(field)}${inWhat}</span></div>
      ${snip}
    </div>`;
}

export function resultsView(state) {
  const s = searchState(state);
  const q = String(s.query || "");
  const terms = q.split(/\s+/).filter((t) => t !== "");
  const rows = Array.isArray(s.results) ? s.results : [];
  const tstate = Object.assign({}, state, {
    hl: terms,
    tileClick: "searchOpen",
    selected: null,
    menu: false,
    renaming: null,
  });
  if (s.error) return ERR.line(s.error, "search", "sb-err");
  if (!rows.length) {
    if (s.loading) return `<div class="sb-empty-note">searching…</div>`;
    const wider =
      String(s.scope || "book") === "all"
        ? ""
        : `<div class="sb-res-all"><button class="sb-btn" data-interactive title="Search every book in this project"
            onclick="${act("searchScope", "all: true")}">search all books</button></div>`;
    return `<div class="sb-empty-note">nothing matches “${E(q)}”</div>${wider}`;
  }
  return `<div class="sb-grid sb-resgrid" id="sb-results" style="${gridVars(state)}"${
    shellName(state) === "full" ? "" : ` data-shell="${E(shellName(state))}"`
  }
    data-card-grid="${E(cardGridName(state))}">${rows
    .map((r, i) => resultRow(r, i, tstate, terms))
    .join("")}</div>`;
}

export function resultsHead(state) {
  const s = searchState(state);
  const q = String(s.query || "");
  const n = Number(s.count || (s.results || []).length) || 0;
  const scope = String(s.scope || "book") === "all" ? "all" : "book";
  const count = s.loading && !n ? "searching…" : n + (n === 1 ? " card" : " cards");
  const clear = "var e = document.getElementById('sb-search'); if (e) e.value = '';" + act("searchClear");
  return `<div class="doc-head sb-reshead" id="sb-editor-bar">
    <div class="crumb">Results for “${E(q)}”<span class="sb-rescount">${E(count)}</span></div>
    <div class="sb-bar-acts">
      <button class="sb-btn${scope === "book" ? " on" : ""}" data-interactive title="Search only the open book"
        onclick="${act("searchScope", "all: false")}">This book</button>
      <button class="sb-btn${scope === "all" ? " on" : ""}" data-interactive title="Search every book in this project"
        onclick="${act("searchScope", "all: true")}">All books</button>
    </div>
    <button class="sb-btn ghost" data-interactive title="Clear the search" onclick="${clear}">✕</button>
  </div>`;
}

const RAIL_DEFS =
  "window.sbRailSync=function(){var el=document.getElementById('sb-center-scroll');" +
  "var ra=document.getElementById('sb-rail'),th=document.getElementById('sb-rail-thumb');" +
  "if(!el||!ra||!th)return;" +
  "if(th.dataset.drag==='1')return;var h=el.clientHeight,sh=el.scrollHeight;" +
  "var rh=ra.clientHeight;" +
  "if(Math.max(0,sh-h-4)===0){th.style.height=rh+'px';th.style.top='0px';" +
  "th.dataset.pos='0';th.dataset.idle='1';return;}th.dataset.idle='';" +
  "var t=Math.max(56,Math.round(rh*h/sh));var y=Math.round((el.scrollTop/(sh-h))*Math.max(0,rh-t));" +
  "th.style.height=t+'px';th.style.top=y+'px';th.dataset.pos=String(y);};" +
  "window.sbRailTo=function(y,span){var el=document.getElementById('sb-center-scroll');" +
  "if(!el)return;el.scrollTop=(y/span)*(el.scrollHeight-el.clientHeight);};" +
  "window.sbRailDown=function(th,ev){th.setPointerCapture(ev.pointerId);th.dataset.drag='1';" +
  "th.dataset.y=String(ev.clientY);th.dataset.start=String(Number(th.dataset.pos||0));" +
  "var el=document.getElementById('sb-center-scroll');" +
  "if(el){th.dataset.sb=el.style.scrollBehavior;el.style.scrollBehavior='auto';}" +
  "ev.preventDefault();ev.stopPropagation();};" +
  "window.sbRailMove=function(th,ev){if(th.dataset.drag!=='1')return;" +
  "var ra=document.getElementById('sb-rail');if(!ra)return;" +
  "var span=Math.max(1,ra.clientHeight-th.offsetHeight);" +
  "var y=Math.max(0,Math.min(span,Number(th.dataset.start||0)+(ev.clientY-Number(th.dataset.y||0))));" +
  "th.style.top=y+'px';th.dataset.pos=String(y);" +
  "window.sbRailTo(y,span);ev.preventDefault();};" +
  "window.sbRailUp=function(th){th.dataset.drag='';" +
  "var el=document.getElementById('sb-center-scroll');" +
  "if(el){el.style.scrollBehavior=th.dataset.sb;}window.sbRailSync();};" +
  "window.sbRailJump=function(ra,ev){var th=document.getElementById('sb-rail-thumb');if(!th)return;" +
  "if(th.dataset.drag==='1')return;var r=ra.getBoundingClientRect();" +
  "var span=Math.max(1,r.height-th.offsetHeight);" +
  "var y=Math.max(0,Math.min(span,ev.clientY-r.top-th.offsetHeight/2));window.sbRailTo(y,span);};" +
  "window.sbRailBoot=function(){var el=document.getElementById('sb-center-scroll');" +
  "if(el){if(!el.dataset.railOn){el.dataset.railOn='1';" +
  "el.addEventListener('scroll',window.sbRailSync);}}" +
  "if(window.sbRailTimer){window.clearInterval(window.sbRailTimer);window.sbRailTimer=null;}" +
  "if(!window.sbRailEvents){window.sbRailEvents=1;" +
  "document.addEventListener('sb:draw',window.sbRailBoot);window.addEventListener('resize',window.sbRailSync);" +
  "document.addEventListener('load',window.sbRailSync,true);document.addEventListener('input',window.sbRailSync,true);}" +
  "if(el&&window.ResizeObserver&&window.sbRailObserved!==el){" +
  "if(window.sbRailObserver)window.sbRailObserver.disconnect();window.sbRailObserved=el;" +
  "window.sbRailObserver=new ResizeObserver(window.sbRailSync);window.sbRailObserver.observe(el);}" +
  "window.sbRailSync();};window.sbRailBoot();";

const RAIL_DOWN = "window.sbRailDown(this,event)";
const RAIL_MOVE = "window.sbRailMove(this,event)";
const RAIL_UP = "window.sbRailUp(this)";
const RAIL_JUMP = "window.sbRailJump(this,event)";

export function rail(key) {
  return (
    `<div class="sb-rail" id="sb-rail" data-interactive onpointerdown="${RAIL_JUMP}">` +
    `<div class="sb-rail-thumb" id="sb-rail-thumb" data-interactive` +
    ` onpointerdown="${RAIL_DOWN}" onpointermove="${RAIL_MOVE}"` +
    ` onpointerup="${RAIL_UP}" onpointercancel="${RAIL_UP}"></div>` +
    `<img class="sb-rail-boot" alt="" aria-hidden="true" style="display:none"` +
    ` src="data:,rail-${E(key)}" onerror="${RAIL_DEFS}"></div>`
  );
}

export function phaseChip(label, n) {
  if (!n) return "";
  return `<span style="border-radius:2px;background:rgba(255,255,255,.09);padding:1px 6px">${E(label)} ${E(String(n))}</span>`;
}

export function phaseStrip(state) {
  const p = state && state.phase;
  if (!p || !p.installed) return "";
  const n = Math.max(0, Math.floor(Number(p.phase) || 0));
  const name = String(p.phaseName || "");
  const said = String(p.statusWords || "not started");
  const through = String(p.approvedWords || "nothing approved yet");
  const c = p.counts || {};
  const chips =
    phaseChip("systems", Number(c.systems) || 0) +
    phaseChip("parked", Number(c.parked) || 0) +
    phaseChip("backlog", Number(c.backlog) || 0) +
    phaseChip("bugs", Number(c.bugs) || 0);
  const lane = p.code ? "" : `<span style="opacity:.7">· writing phase</span>`;
  return `<div class="sb-phase-strip" id="sb-phase-strip" style="border-bottom:1px solid rgba(255,255,255,.10);padding:6px 12px 7px;font-size:12px;line-height:1.35">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-weight:600">Phase ${E(String(n))}${name ? " · " + E(name) : ""}</span>
      <span style="opacity:.85">— ${E(said)}</span>
      <span style="opacity:.85">· ${E(through)}</span>
      ${lane}
      <span style="flex:1 1 auto"></span>
      ${chips}
    </div>
    <div style="margin-top:2px;opacity:.5;font-size:11px">Phase Lock's gate over the Codex — the phases are the Codex's own build data, the mod's ledger stays the mod's.</div>
  </div>`;
}

export function render(state) {
  const s = Object.assign(
    { view: "folder", list: [], sort: { mode: "default", dir: "asc" }, selected: null, menu: false },
    state || {}
  );
  // READ-ONLY, asked ONCE: the book is pinned locked, or the seat cannot write this shelf. Same treatment either way.
  s.locked = PIN.isLocked(s.bookId || "") || s.canWrite === false;
  const err = ERR.line(s.error, "search", "sb-err");
  const hunting = isSearching(s);
  const body = hunting
    ? resultsView(s)
    : s.view === "page"
      ? pageView(s)
      : s.view === "stack"
        ? stackView(s)
        : grid(s);
  const switching = s.folderLoading ? `<div class="sb-modal-veil sb-folder-veil"><div class="sb-spin"></div></div>` : "";
  const exporting = s.exportDoc ? CARDEX.overlay(s.exportDoc, act("exportCardClose")) : "";
  // HIS CALL: the rail rides the LEFT edge of the pane.
  const railKey = `${s.view}-${(s.list || []).length}-${(s.folders || []).length}-${(s.stack || []).length}`;
  return `${styles()}${phaseStrip(s)}${hunting ? resultsHead(s) : editorBar(s)}${err}<div class="sb-scrollwrap">${rail(railKey)}<div class="sb-scroll" id="sb-center-scroll"
    style="scroll-behavior:${PREFS.scrollCss(s)}" data-scroll-behavior="${E(PREFS.scrollBehavior(s))}"
    >${body}</div></div>${modal(s)}${switching}${exporting}`;
}

module.exports = {
  render,
  MENUS,
  EDITOR_BAR,
  OPS,
  GESTURE,
  SORTS,
  STACK_MAX_LAYERS,
  CARD_GRID,
  cardGridName,
  gridVars,
  sortTiles,
  wrapMove,
  address,
  stackOffsets,
  folderWord,
  folderDefaultName,
  holdsText,
  shootSection,
  shootRelay,
  cueRows,
  cueSummary,
  // The designation vocabulary — lib/ui-meta.js draws the metadata pane's switch from it
  // (fragment-family law: shared helpers live in one module and are re-imported).
  DOCS,
  docRow,
};
