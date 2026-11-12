// debug-studio stand for the new Tripo cat: dresses itself from state.sex + state.look through the cat wardrobe, plays state.clip (Idle | Walk)
import { CAT_BODY, catModel, catChildren, catMorph } from './lib/cat-wardrobe.js'
import { mouthAt } from './lib/critter-model.js'
export function onSpawn(ctx) { dress(ctx) }
export function update(ctx) {
  // talking (Shelly Nov 12 "test how they talk"): a line in state.line flaps the painted mouth between the open layer and the cat's own, letter by letter
  const ln = ctx.self.state.line
  if (ln?.t) {
    const m = mouthAt(ln.t, ctx.now() - ln.at), open = !!m && m.reduce((a, b) => a + b, 0) > 0.55
    const ses = ctx.self.session
    if (open !== !!ses.open) { ses.open = open; const sx = ctx.self.state.sex === 'm' ? 'm' : 'f', lk = ctx.self.state.look; ctx.self.model = catModel(sx, open ? { ...lk, mtype: lk.mtype === 'open' ? 'line' : 'open' } : lk) }
    if (!m && ctx.now() - ln.at > 300) { delete ctx.self.state.line; ses.open = false; ctx.self.model = catModel(ctx.self.state.sex === 'm' ? 'm' : 'f', ctx.self.state.look) }
    return
  }
  // A demo standing in an open debug room also picks up a new wardrobe build.
  const sex = ctx.self.state.sex === 'm' ? 'm' : 'f'
  const changedBody = ctx.self.model?.id !== CAT_BODY[sex].glb
  const changedClothes = catChildren(sex, ctx.self.state.look).some(child =>
    { const h = ctx.getObject(ctx.self.id + '/' + child.id)?.model; return h?.id !== child.model.id || JSON.stringify(h?.materials ?? h?.parts ?? null) !== JSON.stringify(child.model.materials ?? null) })
  if (changedBody || changedClothes) dress(ctx)
  ctx.sleep(2)
}
export const ears = { redress: (ctx) => dress(ctx), say: (ctx, p) => { ctx.self.state.line = { t: String(p?.text ?? ''), at: ctx.now() } } }
function dress(ctx) {
  const s = ctx.self.state, sex = s.sex === 'm' ? 'm' : 'f'
  ctx.self.model = catModel(sex, s.look)
  ctx.self.morph = catMorph(s.look)   // the body's Chest key; the top child carries its own
  for (const k of ['ears', 'topw', 'botw', 'shoes', 'hat', 'mask', 'hair', 'fluff-cheeks', 'fluff-burns', 'fluff-crest', 'fluff-lynx', 'fluff-ruff', 'fluff-mane', 'fluff-nape', 'fluff-cowlick']) if (ctx.getObject(ctx.self.id + '/cw-' + k)) ctx.destroy(ctx.self.id + '/cw-' + k)
  for (const c of catChildren(sex, s.look)) ctx.spawn(c.id, { parent: ctx.self.id, ...c })
  ctx.self.anim.base = { clip: s.clip || 'Idle', loop: true }
}
