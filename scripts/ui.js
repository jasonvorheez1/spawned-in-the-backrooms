// Level 0 "The Lobby" HUD
// Clean, minimal, and atmospheric.
// Designed with quiet restraint: unobstructed sightlines, crisp typography, and non-intrusive status readouts.
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import { ZONE_NAMES } from './lib/maze.js'
import { wardrobe } from './wardrobe-ui.js'
import { pickUi } from './lockpick-ui.js'
import { lootUi } from './loot-ui.js'
import { talkUi } from './talk-ui.js'
import { buildUi } from './build-ui.js'
import { statsUi } from './stats-ui.js'
import { craftUi } from './craft-ui.js'
import { osUi } from './os-ui.js'
import { hordeUi } from './horde-ui.js'
import { derived as _dv, carried as _kg } from './lib/stats.js'
import { derived } from './lib/stats.js'
import { noclipUi } from './noclip-ui.js'
import PAGES from './lib/data/pages.yml'
// the .plymodel converter is read on the first upload press, not at boot
export async function plyUpload(input) { const m = await import('./lib/plyimport.js'); return m.plyUpload(input) }

const THEME = `<style>@keyframes hud-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
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
.sneak { position:absolute; left:0; right:0; top:calc(50% - 64px); text-align:center; font-size:20px; letter-spacing:.14em; pointer-events:none; text-shadow:0 0 4px #000,0 2px 2px #000; animation:snk .25s ease-out }
.sneak-hidden { color:var(--a); opacity:.85 }
.sneak-detected { color:#ffd84a }
.sneak-danger { color:#ff4a36; animation:snk .25s ease-out, snkp .7s ease-in-out infinite }
@keyframes snk { from { transform:scale(1.35); opacity:0 } }
@keyframes snkp { 50% { opacity:.55 } }
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
@media (pointer: coarse) {
  /* a phone: the thumbs own the bottom corners and the right column, so the readouts stack small on the left */
  #hud #hint { display:none }
  #hud .bl { bottom:auto !important; top:8px !important; left:10px !important; transform:scale(0.6); transform-origin:top left }
  #hud .br { bottom:auto !important; right:auto !important; top:96px !important; left:10px !important; transform:scale(0.6); transform-origin:top left; text-align:left }
  #hud .zone { top:38% !important }
}
</style>`

const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? derived(s).hpBonus : 0)
const maxSan = (lv, s) => L.sanity + (lv - 1) * L.perLevel.sanity + (s?.attr ? derived(s).sanBonus : 0)

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


// camp chatter: the line an npc is saying floats over its head while it lasts (chatter.js writes state.line)
// the doorway transition: black that fades off the new level, its name in the middle
const LEVEL_NAMES = { main: ['LEVEL 0', 'THE LOBBY'], level1: ['LEVEL 1', 'HABITABLE ZONE'], level2: ['LEVEL 2', 'PIPE DREAMS'], level3: ['LEVEL 3', 'ELECTRICAL STATION'], level4: ['LEVEL 4', 'ABANDONED OFFICE'], level5: ['LEVEL 5', 'TERROR HOTEL'], gamma: ['M.E.G.', 'BASE GAMMA'] }
function xferCard(s, now) {
  const x = s.xfer; if (!x || now - x.at > 2600) return ''
  const [a, b] = LEVEL_NAMES[x.to] ?? [String(x.to).toUpperCase(), '']
  return `<style>@keyframes xferOut{0%,45%{opacity:1}100%{opacity:0;visibility:hidden}}</style><div id="xfer${x.at}" style="position:absolute;inset:0;background:#050403;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:xferOut 2.4s forwards;color:#f2c14e;text-shadow:2px 2px #000"><div style="font-size:44px;letter-spacing:.2em">${a}</div><div style="font-size:18px;letter-spacing:.3em;opacity:.75;margin-top:6px">${b}</div></div>`
}
const TALKERS = ['meg-ale', 'meg-ortiz', 'meg-callum', 'surv-wren', 'surv-hollis', 'surv-mags', 'omega-okafor', 'omega-rhea', 'hk-constance', 'hk-vance', 'homely-barnaby', 'homely-auguste', 'l5-samantha', 'l5-ambrose', 'l5-dolores', 'l5-pip', 'l5-odette', 'l5-harlan', 'l5-vesna', 'l5-tobias', 'l5-imani', 'l5-millie', 'l5-whitlock', 'l5-vanderholt', 'l5-zelda', 'l5-wat']
function chatBubbles(ctx, now) {
  const objs = ctx.place?.objects
  if (!objs) return ''
  let h = ''
  for (const id of TALKERS) {
    const o = objs[id], l = o?.state?.line
    if (!l || now - l.at > l.d || o.state.dead) continue
    const who = String(o.state.name ?? '').split(' ·')[0]
    h += `<div data-world-anchor="${id}" data-anchor-offset="0 2.05 0" style="transform:translate(-50%,-100%);opacity:clamp(0,calc(1.6 - var(--anchor-depth,0) / 14),1)"><div id="cb${l.at}" style="max-width:260px;padding:6px 10px;background:oklch(0.16 0.02 80 / .88);border:1px solid oklch(0.7 0.12 85 / .55);color:oklch(0.93 0.03 90);font-size:14px;line-height:1.3;animation:hud-pop .18s ease-out"><span style="color:oklch(0.8 0.13 85);font-size:11px;letter-spacing:.06em">${who.toUpperCase()}</span><br>${l.t}</div></div>`
  }
  return h
}

// subtitles: every voiced line within earshot, speaker first, along the bottom (chatter rows from chatter.js, s.sub from interact/stealers)
function subtitles(ctx, player, now) {
  const rows = [], s = player.state ?? {}, me = player.feetPosition, objs = ctx.place?.objects
  if (s.talkWith) return '' // the open talk card already shows the line
  if (objs && me) for (const id of TALKERS) {
    const o = objs[id], l = o?.state?.line
    if (!l || now - l.at > l.d || o.state.dead) continue
    if (Math.hypot(o.feetPosition.x - me.x, o.feetPosition.z - me.z) > 20) continue
    rows.push([l.at, String(o.state.name ?? '').split(' ·')[0], l.t])
  }
  if (s.sub && now - s.sub.at < s.sub.d) rows.push([s.sub.at, s.sub.who, s.sub.t])
  if (!rows.length) return ''
  rows.sort((a, b) => a[0] - b[0])
  return `<div style="position:absolute;left:0;right:0;bottom:120px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px)">${rows.slice(-2).map(([at, who, t]) => `<div id="sub${at}" style="max-width:720px;padding:5px 12px;background:oklch(0.1 0.01 80 / .78);color:oklch(0.95 0.02 90);font-size:17px;line-height:1.35;text-align:center;animation:hud-pop .15s ease-out"><span style="color:oklch(0.8 0.13 85)">${who}:</span> ${t}</div>`).join('')}</div>`
}

// the old compass read (scripts/lib/compass.js): a brass dial whose needles turn with your view, and the vague words
function compassRead(s, yaw, now) {
  const r = s.compassRead
  if (!r || now - r.at > 8000) return ''
  const needles = r.spun ? `<div style="position:absolute;inset:0;animation:cspin .5s linear infinite"><i style="position:absolute;left:50%;top:10px;width:4px;height:42px;margin-left:-2px;background:oklch(0.62 0.2 28)"></i></div>`
    : r.hints.map((h, i) => `<div style="position:absolute;inset:0;transform:rotate(${h.h - yaw}deg);transition:transform .25s"><i style="position:absolute;left:50%;top:${10 + i * 8}px;width:${i ? 3 : 4}px;height:${42 - i * 8}px;margin-left:-2px;background:${i ? 'oklch(0.8 0.08 85)' : 'oklch(0.62 0.2 28)'};animation:cwob 1.3s ease-in-out infinite alternate"></i></div>`).join('')
  const words = r.spun ? 'the needle spins and will not settle.' : r.hints.map((h) => h.t).join('<br>')
  return `<style>@keyframes cspin{to{transform:rotate(360deg)}}@keyframes cwob{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}</style>
  <div id="cmpr${r.at}" style="position:absolute;left:0;right:0;top:22%;display:flex;justify-content:center;animation:hud-pop .2s ease-out, hud-fade 8s forwards">
    <div class="hud-card" style="display:flex;gap:14px;align-items:center;padding:10px 16px">
      <div style="position:relative;width:104px;height:104px;border-radius:50%;background:radial-gradient(oklch(0.93 0.04 90),oklch(0.78 0.06 85));box-shadow:0 0 0 5px oklch(0.55 0.09 70),0 0 0 7px oklch(0.25 0.04 60)">
        <span style="position:absolute;left:0;right:0;top:3px;text-align:center;font-size:11px;color:oklch(0.3 0.05 60)">▲</span>${needles}
        <b style="position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:oklch(0.35 0.05 60)"></b>
      </div>
      <div style="max-width:260px;font-size:14px;line-height:1.45"><div style="font-size:11px;opacity:.7;letter-spacing:.08em">OLD COMPASS · ${r.left} LEFT</div>${words}</div>
    </div>
  </div>`
}
// T: the wait menu, and the fade after a rest (scripts/rest.js)
function restUi(ctx, s) {
  let out = ''
  if (s.restFx && ctx.now() - s.restFx.at < 3500) out += `<style>@keyframes restF{0%{opacity:0}20%,70%{opacity:1}100%{opacity:0;visibility:hidden}}</style><div id="rest${s.restFx.at}" style="position:absolute;inset:0;background:#050403;display:flex;align-items:center;justify-content:center;animation:restF 3.4s forwards;color:#f2c14e;font-size:24px;letter-spacing:.12em;text-shadow:2px 2px #000">${s.restFx.text}</div>`
  if (s.waitOpen) out += `<div data-modal style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:auto"><div style="background:oklch(0.14 0.02 75 / .94);border:2px solid oklch(0.8 0.13 85);padding:18px 24px;color:oklch(0.9 0.1 85);text-align:center;min-width:300px;max-width:calc(100vw - 148px)"><div style="font-size:13px;letter-spacing:.2em;opacity:.7">HALOGEN · ${s.waitBed ? 'REST CYCLE' : 'WAIT'} · ${s.waitClock ?? ''}</div><div style="font-size:15px;margin:6px 0 12px">How many hours?</div><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${[1, 2, 4, 8, 12, 24].map((h) => `<button onclick="sendAction('waitdo',{h:${h}})" style="min-width:52px;padding:8px 10px;background:oklch(0.8 0.13 85);color:oklch(0.18 0.03 70);font-size:18px;border:none">${h}</button>`).join('')}</div><button onclick="sendAction('waitdo',{h:0})" style="margin-top:12px;background:none;border:1px solid oklch(0.8 0.13 85 / .5);color:inherit;padding:4px 14px">cancel ✕</button></div></div>`
  return out
}
const LIVE = `<style>@keyframes hudBreath{0%,100%{opacity:.92}50%{opacity:1}}@keyframes hudIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}#hud .bl,#hud .br{animation:hudIn .5s ease-out both,hudBreath 3.2s ease-in-out .5s infinite;filter:drop-shadow(0 0 4px rgba(255,170,40,.35))}</style>`
import { mahjongPanel } from './mahjong-ui.js'
export default function render(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now(), lv = s.level, mh = maxHp(lv, s), ms = maxSan(lv, s)
  const hpF = Math.max(0, s.hp / mh), sanF = Math.max(0, s.sanity / ms)
  const zone = s.zone ?? 'hub'
  const acts = ctx.world.inputs?.actions ?? {}
  const lab = (n, d) => acts[n]?.label ?? d
  const down = s.downAt && now - s.downAt < 3500
  const lvl = s.leveledAt && now - s.leveledAt < 3000

  const wp = W[s.equipped] ?? W.fists
  const sanColor = sanF > 0.5 ? 'oklch(0.78 0.12 300)' : sanF > 0.25 ? 'oklch(0.8 0.14 85)' : 'oklch(0.65 0.22 28)'
  const hpColor = hpF > 0.6 ? 'oklch(0.75 0.12 85)' : hpF > 0.3 ? 'oklch(0.72 0.15 55)' : 'oklch(0.65 0.22 28)'
  const sanWord = sanF > 0.75 ? 'steady' : sanF > 0.5 ? 'uneasy' : sanF > 0.25 ? 'fraying' : 'breaking'
  const rar = wp.rarity ? W.rarities?.[wp.rarity] : null


  return `${THEME}${LIVE}
<div id="hud" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">

  ${xferCard(s, now)}${restUi(ctx, s)}${mahjongPanel(s)}
  ${chatBubbles(ctx, now)}
  <!-- Unobtrusive Center Point -->
  <div class="dot-crosshair"></div>${s.crouch ? `<div class="sneak sneak-${s.detect ?? 'hidden'}" id="sn-${s.detect ?? 'hidden'}">[${(s.detect ?? 'hidden').toUpperCase()}]</div>` : ''}
  ${s.chargeAt && !W[s.equipped ?? 'fists']?.ranged ? `<style>@keyframes pwrfill{from{stroke-dashoffset:113}to{stroke-dashoffset:0}}@keyframes pwrfull{0%,100%{opacity:1}50%{opacity:.45}}</style><svg id="pwr${s.chargeAt}" width="44" height="44" viewBox="0 0 44 44" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg)"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(20,16,8,.6)" stroke-width="4"/><circle cx="22" cy="22" r="18" fill="none" stroke="#ffb347" stroke-width="3" stroke-dasharray="113" style="filter:drop-shadow(0 0 3px rgba(255,170,40,.9));animation:pwrfill ${(W.power?.charge ?? 0.9)}s linear forwards, pwrfull .25s ${(W.power?.charge ?? 0.9)}s steps(2) infinite"/></svg>` : ''}

  <!-- Subtle Sanity Edge Vignette (gently narrows peripheral vision as sanity drops) -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(8,7,5,0.92) 100%);opacity:${(1 - sanF) * 0.85}"></div>

  <!-- Low Health Edge Pulse -->
  ${hpF < 0.3 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(140,20,15,0.6) 100%);animation:pulse-red 1.2s infinite;opacity:${(0.3 - hpF) * 2.5}"></div>` : ''}

  <!-- BOTTOM-LEFT: HP, sanity, compass, rank -->
  <div class="bl" style="position:absolute;left:28px;bottom:22px;width:min(300px,44vw)">
    <div style="position:fixed;left:22px;bottom:236px;display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.22em;opacity:.62"><svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 10V4h3.5a1.6 1.6 0 0 1 0 3.2H4M7.5 7.2 10 10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>BACKROOMS ROBOTICS · HALOGEN&trade; UNIT</div>
    ${s.xfer && now - (s.xfer.at ?? 0) < 9000 ? `<style>@keyframes brboot{0%{opacity:0}8%,80%{opacity:.9}100%{opacity:0;visibility:hidden}}</style><div id="brb${s.xfer.at}" style="position:fixed;left:22px;bottom:256px;font-size:11px;letter-spacing:.08em;color:oklch(0.82 0.1 85);animation:brboot 6.5s 2.4s both">&gt; HALOGEN v4.1 · vitals linked · do not remove unit · <i>we're always with you.</i></div>` : ''}
    ${bar('HP', s.hp, mh, hpF < 0.3 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.ceil(s.hp)}/${mh}`)}
    ${bar(`SAN <span style="opacity:.7">· ${sanWord}</span>`, s.sanity, ms, sanF < 0.25 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.ceil(s.sanity)}%`)}
    ${(s.heat ?? 0) > 0 ? bar(`HEAT <span style="opacity:.7">· ${s.heat >= 70 ? 'scalding' : s.heat >= 40 ? 'sweltering' : 'warm'}</span>`, s.heat, 100, s.heat >= 70 ? 'oklch(0.66 0.22 30)' : s.heat >= 40 ? 'oklch(0.75 0.17 55)' : 'oklch(0.82 0.14 80)', `${Math.round(s.heat)}°`) : ''}
    ${compass(((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360)}
    <div style="font-size:11px;margin-top:4px;opacity:.85">LV ${lv} · XP ${s.xp}/${L.xpBase * lv}</div>
  </div>

  <!-- BOTTOM-RIGHT: weapon, stamina, almond water, light -->
  <div class="br" style="position:absolute;bottom:22px;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);width:min(300px,44vw);text-align:right">
    <div style="font-size:15px;color:${rar?.color ?? 'var(--a)'}">${wp.name}${wp.ranged ? (s.reloading ? " · RELOADING" : ` · ${s["loaded_" + s.equipped] ?? 0}/${s[wp.ammoType ?? "ammo"] ?? 0}`) : ""}${rar ? `<span class="tag">${rar.label}</span>` : ''}</div>
    ${bar(s.winded ? 'AP · WINDED' : 'AP', s.stamina, L.stamina, s.winded || s.stamina < 25 ? 'var(--ad)' : 'var(--a)', `${Math.ceil(s.stamina)}`, true)}
    <div class="row" style="margin-top:6px;justify-content:flex-end;gap:8px">
      <span>CASH</span><span style="font-size:15px;color:#9fcf8a">$${((s.cents ?? 0) / 100).toFixed(2)}</span><span>ALMOND</span><span style="font-size:15px">${s.almonds ?? 0}</span>${[['almondsG','#7fcf6a'],['almondsR','#d0574a'],['almondsB','#6f9be0']].filter(([k]) => s[k]).map(([k, c]) => `<span style="font-size:15px;color:${c}">${s[k]}</span>`).join('')}
    </div>
    ${s.attr != null ? (() => { const cap = _dv(s).carry, kg = _kg(s); return `<div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px;${kg > cap ? 'color:oklch(0.68 0.2 35)' : ''}"><span>WG</span><span>${kg.toFixed(1)}/${cap}</span></div>` })() : ''}
    <div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px">
      <span>LIGHT</span><span style="${s.light ? '' : 'opacity:.45'}">${s.light ? Math.round(s.battery) + '%' : 'OFF'}</span>
    </div>
  </div>

  <!-- CENTER: Minimal Zone Header -->
  <div id="z-${zone}" class="zone" style="position:absolute;left:0;right:0;text-align:center;top:100px;animation:hud-fade 3.5s forwards;pointer-events:none">
    <div style="font-size:22px;letter-spacing:0.12em">${ZONE_NAMES[zone] ?? 'The Lobby'}</div>
    <div class="muted" style="font-size:12px;margin-top:2px">
      ${zone === 'hub' ? 'Sanity stabilizes here. Nothing follows.' : zone === 'dark' ? 'Total blackout. Watch the corners.' : zone === 'red' ? 'Severe sanity decay.' : zone === 'l5_housekeeping' ? 'M.E.G. Outpost Housekeeping. Sanity and health recover here.' : zone === 'l5_boiler' ? 'The Boiler Room. Extreme heat and heavy sanity drain.' : zone === 'l5_beverly' ? 'The Beverly Room. Hypnotic ballroom music echoes.' : ''}
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

  ${s.xpPop && now - s.xpPop.at < 2600 ? `<div id="xp${s.xpPop.at}" style="position:absolute;left:22px;bottom:250px;font-size:15px;letter-spacing:.08em;color:oklch(0.86 0.13 85);text-shadow:0 0 8px rgba(255,190,80,.45);animation:hud-fade 2.6s forwards">+${s.xpPop.n} XP</div>` : ''}
  ${s.lvlPrompt && !s.sheetOpen ? `<div style="position:absolute;left:22px;bottom:274px;font-size:13px;letter-spacing:.1em;color:oklch(0.86 0.13 85);animation:blink 1.4s ease-in-out infinite">LEVEL UP · press ${(lab('sheet', 'K') + '').toUpperCase()} to spend points</div>` : ''}
  <!-- Level Up Banner -->
  ${lvl ? `
  <div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:20%;animation:hud-fade 2.8s forwards">
    <div class="hud-card" style="padding:10px 22px">
      <span style="font-size:16px;color:oklch(0.85 0.12 85)">Level ${lv} reached</span>
    </div>
  </div>` : ''}

  ${(s.firesaltUntil ?? 0) > now ? `<div style="position:absolute;left:0;right:0;text-align:center;bottom:150px;font-size:13px;color:#ff9a4a;text-shadow:0 0 6px rgba(255,120,30,.6)">Firesalt on your weapon · x1.4 melee · ${Math.ceil((s.firesaltUntil - now) / 1000)}s</div>` : ''}
  ${s.reading && PAGES[s.reading] ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);pointer-events:auto" data-modal>
    <div style="width:min(440px,88vw);background:#e9dfc4;color:#2a241a;padding:22px 26px 16px;font-family:'Courier New',monospace;font-size:14px;line-height:1.5;box-shadow:0 8px 30px rgba(0,0,0,.6);transform:rotate(-1.2deg);border-left:3px dashed #b9ab88">
      <div style="font-size:11px;color:#7a6c50;margin-bottom:8px">torn page · ${s.reading} of 8</div>
      <div style="white-space:pre-wrap">${String(PAGES[s.reading]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/~~(.+?)~~/g, '<s style="text-decoration-thickness:3px">$1</s>')}</div>
      <div style="text-align:right;margin-top:12px"><button onclick="sendAction('inv',{k:'read',n:0})" style="background:#2a241a;color:#e9dfc4;border:0;padding:5px 14px;font-family:inherit;cursor:pointer">put it away</button></div>
    </div></div>` : ''}
  ${subtitles(ctx, player, now)}
  ${compassRead(s, ((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360, now)}
  <!-- Subdued Initial Hint -->
  <div id="hint" style="position:absolute;left:0;right:0;text-align:center;bottom:180px;font-size:12px;color:rgba(232,228,216,0.45);animation:hud-fade 7s 1s forwards;opacity:0">
    <kbd>${lab('attack', 'Click')}</kbd> attack · <kbd>${lab('cycleWeapon', 'X')}</kbd> weapon · <kbd>${lab('sprint', 'Shift')}</kbd> sprint · <kbd>${lab('flashlight', 'F')}</kbd> light · <kbd>${lab('sheet', 'K')}</kbd> stats · <kbd>${lab('emote', 'T')}</kbd> face
  </div>

</div>${lootUi(ctx, player)}${pickUi(ctx, player)}${talkUi(ctx, player)}${buildUi(ctx, player)}${statsUi(ctx, player)}${craftUi(ctx, player)}${osUi(ctx, player)}${hordeUi(ctx, player)}${noclipUi(ctx, player)}`
}
