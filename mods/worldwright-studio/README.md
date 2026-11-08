# Worldwright Studio

Worldwright Studio is a creator-only writing and worldbuilding workbench for Spawn. Keep your story, game design, sound and asset documents together without turning the player experience into an editor.

Organize books, nested folders, cards, pages and sections. Follow linked references, search your work, import/export documents, and use guarded saves, Undo/Redo and Trash. Permanent Codex and Research books separate the build plan from lore and prose.

Sound Studio organizes soundtrack and SFX projects with native score editing, arrangements, instrument/sample controls, preview and WAV-rendering tools. Recorded piano, violin and cello presets sit alongside synth and custom-instrument workflows.

Asset Studio uses Projects → Types → Files for model, pose/animation, texture/material, path, effect and level-layout documents. Linked files keep related components together. Editing depth and export support vary by tool: this is not a complete Blender replacement.

Compile and Shoot connect written scene directions to staged output. Optional integrations include Absolute Cinema, Film Kit, Asset Library and Atmosphere Kitchen, installed separately. None is required to open the core studio; partner-specific functions explain what is missing.

EARLY RELEASE — SUBJECT TO CHANGE. Expect bugs, unfinished editors and evolving formats and workflows. The broader camera-scene editor remains unfinished; audio/file delivery and touch behavior need wider device testing. Keep independent exports of important work.

Starts empty, with built-in book/folder structure and reusable instrument presets—not the development world's books, songs, scenes or saves. Open WW Studio in god mode; players only consume authored outputs. Install name: worldwright-studio.

## Start here

Enter god mode and select **WW Studio**. Create a manuscript book or open Sound Studio / Asset Studio and make a project. Open a card and choose its editor in Metadata. Save before leaving an editor. The Docs menu contains General info, Story/World building, Codex, Sound Studio and Asset Studio.

Worldwright Studio 1.1.0 is an early release, subject to change. This update improves Arrangement refresh isolation, preview buffering, recorded instruments, linked editor switching, model-detail and constrained pose authoring. See CHANGELOG.md for upgrade details and known limitations. Tablet crackle, live-device refresh acceptance and a broader preview/offline-render discrepancy remain unresolved. Install as **worldwright-studio**. Do not run it alongside the retired Codex Builder package in the same world; see the upgrade skill before switching an existing workspace. No other mods are bundled, no world terrain or camera is replaced, and no example content or database reset ships with it.

## Data and ownership

Documents persist in the host world's SQL-backed repository; editor caches are not a full offline filesystem. The clean-slate operation on the development world is not an install or update hook. Uninstalling this mod does not constitute a requested data purge. Existing users should export important documents before testing this early release. Legacy Quill, snapshots and Piano/Roll-tag workflows are retired; no migration promise is made for those retired tools.

World ownership is host-specific. Installation/ownership-transfer setup follows the maintenance skill; never copy the package author's account into another game's ownership attestation.

## Recorded-instrument credits

Salamander Grand Piano by Alexander Holm: CC BY 3.0, with the original attribution and modification notes in `lib/data/piano-samples-license.md`. VSCO 2 Community Edition strings by Sam Gossner and Simon Dalzell, sample cutting by Elan Hickler: CC0 1.0. Sources and preparation details are in `licenses/`. ldk1609 violin recordings, distributed by bigcat Instruments: the distributor specifies Creative Commons Attribution to ldk1609 at Freesound, without a license version; source and playback-modification details are in `licenses/ldk1609.md`. User-supplied media keeps its own licensing obligations.
