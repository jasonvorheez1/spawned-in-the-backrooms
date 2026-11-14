// the game's database schema, run at each save
import { migrate as lagscope } from "../mods/lagscope/db.js";
export async function migrate(sql) {
  await lagscope(sql);
  // Shelly Nov 13: "store the enemies, weapons, items, objects, meshes etc in the database" for reuse: one row per asset, kind + id keyed
  await sql`CREATE TABLE IF NOT EXISTS assets (kind TEXT NOT NULL, id TEXT NOT NULL, name TEXT, model TEXT, source TEXT, data TEXT, PRIMARY KEY (kind, id))`;
  // the title screen's save manager (Shelly Nov 14): five named slots per player, the whole player.state as JSON
  await sql`CREATE TABLE IF NOT EXISTS saves (owner TEXT NOT NULL, slot INTEGER NOT NULL, name TEXT, place TEXT, level INTEGER, at TEXT, data TEXT, PRIMARY KEY (owner, slot))`;
}
