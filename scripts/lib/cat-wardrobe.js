// The new Tripo cat's wardrobe (data: ./data/cat-wardrobe.yml; shader: scripts/mat-catskin.js). Painted garments are numbers handed to her skin shader;
// modelled garments (Tripo) ride as skinned children with their region painted underneath. Only the new cat bodies use this: the old critter is untouched.
import W from './data/cat-wardrobe.yml'
import { PRINTS } from '../mat-cloth.js'

export const CAT_BODY = {
  f: { glb: '/cdn/value.5ba02799468db7d53fffc4a925d9db6bb83760ea689b7ece74ccd6fde2156fb8.glb', fur: '/cdn/value.3ce61cc31af3653d9deca9d9cefea396f4ac766d1537a49929f4cc4c2e0555e6.jpg' },
  m: { glb: '/cdn/value.7606ffcca56fc1f32d119b6a33e971815484828d31d47618ee3c5948f82f2512.glb', fur: '/cdn/value.5472766cadb1e6c8a2df08d70c3f04fd7eaf37f99b3ef53dbcfe9bb5268bc831.jpg' }
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
    o.tuckT = W.models[l.topw] ? 0.014 : 0; o.tuckB = W.models[l.botw] ? 0.01 : 0; o.tuckS = W.models[l.shoes] ? 0.006 : 0 }
  { const pr = printOf(sex, { ...W.defaults[sex], ...(look || {}) }); if (pr && !W.models[(look || {}).topw ?? W.defaults[sex].topw] && PRINTS[pr.pat]) { o.tprint = PRINTS[pr.pat].tex; o.tpx = pr.pax; o.tpy = pr.pay; o.tps = pr.psz } }
  if (p.sock) { o.sock = 1; o.sHi = lerp(B.leg[2], B.leg[1], p.sock.top); put(o, 'sock', p.sock.c) }
  return o
}
// the whole model spec: her body with the painted skin on both fur slots (fur takes the tint, fur2 is her pale belly/markings and stays as drawn)
export function catModel(sex, look) {
  const params = skinParams(sex, look), skin = (color) => ({ kind: 'scripted', script: 'scripts/mat-catskin.js', color, params })
  return { id: CAT_BODY[sex].glb, forward: '+z', materials: { fur: skin(look?.fur || '#f3c98a'), fur2: skin('#ffffff') }, parts: { ClothTop: { visible: false }, ClothBottom: { visible: false } }}
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
