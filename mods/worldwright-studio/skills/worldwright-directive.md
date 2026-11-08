---
name: worldwright-directive
description: "THE STANDING ORDER in one page — load this FIRST on any ask in a game with Worldwright Studio installed. The reading order before anything is built (the pinned Codex book CODEX0000BOOK → the Research book → the player book/folder/card the ask names), and the hand-off to worldwright-routing, which carries the law in full: who may write, how an ask is filed, and the Codex write lane (the Codex is read-only in the app — CARDS.authoring(true)/(false) is Savi's own lift)."
---

# The standing order — Codex first, Research second, the card third

The creator's ask, verbatim (2026-08-26):

> "Reference Codex, then research, then the appropriate player book/folder/card. Fill out and
> follow the Codex, the trim/cleanup the codex after each pass/phase."

This is the order of authority in any game that has Worldwright Studio installed. It is not optional
and it is not per-feature — it is how EVERY ask is served. Reads are never fenced, so this order
runs whoever asked; only the writing at the end of it is gated.

## THE READING ORDER, before anything is built

**First — the Codex.** The build document: the pinned book **`CODEX0000BOOK`**, named *Codex*, always
present in this install. Read it, find the phase the ask lives in, and let its Invariants and its
open questions constrain what you are about to do. The Codex outranks memory and outranks your own
recall of past sessions — it IS the game's truth on design intent. (If this game also has the
separate `codex` mod installed, that document is its own thing with its own directive —
`use_skill({ skills: ["codex#codex"] })` — and it does not replace the Codex book.)

**Second — Research.** Load `worldwright-research-walk` and do the walk: the pinned Research book
(`RESEARCH0BOOK`), the `#[...]` reference map, the governing folders for the kind of thing being
built. The walk's laws hold in full — primaries only, batch the database, reads are never fenced.

**Third — the source.** The player book / folder / card the ask actually names. It is read LAST on
purpose: by the time you open it, the Codex has told you what the game intends and Research has told
you what the world permits — so one card can never send the build against the world's rules.

Then **fill out and follow** the Codex while the build runs, and **trim** it when the pass or phase
closes.

## Codex writing grain — corrected 2026-09-17

Load `worldwright-codex` before writing: concept → named folder beneath its governing category;
independently maintainable part → primary card; related overflow → continuation page. Use the
full measured A3 body, not tiny page fragments. Do not confuse part cards with stack alternatives,
and do not hide a whole subject in one ever-growing card. This supersedes the old whole-feature
reading; `worldwright-paper` still owns lossless width/height fitting.

## Then hand off — everything else lives in `worldwright-routing`

Load `worldwright-routing` next and follow it. It carries, in full:

- **Who may write** — the allow list, god mode is not access, and the game's creator is never locked
  out (the first thing that skill checks).
- **Hear it → file it → build it** — which book, which folder, new card or edit.
- **The Codex write lane (§1b)** — the Codex book refuses every in-app write by design and throws
  *"the Codex book is read-only — it is written for you, not in the app"*. That is not a permanent
  refusal: `CARDS.authoring(true)` before the writes, `CARDS.authoring(false)` in a `finally`, with
  the worked example there.
- **The stamps and the compaction** (§4b) — how notes and open questions are marked `[P<n>·<n>]` and
  compacted at every phase boundary.
- **The standing laws** — primaries only, the database is a cost, find by name.

Sections/pages are `worldwright-cards`; manuscripts are `worldwright-writing`. Load `worldwright-paper` for every page write and `worldwright-piano-roll` for scores, custom instruments, notation or rendered audio.

**And one standing fact about the mods in this game:** *"The idea is to let the Worldwright Studio
integrate and coordinate all the mods in one space"* (his ruling, 2026-08-27). Worldwright Studio is that
space — a mod's material is PULLED onto cards, never written back into the mod; the per-mod lanes and
the one sanctioned hand-off shape are `worldwright-mods`, Integration boundary.

## Maintaining the studio itself

Use `worldwright-maintenance` with the affected lane. User-facing Docs describe the tools; ownership proof, soft-mod integration instructions, retired-feature boundaries and regression checklists belong in skills. Keep names and examples aligned with the actual implementation. In particular: editors are not owners, read grants do not confer writing, Pose application is pending, and native sound does not require the optional Sound Design Guide.


### Permanent specialist books · 2026-09-14
Fixed shelf order: Codex (`CODEX0000BOOK`), Research (`RESEARCH0BOOK`), Music (`0MUSIC00BOOK0`), Asset Studio (`ASSET00STUDIO`). They cannot move, rename or be removed; only Codex is read-only inside. Research contains prose reference material, not source media. File piano scores, recordings, instrument samples and SFX in Music. File models, poses, sets, images, materials and textures in Asset Studio. Prose can reference specialist cards by their unchanged IDs. Read Codex and Research constraints first, then the relevant specialist source. Never regenerate or duplicate a card merely because its containing book changed.