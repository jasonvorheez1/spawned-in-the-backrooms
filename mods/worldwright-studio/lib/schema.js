// Shared SQL data dictionary. Statements are literal; book IDs are bound values. Row owners perform data repairs. PROJECT_ID is the ordinary project; pinned books use an empty project ID.
const IDENTITY = require("lib/project-identity.js");
const PROJECT_ID = IDENTITY.PROJECT_ID;
const PROJECT_NAME = IDENTITY.PROJECT_NAME;
const STARTUP = require("lib/studio-startup.js");

export async function ensureBuiltinProject(objectApi) {
  await ensureProject(objectApi);
  return PROJECT_ID;
}

// Audit without repairing or deleting unfamiliar project rows; pinned books keep an empty scope.
export async function audit(objectApi) {
  const p = await objectApi.sql`SELECT id, name FROM projects ORDER BY id`;
  const b = await objectApi.sql`SELECT projectId AS pid, COUNT(*) AS n FROM books GROUP BY projectId`;
  const c = await objectApi.sql`SELECT projectId AS pid, COUNT(*) AS n FROM card_names GROUP BY projectId`;
  return {
    projectId: PROJECT_ID,
    projects: ((p && p.rows) || []).map((r) => ({ id: String(r.id || ""), name: String(r.name || "") })),
    books: ((b && b.rows) || []).map((r) => ({ pid: String(r.pid || ""), n: Number(r.n || 0) })),
    cardNames: ((c && c.rows) || []).map((r) => ({ pid: String(r.pid || ""), n: Number(r.n || 0) })),
  };
}

// The probe lane for what the database holds — a run_script cannot issue its own SELECT (digest law).
export async function objects(objectApi) {
  const r = await objectApi.sql`SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name`;
  return ((r && r.rows) || []).map((x) => ({ type: String(x.type || ""), name: String(x.name || ""), sql: String(x.sql || "") }));
}

// The latch lives with the pass, and it is a PROMISE not a boolean: two callers racing the first
// pass must await the same run, or the second is waved past tables that do not exist yet.
export async function ensureProject(objectApi) {
  await once("project", () => ensureProjectPass(objectApi));
  await ensureBooks(objectApi);
  await ensureTrashStack(objectApi);
  return once("project_identity", () => IDENTITY.migrate(objectApi));
}

// The dictionary's one widening lane: a room made before a column existed reaches it here. Every statement is still literal text (the digest law) — table_info answers first, so a room that already carries the column issues no ALTER at all.
export async function widenEditor(api){
 const r=await api.sql`PRAGMA table_info(cards)`;
 if(!r.rows.some(c=>c.name==='editor'))await api.sql`ALTER TABLE cards ADD COLUMN editor TEXT NOT NULL DEFAULT ''`;
}

export async function widenCompile(objectApi) {
  try {
    const f = await objectApi.sql`PRAGMA table_info(folders)`;
    if (!(((f && f.rows) || []).some((r) => String(r.name || "") === "compile"))) {
      await objectApi.sql`ALTER TABLE folders ADD COLUMN compile INTEGER NOT NULL DEFAULT 1`;
    }
    const c = await objectApi.sql`PRAGMA table_info(cards)`;
    if (!(((c && c.rows) || []).some((r) => String(r.name || "") === "compile"))) {
      await objectApi.sql`ALTER TABLE cards ADD COLUMN compile INTEGER NOT NULL DEFAULT 1`;
    }
  } catch (e) {
    objectApi.log("[schema] compile column check: " + ((e && e.message) || e));
    throw e;
  }
}

// The same lane, one column later: `doc` is a folder's DESIGNATION — '' | 'cinematic' | 'level'.
export async function widenDoc(objectApi) {
  try {
    const f = await objectApi.sql`PRAGMA table_info(folders)`;
    if (!(((f && f.rows) || []).some((r) => String(r.name || "") === "doc"))) {
      await objectApi.sql`ALTER TABLE folders ADD COLUMN doc TEXT NOT NULL DEFAULT ''`;
    }
  } catch (e) {
    objectApi.log("[schema] doc column check: " + ((e && e.message) || e));
    throw e;
  }
}

// The same lane, one column later: `unread` is the glowing dot's storage on a card tile. Guarded exactly like compile — table_info answers first, so a room that already carries the column issues no ALTER at all. DEFAULT 0: a card is read unless a Savi lane says otherwise.
export async function widenUnread(objectApi) {
  try {
    const c = await objectApi.sql`PRAGMA table_info(cards)`;
    if (!(((c && c.rows) || []).some((r) => String(r.name || "") === "unread"))) {
      await objectApi.sql`ALTER TABLE cards ADD COLUMN unread INTEGER NOT NULL DEFAULT 0`;
    }
  } catch (e) {
    objectApi.log("[schema] unread column check: " + ((e && e.message) || e));
    throw e;
  }
}

// ── THE CUTS (2026-08-30, his rulings) ─────────────────────────────────────────────────────────── NOT the "no migrations" law's ALTER-at-boot. These are one-time REBUILDS toward the shape the dictionary above already states, guarded by table_info so a room that is already cut issues no statement at all and a fresh room (born with the new CREATE) never runs them. ORDER IS LOAD-BEARING: RENAME carries the old index name with the old table, so the old index is dropped BEFORE the new one is created, or CREATE INDEX IF NOT EXISTS would find the old name, do nothing, and leave the new table unindexed when xrefs_old is dropped.
export async function cutXrefs(objectApi) {
  try {
    const t = await objectApi.sql`PRAGMA table_info(cross_book_references)`;
    const cols = ((t && t.rows) || []).map((r) => String(r.name || ""));
    if (!cols.length || cols.indexOf("fromBookId") === -1) return false;
    await objectApi.sql`ALTER TABLE cross_book_references RENAME TO xrefs_old;
      DROP INDEX IF EXISTS xrefs_by_target;
      CREATE TABLE cross_book_references (
        fromId TEXT NOT NULL,
        toId TEXT NOT NULL,
        PRIMARY KEY (fromId, toId));
      CREATE INDEX xrefs_by_target ON cross_book_references (toId);
      INSERT OR IGNORE INTO cross_book_references (fromId, toId) SELECT fromId, toId FROM xrefs_old;
      DROP TABLE xrefs_old`;
    objectApi.log("[schema] cross_book_references cut to (fromId, toId)");
    return true;
  } catch (e) {
    objectApi.log("[schema] cross_book_references cut: " + ((e && e.message) || e));
    throw e;
  }
}

// name` out, card_names the one home (his ruling, 2026-08-31). cutXrefs' shape exactly: table_info answers first, so a room already cut issues NO statement and a fresh room (born with the new CREATE above) never runs it. ORDER IS LOAD-BEARING (the xref cut's hard lesson): RENAME carries the old index NAMES with the old table, so both card indexes are DROPPED before the new ones are created — otherwise CREATE INDEX IF NOT EXISTS would match the old name, do nothing, and leave the new table unindexed the moment cards_old is dropped.
export async function cutCardNames(objectApi) {
  try {
    const t = await objectApi.sql`PRAGMA table_info(cards)`;
    const cols = ((t && t.rows) || []).map((r) => String(r.name || ""));
    if (!cols.length || cols.indexOf("name") === -1) return false;
    await objectApi.sql`INSERT INTO card_names (cardId, bookId, projectId, name)
      SELECT c.id, c.bookId,
        COALESCE((SELECT cn.projectId FROM card_names cn JOIN cards c2 ON c2.id = cn.cardId
                  WHERE c2.bookId = c.bookId LIMIT 1), ''), c.name
      FROM cards c WHERE c.id NOT IN (SELECT cardId FROM card_names)
      ON CONFLICT(cardId) DO NOTHING;
      ALTER TABLE cards RENAME TO cards_old;
      DROP INDEX IF EXISTS cards_book_parent;
      DROP INDEX IF EXISTS cards_book_stack;
      CREATE TABLE cards (
        id TEXT PRIMARY KEY,
        bookId TEXT NOT NULL,
        folderId TEXT NOT NULL,
        stackId TEXT NOT NULL,
        sortKey TEXT NOT NULL COLLATE BINARY,
        stackOrder TEXT NOT NULL DEFAULT '' COLLATE BINARY,
        status TEXT NOT NULL DEFAULT '',
        priority INTEGER NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '',
        openQuestion INTEGER NOT NULL DEFAULT 0,
      editor TEXT NOT NULL DEFAULT '',
        duplicatedFrom TEXT NOT NULL DEFAULT '',
        createdAt INTEGER NOT NULL DEFAULT 0,
        compile INTEGER NOT NULL DEFAULT 1,
        unread INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX cards_book_parent ON cards (bookId, folderId, sortKey);
      CREATE INDEX cards_book_stack ON cards (bookId, stackId, stackOrder);
      INSERT INTO cards (id, bookId, folderId, stackId, sortKey, stackOrder, status, priority,
        summary, openQuestion, editor, duplicatedFrom, createdAt, compile, unread)
        SELECT id, bookId, folderId, stackId, sortKey, stackOrder, status, priority, summary,
        openQuestion, editor, duplicatedFrom, createdAt, compile, unread FROM cards_old;
      DROP TABLE cards_old`;
    objectApi.log("[schema] cards cut — the name lives in card_names now");
    return true;
  } catch (e) {
    objectApi.log("[schema] cards name cut: " + ((e && e.message) || e));
    throw e;
  }
}

// shelf_key (struck invite lane) and project_settings (struck from the dictionary) carried 0 rows
// and no writer. Their DDL is gone from this file; their DROP stays in lib/uninstall.js so an old
// room's rows still leave with the app.
export async function dropDeadTables(objectApi) {
  try {
    await objectApi.sql`DROP TABLE IF EXISTS shelf_key;
      DROP TABLE IF EXISTS project_settings`;
    return true;
  } catch (e) {
    objectApi.log("[schema] dead-table drop: " + ((e && e.message) || e));
    throw e;
  }
}

// His db-batching law: 43 statements in 5 calls. One tagged call is ONE transaction; semicolons
// split it into ordered statements, so every statement stays literal text here.
export async function ensureProjectPass(objectApi) {
  // tag_defs holds ONE reserved '#STYLE' row (a name may never begin with '#'), and is absent from
  // SHARED_TABLES — a book's drop() must never sweep project definitions.
  await objectApi.sql`CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS tags_by_project ON tags (projectId, name);
    CREATE TABLE IF NOT EXISTS trash (
      entityId TEXT NOT NULL,
      entityType TEXT NOT NULL,
      projectId TEXT NOT NULL,
      originalBookId TEXT NOT NULL DEFAULT '',
      originalFolderId TEXT NOT NULL DEFAULT '',
      trashedAt INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (entityId, entityType)
    );
    CREATE INDEX IF NOT EXISTS trash_by_project ON trash (projectId, trashedAt);
    /* CUT A (his ruling, 2026-08-30: "if we can derive, we should"). An edge is two card ids and
       nothing else. fromBookId / toBookId / projectId were all derivable — a card's book is
       cards.bookId, a card's project is the phonebook's own column — so every reader that used to
       FILTER on them is now a join to cards (or to card_names for the project scope). The old
       (toBookId, toId) index went with the columns; the target index is toId alone. */
    CREATE TABLE IF NOT EXISTS cross_book_references (
      fromId TEXT NOT NULL,
      toId TEXT NOT NULL,
      PRIMARY KEY (fromId, toId)
    );
    CREATE INDEX IF NOT EXISTS xrefs_by_target ON cross_book_references (toId);
    /* card_names — THE PHONEBOOK. bookId and projectId are kept DELIBERATELY: they are this table's
       COVERING COLUMNS, the reason refs.loadMap answers a whole project's id→name map in one indexed
       read and the reason CUT A's readers can scope an edge to a project without walking the books
       table (which carries 0 rows in rooms whose shelf predates it). Not drift — the index. */
    CREATE TABLE IF NOT EXISTS card_names (
      cardId TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS card_names_by_book ON card_names (bookId, name);
    CREATE TABLE IF NOT EXISTS tag_defs (
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (projectId, name)
    )`;

  // change_log is append-only and seq is AUTOINCREMENT — a total order across the room, which is what makes "has anyone touched this since me" one indexed read rather than a clock. Counts are stored, not derived; payloads live apart from the index row; a restore is a RESUMABLE walk keyed (snapshotId, mode), and undo_pointer.seq is the applied/undone waterline.
  await objectApi.sql`CREATE TABLE IF NOT EXISTS change_log (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL DEFAULT '',
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      bookId TEXT NOT NULL DEFAULT '',
      targetId TEXT NOT NULL DEFAULT '',
      targetType TEXT NOT NULL DEFAULT '',
      before TEXT NOT NULL DEFAULT '{}',
      after TEXT NOT NULL DEFAULT '{}',
      undoable INTEGER NOT NULL DEFAULT 1,
      pluginId TEXT NOT NULL DEFAULT '',
      lamport INTEGER NOT NULL DEFAULT 0,
      at INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS change_log_mine ON change_log (userId, projectId, seq);
    CREATE INDEX IF NOT EXISTS change_log_target ON change_log (projectId, targetId, seq);
    DROP TABLE IF EXISTS snapshot_restores;
    DROP TABLE IF EXISTS snapshot_payloads;
    DROP TABLE IF EXISTS snapshots;
    CREATE TABLE IF NOT EXISTS undo_pointer (
      userId TEXT NOT NULL,
      projectId TEXT NOT NULL,
      seq INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (userId, projectId)
    )`;

  // The shared book tables (lib/store.js): keyed by a bookId column, which is what keeps every
  // statement a literal. book_settings is ALSO created by lib/config.js's book scope — both
  // definitions must agree column for column.
  await objectApi.sql`CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      folderId TEXT NOT NULL,
      sortKey TEXT NOT NULL COLLATE BINARY,
      collapsed INTEGER NOT NULL DEFAULT 0,
      compile INTEGER NOT NULL DEFAULT 1,
      doc TEXT NOT NULL DEFAULT '',
      UNIQUE (folderId, name)
    );
    CREATE INDEX IF NOT EXISTS folders_book_parent ON folders (bookId, folderId, sortKey);
    /* CUT B (his ruling, 2026-08-31: "Remove the names of cards from the cards table, keep their
       ids. Then it will earn its keep more."). A card's NAME lives in card_names and nowhere else —
       the phonebook is the one home, and every card read joins it back on (lib/store.js), so the row
       shape the app sees never changed. UNIQUE (folderId, name) went with the column: per-folder
       uniqueness is CODE-ENFORCED in lib/cards.js now (refuseNameClash, which throws SQLite's own
       words so the retry lanes keep their behaviour). FOLDERS KEEP THEIR name COLUMN and their real
       constraint — this cut is about cards only. */
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      folderId TEXT NOT NULL,
      stackId TEXT NOT NULL,
      sortKey TEXT NOT NULL COLLATE BINARY,
      stackOrder TEXT NOT NULL DEFAULT '' COLLATE BINARY,
      status TEXT NOT NULL DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      openQuestion INTEGER NOT NULL DEFAULT 0,
      editor TEXT NOT NULL DEFAULT '',
      duplicatedFrom TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL DEFAULT 0,
      compile INTEGER NOT NULL DEFAULT 1,
      unread INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS cards_book_parent ON cards (bookId, folderId, sortKey);
    CREATE INDEX IF NOT EXISTS cards_book_stack ON cards (bookId, stackId, stackOrder);
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      sortKey TEXT NOT NULL COLLATE BINARY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      header TEXT NOT NULL DEFAULT '',
      footer TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS pages_card ON pages (cardId, sortKey);
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      lineLimit INTEGER NOT NULL DEFAULT 0,
      sortKey TEXT NOT NULL COLLATE BINARY
    );
    CREATE INDEX IF NOT EXISTS sections_card ON sections (cardId, sortKey);
    CREATE TABLE IF NOT EXISTS card_tags (
      bookId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (cardId, tagId)
    );
    CREATE INDEX IF NOT EXISTS card_tags_tag ON card_tags (tagId);
    CREATE TABLE IF NOT EXISTS book_settings (
      bookId TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
      PRIMARY KEY (bookId, key)
    );
    CREATE TABLE IF NOT EXISTS card_stats (
      cardId TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      words INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS atmo_marks (
      bookId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      sectionId TEXT NOT NULL DEFAULT '',
      pageId TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'section',
      atmo TEXT NOT NULL DEFAULT '',
      pos INTEGER NOT NULL DEFAULT 0,
      created INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS atmo_marks_card ON atmo_marks (bookId, cardId, kind, pos);
    CREATE INDEX IF NOT EXISTS atmo_marks_mood ON atmo_marks (atmo);
    /* COMPILE STATE — one row per (book, folder): what the last Compile press actually LANDED,
       as the manifest JSON lib/compile.js writes. It exists so a plan can say what CHANGED instead
       of re-landing the whole folder every press; nothing here is a cache of the prose, which is
       always the source of truth. No row = nothing has ever landed for that folder. */
    CREATE TABLE IF NOT EXISTS compile_state (
      bookId TEXT NOT NULL,
      folderId TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT '',
      manifest TEXT NOT NULL DEFAULT '',
      landedAt INTEGER NOT NULL DEFAULT 0,
      landedBy TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (bookId, folderId)
    );
    /* BOOK STAMP - one row per book: rev bumps once per user-visible write (lib/bookrev.js), so an
       open seat can ask "did anyone else write here" in one statement and reload its cache only
       when the answer is yes. No row = never written through the stamp; reads as rev 0. */
    CREATE TABLE IF NOT EXISTS book_rev (
      bookId TEXT PRIMARY KEY,
      rev INTEGER NOT NULL DEFAULT 0,
      touchedAt INTEGER NOT NULL DEFAULT 0,
      by TEXT NOT NULL DEFAULT ''
    )`;

  // card_images is NOT a column on cards: an ALTER reaches only tables made after it, CREATE TABLE
  //   IF NOT EXISTS reaches every book.
  await objectApi.sql`CREATE TABLE IF NOT EXISTS card_images (
      cardId TEXT PRIMARY KEY,
      bookId TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 0,
      updatedAt INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS card_images_book ON card_images (bookId);
    DROP TABLE IF EXISTS plugin_data;
    DROP TABLE IF EXISTS plugin_deps;
    DROP TABLE IF EXISTS plugin_installs;
    DROP TABLE IF EXISTS plugins`;

  // compile: a folder or card set to N stays out of whole-book exports. CREATE TABLE IF NOT EXISTS never widens a table a room already made, so rooms built before this column get it by ALTER — guarded by table_info so the pass is idempotent and a room that already has the column issues no statement at all.
  await widenCompile(objectApi);

  // UNREAD, the dot on a card tile — same guarded widening, DEFAULT 0.
  await widenUnread(objectApi);
  await widenEditor(objectApi);

  // DOC, a folder's designation ('' | 'cinematic' | 'level') — same guarded widening, DEFAULT ''.
  await widenDoc(objectApi);

  // THE CUTS, last: every table above stands in its stated shape before either one is asked to
  // rebuild or drop. Both are no-ops in a room that has already been cut.
  await cutXrefs(objectApi);
  await cutCardNames(objectApi);
  await require("lib/card-editor-upgrade.js").inherit(objectApi);
  await dropDeadTables(objectApi);

  // Alone in its own call: an fts5 fault must not roll back the batches above. bookId sits between
  // cardId and name, so body is column 3 — lib/store.js's snippet() binds that index.
  await objectApi.sql`CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
    cardId UNINDEXED,
    bookId UNINDEXED,
    name,
    body,
    tokenize = 'unicode61 remove_diacritics 1'
  )`;
}

// ── The rest of the dictionary ─────────────────────────────────────────────────────────────────── schema is the data dictionary These tables used to be created by whichever file happened to write them first. The latch is a PROMISE for the same reason ensureProject's is: two callers racing the first pass must await the same run, or the second is waved past a table that is still being made.

export function once(key, run) { return STARTUP.once(key, run); }
export function retryStartup() { return STARTUP.retry(); }
export function startupRecoverable(error) { return STARTUP.recoverable(error); }
export function startupInfo() { return STARTUP.info(); }

// The entire scratch lifecycle is single-flight, not just CREATE: another probe cannot drop its
// table between INSERT and MATCH. library.js retains every literal published SQL statement.
export function probeFts(objectApi, probe) {
  return once("fts_probe_round", async () => {
    const result = await (probe || require("lib/library.js").ftsProbe)(objectApi);
    if (result && result.fts5) return result;
    const message = String(result?.error || "FTS capability probe did not return a result");
    if (/no such module:\s*fts5\b/i.test(message)) return result;
    const error = Error(message);
    if (STARTUP.recoverable(error)) error.code = "budget_exceeded";
    throw error; // Backpressure/unknown outcomes are not a cached claim that FTS is unavailable.
  });
}

// books — the shelf (lib/library.js). projectId and sortKey are COLUMNS OF THE DEFAULT, not late
// arrivals: no ALTER runs anywhere, so this CREATE is the only place a book's shape is stated.
export function ensureBooks(objectApi) {
  return once(
    "books",
    () => objectApi.sql`CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ordinal INTEGER NOT NULL DEFAULT 0,
      compile INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastEditor TEXT NOT NULL DEFAULT '',
      projectId TEXT NOT NULL DEFAULT '',
      sortKey TEXT NOT NULL DEFAULT ''
    )`
  );
}

// The shelf's own five (lib/shelfaccess.js): a shelf belongs to an AUTHOR, so ownerId keys all of them. shelf and shelf_key are read-only remnants of the struck invite-code lane — kept because rooms still hold their rows, filled by no writer.
export function ensureShelf(objectApi) {
  return once(
    "shelf",
    () => objectApi.sql`
    CREATE TABLE IF NOT EXISTS shelf (
      ownerId TEXT PRIMARY KEY,
      access TEXT NOT NULL,
      updatedAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shelf_access (
      ownerId TEXT NOT NULL,
      listName TEXT NOT NULL,
      name TEXT NOT NULL,
      addedAt INTEGER NOT NULL,
      PRIMARY KEY (ownerId, listName, name));
    CREATE TABLE IF NOT EXISTS shelf_grant (
      ownerId TEXT NOT NULL,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      grantedAt INTEGER NOT NULL,
      PRIMARY KEY (ownerId, userId));
    CREATE TABLE IF NOT EXISTS shelf_name (
      ownerId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      seenAt INTEGER NOT NULL)`
  );
}

// trash_stack — the receipt a stacked card leaves when it goes into the can (lib/trash.js), one row
// per card. The index is what makes "what else was in this stack" one read at restore time.
export function ensureTrashStack(objectApi) {
  return once(
    "trash_stack",
    () => objectApi.sql`CREATE TABLE IF NOT EXISTS trash_stack (
      cardId TEXT PRIMARY KEY,
      bookId TEXT NOT NULL DEFAULT '',
      projectId TEXT NOT NULL DEFAULT '',
      stackId TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'member',
      members TEXT NOT NULL DEFAULT '',
      refs INTEGER NOT NULL DEFAULT 0,
      at INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS trash_stack_by_book ON trash_stack (bookId, stackId)`
  );
}

// The two settings scopes that are not per-book (lib/config.js): user follows the person, room is the cadence everyone in a room shares. The third scope, book_settings, is a shared book table and lives in ensureProject above — config.js calls that one rather than keeping a second copy of the shape.
export function ensureConfig(objectApi) {
  return once(
    "config",
    () => objectApi.sql`CREATE TABLE IF NOT EXISTS user_prefs (
      userId TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
      PRIMARY KEY (userId, key)
    );
    CREATE TABLE IF NOT EXISTS room_defaults (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, setBy TEXT NOT NULL DEFAULT ''
    );
    DELETE FROM room_defaults WHERE key = 'snapshotCap'`
  );
}

// page_pen — THE PEN (lib/pagelock.js): one row per held card, so one seat writes a card's pages at a
// time. (bookId, cardId) is the pen itself; an empty holderId is a pen set down, not a free one.
export function ensurePagePen(objectApi) {
  return once(
    "page_pen",
    () => objectApi.sql`CREATE TABLE IF NOT EXISTS page_pen (
      bookId TEXT NOT NULL,
      cardId TEXT NOT NULL,
      holderId TEXT NOT NULL,
      holderName TEXT NOT NULL DEFAULT '',
      takenAt INTEGER NOT NULL,
      renewedAt INTEGER NOT NULL,
      PRIMARY KEY (bookId, cardId))`
  );
}

// fts_probe — the one SCRATCH table in the dictionary: lib/library.js's ftsProbe() asks a room whether fts5 exists at all, then drops it. probeFts() above serializes and caches the WHOLE lifecycle. This inner CREATE deliberately does not queue again (it already owns the startup turn).
export function ensureFtsProbe(objectApi) {
  return objectApi.sql`CREATE VIRTUAL TABLE IF NOT EXISTS fts_probe USING fts5(body)`;
}

module.exports = {
  PROJECT_ID,
  PROJECT_NAME,
  ensureBuiltinProject,
  ensureProject,
  ensureBooks,
  ensureShelf,
  ensureTrashStack,
  ensureConfig,
  ensurePagePen,
  ensureFtsProbe,
  probeFts,
  retryStartup,
  startupRecoverable,
  startupInfo,
  cutXrefs,
  cutCardNames,
  dropDeadTables,
  audit,
  objects,
};
