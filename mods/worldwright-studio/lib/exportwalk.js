// js — THE ONE DESCENT every export walk shares. The branch could never fire, so the descent never happened and a whole-book export emitted the ROOT cards and nothing else. A FIXED NUMBER OF READS: one folders read + one cards read for the whole book, never one query per folder. Trashed rows never enter the tree at all.

const CARDS = require("lib/cards.js");
const IDS = require("lib/ids.js");
const POLICY = require("lib/document-export-policy.js");
const GRAPH = require("lib/graph.js");

const MAX_DEPTH = 8; // a row pointing at its own ancestor can never run the walk away
const CARD_CEILING = 2000;

export function text(v) {
  return v === null || v === undefined ? "" : String(v);
}

export function byKey(a, b) {
  return IDS.cmp(text(a.sortKey), text(b.sortKey)) || IDS.cmp(text(a.id), text(b.id));
}

export function byStackOrder(a, b) {
  return IDS.cmp(text(a.stackOrder), text(b.stackOrder)) || IDS.cmp(text(a.id), text(b.id));
}

// No row for an id means it compiles — the column's default is 1.
export function compiles(map, id) {
  return !map || map[text(id)] !== false;
}

export function depthOf(opts) {
  const n = Number((opts && opts.maxDepth) || 0);
  return n > 0 ? n : MAX_DEPTH;
}

// cardCeiling: absent = 2000 (what the JSON lanes have always capped at), 0 = no cap (the text lane).
export function ceilingOf(opts) {
  if (!opts || opts.cardCeiling === undefined || opts.cardCeiling === null) return CARD_CEILING;
  const n = Number(opts.cardCeiling);
  return n > 0 ? n : Infinity;
}

// One tile per stack, the PRIMARY's identity on it — CARDS.listFolder's own grouping, in memory.
export function tilesOf(rows) {
  const groups = {};
  const order = [];
  for (const c of rows || []) {
    const sid = text(c.stackId) || text(c.id);
    if (!groups[sid]) {
      groups[sid] = [];
      order.push(sid);
    }
    groups[sid].push(c);
  }
  const out = [];
  for (const sid of order) {
    const members = groups[sid].slice().sort(byStackOrder);
    let primary = null;
    for (const m of members) if (text(m.id) === sid) primary = m;
    if (!primary) primary = members[0];
    out.push(
      Object.assign({}, primary, {
        isStack: members.length > 1,
        stackSize: members.length,
        topId: text(members[0].id),
        primaryId: text(primary.id),
      })
    );
  }
  return out.sort(byKey);
}

// The whole book in two reads: folders by parent, card tiles by folder.
export async function readTree(objectApi, bookId) {
  POLICY.assertExportable(bookId);
  const bid = text(bookId);
  const answers = await Promise.all([CARDS.allFolders(objectApi, bid), CARDS.allCards(objectApi, bid)]);
  const kids = {};
  const cardsIn = {};
  for (const f of answers[0] || []) {
    const parent = text(f.folderId) || bid;
    if (!kids[parent]) kids[parent] = [];
    kids[parent].push(f);
  }
  for (const key in kids) kids[key].sort(byKey);
  for (const c of answers[1] || []) {
    const parent = text(c.folderId) || bid;
    if (!cardsIn[parent]) cardsIn[parent] = [];
    cardsIn[parent].push(c);
  }
  const tiles = {};
  for (const key in cardsIn) tiles[key] = tilesOf(cardsIn[key]);
  return { kids: kids, tiles: tiles };
}

export function descend(tree, rootId, baseParts, opts) {
  const flags = (opts && opts.compile) || null;
  const maxDepth = depthOf(opts);
  const ceiling = ceilingOf(opts);
  const entries = [];
  const seen = {};
  let cards = 0;
  let folders = 0;
  let truncated = false;

  const step = function (parentId, parts, depth) {
    if (truncated || depth > maxDepth) return;
    // Folders first, each one's subtree in place of its tile — the pane's own order.
    const subs = tree.kids[parentId] || [];
    for (const f of subs) {
      if (truncated) return;
      const id = text(f.id);
      if (!id || seen[id]) continue;
      seen[id] = true;
      const name = text(f.name);
      const sub = parts.concat([name]);
      if (!compiles(flags && flags.folders, id)) {
        entries.push({ kind: "folderCut", id: id, name: name, parts: sub, depth: depth });
        continue;
      }
      folders += 1;
      entries.push({ kind: "folder", id: id, name: name, parts: sub, depth: depth });
      step(id, sub, depth + 1);
    }
    // Then this level's own cards.
    const list = tree.tiles[parentId] || [];
    for (const t of list) {
      if (truncated) return;
      const id = text(t.id);
      if (!id) continue;
      const name = text(t.name);
      if (!compiles(flags && flags.cards, id)) {
        entries.push({ kind: "cardCut", id: id, name: name, parts: parts, depth: depth });
        continue;
      }
      if (cards >= ceiling) {
        truncated = true;
        return;
      }
      cards += 1;
      entries.push({ kind: "card", id: id, name: name, parts: parts, depth: depth, tile: t });
    }
  };

  step(text(rootId), (baseParts || []).slice(), 1);
  return { entries: entries, cards: cards, folders: folders, truncated: truncated };
}

// The whole book, root first. opts: { compile, maxDepth, cardCeiling }.
export async function bookOrder(objectApi, bookId, opts) {
  await prepareDocuments(objectApi, bookId);
  const tree = await readTree(objectApi, bookId);
  return descend(tree, text(bookId), [], opts);
}

// One folder's subtree — the same descent, started lower. baseParts is the path already walked.
export async function folderOrder(objectApi, bookId, folderId, baseParts, opts) {
  await prepareDocuments(objectApi, bookId);
  const tree = await readTree(objectApi, bookId);
  return descend(tree, text(folderId) || text(bookId), baseParts, opts);
}

// Explicit export-time warm: the existing repository fills skeletons once (10 bulk
// reads cold), then both body tables once (2 bulk reads). Warm exports read memory.
// No per-card SQL, no filesystem walk, no asset downloads.
export async function prepareDocuments(objectApi, bookId) {
  POLICY.assertExportable(bookId);
  const graph = GRAPH.book(text(bookId));
  if (!graph) throw new Error("Document book unavailable");
  await graph.pagesAll(objectApi);
}

module.exports = {
  MAX_DEPTH,
  CARD_CEILING,
  prepareDocuments,
  bookOrder,
  folderOrder,
};
