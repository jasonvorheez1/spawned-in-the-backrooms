# Kiln: prompt to Blender pipeline

**Kiln** is how a sentence becomes a finished game model. You describe a thing ("a velvet reading chair, a little worn"), and Kiln takes it through concept, design sheets, a sculpted high-poly, a clean game mesh, baked PBR maps, export and placement in your world. Researched against Blender 5.1 and the Blender 5.2 LTS manual; links mark where each step was checked.

**The rule behind it:** no code-box "potato" props. Hero pieces are sculpted, then baked onto a light, clean game mesh.

**Pure Blender.** Every mesh is modelled and sculpted by hand in Blender. No AI mesh generators (Tripo, Hunyuan3D, Meshy and the like) at any step. Painted concept art is fine; the geometry is ours.

### How to use it
- **Just ask Savi for a model.** "make me a chair for the reading nook" is enough. With *Savi follows Kiln* on (Slate → Settings → Kiln) she runs these steps without being told.
- **How deep** (Kiln → *how deep*, read from `world.state.kiln.depth`, default *light*): **off** = Savi builds her normal way and skips this page; **light** = brief, concept, one proof render, checked in game, no crew; **full** = every step below, a wisp crew where it helps, a review at each stage; **extreme** = research every part, modular parts, several candidates per stage judged by a critic, a review after every step. Savi checks it before any asset ask, from chat or from Kiln.
- **Gates** (marked **Gate** below) are where she stops and shows you something to approve. Turn *pause at gates* off and she keeps going, showing you the results as they land.
- **Edit this page** to make Kiln yours: change budgets, add a material technique, add a gate. Your edited copy is saved with this game; *reset* brings back Slate's default.
- A quick prompt shape that works: **what it is · where it stands · size · mood or materials · anything it must do** (open, sit, glow).

### Engine limits (read before any art)
Kiln's **Engine limits** page (`mods/slate/docs/kiln/ENGINE-LIMITS.md`, or the game's own copy at ``) is read before step 0. Its 3D table wins over what Blender can do: **1024² textures (2048² for a close hero, never 4K)**, standard PBR only with every Cycles trick baked, one material where it can be, hero under ~1.2 MB, no Draco / KTX2. When a step below wants more, stop and say so.

---

## 0. Prompt and brief (before any art)
- **Read the prompt back as a brief:** what it is, where it stands, real size, materials, mood, what it does. Anything missing gets one question, or a sensible default said out loud.
- Pull the game's own style (its palette and look file, its existing models) so the new piece belongs.
- **Scope sheet** per room: every item, its real-world size in metres, where it stands (world x/y/z, which surface it sits on), what touches it, whether it moves or animates, and whether a body collides with it.
- **Budgets.** One pass in frame should total about half a million tris, so plan from that:

  | class | game tris | textures | example |
  |---|---|---|---|
  | big hero furniture | 5–8k | one 1024² set | bed, sofa, wardrobe |
  | mid prop | 1.5–3k | 512² | table, lamp, crate |
  | small prop | 300–1.5k | 256–512², or a shared atlas | mug, pot, succulent |
  | fur, foliage cards | 1–3k | 512² alpha | rug fringe, pothos |
  | character | 10–20k | 1–2k | NPCs, creatures |
- **Texel density target:** about 512 px/m for props seen from 1–3 m (first-person interiors). Small props share atlases so the room doesn't load 40 textures.
  ↳ https://bitsoulhosting.com/marketplace/blog/texel-density-game-assets-texture-resolution-guide
- **Silhouette features:** the 3–5 shapes that make it read from where the player stands (a lamp's cone shade and thin neck, a chair's wing back and splayed legs). The silhouette gate checks these.
- **Play size:** how tall it stands on screen in pixels from the usual spot (a 1080p screen, the player's eye at 1.6 m, at the usual distance). That is the size every silhouette check runs at.
- **Wear (ask it up front, like size):** how lived-in is this? Pick one level: **new** (factory clean), **lived-in** (handled edges, a little dust), **worn** (chips, grime in the crevices, faded where the sun hits), **wrecked** (heavy grime, rust, cracks, missing chunks). Then tick the kinds that apply: dust, grime, edge scratches and chips, rust, moss and lichen, sun fade, water stains, soot. Last, ask: **one look or stages?** Stages means the same mesh ships with one texture set per wear level (e.g. new → worn → wrecked), so the game can age it by swapping sets. Write the answer into the brief as `wear: { level, kinds, stages }`.
- **Plan the stages in the brief:** name every stage you may want (e.g. lived-in, worn) and, for each, which parts it touches and the mask behind each effect: cavity/AO → grime, convex curvature → chips and polish, world-up → sun fade and dust, height from the feet → moss and damp (e.g. chips on the cap rim only, the knit washes clean). Receipt: `wear: { level, kinds, stages, stageMaps: { <stage>: { base, orm, normal?, glb } } }`.
- **Model the wear only when the silhouette changes:** a snapped leg, a burnt-through hole, a sagging seat, a missing plank. That damage goes into the high-poly (step 4), or into a separate damaged mesh if it's a stage. Everything else is texture, driven by masks (step 8b).
- **Family (pick one, write it in the brief and the receipt as `family:`):** trees, humans, creatures, buildings, vehicles, soft goods, hard props. The steps below are the spine every piece walks; the matching **Family** card near the end of this page says what changes in which step, its budget and its own gate. A piece that is two families (a cart with a canvas cover) takes the card of what it mostly is and borrows the other's gate.
- **Naming:** `<room>-<item>` (e.g. `den-chair`), with `_high`, `_low`, `_cage`, `_collision` for the stages. Texture files are `den-chair_basecolor / _normal / _orm / _emissive`.

## 1. Concept (creator approves it)
- **→ Slate log: start** as the work begins (ticket in doing, Loom page, brief), and **→ Slate log: concept** once it's painted.
- Paint the piece (or the whole room, for a room's worth of props) at the camera height the player sees it from, in the game's own palette and style.
- **Gate:** the creator approves the concept before anything gets modelled.

## 1b. Asset list (from the approved concept)
- Walk the concept image corner to corner and list **every visible object**, as a table: id, where it sits in the concept, materials, tri budget, wave.
- Sort each row into **hero model**, **kit** (one model placed many times: books, pots, frames), **shell** (part of the room geometry) or **FX/light**.
- Waves: the big silhouettes first (W1), dressing second (W2). The list is the build's checklist and the verify lane's contract.
- One prop alone still gets a one-row list: its budget and wave are what the checks measure.
- **Kit pieces snap to one grid.** Pieces that join (shelves, panels, wall trims, pipe runs) share a module (e.g. 0.25 m), their origins on grid corners and their ends cut square to it, so placing them is snapping, not nudging. The grid size goes in the list.

## 2. Per-item design sheets (turnarounds)
**The source rule (never broken).** A turnaround is the *target*, so it is only ever made from:
- **sourced reference**: real photos or art of the thing or its materials (own or CC0, each link kept), or
- **new concept art**: front, side, back and ¾ painted *from the approved concept image*, the whole piece or one part at a time.

It is **never** made from a model: no render, viewport grab, in-game `look`, bake or screenshot of any mesh, ours or an earlier version, goes into a sheet, even as a paint-over base. A sheet traced from the model can only ever match the model, so quality stops rising.

- **→ Slate log: sheets** for every sheet, detail sheet and research picture, with the research links on the asset's Loom page.
- One sheet per item: **front, side, back and ¾** views, orthographic, plain background, even light, consistent scale, painted with the room concept as reference.
- **Parts:** a complex piece (a lamp: shade, neck, base; a chair: frame, cushion, feet) gets a **part sheet per part**, each painted from the concept. Parts are modelled and checked on their own, then recombined.
- **Extra research point.** When a sheet can't show a detail (knit stitch, tufting, a hinge, how fur clumps), paint a **close-up detail sheet** for that piece, and gather real photo references of the material.
- **Provenance on every sheet:** its receipt says `turnaround.source: "concept" | "reference"` and lists `turnaround.from[]` (the concept image, the photo links). A sheet with no source, or a source that is a model render, fails the gate.
- **Sheets are locked once approved.** A revision repaints from the concept or new reference; it never re-derives the sheet from the current model. Model renders are **proofs**: they live in `render[]`, never in `turnaround.sheet`.
- The sheet is what the model gets checked against at every proof render, the first one and the tenth one. Each revision is measured against the sheet, never against the last model.
- **Gate (big pieces):** the creator sees the sheets, with their sources, before sculpting starts.

## 3. Blockout (base mesh)
- Load the approved sheets as **orthographic reference image empties** (front, side, back), aligned to the real size, and model against them.
  ↳ https://docs.blender.org/manual/en/latest/modeling/empties.html
- Model to real size (metres, scale applied), origin at the bottom centre, front toward Blender −Y (it exports as glTF +Z).
- Match the silhouette to the sheet's front and side views first. Proportions beat detail.
- Check the blockout in the game at its spot before sculpting, so scale problems show up when they're still cheap to fix.
- **Pivots and sockets now.** Everything that turns gets its pivot where it really hinges (a lid on its hinge line, a drawer at its back, a door on its jamb). Anything the game hangs things on gets an empty named `SOCKET_<what>` (`SOCKET_hand`, `SOCKET_flame`, `SOCKET_seat`) so the game attaches by name, not by guessed offsets.

## 3b. Silhouette gate (nothing gets detail until this passes)
- **→ Slate log: proof** with each compare sheet and its numbers (again at steps 7, 14).
Most wasted work is detail sculpted onto the wrong shape, so the blockout earns its detail with numbers, not a glance.
- Render the blockout as a **flat black matte** (no light, no texture) from the sheet's front and side views, orthographic, and once from the **player's eye** in the room.
- The sheet side of every compare is the **approved sheet** (step 2), never an earlier model render.
- Make a clean matte of the sheet's matching views: erase labels, rulers, floor lines and anything the model doesn't include.
- Score each pair with the scorer in **Appendix: silhouette-gate.py** at the end of this page (written out once to ``): `python3  sheet.png render.png --px <play size> --json view.json --compare compare.png`. It gives the **overlap** (1.0 = the same shape), the **width in 8 bands** bottom to top and the aspect, and writes a compare sheet (amber where the sheet has shape the model lacks, teal where the model has extra).
- **Pass:** overlap ≥ 0.85 and every band within 0.05 at blockout; ≥ 0.90 and 0.03 when the retopo is checked against the high-poly (step 5).
- Write misses as **measurements**, not adjectives: "shade 12% too wide", "legs 3 cm short". Fix, re-render, re-score.
- **Squint test at play size:** the matte at its on-screen pixel height, beside the player for scale, must still say what it is with every silhouette feature visible.
- Check the **extreme state** too: the drawer pulled, the lid open, the door swung, the cushion squashed. The shape there is part of the silhouette.
- **Kits and lineups:** pieces seen together get one lineup render at true relative scale; siblings differ in shape, not only colour.
- A side the sheet never showed (the back of a wardrobe against a wall) is listed as **inferred**, never claimed as matched.
- **Proportions come from the measured sheet, never from brief words.** Before the blockout, measure the sheet mattes into `targets.json` (aspect, 8 band widths, key ratios: knee height / body height, limb thickness / body height, part length / total). A brief quotes those numbers; an adjective ("knees high", "slender legs") never sets a size.
- **No scorer, no pass.** If the scorer is missing, the step stops until it is restored; "matches by eye" is not a gate.
- **Extreme depth:** three blockouts by three different techniques, side by side; a critic that did not build them picks one by numbers and eye.
- **Sheets cover every view the scorer and detail need:** front, side, back, top, both 3/4s, and a part sheet for each complex part (legs, head) before modelling starts.
- **Gate:** the compare sheets and numbers go to the creator for big pieces; small props pass on the numbers.
  ↳ method adapted from blender-game-skills' gated image-to-3D flow (https://github.com/majidmanzarpour/blender-game-skills)

## 4. High-poly: the right tool for each material
- **Start from the approved blockout**, duplicated and named `<id>_high`. The blockout stays as the base for the low-poly.
- **Split into parts** the way the part sheets do (frame, cushion, feet). Each part is its own object, so it can be sculpted, simulated and baked on its own.
- **Pick the technique per part** from the table below. Research any material not in it before starting.
- **Hard parts first:** support loops or bevels on every edge that catches light, then a Subdivision Surface (level 2–3). Edges that read sharp in the game get a real bevel, about 1–3 mm, never a knife edge.
- **Soft parts next:** cloth sim or sculpt. Apply the sim at the frame that matches the sheet, then a Multiresolution modifier for folds, creases and seams.
- **Detail pass with real scale brushes:** Draw Sharp / Crease for seams, Clay Strips for form, Pinch for hard folds. Medium detail (folds, dents, chips) goes in the sculpt; pores, grain and weave go in the texture or a baked height.
- **Wear and story:** chips on edges people touch, softened corners on old wood, sag where someone sits. Pick from the brief's age and care.
- **Proof against the sheet** from front, side and ¾ at the sheet's angles. The high-poly must match the sheet's shapes before retopo starts.
- **Apply everything:** sims, modifiers, Geometry Nodes ending in Realize Instances. No live modifier goes into the bake.
- **Gate (big pieces):** the creator sees the high-poly proof beside its sheet.
  ↳ https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/multiresolution.html · https://docs.blender.org/manual/en/latest/sculpt_paint/sculpting/index.html · https://docs.blender.org/manual/en/latest/physics/cloth/index.html

Box modelling only handles hard goods. Blender's simulation and procedural tools cover the soft stuff:

| material | technique | research |
|---|---|---|
| **Pillows, cushions, mattress** | Cloth sim with **pressure** on a subdivided cube, pinned seams, then a multires sculpt for creases and piping | https://www.daz3d.com/blog/back-to-basics-modeling-a-blanket-and-pillow-using-cloth-simulations-in-blender · https://docs.blender.org/manual/en/latest/physics/cloth/settings/shape.html |
| **Blankets and throws draped over furniture** | Cloth sim dropped onto a collision proxy of the bed or sofa, then apply the frame and sculpt hero folds | https://www.tripo3d.ai/blog/collect/how-to-create-realistic-blankets-using-blender-cloth-physics-kxwbe-lj9om · https://vkgamedev.com/blog/sculpt-clothing-folds-blender-zbrush |
| **Cable knit, chunky knit** | Geometry Nodes knit stitch along curves, or a knit displacement on the high-poly, then **baked to normal** | https://www.blendernation.com/2024/10/07/creating-a-looping-knitting-effect-in-blender/ · https://www.youtube.com/watch?v=P3aNRRswE5Q |
| **Velvet, channel tufting, buttons** | Multires sculpt with a crease brush along the channels, button pinches as instanced studs | https://vkgamedev.com/blog/multires-modifier-blender-sculpting |
| **Fur: sheepskin, shag rug** | **Hair curves** with Geometry Nodes fur (Interpolate / Clump / Curl / Frizz nodes), then baked to normal + alpha **fur cards**, with a sculpted lumpy base under them | https://imeshh.com/blog/creating-the-perfect-rug-in-20mins-blender-42 · https://www.blendernation.com/2023/06/05/directing-fur-hairs-with-curves-using-geometry-nodes-tutorial/ · https://yelzkizi.org/create-hair-cards-in-blender/ |
| **Foliage: pothos, fern** | Sculpt one hero leaf, bake it to a card atlas, scatter cards along curve vines with Geometry Nodes | https://www.blendernation.com/2021/11/15/blender-geometry-nodes-3-0-plant-growth-with-fields/ |
| **Wicker, macrame, rope** | Curves with a profile, Geometry Nodes weave or twist, then baked | https://bazaar.blendernation.com/listing/twisting-cables-blender-geometry-nodes-tutorial/ |
| **Hard goods: wood, brass, glass, ceramic** | Subdivision modelling with support loops and bevels. Wood grain and brushed metal go into the texture | |
| **Wear and damage** | qm tools (edge_wear, cracks, chunks) or an SDF boolean. Cycles-only effects (pointiness, AO wear) must be baked or they won't export | workshop `blender-game-assets` |

Every tool that makes geometry ends with **Realize Instances** and an applied state before baking.

## 5. Retopology: the clean quad game mesh
- **Quad-dominant, even edge flow, no ngons.** Triangulate only at export (or let glTF do it). Loops follow silhouette edges and fold lines, so normals stay smooth.
- Tools: **Quad Remesher** / the QRemeshify add-on for organic shapes, Shrinkwrap + Poly Build for hand-tuned areas, and the base mesh re-used when it's already clean.
  ↳ https://superrendersfarm.com/article/quad-remesher-blender-retopology · https://garagefarm.net/blog/retopology-a-comprehensive-guide-to-3d-model-optimization
- Detail smaller than about 1 cm lives in the normal map, not the mesh. Polygons go where the silhouette needs them.
- **Check:** the tri count is within budget, and the low-poly passes the silhouette gate against the high-poly (overlap ≥ 0.90, bands within 0.03) at play size.

## 6. UVs
- Seams sit on hidden or hard edges. **Mark sharp on UV seams** (hard edges must be split in UV or the bake will show bands).
- Uniform texel density, about 8–16 px padding at 1k, straightened shells for wood grain, and mirrored or stacked shells only where nothing unique is lost.
  ↳ https://studio.blender.org/blog/a-uv-unwrapping-guide/ · https://nastyrodent.com/uv-unwrapping-for-games/

## 7. Baking (Cycles, Selected to Active)
### Maps explained: normal, bump, height, displacement
| map | what it holds | where it lives |
|---|---|---|
| **Height** (greyscale) | how far each pixel sits up or down: white up, black down | authoring only. Feeds a Bump node or a Displacement modifier |
| **Bump** (Blender's Bump node) | turns a height map into fake lighting at render time | authoring only. **The game never sees it** |
| **Normal** (the purple one) | which way each pixel faces, already worked out for the light | **ships in the .glb.** The only surface-detail map glTF and the engine read |
| **Displacement** | height that really moves the mesh | the high-poly sculpt only. Its shape gets baked into the normal |

- **The rule:** use as much bump, height and displacement as you like while authoring, then **bake it all into one tangent-space normal map**. That one map ships.
- **Stacking them in Blender:** Image Texture (normal, Non-Color) → **Normal Map** node → the **Bump** node's *Normal* input; the height map goes into Bump's *Height*; Bump's output → Principled BSDF *Normal*. Fine grain (wood pores, fabric weave) rides on top of the baked detail.
- A Bump or Displacement node left in the final material is **dropped on export with no warning**. Bake it, then remove it.
  ↳ https://docs.blender.org/manual/en/4.2/render/shader_nodes/vector/bump.html · https://docs.blender.org/manual/en/4.2/render/shader_nodes/vector/normal_map.html · https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html · https://texturemap.app/blog/normal-map-vs-bump-map

### The bake
- **Maps:** tangent-space **Normal** (OpenGL, which glTF expects), **Ambient Occlusion**, **Base Color** (from the high-poly's materials or vertex paint), **Roughness**, **Metalness**, and **Emission** where it glows. When the brief's wear is above **new**, also bake the **wear masks** (step 8b): curvature, cavity, AO and a world-up mask. They cost one bake and drive every wear level.
- Use a **cage** (a duplicate of the low-poly pushed out along its normals) or tune Extrusion + Max Ray Distance. Weighted-normal / smooth shading on the low-poly before baking.
- Every material needs an **active Image Texture node** pointed at the target image, or the bake comes out black. Normal / ORM / roughness images are Non-Color, base colour is sRGB.
- Bake at 2× resolution and downsample (cleaner edges), then dilate margins (16 px).
  ↳ https://docs.blender.org/manual/en/latest/render/cycles/baking.html · https://www.strayspark.studio/learn/tutorials/bake-high-poly-to-pbr-maps-blender
- **Check:** no waviness, skewed details or black blotches in a matcap render of the low-poly carrying the normal map.

### Normal-bake checklist (learned the hard way)
- **Cage:** never one flat push per piece. Clamp each vertex's push to about half the local edge length on tight curves and smooth it, or use Cycles extrusion with max ray distance about 2× the push. Folds and overhangs are where a flat cage self-intersects or misses.
- **Miss check after every bake:** un-hit texels, or tangent normals with z < 0.25, go back to flat (0.5, 0.5, 1) with a small blur. Dilate UV islands about 8 px. Never fill gutters with the map's mean colour.
- **Save normals as lossless PNG,** Non-Color, OpenGL +Y.
- **Bake selected-to-active per piece,** so a throw never steals the duvet's rays.
- **Fix geometry before the bake** (lift overlapping cloth, drop fringe cards). Never patch maps afterwards.
- **No bump left behind:** before export, every material's node tree has no Bump, Displacement or procedural texture feeding *Normal*; only the baked normal through a Normal Map node. Compare a Cycles render with the bump on against the glTF in the game: the detail must match.
- **Gate:** a live close-up at grazing light on every folded surface. Black or noisy patches mean the bake failed; "the model landed" is not a pass.

## 8. PBR texturing
- **Base colour carries no lighting.** Realistic albedo range is about sRGB 30–240. AO goes in its own map, multiplied lightly at most.
- Roughness guide: polished brass 0.25–0.35, brushed brass 0.4, varnished oak 0.45, ceramic glaze 0.2, velvet 0.8 with sheen, wool and knit 0.9, glass 0.05 (transmission).
- Pack **ORM**: R = occlusion, G = roughness, B = metallic. That's what glTF and three.js read.
  ↳ https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html · https://www.khronos.org/blog/art-pipeline-for-gltf
- Fabric extras: **sheen** (KHR_materials_sheen) for velvet. Glass: transmission / IOR. Exported from the Principled BSDF.
  ↳ https://generalistprogrammer.com/tutorials/substance-painter-game-texturing-complete-pbr-workflow

### Values pass (before the texture is done)
- View the base colour, then a render, in **greyscale**. The silhouette features from step 0 must still separate by light and dark, not only by hue.
- Keep a clear value step between parts that touch (shade vs lamp body, cushion vs frame); the game's warm lamps and colour grade squash hue far more than value.
- Albedo stays inside the usual PBR range (no pure black, no pure white) so the game's light has room.

## 8b. Wear and grunge layers (from the brief's wear)
- **Masks first, baked once** from the high-poly onto the low-poly UVs, all Non-Color greyscale:
  - **curvature** (convex edges are where hands and knocks chip paint and polish wood smooth),
  - **cavity / AO** (crevices and corners are where dirt and grime collect),
  - **world-up** (the normal's Z: dust, snow and moss settle on top faces),
  - **a large-scale noise** (breaks it up so the wear isn't evenly painted on).
- **Each wear kind is one layer in the material:** a colour or roughness change, blended in by a mask combination. Edge chips = curvature × noise, showing the under-layer (bare wood under stain, metal under paint). Grime = cavity × noise, darker and rougher. Dust = world-up × cavity-inverse, paler and rougher. Moss = world-up × cavity × noise, green and rough 0.95. Rust = curvature + cavity on metal, orange-brown, rough, metalness 0. Sun fade = world-up, a desaturated base colour.
- **Wear level = how far each mask is thresholded,** not new paint: lived-in about 15%, worn about 40%, wrecked about 75% coverage. One node group, one level slider.
- **Bake the layered result down** to the shipped base colour + ORM (+ normal if a chip has depth). No procedural wear survives export: the "no bump left behind" check (step 7) covers wear too.
- **Stages:** bake one texture set per level, named `<asset>_<level>_basecolor` / `_orm`. Same mesh, same UVs. In the game, a stage is a material swap on the model (`model.materials.<slot>.texture`). A silhouette change (the snapped leg) is a separate mesh per stage.
- **Story check:** wear goes where the asset's life puts it. Polish on the arms someone grips, grime around the feet, a sun-faded top on whatever stands by the window, nothing worn on the underside nobody touches. Evenly sprinkled dirt reads as a filter.
  ↳ https://docs.blender.org/manual/en/latest/render/cycles/baking.html · https://docs.blender.org/manual/en/latest/render/shader_nodes/input/ao.html
- **One mesh, one UV set:** a stage is a new base colour + ORM only; share the normal map unless a chip changes the shape. Prove it by re-importing both glbs: tris, verts and a UV checksum must match.
- **Bake masks on the low mesh at texture size:** AO in Cycles with distance about 10 % of the piece's height; world-up and height as an emit bake of the true normal / position; curvature from the mesh edges plus the normal map's detail. Pointiness only renders: it never bakes or exports.
- **Drive the breakup with 3D noise from the baked position,** not UV noise, so it doesn't tear at UV seams.
- **Hold each effect to its part** (chips on the outer 20 % of a rim, fade on up-facing faces only, moss below a set height) and write each mask's coverage % in the run log; chips over ~10 % of a part read as camouflage, not wear.
- **Swap images on the Image Texture node,** never by file path or a loose name match.
- **Ship a stage** as a second glb on the same mesh (proven on the toadstool stool), or as `model.materials.<slot>` texture overrides at runtime (not yet proven). Save the stage's ORM as JPEG at 1024: as PNG it doubled the file and pushed the glb over the hero cap.
  ↳ https://helpx.adobe.com/substance-3d-painter/features/smart-materials-and-masks.html · https://docs.blender.org/manual/en/latest/render/shader_nodes/input/geometry.html (Pointiness: Cycles render only)
- **Check:** render the stages side by side at the same light. Each level must read as the same object, older. Then view it at play size: if the wear disappears from the usual spot, raise the contrast, don't add more noise.

## 9. LODs
- **The engine already builds the far levels** from a welded, smooth-shaded mesh. That's why a weld before export matters: split edges stop it collapsing.
- Authored LODs only for heroes that still read wrong far away: LOD0 100 %, LOD1 ~50 %, LOD2 ~20 % (Decimate Collapse with UVs preserved, or a hand retopo), swapped with `visibleRange` on child rows.
  ↳ https://bitsoulhosting.com/marketplace/blog/how-to-create-lods-in-blender-for-game-engines · https://extensions.blender.org/add-ons/lod-gen/
- Interiors are close range, so indoor furniture usually needs LOD0 only, plus the engine's levels.

## 10. Collision
- **Never the render mesh.** Use a few boxes or convex hulls that cover what a body walks into: the sofa is two boxes (seat, back), the bed is the platform. Small props get no collider.
  ↳ https://www.pixelwolf.net/blog/collision-mesh-is-not-render-mesh-blender-game-assets-guide/
- If the room is a procedural shell, its walkable proxies can live in the shell's `collider()` export, and the prop carries `physics: none`.

## 11. Rigging (anything that bends)
- One deform armature with **Mixamo-style bone names** (what the engine's IK, grounding and clip library resolve), positive scale, no root motion, applied transforms.
- Weights proven at extreme poses before texturing. Rigify control rigs need a clean deform-only export (the "game rig tools" approach).
  ↳ https://cgdive.itch.io/game-rig-tools · https://lucky3d.fr/auto-rig-pro/doc/ge_export_doc.html
- For simple props (a hatch hinge, a turntable platter, a lid) use **no bones**: separate named nodes animated in the engine or in code.

## 12. Animation
- One **Action per clip** (Idle, Walk, Open, Spin…), pushed to NLA tracks, exported with `export_animation_mode="NLA_TRACKS"`. The engine plays clips by name.
- **Shape keys → morph targets** for soft deformation (a cushion squish, a blanket breathing, faces). Keep them few, since morphs cost memory.
  ↳ https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html · https://docs.blender.org/manual/en/latest/animation/shape_keys/index.html
- Ambient motion (a bubbling lamp, fern sway, glow pulse) is cheaper as a **material or shader animation** than as baked keys.

## 13. Export
- glTF binary (.glb), Y-up, apply modifiers, +Z front (`model: { forward: "+z" }`), and only the materials actually used. Images inside: JPEG for base colour, **lossless PNG for normal and ORM** (a JPEG normal map blocks up when the CDN re-encodes it).
- Target **under about 1.2 MB per hero .glb**, under 300 KB per small prop. The world's boot bar is about 450 KB, so props the first picture doesn't need get spawned after arrival.
- Compression research: Meshopt / Draco geometry and KTX2 textures save a lot, but the engine reference doesn't list support for them. **Open question for the Spawn team** before relying on them.
  ↳ https://gltf-transform.dev/ · https://compress-glb.com/blog/draco-vs-meshopt/

## 14. QA proof (before it goes in the game)
- **Gate:** before it goes in the game, it passes this whole list.
- Re-import the .glb into an empty scene. Measure size, tris and materials. Render a **proof spin** beside the design sheet. The proof goes in `render[]` and is never reused as a sheet.
- Run the **glTF Validator** on the .glb: zero errors, warnings read and answered.
  ↳ https://github.com/KhronosGroup/glTF-Validator
- **Export sanity:** transforms applied (scale 1, rotation 0), no negative scale, normals face outward, one UV map named for the bake, images power-of-two, base colour sRGB with normal and ORM Non-Color, normal map OpenGL (+Y green up).
- Checklist: sheet source is concept or reference ✔ · scale ✔ · silhouette (gate numbers) ✔ · engine limits (texture size, materials, file size) ✔ · quads / budget ✔ · no bake artefacts ✔ · texel density ✔ · origin at the feet ✔ · names ✔ · file size ✔.

## 15. Placement and alignment to the concept
- **Look-dev in the engine, not in Blender.** Spawn has its own lights, tone mapping and colour grade, so a Cycles render signs nothing off. The sign-off picture is a `look` in the running game, from the player's eye at the usual spot, at the place's real hour.
- In that look: the values still separate, metals read as metal (not grey plastic), emissive parts glow without blowing out, normals hold under the room's lamps, and the piece sits in the same light as its neighbours. A material that only works in Blender goes back to step 8.
- Map each item's spot from the concept to world coordinates (the camera vantage the concept was painted from gets recreated as a `look` camera).
- Place it, then compare the look **side by side with the concept** (a look with the concept as reference). Nudge until the composition matches: nothing floating, sunk or clipping walls.
- Lighting pass after placement: practical lights (lamps, candles, fairy lights) at modest intensity. No bloom blowout.
- Walk it in the game from every place a player stands to see it: the door, the seat, the far corner. Check it on a phone screen too.

## 16. Delivery and sign-off
- **→ Slate log: landed**: the in-engine look, the receipt summary, the ticket to test, the diary line.
- The creator reviews in the game. Notes go back to the right step (shape problem → step 3/4, surface problem → step 7/8, placement → step 15). A note on the *design* goes back to step 1 or 2: the concept or sheet is repainted, then the model follows it.
- Source files (high-poly .blend, bakes) are kept so a revision never starts from scratch.
- **Receipt per asset** in `studio/assets/<id>.json` (write it from step 1 and update it at every checkpoint, even when the folder doesn't exist yet: create it). Sync it at every checkpoint so Workbench, Gallery, Loom and Planner fill in as the work goes (Slate log 0a).
- **Gate: Slate filed.** `slateGate(ctx, "<id>")` passes before the asset is called landed. The keys it reads: `design.concept`, `turnaround: { sheet, source, from[] }`, `research[]`, `silhouette: { px, gate, views: [{ view, sheet, overlap, worst: { band, delta }, pass }] }` (the scorer's `--json` writes one view), `render[]`, `materials`, `values: { sheet, pass, note }`, `model: { glb, tris, lods }`, `limits: { tex, maps, mats, glbKB, tris, baked, ok, note }`, `placement: { position, rotation, look }` (look = the in-engine sign-off picture) and `inferred[]`. A missing key shows as "not yet": the step didn't run.

---

### Rock-solid: the review at every stage
- A fresh-eyes reviewer (a wisp that did not build it) checks every gate: brief, concept, sheets with their sources, blockout numbers, high-poly, retopo, bake, texture, export, placement. Savi makes the last pass before the creator sees it.
- Every stage writes its check and result to the receipt. A stage with no recorded check counts as not run.
- **Stop signs:** a sheet with no source, a model render in a sheet, a Bump node in the export material, a JPEG normal map, unapplied scale, a bake with black or noisy patches. Any one sends the piece back to its step.

### Extra research triggers (stop and research, don't guess)
- A material not in the table in step 4 → find Blender docs or a tutorial for it first.
- A sheet missing a view or detail → paint a detail sheet.
- A bake artefact that survives one cage fix → read the baking manual section again and search the specific symptom.
- Anything that moves (rig, cloth, morph) → check the glTF export docs for that feature before building it.

### Things you might not have thought of
- **Material slots named for the real surface** (`velvet_teal`, `brass_brushed`), so the game can tint or swap them.
- **Atlasing and shared trim sheets** for small props: fewer textures, fewer draw calls.
- **Vertex colour for variation** (pillow colours from one mesh and one texture).
- **Alpha mode:** MASK for fur and leaf cards (cheap, sorts correctly), never BLEND for foliage.
- **Emissive restraint:** strength ≤ 1.5, so bloom doesn't hurt eyes.
- **Proof renders kept per item** as the visual changelog.
- **Licensing:** only own or CC0 references and add-ons.

---

## Asset family cards (pick one at step 0)
- **Pick the family in the brief** (`family:` on the receipt): trees, humans, creatures, buildings, vehicles, soft goods or hard props. Each card below changes only what it names; every other step runs as written above. The family's own gate is checked before the closing gates, and its numbers go on the receipt.

## Family: trees
- **Step 0 (brief):** name the species and its age (sapling, young, mature), its real height, and how close the player gets (walk under it, or only see it across the valley). Budget: a young tree 1.5–3k tris at LOD0, a mature hero tree up to 5k; one 1024² atlas holds bark and leaves together (bark on one half, leaf cards on the other). Family's reference is a real photo of the species (CC0 or CC-BY), not a painted concept.
  ↳ https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/silver-birch/
- **Step 3 (blockout):** the trunk and branches are grown, not pushed vertex by vertex: Geometry Nodes curves (Curve to Mesh along branch curves with a radius that tapers) or a sapling/branch script; trunk 4–6 sides at the base, 3 at the twigs. The crown is a silhouette first: its height-to-width and how the branches hang (a silver birch weeps at the tips).
  ↳ https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/curve/index.html
- **Step 4–7 (high-poly and bake):** no sculpt. The bark is painted procedurally in Cycles and **baked** to the atlas (pale base, dark lenticel dashes, dark patches near the foot); check the bake numbers, not just the picture: a share of dark pixels above zero proves the marks actually came out.
- **Step 8 (texturing):** leaves are **alpha cards**: small quads carrying a picture of a leafy spray with a transparent background, Alpha mode **Clip / MASK** (never Blend: blended leaves sort wrong and flicker). 250–400 cards for a young tree; each card faces a different way so the crown has no flat sides.
  ↳ https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html
- **Step 11 (rig):** no bones. **Wind weight lives in vertex colour**: the Crysis layout: **blue** = how much this point sways with its branch (0 at the root, rising up the trunk, 1 at the twig tips), **green** = a per-branch phase so branches don't move in step, **red** = leaf flutter (0 where a card meets its twig, 1 at its free edge; 0 on bark). A wind material reads it; nothing per tick in a script. Export it as the SECOND colour set (Blender glTF export: Vertex colour = Material, Export all vertex colours on), so it lands in COLOR_1 behind a white COLOR_0: in COLOR_0 the game paints it onto the tree (black trunk, rainbow leaves).
  ↳ https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis
- **Step 9 (LODs):** LOD1 drops half the cards and the twigs; LOD2 is a few crossed cards; a **billboard/impostor only at the far LOD** (past ~60 m), never up close, and the switch is smooth so the swap doesn't pop.
  ↳ https://docs.speedtree.com/doku.php?id=compiler_billboards
- **Step 10 (collision):** the trunk only (a capsule or a few boxes up to head height); leaves and twigs never block a walker.
- **Step 13 (export):** the atlas PNG is saved as 256-colour palette PNG when it pushes the file over budget (a 1024² RGBA leaf atlas made a 1.2 MB file; palette PNG took it to 308 KB with the alpha cut-out intact). Vertex colours exported (Use Vertex Color: Active).
- **Gate (trees):** under budget tris, one atlas ≤ 1024², leaves alpha-clipped with no grey fringe, wind weights present (COLOR_1 in the .glb: blue 0 at the base, 1 at the tips; COLOR_0 stays white, because the game multiplies COLOR_0 into the paint), glTF Validator 0 errors, and a look in the game where the crown reads as the species from 10 m.
  ↳ https://github.com/KhronosGroup/glTF-Validator

## Family: humans
- **Step 0 (brief):** age, build, height in metres, clothes, what they do (walk, sit, talk). Budget: 10–20k tris for the whole body with clothes; the **face and hands get about a third of it** (they are what players look at); one 1024² set, 2048² only for a close hero.
- **Step 3 (blockout):** start from an **MPFB (MakeHuman for Blender)** base with its dials (age, weight, height, muscle), never a mesh from an AI generator. Measure the height in metres before anything else.
  ↳ https://static.makehumancommunity.org/mpfb.html
- **Step 11 (rig):** MPFB's **mixamo** rig: bone names like `mixamorig:Hips`, `Spine`, `RightHand`, which the engine reads for foot grounding, IK, held items and every library clip. Never rename bones; never scale one bone on its own.
  ↳ https://docs.blender.org/manual/en/latest/animation/armatures/skinning/index.html
- **Step 8 (clothes):** each garment is its **own skinned child** (shirt, coat, boots), weighted to the same rig, never baked into the body; the body under a garment can be removed to save tris.
- **Step 2 (sheets):** turnarounds come from the concept or reference photos, never rendered from the model.
- **Gate (humans):** the body stands its stated height in the game, plays a walk without the skin tearing at knees, elbows or shoulders, and the clothes follow the body with no skin poking through at the extreme pose.

## Family: creatures
- **Step 0 (brief):** what it is, how big, how it moves (four legs, wings, slither). Budget: at or under the character budget (≤ 20k, most animals 5–12k).
- **Step 4 (high-poly):** **sculpt** the body in Blender (Dyntopo or multires), then retopo to clean loops around the joints that bend.
  ↳ https://docs.blender.org/manual/en/latest/sculpt_paint/sculpting/index.html
- **Step 11 (rig):** its **own rig** built for its body (no human rig forced onto four legs); weights checked at the extreme pose.
  ↳ https://docs.blender.org/manual/en/latest/animation/armatures/skinning/index.html
- **Step 12 (animation):** a **keyed gait** (walk cycle as its own action), plus idle; every clip pushed down as NLA tracks so the export carries them all.
- **Gate (creatures):** under budget, the gait plays in the game without foot slide on flat ground, and the silhouette reads as the animal from the player's usual distance.

## Family: buildings
- **Step 3 (blockout):** a **modular kit on a grid** (wall, corner, door-wall, window-wall, floor tile at 1, 2 or 4 m), snapped together, so one fix changes every copy.
  ↳ https://www.gamedeveloper.com/design/skyrim-s-modular-approach-to-level-design
- **Step 8 (texturing):** **trim sheets**: one texture of strips (skirting, sill, beam, cornice) shared by the whole kit, with tiling wall textures; no unique texture per wall.
  ↳ https://www.beyondextent.com/deep-dives/trimsheets
- **Step 10 (collision):** door and window holes are cut in the mesh **and** in the collider; a door is at least 1.1 × 2.2 m; a body walks in and is stopped by every wall.
- **Step 15 (placement):** an interior floor and at least one light per room; the ground under the footprint is flattened, never floated over.
- **Gate (buildings):** walk in through the door, turn round inside every room and walk out; nothing blocks the doorway, no wall can be walked through.

## Family: vehicles
- **Step 4 (high-poly):** **hard-surface** modelling: clean panels, bevels on every edge that catches light, panel lines as geometry or a normal bake.
- **Step 11 (rig):** each wheel is its own object, its **origin (pivot) at the hub centre**, named `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr` so a script can spin and steer it.
  ↳ https://docs.unity3d.com/Manual/class-WheelCollider.html
- **Step 10 (collision):** **convex hulls**: a few simple convex shapes for the body (Mesh → Convex Hull in Blender), never the render mesh.
  ↳ https://docs.blender.org/manual/en/latest/modeling/meshes/editing/mesh/convex_hull.html
- **Budget:** a player vehicle 8–15k tris, a parked prop car 3–5k.
- **Gate (vehicles):** the wheels turn about their own hubs without wobbling, and the hull collider stays inside the visible body by no more than a few centimetres.

## Family: soft goods
- **Step 4 (high-poly):** cushions, blankets, curtains and bags come from a **cloth simulation** (pin groups hold what's tied down), then are **retopologised** to a clean game mesh; very thin or stiff things (a folded napkin) are sculpted instead.
  ↳ https://docs.blender.org/manual/en/latest/physics/cloth/index.html
  ↳ https://docs.blender.org/manual/en/latest/physics/cloth/settings/shape.html
- **Step 7 (bake):** the folds' fine wrinkles go into the normal map; the silhouette keeps only the big folds.
- **Budget:** 300–1.5k tris for a cushion or bag, up to 3k for a draped blanket.
- **Gate (soft goods):** it sits on its surface with no gap and no sinking, and the folds hang the way gravity says from where it's pinned.

## Family: hard props
- **Step 4–7 (high-poly and bake):** **bevel-and-bake**: bevel every hard edge in the high-poly (Bevel modifier, 2–3 segments), bake the rounded edges onto the low-poly's normal map so a cheap mesh catches light like a real one.
  ↳ https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html
- **Step 5 (low-poly):** or skip the bake: a small chamfer on the game mesh with **weighted normals** (Weighted Normal modifier, Face Area) so flat faces shade flat and edges stay crisp.
  ↳ https://docs.blender.org/manual/en/latest/modeling/modifiers/normals/weighted_normal.html
- **Budget:** small 300–1.5k, mid 1.5–3k, big hero 5–8k (the table in step 0).
- **Gate (hard props):** no black smudges or wavy shading across flat faces in raking light, edges catch a highlight from 1 m.

## 17. Closing gates (every workflow)
- **Engine limits:** measure the piece against Kiln's Engine limits page (sizes, formats, file size, budgets) and write `limits: { ok, note }` on the receipt with the numbers. Over a limit: stop and say so; only the creator can waive it.
- **Fresh-eyes review:** someone who didn't make it (a review wisp, or Savi) looks at it in the game, or listens in place, and writes `review: { pass, by, note }`, worst fault first. Fix and look again until it passes.
- **In-game proof:** a look in the game at the place's real hour (`placement.look`), or for a sound, it playing from its real source in the game.
- **Gate: Slate filed.** `slateGate(ctx, id)` passes: Workbench, Planner, Loom and Gallery all show the piece.


---

## Appendix: silhouette-gate.py
The mod catalog carries no .py files, so the scorer ships here. Copy this block to `` (python3 + PIL + numpy).

```python
#!/usr/bin/env python3
"""Kiln silhouette gate (KILN.md step 3b).
usage: silhouette_gate.py sheet.png render.png [--json out.json] [--compare out.png]
                          [--thr 32] [--bands 8] [--px H]
Both images -> binary mask (object vs flat background), cropped to bbox, scaled to the
same height, centred on a common canvas. Prints IoU overlap, width per band (bottom->top,
as a fraction of height), aspect (w/h) and worst band delta. Compare sheet: amber = sheet
only, teal = render only, white = both.
Mask rule: a pixel whose RGB differs from the background (median of the image border)
by more than --thr is object; an already-binary matte (black on white or white on black)
passes through unchanged. Pass bar: overlap >= 0.85 and every band within 0.05 (blockout);
>= 0.90 / 0.03 retopo vs high-poly.
"""
import sys, json, argparse
import numpy as np
from PIL import Image

def to_mask(path, thr=32):
    im = Image.open(path)
    if im.mode in ("RGBA", "LA"):
        a = np.asarray(im.getchannel("A"))
        if a.min() < 250:                       # transparent render: alpha is the matte
            return a > 127
    rgb = np.asarray(im.convert("RGB")).astype(np.int16)
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    d = np.abs(rgb - bg).max(axis=2)
    return d > thr

def crop(m):
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        raise SystemExit("empty mask")
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def scale_h(m, h):
    w = max(1, round(m.shape[1] * h / m.shape[0]))
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) > 127

def bands(m, n=8):
    """width of the mask in n horizontal bands, bottom->top, as a fraction of mask height.
    width = horizontal extent (leftmost..rightmost object pixel) taken over the band."""
    h = m.shape[0]; out = []
    for i in range(n):
        y1 = h - round(i * h / n); y0 = h - round((i + 1) * h / n)
        cols = np.nonzero(m[y0:y1].any(axis=0))[0]
        out.append(round(float((cols.max() - cols.min() + 1) / h) if len(cols) else 0.0, 4))
    return out

def measure(m, n=8):
    c = crop(m)
    return {"aspect": round(c.shape[1] / c.shape[0], 4), "bands": bands(c, n),
            "fill": round(float(c.mean()), 4), "px": [int(c.shape[1]), int(c.shape[0])]}, c

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet"); ap.add_argument("render")
    ap.add_argument("--json"); ap.add_argument("--compare")
    ap.add_argument("--thr", type=int, default=32); ap.add_argument("--bands", type=int, default=8)
    ap.add_argument("--px", type=int, default=512, help="common height for the IoU")
    a = ap.parse_args()
    ms, cs = measure(to_mask(a.sheet, a.thr), a.bands)
    mr, cr = measure(to_mask(a.render, a.thr), a.bands)
    H = a.px; s = scale_h(cs, H); r = scale_h(cr, H)
    W = max(s.shape[1], r.shape[1])
    S = np.zeros((H, W), bool); R = np.zeros((H, W), bool)
    S[:, (W - s.shape[1]) // 2:(W - s.shape[1]) // 2 + s.shape[1]] = s
    R[:, (W - r.shape[1]) // 2:(W - r.shape[1]) // 2 + r.shape[1]] = r
    iou = float((S & R).sum() / max(1, (S | R).sum()))
    deltas = [round(x - y, 4) for x, y in zip(mr["bands"], ms["bands"])]
    worst = max(range(len(deltas)), key=lambda i: abs(deltas[i]))
    res = {"overlap": round(iou, 4), "sheet": ms, "render": mr, "band_delta": deltas,
           "worst_band": {"index": worst, "delta": deltas[worst]},
           "aspect_delta": round(mr["aspect"] - ms["aspect"], 4),
           "pass_blockout": iou >= 0.85 and all(abs(d) <= 0.05 for d in deltas),
           "pass_retopo": iou >= 0.90 and all(abs(d) <= 0.03 for d in deltas)}
    print(f"overlap(IoU) {res['overlap']:.3f}   aspect sheet {ms['aspect']:.3f} render {mr['aspect']:.3f}")
    print("band  sheet   render  delta   (bottom->top, width/height)")
    for i, (x, y, d) in enumerate(zip(ms["bands"], mr["bands"], deltas)):
        print(f"{i:>4}  {x:.3f}   {y:.3f}   {d:+.3f}{'  <-- worst' if i == worst else ''}")
    print(f"worst band {worst} delta {deltas[worst]:+.3f}  blockout {'PASS' if res['pass_blockout'] else 'FAIL'}  retopo {'PASS' if res['pass_retopo'] else 'FAIL'}")
    if a.json:
        json.dump(res, open(a.json, "w"), indent=2)
    if a.compare:
        img = np.full((H, W, 3), 24, np.uint8)
        img[S & ~R] = (255, 176, 32)    # amber: sheet only (model lacks)
        img[R & ~S] = (32, 200, 190)    # teal: render only (model extra)
        img[S & R] = (235, 235, 235)
        for i in range(1, a.bands):     # band guides
            img[H - round(i * H / a.bands), ::4] = (90, 90, 90)
        Image.fromarray(img).save(a.compare)
    return res

if __name__ == "__main__":
    main()
```
