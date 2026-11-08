// Literal, book-scoped SQL statement sets. Bind values, never table names. Root parent IDs equal book IDs; schema.js owns DDL. drop() removes one book’s rows, not shared tables.

const IDS = require("lib/ids.js");

// No statement is ever built from this list; project-level tag definitions outlive a book.
const SHARED_TABLES = [
  "folders",
  "cards",
  "pages",
  "sections",
  "card_tags",
  "book_settings",
  "card_stats",
  "card_images",
  "cards_fts",
  "atmo_marks",
  "compile_state",
  "book_rev",
];

// One statement set per book id, built once: the closure holds the bookId, the SQL text is shared.
const CACHE = {};
// A hot-reloaded repository can meet an already-booted shell. Do not rely on its
// old schema latch: the first reader of this new card shape waits for that shape.
let EDITOR_READY=null;
async function ensureEditor(api){
 if(!EDITOR_READY)EDITOR_READY=(async()=>{
   await require("lib/schema.js").widenEditor(api);
   await require("lib/card-editor-upgrade.js").inherit(api);
 })().catch(e=>{EDITOR_READY=null;throw e;});
 return EDITOR_READY;
}


export function makeBook(bookId) {
  const b = bookId;

  function folderChildren(api, folderId) {
    return api.sql`SELECT id, name, folderId, sortKey, collapsed, doc FROM folders
    WHERE bookId = ${b} AND folderId = ${folderId} ORDER BY sortKey`;
  }
  function folderGet(api, id) {
    return api.sql`SELECT id, name, folderId, sortKey, collapsed, doc FROM folders
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function folderInsert(api, id, name, folderId, sortKey) {
    return api.sql`INSERT INTO folders (id, bookId, name, folderId, sortKey)
    VALUES (${id}, ${b}, ${name}, ${folderId}, ${sortKey})`;
  }
  function folderRename(api, id, name) {
    return api.sql`UPDATE folders SET name = ${name} WHERE id = ${id} AND bookId = ${b}`;
  }
  function folderMove(api, id, folderId, sortKey) {
    return api.sql`UPDATE folders SET folderId = ${folderId}, sortKey = ${sortKey}
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function folderSetCollapsed(api, id, collapsed) {
    return api.sql`UPDATE folders SET collapsed = ${collapsed} WHERE id = ${id} AND bookId = ${b}`;
  }
  function folderDelete(api, id) {
    return api.sql`DELETE FROM folders WHERE id = ${id} AND bookId = ${b}`;
  }
  // COMPILE — books.compile one rung down. 1 = this folder and its subtree compile into a
  // whole-book export; 0 = the whole subtree stays out of it.
  function folderSetCompile(api, id, compile) {
    return api.sql`UPDATE folders SET compile = ${compile} WHERE id = ${id} AND bookId = ${b}`;
  }
  function foldersCompile(api) {
    return api.sql`SELECT id, compile FROM folders WHERE bookId = ${b}`;
  }
  // DOC — the folder's designation ('' | 'cinematic' | 'level'), the flag lib/compile.js reads.
  // Unlike `compile` it is MIRRORED by lib/graph.js, so it survives the journal's row rewrite.
  function folderSetDoc(api, id, doc) {
    return api.sql`UPDATE folders SET doc = ${doc} WHERE id = ${id} AND bookId = ${b}`;
  }
  function foldersDoc(api) {
    return api.sql`SELECT id, doc FROM folders WHERE bookId = ${b} AND doc <> ''`;
  }

  // ── COMPILE STATE — what the last Compile press LANDED for one folder ─────────────────────── One row per (book, folder). `manifest` is lib/compile.js's JSON, bound as a VALUE like every other user text here; the rules that read it own no SQL at all (his data-dictionary law).
  function compileStateGet(api, folderId) {
    return api.sql`SELECT folderId, kind, manifest, landedAt, landedBy FROM compile_state
    WHERE bookId = ${b} AND folderId = ${folderId}`;
  }
  function compileStatesAll(api) {
    return api.sql`SELECT folderId, kind, manifest, landedAt, landedBy FROM compile_state
    WHERE bookId = ${b}`;
  }
  function compileStateSet(api, folderId, kind, manifest, landedAt, landedBy) {
    return api.sql`INSERT INTO compile_state (bookId, folderId, kind, manifest, landedAt, landedBy)
    VALUES (${b}, ${folderId}, ${kind}, ${manifest}, ${landedAt}, ${landedBy})
    ON CONFLICT(bookId, folderId) DO UPDATE SET kind = excluded.kind, manifest = excluded.manifest,
      landedAt = excluded.landedAt, landedBy = excluded.landedBy`;
  }
  function compileStateClear(api, folderId) {
    return api.sql`DELETE FROM compile_state WHERE bookId = ${b} AND folderId = ${folderId}`;
  }
  function compileStateDeleteAll(api) {
    return api.sql`DELETE FROM compile_state WHERE bookId = ${b}`;
  }

  // ── CUT B (2026-08-31, "Remove the names of cards from the cards table, keep their ids. name` and never learn where it lives. `folders` KEEP their name column and constraint.
  async function cardsInFolder(api, folderId) {
    await ensureEditor(api);
    return api.sql`SELECT c.id AS id, COALESCE(cn.name, '') AS name, c.folderId AS folderId,
    c.stackId AS stackId, c.sortKey AS sortKey, c.stackOrder AS stackOrder, c.status AS status,
    c.priority AS priority, c.summary AS summary, c.openQuestion AS openQuestion, COALESCE(c.editor, '') AS editor,
    c.duplicatedFrom AS duplicatedFrom, c.createdAt AS createdAt
    FROM cards c LEFT JOIN card_names cn ON cn.cardId = c.id
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} ORDER BY c.sortKey, c.stackOrder`;
  }
  async function cardGet(api, id) {
    await ensureEditor(api);
    return api.sql`SELECT c.id AS id, COALESCE(cn.name, '') AS name, c.folderId AS folderId,
    c.stackId AS stackId, c.sortKey AS sortKey, c.stackOrder AS stackOrder, c.status AS status,
    c.priority AS priority, c.summary AS summary, c.openQuestion AS openQuestion, COALESCE(c.editor, '') AS editor,
    c.duplicatedFrom AS duplicatedFrom, c.createdAt AS createdAt
    FROM cards c LEFT JOIN card_names cn ON cn.cardId = c.id
    WHERE c.id = ${id} AND c.bookId = ${b}`;
  }
  async function cardsAll(api) {
    await ensureEditor(api);
    return api.sql`SELECT c.id AS id, COALESCE(cn.name, '') AS name, c.folderId AS folderId,
    c.stackId AS stackId, c.sortKey AS sortKey, c.stackOrder AS stackOrder, c.status AS status,
    c.priority AS priority, c.summary AS summary, c.openQuestion AS openQuestion, COALESCE(c.editor, '') AS editor,
    c.duplicatedFrom AS duplicatedFrom, c.createdAt AS createdAt
    FROM cards c LEFT JOIN card_names cn ON cn.cardId = c.id
    WHERE c.bookId = ${b} ORDER BY c.sortKey`;
  }
  async function stackMembers(api, stackId) {
    await ensureEditor(api);
    return api.sql`SELECT c.id AS id, COALESCE(cn.name, '') AS name, c.folderId AS folderId,
    c.stackId AS stackId, c.sortKey AS sortKey, c.stackOrder AS stackOrder, c.status AS status,
    c.priority AS priority, c.summary AS summary, c.openQuestion AS openQuestion, COALESCE(c.editor, '') AS editor,
    c.duplicatedFrom AS duplicatedFrom, c.createdAt AS createdAt
    FROM cards c LEFT JOIN card_names cn ON cn.cardId = c.id
    WHERE c.bookId = ${b} AND c.stackId = ${stackId} ORDER BY c.stackOrder`;
  }
  // THE UNIQUENESS GUARD'S EYE. Does a SIBLING in this folder already answer to this name? cards(folderId) JOIN card_names — NEVER through `books` (0 rows in this room by design, a books join silently empties the answer and every name would read free).
  function siblingNamed(api, folderId, name, excludeId) {
    return api.sql`SELECT c.id AS id FROM cards c
    JOIN card_names cn ON cn.cardId = c.id
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} AND cn.name = ${name}
      AND c.id <> ${excludeId} LIMIT 1`;
  }
  // The cards row and its name row in ONE transaction — a nameless cards row is the one shape this
  // cut must never mint (every #[id] pointing at it would render dead).
  function cardInsert(api, id, name, folderId, stackId, sortKey, stackOrder, duplicatedFrom, createdAt, unread, projectId) {
    return api.sql`INSERT INTO cards (id, bookId, folderId, stackId, sortKey, stackOrder, duplicatedFrom, createdAt, unread)
    VALUES (${id}, ${b}, ${folderId}, ${stackId}, ${sortKey}, ${stackOrder}, ${duplicatedFrom}, ${createdAt}, ${unread ? 1 : 0});
    INSERT INTO card_names (cardId, bookId, projectId, name)
      VALUES (${id}, ${b}, ${projectId === undefined || projectId === null ? "" : projectId}, ${name})
      ON CONFLICT(cardId) DO UPDATE SET bookId = excluded.bookId,
        projectId = excluded.projectId, name = excluded.name`;
  }
  // ── THE MINT, IN ONE TRANSACTION (2026-08-30) ─────────────────────────────────────────────── purgeCardRows' mirror on the CREATE side. A create used to be four to six independent calls — cardInsert, cardSetMeta, card_names through refs, then fts + stats from reindex — and any refusal after the first left a card row standing with no name row (every #[id] pointing at it renders dead), no search row (invisible to find) and no stats row. The stats conflict clause leaves `words` alone: only a reindex may write a real count.
  async function cardMintRows(api, id, name, folderId, stackId, sortKey, stackOrder, duplicatedFrom, createdAt, unread, status, priority, summary, openQuestion, projectId, body, editor) {
    await ensureEditor(api);
    return api.sql`INSERT INTO cards
      (id, bookId, folderId, stackId, sortKey, stackOrder, status, priority, summary,
       openQuestion, editor, duplicatedFrom, createdAt, unread)
    VALUES (${id}, ${b}, ${folderId}, ${stackId}, ${sortKey}, ${stackOrder}, ${status},
      ${priority}, ${summary}, ${openQuestion ? 1 : 0}, ${editor || ''}, ${duplicatedFrom}, ${createdAt}, ${unread ? 1 : 0});
    INSERT INTO card_names (cardId, bookId, projectId, name) VALUES (${id}, ${b}, ${projectId}, ${name})
      ON CONFLICT(cardId) DO UPDATE SET bookId = excluded.bookId,
        projectId = excluded.projectId, name = excluded.name;
    INSERT INTO card_stats (cardId, bookId, words) VALUES (${id}, ${b}, 0)
      ON CONFLICT(cardId) DO UPDATE SET bookId = excluded.bookId;
    DELETE FROM cards_fts WHERE cardId = ${id} AND bookId = ${b};
    INSERT INTO cards_fts (cardId, bookId, name, body) VALUES (${id}, ${b}, ${name}, ${body})`;
  }

  // What the mint left behind, one row, scalar subqueries — cardGhosts inverted: 1 everywhere or the
  // create is a lie. Same law, same shape (this SQLite refuses a compound SELECT this wide).
  function cardMinted(api, cardId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM cards WHERE id = ${cardId} AND bookId = ${b}) AS cards,
    (SELECT COUNT(*) FROM card_names WHERE cardId = ${cardId}) AS card_names,
    (SELECT COUNT(*) FROM card_stats WHERE cardId = ${cardId}) AS card_stats,
    (SELECT COUNT(*) FROM cards_fts WHERE cardId = ${cardId}) AS cards_fts`;
  }

  // UNREAD — the dot's whole storage. 1 = minted by a Savi lane and not yet opened; 0 = read, or made by the author's own hand (an author never dots their own card). Same overlay shape compile wears: SQL is the truth, graph.js never learns the column.
  function cardSetRead(api, id) {
    return api.sql`UPDATE cards SET unread = 0 WHERE id = ${id} AND bookId = ${b}`;
  }
  function cardsUnread(api) {
    return api.sql`SELECT id, folderId FROM cards WHERE bookId = ${b} AND unread = 1`;
  }
  // CUT B: a rename writes the PHONEBOOK, never `cards` — the column is gone. Scoped by cardId alone, like purgeCardRows' card_names DELETE: the map is project-wide and a card that moved book is still that card. `changes: 0` means no name row to rename (the nameless-card class).
  function cardRename(api, id, name) {
    return api.sql`UPDATE card_names SET name = ${name} WHERE cardId = ${id}`;
  }
  function cardMove(api, id, folderId, sortKey) {
    return api.sql`UPDATE cards SET folderId = ${folderId}, sortKey = ${sortKey}
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function cardReorderInStack(api, id, stackOrder) {
    return api.sql`UPDATE cards SET stackOrder = ${stackOrder} WHERE id = ${id} AND bookId = ${b}`;
  }
  function stackSetPrimary(api, oldStackId, newStackId) {
    return api.sql`UPDATE cards SET stackId = ${newStackId} WHERE stackId = ${oldStackId} AND bookId = ${b}`;
  }
  async function cardSetMeta(api, id, status, priority, summary, openQuestion, editor) {
    await ensureEditor(api);
    return api.sql`UPDATE cards SET status = ${status}, priority = ${priority}, summary = ${summary},
    openQuestion = ${openQuestion}, editor = COALESCE(${editor === undefined ? null : editor}, editor) WHERE id = ${id} AND bookId = ${b}`;
  }
  function cardSetCompile(api, id, compile) {
    return api.sql`UPDATE cards SET compile = ${compile} WHERE id = ${id} AND bookId = ${b}`;
  }
  function cardsCompile(api) {
    return api.sql`SELECT id, compile FROM cards WHERE bookId = ${b}`;
  }
  // The card's picture row leaves in the SAME statement; `changes` still reports the card row
  // because the DELETE on cards is last.
  function cardDelete(api, id) {
    return api.sql`DELETE FROM book_settings WHERE bookId=${b} AND key='pianoRender:'||${id}; DELETE FROM card_images WHERE cardId = ${id} AND bookId = ${b};
    DELETE FROM cards WHERE id = ${id} AND bookId = ${b}`;
  }
  // ── THE HAND-CASCADE, IN ONE TRANSACTION (2026-08-29) ─────────────────────────────────────── No foreign keys anywhere in this app, so a permanent delete used to walk table by table through six awaits — and any one of them could be refused while the rest landed, which is how 48 orphan card_names, 2 card_stats, an atmo_mark, a page_pen and 6 dead outbound edges outlived their cards.
  function purgeCardRows(api, cardId) {
    return api.sql`DELETE FROM book_settings WHERE bookId=${b} AND key='pianoRender:'||${cardId}; DELETE FROM sections WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM book_settings WHERE bookId=${b} AND key IN (SELECT 'pageEditor:'||id FROM pages WHERE cardId=${cardId} AND bookId=${b}); DELETE FROM pages WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM card_tags WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM card_stats WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM card_images WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM cards_fts WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM atmo_marks WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM page_pen WHERE cardId = ${cardId} AND bookId = ${b};
    DELETE FROM card_names WHERE cardId = ${cardId};
    DELETE FROM cross_book_references WHERE fromId = ${cardId};
    DELETE FROM trash_stack WHERE cardId = ${cardId};
    DELETE FROM trash WHERE entityType = 'card' AND entityId = ${cardId};
    DELETE FROM cards WHERE id = ${cardId} AND bookId = ${b}`;
  }

  // VERIFY-AFTER-DELETE: one round trip, one row per table, n = 0 everywhere or the purge is a lie. Deliberately NOT book-scoped on the global tables (card_names, cross_book_references, trash_stack, trash): a ghost that moved book is still a ghost. ONE ROW, one column per table — scalar subqueries, not a compound SELECT: this SQLite refuses a UNION ALL this wide ("too many terms in compound SELECT").
  function cardGhosts(api, cardId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM cards WHERE id = ${cardId}) AS cards,
    (SELECT COUNT(*) FROM sections WHERE cardId = ${cardId}) AS sections,
    (SELECT COUNT(*) FROM pages WHERE cardId = ${cardId}) AS pages,
    (SELECT COUNT(*) FROM card_tags WHERE cardId = ${cardId}) AS card_tags,
    (SELECT COUNT(*) FROM card_stats WHERE cardId = ${cardId}) AS card_stats,
    (SELECT COUNT(*) FROM card_images WHERE cardId = ${cardId}) AS card_images,
    (SELECT COUNT(*) FROM card_names WHERE cardId = ${cardId}) AS card_names,
    (SELECT COUNT(*) FROM cards_fts WHERE cardId = ${cardId}) AS cards_fts,
    (SELECT COUNT(*) FROM atmo_marks WHERE cardId = ${cardId}) AS atmo_marks,
    (SELECT COUNT(*) FROM page_pen WHERE cardId = ${cardId}) AS page_pen,
    (SELECT COUNT(*) FROM trash WHERE entityId = ${cardId}) AS trash,
    (SELECT COUNT(*) FROM trash_stack WHERE cardId = ${cardId}) AS trash_stack,
    (SELECT COUNT(*) FROM cross_book_references WHERE fromId = ${cardId}) AS refs_out`;
  }

  // The folder's own rows, once its cards have gone through purgeCardRows.
  function purgeFolderRows(api, folderId) {
    return api.sql`DELETE FROM compile_state WHERE folderId = ${folderId} AND bookId = ${b};
    DELETE FROM trash WHERE entityType = 'folder' AND entityId = ${folderId};
    DELETE FROM folders WHERE id = ${folderId} AND bookId = ${b}`;
  }

  function folderGhosts(api, folderId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM folders WHERE id = ${folderId}) AS folders,
    (SELECT COUNT(*) FROM folders WHERE folderId = ${folderId}) AS subfolders,
    (SELECT COUNT(*) FROM cards WHERE folderId = ${folderId}) AS cards,
    (SELECT COUNT(*) FROM compile_state WHERE folderId = ${folderId}) AS compile_state,
    (SELECT COUNT(*) FROM trash WHERE entityId = ${folderId}) AS trash`;
  }

  function stackMove(api, stackId, folderId, sortKey) {
    return api.sql`UPDATE cards SET folderId = ${folderId}, sortKey = ${sortKey}
    WHERE stackId = ${stackId} AND bookId = ${b}`;
  }
  // One card in or out of a stack (a split leaves it as its own stack of one).
  function cardSetStack(api, id, stackId, stackOrder) {
    return api.sql`UPDATE cards SET stackId = ${stackId}, stackOrder = ${stackOrder}
    WHERE id = ${id} AND bookId = ${b}`;
  }

  function pageHeadersForCard(api, cardId) { return api.sql`SELECT id, cardId, sortKey, title, header FROM pages WHERE bookId = ${b} AND cardId = ${cardId} ORDER BY sortKey`; }
  function pagesForCard(api, cardId) {
    return api.sql`SELECT id, cardId, sortKey, title, content, header, footer FROM pages
    WHERE bookId = ${b} AND cardId = ${cardId} ORDER BY sortKey`;
  }
  function pageGet(api, id) {
    return api.sql`SELECT id, cardId, sortKey, title, content, header, footer FROM pages
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function pageInsert(api, id, cardId, sortKey, title) {
    return api.sql`INSERT INTO pages (id, bookId, cardId, sortKey, title)
    VALUES (${id}, ${b}, ${cardId}, ${sortKey}, ${title})`;
  }
  function scorePageSave(api,id,content,rootId,header,oldContent,oldHeader){return api.sql`UPDATE pages SET content = ${content}
    WHERE id = ${id} AND bookId = ${b} AND content = ${oldContent}
    AND EXISTS (SELECT 1 FROM pages h WHERE h.id = ${rootId} AND h.bookId = ${b} AND h.header = ${oldHeader});
    UPDATE pages SET header = ${header} WHERE id = ${rootId} AND bookId = ${b} AND header = ${oldHeader} AND changes() = 1;
    SELECT changes() AS saved`;}
  function pageSetContent(api, id, content) {
    return api.sql`UPDATE pages SET content = ${content} WHERE id = ${id} AND bookId = ${b}`;
  }
  function pageSetChrome(api, id, title, header, footer) {
    return api.sql`UPDATE pages SET title = ${title}, header = ${header}, footer = ${footer}
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function pageReorder(api, id, sortKey) {
    return api.sql`UPDATE pages SET sortKey = ${sortKey} WHERE id = ${id} AND bookId = ${b}`;
  }
  function pageDelete(api, id) {
    return api.sql`DELETE FROM book_settings WHERE bookId=${b} AND key='pageEditor:'||${id}; DELETE FROM pages WHERE id = ${id} AND bookId = ${b}`;
  }
  // THE PAGE'S OWN HAND-CASCADE (2026-08-29). A page owns exactly one other row anywhere: its mood. reindex re-harvests kind='inline' only, so a kind='page' mark whose page is gone is a row nothing can ever reach again. Both leave in ONE transaction, purgeCardRows' law one rung down.
  function purgePageRows(api, pageId) {
    return api.sql`DELETE FROM book_settings WHERE bookId=${b} AND key='pageEditor:'||${pageId}; DELETE FROM atmo_marks WHERE pageId = ${pageId} AND kind = 'page' AND bookId = ${b};
    DELETE FROM pages WHERE id = ${pageId} AND bookId = ${b}`;
  }
  function pageGhosts(api, pageId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM pages WHERE id = ${pageId}) AS pages,
    (SELECT COUNT(*) FROM atmo_marks WHERE pageId = ${pageId}) AS atmo_marks`;
  }
  function pagesDeleteForCard(api, cardId) {
    return api.sql`DELETE FROM book_settings WHERE bookId=${b} AND key IN (SELECT 'pageEditor:'||id FROM pages WHERE cardId=${cardId} AND bookId=${b}); DELETE FROM pages WHERE cardId = ${cardId} AND bookId = ${b}`;
  }

  function sectionsForCard(api, cardId) {
    return api.sql`SELECT id, cardId, name, content, lineLimit, sortKey FROM sections
    WHERE bookId = ${b} AND cardId = ${cardId} ORDER BY sortKey`;
  }
  function sectionGet(api, id) {
    return api.sql`SELECT id, cardId, name, content, lineLimit, sortKey FROM sections
    WHERE id = ${id} AND bookId = ${b}`;
  }
  function sectionInsert(api, id, cardId, name, lineLimit, sortKey) {
    return api.sql`INSERT INTO sections (id, bookId, cardId, name, lineLimit, sortKey)
    VALUES (${id}, ${b}, ${cardId}, ${name}, ${lineLimit}, ${sortKey})`;
  }
  function sectionRename(api, id, name) {
    return api.sql`UPDATE sections SET name = ${name} WHERE id = ${id} AND bookId = ${b}`;
  }
  function sectionSetContent(api, id, content) {
    return api.sql`UPDATE sections SET content = ${content} WHERE id = ${id} AND bookId = ${b}`;
  }
  function sectionReorder(api, id, sortKey) {
    return api.sql`UPDATE sections SET sortKey = ${sortKey} WHERE id = ${id} AND bookId = ${b}`;
  }
  function sectionDelete(api, id) {
    return api.sql`DELETE FROM sections WHERE id = ${id} AND bookId = ${b}`;
  }
  // The section's own hand-cascade, purgePageRows' twin: the mood and the row leave together.
  function purgeSectionRows(api, sectionId) {
    return api.sql`DELETE FROM atmo_marks WHERE sectionId = ${sectionId} AND kind = 'section' AND bookId = ${b};
    DELETE FROM sections WHERE id = ${sectionId} AND bookId = ${b}`;
  }
  function sectionGhosts(api, sectionId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM sections WHERE id = ${sectionId}) AS sections,
    (SELECT COUNT(*) FROM atmo_marks WHERE sectionId = ${sectionId}) AS atmo_marks`;
  }
  function sectionsDeleteForCard(api, cardId) {
    return api.sql`DELETE FROM sections WHERE cardId = ${cardId} AND bookId = ${b}`;
  }

  function tagsForCard(api, cardId) {
    return api.sql`SELECT tagId FROM card_tags WHERE bookId = ${b} AND cardId = ${cardId}`;
  }
  function tagAdd(api, cardId, tagId) {
    return api.sql`INSERT OR IGNORE INTO card_tags (bookId, cardId, tagId)
    VALUES (${b}, ${cardId}, ${tagId})`;
  }
  function tagRemove(api, cardId, tagId) {
    return api.sql`DELETE FROM card_tags WHERE bookId = ${b} AND cardId = ${cardId} AND tagId = ${tagId}`;
  }
  function cardsWithTag(api, tagId) {
    return api.sql`SELECT cardId FROM card_tags WHERE bookId = ${b} AND tagId = ${tagId}`;
  }
  // Permanent delete has no foreign keys behind it: the card's tag rows go by hand, in one shot.
  function tagsDeleteForCard(api, cardId) {
    return api.sql`DELETE FROM card_tags WHERE bookId = ${b} AND cardId = ${cardId}`;
  }

  // SET_STACK_PRIMARY changes a stack id, so every stored #[oldStackId] token is rewritten. The
  // needle is a bound LIKE pattern, never assembled SQL.
  function pagesWithText(api, needle) {
    return api.sql`SELECT id, cardId, sortKey, title, content, header, footer FROM pages
    WHERE bookId = ${b} AND (content LIKE ${needle} OR header LIKE ${needle}
    OR footer LIKE ${needle} OR title LIKE ${needle})`;
  }
  function sectionsWithText(api, needle) {
    return api.sql`SELECT id, cardId, name, content, lineLimit, sortKey FROM sections
    WHERE bookId = ${b} AND content LIKE ${needle}`;
  }
  function cardsWithText(api, needle) {
    return api.sql`SELECT id FROM cards WHERE bookId = ${b} AND summary LIKE ${needle}`;
  }

  // Every one answers a WHOLE FOLDER in one round trip — six questions per listing, not per card.
  function pageCountsInFolder(api, folderId) {
    return api.sql`SELECT p.cardId AS cardId, COUNT(*) AS n FROM pages p
    JOIN cards c ON c.id = p.cardId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} GROUP BY p.cardId`;
  }
  function sectionCountsInFolder(api, folderId) {
    return api.sql`SELECT s.cardId AS cardId, COUNT(*) AS n FROM sections s
    JOIN cards c ON c.id = s.cardId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} GROUP BY s.cardId`;
  }
  function tagCountsInFolder(api, folderId) {
    return api.sql`SELECT ct.cardId AS cardId, COUNT(*) AS n FROM card_tags ct
    JOIN cards c ON c.id = ct.cardId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} GROUP BY ct.cardId`;
  }
  // Inbound mirrors refs.backlinks() exactly — no self-edges, no trashed sources, no sources whose
  // name row is gone.
  function refsOutInFolder(api, folderId) {
    return api.sql`SELECT x.fromId AS cardId, COUNT(*) AS n FROM cross_book_references x
    JOIN cards c ON c.id = x.fromId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} GROUP BY x.fromId`;
  }
  function refsInInFolder(api, folderId) {
    return api.sql`SELECT x.toId AS cardId, COUNT(*) AS n FROM cross_book_references x
    JOIN cards c ON c.id = x.toId
    JOIN card_names cn ON cn.cardId = x.fromId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId} AND x.fromId <> x.toId
    AND NOT EXISTS (SELECT 1 FROM trash tr WHERE tr.entityType = 'card' AND tr.entityId = x.fromId)
    GROUP BY x.toId`;
  }
  function statsWordsInFolder(api, folderId) {
    return api.sql`SELECT s.cardId AS cardId, s.words AS n FROM card_stats s
    JOIN cards c ON c.id = s.cardId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId}`;
  }
  function statsMissingInFolder(api, folderId) {
    return api.sql`SELECT c.id AS cardId FROM cards c
    WHERE c.bookId = ${b} AND c.folderId = ${folderId}
    AND NOT EXISTS (SELECT 1 FROM card_stats s WHERE s.cardId = c.id)`;
  }
  // A page's words are header + body + footer — the union counts the same thing reindex does.
  function textInFolder(api, folderId) {
    return api.sql`SELECT p.cardId AS cardId, p.content AS body FROM pages p
    JOIN cards c ON c.id = p.cardId WHERE c.bookId = ${b} AND c.folderId = ${folderId}
    UNION ALL
    SELECT p2.cardId AS cardId, p2.header AS body FROM pages p2
    JOIN cards c3 ON c3.id = p2.cardId WHERE c3.bookId = ${b} AND c3.folderId = ${folderId}
    UNION ALL
    SELECT p3.cardId AS cardId, p3.footer AS body FROM pages p3
    JOIN cards c4 ON c4.id = p3.cardId WHERE c4.bookId = ${b} AND c4.folderId = ${folderId}
    UNION ALL
    SELECT s.cardId AS cardId, s.content AS body FROM sections s
    JOIN cards c2 ON c2.id = s.cardId WHERE c2.bookId = ${b} AND c2.folderId = ${folderId}`;
  }
  function statsSetWords(api, cardId, words) {
    return api.sql`INSERT INTO card_stats (cardId, bookId, words) VALUES (${cardId}, ${b}, ${words})
    ON CONFLICT(cardId) DO UPDATE SET words = excluded.words, bookId = excluded.bookId`;
  }
  function statsDeleteForCard(api, cardId) {
    return api.sql`DELETE FROM card_stats WHERE cardId = ${cardId} AND bookId = ${b}`;
  }

  // A name once served keeps its first look forever, so a regenerate never edits a url in place —
  //   it writes a HIGHER version and a new filename.
  function imageOf(api, cardId) {
    return api.sql`SELECT cardId, prompt, url, version, updatedAt FROM card_images
    WHERE cardId = ${cardId} AND bookId = ${b}`;
  }
  // A WHOLE FOLDER's thumbnails in ONE statement — one round trip per view, not one per tile.
  function imagesInFolder(api, folderId) {
    return api.sql`SELECT i.cardId AS cardId, i.prompt AS prompt, i.url AS url,
    i.version AS version, i.updatedAt AS updatedAt FROM card_images i
    JOIN cards c ON c.id = i.cardId
    WHERE c.bookId = ${b} AND c.folderId = ${folderId}`;
  }
  function imagesAll(api) {
    return api.sql`SELECT cardId, prompt, url, version, updatedAt FROM card_images
    WHERE bookId = ${b}`;
  }
  function setImage(api, cardId, prompt, url, version, updatedAt) {
    return api.sql`INSERT INTO card_images (cardId, bookId, prompt, url, version, updatedAt)
    VALUES (${cardId}, ${b}, ${prompt}, ${url}, ${version}, ${updatedAt})
    ON CONFLICT(cardId) DO UPDATE SET prompt = excluded.prompt, url = excluded.url,
    version = excluded.version, updatedAt = excluded.updatedAt, bookId = excluded.bookId`;
  }
  function clearImage(api, cardId) {
    return api.sql`DELETE FROM card_images WHERE cardId = ${cardId} AND bookId = ${b}`;
  }
  // The book-wide wipe, for whoever wants it.
  function imagesDeleteAll(api) {
    return api.sql`DELETE FROM card_images WHERE bookId = ${b}`;
  }

  // ── WHAT A DUPLICATE INHERITS BESIDES ITS WORDS (2026-08-29) ──────────────────────────────── copyCardInto copies meta, sections, pages and tags through the ordinary write lane; the two things a card owns that are NOT text used to be dropped on the floor — its moods and its picture. Both ride here, in ONE transaction, two statements: 1 the section/page moods, RE-KEYED through the copy's own id map (`map` is a bound JSON array of {from,to} pairs — the variable part rides as a VALUE, never as SQL text).
  function copyCardExtras(api, srcCardId, newCardId, map, created) {
    return api.sql`INSERT INTO atmo_marks (bookId, cardId, sectionId, pageId, kind, atmo, pos, created)
    SELECT ${b}, ${newCardId},
      CASE WHEN m.kind = 'section'
        THEN (SELECT json_extract(j.value, '$.to') FROM json_each(${map}) j
              WHERE json_extract(j.value, '$.from') = m.sectionId) ELSE '' END,
      CASE WHEN m.kind = 'page'
        THEN (SELECT json_extract(j.value, '$.to') FROM json_each(${map}) j
              WHERE json_extract(j.value, '$.from') = m.pageId) ELSE '' END,
      m.kind, m.atmo, m.pos, ${created}
    FROM atmo_marks m
    WHERE m.bookId = ${b} AND m.cardId = ${srcCardId} AND m.kind IN ('section', 'page')
      AND (SELECT COUNT(*) FROM json_each(${map}) j
           WHERE json_extract(j.value, '$.from') =
             (CASE WHEN m.kind = 'section' THEN m.sectionId ELSE m.pageId END)) = 1;
    INSERT INTO card_images (cardId, bookId, prompt, url, version, updatedAt)
    SELECT ${newCardId}, ${b}, prompt, url, version, ${created}
    FROM card_images WHERE cardId = ${srcCardId} AND bookId = ${b}
    ON CONFLICT(cardId) DO UPDATE SET prompt = excluded.prompt, url = excluded.url,
      version = excluded.version, updatedAt = excluded.updatedAt, bookId = excluded.bookId`;
  }

  // What the duplicate ended up carrying — the receipt copyCardInto reads instead of trusting the
  // write (landed()'s law, one rung down: verify the copy, then journal it).
  function copyGhosts(api, cardId) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM atmo_marks WHERE cardId = ${cardId} AND kind IN ('section', 'page')) AS moods,
    (SELECT COUNT(*) FROM card_images WHERE cardId = ${cardId}) AS card_images,
    (SELECT COUNT(*) FROM card_names WHERE cardId = ${cardId}) AS card_names,
    (SELECT COUNT(*) FROM cards_fts WHERE cardId = ${cardId}) AS cards_fts`;
  }

  function settingGet(api, key) {
    return api.sql`SELECT value FROM book_settings WHERE bookId = ${b} AND key = ${key}`;
  }
  function settingAll(api) {
    return api.sql`SELECT key, value FROM book_settings WHERE bookId = ${b}`;
  }
  function settingSet(api, key, value) {
    return api.sql`INSERT INTO book_settings (bookId, key, value) VALUES (${b}, ${key}, ${value})
    ON CONFLICT(bookId, key) DO UPDATE SET value = excluded.value`;
  }

  // cards_fts columns are (0) cardId, (1) bookId, (2) name, (3) body — the snippet column index is 3.
  function ftsUpsert(api, cardId, name, body) {
    return api.sql`DELETE FROM cards_fts WHERE cardId = ${cardId} AND bookId = ${b};
    INSERT INTO cards_fts (cardId, bookId, name, body) VALUES (${cardId}, ${b}, ${name}, ${body})`;
  }
  function ftsDelete(api, cardId) {
    return api.sql`DELETE FROM cards_fts WHERE cardId = ${cardId} AND bookId = ${b}`;
  }
  function search(api, query, limit) {
    return api.sql`SELECT cardId, name, snippet(cards_fts, 3, '[', ']', '…', 12) AS excerpt,
    bm25(cards_fts) AS rank FROM cards_fts
    WHERE cards_fts MATCH ${query} AND bookId = ${b} ORDER BY rank LIMIT ${limit}`;
  }

  // INSERT OR REPLACE, so a restore cut off mid-walk can be run again from where it stopped.
  function foldersAll(api) {
    return api.sql`SELECT id, name, folderId, sortKey, collapsed, doc FROM folders
    WHERE bookId = ${b} ORDER BY sortKey`;
  }
  function pagesAll(api) {
    return api.sql`SELECT id, cardId, sortKey, title, content, header, footer FROM pages
    WHERE bookId = ${b} ORDER BY cardId, sortKey`;
  }
  function sectionsAll(api) {
    return api.sql`SELECT id, cardId, name, content, lineLimit, sortKey FROM sections
    WHERE bookId = ${b} ORDER BY cardId, sortKey`;
  }
  // THE SKELETON — the same two questions with the words left out: what exists, what it is called, where it sits. lib/graph.js opens a book on these and fetches bodies per card, on first read (pagesForCard / sectionsForCard above), so a book's whole text never rides its opening.
  function pagesSkeleton(api) {
    return api.sql`SELECT id, cardId, sortKey, title FROM pages
    WHERE bookId = ${b} ORDER BY cardId, sortKey`;
  }
  function sectionsSkeleton(api) {
    return api.sql`SELECT id, cardId, name, lineLimit, sortKey FROM sections
    WHERE bookId = ${b} ORDER BY cardId, sortKey`;
  }
  function cardTagsAll(api) {
    return api.sql`SELECT cardId, tagId FROM card_tags WHERE bookId = ${b}`;
  }
  function statsAll(api) {
    return api.sql`SELECT cardId, words FROM card_stats WHERE bookId = ${b}`;
  }

  function foldersDeleteAll(api) {
    return api.sql`DELETE FROM folders WHERE bookId = ${b}`;
  }
  function cardsDeleteAll(api) {
    return api.sql`DELETE FROM cards WHERE bookId = ${b}`;
  }
  function pagesDeleteAll(api) {
    return api.sql`DELETE FROM pages WHERE bookId = ${b}`;
  }
  function sectionsDeleteAll(api) {
    return api.sql`DELETE FROM sections WHERE bookId = ${b}`;
  }
  function cardTagsDeleteAll(api) {
    return api.sql`DELETE FROM card_tags WHERE bookId = ${b}`;
  }
  function statsDeleteAll(api) {
    return api.sql`DELETE FROM card_stats WHERE bookId = ${b}`;
  }
  function settingsDeleteAll(api) {
    return api.sql`DELETE FROM book_settings WHERE bookId = ${b}`;
  }
  function ftsDeleteAll(api) {
    return api.sql`DELETE FROM cards_fts WHERE bookId = ${b}`;
  }

  function folderInsertFull(api, id, name, folderId, sortKey, collapsed, doc) {
    return api.sql`INSERT OR REPLACE INTO folders (id, bookId, name, folderId, sortKey, collapsed, doc)
    VALUES (${id}, ${b}, ${name}, ${folderId}, ${sortKey}, ${collapsed}, ${doc === undefined || doc === null ? "" : doc})`;
  }
  // A full card insert carries no name column. Its caller writes card_names through
  // REFS.onCardRenamed; there is no second name column to drift.
  async function cardInsertFull(api, id, name, folderId, stackId, sortKey, stackOrder, status, priority, summary, openQuestion, duplicatedFrom, createdAt, unread, editor) {
    await ensureEditor(api);
    return api.sql`INSERT OR REPLACE INTO cards
    (id, bookId, folderId, stackId, sortKey, stackOrder, status, priority, summary,
    openQuestion, editor, duplicatedFrom, createdAt, unread)
    VALUES (${id}, ${b}, ${folderId}, ${stackId}, ${sortKey}, ${stackOrder}, ${status}, ${priority}, ${summary}, ${openQuestion}, ${editor || ''}, ${duplicatedFrom}, ${createdAt}, ${unread ? 1 : 0})`;
  }
  function pageInsertFull(api, id, cardId, sortKey, title, content, header, footer) {
    return api.sql`INSERT OR REPLACE INTO pages (id, bookId, cardId, sortKey, title, content, header, footer)
    VALUES (${id}, ${b}, ${cardId}, ${sortKey}, ${title}, ${content}, ${header}, ${footer})`;
  }
  function sectionInsertFull(api, id, cardId, name, content, lineLimit, sortKey) {
    return api.sql`INSERT OR REPLACE INTO sections (id, bookId, cardId, name, content, lineLimit, sortKey)
    VALUES (${id}, ${b}, ${cardId}, ${name}, ${content}, ${lineLimit}, ${sortKey})`;
  }

  // His db-batching law on the write path: ONE call, ONE transaction, eighteen statements. A VARIABLE batch out of a STATIC template — the variable part rides as bound JSON ARRAYS unpacked with json_each, so user text never reaches the SQL text (the digest law). CUT B: the CARDS half of that hazard is gone with the column — the desk never owed a card's name (every rename writes card_names immediately through writeName), and the cards INSERT below carries no name at all.
  async function journalFlush(api, dFolders, dCards, dPages, dSections, dTagCards, dStatCards, dSettingKeys, dImageCards, dFtsCards, uFolders, uCards, uPages, uSections, uTags, uStats, uSettings, uImages, uFts) {
    await ensureEditor(api);
    return api.sql`DELETE FROM cards_fts WHERE bookId = ${b} AND cardId IN (SELECT value FROM json_each(${dFtsCards}));
    DELETE FROM card_images WHERE bookId = ${b} AND cardId IN (SELECT value FROM json_each(${dImageCards}));
    DELETE FROM card_stats WHERE bookId = ${b} AND cardId IN (SELECT value FROM json_each(${dStatCards}));
    DELETE FROM card_tags WHERE bookId = ${b} AND cardId IN (SELECT value FROM json_each(${dTagCards}));
    DELETE FROM book_settings WHERE bookId = ${b} AND key IN (SELECT value FROM json_each(${dSettingKeys}));
    DELETE FROM sections WHERE bookId = ${b} AND id IN (SELECT value FROM json_each(${dSections}));
    DELETE FROM pages WHERE bookId = ${b} AND id IN (SELECT value FROM json_each(${dPages}));
    DELETE FROM cards WHERE bookId = ${b} AND id IN (SELECT value FROM json_each(${dCards}));
    DELETE FROM folders WHERE bookId = ${b} AND id IN (SELECT value FROM json_each(${dFolders}));
    INSERT INTO folders (id, bookId, name, folderId, sortKey, collapsed, compile, doc)
    SELECT json_extract(j.value, '$.id'), ${b}, json_extract(j.value, '$.name'),
    json_extract(j.value, '$.folderId'), json_extract(j.value, '$.sortKey'),
    json_extract(j.value, '$.collapsed'),
    COALESCE(json_extract(j.value, '$.compile'), 1),
    COALESCE(json_extract(j.value, '$.doc'), '') FROM json_each(${uFolders}) j;
    INSERT INTO cards (id, bookId, folderId, stackId, sortKey, stackOrder, status, priority,
    summary, openQuestion, editor, duplicatedFrom, createdAt, compile, unread)
    SELECT json_extract(j.value, '$.id'), ${b},
    json_extract(j.value, '$.folderId'), json_extract(j.value, '$.stackId'),
    json_extract(j.value, '$.sortKey'), json_extract(j.value, '$.stackOrder'),
    json_extract(j.value, '$.status'), json_extract(j.value, '$.priority'),
    json_extract(j.value, '$.summary'), json_extract(j.value, '$.openQuestion'),
    COALESCE(json_extract(j.value, '$.editor'), ''),
    json_extract(j.value, '$.duplicatedFrom'), json_extract(j.value, '$.createdAt'),
    COALESCE(json_extract(j.value, '$.compile'), 1),
    COALESCE(json_extract(j.value, '$.unread'), 0)
    FROM json_each(${uCards}) j;
    INSERT INTO pages (id, bookId, cardId, sortKey, title, content, header, footer)
    SELECT json_extract(j.value, '$.id'), ${b}, json_extract(j.value, '$.cardId'),
    json_extract(j.value, '$.sortKey'), json_extract(j.value, '$.title'),
    json_extract(j.value, '$.content'), json_extract(j.value, '$.header'),
    json_extract(j.value, '$.footer') FROM json_each(${uPages}) j;
    INSERT INTO sections (id, bookId, cardId, name, content, lineLimit, sortKey)
    SELECT json_extract(j.value, '$.id'), ${b}, json_extract(j.value, '$.cardId'),
    json_extract(j.value, '$.name'), json_extract(j.value, '$.content'),
    json_extract(j.value, '$.lineLimit'), json_extract(j.value, '$.sortKey')
    FROM json_each(${uSections}) j;
    INSERT INTO card_tags (bookId, cardId, tagId)
    SELECT ${b}, json_extract(j.value, '$.cardId'), json_extract(j.value, '$.tagId')
    FROM json_each(${uTags}) j;
    INSERT INTO card_stats (cardId, bookId, words)
    SELECT json_extract(j.value, '$.cardId'), ${b}, json_extract(j.value, '$.words')
    FROM json_each(${uStats}) j;
    INSERT INTO book_settings (bookId, key, value)
    SELECT ${b}, json_extract(j.value, '$.key'), json_extract(j.value, '$.value')
    FROM json_each(${uSettings}) j;
    INSERT INTO card_images (cardId, bookId, prompt, url, version, updatedAt)
    SELECT json_extract(j.value, '$.cardId'), ${b}, json_extract(j.value, '$.prompt'),
    json_extract(j.value, '$.url'), json_extract(j.value, '$.version'),
    json_extract(j.value, '$.updatedAt') FROM json_each(${uImages}) j;
    INSERT INTO cards_fts (cardId, bookId, name, body)
    SELECT json_extract(j.value, '$.cardId'), ${b}, json_extract(j.value, '$.name'),
    json_extract(j.value, '$.body') FROM json_each(${uFts}) j`;
  }

  // Opening a book costs no DDL and no round trip; this stays async because every caller awaits it.
  async function ensure(api) {
    return true;
  }

  // ── THE WHOLE-BOOK BURN, IN ONE TRANSACTION (2026-08-29) ──────────────────────────────────── A sweep of this book's rows, not a DROP TABLE — one transaction, the whole book or nothing. CHANGE_LOG GOES TOO — his standing ruling: deleted content must not survive in history payloads.
  async function drop(api) {
    await api.sql`DELETE FROM card_names WHERE bookId = ${b}
      OR cardId IN (SELECT id FROM cards WHERE bookId = ${b});
    DELETE FROM page_pen WHERE bookId = ${b}
      OR cardId IN (SELECT id FROM cards WHERE bookId = ${b});
    DELETE FROM trash_stack WHERE bookId = ${b}
      OR cardId IN (SELECT id FROM cards WHERE bookId = ${b});
    DELETE FROM trash WHERE originalBookId = ${b}
      OR (entityType = 'card' AND entityId IN (SELECT id FROM cards WHERE bookId = ${b}))
      OR (entityType = 'folder' AND entityId IN (SELECT id FROM folders WHERE bookId = ${b}));
    DELETE FROM cross_book_references
      WHERE fromId IN (SELECT id FROM cards WHERE bookId = ${b});
    UPDATE undo_pointer SET seq = 0 WHERE seq <> 0
      AND seq IN (SELECT seq FROM change_log WHERE bookId = ${b});
    DELETE FROM change_log WHERE bookId = ${b};
    DELETE FROM cards_fts WHERE bookId = ${b};
    DELETE FROM atmo_marks WHERE bookId = ${b};
    DELETE FROM card_images WHERE bookId = ${b};
    DELETE FROM card_stats WHERE bookId = ${b};
    DELETE FROM card_tags WHERE bookId = ${b};
    DELETE FROM sections WHERE bookId = ${b};
    DELETE FROM pages WHERE bookId = ${b};
    DELETE FROM cards WHERE bookId = ${b};
    DELETE FROM folders WHERE bookId = ${b};
    DELETE FROM compile_state WHERE bookId = ${b};
    DELETE FROM book_rev WHERE bookId = ${b};
    DELETE FROM book_settings WHERE bookId = ${b}`;
    return true;
  }

  // ── WHAT THE BOOK STILL HOLDS, THE WAY HE SEES IT (2026-08-31) ────────────────────────────── The confirm before a burn reads THIS, not bookGhosts: a soft-deleted folder or card keeps its row, so a raw COUNT(*) would tell him a book he emptied still holds twelve cards.
  function contentCounts(api) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM folders f WHERE f.bookId = ${b}
      AND NOT EXISTS (SELECT 1 FROM trash tr WHERE tr.entityType = 'folder' AND tr.entityId = f.id)) AS folders,
    (SELECT COUNT(*) FROM cards c WHERE c.bookId = ${b}
      AND NOT EXISTS (SELECT 1 FROM trash tr WHERE tr.entityType = 'card' AND tr.entityId = c.id)) AS cards,
    (SELECT COUNT(*) FROM pages WHERE bookId = ${b}) AS pages,
    (SELECT COUNT(*) FROM trash WHERE originalBookId = ${b}) AS trashed`;
  }

  // VERIFY-AFTER-DROP: cardGhosts' shape, one book wide. Zero everywhere or the drop is a lie. `refs_in` is reported but is NOT a ghost — inbound edges are the Deleted Reference rendering, so the caller reads only the other columns. Counted here so a reader never has to ask twice.
  function bookGhosts(api) {
    return api.sql`SELECT
    (SELECT COUNT(*) FROM folders WHERE bookId = ${b}) AS folders,
    (SELECT COUNT(*) FROM cards WHERE bookId = ${b}) AS cards,
    (SELECT COUNT(*) FROM pages WHERE bookId = ${b}) AS pages,
    (SELECT COUNT(*) FROM sections WHERE bookId = ${b}) AS sections,
    (SELECT COUNT(*) FROM card_tags WHERE bookId = ${b}) AS card_tags,
    (SELECT COUNT(*) FROM card_stats WHERE bookId = ${b}) AS card_stats,
    (SELECT COUNT(*) FROM card_images WHERE bookId = ${b}) AS card_images,
    (SELECT COUNT(*) FROM cards_fts WHERE bookId = ${b}) AS cards_fts,
    (SELECT COUNT(*) FROM atmo_marks WHERE bookId = ${b}) AS atmo_marks,
    (SELECT COUNT(*) FROM book_settings WHERE bookId = ${b}) AS book_settings,
    (SELECT COUNT(*) FROM compile_state WHERE bookId = ${b}) AS compile_state,
    (SELECT COUNT(*) FROM book_rev WHERE bookId = ${b}) AS book_rev,
    (SELECT COUNT(*) FROM card_names WHERE bookId = ${b}) AS card_names,
    (SELECT COUNT(*) FROM page_pen WHERE bookId = ${b}) AS page_pen,
    (SELECT COUNT(*) FROM trash_stack WHERE bookId = ${b}) AS trash_stack,
    (SELECT COUNT(*) FROM trash WHERE originalBookId = ${b}) AS trash,
    (SELECT COUNT(*) FROM cross_book_references x JOIN cards c ON c.id = x.fromId
      WHERE c.bookId = ${b}) AS refs_out,
    (SELECT COUNT(*) FROM change_log WHERE bookId = ${b}) AS change_log,
    (SELECT COUNT(*) FROM cross_book_references x2 JOIN cards c2 ON c2.id = x2.toId
      WHERE c2.bookId = ${b}) AS refs_in`;
  }

  return {
    bookId: b,
    ensure: ensure,
    drop: drop,
    contentCounts: contentCounts,
    bookGhosts: bookGhosts,
    copyCardExtras: copyCardExtras,
    copyGhosts: copyGhosts,

    folderChildren: folderChildren,
    folderGet: folderGet,
    folderInsert: folderInsert,
    folderRename: folderRename,
    folderMove: folderMove,
    folderSetCollapsed: folderSetCollapsed,
    folderSetCompile: folderSetCompile,
    foldersCompile: foldersCompile,
    folderSetDoc: folderSetDoc,
    foldersDoc: foldersDoc,
    compileStateGet: compileStateGet,
    compileStatesAll: compileStatesAll,
    compileStateSet: compileStateSet,
    compileStateClear: compileStateClear,
    compileStateDeleteAll: compileStateDeleteAll,
    cardSetCompile: cardSetCompile,
    cardsCompile: cardsCompile,
    cardSetRead: cardSetRead,
    cardsUnread: cardsUnread,
    folderDelete: folderDelete,

    cardsInFolder: cardsInFolder,
    cardGet: cardGet,
    cardsAll: cardsAll,
    stackMembers: stackMembers,
    cardInsert: cardInsert,
    siblingNamed: siblingNamed,
    cardMintRows: cardMintRows,
    cardMinted: cardMinted,
    cardRename: cardRename,
    cardMove: cardMove,
    cardReorderInStack: cardReorderInStack,
    stackSetPrimary: stackSetPrimary,
    cardSetMeta: cardSetMeta,
    cardDelete: cardDelete,
    purgeCardRows: purgeCardRows,
    cardGhosts: cardGhosts,
    purgeFolderRows: purgeFolderRows,
    folderGhosts: folderGhosts,
    stackMove: stackMove,
    cardSetStack: cardSetStack,

    pageHeadersForCard: pageHeadersForCard,
    pagesForCard: pagesForCard,
    pageGet: pageGet,
    pageInsert: pageInsert,
    pageSetContent: pageSetContent,
    scorePageSave: scorePageSave,
    pageSetChrome: pageSetChrome,
    pageReorder: pageReorder,
    pageDelete: pageDelete,
    purgePageRows: purgePageRows,
    pageGhosts: pageGhosts,
    pagesDeleteForCard: pagesDeleteForCard,

    sectionsForCard: sectionsForCard,
    sectionGet: sectionGet,
    sectionInsert: sectionInsert,
    sectionRename: sectionRename,
    sectionSetContent: sectionSetContent,
    sectionReorder: sectionReorder,
    sectionDelete: sectionDelete,
    purgeSectionRows: purgeSectionRows,
    sectionGhosts: sectionGhosts,
    sectionsDeleteForCard: sectionsDeleteForCard,

    tagsForCard: tagsForCard,
    tagAdd: tagAdd,
    tagRemove: tagRemove,
    cardsWithTag: cardsWithTag,
    tagsDeleteForCard: tagsDeleteForCard,

    pagesWithText: pagesWithText,
    sectionsWithText: sectionsWithText,
    cardsWithText: cardsWithText,

    pageCountsInFolder: pageCountsInFolder,
    sectionCountsInFolder: sectionCountsInFolder,
    tagCountsInFolder: tagCountsInFolder,
    refsOutInFolder: refsOutInFolder,
    refsInInFolder: refsInInFolder,
    statsWordsInFolder: statsWordsInFolder,
    statsMissingInFolder: statsMissingInFolder,
    textInFolder: textInFolder,
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

    ftsUpsert: ftsUpsert,
    ftsDelete: ftsDelete,
    search: search,

    foldersAll: foldersAll,
    pagesAll: pagesAll,
    sectionsAll: sectionsAll,
    pagesSkeleton: pagesSkeleton,
    sectionsSkeleton: sectionsSkeleton,
    cardTagsAll: cardTagsAll,
    statsAll: statsAll,

    foldersDeleteAll: foldersDeleteAll,
    cardsDeleteAll: cardsDeleteAll,
    pagesDeleteAll: pagesDeleteAll,
    sectionsDeleteAll: sectionsDeleteAll,
    cardTagsDeleteAll: cardTagsDeleteAll,
    statsDeleteAll: statsDeleteAll,
    settingsDeleteAll: settingsDeleteAll,
    ftsDeleteAll: ftsDeleteAll,

    folderInsertFull: folderInsertFull,
    cardInsertFull: cardInsertFull,
    pageInsertFull: pageInsertFull,
    sectionInsertFull: sectionInsertFull,

    journalFlush: journalFlush,
  };
}

// Does this database's SQLite carry JSON1? The journal's whole batch rides json_each, and a probe
// cannot issue its own SELECT (the digest law), so the answer is read through this saved lane.
export function jsonOk(api) {
  return api.sql`SELECT COUNT(*) AS n FROM json_each('[1,2,3]')`;
}

// The statement set for one book: entry.methodName(api, ...args). His containment law, enforced at the write: NO BOOK NAMED AT ALL is a refusal, thrown — every row statement lives inside makeBook and binds that book's id. A string that is not a book id is still answered with null, deliberately: those callers ask "is this a book?" and read the answer.
export function book(bookId) {
  const id = String(bookId || "");
  if (!id) throw new Error("[store] a card needs a book — refused (no books, no cards)");
  if (!IDS.isValidId(id)) return null;
  if (!CACHE[id]) CACHE[id] = makeBook(id);
  return CACHE[id];
}

// Not a list of books that exist — the shelf owns that (lib/library.js).
export function ids() {
  return Object.keys(CACHE);
}

// `tag_defs`: one row per (projectId, name), plus ONE reserved row named '#STYLE' holding the project's tag presentation as JSON (an author's name may never begin with '#'). PROJECT-LEVEL — no bookId is bound below, and it is deliberately absent from SHARED_TABLES: a book's drop() must never sweep a project's definitions.
export function tagdefsAll(api, projectId) {
  return api.sql`SELECT name, value, note, createdAt, updatedAt FROM tag_defs
    WHERE projectId = ${projectId} ORDER BY name`;
}

// Define, or redefine what a name means. createdAt is written once; a later upsert leaves it alone.
export function tagdefsUpsert(api, projectId, name, value, note, ms) {
  return api.sql`INSERT INTO tag_defs (projectId, name, value, note, createdAt, updatedAt)
    VALUES (${projectId}, ${name}, ${value}, ${note}, ${ms}, ${ms})
    ON CONFLICT(projectId, name) DO UPDATE SET
      value = excluded.value, note = excluded.note, updatedAt = excluded.updatedAt`;
}

// The reserved '#STYLE' row: value only, so a rewrite never disturbs a note.
export function tagdefsStyleSet(api, projectId, name, json, ms) {
  return api.sql`INSERT INTO tag_defs (projectId, name, value, note, createdAt, updatedAt)
    VALUES (${projectId}, ${name}, ${json}, '', ${ms}, ${ms})
    ON CONFLICT(projectId, name) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`;
}

// Two fixed statements, one per editable column — a column name chosen at runtime would be
// assembled SQL, which the digest law forbids.
export function tagdefsSetValue(api, projectId, name, value, ms) {
  return api.sql`UPDATE tag_defs SET value = ${value}, updatedAt = ${ms}
    WHERE projectId = ${projectId} AND name = ${name}`;
}
export function tagdefsSetNote(api, projectId, name, note, ms) {
  return api.sql`UPDATE tag_defs SET note = ${note}, updatedAt = ${ms}
    WHERE projectId = ${projectId} AND name = ${name}`;
}

// A rename is an insert and a delete, never an UPDATE of half a primary key.
export function tagdefsInsert(api, projectId, name, value, note, createdAt, ms) {
  return api.sql`INSERT INTO tag_defs (projectId, name, value, note, createdAt, updatedAt)
    VALUES (${projectId}, ${name}, ${value}, ${note}, ${createdAt}, ${ms})`;
}

export function tagdefsRemove(api, projectId, name) {
  return api.sql`DELETE FROM tag_defs WHERE projectId = ${projectId} AND name = ${name}`;
}

// A tag named after a real card id would SHADOW every #[id] reference to it. Both spellings are
// bound because a definition's name is canonical uppercase and an id is not.
export function tagdefsCardNamed(api, projectId, upper, lower) {
  return api.sql`SELECT name FROM card_names
    WHERE projectId = ${projectId} AND (cardId = ${upper} OR cardId = ${lower})`;
}

// The database's clock, in milliseconds — the sandbox has none of its own.
export function tagdefsNow(api) {
  return api.sql`SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER) AS ms`;
}

// The tag definition repository calls these fixed statements.
const tagdefs = {
  all: tagdefsAll,
  upsert: tagdefsUpsert,
  styleSet: tagdefsStyleSet,
  setValue: tagdefsSetValue,
  setNote: tagdefsSetNote,
  insert: tagdefsInsert,
  remove: tagdefsRemove,
  cardNamed: tagdefsCardNamed,
  now: tagdefsNow,
};

// ═══════════════════════════════════════════════════════════════════════════ ATMOSPHERE MARKS ONE TABLE, `atmo_marks`: where a mood is written down. The column does not care and no statement below tests it: a writing tool never refuses "the bruised violet of a dying storm". Every statement here is a literal tagged template in a saved script, the only kind of SQL a browser seat may run. Everything written on one card, in one index walk — read once per card open, never per section.
export function atmosForCard(api, bookId, cardId) {
  return api.sql`SELECT sectionId, pageId, kind, atmo, pos FROM atmo_marks
    WHERE bookId = ${bookId} AND cardId = ${cardId} ORDER BY kind, pos`;
}

// One book's whole mood index, one read.
export function atmosAllInBook(api, bookId) {
  return api.sql`SELECT cardId, sectionId, pageId, kind, atmo, pos, created FROM atmo_marks
    WHERE bookId = ${bookId} ORDER BY cardId, kind, pos`;
}

// A restore's mood step, ONE card at a time and idempotent: the card's marks leave and the frozen set lands in the same transaction, so a resumed walk that repeats a step cannot double a mark (atmo_marks has no primary key — an INSERT OR REPLACE would not save it). The marks ride as a JSON array, read by json_each exactly the way copyCardExtras re-keys a duplicate's moods — the statement text stays literal, only values are bound.
export function atmosRestoreCard(api, bookId, cardId, marksJson) {
  return api.sql`DELETE FROM atmo_marks WHERE bookId = ${bookId} AND cardId = ${cardId};
    INSERT INTO atmo_marks (bookId, cardId, sectionId, pageId, kind, atmo, pos, created)
    SELECT ${bookId}, ${cardId},
      json_extract(j.value, '$.sectionId'), json_extract(j.value, '$.pageId'),
      json_extract(j.value, '$.kind'), json_extract(j.value, '$.atmo'),
      json_extract(j.value, '$.pos'), json_extract(j.value, '$.created')
    FROM json_each(${marksJson}) j`;
}

// One read per search run, never one per mood.
export function atmosAll(api) {
  return api.sql`SELECT bookId, cardId, sectionId, pageId, kind, atmo, pos FROM atmo_marks
    ORDER BY atmo, pos`;
}

// A section's mood is one row: clearing and setting are the same pair, so an author changing their
// mind never stacks two.
export function atmosClearSection(api, bookId, sectionId) {
  return api.sql`DELETE FROM atmo_marks
    WHERE bookId = ${bookId} AND sectionId = ${sectionId} AND kind = 'section'`;
}

export function atmosClearPage(api, bookId, pageId) {
  return api.sql`DELETE FROM atmo_marks
    WHERE bookId = ${bookId} AND pageId = ${pageId} AND kind = 'page'`;
}

// Every inline row this card owns leaves together — half a card's text would delete the other
// half's marks (the same law lib/refs.js's indexRefs keeps for edges).
export function atmosClearInline(api, bookId, cardId) {
  return api.sql`DELETE FROM atmo_marks
    WHERE bookId = ${bookId} AND cardId = ${cardId} AND kind = 'inline'`;
}

// Every row a card owns, for a purge. No foreign keys anywhere in this app: cascades are written.
export function atmosClearCard(api, bookId, cardId) {
  return api.sql`DELETE FROM atmo_marks WHERE bookId = ${bookId} AND cardId = ${cardId}`;
}

export function atmosInsert(api, bookId, cardId, sectionId, pageId, kind, atmo, pos, created) {
  return api.sql`INSERT INTO atmo_marks (bookId, cardId, sectionId, pageId, kind, atmo, pos, created)
    VALUES (${bookId}, ${cardId}, ${sectionId}, ${pageId}, ${kind}, ${atmo}, ${pos}, ${created})`;
}

// The database's clock, in milliseconds — the sandbox has none of its own.
export function atmosNow(api) {
  return api.sql`SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER) AS ms`;
}

// Written from a repository (lib/atmos.js) exactly the way store.tagdefs is from lib/tagdefs.js.
const atmos = {
  allInBook: atmosAllInBook,
  restoreCard: atmosRestoreCard,
  forCard: atmosForCard,
  all: atmosAll,
  clearSection: atmosClearSection,
  clearPage: atmosClearPage,
  clearInline: atmosClearInline,
  clearCard: atmosClearCard,
  insert: atmosInsert,
  now: atmosNow,
};

// ═══════════════════════════════════════════════════════════════════════════ THE BOOK STAMP ONE TABLE, `book_rev`: one row per book, rev bumped once per user-visible write. touchedAt: the bound ms when the caller has one in hand, else the database's own clock in the same statement - the stamp is ONE statement per write, never a clock read plus a write.
export function bookrevTouch(api, bookId, who, ms) {
  return api.sql`INSERT INTO book_rev (bookId, rev, touchedAt, by)
    VALUES (${bookId}, 1, COALESCE(${ms}, CAST(unixepoch('subsec') * 1000 AS INTEGER)), ${who})
    ON CONFLICT(bookId) DO UPDATE SET rev = book_rev.rev + 1,
      touchedAt = excluded.touchedAt, by = excluded.by
    RETURNING rev`;
}

export function bookrevRead(api, bookId) {
  return api.sql`SELECT rev, by, touchedAt FROM book_rev WHERE bookId = ${bookId}`;
}

// The database's clock, in milliseconds - the sandbox has none of its own.
export function bookrevNow(api) {
  return api.sql`SELECT CAST(unixepoch('subsec') * 1000 AS INTEGER) AS ms`;
}

// Written from a rules leaf (lib/bookrev.js) exactly the way store.atmos is from lib/atmos.js.
const bookrev = {
  touch: bookrevTouch,
  read: bookrevRead,
  now: bookrevNow,
};

module.exports = { SHARED_TABLES, book, ids, tagdefs, atmos, bookrev, jsonOk, soundSnapshot, soundReceipt, soundSave };

// Native sound is ordinary pages + named sections + the existing recovery journal.
// Explicit calls only. No DDL, temporary tables, new repository, or boot migration.
export function soundSnapshot(api,bookId,cardId){return api.sql`SELECT CASE WHEN (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})<=256 AND (SELECT COUNT(*) FROM sections WHERE bookId=${bookId} AND cardId=${cardId})<=256 AND COALESCE((SELECT SUM(length(CAST(content||header||footer AS BLOB))) FROM pages WHERE bookId=${bookId} AND cardId=${cardId}),0)+COALESCE((SELECT SUM(length(CAST(content AS BLOB))) FROM sections WHERE bookId=${bookId} AND cardId=${cardId}),0)<=2097152 THEN json_object('card',json((SELECT json_object('id',c.id,'bookId',c.bookId,'name',COALESCE((SELECT name FROM card_names WHERE cardId=c.id),''),'folderId',c.folderId,'stackId',c.stackId,'sortKey',c.sortKey,'editor',COALESCE(c.editor,''),'summary',COALESCE(c.summary,'')) FROM cards c WHERE c.bookId=${bookId} AND c.id=${cardId})),'pages',json((SELECT json_group_array(json(row)) FROM (SELECT json_object('id',id,'cardId',cardId,'sortKey',sortKey,'title',title,'content',content,'header',header,'footer',footer) AS row FROM pages WHERE bookId=${bookId} AND cardId=${cardId} ORDER BY sortKey,id))),'sections',json((SELECT json_group_array(json(row)) FROM (SELECT json_object('id',id,'cardId',cardId,'name',name,'content',content,'lineLimit',lineLimit,'sortKey',sortKey) AS row FROM sections WHERE bookId=${bookId} AND cardId=${cardId} ORDER BY sortKey,id)))) ELSE NULL END AS snapshot`;}
export function soundReceipt(api,bookId,cardId,id){return api.sql`SELECT id,seq,type,before,after,lamport FROM change_log WHERE bookId=${bookId} AND targetId=${cardId} AND id=${id} AND type='SET_SOUND_DOCUMENT' ORDER BY seq DESC LIMIT 2`;}
export function soundSave(api,bookId,cardId,before,after,pen,receipt,projectId,userId,actor){
 const old=JSON.stringify(before),next=JSON.stringify(after);
 return api.sql`INSERT INTO change_log(id,projectId,userId,actor,type,bookId,targetId,targetType,before,after,undoable,lamport,at)
 SELECT ${receipt},${projectId},${userId},${actor},'SET_SOUND_DOCUMENT',${bookId},${cardId},'card',${old},${next},0,-1,unixepoch()*1000 WHERE EXISTS(SELECT 1 FROM cards c WHERE c.bookId=${bookId} AND c.id=${cardId} AND c.id=json_extract(${old},'$.card.id') AND c.bookId=json_extract(${old},'$.card.bookId') AND COALESCE((SELECT name FROM card_names WHERE cardId=c.id),'')=json_extract(${old},'$.card.name') AND c.folderId=json_extract(${old},'$.card.folderId') AND c.stackId=json_extract(${old},'$.card.stackId') AND c.sortKey=json_extract(${old},'$.card.sortKey') AND COALESCE(c.editor,'')=json_extract(${old},'$.card.editor') AND COALESCE(c.summary,'')=json_extract(${old},'$.card.summary'))
 AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=json_array_length(${old},'$.pages')
 AND NOT EXISTS(SELECT 1 FROM json_each(${old},'$.pages') x WHERE NOT EXISTS(SELECT 1 FROM pages p WHERE p.bookId=${bookId} AND p.cardId=${cardId} AND p.id=json_extract(x.value,'$.id') AND p.cardId=json_extract(x.value,'$.cardId') AND p.sortKey=json_extract(x.value,'$.sortKey') AND p.title=json_extract(x.value,'$.title') AND p.content=json_extract(x.value,'$.content') AND p.header=json_extract(x.value,'$.header') AND p.footer=json_extract(x.value,'$.footer')))
 AND (SELECT COUNT(*) FROM sections WHERE bookId=${bookId} AND cardId=${cardId})=json_array_length(${old},'$.sections')
 AND NOT EXISTS(SELECT 1 FROM json_each(${old},'$.sections') x WHERE NOT EXISTS(SELECT 1 FROM sections p WHERE p.bookId=${bookId} AND p.cardId=${cardId} AND p.id=json_extract(x.value,'$.id') AND p.cardId=json_extract(x.value,'$.cardId') AND p.name=json_extract(x.value,'$.name') AND p.content=json_extract(x.value,'$.content') AND p.lineLimit=json_extract(x.value,'$.lineLimit') AND p.sortKey=json_extract(x.value,'$.sortKey')))
 AND NOT EXISTS(SELECT 1 FROM change_log WHERE id=${receipt})
 AND EXISTS(SELECT 1 FROM page_pen WHERE bookId=${bookId} AND cardId=${cardId} AND holderId=${pen.holder} AND takenAt=${pen.takenAt} AND renewedAt>unixepoch()-45)
 AND NOT EXISTS(SELECT 1 FROM trash WHERE entityId=${cardId})
 AND NOT EXISTS(SELECT 1 FROM json_each(${next},'$.pages') x JOIN pages p ON p.id=json_extract(x.value,'$.id') WHERE p.bookId<>${bookId} OR p.cardId<>${cardId})
 AND NOT EXISTS(SELECT 1 FROM json_each(${next},'$.sections') x JOIN sections p ON p.id=json_extract(x.value,'$.id') WHERE p.bookId<>${bookId} OR p.cardId<>${cardId});
INSERT INTO pages(bookId,id,cardId,sortKey,title,content,header,footer) SELECT ${bookId},json_extract(value,'$.id'),json_extract(value,'$.cardId'),json_extract(value,'$.sortKey'),json_extract(value,'$.title'),json_extract(value,'$.content'),json_extract(value,'$.header'),json_extract(value,'$.footer') FROM json_each(${next},'$.pages') WHERE EXISTS(SELECT 1 FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1 AND before=${old} AND after=${next}) ON CONFLICT(id) DO UPDATE SET sortKey=excluded.sortKey,title=excluded.title,content=excluded.content,header=excluded.header,footer=excluded.footer;
INSERT INTO sections(bookId,id,cardId,name,content,lineLimit,sortKey) SELECT ${bookId},json_extract(value,'$.id'),json_extract(value,'$.cardId'),json_extract(value,'$.name'),json_extract(value,'$.content'),json_extract(value,'$.lineLimit'),json_extract(value,'$.sortKey') FROM json_each(${next},'$.sections') WHERE EXISTS(SELECT 1 FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1 AND before=${old} AND after=${next}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,content=excluded.content,lineLimit=excluded.lineLimit,sortKey=excluded.sortKey;
UPDATE cards SET editor=json_extract(${next},'$.card.editor'),folderId=json_extract(${next},'$.card.folderId') WHERE bookId=${bookId} AND id=${cardId} AND EXISTS(SELECT 1 FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1 AND before=${old} AND after=${next});
UPDATE card_names SET name=json_extract(${next},'$.card.name') WHERE bookId=${bookId} AND cardId=${cardId} AND EXISTS(SELECT 1 FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1 AND before=${old} AND after=${next});
INSERT INTO book_rev(bookId,rev,touchedAt,by) SELECT ${bookId},1,unixepoch()*1000,${userId} WHERE EXISTS(SELECT 1 FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1 AND before=${old} AND after=${next}) ON CONFLICT(bookId) DO UPDATE SET rev=rev+1,touchedAt=excluded.touchedAt,by=excluded.by;
UPDATE change_log SET lamport=CASE WHEN EXISTS(SELECT 1 FROM cards c WHERE c.bookId=${bookId} AND c.id=${cardId} AND c.id=json_extract(${next},'$.card.id') AND c.bookId=json_extract(${next},'$.card.bookId') AND COALESCE((SELECT name FROM card_names WHERE cardId=c.id),'')=json_extract(${next},'$.card.name') AND c.folderId=json_extract(${next},'$.card.folderId') AND c.stackId=json_extract(${next},'$.card.stackId') AND c.sortKey=json_extract(${next},'$.card.sortKey') AND COALESCE(c.editor,'')=json_extract(${next},'$.card.editor') AND COALESCE(c.summary,'')=json_extract(${next},'$.card.summary'))
 AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=json_array_length(${next},'$.pages')
 AND NOT EXISTS(SELECT 1 FROM json_each(${next},'$.pages') x WHERE NOT EXISTS(SELECT 1 FROM pages p WHERE p.bookId=${bookId} AND p.cardId=${cardId} AND p.id=json_extract(x.value,'$.id') AND p.cardId=json_extract(x.value,'$.cardId') AND p.sortKey=json_extract(x.value,'$.sortKey') AND p.title=json_extract(x.value,'$.title') AND p.content=json_extract(x.value,'$.content') AND p.header=json_extract(x.value,'$.header') AND p.footer=json_extract(x.value,'$.footer')))
 AND (SELECT COUNT(*) FROM sections WHERE bookId=${bookId} AND cardId=${cardId})=json_array_length(${next},'$.sections')
 AND NOT EXISTS(SELECT 1 FROM json_each(${next},'$.sections') x WHERE NOT EXISTS(SELECT 1 FROM sections p WHERE p.bookId=${bookId} AND p.cardId=${cardId} AND p.id=json_extract(x.value,'$.id') AND p.cardId=json_extract(x.value,'$.cardId') AND p.name=json_extract(x.value,'$.name') AND p.content=json_extract(x.value,'$.content') AND p.lineLimit=json_extract(x.value,'$.lineLimit') AND p.sortKey=json_extract(x.value,'$.sortKey'))) THEN 0 ELSE json('sound write verification failed') END WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=-1;
SELECT id,seq FROM change_log WHERE id=${receipt} AND type='SET_SOUND_DOCUMENT' AND lamport=0 AND before=${old} AND after=${next}`;
}
