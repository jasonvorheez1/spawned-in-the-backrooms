---
name: worldwright-mods
description: "Worldwright Studio's optional integrations — actual adapters, soft dependency rules, supported-mod eligibility, namespaced installation and data-preserving updates. Maintainer guidance, not text for the user's Supported Mods article."
---

# Worldwright Studio — mods and compatibility

WWS owns the books and the editing workflow. Another mod supplies a capability; it does not replace the studio, its records or its Codex. This is a maintained contract, not an inventory copied from installed packages.

## Discover this installation

Read `world.config.yaml` and the installed registry. Resolve the actual WWS root from its declarations: the workshop and installed package both use `mods/worldwright-studio/`. Never create a second old-path copy. Inside WWS its modules use `lib/…`; from outside use the verified full root.

Keep package `worldwright-studio`, tab identity `worldwrightstudio` (label WW Studio), action names, SQL identities, pinned books and import formats stable. Codex (`CODEX0000BOOK`) and Research (`RESEARCH0BOOK`) remain separate pinned books. App shell, Co-op and primer attach to god mode; the cinema courier attaches to the player. Read the manifest rather than inferring attachments from filenames.

For owner access, follow `worldwright-maintenance` and `lib/game-owner.js`: verify the host owner from the game record and retain a host-owned world-id-bound identity record. An installed mod never exports its author's account as everybody else's owner. Editors are not automatically WWS authors.

## Runtime compatibility list

The source is `lib/data/supported-mods.yml`. Each row must name an existing WWS adapter in `compat` and an honest role. At the 2026-09-12 check:

| Mod | WWS adapter | Actual capability |
|---|---|---|
| Absolute Cinema | `lib/shoot.js`, player courier | Staged camera playback and cinematic cues |
| Asset Library | `lib/assetshelf.js` | Read/resolve shelf assets and sets |
| Atmosphere Kitchen | `lib/atmokitchen.js` | Read mood presets; free-text atmosphere does not require the mod |
| Film Kit | `lib/shoot.js` | Receive compiled cinematic design data; not the camera player |

Stream Vault, Sound Design Guide and Annia's Encyclopedia are not status-list entries. Their installed packages and useful reference skills remain; a guide alone is not a compatibility layer. Native Sound/Piano Roll works without the Sound Design Guide.

The UI reads installed versions at boot/Refresh, not per frame and not through SQL. Known latest versions are dated metadata, not a live catalog assertion. Presence is not proof of playback or asset readiness. The Mods button opens the Supported Mods window directly. Nothing in this UI installs or updates a mod.

## The integration boundary

Default direction: partner data → WWS cards. WWS does not rewrite a partner's tables, catalog, hub or code, mount a copy of its UI, or transcribe its runtime. No `require` of partner code inside WWS, including gated/caught requires. Use the WWS text readers and published data formats.

A hand-off is allowed only when the partner needs input to function, with all four properties:
1. Derive the payload from WWS's own cards.
2. Cross the partner's documented input/action/file contract, not private internals.
3. Credit the dependency and explain a missing capability; do not invent an author or API.
4. Gate on the installed registry and return a named missing/pending result when unavailable.

Shoot is the pattern. Do not edit Absolute Cinema. Posing and keyframes belong to the studio-owned Asset Studio editor, not an external dependency. Compile preserves pose annotations without applying them. A control discipline from another mod may apply to the creator's Codex, never displace it as the plan of record.

## Install, update, remove

Only act on the creator's requested package operation. Read the mod's listing and current manifest before the operation. Check tab/action collisions, attachment ownership, shared UI state and table names. Preserve host books, partner data and host ownership proof. If an update needs a destructive reinstall, stop and obtain explicit consent; the one authorized Asset Library clean-install was not blanket permission for future wipes.

Afterward verify the actual registry version, installed files and retained data, then Refresh the status strip. Use the save's validation result and a focused read; do not invoke retired validation commands. Never copy protected mod files manually to bypass an installer refusal.

A normal WWS update preserves books/cards/pages, permissions, identifiers and exports. Deliberately retired Quill and native snapshot storage remain retired; see `worldwright-upgrade` for those precise exceptions. Removal of package files and **Settings → Remove App** are different: the latter deliberately wipes WWS tables after confirmation. Read `lib/uninstall.js` for the exact table set. It must never wipe another mod's tables.

## Pick the relevant skill

- directive + routing: reading, filing and access
- cards / writing / research-walk: document work
- assets + asset-shelf: asset tokens and current shelf layout
- cinema + compile: Shoot, designated folders, diff/land behavior
- atmosphere: optional mood integration boundaries
- Asset Studio: studio-owned posing, keyframes, model/set/texture/path edits and export
- sound: scene cues, timing, voices and staged-body cleanup
- worldwright-piano-roll: page-native scores, streaming, notation, samples and Render WAV
- worldwright-paper: shared actual-width fitting and lossless pagination
- encyclopedia: reference material, not a supported-runtime status claim
- worldwright-maintenance: ownership, safe integration and regression checks

Keep this guidance in maintainer skills. User docs explain what the tools do and how to use them, not instructions addressed to Savi.