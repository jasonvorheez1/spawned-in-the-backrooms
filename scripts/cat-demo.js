// debug-studio stand for the new Tripo cat: dresses itself from state.sex + state.look through the cat wardrobe, plays state.clip (Idle | Walk)
import { catModel, catChildren } from './lib/cat-wardrobe.js'
export function onSpawn(ctx) { dress(ctx) }
export const ears = { redress: (ctx) => dress(ctx) }
function dress(ctx) {
  const s = ctx.self.state, sex = s.sex === 'm' ? 'm' : 'f'
  ctx.self.model = catModel(sex, s.look)
  for (const c of catChildren(sex, s.look)) if (!ctx.getObject(ctx.self.id + '/' + c.id)) ctx.spawn(c.id, { parent: ctx.self.id, ...c })
  ctx.self.anim.base = { clip: s.clip || 'Idle', loop: true }
}
