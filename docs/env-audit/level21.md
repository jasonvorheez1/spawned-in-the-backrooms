# Level 2.1 "Locked" (Base Alef): environment audit

Lore source: RESEARCH0BOOK card mw9hubrurbpxx (hot, humid storage halls; two-tone green/cream over white block; orange wood doors; EXIT signs; gutted M.E.G. Base Alef; Refrigerator Paradise; The Edges caves; stair to Level 2, cave mouth to Level 8).

## Inspected
- places/level21/config.yaml, sim.js (revisioned rebuild, clears every `l21-` id before relaying), cells/x0z0.scene, scripts/level21-geo.js (one scripted shell mesh), scripts/lib/level21.js (30x30 cells, 4 m, H 3.1), art/level21/*.py.
- Looked live (room crew-c660abe6, eye height 1.6-1.8 m): quarters, sorting room, locker room, stair landing, The Edges lane and its EXIT signs, plus an aerial of the geo mesh.

## Ranked offenders found (most visible first)
1. Quarters bunks: box-built in level21-geo.js (bunkBed) -> replaced.
2. Sorting table + Saltine cartons: box slabs in geo -> replaced.
3. Locker-room benches: box planks in geo -> replaced.
4. Sandbag walls at the stair, coil cooler, plunger, specimen case, saltines prop: primitive stand-ins in sim.js -> replaced.
5. EXIT signs in The Edges: panel sized by CSS (engine refused it), back face drew stacked/flipped -> fixed.

## Replaced (Blender, art/level21/props21.py, uploaded glb, static box colliders)
- l21-bunk-0..5: steel tube bunk, ladder, mattresses, pillows, blanket.
- l21-sorttable: steel-leg plank table with carton rows (centre left empty for the interactive saltines).
- l21-lkbench-0..1: locker bench, slatted top, pedestal feet.
- l21-sandbags-0..1, cooler, plunger, specimen case, saltines: their own Blender models (same ids/tags/state).
- Matching box geometry removed from scripts/level21-geo.js so nothing doubles.

## Improved
- l21-edge-exit-*: size now on the root (width="0.42m" height="0.16m"); the back is a child panel turned 180 so EXIT reads right from both ends.
- sim V 28 -> 30 (29 props, 30 signs); rebuild clears what it laid.

## Verified
- Looked: bunks, sorting table, benches in place, floor-seated, no clipping seen; EXIT reads from both directions.
- Measured (findPath from spawn -55.6,0.1,2): cave exit to Level 8, The Edges, quarters, sorting room all ok; stair trigger l21-down reachable.
- Place census after rebuild: 1086 objects.

## Still open
- level21-geo.js shell is still 170k-186k tris at every LOD (no far level); walls/ceilings are textured flat planes (architecturally fine) but trim is thin.
- Pipes and cable trays in The Edges are faceted cylinders; vault rock reads low-poly up close.
- Arrival bundle warning 1.8 MB (shared scripts, not this lane's).
- Not checked in the creator's room, only crew room.

## Changes (one line each)
- art/level21/props21.py: sorttable(), lbench(), bunk ladder fix.
- places/level21/sim.js: L21M model roster, Blender props, EXIT sign root size + back child, V 30.
- scripts/level21-geo.js: removed box bunks, benches, sorting table.

## Load check (readOnly, place level21)
`return ["l21-bunk-0","l21-sorttable","l21-lkbench-0","l21-sandbags-0","l21-edge-exit-22"].filter(i => ctx.place.objects[i]).length` -> expect 5.
