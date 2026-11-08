// The old spelling is an upgrade key, never the active project name.
const PROJECT_ID = "worldwright-studio";
const LEGACY_PROJECT_ID = "codex-builder";
const PROJECT_NAME = "Worldwright Studio";

export async function migrate(api) {
  try {
    await api.sql`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, ordinal INTEGER NOT NULL,
        createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, lastEditor TEXT NOT NULL DEFAULT '');
      INSERT INTO projects (id,name,ordinal,createdAt,updatedAt,lastEditor)
        SELECT ${PROJECT_ID},${PROJECT_NAME},ordinal,createdAt,updatedAt,lastEditor
        FROM projects WHERE id=${LEGACY_PROJECT_ID}
        ON CONFLICT(id) DO NOTHING;
      INSERT INTO projects (id,name,ordinal,createdAt,updatedAt,lastEditor)
        VALUES (${PROJECT_ID},${PROJECT_NAME},1,CAST(unixepoch('subsec')*1000 AS INTEGER),CAST(unixepoch('subsec')*1000 AS INTEGER),'')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name WHERE projects.name<>excluded.name;
      UPDATE books SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE tags SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE trash SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE card_names SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE tag_defs SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE change_log SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE undo_pointer SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      UPDATE trash_stack SET projectId=${PROJECT_ID} WHERE projectId=${LEGACY_PROJECT_ID};
      DELETE FROM projects WHERE id=${LEGACY_PROJECT_ID}`;
  } catch (e) {
    const detail = String(e && e.message || e);
    if (/UNIQUE constraint failed: (undo_pointer|tag_defs)\./.test(detail)) {
      throw new Error("Worldwright's project rename found conflicting histories or tag definitions. The rename was rolled back; neither set was overwritten. " + detail);
    }
    throw e;
  }
  return PROJECT_ID;
}

export async function audit(api) {
  const r = await api.sql`SELECT
    (SELECT COUNT(*) FROM books WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM tags WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM trash WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM card_names WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM tag_defs WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM change_log WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM undo_pointer WHERE projectId=${LEGACY_PROJECT_ID})+
    (SELECT COUNT(*) FROM trash_stack WHERE projectId=${LEGACY_PROJECT_ID}) AS legacyRows,
    (SELECT COUNT(*) FROM cards) AS cards,
    (SELECT COUNT(*) FROM pages) AS pages,
    (SELECT COUNT(*) FROM sections) AS sections,
    (SELECT COUNT(*) FROM change_log) AS history,
    (SELECT COUNT(*) FROM undo_pointer) AS pointers`;
  return r.rows[0];
}
module.exports = { PROJECT_ID, PROJECT_NAME, migrate, audit };
