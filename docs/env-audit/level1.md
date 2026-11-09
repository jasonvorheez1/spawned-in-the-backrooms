# Level 1 — Habitable Zone: environment audit

Lore card mw84fn759v8j8: endless damp concrete car park, downstand beams, red sprinkler pipes, orange cable trays, white ducts, banded pillars, M.E.G. camp with tents, cots, map board and lanterns, way down to Level 2. No hum, no stalker. Everything below stays inside that.

## Inspected
- places/level1/sim.js, cells/*.scene, scripts/level1-geo.js, level1-details-geo.js, level1-props-geo.js, meg-camp-geo.js, scripts/lib/level1.js.
- Looked (helper eye, eye height 1.6 m, dev room): camp from spawn, map board, back-wall breach to Level 0, Level 2 door, pillar hall.

## Ranked offenders found
1. Level 2 exit door: box slab + world-panel sign (most important exit). REPLACED.
2. Back wall home to Level 0: box wall with a flat wallpaper panel. REPLACED.
3. Camp map board: procedural boxes; a lantern sphere sat inside it and blew it out white. REPLACED + lamp removed.
4. Pillars: sharp untextured boxes with a flat colour band. IMPROVED.
5. Ceiling pipes and sprinkler mains: square-section boxes. IMPROVED (round).
6. Corridor door frames (box steel frames), downstand beams, ducts, cable trays: boxes, architecturally right for hollow-metal frames and cast beams. KEPT.
7. Level 2 exit dressing (28 primitives tagged l2-entrance in cells/x1z0.scene): hazard frame boxes with CSS stripes, cylinder drum, cone, box toolbox/pallet/cartons, 480V box, mat, torus valve and lamp guard. REPLACED (13 models, 3 sub-parts removed).
8. Storage racks (box uprights/planks in level1-geo.js): OPEN.

## Replaced (Blender, art/level1/build.py + paint.py)
- l1-onward-door → l1_firedoor.glb (3,660 tris): steel fire door, frame, push bar, closer, vision panel, "2". Same id, trigger l1-onward untouched, box collider.
- l1-backwall (new id) → l1_backwall.glb (9,244 tris): cinder-block wall with ragged breach showing Level 0 wallpaper, rubble. Old wall removed from level1-geo.js. Static collider.
- l1-mapboard (new id) → l1_mapboard.glb (1,490 tris): rolling cork board on steel stand, map, pins, clipboard. Old board removed from level1-props-geo.js. Box collider.

## Replaced: Level 2 exit dressing (Blender, art/level1/props.py + props_paint.py)
Same ids (object/xed748b99acfa6386/<n>), same positions, native-size meshes:
- /0 /1 hazard jamb posts → l1_hazpost.glb; /2 lintel → l1_hazlintel.glb (static box colliders kept).
- /20 drum → l1_drum.glb (rim /21 removed, in mesh); /23 cone → l1_cone.glb (base /24 removed, in mesh).
- /22 toolbox, /25 pallet, /26 /27 cartons, /14 480V disconnect (yaw -90, label in texture), /17 grated mat, /6 lamp guard, /12 handwheel valve (roll 90, stem /13 removed).
- Kept as primitives (architecturally right): pipes/conduit cylinders, floor hazard stripe plane, wet-stain decal, sign board, bulb sphere.

## Improved (code geometry)
- Pillars: chamfered cast-concrete prisms with conjured texture-painted-concrete-column-scuffed, worn sector band, dark kick plinth (lod ≤ 2; far levels keep boxes).
- Ceiling pipes (level1-geo) and red sprinkler mains/branches (level1-details-geo): round tubes.
- Camp lantern that sat inside the map board removed (sim envV 2).

## Migration
- sim.js place.state.envV: 1 swaps the door, spawns wall + board (guarded by existence, no duplicates); 2 removes the old map lamp. Fresh rooms never spawn that lamp.

## Verified
- Looked after: map board reads (map, CAMP, LV2 route), breach reads, door reads, pillars textured with chamfers, round red pipes and white ducts draw (pipe ReferenceError fixed: details use the imported tube).
- traverseCheck (readOnly, dev room): spawn side → back trigger traversable; corridor → onward door traversable; past the map board traversable.
- Looked after exit dressing (eye 1.6 m at x115 facing the door): every new prop reads at correct scale, seated on the floor, disconnect and valve face the room; no floating or clipping seen.
- traverseCheck after exit dressing (readOnly): l1-from-l2 → l1-onward, (114,-20) → l1-onward, (115,-17) → l1-onward, l1-from-main → l1-back: all traversable.
- Not done: a played walk with a test body; trigger firing not exercised.

## Still open
- Storage racks in level1-geo.js still box uprights/planks.
- Exit sign board (/3) is a box with an HTML panel.
- Rubble at the breach reads a bit low-poly white.
- Level 2.1 world-panel steer: not in this lane, nothing touched.

## Changes
- art/level1/build.py, paint.py: three GLBs built and uploaded.
- places/level1/sim.js: envV 1/2 migration (door model, back wall, map board, lamp removal).
- scripts/level1-geo.js: old wall removed, chamfered textured pillars, round ceiling pipes.
- scripts/level1-props-geo.js: old map board removed.
- scripts/level1-details-geo.js: round sprinkler pipes; undefined pipe() → tube().
- art/level1/props.py, props_paint.py: 12 exit-dressing GLBs built and uploaded.
- places/level1/cells/x1z0.scene: 13 placements swapped to those models, 3 sub-parts removed.

## Load check (readOnly, place level1)
`["l1-onward-door","l1-backwall","l1-mapboard","l1-back","l1-onward"].map(id => !!ctx.place.objects[id])` → all true.
`Object.keys(ctx.place.objects).filter(k => k.startsWith("object/xed748b99acfa6386/") && ctx.place.objects[k].model).length` → 13.
