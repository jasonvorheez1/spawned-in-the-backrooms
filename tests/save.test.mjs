// save round-trip checks (Shelly Nov 13 save brief): node tests/save.test.mjs
import { claimReward } from "../scripts/lib/quests.js";
import { migrate, SAVE_V, canSaveHere } from "../scripts/lib/save.js";
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL", m); } else console.log("ok  ", m); };
const rt = (s) => JSON.parse(JSON.stringify(s)); // what Spawn stores and hands back
let s = { cents: 0 };
ok(claimReward(s, "q1") === true, "first claim pays");
s = rt(s); ok(claimReward(s, "q1") === false, "claim after reload refused");
ok(claimReward({ qdone: { q2: {} } }, "q2") === false, "a quest finished before this fix never pays again");
const old = { level: 7, xp: 1234, cents: 999, quests: { a: {} }, savePlace: "tutorial0-abc", savePos: { x: 1, y: 0, z: 2 } };
const ctx = { log() {}, world: { places: {} } };
ok(migrate(ctx, old) === 1 && old.saveV === SAVE_V, "v1 save migrates to v" + SAVE_V);
ok(old.level === 7 && old.xp === 1234 && old.cents === 999 && old.quests.a, "migration keeps progress");
ok(old.savePlace === null, "tutorial copy is dropped as a wake place");
ok(migrate(ctx, old) === null, "second migrate is a no-op");
ok(!canSaveHere("intake") && !canSaveHere("tutorial0-x") && canSaveHere("level5"), "only real levels hold a resume point");
process.exit(fail ? 1 : 0);
