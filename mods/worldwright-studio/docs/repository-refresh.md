# Saved-data refresh — 2026-09-19

Worldwright is a god-seat authoring tool. Routine browsing still reads the per-book graph cache; there is no idle database poll.

- `lib/bookrev.js`'s `touch(api, bookId, actor)` flushes that book's staged journal before stamping it, then announces `{rev, by}` under `api.world.state.wwsBookRevisions[bookId]`. An empty flush performs no SQL. A failed flush publishes no notice.
- The existing once-per-second shell update compares only the open book's room stamp. A new, unconsumed revision triggers one database revision read; repeated unchanged frames do not read SQL. Own writes have already memoized their revision.
- Opening or returning to the Studio, browser focus and visibility restoration make an event-bound revision check. This catches other-room writes that do not share room state. No timer or second DOM observer is installed in the browser.
- A changed revision invalidates only the affected book graph and page-envelope cache, refreshes its project/folder lists and expanded tree, and records `ui.repositorySync`. It never reopens the current editor or replaces its draft. Arrangement compares the saved baseline and can display an external-change notice without restarting playback.
- Async UI writes are fenced by book, folder and editor generation. A stale completion cannot restore an older navigation. A failed change check is logged; there is no automatic retry loop.

## Content writers

Use the Cards/Studio write APIs. They call the book revision helper. A tool doing a direct database import must finish its transaction successfully, then call `bookrev.touch` for each affected book using the supported game context. Do not announce before committing, reset the creator's editor state, or reload every book. Raw SQL changes that bypass revision stamping are not detectable by a revision check.

## Evidence and remaining acceptance

The creator-facing Arrangement DOM was read back with its 22px folder-matched scrollbar and no oversized coarse-pointer override. The open Arrangement retained generation/load key 6 during the implementation reads.

`research/repository-refresh/server.cjs` is an isolated SQLite regression covering another-seat project creation, tree refresh, unchanged checks, idle cost, cross-room focus, cold revision memos and navigation fencing. It was saved but could not be run in this session: the workshop clone repeatedly failed to synchronize new files. Engine report b40e9b26 tracks that fault. No passing receipt is claimed. Automatic refresh and draft-preservation acceptance still need the saved regression and a creator-side refresh check. No source score, instrument recording or saved Arrangement was changed by this work. No publication.
