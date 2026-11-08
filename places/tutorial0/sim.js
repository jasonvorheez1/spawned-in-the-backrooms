// The tutorial Level 0's referee: lays the lights, the office pieces and the one bottle of almond water once.
// The beats themselves run on the player's machine (scripts/lib/tut0-cut.js via scripts/main-menu.js).
import { H, LIGHTS, ALMOND, DESK } from "../../scripts/lib/tut0.js"
export const cadence = "1s"
const FM = { desk: "/cdn/value.dc2f7ac92df4c08964be1ea4af5e520bbf4c12d50609157f85b41db8f3c21fcf.glb", chair: "/cdn/value.34ee5f211b991e7489c032ed09d062af9fda8ef8a79c69afadafd1a650be47d8.glb", shelf: "/cdn/value.9f3b838cc1b4403a54d96e1b80372c75c9a440c1d4e61a4760f60de82133526b.glb", copier: "/cdn/value.5489a9397b8e52f5ea0f528a387d0449d0787726d6bc65bd041ec8faf80f9362.glb" }
// [kind, x, z, yaw]: a few office pieces someone left behind
const PROPS = [["chair", 3.6, -3.4, 200], ["shelf", -4.6, 2.5, 90], ["desk", DESK.x, DESK.z, 90], ["chair", -3.1, -15.2, 250], ["copier", 3.3, -30.4, 0], ["chair", 22, -27.3, 30], ["shelf", 47.4, -31, 270], ["desk", 50.6, 2.6, 270], ["chair", 39.5, -6.4, 140]]
export function tick(ctx) {
  const s = ctx.place.state
  if (s.built) return
  s.built = true
  LIGHTS.forEach(([x, z, hall], i) => ctx.spawn({ id: `t0-light-${i}`, tags: hall ? ["t0hall"] : ["t0light"], feetPosition: { x, y: H - 0.3, z }, visibleRange: { max: 42 }, light: { kind: "point", color: "oklch(0.95 0.06 95)", intensity: 5, distance: 10, shadow: { enabled: false } } }))
  for (const [k, x, z, yaw] of PROPS) ctx.spawn({ tags: ["furniture", k], feetPosition: { x, y: 0, z }, rotation: yaw, physics: { body: "static", collider: "box" }, model: { id: FM[k], forward: "+z" } })
  ctx.spawn({ id: "t0-almond", tags: ["almond"], feetPosition: ALMOND, rotation: 30, castShadow: false, model: "/cdn/value.a762c3c5b45b825a10d0e93b00d009ae455200b423a5b63cda9e8d34bbc7750c.glb", layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.32, z: 0.07 } } } })
}
