// The Blender critter as a spec: the body GLB for the look's sex (garments shown by name, tinted by the look's hex)
// and the species head (head, face, ears, tail) as a skinned child riding the same rig. Data: scripts/lib/data/critter-models.yml.
import M from './data/critter-models.yml'
export const HEAD_ID = 'critter-head'
export const GAIT_LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb', sit: 'cdn/clip-sit-loop.glb' }
const CLOTH = { topw: ['cloth_top', 'top'], botw: ['cloth_bottom', 'bottom'], shoes: ['cloth_shoes', 'shoec'], hat: ['cloth_hat', 'hatc'], neck: ['cloth_neck', 'neckc'] }
export const speciesOf = (l) => M.species[l?.species] ? l.species : 'cat'
function furMats(l) {
  const sp = M.species[speciesOf(l)], fur = l.fur || sp.fur
  const m = { fur: { color: fur }, limb: { color: l.fur ? fur : sp.limb || fur }, belly: { color: sp.belly }, tip: { color: sp.tip || sp.belly } }
  if (sp.nose) m.nose = { color: sp.nose }
  if (sp.mark) m.mark = { color: sp.mark }
  if (sp.inner) m.inner = { color: sp.inner }
  if (sp.antler) m.antler = { color: sp.antler }
  return m
}
const only = (m, keys) => { const o = {}; for (const k of keys || []) if (m[k]) o[k] = m[k]; return o }
export function bodyModel(l) {
  const parts = {}
  for (const p of M.parts) parts[p] = { visible: false }
  for (const [slot, pre] of Object.entries(M.slots)) { const k = l[slot]; if (k && k !== 'none' && parts[pre + '_' + k]) parts[pre + '_' + k].visible = true }
  const materials = { ...furMats(l), pad: { color: M.pad } }
  for (const [slot, [mat, key]] of Object.entries(CLOTH)) if (l[key]) materials[mat] = { color: l[key] }
  return { id: M.body[l.sex === 'f' ? 'f' : 'm'], materials: only(materials, M.bodyMats), parts }
}
export function headModel(l) { const sp = M.species[speciesOf(l)]; return { id: (l?.sex === 'f' ? sp.headF : sp.headM) || sp.head, materials: only({ ...furMats(l), pupil: { color: '#000000', roughness: 1, metalness: 0 }, iris: { color: l.eye && l.eye !== '#2b2233' ? l.eye : '#8a5a2e', roughness: 0.9 }, eyewhite: { color: '#fffaf2', roughness: 0.9 } }, sp.mats) } }
export function faceMorph(expr, blink) {
  const f = { ...(M.faces[expr] || M.faces.smile) }
  if (blink) f.Blink = 1
  return f
}
// a whole critter for a spawn (place sims): body, head child, gait clips on the library
export const MESH = M.mesh === true
export function critterSpec(l) {
  if (!MESH) return { primitive: { kind: 'scripted', script: 'scripts/critter2-geo.js', params: l }, material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.6, bounce: 0.6 } }
  return { model: bodyModel(l), children: [{ id: HEAD_ID, attachment: { skin: true }, model: headModel(l), morph: faceMorph(l.expr) }],
    material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.6, bounce: 0.6 } }
}
// a mesh critter's look read back off its own model (the bodies laid before state.wear existed): parts shown = garments, cloth_* = their colours, head GLB = species and sex
const CLOTH_KEY = { topw: 'top', botw: 'bottom', shoes: 'shoec', hat: 'hatc', neck: 'neckc' }
export function lookFromModel(model, headId) {
  if (!model || typeof model !== 'object') return null
  const l = { sex: model.id === M.body.f ? 'f' : 'm' }
  for (const [slot, pre] of Object.entries(M.slots)) { l[slot] = 'none'; for (const [n, v] of Object.entries(model.parts || {})) if (v?.visible && n.startsWith(pre + '_')) l[slot] = n.slice(pre.length + 1) }
  const mats = model.materials || {}
  for (const [slot, [mat]] of Object.entries(CLOTH)) if (mats[mat]?.color) l[CLOTH_KEY[slot]] = mats[mat].color
  if (mats.fur?.color) l.fur = mats.fur.color
  for (const [sp, row] of Object.entries(M.species)) if ([row.head, row.headM, row.headF].includes(headId)) { l.species = sp; break }
  return l
}
// dress a living or fallen critter body in a look, whichever body it wears (scripted primitive or Blender mesh)
export function rewear(ctx, obj, look) {
  if (!obj || !look) return
  if (obj.primitive?.params) { obj.primitive = { ...obj.primitive, params: { ...obj.primitive.params, ...look } }; return }
  if (obj.model) obj.model = bodyModel(look)
}
// a scripted critter swapped onto the Blender critter in place: body model, skinned head child, outline and jiggle; returns the look it wore
export function toMesh(ctx, obj) {
  if (!MESH || obj?.primitive?.script !== 'scripts/critter2-geo.js') return null
  const l = { ...obj.primitive.params }, spec = critterSpec(l)
  obj.primitive = null; obj.model = spec.model; obj.material = spec.material; obj.jiggle = spec.jiggle
  if (!ctx.getObject(obj.id + '/' + HEAD_ID)) ctx.spawn(HEAD_ID, { parent: obj.id, ...spec.children[0] })
  return l
}
