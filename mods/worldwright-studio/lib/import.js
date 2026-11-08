// js — File ▸ Import…: read a document into a preview tree, then write that tree into a book. js's alone, auto-detected, and a failed detection falls through to the readers above rather than erroring. js only. record scoped to this import's books.

const CARDS = require("lib/cards.js");
const LIB = require("lib/library.js");
const CHANGELOG = require("lib/changelog.js");
// A LEAF: cardspec requires only lib/status.js, so taking it here cannot close a require cycle.
const SPEC = require("lib/cardspec.js");

const FORMATS = ["codexbuilder-md", "markdown", "csv", "json"];
const MODES = ["new book", "into folder", "merge by name"];
const COMMAND = "IMPORT_DOCUMENT";

// CAPS: a paste is a stranger — read, counted, cut to a size a book survives, and the preview says
//   out loud where the knife fell.
const CAPS = {
  chars: 400000,
  books: 12,
  folders: 80,
  cards: 300,
  sections: 24, // per card
  pages: 60, // per card
  tags: 12, // per card
  name: 120,
  summary: 2000,
  depth: 6,
};


export function text(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function trim(v) {
  return text(v).trim();
}

export function clip(v, n) {
  const s = text(v);
  return s.length > n ? s.slice(0, n) : s;
}

export function splitLines(v) {
  return text(v).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export function msg(e) {
  return text((e && e.message) || e);
}

export function blank(list) {
  // drop leading and trailing empty lines, keep the shape inside
  let a = 0;
  let b = list.length;
  while (a < b && trim(list[a]) === "") a += 1;
  while (b > a && trim(list[b - 1]) === "") b -= 1;
  return list.slice(a, b);
}

export function emptyCounts() {
  return { books: 0, folders: 0, cards: 0, sections: 0, pages: 0, tags: 0, words: 0 };
}

export function countWords(s) {
  const t = trim(s);
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function newCard(name) {
  return {
    kind: "card",
    name: clip(trim(name) || "Untitled", CAPS.name),
    summary: "",
    status: "",
    priority: 0,
    openQuestion: false,
    tags: [],
    sections: [],
    pages: [],
    warnings: [],
  };
}

export function newFolder(name) {
  return { kind: "folder", name: clip(trim(name) || "Folder", CAPS.name), children: [] };
}


const HEAD = /^(#{1,6})[ \t]+(.*\S)[ \t]*$/;
// pageAsText: "# " + cardName + " — page " + n + (title ? ": " + title : "")
const PAGE_HEAD = /^#[ \t]+.*?[ \t]*[—\-][ \t]*page[ \t]*(\d+)[ \t]*(?::[ \t]*(.*?))?[ \t]*$/i;
const META = /^(status|priority|open question|openquestion|tags?)[ \t]*:[ \t]*(.*)$/i;
const SECTION_HEAD = /^\*\*(.+?)\*\*[ \t]*$/;
const HEADER_LINE = /^\[header\][ \t]?(.*)$/i;
const FOOTER_LINE = /^\[footer\][ \t]?(.*)$/i;

export function isRule(line) {
  return trim(line) === "---";
}


export function csvRows(raw) {
  const s = text(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let live = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (quoted) {
      if (c === '"') {
        if (s.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
      live = true;
      continue;
    }
    if (c === '"') {
      quoted = true;
      live = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      live = true;
    } else if (c === "\n") {
      row.push(field);
      if (live || row.length > 1 || trim(row[0]) !== "") rows.push(row);
      row = [];
      field = "";
      live = false;
    } else {
      field += c;
      if (trim(c)) live = true;
    }
  }
  if (live || field !== "") {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const CSV_HEADERS = {
  name: "name",
  title: "name",
  card: "name",
  summary: "summary",
  description: "summary",
  logline: "summary",
  tags: "tags",
  tag: "tags",
  status: "status",
  state: "status",
  body: "body",
  content: "body",
  text: "body",
  notes: "body",
  folder: "folder",
  group: "folder",
  priority: "priority",
  "open question": "openQuestion",
  openquestion: "openQuestion",
};

export function looksCsv(raw) {
  const rows = csvRows(raw);
  if (rows.length < 1 || rows[0].length < 2) return { ok: false, rows: rows };
  let named = 0;
  for (let i = 0; i < rows[0].length; i++) {
    if (CSV_HEADERS[trim(rows[0][i]).toLowerCase()]) named += 1;
  }
  if (named >= 2) return { ok: true, rows: rows, header: true };
  // No header: accept only a rectangle — every row the same width, at least two columns.
  const w = rows[0].length;
  let same = 0;
  for (let i = 0; i < rows.length; i++) if (rows[i].length === w) same += 1;
  return { ok: rows.length > 1 && same === rows.length, rows: rows, header: false };
}

// GUARD: either stage saying no returns { ok: false } and detect() carries on — a failed detection
//   is never an error, just a different reader.
export function firstGlyph(raw) {
  const s = text(raw);
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === "\v") continue;
    return c;
  }
  return "";
}

export function looksJson(raw) {
  const g = firstGlyph(raw);
  if (g !== "{" && g !== "[") return { ok: false };
  let got;
  try {
    got = SPEC.parse(raw, {});
  } catch (e) {
    return { ok: false };
  }
  if (!got || got.ok !== true || !((got.cards || []).length > 0)) return { ok: false };
  return { ok: true, got: got };
}

export function detect(raw) {
  const t = text(raw);
  if (!trim(t)) return { format: "markdown", why: "nothing pasted yet" };
  // Asked first: a JSON string can legally hold anything the other detectors look for.
  const asJson = looksJson(t);
  if (asJson.ok) {
    const n = asJson.got.cards.length;
    return { format: "json", why: "a JSON card block — " + n + " card" + (n === 1 ? "" : "s") };
  }
  const heading = HEAD.test(t) || /^#{1,6}[ \t]+\S/m.test(t);
  if (heading) {
    let marks = 0;
    const why = [];
    if (/^#{2,6}[ \t]+\S/m.test(t)) {
      marks += 1;
      why.push("nested headings");
    }
    if (/[—\-][ \t]*page[ \t]*\d+/i.test(t)) {
      marks += 1;
      why.push("page rules");
    }
    if (/^\*\*[^*]+\*\*[ \t]*$/m.test(t)) {
      marks += 1;
      why.push("**section** blocks");
    }
    if (/^(status|priority|open question)[ \t]*:/im.test(t)) {
      marks += 1;
      why.push("card metadata lines");
    }
    if (marks >= 2) return { format: "codexbuilder-md", why: "this app's own export — " + why.join(", ") };
    return { format: "markdown", why: "markdown headings, no card metadata" };
  }
  const csv = looksCsv(t);
  if (csv.ok) return { format: "csv", why: csv.header ? "a header row of known column names" : "even comma-separated columns" };
  return { format: "markdown", why: "no headings and no columns — read as one card" };
}


// A card's body, exactly as cardAsText wrote it.
export function cardFromRaw(name, raw, ctx) {
  const card = newCard(name);
  const L = splitLines(raw);
  let i = 0;

  // 1. the metadata lines that sit directly under the heading
  for (; i < L.length; i++) {
    const line = L[i];
    if (trim(line) === "") break;
    const m = line.match(META);
    if (!m) break;
    const key = m[1].toLowerCase();
    const val = trim(m[2]);
    if (key === "status") card.status = clip(val, 40);
    else if (key === "priority") card.priority = Math.max(0, Math.min(9, Math.floor(Number(val) || 0)));
    else if (key === "open question" || key === "openquestion") card.openQuestion = /^(yes|true|1|y)$/i.test(val);
    else card.tags = splitTags(val);
  }

  // 2. everything else, cut at the first page rule
  const rest = [];
  const pageChunks = [];
  let chunk = null;
  for (; i < L.length; i++) {
    const line = L[i];
    if (isRule(line)) {
      chunk = [];
      pageChunks.push(chunk);
      continue;
    }
    if (chunk) chunk.push(line);
    else rest.push(line);
  }

  // 3. the summary paragraph, then the **Section** blocks
  const body = blank(rest);
  let section = null;
  const summary = [];
  for (let k = 0; k < body.length; k++) {
    const line = body[k];
    const sh = line.match(SECTION_HEAD);
    if (sh) {
      section = { name: clip(trim(sh[1]), CAPS.name), content: [] };
      card.sections.push(section);
      continue;
    }
    if (section) section.content.push(line);
    else summary.push(line);
  }
  card.summary = clip(blank(summary).join("\n"), CAPS.summary);
  for (let k = 0; k < card.sections.length; k++) {
    card.sections[k].content = blank(card.sections[k].content).join("\n");
  }
  if (card.sections.length > CAPS.sections) {
    ctx.warn(card.name + ": " + card.sections.length + " sections — kept the first " + CAPS.sections);
    card.sections = card.sections.slice(0, CAPS.sections);
  }

  // 4. the pages
  for (let k = 0; k < pageChunks.length; k++) {
    const page = pageFromChunk(pageChunks[k]);
    if (page) card.pages.push(page);
  }
  if (card.pages.length > CAPS.pages) {
    ctx.warn(card.name + ": " + card.pages.length + " pages — kept the first " + CAPS.pages);
    card.pages = card.pages.slice(0, CAPS.pages);
  }
  return card;
}

export function pageFromChunk(rawLines) {
  const L = blank(rawLines || []);
  if (!L.length) return null;
  const page = { title: "", header: "", footer: "", content: "" };
  let i = 0;
  const first = L[0];
  const ph = first.match(PAGE_HEAD);
  if (ph) {
    page.title = clip(trim(ph[2] || ""), CAPS.name);
    i = 1;
  } else if (HEAD.test(first)) {
    // a heading that is not one of ours: keep its words as the page title, drop the hashes
    page.title = clip(trim(first.replace(/^#{1,6}[ \t]+/, "")), CAPS.name);
    i = 1;
  }
  const rest = [];
  for (; i < L.length; i++) {
    const line = L[i];
    const h = line.match(HEADER_LINE);
    if (h && !page.header && trim(rest.join("")) === "") {
      page.header = clip(trim(h[1]), CAPS.name);
      continue;
    }
    const f = line.match(FOOTER_LINE);
    if (f) {
      page.footer = clip(trim(f[1]), CAPS.name);
      continue;
    }
    rest.push(line);
  }
  page.content = blank(rest).join("\n");
  if (!page.content && !page.title && !page.header && !page.footer) return null;
  return page;
}

export function splitTags(v) {
  const s = trim(v);
  if (!s) return [];
  const parts = s.split(/[;,|]/);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const t = clip(trim(parts[i]).replace(/^#/, ""), 40);
    if (t && out.indexOf(t) < 0) out.push(t);
  }
  return out.slice(0, CAPS.tags);
}

export function shapeNode(node, ctx, depth) {
  const kids = node.children || [];
  const hasBody = trim(node.raw) !== "";
  if (!kids.length) return cardFromRaw(node.name, node.raw, ctx);
  if (depth >= CAPS.depth) {
    ctx.warn(node.name + ": nested deeper than " + CAPS.depth + " levels — flattened into one card");
    return cardFromRaw(node.name, node.raw, ctx);
  }
  const folder = newFolder(node.name);
  if (hasBody) {
    ctx.warn(node.name + ": had text AND headings under it — the text became a card inside a folder of that name");
    folder.children.push(cardFromRaw(node.name, node.raw, ctx));
  }
  for (let i = 0; i < kids.length; i++) folder.children.push(shapeNode(kids[i], ctx, depth + 1));
  return folder;
}

export function nextIsDeeperHeading(L, at) {
  for (let i = at + 1; i < L.length; i++) {
    if (trim(L[i]) === "") continue;
    const m = L[i].match(HEAD);
    return !!(m && m[1].length >= 2);
  }
  return false;
}

export function parseCodexBuilder(raw, opts, ctx) {
  const L = splitLines(raw);
  const books = [];
  let book = null;
  const stack = [];
  let cur = null;
  let buf = [];
  let sawRule = false;
  const loose = [];

  function openBook(name) {
    book = { name: clip(trim(name) || trim(opts.bookName) || "Imported Book", CAPS.name), children: [], pre: [] };
    books.push(book);
    stack.length = 0;
    cur = null;
    buf = [];
    sawRule = false;
  }

  function closeNode() {
    if (cur) cur.raw = buf.join("\n");
    cur = null;
    buf = [];
    sawRule = false;
  }

  for (let i = 0; i < L.length; i++) {
    const line = L[i];
    const m = line.match(HEAD);
    if (m) {
      const level = m[1].length;
      if (level === 1) {
        // GUARD: inside a page, a level-1 heading is a book boundary ONLY when a deeper heading follows —
        //   prose can hold any heading it likes.
        if (cur && sawRule && !PAGE_HEAD.test(line) && !nextIsDeeperHeading(L, i)) {
          buf.push(line);
          continue;
        }
        if (cur && sawRule && PAGE_HEAD.test(line)) {
          buf.push(line);
          continue;
        }
        closeNode();
        openBook(m[2]);
        continue;
      }
      if (!book) openBook("");
      closeNode();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const node = { name: clip(trim(m[2]), CAPS.name), level: level, children: [], raw: "" };
      const parent = stack.length ? stack[stack.length - 1].node : book;
      parent.children.push(node);
      stack.push({ level: level, node: node });
      cur = node;
      buf = [];
      continue;
    }
    if (cur) {
      if (isRule(line)) sawRule = true;
      buf.push(line);
      continue;
    }
    if (book) book.pre.push(line);
    else loose.push(line);
  }
  closeNode();

  if (!books.length) {
    // No headings at all: one card holding the whole text.
    const only = { name: clip(trim(opts.bookName) || "Imported Book", CAPS.name), children: [], pre: loose };
    books.push(only);
    ctx.warn("no headings found — the whole paste became one card");
  } else if (blank(loose).length) {
    ctx.warn("text above the first heading was skipped (" + blank(loose).length + " line(s))");
  }

  const out = [];
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const shaped = { name: b.name, children: [] };
    const pre = blank(b.pre || []);
    if (pre.length) {
      const card = cardFromRaw(b.children.length ? "Front Matter" : b.name, pre.join("\n"), ctx);
      shaped.children.push(card);
      if (b.children.length) ctx.warn(b.name + ": loose text under the book heading became a card called Front Matter");
    }
    for (let k = 0; k < b.children.length; k++) shaped.children.push(shapeNode(b.children[k], ctx, 1));
    out.push(shaped);
  }
  return out;
}


export function parseMarkdown(raw, opts, ctx) {
  const L = splitLines(raw);
  const heads = [];
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(HEAD);
    if (m) heads.push({ level: m[1].length, name: trim(m[2]), at: i });
  }
  const book = { name: clip(trim(opts.bookName) || "Imported Document", CAPS.name), children: [] };
  if (!heads.length) {
    const card = newCard(book.name);
    const body = blank(L).join("\n");
    if (body) {
      card.summary = clip(firstParagraph(body), 240);
      card.pages.push({ title: "", header: "", footer: "", content: body });
    }
    book.children.push(card);
    ctx.warn("no headings found — the whole paste became one card");
    return [book];
  }

  let top = heads[0].level;
  for (let i = 0; i < heads.length; i++) if (heads[i].level < top) top = heads[i].level;
  let count = 0;
  for (let i = 0; i < heads.length; i++) if (heads[i].level === top) count += 1;
  let cardLevel = top;
  let deeper = 0;
  for (let i = 0; i < heads.length; i++) if (heads[i].level > top && (!deeper || heads[i].level < deeper)) deeper = heads[i].level;
  if (count === 1 && deeper) {
    book.name = clip(heads[0].name, CAPS.name);
    cardLevel = deeper;
    ctx.warn('the single "' + book.name + '" heading was read as the book title; level-' + cardLevel + " headings became cards");
  }

  const marks = [];
  for (let i = 0; i < heads.length; i++) if (heads[i].level === cardLevel) marks.push(heads[i]);
  const preEnd = marks.length ? marks[0].at : L.length;
  const pre = blank(L.slice(0, preEnd).filter((line, idx) => !(cardLevel !== top && idx === heads[0].at)));
  if (pre.length && trim(pre.join("")) !== "") {
    const card = newCard("Front Matter");
    const body = pre.join("\n").replace(/^#{1,6}[ \t]+.*$/m, "").replace(/^\n+/, "");
    if (trim(body)) {
      card.summary = clip(firstParagraph(body), 240);
      card.pages.push({ title: "", header: "", footer: "", content: trim(body) });
      book.children.push(card);
      ctx.warn("text above the first card heading became a card called Front Matter");
    }
  }

  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].at + 1;
    const end = i + 1 < marks.length ? marks[i + 1].at : L.length;
    const card = newCard(marks[i].name);
    const body = blank(L.slice(start, end)).join("\n");
    if (trim(body)) {
      card.summary = clip(firstParagraph(body), 240);
      card.pages.push({ title: "", header: "", footer: "", content: body });
    }
    book.children.push(card);
  }
  return [book];
}

export function firstParagraph(body) {
  const L = blank(splitLines(body));
  const out = [];
  for (let i = 0; i < L.length; i++) {
    const line = L[i];
    if (trim(line) === "") {
      if (out.length) break;
      continue;
    }
    if (HEAD.test(line) || SECTION_HEAD.test(line) || isRule(line)) {
      if (out.length) break;
      continue;
    }
    out.push(trim(line));
  }
  return out.join(" ");
}


export function parseCsvDoc(raw, opts, ctx) {
  const shape = looksCsv(raw);
  const rows = shape.rows || [];
  const book = { name: clip(trim(opts.bookName) || "Imported Table", CAPS.name), children: [] };
  if (!rows.length) {
    ctx.warn("no rows found in that table");
    return [book];
  }
  let cols = ["name", "summary", "tags", "status", "body"];
  let start = 0;
  if (shape.header) {
    cols = [];
    for (let i = 0; i < rows[0].length; i++) cols.push(CSV_HEADERS[trim(rows[0][i]).toLowerCase()] || "");
    start = 1;
  } else {
    ctx.warn("no header row — columns read in order: name, summary, tags, status, body");
  }

  const folders = {};
  let skippedBlank = 0;
  for (let r = start; r < rows.length; r++) {
    const row = rows[r];
    const cell = {};
    for (let c = 0; c < row.length; c++) {
      const key = cols[c] || "";
      if (!key) continue;
      cell[key] = cell[key] ? cell[key] + "\n" + text(row[c]) : text(row[c]);
    }
    const name = trim(cell.name);
    if (!name && !trim(cell.body) && !trim(cell.summary)) {
      skippedBlank += 1;
      continue;
    }
    const card = newCard(name || "Row " + (r - start + 1));
    card.summary = clip(trim(cell.summary), CAPS.summary);
    card.status = clip(trim(cell.status), 40);
    card.priority = Math.max(0, Math.min(9, Math.floor(Number(trim(cell.priority)) || 0)));
    card.openQuestion = /^(yes|true|1|y)$/i.test(trim(cell.openQuestion));
    card.tags = splitTags(cell.tags);
    const body = text(cell.body).replace(/\\n/g, "\n");
    if (trim(body)) card.pages.push({ title: "", header: "", footer: "", content: trim(body) });

    const path = trim(cell.folder);
    if (!path) {
      book.children.push(card);
      continue;
    }
    const parts = path.split("/");
    let holder = book;
    let key = "";
    for (let p = 0; p < parts.length && p < CAPS.depth; p++) {
      const seg = trim(parts[p]);
      if (!seg) continue;
      key += "/" + seg.toLowerCase();
      let folder = folders[key];
      if (!folder) {
        folder = newFolder(seg);
        folders[key] = folder;
        holder.children.push(folder);
      }
      holder = folder;
    }
    holder.children.push(card);
  }
  if (skippedBlank) ctx.warn(skippedBlank + " empty row(s) skipped");
  return [book];
}

// Turns cardspec's canonical cards into the SAME node tree the three readers above produce. Two key
//   renames, nothing else: card.title -> node.name, page.body -> page.content.

const JSON_DEPTH = 4; // folders deep from the book root (cardspec caps its own path at 4 as well)

export function jsonCardNode(card, ctx) {
  const node = newCard(card.title);
  node.summary = clip(trim(card.summary), CAPS.summary);
  node.status = clip(trim(card.status), 40);
  node.openQuestion = card.openQuestion === true;

  const tags = card.tags || [];
  for (let i = 0; i < tags.length && node.tags.length < CAPS.tags; i++) {
    const t = clip(trim(tags[i]), 40);
    if (t && node.tags.indexOf(t) < 0) node.tags.push(t);
  }
  if (tags.length > CAPS.tags) ctx.warn(node.name + ": " + tags.length + " tags — kept the first " + CAPS.tags);

  const sections = card.sections || [];
  for (let i = 0; i < sections.length && i < CAPS.sections; i++) {
    const s = sections[i] || {};
    node.sections.push({ name: clip(trim(s.name), CAPS.name), content: text(s.content) });
  }
  if (sections.length > CAPS.sections) {
    ctx.warn(node.name + ": " + sections.length + " sections — kept the first " + CAPS.sections);
  }

  const pages = card.pages || [];
  for (let i = 0; i < pages.length && i < CAPS.pages; i++) {
    const p = pages[i] || {};
    node.pages.push({
      title: clip(trim(p.title), CAPS.name),
      header: clip(trim(p.header), CAPS.name),
      footer: clip(trim(p.footer), CAPS.name),
            content: text(p.body),
    });
  }
  if (pages.length > CAPS.pages) {
    ctx.warn(node.name + ": " + pages.length + " pages — kept the first " + CAPS.pages);
  }

  // A label for the window only — the folder itself is a real node in the tree.
  node.folderLabel = clip(trim(card.folder), CAPS.folder || 300);
  return node;
}

export function parseJsonDoc(raw, opts, ctx) {
  const book = { name: clip(trim(opts.bookName) || "Imported Cards", CAPS.name), children: [] };
  let got;
  try {
    got = SPEC.parse(raw, {});
  } catch (e) {
    ctx.warn("that JSON could not be read as cards: " + msg(e));
    return [book];
  }
  if (!got || got.ok !== true) {
    // cardspec's refusal is already one sentence addressed to the author — passed through whole, so
    // the window shows its words and not a paraphrase of them (house rule 4).
    ctx.warn(text(got && got.error) || "that JSON could not be read as cards");
    return [book];
  }
  for (let i = 0; i < (got.warnings || []).length; i++) ctx.warn(got.warnings[i]);

  const folders = {};
  const cards = got.cards || [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] || {};
    const node = jsonCardNode(card, ctx);
    const whole = card.folderPath || [];
    const path = whole.slice(0, JSON_DEPTH);
    if (whole.length > JSON_DEPTH) {
      ctx.warn(node.name + ': folder path more than ' + JSON_DEPTH + ' deep — kept "' + path.join("/") + '"');
    }
    let holder = book;
    let key = "";
    for (let p = 0; p < path.length; p++) {
      const seg = trim(path[p]);
      if (!seg) continue;
      key += "/" + seg.toLowerCase();
      let folder = folders[key];
      if (!folder) {
        folder = newFolder(seg);
        // apply(): look for a folder of this name before making one, in every mode.
        folder.reuse = true;
        folders[key] = folder;
        holder.children.push(folder);
      }
      holder = folder;
    }
    holder.children.push(node);
  }
  return [book];
}

// ---------------------------------------------------------------- counting + caps

export function walk(nodes, fn, depth) {
  const d = depth || 0;
  for (let i = 0; i < (nodes || []).length; i++) {
    const n = nodes[i];
    fn(n, d);
    if (n && n.kind === "folder") walk(n.children, fn, d + 1);
  }
}

export function countBooks(books) {
  const c = emptyCounts();
  c.books = (books || []).length;
  for (let i = 0; i < (books || []).length; i++) {
    walk(books[i].children, function (n) {
      if (!n) return;
      if (n.kind === "folder") {
        c.folders += 1;
        return;
      }
      c.cards += 1;
      c.sections += (n.sections || []).length;
      c.pages += (n.pages || []).length;
      c.tags += (n.tags || []).length;
      c.words += countWords(n.summary);
      for (let s = 0; s < (n.sections || []).length; s++) c.words += countWords(n.sections[s].content);
      for (let p = 0; p < (n.pages || []).length; p++) c.words += countWords(n.pages[p].content);
    });
  }
  return c;
}

// Cut the tree down to what a book survives, in reading order, and say where the cut fell.
export function enforceCaps(books, ctx) {
  const left = { cards: CAPS.cards, folders: CAPS.folders };
  let cut = false;

  function prune(list) {
    const keep = [];
    for (let i = 0; i < (list || []).length; i++) {
      const n = list[i];
      if (!n) continue;
      if (n.kind === "folder") {
        if (left.folders <= 0) {
          cut = true;
          continue;
        }
        left.folders -= 1;
        n.children = prune(n.children);
        keep.push(n);
        continue;
      }
      if (left.cards <= 0) {
        cut = true;
        continue;
      }
      left.cards -= 1;
      keep.push(n);
    }
    return keep;
  }

  const out = (books || []).slice(0, CAPS.books);
  if ((books || []).length > CAPS.books) {
    cut = true;
    ctx.warn("more than " + CAPS.books + " books in that paste — kept the first " + CAPS.books);
  }
  for (let i = 0; i < out.length; i++) out[i].children = prune(out[i].children);
  if (cut) ctx.warn("this import is capped at " + CAPS.cards + " cards and " + CAPS.folders + " folders — the rest was left out");
  return { books: out, truncated: cut };
}

// ---------------------------------------------------------------- parse (pure)

export function parse(raw, opts) {
  const o = opts || {};
  const ctx = {
    warnings: [],
    warn: function (w) {
      const s = trim(w);
      if (s && ctx.warnings.indexOf(s) < 0 && ctx.warnings.length < 40) ctx.warnings.push(s);
    },
  };
  let src = text(raw);
  let clipped = false;
  if (src.length > CAPS.chars) {
    src = src.slice(0, CAPS.chars);
    clipped = true;
    ctx.warn("that paste is longer than " + CAPS.chars + " characters — only the first " + CAPS.chars + " were read");
  }
  const det = detect(src);
  const asked = trim(o.format);
  const format = FORMATS.indexOf(asked) >= 0 ? asked : det.format;

  if (!trim(src)) {
    return {
      ok: false,
      format: format,
      detected: det.format,
      why: det.why,
      override: false,
      books: [],
      counts: emptyCounts(),
      warnings: ["paste the document's text into the box first — this window cannot open a file picker"],
      truncated: false,
      chars: 0,
    };
  }

  let books = [];
  try {
    if (format === "csv") books = parseCsvDoc(src, o, ctx);
    else if (format === "json") books = parseJsonDoc(src, o, ctx);
    else if (format === "markdown") books = parseMarkdown(src, o, ctx);
    else books = parseCodexBuilder(src, o, ctx);
  } catch (e) {
    return {
      ok: false,
      format: format,
      detected: det.format,
      why: det.why,
      override: format !== det.format,
      books: [],
      counts: emptyCounts(),
      warnings: ctx.warnings.concat(["that text could not be read as " + format + ": " + msg(e)]),
      truncated: clipped,
      chars: src.length,
    };
  }

  const capped = enforceCaps(books, ctx);
  const counts = countBooks(capped.books);
  if (!counts.cards) ctx.warn("nothing card-shaped was found in that text");
  return {
    ok: counts.cards > 0,
    format: format,
    detected: det.format,
    why: det.why,
    override: format !== det.format,
    bookName: (capped.books[0] && capped.books[0].name) || trim(o.bookName) || "Imported Book",
    books: capped.books,
    counts: counts,
    warnings: ctx.warnings,
    truncated: capped.truncated || clipped,
    chars: src.length,
  };
}

// ---------------------------------------------------------------- the quiet window The repository records one row per write; an import is ONE gesture, so its own rows are held back while it runs and one IMPORT_DOCUMENT row is written at the end. Scoped two ways — only the books this import writes into, only create-shaped types — so anything else recording in the same milliseconds is forwarded untouched.

const QUIET_TYPES = {
  CREATE_CARD: 1,
  CREATE_FOLDER: 1,
  CREATE_SECTION: 1,
  CREATE_PAGE: 1,
  SET_CARD_META: 1,
  SET_PAGE_CONTENT: 1,
  SET_PAGE_CHROME: 1,
  SET_SECTION_CONTENT: 1,
  ADD_TAG: 1,
  RENAME_CARD: 1,
  TRASH_CARD: 1,
  TRASH_FOLDER: 1,
  RESTORE_CARD: 1,
  RESTORE_FOLDER: 1,
};

export function quiet() {
  const log = CHANGELOG && typeof CHANGELOG.record === "function" ? CHANGELOG : null;
  const mine = {};
  const state = { held: 0, closed: false, ok: false };
  if (!log) {
    return {
      add: function () {},
      close: function () {
        return state;
      },
      state: state,
    };
  }
  const real = log.record;
  const wrapper = function (api, cmd) {
    const c = cmd || {};
    if (!state.closed && mine[text(c.bookId)] && QUIET_TYPES[text(c.type)]) {
      state.held += 1;
      return Promise.resolve(0);
    }
    return real.call(log, api, cmd);
  };
  log.record = wrapper;
  state.ok = log.record === wrapper;
  return {
    add: function (bookId) {
      if (text(bookId)) mine[text(bookId)] = true;
    },
    close: function () {
      state.closed = true;
      if (log.record === wrapper) log.record = real;
      return state;
    },
    state: state,
  };
}

// ---------------------------------------------------------------- the command, and its inverse

export function declareCommand() {
  const table = CHANGELOG && CHANGELOG.COMMANDS;
  if (table && !table[COMMAND]) {
    table[COMMAND] = { undoable: true, structural: true, target: "book" };
  }
  if (CHANGELOG && typeof CHANGELOG.registerUndo === "function") CHANGELOG.registerUndo(COMMAND, reverseImport);
  return !!(table && table[COMMAND]);
}

// Undo takes the import back (trash, so nothing is destroyed); redo puts it back. Both walk the
// roots the command wrote — folders take their contents with them, so only the roots are listed.
export async function reverseImport(objectApi, row, side) {
  const after = (row && row.after) || {};
  const roots = after.roots || [];
  const q = quiet();
  let moved = 0;
  let left = 0;
  try {
    for (let i = 0; i < roots.length; i++) q.add(text((roots[i] || {}).bookId) || text(row.bookId));
    const order = side === "before" ? roots.slice().reverse() : roots.slice();
    for (let i = 0; i < order.length; i++) {
      const r = order[i] || {};
      const bookId = text(r.bookId) || text(row.bookId);
      try {
        if (side === "before") {
          if (r.kind === "folder") await CARDS.trashFolder(objectApi, bookId, r.id, {});
          else await CARDS.trashCard(objectApi, bookId, r.id, {});
        } else {
          if (r.kind === "folder") await CARDS.restoreFolder(objectApi, bookId, r.id, {});
          else await CARDS.restoreCard(objectApi, bookId, r.id, {});
        }
        moved += 1;
      } catch (e) {
        left += 1;
        objectApi.log("[import] reversal left " + r.kind + " " + r.id + " alone: " + msg(e));
      }
    }
  } finally {
    q.close();
  }
  if (left) objectApi.log("[import] reversal moved " + moved + " of " + roots.length + " roots — " + left + " had moved on");
  return moved;
}

// ---------------------------------------------------------------- apply (the writes)

export function normalizeMode(mode) {
  const m = trim(mode).toLowerCase();
  for (let i = 0; i < MODES.length; i++) if (MODES[i] === m) return MODES[i];
  if (m === "new" || m === "book" || m === "newbook") return "new book";
  if (m === "merge" || m === "mergebyname") return "merge by name";
  return "into folder";
}

export function emptyReport(mode) {
  return {
    ok: false,
    mode: mode,
    bookId: "",
    bookName: "",
    books: [],
    created: { books: 0, folders: 0, cards: 0, sections: 0, pages: 0, tags: 0 },
    merged: { cards: 0, sections: 0, pages: 0, tags: 0 },
    kept: 0,
    skipped: [],
    warnings: [],
    errors: [],
    seq: 0,
    oneCommand: false,
    held: 0,
  };
}

export async function projectOf(objectApi, bookId, given) {
  if (trim(given)) return trim(given);
  try {
    // An id-to-project lookup, not a listing: nothing here reads a book's contents, so the
    // cross-project read is safe and deliberate (see lib/library.js list()).
    const books = await LIB.list(objectApi, null, { allProjects: true });
    for (let i = 0; i < (books || []).length; i++) {
      if (text(books[i].id) === text(bookId)) return text(books[i].projectId);
    }
  } catch (e) {
    objectApi.log("[import] could not read the shelf for a projectId: " + msg(e));
  }
  return "";
}

export async function writeCard(objectApi, bookId, folderId, node, actor, report) {
  let row;
  try {
    row = await CARDS.createCardRow(objectApi, bookId, { name: node.name, folderId: folderId, actor: actor });
  } catch (e) {
    report.skipped.push({ kind: "card", name: node.name, reason: msg(e) });
    return null;
  }
  const settled = await CARDS.settleOf(bookId, row.id);
  if (settled && settled.ok === false) {
    report.skipped.push({ kind: "card", name: node.name, reason: text(settled.error) || "the insert did not land" });
    return null;
  }
  report.created.cards += 1;
  await fillCard(objectApi, bookId, row.id, node, actor, report, null);
  return row;
}

// Everything under a card: metadata, sections, pages, tags. `existing` non-null = a merge, where
// nothing already written is overwritten — blanks are filled and new material is appended.
export async function fillCard(objectApi, bookId, cardId, node, actor, report, existing) {
  const patch = {};
  if (node.summary && (!existing || !trim(existing.summary))) patch.summary = node.summary;
  if (node.status && (!existing || !trim(existing.status))) patch.status = node.status;
  if (node.priority && (!existing || !Number(existing.priority))) patch.priority = node.priority;
  if (node.openQuestion && (!existing || !existing.openQuestion)) patch.openQuestion = true;
  if (Object.keys(patch).length) {
    try {
      await CARDS.setMeta(objectApi, bookId, cardId, patch, { actor: actor });
    } catch (e) {
      report.skipped.push({ kind: "meta", name: node.name, reason: msg(e) });
    }
  }

  let haveSections = [];
  let havePages = [];
  if (existing) {
    try {
      haveSections = await CARDS.listSections(objectApi, bookId, cardId);
    } catch (e) {
      haveSections = [];
    }
    try {
      havePages = await CARDS.listPages(objectApi, bookId, cardId);
    } catch (e) {
      havePages = [];
    }
  }

  for (let i = 0; i < (node.sections || []).length; i++) {
    const s = node.sections[i];
    const mine = matchByName(haveSections, s.name);
    try {
      if (mine) {
        if (trim(s.content) && !trim(mine.content)) {
          await CARDS.setSectionContent(objectApi, bookId, mine.id, s.content, { actor: actor });
          report.merged.sections += 1;
        } else report.kept += 1;
        continue;
      }
      const id = await CARDS.createSection(objectApi, bookId, cardId, { name: s.name, actor: actor });
      if (trim(s.content)) await CARDS.setSectionContent(objectApi, bookId, id, s.content, { actor: actor });
      if (existing) report.merged.sections += 1;
      else report.created.sections += 1;
    } catch (e) {
      report.skipped.push({ kind: "section", name: node.name + " ▸ " + s.name, reason: msg(e) });
    }
  }

  for (let i = 0; i < (node.pages || []).length; i++) {
    const p = node.pages[i];
    if (existing && hasSameContent(havePages, p.content)) {
      report.kept += 1;
      continue;
    }
    try {
      const id = await CARDS.createPage(objectApi, bookId, cardId, { title: p.title, actor: actor });
      if (trim(p.content)) await CARDS.setPageContent(objectApi, bookId, id, p.content, { actor: actor });
      if (trim(p.header) || trim(p.footer)) {
        await CARDS.setPageChrome(objectApi, bookId, id, { header: p.header, footer: p.footer }, { actor: actor });
      }
      if (existing) report.merged.pages += 1;
      else report.created.pages += 1;
    } catch (e) {
      report.skipped.push({ kind: "page", name: node.name + " ▸ page " + (i + 1), reason: msg(e) });
    }
  }

  for (let i = 0; i < (node.tags || []).length; i++) {
    const name = node.tags[i];
    try {
      const tagId = await CARDS.ensureTag(objectApi, bookId, name, { actor: actor });
      await CARDS.addTag(objectApi, bookId, cardId, tagId, { actor: actor });
      if (existing) report.merged.tags += 1;
      else report.created.tags += 1;
    } catch (e) {
      report.skipped.push({ kind: "tag", name: node.name + " ▸ #" + name, reason: msg(e) });
    }
  }
}

export function matchByName(list, name) {
  const want = trim(name).toLowerCase();
  if (!want) return null;
  for (let i = 0; i < (list || []).length; i++) {
    if (trim(list[i].name).toLowerCase() === want) return list[i];
  }
  return null;
}

export function hasSameContent(pages, content) {
  const want = trim(content);
  if (!want) return true;
  for (let i = 0; i < (pages || []).length; i++) {
    if (trim(pages[i].content) === want) return true;
  }
  return false;
}

// One level of the tree into one folder. Roots (depth 0) are remembered for the undo manifest.
export async function writeLevel(objectApi, bookId, folderId, nodes, actor, report, roots, merge) {
  // ONE listing per level, read at most once and only when something here needs it: a merge, or a folder node from a path that must reuse a folder of its name. js: nothing sets it), so a folder can only be recognised through listFolders, the folders sitting directly inside this parent.
  let tiles = null;
  let readTiles = false;
  async function tilesOf() {
    if (readTiles) return tiles;
    readTiles = true;
    try {
      tiles = await CARDS.listFolder(objectApi, bookId, folderId);
    } catch (e) {
      tiles = [];
      report.warnings.push("could not read " + folderId + " to merge into — everything was created new");
    }
    return tiles;
  }
  let subs = null;
  let readSubs = false;
  async function foldersOf() {
    if (readSubs) return subs;
    readSubs = true;
    try {
      subs = await CARDS.listFolders(objectApi, bookId, folderId);
    } catch (e) {
      subs = [];
      report.warnings.push("could not read the folders in " + folderId + " — everything was created new");
    }
    return subs;
  }
  if (merge) await tilesOf();
  for (let i = 0; i < (nodes || []).length; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (node.kind === "folder") {
      const hit = merge || node.reuse ? matchFolderTile(await foldersOf(), node.name) : null;
      if (hit) {
        report.kept += 1;
        // A folder we did NOT make: its contents are ours, so they go on the undo manifest themselves (trashing the folder would take the author's own cards). In a merge this stays exactly as it was — null, today's behaviour.
        await writeLevel(objectApi, bookId, hit.id, node.children, actor, report, merge ? null : roots, merge);
        continue;
      }
      let row;
      try {
        row = await CARDS.createFolderRow(objectApi, bookId, { name: node.name, folderId: folderId, actor: actor });
      } catch (e) {
        report.skipped.push({ kind: "folder", name: node.name, reason: msg(e) });
        continue;
      }
      const settled = await CARDS.folderSettleOf(bookId, row.id);
      if (settled && settled.ok === false) {
        report.skipped.push({ kind: "folder", name: node.name, reason: text(settled.error) || "the insert did not land" });
        continue;
      }
      report.created.folders += 1;
      // Keep this level's folder listing true, so a second node of the same name in the same paste
      // lands in the folder we just made instead of minting "Lore (2)" beside it.
      if (readSubs && subs) subs.push({ id: row.id, name: row.name, folderId: folderId });
      if (roots) roots.push({ kind: "folder", id: row.id, bookId: bookId, name: row.name });
      await writeLevel(objectApi, bookId, row.id, node.children, actor, report, null, merge);
      continue;
    }
    const hit = merge ? matchCardTile(tiles, node.name) : null;
    if (hit) {
      let card = null;
      try {
        card = await CARDS.getCard(objectApi, bookId, hit.id);
      } catch (e) {
        card = null;
      }
      if (card) {
        report.merged.cards += 1;
        await fillCard(objectApi, bookId, card.id, node, actor, report, card);
        continue;
      }
    }
    const row = await writeCard(objectApi, bookId, folderId, node, actor, report);
    if (row && roots) roots.push({ kind: "card", id: row.id, bookId: bookId, name: row.name });
  }
}

// Fed the FOLDER listing (listFolders), so every row here is already a folder — the name, matched
// case-insensitively, is the whole test. Same rule the repository's own uniqueness uses.
export function matchFolderTile(folders, name) {
  const want = trim(name).toLowerCase();
  for (let i = 0; i < (folders || []).length; i++) {
    const t = folders[i];
    if (t && trim(t.name).toLowerCase() === want) return t;
  }
  return null;
}

export function matchCardTile(tiles, name) {
  const want = trim(name).toLowerCase();
  for (let i = 0; i < (tiles || []).length; i++) {
    const t = tiles[i];
    if (t && !t.isFolder && trim(t.name).toLowerCase() === want) return t;
  }
  return null;
}

/**
 * preview: what parse() returned.
 * target:  { projectId?, bookId?, folderId?, bookName?, actor? }
 * mode:    "new book" | "into folder" | "merge by name"
 */
export async function apply(objectApi, preview, target, mode) {
  const m = normalizeMode(mode);
  const t = target || {};
  const actor = text(t.actor);
  const report = emptyReport(m);
  const books = (preview && preview.books) || [];
  if (!preview || !preview.ok || !books.length) {
    report.errors.push("nothing to import — parse the text first");
    return report;
  }

  const roots = [];
  const q = quiet();
  let mainBookId = "";
  let mainBookName = "";
  let projectId = trim(t.projectId);

  try {
    if (m === "new book") {
      if (!projectId) {
        projectId = await projectOf(objectApi, trim(t.bookId), "");
        if (!projectId) {
          report.errors.push("a new book needs a project — open one first");
          return report;
        }
      }
      for (let i = 0; i < books.length; i++) {
        const wanted = i === 0 ? trim(t.bookName) || books[i].name : books[i].name;
        let row;
        try {
          row = await LIB.addRow(objectApi, projectId, wanted, actor);
        } catch (e) {
          report.errors.push("the book could not be made: " + msg(e));
          break;
        }
        if (!row) {
          report.errors.push("the book could not be made");
          break;
        }
        const settled = await LIB.settleOf(row.id);
        if (settled && settled.ok === false) {
          report.errors.push("the book did not land: " + text(settled.error));
          break;
        }
        q.add(row.id);
        try {
          await CARDS.ensureBook(objectApi, row.id);
        } catch (e) {
          report.errors.push("the new book's tables are not ready: " + msg(e));
          break;
        }
        report.created.books += 1;
        report.books.push({ id: row.id, name: row.name });
        if (!mainBookId) {
          mainBookId = row.id;
          mainBookName = row.name;
        }
        await writeLevel(objectApi, row.id, row.id, books[i].children, actor, report, roots, false);
      }
    } else {
      const bookId = trim(t.bookId);
      if (!bookId) {
        report.errors.push("open a book first — this import needs somewhere to land");
        return report;
      }
      const folderId = trim(t.folderId) || bookId;
      q.add(bookId);
      try {
        await CARDS.ensureBook(objectApi, bookId);
      } catch (e) {
        report.errors.push("that book is not ready: " + msg(e));
        return report;
      }
      mainBookId = bookId;
      mainBookName = trim(t.bookName);
      report.books.push({ id: bookId, name: mainBookName });
      const merge = m === "merge by name";
      for (let i = 0; i < books.length; i++) {
        if (books.length === 1) {
          await writeLevel(objectApi, bookId, folderId, books[i].children, actor, report, roots, merge);
          continue;
        }
        // More than one book in one paste, landing inside a book: each becomes a folder.
        const wrapped = newFolder(books[i].name);
        wrapped.children = books[i].children;
        report.warnings.push('"' + books[i].name + '" became a folder — a paste holding several books lands as folders here');
        await writeLevel(objectApi, bookId, folderId, [wrapped], actor, report, roots, merge);
      }
    }
  } catch (e) {
    report.errors.push(msg(e));
    objectApi.log("[import] apply stopped: " + msg(e));
  } finally {
    report.held = q.close().held;
  }

  report.bookId = mainBookId;
  report.bookName = mainBookName;
  report.ok = report.created.cards + report.merged.cards > 0;

  // ONE row for the whole gesture.
  if (report.ok) {
    const declared = declareCommand();
    const label =
      "Import " +
      (report.created.cards + report.merged.cards) +
      " card" +
      (report.created.cards + report.merged.cards === 1 ? "" : "s") +
      (m === "new book" ? " as a new book" : m === "merge by name" ? " (merged by name)" : "");
    try {
      const pid = projectId || (await projectOf(objectApi, mainBookId, ""));
      report.seq =
        (await CHANGELOG.record(objectApi, {
          projectId: pid,
          bookId: mainBookId,
          type: COMMAND,
          targetId: mainBookId,
          targetType: "book",
          before: { label: label, mode: m, roots: [] },
          after: {
            label: label,
            mode: m,
            format: text(preview.format),
            roots: roots,
            counts: report.created,
            merged: report.merged,
          },
          actor: actor,
        })) || 0;
      report.oneCommand = declared && !!report.seq;
      if (!declared) {
        report.warnings.push("the change log took this import as one journal row, but not an undoable one");
      }
    } catch (e) {
      report.warnings.push("the import landed but the change log refused the row: " + msg(e));
      objectApi.log("[import] the command row was refused: " + msg(e));
    }
  }
  if (report.errors.length) report.ok = false;
  return report;
}

// Declared at load, so a seat that has required this module can undo an import even if it never
// ran one (the handler is what changelog's applySide looks for).
declareCommand();

// ---------------------------------------------------------------- what a FILE is Not a second grammar — cardspec still owns every card. Answers only "is this file the kind of thing the reader below can read", so the window says a sentence instead of importing nonsense. sniffFile(name, text) -> { refuse: "one sentence" } | { format: "json" | "auto" }
export function sniffFile(name, raw) {
  const s = text(raw);
  if (!trim(s)) return { refuse: "that file is empty — there is nothing in it to read." };
  const g = firstGlyph(s);
  if (g === "{") {
    let v = null;
    try {
      v = JSON.parse(s);
    } catch (e) {
      v = null;
    }
    if (v && typeof v === "object") {
      const stamp = v.codexbuilder && typeof v.codexbuilder === "object" ? text(v.codexbuilder.format) : "";
      const rows = Array.isArray(v.cards) ? v.cards : null;
      const mapRow = rows && rows.length && rows[0] && typeof rows[0] === "object" && typeof rows[0].file === "string";
      if (stamp === "book-bundle" || mapRow)
        return { refuse: "that is the map — give me cards.json or a file from the cards/ folder." };
      if (!rows && Array.isArray(v.pictures))
        return { refuse: "that is the picture list — give me cards.json or a file from the cards/ folder." };
    }
  }
  if (g === "{" || g === "[" || /\.json$/i.test(text(name))) return { format: "json" };
  return { format: "auto" };
}

module.exports = {
  FORMATS,
  MODES,
  CAPS,
  COMMAND,
  detect,
  sniffFile,
  parse,
  apply,
  normalizeMode,
  declareCommand,
  // exported for the wiring note's sake — app-shell never needs to call these
  reverseImport,
  csvRows,
};
