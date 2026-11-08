// Spamton in his arena (places/spamton). Real time: he circles the stage throwing money at you, and every few attacks
// he stops to talk. After enough talks a SPARE button lights up (scripts/spamton-arena-ui.js): spare him and he becomes your
// key item. Shoot him down instead and he pays you his last [[Change]] and nothing else. Fall, and he laughs you back to the alley.
// Your bullets and swings hit him through scripts/player.js (tag 'spamboss'), stepping state.hp down.
// The HUD reads ctx.place.state.spam, written here when it changes. Shelly's Spamton sounds play here (his fight) and nowhere else.
import { animate } from 'builtin/tween'
import { eulerFromRotation } from 'builtin/vec3'
import F from './lib/data/spamton.yml'
const A = F.arena

// his clips (art/spamton/rig.py): the rig lane maps these names to what the engine resolves
const CLIPS = { idle: "idle", talk: "talk", laugh: "laugh", throw: "throw", vacuum: "vacuum", charge: "charge", hurt: "hurt", defeated: "defeated", spared: "spared" }
const ONCE = { throw: 0.6, hurt: 0.4, defeated: 1.5 }
function play(ctx, name) {
  const m = mem(ctx)
  if (m.clip === name) return
  m.clip = name
  ctx.self.anim.body = { clip: CLIPS[name], loop: !ONCE[name], blend: 0.12 }
  if (ONCE[name] && name !== 'defeated') m.clipUntil = ctx.now() + ONCE[name] * 1000
  else m.clipUntil = 0
}
// a marionette's body on top of whatever clip plays: a tilt he snaps to and holds, a sway on the strings
function puppet(ctx, f, wild = 1) {
  const m = mem(ctx), now = ctx.now(), t = now / 1000
  ctx.self.rotation = { lookAt: { x: f.x, y: ctx.self.feetPosition.y, z: f.z } }
  const e = eulerFromRotation(ctx.self.rotation)
  if (now > (m.jerkAt ?? 0)) { m.jerkAt = now + 350 + ctx.random() * 700; m.jerkRoll = (ctx.random() * 2 - 1) * 14 * wild; m.jerkPitch = (ctx.random() * 2 - 1) * 6 * wild }
  m.roll = (m.roll ?? 0) + ((m.jerkRoll ?? 0) - (m.roll ?? 0)) * 0.45
  m.pitch = (m.pitch ?? 0) + ((m.jerkPitch ?? 0) - (m.pitch ?? 0)) * 0.45
  ctx.self.rotation = { yaw: e.yaw + Math.sin(t * 5.3) * 4 * wild, pitch: m.pitch + Math.sin(t * 2.1) * 2, roll: m.roll + Math.sin(t * 3.2) * 5 * wild }
}

const SND = {
  start: '/cdn/spamton-battle-start-glitch-303uhnhm.mp3',
  laugh: '/cdn/snd-spamton-laugh-glitch-sfx-7vvbohql.mp3',
  talkA: '/cdn/sfx-text-spam-digital-notifications-ww36wbyd.mp3',
  talkB: '/cdn/sfx-text-spam-digital-notifications-7z90nlb1.mp3',
  hurt: '/cdn/snd-hurt-character-damage-impact-2kswi6jp.mp3',
  chime: '/cdn/sfx-item-pickup-chime-reward-23p9yuvs.mp3',
  boost: '/cdn/sfx-boost-acceleration-mechanic-t08k7kvv.mp3',
  crit: '/cdn/sfx-critical-swing-heavy-strike-6ce7iylw.mp3',
  heavy: '/cdn/sfx-heavy-swing-weapon-whoosh-c829zq2g.mp3',
  small: '/cdn/sfx-small-swing-whoosh-fast-hkdsujvu.mp3',
}
const THEME = { talk: '/cdn/music-toby-fox-spamton-chiptune-boss-hkhzdgie.mp3', battle: '/cdn/music-nows-your-chance-to-be-a-3djhwuqa.mp3' }

const BILL = { primitive: { kind: 'box', width: 0.46, height: 0.03, depth: 0.22 }, material: { color: 'oklch(0.72 0.16 145)', emissive: 'oklch(0.6 0.2 145)', emissiveIntensity: 0.9, roughness: 0.6 }, castShadow: false }
const COIN = { primitive: { kind: 'cylinder', radiusTop: 0.32, radiusBottom: 0.32, height: 0.08, radialSegments: 20 }, material: { color: 'oklch(0.85 0.17 90)', emissive: 'oklch(0.7 0.18 85)', emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.25 }, castShadow: false }
const WARN = { primitive: { kind: 'cylinder', radiusTop: 1.5, radiusBottom: 1.5, height: 0.02, radialSegments: 32 }, material: { color: 'oklch(0.7 0.27 345)', emissive: 'oklch(0.7 0.27 345)', emissiveIntensity: 2.5, transparent: true, opacity: 0.55 }, castShadow: false }

const CASH_BURST = `fx
pop bills burst=26..36 life=.8..1.4 v=sdir()*(3..6)+up(2..4) size=.2..0.32 acc=grav()*.5+drag(1.2) col=<.45,1.1,.5> a=1>.7:1>0 rot=spin(6) floor=stick r=sprite(chip,alpha)
pop shine burst=10 life=.3..0.5 v=sdir()*(1..2.5) size=.15..0.3 col=hdr(3,2.6,.6) a=1>0 r=sprite(mote,add)`
const COIN_HIT = `fx
pop sparks burst=18..26 life=.3..0.6 v=up(2..4)+sdir()*(2..4) size=.04..0.08 acc=grav() col=hdr(4,3.2,.8) a=1>0 r=sprite(ember,add,velocity,.03)
pop dust burst=5 on=disc(.6) life=.5..0.8 v=up(.4..0.9)+sdir()*.6 size=.4..0.7 acc=drag(1.5) col=<.9,.4,.8> a=0>.35:.4>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`
const VACUUM = `fx
pop signs rate=40 on=arc(6,6.283,2) life=.6..0.9 v=<0,0,0> size=.25..0.4 acc=attract(40)+drag(1) col=hdr(.6,3,.8) a=0>.2:1>.8:1>0 r=sprite(mote,add)`
const CHARGE = `fx
pop glow rate=60 on=sphere(1.6) life=.3..0.5 size=.15..0.3 acc=attract(25)+drag(1) col=hdr(4,1,3) a=0>.3:1>0 r=sprite(mote,add)`

const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length)]
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)

function mem(ctx) {
  return (ctx.self.session.b ??= { proj: [], next: 0, atkI: 0, atkSince: 0, step: 0, phase: 'intro', phaseAt: ctx.now(), ang: Math.PI, lastHp: null, hurtAt: 0, writeAt: 0, vacT: 0 })
}
function target(ctx) { return ctx.place.players[0] ?? null }
function sound(ctx, k, volume = 0.7) { ctx.emit('playSound', { clip: SND[k], position: ctx.self.feetPosition, volume, refDistance: 30, maxDistance: 80 }) }
function hud(ctx, patch) {
  const cur = ctx.place.state.spam ?? {}
  ctx.place.state.spam = { ...cur, ...patch }
}
function say(ctx, line, extra = {}) { hud(ctx, { line, lineAt: ctx.now(), ...extra }); sound(ctx, ctx.random() < 0.5 ? 'talkA' : 'talkB', 0.55) }
function music(ctx, which) { const a = ctx.self.audio; if (a?.clip === THEME[which]) return; ctx.self.audio = { clip: THEME[which], loop: true, gain: 0.38, spatial: false, bus: 'Music' } }

export function onSpawn(ctx) {
  const st = ctx.self.state
  st.hp = A.hp; st.max = A.hp; st.talks = 0; st.req = null; st.startedAt = ctx.now()
  ctx.self.session.b = null
  const m = mem(ctx)
  m.lastHp = A.hp
  ctx.place.state.spam = { hp: A.hp, max: A.hp, phase: 'intro', talks: 0, need: A.spareAfter, line: "HEY HEY HEY!! WELCOME TO MY [[Showroom]]!! NOW'S YOUR CHANCE TO BE A [[BIG SHOT]]!!", lineAt: ctx.now() }
  music(ctx, 'battle')
  sound(ctx, 'start', 0.9)
  ctx.emit('screenFlash', { color: '#ff2bd0', duration: 0.5, intensity: 0.6 })
  ctx.self.feetPosition = { x: 0, y: 6, z: -9 }
  animate(ctx, ctx.self, { 'feetPosition.y': 0.4 }, { duration: 1.2, easing: 'easeOutBounce' })
}

function clearProj(ctx) {
  const m = mem(ctx)
  for (const p of m.proj) if (p.id) ctx.destroy(p.id)
  m.proj = []
}
// a thing he throws: a straight line from p0 at v (m/s) for life seconds; its body is tweened once and its hits are worked out here
function throwBill(ctx, from, dir, speed, dmg) {
  const life = 3.2, to = { x: from.x + dir.x * speed * life, y: from.y + dir.y * speed * life, z: from.z + dir.z * speed * life }
  const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI
  const id = ctx.spawn({ ...BILL, feetPosition: from, rotation: { yaw, roll: 0 }, lifetime: life, audience: 'all' })
  const o = ctx.getObject(id)
  if (o) { animate(ctx, o, { 'feetPosition.x': to.x, 'feetPosition.y': to.y, 'feetPosition.z': to.z }, { duration: life, easing: 'linear' }); animate(ctx, o, { 'rotation.roll': 1440 }, { duration: life, easing: 'linear' }) }
  mem(ctx).proj.push({ id, kind: 'bill', p0: from, v: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed }, t0: ctx.now(), life, dmg })
}
function dropCoin(ctx, at) {
  const fall = 1.1, top = 14
  const w = ctx.spawn({ ...WARN, feetPosition: { x: at.x, y: 0.02, z: at.z }, lifetime: fall + 0.1, audience: 'all' })
  const wo = ctx.getObject(w); if (wo) animate(ctx, wo, { scale: [0.3, 1] }, { duration: fall, easing: 'easeOutQuad' })
  const id = ctx.spawn({ ...COIN, feetPosition: { x: at.x, y: top, z: at.z }, rotation: { roll: 90 }, lifetime: fall + 0.6, audience: 'all' })
  const o = ctx.getObject(id)
  if (o) { animate(ctx, o, { 'feetPosition.y': 0.05 }, { duration: fall, easing: 'easeInQuad' }); animate(ctx, o, { 'rotation.yaw': 900 }, { duration: fall, easing: 'linear' }) }
  mem(ctx).proj.push({ id, kind: 'coin', at, t0: ctx.now(), life: fall, dmg: A.coinDmg })
}

function hurtPlayer(ctx, pl, dmg, pos) {
  const m = mem(ctx), now = ctx.now()
  if (now - m.hurtAt < A.iframes * 1000) return
  if (pl.state.downAt && now - pl.state.downAt < 3000) return
  m.hurtAt = now
  pl.state.hp -= dmg
  const chest = { x: pl.feetPosition.x, y: pl.feetPosition.y + 1.3, z: pl.feetPosition.z }
  ctx.emit('damageNumber', { position: chest, value: dmg, color: '#ff4fd8' })
  ctx.emit('playSound', { clip: SND.hurt, volume: 0.7 }, { audience: { player: pl.id } })
  ctx.emit('screenShake', { intensity: 0.22, duration: 0.18 }, { audience: { player: pl.id } })
  ctx.emit('screenFlash', { color: '#ff2bd0', duration: 0.2, intensity: 0.25 }, { audience: { player: pl.id } })
  ctx.emit('fx', { position: pos ?? chest, script: CASH_BURST })
  if (ctx.random() < 0.35) hud(ctx, { taunt: pick(ctx, F.hitTaunts), tauntAt: now })
}

function stepProj(ctx, pl) {
  const m = mem(ctx), now = ctx.now(), keep = []
  for (const p of m.proj) {
    const t = (now - p.t0) / 1000
    if (p.kind === 'bill') {
      if (t > p.life) continue
      if (pl) {
        const pos = { x: p.p0.x + p.v.x * t, y: p.p0.y + p.v.y * t, z: p.p0.z + p.v.z * t }
        const f = pl.feetPosition, dy = pos.y - f.y
        if (dist2(pos, f) < 0.62 && dy > -0.1 && dy < 1.9) { hurtPlayer(ctx, pl, p.dmg, pos); ctx.destroy(p.id); continue }
      }
      keep.push(p)
    } else if (p.kind === 'coin') {
      if (t >= p.life) {
        ctx.emit('fx', { position: { x: p.at.x, y: 0.1, z: p.at.z }, script: COIN_HIT })
        ctx.emit('playSound', { clip: SND.crit, position: { x: p.at.x, y: 0.2, z: p.at.z }, volume: 0.45, refDistance: 6, maxDistance: 40 })
        if (pl && dist2(pl.feetPosition, p.at) < 1.5 && pl.feetPosition.y < 1.2) hurtPlayer(ctx, pl, p.dmg, { x: p.at.x, y: 0.5, z: p.at.z })
        continue
      }
      keep.push(p)
    }
  }
  m.proj = keep
}

// ---- attacks: each one a short script of volleys on the clock; begin() sets it up, step() runs while it lasts
const hand = (ctx) => { const f = ctx.self.feetPosition; return { x: f.x, y: f.y + 2.1, z: f.z } }
function aimAt(from, pl, lead = 0.35) {
  const v = pl.velocity ?? { x: 0, z: 0 }, f = pl.feetPosition
  const to = { x: f.x + (v.x ?? 0) * lead, y: f.y + 1.1, z: f.z + (v.z ?? 0) * lead }
  const d = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }, l = Math.hypot(d.x, d.y, d.z) || 1
  return { x: d.x / l, y: d.y / l, z: d.z / l }
}
const turn = (d, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return { x: d.x * c - d.z * s, y: d.y, z: d.x * s + d.z * c } }
const ATK = {
  bills: { len: 4.2, step(ctx, pl, t, m) { // three fanned volleys of five bills, led at where you're running
    for (let k = 0; k < 3; k++) if (t >= 0.5 + k * 0.9 && m.step === k) {
      m.step++
      const from = hand(ctx), d = aimAt(from, pl)
      for (let i = -2; i <= 2; i++) throwBill(ctx, from, turn(d, i * 9 + (k === 1 ? 4.5 : 0)), 15, A.billDmg)
      sound(ctx, 'small', 0.7); play(ctx, 'throw')
      if (k === 0) hud(ctx, { taunt: pick(ctx, A.throwTaunts), tauntAt: ctx.now() })
    } } },
  rain: { len: 4.0, step(ctx, pl, t, m) { // coins from the dark: one on you, five around you, twice
    for (let k = 0; k < 2; k++) if (t >= 0.3 + k * 1.6 && m.step === k) {
      m.step++
      const f = pl.feetPosition
      dropCoin(ctx, { x: f.x, z: f.z })
      for (let i = 0; i < 5; i++) { const a = ctx.random() * 6.283, r = 2.2 + ctx.random() * 4; dropCoin(ctx, { x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r }) }
      sound(ctx, 'heavy', 0.6); play(ctx, 'laugh')
      if (k === 0) hud(ctx, { taunt: 'MAKE IT [[RAIN]]!!', tauntAt: ctx.now() })
    } } },
  vacuum: { len: 4.0, begin(ctx) { ctx.self.fx = { script: VACUUM }; sound(ctx, 'boost', 0.9); hud(ctx, { taunt: 'COME TO [[DADDY]]... I MEAN [[DEALS]]!!', tauntAt: ctx.now() }) },
    step(ctx, pl, t, m, dt) { // his mouth opens and the money pulls you in; stand in his reach and he eats your health
      const f = pl.feetPosition, b = ctx.self.feetPosition, dx = b.x - f.x, dz = b.z - f.z, d = Math.hypot(dx, dz) || 1
      const pull = t < 3.4 ? 1500 : 0
      pl.forces.spamVac = pull ? { force: { x: dx / d * pull, y: 0, z: dz / d * pull } } : null
      m.vacT += dt
      if (d < 3.2 && m.vacT > 0.5) { m.vacT = 0; hurtPlayer(ctx, pl, A.vacuumDmg, { x: b.x, y: 1.6, z: b.z }) }
    },
    end(ctx, pl) { ctx.self.fx = null; if (pl) pl.forces.spamVac = null } },
  bigshot: { len: 4.4, begin(ctx) { ctx.self.fx = { script: CHARGE }; hud(ctx, { taunt: '[[BIG SHOT]]!!!', tauntAt: ctx.now() }) },
    step(ctx, pl, t, m) { // he charges, then a full ring of bills bursts out with one gap; run for the gap, then again
      for (let k = 0; k < 2; k++) if (t >= 0.9 + k * 1.5 && m.step === k) {
        m.step++
        if (k === 0) ctx.self.fx = null
        const from = { ...hand(ctx), y: ctx.self.feetPosition.y + 1.3 }, n = 22, gap = Math.floor(ctx.random() * n)
        for (let i = 0; i < n; i++) { if (Math.abs(i - gap) <= 1 || Math.abs(i - gap) === n - 1) continue; const a = (i / n) * 6.283 + k * 0.14; throwBill(ctx, from, { x: Math.sin(a), y: -0.04, z: Math.cos(a) }, 11, A.shotDmg) }
        sound(ctx, 'crit', 0.85); play(ctx, 'throw')
        ctx.emit('shockwave', { position: from, speed: 10, thickness: 0.4, intensity: 0.5 })
      } },
    end(ctx) { ctx.self.fx = null } },
}

function setPhase(ctx, phase) { const m = mem(ctx); m.phase = phase; m.phaseAt = ctx.now(); hud(ctx, { phase }) }

function startTalk(ctx, pl) {
  const st = ctx.self.state, m = mem(ctx)
  clearProj(ctx); ctx.self.fx = null; if (pl) pl.forces.spamVac = null
  st.talks = (st.talks ?? 0) + 1
  setPhase(ctx, 'talk')
  music(ctx, 'talk')
  const line = A.talks[Math.min(st.talks - 1, A.talks.length - 1)]
  say(ctx, line, { talks: st.talks, spareOk: st.talks >= A.spareAfter, taunt: null })
  animate(ctx, ctx.self, { 'feetPosition.y': 0.02 }, { duration: 0.5, easing: 'easeOutQuad' })
}
function backToFight(ctx, line) {
  const m = mem(ctx)
  setPhase(ctx, 'fight')
  music(ctx, 'battle')
  m.next = ctx.now() + 900
  if (line) say(ctx, line)
  else hud(ctx, { line: null })
}

function finish(ctx, how, pl) {
  const m = mem(ctx), now = ctx.now()
  clearProj(ctx); ctx.self.fx = null; if (pl) pl.forces.spamVac = null
  setPhase(ctx, how)
  hud(ctx, { over: true, taunt: null })
  play(ctx, how === 'spared' ? 'spared' : how === 'killed' ? 'defeated' : 'laugh')
  if (how === 'spared') {
    say(ctx, A.spareLine)
    sound(ctx, 'laugh', 0.8); sound(ctx, 'chime', 0.9)
    if (pl) {
      pl.state.keyItems = [...new Set([...(pl.state.keyItems ?? []), 'spamton'])]
      pl.state.notice = { text: 'KEY ITEM: [[SPAMTON G. SPAMTON]]. 0 kg. Loot pays more now.', at: now }
      ctx.emit('milestone', { step: 1, name: 'Spared Spamton' }, { audience: { player: pl.id } })
      const f = pl.feetPosition
      animate(ctx, ctx.self, { scale: 0.08, 'feetPosition.x': f.x, 'feetPosition.y': f.y + 1, 'feetPosition.z': f.z }, { duration: 1.6, easing: 'easeInBack', delay: 1.6 })
    }
    music(ctx, 'talk')
    ctx.after(5, 'sendBack', {})
  } else if (how === 'killed') {
    say(ctx, A.killLine)
    sound(ctx, 'crit', 1)
    ctx.emit('slowMo', { scale: 0.35, duration: 1.2 })
    ctx.emit('screenFlash', { color: '#ffffff', duration: 0.4, intensity: 0.8 })
    ctx.emit('fx', { position: { ...ctx.self.feetPosition, y: ctx.self.feetPosition.y + 1.5 }, script: CASH_BURST })
    animate(ctx, ctx.self, { 'rotation.roll': 90, 'feetPosition.y': 0 }, { duration: 1.4, easing: 'easeInQuad', delay: 0.3 })
    if (pl) { pl.state.cents = (pl.state.cents ?? 0) + Math.round(A.killCash * 100); pl.state.notice = { text: `Spamton's last payment: $${A.killCash}. No deal, no pocket pal.`, at: now } }
    ctx.self.audio = null
    ctx.after(5, 'sendBack', {})
  } else if (how === 'won') {
    say(ctx, A.winLine)
    sound(ctx, 'laugh', 1)
    if (pl) pl.state.notice = { text: 'Spamton laughs you out of his showroom. Knock on the dumpster again when you are ready.', at: now }
    ctx.after(3.5, 'sendBack', {})
  }
}
export function sendBack(ctx) {
  for (const pl of ctx.place.players) { pl.forces.spamVac = null; ctx.cross(pl, 'level11#spam-return') }
}

export function update(ctx, dt) {
  const st = ctx.self.state, m = mem(ctx), now = ctx.now(), pl = target(ctx)
  if (!pl) { ctx.sleep(0.5); return }
  if (['spared', 'killed', 'won', 'left'].includes(m.phase)) { ctx.sleep(0.25); return }
  stepProj(ctx, pl)
  // what the player asked (scripts/spamton-fight.js writes state.req)
  const req = st.req
  if (req && req.at !== m.reqAt) {
    m.reqAt = req.at
    if (req.k === 'leave') { setPhase(ctx, 'left'); clearProj(ctx); ctx.self.fx = null; pl.forces.spamVac = null; pl.state.notice = { text: 'You back out of the showroom. The dumpster giggles.', at: now }; sound(ctx, 'laugh', 0.6); sendBack(ctx); return }
    if (req.k === 'spare' && m.phase === 'talk' && (st.talks ?? 0) >= A.spareAfter) { finish(ctx, 'spared', pl); return }
    if (req.k === 'fight' && m.phase === 'talk') backToFight(ctx, pick(ctx, ["THEN LET'S [[DANCE]]!!", 'BACK TO [[BUSINESS]]!!']))
  }
  // his health: hits land in state.hp from the striker's machine
  const hp = st.hp ?? A.hp
  if (hp !== m.lastHp) {
    const dropped = hp < (m.lastHp ?? hp)
    m.lastHp = hp
    if (hp <= 0) { hud(ctx, { hp: 0 }); finish(ctx, 'killed', pl); return }
    if (now - m.writeAt > 150) { m.writeAt = now; hud(ctx, { hp: Math.max(0, Math.round(hp)) }) } else m.dirty = true
    if (dropped && m.phase === 'talk' && now - m.phaseAt > 400) backToFight(ctx, pick(ctx, A.interrupt))
    if (dropped && m.phase === 'fight' && !m.atk && now - (m.flinchAt ?? 0) > 900) { m.flinchAt = now; play(ctx, 'hurt'); ctx.emit('squash', { target: ctx.self.id, axis: 'z', intensity: 0.12, duration: 0.15 }) }
    if (dropped && ctx.random() < 0.08) sound(ctx, 'laugh', 0.5)
  } else if (m.dirty && now - m.writeAt > 150) { m.dirty = false; m.writeAt = now; hud(ctx, { hp: Math.max(0, Math.round(hp)) }) }
  // you fell: he wins this one
  if (pl.state.downAt && pl.state.downAt > (st.startedAt ?? 0)) { finish(ctx, 'won', pl); return }

  const b = ctx.self.feetPosition, t = now / 1000, f = pl.feetPosition
  if (m.clipUntil && now > m.clipUntil) { m.clipUntil = 0; m.clip = null }
  if (m.phase === 'intro') {
    puppet(ctx, f, 1.3); if (!m.clipUntil) play(ctx, 'laugh')
    if (now - m.phaseAt > 2600) { backToFight(ctx); hud(ctx, { line: null }) }
    return
  }
  if (m.phase === 'talk') {
    puppet(ctx, f, 0.6); if (!m.clipUntil) play(ctx, 'talk')
    if (now - m.phaseAt > A.talkSeconds * 1000) backToFight(ctx, pick(ctx, ["TIME'S UP!! [[ACT NOW]]!!", 'NO ANSWER?? NO [[PROBLEM]]!!']))
    return
  }
  // fighting: he circles the stage on his strings, bobbing, always facing you
  const atkName = A.attacks[m.atkI % A.attacks.length], atk = ATK[atkName]
  const still = m.atk === 'vacuum' || (m.atk === 'bigshot' && now - m.atkSince < 1000)
  if (!still) m.ang += dt * (0.32 + (1 - hp / A.hp) * 0.25)
  const r = A.orbit, x = Math.sin(m.ang) * r, z = Math.cos(m.ang) * r
  ctx.self.feetPosition = { x, y: 0.5 + Math.sin(t * 2.4) * 0.35, z }
  puppet(ctx, f, 1)
  if (!m.clipUntil) play(ctx, m.atk === 'vacuum' ? 'vacuum' : m.atk === 'bigshot' && now - m.atkSince < 1000 ? 'charge' : 'idle')

  if (!m.atk && now >= m.next) {
    // every few attacks, he stops to talk
    if (m.done >= A.talkEvery) { m.done = 0; startTalk(ctx, pl); return }
    m.atk = atkName; m.atkSince = now; m.step = 0; m.vacT = 0
    hud(ctx, { atk: atkName })
    atk.begin?.(ctx, pl)
  }
  if (m.atk) {
    const a = ATK[m.atk], tt = (now - m.atkSince) / 1000
    a.step(ctx, pl, tt, m, dt)
    if (tt >= a.len) { a.end?.(ctx, pl); m.atk = null; m.atkI++; m.done = (m.done ?? 0) + 1; m.next = now + Math.max(500, 1200 - (1 - hp / A.hp) * 600) }
  }
}
