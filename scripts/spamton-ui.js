// Spamton's battle screen: the Deltarune bullet box on a black field, drawn on the player's own machine.
// The SOUL (a red heart) moves with WASD / arrows inside the box; bullets are run here, hits go to scripts/spamton-fight.js.
import F from './lib/data/spamton.yml'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const deco = (t) => esc(t).replace(/\[\[(.+?)\]\]/g, '<span class="spm-link">[[$1]]</span>')

export function spamUi(ctx, player) {
  const b = player?.state?.spam
  if (!b?.on) return ''
  const hp = Math.max(0, Math.round(b.hp ?? 0))
  const opts = b.phase === 'choose' ? (b.opts ?? []).map((o, i) => `<button class="spm-opt" onclick="sendAction('spam',{k:'pick',o:'${esc(o)}'})"><span class="spm-ht">❤</span>${esc(o)}<i>[${i + 1}]</i></button>`).join('') : ''
  return `
<style>
#spm { position:fixed; inset:0; z-index:85; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Determination Mono','Courier New',ui-monospace,monospace; color:#fff; user-select:none; pointer-events:auto; }
#spm.intro { animation: spmFlash .6s steps(2) 3 }
@keyframes spmFlash { 0%{background:#000} 50%{background:#ff2bd0} }
#spm-cv { width:min(640px,96vw); height:min(420px,63vw); image-rendering:pixelated; }
#spm-talk { width:min(600px,92vw); min-height:76px; border:4px solid #fff; padding:12px 16px; font-size:17px; line-height:1.35; letter-spacing:.04em; margin-top:8px; text-transform:uppercase }
.spm-link { color:#ffe14d } 
#spm-bar { display:flex; gap:18px; align-items:center; margin-top:10px; font-size:15px; letter-spacing:.1em }
#spm-hp { width:120px; height:16px; background:#7a0000; position:relative } #spm-hp b { position:absolute; inset:0; width:${hp}%; background:#ffe14d }
#spm-opts { display:flex; gap:14px; margin-top:12px; min-height:46px }
.spm-opt { background:#000; color:#ff9a1f; border:3px solid #ff9a1f; padding:8px 18px; font:inherit; font-size:17px; letter-spacing:.08em; cursor:pointer }
.spm-opt:hover { color:#ffe14d; border-color:#ffe14d } .spm-opt i { font-style:normal; opacity:.5; margin-left:8px; font-size:12px }
.spm-ht { color:#f00; margin-right:8px }
#spm-flee { position:absolute; right:70px; bottom:18px; background:none; border:2px solid #555; color:#888; font:inherit; font-size:12px; padding:4px 10px; cursor:pointer }
#spm-help { font-size:11px; color:#777; margin-top:6px; letter-spacing:.12em }
</style>
<div id="spm" data-modal class="${b.phase === 'intro' ? 'intro' : ''}" data-phase="${b.phase}" data-atk="${b.atk ?? ''}" data-seed="${b.seed ?? 0}" data-rage="${b.rage ?? 0}" data-step="${b.step ?? 0}" data-dur="${F.attackSeconds}" data-hit="${F.hit}" data-if="${F.iframes}" data-spd="${F.soulSpeed}">
  <canvas id="spm-cv" width="640" height="420"></canvas>
  <div id="spm-talk">* ${deco(b.line)}</div>
  <div id="spm-opts">${opts}</div>
  <div id="spm-bar"><span>YOU</span><span>HP</span><div id="spm-hp"><b></b></div><span>${hp} / ${F.soulHp}</span><span style="color:#ff6fd0">DEAL ${b.step ?? 0}/6</span></div>
  <div id="spm-help">${b.phase === 'attack' ? 'WASD / ARROWS: MOVE YOUR SOUL' : b.phase === 'choose' ? 'PICK YOUR WORDS. 1 / 2' : ''}</div>
  <button id="spm-flee" onclick="sendAction('spam',{k:'flee'})">BACK AWAY</button>
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="display:none" onload="window.spmInit&&spmInit()" onerror="window.spmInit&&spmInit()">
</div>`
}

if (typeof window !== 'undefined') {
  const S = (window._spm = window._spm || { raf: null, keys: {}, seed: -1, soul: { x: 110, y: 110 }, bullets: [], t0: 0, last: 0, inv: 0, sentDone: 0, rnd: null, spawnT: 0, extra: {} })
  const W = 220, CX = 320 - W / 2, CY = 150 - W / 2 + 40 // the box on the canvas
  const WORDS = ['$VALUES$', '$$DEALS$', '$"CHEAP"', '$$49.998', '$$REAL$$', '$PRICES$', 'BARGAIN$', '$VAULES$']
  const mul = (r) => { let a = r >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  const el = () => document.getElementById('spm')
  const num = (k, d) => parseFloat(el()?.getAttribute('data-' + k) ?? d) || d

  function startAttack(seed) {
    S.seed = seed; S.rnd = mul(seed); S.bullets = []; S.t0 = performance.now(); S.spawnT = 0; S.sentDone = 0
    S.soul = { x: W / 2, y: W / 2 + 40 }; S.extra = { ang: 0, heartY: W / 2, phase: 0 }
  }
  function speed() { return 1 + 0.12 * num('rage', 0) + 0.06 * num('step', 0) }

  // each attack: spawns bullets over time; a bullet is { x, y, vx, vy, r, kind, ... } in box space (0..W)
  function spawn(atk, t, dt) {
    const R = S.rnd, sp = speed(), B = S.bullets
    S.spawnT -= dt
    if (atk === 'words') {
      if (S.spawnT <= 0) { S.spawnT = 1.05 / sp; const w = WORDS[Math.floor(R() * WORDS.length)], mode = Math.floor(R() * 3); B.push({ kind: 'word', w, x: W + 10, y: 25 + R() * (W - 50), y0: 0, vx: -(70 + 25 * R()) * sp, vy: mode === 0 ? 0 : mode === 1 ? 32 : -32, sine: mode === 0, age: 0 }) ; B[B.length - 1].y0 = B[B.length - 1].y }
    } else if (atk === 'minitons') {
      if (S.spawnT <= 0) { S.spawnT = 0.62 / sp; const top = R() < 0.5; B.push({ kind: 'mini', x: W + 8, y: top ? 9 : W - 9, vx: -(95 + 30 * R()) * sp, vy: 0, top, jumped: false, r: 7 }) }
    } else if (atk === 'vacuum') {
      S.soul.x += 34 * sp * dt // dragged toward the mouth
      if (S.spawnT <= 0) { S.spawnT = 0.16 / sp; B.push({ kind: 'cash', x: -6, y: 8 + R() * (W - 16), vx: (130 + 80 * R()) * sp, vy: (R() - 0.5) * 30, r: 6 }) }
    } else if (atk === 'heads') {
      if (S.spawnT <= 0) { S.spawnT = 1.25 / sp; const lane = Math.floor(R() * 4); const fromLeft = num('rage', 0) >= 1 && R() < 0.35; B.push({ kind: 'head', x: fromLeft ? -14 : W + 14, y: 28 + lane * 55, vx: (fromLeft ? 1 : -1) * 55 * sp, vy: 0, r: 13, fire: 0.5 }) }
      for (const h of B) if (h.kind === 'head') { h.fire -= dt; if (h.fire <= 0) { h.fire = 0.9 / sp; const dx = S.soul.x - h.x, dy = S.soul.y - h.y, d = Math.hypot(dx, dy) || 1; B.push({ kind: 'pellet', x: h.x, y: h.y, vx: dx / d * 120 * sp, vy: dy / d * 120 * sp, r: 4 }) } }
    } else if (atk === 'heart') {
      S.extra.phase += dt * 1.8 * sp; S.extra.heartY = W / 2 + Math.sin(S.extra.phase) * (W / 2 - 24)
      if (S.spawnT <= 0) { S.spawnT = 0.48 / sp; const a0 = Math.atan2(S.soul.y - S.extra.heartY, S.soul.x - (W - 18)), n = num('step', 0) >= 4 ? 4 : 3; for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.32 + (num('rage', 0) >= 2 ? (R() - 0.5) * 0.3 : 0); B.push({ kind: 'diamond', x: W - 18, y: S.extra.heartY, vx: Math.cos(a) * 125 * sp, vy: Math.sin(a) * 125 * sp, r: 5 }) } }
    } else if (atk === 'pipis') {
      if (S.spawnT <= 0) { S.spawnT = 1.5 / sp; B.push({ kind: 'pipis', x: W - 10, y: 20 + R() * (W - 40), vx: -(80 + 40 * R()) * sp, vy: (R() - 0.5) * 160, r: 9, bounces: 0 }) }
    }
  }
  function step(dt) {
    const sp = num('spd', 150), k = S.keys
    const ax = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ay = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0)
    const n = Math.hypot(ax, ay) || 1
    S.soul.x = Math.max(7, Math.min(W - 7, S.soul.x + ax / n * sp * dt)); S.soul.y = Math.max(7, Math.min(W - 7, S.soul.y + ay / n * sp * dt))
    const sp2 = speed(), B = S.bullets
    for (const b of B) {
      b.age = (b.age ?? 0) + dt
      if (b.kind === 'word') { b.x += b.vx * dt; b.y = b.sine ? b.y0 + Math.sin(b.age * 3.2) * 34 : b.y + b.vy * dt; b.size = 9 + Math.min(9, b.age * 5) }
      else if (b.kind === 'mini') { b.x += b.vx * dt; if (!b.jumped && Math.abs(b.x - S.soul.x) < 26) { b.jumped = true; b.vy = (b.top ? 1 : -1) * 190 * sp2 } b.y += b.vy * dt; if (b.jumped) b.vy += (b.top ? -1 : 1) * 300 * dt }
      else if (b.kind === 'pipis') { b.x += b.vx * dt; b.y += b.vy * dt; if (b.y < 9 || b.y > W - 9) { b.vy *= -1; b.bounces++ } if (b.x < 12 || b.bounces >= 2) { b.dead = true; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; B.push({ kind: 'mhead', x: b.x, y: b.y, vx: Math.cos(a) * 140 * sp2, vy: Math.sin(a) * 140 * sp2, r: 5 }) } } }
      else { b.x += b.vx * dt; b.y += b.vy * dt }
      if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > W + 60) b.dead = true
    }
    S.bullets = B.filter((b) => !b.dead)
  }
  function hits() {
    const sx = S.soul.x, sy = S.soul.y
    if (num('_', 0) || performance.now() < S.inv) return
    for (const b of S.bullets) {
      let hit = false
      if (b.kind === 'word') { const w = b.w.length * b.size * 0.62, h = b.size; hit = sx > b.x - 4 && sx < b.x + w + 4 && sy > b.y - h / 2 - 4 && sy < b.y + h / 2 + 4 }
      else hit = Math.hypot(sx - b.x, sy - b.y) < (b.r ?? 5) + 5
      if (hit) { S.inv = performance.now() + num('if', 0.9) * 1000; S.flash = performance.now(); if (window.sendAction) window.sendAction('spam', { k: 'hit', d: num('hit', 11) }); return }
    }
    if (el()?.getAttribute('data-atk') === 'vacuum' && sx > W - 16) { S.inv = performance.now() + 900; S.flash = performance.now(); window.sendAction && window.sendAction('spam', { k: 'hit', d: num('hit', 11) }) }
  }

  function drawSpamton(g, x, y, s, t, open) {
    const bob = Math.sin(t * 6) * 3
    g.save(); g.translate(x, y + bob); g.scale(s, s)
    g.fillStyle = '#111'; g.fillRect(-26, 34, 52, 50) // suit
    g.fillStyle = '#fff'; g.fillRect(-6, 34, 12, 22); g.fillStyle = '#ff6fd0'; g.fillRect(-4, 38, 8, 6) // shirt and bow
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.ellipse(0, 6, 26, 30, 0, 0, Math.PI * 2); g.fill() // head
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(-30, -6); g.quadraticCurveTo(-10, -44, 34, -18); g.lineTo(18, -10); g.quadraticCurveTo(0, -26, -22, 0); g.fill() // hair
    g.fillStyle = '#ffe14d'; g.fillRect(-20, 0, 15, 11); g.fillStyle = '#ff6fd0'; g.fillRect(4, 0, 15, 11) // glasses
    g.fillStyle = '#111'; g.fillRect(-14, 3, 4, 5); g.fillRect(10, 3, 4, 5)
    g.fillStyle = '#ff6fd0'; g.fillRect(-22, 15, 7, 4) // cheek
    g.fillStyle = '#111'; if (open) { g.beginPath(); g.ellipse(2, 22, 11, 9 + Math.sin(t * 20) * 2, 0, 0, Math.PI * 2); g.fill() } else g.fillRect(-8, 22, 18, 3)
    g.strokeStyle = '#ddd'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -30); g.lineTo(0, -80); g.moveTo(-22, 50); g.lineTo(-40, -80); g.moveTo(22, 50); g.lineTo(40, -80); g.stroke() // puppet strings
    g.restore()
  }
  function draw() {
    const cv = document.getElementById('spm-cv'); if (!cv) return
    const g = cv.getContext('2d'), t = performance.now() / 1000, ph = el()?.getAttribute('data-phase')
    g.fillStyle = '#000'; g.fillRect(0, 0, 640, 420)
    // the green grid behind him, Deltarune style
    g.strokeStyle = 'rgba(40,180,90,0.18)'; g.lineWidth = 1
    for (let i = 0; i < 640; i += 40) { g.beginPath(); g.moveTo(i + (t * 20) % 40, 0); g.lineTo(i + (t * 20) % 40, 420); g.stroke() }
    for (let j = 0; j < 420; j += 40) { g.beginPath(); g.moveTo(0, j); g.lineTo(640, j); g.stroke() }
    const atk = el()?.getAttribute('data-atk'), neo = ['heads', 'heart', 'pipis'].includes(atk)
    if (ph !== 'attack') { drawSpamton(g, 320, 150, neo ? 2.2 : 1.9, t, ph === 'choose' || ph === 'intro' || ph === 'won' || ph === 'lost'); return }
    drawSpamton(g, 560, 120, 1.1, t, atk === 'vacuum')
    // the box
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(CX - 2, CY - 2, W + 4, W + 4)
    g.save(); g.beginPath(); g.rect(CX, CY, W, W); g.clip()
    if (atk === 'vacuum') { g.fillStyle = '#300'; g.fillRect(CX + W - 16, CY, 16, W) }
    if (atk === 'heart') { g.fillStyle = '#ff2b2b'; heartPath(g, CX + W - 18, CY + S.extra.heartY, 11); g.fill(); g.strokeStyle = '#777'; g.beginPath(); g.moveTo(CX + W, CY + S.extra.heartY); g.lineTo(CX + W - 8, CY + S.extra.heartY); g.stroke() }
    for (const b of S.bullets) {
      const x = CX + b.x, y = CY + b.y
      if (b.kind === 'word') { g.fillStyle = '#fff'; g.font = `bold ${Math.round(b.size)}px monospace`; g.textBaseline = 'middle'; g.fillText(b.w, x, y) }
      else if (b.kind === 'cash') { g.fillStyle = '#ffe14d'; g.font = 'bold 13px monospace'; g.textBaseline = 'middle'; g.fillText('$', x - 4, y) }
      else if (b.kind === 'mini' || b.kind === 'head' || b.kind === 'mhead') { const r = b.r; g.fillStyle = '#eee'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#111'; g.fillRect(x - r, y - r, r * 2, r * 0.7); g.fillStyle = '#ffe14d'; g.fillRect(x - r * 0.7, y - r * 0.15, r * 0.5, r * 0.35); g.fillStyle = '#ff6fd0'; g.fillRect(x + r * 0.15, y - r * 0.15, r * 0.5, r * 0.35) }
      else if (b.kind === 'diamond') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 4, y); g.lineTo(x, y + 6); g.lineTo(x - 4, y); g.fill() }
      else if (b.kind === 'pipis') { g.fillStyle = '#4fa3ff'; g.beginPath(); g.ellipse(x, y, 8, 10, 0, 0, 7); g.fill() }
      else { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, b.r ?? 4, 0, 7); g.fill() }
    }
    const blink = performance.now() < S.inv && Math.floor(t * 12) % 2 === 0
    if (!blink) { g.fillStyle = '#f00'; heartPath(g, CX + S.soul.x, CY + S.soul.y, 7); g.fill() }
    g.restore()
    // time left
    const dur = num('dur', 9), left = Math.max(0, dur - (performance.now() - S.t0) / 1000)
    g.fillStyle = '#555'; g.fillRect(CX, CY + W + 10, W, 4); g.fillStyle = '#fff'; g.fillRect(CX, CY + W + 10, W * left / dur, 4)
  }
  function heartPath(g, x, y, r) { g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.4); g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9) }

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
      if (el2 >= dur && now - S.sentDone > 900) { S.sentDone = now; window.sendAction && window.sendAction('spam', { k: 'done' }) }
    }
    draw()
    S.raf = requestAnimationFrame(loop)
  }
  window.spmInit = function () {
    if (!S.raf) { S.last = 0; S.raf = requestAnimationFrame(loop) }
    if (!window._spmKeys) {
      window._spmKeys = true
      const on = (e, v) => { if (!el()) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { S.keys[k] = v; e.preventDefault() } if (v && (k === '1' || k === '2')) { const btn = document.querySelectorAll('.spm-opt')[+k - 1]; if (btn) btn.click() } }
      window.addEventListener('keydown', (e) => on(e, true), true)
      window.addEventListener('keyup', (e) => on(e, false), true)
    }
  }
}
