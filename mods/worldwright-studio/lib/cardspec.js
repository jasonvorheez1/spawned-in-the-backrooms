const EDITOR=require("lib/editor-registry.js");
// js — THE card format: the JSON wire shape a model writes and an author pastes, parsed into canonical cards. body reads without a guard.

const STATUS = require("lib/status.js");

// Bump when the wire shape changes in a way a stored block would notice.
const VERSION = 1;

// A reply and a paste are both strangers: counted, cut to a size a book survives, and told where the knife fell.
const CAPS = {
  cards: 200, // per block (opts.cap overrides — the drawer passes 8)
  sections: 20, // per card
  pages: 20, // per card
  tags: 30, // per card
  title: 120,
  image: 300, // the picture's description — one sentence, cut by the same knife as every other string
  summary: 4000,
  sectionName: 120,
  sectionContent: 8000,
  pageTitle: 120,
  pageChrome: 400, // header and footer
  pageBody: 20000,
  tag: 60,
  folder: 300, // the whole slash path
  segment: 120, // one folder name in it
  depth: 4, // folders deep from the book root
  unknownNamed: 8, // ignored keys quoted in the one warning that names them
};

const FENCE_OPEN = "---cards---";
const FENCE_CLOSE = "---end---";
const CAP_CEILING = 1000;

// The four refusals. One sentence each, addressed to the author — never a code, never a stack.
const ERR = {
  empty: "There was nothing to read — the card block was empty.",
  json: "That block is not valid JSON — check for a missing bracket, quote or comma.",
  shape:
    'That JSON is not a card list — it needs {"cards": [ … ]}, a bare array of cards, or one card object.',
  none: "That block parsed but held no cards — every card needs at least a title or a summary.",
};


export function str(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function trim(v) {
  return str(v).trim();
}

export function lower(v) {
  return str(v).toLowerCase();
}

export function clip(v, n) {
  const s = str(v);
  return s.length > n ? s.slice(0, n) : s;
}

// String() + trim + clamp, in that order — the normalization law for every text field here.
export function field(v, n) {
  return clip(trim(v), n);
}

export function isArr(v) {
  return Object.prototype.toString.call(v) === "[object Array]";
}

export function isObj(v) {
  return !!v && typeof v === "object" && !isArr(v);
}

export function has(o, k) {
  return Object.prototype.hasOwnProperty.call(o, k);
}

export function msgOf(e) {
  return trim((e && e.message) || e) || "unknown reason";
}

export function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

// lib/status.js owns the words; no copy is kept here.

export function statuses() {
  const list = isArr(STATUS.STATUSES) ? STATUS.STATUSES : [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const name = trim(list[i] && list[i].name);
    if (name) out.push(name);
  }
  return out;
}

export function statusesOf(opts) {
  const given = opts && opts.statuses;
  if (isArr(given)) {
    const out = [];
    for (let i = 0; i < given.length; i++) {
      const name = trim(isObj(given[i]) ? given[i].name : given[i]);
      if (name) out.push(name);
    }
    if (out.length) return out;
  }
  return statuses();
}


export function newSink() {
  return { warnings: [], said: {}, unknown: {}, unknownN: 0 };
}

export function warn(sink, line) {
  const s = trim(line);
  if (!s || has(sink.said, s)) return;
  sink.said[s] = 1;
  sink.warnings.push(s);
}

// Unknown keys are collected across the WHOLE block and named ONCE at the end.
export function noteUnknown(sink, key) {
  const k = field(key, 60);
  if (!k || has(sink.unknown, k)) return;
  sink.unknown[k] = 1;
  sink.unknownN += 1;
}

export function flushUnknown(sink) {
  const keys = Object.keys(sink.unknown);
  if (!keys.length) return;
  const named = keys.slice(0, CAPS.unknownNamed).join(", ");
  const more = keys.length - CAPS.unknownNamed;
  warn(
    sink,
    "ignored " +
      plural(keys.length, "key", "keys") +
      " the card format does not use: " +
      named +
      (more > 0 ? " (…and " + more + " more)" : "") +
      "."
  );
}

export function capsOf(opts) {
  const out = {};
  const keys = Object.keys(CAPS);
  for (let i = 0; i < keys.length; i++) out[keys[i]] = CAPS[keys[i]];
  const given = opts && opts.caps;
  if (isObj(given)) {
    for (let i = 0; i < keys.length; i++) {
      const n = Math.floor(Number(given[keys[i]]));
      if (isFinite(n) && n > 0) out[keys[i]] = n;
    }
  }
  return out;
}

export function ctxOf(opts) {
  const o = isObj(opts) ? opts : {};
  return {
    sink: isObj(o.__sink) ? o.__sink : newSink(),
    own: !isObj(o.__sink),
    statuses: statusesOf(o),
    caps: capsOf(o),
    opts: o,
  };
}

// Case-insensitive and alias-tolerant, so a model answering in a looser two-key shape still files.

const KNOWN = {
  title: 1,
  name: 1,
  summary: 1,
  body: 1,
  text: 1,
  description: 1,
  status: 1,
  editor: 1,
  state: 1,
  tags: 1,
  tag: 1,
  folder: 1,
  folderpath: 1,
  path: 1,
  openquestion: 1,
  open_question: 1,
  "open question": 1,
  image: 1,
  sections: 1,
  section: 1,
  pages: 1,
  page: 1,
};

// lower(key) -> value, first spelling wins.
export function keyIndex(obj) {
  const map = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const lk = trim(lower(keys[i]));
    if (!has(map, lk)) map[lk] = obj[keys[i]];
  }
  return { map: map, keys: keys };
}

export function pick(ix, names) {
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    if (has(ix.map, n)) {
      const v = ix.map[n];
      if (v !== null && v !== undefined && v !== "") return v;
    }
  }
  return "";
}

export function pickRaw(ix, names) {
  for (let i = 0; i < names.length; i++) {
    if (has(ix.map, names[i])) return ix.map[names[i]];
  }
  return undefined;
}


export function statusOf(v, c) {
  const raw = trim(v);
  if (!raw) return "";
  const want = lower(raw);
  for (let i = 0; i < c.statuses.length; i++) {
    if (lower(c.statuses[i]) === want) return c.statuses[i];
  }
  warn(
    c.sink,
    'dropped an unknown status "' +
      clip(raw, 60) +
      '" — the statuses are ' +
      c.statuses.join(", ") +
      "."
  );
  return "";
}

export function tagsOf(v, c) {
  let raw = [];
  if (isArr(v)) raw = v;
  else if (isObj(v)) raw = Object.keys(v);
  else if (trim(v)) raw = str(v).split(/[,\n;]/);
  const out = [];
  const seen = {};
  let cut = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = field(isObj(raw[i]) ? raw[i].name || raw[i].tag : raw[i], c.caps.tag);
    if (!t) continue;
    const k = lower(t);
    if (has(seen, k)) continue;
    seen[k] = 1;
    if (out.length >= c.caps.tags) {
      cut += 1;
      continue;
    }
    out.push(t);
  }
  if (cut) warn(c.sink, "a card carried more than " + c.caps.tags + " tags — kept the first " + c.caps.tags + ".");
  return out;
}

export function folderOf(v, c) {
  const joined = isArr(v) ? v.map(str).join("/") : str(v);
  const raw = field(joined, c.caps.folder);
  const parts = [];
  const bits = raw.split("/");
  for (let i = 0; i < bits.length; i++) {
    const seg = field(bits[i], c.caps.segment);
    if (seg) parts.push(seg);
  }
  if (parts.length > c.caps.depth) {
    const kept = parts.slice(0, c.caps.depth);
    warn(
      c.sink,
      'a folder path went more than ' +
        c.caps.depth +
        ' folders deep — kept "' +
        kept.join("/") +
        '".'
    );
    return kept;
  }
  return parts;
}

export function openQuestionOf(v) {
  if (v === true) return true;
  return lower(trim(v)) === "true";
}

export function sectionsOf(v, c) {
  let raw = [];
  if (isArr(v)) raw = v;
  else if (isObj(v)) {
    // { "Voice": "how he speaks" } — a map reads as named sections, in key order.
    const keys = Object.keys(v);
    for (let i = 0; i < keys.length; i++) raw.push({ name: keys[i], content: v[keys[i]] });
  } else if (trim(v)) raw = [v];
  const out = [];
  let cut = 0;
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i];
    let name = "";
    let content = "";
    if (isObj(it)) {
      const ix = keyIndex(it);
      name = field(pick(ix, ["name", "title", "heading", "label"]), c.caps.sectionName);
      content = field(pick(ix, ["content", "body", "text", "value"]), c.caps.sectionContent);
    } else {
      // A bare string is the note itself; the applier can name it.
      content = field(it, c.caps.sectionContent);
    }
    if (!name && !content) continue;
    if (out.length >= c.caps.sections) {
      cut += 1;
      continue;
    }
    out.push({ name: name, content: content });
  }
  if (cut)
    warn(
      c.sink,
      "a card carried more than " + c.caps.sections + " sections — kept the first " + c.caps.sections + "."
    );
  return out;
}

export function pagesOf(v, c) {
  let raw = [];
  if (isArr(v)) raw = v;
  else if (isObj(v)) raw = [v];
  else if (trim(v)) raw = [v];
  const out = [];
  let cut = 0;
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i];
    let page = { title: "", header: "", body: "", footer: "" };
    if (isObj(it)) {
      const ix = keyIndex(it);
      page = {
        title: field(pick(ix, ["title", "name", "heading"]), c.caps.pageTitle),
        header: field(pick(ix, ["header", "head"]), c.caps.pageChrome),
        // import.js's own page nodes call this `content`; the wire key is `body`. Both read.
        body: field(pick(ix, ["body", "content", "text", "prose"]), c.caps.pageBody),
        footer: field(pick(ix, ["footer", "foot"]), c.caps.pageChrome),
      };
    } else {
      page.body = field(it, c.caps.pageBody);
    }
    if (!page.title && !page.header && !page.body && !page.footer) continue;
    if (out.length >= c.caps.pages) {
      cut += 1;
      continue;
    }
    out.push(page);
  }
  if (cut)
    warn(c.sink, "a card carried more than " + c.caps.pages + " pages — kept the first " + c.caps.pages + ".");
  return out;
}


export function shape(entry, c) {
  let e = entry;
  if (typeof e === "string" || typeof e === "number") e = { title: str(e) };
  if (!isObj(e)) return null;

  const ix = keyIndex(e);
  for (let i = 0; i < ix.keys.length; i++) {
    const lk = trim(lower(ix.keys[i]));
    if (lk && !has(KNOWN, lk)) noteUnknown(c.sink, ix.keys[i]);
  }

  const title = field(pick(ix, ["title", "name"]), c.caps.title);
  const summary = field(pick(ix, ["summary", "body", "text", "description"]), c.caps.summary);
  const status = statusOf(pick(ix, ["status", "state"]), c);
  const tags = tagsOf(pickRaw(ix, ["tags", "tag"]), c);
  const folderPath = folderOf(pickRaw(ix, ["folder", "folderpath", "path"]), c);
  const openQuestion = openQuestionOf(pickRaw(ix, ["openquestion", "open_question", "open question"]));
  // The picture's description — a plain sentence, normalized like every other string here (String, trim, clamp). Deliberately NOT in the emptiness test below: an entry carrying nothing but a picture description is still not a card.
  const image = field(pick(ix, ["image"]), c.caps.image);
  const sections = sectionsOf(pickRaw(ix, ["sections", "section"]), c);
  const pages = pagesOf(pickRaw(ix, ["pages", "page"]), c);

  // An entry with nothing in it at all is not a card. Anything else keeps its face.
  if (
    !title &&
    !summary &&
    !status &&
    !tags.length &&
    !folderPath.length &&
    !sections.length &&
    !pages.length &&
    !openQuestion
  ) {
    return null;
  }

  return {
    title: title || "Untitled card",
    summary: summary,
    status: status,
    editor: EDITOR.value(pick(ix,["editor"])),
    tags: tags,
    folder: folderPath.join("/"),
    folderPath: folderPath,
    openQuestion: openQuestion,
    sections: sections,
    pages: pages,
    image: image,
  };
}

// Never throws. Pass an array as opts.warnings and the sentences land in it.
export function normalizeCard(entry, opts) {
  const c = ctxOf(opts);
  let card = null;
  try {
    card = shape(entry, c);
  } catch (e) {
    warn(c.sink, "skipped a card that could not be read (" + msgOf(e) + ").");
    card = null;
  }
  if (c.own) {
    flushUnknown(c.sink);
    const out = isObj(opts) && isArr(opts.warnings) ? opts.warnings : null;
    if (out) for (let i = 0; i < c.sink.warnings.length; i++) out.push(c.sink.warnings[i]);
  }
  return card;
}

// A markdown fence is stripped before parsing, never read as content.
export function unwrapFence(v) {
  return str(v)
    .replace(/^```[a-zA-Z]*[ \t]*\r?\n?/, "")
    .replace(/```\s*$/, "")
    .trim();
}

export function tryJson(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false };
  }
}

// Whole-string first, then the widest {…} / […] span.
export function jsonPayload(chunk) {
  const s = unwrapFence(chunk);
  if (!s) return "";
  if (tryJson(s).ok) return s;
  const spans = [];
  const ob = s.indexOf("{");
  const oe = s.lastIndexOf("}");
  if (ob !== -1 && oe > ob) spans.push([ob, oe]);
  const ab = s.indexOf("[");
  const ae = s.lastIndexOf("]");
  if (ab !== -1 && ae > ab) spans.push([ab, ae]);
  spans.sort(function (x, y) {
    return x[0] - y[0];
  });
  for (let i = 0; i < spans.length; i++) {
    const cut = s.slice(spans[i][0], spans[i][1] + 1);
    if (tryJson(cut).ok) return cut;
  }
  return "";
}

// On ANY doubt, json is "" and text is the WHOLE reply — an answer is never truncated to save the drafts.
export function extractBlock(input) {
  const raw = str(input);
  const whole = raw.trim();
  const open = raw.lastIndexOf(FENCE_OPEN);
  if (open === -1) return { text: whole, json: "" };
  const rest = raw.slice(open + FENCE_OPEN.length);
  const close = rest.indexOf(FENCE_CLOSE);
  const body = close === -1 ? rest : rest.slice(0, close);
  const after = close === -1 ? "" : rest.slice(close + FENCE_CLOSE.length);
  const json = jsonPayload(body);
  if (!json) return { text: whole, json: "" };
  const prose = (raw.slice(0, open) + after).replace(/^\s+/, "").replace(/\s+$/, "");
  return { text: prose, json: json };
}


export function valueOf(input) {
  if (input === null || input === undefined) return { ok: false, error: ERR.empty };
  if (typeof input === "string") {
    const s = unwrapFence(input);
    if (!s) return { ok: false, error: ERR.empty };
    const direct = tryJson(s);
    if (direct.ok) return { ok: true, value: direct.value };
    const cut = jsonPayload(s);
    if (cut) {
      const again = tryJson(cut);
      if (again.ok) return { ok: true, value: again.value };
    }
    return { ok: false, error: ERR.json };
  }
  if (typeof input === "number" || typeof input === "boolean") return { ok: false, error: ERR.shape };
  if (isArr(input) || isObj(input)) return { ok: true, value: input };
  return { ok: false, error: ERR.shape };
}

// The three accepted shapes, in order: { cards: [...] }, a bare array, one card object.
export function entriesOf(value) {
  if (isObj(value) && has(value, "cards")) {
    if (isArr(value.cards)) return { ok: true, list: value.cards };
    if (isObj(value.cards)) return { ok: true, list: [value.cards] };
    return { ok: false, error: ERR.shape };
  }
  if (isArr(value)) return { ok: true, list: value };
  if (isObj(value)) return { ok: true, list: [value] };
  return { ok: false, error: ERR.shape };
}

export function capOf(opts, caps) {
  const n = Math.floor(Number(opts && opts.cap));
  if (isFinite(n) && n > 0) return Math.min(n, CAP_CEILING);
  return caps.cards;
}

// Takes a JSON string (fence-wrapped or not) or an already-parsed value.
export function parse(input, opts) {
  const o = isObj(opts) ? opts : {};
  const c = {
    sink: newSink(),
    own: true,
    statuses: statusesOf(o),
    caps: capsOf(o),
    opts: o,
  };
  try {
    const read = valueOf(input);
    if (!read.ok) return { ok: false, error: read.error };
    const got = entriesOf(read.value);
    if (!got.ok) return { ok: false, error: got.error };

    let list = got.list;
    const cap = capOf(o, c.caps);
    if (list.length > cap) {
      warn(
        c.sink,
        "that block held " + list.length + " cards — kept the first " + cap + "."
      );
      list = list.slice(0, cap);
    }

    const cards = [];
    let skipped = 0;
    for (let i = 0; i < list.length; i++) {
      const card = shape(list[i], c);
      if (card) cards.push(card);
      else skipped += 1;
    }
    flushUnknown(c.sink);
    if (skipped)
      warn(
        c.sink,
        "skipped " + plural(skipped, "entry", "entries") + " with no title and no text."
      );

    if (!cards.length) return { ok: false, error: ERR.none };
    return { ok: true, cards: cards, warnings: c.sink.warnings };
  } catch (e) {
    // House rule 4: even our own crash is a sentence, not a swallow.
    return { ok: false, error: "That block could not be read as cards (" + msgOf(e) + ")." };
  }
}

// ---------------------------------------------------------------- out

export function listOf(cards) {
  if (isArr(cards)) return cards;
  if (isObj(cards) && isArr(cards.cards)) return cards.cards;
  if (isObj(cards)) return [cards];
  return [];
}

// Canonical cards, in wire order and wire keys — folderPath is derived, so it is not written out.
export function stringify(cards) {
  const list = listOf(cards);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const card = normalizeCard(list[i]);
    if (!card) continue;
    const row = {
      title: card.title,
      summary: card.summary,
      status: card.status,
      tags: card.tags,
      folder: card.folder,
      openQuestion: card.openQuestion,
      sections: card.sections,
      pages: card.pages,
    };
    if(card.editor)row.editor=card.editor;
    // image is optional: written only when a card carries one, so a block of picture-less cards
    //   reads exactly as it did before this key existed.
    if (card.image) row.image = card.image;
    out.push(row);
  }
  try {
    return JSON.stringify({ cards: out }, null, 2);
  } catch (e) {
    return '{\n  "cards": []\n}';
  }
}

// '3 cards · 2 sections · 1 page · Lore/Places'
export function summarize(cards) {
  const list = listOf(cards);
  const shaped = [];
  for (let i = 0; i < list.length; i++) {
    const card = normalizeCard(list[i]);
    if (card) shaped.push(card);
  }
  if (!shaped.length) return "no cards";
  let sections = 0;
  let pages = 0;
  let pictures = 0;
  const folders = {};
  let folderN = 0;
  for (let i = 0; i < shaped.length; i++) {
    sections += shaped[i].sections.length;
    pages += shaped[i].pages.length;
    if (shaped[i].image) pictures += 1;
    const f = shaped[i].folder;
    if (f && !has(folders, f)) {
      folders[f] = 1;
      folderN += 1;
    }
  }
  const bits = [plural(shaped.length, "card", "cards")];
  if (sections) bits.push(plural(sections, "section", "sections"));
  if (pages) bits.push(plural(pages, "page", "pages"));
  // '· picture' — named only when a card in the block describes one.
  if (pictures) bits.push(plural(pictures, "picture", "pictures"));
  if (folderN === 1) bits.push(Object.keys(folders)[0]);
  else if (folderN > 1) bits.push(plural(folderN, "folder", "folders"));
  return bits.join(" · ");
}

// ONE source of truth for what a model is told — every prompt is built from this, so the written format and the parsed format cannot drift.

export function contract(opts) {
  const o = isObj(opts) ? opts : {};
  const list = statusesOf(o);
  const cap = capOf(o, CAPS);
  const example =
    '{"cards":[{"title":"The Hollow King","summary":"Two or three sentences that belong in this card\'s summary.",' +
    '"status":"' +
    (list[0] || "Idea") +
    '","folder":"Lore/Places","tags":["myth"],"openQuestion":false,' +
    '"image":"a hollow crown on an empty throne, seen from below",' +
    '"sections":[{"name":"Voice","content":"How he speaks, in a line or two."}],' +
    '"pages":[{"title":"First sight","header":"","body":"Finished prose for the page.","footer":""}]}]}';
  return (
    "CARD DRAFTS: when the author asks for cards, characters, places or anything else they could file " +
    "into the open book — and ONLY then — answer in prose first, then append this block and nothing " +
    "after it:\n" +
    FENCE_OPEN +
    "\n" +
    example +
    "\n" +
    FENCE_CLOSE +
    "\n" +
    "Each fence line alone on its own line, ONE JSON object between them. No markdown fence, no " +
    "commentary inside the JSON, no text after " +
    FENCE_CLOSE +
    ". At most " +
    cap +
    " cards unless they named a number.\n" +
    "Every card needs a title and a summary. status: one of " +
    list.join(", ") +
    ' — or "". folder: a slash path from the book root, at most ' +
    CAPS.depth +
    " deep; omit it to leave the card loose. tags: short single words. openQuestion: true only for a " +
    "card that asks something the story has not answered. image: one short line describing what a " +
    "picture of this card would show — never a url, and only when a picture belongs. sections: " +
    "named notes on the card; pages: " +
    "finished prose. Omit any key you have nothing for; never invent keys.\n" +
    "The prose must stand on its own — never write 'see below'. When you are just talking or asking, " +
    "leave the block out."
  );
}

module.exports = {
  VERSION: VERSION,
  CAPS: CAPS,
  FENCE_OPEN: FENCE_OPEN,
  FENCE_CLOSE: FENCE_CLOSE,
  statuses: statuses,
  parse: parse,
  normalizeCard: normalizeCard,
  stringify: stringify,
  contract: contract,
  summarize: summarize,
  extractBlock: extractBlock,
};
