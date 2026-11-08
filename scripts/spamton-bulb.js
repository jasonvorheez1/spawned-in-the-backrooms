// the bare bulb over Spamton's basement: swings on its cord, and stutters when he gets loud
import { animate } from 'builtin/tween'
export function onSpawn(ctx) {
  animate(ctx, ctx.self, { 'feetPosition.x': [-0.5, 0.5] }, { duration: 2.6, easing: 'easeInOutSine', direction: 'alternate', loop: true })
}
export function update(ctx) {
  const now = ctx.now(), m = (ctx.self.session.f ??= { at: 0, on: true })
  if (now < m.at) { ctx.sleep(0.05); return }
  m.on = !m.on || ctx.random() < 0.85
  m.at = now + (m.on ? 400 + ctx.random() * 3500 : 40 + ctx.random() * 90)
  const L = ctx.self.light
  if (L) ctx.self.light = { ...L, intensity: m.on ? 7 : 0.6 }
  ctx.self.material = { ...ctx.self.material, emissiveIntensity: m.on ? 6 : 0.4 }
}
