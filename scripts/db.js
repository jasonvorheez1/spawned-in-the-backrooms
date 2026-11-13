// the game's database schema, run at each save
import { migrate as lagscope } from "../mods/lagscope/db.js";
export async function migrate(sql) {
  await lagscope(sql);
  // Shelly Nov 13: "store the enemies, weapons, items, objects, meshes etc in the database" for reuse: one row per asset, kind + id keyed
  await sql`CREATE TABLE IF NOT EXISTS assets (kind TEXT NOT NULL, id TEXT NOT NULL, name TEXT, model TEXT, source TEXT, data TEXT, PRIMARY KEY (kind, id))`;
}
