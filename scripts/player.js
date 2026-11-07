// The wanderer: walk/sprint on stamina, sanity that the halls eat, a flashlight on battery,
// almond water, swings at smilers, xp and levels. Every number lives in lib/data/level0.yml.
// player.state is the player's save: their level, xp and almonds follow them between visits.
import PLAYER from './lib/data/player.yml'
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
import { raycast } from 'builtin/physics'
import { dropLoot, spawnWeapon } from './lib/loot.js'
import { weaponBody } from './lib/weapon-look.js'
import { zoneAt, cellAt, cellCenter, N, HALF, EXIT } from './lib/maze.js'
import { zoneAt as zoneAt1 } from './lib/level1.js'
import L1 from './lib/data/level1.yml'
const zoneHere = (ctx, x, z) => ctx.self.place === 'level1' ? 'l1_' + zoneAt1(x, z) : zoneAt(x, z)

import SOUNDS from './lib/data/sounds.yml'
const sndTurn = {}
const SND = (n) => { const takes = SOUNDS[n]; if (!takes?.length) return `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`; sndTurn[n] = ((sndTurn[n] ?? -1) + 1 + (takes.length > 2 ? Math.floor(takes.length / 2) : 0)) % takes.length; return takes[sndTurn[n]] }
const ICHOR = `fx
pop ichor burst=18..26 life=.5..0.9 v=sdir()*(1.5..3.2)+up(1) size=.04..0.09 acc=grav()*.8+drag(1.2) col=<.04,.03,.05> a=1>.6:1>0 sz=$size floor=stick r=sprite(soft-disc,alpha)
pop smoke burst=4..6 life=.6..1 v=sdir()*(.3..0.7) size=.25..0.4 acc=buoy(.4)+drag(1.5) col=<.06,.05,.07> a=0>.15:.5>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`

export const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
export const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity
export const xpNeed = (lv) => L.xpBase * lv

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',') : [])]
const usable = (s, k) => W[k] && s.level >= W[k].minLevel
export const weaponOf = (s) => W[s.equipped] ?? W.fists

function walkOf(ctx) { return (ctx.self.session['player.js'] ??= {}) }

function ensure(ctx) {
  const s = ctx.self.state
  if (s.level == null) Object.assign(s, { level: 1, xp: 0, hp: L.hp, sanity: L.sanity, stamina: L.stamina, battery: L.battery, almonds: 2, visited: '', kills: 0, escapes: 0, deaths: 0, weapons: '', equipped: 'fists' })
}

function decode(hex) { const v = new Uint8Array(N * N); for (let i = 0; i < hex.length; i++) { const n = parseInt(hex[i], 16); for (let b = 0; b < 4; b++) if (n & (1 << b)) v[i * 4 + b] = 1 } return v }
function encode(v) { let s = ''; for (let i = 0; i < v.length; i += 4) s += (v[i] | (v[i + 1] << 1) | (v[i + 2] << 2) | (v[i + 3] << 3)).toString(16); return s }

function chest(ctx) { const p = ctx.self.feetPosition; return { x: p.x, y: p.y + 1.3, z: p.z } }
function sound(ctx, name, volume = 0.7, mine = false) {
  ctx.emit('playSound', { clip: SND(name), position: chest(ctx), volume, maxDistance: 30 }, mine ? { audience: { player: ctx.self.id } } : undefined)
}

function gain(ctx, n) {
  const s = ctx.self.state
  s.xp += n
  while (s.xp >= xpNeed(s.level)) {
    s.xp -= xpNeed(s.level); s.level += 1
    s.hp = maxHp(s.level); s.sanity = maxSan(s.level); s.leveledAt = ctx.now()
    sound(ctx, 'eerie-low-chime-level-up', 0.85, true)
    ctx.emit('milestone', { step: s.level, name: `level ${s.level}` }, { audience: { player: ctx.self.id } })
  }
}

// Apply one looted item (a token from scripts/lib/items.js) to the player. Returns { ok } or { ok: false, msg }.
// Nothing is picked up by walking over it: scripts/interact.js calls this when you press E on what you are looking at.
export function takeToken(ctx, token) {
  const s = ctx.self.state, now = ctx.now()
  if (token === 'almond') {
    s.almonds = (s.almonds ?? 0) + 1; gain(ctx, L.xpAlmond); s.pickedAt = now
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.75, true)
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
  if (token === 'ration' || token === 'bandage') { // eaten or wrapped on the spot
    const mh = maxHp(s.level), ms = maxSan(s.level)
    s.hp = Math.min(mh, (s.hp ?? mh) + (token === 'ration' ? L1.rationHp : L1.bandageHp))
    if (token === 'ration') s.sanity = Math.min(ms, (s.sanity ?? ms) + L1.rationSanity)
    s.pickedAt = now; gain(ctx, L.xpAlmond)
    sound(ctx, token === 'ration' ? 'plastic-bottle-pickup-rattle' : 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token === 'battery') {
    const w = walkOf(ctx); w.battery = Math.min(100, (w.battery ?? s.battery ?? 0) + L1.batteryCharge); s.battery = Math.round(w.battery)
    s.pickedAt = now; sound(ctx, 'pickup-ammo', 0.7, true)
    return { ok: true }
  }
  if (token.startsWith('weapon:')) {
    const k = token.slice(7)
    if (!W[k]) return { ok: false, msg: '' }
    if (owned(s).includes(k)) return { ok: false, msg: `You already have a ${W[k].name.toLowerCase()}` }
    s.weapons = [...owned(s).slice(1), k].join(',')
    if (W[k].magSize) s['loaded_' + k] = W[k].magSize
    if (usable(s, k) && W[k].damage > weaponOf(s).damage) s.equipped = k
    s.pickedAt = now; s.gotWeapon = W[k].name
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
  w.sprint = !!input.held.sprint
  if (input.pressed.jump && ctx.self.grounded && !ctx.self.parent) {
    const v = ctx.self.velocity
    ctx.self.velocity = { x: v.x, y: PLAYER.jumpSpeed, z: v.z }
    sound(ctx, 'footstep-damp-carpet-squelch-soft', 0.4, true)
  }
  {
    // melee: hold to wind up, release to swing (a heavy past power.min); a gun fires on the press
    const sv = ctx.self.state, aw = weaponOf(sv), P = W.power
    if (sv.invOpen || sv.lootOpen) { if (sv.chargeAt) sv.chargeAt = 0 } // a click on a menu is no swing
    else if (aw.ranged) { if (sv.chargeAt) sv.chargeAt = 0; if (input.pressed.attack) swing(ctx) }
    else {
      if (input.pressed.attack && !sv.chargeAt && ctx.now() >= (walkOf(ctx).nextSwing ?? 0)) { sv.chargeAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.3, true) }
      if (input.released.attack && sv.chargeAt) {
        const t = Math.min(1, (ctx.now() - sv.chargeAt) / (P.charge * 1000)); sv.chargeAt = 0
        swing(ctx, t >= P.min ? t : 0)
      }
    }
  }
  if (input.pressed.inventory) { const sv = ctx.self.state; sv.invOpen = !sv.invOpen && !sv.lootOpen; sound(ctx, 'flashlight-switch-click', 0.35, true) }
  if (input.pressed.inv && input.actionData?.inv) invAction(ctx, input.actionData.inv)
  if (input.pressed.drink) drink(ctx)
  if (input.pressed.cycleWeapon) cycleWeapon(ctx)
  if (input.pressed.reload) startReload(ctx)
  {
    // aiming down the sights: a ranged weapon, button held, not mid-reload, not downed
    const sv = ctx.self.state, aw = W[sv.equipped]
    const ads = !!(input.held.aim && aw?.ranged && !sv.reloading && !(sv.downAt && ctx.now() - sv.downAt < 1200))
    if (!!sv.ads !== ads) { sv.ads = ads; sound(ctx, 'gun-raise-cloth-rustle', 0.25, true) }
  }
  if (input.pressed.flashlight) toggleLight(ctx)
}

function hitTarget(ctx, s, m, dmg, f, loud = true, heavy = 0) {
  m.state.hp -= dmg
  const hit = { x: m.feetPosition.x, y: m.feetPosition.y + 1.5, z: m.feetPosition.z }
  if (loud) sound(ctx, 'heavy-pipe-hit-flesh-thud', 0.95)
  ctx.emit('damageNumber', { position: hit, value: dmg, color: '#f7d98b' })
  ctx.emit('fx', { position: hit, script: ICHOR })
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
    s.kills += 1
    gain(ctx, m.state?.kind === 'lurker' ? L.xpLurker : L.xpKill)
    dropLoot(ctx, m.feetPosition, m.state?.kind === 'lurker' ? 'Lurker remains' : 'Smiler remains')
  }
}

function swing(ctx, power = 0) {
  const w = walkOf(ctx), s = ctx.self.state, now = ctx.now(), P = W.power
  if (now < (w.nextSwing ?? 0) || (s.downAt && now - s.downAt < 1200)) return
  const wp = weaponOf(s)
  if (wp.ranged) power = 0
  if (power && (w.stamina ?? s.stamina) < wp.stamina * P.stamina) power = 0 // too tired to put weight behind it: a light swing
  if ((w.stamina ?? s.stamina) < wp.stamina) return
  const heavyMul = power ? 1 + power * (P.damage - 1) : 1
  const ammoKey = wp.ammoType ?? 'ammo', loadedKey = 'loaded_' + s.equipped
  if (wp.ranged) {
    if (s.reloading) {
      // a shotgun can be fired mid-reload (the reload stops); a magazine gun has to finish
      if (wp.pellets && (s[loadedKey] ?? 0) > 0) cancelReload(ctx)
      else return
    }
    if ((s[loadedKey] ?? 0) <= 0) {
      w.nextSwing = now + 350
      if ((s[ammoKey] ?? 0) > 0) startReload(ctx)
      else { sound(ctx, 'gun-dry-fire-click', 0.6, true); s.dryAt = now }
      return
    }
    s[loadedKey] -= 1
    sound(ctx, wp.pellets ? 'shotgun-blast-boom' : 'pistol-gunshot-echo', 0.95)
    ctx.emit('screenFlash', { color: '#fff1c8', duration: 0.08, intensity: wp.pellets ? 0.45 : 0.25 }, { audience: { player: ctx.self.id } })
    if (wp.pellets) {
      ctx.emit('screenShake', { intensity: 0.35, duration: 0.2 }, { audience: { player: ctx.self.id } })
      ctx.after(0.55, 'pumpRack', {})
    }
  }
  w.stamina = (w.stamina ?? s.stamina) - wp.stamina * (power ? P.stamina : 1)
  w.nextSwing = now + wp.cooldown * 1000 * (power ? P.cooldown : 1)
  s.swingHeavy = Math.round(power * 100) / 100
  s.swingAt = now
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  const cone = (s.ads && wp.adsCone) || wp.cone || (wp.ranged ? 0.985 : 0.4), radius = wp.ranged ? wp.range : wp.reach + 0.6 + power * P.reach
  const found = []
  for (const m of [...ctx.query({ tags: ['smiler'], radius }), ...ctx.query({ tags: ['lurker'], radius }), ...ctx.query({ tags: ['hound'], radius }), ...ctx.query({ tags: ['stealer'], radius })]) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.3 && (dx * f.x + dz * f.z) / d < cone) continue
    if (wp.ranged) {
      const o = { x: p.x, y: p.y + 1.3, z: p.z }, tx = m.feetPosition.x - o.x, ty = m.feetPosition.y + 1.5 - o.y, tz = m.feetPosition.z - o.z, tl = Math.hypot(tx, ty, tz) || 1
      if (raycast(ctx, o, { x: tx / tl, y: ty / tl, z: tz / tl }, { distance: tl, physicsOnly: true, ignoreEntities: [m.id, ctx.self.id], bodies: 'static' })) continue
    }
    found.push({ m, d })
  }
  if (!wp.ranged) sound(ctx, 'pipe-whoosh-swing', power ? 0.9 : 0.55)
  if (!found.length) return
  const base = (wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale) * heavyMul
  if (wp.pellets) {
    // a spread of pellets: everything in the cone is hit, hard up close and weak at range
    for (const { m, d } of found) hitTarget(ctx, s, m, Math.max(1, Math.round(base * Math.max(0.2, 1 - d / wp.range))), f, false)
    return
  }
  found.sort((x, y) => x.d - y.d)
  hitTarget(ctx, s, found[0].m, Math.round(base), f, true, power)
  if (power) { const m = found[0].m, d = found[0].d || 1; ctx.emit('impulse', { target: m.id, impulse: { x: f.x * 260 * power, y: 60 * power, z: f.z * 260 * power } }) } // a heavy shoves them back
}

// ---- reloading: a magazine gun swaps its magazine; a shotgun loads one shell at a time and can be fired mid-reload.
// player.state.loaded_<weapon> is the rounds in the gun; the ammo / shells counts are the reserve.
const reloadLive = (ctx, p) => { const s = ctx.self.state; return s.reloading === p.k && s.equipped === p.k && walkOf(ctx).reloadTok === p.tok }

function startReload(ctx) {
  const s = ctx.self.state, wp = weaponOf(s), k = s.equipped, w = walkOf(ctx)
  if (!wp.ranged || !wp.magSize || s.reloading || s.lootOpen) return
  if ((s['loaded_' + k] ?? 0) >= wp.magSize || (s[wp.ammoType ?? 'ammo'] ?? 0) <= 0) return
  w.reloadTok = (w.reloadTok ?? 0) + 1
  s.reloading = k; s.ads = false
  if (wp.pellets) ctx.after(wp.reloadStart ?? 0.4, 'reloadStep', { k, tok: w.reloadTok })
  else {
    sound(ctx, 'pistol-magazine-eject-click', 0.6, true)
    ctx.after(wp.reloadTime * 0.55, 'reloadMagIn', { k, tok: w.reloadTok })
    ctx.after(wp.reloadTime, 'reloadDone', { k, tok: w.reloadTok })
  }
}

function cancelReload(ctx) {
  walkOf(ctx).reloadTok = (walkOf(ctx).reloadTok ?? 0) + 1
  ctx.self.state.reloading = ''
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

// the inventory's buttons (scripts/loot-ui.js): equip a weapon, drink almond water, drop a weapon at your feet, close
function invAction(ctx, d) {
  const s = ctx.self.state
  if (d.k === 'close') { s.invOpen = false; return }
  if (d.k === 'drink') { drink(ctx); return }
  const k = String(d.w || '')
  if (d.k === 'equip' && owned(s).includes(k) && usable(s, k) && s.equipped !== k) {
    cancelReload(ctx); s.ads = false; s.equipped = k; s.equipAt = ctx.now(); sound(ctx, 'gun-raise-cloth-rustle', 0.45, true); return
  }
  if (d.k === 'drop' && k !== 'fists' && owned(s).includes(k)) {
    if (s.equipped === k) { cancelReload(ctx); s.ads = false; s.equipped = 'fists'; s.equipAt = ctx.now() }
    s.weapons = owned(s).slice(1).filter((w) => w !== k).join(',')
    const f = ctx.self.feetPosition, fw = walkOf(ctx).fwd ?? { x: 0, z: -1 }
    spawnWeapon(ctx, { x: f.x + fw.x * 0.9, z: f.z + fw.z * 0.9 }, k)
    sound(ctx, 'pickup-weapon', 0.5, true)
  }
}

function cycleWeapon(ctx) {
  cancelReload(ctx)
  ctx.self.state.ads = false
  const s = ctx.self.state, list = W.order.filter((k) => owned(s).includes(k) && usable(s, k))
  s.equipped = list[(list.indexOf(s.equipped) + 1) % list.length] ?? 'fists'
  s.equipAt = ctx.now()
  sound(ctx, 'flashlight-switch-click', 0.5, true)
}

function drink(ctx) {
  const s = ctx.self.state
  if (s.almonds <= 0) return
  const mh = maxHp(s.level), ms = maxSan(s.level)
  if (s.hp >= mh && s.sanity >= ms) return
  s.almonds -= 1
  s.hp = Math.min(mh, s.hp + L.almondHp)
  s.sanity = Math.min(ms, s.sanity + L.almondSanity)
  s.drankAt = ctx.now()
  sound(ctx, 'gulping-water-from-plastic-bottle', 0.65)
}

function toggleLight(ctx) {
  const w = walkOf(ctx), s = ctx.self.state
  if (w.light) { ctx.destroy(w.light); w.light = null }
  else if ((w.battery ?? s.battery) > 1) {
    w.light = ctx.spawn({
      feetPosition: { attach: 'camera', x: 0.22, y: -0.25, depth: 0.1 },
      light: { kind: 'spot', color: 'oklch(0.97 0.03 90)', intensity: 10, distance: 28, angle: 26, penumbra: 0.55, aim: 'forward', shadow: { enabled: true } },
      audience: 'local', scope: 'session',
    })
  }
  s.light = !!w.light
  sound(ctx, 'flashlight-switch-click', 0.65, true)
}


// First person: the local player's own arm and held weapon, riding the camera. Only this machine sees it.
const HOLD = { // how each weapon sits in the fist: offset of its grip from its own origin (m along its length)
  fists: null, table_leg: 0.16, pipe_scrap: 0.1, crowbar: 0.12, bat: 0.12, hatchet: 0.1, fire_axe: 0.18, pistol: 0.04, shotgun: 0.14,
}
const Q_MELEE = { x: -0.5, y: 0.5, z: 0.5, w: 0.5 } // its length up, its blade forward
const Q_GUN = { x: 0, y: 1, z: 0, w: 0 } // its barrel forward
function viewmodel(ctx, moving, sprinting) {
  if (!ctx.self.isLocal) return
  const w = walkOf(ctx), s = ctx.self.state, kind = s.equipped ?? 'fists'
  if (w.vmKind !== kind || !w.vm) {
    if (w.vm) ctx.destroy(w.vm)
    const g = HOLD[kind], wp = W[kind] ?? {}, gun = !!wp.ranged
    const child = g == null ? [] : [gun
      ? { feetPosition: { x: 0, y: kind === 'pistol' ? 0.03 : -0.04, z: kind === 'pistol' ? 0.04 : 0.14 }, rotation: Q_GUN, castShadow: false, ...weaponBody(kind), audience: 'local' }
      : { feetPosition: { x: 0, y: -g, z: 0 }, rotation: Q_MELEE, castShadow: false, ...weaponBody(kind), audience: 'local' }]
    w.vm = ctx.spawn({ feetPosition: { attach: 'camera', x: 0.2, y: -0.2, depth: 0.42, fov: 55 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js', ...(wp.muzzle ? { sockets: { muzzle: wp.muzzle } } : {}) }, children: child })
    w.vmKind = kind
  }
  if (w.vm && s.vmId !== w.vm) s.vmId = w.vm // scripts/lib/vmpose.js poses it every display frame from the camera rig
}

export function update(ctx, dt) {
  ensure(ctx)
  if (ctx.self.parent) return
  const w = walkOf(ctx), s = ctx.self.state
  w.stamina ??= s.stamina; w.battery ??= s.battery
  const dir = w.dir ?? { x: 0, z: 0 }, moving = dir.x !== 0 || dir.z !== 0
  const sprinting = w.sprint && moving && w.stamina > 1 && !s.ads
  w.stamina = Math.max(0, Math.min(L.stamina, w.stamina + (sprinting ? -L.staminaDrain : L.staminaRegen * (w.ledge ? L.ledgeRest.stamina : 1)) * dt))
  const fp = ctx.self.feetPosition, inArch = zoneHere(ctx, fp.x, fp.z) === 'arches'
  w.wet = inArch && fp.y < 0.3; w.ledge = inArch && fp.y > 0.45 && ctx.self.grounded
  const speed = (sprinting ? L.sprintSpeed : L.walkSpeed) * (w.wet ? L.wetCarpetSpeed : 1) * (s.ads ? 0.55 : 1)
  const intent = { x: dir.x * speed, z: dir.z * speed }
  viewmodel(ctx, moving, sprinting)
  const v = ctx.self.velocity
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && moving)
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * dt
  const dx = intent.x - v.x, dz = intent.z - v.z, gap = Math.hypot(dx, dz), k = gap > step ? step / gap : 1
  ctx.self.velocity = { x: v.x + dx * k, y: v.y + ctx.place.gravity.y * dt, z: v.z + dz * k }

  // Footsteps on carpet: soft, muted, non-intrusive
  if (moving && ctx.self.grounded) {
    w.stepClock = (w.stepClock ?? 0) + dt
    const interval = sprinting ? 0.32 : 0.48
    if (w.stepClock >= interval) {
      w.stepClock = 0
      const clip = w.wet ? 'footstep-soaked-carpet-deep-squelch' : sprinting ? 'footstep-damp-carpet-run' : 'footstep-damp-carpet-squelch-soft'
      sound(ctx, clip, w.wet ? 0.4 : sprinting ? 0.28 : 0.2, true)
    }
  } else {
    w.stepClock = 0.22
  }

  w.acc = (w.acc ?? 0) + dt
  if (w.acc >= 0.25) { tickStats(ctx, w.acc, moving); w.acc = 0 }
}

function tickStats(ctx, t, moving) {
  const s = ctx.self.state, w = walkOf(ctx), p = ctx.self.feetPosition, now = ctx.now()
  const mh = maxHp(s.level), ms = maxSan(s.level)
  const af = w.fwd ?? { x: 0, z: -1 }, ax = Math.round(af.x * 20) / 20, az = Math.round(af.z * 20) / 20
  if (s.aimX !== ax) s.aimX = ax
  if (s.aimZ !== az) s.aimZ = az
  const zone = zoneHere(ctx, p.x, p.z)
  if (zone !== s.zone) s.zone = zone
  // sanity: the halls eat it, the dark eats it faster, the safe room gives it back
  let drain = L.sanityDrain[zone] ?? 0.12
  if (w.light && (zone === 'dark' || zone === 'red')) drain *= 0.4
  s.sanity -= drain * t
  if (w.ledge) s.sanity += L.ledgeRest.sanity * t
  const rest = !!w.ledge, wet = !!w.wet
  if (s.onLedge !== rest) s.onLedge = rest
  if (s.wet !== wet) s.wet = wet
  if (s.sanity > ms) s.sanity = ms
  if (s.sanity < 0) s.sanity = 0
  if (s.sanity <= 0) s.hp -= L.insanityHurt * t
  if (zone === 'hub') { s.hp = Math.min(mh, s.hp + 3 * t); w.battery = Math.min(L.battery, w.battery + 15 * t) }
  if (s.hp > mh) s.hp = mh

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
  if (zone !== 'hub' && ctx.self.place !== 'level1') {
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
      ctx.emit('playSound', { clip: SND(clip), position: at, volume: 0.55, refDistance: 1.5, maxDistance: 12 }, { audience: { player: ctx.self.id } })
    }
  }
  // a dark figure at the far end of the hall you face: only you see it, and it is gone in a breath
  if (zone !== 'hub' && ctx.self.place !== 'level1') {
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
  if (w.light) { w.battery -= L.batteryDrain * t; if (w.battery <= 0) { w.battery = 0; toggleLight(ctx) } }
  const st = Math.round(w.stamina), bt = Math.round(w.battery)
  if (st !== s.stamina) s.stamina = st
  if (bt !== s.battery) s.battery = bt
  // the save: where you stand, every few seconds; a fresh visit wakes you there (level, items, weapons already live in player.state)
  if (!ctx.session.wokeAt) {
    ctx.session.wokeAt = now
    const sp = s.savePos
    if (sp && s.savePlace && s.savePlace !== ctx.self.place) { ctx.cross(ctx.self, s.savePlace); return }
    if (sp && s.savePlace === ctx.self.place) { ctx.self.feetPosition = { x: sp.x, y: sp.y + 0.1, z: sp.z }; return }
  }
  if (now - (w.savedAt ?? 0) > 4000) { w.savedAt = now; s.savePos = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10 }; s.savePlace = ctx.self.place }
  // exploring: every new cell is xp
  const { cx, cz } = cellAt(p.x, p.z)
  if (cx >= 0 && cz >= 0 && cx < N && cz < N) {
    const vis = (w.visited ??= decode(s.visited ?? '')), i = cz * N + cx
    if (!vis[i]) { vis[i] = 1; s.visited = encode(vis); s.explored = (s.explored ?? 0) + 1; gain(ctx, L.xpPerCell) }
  }
  // (items are taken with E on what you look at: takeToken above, called from scripts/interact.js)
  // the flickering wall: the way out
  const ex = cellCenter(EXIT.cx, EXIT.cz)
  if (ctx.self.place === 'main' && p.x < -HALF + 1.3 && Math.abs(p.z - ex.z) < 1.8) {
    s.escapes += 1; s.exitAt = now
    gain(ctx, L.xpExit)
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#fff6c8', duration: 0.6, intensity: 0.8 }, { audience: { player: ctx.self.id } })
    ctx.cross(ctx.self, 'level1') // through the flickering wall: Level 1
    return
  }
  // taken
  if (s.hp <= 0) {
    s.deaths += 1; s.downAt = now
    s.hp = mh; s.sanity = Math.round(ms * 0.6)
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#000000', duration: 0.8, intensity: 1 }, { audience: { player: ctx.self.id } })
    const sp = ctx.place.defaultSpawnPoint ?? {}
    ctx.self.feetPosition = { x: (sp.x ?? 0) + (ctx.random() - 0.5) * 6, y: 0.1, z: (sp.z ?? 0) + (ctx.random() - 0.5) * 6 }
  }
}
