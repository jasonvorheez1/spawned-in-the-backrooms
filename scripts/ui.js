// Level 0 "The Lobby" HUD:
// Designed with authentic Wikidot Backrooms aesthetics:
// - Found-Footage / Camcorder bodycam viewfinder with REC indicator and tape timestamp.
// - M.E.G. (Major Explorer Group) Field Telemetry & Survival Dossier.
// - Real-time Biometrics (Health, Sanity Index with mental status diagnosis, Motor Stamina).
// - Tactical Inventory (Equipped Weapon, Almond Water fluid oz, Flashlight battery cell readout).
// - Atmospheric Zone Entry banners with Wikidot lore field notes.
// - Dynamic low-sanity tracking distortion, low-health arterial heartbeat, and noclip transitions.
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
import { ZONE_NAMES } from './lib/maze.js'

const THEME = `<style>
:root {
  --bk-amber: oklch(0.85 0.14 85);
  --bk-yellow: oklch(0.88 0.16 95);
  --bk-red: oklch(0.65 0.22 28);
  --bk-cyan: oklch(0.78 0.12 210);
  --bk-purple: oklch(0.74 0.16 305);
  --bk-dark: oklch(0.12 0.02 85);
  --bk-bg: rgba(14, 13, 10, 0.82);
  --bk-border: rgba(212, 185, 106, 0.35);
  --bk-text: #f5f2e8;
  --bk-dim: rgba(245, 242, 232, 0.65);
}

#hud {
  color: var(--bk-text);
  font-family: 'Geist Pixel', 'Courier New', Consolas, monospace;
  font-size: 13px;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.85);
  user-select: none;
}

.panel {
  background: var(--bk-bg);
  border: 1px solid var(--bk-border);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.65), inset 0 0 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 10px 14px;
  position: relative;
}

.panel::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 244, 214, 0.4), transparent);
}

.cam-bracket {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: rgba(245, 242, 232, 0.45);
  pointer-events: none;
}
.cam-tl { top: 20px; left: 20px; border-top: 2px solid; border-left: 2px solid; }
.cam-tr { top: 20px; right: calc(var(--spawn-chrome-reservation-right-inset, 50px) + 20px); border-top: 2px solid; border-right: 2px solid; }
.cam-bl { bottom: 20px; left: 20px; border-bottom: 2px solid; border-left: 2px solid; }
.cam-br { bottom: 20px; right: calc(var(--spawn-chrome-reservation-right-inset, 50px) + 20px); border-bottom: 2px solid; border-right: 2px solid; }

.reticle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  pointer-events: none;
  opacity: 0.55;
}
.reticle::before, .reticle::after {
  content: "";
  position: absolute;
  background: var(--bk-text);
}
.reticle::before { top: 7px; left: 0; width: 16px; height: 2px; }
.reticle::after { top: 0; left: 7px; width: 2px; height: 16px; }

.rec-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.rec-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff3b30;
  box-shadow: 0 0 10px #ff3b30;
  animation: blink-rec 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.badge-class1 {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  background: rgba(52, 199, 89, 0.18);
  border: 1px solid rgba(52, 199, 89, 0.6);
  color: #5deb87;
  text-shadow: 0 0 8px rgba(52, 199, 89, 0.6);
  margin-left: 8px;
  vertical-align: middle;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.lbl {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--bk-dim);
  text-transform: uppercase;
}

.val {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.meter {
  height: 10px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(212, 185, 106, 0.25);
  position: relative;
  overflow: hidden;
  margin-top: 3px;
}
.meter-fill {
  height: 100%;
  transition: width 0.22s ease-out;
  position: relative;
}
.meter-fill::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.22) 50%, transparent 100%);
}

kbd {
  display: inline-block;
  padding: 1px 5px;
  font-family: inherit;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 2px;
  color: #fff;
  margin-right: 3px;
}

@keyframes blink-rec {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.25; transform: scale(0.9); }
}

@keyframes pulse-vignette {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.35; }
}

@keyframes tape-glitch {
  0% { transform: translateY(0); }
  20% { transform: translateY(-2px); }
  40% { transform: translateY(1px); }
  60% { transform: translateY(-1px); }
  80% { transform: translateY(2px); }
  100% { transform: translateY(0); }
}

@keyframes cinematic-drop {
  0% { opacity: 0; transform: translateY(-16px); }
  12% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(8px); }
}

@media (max-width: 640px) {
  #hud .bl, #hud .br {
    bottom: auto !important;
    top: 10px !important;
    transform: scale(0.72);
    transform-origin: top left;
  }
  #hud .br {
    transform-origin: top right;
    right: 55px !important;
  }
  #hud .tl { display: none; }
  #hud #hint { display: none; }
  .cam-bracket { display: none; }
}
</style>`

const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity

const ZONE_DESCRIPTIONS = {
  hub: 'M.E.G. SAFE OUTPOST · SANITY STABILIZATION · ZERO ENTITY THREAT',
  halls: 'MONO-YELLOW SECTOR · PERSISTENT FLUORESCENT HUM-BUZZ · CLASS 1 HAZARD',
  arches: 'ARCHED CORRIDORS · HEIGHTENED ACOUSTIC ECHOES · SIGHTLINES RESTRICTED',
  pillars: 'PILLAR FIELD · COMPLEX CORRIDOR GEOMETRY · AMBUSH HAZARD',
  holes: 'DECAYED PIT SECTOR · SUB-FLOOR STRUCTURAL COLLAPSE',
  red: 'WARNING: ANOMALOUS RED LIGHT · HIGH SANITY DECAY RATE',
  dark: 'BLACKOUT ZONE · TOTAL LIGHT FAILURE · HIGH ENTITY ACTIVITY',
}

function meter(label, current, max, color, subtext = '') {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  return `
    <div style="margin-top:7px">
      <div class="row">
        <span class="lbl">${label}</span>
        <span class="val" style="color:${color}">${subtext || `${Math.ceil(current)}/${max}`}</span>
      </div>
      <div class="meter">
        <div class="meter-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`
}

export default function render(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now(), lv = s.level, mh = maxHp(lv), ms = maxSan(lv)
  const hpF = Math.max(0, s.hp / mh), sanF = Math.max(0, s.sanity / ms)
  const zone = s.zone ?? 'hub'
  const acts = ctx.world.inputs?.actions ?? {}
  const lab = (n, d) => acts[n]?.label ?? d
  const down = s.downAt && now - s.downAt < 3800
  const out = s.exitAt && now - s.exitAt < 4800
  const lvl = s.leveledAt && now - s.leveledAt < 3200

  // Camcorder tape elapsed time
  const totalSec = Math.floor(now / 1000)
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const sec = String(totalSec % 60).padStart(2, '0')

  // Sanity diagnosis tag
  const sanStatus = sanF > 0.7 ? 'STABLE' : sanF > 0.4 ? 'PARANOIA' : sanF > 0.15 ? 'DISSOCIATION' : 'CRITICAL PSYCHOSIS'
  const sanColor = sanF > 0.7 ? 'var(--bk-cyan)' : sanF > 0.4 ? 'var(--bk-amber)' : 'var(--bk-red)'

  // Health color grading
  const hpColor = hpF > 0.5 ? 'var(--bk-amber)' : 'var(--bk-red)'

  // Weapon data
  const currentWeapon = W[s.equipped] ?? W.fists
  const have = ['fists', ...(s.weapons ? s.weapons.split(',') : [])].filter((k) => W[k])
  const invHtml = have.map((k) => {
    const w = W[k], ok = lv >= w.minLevel, col = (W.rarities[w.rarity] ?? {}).color ?? '#c9c2a0'
    return `<span style="color:${ok ? col : 'var(--bk-dim)'};${k === s.equipped ? 'text-decoration:underline;' : ''}margin-right:8px">${w.name}${ok ? '' : ' (LV ' + w.minLevel + ')'}</span>`
  }).join('')

  return `${THEME}
<div id="hud" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">

  <!-- Optical Camera Viewfinder Brackets -->
  <div class="cam-bracket cam-tl"></div>
  <div class="cam-bracket cam-tr"></div>
  <div class="cam-bracket cam-bl"></div>
  <div class="cam-bracket cam-br"></div>

  <!-- Minimalist Aim Reticle -->
  <div class="reticle"></div>

  <!-- Dynamic Sanity Distortion & Low Health Vignette -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,oklch(0.06 0.02 290) 100%);opacity:${(1 - sanF) * 0.95}"></div>
  ${hpF < 0.35 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 48%,rgba(160,20,15,0.7) 100%);animation:pulse-vignette 1.05s infinite;opacity:${(0.35 - hpF) * 2.8}"></div>` : ''}
  ${sanF < 0.25 ? `<div style="position:absolute;inset:0;background:linear-gradient(rgba(18,16,12,0) 50%, rgba(0,0,0,0.3) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06));background-size:100% 3px, 6px 100%;pointer-events:none;opacity:${(0.25 - sanF) * 3.5}"></div>` : ''}

  <!-- TOP-LEFT: Camcorder Header & M.E.G. Survey Dossier -->
  <div class="panel tl" style="position:absolute;left:24px;top:24px;min-width:270px;max-width:320px">
    <div class="row" style="border-bottom:1px solid rgba(212,185,106,0.2);padding-bottom:5px;margin-bottom:6px">
      <div class="rec-badge"><span class="rec-dot"></span>REC <span style="font-weight:400;color:var(--bk-dim);font-size:11px">SP ${m}:${sec}</span></div>
      <span class="badge-class1">CLASS 1 · SAFE</span>
    </div>

    <div class="row" style="align-items:center">
      <div>
        <div style="font-size:10px;color:var(--bk-dim);letter-spacing:0.12em">M.E.G. DOSSIER // LEVEL 0</div>
        <div style="font-size:17px;font-weight:700;color:var(--bk-yellow);letter-spacing:0.04em">THE LOBBY</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">RANK</div>
        <div style="font-size:22px;font-weight:700;color:var(--bk-text);line-height:1">LV ${lv}</div>
      </div>
    </div>

    ${meter('EXP PROGRESS', s.xp, L.xpBase * lv, 'var(--bk-yellow)', `${s.xp} / ${L.xpBase * lv} XP`)}

    <div class="row" style="margin-top:8px;padding-top:6px;border-top:1px dashed rgba(212,185,106,0.2);font-size:10px;color:var(--bk-dim)">
      <span>NODES: <b style="color:var(--bk-text)">${s.explored ?? 0}</b></span>
      <span>SMILERS: <b style="color:var(--bk-text)">${s.kills ?? 0}</b></span>
      <span>EXITS: <b style="color:var(--bk-text)">${s.escapes ?? 0}</b></span>
    </div>
  </div>

  <!-- BOTTOM-LEFT: Vital Telemetry (Health, Sanity, Stamina) -->
  <div class="panel bl" style="position:absolute;left:24px;bottom:24px;width:min(290px, 46vw)">
    <div class="row" style="border-bottom:1px solid rgba(212,185,106,0.2);padding-bottom:4px;margin-bottom:6px">
      <span class="lbl" style="font-weight:700;color:var(--bk-text)">BIOMETRIC TELEMETRY</span>
      <span style="font-size:10px;color:${sanColor};font-weight:700">[${sanStatus}]</span>
    </div>

    ${meter('VITALS', s.hp, mh, hpColor, `${Math.ceil(s.hp)} / ${mh}`)}
    ${meter('SANITY INDEX', s.sanity, ms, 'var(--bk-purple)', `${Math.ceil(s.sanity)}%`)}
    ${meter('MOTOR STAMINA', s.stamina, L.stamina, 'var(--bk-amber)', `${Math.ceil(s.stamina)}%`)}
  </div>

  <!-- BOTTOM-RIGHT: Tactical Equipment (Weapon, Almond Water, Flashlight) -->
  <div class="panel br" style="position:absolute;bottom:24px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);min-width:220px">
    <div class="row" style="border-bottom:1px solid rgba(212,185,106,0.2);padding-bottom:4px;margin-bottom:6px">
      <span class="lbl" style="font-weight:700;color:var(--bk-text)">SURVIVAL ARSENAL</span>
      <span style="font-size:10px;color:var(--bk-dim)">FIELD KIT</span>
    </div>

    <!-- Equipped Weapon Section -->
    <div style="margin-bottom:7px">
      <div class="row">
        <span class="lbl">WEAPON</span>
        <span style="font-size:15px;font-weight:700;color:var(--bk-yellow)">${currentWeapon.name}</span>
      </div>
      <div style="margin-top:3px;font-size:11px;font-weight:700;color:${(W.rarities[currentWeapon.rarity] ?? {}).color ?? 'var(--bk-dim)'}">${(W.rarities[currentWeapon.rarity] ?? {}).label ?? 'BARE HANDS'}</div>
      <div style="margin-top:4px;font-size:10px;line-height:1.5">${invHtml}</div>
      <div class="lbl" style="margin-top:2px;font-size:10px"><kbd>${lab('cycleWeapon', 'E')}</kbd> SWITCH (DMG ${currentWeapon.damage} · REACH ${currentWeapon.reach}m)</div>
    </div>

    <!-- Almond Water Section -->
    <div style="border-top:1px dashed rgba(212,185,106,0.2);padding-top:5px;margin-bottom:7px">
      <div class="row">
        <span class="lbl">ALMOND WATER</span>
        <span style="font-size:16px;font-weight:700;color:var(--bk-yellow)">${s.almonds}<small style="font-size:11px;color:var(--bk-dim)">/${L.almondMax}</small></span>
      </div>
      <div class="lbl" style="margin-top:2px;font-size:10px"><kbd>${lab('drink', 'Q')}</kbd> DRINK (+${L.almondHp} HP · +${L.almondSanity} SAN)</div>
    </div>

    <!-- Flashlight Section -->
    <div style="border-top:1px dashed rgba(212,185,106,0.2);padding-top:5px">
      <div class="row">
        <span class="lbl">FLASHLIGHT</span>
        <span class="val" style="color:${s.light ? 'var(--bk-yellow)' : 'var(--bk-dim)'}">${s.light ? 'ACTIVE [ON]' : 'STANDBY'}</span>
      </div>
      ${meter('BATTERY', s.battery, L.battery, s.light ? 'var(--bk-yellow)' : 'rgba(212,185,106,0.4)', `${Math.round(s.battery)}%`)}
      <div class="lbl" style="margin-top:3px;font-size:10px"><kbd>${lab('flashlight', 'F')}</kbd> TOGGLE LIGHT</div>
    </div>
  </div>

  <!-- CENTER: Zone Discovery Banner -->
  <div id="z-${zone}" style="position:absolute;left:0;right:0;text-align:center;top:130px;animation:cinematic-drop 4.2s forwards;pointer-events:none">
    <div style="font-size:11px;letter-spacing:0.35em;color:var(--bk-dim)">// SECTOR CARTOGRAPHY //</div>
    <div style="font-size:38px;font-weight:700;line-height:1.15;color:${zone === 'red' ? 'var(--bk-red)' : zone === 'dark' ? 'var(--bk-cyan)' : 'var(--bk-yellow)'};letter-spacing:0.06em;text-shadow:0 0 20px rgba(0,0,0,0.9)">
      ${ZONE_NAMES[zone] ?? 'LEVEL 0'}
    </div>
    <div style="font-size:13px;color:var(--bk-dim);letter-spacing:0.08em;margin-top:4px">
      ${ZONE_DESCRIPTIONS[zone] ?? ''}
    </div>
  </div>

  <!-- DEFEAT / NOCLIP LOSS OVERLAY -->
  ${down ? `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,7,5,0.85);backdrop-filter:blur(12px);animation:cinematic-drop 3.6s forwards">
    <div class="panel" style="text-align:center;padding:26px 40px;border-color:var(--bk-red);box-shadow:0 0 50px rgba(220,38,38,0.3)">
      <div style="font-size:12px;color:var(--bk-red);letter-spacing:0.25em;font-weight:700">// CONSCIOUSNESS DECAY //</div>
      <div style="font-size:42px;font-weight:700;line-height:1.1;color:#fff;margin:8px 0;letter-spacing:0.05em">YOU NOCLIPPED OUT</div>
      <div class="lbl" style="font-size:12px;color:var(--bk-dim)">AWAKENED IN M.E.G. SAFE OUTPOST · YOU KEEP ALL GEAR · RANK PRESERVED</div>
    </div>
  </div>` : ''}

  <!-- VICTORY / EXIT FOUND OVERLAY -->
  ${out ? `
  <div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:35%;animation:cinematic-drop 4.6s forwards">
    <div class="panel" style="text-align:center;padding:22px 36px;border-color:var(--bk-yellow);box-shadow:0 0 50px rgba(250,204,21,0.35)">
      <div style="font-size:12px;color:var(--bk-yellow);letter-spacing:0.25em;font-weight:700">// QUANTUM ANOMALY BREACHED //</div>
      <div style="font-size:38px;font-weight:700;line-height:1.1;color:#fff;margin:6px 0;letter-spacing:0.04em">WAY OUT LOCATED</div>
      <div class="lbl" style="font-size:12px;color:var(--bk-dim)">+${L.xpExit} EXP · LEVEL 1 FORMATION IN PROGRESS · RETURNING TO THRESHOLD...</div>
    </div>
  </div>` : ''}

  <!-- LEVEL UP CELEBRATION -->
  ${lvl ? `
  <div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:22%;animation:cinematic-drop 3.2s forwards">
    <div class="panel" style="text-align:center;padding:14px 28px;border-color:var(--bk-yellow)">
      <div style="font-size:11px;color:var(--bk-yellow);letter-spacing:0.2em">WANDERER ELEVATION</div>
      <div style="font-size:42px;font-weight:700;color:var(--bk-text);line-height:1">RANK ${lv} ACHIEVED</div>
    </div>
  </div>` : ''}

  <!-- INITIAL SURVIVAL HINT -->
  <div id="hint" style="position:absolute;left:0;right:0;text-align:center;padding:0 calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);bottom:210px;font-size:14px;color:var(--bk-dim);animation:cinematic-drop 8s 1s forwards;opacity:0">
    <kbd>${lab('attack', 'CLICK')}</kbd> ATTACK · <kbd>${lab('cycleWeapon', 'E')}</kbd> SWITCH WEAPON · <kbd>${lab('sprint', 'SHIFT')}</kbd> SPRINT · <kbd>${lab('flashlight', 'F')}</kbd> LIGHT · <kbd>${lab('drink', 'Q')}</kbd> RATIONS · SEARCH FOR THE GLITCHING WALL
  </div>

</div>`
}
