// Card repository: guarded writes, reference/FTS updates, stacks and pages. SQL stays literal in store.js. Root parents use the book ID; stackId identifies the primary card, not its top member. Deletion cleans dependent rows explicitly.

const IDS = require("lib/ids.js");
const SCHEMA = require("lib/schema.js");
const EDITOR = require("lib/editor-registry.js");
// The compile flag rides the STORE directly, never the graph mirror: the mirror copies rows column
//   for column and knows nothing of this column, so a mirrored read would answer a stale 1.
const STORE = require("lib/store.js");
// The in-memory graph in FRONT of the store: same method names and row shapes, reads from memory, writes through to SQL first.
const GRAPH = require("lib/graph.js");
const LIB = require("lib/library.js");
const REFS = require("lib/refs.js");
const CHANGELOG = require("lib/changelog.js");
// The pinned registry — and with it, which books are READ-ONLY.
const PIN = require("lib/pinned.js");
const FENCE = require("lib/writefence.js");
const ATMOS = require("lib/atmos.js");
// The writing desk in front of the store — a structural write pays it before asking the table
// whether the row is really there (landed()).
const JOURNAL = require("lib/journal.js");
// The net under the hand-cascade: the dangling-row sweep, reachable from the repository so its
// statements ride the same published lane every other card statement does.
const INTEGRITY = require("lib/integrity.js");
// THE BOOK STAMP: record() below is the one funnel every user-visible write passes, so the stamp
//   rides it - one bump per write, never one per row. Undo/redo (SILENT) stamp in lib/changelog.js.
const BOOKREV = require("lib/bookrev.js");

const DEFAULT_NAME = "New Card";
const CARD = "card";
const FOLDER = "folder";
const DEFAULT_FOLDER_NAME = "New Folder";
// Both caps are refusals, not silent truncations — a row pointing at its own ancestor must still end the walk.
const MAX_DEPTH = 32;
const MAX_FOLDERS = 500;

// Per-seat caches — forget() drops them on boot.
let projectReady = false;
const DDL_DONE = {};
const VERSION_OK = {};
const PROJECT_OF = {};

// The pending layer: createCard() plans the whole row in memory and hands it back without waiting on SQL; listFolder merges PENDING over the database rows by id, in sortKey order. Edits aimed at a still-pending card queue against it and run in order once the insert lands.
const PENDING = {};
const FOLDERS = {};
// The same two maps for FOLDER rows.
const PFOLDERS = {};
const FSNAPS = {};
const STATUS = {}; // bookId -> "ready" | "opening"
const WATCHERS = [];
let LAST_ERROR = null; // { bookId, cardId, message }

export function forget() {
  projectReady = false;
  for (const k in DDL_DONE) delete DDL_DONE[k];
  for (const k in VERSION_OK) delete VERSION_OK[k];
  for (const k in PROJECT_OF) delete PROJECT_OF[k];
  for (const k in PENDING) delete PENDING[k];
  for (const k in FOLDERS) delete FOLDERS[k];
  for (const k in PFOLDERS) delete PFOLDERS[k];
  for (const k in FSNAPS) delete FSNAPS[k];
  for (const k in STATUS) delete STATUS[k];
  // A boot never inherits a half-held index: the hold is a within-pass thing and nothing else.
  INDEX_HOLD = 0;
  for (const k in INDEX_PENDING) delete INDEX_PENDING[k];
  LAST_ERROR = null;
}

export function pkey(bookId, cardId) {
  return text(bookId) + "\u0000" + text(cardId);
}

export function fkey(bookId, folderId) {
  return text(bookId) + "\u0000" + text(folderId);
}

export function pendingEntry(bookId, cardId) {
  return PENDING[pkey(bookId, cardId)] || null;
}


export function pendingRows(bookId, folderId) {
  const bid = text(bookId);
  const fid = text(folderId);
  const out = [];
  for (const k in PENDING) {
    const e = PENDING[k];
    if (e.removed || e.bookId !== bid) continue;
    if (fid && e.row.folderId !== fid) continue;
    out.push(e.row);
  }
  return out;
}

export function notify(event) {
  for (let i = 0; i < WATCHERS.length; i++) {
    try {
      WATCHERS[i](event);
    } catch (e) {
      /* a watcher never breaks a write */
    }
  }
}

// Returns unsubscribe.
export function onChange(fn) {
  if (typeof fn !== "function") return function () {};
  WATCHERS.push(fn);
  return function () {
    const i = WATCHERS.indexOf(fn);
    if (i >= 0) WATCHERS.splice(i, 1);
  };
}

export function lastCreateError() {
  return LAST_ERROR;
}

export function isPending(bookId, cardId) {
  return !!pendingEntry(bookId, cardId);
}

// "ready" once this seat has opened the book, "unknown" before that — nothing stays "opening".
export function bookStatus(bookId) {
  return STATUS[text(bookId)] || "unknown";
}

// Never rejects.
export function settleOf(bookId, cardId) {
  const e = pendingEntry(bookId, cardId);
  return e && e.done ? e.done : Promise.resolve({ ok: true, id: text(cardId) });
}

export function pendingRow(bookId, cardId) {
  const e = pendingEntry(bookId, cardId);
  return e ? Object.assign({}, e.row) : null;
}


export function emptyStats() {
  return { pages: 0, sections: 0, tags: 0, refsOut: 0, refsIn: 0, words: 0 };
}

// Words as a writer counts them: whitespace-separated runs of the card's page and section text.
export function countWords(s) {
  const t = text(s).trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export function sleep(api, seconds) {
  return new Promise(function (resolve) {
    try {
      api.runInSeconds(seconds, function () {
        resolve(true);
      });
    } catch (e) {
      resolve(false);
    }
  });
}


export function changelog() {
  return CHANGELOG && typeof CHANGELOG.record === "function" ? CHANGELOG : null;
}

export function references() {
  return REFS && typeof REFS.onCardRenamed === "function" ? REFS : null;
}


export function fail(message) {
  throw new Error("[cards] " + message);
}

export function rowsOf(res) {
  return (res && res.rows) || [];
}

export function text(v) {
  return v == null ? "" : String(v);
}

export function replaceAll(s, from, to) {
  return String(s).split(from).join(to);
}

export function shapeCard(r) {
  return {
    id: text(r.id),
    name: text(r.name),
    folderId: text(r.folderId),
    stackId: text(r.stackId) || text(r.id),
    sortKey: text(r.sortKey),
    stackOrder: text(r.stackOrder),
    status: text(r.status),
    priority: Number(r.priority || 0),
    summary: text(r.summary),
    openQuestion: Number(r.openQuestion || 0) === 1,
    editor: EDITOR.value(r.editor),
    duplicatedFrom: text(r.duplicatedFrom),
    createdAt: Number(r.createdAt || 0),
  };
}

export function shapePage(r) {
  return {
    id: text(r.id),
    cardId: text(r.cardId),
    sortKey: text(r.sortKey),
    title: text(r.title),
    content: text(r.content),
    header: text(r.header),
    footer: text(r.footer),
  };
}

export function shapeSection(r) {
  return {
    id: text(r.id),
    cardId: text(r.cardId),
    name: text(r.name),
    content: text(r.content),
    lineLimit: Number(r.lineLimit || 0),
    sortKey: text(r.sortKey),
  };
}

export function byKey(a, b) {
  return IDS.cmp(a.sortKey, b.sortKey) || IDS.cmp(a.id, b.id);
}

export function byStackOrder(a, b) {
  return IDS.cmp(a.stackOrder, b.stackOrder) || IDS.cmp(a.id, b.id);
}

// The shared-table statement set for one book; the only refusal left is a string that is not a book id at all.
export function bookOf(bookId) {
  const id = text(bookId);
  // THE CONTAINMENT LAW, ENFORCED AT THE WRITE ("No project, no book. No books, no cards."). Every write in this file comes through here for its statement set, so this line is where a bookless write dies — thrown, never a silent no-op.
  if (!id) fail("a card needs a book — refused (no books, no cards)");
  const entry = GRAPH.book(id);
  if (!entry) fail("book " + JSON.stringify(id) + " is not a book id — lib/store.js has no statement set for it");
  return entry;
}

// Names a mistyped statement out loud instead of throwing "is not a function" from inside a query.
export function needQuery(entry, name, bookId) {
  if (typeof entry[name] !== "function") {
    fail("lib/store.js has no " + name + " statement (book " + JSON.stringify(text(bookId)) + ")");
  }
  return entry[name];
}

// ── THE LANDING CHECK (2026-08-29) ──────────────────────────────────────────────────────────── A write staged on the journal's desk is not a row in a table. A refused flush, or a seat that ends before the desk is paid, used to leave the row unwritten while change_log carried the whole payload as though it had landed. So: pay the desk, then ask the TABLE — never the graph's map, which is exactly where a half-landed write lies.

const TABLE_GET = {
  card: function (t, api, id) { return t.cardGet(api, id); },
  folder: function (t, api, id) { return t.folderGet(api, id); },
  page: function (t, api, id) { return t.pageGet(api, id); },
  section: function (t, api, id) { return t.sectionGet(api, id); },
};

export function tableOf(bookId) {
  const t = STORE.book(text(bookId));
  if (!t) fail("book " + JSON.stringify(text(bookId)) + " is not a book id — no statement set to verify against");
  return t;
}

export async function settleDesk(api, bookId) {
  try {
    await JOURNAL.flush(api, text(bookId));
  } catch (e) {
    fail("the write desk for book " + text(bookId) + " could not be paid: " + text((e && e.message) || e));
  }
}

// Throws unless the row is in the database with the fields the write claimed. `fields` is optional.
export async function landed(api, bookId, kind, id, fields) {
  await settleDesk(api, bookId);
  const get = TABLE_GET[kind];
  if (!get) fail("landed(): no table reader for a " + text(kind));
  const row = rowsOf(await get(tableOf(bookId), api, text(id)))[0] || null;
  if (!row) {
    fail(
      "the " + kind + " " + JSON.stringify(text(id)) + " never reached the database (book " + text(bookId) +
        ") — the write was refused or lost, and nothing was journalled"
    );
  }
  if (fields) {
    for (const k in fields) {
      if (text(row[k]) !== text(fields[k])) {
        fail(
          "the " + kind + " " + JSON.stringify(text(id)) + " landed with " + k + " = " +
            JSON.stringify(text(row[k])) + ", not " + JSON.stringify(text(fields[k])) + " — the write half-landed"
        );
      }
    }
  }
  return row;
}

// Verify-after-delete: every mirror table counted for this id, zero everywhere or the purge is a lie.
export async function noGhosts(api, bookId, kind, id) {
  const t = tableOf(bookId);
  // One reader per kind. page/section joined the list when their moods started riding their delete
  // (2026-08-29): a page's mood row is a ghost exactly the way a card's card_names row is.
  const reader =
    kind === "folder" ? t.folderGhosts : kind === "page" ? t.pageGhosts : kind === "section" ? t.sectionGhosts : t.cardGhosts;
  if (typeof reader !== "function") return true;
  const left = [];
  const counts = rowsOf(await reader(api, text(id)))[0] || {};
  for (const t in counts) {
    if (Number(counts[t] || 0) > 0) left.push(text(t) + "=" + Number(counts[t]));
  }
  if (left.length) {
    fail("the " + kind + " " + JSON.stringify(text(id)) + " left rows behind: " + left.join(", ") + " — the delete did not finish");
  }
  return true;
}

export async function ensureProjectTables(api) {
  if (projectReady) return;
  await SCHEMA.ensureProject(api);
  projectReady = true;
}

// NO per-book DDL — the shared tables are made once per database, so a real book id is ALWAYS ready on the first call.
export async function ensureBook(api, bookId) {
  const id = text(bookId);
  if (!id) fail("ensureBook needs a book id");
  await ensureProjectTables(api);
  // The graph handle, not the bare statement set. load() is idempotent and instant when the book is
  // already held; a load that cannot reach the database is LOGGED, not thrown — every read lazily
  // retries it and throws there instead.
  const entry = GRAPH.book(id);
  // Not a book id at all: nothing to open, and never an exception — callers check .ready.
  if (!entry) return { ready: false, stale: false, pending: false, entry: null };
  try {
    await entry.load(api);
  } catch (e) {
    // NEVER SERVE AN EMPTY BOOK AS HEALTHY (2026-08-29). A load that could not reach the database used to be logged and the book called "ready" — every read then answered out of empty maps and every write ran against a book that looked blank. The failure is the answer now.
    const why = String((e && e.message) || e);
    STATUS[id] = "failed";
    api.log("[cards] the project graph for " + id + " could not be loaded: " + why);
    fail("book " + id + " could not be read from the database (" + why + ") — refusing to serve an empty book");
  }
  if (VERSION_OK[id] && DDL_DONE[id]) return { ready: true, stale: false, pending: false, entry: entry };
  DDL_DONE[id] = true;
  VERSION_OK[id] = true;
  STATUS[id] = "ready";
  flushParked(api, id);
  return { ready: true, stale: false, pending: false, entry: entry };
}

// Nothing parks any more; this is the safety net for anything left behind.
export function flushParked(api, bookId) {
  const bid = text(bookId);
  for (const k in PENDING) {
    const e = PENDING[k];
    if (e.bookId !== bid || !e.parked || e.running) continue;
    e.parked = false;
    e.done = runCreate(api, e);
  }
  for (const k in PFOLDERS) {
    const e = PFOLDERS[k];
    if (e.bookId !== bid || !e.parked || e.running) continue;
    e.parked = false;
    e.done = runFolderCreate(api, e);
  }
}

// The one gate every deferred write goes through; returns the last status seen.
export async function bookReadyOrWait(api, bookId, tries) {
  const max = Math.max(1, Math.floor(Number(tries) || 8));
  let st = await ensureBook(api, bookId);
  for (let i = 0; i < max && !st.ready; i++) {
    const slept = await sleep(api, 0.5);
    if (!slept) break;
    st = await ensureBook(api, bookId);
  }
  return st;
}

// Pinned books sit on no project's shelf — no `books` row BY DESIGN; their scope is the sentinel projectId ''. Spelled out as ids here to avoid a require cycle with research.js.
const SELF_SCOPED = [IDS.SENTINELS.RESEARCH];
const PINNED_PID = "";

// One project (his 2026-08-25 ruling): every book is filed under lib/schema.js's PROJECT_ID, a pinned book's sentinel the one exception.
export async function projectIdOf(api, bookId) {
  const id = text(bookId);
  if (SELF_SCOPED.indexOf(id) !== -1) return PINNED_PID;
  return SCHEMA.PROJECT_ID;
}

export async function booksInProject(api, projectId) {
  const pid = text(projectId);
  if (!pid) return [];
  const res = await api.sql`SELECT id FROM books WHERE projectId = ${pid}`;
  return rowsOf(res).map((r) => text(r.id));
}

export async function nowMs(api) {
  return await LIB.nowMs(api);
}

// Ids are clock + randomness; inside one batch we still check for a repeat.
export function mintId(api, ms, seen) {
  for (let i = 0; i < 8; i++) {
    const id = IDS.uid(api, ms);
    if (!seen || !seen[id]) {
      if (seen) seen[id] = true;
      return id;
    }
  }
  fail("could not mint a fresh card id");
}

// refs.js owns card_names; this fallback exists because the row must be there either way, or every #[id] pointing here renders as a dead reference.

export async function writeName(api, bookId, projectId, cardId, name, created) {
  const refs = references();
  if (refs) {
    const hook = created && typeof refs.onCardCreated === "function" ? refs.onCardCreated : refs.onCardRenamed;
    await hook(api, {
      bookId: text(bookId),
      projectId: text(projectId),
      cardId: text(cardId),
      name: text(name),
    });
    return;
  }
  api.log("[cards] lib/refs.js is unavailable — writing card_names directly for " + text(cardId));
  await api.sql`INSERT INTO card_names (cardId, bookId, projectId, name)
    VALUES (${text(cardId)}, ${text(bookId)}, ${text(projectId)}, ${text(name)})
    ON CONFLICT(cardId) DO UPDATE SET
      bookId = excluded.bookId, projectId = excluded.projectId, name = excluded.name`;
}

// Outbound edges go; inbound edges are deliberately LEFT STANDING — that is what renders a token pointing here as Deleted Reference.
export async function dropName(api, bookId, projectId, cardId) {
  // Whichever branch runs, edges disappear — drop the in-memory count pair in every book.
  if (typeof GRAPH.refsChanged === "function") GRAPH.refsChanged();
  // No foreign keys anywhere in this app, so the card's moods leave by hand. Named, never swallowed.
  try {
    await ATMOS.clearCard(api, bookId, cardId);
  } catch (e) {
    api.log("[cards] the atmosphere marks for card " + text(cardId) + " outlived it: " + text((e && e.message) || e));
  }
  const refs = references();
  if (refs && typeof refs.onCardDeleted === "function") {
    await refs.onCardDeleted(api, { bookId: text(bookId), projectId: text(projectId), cardId: text(cardId) });
    return;
  }
  api.log("[cards] lib/refs.js is unavailable — clearing card_names directly for " + text(cardId));
  await api.sql`DELETE FROM cross_book_references WHERE fromId = ${text(cardId)}`;
  await api.sql`DELETE FROM card_names WHERE cardId = ${text(cardId)}`;
}

// The graph's own index when this seat has one, the table when it does not.
export async function trashedInBook(api, bookId) {
  const out = {};
  const b = bookOf(bookId);
  if (b && typeof b.trashedCards === "function") {
    for (const r of rowsOf(await b.trashedCards(api))) out[text(r.entityId)] = true;
    return out;
  }
  const res = await api.sql`SELECT entityId FROM trash WHERE entityType = 'card' AND originalBookId = ${text(bookId)}`;
  for (const r of rowsOf(res)) out[text(r.entityId)] = true;
  return out;
}

// A row that just went in the can must never ride a CACHED paint again. " TILES ONLY: `names` keeps the spelling, because a soft-deleted row still holds UNIQUE (folderId, name) and the create planner has to go on seeing that name as taken.
export function forgetCachedTile(bookId, id) {
  const tid = text(id);
  const prefix = text(bookId) + "\u0000";
  const sweep = function (map) {
    for (const k in map) {
      if (k.indexOf(prefix) !== 0) continue;
      const snap = map[k];
      if (!snap || !snap.tiles || !snap.tiles.length) continue;
      const kept = snap.tiles.filter((t) => text(t.id) !== tid);
      if (kept.length !== snap.tiles.length) snap.tiles = kept;
    }
  };
  sweep(FSNAPS);
  sweep(FOLDERS);
}

// Never a throw — the row is already written, and a missed mirror is corrected by the next load.
export function noteTrashed(bookId, kind, id, on) {
  const b = bookOf(bookId);
  if (b && typeof b.noteTrash === "function") b.noteTrash(kind, text(id), !!on);
}

// The id→name map read back for one card — how a delete audit proves the row is there, or gone.
export async function nameOf(api, cardId) {
  const res = await api.sql`SELECT cardId, bookId, projectId, name FROM card_names WHERE cardId = ${text(cardId)}`;
  const row = rowsOf(res)[0];
  return row ? { cardId: text(row.cardId), bookId: text(row.bookId), projectId: text(row.projectId), name: text(row.name) } : null;
}

// One book's trash, newest first — EVERY row, riders included: a card/folder that rode a trashed folder into the can is emitted right after its carrier line wearing { rider, riderOf, riderOfName, riderDepth }, so the window shows everything the typed DELETE N counts (his 2026-08-29 report: lines hidden while the confirm counted them). js pruneGhosts() kills those rows at the door — and a row the BOOK CACHE can't see yet (another seat's trash, a fresh join) falls back to one direct SQL read, so the listed lines and the typed DELETE N can never drift apart again.
export async function trashRowFolder(api, bookId, id) {
  const res = await api.sql`SELECT name FROM folders WHERE bookId = ${text(bookId)} AND id = ${text(id)}`;
  const r = rowsOf(res)[0];
  return r ? { name: text(r.name) } : null;
}

export async function trashRowCard(api, bookId, id) {
  const res = await api.sql`SELECT c.status AS status, c.summary AS summary, n.name AS name
    FROM cards c LEFT JOIN card_names n ON n.cardId = c.id
    WHERE c.bookId = ${text(bookId)} AND c.id = ${text(id)}`;
  const r = rowsOf(res)[0];
  return r ? { name: text(r.name), status: text(r.status), summary: text(r.summary) } : null;
}

export async function listTrash(api, bookId) {
  const res = await api.sql`SELECT entityId, entityType, originalFolderId, trashedAt FROM trash
    WHERE originalBookId = ${text(bookId)} AND entityType IN ('card', 'folder') ORDER BY trashedAt DESC`;
  const rows = rowsOf(res).map((r) => ({
    id: text(r.entityId),
    entityType: text(r.entityType) === FOLDER ? FOLDER : CARD,
    folderId: text(r.originalFolderId),
    trashedAt: Number(r.trashedAt || 0),
  }));

  // Which folders are in the can, and what each hung under: a row whose original parent is one of
  // them rode that folder down.
  const trashedFolder = {};
  const parentOfFolder = {};
  for (const r of rows) {
    if (r.entityType !== FOLDER) continue;
    trashedFolder[r.id] = true;
    parentOfFolder[r.id] = r.folderId;
  }

  // 'N cards inside' counts the whole subtree — a trashed card counts for every trashed folder above
  // it. MAX_DEPTH ends a cyclic chain.
  const counts = {};
  for (const r of rows) {
    if (r.entityType !== CARD) continue;
    let up = r.folderId;
    for (let d = 0; d < MAX_DEPTH && up && trashedFolder[up]; d++) {
      counts[up] = (counts[up] || 0) + 1;
      up = parentOfFolder[up];
    }
  }

  // The top of a rider's trashed-folder chain — the LOOSE folder line it rides under.
  const carrierOf = (folderId) => {
    let up = folderId;
    let top = "";
    let depth = 0;
    for (let d = 0; d < MAX_DEPTH && up && trashedFolder[up]; d++) {
      top = up;
      up = parentOfFolder[up];
      depth++;
    }
    return { top, depth };
  };

  const shaped = [];
  for (const r of rows) {
    if (r.entityType === FOLDER) {
      let folder = null;
      try {
        folder = await getFolder(api, bookId, r.id);
      } catch (err) {
        folder = null;
      }
      if (!folder) folder = await trashRowFolder(api, bookId, r.id);
      if (!folder) continue;
      shaped.push({
        id: r.id,
        entityType: FOLDER,
        name: text(folder.name) || DEFAULT_FOLDER_NAME,
        status: "",
        summary: "",
        folderId: r.folderId,
        trashedAt: r.trashedAt,
        childCount: counts[r.id] || 0,
      });
      continue;
    }
    let card = null;
    try {
      card = await getCard(api, bookId, r.id);
    } catch (err) {
      card = null;
    }
    if (!card) card = await trashRowCard(api, bookId, r.id);
    if (!card) continue;
    shaped.push({
      id: r.id,
      entityType: CARD,
      name: text(card.name) || DEFAULT_NAME,
      status: text(card.status),
      summary: text(card.summary),
      folderId: r.folderId,
      trashedAt: r.trashedAt,
      childCount: 0,
    });
  }

  const folderName = {};
  for (const s of shaped) if (s.entityType === FOLDER) folderName[s.id] = s.name;

  // Stitch: loose lines keep their newest-first order; each loose folder is followed by everything
  // riding it — folders before cards, shallow before deep, then newest first.
  const loose = [];
  const ridersUnder = {};
  for (const s of shaped) {
    if (s.folderId && trashedFolder[s.folderId]) {
      const ride = carrierOf(s.folderId);
      s.rider = true;
      s.riderOf = ride.top;
      s.riderOfName = folderName[ride.top] || "";
      s.riderDepth = ride.depth;
      (ridersUnder[ride.top] = ridersUnder[ride.top] || []).push(s);
      continue;
    }
    loose.push(s);
  }
  const out = [];
  for (const s of loose) {
    out.push(s);
    const pack = ridersUnder[s.id];
    if (!pack) continue;
    pack.sort(
      (a, b) =>
        a.riderDepth - b.riderDepth ||
        (a.entityType === b.entityType ? b.trashedAt - a.trashedAt : a.entityType === FOLDER ? -1 : 1)
    );
    for (const rider of pack) out.push(rider);
    delete ridersUnder[s.id];
  }
  // A rider whose carrier line vanished still shows — never hidden.
  for (const k in ridersUnder) for (const rider of ridersUnder[k]) out.push(rider);
  return out;
}

// Answered from the book's in-memory index instead of one round trip per card.
export async function isTrashedInBook(api, bookId, cardId) {
  const b = bookOf(bookId);
  if (b && typeof b.trashedCards === "function") {
    const map = await trashedInBook(api, bookId);
    return !!map[text(cardId)];
  }
  return await isTrashed(api, cardId);
}

export async function isTrashed(api, cardId) {
  const res = await api.sql`SELECT entityId FROM trash WHERE entityType = 'card' AND entityId = ${text(cardId)}`;
  return rowsOf(res).length > 0;
}


// "It should make the new name before saving to db." — so the census reads the DATABASE, STORE directly, never bookOf()'s mirror. A cold mirror honestly answers "no names taken" and mints a duplicate; the refusal then surfaces at the flush, poisons the desk, and every later write queues behind it. One indexed read, CUT B's own eye.
export async function namesIn(api, bookId, folderId, exclude) {
  await ensureBook(api, bookId);
  const s = STORE.book(text(bookId));
  const q = needQuery(s, "cardsInFolder", bookId);
  const taken = {};
  for (const r of rowsOf(await q(api, text(folderId)))) {
    const id = text(r.id);
    if (exclude && exclude[id]) continue;
    taken[text(r.name)] = true;
  }
  return taken;
}

export function pickName(taken, wanted) {
  const base = text(wanted).trim() || DEFAULT_NAME;
  if (!taken[base]) return base;
  for (let n = 2; n <= 9999; n++) {
    const candidate = base + " (" + n + ")";
    if (!taken[candidate]) return candidate;
  }
  fail("no free name left for " + JSON.stringify(base));
}

export async function uniqueName(api, bookId, folderId, wanted, excludeId) {
  const exclude = {};
  if (excludeId) exclude[text(excludeId)] = true;
  return pickName(await namesIn(api, bookId, folderId, exclude), wanted);
}

// ── PER-FOLDER UNIQUENESS, CODE-ENFORCED (CUT B, 2026-08-31) ────────────────────────────────── His ruling took `name` out of `cards`, and UNIQUE (folderId, name) went with it. Two cards in one folder still may not answer to the same name — that rule is HIS, so it is enforced here instead of by SQLite: one indexed read (cards(folderId) JOIN card_names, never through `books`) before the write, and a refusal that throws SQLite'S OWN WORDS on purpose. `folders` keep their real column and their real constraint.
export async function refuseNameClash(api, bookId, folderId, name, excludeId) {
  const t = tableOf(bookId);
  if (typeof t.siblingNamed !== "function") return;
  const rows = rowsOf(await t.siblingNamed(api, text(folderId), text(name), text(excludeId || "")));
  if (rows.length) {
    fail("UNIQUE constraint failed: cards.folderId, cards.name — " + JSON.stringify(text(name)) +
      " is already taken in that folder (card " + text(rows[0].id) + ")");
  }
}


export function placeKey(list, movingId, beforeId, afterId) {
  const skip = text(movingId);
  const rest = list.filter((r) => text(r.id) !== skip);
  const before = text(beforeId);
  const after = text(afterId);
  let lo = null;
  let hi = null;
  if (after) {
    const i = rest.findIndex((r) => text(r.id) === after);
    if (i >= 0) {
      lo = rest[i].sortKey;
      hi = i + 1 < rest.length ? rest[i + 1].sortKey : null;
    }
  }
  if (before) {
    const j = rest.findIndex((r) => text(r.id) === before);
    if (j >= 0) {
      hi = rest[j].sortKey;
      if (!after) lo = j > 0 ? rest[j - 1].sortKey : null;
    }
  }
  if (!lo && !hi) lo = rest.length ? rest[rest.length - 1].sortKey : null;
  return IDS.keyBetween(lo || null, hi || null);
}

// One read of the card's text feeds the fts row AND refs.indexRefs — which wants ALL of a card's text at once, since half of it would delete the other half's edges.

export async function reindexNow(api, bookId, cardId) {
  const b = bookOf(bookId);
  const id = text(cardId);
  const card = rowsOf(await b.cardGet(api, id))[0];
  if (!card) {
    await b.ftsDelete(api, id);
    return;
  }
  const texts = [text(card.summary)];
  const prose = [];
  // The inline moods this card's words are carrying right now — harvested on the SAME read that feeds the fts row and the edge index, so a #[atmo:…] token costs no query of its own and the page's one batched save replaces the whole set. lib/atmos.js's replaceInline issues nothing at all when there are no moods and none to clear.
  const marks = [];
  for (const s of rowsOf(await b.sectionsForCard(api, id))) {
    texts.push(text(s.name), text(s.content));
    prose.push(text(s.content));
    for (const m of REFS.atmoTokens(text(s.content))) {
      marks.push({ sectionId: text(s.id), pageId: "", atmo: m.atmo, pos: marks.length });
    }
  }
  for (const p of rowsOf(await b.pagesForCard(api, id))) {
    texts.push(text(p.title), text(p.header), text(p.content), text(p.footer));
    for (const m of REFS.atmoTokens(text(p.header) + "\n" + text(p.content) + "\n" + text(p.footer))) {
      marks.push({ sectionId: "", pageId: text(p.id), atmo: m.atmo, pos: marks.length });
    }
    // His ruling: a page's words are everything written ON the page — header, body and footer.
    // Titles are labels, not prose, so they stay out.
    prose.push(text(p.header), text(p.content), text(p.footer));
  }
  const body = texts.filter((x) => x !== "").join("\n");
  await b.ftsUpsert(api, id, text(card.name), body);

  // Every text write comes through here, so the badge's number is recomputed from the whole text
  // and cannot drift.
  if (typeof b.statsSetWords === "function") {
    let words = 0;
    for (const t of prose) words += countWords(t);
    await b.statsSetWords(api, id, words);
  }

  // An edge from this card can land in ANY book, so every graph's cached count pair goes stale here,
  // not just this book's. Rebuilt on the next folder open that shows the badges.
  if (typeof GRAPH.refsChanged === "function") GRAPH.refsChanged();

  const refs = references();
  if (refs && typeof refs.indexRefs === "function") {
    await refs.indexRefs(api, {
      projectId: await projectIdOf(api, bookId),
      bookId: text(bookId),
      fromId: id,
      texts: texts,
    });
  }

  // The mood index, refreshed the same way and in the same pass. A failure here is named and
  // stepped over: a missing chip in the search pane must never cost the author their words.
  try {
    await ATMOS.replaceInline(api, text(bookId), id, marks);
  } catch (e) {
    api.log("[cards] the atmosphere marks for card " + id + " were not refreshed: " + text((e && e.message) || e));
  }
}

// A filing pass writes card, meta, each section, each page — EVERY piece reindexes the same card: two cards cost ~24 full index passes where one per card is the truth. - Nested holds COUNT: an inner flush only decrements, the outermost does the work, so a nested hold cannot flush its parent's set early. A flush after a half-finished pass is safe — a recorded card that never landed has no row, and reindexNow drops its fts entry as always. - Per-card failure in the flush is logged and stepped over: the pass indexes every other card rather than stopping at the first bad id (house rule 3 — named, never swallowed).
let INDEX_HOLD = 0;
const INDEX_PENDING = {}; // "book\u0000card" -> { bookId, cardId }

export function holdIndex() {
  INDEX_HOLD += 1;
  return INDEX_HOLD;
}

// Whoever paints the book's vitals registers here — called once after every COMPLETED index pass (a single write's reindex, or a filing pass's one flush) with the book that changed. One slot, like changelog's registerReindex; a listener that throws is logged and never costs the write.
let AFTER_INDEX = null;
export function registerAfterIndex(fn) {
  AFTER_INDEX = typeof fn === "function" ? fn : null;
}
export function indexLanded(api, bookId) {
  if (!AFTER_INDEX) return;
  try {
    AFTER_INDEX(api, text(bookId));
  } catch (e) {
    try {
      api.log("[cards] after-index listener threw: " + text((e && e.message) || e));
    } catch (e2) {
      // a seat without a log is still not allowed to lose the write
    }
  }
}

export async function reindex(api, bookId, cardId) {
  if (INDEX_HOLD > 0) {
    const bid = text(bookId);
    const cid = text(cardId);
    if (bid && cid) INDEX_PENDING[bid + "\u0000" + cid] = { bookId: bid, cardId: cid };
    return;
  }
  await reindexNow(api, bookId, cardId);
  indexLanded(api, bookId);
}

export async function flushIndex(api) {
  if (INDEX_HOLD > 0) INDEX_HOLD -= 1;
  if (INDEX_HOLD > 0) return 0; // an inner release — the outer hold still owns the set
  let done = 0;
  const touchedBooks = {};
  const keys = Object.keys(INDEX_PENDING);
  for (let i = 0; i < keys.length; i++) {
    const job = INDEX_PENDING[keys[i]];
    delete INDEX_PENDING[keys[i]]; // out of the set BEFORE the await: the flush runs unheld
    try {
      await reindexNow(api, job.bookId, job.cardId);
      touchedBooks[job.bookId] = true;
      done += 1;
    } catch (e) {
      try {
        api.log(
          "[cards] the held index pass left card " + job.cardId + " unindexed: " +
            String((e && e.message) || e)
        );
      } catch (e2) {
        // a seat without a log is not a reason to abandon the rest of the pass
      }
    }
  }
  for (const bid in touchedBooks) indexLanded(api, bid);
  return done;
}

// The stored counter is a cache, so a change to the COUNTING RULE has to walk the cards written under the old one.
export async function recountWords(api, bookId) {
  assertBookMutable(bookId);
  const b = bookOf(bookId);
  if (!b || typeof b.cardsAll !== "function") return 0;
  const rows = rowsOf(await b.cardsAll(api));
  let n = 0;
  for (const r of rows) {
    await reindex(api, bookId, text(r.id));
    n += 1;
  }
  return n;
}

// Reads are NEVER recorded. Every mutation below funnels through here. A reversal is not a new command: while an undo handler runs the whole repository goes quiet — the pointer moves, not the journal. Nested verbs fall silent with it.
let SILENT = 0;
export async function silently(fn) {
  SILENT += 1;
  try {
    return await fn();
  } finally {
    SILENT = Math.max(0, SILENT - 1);
  }
}

export async function record(api, bookId, cmd) {
  if (SILENT > 0) return null;
  const log = changelog();
  // A pinned book FILES under the sentinel '' (card_names/refs read it that way), but the changelog keys undo streams on projectId and refuses an empty one — so its commands ride the one project's stream. Reversal targets row.bookId, so undo still lands in the pinned book.
  const filed = await projectIdOf(api, bookId);
  const command = Object.assign(
    {
      projectId: filed || SCHEMA.PROJECT_ID,
      bookId: text(bookId),
      targetType: CARD,
      before: null,
      after: null,
      actor: "",
      undoable: true,
    },
    cmd || {}
  );
  command.actor = text(command.actor);
  // THE BOOK STAMP rides here, before the seed exit: every row write this funnel sees bumps the book's rev exactly once, so another open seat's poll (lib/bookrev.js) learns to reload. `who` is the actor the lane carries; a blank one falls back to this seat's user id.
  await BOOKREV.touch(api, bookId, command.actor || text(api && api.userId) || "savi");
  // The seed lane (pinned-book bootstrap) is not a user gesture: journaled, it would hand a fresh
  //   seat "undo" = un-create a Research folder. Same sentinel adoptTwins already uses.
  if (command.actor === "seed") return null;
  if (!log) {
    api.log("[cards] lib/changelog.js has no record() — " + command.type + " on " + command.targetId + " ran unrecorded");
    return null;
  }
  return await log.record(api, command);
}


// CARD VITALS: six counts for a whole folder in one parallel breath, never one query per card. The
// typeof guard is belt and braces — a missing count degrades to zeros rather than breaking the grid.
export async function folderStats(api, bookId, folderId) {
  const b = bookOf(bookId);
  const need = [
    "pageCountsInFolder",
    "sectionCountsInFolder",
    "tagCountsInFolder",
    "refsOutInFolder",
    "refsInInFolder",
    "statsWordsInFolder",
    "statsMissingInFolder",
  ];
  for (const n of need) if (typeof b[n] !== "function") return {};
  const fid = text(folderId);
  const res = await Promise.all([
    b.pageCountsInFolder(api, fid),
    b.sectionCountsInFolder(api, fid),
    b.tagCountsInFolder(api, fid),
    b.refsOutInFolder(api, fid),
    b.refsInInFolder(api, fid),
    b.statsWordsInFolder(api, fid),
    b.statsMissingInFolder(api, fid),
  ]);
  const map = {};
  const keys = ["pages", "sections", "tags", "refsOut", "refsIn", "words"];
  for (let i = 0; i < keys.length; i++) {
    for (const r of rowsOf(res[i])) {
      const id = text(r.cardId);
      if (!map[id]) map[id] = emptyStats();
      map[id][keys[i]] = Number(r.n || 0);
    }
  }
  const missing = rowsOf(res[6]).map((r) => text(r.cardId));
  if (missing.length) {
    const filled = await backfillWords(api, bookId, fid, missing);
    for (const id in filled) {
      if (!map[id]) map[id] = emptyStats();
      map[id].words = filled[id];
    }
  }
  return map;
}

// Cards written before the counter existed: read their text ONCE and write the counter down so no
// later listing scans them again. Derived cache — a failed write is logged, the listing still shows
// the number it just counted.
export async function backfillWords(api, bookId, folderId, ids) {
  const b = bookOf(bookId);
  if (typeof b.textInFolder !== "function") return {};
  const want = {};
  for (const id of ids) want[id] = 0;
  for (const r of rowsOf(await b.textInFolder(api, text(folderId)))) {
    const id = text(r.cardId);
    if (!(id in want)) continue;
    want[id] += countWords(r.body);
  }
  if (typeof b.statsSetWords === "function") {
    for (const id in want) {
      const n = want[id];
      Promise.resolve(b.statsSetWords(api, id, n)).catch(function (e) {
        api.log("[cards] word counter for " + id + " could not be stored: " + String((e && e.message) || e));
      });
    }
  }
  return want;
}

export function pendingTiles(bookId, folderId) {
  return pendingRows(bookId, folderId)
    .map((r) => Object.assign({}, r, { isStack: false, stackSize: 1, pending: true, stats: emptyStats() }))
    .sort(byKey);
}

// The last listing this seat read, with anything in flight merged over it — no round trip.
export function listFolderCached(bookId, folderId) {
  const fid = text(folderId) || text(bookId);
  const snap = FOLDERS[fkey(bookId, fid)];
  const out = (snap ? snap.tiles.slice() : []).filter((t) => {
    const e = pendingEntry(bookId, t.id);
    return !(e && e.removed);
  });
  const seen = {};
  for (const t of out) seen[t.id] = true;
  for (const t of pendingTiles(bookId, fid)) if (!seen[t.id]) out.push(t);
  return out.sort(byKey);
}

export async function listFolder(api, bookId, folderId) {
  const fid = text(folderId) || text(bookId);
  const st = await ensureBook(api, bookId);
  if (!st.ready) {
    // Not a book this repository can open: what is on screen is the answer — never a throw.
    return pendingTiles(bookId, fid);
  }
  const b = bookOf(bookId);
  const answers = await Promise.all([
    b.cardsInFolder(api, fid),
    trashedInBook(api, bookId),
    folderStats(api, bookId, fid),
  ]);
  const live = rowsOf(answers[0]).map(shapeCard);
  const hidden = answers[1];
  const stats = answers[2];

  const groups = {};
  const order = [];
  for (const c of live) {
    if (hidden[c.id]) continue;
    if (!groups[c.stackId]) {
      groups[c.stackId] = [];
      order.push(c.stackId);
    }
    groups[c.stackId].push(c);
  }

  const out = [];
  for (const sid of order) {
    const members = groups[sid].slice().sort(byStackOrder);
    // Two cards, two jobs: the PRIMARY is the export/reference target and keys the stack
    // (id === stackId); the TOP is face-up on the pile, and face-up is what a tile draws.
    const primary = members.find((m) => m.id === sid) || members[0];
    const top = members[0];
    if (members.length === 1) {
      out.push(
        Object.assign({}, primary, {
          isStack: false,
          stackSize: 1,
          pending: false,
          stats: stats[primary.id] || emptyStats(),
        })
      );
    } else {
      out.push(
        Object.assign({}, top, {
          // identity stays the stack's, so every op that keys on the tile still finds it
          id: primary.id,
          stackId: sid,
          sortKey: primary.sortKey,
          folderId: primary.folderId,
          isStack: true,
          stackSize: members.length,
          topId: top.id,
          primaryId: primary.id,
          members: members,
          pending: false,
          stats: stats[top.id] || emptyStats(),
        })
      );
    }
  }

    rememberFolder(bookId, fid, live, out);

  // Pending over database, one entry per id: the tile never doubles, and a row whose trash is still
  // queued is taken back off.
  const seen = {};
  for (const t of out) seen[t.id] = true;
  for (const t of pendingTiles(bookId, fid)) if (!seen[t.id]) out.push(t);
  const merged = out.filter((t) => {
    const e = pendingEntry(bookId, t.id);
    return !(e && e.removed);
  });
  const tiles = merged.sort(byKey);
  const snap = FOLDERS[fkey(bookId, fid)];
  if (snap) snap.tiles = tiles;
  return tiles;
}

export async function getCard(api, bookId, cardId) {
  // A card whose insert is still in the air: wait rather than answer "no such card". Every op reads
  // a card through here, so the guard belongs here.
  const waiting = pendingEntry(bookId, cardId);
  if (waiting && waiting.done) await waiting.done;
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const row = rowsOf(await b.cardGet(api, text(cardId)))[0];
  if (row) return shapeCard(row);
  // A NULL IS NEVER SERVED FROM MEMORY ALONE (2026-08-29). The graph is ONE SEAT'S cache: a load that came back thin, or another seat's write, both read here as "no such card" — and every write verb gates on this answer. Ask the table before saying no; a hit means the cache is stale.
  const real = rowsOf(await tableOf(bookId).cardGet(api, text(cardId)))[0];
  if (!real) return null;
  api.log("[cards] the graph for book " + text(bookId) + " did not know card " + text(cardId) + " but the table does — reloading");
  GRAPH.invalidate(text(bookId));
  return shapeCard(real);
}

export async function listStack(api, bookId, stackId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  return rowsOf(await b.stackMembers(api, text(stackId))).map(shapeCard).sort(byStackOrder);
}

// Search is MATCH + snippet + bm25. A HIT IS NOT AN ID: a row says where the card lives, which field matched, and shows matching text — on a FIXED number of queries per search, never one per hit.
const SEARCH_TIER = { name: 0, summary: 1, section: 2, page: 3, text: 4 };

export function searchTerms(query) {
  return text(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t !== "");
}

export function hasAnyTerm(hay, terms) {
  const h = text(hay).toLowerCase();
  for (const t of terms) if (t && h.indexOf(t) !== -1) return true;
  return false;
}

// A window of `body` around the first term, cut at word edges. No markers — the highlight is the
// renderer's, over its own escaped text (house rule 4).
export function snippetAround(body, terms, span) {
  const raw = text(body).replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const width = Math.max(40, Math.floor(Number(span) || 150));
  const low = raw.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = low.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return raw.length > width ? raw.slice(0, width).replace(/\s\S*$/, "") + "…" : raw;
  const start = Math.max(0, at - Math.floor(width / 3));
  const end = Math.min(raw.length, start + width);
  let out = raw.slice(start, end);
  if (start > 0) out = "…" + out.replace(/^\S*\s/, "");
  if (end < raw.length) out = out.replace(/\s\S*$/, "") + "…";
  return out;
}

// The LIKE needle for one term. % and _ are LIKE's own wildcards, so a typed one is not one.
export function likeNeedle(term) {
  return "%" + text(term).replace(/[%_]/g, " ") + "%";
}

// May throw: the scan it feeds is an ENRICHMENT, so failure costs a snippet, never the row.
export function tryQuery(fn) {
  return Promise.resolve()
    .then(fn)
    .catch(() => null);
}

export async function search(api, bookId, query, opts) {
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const match = terms.map((t) => '"' + t.replace(/"/g, "") + '"*').join(" ");
  const limit = Math.max(1, Math.min(200, Math.floor(Number((opts || {}).limit) || 40)));
  const hidden = await trashedInBook(api, bookId);
  const hits = rowsOf(await b.search(api, match, limit))
    .map((r) => ({ cardId: text(r.cardId), name: text(r.name), excerpt: text(r.excerpt), rank: Number(r.rank || 0) }))
    .filter((r) => !hidden[r.cardId]);
  if (!hits.length) return [];

  // Four reads for the whole answer, however many rows came back.
  const needle = likeNeedle(terms[0]);
  const extras = await Promise.all([
    tryQuery(() => needQuery(b, "cardsAll", bookId)(api)),
    tryQuery(() => folderTree(api, bookId)),
    tryQuery(() => needQuery(b, "sectionsWithText", bookId)(api, needle)),
    tryQuery(() => needQuery(b, "pagesWithText", bookId)(api, needle)),
  ]);
  const byId = {};
  for (const r of rowsOf(extras[0])) {
    const c = shapeCard(r);
    byId[c.id] = c;
  }
  const pathOf = {};
  for (const f of extras[1] || []) pathOf[text(f.id)] = text(f.path);
  const secOf = {};
  for (const r of rowsOf(extras[2])) {
    const cid = text(r.cardId);
    if (!secOf[cid]) secOf[cid] = { name: text(r.name), content: text(r.content) };
  }
  const pageOf = {};
  for (const r of rowsOf(extras[3])) {
    const cid = text(r.cardId);
    if (!pageOf[cid]) {
      pageOf[cid] = {
        title: text(r.title),
        content: [text(r.content), text(r.header), text(r.footer)].filter((x) => x !== "").join(" "),
      };
    }
  }

  const bid = text(bookId);
  const out = hits.map((h, i) => {
    const card = byId[h.cardId] || null;
    const name = card ? card.name : h.name;
    const summary = card ? card.summary : "";
    const folderId = card ? card.folderId : "";
    const where = folderId && folderId !== bid ? text(pathOf[folderId] || "") : "";
    let field = "text";
    let fieldIn = "";
    let snippet = "";
    if (hasAnyTerm(name, terms)) {
      field = "name";
      snippet = snippetAround(summary, terms, 150);
    } else if (hasAnyTerm(summary, terms)) {
      field = "summary";
      snippet = snippetAround(summary, terms, 150);
    } else if (secOf[h.cardId]) {
      field = "section";
      fieldIn = secOf[h.cardId].name;
      snippet = snippetAround(secOf[h.cardId].content, terms, 150);
    } else if (pageOf[h.cardId]) {
      field = "page";
      fieldIn = pageOf[h.cardId].title;
      snippet = snippetAround(pageOf[h.cardId].content, terms, 150);
    } else {
      // The fts snippet, with its own [ ] markers taken off — the renderer highlights, not SQLite.
      snippet = text(h.excerpt).replace(/[[\]]/g, "");
    }
    return {
      cardId: h.cardId,
      bookId: bid,
      name: name,
      summary: summary,
      status: card ? card.status : "",
      priority: card ? card.priority : 0,
      openQuestion: card ? card.openQuestion : false,
      stackId: card ? card.stackId : "",
      folderId: folderId,
      where: where,
      field: field,
      fieldIn: fieldIn,
      snippet: snippet,
      excerpt: h.excerpt,
      rank: h.rank,
      tier: SEARCH_TIER[field],
      order: i,
    };
  });
  out.sort((a, c) => a.tier - c.tier || a.order - c.order);
  return out;
}

// The all-books scope. A book that cannot be read costs its own rows, never the whole answer.
// bm25 is a NEGATIVE score, best first — the merge sorts ascending inside each field band.
export async function searchBooks(api, bookIds, query, opts) {
  const o = opts || {};
  const ids = (Array.isArray(bookIds) ? bookIds : [bookIds]).map(text).filter((x) => x !== "");
  if (!ids.length) return [];
  const per = Math.max(1, Math.min(200, Math.floor(Number(o.limit) || 40)));
  const lists = await Promise.all(ids.map((id) => tryQuery(() => search(api, id, query, { limit: per }))));
  const out = [];
  for (const rows of lists) for (const r of rows || []) out.push(r);
  out.sort((a, b) => a.tier - b.tier || a.rank - b.rank || a.order - b.order);
  const cap = Math.max(1, Math.min(400, Math.floor(Number(o.total) || 60)));
  return out.slice(0, cap);
}

// --- writes ONE TRANSACTION (2026-08-30). Before this a create was four to six independent calls, and a refusal after the first left a card in the table that no #[id] could name and no search could find.
export async function insertCard(api, bookId, fields) {
  const b = bookOf(bookId);
  const pid = await projectIdOf(api, bookId);
  // CUT B: the sibling-name check the database used to make. Every create lane comes through here —
  // create, duplicate, copy, stack — so this is the one gate that keeps a folder's names distinct.
  await refuseNameClash(api, bookId, fields.folderId, fields.name, fields.id);
  await needQuery(b, "cardMint", bookId)(api, {
    id: fields.id,
    name: fields.name,
    folderId: fields.folderId,
    stackId: fields.stackId,
    sortKey: fields.sortKey,
    stackOrder: fields.stackOrder,
    duplicatedFrom: text(fields.duplicatedFrom),
    createdAt: Number(fields.createdAt || 0),
    unread: fields.unread ? 1 : 0,
    status: text(fields.status),
    priority: Math.max(0, Math.floor(Number(fields.priority) || 0)),
    summary: text(fields.summary),
    openQuestion: fields.openQuestion ? 1 : 0,
    editor: EDITOR.validate(fields.editor),
    projectId: text(pid),
    body: text(fields.summary),
  });
  // card_names rides the mint now, so refs.onCardRenamed's upsert would be a second write of the row that already landed — but its INDEX BUMP is what makes the new name resolvable to every #[Name] token this session, so it is rung by hand here. (refs.js INDEX_VERSION, loadMap's cache key.)
  const refs = references();
  if (refs && typeof refs.bumpIndex === "function") refs.bumpIndex(text(pid));
  return fields.id;
}

export function rememberFolder(bookId, folderId, rows, tiles) {
  const names = {};
  let tail = null;
  for (const r of rows) {
    names[r.name] = true;
    if (r.sortKey && (!tail || IDS.cmp(r.sortKey, tail) > 0)) tail = r.sortKey;
  }
  FOLDERS[fkey(bookId, folderId)] = { names: names, tail: tail, tiles: tiles || [] };
}

// A landed create teaches its snapshot the name it took: between "insert committed" and the next listing the pending row is already out of the maps, and without this a second create in that window re-picks the same name and UNIQUE (folderId, name) refuses it.
export function learnLanded(snap, row) {
  if (!snap) return;
  snap.names[row.name] = true;
  if (row.sortKey && (!snap.tail || IDS.cmp(row.sortKey, snap.tail) > 0)) snap.tail = row.sortKey;
}

// The database refusing a name is a census, not a failure: someone else already holds it.
export function isNameCollision(e) {
  const m = String((e && e.message) || e);
  if (m.indexOf("UNIQUE constraint failed") === -1) return false;
  // The two UNIQUE (folderId, name) indexes and NOTHING else — SQLite names the columns it refused ("cards.folderId, cards.name"). The old test was indexOf("name"), which also matched `card_names.cardId`: a false positive re-ran the WHOLE insert under an id that had already landed. This retry is only ever right for a sibling name that is taken.
  return m.indexOf("cards.name") !== -1 || m.indexOf("folders.name") !== -1;
}

// Null when this seat has never listed the folder and cannot honestly claim to know what names are
// taken or where the order ends.
export function planCard(api, bookId, o, allowEmpty) {
  const folderId = text(o.folderId) || text(bookId);
  const snap = FOLDERS[fkey(bookId, folderId)] || (allowEmpty ? { names: {}, tail: null } : null);
  const ms = LIB.nowMsSync ? LIB.nowMsSync(api) : null;
  if (!snap || ms === null) return null;
  const taken = Object.assign({}, snap.names);
  let tail = snap.tail;
  for (const r of pendingRows(bookId, folderId)) {
    taken[r.name] = true;
    if (r.sortKey && (!tail || IDS.cmp(r.sortKey, tail) > 0)) tail = r.sortKey;
  }
  const name = pickName(taken, o.name);
  const id = mintId(api, ms, null);
  return {
    id: id,
    name: name,
    folderId: folderId,
    stackId: id,
    sortKey: IDS.keyBetween(tail || null, null),
    stackOrder: IDS.seedKeys(1)[0],
    status: "",
    priority: 0,
    summary: "",
    openQuestion: false,
    editor: EDITOR.validate(o.editor),
    duplicatedFrom: text(o.duplicatedFrom),
    createdAt: ms,
    // UNREAD — only a Savi lane passes it (pulls, research walks, demo cards). An author's own
    // create never sets it, so an author's card never wears the dot.
    unread: !!o.unread,
    pending: true,
    isStack: false,
    stackSize: 1,
    stats: emptyStats(),
  };
}

export async function runCreate(api, entry) {
  const row = entry.row;
  const bookId = entry.bookId;
  entry.running = true;
  try {
    const st = await bookReadyOrWait(api, bookId);
    if (!st.ready) {
      entry.parked = true;
      entry.running = false;
      api.log("[cards] card " + row.id + " is parked while book " + bookId + " finishes opening");
      return { ok: false, id: row.id, parked: true };
    }
    const fields = {
      id: row.id,
      name: row.name,
      folderId: row.folderId,
      stackId: row.stackId,
      sortKey: row.sortKey,
      stackOrder: row.stackOrder,
      duplicatedFrom: row.duplicatedFrom,
      createdAt: row.createdAt,
      status: row.status,
      priority: row.priority,
      summary: row.summary,
      openQuestion: row.openQuestion,
      editor: EDITOR.value(row.editor),
      unread: !!row.unread,
    };
    try {
      await insertCard(api, bookId, fields);
    } catch (e) {
      // A refused name means a stale plan — re-pick from the database's sibling list and retry once.
      if (!isNameCollision(e)) throw e;
      row.name = await uniqueName(api, bookId, row.folderId, row.name, row.id);
      fields.name = row.name;
      await insertCard(api, bookId, fields);
    }
    learnLanded(FOLDERS[fkey(bookId, row.folderId)], row);
    // The insert is not a card until the table says it is — cards have been logged into change_log with no row behind them. A throw here lands on runCreate's own catch: PENDING is dropped, the error is surfaced to the grid, and CREATE_CARD is never journalled.
    await landed(api, bookId, "card", row.id, { name: row.name, folderId: row.folderId });
    await reindex(api, bookId, row.id);
    await record(api, bookId, {
      type: "CREATE_CARD",
      targetId: row.id,
      after: { id: row.id, name: row.name, folderId: row.folderId, stackId: row.stackId, sortKey: row.sortKey },
      actor: entry.actor,
    });
  } catch (e) {
    const message = String((e && e.message) || e);
    entry.error = message;
    entry.running = false;
    LAST_ERROR = { bookId: bookId, cardId: row.id, message: message };
    delete PENDING[pkey(bookId, row.id)];
    api.log("[cards] create failed for " + row.id + " in book " + bookId + ": " + message);
    notify({ kind: "card", op: "create", ok: false, bookId: bookId, id: row.id, error: message });
    return { ok: false, id: row.id, error: message };
  }
  // Out of the map BEFORE the queue drains, so queued edits take the ordinary database path.
  delete PENDING[pkey(bookId, row.id)];
  row.pending = false;
  entry.running = false;
  while (entry.queue.length) {
    const job = entry.queue.shift();
    try {
      await job(api);
    } catch (e) {
      const message = String((e && e.message) || e);
      LAST_ERROR = { bookId: bookId, cardId: row.id, message: message };
      api.log("[cards] a queued edit on card " + row.id + " failed: " + message);
      notify({ kind: "card", op: "queued", ok: false, bookId: bookId, id: row.id, error: message });
    }
  }
  notify({ kind: "card", op: "create", ok: true, bookId: bookId, id: row.id });
  return { ok: true, id: row.id };
}

export function registerPending(api, bookId, plan, o) {
  const entry = {
    bookId: text(bookId),
    row: plan,
    queue: [],
    removed: false,
    parked: false,
    running: false,
    error: null,
    done: null,
    actor: (o || {}).actor,
  };
  PENDING[pkey(bookId, plan.id)] = entry;
  entry.done = runCreate(api, entry);
  return entry;
}

export async function createCard(api, bookId, opts) {
  assertBookMutable(bookId);
  const row = await createCardRow(api, bookId, opts);
  return row ? row.id : null;
}

// The same create, returning the fully shaped row: real id, real sortKey, real folderId/stackId, collision-resolved name, `pending: true` until the insert lands. Nothing awaits SQL on the warm path — the caller has the row before the database is asked.
export async function createCardRow(api, bookId, opts) {
  assertBookMutable(bookId);
  // THE CONTAINMENT LAW AT THE WRITE (his ruling: "No books, no cards"). The optimistic path plans
  // the row in memory before it reaches bookOf(), so the refusal has to stand HERE — before
  // anything is minted.
  if (!text(bookId)) fail("a card needs a book — refused (no books, no cards)");
  const o = opts || {};
  let plan = planCard(api, bookId, o, false);
  if (!plan) {
    // Cold seat: warm the clock and this folder's snapshot. Reads only — never the insert.
    await LIB.ensure(api);
    try {
      await listFolder(api, bookId, text(o.folderId) || text(bookId));
    } catch (e) {
      api.log("[cards] could not read folder before create: " + String((e && e.message) || e));
    }
    plan = planCard(api, bookId, o, true);
    if (!plan) fail("could not plan a card in book " + text(bookId) + " — the clock is unavailable");
  }
  registerPending(api, bookId, plan, o);
  return Object.assign({}, plan);
}

export async function renameCard(api, bookId, cardId, name, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  // Still pending: the tile takes the name now, the write queues behind the insert.
  const waiting = pendingEntry(bookId, cardId);
  if (waiting) {
    const snap = FOLDERS[fkey(bookId, waiting.row.folderId)] || { names: {} };
    const taken = Object.assign({}, snap.names);
    delete taken[waiting.row.name];
    for (const r of pendingRows(bookId, waiting.row.folderId)) if (r.id !== waiting.row.id) taken[r.name] = true;
    const applied = pickName(taken, name);
    waiting.row.name = applied;
    waiting.queue.push(function (a) {
      return renameCard(a, bookId, cardId, applied, o);
    });
    return applied;
  }
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const applied = await uniqueName(api, bookId, card.folderId, name, card.id);
  if (applied === card.name) return applied;
  // CUT B: the same code-enforced constraint the create lane pays, on the rename side — a sibling
  // that took the name between the pick above and this write refuses here, in SQLite's own words.
  await refuseNameClash(api, bookId, card.folderId, applied, card.id);
  await b.cardRename(api, card.id, applied);
  // The map first (refs.onCardRenamed keeps card_names and autocomplete honest), then the mirror.
  await writeName(api, bookId, await projectIdOf(api, bookId), card.id, applied, false);
  await reindex(api, bookId, card.id);
  await record(api, bookId, {
    type: "RENAME_CARD",
    targetId: card.id,
    before: { name: card.name },
    after: { name: applied },
    actor: o.actor,
  });
  return applied;
}

export async function setMeta(api, bookId, cardId, patch, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  // Still pending: the tile shows it now, the database gets it when the insert lands.
  const waiting = pendingEntry(bookId, cardId);
  if (waiting) {
    const p = patch || {};
    const row = waiting.row;
    const next = {
      status: p.status === undefined ? row.status : text(p.status),
      priority: p.priority === undefined ? row.priority : Math.max(0, Math.floor(Number(p.priority) || 0)),
      summary: p.summary === undefined ? row.summary : text(p.summary),
      openQuestion: p.openQuestion === undefined ? row.openQuestion : !!p.openQuestion,
      editor: p.editor === undefined ? EDITOR.value(row.editor) : EDITOR.validate(p.editor),
    };
    row.status = next.status;
    row.priority = next.priority;
    row.summary = next.summary;
    row.openQuestion = next.openQuestion;
    row.editor = next.editor;
    waiting.queue.push(function (a) {
      return setMeta(a, bookId, cardId, next, o);
    });
    return next;
  }
  const before = await getCard(api, bookId, cardId);
  if (!before) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const p = patch || {};
  const next = {
    status: p.status === undefined ? before.status : text(p.status),
    priority: p.priority === undefined ? before.priority : Math.max(0, Math.floor(Number(p.priority) || 0)),
    summary: p.summary === undefined ? before.summary : text(p.summary),
    openQuestion: p.openQuestion === undefined ? before.openQuestion : !!p.openQuestion,
    editor: p.editor === undefined ? EDITOR.value(before.editor) : EDITOR.validate(p.editor),
  };
  await b.cardSetMeta(api, before.id, next.status, next.priority, next.summary, next.openQuestion ? 1 : 0, next.editor);
  if (next.status !== before.status) {
    // A reference in the prose wears its target card's status colour (refs.liveRef), and the map that carries the status is version-cached — so a status edit bumps that version exactly the way a rename does, and the next render of the page repaints the reference.
    const refs = references();
    if (refs && typeof refs.bumpIndex === "function") refs.bumpIndex(await projectIdOf(api, bookId));
  }
  if (next.summary !== before.summary) await reindex(api, bookId, before.id);
  await record(api, bookId, {
    type: "SET_CARD_META",
    targetId: before.id,
    before: {
      status: before.status,
      priority: before.priority,
      summary: before.summary,
      openQuestion: before.openQuestion,
      editor: EDITOR.value(before.editor),
    },
    after: next,
    actor: o.actor,
  });
  return next;
}

// Copies one card's meta, sections, pages and tags onto a fresh row. Used by duplicateCard and
// duplicateStack so there is one copy path, not two.
export async function copyCardInto(api, bookId, src, spec) {
  const b = bookOf(bookId);
  const ms = Number(spec.createdAt || 0);
  await insertCard(api, bookId, {
    id: spec.id,
    name: spec.name,
    folderId: spec.folderId,
    stackId: spec.stackId,
    sortKey: spec.sortKey,
    stackOrder: spec.stackOrder,
    duplicatedFrom: src.id,
    createdAt: ms,
    status: src.status,
    priority: src.priority,
    summary: src.summary,
    openQuestion: src.openQuestion,
    editor: EDITOR.value(src.editor),
  });
  const seen = {};
  // The id map the copy's moods are re-keyed through: every source section/page id paired with the
  // new row that took its place. Built as the copy walks, spent in ONE statement below.
  const map = [];
  for (const s of rowsOf(await b.sectionsForCard(api, src.id)).map(shapeSection)) {
    const sid = mintId(api, ms, seen);
    map.push({ from: s.id, to: sid });
    await b.sectionInsert(api, sid, spec.id, s.name, s.lineLimit, s.sortKey);
    if (s.content) await b.sectionSetContent(api, sid, s.content);
  }
  for (const p of rowsOf(await b.pagesForCard(api, src.id)).map(shapePage)) {
    const pid = mintId(api, ms, seen);
    map.push({ from: p.id, to: pid });
    await b.pageInsert(api, pid, spec.id, p.sortKey, p.title);
    if (p.content) await b.pageSetContent(api, pid, p.content);
    if (p.header || p.footer) await b.pageSetChrome(api, pid, p.title, p.header, p.footer);
  }
  for (const t of rowsOf(await b.tagsForCard(api, src.id))) await b.tagAdd(api, spec.id, text(t.tagId));
  // THE TWO THINGS A CARD OWNS THAT ARE NOT TEXT (2026-08-29): its section/page moods and its picture. They rode nowhere before, so a duplicate came out grey and moodless. One transaction, two statements, the moods re-keyed onto the new ids; inline marks stay out of it because the reindex below re-harvests them from the duplicate's own words.
  try {
    await tableOf(bookId).copyCardExtras(api, src.id, spec.id, JSON.stringify(map), ms);
  } catch (e) {
    api.log("[cards] the moods and picture of " + text(src.id) + " did not follow its copy: " + text((e && e.message) || e));
  }
  // THE DESK IS PAID BEFORE THE INDEX (2026-08-29). reindexNow asks the TABLE for the card and returns early when it is not there — and a duplicate's row is still staged at this point, so every copy came out with no cards_fts row and no word count: unsearchable, silently.
  await landed(api, bookId, "card", spec.id, { folderId: spec.folderId });
  await reindex(api, bookId, spec.id);
  return spec.id;
}

// A duplicate is its own stack of one unless opts.stackId names a stack to join (his
// DUPLICATE_CARD { source_id, stack_id }, where stack_id = null signals a new stack).
export async function duplicateCard(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const src = await getCard(api, bookId, cardId);
  if (!src) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const join = o.stackId === undefined || o.stackId === null ? "" : text(o.stackId);
  const ms = await nowMs(api);
  const id = mintId(api, ms, null);
  const name = await uniqueName(api, bookId, src.folderId, src.name, null);

  let sortKey = src.sortKey;
  let stackOrder = IDS.seedKeys(1)[0];
  if (join) {
    const members = await listStack(api, bookId, join);
    if (!members.length) fail("no stack " + JSON.stringify(join) + " to duplicate into");
    sortKey = members[0].sortKey;
    stackOrder = placeKey(members.map((m) => ({ id: m.id, sortKey: m.stackOrder })), null, null, null);
  } else {
    const siblings = rowsOf(await b.cardsInFolder(api, src.folderId)).map(shapeCard).sort(byKey);
    sortKey = placeKey(siblings, id, null, src.id);
  }

  await copyCardInto(api, bookId, src, {
    id,
    name,
    folderId: src.folderId,
    stackId: join || id,
    sortKey,
    stackOrder,
    createdAt: ms,
  });
  await record(api, bookId, {
    type: "DUPLICATE_CARD",
    targetId: id,
    before: { sourceId: src.id },
    after: { id, name, stackId: join || id, folderId: src.folderId },
    actor: o.actor,
  });
  return id;
}

// Moving a tile moves the whole stack: every member shares the tile's folder and sort key.
export async function moveCard(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const folderId = text(o.folderId) || card.folderId;
  const members = await listStack(api, bookId, card.stackId);
  const moving = {};
  for (const m of members) moving[m.id] = true;

  const siblings = rowsOf(await b.cardsInFolder(api, folderId))
    .map(shapeCard)
    .filter((c) => !moving[c.id])
    .sort(byKey);
  const sortKey = placeKey(siblings, card.id, o.beforeId, o.afterId);

  // A cross-folder move can collide by name; the mover renames before it lands, and the name it
  // takes has to be free in BOTH folders so neither UNIQUE (folderId, name) trips.
  const renames = [];
  if (folderId !== card.folderId) {
    const taken = Object.assign(
      {},
      await namesIn(api, bookId, card.folderId, moving),
      await namesIn(api, bookId, folderId, moving)
    );
    for (const m of members) {
      const applied = pickName(taken, m.name);
      taken[applied] = true;
      if (applied !== m.name) renames.push({ id: m.id, from: m.name, to: applied });
    }
    const pid = await projectIdOf(api, bookId);
    for (const r of renames) {
      await b.cardRename(api, r.id, r.to);
      await writeName(api, bookId, pid, r.id, r.to, false);
      await reindex(api, bookId, r.id);
    }
  }

  if (members.length > 1) await b.stackMove(api, card.stackId, folderId, sortKey);
  else await b.cardMove(api, card.id, folderId, sortKey);
  // A MOVE_CARD was journalled once while the cards row kept its old folderId. Not again: the table
  // is asked where the card actually is before the move is written down.
  await landed(api, bookId, "card", card.id, { folderId: folderId });

  await record(api, bookId, {
    type: "MOVE_CARD",
    targetId: card.id,
    before: { folderId: card.folderId, sortKey: card.sortKey },
    after: { folderId, sortKey, stackId: card.stackId, renamed: renames },
    actor: o.actor,
  });
  return { folderId, sortKey, renamed: renames };
}

// --- stacks ---

export async function writeStackOrder(api, bookId, ids) {
  const b = bookOf(bookId);
  // Rewritten from seeds every time, so cycling forever can never grow a key without bound.
  const keys = IDS.seedKeys(ids.length);
  for (let i = 0; i < ids.length; i++) await b.cardReorderInStack(api, ids[i], keys[i]);
  return keys;
}

// Standalone card: mint a blank 'New Card' and combine the two into a stack — the original stays
// primary, so no reference moves. Already a stack: duplicate the whole stack.
export async function createStackFrom(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const existing = await listStack(api, bookId, card.stackId);
  if (existing.length > 1) return await duplicateStack(api, bookId, card.stackId, o);

  const name = pickName(await namesIn(api, bookId, card.folderId, null), DEFAULT_NAME);
  const ms = await nowMs(api);
  const id = mintId(api, ms, null);
  const order = IDS.seedKeys(2);
  await insertCard(api, bookId, {
    id,
    name,
    folderId: card.folderId,
    stackId: card.stackId,
    sortKey: card.sortKey,
    stackOrder: order[1],
    createdAt: ms,
  });
  const b = bookOf(bookId);
  await b.cardReorderInStack(api, card.id, order[0]);
  await reindex(api, bookId, id);
  await record(api, bookId, {
    type: "CREATE_STACK",
    targetId: card.stackId,
    targetType: "stack",
    before: { members: [card.id] },
    after: { stackId: card.stackId, members: [card.id, id] },
    actor: o.actor,
  });
  return card.stackId;
}

export async function duplicateStack(api, bookId, stackId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const members = await listStack(api, bookId, stackId);
  if (!members.length) fail("no stack " + JSON.stringify(text(stackId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const primary = members.find((m) => m.id === text(stackId)) || members[0];

  const ms = await nowMs(api);
  const seen = {};
  const ids = members.map(() => mintId(api, ms, seen));
  const newStackId = ids[members.indexOf(primary)];

  const siblings = rowsOf(await b.cardsInFolder(api, primary.folderId)).map(shapeCard).sort(byKey);
  const sortKey = placeKey(siblings, null, null, primary.id);
  const order = IDS.seedKeys(members.length);
  const taken = await namesIn(api, bookId, primary.folderId, null);

  for (let i = 0; i < members.length; i++) {
    const name = pickName(taken, members[i].name);
    taken[name] = true;
    await copyCardInto(api, bookId, members[i], {
      id: ids[i],
      name,
      folderId: members[i].folderId,
      stackId: newStackId,
      sortKey,
      stackOrder: order[i],
      createdAt: ms,
    });
  }
  await record(api, bookId, {
    type: "DUPLICATE_STACK",
    targetId: newStackId,
    targetType: "stack",
    before: { stackId: text(stackId), members: members.map((m) => m.id) },
    after: { stackId: newStackId, members: ids },
    actor: o.actor,
  });
  return newStackId;
}

// 'left' sends the top card to the bottom, 'right' the bottom to the top. The order is reseeded
// every time, so keys never ratchet.
export async function cycleStack(api, bookId, stackId, dir, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const members = await listStack(api, bookId, stackId);
  const ids = members.map((m) => m.id);
  if (ids.length < 2) return ids;
  const right = text(dir).toLowerCase() === "right";
  const rotated = right
    ? [ids[ids.length - 1]].concat(ids.slice(0, ids.length - 1))
    : ids.slice(1).concat([ids[0]]);
  await writeStackOrder(api, bookId, rotated);
  await record(api, bookId, {
    type: "CYCLE_STACK",
    targetId: text(stackId),
    targetType: "stack",
    before: { order: ids },
    after: { order: rotated, dir: right ? "right" : "left" },
    actor: o.actor,
  });
  return rotated;
}

// The ONE operation that moves references: the stack id becomes the new primary's id, so every
// stored #[oldStackId] token across the project is rewritten to #[newStackId].
export async function rewriteReferences(api, bookId, oldId, newId) {
  const from = "#[" + text(oldId) + "]";
  const to = "#[" + text(newId) + "]";
  const needle = "%" + from + "%";
  const pid = await projectIdOf(api, bookId);
  const books = pid ? await booksInProject(api, pid) : [text(bookId)];
  if (books.indexOf(text(bookId)) === -1) books.push(text(bookId));

  let touched = 0;
  for (const bid of books) {
    await ensureBook(api, bid);
    const bb = bookOf(bid);
    const dirty = {};

    for (const p of rowsOf(await needQuery(bb, "pagesWithText", bid)(api, needle)).map(shapePage)) {
      const content = replaceAll(p.content, from, to);
      const title = replaceAll(p.title, from, to);
      const header = replaceAll(p.header, from, to);
      const footer = replaceAll(p.footer, from, to);
      if (content !== p.content) {
        await bb.pageSetContent(api, p.id, content);
        touched++;
      }
      if (title !== p.title || header !== p.header || footer !== p.footer) {
        await bb.pageSetChrome(api, p.id, title, header, footer);
        touched++;
      }
      dirty[p.cardId] = true;
    }

    for (const s of rowsOf(await needQuery(bb, "sectionsWithText", bid)(api, needle)).map(shapeSection)) {
      const content = replaceAll(s.content, from, to);
      if (content !== s.content) {
        await bb.sectionSetContent(api, s.id, content);
        touched++;
      }
      dirty[s.cardId] = true;
    }

    for (const c of rowsOf(await needQuery(bb, "cardsWithText", bid)(api, needle))) {
      const row = rowsOf(await bb.cardGet(api, text(c.id)))[0];
      if (!row) continue;
      const card = shapeCard(row);
      const summary = replaceAll(card.summary, from, to);
      if (summary === card.summary) continue;
      await bb.cardSetMeta(api, card.id, card.status, card.priority, summary, card.openQuestion ? 1 : 0, card.editor);
      touched++;
      dirty[card.id] = true;
    }

    // reindex re-reads each dirty card's text, so the fts mirror AND the edge index both follow.
    for (const cid in dirty) await reindex(api, bid, cid);
  }

  // INBOUND edges follow the stack: everything that pointed at the old primary points at the new one. OR REPLACE because the PK is (fromId, toId) and one source may already reference BOTH — a #[Name] token is not found by the %#[oldId]% needle above, so its row was never reindexed and the plain UPDATE raised UNIQUE, after stackSetPrimary and the whole text rewrite had landed.
  await api.sql`UPDATE OR REPLACE cross_book_references SET toId = ${text(newId)} WHERE toId = ${text(oldId)}`;
  // OUTBOUND edges are NOT moved. They are re-derived from their own words instead, which is the only reading that can be right.
  await reindex(api, text(bookId), text(oldId));
  await reindex(api, text(bookId), text(newId));
  // Counts are keyed by card id, so every graph's pair is stale until it is read again.
  if (typeof GRAPH.refsChanged === "function") GRAPH.refsChanged();
  return touched;
}

export async function setStackPrimary(api, bookId, stackId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const oldId = text(stackId);
  const newId = text(cardId);
  const members = await listStack(api, bookId, oldId);
  if (!members.length) fail("no stack " + JSON.stringify(oldId) + " in book " + text(bookId));
  const target = members.find((m) => m.id === newId);
  if (!target) fail(JSON.stringify(newId) + " is not a member of stack " + JSON.stringify(oldId));
  if (oldId === newId) return { stackId: oldId, references: 0 };

  const b = bookOf(bookId);
  await b.stackSetPrimary(api, oldId, newId);
  const touched = await rewriteReferences(api, bookId, oldId, newId);
  const refs = references();
  if (refs) {
    // The stack answers to a different name now — bumped through the hook a rename uses.
    await refs.onCardRenamed(api, {
      bookId: text(bookId),
      projectId: await projectIdOf(api, bookId),
      cardId: newId,
      name: target.name,
    });
  }
  await record(api, bookId, {
    type: "SET_STACK_PRIMARY",
    targetId: newId,
    targetType: "stack",
    before: { stackId: oldId },
    after: { stackId: newId, references: touched },
    actor: o.actor,
  });
  return { stackId: newId, references: touched };
}

export async function splitFromStack(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const members = await listStack(api, bookId, card.stackId);
  if (members.length < 2) return card.stackId;
  const rest = members.filter((m) => m.id !== card.id);
  if (card.stackId === card.id) {
    // The primary is leaving: the top of what remains takes the stack, references and all.
    await setStackPrimary(api, bookId, card.stackId, rest[0].id, { actor: o.actor });
  }
  const b = bookOf(bookId);
  await needQuery(b, "cardSetStack", bookId)(api, card.id, card.id, IDS.seedKeys(1)[0]);
  await writeStackOrder(api, bookId, rest.map((m) => m.id));
  await record(api, bookId, {
    type: "SPLIT_STACK",
    targetId: card.id,
    targetType: "stack",
    before: { stackId: card.stackId, members: members.map((m) => m.id) },
    after: { stackId: card.id, members: rest.map((m) => m.id) },
    actor: o.actor,
  });
  return card.id;
}

// --- trash and permanent delete ---

// Soft delete: the row stays so #[id] still resolves (Reference In Trash), the trash table
// remembers where it came from, and the card leaves its stack and the search index.
export async function trashCard(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  // Trashing a row whose insert is still in the air: off the grid now, deleted the moment it lands.
  const waiting = pendingEntry(bookId, cardId);
  if (waiting) {
    waiting.removed = true;
    waiting.queue.push(function (a) {
      return trashCard(a, bookId, cardId, o);
    });
    return { trashedAt: waiting.row.createdAt };
  }
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const members = await listStack(api, bookId, card.stackId);
  if (members.length > 1) await splitFromStack(api, bookId, card.id, { actor: o.actor });

  const ms = await nowMs(api);
  const pid = await projectIdOf(api, bookId);
  await api.sql`INSERT INTO trash (entityId, entityType, projectId, originalBookId, originalFolderId, trashedAt)
    VALUES (${card.id}, 'card', ${pid}, ${text(bookId)}, ${card.folderId}, ${ms})
    ON CONFLICT(entityId, entityType) DO UPDATE SET
      projectId = excluded.projectId, originalBookId = excluded.originalBookId,
      originalFolderId = excluded.originalFolderId, trashedAt = excluded.trashedAt`;
  noteTrashed(bookId, "card", card.id, true);
  // Off every cached paint the same instant it goes in the can — a quick list is not allowed to
  // hand a trashed tile back to the grid.
  forgetCachedTile(bookId, card.id);
  await b.ftsDelete(api, card.id);
  const refs = references();
  if (refs && typeof refs.onCardTrashed === "function") {
    await refs.onCardTrashed(api, { projectId: pid, bookId: text(bookId), cardId: card.id });
  }
  await record(api, bookId, {
    type: "TRASH_CARD",
    targetId: card.id,
    before: { folderId: card.folderId, stackId: card.stackId, name: card.name },
    after: { trashedAt: ms },
    actor: o.actor,
  });
  return { trashedAt: ms };
}

// Out of the trash and back onto the grid. The name may have been taken while it was away.
export async function restoreCard(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const applied = await uniqueName(api, bookId, card.folderId, card.name, card.id);
  if (applied !== card.name) {
    await b.cardRename(api, card.id, applied);
    await writeName(api, bookId, await projectIdOf(api, bookId), card.id, applied, false);
  }
  await api.sql`DELETE FROM trash WHERE entityType = 'card' AND entityId = ${card.id}`;
  noteTrashed(bookId, "card", card.id, false);
  await reindex(api, bookId, card.id);
  await record(api, bookId, {
    type: "RESTORE_CARD",
    targetId: card.id,
    before: { name: card.name },
    after: { name: applied, folderId: card.folderId },
    actor: o.actor,
  });
  return applied;
}

// Permanent. No foreign keys, so every row this card owns goes BY HAND: pages, sections, card_tags, the fts row, the card_names row (refs.onCardDeleted, which also drops its outbound edges), stack membership, trash row. Inbound edges STAY — that is what renders a token here as Deleted Reference.
export async function purgeCard(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  // A permanent delete of a row still in flight: gone from the grid now, purged once it lands.
  const waiting = pendingEntry(bookId, cardId);
  if (waiting) {
    waiting.removed = true;
    waiting.queue.push(function (a) {
      return purgeCard(a, bookId, cardId, o);
    });
    return true;
  }
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);

  if (!o.skipStack) {
    const members = await listStack(api, bookId, card.stackId);
    if (members.length > 1) await splitFromStack(api, bookId, card.id, { actor: o.actor });
  }

  // FIRST the graph-side deletes — they unlink the maps so this seat stops seeing the card at once.
  await b.pagesDeleteForCard(api, card.id);
  await b.sectionsDeleteForCard(api, card.id);
  await needQuery(b, "tagsDeleteForCard", bookId)(api, card.id);
  // No foreign keys: the word counter goes by hand with everything else this card owned.
  if (typeof b.statsDeleteForCard === "function") await b.statsDeleteForCard(api, card.id);
  await b.ftsDelete(api, card.id);
  await b.cardDelete(api, card.id);
  // The reference index and the mood marks keep their own bookkeeping (id→name map, edge counts).
  await dropName(api, bookId, await projectIdOf(api, bookId), card.id);
  // THEN the hand-cascade, in ONE transaction, over EVERY mirror table — sections, pages, card_tags, card_stats, card_images, cards_fts, atmo_marks, page_pen, card_names, outbound cross_book_references, trash, trash_stack, the card row. The desk is paid first so a staged row can never be written back behind the sweep. deletes must actually delete db rows.
  await settleDesk(api, bookId);
  await tableOf(bookId).purgeCardRows(api, card.id);
  // …and the purge is not done until the tables say so.
  await noGhosts(api, bookId, "card", card.id);
  noteTrashed(bookId, "card", card.id, false);
  await record(api, bookId, {
    type: "DELETE_CARD",
    targetId: card.id,
    before: { name: card.name, folderId: card.folderId, stackId: card.stackId },
    after: null,
    actor: o.actor,
    undoable: false,
  });
  return true;
}

// THE NET UNDER THE CASCADE. Idempotent, callable from code (a maintenance press, a probe, a cron):
// finds and purges rows whose card or folder is gone. A clean database answers zero and stays zero.
export async function sweepIntegrity(api, opts) {
  return await INTEGRITY.sweep(api, opts);
}

export async function purgeStack(api, bookId, stackId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const members = await listStack(api, bookId, stackId);
  if (!members.length) fail("no stack " + JSON.stringify(text(stackId)) + " in book " + text(bookId));
  for (const m of members) await purgeCard(api, bookId, m.id, { actor: o.actor, skipStack: true });
  return members.length;
}

// --- pages ---

export async function listPageHeaders(api, bookId, cardId) { await ensureBook(api,bookId);return rowsOf(await bookOf(bookId).pageHeadersForCard(api,text(cardId))).sort(byKey); }

export async function listPages(api, bookId, cardId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  return rowsOf(await b.pagesForCard(api, text(cardId))).map(shapePage).sort(byKey);
}

export async function getPage(api, bookId, pageId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const row = rowsOf(await b.pageGet(api, text(pageId)))[0];
  return row ? shapePage(row) : null;
}

export async function createPage(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const ms = await nowMs(api);
  const id = mintId(api, ms, null);
  const pages = await listPages(api, bookId, card.id);
  const sortKey = placeKey(pages, null, o.beforeId, o.afterId);
  await b.pageInsert(api, id, card.id, sortKey, text(o.title));
  await landed(api, bookId, "page", id, { cardId: card.id });
  await reindex(api, bookId, card.id);
  await record(api, bookId, {
    type: "CREATE_PAGE",
    targetId: id,
    targetType: "page",
    after: { id, cardId: card.id, sortKey, title: text(o.title) },
    actor: o.actor,
  });
  return id;
}

export async function setAssetPages(api,bookId,cardId,before,contentPages,opts){
  assertBookMutable(bookId);
  const D=require("lib/workbench-data.js"),o=opts||{};
  const card=await getCard(api,bookId,cardId);if(!card)throw Error("The asset card was deleted");
  const authority=o.authority,editor=authority?String(authority.editor):String(card.editor||"");
  if(authority&&(!authority.holder||!Number.isFinite(authority.takenAt)||authority.takenAt<0||!Number.isFinite(authority.staleSeconds)||authority.staleSeconds<=0))throw Error("The asset save authority is incomplete; your draft is kept");
  const live=await listPages(api,bookId,cardId);
  if(D.fingerprint(live)!==D.fingerprint(before))throw Error("The asset pages changed; your draft is kept");
  D.read(before);
  const after=[],ms=await nowMs(api);
  for(let i=0;i<Math.max(before.length,contentPages.length);i++){
    const old=before[i],n=contentPages[i];after.push({id:old?.id||mintId(api,ms,null),cardId,bookId,sortKey:old?.sortKey||placeKey(after,null,null,after[after.length-1]?.id),title:o.history&&n?n.title:D.TITLE,content:n?.content||"",header:o.history&&n?n.header||"":old?.header||"",footer:o.history&&n?n.footer||"":old?.footer||""});
  }
  if(!after.length)throw Error("No asset pages to save");
  const oldRows=JSON.stringify(before),newRows=JSON.stringify(after),count=before.length;
  // No await between this local generation/fence check and submitting the guarded SQL.
  if(o.beforeWrite){const verdict=o.beforeWrite();if(verdict===false||verdict&&typeof verdict.then==="function")throw Error("The writable asset changed; your draft is kept");}
  const result=authority ? await api.sql`WITH old AS (SELECT value FROM json_each(${oldRows})),
    permit AS MATERIALIZED (SELECT COUNT(*) AS n FROM old JOIN pages p ON p.id=json_extract(old.value,'$.id')
      AND p.bookId=${bookId} AND p.cardId=${cardId} AND p.content=COALESCE(json_extract(old.value,'$.content'),'')
      AND COALESCE(p.header,'')=COALESCE(json_extract(old.value,'$.header'),'') AND COALESCE(p.footer,'')=COALESCE(json_extract(old.value,'$.footer'),'')
      AND p.title=json_extract(old.value,'$.title') AND p.sortKey=json_extract(old.value,'$.sortKey'))
    INSERT INTO pages(id,bookId,cardId,sortKey,title,content,header,footer)
    SELECT json_extract(value,'$.id'),${bookId},${cardId},json_extract(value,'$.sortKey'),json_extract(value,'$.title'),json_extract(value,'$.content'),json_extract(value,'$.header'),json_extract(value,'$.footer') FROM json_each(${newRows})
    WHERE (SELECT n FROM permit)=${count} AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=${count}
      AND EXISTS(SELECT 1 FROM cards WHERE id=${cardId} AND bookId=${bookId} AND COALESCE(editor,'')=${editor})
      AND EXISTS(SELECT 1 FROM page_pen WHERE bookId=${bookId} AND cardId=${cardId}
        AND holderId=${authority.holder} AND takenAt=${authority.takenAt} AND renewedAt>unixepoch()-${authority.staleSeconds})
    ON CONFLICT(id) DO UPDATE SET content=excluded.content,title=excluded.title,header=excluded.header,footer=excluded.footer RETURNING id` : await api.sql`WITH old AS (SELECT value FROM json_each(${oldRows})),
    permit AS MATERIALIZED (SELECT COUNT(*) AS n FROM old JOIN pages p ON p.id=json_extract(old.value,'$.id')
      AND p.bookId=${bookId} AND p.cardId=${cardId} AND p.content=COALESCE(json_extract(old.value,'$.content'),'')
      AND COALESCE(p.header,'')=COALESCE(json_extract(old.value,'$.header'),'') AND COALESCE(p.footer,'')=COALESCE(json_extract(old.value,'$.footer'),'')
      AND p.title=json_extract(old.value,'$.title') AND p.sortKey=json_extract(old.value,'$.sortKey'))
    INSERT INTO pages(id,bookId,cardId,sortKey,title,content,header,footer)
    SELECT json_extract(value,'$.id'),${bookId},${cardId},json_extract(value,'$.sortKey'),json_extract(value,'$.title'),json_extract(value,'$.content'),json_extract(value,'$.header'),json_extract(value,'$.footer') FROM json_each(${newRows})
    WHERE (SELECT n FROM permit)=${count} AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=${count}
      AND EXISTS(SELECT 1 FROM cards WHERE id=${cardId} AND bookId=${bookId} AND COALESCE(editor,'')=${editor})
    ON CONFLICT(id) DO UPDATE SET content=excluded.content,title=excluded.title,header=excluded.header,footer=excluded.footer RETURNING id`;
  if(rowsOf(result).length!==after.length)throw Error("A newer edit won; the complete asset draft was kept");
  GRAPH.invalidate(bookId);await reindex(api,bookId,cardId);
  if(!o.history)await record(api,bookId,{type:"SET_ASSET_PAGES",targetId:cardId,targetType:"card",before:{pages:before},after:{pages:after}});
  return await listPages(api,bookId,cardId);
}

// Raw bounded snapshot: intentionally no ensureBook/seed/upgrade on this read.
export async function readSoundDocument(api,bookId,cardId){
 const row=rowsOf(await STORE.soundSnapshot(api,bookId,cardId))[0];
 if(!row?.snapshot)throw Error("Sound document exceeds 256 pages/sections or 2 MiB; nothing was truncated");
 const snapshot=JSON.parse(row.snapshot);if(!snapshot.card)throw Error("The sound card is missing");return snapshot;
}
export async function setSoundDocument(api,bookId,cardId,before,after,opts){
  assertBookMutable(bookId);
 const D=require("lib/sound-document.js"),o=opts||{},pen=o.authority;
 if(!FENCE.mayWrite()||isLockedBook(bookId)||o.readOnly)throw Error("This sound document is read-only; draft kept");
 if(!pen?.mine||pen.degraded||pen.parked||pen.stale||!pen.holder||!Number.isFinite(pen.takenAt)||pen.takenAt<0)throw Error("A verified held sound pen is required");
 if(String(require("lib/pagelock.js").identity(api).id)!==String(pen.holder))throw Error("The sound pen belongs to another author");
 D.validateChange(before,after);
 const fresh=await readSoundDocument(api,bookId,cardId);
 if(D.canonical(fresh)!==D.canonical(before))throw Error("The score, metadata, or page roster changed since opening; draft kept");
 const next=JSON.parse(JSON.stringify(after)),ms=await nowMs(api),seen=Object.fromEntries([...before.pages,...before.sections].map(r=>[r.id,true]));
 for(const row of [...next.pages,...next.sections])if(String(row.id).startsWith('@')){const id=mintId(api,ms,seen);seen[id]=true;row.id=id;}
 const receipt='sound:'+mintId(api,ms,seen),recovery={receipt,bookId,cardId,before,after:next};
 if(o.beforeWrite){const v=o.beforeWrite();if(v===false||v&&typeof v.then==='function')throw Error("The writable sound opening changed; draft kept");}
 if(!FENCE.mayWrite())throw Error("The sound write permission changed; draft kept");
 try{
  const result=await STORE.soundSave(api,bookId,cardId,before,next,pen,receipt,SCHEMA.PROJECT_ID,String(api.userId||''),String(api.getUsername?.()||''));
  if(rowsOf(result).length!==1||rowsOf(result)[0].id!==receipt)throw Error("Sound Save was refused by its source, metadata, or held-pen guard");
  GRAPH.invalidate(bookId);
  const saved=await readSoundDocument(api,bookId,cardId);
  if(D.canonical(saved)!==D.canonical(next))throw Error("Sound Save readback differs; keep the draft and inspect its recovery receipt");
  // Reindex is derived work, but a fault is still NOT reported as a successful Save.
  await reindexNow(api,bookId,cardId);
  return {ok:true,status:'verified',receipt,bookId,cardId,snapshot:saved};
 }catch(e){GRAPH.invalidate(bookId);e.recovery=recovery;e.receipt=receipt;e.message=String(e.message||e)+' · Save NOT acknowledged; source/draft kept (receipt '+receipt+')';throw e;}
}

export async function setScorePage(api,bookId,pageId,content,rootId,header,oldContent,oldHeader,opts){
  assertBookMutable(bookId);
  const page=await getPage(api,bookId,pageId),root=rootId===pageId?page:await getPage(api,bookId,rootId);
  if(!page||!root||root.cardId!==page.cardId)fail("The score or its first page is missing");
  const result=await bookOf(bookId).scorePageSave(api,pageId,content,rootId,header,oldContent,oldHeader);
  if(!rowsOf(result).some(r=>Number(r.saved)===1))fail("The score or its first-page header changed since opening. Your draft is kept; reopen before saving.");
  await landed(api,bookId,"page",pageId,{content});await landed(api,bookId,"page",rootId,{header});await reindex(api,bookId,page.cardId);
  if(content!==oldContent)await record(api,bookId,{type:"SET_PAGE_CONTENT",targetId:pageId,targetType:"page",before:{content:oldContent},after:{content,cardId:page.cardId},actor:opts&&opts.actor});
  if(header!==oldHeader)await record(api,bookId,{type:"SET_PAGE_CHROME",targetId:rootId,targetType:"page",before:{title:root.title,header:oldHeader,footer:root.footer},after:{title:root.title,header,footer:root.footer},actor:opts&&opts.actor});
  return true;
}

export async function setPageContent(api, bookId, pageId, content, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const next = text(content);
  await b.pageSetContent(api, page.id, next);
  await landed(api, bookId, "page", page.id, { content: next });
  await reindex(api, bookId, page.cardId);
  await record(api, bookId, {
    type: "SET_PAGE_CONTENT",
    targetId: page.id,
    targetType: "page",
    before: { content: page.content },
    after: { content: next, cardId: page.cardId },
    actor: o.actor,
  });
  return true;
}

export async function setPageChrome(api, bookId, pageId, chrome, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const c = chrome || {};
  const next = {
    title: c.title === undefined ? page.title : text(c.title),
    header: c.header === undefined ? page.header : text(c.header),
    footer: c.footer === undefined ? page.footer : text(c.footer),
  };
  await b.pageSetChrome(api, page.id, next.title, next.header, next.footer);
  await reindex(api, bookId, page.cardId);
  await record(api, bookId, {
    type: "SET_PAGE_CHROME",
    targetId: page.id,
    targetType: "page",
    before: { title: page.title, header: page.header, footer: page.footer },
    after: next,
    actor: o.actor,
  });
  return next;
}

export async function reorderPage(api, bookId, pageId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const pages = await listPages(api, bookId, page.cardId);
  const sortKey = placeKey(pages, page.id, o.beforeId, o.afterId);
  await b.pageReorder(api, page.id, sortKey);
  await record(api, bookId, {
    type: "REORDER_PAGE",
    targetId: page.id,
    targetType: "page",
    before: { sortKey: page.sortKey },
    after: { sortKey },
    actor: o.actor,
  });
  return sortKey;
}

export async function deletePage(api, bookId, pageId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  // The graph-side delete first (it unlinks the map, so this seat stops seeing the page at once), then the desk is paid and the page's OWN rows go in one transaction — the page and its mood. A kind='page' mark whose page is gone is unreachable forever: reindex re-harvests inline only.
  await b.pageDelete(api, page.id);
  await settleDesk(api, bookId);
  await tableOf(bookId).purgePageRows(api, page.id);
  await noGhosts(api, bookId, "page", page.id);
  await reindex(api, bookId, page.cardId);
  await record(api, bookId, {
    type: "DELETE_PAGE",
    targetId: page.id,
    targetType: "page",
    before: page,
    after: null,
    actor: o.actor,
  });
  return true;
}

// js measures geometry, never characters); the rest becomes pages after this one.
export async function pastePages(api, bookId, pageId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const field = o.field === "header" ? "header" : o.field === "footer" ? "footer" : "content";
  const value = text(o.value);
  const chunks = (Array.isArray(o.chunks) ? o.chunks : []).map(text);
  const was = field === "content" ? page.content : field === "header" ? page.header : page.footer;

  // An open keystroke window is its own command. Close it before this one so the log's order is
  // the order the author worked in.
  const log = changelog();
  if (log && typeof log.flushText === "function") {
    try {
      await log.flushText(api);
    } catch (e) {
      api.log("[cards] could not close the text window before a paste: " + text((e && e.message) || e));
    }
  }

  const made = [];
  await silently(async function () {
    if (field === "content") await b.pageSetContent(api, page.id, value);
    else {
      await b.pageSetChrome(
        api,
        page.id,
        page.title,
        field === "header" ? value : page.header,
        field === "footer" ? value : page.footer
      );
    }
    let afterId = page.id;
    for (const chunk of chunks) {
      const id = await createPage(api, bookId, page.cardId, { title: "", actor: o.actor, afterId });
      if (chunk) await setPageContent(api, bookId, id, chunk, { actor: o.actor });
      const born = await getPage(api, bookId, id);
      made.push({ id, cardId: page.cardId, sortKey: born ? born.sortKey : "", title: "", content: chunk });
      afterId = id;
    }
  });
  await reindex(api, bookId, page.cardId);

  const seq =
    (await record(api, bookId, {
      type: "PASTE_PAGES",
      targetId: page.id,
      targetType: "page",
      before: { label: "Paste", field, text: was, cardId: page.cardId, pages: [] },
      after: { label: "Paste", field, text: value, cardId: page.cardId, pages: made },
      actor: o.actor,
    })) || 0;
  return { ok: true, pageId: page.id, cardId: page.cardId, field, pages: made.map((m) => m.id), seq };
}

// --- sections ---

export async function listSections(api, bookId, cardId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  return rowsOf(await b.sectionsForCard(api, text(cardId))).map(shapeSection).sort(byKey);
}

export async function getSection(api, bookId, sectionId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const row = rowsOf(await needQuery(b, "sectionGet", bookId)(api, text(sectionId)))[0];
  return row ? shapeSection(row) : null;
}

export async function createSection(api, bookId, cardId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const ms = await nowMs(api);
  const id = mintId(api, ms, null);
  const sections = await listSections(api, bookId, card.id);
  const sortKey = placeKey(sections, null, o.beforeId, o.afterId);
  const limit = Math.max(0, Math.floor(Number(o.lineLimit) || 0));
  await b.sectionInsert(api, id, card.id, text(o.name), limit, sortKey);
  await landed(api, bookId, "section", id, { cardId: card.id });
  await reindex(api, bookId, card.id);
  await record(api, bookId, {
    type: "CREATE_SECTION",
    targetId: id,
    targetType: "section",
    after: { id, cardId: card.id, name: text(o.name), lineLimit: limit, sortKey },
    actor: o.actor,
  });
  return id;
}

export async function renameSection(api, bookId, sectionId, name, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const section = await getSection(api, bookId, sectionId);
  if (!section) fail("no section " + JSON.stringify(text(sectionId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const next = text(name).trim();
  await b.sectionRename(api, section.id, next);
  await reindex(api, bookId, section.cardId);
  await record(api, bookId, {
    type: "RENAME_SECTION",
    targetId: section.id,
    targetType: "section",
    before: { name: section.name },
    after: { name: next },
    actor: o.actor,
  });
  return next;
}

// Past the line limit the write is REFUSED and the caller hears about it (house rule 3 — never
// swallowed, never silently truncated).
export async function setSectionContent(api, bookId, sectionId, content, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const section = await getSection(api, bookId, sectionId);
  if (!section) fail("no section " + JSON.stringify(text(sectionId)) + " in book " + text(bookId));
  const next = text(content);
  if (section.lineLimit > 0) {
    const lines = next === "" ? 0 : next.split("\n").length;
    if (lines > section.lineLimit) {
      fail(
        "section " + JSON.stringify(section.name || section.id) + " holds " + section.lineLimit +
          " line(s); that edit is " + lines
      );
    }
  }
  const b = bookOf(bookId);
  await b.sectionSetContent(api, section.id, next);
  await landed(api, bookId, "section", section.id, { content: next });
  await reindex(api, bookId, section.cardId);
  await record(api, bookId, {
    type: "SET_SECTION_CONTENT",
    targetId: section.id,
    targetType: "section",
    before: { content: section.content },
    after: { content: next, cardId: section.cardId },
    actor: o.actor,
  });
  return true;
}

export async function reorderSection(api, bookId, sectionId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const section = await getSection(api, bookId, sectionId);
  if (!section) fail("no section " + JSON.stringify(text(sectionId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const sections = await listSections(api, bookId, section.cardId);
  const sortKey = placeKey(sections, section.id, o.beforeId, o.afterId);
  await b.sectionReorder(api, section.id, sortKey);
  await record(api, bookId, {
    type: "REORDER_SECTION",
    targetId: section.id,
    targetType: "section",
    before: { sortKey: section.sortKey },
    after: { sortKey },
    actor: o.actor,
  });
  return sortKey;
}

export async function deleteSection(api, bookId, sectionId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const section = await getSection(api, bookId, sectionId);
  if (!section) fail("no section " + JSON.stringify(text(sectionId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  // deletePage's law, one table over: the graph unlink, then the desk, then the section and its
  // kind='section' mood row leave together in one transaction, then the tables are asked.
  await b.sectionDelete(api, section.id);
  await settleDesk(api, bookId);
  await tableOf(bookId).purgeSectionRows(api, section.id);
  await noGhosts(api, bookId, "section", section.id);
  await reindex(api, bookId, section.cardId);
  await record(api, bookId, {
    type: "DELETE_SECTION",
    targetId: section.id,
    targetType: "section",
    before: section,
    after: null,
    actor: o.actor,
  });
  return true;
}

// --- tags ---

export async function listTags(api, bookId, cardId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const ids = rowsOf(await b.tagsForCard(api, text(cardId))).map((r) => text(r.tagId));
  if (!ids.length) return [];
  const pid = await projectIdOf(api, bookId);
  const res = await api.sql`SELECT id, name, color FROM tags WHERE projectId = ${pid}`;
  const known = {};
  for (const r of rowsOf(res)) known[text(r.id)] = { id: text(r.id), name: text(r.name), color: text(r.color) };
  return ids.map((id) => known[id] || { id, name: "", color: "" });
}

// `tags` is a fixed-name project table, so its statement text lives literally here (house rule 1).
// Lets the edit modal name a tag; addTag/removeTag below stay id-only.
export async function listProjectTags(api, bookId) {
  await ensureProjectTables(api);
  const pid = await projectIdOf(api, bookId);
  const res = await api.sql`SELECT id, name, color FROM tags WHERE projectId = ${pid} ORDER BY name`;
  return rowsOf(res).map((r) => ({ id: text(r.id), name: text(r.name), color: text(r.color) }));
}

// Name -> id, minted once per project. Case-insensitive, so 'Villain' and 'villain' are one tag.
export async function ensureTag(api, bookId, name, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const wanted = text(name).trim();
  if (!wanted) fail("a tag needs a name");
  const existing = await listProjectTags(api, bookId);
  const found = existing.find((t) => t.name.toLowerCase() === wanted.toLowerCase());
  if (found) return found.id;
  const pid = await projectIdOf(api, bookId);
  const ms = await nowMs(api);
  const id = mintId(api, ms, null);
  await api.sql`INSERT INTO tags (id, projectId, name, color, createdAt)
    VALUES (${id}, ${pid}, ${wanted}, ${text(o.color)}, ${ms})`;
  return id;
}

export async function addTag(api, bookId, cardId, tagId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  await b.tagAdd(api, card.id, text(tagId));
  await record(api, bookId, {
    type: "ADD_TAG",
    targetId: card.id,
    after: { tagId: text(tagId) },
    actor: o.actor,
  });
  return true;
}

export async function removeTag(api, bookId, cardId, tagId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const card = await getCard(api, bookId, cardId);
  if (!card) fail("no card " + JSON.stringify(text(cardId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  await b.tagRemove(api, card.id, text(tagId));
  await record(api, bookId, {
    type: "REMOVE_TAG",
    targetId: card.id,
    before: { tagId: text(tagId) },
    actor: o.actor,
  });
  return true;
}

// --- the whole book, for a walk ---
// Find & Replace (lib/find.js) reads every card's text: a FIXED number of queries for the whole
//   book, never one per card. pagesWithText/sectionsWithText take a '%' needle (LIKE's "anything").

export async function allCards(api, bookId, opts) {
  const o = opts || {};
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  const rows = rowsOf(await b.cardsAll(api)).map(shapeCard).sort(byKey);
  if (o.includeTrashed) return rows;
  const hidden = await trashedInBook(api, bookId);
  return rows.filter((c) => !hidden[c.id]);
}

// Every LIVE folder in the book in ONE read — the shared export descent (lib/exportwalk.js) builds its whole tree from this plus allCards(), never one listing per folder. Trashed folders are out, exactly as listFolders() drops them.
export async function allFolders(api, bookId, opts) {
  const o = opts || {};
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  const rows = rowsOf(await needQuery(b, "foldersAll", bookId)(api)).map(shapeFolder).sort(byKey);
  if (o.includeTrashed) return rows;
  const hidden = await trashedFoldersInBook(api, bookId);
  return rows.filter((f) => !hidden[f.id]);
}

export async function allPages(api, bookId) {
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  return rowsOf(await needQuery(b, "pagesWithText", bookId)(api, "%")).map(shapePage).sort(byKey);
}

// BOOK VITALS — the whole open book in a fixed number of aggregate reads, NEVER one query per card. Words come from the same per-card counter reindex() writes, so the footer total and a card's badge cannot disagree. A trashed card counts for nothing. An unopenable book gets null.
export async function bookStats(api, bookId) {
  const st = await ensureBook(api, bookId);
  if (!st.ready) return null;
  const b = bookOf(bookId);
  if (!b || typeof b.cardsAll !== "function") return null;
  const hidden = await trashedInBook(api, bookId);
  const live = {};
  const statusCounts = {};
  let cards = 0;
  for (const r of rowsOf(await b.cardsAll(api))) {
    const id = text(r.id);
    if (hidden[id]) continue;
    live[id] = true;
    cards += 1;
    const s = text(r.status).trim();
    if (s) statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  let pages = 0;
  // COUNTING IS NOT READING (2026-08-28, lazy bodies): the page total comes off the graph's skeleton, so the footer never drags the whole book's text into memory behind it. pagesAll is the fallback for a book with no graph in front of it.
  if (typeof b.pageCountsAll === "function") {
    for (const r of rowsOf(await b.pageCountsAll(api))) if (live[text(r.cardId)]) pages += Number(r.n || 0);
  } else if (typeof b.pagesAll === "function") {
    for (const r of rowsOf(await b.pagesAll(api))) if (live[text(r.cardId)]) pages += 1;
  }
  let words = 0;
  if (typeof b.statsAll === "function") {
    for (const r of rowsOf(await b.statsAll(api))) if (live[text(r.cardId)]) words += Number(r.words || 0);
  }
  return { statusCounts: statusCounts, cards: cards, words: words, pages: pages };
}

export async function allSections(api, bookId) {
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  return rowsOf(await needQuery(b, "sectionsWithText", bookId)(api, "%")).map(shapeSection).sort(byKey);
}

// The cards wearing one tag — the membership side, per book (names live in `tags`).
export async function cardsForTag(api, bookId, tagId) {
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  return rowsOf(await needQuery(b, "cardsWithTag", bookId)(api, text(tagId))).map((r) => text(r.cardId));
}

// --- a batch text write, as ONE command --- Find & Replace's write path: one gesture = ONE change-log row. `before` is the guard, not decoration: a target whose stored text moved on since the search is SKIPPED with a reason, never overwritten (house rule 3 — the caller hears about all of it).

const REPLACE_KINDS = { title: true, summary: true, section: true, page: true };

export async function writeEditSide(api, bookId, e, value) {
  const b = bookOf(bookId);
  const kind = text(e.kind);
  const targetId = text(e.targetId) || text(e.cardId);
  if (kind === "page") {
    await b.pageSetContent(api, targetId, value);
    return text(e.cardId);
  }
  if (kind === "section") {
    const section = await getSection(api, bookId, targetId);
    if (section && section.lineLimit > 0) {
      const lines = value === "" ? 0 : value.split("\n").length;
      if (lines > section.lineLimit) {
        fail("section " + JSON.stringify(section.name || section.id) + " holds " + section.lineLimit + " line(s); that edit is " + lines);
      }
    }
    await b.sectionSetContent(api, targetId, value);
    return section ? section.cardId : text(e.cardId);
  }
  if (kind === "summary") {
    const card = await getCard(api, bookId, text(e.cardId));
    if (!card) fail("no card " + JSON.stringify(text(e.cardId)) + " in book " + text(bookId));
    await b.cardSetMeta(api, card.id, card.status, card.priority, value, card.openQuestion ? 1 : 0, card.editor);
    return card.id;
  }
  if (kind === "title") {
    const card = await getCard(api, bookId, text(e.cardId));
    if (!card) fail("no card " + JSON.stringify(text(e.cardId)) + " in book " + text(bookId));
    const applied = await uniqueName(api, bookId, card.folderId, value, card.id);
    await b.cardRename(api, card.id, applied);
    await writeName(api, bookId, await projectIdOf(api, bookId), card.id, applied, false);
    return card.id;
  }
  fail("replace: " + JSON.stringify(kind) + " is not a replaceable field");
}

export async function readEditSide(api, bookId, e) {
  const kind = text(e.kind);
  const targetId = text(e.targetId) || text(e.cardId);
  if (kind === "page") {
    const page = await getPage(api, bookId, targetId);
    return page ? { text: page.content, cardId: page.cardId } : null;
  }
  if (kind === "section") {
    const section = await getSection(api, bookId, targetId);
    return section ? { text: section.content, cardId: section.cardId } : null;
  }
  const card = await getCard(api, bookId, text(e.cardId));
  if (!card) return null;
  return { text: kind === "title" ? card.name : card.summary, cardId: card.id };
}

export async function applyReplacements(api, bookId, edits, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const list = Array.isArray(edits) ? edits : [];
  const applied = [];
  const skipped = [];
  const touched = {};
  if (!list.length) return { ok: true, applied, skipped, cards: 0, seq: 0 };
  await ensureBook(api, bookId);

  // An open keystroke window is its own command. Close it before this one so the log's order is
  // the order the author worked in.
  const log = changelog();
  if (log && typeof log.flushText === "function") {
    try {
      await log.flushText(api);
    } catch (e) {
      api.log("[cards] could not close the text window before a replace: " + text((e && e.message) || e));
    }
  }

  for (const raw of list) {
    const e = raw || {};
    const kind = text(e.kind);
    const note = { kind, cardId: text(e.cardId), targetId: text(e.targetId) || text(e.cardId) };
    if (!REPLACE_KINDS[kind]) {
      skipped.push(Object.assign({ reason: "not a replaceable field" }, note));
      continue;
    }
    try {
      const now = await readEditSide(api, bookId, e);
      if (!now) {
        skipped.push(Object.assign({ reason: "that " + kind + " is gone" }, note));
        continue;
      }
      if (now.text !== text(e.before)) {
        skipped.push(Object.assign({ reason: "it changed since the search — searched again, it is not the same text" }, note));
        continue;
      }
      const cardId = await silently(function () {
        return writeEditSide(api, bookId, e, text(e.after));
      });
      touched[cardId || note.cardId] = true;
      applied.push({ kind, cardId: cardId || note.cardId, targetId: note.targetId, before: text(e.before), after: text(e.after) });
    } catch (err) {
      skipped.push(Object.assign({ reason: text((err && err.message) || err) }, note));
    }
  }

  for (const id in touched) await reindex(api, bookId, id);

  let seq = 0;
  if (applied.length) {
    const side = function (key) {
      return {
        label: text(o.label) || "Replace",
        edits: applied.map((e) => ({ kind: e.kind, cardId: e.cardId, targetId: e.targetId, text: e[key] })),
      };
    };
    seq = (await record(api, bookId, {
      type: "REPLACE_IN_BOOK",
      targetId: text(bookId),
      targetType: "book",
      before: side("before"),
      after: side("after"),
      actor: o.actor,
    })) || 0;
  }
  return { ok: true, applied, skipped, cards: Object.keys(touched).length, seq };
}

// Both sides ride in the row, so undo and redo are the same walk with the other snapshot. A target
// somebody else edited since is LEFT ALONE: our text has to still be there to take it back.
export async function reverseReplaceInBook(api, row, side) {
  const bookId = text(row.bookId);
  const want = side === "before" ? row.before : row.after;
  const have = side === "before" ? row.after : row.before;
  const wantEdits = ((want || {}).edits) || [];
  const haveEdits = ((have || {}).edits) || [];
  await ensureBook(api, bookId);
  const touched = {};
  let put = 0;
  let left = 0;
  for (let i = 0; i < wantEdits.length; i++) {
    const e = wantEdits[i];
    const mine = haveEdits[i] || {};
    const now = await readEditSide(api, bookId, e);
    if (!now) {
      left += 1;
      continue;
    }
    if (mine.text !== undefined && now.text !== text(mine.text)) {
      left += 1; // somebody else's words are in there now
      continue;
    }
    const cardId = await writeEditSide(api, bookId, e, text(e.text));
    touched[cardId || text(e.cardId)] = true;
    put += 1;
  }
  for (const id in touched) await reindex(api, bookId, id);
  if (left) {
    api.log("[cards] replace reversal put back " + put + " of " + wantEdits.length + " — " + left + " had moved on");
  }
  return put;
}

// --- folders "a book holds folders and cards.

export function fpkey(bookId, folderId) {
  return text(bookId) + "\u0000" + text(folderId);
}

export function shapeFolder(r) {
  return {
    id: text(r.id),
    name: text(r.name),
    folderId: text(r.folderId),
    sortKey: text(r.sortKey),
    collapsed: !!Number(r.collapsed || 0),
    // The designation ('' | 'cinematic' | 'level') rides every folder row a tile or a walk reads,
    // so nothing has to take a second query to find out whether a folder compiles.
    doc: docFlag(r.doc),
    kind: FOLDER,
    isFolder: true,
  };
}

export function pendingFolderEntry(bookId, folderId) {
  return PFOLDERS[fpkey(bookId, folderId)] || null;
}

export function pendingFolderRows(bookId, parentId) {
  const bid = text(bookId);
  const pid = text(parentId);
  const out = [];
  for (const k in PFOLDERS) {
    const e = PFOLDERS[k];
    if (e.removed || e.bookId !== bid) continue;
    if (pid && e.row.folderId !== pid) continue;
    out.push(e.row);
  }
  return out;
}

export function pendingFolderTiles(bookId, parentId) {
  return pendingFolderRows(bookId, parentId)
    .map((r) => Object.assign({}, r, { pending: true, childCounts: { folders: 0, cards: 0 } }))
    .sort(byKey);
}

export async function trashedFoldersInBook(api, bookId) {
  const out = {};
  const b = bookOf(bookId);
  if (b && typeof b.trashedFolders === "function") {
    for (const r of rowsOf(await b.trashedFolders(api))) out[text(r.entityId)] = true;
    return out;
  }
  const res = await api.sql`SELECT entityId FROM trash WHERE entityType = 'folder' AND originalBookId = ${text(bookId)}`;
  for (const r of rowsOf(res)) out[text(r.entityId)] = true;
  return out;
}

// compile decides whether a book compiles into an export; these two are the same switch at folder and card grain.
export function compileFlag(v) {
  return Number(v === undefined || v === null ? 1 : v) !== 0;
}

export async function setFolderCompile(api, bookId, folderId, on) {
  const id = text(folderId);
  if (!id) return false;
  await ensureBook(api, bookId);
  await STORE.book(text(bookId)).folderSetCompile(api, id, compileFlag(on) ? 1 : 0);
  return true;
}

// ── DOC — a folder's DESIGNATION ───────────────────────────────────────────────────────────────── jace, 2026-08-28: "We will want a cinematic folder… We can add a flag to it… Not just cinema.
const DOCS = ["", "cinematic", "level"];

export function docFlag(v) {
  const want = text(v).trim().toLowerCase();
  return DOCS.indexOf(want) === -1 ? "" : want;
}

// The verb a designation control calls. An unknown word is not an error and not a guess: it lands
// as '' — undesignated — which is the one state that can never surprise an author.
export async function setFolderDoc(api, bookId, folderId, doc) {
  const id = text(folderId);
  if (!id) return "";
  await ensureBook(api, bookId);
  const next = docFlag(doc);
  const b = bookOf(bookId);
  await needQuery(b, "folderSetDoc", bookId)(api, id, next);
  return next;
}

// The read, off the row a listing already holds — never its own query when the caller has the tile.
export async function folderDoc(api, bookId, folderId) {
  const f = await getFolder(api, bookId, folderId);
  return f ? docFlag(f.doc) : "";
}

export async function setCardCompile(api, bookId, cardId, on) {
  const id = text(cardId);
  if (!id) return false;
  await ensureBook(api, bookId);
  await STORE.book(text(bookId)).cardSetCompile(api, id, compileFlag(on) ? 1 : 0);
  return true;
}

// UNREAD — the dot's two verbs, riding compileFlags' overlay pattern exactly: STORE direct, never bookOf()/graph (the mirror copies rows column for column and knows nothing of this column, so a mirrored read would answer a stale 0). graph.js stays untouched.
export async function setCardRead(api, bookId, cardId) {
  const id = text(cardId);
  if (!id) return false;
  await ensureBook(api, bookId);
  await STORE.book(text(bookId)).cardSetRead(api, id);
  return true;
}

// The overlay read: one statement, the unread set with the folder each one lives in — the pane
// needs the folderId to roll a buried card up to its ancestor folders.
export async function unreadIds(api, bookId) {
  const b = STORE.book(text(bookId));
  await ensureBook(api, bookId);
  const out = [];
  for (const r of rowsOf(await b.cardsUnread(api))) out.push({ id: text(r.id), folderId: text(r.folderId) });
  return out;
}

// One read per book for a whole export walk: { folders: { id: bool }, cards: { id: bool } }.
export async function compileFlags(api, bookId) {
  const b = STORE.book(text(bookId));
  const out = { folders: {}, cards: {} };
  await ensureBook(api, bookId);
  const answers = await Promise.all([b.foldersCompile(api), b.cardsCompile(api)]);
  for (const r of rowsOf(answers[0])) out.folders[text(r.id)] = compileFlag(r.compile);
  for (const r of rowsOf(answers[1])) out.cards[text(r.id)] = compileFlag(r.compile);
  return out;
}

export async function isFolderTrashed(api, folderId) {
  const res = await api.sql`SELECT entityId FROM trash WHERE entityType = 'folder' AND entityId = ${text(folderId)}`;
  return rowsOf(res).length > 0;
}

// Same ruling as namesIn: the DATABASE gets the final word (STORE, never the mirror) — plus the
// desk-bound creates the DB cannot see yet, which ride in from the pending map.
export async function folderNamesIn(api, bookId, parentId, exclude) {
  await ensureBook(api, bookId);
  const s = STORE.book(text(bookId));
  const q = needQuery(s, "folderChildren", bookId);
  const taken = {};
  for (const r of rowsOf(await q(api, text(parentId)))) {
    const id = text(r.id);
    if (exclude && exclude[id]) continue;
    taken[text(r.name)] = true;
  }
  for (const r of pendingFolderRows(bookId, parentId)) {
    if (exclude && exclude[text(r.id)]) continue;
    taken[text(r.name)] = true;
  }
  return taken;
}

export async function uniqueFolderName(api, bookId, parentId, wanted, excludeId) {
  const exclude = {};
  if (excludeId) exclude[text(excludeId)] = true;
  const taken = await folderNamesIn(api, bookId, parentId, exclude);
  return pickName(taken, text(wanted).trim() || DEFAULT_FOLDER_NAME);
}

// The tile's caption: sub-folders, and cards with each stack counted ONCE. Trashed rows are out.
export async function childCountsOf(api, bookId, ids, hiddenCards, hiddenFolders) {
  const b = bookOf(bookId);
  const kids = needQuery(b, "folderChildren", bookId);
  const list = ids.map((x) => text(x));
  const answers = await Promise.all(
    list.map((id) => Promise.all([kids(api, id), b.cardsInFolder(api, id)]))
  );
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const folderRows = rowsOf(answers[i][0]).filter((r) => !(hiddenFolders || {})[text(r.id)]);
    const stacks = {};
    for (const r of rowsOf(answers[i][1])) {
      if ((hiddenCards || {})[text(r.id)]) continue;
      stacks[text(r.stackId) || text(r.id)] = true;
    }
    out[list[i]] = { folders: folderRows.length, cards: Object.keys(stacks).length };
  }
  return out;
}

export function rememberFolders(bookId, parentId, rows, tiles) {
  const names = {};
  let tail = null;
  for (const r of rows) {
    names[r.name] = true;
    if (r.sortKey && (!tail || IDS.cmp(r.sortKey, tail) > 0)) tail = r.sortKey;
  }
  FSNAPS[fpkey(bookId, parentId)] = { names: names, tail: tail, tiles: tiles || [] };
}

export function listFoldersCached(bookId, parentId) {
  const pid = text(parentId) || text(bookId);
  const snap = FSNAPS[fpkey(bookId, pid)];
  const out = (snap ? snap.tiles.slice() : []).filter((t) => {
    const e = pendingFolderEntry(bookId, t.id);
    return !(e && e.removed);
  });
  const seen = {};
  for (const t of out) seen[t.id] = true;
  for (const t of pendingFolderTiles(bookId, pid)) if (!seen[t.id]) out.push(t);
  return out.sort(byKey);
}

export async function listFolders(api, bookId, parentId) {
  const pid = text(parentId) || text(bookId);
  const st = await ensureBook(api, bookId);
  if (!st.ready) return pendingFolderTiles(bookId, pid);
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  const answers = await Promise.all([q(api, pid), trashedFoldersInBook(api, bookId), trashedInBook(api, bookId)]);
  const hiddenFolders = answers[1];
  const hiddenCards = answers[2];
  const live = rowsOf(answers[0]).map(shapeFolder).filter((f) => !hiddenFolders[f.id]).sort(byKey);
  const counts = live.length
    ? await childCountsOf(api, bookId, live.map((f) => f.id), hiddenCards, hiddenFolders)
    : {};
  const out = live.map((f) =>
    Object.assign({}, f, { pending: false, childCounts: counts[f.id] || { folders: 0, cards: 0 } })
  );
  rememberFolders(bookId, pid, live, out);
  const seen = {};
  for (const t of out) seen[t.id] = true;
  for (const t of pendingFolderTiles(bookId, pid)) if (!seen[t.id]) out.push(t);
  const tiles = out
    .filter((t) => {
      const e = pendingFolderEntry(bookId, t.id);
      return !(e && e.removed);
    })
    .sort(byKey);
  const snap = FSNAPS[fpkey(bookId, pid)];
  if (snap) snap.tiles = tiles;
  return tiles;
}

export async function getFolder(api, bookId, folderId) {
  const waiting = pendingFolderEntry(bookId, folderId);
  if (waiting && waiting.done) await waiting.done;
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const row = rowsOf(await needQuery(b, "folderGet", bookId)(api, text(folderId)))[0];
  return row ? shapeFolder(row) : null;
}

// Root first, the folder itself last; the book id answers []. An unreadable row stops the walk
// rather than inventing a name.
export async function folderPath(api, bookId, folderId) {
  const bid = text(bookId);
  let id = text(folderId);
  if (!id || id === bid) return [];
  await ensureBook(api, bookId);
  const out = [];
  for (let i = 0; i < MAX_DEPTH && id && id !== bid; i++) {
    const f = await getFolder(api, bookId, id);
    if (!f) break;
    out.unshift({ id: f.id, name: f.name });
    id = f.folderId;
  }
  return out;
}

// Depth-first in sort order, each carrying its depth and ' › ' path. Read by Move To… and the tree.
export async function folderTree(api, bookId) {
  const st = await ensureBook(api, bookId);
  if (!st.ready) return [];
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  const hidden = await trashedFoldersInBook(api, bookId);
  const out = [];
  const walk = async function (parentId, depth, trail) {
    if (depth > MAX_DEPTH || out.length >= MAX_FOLDERS) return;
    const kids = rowsOf(await q(api, text(parentId))).map(shapeFolder).filter((f) => !hidden[f.id]).sort(byKey);
    for (const f of kids) {
      if (out.length >= MAX_FOLDERS) return;
      const names = trail.concat([f.name]);
      out.push({ id: f.id, name: f.name, folderId: f.folderId, sortKey: f.sortKey, depth: depth, path: names.join(" › ") });
      await walk(f.id, depth + 1, names);
    }
  };
  await walk(text(bookId), 1, []);
  return out;
}

// --- creating a folder ---

// Decided in memory — null when this seat has never listed the parent and cannot honestly claim to
// know which names are taken or where the order ends.
export function planFolder(api, bookId, o, allowEmpty) {
  const parentId = text(o.folderId) || text(bookId);
  const snap = FSNAPS[fpkey(bookId, parentId)] || (allowEmpty ? { names: {}, tail: null } : null);
  const ms = LIB.nowMsSync ? LIB.nowMsSync(api) : null;
  if (!snap || ms === null) return null;
  const taken = Object.assign({}, snap.names);
  let tail = snap.tail;
  for (const r of pendingFolderRows(bookId, parentId)) {
    taken[r.name] = true;
    if (r.sortKey && (!tail || IDS.cmp(r.sortKey, tail) > 0)) tail = r.sortKey;
  }
  const name = pickName(taken, text(o.name).trim() || DEFAULT_FOLDER_NAME);
  const id = mintId(api, ms, null);
  return {
    id: id,
    name: name,
    folderId: parentId,
    sortKey: IDS.keyBetween(tail || null, null),
    collapsed: false,
    doc: "",
    kind: FOLDER,
    isFolder: true,
    pending: true,
    childCounts: { folders: 0, cards: 0 },
  };
}

export async function runFolderCreate(api, entry) {
  const row = entry.row;
  const bookId = entry.bookId;
  entry.running = true;
  try {
    const st = await bookReadyOrWait(api, bookId);
    if (!st.ready) {
      entry.parked = true;
      entry.running = false;
      api.log("[cards] folder " + row.id + " is parked while book " + bookId + " finishes opening");
      return { ok: false, id: row.id, parked: true };
    }
    const b = bookOf(bookId);
    const insert = needQuery(b, "folderInsert", bookId);
    // THE NAME IS MADE BEFORE SAVING (his ruling, 2026-08-30): the plan minted from this seat's
    // snapshot, which can be cold — the database gets the final word before any row saves or stages.
    row.name = await uniqueFolderName(api, bookId, row.folderId, row.name, row.id);
    try {
      await insert(api, row.id, row.name, row.folderId, row.sortKey);
    } catch (e) {
      // Same census rule as cards: a refused name is a stale view — re-pick and retry once.
      if (!isNameCollision(e)) throw e;
      row.name = await uniqueFolderName(api, bookId, row.folderId, row.name, row.id);
      await insert(api, row.id, row.name, row.folderId, row.sortKey);
    }
    learnLanded(FSNAPS[fpkey(bookId, row.folderId)], row);
    // The insert is not a folder until the table says it is. On a loaded graph folderInsert only STAGES the row, so without this CREATE_FOLDER reached change_log while the folders row was still ink owed — and a refused flush reclaimed it, leaving a journalled create with no row. A UNIQUE refusal can surface HERE, at the flush landed() forces — catch that one shape, re-pick from the database, re-stage the SAME id (the desk keeps the latest row per key, so this also un-wedges a poisoned desk), settle again.
    try {
      await landed(api, bookId, "folder", row.id, { name: row.name, folderId: row.folderId });
    } catch (e) {
      if (!isNameCollision(e)) throw e;
      row.name = await uniqueFolderName(api, bookId, row.folderId, row.name, row.id);
      await insert(api, row.id, row.name, row.folderId, row.sortKey);
      learnLanded(FSNAPS[fpkey(bookId, row.folderId)], row);
      await landed(api, bookId, "folder", row.id, { name: row.name, folderId: row.folderId });
    }
    await record(api, bookId, {
      type: "CREATE_FOLDER",
      targetId: row.id,
      targetType: FOLDER,
      after: { id: row.id, name: row.name, folderId: row.folderId, sortKey: row.sortKey },
      actor: entry.actor,
    });
  } catch (e) {
    const message = String((e && e.message) || e);
    entry.error = message;
    entry.running = false;
    LAST_ERROR = { bookId: bookId, cardId: row.id, message: message };
    delete PFOLDERS[fpkey(bookId, row.id)];
    api.log("[cards] folder create failed for " + row.id + " in book " + bookId + ": " + message);
    notify({ kind: FOLDER, op: "create", ok: false, bookId: bookId, id: row.id, error: message });
    return { ok: false, id: row.id, error: message };
  }
  delete PFOLDERS[fpkey(bookId, row.id)];
  row.pending = false;
  entry.running = false;
  while (entry.queue.length) {
    const job = entry.queue.shift();
    try {
      await job(api);
    } catch (e) {
      const message = String((e && e.message) || e);
      LAST_ERROR = { bookId: bookId, cardId: row.id, message: message };
      api.log("[cards] a queued edit on folder " + row.id + " failed: " + message);
      notify({ kind: FOLDER, op: "queued", ok: false, bookId: bookId, id: row.id, error: message });
    }
  }
  notify({ kind: FOLDER, op: "create", ok: true, bookId: bookId, id: row.id });
  return { ok: true, id: row.id };
}

export function registerPendingFolder(api, bookId, plan, o) {
  const entry = {
    bookId: text(bookId),
    row: plan,
    queue: [],
    removed: false,
    parked: false,
    running: false,
    error: null,
    done: null,
    actor: (o || {}).actor,
  };
  PFOLDERS[fpkey(bookId, plan.id)] = entry;
  entry.done = runFolderCreate(api, entry);
  return entry;
}

export async function createFolderRow(api, bookId, opts) {
  assertBookMutable(bookId);
  // Same law, same reason as createCardRow: a folder with no book is refused before it is planned.
  if (!text(bookId)) fail("a folder needs a book — refused (no books, no cards)");
  const o = opts || {};
  let plan = planFolder(api, bookId, o, false);
  if (!plan) {
    await LIB.ensure(api);
    try {
      await listFolders(api, bookId, text(o.folderId) || text(bookId));
    } catch (e) {
      api.log("[cards] could not read folders before create: " + String((e && e.message) || e));
    }
    plan = planFolder(api, bookId, o, true);
    if (!plan) fail("could not plan a folder in book " + text(bookId) + " — the clock is unavailable");
  }
  registerPendingFolder(api, bookId, plan, o);
  return Object.assign({}, plan);
}

export async function createFolder(api, bookId, opts) {
  assertBookMutable(bookId);
  const row = await createFolderRow(api, bookId, opts);
  return row ? row.id : null;
}

export function folderSettleOf(bookId, folderId) {
  const e = pendingFolderEntry(bookId, folderId);
  return e && e.done ? e.done : null;
}

export async function renameFolder(api, bookId, folderId, name, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const waiting = pendingFolderEntry(bookId, folderId);
  if (waiting) {
    const snap = FSNAPS[fpkey(bookId, waiting.row.folderId)] || { names: {} };
    const taken = Object.assign({}, snap.names);
    delete taken[waiting.row.name];
    for (const r of pendingFolderRows(bookId, waiting.row.folderId)) if (r.id !== waiting.row.id) taken[r.name] = true;
    const applied = pickName(taken, text(name).trim() || DEFAULT_FOLDER_NAME);
    waiting.row.name = applied;
    waiting.queue.push(function (a) {
      return renameFolder(a, bookId, folderId, applied, o);
    });
    return applied;
  }
  const folder = await getFolder(api, bookId, folderId);
  if (!folder) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const applied = await uniqueFolderName(api, bookId, folder.folderId, name, folder.id);
  if (applied === folder.name) return applied;
  await needQuery(b, "folderRename", bookId)(api, folder.id, applied);
  await record(api, bookId, {
    type: "RENAME_FOLDER",
    targetId: folder.id,
    targetType: FOLDER,
    before: { name: folder.name },
    after: { name: applied },
    actor: o.actor,
  });
  return applied;
}

// Is `maybe` this folder or one of its descendants? A folder can never be moved inside itself.
export async function isInside(api, bookId, folderId, maybe) {
  const target = text(folderId);
  let id = text(maybe);
  const bid = text(bookId);
  for (let i = 0; i < MAX_DEPTH && id && id !== bid; i++) {
    if (id === target) return true;
    const f = await getFolder(api, bookId, id);
    if (!f) return false;
    id = f.folderId;
  }
  return false;
}

// NEIGHBOURS as moveCard: beforeId lands BEFORE that sibling, afterId AFTER, neither appends.
// opts.folderId re-parents.
export async function moveFolder(api, bookId, folderId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const folder = await getFolder(api, bookId, folderId);
  if (!folder) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const parentId = text(o.folderId) || folder.folderId;
  if (parentId !== folder.folderId && (await isInside(api, bookId, folder.id, parentId))) {
    fail("a folder cannot be moved inside itself");
  }
  const q = needQuery(b, "folderChildren", bookId);
  const siblings = rowsOf(await q(api, parentId))
    .map(shapeFolder)
    .filter((f) => f.id !== folder.id)
    .sort(byKey);
  const sortKey = placeKey(siblings, folder.id, o.beforeId, o.afterId);

  let applied = folder.name;
  if (parentId !== folder.folderId) {
    applied = await uniqueFolderName(api, bookId, parentId, folder.name, folder.id);
    if (applied !== folder.name) await needQuery(b, "folderRename", bookId)(api, folder.id, applied);
  }
  await needQuery(b, "folderMove", bookId)(api, folder.id, parentId, sortKey);
  // The table says where the folder is before the move is written down — moveCard's law (1657), and for the same reason: on a loaded graph folderMove only STAGES, so without this MOVE_FOLDER could reach change_log naming an address the folders row never took.
  await landed(api, bookId, "folder", folder.id, { folderId: parentId, name: applied });
  await record(api, bookId, {
    type: parentId === folder.folderId ? "REORDER_FOLDER" : "MOVE_FOLDER",
    targetId: folder.id,
    targetType: FOLDER,
    before: { folderId: folder.folderId, sortKey: folder.sortKey, name: folder.name },
    after: { folderId: parentId, sortKey: sortKey, name: applied },
    actor: o.actor,
  });
  return { folderId: parentId, sortKey: sortKey, name: applied };
}

// The whole subtree: the folder, its cards (stacks kept together) and its sub-folders.
export async function duplicateFolder(api, bookId, folderId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const src = await getFolder(api, bookId, folderId);
  if (!src) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  const insert = needQuery(b, "folderInsert", bookId);
  const hiddenCards = await trashedInBook(api, bookId);
  const hiddenFolders = await trashedFoldersInBook(api, bookId);
  const ms = await nowMs(api);
  const seen = {};
  let made = 0;

  const copyInto = async function (fromId, intoParent, wantedName, neighbourId, depth) {
    if (depth > MAX_DEPTH || made >= MAX_FOLDERS) fail("this folder is too deep to duplicate");
    const id = mintId(api, ms, seen);
    const siblings = rowsOf(await q(api, intoParent)).map(shapeFolder).sort(byKey);
    const sortKey = placeKey(siblings, id, null, neighbourId || null);
    const name = pickName(await folderNamesIn(api, bookId, intoParent, null), wantedName);
    await insert(api, id, name, intoParent, sortKey);
    made++;

    const rows = rowsOf(await b.cardsInFolder(api, fromId)).map(shapeCard).filter((c) => !hiddenCards[c.id]);
    const stackMap = {};
    const taken = {};
    for (const c of rows.slice().sort(byKey)) {
      const fresh = mintId(api, ms, seen);
      if (!stackMap[c.stackId]) stackMap[c.stackId] = c.id === c.stackId ? fresh : "";
    }
    for (const c of rows.slice().sort(byKey)) {
      const fresh = mintId(api, ms, seen);
      const stackId = stackMap[c.stackId] || fresh;
      if (!stackMap[c.stackId]) stackMap[c.stackId] = stackId;
      const cardName = pickName(taken, c.name);
      taken[cardName] = true;
      await copyCardInto(api, bookId, c, {
        id: fresh,
        name: cardName,
        folderId: id,
        stackId: stackId,
        sortKey: c.sortKey,
        stackOrder: c.stackOrder,
        createdAt: ms,
      });
    }

    const kids = rowsOf(await q(api, fromId)).map(shapeFolder).filter((f) => !hiddenFolders[f.id]).sort(byKey);
    for (const k of kids) await copyInto(k.id, id, k.name, null, depth + 1);
    return id;
  };

  const newId = await copyInto(src.id, src.folderId, src.name, src.id, 1);
  await record(api, bookId, {
    type: "DUPLICATE_FOLDER",
    targetId: newId,
    targetType: FOLDER,
    before: { sourceId: src.id },
    after: { id: newId, folderId: src.folderId, folders: made },
    actor: o.actor,
  });
  return newId;
}

// Soft delete, taking what it holds: every card goes through trashCard (fts row, reference edges,
// its own TRASH_CARD entry), every sub-folder gets its own trash row.
export async function trashFolder(api, bookId, folderId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const waiting = pendingFolderEntry(bookId, folderId);
  if (waiting) {
    waiting.removed = true;
    waiting.queue.push(function (a) {
      return trashFolder(a, bookId, folderId, o);
    });
    return { trashedAt: 0, folders: 1, cards: 0 };
  }
  const folder = await getFolder(api, bookId, folderId);
  if (!folder) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  const ms = await nowMs(api);
  const pid = await projectIdOf(api, bookId);
  let folders = 0;
  let cards = 0;

  const take = async function (f, depth) {
    if (depth > MAX_DEPTH) fail("this folder is too deep to trash in one go");
    const kids = rowsOf(await q(api, f.id)).map(shapeFolder);
    for (const k of kids) await take(k, depth + 1);
    for (const c of rowsOf(await b.cardsInFolder(api, f.id)).map(shapeCard)) {
      if (await isTrashedInBook(api, bookId, c.id)) continue;
      await trashCard(api, bookId, c.id, { actor: o.actor });
      cards++;
    }
    await api.sql`INSERT INTO trash (entityId, entityType, projectId, originalBookId, originalFolderId, trashedAt)
      VALUES (${f.id}, 'folder', ${pid}, ${text(bookId)}, ${f.folderId}, ${ms})
      ON CONFLICT(entityId, entityType) DO UPDATE SET
        projectId = excluded.projectId, originalBookId = excluded.originalBookId,
        originalFolderId = excluded.originalFolderId, trashedAt = excluded.trashedAt`;
    noteTrashed(bookId, "folder", f.id, true);
    // Same instant, same reason: the next newFolder's optimistic paint reads FSNAPS, and a folder
    // in the can must not be in it ("the old folder showed up for a moment").
    forgetCachedTile(bookId, f.id);
    folders++;
  };
  await take(folder, 1);

  await record(api, bookId, {
    type: "TRASH_FOLDER",
    targetId: folder.id,
    targetType: FOLDER,
    before: { name: folder.name, folderId: folder.folderId },
    after: { trashedAt: ms, folders: folders, cards: cards },
    actor: o.actor,
  });
  return { trashedAt: ms, folders: folders, cards: cards };
}

// Folder rows come back FIRST (a card needs its folder to exist), then every card that went down.
export async function restoreFolder(api, bookId, folderId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const folder = await getFolder(api, bookId, folderId);
  if (!folder) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  let folders = 0;
  let cards = 0;
  const give = async function (f, depth) {
    if (depth > MAX_DEPTH) return;
    await api.sql`DELETE FROM trash WHERE entityType = 'folder' AND entityId = ${f.id}`;
    noteTrashed(bookId, "folder", f.id, false);
    folders++;
    for (const c of rowsOf(await b.cardsInFolder(api, f.id)).map(shapeCard)) {
      if (!(await isTrashedInBook(api, bookId, c.id))) continue;
      await restoreCard(api, bookId, c.id, { actor: o.actor });
      cards++;
    }
    for (const k of rowsOf(await q(api, f.id)).map(shapeFolder)) await give(k, depth + 1);
  };
  await give(folder, 1);
  await record(api, bookId, {
    type: "RESTORE_FOLDER",
    targetId: folder.id,
    targetType: FOLDER,
    after: { folders: folders, cards: cards },
    actor: o.actor,
    undoable: false,
  });
  return { folders: folders, cards: cards };
}

// id, written by compileLand). Two guards, both required: the id must be named in THIS folder's own manifest AND wear the level lane's id prefix.
const LANDED_ID_PREFIX = "sb-lvl-"; // = lib/levellane.js ID_PREFIX / LEVEL_TAG lane

export async function razeLanded(api, bookId, folderId) {
  const t = tableOf(bookId);
  if (typeof t.compileStateGet !== "function") return 0;
  let row = null;
  try {
    row = rowsOf(await t.compileStateGet(api, text(folderId)))[0] || null;
  } catch (e) {
    api.log("[cards] the compile manifest for folder " + text(folderId) + " could not be read: " + text((e && e.message) || e));
    return 0;
  }
  if (!row) return 0;
  let manifest = null;
  try {
    manifest = JSON.parse(text(row.manifest) || "{}");
  } catch (e) {
    manifest = null;
  }
  const lanes = (manifest && manifest.lanes) || {};
  const named = {};
  for (const laneId in lanes) {
    const kept = lanes[laneId] || {};
    for (const key in kept) {
      const landedRow = kept[key] && kept[key].landed;
      const id = text(landedRow && landedRow.id);
      if (id && id.indexOf(LANDED_ID_PREFIX) === 0) named[id] = true;
    }
  }
  let gone = 0;
  for (const id in named) {
    try {
      api.destroy(id);
      gone++;
    } catch (e) {
      api.log("[cards] the landed object " + id + " would not come down: " + text((e && e.message) || e));
    }
  }
  return gone;
}

// No foreign keys: every card inside is purged by hand through purgeCard (pages, sections, tags,
// fts, names, stack, trash row), then the folder rows go.
export async function purgeFolder(api, bookId, folderId, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const folder = await getFolder(api, bookId, folderId);
  if (!folder) fail("no folder " + JSON.stringify(text(folderId)) + " in book " + text(bookId));
  const b = bookOf(bookId);
  const q = needQuery(b, "folderChildren", bookId);
  const del = needQuery(b, "folderDelete", bookId);
  let folders = 0;
  let cards = 0;
  let objects = 0;
  const burn = async function (f, depth) {
    if (depth > MAX_DEPTH) fail("this folder is too deep to purge in one go");
    for (const k of rowsOf(await q(api, f.id)).map(shapeFolder)) await burn(k, depth + 1);
    for (const c of rowsOf(await b.cardsInFolder(api, f.id)).map(shapeCard)) {
      await purgeCard(api, bookId, c.id, { actor: o.actor });
      cards++;
    }
    await del(api, f.id);
    // WHAT THIS FOLDER STOOD UP IN THE ROOM comes down with it (2026-08-29). A 'level' folder's compile lands objects; burning compile_state used to leave them standing forever, answerable to nothing. The manifest names them — never a loose prefix sweep across the world.
    objects += await razeLanded(api, bookId, f.id);
    // The folder's own rows in ONE transaction — compile_state, its trash row, the folder — then
    // the tables are asked whether anything is left (a subtree row still standing is a failure).
    await settleDesk(api, bookId);
    await tableOf(bookId).purgeFolderRows(api, f.id);
    await noGhosts(api, bookId, "folder", f.id);
    noteTrashed(bookId, "folder", f.id, false);
    folders++;
  };
  await burn(folder, 1);
  await record(api, bookId, {
    type: "PURGE_FOLDER",
    targetId: folder.id,
    targetType: FOLDER,
    before: { name: folder.name, folderId: folder.folderId },
    after: null,
    actor: o.actor,
    undoable: false,
  });
  return { folders: folders, cards: cards, objects: objects };
}

// js reverses a VALUE change itself through the book's own statements; anything that creates or destroys rows comes back HERE, because this file owns the by-hand cleanup (house rule 2: no foreign keys, so a delete walks pages/sections/tags/fts/names/stacks itself).

export function snapOf(row, side) {
  return (side === "before" ? row.before : row.after) || {};
}

// A create/duplicate: undo purges the row and everything it owns; redo puts the SAME id back, so
// every #[id] that pointed at it resolves again.
export async function reverseCardCreate(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  if (side === "before") {
    const live = await getCard(api, bookId, id);
    if (live) await purgeCard(api, bookId, id, {});
    return;
  }
  if (await getCard(api, bookId, id)) return; // already back
  const s = snapOf(row, "after");
  // CUT B: a redo re-creates the card through THE MINT — cards row + card_names + stats seed + fts row in one transaction. The old lane wrote the cards row and then the name separately, and with the name column gone that order could leave a nameless card standing if the second call refused.
  await insertCard(api, bookId, {
    id: id,
    name: text(s.name) || DEFAULT_NAME,
    folderId: text(s.folderId) || bookId,
    stackId: text(s.stackId) || id,
    sortKey: text(s.sortKey) || IDS.keyBetween(null, null),
    stackOrder: text(s.stackOrder),
    duplicatedFrom: text(s.duplicatedFrom),
    createdAt: Number(s.createdAt) || 0,
    status: "",
    priority: 0,
    summary: "",
    openQuestion: false,
    editor: "",
    unread: false,
  });
  await reindex(api, bookId, id);
}

export async function reverseFolderCreate(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  if (side === "before") {
    const kids = await listFolders(api, bookId, id);
    const cards = rowsOf(await b.cardsInFolder(api, id));
    if (kids.length || cards.length) {
      fail("that folder is not empty any more — it holds " + (kids.length + cards.length) + " item(s)");
    }
    await needQuery(b, "folderDelete", bookId)(api, id);
    return;
  }
  if (await getFolder(api, bookId, id)) return;
  const s = snapOf(row, "after");
  await needQuery(b, "folderInsert", bookId)(
    api,
    id,
    text(s.name) || DEFAULT_FOLDER_NAME,
    text(s.folderId) || bookId,
    text(s.sortKey) || IDS.keyBetween(null, null)
  );
}

export async function reversePageCreate(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const s = snapOf(row, side === "before" ? "after" : "after");
  if (side === "before") {
    const page = await getPage(api, bookId, id);
    if (page) {
      await b.pageDelete(api, id);
      await reindex(api, bookId, page.cardId);
    }
    return;
  }
  if (await getPage(api, bookId, id)) return;
  await b.pageInsert(api, id, text(s.cardId), text(s.sortKey), text(s.title));
  await reindex(api, bookId, text(s.cardId));
}

// A delete is a create read backwards: "before" holds the whole row, so it comes back whole.
export async function reversePageDelete(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  if (side === "after") {
    const page = await getPage(api, bookId, id);
    if (page) {
      await b.pageDelete(api, id);
      await reindex(api, bookId, page.cardId);
    }
    return;
  }
  if (await getPage(api, bookId, id)) return;
  const s = snapOf(row, "before");
  await b.pageInsert(api, id, text(s.cardId), text(s.sortKey), text(s.title));
  if (text(s.content)) await b.pageSetContent(api, id, text(s.content));
  if (text(s.header) || text(s.footer) || text(s.title)) {
    await b.pageSetChrome(api, id, text(s.title), text(s.header), text(s.footer));
  }
  await reindex(api, bookId, text(s.cardId));
}

// A paste. A page somebody else has written in since is LEFT ALONE rather than swept — the text we wrote has to still be there for us to take it back, which is the same guard the batch replace uses.
export async function reversePastePages(api, row, side) {
  const bookId = text(row.bookId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  const after = snapOf(row, "after");
  const want = side === "before" ? snapOf(row, "before") : after;
  const have = side === "before" ? after : snapOf(row, "before");
  const field = text(want.field) || text(have.field) || "content";
  const madePages = Array.isArray(after.pages) ? after.pages : [];
  const cardId = text(after.cardId) || text(want.cardId);

  if (side === "before") {
    for (const m of madePages) {
      const live = await getPage(api, bookId, text(m.id));
      if (!live) continue;
      if (text(live.content) !== text(m.content)) continue;
      await b.pageDelete(api, live.id);
    }
  } else {
    for (const m of madePages) {
      if (await getPage(api, bookId, text(m.id))) continue;
      await b.pageInsert(api, text(m.id), text(m.cardId) || cardId, text(m.sortKey), text(m.title));
      if (text(m.content)) await b.pageSetContent(api, text(m.id), text(m.content));
    }
  }

  const page = await getPage(api, bookId, text(row.targetId));
  if (page) {
    const now = field === "content" ? page.content : field === "header" ? page.header : page.footer;
    if (text(now) === text(have.text)) {
      const next = text(want.text);
      if (field === "content") await b.pageSetContent(api, page.id, next);
      else {
        await b.pageSetChrome(
          api,
          page.id,
          page.title,
          field === "header" ? next : page.header,
          field === "footer" ? next : page.footer
        );
      }
    }
  }
  const reindexId = cardId || (page ? page.cardId : "");
  if (reindexId) await reindex(api, bookId, reindexId);
}

export async function reverseSectionCreate(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  if (side === "before") {
    const section = await getSection(api, bookId, id);
    if (section) {
      await b.sectionDelete(api, id);
      await reindex(api, bookId, section.cardId);
    }
    return;
  }
  if (await getSection(api, bookId, id)) return;
  const s = snapOf(row, "after");
  await b.sectionInsert(api, id, text(s.cardId), text(s.name), Math.max(0, Number(s.lineLimit) || 0), text(s.sortKey));
  await reindex(api, bookId, text(s.cardId));
}

export async function reverseSectionDelete(api, row, side) {
  const bookId = text(row.bookId);
  const id = text(row.targetId);
  await ensureBook(api, bookId);
  const b = bookOf(bookId);
  if (side === "after") {
    const section = await getSection(api, bookId, id);
    if (section) {
      await b.sectionDelete(api, id);
      await reindex(api, bookId, section.cardId);
    }
    return;
  }
  if (await getSection(api, bookId, id)) return;
  const s = snapOf(row, "before");
  await b.sectionInsert(api, id, text(s.cardId), text(s.name), Math.max(0, Number(s.lineLimit) || 0), text(s.sortKey));
  if (text(s.content)) await b.sectionSetContent(api, id, text(s.content));
  await reindex(api, bookId, text(s.cardId));
}

export function registerInverses() {
  const log = changelog();
  if (!log || typeof log.registerUndo !== "function") return false;
  const on = function (type, fn) {
    log.registerUndo(type, function (api, row, side) {
      return silently(function () {
        return fn(api, row, side);
      });
    });
  };

  on("CREATE_CARD", reverseCardCreate);
  on("DUPLICATE_CARD", reverseCardCreate);
  on("CREATE_FOLDER", reverseFolderCreate);
  on("CREATE_PAGE", reversePageCreate);
  on("DELETE_PAGE", reversePageDelete);
  on("CREATE_SECTION", reverseSectionCreate);
  on("DELETE_SECTION", reverseSectionDelete);
  // Find & Replace: one command, however many cards it touched, reversed target by target.
  on("REPLACE_IN_BOOK", reverseReplaceInBook);
  // A paste: the zone's text and the pages it spilled into, reversed as one step.
  on("PASTE_PAGES", reversePastePages);

  // Trash and restore are each other's inverse, through the pipeline that already knows how to
  // take a card out of the search index and put it back with a free name.
  on("TRASH_CARD", function (api, row, side) {
    const bookId = text(row.bookId);
    return side === "before"
      ? restoreCard(api, bookId, text(row.targetId), {})
      : trashCard(api, bookId, text(row.targetId), {});
  });
  on("RESTORE_CARD", function (api, row, side) {
    const bookId = text(row.bookId);
    return side === "before"
      ? trashCard(api, bookId, text(row.targetId), {})
      : restoreCard(api, bookId, text(row.targetId), {});
  });
  on("TRASH_FOLDER", function (api, row, side) {
    const bookId = text(row.bookId);
    return side === "before"
      ? restoreFolder(api, bookId, text(row.targetId), {})
      : trashFolder(api, bookId, text(row.targetId), {});
  });

  // A reversed rename left the fts row and the id→name map holding the old spelling. They are not
  // changelog's format to write, so it asks whoever owns them — this file.
  if (typeof log.registerReindex === "function") {
    log.registerReindex(async function (api, row) {
      const bookId = text(row.bookId);
      // An undo/redo of a rename, move, meta edit, tag or stack order writes through lib/store.js directly (changelog.js holds its own handle), so it lands BEHIND the project graph. This hook is the one thing changelog calls after every reversal, card or folder — so it is where the stale cache is dropped. The next read pulls the book again.
      if (bookId) GRAPH.invalidate(bookId);
      if (!bookId || text(row.targetType) !== CARD) return;
      const id = text(row.targetId);
      const card = await getCard(api, bookId, id);
      if (!card) return;
      await silently(async function () {
        await writeName(api, bookId, await projectIdOf(api, bookId), id, card.name, false);
        await reindex(api, bookId, id);
      });
    });
  }
  return true;
}

registerInverses();

// " A section or a page carries ONE mood; the inline ones ride the words themselves and are written by the harvest in reindexNow, never from a screen. The verbs live HERE, with every other card write, for one reason: the two fences at the bottom of this file wrap the exported surface, so a denied seat and the locked Codex book refuse a mood exactly the way they refuse a rename.

export async function listAtmos(api, bookId, cardId) {
  await ensureBook(api, bookId);
  return await ATMOS.forCard(api, text(bookId), text(cardId));
}

export async function setSectionAtmo(api, bookId, sectionId, atmo, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const section = await getSection(api, bookId, sectionId);
  if (!section) fail("no section " + JSON.stringify(text(sectionId)) + " in book " + text(bookId));
  const before = (await ATMOS.forCard(api, text(bookId), section.cardId)).sections[section.id] || "";
  const next = await ATMOS.setSection(api, bookId, section.cardId, section.id, atmo);
  if (next === before) return next;
  await record(api, bookId, {
    type: "SET_SECTION_ATMO",
    targetId: section.id,
    targetType: "section",
    before: { atmo: before, cardId: section.cardId },
    after: { atmo: next, cardId: section.cardId },
    actor: o.actor,
  });
  return next;
}

export async function setPageAtmo(api, bookId, pageId, atmo, opts) {
  assertBookMutable(bookId);
  const o = opts || {};
  const page = await getPage(api, bookId, pageId);
  if (!page) fail("no page " + JSON.stringify(text(pageId)) + " in book " + text(bookId));
  const before = (await ATMOS.forCard(api, text(bookId), page.cardId)).pages[page.id] || "";
  const next = await ATMOS.setPage(api, bookId, page.cardId, page.id, atmo);
  if (next === before) return next;
  await record(api, bookId, {
    type: "SET_PAGE_ATMO",
    targetId: page.id,
    targetType: "page",
    before: { atmo: before, cardId: page.cardId },
    after: { atmo: next, cardId: page.cardId },
    actor: o.actor,
  });
  return next;
}

module.exports = {
  readSoundDocument,
  setSoundDocument,
  DEFAULT_NAME,
  DEFAULT_FOLDER_NAME,
  // where a mood is written down — the read is open to every seat, the two writes are fenced below
  listAtmos,
  setSectionAtmo,
  setPageAtmo,
  // the structural inverses, re-registerable if a seat ever loads the lanes out of order
  registerInverses,
  forget,
  ensureBook,
  listFolder,
  // Reads that never touch the database: the last listing merged with what is still in flight.
  listFolderCached,
  getCard,
  createCard,
  // The same create, returning the fully shaped pending row instead of just its id.
  createCardRow,
  // The pending layer, for the shell: a per-row flag rides every listed row already.
  isPending,
  pendingRow,
  bookStatus,
  settleOf,
  lastCreateError,
  onChange,
  renameCard,
  setMeta,
  duplicateCard,
  moveCard,
  createStackFrom,
  duplicateStack,
  listStack,
  cycleStack,
  setStackPrimary,
  splitFromStack,
  trashCard,
  restoreCard,
  purgeCard,
  purgeStack,
  sweepIntegrity,
  nameOf,
  isTrashed,
  listTrash,
  recountWords,
  // ONE index pass for a whole batch: hold, write everything, flush once in a finally.
  holdIndex,
  flushIndex,
  registerAfterIndex,
  search,
  // The whole book, for a walk (lib/find.js) — a fixed number of queries, never one per card.
  allCards,
  allPages,
  allSections,
  // The footer ribbon's vitals for the whole open book — a fixed number of aggregate reads.
  bookStats,
  cardsForTag,
  // Find & Replace's write path: many targets, ONE undoable command.
  applyReplacements,
  // The same search over many books — the results view's all-books scope.
  searchBooks,
  listPageHeaders,
  listPages,
  getPage,
  createPage,
  setPageContent,
  setScorePage,
  setAssetPages,
  pastePages,
  setPageChrome,
  reorderPage,
  deletePage,
  listSections,
  getSection,
  createSection,
  renameSection,
  setSectionContent,
  reorderSection,
  deleteSection,
  listTags,
  listProjectTags,
  ensureTag,
  addTag,
  removeTag,
  // --- folders: the container axis. Cards are unchanged by every verb below.
  listFolders,
  listFoldersCached,
  // The whole folder tree in ONE read — lib/exportwalk.js's descent, never a listing per folder.
  allFolders,
  getFolder,
  folderPath,
  folderTree,
  createFolder,
  createFolderRow,
  folderSettleOf,
  renameFolder,
  moveFolder,
  duplicateFolder,
  trashFolder,
  restoreFolder,
  purgeFolder,
  isFolderTrashed,
  setFolderCompile,
  setCardCompile,
  // A folder's designation: '' | 'cinematic' | 'level' — the flag lib/compile.js compiles from.
  DOCS,
  docFlag,
  setFolderDoc,
  folderDoc,
  compileFlags,
  setCardRead,
  unreadIds,
};

// js's `locked` flag — the Codex) is READ-ONLY to every seat: it opens, it reads, it searches, it cross-references, and it takes no write. authoring(true) lifts the fence for that pass and authoring(false) drops it again; the app never calls it, so an author's seat can never be inside one. A refusal THROWS, in the words the error lane already shows — never a silent no-op.
let AUTHORING = 0;

export function authoring(on) {
  AUTHORING = on ? AUTHORING + 1 : Math.max(0, AUTHORING - 1);
  return AUTHORING > 0;
}

export function isLockedBook(bookId) {
  if (AUTHORING > 0) return false;
  try {
    return PIN.isLocked(text(bookId));
  } catch (e) {
    return false;
  }
}

const LOCKED_VERBS = [
  "createCard", "createCardRow", "renameCard", "setMeta", "duplicateCard", "moveCard",
  "createStackFrom", "duplicateStack", "cycleStack", "setStackPrimary", "splitFromStack",
  "trashCard", "restoreCard", "purgeCard", "purgeStack", "recountWords", "applyReplacements",
  "createPage", "setPageContent", "setScorePage", "setSoundDocument", "setAssetPages", "pastePages", "setPageChrome", "reorderPage", "deletePage",
  "createSection", "renameSection", "setSectionContent", "reorderSection", "deleteSection",
  "setSectionAtmo", "setPageAtmo",
  "ensureTag", "addTag", "removeTag",
  "createFolder", "createFolderRow", "renameFolder", "moveFolder", "duplicateFolder",
  "trashFolder", "restoreFolder", "purgeFolder",
];

for (let i = 0; i < LOCKED_VERBS.length; i++) {
  const name = LOCKED_VERBS[i];
  const inner = module.exports[name];
  if (typeof inner !== "function") continue;
  module.exports[name] = function (api, bookId) {
    if (isLockedBook(bookId)) {
      const book = PIN.parse(bookId);
      fail("the " + ((book && book.name) || "Codex") + " book is read-only — it is written for you, not in the app");
    }
    return inner.apply(null, arguments);
  };
}

// --- the allow-list fence --- His ruling, 2026-08-26: "When a user tries to edit, create, or delete anything their name is checked against the allow list. js decided when the shelf was opened, never a query per keystroke.
for (let i = 0; i < LOCKED_VERBS.length; i++) {
  const name = LOCKED_VERBS[i];
  const inner = module.exports[name];
  if (typeof inner !== "function") continue;
  module.exports[name] = function () {
    if (AUTHORING <= 0 && !FENCE.mayWrite()) fail(FENCE.refusalLine(FENCE.get().name));
    return inner.apply(null, arguments);
  };
}

module.exports.authoring = authoring;
module.exports.isLockedBook = function (bookId) {
  try {
    return PIN.isLocked(text(bookId));
  } catch (e) {
    return false;
  }
};

// Guard the named exports too: ESM callers and internal calls must not bypass the CJS fence.
export function assertBookMutable(bookId) {
  if (PIN.isLocked(text(bookId)) && (AUTHORING <= 0 || text(bookId) === 'WWSCODE0BOOK')) {
    fail('the ' + (PIN.bookOf(bookId)?.name || 'locked') + ' book is read-only');
  }
}
