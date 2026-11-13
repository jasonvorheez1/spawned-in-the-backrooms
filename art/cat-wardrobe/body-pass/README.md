# Cat body pass (Nov 13) — body shape, weights, tail

The two cat bases (`CAT_BODY` in `scripts/lib/cat-wardrobe.js`) and every modelled cat garment (`models:` in `scripts/lib/data/cat-wardrobe.yml`, vars included, hats/eyewear/boots untouched) were edited in place: same vertices, same bones, same key names, same materials. Only positions, normals, skin weights and the tail keys changed. `assets.json` maps each old CDN name to its new one.

1. **Weights (both sexes)** — `reshape.py`. The seat was skinned 100% to `Tail1` right beside 100% thigh verts, so a swinging leg tore it (8.6x edge stretch on the female, 5.4x male) and lifting the tail dragged the buttocks. Seat verts off the tail tube go to Hips; thigh weight fades out just above the hip joint; the pelvis (Hips/UpLegs/Tail1/Spine) and the shoulders (Spine1/Spine2/Neck/Head/Shoulder/Arm, neck stalk and head seam pinned) are Laplacian-blended on welded clusters, 4 influences, normalised.
2. **Shape (female)** — one smooth field of rest position: a waist nip between Spine and Spine1, wider hips under the Hips joint fading to the knee, fuller outer thighs, a rounder seat. Max move 2 cm. The Chest key (creator's PG lock-in, Nov 12) is untouched; the male shape is untouched.
3. **Tail** — `tailfix.py`. Root relaxed (Taubin) on the basis and every tail key. `Tail_Bob` (was a crumpled lump) and `Tail_Puff` (a flat crinkled fan) rebuilt as round poms seated on the seat; `Tail_Curl` (a ring through itself, against the seat) rebuilt as an open spiral checked for 5 cm self-clearance and 2 cm body clearance. Classic, Fluffy and Whip keep their shapes.
4. **Garments** — each garment takes the body's weight change at its nearest body points (fading out 3–6 cm off the body: a cape hem keeps its own weights) and the same shape field (the body's value where it hugs, its own further out).

Run outside the tree (gltf-transform core in the cache; Blender 4.5 for the checks):
```
node dump.mjs <in.glb> <dump.json>
python -I reshape.py <f|m> <body dump> <body edits> [<garment dump> <garment edits>]...
python -I tailfix.py <f|m> <body dump> <body edits>
node patch.mjs <in.glb> <edits.json> <out.glb>
blender -b --python rigcheck.py -- <body.glb> <label>                 # per-joint edge strain in hard bends
blender -b --python fitcheck.py -- <body.glb> <garment.glb> <label>   # garment points under the skin, rest/walk/reach/sit
```
Checks reset every pose bone's rotation, location and scale (the files carry a node pose on top of the bind) and zero every key (the game sets them).

Measured (peak edge stretch in hard bends, before → after): female hip flex 8.6 → 3.4, male 5.4 → 2.4; arm forward female 4.3 → 3.1, male 5.1 → 2.9; leg out female 3.1 → 1.6, male 2.7 → 1.7; elbows and knees unchanged (were fine). Garment points >8 mm under the skin over 38 garment files: walk 16673 → 13536, sit 21156 → 17793, reach 9070 → 8668, rest 3928 → 3924; no garment worse in any pose. Every vertex weighted (the game collapses zero-weight verts to the origin; Blender hides them — `reshape.py` asserts).

Not done: hair passes through the back of the ears on some styles (afropuff); the female tail root keeps a soft fold from the Tripo sculpt; the shoulders still stretch ~3x at a full forward reach.
