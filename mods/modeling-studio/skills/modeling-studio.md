---
name: Modeling Studio
description: Spawn 3D Modeling Studio: Savi's paint-then-model pipeline (spawn paint concept → Tripo high-poly PBR model → canvas, pedestal, shelf). Use when a "Spawn 3D Modeling Studio ask" note arrives, when placing the studio, or when explaining or extending the mod.
---

# Spawn 3D Modeling Studio

What the creator sees: a round dark dais with a floating canvas, a glowing pedestal and a lit 3×3 walnut shelf (the `modeling-studio` object). In god mode the 🎨 **Studio** tab takes (and outside god mode, in the build room, **M** or the 🎨 3D studio button bottom-left opens the same panel: `hud.js` draws it, `player.js` toggles `player.state.studioOpen`, `god.js` rides the player too so its asks land) an ask (text + up to 4 uploaded pictures + gallery picks as references) and two buttons, **Paint** and **Build 3D**. Pending asks show with a pulse; the gallery shows, turns (↻ 180°) and removes pieces.

Honest limits: the mod never paints or models by itself. A press writes a pending row and wakes Savi with a note; Savi runs the pipeline below. Rigging and animation are not part of the pipeline (they are not reliable yet); offer them as a separate step.

## The queue (scripts/lib/studio-queue.js)
Game-made orders (Jev, the guild, the town) enter by `enqueue`: at most CAP (6) sit in `pending`; the rest wait whole in `m3d.waiting`, never trimmed, and `sim.js` moves them up every 5 s as room opens (each wakes Savi then). Work `pending` in parallel batches. Never trim or overwrite either list; clear a row only in the same write that registers its item.

## Data: `world.state.m3d`
```
items:   [{ id, kind: "image" | "model", name, prompt, by, made: "YYYY-MM-DD",
            url (image), thumb (model: the concept picture),
            spec (model): { model: { id: "/cdn/value.<sha>.glb", forward: "+z" | "-z" | "+x" | "-x" }, layout?, behavior? },
            turn: 0 | 180, from: [item ids], how: { tool, inputs, steps } }]
pending: [{ id, mode: "image" | "model", text, refs: [/cdn/…], sel: [item ids], pose?: "a" | "t", by, at }]
showing: { image: <item id on the canvas>, model: <item id on the pedestal> }
```
`studio.js` on the studio root rebuilds the canvas texture, the pedestal piece (a turntable, 20 s a turn) and every shelf slot (oldest first, 9 slots, plaque = name) from this alone. Write the whole array (`s.items = [...]`), never push.

## The pipeline (one ask = one note: `pending <id>`)
1. **Read the ask**: text, refs, selected items (their `how` says how they were made: reuse it for "another like this").
2. **PAINT** (`mode: image`, or the first half of a Build 3D from text alone):
   `spawn paint "<subject>, <style>, full body, clean even studio light, plain light-grey backdrop, centred, nothing cropped" --size 1536x1024 --ref <each ref>`.
   **Pose toggle**: `pose: "t"` paints the character in a strict T-pose (arms straight out level with the shoulders, palms down, legs slightly apart, feet flat, facing the camera); `pose: "a"` in a strict A-pose (arms angled down about 45° away from the body, palms in, legs slightly apart, feet flat). Write it into the prompt word for word; it also holds for the painted half of a Build 3D. No pose = the subject's own pose, except this default: For a character meant for 3D: a front view in a relaxed A- or T-pose, feet flat, hands open, no props crossing the body, no motion blur. Item: `{ id: "i-<slug>", kind: "image", url, … , how: { tool: "gpt-image (spawn paint)", inputs, steps } }`, then `showing.image = id`.
3. **BUILD 3D** from the picture (the painted one, or the creator's ref when it is already a clean single subject):
   `spawn tripo generate --image <url> --face_limit 15000 --geometry_quality detailed --texture_quality detailed --pbr true --out <slug>.glb`
   The `fetched:` line names the model's /cdn/ address. Item: `{ id: "m-<slug>", kind: "model", thumb: <the picture>, spec: { model: { id, forward: "-z" } }, from: [picture id], how: { tool: "Tripo image-to-model", inputs, steps: "detailed geometry, detailed texture, 15k faces (Tripo caps at 50000), PBR" } }`, then `showing.model = id`.
   A character from a messy photo: paint the clean T-pose first (step 2), then model the painting. Two passes beat one.
3b. **Stamp the order on the item**: every item answering an order carries `orders: [<pending id>]` and `prompt: <the row's text>` whole, so Jev, the guild and the town find it whatever its name (`scripts/lib/studio-queue.js` matches on either).
4. **Drop the pending row** (`s.pending = s.pending.filter(p => p.id !== id)`), same script as the item write.
5. **Look before saying done**: a scene look at the pedestal (eye ~2 m in front of it, at 1.5 m) and at the shelf from +X. The paint check must say the asset is servable. If the piece shows its back on the shelf, flip `spec.model.forward` between "-z" and "+z" (the fix belongs to the item, so pedestal and shelf both follow); `turn: 180` is the creator's own nudge from the tab.
6. Tell the creator where it stands and what to try next.

## Quality bar
Clean silhouette, nothing cut off at the frame edge, one subject per picture, even light with no hard cast shadows (they bake into the texture), plain backdrop. A blurry or cropped concept makes a broken model: repaint first. Respect people: a real person's photo is restyled only with care, never into anything they'd mind.

## Placing the studio
The install places `modeling-studio` at (0, 0, 6). It needs a clear, flat circle 6 m across; move the root (children follow). The canvas faces +Z: put the open side toward where players arrive.

## Preview Window and edit takes (1.3)
Clicking a gallery card opens a **Preview Window**: the piece turns in a centred window; drag orbits, wheel zooms, middle-drag lifts, double-click resets. Drag the top bar to move the window, the corner to resize it; the model follows.
Draw a box or lasso on the model, type what to change and press Edit: this writes a row to `world.state.m3d.edits` (`{ id, of: <item id>, text, region, view }`) for Savi herself, not a studio order. Savi makes **three takes** and writes them as `variants: [{ model: { id, forward }, note }]`. Take 1, 2 and 3 open in their own windows, each with its own orbit, zoom and lift, and a **Select** button. Select swaps that model into the same gallery item (and its Savi gallery copy); Keep original discards the edit. A finished change shows a green **!** on the gallery card.