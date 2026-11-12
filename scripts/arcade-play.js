// Block Panic, the player's side: a falling-block game stepped here, drawn by scripts/arcade-ui.js from player.state.arcade.
// A/D move, W rotate, S soft drop, Space hard drop, E leaves. Space on the attract screen inserts a coin.
import { felixInput, felixUpdate } from './lib/felix-game.js'
const W = 10, H = 20
const SHAPES = { I: [[0,1],[1,1],[2,1],[3,1]], O: [[0,0],[1,0],[0,1],[1,1]], T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]] }
const SIZE = { I: 4, O: 2, T: 3, S: 3, Z: 3, J: 3, L: 3 }
const KINDS = 'IOTSZJL'
const POINTS = [0, 100, 300, 500, 800]
const SFX = {
  move: 'cdn/sfx-arcade-chiptune-tiny-blip-piece-shift.mp3',
  turn: 'cdn/sfx-arcade-chiptune-quick-rising-blip-rotate.mp3',
  land: 'cdn/sfx-arcade-chiptune-soft-thunk-block-lands.mp3',
  clear: 'cdn/sfx-arcade-chiptune-bright-sparkle-arpeggio-line-clear.mp3',
  quad: 'cdn/sfx-arcade-chiptune-triumphant-fanfare-four-line-clear.mp3',
  over: 'cdn/sfx-arcade-chiptune-descending-sad-game-over-jingle.mp3',
  coin: 'cdn/sfx-arcade-coin-drop-clink-into-cabinet-slot.mp3',
}
const play = (ctx, k, volume = 0.5) => ctx.emit('playSound', { clip: SFX[k], volume })
const cells = (p) => SHAPES[p.t].map(([x, y]) => { const n = SIZE[p.t]; for (let i = 0; i < p.r; i++) [x, y] = [n - 1 - y, x]; return [p.x + x, p.y + y] })
const fits = (g, p) => cells(p).every(([x, y]) => x >= 0 && x < W && y < H && (y < 0 || !g[y * W + x]))
const bag = (ctx, m) => { if (!m.bag.length) { m.bag = KINDS.split(''); for (let i = 6; i > 0; i--) { const j = Math.floor(ctx.random() * (i + 1)); [m.bag[i], m.bag[j]] = [m.bag[j], m.bag[i]] } } return m.bag.pop() }
const spawnPiece = (ctx, m) => { m.p = { t: m.next, r: 0, x: m.next === 'O' ? 4 : 3, y: -1 }; m.next = bag(ctx, m); if (!fits(m.g, m.p)) m.over = true }
const dropMs = (lv) => Math.max(70, 800 * Math.pow(0.82, lv))

function newRun(ctx, s) {
  const m = ctx.self.session.ap = { g: new Array(W * H).fill(''), bag: [], score: 0, lines: 0, level: 0, over: false, fall: 0, das: 0, dir: 0, dirty: true }
  m.next = bag(ctx, m); spawnPiece(ctx, m)
  s.arcade = { ...s.arcade, phase: 'play', at: ctx.now() }
}

function view(m) {
  const g = m.g.slice()
  if (m.p && !m.over) {
    let gp = { ...m.p }; while (fits(m.g, { ...gp, y: gp.y + 1 })) gp.y++
    for (const [x, y] of cells(gp)) if (y >= 0 && !g[y * W + x]) g[y * W + x] = '*'
    for (const [x, y] of cells(m.p)) if (y >= 0) g[y * W + x] = m.p.t
  }
  return g.map((c) => c || '.').join('')
}

function lock(ctx, s, m) {
  for (const [x, y] of cells(m.p)) { if (y < 0) { m.over = true; continue } m.g[y * W + x] = m.p.t }
  let n = 0
  for (let y = H - 1; y >= 0; y--) if (m.g.slice(y * W, y * W + W).every(Boolean)) { m.g.splice(y * W, W); m.g.unshift(...new Array(W).fill('')); n++; y++ }
  if (n) { m.lines += n; m.score += POINTS[n] * (m.level + 1); m.level = Math.floor(m.lines / 10); m.flash = { n, at: ctx.now() }; play(ctx, n === 4 ? 'quad' : 'clear', 0.6) } else play(ctx, 'land', 0.45)
  if (!m.over) spawnPiece(ctx, m)
  if (m.over) { play(ctx, 'over', 0.6); if (m.score > (s.arcadeBest ?? 0)) s.arcadeBest = m.score }
  m.dirty = true
}

export function onInput(ctx, input) {
  const s = ctx.self.state
  if (!s.arcade) return
  const k = ctx.self.session.ak ??= {}
  if (input.pressed?.interact && ctx.now() - (s.arcade.at ?? 0) > 400) { s.arcade = null; s.arcadeClosedAt = ctx.now(); ctx.self.session.ap = null; ctx.self.session.ff = null; ctx.session.ffv = null; return }
  if (s.arcade.game === 'felix') return felixInput(ctx, input)
  k.x = input.axes?.moveX ?? 0; k.z = input.axes?.moveZ ?? 0
  if (input.pressed?.jump) k.drop = true
}

export function update(ctx, dt) {
  const s = ctx.self.state, a = s.arcade
  if (!!a !== !!ctx.self.session.arcOn) { ctx.self.session.arcOn = !!a; ctx.self.anim.arcade = a ? { clip: 'cdn/clip-idle-loop.glb', weight: 1, loop: true } : null }
  if (!a) return
  const cab = ctx.getObject(a.id), me = ctx.self.feetPosition
  if (cab) ctx.self.rotation = { yaw: Math.atan2(-(cab.feetPosition.x - me.x), -(cab.feetPosition.z - me.z)) * 180 / Math.PI }
  const v = ctx.self.velocity; ctx.self.velocity = { x: 0, y: v.y, z: 0 }
  if (a.game === 'felix') return felixUpdate(ctx, dt)
  const k = ctx.self.session.ak ??= {}, now = ctx.now()
  let m = ctx.self.session.ap
  if (a.phase !== 'play' || !m) {
    if (k.drop) { k.drop = false; play(ctx, 'coin', 0.6); newRun(ctx, s); m = ctx.self.session.ap }
    else return
  }
  if (m.over) {
    if (a.phase === 'play') { s.arcade = { ...a, phase: 'over', view: view(m), score: m.score, lines: m.lines, level: m.level, next: m.next }; }
    if (k.drop && now - (a.at ?? 0) > 800) { k.drop = false; play(ctx, 'coin', 0.6); newRun(ctx, s) }
    return
  }
  const dir = k.x > 0.5 ? 1 : k.x < -0.5 ? -1 : 0
  if (dir !== m.dir) { m.dir = dir; m.das = dir ? now + 170 : 0; if (dir && fits(m.g, { ...m.p, x: m.p.x + dir })) { m.p.x += dir; m.dirty = true; play(ctx, 'move', 0.3) } }
  else if (dir && now >= m.das) { m.das = now + 55; if (fits(m.g, { ...m.p, x: m.p.x + dir })) { m.p.x += dir; m.dirty = true } }
  const up = k.z > 0.5
  if (up && !m.up) {
    const r = (m.p.r + 1) % 4
    for (const dx of [0, -1, 1, -2, 2]) { const t = { ...m.p, r, x: m.p.x + dx }; if (fits(m.g, t)) { m.p = t; m.dirty = true; play(ctx, 'turn', 0.35); break } }
  }
  m.up = up
  if (k.drop) { k.drop = false; let d = 0; while (fits(m.g, { ...m.p, y: m.p.y + 1 })) { m.p.y++; d++ } m.score += d * 2; lock(ctx, s, m); m.fall = now }
  else {
    const soft = k.z < -0.5, step = soft ? Math.min(45, dropMs(m.level)) : dropMs(m.level)
    if (now - m.fall >= step) { m.fall = now; if (fits(m.g, { ...m.p, y: m.p.y + 1 })) { m.p.y++; if (soft) m.score += 1; m.dirty = true } else lock(ctx, s, m) }
  }
  if (m.dirty) { m.dirty = false; s.arcade = { ...s.arcade, view: view(m), score: m.score, lines: m.lines, level: m.level, next: m.next, flash: m.flash ?? null } }
}
