// debug-studio stand for the new Tripo cat: dresses itself from state.sex + state.look through the cat wardrobe, plays state.clip (Idle | Walk)
import { CAT_BODY, catModel, catChildren, chestOf } from './lib/cat-wardrobe.js'
export function onSpawn(ctx) { dress(ctx) }
export function update(ctx) {
  // A demo standing in an open debug room also picks up a new wardrobe build.
  const sex = ctx.self.state.sex === 'm' ? 'm' : 'f'
  const changedBody = ctx.self.model?.id !== CAT_BODY[sex].glb
  const changedClothes = catChildren(sex, ctx.self.state.look).some(child =>
    ctx.getObject(ctx.self.id + '/' + child.id)?.model?.id !== child.model.id)
  if (changedBody || changedClothes) dress(ctx)
  ctx.sleep(2)
}
export const ears = { redress: (ctx) => dress(ctx) }
function dress(ctx) {
  const s = ctx.self.state, sex = s.sex === 'm' ? 'm' : 'f'
  ctx.self.model = catModel(sex, s.look)
  ctx.self.morph = chestOf(s.look)   // the body's Chest key; the top child carries its own
  for (const k of ['topw', 'botw', 'shoes', 'hat', 'mask', 'fluff-cheeks', 'fluff-burns', 'fluff-crest', 'fluff-lynx', 'fluff-ruff', 'fluff-mane']) if (ctx.getObject(ctx.self.id + '/cw-' + k)) ctx.destroy(ctx.self.id + '/cw-' + k)
  for (const c of catChildren(sex, s.look)) ctx.spawn(c.id, { parent: ctx.self.id, ...c })
  ctx.self.anim.base = { clip: s.clip || 'Idle', loop: true }
}
