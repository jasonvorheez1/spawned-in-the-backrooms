// The Test Range's Loot Lab (Shelly #224714/#224725, Nov 12): set your level, pick a loot pool, roll the leveled list onto a board,
// drop a test crate or three fresh corpses and search them. Searching gates weapons by YOUR level (interact.js gateItems), same as the maze.
import { rollItem, rollItemL1, rollItemL2, rollItemL5, rollLoot, gateItems, spawnCrate } from "./loot.js";
import W, { rarityIdx, rarityCap, baseOf } from "./weapons.js";
import { describe } from "./items.js";

export const POOLS = ["l0", "l1", "l2", "l3", "l4", "l5", "l7"];
const POOL_NAME = { l0: "Level 0", l1: "Level 1", l2: "Level 2", l3: "Level 3", l4: "Level 4", l5: "Level 5", l7: "Level 7" };
const ROLL = { l1: rollItemL1, l2: rollItemL2, l5: rollItemL5 };
const RAR = ["common", "uncommon", "rare", "elite", "legendary"], RCOL = ["#cfcfc4", "#7fd38a", "#6fa8ff", "#e0a0ff", "#ffd36a"];
const N = 60; // rolls per board (my pick)
const X0 = 4.5, Z0 = -2; // the lab's centre
const esc = (t) => String(t).replace(/[<>&'"]/g, "");
const nameOf = (t) => { try { return describe(t)?.name ?? t; } catch { return t; } };

function board(level, pool, rolls) {
  const cap = rarityCap(level), weps = rolls.filter((t) => t.startsWith("weapon:"));
  const byRar = [0, 0, 0, 0, 0]; for (const t of weps) byRar[rarityIdx(t.slice(7))]++;
  const tally = {}; for (const t of rolls) { const k = t.startsWith("cash:") ? "cash" : t.startsWith("weapon:") ? "weapon:" + baseOf(t.slice(7)) : t.split(":")[0] === "book" ? "book" : t.startsWith("cloth:") ? "cloth" : t; tally[k] = (tally[k] ?? 0) + 1; }
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 14);
  const line = (k, n, i) => { const y = 150 + i * 30, w = Math.round((n / N) * 420), r = k.startsWith("weapon:") ? rarityIdx(k.slice(7)) : -1;
    return `<text x='30' y='${y}' font-family='sans-serif' font-size='21' fill='${r >= 0 ? RCOL[r] : "#e9e2c4"}'>${esc(k === "cash" ? "Cash" : k === "cloth" ? "Clothing" : k === "book" ? "Book" : nameOf(k.startsWith("weapon:") ? k : k))}</text><rect x='330' y='${y - 17}' width='${w}' height='18' fill='${r >= 0 ? RCOL[r] : "#e8c25a"}' opacity='0.8'/><text x='${340 + w}' y='${y}' font-family='sans-serif' font-size='19' fill='#bdb6a0'>${n}</text>`; };
  const rar = RAR.map((r, i) => `<text x='${30 + i * 160}' y='620' font-family='sans-serif' font-size='22' fill='${RCOL[i]}' opacity='${i <= cap ? 1 : 0.35}'>${r} ${byRar[i]}${i > cap ? " (locked)" : ""}</text>`).join("");
  return `<svg viewBox='0 0 840 660' width='4.2m' billboard='yaw'><rect width='840' height='660' rx='10' fill='#14161a' opacity='0.92'/><rect x='8' y='8' width='824' height='644' rx='7' fill='none' stroke='#e8c25a' stroke-width='3'/>`
    + `<text x='30' y='60' font-family='display' font-size='38' fill='#f3d27a'>LEVELED LIST · ${POOL_NAME[pool]}</text>`
    + `<text x='30' y='100' font-family='sans-serif' font-size='23' fill='#e9e2c4'>${rolls.length ? `player level ${level} · weapon cap: ${RAR[cap]} · ${N} rolls, gated` : "step on ROLL LIST to roll this pool"}</text>`
    + rows.map(([k, n], i) => line(k, n, i)).join("") + `<text x='30' y='590' font-family='sans-serif' font-size='20' fill='#9a937e'>weapons by rarity</text>` + rar + `</svg>`;
}

export function labBuild(ctx, pad, sign) {
  const s = ctx.place.state; s.lootPool ??= "l0";
  ctx.spawn("tl-lab-stripe", { feetPosition: { x: X0, y: 0.003, z: Z0 + 1 }, primitive: { kind: "box", width: 8.6, height: 0.004, depth: 9 }, material: { color: "oklch(0.3 0.03 80)", roughness: 0.9 }, castShadow: false });
  ctx.spawn("tl-lab-sign", { feetPosition: { x: X0, y: 5.1, z: Z0 - 6.2 }, vector: sign("LOOT LAB", 3.2) });
  pad(ctx, "tl-pad-lab-lv1", "lv1", "LEVEL 1", 1.5, -3, "oklch(0.7 0.14 250)");
  pad(ctx, "tl-pad-lab-lv3", "lv3", "LEVEL 3", 3.5, -3, "oklch(0.7 0.14 250)");
  pad(ctx, "tl-pad-lab-lv6", "lv6", "LEVEL 6", 5.5, -3, "oklch(0.7 0.14 250)");
  pad(ctx, "tl-pad-lab-lv10", "lv10", "LEVEL 10", 7.5, -3, "oklch(0.7 0.14 250)");
  pad(ctx, "tl-pad-lab-pool", "pool", "NEXT POOL", 1.5, 0.5, "oklch(0.78 0.15 80)");
  pad(ctx, "tl-pad-lab-roll", "roll", "ROLL LIST", 3.5, 0.5, "oklch(0.78 0.15 80)");
  pad(ctx, "tl-pad-lab-crate", "crate", "TEST CRATE", 5.5, 0.5, "oklch(0.72 0.12 55)");
  pad(ctx, "tl-pad-lab-corpse", "corpse", "3 CORPSES", 7.5, 0.5, "oklch(0.6 0.2 25)");
  labBoard(ctx, 1, s.lootPool, []);
}
const labBoard = (ctx, level, pool, rolls) => ctx.spawn("tl-lab-board", { feetPosition: { x: X0, y: 3.0, z: Z0 - 6 }, vector: board(level, pool, rolls), castShadow: false });

// wants are written by the pads (scripts/debug-pad.js) as the stepping player's level
export function labTick(ctx) {
  const s = ctx.place.state;
  if (s.want_pool != null) { const lv = s.want_pool; s.want_pool = null; s.lootPool = POOLS[(POOLS.indexOf(s.lootPool ?? "l0") + 1) % POOLS.length]; labBoard(ctx, lv, s.lootPool, []); }
  if (s.want_roll != null) { const lv = s.want_roll, pool = s.lootPool ?? "l0"; s.want_roll = null;
    const raw = Array.from({ length: N }, () => (ROLL[pool] ?? ((c) => rollItem(c, pool)))(ctx));
    labBoard(ctx, lv, pool, gateItems(ctx, raw.join(","), lv, pool).split(",").filter(Boolean)); }
  if (s.want_crate != null) { s.want_crate = null;
    for (const c of ctx.query({ tags: ["crate"], center: { x: 5.5, y: 0, z: 4 }, radius: 2.5 })) ctx.destroy(c.id);
    spawnCrate(ctx, { x: 5.5, z: 4 }, s.lootPool ?? "l0"); }
  if (s.want_corpse != null) { s.want_corpse = null; const pool = s.lootPool ?? "l0";
    for (const c of ctx.query({ tags: ["remains"], center: { x: 2.5, y: 0, z: 4 }, radius: 3 })) ctx.destroy(c.id);
    [["Smiler remains", "smiler", 1], ["Lurker remains", "lurker", 2.5], ["Dropped bag", "sack", 4]].forEach(([name, kind, x]) => {
      let items = rollLoot(ctx, 2, 1, pool); if (!items.length) items = ["almond"]; // luck 2 so a test body is rarely empty (my pick)
      ctx.spawn({ tags: ["container", "remains", "tl-lab"], feetPosition: { x: x - 0.5, y: 0.02, z: 4 }, rotation: ctx.random() * 360, lifetime: 900, castShadow: false, primitive: { kind: "scripted", script: "scripts/loot-geo.js", params: { kind } }, state: { name, items: items.join(",") } });
    }); }
}
