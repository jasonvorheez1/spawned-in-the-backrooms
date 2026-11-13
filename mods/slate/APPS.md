# Slate app guidelines (our own compliance)

Every Slate app is a screen inside one tablet. These are the rules an app follows so the tablet feels like one OS.

## Frame
- **App bar, top.** Every app opens under the shared `appBar(tab)`: its icon tile, its NAME in caps, one short subtitle. Apps never draw their own title strip. Register the app in `APPS` in `panel.js` (glyph, name, colour, subtitle) — the same entry the home screen uses.
- **Nav bar, bottom.** HOME is always there, centred. An app with sub-screens (Planner) puts its tabs beside HOME in that one bar; nothing else lives in it.
- **Content between.** Scrolls on its own; the bars never scroll away.

## Look
- Palette: navy `#111b2c` ground, ink `#d9e0d9`, dim `#8a9aa0`, line `#2c3b4c`, brass `#a37d45` / `#c9a56a` for headings, cyan `#53d9e5` for live/active, ember `#ff9156` for attention (unsorted, no reply, destructive).
- Section labels use `sub` (small caps, tracked). One accent colour per app, taken from its home icon.
- Buttons are `btn`. Icon-only buttons always carry a `title` tooltip.
- Write the house hexes lowercase: every theme remaps them. A colour that must never change with the theme is written UPPERCASE.
- Fits a 360px-wide phone: flex-wrap, no fixed widths over 340px.

## Behaviour
- **Collapse / expand:** sections and long lists fold with a +/− square; a list with folds has expand-all (+) and collapse-all (−) top right.
- **Filters are pills.** One row, the count inside each pill, shift-click to mix where mixing makes sense.
- **Newest first** for anything with a date.
- **Edit in place.** Text you can change is clicked and typed into; Enter saves, Esc puts it back. An edited item shows when it was edited.
- **Cross-app hand-offs** use the same words everywhere: 🎫 make ticket / open ticket, 📖 add to loom / open in loom, 🔗 links.
- **External links** use the shared link click (opens a tab, or shows the address selected and copied when the tablet can't open one).
- A button that asks Savi says so, shows "savi is …" while waiting, and never promises the answer is instant.
- Destructive presses take two taps (arm, then confirm).

## Data
- Shared content lives in `world.state.plan` / `world.state.loom`. What one person is looking at (open page, folds, filters) is theirs, on `player.state`.
- An app's ops live in `lib/<app>.js` and are dispatched through `plan.js`; an app never writes another app's data except through a hand-off op.

## Slate apps (the Store's own, installable)
- One file each in `lib/apps/<id>.js`; the contract is the comment at the top of `lib/apps/index.js` (APP, page, op, optional tile).
- The core five (Studio, Loom, Planner, Kiln, Workbench) are Slate itself and never uninstall.
- Installed = `world.state.slateApps[id]`; open = `plan.tab 'app-<id>'`; presses ride `sendAction('planApp', { id, op, … })`.
- An app keeps its data in `world.state.slateAppData[id]` (shared) or `player.state.slateApp_<id>` (one person's).
- Never throw while drawing: guard reads with `?.`. An empty screen says what to press.
