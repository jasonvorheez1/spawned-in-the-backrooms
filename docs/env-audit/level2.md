# Level 2 "Pipe Dreams": environment audit

Lore card mw84fradr4jzb: long dim maintenance tunnels, pipes everywhere, heat, dripping, steam, concrete walls. Kept: the corridor shell, the pipe runs, the Tripo prop set, the doors, the Sublevel 2.1 shutter.

## Inspected
- places/level2/config.yaml, sim.js, cells/x0z0.scene, scripts/lib/l2props.js + data, art/level2/build.py.
- Looked at it in camera shots from eye height in corridors and the stairwell, plus an aerial and isolated shots of each fixture.

## Ranked offenders (what a player sees first)
1. Ceiling lamps: 176 box+sphere code shapes. REPLACED.
2. Violet warning lamps: 26 box/sphere shapes. REPLACED.
3. Floor slicks/sludge: 12 flat primitive discs. REPLACED.
4. Stairwell flight to Sublevel 2.1: 13 stacked boxes plus 13 box noses. REPLACED with a cast concrete flight with yellow nosing and steel stringers. The 13 boxes stay as hidden walkable colliders.
5. l2-stair-block (blast shutter): a single steel box. Still a box (see open).
6. l2-stair-glow: a box light card. Still open.
7. l2-geo: the walls, floor and ceiling shell. Flat concrete is right for this architecture, so it stays.

## Replaced / improved
- art/level2/fixtures.py: one Blender script builds five fixture GLBs (cage lamp, violet lamp, sludge slick, stair flight, and its parts) with named material slots and real roughness.
- places/level2/sim.js: `fixV` revision gate (now 3). `fixtures(ctx)` swaps each old primitive for its mesh in place. Ids, tags and lights are kept, and the swap removes the old flight before it lays the new one, so no duplicates stack.
- Stair v3 (/cdn/value.9f7a807b…glb, 1,592 tris, offset [0,0,-1.775]): flight v2 had floating diagonal stringers. They are now plates built from vertices and seated against both sides of the flight. Checked in an isolated look.

## Verified
- Measured: live in room crew-c660abe6 there are 176 l2lamp, 26 l2violet and 12 l2sludge objects, and l2-stair-flight is on the v3 model. All 13 step colliders are present.
- Measured (findPath, collider-based): spawn (-55, 2.5) stands on l2-geo at y=0. Paths from spawn reach l2-door-1, l2-door-10 and the foot of the stair.
- l2-door-5 (Break room) is unreachable from spawn because it is a closed kinematic hinged door. This is how it was built, not a new collider.
- The stair top cannot be walked to because the 800 hp breakable shutter stands at its foot. That is the original "access suspended" design.
- Not done: a test-body walk in the browser. A fresh-room rebuild was not watched; it was run by hand in the crew room.

## Still open
- The Sublevel 2.1 shutter and stair glow card are still boxes. They should become a modelled roll-up blast shutter with a frame and a recessed light.
- The Tripo props in l2props.yml were not re-audited for scale in this pass.
- Steer about the Level 2.1 sign ui (l21-edge-exit-22): Level 2.1 lane, not this level. Nothing changed here.

## Change lines
- lamps: 176 box/sphere lamps → modelled cage lamps (sim.js fixtures, fixV)
- violet: 26 violet lamps → modelled fixture
- sludge: 12 primitive slicks → modelled slick mesh
- stair: 13-box stair → cast concrete flight v3 with seated stringers; box colliders kept hidden

## Load check (readOnly, place level2)
`return { lamps: ctx.query({anyTags:["l2lamp"]}).length, violet: ctx.query({anyTags:["l2violet"]}).length, sludge: ctx.query({anyTags:["l2sludge"]}).length, stair: ctx.place.objects["l2-stair-flight"]?.model?.id }`
→ 176 / 26 / 12 / /cdn/value.9f7a807b370ffa640ec97dfb742ddc524fd40f6bd7f10cb03b47f388ef414e97.glb
