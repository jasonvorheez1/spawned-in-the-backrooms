---
name: Tunedb
description: LOAD BEFORE WRITING ANY GAMEPLAY NUMBER in a world where mods/tunedb/ exists. TuneDB is the creator's GUI for tuning — they drag sliders instead of asking Savi. Every speed, force, range, cooldown, count, damage, timer or colour Savi writes goes in scripts/lib/data/<system>.yml with a range comment (Tune tab) or a db/ table (Database tab), never a literal in a script. Also: /tunedb onboarding, /tunedb import, reading tables from code.
---

# TuneDB

## First time in this world? (the "はいはい、そういうことね" minute)

If the creator just installed TuneDB — or you have never run it here — do this once, unasked, the same turn you first notice it:
1. List `scripts/lib/data/*.yml` (not db/). Each is a Tune page already.
2. Grep the game's scripts for hard-coded gameplay numbers that have no data file yet (`const SPEED = 12`, `velocity.y = 9`, `lifetime: 3`, cooldowns, ranges, hp, damage, spawn rates). Skip engine plumbing (tick rates, ids, array indices, 0/1 math).
3. Any number line without a `min..max` comment is a slider on a guessed range. Offer to write the ranges in — the Tune tab shows a **Write slider ranges** button (op `tuneRanges`, one commit), or write better ones yourself: a designer's range per knob beats the guess (0..3× the value).
4. Tell the creator in two or three lines: what is already tunable, and which systems still hide numbers in code ("boss hp and slam radius are in code — want them on sliders?"). Moving code is their yes; listing is free.
5. On yes, run **/tunedb import** below. Values move unchanged — the game plays the same the moment after.

After that, the standing rule below is simply how you write numbers here.

## The standing rule while this mod is installed (read this first)

The creator tunes the game themself in the TuneDB tab instead of asking Savi for every tweak. So **every gameplay number Savi writes — speed, force, range, cooldown, spawn rate, count, radius, damage, timer, colour — goes into a data file, never a literal in a script.** Two homes:

- **Tune tab (🎚️) — `scripts/lib/data/<system>.yml`**, one file per system (`player.yml`, `camera.yml`, `boss.yml`, `spawner.yml`, `gun.yml` …). Plain YAML, nested maps fine. Every such file appears as a page of sliders automatically — no registration.
- **Database tab (🗃️) — `scripts/lib/data/db/<table>.yml`** when there are MANY of a kind (enemies, weapons, items): rows × fields.

Write each Tune line with its comment — it IS the slider:
```yaml
# Boss fight. ボス戦。            <- first comment lines = the page's description
## Phase 1 第1段階                 <- a "## " line starts a section
hp: 800            # 100..5000 step 50 Boss health ボスの体力
slamRadius: 4.5    # 1..12 step 0.5 Ground-slam reach (m) 叩きつけの範囲
enraged: false     # starts angry
color: "#c1121f"   # glow colour     <- a #rrggbb string gets a colour picker
```
- `min..max` and `step N` in the comment set the slider; without them TuneDB guesses (0..3× the value). Give a real range — the range a designer would explore, not the whole number line.
- The rest of the comment is the hint (English, then Japanese is welcome). A full-line comment right above a key works too.
- Lists, `[…]`, `{…}` and block text show read-only; keep knobs as scalars.
- `# tune: off` as a file's first line hides it (notes, art direction).
- Scripts `import X from './lib/data/<system>.yml'` and read `X.key` **where it is used** (in update/onSpawn/on hit), never copied into a const at module top, so a slider move lands on the next tick/spawn.
- The tab edits one line (value only; comment and layout kept) as one commit: "Tune: player.yml walkSpeed = 8".
- Landing a build, name its page in one line: "boss.yml's in the Tune tab — hp, slam radius, enrage time."

The creator balances the game in the **Database** tab (god mode, 🗃️). Savi's job is to make sure the game READS those tables, so every number the creator changes is live without asking her.

## The data contract

- One file per table: `scripts/lib/data/db/<tableId>.yml`. The body is JSON (valid YAML) with `#` header lines.
- Shape: `{ label, labelJa?, order, note?, fields: [{ key, label, labelJa?, type: number|int|text|bool, min?, max?, step?, default? }], rows: { <rowId>: { <fieldKey>: value } } }`.
- Row ids and field keys match `/^[A-Za-z_][A-Za-z0-9_]*$/`. **Row ids are what code references** — keep them stable; the tab warns the creator before a rename.
- The tab writes these files through the god-rig writer (`mods/tunedb/db-writer.js`) as one commit per edit ("Database: setCell enemies.slime.maxHp"). Savi may also edit them by hand — keep the one-row-per-line layout (`serialize` in `lib/db-core.js`).
- Game code imports the file directly — **never a path under mods/tunedb/** (the game must survive the mod's removal):
  ```js
  import ENEMIES from "./lib/data/db/enemies.yml";   // from scripts/
  const e = ENEMIES.rows[self.state.kind];          // { name, maxHp, attack, ... }
  ctx.self.state.hp ??= e.maxHp;
  ```
- Read the row where the number is USED (on spawn, on hit, on buy), not copied into state at build time, so a retune reaches the next spawn / next hit. A value already in a live entity's state (current hp) keeps until it re-spawns — say so when it matters.
- A field the code reads but a row lacks: fall back with `??` to a sane default, never crash.

## /tunedb — a new game (recommended foundation)

1. If `scripts/lib/data/db/` is empty, seed a starter set that fits the game. The empty Database tab offers three (op `{ kind: "seed", preset }`, content from `starterSet(preset)` in `lib/db-core.js`):
   - **rpg** — Rules, Levels, Stats, Enemies, Weapons, Armor, Items, Skills, States, Elements, Traits, loot (Rarities, Loot tables/entries, Prefixes, Suffixes), Party scaling, Achievements, Player data.
   - **action** — Rules (lives, respawn, i-frames, score to win, time limit, combo), Player, Enemies (hp, damage, speed, notice/attack range, cooldown, score, drop), Weapons (damage, fire rate, range, bullet speed, spread, pellets, magazine, reload, knockback), Pickups, Waves.
   - **minimal** — Rules and one blank `things` table.
   Pick the one that fits and say which; the creator can also press it in the tab.
2. Retune the placeholders to THIS game with the creator: rename tables, delete fields that don't apply, add what the design needs (e.g. a racing game: `cars` with topSpeed/accel/grip). One table per kind of thing; one row per thing; one field per tunable number.
3. From then on, every tuned number Savi writes goes into a table, not a literal in a script. Constants that are engine plumbing (tick rates, layer ids) stay in code.
4. Tell the creator in one line which table drives what ("enemies.maxHp is the slime's health — change it in the Database tab and the next slime spawns with it").

## /tunedb import — an existing game

1. Find the tunable literals: grep the game's scripts, templates and place configs for gameplay numbers (hp, damage, speed, cost, cooldown, reward, spawn counts, radii, colours). Group them by the system they belong to.
2. Decide each group's home: one-of-a-kind system (the player, the camera, the boss, the day cycle) → a Tune file `scripts/lib/data/<system>.yml`; many of a kind (enemy types, weapons, items) → a Database table. Propose it in one short list and wait for the creator's OK before moving code.
3. Tune files: write each value with its `# min..max step N hint` comment, then point the script at it — `import BOSS from "./lib/data/boss.yml"` and read `BOSS.hp` where it is used (inside the hook, never cached in a module-top const). Place config numbers (gravity, fog) stay in the place config unless a script reads them.
4. Tables: then change each script to import its table and read the row; keep behavior identical (same values). Existing `scripts/lib/data/*.yml` tuning files may stay as they are if the creator prefers — list them.
5. Verify with one readOnly run_script that imports each file/table and prints its values, and a state read of one entity that uses it.
6. Report: which Tune pages and tables exist now, what each drives, and any number left in code on purpose.

## Judging the result

A creator changes a number in the tab → the game uses it on the next spawn / hit / purchase without Savi. If any tuned number still needs Savi to edit a script, the import is not finished.

## Links (つながりチェック)
A text field can link to rows of other tables: `"ref": ["weapons","armors"]`, optional `"refAllow": ["gold"]` for words that need no row. A value may list several ids separated by commas ("hero, mage"). The panel's 🔗 badge counts broken links (a value naming no row, or a missing target table); click it for the list, click a line to jump there. Link cells suggest the target rows and turn red when broken. Renaming a row ID rewrites every link that named it. Set links in a field's ⋯ → "Links to". Game code can call `checkRefs(tables)` from `lib/db-core.js` for the same list.

## Items, States, Elements
- `items`: kind consumable|material|key, effect heal|mana|cure|damage|buff|none, `addsState` / `curesState` link to states, `usable` battle|field|both|none.
- `states`: duration s, `dot` damage per `tickEvery` s (negative heals), `attackPct/defensePct/speedPct` while active, `noAct`/`noMove`, `maxStacks`, `curedBy` items or hit|rest|death|time. Keep an entity's active states in its state as `{ <stateId>: { until, stacks } }`, read the row each tick it applies.
- `elements`: damage × `strongMult` when the defender's element is in `strongVs`, × `weakMult` when in `weakVs`; optional `state` + `stateChance` on hit. A game with no elements deletes the table and clears the element links.
- Skills and enemies carry `element`; skills carry `state` + `stateChance`.

## Traits, passives, player data, party scaling, achievements
- `traits`: always-on % mods, `resist`/`weak` elements, `immune` states, `onHitState`. Stats and enemies list them in `traits` (comma list); a skill with kind `passive` grants its `passive` trait when learned. Sum every active trait's % onto the base stat.
- `player_data`: the save layout, one row per key. `scope: account` → `player.state.account.<key>` (shared across all a player's characters — swapping characters keeps it); `character` → `player.state.chars[<charId>].<key>`; `session` → not saved. Create missing keys from `default` (JSON text) on join. Build save code from this table, not ad hoc.
- `party_scaling`: pick the row whose `players` matches the nearby player count (clamp to the last row); multiply enemy HP/ATK/spawn count/loot/EXP.
- `achievements`: count events into `player.state.account.counters.<counter>`; when ≥ `target` and not in `account.achievements`, unlock, pay `rewardGold`/`rewardItem`, add `unlocksChar` to `account.unlockedChars`, and show a toast (hidden ones stay `???` until unlocked).

## 💰 Spoins tab
Lists every `world.config.yaml → buyables.<id>`: name, description, priceSpoins, once, its onPurchase script, the buyer's price in $ (and ≈¥), the creator's 50%, and how many players in this room own it (from `player.state.purchases`; not an all-time sales count). Edits go through the writer (`shopSet`) as one commit each. Live players see a price change only after a publish. When you add a buyable, give it a clear name + description — the creator tunes prices here.

## Spreadsheet copy / paste
Grid view has 📋 Copy for sheet (the table as TSV: `id` + field keys) and 📥 Paste from sheet (op `importRows`: header row = `id` + field keys, English or Japanese labels; existing ids update, new ids add; optional "delete rows not in the paste"). Numbers like `1,200`, `¥500`, `15%` and TRUE/○ are accepted.