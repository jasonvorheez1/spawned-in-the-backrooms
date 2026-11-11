// The player's critter body: wears player.state.look as the cute Blender critter (art/critter-cute: body per sex with its own Idle/Walk/Run/Sprint/Sit, head per species and sex) when critter-models.yml mesh is on, else the scripted critter (scripts/critter2-geo.js); swaps the face on T,
// opens the wardrobe on C (a turning preview of you stands in front while it's open), and lets the
// game's moods show on the face: a hit makes you wince, low hp is sad, low sanity is scared.
import { plainLook, honest, wornTokens, parseCloth } from './lib/clothes.js'
import C from './lib/data/critter.yml'
import { standUp } from './lib/seat.js'
const SCRIPT = 'scripts/critter2-geo.js'
import { FURRY_HEAD, bodyModel, headModel, faceMorph, bustMorph, MESH, HUMAN, setStyle, restylePlace, STYLE_V, seatHead, clearAppearance, humanBodyMorph, humanFace, mouthAt, HEAD_ID, maskChild, seatMask, hairChild, seatHair, beardChild, seatBeard, speciesOf } from './lib/critter-model.js' // MESH (critter-models.yml): the cute Blender critters (art/critter-cute)
const LID_SCALE = 1000 // the lids are modelled this many times too small (scripts/critter2-geo.js)
const GAIT_LIB = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sprint: 'cdn/clip-sprint-loop.glb', sit: 'cdn/clip-sit-loop.glb' }
import { weaponBody, HOLD } from './lib/weapon-look.js'
import { baseOf } from './lib/weapons.js'
import { stance, heldRot } from './lib/body3.js'
const MENU_CLOTH = ['topw', 'botw', 'shoes', 'hat', 'eyew', 'neck', 'top', 'bottom', 'shoec', 'hatc', 'neckc', 'topp', 'botp', 'shoep', 'hatp', 'neckp']
const WARDROBE_OFF = true // Shelly, Nov 7: character creator off for now; false brings it back
export const updateSchedule = { every: { seconds: 0.1 } } // 10 Hz: the hands follow the aim (scripts/lib/body3.js)

// ---- life: blinking and ear twitches, as brief bone changes the whole room sees (two small writes each)
const EYES_SHUT = ['joy', 'laugh', 'kiss', 'dizzy']
function applyBones(ctx) {
  const ses = ctx.self.session, b = {}
  if (MESH) {
    const h = ctx.getObject(ctx.self.id + '/' + HEAD_ID);
    if (h && ses.face) {
      const lk = ses.cachedLook ?? lookOf(ctx);
      const isHurt = (ctx.now() - (ses.hitAt3 ?? 0)) < 700;
      h.morph = faceMorph(ses.face, ses.lids, lk?.sex === 'f', { ...lk, hurt: isHurt });
    }
  }
  else if (ses.lids) { b.LidL = { scale: LID_SCALE }; b.LidR = { scale: LID_SCALE } }
  if (ses.twitch) b[ses.twitch] = { rotate: [0, 0, ses.twitchDir * 24] }
  if (!HUMAN && !ses.cachedWorn) b.Head = { scale: (ses.headS || 1) * FURRY_HEAD } // furry: the Dandy big head, times the player's own head slider
  if (ses.tailS && ses.tailS !== 1) b.Tail = { scale: ses.tailS }
  if (!HUMAN && !ses.cachedWorn) Object.assign(b, armSplay()) // arms clear the hips and skirts (critter-model ARM_SPLAY)
  if (ses.pose) Object.assign(b, ses.pose) // the hands on a gun: IK reach points (scripts/lib/body3.js)
  ctx.self.bones = b
}
// human faces (Shelly Nov 9 #116046): the body's X_ keys wear the mood face and blink on their own; a line the player's character speaks (state.line) moves the mouth letter by letter
function humanFaceTick(ctx, face) {
  const ses = ctx.self.session, now = ctx.now()
  if (ses.hBlinkAt == null) ses.hBlinkAt = now + 1500 + ctx.random() * 2500
  if (now >= ses.hBlinkAt) { ses.hBlinkAt = now + 2600 + ctx.random() * 3800; ses.hBlinkUntil = now + 140 }
  const blink = now < (ses.hBlinkUntil ?? 0) && !EYES_SHUT.includes(face)
  const ln = ctx.self.state.line, mouth = ln?.t ? mouthAt(ln.t, now - ln.at - 120) : null
  const k = (ses.key ?? '') + face + (blink ? 1 : 0) + (mouth ? mouth.map((v) => v.toFixed(1)).join() : '')
  if (k === ses.hFaceK) return
  ses.hFaceK = k
  if (ses.hBaseK !== ses.key) { ses.hBaseK = ses.key; ses.hBase = humanBodyMorph(ses.cachedParams) ?? {} }
  ctx.self.morph = { ...ses.hBase, ...humanFace(face, blink, mouth) }
}
export function blinkEnd(ctx) { if (ctx.self.session.flair === 'worn') return; ctx.self.session.lids = false; applyBones(ctx) }
export function blinkNow(ctx) { if (ctx.self.session.flair === 'worn') return; ctx.self.session.lids = true; applyBones(ctx); ctx.after(0.12, 'blinkEnd', {}) }
export function twitchEnd(ctx) { if (ctx.self.session.flair === 'worn') return; ctx.self.session.twitch = null; applyBones(ctx) }
// a face already wearing shut or happy eyes never blinks (the head's Blink key would add to them)
const shutEyes = (face) => EYES_SHUT.includes(face) || (MESH && (() => { const m = faceMorph(face); return !!(m.Happy || m.Blink) })())
function life(ctx, face) {
  const ses = ctx.self.session, now = ctx.now()
  if (ses.nextBlink == null) { ses.nextBlink = now + 1500 + ctx.random() * 2500; ses.nextTwitch = now + 4000 + ctx.random() * 6000 }
  if (now >= ses.nextBlink) {
    ses.nextBlink = now + 2400 + ctx.random() * 3800
    if (!shutEyes(face) && !ses.lids) { blinkNow(ctx); if (ctx.random() < 0.18) ctx.after(0.34, 'blinkNow', {}) } // now and then a double blink
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
  const out = honest(cur, next), keep = wornTokens(out), bag = st.clothes ? String(st.clothes).split(',').filter(Boolean) : []
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
    l.eye = pick(ctx, C.eye); l.ftype = pick(ctx, C.ftype); l.trait = pick(ctx, C.trait); l.blush = pick(ctx, C.blush); l.nose = pick(ctx, C.nose); l.eyes = pick(ctx, C.eyes); l.marks = ctx.random() < 0.5 ? 'none' : pick(ctx, C.marks)
    const hs = l.sex === 'f' ? C.hairF : C.hairM; l.hair = ctx.random() < 0.15 ? 'none' : pick(ctx, hs); l.hairc = pick(ctx, C.hairc)
    l.expr = pick(ctx, ['grin', 'smile', 'joy', 'sparkle', 'smug', 'wink', 'blep'])
  }
  return l
}

export function onInput(ctx, input) {
  const st = ctx.self.state
  // the O key stays off; the main menu's CHARACTER opens it
  if (WARDROBE_OFF) { if (st.wardrobeOpen && !st.wrMenu && !st.salonOpen) st.wardrobeOpen = false; } else if (input.pressed?.wardrobe) st.wardrobeOpen = !st.wardrobeOpen
  if (input.pressed?.emote) {
    const l = lookOf(ctx), cur = ctx.self.session.face || l.expr
    const next = C.expr[(C.expr.indexOf(cur) + 1) % C.expr.length]
    st.face = { expr: next, until: ctx.now() + C.holdFace * 1000 }
  }
  const d = input.actionData?.dress
  if (input.pressed?.dress && d && typeof d.k === 'string') {
    if (d.k === 'stab') { if (['hair', 'face', 'body', 'wear'].includes(d.v)) st.salonTab = d.v; return } // the salon's service tabs
    if (d.k === 'close') { if (st.salonOpen && st.sit) standUp(ctx); st.wardrobeOpen = false; st.salonOpen = false; if (st.wrMenu) { st.wrMenu = false; if (ctx.self.place !== 'intake') { st.menuOpen = true; st.menuKind = 'pause' } } return } // in the intake room, done walks you out (main-menu.js)
    if (d.k === 'face') { st.face = { expr: d.v, until: ctx.now() + C.holdFace * 1000 }; return }
    if (d.k === 'tab') { if ((st.wrMenu ? ['body', 'face'] : ['body', 'face', 'clothes', 'outfits']).includes(d.v)) st.wrTab = d.v; return }
    if (st.wrMenu) { // the menu's creator shapes the critter alone: clothes are loot, never picked here (Shelly)
      const keep = (l) => { const o = {}; for (const k of MENU_CLOTH) if (k in l) o[k] = l[k]; return o }
      if (d.k === 'random') { const cur = lookOf(ctx); dress(st, cur, { ...randomLook(ctx, cur, 'all'), ...keep(cur) }); st.face = null; return }
      if (d.k === 'reset') { const cur = lookOf(ctx); dress(st, cur, { ...C.default, ...keep(cur) }); st.face = null; return }
      if (MENU_CLOTH.includes(d.k) || ['strip', 'save', 'wear'].includes(d.k)) return
    }
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
      if (lookOf(ctx).sex !== 'f' && (key === 'hipS' || key === 'bustS')) return // boys have no bust or hips sliders (johnadams2)
      const cur = Number(lookOf(ctx)[key]) || 1
      const v = raw === '+' ? cur + C.sliderStep : raw === '-' ? cur - C.sliderStep : Number(raw)
      if (!Number.isFinite(v)) return
      st.look = { ...lookOf(ctx), [key]: Math.round(Math.min(row[3], Math.max(row[2], v)) * 100) / 100 }
      return
    }
    if (d.k === 'model') { if (d.v && !C.models?.[d.v]) return; st.look = { ...lookOf(ctx), model: d.v || '', modelUrl: '' }; return }
    if (d.k === 'modelUrl') { const m = String(d.v || '').match(/\/cdn\/[\w.\-]+\.glb$/); st.look = { ...lookOf(ctx), modelUrl: m ? m[0] : '', model: '' }; return } // a player's own uploaded .plymodel
    if (d.k === 'hair' && d.v !== 'none' && !(lookOf(ctx).sex === 'f' ? C.hairF : C.hairM).includes(d.v)) return
    if (d.k === 'sex' && C.sex.includes(d.v)) { const cur = lookOf(ctx); const keep = typeof cur.hair==='string' && cur.hair.startsWith(d.v + '_') ? cur.hair : 'none'; dress(st, cur, { ...cur, sex: d.v, hair: keep }); return }
    if (d.k === 'species') { if (!['cat', 'dog', 'fox', 'bunny', 'wolf', 'mouse'].includes(d.v) || speciesOf({ species: d.v }) !== d.v) return; dress(st, lookOf(ctx), { ...lookOf(ctx), species: d.v }); return } // any species with a head (critter-models.yml), the salon's list
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

// Shelly's Universal Animation Library: a human NPC stands its own way (arms folded, on the phone), picked once by its id; players keep the plain idle
const WARRIOR = { walk: 'cdn/clip-warrior-walk-cycle-589b8756-loop.glb', run: 'cdn/clip-warrior-run-cycle-9a42782f-loop.glb' } // Shelly's warrior gait, refit to the human rig
const GAIT_HUM = { ...GAIT_LIB, sprint: GAIT_LIB.run } // Shelly: the library sprint swings the arms out behind; humans sprint on the run cycle
const GAIT_FEM = { ...GAIT_HUM, idle: 'cdn/clip-idle-female-loop.glb', walk: 'cdn/clip-walk-female-loop.glb' }
const NPC_IDLES = ['cdn/clip-idle-loop.glb', 'cdn/clip-idle-loop.glb', 'cdn/clip-ual-idle-talkingphone-5737f83c-loop.glb'] // no folded arms: they pass through a human chest
function gaitFor(ctx) {
  const ss = ctx.self.session
  if (ss.isPlayer == null) ss.isPlayer = ctx.place.players.some((p) => p.id === ctx.self.id)
  if (!HUMAN) return GAIT_LIB
  const fem = ss.cachedLook?.sex === 'f', base = fem ? GAIT_FEM : GAIT_HUM // the library's woman's walk and idle on a human woman
  if (ss.isPlayer) return base
  if (ss.gaitNpcF !== fem) { ss.gaitNpcF = fem; ss.gaitArmed = null; const h = [...String(ctx.self.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), i = NPC_IDLES[h % NPC_IDLES.length]; ss.gaitNpc = { ...base, idle: fem && i === GAIT_LIB.idle ? GAIT_FEM.idle : i } }
  if (!ctx.self.state.armed) return ss.gaitNpc
  // Shelly: "not everyone is a warrior": the warrior cycles only while a fighter has a weapon out
  return (ss.gaitArmed ??= { ...ss.gaitNpc, walk: WARRIOR.walk, run: WARRIOR.run, sprint: WARRIOR.run })
}
export function update(ctx) {
  { const sty = setStyle(ctx.world.state.bodyStyle), ps = ctx.place?.state, k = sty + ':' + STYLE_V; if (ps && ctx.self.isLocal !== false && ps.bodyStyleV !== k) { ps.bodyStyleV = k; ctx.log('restyle', ctx.place.id ?? '', sty, restylePlace(ctx)) } } // the room's people follow the BODIES pick: one sweep per place per flip
  { const sty = setStyle(ctx.world.state.bodyStyle), ss = ctx.self.session; if (ss.style !== sty) { if (ss.style) { ss.lookKey = null; ss.key = null; ss.flair = null; ss.headSwept = false; if (sty === 'furry') ctx.self.anim.idle = null } ss.style = sty } } // the menu's BODIES: humans or furries, everyone in the room
  if (!MESH && !ctx.self.session.headSwept) { ctx.self.session.headSwept = true; dropHead(ctx, ctx.self) }
  if (!ctx.self.state.look) ctx.self.state.look = randomLook(ctx, { ...C.default }, 'clothes') // a new critter: regular clothes only (saved looks are never touched)
  const ses = ctx.self.session, rawLook = ctx.self.state.look
  let l = ses.cachedLook
  if (!l || rawLook !== ses.lastLookRef) {
    ses.lastLookRef = rawLook
    l = ses.cachedLook = lookOf(ctx)
    ses.lookKey = null
  }
  const face = moodFace(ctx, l)
  ses.face = face
  { // third person: a flinch when hurt; a gun in the hands is aimed or carried ready, and an aimed body faces where the camera looks
    const s3 = ctx.self.state, now3 = ctx.now(), hp3 = s3.hp ?? 100
    if (ses.hp3 != null && hp3 < ses.hp3 - 0.5 && now3 - (ses.hitAt3 ?? 0) > 700) { ses.hitAt3 = now3; ctx.self.anim.hit = { clip: 'cdn/clip-hit-react.glb', loop: 'once', weight: 0.8, blendIn: 0.05, blendOut: 0.3 } }
    ses.hp3 = hp3
    if (ctx.self.anim.hit && now3 - (ses.hitAt3 ?? 0) > 900) ctx.self.anim.hit = null
    const st3 = stance(ctx), had = !!ses.pose
    ses.pose = st3?.bones ?? null
    if (st3?.aiming) { if (s3.turnTo !== 'camera') s3.turnTo = 'camera' } else if (s3.turnTo === 'camera') s3.turnTo = null
    if (ses.pose || had) applyBones(ctx)
  }
  { const h = Number(l.heightS) || 1, w = Number(l.buildS) || 1, k = h + ':' + w // height and build: the whole body, everyone sees it
    if (ses.hw !== k) { ses.hw = k; ctx.self.scale = { x: w, y: h, z: w } } }
  const wornNow = !!(l.modelUrl || (l.model && C.models?.[l.model]))
  if (wornNow) {
    // an imported body has its own skeleton (pelvis, spine_01 …): no tail, ears or lids to act on, and the gait plays library clips on its bones
    if (ses.flair !== 'worn') { ses.flair = 'worn'; ctx.self.anim.flair = null; ctx.self.bones = {}; ses.lids = false; ses.twitch = null }
    if (!ctx.self.state.gaitClips) ctx.self.state.gaitClips = GAIT_LIB
  } else {
    // the Blender critter's file carries no clips of its own: its humanoid bones play the library gait; the scripted one has its own
    if (MESH) { const g = gaitFor(ctx); if (ctx.self.state.gaitClips?.idle !== g.idle || ctx.self.state.gaitClips?.walk !== g.walk) ctx.self.state.gaitClips = g } else if (ctx.self.state.gaitClips) delete ctx.self.state.gaitClips
    const humanNow = HUMAN || speciesOf(ses.cachedParams) === 'human'
    if (humanNow) { if (ses.flair !== 'human') { ses.flair = 'human'; ctx.self.anim.flair = null; ctx.self.anim.cute = null; ctx.self.bones = {}; ses.lids = false; ses.twitch = null } } // the human rig has no tail, ears or lids
    if (!humanNow) {
    if (ses.flair !== face) { ses.flair = face; flair(ctx.self, face) }
    life(ctx, face)
    }
  }
  if (ses.lookKey == null || ses.lookVer !== 'human7' + STYLE_V || (!MESH && ses.lastFace !== face)) {
    ses.lookVer = 'human7' + STYLE_V // a STYLE_V bump re-dresses standing bodies too; refresh the body after the overalls layering fix
    const params = { species: l.species, sex: l.sex, ftype: l.ftype || 'oval', trait: l.trait || 'placid', blush: l.blush, nose: l.nose || undefined, eye: l.eye, topw: l.topw, botw: l.botw, shoes: l.shoes, hat: l.hat, eyew: l.eyew, neck: l.neck, top: l.top, bottom: l.bottom, shoec: l.shoec, hatc: l.hatc, neckc: l.neckc, expr: face, eyes: l.eyes, marks: l.marks, hair: l.hair, hairc: l.hairc, skin: l.skin || undefined, beard: l.beard, beardc: l.beardc } // skin rides the body key: without it a salon skin pick never rebuilt the body (Shelly, Nov 9)
    if (l.fur) params.fur = l.fur
    const worn = l.modelUrl ? { url: l.modelUrl } : l.model && C.models?.[l.model] // an imported model worn instead of the critter
    for (const [k] of C.sliders) if (k !== 'headS' && k !== 'tailS' && (l.sex === 'f' || (k !== 'hipS' && k !== 'bustS')) && Number(l[k]) && Number(l[k]) !== 1) params[k] = Number(l[k])
    ses.cachedParams = params
    ses.cachedWorn = worn
    ses.lookKey = JSON.stringify(MESH ? { ...params, expr: 0 } : params) + (worn ? '|' + worn.url : '') + (HUMAN ? '|human6' + HUMAN.m + HUMAN.f + '|' + STYLE_V : '|furry') // STYLE_V: a refit garment file re-dresses bodies already standing, the player's too
    ses.lastFace = face
  }
  const key = ses.lookKey
  if (key !== ses.key || ses.keyPlace !== ctx.self.place || (MESH && ses.bodyId && (ctx.self.model?.id??ctx.self.model)!==ses.bodyId)) { // a place crossing restamps the body: dress it again there
    ses.key = key; ses.keyPlace = ctx.self.place
    const params = ses.cachedParams, worn = ses.cachedWorn
    if (worn) { ctx.self.primitive = null; ctx.self.model = wornModel(worn); dropHead(ctx, ctx.self); ctx.self.morph=null; ctx.self.bones={}; ctx.self.material=null; ctx.self.jiggle = null }
    else if (MESH) {
      ctx.self.primitive = null
      ctx.self.model = bodyModel(params)
      if (HUMAN) { ctx.self.material = null; seatHead(ctx, ctx.self, params) } // the human body: its own head and face, no tail or ears
      else {
      const bm = bustMorph(params)
      ctx.self.morph = bm ?? null
      ctx.self.material = { outline: { color: '#1d1420', width: 2.4 } }
      ctx.self.jiggle = { bones: ['Tail', 'Tail1', 'EarL', 'EarR'], amount: 0.68, bounce: 0.72 }
      wearHead(ctx, ctx.self, params)
      }
    }
    else { ctx.self.model = null; ctx.self.primitive = { kind: 'scripted', script: SCRIPT, params } }
  }
  ses.bodyId=ctx.self.model?.id??ctx.self.model
  const worn = ses.cachedWorn
  if(!worn && HUMAN && ses.cachedParams)humanFaceTick(ctx,face)
  if (worn && ctx.getObject(ctx.self.id + '/' + HEAD_ID)) dropHead(ctx, ctx.self) // a worn body never keeps the critter head, whoever put it back
  if (MESH && !HUMAN && !worn && ses.headFace !== face) { ses.headFace = face; applyBones(ctx) }
  const hs = Number(l.headS) || 1, ts = Number(l.tailS) || 1
  if (!worn && !HUMAN && (hs !== (ses.headS || 1) || ts !== (ses.tailS || 1))) { ses.headS = hs; ses.tailS = ts; applyBones(ctx) }

  // held weapon in third person: attached to RightHand bone so other players and third-person camera see it
  const eq = ctx.self.state.equipped ?? 'fists'
  if (ses.heldKind !== eq || !ses.heldSwept || (eq!=='fists' && (!ses.heldObj || !ctx.getObject(ses.heldObj)))) {
    ses.heldKind = eq; ses.heldSwept = true
    // old held guns from earlier sessions (some from before the held3p tag) stay parented to the body: clear every hand-held child but the mall's food
    for (const c of ctx.getObject(ctx.self.id)?.children ?? []) { const cid = c?.id ?? c; const o = ctx.getObject(cid); if (o?.attachment?.bone === 'RightHand' && cid !== ctx.session?.hubHeld && cid !== ses.heldObj) { try { ctx.destroy(cid) } catch (e) {} } }
    if (ses.heldObj) { try { ctx.destroy(ses.heldObj) } catch (e) {} ses.heldObj = null }
    // a reload or a new machine forgets ses.heldObj but the gun stays on the body: sweep every tagged held gun of ours
    for (const r of ctx.query({ tags: ['held3p'], radius: 4 })) if (r.id.startsWith(ctx.self.id + '/')) { try { ctx.destroy(r.id) } catch (e) {} }
    if (eq !== 'fists') {
      const bk = baseOf(eq), g = HOLD[bk] ?? 0
      ses.heldObj = ctx.spawn({
        parent: ctx.self.id,
        tags: ['held3p'],
        attachment: { bone: 'RightHand' },
        feetPosition: { x: 0, y: 0, z: -g },
        visibleInFirstPerson: false,
        ...weaponBody(eq),
        ...heldRot(eq),
      })
    }
  }

  // the wardrobe mirror: only on this player's own screen
  const me = ctx.place.players.find((p) => p.id === ctx.self.id)
  if (!me?.isLocal) return
  { // first person: the body's own held gun stays off this screen (an aim clip lifts it into the eye); third person shows it
    const hideHeld = ses.heldObj && !ctx.self.state.tp ? ses.heldObj : null
    if (ses.hidHeld !== hideHeld) { const h = (me.hidden ?? []).filter((i) => i !== ses.hidHeld); if (hideHeld) h.push(hideHeld); me.hidden = h; ses.hidHeld = hideHeld }
  }
  if (ctx.self.state.wardrobeOpen && !ctx.self.state.salonOpen) { // the salon shows your real seated body instead (scripts/camera.js)
    const yaw = ((me.camera?.rotation?.yaw ?? 0) * Math.PI) / 180, f = ctx.self.feetPosition
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
    ses.spin = (ses.spin || 0) + 0.2 * 40
    const pos = { x: f.x + fx * 2.1 + rx * 0.6, y: f.y, z: f.z + fz * 2.1 + rz * 0.6 }
    const rot = { yaw: (yaw * 180) / Math.PI + 180 + (ctx.self.state.wrSpin || 0) + Math.sin(ctx.now() / 1600) * 18 }
    const mirror = ses.mirror && ctx.getObject(ses.mirror)
    const params = ses.cachedParams, worn = ses.cachedWorn
    if (!params) return
    const isF = params.sex === 'f'
    const look = worn ? { model: wornModel(worn) } : MESH && HUMAN ? { model: bodyModel(params), morph: humanBodyMorph(params) ?? undefined } : MESH ? { model: bodyModel(params), morph: bustMorph(params) ?? undefined, children: [{ id: HEAD_ID, attachment: { skin: true }, model: headModel({ ...params, vary: false }), morph: faceMorph(face, false, isF, params), audience: 'local' }, maskChild(params, true), hairChild(params, true), beardChild(params, true)].filter(Boolean) } : { primitive: { kind: 'scripted', script: SCRIPT, params } }
    if (!mirror) { ses.mirrorFaceKey=null; ses.mirror = ctx.spawn({ audience: 'local', feetPosition: pos, rotation: rot, ...look, material: HUMAN && !worn ? null : { outline: { color: '#1d1420', width: 2.4 } }, jiggle: { bones: ['Tail*', 'Ear*'], amount: 0.6, bounce: 0.6 }, light: { kind: 'point', color: '#fff2d8', intensity: 2, distance: 4 } }); const m = ctx.getObject(ses.mirror); if (m) { if (HUMAN && MESH && !worn) seatHead(ctx, m, params) // a human mirror wears its own head and hair, never the species head
      m.anim.idle = { clip: worn || MESH ? GAIT_LIB.idle : 'Idle', loop: 'loop', weight: 1 }; if (!worn && !(HUMAN && MESH) && speciesOf(params) !== 'human') flair(m, face) } }
    else { mirror.feetPosition = pos; mirror.rotation = rot; if (ses.mirrorKey !== key) { if (worn) { mirror.primitive = null; mirror.model = wornModel(worn); dropHead(ctx, mirror); mirror.morph=null; mirror.bones={}; mirror.material=null; mirror.anim.flair = null; mirror.anim.idle = { clip: GAIT_LIB.idle, loop: 'loop', weight: 1 } } else if (MESH) { mirror.primitive = null; mirror.model = bodyModel(params); if (HUMAN) { seatHead(ctx, mirror, params); mirror.anim.idle = { clip: GAIT_LIB.idle, loop: 'loop', weight: 1 } } else { mirror.morph = bustMorph(params) ?? null; wearHead(ctx, mirror, params); flair(mirror, face) } } else { mirror.model = null; mirror.primitive = { kind: 'scripted', script: SCRIPT, params }; flair(mirror, face) } }
      if (MESH && !worn) { const mh = ctx.getObject(mirror.id + '/' + HEAD_ID); if (mh) mh.morph = faceMorph(face, false, isF, params) }
      if (worn && ctx.getObject(mirror.id + '/' + HEAD_ID)) dropHead(ctx, mirror) // the mirror wears a plymodel bare too
      mirror.bones = { ...(!HUMAN ? { Head: { scale: hs * FURRY_HEAD }, ...armSplay() } : {}), ...(ts !== 1 ? { Tail: { scale: ts } } : {}) } }
    ses.mirrorKey = key
    if(HUMAN && MESH && !worn && ses.mirrorFaceKey!==ses.hFaceK){const m=ctx.getObject(ses.mirror);if(m){m.morph=ctx.self.morph;ses.mirrorFaceKey=ses.hFaceK}}
    if (ses.mirror) {
      if (ses.mirrorHeldKind !== eq) {
        ses.mirrorHeldKind = eq
        if (ses.mirrorHeldId) { try { ctx.destroy(ses.mirrorHeldId) } catch (e) {} ses.mirrorHeldId = null }
        if (eq !== 'fists') {
          const bk = baseOf(eq), g = HOLD[bk] ?? 0
          ses.mirrorHeldId = ctx.spawn({
            parent: ses.mirror,
            attachment: { bone: 'RightHand' },
            feetPosition: { x: 0, y: 0, z: -g },
            audience: 'local',
            ...weaponBody(eq),
          })
        }
      }
    }
  } else if (ses.mirror) {
    if (ses.mirrorHeldId) { try { ctx.destroy(ses.mirrorHeldId) } catch (e) {} ses.mirrorHeldId = null }
    ses.mirrorHeldKind = null
    ctx.destroy(ses.mirror); ses.mirror = null; ses.mirrorKey = null; ses.mirrorFaceKey=null
  }
}

function wornModel(w) { return w.name ? w.url : { id: w.url, forward: '+x' } } // a player's own .plymodel upload faces +X once clips play on it (Nov 11 test: bare and +z stood sideways, -x backwards, +x forward); catalog models already face -Z
function dropHead(ctx, o) { clearAppearance(ctx,o) }
// the species head (face, ears, tail) rides the body's rig as a skinned child; restyled when the look changes
function wearHead(ctx, o, l) { seatHead(ctx,o,{...l,vary:false}) }

