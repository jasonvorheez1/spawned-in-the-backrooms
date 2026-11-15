# Wardrobe asset proof — 2026-09-13

The corrected fitting evaluates the exported glTF joint-world × inverse-bind skinning directly, with original sparse morph accessors and original textures. The old Blender-armature preview distorted the mouth and is not an accepted proof. The exported avatar preserves the original meshes, skins, nodes, materials, morph defaults and original binary bytes; face/head alignment in the three focus clips differs from neutral by under 0.8 mm on the facial body and under 0.0004 mm on the teeth. The deliberate eye gaze is excluded from those facial-body/teeth figures. This disproves the earlier unconfirmed “lost expression settings caused the stretched mouth” theory for the export. Native idle expression streams are not copied; focus uses the source neutral expression.

Corrected fitting: /cdn/value.fa0ac29f63afe5f9680583c02c15ec191373284918eef49dee0c59bfab7dff45.png

- Suit: 5,918 triangles, seven materials, parent-rig skin attachment.
- Book: 1,334 triangles, six materials, 0.30 m wide; measured left-hand attachment in the wardrobe contract.
- Clips: FocusRead 4 s; FocusPageTurn 2.4 s; FocusThink 3.2 s; book PageTurn 2.4 s.
- Original restoration asset retains all 39 native clips. The temporary focus model contains only the three focus clips, intentionally: native posing pauses during focus.
- Reproduce corrected full proofs with the build script's --verify-visual option and facial comparison with --face-audit.
- These are export-level proofs, not a live-engine playback or cleanup pass. Runtime results belong in checks/verification.md.

## Movement extension — 2026-09-13

`add-focus-walk.py` composes the original Walk/Run lower-body tracks with FocusRead above the pelvis, retaining all original clips. The moving avatar is `/cdn/value.6ddfe23d893b7fa5aa0d2449858e108ad53e045b469b75d1dfa87d75a6beace6.glb`. Nodes, meshes, skins and materials compare unchanged against the corrected focus export. All five focus clips pass the upload's skin check. Original toy/gesture clips retain their original warnings; they are not focus poses and were not repaired or declared clean. The earlier statement that the temporary model contains only three clips describes the previous export, not this extension.

## 2026-09-13 — final focus-only garment variant
The movement exporter now removes mesh/skin/weights bindings from only Savi_TShirt_001, Savi_pants_001, Savi_Hair_Tie_Wrist and Savi_Hair_Tie_Gathered. Original face/body/hair geometry, skins and materials are unchanged. The original avatar used for exit is untouched. This supersedes the earlier claim that every node in the focus variant is unchanged. All five focus clips hold in the upload check. Some unrelated native toy clips still have the previously documented warnings.
