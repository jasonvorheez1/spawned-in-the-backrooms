# Advanced Transform

Select anything in god mode and a slim gizmo stands on it.

- **Global / local**: the chip by the piece (or the Transform tab) flips the arrows and rings between world axes and the piece's own.
- **Arrows** (red X, green Y, blue Z): slide along the axes. Ctrl (held mid-drag) snaps to 0.25 m.
- **Rings**: turn about X/Y/Z. A fat arc grabber sits on the ring right under your cursor. Ctrl (held mid-drag) snaps to 15°. Ring thickness is a slider on the Transform tab.
- **White four-way pad** under the piece: free move across the ground plane. **Surface snap** (the magnet chip, the tab, or alt held mid-drag) lands it on whatever is under the cursor: underside on a ledge or floor, back against a wall (turned to face out with "face out" on), hanging under a ceiling.
- **End** (or the snap-to-floor chip): drops the piece, or every piece in the group, until its underside meets what's below.
- **Home** (or the realign chip): turns the piece, or every piece in the group, back to its default orientation where it stands.
- **Coloured cubes**: stretch along the object's own axes. **White cube**: scale evenly.
- **Alt + drag** on the ground draws a yellow box; let go and every piece whose middle is inside becomes the group. Hold ctrl too to add to the group you have.
- **E / R / T** switch the gizmo: E move arrows and pad, R rotate rings, T scale cubes. The mode buttons sit in the action bar too.
- **Ctrl+click** pieces to build a group (yellow outline). The gizmo moves to the group's centre and moves, turns and scales every member together.
- **Del** deletes the whole group in one undo. The **delete group** / **ungroup** chips do the same from the panel.
- **Ctrl+C / Ctrl+V** copy and paste the selected piece or the whole group. The paste lands 1.5 m aside, already grouped.
- **Ctrl+D** is still god mode's built-in duplicate for single pieces.

## Group saves (one line in your world)

Pieces in a group are often run by the room's server, so the gizmo can't save them from your client. Hook the helper into your place's sim.js (no `cadence` export, so it runs every tick) and grouped moves stay smooth mid-drag and save as one undo:

```js
import { applyAdvMoves } from "../../mods/advanced-transform/lib/adv-move.js";
export function tick(ctx) { applyAdvMoves(ctx); /* …your own tick… */ }
```

Without it, the piece you grab still moves and saves; the rest of the group may snap back.
