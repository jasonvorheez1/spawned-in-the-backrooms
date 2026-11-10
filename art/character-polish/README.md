# Character polish — Blender 4.5

Human heads retain the existing rig, skin parts, facial hair, blush, and expression targets. Nose/cheek refinement is applied to every facial target; teeth rest behind the lips. The iris has a dedicated UV per eye. Hair consists of closed smooth locks bound to Head, with separate under-hat fits. Seven core furry species retain their existing proportions, eyes and expressions with softened surfaces and smooth normals. Existing species remain loadable; only the creator/new random pool is curated.

Inputs are pinned in inputs.json; shipped CDN outputs are in assets.json. Never store binary art in the world tree.

Rebuild in an external cache folder:
1. Download the input GLBs by replacing `/cdn/value.<sha>.glb` with `https://spawnfile.io/dev/magic-assets/v5/values/<sha>.glb`.
2. Install @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions and meshoptimizer in that cache; run decode-core.mjs there on the fourteen species GLBs.
3. Run Blender `-b --factory-startup --python-exit-code 1 --python build.py -- <cache> human`, then stages `hair` and `fur`.
4. Run pack.mjs in that cache. It asserts that mesh names, primitive counts and expression target names survive compression. Upload the packed GLBs and out/anime-iris.png using the Spawn asset door; update CDN references together.

The two authored Omega NPC looks distinguish an alert scout in agency colors from a warm ponytailed medic in ivory, charcoal and red. Existing lore, schedules, dialogue and authored species are retained.

Validation: Blender neutral face renders; compressed asset structure checks; creator/species/face tests. Clothing assets are separate and retain their current references. In-game performance and every outfit/expression combination need separate playtesting.
