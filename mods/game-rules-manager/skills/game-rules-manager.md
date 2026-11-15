---
name: Game Rules Manager
description: The Game Rules Manager mod: a 📜 Game Rules button on the game's HUD (play mode) opening a panel of the creator's build rules in three tabs (all games, only this game, not in this game): reorder, inline edit, export/import .zip, save to rules/*.md. A god-mode tab mirrors it.
---

# Game Rules Manager

What it is: the creator's rules as two plain files in the world, edited from a HUD panel.

- Files: `rules/ALL_GAMES_RULES.md` (rules for every game) and `rules/GAME_RULES.md` (this game). One rule per line: `N. [applied|pending] text`, in priority order.
- Screen: a mod cannot draw on the host's HUD itself. Two doors: (1) the 📜 Game Rules tab on the god-mode rail (mod.json `tab` → `hud.js`), always there; (2) the HUD button, which the install ping asks Savi to wire into the host's ui.js.
- HUD wiring (install): in the host HUD file (world.config `ui.render`, usually scripts/ui.js) add `import { rulesHtml, grm as grmPress, grmType as grmTyped } from "../mods/game-rules-manager/lib/panel.js";`, `export function grm(a, i, s) { grmPress(a, i, s); }`, `export function grmType(i, v) { grmTyped(i, v); }`; append `${rulesHtml(ctx, player)}` after the game's root element in the render; declare `rulesSave: {}` and `rulesLoad: {}` under world.config inputs.actions. Proof: look ui `#grm-btn` answers "📜 Game Rules".
- HUD unwiring (BEFORE remove): take those three lines, the `${rulesHtml(…)}` splice and the two actions back out, then `spawn mod remove game-rules-manager`; a dangling import fails the HUD's compile.
- Behavior: `rules.js` rides the god rig (attach kind god). `rulesLoad` reads both files into `world.state.grm` ({ all: { path, rows }, game: { path, rows }, savedAt }). `rulesSave` (editors only) writes the changed file(s) through `ctx.files.write` (one commit each), updates `world.state.grm` so every open panel refreshes, and calls `notifyDm` to wake Savi.
- Status: a saved row whose text is unchanged keeps its status; new or edited text is `pending`. Savi, woken by the save, syncs her notes to the file's order and text and rewrites the pending rows as `[applied]` — that is what "applied · running" means.
- Judge it: open the panel, move a rule, edit one, save; the file shows the new order with the edited row `[pending]`, then `[applied]` after Savi's sync.

## First install: the ping (HUD first, then the seed)
- One ping, `notifyDmOnce("grm-install")`: step 1 the HUD wiring above (skipped when the host HUD already names game-rules-manager), step 2 the seed (only when both lists are empty).
- On its first `rulesLoad`, `rules.js` creates any missing rule file (headers, no rows) and, when both lists are empty, sets `world.state.grm.seeding = true` and pings this world's Savi once (`notifyDmOnce("grm-seed", …)`). The panel's empty tabs read "⏳ Syncing your rules…" while seeding is on.
- Savi's seed: read her own notes on THIS creator; all-games standing rules → `rules/ALL_GAMES_RULES.md`, this game's rules → `rules/GAME_RULES.md` (`N. [applied] text`, priority order), all-games rules that don't fit this game → `rules/NOT_IN_THIS_GAME.md` (`- exact text`). Then rewrite `world.state.grm` (seeding false) or press `rulesLoad`.
- Export / Import: every tab and the header carry ⬇/⬆; a .zip holds a `.json` and the `.md` files; imports merge (new text only) into the draft and wait for 💾 Save.