---
name: worldwright-asset-shelf
description: "Read Asset Library assets into Worldwright Studio cards using the WWS adapter — current catalog/local loader-shard layout, source resolution, set semantics, card-image boundaries and optional cache evidence. No Stream Vault dependency or partner-data writes."
---

# Worldwright Studio — assets from the shelf

## Read first, no new dependency

Follow directive/routing before writing a card. Asset Library supplies a searchable shelf; WWS files references on its own cards. Presence comes from the installed registry, not a remembered version or a directory that used to exist. This development world was verified on Asset Library 1.7.0 under `mods/asset-library/` on 2026-09-12. Its old `scripts/mods/asset-library/` installation was removed; do not recreate it.

Stream Vault is **not required** to use Asset Library or file a card and is not on WWS's Supported Mods list. If a creator specifically asks about baking/cache readiness, consult its current manifest separately; otherwise leave it alone. A shelf row is evidence that the asset is catalogued, not that a texture, animation, upload or cache bake has completed.

Credit a partner's author from the actual mod listing; never invent a name or import a stale credit. WWS does not install another mod automatically. Missing assets or unsupported types get a named warning, not a generated replacement without consent.

## The WWS-owned reader

Find WWS's root from the manifest. Inside it use `require("lib/assetshelf.js")`; outside use that installation's actual full path. The adapter's exports are:

- `installed(api)` → installed version or an empty string.
- `rows(api)` → merged normalized shelf rows; a missing/unreadable shelf yields `[]`.
- `search(api, query, limit)` → a bounded search of those rows.
- `resolve(api, token)` → matching shelf, project or game asset, direct CDN fallback, or null.
- `slug(value)` → matching normalization, not an asset identifier to invent.

Use the adapter rather than hard-requiring the partner's code, copying its store, or mirroring its whole catalog into WWS SQL. Read once for the task and reuse the result; no per-frame catalog traversal. Query by the actual id or a sufficiently precise name and inspect the returned row before filing.

## Current storage shape

`catalog.js` and `local.js` are loaders, **not necessarily literal arrays of every row**. In 1.7.0 they enumerate shards (`catalog-1.js` onward and `local-1.js` onward). `assetshelf.sources`, `shardFiles`, `rawRows`, `parseRows` and `parseLocal` read the loader and shard text. Do not parse only the loader and conclude the shelf is empty; do not hardcode a fixed number of shards.

Shipped catalog rows merge with this game's local rows/hidden ids or paths. Local rows override shipped rows by id/path. Hidden entries strike shipped content, not the local override. The adapter handles the merge; do not append the two arrays yourself and create duplicates.

Rows carry actual identifiers, names, kind, path, tags, clips and optional metadata. Sets carry `members` and bounds; `set:<slug>` is a structured set reference, **not a GLB URL**. Keep member offsets, behavior/state and props when compiling a set through its adapter. Project pins and authored sets have their own Asset Library storage; read the installed version's contract, not an old schema copied into this skill.

## File the result on a card

Use `#[asset: …]` with the resolved reference and the current token grammar in `worldwright-assets`. A character uses its existing Body section; locations/items use their own appropriate card. Preserve model query suffixes for real clips/parts. Do not strip a query from the only URL that names the intended animation.

Read existing cards/sections first. Update a relevant existing section rather than making duplicate asset cards. Characters' paths and supporting Research belong under that character's Research folder or on a path card directly within it. Keep source provenance and intended use concise; a whole raw shelf dump is not research.

A card illustration and a staged body are different things. Inspect `lib/cardimage.js` and the card-image action before changing illustration generation or URLs; its prompt/version rules do not make an asset row into a model or render a set automatically. Never invent a generated image, cooked animation, baked manifest entry or file behind a virtual set path.

## Pull-only boundary

This integration never regenerates catalog/local/crate files, writes Asset Library tables, mutates a vault manifest, invokes a bake, wraps a partner's UI, or requires its private runtime. A user explicitly asking to edit the Asset Library itself is a different task under that mod's supported controls.

Proof: compare a known catalog/shard row and a local override through `rows`; resolve the intended item, inspect the stored card reference, then inspect the placement if this task compiles it. An empty return can mean missing/unreadable data, not an empty collection. A successful card save is not proof the asset rendered or baked.


### Permanent specialist books · 2026-09-14
Fixed shelf order: Codex (`CODEX0000BOOK`), Research (`RESEARCH0BOOK`), Music (`0MUSIC00BOOK0`), Asset Studio (`ASSET00STUDIO`). They cannot move, rename or be removed; only Codex is read-only inside. Research contains prose reference material, not source media. File piano scores, recordings, instrument samples and SFX in Music. File models, poses, sets, images, materials and textures in Asset Studio. Prose can reference specialist cards by their unchanged IDs. Read Codex and Research constraints first, then the relevant specialist source. Never regenerate or duplicate a card merely because its containing book changed.

## Asset Studio's private shelf browser · 2026-09-14

The Asset Studio source bar has an **Asset Library** button; there is no category or duplicate existing-model dropdown. The editor chooses its source group from `lib/data/workbench.yml`: Pose → rigged models, Model → models/rigged models, Object Set → model/set sources, Texture → images. Material controls have **Browse textures**, which selects images without switching editor mode. Unsupported captured sets remain explicitly unavailable; the Path editor retains its existing path import. `lib/workbench-shelf.js` supplies bounded pages through the existing `assetWorkbench` action (`op: shelf`, current local `mode`); `lib/workbench-shelf-client.js` owns query, group, paging and open state. A mode change resets the search/page; stale replies from another group cannot repaint the browser. The selector blocks background touch and editor shortcuts while open; Close or Escape restores the controls. Opening or refreshing changes no document, viewer source or undo history. The installed catalog/local merge is searched within the relevant group; only one 24-row page rides UI state. Cache identity compares complete source text, so same-length edits refresh correctly.

Use exact CDN GLB paths (including animation queries) in Model/Pose/Object set mode. Images open in 2D/texture, or apply to the selected **mesh** in a 3D editor. Nothing is placed in the world. Structured set references, procedural props/effects and motion recipes are labeled unavailable rather than misread as GLBs; audio belongs in Sound studio. Native GLB bytes retain their clips; the editor's keyed preview remains its own authored timeline.

This is a **soft link**, not a dependency. Missing/uninstalled Asset Library gives a readable browser notice; direct CDN references, local components, drafts, Undo/Redo, Save and Export remain independent. WWS reads source text, never imports the partner runtime or edits its catalog/tables. Only the creator's explicit install request authorizes installation. No second catalog or generated asset replaces a missing source.

Maintenance: the browser realm is bundled from `workbench-client.js` and `workbench-shelf-client.js`, then calls `boot(CONFIG)`. Do not minify the entry alone and leave an import inside its inline realm. The viewer bundle is separate and unchanged by this shelf reader.

Long library references remain **exact** on ordinary physical pages: `workbench-paper.js` supplies an optional `wws-asset-json/1` continuation envelope when the legacy pretty JSON is too wide. Always use `workbench-data.read(pages)` to recover an asset document, not a direct `JSON.parse` of its pages. Short legacy documents are unchanged. The encoded text is not a shortened URL, regenerated file or new shelf; guarded saves verify the exact decoded document.