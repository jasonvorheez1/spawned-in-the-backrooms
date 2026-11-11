// The Blender critter as a spec: the body GLB for the look's sex (garments shown by name, tinted by the look's hex)
// and the species head (head, face, ears, tail) as a skinned child riding the same rig. Data: scripts/lib/data/critter-models.yml.
import M from './data/critter-models.yml'
import FACES from './data/faces.yml'
import CL from './data/clothes.yml'
import { rowOf, patOk, CLOTHES_OFF } from './clothes.js'
import HAIR from './data/hair.yml'
import WARDROBE from './data/wardrobe.yml'
import SPLIT from './data/wardrobe-split.yml'
import HAIR_SLOTS from './data/hair-slots.yml'
import HAIR_TEX from './data/hair-tex.yml'
import WARD_SLOTS from './data/ward-slots.yml'
import CW from './data/cat-wardrobe.yml'
import { CAT_BODY, catModel, catChildren, chestOf, catMorph, SNOUTS, EARS, TAILS, EYE_COLORS } from './cat-wardrobe.js'
// hair: its own GLB skinned whole to the Head bone (scripts/lib/data/hair.yml), tinted by the look's hairc; a mask hides it
export const HAIR_ID = 'critter-hair'
export const humanHairOf = (l) => {
  if (l?.hair == null || l.hair === '' || l.hair === 'none' || maskOf(l)) return null
  if (speciesOf(l) === 'faceling') return null
  const n = typeof l.hair === 'number' ? l.hair : (HAIR.humanPick?.[l.hair] ?? (Number.isFinite(Number(l.hair)) ? Number(l.hair) : null))
  const hat = Boolean(l.hat && l.hat !== 'none')
  const set = HAIR.human?.[l.sex === 'f' ? 'f' : 'm']
  const row = n == null ? null : (set?.[n] ?? HAIR.human?.[l.sex === 'f' ? 'm' : 'f']?.[n])
  return row ? (hat ? row.hat : row.free) : null
}
export const hairOf = (l) => {
  if (l?.hair == null || l.hair === '' || l.hair === 'none' || maskOf(l)) return null
  const sp = speciesOf(l)
  if (sp === 'faceling') return null
  if (sp === 'human' || HUMAN) return humanHairOf(l)
  return (l.hat && l.hat !== 'none' && HAIR.hatted?.[l.hair]) || HAIR.styles[l.hair] || null
}
const rootOf = (c) => { const m = String(c).match(/^#?([0-9a-f]{6})$/i); if (!m) return c; const n = parseInt(m[1], 16); return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * 0.8).toString(16).padStart(2, '0')).join('') }
// the drawn look (scripts/mat-anime.js; Shelly Nov 9: "anime styled characters"): a soft-lit face that never goes muddy or black, cel hair with a shine band, cel cloth
export const anime = (kind, color, extra) => ({ kind: 'scripted', script: 'scripts/mat-anime.js', color, params: { kind }, ...(extra || {}) })
const hairMatsAll = (c) => ({
  hair: anime('hair', c),
  scalp: { color: rootOf(c), roughness: 0.9, metalness: 0 }, // the scalp and cap read as hair in shadow at the roots, never a flat bright shell through the strands (Shelly: "this is ugly fix hairs")
  scalp_cap: { color: rootOf(c), roughness: 0.9, metalness: 0 },
  hairtie: { color: '#e85d75', roughness: 0.45, metalness: 0.05 }
})
const hairMats = (c, id) => { const all = hairMatsAll(c), tex = id && HAIR_TEX?.[id]; if (tex) all.hair = anime('hair', c, { params: { kind: 'hair', tex }, alphaTest: 0.35, side: 'double' }); const have = id && HAIR_SLOTS?.[id]; return have ? Object.fromEntries(have.filter((k) => all[k]).map((k) => [k, all[k]])) : all } // a file's own slots only
const hairModel = (l) => {
  const want = hairOf(l)
  return want ? { id: want, materials: hairMats(l?.hairc || '#5a3a26', want) } : null
}
export const hairChild = (l, local) => {
  const want = hairOf(l)
  return want ? { id: HAIR_ID, attachment: { skin: true }, model: hairModel(l), ...(local ? { audience: 'local' } : {}) } : null
}
export function seatHumanHair(ctx, o, l) {
  if (speciesOf(l) === 'faceling') { const id = o.id + '/' + HAIR_ID; if (ctx.getObject(id)) ctx.destroy(id); return }
  if (l && (l.hair == null || l.hair === '')) { const ks = Object.keys(HAIR.humanPick ?? {}).filter((k) => k[0] === (l.sex === 'f' ? 'f' : 'm')); let h = 7; for (const c of String(o.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; const cs = ['#2a1d16', '#4a3122', '#6b4a2e', '#1a1a1a', '#8a6a3c', '#b08a52']; l = { ...l, hair: ks[h % ks.length], hairc: l.hairc || cs[(h >>> 4) % cs.length] } }
  const want = humanHairOf(l), id = o.id + '/' + HAIR_ID, h = ctx.getObject(id)
  if (!want) { if (h) ctx.destroy(id); return }
  const c = l.hairc || '#5a3a26', m = { id: want, materials: hairMats(c, want) }
  if (h) { if ((h.model?.id ?? h.model) !== want || h.model?.materials?.hair?.color !== c || h.model?.materials?.hair?.params?.tex !== m.materials.hair?.params?.tex || JSON.stringify(Object.keys(h.model?.materials ?? {})) !== JSON.stringify(Object.keys(m.materials))) h.model = m; return }
  ctx.spawn(HAIR_ID, { parent: o.id, id: HAIR_ID, attachment: { skin: true }, model: m, ...(o.audience === 'local' ? { audience: 'local' } : {}) })
}
export function seatHair(ctx, o, l) {
  if (speciesOf(l) === 'faceling') { const id = o.id + '/' + HAIR_ID; if (ctx.getObject(id)) ctx.destroy(id); return }
  if (speciesOf(l) === 'human' || HUMAN) return seatHumanHair(ctx, o, l)
  const want = hairOf(l), id = o.id + '/' + HAIR_ID, h = ctx.getObject(id)
  if (!want) { if (h) ctx.destroy(id); return }
  const m = hairModel(l)
  if (h) { if ((h.model?.id ?? h.model) !== want || h.model?.materials?.hair?.color !== m.materials.hair.color || h.model?.materials?.hair?.params?.tex !== m.materials.hair?.params?.tex) h.model = m; return }
  ctx.spawn(HAIR_ID, { parent: o.id, ...hairChild(l, o.audience === 'local') })
}
export const BEARD_ID = 'critter-beard'
export const beardChild = (l, local) => {
  if (HUMAN) return null // fitted human facial hair lives on the body's skinned face
  if (!l?.beard || l.beard === 'none' || maskOf(l)) return null
  const col = l.beardc || l.hairc || '#5a3a26'
  const isH = speciesOf(l) === 'human' || HUMAN
  return {
    id: BEARD_ID,
    attachment: { bone: 'Head' },
    primitive: {
      kind: 'scripted',
      script: 'scripts/critter-beard-geo.js',
      params: { beard: l.beard, col, isHuman: Boolean(isH), sex: l.sex }
    },
    material: { roughness: 0.65, metalness: 0.02 },
    ...(local ? { audience: 'local' } : {})
  }
}
export function seatBeard(ctx, o, l) {
  const id = o.id + '/' + BEARD_ID, b = ctx.getObject(id)
  if (!l?.beard || l.beard === 'none' || maskOf(l)) {
    if (b) ctx.destroy(id)
    return
  }
  const child = beardChild(l, o.audience === 'local')
  if (!child) {
    if (b) ctx.destroy(id)
    return
  }
  if (b) {
    b.primitive = child.primitive
    b.material = child.material
    return
  }
  ctx.spawn(BEARD_ID, { parent: o.id, ...child })
}
// split wardrobe: each worn garment is its own skinned child of the bare body, so a body loads only what it wears
const WARD_PRE = 'critter-ward-', wardKey = (n) => WARD_PRE + n.slice(5).toLowerCase()
const splitOf = (l) => { const r = SPLIT?.[l?.sex === 'f' ? 'f' : 'm']; return r?.parts && Object.keys(r.parts).length ? r : null }
export function wardChildren(l, local) {
  const r = splitOf(l); if (!r) return []
  const b = humanBodyFull(l), morph = humanMorph(l), out = []
  const clothMats = Object.fromEntries(Object.entries(b.materials || {}).filter(([k]) => k.startsWith('cloth_'))) // a garment file carries only its cloth_ slots: skin and fur keys there matched nothing
  const booted = rowOf('shoes', l?.shoes, l?.shoec)?.kind === 'boots' // trousers worn with boots take their tucked cut (art/human-cloth/jeans_tuck.py): the straight leg's hem poked out through the shaft
  for (const [n, v] of Object.entries(b.parts)) if (n.startsWith('Ward_') && v.visible && r.parts[n]) { const f = (booted && r.parts[n + '_tuck']) || r.parts[n]; out.push({ id: wardKey(n), attachment: { skin: true }, model: { id: f, forward: '+z', materials: WARD_SLOTS?.[f] ? Object.fromEntries(Object.entries(clothMats).filter(([k]) => WARD_SLOTS[f].includes(k))) : clothMats }, morph, ...(local ? { audience: 'local' } : {}) }) }
  if (OPEN_IDS.includes(l?.topw) && r.parts.Ward_tee) out.push({ id: wardKey('Ward_tee'), attachment: { skin: true }, model: { id: r.parts.Ward_tee, forward: '+z', materials: { cloth_top: anime('cloth', INNER_TEE) } }, morph, ...(local ? { audience: 'local' } : {}) }) // an apron covers the front only: a whole tee under it, the inner strip poked through and left the back bare
  else if (r.inner && OPEN_TOPS.includes(rowOf('topw', l?.topw, l?.top)?.kind)) out.push({ id: INNER_ID, attachment: { skin: true }, model: { id: r.inner, forward: '+z', materials: { cloth_top: anime('cloth', innerTee(l)) } }, morph, ...(local ? { audience: 'local' } : {}) }) // an open-front top wears a plain tee under it: the bare strip of chest down its front read as no shirt at all
  return out
}
export function seatWardrobe(ctx, o, l) {
  const want = new Map(wardChildren(l, o.audience === 'local').map((c) => [c.id, c]))
  for (const k of [...WARDROBE.parts.map(wardKey), INNER_ID]) if (!want.has(k) && ctx.getObject(o.id + '/' + k)) { try { ctx.destroy(o.id + '/' + k) } catch (e) { return } } // a body drawn from another room (a solo save's NPC) isn't ours to undress: leave it whole
  for (const [k, c] of want) {
    const h = ctx.getObject(o.id + '/' + k)
    if (!h) { ctx.spawn(k, { parent: o.id, ...c }); continue }
    if (h.visible === false) h.visible = true // a garment hidden by hand (a fit test) shows again on the next dress
    if (!h.attachment?.skin) h.attachment = c.attachment // a garment that was hung on a bone once (a hat on the chest) goes back on the skin
    if ((h.model?.id ?? h.model) !== c.model.id || JSON.stringify(h.model?.materials ?? null) !== JSON.stringify(c.model.materials)) h.model = c.model // a refit file swaps in on bodies already wearing the old one
    if (JSON.stringify(h.morph ?? null) !== JSON.stringify(c.morph)) h.morph = c.morph
  }
}
export const HEAD_ID = 'critter-head'
// a head-covering mask (the Level 11 shop's bag and shell): its own GLB skinned whole to the Head bone, a second skin child; the row's `mask` names it
export const MASK_ID = 'critter-mask'
export const maskOf = (l) => (l?.hat && l.hat !== 'none' ? rowOf('hat', l.hat, l.hatc)?.mask : null) ?? null
export const maskChild = (l, local) => { const m = maskOf(l); return m ? { id: MASK_ID, attachment: { skin: true }, model: m, ...(local ? { audience: 'local' } : {}) } : null }
export function seatMask(ctx, o, l) {
  const want = maskOf(l), id = o.id + '/' + MASK_ID, m = ctx.getObject(id)
  const h = ctx.getObject(o.id + '/' + HEAD_ID); if (h && h.visible !== !want) h.visible = !want // the mask covers the head whole: snout and ears stay inside it
  if (!want) { if (m) ctx.destroy(id); return }
  if (m) { if ((m.model?.id ?? m.model) !== want) m.model = want; return }
  ctx.spawn(MASK_ID, { parent: o.id, ...maskChild(l, o.audience === 'local') })
}
export const GAIT_LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb', sit: 'cdn/clip-sit-loop.glb' }
const CLOTH = { topw: ['cloth_top', 'top'], botw: ['cloth_bottom', 'bottom'], shoes: ['cloth_shoes', 'shoec'], hat: ['cloth_hat', 'hatc'], neck: ['cloth_neck', 'neckc'] }
export const speciesOf = (l) => M.species[l?.species] ? l.species : 'cat'
// a look's own fur re-tones its face: belly, tip and markings mix from that fur (cream-lit, shadow-dark) by a seed of the look, so two of one species never share a face
const hx = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
// an iris colour multiplies a grey iris picture: a near-black pick crushed it to a solid black blob, so its brightest channel is lifted to ~150 (Shelly: work on the eyes, Nov 10)
// the face atlas with the red-brown eye outline and peach lids painted out to skin (Shelly, Nov 10: "take off the red thing around her eyes"); both bodies share this atlas
const FACE_ATLAS = '/cdn/value.d0f2b91534867ac2c19c9523fe4215f3e82eeac98c94082ea581ea823a6f5382.png'
// blush: a faint see-through flush in a muted rose, never a painted patch (Shelly, Nov 10: "revamp the blush")
const BLUSH_MAT = (c) => ({ color: c || '#e8a0a8', roughness: 0.9, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false })
const BLUSH_FADE = '/cdn/value.5afbe06b40f139a781584f542ea159b89a6d780adf3379ae3862c857acb397de.png' // radial fade: the soft cheek patches (own slot BlushSoft, art/human-body/blush_soft.py) melt into the skin instead of a hard bar (Nov 10, Rhea)
const BLUSH_SOFT_MAT = (c) => ({ color: c || '#e8a0a8', map: BLUSH_FADE, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.45, depthWrite: false })
const liftEye = (c) => { const v = hx(c), mx = Math.max(...v, 8); return mx >= 150 ? c : toHex(v.map((x) => Math.max(x, 30) * 150 / mx)) }
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => toHex(hx(a).map((v, i) => v + (hx(b)[i] - v) * t))
function seedOf(l) { let h = 2166136261; for (const c of `${l.fur}|${l.species}|${l.sex}|${l.top}|${l.bottom}|${l.eye}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 } }
const CREAMS = ['#fff4e2', '#f6efe6', '#fbe6cc', '#efe6dc', '#fff9f0', '#e9dccb']
const INKS = ['#1e1a1c', '#2c2220', '#3a2a22', '#24242c', '#40302a']
// Species with mandatory biological markings preserve their iconic colors (stripes, bandit masks, panda eyes/limbs, rudolph nose)
const ICONIC = {
  panda: { mark: '#2b2530', tip: '#2b2530', limb: '#2b2530', belly: '#ffffff' },
  skunk: { mark: '#f4f1ea', tip: '#f4f1ea', belly: '#f4f1ea' },
  badger: { mark: '#f1ece4', tip: '#e8e4dc', belly: '#2e2c36', nose: '#16141c', limb: '#2a2830' },
  tiger: { mark: '#2a1c18', belly: '#fff6ea' },
  leopard: { mark: '#2a1c18', belly: '#fff1d4' },
  raccoon: { mark: '#2c2a32', belly: '#e9e6ea', tip: '#2a2830', limb: '#3a3640' },
  redpanda: { belly: '#f4ece2', tip: '#7a2e16', mark: '#2b1a14', limb: '#2b1a14' },
  sheep: { mark: '#5d5560', belly: '#ffffff' },
  deer: { antler: '#e9d8b4', mark: '#4a2a1c' },
  reindeer: { nose: '#e0404c', antler: '#efe0bd', mark: '#4a2e20' },
  pig: { nose: '#ff8ca2' },
  koala: { nose: '#2a2830' },
  human: { fur: '#f0d5be', belly: '#fff0e4', nose: '#e8a898', inner: '#f4c2b0', mark: '#2e201c' },
  faceling: { fur: '#ebd4c2', belly: '#fff0e4', nose: '#e8a898', inner: '#f4c2b0', mark: '#3c2a22' }
}
function furMats(l) {
  const spName = speciesOf(l), sp = M.species[spName], fur = l.fur || sp.fur
  const icon = ICONIC[spName] || {}
  let belly = l.belly || icon.belly || sp.belly
  let tip = l.tip || icon.tip || sp.tip || sp.belly
  let mark = l.mark || icon.mark || sp.mark
  if (l.fur && l.vary !== false) {
    const u = seedOf(l), cream = CREAMS[Math.floor(u() * CREAMS.length)], ink = INKS[Math.floor(u() * INKS.length)]
    if (!icon.belly && !l.belly) belly = mix(fur, cream, 0.45 + u() * 0.45)
    if (!icon.tip && !l.tip) tip = u() < 0.5 ? belly : mix(fur, ink, 0.35 + u() * 0.4)
    if (!icon.mark && !l.mark) mark = mix(fur, u() < 0.3 ? cream : ink, 0.3 + u() * 0.45)
  }
  const innerCol = l.inner || sp.inner || mix(fur, '#ffb8c6', 0.65)
  const limbCol = l.limb || icon.limb || sp.limb || fur
  const noseCol = l.nose || icon.nose || sp.nose || '#231816'
  const antlerCol = l.antler || icon.antler || sp.antler
  const m = {
    fur: { color: fur, roughness: 0.82, metalness: 0 },
    limb: { color: limbCol, roughness: 0.82, metalness: 0 },
    belly: { color: belly, roughness: 0.88, metalness: 0 },
    tip: { color: tip, roughness: 0.82, metalness: 0 },
    inner: { color: innerCol, roughness: 0.9, metalness: 0 },
    nose: { color: noseCol, roughness: 0.35, metalness: 0.05 }
  }
  if (spName === 'faceling' || (spName === 'human' && (l.marks === 'none' || (l.hair && l.hair !== 'none')))) {
    m.mark = { color: fur, visible: false, transparent: true, opacity: 0, depthWrite: false }
  } else if (l.marks === 'none') {
    mark = fur
    m.mark = { color: mark, roughness: 0.82, metalness: 0 }
  } else if (mark || spName === 'human') {
    m.mark = { color: (spName === 'human' ? (l.hairc || mark || '#2e201c') : mark), roughness: 0.82, metalness: 0 }
  }
  if (antlerCol) m.antler = { color: antlerCol, roughness: 0.65, metalness: 0.05 }
  const wearsBeard = Boolean(l?.beard && l.beard !== 'none')
  const beardCol = l?.beardc || l?.hairc || '#5a3a26'
  if (wearsBeard) {
    m.beard = { color: beardCol, roughness: 0.65, metalness: 0.02 }
  } else {
    m.beard = { color: beardCol, visible: false, transparent: true, opacity: 0, depthWrite: false }
  }
  return m
}
const only = (m, keys) => { const o = {}; for (const k of keys || []) if (m[k]) o[k] = m[k]; return o }
// a garment whose Blender piece doesn't sit on the big cute heads wears its nearest kin (the cap's brim lands on the snout); the look and its loot keep the real name
const MESH_SWAP = {
  topw: {
    vest: 'jacket',
    blazer: 'jacket',
    megjacket: 'jacket',
    blouse: 'longsleeve',
    coat: 'jacket',
    shirt: 'longsleeve',
    officeshirt: 'longsleeve',
    wirehood: 'hoodie',
    padjacket: 'jacket',
  },
  botw: {
    cargo: 'pants',
    slacks: 'pants',
    jeans: 'pants',
    canvasskirt: 'longskirt',
  },
  shoes: {
    flats: 'slippers',
    heels: 'boots',
    steeltoe: 'boots',
  },
  hat: {
    cap: 'beanie',
    beret: 'beanie',
    padbeanie: 'beanie',
  },
  neck: {
    carpetponcho: 'cape',
  }
}
export let HUMAN = null // live: the menu's BODIES setting flips it (setStyle)
export function setStyle(v) { const h = v === 'human' ? (M.human ?? null) : null; if (h !== HUMAN) HUMAN = h; return v === 'human' ? 'human' : 'furry' } // Shelly Nov 11: critters are the default again, humans only by pick
const SKIN = ['#fde7d9', '#f3d2b3', '#e8c39c', '#d1a27b', '#c48d63', '#b07a52', '#9a6744', '#835538', '#6c442c', '#573522'] // her picks: pale to deep
export const skinOf = (l) => l?.skin || SKIN[[...String(l?.fur || l?.species || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % SKIN.length]
// human bodies (art/human-base/build.py): the same parts and cloth_* slots as the furry bodies, skin tinted per look, eyes/brows tinted, face keys rolled per NPC
const warm = (c, k) => toHex(hx(c).map((v, i) => v * k * [1, 0.42, 0.3][i]))
const OPEN_TOPS = ['jacket', 'blazer', 'vest'], OPEN_IDS = ['apron', 'maidapron'] // OPEN_IDS: aprons are front panels only; with nothing under them the whole back read bare (Nov 11) // kinds whose front is open; the inner tee (wardChildren) is drawn under them
const INNER_ID = 'critter-ward-inner'
const INNER_TEE = '#e6e1d6'
const DARK_UNDER = { megjacket: '#24262a', padjacket: '#26262a' } // uniform jackets close at the front: a pale tee showing through the seam read as a white stripe (Nov 11)
const innerTee = (l) => DARK_UNDER[l?.topw] ?? (/^#[0-9a-f]{6}$/i.test(l?.top || '') ? mix(l.top, '#101014', 0.55) : '#2a2a2e') // the jackets close nearly shut: a pale tee in the seam read as a jagged white stripe; a darker shade of the jacket reads as its lining (Nov 11)
const humanBodyFull = (l) => {
  const c = skinOf(l), skin = anime('skin', c) // the first-person arms wear this same material (player.js spreads it), so the body and the arms still read as one skin (Shelly, Nov 9)
  const m = l ? bodyModel({ ...l, _human: true }) : { materials: {}, parts: {} }
  const parts = { ...(m.parts || {}), Under_top: { visible: l?.sex === 'f' && m.parts?.Skin_torso?.visible !== false && !rowOf('topw', l?.topw, l?.top) } /* skin stays under a tank now; the bra must not (it poked through as a black patch, Nov 10) */, Under_bottom: { visible: m.parts?.Skin_hips?.visible !== false } }
  parts.Skin_torso_upper_front = { visible: !['hoodie', 'sweater'].includes(rowOf('topw', l?.topw, l?.top)?.kind) && !(l?.sex === 'm' && rowOf('topw', l?.topw, l?.top)?.kind === 'longsleeve') } // scoop collars still expose chest skin; a closed neck hides it (it poked through Dawn's hoodie as spikes, Nov 11)
  if (rowOf('botw', l?.botw, l?.bottom)) parts.Skin_hips = { visible: true } // keep the pelvis behind low waistbands; masking the whole region left an open body cut
  for (const name of ['stubble', 'mustache', 'goatee', 'handlebars', 'fullbeard', 'chinstrap', 'anchor']) parts['Beard_' + name] = { visible: !maskOf(l) && (l?.beard === 'moustache' ? 'mustache' : l?.beard) === name }
  const blush = l?.blush && l.blush !== 'none' && l.blush !== 'false' ? (['heart', 'star', 'hash'].includes(l.blush) ? l.blush : 'soft') : null
  for (const name of ['soft', 'heart', 'star', 'hash']) parts['Blush_' + name] = { visible: !maskOf(l) && blush === name }
  // a closed top hides the overalls' bib, and the bib's straps poked through it: under one, the overalls are just their legs (Dolores, Nov 9)
  if (parts.Ward_overalls?.visible && ['jacket', 'sweater', 'hoodie', 'longsleeve', 'pajamas'].includes(rowOf('topw', l?.topw, l?.top)?.kind)) { parts.Ward_overalls = { visible: false }; parts.Ward_pants = { visible: true } }
  const hairc = l?.hairc || '#3a2a20', eye = liftEye(l?.eye && l.eye !== '#000000' ? l.eye : '#5b4a3a')
  // clothes take the cel step too, so a person is one drawing and not a drawn head on a clay body; a slot that is already more than a plain colour keeps itself
  const cloth = {}
  for (const [k, v] of Object.entries(m.materials || {})) cloth[k] = v && typeof v === 'object' && !v.kind && typeof v.color === 'string' && !v.map && !v.texture && !v.transparent && !(v.metalness > 0.3) && !(v.emissiveIntensity > 0) ? anime('cloth', v.color) : v
  return { id: (HUMAN ?? M.human)[l?.sex === 'f' ? 'f' : 'm'], forward: '+z', parts, materials: { ...cloth,
    Body_Skin: skin, Head_Skin: skin, under: { color: '#2b2a30', roughness: 0.85, metalness: 0 },
    Iris: { color: eye, map: '/cdn/value.d2cf169d248898314e631eb26d71f42378a79c8a51a0b6097d73f09862c7c0ea.png', roughness: 0.4, metalness: 0 }, Eye: { color: '#ffffff', map: FACE_ATLAS, roughness: 0.5, metalness: 0 }, Brow: { color: hairc, map: FACE_ATLAS, roughness: 0.9, metalness: 0 }, Lash: { color: '#2a2024', map: FACE_ATLAS, roughness: 0.9, metalness: 0 }, Beard: { color: l?.beardc || hairc, roughness: 0.86, metalness: 0 }, Blush: BLUSH_MAT(typeof l?.blush === 'string' && l.blush.startsWith('#') ? l.blush : null), BlushSoft: BLUSH_SOFT_MAT(typeof l?.blush === 'string' && l.blush.startsWith('#') ? l.blush : null) } }
}
// what the body file itself holds: garments ride as their own skinned children (wardrobe-split), and furry slots (fur, mark…) are not on the human file
const HB_MATS = new Set(['Body_Skin', 'cloth_bottom', 'metal', 'lens', 'cloth_hat', 'gold', 'Head_Skin', 'Eye', 'Iris', 'Lash', 'Brow', 'Mouth', 'Teeth', 'cloth_neck', 'cloth_shoes', 'cloth_top', 'button', 'strap', 'under', 'Beard', 'Blush', 'BlushSoft'])
export const humanBody = (l) => {
  const b = humanBodyFull(l)
  return { ...b, parts: Object.fromEntries(Object.entries(b.parts || {}).filter(([k]) => !k.startsWith('Ward_'))), materials: Object.fromEntries(Object.entries(b.materials || {}).filter(([k]) => HB_MATS.has(k))) }
}
// FACE SHAPE → the human head: [lead head type, keys set outright]
const FT_HEAD = {
  round: ['HT_Round'], soft: ['HT_Round', { JawNarrow: 0.4, JawWide: 0 }], chubby: ['HT_Round', { CheekFull: 0.9 }], button: ['HT_Heart', { NoseBig: 0, ChinLong: 0 }],
  oval: ['HT_Long', { FaceLong: 0.2 }], heart: ['HT_Heart'], delicate: ['HT_Heart', { JawNarrow: 0.8, JawWide: 0, BrowHeavy: 0 }], broad: ['HT_Broad'],
  chiseled: ['HT_Angular', { CheekFull: 0, ChinLong: 0.6 }], plump: ['HT_Round', { CheekFull: 0.7 }], pixie: ['HT_Heart', { ChinLong: 0.5, JawNarrow: 0.7, JawWide: 0 }], noble: ['HT_Long', { NoseBig: 0.6, ChinLong: 0.5 }],
  square: ['HT_Square'], strong: ['HT_Square', { BrowHeavy: 0.8 }], sharp: ['HT_Angular', { JawNarrow: 0.6, JawWide: 0 }], long: ['HT_Long', { FaceLong: 0.6 }], narrow: ['HT_Long', { JawNarrow: 0.9, JawWide: 0 }],
  burly: ['HT_Square', { JawWide: 0.85, BrowHeavy: 0.80, ChinLong: 0.35 }],
  rugged: ['HT_Angular', { JawWide: 0.70, BrowHeavy: 0.85, CheekFull: 0 }],
  diamond: ['HT_Angular', { JawNarrow: 0.45, CheekFull: 0.35 }],
}
const H_KEYS = ['JawWide', 'JawNarrow', 'ChinLong', 'NoseBig', 'CheekFull', 'BrowHeavy', 'FaceLong', 'HeadRound']
export function humanMorph(l) {
  let h = [...String(l?.fseed ?? l?.id ?? l?.name ?? ((l?.skin || '') + (l?.eye || '') + (l?.hair || '') + (l?.hairc || '')))].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 2166136261)
  const u = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296 }
  const m = l?.sex !== 'f', o = {}
  for (const k of H_KEYS) o[k] = Math.round(u() * 45) / 100
  if (o.JawWide > o.JawNarrow) o.JawNarrow = 0; else o.JawWide = 0
  if (m) { o.JawWide = Math.max(o.JawWide, 0.18 + u() * 0.22); o.JawNarrow = 0; o.BrowHeavy = 0.15 + o.BrowHeavy * 0.4 } else { o.BrowHeavy *= 0.3; o.JawWide *= 0.35 }
  // the head type: a whole skull and face shape, one per person, a second softly mixed in so no two match
  const T = m ? ['HT_Square', 'HT_Square', 'HT_Angular', 'HT_Angular', 'HT_Broad', 'HT_Long', 'HT_Round', 'HT_Heart'] : ['HT_Heart', 'HT_Heart', 'HT_Round', 'HT_Round', 'HT_Long', 'HT_Angular', 'HT_Square', 'HT_Broad']
  for (const k of new Set(T)) o[k] = 0
  const FT = FT_HEAD[l?.ftype] // the creator's FACE SHAPE pick leads the skull; the seed still mixes a second in (johnadams2 Nov 9: face gen)
  const a0 = T[Math.floor(u() * T.length)], b = T[Math.floor(u() * T.length)], a = FT?.[0] ?? a0
  o[a] = Math.round((0.3 + u() * 0.2) * 100) / 100; if (b !== a) o[b] = Math.round(u() * 0.15 * 100) / 100
  if (FT?.[1]) for (const [k, v] of Object.entries(FT[1])) o[k] = v
  if (m) o.Bust = 0 // a men's garment file can ship its Bust key at weight 1 (the male vest did): a man's chest stays flat
  if (m) { o.M_Jaw = Math.round((0.28 + u() * 0.25) * 100) / 100; o.M_Chin = Math.round((0.22 + u() * 0.25) * 100) / 100 } // men's own jaw and chin keys (art/human-face/male-jaw.py): a squarer jaw angle and a broad chin, never the female V
  if (o.HT_Long > 0.4) o.FaceLong *= 0.4; if (o.HT_Round > 0.4) o.HeadRound *= 0.4 // no doubled stretch
  o.HeadRound = Math.round(o.HeadRound * 0.4 * 100) / 100; o.CheekFull = Math.round(o.CheekFull * 0.45 * 100) / 100; if (o.HT_Broad) o.HT_Broad = Math.round(o.HT_Broad * 0.45 * 100) / 100; if (o.HT_Round) o.HT_Round = Math.round(o.HT_Round * 0.6 * 100) / 100; if (o.HT_Burly) o.HT_Burly = Math.round(o.HT_Burly * 0.75 * 100) / 100; if (o.HT_Rugged) o.HT_Rugged = Math.round(o.HT_Rugged * 0.75 * 100) / 100; if (o.JawWide) o.JawWide = Math.min(o.JawWide, m ? 0.6 : 0.2) // human proportions: no wide, round critter skulls
  if (!m) { // the female human Body carries a Bust key: the slider leads, else a per-person roll (rule: breast size more random)
    const b = l?.bust != null || l?.bustS != null ? _bust(l).Bust : 0.15 + u() * 0.85
    o.Bust = Math.round(b * 100) / 100
  }
  return o
}
// Male bodies have no Bust key; male garments still need humanMorph's explicit zero.
export function humanBodyMorph(l) {
  const morph=humanMorph(l)
  if(l?.sex!=='f')delete morph.Bust
  return morph
}
export function bodyModel(l) {
  if (HUMAN && !l?._human) return humanBody(l)
  if (isNewCat(l)) return catModel(catSex(l), catLook(l))
  const parts = {}
  for (const p of M.parts) parts[p] = { visible: false }
  for (const p of WARDROBE.parts) parts[p] = { visible: false }
  parts.Body = { visible: false }
  const topRow = rowOf('topw', l.topw, l.top), bottomRow = rowOf('botw', l.botw, l.bottom), shoeRow = rowOf('shoes', l.shoes, l.shoec)
  const covered = Boolean(topRow) && topRow.kind !== 'apron', sleeves = topRow && !['tank', 'dress', 'apron', 'vest'].includes(topRow.kind), longSleeves = sleeves && topRow.kind !== 'tee'
  const trousers = bottomRow && ['pants', 'pjpants', 'overalls', 'jeans'].includes(bottomRow.kind), bottom = Boolean(bottomRow) || topRow?.kind === 'dress'
  const openFront = ['jacket', 'blazer', 'vest'].includes(topRow?.kind) || topRow?.id === 'hotelrobe'
  const longSkirt = bottomRow?.kind === 'longskirt' || topRow?.id === 'gown'
  const grown = topRow?.id === 'tee' // the Nov 10 tee is grown off the skin (tee_shell.py) like the tank: the torso and upper arms stay drawn under it, hidden they left a hole under the sleeve and the forearm's saw edge at the elbow
  const tank = ['tank', 'vest'].includes(topRow?.kind) || grown // a vest is armless too: its armholes showed the hollow torso (Kael, Nov 10) // a tank is grown off the skin (tank_shell.py), so the whole torso stays under it: hidden, the waist above the shorts showed a hole with the hips' saw edge (Nov 10)
  const scoop = topRow?.kind === 'longsleeve' // a shirt's open neck shows the chest under it: hidden, the gap between the neck's saw edge and the shirt read as white points (Nov 11)
  const banded = scoop && l?.sex === 'm' // Nov 11: the men's long sleeve carries a crew collar band up the neck (art/human-cloth/collar_band.py): the collar strip and upper chest stay hidden under it, shown they spiked out over the band as pale teeth
  const skin = { collar: scoop && !banded, // Nov 11: the neckline band cut off the torso (collar_split.py); the rest of the torso hides under the shirt, its shoulder teeth poked through
    torso: !covered || tank, torso_front: !covered || openFront || tank, torso_upper_front: !banded && (!covered || openFront || topRow?.kind === 'tank'), // a tank's deep neckline shows the chest under it: hiding it left a void and the neck region's saw edge in the V (shelly Nov 10: 'my breasts are cracked')
    hips: !bottom, upperarms: !sleeves || grown, forearms: !longSleeves, hands: true, neck: !banded, /* the body's neck ring poked out over the collar band as a jagged pale strip */ thigh_hi: !bottom, thigh_low: !trousers && !longSkirt, shin_hi: !trousers && !longSkirt, shin_low: !trousers && !longSkirt && shoeRow?.kind !== 'boots', feet: !shoeRow }
  if (!topRow && !bottomRow && !shoeRow) { parts.Body = { visible: true }; for (const k in skin) skin[k] = false } // Nov 11: bare, the whole Body shell draws alone; the cut Skin_ regions overlapped it with saw edges and read as torn spiky fur on the thick body
  for (const [region, visible] of Object.entries(skin)) { parts['Skin_' + region] = { visible }; parts['Skin_' + region + '.001'] = { visible }; parts['Skin_' + region + '001'] = { visible } } // Nov 11: each region's second piece (its fur/pad patch, a node named .001) stayed drawn under clothes: the orange tufts through Andrew's sleeve and pants
  for (const [slot, pre] of Object.entries(M.slots)) {
    const row = rowOf(slot, l[slot], l[CL.colourKey[slot]])
    const named = row && 'Ward_' + row.id
    if (named && WARDROBE.parts.includes(named)) parts[named] = { visible: true }
    else if (!CLOTHES_OFF) { const k = MESH_SWAP[slot]?.[l[slot]] ?? l[slot]; if (k && k !== 'none' && parts[pre + '_' + k]) parts[pre + '_' + k].visible = true }
  }
  const sp = M.species[speciesOf(l)]
  const materials = {
    ...furMats(l),
    pad: { color: l?.pad || sp?.pad || M.pad || '#ff9fb4', roughness: 0.52, metalness: 0 },
    sole: { color: '#2a2430', roughness: 0.85, metalness: 0 },
    button: { color: '#f5f3ec', roughness: 0.4, metalness: 0.05 },
    metal: { color: '#c8cbd0', roughness: 0.3, metalness: 0.85 },
    gold: { color: '#e8c35a', roughness: 0.3, metalness: 0.9 },
    lens: { color: '#1a1824', roughness: 0.1, metalness: 0.9, opacity: 0.75, transparent: true },
  }
  for (const [slot, [mat, key]] of Object.entries(CLOTH)) if (l[key]) {
    const row = l[slot] && l[slot] !== 'none' ? rowOf(slot, l[slot], l[key]) : null, pat = row ? patOk(row, l[CL.patKey[slot]]) : null
    materials[mat] = { kind: 'scripted', script: 'scripts/mat-cloth.js', color: l[key], roughness: 0.8, metalness: 0, params: { pat: pat || 'weave', s: 1 } } // every garment wears real fabric now, plain ones a weave (Nov 10) // fabric patterns: scripts/mat-cloth.js
  }
  return { id: M.body[l.sex === 'f' ? 'f' : 'm'], materials: only(materials, M.bodyMats), parts }
}
export function hasBlush(l) {
  if (!l) return false
  if (speciesOf(l) === 'fox') return false
  const b = l.blush
  if (!b || b === 'none' || b === 'false' || b === false) return false
  return true
}
export function headModel(l0) {
  const l = faceFill(l0), spName = speciesOf(l), sp = M.species[spName];
  const isFemale = l?.sex === 'f';
  const eyeCol = l?.eye && l.eye !== '#2b2233' && l.eye !== '#000000' ? l.eye : null;
  const wearsBlush = hasBlush(l);
  const blushCol = (typeof l?.blush === 'string' && l.blush.startsWith('#'))
    ? l.blush
    : (isFemale ? '#ff6588' : '#ff7b94');
  const wearsBeard = Boolean(l?.beard && l.beard !== 'none');
  const beardCol = l?.beardc || l?.hairc || '#5a3a26';
  const icon = ICONIC[spName] || {};
  return {
    id: (isFemale ? sp.headF : sp.headM) || sp.head,
    materials: flatFace(only({
      ...furMats(l),
      eyewhite: { color: l?.sclera || '#fffdf8', roughness: 0.35, metalness: 0 }, // l.sclera: one look's own (Phoebe's black)
      eyeink: { color: '#16101c', roughness: 0.95, metalness: 0 },
      pupil: l?.pupil ? { color: l.pupil, roughness: 1, metalness: 0, ...(l.glowEye ? { emissive: l.pupil, emissiveIntensity: typeof l.glowEye === 'number' ? l.glowEye : 2 } : {}) } // an authored pupil (Phoebe's white, glowing; johnadams2 Nov 8): one look's own, the black rule stands for the rest
      : {
        color: eyeCol && (l?.glowEye || l?.species === 'samantha') ? eyeCol : '#000000', // STRICT: pupils all matte black, no shines; colour rides iris
        roughness: 1,
        metalness: 0,
        ...(eyeCol && (l?.glowEye || l?.species === 'samantha') ? { emissive: eyeCol, emissiveIntensity: 0.4 } : {})
      },
      iris: { color: eyeCol || '#8a5a2e', roughness: 0.22, metalness: 0.05 },
      blush: wearsBlush
        ? { color: blushCol, roughness: 0.88, metalness: 0, transparent: true, opacity: 0.82 }
        : { color: blushCol, visible: false, transparent: true, opacity: 0, depthWrite: false },
      mouth: { color: '#44141e', roughness: 0.82 },
      tongue: { color: '#ff758c', roughness: 0.45 },
      nose: { color: l?.nose || icon.nose || sp.nose || '#221614', roughness: 0.28, metalness: 0.05 },
      beard: wearsBeard
        ? { color: beardCol, roughness: 0.65, metalness: 0.02 }
        : { color: beardCol, visible: false, transparent: true, opacity: 0, depthWrite: false }
    }, sp.mats))
  }
}
// the drawn face (eyes, mouth, nose, blush, markings) sits a hair over the head: the ink outline traced that step and doubled every ring and patch
// (Shelly Nov 9: "the furry models are awful"). Those slots draw no outline; the fur keeps it, so the head's silhouette is still inked.
const FLAT_FACE = ['eyewhite', 'eyeink', 'pupil', 'iris', 'blush', 'mouth', 'tongue', 'nose', 'beard', 'mark', 'belly']
function flatFace(m) { for (const k of FLAT_FACE) if (m[k]) m[k] = { ...m[k], outline: false }; return m }
// face variety (data/faces.yml): a look with no trait of its own (an NPC) rolls one, an eye colour, cheeks and a nose from its seed (l.fseed, set from the NPC's id by
// clothes.js npcLook, else from the look itself); anything the look already says is kept. A player's look always carries its trait, so it is never rolled.
function rngOf(l) { let h = 2166136261; for (const c of String(l.fseed ?? `${l.species}|${l.sex}|${l.fur}|${l.top}|${l.bottom}`)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000 } }
const pickOf = (a, u) => a[Math.floor(u() * a.length)]
export function faceFill(l) {
  if (!l || l.vary === false) return l
  const u = rngOf(l)
  const own = l.fseed != null && l.faceOwn !== true // an NPC rolls its whole face from its id (a bespoke resident sets faceOwn to keep theirs)
  const o = { ...l }

  // 1. Role-based personality weighting for resting traits
  const role = String(l.role || '').toLowerCase()
  const names = Object.keys(FACES.traits)
  const traitWeights = { ...FACES.traits }

  if (['guard', 'scout', 'captain'].includes(role)) {
    for (const k of ['alert', 'focused', 'stern', 'stoic', 'wary', 'resolute']) {
      if (traitWeights[k]) traitWeights[k] = { ...traitWeights[k], w: (traitWeights[k].w ?? 1) * 2.5 }
    }
  } else if (['medic'].includes(role)) {
    for (const k of ['gentle', 'warm', 'focused', 'soft', 'weary', 'resolute']) {
      if (traitWeights[k]) traitWeights[k] = { ...traitWeights[k], w: (traitWeights[k].w ?? 1) * 2.5 }
    }
  } else if (['trader', 'quarter'].includes(role)) {
    for (const k of ['wry', 'cheeky', 'warm', 'smug', 'cheerful', 'perky']) {
      if (traitWeights[k]) traitWeights[k] = { ...traitWeights[k], w: (traitWeights[k].w ?? 1) * 2.5 }
    }
  } else if (['scavenger', 'survivor'].includes(role)) {
    for (const k of ['wary', 'tired', 'weary', 'stoic', 'alert', 'wistful', 'mellow']) {
      if (traitWeights[k]) traitWeights[k] = { ...traitWeights[k], w: (traitWeights[k].w ?? 1) * 2.2 }
    }
  }

  // Pick trait if not already specified
  if (!o.trait) {
    const tot = names.reduce((a, k) => a + (traitWeights[k]?.w ?? 1), 0)
    let r = u() * tot, trait = names[0]
    for (const k of names) {
      r -= traitWeights[k]?.w ?? 1
      if (r <= 0) { trait = k; break }
    }
    o.trait = trait
  }
  if (!o.tstr) {
    const [s0, s1] = FACES.strength ?? [0.55, 1.25]
    o.tstr = Math.round((s0 + u() * (s1 - s0)) * 100) / 100
  }

  // 2. Eyes, blush, nose & humanoid palettes
  const isHumanoid = ['human', 'faceling'].includes(speciesOf(o))
  const HUMAN_SKINS = ['#fde2cb', '#fae1dc', '#f3cfad', '#dfa273', '#c68652', '#8d5524', '#53341b', '#362114']
  const HUMAN_HAIR = ['#1a1412', '#2c1b14', '#4e2f1d', '#8c5432', '#c49258', '#e8c47e', '#b04a28', '#8a8a90']
  if (isHumanoid) {
    if (own || !o.fur) o.fur = pickOf(HUMAN_SKINS, u)
    if (own || !o.mark || o.mark === 'none') o.mark = pickOf(HUMAN_HAIR, u)
  }
  if (own || !o.eye || o.eye === '#2b2233') o.eye = pickOf(FACES.eye, u)
  if (own || !o.blush) o.blush = pickOf(FACES.blush, u)
  const icon = ICONIC[speciesOf(l)] || {}
  if (icon.nose) o.nose = icon.nose
  else if (own || !o.nose) {
    const n = pickOf(FACES.nose, u)
    o.nose = n || (own ? '' : o.nose)
  }

  // Eye shape harmonized with trait
  if (own || !o.eyes) {
    const tr = o.trait || ''
    if (['wideeyed', 'curious', 'bubbly', 'startled', 'alert'].includes(tr)) {
      o.eyes = u() < 0.7 ? 'wide' : 'round'
    } else if (['dreamy', 'soft', 'gentle', 'wistful', 'sleepy'].includes(tr)) {
      o.eyes = u() < 0.65 ? 'tall' : 'round'
    } else {
      o.eyes = pickOf(['round', 'round', 'tall', 'wide'], u)
    }
  }

  // 3. Head shape (FT_ keys)
  if (own || !o.ftype || o.ftype === 'round') {
    const tn = Object.keys(FACES.types)
    const tt = tn.reduce((a, k) => a + (FACES.types[k].w ?? 1), 0)
    let q = u() * tt, ft = tn[0]
    for (const k of tn) {
      q -= FACES.types[k].w ?? 1
      if (q <= 0) { ft = k; break }
    }
    const [a, b] = FACES.typeStrength ?? [0.75, 1.1]
    o.ftype = ft
    o.ftstr = Math.round((a + u() * (b - a)) * 100) / 100
  }

  return o
}

export function faceMorph(expr, blink, isFemale, look) {
  const isNeutral = !expr || expr === 'neutral' || expr === 'resting'
  const f = isNeutral ? {} : { ...(M.faces[expr] || {}) }
  const ff = look ? faceFill(look) : null, tr = ff ? FACES.traits[ff.trait] : null, ts = ff?.tstr ?? 1
  if (tr) for (const [k, v] of Object.entries(tr)) if (k !== 'w') f[k] = Math.min(1, (f[k] ?? 0) + v * ts)
  const fty = ff ? FACES.types[ff.ftype] : null, fs = ff?.ftstr ?? 1 // the head's own shape: FT_ keys
  if (fty) for (const [k, v] of Object.entries(fty)) if (k !== 'w') f[k] = Math.min(1, v * fs)

  // --- Dynamic Speech Viseme Technology (phonetic mouth shapes during dialogue) ---
  if (look?.talking || look?.speech || look?.talk || expr === 'talking') {
    const t = Number(look?.talkTime ?? (Date.now() / 1000))
    // Enhanced multi-phonemic syllable oscillation (vowel opening + rounded labial variation)
    const ph = (t * 22) % (Math.PI * 4)
    const openSyllable = Math.max(0, Math.sin(ph) * 0.72 + Math.sin(ph * 0.5) * 0.28)
    const roundO = Math.max(0, Math.cos(ph * 1.3) * 0.40)
    const intensity = Number(look?.talkIntensity ?? 0.76)
    f.Open = Math.min(0.85, (f.Open ?? 0) + openSyllable * intensity)
    f.O = Math.min(0.68, (f.O ?? 0) + roundO * intensity * 0.65)
    f.Smile = Math.min(0.92, (f.Smile ?? 0) + 0.18)
    // Conversational brow articulation
    f.Wide = Math.min(0.35, (f.Wide ?? 0) + Math.max(0, Math.sin(t * 6)) * 0.12)
  }

  // --- Hurt / Flinch Expression Technology ---
  if (look?.hurt || look?.flinch) {
    f.Sad = Math.min(1, (f.Sad ?? 0) + 0.65)
    f.Half = Math.min(1, (f.Half ?? 0) + 0.55)
    f.Frown = Math.min(1, (f.Frown ?? 0) + 0.75)
    f.Angry = Math.min(1, (f.Angry ?? 0) + 0.35)
  }

  // --- Head silhouette smoothing: anti-oval & anti-blocky ---
  // Soften tall/narrow weights to fix heads being too ovally
  if (f.FT_Long) f.FT_Long = Math.min(0.35, f.FT_Long * 0.45)
  if (f.FT_Narrow) f.FT_Narrow = Math.min(0.35, f.FT_Narrow * 0.5)
  // Soften square / blocky jaws into rounded cute cheeks
  if (f.FT_Square) {
    f.FT_Square = Math.min(0.28, f.FT_Square * 0.35)
    f.FT_Round = Math.min(1, (f.FT_Round ?? 0) + 0.2)
  }

  // --- Species Anatomical Snout & Head Profiles ---
  // Each animal species establishes its authentic cranial and snout profile
  const spName = speciesOf(ff ?? look)
  if (['human', 'faceling'].includes(spName)) {
    // Human cranial anatomy: ZERO animal snout protrusion, refined jawline & cheek structure
    f.FT_Snout = 0
    if (isFemale) {
      f.FT_Heart = Math.min(0.42, Math.max(f.FT_Heart ?? 0, 0.28))
      f.FT_Round = Math.min(0.38, Math.max(f.FT_Round ?? 0, 0.22))
      f.FT_Chubby = Math.min(0.24, (f.FT_Chubby ?? 0) * 0.45)
    } else {
      f.FT_Broad = Math.min(0.38, Math.max(f.FT_Broad ?? 0, 0.24))
      f.FT_Square = Math.min(0.30, Math.max(f.FT_Square ?? 0, 0.18))
      f.FT_Round = Math.min(0.28, Math.max(f.FT_Round ?? 0, 0.15))
      f.FT_Chubby = Math.min(0.20, (f.FT_Chubby ?? 0) * 0.35)
    }
  } else if (['wolf', 'dog', 'fox', 'jackal', 'fennec'].includes(spName)) {
    // Canines & Vulpines: distinct muzzle/snout, sleek cheeks, alert tapering jaw
    if (spName === 'wolf') {
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.52) + (isFemale ? 0.04 : 0.10))
      f.FT_Broad = Math.min(0.32, Math.max(f.FT_Broad ?? 0, 0.18))
      f.FT_Round = Math.min(0.38, (f.FT_Round ?? 0) * 0.65)
      f.FT_Chubby = Math.min(0.28, (f.FT_Chubby ?? 0) * 0.55)
    } else if (spName === 'fox' || spName === 'jackal') {
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.46) + (isFemale ? 0.04 : 0.08))
      f.FT_Narrow = Math.min(0.32, Math.max(f.FT_Narrow ?? 0, 0.20))
      f.FT_Heart = Math.min(0.42, Math.max(f.FT_Heart ?? 0, 0.30))
      f.FT_Round = Math.min(0.36, (f.FT_Round ?? 0) * 0.65)
    } else if (spName === 'fennec') {
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.38))
      f.FT_Heart = Math.min(0.48, Math.max(f.FT_Heart ?? 0, 0.34))
      f.FT_Snub = Math.min(0.32, Math.max(f.FT_Snub ?? 0, 0.20))
      f.FT_Round = Math.min(0.42, (f.FT_Round ?? 0) * 0.70)
    } else {
      // Dog
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.42) + (isFemale ? 0.04 : 0.08))
      f.FT_Broad = Math.min(0.26, Math.max(f.FT_Broad ?? 0, 0.16))
      f.FT_Round = Math.min(0.48, Math.max(f.FT_Round ?? 0, 0.25))
      f.FT_Chubby = Math.min(0.36, Math.max(f.FT_Chubby ?? 0, 0.20))
    }
  } else if (['deer', 'reindeer'].includes(spName)) {
    // Cervids: graceful tapered heart-shaped muzzle with slender snout
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.38))
    f.FT_Heart = Math.min(1, Math.max(f.FT_Heart ?? 0, 0.48))
    f.FT_Narrow = Math.min(0.32, Math.max(f.FT_Narrow ?? 0, 0.24))
    f.FT_Chubby = Math.min(0.22, (f.FT_Chubby ?? 0) * 0.4)
    f.FT_Round = Math.min(0.35, (f.FT_Round ?? 0) * 0.6)
  } else if (spName === 'pig') {
    // Suids: prominent forward snout disc, round cheeks
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.60))
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.36))
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.28))
  } else if (['bear', 'capybara', 'badger'].includes(spName)) {
    // Heavy / broad skulls: wide jaw, blunt muzzle, sturdy cute cheeks
    if (spName === 'capybara') {
      f.FT_Broad = Math.min(1, Math.max(f.FT_Broad ?? 0, 0.58))
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.38))
      f.FT_Square = Math.min(0.32, Math.max(f.FT_Square ?? 0, 0.25))
    } else if (spName === 'bear') {
      f.FT_Broad = Math.min(1, Math.max(f.FT_Broad ?? 0, 0.52))
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.34))
      f.FT_Square = Math.min(0.28, Math.max(f.FT_Square ?? 0, 0.18))
    } else {
      f.FT_Broad = Math.min(1, Math.max(f.FT_Broad ?? 0, 0.46))
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.34))
    }
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.32))
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.28))
  } else if (['bunny', 'lop', 'hamster', 'mouse', 'squirrel'].includes(spName)) {
    // Lagomorphs & small rodents: cute snub muzzle, chubby puffy cheeks
    f.FT_Snub = Math.min(1, Math.max(f.FT_Snub ?? 0, 0.48))
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.44) + (isFemale ? 0.12 : 0.05))
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.42) + (isFemale ? 0.12 : 0.05))
  } else if (['rat', 'ferret', 'otter', 'beaver'].includes(spName)) {
    // Sleek rodents & mustelids: streamlined muzzle, balanced cheeks
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, spName === 'rat' ? 0.34 : 0.30))
    f.FT_Round = Math.min(0.42, Math.max(f.FT_Round ?? 0, 0.26))
    f.FT_Chubby = Math.min(0.32, (f.FT_Chubby ?? 0) * 0.6)
    if (spName === 'otter' || spName === 'beaver') f.FT_Broad = Math.min(0.32, Math.max(f.FT_Broad ?? 0, 0.18))
  } else if (spName === 'koala') {
    // Koala: wide broad face, fluffy sides
    f.FT_Broad = Math.min(1, Math.max(f.FT_Broad ?? 0, 0.48))
    f.FT_Snub = Math.min(1, Math.max(f.FT_Snub ?? 0, 0.32))
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.36))
  } else if (['lion', 'tiger', 'leopard'].includes(spName)) {
    // Big Cats: broader powerful muzzle and jaw structure
    f.FT_Broad = Math.min(0.42, Math.max(f.FT_Broad ?? 0, 0.28))
    f.FT_Snout = Math.min(0.40, Math.max(f.FT_Snout ?? 0, 0.26) + (isFemale ? 0.02 : 0.06))
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.36))
    f.FT_Square = Math.min(0.22, Math.max(f.FT_Square ?? 0, 0.14))
  } else if (spName === 'raccoon') {
    // Raccoon: triangular bandit muzzle with wide cheek tufts
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.36) + (isFemale ? 0.03 : 0.07))
    f.FT_Broad = Math.min(0.40, Math.max(f.FT_Broad ?? 0, 0.26))
    f.FT_Heart = Math.min(0.35, Math.max(f.FT_Heart ?? 0, 0.20))
    f.FT_Chubby = Math.min(0.38, Math.max(f.FT_Chubby ?? 0, 0.22))
  } else if (spName === 'panda') {
    // Giant Panda: big round dome head with deep chubby cheeks
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.54))
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.48))
    f.FT_Broad = Math.min(0.42, Math.max(f.FT_Broad ?? 0, 0.30))
  } else if (spName === 'sheep') {
    // Sheep: gentle roman snout with soft fluffy cheeks
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.32))
    f.FT_Round = Math.min(0.50, Math.max(f.FT_Round ?? 0, 0.36))
    f.FT_Chubby = Math.min(0.45, Math.max(f.FT_Chubby ?? 0, 0.28))
  } else if (spName === 'skunk') {
    // Skunk: sleek muzzle and rounded crown
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, 0.34))
    f.FT_Heart = Math.min(0.35, Math.max(f.FT_Heart ?? 0, 0.24))
    f.FT_Round = Math.min(0.45, Math.max(f.FT_Round ?? 0, 0.30))
  } else {
    // Felids & others (cat, redpanda): cute kemono roundness
    if (f.FT_Snout) f.FT_Snout = Math.min(0.28, f.FT_Snout * 0.50)
    f.FT_Round = Math.min(1, Math.max(f.FT_Round ?? 0, 0.42) + (isFemale ? 0.16 : 0.08))
    f.FT_Chubby = Math.min(1, Math.max(f.FT_Chubby ?? 0, 0.34) + (isFemale ? 0.14 : 0.06))
    f.FT_Snub = Math.min(0.35, Math.max(f.FT_Snub ?? 0, 0.22))
  }

  // --- Interactive Snout Slider Scaling (snoutS: 0.3..1.8) ---
  // Gracefully multiplies or reduces the snout length on top of species anatomy
  const snoutS = Number(look?.snoutS ?? ff?.snoutS)
  if (snoutS && snoutS !== 1 && !['human', 'faceling'].includes(spName)) {
    if (snoutS > 1.0) {
      const bonus = (snoutS - 1.0) * 0.75
      f.FT_Snout = Math.min(1, (f.FT_Snout ?? 0) * (1 + bonus * 0.8) + bonus * 0.6)
      if (f.FT_Snub) f.FT_Snub = Math.max(0, f.FT_Snub - bonus * 0.8)
    } else {
      const reduction = (1.0 - snoutS) * 0.75
      f.FT_Snout = Math.max(0, (f.FT_Snout ?? 0) * (1 - reduction * 1.1))
      f.FT_Snub = Math.min(1, (f.FT_Snub ?? 0) + reduction * 0.75)
    }
  }

  // --- Open Mouth & Speech Anatomical Compensation ---
  // When characters open their mouth (laughing, speaking, shouting, smiling wide),
  // reinforce the lower jaw and forward projection to prevent the mouth
  // cavity from feeling hollow or caved into the skull.
  const openAmt = Math.max(f.Open ?? 0, (f.O ?? 0) * 0.8)
  if (openAmt > 0.04) {
    if (!['human', 'faceling'].includes(spName)) {
      // 1. Maintain forward muzzle and mandibular volume under open-mouth tension
      f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, (f.FT_Snout ?? 0) + openAmt * 0.14))
    }
    // 2. Prevent narrow/long face types from over-stretching the open mouth cavity inward
    if (f.FT_Narrow) f.FT_Narrow = Math.max(0, f.FT_Narrow * (1 - openAmt * 0.45))
    if (f.FT_Long) f.FT_Long = Math.max(0, f.FT_Long * (1 - openAmt * 0.35))
    // 3. Support lower jaw width so open mouth feels full and cute
    f.FT_Round = Math.min(1, (f.FT_Round ?? 0) + openAmt * 0.10)
    // 4. Cap extreme mouth opening to keep lower lip cleanly within mandibular shelf
    if (f.Open > 0.88) f.Open = 0.88
  }

  // --- Blush stickers: NOT permanent on everyone ---
  const wearsBlush = hasBlush(ff ?? look)
  if (wearsBlush) {
    // If they have a blush sticker style or colour, display it cleanly
    if (f.Blush == null || f.Blush < 0.35) f.Blush = 0.38
  } else {
    // If they do NOT wear a blush sticker, only emotional reactions blush
    if (!['shy', 'love', 'kiss', 'joy', 'catmouth', 'nervous', 'flustered', 'beam'].includes(expr) && !tr?.Blush) {
      delete f.Blush
    }
  }

  // Cute resting face warmth for friendly expressions
  const negExprs = ['sad', 'angry', 'cry', 'scared', 'pout', 'shock', 'teary', 'unimpressed', 'grumpy', 'disgusted', 'bored', 'stoic', 'stern', 'tired', 'weary', 'resolute']
  if (f.Smile == null && !negExprs.includes(expr) && !negExprs.includes(ff?.trait)) {
    f.Smile = isFemale ? 0.22 : 0.16
  }

  if (blink) f.Blink = 1
  return eyeClean(f, ff?.eyes ?? look?.eyes)
}
// eye keys are whole shapes, so stacking them smears the eye: a shut or happy eye wins over the open-eye shapes, the open shapes share one budget,
// and the eye type (EyeTall / EyeWide on the Blender heads) fades out as the lids close
const OPEN_EYE = ['Half', 'Sad', 'Angry', 'Wide']
function eyeClean(f, eyes) {
  const shut = Math.min(1, Math.max(f.Blink ?? 0, f.Happy ?? 0))
  if ((f.Blink ?? 0) > 0 && (f.Happy ?? 0) > 0) { if (f.Blink >= f.Happy) f.Happy = 0; else f.Blink = 0 }
  let sum = 0; for (const k of OPEN_EYE) if (f[k]) { f[k] *= 1 - shut; sum += f[k] }
  if (sum > 1) for (const k of OPEN_EYE) if (f[k]) f[k] /= sum
  const t = eyes === 'tall' ? 'EyeTall' : eyes === 'wide' ? 'EyeWide' : null
  if (t) f[t] = 1 - shut
  return f
}
// a whole critter for a spawn (place sims): body, head child, gait clips on the library
export const MESH = M.mesh === true
export function critterSpec(l) {
  if (HUMAN) {
    const hc = hairChild(l), bc = beardChild(l)
    return {
      model: humanBody(l),
      morph: humanBodyMorph(l),
      children: [hc, bc, ...wardChildren(l)].filter(Boolean),
      ...(l?.heightS || l?.buildS ? { scale: { x: Number(l.buildS) || 1, y: Number(l.heightS) || 1, z: Number(l.buildS) || 1 } } : {})
    }
  }
  if (isNewCat(l)) return { model: catModel(catSex(l), catLook(l)), morph: catMorph(catLook(l)), children: catChildren(catSex(l), catLook(l)), ...(l?.heightS || l?.buildS ? { scale: { x: Number(l.buildS) || 1, y: Number(l.heightS) || 1, z: Number(l.buildS) || 1 } } : {}) }
  if (!MESH) return { primitive: { kind: 'scripted', script: 'scripts/critter2-geo.js', params: l }, material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.65, bounce: 0.72 } }
  const isF = l?.sex === 'f'
  return {
    model: bodyModel(l),
    morph: bustMorph(l) ?? undefined,
    bones: baseBones(null, l),
    children: [{
      id: HEAD_ID,
      attachment: { skin: true },
      model: headModel(l),
      morph: faceMorph(l?.expr, false, isF, l),
      jiggle: { bones: ['EarL', 'EarR'], amount: 0.58, bounce: 0.72 },
      ...(maskOf(l) ? { visible: false } : {})
    }, maskChild(l), hairChild(l), beardChild(l)].filter(Boolean),
    material: { outline: { color: '#1d1420', width: 2.4 } },
    jiggle: { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.68, bounce: 0.72 },
    ...(l?.heightS || l?.buildS ? { scale: { x: Number(l.buildS) || 1, y: Number(l.heightS) || 1, z: Number(l.buildS) || 1 } } : {})
  }
}
// a mesh critter's look read back off its own model (the bodies laid before state.wear existed): parts shown = garments, cloth_* = their colours, head GLB = species and sex
const CLOTH_KEY = { topw: 'top', botw: 'bottom', shoes: 'shoec', hat: 'hatc', neck: 'neckc' }
const femaleBody = (id) => [M.body.f, M.human?.f, CAT_BODY.f.glb, '/cdn/value.b7e9e975757bd462383a34e82b2214aa10a8a589b2625ab820e71f5385a8dd7d.glb', '/cdn/value.c40b56b5d34276ea7dd8f0e9b75dd40b5ee9da6c238fc93803e78cf6eedccf08.glb', '/cdn/value.371afb217c343ae5aaf7ec3daa8dded862e4221ae0ec32239baf1813c0bf6c25.glb'].includes(id) || [WARDROBE.legacyHuman, WARDROBE.legacyFur].some((rows) => Object.entries(rows ?? {}).some(([sex, ref]) => sex.startsWith('f') && ref === id))
export function lookFromModel(model, headId) {
  if (!model || typeof model !== 'object') return null
  const vis = (n) => model.parts?.[n]?.visible
  const l = { sex: femaleBody(model.id) || vis('Bot_skirt') || vis('Bot_longskirt') || vis('Top_dress') ? 'f' : 'm' }
  for (const [slot, pre] of Object.entries(M.slots)) { l[slot] = 'none'; for (const [n, v] of Object.entries(model.parts || {})) if (v?.visible && n.startsWith(pre + '_')) l[slot] = n.slice(pre.length + 1) }
  for (const row of CL.rows) if (vis('Ward_' + row.id)) l[row.slot] = row.id
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
// critter heads a scene laid as children under their own minted ids (Level 4 office people): a human body drops them too
const HEAD_IDS = () => new Set(Object.values(M.species).flatMap((r) => [r.head, r.headM, r.headF]))
export function strayHeads(ctx, obj) {
  const ids = HEAD_IDS(), out = []
  for (const c of obj?.children ?? []) { const h = typeof c === 'string' ? ctx.getObject(c) : c?.id ? ctx.getObject(c.id) ?? c : c; const m = h?.model?.id ?? h?.model; if (h?.id && typeof m === 'string' && ids.has(m)) out.push(h) }
  return out
}
// Skin attachments must be rebuilt when their parent rig changes.
export function clearAppearance(ctx,obj) {
  for(const key of [HEAD_ID,MASK_ID,HAIR_ID,BEARD_ID,INNER_ID,...WARDROBE.parts.map(wardKey)]) {
    const id=obj.id+'/'+key
    if(ctx.getObject(id))ctx.destroy(id)
  }
  for(const h of strayHeads(ctx,obj))if(ctx.getObject(h.id))ctx.destroy(h.id)
}
export function seatHead(ctx, obj, l) {
  const body=obj.model?.id??obj.model
  if(obj.state && obj.state.headBody!==body){clearAppearance(ctx,obj);obj.state.headBody=body}

  if (isNewCat(l)) return seatCat(ctx, obj, l)
  if (HUMAN) { for (const k of [HEAD_ID, MASK_ID]) if (ctx.getObject(obj.id + '/' + k)) ctx.destroy(obj.id + '/' + k); seatHumanHair(ctx, obj, l); seatBeard(ctx, obj, l); seatWardrobe(ctx, obj, l); for (const h of strayHeads(ctx, obj)) ctx.destroy(h.id); obj.jiggle = null; obj.morph = humanBodyMorph(l); if (obj.material?.outline) obj.material = null; return } // a human body carries its own head; its face keys rolled per NPC
  for (const k of [INNER_ID, ...WARDROBE.parts.map(wardKey)]) if (ctx.getObject(obj.id + '/' + k)) ctx.destroy(obj.id + '/' + k) // Nov 11: human split garments never ride a critter (paws poked through the human sleeves)
  const want = critterSpec(l).children[0]; let h = ctx.getObject(obj.id + '/' + HEAD_ID)
  seatMask(ctx, obj, l); seatHair(ctx, obj, l); seatBeard(ctx, obj, l)
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
export const staleBody = (model) => !!model && !Object.values(M.body).includes(model.id ?? model) && !Object.values(M.human ?? {}).includes(model.id ?? model) && ![CAT_BODY.f.glb, CAT_BODY.m.glb].includes(model.id ?? model)
const SPECIES = Object.keys(M.species)
const hashOf = (str) => { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const CORE_SPECIES = ['cat', 'dog', 'fox', 'bunny', 'bear', 'deer', 'wolf'].filter((k) => SPECIES.includes(k))
export const speciesFor = (id) => CORE_SPECIES[hashOf(id + ':sp') % CORE_SPECIES.length]
// each body its own height and build, stable by id: h 0.86..1.14, w 0.88..1.16 (Savi's picks)
export function buildFor(id, sex) {
  const a = (hashOf(id + ':h') % 1000) / 1000, b = (hashOf(id + ':w') % 1000) / 1000
  const h = +(0.86 + a * 0.28 - (sex === 'f' ? 0.03 : 0)).toFixed(3), w = +(0.88 + b * 0.28).toFixed(3)
  const c = (hashOf(id + ':b') % 1000) / 1000, d = (hashOf(id + ':hd') % 1000) / 1000, e = (hashOf(id + ':tl') % 1000) / 1000
  const ear = +(0.82 + ((hashOf(id + ':ear') % 1000) / 1000) * 0.38).toFixed(2)
  // female critters have curvy bodies with breasts: 0.25..0.95; head 0.92..1.1; tail curl 0.7..1.3
  const bust = +(0.25 + Math.pow(c, 0.85) * 0.70).toFixed(2), head = +(0.92 + d * 0.18).toFixed(3), curl = +(0.7 + e * 0.6).toFixed(2)
  if (HUMAN) { const hw = +(h * (0.97 + b * 0.08)).toFixed(3); return sex === 'f' ? { v: 3, h, w: hw, bust, head: 1, human: true } : { v: 3, h, w: hw, head: 1, human: true } } // a human: one build, height-led, no head or tail rolls
  return sex === 'f' ? { v: 3, h, w, bust, head, curl, ear } : { v: 3, h, w, head, curl, ear } // stable per npc
}
// the resting pose every npc keeps under its other bone writes: its head size and an S-curve in the tail (up off the hips, tip curling back)
// furry proportions (Shelly Nov 9: Dandy's World refs): a big head on a little body. The Head bone scales, so hats and masks on it grow with it
export const FURRY_HEAD = 1.2
// the chunky Andy body's arms hung inside its own hips and through skirts and pants (Shelly Nov 11: 'arm fitting is off'): the upper arms open out this many degrees at the shoulder, over every clip
export const ARM_SPLAY = 20
export const armSplay = () => ({ LeftArm: { roll: ARM_SPLAY }, RightArm: { roll: -ARM_SPLAY } })
export function baseBones(b, l) {
  if (HUMAN) return { Head: { scale: 1 } } // the human rig: true head size, no tail or ears
  const k = b?.curl ?? 1, hs = (b?.head ?? l?.headS ?? 1) * FURRY_HEAD
  const es = b?.ear ?? l?.earS ?? 1
  const bones = { Head: { scale: hs }, Tail: { rotate: [-28 * k, 0, 0] }, Tail1: { rotate: [34 * k, 0, 0] }, ...armSplay() }
  if (es && Math.abs(es - 1) > 0.02) {
    bones.EarL = { scale: es }
    bones.EarR = { scale: es }
  }
  return bones
}
// the body's Bust morph: female critters have natural curvy breasts (base 0.38), modulated by bust / bustS
// + Dandy (art/critter-cute/dandy-morph.mjs): the furry body's stubby shape, every garment in the body GLB carries the same key so clothes stay fitted
export function bustMorph(l) { return { ...(_bust(l) ?? {}), Dandy: 1 } } // Andy: the chunkier Nov 11 body (art/critter-andy)
const _bust = (l) => {
  if (l?.sex !== 'f') return null
  let val = 0.3 // Shelly #205392: toned down
  const input = l.bust != null ? Number(l.bust) : l.bustS != null ? 0.3 + (Number(l.bustS) - 1) * 2.0 : val
  if (Number.isFinite(input)) val = Math.max(0.15, Math.min(1.0, input))
  return { Bust: Math.round(val * 100) / 100 }
}

// ---- the BODIES switch for everyone already standing: every person in a place (NPCs, scene-laid people, corpses) re-dressed on the human or furry body
// their look rides in state.wear (read back off the model when it never had one), so a flip and a flip back returns the same clothes, face and species
const OLD_HUMAN = ['/cdn/value.f99b8cd9ed464225836f5c6703202b1cfb43e540a42d0df4adee2b6cfc153844.glb', '/cdn/value.d7afa31b1b1a18d66973818f86285bace27c51a14d24047858b931891dc5e3d9.glb', '/cdn/value.b357253d55682e07f7c2f664f4242d82fc934254de9019014af4752d7fb6da4b.glb', '/cdn/value.a7909f9c5a5c2ee1e19878e64defa509257d618b4a033b22179088fdd208ae6f.glb', '/cdn/value.b7e9e975757bd462383a34e82b2214aa10a8a589b2625ab820e71f5385a8dd7d.glb', '/cdn/value.b7f64df3d14f4e8851e09f093f5ef4c5ddbce07a7829a231b9c849d50f3b27ab.glb', '/cdn/value.6f6de4b1f5893472365049745c7126dce01a6db43b7ae86d7899078e6deeb7d9.glb', '/cdn/value.fd49318b8e8c14d0e98cf8d8b38433601bad2db2515aa8ed3585e8842e2cd80c.glb', '/cdn/value.8d0f43bf3da06253fd58a24473034d2ff3ff1ad4b551d69fcbced89ff58251c1.glb', '/cdn/value.20d3f3631f90a37ce5dc3131af7fe01f6ad38cdbfd21516e1ba50a5ebfc10234.glb', '/cdn/value.80059b609922b38626d38fbf30c31a25046ecff490b20427cb02e791988fe6bc.glb', '/cdn/value.4802b6cd4b09d80a1b730817fb9ec8620f5d861e9e208cd3d6b6b811a18d0df4.glb', '/cdn/value.59bdc78b4240c5fd51dda3dcd5d717d6636cb08500bbd87acb891a290756daee.glb', '/cdn/value.571a6f2a3b9368cb26c62e6dd96129a7eb7a1b680a6358295b76445e8d5fa96b.glb', '/cdn/value.10792bc623f260a37572790868aab1cd2ead38a1846531279036279fa8c4ad02.glb', '/cdn/value.551f4e076eedd9dccfef9bee30c7daf33456a882eae186be97c104ebd4216151.glb', '/cdn/value.fd4025b2266d959bfa29cd593f61d69d34d73fd7d8f8c6009c7f18cd9f3325d4.glb', '/cdn/value.215e73e7f0164538308a283c66bc194938e60bc791594a8cc7a01adc4fcbd5e4.glb', '/cdn/value.2258e9d53f054bba011a1c4debaaf11ada9d46cd13f286a0f3488d7ea9fa7d0a.glb', '/cdn/value.d953bd900d564f7cc054655d9303e4a91cec7ca3b504b00da73e20f620c53442.glb', '/cdn/value.b42693b9f0cb8c435569bee04cb525e504ea3bd6d71d08769fcdb6fc9a256de1.glb', '/cdn/value.0033bae86efe9c3c2592b24d12521cb4a3a67eb297d6793f28439be336017d55.glb', '/cdn/value.3ebbead620d2a09b8b27374f5ce9779c98c6098ac45ee2cc789b7ab1a9f01267.glb', '/cdn/value.00b66aa4a9630ab5e5de51193052868d52103a14d1f121559e366a19761c7b47.glb', '/cdn/value.945580877b9ce16d0a234ad063cc4202d2565dcb5265c2422d8af80fa9b2c17d.glb', '/cdn/value.471a036ab6de34d7962d0c8b2eafd12bf4d52ce8868594e3544a6ad699e0cea0.glb', '/cdn/value.f472a5f4ffdbcca87896d905eac6a9dbc746234980aa3841933abbf854808144.glb', '/cdn/value.a72d639444162250d9952ce8abf7c92aa06a6085f867c5cda3dabffd461b8809.glb', '/cdn/value.4ea845d5772c35f3c8923973f3078cb9153a7ef21e0ae2f8776f7643c0b519cb.glb']
OLD_HUMAN.push('/cdn/value.0f804808a2834486f121cadfec8de8784cfdbead3a5d0939ca0e6f027bd8526d.glb', '/cdn/value.6f11c2c9ec0cbb44c796db314811f269b1c5cdc19a5f7f34c42ecd221208fe48.glb')
OLD_HUMAN.push('/cdn/value.89d74113d2bb60c5fcf7de629388fd77d62b8c67452400f826bdce3f35ce4267.glb', '/cdn/value.20023a98cea753bd84c6ff72d4e8cc2d8506b70f0dc65170a0f69b31bd82830a.glb')
OLD_HUMAN.push('/cdn/value.85e6596c07f25851628cfcf28b105e0552c2e5a4d3ec7507523ecbb21fab92c0.glb', '/cdn/value.371afb217c343ae5aaf7ec3daa8dded862e4221ae0ec32239baf1813c0bf6c25.glb')
OLD_HUMAN.push('/cdn/value.06e3a5b9460c5cc1d98f4bd17759bb5aaf3d5dfac14bf20eeb986f466fd75f77.glb', '/cdn/value.c40b56b5d34276ea7dd8f0e9b75dd40b5ee9da6c238fc93803e78cf6eedccf08.glb')
OLD_HUMAN.push('/cdn/value.97b14c3b33cdee840f365da5c692b5101d89379a778041bf729b46531d5e43aa.glb', '/cdn/value.19706fd66ac157fe4eed3d856132ca2327696e1580ad0d36ca5f1bff990943b5.glb') // the bodies before the underwear was lifted off the skin (art/human-body/fix_under.mjs)
OLD_HUMAN.push('/cdn/value.7c334339571b407794f9e2373ac64130bac8ff3ad24dfa024b0aea1c6b75b973.glb', '/cdn/value.9c21a96fae4342143b4a5c7e51b7769d956ad18c1f915880e06d73ead80e5040.glb') // before the brows were redrawn as tapered arches (art/human-face/brows.py)
OLD_HUMAN.push('/cdn/value.6d82a47207167ef69b35b49f0903b56ec4e7895dabb5faf723776c1a1ea83258.glb', '/cdn/value.cfce82dca345dede89f2b912d2be72ca5141ea5a2f5c68a02d5e19543cfb9dce.glb') // first brow pass, hairline-thin
OLD_HUMAN.push('/cdn/value.ae6b2ce11269ac8100178ab2933f1b58343732a593414cf3ffa85d7d32a6f4e7.glb', '/cdn/value.96cb937132921c75c0646e3ccc549507c80a4ad94e3b72e35e0ea7e49275138b.glb') // before the neck was shortened and thickened (art/human-body/neck_short.py, m 2.5 cm x1.08, f 3 cm x1.12)
OLD_HUMAN.push('/cdn/value.9b3a3e2bbc627a3479a1ae0dabf120e3047aeaaf5cf2c97aa9232ef4afe40918.glb') // the male body before the shoulder cap: never listed, so Andrew kept it
OLD_HUMAN.push('/cdn/value.a38baae815bc940e048095d087020802d38ee97321bd2518fb2f4a6c6425895d.glb') // first male neck pass (4 cm): the nape sank into scarves
const FURRY_IDS = () => [...Object.values(M.body), ...(M.bodyOld ?? []), ...Object.values(WARDROBE.legacyFur ?? {})], HUMAN_IDS = () => [...Object.values(M.human ?? {}), ...OLD_HUMAN, ...Object.values(WARDROBE.legacyHuman ?? {})]
export const STYLE_V = 'sw165' // sw165: bust moved up to the chest; sw164: girl cat body with a sculpted bust; sw163: cat Chest key driven past 1 (bust read too flat, Shelly Nov 11); sw162: cat body carries tail type keys (Tail_Fluffy/Bob/Puff/Whip/Curl); sw161: cat head with snout and ear shape keys, fur map remade (Shelly #218054 #218094 #218121); sw160: the new Tripo cat is the game's cat (Shelly #217xxx 'replace these demo cats as our new cat model'); // sw159: female chest softened, PG cartoon (art/critter-andy/soft_chest.py), Shelly #205392; sw158: old garments stripped from the body files (229k to 21k verts, art/critter-andy/strip_ward.mjs); // sw157: arms 18% shorter, hands kept (art/critter-andy/short_arms.py), Shelly #204431; // sw156: thick body smoothed and subdivided (art/critter-andy/smooth_body.py), Shelly 'do better'; // sw154: thick body v3, gentler arms and paws, skin not slimmed (sw153 tore the fur); // sw152: every outfit off players and NPCs (Shelly #202602, clothes.js CLOTHES_OFF); sw150: girl critter tops get their own cloth_top paint (they all wore the hat colour); sw148: the chunkier Andy body; sw147: human garments stripped off critters; sw146: furry is the default again (Shelly Nov 11), human-born NPCs restyle to critters, split garments and human hair dropped; sw145: male body makeover (wider shoulders and back, narrower hips, flat chest; art/body-shape/run3.sh), all 77 men's garments refit; sw144: men's tee underarm seam welded shut (tee_slit.py); sw143: men's tee sleeve hems smoothed and held off the arm (tee_hem.py); sw142: men's tee shoulder band takes the body's weights (tee_weights.py), no lump with arms down; sw141: men's tee sleeves hug the arm, chest smoothed (art/human-cloth/tee_sleeve.py); sw140: male body back to one skeleton again (the collar-split re-export had brought the idle Armature.001 copy back; tees stayed in bind pose, sleeves floating); sw139: crew collar band back on men's long sleeve (the sw138 rollback was a test-rig fault, not the band); sw138: sw137 collar band rolled back (its sleeves stayed raised while walking); sw137: men's long sleeve has a crew collar band hugging the neck, collar skin strip hidden under it (art/human-cloth/collar_band.py); sw136/sw135: male body's neckline skin band lowered to the scoop's lowest point and widened to every torso face open through the neckline (collar_split.py zlo 1.26), the shirt's inside no longer shows as white teeth; sw134: sw133's pants re-exported with their cloth_bottom slot name (came out .001, drew untinted); sw133: men's pants waistband pulled in under tops, long sleeve hem held off it (art/human-cloth/waist_snug.py, shirt_out.py); sw132: men's long sleeve back-of-shoulder crumple smoothed (art/human-cloth/shoulder_smooth.py); sw131: plymodel forward +x; sw130: plymodel forward -x; sw129: re-seat worn plymodels facing forward; sw128: the tee under jackets takes a dark shade of the jacket (no white seam stripe); sw127: women's apron front and Bust key held clear of the tee under it; sw126: maid apron skirt part held clear of the long skirt (art/human-cloth/apron_hem.py); sw125: aprons wear the inner tee; sw124: long skirts, gowns and aprons follow the lifted thigh (art/human-cloth/skirt_stride.py); sw123: scarf trial rolled back; sw120: women's glasses front tapered to the face; sw118: curtain cut back to 79b3ec2a (strand map shredded it); sw117: curtain strand map solid above the tips; sw116: curtain cut waist length with strands; sw115: bodies back to one skeleton (art/human-body/drop_dup_rig.py; the collar-split export added an idle bone copy hair/glasses/weapons seated on); sw114: women's glasses back to 95125c56 (sw113 narrow try shredded the frame); sw101: shorter, thicker necks (art/human-body/neck_short.py); sw100: jeans inseam split (art/human-cloth/inseam_split.py), men's glasses and shades carry every head key so the frame follows the face shape (art/human-cloth/eyewear_keys.py); sw99: jeans worn with boots take a tucked cut that ends inside the shaft (art/human-cloth/jeans_tuck.py), the hem no longer pokes through; sw97: underwear seat sits 7 mm off the skin; sw96: female default underwear rides up over the seat at the back (art/human-body/under_back.py); sw95: restyle swaps worn garments whose file changed; sw94: hoodie hood and pocket take the cloth pattern (UVs); sw93: worn hoodie (loose cut, hood down, pocket; art/human-cloth/hang.py), female sweater with Bust, overalls bib and deck waders swap onto NPCs already wearing the old files; sw92: soft blush is two faded cheek patches, not a hard bar (art/human-body/blush_soft.py); sw91: head neck rim sinks into the collar at the back and sides, no seam (art/human-body/neck_hem.py); sw90: head neck weights blend Head->Neck->Spine2 so it bends with the body's ring (art/human-body/neck_weights.py); sw89: head necks widened to meet the body's neck ring, no thin post or collar step (art/human-body/neck_fit.py); sw87: dark irises lifted so the eye colour shows, skin shader warmth cut (read orange under office light); sw86: Nov 10 redo bodies (round deltoid caps, lower trap) with every garment refit, Tripo knit sweater on women; sw85: NPCs missing their garments are dressed again on the restyle pass; sw84: sw83's reshape rolled back (bodies lost their rig in game: t-pose, floating hair, no tops); sw82: fuller thighs, calves, hips and upper arms on both human bodies, every garment moved with them (art/body-shape); sw81: brows thicker, soft arch; sw80: brows redrawn as clean tapered arches; sw75: the whole human hair set refit closer to the head and pushed off the skull; sw73: hair pushed off the skull where it cut in; sw72: every human hair file refit to the live heads (crown ~1.2 cm off the skull, bangs off the face, hairfit.mjs); sw69: female shoulder skin blends Shoulder to Arm across the joint (tmp shw.mjs rule, ~10 cm), so a lowered arm rounds the shoulder instead of standing a peak; sw68: raccoon and badger wear their dark legs and paws; sw67: the female bra rebuilt as a clean band cut from the torso skin, no shoulder pieces to spike when the arms move (art/body-rig/bra.py + bra-splice.mjs.txt); sw66: panda and red panda have their dark limbs (the furry bodies carry a limb material); sw65: the underwear sits 4 mm off the skin on both bodies, no more shorts that read as two leg tubes with skin through the seat; sw62: women's tank refit to the rebuilt female body (fit.py FIT_MIN 0.012), the back no longer shows skin; sw60: rounded shoulder caps, shared skin seams and arm/leg weights (art/body-rig); sw59: tanks held 5 mm off the skin (art/human-cloth/clear_skin.py); sw58: loose strips off both tanks' straps (art/human-cloth/fill_slits.py); sw57: shoulder seam welded on both bodies, no crack when the arm moves (art/human-body/weld_weights.py); sw56: women's arms filled out, deltoid, upper arm and forearm (art/human-body/arms.py K=1.8); sw55: women's shoulders squared and widened, arm joints moved with them (art/human-body/shoulders.py), neck seam welded; sw53: tee-under-vest tried and dropped (the tee swallowed the vest); sw51: Bust 0 on men; sw50: skin stays under vests; sw49: tank straps smoothed (cup_smooth z>1.22 + keep_normals); sw48: no bra under a worn top; sw47: back to the sw44 tank (strap smooth lost its morph keys); sw45: torso skin kept under tanks (no waist hole); sw44: women's tank neckline and armholes smoothed (hem_smooth.py); sw42: chest skin kept under tanks; sw41: tank straps curve into the neckline (no square notch); sw40: tank grown from the body's own skin (art/human-cloth/tank_shell.py); sw39: tank straps 6 mm off the shoulder (art/human-cloth/tank_strap.py); sw38: sweater cuffs re-cut; sw37: armholes and sleeve ends re-cut clean on a plane (art/human-cloth/hem_cut.py); sw36: refits swap on worn clothes, slot-filtered mats, hats back on skin; sw35: boots slimmed and shortened (art/human-cloth/boots_fit.py); sw34: tees pushed 8 mm out (art/human-cloth/tee_fit.py); // sw33: sw32 undone (upper arm poked through the tee); sw31: the wardrobe split, outfits ride the bare body as their own files; sw30: overalls bib stays under closed tops; sw29: chest drape and matched bust morphs; sw28: neckline follows the rig, not the old collar; sw27: garment widths measured from the body, not sleeves; sw26: constructed footwear, old wardrobe bodies migrate with their sex; sw25: distinct wardrobe meshes and skin masks; sw24: furry bodies missing their head re-seat it; sw23: worn hair re-seats when its file changed; sw22: rebuilt scalp caps (smooth shell, feathered root-textured hairline), cap tint near the hair colour; sw20: hair keys on the head-fitted pack (Tripo rows off); sw19: skin swatch unshaded, wider tones; sw18: men's lid-line lashes and M_Jaw/M_Chin head; sw15: scarf knot at the side, overalls drop to pants under closed tops; sw13: scarf is a thick wrap with short splayed ends; sw12: male longsleeve collar smoothed, scarf wraps the neck; sw11: tops hang off the chest (no belly pouch); sw10: tripo hair rows 14-16; sw9: overalls clear of tops (no z-fight); sw8: sleeves cover the upper arm's back, the shoulder blend band has room; sw7: bodies with head types; sw6: skirt waist below the top hem; sw5: skirts tucked under tops (new body glbs); sw4: the hair pack on human heads
export function furrySpec(l) { const h = HUMAN; HUMAN = null; try { return critterSpec(l) } finally { HUMAN = h } } // a character who stays a critter in both modes (Phoebe)
export function restyle(ctx, o) {
  const mid = o?.model?.id ?? o?.model
  if (!mid || typeof mid !== 'string') return false
  let isH = HUMAN_IDS().includes(mid), isF = FURRY_IDS().includes(mid)
  const wardKids = () => Object.keys(ctx.place?.objects ?? {}).filter((k) => k.startsWith(o.id + '/critter-ward-'))
  if (!isH && !isF && (o.state?.headBody || wardKids().length)) isH = true // Nov 11: a read can name the served copy of the body file, not its listed id; split garments or a seated human head still say human
  if (!isH && !isF) return false
  const want = HUMAN ? 'h' : 'f'
  const stray = strayHeads(ctx, o)
  if (want === 'f' && isF && (M.bodyOld ?? []).includes(mid)) { const l0 = o.state?.wear; if (l0) { o.model = bodyModel(l0); o.morph = bustMorph(l0) ?? null; return true } } // Nov 11: the pre-Andy body swaps for the new one, worn look kept
  if (want === 'f' && isF && o.state?.wear && Object.entries(o.model?.parts ?? {}).some(([k, v]) => /^(Ward_|Top_|Bot_|Shoes_|Hat_|Neck_|Eyew_)/.test(k) && v?.visible)) { o.model = bodyModel(o.state.wear); o.morph = bustMorph(o.state.wear) ?? null; return true } // sw152: a body still wearing an outfit drawn before the wipe (CLOTHES_OFF) takes the bare body
  if (want === 'f' && isF && o.state?.wear && Object.values(M.body).includes(mid)) { const nb = bodyModel(o.state.wear); if (!!nb.parts?.Body?.visible !== !!o.model?.parts?.Body?.visible) { o.model = nb; o.morph = bustMorph(o.state.wear) ?? null; return true } } // sw155: a bare body redraws as the one smooth shell
  if (want === 'f' && isF && Object.values(M.body).includes(mid)) { // a furry body whose species head went missing (a human pass dropped it) gets it back (Shelly, Nov 9: "npcs have no head sometimes")
    if (!wardKids().length && (ctx.getObject(o.id + '/' + HEAD_ID) || stray.length || !o.state?.wear || maskOf(o.state.wear))) return false
    seatHead(ctx, o, o.state.wear); return true
  }
  if (want === 'h' && isH && Object.values(M.human).includes(mid) && o.model?.materials && (o.model.materials.Eye?.map !== FACE_ATLAS || (o.model.materials.Blush && o.model.materials.Blush.opacity !== 0.2) || (o.model.materials.Blush && o.model.materials.BlushSoft?.map !== BLUSH_FADE))) { const mm = o.model.materials, w = o.state?.wear; o.model = { ...o.model, materials: { ...mm, Eye: { color: '#ffffff', map: FACE_ATLAS, roughness: 0.5, metalness: 0 }, Brow: { ...(mm.Brow || {}), map: FACE_ATLAS }, Lash: { ...(mm.Lash || { color: '#2a2024' }), map: FACE_ATLAS }, ...(mm.Blush ? { Blush: BLUSH_MAT(w?.blush && String(w.blush).startsWith('#') ? w.blush : null), BlushSoft: BLUSH_SOFT_MAT(w?.blush && String(w.blush).startsWith('#') ? w.blush : null) } : {}), ...(mm.Iris ? { Iris: { ...mm.Iris, color: liftEye(w?.eye && w.eye !== '#000000' ? w.eye : (mm.Iris.color || '#5b4a3a')) } } : {}) } }; return true } // older NPCs: the face atlas without the red eye ring, and irises lifted (Nov 10)
  if(want==='h' && isH && Object.values(M.human).includes(mid) && o.state?.wear && o.state.headBody!==mid){seatHead(ctx,o,o.state.wear);return true}
  if (want === 'h' && isH && Object.values(M.human).includes(mid)) { if (!stray.length && !o.material?.outline) { const w = o.state?.wear, h = ctx.getObject(o.id + '/' + HAIR_ID); if (w && wardChildren(w).some((c) => { const g = ctx.getObject(o.id + '/' + c.id); return !g || (g.model?.id ?? g.model) !== c.model.id })) { seatWardrobe(ctx, o, w); return true } /* sw95: a garment whose file was remade swaps on the NPC already wearing the old one */ /* an NPC whose garments went missing (Nov 10: shirtless M.E.G.) gets dressed again */ if (w && w.hair !== 'none' && !maskOf(w) && (!h || (h.model?.id ?? h.model) !== humanHairOf({ sex: w.sex ?? (mid === M.human.f ? 'f' : 'm'), ...w }))) { seatHumanHair(ctx, o, w); if (!h) seatBeard(ctx, o, w); return true } return false } if (o.state && !o.state.wear) o.state.wear = { ...(lookFromModel(o.model, stray[0]?.model?.id ?? stray[0]?.model) ?? {}) }; seatHead(ctx, o, o.state?.wear ?? {}); return true }
  const local = String(o.id).split('/').pop()
  const hm = ctx.getObject(o.id + '/' + HEAD_ID)?.model ?? stray[0]?.model
  const l = { ...(lookFromModel(o.model, hm?.id ?? hm) ?? {}), ...(o.state?.wear ?? {}) }
  if (isH && !o.state?.wear) l.sex = femaleBody(mid) || mid === OLD_HUMAN[23] || mid === OLD_HUMAN[25] || mid === '/cdn/value.4ea845d5772c35f3c8923973f3078cb9153a7ef21e0ae2f8776f7643c0b519cb.glb' || mid === OLD_HUMAN[1] || mid === OLD_HUMAN[3] || mid === OLD_HUMAN[4] || mid === OLD_HUMAN[6] || mid === OLD_HUMAN[8] || mid === OLD_HUMAN[9] || mid === OLD_HUMAN[12] || mid === OLD_HUMAN[14] || mid === OLD_HUMAN[19] ? 'f' : (l.sex ?? 'm')
  l.species ??= speciesFor(local); l.sex ??= 'm'; l.fseed ??= hashOf(local)
  if (o.state) o.state.wear = l
  if (want === 'h') { const s = critterSpec(l); o.model = s.model; o.material = null; seatHead(ctx, o, l) }
  else { for (const k of wardKids()) ctx.destroy(k); if (ctx.getObject(o.id + '/' + HAIR_ID)) ctx.destroy(o.id + '/' + HAIR_ID); if (o.state) delete o.state.headBody; o.model = bodyModel(l); o.morph = bustMorph(l) ?? null; o.material = { outline: { color: '#1d1420', width: 2.4 } }; o.jiggle = { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.68, bounce: 0.72 }; seatHead(ctx, o, l) }
  return true
}
// one pass over a place: skips players and what only one machine sees; returns how many changed
// a sweep spread over ticks (Nov 11: one whole-place sweep in a tick cost 1271 ms): a queue of ids, n restyled per call
export function restyleQueue(ctx, place) { const P = place ?? ctx.place, skip = new Set((P.players ?? []).map((p) => p.id)); return Object.keys(P.objects ?? {}).filter((id) => !skip.has(id) && !id.startsWith('player/')) }
export function restyleStep(ctx, q, n = 6) { let k = 0; while (q.length && k < n) { const o = ctx.place.objects[q.pop()]; if (!o || o.audience === 'local') continue; k++; restyle(ctx, o) } return q.length }
export function restylePlace(ctx, place) {
  const P = place ?? ctx.place, skip = new Set((P.players ?? []).map((p) => p.id)); let n = 0
  for (const id in P.objects) { if (skip.has(id) || id.startsWith('player/')) continue; const o = P.objects[id]; if (!o || o.audience === 'local') continue; if (restyle(ctx, o)) n++ }
  return n
}

// ---- human faces (Shelly Nov 9 #116046): expressions and lip sync on the body's X_ keys (art/human-face/expressions.py)
// an expression name (critter-models.yml faces) becomes X_ weights; a spoken line becomes a mouth that follows its letters
const X_MAP = { Smile: ['X_Smile', 1], Frown: ['X_Frown', 1], Open: ['X_Open', 0.7], O: ['X_Round', 1], Wide: ['X_BrowUp', 1], Angry: ['X_BrowAngry', 1], Sad: ['X_BrowSad', 1], Half: ['X_Squint', 0.55], Happy: ['X_Squint', 0.8], Blink: ['X_Blink', 1] }
export const X_KEYS = ['X_Blink', 'X_Squint', 'X_Open', 'X_Wide', 'X_Round', 'X_Smile', 'X_Frown', 'X_BrowUp', 'X_BrowAngry', 'X_BrowSad']
const VIS = (ch) => { // one letter's mouth: [open, wide, round]
  if ('a'.includes(ch)) return [0.85, 0.15, 0]
  if ('ei'.includes(ch)) return [0.38, 0.9, 0]
  if ('y'.includes(ch)) return [0.3, 0.7, 0]
  if ('o'.includes(ch)) return [0.55, 0, 0.9]
  if ('uwq'.includes(ch)) return [0.2, 0, 1]
  if ('mbp'.includes(ch)) return [0, 0, 0]
  if ('fv'.includes(ch)) return [0.1, 0.35, 0]
  if ('lnt dszckgjrhx'.includes(ch) && ch !== ' ') return [0.25, 0.3, 0]
  return null // a space or a mark: the mouth rests
}
export const LINE_MS = 62 // one letter's time, near the voice clips' pace
// mouth at time t (ms) into a line: eased between this letter and the next; null once the line is spoken
export function mouthAt(text, t) {
  const s = String(text ?? '').toLowerCase(), n = s.length
  if (!n || t < 0) return null
  const fi = t / LINE_MS
  if (fi >= n) return null
  const i = Math.floor(fi), u = fi - i, a = VIS(s[i]) ?? [0, 0, 0], b = VIS(s[i + 1] ?? ' ') ?? [0, 0, 0], k = u * u * (3 - 2 * u)
  const pause = /[.,!?;:]/.test(s[i]) ? 0 : 1
  return [0, 1, 2].map((j) => (a[j] + (b[j] - a[j]) * k) * pause)
}
export function humanFace(expr, blink, mouth) {
  const f = {}, src = !expr || expr === 'neutral' || expr === 'resting' ? {} : (M.faces[expr] || {})
  for (const [k, v] of Object.entries(src)) { const t = X_MAP[k]; if (t) f[t[0]] = Math.min(1, (f[t[0]] ?? 0) + v * t[1]) }
  if (blink) f.X_Blink = 1
  if (mouth) { f.X_Open = Math.min(1, (f.X_Open ?? 0) * 0.3 + mouth[0]); f.X_Wide = mouth[1]; f.X_Round = mouth[2]; if (f.X_Smile) f.X_Smile *= 0.6 }
  for (const k of X_KEYS) f[k] = Math.round((f[k] ?? 0) * 100) / 100
  return f
}

// ---- the new cat (Shelly Nov 11: "replace these demo cats as our new cat model"): every furry cat wears the Tripo cat of scripts/lib/cat-wardrobe.js,
// its face painted in its skin shader, eye colour, hair and head tufts as skinned children. Other species keep the old body for now.
const CAT_FACE = { neutral: 'neutral', smile: 'smile', happy: 'smile', catmouth: 'smile', smug: 'smile', shy: 'smile', love: 'smile', beam: 'joy', joy: 'joy', laugh: 'joy', sad: 'sad', cry: 'sad', nervous: 'sad', angry: 'angry', mad: 'angry', shock: 'shock', surprised: 'shock', scared: 'shock', flustered: 'shock', blink: 'blink', sleep: 'blink', blep: 'blep', tongue: 'blep', hit: 'hit', hurt: 'hit', ko: 'ko', dizzy: 'ko' }
const CAT_KIDS = ['topw', 'botw', 'shoes', 'hat', 'mask', 'hair', ...Object.keys(CW.fluff || {}).map((k) => 'fluff-' + k), 'fluff-ruff', 'fluff-mane'].map((k) => 'cw-' + k)
const colourOk = (c) => typeof c === 'string' && (EYE_COLORS[c] || /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c))
const hashPick = (str, arr) => arr[[...String(str)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % arr.length]
export const isNewCat = (l) => !HUMAN && MESH && speciesOf(l) === 'cat'
export function catLook(l) {
  const sex = l?.sex === 'f' ? 'f' : 'm', o = {}
  for (const k of ['fur', 'topw', 'botw', 'shoes', 'hat', 'top', 'bottom', 'shoec', 'hatc', 'topp', 'hairc', 'fluffc', 'inner']) if (l?.[k] != null && l[k] !== '') o[k] = l[k]
  o.fur = o.fur || '#f2a65a'   // orange cat by default (Shelly: cat back orange, not cream)
  o.expression = CAT_FACE[l?.expression ?? l?.expr] ?? 'neutral'
  // eyes: the look's own colour, else one per cat picked from its fur and name so a crowd isn't one colour
  o.eyes = colourOk(l?.eyes) ? l.eyes : colourOk(l?.eye) ? l.eye : hashPick(`${l?.fur}|${l?.sex}|${l?.top}|${l?.fseed ?? ''}`, ['amber', 'green', 'blue', 'gold', 'hazel', 'teal', 'brown', 'grey'])
  const hairs = Object.keys(CW.hair || {}).filter((k) => CW.hair[k][sex])
  o.hair = CW.hair?.[l?.hair]?.[sex] ? l.hair : l?.hair === 'none' ? null : hashPick(`${l?.fur}|${l?.top}|${l?.fseed ?? ''}|hair`, hairs)
  if (!o.hairc && l?.hairc == null) o.hairc = hashPick(`${l?.fur}|hc`, ['#3a2a22', '#6b4a35', '#1e1a1c', '#a8683a', '#c9a066', '#7a2e2a'])
  o.snout = SNOUTS.includes(l?.snout) ? l.snout : hashPick(`${l?.fur}|${l?.fseed ?? ''}|sn`, ['button', 'button', 'long', 'pointy', 'flat', 'puff'])
  o.ears = EARS.includes(l?.ears) ? l.ears : hashPick(`${l?.top}|${l?.fseed ?? ''}|ear`, ['upright', 'upright', 'tall', 'small', 'fold', 'wide'])
  o.tail = TAILS.includes(l?.tail) ? l.tail : hashPick(`${l?.fur}|${l?.fseed ?? ''}|tl`, ['classic', 'classic', 'fluffy', 'bob', 'puff', 'whip', 'curl'])
  o.fluff = Array.isArray(l?.fluff) ? l.fluff : l?.fluff ? [l.fluff] : ['cheeks']
  if (l?.chest != null) o.chest = l.chest; else if (sex === 'f' && Number(l?.bustS)) o.chest = Math.max(0, Math.min(1, 0.5 * Number(l.bustS)))
  if (!o.hair) delete o.hair
  return o
}
export const catSex = (l) => (l?.sex === 'f' ? 'f' : 'm')
export function seatCat(ctx, obj, l) {
  const sex = catSex(l), cl = catLook(l)
  for (const k of [HEAD_ID, MASK_ID, HAIR_ID, BEARD_ID, INNER_ID, ...WARDROBE.parts.map(wardKey)]) if (ctx.getObject(obj.id + '/' + k)) { try { ctx.destroy(obj.id + '/' + k) } catch (e) { return } }
  const want = catChildren(sex, cl), ids = new Set(want.map((c) => c.id))
  for (const k of CAT_KIDS) if (!ids.has(k) && ctx.getObject(obj.id + '/' + k)) { try { ctx.destroy(obj.id + '/' + k) } catch (e) {} }
  for (const c of want) {
    const cur = ctx.getObject(obj.id + '/' + c.id)
    if (!cur) ctx.spawn(c.id, { parent: obj.id, ...c, ...(obj.audience === 'local' ? { audience: 'local' } : {}) })
    else { if (JSON.stringify(cur.model) !== JSON.stringify(c.model)) cur.model = c.model; if (c.morph) cur.morph = c.morph }
  }
  obj.morph = catMorph(cl); obj.jiggle = null
  if (obj.material?.outline) obj.material = null
}
export const catBodyIds = () => [CAT_BODY.f.glb, CAT_BODY.m.glb]
