// ADD-ONS, mod-agnostic (design by @dandalruss). Any installed mod can live inside Slate; nothing here names a particular mod.
//
// HOW A MOD BECOMES A SLATE APP (lib/addons-setup.js does all of it, no hand work):
//   1. Slate scans every mods/<id>/mod.json. A mod is hostable when it has a god-mode `tab` (its panel) or a Slate adapter.
//   2. "Add to Slate" (world.state.slateHosted[id] = true). Setup then:
//      - writes lib/addons-host.js, the one file allowed to import from another mod's folder (reset before a publish)
//      - declares the mod's own inputs.actions names on Slate, so taps from its html, drawn inside Slate, reach
//        Slate, which hands each to the mod's own god behavior onInput (as `<name>` and `<id>:<name>`)
//      - hides the mod's rail tab while it is hosted (stashed in world.state.slateTabs, put back on remove or toggle)
//   3. "Remove from Slate" undoes all three. Uninstalling the mod does too.
//
// THREE WAYS A MOD IS DRAWN, first that applies:
//   a. the mod ships its own adapter: mod.json "slate": { "adapter": "slate.js", "files": { key: "path" }, name, glyph,
//      color, about }. Its adapter default-exports make(mods) → contract (below); mods = { panel, god, ...files }, imported.
//   b. Slate ships one: an entry in ADAPTERS below plus lib/adapters/<id>.js (same make(mods) shape).
//   c. generic: the mod's own tab panel, drawn as is inside Slate (lib/addons-generic.js). Every mod with a tab works.
//
// THE CONTRACT (every field optional; lib/addons-generic.js finish() fills what is left out):
//   app      { name, glyph, color, sub(ctx) }        its app tile on the Slate home
//   pages    [{ k, label, app }]                      app 'own' draws in its app; any Slate app id shows it there
//   page(ctx, player, k) → html                       one page, no window chrome of its own; over BUDGET it is not drawn
//   current(ctx, player) → k                          the page it is on (default: Slate keeps it per player)
//   go(k, player) → js                                the tap that moves it to page k (default: Slate's planAddon page op)
//   actions  [names]                                  its html's sendAction names (default: its mod.json inputs.actions)
//   forward(ctx, name, payload)                       hands a tap to it (default: its god behavior's onInput)
//   cards(ctx) → [{ key, t, note, tag, col, src }]    records that are Planner tickets (merged, never duplicated)
//   settle(ctx, card, col)                            a ticket moved on the board: write it back to the add-on
//   endpoints { <name>: { read?(ctx, player, args), write?(ctx, player, args) } }   its data and verbs for Slate apps and Savi
//   theme    { root, tokens, hide, unframe, flow, parts }   how its html wears Slate (lib/ui-addons.js skinOf)
//
// ADAPTERS: suggestions the Store offers to install. Entry: { id, name, glyph, color, about, files? }.
// psypher5's own apps land here as each ships as a mod.
export const ADAPTERS=[];
