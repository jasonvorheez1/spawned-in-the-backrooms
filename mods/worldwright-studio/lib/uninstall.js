// uninstall — the door OUT: every table Worldwright Studio ever wrote into a game's database, dropped in one pass, so removing the app leaves the game as clean as it was before it arrived. A NAMED LIST, never a sweep: the engine's own tables (_meta, _backups, _sessions, …) share this database and are never ours to drop.

const CONFIRM = "REMOVE EVERYTHING";

// Every table this app has ever created, in drop order. It is read beside lib/schema.js — schema is the data dictionary, so every name the dictionary defines must appear below, and the names that outlive it (project_settings, shelf_key, timelines, timeline_nodes — struck features whose DDL is gone and whose rows still sit in old rooms) stay too. THIS LIST AND dropAll() BELOW ARE INDEX-ALIGNED: remove() names a failure by TABLES[i], so a name added here is added there at the same spot.
const TABLES = [
  "cards_fts",
  "cards",
  "folders",
  "pages",
  "sections",
  "card_tags",
  "card_stats",
  "card_images",
  "atmo_marks",
  "compile_state",
  "book_rev",
  "card_names",
  "cross_book_references",
  "book_settings",
  "books",
  "projects",
  "project_settings",
  "tags",
  "tag_defs",
  "trash",
  "trash_stack",
  "change_log",
  "undo_pointer",
  "snapshots",
  "snapshot_payloads",
  "snapshot_restores",
  "plugins",
  "plugin_deps",
  "plugin_installs",
  "plugin_data",
  "page_pen",
  "user_prefs",
  "room_defaults",
  "shelf",
  "shelf_access",
  "shelf_key",
  "shelf_grant",
  "shelf_name",
  "timelines",
  "timeline_nodes",
  "fts_probe",
];

export function num(res) {
  const rows = (res && res.rows) || [];
  return rows.length ? Math.max(0, Number(rows[0].n) || 0) : 0;
}

// Four statements run together, his batching rule. A missing table answers 0 instead of throwing, so a half-built room can still be swept.
export async function survey(api) {
  const zero = () => ({ rows: [{ n: 0 }] });
  const [books, cards, pages, images] = await Promise.all([
    api.sql`SELECT COUNT(*) AS n FROM books`.catch(zero),
    api.sql`SELECT COUNT(*) AS n FROM cards`.catch(zero),
    api.sql`SELECT COUNT(*) AS n FROM pages`.catch(zero),
    api.sql`SELECT COUNT(*) AS n FROM card_images`.catch(zero),
  ]);
  return {
    books: num(books),
    cards: num(cards),
    pages: num(pages),
    images: num(images),
    tables: TABLES.length,
    confirm: CONFIRM,
  };
}

// Digest law: one literal DROP per table, nothing assembled from the list above — the list and these statements are read side by side when a table is added.
export function dropAll(api) {
  return [
    api.sql`DROP TABLE IF EXISTS cards_fts`,
    api.sql`DROP TABLE IF EXISTS cards`,
    api.sql`DROP TABLE IF EXISTS folders`,
    api.sql`DROP TABLE IF EXISTS pages`,
    api.sql`DROP TABLE IF EXISTS sections`,
    api.sql`DROP TABLE IF EXISTS card_tags`,
    api.sql`DROP TABLE IF EXISTS card_stats`,
    api.sql`DROP TABLE IF EXISTS card_images`,
    api.sql`DROP TABLE IF EXISTS atmo_marks`,
    api.sql`DROP TABLE IF EXISTS compile_state`,
    api.sql`DROP TABLE IF EXISTS book_rev`,
    api.sql`DROP TABLE IF EXISTS card_names`,
    api.sql`DROP TABLE IF EXISTS cross_book_references`,
    api.sql`DROP TABLE IF EXISTS book_settings`,
    api.sql`DROP TABLE IF EXISTS books`,
    api.sql`DROP TABLE IF EXISTS projects`,
    api.sql`DROP TABLE IF EXISTS project_settings`,
    api.sql`DROP TABLE IF EXISTS tags`,
    api.sql`DROP TABLE IF EXISTS tag_defs`,
    api.sql`DROP TABLE IF EXISTS trash`,
    api.sql`DROP TABLE IF EXISTS trash_stack`,
    api.sql`DROP TABLE IF EXISTS change_log`,
    api.sql`DROP TABLE IF EXISTS undo_pointer`,
    api.sql`DROP TABLE IF EXISTS snapshots`,
    api.sql`DROP TABLE IF EXISTS snapshot_payloads`,
    api.sql`DROP TABLE IF EXISTS snapshot_restores`,
    api.sql`DROP TABLE IF EXISTS plugins`,
    api.sql`DROP TABLE IF EXISTS plugin_deps`,
    api.sql`DROP TABLE IF EXISTS plugin_installs`,
    api.sql`DROP TABLE IF EXISTS plugin_data`,
    api.sql`DROP TABLE IF EXISTS page_pen`,
    api.sql`DROP TABLE IF EXISTS user_prefs`,
    api.sql`DROP TABLE IF EXISTS room_defaults`,
    api.sql`DROP TABLE IF EXISTS shelf`,
    api.sql`DROP TABLE IF EXISTS shelf_access`,
    api.sql`DROP TABLE IF EXISTS shelf_key`,
    api.sql`DROP TABLE IF EXISTS shelf_grant`,
    api.sql`DROP TABLE IF EXISTS shelf_name`,
    api.sql`DROP TABLE IF EXISTS timelines`,
    api.sql`DROP TABLE IF EXISTS timeline_nodes`,
    api.sql`DROP TABLE IF EXISTS fts_probe`,
  ];
}

// Returns { ok, dropped, failed } — a table that refuses to drop is NAMED, never swallowed.
export async function remove(api, confirm) {
  if (String(confirm || "").trim().toUpperCase() !== CONFIRM) {
    return { ok: false, dropped: 0, failed: [], error: "removal needs the words " + CONFIRM };
  }
  const results = await Promise.all(
    dropAll(api).map((p, i) => p.then(() => null).catch((e) => TABLES[i] + ": " + ((e && e.message) || e)))
  );
  const failed = results.filter((r) => r);
  return { ok: failed.length === 0, dropped: results.length - failed.length, failed };
}

module.exports = {
  CONFIRM,
  TABLES,
  survey,
  remove,
};
