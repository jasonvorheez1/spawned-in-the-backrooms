// The player's critter body: wears player.state.look as the scripted critter, swaps the face on T,
// opens the wardrobe on C (a turning preview of you stands in front while it's open), and lets the
// game's moods show on the face: a hit makes you wince, low hp is sad, low sanity is scared.
import { plainLook, honest, wornTokens, parseCloth } from './lib/clothes.js'
import C from './lib/data/critter.yml'
const SCRIPT = 'scripts/critter2-geo.js'
const GAIT_LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb', sit: 'cdn/clip-sit-loop.glb' }
export const updateSchedule = { every: { seconds: 0.2 } }

// ---- life: blinking and ear twitches, as brief bone changes the whole room sees (two small writes each)
const LID_SCALE = 1000 // the lids are modelled this many times too small (scripts/critter2-geo.js)
const EYES_SHUT = ['joy', 'laugh', 'kiss', 'dizzy']
function applyBones(ctx) {
  const ses = ctx.self.session, b = {}
  if (ses.lids) { b.LidL = { scale: LID_SCALE }; b.LidR = { scale: LID_SCALE } }
  if (ses.twitch) b[ses.twitch] = { rotate: [0, 0, ses.twitchDir * 24] }
  if (ses.headS && ses.headS !== 1) b.Head = { scale: ses.headS }
  if (ses.tailS && ses.tailS !== 1) b.Tail = { scale: ses.tailS }
  ctx.self.bones = b
}
export function blinkEnd(ctx) { if (ctx.self.state.gaitClips) return; ctx.self.session.lids = false; applyBones(ctx) }
export function blinkNow(ctx) { if (ctx.self.state.gaitClips) return; ctx.self.session.lids = true; applyBones(ctx); ctx.after(0.12, 'blinkEnd', {}) }
export function twitchEnd(ctx) { if (ctx.self.state.gaitClips) return; ctx.self.session.twitch = null; applyBones(ctx) }
function life(ctx, face) {
  const ses = ctx.self.session, now = ctx.now()
  if (ses.nextBlink == null) { ses.nextBlink = now + 1500 + ctx.random() * 2500; ses.nextTwitch = now + 4000 + ctx.random() * 6000 }
  if (now >= ses.nextBlink) {
    ses.nextBlink = now + 2400 + ctx.random() * 3800
    if (!EYES_SHUT.includes(face) && !ses.lids) { blinkNow(ctx); if (ctx.random() < 0.18) ctx.after(0.34, 'blinkNow', {}) } // now and then a double blink
  }
  if (now >= ses.nextTwitch) {
    ses.nextTwitch = now + 5000 + ctx.random() * 9000
    if (!ses.twitch) { ses.twitch = ctx.random() < 0.5 ? 'EarL' : 'EarR'; ses.twitchDir = ses.twitch === 'EarL' ? -1 : 1; applyBones(ctx); ctx.after(0.16, 'twitchEnd', {}) }
  }
}

// Tail and ears act out the mood on their own channel (the gait clips never touch these bones, so both play at once):
// happy wags quick and perky, sad droops slow, scared tucks the tail and flattens the ears, angry lashes. Degrees.
const FLAIR = {
  happy:  { d: 0.7, tail: { yaw: [-28, 28, -28], pitch: [20, 26, 20] }, ear: { roll: [0, 8, 0, -4, 0] } },
  calm:   { d: 2.4, tail: { yaw: [-12, 12, -12], pitch: [8, 12, 8] }, ear: { roll: [0, 0, 14, 0, 0] } },
  sad:    { d: 3.2, tail: { yaw: [-5, 5, -5], pitch: [-35, -32, -35] }, ear: { roll: [-32, -28, -32] } },
  scared: { d: 0.25, tail: { yaw: [-4, 4, -4], pitch: [-55, -55, -55] }, ear: { roll: [-50, -46, -50] } },
  angry:  { d: 0.9, tail: { yaw: [-40, 10, 40, -10, -40], pitch: [25, 30, 25] }, ear: { roll: [-22, -22, -22] } },
}
const MOOD = { grin: 'happy', joy: 'happy', love: 'happy', wink: 'happy', smug: 'calm', smile: 'calm', sleepy: 'sad', sad: 'sad', scared: 'scared', surprised: 'scared', angry: 'angry' }
function flairClip(face) {
  const f = FLAIR[MOOD[face] || 'calm'], half = (a) => a.map((v) => v * 0.5)
  return { duration: f.d, tracks: {
    Tail: { yaw: f.tail.yaw, pitch: f.tail.pitch }, Tail1: { yaw: half(f.tail.yaw), pitch: half(f.tail.pitch) },
    EarL: { roll: f.ear.roll.map((v) => -v) }, EarR: { roll: f.ear.roll },
  } }
}
function flair(obj, face) { obj.anim.flair = { clip: flairClip(face), loop: 'loop', weight: 1, blendIn: 0.3 } }

// an old look (one outfit + one accessory) reads into the clothing slots
const LEGACY = { tee: ['tee', 'pants'], hoodie: ['hoodie', 'pants'], sweater: ['sweater', 'pants'], jacket: ['jacket', 'pants'], overalls: ['tee', 'overalls'], apron: ['apron', 'pants'], pajamas: ['pajamas', 'pjpants'], skirt: ['tee', 'skirt'], dress: ['dress', 'none'], none: ['none', 'none'] }
function lookOf(ctx) {
  const s = ctx.self.state.look || {}, l = { ...C.default, ...s }
  if (s.outfit && !s.topw) { const m = LEGACY[s.outfit] || LEGACY.tee; l.topw = m[0]; l.botw = m[1] }
  if (s.acc && !s.hat && !s.eyew && !s.neck) {
    if (C.hat.includes(s.acc)) l.hat = s.acc; else if (C.eyew.includes(s.acc)) l.eyew = s.acc; else if (C.neck.includes(s.acc)) l.neck = s.acc
    if (s.top) { l.hatc = s.top }
  }
  delete l.outfit; delete l.acc
  return l
}
// every wardrobe change goes through here: it can restyle the plain set freely, never conjure armor,
// and any found garment it takes off goes back into the bag (player.state.clothes) instead of vanishing
function dress(st, cur, next) {
  const out = honest(cur, next), keep = wornTokens(out), bag = st.clothes ? st.clothes.split(',').filter(Boolean) : []
  for (const t of wornTokens(cur)) { const i = keep.indexOf(t); if (i >= 0) keep.splice(i, 1); else if (!parseCloth(t)?.row.regular) bag.push(t) }
  st.clothes = bag.join(',')
  st.look = out
}
const pick = (ctx, list) => list[Math.floor(ctx.random() * list.length)]
// a rolled look wears only the regular set (tee/tank/longsleeve, pants/shorts, plain shoes): armor is found, never rolled
function randomLook(ctx, cur, scope) {
  const l = plainLook(ctx, cur)
  if (scope === 'all') {
    l.species = pick(ctx, C.species); l.sex = pick(ctx, C.sex); l.fur = ctx.random() < 0.5 ? '' : pick(ctx, C.fur)
    l.eye = pick(ctx, C.eye); l.eyes = pick(ctx, C.eyes); l.marks = ctx.random() < 0.5 ? 'none' : pick(ctx, C.marks)
    l.expr = pick(ctx, ['grin', 'smile', 'joy', 'sparkle', 'smug', 'wink', 'blep'])
  }
  return l
}

export function onInput(ctx, input) {
  const st = ctx.self.state
  if (input.pressed?.wardrobe) st.wardrobeOpen = !st.wardrobeOpen
  if (input.pressed?.emote) {
    const l = lookOf(ctx), cur = ctx.self.session.face || l.expr
    const next = C.expr[(C.expr.indexOf(cur) + 1) % C.expr.length]
    st.face = { expr: next, until: ctx.now() + C.holdFace * 1000 }
  }
  const d = input.actionData?.dress
  if (input.pressed?.dress && d && typeof d.k === 'string') {
    if (d.k === 'close') { st.wardrobeOpen = false; return }
    if (d.k === 'face') { st.face = { expr: d.v, until: ctx.now() + C.holdFace * 1000 }; return }
    if (d.k === 'tab') { if (['body', 'face', 'clothes', 'outfits'].includes(d.v)) st.wrTab = d.v; return }
    if (d.k === 'spin') { st.wrSpin = ((st.wrSpin || 0) + (Number(d.v) || 0)) % 360; return }
    if (d.k === 'random') { dress(st, lookOf(ctx), randomLook(ctx, lookOf(ctx), d.v === 'all' ? 'all' : 'clothes')); st.face = null; return }
    if (d.k === 'reset') { dress(st, lookOf(ctx), { ...C.default }); st.face = null; return }
    if (d.k === 'strip') { dress(st, lookOf(ctx), { ...lookOf(ctx), topw: 'none', botw: 'none', shoes: 'none', hat: 'none', eyew: 'none', neck: 'none' }); return }
    const slotN = Number(d.v)
    if (d.k === 'save' && slotN >= 0 && slotN < C.outfitSlots) { const o = [...(st.outfits || [])]; while (o.length < C.outfitSlots) o.push(null); o[slotN] = lookOf(ctx); st.outfits = o; return }
    if (d.k === 'wear' && st.outfits?.[slotN]) { dress(st, lookOf(ctx), { ...st.outfits[slotN] }); st.face = null; return }
    if (d.k === 'sz') { // a body slider: v = "<key>:<value>"
      const [key, raw] = String(d.v).split(':'), row = C.sliders.find((r) => r[0] === key)
      if (!row) return
      const cur = Number(lookOf(ctx)[key]) || 1
      const v = raw === '+' ? cur + C.sliderStep : raw === '-' ? cur - C.sliderStep : Number(raw)
      if (!Number.isFinite(v)) return
      st.look = { ...lookOf(ctx), [key]: Math.round(Math.min(row[3], Math.max(row[2], v)) * 100) / 100 }
      return
    }
    if (d.k === 'model') { if (d.v && !C.models?.[d.v]) return; st.look = { ...lookOf(ctx), model: d.v || '', modelUrl: '' }; return }
    if (d.k === 'modelUrl') { const m = String(d.v || '').match(/\/cdn\/[\w.\-]+\.glb$/); st.look = { ...lookOf(ctx), modelUrl: m ? m[0] : '', model: '' }; return } // a player's own uploaded .plymodel
    if (!(d.k in C.default)) return
    const list = C[d.k === 'top' || d.k === 'bottom' || d.k === 'shoec' || d.k === 'hatc' || d.k === 'neckc' ? 'cloth' : d.k]
    if (Array.isArray(list) && !list.includes(d.v)) return
    dress(st, lookOf(ctx), { ...lookOf(ctx), [d.k]: d.v })
    if (d.k === 'expr') st.face = null
  }
}

function moodFace(ctx, l) {
  const s = ctx.self.state, now = ctx.now(), ses = ctx.self.session
  if (s.face && now < s.face.until) return s.face.expr
  const hp = s.hp ?? 100
  if (ses.hp != null && hp < ses.hp - 0.5) ses.hurtUntil = now + C.hurtFace * 1000
  ses.hp = hp
  if (now < (ses.hurtUntil || 0)) return 'scared'
  if (hp <= 0) return 'sad'
  if (hp < 30) return 'sad'
  if ((s.san ?? 100) < 25) return 'scared'
  return l.expr
}

export function update(ctx) {
  if (!ctx.self.state.look) ctx.self.state.look = randomLook(ctx, { ...C.default }, 'clothes') // a new critter: regular clothes only (saved looks are never touched)
  const l = lookOf(ctx), face = moodFace(ctx, l), ses = ctx.self.session
  ses.face = face
  const wornNow = !!(l.modelUrl || (l.model && C.models?.[l.model]))
  if (wornNow) {
    // an imported body has its own skeleton (pelvis, spine_01 …): no tail, ears or lids to act on, and the gait plays library clips on its bones
    if (ses.flair !== 'worn') { ses.flair = 'worn'; ctx.self.anim.flair = null; ctx.self.bones = {}; ses.lids = false; ses.twitch = null }
    if (!ctx.self.state.gaitClips) ctx.self.state.gaitClips = GAIT_LIB
  } else {
    if (ctx.self.state.gaitClips) delete ctx.self.state.gaitClips
    if (ses.flair !== face) { ses.flair = face; flair(ctx.self, face) }
    life(ctx, face)
  }
  const params = { species: l.species, sex: l.sex, eye: l.eye, topw: l.topw, botw: l.botw, shoes: l.shoes, hat: l.hat, eyew: l.eyew, neck: l.neck, top: l.top, bottom: l.bottom, shoec: l.shoec, hatc: l.hatc, neckc: l.neckc, expr: face, eyes: l.eyes, marks: l.marks }
  if (l.fur) params.fur = l.fur
  for (const [k] of C.sliders) if (k !== 'headS' && k !== 'tailS' && Number(l[k]) && Number(l[k]) !== 1) params[k] = Number(l[k])
  const worn = l.modelUrl ? { url: l.modelUrl } : l.model && C.models?.[l.model] // an imported model worn instead of the critter
  const key = JSON.stringify(params) + (worn ? '|' + worn.url : '')
  if (key !== ses.key) {
    ses.key = key
    if (worn) { ctx.self.primitive = null; ctx.self.model = worn.url }
    else { ctx.self.model = null; ctx.self.primitive = { kind: 'scripted', script: SCRIPT, params } }
  }
  const hs = Number(l.headS) || 1, ts = Number(l.tailS) || 1
  if (!worn && (hs !== (ses.headS || 1) || ts !== (ses.tailS || 1))) { ses.headS = hs; ses.tailS = ts; applyBones(ctx) }
  // the wardrobe mirror: only on this player's own screen
  const me = ctx.place.players.find((p) => p.id === ctx.self.id)
  if (!me?.isLocal) return
  if (ctx.self.state.wardrobeOpen) {
    const yaw = ((me.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, f = ctx.self.feetPosition
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
    ses.spin = (ses.spin || 0) + 0.2 * 40
    const pos = { x: f.x + fx * 2.1 + rx * 0.6, y: f.y, z: f.z + fz * 2.1 + rz * 0.6 }
    const rot = { yaw: (yaw * 180) / Math.PI + 180 + (ctx.self.state.wrSpin || 0) + Math.sin(ctx.now() / 1600) * 18 }
    const mirror = ses.mirror && ctx.getObject(ses.mirror)
    if (!mirror) { ses.mirror = ctx.spawn({ audience: 'local', feetPosition: pos, rotation: rot, ...(worn ? { model: worn.url } : { primitive: { kind: 'scripted', script: SCRIPT, params } }), material: { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.6, bounce: 0.6 }, light: { kind: 'point', color: '#fff2d8', intensity: 2, distance: 4 } }); const m = ctx.getObject(ses.mirror); if (m) { m.anim.idle = { clip: worn ? GAIT_LIB.idle : 'Idle', loop: 'loop', weight: 1 }; if (!worn) flair(m, face) } }
    else { mirror.feetPosition = pos; mirror.rotation = rot; if (ses.mirrorKey !== key) { if (worn) { mirror.primitive = null; mirror.model = worn.url; mirror.anim.flair = null; mirror.anim.idle = { clip: GAIT_LIB.idle, loop: 'loop', weight: 1 } } else { mirror.model = null; mirror.primitive = { kind: 'scripted', script: SCRIPT, params }; flair(mirror, face) } }
      mirror.bones = { ...(hs !== 1 ? { Head: { scale: hs } } : {}), ...(ts !== 1 ? { Tail: { scale: ts } } : {}) } }
    ses.mirrorKey = key
  } else if (ses.mirror) { ctx.destroy(ses.mirror); ses.mirror = null; ses.mirrorKey = null }
}
