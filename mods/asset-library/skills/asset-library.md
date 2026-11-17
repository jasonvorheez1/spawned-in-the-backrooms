---
name: Asset Library
description: Read the Asset Library shelf BEFORE conjuring any model, animated character, sound, texture or effect — this game already carries a shelf of finished, named assets with tags, clips and card pictures. Load when the creator asks for a character, creature, prop, building, sound, or effect; when you are about to write a /cdn/ path that does not exist yet; when they say "use the library", "the shelf", "tell savi", or name a card; and before briefing any wisp that will place content.
---

# The Asset Library shelf

This game has a shelf. It is a list of assets that **already exist and already
cook** — every row has a real `/cdn/` path, its own tags, its animation clips,
and a picture of the thing on its card. Conjuring a new asset when the shelf
already carries one costs the creator minutes of cook time and gives them a
second, slightly different version of a thing they already had.

**So: search the shelf first. Conjure only what the shelf hasn't got.**

## Reading the shelf

The catalog is a generated module — a plain array of rows. From `run_script`:

```js
const rows = require("mods/asset-library/lib/catalog.js");   // installed
// in the workshop game where the mod is built: "scripts/asset-library/lib/catalog.js"
return rows.filter((r) => (r.tags || []).indexOf("monster") >= 0).map((r) => r.name + " " + r.path);
```

`grep` works just as well and costs less: search `lib/catalog.js` for a word
("goblin", "torch", "footstep") and read the matching lines.

Three more modules sit beside it, same shape:

| file | what's in it |
| --- | --- |
| `lib/catalog.js` | the shelf — everything the creator has collected |
| `lib/local.js` | this game's own additions (only present where the mod is installed) |
| `lib/effects.js` | the Effects shelf — fx programs, lights, water |
| `lib/project.js` | what this game is already wearing |

## A row

```json
{ "id": "animation-goblin-skirmisher-7000",
  "name": "Goblin Skirmisher",
  "path": "/cdn/moodboard-painterly-fantasy/portrait-goblin-skirmisher.png.glb?animations=Idle,Walk,Run,Attack,Hurt,Die",
  "kind": "animation",
  "tags": ["monster", "dungeon", "humanoid", "goblinoid"],
  "clips": ["Idle", "Walk", "Run", "Attack", "Hurt", "Die"],
  "thumb": "/cdn/moodboard-painterly-fantasy/portrait-goblin-skirmisher.png" }
```

Kinds: `model` (static prop), `animation` (rigged body — `clips` is the truth
about what it can do), `image` (texture / sprite), `sound`, `effect` (fileless,
`fx:<slug>`, its `props` fragment carries the fx program / light / water plane),
`set` (a whole captured arrangement — `members` with local offsets and `span`).

**Use `path` verbatim.** It is a live asset; retyping it with different words
mints a different thing.

## Placing from the shelf

- **A model or animated body:** spawn it with `properties.model = row.path`.
  A rigged row wants a locomotion or idle behavior; the clip names in `clips`
  are the exact strings the mixer takes.
- **A sound:** `properties.audio = { clip: row.path, … }`.
- **An image:** `material.texture` or `sprite.texture`.
- **An effect:** its row carries `props` — spawn an object with those
  properties (fx script, light, water material) rather than hand-rolling one.
- **A set:** `api.emit("assetLibrary", { verb: "setPlace", id: row.id, point })`
  rebuilds the whole arrangement, offsets intact.

## "💬 tell savi"

Every card has that button. Pressing it DMs you the row — name, id, path,
tags, clips. When one lands: **say the card's name back in chat in one short
line**, then treat whatever the creator says next as being about that asset.
Don't paste the card picture unless they ask — it renders very large.

## The habit

Before you write any `/cdn/` path that doesn't exist yet, ask: is it on the
shelf? Search by the plain word for the thing, then by tag. Tell the creator
what you found — "the shelf already has a Cave Troll with Attack and Die, using
that" — and conjure only the gap.