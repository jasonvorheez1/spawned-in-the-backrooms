---
name: Feelsgoodrig
description: FeelsGoodRig, a god-mode rig editor: pose a character's hands, fingers and held items, pin a hand to what it holds
---

# FeelsGoodRig

Select any rigged character in god mode. The RIG chips appear along the action bar.

- **pick**: L hand, R hand, the whole body (listed by the character's name, else BODY), or any item the character holds (a child or bone attachment).
- **body picked**: sliders slide the character left/right, up/down, fwd/back in its own frame (up to 2.5 m from where it stood when picked) and spin/tilt/roll it; the drag arrows and pad move it too. Its held items with their own pick (a handle, a gun on a child) hold their place in the world; worn things (glasses, shades, hats, hair) ride along. SAVE commits the body's spot and rotation and keeps it in `state.rigAt` ({ fp, rot, kids: { <child>: { fp, rot } } }) for scripts that re-place the body on spawn.
- **item picked**: red/green/blue drag arrows plus sliders move, turn and scale it. Values save on the item.
- **hand picked**: choose which of the character's animations the pose belongs to, then the knob: arm out/in, up/down, fwd/back, elbow in/out, elbow fwd/back, wrist turn/tilt/roll, finger curl, thumb curl. Poses save in the character's `state.handPoses[clip][left|right]` and are written to its `bones` while that clip plays in the editor.
- **pin**: pins the picked hand, where it is now, to the held item. Move the item and the hand and arm follow (IK reach). Press again to unpin. Saved in `state.pins[hand]`.
- **NO FINGER BONES**: shows when the model has no finger (or thumb) bones; curl is hidden since nothing can bend. Mixamo-style names (`LeftHandIndex1`, `LeftHandThumb1`, prefixes ok) are detected.
- **MIRROR** copies one hand onto the other, **RESET** clears a hand, **freeze** holds the body in any clip, **undo** steps back.

A game script that plays its own clips should lay `state.handPoses` itself if poses must hold outside the editor.

## Recommended: gun sway that keeps the hands on the grips

Tip from MINDCRUISE, where this rig was born. For a two-handed gun that sways naturally with the body while the hands never slide off:

1. **Parent the gun to the chest bone (Spine2), not to a hand.** Author the hold in the body's frame, so the gun breathes and walks with the torso.
2. **Pin both hands to the gun's grips** (the rig's pin = `bones.RightHand.reach` / `bones.LeftHand.reach` on points of the gun). The gun leads, the hands follow.
3. **Turn off smoothing on the held gun** (`interpolation: null`). A smoothed gun lags behind where the hands reach, and the grips slide off them.
4. **Keep any extra sway small, pivot it on the trigger grip, and scale it by walk speed.** Standing still, hold the hips still so the shoulders don't pull the hands out of reach.

The rule underneath: the gun moves, the hands chase it, never the other way.

## Recommended: a freeze key while you match poses

The rig's **freeze** chip holds the character you're posing in any clip. To match a pose against your own player (so you can compare side by side), give your game a dev-only freeze key, MINDCRUISE uses **P**:

- In your player script's `onInput`, on `input.pressed.poseFreeze` (declare the action in world.config.yaml `inputs.actions`, keys `["p"]`), only when `ctx.world.mode === "dev"` and `ctx.self.isEditor`, toggle `state.poseFreeze`.
- While frozen, play the idle on the clip's first frame (`ctx.self.anim.poseFreeze = { clip: "cdn/clip-idle-loop.glb", speed: 0, weight: 1, loop: "loop", blend: "override" }`), stop horizontal movement but keep gravity, and turn off sway, head-look and aim tilt.
- Press P again to set `anim.poseFreeze = null` and walk off.

Pose the dummy in its own freeze, press P on yourself, and the two stand on the same frame.