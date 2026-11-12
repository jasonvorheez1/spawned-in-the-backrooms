import { wristNav } from './lib/wrist-nav.js'
import { quickBar } from './lib/hud-quickbar.js'
import { UI_THEME } from './lib/ui-theme.js'
import { screen } from './lib/screen.js'
import { overlay as lagscopeOverlay } from '../mods/lagscope/panel.js'
import * as modelingStudio from '../mods/modeling-studio/hud.js'
export { m3dPvDown, m3dPvWheel, m3dPvReset, m3dPvTool, m3dPvDraft, m3dPvEdit, m3dPvClear, m3dTkMeasure, m3dTkDown, m3dTkWheel, m3dTkReset, m3dMpvMove, m3dMpvSize, m3dDraft, m3dPose, m3dPick, m3dPreview, m3dUpload, m3dAsk, m3dClearRefs, m3dGuide } from '../mods/modeling-studio/hud.js'
// HUD and screen composition. Shared panel styling lives in lib/ui-theme.js.
import L from './lib/data/level0.yml'
import R12 from './lib/data/level12.yml'
import W from './lib/weapons.js'
import { ZONE_NAMES } from './lib/maze.js'
import { questMark, yawTo } from './lib/quest-mark.js'
import { quickItems } from './lib/quick-items.js'
import { tracked, MAX_TRACK, PLACE_NAMES } from './lib/quests.js'
import { wardrobe } from './wardrobe-ui.js'
import { salon } from './salon-ui.js'
import { mainMenu } from './main-menu-ui.js'
import { hubUi } from './hub-ui.js'
import { cutUi, t0Fade } from './cutscene-ui.js'
import { tutUi } from './tutorial-ui.js'
import { pickUi } from './lockpick-ui.js'
import { spamUi } from './spamton-ui.js'
import { spamArenaUi } from './spamton-arena-ui.js'
import { lootUi } from './loot-ui.js'
import { talkUi } from './talk-ui.js'
import { buildUi } from './build-ui.js'
import { statsUi } from './stats-ui.js'
import { craftUi } from './craft-ui.js'
import { osUi } from './os-ui.js'
import { hordeUi } from './horde-ui.js'
import { derived, carried as _kg } from './lib/stats.js'
import { noclipUi, clipCard } from './noclip-ui.js'
import { feedUi } from './feed-ui.js'
import PAGES from './lib/data/pages.yml'
import { cndOf, band, bandColor, isBroken } from './lib/condition.js'
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
.sneak-caution { color:#ffb347 }
.sneak-bar { width:120px; height:3px; margin:5px auto 0; background:rgba(0,0,0,.45); border:1px solid currentColor; opacity:.8 }
.sneak-bar i { display:block; height:100%; background:currentColor; transition:width .25s linear }
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
  const pct = Math.round(Math.max(0, Math.min(100, (cur / max) * 100))) // whole percents: a drifting stat restyles the bar only when it moves a step
  return `<div style="margin-top:6px">
    <div class="row"><span>${label}</span><span style="font-size:11px">${valText}</span></div>
    <div class="fb${left ? ' l' : ''}"><div class="fbi" style="${left ? 'display:flex;justify-content:flex-end' : ''}"><div class="fbf" style="width:${pct}%;--c:${color}"></div></div></div>
  </div>`
}
const COMPASS_CACHE = new Array(360)
function compass(yaw) {
  const y = Math.round(((yaw % 360) + 360) % 360)
  const cached = COMPASS_CACHE[y]
  if (cached) return cached
  const D = ['N','NE','E','SE','S','SW','W','NW']
  let h = ''
  for (let i = 0; i < 8; i++) { let o = ((i * 45 - y) % 360 + 540) % 360 - 180; if (Math.abs(o) < 75) h += `<b style="left:${50 + o / 75 * 50}%">${D[i]}</b>` }
  const res = `<div class="cmp"><i></i>${h}</div>`
  COMPASS_CACHE[y] = res
  return res
}
// the objective's pip on the compass: inside the strip it slides with your view, past its edge it pins there as an arrow
function questPip(ctx, player, yaw) {
  const p = player.feetPosition; if (!p) return ''
  let out = ''
  const side = { l: 0, r: 0 } // pinned arrows on one edge step outward so none hides another
  const exits = new Set()
  for (const q of tracked(player.state)) { // one pip per tracked quest, in that quest's tint
    const t = questMark(ctx, player, q); if (!t || (t.exit && exits.has(t.exit))) continue
    if (t.exit) exits.add(t.exit)
    const o = ((Math.round(yawTo(p, t)) - Math.round(yaw)) % 360 + 540) % 360 - 180, a = Math.abs(o)
    const edge = a >= 75, n = edge ? side[o < 0 ? 'l' : 'r']++ : 0
    const x = !edge ? 50 + o / 75 * 50 : (o < 0 ? -n * 4.5 : 100 + n * 4.5)
    const d = Math.round(Math.hypot(t.x - p.x, t.z - p.z))
    out += `<div style="position:absolute;left:${x}%;top:-9px;transform:translateX(-50%);color:${q.tint};font-size:${edge ? 13 : 12}px;text-shadow:0 0 6px ${q.tint},0 1px 2px #000;text-align:center;line-height:1">${edge ? (o < 0 ? '◀' : '▶') : t.exit ? '▣' : '◆'}<div style="font-size:9px;letter-spacing:.04em;margin-top:1px">${d}m</div></div>`
  }
  return out ? `<div style="position:absolute;left:28px;width:300px;bottom:6px;height:22px;pointer-events:none">${out}</div>` : ''
}

const CND_CACHE = { key: '', html: '' }
function hudCnd(s, now) {
  const k = s.equipped ?? 'fists'
  if (k === 'fists') return ''
  const c = cndOf(s, k)
  const isJammed = s.jammedAt && (now - s.jammedAt < 1400)
  const isBroke = isBroken(c)
  const roundC = Math.round(c)
  const key = `${k}:${roundC}:${isJammed ? 1 : 0}:${isBroke ? 1 : 0}`
  if (key === CND_CACHE.key) return CND_CACHE.html
  const col = bandColor(c)
  const pips = Math.round(c / 10)
  let pipsHtml = ''
  for (let i = 0; i < 10; i++) {
    pipsHtml += `<i style="display:inline-block;width:3px;height:7px;margin-right:1px;background:${i < pips ? col : 'rgba(255,182,66,0.18)'}"></i>`
  }
  CND_CACHE.key = key
  CND_CACHE.html = `<div class="row" style="margin-top:4px;justify-content:flex-end;gap:6px;font-size:11px">
    <span style="color:var(--ad)">CND</span>
    <span style="display:inline-flex;align-items:center;padding:1px 3px;border:1px solid rgba(255,182,66,0.3);background:rgba(10,7,2,0.6)">${pipsHtml}</span>
    <span style="color:${col};font-weight:bold">${roundC}%</span>
    ${isJammed ? '<span style="color:#ff4433;font-weight:bold;animation:blink .3s infinite;margin-left:4px">[ JAMMED ]</span>' : ''}
    ${isBroke ? '<span style="color:#ff4433;font-weight:bold;animation:blink .5s infinite;margin-left:4px">[ BROKEN ]</span>' : ''}
  </div>`
  return CND_CACHE.html
}

function sniperScope(s, wp) {
  if (!s.ads || (s.equipped !== 'hunting_rifle' && wp?.base !== 'hunting_rifle')) return ''
  return `<div style="position:fixed;inset:0;pointer-events:none;z-index:99;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at center, transparent clamp(140px, 32vmin, 260px), rgba(4,3,2,0.94) clamp(160px, 35vmin, 290px), #030201 clamp(200px, 42vmin, 340px))"></div>
    <div style="position:relative;width:clamp(320px, 70vmin, 580px);height:clamp(320px, 70vmin, 580px);border-radius:50%;box-shadow:inset 0 0 40px rgba(0,0,0,0.9), 0 0 0 3px rgba(35,28,15,0.85);overflow:hidden">
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 35% 30%, rgba(120,200,180,0.07) 0%, transparent 60%)"></div>
      <div style="position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(20,15,8,0.95);box-shadow:0 0 1px rgba(255,182,66,0.3)"></div>
      <div style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:rgba(20,15,8,0.95);box-shadow:0 0 1px rgba(255,182,66,0.3)"></div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;border:1px solid rgba(255,182,66,0.6)"></div>
      <div style="position:absolute;left:calc(50% - 100px);top:50%;width:200px;display:flex;justify-content:space-between;transform:translateY(-50%)">
        <span style="width:1px;height:8px;background:rgba(20,15,8,0.85)"></span>
        <span style="width:1px;height:5px;background:rgba(20,15,8,0.85)"></span>
        <span style="width:1px;height:12px;background:rgba(20,15,8,0.85)"></span>
        <span style="width:1px;height:5px;background:rgba(20,15,8,0.85)"></span>
        <span style="width:1px;height:8px;background:rgba(20,15,8,0.85)"></span>
      </div>
      <div style="position:absolute;top:calc(50% - 100px);left:50%;height:200px;display:flex;flex-direction:column;justify-content:space-between;transform:translateX(-50%)">
        <span style="height:1px;width:8px;background:rgba(20,15,8,0.85)"></span>
        <span style="height:1px;width:5px;background:rgba(20,15,8,0.85)"></span>
        <span style="height:1px;width:12px;background:rgba(20,15,8,0.85)"></span>
        <span style="height:1px;width:5px;background:rgba(20,15,8,0.85)"></span>
        <span style="height:1px;width:8px;background:rgba(20,15,8,0.85)"></span>
      </div>
      <div style="position:absolute;bottom:18%;right:22%;font-size:9px;color:rgba(255,182,66,0.55);letter-spacing:1px;font-family:monospace;pointer-events:none">
        <div>100M ───</div>
        <div style="margin-top:4px">200M ──</div>
        <div style="margin-top:4px">300M ─</div>
      </div>
    </div>
  </div>`
}


// camp chatter: the line an npc is saying floats over its head while it lasts (chatter.js writes state.line)
// the doorway transition: black that fades off the new level, its name in the middle
const LEVEL_NAMES = { bonus: ['THE BONUS ROOM', 'THE BONUS ROOM'], main: ['LEVEL 0', 'THE LOBBY'], level1: ['LEVEL 1', 'HABITABLE ZONE'], level2: ['LEVEL 2', 'PIPE DREAMS'], level3: ['LEVEL 3', 'ELECTRICAL STATION'], level4: ['LEVEL 4', 'ABANDONED OFFICE'], level5: ['LEVEL 5', 'TERROR HOTEL'], level6: ['LEVEL 6', 'LIGHTS OUT'], level61: ['LEVEL 6.1', 'THE SNACKROOMS'], level11: ['LEVEL 11', 'THE INFINITE CITY'], level10: ['LEVEL 10', 'BUMPER CROP'], level7: ['LEVEL 7', 'THALASSOPHOBIA'], level8: ['LEVEL 8', 'CAVE SYSTEMS'], level21: ['LEVEL 2.1', 'LOCKED'], level26: ['LEVEL 26', 'THE SS FUN =)'], gamma: ['M.E.G.', 'BASE GAMMA'], level01: ['LEVEL 0.1', 'ZENITH STATION'], level02: ['LEVEL 0.2', 'REMODELED MESS'], level12: ['LEVEL 12', 'MATRIX'], level184: ['LEVEL 184', ''], home11: ['YOUR HOUSE', 'THE INFINITE CITY'], spamton: ['[[NOWHERE]]', "SPAMTON'S BASEMENT"] }
function xferCard(s, now) {
  const x = s.xfer; if (!x || now - x.at > 2600) return ''
  const to = String(x.to ?? '').startsWith('tutorial0') ? 'main' : x.to // a solo tutorial copy is still Level 0
  if (x.kind) return clipCard({ ...x, to }, now, LEVEL_NAMES) // the noclip between levels (scripts/noclip-ui.js)
  const [a, b] = LEVEL_NAMES[to] ?? [String(to).toUpperCase(), '']
  return `<style>@keyframes xferOut{0%,45%{opacity:1}100%{opacity:0;visibility:hidden}}</style><div id="xfer${x.at}" style="position:absolute;inset:0;background:#050403;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:xferOut 2.4s forwards;color:#f2c14e;text-shadow:2px 2px #000"><div style="font-size:44px;letter-spacing:.2em">${a}</div><div style="font-size:18px;letter-spacing:.3em;opacity:.75;margin-top:6px">${b}</div></div>`
}
const TALKERS = ['meg-ale', 'meg-ortiz', 'meg-callum', 'surv-wren', 'surv-hollis', 'surv-mags', 'omega-okafor', 'omega-rhea', 'hk-constance', 'hk-vance', 'homely-barnaby', 'homely-auguste', 'l5-samantha', 'l5-ambrose', 'l5-dolores', 'l5-pip', 'l5-odette', 'l5-harlan', 'l5-vesna', 'l5-tobias', 'l5-imani', 'l5-millie', 'l5-whitlock', 'l5-vanderholt', 'l5-zelda', 'l5-wat', 'l11-meg-agent-vance', 'l11-trader-kael', 'l11-commuter-faceling', 'l11-walker-1', 'l11-walker-2', 'l11-walker-3']
// everyone who can bark: the named camp crews above plus any npc with a fresh line, so a combat shout always gets its bubble and subtitle
const speakers = (objs) => { const ids = new Set(TALKERS); for (const id in objs) { if (!ids.has(id) && !id.includes('/') && objs[id]?.tags?.includes?.('npc') && objs[id].state?.line) ids.add(id) } return ids }
const CB_CACHE = { at: 0, html: '' }
function chatBubbles(ctx, now, player) {
  if (now - CB_CACHE.at < 120) return CB_CACHE.html
  CB_CACHE.at = now
  const objs = ctx.place?.objects
  if (!objs) return (CB_CACHE.html = '')
  let h = ''
  let nb = 0
  for (const id of speakers(objs)) {
    const o = objs[id], l = o?.state?.line
    if (!l || now - l.at > l.d || o.state?.dead) continue
    if (player?.feetPosition && o.feetPosition && Math.hypot(o.feetPosition.x - player.feetPosition.x, o.feetPosition.z - player.feetPosition.z) > 28) continue
    if (++nb > 5) break
    if (o.place && player?.place && o.place !== player.place) continue
    const who = String(o.state.name ?? '').split(' ·')[0]
    h += `<div data-world-anchor="${id}" data-anchor-offset="0 2.05 0" style="transform:translate(-50%,-100%);opacity:clamp(0,calc(1.6 - var(--anchor-depth,0) / 14),1)"><div id="cb${l.at}" style="max-width:260px;padding:6px 10px;background:oklch(0.16 0.02 80 / .88);border:1px solid oklch(0.7 0.12 85 / .55);color:oklch(0.93 0.03 90);font-size:14px;line-height:1.3;animation:hud-pop .18s ease-out"><span style="color:oklch(0.8 0.13 85);font-size:11px;letter-spacing:.06em">${esc(who.toUpperCase())}</span><br>${esc(l.t)}</div></div>`
  }
  return (CB_CACHE.html = h)
}

// subtitles: every voiced line within earshot, speaker first, along the bottom (chatter rows from chatter.js, s.sub from interact/stealers)
const SUB_CACHE = { at: 0, html: '' }
function subtitles(ctx, player, now) {
  if (now - SUB_CACHE.at < 120) return SUB_CACHE.html
  SUB_CACHE.at = now
  const rows = [], s = player.state ?? {}, me = player.feetPosition, objs = ctx.place?.objects
  if (s.talkWith) return (SUB_CACHE.html = '') // the open talk card already shows the line
  if (objs && me) for (const id of speakers(objs)) {
    const o = objs[id], l = o?.state?.line
    if (!l || now - l.at > l.d || o.state?.dead) continue
    if ((o.place && player.place && o.place !== player.place) || Math.hypot(o.feetPosition.x - me.x, o.feetPosition.z - me.z) > 12) continue // same level, in earshot
    rows.push([l.at, String(o.state.name ?? '').split(' ·')[0], l.t])
  }
  if (s.sub && now - s.sub.at < s.sub.d) rows.push([s.sub.at, s.sub.who, s.sub.t])
  if (!rows.length) return (SUB_CACHE.html = '')
  rows.sort((a, b) => a[0] - b[0])
  return (SUB_CACHE.html = `<div style="position:absolute;left:0;right:0;bottom:120px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:0 calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px)">${rows.slice(-2).map(([at, who, t]) => `<div id="sub${at}" style="max-width:720px;padding:5px 12px;background:oklch(0.1 0.01 80 / .78);color:oklch(0.95 0.02 90);font-size:17px;line-height:1.35;text-align:center;animation:hud-pop .15s ease-out"><span style="color:oklch(0.8 0.13 85)">${esc(who)}:</span> ${esc(t)}</div>`).join('')}</div>`)
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
  if (s.elevPanel) {
    const body = s.elevAsk
      ? `<p>The hotel does not go to floor ${esc(s.elevAsk)}. Ride anyway?</p><div class="field-controls"><button class="primary" onclick="sendAction('elevdo',{f:'yes'})">Ride</button><button onclick="sendAction('elevdo',{f:'no'})">Back</button></div>`
      : `<div class="field-controls floors">${['1','2','3','4','5','6','7','8','9','10','11','12','13','66','382','B'].map((f) => `<button aria-label="Floor ${f}" onclick="sendAction('elevdo',{f:'${f}'})">${f}</button>`).join('')}</div><button class="field-cancel" onclick="sendAction('elevdo',{f:''})">Close</button>`
    out += `<div class="field-shade" data-modal><section class="field-dialog" aria-labelledby="elevator-title"><h2 id="elevator-title">Hotel elevator</h2>${body}</section></div>`
  }
  if (s.waitOpen) {
    const durations = [1, 2, 4, 8, 12, 24].map((h) => `<button onclick="sendAction('waitdo',{h:${h}})">${h} ${h === 1 ? 'hour' : 'hours'}</button>`).join('')
    out += `<div class="field-shade" data-modal><section class="field-dialog" aria-labelledby="wait-title"><header><h2 id="wait-title">${s.waitBed ? 'Rest' : 'Wait'}</h2><span>${esc(s.waitClock ?? '')}</span></header><div class="field-controls durations">${durations}</div><button class="field-cancel" onclick="sendAction('waitdo',{h:0})">Cancel</button></section></div>`
  }
  return out
}
const LIVE = `<style>@keyframes hudBreath{0%,100%{opacity:.92}50%{opacity:1}}@keyframes hudIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}#hud .bl,#hud .br{animation:hudIn .5s ease-out both,hudBreath 3.2s ease-in-out .5s infinite;filter:drop-shadow(0 0 4px rgba(255,170,40,.35))}</style>`
import { mahjongPanel } from './mahjong-ui.js'
// under the water's skin: murky green-blue, the edges darker, the light swimming overhead, and the breath you have left
function underwater(s) {
  if (!s.underwater) return ''
  const b = s.breath ?? 100, low = b <= 30
  return `<style>@keyframes uwSway{0%{transform:translate(0,0) scale(1.05)}50%{transform:translate(-1.5%,1%) scale(1.08)}100%{transform:translate(0,0) scale(1.05)}}@keyframes uwBreath{50%{opacity:.45}}</style>
<div style="position:fixed;inset:0;pointer-events:none;backdrop-filter:blur(2.5px) saturate(.65) hue-rotate(-12deg);-webkit-backdrop-filter:blur(2.5px) saturate(.65);background:radial-gradient(ellipse at 50% 18%,rgba(70,140,130,.18),rgba(12,42,48,.55) 55%,rgba(2,10,14,.88) 100%)"></div>
<div style="position:fixed;inset:-5%;pointer-events:none;mix-blend-mode:screen;opacity:.22;animation:uwSway 6s ease-in-out infinite;background:repeating-radial-gradient(circle at 30% 20%,rgba(150,220,200,.18) 0 2px,transparent 3px 26px),repeating-radial-gradient(circle at 70% 10%,rgba(150,220,200,.12) 0 2px,transparent 3px 34px)"></div>
<div style="position:fixed;left:50%;bottom:22%;transform:translateX(-50%);width:220px;pointer-events:none;font:11px monospace;letter-spacing:2px;color:${low ? '#ff8a6a' : '#9fe0d0'};text-align:center;${low ? 'animation:uwBreath .6s infinite' : ''}">BREATH<div style="margin-top:4px;height:6px;border:1px solid currentColor;padding:1px"><div style="height:100%;width:${b}%;background:currentColor"></div></div></div>`
}

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const Q_CACHE = { key: '', html: '' }
const exitLabel = (t) => (t.label ?? 'Exit') + ' → ' + (PLACE_NAMES[t.via] ?? t.via)
function questTracker(s, player, ctx) {
  const list = tracked(s)
  if (!list.length || s.jrnOpen) return ''
  const here = player?.place ?? ctx?.place?.id ?? 'main'
  const rows = list.map((q) => {
    const targetPlace = q.mark?.place
    const off = targetPlace && targetPlace !== here
    const exit = off ? questMark(ctx, player, q) : null
    const destination = off ? (PLACE_NAMES[targetPlace] ?? targetPlace) : ''
    const route = exit ? exitLabel(exit) : off ? 'Route unknown' : ''
    return { q, destination, route }
  })
  const key = JSON.stringify(rows.map(({ q, destination, route }) => [q.id, q.name, q.step, q.tint, destination, route]))
  if (key === Q_CACHE.key) return Q_CACHE.html
  Q_CACHE.key = key
  const row = ({ q, destination, route }) => {
    const placeBadge = destination ? `<span class="q-destination">${esc(destination)}</span>` : ''
    return `<div style="border-left:3px solid ${q.tint};padding:5px 12px 6px;background:linear-gradient(rgba(18,12,3,0.92),rgba(10,6,1,0.96));box-shadow:0 0 10px rgba(0,0,0,0.8)">
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:${q.tint};letter-spacing:.05em"><span style="font-size:9px">◆</span><span>${esc(q.name)}</span>${placeBadge}</div>
      <div class="qs" style="font-size:12px;color:#fff2d4;opacity:.92;text-transform:none;letter-spacing:.02em;line-height:1.3;margin-top:2px">${esc(q.step)}</div>${route ? `<span class="q-next">▣ ${esc(route)}</span>` : ''} </div>`
  }
  return (Q_CACHE.html = `<style>@media (max-width:520px){#hud-quest{width:126px!important;font-size:10px}#hud-quest .qs{display:none}#hud-quest span{font-size:10px}}</style><div id="hud-quest" style="position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);top:18px;width:min(340px,42vw);display:flex;flex-direction:column;gap:5px;font-family:inherit;text-shadow:0 1px 2px #000;pointer-events:auto;cursor:pointer;z-index:40;animation:hud-pop .3s ease-out" onclick="sendAction('journal')">${rows.map(row).join('')}</div>`)
}
// Browsing the journal changes the detail pane independently of the HUD markers.
function journalUi(s, player, ctx) {
  if (!s.jrnOpen) return ''
  const recent = (a, b) => (b.at ?? 0) - (a.at ?? 0)
  const open = Object.entries(s.quests ?? {}).map(([id, q]) => ({ ...q, id, status: 'Current' }))
    .sort((a, b) => Number(!!b.main) - Number(!!a.main) || recent(a, b))
  const archive = Object.entries(s.qdone ?? {}).filter(([id]) => !Object.hasOwn(s.quests ?? {}, id))
    .map(([id, q]) => ({ ...q, id, status: q.outcome === 'failed' || (!q.outcome && /\bfailed\b/i.test(q.text ?? '')) ? 'Failed' : 'Completed' })).sort(recent)
  const list = [...open, ...archive], tr = tracked(s)
  const selected = list.find((q) => q.id === s.qview) ?? list.find((q) => q.id === tr[0]?.id) ?? list[0]
  const row = (q) => {
    const marker = tr.find((t) => t.id === q.id)
    return `<button class="quest-entry" data-quest="${esc(q.id)}" data-status="${q.status}" ${q === selected ? 'aria-current="true"' : ''} onclick="sendAction('qselect',{id:${esc(JSON.stringify(q.id))}})">
      <i class="quest-box" aria-hidden="true" ${marker ? `style="--quest-marker:${marker.tint}"` : ''}></i>
      <span>${esc(q.name)}</span><span class="quest-sr">${marker ? ', tracked' : q.status !== 'Current' ? ', ' + q.status : ''}</span>
    </button>`
  }
  let detail = '<p class="quest-empty">Your Journal is empty. Quests appear here as you find them.</p>'
  if (selected) {
    const { id, status, name, step, text, mark, main, history } = selected
    const current = status === 'Current', pinned = tr.some((q) => q.id === id)
    const target = current ? questMark(ctx, player, selected) : null
    const feet = player?.feetPosition
    const dist = target && feet ? Math.round(Math.hypot(target.x - feet.x, target.z - feet.z)) : null
    const place = current ? mark?.place : selected.place
    const location = [place && (PLACE_NAMES[place] ?? place), dist != null && !target.exit && `${dist} m`].filter(Boolean).join(' · ')
    const off = current && place && place !== (player?.place ?? ctx?.place?.id)
    const route = target?.exit
      ? exitLabel(target) + (dist == null ? '' : ` · ${dist} m`)
      : off ? 'Route unknown from this level' : ''
    const full = !pinned && tr.length >= MAX_TRACK
    detail = `<div class="quest-detail" id="quest-detail-${esc(id)}">
      <div class="quest-meta"><span>${current && main ? 'Main quest' : status === 'Current' ? 'In progress' : status}</span>${location ? `<span>${esc(location)}</span>` : ''}</div>
      <h2>${esc(name)}</h2>
      <div class="quest-objective">
        <h3>${current ? 'Current objective' : 'Outcome'}</h3>
        <p>${esc(current ? step || 'No current objective.' : text || status)}</p>
      </div>
      ${target?.exit ? `<p class="quest-route"><b>Next crossing</b> ${esc(route)}</p>` : route ? `<p class="quest-route">${esc(route)}</p>` : ''}
      ${current ? `<div class="quest-actions"><button aria-pressed="${pinned}" ${full ? 'disabled' : ''} onclick="sendAction('qtrack',{id:${esc(JSON.stringify(id))}})">${pinned ? 'Stop tracking' : 'Track quest'}</button>${full ? '<small>All tracking slots are in use.</small>' : ''}</div>` : ''}
      ${history?.length ? `<div class="quest-history"><h3>Previous objectives</h3><ul>${history.slice().reverse().map((line) => `<li>${esc(line)}</li>`).join('')}</ul></div>` : ''}
    </div>`
  }
  return `<div id="journal" data-modal><section class="journal-panel" aria-labelledby="journal-title">
    <header class="journal-header"><h1 id="journal-title">Quests</h1><span>${tr.length} of ${MAX_TRACK} tracked</span><button class="journal-close" onclick="sendAction('journal')">Close <kbd>P</kbd></button></header>
    ${wristNav('journal')}
    <div class="quest-layout">
      <div class="quest-list" role="group" aria-label="Quest list" onkeydown="if(event.key==='ArrowUp'||event.key==='ArrowDown'){const next=event.target[event.key==='ArrowDown'?'nextElementSibling':'previousElementSibling'];if(event.target.matches('.quest-entry')&&next?.matches('.quest-entry')){event.preventDefault();event.stopPropagation();next.focus();next.click()}}">
        ${list.map(row).join('') || '<p class="quest-empty">No quests yet.</p>'}
      </div>
      <div class="quest-reading" aria-live="polite">${detail}</div>
    </div>
  </section></div>`
}

// F3: the LAGSCOPE lag panel floats over whatever the HUD draws (builders only; players never see it)
function unlock12(ctx, player) { // shows once as Harris's tape ends: Level 12's window is open to them
  const at = player.state.u12At; if (!at || ctx.now() - at > 9000 || ctx.now() < at - 30000) return ""
  const wait = Math.max(0, (at - ctx.now()) / 1000).toFixed(1)
  return `<style>@keyframes u12{0%{opacity:0;transform:translateY(8px)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;visibility:hidden}}</style><div id="u12-${Math.round(at)}" style="position:fixed;left:0;right:0;top:22%;display:flex;justify-content:center;pointer-events:none;opacity:0;animation:u12 7s ${wait}s forwards"><div style="background:rgba(10,8,4,.88);border:2px solid #ffb43c;box-shadow:4px 4px 0 #000;padding:10px 22px;text-align:center;font-family:monospace;color:#ffb43c;letter-spacing:.12em"><div style="font-size:13px;opacity:.75">NEW WAY THROUGH</div><div style="font-size:30px;font-weight:900;margin:2px 0">LEVEL 12 UNLOCKED</div><div style="font-size:13px;color:#ffe2a8">walk into the lit window in the alley</div></div></div>`
}
function ritual12(ctx, player) { // Level 12: Harris's ritual as a checklist that ticks off as it's done
  if (player.place !== 'level12') return ""
  const r = player.state.r12 ?? {}, now = ctx.now(), sat = r.sat ?? 0
  const satDone = sat >= R12.sit, back = r.back ? (now - r.back) / 1000 : null
  const min = back == null ? 0 : Math.floor(back / R12.hour * 60), early = back != null && back < R12.hour - R12.tol, open = back != null && Math.abs(back - R12.hour) <= R12.tol, late = back != null && back > R12.hour + R12.tol
  const row = (done, live, text, sub = "") => `<div style="display:flex;gap:8px;align-items:baseline;opacity:${done ? .45 : live ? 1 : .6}"><span style="width:14px;color:${done ? '#4ade80' : live ? '#ffd9a0' : '#a8924b'}">${done ? '✓' : live ? '▸' : '·'}</span><span style="${done ? 'text-decoration:line-through' : ''}">${text}${sub ? `<div style="font-size:11px;color:#d4b96a;margin-top:2px">${sub}</div>` : ''}</span></div>`
  const bar = (f) => `<div style="height:4px;background:rgba(255,255,255,.12);margin-top:4px;width:180px"><div style="height:100%;width:${Math.round(Math.min(1, f) * 100)}%;background:#ffd9a0;transition:width 1s linear"></div></div>`
  const rows = [
    row(satDone, !satDone, 'Sit in the chair a quarter hour', !satDone ? (sat ? `don't get up ${bar(sat / R12.sit)}` : 'the clock above the door keeps time') : ''),
    row(!!r.tried, satDone && !r.tried, 'Try the door, even though it\'s locked'),
    row(!!r.back, !!r.tried && !r.back, 'Leave through a copy door out in the white'),
    row(false, !!r.back && !late, 'Wait exactly one hour', back == null ? '' : late ? '<span style="color:#ff8a6a">you missed it. try the door to start over</span>' : open ? '<span style="color:#4ade80">NOW</span>' : `minute ${min} of 60 ${bar(back / R12.hour)}`),
    row(false, open, 'Try the door again'),
  ].join('')
  return `<div style="position:fixed;left:24px;top:96px;pointer-events:none;font-family:inherit;font-size:13px;color:#fffde8;background:rgba(22,20,14,.78);box-shadow:0 0 0 2px #5a503d;padding:10px 14px;display:flex;flex-direction:column;gap:6px;min-width:250px;text-shadow:1px 1px #16140e"><div style="font-size:11px;letter-spacing:.14em;color:#d4b96a">HARRIS'S RITUAL</div>${rows}</div>`
}
export default function render(ctx, player) { return renderHud(ctx, player) + unlock12(ctx, player) + ritual12(ctx, player) + lagscopeOverlay(ctx, player) + UI_THEME } // the 3D studio button is off the HUD (Shelly, Nov 9: bothersome)
function renderHud(ctx, player) {
  const s = player.state ?? {}
  const quick = !s.building && screen(s,player.place)==='play' && Object.keys(s.quickSlots??{}).length ? quickItems(s) : []
  if (s.level == null) return ''
  if (s.cut || s.dcut || s.l26cut || s.arrive || s.arrivePending || (s.t0cut && !s.sheetOpen)) return cutUi(ctx, player)
  if (s.menuOpen) return mainMenu(ctx, player)
  if (s.wardrobeOpen && s.salonOpen && !s.wrMenu) return `<div id="hud" style="position:fixed;inset:0;pointer-events:none">${salon(ctx, player)}</div>`
  if (s.wardrobeOpen) return `${THEME}<div id="hud" style="position:fixed;inset:0;pointer-events:none">${wardrobe(ctx, player)}</div>`
  if (s.mj?.seats) return `${THEME}${LIVE}<div id="hud" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">${mahjongPanel(s, ctx.now())}${chatBubbles(ctx, ctx.now(), player)}</div>` // at the mahjong table: only the game and who's talking
  const now = ctx.now(), lv = s.level, mh = maxHp(lv, s), ms = maxSan(lv, s)
  const hpF = Math.max(0, s.hp / mh), sanF = Math.max(0, s.sanity / ms)
  const zone = player.place === 'bonus' ? 'bonus' : (s.zone ?? 'hub')
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
${underwater(s)}<div id="hud" data-panel-open="${['inventory','craft','sheet','journal'].includes(screen(s,player.place))}" style="position:fixed;inset:0;pointer-events:none;overflow:hidden">
  ${questTracker(s, player, ctx)}
  ${!s.building && screen(s,player.place)==='play' ? quickBar(s,quick) : ''}
  ${s.nvgOn ? `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,oklch(0.75 0.2 145 / .10) 35%,oklch(0.08 0.05 145 / .92) 78%);mix-blend-mode:normal"></div><div style="position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,oklch(0.6 0.2 145 / .08) 0 1px,transparent 1px 3px)"></div><div style="position:absolute;top:18px;left:50%;transform:translateX(-50%);color:#7cf08a;font-size:12px;letter-spacing:.3em;opacity:.8">NV · ${Math.round(s.battery)}%</div>` : ''}${xferCard(s, now)}${tutUi(s, now)}${t0Fade(ctx, player)}${restUi(ctx, s)}${mahjongPanel(s, now)}
  ${chatBubbles(ctx, now, player)}
  ${sniperScope(s, wp)}
  <!-- Center Point (hidden during ADS for true ironsights aiming) -->
  ${s.ads ? '' : '<div class="dot-crosshair"></div>'}${s.crouch ? `<div class="sneak sneak-${s.detect ?? 'hidden'}" id="sn-${s.detect ?? 'hidden'}">[${(s.detect ?? 'hidden').toUpperCase()}]<div class="sneak-bar"><i style="width:${Math.round((s.detect === 'danger' ? 1 : s.aware ?? 0) * 100)}%"></i></div></div>` : ''}
  ${s.chargeAt && !W[s.equipped ?? 'fists']?.ranged ? `<style>@keyframes pwrfill{from{stroke-dashoffset:113}to{stroke-dashoffset:0}}@keyframes pwrfull{0%,100%{opacity:1}50%{opacity:.45}}</style><svg id="pwr${s.chargeAt}" width="44" height="44" viewBox="0 0 44 44" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg)"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(20,16,8,.6)" stroke-width="4"/><circle cx="22" cy="22" r="18" fill="none" stroke="#ffb347" stroke-width="3" stroke-dasharray="113" style="filter:drop-shadow(0 0 3px rgba(255,170,40,.9));animation:pwrfill ${(W.power?.charge ?? 0.9)}s linear forwards, pwrfull .25s ${(W.power?.charge ?? 0.9)}s steps(2) infinite"/></svg>` : ''}

  ${(s.leth13 ?? 0) > 0 ? `<div style="position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, transparent ${Math.round(62 - 34 * s.leth13)}%, oklch(0.72 0.03 85 / ${(0.5 * s.leth13).toFixed(2)}) 100%)"></div><div style="position:fixed;left:50%;top:17%;transform:translateX(-50%);pointer-events:none;font:13px/1.3 var(--f, sans-serif);letter-spacing:.08em;color:oklch(0.9 0.04 88 / ${(0.45 + 0.5 * s.leth13).toFixed(2)});text-shadow:0 1px 3px #000">${s.leth13 >= 0.7 ? 'YOU COULD JUST STAY. GET OUT INTO THE HALL.' : s.leth13 >= 0.4 ? 'Your legs are heavy. The sofa looks fine.' : 'It is comfortable in here.'}</div>` : ''}
  <!-- Subtle Sanity Edge Vignette (gently narrows peripheral vision as sanity drops) -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,rgba(8,7,5,0.92) 100%);opacity:${Math.round((1 - sanF) * 42.5) / 50}"></div>

  <!-- Low Health Edge Pulse -->
  ${hpF < 0.3 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 60%,rgba(140,20,15,0.6) 100%);animation:pulse-red 1.2s infinite;opacity:${Math.round((0.3 - hpF) * 125) / 50}"></div>` : ''}

  <!-- BOTTOM-LEFT: HP, sanity, compass, rank -->
  <div class="bl" style="position:absolute;left:28px;bottom:22px;width:min(300px,44vw)">
    ${bar('HP', s.hp, mh, hpF < 0.3 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.ceil(s.hp)}/${mh}`)}
    ${bar(`SAN <span style="opacity:.7">· ${sanWord}</span>`, s.sanity, ms, sanF < 0.25 ? 'oklch(0.68 0.2 35)' : 'var(--a)', `${Math.round(Math.max(0,Math.min(1,sanF))*100)}%`)}
    ${(s.cold ?? 0) > 0 ? bar(`COLD <span style="opacity:.7">· ${s.cold >= 70 ? 'freezing' : s.cold >= 40 ? 'shivering' : 'chilly'}</span>`, s.cold, 100, s.cold >= 70 ? 'oklch(0.72 0.14 235)' : 'oklch(0.82 0.08 220)') : ''}
    ${(s.heat ?? 0) > 0 ? bar(`HEAT <span style="opacity:.7">· ${s.heat >= 70 ? 'scalding' : s.heat >= 40 ? 'sweltering' : 'warm'}</span>`, s.heat, 100, s.heat >= 70 ? 'oklch(0.66 0.22 30)' : s.heat >= 40 ? 'oklch(0.75 0.17 55)' : 'oklch(0.82 0.14 80)', `${Math.round(s.heat)}°`) : ''}
    ${compass(((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360)}
    ${questPip(ctx, player, ((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360)}
    <div style="font-size:11px;margin-top:4px;opacity:.85">LV ${lv} · XP ${s.xp}/${L.xpBase * lv}</div>
  </div>

  <!-- BOTTOM-RIGHT: weapon, condition, stamina, almond water, light -->
  <div class="br" style="position:absolute;bottom:22px;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);width:min(300px,44vw);text-align:right">
    <div style="font-size:15px;color:${rar?.color ?? 'var(--a)'}">${wp.name}${wp.ranged ? (s.reloading ? " · RELOADING" : ` · ${s["loaded_" + s.equipped] ?? 0}/${s[wp.ammoType ?? "ammo"] ?? 0}`) : ""}${rar ? `<span class="tag">${rar.label}</span>` : ''}</div>
    ${hudCnd(s, now)}
    ${bar(s.winded ? 'AP · WINDED' : 'AP', s.stamina, L.stamina, s.winded || s.stamina < 25 ? 'var(--ad)' : 'var(--a)', `${Math.ceil(s.stamina)}`, true)}
    <div class="row" style="margin-top:6px;justify-content:flex-end;gap:8px">
      <span>CASH</span><span style="font-size:15px;color:#9fcf8a">$${((s.cents ?? 0) / 100).toFixed(2)}</span><span>ALMOND</span><span style="font-size:15px">${s.almonds ?? 0}</span>${[['almondsG','#7fcf6a'],['almondsR','#d0574a'],['almondsB','#6f9be0']].filter(([k]) => s[k]).map(([k, c]) => `<span style="font-size:15px;color:${c}">${s[k]}</span>`).join('')}
    </div>
    ${s.attr != null ? (() => { const cap = derived(s).carry, kg = _kg(s); return `<div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px;${kg > cap ? 'color:oklch(0.68 0.2 35)' : ''}"><span>${kg > cap ? 'OVERENCUMBERED · ' : ''}WG</span><span>${kg.toFixed(1)}/${cap}</span></div>` })() : ''}
    <div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px">
      <span>LIGHT</span><span style="${s.light ? '' : 'opacity:.45'}">${s.light ? Math.round(s.battery) + '%' : 'OFF'}</span>
    </div>
    ${(s.grenades ?? 0) + (s.molotovs ?? 0) > 0 ? `<div class="row" style="margin-top:4px;justify-content:flex-end;gap:8px"><span>G</span><span>${s.grenades ? `FRAG ${s.grenades}` : ''}${s.grenades && s.molotovs ? ' · ' : ''}${s.molotovs ? `MOLOTOV ${s.molotovs}` : ''}</span></div>` : ''}
  </div>

  <!-- CENTER: Minimal Zone Header -->
  ${zone === 'l7_sea' || zone === 'l7_ocean' || zone === 'l7_pier' || zone === 'l7_room1' || zone === 'l7_seawatch' || zone === 'l7_fort' ? `<div id="z-${zone}" class="zone" style="position:absolute;left:0;right:0;text-align:center;top:90px;animation:hud-fade 6s forwards;pointer-events:none;color:#58d5e0;text-shadow:3px 3px #02111b">
    <div style="font-size:14px;letter-spacing:.6em;opacity:.7">LEVEL 7</div>
    <div style="font-size:clamp(22px,6vw,52px);letter-spacing:.22em;line-height:1.1;margin:4px 0;white-space:nowrap">${zone === 'l7_fort' ? 'FORT SURRENDER' : zone === 'l7_seawatch' ? 'OUTPOST SEAWATCH' : 'THALASSOPHOBIA'}</div>
    <div style="font-size:13px;letter-spacing:.18em;opacity:.8">${zone === 'l7_fort' ? 'BROKEN FURNITURE · HELD TOGETHER BY TAR · THEY WORSHIP THE THING' : zone === 'l7_seawatch' ? 'M.E.G. MARINE SALVAGE & HYDROPHONE STATION' : 'THE SEA HAS NO FLOOR YOU WILL EVER TOUCH'}</div>
  </div>` : zone === 'l6_halls' ? `<div id="z-${zone}" class="zone" style="position:absolute;left:0;right:0;text-align:center;top:90px;animation:hud-fade 6s forwards;pointer-events:none;color:#f2c14e;text-shadow:3px 3px #000">
    <div style="font-size:14px;letter-spacing:.6em;opacity:.7">LEVEL 6</div>
    <div style="font-size:clamp(26px,7vw,56px);letter-spacing:.28em;line-height:1.1;margin:4px 0;white-space:nowrap">LIGHTS OUT</div>
    <div style="font-size:13px;letter-spacing:.18em;opacity:.75">THE DARK HERE IS OLDER THAN YOU</div>
  </div>` : `<div id="z-${zone}" class="zone" style="position:absolute;left:0;right:0;text-align:center;top:100px;animation:hud-fade 3.5s forwards;pointer-events:none">
    <div style="font-size:22px;letter-spacing:0.12em">${ZONE_NAMES[zone] ?? (LEVEL_NAMES[player.place]?.[1] ?? 'THE LOBBY').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</div>
    <div class="muted" style="font-size:12px;margin-top:2px">
      ${zone === 'bonus' ? 'You feel safe. Everyone lands here.' : zone === 'manila' ? 'The Manila Room. The fluorescent hum softens. Sanity recovers.' : zone === 'hub' ? 'Sanity stabilizes here. Nothing follows.' : zone === 'dark' ? 'Total blackout. Watch the corners.' : zone === 'red' ? 'Severe sanity decay.' : zone === 'l5_housekeeping' ? 'M.E.G. Outpost Housekeeping. Sanity and health recover here.' : zone === 'l5_boiler' ? 'The Boiler Room. Extreme heat and heavy sanity drain.' : zone === 'l5_beverly' ? 'The Beverly Room. Hypnotic ballroom music echoes.' : ''}
    </div>
  </div>`}

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
  ${s.lvlPrompt && !s.sheetOpen ? `<div class="hud-level-prompt">Level up · press ${(lab('sheet', 'K') + '').toUpperCase()} to spend points</div>` : ''}
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
      <div style="font-size:11px;color:#7a6c50;margin-bottom:8px">${s.reading === 24 ? 'Level 10 field observation · Entity 17' : s.reading >= 21 && s.reading <= 23 ? 'Level 0 field document · ' + (s.reading - 20) + ' of 3' : s.reading >= 11 && s.reading <= 17 ? 'Base Alef papers · ' + (s.reading - 10) + ' of 7' : 'torn page · ' + s.reading + ' of 8'}</div>
      <div style="white-space:pre-wrap">${String(PAGES[s.reading]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/~~(.+?)~~/g, '<s style="text-decoration-thickness:3px">$1</s>')}</div>
      <div style="text-align:right;margin-top:12px"><button onclick="sendAction('inv',{k:'read',n:0})" style="background:#2a241a;color:#e9dfc4;border:0;padding:5px 14px;font-family:inherit;cursor:pointer">put it away</button></div>
    </div></div>` : ''}
  ${subtitles(ctx, player, now)}
  ${compassRead(s, ((player.camera?.rotation?.yaw ?? 0) % 360 + 360) % 360, now)}
  <!-- Subdued Initial Hint -->
  <div id="hint" style="position:absolute;left:0;right:0;text-align:center;bottom:180px;font-size:12px;color:rgba(232,228,216,0.45);animation:hud-fade 7s 1s forwards;opacity:0">
    <kbd>${lab('attack', 'Click')}</kbd> attack · <kbd>${lab('cycleWeapon', 'X')}</kbd> weapon · <kbd>${lab('sprint', 'Shift')}</kbd> sprint · <kbd>${lab('flashlight', 'F')}</kbd> light · <kbd>${lab('sheet', 'K')}</kbd> stats · <kbd>${lab('emote', 'T')}</kbd> face
  </div>

</div>${journalUi(s, player, ctx)}${feedUi(ctx, player)}${lootUi(ctx, player)}${pickUi(ctx, player)}${spamUi(ctx, player)}${spamArenaUi(ctx, player)}${talkUi(ctx, player)}${hubUi(ctx, player)}${buildUi(ctx, player)}${statsUi(ctx, player)}${craftUi(ctx, player)}${osUi(ctx, player)}${hordeUi(ctx, player)}${noclipUi(ctx, player)}`
}
