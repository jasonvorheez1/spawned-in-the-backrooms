import { migrate, wakePlace, wakeLog, canSaveHere } from "./lib/save.js"
import { CORRIDOR, agilityProfile, hitObstacle } from './lib/levelrun-mechanics.js'
import { startRescueCut } from './lib/levelrun-cut.js'
import { layout as layout9, zoneAt as zoneAt9 } from './lib/level9.js'
import { firstPersonGun, firstPersonTuning } from './lib/fp-gun.js'
import { setQuest } from './lib/quests.js'
import { learn } from './lib/dina-quest.js'
import { assaulted, forgiveTick, hostileReason } from './lib/forgive.js'
import { preloadTick } from './lib/preload-next.js'
import { powerKnock } from './lib/knock.js'
import SNK from "./lib/data/sneak.yml"
import { yawOf } from "./lib/sneak.js"
import { attrsOf as attrsOfS } from './lib/stats.js'
// The wanderer: walk/sprint on stamina, sanity that the halls eat, a flashlight on battery,
// almond water, swings at smilers, xp and levels. Every number lives in lib/data/level0.yml.
// player.state is the player's save: their level, xp and almonds follow them between visits.
import { canOpen, openWrist, screen } from './lib/screen.js'
import { quickItems, assignQuick } from './lib/quick-items.js'
import { heard } from "./lib/hear.js";
import { vo } from './lib/voices.js'
import PLAYER from './lib/data/player.yml'
import L from './lib/data/level0.yml'
import CAM from './lib/data/camera.yml'
import W, { baseOf } from './lib/weapons.js'
import { raycast } from 'builtin/physics'
import { BLAST, feelBlast } from './lib/blast-fx.js'
import { animate } from 'builtin/tween'
import BRK from './lib/data/breakables.yml'
import { strike } from './lib/breakables.js'
import { startFishing, handleFishingClick, onFishNibble, onFishBite, finishFishingCatch, cancelFishing } from './lib/fishing.js'
import { fire as fireBullets, show as showBullets } from './lib/ballistics.js'
import { swing3, fire3, stagger3, tick3 } from './lib/body3.js'
import { dropLoot, rollLoot, spawnWeapon, poolOf, spawnRemains } from './lib/loot.js'
import { becomeCorpse } from './lib/l5-hostile.js'
import { markKill } from './lib/witness.js'
import { isVilified, repKill } from './lib/rep.js'
import { questKill1 } from './lib/level1-quests.js'
import D from './lib/data/difficulty.yml'
import { penOf, vary } from './lib/combat.js'
import { derived, canCarry, burden, npcMul, START, dmgMul, handling, skillsOf, spentOf, SKILLS, SKILL_MAX, dmgAfterArmor, lookOfNpc } from './lib/stats.js'
import { parseCloth, wear, takeOff, wornRows, fullLook } from './lib/clothes.js'
import { wMul, jamChance, isBroken, useWear, armorWearFor, cndOf, repairAmount, armorCnd, band } from './lib/condition.js'
import { weaponBody, HOLD, MESHGRIP } from './lib/weapon-look.js'
import { HUMAN, humanBody, critterSpec, isNewCat } from './lib/critter-model.js'
import { zoneAt, cellAt, cellCenter, N, HALF, EXIT } from './lib/maze.js'
import { zoneAt as zoneAt1 } from './lib/level1.js'
import L1 from './lib/data/level1.yml'
import { zoneAt as zoneAt2 } from './lib/level2.js'
import { zoneAt as zoneAt21 } from './lib/level21.js'
import { zoneAt as zoneAt31 } from './lib/level31.js'
import { zoneAt as zoneAt70 } from './lib/level70.js'
import L21 from './lib/data/level21.yml'
import L2 from './lib/data/level2.yml'
import { zoneAt as zoneAt3 } from './lib/level3.js'
import { zoneAt as zoneAt4, DRAIN4 } from './lib/level4.js'
import { zoneAt as zoneAt5, DRAIN5 } from './lib/level5.js'
import { beastStruck } from './lib/l5-beast.js'
import L3 from './lib/data/level3.yml'
let L9 = null
const zone9 = (ctx, x, z) => { const sd = ctx.place?.state?.l9seed; if (sd == null) return 'l9_street'; if (L9?.seed !== sd) L9 = layout9(sd); return zoneAt9(L9, x, z) }
const ZONE_RESOLVERS = {
  thehub: (ctx, x, z) => (x > 505 ? 'hub_dark' : x > 2 && x < 30 && z < -4 && z > -16 ? 'hub_meg' : x > 174 && x < 196 && z > 4 && z < 13 ? 'hub_amber' : 'hub_road'),
  level02: (ctx) => (ctx.self.feetPosition.y < -1 ? 'l02_basement' : 'l02_remodel'),
  spamton: () => 'spam_arena',
  bonus: () => 'bonus',
  intake: () => 'intake',
  home11: () => 'home11',
  testlab: () => 'testlab',
  level01: () => 'l01_station',
  level184: () => 'l184_field',
  level26: () => 'l26_ship',
  level27: () => 'l27_springs',
  level34: () => 'l34_sewer',
  levelrun: () => 'lrun_halls',
  level109: () => 'l109_halls',
  level7: (_ctx, x, z) => (Math.hypot(x - 46, z + 120) < 34 ? 'l7_seawatch' : Math.hypot(x + 70, z + 95) < 55 ? 'l7_fort' : z > -4 && Math.hypot(x, z) < 12 ? 'l7_room1' : z > -36 && Math.abs(x) < 10 ? 'l7_pier' : 'l7_sea'),
  level1: (_ctx, x, z) => 'l1_' + zoneAt1(x, z),
  level2: (_ctx, x, z) => 'l2_' + zoneAt2(x, z),
  level3: (_ctx, x, z) => 'l3_' + zoneAt3(x, z),
  gamma: () => 'l3_gamma',
  level4: (ctx, x, z) => 'l4_' + zoneAt4(x, z, ctx.self.state.home),
  level5: (_ctx, x, z) => 'l5_' + (zoneAt5(x, z)?.id ?? 'lobby'),
  level6: () => 'l6_halls',
  level61: () => 'l61_court',
  level12: () => 'l12_matrix',
  level13: () => 'l13_halls',
  level11: () => 'l11_city',
  level10: () => 'l10_fields',
  level8: () => 'l8_cave',
  level9: (ctx, x, z) => zone9(ctx, x, z),
  level21: (_ctx, x, z) => 'l21_' + zoneAt21(x, z),
  level70: (_ctx, x, z) => 'l70_' + zoneAt70(x, z),
  level31: (ctx, x, z) => 'l31_' + (ctx.self.feetPosition.y > 2.5 && x < -24.9 ? 'mezz' : zoneAt31(x, z)),
};
const level0Zone = (ctx, x, z) => (ctx.place?.state?.moments?.manilaAt && Math.abs(x - ctx.place.state.moments.manilaAt.x) < 5.8 && Math.abs(z - ctx.place.state.moments.manilaAt.z) < 5.8 ? 'manila' : zoneAt(x, z));
const zoneHere = (ctx, x, z) => (ZONE_RESOLVERS[ctx.self.place] ?? level0Zone)(ctx, x, z);

import SOUNDS from './lib/data/sounds.yml'
import THROW from './lib/data/throwables.yml'
import { RAG } from './nade.js'
import { stepTick } from './lib/footsteps.js'
import { useCompass, COMPASS } from './lib/compass.js'
import { placeFreshener, nearFresh, FRESH_BODY } from './lib/remodel-quest.js'
import { placeMusicBox, musicNear, kneel } from './lib/musicbox.js'
import L3I from './lib/data/l3items.yml'
import CR from './lib/data/craft.yml'
import AW from './lib/data/almond.yml'
import { MEAT } from './lib/items.js'
import SNACKS from './lib/data/snacks.yml'
import { useGadget } from './lib/rink-items.js'
import { carryAcross } from "./lib/carry.js";
import { onRink, SKATE, skateStep } from './lib/level31.js'
const sndTurn = {}
const SND = (n) => { const takes = SOUNDS[n]; if (!takes?.length) return `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`; sndTurn[n] = ((sndTurn[n] ?? -1) + 1 + (takes.length > 2 ? Math.floor(takes.length / 2) : 0)) % takes.length; return takes[sndTurn[n]] }
const L_PER = () => L.perLevel.damage
const BAUBLE_TINTS = [[2.6, .25, .2], [.3, 2.2, .45], [2.6, 1.9, .5], [.5, .9, 2.6], [2.2, .5, 2]] // red, green, gold, blue, pink glass
const BAUBLE_TRAIL = `fx
pop glit rate=?mobile:40|80 at=point() life=.35..0.7 v=sdir()*(.2..0.6) size=.015..0.035 acc=grav()*.15+drag(2) col=<%tint|2.6,.3,.2>*flick(9,.6) a=1>0 sz=$size*(1>.3) r=sprite(ember,add)
pop star rate=?mobile:6|12 at=point() life=.4..0.6 size=.05..0.09 col=hdr(3,2.6,1.6) a=1>0 sz=$size*(.4>1>0) rot=spin(1.5) r=sprite(mote,add)`
const BAUBLE_PUFF = `fx
pop smoke burst=?mobile:5|9 life=.4..0.8 v=sdir()*(.4..1)+up(.4) size=.12..0.22 acc=drag(3)+buoy(.4) col=<.92,.9,.88> a=.5>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop confetti burst=?mobile:10|18 life=.5..0.9 v=sdir()*(1.5..3) size=.015..0.03 spin=-10..10 tint=<2.4,.3,.25>..<.3,2.2,.5> acc=grav()*.5+drag(2) col=$tint a=1>0 sz=$size rot=$age*$spin r=sprite(stalk,add,velocity,.02)
pop flash burst=1 life=.08 r=light(<%tint|2.6,.3,.2>,10,4)`
const GS = (wp, key, fb) => wp?.sfx?.[key] ?? fb // a gun's own handling sound (weapons.yml sfx: open, eject, insert, shell, done, dry), else the stock one
const perRound = (wp) => !!(wp.pellets || wp.tube || wp.wheel) // loaded one round at a time, and a shot can interrupt it
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

const ROCKET_TRAIL = `fx
pop flame rate=?mobile:40|80 at=point() life=.08..0.16 v=sdir()*.4 size=.1..0.18 sz=$size*(1>.3) col=hdr(5,3,1)>hdr(2,.6,.1) a=1>0 r=sprite(flame-wisp,add)
pop smoke rate=?mobile:24|48 at=point() life=1.6..2.8 v=sdir()*.25+up(.15) size=.14..0.24 acc=drag(1.2)+curl(.3)*.4 sz=$size*(.6>2.6) col=<.62,.6,.57> a=0>.08:.45>.5:.25>0 r=sprite(smoke-puff,alpha)
pop glow n=1 r=light(<1,.6,.25>,6,5)`
const BACKBLAST = `fx
pop blast burst=?mobile:14|26 life=.25..0.5 v=<%dx|0,0,%dz|0>*(4..8)+sdir()*1.2 size=.25..0.5 acc=drag(3) sz=$size*(.5>1.6) col=hdr(3,1.8,.6)>hdr(.5,.4,.35) a=1>0 r=sprite(smoke-puff,add)
pop dust burst=?mobile:10|20 life=1..1.8 v=<%dx|0,0,%dz|0>*(2..4)+up(.4)+sdir()*.6 size=.3..0.6 acc=drag(1.6)+buoy(.3) sz=$size*(.6>2.4) col=<.55,.52,.48> a=0>.1:.4>.6:.2>0 r=sprite(smoke-puff,alpha)
pop flash burst=1 life=.1 r=light(<1,.7,.35>,14*(1>0),5)
pop muzzle burst=1 life=.07 at=point() size=.6 col=hdr(3.5,2.4,1.1) a=.8>0 sz=$size*(.5>1.4) r=sprite(soft-disc,add)`

export const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? derived(s).hpBonus : 0)
export const maxSan = (lv, s) => L.sanity + (lv - 1) * L.perLevel.sanity + ((s?.snacks?.slap_bracelet ?? 0) > 0 ? 5 : 0) + (s?.attr ? derived(s).sanBonus : 0)
export const xpNeed = (lv) => L.xpBase * lv

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',') : [])]
const usable = (s, k) => !!W[k] // no level lock on weapons (Shelly, #37: any weapon you hold works)
import XMAS from './lib/data/xmas.yml'
const inXmas = (f) => f && f.x > XMAS.bounds.x0 && f.x < XMAS.bounds.x1 && f.z > XMAS.bounds.z0 && f.z < XMAS.bounds.z1 // no hum in the Christmas Area
export const weaponOf = (s) => W[s.equipped] ?? W.fists

const DOWN_MS = 3200 // how long you watch yourself lie there (Savi's pick); camera.js and the creatures read the same window
// checkpoints: each place's safe spawn plus every doorway's arrival marker; you wake at the nearest one
const CHECKS = { main: ['main-from-l1'], level1: ['l1-from-main', 'l1-from-l2'], level2: ['l2-from-l1', 'l2-from-l3', 'l2-from-l21'], level21: ['l21-from-l2', 'l21-from-l8'], level3: ['l3-from-l2', 'l3-gamma-door', 'l3-lift-arrive', 'l3-from-l5'], level4: ['l4-lift-arrive', 'l4-from-l5'], level5: ['l5-from-l3', 'l5-from-l4', 'l5-from-l6', 'l5-lobby'], level6: ['l6-from-l5', 'l6-from-l7', 'l6-from-l61'], level61: ['l61-from-l6', 'l61-from-l4', 'l61-arrive'], level11: ['l11-from-l61', 'l11-spawn'], level7: ['l7-from-l6', 'l7-seawatch-spawn', 'l7-fort-spawn'], level8: ['l8-from-l7', 'l8-from-camp', 'l8-from-l21'], level9: ['l9-from-l8', 'l9-from-hub'], gamma: [] }
import { slotInfo as l109Slot, corridor as l109Cor } from './lib/level109.js'
const L109_DRAIN = { arrival: 0, arrivalR: 60, halls: 0.035 } // sanity per second in Level 109: none near the arrival corridor, slow elsewhere (review: 47% to 9% in 5 min was too fast)
const L109_WAKE = { in: 3.5, along: 0.8 } // metres in from the safe supply room's door (ns0_n1p): where a Level 109 death wakes you
function nearestCheckpoint(ctx, at) {
  if (ctx.self.place === 'level109') { const seed = ctx.place.state?.l109seed; if (seed != null) { const i = l109Slot(seed, l109Cor(seed, 'ns', 0), -1, 1); return { pos: { x: i.door.x + L109_WAKE.in, y: 0.1, z: i.door.z + L109_WAKE.along }, rot: -90 } } }
  if (ctx.self.place === 'levelrun') return ctx.self.state?.lrunRescued ? { pos: { ...CORRIDOR.safePos }, rot: CORRIDOR.safeYaw } : { pos: { x: 0, y: 0.1, z: 1.5 }, rot: 0 }
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
const CONCRETE = new Set(['level1', 'level2', 'level3', 'gamma', 'level6', 'level11'])
function floorOf(ctx) {
  const pl = ctx.self.place
  if (pl === 'level8') return 'gravel'
  if (pl === 'level9') return zone9(ctx, ctx.self.feetPosition.x, ctx.self.feetPosition.z) === 'l9_house' ? 'office' : 'concrete'
  if (pl === 'level10') return 'field'
  if (pl === 'level7') return 'wood'
  if (pl === 'level61') return 'terrazzo'
  if (pl === 'level4') return 'office'
  if (pl === 'bonus') return 'terrazzo' // the mall: polished floor, not Level 0's damp carpet
  if (pl === 'level26' || pl === 'home11') return 'wood' // a ship's deck, a home's boards
  if (pl === 'level02') return ctx.self.feetPosition.y < -0.4 ? 'wood' : 'hotel'
  if (pl === 'intake') return 'hotel' // a bedroom's dry plush carpet
  if (pl === 'spamton') return 'metal'
  if (pl === 'level184') return 'grass'
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
// tapes HALOGEN can play: id → the reel and its length in seconds
export const HOLO = { janine: { clip: '/cdn/value.900b3daa6e65af35597a6811068d5d0de528bb94eacfaed34723d8bc22f94e81.mp3', len: 512, name: 'M.E.G. Interview Log 10328' }, beast18: { clip: '/cdn/value.3863a6524e3c97d5f8d0bafa6c84d550c267084037f980dd487716a00f09ab5d.mp3', len: 25, name: 'Entity 18 · The Last Signatory' }, dina4: { who: 'q-dina', line: "Dina, tape four. I have six ways down on my map and not one way out. A man on the pipes swears there is a signal from home. I took a room at the hotel to think it over.", len: 14, name: 'Dina, Tape Four' }, b8: { clip: '/cdn/value.08ccdd2071a61c196217f8ad7fa7b0a1773fbe9bcef00b87df3b58018e00a788.mp3', len: 24, name: 'B8, Night Forty' }, r55: { clip: '/cdn/value.b7bbbfcb923978bb4ac8ae234d44454562debf569936a5f20c378f0e28110e01.mp3', len: 35, name: 'Atomic Age Defender' }, walt41: { clip: '/cdn/value.13b431f3dead226e2ffab8155644c00c326ef6767b9b57df23b71353cbd1a50e.mp3', len: 28, name: 'Field Test 41' }, matrix: { clip: '/cdn/value.a39bb477f8132dc691b97e44f8176bb55b7faf1e7cf241e1e54b2e0a8c0e013b.mp3', len: 24, name: 'Expedition Log: Matrix' } }
export function holoEnd(ctx, p) {
  const s = ctx.self.state
  if (s.holoPlay?.at !== p?.at) return
  if (s.holoPlay?.id === 'matrix' && !s.know12) { // Harris's log heard to the end: the lit window in Level 11's alley lets them through
    s.know12 = true; s.u12At = ctx.now()
    if (!s.qdone?.['the-lit-window']) setQuest(s, 'the-lit-window', { name: 'The Lit Window', step: 'Walk straight into the lit window in the alley with the green dumpster', mark: { place: 'level11', id: 'l11-win12' } })
  }
  s.holoPlay = null
}
function swapBattery(ctx) { // a fresh cell into the flashlight from the bag; true if one went in
  const s = ctx.self.state, w = walkOf(ctx)
  if ((s.batteries ?? 0) <= 0) return false
  s.batteries -= 1; w.battery = 100; s.battery = 100
  s.notice = { text: `Fresh battery in · ${s.batteries} spare`, at: ctx.now() }; sound(ctx, 'pickup-ammo', 0.6, true)
  return true
}
export function takeToken(ctx, token, opts) {
  const r = takeToken0(ctx, token, opts), f = CR.food[token]
  if (r.ok && f && !SNACKS[token]) { const s = ctx.self.state; s.hunger = Math.min(100, (s.hunger ?? 100) + f) }
  return r
}
function takeToken0(ctx, token, opts) {
  const s = ctx.self.state, now = ctx.now()
  if (token.startsWith('furn:')) { const k = token.slice(5); s.furn = { ...(s.furn ?? {}), [k]: (s.furn?.[k] ?? 0) + 1 }; sound(ctx, 'loot-take-all-rustle', 0.35, true); return { ok: true } } // furniture back into your build menu
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
    const key = AW_KEY[c]; s[key] = (s[key] ?? 0) + 1; if (opts?.xp !== false) gain(ctx, L.xpAlmond); s.pickedAt = now
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
  if (token === 'latex') { // balloon latex pellets, salvaged from popped Level 26 balloons
    s.latex = (s.latex ?? 0) + W.latex.perPickup; s.pickedAt = now
    sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'rockets') { // the B3 armory's 84 mm rounds (Level 109)
    s.rockets = (s.rockets ?? 0) + 1; s.pickedAt = now
    sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'cells') { // Zenith energy cells for the laser weapons
    s.cells = (s.cells ?? 0) + W.cells.perPickup; s.pickedAt = now
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
    s.pickedAt = now; if (opts?.xp !== false) gain(ctx, L.xpAlmond); s.notice = { text: 'You eat the royal ration. You feel whole again', at: now }
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
    return { ok: true }
  }
  if (token === 'bobbypin' || token === 'pin' || token === 'bobby_pin') { s.bobbypins = (s.bobbypins ?? 0) + 1; s.pickedAt = now; s.notice = { text: `Bobby pin (${s.bobbypins} carried)`, at: now }; sound(ctx, 'pickup-ammo', 0.5, true); return { ok: true } }
  if (token === 'repellent') { s.repellent = (s.repellent ?? 0) + 1; s.pickedAt = now; s.notice = { text: 'Smiler Repellent. A few drops, clear as almond water. Rare', at: now }; sound(ctx, 'plastic-bottle-pickup-rattle', 0.6, true); return { ok: true } }
  if (token === 'fs_ingot') { s.fsIngot = (s.fsIngot ?? 0) + 1; s.pickedAt = now; sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true } }
  if (token === 'firesalt') { s.firesalt = (s.firesalt ?? 0) + 1; s.pickedAt = now; sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true } }
  if (token.startsWith('holo:')) { // a tape: kept, played on HALOGEN (I > Misc > PLAY)
    const id = token.slice(5), have = String(s.holotapes ?? '').split(',').filter(Boolean)
    if (!have.includes(id)) have.push(id)
    s.holotapes = have.join(','); s.pickedAt = now; s.notice = { text: 'Tape · play it on HALOGEN (I > Misc)', at: now }
    sound(ctx, 'loot-take-all-rustle', 0.4, true); return { ok: true }
  }
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
    s.pickedAt = now; if (opts?.xp !== false) gain(ctx, L.xpAlmond)
    sound(ctx, token === 'ration' ? 'plastic-bottle-pickup-rattle' : 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'bread') {
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s)
    s.hp = Math.min(mh, (s.hp ?? mh) + 40 * derived(s).heal)
    s.sanity = Math.min(ms, (s.sanity ?? ms) + 25)
    s.pickedAt = now; if (opts?.xp !== false) gain(ctx, 30)
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
  return takeToken1(ctx, token, opts)
}
export function useSnack(ctx, token) { // consume one from the bag
  const s = ctx.self.state, now = ctx.now(), n = s.snacks?.[token] ?? 0
  if (n <= 0 || !SNACKS[token]) return
  if (SNACKS[token].use) { useGadget(ctx, token, SNACKS[token], n); return } // Level 31 gadgets (scripts/lib/rink-items.js)
  if (token === 'musicbox') { s.invOpen = false; placeMusicBox(ctx); return } // set down, not eaten (scripts/lib/musicbox.js)
  if (SNACKS[token].quest) { s.notice = { text: SNACKS[token].name + ': ' + SNACKS[token].info, at: now }; return } // Level 70 quest goods: looked at, kept
  if (SNACKS[token].keep) { // a keepsake: used, not eaten, once per cooldown
    const v = SNACKS[token], left = ((s.keepAt?.[token] ?? -1e12) + v.cooldown * 1000 - now) / 1000
    if (left > 0) { s.notice = { text: `${v.name}: the spring needs ${Math.ceil(left / 60)} min`, at: now }; return }
    s.keepAt = { ...s.keepAt, [token]: now }; const ms = maxSan(s.level, s); s.sanity = Math.min(ms, (s.sanity ?? ms) + v.sanity)
    ctx.emit('playSound', { clip: v.clip, position: ctx.self.feetPosition, volume: 0.6 }); s.notice = { text: `${v.name}. Sanity +${v.sanity}`, at: now }; return
  }
  s.snacks = { ...s.snacks, [token]: n - 1 }
  {
    const v = SNACKS[token], mh = maxHp(s.level, s), ms = maxSan(s.level, s)
    s.hp = Math.min(mh, (s.hp ?? mh) + v.hp * (v.aid ? derived(s).healMed : derived(s).heal)); s.sanity = Math.min(ms, (s.sanity ?? ms) + v.sanity)
    s.hunger = Math.max(0, Math.min(100, (s.hunger ?? 100) + v.hunger)); s.thirst = Math.max(0, Math.min(100, (s.thirst ?? 100) + v.thirst))
    if (v.warm) s.chill = Math.max(0, (s.chill ?? 0) - v.warm) // Level 70 cold (scripts/lib/level70-quest.js)
    if (v.drunk) { s.drunk = Math.min(100, (s.drunk ?? 0) + v.drunk); s.drunkAt = now }
    if (v.stamina) { const w = walkOf(ctx); w.stamina = Math.min(L.stamina * 2, (w.stamina ?? s.stamina ?? 0) + v.stamina) }
    s.pickedAt = now; s.notice = { text: `${v.name}. ${v.drink ? `Thirst +${v.thirst}` : `Hunger +${v.hunger}`}`, at: now }
    sound(ctx, v.drink ? 'drinking-gulp-swallow' : 'eating-chewing-food', 0.7, true)
  }
}
function takeToken1(ctx, token, opts) {
  const s = ctx.self.state, now = ctx.now()
  if (token === 'beans' || token === 'bar' || token === 'firstaid') { // Level 2 food and first aid, used on the spot
    const mh = maxHp(s.level, s), ms = maxSan(s.level, s), U = L2.use
    s.hp = Math.min(mh, (s.hp ?? mh) + (token === 'beans' ? U.beansHp * derived(s).heal : token === 'bar' ? U.barHp * derived(s).heal : U.firstaidHp * derived(s).healMed))
    if (token === 'beans') s.sanity = Math.min(ms, (s.sanity ?? ms) + U.beansSanity)
    if (token === 'bar') { const w = walkOf(ctx); w.stamina = Math.min(L.stamina * 2, (w.stamina ?? s.stamina ?? 0) + U.barStamina) }
    s.pickedAt = now; if (opts?.xp !== false) gain(ctx, L.xpAlmond)
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
  if (token === 'stuffing') { s.stuffing = (s.stuffing ?? 0) + 1; s.pickedAt = now; s.notice = { text: `Stuffing (${s.stuffing}). Soft. Cold`, at: now }; return { ok: true } }
  if (token === 'frag' || token === 'molotov' || token === 'bauble') { // throwables: counted, G throws (data/throwables.yml)
    const T = THROW[token]; s[T.key] = (s[T.key] ?? 0) + 1; s.pickedAt = now
    s.notice = { text: `${T.name} (${s[T.key]} carried) · G to throw`, at: now }
    sound(ctx, 'pickup-ammo', 0.6, true)
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
  if (token === 'skates') { // Level 31's rental skates: owning them is what makes the rink rideable (scripts/lib/level31.js)
    if (s.skates) { s.cents = (s.cents ?? 0) + 500; s.notice = { text: 'You already have skates. The Coach hands your $5 back.', at: now }; return { ok: true } }
    s.skates = true; s.pickedAt = now; s.notice = { text: 'Roller skates · they go on when you step onto the wood · forward pushes, let go to glide, back to brake', at: now }
    sound(ctx, 'pickup-ammo', 0.6, true); return { ok: true }
  }
  if (token === 'compass') { // an old compass: a few reads left in it (use it from the inventory or a quick slot)
    s.compass = (s.compass ?? 0) + COMPASS.charges; s.pickedAt = now
    s.notice = { text: `Old compass · ${s.compass} reads · assign a quick slot in the inventory`, at: now }
    sound(ctx, 'pickup-ammo', 0.5, true)
    return { ok: true }
  }
  if (token === 'battery') { // carried, not spent on pickup (Shelly Nov 13: "no way to recharge it even though i have batteries"): the flashlight swaps one in when it runs dry
    s.batteries = (s.batteries ?? 0) + 1; s.pickedAt = now; s.notice = { text: `Battery · ${s.batteries} spare`, at: now }
    sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token.startsWith('book:')) { // a skill book: +3 to that skill, read on the spot
    const i = SKILLS.findIndex((k) => k.k === token.slice(5))
    if (i < 0) return { ok: false, msg: '' }
    if (skillsOf(s)[SKILLS[i].k] >= SKILL_MAX) return { ok: false, msg: `${SKILLS[i].name} is already 100` }
    const sp = spentOf(s); sp[i] += 3; s.skl = sp.join(',')
    s.pickedAt = now; s.notice = { text: `You read the book: ${SKILLS[i].name} +3`, at: now }; if (opts?.xp !== false) gain(ctx, L.xpAlmond)
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
    if (opts?.xp !== false) gain(ctx, W[k].xp ?? L.xpAlmond)
    sound(ctx, 'pickup-weapon', 0.7, true)
    return { ok: true }
  }
  return { ok: false, msg: '' }
}

// Shared by firing and NPC reactions so both use the same eye and crosshair.
export function weaponAim(ctx) {
  const me = ctx.self, s = me.state, p = me.feetPosition
  const ch = ctx.getObject(me.id + '/critter-head') ? (CAM.critterEye ?? 1.2) * (me.effectiveScale?.y ?? 1) : null
  const eye = { x: p.x, y: p.y + (ch ? ch * (s.crouch ? 0.62 : 1) : (s.crouch ? 1.0 : 1.45)), z: p.z }
  let fwd = walkOf(ctx).fwd ?? { x: 0, z: -1 }, pitch = s.aimPitch ?? 0
  if (s.tp && s.aimPt) {
    const dx = s.aimPt.x - eye.x, dy = s.aimPt.y - eye.y, dz = s.aimPt.z - eye.z
    const horizontal = Math.hypot(dx, dz)
    if (horizontal > 1.2) {
      fwd = { x: dx / horizontal, z: dz / horizontal }
      pitch = Math.atan2(dy, horizontal)
    }
  }
  return { eye, fwd, pitch }
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
  if (input.pressed.crouch) {
    if (ctx.self.place === 'levelrun' && !ctx.self.state.lrunRescued && !ctx.self.state.lrunCut) {
      const nowD = ctx.now(), agiP = agilityProfile(ctx.self.state)
      if (nowD >= (w.lrunDodgeCd ?? 0) && (w.stamina ?? 0) >= agiP.dodgeStaminaCost) {
        w.stamina = Math.max(0, (w.stamina ?? 0) - agiP.dodgeStaminaCost)
        w.lrunDodgeUntil = nowD + 220
        w.lrunDodgeCd = nowD + agiP.dodgeCooldownMs
        w.lrunDodgeDir = mag > 0.1 ? { ...w.dir } : { ...w.fwd }
        ctx.self.state.ch2AgilityUsed = (ctx.self.state.ch2AgilityUsed ?? 0) + 1
        sound(ctx, 'gun-raise-cloth-rustle', 0.45, true)
      }
    } else ctx.self.state.crouch = !ctx.self.state.crouch // ctrl toggles a crouch: slow, quiet, low
  }
  if (ctx.self.state.crouch && (input.pressed.jump || (w.sprint && Math.hypot(mx, mz) > 0.1))) ctx.self.state.crouch = false // jumping or running stands you up
  if (input.pressed.jump && ctx.self.grounded && !ctx.self.parent) {
    const v = ctx.self.velocity
    const jMul = ctx.self.place === 'levelrun' && !ctx.self.state.lrunRescued ? agilityProfile(ctx.self.state).jumpMul : 1
    ctx.self.velocity = { x: v.x, y: PLAYER.jumpSpeed * jMul, z: v.z }
    sound(ctx, (STEPS[floorOf(ctx)] ?? Object.values(STEPS)[0]).walk, 0.4, true)
  }
  { // update aim before firing, including when both buttons change on the same tick
    const sv = ctx.self.state, aw = W[sv.equipped]
    const ads = !!(input.held.aim && aw?.ranged && !sv.reloading && !sv.sheathed && !sv.building && !sv.invOpen && !sv.lootOpen && !(sv.downAt && ctx.now() - sv.downAt < 1200))
    if (!!sv.ads !== ads) { sv.ads = ads; if (ads) sv.adsAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.25, true) }
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
  if (input.pressed.drink && canOpen(ctx.self.state, ctx.self.place, 'inventory')) { openWrist(ctx.self.state, 'inventory'); ctx.self.state.invTab = 'aid' }
  for (let slot=0; slot<10; slot++) if (input.pressed['quick'+slot]) { if (ctx.self.state.invOpen) invAction(ctx, { k: 'quickSlot', slot }); else quickUse(ctx, slot) } // in HALOGEN a number key files the picked item there
  if (input.pressed.quickUse) quickUse(ctx, input.actionData?.quickUse?.slot)
  if (input.pressed.compass && canOpen(ctx.self.state, ctx.self.place, 'inventory')) { openWrist(ctx.self.state, 'inventory'); ctx.self.state.invTab = 'misc' }
  if (input.pressed.cycleWeapon && !ctx.self.state.building) cycleWeapon(ctx)
  if (input.pressed.holster) toggleHolster(ctx) // H: put it away, H again: draw the last one
  { // R: a tap reloads, a hold (0.45 s) holsters or draws (Fallout)
    const w = walkOf(ctx), bld = ctx.self.state.building
    if (input.pressed.reload && !bld) { w.rDown = ctx.now(); w.rHeld = false }
    if (w.rDown && input.held.reload && !w.rHeld && ctx.now() - w.rDown >= 450) { w.rHeld = true; toggleHolster(ctx) }
    if (input.released.reload || (w.rDown && !input.held.reload)) { if (w.rDown && !w.rHeld && !bld) startReload(ctx); w.rDown = 0; w.rHeld = false } // R turns the piece in build mode
  }
  if (input.pressed.flashlight) toggleLight(ctx)
  if (input.pressed.throw && !ctx.self.state.building && !ctx.self.state.invOpen) pullPin(ctx)
  if (input.released.throw || (walkOf(ctx).nade && !input.held.throw)) letFly(ctx)
}

// balloon guns (Shelly Nov 14): each hit ties balloons on; enough of them and the thing floats away helpless (lib/knock.js answers state.lift)
const BALLOON_GLB = "/cdn/value.bbcd28912111e39613cec71f06224b7742148d3493106c89a76f739e3003f366.glb"
const BALLOON_TINT = ["oklch(0.66 0.22 25)", "oklch(0.72 0.19 140)", "oklch(0.7 0.17 250)", "oklch(0.85 0.17 95)", "oklch(0.7 0.2 330)"]
function tieBalloons(ctx, m, n, wp) {
  if (!m.state || m.state.dead || (m.state.hp ?? 1) <= 0) return
  const now = ctx.now(), L = m.state.lift
  const tied = Math.min(6, (L && now - L.at < L.ms ? L.n : 0) + Math.max(1, Math.ceil(n / 3)))
  const hgt = wp.balloonLift * tied
  m.state.lift = { at: now, ms: wp.balloonMs, h: Math.min(6, hgt), n: tied, y0: L && now - L.at < L.ms ? L.y0 : m.feetPosition.y }
  for (let i = 0; i < Math.max(1, Math.ceil(n / 3)) && i < 3; i++) {
    const a = ctx.random() * 6.283
    ctx.spawn({ parent: m.id, lifetime: wp.balloonMs / 1000, tags: ['tied-balloon'], physics: 'none', castShadow: false,
      feetPosition: { x: Math.cos(a) * 0.25, y: 1.9 + ctx.random() * 0.5, z: Math.sin(a) * 0.25 },
      model: { id: BALLOON_GLB, materials: { '*': { color: BALLOON_TINT[(ctx.random() * BALLOON_TINT.length) | 0] } } },
      layout: { box: { min: { x: -0.2, y: 0, z: -0.2 }, max: { x: 0.2, y: 0.55, z: 0.2 } } } })
  }
  const at = { x: m.feetPosition.x, y: m.feetPosition.y + 1.8, z: m.feetPosition.z }
  ctx.emit('playSound', { clip: SND('rubber-balloons-squeaking-and-inflating-fast'), position: at, volume: 0.9 })
  if (tied >= 2) ctx.emit('damageNumber', { position: { ...at, y: at.y + 0.6 }, text: 'AIRBORNE', color: '#c8ff60', size: 1.1 })
}

function popBalloons(ctx, m) { // shot the balloons holding it up: they burst and it falls
  if (!m.state?.lift) return
  m.state.lift = null
  for (const c of ctx.query({ tags: ['tied-balloon'], radius: 4, center: m.feetPosition })) if (ctx.getObject(c.id)?.parent?.id === m.id) ctx.destroy(c.id)
  const at = { x: m.feetPosition.x, y: m.feetPosition.y + 2.1, z: m.feetPosition.z }
  ctx.emit('playSound', { clip: SND('loud-balloon-pop-bang'), position: at, volume: 1 })
  ctx.emit('fx', { position: at, script: "fx\npop bits burst=16..24 life=.6..1.1 v=sdir()*(2..4) size=.05..0.1 spin=-8..8 tint=oklch(.7 .2 25)..oklch(.75 .18 140) acc=grav()*.5+drag(2) col=$tint a=1>.7:1>0 sz=$size rot=$age*$spin r=sprite(chip,alpha,velocity,.02)" })
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
  if (m.tags?.includes('l5-beast')) { beastStruck(ctx, m); return } // the Gentleman takes no damage: he stops letting you see him (scripts/lib/l5-beast.js)
  const defending = npc && (isVilified(s, m) || hostileReason(ctx, m, ctx.self) === "hostile");
  m.state.hp -= dmg
  if (!npc && !m.tags?.includes('l61fc')) { const sp0 = ctx.self.feetPosition, v0 = ctx.self.velocity ?? {}; m.state.shot = { x: sp0.x, z: sp0.z, vx: v0.x ?? 0, vz: v0.z ?? 0, at: ctx.now() } } // a creature that is hit knows where from, however far: smilers, lurkers and hounds go to the spot (hunt.js shotAt)
  m.state.hitDir = { x: Math.round(f.x * 100) / 100, z: Math.round(f.z * 100) / 100, p: Math.round(heavy * 100) / 100 } // the killing blow's push for a ragdoll death
  if (heavy && !W[s.equipped]?.ranged && powerKnock(ctx, m, f, heavy, attrsOfS(s)) > 0) { ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2.2, z: m.feetPosition.z }, text: 'KNOCKDOWN', color: '#ff9a3c', size: 1.2 }); sound(ctx, 'brutal-kick-body-flies-and-crashes', 1) }
  if (npc || m.tags?.includes('l61fc')) assaulted(ctx, m, ctx.self)
  const hit = { x: m.feetPosition.x, y: m.feetPosition.y + 1.5, z: m.feetPosition.z }
  if (loud) { const hw = weaponOf(s); sound(ctx, (!hw?.ranged && hw?.hit) || 'heavy-pipe-hit-flesh-thud', 0.95) } // each melee weapon lands with its own sound (Shelly Nov 14)
  ctx.emit('damageNumber', { position: hit, value: dmg, color: '#f7d98b' })
  ctx.emit('fx', { position: hit, script: m.tags?.includes('stealer') ? CLEAR : m.tags?.includes('zdrone') ? ZAP : ICHOR }) // a drone throws sparks, not blood // blood runs clear, don't get near
  if (L3I.stun.kinds.includes(baseOf(s.equipped ?? 'fists'))) { // the baton arcs: sparks, a zap, and the thing struck staggers
    m.state.stunUntil = ctx.now() + L3I.stun.ms
    ctx.emit('fx', { position: hit, script: ZAP })
    sound(ctx, 'electric-zap-arc-crackle', 0.85)
  }
  if ((s.firesaltUntil ?? 0) > ctx.now() && !W[s.equipped]?.ranged) ctx.emit('fx', { position: hit, script: EMBER })
  ctx.emit('squash', { target: m.id, axis: 'y', intensity: 0.25, duration: 0.18 })
  ctx.emit('flash', { target: m.id, color: '#ffffff', duration: 0.1 })
  ctx.emit('hitstop', { duration: 0.06 + heavy * 0.07 }, { audience: { player: ctx.self.id } })
  s.hitAt = ctx.now(); s.hitHeavy = heavy // scripts/lib/vmpose.js jolts a held melee weapon on it
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.3 + heavy * 0.5 }, { audience: { player: ctx.self.id } })
  if (heavy) {
    ctx.emit('screenShake', { intensity: 0.25 * heavy, duration: 0.18 }, { audience: { player: ctx.self.id } })
    ctx.emit('shockwave', { position: hit, speed: 6, thickness: 0.3, intensity: 0.4 * heavy })
    ctx.emit('damageNumber', { position: { ...hit, y: hit.y + 0.4 }, text: 'HEAVY', color: '#ffb347', size: 1.2 })
  }
  if (m.state.hp <= 0 && !m.state.dead) {
    m.state.dead = true
    if (W[s.equipped]?.vaporize) vaporize(ctx, m, hit, npc) // the R-55: the thing burns to light and ash where it stood
    { const seen = markKill(ctx, m, ctx.self); if ((m.tags ?? []).includes('npc')) { repKill(ctx, m, ctx.self, seen, defending); questKill1(ctx, ctx.self, m) } if (npc && !seen.length && s.crouch) s.notice = { text: 'Nobody saw that', at: ctx.now() } } // witnesses: scripts/lib/witness.js
    s.kills += 1
    gain(ctx, m.state?.kind === 'lurker' ? L.xpLurker : L.xpKill)
    const tg = m.tags ?? [], ent = tg.includes('smiler') || tg.includes('lurker')
    if (ent) dropLoot(ctx, m.feetPosition, tg.includes('lurker') ? 'Lurker remains' : 'Smiler remains', npcMul(m.state).loot, derived(s).clothFind, poolOf(ctx.self.place)) // only smilers and lurkers leave smiler/lurker remains
    else if (!npc && !tg.some((g) => g === 'zdrone' || g === 'l5staff' || g === 'l5rat' || g === 'l10worm' || g === 'l7beast' || g === 'l11foe' || g === 'remains' || g === 'spamboss')) becomeCorpse(ctx, m, (m.state?.name ?? 'Body').split(' ·')[0] + "'s body", rollLoot(ctx, npcMul(m.state).loot, derived(s).clothFind, poolOf(ctx.self.place)), ctx.self.feetPosition) // anything else stays its own body, limp and searchable // an agent's own body is searched (scripts/meg-agent.js)
  }
}

// the R-55's kill: a white-green flash, a shell of light and ash rising, a warble. An entity is gone at once (its manager clears the row); a person still leaves their things
const VAPOR = `fx
pop flash burst=1 life=.25 size=2.2 col=hdr(3,6,3.5) a=1>0 sz=$size*(.6>1.4) r=sprite(soft-disc,add)
pop motes burst=70..90 on=box(.35,.9,.35) life=.8..1.6 v=up(.6..1.8)+sdir()*(.3..0.9) size=.03..0.07 acc=buoy(1.2)+curl(.8)+drag(1.2) col=hdr(2.6,5,2.8)>.4:hdr(1.6,2.2,1)>hdr(.3,.3,.25) a=1>.6:.9>0 sz=$size*(1>.4) r=sprite(ember,add,velocity,.02)
pop ash burst=30..40 on=box(.3,.8,.3) life=1.4..2.4 v=up(.3..0.8)+sdir()*.3 size=.05..0.1 spin=-4..4 acc=buoy(.4)+curl(.5)+drag(1) col=<.12,.12,.11> a=0>.1:.9>.7:.6>0 rot=$age*$spin r=sprite(stalk,alpha)
pop glow burst=1 life=.6 r=light(<.6,1,.65>,40>0,8)`
function vaporize(ctx, m, hit, npc) {
  ctx.emit('fx', { position: { ...hit, y: hit.y - 0.5 }, script: VAPOR })
  sound(ctx, 'sci-fi-disintegration-crackle-whoosh-into-ash', 0.95)
  ctx.emit('damageNumber', { position: { ...hit, y: hit.y + 0.6 }, text: 'VAPORIZED', color: '#9dffb0', size: 1.3 })
  ctx.emit('screenFlash', { color: '#c8ffd0', duration: 0.12, intensity: 0.25 }, { audience: { player: ctx.self.id } })
  if (!npc) m.visible = false
}

function swing(ctx, power = 0) {
  const w = walkOf(ctx), s = ctx.self.state, now = ctx.now(), P = W.power
  if (s.sheathed) return // holstered: nothing to swing
  if (s.building) return // B mode: the click places a piece (scripts/build.js)
  if (now < (w.nextSwing ?? 0) || (s.downAt && now - s.downAt < 1200)) return
  const wp = weaponOf(s)
  if (s.equipped !== 'fists' && isBroken(cndOf(s, s.equipped))) { w.nextSwing = now + 700; if (now - (w.brokeSay ?? 0) > 2500) { w.brokeSay = now; s.notice = { text: `Your ${wp.name.toLowerCase()} is BROKEN: repair it in the inventory (I)`, at: now } } return }
  if (s.equipped !== 'fists' && !s.reloading && !(wp.ranged && (s['loaded_' + s.equipped] ?? 0) <= 0) && ctx.random() < jamChance(cndOf(s, s.equipped)) * (wp.ranged ? 1 : 0.5)) {
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
  if (wp.squirt && s.sqLiq == null) { s.sqLiq = 'water'; s.sqfill = 25 } // a new squirt gun comes with its tank full of tap water
  if (wp.ranged) {
    if (s.reloading) {
      // a shotgun can be fired mid-reload (the reload stops); a magazine gun has to finish
      if (perRound(wp) && (s[loadedKey] ?? 0) > 0) cancelReload(ctx)
      else return
    }
    if ((s[loadedKey] ?? 0) <= 0) {
      w.nextSwing = now + 350
      if (s.god || (s[ammoKey] ?? 0) > 0) startReload(ctx)
      else { sound(ctx, GS(wp, 'dry', 'gun-dry-fire-click'), 0.6, true); s.dryAt = now }
      return
    }
    s[loadedKey] -= 1 // god mode empties the magazine and reloads like anyone, its reserve never runs out (Shelly, Nov 14: 'let me test reloading')
    sound(ctx, wp.sound ?? (wp.pellets ? 'shotgun-blast-boom' : 'pistol-gunshot-echo'), 0.95)
    ctx.emit('screenFlash', { color: wp.beam ? '#d6f2ff' : '#fff1c8', duration: 0.06, intensity: wp.pellets ? 0.45 : wp.auto ? 0.12 : 0.25 }, { audience: { player: ctx.self.id } })
    if (wp.spread) { // full auto: the barrel climbs and the cone opens the longer the trigger stays down; heat bleeds off between bursts
      w.heat = Math.min(1, (w.heat ?? 0) * Math.exp(-Math.max(0, now - (w.heatAt ?? 0)) / 350) + (wp.heatPer ?? 0.1)); w.heatAt = now
      ctx.emit('cameraPunch', { direction: { x: (ctx.random() - 0.5) * 0.4, y: 1, z: -0.3 }, intensity: 0.12 + w.heat * 0.18 }, { audience: { player: ctx.self.id } })
    }
    if (!wp.spread) ctx.emit('cameraPunch', { direction: { x: (ctx.random() - 0.5) * 0.5, y: 1, z: -0.3 }, intensity: Math.min(0.55, (wp.recoil?.up ?? 150) / 1000 * 1.1 * handling(s, wp).recoil * (s.ads ? 0.6 : 1)) }, { audience: { player: ctx.self.id } }) // a shot kicks the view up, heavier guns harder
    if (wp.pellets || wp.tube) {
      if (wp.pellets) ctx.emit('screenShake', { intensity: 0.35, duration: 0.2 }, { audience: { player: ctx.self.id } })
      if (!wp.breech) ctx.after(wp.pump ?? 0.55, 'pumpRack', {}) // a break-action has nothing to work between its two barrels
    }
  }
  w.stamina = (w.stamina ?? s.stamina) - wp.stamina * Hd.stam * (power ? P.stamina : 1)
  w.nextSwing = now + wp.cooldown * 1000 * (power ? P.cooldown : 1) * derived(s).swing * Hd.swing
  s.swingHeavy = Math.round(power * 100) / 100
  s.swingAt = now
  { const st = (w.combo3 ??= { n: 0, at: 0 }); st.n = now - st.at > 1100 ? 0 : st.n + 1; st.at = now; if (wp.ranged) fire3(ctx); else swing3(ctx, s.equipped, power, st.n) } // the body's own swing, for the third-person camera and everyone else
  if (s.equipped !== 'fists') s['cnd_' + s.equipped] = Math.max(0, (s['cnd_' + s.equipped] ?? 100) - useWear(wp) * derived(s).wear) // weapons wear with use; Repair slows it
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  if (wp.ranged && wp.squirt) { squirtFire(ctx, s, wp); return }
  if (wp.ranged && wp.rocket) { // the M.E.G. launcher: one rocket flies straight and bursts on what it meets (scripts/nade.js rocket)
    const { eye, fwd: fv, pitch: pv } = weaponAim(ctx), R = wp.rocket, cp = Math.cos(pv), sp = Math.sin(pv)
    const dmg = Math.round((wp.damage + (s.level - 1) * L_PER(s) * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)))
    const dir = { x: fv.x * cp, y: sp, z: fv.z * cp }, from = { x: eye.x + dir.x * 1.0, y: eye.y + dir.y * 1.0 - 0.1, z: eye.z + dir.z * 1.0 }
    ctx.spawn({ tags: ['thrown'], lifetime: 6, feetPosition: from, rotation: { yaw: Math.atan2(-dir.x, -dir.z) * 57.2958, pitch: pv * 57.2958 }, pivot: 'center', castShadow: false,
      primitive: { kind: 'capsule', radius: 0.045, halfHeight: 0.16 }, material: { color: 'oklch(0.42 0.06 125)', roughness: 0.6, metalness: 0.3 },
      fx: { script: ROCKET_TRAIL }, audio: { clip: '/cdn/moodboard-realistic-gritty/sfx-rocket-motor-burning-roar-and-hiss-in-flight-loop.mp3', gain: 0.55, loop: true, spatial: true, maxDistance: 45 }, behavior: 'scripts/nade.js', state: { kind: 'rocket', vel: { x: dir.x * R.speed, y: dir.y * R.speed, z: dir.z * R.speed }, ownerId: ctx.self.id, dmg, radius: R.radius } })
    const back = { x: eye.x - dir.x * 0.9, y: eye.y - 0.15, z: eye.z - dir.z * 0.9 }
    ctx.emit('fx', { position: back, script: BACKBLAST, params: { dx: -dir.x, dz: -dir.z } })
    ctx.emit('fx', { position: { x: eye.x + dir.x * 1.1, y: eye.y + dir.y * 1.1 - 0.1, z: eye.z + dir.z * 1.1 }, script: BACKBLAST, params: { dx: dir.x * 0.4, dz: dir.z * 0.4 } }) // a bloom of fire off the muzzle too
    ctx.emit('screenShake', { intensity: 0.55, duration: 0.3 }, { audience: { player: ctx.self.id } })
    ctx.emit('cameraPunch', { direction: { x: -dir.x * 0.3, y: 1, z: -dir.z * 0.3 }, intensity: 0.75 }, { audience: { player: ctx.self.id } }) // the tube shoves the shoulder back and up
    ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-rocket-launch-deep-thump-and-tube-ring.mp3', volume: 1, maxDistance: 80, position: eye })
    ctx.emit('noise', { position: eye, radius: 50, kind: 'gun' }, { audience: { nearby: eye, radius: 50 } })
    s.kick = Hd.recoil
    return
  }
  if (wp.ranged && wp.lob) { // the Carolynne: a festive grenade launcher, each shot one of the Glass Baubles you throw, arcing out and shattering where it lands (scripts/nade.js bauble)
    const { eye, fwd: fv, pitch: pv } = weaponAim(ctx), L = wp.lob, cp = Math.cos(pv), sp = Math.sin(pv)
    const dmg = Math.round((wp.damage + (s.level - 1) * L_PER(s) * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)))
    const from = { x: eye.x + fv.x * cp * 0.9, y: eye.y + sp * 0.9 - 0.12, z: eye.z + fv.z * cp * 0.9 }
    const vel = { x: fv.x * cp * L.speed, y: sp * L.speed + L.lift, z: fv.z * cp * L.speed }
    const tint = BAUBLE_TINTS[Math.floor(ctx.random() * BAUBLE_TINTS.length)]
    ctx.spawn({ tags: ['thrown'], lifetime: 8, feetPosition: from, model: THROW.bauble.model, layout: { box: { min: { x: -0.07, y: 0, z: -0.07 }, max: { x: 0.07, y: 0.14, z: 0.07 } } },
      fx: { script: BAUBLE_TRAIL, params: { tint } }, castShadow: false,
      behavior: 'scripts/nade.js', state: { kind: 'bauble', vel, ownerId: ctx.self.id, big: true, dmg, radius: L.radius, daze: L.daze, tint } })
    ctx.emit('fx', { position: from, script: BAUBLE_PUFF, params: { tint } })
    ctx.emit('playSound', { clip: '/cdn/moodboard-toon-vibrant/sfx-sleigh-bells-quick-shake-jingle-short.mp3', volume: 0.45, pitch: 0.95 + ctx.random() * 0.12 }) // the bells on the gun ring with each kick
    s.kick = Hd.recoil
    return
  }
  if (wp.ranged) { // real bullets: spread, drop and drag down each pellet's path (scripts/lib/ballistics.js)
    const { eye, fwd: fv, pitch: pv } = weaponAim(ctx)
    const crit = ctx.random() < derived(s).crit + (wp.critBonus ?? 0)
    const base = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * (crit ? (wp.critMul ?? D.crit) : 1)
    const res = fireBullets(ctx, s, wp, w, eye, fv, pv, base)
    const cp = Math.cos(pv), sp = Math.sin(pv); let mz = { x: eye.x + fv.x * cp * 0.8 - fv.z * 0.12, y: eye.y + sp * 0.8 - 0.14, z: eye.z + fv.z * cp * 0.8 + fv.x * 0.12 }
    if (!s.tp) { // first person: the streak leaves the gun's own muzzle, where the viewmodel holds it on the camera (Shelly: "bullets shoot from above them")
      const vf = (w.vm && ctx.getObject(w.vm)?.feetPosition) || {}, at = { x: Number.isFinite(vf.x) ? vf.x : 0.2, y: Number.isFinite(vf.y) ? vf.y : -0.2, d: Number.isFinite(vf.depth) ? vf.depth : 0.42 }
      const m = firstPersonGun(baseOf(s.equipped), wp.look)?.muzzle ?? wp.muzzle ?? [0, 0.08, -0.4], r = at.x + m[0], u = at.y + m[1], fd = at.d - m[2]
      mz = { x: eye.x + fv.x * cp * fd - fv.z * r - fv.x * sp * u, y: eye.y + sp * fd + cp * u, z: eye.z + fv.z * cp * fd + fv.x * r - fv.z * sp * u }
      const sock = s.vmId && ctx.getObjectSocket?.(s.vmId, 'muzzle') // the drawn gun's own muzzle, where the flash already sits: the streak leaves the barrel, not the eye
      if (sock?.position && Math.hypot(sock.position.x - eye.x, sock.position.y - eye.y, sock.position.z - eye.z) < 2) mz = sock.position
    }
    showBullets(ctx, res, wp, mz)
    s.kick = Hd.recoil; s.spreadNow = Math.round(res.spread * 10) / 10 // vmpose scales the kick; the HUD can show the cone
    for (const t of res.targets) {
      const m = t.m
      if (t.head) ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2.2, z: m.feetPosition.z }, text: 'HEADSHOT', color: '#ffd23a', size: 1.2 })
      else if (crit) ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2, z: m.feetPosition.z }, text: 'CRIT', color: '#ff5a3a', size: 1.2 })
      if (t.pop) popBalloons(ctx, m)
      if (!t.n) continue
      hitTarget(ctx, s, m, Math.max(1, Math.round(t.dmg)), f, !wp.quiet, 0, penOf(wp, s.equipped), t.n ?? 1)
      if (wp.balloon && !m.tags?.includes('l5-beast')) tieBalloons(ctx, m, t.n ?? 1, wp)
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
  for (const m of ctx.query({ anyTags: SWING_TAGS, radius })) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.3 && (dx * f.x + dz * f.z) / d < cone) continue
    if (wp.ranged) {
      const o = { x: p.x, y: p.y + 1.3, z: p.z }, tx = m.feetPosition.x - o.x, ty = m.feetPosition.y + 1.5 - o.y, tz = m.feetPosition.z - o.z, tl = Math.hypot(tx, ty, tz) || 1
      if (raycast(ctx, o, { x: tx / tl, y: ty / tl, z: tz / tl }, { distance: tl, physicsOnly: true, ignoreEntities: [m.id, ctx.self.id], bodies: 'static' })) continue
    }
    found.push({ m, d })
  }
  if (!wp.ranged) sound(ctx, wp.whoosh ?? 'pipe-whoosh-swing', wp.quiet ? 0.3 : power ? 0.9 : 0.55)
  if (!found.length) { // nothing alive in reach: the swing or shot lands on the world (walls, furniture, crates, what was built)
    let pc = ctx.self.camera?.rotation?.pitch ?? 0; if (Math.abs(pc) > 1.6) pc = pc * Math.PI / 180
    if (baseOf(s.equipped) === 'fishing_rod' && startFishing(ctx, s, w, p, f, pc, power)) return
    const sb = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * heavyMul * wMul(cndOf(s, s.equipped))
    strike(ctx, s, wp, s.equipped, sb, f, pc)
    return
  }
  const dv = derived(s), crit = ctx.random() < dv.crit + (wp.critBonus ?? 0)
  if (wp.sneak && !wp.ranged) {
    found.sort((x, y) => x.d - y.d); if (unaware(ctx, s, found[0].m)) { // a blade in the back: x3, and the halls don't hear it
      const m = found[0].m, dmg = Math.round((wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * wp.sneak)
      ctx.emit('damageNumber', { position: { x: m.feetPosition.x, y: m.feetPosition.y + 2.2, z: m.feetPosition.z }, text: `SNEAK CRIT x${wp.sneak}`, color: '#ff3a3a', size: 1.3 })
      ctx.emit('hitstop', { duration: 0.04 }, { audience: { player: ctx.self.id } }); s.lastSneak = { id: m.id, dmg, at: now }
      sound(ctx, 'knife-stab-flesh-quiet', 0.6, true); hitTarget(ctx, s, m, dmg, f, false, 0, penOf(wp, s.equipped)); return
    }
  }
  const base = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * heavyMul * dmgMul(s, wp) * wMul(cndOf(s, s.equipped)) * (crit ? (wp.critMul ?? D.crit) : 1) * (!wp.ranged && (s.firesaltUntil ?? 0) > ctx.now() ? L3I.firesalt.damage : 1)
  if (crit) ctx.emit('damageNumber', { position: { x: found[0].m.feetPosition.x, y: found[0].m.feetPosition.y + 2, z: found[0].m.feetPosition.z }, text: 'CRIT', color: '#ff5a3a', size: 1.2 })
  if (wp.pellets) {
    // a spread of pellets: everything in the cone is hit, hard up close and weak at range
    for (const { m, d } of found) hitTarget(ctx, s, m, Math.max(1, Math.round(base * Math.max(0.2, 1 - d / wp.range))), f, false, 0, penOf(wp, s.equipped))
    return
  }
  found.sort((x, y) => x.d - y.d)
  hitTarget(ctx, s, found[0].m, Math.round(base), f, !wp.quiet, power, penOf(wp, s.equipped))
  if (power && wp.pull) { const m = found[0].m; ctx.emit('impulse', { target: m.id, impulse: { x: -f.x * wp.pull * power, y: 40 * power, z: -f.z * wp.pull * power } }); m.state.stunUntil = Math.max(m.state.stunUntil ?? 0, ctx.now() + 900); ctx.emit('playSound', { clip: '/cdn/moodboard-gothic-horror/sfx-small-sleigh-jingle-bell-shake.mp3', position: m.feetPosition, volume: 0.6 }) } // the Crook's hook: a heavy yanks them to you
  else if (power) { const m = found[0].m, d = found[0].d || 1; ctx.emit('impulse', { target: m.id, impulse: { x: f.x * 260 * power, y: 60 * power, z: f.z * 260 * power } }) } // a heavy shoves them back
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
  if (hostileReason(ctx, m, ctx.self) || st.target === me || st.sneakTarget === me || st.hunting || st.chase || st.aggro || st.alert) return false
  if (s.crouch) return true
  const r = ctx.getObject(m.id)?.rotation, p = ctx.self.feetPosition
  const yaw = yawOf(r)
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
// Nov 12 (Shelly: "reloading is broken again"): her body's after() timers sat due and never fired, so a reload hung.
// the reload's steps now ride the body's own update clock: a list in session, stepped every tick (laterTick)
function later(ctx, sec, name, p) { const q = (ctx.self.session.later ??= []); q.push({ at: ctx.now() + sec * 1000, name, p }) }
function laterTick(ctx) {
  const q = ctx.self.session.later; if (!q?.length) return
  const now = ctx.now(), due = q.filter((e) => e.at <= now); if (!due.length) return
  ctx.self.session.later = q.filter((e) => e.at > now)
  for (const e of due) ({ reloadStep, reloadMagIn, reloadDone, pumpRack })[e.name]?.(ctx, e.p)
}
const reloadLive = (ctx, p) => { const s = ctx.self.state; return s.reloading === p.k && s.equipped === p.k && (s.reloadTok ?? 0) === p.tok }

function startReload(ctx) {
  const s = ctx.self.state, wp = weaponOf(s), k = s.equipped, w = walkOf(ctx)
  if (!wp.ranged || !wp.magSize || s.reloading || s.lootOpen) return
  if ((s['loaded_' + k] ?? 0) >= wp.magSize || (!s.god && (s[wp.ammoType ?? 'ammo'] ?? 0) <= 0)) return
  const tok = (s.reloadTok ?? 0) + 1
  s.reloadTok = tok; s.reloadAt = ctx.now() // the token lives in state, so a page reload or a machine change never strands a reload
  s.reloading = k; s.ads = false; s.reloadDur = (wp.reloadTime ?? 1.7) * derived(s).reload // the viewmodel plays its timeline over the real length
  if (perRound(wp)) { // a shell, or a cartridge into a tube, a cylinder or a break-action's barrels, one at a time
    if (wp.sfx?.open) sound(ctx, wp.sfx.open, 0.65, true)
    later(ctx, wp.reloadStart ?? 0.4, 'reloadStep', { k, tok })
  } else {
    sound(ctx, GS(wp, 'eject', 'pistol-magazine-eject-click'), 0.6, true)
    later(ctx, wp.reloadTime * derived(s).reload * 0.55, 'reloadMagIn', { k, tok })
    later(ctx, wp.reloadTime * derived(s).reload, 'reloadDone', { k, tok })
  }
}

function cancelReload(ctx) {
  const s = ctx.self.state
  s.reloadTok = (s.reloadTok ?? 0) + 1
  s.reloading = ''
}

export function reloadMagIn(ctx, p) {
  if (!reloadLive(ctx, p)) return
  sound(ctx, GS(W[p.k], 'insert', 'pistol-magazine-insert-slide'), 0.65, true)
  ctx.self.state.reloadN = (ctx.self.state.reloadN ?? 0) + 1
}

export function reloadDone(ctx, p) {
  if (!reloadLive(ctx, p)) return
  const s = ctx.self.state, wp = W[p.k], rk = wp.ammoType ?? 'ammo'
  const chambered = wp.chamber && (s['loaded_' + p.k] ?? 0) > 0 ? 1 : 0 // a round left in the chamber: the magazine and one more
  const need = wp.magSize + chambered - (s['loaded_' + p.k] ?? 0), take = s.god ? need : Math.min(need, s[rk] ?? 0) // god mode: the reserve is endless
  s['loaded_' + p.k] = (s['loaded_' + p.k] ?? 0) + take
  if (!s.god) s[rk] = (s[rk] ?? 0) - take
  s.reloading = ''
  s.reloadN = (s.reloadN ?? 0) + 1
  sound(ctx, GS(wp, 'done', 'pistol-slide-rack'), 0.7, true)
}

export function reloadStep(ctx, p) {
  if (!reloadLive(ctx, p)) return
  const s = ctx.self.state, wp = W[p.k], rk = wp.ammoType ?? 'ammo'
  if ((s['loaded_' + p.k] ?? 0) < wp.magSize && (s.god || (s[rk] ?? 0) > 0)) {
    s['loaded_' + p.k] = (s['loaded_' + p.k] ?? 0) + 1
    if (!s.god) s[rk] -= 1
    s.reloadN = (s.reloadN ?? 0) + 1
    sound(ctx, GS(wp, 'shell', 'shotgun-shell-insert-click'), 0.7, true)
  }
  if ((s['loaded_' + p.k] ?? 0) < wp.magSize && (s.god || (s[rk] ?? 0) > 0)) later(ctx, wp.reloadShell ?? 0.55, 'reloadStep', p)
  else if (wp.wheel || wp.breech) { s.reloading = ''; sound(ctx, GS(wp, 'done', 'shotgun-break-action-close-snap'), 0.75, true) } // the cylinder snaps shut, the barrels close: nothing to rack
  else { s.reloading = ''; later(ctx, 0.25, 'pumpRack', {}) }
}

export function pumpRack(ctx) {
  const s = ctx.self.state, wp = weaponOf(s)
  if (!(wp.pellets || wp.tube) || wp.breech || s.sheathed) return // swapped to something else before the stroke: nothing to rack
  sound(ctx, wp.rack ?? 'shotgun-pump-rack', 0.8) // a lever or a bolt has its own clack (weapons.yml rack)
  s.pumpAt = ctx.now()
}

export function pullToken(ctx, t) { // one carried thing out of the bag as its pickup token (drop, fridge), null if you have none
  const s = ctx.self.state; let tok = null
    if (t.startsWith('cloth:')) { const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : [], i = bag.indexOf(t); if (i >= 0) { bag.splice(i, 1); s.clothes = bag.join(','); tok = t } }
    else if (t.startsWith('furn:')) { const k = t.slice(5); if ((s.furn?.[k] ?? 0) > 0) { s.furn = { ...s.furn, [k]: s.furn[k] - 1 }; tok = t } }
    else if (t.startsWith('almond:')) { const k = AW_KEY[t.slice(7)]; if (k && s[k] > 0) { s[k] -= 1; tok = t } }
    else if (t.startsWith('meat:')) { const c = t.slice(5); if ((s.meat?.[c] ?? 0) > 0) { s.meat = { ...s.meat, [c]: s.meat[c] - 1 }; tok = t } }
    else if (t.startsWith('snack:')) { const c = t.slice(6); if ((s.snacks?.[c] ?? 0) > 0) { s.snacks = { ...s.snacks, [c]: s.snacks[c] - 1 }; tok = c } }
    else if (t === 'frag' || t === 'molotov' || t === 'bauble') { const k = THROW[t].key; if ((s[k] ?? 0) > 0) { s[k] -= 1; tok = t } }
    else if (t === 'ammo' || t === 'shells' || t === 'cells' || t === 'rockets' || t === 'latex') { const per = W[t]?.perPickup ?? 1; if ((s[t] ?? 0) >= per) { s[t] -= per; tok = t } else s.notice = { text: `Need a full box (${per})`, at: ctx.now() } }
    else if (t === 'bobbypin') { if (s.bobbypins > 0) { s.bobbypins -= 1; tok = 'bobbypin' } }
  return tok
}

// the inventory's buttons (scripts/loot-ui.js): equip a weapon, drink almond water, drop a weapon at your feet, close
function quickUse(ctx, slot) {
  const s=ctx.self.state, w=walkOf(ctx)
  if (!Number.isInteger(slot) || slot<0 || slot>9 || screen(s,ctx.self.place)!=='play' || s.building || s.dead || s.downAt && ctx.now()-s.downAt<3200 || ctx.now()<(w.quickAt??0)) return
  const item=quickItems(s).find(x=>x.id===s.quickSlots?.[slot])
  if (!item) return
  w.quickAt=ctx.now()+300
  if (item.count<=0) { s.notice={text:item.name+' is unavailable',at:ctx.now()}; return }
  invAction(ctx,item.action)
  if(item.action.k==='equip' && s.equipped===item.action.w && s.sheathed) { s.sheathed=false; s.equipAt=ctx.now(); w0vm(ctx) }
}
function invAction(ctx, d) {
  const s = ctx.self.state
  if (d.k === 'quickAssign') { if (s.invOpen) assignQuick(s, d.slot, String(d.id??'')); return }
  if (d.k === 'quickSlot') { // one press: the picked item goes in (pressed again: comes out); nothing picked: the slot's item gets picked
    if (!s.invOpen) return
    const qi = quickItems(s), sel = s.invSel || s.equipped || 'fists', it = qi.find((x) => (x.id === sel || x.id === 'weapon:' + sel) && x.count > 0), cur = s.quickSlots?.[d.slot]
    if (it) { assignQuick(s, d.slot, cur === it.id ? '' : it.id); s.notice = { text: cur === it.id ? `Slot ${d.slot} cleared` : `${it.name} → slot ${d.slot}`, at: ctx.now() }; return }
    if (cur) s.invSel = cur.startsWith('weapon:') ? cur.slice(7) : cur
    return
  }
  if (d.k === 'close') { s.invOpen = false; s.invFilter = ''; return } // a stray letter in the search box hid a looted coach gun (Shelly, Nov 14)
  if (d.k === 'dropItem') { // anything that isn't a weapon: taken out of the bag as its pickup token, into a canvas bag at your feet (looted back with E)
    const tok = pullToken(ctx, String(d.t || ''))
    if (!tok) return
    const f = ctx.self.feetPosition, fw = walkOf(ctx).fwd ?? { x: 0, z: -1 }, at = { x: f.x + fw.x * 0.8, z: f.z + fw.z * 0.8 }
    const near = ctx.query({ tags: ['remains'], center: { x: at.x, y: f.y, z: at.z }, radius: 1.2 }).find((r) => r.state?.name === 'Dropped bag')
    if (near) { const o = ctx.getObject(near.id); if (o) o.state.items = [o.state.items, tok].filter(Boolean).join(',') } // one bag piles up what you drop in one spot
    else spawnRemains(ctx, at, [tok], 'Dropped bag')
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true); return
  }
  if (d.k === 'nadePick') { s.nadePick = d.t === 'molotov' ? 'molotov' : d.t === 'bauble' ? 'bauble' : d.t === 'fresh' ? 'fresh' : 'frag'; s.notice = { text: `G throws: ${THROW[s.nadePick].name}`, at: ctx.now() }; return }
  if (d.k === 'sel') { s.invSel = String(d.t || '').slice(0, 80); return }
  if (d.k === 'tab') { s.invTab = ['all', 'weapons', 'repair', 'aid', 'apparel', 'ammo', 'misc', 'tapes', 'key', 'throw'].includes(d.t) ? d.t : 'all'; return }
  if (d.k === 'sort') { s.invSort = ['name', 'dam', 'wg', 'cnd', 'val'].includes(d.s) ? d.s : 'name'; return }
  if (d.k === 'filter') { s.invFilter = String(d.q ?? '').slice(0, 40); return }
  if (d.k === 'sheet') { s.invOpen = false; s.sheetOpen = true; return }
  if (d.k === 'quests') { s.invOpen = false; s.jrnOpen = true; return } // HALOGEN's QUESTS tab: the journal (scripts/quest-marker.js)
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
  if (d.k === 'sqFill' || d.k === 'sqDrink' || d.k === 'sqEmpty') { sqTank(ctx, d); return }
  if (d.k === 'repellent') { s.invOpen = false; useRepellent(ctx); return }
  if (d.k === 'fsThrow') { s.invOpen = false; fsThrow(ctx); return }
  if (d.k === 'fsMelt') { fsMelt(ctx); return }
  if (d.k === 'fsIngot') { s.invOpen = false; fsIngot(ctx); return }
  if (d.k === 'fsBoil') { fsBoil(ctx); return }
  if (d.k === 'firesalt') { // rub a pinch on the blade or head: melee hits burn harder for a while
    if ((s.firesalt ?? 0) <= 0 || W[s.equipped]?.ranged || s.equipped === 'fists') { s.notice = { text: 'Hold a melee weapon to rub firesalt on it', at: ctx.now() }; return }
    s.firesalt -= 1; s.firesaltUntil = ctx.now() + L3I.firesalt.seconds * 1000
    s.notice = { text: `Firesalt on your ${W[s.equipped]?.name?.toLowerCase() ?? 'weapon'}: x${L3I.firesalt.damage} melee for ${L3I.firesalt.seconds}s`, at: ctx.now() }
    sound(ctx, 'gun-raise-cloth-rustle', 0.5, true); return
  }
  if (d.k === 'holo') { // HALOGEN plays a carried tape into this player's ears alone
    const id = String(d.id ?? ''), T = HOLO[id]; if (!T || !String(s.holotapes ?? '').split(',').includes(id)) return
    if (ctx.self.session.holoSnd != null) ctx.emit('stopSound', { soundId: ctx.self.session.holoSnd })
    if (s.holoPlay?.id === id && ctx.now() - s.holoPlay.at < T.len * 1000) { ctx.self.session.holoSnd = null; s.holoPlay = null; return } // a second press stops it
    ctx.self.session.holoSnd = ctx.emit('playSound', { clip: T.clip ?? vo(T.who, T.line), volume: 0.9, bus: 'Voice' }) // dina4: her own voiced line
    if (id === 'dina4') { learn(ctx, s, 'name', true); learn(ctx, s, 'tape') }
    s.holoPlay = { id, at: ctx.now() }; if (ctx.self.session.holoEnd) ctx.cancel(ctx.self.session.holoEnd); ctx.self.session.holoEnd = ctx.after(T.len, 'holoEnd', { at: s.holoPlay.at }); return
  }
  if (d.k === 'read') { if (s.ledgerOpen) s.ledgerOpen = 0; s.reading = parseInt(d.n) || null; s.invOpen = false; return }
  if (d.k === 'repair') { repairAction(ctx, d); return }
  if (d.k === 'compass') { s.invOpen = false; useCompass(ctx); return }
  if (d.k === 'fresh') { s.invOpen = false; if (s.fresh > 0) kneel(ctx); placeFreshener(ctx); return }
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
    spawnWeapon(ctx, { x: f.x + fw.x * 0.9, z: f.z + fw.z * 0.9 }, k, { dropped: true })
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
  s[AW_KEY[c]] -= 1; s.almondAt = now // a Duller keeps clear of you a while (scripts/duller.js)
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

// Object 3 "Smiler Repellent" (Wikidot): a drop clears smilers within ~20 m; on contact a smiler vanishes and never returns.
const REPEL_R = 20 // the lore's 20 metres
const REPEL_MIST = `fx
pop mist burst=?mobile:40|90 life=1.6..2.8 v=<%dx|0,0,%dz|0>*(3..6)+sdir()*(.6..1.4)+up(.3) size=.25..0.5 acc=drag(1.8)+buoy(.15)+curl(.3) sz=$size*(.4>3.2) col=<.86,.92,.84> a=0>.08:.5>.6:.25>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop drops burst=?mobile:30|70 life=.5..1.1 v=<%dx|0,0,%dz|0>*(4..8)+sdir()*(.5..1.2)+up(.6) size=.015..0.03 acc=grav()+drag(.6) col=<.85,.95,1> a=1>0 floor=die r=sprite(droplet,alpha,velocity,.02)
pop ring burst=?mobile:24|48 on=disc(1) life=1.4..2.2 v=sdir()*<1,0,1>*(6..10)+up(.2) size=.4..0.8 acc=drag(1.6) sz=$size*(.6>2.6) col=<.8,.9,.78> a=0>.3:.2>.6:.12>0 r=sprite(smoke-puff,alpha)`
const SMILER_GONE = `fx
pop smoke burst=?mobile:16|36 on=sphere(.4).c(1.2) life=1..1.8 v=up(.6..1.4)+sdir()*(.4..1) size=.3..0.6 acc=buoy(.6)+drag(1.4)+curl(.4) sz=$size*(.5>2.6) col=<.05,.05,.06> a=0>.1:.8>.6:.4>0 r=sprite(smoke-puff,alpha)
pop teeth burst=?mobile:10|22 on=sphere(.3).c(1.4) life=.4..0.9 v=sdir()*(1..3) size=.03..0.06 acc=drag(1.5) col=hdr(2.4,2.4,2.2)>hdr(.4,.4,.4) a=1>0 r=sprite(ember,add,velocity,.03)`
function useRepellent(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if ((s.repellent ?? 0) <= 0) { s.notice = { text: 'No Smiler Repellent left', at: now }; return }
  s.repellent -= 1
  const p = ctx.self.feetPosition, f = walkOf(ctx).fwd ?? { x: 0, z: -1 }
  ctx.emit('fx', { position: { x: p.x + f.x * 0.4, y: p.y + 1.35, z: p.z + f.z * 0.4 }, script: REPEL_MIST, params: { dx: f.x, dz: f.z } })
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-glass-atomizer-bottle-fine-mist-spray-two-pumps-hiss.mp3', position: p, volume: 0.8, maxDistance: 14 })
  let gone = 0
  for (const m of ctx.query({ tags: ['smiler'], radius: REPEL_R })) {
    const at = { x: m.feetPosition.x, y: m.feetPosition.y, z: m.feetPosition.z }
    ctx.emit('fx', { position: at, script: SMILER_GONE })
    heard(ctx, { clip: '/cdn/moodboard-gothic-horror/sfx-smiler-grin-collapses-into-shrieking-static-and-fades-to-nothing.mp3', position: at, volume: 0.9, maxDistance: 30 })
    ctx.destroy(m.id); gone++
  }
  s.repelUntil = now + 60000 // smilers keep clear of the scent for a minute (the lore: weaker for extended periods)
  s.notice = { text: gone ? `The mist hits and ${gone === 1 ? 'the grin' : gone + ' grins'} come apart into nothing` : 'A fine mist hangs in the air. Nothing grins back.', at: now }
}

// Firesalt (Wikidot): orange shards shatter on impact into burning sparks; 50 g+ ingots melted from shards blow like half a dynamite stick.
const FS = { throwDmg: 22, burnR: 2.4, meltCost: 5, ingotDmg: 140, ingotR: 7 } // Savi's picks: a shard stings like a hatchet, an ingot clears a hallway
const FS_SPARK = `fx
pop flash burst=1 life=.18 size=1.2 sz=$size*(1>.2) col=hdr(5,3,1.2) a=1>0 r=sprite(soft-disc,add)
pop sparks burst=?mobile:60|140 life=.5..1.4 v=sdir()*(5..12)+up(2..4) size=.015..0.04 acc=grav()*.7+drag(.8) col=hdr(6,3.2,.9)>hdr(2,.6,.1) a=(1>.6:1>0)*flick(9,.3) floor=bounce(.4) r=sprite(ember,add,velocity,.04)
pop shards burst=?mobile:8|16 life=.8..1.4 v=sdir()*(2..5)+up(2..3) size=.02..0.05 spin=-12..12 acc=grav()+drag(.3) col=<1,.5,.15>..<.9,.35,.08> a=.85 rot=$age*$spin floor=stick r=sprite(shard,alpha)
pop smoke burst=?mobile:6|12 life=1.5..2.5 v=up(.6..1.2) size=.3..0.5 acc=buoy(.5)+drag(1)+curl(.3) sz=$size*(.5>2.5) col=<.3,.27,.25> a=0>.1:.5>.6:.2>0 r=sprite(smoke-puff,alpha)
pop incense on=@sparks?.06 life=1.2..2 size=.1..0.2 acc=buoy(.4)+drag(1) sz=$size*(.6>2) col=<.55,.5,.6> a=0>.25:.2>0 r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.9 r=light(<1,.55,.2>,40*(1>.1:.5>0),9)`
function fsLand(ctx, f) {
  const p = ctx.self.feetPosition, o = { x: p.x, y: p.y + 1.4, z: p.z }
  const r = raycast(ctx, o, { x: f.x * 0.97, y: -0.22, z: f.z * 0.97 }, { distance: 16, ignoreEntities: [ctx.self.id] })
  return r ? { x: r.position.x, y: r.position.y, z: r.position.z, id: r.id } : { x: p.x + f.x * 12, y: p.y, z: p.z + f.z * 12 }
}
const FS_FOES = ['smiler', 'lurker', 'hound', 'stealer', 'moths', 'l8spider', 'l8-hostile', 'npc', 'clump', 'foe', 'hostile']
function fsBurst(ctx, s, at, R, dmg, f) {
  let n = 0
  for (const m of ctx.query({ anyTags: FS_FOES, radius: R, center: at })) {
    if (m.id === ctx.self.id || m.state?.dead || (m.state?.hp ?? 1) <= 0) continue
    const d = Math.hypot(m.feetPosition.x - at.x, m.feetPosition.z - at.z), k = 1 - 0.6 * d / R
    hitTarget(ctx, s, m, Math.round(dmg * k), f, true); m.state.stunUntil = ctx.now() + 900; n++
  }
  return n
}
function fsThrow(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if ((s.firesalt ?? 0) <= 0) { s.notice = { text: 'No firesalt', at: now }; return }
  if (now < (walkOf(ctx).nextSwing ?? 0)) return
  walkOf(ctx).nextSwing = now + 700; s.firesalt -= 1
  const f = walkOf(ctx).fwd ?? { x: 0, z: -1 }, at = fsLand(ctx, f)
  sound(ctx, 'pipe-whoosh-swing', 0.5)
  ctx.emit('fx', { position: { x: at.x, y: at.y + 0.1, z: at.z }, script: FS_SPARK })
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-brittle-crystal-shatters-with-crackling-firework-spark-burst-and-sizzle.mp3', position: at, volume: 1, maxDistance: 34 })
  const n = fsBurst(ctx, s, at, FS.burnR, FS.throwDmg, f)
  s.notice = { text: n ? `The shard bursts in a spray of burning sparks · ${n} hit` : 'The shard bursts in a spray of burning sparks', at: now }
}
function fsMelt(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if ((s.firesalt ?? 0) < FS.meltCost) { s.notice = { text: `Melting an ingot takes ${FS.meltCost} shards (you have ${s.firesalt ?? 0})`, at: now }; return }
  s.firesalt -= FS.meltCost; s.fsIngot = (s.fsIngot ?? 0) + 1
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-crystals-melting-in-tin-cup-hiss-and-bubbling-then-cooling-crackle.mp3', position: ctx.self.feetPosition, volume: 0.6, maxDistance: 8 })
  s.notice = { text: `${FS.meltCost} shards melt into clear pyroil, smelling of incense. It cools into a dark red ingot`, at: now }
}
function fsIngot(ctx) {
  const s = ctx.self.state, now = ctx.now()
  if ((s.fsIngot ?? 0) <= 0) { s.notice = { text: 'No firesalt ingot', at: now }; return }
  if (now < (walkOf(ctx).nextSwing ?? 0)) return
  walkOf(ctx).nextSwing = now + 1200; s.fsIngot -= 1
  const f = walkOf(ctx).fwd ?? { x: 0, z: -1 }, at = fsLand(ctx, f), c = { x: at.x, y: at.y + 0.3, z: at.z }
  sound(ctx, 'pipe-whoosh-swing', 0.6)
  ctx.emit('fx', { position: c, script: BLAST, params: { s: 1.3 } })
  ctx.emit('fx', { position: c, script: FS_SPARK })
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-dynamite-explosion-huge-boom-with-crystal-shatter-and-falling-debris.mp3', position: c, volume: 1, maxDistance: 120 })
  feelBlast(ctx, c, 1.3)
  const me = ctx.self.feetPosition, dd = Math.hypot(me.x - c.x, me.z - c.z)
  if (dd < FS.ingotR) { s.hp = Math.max(1, (s.hp ?? 100) - Math.round(60 * (1 - dd / FS.ingotR))); s.notice = { text: 'Too close. The blast throws heat across you', at: now } }
  const n = fsBurst(ctx, s, c, FS.ingotR, FS.ingotDmg, f)
  if (dd >= FS.ingotR) s.notice = { text: n ? `The ingot goes off like dynamite · ${n} caught` : 'The ingot goes off like dynamite', at: now }
}
function fsBoil(ctx) { // a shard dissolved in almond water heats it: boiled clean of the Disease, it restores more
  const s = ctx.self.state, now = ctx.now()
  if ((s.firesalt ?? 0) <= 0 || (s.almonds ?? 0) <= 0) { s.notice = { text: 'Boiling needs a firesalt shard and a grey almond water', at: now }; return }
  s.firesalt -= 1; s.almonds -= 1; s.almondsB = (s.almondsB ?? 0) + 1
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-crystal-dissolving-fizz-in-bottle-water-heating-to-rolling-boil.mp3', position: ctx.self.feetPosition, volume: 0.6, maxDistance: 8 })
  s.notice = { text: 'The shard fizzes away and the bottle boils. Clean, warm almond water', at: now }
}

// The Squirt Gun (Wikidot object): one liquid in the backpack tank at a time, each with its own effect. Savi's numbers.
const SQ = {
  water:     { name: 'water',            col: '<.72,.86,1>',   dmg: 0, per: 25, cap: 25 },
  almond:    { name: 'almond water',     col: '<.96,.93,.84>', dmg: 4, per: 15 },
  pyroil:    { name: 'pyroil',           col: '<1,.62,.3>',    dmg: 5, per: 6, burn: 4 },
  repellent: { name: 'Smiler Repellent', col: '<.86,.96,.86>', dmg: 0, per: 10 },
}
const SQ_ENT = ['smiler', 'lurker', 'hound', 'stealer', 'moths', 'l8spider', 'l8-hostile', 'clump', 'foe', 'hostile', 'beast', 'deathmoth']
const SQ_JET = `fx
pop jet burst=?mobile:10|20 life=.3..0.6 v=<%dx|0,%dy|0,%dz|-1>*(13..17)+sdir()*.35 size=.025..0.05 acc=grav()+drag(.4) col=%col|<.72,.86,1> a=.9>.6:.8>0 floor=die r=sprite(droplet,alpha,velocity,.03)
pop mist burst=?mobile:2|5 life=.4..0.8 v=<%dx|0,%dy|0,%dz|-1>*(4..7)+sdir()*.4 size=.08..0.16 acc=drag(2) sz=$size*(.6>2) col=%col|<.72,.86,1> a=0>.1:.3>0 r=sprite(smoke-puff,alpha)`
const SQ_SPLASH = `fx
pop drops burst=?mobile:8|16 life=.3..0.7 v=<%nx|0,%ny|1,%nz|0>*(1.5..3)+sdir()*(.6..1.4)+up(.8) size=.02..0.04 acc=grav()+drag(.4) col=%col|<.72,.86,1> a=1>0 floor=die r=sprite(droplet,alpha,velocity,.02)
pop wet burst=1 life=1.2 size=.35..0.5 sz=$size*(.6>1) col=%col|<.72,.86,1> a=.35>0 r=sprite(soft-disc,alpha)`
const SQ_FIRE = `fx
pop flame burst=?mobile:10|22 on=sphere(.25) life=.4..0.9 v=up(1.2..2.4)+sdir()*.4 size=.18..0.36 acc=buoy(1.6)+curl(.5)+drag(1.2) sz=$size*(.5>1:1>.2) col=hdr(4.4,2.6,.9)>.4:hdr(2.6,.9,.2)>hdr(.6,.15,.03) a=0>.1:1>.7:.8>0 rot=spin(.3) r=sprite(flame-wisp,add)
pop smoke on=@flame?.25 life=1..1.8 size=.2..0.35 acc=buoy(.8)+drag(1) sz=$size*(.7>2.4) col=<.25,.23,.22> a=0>.2:.3>0 r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.6 r=light(<1,.55,.2>,18*(1>0),6)`
function squirtFire(ctx, s, wp) {
  const now = ctx.now(), L = SQ[s.sqLiq] ?? SQ.water, f = walkOf(ctx).fwd ?? { x: 0, z: -1 }
  const { eye, fwd: fv, pitch: pv } = weaponAim(ctx), cp = Math.cos(pv), sp = Math.sin(pv), dir = { x: fv.x * cp, y: sp, z: fv.z * cp }
  const r = raycast(ctx, eye, dir, { distance: wp.range, ignoreEntities: [ctx.self.id] }), m = r?.id ? ctx.getObject(r.id) : null
  const human = m && (m.tags?.includes('npc') || m.tags?.includes('human') || ctx.place.players.some((p) => p.id === m.id))
  if (s.sqLiq === 'almond' && human) { s['loaded_' + s.equipped] += 1; s.notice = { text: "The trigger won't pull. Almond water won't fire at a person", at: now }; return } // the lore: it will not even fire
  const from = { x: eye.x + dir.x * 0.7 - dir.z * 0.12, y: eye.y + dir.y * 0.7 - 0.16, z: eye.z + dir.z * 0.7 + dir.x * 0.12 }
  ctx.emit('fx', { position: from, script: SQ_JET, params: { dx: dir.x, dy: dir.y + 0.04, dz: dir.z, col: L.col } })
  s.kick = 0.2
  if (!r) return
  const at = r.position, nrm = r.normal ?? { x: 0, y: 1, z: 0 }
  if (s.sqLiq === 'pyroil') ctx.emit('fx', { position: at, script: SQ_FIRE }) // pyroil ignites on contact
  else ctx.emit('fx', { position: at, script: SQ_SPLASH, params: { nx: nrm.x, ny: nrm.y, nz: nrm.z, col: L.col } })
  if (!m || m.state?.dead || (m.state?.hp ?? 1) <= 0) return
  const ent = SQ_ENT.some((t) => m.tags?.includes(t))
  if (s.sqLiq === 'repellent') {
    if (!m.tags?.includes('smiler')) return
    ctx.emit('fx', { position: m.feetPosition, script: SMILER_GONE })
    heard(ctx, { clip: '/cdn/moodboard-gothic-horror/sfx-smiler-grin-collapses-into-shrieking-static-and-fades-to-nothing.mp3', position: m.feetPosition, volume: 0.9, maxDistance: 30 })
    ctx.destroy(m.id); s.notice = { text: 'The spray hits the grin and it comes apart into nothing', at: now }; return
  }
  if (s.sqLiq === 'almond' && ent) { hitTarget(ctx, s, m, L.dmg, f, false); if (ctx.random() < 0.25) heard(ctx, { clip: '/cdn/moodboard-gothic-horror/sfx-flesh-sizzle-steam-hiss.mp3', position: at, volume: 0.5, maxDistance: 14 }) }
  if (s.sqLiq === 'pyroil') {
    hitTarget(ctx, s, m, L.dmg, f, false)
    if (now > (m.state?.sqBurnUntil ?? 0)) { m.state.sqBurnUntil = now + 3000; ctx.after(1, 'sqBurn', { id: m.id, n: 3 }) }
  }
}
export function sqBurn(ctx, p) { // pyroil keeps burning on what it hit, once a second
  const m = ctx.getObject(p.id); if (!m || m.state?.dead || (m.state?.hp ?? 1) <= 0) return
  hitTarget(ctx, ctx.self.state, m, SQ.pyroil.burn, walkOf(ctx).fwd ?? { x: 0, z: -1 }, false)
  ctx.emit('fx', { position: m.feetPosition, script: SQ_FIRE })
  if (p.n > 1) ctx.after(1, 'sqBurn', { id: p.id, n: p.n - 1 })
}
function sqTank(ctx, d) { // fill, drink from or empty the backpack tank
  const s = ctx.self.state, now = ctx.now(), say = (text) => { s.notice = { text, at: now } }
  const have = (s.sqfill ?? 0) + (s.loaded_squirt_gun ?? 0)
  if (d.k === 'sqEmpty') { s.sqfill = 0; s.loaded_squirt_gun = 0; s.sqLiq = 'water'; heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-plastic-tank-glugging-empty-onto-floor-splash.mp3', position: ctx.self.feetPosition, volume: 0.5, maxDistance: 8 }); return say('You drain the tank onto the floor') }
  if (d.k === 'sqDrink') {
    if (s.sqLiq !== 'almond' || have <= 0) return say('No almond water in the tank')
    if ((s.sqfill ?? 0) > 0) s.sqfill -= 1; else s.loaded_squirt_gun -= 1
    s.thirst = Math.min(100, (s.thirst ?? 100) + 12); s.hp = Math.min(maxHp(s.level, s), (s.hp ?? 0) + 4); s.sanity = Math.min(maxSan(s.level, s), (s.sanity ?? 0) + 3)
    sound(ctx, 'gulping-water-from-plastic-bottle', 0.5, true); return say('A squirt of almond water, straight into your mouth')
  }
  const c = String(d.c || ''), L = SQ[c]; if (!L?.per) return
  if (have > 0 && s.sqLiq !== c && s.sqLiq !== 'water') return say(`The tank holds ${SQ[s.sqLiq].name}. They won't mix, they'd settle in layers: empty it first`)
  if (s.sqLiq !== c && c !== 'water') { s.sqfill = 0; s.loaded_squirt_gun = 0 } // tap water just gets tipped out
  if (c === 'almond') { if ((s.almonds ?? 0) <= 0) return say('No grey almond water to pour in'); s.almonds -= 1 }
  if (c === 'pyroil') { if ((s.firesalt ?? 0) <= 0) return say('Pyroil needs a firesalt shard to melt down'); s.firesalt -= 1 }
  if (c === 'repellent') { if ((s.repellent ?? 0) <= 0) return say('No Smiler Repellent'); s.repellent -= 1 }
  if (c === 'water' && have >= L.cap) return say('The tank is already full of water')
  s.sqLiq = c; s.sqfill = c === 'water' ? L.cap - (s.loaded_squirt_gun ?? 0) : (s.sqfill ?? 0) + L.per
  heard(ctx, { clip: '/cdn/moodboard-realistic-gritty/sfx-pouring-liquid-into-plastic-tank-funnel-glug.mp3', position: ctx.self.feetPosition, volume: 0.5, maxDistance: 8 })
  say(`${L.per} shots of ${L.name} into the tank`)
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
  else if ((w.battery ?? s.battery) > 1 || swapBattery(ctx)) {
    w.light = ctx.spawn({
      feetPosition: { attach: 'camera', x: 0, y: 0.08, depth: 0 }, // at the brow, so the held arm and gun sit outside the cone (it sat on the hand and blew them white)
      light: { kind: 'spot', color: 'oklch(0.97 0.03 90)', intensity: ctx.self.place === 'level8' ? 1.4 : ctx.self.place === 'level34' ? 3.5 : 10, distance: ctx.self.place === 'level8' ? 16 : 28, angle: 26, penumbra: 0.55, aim: 'forward', shadow: { enabled: true } },
      audience: 'local', scope: 'session',
    })
  }
  s.light = !!w.light
  sound(ctx, 'flashlight-switch-click', 0.65, true)
}


// First person: the local player's own arm and held weapon, riding the camera. Only this machine sees it.
const Q_MELEE = { x: -0.5, y: 0.5, z: 0.5, w: 0.5 } // its length up, its blade forward
// the viewmodel sits a hand from the eye under the troffers: its skin is drawn a shade deeper so it reads as skin, not a white glare
function vmSkin(hex) { const n = parseInt(String(hex ?? '#efcfb4').slice(1), 16), k = 0.72; return '#' + [16, 8, 0].map((b) => Math.round(((n >> b) & 255) * k).toString(16).padStart(2, '0')).join('') }
const point = ([x, y, z]) => ({ x, y, z })
const Q_GUN = { x: 0, y: 1, z: 0, w: 0 } // yaw 180: lays the mesh's +Z barrel forward (-Z) in camera space
// degrees to a quaternion: yaw about Y, then pitch about X, then roll about Z (the viewmodel's children take quaternions; an euler rotation on a mesh child was ignored)
const eulerQ = (yaw, pitch, roll) => { const h = Math.PI / 360, [cy, sy, cp, sp, cr, sr] = [Math.cos(yaw * h), Math.sin(yaw * h), Math.cos(pitch * h), Math.sin(pitch * h), Math.cos(roll * h), Math.sin(roll * h)]; return { x: cy * sp * cr + sy * cp * sr, y: sy * cp * cr - cy * sp * sr, z: cy * cp * sr - sy * sp * cr, w: cy * cp * cr + sy * sp * sr } }
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
  if (s.sheathed || s.climbing || s.mj?.seats || s.tp || s.menuOpen || s.arrive || s.arrivePending || ctx.self.place === 'intake') { if (w.plyObj) { ctx.destroy(w.plyObj); w.plyObj = null } if (w.vm) { ctx.destroy(w.vm); w.vm = null; w.vmKind = null; w.vmEq = null; w.plyRig = null } if (s.vmId) s.vmId = null; return } // holstered: the hands are down, out of view
  // the look and tune only change by a press: the full key is rebuilt when the weapon changes or on the 4 Hz stats beat
  if (w.vm && w.vmEq === kind && !w.vmCheck) { if (w.plyWant && !w.plyRig && ctx.now() >= (w.plyNext ?? 0)) { w.plyNext = ctx.now() + 500; plyArm(ctx, w) } return }
  w.vmEq = kind; w.vmCheck = false
  const tune = firstPersonTuning(s)
  const hb = !l.modelUrl && HUMAN ? humanBody(l) : null // human bodies: Shelly's own model's arm holds the weapon (her rule: first-person arms come from her model or a PLYMODEL)
  const cs = !hb && !l.modelUrl && !HUMAN && isNewCat(l) ? critterSpec(l) : null // cats (Shelly Nov 12: 'you didnt have to make an entirely new model'): the first-person arm IS her own cat body, its sleeve on it
  const ply = l.modelUrl || (hb ? hb.id + '#' + (hb.materials.Body_Skin.color ?? '') : '') || (cs ? 'cat2:' + JSON.stringify([l.sex, l.fur, l.topw, l.top, l.skin, l.pattern, l.heightS, l.buildS]) : '')
  // cats (Shelly Nov 12 "make the first person arms match the cat charcters"): her fur colour, a round paw with pink beans, her sleeve
  const arm = hb || ply ? { hidden: true } : { species: l.species ?? 'cat', fur: l.fur, topw: l.topw, top: l.top }, armKey = kind + JSON.stringify(arm) + ply + 'v38' + JSON.stringify(tune ?? null)
  if (w.vmKind !== armKey || !w.vm) {
    if (w.vm) ctx.destroy(w.vm)
    if (w.plyObj) { ctx.destroy(w.plyObj); w.plyObj = null }
    w.plyRig = null; w.plySplit = !!cs
    const bk = baseOf(kind), g = HOLD[bk] ?? 0, wp = W[kind] ?? {}, gun = !!wp.ranged
    const fp = gun ? firstPersonGun(bk, wp.look) : null
    const support = fp?.shoulder && !tune?.lat ? null : tune?.lat ?? (fp?.left ? point(fp.left) : wp.two ? { x: wp.two[3] ?? -0.01, y: wp.two[0], z: wp.two[1] } : null)
    const child = kind === 'fists' ? [] : [gun
      ? { id: 'gun', feetPosition: tune?.at ?? point(fp?.at ?? [0, -.04, .14]), rotation: tune?.rot ?? tune?.q ?? (tune?.pitch != null || tune?.yaw != null ? eulerQ(tune?.yaw ?? 0, tune?.pitch ?? 0, tune?.roll ?? 0) : fp ? eulerQ(...fp.turn) : Q_GUN), castShadow: false, ...weaponBody(kind), audience: 'local' }
      : MESHGRIP[bk]
        ? { feetPosition: tune?.mat ?? { x: MESHGRIP[bk].at[0], y: MESHGRIP[bk].at[1], z: MESHGRIP[bk].at[2] }, rotation: tune?.mrot ?? { x: MESHGRIP[bk].q[0], y: MESHGRIP[bk].q[1], z: MESHGRIP[bk].q[2], w: MESHGRIP[bk].q[3] }, castShadow: false, ...weaponBody(kind), audience: 'local' }
        : { feetPosition: tune?.mat ?? { x: 0, y: -g, z: 0 }, rotation: tune?.mrot ?? Q_MELEE, castShadow: false, ...weaponBody(kind), audience: 'local' }]
    // a two-handed weapon: the off hand rides the viewmodel too, on the fore-end (guns, ahead of the trigger hand) or up the haft (melee), at weapons.yml two: [up, forward-is-negative, radius]
    const fpa = hb ? FP_ARM[l.sex === 'f' ? 'f' : 'm'] : null, skinM = hb ? { Body_Skin: { ...hb.materials.Body_Skin, color: vmSkin(hb.materials.Body_Skin.color), roughness: 0.78, metalness: 0, emissive: '#000000' } } : null
    if (support && fpa) { const bc = FP_BC[l.sex === 'f' ? 'f' : 'm'], arm = { id: 'fparm-l', model: { id: fpa.L, materials: skinM }, castShadow: false, visibleInFirstPerson: true, audience: 'local' }
      if (gun) child.push({ id: 'fphold-l', feetPosition: support, rotation: tune?.lq ?? (fp?.vertical ? FP_VERTICAL_Q : FP_TWO_Q), audience: 'local', children: [{ ...arm, feetPosition: { x: -bc.x, y: bc.y, z: bc.z } }] })
      else child.push({ ...arm, feetPosition: { x: support.x - bc.x, y: support.y + bc.y, z: support.z + bc.z } })
    } else if (support && !ply) child.push({ feetPosition: support, castShadow: false, audience: 'local', primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js', params: { ...arm, support: { axis: gun && !fp?.vertical ? 'z' : 'y', r: wp.two?.[2] ?? .023 } } } })
    const supportWrist = support && (fp ? { ...support, x: tune?.lat || fp.vertical ? support.x : -.045 } : { x: -.06, y: support.y - .08, z: support.z + .1 })
    w.plyGrip = fp ? { x: .01, y: .055, z: .085 } : { x: .03, y: -.02, z: .05 }
    w.plySupport = supportWrist
    w.catGun = !!cs && gun
    w.catForeEnd = w.catGun && !!fp && !fp.vertical && !!supportWrist
    if (w.catGun) {
      // Put the wrist behind the grip so the front of the paw wraps over it.
      w.plyGrip = support ? { x: -.03, y: .03, z: .09 } : { x: -.073, y: .075, z: .046 }
      if (w.catForeEnd && !tune?.lat) {
        w.plySupport = { x: supportWrist.x + .059, y: supportWrist.y - .062, z: supportWrist.z - .02 }
      }
    }
    // the worn model rides the viewmodel: shoulder just behind and below the eye, its right hand reaching the grip
    // human: the body turned to face the look, its right shoulder just right of and below the eye (female shoulder 1.19 m, male scaled by height)
    if (fpa) child.push({ id: 'fparm-r', feetPosition: tune?.aat ?? FP_AT(l.sex === 'f' ? 'f' : 'm'), rotation: tune?.arot ?? FP_ROT, model: { id: fpa.R, materials: skinM }, castShadow: false, visibleInFirstPerson: true, audience: 'local' }) // her own right arm (art/fp-arm), its fist closed on the grip at the viewmodel's origin
    else if (cs) {
      const cat = CAT_FPARM[l.sex === 'f' ? 'f' : 'm']
      // no tuck: on the body the skin sinks 4 cm under a modelled top's sleeve, but no sleeve rides the first-person arm, so it drew stick-thin (Shelly Nov 12 'why are my arms thin when i have clothing on')
      const mats = Object.fromEntries(Object.entries(cs.model.materials ?? {}).map(([k, m]) => [k, m?.params ? { ...m, params: { ...m.params, tuckT: 0, tuckB: 0, tuckS: 0 } } : m]))
      const arms = { model: { ...cs.model, id: cat.glb, materials: mats }, /* no body morph: its shape keys are the whole body's and thin the cut arm to sticks (Shelly: 'why do my arms look like sticks') */ ...(cs.scale ? { scale: cs.scale } : {}),
        castShadow: false, visibleInFirstPerson: true, audience: 'local' }
      child.push({ ...arms, id: 'plyarm', bones: { 'mixamorig:LeftArm': { scale: 0 } }, feetPosition: tune?.cat ?? cat.at })
      // The cut cat has short arms. Seat the left shoulder behind the fore-end so the paw can reach it.
      if (support) {
        const f = supportWrist
        const scale = cs.scale ?? { x: 1, y: 1, z: 1 }
        child.push({ ...arms, id: 'plyarm-left', bones: { 'mixamorig:RightArm': { scale: 0 } },
          scale: { x: scale.x * 1.22, y: scale.y * 1.22, z: scale.z * 1.22 },
          feetPosition: { x: f.x + .02, y: f.y - .32, z: f.z + .11 } })
      }
    }
    else if (ply) child.push({ id: 'plyarm', model: ply, feetPosition: { x: 0.02, y: -1.62, z: 0.62 }, castShadow: false, visibleInFirstPerson: true, audience: 'local', anim: { idle: { clip: 'Idle', loop: 'loop', weight: 1 } } })
    w.vm = ctx.spawn({
      feetPosition: { attach: 'camera', x: 0.2, y: -0.2, depth: 0.42, fov: 55 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js', params: arm, ...((fp?.muzzle ?? wp.muzzle) ? { sockets: { muzzle: fp?.muzzle ?? wp.muzzle } } : {}) }, children: child
    })
    w.vmKind = armKey
  }
  w.plyWant = !!ply && !hb
  if (ply && !w.plyRig && ctx.now() >= (w.plyNext ?? 0)) { w.plyNext = ctx.now() + 500; plyArm(ctx, w) } // its skeleton arrives with the model: look twice a second, not every tick
  if (w.vm && s.vmId !== w.vm) s.vmId = w.vm // scripts/lib/vmpose.js poses it every display frame from the camera rig
}

// once the worn model's skeleton is in: keep only its right arm (head, left arm and legs shrink to their joints)
// and put its right hand on the viewmodel's grip, so it follows every sway, recoil and reload pose
const RH = /(^|[^a-z])(r|right)[_. ]?hand$|hand[_. ]?(r|right)$/i
const CUT = [/head$|neck/i, /(^|[^a-z])(l|left)[_. ]?(clavicle|shoulder|upperarm|arm)$|(clavicle|shoulder|upperarm)[_. ]?(l|left)$/i, /thigh|upleg|(^|[^a-z])(l|r|left|right)[_. ]?leg$|calf/i, /tail/i]
// the human body's rest-pose right arm (art/human-base: RightArm -> RightHand) laid along the line from below-right of the eye up to the wrist of the grip hand; the torso sits beside and behind the eye, out of view. Computed from the GLB joints, no IK, so it never pops
const HUMAN_ARM = { f: { q: { x: -0.4041, y: 0.3447, z: 0.8277, w: 0.1811 }, at: { x: 0.939, y: 0.538, z: -0.014 } }, m: { q: { x: -0.4026, y: 0.3501, z: 0.8263, w: 0.1806 }, at: { x: 1.038, y: 0.577, z: -0.001 } } }
// first-person arms cut from Shelly's human bodies (art/fp-arm/build.py): forearm, hand closed in a fist, the fist's centre at the origin
const FP_ARM = {
  f: { R: '/cdn/value.2d938d9446aaeb01c15e41213e80f5a4d2c7e1507bc655714fb04eac001794fa.glb', L: '/cdn/value.7f8d66209a679e498e2b417b0accaf0b9ce819769be93f697762794ff5dc409b.glb' },
  m: { R: '/cdn/value.7217b9235387299104686cdd782ec11f1801444037bd8eceefe445e11001b020.glb', L: '/cdn/value.70fede1b834eff766531f0b51f4772832f8ac989f9f48cffe988120bba1970cb.glb' } }
// the engine stands a model's bounds bottom-centre on feetPosition, so the fist (the mesh origin) needs that offset back; BC = bounds bottom-centre of each GLB
const FP_TWO_Q = { x: -0.2804, y: -0.5107, z: 0.4678, w: 0.6646 } // the left fist re-laid for a fore-end: forearm (-0.75,-0.45,0.48), back of hand down, grip hollow forward along the barrel
const FP_VERTICAL_Q = eulerQ(-12, 0, 12)
const FP_BC = { f: { x: 0.0304, y: -0.2624, z: 0.1128 }, m: { x: 0.0375, y: -0.2836, z: 0.1145 } }
const FP_SEAT = { x: 0, y: 0.039, z: 0.096 } // the pistol grip's centre in viewmodel space, measured off the mesh (art/weapon-split/fitview.py): the fist's hollow lands on it
const FP_AT = (sx) => ({ x: FP_BC[sx].x + FP_SEAT.x, y: FP_BC[sx].y + FP_SEAT.y, z: FP_BC[sx].z + FP_SEAT.z }), FP_ROT = { yaw: 0, pitch: 0, roll: 0 }
// first-person arms cut from her own body GLBs (art/cat-fparm/build.py): same mesh, rig, slots and bind pose, only arm/forearm/hand kept, so no torso or sleeve lump fills the view.
// at: the model's bounds bottom-centre placed so its right shoulder sits below-right of and a little ahead of the eye, an arm's reach behind the grip (viewmodel origin); the hand reaches the grip by IK (plyArm)
const CAT_FPARM = { f: { glb: '/cdn/value.1a50c4f098271ae5981ef730799d0a2e9913570abeb76d1475ab61869585a26a.glb', at: { x: -0.035, y: -0.16, z: 0.28 } }, m: { glb: '/cdn/value.0ac8ed9fa781f9f7a002a249ccb98c55be6cd8f29698bb508e008517c604cc25.glb', at: { x: -0.05, y: -0.185, z: 0.28 } } }
const LH = /(^|[^a-z])(l|left)[_. ]?hand$|hand[_. ]?(l|left)$/i
const RIGHT_CHAIN = /(^|[^a-z])(r|right)[_. ]?(clavicle|shoulder|upperarm|arm)$|(clavicle|shoulder|upperarm)[_. ]?(r|right)$/i
function plyArm(ctx, w) {
  const root = ctx.getObject(w.vm)
  const kids = (root?.children ?? []).map((c) => typeof c === 'string' ? ctx.getObject(c) : c).filter(Boolean)
  const find = (id) => ctx.getObject(w.vm + '/' + id) ?? kids.find((c) => c.id === id || c.id?.endsWith('/' + id))
  const right = find('plyarm')
  const left = w.plySplit && w.plySupport ? find('plyarm-left') : null
  const rightReady = fitPaws(right, w, false, !w.plySplit && !!w.plySupport)
  const leftReady = !w.plySplit || !w.plySupport || fitPaws(left, w, true, false)
  w.plyRig = rightReady && leftReady
}
function fitPaws(body, w, left, both) {
  const rig = body?.skeleton
  if (!rig) return false
  const names = (Array.isArray(rig) ? rig : Object.keys(rig)).map((b) => typeof b === 'string' ? b : b.name).filter(Boolean)
  if (!names.length) return false
  const bones = {}
  const bone = (n) => n.replace(/^mixamorig:/, '')
  const cut = CUT.filter((_, i) => i !== 1)
  if (!both) cut.push(left ? RIGHT_CHAIN : CUT[1])
  for (const name of names) if (cut.some((r) => r.test(bone(name)))) bones[name] = { scale: 0 }
  const grip = (left, offset) => {
    const name = names.find((n) => (left ? LH : RH).test(bone(n)))
    if (name) bones[name] = { ...(left && w.plySplit ? { scale: 1 / 1.22 } : {}), ...(w.catGun && (!left || w.catForeEnd) ? { rotate: [0, 0, left ? 24 : -18] } : {}), reach: { to: { object: w.vm, offset }, pole: { object: w.vm, offset: { x: left ? -.45 : .42, y: -.55, z: .38 } } } }
  }
  if (left || both) grip(true, w.plySupport)
  if (!left) grip(false, w.plyGrip)
  body.bones = bones
  return true
}

export function update(ctx, dt) {
  preloadTick(ctx) // a level door within reach starts its level's models downloading (lib/preload-next.js)
  laterTick(ctx) // reload steps (later())
  forgiveTick(ctx) // the angry cool off an in-game hour after your last offence (lib/forgive.js)
  { const me = ctx.self, ses = me.session, hp = me.state.hp ?? 0, nowS = ctx.now(); tick3(me, nowS); if (ses.hpSeen != null && hp < ses.hpSeen - 2.5 && hp > 0 && nowS - (ses.stagAt ?? 0) > 450) { ses.stagAt = nowS; stagger3(ctx, me) } ses.hpSeen = hp } // a stagger take each real hit (Shelly Nov 10)
  { const st = ctx.self.state; if (st.reloading && (st.equipped !== st.reloading || !st.reloadAt || ctx.now() - st.reloadAt > 9000)) { st.reloading = ''; st.reloadTok = (st.reloadTok ?? 0) + 1 } } // a reload stranded by a swap, a page reload or a lost timer clears itself
  const fp = ctx.self.feetPosition, fz = zoneHere(ctx, fp.x, fp.z)
  {
    const s0 = ctx.self.state, ses = ctx.self.session; const pl = ctx.self.place
    const zx = fp.x, zz = fp.z, inRoom = (cx) => pl === 'level01' && Math.abs(zx - cx) < 5 && zz > -43 && zz < -35 // Zenith's failing climate rooms (Shelly, Nov 9)
    const zHot = inRoom(7.6), zCold = inRoom(-7.6)
    { // cold: the frozen wash room. 0..100 on player.state.cold, eased in session, written per whole degree; it thaws 6°/s outside
      const want = zCold ? 85 : 0, c0 = ses.coldF ?? s0.cold ?? 0
      if (want > 0 || c0 > 0) { const c = want > c0 ? Math.min(want, c0 + 3 * dt) : Math.max(0, c0 - 6 * dt); ses.coldF = c; const n = Math.round(c); if (n !== Math.round(s0.cold ?? 0)) s0.cold = n }
    }
    if ((zHot && (s0.heat ?? 0) >= 70) || (zCold && (s0.cold ?? 0) >= 70)) { // past 70 it bites: 2 hp every 2 s (Savi's pick)
      const nowH = ctx.now(); if (nowH - (ses.climateHurtAt ?? 0) > 2000) { ses.climateHurtAt = nowH; s0.hp -= 2; ctx.emit('screenFlash', { color: zHot ? '#ff6a2a' : '#9fd8ff', duration: 0.3, intensity: 0.15 }, { audience: { player: ctx.self.id } }) }
      if (nowH - (ses.climateSayAt ?? 0) > 30000) { ses.climateSayAt = nowH; s0.notice = { text: zHot ? 'The air burns your lungs. Get out of the heat.' : 'Your fingers stop working. Get out of the cold.', at: nowH } }
    }
    const hot = zHot ? 85 : pl === 'level2' ? (fz === 'l2_pipes' ? 75 : fz === 'l2_hall' ? 55 : 30) : pl === 'level21' ? (fz === 'l21_edge' || fz === 'l21_edgecave' ? 0 : fz === 'l21_fridges' ? 0 : 45) : pl === 'level3' || pl === 'gamma' ? 35 : 0 // how hot each place runs, in degrees on the meter
    if (hot > 0) { ses.heatF = (ses.heatF ?? s0.heat ?? 0) + Math.sign(hot - (ses.heatF ?? s0.heat ?? 0)) * Math.min(Math.abs(hot - (ses.heatF ?? s0.heat ?? 0)), 2 * dt); const n = Math.round(ses.heatF); if (n !== Math.round(s0.heat ?? 0)) s0.heat = n }
    else if ((s0.heat ?? 0) > 0 && pl !== 'level5') { ses.heatF = Math.max(0, (ses.heatF ?? s0.heat) - 5 * dt); const n = Math.round(ses.heatF); if (n !== Math.round(s0.heat)) s0.heat = n } else ses.heatF = undefined
  } // heat only lives in the Boiler Room: carried out of Level 5 it cools 5°/s (eased in session, written per whole degree)
  ensure(ctx)
  if (ctx.self.parent) return
  const w = walkOf(ctx), s = ctx.self.state
  if (!Number.isFinite(w.stamina)) w.stamina = Number.isFinite(s.stamina) ? s.stamina : L.stamina
  if (!Number.isFinite(w.battery)) w.battery = Number.isFinite(s.battery) ? s.battery : L.battery // a wake before the save lands used to leave these unset: NaN went into the save as null
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
  const lrunLive = ctx.self.place === 'levelrun' && !s.lrunRescued && !s.lrunCut
  const lrAgi = lrunLive ? agilityProfile(s) : null
  if (lrAgi && fp.z <= CORRIDOR.corridorStartZ && fp.z > CORRIDOR.collapseZ) {
    const obsHit = hitObstacle(fp, Math.max(0, (fp.y ?? 0) - 0.1))
    if (obsHit && w.lrunObsId !== obsHit.obs.id) {
      w.lrunObsId = obsHit.obs.id
      if (obsHit.vaulted) {
        w.lrunVaultUntil = nowS + 320
        s.ch2AgilityUsed = (s.ch2AgilityUsed ?? 0) + 1
        sound(ctx, 'gun-raise-cloth-rustle', 0.4, true)
        ctx.emit('damageNumber', { position: { x: fp.x, y: (fp.y ?? 0) + 2, z: fp.z - 1 }, text: 'VAULT', color: '#9cf2a8', size: 0.8 }, { audience: { player: ctx.self.id } })
      } else if (nowS >= (w.lrunDodgeUntil ?? 0) && nowS > (w.lrunStumbleUntil ?? 0)) {
        w.lrunStumbleUntil = nowS + lrAgi.stumbleMs
        w.lrunStumbleMul = lrAgi.stumbleSpeedKeep
        ctx.emit('cameraPunch', { direction: { x: 0, y: -0.4, z: 0.6 }, intensity: 0.25 }, { audience: { player: ctx.self.id } })
        sound(ctx, 'footstep-damp-carpet-run', 0.55, true)
        ctx.emit('damageNumber', { position: { x: fp.x, y: (fp.y ?? 0) + 2, z: fp.z - 1 }, text: lrAgi.agi >= 7 ? 'STUMBLE, caught it' : 'STUMBLE', color: '#ffb066', size: 0.8 }, { audience: { player: ctx.self.id } })
      }
    }
  }
  const l2Hot = ctx.self.place === 'level2' && (fz === 'l2_pipes' || fz === 'l2_hall')
  if (l2Hot && nowS - (s.heatWarnAt ?? 0) > 45000) {
    s.heatWarnAt = nowS
    s.notice = { text: 'Suffocating heat (110°F) comes off the pipes. You tire faster here.', at: nowS }
  }
  w.stamina = Math.max(0, Math.min(dv.staMax, w.stamina + (sprinting ? -L.staminaDrain * (green ? AW.green.staminaMul : 1) * (l2Hot ? 1.25 : 1) * (lrAgi ? lrAgi.sprintDrainMul : 1) : L.staminaRegen * dv.staRegen * (tired ? 0.3 : 1) * (w.winded ? (L.windedRegen ?? 0.6) : 1) * (l2Hot ? 0.68 : 1) * (w.ledge ? L.ledgeRest.stamina : 1)) * dt))
  const inArch = fz === 'arches' && (ctx.self.place === 'main' || ctx.self.place === 'tutorial0') // the flooded arches are Level 0's alone: other places without their own zones fall through to Level 0's map
  w.wet = inArch && fp.y < 0.3; w.ledge = inArch && fp.y > 0.45 && ctx.self.grounded
  const lrStumble = lrAgi && nowS < (w.lrunStumbleUntil ?? 0) ? (w.lrunStumbleMul ?? 0.5) : 1
  const lrDodge = lrAgi && nowS < (w.lrunDodgeUntil ?? 0)
  const lrVault = lrAgi && nowS < (w.lrunVaultUntil ?? 0) ? lrAgi.vaultBoost : 0
  const speed = ((w.walkMode && !sprinting ? 0.5 : 1) * (sprinting ? L.sprintSpeed : L.walkSpeed) * (w.wet ? L.wetCarpetSpeed : 1) * (s.ads ? 0.55 : 1) * (s.carryMul ?? 1) * (1 - 0.55 * (s.leth13 ?? 0)) * (crouched ? L.crouchSpeed ?? 0.45 : 1) * (s.crawl ? 0.72 : 1) * dv.speed * (w.bur ??= burden(s)) * (lrAgi ? lrAgi.speedMul : 1) * lrStumble) + lrVault
  const drunk = Math.max(0, (s.drunk ?? 0) - (nowS - (s.drunkAt ?? nowS)) * 0.4) // sobers 0.4 a second
  if (s.drunk && drunk <= 0) s.drunk = 0
  const sway = drunk > 15 && moving ? Math.sin(nowS * 1.3) * Math.min(0.5, drunk / 160) : 0 // past a couple of drinks the walk drifts
  if (sway) dir = { x: dir.x * Math.cos(sway) - dir.z * Math.sin(sway), y: dir.y, z: dir.x * Math.sin(sway) + dir.z * Math.cos(sway) }
  const dDir = lrDodge && w.lrunDodgeDir ? w.lrunDodgeDir : dir
  const intent = lrDodge ? { x: dDir.x * lrAgi.dodgeSpeed, z: dDir.z * lrAgi.dodgeSpeed } : { x: dir.x * speed * (moving || !pressing ? 1 : 0.35), z: dir.z * speed * (moving || !pressing ? 1 : 0.35) } // stuck on a wall: a gentle lean, still enough to slide off a corner
  viewmodel(ctx, moving, sprinting)
  const v = ctx.self.velocity
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && moving)
  if (now0(ctx) >= (w.slickAt ?? 0)) { w.slickAt = now0(ctx) + 150; w.onSlick = ctx.query({ tags: ['soupslick'], radius: 1.3, select: 'ids' }).length > 0 } // checked a few times a second, not every tick
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * dt * (w.onSlick ? 0.07 : 1) // soup underfoot: you skate
  if (!Number.isFinite(intent.x) || !Number.isFinite(intent.z)) { intent.x = 0; intent.z = 0; if (!Number.isFinite(w.bur)) w.bur = undefined; w.dv = undefined } // a fresh save's sheet can read NaN for a beat: stand still, re-derive next tick
  const vx = Number.isFinite(v.x) ? v.x : 0, vz = Number.isFinite(v.z) ? v.z : 0, vy = Number.isFinite(v.y) ? v.y : 0
  if (ctx.self.place === 'level31' && fp.y < 0.4 && onRink(fp.x, fp.z)) { // Level 31's wood: shoes slip, skates roll
    const o = skateStep(SKATE, !!s.skates, w, dir, pressing, sprinting, vx, vz, dt, nowS, ctx.random())
    if (o.slipped) { s.notice = { text: s.skateTip ? 'You slip.' : 'You slip. The wood is slick in shoes. The Coach rents skates.', at: nowS }; s.skateTip = 1; ctx.emit('playSound', { clip: 'cdn/sfx-sneaker-sole-squeak-slip-on-polished-wood-floor.mp3', volume: 0.6 }) }
    if (!w.onRink) { w.onRink = true; if (s.skates) ctx.emit('playSound', { clip: 'cdn/sfx-roller-skate-wheels-step-onto-wood-rink-clack.mp3', volume: 0.5 }) }
    ctx.self.velocity = { x: o.x, y: vy + ctx.place.gravity.y * dt, z: o.z }
    return
  }
  if (w.onRink) w.onRink = false
  const dx = intent.x - vx, dz = intent.z - vz, gap = Math.hypot(dx, dz), k = gap > step ? step / gap : 1
  ctx.self.velocity = { x: vx + dx * k, y: vy + ctx.place.gravity.y * dt, z: vz + dz * k }

  // Footsteps (scripts/lib/footsteps.js): the floor under you, a step per stride, left/right feet, weight, scuffs and landings
  if (!s.crawl) stepTick(ctx, w, dt, { moving, sprinting, crouched, wet: w.wet, bur: w.bur ?? 1, fallback: floorOf(ctx), clip: SND })

  w.acc = (w.acc ?? 0) + dt
  if (s.fishingState) {
    const fs = s.fishingState, dist = Math.hypot(ctx.self.feetPosition.x - fs.bx, ctx.self.feetPosition.z - fs.bz)
    if (dist > 22 || s.sheathed || baseOf(s.equipped) !== 'fishing_rod' || s.dead || s.downAt) cancelFishing(ctx, s, 'lost')
  }
  if (w.acc >= 0.25) { w.dv = derived(s); w.bur = burden(s); w.vmCheck = true; tickStats(ctx, w.acc, moving); w.acc = 0 }
}

const HOSTILE = ['smiler', 'lurker', 'hound', 'stealer', 'deathmoth', 'moth']
const HOSTILE_AND_NPC = [...HOSTILE, 'npc', 'l61fc']
const _rayEye = { x: 0, y: 0, z: 0 }
const _rayDir = { x: 0, y: 0, z: 0 }
const SWING_TAGS = ["smiler", "lurker", "hound", "stealer", "moths", "l8spider", "npc", "l61fc", "spamboss", "zdrone", "l8-hostile"] // one query for every swing target, each thing once, not one query per tag (perf, Nov 12)
const _rayOpt = { distance: 10, physicsOnly: true, bodies: 'static', ignoreEntities: [] }
// sneaking, FNV-style: every watcher with a clear look fills an awareness meter (w.aware 0..1) at a rate set by distance,
// how squarely it faces you, light, dark and whether you move; nobody looking, it drains. [CAUTION] while it fills, [DETECTED] or [DANGER] once full.
function detection(ctx, p, w, t, moving) {
  const me = ctx.self.id, s = ctx.self.state, sneak = skillsOf(s).sneak ?? 0
  const reach = (w.light ? 16 : 10) * (1 - Math.min(0.5, sneak / 200)) * (s.dark ? SNK.darkMul : 1)
  let rate = 0, hostileSees = false, hunted = false
  for (const o of ctx.query({ anyTags: HOSTILE_AND_NPC, radius: 24 })) {
    const st = o.state ?? {}; if (st.dead || (st.hp ?? 1) <= 0) continue
    const q = o.feetPosition, dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz)
    const hostile = !(o.tags?.includes('npc') || o.tags?.includes('l61fc')) || hostileReason(ctx, o, ctx.self)
    if (hostile && (st.target === me || st.prey === me || st.sneakTarget === me || st.hunting === me || st.chase === me)) { hunted = true; break }
    if (d > reach) continue
    const yaw = (yawOf(ctx.getObject(o.id)?.rotation) ?? 0) * Math.PI / 180
    const facing = (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / (d || 1) // 1 = looking straight at you
    if (facing < 0.25 && d > 1.6) continue
    _rayEye.x = q.x; _rayEye.y = q.y + 1.3; _rayEye.z = q.z
    const tox = p.x - _rayEye.x, toy = p.y + 0.8 - _rayEye.y, toz = p.z - _rayEye.z
    const n = Math.hypot(tox, toy, toz) || 1
    _rayDir.x = tox / n; _rayDir.y = toy / n; _rayDir.z = toz / n
    _rayOpt.distance = n - 0.3
    _rayOpt.ignoreEntities = [o.id, me]
    if (raycast(ctx, _rayEye, _rayDir, _rayOpt)) continue
    const near = 1 - d / reach, k = (SNK.fillMin + (SNK.fillRate - SNK.fillMin) * near * near) * (d < 1.6 ? 1 : 0.5 + 0.5 * Math.max(0, facing)) * (moving ? 1 : SNK.stillMul)
    if (k > rate) rate = k
    if (hostile) hostileSees = true
  }
  if (hunted) { w.aware = 1; if (s.aware !== 1) s.aware = 1; return 'danger' }
  w.aware = Math.max(0, Math.min(1, (w.aware ?? 0) + (rate > 0 ? rate : -SNK.decay) * t))
  const lit = Math.round(w.aware * 10) / 10
  if (s.aware !== lit) s.aware = lit
  if (w.aware >= 1) return hostileSees ? 'danger' : 'detected'
  return w.aware > SNK.caution ? 'caution' : 'hidden'
}

function tickStats(ctx, t, moving) {
  const s = ctx.self.state, w = walkOf(ctx), p = ctx.self.feetPosition, now = ctx.now()
  const mh = maxHp(s.level, s), ms = maxSan(s.level, s)
  const af = w.fwd ?? { x: 0, z: -1 }, ax = Math.round(af.x * 20) / 20, az = Math.round(af.z * 20) / 20
  if (s.aimX !== ax) s.aimX = ax
  if (s.aimZ !== az) s.aimZ = az
  const zone = zoneHere(ctx, p.x, p.z)
  if (zone !== s.zone) s.zone = zone
  const dark = zone === 'dark' || zone === 'l2_dark' || zone === 'l3_dark' || ctx.self.place === 'level6'
  if (!!s.dark !== dark) s.dark = dark
  // sneaking: who can see you, written only when the answer changes (the HUD's [HIDDEN] / [DETECTED] / [DANGER])
  const det = s.crouch ? detection(ctx, p, w, t, moving) : (w.aware = 0, null)
  if ((s.detect ?? null) !== det) s.detect = det
  if (!s.crouch && s.aware) s.aware = 0
  // sanity: the halls eat it, the dark eats it faster, the safe room gives it back
  let drain = ({
    level61: 0, level11: 0, level10: 0, bonus: 0, intake: 0, home11: 0, thehub: 0, testlab: 0, level27: 0,
    level7: zone === 'l7_sea' || zone === 'l7_ocean' ? 0.75 : 0.22,
    level6: w.nvg ? 0.32 : 1.15,
    level4: DRAIN4[zone.slice(3)],
    level5: (DRAIN5[zone.slice(3)] ?? 0.8) / 60 * 4,
    level2: L2.sanityDrain[zone.slice(3)],
    level3: L3.sanityDrain[zone.slice(3)],
    gamma: L3.sanityDrain[zone.slice(3)],
    level8: 0.14,
    level109: Math.hypot(p.x - 8, p.z - 20) < L109_DRAIN.arrivalR ? L109_DRAIN.arrival : L109_DRAIN.halls,
    level21: L21.sanityDrain[zone.slice(4)],
  }[ctx.self.place] ?? L.sanityDrain[zone]) ?? 0.12
  if (w.light && (zone === 'dark' || zone === 'red' || zone === 'l3_dark')) drain *= 0.4
  if (drain > 0 && nearFresh(ctx)) drain = 0
  { const mb = musicNear(ctx); if (mb) drain = Math.min(drain, 0) - mb } // a playing music box steadies whoever stays near it // a set-down Reality Freshener holds the room still (scripts/lib/remodel-quest.js)
  if (ctx.self.place === 'level5' && s.l5room && zone.slice(3) === s.l5room && ctx.now() < (s.l5until ?? 0)) drain = -0.6 // a rented Homely Hotel suite: your own room, the hotel can't reach you (scripts/l5-resident.js)
  if (drain > 0 && ctx.now() < (s.blueUntil ?? 0)) drain = 0 // blue almond water: the halls can't get in
  s.sanity -= drain * (drain > 0 ? derived(s).drain : 1) * t
  if (w.ledge) s.sanity += L.ledgeRest.sanity * t
  const rest = !!w.ledge, wet = !!w.wet
  if (s.onLedge !== rest) s.onLedge = rest
  if (s.wet !== wet) s.wet = wet
  if (s.sanity > ms) s.sanity = ms
  if (s.sanity < 0) s.sanity = 0
  if (!s.startFull) { s.startFull = 1; s.hp = maxHp(s.level, s); s.hunger = 100; s.thirst = 100 } // Shelly: a run starts with full health, food and water (once per save)
  if (s.god) { if (s.sanity < ms) s.sanity = ms; if ((s.hunger ?? 100) < 100) s.hunger = 100; if ((s.thirst ?? 100) < 100) s.thirst = 100; const gh = maxHp(s.level, s); if ((s.hp ?? gh) < gh) s.hp = gh; if (s.dead) s.dead = false } // god mode (creator's testing switch): topped up every tick
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
  if (zone !== 'hub' && ctx.self.place === 'main' && !inXmas(ctx.self.feetPosition)) {
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
  if (w.light) { w.battery -= L.batteryDrain * t * (ctx.self.place === 'level8' ? 2.2 : 1); if (w.battery <= 0) { w.battery = 0; if (!swapBattery(ctx)) toggleLight(ctx) } }
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
  if (ctx.session.wakeCrossAt && now - ctx.session.wakeCrossAt < 3000 && s.savePlace !== ctx.self.place) return // the ride to the saved level is under way: nothing re-wakes or re-saves here
  if (w.wakeHold && now < w.wakeHold.until) { const h = w.wakeHold; if (Math.hypot(p.x - h.x, p.z - h.z) > 1.5) { ctx.self.feetPosition = { x: h.x, y: h.y + 0.1, z: h.z }; ctx.self.velocity = { x: 0, y: 0, z: 0 }; return } } // a level's own arrival (its door marker, its default spawn) lands a beat after the wake: the saved spot wins for 2.5 s
  if (!ctx.session.wokeAt) {
    ctx.session.wokeAt = now
    if (s.savePos && s.savePlace === ctx.self.place) w.wakeHold = { x: s.savePos.x, y: s.savePos.y, z: s.savePos.z, until: now + 2500 }
    wakeLog(ctx, s, migrate(ctx, s)) // scripts/lib/save.js: the save's version and migration, before anything reads it
    const sp = s.savePos, wp = wakePlace(ctx, s)
    if (s.wakeAtSave && sp && s.savePlace === ctx.self.place) { s.wakeAtSave = null; ctx.self.feetPosition = { x: sp.x, y: sp.y + 0.1, z: sp.z }; return } // the station's last-level ride: back where you stood
    s.wakeAtSave = null
    if (ctx.self.place === 'bonus' || s.roomHop) { /* the mall and room hops land where their door puts you (scripts/lib/hub.js) */ }
    else if (sp && wp && wp !== ctx.self.place && (ctx.session.wakeTry ?? 0) < 3) { ctx.session.wakeTry = (ctx.session.wakeTry ?? 0) + 1; s.wakeAtSave = true; ctx.session.wokeAt = 0; ctx.session.wakeCrossAt = now; ctx.cross(ctx.self, wp); return } // the wake runs again on arrival and stands you on the saved spot (it used to leave you at the level's door); three tries, then you stay put
    if (sp && s.savePlace === ctx.self.place) { ctx.self.feetPosition = { x: sp.x, y: sp.y + 0.1, z: sp.z }; return }
  }
  // a threshold aims at an arrival marker the far level lays only once someone stands in it (its sim): the first crossing into a
  // level drops you at its default spawn instead, far from the door you came through. When the marker turns up, step onto it,
  // still under the noclip frame (scripts/lib/carry.js notes the aim as state.xferTo).
  if (s.xferTo) {
    const [pl, mk] = String(s.xferTo.link ?? '').split('#')
    if (!mk || now - (s.xferTo.at ?? 0) > 8000) s.xferTo = null
    else if (ctx.self.place === pl) {
      const m = ctx.getObject(mk), raw = ctx.place.objects?.[mk]
      if (m) {
        s.xferTo = null
        const mp = m.worldFeetPosition ?? m.feetPosition
        if (mp && Math.hypot(mp.x - p.x, mp.z - p.z) > 1.5) {
          ctx.self.feetPosition = { x: mp.x, y: mp.y + 0.1, z: mp.z }; ctx.self.velocity = { x: 0, y: 0, z: 0 }
          const yw = typeof raw?.rotation === 'number' ? raw.rotation : raw?.rotation?.yaw
          if (typeof yw === 'number') ctx.self.rotation = { yaw: yw }
          return
        }
      }
    }
  }
  if (canSaveHere(ctx.self.place) && now - (w.savedAt ?? 0) > 4000) { w.savedAt = now; s.savePos = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10 }; s.savePlace = ctx.self.place }
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
    if (s.escapes === 1) gain(ctx, L.xpExit)
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#000000', duration: 0.9, intensity: 1 }, { audience: { player: ctx.self.id } })
    carryAcross(ctx, ctx.self, 'level1#l1-from-main') // what you hold comes too (scripts/lib/carry.js)
    ctx.cross(ctx.self, 'level1#l1-from-main') // through the flickering wall: out of Level 1's door home
    return
  }
  // taken
  if (s.hp <= 0) {
    if (ctx.self.place === 'levelrun' && (p.z ?? 0) <= CORRIDOR.collapseZ + 5 && !s.lrunRescued) {
      s.hp = 6
      startRescueCut(ctx, ctx.self)
      return
    }
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

// G: press pulls the pin (a frag's fuse starts there: hold to cook it), the arm draws back; let go and it flies.
// Which one: the one picked in HALOGEN (READY FOR G), else a frag if you carry one, else a molotov. Held past the fuse, it goes off in your hand.
const OVERHAND = { clip: '/cdn/clip-overhand-throw-left-b23ba93b.glb', // mirrored (art/nade-left/mirror.py): the free left arm throws, the gun stays in the right
  mask: 'upper', weight: 6, blendIn: 0.08, blendOut: 0.3 }
function pullPin(ctx) {
  const s = ctx.self.state, now = ctx.now(), w = walkOf(ctx)
  if (s.dead || w.nade || now < (w.throwAt ?? 0)) return
  const selected = THROW[s.nadePick]
  const pick = selected?.key && (s[selected.key] ?? 0) > 0 ? s.nadePick : null
  const kind = pick ?? ((s.grenades ?? 0) > 0 ? 'frag' : (s.molotovs ?? 0) > 0 ? 'molotov' : (s.baubles ?? 0) > 0 ? 'bauble' : (s.fresh ?? 0) > 0 ? 'fresh' : null)
  if (!kind) { s.notice = { text: 'Nothing to throw', at: now }; return }
  const T = THROW[kind]
  w.nade = { kind, at: now, fuseAt: now + (T.fuse ?? 0) }
  // the arm draws back and holds there (the clip's wind-up, slowed) until you let go
  ctx.self.anim.nade = { clip: OVERHAND.clip, weight: OVERHAND.weight, loop: 'once', speed: 0.55, time: 0, mask: OVERHAND.mask, blendIn: OVERHAND.blendIn, blendOut: OVERHAND.blendOut, clampWhenFinished: true }
  // in first person: the grenade or bottle comes up in your free left hand, the gun stays up in the right
  w.nadeVm = ctx.spawn({ audience: 'local', scope: 'session', feetPosition: { attach: 'camera', x: -0.26, y: -0.3, depth: 0.55 }, rotation: { yaw: -20, pitch: kind === 'frag' ? 0 : -20 }, ...(T.model ? { model: T.model, layout: { box: { min: { x: -T.size / 2, y: 0, z: -T.size / 2 }, max: { x: T.size / 2, y: T.size, z: T.size / 2 } } } } : { ...FRESH_BODY, children: FRESH_BODY.children.filter((c) => !c.light) }), visibleInFirstPerson: true, castShadow: false })
  animate(ctx, w.nadeVm, { 'feetPosition.y': [-0.5, -0.22], 'feetPosition.x': [-0.3, -0.32] }, { duration: 0.25, easing: 'easeOutCubic' })
  ctx.emit('playSound', { clip: kind === 'fresh' ? 'cdn/sfx-aerosol-can-short-hiss-click-plastic-cap.mp3' : kind === 'frag' ? '/cdn/moodboard-realistic-gritty/sfx-grenade-pin-pull-metal-ring-click.mp3' : '/cdn/moodboard-realistic-gritty/sfx-lighter-flick-cloth-rag-catches-fire.mp3', volume: 0.75 })
  if (kind === 'frag') w.nadeCook = ctx.after(T.fuse / 1000, 'cookedOff', { at: w.nade.at })
}
export function cookedOff(ctx, p) { // held too long: it goes off where you stand
  const w = walkOf(ctx); if (!w.nade || w.nade.at !== p?.at) return
  w.nade.cooked = true; letFly(ctx)
}
function letFly(ctx) {
  const s = ctx.self.state, now = ctx.now(), w = walkOf(ctx), n = w.nade
  if (!n) return
  w.nade = null; if (w.nadeCook) { ctx.cancel(w.nadeCook); w.nadeCook = null }
  const T = THROW[n.kind], hd = handling(s, T); w.throwAt = now + THROW.cooldown * hd.swing * 1000
  if ((s[T.key] ?? 0) <= 0) { if (w.nadeVm) { ctx.destroy(w.nadeVm); w.nadeVm = null } ctx.self.anim.nade = null; return }
  s[T.key] -= 1
  // the arm whips through: the rest of the clip at full speed from the wind-up
  ctx.self.anim.nade = { clip: OVERHAND.clip, weight: OVERHAND.weight, loop: 'once', speed: 1.6, time: 0.62, mask: OVERHAND.mask, blendIn: 0.05, blendOut: 0.3 }
  ctx.after(0.5, 'nadeArmDown', { at: now })
  if (w.nadeVm) { const vm = w.nadeVm; w.nadeVm = null; animate(ctx, vm, { 'feetPosition.y': [-0.22, 0.05], 'feetPosition.depth': [0.55, 1.1], 'feetPosition.x': [-0.32, -0.05] }, { duration: 0.12 }); ctx.after(0.12, 'nadeVmGone', { id: vm }) }
  ctx.emit('cameraPunch', { direction: { x: 0, y: -0.2, z: -1 }, intensity: 0.25 }, { audience: { player: ctx.self.id } })
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  const eye = { x: p.x + f.x * 0.5, y: p.y + (s.crouch ? 1.0 : 1.5), z: p.z + f.z * 0.5 }
  if (n.cooked) { // too late: it never leaves your hand
    ctx.spawn({ tags: ['thrown'], lifetime: 3, feetPosition: { x: p.x, y: p.y + 0.3, z: p.z }, behavior: 'scripts/nade.js', state: { kind: n.kind, vel: { x: 0, y: 0, z: 0 }, ownerId: ctx.self.id, fuseAt: now, rest: true } })
    s.notice = { text: 'You held it too long', at: now }
    return
  }
  // a longer wind-up throws harder: a flick at 60%, full strength after 0.6 s held
  const power = (0.6 + 0.4 * Math.min(1, (now - n.at) / 600)) * hd.throwPower
  const pc = Math.max(-0.6, Math.min(1.1, s.aimPitch ?? 0)), cp = Math.cos(pc), sp = T.speed * power
  const vel = { x: f.x * cp * sp, y: Math.sin(pc) * sp + T.lift * power, z: f.z * cp * sp }
  const half = T.size / 2
  ctx.spawn({ tags: ['thrown'], lifetime: 12, feetPosition: eye, ...(T.model ? { model: T.model, layout: { box: { min: { x: -half, y: 0, z: -half }, max: { x: half, y: T.size, z: half } } } } : FRESH_BODY),
    fx: n.kind === 'molotov' ? { script: RAG } : null,
    behavior: 'scripts/nade.js', state: { kind: n.kind, vel, ownerId: ctx.self.id, fuseAt: n.fuseAt } })
  ctx.emit('playSound', { clip: '/cdn/moodboard-realistic-gritty/sfx-throw-whoosh-arm-swing.mp3', position: eye, volume: 0.6 })
  s.notice = { text: `${T.name} · ${s[T.key]} left`, at: now }
}
export function nadeArmDown(ctx) { if (!walkOf(ctx).nade) ctx.self.anim.nade = null }
export function nadeVmGone(ctx, p) { if (p?.id) ctx.destroy(p.id) }
// a blast or a fire patch you made reports who it reached: each lands as your hit (XP, loot, ragdoll); some of it can be you
export const ears = {
  blast(ctx, b) {
    const s = ctx.self.state
    if (b.self) s.hp = Math.max(0, (s.hp ?? 1) - b.self)
    for (const h of b.hits ?? []) {
      const m = ctx.getObject(h.id); if (!m || m.state?.dead) continue
      const eq = s.equipped; s.equipped = 'fists' // a grenade kill is the grenade's, never the gun in your hand (no vaporize)
      try { hitTarget(ctx, s, m, h.d, { x: h.dir.x, z: h.dir.z }, true, h.heavy) } finally { s.equipped = eq }
    }
  },
}
