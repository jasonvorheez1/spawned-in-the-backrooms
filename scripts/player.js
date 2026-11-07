// The wanderer: walk/sprint on stamina, sanity that the halls eat, a flashlight on battery,
// almond water, swings at smilers, xp and levels. Every number lives in lib/data/level0.yml.
// player.state is the player's save: their level, xp and almonds follow them between visits.
import PLAYER from './lib/data/player.yml'
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
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
    sound(ctx, 'eerie-low-chime-level-up', 0.8, true)
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
  }
  if (input.pressed.attack) swing(ctx)
  if (input.pressed.drink) drink(ctx)
  if (input.pressed.cycleWeapon) cycleWeapon(ctx)
  if (input.pressed.flashlight) toggleLight(ctx)
}

function swing(ctx) {
  const w = walkOf(ctx), s = ctx.self.state, now = ctx.now()
  if (now < (w.nextSwing ?? 0) || (s.downAt && now - s.downAt < 1200)) return
  const wp = weaponOf(s)
  if ((w.stamina ?? s.stamina) < wp.stamina) return
  w.stamina = (w.stamina ?? s.stamina) - wp.stamina
  w.nextSwing = now + wp.cooldown * 1000
  s.swingAt = now
  const p = ctx.self.feetPosition, f = w.fwd ?? { x: 0, z: -1 }
  let best = null, bd = 1e9
  for (const m of ctx.query({ tags: ['smiler'], radius: wp.reach + 0.6 })) {
    if (m.state?.dead) continue
    const dx = m.feetPosition.x - p.x, dz = m.feetPosition.z - p.z, d = Math.hypot(dx, dz)
    if (d > 0.3 && (dx * f.x + dz * f.z) / d < 0.4) continue
    if (d < bd) { bd = d; best = m }
  }
  if (!best) { sound(ctx, 'pipe-whoosh-swing', 0.5); return }
  const dmg = Math.round(wp.damage + (s.level - 1) * L.perLevel.damage * wp.levelScale)
  best.state.hp -= dmg
  const hit = { x: best.feetPosition.x, y: best.feetPosition.y + 1.5, z: best.feetPosition.z }
  sound(ctx, 'heavy-pipe-hit-flesh-thud', 0.9)
  ctx.emit('damageNumber', { position: hit, value: dmg, color: '#f7d98b' })
  ctx.emit('fx', { position: hit, script: ICHOR })
  ctx.emit('squash', { target: best.id, axis: 'y', intensity: 0.25, duration: 0.18 })
  ctx.emit('flash', { target: best.id, color: '#ffffff', duration: 0.1 })
  ctx.emit('hitstop', { duration: 0.06 }, { audience: { player: ctx.self.id } })
  ctx.emit('cameraPunch', { direction: { x: f.x, y: 0, z: f.z }, intensity: 0.3 }, { audience: { player: ctx.self.id } })
  if (best.state.hp <= 0 && !best.state.dead) {
    best.state.dead = true
    s.kills += 1
    gain(ctx, L.xpKill)
  }
}

function cycleWeapon(ctx) {
  const s = ctx.self.state, list = W.order.filter((k) => owned(s).includes(k) && usable(s, k))
  s.equipped = list[(list.indexOf(s.equipped) + 1) % list.length] ?? 'fists'
  s.equipAt = ctx.now()
  sound(ctx, 'flashlight-switch-click', 0.4, true)
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
  sound(ctx, 'gulping-water-from-plastic-bottle', 0.7)
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
  sound(ctx, 'flashlight-switch-click', 0.5, true)
}

export function update(ctx, dt) {
  ensure(ctx)
  if (ctx.self.parent) return
  const w = walkOf(ctx), s = ctx.self.state
  w.stamina ??= s.stamina; w.battery ??= s.battery
  const dir = w.dir ?? { x: 0, z: 0 }, moving = dir.x !== 0 || dir.z !== 0
  const sprinting = w.sprint && moving && w.stamina > 1
  w.stamina = Math.max(0, Math.min(L.stamina, w.stamina + (sprinting ? -L.staminaDrain : L.staminaRegen) * dt))
  const speed = sprinting ? L.sprintSpeed : L.walkSpeed
  const intent = { x: dir.x * speed, z: dir.z * speed }
  const v = ctx.self.velocity
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && moving)
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * dt
  const dx = intent.x - v.x, dz = intent.z - v.z, gap = Math.hypot(dx, dz), k = gap > step ? step / gap : 1
  ctx.self.velocity = { x: v.x + dx * k, y: v.y + ctx.place.gravity.y * dt, z: v.z + dz * k }
  w.acc = (w.acc ?? 0) + dt
  if (w.acc >= 0.25) { tickStats(ctx, w.acc); w.acc = 0 }
}

function tickStats(ctx, t) {
  const s = ctx.self.state, w = walkOf(ctx), p = ctx.self.feetPosition, now = ctx.now()
  const mh = maxHp(s.level), ms = maxSan(s.level)
  const zone = zoneAt(p.x, p.z)
  if (zone !== s.zone) s.zone = zone
  // sanity: the halls eat it, the dark eats it faster, the safe room gives it back
  let drain = L.sanityDrain[zone] ?? 0.12
  if (w.light && (zone === 'dark' || zone === 'red')) drain *= 0.4
  s.sanity -= drain * t
  if (s.sanity > ms) s.sanity = ms
  if (s.sanity < 0) s.sanity = 0
  if (s.sanity <= 0) s.hp -= L.insanityHurt * t
  if (zone === 'hub') { s.hp = Math.min(mh, s.hp + 3 * t); w.battery = Math.min(L.battery, w.battery + 15 * t) }
  if (s.hp > mh) s.hp = mh
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
  // almond water on the floor
  for (const a of ctx.query({ tags: ['almond'], radius: 1.5 })) {
    if (s.almonds >= L.almondMax) break
    ctx.destroy(a.id)
    s.almonds += 1
    gain(ctx, L.xpAlmond)
    s.pickedAt = now
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
  }
  // weapons on the floor: new ones are kept; the best one you can wield is equipped
  for (const g of ctx.query({ tags: ['weapon'], radius: 1.5 })) {
    const k = g.state?.kind
    if (!W[k] || owned(s).includes(k)) continue
    ctx.destroy(g.id)
    s.weapons = [...owned(s).slice(1), k].join(',')
    if (usable(s, k) && W[k].damage > weaponOf(s).damage) s.equipped = k
    s.pickedAt = now; s.gotWeapon = W[k].name
    gain(ctx, L.xpAlmond)
    sound(ctx, 'plastic-bottle-pickup-rattle', 0.7, true)
  }
  // the flickering wall: the way out
  const ex = cellCenter(EXIT.cx, EXIT.cz)
  if (p.x < -HALF + 1.3 && Math.abs(p.z - ex.z) < 1.8) {
    s.escapes += 1; s.exitAt = now
    gain(ctx, L.xpExit)
    sound(ctx, 'static-burst-glitch', 0.9, true)
    ctx.emit('screenFlash', { color: '#fff6c8', duration: 0.6, intensity: 0.8 }, { audience: { player: ctx.self.id } })
    ctx.self.feetPosition = { x: (ctx.random() - 0.5) * 6, y: 0.1, z: (ctx.random() - 0.5) * 6 }
    return
  }
  // taken
  if (s.hp <= 0) {
    s.deaths += 1; s.downAt = now
    s.hp = mh; s.sanity = Math.round(ms * 0.6)
    sound(ctx, 'static-burst-glitch', 0.9, true)
    ctx.emit('screenFlash', { color: '#000000', duration: 0.8, intensity: 1 }, { audience: { player: ctx.self.id } })
    ctx.self.feetPosition = { x: (ctx.random() - 0.5) * 6, y: 0.1, z: (ctx.random() - 0.5) * 6 }
  }
}
