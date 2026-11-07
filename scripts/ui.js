// Level 0 "The Lobby" HUD
// Clean, minimal, and atmospheric.
// Designed with quiet restraint: unobstructed sightlines, crisp typography, and non-intrusive status readouts.
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
import { ZONE_NAMES } from './lib/maze.js'

const THEME = `<style>
#hud {
  color: #e8e4d8;
  font-family: 'Geist Pixel', ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  user-select: none;
}

.hud-card {
  background: rgba(12, 11, 9, 0.75);
  border: 1px solid rgba(220, 205, 160, 0.16);
  padding: 8px 12px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.muted {
  color: rgba(232, 228, 216, 0.55);
  font-size: 11px;
}

.bar-wrap {
  height: 6px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.2s ease-out;
}

.dot-crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 3px;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  pointer-events: none;
}

kbd {
  display: inline-block;
  padding: 0 4px;
  font-family: inherit;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 2px;
  color: #fff;
  margin-right: 2px;
}

@keyframes hud-fade {
  0% { opacity: 0; transform: translateY(-4px); }
  10% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(4px); }
}

@keyframes pulse-red {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.2; }
}

@media (max-width: 640px) {
  #hud .bl, #hud .br {
    bottom: auto !important;
    top: 10px !important;
    transform: scale(0.8);
    transform-origin: top left;
  }
  #hud .br {
    transform-origin: top right;
    right: 55px !important;
  }
  #hud .tl, #hud #hint { display: none; }
}
</style>`

const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity

function bar(label, cur, max, color, valText = '') {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100))
  return `
    <div style="margin-top:6px">
      <div class="row">
        <span class="muted">${label}</span>
        <span style="font-size:11px;color:${color}">${valText || Math.ceil(cur)}</span>
      </div>
      <div class="bar-wrap">
        <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
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
  const down = s.downAt && now - s.downAt < 3500
  const out = s.exitAt && now - s.exitAt < 4200
  const lvl = s.leveledAt && now - s.leveledAt < 3000

  const wp = W[s.equipped] ?? W.fists
  const sanColor = sanF > 0.5 ? 'oklch(0.78 0.12 300)' : sanF > 0.25 ? 'oklch(0.8 0.14 85)' : 'oklch(0.65 0.22 28)'
  const hpColor = hpF > 0.35 ? 'oklch(0.75 0.12 85)' : 'oklch(0.65 0.22 28)'

  const have = ['fists', ...(s.weapons ? s.weapons.split(',') : [])].filter((k) => W[k])
  const invHtml = have.length > 1 ? have.map((k) => `<span style="color:${k === s.equipped ? '#f0ece0' : 'rgba(232,228,216,0.35)'};margin-right:6px">${W[k].name}</span>`).join('') : ''

  return `${THEME}
<div id="hud" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">

  <!-- Unobtrusive Center Point -->
  <div class="dot-crosshair"></div>

  <!-- Subtle Sanity Edge Vignette (gently narrows peripheral vision as sanity drops) -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(8,7,5,0.92) 100%);opacity:${(1 - sanF) * 0.85}"></div>

  <!-- Low Health Edge Pulse -->
  ${hpF < 0.3 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(140,20,15,0.6) 100%);animation:pulse-red 1.2s infinite;opacity:${(0.3 - hpF) * 2.5}"></div>` : ''}

  <!-- TOP-LEFT: Clean World & Player Status -->
  <div class="hud-card tl" style="position:absolute;left:20px;top:20px;min-width:170px">
    <div class="row">
      <span style="font-size:13px;font-weight:600;color:#f0ece0">Level 0 · The Lobby</span>
      <span class="muted">Lv ${lv}</span>
    </div>
    ${bar('XP', s.xp, L.xpBase * lv, 'oklch(0.82 0.12 85)', `${s.xp}/${L.xpBase * lv}`)}
    <div class="muted" style="margin-top:4px;font-size:10px">${s.explored ?? 0} explored · ${s.kills ?? 0} smilers</div>
  </div>

  <!-- BOTTOM-LEFT: Vitals (Health, Sanity, Stamina) -->
  <div class="hud-card bl" style="position:absolute;left:20px;bottom:20px;width:min(200px, 42vw)">
    ${bar('Health', s.hp, mh, hpColor, `${Math.ceil(s.hp)}`)}
    ${bar('Sanity', s.sanity, ms, sanColor, `${Math.ceil(s.sanity)}%`)}
    ${bar('Stamina', s.stamina, L.stamina, 'oklch(0.82 0.12 85)', `${Math.ceil(s.stamina)}%`)}
  </div>

  <!-- BOTTOM-RIGHT: Gear (Weapon, Almond Water, Flashlight) -->
  <div class="hud-card br" style="position:absolute;bottom:20px;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 20px);min-width:180px">
    <div class="row">
      <span class="muted">Weapon</span>
      <span style="color:#f0ece0;font-weight:600">${wp.name}</span>
    </div>
    ${invHtml ? `<div style="font-size:10px;margin-top:2px">${invHtml}</div>` : ''}
    <div class="muted" style="font-size:10px;margin-bottom:6px"><kbd>${lab('cycleWeapon', 'E')}</kbd> switch</div>

    <div class="row" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:5px">
      <span class="muted">Almond Water</span>
      <span style="color:#f0ece0">${s.almonds}/${L.almondMax}</span>
    </div>
    <div class="muted" style="font-size:10px;margin-bottom:6px"><kbd>${lab('drink', 'Q')}</kbd> drink</div>

    <div class="row" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:5px">
      <span class="muted">Flashlight</span>
      <span style="color:${s.light ? '#f0ece0' : 'rgba(232,228,216,0.45)'}">${s.light ? `${Math.round(s.battery)}%` : 'Off'}</span>
    </div>
    ${bar('', s.battery, L.battery, s.light ? 'oklch(0.9 0.05 90)' : 'rgba(255,255,255,0.2)')}
  </div>

  <!-- CENTER: Minimal Zone Header -->
  <div id="z-${zone}" style="position:absolute;left:0;right:0;text-align:center;top:100px;animation:hud-fade 3.5s forwards;pointer-events:none">
    <div style="font-size:22px;color:#f0ece0;letter-spacing:0.08em;font-weight:600">${ZONE_NAMES[zone] ?? 'The Lobby'}</div>
    <div class="muted" style="font-size:12px;margin-top:2px">
      ${zone === 'hub' ? 'Sanity stabilizes here. Nothing follows.' : zone === 'dark' ? 'Total blackout. Watch the corners.' : zone === 'red' ? 'Severe sanity decay.' : ''}
    </div>
  </div>

  <!-- Taken / Death Screen -->
  ${down ? `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,5,4,0.85);backdrop-filter:blur(8px);animation:hud-fade 3.2s forwards">
    <div class="hud-card" style="text-align:center;padding:18px 28px">
      <div style="font-size:26px;color:#f0ece0;font-weight:600;margin-bottom:4px">You were taken.</div>
      <div class="muted">Woke up in the safe room.</div>
    </div>
  </div>` : ''}

  <!-- Exit Screen -->
  ${out ? `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(250,248,235,0.85);animation:hud-fade 4s forwards">
    <div class="hud-card" style="text-align:center;padding:18px 28px;background:rgba(12,11,9,0.9)">
      <div style="font-size:24px;color:#f0ece0;font-weight:600;margin-bottom:4px">You found the way out.</div>
      <div class="muted">+${L.xpExit} XP · Noclipping to Level 1...</div>
    </div>
  </div>` : ''}

  <!-- Level Up Banner -->
  ${lvl ? `
  <div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:20%;animation:hud-fade 2.8s forwards">
    <div class="hud-card" style="padding:10px 22px">
      <span style="font-size:16px;color:oklch(0.85 0.12 85)">Level ${lv} reached</span>
    </div>
  </div>` : ''}

  <!-- Subdued Initial Hint -->
  <div id="hint" style="position:absolute;left:0;right:0;text-align:center;bottom:180px;font-size:12px;color:rgba(232,228,216,0.45);animation:hud-fade 7s 1s forwards;opacity:0">
    <kbd>${lab('attack', 'Click')}</kbd> attack · <kbd>${lab('cycleWeapon', 'E')}</kbd> weapon · <kbd>${lab('sprint', 'Shift')}</kbd> sprint · <kbd>${lab('flashlight', 'F')}</kbd> light
  </div>

</div>`
}
