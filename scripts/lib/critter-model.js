// The Blender critter as a spec: the body GLB for the look's sex (garments shown by name, tinted by the look's hex)
// and the species head (head, face, ears, tail) as a skinned child riding the same rig. Data: scripts/lib/data/critter-models.yml.
import M from './data/critter-models.yml'
import FACES from './data/faces.yml'
import CL from './data/clothes.yml'
import { rowOf, patOk } from './clothes.js'
export const HEAD_ID = 'critter-head'
// a head-covering mask (the Level 11 shop's bag and shell): its own GLB skinned whole to the Head bone, a second skin child; the row's `mask` names it
export const MASK_ID = 'critter-mask'
export const maskOf = (l) => (l?.hat && l.hat !== 'none' ? CL.rows.find((r) => r.slot === 'hat' && r.kind === l.hat && r.mask)?.mask : null) ?? null
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
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => toHex(hx(a).map((v, i) => v + (hx(b)[i] - v) * t))
function seedOf(l) { let h = 2166136261; for (const c of `${l.fur}|${l.species}|${l.sex}|${l.top}|${l.bottom}|${l.eye}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000 } }
const CREAMS = ['#fff4e2', '#f6efe6', '#fbe6cc', '#efe6dc', '#fff9f0', '#e9dccb']
const INKS = ['#1e1a1c', '#2c2220', '#3a2a22', '#24242c', '#40302a']
// Species with mandatory biological markings preserve their iconic colors (stripes, bandit masks, panda eyes/limbs, rudolph nose)
const ICONIC = {
  panda: { mark: '#2b2530', tip: '#2b2530', limb: '#2b2530', belly: '#ffffff' },
  skunk: { mark: '#f4f1ea', tip: '#f4f1ea', belly: '#f4f1ea' },
  badger: { mark: '#f1ece4', tip: '#e8e4dc', belly: '#2e2c36', nose: '#16141c' },
  tiger: { mark: '#2a1c18', belly: '#fff6ea' },
  leopard: { mark: '#2a1c18', belly: '#fff1d4' },
  raccoon: { mark: '#2c2a32', belly: '#e9e6ea', tip: '#2a2830' },
  redpanda: { belly: '#f4ece2', tip: '#7a2e16', mark: '#2b1a14', limb: '#2b1a14' },
  sheep: { mark: '#5d5560', belly: '#ffffff' },
  deer: { antler: '#e9d8b4', mark: '#4a2a1c' },
  reindeer: { nose: '#e0404c', antler: '#efe0bd', mark: '#4a2e20' },
  pig: { nose: '#ff8ca2' },
  koala: { nose: '#2a2830' }
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
  if (l.marks === 'none') mark = fur // markings off: the head's mark faces (cheek dots, brow tufts) wear the plain fur (johnadams2)
  if (mark) m.mark = { color: mark, roughness: 0.82, metalness: 0 }
  if (antlerCol) m.antler = { color: antlerCol, roughness: 0.65, metalness: 0.05 }
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
export function bodyModel(l) {
  const parts = {}
  for (const p of M.parts) parts[p] = { visible: false }
  for (const [slot, pre] of Object.entries(M.slots)) { const k = MESH_SWAP[slot]?.[l[slot]] ?? l[slot]; if (k && k !== 'none' && parts[pre + '_' + k]) parts[pre + '_' + k].visible = true }
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
    materials[mat] = pat ? { kind: 'scripted', script: 'scripts/mat-cloth.js', color: l[key], roughness: 0.8, metalness: 0, params: { pat, s: 1 } } : { color: l[key], roughness: 0.75, metalness: 0 } // fabric patterns: scripts/mat-cloth.js
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
  const icon = ICONIC[spName] || {};
  return {
    id: (isFemale ? sp.headF : sp.headM) || sp.head,
    materials: only({
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
      nose: { color: l?.nose || icon.nose || sp.nose || '#221614', roughness: 0.28, metalness: 0.05 }
    }, sp.mats)
  }
}
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

  // 2. Eyes, blush, nose
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
    // Multi-harmonic phonetic syllable rhythm (approx 4-5 Hz speech rate)
    const syllable = (Math.sin(t * 18) * 0.5 + 0.5) * (Math.sin(t * 8) * 0.35 + 0.65)
    const oVowel = (Math.cos(t * 12) * 0.5 + 0.5) * 0.35
    const intensity = Number(look?.talkIntensity ?? 0.72)
    f.Open = Math.min(1, (f.Open ?? 0) + syllable * intensity)
    f.O = Math.min(1, (f.O ?? 0) + oVowel * intensity * 0.55)
    f.Smile = Math.min(1, (f.Smile ?? 0) + 0.15)
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
  if (['wolf', 'dog', 'fox', 'jackal', 'fennec'].includes(spName)) {
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
  if (snoutS && snoutS !== 1) {
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
  // When critters open their mouth (laughing, speaking, shouting, smiling wide),
  // reinforce the lower jaw and forward snout projection to prevent the mouth
  // cavity from feeling hollow or caved into the skull.
  const openAmt = Math.max(f.Open ?? 0, (f.O ?? 0) * 0.8)
  if (openAmt > 0.04) {
    // 1. Maintain forward muzzle and mandibular volume under open-mouth tension
    f.FT_Snout = Math.min(1, Math.max(f.FT_Snout ?? 0, (f.FT_Snout ?? 0) + openAmt * 0.14))
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
  if (!MESH) return { primitive: { kind: 'scripted', script: 'scripts/critter2-geo.js', params: l }, material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.65, bounce: 0.72 } }
  const isF = l?.sex === 'f'
  return {
    model: bodyModel(l),
    morph: bustMorph(l) ?? undefined,
    children: [{
      id: HEAD_ID,
      attachment: { skin: true },
      model: headModel(l),
      morph: faceMorph(l?.expr, false, isF, l),
      jiggle: { bones: ['EarL', 'EarR'], amount: 0.58, bounce: 0.72 },
      ...(maskOf(l) ? { visible: false } : {})
    }, maskChild(l)].filter(Boolean),
    material: { outline: { color: '#1d1420', width: 2.4 } },
    jiggle: { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.68, bounce: 0.72 },
    ...(l?.heightS || l?.buildS ? { scale: { x: Number(l.buildS) || 1, y: Number(l.heightS) || 1, z: Number(l.buildS) || 1 } } : {})
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
  seatMask(ctx, obj, l)
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
const NEWSP = ['rat', 'squirrel', 'leopard', 'jackal', 'badger', 'ferret', 'beaver', 'capybara', 'lop', 'fennec'].filter((k) => SPECIES.includes(k)), OLDSP = SPECIES.filter((k) => !NEWSP.includes(k))
// about a third of the people with no species of their own are one of the newer ones; the rest keep the species they always had
export const speciesFor = (id) => (NEWSP.length && hashOf(id + ':sp2') % 100 < 34 ? NEWSP[hashOf(id + ':sp3') % NEWSP.length] : OLDSP[hashOf(id + ':sp') % OLDSP.length])
// each body its own height and build, stable by id: h 0.86..1.14, w 0.88..1.16 (Savi's picks)
export function buildFor(id, sex) {
  const a = (hashOf(id + ':h') % 1000) / 1000, b = (hashOf(id + ':w') % 1000) / 1000
  const h = +(0.86 + a * 0.28 - (sex === 'f' ? 0.03 : 0)).toFixed(3), w = +(0.88 + b * 0.28).toFixed(3)
  const c = (hashOf(id + ':b') % 1000) / 1000, d = (hashOf(id + ':hd') % 1000) / 1000, e = (hashOf(id + ':tl') % 1000) / 1000
  const ear = +(0.82 + ((hashOf(id + ':ear') % 1000) / 1000) * 0.38).toFixed(2)
  // female critters have curvy bodies with breasts: 0.25..0.95; head 0.92..1.1; tail curl 0.7..1.3
  const bust = +(0.25 + Math.pow(c, 0.85) * 0.70).toFixed(2), head = +(0.92 + d * 0.18).toFixed(3), curl = +(0.7 + e * 0.6).toFixed(2)
  return sex === 'f' ? { v: 2, h, w, bust, head, curl, ear } : { v: 2, h, w, head, curl, ear } // stable per npc
}
// the resting pose every npc keeps under its other bone writes: its head size and an S-curve in the tail (up off the hips, tip curling back)
export function baseBones(b, l) {
  const k = b?.curl ?? 1, hs = b?.head ?? l?.headS ?? 1
  const es = b?.ear ?? l?.earS ?? 1
  const bones = { Head: { scale: hs }, Tail: { rotate: [-28 * k, 0, 0] }, Tail1: { rotate: [34 * k, 0, 0] } }
  if (es && Math.abs(es - 1) > 0.02) {
    bones.EarL = { scale: es }
    bones.EarR = { scale: es }
  }
  return bones
}
// the body's Bust morph: female critters have natural curvy breasts (base 0.38), modulated by bust / bustS
export function bustMorph(l) { return _bust(l) }
const _bust = (l) => {
  if (l?.sex !== 'f') return null
  let val = 0.38
  if (l.bust != null) val = Math.max(0.15, Math.min(1.0, Number(l.bust)))
  else if (l.bustS != null) val = Math.max(0.15, Math.min(1.0, 0.38 + (Number(l.bustS) - 1) * 2.0))
  return { Bust: Math.round(val * 100) / 100 }
}
