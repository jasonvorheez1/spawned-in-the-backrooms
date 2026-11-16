---
name: Advanced Transform
description: Advanced Transform: a slim god-mode gizmo (move arrows, rotate rings, scale cubes) with ctrl+click groups, Del group delete and Ctrl+C/V copy-paste.
---

# Advanced Transform

`god.js` is a god-rig behavior. `editor(ctx, obj)` draws the gizmo on the selection every frame. While a group of two or more is picked it returns `{ replaces: "default" }`, so the built-in cluster stands down and the gizmo owns the drag. `onInput` reads `advanced-transform:groupDelete`, `:copy`, `:paste` and `:ctrl` (held).

Group state lives in module variables (the group ids, the last selected id and the clipboard specs). Outlines are 0.5 s `highlightSet` leases that the editor renews, so deselecting lets them fade.

Deletes and pastes run inside one `ctx.commit` each: one history row and one undo.

To check it, select two pieces with ctrl+click and drag an arrow. Both `feetPosition`s should change by the same delta; read them with getObject.