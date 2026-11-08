---
name: worldwright-upgrade
description: "Install and update Worldwright Studio under its own worldwright-studio name; preserve host documents, permissions and ownership."
---

# Worldwright Studio installation and updates

The public package is **worldwright-studio**. The separately named early release starts at 1.0.0. Its god tab is WW Studio, its namespace is worldwright-studio:, and its package root is mods/worldwright-studio/.

Codex Builder is the retired package identity, not the install name for this studio. Do not run both packages in one world: their underlying repository identities overlap. Never install the new name on top of an active Codex Builder copy. For an existing host, discuss switching, inspect/export its important work, and remove only the old package before installing the new one. Do not invoke Remove App, clear tables, or reset saves as a naming step. The creator's development-only data reset is not part of either package.

Keep established book/card/page/section IDs and document import/export wire identifiers intact. The current source upgrades the ordinary SQL project scope from `codex-builder` to `worldwright-studio` through `lib/project-identity.js`, after schema setup. That one transaction changes eight project-bearing tables, preserving history sequences/owners/pointers, reference IDs and content; pinned books keep their empty project scope. It refuses conflicting old/new pointers or tag definitions rather than overwriting either. Never rename the constant alone, rewrite saved text, delete other project rows, or reset a database to accomplish the rename. Back up before applying the upgrade and read back its audit. This guarded project-scope upgrade ships in 1.1.0; public 1.0.0 predates it. Native editors and documented formats are the supported paths; do not invent legacy editor migration or conversion. Quill, snapshots and external Pose Lab are retired; their old stores are removed by the existing retirement code. Tell an existing user to export important work before adopting this early release.

Update worldwright-studio in place for later releases. Its manifest owns the tab, actions and attachments: no duplicate host-config wiring. Focused skills now use worldwright-* names under the worldwright-studio package. Check namespaced presses and payloads, the primer, audio/set-piece paths and missing-partner refusals after an update.

Follow worldwright-maintenance for host ownership. The verified world-id-bound owner attestation belongs to the host, not the mod author's account. Never transfer an author's identity into another world.

Early release, subject to change: editing depth varies, the broad camera-scene editor is unfinished, and device audio/file/touch acceptance remains partial. Document exports are not complete database backups. An install or rename never authorizes deleting data, installing optional partners or publishing a world.