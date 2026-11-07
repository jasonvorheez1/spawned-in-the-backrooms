// The Blender critter as a spec: the body GLB for the look's sex (garments shown by name, tinted by the look's hex)
// and the species head (head, face, ears, tail) as a skinned child riding the same rig. Data: scripts/lib/data/critter-models.yml.
import M from './data/critter-models.yml'
export const HEAD_ID = 'critter-head'
export const GAIT_LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb', sit: 'cdn/clip-sit-loop.glb' }
const CLOTH = { topw: ['cloth_top', 'top'], botw: ['cloth_bottom', 'bottom'], shoes: ['cloth_shoes', 'shoec'], hat: ['cloth_hat', 'hatc'], neck: ['cloth_neck', 'neckc'] }
export const speciesOf = (l) => M.species[l?.species] ? l.species : 'cat'
// a look's own fur re-tones its face: belly, tip and markings mix from that fur (cream-lit, shadow-dark) by a seed of the look, so two of one species never share a face
const hx = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => toHex(hx(a).map((v, i) => v + (hx(b)[i] - v) * t))
function seedOf(l) { let h = 2166136261; for (const c of `${l.fur}|${l.species}|${l.sex}|${l.top}|${l.bottom}|${l.eye}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 } }
const CREAMS = ['#fff4e2', '#f6efe6', '#fbe6cc', '#efe6dc', '#fff9f0', '#e9dccb']
const INKS = ['#1e1a1c', '#2c2220', '#3a2a22', '#24242c', '#40302a']
function furMats(l) {
  const sp = M.species[speciesOf(l)], fur = l.fur || sp.fur
  let belly = sp.belly, tip = sp.tip || sp.belly, mark = sp.mark
  if (l.fur && l.vary !== false) {
    const u = seedOf(l), cream = CREAMS[Math.floor(u() * CREAMS.length)], ink = INKS[Math.floor(u() * INKS.length)]
    belly = mix(fur, cream, 0.45 + u() * 0.45)
    tip = u() < 0.5 ? belly : mix(fur, ink, 0.35 + u() * 0.4)
    mark = mix(fur, u() < 0.3 ? cream : ink, 0.3 + u() * 0.45)
  }
  const innerCol = l.inner || sp.inner || mix(fur, '#ffb8c6', 0.65)
  const m = {
    fur: { color: fur, roughness: 0.82, metalness: 0 },
    limb: { color: l.limb || (l.fur ? (sp.limb && !l.fur ? sp.limb : fur) : sp.limb || fur), roughness: 0.82, metalness: 0 },
    belly: { color: l.belly || belly, roughness: 0.88, metalness: 0 },
    tip: { color: l.tip || tip, roughness: 0.82, metalness: 0 },
    inner: { color: innerCol, roughness: 0.9, metalness: 0 },
    nose: { color: l.nose || sp.nose || '#231816', roughness: 0.35, metalness: 0.05 }
  }
  if (mark || l.mark) m.mark = { color: l.mark || mark, roughness: 0.82, metalness: 0 }
  if (sp.antler || l.antler) m.antler = { color: l.antler || sp.antler, roughness: 0.65, metalness: 0.05 }
  return m
}
const only = (m, keys) => { const o = {}; for (const k of keys || []) if (m[k]) o[k] = m[k]; return o }
// a garment whose Blender piece doesn't sit on the big cute heads wears its nearest kin (the cap's brim lands on the snout); the look and its loot keep the real name
const MESH_SWAP = { hat: { cap: 'beanie' } }
export function bodyModel(l) {
  const parts = {}
  for (const p of M.parts) parts[p] = { visible: false }
  for (const [slot, pre] of Object.entries(M.slots)) { const k = MESH_SWAP[slot]?.[l[slot]] ?? l[slot]; if (k && k !== 'none' && parts[pre + '_' + k]) parts[pre + '_' + k].visible = true }
  const materials = { ...furMats(l), pad: { color: M.pad || '#ff9fb4', roughness: 0.6, metalness: 0 } }
  for (const [slot, [mat, key]] of Object.entries(CLOTH)) if (l[key]) materials[mat] = { color: l[key], roughness: 0.75, metalness: 0 }
  return { id: M.body[l.sex === 'f' ? 'f' : 'm'], materials: only(materials, M.bodyMats), parts }
}
export function headModel(l) {
  const sp = M.species[speciesOf(l)];
  const isFemale = l?.sex === 'f';
  const eyeCol = l?.eye && l.eye !== '#2b2233' && l.eye !== '#000000' ? l.eye : null;
  const blushCol = l?.blush || '#ff6285';
  return {
    id: (isFemale ? sp.headF : sp.headM) || sp.head,
    materials: only({
      ...furMats(l),
      eyewhite: { color: '#fffdfa', roughness: 0.4 },
      eyeink: { color: '#161214', roughness: 0.85 },
      pupil: {
        color: eyeCol || '#121014',
        roughness: 0.22,
        metalness: 0.05,
        ...(eyeCol && (l?.glowEye || l?.species === 'samantha') ? { emissive: eyeCol, emissiveIntensity: 0.4 } : {})
      },
      iris: { color: eyeCol || '#8a5a2e', roughness: 0.25 },
      blush: { color: blushCol, roughness: 0.85, emissive: '#ff4065', emissiveIntensity: isFemale ? 0.22 : 0.15 },
      mouth: { color: '#661625', roughness: 0.9 },
      tongue: { color: '#ff7b95', roughness: 0.6 }
    }, sp.mats)
  }
}
export function faceMorph(expr, blink, isFemale) {
  const f = { ...(M.faces[expr] || M.faces.smile) }
  if (isFemale && f.Blush == null) f.Blush = 0.28
  if (blink) f.Blink = 1
  return f
}
// a whole critter for a spawn (place sims): body, head child, gait clips on the library
export const MESH = M.mesh === true
export function critterSpec(l) {
  if (!MESH) return { primitive: { kind: 'scripted', script: 'scripts/critter2-geo.js', params: l }, material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.6, bounce: 0.6 } }
  return {
    model: bodyModel(l),
    morph: bustMorph(l) ?? undefined,
    children: [{
      id: HEAD_ID,
      attachment: { skin: true },
      model: headModel(l),
      morph: faceMorph(l.expr, false, l?.sex === 'f'),
      jiggle: { bones: ['EarL', 'EarR'], amount: 0.55, bounce: 0.7 }
    }],
    material: { outline: { color: '#1d1420', width: 2.4 } },
    jiggle: { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.65, bounce: 0.7 }
  }
}
// a mesh critter's look read back off its own model (the bodies laid before state.wear existed): parts shown = garments, cloth_* = their colours, head GLB = species and sex
const CLOTH_KEY = { topw: 'top', botw: 'bottom', shoes: 'shoec', hat: 'hatc', neck: 'neckc' }
export function lookFromModel(model, headId) {
  if (!model || typeof model !== 'object') return null
  const vis = (n) => model.parts?.[n]?.visible
  const l = { sex: model.id === M.body.f || vis('Bot_skirt') || vis('Bot_longskirt') || vis('Top_dress') ? 'f' : 'm' }
  for (const [slot, pre] of Object.entries(M.slots)) { l[slot] = 'none'; for (const [n, v] of Object.entries(model.parts || {})) if (v?.visible && n.startsWith(pre + '_')) l[slot] = n.slice(pre.length + 1) }
  const mats = { ...(model.parts || {}), ...(model.materials || {}) }
  for (const [slot, [mat]] of Object.entries(CLOTH)) if (mats[mat]?.color) l[CLOTH_KEY[slot]] = mats[mat].color
  if (mats.fur?.color) l.fur = mats.fur.color
  for (const [sp, row] of Object.entries(M.species)) if ([row.head, row.headM, row.headF].includes(headId)) { l.species = sp; break }
  return l
}
// dress a living or fallen critter body in a look, whichever body it wears (scripted primitive or Blender mesh)
export function rewear(ctx, obj, look) {
  if (!obj || !look) return
  if (obj.primitive?.params) { obj.primitive = { ...obj.primitive, params: { ...obj.primitive.params, ...look } }; return }
  if (obj.model) {
    obj.model = bodyModel(look)
    const bm = bustMorph(look)
    if (bm) obj.morph = { ...(obj.morph ?? {}), ...bm }
    seatHead(ctx, obj, look)
  }
}
// a scripted critter swapped onto the Blender critter in place: body model, skinned head child, outline and jiggle; returns the look it wore
export function toMesh(ctx, obj) {
  if (!MESH || obj?.primitive?.script !== 'scripts/critter2-geo.js') return null
  const l = { ...obj.primitive.params }, spec = critterSpec(l)
  obj.primitive = null; obj.model = spec.model; if (spec.morph) obj.morph = spec.morph; obj.material = spec.material; obj.jiggle = spec.jiggle
  seatHead(ctx, obj, l)
  return l
}
// the head rides the body's skin, at its origin: an old scripted head (hung on Hips) is re-seated, a missing one spawned
export function seatHead(ctx, obj, l) {
  const want = critterSpec(l).children[0]; let h = ctx.getObject(obj.id + '/' + HEAD_ID)
  // a head skinned to the body's old model loses its skin when the body swaps: re-spawn it on the new one
  const body = obj.model?.id ?? obj.model
  if (h && obj.state && obj.state.headBody !== body) { ctx.destroy(h.id ?? obj.id + '/' + HEAD_ID); h = null }
  if (obj.state && obj.state.headBody !== body) obj.state.headBody = body
  if (!h) { ctx.spawn(HEAD_ID, { parent: obj.id, ...want }); return }
  if (!h.attachment?.skin) {
    h.primitive = null; h.attachment = { skin: true }; h.feetPosition = { x: 0, y: 0, z: 0 }; h.rotation = 0;
    h.model = want.model; h.morph = want.morph; h.jiggle = want.jiggle
  } else {
    h.model = want.model
    if (want.morph) h.morph = want.morph
    if (want.jiggle && !h.jiggle) h.jiggle = want.jiggle
  }
}

// a body from an older Blender pass (not one of M.body) is out of date
export const staleBody = (model) => !!model && !Object.values(M.body).includes(model.id ?? model)
const SPECIES = Object.keys(M.species)
const hashOf = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
export const speciesFor = (id) => SPECIES[hashOf(id + ':sp') % SPECIES.length]
// each body its own height and build, stable by id: h 0.86..1.14, w 0.88..1.16 (Savi's picks)
export function buildFor(id, sex) {
  const a = (hashOf(id + ':h') % 1000) / 1000, b = (hashOf(id + ':w') % 1000) / 1000
  const h = +(0.86 + a * 0.28 - (sex === 'f' ? 0.03 : 0)).toFixed(3), w = +(0.88 + b * 0.28).toFixed(3)
  const c = (hashOf(id + ':b') % 1000) / 1000, d = (hashOf(id + ':hd') % 1000) / 1000, e = (hashOf(id + ':tl') % 1000) / 1000
  // Savi's picks: bust spans flat to full (-0.5..1.0, a curve so both ends show up); head 0.92..1.1, narrow on purpose; tail curl 0.7..1.3
  const bust = +(-0.5 + Math.pow(c, 0.85) * 1.5).toFixed(2), head = +(0.92 + d * 0.18).toFixed(3), curl = +(0.7 + e * 0.6).toFixed(2)
  return sex === 'f' ? { v: 2, h, w, bust, head, curl } : { v: 2, h, w, head, curl } // stable per npc
}
// the resting pose every npc keeps under its other bone writes: its head size and an S-curve in the tail (up off the hips, tip curling back)
export function baseBones(b) {
  const k = b?.curl ?? 1, hs = b?.head ?? 1
  return { Head: { scale: hs }, Tail: { rotate: [-28 * k, 0, 0] }, Tail1: { rotate: [34 * k, 0, 0] } }
}
// the body's Bust morph from a creator slider (bustS 0.6..1.3, 1 = as built)
export function bustMorph(l) { return _bust(l) }
const _bust = (l) => l?.sex === 'f' ? { Bust: Math.max(-0.6, Math.min(0.9, ((Number(l.bustS) || 1) - 1) * 3)) } : null
