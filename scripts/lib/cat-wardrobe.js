// The new Tripo cat's wardrobe (data: ./data/cat-wardrobe.yml; shader: scripts/mat-catskin.js). Painted garments are numbers handed to her skin shader;
// modelled garments (Tripo) ride as skinned children with their region painted underneath. Only the new cat bodies use this: the old critter is untouched.
import W from './data/cat-wardrobe.yml'
import FACES from './data/critter-faces.yml'
import { PRINTS } from '../mat-cloth.js'

export const CAT_BODY = {
  f: { glb: '/cdn/value.e8e63dfafb7285f7362bb87c7e685d38fda0180e9f00f711ec56436ff43fa0c4.glb', fur: '/cdn/value.1c4f4402e22ebd41f1cca9b45fc42ef2bec051041b40c8a3c40b88028a23ca58.jpg' },
  m: { glb: '/cdn/value.a935fee298a38e28d69d6472997a747507062f2507ac308f0db98fa42efa1dd3.glb', fur: '/cdn/value.58ce243610699df44f4552ccfdfc667580c63c99f28103ecf2d1dd72c94657fe.jpg' }
}
// Nov 12 lock-in (Shelly 'yea thats good'): CAT_BODY is the reshaped base (art/cat-wardrobe/rebase.py): female fuller PG chest, male wider shoulders and thicker neck. CAT_OLD: the bases before it
export const CAT_OLD = { f: '/cdn/value.562ce0246eae9362d0d784854f5dff319bcc254c755c854e1be2c450ae9540c9.glb', m: '/cdn/value.3208bf922d1aff4faeefffab9867f3d2363af1dab60a37cc50860602d207c545.glb' }
export const CAT_BODY2 = { f: CAT_BODY.f.glb, m: CAT_BODY.m.glb }
const rgb = (hex, lin = true) => { const n = parseInt(String(hex || '#ffffff').replace('#', '').slice(0, 6).padEnd(6, 'f'), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const s = v / 255; return lin ? (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)) : s }) }
const lerp = (a, b, t) => a + (b - a) * t
const put = (o, name, hex) => { const [r, g, b] = rgb(hex); o[name + 'R'] = +r.toFixed(4); o[name + 'G'] = +g.toFixed(4); o[name + 'B'] = +b.toFixed(4) }
const armAt = (B, s) => s <= 0 ? B.arm[0] + 0.012 : s <= 1 ? lerp(B.arm[0], B.arm[1], s) : lerp(B.arm[1], B.arm[2], s - 1)
const legAt = (B, l) => l <= 1 ? lerp(B.leg[0], B.leg[1], l) : lerp(B.leg[1], B.leg[2], l - 1)

// a look with the default outfit filled in wherever a top or bottom is unpicked or 'none' (Shelly: "wheres the default outfit when theyre not wearing any apparel")
// a game garment (clothes.yml row id, from loot or an NPC roll) read as its cat piece (cat-wardrobe.yml from:)
const fromGame = (look) => { if (!look || !W.from) return look; const l = { ...look }
  for (const slot of ['topw', 'botw', 'shoes', 'hat', 'neck', 'eyew']) { const k = l[slot], m = W.from[slot]; if (k && k !== 'none' && m?.[k] && m[k] !== k) l[slot] = m[k] }
  if (!l.topp && W.from.topp?.[look.topw]) l.topp = W.from.topp[look.topw]
  return l }
const dressed = (sex, look) => { const l = { ...W.defaults[sex], ...(fromGame(look) || {}) }; for (const [k, c] of [['topw', 'top'], ['botw', 'bottom']]) if (!l[k] || l[k] === 'none' || !(W.models[l[k]] || (k === 'topw' ? W.tops : W.bottoms)[l[k]])) { l[k] = W.defaults[sex][k]; l[c] = W.defaults[sex][c] } return l }
// the painted layers a look asks for, modelled garments folded to the layer drawn under them
export function paintOf(sex, look) {
  const l = dressed(sex, look), out = { top: null, bot: null, sock: null }
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
  if (p.top) { const t = p.top; o.top = 1; o.tLo = lerp(B.top[0], B.top[1], t.hem); o.tSl = armAt(B, t.sleeve); o.nF = B.neck[1] * t.scoop; o.nB = B.neck[2] * Math.min(t.scoop, 1.1); o.tpat = t.pat; put(o, 'top', t.c); if (t.sleeve >= 0.15) { o.tShoulder = 1; o.tShIn = 0.02; o.tShTop = 0.05 } if (t.band) { o.tband = 1; put(o, 'trim', t.trim || '#d98a9a') } }
  if (p.bot) { const b = p.bot; o.bot = 1; o.bLo = legAt(B, b.leg); o.bHi = B.waist + b.rise; o.bpat = b.pat; put(o, 'bot', b.c) }
  { const l = dressed(sex, look)   // modelled garments tuck the skin under them
    if (W.models[l.topw]?.[sex]) {
      o.tSl = B.arm[2] - 0.024
      o.tHi += sex === 'm' ? 0.018 : 0.012
      o.tuckT = 0.04   // Nov 12 Shelly "see through thing on the sleeves": the arm fur poked through the modelled sleeve mid-stride
      o.tShoulder = 1
      if (l.topw === 'hoodie') o.tLo = sex === 'm' ? 0.462 : 0.428
    }
    o.tuckB = W.models[l.botw]?.[sex] ? 0.014 : 0
    if (l.botw === 'skirt' && W.models.skirt[sex]) o.bHi = B.waist + 0.012
    o.tuckS = W.models[l.shoes]?.[sex] ? 0.011 : 0
  }
  { const pr = printOf(sex, dressed(sex, look)); if (pr && !W.models[(look || {}).topw ?? W.defaults[sex].topw] && PRINTS[pr.pat]) { o.tprint = PRINTS[pr.pat].tex; o.tpx = pr.pax; o.tpy = pr.pay; o.tps = pr.psz } }
  if (p.sock) { o.sock = 1; o.sHi = lerp(B.leg[2], B.leg[1], p.sock.top); put(o, 'sock', p.sock.c) }
  return o
}
// look.eyes: any '#rrggbb' or a named colour from EYE_COLORS; amber when unset
export const EYE_COLORS = { amber: '#e0a020', green: '#2fbf5a', blue: '#3a8cf0', teal: '#1fbfb0', violet: '#9a5af0', pink: '#f06aa8', red: '#e03838', gold: '#f0d040', hazel: '#a8803a', brown: '#7a4a26', grey: '#9aa6b4', ice: '#9ae0ff' }
function eyeRGB(e) {
  const hex = (EYE_COLORS[e] || e || EYE_COLORS.amber).replace('#', '')
  const n = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16)
  const lin = (c) => Math.pow(c / 255, 2.2)
  return { eyeR: lin((n >> 16) & 255), eyeG: lin((n >> 8) & 255), eyeB: lin(n & 255) }
}
// look.shadow: eyeshadow, '#rrggbb' or a name from SHADOWS; none when unset
export const SHADOWS = { none: '', pink: '#f07aa8', plum: '#9a4aa8', lilac: '#b494e8', peach: '#f0a070', gold: '#e8c050', teal: '#3ab4b0', smoky: '#4a4048', red: '#d04040' }
function shadowRGB(s) {
  const hex = (SHADOWS[s] ?? s ?? '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return {}
  const n = parseInt(hex, 16), lin = (c) => Math.pow(c / 255, 2.2)
  return { shR: lin((n >> 16) & 255), shG: lin((n >> 8) & 255), shB: lin(n & 255), shA: 0.85 }
}
// the whole model spec: her body with the painted skin on both fur slots (fur takes the tint, fur2 is her pale belly/markings and stays as drawn)
// a living face (Nov 12): which pictures the shader blinks and talks with. Closed-eye moods never blink; KO never talks.
const SHUT = ['joy', 'blink', 'ko', 'hit']
export function faceLife(sk, look, face, faces) {
  const mood = look?.expression ?? look?.expr ?? 'neutral'
  const seed = [...JSON.stringify([look?.fur, look?.hair, look?.eyes, look?.fseed])].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000 / 1000
  const out = { bSeed: seed, talk: look?.talk ? 1 : 0 }
  if (!SHUT.includes(mood)) out.blinkFace = faces.blink
  if (mood !== 'ko') { out.talkFace = faces.joy; out.talkFace2 = faces.shock }
  return out
}
export function catModel(sex, look) {
  const params = skinParams(sex, look)
  const fur = look?.fur || '#f3c98a'
  const faces = FACES.faces[sex === 'm' ? 'male' : 'female']
  const expression = faces[look?.expression] ?? faces[look?.expr] // a mood swap writes expression; the creator's resting pick is expr
  const calm = typeof expression !== 'string' || expression === faces.neutral
  const sk = sex === 'm' ? 'male' : 'female'
  // an eye type redraws the calm face; a mouth type lays its layer on it. a mood face keeps its own painted eyes and mouth
  const crew = look?.etype === 'crew' // Remodeling Co. (Shelly #243870): faceless, the two white eyes in every mood
  const face = crew ? FACES.eyes[sk].crew : calm ? (FACES.eyes?.[sk]?.[look?.etype] ?? faces.neutral) : expression
  const mouth = calm && !crew ? FACES.mouths?.[sk]?.[look?.mtype] : undefined
  const projection = sex === 'm' ? [2.9946, -2.118, -0.011] : [2.9946, -2.0198, 0.055]   // Nov 11 (Shelly 'fix eye placement and double noses'): picture 4.5% lower so its eyes sit in the sculpted sockets and its nose on the mesh nose
  const skin = (color) => ({ kind: 'scripted', script: 'scripts/mat-catskin.js', color, params })
  return {
    id: CAT_BODY[sex].glb, forward: '+z',
    materials: {
      fur: skin(fur), fur2: skin('#ffffff'),
      headFur: {
        kind: 'scripted', script: 'scripts/mat-catskin.js', color: fur,
        params: { face, ...(mouth ? { mouth } : {}), ...faceLife(sk, look, face, faces), ...(crew ? { faceless: 1 } : {}), faceVScale: projection[0], faceVBias: projection[1], faceNear: projection[2], ...(sex === 'm' ? { noseCutV: 0.40, noseY: 0.855, noseZ: 0.315, noseS: 1.2 } : { noseCutV: 0.39, noseY: 0.797, noseZ: 0.249, noseS: 1 }), ...eyeRGB(look?.eyes), ...shadowRGB(look?.shadow) }
      },
      innerEar: { color: look?.inner || '#d58e8a', roughness: 0.74 }
    }
  }
}
// the Chest slider 0..1 (look.chest), the body's Chest key; a top's cloth carries the same key so it swells with her
// the Chest key is a sculpted bust (art/cat-wardrobe/bust.py, Shelly 'bust isnt there'): slider 0 → a hint, 1 → full; garments carry the same key and follow
export const chestOf = (look) => { const c = Math.max(0, Math.min(1, +(look?.chest ?? 0.5))); return { Chest: +(0.15 + c * 0.85).toFixed(3) } }
// snout and ear types (Shelly Nov 11): shape keys on the head (art/cat-wardrobe/head-keys.py and style_fit.py). look.snout: button (default) | long | pointy | flat | puff; look.ears: upright (default) | tall | small | fold | wide
export const SNOUTS = ['button', 'long', 'pointy', 'flat', 'puff'], EARS = ['upright', 'tall', 'small', 'fold', 'wide'], TAILS = ['classic', 'fluffy', 'bob', 'puff', 'whip', 'curl'] // look.tail (Shelly 'new tail types too'): Tail_* keys on the body
const SNOUT_KEY = { long: 'Snout_Long', pointy: 'Snout_Pointy', flat: 'Snout_Flat', puff: 'Snout_Puff' }, EAR_KEY = { tall: 'Ear_Tall', small: 'Ear_Small', fold: 'Ear_Fold', wide: 'Ear_Wide' }
// how far each snout key goes: pointy at full read as a beak (Shelly #218xxx 'too silly'), long reined in with it
const TAIL_KEY = { fluffy: 'Tail_Fluffy', bob: 'Tail_Bob', puff: 'Tail_Puff', whip: 'Tail_Whip', curl: 'Tail_Curl' }
const SNOUT_AMT = { pointy: 0.4, long: 0.6, flat: 1, puff: 1 }
const EAR_HIDE = 1
export function catMorph(look) {
  const m = chestOf(look)
  for (const k of Object.values(SNOUT_KEY)) m[k] = 0
  for (const k of Object.values(EAR_KEY)) m[k] = 0
  m.Ear_Hide = 0
  if (SNOUT_KEY[look?.snout]) m[SNOUT_KEY[look.snout]] = SNOUT_AMT[look.snout] ?? 1
  if (W.ears) m.Ear_Hide = EAR_HIDE   // the sculpted ear (catChildren) stands over the head's own, pressed flat under it (Ear_Hide: art/cat-wardrobe/ears.py body)
  else if (EAR_KEY[look?.ears]) m[EAR_KEY[look.ears]] = 1
  for (const k of Object.values(TAIL_KEY)) m[k] = 0
  if (TAIL_KEY[look?.tail]) m[TAIL_KEY[look.tail]] = 1
  const hk = fromGame(look)?.hat
  m.Hatted = W.models?.[hk]?.hat ? 1 : 0
  if (W.covers?.includes(hk)) m.Ear_Hide = 1   // a helmet or beanie closes over the ears: the head's own fold flat (the sculpted pair stays off, catChildren)   // hair presses flat to the skull under a fitted hat (art/cat-wardrobe/hair-hatted.py; Shelly's ruling: hair close, flat under hats)
  return m
}
// the Tripo garments a look wears, as skinned children of the cat
export function catChildren(sex, look) {
  const l = dressed(sex, look), out = []
  for (const [slot, ck] of [['topw', 'top'], ['botw', 'bottom'], ['shoes', 'shoec'], ['hat', 'hatc'], ['neck', 'neckc'], ['eyew', 'eyewc']]) {
    const g = W.models[l[slot]]; if (!g?.[sex]) continue
    const gv = g.vars?.length ? [g, ...g.vars][(l[slot + 'Var'] ?? [...String(l[ck] ?? l.fseed ?? '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)) % (g.vars.length + 1)] : g   // Nov 12: a Tripo piece with baked colour wears one of its recoloured variants, picked by its colour pick (or <slot>Var)
    out.push({ id: 'cw-' + slot, attachment: { skin: true }, model: { id: gv[sex] ?? g[sex], forward: '+z', ...(g.tint === false ? {} : { materials: { cloth: { kind: 'scripted', script: 'scripts/mat-cloth.js', color: l[ck] || '#ffffff', params: (slot === 'topw' && printOf(sex, l)) || { pat: g.pat || 'weave' } } } }) }, ...(slot === 'topw' ? { morph: chestOf(look) } : {}) })
  }
  const fl = Array.isArray(look?.fluff) ? look.fluff : look?.fluff ? [look.fluff] : []
  const hairOn = !!(look?.hair && W.hair?.[look.hair])
  for (const k of fl) {
    const g = W.fluff?.[k]?.[sex]
    if (!g) continue
    if (hairOn && (k === 'bangs' || k === 'crest' || k === 'cowlick')) continue   // crown/fringe fur sits where a hairstyle sits: it pierced the hair and hung over the eyes (Shelly Nov 11 'faces forming into the other model')
    const morph = catMorph(look)   // the locks carry the body's keys (fluff-keys.py), so they ride the snout and ears instead of being pierced
    out.push({
      id: 'cw-fluff-' + k, attachment: { skin: true },
      ...(morph ? { morph } : {}),
      model: {
        id: g, forward: '+z',
        materials: { fluff: {
          kind: 'scripted', script: 'scripts/mat-catskin.js', color: l.fluffc || look?.fur || '#f3c98a',
          params: { ...skinParams(sex, look), fur: '', top: 0, bot: 0, sock: 0 }
        } }
      }
    })
  }
  const ep = { ...skinParams(sex, look), fur: '', top: 0, bot: 0, sock: 0 }   // the fluff's own fur shader, plain: these ears carry no body UVs
  const ears = (part) => ({ color: part === 'fur' ? (look?.fur || '#f3c98a') : part === 'inner' ? '#f4a3c4' : (l.fluffc || look?.fur || '#fff4e6'), roughness: part === 'inner' ? 0.7 : 0.9 })   // plain tint on the white glb's named slots (every variant exports earFur/earInner/earTuft)
  const eg = W.covers?.includes(fromGame(look)?.hat) ? null : W.ears?.[EARS.includes(look?.ears) ? look.ears : 'upright']?.[sex]   // sculpted ears (art/cat-wardrobe/ears.py): fur outside, pink bowl, cream tuft
  if (eg) out.push({ id: 'cw-ears', attachment: { skin: true }, model: { id: eg, forward: '+z', materials: {
    earFur: ears('fur'), earInner: ears('inner'), earTuft: ears('tuft') } } })
  const hk = look?.hair, hg = hk && (W.hair?.[hk]?.[sex] || Object.values(W.hair?.[hk] || {})[0])   // a hairstyle: one key, tinted its own colour
  if (hg) out.push({ id: 'cw-hair', attachment: { skin: true }, model: { id: hg, forward: '+z', materials: { hair: { kind: 'scripted', script: 'scripts/mat-hair.js', color: look?.hairc || '#6b4a35', params: { crown: sex === 'm' ? 1.62 : 1.55 } } } }, morph: catMorph(look) })   // hair carries the body's snout/ear keys (fluff-keys.py) so the face never pokes through
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

// a living face for every cat that isn't run by critter.js (Fort residents, M.E.G. agents, shopkeepers…): Nov 12 'expressions, talking, and animated faces'.
// Reads the body's own state four times a second and rewrites the head's face picture only when the mood or talking changes.
export function liveFace(ctx) {
  const o = ctx.self, ses = o.session, now = ctx.now()
  if (now < (ses.lfNext ?? 0)) return
  ses.lfNext = now + 250
  const m = o.model, hf = m?.materials?.headFur
  if (!hf?.params?.face) return
  if (!ses.lfRest) {   // the face it was dressed with is its resting face
    ses.lfRest = hf.params.face
    ses.lfSex = Object.values(FACES.faces.male).includes(hf.params.face) || Object.values(FACES.eyes?.male ?? {}).includes(hf.params.face) ? 'male' : 'female'
  }
  const faces = FACES.faces[ses.lfSex], s = o.state ?? {}, hp = s.hp ?? 100
  if (ses.lfHp != null && hp < ses.lfHp - 0.5) ses.lfHurt = now + 1600
  ses.lfHp = hp
  let mood = 'rest'
  if (s.dead || s.down || hp <= 0) mood = 'ko'
  else if (now < (ses.lfHurt ?? 0)) mood = 'hit'
  else if (s.hostile || s.angry === true || (s.angry && typeof s.angry === 'object' && Object.keys(s.angry).length)) mood = 'angry'   // angry is a book of who they're mad at: an empty one is calm
  else if (hp < 30) mood = 'sad'
  else {
    if (now > (ses.lfQNext ?? 0)) { const r = ctx.random(); ses.lfQ = r < 0.55 ? 'smile' : r < 0.8 ? 'blep' : 'joy'; ses.lfQUntil = now + 1500 + r * 1500; ses.lfQNext = ses.lfQUntil + 14000 + ctx.random() * 22000 }
    if (now < (ses.lfQUntil ?? 0)) mood = ses.lfQ
  }
  const ln = s.line, talk = !!(ln && ln.t && now < (ln.at ?? 0) + (ln.d ?? 1400 + String(ln.t).length * 60)) && mood !== 'ko'
  const key = mood + (talk ? ':t' : '')
  if (ses.lfKey === key && hf.params.blinkFace !== undefined || (ses.lfKey === key && mood === 'ko')) return
  ses.lfKey = key
  const face = mood === 'rest' ? ses.lfRest : faces[mood]
  const life = faceLife(ses.lfSex, { expression: mood === 'rest' ? 'neutral' : mood, talk, fur: m.materials.fur?.color, fseed: o.id }, face, faces)
  const params = { ...hf.params, face, ...life }
  if (mood !== 'rest') delete params.mouth
  else if (ses.lfMouth === undefined) ses.lfMouth = hf.params.mouth ?? null
  if (mood === 'rest' && ses.lfMouth) params.mouth = ses.lfMouth
  o.model = { ...m, materials: { ...m.materials, headFur: { ...hf, params } } }
}
