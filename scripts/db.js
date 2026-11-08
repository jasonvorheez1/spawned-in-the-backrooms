// the game's database schema, run at each save
import { migrate as lagscope } from "../mods/lagscope/db.js";
export async function migrate(sql) { await lagscope(sql); }
