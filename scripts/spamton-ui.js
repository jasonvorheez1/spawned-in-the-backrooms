// Spamton's battle screen: the Deltarune bullet box on a black field, drawn on the player's own machine. (No NEO form: Shelly's call. He is the dumpster salesman from first word to last.)
// The SOUL (a red heart) moves with WASD / arrows inside the box; bullets are run here, hits, grazes and heals go to scripts/spamton-fight.js.
// Graze a bullet (pass close without being hit) and the TP gauge fills; at the deal, TP buys a heal. In the "heads" attack the SOUL turns yellow and SPACE shoots (kill his heads for TP).
import F from './lib/data/spamton.yml'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function spamUi(ctx, player) {
  const b = player?.state?.spam
  if (!b?.on) return ''
  const hp = Math.max(0, Math.round(b.hp ?? 0)), tp = Math.max(0, Math.min(100, Math.round(b.tp ?? 0)))
  const opts = b.phase === 'choose'
    ? (b.opts ?? []).map((o, i) => `<button class="spm-opt" onclick="sendAction('spam',{k:'pick',o:'${esc(o)}'})"><span class="spm-ht">❤</span>${esc(o)}<i>[${i + 1}]</i></button>`).join('')
      + (tp >= F.healCost && hp < F.soulHp ? `<button class="spm-opt spm-heal" onclick="sendAction('spam',{k:'heal'})"><span class="spm-ht" style="color:#ff9a1f">★</span>CASH IN ${F.healCost}% TP · +${F.healHp} HP<i>[3]</i></button>` : '')
    : ''
  return `
<style>
#spm { position:fixed; inset:0; z-index:85; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Determination Mono','Courier New',ui-monospace,monospace; color:#fff; user-select:none; pointer-events:auto; overflow:hidden }
#spm.intro { animation: spmFlash .6s steps(2) 3 }
@keyframes spmFlash { 0%{background:#000} 50%{background:#ff2bd0} }
#spm-cv { width:min(640px,96vw); height:min(420px,63vw); image-rendering:pixelated; }
#spm-talk { width:min(600px,92vw); min-height:76px; border:4px solid #fff; padding:12px 16px; font-size:17px; line-height:1.35; letter-spacing:.04em; margin-top:8px; text-transform:uppercase; position:relative }
#spm-talk .spm-link { color:#ffe14d; display:inline-block }
#spm-bar { display:flex; gap:14px; align-items:center; margin-top:10px; font-size:15px; letter-spacing:.1em }
#spm-hp { width:120px; height:16px; background:#7a0000; position:relative } #spm-hp b { position:absolute; inset:0; width:${hp}%; background:#ffe14d }
#spm-tp { width:90px; height:16px; background:#3a1c00; position:relative; border:1px solid #ff9a1f } #spm-tp b { position:absolute; inset:0; width:${tp}%; background:#ff9a1f }
#spm-opts { display:flex; gap:14px; margin-top:12px; min-height:46px; flex-wrap:wrap; justify-content:center }
.spm-opt { background:#000; color:#ff9a1f; border:3px solid #ff9a1f; padding:8px 18px; font:inherit; font-size:17px; letter-spacing:.08em; cursor:pointer }
.spm-opt:hover { color:#ffe14d; border-color:#ffe14d } .spm-opt i { font-style:normal; opacity:.5; margin-left:8px; font-size:12px }
.spm-heal { color:#7fe39a; border-color:#7fe39a }
.spm-ht { color:#f00; margin-right:8px }
#spm-flee { position:absolute; right:70px; bottom:18px; background:none; border:2px solid #555; color:#888; font:inherit; font-size:12px; padding:4px 10px; cursor:pointer }
#spm-help { font-size:11px; color:#777; margin-top:6px; letter-spacing:.12em }
#spm-vig { position:absolute; inset:0; pointer-events:none; background:radial-gradient(transparent 55%, rgba(0,0,0,.65)); mix-blend-mode:multiply }
#spm-scan { position:absolute; inset:0; pointer-events:none; background:repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px) }
</style>
<div id="spm" data-modal class="${b.phase === 'intro' ? 'intro' : ''}" data-phase="${b.phase}" data-atk="${b.atk ?? ''}" data-seed="${b.seed ?? 0}" data-rage="${b.rage ?? 0}" data-step="${b.step ?? 0}" data-dur="${F.attackSeconds}" data-hit="${F.hit}" data-if="${F.iframes}" data-spd="${F.soulSpeed}" data-warn="${F.warnSeconds}" data-hp="${hp}" data-tp="${tp}" data-line="${esc(b.line)}" data-taunt="${esc(b.taunt ?? '')}" data-n="${b.turn ?? 0}">
  <canvas id="spm-cv" width="640" height="420"></canvas>
  <div id="spm-talk"></div>
  <div id="spm-opts">${opts}</div>
  <div id="spm-bar"><span>YOU</span><span>HP</span><div id="spm-hp"><b></b></div><span>${hp} / ${F.soulHp}</span><span>TP</span><div id="spm-tp"><b></b></div><span style="color:#ff6fd0">DEAL ${b.step ?? 0}/${F.deal.length}</span></div>
  <div id="spm-help">${b.phase === 'attack' ? 'WASD / ARROWS: MOVE · GRAZE BULLETS FOR TP' + (b.atk === 'heads' ? ' · SPACE: SHOOT' : '') : b.phase === 'choose' ? 'PICK YOUR WORDS. 1 / 2' : ''}</div>
  <button id="spm-flee" onclick="sendAction('spam',{k:'flee'})">BACK AWAY</button>
  <div id="spm-vig"></div><div id="spm-scan"></div>
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:none" onload="window.spmInit&&spmInit()" onerror="window.spmInit&&spmInit()">
</div>`
}

if (typeof window !== 'undefined') {
  const S = (window._spm = Object.assign({ raf: null, keys: {}, seed: -1, soul: { x: 110, y: 110 }, bullets: [], shots: [], fx: [], t0: 0, last: 0, inv: 0, sentDone: 0, rnd: null, spawnT: 0, extra: {}, shake: 0, flash: 0, graze: 0, grazeSent: 0, shotT: 0, talk: { line: '', n: 0, at: 0 }, lastHp: -1, lastN: -1, enter: 0, phaseAt: 0, lastPhase: '' }, window._spm || {}))
  for (const k of ['bullets', 'shots', 'fx']) if (!Array.isArray(S[k])) S[k] = [] // a page that ran an older screen kept its own scratch
  if (!S.keys) S.keys = {}; if (!S.extra) S.extra = {}; if (!S.soul) S.soul = { x: 110, y: 110 }; if (!S.talk) S.talk = { line: '', n: 0, at: 0 }
  const W = 220, CX = 320 - W / 2, CY = 150 - W / 2 + 40 // the box on the canvas
  const WORDS = ['$VALUES$', '$$DEALS$', '$"CHEAP"', '$$49.998', '$$REAL$$', '$PRICES$', 'BARGAIN$', '$VAULES$']
  const mul = (r) => { let a = r >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const el = () => document.getElementById('spm')
  const num = (k, d) => parseFloat(el()?.getAttribute('data-' + k) ?? d) || d
  const send = (o) => window.sendAction && window.sendAction('spam', o)
  const rnd2 = (a, b) => a + Math.random() * (b - a)

  function startAttack(seed) {
    S.seed = seed; S.rnd = mul(seed); S.bullets = []; S.shots = []; S.t0 = performance.now(); S.spawnT = 0; S.sentDone = 0
    S.soul = { x: W / 2, y: W / 2 + 40 }; S.extra = { phase: 0, wave: 0 }; S.graze = 0; S.warn = num('warn', 0.9)
  }
  function speed() { return 1 + 0.1 * num('rage', 0) + 0.05 * num('step', 0) }
  const popup = (x, y, text, col = '#fff') => S.fx.push({ k: 'pop', x, y, text, col, t: 0, life: 0.9 })
  const burst = (x, y, col, n = 8) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = rnd2(40, 150); S.fx.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, t: 0, life: rnd2(0.3, 0.7) }) } }

  // each attack spawns bullets over time; a bullet is { x, y, vx, vy, r, kind, ... } in box space (0..W). The first warnSeconds of every attack are a warning: the box flashes and nothing flies yet.
  function spawn(atk, t, dt) {
    const R = S.rnd, sp = speed(), B = S.bullets
    if (t < S.warn) return
    S.spawnT -= dt
    if (atk === 'words') {
      if (S.spawnT <= 0) { S.spawnT = 1.0 / sp; const w = WORDS[Math.floor(R() * WORDS.length)], mode = Math.floor(R() * 3), y = 25 + R() * (W - 50); B.push({ kind: 'word', w, x: W + 10, y, y0: y, vx: -(70 + 25 * R()) * sp, vy: mode === 0 ? 0 : mode === 1 ? 32 : -32, sine: mode === 0, age: 0, size: 9 }) }
    } else if (atk === 'minitons') {
      if (S.spawnT <= 0) { S.spawnT = 0.6 / sp; const top = R() < 0.5; B.push({ kind: 'mini', x: W + 8, y: top ? 9 : W - 9, vx: -(95 + 30 * R()) * sp, vy: 0, top, jumped: false, r: 7 }) }
    } else if (atk === 'vacuum') {
      S.soul.x += 34 * sp * dt // dragged toward the mouth
      if (S.spawnT <= 0) { S.spawnT = 0.16 / sp; B.push({ kind: 'cash', x: -6, y: 8 + R() * (W - 16), vx: (130 + 80 * R()) * sp, vy: (R() - 0.5) * 30, r: 6 }) }
    } else if (atk === 'heads') {
      if (S.spawnT <= 0) { S.spawnT = 1.3 / sp; const lane = Math.floor(R() * 4); B.push({ kind: 'head', x: W + 14, y: 28 + lane * 55, vx: -52 * sp, vy: 0, r: 13, fire: 0.5, hp: 2 }) }
      for (const h of B) if (h.kind === 'head') { h.fire -= dt; if (h.fire <= 0) { h.fire = 1.0 / sp; const dx = S.soul.x - h.x, dy = S.soul.y - h.y, d = Math.hypot(dx, dy) || 1; B.push({ kind: 'pellet', x: h.x, y: h.y, vx: dx / d * 115 * sp, vy: dy / d * 115 * sp, r: 4 }) } }
    } else if (atk === 'heart') {
      S.extra.phase += dt * 1.8 * sp; S.extra.heartY = W / 2 + Math.sin(S.extra.phase) * (W / 2 - 24)
      if (S.spawnT <= 0) { S.spawnT = 0.5 / sp; const a0 = Math.atan2(S.soul.y - S.extra.heartY, S.soul.x - (W - 18)), n = num('step', 0) >= 4 ? 4 : 3; for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.32 + (num('rage', 0) >= 2 ? (R() - 0.5) * 0.3 : 0); B.push({ kind: 'diamond', x: W - 18, y: S.extra.heartY, vx: Math.cos(a) * 105 * sp, vy: Math.sin(a) * 105 * sp, r: 5 }) } }
    } else if (atk === 'pipis') {
      if (S.spawnT <= 0) { S.spawnT = 1.5 / sp; B.push({ kind: 'pipis', x: W - 10, y: 20 + R() * (W - 40), vx: -(80 + 40 * R()) * sp, vy: (R() - 0.5) * 160, r: 9, bounces: 0 }) }
    } else if (atk === 'strings') { // puppet strings: a thin line is drawn first, then it snaps taut and cuts
      if (S.spawnT <= 0) { S.spawnT = 1.55 / sp; const n = 2 + (num('step', 0) >= 3 ? 1 : 0); for (let i = 0; i < n; i++) { const o = R() < 0.5 ? 'h' : 'v'; B.push({ kind: 'line', o, p: 24 + R() * (W - 48), warn: 0.85 / Math.sqrt(sp), act: 0.4, age: 0 }) } }
    } else if (atk === 'rain') { // his money falls on you
      if (S.spawnT <= 0) { S.spawnT = 0.2 / sp; const x = 10 + R() * (W - 20); B.push({ kind: 'coin', x, y: -8, vx: (R() - 0.5) * 24, vy: (105 + 55 * R()) * sp, r: 6, big: R() < 0.12 }) }
    }
  }
  function step(dt) {
    const sp = num('spd', 150), k = S.keys, atk = el()?.getAttribute('data-atk')
    const ax = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ay = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0)
    const n = Math.hypot(ax, ay) || 1
    S.soul.x = Math.max(7, Math.min(W - 7, S.soul.x + ax / n * sp * dt)); S.soul.y = Math.max(7, Math.min(W - 7, S.soul.y + ay / n * sp * dt))
    const sp2 = speed(), B = S.bullets
    // the yellow SOUL shoots: SPACE, a few shots a second, each kills what it hits (heads take two)
    S.shotT -= dt
    if (atk === 'heads' && S.keys[' '] && S.shotT <= 0) { S.shotT = 0.22; S.shots.push({ x: S.soul.x, y: S.soul.y - 8, vy: -330 }) }
    for (const sh of S.shots) { sh.y += sh.vy * dt; if (sh.y < -10) sh.dead = true }
    for (const b of B) {
      b.age = (b.age ?? 0) + dt
      if (b.kind === 'word') { b.x += b.vx * dt; b.y = b.sine ? b.y0 + Math.sin(b.age * 3.2) * 34 : b.y + b.vy * dt; b.size = 9 + Math.min(9, b.age * 5) }
      else if (b.kind === 'mini') { b.x += b.vx * dt; if (!b.jumped && Math.abs(b.x - S.soul.x) < 26) { b.jumped = true; b.vy = (b.top ? 1 : -1) * 190 * sp2 } b.y += b.vy * dt; if (b.jumped) b.vy += (b.top ? -1 : 1) * 300 * dt }
      else if (b.kind === 'pipis') { b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < 9 || b.y > W - 9) { b.vy *= -1; b.bounces++ } if (b.x < 12 || b.bounces >= 2) { b.dead = true; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; B.push({ kind: 'mhead', x: b.x, y: b.y, vx: Math.cos(a) * 140 * sp2, vy: Math.sin(a) * 140 * sp2, r: 6 }) } } }
      else if (b.kind === 'coin') { b.x += b.vx * dt + Math.sin(b.age * 3 + b.x) * 14 * dt; b.y += b.vy * dt }
      else if (b.kind === 'line') { /* timed in hits() */ if (b.age > b.warn + b.act + 0.1) b.dead = true }
      else { b.x += b.vx * dt; b.y += b.vy * dt }
      if (b.kind !== 'line' && (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > W + 60)) b.dead = true
    }
    // shots against heads and the things a shot can pop
    for (const sh of S.shots) for (const b of B) if (!sh.dead && (b.kind === 'head' || b.kind === 'pellet') && Math.hypot(sh.x - b.x, sh.y - b.y) < (b.r ?? 4) + 5) {
      sh.dead = true; b.hp = (b.hp ?? 1) - 1; burst(b.x, b.y, '#ffe14d', 4)
      if (b.hp <= 0) { b.dead = true; burst(b.x, b.y, '#fff', 10); S.graze += b.kind === 'head' ? 4 : 1; popup(CX + b.x, CY + b.y, b.kind === 'head' ? '+TP' : '', '#ff9a1f'); S.shake = Math.max(S.shake, 2) }
    }
    S.shots = S.shots.filter((s) => !s.dead)
    S.bullets = B.filter((b) => !b.dead)
  }
  const lineHot = (b) => b.age >= b.warn && b.age <= b.warn + b.act
  function hits() {
    const sx = S.soul.x, sy = S.soul.y
    if (num('_', 0)) return
    const now = performance.now(), immune = now < S.inv
    for (const b of S.bullets) {
      let hit = false, near = false
      if (b.kind === 'word') { const w = b.w.length * b.size * 0.62, h = b.size; hit = sx > b.x - 4 && sx < b.x + w + 4 && sy > b.y - h / 2 - 4 && sy < b.y + h / 2 + 4; near = !hit && sx > b.x - 16 && sx < b.x + w + 16 && sy > b.y - h / 2 - 16 && sy < b.y + h / 2 + 16 }
      else if (b.kind === 'line') { if (!lineHot(b)) continue; const d = b.o === 'h' ? Math.abs(sy - b.p) : Math.abs(sx - b.p); hit = d < 6; near = d < 18 }
      else { const d = Math.hypot(sx - b.x, sy - b.y), rr = (b.r ?? 5) + 5; hit = d < rr; near = d < rr + 12 }
      if (hit && !immune) {
        S.inv = now + num('if', 0.9) * 1000; S.flash = now; S.shake = 7; burst(CX + sx, CY + sy, '#f00', 10); popup(CX + sx, CY + sy - 12, '-' + num('hit', 11), '#ff3b3b'); send({ k: 'hit', d: num('hit', 11) })
        return
      }
      if (near && !hit && !b.grazed && !immune) { b.grazed = true; S.graze += 1; popup(CX + sx + 8, CY + sy - 10, '+', '#ff9a1f') }
    }
    if (el()?.getAttribute('data-atk') === 'vacuum' && sx > W - 16 && !immune) { S.inv = now + 900; S.flash = now; S.shake = 7; popup(CX + sx, CY + sy - 12, '-' + num('hit', 11), '#ff3b3b'); send({ k: 'hit', d: num('hit', 11) }) }
    // tell the server about grazes in small batches (it keeps the TP; at most a handful a second)
    if (S.graze > 0 && now - S.grazeSent > 350) { send({ k: 'graze', n: Math.min(6, Math.round(S.graze)) }); S.graze = 0; S.grazeSent = now }
  }

  // ---- drawing
  const heartPath = (g, x, y, r) => { g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9) }
  // Spamton G. Spamton, the dumpster salesman: a lanky puppet in a black suit, glasses, a bow, strings from the top of the screen. s = scale, talk = mouth flapping, mood: 'idle' | 'glee' | 'pocket'
  function drawSpamton(g, x, y, s, t, talk, mood) {
    const jit = (Math.sin(t * 37) > 0.93) ? rnd2(-3, 3) : 0, bob = Math.sin(t * 5.2) * 3, tilt = Math.sin(t * 2.3) * 0.06 + (mood === 'glee' ? Math.sin(t * 14) * 0.05 : 0)
    const body = (ox, col) => {
      g.save(); g.translate(x + ox + jit, y + bob); g.scale(s, s); g.globalAlpha = col ? 0.5 : 1
      const c = (n) => col ?? n
      // strings to the top of the screen (he is on strings)
      g.strokeStyle = col ?? '#cfcfcf'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -34); g.lineTo(Math.sin(t * 1.3) * 6, -170); g.moveTo(-34, 22 + Math.sin(t * 6) * 10); g.lineTo(-52, -170); g.moveTo(34, 22 + Math.cos(t * 6) * 10); g.lineTo(52, -170); g.moveTo(-14, 80); g.lineTo(-22, -170); g.moveTo(14, 80); g.lineTo(22, -170); g.stroke()
      // legs, then the suit
      g.fillStyle = c('#0e0e12'); g.fillRect(-16, 70, 11, 30); g.fillRect(5, 70, 11, 30); g.fillStyle = c('#ffe14d'); g.fillRect(-19, 98, 17, 6); g.fillRect(2, 98, 17, 6)
      g.fillStyle = c('#15151c'); g.beginPath(); g.moveTo(-26, 30); g.lineTo(26, 30); g.lineTo(22, 74); g.lineTo(-22, 74); g.fill()
      g.fillStyle = c('#fff'); g.beginPath(); g.moveTo(-7, 30); g.lineTo(7, 30); g.lineTo(3, 56); g.lineTo(-3, 56); g.fill() // shirt
      g.fillStyle = c('#ff6fd0'); g.fillRect(-8, 32, 16, 6); g.fillRect(-2, 30, 4, 10) // bow
      // arms on strings: hands flap when he talks
      const lift = mood === 'glee' ? -14 : Math.sin(t * 4) * 5
      g.strokeStyle = c('#15151c'); g.lineWidth = 7; g.beginPath(); g.moveTo(-24, 34); g.lineTo(-44, 44 + lift); g.moveTo(24, 34); g.lineTo(46, 36 - lift); g.stroke()
      g.fillStyle = c('#fff'); g.beginPath(); g.arc(-46, 46 + lift, 7, 0, 7); g.arc(48, 38 - lift, 7, 0, 7); g.fill()
      // the head, tilted, with the big glasses and a cheek
      g.save(); g.translate(0, 8); g.rotate(tilt)
      g.fillStyle = c('#f4f4f4'); g.beginPath(); g.ellipse(0, 0, 27, 31, 0, 0, 7); g.fill()
      g.fillStyle = c('#111'); g.beginPath(); g.moveTo(-31, -12); g.quadraticCurveTo(-8, -50, 36, -22); g.lineTo(20, -14); g.quadraticCurveTo(0, -30, -24, -6); g.fill() // hair swept back
      g.fillStyle = c('#ffe14d'); g.fillRect(-22, -6, 16, 12); g.fillStyle = c('#ff6fd0'); g.fillRect(5, -6, 16, 12) // the two lenses
      g.fillStyle = c('#111'); g.fillRect(-14, -2, 4, 5); g.fillRect(11, -2, 4, 5); g.fillRect(-6, -2, 11, 3)
      const glint = (Math.sin(t * 3.1) + 1) / 2; g.fillStyle = `rgba(255,255,255,${0.2 + glint * 0.7})`; g.fillRect(-20, -4, 3, 3)
      g.fillStyle = c('#ff6fd0'); g.fillRect(-24, 12, 7, 4)
      g.fillStyle = c('#111'); if (talk) { g.beginPath(); g.ellipse(2, 20, 11, 7 + Math.abs(Math.sin(t * 22)) * 7, 0, 0, 7); g.fill(); g.fillStyle = c('#ff6fd0'); g.fillRect(-5, 21, 14, 4) } else { g.fillRect(-9, 20, 20, 3) }
      g.restore(); g.restore()
    }
    body(-3.5, '#00e0ff'); body(3.5, '#ff2bd0') // the glitch: a cyan and a magenta ghost, a little apart
    g.globalAlpha = 1; body(0, null); g.globalAlpha = 1
  }
  const field = (g, t) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 640, 420)
    g.strokeStyle = 'rgba(40,180,90,0.16)'; g.lineWidth = 1
    for (let i = -40; i < 680; i += 40) { g.beginPath(); g.moveTo(i + (t * 20) % 40, 0); g.lineTo(i + (t * 20) % 40, 420); g.stroke() }
    for (let j = 0; j < 420; j += 40) { g.beginPath(); g.moveTo(0, j + (t * 8) % 40); g.lineTo(640, j + (t * 8) % 40); g.stroke() }
    // price tags drifting up the back wall
    g.fillStyle = 'rgba(255,111,208,0.10)'; g.font = 'bold 26px monospace'
    for (let k = 0; k < 7; k++) g.fillText(['$$', '$49.998', 'FREE', '$', '$$$', '1-800', '[[ ]]'][k], (k * 97 + t * 14) % 700 - 30, 60 + (k * 53) % 330)
  }
  function draw() {
    const cv = document.getElementById('spm-cv'); if (!cv) return
    const g = cv.getContext('2d'), t = performance.now() / 1000, ph = el()?.getAttribute('data-phase'), atk = el()?.getAttribute('data-atk')
    if (ph !== S.lastPhase) { S.lastPhase = ph; S.phaseAt = performance.now() }
    const since = (performance.now() - S.phaseAt) / 1000
    field(g, t)
    const sh = S.shake; g.save(); if (sh > 0.3) g.translate(rnd2(-sh, sh), rnd2(-sh, sh))
    const talking = ['choose', 'intro', 'talk'].includes(ph) && S.talk.n < S.talk.line.length + 6 || ph === 'won' || ph === 'lost'
    if (ph !== 'attack') {
      let sc = 1.9 + Math.sin(since * 6) * (since < 0.5 ? 0.25 : 0.03), px = 320, py = 150
      if (ph === 'intro') sc = Math.min(1.9, 0.4 + since * 1.1) // he pops up
      if (ph === 'won') { const u = Math.min(1, since / 2.2); sc = 1.9 - u * 1.65; py = 150 + u * 240; px = 320 + Math.sin(u * 5) * 20 * (1 - u) } // folds himself small and slides into your pocket
      if (ph === 'lost') { sc = 2.05 + Math.sin(since * 14) * 0.05 }
      drawSpamton(g, px, py, sc, t, talking, ph === 'won' || ph === 'lost' ? 'glee' : 'idle')
      if (ph === 'lost') { const u = Math.min(1, since / 1.4); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.4; g.fillStyle = '#f00'; heartPath(g, 320 + Math.cos(a) * u * 90, 380 + Math.sin(a) * u * 20 + u * u * 40, 6 - u * 3); g.fill() } }
    } else {
      drawSpamton(g, 560, 128, 1.15, t, atk === 'vacuum' || atk === 'words' || S.flash > performance.now() - 400, atk === 'vacuum' || performance.now() - S.flash < 500 ? 'glee' : 'idle')
      // the taunt bubble over his head
      const taunt = el()?.getAttribute('data-taunt'); if (taunt) { g.save(); g.font = 'bold 12px monospace'; const w = g.measureText(taunt).width + 14; g.fillStyle = '#000'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.fillRect(560 - w / 2 - 80, 18, w, 22); g.strokeRect(560 - w / 2 - 80, 18, w, 22); g.fillStyle = '#fff'; g.fillText(taunt, 560 - w / 2 - 73, 33); g.restore() }
      const el2 = (performance.now() - S.t0) / 1000, warning = el2 < S.warn
      // the box: it flashes red while the attack warns, then it is quiet
      g.strokeStyle = warning && Math.floor(t * 10) % 2 === 0 ? '#ff3b3b' : '#fff'; g.lineWidth = 4; g.strokeRect(CX - 2, CY - 2, W + 4, W + 4)
      g.save(); g.beginPath(); g.rect(CX, CY, W, W); g.clip()
      if (atk === 'vacuum') { g.fillStyle = '#300'; g.fillRect(CX + W - 16, CY, 16, W) }
      if (atk === 'heart') { g.fillStyle = '#ff2b2b'; heartPath(g, CX + W - 18, CY + (S.extra.heartY ?? W / 2), 11); g.fill(); g.strokeStyle = '#777'; g.beginPath(); g.moveTo(CX + W, CY + (S.extra.heartY ?? W / 2)); g.lineTo(CX + W - 8, CY + (S.extra.heartY ?? W / 2)); g.stroke() }
      for (const b of S.bullets) {
        const x = CX + b.x, y = CY + b.y
        if (b.kind === 'word') { g.fillStyle = '#fff'; g.font = `bold ${Math.round(b.size)}px monospace`; g.textBaseline = 'middle'; g.fillText(b.w, x, y) }
        else if (b.kind === 'cash') { g.fillStyle = '#ffe14d'; g.font = 'bold 13px monospace'; g.textBaseline = 'middle'; g.fillText('$', x - 4, y) }
        else if (b.kind === 'coin') { g.fillStyle = '#ffe14d'; g.beginPath(); g.ellipse(x, y, b.big ? 8 : 5, b.big ? 8 : 6 * Math.abs(Math.cos(b.age * 6)) + 1, 0, 0, 7); g.fill(); g.strokeStyle = '#a07000'; g.lineWidth = 1; g.stroke() }
        else if (b.kind === 'line') {
          const hot = lineHot(b), a = hot ? 1 : Math.min(1, b.age / b.warn) * 0.55
          g.strokeStyle = hot ? '#fff' : `rgba(255,111,208,${a})`; g.lineWidth = hot ? 4 : 1; if (!hot) g.setLineDash([5, 5]); g.beginPath()
          if (b.o === 'h') { g.moveTo(CX, CY + b.p); g.lineTo(CX + W, CY + b.p) } else { g.moveTo(CX + b.p, CY); g.lineTo(CX + b.p, CY + W) } g.stroke(); g.setLineDash([])
        }
        else if (b.kind === 'mini' || b.kind === 'head' || b.kind === 'mhead') { const r = b.r; g.fillStyle = '#eee'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(x - r, y - r, r * 2, r * 0.7); g.fillStyle = '#ffe14d'; g.fillRect(x - r * 0.7, y - r * 0.15, r * 0.5, r * 0.4); g.fillStyle = '#ff6fd0'; g.fillRect(x + r * 0.2, y - r * 0.15, r * 0.5, r * 0.4) }
        else if (b.kind === 'diamond') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 4, y); g.lineTo(x, y + 6); g.lineTo(x - 4, y); g.fill() }
        else if (b.kind === 'pipis') { g.fillStyle = '#4fa3ff'; g.beginPath(); g.ellipse(x, y, 8, 10, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(x - 3, y - 6, 3, 4) }
        else { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, b.r ?? 4, 0, 7); g.fill() }
      }
      for (const s of S.shots) { g.fillStyle = '#ffe14d'; g.fillRect(CX + s.x - 1.5, CY + s.y - 6, 3, 10) }
      const blink = performance.now() < S.inv && Math.floor(t * 12) % 2 === 0, shooter = atk === 'heads'
      if (!blink) { g.fillStyle = shooter ? '#ffe14d' : '#f00'; heartPath(g, CX + S.soul.x, CY + S.soul.y, 7); g.fill() }
      if (warning) { g.fillStyle = '#ff3b3b'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.fillText('!', CX + W / 2, CY + W / 2 + 6 + Math.sin(t * 30) * 2); g.textAlign = 'left' }
      g.restore()
      const dur = num('dur', 9), left = Math.max(0, dur - el2)
      g.fillStyle = '#555'; g.fillRect(CX, CY + W + 10, W, 4); g.fillStyle = '#fff'; g.fillRect(CX, CY + W + 10, W * left / dur, 4)
    }
    // the effects: popups and sparks (screen space)
    for (const f of S.fx) {
      if (f.k === 'pop') { g.fillStyle = f.col; g.font = 'bold 14px monospace'; g.globalAlpha = Math.max(0, 1 - f.t / f.life); g.fillText(f.text, f.x, f.y - f.t * 40); g.globalAlpha = 1 }
      else { g.fillStyle = f.col; g.globalAlpha = Math.max(0, 1 - f.t / f.life); g.fillRect(f.x + f.vx * f.t, f.y + f.vy * f.t + 60 * f.t * f.t, 3, 3); g.globalAlpha = 1 }
    }
    g.restore()
    if (S.flash && performance.now() - S.flash < 140) { g.fillStyle = `rgba(255,0,0,${0.35 - (performance.now() - S.flash) / 400})`; g.fillRect(0, 0, 640, 420) }
  }
  // his words, a letter at a time with the talk blip, the [[links]] yellow and trembling
  function talk(dt) {
    const m = el(); if (!m) return
    const line = m.getAttribute('data-line') ?? '', box = document.getElementById('spm-talk'); if (!box) return
    if (line !== S.talk.line) { S.talk = { line, n: 0, at: performance.now() } }
    S.talk.n = Math.min(line.length, S.talk.n + dt * 46)
    const shown = line.slice(0, Math.floor(S.talk.n)), esc2 = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const html = esc2(shown).replace(/\[\[(.+?)\]\]/g, '<span class="spm-link">[[$1]]</span>').replace(/\[\[(.*)$/, '<span class="spm-link">[[$1</span>')
    const key = html + (S.talk.n >= line.length ? '|' : '')
    if (box.dataset.k !== key) { box.dataset.k = key; box.innerHTML = '* ' + html }
    for (const e of box.querySelectorAll('.spm-link')) e.style.transform = `translate(${Math.round(Math.sin(performance.now() / 40) * 1)}px,${Math.round(Math.cos(performance.now() / 53) * 1)}px)`
  }

  function loop(now) {
    const m = el()
    if (!m) { S.raf = null; S.seed = -1; return }
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now
    const ph = m.getAttribute('data-phase'), seed = +m.getAttribute('data-seed')
    if (ph === 'attack') {
      if (seed !== S.seed) startAttack(seed)
      const el2 = (now - S.t0) / 1000, dur = num('dur', 9)
      if (el2 < dur - 1.2) spawn(m.getAttribute('data-atk'), el2, dt)
      step(dt); hits()
      if (el2 >= dur && now - S.sentDone > 900) { S.sentDone = now; send({ k: 'done' }) }
    }
    for (const f of S.fx) f.t += dt
    S.fx = S.fx.filter((f) => f.t < f.life)
    S.shake = Math.max(0, S.shake - dt * 22)
    talk(dt)
    draw()
    const root = el(); if (root) root.style.transform = S.shake > 0.3 ? `translate(${rnd2(-S.shake, S.shake) * 0.6}px,${rnd2(-S.shake, S.shake) * 0.6}px)` : ''
    S.raf = requestAnimationFrame(loop)
  }
  window.spmInit = function () {
    if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(loop) }
    if (!window._spmKeys) {
      window._spmKeys = true
      const on = (e, v) => {
        if (!el()) return; const k = e.key.toLowerCase()
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) { S.keys[k] = v; e.preventDefault() }
        if (v && (k === '1' || k === '2' || k === '3')) { const btn = document.querySelectorAll('.spm-opt')[+k - 1]; if (btn) btn.click() }
      }
      window.addEventListener('keydown', (e) => on(e, true), true)
      window.addEventListener('keyup', (e) => on(e, false), true)
    }
  }
}
