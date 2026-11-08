// applyReplacements() as ONE undoable REPLACE_IN_BOOK command.

const CARDS = require("lib/cards.js");
const REFS = require("lib/refs.js");

const FIELDS = ["title", "summary", "section", "page", "tags"];
const ALIAS = {
  title: "title", name: "title", cardname: "title",
  summary: "summary",
  section: "section", sections: "section",
  page: "page", pages: "page", body: "page", content: "page",
  tag: "tags", tags: "tags",
};

// About 60 characters either side of the hit, per the ask — enough to read the line it sits in.
const CONTEXT = 60;
const MATCH_CAP = 2000;
const EXCERPT_CAP = 400;

export function text(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function fail(message) {
  const e = new Error("find: " + message);
  e.code = "find";
  throw e;
}


export function normFields(f) {
  const all = { title: true, summary: true, section: true, page: true, tags: true };
  if (f === null || f === undefined) return all;
  const out = { title: false, summary: false, section: false, page: false, tags: false };
  let any = false;
  const take = function (k) {
    const n = ALIAS[text(k).toLowerCase()];
    if (n) {
      out[n] = true;
      any = true;
    }
  };
  if (Array.isArray(f)) {
    for (let i = 0; i < f.length; i++) take(f[i]);
  } else if (typeof f === "object") {
    for (const k in f) if (f[k]) take(k);
  } else if (typeof f === "string") {
    take(f);
  }
  if (!any) fail("no field is selected — tick at least one of title, summary, sections, pages, tags");
  return out;
}

export function normOpts(opts) {
  const o = opts || {};
  return {
    caseSensitive: !!o.caseSensitive,
    wholeWord: !!o.wholeWord,
    regex: !!o.regex,
    fields: normFields(o.fields),
    allowBrackets: !!o.allowBrackets,
    limit: Math.max(1, Math.min(MATCH_CAP, Math.floor(Number(o.limit) || MATCH_CAP))),
    actor: text(o.actor),
  };
}

export function defaults() {
  return { caseSensitive: false, wholeWord: false, regex: false, fields: { title: true, summary: true, section: true, page: true, tags: true } };
}


export function compile(query, o) {
  const q = text(query);
  if (!q) fail("nothing to find — type something into the find field first");
  const src = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return new RegExp(src, o.caseSensitive ? "g" : "gi");
  } catch (e) {
    fail("that regular expression does not parse — " + text((e && e.message) || e));
  }
  return null;
}

export function isWordChar(c) {
  return c !== "" && /[0-9A-Za-z_]/.test(c);
}

// Whole-word is tested on the indexes, not with \b — a literal query with punctuation still behaves.
export function wholeWordOk(s, start, end) {
  if (start > 0 && isWordChar(s.charAt(start - 1)) && isWordChar(s.charAt(start))) return false;
  if (end < s.length && isWordChar(s.charAt(end)) && isWordChar(s.charAt(end - 1))) return false;
  return true;
}


export function tokenSpans(s) {
  const re = new RegExp(REFS.TOKEN_SOURCE, "g");
  const out = [];
  let m;
  while ((m = re.exec(s))) {
    out.push({ start: m.index, end: m.index + m[0].length });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

export function touchesToken(spans, start, end) {
  for (let i = 0; i < spans.length; i++) {
    if (start < spans[i].end && end > spans[i].start) return true;
  }
  return false;
}

export function guardReplacement(replacement, o) {
  const rep = text(replacement);
  if (!o.allowBrackets && /[[\]]/.test(rep)) {
    return {
      ok: false,
      reason: "a replacement may not contain [ or ] — they are the #[…] reference grammar's delimiters",
    };
  }
  return { ok: true, replacement: rep };
}

// Rule 3: '#' at the tail of the replacement meeting a '[' already in the text spells a token.
export function wouldMintToken(s, start, end, rep) {
  return rep.charAt(rep.length - 1) === "#" && s.charAt(end) === "[";
}


export function lineStart(s, at) {
  const i = at > 0 ? s.lastIndexOf("\n", at - 1) : -1;
  return i === -1 ? 0 : i + 1;
}

export function lineEnd(s, at) {
  const i = s.indexOf("\n", at);
  return i === -1 ? s.length : i;
}

export function lineNumber(s, at) {
  let n = 1;
  for (let i = 0; i < at; i++) if (s.charCodeAt(i) === 10) n++;
  return n;
}

export function excerptFor(s, start, end) {
  const from = lineStart(s, start);
  const to = Math.max(lineEnd(s, end), end);
  let ws = Math.max(from, start - CONTEXT);
  let we = Math.min(to, end + CONTEXT);
  if (we - ws > EXCERPT_CAP) we = ws + EXCERPT_CAP;
  if (we < end) we = Math.min(s.length, end);
  const head = ws > from ? "…" : "";
  const tail = we < to ? "…" : "";
  // \n only survives here when the match itself spans lines; a space keeps every offset intact.
  const body = s.slice(ws, we).replace(/\n/g, " ");
  return {
    excerpt: head + body + tail,
    excerptStart: head.length + (start - ws),
    excerptEnd: head.length + (Math.min(we, end) - ws),
  };
}


export function unitOf(field, card, targetId, body, extra) {
  return Object.assign(
    { field: field, cardId: card.id, targetId: text(targetId), text: text(body) },
    extra || {}
  );
}

export function scanUnit(unit, re, o, spans, cap, out) {
  const s = unit.text;
  if (!s) return;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index;
    const end = start + m[0].length;
    if (end === start) {
      re.lastIndex = start + 1; // a zero-width match never advances on its own
      continue;
    }
    if (!o.wholeWord || wholeWordOk(s, start, end)) {
      const inRef = touchesToken(spans, start, end);
      const ex = excerptFor(s, start, end);
      out.push({
        field: unit.field,
        cardId: unit.cardId,
        targetId: unit.targetId,
        pageId: unit.field === "page" ? unit.targetId : undefined,
        sectionId: unit.field === "section" ? unit.targetId : undefined,
        sectionName: unit.sectionName,
        pageTitle: unit.pageTitle,
        tagId: unit.field === "tag" ? unit.targetId : undefined,
        line: lineNumber(s, start),
        start: start,
        end: end,
        text: m[0],
        excerpt: ex.excerpt,
        excerptStart: ex.excerptStart,
        excerptEnd: ex.excerptEnd,
        inRef: inRef,
        locked: inRef || unit.field === "tag",
      });
      if (out.length >= cap) return;
    }
    if (re.lastIndex <= start) re.lastIndex = start + 1;
  }
}

export async function scan(objectApi, bookId, query, opts) {
  const o = normOpts(opts);
  const re = compile(query, o);
  const bid = text(bookId);
  if (!bid) fail("which book? a book id is required");

  const cards = await CARDS.allCards(objectApi, bid);
  const byId = {};
  const order = {};
  for (let i = 0; i < cards.length; i++) {
    byId[cards[i].id] = cards[i];
    order[cards[i].id] = i;
  }
  const tree = await CARDS.folderTree(objectApi, bid);
  const pathOf = {};
  for (let i = 0; i < (tree || []).length; i++) pathOf[text(tree[i].id)] = text(tree[i].path);

  const units = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (o.fields.title) units.push(unitOf("title", c, c.id, c.name, { rank: 0 }));
    if (o.fields.summary) units.push(unitOf("summary", c, c.id, c.summary, { rank: 1 }));
  }
  if (o.fields.section) {
    const rows = await CARDS.allSections(objectApi, bid);
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      const c = byId[s.cardId];
      if (!c) continue;
      units.push(unitOf("section", c, s.id, s.content, { rank: 2, sectionName: s.name, sortKey: s.sortKey, lineLimit: s.lineLimit }));
    }
  }
  if (o.fields.page) {
    const rows = await CARDS.allPages(objectApi, bid);
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      const c = byId[p.cardId];
      if (!c) continue;
      units.push(unitOf("page", c, p.id, p.content, { rank: 3, pageTitle: p.title, sortKey: p.sortKey }));
    }
  }
  if (o.fields.tags) {
    const tags = await CARDS.listProjectTags(objectApi, bid);
    for (let i = 0; i < tags.length; i++) {
      const t = tags[i];
      re.lastIndex = 0;
      if (!re.test(text(t.name))) continue;
      const ids = await CARDS.cardsForTag(objectApi, bid, t.id);
      for (let j = 0; j < ids.length; j++) {
        const c = byId[ids[j]];
        if (!c) continue;
        units.push(unitOf("tag", c, t.id, t.name, { rank: 4, tagName: t.name }));
      }
    }
  }

  units.sort(function (a, b) {
    const ca = order[a.cardId] === undefined ? 1e9 : order[a.cardId];
    const cb = order[b.cardId] === undefined ? 1e9 : order[b.cardId];
    if (ca !== cb) return ca - cb;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return text(a.sortKey) < text(b.sortKey) ? -1 : text(a.sortKey) > text(b.sortKey) ? 1 : 0;
  });

  let total = 0;
  let truncated = false;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    u.spans = tokenSpans(u.text);
    u.matches = [];
    if (total >= o.limit) {
      truncated = true;
      break;
    }
    scanUnit(u, re, o, u.spans, o.limit - total, u.matches);
    total += u.matches.length;
    if (total >= o.limit) truncated = true;
  }

  return { opts: o, units: units, cards: cards, byId: byId, pathOf: pathOf, total: total, truncated: truncated };
}

export function groupsFrom(walk) {
  const out = [];
  const at = {};
  for (let i = 0; i < walk.units.length; i++) {
    const u = walk.units[i];
    if (!u.matches || !u.matches.length) continue;
    let g = at[u.cardId];
    if (!g) {
      const card = walk.byId[u.cardId] || { id: u.cardId, name: "", folderId: "" };
      g = {
        cardId: u.cardId,
        cardName: text(card.name),
        folderId: text(card.folderId),
        folderPath: text(walk.pathOf[text(card.folderId)]),
        matches: [],
      };
      at[u.cardId] = g;
      out.push(g);
    }
    for (let j = 0; j < u.matches.length; j++) g.matches.push(u.matches[j]);
  }
  return out;
}

export async function search(objectApi, bookId, query, opts) {
  const walk = await scan(objectApi, bookId, query, opts);
  return groupsFrom(walk);
}

export async function searchReport(objectApi, bookId, query, opts) {
  const walk = await scan(objectApi, bookId, query, opts);
  const groups = groupsFrom(walk);
  let locked = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = 0; j < groups[i].matches.length; j++) if (groups[i].matches[j].locked) locked++;
  }
  return {
    query: text(query),
    groups: groups,
    total: walk.total,
    cards: groups.length,
    locked: locked,
    truncated: walk.truncated,
    fields: walk.opts.fields,
    scanned: { cards: walk.cards.length, units: walk.units.length },
  };
}

export function countHits(groups) {
  let n = 0;
  const list = groups || [];
  for (let i = 0; i < list.length; i++) n += ((list[i] || {}).matches || []).length;
  return n;
}


// One unit's text with every allowed match applied, right to left so no offset moves under us.
export function applyToUnit(unit, matches, rep, skipped) {
  let s = unit.text;
  let used = 0;
  const ordered = matches.slice().sort(function (a, b) {
    return b.start - a.start;
  });
  for (let i = 0; i < ordered.length; i++) {
    const m = ordered[i];
    if (m.inRef) {
      skipped.push({ cardId: unit.cardId, field: unit.field, targetId: unit.targetId, line: m.line, reason: "inside a #[…] reference token" });
      continue;
    }
    if (wouldMintToken(s, m.start, m.end, rep)) {
      skipped.push({ cardId: unit.cardId, field: unit.field, targetId: unit.targetId, line: m.line, reason: "the replacement would spell a new #[ token against the text beside it" });
      continue;
    }
    s = s.slice(0, m.start) + rep + s.slice(m.end);
    used++;
  }
  return { next: s, used: used };
}

export function editFor(unit) {
  return { kind: unit.field, cardId: unit.cardId, targetId: unit.targetId, before: unit.text };
}

export async function replaceAll(objectApi, bookId, query, replacement, opts) {
  const o = normOpts(opts);
  const guard = guardReplacement(replacement, o);
  if (!guard.ok) return { ok: false, reason: guard.reason, replaced: 0, cards: 0, skipped: [], seq: 0 };
  const rep = guard.replacement;

  const walk = await scan(objectApi, bookId, query, opts);
  const skipped = [];
  const edits = [];
  let replaced = 0;
  for (let i = 0; i < walk.units.length; i++) {
    const u = walk.units[i];
    if (!u.matches || !u.matches.length) continue;
    if (u.field === "tag") {
      skipped.push({
        cardId: u.cardId,
        field: "tag",
        targetId: u.targetId,
        reason: "a tag's name is project-wide — rename it in the tag editor, not here",
      });
      continue;
    }
    const out = applyToUnit(u, u.matches, rep, skipped);
    if (!out.used) continue;
    const e = editFor(u);
    e.after = out.next;
    edits.push(e);
    replaced += out.used;
  }

  if (!edits.length) {
    return { ok: true, replaced: 0, cards: 0, skipped: skipped, seq: 0, truncated: walk.truncated };
  }
  const res = await CARDS.applyReplacements(objectApi, bookId, edits, { actor: o.actor, label: "Replace All" });
  for (let i = 0; i < (res.skipped || []).length; i++) skipped.push(res.skipped[i]);
  return {
    ok: true,
    replaced: replaced,
    cards: res.cards,
    edits: (res.applied || []).length,
    skipped: skipped,
    seq: res.seq,
    truncated: walk.truncated,
  };
}

export async function replaceOne(objectApi, bookId, hit, replacement, opts) {
  const h = hit || {};
  const o = normOpts(opts);
  const guard = guardReplacement(replacement, o);
  if (!guard.ok) return { ok: false, reason: guard.reason, replaced: 0 };
  const rep = guard.replacement;
  const bid = text(bookId);
  const field = text(h.field);
  const cardId = text(h.cardId);
  const targetId = text(h.targetId) || text(h.pageId) || text(h.sectionId) || cardId;
  const start = Math.max(0, Math.floor(Number(h.start) || 0));
  const end = Math.max(start, Math.floor(Number(h.end) || 0));
  const wanted = text(h.text);
  if (!cardId || !field) return { ok: false, reason: "that hit carries no card or field", replaced: 0 };
  if (field === "tag") {
    return { ok: false, reason: "a tag's name is project-wide — rename it in the tag editor, not here", replaced: 0 };
  }

  let body = null;
  if (field === "page") {
    const page = await CARDS.getPage(objectApi, bid, targetId);
    body = page ? page.content : null;
  } else if (field === "section") {
    const sec = await CARDS.getSection(objectApi, bid, targetId);
    body = sec ? sec.content : null;
  } else {
    const card = await CARDS.getCard(objectApi, bid, cardId);
    if (card) body = field === "title" ? card.name : card.summary;
  }
  if (body === null) return { ok: false, reason: "that " + field + " is gone", replaced: 0 };
  if (!wanted || body.slice(start, end) !== wanted) {
    return { ok: false, reason: "that line has changed since the search — search again", replaced: 0, stale: true };
  }
  if (touchesToken(tokenSpans(body), start, end)) {
    return { ok: false, reason: "inside a #[…] reference token", replaced: 0 };
  }
  if (wouldMintToken(body, start, end, rep)) {
    return { ok: false, reason: "the replacement would spell a new #[ token against the text beside it", replaced: 0 };
  }

  const next = body.slice(0, start) + rep + body.slice(end);
  const res = await CARDS.applyReplacements(
    objectApi,
    bid,
    [{ kind: field, cardId: cardId, targetId: targetId, before: body, after: next }],
    { actor: o.actor, label: "Replace" }
  );
  if (!(res.applied || []).length) {
    return { ok: false, reason: ((res.skipped || [])[0] || {}).reason || "the write did not land", replaced: 0 };
  }
  return { ok: true, replaced: 1, cards: res.cards, seq: res.seq, skipped: res.skipped || [] };
}

module.exports = {
  FIELDS,
  CONTEXT,
  MATCH_CAP,
  defaults,
  normOpts,
  search,
  searchReport,
  countHits,
  replaceOne,
  replaceAll,
    guardReplacement,
  tokenSpans,
};
