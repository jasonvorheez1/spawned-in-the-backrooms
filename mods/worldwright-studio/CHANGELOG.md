# Worldwright Studio releases

## 1.1.0 · 2026-09-23 · Early-release tools and stability update

### Documents and navigation
- Card references open their metadata-selected editor. Breadcrumbs retain the source card and page; Back unwinds reference chains across books, with the existing Save/Discard/Cancel protection.
- Automatic editor selection follows saved metadata only; untagged cards open as prose instead of guessing from content.
- Export sheets show a bounded preview while Copy/download use the complete document. Protected-book rules remain in force.
- Related paper presets, routing, pagination, preview batching, workbench settings and editor-lifecycle helpers are consolidated without changing saved formats.
- Retired the workshop-only Studio Code book. It is not shown, opened or seeded; reserved IDs and protections remain, without purging saved snapshots or other books.

### Sound Studio
- Arrangement cursor-follow, bounded preview packets and preloading improvements.
- Keep the active Arrangement, draft, selection, undo history and file playback through ordinary refreshes and compile/status replies. Recover cold source caches without reopening the document; present external saved changes as a notice instead of silently replacing the draft.
- Save & Compile / Save & Render waits for the guarded save receipt. Render attachments are checked against saved source identity; Remove render unlinks only the selected attachment without deleting scores or shared media.
- Size-aware WAV rendering respects the playback relay cap. Existing oversized attachments are not automatically replaced.
- Improved Salamander piano calibration; exact-pitch ldk1609 violin bows, firmer ordinary stops, bounded held-bow leveling and support for explicitly authored smooth releases. Songs and their written endings are not automatically rewritten by updating the package.
- Piano Paper default and source/notation improvements.

### Asset Studio and editing
- Expanded joint-chain/constraint authoring and pose controls; preserve child-bone proportions while retaining root movement and original source clips.
- Model-detail selection, geometry/worker and viewer improvements.
- Identity-linked editor switching preserves the source document, reuses related companions and shows switching progress rather than silently substituting a blank file.
- Prose page navigation, guarded page saves, history and primer cleanup improvements.

### Upgrade and data safety
- Guarded project-scope upgrade from the old internal project key to Worldwright Studio, retaining document identities and history. Conflicting scope data is refused rather than overwritten.
- Core authoring remains god-mode-only and standalone. Optional partners are not bundled. No development books, Canon scores/recordings, saved scenes, host ownership record or database reset ships with this update.

**Known limitations:** early release, not a complete Blender or production DAW replacement. The broad camera-scene editor is unfinished. Tablet crackle and real-device Arrangement refresh behavior still need acceptance testing. A broader preview-versus-offline-render waveform discrepancy remains unresolved; isolated final-chord agreement is not whole-song parity. Existing large-file relay failures and device-specific audio/touch behavior are not claimed fixed.

Existing installations choose when to update. Preserve important documents before adopting this early release; updating the mod does not publish the host world or authorize a data reset.

## 1.0.0 · 2026-09-16 · Early release

First release under the separate **worldwright-studio** install name. A creator-only writing and worldbuilding desk with permanent Codex, Research, Sound Studio and Asset Studio books.

- Native score and arrangement documents, instrument/sample controls, recorded piano and strings, preview and WAV-rendering tools.
- Project/type/file organization for assets, linked component documents, and early model, pose/animation, texture/material, path, effect and level-layout tools.
- Shared editor selection/opening, guarded saves and dirty-leave handling, concise Docs and a descriptive About section.
- Optional Cinema, Film Kit, Asset Library and Atmosphere Kitchen integrations remain soft links, not bundled dependencies.
- Fresh installs contain structure and licensed instrument presets, not the development world's documents, songs, scenes or saves. The development-only data reset is not distributed.

**Breaking/retired:** Quill/custom plugins, native snapshots, external Pose Lab compatibility and legacy Piano/Roll-tag workflows are retired. Retired plugin/snapshot stores are removed by the existing retirement code. Back up/export important work before updating; no migration promise is made for retired editor formats. Ordinary books/cards keep the established repository identities.

**Early release — subject to change.** Expect bugs, unfinished editors and changing workflows. This is not a complete Blender or production DAW replacement. The broader camera-scene editor remains unfinished; creator-device audio/file delivery and touch behavior require wider testing. Existing installations choose whether to update.

The old Codex Builder listing is retired from search. Worldwright Studio has its own controls, runtime paths and help names. The private SQL and document-format identifiers remain unchanged; do not run both packages side by side.
