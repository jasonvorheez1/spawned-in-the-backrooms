// LAGSCOPE schema (1.6). A player's machine may not create tables, so the host game creates them at its save:
// the game's scripts/db.js calls this from its migrate():
//   import { migrate as lagscope } from "../mods/lagscope/db.js";
//   export async function migrate(sql) { await lagscope(sql); /* the game's own tables */ }
// 1.5 tried CREATE TABLE from players' machines, which the database refuses: in a game without this, no report ever saved.
export async function migrate(sql) {
  await sql`CREATE TABLE IF NOT EXISTS lagscope_kv (k TEXT PRIMARY KEY, v TEXT)`;
  await sql`CREATE TABLE IF NOT EXISTS lagscope_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER, uid TEXT, name TEXT, lv TEXT, trigger TEXT, score INTEGER, place TEXT, room TEXT, sig TEXT, data TEXT, text TEXT, posted INTEGER DEFAULT 0, savi_at INTEGER)`;
  await sql`CREATE INDEX IF NOT EXISTS lagscope_reports_uid_sig ON lagscope_reports (uid, sig, at)`;
  await sql`CREATE INDEX IF NOT EXISTS lagscope_reports_savi ON lagscope_reports (savi_at, lv)`;
}
