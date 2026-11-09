// The wanderer: walk/sprint on stamina, sanity that the halls eat, a flashlight on battery,
// almond water, swings at smilers, xp and levels. Every number lives in lib/data/level0.yml.
// player.state is the player's save: their level, xp and almonds follow them between visits.
import { canOpen, openWrist } from './lib/screen.js'
import { heard } from "./lib/hear.js";
import PLAYER from './lib/data/player.yml'
import L from './lib/data/level0.yml'
import W, { baseOf } from './lib/weapons.js'
import { raycast } from 'builtin/physics'
import BRK from './lib/data/breakables.yml'
import { strike } from './lib/breakables.js'
import { startFishing, handleFishingClick, onFishNibble, onFishBite, finishFishingCatch, cancelFishing } from './lib/fishing.js'
import { fire as fireBullets, show as showBullets } from './lib/ballistics.js'
import { swing3, fire3 } from './lib/body3.js'
import { dropLoot, rollLoot, spawnWeapon, poolOf, spawnRemains } from './lib/loot.js'
import { becomeCorpse } from './lib/l5-hostile.js'
import { markKill } from './lib/witness.js'
import { repKill } from './lib/rep.js'
import D from './lib/data/difficulty.yml'
import { penOf, vary } from './lib/combat.js'
import { derived, canCarry, burden, npcMul, START, dmgMul, handling, skillsOf, spentOf, SKILLS, SKILL_MAX, dmgAfterArmor, lookOfNpc } from './lib/stats.js'
import { parseCloth, wear, takeOff, wornRows, fullLook } from './lib/clothes.js'
import { wMul, jamChance, isBroken, useWear, armorWearFor, cndOf, repairAmount, armorCnd, band } from './lib/condition.js'
import { weaponBody, HOLD, MESHGRIP } from './lib/weapon-look.js'
import { HUMAN, humanBody } from './lib/critter-model.js'
import { zoneAt, cellAt, cellCenter, N, HALF, EXIT } from './lib/maze.js'
import { zoneAt as zoneAt1 } from './lib/level1.js'
import L1 from './lib/data/level1.yml'
import { zoneAt as zoneAt2 } from './lib/level2.js'
import { zoneAt as zoneAt21 } from './lib/level21.js'
import L21 from './lib/data/level21.yml'
import L2 from './lib/data/level2.yml'
import { zoneAt as zoneAt3 } from './lib/level3.js'
import { zoneAt as zoneAt4, DRAIN4 } from './lib/level4.js'
import { zoneAt as zoneAt5, DRAIN5 } from './lib/level5.js'
import L3 from './lib/data/level3.yml'
const zoneHere = (ctx, x, z) => ctx.self.place === 'spamton' ? 'spam_arena' : ctx.self.place === 'level7' ? (Math.hypot(x - 46, z + 120) < 34 ? 'l7_seawatch' : Math.hypot(x + 70, z + 95) < 55 ? 'l7_fort' : z > -4 && Math.hypot(x, z) < 12 ? 'l7_room1' : z > -36 && Math.abs(x) < 10 ? 'l7_pier' : 'l7_sea') : ctx.self.place === 'level1' ? 'l1_' + zoneAt1(x, z) : ctx.self.place === 'level2' ? 'l2_' + zoneAt2(x, z) : ctx.self.place === 'level3' ? 'l3_' + zoneAt3(x, z) : ctx.self.place === 'gamma' ? 'l3_gamma' : ctx.self.place === 'level4' ? 'l4_' + zoneAt4(x, z, ctx.self.state.home) : ctx.self.place === 'level5' ? 'l5_' + (zoneAt5(x, z)?.id ?? 'lobby') : ctx.self.place === 'level6' ? 'l6_halls' : ctx.self.place === 'level61' ? 'l61_court' : ctx.self.place === 'level11' ? 'l11_city' : ctx.self.place === 'level10' ? 'l10_fields' : ctx.self.place === 'level8' ? 'l8_cave' : ctx.self.place === 'level21' ? 'l21_' + zoneAt21(x, z) : (ctx.place?.state?.moments?.manilaAt && Math.abs(x - ctx.place.state.moments.manilaAt.x) < 5.8 && Math.abs(z - ctx.place.state.moments.manilaAt.z) < 5.8 ? 'manila' : zoneAt(x, z))

import SOUNDS from './lib/data/sounds.yml'
import { stepTick } from './lib/footsteps.js'
import { useCompass, COMPASS } from './lib/compass.js'
import L3I from './lib/data/l3items.yml'
import CR from './lib/data/craft.yml'
import AW from './lib/data/almond.yml'
import { MEAT } from './lib/items.js'
import SNACKS from './lib/data/snacks.yml'
const sndTurn = {}
const SND = (n) => { const takes = SOUNDS[n]; if (!takes?.length) return `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`; sndTurn[n] = ((sndTurn[n] ?? -1) + 1 + (takes.length > 2 ? Math.floor(takes.length / 2) : 0)) % takes.length; return takes[sndTurn[n]] }
const ZAP = `fx
pop arc burst=18..26 life=.12..0.3 v=sdir()*(2.5..5) size=.03..0.06 acc=drag(3) col=hdr(3,4,6)>hdr(1.2,1.8,4) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop glow burst=1 life=.18 col=<.6,.8,1> a=1>0 r=light(<.6,.8,1>,6,4)`
const EMBER = `fx
pop ember burst=8..12 life=.4..0.8 v=up(.6..1.4)+sdir()*(.6..1.2) size=.02..0.04 acc=grav()*.3+drag(1.2) col=hdr(4,1.6,.3)>hdr(1.6,.4,.05) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)`
const CLEAR = `fx
pop blood burst=16..22 life=.4..0.8 v=sdir()*(1.2..2.6)+up(.8) size=.025..0.05 acc=grav()+drag(.4) col=<.82,.88,.86> a=.55 sz=$size floor=stick r=sprite(soft-disc,alpha,velocity,.02)
pop sheen burst=6 life=.3..0.5 v=sdir()*(1..2) size=.03..0.05 acc=grav() col=hdr(1.3,1.4,1.4) a=.7>0 r=sprite(soft-disc,add)`
const ICHOR = `fx
pop ichor burst=18..26 life=.5..0.9 v=sdir()*(1.5..3.2)+up(1) size=.04..0.09 acc=grav()*.8+drag(1.2) col=<.04,.03,.05> a=1>.6:1>0 sz=$size floor=stick r=sprite(soft-disc,alpha)
pop smoke burst=4..6 life=.6..1 v=sdir()*(.3..0.7) size=.25..0.4 acc=buoy(.4)+drag(1.5) col=<.06,.05,.07> a=0>.15:.5>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`

export const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? derived(s).hpBonus : 0)
export const maxSan = (lv, s) => L.sanity + (lv - 1) * L.perLevel.sanity + (s?.attr ? derived(s).sanBonus : 0)
export const xpNeed = (lv) => L.xpBase * lv

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',') : [])]
const usable = (s, k) => !!W[k] // no level lock on weapons (Shelly, #37: any weapon you hold works)
export const weaponOf = (s) => W[s.equipped] ?? W.fists

const DOWN_MS = 3200 // how long you watch yourself lie there (Savi's pick); camera.js and the creatures read the same window
// checkpoints: each place's safe spawn plus every doorway's arrival marker; you wake at the nearest one
const CHECKS = { main: ['main-from-l1'], level1: ['l1-from-main', 'l1-from-l2'], level2: ['l2-from-l1', 'l2-from-l3', 'l2-from-l21'], level21: ['l21-from-l2', 'l21-from-l8'], level3: ['l3-from-l2', 'l3-gamma-door', 'l3-lift-arrive', 'l3-from-l5'], level4: ['l4-lift-arrive', 'l4-from-l5'], level5: ['l5-from-l3', 'l5-from-l4', 'l5-from-l6', 'l5-lobby'], level6: ['l6-from-l5', 'l6-from-l7', 'l6-from-l61'], level61: ['l61-from-l6', 'l61-from-l4', 'l61-arrive'], level11: ['l11-from-l61', 'l11-spawn'], level7: ['l7-from-l6', 'l7-seawatch-spawn', 'l7-fort-spawn'], level8: ['l8-from-l7', 'l8-from-camp', 'l8-from-l21'], gamma: [] }
function nearestCheckpoint(ctx, at) {
  const sp = ctx.place.defaultSpawnPoint ?? {}, yaw0 = ctx.place.defaultSpawnRotation?.yaw
  let best = { pos: { x: sp.x ?? 0, y: 0.1, z: sp.z ?? 0 }, rot: yaw0 }, bd = Math.hypot(best.pos.x - at.x, best.pos.z - at.z)
  for (const id of CHECKS[ctx.self.place] ?? []) {
    const o = ctx.getObject(id); if (!o) continue
    const f = o.feetPosition, d = Math.hypot(f.x - at.x, f.z - at.z)
    if (d < bd) { bd = d; best = { pos: { x: f.x, y: (f.y ?? 0) + 0.1, z: f.z }, rot: typeof o.rotation === 'number' ? o.rotation : o.rotation?.yaw } }
  }
  return best
}
function walkOf(ctx) { return (ctx.self.session['player.js'] ??= {}) }

function ensure(ctx) {
  const s = ctx.self.state
  if (s.level == null) Object.assign(s, { level: 1, xp: 0, hp: L.hp, sanity: L.sanity, stamina: L.stamina, battery: L.battery, almonds: 2, visited: '', kills: 0, escapes: 0, deaths: 0, weapons: '', equipped: 'fists', ...START })
}

function decode(hex) { const v = new Uint8Array(N * N); for (let i = 0; i < hex.length; i++) { const n = parseInt(hex[i], 16); for (let b = 0; b < 4; b++) if (n & (1 << b)) v[i * 4 + b] = 1 } return v }
function encode(v) { let s = ''; for (let i = 0; i < v.length; i += 4) s += (v[i] | (v[i + 1] << 1) | (v[i + 2] << 2) | (v[i + 3] << 3)).toString(16); return s }

function chest(ctx) { const p = ctx.self.feetPosition; return { x: p.x, y: p.y + 1.3, z: p.z } }
// what's underfoot, by place and room: each floor its own step, walk and run
const STEPS = {
  carpet: { walk: 'footstep-damp-carpet-squelch-soft', run: 'footstep-damp-carpet-run', v: 0.2 },
  concrete: { walk: 'footstep-boot-heel-on-bare-concrete-floor-single-step', run: 'footstep-boot-running-on-bare-concrete-floor-single-step', v: 0.22 },
  tile: { walk: 'footstep-sneaker-on-vinyl-school-floor-tile-single-step', run: 'footstep-sneaker-running-on-vinyl-floor-tile-single-step', v: 0.22 },
  gravel: { walk: 'footstep-boot-crunch-on-loose-cave-gravel-single-step', run: 'footstep-boot-running-on-loose-cave-gravel-single-step', v: 0.26 },
  wood: { walk: 'footstep-boot-on-wet-wooden-floorboards-creak-single-step', run: 'footstep-boot-running-on-wet-wooden-floorboards-single-step', v: 0.24 },
  hotel: { walk: 'footstep-shoe-on-thick-plush-hotel-hallway-carpet-single-step', run: 'footstep-shoe-running-on-thick-hotel-carpet-single-step', v: 0.2 },
  office: { walk: 'footstep-shoe-on-low-pile-office-carpet-tile-single-step', run: 'footstep-shoe-running-on-low-pile-office-carpet-single-step', v: 0.2 },
  terrazzo: { walk: 'footstep-sneaker-on-polished-mall-terrazzo-floor-squeak-single-step', run: 'footstep-sneaker-running-on-polished-mall-floor-single-step', v: 0.24 },
  checker: { walk: 'footstep-boot-on-worn-checkered-linoleum-locker-room-single-step', run: 'footstep-boot-running-on-worn-linoleum-tile-single-step', v: 0.23 },
  metal: { walk: 'footstep-boot-on-steel-diamond-plate-floor-clank-single-step', run: 'footstep-boot-running-on-steel-diamond-plate-floor-single-step', v: 0.24 },
}
const CONCRETE = new Set(['level1', 'level2', 'level3', 'gamma', 'level6', 'level11', 'debug'])
function floorOf(ctx) {
  const pl = ctx.self.place
  if (pl === 'level8') return 'gravel'
  if (pl === 'level10') return 'field'
  if (pl === 'level7') return 'wood'
  if (pl === 'level61') return 'terrazzo'
  if (pl === 'level4') return 'office'
  if (CONCRETE.has(pl)) return 'concrete'
  if (pl === 'level21') { const z = zoneHere(ctx, ctx.self.feetPosition.x, ctx.self.feetPosition.z); return z === 'l21_edge' || z === 'l21_edgecave' ? 'concrete' : z === 'l21_lockers' || z === 'l21_restroom' ? 'checker' : 'tile' }
  if (pl === 'level61') return 'terrazzo'
  if (pl === 'level4') return 'office'
  if (pl === 'level5') { const z = String(zoneHere(ctx, ctx.self.feetPosition.x, ctx.self.feetPosition.z) ?? ''); return /boil|furnace|pipe|engine/.test(z) ? 'metal' : 'hotel' }
  return 'carpet'
}
function sound(ctx, name, volume = 0.7, mine = false) {
  heard(ctx, { clip: SND(name), position: chest(ctx), volume, maxDistance: 30 }, mine ? { audience: { player: ctx.self.id } } : undefined)
}

const nowMsg = (ctx) => ctx.now()
export function gain(ctx, n) {
  const s = ctx.self.state
  const got = Math.round(n * derived(s).xp)
  if (got <= 0) return
  s.xp += got
  const now0 = ctx.now(), prev = s.xpPop
  s.xpPop = { n: prev && now0 - prev.at < 1500 ? prev.n + got : got, at: now0 } // new vegas: gains in a burst add up in one tick-up
  ctx.emit('playSound', { clip: 'cdn/sfx-cash-register-cha-ching-bell-and-drawer.mp3', volume: 0.45, bus: 'UI', mode: 'restart' })
  while (s.xp >= xpNeed(s.level)) {
    s.xp -= xpNeed(s.level); s.level += 1
    s.hp = maxHp(s.level, s); s.sanity = maxSan(s.level, s); s.leveledAt = ctx.now()
    s.notice = { text: `Level up! You reached level ${s.level}.`, at: ctx.now() }
    s.lvlPrompt = true; s.levelUpAt = ctx.now() // HALOGEN waits: the HUD asks you to press K (Shelly, 2026-11-07)
    ctx.emit('playSound', { clip: 'cdn/moodboard-realistic-gritty/sfx-level-up-jingle-retro-terminal-chime-rising-three-notes.mp3', volume: 0.6, bus: 'UI' })
    s.spts = (s.spts ?? 0) + derived(s).skillPerLevel
    sound(ctx, 'eerie-low-chime-level-up', 0.85, true)
    ctx.emit('milestone', { step: s.level, name: `level ${s.level}` }, { audience: { player: ctx.self.id } })
  }
}

// Apply one looted item (a token from scripts/lib/items.js) to the player. Returns { ok } or { ok: false, msg }.
// Nothing is picked up by walking over it: scripts/interact.js calls this when you press E on what you are looking at.
// eaten food also feeds hunger (scripts/craft.js drains it)
export function takeToken(ctx, token) {
  const r = takeToken0(ctx, token), f = CR.food[token]
  if (r.ok && f && !SNACKS[token]) { const s = ctx.self.state; s.hunger = Math.min(100, (s.hunger ?? 100) + f) }
  return r
}
function takeToken0(ctx, token) {
  const s = ctx.self.state, now = ctx.now()
  if (token.startsWith('cash:')) { s.cents = (s.cents ?? 0) + (+token.slice(5) || 1); sound(ctx, 'loot-take-all-rustle', 0.35, true); return { ok: true } } // Backdollars: a wallet, no weight
  const cw = canCarry(s, token); if (!cw.ok) return cw
  if (SNACKS[token] && !token.startsWith('cloth:')) { // food and aid are carried, never used on pickup: I > Aid eats or uses one
    const v = SNACKS[token]
    s.snacks = { ...(s.snacks ?? {}), [token]: (s.snacks?.[token] ?? 0) + 1 }; s.pickedAt = now
    const prev = s.notice && now - s.notice.at < 400 && /in your bag$/.test(s.notice.text) ? s.notice.text.replace(/ · in your bag$/, '') + ', ' : ''
    s.notice = { text: `${prev}${v.name} · in your bag`, at: now }
    sound(ctx, v.drink ? 'plastic-bottle-pickup-rattle' : 'loot-take-all-rustle', 0.6, true)
    return { ok: true }
  }
  if (token.startsWith('cloth:')) { // a garment: into the bag (player.state.clothes); I > Apparel puts it on
    if (!parseCloth(token)) return { ok: false, why: 'Rags' }
    s.clothes = [s.clothes, token].filter(Boolean).join(','); s.pickedAt = now
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true)
    return { ok: true }
  }
  if (BRK.scrap[token]) { // building scrap: counted per kind in player.state.scrap
    s.scrap = { ...(s.scrap ?? {}), [token]: (s.scrap?.[token] ?? 0) + 1 }; s.pickedAt = now
    sound(ctx, 'pickup-ammo', 0.5, true)
    return { ok: true }
  }
  if (token === 'almond' || token.startsWith('almond:')) { // a found bottle rolls its colour; grey stays s.almonds (the barter currency)
    let c = token.slice(7)
    if (!AW[c]) { let r = ctx.random() * Object.values(AW.weights).reduce((a, b) => a + b, 0); c = 'grey'; for (const [k, wt] of Object.entries(AW.weights)) { if ((r -= wt) < 0) { c = k; break } } }
    const key = AW_KEY[c]; s[key] = (s[key] ?? 0) + 1; gain(ctx, L.xpAlmond); s.pickedAt = now
    if (c !== 'grey') s.notice = { text: `${AW[c].name}`, at: now }
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.75, true)
    return { ok: true }
  }
  if (token.startsWith('meat:')) { // meat: counted per cut in player.state.meat (Samantha trades readings for it); I > Aid eats one
    const c = token.slice(5); if (!MEAT[c]) return { ok: false, msg: 'Spoiled' }
    s.meat = { ...(s.meat ?? {}), [c]: (s.meat?.[c] ?? 0) + 1 }; s.pickedAt = now
    sound(ctx, 'wrapped-meat-pickup-squish', 0.5, true)
    return { ok: true }
  }
  if (token === 'ammo') {
    s.ammo = (s.ammo ?? 0) + W.ammo.perPickup; s.pickedAt = now
    sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'shells') {
    s.shells = (s.shells ?? 0) + W.shells.perPickup; s.pickedAt = now
    sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'royal_ration') { // Level 3's rare tin: eaten on the spot, all of it
    s.hp = maxHp(s.level, s); s.sanity = Math.min(maxSan(s.level, s), (s.sanity ?? 0) + L3I.royal_ration.sanity)
    s.pickedAt = now; gain(ctx, L.xpAlmond); s.notice = { text: 'You eat the royal ration. You feel whole again', at: now }
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
    return { ok: true }
  }
  if (token === 'bobbypin' || token === 'pin' || token === 'bobby_pin') { s.bobbypins = (s.bobbypins ?? 0) + 1; s.pickedAt = now; s.notice = { text: `Bobby pin (${s.bobbypins} carried)`, at: now }; sound(ctx, 'pickup-ammo', 0.5, true); return { ok: true } }
  if (token === 'firesalt') { s.firesalt = (s.firesalt ?? 0) + 1; s.pickedAt = now; sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true } }
  if (token.startsWith('page:')) { // a torn notebook page: kept and read now
    const n = parseInt(token.slice(5)) || 1, have = String(s.pages ?? '').split(',').filter(Boolean)
    if (!have.includes(String(n))) have.push(String(n))
    s.pages = have.join(','); s.reading = n; s.pickedAt = now
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true)
    return { ok: true }
  }
  if (token === 'ration' || token === 'bandage') { // eaten or wrapped on the spot
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s)
    s.hp = Math.min(mh, (s.hp ?? mh) + (token === 'ration' ? L1.rationHp * derived(s).heal : L1.bandageHp * derived(s).healMed))
    if (token === 'ration') s.sanity = Math.min(ms, (s.sanity ?? ms) + L1.rationSanity)
    s.pickedAt = now; gain(ctx, L.xpAlmond)
    sound(ctx, token === 'ration' ? 'plastic-bottle-pickup-rattle' : 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'bread') {
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s)
    s.hp = Math.min(mh, (s.hp ?? mh) + 40 * derived(s).heal)
    s.sanity = Math.min(ms, (s.sanity ?? ms) + 25)
    s.pickedAt = now; gain(ctx, 30)
    s.notice = { text: 'Warm Homestead Loaf. Delicious fresh bread restores +40 HP and +25 Sanity!', at: now }
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
    return { ok: true }
  }
  if (token === 'wheat_sheaf') {
    s.wheat = (s.wheat ?? 0) + 1; s.pickedAt = now
    s.notice = { text: `Golden Wheat Sheaf (${s.wheat} carried) · Grind at the Windmill Quern`, at: now }
    sound(ctx, 'pickup-ammo', 0.6, true)
    return { ok: true }
  }
  if (token === 'flour_sack') {
    s.flour = (s.flour ?? 0) + 1; s.pickedAt = now
    s.notice = { text: `Sack of Fresh Flour (${s.flour} carried) · Bake at the Farmhouse Hearth`, at: now }
    sound(ctx, 'pickup-ammo', 0.6, true)
    return { ok: true }
  }
  if (token === 'lobby_wafer') { // Level 0's own snack: stale yellow wafers in every third desk drawer (Savi made it up)
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s), U = L2.use
    s.hp = Math.min(mh, (s.hp ?? mh) + U.waferHp * derived(s).heal); s.sanity = Math.min(ms, (s.sanity ?? ms) + U.waferSanity)
    s.pickedAt = now; s.notice = { text: 'Lobby Wafers. Crunchy, somehow damp.', at: now }
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.6, true)
    return { ok: true }
  }
  if (SNACKS[token]) { // Level 6.1's real snacks: into the bag (player.state.snacks); the inventory eats or drinks them
    const v = SNACKS[token]
    s.snacks = { ...(s.snacks ?? {}), [token]: (s.snacks?.[token] ?? 0) + 1 }; s.pickedAt = now
    const prev = s.notice && now - s.notice.at < 400 && /in your bag$/.test(s.notice.text) ? s.notice.text.replace(/ · in your bag$/, '') + ', ' : ''
    s.notice = { text: `${prev}${v.name} · in your bag`, at: now }
    sound(ctx, v.drink ? 'plastic-bottle-pickup-rattle' : 'loot-take-all-rustle', 0.6, true)
    return { ok: true }
  }
  return takeToken1(ctx, token)
}
export function useSnack(ctx, token) { // consume one from the bag
  const s = ctx.self.state, now = ctx.now(), n = s.snacks?.[token] ?? 0
  if (n <= 0 || !SNACKS[token]) return
  s.snacks = { ...s.snacks, [token]: n - 1 }
  {
    const v = SNACKS[token], mh = maxHp(s.level, s), ms = maxSan(s.level, s)
    s.hp = Math.min(mh, (s.hp ?? mh) + v.hp * (v.aid ? derived(s).healMed : derived(s).heal)); s.sanity = Math.min(ms, (s.sanity ?? ms) + v.sanity)
    s.hunger = Math.max(0, Math.min(100, (s.hunger ?? 100) + v.hunger)); s.thirst = Math.max(0, Math.min(100, (s.thirst ?? 100) + v.thirst))
    if (v.drunk) { s.drunk = Math.min(100, (s.drunk ?? 0) + v.drunk); s.drunkAt = now }
    if (v.stamina) { const w = walkOf(ctx); w.stamina = Math.min(L.stamina * 2, (w.stamina ?? s.stamina ?? 0) + v.stamina) }
    s.pickedAt = now; s.notice = { text: `${v.name}. ${v.drink ? `Thirst +${v.thirst}` : `Hunger +${v.hunger}`}`, at: now }
    sound(ctx, v.drink ? 'drinking-gulp-swallow' : 'eating-chewing-food', 0.7, true)
  }
}
function takeToken1(ctx, token) {
  const s = ctx.self.state, now = ctx.now()
  if (token === 'beans' || token === 'bar' || token === 'firstaid') { // Level 2 food and first aid, used on the spot
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s), U = L2.use
    s.hp = Math.min(mh, (s.hp ?? mh) + (token === 'beans' ? U.beansHp * derived(s).heal : token === 'bar' ? U.barHp * derived(s).heal : U.firstaidHp * derived(s).healMed))
    if (token === 'beans') s.sanity = Math.min(ms, (s.sanity ?? ms) + U.beansSanity)
    if (token === 'bar') { const w = walkOf(ctx); w.stamina = Math.min(L.stamina * 2, (w.stamina ?? s.stamina ?? 0) + U.barStamina) }
    s.pickedAt = now; gain(ctx, L.xpAlmond)
    sound(ctx, token === 'firstaid' ? 'pickup-ammo' : 'plastic-bottle-pickup-rattle', 0.7, true)
    return { ok: true }
  }
  if (token === 'tape' || token === 'kit' || token === 'akit') { // repair items are carried (I menu > REPAIR): weapon kit, armor kit, duct tape
    const key = { tape: 'tapes', kit: 'kits', akit: 'akits' }[token]
    s[key] = (s[key] ?? 0) + 1; s.pickedAt = now
    s.notice = { text: `${{ tape: 'Duct tape', kit: 'Weapon repair kit', akit: 'Armor repair kit' }[token]} (${s[key]} carried) · use it in the inventory (I)`, at: now }
    sound(ctx, 'pickup-ammo', 0.5, true)
    return { ok: true }
  }
  if (token === 'fuse' || token === 'valve' || token === 'keycard') { // Level 2 keys: carried until a door takes one
    const f = token + 's'; s[f] = (s[f] ?? 0) + 1; s.pickedAt = now
    s.notice = { text: `${token === 'fuse' ? 'Fuse' : token === 'valve' ? 'Valve wheel' : 'Keycard'} (${s[f]} carried)`, at: now }
    sound(ctx, 'pickup-ammo', 0.6, true)
    return { ok: true }
  }
  if (token === 'nvg') { // night vision goggles: they make no light, so Level 6's dark can't eat them (Savi's pick, Shelly asked for a way to see)
    if (s.nvg) { s.nvgSpare = (s.nvgSpare ?? 0) + 1; s.pickedAt = now; s.notice = { text: `Spare night vision goggles (${s.nvgSpare}) · swap in when the battery dies`, at: now }; sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true } } // a duplicate is a full spare, not wasted
    s.nvg = true; s.pickedAt = now; s.notice = { text: 'Night vision goggles · Press F to activate · Essential in the anomalous darkness of Level 6', at: now }
    sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true }
  }
  if (token === 'compass') { // an old compass: a few reads left in it (G uses it)
    s.compass = (s.compass ?? 0) + COMPASS.charges; s.pickedAt = now
    s.notice = { text: `Old compass · ${s.compass} reads · press G`, at: now }
    sound(ctx, 'pickup-ammo', 0.5, true)
    return { ok: true }
  }
  if (token === 'battery') {
    const w = walkOf(ctx); w.battery = Math.min(100, (w.battery ?? s.battery ?? 0) + L1.batteryCharge); s.battery = Math.round(w.battery)
    s.pickedAt = now; sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token.startsWith('book:')) { // a skill book: +3 to that skill, read on the spot
    const i = SKILLS.findIndex((k) => k.k === token.slice(5))
    if (i < 0) return { ok: false, msg: '' }
    if (skillsOf(s)[SKILLS[i].k] >= SKILL_MAX) return { ok: false, msg: `${SKILLS[i].name} is already 100` }
    const sp = spentOf(s); sp[i] += 3; s.skl = sp.join(',')
    s.pickedAt = now; s.notice = { text: `You read the book: ${SKILLS[i].name} +3`, at: now }; gain(ctx, L.xpAlmond)
    sound(ctx, 'pickup-weapon', 0.5, true)
    return { ok: true }
  }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7)
    if (!W[k]) return { ok: false, msg: '' }
    s.weapons = [...owned(s).slice(1), k].join(',')
    if (W[k].magSize) s['loaded_' + k] = W[k].magSize
    if (W[k].cnd != null && !owned(s).slice(0, -1).includes(k)) s['cnd_' + k] = W[k].cnd // a rusty find comes worn, an M.E.G. one pristine
    if (usable(s, k) && W[k].damage > weaponOf(s).damage) s.equipped = k
    s.pickedAt = now; s.gotWeapon = W[k].name
    if (baseOf(k) === 'fishing_rod') s.notice = { text: 'Salvaged fishing rod · Cast into Level 10\'s lake, Level 11\'s canal, or Level 7\'s sea to fish!', at: now }
    gain(ctx, W[k].xp ?? L.xpAlmond)
    sound(ctx, 'pickup-weapon', 0.7, true)
    return { ok: true }
  }
  return { ok: false, msg: '' }
}

export function onInput(ctx, input) {
  const w = walkOf(ctx)
  const sin = input.axes.aimYawSin ?? 0, cos = input.axes.aimYawCos ?? 1
  w.fwd = { x: -sin, z: -cos }
  const mx = input.axes.moveX ?? 0, mz = input.axes.moveZ ?? 0, mag = Math.hypot(mx, mz)
  const nx = mag > 1 ? mx / mag : mx, nz = mag > 1 ? mz / mag : mz
  w.dir = { x: cos * nx - sin * nz, z: -(sin * nx + cos * nz) }
  // on a phone, pushing the stick all the way runs: no sprint button to hold beside it
  if (input.pressed.walk) w.walkMode = !w.walkMode // caps lock: a slow, steady walk until pressed again
  w.sprint = !!input.held.sprint || (input.axes.touchActive === 1 && Math.hypot(input.axes.moveX ?? 0, input.axes.moveZ ?? 0) > 0.95)
  if (input.pressed.crouch) ctx.self.state.crouch = !ctx.self.state.crouch // ctrl toggles a crouch: slow, quiet, low
  if (ctx.self.state.crouch && (input.pressed.jump || (w.sprint && Math.hypot(mx, mz) > 0.1))) ctx.self.state.crouch = false // jumping or running stands you up
  if (input.pressed.jump && ctx.self.grounded && !ctx.self.parent) {
    const v = ctx.self.velocity
    ctx.self.velocity = { x: v.x, y: PLAYER.jumpSpeed, z: v.z }
    sound(ctx, (STEPS[floorOf(ctx)] ?? Object.values(STEPS)[0]).walk, 0.4, true)
  }
  {
    // melee: hold to wind up, release to swing (a heavy past power.min); a gun fires on the press
    const sv = ctx.self.state, aw = weaponOf(sv), P = W.power
    if (sv.invOpen || sv.lootOpen) { if (sv.chargeAt) sv.chargeAt = 0 } // a click on a menu is no swing
    else if (ctx.self.state.building) { if (sv.chargeAt) sv.chargeAt = 0 }
    else if (ctx.self.state.sheathed) { if (sv.chargeAt) sv.chargeAt = 0; if (input.pressed.attack) { toggleHolster(ctx); walkOf(ctx).nextSwing = ctx.now() + 450 } } // holstered: a click draws (fallout), it never hits
    else if (sv.fishingState) { if (sv.chargeAt) sv.chargeAt = 0; if (input.pressed.attack) handleFishingClick(ctx, sv, walkOf(ctx)) }
    else if (sv.equipped === 'soup_bowl') { if (sv.chargeAt) sv.chargeAt = 0; if (input.pressed.attack) soupThrow(ctx) } // the bowl: a click throws it
    else if (aw.ranged) { if (sv.chargeAt) sv.chargeAt = 0; if (input.pressed.attack || (aw.auto && input.held.attack)) swing(ctx) }
    else {
      if (input.pressed.attack && !sv.chargeAt && ctx.now() >= (walkOf(ctx).nextSwing ?? 0)) { sv.chargeAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.3, true) }
      if (input.released.attack && sv.chargeAt) {
        const t = Math.min(1, (ctx.now() - sv.chargeAt) / (P.charge * 1000)); sv.chargeAt = 0
        swing(ctx, t >= P.min ? t : 0)
      }
    }
  }
  if (input.pressed.inventory) { const sv = ctx.self.state; if (sv.invOpen) sv.invOpen = false; else if (canOpen(sv, ctx.self.place, 'inventory')) openWrist(sv, 'inventory'); sound(ctx, 'flashlight-switch-click', 0.35, true) }
  if (input.pressed.inv && input.actionData?.inv) invAction(ctx, input.actionData.inv)
  if (input.pressed.drink) { if (ctx.self.state.equipped === 'soup_bowl') soupEat(ctx); else drink(ctx) } // holding the soup, Q eats it
  if (input.pressed.splash) splash(ctx)
  if (input.pressed.compass) useCompass(ctx)
  if (input.pressed.cycleWeapon && !ctx.self.state.building) cycleWeapon(ctx)
  if (input.pressed.holster) toggleHolster(ctx) // H: put it away, H again: draw the last one
  { // R: a tap reloads, a hold (0.45 s) holsters or draws (Fallout)
    const w = walkOf(ctx), bld = ctx.self.state.building
    if (input.pressed.reload && !bld) { w.rDown = ctx.now(); w.rHeld = false }
    if (w.rDown && input.held.reload && !w.rHeld && ctx.now() - w.rDown >= 450) { w.rHeld = true; toggleHolster(ctx) }
    if (input.released.reload || (w.rDown && !input.held.reload)) { if (w.rDown && !w.rHeld && !bld) startReload(ctx); w.rDown = 0; w.rHeld = false } // R turns the piece in build mode
  }
  {
    // aiming down the sights: a ranged weapon, button held, not mid-reload, not downed
    const sv = ctx.self.state, aw = W[sv.equipped]
    const ads = !!(input.held.aim && aw?.ranged && !sv.reloading && !(sv.downAt && ctx.now() - sv.downAt < 1200))
    if (!!sv.ads !== ads) { sv.ads = ads; if (ads) sv.adsAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.25, true) }
  }
  if (input.pressed.flashlight) toggleLight(ctx)
}

export function hitTarget(ctx, s, m, dmg, f, loud = true, heavy = 0, pen = 0, pellets = 1) {
  dmg = Math.max(1, Math.round(vary(ctx, dmg))) // every hit rolls its own 90% to 110% (data/combat.yml)
  if (s.studied && m.tags?.some((tg) => s.studied.split(',').some((k) => tg.includes(k)))) dmg = Math.round(dmg * 1.1) // read its Database page
  const npc = m.tags?.includes('npc')
  if (npc && m.state?.follow && ctx.place.players.some((p) => p.id === m.state.follow)) { // a companion: no friendly fire
    ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 1.7, z: m.feetPosition.z }, text: 'ALLY', color: '#9fd7ff', size: 0.8 }, { audience: { player: ctx.self.id } })
    return
  }
  if (npc) dmg = pellets > 1 ? pellets * dmgAfterArmor(lookOfNpc(m), dmg / pellets, false, pen) : dmgAfterArmor(lookOfNpc(m), dmg, false, pen) // an agent's or survivor's clothes soak the hit like yours do: a shotgun's pellets one by one, and a hit's armor penetration takes some of it off
  m.state.hp -= dmg
  if (npc || m.tags?.includes('l61fc')) { m.state.angry = { ...(m.state.angry ?? {}), [ctx.self.id]: true }; m.state.fresh = { ...(m.state.fresh ?? {}), [ctx.self.id]: true } } // the camp remembers who shot first; a fresh shot spreads even after a pardon
  const hit = { x: m.feetPosition.x, y: m.feetPosition.y + 1.5, z: m.feetPosition.z }
  if (loud) sound(ctx, 'heavy-pipe-hit-flesh-thud', 0.95)
  ctx.emit('damageNumber', { position: hit, value: dmg, color: '#f7d98b' })
  ctx.emit('fx', { position: hit, script: m.tags?.includes('stealer') ? CLEAR : ICHOR }) // blood runs clear, don't get near
  if (L3I.stun.kinds.includes(baseOf(s.equipped ?? 'fists'))) { // the baton arcs: sparks, a zap, and the thing struck staggers
    m.state.stunUntil = ctx.now() + L3I.stun.ms
    ctx.emit('fx', { position: hit, script: ZAP })
    sound(ctx, 'electric-zap-arc-crackle', 0.85)
  }
  if ((s.firesaltUntil ?? 0) > ctx.now() && !W[s.equipped]?.ranged) ctx.emit('fx', { position: hit, script: EMBER })
  ctx.emit('squash', { target: m.id, axis: 'y', intensity: 0.25, duration: 0.18 })
  ctx.emit('flash', { target: m.id, color: '#ffffff', duration: 0.1 })
  ctx.emit('hitstop', { duration: 0.06 + heavy * 0.07 }, { audience: { player: ctx.self.id } })
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.3 + heavy * 0.5 }, { audience: { player: ctx.self.id } })
  if (heavy) {
    ctx.emit('screenShake', { intensity: 0.25 * heavy, duration: 0.18 }, { audience: { player: ctx.self.id } })
    ctx.emit('shockwave', { position: hit, speed: 6, thickness: 0.3, intensity: 0.4 * heavy })
    ctx.emit('damageNumber', { position: { ...hit, y: hit.y + 0.4 }, text: 'HEAVY', color: '#ffb347', size: 1.2 })
  }
  if (m.state.hp <= 0 && !m.state.dead) {
    m.state.dead = true
    { const seen = markKill(ctx, m, ctx.self); if ((m.tags ?? []).includes('npc')) repKill(ctx, m, ctx.self, seen); if (!seen.length && s.crouch) s.notice = { text: 'Nobody saw that', at: ctx.now() } } // witnesses: scripts/lib/witness.js
    s.kills += 1
    gain(ctx, m.state?.kind === 'lurker' ? L.xpLurker : L.xpKill)
    const tg = m.tags ?? [], ent = tg.includes('smiler') || tg.includes('lurker')
    if (ent) dropLoot(ctx, m.feetPosition, tg.includes('lurker') ? 'Lurker remains' : 'Smiler remains', npcMul(m.state).loot, derived(s).clothFind, poolOf(ctx.self.place)) // only smilers and lurkers leave smiler/lurker remains
    else if (!npc && !tg.some((g) => g === 'l5staff' || g === 'l5rat' || g === 'l10worm' || g === 'l7beast' || g === 'remains' || g === 'spamboss')) becomeCorpse(ctx, m, (m.state?.name ?? 'Body').split(' ·')[0] + "'s body", rollLoot(ctx, npcMul(m.state).loot, derived(s).clothFind, poolOf(ctx.self.place)), ctx.self.feetPosition) // anything else stays its own body, limp and searchable // an agent's own body is searched (scripts/meg-agent.js)
  }
}

function swing(ctx, power = 0) {
  const w = walkOf(ctx), s = ctx.self.state, now = ctx.now(), P = W.power
  if (s.sheathed) return // holstered: nothing to swing
  if (s.building) return // B mode: the click places a piece (scripts/build.js)
  if (now < (w.nextSwing ?? 0) || (s.downAt && now - s.downAt < 1200)) return
  const wp = weaponOf(s)
  if (s.equipped !== 'fists' && isBroken(cndOf(s, s.equipped))) { w.nextSwing = now + 700; if (now - (w.brokeSay ?? 0) > 2500) { w.brokeSay = now; s.notice = { text: `Your ${wp.name.toLowerCase()} is BROKEN: repair it in the inventory (I)`, at: now } } return }
  if (s.equipped !== 'fists' && !s.reloading && ctx.random() < jamChance(cndOf(s, s.equipped)) * (wp.ranged ? 1 : 0.5)) {
    w.nextSwing = now + 650; s.jammedAt = now
    s.notice = { text: wp.ranged ? `JAM: your ${wp.name.toLowerCase()} will not cycle (${band(cndOf(s, s.equipped))})` : `Your ${wp.name.toLowerCase()} slips in your hand (${band(cndOf(s, s.equipped))})`, at: now }
    sound(ctx, 'flashlight-switch-click', 0.5, true)
    ctx.emit('screenShake', { intensity: 0.18, duration: 0.15 }, { audience: { player: ctx.self.id } })
    return
  }
  if (wp.ranged) power = 0
  const Hd = handling(s, wp) // what the weapon asks of you: too heavy for your Hardiness costs stamina and swing speed (scripts/lib/stats.js)
  if (power && (w.stamina ?? s.stamina) < wp.stamina * Hd.stam * P.stamina) power = 0 // too tired to put weight behind it: a light swing
  if ((w.stamina ?? s.stamina) < wp.stamina * Hd.stam) return
  s.loud = { at: now, gun: !!wp.ranged } // hunters hear it (lib/hunt.js)
  const heavyMul = power ? 1 + power * (P.damage - 1) : 1
  const ammoKey = wp.ammoType ?? 'ammo', loadedKey = 'loaded_' + s.equipped
  if (wp.ranged) {
    if (s.reloading) {
      // a shotgun can be fired mid-reload (the reload stops); a magazine gun has to finish
      if ((wp.pellets || wp.tube) && (s[loadedKey] ?? 0) > 0) cancelReload(ctx)
      else return
    }
    if ((s[loadedKey] ?? 0) <= 0) {
      w.nextSwing = now + 350
      if ((s[ammoKey] ?? 0) > 0) startReload(ctx)
      else { sound(ctx, 'gun-dry-fire-click', 0.6, true); s.dryAt = now }
      return
    }
    s[loadedKey] -= 1
    sound(ctx, wp.sound ?? (wp.pellets ? 'shotgun-blast-boom' : 'pistol-gunshot-echo'), 0.95)
    ctx.emit('screenFlash', { color: '#fff1c8', duration: 0.06, intensity: wp.pellets ? 0.45 : wp.auto ? 0.12 : 0.25 }, { audience: { player: ctx.self.id } })
    if (wp.spread) { // full auto: the barrel climbs and the cone opens the longer the trigger stays down; heat bleeds off between bursts
      w.heat = Math.min(1, (w.heat ?? 0) * Math.exp(-Math.max(0, now - (w.heatAt ?? 0)) / 350) + (wp.heatPer ?? 0.1)); w.heatAt = now
      ctx.emit('cameraPunch', { direction: { x: (ctx.random() - 0.5) * 0.4, y: 1, z: -0.3 }, intensity: 0.12 + w.heat * 0.18 }, { audience: { player: ctx.self.id } })
    }
    if (wp.pellets || wp.tube) {
      if (wp.pellets) ctx.emit('screenShake', { intensity: 0.35, duration: 0.2 }, { audience: { player: ctx.self.id } })
      ctx.after(wp.pump ?? 0.55, 'pumpRack', {})
    }
  }
  w.stamina = (w.stamina ?? s.stamina) - wp.stamina * Hd.stam * (power ? P.stamina : 1)
  w.nextSwing = now + wp.cooldown * 1000 * (power ? P.cooldown : 1) * derived(s).swing * Hd.swing
  s.swingHeavy = Math.round(power * 100) / 100
  s.swingAt = now
  { const st = (w.combo3 ??= { n: 0, at: 0 }); st.n = now - st.at > 1100 ? 0 : st.n + 1; st.at = now; if (wp.ranged) fire3(ctx); else swing3(ctx, s.equipped, power, st.n) } // the body's own swing, for the third-person camera and everyone else
  if (s.equipped !== 'fists') s['cnd_' + s.equipped] = Math.max(0, (s['cnd_' + s.equipped] ?? 100) - useWear(wp) * derived(s).wear) // weapons wear with use; Repair slows it
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  if (wp.ranged) { // real bullets: spread, drop and drag down each pellet's path (scripts/lib/ballistics.js)
    let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180
    const eye = { x: p.x, y: p.y + (s.crouch ? 1.0 : 1.45), z: p.z }, crit = ctx.random() < derived(s).crit
    const base = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * (crit ? D.crit : 1)
    let fv = f, pv = pc // in third person the shot goes from your eye to the point under the crosshair (scripts/camera.js keeps it in state.aimPt)
    if (s.tp && s.aimPt) { const dx = s.aimPt.x - eye.x, dy = s.aimPt.y - eye.y, dz = s.aimPt.z - eye.z, hh = Math.hypot(dx, dz); if (hh > 1.2) { fv = { x: dx / hh, z: dz / hh }; pv = Math.atan2(dy, hh) } }
    const res = fireBullets(ctx, s, wp, w, eye, fv, pv, base)
    const cp = Math.cos(pv), mz = { x: eye.x + fv.x * cp * 0.8 - fv.z * 0.12, y: eye.y + Math.sin(pv) * 0.8 - 0.14, z: eye.z + fv.z * cp * 0.8 + fv.x * 0.12 }
    showBullets(ctx, res, wp, mz)
    s.kick = Hd.recoil; s.spreadNow = Math.round(res.spread * 10) / 10 // vmpose scales the kick; the HUD can show the cone
    for (const t of res.targets) {
      const m = t.m
      if (t.head) ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2.2, z: m.feetPosition.z }, text: 'HEADSHOT', color: '#ffd23a', size: 1.2 })
      else if (crit) ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2, z: m.feetPosition.z }, text: 'CRIT', color: '#ff5a3a', size: 1.2 })
      hitTarget(ctx, s, m, Math.max(1, Math.round(t.dmg)), f, !wp.quiet, 0, penOf(wp, s.equipped), t.n ?? 1)
    }
    if (!res.targets.length && res.world) {
      const d = res.world.dir, h = Math.hypot(d.x, d.z) || 1
      strike(ctx, s, wp, s.equipped, base, { x: d.x / h, z: d.z / h }, Math.asin(Math.max(-1, Math.min(1, d.y))))
    }
    return
  }
  let cone = wp.cone || 0.4
  const radius = wp.ranged ? wp.range : wp.reach + 0.6 + power * P.reach
  const found = []
  for (const m of [...ctx.query({ tags: ['smiler'], radius }), ...ctx.query({ tags: ['lurker'], radius }), ...ctx.query({ tags: ['hound'], radius }), ...ctx.query({ tags: ['stealer'], radius }), ...ctx.query({ tags: ['moths'], radius }), ...ctx.query({ tags: ['l8spider'], radius }), ...ctx.query({ tags: ['npc'], radius }), ...ctx.query({ tags: ['l61fc'], radius }), ...ctx.query({ tags: ['spamboss'], radius }), ...ctx.query({ tags: ['l8-hostile'], radius, excludeTags: ['l8spider'] })]) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.3 && (dx * f.x + dz * f.z) / d < cone) continue
    if (wp.ranged) {
      const o = { x: p.x, y: p.y + 1.3, z: p.z }, tx = m.feetPosition.x - o.x, ty = m.feetPosition.y + 1.5 - o.y, tz = m.feetPosition.z - o.z, tl = Math.hypot(tx, ty, tz) || 1
      if (raycast(ctx, o, { x: tx / tl, y: ty / tl, z: tz / tl }, { distance: tl, physicsOnly: true, ignoreEntities: [m.id, ctx.self.id], bodies: 'static' })) continue
    }
    found.push({ m, d })
  }
  if (!wp.ranged) sound(ctx, 'pipe-whoosh-swing', wp.quiet ? 0.3 : power ? 0.9 : 0.55)
  if (!found.length) { // nothing alive in reach: the swing or shot lands on the world (walls, furniture, crates, what was built)
    let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180
    if (baseOf(s.equipped) === 'fishing_rod' && startFishing(ctx, s, w, p, f, pc, power)) return
    const sb = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * heavyMul * wMul(cndOf(s, s.equipped))
    strike(ctx, s, wp, s.equipped, sb, f, pc)
    return
  }
  const dv = derived(s), crit = ctx.random() < dv.crit
  if (wp.sneak && !wp.ranged) {
    found.sort((x, y) => x.d - y.d); if (unaware(ctx, s, found[0].m)) { // a blade in the back: x3, and the halls don't hear it
      const m = found[0].m, dmg = Math.round((wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * wp.sneak)
      ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2.2, z: m.feetPosition.z }, text: `SNEAK CRIT x${wp.sneak}`, color: '#ff3a3a', size: 1.3 })
      ctx.emit('hitstop', { duration: 0.04 }, { audience: { player: ctx.self.id } }); s.lastSneak = { id: m.id, dmg, at: now }
      sound(ctx, 'knife-stab-flesh-quiet', 0.6, true); hitTarget(ctx, s, m, dmg, f, false, 0, penOf(wp, s.equipped)); return
    }
  }
  const base = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * heavyMul * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * (crit ? D.crit : 1) * (!wp.ranged && (s.firesaltUntil ?? 0) > ctx.now() ? L3I.firesalt.damage : 1)
  if (crit) ctx.emit('damageNumber', { position: { x: found[0].m.feetPosition.x, y: found[0].m.feetPosition.y + 2, z: found[0].m.feetPosition.z }, text: 'CRIT', color: '#ff5a3a', size: 1.2 })
  if (wp.pellets) {
    // a spread of pellets: everything in the cone is hit, hard up close and weak at range
    for (const { m, d } of found) hitTarget(ctx, s, m, Math.max(1, Math.round(base * Math.max(0.2, 1 - d / wp.range))), f, false, 0, penOf(wp, s.equipped))
    return
  }
  found.sort((x, y) => x.d - y.d)
  hitTarget(ctx, s, found[0].m, Math.round(base), f, !wp.quiet, power, penOf(wp, s.equipped))
  if (power) { const m = found[0].m, d = found[0].d || 1; ctx.emit('impulse', { target: m.id, impulse: { x: f.x * 260 * power, y: 60 * power, z: f.z * 260 * power } }) } // a heavy shoves them back
}

export function fishNibble(ctx, d) {
  onFishNibble(ctx, d?.id)
}

export function fishBite(ctx, d) {
  onFishBite(ctx, d?.id)
}

export function fishAutoCatch(ctx, d) {
  const s = ctx.self.state
  if (s?.fishingState && s.fishingState.id === d?.id) {
    finishFishingCatch(ctx, s, s.fishingState, false)
  }
}

export function fishCatch(ctx, d) {
  const s = ctx.self.state
  if (s?.fishingState) {
    finishFishingCatch(ctx, s, s.fishingState, false)
  }
}

// not onto you: no grudge, not hunting you, and you are behind it or crouched in the dark
function unaware(ctx, s, m) {
  const st = m.state ?? {}, me = ctx.self.id
  if (st.angry?.[me] || st.fresh?.[me] || st.target === me || st.hunting || st.chase || st.aggro || st.alert) return false
  if (s.crouch) return true
  const r = ctx.getObject(m.id)?.rotation, p = ctx.self.feetPosition
  let yaw = typeof r === 'number' ? r : r && r.yaw != null ? r.yaw : r && r.w != null ? Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI : null
  if (yaw == null) return false
  const a = yaw * Math.PI / 180, fx = -Math.sin(a), fz = -Math.cos(a), dx = p.x - m.feetPosition.x, dz = p.z - m.feetPosition.z, d = Math.hypot(dx, dz) || 1
  return (fx * dx + fz * dz) / d < 0.1 // outside its forward half
}
// a tracer: one hot streak flying down the look from the muzzle
const TRACER = `fx
pop t burst=1 life=.09 v=<%dx|0,%dy|0,%dz|-1>*200 size=.035 col=hdr(6,4,1.6) a=1>0 sz=$size r=sprite(ember,add,velocity,.08)`
function tracer(ctx, p, f, range) {
  let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180
  const c = Math.cos(pc), d = { dx: f.x * c, dy: Math.sin(pc), dz: f.z * c }
  ctx.emit('fx', { position: { x: p.x + f.x * 0.7, y: p.y + 1.42, z: p.z + f.z * 0.7 }, script: TRACER, params: d })
}

// ---- reloading: a magazine gun swaps its magazine; a shotgun loads one shell at a time and can be fired mid-reload.
// player.state.loaded_<weapon> is the rounds in the gun; the ammo / shells counts are the reserve.
const reloadLive = (ctx, p) => { const s = ctx.self.state; return s.reloading === p.k && s.equipped === p.k && (s.reloadTok ?? 0) === p.tok }

function startReload(ctx) {
  const s = ctx.self.state, wp = weaponOf(s), k = s.equipped, w = walkOf(ctx)
  if (!wp.ranged || !wp.magSize || s.reloading || s.lootOpen) return
  if ((s['loaded_' + k] ?? 0) >= wp.magSize || (s[wp.ammoType ?? 'ammo'] ?? 0) <= 0) return
  const tok = (s.reloadTok ?? 0) + 1
  s.reloadTok = tok; s.reloadAt = ctx.now() // the token lives in state, so a page reload or a machine change never strands a reload
  s.reloading = k; s.ads = false; s.reloadDur = (wp.reloadTime ?? 1.7) * derived(s).reload // the viewmodel plays its timeline over the real length
  if (wp.pellets || wp.tube) ctx.after(wp.reloadStart ?? 0.4, 'reloadStep', { k, tok }) // a shell, or a cartridge into a tube or box magazine, one at a time
  else {
    sound(ctx, 'pistol-magazine-eject-click', 0.6, true)
    ctx.after(wp.reloadTime * derived(s).reload * 0.55, 'reloadMagIn', { k, tok })
    ctx.after(wp.reloadTime * derived(s).reload, 'reloadDone', { k, tok })
  }
}

function cancelReload(ctx) {
  const s = ctx.self.state
  s.reloadTok = (s.reloadTok ?? 0) + 1
  s.reloading = ''
}

export function reloadMagIn(ctx, p) {
  if (!reloadLive(ctx, p)) return
  sound(ctx, 'pistol-magazine-insert-slide', 0.65, true)
  ctx.self.state.reloadN = (ctx.self.state.reloadN ?? 0) + 1
}

export function reloadDone(ctx, p) {
  if (!reloadLive(ctx, p)) return
  const s = ctx.self.state, wp = W[p.k], rk = wp.ammoType ?? 'ammo'
  const take = Math.min(wp.magSize - (s['loaded_' + p.k] ?? 0), s[rk] ?? 0)
  s['loaded_' + p.k] = (s['loaded_' + p.k] ?? 0) + take
  s[rk] = (s[rk] ?? 0) - take
  s.reloading = ''
  s.reloadN = (s.reloadN ?? 0) + 1
  sound(ctx, 'pistol-slide-rack', 0.7, true)
}

export function reloadStep(ctx, p) {
  if (!reloadLive(ctx, p)) return
  const s = ctx.self.state, wp = W[p.k], rk = wp.ammoType ?? 'ammo'
  if ((s['loaded_' + p.k] ?? 0) < wp.magSize && (s[rk] ?? 0) > 0) {
    s['loaded_' + p.k] = (s['loaded_' + p.k] ?? 0) + 1
    s[rk] -= 1
    s.reloadN = (s.reloadN ?? 0) + 1
    sound(ctx, 'shotgun-shell-insert-click', 0.7, true)
  }
  if ((s['loaded_' + p.k] ?? 0) < wp.magSize && (s[rk] ?? 0) > 0) ctx.after(wp.reloadShell ?? 0.55, 'reloadStep', p)
  else { s.reloading = ''; ctx.after(0.25, 'pumpRack', {}) }
}

export function pumpRack(ctx) {
  sound(ctx, 'shotgun-pump-rack', 0.8)
  ctx.self.state.pumpAt = ctx.now()
}

export function pullToken(ctx, t) { // one carried thing out of the bag as its pickup token (drop, fridge), null if you have none
  const s = ctx.self.state; let tok = null
    if (t.startsWith('cloth:')) { const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : [], i = bag.indexOf(t); if (i >= 0) { bag.splice(i, 1); s.clothes = bag.join(','); tok = t } }
    else if (t.startsWith('almond:')) { const k = AW_KEY[t.slice(7)]; if (k && s[k] > 0) { s[k] -= 1; tok = t } }
    else if (t.startsWith('meat:')) { const c = t.slice(5); if ((s.meat?.[c] ?? 0) > 0) { s.meat = { ...s.meat, [c]: s.meat[c] - 1 }; tok = t } }
    else if (t.startsWith('snack:')) { const c = t.slice(6); if ((s.snacks?.[c] ?? 0) > 0) { s.snacks = { ...s.snacks, [c]: s.snacks[c] - 1 }; tok = c } }
    else if (t === 'ammo' || t === 'shells') { const per = W[t]?.perPickup ?? 1; if ((s[t] ?? 0) >= per) { s[t] -= per; tok = t } else s.notice = { text: `Need a full box (${per})`, at: ctx.now() } }
    else if (t === 'bobbypin') { if (s.bobbypins > 0) { s.bobbypins -= 1; tok = 'bobbypin' } }
  return tok
}

// the inventory's buttons (scripts/loot-ui.js): equip a weapon, drink almond water, drop a weapon at your feet, close
function invAction(ctx, d) {
  const s = ctx.self.state
  if (d.k === 'close') { s.invOpen = false; return }
  if (d.k === 'dropItem') { // anything that isn't a weapon: taken out of the bag as its pickup token, into a canvas bag at your feet (looted back with E)
    const tok = pullToken(ctx, String(d.t || ''))
    if (!tok) return
    const f = ctx.self.feetPosition, fw = walkOf(ctx).fwd ?? { x: 0, z: -1 }, at = { x: f.x + fw.x * 0.8, z: f.z + fw.z * 0.8 }
    const near = ctx.query({ tags: ['remains'], center: { x: at.x, y: f.y, z: at.z }, radius: 1.2 }).find((r) => r.state?.name === 'Dropped bag')
    if (near) { const o = ctx.getObject(near.id); if (o) o.state.items = [o.state.items, tok].filter(Boolean).join(',') } // one bag piles up what you drop in one spot
    else spawnRemains(ctx, at, [tok], 'Dropped bag')
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true); return
  }
  if (d.k === 'sel') { s.invSel = String(d.t || '').slice(0, 80); return }
  if (d.k === 'tab') { s.invTab = ['all', 'weapons', 'repair', 'aid', 'apparel', 'ammo', 'misc'].includes(d.t) ? d.t : 'all'; return }
  if (d.k === 'sort') { s.invSort = ['name', 'dam', 'wg', 'cnd'].includes(d.s) ? d.s : 'name'; return }
  if (d.k === 'sheet') { s.invOpen = false; s.sheetOpen = true; return }
  if (d.k === 'drink') { drink(ctx, d.c); return }
  if (d.k === 'eat') {
    const c = d.c, n = s.meat?.[c] ?? 0; if (!MEAT[c] || n <= 0) return
    s.meat = { ...s.meat, [c]: n - 1 }; s.hp = Math.min(maxHp(s.level, s), (s.hp ?? 0) + MEAT[c].hp); s.hunger = Math.min(100, (s.hunger ?? 100) + MEAT[c].food)
    s.notice = { text: `You eat the ${MEAT[c].name.toLowerCase()} · +${MEAT[c].hp} HP`, at: ctx.now() }; sound(ctx, 'eating-chewing-food', 0.6, true); return
  }
  if (d.k === 'splash') { s.invOpen = false; splash(ctx); return }
  if (d.k === 'soupEat') { soupEat(ctx); return }
  if (d.k === 'snack') { useSnack(ctx, String(d.c || '')); return }
  if (d.k === 'soupThrow') { s.invOpen = false; soupThrow(ctx); return }
  if (d.k === 'firesalt') { // rub a pinch on the blade or head: melee hits burn harder for a while
    if ((s.firesalt ?? 0) <= 0 || W[s.equipped]?.ranged || s.equipped === 'fists') { s.notice = { text: 'Hold a melee weapon to rub firesalt on it', at: ctx.now() }; return }
    s.firesalt -= 1; s.firesaltUntil = ctx.now() + L3I.firesalt.seconds * 1000
    s.notice = { text: `Firesalt on your ${W[s.equipped]?.name?.toLowerCase() ?? 'weapon'}: x${L3I.firesalt.damage} melee for ${L3I.firesalt.seconds}s`, at: ctx.now() }
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true); return
  }
  if (d.k === 'read') { s.reading = parseInt(d.n) || null; s.invOpen = false; return }
  if (d.k === 'repair') { repairAction(ctx, d); return }
  if (d.k === 'compass') { s.invOpen = false; useCompass(ctx); return }
  const k = String(d.w || '')
  if (d.k === 'wear' || d.k === 'unwear') { // clothes: wearing one swaps out what was in that slot (back into the bag); unwear strips it
    const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : []
    const r = d.k === 'wear' ? (bag.includes(k) ? wear(s.look, k) : null) : takeOff(s.look, k)
    if (!r) return
    if (d.k === 'wear') bag.splice(bag.indexOf(k), 1)
    for (const t of [r.back, r.extra]) if (t) bag.push(t)
    s.look = r.look; s.clothes = bag.join(',')
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true); return
  }
  if (d.k === 'equip' && owned(s).includes(k) && usable(s, k) && s.equipped !== k) {
    cancelReload(ctx); s.ads = false; s.equipped = k; s.equipAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.45, true); return
  }
  if (d.k === 'drop' && k !== 'fists' && owned(s).includes(k)) {
    if (s.equipped === k) { cancelReload(ctx); s.ads = false; s.equipped = 'fists'; s.equipAt = ctx.now() }
    { const list = owned(s).slice(1), i = list.indexOf(k); if (i >= 0) list.splice(i, 1); s.weapons = list.join(',') } // drop one, keep the rest
    if (owned(s).includes(k) && s.equipped === 'fists') { s.equipped = k } // still holding a spare
    const f = ctx.self.feetPosition, fw = walkOf(ctx).fwd ?? { x: 0, z: -1 }
    spawnWeapon(ctx, { x: f.x + fw.x * 0.9, z: f.z + fw.z * 0.9 }, k)
    sound(ctx, 'pickup-weapon', 0.5, true)
  }
}

// armor wears with every hit that gets through: the pieces you have on lose condition, heavier armor slower
function wearArmor(ctx, drop) {
  const s = ctx.self.state, rows = wornRows(s.look); if (!rows.length) return
  const cnd = { ...(s.look.cnd ?? {}) }, gone = [], dw = armorWearFor(rows, drop, derived(s).wear)
  for (const r of rows) { const was = cnd[r.token] ?? r.cnd, now = Math.max(0, Math.round((was - dw[r.token]) * 10) / 10); cnd[r.token] = now; if (was >= 0.5 && now < 0.5) gone.push(parseCloth(r.token)?.row?.name ?? 'armor') }
  s.look = { ...s.look, cnd }
  if (gone.length) s.notice = { text: `Your ${gone[0].toLowerCase()} is ruined: it gives no protection until repaired`, at: ctx.now() }
}
// REPAIR (inventory): d.m = kit | tape | akit | spare, d.t = "w:<weapon>" or "a:<cloth token>"
function repairAction(ctx, d) {
  const s = ctx.self.state, now = ctx.now(), sk = skillsOf(s).repair, cap = derived(s).repairCap, m = String(d.m || ''), tg = String(d.t || '')
  const say = (text) => { s.notice = { text, at: now } }
  if (m === 'akit') {
    if (!(s.akits > 0)) return say('You have no armor repair kit')
    const rows = wornRows(s.look), amt = repairAmount.akit(sk), cnd = { ...(s.look?.cnd ?? {}) }; let did = 0
    for (const r of rows) if (r.cnd < cap - 0.5) { cnd[r.token] = Math.min(cap, Math.round((r.cnd + amt) * 10) / 10); did++ }
    if (!did) return say(rows.length ? `Repair ${Math.round(cap)}: your armor is as good as you can make it` : 'You are not wearing any armor')
    s.akits -= 1; s.look = { ...s.look, cnd }; say(`Mended ${did} piece${did > 1 ? 's' : ''} of armor`); sound(ctx, 'pickup-ammo', 0.6, true); return
  }
  if (tg.startsWith('w:')) {
    const k = tg.slice(2), wp = W[k]; if (!wp || k === 'fists' || !owned(s).includes(k)) return
    const c = cndOf(s, k), lim = m === 'tape' ? Math.min(cap, repairAmount.tapeCap()) : cap
    if (c >= 99.5) return say(`Your ${wp.name.toLowerCase()} is in perfect shape`)
    if (c >= lim - 0.5) return say(m === 'tape' ? 'Tape cannot hold it any better than that' : `Repair ${Math.round(cap)}: that is as good as you can make it`)
    let amt
    if (m === 'tape') { if (!(s.tapes > 0)) return say('You have no duct tape'); amt = repairAmount.tape(); s.tapes -= 1 }
    else if (m === 'kit') { if (!(s.kits > 0)) return say('You have no repair kit'); amt = repairAmount.kit(sk); s.kits -= 1 }
    else if (m === 'spare') {
      const list = owned(s).slice(1); if (list.filter((x) => x === k).length < 2) return say(`You need a second ${wp.name.toLowerCase()} to cannibalise`)
      list.splice(list.indexOf(k), 1); s.weapons = list.join(','); amt = repairAmount.spare(sk)
    } else return
    s['cnd_' + k] = Math.min(lim, Math.round((c + amt) * 10) / 10); say(`${m === 'spare' ? 'Stripped a spare to repair' : m === 'tape' ? 'Taped' : 'Repaired'} your ${wp.name.toLowerCase()} to ${Math.round(s['cnd_' + k])}%`)
    sound(ctx, m === 'tape' ? 'bandage-wrap-cloth' : 'pickup-ammo', 0.6, true); return
  }
  if (tg.startsWith('a:') && m === 'spare') {
    const t = tg.slice(2), p = parseCloth(t); if (!p) return
    const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : [], on = wornRows(s.look).some((r) => r.token === t), n = bag.filter((x) => x === t).length
    if (!(on ? n >= 1 : n >= 2)) return say(`You need a second ${p.row.name.toLowerCase()} to cannibalise`)
    const c = armorCnd(s.look, t); if (c >= 99.5) return say(`Your ${p.row.name.toLowerCase()} is in perfect shape`); if (c >= cap - 0.5) return say(`Repair ${Math.round(cap)}: that is as good as you can make it`)
    bag.splice(bag.indexOf(t), 1); s.clothes = bag.join(',')
    s.look = { ...s.look, cnd: { ...(s.look?.cnd ?? {}), [t]: Math.min(cap, Math.round((c + repairAmount.spare(sk)) * 10) / 10) } }
    say(`Stitched your ${p.row.name.toLowerCase()} up from a spare`); sound(ctx, 'gun-raise-cloth-rustle', 0.5, true)
  }
}

function cycleWeapon(ctx) {
  cancelReload(ctx)
  ctx.self.state.ads = false
  const s = ctx.self.state, list = W.order.filter((k) => owned(s).includes(k) && usable(s, k))
  s.equipped = list[(list.indexOf(s.equipped) + 1) % list.length] ?? 'fists'; s.sheathed = false
  s.equipAt = ctx.now()
  sound(ctx, 'flashlight-switch-click', 0.5, true)
}

const AW_KEY = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }
function drink(ctx, c) {
  const s = ctx.self.state, now = ctx.now()
  if (!AW_KEY[c]) c = (s.almonds ?? 0) > 0 ? 'grey' : ['blue', 'green', 'red'].find((k) => (s[AW_KEY[k]] ?? 0) > 0)
  if (!c || (s[AW_KEY[c]] ?? 0) <= 0) return
  const a = AW[c], mh = maxHp(s.level, s), ms = maxSan(s.level, s), heal = derived(s).heal
  if (c === 'grey' && s.hp >= mh && s.sanity >= ms && (s.thirst ?? 100) >= 99) return
  s[AW_KEY[c]] -= 1
  s.thirst = Math.min(100, (s.thirst ?? 100) + a.thirst)
  s.hp = Math.min(mh, s.hp + a.hp * heal)
  s.sanity = Math.min(ms, s.sanity + a.sanity * heal)
  if (c === 'green') {
    if (now - (s.greenAt ?? -1e9) < a.abuseWithin * 1000) { s.sanity = Math.max(0, s.sanity - a.abuseSanity); s.notice = { text: 'Too much green. Your heart is racing', at: now } }
    else s.notice = { text: 'Green almond water: you could run forever', at: now }
    s.greenAt = now; s.greenUntil = now + a.seconds * 1000; walkOf(ctx).stamina = derived(s).staMax
  }
  if (c === 'red') {
    if (now - (s.redAt ?? -1e9) < a.cooldown * 1000) { s.hp = Math.max(1, s.hp - a.sickHp); s.notice = { text: 'Too much red. Your stomach turns', at: now } }
    else s.notice = { text: 'Red almond water: bitter. The bleeding stops. You feel heavy', at: now }
    s.redAt = now; s.tiredUntil = now + a.tiredSeconds * 1000
  }
  if (c === 'blue') { s.blueUntil = now + a.seconds * 1000; s.notice = { text: 'Blue almond water: your thoughts go quiet', at: now } }
  s.drankAt = now
  sound(ctx, 'gulping-water-from-plastic-bottle', 0.65)
}

// J: throw a bottle (grey first). Skin-stealers burn, stagger, and a disguised one splits open
const SPRAY = `fx
pop drops burst=40..55 life=.35..0.6 v=<%dir|0,0,-1>*(4..7)+sdir()*(.6..1.4)+up(1) size=.02..0.045 acc=grav()+drag(.6) col=<.85,.9,.95> a=.8>0 floor=die r=sprite(soft-disc,alpha,velocity,.02)
pop mist burst=6 life=.4..0.7 v=<%dir|0,0,-1>*(2..3) size=.2..0.35 acc=drag(2.5) col=<.9,.92,.95> a=0>.25:.2>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`
const STEAM = `fx
pop steam burst=18..24 on=box(.35,.8,.35).c(1.1) life=.8..1.5 v=up(1.2..2.2)+sdir()*.4 size=.25..0.45 acc=buoy(.8)+curl(.4)+drag(1.2) col=<.92,.9,.82> a=0>.45:.3>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)
pop fizz burst=20 on=box(.3,.7,.3).c(1.1) life=.3..0.6 v=sdir()*(1..2.2) size=.02..0.04 acc=grav()*.5 col=hdr(1.6,1.5,1.2) a=1>0 r=sprite(soft-disc,add)`
function splash(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if (now < (walkOf(ctx).splashCool ?? 0)) return
  const c = (s.almonds ?? 0) > 0 ? 'grey' : ['green', 'blue', 'red'].find((k) => (s[AW_KEY[k]] ?? 0) > 0)
  if (!c) { s.notice = { text: 'No almond water to throw', at: now }; return }
  s[AW_KEY[c]] -= 1; walkOf(ctx).splashCool = now + 900
  const p = ctx.self.feetPosition, f = walkOf(ctx).fwd ?? { x: 0, z: -1 }, S = AW.splash
  ctx.emit('fx', { position: { x: p.x + f.x * 0.5, y: p.y + 1.3, z: p.z + f.z * 0.5 }, script: SPRAY, params: { dir: { x: f.x, y: 0.1, z: f.z } } })
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-water-splash-thrown-from-bottle.mp3', position: chest(ctx), volume: 0.8, maxDistance: 20 })
  for (const m of ctx.query({ tags: ['stealer'], radius: S.reach })) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.4 && (dx * f.x + dz * f.z) / d < S.cone) continue
    m.state.hp -= S.damage; m.state.splashedAt = now
    const at = { x: m.feetPosition.x, y: m.feetPosition.y + 1.2, z: m.feetPosition.z }
    ctx.emit('fx', { position: m.feetPosition, script: STEAM })
    ctx.emit('damageNumber', { position: at, value: S.damage, color: '#bfe8ff' })
    heard(ctx, { clip: '/cdn/moodboard-gothic-horror/sfx-flesh-sizzle-steam-hiss.mp3', position: at, volume: 1, maxDistance: 26 })
    ctx.emit('hitstop', { duration: 0.04 }, { audience: { player: ctx.self.id } })
    return
  }
}

// a bowl of scalding soup flung at whatever is in front of you (her pick: 7 m reach, 22 damage, a 1 s stagger)
const SOUP = `fx
pop broth burst=45..60 life=.35..0.7 v=<%dir|0,0,-1>*(4..7)+sdir()*(.8..1.6)+up(1.2) size=.03..0.06 acc=grav()+drag(.5) col=<.78,.55,.22> a=.9>0 floor=stick r=sprite(soft-disc,alpha,velocity,.02)
pop chunks burst=6..9 life=.5..0.9 v=<%dir|0,0,-1>*(3..5)+up(1.5..2.5) size=.05..0.08 acc=grav() col=<.45,.3,.18> a=1 floor=stick r=sprite(soft-disc,alpha)
pop steam burst=8 life=.6..1.1 v=<%dir|0,0,-1>*(1.5..2.5)+up(.8) size=.25..0.4 acc=buoy(.6)+drag(2) col=<.92,.9,.84> a=0>.35:.25>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`
// the bowl lives in s.weapons like any weapon; one used is one gone, and the empty hand falls back to fists
function useBowl(s) {
  const list = owned(s).slice(1), i = list.indexOf('soup_bowl'); if (i < 0) return false
  list.splice(i, 1); s.weapons = list.join(',')
  if (s.equipped === 'soup_bowl' && !list.includes('soup_bowl')) s.equipped = 'fists'
  return true
}
const now0 = (ctx) => ctx.now()
function soupEat(ctx) {
  const s = ctx.self.state
  if (!useBowl(s)) return
  s.hunger = Math.min(100, (s.hunger ?? 100) + 45); s.hp = Math.min(maxHp(s.level, s), (s.hp ?? 0) + 25)
  s.notice = { text: 'You slurp the soup down too gratefully to ask what the chunks are · +25 HP', at: ctx.now() }; sound(ctx, 'eating-chewing-food', 0.6, true)
}
// thrown soup: hits what is in front (monster or person) through the real hit path, then leaves a slick puddle where it lands (scripts/soup-slick.js)
const SOUP_DMG = 30, SOUP_RANGE = 9 // my picks: a scalding bowl hits like a crowbar, from a throw's distance
function soupThrow(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if (now < (walkOf(ctx).nextSwing ?? 0)) return
  if (!useBowl(s)) { s.notice = { text: 'No soup to throw', at: now }; return }
  walkOf(ctx).nextSwing = now + 900
  const p = ctx.self.feetPosition, f = walkOf(ctx).fwd ?? { x: 0, z: -1 }
  ctx.emit('fx', { position: { x: p.x + f.x * 0.5, y: p.y + 1.3, z: p.z + f.z * 0.5 }, script: SOUP, params: { dir: { x: f.x, y: 0.1, z: f.z } } })
  sound(ctx, 'pipe-whoosh-swing', 0.6)
  let best = null, bd = SOUP_RANGE
  for (const m of ctx.query({ anyTags: ['smiler', 'lurker', 'hound', 'stealer', 'moths', 'l8spider', 'l8-hostile', 'npc'], radius: SOUP_RANGE })) {
    if (m.id === ctx.self.id || m.state?.dead || (m.state?.hp ?? 1) <= 0) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.5 && (dx * f.x + dz * f.z) / d < 0.75) continue
    if (d < bd) { bd = d; best = m }
  }
  let land
  if (best) {
    hitTarget(ctx, s, best, SOUP_DMG, f, false)
    best.state.stunUntil = now + 1400; best.state.splashedAt = now
    const at = { x: best.feetPosition.x, y: best.feetPosition.y + 1, z: best.feetPosition.z }
    heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-ceramic-bowl-shatter-on-stone.mp3', position: at, volume: 0.85, maxDistance: 22 })
    heard(ctx, { clip: '/cdn/moodboard-gothic-horror/sfx-flesh-sizzle-steam-hiss.mp3', position: at, volume: 0.8, maxDistance: 22 })
    s.notice = { text: `Scalding soup, right in the face · ${(best.state?.name ?? 'it').split(' ·')[0]} reels`, at: now }
    land = { x: best.feetPosition.x, z: best.feetPosition.z, y: best.feetPosition.y }
  } else {
    const o = { x: p.x, y: p.y + 1.3, z: p.z }, dir = { x: f.x * 0.94, y: -0.34, z: f.z * 0.94 }
    const r = raycast(ctx, o, dir, { distance: 7, physicsOnly: true, ignoreEntities: [ctx.self.id] })
    land = r ? { x: r.position.x, y: r.position.y, z: r.position.z } : { x: p.x + f.x * 5, y: p.y, z: p.z + f.z * 5 }
    heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-ceramic-bowl-shatter-on-stone.mp3', position: land, volume: 0.85, maxDistance: 22 })
    s.notice = { text: 'The soup splatters across the stone. Slippery.', at: now }
  }
  ctx.spawn({
    tags: ['soupslick'], feetPosition: { x: land.x, y: land.y + 0.02, z: land.z }, rotation: { yaw: ctx.random() * 360 }, lifetime: 30, behavior: 'scripts/soup-slick.js',
    primitive: { kind: 'circle', radius: 1.3, segments: 20 }, pivot: 'center', castShadow: false,
    material: { color: 'oklch(0.45 0.1 60 / 0.85)', roughness: 0.05, metalness: 0, transparent: true }
  })
}

function toggleLight(ctx) {
  const w = walkOf(ctx), s = ctx.self.state
  if (w.light) { ctx.destroy(w.light); w.light = null }
  else if (ctx.self.place === 'level6') { /* Level 6: no light works. the switch clicks, nothing comes; goggles see without light */
    if (w.nvg) { ctx.destroy(w.nvg); w.nvg = null }
    else if (s.nvg && (w.battery ?? s.battery) <= 1 && (s.nvgSpare ?? 0) > 0) { s.nvgSpare -= 1; w.battery = 100; s.battery = 100; w.nvg = ctx.spawn({ feetPosition: { attach: 'camera', x: 0, y: 0, depth: 0 }, light: { kind: 'point', color: 'oklch(0.85 0.2 145)', intensity: 2.6, distance: 9 }, audience: 'local' }); s.notice = { text: `Swapped in a spare pair · ${s.nvgSpare} left`, at: ctx.now() } }
    else if (s.nvg && (w.battery ?? s.battery) > 1) w.nvg = ctx.spawn({ feetPosition: { attach: 'camera', x: 0, y: 0, depth: 0 }, light: { kind: 'point', color: 'oklch(0.85 0.2 145)', intensity: 2.6, distance: 9 }, audience: 'local', scope: 'session' })
    else if (!s.nvg) s.notice = { text: 'Nothing. The dark eats light here. You need night vision goggles.', at: ctx.now() }
    else s.notice = { text: 'Night vision battery depleted. Insert fresh batteries.', at: ctx.now() }
    s.nvgOn = !!w.nvg; sound(ctx, 'flashlight-switch-click', 0.65, true); return
  }
  else if ((w.battery ?? s.battery) > 1) {
    w.light = ctx.spawn({
      feetPosition: { attach: 'camera', x: 0.22, y: -0.25, depth: 0.1 },
      light: { kind: 'spot', color: 'oklch(0.97 0.03 90)', intensity: ctx.self.place === 'level8' ? 1.4 : 10, distance: ctx.self.place === 'level8' ? 16 : 28, angle: 26, penumbra: 0.55, aim: 'forward', shadow: { enabled: true } },
      audience: 'local', scope: 'session',
    })
  }
  s.light = !!w.light
  sound(ctx, 'flashlight-switch-click', 0.65, true)
}


// First person: the local player's own arm and held weapon, riding the camera. Only this machine sees it.
const Q_MELEE = { x: -0.5, y: 0.5, z: 0.5, w: 0.5 } // its length up, its blade forward
const Q_ID = { x: 0, y: 0, z: 0, w: 1 } // the pistol mesh already points its muzzle down -Z
// the viewmodel sits a hand from the eye under the troffers: its skin is drawn a shade deeper so it reads as skin, not a white glare
function vmSkin(hex) { const n = parseInt(String(hex ?? '#efcfb4').slice(1), 16), k = 0.72; return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * k).toString(16).padStart(2, '0')).join('') }
const Q_GUN = { x: 0, y: 1, z: 0, w: 0 } // yaw 180: lays the mesh's +Z barrel forward (-Z) in camera space
// The Tripo shotgun mesh lies tilted ~35 deg muzzle-up (butt at its origin, trigger at mesh (0,-0.08,0.33)).
// Inside the Q_GUN frame (yaw 180), a child pitch of 35 levels it to point straight forward (-Z).
// `at` = { x: 0, y: 0.255, z: -0.224 } translates the trigger to (0, 0, 0) so it lands in the fist.
// degrees to a quaternion: yaw about Y, then pitch about X, then roll about Z (the viewmodel's children take quaternions; an euler rotation on a mesh child was ignored)
const eulerQ = (yaw, pitch, roll) => { const h = Math.PI / 360, [cy, sy, cp, sp, cr, sr] = [Math.cos(yaw * h), Math.sin(yaw * h), Math.cos(pitch * h), Math.sin(pitch * h), Math.cos(roll * h), Math.sin(roll * h)]; return { x: cy * sp * cr + sy * cp * sr, y: sy * cp * cr - cy * sp * sr, z: cy * cp * sr - sy * sp * cr, w: cy * cp * cr + sy * sp * sr } }
// q: the correction, from the mesh itself (measured from its vertices, art/weapons: the barrel axis leans 23.8 deg to +x and 32.4 deg up; q = Ry(10) * Rx(32.4) * Ry(-23.8) lays it along +Z, the 10 being the sights lined up on the crosshair). A child's rotation must be a quaternion: the euler form is ignored on a mesh child.
const GUN_FIX = { shotgun: { outer: { x: 0, y: 0, z: 0, w: 1 }, q: { x: 0.2021, y: 0.91937, z: -0.31702, w: 0.11581 }, at: { x: -0.139, y: -0.22, z: -0.086 } } } // the engine stands the mesh on its lowest point (no half turn: a test placement proved it), so the wrist is lifted 0.308 m in mesh y before the turn; solved from the glb's own vertices (art/weapons: barrel axis (0.341,0.536,0.772), trigger side (-0.298,-0.717,0.63)): the muzzle runs down -Z, the trigger guard hangs below, the wrist of the stock sits in the fist
function toggleHolster(ctx) {
  const s = ctx.self.state; cancelReload(ctx); s.ads = false
  if (!s.sheathed) { if (s.equipped !== 'fists') s.holstered = s.equipped; s.equipped = 'fists'; s.sheathed = true; s.sheathAt = ctx.now() } // hands away: nothing in view
  else { s.sheathed = false; w0vm(ctx); if (s.holstered && owned(s).includes(s.holstered) && usable(s, s.holstered)) s.equipped = s.holstered }
  s.equipAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.45, true)
}
function w0vm(ctx) { const w = walkOf(ctx); w.vmCheck = true } // a draw rebuilds the viewmodel, which rises from below
function viewmodel(ctx, moving, sprinting) {
  if (!ctx.self.isLocal) return
  const w = walkOf(ctx), s = ctx.self.state, kind = s.equipped ?? 'fists', l = s.look ?? {}
  if (s.sheathed && w.vm && ctx.now() - (s.sheathAt ?? 0) < 400) return // still lowering out of view
  if (s.sheathed || s.mj?.seats || s.tp || s.menuOpen || s.arrive || s.arrivePending || ctx.self.place === 'intake') { if (w.vm) { ctx.destroy(w.vm); w.vm = null; w.vmKind = null; w.vmEq = null; w.plyRig = null } if (s.vmId) s.vmId = null; return } // holstered: the hands are down, out of view
  // the look and tune only change by a press: the full key is rebuilt when the weapon changes or on the 4 Hz stats beat
  if (w.vm && w.vmEq === kind && !w.vmCheck) { if (w.plyWant && !w.plyRig && ctx.now() >= (w.plyNext ?? 0)) { w.plyNext = ctx.now() + 500; plyArm(ctx, w) } return }
  w.vmEq = kind; w.vmCheck = false
  const hb = !l.modelUrl && HUMAN ? humanBody(l) : null // human bodies: Shelly's own model's arm holds the weapon (her rule: first-person arms come from her model or a PLYMODEL)
  const ply = l.modelUrl || (hb ? hb.id + '#' + (hb.materials.Body_Skin.color ?? '') : '')
  const arm = hb ? { hidden: true } : ply ? { hidden: true } : { human: true, topw: l.topw, top: l.top }, armKey = kind + JSON.stringify(arm) + ply + 'v27' + JSON.stringify(s.vmTune ?? null)
  if (w.vmKind !== armKey || !w.vm) {
    if (w.vm) ctx.destroy(w.vm)
    w.plyRig = null
    const bk = baseOf(kind), g = HOLD[bk], wp = W[kind] ?? {}, gun = !!wp.ranged
    const child = g == null ? [] : [gun
      ? (GUN_FIX[bk]
        // the Tripo shotgun mesh lies tilted ~35 deg muzzle-up with its butt at the origin: level it and put its trigger in the fist
        ? { feetPosition: { x: 0, y: 0.01, z: 0.02 }, rotation: s.vmTune?.rot ?? GUN_FIX[bk].outer ?? Q_GUN, audience: 'local', children: [{ feetPosition: s.vmTune?.at ?? GUN_FIX[bk].at, rotation: s.vmTune?.q ?? (s.vmTune?.pitch != null || s.vmTune?.yaw != null ? eulerQ(s.vmTune?.yaw ?? 0, s.vmTune?.pitch ?? 0, s.vmTune?.roll ?? 0) : GUN_FIX[bk].q), castShadow: false, ...weaponBody(kind), audience: 'local' }] }
        : { id: 'gun', feetPosition: s.vmTune?.at ?? { x: 0, y: bk === 'pistol' ? 0.03 : -0.04, z: bk === 'pistol' ? 0.04 : 0.14 }, rotation: s.vmTune?.rot ?? (bk === 'pistol' ? Q_ID : Q_GUN), castShadow: false, ...weaponBody(kind), audience: 'local' })
      : MESHGRIP[bk]
        ? { feetPosition: s.vmTune?.mat ?? { x: MESHGRIP[bk].at[0], y: MESHGRIP[bk].at[1], z: MESHGRIP[bk].at[2] }, rotation: s.vmTune?.mrot ?? { x: MESHGRIP[bk].q[0], y: MESHGRIP[bk].q[1], z: MESHGRIP[bk].q[2], w: MESHGRIP[bk].q[3] }, castShadow: false, ...weaponBody(kind), audience: 'local' }
        : { feetPosition: s.vmTune?.mat ?? { x: 0, y: -g, z: 0 }, rotation: s.vmTune?.mrot ?? Q_MELEE, castShadow: false, ...weaponBody(kind), audience: 'local' }]
    // a two-handed weapon: the off hand rides the viewmodel too, on the fore-end (guns, ahead of the trigger hand) or up the haft (melee), at weapons.yml two: [up, forward-is-negative, radius]
    const fpa = hb ? FP_ARM[l.sex === 'f' ? 'f' : 'm'] : null, skinM = hb ? { Body_Skin: { ...hb.materials.Body_Skin, color: vmSkin(hb.materials.Body_Skin.color), roughness: 0.78, metalness: 0, emissive: '#000000' } } : null
    if (wp.two && fpa) child.push({ id: 'fparm-l', feetPosition: { x: (wp.two[3] ?? -0.01) - FP_BC[l.sex === 'f' ? 'f' : 'm'].x, y: wp.two[0] + FP_BC[l.sex === 'f' ? 'f' : 'm'].y, z: wp.two[1] + FP_BC[l.sex === 'f' ? 'f' : 'm'].z }, model: { id: fpa.L, materials: skinM }, castShadow: false, visibleInFirstPerson: true, audience: 'local' }) // her own left arm, fist closed on the fore-end
    else if (wp.two && !ply) child.push({ feetPosition: { x: 0, y: wp.two[0], z: wp.two[1] }, castShadow: false, audience: 'local', primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js', params: { ...arm, support: { axis: gun ? 'z' : 'y', r: wp.two[2] } } } })
    // the worn model rides the viewmodel: shoulder just behind and below the eye, its right hand reaching the grip
    // human: the body turned to face the look, its right shoulder just right of and below the eye (female shoulder 1.19 m, male scaled by height)
    if (fpa) child.push({ id: 'fparm-r', feetPosition: s.vmTune?.aat ?? FP_AT(l.sex === 'f' ? 'f' : 'm'), rotation: s.vmTune?.arot ?? FP_ROT, model: { id: fpa.R, materials: skinM }, castShadow: false, visibleInFirstPerson: true, audience: 'local' }) // her own right arm (art/fp-arm), its fist closed on the grip at the viewmodel's origin
    else if (ply) child.push({ id: 'plyarm', model: ply, feetPosition: { x: 0.02, y: -1.62, z: 0.62 }, castShadow: false, visibleInFirstPerson: true, audience: 'local', anim: { idle: { clip: 'Idle', loop: 'loop', weight: 1 } } })
    w.vm = ctx.spawn({
      feetPosition: { attach: 'camera', x: 0.2, y: -0.2, depth: 0.42, fov: 55 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js', params: arm, ...(wp.muzzle ? { sockets: { muzzle: wp.muzzle } } : {}) }, children: child
    })
    w.vmKind = armKey
  }
  w.plyWant = !!ply && !hb; w.plyHuman = !!hb; w.plyTwo = wp_two(kind) // a two-handed weapon keeps the left arm: its hand reaches the fore-end
  if (ply && !w.plyRig && ctx.now() >= (w.plyNext ?? 0)) { w.plyNext = ctx.now() + 500; plyArm(ctx, w) } // its skeleton arrives with the model: look twice a second, not every tick
  if (w.vm && s.vmId !== w.vm) s.vmId = w.vm // scripts/lib/vmpose.js poses it every display frame from the camera rig
}

// once the worn model's skeleton is in: keep only its right arm (head, left arm and legs shrink to their joints)
// and put its right hand on the viewmodel's grip, so it follows every sway, recoil and reload pose
const RH = /(^|[^a-z])(r|right)[_. ]?hand$|hand[_. ]?(r|right)$/i
const CUT = [/head$|neck/i, /(^|[^a-z])(l|left)[_. ]?(clavicle|shoulder|upperarm|arm)$|(clavicle|shoulder|upperarm)[_. ]?(l|left)$/i, /thigh|upleg|(^|[^a-z])(l|r|left|right)[_. ]?leg$|calf/i]
// the human body's rest-pose right arm (art/human-base: RightArm -> RightHand) laid along the line from below-right of the eye up to the wrist of the grip hand; the torso sits beside and behind the eye, out of view. Computed from the GLB joints, no IK, so it never pops
const HUMAN_ARM = { f: { q: { x: -0.4041, y: 0.3447, z: 0.8277, w: 0.1811 }, at: { x: 0.939, y: 0.538, z: -0.014 } }, m: { q: { x: -0.4026, y: 0.3501, z: 0.8263, w: 0.1806 }, at: { x: 1.038, y: 0.577, z: -0.001 } } }
// first-person arms cut from Shelly's human bodies (art/fp-arm/build.py): forearm, hand closed in a fist, the fist's centre at the origin
const FP_ARM = {
  f: { R: '/cdn/value.2d938d9446aaeb01c15e41213e80f5a4d2c7e1507bc655714fb04eac001794fa.glb', L: '/cdn/value.7f8d66209a679e498e2b417b0accaf0b9ce819769be93f697762794ff5dc409b.glb' },
  m: { R: '/cdn/value.7217b9235387299104686cdd782ec11f1801444037bd8eceefe445e11001b020.glb', L: '/cdn/value.70fede1b834eff766531f0b51f4772832f8ac989f9f48cffe988120bba1970cb.glb' } }
// the engine stands a model's bounds bottom-centre on feetPosition, so the fist (the mesh origin) needs that offset back; BC = bounds bottom-centre of each GLB
const FP_BC = { f: { x: 0.0304, y: -0.2624, z: 0.1128 }, m: { x: 0.0375, y: -0.2836, z: 0.1145 } }
const FP_SEAT = { x: 0, y: 0.039, z: 0.096 } // the pistol grip's centre in viewmodel space, measured off the mesh (art/weapon-split/fitview.py): the fist's hollow lands on it
const FP_AT = (sx) => ({ x: FP_BC[sx].x + FP_SEAT.x, y: FP_BC[sx].y + FP_SEAT.y, z: FP_BC[sx].z + FP_SEAT.z }), FP_ROT = { yaw: 0, pitch: 0, roll: 0 }
function wp_two(kind) { return W[kind]?.two ? { y: W[kind].two[0], z: W[kind].two[1] } : null }
function plyArm(ctx, w) {
  const body = ctx.getObject(w.vm + '/plyarm') ?? ctx.getObject('plyarm') ?? (ctx.getObject(w.vm)?.children ?? []).map((c) => (typeof c === 'string' ? ctx.getObject(c) : c)).find((c) => c?.model)
  if (!w.plyLogged) { w.plyLogged = true; ctx.log('[plyarm] vm', w.vm, 'body', body?.id ?? null, 'pos', JSON.stringify(body?.worldFeetPosition ?? null), 'skel', body?.skeleton ? Object.keys(body.skeleton).length : 'none') }
  const names = body?.skeleton ? (Array.isArray(body.skeleton) ? body.skeleton : Object.keys(body.skeleton)).map((b) => (typeof b === 'string' ? b : b.name)) : null
  if (!names?.length) return
  const bones = {}
  const cut = w.plyTwo && !w.plyHuman ? [CUT[0], CUT[2]] : CUT
  for (const n of names) if (cut.some((r) => r.test(n.replace(/^mixamorig:/, '')))) {
    const par = names.find((m) => m !== n && cut.some((r) => r.test(m.replace(/^mixamorig:/, ''))) && n.startsWith(m)) // a parent already cut covers it
    if (!par) bones[n] = { scale: 0 }
  }
  const hand = names.find((n) => RH.test(n.replace(/^mixamorig:/, '')))
  if (hand && w.plyHuman) bones[hand] = { scale: 0 } // the closed scripted hand grips; the model's flat hand folds away
  else if (hand) bones[hand] = { reach: { to: { object: w.vm, offset: { x: 0.03, y: -0.02, z: 0.05 } }, pole: { object: w.vm, offset: { x: 0.6, y: -0.6, z: 0.4 } } } }
  const lh = w.plyTwo && names.find((n) => /(^|[^a-z])(l|left)[_. ]?hand$|hand[_. ]?(l|left)$/i.test(n.replace(/^mixamorig:/, '')))
  if (lh && !w.plyHuman) bones[lh] = { ...(w.plyHuman ? { scale: 0 } : {}), reach: { to: { object: w.vm, offset: { x: -0.06, y: w.plyTwo.y - 0.08, z: w.plyTwo.z + 0.1 } }, pole: { object: w.vm, offset: { x: -0.7, y: -0.6, z: 0.4 } } } }
  body.bones = bones
  w.plyRig = true
  ctx.log('[plyarm] rigged', hand ?? 'no right hand', 'cut', Object.keys(bones).join(','), 'all', names.join(','))
}

export function update(ctx, dt) {
  { const st = ctx.self.state; if (st.reloading && (st.equipped !== st.reloading || !st.reloadAt || ctx.now() - st.reloadAt > 9000)) { st.reloading = ''; st.reloadTok = (st.reloadTok ?? 0) + 1 } } // a reload stranded by a swap, a page reload or a lost timer clears itself
  const fp = ctx.self.feetPosition, fz = zoneHere(ctx, fp.x, fp.z)
  {
    const s0 = ctx.self.state, ses = ctx.self.session; const pl = ctx.self.place
    const hot = pl === 'level2' ? (fz === 'l2_pipes' ? 75 : fz === 'l2_hall' ? 55 : 30) : pl === 'level21' ? (fz === 'l21_edge' || fz === 'l21_edgecave' ? 0 : fz === 'l21_fridges' ? 0 : 45) : pl === 'level3' || pl === 'gamma' ? 35 : 0 // how hot each place runs, in degrees on the meter
    if (hot > 0) { ses.heatF = (ses.heatF ?? s0.heat ?? 0) + Math.sign(hot - (ses.heatF ?? s0.heat ?? 0)) * Math.min(Math.abs(hot - (ses.heatF ?? s0.heat ?? 0)), 2 * dt); const n = Math.round(ses.heatF); if (n !== Math.round(s0.heat ?? 0)) s0.heat = n }
    else if ((s0.heat ?? 0) > 0 && pl !== 'level5') { ses.heatF = Math.max(0, (ses.heatF ?? s0.heat) - 5 * dt); const n = Math.round(ses.heatF); if (n !== Math.round(s0.heat)) s0.heat = n } else ses.heatF = undefined
  } // heat only lives in the Boiler Room: carried out of Level 5 it cools 5°/s (eased in session, written per whole degree)
  ensure(ctx)
  if (ctx.self.parent) return
  const w = walkOf(ctx), s = ctx.self.state
  w.stamina ??= s.stamina; w.battery ??= s.battery
  { const hp0 = w.hpSeen ?? s.hp; if (typeof s.hp === 'number' && hp0 - s.hp >= 2 && s.look) wearArmor(ctx, hp0 - s.hp); w.hpSeen = s.hp } // a hit that got through wears what you have on (lib/condition.js)
  let dir = w.dir ?? { x: 0, z: 0 }, pressing = dir.x !== 0 || dir.z !== 0
  { // pressed into a wall: the keys say go, the feet stay put. after a beat you stop running (no drain, no steps, no bob)
    const lf = w.lastFp, mv = lf && dt > 0 ? Math.hypot(fp.x - lf.x, fp.z - lf.z) / dt : 9
    w.lastFp = { x: fp.x, z: fp.z }
    w.stuckT = pressing && mv < 0.5 ? (w.stuckT ?? 0) + dt : 0
  }
  const moving = pressing && w.stuckT < 0.2
  const crouched = !!s.crouch
  if (w.stamina <= 1) w.winded = true; else if (w.winded && w.stamina >= (L.windedAt ?? 30)) w.winded = false // ran dry: no sprint till you catch your breath
  if (!!w.winded !== !!s.winded) s.winded = !!w.winded
  const over = (w.bur ?? 1) < 1 // carrying more than you can bear (Fallout: you walk, you do not run)
  if (over && w.sprint && moving && nowMsg(ctx) - (w.overSay ?? 0) > 5000) { w.overSay = nowMsg(ctx); s.notice = { text: 'You are overencumbered and cannot run.', at: nowMsg(ctx) } }
  const sprinting = w.sprint && moving && w.stamina > 1 && !w.winded && !s.ads && !crouched && !over
  const dv = w.dv ??= derived(s) // the sheet's numbers, re-derived 4x a second in the stats beat, not three times a tick
  const nowS = ctx.now(), green = nowS < (s.greenUntil ?? 0), tired = nowS < (s.tiredUntil ?? 0) // green almond water: sprint longer; red: heavy limbs
  const l2Hot = ctx.self.place === 'level2' && (fz === 'l2_pipes' || fz === 'l2_hall')
  if (l2Hot && nowS - (s.heatWarnAt ?? 0) > 45000) {
    s.heatWarnAt = nowS
    s.notice = { text: 'Suffocating heat (110°F) radiates from the pipes — stamina drains faster.', at: nowS }
  }
  w.stamina = Math.max(0, Math.min(dv.staMax, w.stamina + (sprinting ? -L.staminaDrain * (green ? AW.green.staminaMul : 1) * (l2Hot ? 1.25 : 1) : L.staminaRegen * dv.staRegen * (tired ? 0.3 : 1) * (w.winded ? (L.windedRegen ?? 0.6) : 1) * (l2Hot ? 0.68 : 1) * (w.ledge ? L.ledgeRest.stamina : 1)) * dt))
  const inArch = fz === 'arches'
  w.wet = inArch && fp.y < 0.3; w.ledge = inArch && fp.y > 0.45 && ctx.self.grounded
  const speed = (w.walkMode && !sprinting ? 0.5 : 1) * (sprinting ? L.sprintSpeed : L.walkSpeed) * (w.wet ? L.wetCarpetSpeed : 1) * (s.ads ? 0.55 : 1) * (s.carryMul ?? 1) * (crouched ? L.crouchSpeed ?? 0.45 : 1) * dv.speed * (w.bur ??= burden(s))
  const drunk = Math.max(0, (s.drunk ?? 0) - (nowS - (s.drunkAt ?? nowS)) * 0.4) // sobers 0.4 a second
  if (s.drunk && drunk <= 0) s.drunk = 0
  const sway = drunk > 15 && moving ? Math.sin(nowS * 1.3) * Math.min(0.5, drunk / 160) : 0 // past a couple of drinks the walk drifts
  if (sway) dir = { x: dir.x * Math.cos(sway) - dir.z * Math.sin(sway), y: dir.y, z: dir.x * Math.sin(sway) + dir.z * Math.cos(sway) }
  const intent = { x: dir.x * speed * (moving || !pressing ? 1 : 0.35), z: dir.z * speed * (moving || !pressing ? 1 : 0.35) } // stuck on a wall: a gentle lean, still enough to slide off a corner
  viewmodel(ctx, moving, sprinting)
  const v = ctx.self.velocity
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && moving)
  if (now0(ctx) >= (w.slickAt ?? 0)) { w.slickAt = now0(ctx) + 150; w.onSlick = ctx.query({ tags: ['soupslick'], radius: 1.3, select: 'ids' }).length > 0 } // checked a few times a second, not every tick
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * dt * (w.onSlick ? 0.07 : 1) // soup underfoot: you skate
  if (!Number.isFinite(intent.x) || !Number.isFinite(intent.z)) { intent.x = 0; intent.z = 0; if (!Number.isFinite(w.bur)) w.bur = undefined; w.dv = undefined } // a fresh save's sheet can read NaN for a beat: stand still, re-derive next tick
  const vx = Number.isFinite(v.x) ? v.x : 0, vz = Number.isFinite(v.z) ? v.z : 0, vy = Number.isFinite(v.y) ? v.y : 0
  const dx = intent.x - vx, dz = intent.z - vz, gap = Math.hypot(dx, dz), k = gap > step ? step / gap : 1
  ctx.self.velocity = { x: vx + dx * k, y: vy + ctx.place.gravity.y * dt, z: vz + dz * k }

  // Footsteps (scripts/lib/footsteps.js): the floor under you, a step per stride, left/right feet, weight, scuffs and landings
  stepTick(ctx, w, dt, { moving, sprinting, crouched, wet: w.wet, bur: w.bur ?? 1, fallback: floorOf(ctx), clip: SND })

  w.acc = (w.acc ?? 0) + dt
  if (s.fishingState) {
    const fs = s.fishingState, dist = Math.hypot(ctx.self.feetPosition.x - fs.bx, ctx.self.feetPosition.z - fs.bz)
    if (dist > 22 || s.sheathed || baseOf(s.equipped) !== 'fishing_rod' || s.dead || s.downAt) cancelFishing(ctx, s, 'lost')
  }
  if (w.acc >= 0.25) { w.dv = derived(s); w.bur = burden(s); w.vmCheck = true; tickStats(ctx, w.acc, moving); w.acc = 0 }
}

const HOSTILE = ['smiler', 'lurker', 'hound', 'stealer', 'deathmoth', 'moth']
const HOSTILE_AND_NPC = [...HOSTILE, 'npc']
const _rayEye = { x: 0, y: 0, z: 0 }
const _rayDir = { x: 0, y: 0, z: 0 }
const _rayOpt = { distance: 10, physicsOnly: true, bodies: 'static', ignoreEntities: [] }
function detection(ctx, p, w) {
  const me = ctx.self.id, sneak = skillsOf(ctx.self.state).sneak ?? 0
  const reach = (w.light ? 16 : 10) * (1 - Math.min(0.5, sneak / 200)) // a lit flashlight gives you away from further off
  let seen = false
  for (const o of ctx.query({ anyTags: HOSTILE_AND_NPC, radius: 24 })) {
    const st = o.state ?? {}; if (st.dead || (st.hp ?? 1) <= 0) continue
    const q = o.feetPosition, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz)
    const hostile = !o.tags?.includes('npc') || st.angry?.[me]
    if (hostile && (st.target === me || st.prey === me || st.hunting === me || st.chase === me)) return 'danger'
    if (d > reach) continue
    const r = ctx.getObject(o.id)?.rotation, yaw = ((typeof r === 'number' ? r : r?.yaw) ?? 0) * Math.PI / 180
    const facing = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / (d || 1) // 1 = looking straight at you
    if (facing < 0.25 && d > 1.6) continue
    _rayEye.x = q.x; _rayEye.y = q.y + 1.3; _rayEye.z = q.z
    const tox = p.x - _rayEye.x, toy = p.y + 0.8 - _rayEye.y, toz = p.z - _rayEye.z
    const n = Math.hypot(tox, toy, toz) || 1
    _rayDir.x = tox / n; _rayDir.y = toy / n; _rayDir.z = toz / n
    _rayOpt.distance = n - 0.3
    _rayOpt.ignoreEntities = [o.id, me]
    if (raycast(ctx, _rayEye, _rayDir, _rayOpt)) continue
    if (hostile && d < reach * 0.6) return 'danger'
    seen = true
  }
  return seen ? 'detected' : 'hidden'
}

function tickStats(ctx, t, moving) {
  const s = ctx.self.state, w = walkOf(ctx), p = ctx.self.feetPosition, now = ctx.now()
  const mh = maxHp(s.level, s), ms = maxSan(s.level, s)
  const af = w.fwd ?? { x: 0, z: -1 }, ax = Math.round(af.x * 20) / 20, az = Math.round(af.z * 20) / 20
  if (s.aimX !== ax) s.aimX = ax
  if (s.aimZ !== az) s.aimZ = az
  const zone = zoneHere(ctx, p.x, p.z)
  if (zone !== s.zone) s.zone = zone
  // sneaking: who can see you, written only when the answer changes (the HUD's [HIDDEN] / [DETECTED] / [DANGER])
  const det = s.crouch ? detection(ctx, p, w) : null
  if ((s.detect ?? null) !== det) s.detect = det
  // sanity: the halls eat it, the dark eats it faster, the safe room gives it back
  let drain = (ctx.self.place === 'level61' || ctx.self.place === 'level11' || ctx.self.place === 'level10' ? 0 : ctx.self.place === 'level7' ? (zone === 'l7_sea' || zone === 'l7_ocean' ? 0.75 : 0.22) : ctx.self.place === 'level6' ? (w.nvg ? 0.32 : 1.15) : ctx.self.place === 'level4' ? DRAIN4[zone.slice(3)] : ctx.self.place === 'level5' ? (DRAIN5[zone.slice(3)] ?? 0.8) / 60 * 4 : ctx.self.place === 'level2' ? L2.sanityDrain[zone.slice(3)] : (ctx.self.place === 'level3' || ctx.self.place === 'gamma') ? L3.sanityDrain[zone.slice(3)] : ctx.self.place === 'level8' ? 0.14 : ctx.self.place === 'level21' ? L21.sanityDrain[zone.slice(4)] : L.sanityDrain[zone]) ?? 0.12
  if (w.light && (zone === 'dark' || zone === 'red' || zone === 'l3_dark')) drain *= 0.4
  if (ctx.self.place === 'level5' && s.l5room && zone.slice(3) === s.l5room && ctx.now() < (s.l5until ?? 0)) drain = -0.6 // a rented Homely Hotel suite: your own room, the hotel can't reach you (scripts/l5-resident.js)
  if (drain > 0 && ctx.now() < (s.blueUntil ?? 0)) drain = 0 // blue almond water: the halls can't get in
  s.sanity -= drain * (drain > 0 ? derived(s).drain : 1) * t
  if (w.ledge) s.sanity += L.ledgeRest.sanity * t
  const rest = !!w.ledge, wet = !!w.wet
  if (s.onLedge !== rest) s.onLedge = rest
  if (s.wet !== wet) s.wet = wet
  if (s.sanity > ms) s.sanity = ms
  if (s.sanity < 0) s.sanity = 0
  if (s.god) { if (s.sanity < ms) s.sanity = ms; const gh = maxHp(s.level, s); if ((s.hp ?? gh) < gh) s.hp = gh; if (s.dead) s.dead = false } // god mode (creator's testing switch): topped up every tick
  // sanity 0 never hurts (johnadams2): it weakens your stats instead, see derived() in scripts/lib/stats.js
  if (zone === 'hub' || zone === 'manila' || zone === 'l4_home' || zone === 'l5_housekeeping' || zone === 'l5_kitchen') { s.hp = Math.min(mh, s.hp + 3 * t); w.battery = Math.min(L.battery, w.battery + 15 * t) }
  if (s.hp > mh) s.hp = mh

  // Level 6 Wikidot sensory deprivation auditory decay: paranoia whispers and phantom footsteps
  if (ctx.self.place === 'level6' && s.sanity < 50) {
    w.l6WhisperClock = (w.l6WhisperClock ?? 0) + t
    if (w.l6WhisperClock >= (w.nextL6Whisper ?? 22)) {
      w.l6WhisperClock = 0
      w.nextL6Whisper = 18 + ctx.random() * 20
      const clips = ['unintelligible-whisper-behind-ear', 'slow-close-breathing-in-pitch-dark', 'bare-footsteps-stop-on-concrete']
      sound(ctx, clips[Math.floor(ctx.random() * clips.length)], 0.65, true)
    }
  }

  // Rare, subtle auditory hallucination only under deep psychological decay
  if (s.sanity < 25 && zone !== 'hub') {
    w.hallucinationClock = (w.hallucinationClock ?? 0) + t
    if (w.hallucinationClock >= (w.nextHallucination ?? 45)) {
      w.hallucinationClock = 0
      w.nextHallucination = 40 + ctx.random() * 30
      sound(ctx, 'distant-metal-creak-drone', 0.25, true)
    }
  }

  // the lights' hum spikes: a loud surge that eats sanity while you stand in it; keep moving
  if (zone !== 'hub' && ctx.self.place === 'main') {
    const [a, b] = L.humSpikeEvery
    w.nextSpike ??= now + (a + ctx.random() * (b - a)) * 1000
    if (now >= w.nextSpike && !w.spikeUntil) {
      w.spikeUntil = now + L.humSpikeLength * 1000
      sound(ctx, 'fluorescent-buzz-surge-loud', 0.9, true)
      ctx.emit('screenShake', { intensity: 0.12, duration: L.humSpikeLength }, { audience: { player: ctx.self.id } })
      s.humAt = now
    }
    if (w.spikeUntil) {
      s.sanity -= L.humSpikeSanity * (moving ? 0.2 : 1) * t
      if (now >= w.spikeUntil) { w.spikeUntil = 0; w.nextSpike = now + (a + ctx.random() * (b - a)) * 1000 }
    }
    // whispers and scratching from just behind a wall beside you
    const [c, d] = L.wallNoiseEvery
    w.nextNoise ??= now + (c + ctx.random() * (d - c)) * 1000
    if (now >= w.nextNoise) {
      w.nextNoise = now + (c + ctx.random() * (d - c)) * 1000
      const side = ctx.random() < 0.5 ? -1 : 1, back = 0.6 + ctx.random()
      const at = { x: p.x + (-af.z * side * 2.6) - af.x * back, y: p.y + 1.2, z: p.z + (af.x * side * 2.6) - af.z * back }
      const clip = ctx.random() < 0.5 ? 'indistinct-whispers-behind-wall' : 'nails-scratching-behind-wall'
      heard(ctx, { clip: SND(clip), position: at, volume: 0.55, refDistance: 1.5, maxDistance: 12 }, { audience: { player: ctx.self.id } })
    }
  }
  // a dark figure at the far end of the hall you face: only you see it, and it is gone in a breath
  if (zone !== 'hub' && ctx.self.place === 'main') {
    const [e, f] = L.figureEvery
    w.nextFigure ??= now + (e + ctx.random() * (f - e)) * 1000
    if (now >= w.nextFigure) {
      const dist = 9 + ctx.random() * 8, eye = { x: p.x, y: p.y + 1.6, z: p.z }
      const hit = raycast(ctx, eye, { x: af.x, y: 0, z: af.z }, { distance: dist, physicsOnly: true, ignoreEntities: [ctx.self.id], bodies: 'static' })
      const d = hit ? hit.distance - 0.8 : dist
      w.nextFigure = now + (d > 7 ? (e + ctx.random() * (f - e)) * 1000 : 4000) // no long sightline: look again soon
      if (d > 7) {
        ctx.spawn({ audience: 'local', lifetime: L.figureSeen, feetPosition: { x: p.x + af.x * d, y: p.y, z: p.z + af.z * d }, rotation: { lookAt: { x: p.x, y: p.y, z: p.z } }, primitive: { kind: 'scripted', script: 'scripts/figure-geo.js' } })
        if (s.sanity > 0) s.sanity -= 3
      }
    }
  }
  // flashlight battery
  if (s.batteryTake) { w.battery = Math.max(0, (w.battery ?? s.battery ?? 0) - s.batteryTake); s.batteryTake = 0 } // a quest or trade spends charge (scripts/l5-goggles.js): the walk's battery is the truth, state mirrors it
  if (w.light) { w.battery -= L.batteryDrain * t * (ctx.self.place === 'level8' ? 2.2 : 1); if (w.battery <= 0) { w.battery = 0; toggleLight(ctx) } }
  if (w.nvg) { w.battery -= L.batteryDrain * 0.25 * t; if (w.battery <= 0 && (s.nvgSpare ?? 0) > 0) { s.nvgSpare -= 1; w.battery = 100; s.notice = { text: `Goggles died · swapped in a spare · ${s.nvgSpare} left`, at: ctx.now() } } if (w.battery <= 0 || ctx.self.place !== 'level6') { w.battery = Math.max(0, w.battery); ctx.destroy(w.nvg); w.nvg = null; s.nvgOn = false } } // goggles drink faster than a torch
  else if (s.nvgOn) s.nvgOn = false
  const st = Math.round(w.stamina), bt = Math.round(w.battery)
  if (st !== s.stamina) s.stamina = st
  if (bt !== s.battery) s.battery = bt
  // a new level: the transition card fades off the black (scripts/ui.js reads s.xfer)
  if (w.lastPlace && w.lastPlace !== ctx.self.place) { const kind = s.clipKind; s.clipKind = undefined; s.xfer = { at: now, to: ctx.self.place, ...(kind ? { kind } : {}) } }
  if (ctx.self.place === 'level6' && w.light) { ctx.destroy(w.light); w.light = null; s.light = false } // the dark swallows it
  w.lastPlace = ctx.self.place
  // a carnivorous balloon's ribbon (scripts/partygoers.js): paralysed where you stand till it lets go
  if (now < (s.stungUntil ?? 0)) { const v = ctx.self.velocity; ctx.self.velocity = { x: 0, y: v.y, z: 0 }; return }
  // down: the body lies where it fell (third person, scripts/camera.js), then you wake at the nearest checkpoint
  if (w.respawnAt) {
    if (now < w.respawnAt) { const v = ctx.self.velocity; ctx.self.velocity = { x: 0, y: v.y, z: 0 }; return }
    w.respawnAt = 0; ctx.self.ragdoll = null
    const cp = nearestCheckpoint(ctx, w.fellAt ?? p)
    ctx.self.feetPosition = cp.pos; if (cp.rot != null) ctx.self.rotation = { yaw: cp.rot }
    ctx.emit('screenFlash', { color: '#000000', duration: 1.0, intensity: 1 }, { audience: { player: ctx.self.id } })
    s.wokeAt = now
    return
  }
  if (!ctx.session.wokeAt && ctx.self.ragdoll) ctx.self.ragdoll = null // a reload mid-fall stands you back up
  // the save: where you stand, every few seconds; a fresh visit wakes you there (level, items, weapons already live in player.state)
  if (!ctx.session.wokeAt) {
    ctx.session.wokeAt = now
    const sp = s.savePos
    if (s.wakeAtSave && sp && s.savePlace === ctx.self.place) { s.wakeAtSave = null; ctx.self.feetPosition = { x: sp.x, y: sp.y + 0.1, z: sp.z }; return } // the station's last-level ride: back where you stood
    s.wakeAtSave = null
    if (ctx.self.place === 'bonus' || s.roomHop) { /* the mall and room hops land where their door puts you (scripts/lib/hub.js) */ }
    else if (sp && s.savePlace && s.savePlace !== 'bonus' && s.savePlace !== ctx.self.place) { ctx.cross(ctx.self, s.savePlace); return }
    if (sp && s.savePlace === ctx.self.place) { ctx.self.feetPosition = { x: sp.x, y: sp.y + 0.1, z: sp.z }; return }
  }
  if (ctx.self.place !== 'bonus' && now - (w.savedAt ?? 0) > 4000) { w.savedAt = now; s.savePos = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10 }; s.savePlace = ctx.self.place }
  // exploring: every new cell is xp
  const { cx, cz } = cellAt(p.x, p.z)
  if (cx >= 0 && cz >= 0 && cx < N && cz < N) {
    const vis = (w.visited ??= decode(s.visited ?? '')), i = cz * N + cx
    if (!vis[i]) { vis[i] = 1; s.visited = encode(vis); s.explored = (s.explored ?? 0) + 1; if (s.explored % (L.xpCellsPer ?? 10) === 0) gain(ctx, L.xpPerCell) }
  }
  // (items are taken with E on what you look at: takeToken above, called from scripts/interact.js)
  // the flickering wall: the way out
  const ex = cellCenter(EXIT.cx, EXIT.cz)
  if (ctx.self.place === 'main' && p.x < -HALF + 1.3 && Math.abs(p.z - ex.z) < 1.8) {
    s.escapes += 1; s.exitAt = now
    gain(ctx, L.xpExit)
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#000000', duration: 0.9, intensity: 1 }, { audience: { player: ctx.self.id } })
    ctx.cross(ctx.self, 'level1#l1-from-main') // through the flickering wall: out of Level 1's door home
    return
  }
  // taken
  if (s.hp <= 0) {
    s.deaths += 1; s.downAt = now
    for (const n of ctx.query({ tags: ['npc'] })) { // dying wipes the slate: every npc here drops its grudge and warning on you (creator's rule)
      const id = ctx.self.id
      for (const k of ['angry', 'fresh', 'warned']) if (n.state?.[k]?.[id]) { const o = { ...n.state[k] }; delete o[id]; n.state[k] = o }
    }
    s.hp = mh; s.sanity = Math.round(ms * 0.6) // no penalty for dying (Shelly): you get up whole
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#5a0000', duration: 0.5, intensity: 0.6 }, { audience: { player: ctx.self.id } })
    // the body goes limp and is knocked back off its feet; the camera pulls out to watch (scripts/camera.js)
    const yaw = ((typeof ctx.self.rotation === 'number' ? ctx.self.rotation : ctx.self.rotation?.yaw) ?? 0) * Math.PI / 180
    ctx.self.ragdoll = { impulse: { x: Math.sin(yaw) * 70, y: 30, z: Math.cos(yaw) * 70 }, settleSeconds: 2.5 }
    w.fellAt = { ...p }; w.respawnAt = now + DOWN_MS
  }
}
