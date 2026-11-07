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
export function headModel(l) { const sp = M.species[speciesOf(l)]; return { id: sp.head, materials: only({ ...furMats(l), pupil: { color: '#000000', roughness: 1, metalness: 0 }, iris: { color: l.eye && l.eye !== '#2b2233' ? l.eye : '#8a5a2e', roughness: 0.9 }, eyewhite: { color: '#fffaf2', roughness: 0.9 } }, sp.mats) } }
export function faceMorph(expr, blink) {
  const f = { ...(M.faces[expr] || M.faces.smile) }
  if (blink) f.Blink = 1
  return f
}
// a whole critter for a spawn (place sims): body, head child, gait clips on the library
export function critterSpec(l) {
  return { model: bodyModel(l), children: [{ id: HEAD_ID, attachment: { skin: true }, model: headModel(l), morph: faceMorph(l.expr) }],
    material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.6, bounce: 0.6 } }
}
