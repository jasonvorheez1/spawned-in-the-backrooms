const ROLL_EDITOR_UI=require("lib/ui-roll-editor.js");
const PIANO_SCORE=require("lib/pianoroll.js");
const SCORE_NOTATION=require("lib/score-notation.js");
// Page Edit view — the raised page, its two attached rulers, the three editable zones, the faded neighbour edges.

const REFS = require("lib/refs.js");
const THEME = require("lib/data/ui-theme.yml");
const ERR = require("lib/ui-err.js");
const PL = require("lib/pagelayout.js");
const PREFS = require("lib/ui-prefs.js");
const PASTE = require("lib/paste.js");
const REFPICK = require("lib/refpick.js");
const PAGESAVE = require("lib/pagesave.js");
const PIN = require("lib/pinned.js");
const CARDEX = require("lib/ui-cardexport.js");
const CARDSUI = require("lib/ui-cards.js");

export function E(s) {
  return REFS.escapeText(s === undefined || s === null ? "" : String(s));
}

// Text that lands inside a JS string inside an HTML attribute.
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

// The editor bar, his ten items, in his order and his words.
const EDITOR_BAR = [
  "New Page",
  "Delete Page",
  "Insert Tag",
  "Insert Reference",
  "Move Page Left",
  "Move Page Right",
  "Duplicate Page",
  "Duplicate Page to New Card",
  "Export Page",
  "Export Card",
];

const OPS = {
  "New Page": "pageNew",
  "Delete Page": "pageDeleteAsk",
  "Insert Tag": "insertTag",
  "Insert Reference": "insertRef",
  "Move Page Left": "pageMoveLeft",
  "Move Page Right": "pageMoveRight",
  "Duplicate Page": "pageDup",
  "Duplicate Page to New Card": "pageDupCard",
  "Export Page": "pageExport",
  "Export Card": "cardExport",
};

const HINTS = {
  "New Page": "Create a new page after this one",
  "Delete Page": "Delete the current page (with confirmation)",
  "Insert Tag": "Open #[…] tag insertion popup",
  "Insert Reference": "Open #[…] reference insertion popup",
  "Move Page Left": "Swap current page with the preceding page",
  "Move Page Right": "Swap current page with the following page",
  "Duplicate Page": "Duplicate this page into this card",
  "Duplicate Page to New Card": "Duplicate current page into a new card",
  "Export Page": "Quick single-page export for sharing or preview",
  "Export Card": "Quick full-card export for sharing or preview",
};

const MD_TOOLS = [
  { id: "bold", label: "B", title: "Bold", wrap: "**", cls: "b" },
  { id: "italic", label: "I", title: "Italic", wrap: "*", cls: "i" },
  { id: "code", label: "‹›", title: "Inline code", wrap: "`", cls: "c" },
  { id: "sep1", sep: true },
  { id: "h1", label: "H1", title: "Heading 1", prefix: "# " },
  { id: "h2", label: "H2", title: "Heading 2", prefix: "## " },
  { id: "h3", label: "H3", title: "Heading 3", prefix: "### " },
  { id: "sep2", sep: true },
  { id: "ul", label: "•—", title: "Bullet list", prefix: "- " },
  { id: "ol", label: "1—", title: "Numbered list", prefix: "1. " },
  { id: "quote", label: "❝", title: "Quote", prefix: "> " },
  { id: "codeblock", label: "```", title: "Code block", block: "```" },
];

// The tag insertion popup. His kept tag types (doc 12): COUNT, TOTAL, text replacement, DATETIME.
const TAG_ITEMS = [
  {
    label: "COUNT",
    hint: "numbers each place this key appears, in order down the page",
    insert: "#[COUNT:name]",
    example: "#[COUNT:scene] → 1, then 2, then 3",
  },
  {
    label: "TOTAL",
    hint: "how many of that key the same text holds — the same number wherever it sits",
    insert: "#[TOTAL:name]",
    example: "#[TOTAL:scene] → 3, on a page holding three #[COUNT:scene]",
  },
  {
    label: "DATETIME",
    hint: "a date stamp; the trailing * says it resolved when the page was drawn",
    insert: "#[DATETIME:YYYY-MM-DD HH:mm]",
    example: "#[DATETIME:YYYY-MM-DD HH:mm] → 2026-08-13 04:41*",
  },
  {
    label: "#[cam: ...]",
    hint: "a camera directive: size/angle on <cardId> | 3s | blend",
    insert: "#[cam: medium on ]",
    example: "#[cam: wide on mt9qf5lscdpv5 | 3s | blend]",
  },
  {
    label: "Text replacement",
    hint: "a tag you define yourself, under Edit ▸ Preferences… ▸ Tags",
    insert: "#[NAME:value]",
    example: "#[HOUSE] → whatever you set HOUSE to mean",
  },
];

// The adjacent-edge width. "Faded right edge (~1 inch wide)" — an inch is 96 CSS px by definition.
const EDGE_PX = PL.PX_PER_IN;

const SWIPE = { px: 60, ms: 600, ratio: 1.6 };

const SHELLS = ["full", "notepad"];

export function shellOf(state) {
  const s = state && typeof state === "object" ? state : {};
  const v = String(s.shell === undefined || s.shell === null ? "" : s.shell);
  return SHELLS.indexOf(v) >= 0 ? v : "full";
}

// On-screen paper zoom (user pref, rides in via state.prefs). Presentation ONLY: geo/ticks/fit all stay in the 96dpi model's px and the CSS `zoom` on the frame scales the drawn paper — so a calibrated screen shows A4 at true A4. Same rails as config.js's clampUser.
export function paperZoomOf(state) {
  const s = state && typeof state === "object" ? state : {};
  const bag = s.prefs && typeof s.prefs === "object" ? s.prefs : {};
  const n = Number(bag.paperZoom);
  if (!isFinite(n) || n <= 0) return 1;
  return Math.max(0.5, Math.min(3, Math.round(n * 100) / 100));
}

const NP = {
  fontPx: 12,
  deskFontPx: 13.5,
  measureCh: 60, // his measure: 58–62 characters
  chEm: 0.5,
  maxColPx: Math.max(
    240,
    Math.round(
      (((THEME.layout || {}).notepad || {}).w || 460) - (((THEME.layout || {}).notepad || {}).rail || 48) - 40
    )
  ),
  marginRatio: 0.36,
  marginMin: 12,
  marginMax: 40,
  edgePx: 34,
};

export function clampPx(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function smallGeo(geo) {
  const v = NP.fontPx / NP.deskFontPx;
  const colDesk = Math.max(PL.MIN_BODY_PX, geo.pageW - geo.marginL - geo.marginR);
  const column = Math.round(Math.min(NP.measureCh * NP.chEm * NP.fontPx, NP.maxColPx, colDesk));
  const marginL = Math.round(clampPx(geo.marginL * NP.marginRatio, NP.marginMin, NP.marginMax));
  const marginR = Math.round(clampPx(geo.marginR * NP.marginRatio, NP.marginMin, NP.marginMax));
  return {
    column,
    marginL,
    marginR,
    pageW: column + marginL + marginR,
    pageH: Math.max(PL.MIN_BODY_PX, Math.round(geo.pageH * v)),
    headerH: Math.round(geo.headerH * v),
    footerH: Math.round(geo.footerH * v),
    leading: Math.round(geo.leading * v * 100) / 100,
  };
}

export function lineIndex(src) {
  const lines = [];
  let pos = 0;
  const raw = String(src).split("\n");
  for (let i = 0; i < raw.length; i++) {
    lines.push({ text: raw[i], start: pos, end: pos + raw[i].length });
    pos += raw[i].length + 1;
  }
  return lines;
}

export function mdBlocks(src) {
  const text = String(src === undefined || src === null ? "" : src);
  const lines = lineIndex(text);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const L = lines[i];
    const t = L.text.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.indexOf("```") === 0) {
      const body = [];
      i++;
      while (i < lines.length && lines[i].text.trim().indexOf("```") !== 0) {
        body.push(lines[i].text);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "code", lang: t.slice(3).trim(), code: body.join("\n") });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      blocks.push({ kind: "hr", parts: [] });
      i++;
      continue;
    }
    const h = /^(#{1,6})\s+/.exec(L.text);
    if (h) {
      blocks.push({ kind: "heading", level: h[1].length, parts: [{ start: L.start + h[0].length, end: L.end }] });
      i++;
      continue;
    }
    const bullet = /^\s*[-*+]\s+/;
    const number = /^\s*\d+[.)]\s+/;
    const quote = /^\s*>\s?/;
    if (bullet.test(L.text) || number.test(L.text)) {
      const ordered = number.test(L.text) && !bullet.test(L.text);
      const parts = [];
      while (i < lines.length && (bullet.test(lines[i].text) || number.test(lines[i].text))) {
        const m = (ordered ? number : bullet).exec(lines[i].text);
        const off = m ? m[0].length : 0;
        parts.push({ start: lines[i].start + off, end: lines[i].end });
        i++;
      }
      blocks.push({ kind: ordered ? "ol" : "ul", parts });
      continue;
    }
    if (quote.test(L.text)) {
      const parts = [];
      while (i < lines.length && quote.test(lines[i].text)) {
        const m = quote.exec(lines[i].text);
        parts.push({ start: lines[i].start + (m ? m[0].length : 0), end: lines[i].end });
        i++;
      }
      blocks.push({ kind: "quote", parts });
      continue;
    }
    const start = L.start;
    let end = L.end;
    i++;
    while (i < lines.length) {
      const N = lines[i];
      if (!N.text.trim()) break;
      if (/^(#{1,6})\s+/.test(N.text) || bullet.test(N.text) || number.test(N.text) || quote.test(N.text)) break;
      if (N.text.trim().indexOf("```") === 0) break;
      end = N.end;
      i++;
    }
    blocks.push({ kind: "p", parts: [{ start, end }] });
  }
  return blocks;
}

const SENT = "\u0001";

const TICK = "(?:`|&#96;)";
const CODE_SPAN = new RegExp(TICK + "((?:(?!" + TICK + ")[^\\n])+)" + TICK, "g");

export function restoreHeld(s, spans) {
  let out = String(s);
  const re = new RegExp(SENT + "c(\\d+)" + SENT, "g");
  for (let i = 0; i < 4 && out.indexOf(SENT) >= 0; i++) {
    re.lastIndex = 0;
    out = out.replace(re, (m, k) => spans[Number(k)] || "");
  }
  return out;
}

export function inlineEmphasis(escaped) {
  const spans = [];
  const hold = (html) => {
    spans.push(html);
    return SENT + "c" + (spans.length - 1) + SENT;
  };
  let s = String(escaped).replace(CODE_SPAN, (m, inner) => hold('<code class="sbp-code">' + inner + "</code>"));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\][\n]*)\]\(([^()\s]*)\)/g, (m, label, url) =>
    hold('<span class="sbp-link" title="' + url + '">' + label + "</span>")
  );
  return restoreHeld(s, spans);
}

export function partHtml(src, segments, start, end) {
  const refs = [];
  let combined = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.end <= start || seg.start >= end) continue;
    if (seg.kind === "text") {
      const from = Math.max(seg.start, start);
      const to = Math.min(seg.end, end);
      combined += REFS.escapeText(src.slice(from, to)).replace(/\n/g, "<br>");
    } else if (seg.start >= start && seg.end <= end) {
      refs.push(seg.html);
      combined += SENT + "r" + (refs.length - 1) + SENT;
    } else {
      const from = Math.max(seg.start, start);
      const to = Math.min(seg.end, end);
      combined += REFS.escapeText(src.slice(from, to)).replace(/\n/g, "<br>");
    }
  }
  const out = inlineEmphasis(combined);
  return out.replace(new RegExp(SENT + "r(\\d+)" + SENT, "g"), (m, k) => refs[Number(k)] || "");
}

export function mdRender(src, segments) {
  const text = String(src === undefined || src === null ? "" : src);
  const segs = segments || [];
  const blocks = mdBlocks(text);
  const out = [];
  for (const b of blocks) {
    if (b.kind === "code") {
      out.push('<pre class="sbp-pre"><code>' + REFS.escapeText(b.code) + "</code></pre>");
      continue;
    }
    if (b.kind === "hr") {
      out.push('<hr class="sbp-hr" />');
      continue;
    }
    const parts = b.parts.map((r) => partHtml(text, segs, r.start, r.end));
    if (b.kind === "heading") out.push("<h" + b.level + ' class="sbp-h">' + parts[0] + "</h" + b.level + ">");
    else if (b.kind === "ul") out.push('<ul class="sbp-list">' + parts.map((p) => "<li>" + p + "</li>").join("") + "</ul>");
    else if (b.kind === "ol") out.push('<ol class="sbp-list">' + parts.map((p) => "<li>" + p + "</li>").join("") + "</ol>");
    else if (b.kind === "quote") out.push('<blockquote class="sbp-quote">' + parts.map((p) => "<p>" + p + "</p>").join("") + "</blockquote>");
    else out.push('<p class="sbp-p">' + parts[0] + "</p>");
  }
  return out.join("");
}

export function chromeRender(src, segments) {
  const text = String(src === undefined || src === null ? "" : src);
  if (!text) return "";
  const segs = segments || [];
  const lines = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text.charAt(i) === "\n") {
      let end = i;
      if (end > start && text.charAt(end - 1) === "\r") end -= 1;
      // his ruling: a heading is a heading wherever he writes it.
      const h = /^(#{1,6})[ \t]+/.exec(text.slice(start, end));
      if (h) {
        lines.push(
          '<span class="sbp-ch h' + h[1].length + '">' + partHtml(text, segs, start + h[0].length, end) + "</span>"
        );
      } else {
        lines.push(partHtml(text, segs, start, end));
      }
      start = i + 1;
    }
  }
  return lines.join("<br>");
}

export function liveSegments(src, names) {
  const text = String(src === undefined || src === null ? "" : src);
  const map = names && typeof names === "object" ? names : null;
  const re = new RegExp(REFS.TOKEN_SOURCE, "g");
  const segs = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ kind: "text", start: last, end: m.index });
    const tok = String(m[1] || "");
    const known = map ? map[tok.trim()] : "";
    segs.push({
      kind: "ref",
      start: m.index,
      end: m.index + m[0].length,
      html:
        '<span class="sb-ref sbp-ref-live" title="' +
        (known ? "unsaved — this reference is already pointing at a card" : "resolves when this page is saved") +
        '">' +
        E(known || tok) +
        "</span>",
    });
    last = m.index + m[0].length;
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (last < text.length) segs.push({ kind: "text", start: last, end: text.length });
  return segs;
}

export function livePage(kind, src, names) {
  const text = String(src === undefined || src === null ? "" : src);
  if (!text.trim()) return '<span class="sbp-ph">' + E(emptyHint(kind)) + "</span>";
  const segs = liveSegments(text, names);
  return kind === "body" ? mdRender(text, segs) : chromeRender(text, segs);
}

export function emptyHint(kind) {
  return kind === "body" ? "click to write…" : kind === "header" ? "header" : "footer";
}

const LV = "\u0002";

export function lvRestore(s, store) {
  let out = String(s);
  const re = new RegExp(LV + "(\\d+)" + LV, "g");
  for (let i = 0; i < 4 && out.indexOf(LV) >= 0; i++) {
    re.lastIndex = 0;
    out = out.replace(re, (m, k) => store[Number(k)] || "");
  }
  return out;
}

export function lvInline(esc, store) {
  const hold = (html) => {
    store.push(html);
    return LV + (store.length - 1) + LV;
  };
  let s = String(esc);
  s = s.replace(new RegExp(REFS.TOKEN_SOURCE, "g"), (m) => hold('<span class="lv-ref">' + m + "</span>"));
  s = s.replace(CODE_SPAN, (m) => hold('<span class="lv-code">' + m + "</span>"));
  s = s.replace(/(\[)([^\][\n]*)(\]\()([^()\s]*)(\))/g, (m, a, label, b, url, c) =>
    hold('<span class="lv-mk">' + a + '</span><span class="lv-link">' + label + '</span><span class="lv-mk">' + b + url + c + "</span>")
  );
  s = s.replace(/(\*\*)([^*\n]+)(\*\*)/g, (m, a, inner, b) =>
    hold('<span class="lv-mk">' + a + '</span><span class="lv-b">' + inner + '</span><span class="lv-mk">' + b + "</span>")
  );
  s = s.replace(/(^|[^*\w])(\*)([^*\n]+)(\*)/g, (m, pre, a, inner, b) =>
    pre + hold('<span class="lv-mk">' + a + '</span><span class="lv-i">' + inner + '</span><span class="lv-mk">' + b + "</span>")
  );
  return s;
}

export function lvLine(kind, line, state) {
  const store = [];
  const done = (html) => lvRestore(html, store);
  const raw = String(line);
  if (state.fence) {
    if (raw.trim().indexOf("```") === 0) state.fence = false;
    return '<span class="lv-fence">' + E(raw) + "</span>";
  }
  if (kind === "body" && raw.trim().indexOf("```") === 0) {
    state.fence = true;
    return '<span class="lv-fence lv-mk">' + E(raw) + "</span>";
  }
  if (kind !== "body") return done(lvInline(E(raw), store));
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(raw.trim()) && raw.trim().length >= 3) {
    return '<span class="lv-hr">' + E(raw) + "</span>";
  }
  let m = /^(#{1,6}\s+)([\s\S]*)$/.exec(raw);
  if (m) {
    return (
      '<span class="lv-h"><span class="lv-mk">' + E(m[1]) + "</span>" + done(lvInline(E(m[2]), store)) + "</span>"
    );
  }
  m = /^(\s*>\s?)([\s\S]*)$/.exec(raw);
  if (m) {
    return '<span class="lv-q"><span class="lv-mk">' + E(m[1]) + "</span>" + done(lvInline(E(m[2]), store)) + "</span>";
  }
  m = /^(\s*(?:[-*+]|\d+[.)])\s+)([\s\S]*)$/.exec(raw);
  if (m) {
    return '<span class="lv-mk">' + E(m[1]) + "</span>" + done(lvInline(E(m[2]), store));
  }
  return done(lvInline(E(raw), store));
}

export function liveOverlay(kind, src) {
  const text = String(src === undefined || src === null ? "" : src);
  if (!text) return "";
  const state = { fence: false };
  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) out.push(lvLine(kind, lines[i], state));
  return out.join("\n") + (text.charAt(text.length - 1) === "\n" ? "\u200b" : "");
}

const PAPER_FALLBACK = {
  surface: "oklch(0.925 0.024 84)",
  surfaceHi: "oklch(0.962 0.018 88)",
  surfaceLo: "oklch(0.878 0.030 78)",
  edge: "oklch(0.80 0.032 74)",
  ink: "oklch(0.30 0.022 62)",
  inkDim: "oklch(0.55 0.020 70)",
  rule: "oklch(0.74 0.030 72)",
  ruler: "oklch(0.895 0.024 82)",
  rulerInk: "oklch(0.42 0.024 62)",
  handle: "oklch(0.55 0.150 42)",
  shadow: "oklch(0.14 0.012 60 / 0.50)",
  grain: "oklch(0.45 0.050 68 / 0.035)",
};

export function paperVars(paper) {
  const p = Object.assign({}, PAPER_FALLBACK, paper || {});
  return [
    "--paper:" + p.surface,
    "--paper-hi:" + p.surfaceHi,
    "--paper-lo:" + p.surfaceLo,
    "--paper-edge:" + p.edge,
    "--paper-ink:" + p.ink,
    "--paper-ink-dim:" + p.inkDim,
    "--paper-rule:" + p.rule,
    "--ruler-bg:" + p.ruler,
    "--ruler-ink:" + p.rulerInk,
    "--handle:" + p.handle,
    "--paper-shadow:" + p.shadow,
    "--paper-grain:" + p.grain,
  ].join(";");
}

const PEN_DEAD = {
  "New Page": 1,
  "Delete Page": 1,
  "Insert Tag": 1,
  "Insert Reference": 1,
  "Move Page Left": 1,
  "Move Page Right": 1,
  "Duplicate Page": 1,
  "Duplicate Page to New Card": 1,
};

export function editorBar(s, small) {
  const has = !!s.pageId;
  const many = (s.count || 0) > 1;
  const locked = penHolds(s);
  const ro = !!s.readOnly;
  const enabled = {
    "New Page": true,
    "Delete Page": has,
    "Insert Tag": has,
    "Insert Reference": has,
    "Move Page Left": has && many && (s.index || 0) > 0,
    "Move Page Right": has && many && (s.index || 0) < (s.count || 1) - 1,
    "Duplicate Page": has,
    "Duplicate Page to New Card": has,
    "Export Page": has,
    "Export Card": true,
  };
  const assetLink=!ro&&!s.pianoRoll&&has?`<button class="sb-btn" data-interactive title="Asset Library references" onpointerdown="event.preventDefault()" onclick="openEditorLibrary('source')">Asset Library</button>`:"";
  const buttons = assetLink + EDITOR_BAR.filter((label) => (!(["CODEX0000BOOK","WWSCODE0BOOK"].includes(s.bookId) && label.startsWith("Export"))) && (!ro || !PEN_DEAD[label]) && (!s.pianoRoll || !["Insert Tag","Insert Reference"].includes(label))).map((label) => {
    const on = enabled[label] !== false && !(locked && PEN_DEAD[label]);
    return `<button class="sb-btn${on ? "" : " off"}${label === "Delete Page" ? " danger" : ""}" data-interactive
      title="${E(HINTS[label] || label)}"${on ? "" : " disabled"}
      onclick="event.stopPropagation();${act(OPS[label] || "noop")}">${E(label)}</button>`;
  }).join("");

  const confirm = s.confirmDelete
    ? `<div class="sbp-confirm" id="sb-page-confirm">
        <span>Delete page ${E(String((s.index || 0) + 1))} of ${E(String(s.count || 1))}? This cannot be undone from here.</span>
        <button class="sb-btn danger" data-interactive onclick="event.stopPropagation();${act("pageDelete")}">Delete Page</button>
        <button class="sb-btn" data-interactive onclick="event.stopPropagation();${act("pageDeleteCancel")}">Cancel</button>
      </div>`
    : "";

  // his ask: the breadcrumbs at the top are clickable for fast navigation.
  const refs=Array.isArray(s.referenceTrail)?s.referenceTrail:[],anchor=refs[0]||s;
  const backTitle=refs.length?"Back to "+refs[refs.length-1].cardName:"Back to the folder";
  const crumbs = [
    `<button class="sbp-crumb" data-interactive title="Open ${E(anchor.bookName || "this book")}"
      onclick="event.stopPropagation();sendAction('bookSelect', { id: '${Q(anchor.bookId || "")}' })">${E(
        anchor.bookName || "Book"
      )}</button>`,
  ];
  trailOf(anchor).forEach((seg) => {
    crumbs.push(`<span class="sep">›</span>`);
    crumbs.push(
      seg.id
        ? `<button class="sbp-crumb" data-interactive title="Open ${E(seg.name || "this folder")}"
            onclick="event.stopPropagation();${act("folderOpen", "id: '" + Q(seg.id) + "', bookId: '" + Q(anchor.bookId || "") + "'")}">${E(
              seg.name
            )}</button>`
        : `<span class="sbp-crumb flat">${E(seg.name)}</span>`
    );
  });
  if(refs.length)crumbs.push(`<span class="sep">›</span>`+referenceCrumbs(refs));
  crumbs.push(`<span class="sep">›</span>`);
  crumbs.push(`<span class="sbp-crumb cur sbp-cardname" title="the page you are writing">${E(s.cardName || "")}</span>`);

  // His save model: nothing on this page reaches the book until this button (or Ctrl+S) is pressed.
  const piano = require("lib/editor-select.js").render(s,"source","ww-editor-choice",ro||locked);
  const save = ro
    ? `<span class="sbp-count">read-only — this book is written for you</span>`
    : `<button class="sb-btn sbp-save" id="sb-page-save" data-interactive
    title="Save this page — Ctrl+S" onclick="event.stopPropagation();if(window.__WWROLL&&window.__WWROLL.active())window.__WWROLL.action('save',{});else if(window.__SBSAVE)window.__SBSAVE.save();">Save</button>`;

  if (small) {
    return `<div class="doc-head sbp-bar np" id="sb-page-bar">
      <div class="crumb">
        <button class="sb-btn ghost" data-interactive title="${E(backTitle)}" onclick="${act("backToFolder")}">‹ Back</button>
        ${refs.length?referenceCrumbs(refs)+`<span class="sep">›</span>`:''}
        <span class="sbp-crumb cur sbp-cardname" title="the page you are writing">${E(s.cardName || "")}</span>
        <span class="sbp-count">${E(String((s.index || 0) + 1))} / ${E(String(s.count || 0))}</span>
        <span class="sbp-unsaved">*&nbsp;unsaved</span>
      </div>
      <div class="sbp-bar-acts">${save}${piano}${shootActs(s, true)}</div>
      ${shootBlurb(s, true)}
      ${confirm}
    </div>`;
  }

  return `<div class="doc-head sbp-bar" id="sb-page-bar">
    <div class="crumb">
      <button class="sb-btn ghost" data-interactive title="${E(backTitle)}" onclick="${act("backToFolder")}">‹ Back</button>
      ${crumbs.join("")}
      <span class="sbp-count">page ${E(String((s.index || 0) + 1))} / ${E(String(s.count || 0))}</span>
      <!-- One quiet marker for the whole page, ALWAYS in the DOM (visibility, not display) so the
           crumb row never jumps. It is NOT lit from s.dirty — that flag is only "a write is in the
           air". The realm's paintSave (ui.js) owns .on, from the boxes measured against the book. -->
      <span class="sbp-unsaved">*&nbsp;unsaved</span>
    </div>
    <div class="sbp-bar-acts">${save}${piano}${ro || s.pianoRoll ? "" : sizeControl(s)}${buttons}${shootActs(s, false)}</div>
    ${shootBlurb(s, false)}
    ${confirm}
  </div>`;
}

export function mmText(v) {
  const n = Number(v);
  if (!isFinite(n)) return "?";
  return String(Math.round(n * 100) / 100);
}

export function sizeControl(s) {
  const locked = penHolds(s);
  const spec = s.spec || PL.DEFAULT_SPEC;
  const mm = PL.convert(spec, "mm");
  const hit = PL.matchFormat(spec);
  const land = isFinite(mm.width) && isFinite(mm.height) ? mm.width > mm.height : false;
  const caps = PL.zoneCapacity(spec);
  let group = "";
  const rows = PL.FORMATS.map((f) => {
    const head = f.group === group ? "" : `<div class="sbp-size-grp">${E(f.group)}</div>`;
    group = f.group;
    const on = !!(hit && hit.format.id === f.id);
    return `${head}<button class="sb-mi sbp-size-mi${on ? " on" : ""}" data-interactive
      title="Set this book's pages to ${E(f.name)}"
      onclick="event.stopPropagation();${act("pageFormat", "id: '" + Q(f.id) + "'")}"><span
      class="sbp-size-name">${E(f.name)}</span><span class="sbp-size-dim">${E(mmText(f.w))} × ${E(mmText(f.h))} mm</span></button>`;
  }).join("");
  // On-screen size — his ask (2026-09-01): pages at their actual physical size. The screen can't know its own inches, so the author calibrates once: nudge until the page ruler agrees with a real one. cfgSet doesn't touch sizeMenu, so the drop stays open while he nudges.
  const pz = paperZoomOf(s);
  const pct = Math.round(pz * 100);
  const dn = Math.max(0.5, Math.round((pz - 0.05) * 100) / 100);
  const up = Math.min(3, Math.round((pz + 0.05) * 100) / 100);
  const zsend = (v) =>
    `event.stopPropagation();sendAction('cfgSet', { scope: 'user', key: 'paperZoom', type: 'number', value: ${v} })`;
  // The notepad sheet is pocket-sized on purpose — a zoom control there would nudge nothing.
  const zoomBlock = shellOf(s) === "notepad" ? "" : `<div class="sbp-size-grp">On-screen size (just for you)</div>
    <div class="sbp-zoom">
      <button class="sb-btn sbp-zbtn" data-interactive title="Draw the paper smaller"${pz <= 0.5 ? " disabled" : ""}
        onclick="${zsend(dn)}">−</button>
      <span class="sbp-zpct">${pct}%</span>
      <button class="sb-btn sbp-zbtn" data-interactive title="Draw the paper larger"${pz >= 3 ? " disabled" : ""}
        onclick="${zsend(up)}">＋</button>
      <button class="sb-btn sbp-zbtn wide" data-interactive title="Back to the screen's own 100%"${pct === 100 ? " disabled" : ""}
        onclick="${zsend(1)}">reset</button>
    </div>
    <div class="sbp-zoom-hint">for true-to-life pages: hold a real ruler to the page's ruler and nudge until they agree</div>`;
  return `<div class="sbp-sizewrap" data-sb-menu-scope>
    <button class="sb-btn sbp-size-btn" data-interactive
      title="Page size — this book's pages are ${E(mmText(mm.width))} × ${E(mmText(mm.height))} mm"
      ${locked ? "disabled" : ""}
      onclick="event.stopPropagation();${act("pageSizeMenu")}">Page size: ${E(
        hit ? hit.format.name : "Custom"
      )} <span class="sbp-caret">▾</span></button>
    <button class="sb-btn sbp-orient" data-interactive${locked ? " disabled" : ""}
      title="${land ? "Landscape — press for portrait" : "Portrait — press for landscape"}"
      onclick="event.stopPropagation();${act(
        "pageFormat",
        "w_mm: " + mmText(mm.width) + ", h_mm: " + mmText(mm.height) + ", orient: '" + (land ? "portrait" : "landscape") + "'"
      )}">${land ? "▭" : "▯"}</button>
    <span class="sbp-cap" title="what each band holds at this size — band height ÷ leading">${caps.header} · ${caps.body} · ${
      caps.footer
    } lines</span>
    ${s.sizeMenu && !locked ? `<div class="sb-drop sbp-sizedrop" id="sb-size-drop" data-sb-dismiss="sizeMenu">${zoomBlock}${rows}</div>` : ""}
  </div>`;
}

// The same clickable return chain serves paper and specialist editor headers.
export function referenceCrumbs(refs){return (refs||[]).map((r,i)=>`<button class="sbp-crumb" type="button" data-interactive data-reference-back="${i}" title="Back to ${E(r.cardName||'card')}" onclick="event.stopPropagation();${act('referenceBack', 'index: '+i)}">${E(r.cardName||'Untitled card')}</button>`).join('<span class="sep">›</span>');}
export function referenceBar(cards){
 const refs=cards?.view==='page'&&cards.referenceTrail;if(!refs?.length)return '';
 return `<nav class="ww-reference-bar" aria-label="Reference trail" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:none;padding:6px 10px;border-bottom:1px solid var(--sb-line,#464b4b)">${referenceCrumbs(refs)}<span class="sep">›</span><strong>${E(cards.pageDoc?.cardName||cards.card?.name||'Card')}</strong></nav>`;
}

export function trailOf(s) {
  const names = Array.isArray(s.folderPath) ? s.folderPath : [];
  const ids = Array.isArray(s.folderTrail) ? s.folderTrail : [];
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const raw = ids[i];
    const id = raw && typeof raw === "object" ? String(raw.id || "") : String(raw === undefined || raw === null ? "" : raw);
    const name = names[i] && typeof names[i] === "object" ? String(names[i].name || "") : String(names[i] || "");
    if (!name) continue;
    out.push({ name, id });
  }
  return out;
}

export function mdStrip(locked, small) {
  const tools = MD_TOOLS.map((t) => {
    if (t.sep) return `<span class="sbp-sep"></span>`;
    const attrs = [
      t.wrap ? `data-md-wrap="${E(t.wrap)}"` : "",
      t.prefix ? `data-md-prefix="${E(t.prefix)}"` : "",
      t.block ? `data-md-block="${E(t.block)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<button class="sbp-md${t.cls ? " " + t.cls : ""}" data-interactive data-md="${E(t.id)}" ${attrs}
      title="${E(t.title)}"${locked ? " disabled" : ""}>${E(t.label)}</button>`;
  }).join("");
  return `<div class="sbp-strip${small ? " np" : ""}" id="sb-md-strip">${tools}
    ${small ? "" : `<span class="sbp-strip-note">formatting applies to the zone you're editing</span>`}
  </div>`;
}

export function rulerH(ticks, geo, pz) {
  const majors = ticks.h
    .filter((t) => t.tier === "unit")
    .map(
      (t) =>
        `<i class="sbp-t" style="left:${t.px}px;height:${t.size}px"></i><b class="sbp-tl" style="left:${t.px}px">${E(
          String(t.value)
        )}</b>`
    )
    .join("");
  return `<div class="sbp-ruler h" id="sb-ruler-h" aria-hidden="true">
    <div class="sbp-minor h"></div>${majors}
    <div class="sbp-handle hm ml" data-ph="marginL" data-interactive title="Left margin — drag to move the left text boundary"><i></i></div>
    <div class="sbp-handle hm mr" data-ph="marginR" data-interactive title="Right margin — drag to move the right text boundary"><i></i></div>
    <span class="sbp-unit">${E(geo.unit)}${pz && pz !== 1 ? " · " + Math.round(pz * 100) + "%" : ""}</span>
  </div>`;
}

export function rulerV(ticks, showFooter = true) {
  const majors = ticks.v
    .filter((t) => t.tier === "unit")
    .map(
      (t) =>
        `<i class="sbp-t v" style="top:${t.px}px;width:${t.size}px"></i><b class="sbp-tl v" style="top:${t.px}px">${E(
          String(t.value)
        )}</b>`
    )
    .join("");
  return `<div class="sbp-ruler v" id="sb-ruler-v" aria-hidden="true">
    <div class="sbp-minor v"></div>${majors}
    <div class="sbp-handle vm hdr" data-ph="headerH" data-interactive title="Header boundary — drag to set the header height"><i>h</i></div>
    <div class="sbp-handle vm lead" data-ph="leading" data-interactive title="Line spacing — drag to set the leading"><i></i></div>
    ${showFooter?`<div class="sbp-handle vm ftr" data-ph="footerH" data-interactive title="Footer boundary — drag to set the footer height"><i>f</i></div>`:""}
  </div>`;
}

const WEIGHTS = [1, 2, 3, 4, 5, 6].map((n) => PL.LINE_WEIGHT["h" + n] || 1).join(",");

let SCORE_PAPER_TEXT=null,SCORE_PAPER_HTML="",SCORE_PAPER_RESULT=null;
export function scorePaper(text,options={}){
  const src=String(text||"");
  if(!require("lib/sound-document.js").isNative(src)||!options.sections)return null;
  const key=src+JSON.stringify(options);if(key===SCORE_PAPER_TEXT)return SCORE_PAPER_HTML;
  SCORE_PAPER_TEXT=key;SCORE_PAPER_RESULT=SCORE_NOTATION.render(src,{...options,windowed:true});SCORE_PAPER_HTML=SCORE_PAPER_RESULT.html;return SCORE_PAPER_HTML;
}

export function notationControls(s){
  if(s.literal)return "";
  if(!s.pageId||scorePaper(s.page.content,{spec:s.spec||PL.DEFAULT_SPEC,header:s.page.header,pageId:s.pageId,sections:s.sections})===null||SCORE_PAPER_RESULT.error)return "";
  const count=SCORE_PAPER_RESULT.sheets;
  return `<div class="sbp-notation-nav" aria-label="Turn printed score sheets"><button class="sb-btn" data-interactive data-notation-step="-1" disabled>‹ Sheet</button><span id="sb-notation-count">Score sheet 1 / ${count}</span><button class="sb-btn" data-interactive data-notation-step="1" ${count<2?"disabled":""}>Sheet ›</button><small>${SCORE_PAPER_RESULT.notes} notes · ${SCORE_PAPER_RESULT.rowsPerSheet} piano rows · ${count>1?"overflow continues on separate sheets":"fits one sheet"} · saved source unchanged</small><img hidden alt="" src="data:,notation-sheets-1" onerror="bootNotation()"></div>`;
}

export function zone(kind, s) {
  const locked = penHolds(s) || !!s.readOnly;
  const id = String(s.pageId || "");
  const book = kind === "body" ? s.page.content : kind === "header" ? s.page.header : s.page.footer;
  const raw = book;
  if(s.literal){
    // The normal page zone, without an editing overlay or a Markdown/score parser.
    // Existing snapshots can exceed paper height; scroll the zone without losing any text.
    return `<div class="sbp-zone ${kind} locked literal" id="sb-zone-${kind}" title="${E(kind)} — read-only">
      <div class="sbp-render" id="sb-render-${kind}" tabindex="0" aria-label="${E(kind)} text, read-only">${E(raw)}</div>
    </div>`;
  }
  const fit = PL.zoneFit(raw, s.spec || PL.DEFAULT_SPEC, kind);
  const scoreHtml=kind==="body"?scorePaper(raw,{spec:s.spec||PL.DEFAULT_SPEC,header:s.page.header,pageId:s.pageId,sections:s.sections}):null;
  const html = scoreHtml!==null?scoreHtml:kind === "body" ? s.bodyHtml : kind === "header" ? s.headerHtml : s.footerHtml;
  const empty = emptyHint(kind);
  const op = kind === "body" ? "pageContent" : kind === "header" ? "pageHeader" : "pageFooter";
  const shown = html || `<span class="sbp-ph">${E(empty)}</span>`;
  // his ruling: no asterisks on the page.
  return `<div class="sbp-zone ${kind}${scoreHtml!==null ? " notated" : ""}${locked ? " locked" : ""}" id="sb-zone-${kind}" title="${E(kind)} — ${E(
    fit.text
  )} lines at this page size">
    <div class="sbp-render" id="sb-render-${kind}">${shown}</div>${scoreHtml!==null&&!locked?`<button type="button" class="notation-source" data-interactive onclick="this.parentNode.querySelector('textarea').focus()">Edit source tags</button>`:""}
    <div class="sbp-live" id="sb-live-${kind}" aria-hidden="true" data-live-stamp="">${liveOverlay(kind, raw)}</div>
    <textarea class="sbp-raw" id="sb-raw-${kind}" data-interactive spellcheck="true"${locked ? " readonly" : ""}
      data-pen-locked="${locked ? 1 : 0}"
      data-page-field="${kind}" data-page-id="${E(id)}" data-card-id="${E(s.cardId || "")}" placeholder="${E(empty)}"
      data-fit="${E(raw)}"
      data-book="${E(book == null ? "" : book)}"
      data-cap="${fit.capacity}" data-plain="0" data-weights="${WEIGHTS}"
      onscroll="this.scrollTop=0"
      onpaste="${E(PASTE.handlerScript({ cardId: s.cardId, pageId: id, field: kind }))}"
      oninput="var t=this;if(t.scrollHeight>t.clientHeight+1||(window.__SBFIT&&!window.__SBFIT.ok(t))){var p=t.selectionStart;t.value=t.getAttribute('data-fit')||'';var q=p-1;if(q<0)q=0;if(q>t.value.length)q=t.value.length;t.selectionStart=t.selectionEnd=q;if(window.__SBFIT)window.__SBFIT.refused(t);}else{t.setAttribute('data-fit',t.value);if(window.__SBFIT)window.__SBFIT.clear(t);}t.scrollTop=0;if(window.__SBSAVE)window.__SBSAVE.touch(t);if(window.__SBRP)window.__SBRP.input(t);"
      onkeydown="if(window.__SBRP&&window.__SBRP.key(this,event)){event.preventDefault();return false;}"
      onkeyup="if(window.__SBRP)window.__SBRP.sync(this);"
      onclick="if(window.__SBRP)window.__SBRP.sync(this);"
      onfocus="if(window.__SBRP)window.__SBRP.focus(this);"
      onblur="if(window.__SBRP)window.__SBRP.blur(this);"
      data-page-op="${E(op)}">${E(raw)}</textarea>
  </div>`;
}

export function pageNav(s, geo) {
  const mode = PREFS.pageView(s);
  const pages = Array.isArray(s.pages) ? s.pages : [];
  if (mode === "page" || pages.length < 2) return "";
  const beh = PREFS.scrollCss(s);
  const ratio = geo && geo.pageW && geo.pageH ? geo.pageW + "/" + geo.pageH : "63/88";
  const items = pages
    .map((p, i) => {
      const id = String(p.id || "");
      const on = id && String(s.pageId || "") === id;
      const title = String(p.title || "");
      const reveal =
        "this.scrollIntoView({behavior:'" + beh + "',block:'nearest',inline:'center'});";
      return `<button class="sbp-navi${on ? " on" : ""}" data-interactive id="sb-navi-${E(id)}"
          data-page-nav="${E(id)}" title="Page ${E(String(i + 1))}${title ? " — " + E(title) : ""}"
          onclick="event.stopPropagation();${reveal}${act("pageGo", "id: '" + Q(id) + "'")}">
          <span class="sbp-navi-n">${E(String(i + 1))}</span>
          <span class="sbp-navi-t">${title ? E(title) : '<i class="sbp-navi-u">untitled</i>'}</span>
        </button>`;
    })
    .join("");
  return `<div class="sbp-nav ${E(mode)}" id="sb-page-nav" data-page-view="${E(mode)}"
    style="scroll-behavior:${beh};--navi-ratio:${E(ratio)}">${items}</div>`;
}

// his table, exactly — which faded edges each page shows.
export function edge(side, s) {
  const id = side === "left" ? s.prevId : s.nextId;
  if (!id) return "";
  const n = side === "left" ? (s.index || 0) : (s.index || 0) + 2;
  return `<button class="sbp-edge ${side}" data-interactive data-page-edge="${side}"
    title="${side === "left" ? "Previous page" : "Next page"} (page ${E(String(n))})"
    onclick="${act("pageGo", "id: '" + Q(id) + "'")}"><span>${E(String(n))}</span></button>`;
}

export function insertExample(it, kind) {
  if (String(kind || "") === "ref") {
    const ins = String(it.insert || "");
    const name = String(it.label || "");
    return ins && name ? ins + " → " + name : "";
  }
  return String(it.example || "");
}

const POP_SEAM = {
  tag: "a #[…] token resolves inside your prose — the pill tags in Edit Card are a different thing, they group cards",
  ref: "a reference points at the card's id, never its name, so renaming that card changes what this line reads",
};

export function insertPopup(s) {
  const ins = s.insert;
  if (!ins) return "";
  const kind = String(ins.kind || "tag");
  const items = (ins.items || []).length
    ? (ins.items || [])
        .map((it) => {
          const ex = insertExample(it, kind);
          return `<button class="sbp-ins-item" data-interactive data-insert="${E(it.insert)}"
              onclick="${act("insertClose")}">
              <span class="n">${E(it.label)}</span><span class="h">${E(it.hint || "")}</span>
              ${ex ? `<span class="x">${E(ex)}</span>` : ""}
            </button>`;
        })
        .join("")
    : `<div class="sbp-ins-empty">${E(
        kind === "ref" ? "no other cards in this folder to reference yet" : "no tags available"
      )}</div>`;
  return `<div class="sbp-pop" id="sb-insert-pop" data-sb-dismiss="insert" data-sb-menu-value="${E(kind)}">
    <div class="sbp-pop-head">
      <span>${E(kind === "ref" ? "Insert Reference" : "Insert Tag")}</span>
      <button class="sb-btn ghost" data-interactive onclick="${act("insertClose")}">✕</button>
    </div>
    <div class="sbp-pop-body">${items}</div>
    <div class="sbp-pop-foot">
      <div>inserts at the caret in the zone you were editing</div>
      <div class="seam">${E(POP_SEAM[kind] || POP_SEAM.tag)}</div>
    </div>
  </div>`;
}

// his ruling: preview / shoot / cut ride the editor bar's right end, the blurb bottom-right — no strip of their own.
export function shootPress(s, action, target) {
  const t = String(target || "");
  return `sendAction('${action}', { bookId: '${Q(s.bookId || "")}', cardId: '${Q(s.cardId || "")}'${
    t ? `, target: '${Q(t)}'` : ""
  } })`;
}

export function shootActs(s, small) {
  if(s.pianoRoll||s.readOnly)return "";
  const sh = s.shoot && typeof s.shoot === "object" ? s.shoot : {};
  const busy = !!sh.busy;
  const off = busy ? " disabled" : "";
  // THE TARGET PILL IS STRUCK (his ruling, 2026-09-01: "Cinema and film kit should not be chosen
  // between. They should work at the same time.") — one press runs every installed target.
  return `<span class="sbp-shoot-acts${small ? " np" : ""}" id="sb-shoot-acts">
    <button class="sb-btn" data-interactive${off} title="Compile this scene for every target without touching the room"
      onclick="event.stopPropagation();${shootPress(s, "shootPreview")}">Compile</button>
    <button class="sb-btn primary" data-interactive${off} title="Dress the set and roll — and write film-kit's shot list"
      onclick="event.stopPropagation();${shootPress(s, "shootGo")}">Shoot</button>
    <button class="sb-btn" data-interactive${off} title="Cut — clear every set piece this lane put in the room"
      onclick="event.stopPropagation();${shootPress(s, "shootStrike")}">Cut</button>
  </span>`;
}

export function shootBlurb(s, small) {
  if(s.pianoRoll||s.readOnly)return "";
  const sh = s.shoot && typeof s.shoot === "object" ? s.shoot : {};
  const dep = sh.dep && typeof sh.dep === "object" ? sh.dep : null;
  const busy = !!sh.busy;
  const errText = String(sh.error || "");
  const filmErrText = String(sh.filmError || "");
  const line = String(sh.line || "");
  const filmLineText = String(sh.filmLine || "");
  const shots = Number(sh.shots || 0);
  const verb = String(sh.verb || "");
  // One press feeds both lanes (his ruling): Cinema's half leads, film-kit's half sits beside it.
  const resultText = busy
    ? verb === "shoot"
      ? "shooting…"
      : "reading the set…"
    : errText
      ? "Cinema — " + errText
      : line || verb
        ? verb === "strike"
          ? line
          : "Cinema — " + (shots === 1 ? "1 shot" : shots + " shots") + (line ? " · " + line : "")
        : "not shot yet — Compile builds the shots for every target without touching the room";
  const resultCls = busy ? "dim" : errText ? "sbp-shoot-err" : line || verb ? "sbp-shoot-line" : "dim";
  const filmText =
    busy || verb === "strike"
      ? ""
      : filmErrText
        ? "film-kit — " + filmErrText
        : filmLineText
          ? "film-kit — " + filmLineText
          : "";
  const filmCls = filmErrText ? "sbp-shoot-err" : "sbp-shoot-line";
  // Verbatim, every one of them — the CSS is what shortens the sentence, never this function.
  const warnList = (Array.isArray(sh.warnings) ? sh.warnings : []).map((w) => String(w));
  const noticeText = dep && !dep.installed && dep.notice ? String(dep.notice) : "";
  const fdep = sh.filmDep && typeof sh.filmDep === "object" ? sh.filmDep : null;
  const fnoticeText = fdep && !fdep.installed && fdep.notice ? String(fdep.notice) : "";
  const creditText =
    String((dep && dep.credit) || "Playback by Absolute Cinema, a mod by ress.") +
    (fdep && fdep.credit ? " · " + String(fdep.credit) : "");
  // film-kit's status read, under the result: the file, what is already in it, how much is this
  // card's — so a re-shoot's replace count reads at a glance.
  const f = sh.file && typeof sh.file === "object" ? sh.file : null;
  const fileText = f
    ? String(f.path || "") +
      " — " +
      (f.exists ? (Number(f.shots) || 0) + " shot" + (Number(f.shots) === 1 ? "" : "s") + " in it" : "not written yet") +
      (Number(f.mine) ? ", " + Number(f.mine) + " from this card" : "")
    : "";
  const cue = CARDSUI.cueSummary(sh);
  const full = [resultText]
    .concat(filmText ? [filmText] : [])
    .concat(warnList)
    .concat(noticeText ? [noticeText] : [])
    .concat(fnoticeText ? [fnoticeText] : [])
    .concat(cue.full ? ["Cue schedule:\n" + cue.full] : [])
    .concat([creditText])
    .join("\n");
  const warnHtml = warnList
    .concat(noticeText ? [noticeText] : [])
    .concat(fnoticeText ? [fnoticeText] : [])
    .map((w) => `<span class="sbp-shoot-warn">${E(w)}</span>`)
    .join("");
  return `<div class="sbp-shoot-blurb${small ? " np" : ""}" id="sb-shoot-blurb" title="${E(full)}">
    <div class="ln"><span class="${resultCls}">${E(resultText)}</span>${
      filmText ? `<span class="${filmCls}">${E(filmText)}</span>` : ""
    }${warnHtml}</div>
    <div class="ln two">${fileText ? `<span class="sbp-shoot-cues">${E(fileText)}</span>` : ""}${
      cue.short ? `<span class="sbp-shoot-cues">${E(cue.short)}</span>` : ""
    }<span class="sbp-shoot-credit">${E(creditText)}</span></div>
    ${CARDSUI.shootRelay(sh)}
  </div>`;
}

export function refPickLane(s) {
  const cands = s.refCandidates && typeof s.refCandidates === "object" ? s.refCandidates : { tags: [], cards: [], assets: [], shots: [], atmos: [] };
  let json = "{}";
  try {
    json = JSON.stringify({ tags: cands.tags || [], cards: cands.cards || [], assets: cands.assets || [], shots: cands.shots || [], atmos: cands.atmos || [] });
  } catch (e) {
    json = "{}";
  }
  return `<img id="sb-refpick-boot" alt="" aria-hidden="true" src="data:,v${REFPICK.REALM_V}" style="display:none"
      onerror="${E(REFPICK.bootScript())}" />
    <div id="sb-refpick-data" style="display:none" aria-hidden="true"
      data-version="${E(String(cands.version || 0))}" data-cands="${E(json)}"></div>`;
}

export function saveLane(s) {
  // THE STASH NET's return path: shell state's pageStash rides these attributes into the realm, where a REBUILT __SBSAVE hands the words back to a clean box. Rendered only when the stash belongs to the page on screen — a stale stash for another page never reaches a box.
  let stashAttrs = "";
  const st = s.stash && typeof s.stash === "object" ? s.stash : null;
  if (st && String(st.pageId || "") && String(st.pageId) === String(s.pageId || "")) {
    let json = "";
    try {
      json = JSON.stringify(st.zones && typeof st.zones === "object" ? st.zones : {});
    } catch (e) {
      json = "";
    }
    if (json && json !== "{}") {
      stashAttrs = `
      data-stash-page="${E(String(st.pageId))}" data-stash-zones="${E(json)}"`;
    }
  }
  return `<img id="sb-pagesave-boot" alt="" aria-hidden="true" src="data:,v${PAGESAVE.REALM_V}" style="display:none"
      onerror="${E(PAGESAVE.bootScript())}" />
    <div id="sb-pagesave-data" style="display:none" aria-hidden="true"
      data-page-id="${E(String(s.pageId || ""))}" data-locked="${penHolds(s) ? "1" : "0"}"
      data-zones="${E(PAGESAVE.zonesJson())}"${stashAttrs}></div>`;
}

export function exportPanel(s) {
  const doc = s.exportDoc;
  if (!doc) return "";
  return CARDEX.panel(doc, act("exportClose")) + CARDEX.styles();
}

export function penState(s) {
  return s && s.pen && typeof s.pen === "object" ? s.pen : null;
}

export function penHolds(s) {
  const pen = penState(s);
  return !!(pen && pen.mine === false);
}

// THREE states, his ruling: mine, parked, or somebody else's.
export function penBanner(s) {
  const pen = penState(s);
  if (!pen) return "";

  if (pen.mine) {
    // his ask: the button rides beside the notice, not pushed to the far end.
    return `<div class="sbp-pen-bar mine" id="sb-pen-bar" title="you are the one writing this card">
      <span class="sbp-pen-dot" aria-hidden="true"></span>
      <span class="sbp-pen-line">You hold the pen</span>
      <button class="sbp-pen-btn quill" data-interactive aria-label="Set the pen down"
        title="Set the pen down — saves this page and leaves the pen for whoever picks it up next"
        onclick="event.stopPropagation();if(window.__SBSAVE&&window.__SBSAVE.dirty()){window.__SBSAVE.save({ name: 'cardAct', payload: { op: 'penDrop' } });}else{${act(
          "penDrop"
        )};}"><svg class="quill-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path
          d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line
          x1="17.5" y1="15" x2="9" y2="15"/></svg></button>
    </div>`;
  }

  if (pen.parked) {
    return `<div class="sbp-pen-bar parked" id="sb-pen-bar"
      title="nobody is writing this card — the pen is waiting for a hand">
      <span class="sbp-pen-dot down" aria-hidden="true"></span>
      <span class="sbp-pen-line">The pen is set down — all hands off until someone picks it up</span>
      <button class="sbp-pen-btn take" data-interactive title="Take the pen and write this card"
        onclick="event.stopPropagation();${act("penGrab")}">Pick up the pen</button>
    </div>`;
  }

  const name = String(pen.holderName || pen.holder || "").trim() || "someone";
  const take = pen.stale
    ? `<button class="sbp-pen-btn" data-interactive title="They have gone quiet — take the pen"
        onclick="event.stopPropagation();${act("penGrab")}">Pick up the pen</button>`
    : "";
  return `<div class="sbp-pen-bar" id="sb-pen-bar"
    title="one editor at a time, until multi-user editing lands">
    <span class="sbp-pen-dot" aria-hidden="true"></span>
    <span class="sbp-pen-line"><b>${E(name)}</b> holds the pen — read-only until they step out</span>
    ${take}
  </div>`;
}

export function render(state) {
  const s = Object.assign(
    {
      bookName: "",
      cardName: "",
      pages: [],
      page: null,
      pageId: "",
      index: 0,
      count: 0,
      prevId: "",
      nextId: "",
      bodyHtml: "",
      headerHtml: "",
      footerHtml: "",
      spec: null,
      paper: null,
      confirmDelete: false,
      insert: null,
      exportDoc: null,
      error: "",
      notice: "",
      pen: null,
    },
    state || {}
  );
  s.page = s.page || { id: "", title: "", content: "", header: "", footer: "" };
  // his ruling: one editor at a time — the window still draws for every other seat.
  const locked = penHolds(s);
  s.readOnly = PIN.isLocked(s.bookId || "");

  // Source cards use this same paper, navigation and read-only chrome as Codex.
  // Only the text treatment differs: source is literal, never Markdown or directives.
  s.literal = s.bookId === "WWSCODE0BOOK";
  if(s.literal) s.pianoRoll = false;
  if(s.pianoRoll&&s.pageId)return ROLL_EDITOR_UI.workspace(s);
  const spec = s.spec || PL.DEFAULT_SPEC;
  const geo = PL.toPx(spec);
  const frame = PL.rulerFrame(spec);
  const ticks = PL.rulerTicks(spec);
  const minor = ticks.tiers.indexOf("tenth") >= 0 ? (ticks.pxPerUnit * ticks.step) / 10 : ticks.pxPerUnit * ticks.step;

  const small = shellOf(s) === "notepad";
  const box = small ? smallGeo(geo) : geo;
  // The notepad is deliberately pocket-sized — true-size zoom is a desk-shell idea only.
  const pz = small ? 1 : paperZoomOf(s);

  const vars = [
    `--pz:${pz}`,
    `--pw:${box.pageW}px`,
    `--ph:${box.pageH}px`,
    `--rt:${small ? 0 : frame.thickness}px`,
    `--rink:${frame.metrics.ink}px`,
    `--ml:${box.marginL}px`,
    `--mr:${box.marginR}px`,
    `--hdr:${box.headerH}px`,
    `--ftr:${box.footerH}px`,
    `--lead:${box.leading}px`,
    `--minor:${Math.max(2, Math.round(minor * 100) / 100)}px`,
    `--edge:${small ? NP.edgePx : EDGE_PX}px`,
    `--sb-scroll-beh:${PREFS.scrollCss(s)}`,
    paperVars(s.paper),
  ].join(";");

  const err = ERR.line(s.error, "page", "sb-err");
  const note = s.notice ? `<div class="sbp-note-bar">${E(s.notice)}</div>` : "";
  const penBar = penBanner(s);
  const warn = geo.ok ? "" : `<div class="sb-err">${E(geo.error || "this page spec doesn't validate")}</div>`;

  const loading = !!s.loading;
  const body = s.pageId || loading
    ? `<div class="sbp-frame${small ? " np" : ""}${locked ? " pen-off" : ""}${s.readOnly ? " read-only" : ""}" id="sb-page-frame" style="${vars}"
        data-page-id="${E(s.pageId)}" data-unit="${E(geo.unit)}"
        data-page-w="${geo.pageW}" data-page-h="${geo.pageH}" data-min-body="${PL.MIN_BODY_PX}">
        <div class="sbp-corner" id="sb-ruler-corner" aria-hidden="true"></div>
        ${rulerH(ticks, geo, pz)}
        ${rulerV(ticks, PL.matchFormat(spec)?.format.id!=="piano-paper")}
        <div class="sbp-page" id="sb-page">
          <div class="sbp-guide l" aria-hidden="true"></div>
          <div class="sbp-guide r" aria-hidden="true"></div>
          <div class="sbp-guide t" aria-hidden="true"></div>
          <div class="sbp-guide b" aria-hidden="true"></div>
          ${zone("header", s)}
          ${zone("body", s)}
          ${geo.footerH>0?zone("footer", s):""}
        </div>
      </div>`
    : `<div class="sbp-nopage">
        <div>this card has no pages yet</div>
        <button class="sb-btn primary" data-interactive onclick="${act("pageNew")}">＋ New Page</button>
      </div>`;

  return `${styles()}
  ${penBar}
  ${editorBar(s, small)}
  ${s.readOnly ? "" : mdStrip(locked, small)}
  ${small ? "" : pageNav(s, geo)}
  ${notationControls(s)}
  ${err}${note}${warn}
  <div class="sbp-stage${small ? " np" : ""}" id="sb-page-stage" style="${vars}"
    data-swipe-px="${SWIPE.px}" data-swipe-ms="${SWIPE.ms}" data-swipe-ratio="${SWIPE.ratio}"
    data-prev="${E(s.prevId || "")}" data-next="${E(s.nextId || "")}">
    ${edge("left", s)}
    ${body}
    ${edge("right", s)}
    ${refPickLane(s)}
    ${saveLane(s)}
    ${insertPopup(s)}
    ${exportPanel(s)}
    ${loading ? `<div class="sb-modal-veil"><div class="sb-spin"></div></div>` : ""}
  </div>
`;
}

export function styles() {
  return `<style>
  .sbp-notation-nav{display:flex;align-items:center;gap:8px;padding:5px 12px;flex-wrap:wrap;flex:0 0 auto;background:var(--sb-panel);font-size:12px}.sbp-notation-nav small{opacity:.7}.notation-sheet[hidden]{display:none!important}
  /* THE HEADER RIDES ABOVE THE PAGE. Everything that hangs off this bar — the page-size menu, the
     delete confirmation — is absolutely positioned and drops DOWN over the stage, and the stage is
     a later sibling that paints over anything the bar's own subtree does not outrank. One explicit
     lift on the bar puts the whole header (and its popouts, which resolve inside it from here on)
     over the paper, the rulers and the zones, while staying inside the window's chrome: the
     leave-guard (90), the busy scrim and the block veil all still sit above it. */
  #sb-center .sbp-bar { flex-wrap: wrap; row-gap: 6px; position: relative; z-index: 50; }
  /* THE BUTTONS SIT AT THE FOOT (his, 2026-08-25: the chat and the wisp flames overlay the top of
     the panel and were covering the row). Flex order on #sb-center's column, never markup order —
     every id, handler, popout and morph target keeps the place the rest of the app looks for it. */
  #sb-center.doc-open > #sb-page-bar { order: 60; border-bottom: 0; border-top: 1px solid var(--line); }
  #sb-center.doc-open > #sb-md-strip { order: 61; border-bottom: 0; border-top: 1px solid var(--line); }
  /* THE SHOOT CONTROLS RIDE IN THE BAR NOW (his ruling, 2026-08-26) — the standalone strip that sat
     at order 62 is struck, and with it the 44px button row, the open cue box and the stacked
     warnings that were eating the bottom of his screen. Three chips at the bar's right end, on the
     house's editor-bar chrome (32px tall, 2px corners), right of Export Card. */
  #sb-center .sbp-shoot-acts { display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap;
    margin-left: 3px; padding-left: 8px; border-left: 1px solid var(--line); }
  #sb-app #sb-center .sbp-shoot-acts .sb-btn { height: 32px; min-height: 32px; padding: 0 11px; border-radius: 2px; }
  /* THE BLURB — its own row at the FOOT of the bar, right-aligned, two lines and never a third. The
     height is FIXED: busy ("shooting…"), an error, four warnings or none, the bar never changes
     height under his thumb. Long text truncates in CSS; the whole of it rides on the title. */
  #sb-center .sbp-shoot-blurb { flex: 1 1 100%; min-width: 0; display: flex; flex-direction: column;
    align-items: flex-end; justify-content: flex-end; text-align: right;
    height: 28px; overflow: hidden; line-height: 14px; }
  #sb-center .sbp-shoot-blurb .ln { max-width: 100%; min-width: 0; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; font-size: calc(10.5px * var(--sb-fs, 1)); }
  #sb-center .sbp-shoot-blurb .ln.two { font-size: calc(10px * var(--sb-fs, 1));
    color: color-mix(in oklch, var(--sb-ink-dim) 62%, var(--sb-line)); }
  #sb-center .sbp-shoot-blurb .sbp-shoot-line { font-weight: 600; }
  #sb-center .sbp-shoot-blurb .sbp-shoot-err { color: color-mix(in oklch, var(--sb-accent) 55%, var(--sb-ink)); }
  #sb-center .sbp-shoot-blurb .sbp-shoot-warn { margin-left: 7px; padding-left: 5px;
    border-left: 2px solid rgba(255,180,80,.7); opacity: .95; }
  #sb-center .sbp-shoot-blurb .sbp-shoot-cues { margin-right: 8px; }
  #sb-center .sbp-shoot-blurb .sbp-shoot-credit { white-space: nowrap; }
  /* what dropped DOWN out of a top bar opens UP out of a foot bar */
  #sb-center.doc-open > #sb-page-bar .sb-drop { top: auto; bottom: calc(100% + 4px); }
  #sb-center.doc-open > #sb-page-bar .sbp-confirm { top: auto; bottom: calc(100% - 2px); }
  #sb-center .sbp-bar .crumb { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
  #sb-center .sbp-cardname { font-weight: 600; }
  /* Page size: the app's own dropdown shape (the folder view's Sort: control), anchored right so a
     twelve-row menu opens inward instead of off the pane. */
  #sb-center .sbp-sizewrap { position: relative; display: flex; align-items: center; gap: 0; }
  #sb-center .sbp-sizewrap .sbp-size-btn { border-radius: 3px 0 0 3px; }
  #sb-center .sbp-sizewrap .sbp-orient { border-radius: 0 3px 3px 0; border-left: 0; width: 26px;
    justify-content: center; padding: 0; }
  #sb-center .sbp-caret { color: var(--ink-dim); font-size: calc(10px * var(--sb-fs, 1)); }
  #sb-center .sbp-cap { margin-left: 7px; font-size: calc(10.5px * var(--sb-fs, 1)); white-space: nowrap;
    color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-line)); }
  #sb-center .sbp-sizedrop { position: absolute; top: calc(100% + 4px); left: auto; right: 0; min-width: 208px;
    max-height: 52vh; overflow-y: auto; z-index: 45; background: var(--panel-2); border: 1px solid var(--line);
    padding: 3px 0; box-shadow: 0 12px 28px color-mix(in oklch, var(--sb-shadow) 55%, transparent); }
  #sb-center .sbp-size-grp { padding: 5px 11px 2px; font-size: calc(10px * var(--sb-fs, 1)); letter-spacing: 0.06em;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); }
  #sb-center .sbp-size-mi { display: flex; width: 100%; gap: 10px; justify-content: space-between; align-items: baseline;
    padding: 6px 11px; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); cursor: pointer; white-space: nowrap;
    background: transparent; border: 0; text-align: left; color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); }
  #sb-center .sbp-size-mi:hover { background: var(--sb-hover-hi); color: var(--accent); }
  #sb-center .sbp-size-mi.on { color: var(--accent); }
  /* the on-screen size row — calibration steppers at the top of the size drop */
  #sb-center .sbp-zoom { display: flex; align-items: center; gap: 6px; padding: 4px 11px 2px; }
  #sb-center .sbp-zbtn { min-width: 28px; padding: 3px 7px; font-size: calc(12px * var(--sb-fs, 1));
    line-height: 1.2; justify-content: center; }
  #sb-center .sbp-zbtn.wide { margin-left: auto; font-size: calc(10.5px * var(--sb-fs, 1)); }
  #sb-center .sbp-zbtn:disabled { opacity: 0.4; cursor: default; }
  #sb-center .sbp-zpct { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums;
    font-size: calc(12px * var(--sb-fs, 1)); color: var(--sb-ink); }
  #sb-center .sbp-zoom-hint { padding: 3px 11px 8px; max-width: 236px; line-height: 1.4;
    font-size: calc(10.2px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 78%, var(--sb-line));
    border-bottom: 1px solid var(--line); margin-bottom: 3px; }
  #sb-center .sbp-size-name { font-weight: 600; }
  #sb-center .sbp-size-dim { color: color-mix(in oklch, var(--sb-ink-dim) 74%, var(--sb-line)); }
  /* A refused keystroke — the band is full at this page size. Same language the box already speaks:
     the text stays where it was, and the zone's edge says why for a beat. */
  #sb-center .sbp-zone.full { box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--sb-warn) 62%, transparent); }
  /* the trail: every segment but the last is a way somewhere, and reads like one under the cursor */
  #sb-center .sbp-crumb { background: none; border: 0; padding: 0 1px; margin: 0; font: inherit;
    color: var(--sb-ink-dim); cursor: pointer; border-radius: 3px; }
  #sb-center .sbp-crumb:hover { color: var(--sb-ink); text-decoration: underline; }
  #sb-center .sbp-crumb.flat, #sb-center .sbp-crumb.cur { cursor: default; text-decoration: none; }
  #sb-center .sbp-crumb.cur { color: var(--sb-ink); font-weight: 600; }
  #sb-center .sbp-crumb.cur:hover { text-decoration: none; }
  /* Save: quiet while the page and the book say the same thing, the theme's accent the moment
     they don't. The realm owns the .on class — state never re-renders this box while he types. */
  #sb-center .sbp-save { font-weight: 600; }
  #sb-center .sbp-save.on { background: var(--sb-accent); border-color: var(--sb-accent);
    color: var(--sb-select-ink, white); opacity: 1; cursor: pointer; }
  #sb-center .sbp-save.on:hover { background: color-mix(in oklch, var(--sb-accent) 82%, white); }
  /* RETIRED: .edited — the rule that pinned an edited zone to its raw layer forever, which is what
     "page text areas no longer become inactive for markdown preview" was. Nothing pins the raw
     layer now: the realm repaints .sbp-render from the box's own value, so his unsaved words are on
     the paper as markdown the moment the caret leaves. */
  /* the leave-guard: the prompt every way out of a dirty page goes through */
  #sb-app #sb-leave-guard { position: absolute; inset: 0; z-index: 90; display: flex;
    align-items: center; justify-content: center; pointer-events: auto;
    background: color-mix(in oklch, var(--sb-scrim) 46%, transparent); backdrop-filter: blur(1.5px); }
  #sb-app #sb-leave-guard .lg-box { width: min(420px, 82%); padding: 18px 20px 16px;
    background: var(--sb-panel-2); border: 1px solid var(--sb-line); border-radius: 8px;
    box-shadow: 0 22px 60px color-mix(in oklch, var(--sb-shadow) 70%, transparent); }
  #sb-app #sb-leave-guard .lg-name { font-size: calc(14.5px * var(--sb-fs, 1)); font-weight: 700; color: var(--sb-ink);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-app #sb-leave-guard .lg-line { margin: 6px 0 14px; font-size: calc(12.5px * var(--sb-fs, 1)); color: var(--sb-ink-dim); }
  /* three ways out now (Discard / Keep unsaved / Save) — they wrap rather than squeeze on a tablet */
  #sb-app #sb-leave-guard .lg-acts { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  #sb-app #sb-leave-guard .lg-hint { margin-top: 10px; font-size: calc(10.5px * var(--sb-fs, 1)); letter-spacing: 0.4px;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 70%, var(--sb-line)); }
  #sb-center .sbp-count { margin-left: 6px; font-size: calc(10.5px * var(--sb-fs, 1)); letter-spacing: 1px;
    text-transform: uppercase; color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  /* unsaved marks — both reserve their space always, so nothing reflows when a write lands */
  #sb-center .sbp-unsaved { margin-left: 8px; font-size: calc(10.5px * var(--sb-fs, 1)); letter-spacing: 0.6px;
    font-weight: 700; color: oklch(0.63 0.22 27); visibility: hidden; }
  #sb-center .sbp-unsaved.on { visibility: visible; }
  #sb-center .sbp-bar-acts { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  #sb-app .sb-btn.off, #sb-app .sb-btn:disabled { opacity: 0.35; cursor: default; }
  #sb-app .sb-btn.off:hover, #sb-app .sb-btn:disabled:hover { border-color: var(--line); color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); }
  #sb-app .sb-btn.danger:hover { border-color: color-mix(in oklch, var(--sb-warn) 87%, var(--sb-panel)); color: color-mix(in oklch, var(--sb-warn) 85%, white); }
  #sb-center .sbp-note-bar { padding: 6px 18px; font-size: calc(11.5px * var(--sb-fs, 1)); color: var(--sb-ok); }
  /* the pen — one seat writes a card's pages at a time (lib/pagelock.js). A state, not an error:
     the pane's own panel chrome, no red anywhere, and nothing on the window is hidden by it. */
  #sb-center .sbp-pen-bar { flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
    padding: 6px 18px; background: color-mix(in oklch, var(--sb-panel-2) 80%, var(--sb-center));
    border-bottom: 1px solid var(--line); font-size: calc(11.5px * var(--sb-fs, 1));
    color: color-mix(in oklch, var(--sb-ink-dim) 86%, var(--sb-ink)); }
  #sb-center .sbp-pen-bar b { font-weight: 700; color: var(--sb-ink); }
  #sb-center .sbp-pen-dot { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 20%, transparent); }
  /* set down: the same dot, hollow — nobody's hand on it. Still the panel's own ink, never red. */
  #sb-center .sbp-pen-dot.down { background: transparent;
    box-shadow: inset 0 0 0 1.5px color-mix(in oklch, var(--sb-ink-dim) 70%, var(--sb-line)); }
  /* the hand-off buttons — quiet chips, the window's chrome, riding BESIDE the line on the left.
     creator asked (2026-08-26): the far-right push put "Pick up the pen" under the Spawn chrome. */
  #sb-center .sbp-pen-btn { flex: 0 0 auto; font: inherit;
    font-size: calc(11px * var(--sb-fs, 1)); line-height: calc(20px * var(--sb-fs, 1)); padding: 0 10px;
    cursor: pointer; border-radius: 3px; background: color-mix(in oklch, var(--sb-panel-2) 70%, var(--sb-hover));
    border: 1px solid var(--line); color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); }
  #sb-center .sbp-pen-btn:hover { border-color: var(--accent); color: var(--accent); }
  /* HIS ASK: the holder's button sits right beside "You hold the pen" instead of across the bar,
     and wears the quill outline instead of words. */
  #sb-center .sbp-pen-bar.mine .sbp-pen-btn { margin-left: 0; padding: 0 7px;
    display: inline-flex; align-items: center; }
  #sb-center .sbp-pen-btn .quill-ico { width: calc(13px * var(--sb-fs, 1));
    height: calc(13px * var(--sb-fs, 1)); display: block; }
  #sb-center .sbp-pen-btn.take { border-color: color-mix(in oklch, var(--sb-accent) 55%, var(--sb-line));
    color: var(--accent); }
  #sb-center .sbp-pen-bar.mine { color: color-mix(in oklch, var(--sb-ink-dim) 74%, var(--sb-ink)); }
  /* the ruler handles are realm-dragged, not buttons — under another seat's pen they stop taking
     the mouse at all, and say so by fading with the rest of the dead controls. */
  #sb-app .sbp-frame.pen-off .sbp-handle { pointer-events: none; opacity: 0.4; }
  #sb-app .sbp-frame.pen-off .sbp-raw { cursor: default; }
  #sb-center .sbp-confirm {
    position: absolute; top: calc(100% - 2px); left: 12px; z-index: 60;
    display: flex; align-items: center; gap: 8px; padding: 8px 10px;
    background: var(--panel-2); border: 1px solid color-mix(in oklch, var(--sb-warn) 55%, var(--sb-panel));
    box-shadow: 0 14px 30px color-mix(in oklch, var(--sb-shadow) 55%, transparent); font-size: calc(12px * var(--sb-fs, 1));
  }

  /* the markdown edit strip — full pane width */
  #sb-center .sbp-strip {
    flex: 0 0 auto; display: flex; align-items: center; gap: 3px; padding: 5px 14px;
    background: var(--panel); border-bottom: 1px solid var(--line);
  }
  #sb-app .sbp-md {
    min-width: 26px; height: 22px; padding: 0 6px; font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); cursor: pointer;
    color: color-mix(in oklch, var(--sb-ink) 82%, var(--sb-ink-dim)); background: color-mix(in oklch, var(--sb-panel-2) 55%, var(--sb-hover));
    border: 1px solid var(--line); border-radius: 3px;
  }
  #sb-app .sbp-md:hover { border-color: var(--accent); color: var(--accent); }
  #sb-app .sbp-md.b { font-weight: 800; }
  #sb-app .sbp-md.i { font-style: italic; }
  #sb-app .sbp-md.c { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  #sb-app .sbp-sep { width: 1px; height: 15px; margin: 0 4px; background: var(--line); }
  #sb-center .sbp-strip-note { margin-left: auto; font-size: calc(10.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 53%, var(--sb-line)); }

  /* the stage the page sits on */
  /* the page navigator — Settings ▸ Page view. Bounded, scrolls on its own, honours Scrolling. */
  #sb-center .sbp-nav {
    flex: 0 0 auto; max-height: 138px; overflow: auto; padding: 7px 14px;
    background: color-mix(in oklch, var(--sb-panel) 82%, var(--sb-center));
    border-bottom: 1px solid var(--line);
  }
  #sb-center .sbp-nav.list { display: flex; flex-direction: column; gap: 3px; }
  #sb-center .sbp-nav.grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 7px; }
  #sb-app .sbp-navi {
    display: flex; align-items: center; gap: 7px; padding: 4px 8px; cursor: pointer; text-align: left;
    font: inherit; font-size: calc(11.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink) 80%, var(--sb-ink-dim));
    background: color-mix(in oklch, var(--sb-panel-2) 60%, var(--sb-hover));
    border: 1px solid var(--line); border-radius: 3px;
  }
  #sb-app .sbp-navi:hover { border-color: var(--accent); color: var(--accent); }
  #sb-app .sbp-navi.on { border-color: var(--accent); color: var(--accent);
    background: color-mix(in oklch, var(--sb-accent) 14%, var(--sb-panel-2)); font-weight: 600; }
  #sb-app .sbp-navi-n { flex: 0 0 auto; min-width: 15px; text-align: right; font-variant-numeric: tabular-nums;
    color: color-mix(in oklch, var(--sb-ink-dim) 74%, var(--sb-line)); }
  #sb-app .sbp-navi.on .sbp-navi-n { color: inherit; }
  #sb-app .sbp-navi-t { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #sb-app .sbp-navi-u { opacity: 0.6; font-style: italic; }
  /* a thumbnail wears the page's own proportions, so the sorter reads as pages, not as chips */
  #sb-center .sbp-nav.grid .sbp-navi {
    flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 2px;
    width: 62px; aspect-ratio: var(--navi-ratio, 63/88); padding: 4px 5px; font-size: calc(10.5px * var(--sb-fs, 1));
    background: linear-gradient(var(--paper-hi, var(--sb-panel-2)), var(--paper, var(--sb-panel)));
    color: var(--paper-ink, var(--sb-ink));
  }
  #sb-center .sbp-nav.grid .sbp-navi-t { white-space: normal; overflow: hidden; display: -webkit-box;
    -webkit-line-clamp: 3; -webkit-box-orient: vertical; line-height: 1.25; }
  /* CENTERED BUT REACHABLE (jace, 2026-08-26 "the previous page is cut off because we cannot
     scroll far enough left"): justify-content:center puts overflow past the LEFT scroll origin,
     and scrollLeft cannot go negative — the previous-page edge was unreachable in the notepad,
     where the page rail doesn't draw and that edge is the only way back. So the row centers by
     AUTO MARGINS instead: one on the first child, one on the row's right end (the right edge, or
     the frame itself on the last page — data-next says which). Auto margins collapse to zero
     under overflow, so the row start-aligns and every pixel of it can be scrolled to. */
  #sb-center .sbp-stage {
    position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; scroll-behavior: var(--sb-scroll-beh, smooth);
    display: flex; align-items: flex-start; justify-content: flex-start; gap: 0;
    padding: 26px 20px 40px;
    background:
      radial-gradient(120% 80% at 50% 0%, var(--sb-panel-2), color-mix(in oklch, var(--sb-field) 35%, var(--sb-bg)) 70%);
  }
  #sb-center .sbp-stage > :first-child { margin-left: auto; }
  #sb-app .sbp-edge.right { margin-right: auto; }
  #sb-center .sbp-stage[data-next=""] .sbp-frame { margin-right: auto; }
  #sb-center .sbp-nopage { display: flex; flex-direction: column; align-items: center; gap: 12px;
    margin: 60px auto; color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); font-size: calc(12.5px * var(--sb-fs, 1)); }

  /* faded, smaller page edges either side — ~1 inch wide; they wear the paper zoom so their
     height keeps agreeing with the zoomed page beside them */
  #sb-app .sbp-edge {
    zoom: var(--pz, 1);
    position: relative; flex: 0 0 auto; align-self: flex-start;
    width: var(--edge); height: calc(var(--ph) * 0.94); margin-top: calc(var(--rt) + var(--ph) * 0.03);
    padding: 0; cursor: pointer; opacity: 0.42; font: inherit;
    background: linear-gradient(180deg, var(--paper-hi), var(--paper-lo));
    border: 1px solid var(--paper-edge); border-radius: 2px;
    box-shadow: 0 10px 22px var(--paper-shadow);
  }
  #sb-app .sbp-edge.left { border-right: 0; border-radius: 3px 0 0 3px; margin-right: -6px; }
  #sb-app .sbp-edge.right { border-left: 0; border-radius: 0 3px 3px 0; margin-left: -6px; }
  #sb-app .sbp-edge:hover { opacity: 0.72; }
  #sb-app .sbp-edge span {
    position: absolute; top: 10px; left: 0; right: 0; text-align: center;
    font-size: calc(11px * var(--sb-fs, 1)); color: var(--paper-ink-dim);
  }
  #sb-app .sbp-edge.left span { left: 6px; }
  #sb-app .sbp-edge.right span { right: 6px; }

  /* the page + its two attached rulers */
  /* --pz is the on-screen paper zoom (user pref): CSS zoom scales the whole drawn frame — paper,
     rulers, type — so a calibrated screen shows the page at its true printed size. The 96dpi model
     underneath never moves; the notepad shell pins --pz to 1 in its vars. */
  #sb-center .sbp-frame {
    position: relative; flex: 0 0 auto; z-index: 3;
    width: calc(var(--rt) + var(--pw)); height: calc(var(--rt) + var(--ph));
    zoom: var(--pz, 1);
  }
  #sb-center .sbp-corner {
    position: absolute; left: 0; top: 0; width: var(--rt); height: var(--rt);
    background: var(--ruler-bg); border: 1px solid var(--paper-edge); border-right: 0; border-bottom: 0;
    opacity: 0.55; cursor: default;
  }
  #sb-center .sbp-ruler {
    position: absolute; background: var(--ruler-bg); color: var(--ruler-ink);
    border: 1px solid var(--paper-edge); overflow: hidden; user-select: none;
  }
  #sb-center .sbp-ruler.h { left: var(--rt); top: 0; width: var(--pw); height: var(--rt); border-bottom: 0; }
  #sb-center .sbp-ruler.v { left: 0; top: var(--rt); width: var(--rt); height: var(--ph); border-right: 0; }
  #sb-center .sbp-minor { position: absolute; opacity: 0.55; }
  #sb-center .sbp-minor.h { left: 0; right: 0; bottom: 0; height: 5px;
    background: repeating-linear-gradient(90deg, var(--ruler-ink) 0 1px, transparent 1px var(--minor)); }
  #sb-center .sbp-minor.v { top: 0; bottom: 0; right: 0; width: 5px;
    background: repeating-linear-gradient(180deg, var(--ruler-ink) 0 1px, transparent 1px var(--minor)); }
  #sb-center .sbp-t { position: absolute; bottom: 0; width: 1px; background: var(--ruler-ink); opacity: 0.85; }
  #sb-center .sbp-t.v { position: absolute; right: 0; left: auto; bottom: auto; height: 1px; width: auto; }
  #sb-center .sbp-tl { position: absolute; top: 1px; font-size: calc(8.5px * var(--sb-fs, 1)); line-height: 1;
    transform: translateX(2px); color: var(--ruler-ink); opacity: 0.8; font-style: normal; font-weight: 400; }
  #sb-center .sbp-tl.v { left: 1px; top: 0; transform: translateY(2px); }
  #sb-center .sbp-unit { position: absolute; right: 3px; top: 2px; font-size: calc(8.5px * var(--sb-fs, 1)); opacity: 0.6; }

  /* handles — the only interactive parts of the ruler */
  #sb-app .sbp-handle { position: absolute; z-index: 6; cursor: grab; touch-action: none; }
  #sb-app .sbp-handle:active { cursor: grabbing; }
  #sb-app .sbp-handle.hm { top: 0; height: 100%; width: 15px; margin-left: -7px; }
  #sb-app .sbp-handle.vm { left: 0; width: 100%; height: 15px; margin-top: -7px; }
  #sb-app .sbp-handle.ml { left: var(--ml); }
  #sb-app .sbp-handle.mr { left: calc(var(--pw) - var(--mr)); }
  #sb-app .sbp-handle.hdr { top: var(--hdr); }
  #sb-app .sbp-handle.lead { top: calc(var(--hdr) + var(--lead)); }
  #sb-app .sbp-handle.ftr { top: calc(var(--ph) - var(--ftr)); }
  #sb-app .sbp-handle i {
    position: absolute; display: flex; align-items: center; justify-content: center;
    font-style: normal; font-size: calc(8.5px * var(--sb-fs, 1)); line-height: 1; color: oklch(0.98 0.01 80);
    background: var(--handle); border-radius: 2px; box-shadow: 0 1px 3px oklch(0.15 0 0 / 0.45);
  }
  #sb-app .sbp-handle.hm i { left: 4px; top: 3px; width: 7px; height: calc(100% - 6px);
    clip-path: polygon(0 0, 100% 0, 50% 100%); }
  #sb-app .sbp-handle.vm i { top: 4px; left: 3px; height: 7px; width: calc(100% - 6px);
    clip-path: polygon(0 0, 0 100%, 100% 50%); }
  #sb-app .sbp-handle.lead i { background: oklch(0.62 0.075 200); }
  #sb-app .sbp-handle:hover i { filter: brightness(1.18); }
  #sb-app .sbp-handle.dragging i { filter: brightness(1.3); }

  /* THE PAGE — a real sheet: warm stock, laid grain, a shadow it actually casts */
  #sb-center .sbp-page {
    position: absolute; left: var(--rt); top: var(--rt); width: var(--pw); height: var(--ph);
    color: var(--paper-ink);
    background:
      radial-gradient(130% 60% at 50% -10%, oklch(1 0 0 / 0.35), transparent 62%),
      repeating-linear-gradient(0deg, transparent 0 3px, var(--paper-grain) 3px 4px),
      repeating-linear-gradient(90deg, transparent 0 6px, var(--paper-grain) 6px 7px),
      linear-gradient(163deg, var(--paper-hi), var(--paper) 46%, var(--paper-lo));
    border: 1px solid var(--paper-edge); border-radius: 2px;
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.55) inset,
      0 -18px 30px -22px oklch(0.35 0.03 60 / 0.5) inset,
      0 2px 4px var(--paper-shadow),
      0 16px 34px var(--paper-shadow),
      0 40px 70px oklch(0 0 0 / 0.30);
  }
  #sb-center .sbp-guide { position: absolute; pointer-events: none; opacity: 0.5; }
  #sb-center .sbp-guide.l { top: 0; bottom: 0; left: var(--ml); width: 1px;
    background: repeating-linear-gradient(180deg, var(--paper-rule) 0 3px, transparent 3px 7px); }
  #sb-center .sbp-guide.r { top: 0; bottom: 0; left: calc(var(--pw) - var(--mr)); width: 1px;
    background: repeating-linear-gradient(180deg, var(--paper-rule) 0 3px, transparent 3px 7px); }
  #sb-center .sbp-guide.t { left: 0; right: 0; top: var(--hdr); height: 1px;
    background: repeating-linear-gradient(90deg, var(--paper-rule) 0 3px, transparent 3px 7px); }
  #sb-center .sbp-guide.b { left: 0; right: 0; top: calc(var(--ph) - var(--ftr)); height: 1px;
    background: repeating-linear-gradient(90deg, var(--paper-rule) 0 3px, transparent 3px 7px); }

  /* the three stacked editable zones */
  #sb-center .sbp-zone { position: absolute; left: var(--ml); width: calc(var(--pw) - var(--ml) - var(--mr)); }
  #sb-center .sbp-zone.header { top: 0; height: var(--hdr); }
  #sb-center .sbp-zone.body { top: var(--hdr); height: calc(var(--ph) - var(--hdr) - var(--ftr)); }
  #sb-center .sbp-zone.footer { top: calc(var(--ph) - var(--ftr)); height: var(--ftr); }
  /* ALIGNMENT IS LAW: the three layers share one box and one set of metrics — same family, size,
     leading, padding, wrapping — because the caret sits in the top one and paints over the middle
     one. Anything that changes a glyph's WIDTH in .sbp-live drifts them apart. */
  #sb-center .sbp-render, #sb-center .sbp-live, #sb-app .sbp-raw {
    position: absolute; inset: 0; margin: 0; padding: 0;
    font-family: ui-serif, Georgia, "Times New Roman", serif; font-size: calc(13.5px * var(--sb-fs, 1));
    line-height: var(--lead); color: var(--paper-ink); overflow: hidden; overflow-wrap: break-word;
  }
  #sb-center .sbp-render { z-index: 1; }
  #sb-center .sbp-zone.literal .sbp-render { white-space: pre-wrap; overflow: auto;
    overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    tab-size: 2; user-select: text; -webkit-user-select: text; touch-action: pan-x pan-y; }
  #sb-app .sbp-frame.read-only .sbp-handle { display: none; }

  #sb-center .sbp-score-line, #sb-center .sbp-score-token { line-height:var(--lead); min-height:var(--lead); margin:0; padding:0; overflow-wrap:break-word; }
  #sb-center .sbp-score-token { color:var(--paper-ink); font:inherit; line-height:var(--lead); padding:0 5px; border-radius:3px; background:color-mix(in oklch,var(--sb-accent) 13%,transparent); box-shadow:inset 2px 0 0 color-mix(in oklch,var(--sb-accent) 75%,var(--paper-ink)),inset 0 0 0 0.6px color-mix(in oklch,var(--sb-accent) 35%,transparent); overflow:hidden; box-sizing:border-box; }
  #sb-center .sbp-score-token > span { color:color-mix(in oklch,var(--sb-accent) 70%,var(--paper-ink)); }
  #sb-center .sbp-score-token.invalid { box-shadow:inset 2px 0 0 var(--sb-danger); }
  #sb-center .sbp-zone.notated:not(:focus-within) .sbp-raw { pointer-events:none; }
  #sb-center .sbp-zone.notated .sbp-render { pointer-events:auto; }
  #sb-center .notation-source { position:absolute;right:18px;bottom:4px;z-index:3;font-size:11px;background:var(--paper);color:var(--paper-ink);border:1px solid currentColor;padding:3px 8px; }
  #sb-center .sbp-zone.notated:focus-within .notation-source { display:none; }
  #sb-center .sbp-live {
    z-index: 1; opacity: 0; pointer-events: none; white-space: pre-wrap; word-break: normal;
    tab-size: 4;
  }
  #sb-app .sbp-raw {
    z-index: 2; opacity: 0; resize: none; border: 0; outline: none; background: transparent;
    caret-color: var(--paper-ink); -webkit-text-fill-color: currentColor;
  }
  /* EDITING — jace, 2026-08-25: "I see nothing while writing."
     WHY it went blank: the transparent-ink trick only works while something repaints .sbp-live on
     every keystroke, and that painter (scripts/ui.js paintZone) lives in ui.js's realm block —
     which NEVER RUNS on the creator-tab path (a panel is an HTML string; only the <img onerror>
     modules execute there). So the ink was transparent and the backdrop under it was frozen at
     whatever the last render put down: an invisible typist.
     THE FLIP IS TAKEN, 2026-08-25: lib/livemd.js (window.__SBLIVE) was watched painting in his own
     tab — #sb-livemd-data read data-live=1 data-beat=3645 data-paints=31 data-zones=3 — so the
     backdrop is live under the caret and the box hands its ink back to it: transparent fill, real
     caret. The two bands' metrics moved with it — .sbp-live now stands in the 11.5px and the
     footer-centre selector lists below beside .sbp-render and .sbp-raw, which is what keeps the
     caret on the ink in the running head and foot.
     IF THE PAINT EVER DIES the focused box goes blank again — that is the failure this file names,
     and #sb-livemd-data's data-paints is where you read it. */
  #sb-center .sbp-zone:focus-within .sbp-raw {
    opacity: 1; background: transparent; color: transparent;
    -webkit-text-fill-color: transparent; caret-color: var(--paper-ink);
  }
  #sb-center .sbp-zone:focus-within .sbp-live { opacity: 1; }
  #sb-center .sbp-zone:focus-within .sbp-render { opacity: 0; }
  #sb-center .sbp-zone:focus-within .sbp-raw::selection { background: color-mix(in oklch, var(--paper-ink) 22%, transparent); }
  /* REVIEW MODE, free: another seat holds the pen (or it is parked), so the box takes no clicks at
     all and the rendered paper is simply what you read. */
  #sb-app .sbp-zone.locked .sbp-raw { pointer-events: none; }
  #sb-center .sbp-zone.locked:focus-within .sbp-raw { opacity: 0; }
  #sb-center .sbp-zone.locked:focus-within .sbp-live { opacity: 0; }
  #sb-center .sbp-zone.locked:focus-within .sbp-render { opacity: 1; }
  /* the live layer's dress — WIDTH-NEUTRAL ONLY: colour, background, underline, and a 0.6px shadow
     standing in for bold. No font-size, no family, no real weight. */
  #sb-center .sbp-live .lv-mk { opacity: 0.32; }
  #sb-center .sbp-live .lv-h { color: color-mix(in oklch, var(--paper-ink) 82%, oklch(0.62 0.13 250));
    text-shadow: 0.6px 0 currentColor; }
  #sb-center .sbp-live .lv-b { text-shadow: 0.6px 0 currentColor; }
  #sb-center .sbp-live .lv-i { color: color-mix(in oklch, var(--paper-ink) 70%, oklch(0.62 0.13 250)); }
  #sb-center .sbp-live .lv-code, #sb-center .sbp-live .lv-fence {
    background: oklch(0.35 0.02 70 / 0.12); border-radius: 2px; }
  #sb-center .sbp-live .lv-q { color: var(--paper-ink-dim); }
  #sb-center .sbp-live .lv-hr { color: var(--paper-ink-dim); text-decoration: line-through; }
  #sb-center .sbp-live .lv-link { color: color-mix(in oklch, oklch(0.62 0.13 250) 62%, var(--paper-ink));
    text-decoration: underline; }
  #sb-center .sbp-live .lv-ref { background: color-mix(in oklch, oklch(0.62 0.13 250) 16%, transparent);
    border-radius: 2px; }
  /* THE REALM'S OWN BASE RESET names a pixel face on bare tags, so a naked span inside the overlay
     painted in the ENGINE's font while the box under it wore the paper serif — every dressed token
     widened the line and dragged the ink sideways off the caret (the caret-offset bug, 2026-08-26).
     Explicit inherit outguns the reset; the .sbp-pre/.sbp-code monospace rules sit LATER in this
     sheet at equal specificity, so code keeps its own face. */
  #sb-center .sbp-live *, #sb-center .sbp-render * { font-family: inherit; }
  /* THE PAPER, PAINTED FROM THE BOX — jace, 2026-08-25: "tapping out of the text edit box makes it
     no longer show up until save." The at-rest paper (.sbp-render) is the SERVER's copy, so the
     moment the caret left, unsaved words vanished behind the last save. lib/livemd.js now writes
     this wrapper into #sb-render-<field> whenever a zone's text differs from the book's copy, so
     the paper always shows what is actually in the box. It wears .sbp-live so the whole lv-* dress
     above reaches it with no second copy of the theme; these overrides only undo the absolute-layer
     geometry, because inside the paper it is ordinary flow. */
  #sb-center .sbp-render > .sbp-live.lvsrc {
    position: static; inset: auto; opacity: 1; padding: 0; overflow: visible;
    font-family: inherit; font-size: inherit; line-height: inherit; color: inherit;
    text-align: inherit; white-space: pre-wrap; word-break: normal; tab-size: 4;
  }
  /* The #[ type-ahead. It lives on document.body (outside the morph container), so its box wears
     the app's own tokens, copied onto it when it opens. */
  #sb-refpick {
    overflow-y: auto; overflow-x: hidden; border-radius: 3px;
    font-family: ui-sans-serif, system-ui, sans-serif; font-size: calc(12px * var(--sb-fs, 1)); line-height: 1.35;
    color: var(--sb-ink, oklch(0.88 0.012 85));
    background: var(--sb-panel-2, oklch(0.24 0.01 70));
    border: 1px solid var(--sb-accent, oklch(0.62 0.12 60));
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
  /* SHELF MODE (the token reads asset:): a tab strip by kind over a scrolling list, the whole shelf
     under it. The realm sets the list's height; this is the dress. */
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
  /* THE TWO BANDS' METRICS — all THREE layers, or the caret drifts against the ink. The live
     backdrop is what a focused header/footer shows now (the flip above), so it steps to 11.5px and
     centres in the foot exactly as the paper and the box do. Ink colour is the two VISIBLE layers'
     business only: the box's own glyphs are transparent while focused and invisible at rest. */
  #sb-center .sbp-zone.header .sbp-render, #sb-center .sbp-zone.header .sbp-live, #sb-app .sbp-zone.header .sbp-raw,
  #sb-center .sbp-zone.footer .sbp-render, #sb-center .sbp-zone.footer .sbp-live, #sb-app .sbp-zone.footer .sbp-raw {
    font-size: calc(11.5px * var(--sb-fs, 1)); line-height: 1.4;
  }
  #sb-center .sbp-zone.header .sbp-render, #sb-center .sbp-zone.header .sbp-live,
  #sb-center .sbp-zone.footer .sbp-render, #sb-center .sbp-zone.footer .sbp-live { color: var(--paper-ink-dim); }
  #sb-center .sbp-zone.footer .sbp-render, #sb-center .sbp-zone.footer .sbp-live, #sb-app .sbp-zone.footer .sbp-raw { text-align: center; }
  /* A heading in the running head or foot: full ink, real size, on the chrome's own 11.5px base. */
  #sb-center .sbp-zone.header .sbp-ch, #sb-center .sbp-zone.footer .sbp-ch {
    font-weight: 700; color: var(--paper-ink); line-height: 1.2;
  }
  #sb-center .sbp-zone.header .sbp-ch.h1, #sb-center .sbp-zone.footer .sbp-ch.h1 { font-size: 1.55em; }
  #sb-center .sbp-zone.header .sbp-ch.h2, #sb-center .sbp-zone.footer .sbp-ch.h2 { font-size: 1.3em; }
  #sb-center .sbp-zone.header .sbp-ch.h3, #sb-center .sbp-zone.footer .sbp-ch.h3 { font-size: 1.12em; }
  #sb-center .sbp-ph { color: var(--paper-ink-dim); opacity: 0.55; font-style: italic; }
  #sb-center .sbp-p { margin: 0 0 0.55em; }
  #sb-center .sbp-h { margin: 0.15em 0 0.35em; font-weight: 700; line-height: 1.2; }
  #sb-center h1.sbp-h { font-size: 1.55em; }
  #sb-center h2.sbp-h { font-size: 1.3em; }
  #sb-center h3.sbp-h { font-size: 1.12em; }
  #sb-center .sbp-list { margin: 0 0 0.55em; padding-left: 1.3em; }
  #sb-center .sbp-quote { margin: 0 0 0.55em; padding-left: 0.8em; border-left: 2px solid var(--paper-rule);
    color: var(--paper-ink-dim); font-style: italic; }
  #sb-center .sbp-quote p { margin: 0; }
  #sb-center .sbp-pre { margin: 0 0 0.55em; padding: 6px 8px; background: oklch(0.35 0.02 70 / 0.10);
    border-radius: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em;
    white-space: pre-wrap; }
  #sb-center .sbp-code { padding: 0 3px; background: oklch(0.35 0.02 70 / 0.12); border-radius: 2px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  #sb-center .sbp-hr { margin: 0.6em 0; border: 0; border-top: 1px solid var(--paper-rule); }
  /* [text](url) reads as a link and goes nowhere — no anchor, no navigation out of the realm. The
     address is in its title, which is the whole of what a reader needs from it here. */
  #sb-center .sbp-link { color: color-mix(in oklch, oklch(0.62 0.13 250) 62%, var(--paper-ink, currentColor));
    text-decoration: underline; text-underline-offset: 2px; cursor: default; }
  /* a token the realm drew before the save could resolve it: the app's reference dress, dashed */
  #sb-center .sbp-page .sbp-ref-live { border-bottom-style: dashed; opacity: 0.88; }
  /* A live reference wears its TARGET CARD's status colour, painted inline by lib/refs.js
     (liveRef) in the same grammar the card's pill and banner use. What is left here is the
     fallback under it — a card with no status, and the tag chips — mixed out of the paper's own
     ink so it reads on cream paper AND on the dark Cosmic paper, which the old hardcoded
     oklch(0.42 0.14 250) did not. */
  #sb-center .sbp-page .sb-ref {
    color: color-mix(in oklch, oklch(0.62 0.13 250) 60%, var(--paper-ink, currentColor));
    border-bottom: 1px solid color-mix(in oklch, currentColor 30%, transparent);
  }
  /* Resolved card links sit above the invisible editing textarea; the rest of
     the paper still passes a press through to that textarea. */
  #sb-center .sbp-zone:not(.literal):not(:has(.sbp-raw:focus)) .sbp-render { z-index:auto; opacity:1; pointer-events:none; }
  #sb-center .sbp-render .sb-ref[role="link"][data-book] { position:relative; z-index:3; pointer-events:auto; cursor:pointer; touch-action:manipulation; }
  #sb-center .sbp-zone:has(.sb-ref:focus) .sbp-live, #sb-center .sbp-zone:has(.sb-ref:focus) .sbp-raw { opacity:0; }
  #sb-center .sbp-render .sb-ref[role="link"]:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
  #sb-center .sbp-page .sb-tag {
    color: color-mix(in oklch, oklch(0.62 0.13 250) 46%, var(--paper-ink, currentColor));
  }
  #sb-center .sbp-page .sb-ref-trash, #sb-center .sbp-page .sb-ref-dead,
  #sb-center .sbp-page .sb-ref-invalid {
    color: color-mix(in oklch, oklch(0.62 0.15 30) 58%, var(--paper-ink, currentColor));
    font-style: italic; border-bottom-style: dotted;
  }
  /* THE SHELF CHIP — #[asset:…], resolved in lib/refs.js against the Asset Library MOD's shelf.
     Worldwright Studio reads that shelf and never writes it, so the chip is a LABEL, not a control: no
     pointer, no action, the file path in its title. A row with no thumb wears its kind glyph, and
     the two quiet states (nothing on the shelf, mod not installed) dim out of the paper's own ink
     rather than borrowing the red the broken-reference states own. */
  #sb-center .sbp-page .sb-asset {
    display: inline-flex; align-items: center; gap: 5px; vertical-align: baseline;
    padding: 1px 7px 1px 3px; border-radius: 11px; border-bottom: 0;
    background: color-mix(in oklch, var(--paper-ink, currentColor) 7%, transparent);
    color: color-mix(in oklch, oklch(0.58 0.10 165) 58%, var(--paper-ink, currentColor));
  }
  #sb-center .sbp-page .sb-asset-t { width: 16px; height: 16px; border-radius: 3px;
    object-fit: cover; display: inline-block; flex: 0 0 auto; }
  #sb-center .sbp-page .sb-asset-g { display: inline-flex; align-items: center; justify-content: center;
    font-size: calc(10px * var(--sb-fs, 1)); opacity: 0.7;
    background: color-mix(in oklch, var(--paper-ink, currentColor) 10%, transparent); }
  #sb-center .sbp-page .sb-asset-n { font-weight: 600; }
  #sb-center .sbp-page .sb-asset-k { font-size: calc(9.5px * var(--sb-fs, 1)); letter-spacing: 0.6px;
    text-transform: uppercase; opacity: 0.6; }
  /* the mood chip (#[atmo:…]). Two states, neither a failure: a preset the kitchen ships, or the
     author's own words in italic. Never dimmed the way a broken reference is — nothing is broken. */
  #sb-center .sbp-page .sb-atmo {
    display: inline-flex; align-items: center; gap: 5px; vertical-align: baseline;
    padding: 1px 8px 1px 4px; border-radius: 11px; border-bottom: 0;
    background: color-mix(in oklch, oklch(0.62 0.12 285) 12%, transparent);
    color: color-mix(in oklch, oklch(0.55 0.12 285) 62%, var(--paper-ink, currentColor));
  }
  #sb-center .sbp-page .sb-atmo-g { font-size: calc(10px * var(--sb-fs, 1)); opacity: 0.75; }
  #sb-center .sbp-page .sb-atmo-n { font-weight: 600; }
  #sb-center .sbp-page .sb-atmo-free .sb-atmo-n { font-weight: 500; font-style: italic; }
  /* the camera directive chip (#[cam: …]) — the shoot grammar, now one token kind like the rest */
  #sb-center .sbp-page .sb-cam {
    display: inline-flex; align-items: center; gap: 5px; vertical-align: baseline;
    padding: 1px 8px 1px 4px; border-radius: 4px; border-bottom: 0;
    background: color-mix(in oklch, var(--paper-ink, currentColor) 7%, transparent);
    color: color-mix(in oklch, oklch(0.58 0.10 250) 60%, var(--paper-ink, currentColor));
    font-family: ui-monospace, Menlo, monospace; font-size: 0.92em;
  }
  #sb-center .sbp-page .sb-cam-g { opacity: 0.7; }
  #sb-center .sbp-page .sb-asset-off { font-style: italic;
    color: color-mix(in oklch, var(--paper-ink, currentColor) 52%, transparent);
    background: color-mix(in oklch, var(--paper-ink, currentColor) 5%, transparent); }
  #sb-center .sbp-page .sb-asset-off .sb-asset-n { font-weight: 400; }

  /* popups */
  #sb-center .sbp-pop, #sb-center .sbp-export {
    position: absolute; left: 50%; top: 18px; transform: translateX(-50%); z-index: 70;
    width: min(460px, 78%); background: var(--panel-2); border: 1px solid var(--line);
    box-shadow: 0 20px 44px color-mix(in oklch, var(--sb-shadow) 60%, transparent);
  }
  #sb-center .sbp-pop-head { display: flex; align-items: center; gap: 8px; padding: 7px 8px 7px 12px;
    border-bottom: 1px solid var(--line); font-weight: 600; }
  #sb-center .sbp-pop-head span { flex: 1 1 auto; }
  #sb-center .sbp-pop-body { max-height: 260px; overflow: auto; padding: 4px 0; }
  #sb-app .sbp-ins-item { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
    padding: 6px 12px; background: transparent; border: 0; color: inherit; font: inherit; cursor: pointer; }
  #sb-app .sbp-ins-item:hover { background: var(--sb-hover-hi); }
  #sb-app .sbp-ins-item .n { font-size: calc(12.5px * var(--sb-fs, 1)); font-weight: 600; }
  #sb-app .sbp-ins-item .h { font-size: calc(11px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 76%, var(--sb-line)); }
  /* what the row will read once the page is drawn — the token, then what it becomes */
  #sb-app .sbp-ins-item .x { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: calc(10.5px * var(--sb-fs, 1)); line-height: 1.5; color: color-mix(in oklch, var(--sb-ink-dim) 60%, var(--sb-line)); }
  #sb-center .sbp-ins-empty { padding: 10px 12px; font-size: calc(11.5px * var(--sb-fs, 1)); color: color-mix(in oklch, var(--sb-ink-dim) 68%, var(--sb-line)); font-style: italic; }
  #sb-center .sbp-pop-foot { padding: 6px 12px; border-top: 1px solid var(--line);
    font-size: calc(10.5px * var(--sb-fs, 1)); line-height: 1.45; color: color-mix(in oklch, var(--sb-ink-dim) 59%, var(--sb-line)); }
  #sb-center .sbp-pop-foot .seam { margin-top: 3px; }

  #sb-center .sbp-export-text { max-height: 320px; overflow: auto; margin: 0; padding: 10px 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: calc(11.5px * var(--sb-fs, 1)); line-height: 1.5;
    white-space: pre-wrap; color: color-mix(in oklch, var(--sb-ink) 91%, var(--sb-ink-dim)); }

  /* --- NOTEPAD: the pocket page ------------------------------------------------------------------
     ui.shell === "notepad". Every number the small sheet stands on is already in the SAME variables
     the desk page wears (render() writes smallGeo's numbers into them), so nothing here re-states a
     page size — this block only says what the pocket page stops SHOWING, and steps the type down.
     Nothing here touches an id, a nesting, or the three-layer zone: the morph must keep the
     textareas across a shell switch. */
  #sb-center .sbp-stage.np { padding: 14px 14px 26px; }
  /* the desk furniture, quiet: both rulers, the dead corner, the tick ladder, the margin guides.
     Hidden, NOT removed — the frame's subtree stays identical in both shells. */
  #sb-center .sbp-frame.np .sbp-corner,
  #sb-center .sbp-frame.np .sbp-ruler,
  #sb-center .sbp-frame.np .sbp-guide { display: none; }
  #sb-app .sbp-frame.np .sbp-handle { display: none; }
  /* a pocket sheet casts a pocket shadow */
  #sb-center .sbp-frame.np .sbp-page {
    border-radius: 3px;
    box-shadow:
      0 1px 0 oklch(1 0 0 / 0.5) inset,
      0 1px 3px var(--paper-shadow),
      0 10px 20px var(--paper-shadow);
  }
  /* ALIGNMENT IS LAW: one step down, 13.5px -> 12px, on all three layers in one rule — the caret
     sits in the top one and paints over the middle one, so they move together or not at all. */
  #sb-center .sbp-frame.np .sbp-render,
  #sb-center .sbp-frame.np .sbp-live,
  #sb-app .sbp-frame.np .sbp-raw {
    font-size: calc(12px * var(--sb-fs, 1)); padding: 4px 0;
  }
  /* the slim bar and the pocket strip — tighter frame, same tap sizes (a tablet thumb does not
     shrink with the page) */
  #sb-center .sbp-bar.np { padding-top: 5px; padding-bottom: 5px; }
  #sb-center .sbp-bar.np .sbp-count { margin-left: 8px; }
  /* THE POCKET BAR CARRIES THE SAME THREE (his second ruling — the notepad had no shoot controls at
     all). The acts take a row of their own so the card name can never squeeze them, each chip
     stretches to a thumb's width, and nothing may cross the 460px box's edge: wrap, min-width 0,
     and the blurb truncates exactly as it does in the full shell. */
  #sb-center .sbp-bar.np .sbp-bar-acts { flex: 1 1 100%; min-width: 0; }
  #sb-center .sbp-shoot-acts.np { flex: 1 1 auto; min-width: 0; margin-left: 2px; padding-left: 7px; }
  #sb-app #sb-center .sbp-shoot-acts.np .sb-btn { height: 34px; min-height: 34px; flex: 1 1 auto;
    min-width: 0; padding: 0 9px; justify-content: center; }
  #sb-center .sbp-shoot-blurb.np { height: 26px; line-height: 13px; }
  #sb-center .sbp-shoot-blurb.np .ln { font-size: calc(10px * var(--sb-fs, 1)); }
  #sb-center .sbp-shoot-blurb.np .ln.two { font-size: calc(9.5px * var(--sb-fs, 1)); }
  #sb-center .sbp-strip.np { padding: 4px 12px; }
  #sb-app .sbp-stage.np .sbp-edge { opacity: 0.34; }
  #sb-app .sbp-stage.np .sbp-edge:hover { opacity: 0.62; }
  #sb-app .sbp-stage.np .sbp-edge span { top: 7px; font-size: calc(10px * var(--sb-fs, 1)); }
  </style>`;
}

module.exports = {
  render,
  EDITOR_BAR,
  OPS,
  HINTS,
  MD_TOOLS,
  TAG_ITEMS,
  SWIPE,
  EDGE_PX,
  PAPER_FALLBACK,
  mdBlocks,
  mdRender,
  chromeRender,
  liveSegments,
  livePage,
  liveOverlay,
};
