---
name: worldwright-assets
description: "How to point a Worldwright Studio card at an asset — the #[asset:<id>] token for the Asset Library mod's shelf (read-only, per-user), the #[ token picker, what the chip says when the mod or the row is missing, and how a plain /cdn/ path rides a card's Body line into a shot."
---

# Pointing a card at an asset

A card can name a thing that exists outside the book — a model, an image, a sound. There are two
ways, and they are for different things.

**This file OWNS the codex-native asset/reference lane** — the `#[asset:…]` token, its chip states,
the `#[` picker, where tokens live, and the `## Body` path line. Any other skill that touches the
token defers here by name rather than restating it. The partner-mod PULL recipes — reading the Asset
Library shelf through `lib/assetshelf.js`, checking Stream Vault's bake manifest, which section a
shelf row lands in on an item / location / character card — are **`worldwright-asset-shelf`**, and
the law those pulls run under is `worldwright-mods` §6 (pull-only).

## 1. `#[asset:<id>]` — a row on the Asset Library shelf

The **asset-library** mod keeps a per-user shelf of assets. Worldwright Studio reads it and never writes
it (jace, 2026-08-25: *"No merging, just support"*): no row of theirs is ours to change, no table
mirrors it, and Worldwright Studio never installs the mod for anybody.

Write the token where the prose mentions the thing:

```
The stall in the north corner is #[asset:market-stall].
```

- **It is its own kind of token, not a card edge.** `lib/refs.js` owns it (`isAssetToken`), and
  `referencedIds` skips it — so an asset token never shows up in a dangling-reference report and a
  card rename never rewrites it.
- **It renders as a chip** — thumbnail or per-kind glyph, name, kind — with three honest states:
  **live** (the row is there), **missing** (mod installed, nothing resolves: "not on the shelf"),
  **nomod** (mod absent: "Asset Library mod not installed"). A missing asset is never a silent hole.
- **The stored form is the id.** The picker commits ids; a hand-typed `#[asset:market-stall]` also
  resolves by exact name or slug, so "Market Stall" answers.
- **Where tokens live:** page text (rendered as chips) and section content (stored text, indexed by
  search — sections are edit surfaces and do not draw chips).

**The picker.** Type `#[` in any wired box and the type-ahead opens: `#[asset` or `#[asset:` lists
the shelf, `#[asset:lan` ranks names ("Lantern" is a prefix hit), and a plain `#[lan` ranks asset
names alongside cards — prefix beats substring, and the assets group sits last because the book comes
first. The Search window shows a shelf group beside card hits.

**When the mod is not installed**, every one of these lanes goes quiet: no shelf group, no asset
rows in the picker, and existing tokens draw the "nomod" chip. Nothing throws. Tell the creator the
mod is a separate install from the Spawn mod library — Worldwright Studio will not do it for them.

## 2. A plain path — `/cdn/...` on a card's Body line

An asset a card wants to STAND UP in a scene does not need the shelf at all. The card's `## Body`
section takes a path directly, and that is what the shoot lane spawns:

```
## Body
model /cdn/moodboard-lowpoly-cozy/model-market-stall.glb   scale 1.2   pose Idle
```

Define the thing once on its own card, reference that card from every scene that uses it, and a
change to the Body line re-dresses every scene next time it is shot. The Body grammar, the other body
kinds (primitive, `light`, `none`) and the set/camera tokens are `worldwright-cards` §4.

A Body line may also name a shelf asset by bare word — it resolves through the same read-only shelf
door and falls back to nothing (a grey stand-in, warned) when the mod is absent.

## 3. Which one

| The thing is… | Use |
|---|---|
| on the author's Asset Library shelf, and the card is *talking about* it | `#[asset:<id>]` in the prose |
| something the card must PUT IN THE WORLD when the scene is shot | a `## Body` line with the path |
| a thing with its own card (a character, a prop with lore) | reference the card: `#[<cardId>]` — its Body line does the standing-up |

---

### Maintainer notes — codex-builder dev tree only

Nothing below concerns a game that merely has Worldwright Studio installed.

- **The one door is `lib/assetshelf.js`** — exports `MOD_ID`, `CATALOG`, `installed(objectApi)`
  (version string, `""` when absent), `rows(objectApi)`, `search(objectApi, q, limit)` (ranked, with
  a `why` field: name > tag > kind > note > file), `resolve(objectApi, token)`, `slug(v)`. It parses
  the mod's generated catalog (`mods/asset-library/lib/catalog.js`) out of TEXT via `getScript` —
  never `require()` — so a missing mod is a quiet empty shelf, never a throw. Zero SQL; the cache key
  is derived from the catalog text, so it moves exactly when the shelf moves.
- Row shape (the mod's, passed through): `{ id, name, path, kind: "model"|"image"|"sound"|
  "animation"|"set", tags, clips, note, thumb }`.
- Picker internals: the candidate bag is `{ version, tags, cards, assets, shelfCount, shots, atmos }`,
  built in app-shell's `refCandidatesFor` from `ASSETSHELF.rows`; its cache key carries a
  shelf-content stamp because `refs.indexVersion` never moves for the shelf. Wired boxes are page
  zones, the meta pane's section boxes and the card modal's section boxes; boxes that are not page
  zones wear `data-sbrp-free="1"`. The `#sb-qpick` lane stays cards-only by design.
- THE WHOLE SHELF RIDES (2026-09-01, jace: "it cuts off and only shows a to b"): `assets` is no
  longer a 200-row alphabetical slice but `{ <kind>: "id\tname\ttags\n…" }` — every row, grouped by
  kind (`ASSET_CAP` = 4000 is a runaway guard, not a cut). The shelf's "effect" rows tagged
  `scripted-geometry` (its fx: props) are regrouped under a display kind `prop`; ids are untouched.
  When the token reads `asset:` the realm enters SHELF MODE: the panel widens to 560px and wears
  `.shelf`; a tab strip (All + each kind present, with per-query counts) sits over a scrolling list
  (`SHELF_CAP` = 300 rows drawn per paint, then a "N more" foot; `SHELF_VIS` = 13 visible). The
  words after `asset:` narrow within the tab (name prefix > name > tags > id prefix). Keys: Tab /
  Shift+Tab walk the tabs, Left/Right walk them while the words are empty, Enter picks, Escape closes;
  tab clicks preventDefault on mousedown so the caret never leaves the box. `st.tab` survives
  close/open. Both `.sbrp-tab*` stylesheets (lib/ui-page.js AND lib/ui-cards.js) must move together.
- Never write the shelf, never `require("mods/…")`, never mirror it in a table, and never edit the
  mod's own files (his standing rule: *"We need to be the ones with the code and compatibility
  layers"*). A break against a newer mod version is fixed in THIS tree.
- Any edit to refpick's realm strings bumps `REALM_V` (single quotes, no template literals, no
  comments inside the strings); the worker `filter()` and realm `rowsFrom()` are mirrors — change
  them together, in that one file.