// The new Tripo cat's wardrobe (data: ./data/cat-wardrobe.yml; shader: scripts/mat-catskin.js). Painted garments are numbers handed to her skin shader;
// modelled garments (Tripo) ride as skinned children with their region painted underneath. Only the new cat bodies use this: the old critter is untouched.
import W from './data/cat-wardrobe.yml'
import FACES from './data/critter-faces.yml'
import { PRINTS } from '../mat-cloth.js'

export const CAT_BODY = {
  f: { glb: '/cdn/value.4187fbc61c1a2aeb1636c6e6a3bc7b06f08afad41c681ca7070c5f801b9fe46b.glb', fur: '/cdn/value.eb86c240c4daf27effe00523a7f1f216e7239f8eca99359e5a04fcf67c289a6f.jpg' },
  m: { glb: '/cdn/value.a598a799e09636a3c6829bc2e4da01a1a6cfe2fb630e1ce82ddd0de080dbeea8.glb', fur: '/cdn/value.a400e6f824bf75d1c5dfafb1cadbe30c177543404d39b9c350d4feadc8dfd313.jpg' }
}
const rgb = (hex, lin = true) => { const n = parseInt(String(hex || '#ffffff').replace('#', '').slice(0, 6).padEnd(6, 'f'), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return lin ? (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)) : s }) }
const lerp = (a, b, t) => a + (b - a) * t
const put = (o, name, hex) => { const [r, g, b] = rgb(hex); o[name + 'R'] = +r.toFixed(4); o[name + 'G'] = +g.toFixed(4); o[name + 'B'] = +b.toFixed(4) }
const armAt = (B, s) => s <= 0 ? B.arm[0] + 0.012 : s <= 1 ? lerp(B.arm[0], B.arm[1], s) : lerp(B.arm[1], B.arm[2], s - 1)
const legAt = (B, l) => l <= 1 ? lerp(B.leg[0], B.leg[1], l) : lerp(B.leg[1], B.leg[2], l - 1)

// the painted layers a look asks for, modelled garments folded to the layer drawn under them
export function paintOf(sex, look) {
  const l = { ...W.defaults[sex], ...(look || {}) }, out = { top: null, bot: null, sock: null }
  const tm = W.models[l.topw], bm = W.models[l.botw], sm = W.models[l.shoes]
  const tk = tm ? tm.under : l.topw, bk = bm ? bm.under : l.botw
  if (tk && W.tops[tk]) out.top = { ...W.tops[tk], c: l.top, trim: l.trim }
  if (bk && W.bottoms[bk]) out.bot = { ...W.bottoms[bk], c: l.bottom }
  if (l.shoes === 'socks' || sm?.under === 'socks') out.sock = { ...W.feet.socks, c: sm ? l.shoec : (l.shoec || '#f4f1ea') }
  return out
}
// the shader params for one body
export function skinParams(sex, look) {
  const B = W.body[sex], p = paintOf(sex, look), o = { fur: CAT_BODY[sex].fur, top: 0, bot: 0, sock: 0, frontZ: B.front, tailR: B.tailR }
  B.tail.forEach((t, i) => { o['t' + i + 'x'] = t[0]; o['t' + i + 'y'] = t[1]; o['t' + i + 'z'] = t[2] })
  o.tLo = B.top[0]; o.tHi = B.top[1]; o.tSl = armAt(B, 0.42); o.nW = B.neck[0]; o.nF = B.neck[1]; o.nB = B.neck[2]; o.bLo = B.leg[1]; o.bHi = B.waist; o.sHi = 0
  o.tpat = 'weave'; o.bpat = 'weave'
  for (const n of ['top', 'bot', 'sock', 'trim']) put(o, n, '#ffffff')
  if (p.top) { const t = p.top; o.top = 1; o.tLo = lerp(B.top[0], B.top[1], t.hem); o.tSl = armAt(B, t.sleeve); o.nF = B.neck[1] * t.scoop; o.nB = B.neck[2] * Math.min(t.scoop, 1.1); o.tpat = t.pat; put(o, 'top', t.c); if (t.band) { o.tband = 1; put(o, 'trim', t.trim || '#d98a9a') } }
  if (p.bot) { const b = p.bot; o.bot = 1; o.bLo = legAt(B, b.leg); o.bHi = B.waist + b.rise; o.bpat = b.pat; put(o, 'bot', b.c) }
  { const l = { ...W.defaults[sex], ...(look || {}) }   // modelled garments tuck the skin under them
    if (W.models[l.topw]?.[sex]) {
      o.tSl = B.arm[2] - 0.024
      o.tHi += sex === 'm' ? 0.018 : 0.012
      o.tuckT = 0.023
      o.tShoulder = 1
      if (l.topw === 'hoodie') o.tLo = sex === 'm' ? 0.462 : 0.428
    }
    o.tuckB = W.models[l.botw]?.[sex] ? 0.014 : 0
    if (l.botw === 'skirt' && W.models.skirt[sex]) o.bHi = B.waist + 0.012
    o.tuckS = W.models[l.shoes]?.[sex] ? 0.011 : 0
  }
  { const pr = printOf(sex, { ...W.defaults[sex], ...(look || {}) }); if (pr && !W.models[(look || {}).topw ?? W.defaults[sex].topw] && PRINTS[pr.pat]) { o.tprint = PRINTS[pr.pat].tex; o.tpx = pr.pax; o.tpy = pr.pay; o.tps = pr.psz } }
  if (p.sock) { o.sock = 1; o.sHi = lerp(B.leg[2], B.leg[1], p.sock.top); put(o, 'sock', p.sock.c) }
  return o
}
// the whole model spec: her body with the painted skin on both fur slots (fur takes the tint, fur2 is her pale belly/markings and stays as drawn)
export function catModel(sex, look) {
  const params = skinParams(sex, look)
  const fur = look?.fur || '#f3c98a'
  const faces = FACES.faces[sex === 'm' ? 'male' : 'female']
  const expression = faces[look?.expression]
  const face = typeof expression === 'string' ? expression : faces.neutral
  const projection = sex === 'm' ? [2.9946, -2.163, -0.011] : [2.9946, -2.0648, 0.055]
  const skin = (color) => ({ kind: 'scripted', script: 'scripts/mat-catskin.js', color, params })
  return {
    id: CAT_BODY[sex].glb, forward: '+z',
    materials: {
      fur: skin(fur), fur2: skin('#ffffff'),
      headFur: {
        kind: 'scripted', script: 'scripts/mat-catskin.js', color: fur,
        params: { face, faceVScale: projection[0], faceVBias: projection[1], faceNear: projection[2] }
      },
      innerEar: { color: look?.inner || '#d58e8a', roughness: 0.74 }
    }
  }
}
// the Chest slider 0..1 (look.chest), the body's Chest key; a top's cloth carries the same key so it swells with her
export const chestOf = (look) => ({ Chest: Math.max(0, Math.min(1, +(look?.chest ?? 0.5))) })
// the Tripo garments a look wears, as skinned children of the cat
export function catChildren(sex, look) {
  const l = { ...W.defaults[sex], ...(look || {}) }, out = []
  for (const [slot, ck] of [['topw', 'top'], ['botw', 'bottom'], ['shoes', 'shoec'], ['hat', 'hatc']]) {
    const g = W.models[l[slot]]; if (!g?.[sex]) continue
    out.push({ id: 'cw-' + slot, attachment: { skin: true }, model: { id: g[sex], forward: '+z', ...(g.tint === false ? {} : { materials: { cloth: { kind: 'scripted', script: 'scripts/mat-cloth.js', color: l[ck] || '#ffffff', params: (slot === 'topw' && printOf(sex, l)) || { pat: g.pat || 'weave' } } } }) }, ...(slot === 'topw' ? { morph: chestOf(look) } : {}) })
  }
  const fl = Array.isArray(look?.fluff) ? look.fluff : look?.fluff ? [look.fluff] : []   // fluff types: soft fur clumps in her own fur colour, a touch lighter
  for (const k of fl) { const g = W.fluff?.[k]?.[sex]; if (g) out.push({ id: 'cw-fluff-' + k, attachment: { skin: true }, model: { id: g, forward: '+z', materials: { fluff: { kind: 'scripted', script: 'scripts/mat-catskin.js', color: l.fluffc || look?.fur || '#f3c98a', params: { ...skinParams(sex, look), top: 0, bot: 0, sock: 0 } } } } }) }
  const mk = W.masks?.[l.hat]?.[sex]   // a Thrift Mode mask: skinned to her head bone, its own paint
  if (mk) out.push({ id: 'cw-mask', attachment: { skin: true }, model: { id: mk, forward: '+z' } })
  return out
}
// a Thrift Mode print on her top (look.topp): the cloth shader's params for this body, or null
export function printOf(sex, look) {
  const k = look?.topp; if (!k || !PRINTS[k]) return null
  const R = W.prints[sex], b = W.prints.badge[k], c = R.chest
  return { pat: k, pfz: 1, pz0: W.body[sex].front, pax: c[0] + (b ? b[0] : 0), pay: c[1] + (b ? b[1] : 0), psz: c[2] * (b ? b[2] : 1), pmx: R.arm[0], pmy: R.arm[1] }
}
