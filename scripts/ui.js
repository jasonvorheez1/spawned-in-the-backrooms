// Level 0 "The Lobby" HUD
// Clean, minimal, and atmospheric.
// Designed with quiet restraint: unobstructed sightlines, crisp typography, and non-intrusive status readouts.
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'
import { ZONE_NAMES } from './lib/maze.js'
import * as modelingStudio from '../mods/modeling-studio/hud.js'
export { m3dPvDown, m3dPvWheel, m3dPvReset, m3dPvTool, m3dPvDraft, m3dPvEdit, m3dPvClear, m3dTkMeasure, m3dTkDown, m3dTkWheel, m3dTkReset, m3dMpvMove, m3dMpvSize, m3dDraft, m3dPose, m3dPick, m3dPreview, m3dUpload, m3dAsk, m3dClearRefs, m3dGuide } from '../mods/modeling-studio/hud.js'

const THEME = `<style>
#hud { --a: #ffb642; --ad: rgba(255,182,66,0.35); color: var(--a); font-family: 'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; user-select: none; text-shadow: 0 0 4px rgba(255,170,40,0.7), 0 1px 2px rgba(0,0,0,0.9) }
.hud-card { background: rgba(20,12,2,0.55); border: 2px solid var(--a); padding: 8px 14px; box-shadow: 0 0 6px rgba(255,170,40,0.35) }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:12px }
.muted { color: var(--ad); font-size: 11px }
.fb { position:relative; height:14px; border-left:2px solid var(--a); border-right:2px solid var(--a); border-bottom:2px solid var(--a); margin-top:2px; box-shadow:0 2px 4px rgba(255,170,40,0.25) }
.fb::after { content:""; position:absolute; right:-9px; bottom:-2px; border:6px solid transparent; border-left:7px solid var(--a) }
.fb.l::after { right:auto; left:-9px; border-left-color:transparent; border-right:7px solid var(--a) }
.fbi { position:absolute; left:3px; right:3px; top:3px; bottom:3px }
.fbf { height:100%; background: repeating-linear-gradient(90deg, var(--c,var(--a)) 0 5px, transparent 5px 7px); filter: drop-shadow(0 0 3px rgba(255,170,40,0.7)); transition: width .2s ease-out }
.cmp { position:relative; height:18px; overflow:hidden; border-left:2px solid var(--a); border-right:2px solid var(--a); margin-top:6px }
.cmp::before { content:""; position:absolute; left:0; right:0; top:9px; height:2px; background: repeating-linear-gradient(90deg, var(--a) 0 2px, transparent 2px 12px) }
.cmp b { position:absolute; top:0; transform:translateX(-50%); background: rgba(20,12,2,0.0); padding:0 3px; font-weight:400 }
.cmp i { position:absolute; left:50%; top:-2px; width:2px; height:22px; background:var(--a) }
.pips { display:flex; gap:3px }
.pip { width:8px; height:13px; border:1px solid var(--a); opacity:.45 }
.pip.full { background:var(--a); opacity:1; box-shadow:0 0 4px rgba(255,170,40,.7) }
.tag { font-size:10px; padding:0 4px; border:1px solid currentColor; margin-left:6px }
.dot-crosshair { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:14px; height:14px; pointer-events:none }
.dot-crosshair::before,.dot-crosshair::after { content:""; position:absolute; background:var(--a); box-shadow:0 0 3px rgba(255,170,40,.8) }
.dot-crosshair::before { left:6px; top:0; width:2px; height:4px; box-shadow: 0 10px 0 var(--a) }
.dot-crosshair::after { top:6px; left:0; height:2px; width:4px; box-shadow: 10px 0 0 var(--a) }
kbd { display:inline-block; padding:0 4px; font-family:inherit; font-size:10px; border:1px solid var(--a); color:var(--a); margin-right:2px }
@keyframes hud-fade { 0%{opacity:0} 10%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
@keyframes pulse-red { 0%,100%{opacity:.6} 50%{opacity:.2} }
@keyframes blink { 50%{opacity:.35} }
@media (max-width: 640px) {
  #hud .bl, #hud .br { bottom:auto !important; top:10px !important; transform:scale(0.72); transform-origin:top left }
  #hud .br { transform-origin:top right; right:55px !important }
  #hud #hint { display:none }
  #hud .zone { top:42% !important; padding-right: calc(var(--spawn-chrome-reservation-right-inset, 50px) + 8px); padding-left:8px }
}
</style>`

const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity

function bar(label, cur, max, color, valText = '', left = false) {
  const pct = Math.max(0, Math.min(100, (cur / max) * 100))
  return `<div style="margin-top:6px">
    <div class="row"><span>${label}</span><span style="font-size:11px">${valText}</span></div>
    <div class="fb${left ? ' l' : ''}"><div class="fbi" style="${left ? 'display:flex;justify-content:flex-end' : ''}"><div class="fbf" style="width:${pct}%;--c:${color}"></div></div></div>
  </div>`
}
function compass(yaw) {
  const D = ['N','NE','E','SE','S','SW','W','NW']
  let h = ''
  for (let i = 0; i < 8; i++) { let o = ((i * 45 - yaw) % 360 + 540) % 360 - 180; if (Math.abs(o) < 75) h += `<b style="left:${50 + o / 75 * 50}%">${D[i]}</b>` }
  return `<div class="cmp"><i></i>${h}</div>`
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
  const hpColor = hpF > 0.6 ? 'oklch(0.75 0.12 85)' : hpF > 0.3 ? 'oklch(0.72 0.15 55)' : 'oklch(0.65 0.22 28)'
  const sanWord = sanF > 0.75 ? 'steady' : sanF > 0.5 ? 'uneasy' : sanF > 0.25 ? 'fraying' : 'breaking'
  const rar = wp.rarity ? W.rarities?.[wp.rarity] : null
  const pips = Array.from({ length: L.almondMax }, (_, i) => `<div class="pip${i < (s.almonds ?? 0) ? ' full' : ''}"></div>`).join('')

  const have = ['fists', ...(s.weapons ? s.weapons.split(',') : [])].filter((k) => W[k])
  const invHtml = have.length > 1 ? have.map((k) => `<span style="opacity:${k === s.equipped ? 1 : 0.4};margin-left:6px">${W[k].name}</span>`).join('') : ''

  return `${THEME}
<div id="hud" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">

  <!-- Unobtrusive Center Point -->
  <div class="dot-crosshair"></div>

  <!-- Subtle Sanity Edge Vignette (gently narrows peripheral vision as sanity drops) -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(8,7,5,0.92) 100%);opacity:${(1 - sanF) * 0.85}"></div>

  <!-- Low Health Edge Pulse -->
  ${hpF < 0.3 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(140,20,15,0.6) 100%);animation:pulse-red 1.2s infinite;opacity:${(0.3 - hpF) * 2.5}"></div>` : ''}

  <!-- BOTTOM-LEFT: HP, sanity, compass, rank -->
  <div class="bl" style="position:absolute;left:28px;bottom:22px;width:min(300px,44vw)">
    ${bar('HP', s.hp, mh, hpF < 0.3 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.ceil(s.hp)}/${mh}`)}
    ${bar(`SAN <span style="opacity:.7">· ${sanWord}</span>`, s.sanity, ms, sanF < 0.25 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.ceil(s.sanity)}%`)}
    ${compass(((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360)}
    <div style="font-size:11px;margin-top:4px;opacity:.85">LV ${lv} · XP ${s.xp}/${L.xpBase * lv}</div>
  </div>

  <!-- BOTTOM-RIGHT: weapon, stamina, almond water, light -->
  <div class="br" style="position:absolute;bottom:22px;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);width:min(300px,44vw);text-align:right">
    <div style="font-size:15px;color:${rar?.color ?? 'var(--a)'}">${wp.name}${wp.ranged ? (s.reloading ? " · RELOADING" : ` · ${s["loaded_" + s.equipped] ?? 0}/${s[wp.ammoType ?? "ammo"] ?? 0}`) : ""}${rar ? `<span class="tag">${rar.label}</span>` : ''}</div>
    ${invHtml ? `<div style="font-size:10px;opacity:.8">${invHtml}</div>` : ''}
    ${bar('AP', s.stamina, L.stamina, s.stamina < 25 ? 'var(--ad)' : 'var(--a)', `${Math.ceil(s.stamina)}`, true)}
    <div class="row" style="margin-top:6px;justify-content:flex-end;gap:8px">
      <span>ALMOND</span><div class="pips">${pips}</div><span style="font-size:15px">${s.almonds}/${L.almondMax}</span>
    </div>
    <div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px">
      <span>LIGHT</span><span style="${s.light ? '' : 'opacity:.45'}">${s.light ? Math.round(s.battery) + '%' : 'OFF'}</span>
      
    </div>
  </div>

  <!-- CENTER: Minimal Zone Header -->
  <div id="z-${zone}" class="zone" style="position:absolute;left:0;right:0;text-align:center;top:100px;animation:hud-fade 3.5s forwards;pointer-events:none">
    <div style="font-size:22px;letter-spacing:0.12em">${ZONE_NAMES[zone] ?? 'The Lobby'}</div>
    <div class="muted" style="font-size:12px;margin-top:2px">
      ${zone === 'hub' ? 'Sanity stabilizes here. Nothing follows.' : zone === 'dark' ? 'Total blackout. Watch the corners.' : zone === 'red' ? 'Severe sanity decay.' : ''}
    </div>
  </div>

  ${s.humAt && now - s.humAt < L.humSpikeLength * 1000 ? `
  <div style="position:absolute;left:0;right:0;top:14%;display:flex;justify-content:center;pointer-events:none">
    <div class="hud-card" style="padding:6px 16px;letter-spacing:.2em;font-size:13px;color:oklch(0.85 0.15 85);border-color:oklch(0.85 0.15 85)">HUM SPIKE · KEEP MOVING</div>
  </div>` : ''}
  <!-- Taken / Death Screen -->
  ${down ? `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,5,4,0.85);backdrop-filter:blur(8px);animation:hud-fade 3.2s forwards">
    <div class="hud-card" style="text-align:center;padding:18px 28px">
      <div style="font-size:26px;font-weight:600;margin-bottom:4px">You were taken.</div>
      <div class="muted">Woke up in the safe room.</div>
    </div>
  </div>` : ''}

  <!-- Exit Screen -->
  ${out ? `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(250,248,235,0.85);animation:hud-fade 4s forwards">
    <div class="hud-card" style="text-align:center;padding:18px 28px;background:rgba(12,11,9,0.9)">
      <div style="font-size:24px;font-weight:600;margin-bottom:4px">You found the way out.</div>
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

</div>${modelingStudio.render(ctx, player)}`
}
