# 1.0.0
First release: planner, roadmap, camera, photos, the Loom book with multi-lane Flows, Players, Game page, Settings (rules, shortcuts, version), and the play-mode pocket/orb.

## 1.10.1
- The silhouette scorer now ships inside Kiln's page (Appendix: silhouette-gate.py): the catalog drops .py files, which is how 1.7.0 lost it and why 1.10.0 didn't carry it.

## 1.10.0
- Kiln's silhouette scorer is back: `` (overlap, 8 width bands, aspect, a compare sheet, `--json` for receipts). 1.7.0 removed it with the old docs/kiln folder while Kiln still pointed at it.
- Kiln 3D silhouette gate: proportions come from measured sheets, never from brief adjectives; no scorer means no pass; extreme depth builds three blockouts judged by a critic; sheets cover every view plus part sheets.

## 1.9.0
- A warmer description, following the creative flow: Loom and Design, then Planner and production.
- Clearer tickets and epics, sprint planning, shared discussions and editable automatic context links.
- Search across apps, tickets, epics, Loom, Design and photos; personal Back history and recent-page navigation.
- Compact transparent footer with configurable side destinations, hide controls and shared LED colour/glow.
- Home shapes with an independent house-symbol switch; Icon only comes first, with legacy Dot/Gem preferences handled safely.
- Grouped Settings and a personal edge tab in play, adapted with credit to @robot.
- Personal theme controls no longer trigger shared project reconciliation. Duplicate Menu buttons keep focus and expanded state in sync.

## 1.8.0
- Lighter for players: the planner, add-ons and their libraries now load only on an editor's machine, after the world stands. Players skip about 0.9 MB of Slate code at join.

## 1.7.0
- Wisp tour: NEXT and BACK move one step per press, even on a slow connection; the tour no longer skips screens.
- Kiln fills in Slate for every workflow: each piece keeps one receipt, and Workbench, Gallery, Loom and Planner update at every checkpoint as it's made. The Slate log workflow runs on it, and a last **Slate filed** gate checks everything is there before a piece is done.
- Kiln hero: a new step, *Slate fills in*, before *You approve*.
- Kiln: a *how deep* setting for every workflow: off (Savi builds her normal way), light (default: brief, concept, one proof, no crew), full (the whole crew pipeline).
- Kiln 3D: the brief asks for wear up front (new / lived-in / worn / wrecked, which kinds, one look or stages), and a new step 8b bakes curvature, cavity, AO and world-up masks that drive grime, dust, chips, rust and moss, with one texture set per stage.
- Studio checks turnaround provenance: a sheet counts only with `source: reference|concept` and a `from` list, and anything drawn from a proof render or model is flagged "not counted".
- Kiln 3D: the high-poly step has real steps; maps explainer moved into Baking; one step timeline per Kiln page, numbered 1-based.
- Kiln 3D: pure Blender, no AI mesh generators.
- Kiln 3D: turnarounds are made only from sourced reference or new concept art, never from a model render, and every sheet records its source.
- Kiln 3D: a maps box (height, bump, normal, displacement: only the baked normal ships), a no-bump-left check, the glTF Validator and export checks, and a fresh-eyes review at every stage.

## 1.6.0
- A new description: what Slate is for, then what's on it.
- Studio has tabs: Active game, Published, Drafts, Mods and Tools. Studio opens on the game you're in. Game and Players live in Active game now.
- An app store, laid out like one: app icons in a grid, a page per app with a hero banner and what's new. Installed apps get their own home-screen icon.
- Any mod in your world can live inside Slate as an app, and it keeps its own god-mode panel. Add-on system by @dandalruss.
- Savi's List has its own page, separate from Tools (Spawn's official tools).
- Wisp app: your own wisp from Spawn, in its real colour and shape, as a pixel flame.
- Headphones app: stations open on My Mix, add tracks to it, compose, and + for more playlists. An on-screen player in play with skins and a minimise bubble.
- Assets app: every model, sound, texture and picture the world uses. Models show rendered previews, and view in 3D spins them right in Slate.
- Metrics app: players, plays, milestones and stats.
- Home icons are one set of white-line icons (Studio keeps its own).
- Kiln: a hero that explains what it is, and every page shares the pre-production layout. Selecting a workflow in Settings › Kiln now opens that workflow's file.

## 1.5.2
- Settings → About reads the installed version and its notes straight from the mod, so every update shows itself.
- Home: Studio, Loom, Planner, Kiln and Workbench are the fixed top row, the core workflow in order. Everything else arranges freely below it.
- Home: icons sit centred, five to a row.
- Planner: the Home tab is gone from the tab bar. The round button under the screen goes home.
- Kiln: the workflow picker is a themed menu showing the current workflow's name.
- Play-mode pocket works on phones: the Slate tab sits on the screen edge, clear of the thumbstick.
- A new description: Slate as a creator toolkit.

## 1.3.2
- The About page shows the version you actually have installed.

## 1.3.0
- Kiln is its own app on the home screen, with a fullscreen view. A guided Make section sits above the pipelines: a text box labelled for what you want, a workflow picker, and a how-to that changes with each workflow. You can also just ask Savi in chat.
- Home: rows stay centred under the top section, so the middle tile sits in the middle. Tiles keep the spots you drag them to, and resizing the tablet adds space at the edges without moving them. The background fills the full height, and mark all read stays visible.
- Settings → Breathe and the shared design tokens (lib/tokens.js).
- A new description that lists the apps in the order you make a game.

## 1.2.0
- Kiln (Settings → Kiln): a library of workflows Savi follows: 3D assets (prompt to Blender), 2D assets, in-game art, textures, music, sound effects, voices, plus your own. Pick one, walk its steps and tick its gates, or type what you want and press Make with Savi. Each workflow has its own "use automatically" and "stop at gates" switches; edits save with the game, reset brings Slate's default back.
- Kiln: an **Engine limits** page every workflow reads first (3D, engine geometry, textures, 2D, audio, UI), shown under Reference on the Kiln shelf and editable per game.
- Kiln 3D: a measured silhouette gate after blockout with its own scorer (), a values pass, kit pieces on one grid, pivots and named sockets at blockout, look-dev signed off in the engine, and a receipt per asset for Workbench.
- Kiln: a **Slate log** workflow every other workflow calls at its checkpoints: tickets, Loom pages with links and pictures, and the Gallery.
- Photos is now **Gallery**: every picture filtered by kind (photos, concepts, drawings, references, renders, outputs), grouped by asset, searchable, with click to expand and copy link; Workbench pictures show up too.
- Workbench Docs lists every Kiln workflow, Engine limits, the art asset lists, the design system, and the game's Rules and Journal (kept current by the Slate log; "sync journal" by hand).
- Workbench asset pages: Silhouette, Values, Engine limits and Inferred steps, and the in-engine look under Placement.
- Themes: an accent colour picker, laid over any theme.
- A fullscreen button on the bezel.
- STUDIO (the shelf) and WORKBENCH (the game's assets, concepts and docs) carry their new names.

## 1.1.0
- Planner lanes sort newest ticket first; a `savinotes` filter tag for Savi's own todos.
- App pips now light the exact cards that changed when you open the app, edited tickets included.
- Play-mode pocket: the camera is its own brass tab under the Slate tab, easy to spot.
- STUDIO (preview): box sets beside their games, add a box, cover generation, a full colour picker, flat app icon.

## 1.0.3
- Tickets written by other hands (a `title` instead of `t`, a blank title, a missing column or id) are healed on read, so the board, Loom and search always open.

## 1.0.5
- TOME and Studio are in preview: they show only in worlds that carry studio files, while they are rebuilt.

## 1.0.4
- Your board, book and archive survive a new room: every change is saved to the world's database, and a room that starts empty (a roguelike death, a new biome instance, a reset) restores them on arrival.
