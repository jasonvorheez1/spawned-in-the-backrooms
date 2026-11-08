// Per-seat book cache with lazy card bodies. Reads return copies; an unloaded body is not empty. Writes update memory and the guarded journal, or invalidate when they cannot be mirrored exactly. Cross-seat edits require invalidation; FTS search is uncached.

const STORE = require("lib/store.js");
// The staging desk requires lib/store.js and nothing else — no cycle back through this file.
const JOURNAL = require("lib/journal.js");
// The traffic warden. A whole-book load is TEN statements; fired together with the schema ensures and the shell's own loads, one seat used to trip the relay's 64-in-flight cap by itself and the refused SELECTs came back as an empty book. Every fan-out in this file goes through the gate now.
const GATE = require("lib/sqlgate.js");

// One graph per book id, built once, same shape as store.js's CACHE.
const CACHE = {};

// SQLite affinity, mirrored: the shadow writes what the column would hold, never the raw argument.
export function str(v) {
  return v == null ? "" : String(v);
}

// No Math here on purpose: Math.floor() in this sandbox came back float32-rounded for a 13-digit
// millisecond stamp, so a cached row disagreed with its own table. Numbers are mirrored verbatim.
export function int(v) {
  if (typeof v === "number") return v === v && v !== Infinity && v !== -Infinity ? v : 0;
  if (v == null) return 0;
  const n = Number(v);
  return n === n && n !== Infinity && n !== -Infinity ? n : 0;
}

// BINARY collation: sortKeys are ASCII, so code-unit order is the database's order. __ord breaks
// ties the way its own scan does.
export function cmp(a, b) {
  const x = str(a);
  const y = str(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function byOrd(a, b) {
  return (a.__ord || 0) - (b.__ord || 0);
}

export function sortedBy(rows, key) {
  return rows.slice().sort(function (a, b) {
    return cmp(a[key], b[key]) || byOrd(a, b);
  });
}

// Columns in lib/store.js's SELECT order, so a copy is column-identical to the row it hands back —
// and __ord never leaves this file.
export function copyFolder(r) {
  return { id: r.id, name: r.name, folderId: r.folderId, sortKey: r.sortKey, collapsed: r.collapsed, doc: r.doc };
}

export function copyCard(r) {
  return {
    id: r.id,
    name: r.name,
    folderId: r.folderId,
    stackId: r.stackId,
    sortKey: r.sortKey,
    stackOrder: r.stackOrder,
    status: r.status,
    priority: r.priority,
    summary: r.summary,
    openQuestion: r.openQuestion,
    editor: str(r.editor),
    duplicatedFrom: r.duplicatedFrom,
    createdAt: r.createdAt,
  };
}

export function copyPage(r) {
  return {
    id: r.id,
    cardId: r.cardId,
    sortKey: r.sortKey,
    title: r.title,
    content: r.content,
    header: r.header,
    footer: r.footer,
  };
}

export function copySection(r) {
  return { id: r.id, cardId: r.cardId, name: r.name, content: r.content, lineLimit: r.lineLimit, sortKey: r.sortKey };
}

// Columns in lib/store.js's imageOf/imagesInFolder/imagesAll SELECT order.
export function copyImage(r) {
  return { cardId: r.cardId, prompt: r.prompt, url: r.url, version: r.version, updatedAt: r.updatedAt };
}

export function result(rows) {
  return { rows: rows };
}

export function rowsOf(res) {
  return (res && res.rows) || [];
}

export function makeGraph(bookId) {
  const store = STORE.book(bookId);
  if (!store) return null;
  const b = store.bookId;

  let M = fresh();
  let loaded = false;
  let loading = null;
  let seq = 0;
  // The bodies in flight, so racing callers share one fetch — `loading`'s shape, one card wide.
  let bodying = {}; // cardId -> promise
  let bodyingAll = null;
  // Which generation of the maps a fetch was started against. A fill or an invalidate bumps it, and
  // an answer that comes back for a map that is gone is dropped instead of relinked into the new one.
  let gen = 0;
  // A save in ANOTHER book can change this book's backlink numbers — cheap to re-read, wrong to hold.
  let refsLoaded = false;
  let refsLoading = null;

  function fresh() {
    return {
      folders: {}, // id -> row
      cards: {}, // id -> row
      pages: {}, // id -> row
      sections: {}, // id -> row
      folderKids: {}, // parent folderId -> { childFolderId: true }
      cardKids: {}, // folderId -> { cardId: true }
      stackKids: {}, // stackId -> { cardId: true }
      pagesOf: {}, // cardId -> { pageId: true }
      sectionsOf: {}, // cardId -> { sectionId: true }
      bodied: {}, // cardId -> true (this card's page and section WORDS are in the maps)
      tagsOf: {}, // cardId -> { tagId: true }
      taggedBy: {}, // tagId -> { cardId: true }
      tagOrd: {}, // cardId \0 tagId -> ord
      stats: {}, // cardId -> { cardId, words, __ord }
      images: {}, // cardId -> { cardId, prompt, url, version, updatedAt, __ord }
      settings: {}, // key -> { key, value, __ord }
      trashCards: {}, // cardId -> true
      trashFolders: {}, // folderId -> true
      refsOut: {}, // cardId -> outbound edge count
      refsIn: {}, // cardId -> inbound edge count (backlinks, as refs.js counts them)
    };
  }

  function nextOrd() {
    seq += 1;
    return seq;
  }

  function tkey(cardId, tagId) {
    return str(cardId) + "\u0000" + str(tagId);
  }

  function addTo(bag, key, id) {
    const k = str(key);
    if (!bag[k]) bag[k] = {};
    bag[k][str(id)] = true;
  }

  function dropFrom(bag, key, id) {
    const k = str(key);
    if (bag[k]) {
      delete bag[k][str(id)];
      if (!Object.keys(bag[k]).length) delete bag[k];
    }
  }

  function idsIn(bag, key) {
    const set = bag[str(key)];
    return set ? Object.keys(set) : [];
  }

  function linkFolder(row) {
    M.folders[row.id] = row;
    addTo(M.folderKids, row.folderId, row.id);
  }

  function unlinkFolder(id) {
    const row = M.folders[str(id)];
    if (!row) return;
    dropFrom(M.folderKids, row.folderId, row.id);
    delete M.folders[row.id];
  }

  function linkCard(row) {
    M.cards[row.id] = row;
    addTo(M.cardKids, row.folderId, row.id);
    addTo(M.stackKids, row.stackId, row.id);
  }

  function unlinkCard(id) {
    const row = M.cards[str(id)];
    if (!row) return;
    dropFrom(M.cardKids, row.folderId, row.id);
    dropFrom(M.stackKids, row.stackId, row.id);
    delete M.cards[row.id];
  }

  function linkPage(row) {
    M.pages[row.id] = row;
    addTo(M.pagesOf, row.cardId, row.id);
  }

  function unlinkPage(id) {
    const row = M.pages[str(id)];
    if (!row) return;
    dropFrom(M.pagesOf, row.cardId, row.id);
    delete M.pages[row.id];
  }

  function linkSection(row) {
    M.sections[row.id] = row;
    addTo(M.sectionsOf, row.cardId, row.id);
  }

  function unlinkSection(id) {
    const row = M.sections[str(id)];
    if (!row) return;
    dropFrom(M.sectionsOf, row.cardId, row.id);
    delete M.sections[row.id];
  }

  // Ten statements, in parallel, once — every one literal, since assembled text can never pass the
  // manifest digest.
  function trashedCardRows(api) {
    return api.sql`SELECT entityId FROM trash WHERE entityType = 'card' AND originalBookId = ${b}`;
  }

  function trashedFolderRows(api) {
    return api.sql`SELECT entityId FROM trash WHERE entityType = 'folder' AND originalBookId = ${b}`;
  }

  // The picture rows must never take a book's whole load down with them: the error is logged raw and the lane reads as "no pictures yet" for that session. A RELAY REFUSAL IS NOT THAT ERROR — it is "the database was never asked", and swallowing it is how an empty book got served as truth. Only a genuine table fault reads as "no pictures".
  function imageRows(api) {
    return store.imagesAll(api).catch(function (e) {
      if (GATE.refused(e)) throw e;
      if (api && typeof api.log === "function") {
        api.log("graph: card_images unreadable, pictures off this session — " + (e && e.message ? e.message : e));
      }
      return { rows: [] };
    });
  }

  async function fill(api) {
    // THE DESK IS PAID BEFORE THE BOOK IS RE-READ. A refill that ran while ink was owed would load rows the database has not been told about yet and the maps would go backwards under the author's hands. (invalidate() stays sync and stays safe: lib/journal.js holds COPIES, so dropping the maps never drops a staged row.)
    await JOURNAL.flush(api, b);
    // THROUGH THE GATE, NOT AT THE WALL: bounded in flight, and a refused statement is retried
    // before it is allowed to be an error. What still throws here reaches the caller — never rows.
    const answers = await GATE.all(api, [
      function () { return store.foldersAll(api); },
      function () { return store.cardsAll(api); },
      function () { return store.pagesSkeleton(api); },
      function () { return store.sectionsSkeleton(api); },
      function () { return store.cardTagsAll(api); },
      function () { return store.statsAll(api); },
      function () { return store.settingAll(api); },
      function () { return trashedCardRows(api); },
      function () { return trashedFolderRows(api); },
      function () { return imageRows(api); },
    ]);

    // A PARTIAL BOOK MUST NEVER LATCH: a statement that resolves with something other than rows
    // throws here, so M stays held and loaded stays false and the next read refills.
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i];
      if (!a || !Array.isArray(a.rows)) {
        throw new Error("graph fill: statement " + i + " answered without rows — partial book refused");
      }
    }

    const next = fresh();
    const held = M;
    M = next;
    seq = 0;
    gen += 1;
    try {
      for (const r of rowsOf(answers[0])) {
        linkFolder({
          id: str(r.id),
          name: str(r.name),
          folderId: str(r.folderId),
          sortKey: str(r.sortKey),
          collapsed: int(r.collapsed),
          doc: str(r.doc),
          __ord: nextOrd(),
        });
      }
      for (const r of rowsOf(answers[1])) {
        linkCard({
          id: str(r.id),
          name: str(r.name),
          folderId: str(r.folderId),
          stackId: str(r.stackId),
          sortKey: str(r.sortKey),
          stackOrder: str(r.stackOrder),
          status: str(r.status),
          priority: int(r.priority),
          summary: str(r.summary),
          openQuestion: int(r.openQuestion),
          editor: str(r.editor),
          duplicatedFrom: str(r.duplicatedFrom),
          createdAt: int(r.createdAt),
          __ord: nextOrd(),
        });
      }
      // SKELETONS: no content/header/footer key at all, so a row that leaked to a caller would be
      // visibly wordless rather than quietly blank. ensureBodies() is what fills these in.
      for (const r of rowsOf(answers[2])) {
        linkPage({
          id: str(r.id),
          cardId: str(r.cardId),
          sortKey: str(r.sortKey),
          title: str(r.title),
          __ord: nextOrd(),
        });
      }
      for (const r of rowsOf(answers[3])) {
        linkSection({
          id: str(r.id),
          cardId: str(r.cardId),
          name: str(r.name),
          lineLimit: int(r.lineLimit),
          sortKey: str(r.sortKey),
          __ord: nextOrd(),
        });
      }
      for (const r of rowsOf(answers[4])) {
        const cid = str(r.cardId);
        const tid = str(r.tagId);
        addTo(M.tagsOf, cid, tid);
        addTo(M.taggedBy, tid, cid);
        if (!(tkey(cid, tid) in M.tagOrd)) M.tagOrd[tkey(cid, tid)] = nextOrd();
      }
      for (const r of rowsOf(answers[5])) {
        M.stats[str(r.cardId)] = { cardId: str(r.cardId), words: int(r.words), __ord: nextOrd() };
      }
      for (const r of rowsOf(answers[6])) {
        M.settings[str(r.key)] = { key: str(r.key), value: str(r.value), __ord: nextOrd() };
      }
      for (const r of rowsOf(answers[7])) M.trashCards[str(r.entityId)] = true;
      for (const r of rowsOf(answers[8])) M.trashFolders[str(r.entityId)] = true;
      for (const r of rowsOf(answers[9])) {
        M.images[str(r.cardId)] = {
          cardId: str(r.cardId),
          prompt: str(r.prompt),
          url: str(r.url),
          version: int(r.version),
          updatedAt: int(r.updatedAt),
          __ord: nextOrd(),
        };
      }
    } catch (e) {
      M = held;
      throw e;
    }
    loaded = true;
    return true;
  }

  // Idempotent, and instant once loaded. Two callers racing share one fill.
  function load(api) {
    if (loaded) return Promise.resolve(true);
    if (loading) return loading;
    loading = fill(api).then(
      function (ok) {
        loading = null;
        return ok;
      },
      function (e) {
        loading = null;
        throw e;
      }
    );
    return loading;
  }

  function invalidate() {
    M = fresh();
    seq = 0;
    gen += 1;
    loaded = false;
    loading = null;
    bodying = {};
    bodyingAll = null;
    refsLoaded = false;
    refsLoading = null;
    return true;
  }

  // =============================================================== the words, per card One card's page set, REPLACED by the table's answer — a row a direct-lane write added or took away while this card was un-bodied is reconciled here, so a skeleton can never outlive the truth. An id already in the map keeps its __ord: the seat's read order does not shuffle.
  function relinkPages(cid, rows) {
    const keep = {};
    for (const r of rows) keep[str(r.id)] = true;
    for (const id of idsIn(M.pagesOf, cid)) if (!keep[id]) unlinkPage(id);
    for (const r of rows) {
      const id = str(r.id);
      const held = M.pages[id];
      unlinkPage(id);
      linkPage({
        id: id,
        cardId: str(r.cardId),
        sortKey: str(r.sortKey),
        title: str(r.title),
        content: str(r.content),
        header: str(r.header),
        footer: str(r.footer),
        __ord: held ? held.__ord : nextOrd(),
      });
    }
  }

  function relinkSections(cid, rows) {
    const keep = {};
    for (const r of rows) keep[str(r.id)] = true;
    for (const id of idsIn(M.sectionsOf, cid)) if (!keep[id]) unlinkSection(id);
    for (const r of rows) {
      const id = str(r.id);
      const held = M.sections[id];
      unlinkSection(id);
      linkSection({
        id: id,
        cardId: str(r.cardId),
        name: str(r.name),
        content: str(r.content),
        lineLimit: int(r.lineLimit),
        sortKey: str(r.sortKey),
        __ord: held ? held.__ord : nextOrd(),
      });
    }
  }

  function hasRows(a) {
    return !!a && Array.isArray(a.rows);
  }

  async function fillBodies(api, cid) {
    const g = gen;
    // THE DESK IS PAID BEFORE THE WORDS ARE READ — fill()'s law, one card wide. Ink still owed
    // would come back missing and overwrite what the author just typed.
    await JOURNAL.flush(api, b);
    const answers = await GATE.all(api, [
      function () { return store.pagesForCard(api, cid); },
      function () { return store.sectionsForCard(api, cid); },
    ]);
    // A PARTIAL CARD MUST NEVER LATCH: half an answer throws, the latch stays off, the next read
    // tries again. Latching here would mint "this card has no words" out of a failed statement.
    if (!hasRows(answers[0]) || !hasRows(answers[1])) {
      throw new Error("graph bodies: card " + cid + " answered without rows — partial card refused");
    }
    // The book reloaded under the fetch: these rows belong to a map that no longer exists.
    if (g !== gen || !loaded) return false;
    relinkPages(cid, rowsOf(answers[0]));
    relinkSections(cid, rowsOf(answers[1]));
    M.bodied[cid] = true;
    return true;
  }

  // The gate every body-reading verb passes through. Latched = instant; racing callers share one
  // fetch, exactly as two callers racing share one fill.
  function ensureBodies(api, cardId) {
    const cid = str(cardId);
    if (!cid || !loaded) return Promise.resolve(false);
    if (M.bodied[cid]) return Promise.resolve(true);
    if (bodying[cid]) return bodying[cid];
    const p = fillBodies(api, cid).then(
      function (okv) {
        delete bodying[cid];
        return okv;
      },
      function (e) {
        delete bodying[cid];
        throw e;
      }
    );
    bodying[cid] = p;
    return p;
  }

  function allBodied() {
    for (const id in M.cards) if (!M.bodied[id]) return false;
    return true;
  }

  async function fillAllBodies(api) {
    if (allBodied()) return true;
    const g = gen;
    await JOURNAL.flush(api, b);
    const answers = await GATE.all(api, [
      function () { return store.pagesAll(api); },
      function () { return store.sectionsAll(api); },
    ]);
    if (!hasRows(answers[0]) || !hasRows(answers[1])) {
      throw new Error("graph bodies: the book answered without rows — partial book refused");
    }
    if (g !== gen || !loaded) return false;
    const pagesBy = {};
    const sectionsBy = {};
    for (const r of rowsOf(answers[0])) (pagesBy[str(r.cardId)] || (pagesBy[str(r.cardId)] = [])).push(r);
    for (const r of rowsOf(answers[1])) (sectionsBy[str(r.cardId)] || (sectionsBy[str(r.cardId)] = [])).push(r);
    const cids = {};
    for (const id in M.cards) cids[id] = true;
    for (const id in pagesBy) cids[id] = true;
    for (const id in sectionsBy) cids[id] = true;
    for (const cid in cids) {
      relinkPages(cid, pagesBy[cid] || []);
      relinkSections(cid, sectionsBy[cid] || []);
      // A card with no rows of its own is BODIED AND EMPTY. That is the whole point of the latch:
      // "nobody has fetched this" and "there is nothing here" are two different answers.
      M.bodied[cid] = true;
    }
    return true;
  }

  // ONE PASS FOR THE LOT — what export, find and every whole-book walk take instead of N fetches.
  function ensureAllBodies(api) {
    if (!loaded) return Promise.resolve(false);
    if (allBodied()) return Promise.resolve(true);
    if (bodyingAll) return bodyingAll;
    bodyingAll = fillAllBodies(api).then(
      function (okv) {
        bodyingAll = null;
        return okv;
      },
      function (e) {
        bodyingAll = null;
        throw e;
      }
    );
    return bodyingAll;
  }

  // lib/store.js's per-folder pair minus the folder clause, grouped by card id only — a card that
  // moves folder keeps its counts, because the folder is looked up from the card row at read time.
  function refsOutRows(api) {
    return api.sql`SELECT x.fromId AS cardId, COUNT(*) AS n FROM cross_book_references x
    JOIN cards c ON c.id = x.fromId
    WHERE c.bookId = ${b} GROUP BY x.fromId`;
  }

  function refsInRows(api) {
    return api.sql`SELECT x.toId AS cardId, COUNT(*) AS n FROM cross_book_references x
    JOIN cards c ON c.id = x.toId
    JOIN card_names cn ON cn.cardId = x.fromId
    WHERE c.bookId = ${b} AND x.fromId <> x.toId
    AND NOT EXISTS (SELECT 1 FROM trash tr WHERE tr.entityType = 'card' AND tr.entityId = x.fromId)
    GROUP BY x.toId`;
  }

  async function fillRefs(api) {
    const answers = await GATE.all(api, [
      function () { return refsOutRows(api); },
      function () { return refsInRows(api); },
    ]);
    const out = {};
    const inn = {};
    for (const r of rowsOf(answers[0])) out[str(r.cardId)] = int(r.n);
    for (const r of rowsOf(answers[1])) inn[str(r.cardId)] = int(r.n);
    M.refsOut = out;
    M.refsIn = inn;
    refsLoaded = true;
    return true;
  }

  function loadRefs(api) {
    if (refsLoaded) return Promise.resolve(true);
    if (refsLoading) return refsLoading;
    refsLoading = fillRefs(api).then(
      function (ok) {
        refsLoading = null;
        return ok;
      },
      function (e) {
        refsLoading = null;
        throw e;
      }
    );
    return refsLoading;
  }

  // Drop just this pair; the book's own rows stay in memory.
  function refsChanged() {
    refsLoaded = false;
    refsLoading = null;
    M.refsOut = {};
    M.refsIn = {};
    return true;
  }

  // NOTE the name: countsInFolder() further down is a different function. Two declarations of one
  // name in a scope means the last wins for BOTH callers — that is how these came back as zeros.
  async function refCountsInFolder(api, folderId, bag) {
    await load(api);
    await loadRefs(api);
    const rows = [];
    for (const id of idsIn(M.cardKids, folderId)) {
      const n = bag()[id];
      if (n) rows.push({ cardId: id, n: n });
    }
    return result(rows);
  }

  function refsOutInFolder(api, folderId) {
    return refCountsInFolder(api, folderId, function () {
      return M.refsOut;
    });
  }

  function refsInInFolder(api, folderId) {
    return refCountsInFolder(api, folderId, function () {
      return M.refsIn;
    });
  }

  async function refresh(api) {
    invalidate();
    return await load(api);
  }

  function isLoaded() {
    return loaded;
  }


  async function folderChildren(api, folderId) {
    await load(api);
    const rows = idsIn(M.folderKids, folderId)
      .map(function (id) {
        return M.folders[id];
      })
      .filter(Boolean);
    return result(sortedBy(rows, "sortKey").map(copyFolder));
  }

  async function folderGet(api, id) {
    await load(api);
    const row = M.folders[str(id)];
    return result(row ? [copyFolder(row)] : []);
  }

  async function foldersAll(api) {
    await load(api);
    const rows = Object.keys(M.folders).map(function (id) {
      return M.folders[id];
    });
    return result(sortedBy(rows, "sortKey").map(copyFolder));
  }

  async function cardsInFolder(api, folderId) {
    await load(api);
    const rows = idsIn(M.cardKids, folderId)
      .map(function (id) {
        return M.cards[id];
      })
      .filter(Boolean)
      .sort(function (a, x) {
        return cmp(a.sortKey, x.sortKey) || cmp(a.stackOrder, x.stackOrder) || byOrd(a, x);
      });
    return result(rows.map(copyCard));
  }

  async function cardGet(api, id) {
    await load(api);
    const row = M.cards[str(id)];
    return result(row ? [copyCard(row)] : []);
  }

  async function cardsAll(api) {
    await load(api);
    const rows = Object.keys(M.cards).map(function (id) {
      return M.cards[id];
    });
    return result(sortedBy(rows, "sortKey").map(copyCard));
  }

  async function stackMembers(api, stackId) {
    await load(api);
    const rows = idsIn(M.stackKids, stackId)
      .map(function (id) {
        return M.cards[id];
      })
      .filter(Boolean);
    return result(sortedBy(rows, "stackOrder").map(copyCard));
  }

  async function pagesForCard(api, cardId) {
    await load(api);
    await ensureBodies(api, cardId);
    const rows = idsIn(M.pagesOf, cardId)
      .map(function (id) {
        return M.pages[id];
      })
      .filter(Boolean);
    return result(sortedBy(rows, "sortKey").map(copyPage));
  }

  // THE SAME ANSWER, WITH NO PROMISE IN FRONT OF IT: never loads, never reaches for the database —
  // `null` means this seat has not pulled the book in yet — or has not pulled THIS card's words —
  // and the caller takes the awaited read.
  function pagesForCardNow(cardId) {
    if (!loaded || !M.bodied[str(cardId)]) return null;
    const rows = idsIn(M.pagesOf, cardId)
      .map(function (id) {
        return M.pages[id];
      })
      .filter(Boolean);
    return sortedBy(rows, "sortKey").map(copyPage);
  }

  // A row id alone does not name a card — the SKELETON does. A page the map has never heard of
  // (a direct-lane create on an un-bodied card) is read straight off the table, as it was before.
  async function pageGet(api, id) {
    await load(api);
    const pid = str(id);
    const known = M.pages[pid];
    if (!known) {
      return await direct(api, function () {
        return store.pageGet(api, pid);
      });
    }
    await ensureBodies(api, known.cardId);
    const row = M.pages[pid];
    return result(row ? [copyPage(row)] : []);
  }

  // ORDER BY cardId, sortKey — the snapshot order.
  async function pagesAll(api) {
    await load(api);
    await ensureAllBodies(api);
    const rows = Object.keys(M.pages)
      .map(function (id) {
        return M.pages[id];
      })
      .sort(function (a, x) {
        return cmp(a.cardId, x.cardId) || cmp(a.sortKey, x.sortKey) || byOrd(a, x);
      });
    return result(rows.map(copyPage));
  }

  async function sectionsForCard(api, cardId) {
    await load(api);
    await ensureBodies(api, cardId);
    const rows = idsIn(M.sectionsOf, cardId)
      .map(function (id) {
        return M.sections[id];
      })
      .filter(Boolean);
    return result(sortedBy(rows, "sortKey").map(copySection));
  }

  async function sectionGet(api, id) {
    await load(api);
    const sid = str(id);
    const known = M.sections[sid];
    if (!known) {
      return await direct(api, function () {
        return store.sectionGet(api, sid);
      });
    }
    await ensureBodies(api, known.cardId);
    const row = M.sections[sid];
    return result(row ? [copySection(row)] : []);
  }

  async function sectionsAll(api) {
    await load(api);
    await ensureAllBodies(api);
    const rows = Object.keys(M.sections)
      .map(function (id) {
        return M.sections[id];
      })
      .sort(function (a, x) {
        return cmp(a.cardId, x.cardId) || cmp(a.sortKey, x.sortKey) || byOrd(a, x);
      });
    return result(rows.map(copySection));
  }

  async function tagsForCard(api, cardId) {
    await load(api);
    const cid = str(cardId);
    const rows = idsIn(M.tagsOf, cid)
      .map(function (tid) {
        return { tagId: tid, __ord: M.tagOrd[tkey(cid, tid)] || 0 };
      })
      .sort(byOrd);
    return result(
      rows.map(function (r) {
        return { tagId: r.tagId };
      })
    );
  }

  async function cardsWithTag(api, tagId) {
    await load(api);
    const tid = str(tagId);
    const rows = idsIn(M.taggedBy, tid)
      .map(function (cid) {
        return { cardId: cid, __ord: M.tagOrd[tkey(cid, tid)] || 0 };
      })
      .sort(byOrd);
    return result(
      rows.map(function (r) {
        return { cardId: r.cardId };
      })
    );
  }

  async function cardTagsAll(api) {
    await load(api);
    const rows = [];
    for (const cid in M.tagsOf) {
      for (const tid in M.tagsOf[cid]) rows.push({ cardId: cid, tagId: tid, __ord: M.tagOrd[tkey(cid, tid)] || 0 });
    }
    rows.sort(byOrd);
    return result(
      rows.map(function (r) {
        return { cardId: r.cardId, tagId: r.tagId };
      })
    );
  }

  async function statsAll(api) {
    await load(api);
    const rows = Object.keys(M.stats)
      .map(function (id) {
        return M.stats[id];
      })
      .sort(byOrd);
    return result(
      rows.map(function (r) {
        return { cardId: r.cardId, words: r.words };
      })
    );
  }

  async function settingGet(api, key) {
    await load(api);
    const row = M.settings[str(key)];
    return result(row ? [{ value: row.value }] : []);
  }

  async function settingAll(api) {
    await load(api);
    const rows = Object.keys(M.settings)
      .map(function (k) {
        return M.settings[k];
      })
      .sort(byOrd);
    return result(
      rows.map(function (r) {
        return { key: r.key, value: r.value };
      })
    );
  }

  // His ruling: trash is loaded to memory too, it is just an index — cards.js calls noteTrash() on
  // every row it files or lifts, so the sets stay true without a round trip.
  async function trashedCards(api) {
    await load(api);
    return result(
      Object.keys(M.trashCards).map(function (id) {
        return { entityId: id };
      })
    );
  }

  async function trashedFolders(api) {
    await load(api);
    return result(
      Object.keys(M.trashFolders).map(function (id) {
        return { entityId: id };
      })
    );
  }

  // WRITE-THROUGH for the one table this file does not own. Synchronous on purpose — it follows a write that has already settled and must not be able to fail after it. Not loaded yet = nothing to correct, and another book's id is ignored so a cross-book restore cannot poison this graph.
  function noteTrash(kind, id, on) {
    if (!loaded) return false;
    const key = str(id);
    if (!key) return false;
    const bag = str(kind) === "folder" ? M.trashFolders : M.trashCards;
    if (on) bag[key] = true;
    else delete bag[key];
    // A trashed card stops counting as a backlink source — drop that pair, keep the book.
    refsChanged();
    return true;
  }

  // Same result columns as the joins they replace: { cardId, n } per card that HAS rows (a card
  // with none is absent, exactly as GROUP BY leaves it).
  function countsInFolder(folderId, bag) {
    const rows = [];
    for (const cid of idsIn(M.cardKids, folderId)) {
      const n = idsIn(bag, cid).length;
      if (n > 0) rows.push({ cardId: cid, n: n });
    }
    return result(rows);
  }

  async function pageCountsInFolder(api, folderId) {
    await load(api);
    return countsInFolder(folderId, M.pagesOf);
  }

  // COUNTING IS NOT READING. The skeleton knows how many pages a card has without a word of it, so
  // the book's vitals cost no fetch — { cardId, n } per card that has pages, as GROUP BY leaves it.
  async function pageCountsAll(api) {
    await load(api);
    const rows = [];
    for (const cid in M.pagesOf) {
      const n = idsIn(M.pagesOf, cid).length;
      if (n > 0) rows.push({ cardId: cid, n: n });
    }
    return result(rows);
  }

  async function sectionCountsInFolder(api, folderId) {
    await load(api);
    return countsInFolder(folderId, M.sectionsOf);
  }

  async function tagCountsInFolder(api, folderId) {
    await load(api);
    return countsInFolder(folderId, M.tagsOf);
  }

  // s.words AS n for every card in the folder that has a stats row.
  async function statsWordsInFolder(api, folderId) {
    await load(api);
    const rows = [];
    for (const cid of idsIn(M.cardKids, folderId)) {
      const s = M.stats[cid];
      if (s) rows.push({ cardId: cid, n: s.words });
    }
    return result(rows);
  }

  async function statsMissingInFolder(api, folderId) {
    await load(api);
    const rows = [];
    for (const cid of idsIn(M.cardKids, folderId)) {
      if (!M.stats[cid]) rows.push({ cardId: cid });
    }
    return result(rows);
  }

  // { cardId, body } once per page content, page header, page footer and section content — the same
  // four blocks, in the same order, as the UNION ALL.
  async function textInFolder(api, folderId) {
    await load(api);
    // A folder's whole text is bulk work: ONE paired pull, never a fetch per card in the folder.
    await ensureAllBodies(api);
    const cards = idsIn(M.cardKids, folderId);
    const rows = [];
    const pagesFor = function (cid) {
      return idsIn(M.pagesOf, cid)
        .map(function (id) {
          return M.pages[id];
        })
        .filter(Boolean)
        .sort(byOrd);
    };
    for (const cid of cards) for (const p of pagesFor(cid)) rows.push({ cardId: cid, body: p.content });
    for (const cid of cards) for (const p of pagesFor(cid)) rows.push({ cardId: cid, body: p.header });
    for (const cid of cards) for (const p of pagesFor(cid)) rows.push({ cardId: cid, body: p.footer });
    for (const cid of cards) {
      const list = idsIn(M.sectionsOf, cid)
        .map(function (id) {
          return M.sections[id];
        })
        .filter(Boolean)
        .sort(byOrd);
      for (const s of list) rows.push({ cardId: cid, body: s.content });
    }
    return result(rows);
  }

  // SQL first, always: the shadow lands only after the store call resolves, so a refused write never shows up in memory as though it landed. The ONLY way a book-table statement still reaches SQL from this file: pay the desk FIRST, then run the write — so nothing can ever land behind ink this seat still owes.
  function direct(api, run) {
    return JOURNAL.flush(api, b).then(run);
  }

  async function folderInsert(api, id, name, folderId, sortKey) {
    if (!loaded) {
      return await direct(api, function () {
        return store.folderInsert(api, id, name, folderId, sortKey);
      });
    }
    unlinkFolder(id);
    const row = {
      id: str(id),
      name: str(name),
      folderId: str(folderId),
      sortKey: str(sortKey),
      collapsed: 0,
      doc: "",
      __ord: nextOrd(),
    };
    linkFolder(row);
    return JOURNAL.folder(api, b, row.id, row);
  }

  async function folderRename(api, id, name) {
    const row = loaded ? M.folders[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.folderRename(api, id, name);
      });
    }
    row.name = str(name);
    return JOURNAL.folder(api, b, row.id, row);
  }

  async function folderMove(api, id, folderId, sortKey) {
    const row = loaded ? M.folders[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.folderMove(api, id, folderId, sortKey);
      });
    }
    dropFrom(M.folderKids, row.folderId, row.id);
    row.folderId = str(folderId);
    row.sortKey = str(sortKey);
    addTo(M.folderKids, row.folderId, row.id);
    return JOURNAL.folder(api, b, row.id, row);
  }

  async function folderSetCollapsed(api, id, collapsed) {
    const row = loaded ? M.folders[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.folderSetCollapsed(api, id, collapsed);
      });
    }
    row.collapsed = int(collapsed);
    return JOURNAL.folder(api, b, row.id, row);
  }

  // THE DESIGNATION, mirrored like every other folder column: the map answers the next read without
  // a query, and the journal carries the whole row to SQL. Written by lib/cards.js's setFolderDoc.
  async function folderSetDoc(api, id, doc) {
    const row = loaded ? M.folders[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.folderSetDoc(api, id, doc);
      });
    }
    row.doc = str(doc);
    return JOURNAL.folder(api, b, row.id, row);
  }

  async function folderDelete(api, id) {
    if (!loaded) {
      return await direct(api, function () {
        return store.folderDelete(api, id);
      });
    }
    unlinkFolder(id);
    return JOURNAL.folder(api, b, str(id), null);
  }

  async function folderInsertFull(api, id, name, folderId, sortKey, collapsed, doc) {
    // OR REPLACE against UNIQUE (folderId, name) swaps a colliding sibling out under us, and neither
    // this map nor the journal can know which — straight to SQL, then drop the cache.
    const clash =
      loaded &&
      idsIn(M.folderKids, folderId).some(function (fid) {
        const r = M.folders[fid];
        return r && r.id !== str(id) && r.name === str(name);
      });
    if (!loaded || clash) {
      const res = await direct(api, function () {
        return store.folderInsertFull(api, id, name, folderId, sortKey, collapsed, str(doc));
      });
      if (clash) invalidate();
      return res;
    }
    unlinkFolder(id);
    const row = {
      id: str(id),
      name: str(name),
      folderId: str(folderId),
      sortKey: str(sortKey),
      collapsed: int(collapsed),
      __ord: nextOrd(),
    };
    linkFolder(row);
    return JOURNAL.folder(api, b, row.id, row);
  }

  // CUT B (2026-08-31): the name is a card_names row now and the desk has no lane for that table, so this ALWAYS lands through SQL (store.cardInsert = cards row + card_names in ONE transaction) and links the map afterwards, exactly like cardMint. Staging instead would write a nameless cards row at flush time — the one shape this cut must never mint.
  async function cardInsert(api, id, name, folderId, stackId, sortKey, stackOrder, duplicatedFrom, createdAt, unread, projectId) {
    const res = await direct(api, function () {
      return store.cardInsert(api, id, name, folderId, stackId, sortKey, stackOrder, duplicatedFrom, createdAt, unread ? 1 : 0, projectId);
    });
    if (!loaded) return res;
    unlinkCard(id);
    const row = {
      id: str(id),
      name: str(name),
      folderId: str(folderId),
      stackId: str(stackId),
      sortKey: str(sortKey),
      stackOrder: str(stackOrder),
      status: "",
      priority: 0,
      summary: "",
      openQuestion: 0,
      editor: "",
      duplicatedFrom: str(duplicatedFrom),
      createdAt: int(createdAt),
      __ord: nextOrd(),
    };
    linkCard(row);
    return res;
  }

  // THE MINT (2026-08-30). A create does not stage: lib/store.js's cardMintRows lands the cards row, its card_names row, its stats seed and its search row in ONE transaction, so there is nothing for the desk to owe afterwards. Desk first (direct), SQL second, shadow third — a refused mint leaves neither a row nor a map entry.
  async function cardMint(api, f) {
    const res = await direct(api, function () {
      return store.cardMintRows(
        api, f.id, f.name, f.folderId, f.stackId, f.sortKey, f.stackOrder, f.duplicatedFrom,
        f.createdAt, f.unread ? 1 : 0, f.status, f.priority, f.summary, f.openQuestion ? 1 : 0,
        f.projectId, f.body, str(f.editor)
      );
    });
    if (loaded) {
      unlinkCard(f.id);
      const row = {
        id: str(f.id),
        name: str(f.name),
        folderId: str(f.folderId),
        stackId: str(f.stackId),
        sortKey: str(f.sortKey),
        stackOrder: str(f.stackOrder),
        status: str(f.status),
        priority: int(f.priority),
        summary: str(f.summary),
        openQuestion: f.openQuestion ? 1 : 0,
        editor: str(f.editor),
        duplicatedFrom: str(f.duplicatedFrom),
        createdAt: int(f.createdAt),
        __ord: nextOrd(),
      };
      linkCard(row);
      const held = M.stats[row.id];
      M.stats[row.id] = { cardId: row.id, words: held ? int(held.words) : 0, __ord: held ? held.__ord : nextOrd() };
    }
    return res;
  }

  // js's writeName lands card_names (the name's one home) right after this, so all this owes is the map's own copy.
  async function cardRename(api, id, name) {
    const row = loaded ? M.cards[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.cardRename(api, id, name);
      });
    }
    row.name = str(name);
    return { rows: [], changes: 1 };
  }

  async function cardMove(api, id, folderId, sortKey) {
    const row = loaded ? M.cards[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.cardMove(api, id, folderId, sortKey);
      });
    }
    dropFrom(M.cardKids, row.folderId, row.id);
    row.folderId = str(folderId);
    row.sortKey = str(sortKey);
    addTo(M.cardKids, row.folderId, row.id);
    return JOURNAL.card(api, b, row.id, row);
  }

  async function cardReorderInStack(api, id, stackOrder) {
    const row = loaded ? M.cards[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.cardReorderInStack(api, id, stackOrder);
      });
    }
    row.stackOrder = str(stackOrder);
    return JOURNAL.card(api, b, row.id, row);
  }

  // One statement over a whole stack in SQL, one staged row per member here — the map already knows
  // exactly who moves, so the batch says the same thing the UPDATE ... WHERE stackId did.
  async function stackSetPrimary(api, oldStackId, newStackId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.stackSetPrimary(api, oldStackId, newStackId);
      });
    }
    let res = null;
    for (const cid of idsIn(M.stackKids, oldStackId)) {
      const row = M.cards[cid];
      if (!row) continue;
      dropFrom(M.stackKids, row.stackId, row.id);
      row.stackId = str(newStackId);
      addTo(M.stackKids, row.stackId, row.id);
      res = JOURNAL.card(api, b, row.id, row);
    }
    return res || { rows: [], changes: 0 };
  }

  async function cardSetMeta(api, id, status, priority, summary, openQuestion, editor) {
    const row = loaded ? M.cards[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.cardSetMeta(api, id, status, priority, summary, openQuestion, editor);
      });
    }
    row.status = str(status);
    row.priority = int(priority);
    row.summary = str(summary);
    row.openQuestion = int(openQuestion);
    if(editor !== undefined)row.editor=str(editor);
    return JOURNAL.card(api, b, row.id, row);
  }

  // store.cardDelete sweeps the card's picture row in the same statement, so the batch takes the pair.
  async function cardDelete(api, id) {
    if (!loaded) {
      return await direct(api, function () {
        return store.cardDelete(api, id);
      });
    }
    const cid = str(id);
    unlinkCard(cid);
    delete M.images[cid];
    JOURNAL.image(api, b, cid, null);
    return JOURNAL.card(api, b, cid, null);
  }

  async function stackMove(api, stackId, folderId, sortKey) {
    if (!loaded) {
      return await direct(api, function () {
        return store.stackMove(api, stackId, folderId, sortKey);
      });
    }
    let res = null;
    for (const cid of idsIn(M.stackKids, stackId)) {
      const row = M.cards[cid];
      if (!row) continue;
      dropFrom(M.cardKids, row.folderId, row.id);
      row.folderId = str(folderId);
      row.sortKey = str(sortKey);
      addTo(M.cardKids, row.folderId, row.id);
      res = JOURNAL.card(api, b, row.id, row);
    }
    return res || { rows: [], changes: 0 };
  }

  async function cardSetStack(api, id, stackId, stackOrder) {
    const row = loaded ? M.cards[str(id)] : null;
    if (!row) {
      return await direct(api, function () {
        return store.cardSetStack(api, id, stackId, stackOrder);
      });
    }
    dropFrom(M.stackKids, row.stackId, row.id);
    row.stackId = str(stackId);
    row.stackOrder = str(stackOrder);
    addTo(M.stackKids, row.stackId, row.id);
    return JOURNAL.card(api, b, row.id, row);
  }

  async function cardInsertFull(api, id, name, folderId, stackId, sortKey, stackOrder, status, priority, summary, openQuestion, duplicatedFrom, createdAt, unread, editor) {
    // CUT B: folderInsertFull's OR REPLACE hazard was a NAME clash on UNIQUE (folderId, name). The cards half of that constraint went with the column, so an id is the only thing OR REPLACE can replace now — the clash check is gone. `name` still rides in: it is what the MAP row carries, and the caller writes the phonebook row through REFS.onCardRenamed.
    if (!loaded) {
      return await direct(api, function () {
        return store.cardInsertFull(api, id, name, folderId, stackId, sortKey, stackOrder, status, priority, summary, openQuestion, duplicatedFrom, createdAt, unread, editor);
      });
    }
    unlinkCard(id);
    const row = {
      id: str(id),
      name: str(name),
      folderId: str(folderId),
      stackId: str(stackId),
      sortKey: str(sortKey),
      stackOrder: str(stackOrder),
      status: str(status),
      priority: int(priority),
      summary: str(summary),
      openQuestion: int(openQuestion),
      editor: str(editor),
      duplicatedFrom: str(duplicatedFrom),
      createdAt: int(createdAt),
      __ord: nextOrd(),
    };
    linkCard(row);
    return JOURNAL.card(api, b, row.id, row);
  }

  // A NEW PAGE ON AN UN-BODIED CARD GOES STRAIGHT TO SQL, latch untouched: a linked row here would sit among skeletons pretending the card had been fetched. The first bodied read brings it back with all its siblings. (…InsertFull below still takes the map: those rows carry their words.)
  async function pageInsert(api, id, cardId, sortKey, title) {
    if (!loaded || !M.bodied[str(cardId)]) {
      return await direct(api, function () {
        return store.pageInsert(api, id, cardId, sortKey, title);
      });
    }
    unlinkPage(id);
    const row = {
      id: str(id),
      cardId: str(cardId),
      sortKey: str(sortKey),
      title: str(title),
      content: "",
      header: "",
      footer: "",
      __ord: nextOrd(),
    };
    linkPage(row);
    return JOURNAL.page(api, b, row.id, row);
  }

  // no drafts for pages — unsaved words live in the textarea and nowhere else, so this runs only when pageSave puts them in the book. A SKELETON ROW IS NOT A ROW TO WRITE FROM: the desk stages the WHOLE row, so staging one whose words were never fetched would file them as "". Un-bodied, every page write below goes straight to the column it names, the latch stays off, and the map keeps only what the skeleton carries.
  async function scorePageSave(api,id,content,rootId,header,oldContent,oldHeader){
    const res=await direct(api,()=>store.scorePageSave(api,id,content,rootId,header,oldContent,oldHeader));
    if((res.rows||[]).some(r=>Number(r.saved)===1)&&loaded){const page=M.pages[str(id)],root=M.pages[str(rootId)];if(page&&M.bodied[page.cardId])page.content=str(content);if(root&&M.bodied[root.cardId])root.header=str(header);}
    return res;
  }
  async function pageSetContent(api, id, content) {
    const row = loaded ? M.pages[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      return await direct(api, function () {
        return store.pageSetContent(api, id, content);
      });
    }
    row.content = str(content);
    return JOURNAL.page(api, b, row.id, row);
  }

  async function pageSetChrome(api, id, title, header, footer) {
    const row = loaded ? M.pages[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      const res = await direct(api, function () {
        return store.pageSetChrome(api, id, title, header, footer);
      });
      if (row) row.title = str(title); // the title IS skeleton; keep it true where it lives
      return res;
    }
    row.title = str(title);
    row.header = str(header);
    row.footer = str(footer);
    return JOURNAL.page(api, b, row.id, row);
  }

  async function pageReorder(api, id, sortKey) {
    const row = loaded ? M.pages[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      const res = await direct(api, function () {
        return store.pageReorder(api, id, sortKey);
      });
      if (row) row.sortKey = str(sortKey);
      return res;
    }
    row.sortKey = str(sortKey);
    return JOURNAL.page(api, b, row.id, row);
  }

  async function pageDelete(api, id) {
    if (!loaded) {
      return await direct(api, function () {
        return store.pageDelete(api, id);
      });
    }
    unlinkPage(id);
    return JOURNAL.page(api, b, str(id), null);
  }

  // Un-bodied, the map holds a skeleton a direct-lane create may have outrun — only the table's own
  // WHERE cardId sweep cannot leave an orphan behind.
  async function pagesDeleteForCard(api, cardId) {
    if (!loaded || !M.bodied[str(cardId)]) {
      const res = await direct(api, function () {
        return store.pagesDeleteForCard(api, cardId);
      });
      if (loaded) for (const id of idsIn(M.pagesOf, cardId)) unlinkPage(id);
      return res;
    }
    let res = null;
    for (const id of idsIn(M.pagesOf, cardId)) {
      unlinkPage(id);
      res = JOURNAL.page(api, b, str(id), null);
    }
    return res || { rows: [], changes: 0 };
  }

  async function pageInsertFull(api, id, cardId, sortKey, title, content, header, footer) {
    if (!loaded) {
      return await direct(api, function () {
        return store.pageInsertFull(api, id, cardId, sortKey, title, content, header, footer);
      });
    }
    unlinkPage(id);
    const row = {
      id: str(id),
      cardId: str(cardId),
      sortKey: str(sortKey),
      title: str(title),
      content: str(content),
      header: str(header),
      footer: str(footer),
      __ord: nextOrd(),
    };
    linkPage(row);
    return JOURNAL.page(api, b, row.id, row);
  }

  // Same law as pageInsert: a new section on an un-bodied card is SQL's, not the map's.
  async function sectionInsert(api, id, cardId, name, lineLimit, sortKey) {
    if (!loaded || !M.bodied[str(cardId)]) {
      return await direct(api, function () {
        return store.sectionInsert(api, id, cardId, name, lineLimit, sortKey);
      });
    }
    unlinkSection(id);
    const row = {
      id: str(id),
      cardId: str(cardId),
      name: str(name),
      content: "",
      lineLimit: int(lineLimit),
      sortKey: str(sortKey),
      __ord: nextOrd(),
    };
    linkSection(row);
    return JOURNAL.section(api, b, row.id, row);
  }

  async function sectionRename(api, id, name) {
    const row = loaded ? M.sections[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      const res = await direct(api, function () {
        return store.sectionRename(api, id, name);
      });
      if (row) row.name = str(name); // skeleton field, kept true
      return res;
    }
    row.name = str(name);
    return JOURNAL.section(api, b, row.id, row);
  }

  async function sectionSetContent(api, id, content) {
    const row = loaded ? M.sections[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      return await direct(api, function () {
        return store.sectionSetContent(api, id, content);
      });
    }
    row.content = str(content);
    return JOURNAL.section(api, b, row.id, row);
  }

  async function sectionReorder(api, id, sortKey) {
    const row = loaded ? M.sections[str(id)] : null;
    if (!row || !M.bodied[row.cardId]) {
      const res = await direct(api, function () {
        return store.sectionReorder(api, id, sortKey);
      });
      if (row) row.sortKey = str(sortKey);
      return res;
    }
    row.sortKey = str(sortKey);
    return JOURNAL.section(api, b, row.id, row);
  }

  async function sectionDelete(api, id) {
    if (!loaded) {
      return await direct(api, function () {
        return store.sectionDelete(api, id);
      });
    }
    unlinkSection(id);
    return JOURNAL.section(api, b, str(id), null);
  }

  async function sectionsDeleteForCard(api, cardId) {
    if (!loaded || !M.bodied[str(cardId)]) {
      const res = await direct(api, function () {
        return store.sectionsDeleteForCard(api, cardId);
      });
      if (loaded) for (const id of idsIn(M.sectionsOf, cardId)) unlinkSection(id);
      return res;
    }
    let res = null;
    for (const id of idsIn(M.sectionsOf, cardId)) {
      unlinkSection(id);
      res = JOURNAL.section(api, b, str(id), null);
    }
    return res || { rows: [], changes: 0 };
  }

  async function sectionInsertFull(api, id, cardId, name, content, lineLimit, sortKey) {
    if (!loaded) {
      return await direct(api, function () {
        return store.sectionInsertFull(api, id, cardId, name, content, lineLimit, sortKey);
      });
    }
    unlinkSection(id);
    const row = {
      id: str(id),
      cardId: str(cardId),
      name: str(name),
      content: str(content),
      lineLimit: int(lineLimit),
      sortKey: str(sortKey),
      __ord: nextOrd(),
    };
    linkSection(row);
    return JOURNAL.section(api, b, row.id, row);
  }

  // One card's WHOLE tag set is staged every time, so add, remove and purge need no ordering.
  async function tagAdd(api, cardId, tagId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.tagAdd(api, cardId, tagId);
      });
    }
    const cid = str(cardId);
    const tid = str(tagId);
    addTo(M.tagsOf, cid, tid);
    addTo(M.taggedBy, tid, cid);
    if (!(tkey(cid, tid) in M.tagOrd)) M.tagOrd[tkey(cid, tid)] = nextOrd();
    return JOURNAL.tags(api, b, cid, idsIn(M.tagsOf, cid));
  }

  async function tagRemove(api, cardId, tagId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.tagRemove(api, cardId, tagId);
      });
    }
    const cid = str(cardId);
    const tid = str(tagId);
    dropFrom(M.tagsOf, cid, tid);
    dropFrom(M.taggedBy, tid, cid);
    delete M.tagOrd[tkey(cid, tid)];
    return JOURNAL.tags(api, b, cid, idsIn(M.tagsOf, cid));
  }

  async function tagsDeleteForCard(api, cardId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.tagsDeleteForCard(api, cardId);
      });
    }
    const cid = str(cardId);
    for (const tid of idsIn(M.tagsOf, cid)) {
      dropFrom(M.taggedBy, tid, cid);
      delete M.tagOrd[tkey(cid, tid)];
    }
    delete M.tagsOf[cid];
    return JOURNAL.tags(api, b, cid, []);
  }

  async function statsSetWords(api, cardId, words) {
    if (!loaded) {
      return await direct(api, function () {
        return store.statsSetWords(api, cardId, words);
      });
    }
    const cid = str(cardId);
    const held = M.stats[cid];
    M.stats[cid] = { cardId: cid, words: int(words), __ord: held ? held.__ord : nextOrd() };
    return JOURNAL.stats(api, b, cid, int(words));
  }

  async function statsDeleteForCard(api, cardId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.statsDeleteForCard(api, cardId);
      });
    }
    delete M.stats[str(cardId)];
    return JOURNAL.stats(api, b, str(cardId), null);
  }

  // Thumbnails come off the same maps the tiles do; writes are SQL FIRST, then the map.
  async function imageOf(api, cardId) {
    await load(api);
    const row = M.images[str(cardId)];
    return result(row ? [copyImage(row)] : []);
  }

  async function imagesInFolder(api, folderId) {
    await load(api);
    const rows = [];
    for (const id of idsIn(M.cardKids, folderId)) {
      const row = M.images[id];
      if (row) rows.push(row);
    }
    return result(rows.slice().sort(byOrd).map(copyImage));
  }

  async function imagesAll(api) {
    await load(api);
    const rows = Object.keys(M.images).map(function (id) {
      return M.images[id];
    });
    return result(rows.sort(byOrd).map(copyImage));
  }

  async function setImage(api, cardId, prompt, url, version, updatedAt) {
    if (!loaded) {
      return await direct(api, function () {
        return store.setImage(api, cardId, prompt, url, version, updatedAt);
      });
    }
    const cid = str(cardId);
    const held = M.images[cid];
    const row = {
      cardId: cid,
      prompt: str(prompt),
      url: str(url),
      version: int(version),
      updatedAt: int(updatedAt),
      __ord: held ? held.__ord : nextOrd(),
    };
    M.images[cid] = row;
    return JOURNAL.image(api, b, cid, row);
  }

  async function clearImage(api, cardId) {
    if (!loaded) {
      return await direct(api, function () {
        return store.clearImage(api, cardId);
      });
    }
    delete M.images[str(cardId)];
    return JOURNAL.image(api, b, str(cardId), null);
  }

  async function settingSet(api, key, value) {
    if (!loaded) {
      return await direct(api, function () {
        return store.settingSet(api, key, value);
      });
    }
    const k = str(key);
    const held = M.settings[k];
    M.settings[k] = { key: k, value: str(value), __ord: held ? held.__ord : nextOrd() };
    return JOURNAL.setting(api, b, k, str(value));
  }

  // Search is never cached here, so these two have no map to write — they stage the row reindex()
  // just built, which puts the FTS row in the SAME batch as the card it indexes.
  async function ftsUpsert(api, cardId, name, body) {
    return JOURNAL.fts(api, b, cardId, { name: name, body: body });
  }

  async function ftsDelete(api, cardId) {
    return JOURNAL.fts(api, b, cardId, null);
  }

  async function ftsDeleteAll(api) {
    return await direct(api, function () {
      return store.ftsDeleteAll(api);
    });
  }

  // Each pays the desk first, or it answers out of a table that has not heard the last keystrokes.
  async function search(api, query, limit) {
    return await direct(api, function () {
      return store.search(api, query, limit);
    });
  }

  async function pagesWithText(api, needle) {
    return await direct(api, function () {
      return store.pagesWithText(api, needle);
    });
  }

  async function sectionsWithText(api, needle) {
    return await direct(api, function () {
      return store.sectionsWithText(api, needle);
    });
  }

  async function cardsWithText(api, needle) {
    return await direct(api, function () {
      return store.cardsWithText(api, needle);
    });
  }

  // --- the bulk wipes: whole indexes, emptied together with their table ------------------ A whole-table sweep cannot be said as a set of final rows, so every one of these pays the desk and then writes as it always did — the beat the brief calls "flush first, then let them run".
  async function imagesDeleteAll(api) {
    const res = await direct(api, function () {
      return store.imagesDeleteAll(api);
    });
    if (loaded) M.images = {};
    return res;
  }

  async function foldersDeleteAll(api) {
    const res = await direct(api, function () {
      return store.foldersDeleteAll(api);
    });
    if (loaded) {
      M.folders = {};
      M.folderKids = {};
    }
    return res;
  }

  async function cardsDeleteAll(api) {
    const res = await direct(api, function () {
      return store.cardsDeleteAll(api);
    });
    if (loaded) {
      M.cards = {};
      M.cardKids = {};
      M.stackKids = {};
    }
    return res;
  }

  async function pagesDeleteAll(api) {
    const res = await direct(api, function () {
      return store.pagesDeleteAll(api);
    });
    if (loaded) {
      M.pages = {};
      M.pagesOf = {};
    }
    return res;
  }

  async function sectionsDeleteAll(api) {
    const res = await direct(api, function () {
      return store.sectionsDeleteAll(api);
    });
    if (loaded) {
      M.sections = {};
      M.sectionsOf = {};
    }
    return res;
  }

  async function cardTagsDeleteAll(api) {
    const res = await direct(api, function () {
      return store.cardTagsDeleteAll(api);
    });
    if (loaded) {
      M.tagsOf = {};
      M.taggedBy = {};
      M.tagOrd = {};
    }
    return res;
  }

  async function statsDeleteAll(api) {
    const res = await direct(api, function () {
      return store.statsDeleteAll(api);
    });
    if (loaded) M.stats = {};
    return res;
  }

  async function settingsDeleteAll(api) {
    const res = await direct(api, function () {
      return store.settingsDeleteAll(api);
    });
    if (loaded) M.settings = {};
    return res;
  }

  // A book being swept away keeps nothing in memory either — and owes nothing on the way out.
  async function drop(api) {
    const res = await direct(api, function () {
      return store.drop(api);
    });
    invalidate();
    return res;
  }

  // =============================================================== the handle
  const handle = {
    bookId: b,
    version: store.version,
    store: store,

    load: load,
    loadRefs: loadRefs,
    refresh: refresh,
    invalidate: invalidate,
    isLoaded: isLoaded,

    folderChildren: folderChildren,
    folderGet: folderGet,
    foldersAll: foldersAll,
    folderInsert: folderInsert,
    folderRename: folderRename,
    folderMove: folderMove,
    folderSetCollapsed: folderSetCollapsed,
    folderSetDoc: folderSetDoc,
    folderDelete: folderDelete,
    folderInsertFull: folderInsertFull,

    cardsInFolder: cardsInFolder,
    cardGet: cardGet,
    cardsAll: cardsAll,
    stackMembers: stackMembers,
    cardInsert: cardInsert,
    cardMint: cardMint,
    cardRename: cardRename,
    cardMove: cardMove,
    cardReorderInStack: cardReorderInStack,
    stackSetPrimary: stackSetPrimary,
    cardSetMeta: cardSetMeta,
    cardDelete: cardDelete,
    stackMove: stackMove,
    cardSetStack: cardSetStack,
    cardInsertFull: cardInsertFull,

    pagesForCard: pagesForCard,
    pagesForCardNow: pagesForCardNow,
    pageGet: pageGet,
    pagesAll: pagesAll,
    pageInsert: pageInsert,
    pageSetContent: pageSetContent,
    scorePageSave: scorePageSave,
    pageSetChrome: pageSetChrome,
    pageReorder: pageReorder,
    pageDelete: pageDelete,
    pagesDeleteForCard: pagesDeleteForCard,
    pageInsertFull: pageInsertFull,

    sectionsForCard: sectionsForCard,
    sectionGet: sectionGet,
    sectionsAll: sectionsAll,
    sectionInsert: sectionInsert,
    sectionRename: sectionRename,
    sectionSetContent: sectionSetContent,
    sectionReorder: sectionReorder,
    sectionDelete: sectionDelete,
    sectionsDeleteForCard: sectionsDeleteForCard,
    sectionInsertFull: sectionInsertFull,

    tagsForCard: tagsForCard,
    cardsWithTag: cardsWithTag,
    cardTagsAll: cardTagsAll,
    tagAdd: tagAdd,
    tagRemove: tagRemove,
    tagsDeleteForCard: tagsDeleteForCard,

    statsAll: statsAll,
    statsSetWords: statsSetWords,
    statsDeleteForCard: statsDeleteForCard,

    imageOf: imageOf,
    imagesInFolder: imagesInFolder,
    imagesAll: imagesAll,
    setImage: setImage,
    clearImage: clearImage,
    imagesDeleteAll: imagesDeleteAll,

    settingGet: settingGet,
    settingAll: settingAll,
    settingSet: settingSet,

    // Named here on purpose: the delegation loop below only fills what this object does NOT define, and every one of these has to go through the journal (the two fts writers stage; the four reads pay the desk first, or they answer out of a table that has not heard the last edits).
    ftsUpsert: ftsUpsert,
    ftsDelete: ftsDelete,
    ftsDeleteAll: ftsDeleteAll,
    search: search,
    pagesWithText: pagesWithText,
    sectionsWithText: sectionsWithText,
    cardsWithText: cardsWithText,

    pageCountsInFolder: pageCountsInFolder,
    pageCountsAll: pageCountsAll,
    sectionCountsInFolder: sectionCountsInFolder,
    tagCountsInFolder: tagCountsInFolder,
    statsWordsInFolder: statsWordsInFolder,
    statsMissingInFolder: statsMissingInFolder,
    textInFolder: textInFolder,

    refsOutInFolder: refsOutInFolder,
    refsInInFolder: refsInInFolder,
    refsChanged: refsChanged,

    trashedCards: trashedCards,
    trashedFolders: trashedFolders,
    noteTrash: noteTrash,

    foldersDeleteAll: foldersDeleteAll,
    cardsDeleteAll: cardsDeleteAll,
    pagesDeleteAll: pagesDeleteAll,
    sectionsDeleteAll: sectionsDeleteAll,
    cardTagsDeleteAll: cardTagsDeleteAll,
    statsDeleteAll: statsDeleteAll,
    settingsDeleteAll: settingsDeleteAll,

    drop: drop,
  };

  // EVERYTHING ELSE lib/store.js carries — search, the fts writers, the LIKE scans, the reference counts, ensure(), and any statement added to that file after this one was written — reaches SQL through the same handle. Delegation walks the store's own keys, so a method cannot go missing here by omission; anything named above keeps its own definition.
  for (const key of Object.keys(store)) {
    if (key in handle) continue;
    const value = store[key];
    if (typeof value !== "function") {
      handle[key] = value;
      continue;
    }
    handle[key] = function () {
      return value.apply(store, arguments);
    };
  }

  return handle;
}

// The graph for one book. Same call shape as STORE.book(id) — null for an id that is not an id, so
// a caller's own "is this a book" gate keeps working unchanged.
export function book(bookId) {
  const store = STORE.book(bookId);
  if (!store) return null;
  const id = store.bookId;
  if (!CACHE[id]) {
    const made = makeGraph(id);
    if (!made) return null;
    CACHE[id] = made;
  }
  return CACHE[id];
}

// Drop one book's memory, or every book's. The next read reloads from SQL.
export function invalidate(bookId) {
  if (bookId == null || bookId === "") {
    for (const id in CACHE) CACHE[id].invalidate();
    return true;
  }
  const id = String(bookId);
  if (CACHE[id]) CACHE[id].invalidate();
  return true;
}

// The reference counts only — one book's, or (the usual call) every book's. A save rewrites the edges of the card that was saved, and those edges point INTO other books, so one card's save can change another book's backlink numbers. Dropping the pair costs two statements on the next folder open; holding a wrong number costs a wrong number.
export function refsChanged(bookId) {
  if (bookId == null || bookId === "") {
    for (const id in CACHE) CACHE[id].refsChanged();
    return true;
  }
  const id = String(bookId);
  if (CACHE[id]) CACHE[id].refsChanged();
  return true;
}

// Which books this seat has a graph for. Not a list of books that exist.
export function ids() {
  return Object.keys(CACHE);
}

module.exports = { book, invalidate, refsChanged, ids };
