// The new Tripo cat's wardrobe (data: ./data/cat-wardrobe.yml; shader: scripts/mat-catskin.js). Painted garments are numbers handed to her skin shader;
// modelled garments (Tripo) ride as skinned children with their region painted underneath. Only the new cat bodies use this: the old critter is untouched.
import W from './data/cat-wardrobe.yml'

export const CAT_BODY = {
  f: { glb: '/cdn/value.3a10f08d726b4eb7394d4f9b804aacb30aa89e54ab867902bd7745f4b8c0fade.glb', fur: '/cdn/value.c9376f77f51be01685a58553b263a2e6029c1b410e28d34af5f7407ff1b046a1.jpg' },
  m: { glb: '/cdn/value.f2294d84171272f958b2929dd524e9d7c3b2591b2b55af6713c69d2c63804dcb.glb', fur: '/cdn/value.2ccdfb3b2fa47cd873034378e509d9d85791cdbdf47c8029af2b639f403aaeb7.jpg' }
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
  if (p.sock) { o.sock = 1; o.sHi = lerp(B.leg[2], B.leg[1], p.sock.top); put(o, 'sock', p.sock.c) }
  return o
}
// the whole model spec: her body with the painted skin on both fur slots (fur takes the tint, fur2 is her pale belly/markings and stays as drawn)
export function catModel(sex, look) {
  const params = skinParams(sex, look), skin = (color) => ({ kind: 'scripted', script: 'scripts/mat-catskin.js', color, params })
  return { id: CAT_BODY[sex].glb, forward: '+z', materials: { fur: skin(look?.fur || '#f3c98a'), fur2: skin('#ffffff') }, parts: { ClothTop: { visible: false }, ClothBottom: { visible: false } } }
}
// the Tripo garments a look wears, as skinned children of the cat
export function catChildren(sex, look) {
  const l = { ...W.defaults[sex], ...(look || {}) }, out = []
  for (const [slot, ck] of [['topw', 'top'], ['botw', 'bottom'], ['shoes', 'shoec'], ['hat', 'hatc']]) {
    const g = W.models[l[slot]]; if (!g?.[sex]) continue
    out.push({ id: 'cw-' + slot, attachment: { skin: true }, model: { id: g[sex], forward: '+z', ...(g.tint === false ? {} : { materials: { cloth: { kind: 'scripted', script: 'scripts/mat-cloth.js', color: l[ck] || '#ffffff', params: { pat: g.pat || 'weave' } } } }) } })
  }
  return out
}
