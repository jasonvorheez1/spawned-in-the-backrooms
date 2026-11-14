// The tutorial Level 0's referee: lays the lights, the office pieces and the one bottle of almond water once.
// The beats themselves run on the player's machine (scripts/lib/tut0-cut.js via scripts/main-menu.js).
import { H, LIGHTS, ALMOND, DESK, ENC, HALO, DRAWINGS } from "../../scripts/lib/tut0.js"
export const cadence = "1s"
const DRAW = { 1: "/cdn/value.b2ab7e96ce5c388ee348a577c294e1824b0d175136366663366888cb34e20fc5.png", 2: "/cdn/value.bb5b7b66fe16fd3a01ff147c8017b423d5b2033ff5d57bdc1f50887335a93d80.png", 3: "/cdn/value.9004aa6e46f1bd2748b540b24ad652ec4a4b01b79d571c2207f29c49088b82a6.png", 4: "/cdn/value.8fd76de8d1f9bc26360a66a4ec17d8f2b6cdc1c02ee29a7c4f6fc67832036cd6.png" }
const HALO_MODEL = { id: "/cdn/value.28190f626e7fab441feb638bbf3abfb719b3f9a55a84a8b7dd22457d6897642c.glb", forward: "-z", offset: [0.119, -0.005, -0.056] } // the Blender HALOGEN machine (art: /workspace/halogen/build.py); offset keeps the cabinet, not the cable, on the feet
const BENCH_MODEL = "/cdn/value.a38bcbd4f551deb9aaf6fba383d7eaadb341a1aaba258f537471bcb5159c7f26.glb" // the Tripo workbench Level 5 uses
const CARTON_MODEL = "/cdn/value.d4da0db276e9457c56a83cce2ef518cccc8065d0f8e158c7c82f747f45c97b2f.glb"
const FM = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" }
// [kind, x, z, yaw]: a few office pieces someone left behind
const PROPS = [["chair", 3.6, -3.4, 200], ["shelf", -4.6, 2.5, 90], ["desk", DESK.x, DESK.z, 90], ["chair", -3.1, -15.2, 250], ["copier", 3.3, -30.4, 0], ["chair", 22, -27.3, 30], ["shelf", 47.4, -32.2, 270], ["desk", 50.6, 2.6, 270], ["chair", 39.5, -6.4, 140]]
// Nov 11, a harder walk to the soft floor: a shelf that came down across corridor E and a dead copier past it, so you weave;
// the corridor's last light gave out to a dim stutter. Both leave the drawings on the walls in view.
const BLOCK = [["shelf", 43.35, -15.6, { yaw: 4, pitch: 84 }, 0], ["copier", 44.75, -12.2, { yaw: 200, roll: 6 }, 0.02]]
function harder(ctx, s) {
  if (s.t0hard === 1) return
  s.t0hard = 1
  for (const [k, x, z, rot, y] of BLOCK) ctx.spawn({ tags: ["furniture", "t0prop", "t0block", k], feetPosition: { x, y, z }, rotation: rot, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  ctx.spawn({ tags: ["t0prop", "t0block"], feetPosition: { x: 44.2, y: 0, z: -14.2 }, castShadow: false, primitive: { kind: "scripted", script: "scripts/moments-geo.js", params: { kind: "papers", seed: 23 } } })
  const o = ctx.getObject("t0-light-18"); if (o?.light) o.light = { ...o.light, intensity: 1.4 }
}
export function tick(ctx) {
  const s = ctx.place.state
  if (s.built === 6) return harder(ctx, s)
  if (s.built) for (const o of ctx.query({ anyTags: ["t0prop", "furniture", "halogen-unit", "almond", "bench", "container"] })) ctx.destroy(o.id) // an older layout, laid again whole
  for (let i = 0; i < LIGHTS.length; i++) if (ctx.getObject(`t0-light-${i}`)) ctx.destroy(`t0-light-${i}`)
  s.built = 6; s.t0hard = 0 // 6 (Nov 14): the workbench is the fitted Tripo bench, not build-geo blocks
  LIGHTS.forEach(([x, z, hall], i) => hall !== 2 && ctx.spawn({ id: `t0-light-${i}`, tags: hall ? ["t0hall"] : ["t0light"], feetPosition: { x, y: H - 0.3, z }, visibleRange: { max: 42 }, light: { kind: "point", color: "oklch(0.95 0.06 95)", intensity: 5, distance: 10, shadow: { enabled: false } } }))
  for (const [k, x, z, yaw] of PROPS) ctx.spawn({ tags: ["furniture", "t0prop", k], feetPosition: { x, y: 0, z }, rotation: yaw, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  // room B: the desk that gave out, one leg already off it, where they'll be cornered
  ctx.spawn({ tags: ["t0prop"], feetPosition: { x: ENC.desk.x, y: 0.05, z: ENC.desk.z }, rotation: { yaw: 20, roll: 14 }, physics: { body: "static", collider: "box" }, model: { id: FM.desk, forward: "+z" } })
  // corridor A alcove: a supply carton beside the desk so looting containers + scrap can be learned early
  ctx.spawn({ id: "t0-carton", tags: ["container", "t0prop"], feetPosition: { x: -4.35, y: 0, z: -14.65 }, rotation: { yaw: 18 }, physics: { body: "static", collider: "box" }, model: { id: CARTON_MODEL }, layout: { box: { min: { x: -0.22, y: 0, z: -0.22 }, max: { x: 0.22, y: 0.38, z: 0.22 } } }, state: { name: "Supply Carton", items: "wire,drywall,steel_pipe,scrap_metal" } })
  // room D: the HALOGEN issue machine (scripts/lib/tut0-cut.js halogen), plus a salvaged workbench and carton
  ctx.spawn({ id: "t0-halogen", tags: ["t0prop", "halogen-machine"], feetPosition: { x: HALO.x, y: 0, z: HALO.z }, rotation: HALO.yaw, physics: { body: "static", collider: "box" }, model: HALO_MODEL })
  ctx.spawn({ id: "t0-bench", tags: ["bench", "t0prop"], feetPosition: { x: 43.6, y: 0, z: -32.3 }, rotation: 0, physics: { body: "static", collider: "box" }, model: { id: BENCH_MODEL }, layout: { box: { min: { x: -1.1, y: 0, z: -0.45 }, max: { x: 1.1, y: 1.7, z: 0.45 } } }, state: { name: "Workbench", station: "bench" } })
  ctx.spawn({ id: "t0-crate-d", tags: ["container", "t0prop"], feetPosition: { x: 41.5, y: 0, z: -32.3 }, rotation: { yaw: -12 }, physics: { body: "static", collider: "box" }, model: { id: CARTON_MODEL }, layout: { box: { min: { x: -0.22, y: 0, z: -0.22 }, max: { x: 0.22, y: 0.38, z: 0.22 } } }, state: { name: "Supply Carton", items: "wire,drywall,scrap_metal,almond" } })
  // corridor E and room F: the notes someone taped up on the way to the wet spot
  for (const [n, x, z, yaw, w] of DRAWINGS) ctx.spawn({ tags: ["t0prop", "t0-drawing"], feetPosition: { x, y: 1.45, z }, rotation: { yaw }, castShadow: false, primitive: { kind: "plane", width: w, height: w }, material: { texture: DRAW[n], transparent: true, alphaTest: 0.4, roughness: 0.95, side: "double" } })
  ctx.spawn({ id: "t0-almond", tags: ["almond"], feetPosition: ALMOND, rotation: 30, castShadow: false, model: "/cdn/value.d74570d765a2d43f965fc8756878f7bf22f833db5feaf4c335d84d8dc4ba5b62.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } })
}
