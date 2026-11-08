// cardjson.js — the card writer: book rows out in lib/cardspec.js's exact wire shape, read back by Import ▸ JSON cards. his standing ruling: an export is a final document — every string field goes through the injected resolve(), so #[…] leaves as a name.

const CARDS = require("lib/cards.js");
const SPEC = require("lib/cardspec.js");
// THE ONE DESCENT — folders and cards, depth-first, in the cards pane's own reading order, with
//   compile = N pruned. This file only turns its entries into cardspec rows.
const WALK = require("lib/exportwalk.js");

const MAX_DEPTH = WALK.MAX_DEPTH; // a cycle in the tree can never run this away
const CARD_CEILING = WALK.CARD_CEILING;

export function text(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function pathLabel(parts) {
  const list = [];
  for (let i = 0; i < (parts || []).length; i++) {
    const seg = text(parts[i]).trim();
    if (seg) list.push(seg.replace(/\//g, " "));
  }
  return list.join("/");
}

export function emptyOut() {
  return { cards: [], skipped: [], folders: 0, notCompiled: [] };
}

// COMPILE — books.compile at folder and card grain. opts.compile is CARDS.compileFlags(); the pruning itself lives in lib/exportwalk.js (absent, or with no row for an id, everything compiles — the column's default is 1), and this file only records what the descent left out.

export async function passthrough(s) {
  return s;
}

export function resolverOf(opts) {
  const fn = opts && typeof opts.resolve === "function" ? opts.resolve : null;
  return fn || passthrough;
}

export async function cardAsCard(objectApi, bookId, cardId, fallbackName, folderParts, opts) {
  const resolve = resolverOf(opts);
  const row = await CARDS.getCard(objectApi, bookId, cardId);
  const out = {
    title: text((row && row.name) || fallbackName || "Untitled"),
    summary: await resolve(text(row && row.summary)),
    status: text(row && row.status),
    ...(row&&row.editor?{editor:text(row.editor)}:{}),
    tags: [],
    folder: pathLabel(folderParts),
    openQuestion: !!(row && row.openQuestion),
    image: "",
    sections: [],
    pages: [],
  };

  try {
    const tags = await CARDS.listTags(objectApi, bookId, cardId);
    for (const t of tags || []) {
      const name = text(t && (t.name || t.tag || t));
      if (name) out.tags.push(name);
    }
  } catch (e) {
    out.tags = [];
  }

  const sections = await CARDS.listSections(objectApi, bookId, cardId);
  for (const s of sections || []) {
    out.sections.push({
      name: text(s && s.name),
      content: await resolve(text(s && s.content)),
    });
  }

  const pages = await CARDS.listPages(objectApi, bookId, cardId);
  for (const p of pages || []) {
    out.pages.push({
      title: text(p && p.title),
      header: await resolve(text(p && p.header)),
      body: await resolve(text(p && (p.content !== undefined ? p.content : p.body))),
      footer: await resolve(text(p && p.footer)),
    });
  }

  return out;
}

// Folder names accumulate into each entry's `parts` — how cardspec carries a tree through a flat
//   card list. The ORDER is the descent's; this only writes rows.
export async function emit(objectApi, bookId, entries, out, opts) {
  for (const e of entries || []) {
    if (e.kind === "folder") {
      out.folders += 1;
      continue;
    }
    // A folder set to compile = N took its whole subtree with it — cards and sub-folders alike.
    if (e.kind === "folderCut") {
      out.notCompiled.push({ kind: "folder", name: e.name, path: pathLabel(e.parts) });
      continue;
    }
    if (e.kind === "cardCut") {
      out.notCompiled.push({ kind: "card", name: e.name, path: pathLabel(e.parts) });
      continue;
    }
    if (out.cards.length >= CARD_CEILING) return out;
    try {
      out.cards.push(await cardAsCard(objectApi, bookId, e.id, e.name, e.parts, opts));
    } catch (err) {
      out.skipped.push({ name: e.name || e.id, reason: (err && err.message) || String(err) });
      objectApi.log("[cardjson] card skipped: " + e.id + " — " + ((err && err.message) || err));
    }
  }
  return out;
}

export function compileOpts(opts) {
  return { compile: (opts && opts.compile) || null, cardCeiling: CARD_CEILING };
}

export async function folderAsCards(objectApi, bookId, folderId, folderName, opts) {
  const out = emptyOut();
  const base = folderName ? [text(folderName)] : [];
  try {
    const order = await WALK.folderOrder(objectApi, String(bookId), String(folderId), base, compileOpts(opts));
    await emit(objectApi, bookId, order.entries, out, opts);
  } catch (e) {
    out.skipped.push({ name: pathLabel(base) || "book root", reason: (e && e.message) || String(e) });
  }
  return out;
}

// The WHOLE-BOOK walk: it reads the compile flags itself when the caller hasn't, so no export lane
//   can forget them.
export async function bookAsCards(objectApi, bookId, opts) {
  const out = emptyOut();
  const o = Object.assign({}, opts || {});
  if (!o.compile) {
    try {
      o.compile = await CARDS.compileFlags(objectApi, String(bookId));
    } catch (e) {
      o.compile = null;
    }
  }
  try {
    const order = await WALK.bookOrder(objectApi, String(bookId), compileOpts(o));
    await emit(objectApi, bookId, order.entries, out, o);
  } catch (e) {
    out.skipped.push({ name: "book root", reason: (e && e.message) || String(e) });
  }
  return out;
}

export async function oneCardAsCards(objectApi, bookId, cardId, fallbackName, folderParts, opts) {
  const out = emptyOut();
  try {
    out.cards.push(await cardAsCard(objectApi, bookId, cardId, fallbackName, folderParts || [], opts));
  } catch (e) {
    out.skipped.push({ name: text(fallbackName) || String(cardId), reason: (e && e.message) || String(e) });
  }
  return out;
}

export function stringify(cards, label) {
  const payload = {
    codexbuilder: {
      format: "cards",
      version: SPEC.VERSION,
      exported: text(label),
    },
    cards: cards || [],
  };
  return JSON.stringify(payload, null, 2);
}

export function fileName(stem) {
  const base = text(stem)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return (base || "cards") + ".cards.json";
}

export function summary(out) {
  const n = ((out && out.cards) || []).length;
  const bits = [n + " card" + (n === 1 ? "" : "s")];
  if (out && out.folders) bits.push(out.folders + " folder" + (out.folders === 1 ? "" : "s"));
  const skipped = ((out && out.skipped) || []).length;
  if (skipped) bits.push(skipped + " unreadable");
  if (n > SPEC.CAPS.cards) bits.push("import reads the first " + SPEC.CAPS.cards);
  return bits.join(" · ");
}

module.exports = {
  MAX_DEPTH,
  CARD_CEILING,
  cardAsCard,
  folderAsCards,
  bookAsCards,
  oneCardAsCards,
  stringify,
  fileName,
  summary,
};
