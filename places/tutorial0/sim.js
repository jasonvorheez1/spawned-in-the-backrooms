// The tutorial Level 0's referee: lays the lights, the office pieces and the one bottle of almond water once.
// The beats themselves run on the player's machine (scripts/lib/tut0-cut.js via scripts/main-menu.js).
import { H, LIGHTS, ALMOND, DESK, ENC, HALO, DRAWINGS } from "../../scripts/lib/tut0.js"
export const cadence = "1s"
const DRAW = { 1: "/cdn/value.b2ab7e96ce5c388ee348a577c294e1824b0d175136366663366888cb34e20fc5.png", 2: "/cdn/value.bb5b7b66fe16fd3a01ff147c8017b423d5b2033ff5d57bdc1f50887335a93d80.png", 3: "/cdn/value.9004aa6e46f1bd2748b540b24ad652ec4a4b01b79d571c2207f29c49088b82a6.png", 4: "/cdn/value.8fd76de8d1f9bc26360a66a4ec17d8f2b6cdc1c02ee29a7c4f6fc67832036cd6.png" }
const HALO_MODEL = { id: "/cdn/value.28190f626e7fab441feb638bbf3abfb719b3f9a55a84a8b7dd22457d6897642c.glb", forward: "+z", offset: [0.119, -0.005, -0.056] } // the Blender HALOGEN machine (art: /workspace/halogen/build.py); offset keeps the cabinet, not the cable, on the feet
const FM = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" }
// [kind, x, z, yaw]: a few office pieces someone left behind
const PROPS = [["chair", 3.6, -3.4, 200], ["shelf", -4.6, 2.5, 90], ["desk", DESK.x, DESK.z, 90], ["chair", -3.1, -15.2, 250], ["copier", 3.3, -30.4, 0], ["chair", 22, -27.3, 30], ["shelf", 47.4, -32.2, 270], ["desk", 50.6, 2.6, 270], ["chair", 39.5, -6.4, 140]]
export function tick(ctx) {
  const s = ctx.place.state
  if (s.built === 4) return
  if (s.built) for (const o of ctx.query({ anyTags: ["t0prop", "furniture", "halogen-unit", "almond"] })) ctx.destroy(o.id) // an older layout, laid again whole
  for (let i = 0; i < LIGHTS.length; i++) if (ctx.getObject(`t0-light-${i}`)) ctx.destroy(`t0-light-${i}`)
  s.built = 4
  LIGHTS.forEach(([x, z, hall], i) => hall !== 2 && ctx.spawn({ id: `t0-light-${i}`, tags: hall ? ["t0hall"] : ["t0light"], feetPosition: { x, y: H - 0.3, z }, visibleRange: { max: 42 }, light: { kind: "point", color: "oklch(0.95 0.06 95)", intensity: 5, distance: 10, shadow: { enabled: false } } }))
  for (const [k, x, z, yaw] of PROPS) ctx.spawn({ tags: ["furniture", "t0prop", k], feetPosition: { x, y: 0, z }, rotation: yaw, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  // room B: the desk that gave out, one leg already off it, where they'll be cornered
  ctx.spawn({ tags: ["t0prop"], feetPosition: { x: ENC.desk.x, y: 0.05, z: ENC.desk.z }, rotation: { yaw: 20, roll: 14 }, physics: { body: "static", collider: "box" }, model: { id: FM.desk, forward: "+z" } })
  // room D: the HALOGEN issue machine, Backrooms Robotics (scripts/lib/tut0-cut.js halogen)
  ctx.spawn({ id: "t0-halogen", tags: ["t0prop", "halogen-machine"], feetPosition: { x: HALO.x, y: 0, z: HALO.z }, rotation: HALO.yaw, physics: { body: "static", collider: "box" }, model: HALO_MODEL })
  // corridor E and room F: the notes someone taped up on the way to the wet spot
  for (const [n, x, z, yaw, w] of DRAWINGS) ctx.spawn({ tags: ["t0prop", "t0-drawing"], feetPosition: { x, y: 1.45, z }, rotation: { yaw }, castShadow: false, primitive: { kind: "plane", width: w, height: w }, material: { texture: DRAW[n], transparent: true, alphaTest: 0.4, roughness: 0.95, side: "double" } })
  ctx.spawn({ id: "t0-almond", tags: ["almond"], feetPosition: ALMOND, rotation: 30, castShadow: false, model: "/cdn/value.a762c3c5b45b825a10d0e93b00d009ae455200b423a5b63cda9e8d34bbc7750c.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } })
}
