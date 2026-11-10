---
name: FPS Grudge
description: Install and use FPS Grudge, the ASHLINE shooter kit: wrapped first-person arms and guns with real clips, ADS and scopes, ballistics, grenades, molotovs, syringe, melee, gore, ragdolls, shoulder camera on U and a buy menu.
---

# FPS Grudge

A whole first-person combat kit lifted from ASHLINE. Install `fps-grudge`; edit its data under mods/fps-grudge/lib/data/ (installs keep edited files).

## Wiring a consumer (run /fps-grudge-setup, or by hand)
- Player template behaviors, in this order: `mods/fps-grudge/humanoid-locomotion.js`, then any seat/vehicle script of the game, then `mods/fps-grudge/player.js`. Physics `character`, tag `player`.
- Camera: `kind: custom`, `behavior: [mods/fps-grudge/camera.js]`, `orientation: { source: look }`, `pointerLock: true`, `fov: 72`, `clip: { near: 0.02, far: 600 }`.
- Inputs: copy `mods/fps-grudge/inputs.yaml` into world.config.yaml `inputs:` (fire LMB, ads RMB, reload R, melee V, buy B/MMB, grenade F, cycle X, molotov T, heal H, inspect I, slots 1-9, lean Q/E, crouch Ctrl, jump Space, U third person, wheel zoom).
- HUD: `ui.render: mods/fps-grudge/hud.js`, or import `fpsHud` from it inside the game's own ui.js.

## What reads what
- `lib/data/weapons.yml` the armory (26 guns, each bound to a `viewmodels.yml` row); `attachments.yml` fitted parts; `combat.yml` damage, spread, bullet speeds, movement; `grenades.yml` frag/flash/smoke; `viewmodels.yml` the first-person model, sight, muzzle and clip per gun; `mirror.yml` the third-person body's moves.
- Friendly fire: a place writing `place.state.pvp = true|false` decides; else `place.state.mode` is looked up in `combat.yml pvpModes`; no mode = `pvpDefault` (false).
- Targets: anything tagged `raider` with `state.hp` takes bullets, melee and blasts; tag `range-plate` rings steel instead.
- Player state it owns: hp, armor, money, kit, ammo, slot, nade counts, tps. A game's referee reads them; a round resets them.
- A body with `state.ride` set or a parent (a vehicle seat) holds its gun.

## Judging a change
Equip each gun on the player's own screen: hands on the grip, sight on the crosshair under RMB, fire/reload/melee clips play once at the right moment and return to idle, no floating helper meshes.