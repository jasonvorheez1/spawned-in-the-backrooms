// SearchSystem (doc 22) — the engine behind the results pane. `marks` are [{ at, len }] offsets INTO `excerpt`, so highlighting is never a second search.

const CARDS = require("lib/cards.js");
const LIB = require("lib/library.js");
const CONFIG = require("lib/config.js");
const ATMOS = require("lib/atmos.js");

// A one-letter query is not a search, it is the whole book. His rule, kept literally.
const MIN_CHARS = 2;

const DEFAULT_PREFS = { scope: "all", matchCase: false, wholeWord: false };
const SCOPES = { all: true, book: true, folder: true };

// His ruling: "title hits above body hits", spelled out per field.
const FIELD_TIER = { name: 0, tag: 1, summary: 2, section: 3, page: 4 };

const PAGE_SIZE = 25;
const PAGE_MAX = 100;
const WHY_MAX = 3;
const EXCERPT = 160;
const MARKS_MAX = 8;
const CARD_CAP = 400;
const SCAN_BUDGET = 1500000;
const BOOK_CAP = 12;
const CORPUS_TTL = 8000;


export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

export function num(v, dflt) {
  const n = Number(v);
  return isFinite(n) ? n : dflt;
}

// GUARD: the ranges catch scripts with no case at all, so a whole-word search in Japanese does not
//   treat every character as a gap.
export function isWordChar(c) {
  if (!c) return false;
  if (c >= "0" && c <= "9") return true;
  if (c === "_") return true;
  if (c.toLowerCase() !== c.toUpperCase()) return true;
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(c);
}

export function parseQuery(query) {
  const raw = text(query);
  const out = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m = re.exec(raw);
  while (m) {
    const t = (m[1] !== undefined ? m[1] : m[2]).trim();
    if (t && out.indexOf(t) === -1) out.push(t);
    if (out.length >= 12) break;
    m = re.exec(raw);
  }
  return out;
}

// Every occurrence of one term in one field, as { at, len } offsets into the ORIGINAL string.
export function findAll(hay, term, o, cap) {
  const H = text(hay);
  const T = text(term);
  if (!H || !T) return [];
  let h = H;
  let t = T;
  if (!o.matchCase) {
    const hl = H.toLowerCase();
    const tl = T.toLowerCase();
    // A locale where lowercasing CHANGES a string's length would shift every offset after it, and
    // a mark in the wrong place is worse than a miss: that rare text matches case-sensitively.
    if (hl.length === H.length && tl.length === T.length) {
      h = hl;
      t = tl;
    }
  }
  const out = [];
  const step = Math.max(1, t.length);
  const limit = cap || MARKS_MAX;
  let at = h.indexOf(t);
  while (at !== -1) {
    const before = at > 0 ? h.charAt(at - 1) : "";
    const after = h.charAt(at + t.length);
    if (!o.wholeWord || (!isWordChar(before) && !isWordChar(after))) {
      out.push({ at: at, len: t.length });
      if (out.length >= limit) break;
    }
    at = h.indexOf(t, at + step);
  }
  return out;
}

// A window of the field around its first hit, cut at word edges, marks translated into the window's
//   own coordinates. Whitespace is flattened 1:1 (never collapsed) so offsets survive.
export function excerptOf(raw, hits, span) {
  const s = text(raw);
  if (!s) return { excerpt: "", marks: [] };
  const width = Math.max(60, Math.floor(num(span, EXCERPT)));
  const first = hits.length ? hits[0].at : 0;
  let start = Math.max(0, first - Math.floor(width / 3));
  let end = Math.min(s.length, start + width);
  if (end - start < width) start = Math.max(0, end - width);
  const head = start > 0;
  const tail = end < s.length;
  let cut = s.slice(start, end);
  let trimLeft = 0;
  if (head) {
    const m = /^\S*\s/.exec(cut);
    if (m && m[0].length < cut.length) {
      trimLeft = m[0].length;
      cut = cut.slice(trimLeft);
    }
  }
  if (tail) {
    const m = /\s\S*$/.exec(cut);
    if (m && m[0].length < cut.length) cut = cut.slice(0, cut.length - m[0].length);
  }
  const base = start + trimLeft;
  const flat = cut.replace(/\s/g, " ");
  const pre = head ? "…" : "";
  const marks = [];
  for (const h of hits) {
    const a = h.at - base;
    if (a >= 0 && a + h.len <= flat.length) marks.push({ at: a + pre.length, len: h.len });
    if (marks.length >= MARKS_MAX) break;
  }
  return { excerpt: pre + flat + (tail ? "…" : ""), marks: marks };
}

// ---------------------------------------------------------------- the corpus cache One walked book, kept warm for a few seconds so a typist is not re-reading the same rows on every keystroke. Any write anywhere in cards.js drops the whole cache — correctness first.

const CORPUS = {};
let WATCHING = false;

export function forget() {
  for (const k in CORPUS) delete CORPUS[k];
}

export function watch() {
  if (WATCHING) return;
  WATCHING = true;
  try {
    if (typeof CARDS.onChange === "function") CARDS.onChange(forget);
  } catch (e) {
    WATCHING = false;
  }
}

// Real milliseconds without a round trip. LIB's clock is the good one but null until this seat has primed it (a fresh run_script seat never has), so the tick counter stands in — monotonic, all an expiry needs. No clock at all means no caching, never a cache that can never expire.
export function stamp(api) {
  try {
    if (typeof LIB.nowMsSync === "function") {
      const ms = LIB.nowMsSync(api);
      if (ms) return Number(ms);
    }
  } catch (e) {
    /* fall through to the tick counter */
  }
  try {
    if (api && typeof api.getTick === "function") {
      const t = Number(api.getTick());
      if (isFinite(t) && t > 0) return t * 16;
    }
  } catch (e) {
    /* no clock here */
  }
  return null;
}

export function soft(promise) {
  return Promise.resolve()
    .then(function () {
      return promise;
    })
    .catch(function () {
      return null;
    });
}

export async function corpusOf(api, bookId) {
  watch();
  const id = text(bookId);
  const now = stamp(api);
  const warm = CORPUS[id];
  if (warm && now !== null && now - warm.at < CORPUS_TTL) return warm;

  const parts = await Promise.all([
    CARDS.allCards(api, id),
    soft(CARDS.allSections(api, id)),
    soft(CARDS.allPages(api, id)),
    soft(CARDS.folderTree(api, id)),
    soft(CARDS.listProjectTags(api, id)),
  ]);

  const cards = Array.isArray(parts[0]) ? parts[0] : [];
  const sections = Array.isArray(parts[1]) ? parts[1] : [];
  const pages = Array.isArray(parts[2]) ? parts[2] : [];
  const folders = Array.isArray(parts[3]) ? parts[3] : [];
  const tagDefs = Array.isArray(parts[4]) ? parts[4] : [];

  const secOf = {};
  let chars = 0;
  for (const s of sections) {
    const cid = text(s.cardId);
    if (!secOf[cid]) secOf[cid] = [];
    secOf[cid].push(s);
    chars += text(s.content).length + text(s.name).length;
  }
  const pageOf = {};
  for (const p of pages) {
    const cid = text(p.cardId);
    if (!pageOf[cid]) pageOf[cid] = [];
    pageOf[cid].push(p);
    chars += text(p.content).length + text(p.header).length + text(p.footer).length + text(p.title).length;
  }
  const pathOf = {};
  const parentOf = {};
  for (const f of folders) {
    pathOf[text(f.id)] = text(f.path);
    parentOf[text(f.id)] = text(f.folderId);
  }

  const entry = {
    at: now === null ? 0 : now,
    cacheable: now !== null,
    bookId: id,
    cards: cards,
    secOf: secOf,
    pageOf: pageOf,
    pathOf: pathOf,
    parentOf: parentOf,
    tagDefs: tagDefs,
    chars: chars,
  };
  if (entry.cacheable) CORPUS[id] = entry;
  return entry;
}

// The folder and everything under it — the 'folder' scope's allow-list, walked from the parent map
// the corpus already holds. A cycle cannot loop: every id is visited once.
export function subtreeOf(corpus, folderId) {
  const root = text(folderId);
  const allow = {};
  allow[root] = true;
  let grew = true;
  let guard = 0;
  while (grew && guard < 64) {
    grew = false;
    guard += 1;
    for (const id in corpus.parentOf) {
      if (allow[id]) continue;
      if (allow[corpus.parentOf[id]]) {
        allow[id] = true;
        grew = true;
      }
    }
  }
  return allow;
}

// Tag names are project-wide, so a tag hit is decided once per book from the defs the corpus
// already read; only the tags whose NAME matched cost a membership query.
export async function tagHitsFor(api, bookId, corpus, terms, o) {
  const out = {};
  const wanted = [];
  for (const def of corpus.tagDefs) {
    const name = text(def.name);
    if (!name) continue;
    const hitTerms = [];
    let hits = [];
    for (const t of terms) {
      const f = findAll(name, t, o, MARKS_MAX);
      if (f.length) {
        hitTerms.push(t);
        hits = hits.concat(f);
      }
    }
    if (hits.length) wanted.push({ id: text(def.id), name: name, hits: hits, terms: hitTerms });
    if (wanted.length >= 8) break;
  }
  if (!wanted.length) return out;
  const lists = await Promise.all(wanted.map((w) => soft(CARDS.cardsForTag(api, bookId, w.id))));
  for (let i = 0; i < wanted.length; i++) {
    for (const cid of lists[i] || []) {
      const key = text(cid);
      if (!out[key]) out[key] = [];
      out[key].push(wanted[i]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- matching one card

export function whyPush(list, field, fieldIn, value, terms, found, o, ids) {
  const raw = text(value);
  if (!raw) return;
  let hits = [];
  const hitTerms = [];
  for (const t of terms) {
    const f = findAll(raw, t, o, MARKS_MAX);
    if (f.length) {
      hitTerms.push(t);
      found[t] = true;
      hits = hits.concat(f);
    }
  }
  if (!hits.length) return;
  hits.sort((a, b) => a.at - b.at);
  const ex = excerptOf(raw, hits, o.excerpt);
  const entry = {
    field: field,
    fieldIn: text(fieldIn),
    excerpt: ex.excerpt,
    marks: ex.marks,
    terms: hitTerms,
    hits: hits.length,
    tier: FIELD_TIER[field],
  };
  if (ids) {
    if (ids.pageId) entry.pageId = text(ids.pageId);
    if (ids.sectionId) entry.sectionId = text(ids.sectionId);
  }
  list.push(entry);
}

export function cardRecord(card, corpus, book, terms, o, tagsFor) {
  const id = text(card.id);
  const found = {};
  const why = [];

  whyPush(why, "name", "", card.name, terms, found, o, null);
  for (const t of tagsFor || []) {
    const ex = excerptOf(t.name, t.hits, o.excerpt);
    for (const term of t.terms) found[term] = true;
    why.push({
      field: "tag",
      fieldIn: "",
      excerpt: ex.excerpt,
      marks: ex.marks,
      terms: t.terms,
      hits: t.hits.length,
      tier: FIELD_TIER.tag,
      tagId: t.id,
    });
  }
  whyPush(why, "summary", "", card.summary, terms, found, o, null);
  for (const s of corpus.secOf[id] || []) {
    whyPush(why, "section", s.name, s.content, terms, found, o, { sectionId: s.id });
    whyPush(why, "section", s.name, s.name, terms, found, o, { sectionId: s.id });
  }
  for (const p of corpus.pageOf[id] || []) {
    whyPush(why, "page", p.title, p.content, terms, found, o, { pageId: p.id });
    whyPush(why, "page", p.title, p.header, terms, found, o, { pageId: p.id });
    whyPush(why, "page", p.title, p.footer, terms, found, o, { pageId: p.id });
    whyPush(why, "page", p.title, p.title, terms, found, o, { pageId: p.id });
  }

  // Every term has to land somewhere on this card — the same AND an author expects from a search
  // box, and the same one FTS5 applies across a document.
  for (const t of terms) if (!found[t]) return null;
  if (!why.length) return null;

  why.sort((a, b) => a.tier - b.tier || b.hits - a.hits);
  let hits = 0;
  for (const w of why) hits += w.hits;
  const folderId = text(card.folderId);

  return {
    cardId: id,
    bookId: book.id,
    bookName: book.name,
    name: text(card.name),
    summary: text(card.summary),
    folderId: folderId,
    folderPath: folderId && folderId !== book.id ? text(corpus.pathOf[folderId]) : "",
    stackId: text(card.stackId) || id,
    status: text(card.status),
    priority: num(card.priority, 0),
    openQuestion: !!card.openQuestion,
    tier: why[0].tier,
    hits: hits,
    fields: why.length,
    why: why.slice(0, o.whyMax),
  };
}

export function byRank(a, b) {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.hits !== b.hits) return b.hits - a.hits;
  const an = a.name.toLowerCase();
  const bn = b.name.toLowerCase();
  return an < bn ? -1 : an > bn ? 1 : 0;
}

// ---------------------------------------------------------------- options and books

export function normalizePrefs(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  let scope = text(p.scope);
  // A row stored under the old word resolves FORWARD, at the read, to the scope that always meant
  // the same thing — never to blank.
  if (scope === "project") scope = "all";
  return {
    scope: SCOPES[scope] ? scope : DEFAULT_PREFS.scope,
    matchCase: p.matchCase === true,
    wholeWord: p.wholeWord === true,
  };
}

export function normalize(opts) {
  const o = opts && typeof opts === "object" ? opts : {};
  const p = normalizePrefs(o);
  return {
    scope: p.scope,
    matchCase: p.matchCase,
    wholeWord: p.wholeWord,
    bookId: text(o.bookId),
    bookName: text(o.bookName),
    folderId: text(o.folderId),
    projectId: text(o.projectId),
    books: Array.isArray(o.books) ? o.books : null,
    limit: Math.max(1, Math.min(PAGE_MAX, Math.floor(num(o.limit, PAGE_SIZE)))),
    page: Math.max(0, Math.floor(num(o.page, 0))),
    whyMax: Math.max(1, Math.min(8, Math.floor(num(o.whyMax, WHY_MAX)))),
    excerpt: Math.max(60, Math.min(400, Math.floor(num(o.excerpt, EXCERPT)))),
    budget: Math.max(20000, Math.floor(num(o.budget, SCAN_BUDGET))),
    maxBooks: Math.max(1, Math.min(64, Math.floor(num(o.maxBooks, BOOK_CAP)))),
    cardCap: Math.max(10, Math.min(2000, Math.floor(num(o.cardCap, CARD_CAP)))),
  };
}

export function isSentinel(id) {
  const rid = text(LIB.RESEARCH_ID);
  return !!rid && text(id).indexOf(rid) === 0;
}

// Which books this scope walks, current book first. `opts.books` (the shelf app-shell already
// mirrors) is preferred over a query; a projectId is the fallback.
export async function booksFor(api, o) {
  if (o.scope !== "all") {
    if (!o.bookId) return [];
    return [{ id: o.bookId, name: o.bookName || nameFromShelf(o, o.bookId) || "" }];
  }
  let shelf = o.books;
  if (!shelf) {
    if (!o.projectId) return o.bookId ? [{ id: o.bookId, name: o.bookName || "" }] : [];
    shelf = await LIB.list(api, o.projectId);
  }
  const out = [];
  for (const b of shelf || []) {
    const id = text(b && b.id);
    if (!id || isSentinel(id)) continue;
    out.push({ id: id, name: text(b.name) });
  }
  if (o.bookId) {
    const at = out.findIndex((b) => b.id === o.bookId);
    if (at > 0) out.unshift(out.splice(at, 1)[0]);
  }
  return out;
}

export function nameFromShelf(o, id) {
  for (const b of o.books || []) if (text(b && b.id) === id) return text(b.name);
  return "";
}

// ---------------------------------------------------------------- the run

export async function run(objectApi, query, opts) {
  const o = normalize(opts);
  const terms = parseQuery(query);
  const trimmed = text(query).trim();
  const report = {
    ok: true,
    query: text(query),
    terms: terms,
    scope: o.scope,
    matchCase: o.matchCase,
    wholeWord: o.wholeWord,
    minChars: MIN_CHARS,
    tooShort: false,
    groups: [],
    total: 0,
    hits: 0,
    shown: 0,
    page: 0,
    pages: 1,
    truncated: false,
    scanned: { books: 0, cards: 0, chars: 0 },
    books: { scanned: 0, total: 0, skipped: [] },
    errors: [],
    error: "",
  };

  if (trimmed.length < MIN_CHARS || !terms.length) {
    report.tooShort = true;
    return report;
  }

  const books = await booksFor(objectApi, o);
  report.books.total = books.length;
  if (!books.length) {
    report.error =
      o.scope === "all"
        ? "no books on this shelf yet"
        : "open a book first — this scope searches inside one book";
    return report;
  }

  const groups = [];
  let scannedChars = 0;
  let kept = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    if (i >= o.maxBooks || scannedChars > o.budget || kept >= o.cardCap) {
      report.truncated = true;
      report.books.skipped.push(book.name || book.id);
      continue;
    }
    let corpus;
    try {
      corpus = await corpusOf(objectApi, book.id);
    } catch (e) {
      // House rule 3: a book that cannot be read says so and costs its own rows only.
      report.errors.push({ bookId: book.id, bookName: book.name, message: text((e && e.message) || e) });
      continue;
    }
    scannedChars += corpus.chars;
    report.scanned.books += 1;
    report.books.scanned += 1;
    report.scanned.chars += corpus.chars;

    let tagsBy = {};
    try {
      tagsBy = await tagHitsFor(objectApi, book.id, corpus, terms, o);
    } catch (e) {
      tagsBy = {};
    }

    const allow =
      o.scope === "folder" && o.folderId && o.folderId !== book.id ? subtreeOf(corpus, o.folderId) : null;

    const rows = [];
    for (const card of corpus.cards) {
      if (allow && !allow[text(card.folderId)]) continue;
      report.scanned.cards += 1;
      if (kept >= o.cardCap) {
        report.truncated = true;
        break;
      }
      const rec = cardRecord(card, corpus, book, terms, o, tagsBy[text(card.id)]);
      if (!rec) continue;
      rows.push(rec);
      kept += 1;
      report.hits += rec.hits;
    }
    if (!rows.length) continue;
    rows.sort(byRank);
    groups.push({ bookId: book.id, bookName: book.name, cards: rows, count: rows.length, best: rows[0].tier });
  }

  // Group order: the book holding the best hit leads, and a book's block is never split up the
  // middle by the pager — the page window is cut from the flattened, grouped order.
  groups.sort((a, b) => a.best - b.best || b.count - a.count);
  const flat = [];
  for (const g of groups) for (const c of g.cards) flat.push(c);

  report.total = flat.length;
  report.pages = Math.max(1, Math.ceil(flat.length / o.limit));
  report.page = Math.min(o.page, report.pages - 1);
  const from = report.page * o.limit;
  const window = flat.slice(from, from + o.limit);
  report.shown = window.length;

  const byBook = {};
  const page = [];
  for (const c of window) {
    if (!byBook[c.bookId]) {
      byBook[c.bookId] = { bookId: c.bookId, bookName: c.bookName, cards: [], count: 0 };
      page.push(byBook[c.bookId]);
    }
    byBook[c.bookId].cards.push(c);
    byBook[c.bookId].count += 1;
  }
  report.groups = page;
  // The moods the same words match, and where each one is used — section marks and inline ones both. ONE statement, run beside the card walk; never a query per mood. An unreadable table is no group at all, never an error over the results.
  try {
    report.atmos = await ATMOS.usage(objectApi, report.query, 12);
  } catch (e) {
    report.atmos = [];
  }
  return report;
}

// ---------------------------------------------------------------- searchPrefs (doc 02)
// Stored since the config lane landed, read by nobody until now.

export async function prefs(objectApi, userId) {
  let raw = null;
  try {
    const user = await CONFIG.getUser(objectApi, userId);
    raw = user && user.searchPrefs;
  } catch (e) {
    raw = null;
  }
  return normalizePrefs(raw);
}

export async function savePrefs(objectApi, userId, patch) {
  const next = normalizePrefs(Object.assign({}, await prefs(objectApi, userId), patch || {}));
  try {
    await CONFIG.setUser(objectApi, userId, "searchPrefs", next);
  } catch (e) {
    // The search still works with the prefs it was handed; the caller surfaces the write failure.
    throw e;
  }
  return next;
}

module.exports = {
  MIN_CHARS,
  FIELD_TIER,
  DEFAULT_PREFS,
  run,
  prefs,
  savePrefs,
  normalizePrefs,
  parseQuery,
  forget,
};
