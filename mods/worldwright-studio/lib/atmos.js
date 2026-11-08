// atmos — the atmo_marks table: one shape for a mood on a section, a mood on a page, and the #[atmo:…] tokens harvested out of prose. No foreign keys and no triggers: every cascade is hand-written, so clearCard() must be called wherever a card is purged. free text is first class — a mood is a preset id OR the author's own words, capped and never refused.

const STORE = require("lib/store.js");
const SCHEMA = require("lib/schema.js");

const ATMO_MAX = 240;
const INLINE_MAX = 40;

const SECTION = "section";
const PAGE = "page";
const INLINE = "inline";

export function text(v) {
  return v === undefined || v === null ? "" : String(v);
}

let PROJECT_READY = false;

// A memo of which cards hold inline rows — NOT a cache of the rows: it is what lets an ordinary save with no moods in the card issue no statement at all.
const INLINE_SEEN = {};

export async function ensure(api) {
  if (PROJECT_READY) return;
  await SCHEMA.ensureProject(api);
  PROJECT_READY = true;
}

// The database's clock: the sandbox has none.
export async function nowMs(api) {
  const res = await STORE.atmos.now(api);
  const row = res && res.rows ? res.rows[0] : null;
  return Number((row && row.ms) || 0);
}

export function rowsOf(res) {
  return (res && res.rows) || [];
}

export function shape(r) {
  return {
    bookId: text(r.bookId),
    cardId: text(r.cardId),
    sectionId: text(r.sectionId),
    pageId: text(r.pageId),
    kind: text(r.kind) || SECTION,
    atmo: text(r.atmo),
    pos: Number(r.pos || 0),
  };
}

export function clean(atmo) {
  return text(atmo).trim().slice(0, ATMO_MAX);
}

// One card's whole weather in ONE statement: { sections: { id: atmo }, pages: { id: atmo }, inline: [row] }.
export async function forCard(api, bookId, cardId) {
  await ensure(api);
  const out = { sections: {}, pages: {}, inline: [] };
  const bid = text(bookId);
  const cid = text(cardId);
  if (!bid || !cid) return out;
  const rows = rowsOf(await STORE.atmos.forCard(api, bid, cid));
  for (let i = 0; i < rows.length; i++) {
    const r = shape(Object.assign({ bookId: bid, cardId: cid }, rows[i]));
    if (!r.atmo) continue;
    if (r.kind === SECTION && r.sectionId) out.sections[r.sectionId] = r.atmo;
    else if (r.kind === PAGE && r.pageId) out.pages[r.pageId] = r.atmo;
    else if (r.kind === INLINE) out.inline.push(r);
  }
  if (out.inline.length) INLINE_SEEN[cid] = true;
  else delete INLINE_SEEN[cid];
  return out;
}

export async function usage(api, query, limit) {
  await ensure(api);
  const q = text(query).trim().toLowerCase();
  const cap = limit > 0 ? limit : 12;
  const rows = rowsOf(await STORE.atmos.all(api));
  const groups = {};
  const order = [];
  for (let i = 0; i < rows.length; i++) {
    const r = shape(rows[i]);
    if (!r.atmo) continue;
    if (q && r.atmo.toLowerCase().indexOf(q) < 0) continue;
    const key = r.atmo.toLowerCase();
    if (!groups[key]) {
      groups[key] = { atmo: r.atmo, sections: 0, pages: 0, inline: 0, count: 0, where: [] };
      order.push(key);
    }
    const g = groups[key];
    g.count += 1;
    if (r.kind === SECTION) g.sections += 1;
    else if (r.kind === PAGE) g.pages += 1;
    else g.inline += 1;
    if (g.where.length < 8) g.where.push({ bookId: r.bookId, cardId: r.cardId, kind: r.kind });
  }
  const out = [];
  for (let i = 0; i < order.length && out.length < cap; i++) out.push(groups[order[i]]);
  out.sort(function (a, b) {
    if (a.count !== b.count) return b.count - a.count;
    return a.atmo < b.atmo ? -1 : a.atmo > b.atmo ? 1 : 0;
  });
  return out;
}

// Called from lib/cards.js's verbs, never from a screen — the verbs carry both fences.
// Empty words CLEAR the mark: one door for set and unset.
export async function setSection(api, bookId, cardId, sectionId, atmo) {
  await ensure(api);
  const bid = text(bookId);
  const sid = text(sectionId);
  if (!bid || !sid) return "";
  const value = clean(atmo);
  await STORE.atmos.clearSection(api, bid, sid);
  if (!value) return "";
  await STORE.atmos.insert(api, bid, text(cardId), sid, "", SECTION, value, 0, await nowMs(api));
  return value;
}

export async function setPage(api, bookId, cardId, pageId, atmo) {
  await ensure(api);
  const bid = text(bookId);
  const pid = text(pageId);
  if (!bid || !pid) return "";
  const value = clean(atmo);
  await STORE.atmos.clearPage(api, bid, pid);
  if (!value) return "";
  await STORE.atmos.insert(api, bid, text(cardId), "", pid, PAGE, value, 0, await nowMs(api));
  return value;
}

// The harvest replaces a card's inline marks WHOLE, so the caller must pass ALL of the card's text — half of it would delete the other half's marks.
export async function replaceInline(api, bookId, cardId, marks) {
  const bid = text(bookId);
  const cid = text(cardId);
  if (!bid || !cid) return 0;
  const list = Array.isArray(marks) ? marks : [];
  if (!list.length && !INLINE_SEEN[cid]) return 0;
  if (list.length) INLINE_SEEN[cid] = true;
  else delete INLINE_SEEN[cid];
  await ensure(api);
  await STORE.atmos.clearInline(api, bid, cid);
  if (!list.length) return 0;
  const ms = await nowMs(api);
  let n = 0;
  for (let i = 0; i < list.length && n < INLINE_MAX; i++) {
    const m = list[i] || {};
    const value = clean(m.atmo);
    if (!value) continue;
    await STORE.atmos.insert(
      api,
      bid,
      cid,
      text(m.sectionId),
      text(m.pageId),
      INLINE,
      value,
      Number(m.pos || n),
      ms
    );
    n += 1;
  }
  return n;
}

export async function clearCard(api, bookId, cardId) {
  const bid = text(bookId);
  const cid = text(cardId);
  if (!bid || !cid) return false;
  await ensure(api);
  await STORE.atmos.clearCard(api, bid, cid);
  return true;
}

module.exports = {
  SECTION: SECTION,
  PAGE: PAGE,
  INLINE: INLINE,
  ATMO_MAX: ATMO_MAX,
  forCard: forCard,
  usage: usage,
  setSection: setSection,
  setPage: setPage,
  replaceInline: replaceInline,
  clearCard: clearCard,
};
