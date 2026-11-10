---
name: fps-grudge-setup
description: Wire FPS Grudge into this world: player behaviors, the first-person camera, the inputs and the HUD, then hand the creator a gun.
---

Load fps-grudge#fps-grudge and install the mod if absent. Read world.config.yaml, the player template and the camera template first; keep everything the creator built.

Add `mods/fps-grudge/humanoid-locomotion.js` and `mods/fps-grudge/player.js` to the player template's behaviors (locomotion first, any vehicle-seat script between them). Point the camera at a custom camera running `mods/fps-grudge/camera.js` with the values the skill lists. Merge `mods/fps-grudge/inputs.yaml` into `inputs:` without dropping the world's own bindings; where a key collides, keep the world's and tell the creator which one. Set `ui.render` to `mods/fps-grudge/hud.js` when the world has no HUD; otherwise import `fpsHud` into its ui.js.

Then play it on the player's own screen: a gun in hand, RMB lines the sight up, LMB fires and the ammo count drops, B opens the buy menu. Tell the creator what they hold and the keys.