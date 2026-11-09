# Level 0 (places/main): environment audit

Lore card mw84fjaf6g9cl: endless mono-yellow rooms, damp carpet, fluorescent hum, irregular segmented rooms, arches, stairs to nowhere, safe-room almond water. Nothing below adds canon.

## Inspected
- Looked at in the scene (dev room, eye 1.6 m): hub/spawn room, safe-room table, box corner, cot, arch hall, ceiling grid and troffers.
- Read: scripts/level0-geo.js (maze shell: walls, arches, ceiling, troffers, floor), places/main/cells/*.scene placements (mostly scripted + model rows), places/main/sim.js stairs/furniture/loot generation.
- Not touched: places/tutorial0, places/intake (tutorial beats, HALOGEN, Phoebe doorframe glimpse as they were).

## Ranked findings (most visible first)
1. Ceiling troffers blew out into white ovals (emissive ~2.4x): read as blobs, not fixtures. FIXED.
2. Safe-room furniture (hub/table, hub/cot, hub/lamp, hub/box0-3) was primitive stacks. REPLACED with Blender meshes.
3. hub/rug was a flat coloured slab. RETEXTURED (worn oriental rug).
4. Maze walls/pillars: flat damask slabs with baseboard. Architecturally right for drywall partitions; kept.
5. Stairs to nowhere (sim-generated, scripts/stairs-geo.js): OPEN. A Blender stair (art/level0/build.py, uploaded) exists but is not placed; its proof read awkward.
6. Shifting-wall boxes and far-LOD maze hull: OPEN (level 5 still draws ~200k tris of 279k).

## Replaced (Blender, art/level0/build.py, material slots with real roughness)
- hub/table: folding laminate table, steel legs, 1,176 tris. Bottles and note child kept.
- hub/cot: aluminium camp cot, canvas, blanket, pillow, 2,976 tris.
- hub/lamp: brass floor lamp with shade, 2,904 tris. Light child kept.
- hub/box0-3: taped cardboard boxes, 636 tris, cardboard slot textured; box2 seated on the box under it.
- All keep their ids and tags, static box colliders sized to the mesh.

## Improved
- scripts/level0-geo.js: troffer emissive cut to [1.55,1.45,1.15]x boost, so panels read as rectangular fixtures; LOD 1 adds T-bar, dark lip and occasional lens marks.
- hub/rug: texture + thin box.

## Verified
- Looked: troffers rectangular, table/bottles/note, stacked textured boxes, cot (after the changes).
- Measured (traverseCheck/findPath, dev room): spawn to hub corners clear; findPath from spawn reaches within ~2 m of stairs at (63,-14), (63,2), reaches (-5,30). Straight-line checks are blocked only by maze walls (expected).
- Not walked with a player body. Changes were placed in the dev room; creator's room not checked.

## Still open
- Stairs-to-nowhere mesh swap; far-LOD maze triangle count; zone variants (red/dark) not re-inspected.
- Level 2.1 world-panel steer: not in this lane, nothing changed.

## Change lines
- level0-geo.js: troffer glow and LOD-1 fixture detail.
- hub/table, hub/cot, hub/lamp, hub/box0..3: Blender meshes.
- hub/rug: texture.
- Load check (readOnly, place main): ["hub/table","hub/cot","hub/lamp","hub/box0","hub/box1","hub/box2","hub/box3","hub/rug"].filter(id => ctx.place.objects[id]?.model || id==="hub/rug").length === 8
