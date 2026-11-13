---
name: Favi
description: Favi, Idea Forge's design buddy on the god-mode rail: Forge Files with finalize, a Favi who sees the live game, and reference-image sets for /style.
---

# Favi

Installing puts a **Favi** tab on the god-mode rail. It opens on three doors:

- **Access Forge Files**: a pocket Idea Forge. Import a file by pasting Idea Forge's Plain Data (Finalize → Plain Data → Copy), or start one from a sentence (Idea Forge's 13 starter categories). Tap any field to edit it. **Finalize** makes prompts (Full, Short, Savi build, Code agent), a 5-axis rating, a pitch card and Plain Data, each with copy. Files live at `world.state.favi.forge = { files: { id: { title, pitch, cats: [{ id, name, fields: [{ id, label, value }] }], history, prompts, rating, card } }, order }`. A mod can't read another game's saves, so files come over by paste.
- **Main Favi**: Idea Forge's Favi voice, with a live read of this game on every message (`lib/sight.js`: design.md, the aesthetic file, each place's terrain/hour/object count/tags/ids, players here, the file list, the HUD head, world.state keys, Forge file titles). Chat at `world.state.favi.log`, `llm:chat` conversation `favi:<worldId>:<conv>`.
- **Get Reference Images**: type a style, press find. That writes `refs.pending` and pings Savi; Savi's `/style` command (commands/style.md) finds 10+ openly licensed images, uploads them and saves them to `world.state.favi.refs.styles[key]`. `/style` with the set saved = the images used as uploaded references for the rest of that conversation.

Each editor's screen is `world.state.favi.ui[playerId] = { view, open, edit, final, err }`. Every button sends `favi:<nav|send|clear|forge|refs>` with `{ …, me: playerId }` to `favi.js` on the god rig.

## /favi [ask]
The router (commands/favi.md): Favi's own tools first (chat, Forge files, finalize, build-from-file, reference images, mods), then any installed mod's commands/skills, then a free market mod installed for the job, and only then Savi, whose reply opens "Sorry, Favi can't do that".

## Mod Market
Every mod's full catalog description (`lib/catalog-full.js`) on its detail screen. Opening the market ranks it for the current project (newest Forge file + design.md) with `llm:generate` into `world.state.favi.marketRank = { key, title, scores: { name: { s, why } } }`; it re-ranks when the plan changes or on "re-rank". Unranked, a keyword match against the plan sorts it.

`/favi optimize` makes your game and your mods lighter and faster without changing how they look or play. Add a word to aim it: `/favi loadFaster` (startup), `/favi smoother` (frame rate), `/favi server`, `/favi network`, `/favi phone`, `/favi size`, `/favi mods`, `/favi game`. Stack them: `/favi loadFaster phone mods`. The full table lives in commands/favi.md.

`/favi <command>` runs any installed mod's own command by its id, no prefix: `/favi codex` is `/codex`.

## Where she sits
Favi's panel lifts itself high on the screen (top 56 px, ~half height) so Savi's chat sheet at the bottom never covers her.

## /uninstall
Bare: removes every installed mod except Favi. With words: removes the mods matching the description (names, what they do, "everything but codex"). Names the undo version first; cleans Favi's install records after (commands/uninstall.md).
## /autoremind
Put it in a prompt and Favi holds the task at `world.state.favi.remind`; her brain (lib/remind.js) sends Savi a free notifyDm nudge when Savi has been quiet 2.5 min and it isn't done (3 min between nudges, max 30). commands/autoremind.md has the steps.