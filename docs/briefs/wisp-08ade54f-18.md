Polish lane for Level 70 "Froidetown". 
WORLD: The Backrooms (Spawn engine 6.0), place "level70" = Level 70 "Froidetown" from the Wikidot Backrooms wiki: a snowed-in modern Canadian city (Toronto-like) at blue hour, -15 to -45 C, sodium street lamps, snow in the air. Its people (Froidetownites) are polite stereotypical Canadians living in a parliamentary Kingdom; Almond Water runs in pipes under the city and the pipes have run dry. Factions: the Kingdom's River Guard / Froidetownites (friendly), Carnifices of Gelu (frost cultists camped in the Iceshed woods), an abandoned B.N.T.G. extraction camp called Froston. Entities: Froidlings (small pale frost-furred biped scavengers, pack hunters) and white Death Rats.
THE MAP IS FIXED: read scripts/lib/level70.js first (ARRIVE, HUT, STREET, ZONES, RIVER, SPOT, NPC ids, zoneAt, wildness). Ground is terrain at y = 0 inside every zone disc and on the street (scripts/terrain70.js); build at y 0 there. Kelpie Street runs along x = 0 from z = 40 north to z = -120. Do NOT edit level70.js, terrain70.js, places/level70/config.yaml or places/level70/sim.js (if you truly need a new anchor, say so in your return).
HOW A LAYER LANDS: places/level70/sim.js imports each layer file and calls lay(ctx) once whenever the file's exported V differs from ctx.place.state["v70<layer>"], then tick(ctx) every 1 s. Your file exports V (bump it from 0 to 1, and again whenever you change lay), lay(ctx) and tick(ctx). In lay, spawn with stable ids prefixed "l70-" and destroy-then-spawn (const sp = (id, spec) => { if (ctx.place.objects[id]) ctx.destroy(id); return ctx.spawn(id, spec); }). Use run_script with place: "level70" to read back what stands. Write only your own layer file and the files your brief names; another lane owns the others.
THE CREATOR'S HARD RULES (she said "DO NOT disappoint me"): NOTHING BLOCKY, ever. Every visible thing is a real mesh: spawn tripo generate (model v3.1-20260211, --pbr true, --face_limit 20000-40000, realistic, weathered, snow-laden), then run it through the Spawn 3D Modeling Studio pass the modeling-studio skill describes (register in world.state.m3d.items and apply its cleanup/fit), following the aaa-models-3d and gavi skills. No visible primitive boxes/cylinders as props or buildings; a primitive is allowed only as an invisible collider/trigger, a thin ground decal, or a light. Read each GLB's real bounds and scale to true size against the 1.7 m player (a door is 2.05 m, a car 4.5 m long, a street lamp 6 m), set model.forward from the tripo "facing" line, feet on the ground, mesh colliders on what a body walks into or onto. Good textures: Tripo PBR, plus conjured seamless textures by name (cdn/texture-<what it is>.png, e.g. cdn/texture-weathered-red-canadian-brick-with-frost.png) on any surface you author. A building is rooms a body walks into: real door openings through mesh AND collider, a floor, a ceiling, lights inside; where one Tripo shell cannot give a walkable interior, build the interior from Tripo wall/floor/ceiling panel meshes and Blender (workshop skill), never raw boxes. Every placed piece gets dressing beside it (snow heaps, icicles, tracks, litter, a light) so nothing is a thing on a lawn. Look at your work up close with look (camera 2-6 m away at eye height 1.6) before you return; fix what reads fake, floating, sunk, mis-scaled or dark. Tripo tasks take minutes: launch several in one bash call in the background and place as they land. Budget: at most 12 Tripo generations per lane; reuse a model with scale/yaw variation rather than generate twins.
RETURN: one line per check in your brief, PASS or FAIL: why, then the ids you laid and the /cdn/ model addresses you made.
WHAT THE PIECE LANES REPORTED:
TOWN: The town layer is saved at version 1 with all thirteen models in its table, but I ran out of steps before reading it back in the game: no check was run and no look was taken.

All Tripo models report their concept face on +X, and the layer places the street lamps, poles, cars, snowbanks, shelter and swing with no forward, and the buildings and neighbour houses with "+z". The lamp arms, car angles, snowbank runs and building fronts are therefore probably turned wrong until `TUNE` (and the forwards) in `scripts/lib/level70-town.js` are set from a look.

**Checks**
- (a) FAIL: not run. `lay` records its ids in `place.state.l70townIds`, but I never read them back. The layer spawns only models, lights, one fx and the power-line splines.
- (b) FAIL: not run. The house's solid shell is a separate invisible model (`l70-house-shell`); whether an invisible model cooks a collider is untested, so the house walls may not stop a body.
- (c) FAIL: no look taken in the world. I only saw Blender proofs of the house and igloo and Tripo's preview pictures.
- (d) FAIL: not measured. Heights are forced by layout boxes (lamp 6.4 m, pole 9 m, sedan 1.72 m, pickup 2.25 m, buildings 11.5 and 14 m, door 2.05 m, hut 3.2 m), but car lengths were never read back.

**What the brief asked for that is not there**
- No car has a door ajar; one sedan only has a cold interior light.
- The stop sign appears only if an asset named `stop-sign` exists, and the cellar shelf and furnace only if `shelf-2` and `boiler` exist; none of the three turned up when I searched the asset list.
- No fences.
- The house and igloo are Blender meshes, not Tripo. The igloo has no texture on its snow, and its drifts and the house's snow mounds still read lumpy and cone-like in the proofs.
- Dressing snow heaps borrow another lane's `l70-snowheap` model.
- The Modeling Studio pass is only a registration of each model in `world.state.m3d.items`; no cleanup or fit was applied.
- The power lines are engine `powerline` splines, not meshes.

**The cellar**
It is a concrete shell on the ground against the house's north wall, banked in snow, entered from the kitchen through a steel door and three steps down, floor at y 0.02. `SPOT.basement` (y −3.2) is not used.

**Exports**
- `HUT_DOOR` (0, 0, 45)
- `HOUSE_DOOR` (−32.6, 0, −18), the foot of the porch steps
- `IGLOO_DOOR` (−48.4, 0, −4)
- `CELLAR_BENCH` (−42.5, 0.92, −24.95); the 0.92 height is a guess at the workbench top
- also `HOUSE_LIVING` and `HOUSE_CELLAR`

**Ids laid** (as written in `lay`; none confirmed standing)
- Arrival: `l70-bp-hut`, `l70-hut-door`, `l70-hut-lamp`, `l70-hut-lamp-light`, `l70-hut-snow-0..5`
- Street: `l70-lamp-0..6` (each with `-light` and `-snow`), `l70-pole-0..3` (+`-snow`), `l70-line-0..2a/b`, `l70-car-0..4` (+`-snow`, `-snow2`), `l70-car-1-light`, `l70-bank-N`, `l70-bldg-1..12` (+`-win`, `-snow`), `l70-shelter` (+`-snow`), `l70-mailbox-0..2` (+`-snow`), `l70-stop`, `l70-bin-0..1`
- Burns Crescent: `l70-bp-house`, `l70-house-shell`, `l70-house-sofa/table/fridge/stove/counter/crate`, `l70-house-light-living/kitchen/hall/porch`, `l70-house-snow-0..3`, `l70-cellar-bench/shelf/furnace/crate/bulb`, `l70-nhouse-0..1`, `l70-drive-car` (+`-snow`, `-snow2`), `l70-swing` (+`-snow`)
- Igloo: `l70-bp-igloo`, `l70-igloo-lantern`, `l70-igloo-light`, `l70-igloo-fire`, `l70-igloo-fire-fx`

**Models made**
- House: /cdn/value.9c720700d57a2a87fdb79f1b9dbbf7f165badf6777c9884c9ea24e4ce30ee8f9.glb
- House shell: /cdn/value.6d4c22f046170f6cf599277144dc9b6185bfe0c4298b8da27f8ec820589b2448.glb
- Igloo: /cdn/value.bf91214316bae9d634c33f7b8cc475f2bea9d87a64926c4d2815e1c3889f904c.glb
- Ten Tripo models (lamp, pole, sedan, pickup, snowbank, bldga, bldgb, nhouse, shelter, swing): their addresses are in the `M` table of `scripts/lib/level70-town.js` and in `/workspace/tripo70/<name>.log`; I did not copy them out.
- Supplied and not regenerated, per the steer: hut `…0b1ccbbf….glb` and white door `…9fdae43f….glb`, both placed with forward "+x".

Build scripts are `art/l70-town/house.py`, `igloo.py` and `models.py`. All 12 Tripo generations for this lane are spent.
CIVIC: **Not finished: the layer is saved but I never saw it stand in the game, and none of the four checks ran.**

- **(a) FAIL:** not run. The layer file names `l70-valve-0..3` (tags `usable`, `l70-valve`, state `{ n, turn: 0 }`, static), `l70-gauge`, `l70-pump` and `l70-breaker` (`usable`), but there was no readback in level70.
- **(b) FAIL:** not run. No traverse check was made into the garage, the valve room, the hotel lobby or around the market.
- **(c) FAIL:** not run. No close look was taken of the market, lobby or valve wall.
- **(d) FAIL:** partly measured in Blender only, never in the world.
  - Hotel shell: 20.1 × 16.0 × 18.2 m.
  - Office shell: 31.8 × 19.0 × 14.2 m.
  - Stall: 1.16 × 1.50 × 1.62 m native, fitted to 2.6–2.7 m.
  - Valve: 0.36 m native, fitted to 0.54 m.
  - Pump: 0.74 m native, fitted to 0.9 m.
  - Car: fitted to 1.45 m tall; its length was not checked against 4.5 m.

**What is in place**
- `scripts/lib/level70-civic.js` is saved with `V` 0 → 1 and exports `STALL`, `FIRE`, `LECTERN`, `HOTEL_DOOR`, `GARAGE_DOOR`, `VALVE_POS`, `GAUGE`, `PUMP`, `BREAKER`.
- The build script for the shells and kit is `art/level70/build.py`; textures come from `art/level70/mk_tex.py`.
- The three blueprint boxes are replaced under their own ids inside `lay`, but only if each model address resolved. The upload printout was cut off above "bulbring", so I did not see addresses for hotel, office, banner, bench, breaker, car, kitchen, lectern, pipe run, pump, valve, ice fall or chandelier. Any that failed is skipped silently, leaving that piece missing or its blueprint box standing.

**Ids laid (in the file)**
- Blueprints: `l70-bp-market`, `l70-bp-hotel`, `l70-bp-office`.
- Quest objects: `l70-valve-0..3`, `l70-gauge`, `l70-pump`, `l70-breaker`.
- Market: `l70-c-banner`, `l70-c-stall-0..4`, `l70-c-stallsnow-0..4`, `l70-c-stallcrate-0..4`, `l70-c-stalllamp-0..4`, `l70-c-drum-0..1`, `l70-c-fire-0..1`, `l70-c-bench-00/01/10/11`, `l70-c-kitchen`, `l70-c-notice`, `l70-c-noticelamp`, `l70-c-wood-0..1`, `l70-c-sled-0..1`, `l70-c-pallet`, `l70-c-crate-k`, `l70-c-heap-0..6`.
- Hotel: `l70-c-lectern`, `l70-c-chandelier`, `l70-c-desk`, `l70-c-chair-0..6`, `l70-c-candles-0..2`, `l70-c-lobbylight`, `l70-c-lecternlight`, `l70-c-desklight`, `l70-c-corrlight`, `l70-c-doorlight`, `l70-c-ice-hotel`.
- Office: `l70-c-car-0..1`, `l70-c-pipes-0..3`, `l70-c-tube-0..2`, `l70-c-tube-flicker`, `l70-c-valvelight`, `l70-c-icefall`, `l70-c-ice-garage`, `l70-c-ice-garage2`.

**Model addresses confirmed**
- Stall (Tripo): `/cdn/value.5d69a7477ebf01d638933b9fc1c4a2d3170f7cf7d8a90785062ced159f4dbe5f.glb`
- Bulb ring: `/cdn/value.3fc9c3fd400394d9c7add056d11697b647ac6207f9d7e0c339ef30b1704ffde6.glb`
- Firewood: `/cdn/value.a8269d471ada83554f083b37b4036d3cf8dc5f4626a48ff4cf8fa2116ea229fe.glb`
- Gauge: `/cdn/value.d40c12f73436558674f508d566b5397f6f91e3beebeadbb47611327ee28d7e54.glb`
- Icicles: `/cdn/value.b05c80a9b51d43b51e05f663eadb3050b2f40992c56b85489856160bbb2717e6.glb`
- Noticeboard: `/cdn/value.4bdc3899162211807dfe16cb602e0861364f4b1e68b394edaa4061ae0a09761b.glb`
- Sled: `/cdn/value.6915653bca3fbcf61f38d869818195b028ab539769c1d7539e9df055de3139a0.glb`
- Snow heap: `/cdn/value.652183159aeb2aed35418c3c00070f3548523a47bf0459a44ca542e79acb5457.glb`
- The remaining addresses sit in the `G` table at the top of the layer file.

**Shortfalls against the brief**
- Tripo budget: about 17 generations were launched against the cap of 12.
- The hotel and office interiors, and the banner, bench, breaker, gauge and noticeboard, are Blender builds with generated textures, not Tripo. The painting step was refused in this shell, so the "NOAHTOWN" banner and paper notices are not hand-painted pictures.
- The Modeling Studio pass is only a registration of each model in the studio's item list; no cleanup or fit pass ran.
- The valve room has no separately placed steel door, the corridor stub has no separately placed boarded restaurant door, and the lectern has no separately placed flag; whether the shells carry them is unconfirmed.
- The steer about the white door and stairwell hut belongs to the town lane; nothing in this lane uses them.
WILD: (a) PASS: 172 trees, 4 tents, and the camp fire, rig and dock anchors all match objects standing at their exported positions.
(b) FAIL: only the camp route is traversable. The route to the rig is blocked by `l70-c-kitchen` at (5.4, -64.4) and the route to the dock by `l70-car-4` at (2.5, -94.5); both belong to other lanes. No tree stands within 3.2 m of any of the three lines.
(c) FAIL: the views from ARRIVE do not show the horizon. A large dark slab hangs over Kelpie Street and Froston and hides the sky; it is not one of my objects by a bounds query, and I did not identify it. Close looks at the camp, dock, boat and ice hole read as real, and the skyline towers with lit windows show from the camp and the river.
(d) PASS, with two true-size misses. Measured in game: tents 3.2 m, altar 1.35 m, totems 2.6–3.7 m, rig 9 m, containers 2.9–3.0 m, drums 0.9 m, hut 3.4 m, jetty 7.8 m, trees 6–13 m, skyline 41–60 m, pylon 46 m. The misses are the rowboat, about 2.8 m long, and the desk at 1.2 m to the top of its monitor.
(e) FAIL: `spawn perf` returned no fps figure. It reported the tick under half its budget and one 79 ms hitch on the creator's desktop.

Still open:
- **Open container:** in my last look it still drew flat blue, because its four textures were 6 s into generating. It needs a look once they land.
- **Lit windows:** these are three warm glow lights near the skyline, not authored windows.
- **Ice-fishing stool:** it is a red diner stool reused from Level 61 and looks out of place.
- **Tree colliders:** 92 of the 172 trees have an invisible trunk collider; the outer ones are walk-through.
- **Sounds:** the two ambient loops were conjured but not heard.
- **Studio pass:** the 12 Tripo models are registered in the studio shelf; no cleanup beyond fit-by-height was applied.
- **Layer version:** V went 0 → 1 → 2.
- **Arrival door and hut steer:** it does not touch this lane.

Ids laid:
- Camp: `l70-bp-camp` with children `tent0-3`, `tentheap0-3`, `pit0-6`, `altar`, `altarglow`, `rack`, `totem0-3`, `heapA`, `heapB`, `firelight`, `pines`.
- Froston: `l70-bp-froston` (the rig) with children `office`, `desk`, `papers`, `papers2`, `worklight`, `box2`, `gen`, `banner`, `drum0-3`, `heap0-3`, `rock0`, `beacon`.
- Dock: `l70-bp-dock` with children `hut`, `brazier`, `bags0-1`, `jetty`, `hole`, `stool`, `boat`, `heap0-2`, `creak`.
- Land between: `l70-tree0..171`, `l70-rock0..15`, `l70-fence0..6`, `l70-sign-speed`, `l70-sign-moose`, `l70-sign-heap0-1`, `l70-pylon`, `l70-skyline0..10`, `l70-cityglow0..2`.

Tripo models made (12):
- spruce `/cdn/value.04eaaea5ce01839348a9b539d39fb1da7be7b82825c48883f28ea36c21dbac23.glb`
- birch `/cdn/value.00db5651af342e40af65ef83853f2d6cd6d55635511f8b26a862fd23e02cc2eb.glb`
- boulder `/cdn/value.1f476b4b6a563130114293a25d61a70f2e36523fad4fbf44162549689161da92.glb`
- skyline `/cdn/value.cef9cf5cf3a27ed533697f71c4c9b8797fdde6d5138e96cac33391deda27a534.glb`
- pylon `/cdn/value.ace8e24a92be32a5081e99121e369b5871066b57a0c284e52ba70451b16c2ffa.glb`
- tent `/cdn/value.8d7b3d9f2b7478726087d5f40b053afa15b33f6c3704fbe04f35a44f595e0cca.glb`
- altar `/cdn/value.4437b5c2fb6c0ee74cca0b675a5670affa4d220433b2e68039eea3eb93372672.glb`
- totem `/cdn/value.614ecd5ceb48c5e547fb4c0a607a859f98b93dffa2e76b97d29a19e7b97ee057.glb`
- blade rack `/cdn/value.5ad22535100f27ec3d9663ed54416b2079e850f15adc7dcc84affd713efb117e.glb`
- rig `/cdn/value.e908749c6e537ead6b0515b5bc7be870e9f03ecb63f26a2bae330c4be7c20dd5.glb`
- container `/cdn/value.55ce2395b0ad47cf94d5c2211cf12f41ed72a0bffa8616cdc91483657c1a3e64.glb`
- watch hut `/cdn/value.87db01036896a2e01375996d8cbfc98d6ef1e2940c640ac3ddd2ad6fc3af45c0.glb`

Blender models made (9, source `art/l70wild/build.py`):
- open container `/cdn/value.bcdfc96b1aef5d96f15aceb915363fdf3bc3727d0f2ba12e6658da98230326d0.glb`
- banner `/cdn/value.6edcba81ce0f4821240cdabb3634540db8ce6e3be1bfdb96cc52da65de073337.glb`
- fence `/cdn/value.ee923ef0e1da164ba64409cc7e7acf8977e2ce6c28cf1d0ff42a691dc4da8f19.glb`
- ice hole `/cdn/value.99d9ecaabafd0ec53f68d3eb38d1084e15ec58de5167600564b087f35e0b594d.glb`
- jetty `/cdn/value.910ea79be78abe13a4fd43986924310ab3f762c4cc3472107bdb95004addd3b6.glb`
- papers `/cdn/value.195633c74204cfc499314ed0898d641823db21aa196ad19724829f8c1b635cb2.glb`
- speed sign `/cdn/value.c72211a3c2a3886dc4d7bc6db96a56669f42a56adb489ea14d522ce6cbceb6b4.glb`
- moose sign `/cdn/value.26c7fed346858a62a72b5c65c5ba7662c121f7ad91002a14fcae7c5bcf17a24c.glb`
- snow heap `/cdn/value.d50ad70cf192d658a3f668642719d22be936237c3da32fcb52ffa2223bd57af4.glb`
LIFE: **Level 70 life layer: written and saved, but nothing was run, so every check fails.** The step budget ran out on the save of `scripts/lib/level70-life.js` (V 0 to 1); I never read back what stands in level70, played it or looked at it.

- (a) FAIL: not run. Whether the five quest NPC ids exist and six residents move more than 3 m in 20 s was never measured.
- (b) FAIL: not run. `route()` was never called for ARRIVE to SPOT.camp, ARRIVE to SPOT.valves or SPOT.market to SPOT.dock. `scripts/lib/level70-nav.js` imports `traverseCheck` from `builtin/nav`, while the API lists it under `builtin/physics`; that may break the module.
- (c) FAIL: not played. No froidling pack or rat swarm was fought, and no weapon was tried.
- (d) FAIL: not run. The Guard-versus-cultist hostility within 14 m is in the layer's tick but was never observed.
- (e) FAIL: no close looks taken. The froidling and rat are fitted by layout box to 1.1 m and 0.5 m tall, with forward "+x" assumed rather than read from the upload's facing line.

Other things that are not as the brief asks:
- **Ice blade address is suspect.** Its hash tail matches a Death Rat address my notes already flagged as garbled, so the cultists' blades may not load. The real address should be in `/workspace/l70life/` logs.
- **No props placed.** The shovel, fishing rod, firewood and bench jobs were launched but never collected, so those slots are null; residents play the action clips empty-handed and there are no benches.
- **Studio pass is registration only.** `lay` writes the three models into `world.state.m3d.items`; no cleanup or fit was applied or viewed.
- **Sitting does not use seat.js.** Noah's sit stop plays a floor-sit clip instead.
- **Clips are freshly conjured.** The warming-hands, shovelling and ice-fishing clips were still cooking at save, as were the three models and the campfire sound.
- **Hostile-rep attack on sight is untested.** I added "froid" and "gelu" to `rep.js` and rely on meg-agent's existing rep handling.

The town-lane steer about the arrival door and hut does not touch this lane; nothing of theirs was changed.

**Ids laid by `lay` (unverified in the world):**
- Quest NPCs: `l70-npc-larsson`, `l70-npc-vael`, `l70-npc-odell`, `l70-npc-ines`, `l70-npc-marinerson`
- Residents: `l70-npc-pierrette`, `l70-npc-gord`, `l70-npc-maple`, `l70-npc-doug`, `l70-npc-bev`
- River Guard: `l70-guard-1` to `l70-guard-3`
- Cultists: `l70-gelu-1` to `l70-gelu-4`, each with a `-blade` child
- Fires: `l70-fire-market`, `l70-fire-dock`, `l70-fire-camp`
- Froidlings: `l70-froid-burns-0..2`, `l70-froid-east-0..2`, `l70-froid-iceshed-0..2`
- Death Rats: `l70-rat-garage-0..4`, `l70-rat-hotel-0..4`
- Manager: `l70-foe-mgr`

**Files:** `scripts/lib/level70-life.js`, `scripts/lib/level70-nav.js`, `scripts/l70-foes.js`, `scripts/lib/rep.js`.

**Models (8 of 12 Tripo generations used, plus 2 rigs):**
- Froidling: `/cdn/value.04fcb35cf58ee06a8a83141ca8a09e128d90bc062370c9a2dc5b39851e7c3a4d.glb`
- Froidling, rigged (the one placed): `/cdn/value.e0f92de3c91a51d13d955a5f18b0ebb02e61aab925729be60816dcd684d80ca3.glb`
- Death Rat, second generation: `/cdn/value.39cc0b8bc7f136be5b5c0ecd0496dbb0fdf92eaf18f7698130f2ab8b0401715f.glb`
- Death Rat, rigged (the one placed): `/cdn/value.5eab5f42c4c7fdce53c51e1b8f7853c3d4c5b87ae279382dbf976d10a38263b5.glb`
- Ice blade as written in the layer (suspect): `/cdn/value.5f289d5a6b9277de9cfabb6da1a9001067ad745e0b44498a90488b4ca397f7dd.glb`
QUEST: (a) PASS: the valve table gives distinct readings for all 256 handwheel settings. The city, spur and balanced endings each have their own combination, and each combination is reachable.
(b) FAIL: not checked. The quest handlers are now part of talk and NPC choices, and the five NPCs stand in the place. I did not talk to Marinerson and Larsson or drive the handlers, so I have not seen l70q move.
(c) FAIL: not checked. Pressing a valve should turn it a quarter, squeal and repaint the gauge. That depends on the quest layer moving from V 0 to V 1 and running in the place sim, which I have not confirmed.
(d) FAIL: not checked in game. The weapon and item rows are written and the weapons' hand placement is set up, but nothing has been seen loading and I took no look at the Froston Scrapper in hand.
(e) FAIL: not checked. The chill rules are written: it rises outdoors and falls indoors and within 6 m of a fire. Whether it shows like the other statuses was never confirmed.

Placed objects in lay, none seen yet: l70-q-note (cellar cassette), l70-q-locker (Froston footlocker), l70-q-schematic (vector poster), l70-q-gauge-face (live gauge vector). l70-valve-0..3 and l70-breaker get the press script.
Models: /cdn/value.31c3a0b17d66e2b00e6cd50f6ebf4b6d5c46d10f4ef79c72bfd0ee6a91012100.glb (Scrapper), /cdn/value.a9912e2551dabae6c10990a486feb6ea177d95a7cbe9c793843cf16ba0b9585b.glb (Ice Pick), /cdn/value.53e72f64dee0951883d4f953d26241d9db354c4cc829381af993d84cc627aed7.glb (flare gun). The cassette (value.6ad7bdb7…) and footlocker (value.bb28fe4d…) models were sent to the CDN at the last save; I did not check that they finished. Their sizes and facing are not checked.
JOIN: Most of the joining is done. Every walk passes, routes work between every pair of points, and the wandering-townsfolk problem is fixed. One check fails: some ice-blocks of white shapes hang in the sky over Kelpie Street and the hotel, and I didn't find what they are.

**Checks**
- **(a) PASS:** routes work between all 55 pairs of the 11 points (ARRIVE plus every SPOT).
  ```
  order: ARRIVE,house,basement,igloo,garage,valves,market,lobby,rig,camp,dock
  ARRIVE   -YYYYYYYYYY
  house    Y-YYYYYYYYY
  basement YY-YYYYYYYY
  igloo    YYY-YYYYYYY
  garage   YYYY-YYYYYY
  valves   YYYYY-YYYYY
  market   YYYYYY-YYYY
  lobby    YYYYYYY-YYY
  rig      YYYYYYYY-YY
  camp     YYYYYYYYY-Y
  dock     YYYYYYYYYY-
  ```
  - All 51 links between points passed. The container link is now direct to the rig, since the old link through the yard was blocked by the Froston office and desk.
  - The lobby and rig points themselves sit inside furniture and the rig mesh, so routes there stop at the point's stand-in spot right beside it. Routes report this as `snapped`.
- **(b) PASS:** all eight walks pass, measured on the ground: house, igloo, garage, hotel, market, camp, Froston and dock.
  - Fixed: the walks now go around a mailbox, the drive car, the notice board, a stall crate and the dock hut. The paths layer went from version 1 to 4.
  - The town's street poles used one big box as their collider, wires and crossarm included, which made a wall across the sidewalk. They now have no collider of their own; an invisible trunk-sized one stands at each pole, and it is re-applied every second.
- **(c) PASS, after a fix:** measured in the creator's room over 30 s, nothing was below y −1 and nothing was stuck.
  - Fixed: Sergeant Ines had wandered to x −549, and Guard 1 and Doug were stranded 35 m and more past the river on the far bank. A new rule sends any townsperson, guard or cultist home if they stay 30 m past every stop of their round for 20 s (the distance was 45 m before I tightened it to 30). Guard 1 and Ines went back home.
  - Doug's move home under the 30 m rule was not re-measured.
  - Three foes were gone during the window, most likely killed (froid-east-2, rat-garage-0 and rat-garage-4).
- **(d) PASS:** the zone labels read right at five points: (0, 42) Kelpie Street, (−32, −18) Burns Crescent, (30, −80) Parliament Hotel, (−36, −76) Froidetown, (62, 16) Froston. The player's zone check and the Level 0 name list were already wired to Level 70.

**What I did not do**
- I did not move NPC homes to the hotel lectern, market stall, fires, dock post or camp fire, and I did not check where the different layers' pieces overlap.
- I didn't check the walks on the ground with a body for the cellar or container interiors. Only the links in the route graph were tested.

**Looks:** the house walk and the hotel walk read as trampled, bootprinted snow, and the hotel doorway is lit. The hotel walk shows thin white curb lines along its edges. The white shapes over Kelpie Street and the hotel are the same thing the wild layer reported as a dark slab.

**Laid:** `l70-path*`, which is the walks, snow heaps, trail lights, three ramps (`l70-path-ramp-*`) and `l70-path-polecol-0..3`. The paths layer was registered in the Level 70 sim, and the route graph's version went from 3 to 4. I made no new models.
REPAIRS REPORTED:
1 The full walk from ARRIVE was not finished and five of the six checks fail. One thing I couldn't confirm: whether a crate at the bottom of the cellar steps blocks the way down.

**Checks**
- **Doorways for a 1.7 m body: FAIL.**
  - These pass a walk test: the house porch and front door, the igloo, the garage through to the valve room, and the hotel lobby (if you walk round the chairs).
  - The cellar doorway now passes too. It is about 1 m wide, centred at x −43.8.
  - At the foot of the cellar steps, the walk test is stopped by `l70-cellar-crate` at (−43.8, −22.4). I did not get to check whether you can step round it.
  - The Froston container was not tested.
- **No fall-through floor: FAIL (not fully checked).** The house floor reads y 0.54 and the cellar floor y 0.02, both solid. The hotel, garage, igloo and container floors were not checked from above.
- **Interiors lit enough to read: FAIL.** No close look was taken inside any interior.
- **No visible box or cylinder props: FAIL (not fully checked).** The only primitives I read back were the invisible porch and cellar ramps and the pole stand-ins. There was no full sweep of the place.
- **Nothing floating or sunk: FAIL.** Not checked.
- **White 70 door crosses to Level 31: PASS.** Playing my own body, walking into the hut door took me to Level 31, and the way back returned me to Level 70.

**Fixes**
- **House door openings:** the house and cellar door openings are now 2.3 m tall.
- **Collision shell:** the house's invisible collision shell no longer includes the cellar's open steel door, which had been blocking the cellar doorway. I rebuilt and re-uploaded the shell.
- **House height:** the house, its shell and the igloo are lowered 0.3 m. The house floor is now at 0.54 m.
- **Town layer:** version went from 1 to 3. I re-laid it by hand in my test room because the Level 70 sim wasn't running there with no player present.
- **Paths layer:** version went from 4 to 7.
  - The porch ramp was re-fitted to the lower floor. The front door walk passes.
  - The cellar ramp was re-fitted (0.56 m down to 0.02 m) and centred on the real doorway.
- **Paths re-lay side effect:** re-laying the paths took out one of your placed objects and set the collision of 4 objects to none. Undo puts them back.
- **Preload list:** now points at the new house, shell and igloo.

**Ids laid:** the whole town layer was re-laid under the same ids the town lane reported, plus `l70-path-ramp-porch` and `l70-path-ramp-cellar`.

**Models made:**
- House: /cdn/value.1bdea65fb6af6ad08a32a36c5ec23a3c92b1c4d62a8e79105ba254af48e2f198.glb
- Collision shell (current): /cdn/value.0edcb5f24560a45372d0b4c4c776acb8d9b4db9e4754df04f2d1b331c6228efd.glb
- Igloo: /cdn/value.600dc4c53bd57d818bd513ffa49258c425f38da0de26e07d7795c0be9b1a6f91.glb
- No Tripo generations used.
2 Out of five checks, two pass in my test room, two fail and one has an open question. I made no code fixes in this pass. Everything below was tested in my own test room, not in the creator's room.

- **Quest NPCs stand and talk on E: FAIL.** All five are at their spots: Marinerson and Odell at the Noahtown stalls, Larsson by the hotel, Vael at the camp, Ines at the south end of the street. Pressing E on Odell opens his talk panel, but it shows the generic greeting ("Which hall did you come through?") instead of his Level 70 lines. The Level 70 dialogue file is loaded, so the fault is in how dialogue picks an NPC's lines, not in the lines themselves. I didn't fix it. The other four weren't talked to one by one.
- **Residents walk rounds and do their stop actions: PARTLY PASS.** They walk and talk (Pierrette and Marinerson were seen moving and saying lines), and nothing fell below the ground. I didn't watch every resident through a full round, so stop actions, getting stuck and how their clothes fit are still unchecked.
- **Drawing a weapon gets nerve reactions: FAIL.** Odell and Marinerson stayed calm while I held a pistol at about 4 m. Since the latest change, NPCs react only when you aim down sights, and holding right mouse never registered as aiming in my state. I also couldn't force it, because the game resets it on my own machine. There may also be a facing problem: the compass showed I was facing east, but the aim check worked out that I was facing away from Marinerson. Unconfirmed.
- **A Guard and a cultist fight when they meet: PASS.** I put a cultist next to Guard 3. Ten seconds later the cultist was dead and the guard's last hit came from him.
- **Hostile reputation makes a faction attack: PASS.** With my standing with the Froidetownites at −100, the guard turned on me and my HP dropped from 100 to about 25 in 6 s. I set my standing and HP back afterwards.

**Fixes made:** none that change how the game plays. The only edit was a comment line in the dialogue module. The life layer stays at version 3, so nothing was laid again. Another lane fixed a code error that was freezing Level 70's foes while I was testing.

**Ids laid:** none new. **Models made:** none.
3 I played Level 70's froidlings in a test room. They notice you, close in, bite, die to the pistol and now drop loot, and they run from fire and from a lit flare. I didn't get to the melee, rat or garage checks.

- **Packs notice, stalk, rush from behind:** FAIL, not isolated. A froidling closed on me and bit hard (HP fell 170 → 17), and the next one I placed backed off once the flare was lit. I never tested the circling or the attack on a turned back on their own.
- **Gun damage:** PASS. My pistol shots dropped a froidling from 72 HP to 19.
- **Melee damage:** FAIL, not tested.
- **Die and drop loot:** PASS after a fix. It died and gave +36 XP. Before the fix the body searched as "empty"; now it reads "Snow Hound remains", holds a froid pelt, and the kill counts toward the quests.
- **Flee from fire:** PASS. A froidling placed 2.9 m from the market fire was 13.4 m away 2.5 s later, running away from me too.
- **Flee from a lit flare:** PASS, with a caveat. I switched the flare on in code, not by firing the flare gun. A froidling placed 7.6 m from me was 11.3 m away 3 s later.
- **Rats swarm in the garage:** FAIL, not tested. Ten rats are alive about 50 m away, in their garage and hotel nests.
- **Chill on a bite:** FAIL, not isolated. Chill rose to "shivering" (76) during the fights, but it also rises from just being outdoors, and I didn't take a rat bite on its own. The rat bite does add chill in the code.
- **No clipping through walls or floating:** FAIL, not proven. Live foes stood 0.02–0.05 m above the ground and looked seated in close looks. The 0.32 m reading on the fleeing one was taken mid-run. I ran no wall test.
- **Manager sleeps when no player is near:** PASS in the code only. Before the fix it slept only when the level was empty; now it also sleeps for 2 s whenever no pack or swarm has a player within 60 m. I didn't time a sleep in the game.

**Fixes I made:**
- **Loot:** the game's own kill code laid the body before the beast manager did, so the body stayed empty and the kill never counted. The manager now adds the pelt (or rat meat) to the body and counts the kill once. This matters for the quests, because Odell's "kill 5 death rats" and Ines's pelt hunt read those kill counts.
- **Manager sleep:** added the check above.
- **A clash I caused:** my sleep fix and another edit made from the room each added the same check, and the beast script stopped loading. I removed the extra copy and it loads again.
- **Bite timing:** I widened the gap between the pack's bites a little, from 0.65 s to 0.9 s.

No layer version changed, nothing new was placed, and I made no models. Another edit from the room retuned froidlings into tougher "Snow Hounds" (110 HP, 16 bite); I kept that.
4 I didn't play the quest as a player. Every check that needed real play still fails. All checks below came from running the quest code directly in my own test room, not on the player page and not in the creator's room.

- **Every stage advances and shows in the HUD: FAIL.** The quest code moves the city, spur and Pelt Tax stages in order. The HUD only showed the first Dry Pipes stage; later stages were never seen on screen.
- **Fuse obtainable all three ways: FAIL.** Buying it ($60) and the rat job both work: after 5 Death Rat kills, "Your garage is rat-free" gives the fuse and moves the quest on. The Sneak 45 lift didn't give a fuse in a test where the player had sneak 100. That may be because the test used the wrong stat name, so it's unresolved, not proven broken.
- **Valves turn with sound and visible rotation, gauge reads live: FAIL.** In code, a valve turns a quarter and the gauge text changes. Neither the turning, the squeal nor the gauge was seen or heard in play.
- **Each of the three solutions triggers its ending and rep changes: FAIL.**
  - City and spur end in code with their pay and rep changes.
  - Balanced hit a bug: turning the valves one at a time passed through the spur setting on the way and ended the quest as spur. I fixed it (below). The gauge then read balanced, but I never waited for the ending to fire.
- **Rewards pay: PASS (code only).** City, spur and both side quests pay; balanced is unconfirmed.
  - City: $300, 450 XP, toque and flare gun.
  - Spur: $220 and 450 XP.
  - Pelt Tax via the Guard: $60, 150 XP, +15 Froidetownite rep.
  - Froston's Ledger via Ines: $80, 160 XP, +5 Froidetownite and −15 B.N.T.G. rep.
- **Side quests: PASS (code only).** Pelt Tax runs the full chain: 6 froidlings, then 4 pelts. Froston's Ledger offers a hand-in to Ines, Odell and Vael. Neither was played.
- **Froston Scrapper, Gelu Ice Pick and flare gun: FAIL.** An earlier screenshot showed the Scrapper in first person, but that was before my fit change below. The fitted Scrapper and Ice Pick, third person, the flare gun and damage were never checked.
- **Every new item has a name, icon/model and works when used: FAIL.** I didn't go through the items.
- **Chill rises and falls: FAIL.** The rules are in the code and I added a CHILL bar to the HUD, but I never saw it change in play.

**Fixes made:**
- **Balanced valve fix:** a correct valve setting now has to hold for 3 seconds with the breaker on before it ends the quest. Passing through the spur or city setting on the way to balanced no longer ends it early. No layer version changed, because the layout didn't change.
- **Weapon fit:** the Scrapper and Ice Pick now face along their real long axis (forward "+z"), at scale 1.07 and 0.54.
- **Chill bar:** added a CHILL bar to the HUD, shown only on Level 70.

**Laid:** nothing new and no new models. The quest layer's own pieces (`l70-q-note`, `l70-q-locker`, `l70-q-schematic`, `l70-q-gauge-face`) were unchanged.
THE REVIEW'S FAULT LIST, worst first: I found nine faults in Froidetown, listed worst first. I fixed one: the market fire. A second fix (snow inside the cellar) is in the house's build script but won't show until the house model is rebuilt. My views came from a separate test room, so what you see may differ a little. I didn't play the quests, puzzles, weapons or items through, so I can't vouch that they work.

1. **The storm cellar is filled with snow** (house `l70-bp-house` at (-40, -0.3, -18); cellar runs about x -44.8 to -40.2, z -25.4 to -21.5). Seven of the snow piles banked against the house reach through the concrete walls and fill the room, so the shelf and crate are half buried. I changed the house's build script so the snow stops at the outside of the walls. To make it show, the house model has to be rebuilt and uploaded, and the town layer needs a version bump to pick it up. I left that alone because another lane is rebuilding the same house right now.
2. **The arrival models' true size isn't proven** (`l70-hut-door` at (0, 0, 45.02), `l70-bp-hut` at (0, 0, 47)). Neither model reported its size when I checked, so I couldn't confirm the door is 2.05 m. Snow piles also cover the bottom of the doorway. Fix: read both sizes in the creator's room once the models load, then pull the snow back from the doorway so it's clear.
3. **The igloo is faceted and blocky** (`SPOT.igloo`, (-52, -4)). Up close it reads as a lumpy white shape, not stacked snow blocks, and nothing like the reference photo (a smooth dome with a tarp and shovels). Fix: rebuild it with real block rows and a smooth dome, and add a tarp, a red extension cord and shovels to dress it.
4. **Froidlings disappear against the snow** (`l70-froid-*`, about 1.4–1.7 m wide and 1.0–1.1 m tall). They're pale and low-contrast, and their shape doesn't read from 8 m away. Fix: give them darker undersides or frost-blue markings and glowing eyes so they stand out.
5. **The death rats look like ordinary pale rats** (`l70-rat-garage-0`, `l70-rat-hotel-0`; about 0.85–1.29 m long, 0.55 m tall). Nothing about them says they're a Level 70 creature. Fix: darker, matted fur, bare tails and a darker colour so they show in the garage light.
6. **The hotel lobby is mostly empty floor** (Parliament Hotel, (34, -80)). There's a lot of open floor with a few chairs and a lectern, and the entrance looks boarded. Fix: add a front desk with key cubbies, rugs, luggage and coat racks, and confirm the way in is clearly readable.
7. **The garage is dim and empty** (Calor garage, (36, -22)). Compared with the bright, white-walled reference photo it's dark, with no green signs or numbered pillars. Fix: add more fluorescent lights, numbered pillars and painted parking lines.
8. **The skyline is washed out**: the towers behind the market fade into flat grey slabs with no lit windows. The reference shows warm lit windows and one tall glass tower. Fix: lit window strips on the far towers, or thinner haze.
9. **Snow piles block too much of some views**: at the cult camp (-96, -82), a bank fills the foreground. At Froston (62, 16), a blue shipping container hides the rig. Fix: pull the bank back and move the container aside so you see what you came for.

**Fixed: the market fires** (`l70-c-fire-0` and `l70-c-fire-1`, Noahtown around (±3.2, -72)). The burn barrels threw up a white column about 3 m tall that hid the stalls. The flames are now smaller, shorter and warmer and stay inside the barrel. I changed the script that builds them and patched the two live fires in your room and the test room, then checked it again from the same camera angle.

**Looks good:** Kelpie Street (power lines, streetlights, vehicles, brick fronts), the market stalls and string lights, and the river post cabin.
Work down that list from the top and fix each in the file that owns it (bump its V). Then a last dressing pass by eye: icicles on eaves, snow caps on horizontal surfaces, warm window glow against the blue hour, footprints at doors. RETURN each fault: FIXED / NOT FIXED why.