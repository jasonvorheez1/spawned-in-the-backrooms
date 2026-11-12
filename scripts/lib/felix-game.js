// Fix-It Felix Jr., the player's side: stepped on the player's own machine, drawn by scripts/lib/felix-ui.js
// from ctx.session.ffv (the frame) and player.state.arcade (the phase, written only when it changes).
// A/D slide between windows, W/S hop floors, Space swings the hammer, E leaves.
import T from './data/felix.yml'
const S = '/cdn/value.'
const SFX = { // Shelly's Fix-It Felix Jr. sound pack (FELIX-01..25)
  step: S + '2a553c59df88e3c02eb9407c856dd7c875d6cc727290fee86e71f1d8f63fe5cb.mp3',
  jump: S + '759c22005d382c7c5cdd42656a07aee84ffc90230724d8b19884db7c1b9a2d5f.mp3',
  hammer: S + '739db7eb2928f4e2b709ff845171d43f96042b19813205558fac763bb2bbaa8e.mp3',
  fixed: S + '7e9942e0a3860522600029c39624d6666279fa0d6e49a687c4b7e91bd83c85a2.mp3',
  smash: S + 'dff7445bdef28c0debe0a93b5f5f225791a0d891b8c161afc6ca1558e0bb3457.mp3',
  ralph: S + 'b067025eb0d2e6ee2c0a13f88d9931bd374a7188c0c8d5719bc1b473654cbbd9.mp3',
  duck: S + '3ff8306e93548aaa632f2f3a21821f26936431dde24f280d60ba5301f74b6957.mp3',
  pie: S + '7b031c73f908fb2b4091e7ee63be6f642e4acc1b05a559be42a6c33330b03240.mp3',
  pieIn: S + 'e16b48d9db26ebf0397df7cf2d998851acc5b048a951e1c0e92fda8d6e832adb.mp3',
  die: S + '82a920425b24d6f7b255fb305486eb0d0bc72cc388e2bba90079e9d1f6eddd07.mp3',
  intro: S + '2e42b488a45509ca0370cbac12a00f1878b5aebcb5b89df4b2fabb7f249db750.mp3',
  clear: S + 'c909e8ad6acd3c106039810df4dd6b9c88c6faa45ec89951d2e69357e39f0999.mp3',
  roof: S + '5381261d37228919f607ba9d00c669271c6ac6504066d796751bbc030e3f7798.mp3',
  over: S + '06310605ada570f6d3a089159716c35626ce44c29c09c2887063a76b60f884e1.mp3',
  coin: 'cdn/sfx-arcade-coin-drop-clink-into-cabinet-slot.mp3',
}
const play = (ctx, k, volume = 0.5) => ctx.emit('playSound', { clip: SFX[k], volume, bus: 'Arcade' })
const byRound = (arr, r) => arr[Math.min(arr.length - 1, r - 1)]
// screen geometry in game pixels (the UI draws the same numbers)
export const GEO = { W: 320, H: 400, colX: (c) => 52 + c * 54, feet: (r) => 352 - r * 84, roof: 352 - 3 * 84 }
const C = T.cols, R = T.rows

function layScreen(ctx, m) {
  m.w = new Array(C * R).fill(0)
  const n = byRound(T.brokenPerScreen, m.round)
  const door = m.screen === 0 ? 2 : -1 // the front door on the ground floor
  let tries = 0
  for (let k = 0; k < n && tries < 200; tries++) { const i = Math.floor(ctx.random() * C * R); if (i === door || m.w[i]) continue; m.w[i] = 1 + Math.floor(ctx.random() * 2); k++ }
  m.door = door
  m.beds = new Set(); m.shut = new Set()
  if (m.round >= T.bedsFromRound) for (let k = 0; k < byRound(T.bedsPerScreen, m.round); k++) m.beds.add(`${Math.floor(ctx.random() * C)},${Math.floor(ctx.random() * (R - 1))}`) // blocks r <-> r+1
  if (m.round >= T.shuttersFromRound) for (let k = 0; k < byRound(T.shuttersPerScreen, m.round); k++) m.shut.add(`${Math.floor(ctx.random() * (C - 1))},${Math.floor(ctx.random() * R)}`) // blocks c <-> c+1
  m.bricks = []; m.ducks = []; m.pie = null; m.lastFix = ctx.now(); m.nextDuck = ctx.now() + byRound(T.duckEveryMs, m.round)
  m.ra = { x: GEO.colX(2), tx: GEO.colX(2), mode: 'pause', until: ctx.now() + 1200, dir: 1, drops: [] }
  placeFelix(m)
}
function placeFelix(m) { m.f = { c: 2, r: 0, x: GEO.colX(2), y: GEO.feet(0), dir: 1, mv: null, ham: 0 } }

function setPhase(ctx, s, m, ph) { m.ph = ph; m.phAt = ctx.now(); s.arcade = { ...s.arcade, phase: ph, at: s.arcade?.at ?? ctx.now() }; m.dirty = true }

export function felixNew(ctx, s) {
  const m = ctx.self.session.ff = { round: 1, screen: 0, lives: T.lives, score: 0, dirty: true }
  layScreen(ctx, m); setPhase(ctx, s, m, 'intro'); play(ctx, 'intro', 0.55)
  return m
}

export function felixInput(ctx, input) {
  const k = ctx.self.session.fk ??= {}
  k.x = input.axes?.moveX ?? 0; k.z = input.axes?.moveZ ?? 0
  if (input.pressed?.jump) k.ham = true
}

function die(ctx, s, m) {
  if (ctx.now() < (m.inv ?? 0) || m.ph !== 'play') return
  play(ctx, 'die', 0.6); setPhase(ctx, s, m, 'dead')
}

function step(ctx, s, m, dt) {
  const now = ctx.now(), f = m.f, k = ctx.self.session.fk ??= {}
  // Felix moving
  if (f.mv) {
    const t = Math.min(1, (now - f.mv.t0) / f.mv.dur)
    f.x = f.mv.x0 + (f.mv.x1 - f.mv.x0) * t
    f.y = f.mv.y0 + (f.mv.y1 - f.mv.y0) * t - (f.mv.hop ? Math.sin(t * Math.PI) * 26 : 0)
    if (t >= 1) { f.mv = null; f.x = GEO.colX(f.c); f.y = GEO.feet(f.r) }
    m.dirty = true
  } else if (now >= f.ham) {
    const dx = k.x > 0.5 ? 1 : k.x < -0.5 ? -1 : 0, dz = k.z > 0.5 ? 1 : k.z < -0.5 ? -1 : 0
    if (k.ham) {
      k.ham = false
      const i = f.r * C + f.c
      f.ham = now + (now < (m.inv ?? 0) ? T.hammerMs / 2 : T.hammerMs); m.dirty = true
      play(ctx, 'hammer', 0.45)
      if (m.w[i] > 0) {
        m.w[i] = Math.max(0, m.w[i] - (now < (m.inv ?? 0) ? 2 : 1)); m.score += T.fixScore; m.lastFix = now
        if (m.w[i] === 0) { m.score += T.windowBonus; play(ctx, 'fixed', 0.5) }
      }
    } else if (dz) {
      const nr = f.r + dz, gate = `${f.c},${Math.min(f.r, nr)}`
      if (nr >= 0 && nr < R && !m.beds.has(gate)) { f.mv = { t0: now, dur: T.jumpMs, x0: f.x, y0: f.y, x1: f.x, y1: GEO.feet(nr), hop: true }; f.r = nr; play(ctx, 'jump', 0.4) }
    } else if (dx) {
      const nc = f.c + dx, gate = `${Math.min(f.c, nc)},${f.r}`
      f.dir = dx
      if (nc >= 0 && nc < C && !m.shut.has(gate)) { f.mv = { t0: now, dur: T.stepMs, x0: f.x, y0: f.y, x1: GEO.colX(nc), y1: f.y }; f.c = nc; play(ctx, 'step', 0.25) }
    }
  }
  // pie: a Nicelander leaves one when Felix dawdles
  if (!m.pie && now - m.lastFix > T.pieIdleMs) {
    const open = []; for (let i = 0; i < C * R; i++) if (!m.w[i] && i !== m.door) open.push(i)
    if (open.length) { const i = open[Math.floor(ctx.random() * open.length)]; m.pie = { c: i % C, r: Math.floor(i / C), until: now + T.pieStayMs }; play(ctx, 'pieIn', 0.4); m.dirty = true }
    m.lastFix = now
  }
  if (m.pie) {
    if (!f.mv && f.c === m.pie.c && f.r === m.pie.r) { m.inv = now + T.pieTimeMs; m.score += 500; m.pie = null; play(ctx, 'pie', 0.55); m.dirty = true }
    else if (now > m.pie.until) { m.pie = null; m.dirty = true }
  }
  // Ralph on the roof line
  const ra = m.ra, rs = T.ralphSpeed + T.ralphSpeedPerRound * (m.round - 1)
  if (ra.mode === 'walk') {
    const d = ra.tx - ra.x; ra.dir = Math.sign(d) || ra.dir
    if (Math.abs(d) <= rs * dt) { ra.x = ra.tx; ra.mode = 'smash'; ra.until = now + 900; ra.drops = [now + 250, now + 600].slice(0, 2); play(ctx, 'ralph', 0.45) }
    else ra.x += Math.sign(d) * rs * dt
    m.dirty = true
  } else if (ra.mode === 'smash') {
    while (ra.drops.length && now >= ra.drops[0]) {
      ra.drops.shift(); play(ctx, 'smash', 0.4)
      const n = byRound(T.bricksPerSmash, m.round)
      for (let b = 0; b < n; b++) m.bricks.push({ x: ra.x + (b - (n - 1) / 2) * 22 + (ctx.random() - 0.5) * 8, y: GEO.roof + 6 })
      const top = (R - 1) * C + Math.round((ra.x - GEO.colX(0)) / 54)
      if (top >= (R - 1) * C && top < R * C && !m.w[top] && ctx.random() < byRound(T.rebreakChance, m.round)) m.w[top] = 1
    }
    if (now >= ra.until) { ra.mode = 'pause'; ra.until = now + T.ralphPauseMs }
    m.dirty = true
  } else if (now >= ra.until) {
    let c = Math.floor(ctx.random() * C); if (ctx.random() < 0.45) c = f.c // he likes to stand over Felix
    ra.tx = GEO.colX(c); ra.mode = 'walk'
  }
  // bricks
  const bs = T.brickSpeed + T.brickSpeedPerRound * (m.round - 1)
  for (const b of m.bricks) {
    b.y += bs * dt
    if (Math.abs(b.x - f.x) < 15 && b.y > f.y - 62 && b.y < f.y - 4) die(ctx, s, m)
  }
  if (m.bricks.length) { m.bricks = m.bricks.filter((b) => b.y < GEO.H + 10); m.dirty = true }
  // ducks
  if (m.round >= T.duckFromRound && now >= m.nextDuck) {
    m.nextDuck = now + byRound(T.duckEveryMs, m.round)
    const dir = ctx.random() < 0.5 ? 1 : -1
    m.ducks.push({ r: Math.floor(ctx.random() * R), x: dir > 0 ? -24 : GEO.W + 24, dir }); play(ctx, 'duck', 0.35)
  }
  for (const d of m.ducks) {
    d.x += d.dir * (T.duckSpeed + 8 * m.round) * dt
    if (Math.abs(d.x - f.x) < 18 && Math.abs((GEO.feet(d.r) - 46) - (f.y - 40)) < 26) die(ctx, s, m)
  }
  if (m.ducks.length) { m.ducks = m.ducks.filter((d) => d.x > -40 && d.x < GEO.W + 40); m.dirty = true }
  // every window whole: Ralph climbs
  if (m.ph === 'play' && m.w.every((v) => v === 0)) { m.score += T.screenBonus; play(ctx, 'clear', 0.55); setPhase(ctx, s, m, 'clear') }
}

export function felixUpdate(ctx, dt) {
  const s = ctx.self.state, a = s.arcade, now = ctx.now()
  const k = ctx.self.session.fk ??= {}
  let m = ctx.self.session.ff
  if (a.phase === 'attract' || !m) {
    if (k.ham) { k.ham = false; play(ctx, 'coin', 0.6); m = felixNew(ctx, s) } else { ctx.session.ffv = null; return }
  }
  const age = now - m.phAt
  if (m.ph === 'intro' && age > T.introMs) setPhase(ctx, s, m, 'play')
  else if (m.ph === 'play') step(ctx, s, m, Math.min(dt, 0.05))
  else if (m.ph === 'dead' && age > T.deadMs) {
    m.lives--; m.bricks = []; m.ducks = []
    if (m.lives <= 0) { play(ctx, 'over', 0.55); if (m.score > (s.felixBest ?? 0)) s.felixBest = m.score; setPhase(ctx, s, m, 'over') }
    else { placeFelix(m); m.inv = now + 1500; setPhase(ctx, s, m, 'play') }
  } else if (m.ph === 'clear' && age > T.clearMs) {
    m.screen++
    if (m.screen >= T.screens) { m.score += T.roofBonus; play(ctx, 'roof', 0.55); setPhase(ctx, s, m, 'roof') }
    else { layScreen(ctx, m); setPhase(ctx, s, m, 'play') }
  } else if (m.ph === 'roof' && age > T.roofMs) { m.round++; m.screen = 0; layScreen(ctx, m); setPhase(ctx, s, m, 'intro'); play(ctx, 'intro', 0.5) }
  else if (m.ph === 'over' && k.ham && age > 1200) { k.ham = false; play(ctx, 'coin', 0.6); m = felixNew(ctx, s) }
  if (m.ph !== 'play') { k.ham = false; m.dirty = true }
  if (!m.dirty) return
  m.dirty = false
  const f = m.f
  ctx.session.ffv = { // the frame, this machine only
    ph: m.ph, age: now - m.phAt, round: m.round, screen: m.screen, lives: m.lives, score: m.score, best: Math.max(s.felixBest ?? 0, m.score),
    w: m.w.join(''), door: m.door, beds: [...m.beds], shut: [...m.shut],
    f: [Math.round(f.x), Math.round(f.y), f.dir, f.mv ? (f.mv.hop ? 'jump' : 'walk') : now < f.ham ? 'ham' : 'idle'],
    inv: now < (m.inv ?? 0), ra: [Math.round(m.ra.x), m.ra.mode, m.ra.dir],
    b: m.bricks.map((b) => [Math.round(b.x), Math.round(b.y)]), d: m.ducks.map((d) => [Math.round(d.x), d.r, d.dir]), pie: m.pie ? [m.pie.c, m.pie.r] : null, t: now,
  }
}
