// hall C's light panels (params.far: only the dead fixture at its end), their own objects so they can flicker (material emissiveIntensity)
import { H, LIGHTS } from "./lib/tut0.js"
export function geometry(ctx) {
  for (const [x, z, hall] of LIGHTS) {
    const far = !!ctx.params?.far
    if (!hall || (hall === 2) !== far) continue
    ctx.color("oklch(0.85 0.01 90)"); ctx.emissive(null)
    for (const [a, b, c, d] of [[[x - 0.67, H - 0.04, z - 0.37], [x + 0.67, H - 0.04, z - 0.37], [x + 0.67, H - 0.04, z + 0.37], [x - 0.67, H - 0.04, z + 0.37]]]) ctx.quad(...d, ...c, ...b, ...a)
    ctx.color("#fffaf0"); ctx.emissive([2.4, 2.25, 1.8])
    ctx.quad(x - 0.62, H - 0.045, z + 0.32, x + 0.62, H - 0.045, z + 0.32, x + 0.62, H - 0.045, z - 0.32, x - 0.62, H - 0.045, z - 0.32)
  }
  ctx.emissive(null); ctx.color(null)
  return {}
}
