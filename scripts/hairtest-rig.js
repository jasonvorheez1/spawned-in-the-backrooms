// TEMP (hair lane test rig, deleted after the check): a still critter wearing state.look, built the way scripts/critter.js builds a player
import { bodyModel, headModel, faceMorph, bustMorph, HEAD_ID, hairChild, hairOf } from './lib/critter-model.js'
import C from './lib/data/critter.yml'
function build(ctx) {
  const l = { ...C.default, ...(ctx.self.state.look || {}) }, isF = l.sex === 'f'
  ctx.self.model = bodyModel(l); const bm = bustMorph(l); if (bm) ctx.self.morph = bm
  const head = ctx.getObject(ctx.self.id + '/' + HEAD_ID)
  const hm = headModel({ ...l, vary: false }), fm = faceMorph('smile', false, isF, l)
  if (!head) ctx.spawn(HEAD_ID, { parent: ctx.self.id, attachment: { skin: true }, model: hm, morph: fm }); else { head.model = hm; head.morph = fm }
  const hid = ctx.self.id + '/critter-hair', h = ctx.getObject(hid), hc = hairChild(l, false)
  if (!hc) { if (h) ctx.destroy(hid); } else if (!h) ctx.spawn('critter-hair', { parent: ctx.self.id, ...hc }); else h.model = hc.model
  ctx.self.state.built = hairOf(l) || 'none'
}
export function onSpawn(ctx) { build(ctx) }
export const ears = { rebuild: (ctx) => build(ctx) }
