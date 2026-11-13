---
name: Slate
description: Slate, the creator's planning tablet. Its data row, its apps, how Savi fills GAME/PLAYERS, adds tickets for the creator, and wires the play-mode pocket.
---

# Slate

The tablet is the mod's god-mode tab (`slate#slate`) and renders `panel.js`. It keeps one shared row, `world.state.plan`, and a little per-player state: `player.state.slate` is the pocket mode ('tab' | 'orb' | 'open') and `player.state.planOpen` is the id of the open ticket.

```js
world.state.plan = {
  tab: 'home'|'board'|'miles'|'cam'|'diary'|'crowd'|'game'|'world'|'selfie',
  cards: [{ id, t, col: 'idea'|'todo'|'doing'|'test'|'done', tag: 'feature'|'bug'|'polish'|'balance'|'lore'|'note'|'community',
            ms /* epic name */, note, accept, by, src /* 'note:<id>' = a player comment */, place, at:{x,y,z}, shot:'/cdn/…', marked, ink }],
  ms:  [{ id, name, goal, rel /* release id */ }],   // epics
  rel: [{ id, name, goal }],                        // releases (MVP, R1…)
  diary: [{ id, date, t, by, shot? }],              // LOOM
  community: [{ by, at, text, replies:[{by,text}], shot? }],   // PLAYERS snapshot
  game: { page, cover, back, inside, share, onShelf, live, editing, publishedAt, headline, blurb, features:[], likes, comments, players, views, at },
  studio: 'NAME ON THE HOME SCREEN', orb: {x,y}, worldBase: { <place>: { hour, fogNear, fogFar, wind } }
}
```

Savi's jobs:
- **GAME:** on "refresh game", run `spawn publish get_press_status` plus `spawn here`, then write `plan.game` (page = the published URL without `/play`).
- **PLAYERS:** on "refresh players", run `spawn comments`, then write `plan.community` and add a `community` card for each new comment (`src:'note:<id>'`, `by:` its handle).
- **Tickets:** push cards straight into `plan.cards` from run_script. A card the creator's "ask Savi" button marked has `asked` set: read those first.
- **WORLD:** before the first slider use, seed `plan.worldBase[<place>]` from the place's atmosphere so "back to saved" has something to return to.
- **Pocket in play mode:** the HUD is the game's own `ui.js`. Add `import {pocket} from '../mods/slate/pocket.js'` (adjust the path to the file's depth) and append `pocket(ctx, player)` to the HTML. It draws only for editors.

## Archive
Content removals go to `world.state.slateArchive`, keyed by archive entry id. Settings → Archive is the shared list for every app. No automatic expiry. Restore uses the original ids and relationships; changed related content is not overwritten. Permanent deletion requires the Archive screen and explicit confirmation. When maintaining content directly, preserve removed items in this archive instead of destroying them. Undo restores recent archived items. This data is world state, not packaged mod content.

## Settings navigation
Environment now lives inside Settings, not a separate Home app. `planTab {tab:'settings',section:'ENVIRONMENT'}` opens it expanded; the Home weather widget uses this. Legacy `tab:'world'` redirects to the same section. World Rules is now Game Rules. Navigation changes no atmosphere or game config values.

## Game icon
`world.state.plan.game.icon` is the game's square app artwork. Generate it like the game's box art, based on that world's style and characters. Store only its asset URL in world state, never bundle consumer art in this mod. Preserve other plan.game metadata. The Game app's request button asks Savi for an icon. About Slate remains last; the mod link is populated only with a verified catalog URL after authorized publication.
## Kiln (its own home-screen app): the creator's workflow library
Kiln is a shelf of workflows Savi follows: **3D assets** (prompt to Blender), **2D assets**, **In-game art**, **Textures**, **Music**, **Sound effects**, **Voices**, plus any the creator writes. **Before making any of those things, pick the workflow that matches the ask and follow it.**
1. A workflow's text: the game's copy at `docs/kiln/<id>.md` if it exists (legacy: `docs/kiln.md` = 3d-assets); otherwise Slate's default at `mods/slate/docs/KILN.md` (3d-assets) or `mods/slate/docs/kiln/<id>.md`. A custom workflow exists only at `docs/kiln/<id>.md`.
2. `world.state.kiln.wf[<id>] = { auto, gates, … }`. `auto !== false`: follow it unasked. `gates !== false`: stop at every bullet starting **Gate** and show the creator before going on.
3. "Make with Savi" arrives as a notifyDm starting `KILN · <workflow>`: the ask, the file, the steps, and a Planner card in Doing to log on.
4. Brief wisps with the steps they cover, quoted from the game's copy. Name the workflow in the say ("running it through Kiln's music workflow").
5. Never rewrite the creator's copy without their ask. A lesson learned on a run is offered to them as an edit.
6. **Engine limits** (`` in the game, else `mods/slate/docs/kiln/ENGINE-LIMITS.md`) is read before any workflow runs; a step that wants past it stops and tells the creator.
7. **Slate log** (`slate-log`) is how Slate gets filled: every "→ Slate log: <stage>" in a workflow, and every landed piece of work, runs it. Gallery items carry `kind` (photo, concept, drawing, reference, render, output) and `asset`. The Gallery reads `plan.shots[]` rows `{ id, url, at, by, kind, asset, title }` plus every Workbench picture. Its last step refreshes `docs/rules.md` (the creator's rules, their words) and `docs/journal.md` (Open / Built / Roadmap, newest state); "sync journal" runs that step alone.
8. **Workbench asset receipts** (`studio/assets/<id>.json`) carry `silhouette { px, gate, views[] }` (the scorer's `--json` writes a view), `values { sheet, pass, note }`, `limits { tex, maps, mats, glbKB, tris, baked, ok, note }`, `placement.look` and `inferred[]`, and each one shows up as its own step on the asset page. Workbench Docs lists docs/, design.md, studio/, art/*/*.md, the design system and every bundled Kiln workflow.
8. "Kiln" is the working name; the creator may rebrand it in the Slate design pass.