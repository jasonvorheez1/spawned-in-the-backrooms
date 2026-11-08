// js.

const STORE = require("lib/store.js");

// The overflow guard, not the normal beat — the beats are pageSave, nav, close and rest.
const CAP = 32;
// The scribe's rest: ~90 ticks after the last staged op, the desk pays up on its own.
const REST_TICKS = 90;

const DESKS = {}; // bookId -> desk

export function str(v) {
  return v == null ? "" : String(v);
}

export function int(v) {
  if (typeof v === "number") return v === v && v !== Infinity && v !== -Infinity ? v : 0;
  if (v == null) return 0;
  const n = Number(v);
  return n === n && n !== Infinity && n !== -Infinity ? n : 0;
}

export function ok() {
  return { rows: [], changes: 1 };
}

export function deskOf(bookId) {
  const id = str(bookId);
  if (!id) return null;
  if (!DESKS[id]) {
    DESKS[id] = {
      bookId: id,
      folders: {}, // id -> row | null (null = the row is owed a DELETE)
      cards: {},
      pages: {},
      sections: {},
      tags: {}, // cardId -> [tagId] (the card's WHOLE set; [] = every tag row goes)
      stats: {},
      settings: {},
      images: {},
      fts: {},
      n: 0,
      tick: 0,
      chain: null,
    };
  }
  return DESKS[id];
}

export function tickOf(api) {
  try {
    return api && typeof api.getTick === "function" ? int(api.getTick()) : 0;
  } catch (e) {
    return 0;
  }
}

// The cap fires a flush of its own, loose — staging must never make the window wait.
export function note(api, d) {
  d.n += 1;
  d.tick = tickOf(api);
  if (d.n >= CAP) {
    flush(api, d.bookId).catch(function (e) {
      if (api && typeof api.log === "function") api.log("[journal] overflow flush: " + ((e && e.message) || e));
    });
  }
  return ok();
}

export function folder(api, bookId, id, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.folders[str(id)] = row
    ? {
        id: str(row.id),
        name: str(row.name),
        folderId: str(row.folderId),
        sortKey: str(row.sortKey),
        collapsed: int(row.collapsed),
        // The designation rides the staged copy too — a rename that flushed without it would write
        // the folder back with an empty doc and silently un-designate a compile folder.
        doc: str(row.doc),
      }
    : null;
  return note(api, d);
}

export function card(api, bookId, id, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  const key = str(id);
  const copy = row
    ? {
        id: str(row.id),
        name: str(row.name),
        folderId: str(row.folderId),
        stackId: str(row.stackId),
        sortKey: str(row.sortKey),
        stackOrder: str(row.stackOrder),
        status: str(row.status),
        priority: int(row.priority),
        summary: str(row.summary),
        openQuestion: int(row.openQuestion),
        editor: str(row.editor),
        duplicatedFrom: str(row.duplicatedFrom),
        createdAt: int(row.createdAt),
      }
    : null;
  if (copy) {
    // UNREAD (2026-08-28): only the CREATE staging knows the mint (fresh rows aren't in the DB yet, so once()'s stamp cannot learn it there). Carried when the incoming row declares it; and a re-staging of the same key in the same desk generation (create → rename before a flush) must not lose the declared mint, so the previous copy's answer survives an undeclared overwrite.
    const prev = d.cards[key];
    if (row.unread !== undefined) copy.unread = row.unread ? 1 : 0;
    else if (prev && prev.unread !== undefined) copy.unread = prev.unread;
  }
  d.cards[key] = copy;
  return note(api, d);
}

export function page(api, bookId, id, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.pages[str(id)] = row
    ? {
        id: str(row.id),
        cardId: str(row.cardId),
        sortKey: str(row.sortKey),
        title: str(row.title),
        content: str(row.content),
        header: str(row.header),
        footer: str(row.footer),
      }
    : null;
  return note(api, d);
}

export function section(api, bookId, id, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.sections[str(id)] = row
    ? {
        id: str(row.id),
        cardId: str(row.cardId),
        name: str(row.name),
        content: str(row.content),
        lineLimit: int(row.lineLimit),
        sortKey: str(row.sortKey),
      }
    : null;
  return note(api, d);
}

// The card's WHOLE tag set every time — the flush drops that card's rows and writes these back.
export function tags(api, bookId, cardId, tagIds) {
  const d = deskOf(bookId);
  if (!d) return ok();
  const out = [];
  const list = tagIds || [];
  for (let i = 0; i < list.length; i++) {
    const t = str(list[i]);
    if (t) out.push(t);
  }
  d.tags[str(cardId)] = out;
  return note(api, d);
}

export function stats(api, bookId, cardId, words) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.stats[str(cardId)] = words === null || words === undefined ? null : int(words);
  return note(api, d);
}

export function setting(api, bookId, key, value) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.settings[str(key)] = value === null || value === undefined ? null : str(value);
  return note(api, d);
}

export function image(api, bookId, cardId, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.images[str(cardId)] = row
    ? {
        cardId: str(row.cardId),
        prompt: str(row.prompt),
        url: str(row.url),
        version: int(row.version),
        updatedAt: int(row.updatedAt),
      }
    : null;
  return note(api, d);
}

// Not map-backed (lib/graph.js never caches search), so it rides the SAME batch as its card row.
export function fts(api, bookId, cardId, row) {
  const d = deskOf(bookId);
  if (!d) return ok();
  d.fts[str(cardId)] = row ? { cardId: str(cardId), name: str(row.name), body: str(row.body) } : null;
  return note(api, d);
}

export function keysOf(bag) {
  return Object.keys(bag);
}

export function rowsOf(bag) {
  const out = [];
  const ks = Object.keys(bag);
  for (let i = 0; i < ks.length; i++) if (bag[ks[i]]) out.push(bag[ks[i]]);
  return out;
}

export function tagRowsOf(bag) {
  const out = [];
  const ks = Object.keys(bag);
  for (let i = 0; i < ks.length; i++) {
    const list = bag[ks[i]] || [];
    for (let j = 0; j < list.length; j++) out.push({ cardId: ks[i], tagId: list[j] });
  }
  return out;
}

export function pairRowsOf(bag, keyName, valueName) {
  const out = [];
  const ks = Object.keys(bag);
  for (let i = 0; i < ks.length; i++) {
    const v = bag[ks[i]];
    if (v === null || v === undefined) continue;
    const row = {};
    row[keyName] = ks[i];
    row[valueName] = v;
    out.push(row);
  }
  return out;
}

export function blank(d) {
  d.folders = {};
  d.cards = {};
  d.pages = {};
  d.sections = {};
  d.tags = {};
  d.stats = {};
  d.settings = {};
  d.images = {};
  d.fts = {};
  d.n = 0;
}

// A refused folder name is DETERMINISTIC — the same ink can never pay, and every later write queues behind it (the ×54 night: one poisoned create swallowed the whole desk). Before a refused batch goes back, re-name its held folder rows against the DATABASE's own census — per parent, STORE directly (the desk cannot trust any mirror while it owes ink) — so the next beat pays. Dirty keys are deleted before the write-back, so only non-dirty siblings count as taken.
export async function repairFolderNames(api, bookId, held) {
  const store = STORE.book(bookId);
  if (!store || typeof store.folderChildren !== "function") return;
  const byParent = {};
  const ks = Object.keys(held.folders);
  for (let i = 0; i < ks.length; i++) {
    const row = held.folders[ks[i]];
    if (!row) continue;
    if (!byParent[row.folderId]) byParent[row.folderId] = [];
    byParent[row.folderId].push(row);
  }
  const parents = Object.keys(byParent);
  for (let i = 0; i < parents.length; i++) {
    const res = await store.folderChildren(api, parents[i]);
    const sRows = (res && res.rows) || [];
    const taken = {};
    for (let j = 0; j < sRows.length; j++) {
      if (str(sRows[j].id) in held.folders) continue;
      taken[str(sRows[j].name)] = true;
    }
    const list = byParent[parents[i]];
    for (let j = 0; j < list.length; j++) {
      const row = list[j];
      let name = row.name;
      for (let n = 2; taken[name]; n++) name = row.name + " (" + n + ")";
      if (name !== row.name) {
        if (api && typeof api.log === "function")
          api.log("[journal] repaired a refused folder name: " + JSON.stringify(row.name) + " -> " + JSON.stringify(name) + " (" + row.id + ")");
        row.name = name;
      }
      taken[name] = true;
    }
  }
}

// A refused batch is put BACK — but only the keys nothing has re-staged since.
export function reclaim(d, held) {
  const kinds = ["folders", "cards", "pages", "sections", "tags", "stats", "settings", "images", "fts"];
  for (let i = 0; i < kinds.length; i++) {
    const k = kinds[i];
    const bag = held[k];
    const ks = Object.keys(bag);
    for (let j = 0; j < ks.length; j++) {
      if (ks[j] in d[k]) continue;
      d[k][ks[j]] = bag[ks[j]];
      d.n += 1;
    }
  }
}

export async function once(api, d) {
  if (!d.n) return 0;
  const store = STORE.book(d.bookId);
  if (!store || typeof store.journalFlush !== "function") {
    // No statement set for this id — named, never swallowed (house rule 3).
    blank(d);
    throw new Error("[journal] lib/store.js has no journalFlush for book " + JSON.stringify(d.bookId));
  }
  const held = {
    folders: d.folders,
    cards: d.cards,
    pages: d.pages,
    sections: d.sections,
    tags: d.tags,
    stats: d.stats,
    settings: d.settings,
    images: d.images,
    fts: d.fts,
  };
  blank(d);
  try {
    // COMPILE RIDES THE FLUSH (2026-08-27).
    const uFolderRows = rowsOf(held.folders);
    const uCardRows = rowsOf(held.cards);
    if (uFolderRows.length || uCardRows.length) {
      const answers = await Promise.all([
        uFolderRows.length ? store.foldersCompile(api) : null,
        uCardRows.length ? store.cardsCompile(api) : null,
        // UNREAD RIDES THE FLUSH the same way (2026-08-28) — the dot is an overlay column too, and a staged rename would reset it to DEFAULT 0 and kill the dot on a card nobody has read. Only the unread=1 rows come back; everything else is read, which is the default anyway.
        uCardRows.length && typeof store.cardsUnread === "function" ? store.cardsUnread(api) : null,
      ]);
      const fFlags = {};
      const fRows = (answers[0] && answers[0].rows) || [];
      for (let i = 0; i < fRows.length; i++) fFlags[str(fRows[i].id)] = int(fRows[i].compile);
      const cFlags = {};
      const cRows = (answers[1] && answers[1].rows) || [];
      for (let i = 0; i < cRows.length; i++) cFlags[str(cRows[i].id)] = int(cRows[i].compile);
      for (let i = 0; i < uFolderRows.length; i++)
        uFolderRows[i].compile = uFolderRows[i].id in fFlags ? fFlags[uFolderRows[i].id] : 1;
      for (let i = 0; i < uCardRows.length; i++)
        uCardRows[i].compile = uCardRows[i].id in cFlags ? cFlags[uCardRows[i].id] : 1;
      const uFlags = {};
      const uRows = (answers[2] && answers[2].rows) || [];
      for (let i = 0; i < uRows.length; i++) uFlags[str(uRows[i].id)] = 1;
      // A copy that already declares unread is a FRESH CREATE carrying its own mint — the DB has
      // no row to consult yet, so the declaration wins; every undeclared copy takes the DB's word.
      for (let i = 0; i < uCardRows.length; i++)
        if (uCardRows[i].unread === undefined) uCardRows[i].unread = uCardRows[i].id in uFlags ? 1 : 0;
    }
    await store.journalFlush(
      api,
      JSON.stringify(keysOf(held.folders)),
      JSON.stringify(keysOf(held.cards)),
      JSON.stringify(keysOf(held.pages)),
      JSON.stringify(keysOf(held.sections)),
      JSON.stringify(keysOf(held.tags)),
      JSON.stringify(keysOf(held.stats)),
      JSON.stringify(keysOf(held.settings)),
      JSON.stringify(keysOf(held.images)),
      JSON.stringify(keysOf(held.fts)),
      JSON.stringify(uFolderRows),
      JSON.stringify(uCardRows),
      JSON.stringify(rowsOf(held.pages)),
      JSON.stringify(rowsOf(held.sections)),
      JSON.stringify(tagRowsOf(held.tags)),
      JSON.stringify(pairRowsOf(held.stats, "cardId", "words")),
      JSON.stringify(pairRowsOf(held.settings, "key", "value")),
      JSON.stringify(rowsOf(held.images)),
      JSON.stringify(rowsOf(held.fts))
    );
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (msg.indexOf("UNIQUE constraint failed") !== -1 && msg.indexOf("folders.") !== -1) {
      try {
        await repairFolderNames(api, d.bookId, held);
      } catch (e2) {
        if (api && typeof api.log === "function")
          api.log("[journal] name repair failed: " + ((e2 && e2.message) || e2));
      }
    }
    reclaim(d, held);
    throw e;
  }
  return 1;
}

// Chained, so two beats landing together never race the same ink.
export function flushBook(api, bookId) {
  const d = DESKS[str(bookId)];
  if (!d) return Promise.resolve(0);
  const prev = d.chain || Promise.resolve(0);
  const next = prev.then(
    function () {
      return once(api, d);
    },
    function () {
      return once(api, d);
    }
  );
  d.chain = next.catch(function () {
    return 0;
  });
  return next;
}

export function flush(api, bookId) {
  const id = str(bookId);
  if (id) return flushBook(api, id);
  const ids = Object.keys(DESKS);
  const jobs = [];
  for (let i = 0; i < ids.length; i++) jobs.push(flushBook(api, ids[i]));
  return Promise.all(jobs).then(function (counts) {
    let n = 0;
    for (let i = 0; i < counts.length; i++) n += counts[i];
    return n;
  });
}

// Called from app-shell.js's once-a-second update, so a quiet seat costs one integer compare.
export function rest(api, ticks) {
  const want = int(ticks) || REST_TICKS;
  const now = tickOf(api);
  const ids = Object.keys(DESKS);
  let fired = 0;
  for (let i = 0; i < ids.length; i++) {
    const d = DESKS[ids[i]];
    if (!d.n) continue;
    if (now - d.tick < want) continue;
    fired += 1;
    flushBook(api, d.bookId).catch(function (e) {
      if (api && typeof api.log === "function") api.log("[journal] rest flush: " + ((e && e.message) || e));
    });
  }
  return fired;
}

// How much ink is owed — one book, or the whole seat.
export function pending(bookId) {
  const id = str(bookId);
  if (id) return DESKS[id] ? DESKS[id].n : 0;
  let n = 0;
  const ids = Object.keys(DESKS);
  for (let i = 0; i < ids.length; i++) n += DESKS[ids[i]].n;
  return n;
}

module.exports = {
  CAP,
  REST_TICKS,
  folder,
  card,
  page,
  section,
  tags,
  stats,
  setting,
  image,
  fts,
  flush,
  rest,
  pending,
};
