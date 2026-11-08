// The looting HUD and the inventory, after Shelly's Fallout NV reference (#1134): amber CRT lines on dark,
// balanced 2-column Pip-Boy 3000 terminal with CRT scanlines, animated vector wireframes, condition bracket meters,
// direct one-click repair actions, multi-column sorting, and tactile audio feedback.
import AW from './lib/data/almond.yml'
import SNACKS from './lib/data/snacks.yml'
import { describe, itemsOf, MEAT } from './lib/items.js'
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import { derived, carried, handling } from './lib/stats.js'
import { parseCloth, wornTokens, wornDR, fullLook, SLOTS, SLOT_NAME, rowOf, CLOTHES } from './lib/clothes.js'
import { cndOf, armorCnd, band, bandColor, wMul, drMul, repairAmount, isBroken } from './lib/condition.js'
import { penOf } from './lib/combat.js'

const CSS = `<style>
.pb {
  --a: #ffb642;
  --ab: #ffd685;
  --ad: rgba(255,182,66,.52);
  --al: rgba(255,182,66,.18);
  --bg: rgba(14,10,4,.97);
  color: var(--a);
  font-family: 'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;
  text-transform: uppercase;
  text-shadow: 0 0 3px rgba(255,160,30,.55);
}
#lp { position:fixed; inset-inline:0; top:57%; display:flex; flex-direction:column; align-items:center; pointer-events:none; z-index:40 }
#lp .nm { font-size:17px; display:flex; align-items:center; gap:8px; text-shadow:0 1px 3px #000, 0 0 4px rgba(255,160,30,.6) }
#lp .key { display:inline-block; min-width:20px; padding:1px 5px; border:1px solid var(--a); font-size:12px; text-align:center; background:rgba(20,14,5,.8) }
#lp .in { font-size:12px; opacity:.85; margin-top:3px; text-shadow:0 1px 2px #000, 0 0 4px #000 }
#ln { position:fixed; inset-inline:0; top:66%; display:flex; justify-content:center; pointer-events:none; z-index:40 }
#ln span { padding:4px 14px; background:rgba(10,7,2,.94); border-left:3px solid var(--a); border-right:3px solid var(--a); font-size:12px; box-shadow:0 0 10px rgba(0,0,0,.8) }

/* Full Pip-Boy 3000 screen wrapper */
.pbw {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none; background: radial-gradient(ellipse at center, rgba(0,0,0,.68), rgba(0,0,0,.45) 75%);
  z-index: 50;
}
.pbp {
  pointer-events: auto; position: relative;
  background: radial-gradient(ellipse at 50% 45%, rgba(18,12,4,.97) 0%, rgba(8,5,2,.99) 92%);
  border: 2px solid var(--a); border-radius: 6px;
  box-shadow: 0 0 35px rgba(255,170,40,.24), inset 0 0 25px rgba(255,170,40,.09), 0 0 0 1px rgba(0,0,0,.9);
  padding: 14px 20px 12px;
  width: min(840px, calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset, 50px) + 16px)));
  min-height: 440px; max-height: min(640px, 88vh);
  box-sizing: border-box; display: flex; flex-direction: column;
  animation: nvTurnOn .22s ease-out both;
  overflow: hidden;
}
/* CRT scanlines and sweep bar */
.pbp::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px);
  z-index: 3;
}
@keyframes nvScan { 0% { transform: translateY(-100%) } 100% { transform: translateY(1200%) } }
.pbp::after {
  content: ''; position: absolute; left: 0; right: 0; height: 35px; top: 0;
  background: linear-gradient(180deg, transparent, rgba(255,182,66,.06), transparent);
  pointer-events: none; animation: nvScan 7s linear infinite; z-index: 4;
}
@keyframes nvTurnOn {
  0% { transform: scaleY(0.005) scaleX(0.3); opacity: 0; filter: brightness(3.5) }
  45% { transform: scaleY(0.01) scaleX(1); opacity: 0.9; filter: brightness(2) }
  75% { transform: scale(1.02); opacity: 1; filter: brightness(1.3) }
  100% { transform: scale(1); opacity: 1; filter: brightness(1) }
}

/* Header & Tabs */
.nv-top {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  padding-bottom: 6px; border-bottom: 2px solid var(--a); position: relative;
}
.nv-top-left { display: flex; align-items: baseline; gap: 14px }
.nv-top-left h2 { font-size: 20px; margin: 0; font-weight: 400; letter-spacing: .08em; text-shadow: 0 0 6px rgba(255,170,40,.8) }
.nv-mode-tabs { display: flex; gap: 4px; margin-left: 10px }
.nv-mode-btn {
  font: inherit; font-size: 11px; letter-spacing: .08em; padding: 2px 8px;
  background: none; border: 1px solid var(--al); color: var(--ad); cursor: pointer;
}
.nv-mode-btn:hover { border-color: var(--a); color: var(--a) }
.nv-mode-btn.on { background: var(--al); border-color: var(--a); color: var(--a); font-weight: bold }

.nv-vitals { display: flex; gap: 14px; font-size: 12px; letter-spacing: .04em }
.nv-vitals span b { font-weight: 400; color: var(--ad); margin-right: 4px }
.nv-vitals .warn { color: #ff5544; animation: nvBlink .8s infinite }
@keyframes nvBlink { 50% { opacity: .4 } }

/* Sub-category Tabs */
.tabs { display: flex; gap: 3px; margin: 8px 0 6px; flex-wrap: wrap }
.tabs button {
  flex: 1; min-width: 58px; font: inherit; font-size: 11px; letter-spacing: .06em;
  padding: 4px 2px; background: none; border: 1px solid var(--al); color: var(--ad);
  cursor: pointer; text-align: center; transition: background .12s, color .12s;
}
.tabs button:hover { border-color: var(--a); color: var(--a); background: rgba(255,182,66,.08) }
.tabs button.on { background: var(--a); color: #120b02; border-color: var(--a); font-weight: 700; box-shadow: 0 0 8px rgba(255,182,66,.5) }

/* Sorting Bar */
.sort-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 3px 6px; background: rgba(255,182,66,.05); border-bottom: 1px solid var(--al);
  font-size: 10px; letter-spacing: .08em; margin-bottom: 6px;
}
.sort-btns { display: flex; gap: 4px }
.sort-btn {
  font: inherit; font-size: 10px; background: none; border: none; color: var(--ad);
  padding: 1px 4px; cursor: pointer;
}
.sort-btn:hover { color: var(--a) }
.sort-btn.on { color: var(--a); font-weight: bold; text-decoration: underline; text-underline-offset: 2px }

/* Weight capacity meter */
.wb-wrap { display: flex; align-items: center; gap: 8px; margin: 2px 0 6px; font-size: 10px }
.wb { flex: 1; height: 5px; background: rgba(255,182,66,.14); border: 1px solid var(--al); position: relative; overflow: hidden }
.wb i { display: block; height: 100%; background: var(--a); box-shadow: 0 0 6px rgba(255,170,40,.8); transition: width .2s }
.wb.ov i { background: #ff4a36; box-shadow: 0 0 8px #ff4a36 }

/* Body: 2 balanced columns */
.bd { display: flex; gap: 18px; flex: 1; min-height: 0; padding: 2px 0 }
.ls {
  flex: 0 0 52%; overflow-y: auto; overflow-x: hidden; min-height: 0;
  scrollbar-width: thin; scrollbar-color: var(--ad) transparent;
  padding-right: 4px;
}
.sec {
  font-size: 10px; color: var(--ad); letter-spacing: .12em; margin: 8px 0 3px;
  padding-bottom: 2px; border-bottom: 1px solid var(--al);
}
.sec:first-child { margin-top: 0 }

/* Items list rows */
.it {
  box-sizing: border-box; display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 4px 6px; background: none; border: 1px solid transparent;
  color: inherit; font: inherit; font-size: 14px; text-align: left; text-transform: inherit;
  cursor: pointer; position: relative; transition: background .1s, border-color .1s;
}
.it:hover {
  background: rgba(255,182,66,.12); border-color: var(--a);
  text-shadow: 0 0 5px rgba(255,170,40,.8);
}
.it .cur { font-size: 11px; color: var(--ad); width: 14px; flex: none; text-align: center }
.it:hover .cur { color: var(--a) }
.it .eq-tag {
  font-size: 9px; padding: 0 3px; background: var(--a); color: #120b02;
  font-weight: bold; flex: none; border-radius: 1px;
}
.it.on .eq-tag { display: inline-block }
.it:not(.on) .eq-tag { display: none }
.it .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1 }
.it .stat-r { display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 11px; flex: none; color: var(--ad) }
.it:hover .stat-r { color: var(--a) }
.it .cnd-mini { font-size: 10px; letter-spacing: 1px; font-weight: bold }

/* Right Details Card */
.dt {
  flex: 1; display: none; flex-direction: column; min-height: 0;
  border-left: 1px solid var(--al); padding-left: 16px; position: relative;
}
.it:hover .dt, .def { display: flex }
.pbp:not(.inv):has(.ls .it:hover) .def { display: none }
.it.sel { background: rgba(255,182,66,.16); box-shadow: inset 3px 0 0 var(--ab) }
.acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 10px }
.acts .act { font: inherit; font-size: 12px; letter-spacing: .1em; padding: 6px 12px; cursor: pointer; color: #16140e; background: var(--a); border: 1px solid var(--ab); box-shadow: 2px 2px 0 #000 }
.acts .act:hover { background: var(--ab) }
.acts .act:active { transform: translate(1px,1px); box-shadow: 1px 1px 0 #000 }

.dt-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px }
.dt-header h4 { font-size: 18px; font-weight: 400; margin: 0; letter-spacing: .04em; color: var(--ab) }
.dt-rarity { font-size: 10px; letter-spacing: .12em; padding: 1px 5px; border: 1px solid currentColor }

/* Vector artwork container */
.art-box {
  width: 100%; height: 58px; display: flex; align-items: center; justify-content: center;
  margin: 4px 0 8px; border: 1px solid var(--al); background: rgba(255,182,66,.03);
  position: relative; overflow: hidden;
}
.nv-art { filter: drop-shadow(0 0 4px rgba(255,170,40,.6)) }
@keyframes nvSpin { 100% { transform: rotate(360deg) } }
.nv-spin { transform-origin: center; animation: nvSpin 8s linear infinite }
@keyframes nvPulse { 0%,100% { transform: scale(1); opacity: .7 } 50% { transform: scale(1.1); opacity: 1 } }
.nv-pulse { transform-origin: center; animation: nvPulse 2.4s ease-in-out infinite }
@keyframes nvEcg { 0% { stroke-dashoffset: 100 } 100% { stroke-dashoffset: 0 } }
.nv-ecg { animation: nvEcg 2s linear infinite }

/* Stats grid */
.g { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; row-gap: 2px }
.g div { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 2px; border-bottom: 1px solid var(--al) }
.g div span { color: var(--ad) }
.g .w { grid-column: 1/3 }
.g .req-fail { color: #ff5544; font-weight: bold }
.up { color: #9ee08a } .dn { color: #e07a5a }

/* Direct one-click repair card actions */
.rep-box {
  margin-top: 8px; padding: 6px 8px; background: rgba(255,182,66,.06);
  border: 1px solid var(--al); display: flex; flex-direction: column; gap: 4px;
}
.rep-box-title { font-size: 10px; color: var(--ad); letter-spacing: .1em; display: flex; justify-content: space-between }
.rep-btn {
  font: inherit; font-size: 11px; letter-spacing: .04em; background: rgba(20,14,5,.85);
  border: 1px solid var(--a); color: var(--a); padding: 3px 8px; text-align: left;
  cursor: pointer; display: flex; justify-content: space-between; align-items: center;
  transition: background .12s, color .12s;
}
.rep-btn:hover { background: var(--a); color: #120b02; font-weight: bold; box-shadow: 0 0 8px rgba(255,170,40,.6) }
.rep-btn span { font-size: 10px; opacity: .85 }

/* Footer */
.ft {
  display: flex; align-items: center; gap: 14px; padding: 8px 6px 0;
  border-top: 2px solid var(--a); font-size: 12px; margin-top: auto;
  position: relative;
}
.ft::before, .ft::after { content: ''; position: absolute; top: -2px; width: 2px; height: 8px; background: var(--a); transform: translateY(-100%) }
.ft::before { left: 0 } .ft::after { right: 0 }
.ft button {
  font: inherit; text-transform: inherit; text-shadow: inherit; color: var(--a);
  background: none; border: none; padding: 2px 0; cursor: pointer;
}
.ft button:hover { text-decoration: underline; text-underline-offset: 3px; color: var(--ab) }
.ft kbd {
  font-family: inherit; font-size: 10px; border: 1px solid var(--a); padding: 0 4px;
  margin-right: 5px; background: rgba(20,14,5,.7);
}
.ft .c { color: var(--ad); margin-right: auto; font-size: 11px }
.em { color: var(--ad); font-size: 13px; padding: 12px 8px; text-align: center; font-style: italic }

@media (max-width: 640px) {
  .ls { flex: 1 1 auto }
  .dt, .def { display: none !important }
  .pbp.inv .bd { flex-direction: column }
  .pbp.inv .dt.def { display: flex !important }
  .nv-vitals { display: none }
  .nv-mode-tabs { display: none }
}
</style>`

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',').filter(Boolean) : [])]
const worn = (s, slot) => { const l = fullLook(s.look), c = CLOTHES.colourKey[slot]; return rowOf(slot, l[slot], c ? l[c] : '') }
const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? derived(s).hpBonus : 0)
const cell = (k, v, wide, cls = '') => `<div class="${wide ? 'w' : ''} ${cls}"><span>${k}</span>${v}</div>`

// CND bracket meter: [ ■■■■■■■■□□ ] 80% GOOD
function cndMeter(c, len = 10) {
  const pips = Math.max(0, Math.min(len, Math.round((c / 100) * len)))
  const col = bandColor(c), b = band(c)
  return `<span style="color:${col};font-weight:bold">[ <span style="letter-spacing:1px">${'■'.repeat(pips)}</span><span style="color:var(--al);letter-spacing:1px">${'□'.repeat(len - pips)}</span> ] ${Math.round(c)}% ${b}</span>`
}

function cndMini(c) {
  const col = bandColor(c)
  const pips = Math.max(0, Math.min(6, Math.round((c / 100) * 6)))
  return `<span class="cnd-mini" style="color:${col}">[${'■'.repeat(pips)}${'·'.repeat(6 - pips)}] ${Math.round(c)}%</span>`
}

// Estimated value in Backdollars/caps
function itemVal(t) {
  if (t.startsWith('weapon:') || W[t]?.damage != null) {
    const k = t.startsWith('weapon:') ? t.slice(7) : t, w = W[k]
    return w ? Math.max(4, Math.round((w.damage * 0.75 + (w.xp ?? 20) * 0.5) * (w.ranged ? 1.4 : 1))) : 10
  }
  if (t.startsWith('cloth:')) {
    const p = parseCloth(t)
    return p ? Math.max(3, Math.round(p.row.dr * 5 + 4)) : 6
  }
  if (t.startsWith('almond')) return 6
  if (t === 'ammo') return 4
  if (t === 'shells') return 5
  if (t === 'bobbypin') return 2
  return 3
}

// Animated Vector Artwork SVGs
const SVG_GUN = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <defs><radialGradient id="glwG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffb642" stop-opacity="0.25"/><stop offset="100%" stop-color="#ffb642" stop-opacity="0"/></radialGradient></defs>
  <rect x="0" y="0" width="120" height="52" fill="url(#glwG)"/>
  <path d="M16 20 h56 v6 h-24 v18 h-12 v-15 h-20 z" fill="none" stroke="var(--a)" stroke-width="1.8"/>
  <rect x="72" y="22" width="28" height="3" fill="none" stroke="var(--a)" stroke-width="1.2"/>
  <g class="nv-spin" style="transform-origin:86px 23.5px">
    <circle cx="86" cy="23.5" r="10" fill="none" stroke="var(--ad)" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="86" y1="9" x2="86" y2="15" stroke="var(--a)" stroke-width="1.4"/>
    <line x1="86" y1="32" x2="86" y2="38" stroke="var(--a)" stroke-width="1.4"/>
    <line x1="72" y1="23.5" x2="78" y2="23.5" stroke="var(--a)" stroke-width="1.4"/>
    <line x1="94" y1="23.5" x2="100" y2="23.5" stroke="var(--a)" stroke-width="1.4"/>
  </g>
  <circle cx="86" cy="23.5" r="2" fill="var(--ab)"/>
</svg>`

const SVG_MELEE = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <defs><radialGradient id="glwM" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffb642" stop-opacity="0.25"/><stop offset="100%" stop-color="#ffb642" stop-opacity="0"/></radialGradient></defs>
  <rect x="0" y="0" width="120" height="52" fill="url(#glwM)"/>
  <line x1="20" y1="38" x2="94" y2="14" stroke="var(--a)" stroke-width="3" stroke-linecap="round"/>
  <line x1="86" y1="10" x2="102" y2="18" stroke="var(--ab)" stroke-width="2.2"/>
  <line x1="26" y1="40" x2="32" y2="32" stroke="var(--a)" stroke-width="2"/>
  <circle cx="60" cy="26" r="15" fill="none" stroke="var(--ad)" stroke-width="1" stroke-dasharray="2 4" class="nv-spin"/>
  <line x1="60" y1="8" x2="60" y2="44" stroke="var(--al)" stroke-width="1"/>
</svg>`

const SVG_ARMOR = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <circle cx="60" cy="12" r="6" fill="none" stroke="var(--a)" stroke-width="1.6"/>
  <path d="M46 22 c0 -4 6 -6 14 -6 s14 2 14 6 v14 c0 6 -8 10 -14 10 s-14 -4 -14 -10 z" fill="none" stroke="var(--a)" stroke-width="1.8"/>
  <path d="M51 27 h18 M53 33 h14" stroke="var(--ad)" stroke-width="1.3"/>
  <circle cx="60" cy="28" r="19" fill="none" stroke="var(--ad)" stroke-width="1" stroke-dasharray="4 4" class="nv-pulse"/>
</svg>`

const SVG_AID = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <rect x="52" y="10" width="16" height="6" fill="none" stroke="var(--a)" stroke-width="1.5"/>
  <path d="M48 16 h24 l4 6 v22 h-32 v-22 z" fill="none" stroke="var(--a)" stroke-width="1.8"/>
  <path d="M12 32 h28 l3 -10 l4 20 l3 -12 l2 4 h56" fill="none" stroke="var(--ab)" stroke-width="1.6" stroke-dasharray="120" class="nv-ecg"/>
</svg>`

const SVG_AMMO = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <rect x="40" y="20" width="8" height="22" fill="none" stroke="var(--a)" stroke-width="1.4"/>
  <path d="M40 20 l4 -8 l4 8 z" fill="var(--ad)" stroke="var(--a)" stroke-width="1.2"/>
  <rect x="55" y="15" width="10" height="27" fill="none" stroke="var(--a)" stroke-width="1.4"/>
  <path d="M55 15 l5 -9 l5 9 z" fill="var(--ad)" stroke="var(--a)" stroke-width="1.2"/>
  <rect x="72" y="22" width="8" height="20" fill="none" stroke="var(--a)" stroke-width="1.4"/>
  <path d="M72 22 l4 -8 l4 8 z" fill="var(--ad)" stroke="var(--a)" stroke-width="1.2"/>
  <line x1="20" y1="44" x2="100" y2="44" stroke="var(--a)" stroke-width="1.2"/>
</svg>`

const SVG_REPAIR = `<svg width="120" height="52" viewBox="0 0 120 52" class="nv-art">
  <g class="nv-spin" style="transform-origin:60px 26px">
    <circle cx="60" cy="26" r="13" fill="none" stroke="var(--a)" stroke-width="2"/>
    <circle cx="60" cy="26" r="5" fill="none" stroke="var(--a)" stroke-width="1.5"/>
    <line x1="60" y1="10" x2="60" y2="42" stroke="var(--a)" stroke-width="3"/>
    <line x1="44" y1="26" x2="76" y2="26" stroke="var(--a)" stroke-width="3"/>
    <line x1="48" y1="14" x2="72" y2="38" stroke="var(--a)" stroke-width="3"/>
    <line x1="48" y1="38" x2="72" y2="14" stroke="var(--a)" stroke-width="3"/>
  </g>
</svg>`

// The right-hand details pane for an item token
function detail(t, s, def) {
  const cls = `dt${def ? ' def' : ''}`
  const sk = derived(s).repairCap ? s : {}
  const repairSkill = (s.skl ? String(s.skl).split(',').map(Number)[7] : 15) || 15

  if (t.startsWith('weapon:') || W[t]?.damage != null) {
    const k = t.startsWith('weapon:') ? t.slice(7) : t, w = W[k]
    if (!w) return ''
    const r = W.rarities?.[w.rarity], cur = W[s.equipped] ?? W.fists, d = w.damage - cur.damage
    const cmp = k !== (s.equipped ?? 'fists') && d ? ` <i class="${d > 0 ? 'up' : 'dn'}" style="font-style:normal">${d > 0 ? '▲+' : '▼'}${d}</i>` : ''
    const c = cndOf(s, k), dps = Math.round(w.damage / w.cooldown)
    const hd = handling(s, w)
    const reqHarm = hd.str > 0 || hd.skill > 0
    const reqStr = w.req ? (w.req.h ? `HAR ${w.req.h}${hd.str > 0 ? ` (!)` : ''}` : '') + (w.req.guns ? ` · GUNS ${w.req.guns}${hd.skill > 0 ? ` (!)` : ''}` : '') : 'NONE'
    const val = itemVal(k)

    // Direct contextual repair options
    const kits = s.kits ?? 0, tapes = s.tapes ?? 0
    const spares = owned(s).filter((x) => x === k).length
    let repHtml = ''
    if (k !== 'fists' && c < 99.5) {
      const btns = []
      if (kits > 0) btns.push(`<button class="rep-btn" onclick="sendAction('inv',{k:'repair',m:'kit',t:'w:${k}'})"><span>USE WEAPON REPAIR KIT</span><b>+${Math.round(repairAmount.kit(repairSkill))}% (${kits})</b></button>`)
      if (tapes > 0 && c < 45) btns.push(`<button class="rep-btn" onclick="sendAction('inv',{k:'repair',m:'tape',t:'w:${k}'})"><span>PATCH WITH DUCT TAPE</span><b>+15% (${tapes})</b></button>`)
      if (spares > 1) btns.push(`<button class="rep-btn" onclick="sendAction('inv',{k:'repair',m:'spare',t:'w:${k}'})"><span>CANNIBALISE SPARE COPY</span><b>+${Math.round(repairAmount.spare(repairSkill))}%</b></button>`)
      if (btns.length) repHtml = `<div class="rep-box"><div class="rep-box-title"><span>FIELD REPAIR</span><span>REQ: REPAIR</span></div>${btns.join('')}</div>`
    }

    return `<div class="${cls}">
      <div class="dt-header">
        <h4>${w.name}</h4>
        <span class="dt-rarity" style="color:${r?.color ?? 'var(--ad)'}">${r?.label ?? 'STANDARD'}</span>
      </div>
      <div class="art-box">${w.ranged ? SVG_GUN : SVG_MELEE}</div>
      <div class="g">
        ${cell('DAM', `${w.damage}${cmp}`)}
        ${cell('DPS', `${dps}`)}
        ${cell('CND', cndMeter(c), true)}
        ${cell('REQ', reqStr, true, reqHarm ? 'req-fail' : '')}
        ${cell('SPD', `${(1 / w.cooldown).toFixed(1)}/S`)}
        ${cell('AP', `${w.stamina}`)}
        ${cell('PEN', `${Math.round(penOf(w, k) * 100)}% ARMOR`)}
        ${cell('WG', `${w.kg ?? 1.0} KG`)}
        ${cell('VAL', `$${val}.00`)}
        ${w.ranged ? cell('MAG', `${s['loaded_' + k] ?? 0}/${w.magSize}`) + cell(w.ammoType === 'shells' ? 'SHELLS' : 'ROUNDS', s[w.ammoType ?? 'ammo'] ?? 0) : ''}
        ${w.pellets ? cell('PELLETS', `${w.pellets} BUCKSHOT`, true) : ''}
        ${w.sneak && w.sneak > 1 ? cell('SNEAK CRIT', `x${w.sneak} DAMAGE`, true) : ''}
      </div>
      ${repHtml}
    </div>`
  }

  if (t.startsWith('cloth:')) {
    const p = parseCloth(t); if (!p) return ''
    const r = CLOTHES.rarity[p.row.rarity] ?? {}, cur = worn(s, p.slot), d = p.row.dr - (cur?.dr ?? 0)
    const cmp = d ? ` <i class="${d > 0 ? 'up' : 'dn'}" style="font-style:normal">${d > 0 ? '▲+' : '▼'}${d}</i>` : ''
    const c = armorCnd(s.look, t)
    const val = itemVal(t)

    // Direct contextual armor repair
    const akits = s.akits ?? 0
    const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : []
    const spares = bag.filter((x) => x === t).length
    let repHtml = ''
    if (c < 99.5) {
      const btns = []
      if (akits > 0) btns.push(`<button class="rep-btn" onclick="sendAction('inv',{k:'repair',m:'akit',t:''})"><span>MEND WITH ARMOR KIT</span><b>+${Math.round(repairAmount.akit(repairSkill))}% (${akits})</b></button>`)
      if (spares > (wornTokens(s.look).includes(t) ? 0 : 1)) btns.push(`<button class="rep-btn" onclick="sendAction('inv',{k:'repair',m:'spare',t:'a:${t}'})"><span>STITCH WITH SPARE COPY</span><b>+${Math.round(repairAmount.spare(repairSkill))}%</b></button>`)
      if (btns.length) repHtml = `<div class="rep-box"><div class="rep-box-title"><span>ARMOR REPAIR</span><span>REQ: REPAIR</span></div>${btns.join('')}</div>`
    }

    return `<div class="${cls}">
      <div class="dt-header">
        <h4>${p.row.name}</h4>
        <span class="dt-rarity" style="color:${r.color ?? 'var(--ad)'}">${(r.label ?? 'COMMON').toUpperCase()}</span>
      </div>
      <div class="art-box">${SVG_ARMOR}</div>
      <div class="g">
        ${cell('DR', `${p.row.dr}${cmp}`)}
        ${cell('SLOT', SLOT_NAME[p.slot].toUpperCase())}
        ${cell('CND', cndMeter(c), true)}
        ${cell('WG', `${p.row.kg} KG`)}
        ${cell('VAL', `$${val}.00`)}
        ${cell('COLOR', `<span style="display:inline-block;width:12px;height:12px;background:#${p.colour};border:1px solid var(--ad);vertical-align:middle"></span>`)}
        ${cell('WORN', cur ? `${cur.name} · DR ${cur.dr}` : 'NONE')}
      </div>
      ${repHtml}
    </div>`
  }

  if (t.startsWith('almond:')) {
    const c = t.slice(7), a = AW[c], key = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }[c]
    return `<div class="${cls}">
      <div class="dt-header"><h4>${a.name}</h4><span class="dt-rarity" style="color:${a.color}">AID</span></div>
      <div class="art-box">${SVG_AID}</div>
      <div class="g">
        ${cell('HP', `+${a.hp}`)}${cell('SANITY', `+${a.sanity}`)}
        ${cell('WG', '0.5 KG')}${cell('VAL', '$6.00')}
        ${cell('CARRIED', `${s[key] ?? 0} BOTTLES`, true)}
        ${cell('EFFECT', a.note, true)}
      </div>
    </div>`
  }
  if (t === 'almond') {
    return `<div class="${cls}">
      <div class="dt-header"><h4>Almond water</h4><span class="dt-rarity">AID</span></div>
      <div class="art-box">${SVG_AID}</div>
      <div class="g">
        ${cell('HP', `+${L.almondHp}`)}${cell('SANITY', `+${L.almondSanity}`)}
        ${cell('WG', '0.5 KG')}${cell('VAL', '$5.00')}
        ${cell('CARRIED', `${s.almonds ?? 0} BOTTLES`, true)}
      </div>
    </div>`
  }
  if (t === 'ammo' || t === 'shells') {
    const a = W[t], nm = t === 'ammo' ? 'Pistol rounds' : 'Shotgun shells'
    return `<div class="${cls}">
      <div class="dt-header"><h4>${nm}</h4><span class="dt-rarity">AMMO</span></div>
      <div class="art-box">${SVG_AMMO}</div>
      <div class="g">
        ${cell('CALIBER', t === 'ammo' ? '9MM / .38' : '12 GAUGE')}
        ${cell('BOX QTY', `+${a.perPickup}`)}
        ${cell('CARRIED', `${s[t] ?? 0} ROUNDS`)}
        ${cell('VAL', t === 'ammo' ? '$4.00' : '$5.00')}
      </div>
    </div>`
  }
  if (t === 'bobbypin') {
    return `<div class="${cls}">
      <div class="dt-header"><h4>Bobby pin</h4><span class="dt-rarity">MISC</span></div>
      <div class="art-box">${SVG_REPAIR}</div>
      <div class="g">
        ${cell('TYPE', 'LOCKPICK TOOL')}
        ${cell('CARRIED', `${s.bobbypins != null ? s.bobbypins : 6}`)}
        ${cell('USE', 'OPENS LOCKS', true)}
      </div>
    </div>`
  }
  return ''
}


// the inventory's right pane: the picked item (click a row), else what you hold; its verbs are buttons here, a double-click on a row does the first
function pane(s, sel, eqKey) {
  const own = owned(s), bag = s.clothes ? s.clothes.split(',').filter(Boolean) : [], on = wornTokens(s.look)
  const btn = (lab, d, key) => `<button class="act" onclick="sendAction('inv',${JSON.stringify(d).replace(/"/g, "'")})">${key ? `<kbd>${key}</kbd>` : ''}${lab}</button>`
  let card = '', acts = []
  if (W[sel]?.damage != null && own.includes(sel)) {
    card = detail(sel, s, true)
    if (sel !== eqKey) acts.push(btn('EQUIP', { k: 'equip', w: sel }))
    if (sel !== 'fists') acts.push(btn('DROP ONE', { k: 'drop', w: sel }))
  } else if (sel.startsWith('cloth:') && (bag.includes(sel) || on.includes(sel))) {
    card = detail(sel, s, true); const p = parseCloth(sel)
    acts.push(on.includes(sel) ? btn('TAKE OFF', { k: 'unwear', w: p?.slot }) : btn('WEAR', { k: 'wear', w: sel })); if (bag.includes(sel)) acts.push(btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (sel.startsWith('almond:')) {
    const c = sel.slice(7), key = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }[c]
    if (s[key] > 0) { card = detail(sel, s, true); acts.push(btn('DRINK', { k: 'drink', c }), btn('DROP ONE', { k: 'dropItem', t: sel })) }
  } else if (sel.startsWith('meat:') && (s.meat?.[sel.slice(5)] ?? 0) > 0 && MEAT[sel.slice(5)]) {
    const m = MEAT[sel.slice(5)]
    card = `<div class="dt def"><div class="dt-header"><h4 style="color:${m.color}">${m.name}</h4><span class="dt-rarity">AID</span></div><div class="art-box">${SVG_AID}</div><div class="g">${cell('HP', '+' + m.hp)}${cell('HUNGER', '+' + (m.food ?? 0))}${cell('CARRIED', s.meat[sel.slice(5)], true)}</div></div>`
    acts.push(btn('EAT', { k: 'eat', c: sel.slice(5) }), btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (sel.startsWith('snack:') && (s.snacks?.[sel.slice(6)] ?? 0) > 0 && SNACKS[sel.slice(6)]) {
    const v = SNACKS[sel.slice(6)]
    card = `<div class="dt def"><div class="dt-header"><h4>${v.name}</h4><span class="dt-rarity">${v.drink ? 'DRINK' : 'FOOD'}</span></div><div class="art-box">${SVG_AID}</div><div class="g">${v.drink ? cell('THIRST', '+' + v.thirst) : cell('HUNGER', '+' + v.hunger)}${cell('CARRIED', s.snacks[sel.slice(6)], true)}</div></div>`
    acts.push(btn(v.drink ? 'DRINK' : 'EAT', { k: 'snack', c: sel.slice(6) }), btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if ((sel === 'ammo' || sel === 'shells') && s[sel] > 0) { card = detail(sel, s, true); acts.push(btn('DROP A BOX', { k: 'dropItem', t: sel })) }
  else if (sel === 'bobbypin' && s.bobbypins > 0) { card = detail(sel, s, true); acts.push(btn('DROP ONE', { k: 'dropItem', t: sel })) }
  if (!card) { card = detail(eqKey, s, true); acts = eqKey !== 'fists' ? [btn('DROP ONE', { k: 'drop', w: eqKey })] : [] }
  const bar = acts.length ? `<div class="acts">${acts.join('')}</div>` : ''
  const i = card.lastIndexOf('</div>')
  return i < 0 ? card : card.slice(0, i) + bar + card.slice(i)
}

// Full repair bench tab
function repairSec(s) {
  const sk = (s.skl ? String(s.skl).split(',').map(Number)[7] : 15) || 15
  const btn = (lab, m, t, tip) => `<button title="${tip}" style="margin-left:6px;padding:2px 8px;font:inherit;font-size:10px;cursor:pointer;background:rgba(20,14,5,.9);border:1px solid var(--a);color:var(--a)" onclick="sendAction('inv',{k:'repair',m:'${m}',t:'${t}'})">${lab}</button>`
  const kits = s.kits ?? 0, tapes = s.tapes ?? 0, akits = s.akits ?? 0
  const rows = []

  for (const k of [...new Set(owned(s))].filter((x) => x !== 'fists')) {
    const c = cndOf(s, k), n = owned(s).filter((x) => x === k).length
    if (c >= 99.5) continue
    rows.push(`<div class="it"><span class="cur">&gt;</span><span class="nm">${W[k].name}</span><span class="stat-r" style="color:${bandColor(c)}">${cndMini(c)}${kits ? btn('KIT', 'kit', 'w:' + k, `Weapon kit (+${Math.round(repairAmount.kit(sk))}%)`) : ''}${tapes && c < 45 ? btn('TAPE', 'tape', 'w:' + k, 'Duct tape (+15%, cap 45%)') : ''}${n > 1 ? btn('SPARE', 'spare', 'w:' + k, 'Strip spare copy for parts') : ''}</span></div>`)
  }

  const bag = s.clothes ? s.clothes.split(',').filter(Boolean) : []
  for (const t of wornTokens(s.look)) {
    const p = parseCloth(t), c = armorCnd(s.look, t); if (!p || c >= 99.5) continue
    rows.push(`<div class="it"><span class="cur">&gt;</span><span class="nm">${p.row.name}</span><span class="stat-r" style="color:${bandColor(c)}">${cndMini(c)}${bag.includes(t) ? btn('SPARE', 'spare', 'a:' + t, 'Stitch from spare copy') : ''}</span></div>`)
  }
  for (const t of [...new Set(bag)]) {
    const p = parseCloth(t), c = armorCnd(s.look, t), n = bag.filter((x) => x === t).length; if (!p || c >= 99.5 || n < 2 || wornTokens(s.look).includes(t)) continue
    rows.push(`<div class="it"><span class="cur">&gt;</span><span class="nm">${p.row.name} ×${n}</span><span class="stat-r" style="color:${bandColor(c)}">${cndMini(c)}${btn('SPARE', 'spare', 'a:' + t, 'Stitch from spare copy')}</span></div>`)
  }

  const stock = `<div class="sec">REPAIR SUPPLIES</div>
  <div class="it"><span class="cur">&gt;</span><span class="nm">Kits & Tools</span><span class="stat-r">W-KIT: ${kits} · A-KIT: ${akits} · TAPE: ${tapes}${akits && wornTokens(s.look).length ? btn('MEND ALL ARMOR', 'akit', '', 'Mend every worn piece') : ''}</span></div>`

  if (!rows.length && !kits && !akits && !tapes) return '<div class="em">All equipped weapons and armor are in pristine shape.</div>'
  return `${stock}<div class="sec">DAMAGED GEAR</div>${rows.join('') || '<div class="em">All gear in good repair.</div>'}`
}

function inventory(s) {
  const lv = s.level ?? 1, eqKey = s.equipped ?? 'fists'
  const sortMode = s.invSort ?? 'name', sel = s.invSel || eqKey

  // Weapons list
  let weaponKeys = (W.order ?? []).filter((k) => owned(s).includes(k))
  if (sortMode === 'dam') weaponKeys.sort((a, b) => (W[b]?.damage ?? 0) - (W[a]?.damage ?? 0))
  else if (sortMode === 'wg') weaponKeys.sort((a, b) => (W[b]?.kg ?? 1) - (W[a]?.kg ?? 1))
  else if (sortMode === 'cnd') weaponKeys.sort((a, b) => cndOf(s, a) - cndOf(s, b))
  else weaponKeys.sort((a, b) => (W[a]?.name ?? '').localeCompare(W[b]?.name ?? ''))

  const weapons = weaponKeys.map((k) => {
    const w = W[k], on = k === eqKey, cnt = owned(s).filter((x) => x === k).length
    const c = cndOf(s, k)
    const ammoStat = w.ranged ? `${s['loaded_' + k] ?? 0}/${s[w.ammoType ?? 'ammo'] ?? 0}` : `DAM ${w.damage}`
    const inner = `<span class="cur">&gt;</span><span class="eq-tag">EQ</span><span class="nm">${w.name}${cnt > 1 ? ` ×${cnt}` : ''}</span><span class="stat-r"><span>${ammoStat}</span>${k !== 'fists' ? cndMini(c) : ''}</span>`
    return `<button class="it${on ? ' on' : ''}${sel === k ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${k}'})" ondblclick="sendAction('inv',{k:'equip',w:'${k}'})">${inner}</button>`
  }).join('')

  // Aid list
  const AWK = [
    ['grey', 'almonds', 'Grey almond water', '#b9bcb4'],
    ['green', 'almondsG', 'Green almond water', '#7fcf6a'],
    ['red', 'almondsR', 'Red almond water', '#d0574a'],
    ['blue', 'almondsB', 'Blue almond water', '#6f9be0']
  ]
  const anyAw = AWK.some(([, k]) => s[k])
  const aid0 = anyAw ? AWK.filter(([, k]) => s[k]).map(([c, k, nm, col]) => `
    <button class="it${sel === 'almond:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'almond:${c}'})" ondblclick="sendAction('inv',{k:'drink',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${col}">${nm}</span>
      <span class="stat-r"><span>×${s[k]}</span><span style="color:#9ee08a">+${AW[c]?.hp ?? 25} HP</span></span>
      
    </button>`).join('') + `<button class="it" onclick="sendAction('inv',{k:'splash'})"><span class="cur">&gt;</span><span class="nm">Splash a bottle</span><span class="stat-r">[ J ]</span></button>` : ''

  const meatRows = Object.entries(s.meat ?? {}).filter(([c, n]) => n > 0 && MEAT[c]).map(([c, n]) => `
    <button class="it${sel === 'meat:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'meat:${c}'})" ondblclick="sendAction('inv',{k:'eat',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${MEAT[c].color}">${MEAT[c].name}</span>
      <span class="stat-r"><span>×${n}</span><span style="color:#9ee08a">+${MEAT[c].hp} HP</span></span>
    </button>`).join('')

  const snackRows = Object.entries(s.snacks ?? {}).filter(([c, n]) => n > 0 && SNACKS[c]).map(([c, n]) => {
    const v = SNACKS[c]
    return `<button class="it${sel === 'snack:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'snack:${c}'})" ondblclick="sendAction('inv',{k:'snack',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm">${v.name}</span>
      <span class="stat-r"><span>×${n}</span><span>${v.drink ? `THI +${v.thirst}` : `HUN +${v.hunger}`}</span></span>
    </button>`
  }).join('')

  const aid = aid0 + meatRows + snackRows || '<div class="em">No aid supplies carried.</div>'

  // Apparel list
  const on = wornTokens(s.look), bag = (s.clothes ? s.clothes.split(',').filter(Boolean) : [])
  let allClothTokens = [...on, ...[...new Set(bag)]]
  if (sortMode === 'dam') allClothTokens.sort((a, b) => (parseCloth(b)?.row.dr ?? 0) - (parseCloth(a)?.row.dr ?? 0))
  else if (sortMode === 'wg') allClothTokens.sort((a, b) => (parseCloth(b)?.row.kg ?? 0) - (parseCloth(a)?.row.kg ?? 0))
  else if (sortMode === 'cnd') allClothTokens.sort((a, b) => armorCnd(s.look, a) - armorCnd(s.look, b))

  const app = on.map((t) => {
    const p = parseCloth(t); if (!p) return ''
    const c = armorCnd(s.look, t)
    return `<button class="it on${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})" ondblclick="sendAction('inv',{k:'unwear',w:'${p.slot}'})">
      <span class="cur">&gt;</span><span class="eq-tag">EQ</span>
      <span class="nm">${p.row.name}</span>
      <span class="stat-r"><span>DR ${p.row.dr}</span>${cndMini(c)}</span>
      
    </button>`
  }).join('') + [...new Set(bag)].map((t) => {
    const p = parseCloth(t); if (!p) return ''
    const n = bag.filter((x) => x === t).length, c = armorCnd(s.look, t)
    return `<button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})" ondblclick="sendAction('inv',{k:'wear',w:'${t}'})">
      <span class="cur">&gt;</span><span class="nm">${p.row.name}${n > 1 ? ` ×${n}` : ''}</span>
      <span class="stat-r"><span>DR ${p.row.dr}</span>${cndMini(c)}</span>
      
    </button>`
  }).join('') || '<div class="em">No apparel carried.</div>'

  // Ammo list
  const ammo = ['ammo', 'shells'].filter((t) => s[t]).map((t) => `
    <button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})">
      <span class="cur">&gt;</span>
      <span class="nm">${t === 'ammo' ? 'Pistol rounds (9mm)' : 'Shotgun shells (12ga)'}</span>
      <span class="stat-r"><span>×${s[t]}</span></span>
    </button>`).join('') || '<div class="em">Out of ammunition.</div>'

  // Misc list
  const misc = `${s.compass > 0 ? `<button class="it" onclick="sendAction('inv',{k:'compass'})"><span class="cur">&gt;</span><span class="nm" style="color:#d8b56a">Old compass</span><span class="stat-r">${s.compass} reads</span></button>` : ''}
    ${s.firesalt > 0 ? `<button class="it" onclick="sendAction('inv',{k:'firesalt'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Firesalt</span><span class="stat-r">${s.firesalt} pinches</span></button>` : ''}
    ${s.bobbypins ? `<div class="it${sel === 'bobbypin' ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'bobbypin'})"><span class="cur">&gt;</span><span class="nm">Bobby pins</span><span class="stat-r">${s.bobbypins}</span></div>` : ''}
    ${s.pages ? String(s.pages).split(',').filter(Boolean).sort((x, y) => x - y).map((n) => `<button class="it" onclick="sendAction('inv',{k:'read',n:${+n}})"><span class="cur">&gt;</span><span class="nm" style="color:#e8dcc0">${+n === 24 ? 'Field doc 24' : +n >= 21 && +n <= 23 ? 'Field doc ' + (+n - 20) : +n >= 11 && +n <= 17 ? 'Alef papers ' + (+n - 10) : 'Torn page ' + +n}</span><span class="stat-r">READ</span></button>`).join('') : ''}` || '<div class="em">No miscellaneous items.</div>'

  const keyRows = (s.keyItems ?? []).includes('spamton') ? `<div class="it on" title="Can't be dropped. Weighs nothing."><span class="cur">&gt;</span><span class="nm" style="color:#ff6fd0">[[SPAMTON G. SPAMTON]]</span><span class="stat-r"><span>0 kg</span><span style="color:#ffe14d">LOOT $$ +</span></span><div style="font-size:11px;opacity:.75;padding-left:18px">A [[Big Shot]] riding in your pocket. 10% chance of a backquarter in any loot, +2% on money you find.</div></div>` : ''
  const SECS = {
    key: ['Key items', keyRows],
    weapons: ['Weapons', weapons],
    apparel: ['Apparel', app],
    aid: ['Aid', aid],
    misc: ['Misc', misc],
    ammo: ['Ammo', ammo],
    repair: ['Repair', repairSec(s)]
  }

  const tab = SECS[s.invTab] ? s.invTab : 'all'
  const list = tab === 'all'
    ? Object.values(SECS).filter(([, h]) => h && !/class="em"/.test(h)).map(([t, h]) => `<div class="sec">${t}</div>${h}`).join('') || '<div class="em">Empty pockets.</div>'
    : (SECS[tab][1] || '<div class="em">None.</div>')

  const tabs = ['all', ...Object.keys(SECS)].map((t) => `
    <button class="${t === tab ? 'on' : ''}" onclick="sendAction('inv',{k:'tab',t:'${t}'})">${t.toUpperCase()}</button>`).join('')

  let cap = 0, kg = 0; try { cap = derived(s).carry; kg = carried(s) } catch {}
  const isOver = cap > 0 && kg > cap
  const wb = cap ? `<div class="wb-wrap"><span>WEIGHT</span><div class="wb${isOver ? ' ov' : ''}"><i style="width:${Math.min(100, (kg / cap) * 100).toFixed(0)}%"></i></div><span>${kg.toFixed(1)} / ${cap} KG</span>${isOver ? '<span class="warn">[OVERLOADED]</span>' : ''}</div>` : ''

  const eq = W[eqKey] ?? W.fists
  const dropBtn = eqKey !== 'fists' ? `<button onclick="sendAction('inv',{k:'drop',w:'${eqKey}'})"><kbd>X</kbd>Drop ${eq.name}</button>` : ''
  const cashStr = `$${((s.cents ?? 0) / 100).toFixed(2)}`

  return `<div class="pbw pb"><div class="pbp inv" data-modal>
    <!-- Pip-Boy 3000 Header Bar -->
    <div class="nv-top">
      <div class="nv-top-left">
        <h2>HALOGEN&trade; · ITEMS</h2>
        <div class="nv-mode-tabs">
          <button class="nv-mode-btn" onclick="sendAction('inv',{k:'sheet'})">STATS</button>
          <button class="nv-mode-btn on">ITEMS</button>
          <button class="nv-mode-btn" onclick="sendAction('inv',{k:'tab',t:'misc'})">NOTES</button>
        </div>
      </div>
      <div class="nv-vitals">
        <span><b>HP</b>${Math.round(s.hp ?? 0)}/${maxHp(lv, s)}</span>
        <span><b>DR</b>${wornDR(s.look)}</span>
        <span class="${isOver ? 'warn' : ''}"><b>WG</b>${kg.toFixed(1)}/${cap}</span>
        <span><b>CASH</b>${cashStr}</span>
      </div>
    </div>

    <!-- Weight capacity bar -->
    ${wb}

    <!-- Category sub-tabs -->
    <div class="tabs">${tabs}</div>

    <!-- Sorting Controls -->
    <div class="sort-bar">
      <span>LIST // ${tab.toUpperCase()}</span>
      <div class="sort-btns">
        <span>SORT:</span>
        <button class="sort-btn ${sortMode === 'name' ? 'on' : ''}" onclick="sendAction('inv',{k:'sort',s:'name'})">NAME</button>
        <button class="sort-btn ${sortMode === 'dam' ? 'on' : ''}" onclick="sendAction('inv',{k:'sort',s:'dam'})">DAM/DR</button>
        <button class="sort-btn ${sortMode === 'wg' ? 'on' : ''}" onclick="sendAction('inv',{k:'sort',s:'wg'})">WG</button>
        <button class="sort-btn ${sortMode === 'cnd' ? 'on' : ''}" onclick="sendAction('inv',{k:'sort',s:'cnd'})">CND</button>
      </div>
    </div>

    <!-- Main 2-column body: List (left) + Detail (right) -->
    <div class="bd">
      <div class="ls">${list}</div>
      ${pane(s, sel, eqKey)}
    </div>

    <!-- Footer action bar -->
    <div class="ft">
      <span class="c">${s.kills ?? 0} confirmed kills · Level ${lv}</span>
      <button onclick="sendAction('inv',{k:'close'})"><kbd>I</kbd>Close</button>
    </div>
  </div></div>`
}

function storeRows(s) { // your fridge: what you carry, one press puts one in
  const AWK = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }, out = []
  for (const [c, k] of Object.entries(AWK)) if ((s[k] ?? 0) > 0) out.push([`almond:${c}`, `${AW[c]?.name ?? 'Almond Water'}`, s[k]])
  for (const [k, n] of Object.entries(s.snacks ?? {})) if (n > 0 && SNACKS[k]) out.push([`snack:${k}`, SNACKS[k].name, n])
  for (const [k, n] of Object.entries(s.meat ?? {})) if (n > 0 && MEAT[k]) out.push([`meat:${k}`, MEAT[k].name, n])
  const rows = out.map(([t, nm, n]) => `<button class="it" onclick="sendAction('loot',{k:'store',t:'${t}'})"><span class="cur">&lt;</span><span class="nm">${nm}</span><span class="stat-r"><span>x${n} · PUT IN</span></span></button>`).join('')
  return `<div class="em" style="margin-top:10px;opacity:.8">YOUR BAG</div>${rows || '<div class="em">Nothing to put in.</div>'}`
}
function container(s, key) {
  const items = itemsOf(s.lootList)
  const rows = items.map((t, i) => {
    const d = describe(t)
    let c = 100
    if (t.startsWith('weapon:')) c = cndOf(s, t.slice(7))
    else if (t.startsWith('cloth:')) c = armorCnd(s.look, t)
    return `<button class="it" onclick="sendAction('loot',{k:'take',i:${i}})">
      <span class="cur">&gt;</span>
      <span class="nm" style="color:${t.startsWith('weapon:') ? d.color : 'inherit'}">${d.name}</span>
      <span class="stat-r">${t.startsWith('weapon:') || t.startsWith('cloth:') ? cndMini(c) : ''}<span>${t === 'ammo' ? `+${W.ammo.perPickup}` : t === 'shells' ? `+${W.shells.perPickup}` : ''}</span></span>
      ${detail(t, s, false)}
    </button>`
  }).join('')

  const n = owned(s).length - 1
  const carry = `Carrying ${n} weapon${n === 1 ? '' : 's'} · almond ${s.almonds ?? 0} · rounds ${s.ammo ?? 0} · shells ${s.shells ?? 0}`

  return `<div class="pbw pb"><div class="pbp" data-modal>
    <div class="nv-top">
      <div class="nv-top-left">
        <h2>${(s.lootName || 'CONTAINER').toUpperCase()}</h2>
      </div>
      <div class="nv-vitals">
        <span><b>ITEMS</b>${items.length}</span>
        <span><b>CARRIED</b>${carry}</span>
      </div>
    </div>
    <div class="bd" style="margin-top:8px">
      <div class="ls">${rows || '<div class="em">Container is empty.</div>'}${s.lootStore ? storeRows(s) : ''}</div>
      ${items[0] ? detail(items[0], s, true) : '<div class="dt def"><div class="em">Nothing inside.</div></div>'}
    </div>
    <div class="ft">
      <span class="c">${carry}</span>
      ${items.length ? `<button onclick="sendAction('loot',{k:'all'})"><kbd>R</kbd>Take all</button>` : ''}
      <button onclick="sendAction('loot',{k:'close'})"><kbd>${key}</kbd>Close</button>
    </div>
  </div></div>`
}

export function lootUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const key = ctx.world.inputs?.actions?.interact?.label ?? 'E'
  let out = CSS
  if (s.lootOpen) out += container(s, key)
  else if (s.invOpen) out += inventory(s)
  else if (s.focus) {
    const f = s.focus
    out += `<div id="lp" class="pb"><div class="nm"><span class="key">${key}</span><span>${f.verb}</span><span style="color:${f.color || 'inherit'}">${f.name}</span></div><div class="in">${f.info || ''}</div></div>`
  }
  if (false && s.notice && ctx.now() - s.notice.at < 2200) out += `<div id="ln" class="pb"><span>${s.notice.text}</span></div>`
  return out
}
