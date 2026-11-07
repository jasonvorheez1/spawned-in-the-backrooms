// The lockpicking HUD: authentic Fallout: New Vegas / Skyrim tactile lock mechanism.
// Heavy brass cylinder, dynamic wavy bobby pin, screwdriver tension wrench, live stress gauge,
// force-lock, auto-unlock, pointer drag steering, and procedural Web Audio SFX.
import { skillsOf, attrsOf } from './lib/stats.js'

function diffName(lv) {
  if (lv <= 25) return 'VERY EASY'
  if (lv <= 50) return 'EASY'
  if (lv <= 75) return 'AVERAGE'
  if (lv <= 99) return 'HARD'
  return 'VERY HARD'
}

export function pickUi(ctx, player) {
  const s = player.state, pk = s?.pick
  if (!pk) return ''

  const level = Number(pk.lv) || 25
  const haveSkill = skillsOf(s).lockpick ?? 0
  const attr = attrsOf(s), luck = attr.l ?? 5
  const pins = s.bobbypins != null ? s.bobbypins : 6
  const sweet = pk.sweet ?? 90
  const w = pk.w ?? 6
  const name = String(pk.name || (pk.kind === 'door' ? 'Locked Door' : 'Locked Crate')).replace(/ \(locked\)/i, '')
  const snap = s.pickSnap && ctx.now() - s.pickSnap < 400
  const forceChance = Math.min(95, Math.max(12, Math.round(20 + (haveSkill - level) * 1.2 + luck * 2)))
  const canAuto = haveSkill >= level + 25

  // Initial angle from server state
  const curP = s.pickP ?? 90
  const curR = s.pickR ?? 0

  return `
<style>
@keyframes lpShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,-2px)} 40%{transform:translate(5px,2px)} 60%{transform:translate(-4px,2px)} 80%{transform:translate(4px,-1px)} }
@keyframes lpPulse { 0%,100%{box-shadow:0 0 12px rgba(255,170,40,0.35)} 50%{box-shadow:0 0 24px rgba(255,170,40,0.65)} }
#lp-modal {
  position: fixed; inset: 0; z-index: 80;
  background: radial-gradient(circle at center, rgba(14,10,6,0.88) 0%, rgba(5,3,1,0.97) 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: 'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;
  color: #ffb642; user-select: none; pointer-events: auto;
  text-shadow: 0 0 3px rgba(255,170,40,0.6);
  box-sizing: border-box;
}
#lp-modal::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px),
              radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%);
  pointer-events: none; z-index: 1;
}
#lp-card {
  position: relative; z-index: 2;
  width: min(580px, calc(100vw - 32px));
  background: rgba(14, 10, 5, 0.95);
  border: 2px solid #ffb642;
  box-shadow: 0 0 24px rgba(255, 170, 40, 0.3), inset 0 0 16px rgba(255, 170, 40, 0.12);
  padding: 16px 20px 14px;
  display: flex; flex-direction: column; align-items: center;
  box-sizing: border-box;
  animation: ${snap ? 'lpShake 0.3s cubic-bezier(.36,.07,.19,.97) both' : 'none'};
}
#lp-head {
  width: 100%; display: flex; justify-content: space-between; align-items: baseline;
  border-bottom: 2px solid #ffb642; padding-bottom: 6px; margin-bottom: 12px;
}
#lp-head .title {
  font-size: 20px; font-weight: 700; letter-spacing: 0.12em;
  display: flex; align-items: center; gap: 8px;
}
#lp-head .sub {
  font-size: 13px; color: rgba(255, 182, 66, 0.65); letter-spacing: 0.08em;
}
#lp-info-bar {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; margin-bottom: 10px; color: rgba(255, 182, 66, 0.85);
  letter-spacing: 0.06em;
}
#lp-info-bar .badge {
  padding: 2px 7px; border: 1px solid #ffb642; background: rgba(255, 182, 66, 0.12);
  color: #ffb642; font-weight: 700;
}
#lp-stage {
  position: relative; width: 330px; height: 330px;
  display: flex; align-items: center; justify-content: center;
  touch-action: none; cursor: crosshair;
}
#lp-svg {
  width: 100%; height: 100%; overflow: visible;
  filter: drop-shadow(0 12px 22px rgba(0,0,0,0.85));
}
#lp-tension-wrap {
  width: 290px; margin-top: 10px; display: flex; flex-direction: column; gap: 4px;
}
#lp-tension-head {
  display: flex; justify-content: space-between; font-size: 11px;
  color: rgba(255,182,66,0.65); letter-spacing: 0.08em;
}
#lp-tension-track {
  width: 100%; height: 9px; border: 1px solid #ffb642; background: rgba(0,0,0,0.7);
  padding: 1px; box-sizing: border-box; overflow: hidden;
}
#lp-tension-bar {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, #ffb642, #ff7b25 68%, #ff2525 95%);
  transition: width 0.04s linear;
}
#lp-controls {
  width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;
  margin-top: 14px; padding-top: 10px; border-top: 1px dashed rgba(255, 182, 66, 0.35);
}
.lp-btn {
  background: rgba(255, 182, 66, 0.12);
  border: 1px solid #ffb642;
  color: #ffb642;
  font-family: inherit; font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em;
  padding: 7px 14px; cursor: pointer; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
  transition: background 0.1s, transform 0.05s;
}
.lp-btn:hover {
  background: rgba(255, 182, 66, 0.28);
  box-shadow: 0 0 8px rgba(255, 182, 66, 0.4);
}
.lp-btn:active {
  transform: translateY(1px);
  background: rgba(255, 182, 66, 0.45);
}
.lp-btn.turn-btn {
  background: linear-gradient(180deg, rgba(255, 182, 66, 0.25), rgba(255, 182, 66, 0.12));
  font-size: 14px; padding: 8px 22px; font-weight: 700;
}
.lp-btn kbd {
  display: inline-block; padding: 0 4px; border: 1px solid #ffb642;
  font-size: 10px; margin-right: 2px; background: rgba(0,0,0,0.3);
}
#lp-hints {
  font-size: 11px; color: rgba(255, 182, 66, 0.6); margin-top: 8px; text-align: center;
}
</style>

<div id="lp-modal" data-modal
     data-target-id="${pk.id}"
     data-level="${level}"
     data-skill="${haveSkill}"
     data-sweet="${sweet}"
     data-tol="${w}"
     data-pins="${pins}"
     data-curp="${curP}"
     data-curr="${curR}">
  <div id="lp-card">
    <div id="lp-head">
      <div class="title">
        <span>🔐 LOCKPICKING</span>
      </div>
      <div class="sub">${name.toUpperCase()}</div>
    </div>

    <div id="lp-info-bar">
      <div>DIFFICULTY: <span class="badge">${diffName(level)} (${level})</span></div>
      <div>YOUR SKILL: <span class="badge">${haveSkill}</span></div>
      <div>BOBBY PINS: <span class="badge" id="lp-pins-count">${pins}</span></div>
    </div>

    <div id="lp-stage" onpointerdown="window.lpPointerDown&&lpPointerDown(event)"
                       onpointermove="window.lpPointerMove&&lpPointerMove(event)"
                       onpointerup="window.lpPointerUp&&lpPointerUp(event)">
      <svg id="lp-svg" viewBox="-160 -160 320 320">
        <defs>
          <!-- Outer Plate Radial Gradient -->
          <radialGradient id="lp-plate-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#2a251e"/>
            <stop offset="68%" stop-color="#181510"/>
            <stop offset="92%" stop-color="#12100c"/>
            <stop offset="100%" stop-color="#3c3426"/>
          </radialGradient>
          <!-- Cylinder Core Brass Gradient -->
          <radialGradient id="lp-plug-grad" cx="42%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#ecc66a"/>
            <stop offset="45%" stop-color="#be9336"/>
            <stop offset="82%" stop-color="#735416"/>
            <stop offset="100%" stop-color="#3b2b09"/>
          </radialGradient>
          <!-- Screwdriver Metal -->
          <linearGradient id="lp-steel-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#646b73"/>
            <stop offset="35%" stop-color="#b8c0c9"/>
            <stop offset="65%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#474d54"/>
          </linearGradient>
          <!-- Screwdriver Handle Grip -->
          <linearGradient id="lp-handle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#451e06"/>
            <stop offset="25%" stop-color="#8a3e0f"/>
            <stop offset="65%" stop-color="#ba5a1c"/>
            <stop offset="100%" stop-color="#351604"/>
          </linearGradient>
          <!-- Bobby Pin Steel Wire -->
          <linearGradient id="lp-pin-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#777e8a"/>
            <stop offset="30%" stop-color="#4a505b"/>
            <stop offset="85%" stop-color="#282a2e"/>
            <stop offset="100%" stop-color="#18191c"/>
          </linearGradient>
        </defs>

        <!-- Heavy Outer Steel/Brass Rim -->
        <circle cx="0" cy="0" r="148" fill="url(#lp-plate-grad)" stroke="#ffb642" stroke-width="2.5" opacity="0.95"/>
        <circle cx="0" cy="0" r="142" fill="none" stroke="#000000" stroke-width="2" opacity="0.65"/>
        <circle cx="0" cy="0" r="138" fill="none" stroke="#685633" stroke-width="1.2" stroke-dasharray="2 6"/>

        <!-- Engraved Calibration Ticks around Upper Arc -->
        <g stroke="#ffb642" stroke-width="1.5" opacity="0.5">
          <line x1="-132" y1="0" x2="-122" y2="0"/>
          <line x1="122" y1="0" x2="132" y2="0"/>
          <line x1="0" y1="-132" x2="0" y2="-122"/>
          <line x1="-93" y1="-93" x2="-86" y2="-86"/>
          <line x1="86" y1="-86" x2="93" y2="-93"/>
          <line x1="-48" y1="-123" x2="-44" y2="-114"/>
          <line x1="44" y1="-114" x2="48" y2="-123"/>
          <line x1="-123" y1="-48" x2="-114" y2="-44"/>
          <line x1="114" y1="-44" x2="123" y2="-48"/>
        </g>

        <!-- 4 Heavy Industrial Mounting Screws -->
        <g fill="#1a1713" stroke="#52442d" stroke-width="1.5">
          <circle cx="-105" cy="-105" r="9"/>
          <line x1="-111" y1="-105" x2="-99" y2="-105" stroke="#ffb642" stroke-width="1.5"/>
          <circle cx="105" cy="-105" r="9"/>
          <line x1="99" y1="-105" x2="111" y2="-105" stroke="#ffb642" stroke-width="1.5"/>
          <circle cx="-105" cy="105" r="9"/>
          <line x1="-111" y1="105" x2="-99" y2="105" stroke="#ffb642" stroke-width="1.5"/>
          <circle cx="105" cy="105" r="9"/>
          <line x1="99" y1="105" x2="111" y2="105" stroke="#ffb642" stroke-width="1.5"/>
        </g>

        <!-- Rotating Inner Cylinder Plug (Turns 0 to 90 deg) -->
        <g id="lp-plug" transform="rotate(${curR})">
          <circle cx="0" cy="0" r="76" fill="url(#lp-plug-grad)" stroke="#221703" stroke-width="3"/>
          <!-- Concentric Lathe Grooves -->
          <circle cx="0" cy="0" r="66" fill="none" stroke="#997424" stroke-width="0.8" opacity="0.6"/>
          <circle cx="0" cy="0" r="54" fill="none" stroke="#684e16" stroke-width="0.8" opacity="0.6"/>
          <circle cx="0" cy="0" r="40" fill="none" stroke="#997424" stroke-width="0.8" opacity="0.5"/>
          <!-- Keyway Broached Face Plate -->
          <rect x="-8" y="-38" width="16" height="74" rx="3" fill="#140f05" stroke="#4a3710" stroke-width="1.5"/>
          <!-- Keyway Slot Cavity with Internal Tumbler Step Profile -->
          <path d="M-4.5,-30 L4.5,-30 L4.5,-8 L6.5,-6 L6.5,8 L4,10 L4.5,28 L-4.5,28 L-4,10 L-6.5,8 L-6.5,-6 L-4.5,-8 Z"
                fill="#050402" stroke="#000" stroke-width="1"/>

          <!-- Screwdriver / Tension Tool (Fitted into Lower Keyway, Rotates with Plug) -->
          <g id="lp-wrench" transform="translate(0, 16)">
            <!-- Flat blade insertion -->
            <polygon points="-3.5,-16 3.5,-16 4,4 -4,4" fill="url(#lp-steel-grad)" stroke="#2b2d30" stroke-width="0.8"/>
            <!-- Shaft extending down-left -->
            <path d="M-4,4 L4,4 L12,120 L-6,120 Z" fill="url(#lp-steel-grad)" stroke="#1a1c1e" stroke-width="1"/>
            <line x1="0" y1="4" x2="3" y2="120" stroke="#fff" stroke-width="1" opacity="0.45"/>
            <!-- Knurled Grip Handle -->
            <rect x="-14" y="90" width="28" height="65" rx="5" fill="url(#lp-handle-grad)" stroke="#260f02" stroke-width="1.5"/>
            <line x1="-12" y1="105" x2="12" y2="105" stroke="#ff8533" stroke-width="1" opacity="0.5"/>
            <line x1="-12" y1="120" x2="12" y2="120" stroke="#ff8533" stroke-width="1" opacity="0.5"/>
            <line x1="-12" y1="135" x2="12" y2="135" stroke="#ff8533" stroke-width="1" opacity="0.5"/>
          </g>
        </g>

        <!-- Bobby Pin Layer (Rotates freely around center 0,0, shaken by tension) -->
        <g id="lp-pin-rot" transform="rotate(${curP - 90})">
          <g id="lp-pin-shake" transform="translate(0, 0)">
            <!-- Top Loop Spring Eye -->
            <circle cx="0" cy="-148" r="8" fill="none" stroke="url(#lp-pin-grad)" stroke-width="3.6"/>
            <!-- Straight Base Leg -->
            <path d="M-3.5,-140 L-3.5,-18" stroke="url(#lp-pin-grad)" stroke-width="3.2" stroke-linecap="round"/>
            <!-- Classic Crimped Wavy Leg -->
            <path d="M3.5,-140 Q 9,-122 3.5,-106 Q 9,-90 3.5,-74 Q 9,-58 3.5,-42 L1.5,-18"
                  fill="none" stroke="url(#lp-pin-grad)" stroke-width="3" stroke-linecap="round"/>
            <!-- Bent Pick Probe Tip inserted into upper keyway -->
            <path id="lp-pin-tip" d="M-3.5,-18 L-2,-4 L0,-2" stroke="#8c94a0" stroke-width="3" stroke-linecap="round"/>
            <!-- Protective Rubber Coated Tips at Spring Base -->
            <circle cx="0" cy="-148" r="4" fill="#18181b"/>
          </g>
        </g>
      </svg>
    </div>

    <!-- Tension / Stress Gauge -->
    <div id="lp-tension-wrap">
      <div id="lp-tension-head">
        <span>PIN STRESS</span>
        <span id="lp-deg-readout">${Math.round(curP - 90)}°</span>
      </div>
      <div id="lp-tension-track">
        <div id="lp-tension-bar"></div>
      </div>
    </div>

    <!-- Interactive Actions -->
    <div id="lp-controls">
      <button class="lp-btn turn-btn" id="lp-turn-btn"
              onpointerdown="window.lpTurnDown&&lpTurnDown(event)"
              onpointerup="window.lpTurnUp&&lpTurnUp(event)"
              onpointerleave="window.lpTurnUp&&lpTurnUp(event)">
        <kbd>SPACE / W</kbd> TURN LOCK
      </button>
      <button class="lp-btn" onclick="window.lpForceLock&&lpForceLock()">
        <kbd>F</kbd> FORCE (${forceChance}%)
      </button>
      ${canAuto ? `
      <button class="lp-btn" onclick="window.lpAutoUnlock&&lpAutoUnlock()">
        <kbd>X</kbd> AUTO-UNLOCK
      </button>` : ''}
      <button class="lp-btn" onclick="window.lpCloseModal&&lpCloseModal()">
        <kbd>ESC / S</kbd> LEAVE
      </button>
    </div>

    <div id="lp-hints">
      DRAG MOUSE or [A·D] Angle Pin · HOLD [SPACE / W] Turn Cylinder · [F] Force · Pins break under stress!
    </div>
  </div>

  <!-- Hidden Hook to Initialize Client Animation & Audio -->
  <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
       style="display:none"
       onload="window.lpInit&&lpInit()"
       onerror="window.lpInit&&lpInit()">
</div>
`
}

// -------------------------------------------------------------
// Client-Side Minigame Engine & Web Audio Procedural Synthesis
// -------------------------------------------------------------

let _lpAudio = null
function getAudio() {
  if (!_lpAudio) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) _lpAudio = new AC()
  }
  if (_lpAudio && _lpAudio.state === 'suspended') {
    _lpAudio.resume().catch(() => {})
  }
  return _lpAudio
}

function sfxClick(pitch = 1.0) {
  try {
    const actx = getAudio(); if (!actx) return
    const now = actx.currentTime
    const osc = actx.createOscillator()
    const g = actx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1400 * pitch, now)
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.014)
    g.gain.setValueAtTime(0.06, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.014)
    osc.connect(g); g.connect(actx.destination)
    osc.start(now); osc.stop(now + 0.014)
  } catch (e) {}
}

function sfxTurn(progress = 0) {
  try {
    const actx = getAudio(); if (!actx) return
    const now = actx.currentTime
    const osc = actx.createOscillator()
    const g = actx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120 + progress * 70, now)
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.035)
    g.gain.setValueAtTime(0.03, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
    osc.connect(g); g.connect(actx.destination)
    osc.start(now); osc.stop(now + 0.035)
  } catch (e) {}
}

function sfxJitter(stress = 0) {
  try {
    const actx = getAudio(); if (!actx) return
    const now = actx.currentTime
    const osc = actx.createOscillator()
    const g = actx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(400 + (stress / 100) * 850, now)
    g.gain.setValueAtTime(0.045 * (stress / 100), now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
    osc.connect(g); g.connect(actx.destination)
    osc.start(now); osc.stop(now + 0.02)
  } catch (e) {}
}

function sfxSnap() {
  try {
    const actx = getAudio(); if (!actx) return
    const now = actx.currentTime
    const osc = actx.createOscillator()
    const g = actx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(3100, now)
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.08)
    g.gain.setValueAtTime(0.32, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc.connect(g); g.connect(actx.destination)
    osc.start(now); osc.stop(now + 0.08)
  } catch (e) {}
}

function sfxUnlock() {
  try {
    const actx = getAudio(); if (!actx) return
    const now = actx.currentTime
    const o1 = actx.createOscillator(), g1 = actx.createGain()
    o1.type = 'sine'
    o1.frequency.setValueAtTime(150, now)
    o1.frequency.exponentialRampToValueAtTime(45, now + 0.16)
    g1.gain.setValueAtTime(0.35, now)
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.16)
    o1.connect(g1); g1.connect(actx.destination)
    o1.start(now); o1.stop(now + 0.16)

    const o2 = actx.createOscillator(), g2 = actx.createGain()
    o2.type = 'triangle'
    o2.frequency.setValueAtTime(1046.5, now + 0.03) // C6
    o2.frequency.setValueAtTime(1318.5, now + 0.09) // E6
    g2.gain.setValueAtTime(0.18, now + 0.03)
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
    o2.connect(g2); g2.connect(actx.destination)
    o2.start(now + 0.03); o2.stop(now + 0.32)
  } catch (e) {}
}

// Global state on window
if (typeof window !== 'undefined') {
  let S = (window._lp = window._lp || {
    targetId: '',
    pinP: 90,       // 0..180 (90 = straight up)
    turnR: 0,       // 0..90
    stress: 0,
    isTurning: false,
    isDraggingPin: false,
    sweet: 90,
    tol: 6,
    pins: 6,
    level: 25,
    skill: 25,
    done: false,
    lastTime: 0,
    lastTick: 90,
    raf: null,
    keys: { left: false, right: false, turn: false },
  })

  window.lpInit = function() {
    const el = document.getElementById('lp-modal')
    if (!el) return
    const targetId = el.getAttribute('data-target-id') || ''
    const sweet = parseFloat(el.getAttribute('data-sweet') || '90')
    const tol = parseFloat(el.getAttribute('data-tol') || '6')
    const level = parseInt(el.getAttribute('data-level') || '25', 10)
    const skill = parseInt(el.getAttribute('data-skill') || '25', 10)
    const pins = parseInt(el.getAttribute('data-pins') || '6', 10)
    const curP = parseFloat(el.getAttribute('data-curp') || '90')
    const curR = parseFloat(el.getAttribute('data-curr') || '0')

    if (S.targetId !== targetId) {
      S.targetId = targetId
      S.pinP = curP
      S.turnR = curR
      S.stress = 0
      S.isTurning = false
      S.isDraggingPin = false
      S.sweet = sweet
      S.tol = tol
      S.level = level
      S.skill = skill
      S.pins = pins
      S.done = false
      S.lastTick = curP
    }

    if (!S.raf) {
      S.lastTime = performance.now()
      S.raf = requestAnimationFrame(lpLoop)
    }

    if (!window._lpKeyBound) {
      window._lpKeyBound = true
      window.addEventListener('keydown', (e) => {
        if (!document.getElementById('lp-modal') || S.done) return
        if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
          e.preventDefault(); window.lpCloseModal(); return
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault(); window.lpForceLock(); return
        }
        if (e.key === 'x' || e.key === 'X') {
          e.preventDefault(); window.lpAutoUnlock(); return
        }
        if (e.key === ' ' || e.key === 'w' || e.key === 'W') {
          e.preventDefault(); S.keys.turn = true
        }
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          S.keys.left = true
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          S.keys.right = true
        }
      })

      window.addEventListener('keyup', (e) => {
        if (e.key === ' ' || e.key === 'w' || e.key === 'W') S.keys.turn = false
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') S.keys.left = false
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') S.keys.right = false
      })
    }
  }

  function lpLoop(now) {
    const el = document.getElementById('lp-modal')
    if (!el) {
      S.raf = null
      return
    }
    const dt = Math.min(0.08, (now - S.lastTime) / 1000)
    S.lastTime = now

    // Keyboard nudge for pin angle
    if (S.turnR <= 2) {
      if (S.keys.left) S.pinP = Math.max(0, S.pinP - dt * 85)
      if (S.keys.right) S.pinP = Math.min(180, S.pinP + dt * 85)
    }

    const wantsTurn = S.keys.turn || S.isTurning

    if (!S.done && wantsTurn && S.pins > 0) {
      const off = Math.abs(S.pinP - S.sweet)
      let maxR = 0
      if (off <= S.tol) {
        maxR = 90
      } else {
        maxR = Math.max(0, 90 * (1 - (off - S.tol) / 40))
      }

      if (S.turnR < maxR) {
        S.turnR = Math.min(maxR, S.turnR + dt * 240)
        sfxTurn(S.turnR / 90)
      } else {
        if (maxR >= 90 && S.turnR >= 89.5) {
          S.done = true
          sfxUnlock()
          const card = document.getElementById('lp-card')
          if (card) {
            card.style.borderColor = '#39ff14'
            card.style.boxShadow = '0 0 35px rgba(57,255,20,0.65)'
          }
          if (window.sendAction) {
            window.sendAction('pick', { k: 'success', id: S.targetId })
          }
        } else {
          S.stress += dt * 68
          sfxJitter(S.stress)
          if (S.stress >= 100) {
            sfxSnap()
            S.pins = Math.max(0, S.pins - 1)
            S.turnR = 0
            S.stress = 0
            S.isTurning = false
            S.keys.turn = false
            const pCount = document.getElementById('lp-pins-count')
            if (pCount) pCount.textContent = S.pins
            if (window.sendAction) {
              window.sendAction('pick', { k: 'snap', id: S.targetId })
            }
          }
        }
      }
    } else if (!S.done) {
      if (S.turnR > 0) {
        S.turnR = Math.max(0, S.turnR - dt * 420)
      }
      S.stress = Math.max(0, S.stress - dt * 140)
    }

    const jitter = (S.stress / 100) * 3.8 * (Math.random() - 0.5)

    const pinRot = document.getElementById('lp-pin-rot')
    if (pinRot) pinRot.setAttribute('transform', `rotate(${S.pinP - 90})`)

    const pinShake = document.getElementById('lp-pin-shake')
    if (pinShake) pinShake.setAttribute('transform', `translate(${jitter}, ${jitter * 0.4})`)

    const plug = document.getElementById('lp-plug')
    if (plug) plug.setAttribute('transform', `rotate(${S.turnR})`)

    const bar = document.getElementById('lp-tension-bar')
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, S.stress))}%`

    const deg = document.getElementById('lp-deg-readout')
    if (deg) deg.textContent = `${Math.round(S.pinP - 90)}°`

    S.raf = requestAnimationFrame(lpLoop)
  }

  window.lpPointerDown = function(e) {
    if (S.done || S.turnR > 4) return
    S.isDraggingPin = true
    window.lpPointerMove(e)
  }

  window.lpPointerMove = function(e) {
    if (!S.isDraggingPin || S.done || S.turnR > 4) return
    const stage = document.getElementById('lp-stage')
    if (!stage) return
    const r = stage.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const deg = Math.atan2(dx, -dy) * (180 / Math.PI)
    // Map -88..+88 deg to 2..178 in pinP
    const clampedDeg = Math.max(-88, Math.min(88, deg))
    const p = clampedDeg + 90

    if (Math.abs(p - S.lastTick) > 6) {
      sfxClick(0.9 + Math.abs(clampedDeg) / 200)
      S.lastTick = p
    }
    S.pinP = p
  }

  window.lpPointerUp = function(e) {
    S.isDraggingPin = false
  }

  window.lpTurnDown = function(e) {
    e.preventDefault()
    if (S.done || S.pins <= 0) return
    S.isTurning = true
  }

  window.lpTurnUp = function(e) {
    if (e) e.preventDefault()
    S.isTurning = false
  }

  window.lpForceLock = function() {
    if (S.done || !window.sendAction) return
    window.sendAction('pick', { k: 'force', id: S.targetId })
  }

  window.lpAutoUnlock = function() {
    if (S.done || !window.sendAction) return
    window.sendAction('pick', { k: 'auto', id: S.targetId })
  }

  window.lpCloseModal = function() {
    if (window.sendAction) {
      window.sendAction('pick', { k: 'close' })
    }
  }
}
