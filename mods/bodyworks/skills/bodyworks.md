---
name: Bodyworks
description: Fit any rigged humanoid body for gear. One Blender command makes hideable skin zones, garment cages, slot coverage and per-zone collider capsules, with a step-by-step recipe and the fixes for different body shapes.
---

# Medi's BodyWorks — fitting any rigged body (private)

One command takes a rigged humanoid `.glb` to the four layers every outfit in this world stands on:

| layer | what it is | made by | file out |
|---|---|---|---|
| **T0 zones** | the body skin cut into named, hide-able parts (head, neck, upperchest, breast_l/r, cleavage, chest, upperback, belly, waist, pelvis, shoulder/upperarm/forearm, the hand as wrist/palm/fingers, thigh/knee/shin/foot, and the armhole ring side/armpit_front/armpit_back, each _l/_r; 37 zones) | `tools/bwlib/t0.py` | zone meshes in the glb |
| **T1 cages** | layered garment shells on the same rig: top, sleeves, gloves, legs, skirt, feet, neck, cut into shared segments. Tubes for the limbs and midriff; the chest and the yoke (shoulders, collarbone, upper back), the glove hand and the shoe are the hand/foot ZONES offset outward (fingers and toes covered whatever the rig's bones do); the skirt is the convex wrap of the slab below the waist | `tools/bwlib/t1.py` + `data/slots.json` | `cage_<segment>` meshes in the glb |
| **Slots** | per garment variant, which T0 zones it hides (≥90 % of rays hit the cage; a skirt's thighs: ≥85 % of thigh height under it) and which it only partly covers | `tools/bwlib/slots.py` | `bodyworks.json → slots` |
| **T2 bubbles** | one collider capsule per T0 zone, 100 % of its skin inside, riding the bone that carries it | `tools/bwlib/t2.py` | `capsules.json` (same shape as `scripts/lib/data/body-capsules.json`) |

## Run it

```
blender -b --factory-startup --python-exit-code 1 --python mods/bodyworks/tools/bw.py -- \
  --body /path/body.glb --out /workspace/bw/<name>
```
Stages default to all: `inspect,t0,t1,slots,t2,export,proof`. `--stages inspect` alone is the 5-second rig read: do it FIRST on any new body.
Options: `--skin REGEX` (only these meshes are skin), `--exclude REGEX` (default skips cage_/hair/wear/cloth), `--flip` (body faces the wrong way and the auto-turn missed it).

## Getting a new body in
- Any glTF/glb works. A zip from a store or an Unreal pack: unzip it and look for a `.gltf`+`.bin` (or `.glb`); the `.uasset`/`.uexp` files are Unreal-only and not needed. An `.fbx`: import in Blender, export `.glb`.
- Missing texture warnings on import (eye/hair normals) don't matter: BodyWorks reads the shape, not the paint.
- Hairless is fine and often better: auto-riggers (Mixamo) choke on hair.

## The recipe — in this order, stop at the first fail

1. **Inspect.** `--stages inspect`. Pass: every main role mapped (hips, spine, chest, neck, head, clavicle/upperarm/forearm/hand, thigh/shin/foot, five fingers per hand), `unmapped` is only hair/face/skirt/breast/prop bones. A body bone left unmapped → add its word to `data/bonemap.json` aliases (never rename the rig). Height and S print here: S is neck-base height ÷ 1.629 m; every length in BodyWorks scales by it.
   **Different bodies, what went wrong here:**
   - *Hips picked as `root`* (the Unreal-style hero rig has `root` above `pelvis`): two bones fit one role → the mapper keeps the one that actually carries skin weight. If inspect still names a weightless bone for a role, add the real bone's name to that role's aliases.
   - *Mixamo names* (`mixamorig:LeftArm`, `mixamorig1:…`): the prefix is stripped before matching (also `DEF-`, `J_Bip_`, `CC_Base_`, `Bip01`); a new prefix goes in the strip pattern at the top of `tools/bwlib/rig.py`.
   - *Eyes, brows, lashes, teeth, tongue, beard picked as skin*: excluded by name by default. A body whose face bits have other names → `--exclude` them, or `--skin` to name the body mesh outright. Check the printed skin-mesh list before going on.
   - *Body split into several meshes* (Mixamo: head, body, hands): all count as one skin; triangles split across them are handled.
2. **T0.** Pass: `missing []`, side check silent. Read `zones.png` (front | side | back): every zone a clean band, l/r mirrored, hands cut 6 cm up the forearm and split three ways (`tools/bwlib/hands.py`): wrist to the wrist joint, palm to the knuckles (thumb to its MCP), fingers past them, so a fingerless glove hides wrist + palm only. The knuckle on each finger chain is picked by reach from the wrist (KNUCKLE 0.52, THUMB_MCP 0.33 of wrist→middle-tip), so rigs with or without metacarpal bones both cut at the real knuckle; check the knuckle line in `zones.png` on a new rig. Feet at the ankle.
   **Armhole ring (2026-11-05):** after the bands, `side_` (ribs under the arm), `armpit_front_` (pec edge by the arm) and `armpit_back_` (shoulder-blade edge) are taken out of the torso zones by angle round the torso and reach from its centre. A sleeveless top hides the centre zones (breasts, cleavage, chest, belly) and leaves the ring drawn, so no hole opens under the armhole. Same logic on every body, two number sets in `RING`: `flat` (male: the pec edge feeds armpit_front) and `full` (female: the breast never feeds the ring, armpit_front starts above the bust, the side band is narrower). The bust is read automatically (breast reach forward of the under-bust strip > 0.045 m/S = full); `--bust flat|full` overrides. Check the ring on `zones.png` on a new body: it should frame the arm hole, not eat into the breast.
   **Different bodies:** zones are cut by plane cuts at landmark heights (crotch, waist, underbust, armpit, neck base) found from the joints, NOT from skin weights, so thin auto-rig weights don't move them. If a band sits wrong on an odd build (very long torso, no bust, huge traps), the landmark is wrong: fix the landmark in `t0.py`, never hand-paint vertices.
3. **T1.** Read the tube table. Pass: no tube raises, `pushWorst_mm` < 2 on the torso, cuffs and feet shaft. Sleeves measured 5–9 mm at the armpit fold on the three bodies tried (NB, heavy-set, Mixamo): fine. The chest and yoke are zone shells, not tubes: a tube can't wrap over the top of a bust or the collarbone and left a gap there on every body until they were changed. The yoke also takes the upper-arm skin within 0.11×height of the shoulder joint: the heavy-set's deltoid sits outside the sleeve start and showed through. A body with morphs (shape keys) is shelled from its CURRENT mix: shelling the basis built a slim cage the heavy-set poked through. Read each `cages_<slot>.png`: no skin showing through a cage that should cover it, no cage ballooning off the body.
   **Different bodies, what went wrong and how it is handled now:**
   - *Ribbed/pleated torso on a low-poly body* (the hero, ~7k verts, ~17 mm edges): a ring centred on the slab's vertex MEAN jumps ring to ring, and the cage folds into pleats. Torso rings now centre on the slab's front/back midpoint, smoothed over height. If a tube still pleats on a low-poly body, read the ring centres (`BW_DEBUG=1` prints them per ring) before touching radii. Extra smoothing along the tube made it WORSE (push-out re-opened pleats to 12 mm): don't.
   - *Thick neck* (hero: ~11 cm radius): a fixed-radius neck ring sank in and flared onto the traps. The neck band and lace now cast from the neck's own axis onto the T0 neck zone (and the collar/trap zones for the lace). Only if those zones can't be reached (dense multi-shell bodies like the heavy-set) does it fall back to the old fixed wrap; `widened xN` lines in the log mean it grew rings to find skin.
   - *Neck/shoulders barely weighted* (Mixamo auto-rig): tubes there test against zones, not bone weights.
   - *Slim cage on a morphed body*: shell from the current shape-key mix, never the basis.
   - *Known rough spots, not solved yet*: small fins where each sleeve starts on busty/heavy bodies; ribbed sleeves and legs on very low-poly bodies; a glove cuff can sit ~2 mm into a thick wrist. Read those three spots on every new body.
4. **Slots.** Rule (the one from the T1 cage): a ray out of each zone vertex along its normal meets the cage within 3 cm = covered; ≥90 % hides the zone, ≥25 % is partial (zone stays on). Skirts hide the thighs only, by a different rule on purpose: rays miss a skirt that stands off the legs, so a thigh hides when ≥85 % of its height sits between hem and waist (>5 % is partial). Read the lists against common sense: long sleeves hide upperarm+forearm, shoes the feet, tall boots the shins too. With the shell chest, a top hides breasts, cleavage and shoulders outright; the upper back can read partial (0.89 on Mixamo), keep it drawn.
   **Different bodies:** a flat-chested or male body reads breast/cleavage as partial instead of hidden (hero: 0.85): that's the cage sitting off a flat chest, not a fault. Judge the partial list against the picture, not against another body's list.
5. **T2.** One line per zone. `review: overshoot|long` = look at `bubbles.png` for that zone before using it.
   **Different bodies:** big muscles flag `overshoot` (hero: upperchest, knees, shins) because a capsule that holds all of a bulging zone pokes past its ends. That is expected on muscular builds; keep it if the bubble doesn't reach into the next joint's bend. Capsules ride the BODY, never clothing (Medi 2026-10-10).
6. **Export + place.** `spawn upload <out>/<name>-bodyworks.glb` → place it in the fitting room (front work spot, finished row behind). Zones hide by `model.parts`; cages stay hidden parts until a garment is fitted onto them.

## Rules this recipe carries (Medi's, don't re-litigate)
- The body mesh is never edited: zones are a cut of the same skin, cages are new meshes on the same rig.
- Paired cages are one side, mirrored. Collision volumes on the body, not clothing; never longer than the part.
- Skirts stop above the knee in play; the long skirt cage exists for fitting only.
- Every piece is tried as delivered first; only then adjusted.
- A result on one body is not proof for all: run the recipe on each new body and read its sheets.

## Files
- `tools/bw.py` the one command · `tools/bwlib/` one module per layer · `data/bonemap.json` rig words → roles · `data/slots.json` layers, hems, variants.
- No example bodies ship with the mod (Medi's call): bring your own. Bodies tried while building it: NB (slim female), heavy-set female with morphs, Mixamo auto-rig (hairless, split mesh), comic male hero (Unreal-style rig, low-poly, thick neck). Four bodies are not every body: a kid, a very fat or a non-human build is still untested.

## Known weaknesses (v1, honest list)
Fine to ship with; fixed as new bodies and armors teach us. Check these spots on every run:
- **Ribbed sleeves and legs on very low-poly bodies** (~7k verts): limb tubes pleat. Read ring centres with `BW_DEBUG=1`; extra along-tube smoothing made it worse.
- **Glove cuff ~2 mm into a thick wrist** (muscular male): measured 2.26 mm on the hero.
- **Shoulder fins and torso holes on busty/heavy-set bodies**: the heavy-set still showed 5 top-torso holes and ~25 mm sleeve push-out at the armpit.
- **Flat chest** reads breast/cleavage as partial, not hidden: expected, not a fault.
- **Untested builds**: a child, a very fat body, non-human or digitigrade legs.
- **Male game body**: the ARPG's real male body hasn't been run yet. Run it next, then add what it teaches here.