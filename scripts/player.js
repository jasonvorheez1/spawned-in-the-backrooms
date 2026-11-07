// The wanderer: walk/sprint on stamina, sanity that the halls eat, a flashlight on battery,
// almond water, swings at smilers, xp and levels. Every number lives in lib/data/level0.yml.
// player.state is the player's save: their level, xp and almonds follow them between visits.
import PLAYER from './lib/data/player.yml'
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
import { raycast } from 'builtin/physics'
import { dropLoot } from './lib/loot.js'
import { zoneAt, cellAt, cellCenter, N, HALF, EXIT } from './lib/maze.js'

const SND = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`
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
  if (input.pressed.attack) swing(ctx)
  if (input.pressed.drink) drink(ctx)
  if (input.pressed.cycleWeapon) cycleWeapon(ctx)
  if (input.pressed.flashlight) toggleLight(ctx)
}

function hitTarget(ctx, s, m, dmg, f, loud = true) {
  m.state.hp -= dmg
  const hit = { x: m.feetPosition.x, y: m.feetPosition.y + 1.5, z: m.feetPosition.z }
  if (loud) sound(ctx, 'heavy-pipe-hit-flesh-thud', 0.95)
  ctx.emit('damageNumber', { position: hit, value: dmg, color: '#f7d98b' })
  ctx.emit('fx', { position: hit, script: ICHOR })
  ctx.emit('squash', { target: m.id, axis: 'y', intensity: 0.25, duration: 0.18 })
  ctx.emit('flash', { target: m.id, color: '#ffffff', duration: 0.1 })
  ctx.emit('hitstop', { duration: 0.06 }, { audience: { player: ctx.self.id } })
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.3 }, { audience: { player: ctx.self.id } })
  if (m.state.hp <= 0 && !m.state.dead) {
    m.state.dead = true
    s.kills += 1
    gain(ctx, m.state?.kind === 'lurker' ? L.xpLurker : L.xpKill)
    dropLoot(ctx, m.feetPosition)
  }
}

function swing(ctx) {
  const w = walkOf(ctx), s = ctx.self.state, now = ctx.now()
  if (now < (w.nextSwing ?? 0) || (s.downAt && now - s.downAt < 1200)) return
  const wp = weaponOf(s)
  if ((w.stamina ?? s.stamina) < wp.stamina) return
  const ammoKey = wp.ammoType ?? 'ammo'
  if (wp.ranged) {
    if ((s[ammoKey] ?? 0) <= 0) { w.nextSwing = now + 400; sound(ctx, 'flashlight-switch-click', 0.6, true); return }
    s[ammoKey] -= 1
    sound(ctx, wp.pellets ? 'shotgun-blast-boom' : 'pistol-gunshot-echo', 0.95)
    ctx.emit('screenFlash', { color: '#fff1c8', duration: 0.08, intensity: wp.pellets ? 0.45 : 0.25 }, { audience: { player: ctx.self.id } })
    if (wp.pellets) ctx.emit('screenShake', { intensity: 0.35, duration: 0.2 }, { audience: { player: ctx.self.id } })
  }
  w.stamina = (w.stamina ?? s.stamina) - wp.stamina
  w.nextSwing = now + wp.cooldown * 1000
  s.swingAt = now
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  const cone = wp.cone ?? (wp.ranged ? 0.985 : 0.4), radius = wp.ranged ? wp.range : wp.reach + 0.6
  const found = []
  for (const m of [...ctx.query({ tags: ['smiler'], radius }), ...ctx.query({ tags: ['lurker'], radius })]) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.3 && (dx * f.x + dz * f.z) / d < cone) continue
    if (wp.ranged) {
      const o = { x: p.x, y: p.y + 1.3, z: p.z }, tx = m.feetPosition.x - o.x, ty = m.feetPosition.y + 1.5 - o.y, tz = m.feetPosition.z - o.z, tl = Math.hypot(tx, ty, tz) || 1
      if (raycast(ctx, o, { x: tx / tl, y: ty / tl, z: tz / tl }, { distance: tl, physicsOnly: true, ignoreEntities: [m.id, ctx.self.id], bodies: 'static' })) continue
    }
    found.push({ m, d })
  }
  if (!found.length) { if (!wp.ranged) sound(ctx, 'pipe-whoosh-swing', 0.55); return }
  const base = wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale
  if (wp.pellets) {
    // a spread of pellets: everything in the cone is hit, hard up close and weak at range
    for (const { m, d } of found) hitTarget(ctx, s, m, Math.max(1, Math.round(base * Math.max(0.2, 1 - d / wp.range))), f, false)
    return
  }
  found.sort((x, y) => x.d - y.d)
  hitTarget(ctx, s, found[0].m, Math.round(base), f)
}

function cycleWeapon(ctx) {
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
      ? { feetPosition: { x: 0, y: kind === 'pistol' ? 0.03 : 0.0, z: -0.0 + (kind === 'pistol' ? -0.03 : 0.0) }, rotation: Q_GUN, castShadow: false, primitive: { kind: 'scripted', script: 'scripts/weapon-geo.js', params: { kind } }, audience: 'local' }
      : { feetPosition: { x: 0, y: -g, z: 0 }, rotation: Q_MELEE, castShadow: false, primitive: { kind: 'scripted', script: 'scripts/weapon-geo.js', params: { kind } }, audience: 'local' }]
    w.vm = ctx.spawn({ feetPosition: { attach: 'camera', x: 0.2, y: -0.2, depth: 0.42 }, audience: 'local', scope: 'session', castShadow: false, visibleInFirstPerson: true,
      primitive: { kind: 'scripted', script: 'scripts/viewmodel-geo.js' }, children: child })
    w.vmKind = kind
  }
  const vm = ctx.getObject ? ctx.getObject(w.vm) : null
  if (!vm) return
  const now = ctx.now(), wp = W[kind] ?? {}, gun = !!wp.ranged
  const t = (now - (s.swingAt ?? -1e9)) / 1000, eq = Math.min(1, (now - (s.equipAt ?? -1e9)) / 350)
  const bobT = now / 1000 * (sprinting ? 11 : 7.5), amp = moving ? (sprinting ? 0.022 : 0.012) : 0.003
  let pitch = gun ? 0 : -22, yaw = 0, roll = 0, dz = 0, dx = 0, dy = 0
  if (gun) { const k = Math.max(0, 1 - t / 0.18); pitch += 9 * k; dz += 0.05 * k }
  else if (t < 0.4) { const a = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.28); pitch -= 70 * a; yaw += 25 * a; roll -= 20 * a; dx -= 0.1 * a; dy -= 0.04 * a }
  dy -= (1 - eq) * 0.3
  const key = Math.round(pitch) + '|' + Math.round(yaw) + '|' + Math.round(roll) + '|' + Math.round((dx + Math.sin(bobT) * amp) * 400) + '|' + Math.round((dy - Math.abs(Math.cos(bobT)) * amp + dz) * 400)
  if (key === w.vmKey) return
  w.vmKey = key
  vm.rotation = { yaw, pitch, roll }
  vm.feetPosition = { attach: 'camera', x: 0.2 + dx + Math.sin(bobT) * amp, y: -0.2 + dy - Math.abs(Math.cos(bobT)) * amp, depth: 0.42 + dz }
}

export function update(ctx, dt) {
  ensure(ctx)
  if (ctx.self.parent) return
  const w = walkOf(ctx), s = ctx.self.state
  w.stamina ??= s.stamina; w.battery ??= s.battery
  const dir = w.dir ?? { x: 0, z: 0 }, moving = dir.x !== 0 || dir.z !== 0
  const sprinting = w.sprint && moving && w.stamina > 1
  w.stamina = Math.max(0, Math.min(L.stamina, w.stamina + (sprinting ? -L.staminaDrain : L.staminaRegen * (w.ledge ? L.ledgeRest.stamina : 1)) * dt))
  const fp = ctx.self.feetPosition, inArch = zoneAt(fp.x, fp.z) === 'arches'
  w.wet = inArch && fp.y < 0.3; w.ledge = inArch && fp.y > 0.45 && ctx.self.grounded
  const speed = (sprinting ? L.sprintSpeed : L.walkSpeed) * (w.wet ? L.wetCarpetSpeed : 1)
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
  const zone = zoneAt(p.x, p.z)
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
  if (zone !== 'hub') {
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
  if (zone !== 'hub') {
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
  // exploring: every new cell is xp
  const { cx, cz } = cellAt(p.x, p.z)
  if (cx >= 0 && cz >= 0 && cx < N && cz < N) {
    const vis = (w.visited ??= decode(s.visited ?? '')), i = cz * N + cx
    if (!vis[i]) { vis[i] = 1; s.visited = encode(vis); s.explored = (s.explored ?? 0) + 1; gain(ctx, L.xpPerCell) }
  }
  // ammo boxes on the floor
  for (const a of ctx.query({ tags: ['ammo'], radius: 1.5 })) {
    if ((s.ammo ?? 0) >= W.ammo.max) break
    ctx.destroy(a.id)
    s.ammo = Math.min(W.ammo.max, (s.ammo ?? 0) + W.ammo.perPickup)
    s.pickedAt = now
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
  }
  // shotgun shells on the floor
  for (const a of ctx.query({ tags: ['shells'], radius: 1.5 })) {
    if ((s.shells ?? 0) >= W.shells.max) break
    ctx.destroy(a.id)
    s.shells = Math.min(W.shells.max, (s.shells ?? 0) + W.shells.perPickup)
    s.pickedAt = now
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
  }
  // almond water on the floor
  for (const a of ctx.query({ tags: ['almond'], radius: 1.5 })) {
    if (s.almonds >= L.almondMax) break
    ctx.destroy(a.id)
    s.almonds += 1
    gain(ctx, L.xpAlmond)
    s.pickedAt = now
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.75, true)
  }
  // weapons on the floor: new ones are kept; the best one you can wield is equipped
  for (const g of ctx.query({ tags: ['weapon'], radius: 1.5 })) {
    const k = g.state?.kind
    if (!W[k] || owned(s).includes(k)) continue
    ctx.destroy(g.id)
    s.weapons = [...owned(s).slice(1), k].join(',')
    if (usable(s, k) && W[k].damage > weaponOf(s).damage) s.equipped = k
    s.pickedAt = now; s.gotWeapon = W[k].name
    gain(ctx, W[k].xp ?? L.xpAlmond)
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
  }
  // the flickering wall: the way out
  const ex = cellCenter(EXIT.cx, EXIT.cz)
  if (p.x < -HALF + 1.3 && Math.abs(p.z - ex.z) < 1.8) {
    s.escapes += 1; s.exitAt = now
    gain(ctx, L.xpExit)
    sound(ctx, 'static-burst-glitch', 0.95, true)
    ctx.emit('screenFlash', { color: '#fff6c8', duration: 0.6, intensity: 0.8 }, { audience: { player: ctx.self.id } })
    ctx.self.feetPosition = { x: (ctx.random() - 0.5) * 6, y: 0.1, z: (ctx.random() - 0.5) * 6 }
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
