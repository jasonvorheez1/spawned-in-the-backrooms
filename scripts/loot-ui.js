import { wristNav } from './lib/wrist-nav.js'
import {screen} from './lib/screen.js'
// Looting and inventory layouts; the shared field theme supplies their current visual treatment.
import AW from './lib/data/almond.yml'
import FURN from './lib/data/furniture.yml'
import { quickItems } from './lib/quick-items.js'
import SNACKS from './lib/data/snacks.yml'
import { describe, itemsOf, MEAT } from './lib/items.js'
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import THROW from './lib/data/throwables.yml'
import { derived, carried, handling, reqText, permanentSkillsOf, tokenWeight } from './lib/stats.js'
import { getBookSpec, getMagSpec, isBookToken, isMagToken, canReadBook, formatModsList, formatModPair } from './lib/modifiers.js'
import { parseCloth, wornTokens, wornDR, fullLook, SLOTS, SLOT_NAME, rowOf, rowData, CLOTHES } from './lib/clothes.js'
import { cndOf, armorCnd, band, bandColor, wMul, drMul, repairAmount, isBroken } from './lib/condition.js'
import { penOf } from './lib/combat.js'

const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
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
#lp{position:fixed;left:50%;top:57%;transform:translateX(-50%);width:max-content;max-width:min(440px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));pointer-events:none;z-index:40;font-family:var(--ui-font,'Segoe UI',Arial,sans-serif);text-transform:none;letter-spacing:0;color:#eceee3;text-shadow:none}
#lp .interact-card{display:flex;align-items:center;gap:14px;min-width:220px;padding:12px 18px 12px 12px;background:linear-gradient(90deg,#131910f2,#131910d9 75%,#13191080);border-left:2px solid var(--hint,#c9b77c);border-top:1px solid #bac5a320;box-shadow:0 8px 24px #0003}
#lp .interact-key{flex:none;width:auto;min-width:40px;max-width:96px;min-height:40px;padding:0 10px;overflow-wrap:anywhere;display:grid;place-items:center;border:1px solid #b6bea1;border-bottom-width:3px;border-radius:3px;background:#2b3324;color:#f2f1da;font:600 16px/1 var(--ui-font,'Segoe UI',Arial,sans-serif);box-shadow:inset 0 1px #e4eaca16;pointer-events:auto;cursor:pointer;transition:background-color .13s,transform .13s,border-color .13s}
#lp .interact-key:hover{background:#454e32;border-color:#d6c88d}#lp .interact-key:active{transform:translateY(2px);border-bottom-width:1px;background:#c9b77c;color:#20251a}#lp .interact-key:focus-visible{outline:2px solid #d6c88d;outline-offset:4px}
#lp .interact-copy{min-width:0;max-width:340px}#lp .interact-verb{display:block;font-size:10px;line-height:1.4;letter-spacing:.13em;text-transform:uppercase;color:#c9b77c;font-weight:600;margin-bottom:3px}#lp .interact-name{display:block;font-size:19px;line-height:1.2;font-weight:500;overflow-wrap:anywhere;letter-spacing:-.015em;color:#eceee3}#lp .interact-info{font-size:12px;line-height:1.45;color:#b2bca5;margin-top:5px;overflow-wrap:anywhere}#lp .is-blocked{--hint:#cf9684}#lp .is-blocked .interact-verb{color:#dfa391}#lp .is-blocked .interact-key{color:#bdb6a9;border-color:#796a5f;background:#302b23}
@keyframes interact-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:no-preference){#lp .interact-card{animation:interact-in .16s ease-out backwards}}
@media(prefers-reduced-motion:reduce){#lp .interact-card,#lp .interact-key{animation:none;transition:none}}
@media(max-width:640px){#lp{left:12px;top:58%;transform:none;width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px);max-width:none}#lp .interact-card{min-width:0;gap:12px;padding:11px 12px}#lp .interact-key{width:auto;min-width:44px;min-height:44px}#lp .interact-name{font-size:17px}#lp .interact-info{font-size:11px}}
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
@keyframes nvEcg { 0%,100% { opacity: .45 } 50% { opacity: 1 } }
.nv-ecg { animation: nvEcg 2s ease-in-out infinite }

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
/* HALOGEN items screen (Shelly #141205: different, friendlier, animated) */
.pbp.hg { width:min(1020px, calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset, 50px) + 16px))); max-height:min(700px, 92vh); padding:0; border-width:0; border-radius:10px; background:linear-gradient(180deg, rgba(26,17,5,.98), rgba(9,6,2,.99)); box-shadow:0 0 0 2px var(--a), 0 0 0 6px rgba(20,13,4,.95), 0 0 0 7px var(--ad), 0 18px 60px rgba(0,0,0,.8), 0 0 50px rgba(255,170,40,.18); animation:hgBoot .45s cubic-bezier(.2,.9,.3,1.2) both }
@keyframes hgBoot { 0% { transform:translateY(24px) scale(.94); opacity:0; filter:brightness(2.6) blur(2px) } 60% { opacity:1; filter:brightness(1.4) } 100% { transform:none; filter:none } }
.hg-top { display:flex; align-items:center; gap:18px; padding:12px 18px 10px; background:linear-gradient(90deg, rgba(255,182,66,.14), rgba(255,182,66,.02) 60%); border-bottom:2px solid var(--a) }
.hg-brand { display:flex; align-items:center; gap:8px }
.hg-brand h2 { margin:0; font-size:24px; font-weight:400; letter-spacing:.14em; text-shadow:0 0 10px rgba(255,170,40,.9) }
.hg-brand sup { font-size:10px }
.hg-led { width:9px; height:9px; border-radius:50%; background:var(--ab); box-shadow:0 0 8px var(--a); animation:hgLed 1.6s ease-in-out infinite }
@keyframes hgLed { 50% { opacity:.25 } }
.hg-cur { animation:nvBlink 1s steps(1) infinite; font-size:20px }
.hg-modes { display:flex; gap:4px }
.hg-modes button { font:inherit; font-size:12px; letter-spacing:.1em; padding:5px 12px; color:var(--ad); background:rgba(0,0,0,.3); border:1px solid var(--al); border-radius:3px; cursor:pointer; transition:all .15s }
.hg-modes button:hover { color:var(--a); border-color:var(--a); transform:translateY(-1px) }
.hg-modes button.on { color:#140c02; background:var(--a); border-color:var(--ab); box-shadow:0 0 12px rgba(255,170,40,.55) }
.hg-modes kbd { font-family:inherit; font-size:9px; border:1px solid currentColor; padding:0 3px; margin-right:5px; opacity:.7 }
.hg-vit { margin-left:auto; display:flex; gap:10px; align-items:stretch }
.hg-gauge, .hg-chip { display:flex; flex-direction:column; justify-content:center; padding:3px 10px; border:1px solid var(--al); background:rgba(0,0,0,.35); border-radius:3px; min-width:70px }
.hg-gauge { min-width:110px }
.hg-gauge span, .hg-chip span { font-size:9px; letter-spacing:.18em; color:var(--ad) }
.hg-gauge b, .hg-chip b { font-weight:400; font-size:15px; color:var(--ab) }
.hg-gauge b i { font-style:normal; font-size:10px; color:var(--ad); margin-left:2px }
.hg-gauge .bar { height:3px; background:var(--al); margin-top:2px; overflow:hidden }
.hg-gauge .bar em { display:block; height:100%; background:var(--a); box-shadow:0 0 6px var(--a); transition:width .4s ease }
.hg-gauge.warn b, .hg-gauge.warn .bar em { color:#ff5544; background:#ff5544; animation:nvBlink .8s infinite }
.hg-chip.cash b { color:#9ee08a; text-shadow:0 0 6px rgba(140,230,120,.5) }

.hg-qrow { display:flex; gap:5px; align-items:stretch; padding:8px 18px; border-bottom:1px solid var(--al); background:rgba(0,0,0,.25) }
.hg-qt { font-size:9px; letter-spacing:.16em; color:var(--ad); line-height:1.25; align-self:center; margin-right:4px }
.hg-q { position:relative; flex:1; min-width:0; height:52px; display:flex; flex-direction:column; justify-content:flex-end; padding:4px 6px; border:1px dashed var(--al); border-radius:3px; cursor:pointer; overflow:hidden; transition:border-color .15s, background .15s, transform .15s; pointer-events:auto }
.hg-q.arm { border-color:var(--a) }
.hg-q.arm::before { content:''; position:absolute; inset:0; background:rgba(255,182,66,.13); opacity:0; animation:hgq-pulse 1.4s ease-in-out infinite; pointer-events:none }
@keyframes hgq-pulse { 50% { opacity:1 } }
.hg-q.mine { border-style:solid; border-width:2px; border-color:var(--ab); background:rgba(255,182,66,.2); animation:none }
.hg-q .x { position:absolute; bottom:3px; right:3px; width:16px; height:16px; line-height:14px; font-size:10px; border:1px solid var(--ad); border-radius:2px; color:var(--ad); background:rgba(0,0,0,.4); opacity:0; transition:opacity .15s; cursor:pointer }
.hg-q:hover .x { opacity:1 }
.hg-q .x:hover { color:var(--ab); border-color:var(--ab) }
.hg-qs { display:flex; gap:5px; flex:1; min-width:0 }
.hg-qt small { display:block; margin-top:3px; font-size:10px; letter-spacing:0; color:var(--ad); text-transform:none; white-space:nowrap }
.hg-qt small b { color:var(--ab); font-weight:normal }
.hg-q:hover { border-color:var(--a); background:rgba(255,182,66,.08); transform:translateY(-2px) }
.hg-q.set { border-style:solid; border-color:var(--ad); background:rgba(255,182,66,.07) }
.hg-q.out { opacity:.45 }
.hg-q .k { position:absolute; top:2px; left:4px; font-size:10px; color:var(--ab) }
.hg-q .v { font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--a) }
.hg-q .c { position:absolute; top:2px; right:4px; font-size:9px; color:var(--ad) }

.hg-bd { display:flex; gap:0; flex:1; min-height:0 }
.hg-rail { flex:0 0 132px; display:flex; flex-direction:column; gap:2px; padding:10px 8px; border-right:1px solid var(--al); background:rgba(0,0,0,.2); overflow-y:auto }
.hg-rb { position:relative; display:flex; align-items:center; gap:8px; font:inherit; font-size:12px; letter-spacing:.08em; padding:7px 8px; color:var(--ad); background:none; border:1px solid transparent; border-radius:3px; cursor:pointer; text-align:left; animation:hgRail .35s calc(var(--i) * 35ms) both; transition:color .15s, background .15s, padding .15s }
@keyframes hgRail { from { opacity:0; transform:translateX(-14px) } }
.hg-rb .g { width:16px; text-align:center; font-size:14px }
.hg-rb .n { margin-left:auto; font-size:10px; padding:0 5px; border-radius:8px; background:var(--al); color:var(--a) }
.hg-rb:hover { color:var(--a); background:rgba(255,182,66,.07); padding-left:12px }
.hg-rb.on { color:#140c02; background:var(--a); border-color:var(--ab); box-shadow:0 0 10px rgba(255,170,40,.45) }
.hg-rb.on .n { background:#140c02; color:var(--a) }
.hg-mid { flex:1 1 0; min-width:0; display:flex; flex-direction:column; padding:8px 12px 6px }
.hg-sort { display:flex; align-items:center; gap:4px; font-size:10px; letter-spacing:.14em; color:var(--ad); padding-bottom:5px; border-bottom:1px solid var(--al); margin-bottom:6px }
.hg-sort .sp { flex:1 }
.hg-sort button { font:inherit; font-size:10px; letter-spacing:.08em; padding:2px 7px; color:var(--ad); background:none; border:1px solid transparent; border-radius:10px; cursor:pointer }
.hg-sort button:hover { color:var(--a); border-color:var(--al) }
.hg-sort button.on { color:var(--a); border-color:var(--a) }
.pbp.hg .ls { flex:1; padding-right:6px }
.pbp.hg .it { border-radius:3px; margin-bottom:2px; animation:hgRow .3s ease-out both; padding:6px 8px }
@keyframes hgRow { from { opacity:0; transform:translateX(10px) } }
.pbp.hg .it:hover { transform:translateX(3px) }
.pbp.hg .it.sel { background:linear-gradient(90deg, rgba(255,182,66,.26), rgba(255,182,66,.06)); box-shadow:inset 3px 0 0 var(--ab) }
.pbp.hg .it.sel .cur { animation:nvBlink 1s steps(1) infinite; color:var(--ab) }
.pbp.hg .sec { font-size:10px; margin:10px 0 4px; display:flex; align-items:center; gap:8px }
.pbp.hg .sec::after { content:''; flex:1; height:1px; background:linear-gradient(90deg, var(--ad), transparent) }
.hg-card { flex:0 0 330px; display:flex; min-height:0; border-left:1px solid var(--al); padding:10px 14px; background:radial-gradient(ellipse at 50% 0%, rgba(255,182,66,.08), transparent 70%); animation:hgCard .3s ease-out both; overflow-y:auto }
@keyframes hgCard { from { opacity:0; transform:translateY(8px) } }
.hg-card .dt { border-left:none; padding-left:0; flex:1 }
.hg-card .art-box { height:84px; border-radius:4px; border-color:var(--ad); box-shadow:inset 0 0 20px rgba(255,170,40,.08) }
.hg-card .art-box svg { transform:scale(1.35) }
.hg-card .acts .act { flex:1; border-radius:3px; font-size:13px; padding:8px 12px }
.hg-ft { display:flex; align-items:center; gap:12px; padding:8px 18px; border-top:2px solid var(--a); font-size:11px; background:rgba(0,0,0,.3) }
.hg-ft .hint { color:var(--ad); letter-spacing:.06em }
.hg-ft kbd { font-family:inherit; font-size:9px; border:1px solid var(--ad); padding:0 4px; margin-right:5px; border-radius:2px }
.hg-ft .c { margin-left:auto; color:var(--ad) }
.hg-ft button { font:inherit; font-size:12px; letter-spacing:.1em; color:var(--a); background:none; border:1px solid var(--a); padding:4px 12px; border-radius:3px; cursor:pointer }
.hg-ft button:hover { background:var(--a); color:#140c02 }
@media (max-width: 760px) { .hg-card { display:none } .hg-rail { flex-basis:46px } .hg-rb .l, .hg-rb .n { display:none } .hg-vit .hg-chip, .hg-ft .hint { display:none } .hg-qrow { overflow-x:auto } .hg-q { flex:0 0 64px } }
</style>`

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',').filter(Boolean) : [])]
const worn = (s, slot) => { const l = fullLook(s.look), c = CLOTHES.colourKey[slot]; return rowData(slot, l[slot], c ? l[c] : '') }
const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? derived(s).hpBonus : 0)
const cell = (k, v, wide, cls = '') => `<div class="${wide ? 'w' : ''} ${cls}"><span>${k}</span>${v}</div>`

// Condition stays readable at a glance, without a second row of bracket glyphs.
function cndMeter(c) {
  const value=Math.round(c),col=c<40?bandColor(c):'var(--ui-muted,#a8b29b)'
  return `<span class="condition-meter"><i><b style="width:${value}%;background:${col}"></b></i><span>${value}% · ${band(c).toLowerCase()}</span></span>`
}
function cndMini(c) { return `<span class="cnd-mini" style="color:${c<40?bandColor(c):'inherit'}">${Math.round(c)}%</span>` }

// Estimated value in Backdollars/caps
function itemVal(t) {
  if (t.startsWith('weapon:') || W[t]?.damage != null) {
    const k = t.startsWith('weapon:') ? t.slice(7) : t, w = W[k]
    return w ? Math.max(4, Math.round((w.damage * 0.75 + (w.xp ?? 20) * 0.5) * (w.ranged ? 1.4 : 1))) : 10
  }
  if (t.startsWith('cloth:')) {
    const p = parseCloth(t)
    const modCount = Object.keys(p?.row?.mods ?? {}).length
    return p ? Math.max(3, Math.round(p.row.dr * 5 + 4 + modCount * 4)) : 6
  }
  if (isBookToken(t)) return getBookSpec(t)?.value ?? 85
  if (isMagToken(t)) return getMagSpec(t)?.value ?? 28
  if (t.startsWith('snack:')) {
    const c = t.slice(6), v = SNACKS[c]
    return v?.value ?? (v?.stopBleed || v?.clearDebuffs ? 16 : 6)
  }
  if (t.startsWith('almond')) return 6
  if (t === 'ammo') return 4
  if (t === 'shells') return 5
  if (t === 'bobbypin') return 2
  return 3
}

function snackCategory(v) {
  if (!v) return 'AID'
  if (v.stopBleed || v.clearDebuffs || (v.hp > 0 && !v.hunger && !v.drink) || (v.mods && !v.drink && !v.hunger)) return 'MEDICINE'
  if (v.drink) return 'DRINK'
  if (!v.hunger && !v.thirst && v.keep) return 'KEEPSAKE'
  if (!v.hunger && !v.thirst) return 'AID'
  return 'FOOD'
}

function snackEffectTags(v) {
  const tags = []
  if (v.hp) tags.push(`${v.hp > 0 ? '+' : ''}${v.hp} HP`)
  if (v.sanity) tags.push(`${v.sanity > 0 ? '+' : ''}${v.sanity} SAN`)
  if (v.hunger) tags.push(`${v.hunger > 0 ? '+' : ''}${v.hunger} HUNGER`)
  if (v.thirst) tags.push(`${v.thirst > 0 ? '+' : ''}${v.thirst} THIRST`)
  if (v.stopBleed) tags.push('STOPS BLEED')
  if (v.clearDebuffs) tags.push('CLEARS TOXINS')
  if (v.warm) tags.push(`WARM +${v.warm}`)
  if (v.mods) tags.push(...formatModsList(v.mods))
  return tags
}

function clothCompareHtml(p, cur) {
  const nextMods = p.row.mods ?? {}, curMods = cur?.mods ?? {}
  const keys = new Set([...Object.keys(nextMods), ...Object.keys(curMods)])
  if (!keys.size) return cur ? (p.row.dr === cur.dr ? 'SAME DR' : p.row.dr > cur.dr ? '<i class="up" style="font-style:normal">HIGHER DR</i>' : '<i class="dn" style="font-style:normal">LOWER DR</i>') : 'NO ITEM WORN'
  const parts = []
  for (const k of keys) {
    const a = Number(nextMods[k] ?? 0), b = Number(curMods[k] ?? 0), d = a - b
    if (d === 0) continue
    const txt = formatModPair(k, d)
    if (txt) parts.push(`<i class="${d > 0 ? 'up' : 'dn'}" style="font-style:normal">${d > 0 ? '▲ ' : '▼ '}${esc(txt)}</i>`)
  }
  return parts.length ? parts.join(' · ') : 'EVEN STATS'
}

// Animated Vector Artwork SVGs
function handlingRows(item, hd) {
  const req = cell('FULL HANDLING', reqText(item) || 'NONE', true)
  return hd.notes.length ? req + cell('BELOW TARGET', hd.notes.map(esc).join('<br>'), true, 'req-fail') : req
}
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
    const curDps = Math.round(cur.damage / (cur.cooldown || 1)), dpsDiff = dps - curDps
    const wgDiff = (w.kg ?? 1) - (cur.kg ?? 1)
    const cmpBox = k !== (s.equipped ?? 'fists')
      ? `<div class="inv-cmp"><div class="inv-cmp-title">VS EQUIPPED (${esc(cur.name)})</div><div>DAM ${d >= 0 ? '+' : ''}${d} · DPS ${dpsDiff >= 0 ? '+' : ''}${dpsDiff} · WG ${wgDiff >= 0 ? '+' : ''}${wgDiff.toFixed(1)} kg</div></div>`
      : ''
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

      <div class="g">
        ${cell('DAM', `${w.damage}${cmp}`)}
        ${cell('DPS', `${dps}`)}
        ${cell('CND', cndMeter(c), true)}
        ${handlingRows(w, handling(s, w))}
        ${cell('SPD', `${(1 / w.cooldown).toFixed(1)}/S`)}
        ${cell('AP', `${w.stamina}`)}
        ${cell('PEN', `${Math.round(penOf(w, k) * 100)}% ARMOR`)}
        ${cell('WG', `${w.kg ?? 1.0} KG`)}
        ${cell('VAL', `$${val}.00`)}
        ${w.ranged ? cell('MAG', `${s['loaded_' + k] ?? 0}/${w.magSize}`) + cell(w.ammoType === 'shells' ? 'SHELLS' : w.ammoType === 'cells' ? 'CELLS' : 'ROUNDS', s[w.ammoType ?? 'ammo'] ?? 0) : ''}
        ${w.pellets ? cell('PELLETS', `${w.pellets} BUCKSHOT`, true) : ''}
      </div>
      ${passivesOf(w).length ? `<div class="rep-box"><div class="rep-box-title"><span>PASSIVES</span></div>${passivesOf(w).map(([n, d]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>${n}</span><b style="font-weight:normal;opacity:.8">${d}</b></div>`).join('')}</div>` : ''}
      ${cmpBox}
      ${repHtml}
    </div>`
  }

  const thrown = THROW[t]
  if (thrown?.key) {
    const hd = handling(s, thrown)
    const effect = thrown.burn ? cell('FIRE', thrown.burn + ' S') :
      thrown.fuse ? cell('FUSE', thrown.fuse / 1000 + ' S FROM THE PIN') :
      thrown.daze ? cell('DAZE', thrown.daze + ' S') : cell('LASTS', 'UNTIL TAKEN')
    return `<div class="${cls}"><div class="dt-header"><h4>${thrown.name}</h4><span class="dt-rarity">THROWABLE</span></div>
      <div class="g">${cell('RADIUS', thrown.radius + ' M')}${effect}
      ${thrown.damage ? cell('DAMAGE', thrown.damage + (thrown.tick ? ' EVERY ' + thrown.tick + ' S' : ' AT CENTRE')) : ''}
      ${cell('CARRIED', s[thrown.key] ?? 0)}${handlingRows(thrown, hd)}
      ${thrown.req ? cell('THROW POWER', Math.round(hd.throwPower * 100) + '%') + cell('RECOVERY', (THROW.cooldown * hd.swing).toFixed(2) + ' S') : ''}
      ${cell('HOW', thrown.fuse ? 'HOLD G TO COOK, LET GO' : 'HOLD G, LET GO', true)}</div></div>`
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

    const modText = formatModsList(p.row.mods).join(' · ')
    return `<div class="${cls}">
      <div class="dt-header">
        <h4>${p.row.name}</h4>
        <span class="dt-rarity" style="color:${r.color ?? 'var(--ad)'}">${(r.label ?? 'COMMON').toUpperCase()}</span>
      </div>

      <div class="g">
        ${cell('DR', `${p.row.dr}${cmp}`)}
        ${cell('SLOT', SLOT_NAME[p.slot].toUpperCase())}
        ${cell('CND', cndMeter(c), true)}
        ${cell('WG', `${p.row.kg} KG`)}
        ${cell('VAL', `$${val}.00`)}
        ${cell('COLOR', `<span style="display:inline-block;width:12px;height:12px;background:#${p.colour};border:1px solid var(--ad);vertical-align:middle"></span>`)}
        ${cell('PASSIVES', modText ? esc(modText) : 'STANDARD', true)}
        ${cell('WORN', cur ? `${cur.name} · DR ${cur.dr}` : 'NONE', true)}
        ${cell('VS WORN', clothCompareHtml(p, cur), true)}
      </div>
      ${repHtml}
    </div>`
  }

  if (isBookToken(t)) {
    const spec = getBookSpec(t)
    if (!spec) return ''
    const permVal = permanentSkillsOf(s)[spec.skill] ?? 0
    const chk = canReadBook(s, t, permVal)
    const statusLabel = chk.ok ? 'UNREAD · READY' : chk.reason === 'already_read' ? 'ALREADY READ' : chk.reason === 'edition_limit' ? 'EDITION LIMIT REACHED' : 'SKILL AT MAX (100)'
    return `<div class="${cls}">
      <div class="dt-header"><h4>${esc(spec.title)}</h4><span class="dt-rarity" style="color:#ffcf6a">SKILL BOOK · ${esc(spec.rarity.toUpperCase())}</span></div>
      ${spec.desc ? `<div style="opacity:.82;font-size:12px;margin:4px 0 8px">${esc(spec.desc)}</div>` : ''}
      <div class="g">
        ${cell('SKILL', esc(spec.skillName.toUpperCase()))}
        ${cell('BONUS', `<b style="color:#8fd67c">+${spec.bonus} PERMANENT</b>`)}
        ${cell('CURRENT BASE', `${permVal} / 100`)}
        ${cell('STATUS', statusLabel)}
        ${cell('WG', `${spec.kg.toFixed(1)} KG`)}
        ${cell('VAL', `$${spec.value}.00`)}
        ${cell('CARRIED', `${s.books?.[t] ?? 0}`, true)}
      </div>
    </div>`
  }

  if (isMagToken(t)) {
    const spec = getMagSpec(t)
    if (!spec) return ''
    return `<div class="${cls}">
      <div class="dt-header"><h4>${esc(spec.title)}</h4><span class="dt-rarity" style="color:${spec.color}">MAGAZINE</span></div>
      ${spec.desc ? `<div style="opacity:.82;font-size:12px;margin:4px 0 8px">${esc(spec.desc)}</div>` : ''}
      <div class="g">
        ${cell('SKILL', esc(spec.skillName.toUpperCase()))}
        ${cell('BONUS', `<b style="color:#8fd67c">+${spec.bonus} TEMP</b>`)}
        ${cell('DURATION', `${spec.durationMin} IN-GAME MIN`)}
        ${cell('WG', `${spec.kg.toFixed(1)} KG`)}
        ${cell('VAL', `$${spec.value}.00`)}
        ${cell('CARRIED', `${s.mags?.[t] ?? 0}`)}
      </div>
    </div>`
  }

  if (t.startsWith('snack:') && SNACKS[t.slice(6)]) {
    const c = t.slice(6), v = SNACKS[c], cat = snackCategory(v)
    const tags = snackEffectTags(v), dur = v.durationGameMin ? `${v.durationGameMin} IN-GAME MIN` : ''
    return `<div class="${cls}">
      <div class="dt-header"><h4>${esc(v.name)}</h4><span class="dt-rarity" style="color:${cat === 'MEDICINE' ? '#8fd67c' : cat === 'DRINK' ? '#7fc4e8' : '#d5b77b'}">${cat}</span></div>
      ${v.info ? `<div style="opacity:.82;font-size:12px;margin:4px 0 8px">${esc(v.info)}</div>` : ''}
      <div class="g">
        ${v.hp ? cell('HP', `<b style="color:#8fd67c">+${v.hp}</b>`) : ''}
        ${v.sanity ? cell('SANITY', `<b style="color:#8fd67c">+${v.sanity}</b>`) : ''}
        ${v.hunger ? cell('HUNGER', `+${v.hunger}`) : ''}
        ${v.thirst ? cell('THIRST', `+${v.thirst}`) : ''}
        ${v.stopBleed ? cell('BLEEDING', '<b style="color:#8fd67c">STOPS BLEED</b>') : ''}
        ${v.clearDebuffs ? cell('TOXINS', '<b style="color:#8fd67c">CLEARS DEBUFFS</b>') : ''}
        ${dur ? cell('DURATION', dur) : ''}
        ${cell('WG', `${tokenWeight(t).toFixed(1)} KG`)}
        ${cell('VAL', `$${itemVal(t)}.00`)}
        ${cell('CARRIED', `${s.snacks?.[c] ?? 0}`)}
        ${tags.length ? cell('EFFECTS', esc(tags.join(' · ')), true) : ''}
      </div>
    </div>`
  }

  if (t.startsWith('almond:')) {
    const c = t.slice(7), a = AW[c], key = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }[c]
    return `<div class="${cls}">
      <div class="dt-header"><h4>${a.name}</h4><span class="dt-rarity" style="color:${a.color}">AID</span></div>

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

      <div class="g">
        ${cell('HP', `+${L.almondHp}`)}${cell('SANITY', `+${L.almondSanity}`)}
        ${cell('WG', '0.5 KG')}${cell('VAL', '$5.00')}
        ${cell('CARRIED', `${s.almonds ?? 0} BOTTLES`, true)}
      </div>
    </div>`
  }
  if (t === 'ammo' || t === 'shells' || t === 'cells') {
    const a = W[t], nm = AMMO_NAMES[t]
    return `<div class="${cls}">
      <div class="dt-header"><h4>${nm}</h4><span class="dt-rarity">AMMO</span></div>

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
const AMMO_NAMES = { ammo: 'Pistol rounds (9mm)', shells: 'Shotgun shells (12ga)', cells: 'Energy cells' }

function pane(s, sel, eqKey) {
  const own = owned(s), bag = s.clothes ? s.clothes.split(',').filter(Boolean) : [], on = wornTokens(s.look)
  const btn = (lab, d, key) => `<button class="act${d.k === 'drop' || d.k === 'dropItem' ? ' drop' : ''}" onclick="sendAction('inv',${JSON.stringify(d).replace(/"/g, "'")})">${key ? `<kbd>${key}</kbd>` : ''}${lab}</button>`
  let card = '', acts = []
  if (W[sel]?.damage != null && own.includes(sel)) {
    card = detail(sel, s, true)
    if (sel !== eqKey) acts.push(btn('EQUIP', { k: 'equip', w: sel }))
    if (sel.split('~')[0] === 'squirt_gun') { // the tank's verbs ride the gun's own card (Shelly: "i still cant fill my tank")
      acts.push(btn('FILL · WATER', { k: 'sqFill', c: 'water' }))
      if ((s.almonds ?? 0) > 0) acts.push(btn('FILL · ALMOND', { k: 'sqFill', c: 'almond' }))
      if ((s.firesalt ?? 0) > 0) acts.push(btn('FILL · PYROIL', { k: 'sqFill', c: 'pyroil' }))
      if ((s.repellent ?? 0) > 0) acts.push(btn('FILL · REPELLENT', { k: 'sqFill', c: 'repellent' }))
      if ((s.cashew ?? 0) > 0) acts.push(btn('FILL · CASHEW', { k: 'sqFill', c: 'cashew' }))
      if (s.sqLiq === 'almond') acts.push(btn('SIP', { k: 'sqDrink' }))
      acts.push(btn('DRAIN', { k: 'sqEmpty' }))
    }
    if (sel !== 'fists') acts.push(btn('DROP ONE', { k: 'drop', w: sel }))
  } else if (sel.startsWith('cloth:') && (bag.includes(sel) || on.includes(sel))) {
    card = detail(sel, s, true); const p = parseCloth(sel)
    acts.push(on.includes(sel) ? btn('TAKE OFF', { k: 'unwear', w: p?.slot }) : btn('WEAR', { k: 'wear', w: sel })); if (bag.includes(sel)) acts.push(btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (sel.startsWith('almond:')) {
    const c = sel.slice(7), key = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }[c]
    if (s[key] > 0) { card = detail(sel, s, true); acts.push(btn('DRINK', { k: 'drink', c }), btn('DROP ONE', { k: 'dropItem', t: sel })) }
  } else if (sel.startsWith('meat:') && (s.meat?.[sel.slice(5)] ?? 0) > 0 && MEAT[sel.slice(5)]) {
    const m = MEAT[sel.slice(5)]
    card = `<div class="dt def"><div class="dt-header"><h4 style="color:${m.color}">${m.name}</h4><span class="dt-rarity">AID</span></div><div class="g">${cell('HP', '+' + m.hp)}${cell('HUNGER', '+' + (m.food ?? 0))}${cell('CARRIED', s.meat[sel.slice(5)], true)}</div></div>`
    acts.push(btn('EAT', { k: 'eat', c: sel.slice(5) }), btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (sel.startsWith('snack:') && (s.snacks?.[sel.slice(6)] ?? 0) > 0 && SNACKS[sel.slice(6)]) {
    const v = SNACKS[sel.slice(6)]
    const trinket = !v.drink && !v.hunger && !v.thirst
    card = detail(sel, s, true)
    acts.push(btn(v.verb ?? (v.drink ? 'DRINK' : trinket ? 'USE' : 'EAT'), { k: 'snack', c: sel.slice(6) }), btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (isBookToken(sel) && (s.books?.[sel] ?? 0) > 0) {
    const spec = getBookSpec(sel)
    const chk = spec ? canReadBook(s, sel, permanentSkillsOf(s)[spec.skill] ?? 0) : { ok: false, reason: 'invalid' }
    card = detail(sel, s, true)
    if (chk.ok) acts.push(btn(`READ (+${spec.bonus} ${spec.skillName.toUpperCase()})`, { k: 'readBook', t: sel }))
    else acts.push(`<button class="act" disabled>${chk.reason === 'maxed' ? 'SKILL MAXED (100)' : 'ALREADY READ'}</button>`)
    acts.push(btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if (isMagToken(sel) && (s.mags?.[sel] ?? 0) > 0) {
    const spec = getMagSpec(sel)
    card = detail(sel, s, true)
    acts.push(btn(`READ (+${spec?.bonus ?? 10} · ${spec?.durationMin ?? 120}M)`, { k: 'readMag', t: sel }), btn('DROP ONE', { k: 'dropItem', t: sel }))
  } else if ((sel === 'ammo' || sel === 'shells' || sel === 'cells') && s[sel] > 0) { card = detail(sel, s, true); acts.push(btn('DROP A BOX', { k: 'dropItem', t: sel })) }
  else if (THROW[sel]?.key && s[THROW[sel].key] > 0) {
    card = detail(sel, s, true)
    acts.push(btn('READY FOR G', { k: 'nadePick', t: sel }))
    if (sel !== 'fresh') acts.push(btn('DROP ONE', { k: 'dropItem', t: sel }))
  }
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
  const filterQ = String(s.invFilter ?? '').trim().toLowerCase()
  const matchesFilter = (name) => !filterQ || String(name ?? '').toLowerCase().includes(filterQ)

  // Weapons list
  let weaponKeys = [...new Set([...(W.order ?? []).filter((k) => owned(s).includes(k)), ...owned(s).filter((k) => W[k] && !(W.order ?? []).includes(k))])] // variant keys (revolver~lucky13) aren't in W.order
    .filter((k) => matchesFilter(W[k]?.name))
  if (sortMode === 'dam') weaponKeys.sort((a, b) => (W[b]?.damage ?? 0) - (W[a]?.damage ?? 0))
  else if (sortMode === 'wg') weaponKeys.sort((a, b) => (W[b]?.kg ?? 1) - (W[a]?.kg ?? 1))
  else if (sortMode === 'cnd') weaponKeys.sort((a, b) => cndOf(s, a) - cndOf(s, b))
  else if (sortMode === 'val') weaponKeys.sort((a, b) => itemVal(b) - itemVal(a))
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
  const aid0 = anyAw ? AWK.filter(([, k, nm]) => s[k] && matchesFilter(nm)).map(([c, k, nm, col]) => `
    <button class="it${sel === 'almond:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'almond:${c}'})" ondblclick="sendAction('inv',{k:'drink',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${col}">${nm}</span>
      <span class="stat-r"><span>×${s[k]}</span><span style="color:#9ee08a">+${AW[c]?.hp ?? 25} HP</span></span>

    </button>`).join('') + `` : ''

  const meatRows = Object.entries(s.meat ?? {}).filter(([c, n]) => n > 0 && MEAT[c] && matchesFilter(MEAT[c].name)).map(([c, n]) => `
    <button class="it${sel === 'meat:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'meat:${c}'})" ondblclick="sendAction('inv',{k:'eat',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${MEAT[c].color}">${MEAT[c].name}</span>
      <span class="stat-r"><span>×${n}</span><span style="color:#9ee08a">+${MEAT[c].hp} HP</span></span>
    </button>`).join('')

  const snackRows = Object.entries(s.snacks ?? {}).filter(([c, n]) => n > 0 && SNACKS[c] && matchesFilter(SNACKS[c].name)).map(([c, n]) => {
    const v = SNACKS[c]
    const tags = snackEffectTags(v)
    const hint = tags.slice(0, 2).join(' · ') || (v.drink ? `THI +${v.thirst}` : `HUN +${v.hunger ?? 0}`)
    return `<button class="it${sel === 'snack:' + c ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'snack:${c}'})" ondblclick="sendAction('inv',{k:'snack',c:'${c}'})">
      <span class="cur">&gt;</span><span class="nm">${esc(v.name)}</span>
      <span class="stat-r"><span>×${n}</span><span>${esc(hint)}</span></span>
    </button>`
  }).join('')

  const aid = aid0 + meatRows + snackRows || '<div class="em">No aid supplies carried.</div>'

  // Apparel list
  const on = wornTokens(s.look).filter((t) => matchesFilter(parseCloth(t)?.row?.name)), bag = (s.clothes ? s.clothes.split(',').filter(Boolean) : []).filter((t) => matchesFilter(parseCloth(t)?.row?.name))
  const clothOrder = (a, b) => {
    const x = parseCloth(a)?.row, y = parseCloth(b)?.row
    if (sortMode === 'dam') return (y?.dr ?? 0) - (x?.dr ?? 0)
    if (sortMode === 'wg') return (y?.kg ?? 0) - (x?.kg ?? 0)
    if (sortMode === 'cnd') return armorCnd(s.look, a) - armorCnd(s.look, b)
    if (sortMode === 'val') return itemVal(b) - itemVal(a)
    return (x?.name ?? '').localeCompare(y?.name ?? '')
  }

  const modHint = (row) => { const list = formatModsList(row?.mods); return list.length ? ` · ${list.slice(0, 2).join(', ')}` : '' }
  const app = on.sort(clothOrder).map((t) => {
    const p = parseCloth(t); if (!p) return ''
    const c = armorCnd(s.look, t)
    return `<button class="it on${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})" ondblclick="sendAction('inv',{k:'unwear',w:'${p.slot}'})">
      <span class="cur">&gt;</span><span class="eq-tag">EQ</span>
      <span class="nm">${esc(p.row.name)}</span>
      <span class="stat-r"><span>DR ${p.row.dr}${esc(modHint(p.row))}</span>${cndMini(c)}</span>

    </button>`
  }).join('') + [...new Set(bag)].sort(clothOrder).map((t) => {
    const p = parseCloth(t); if (!p) return ''
    const n = bag.filter((x) => x === t).length, c = armorCnd(s.look, t)
    return `<button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})" ondblclick="sendAction('inv',{k:'wear',w:'${t}'})">
      <span class="cur">&gt;</span><span class="nm">${esc(p.row.name)}${n > 1 ? ` ×${n}` : ''}</span>
      <span class="stat-r"><span>DR ${p.row.dr}${esc(modHint(p.row))}</span>${cndMini(c)}</span>

    </button>`
  }).join('') || '<div class="em">No apparel carried.</div>'

  // Ammo list
  const ammo = ['ammo', 'shells', 'cells'].filter((t) => s[t]).map((t) => `
    <button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})">
      <span class="cur">&gt;</span>
      <span class="nm">${AMMO_NAMES[t]}</span>
      <span class="stat-r"><span>×${s[t]}</span></span>
    </button>`).join('') || '<div class="em">Out of ammunition.</div>'

  // Throwables: listed with the ammo, a THROW button and a card each
  const throwRows = Object.entries(THROW).filter(([, row]) => row?.key && s[row.key] > 0).map(([t, { key: k, name: nm }]) => `
    <button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${t}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${t === 'frag' ? '#b8c49a' : t === 'fresh' ? '#9fd8e6' : '#f0a050'}">${nm}</span>
      <span class="stat-r"><span>×${s[k]}</span></span>
    </button>`).join('')
  // Skill Books & Magazines + Misc list
  const bookRows = Object.entries(s.books ?? {}).filter(([t, n]) => {
    if (n <= 0) return false
    const sp = getBookSpec(t)
    return sp && matchesFilter(sp.title + ' ' + sp.skillName + ' book')
  }).map(([t, n]) => {
    const sp = getBookSpec(t)
    const chk = canReadBook(s, t, permanentSkillsOf(s)[sp.skill] ?? 0)
    const tag = chk.ok ? `+${sp.bonus} ${sp.skillName.slice(0, 4).toUpperCase()} · PERM` : 'READ'
    return `<button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${esc(t)}'})" ondblclick="sendAction('inv',{k:'readBook',t:'${esc(t)}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:#ffcf6a">${esc(sp.title)}${n > 1 ? ` ×${n}` : ''}</span>
      <span class="stat-r"><span style="color:${chk.ok ? '#8fd67c' : '#888'}">${tag}</span></span>
    </button>`
  }).join('')
  const magRows = Object.entries(s.mags ?? {}).filter(([t, n]) => {
    if (n <= 0) return false
    const sp = getMagSpec(t)
    return sp && matchesFilter(sp.title + ' ' + sp.skillName + ' magazine')
  }).map(([t, n]) => {
    const sp = getMagSpec(t)
    return `<button class="it${sel === t ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'${esc(t)}'})" ondblclick="sendAction('inv',{k:'readMag',t:'${esc(t)}'})">
      <span class="cur">&gt;</span><span class="nm" style="color:${sp.color}">${esc(sp.title)}${n > 1 ? ` ×${n}` : ''}</span>
      <span class="stat-r"><span style="color:#8fd67c">+${sp.bonus} ${sp.skillName.slice(0, 4).toUpperCase()} · ${sp.durationMin}M</span></span>
    </button>`
  }).join('')
  const misc = `${bookRows}${magRows}${s.skates ? `<div class="it"><span class="cur">&gt;</span><span class="nm" style="color:#ff9a4a">Roller skates</span><span class="stat-r">Level 31 rink</span></div>` : ''}${s.compass > 0 ? `<button class="it" onclick="sendAction('inv',{k:'compass'})"><span class="cur">&gt;</span><span class="nm" style="color:#d8b56a">Old compass</span><span class="stat-r">${s.compass} reads</span></button>` : ''}
    ${s.firesalt > 0 ? `<button class="it" onclick="sendAction('inv',{k:'firesalt'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Firesalt</span><span class="stat-r">${s.firesalt} shards · RUB</span></button><button class="it" onclick="sendAction('inv',{k:'fsThrow'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Firesalt · throw a shard</span><span class="stat-r">sparks, burns</span></button><button class="it" onclick="sendAction('inv',{k:'fsMelt'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Firesalt · melt 5 into an ingot</span><span class="stat-r">pyroil</span></button><button class="it" onclick="sendAction('inv',{k:'fsBoil'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Firesalt · boil almond water</span><span class="stat-r">grey to clean</span></button>` : ''}
    ${String(s.weapons ?? '').split(',').some((w) => w.split('~')[0] === 'squirt_gun') ? `<div class="it"><span class="cur">&gt;</span><span class="nm" style="color:#5a8cff">Squirt Gun tank</span><span class="stat-r">${(s.sqfill ?? 25) + (s.loaded_squirt_gun ?? 0)} · ${({ water: 'water', almond: 'almond water', pyroil: 'pyroil', repellent: 'repellent', cashew: 'cashew water' })[s.sqLiq ?? 'water']}</span></div><button class="it" onclick="sendAction('inv',{k:'sqFill',c:'water'})"><span class="cur">&gt;</span><span class="nm" style="color:#9cc8ff">Tank · top up with water</span><span class="stat-r">free, 25</span></button><button class="it" onclick="sendAction('inv',{k:'sqFill',c:'almond'})"><span class="cur">&gt;</span><span class="nm" style="color:#e8dcc0">Tank · pour in almond water</span><span class="stat-r">grey bottle, 15</span></button><button class="it" onclick="sendAction('inv',{k:'sqFill',c:'pyroil'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff8a3a">Tank · melt in a firesalt shard</span><span class="stat-r">pyroil, 6</span></button><button class="it" onclick="sendAction('inv',{k:'sqFill',c:'repellent'})"><span class="cur">&gt;</span><span class="nm" style="color:#cfe8c8">Tank · pour in Smiler Repellent</span><span class="stat-r">10</span></button>${s.sqLiq === 'almond' ? `<button class="it" onclick="sendAction('inv',{k:'sqDrink'})"><span class="cur">&gt;</span><span class="nm" style="color:#e8dcc0">Tank · squirt into your mouth</span><span class="stat-r">+thirst</span></button>` : ''}<button class="it" onclick="sendAction('inv',{k:'sqEmpty'})"><span class="cur">&gt;</span><span class="nm" style="color:#8aa0c0">Tank · drain it</span><span class="stat-r"></span></button>` : ''}
    ${s.fsIngot > 0 ? `<button class="it" onclick="sendAction('inv',{k:'fsIngot'})"><span class="cur">&gt;</span><span class="nm" style="color:#c8261a">Firesalt ingot</span><span class="stat-r">${s.fsIngot} · THROW</span></button>` : ''}
    ${s.cashew > 0 ? `<button class="it" onclick="sendAction('inv',{k:'cashewDrink'})"><span class="cur">&gt;</span><span class="nm" style="color:#e8d2b0">Cashew Water</span><span class="stat-r">${s.cashew} · DRINK</span></button>${(s.almonds ?? 0) > 0 ? `<button class="it" onclick="sendAction('inv',{k:'cashewMix'})"><span class="cur">&gt;</span><span class="nm" style="color:#e8d2b0">Cashew + almond water</span><span class="stat-r">NEUTRALIZE</span></button>` : ''}` : ''}
    ${s.repellent > 0 ? `<button class="it" onclick="sendAction('inv',{k:'repellent'})"><span class="cur">&gt;</span><span class="nm" style="color:#cfe8c8">Smiler Repellent</span><span class="stat-r">${s.repellent} · SPRAY</span></button>` : ''}
    ${s.bobbypins ? `<button class="it${sel === 'bobbypin' ? ' sel' : ''}" onclick="sendAction('inv',{k:'sel',t:'bobbypin'})"><span class="cur">&gt;</span><span class="nm">Bobby pins</span><span class="stat-r">${s.bobbypins}</span></button>` : ''}
    ${s.pages ? String(s.pages).split(',').filter(Boolean).sort((x, y) => x - y).map((n) => `<button class="it" onclick="sendAction('inv',{k:'read',n:${+n}})"><span class="cur">&gt;</span><span class="nm" style="color:#e8dcc0">${+n === 24 ? 'Field doc 24' : +n >= 21 && +n <= 23 ? 'Field doc ' + (+n - 20) : +n >= 11 && +n <= 17 ? 'Alef papers ' + (+n - 10) : 'Torn page ' + +n}</span><span class="stat-r">READ</span></button>`).join('') : ''}` || '<div class="em">No miscellaneous items.</div>'

  // tapes get their own tab, each by its own title (Shelly, Nov 10: "the tape for the 50s ad is nowhere to be seen")
  const TAPE_NAMES = { r55: 'Atomic Age Defender (1950s ad)', walt41: 'Field Test 41', matrix: 'Expedition Log: Matrix' }
  const tapes = String(s.holotapes ?? '').split(',').filter(Boolean).map((id) => { const on = s.holoPlay?.id === id; return `<button class="it${on ? ' sel' : ''}" onclick="sendAction('inv',{k:'holo',id:'${id}'})"><span class="cur">&gt;</span><span class="nm" style="color:#ff9a6a">Tape: ${TAPE_NAMES[id] ?? id}</span><span class="stat-r">${on ? '■ STOP' : '▶ PLAY'}</span></button>` }).join('') || '<div class="em">No tapes.</div>'
  const keyRows0 = (s.keyItems ?? []).includes('spamton') ? `<div class="it on" title="Can't be dropped. Weighs nothing."><span class="cur">&gt;</span><span class="nm" style="color:#ff6fd0">[[SPAMTON G. SPAMTON]]</span><span class="stat-r"><span>0 kg</span><span style="color:#ffe14d">LOOT $$ +</span></span><div style="font-size:11px;opacity:.75;padding-left:18px">A [[Big Shot]] riding in your pocket. 10% chance of a backquarter in any loot, +2% on money you find.</div></div>` : ''
  const keyRows = keyRows0 + ((s.keyItems ?? []).includes('l132_daypass') ? `<div class="it on" title="Can't be dropped. Weighs nothing."><span class="cur">&gt;</span><span class="nm" style="color:#e8c766">Lumiria day pass</span><span class="stat-r"><span>0 kg</span><span>KEY</span></span><div style="font-size:11px;opacity:.75;padding-left:18px">Signed by half the square. Lumiria counts you a friend of the town.</div></div>` : '')
  const SECS = {
    key: ['Key items', keyRows],
    weapons: ['Weapons', weapons],
    apparel: ['Apparel', app],
    aid: ['Aid', aid],
    tapes: ['Tapes', tapes],
    misc: ['Misc', misc],
    ammo: ['Ammo', ammo],
    throw: ['Throwables', throwRows],
    repair: ['Repair', repairSec(s)]
  }

  const tab = SECS[s.invTab] ? s.invTab : 'all'
  const list = tab === 'all'
    ? Object.values(SECS).filter(([, h]) => h && !/class="em"/.test(h)).map(([t, h]) => `<div class="sec">${t}</div>${h}`).join('') || '<div class="em">Empty pockets.</div>'
    : (SECS[tab][1] || '<div class="em">None.</div>')

  const cnt = (h) => (String(h).match(/class="it/g) || []).length
  const GLY = { throw: '✸', all: '◈', key: '✦', weapons: '⚔', apparel: '⛨', aid: '✚', misc: '✎', tapes: '▶', ammo: '⁂', repair: '⚙' }
  const rail = ['all', ...Object.keys(SECS)].map((t, i) => {
    const n = t === 'all' ? Object.values(SECS).reduce((a, [, h]) => a + cnt(h), 0) : cnt(SECS[t][1])
    return `<button class="hg-rb${t === tab ? ' on' : ''}" style="--i:${i}" onclick="sendAction('inv',{k:'tab',t:'${t}'})"><span class="g">${GLY[t]}</span><span class="l">${t === 'all' ? 'ALL' : SECS[t][0].toUpperCase()}</span>${n ? `<span class="n">${n}</span>` : ''}</button>`
  }).join('')

  let cap = 0, kg = 0; try { cap = derived(s).carry; kg = carried(s) } catch {}
  const isOver = cap > 0 && kg > cap
  const pct = cap ? Math.min(100, (kg / cap) * 100) : 0

  const eq = W[eqKey] ?? W.fists
  const cashStr = `$${((s.cents ?? 0) / 100).toFixed(2)}`
  const hp = Math.round(s.hp ?? 0), hpMax = maxHp(lv, s), hpPct = Math.max(0, Math.min(100, hp / hpMax * 100))
  const qi = quickItems(s)
  const selQ = qi.find((x) => (x.id === sel || x.id === 'weapon:' + sel) && x.count > 0) // the picked item, when it can ride a slot
  const slots = [1,2,3,4,5,6,7,8,9,0].map((slot) => {
    const id = s.quickSlots?.[slot], it = qi.find((x) => x.id === id), mine = selQ && id === selQ.id
    return `<div class="hg-q${id ? ' set' : ''}${id && it && !it.count ? ' out' : ''}${selQ ? ' arm' : ''}${mine ? ' mine' : ''}" data-interactive role="button" tabindex="0" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();this.click()}" onclick="sendAction('inv',{k:'quickSlot',slot:${slot}})" title="${esc(selQ ? (mine ? 'Take ' + selQ.name + ' off slot ' + slot : 'Put ' + selQ.name + ' on slot ' + slot) : 'Quick slot ' + slot)}"><span class="k">${slot}</span><span class="v">${it ? esc(it.name) : id ? 'EMPTY' : selQ ? '+ ADD' : 'empty'}</span>${it?.count>1 ? `<span class="c">×${it.count}</span>` : ''}${id ? `<button class="x" onclick="event.stopPropagation();sendAction('inv',{k:'quickAssign',slot:${slot},id:''})" title="Clear slot ${slot}" aria-label="Clear slot ${slot}">✕</button>` : ''}</div>`
  }).join('')
  const qHint = selQ ? `<b>${esc(selQ.name)}</b>: click a slot or press its number` : 'Pick an item below, then click a slot or press 0–9'

  return `<div class="pbw pb"><div class="pbp inv hg" data-modal tabindex="0" onkeydown="if(event.target.tagName!=='INPUT'&&!event.repeat&&(event.key==='Escape'||event.key==='i'||event.key==='I'||event.key==='y'||event.key==='Y'||event.key==='Tab')){event.preventDefault();event.stopPropagation();sendAction('inv',{k:'close'})}">
    <div class="hg-top">
      <div class="hg-brand"><h2>Inventory</h2></div>
      <div class="hg-vit">
        <div class="hg-gauge"><span>HP</span><b>${hp}<i>/${hpMax}</i></b><div class="bar"><em style="width:${hpPct.toFixed(0)}%"></em></div></div>
        <div class="hg-gauge${isOver ? ' warn' : ''}"><span>LOAD</span><b>${kg.toFixed(1)}<i>kg</i></b><div class="bar"><em style="width:${pct.toFixed(0)}%"></em></div></div>
        <div class="hg-chip"><span>DR</span><b>${wornDR(s.look)}</b></div>
        <div class="hg-chip cash"><span>CASH</span><b>${cashStr}</b></div>
      </div>
    </div>

    ${wristNav('inventory')}
    <div class="hg-qrow"><div class="hg-qt">QUICK SLOTS<small>${qHint}</small></div><div class="hg-qs">${slots}</div></div>

    <div class="hg-bd">
      <nav class="hg-rail">${rail}</nav>
      <div class="hg-mid">
        <div class="inv-search-row">
          <input class="inv-search" type="search" value="${esc(s.invFilter ?? '')}" placeholder="Filter items..." aria-label="Filter inventory items" onchange="sendAction('inv',{k:'filter',q:this.value})" onkeydown="if(event.key==='Enter'){event.preventDefault();sendAction('inv',{k:'filter',q:this.value})}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(this.value){this.value='';sendAction('inv',{k:'filter',q:''})}else{sendAction('inv',{k:'close'})}}">
          ${filterQ ? `<button class="sort-btn" onclick="sendAction('inv',{k:'filter',q:''})">Clear</button>` : ''}
        </div>
        <div class="hg-sort"><span>${tab === 'all' ? 'All items' : SECS[tab][0].toUpperCase()}</span><span class="sp"></span>
          ${[['name', 'A–Z'], ['dam', tab === 'apparel' ? 'Protection' : tab === 'all' ? 'Damage / DR' : 'Damage'], ['wg', 'Weight'], ['val', 'Value'], ['cnd', 'Condition']].map(([k, l]) => `<button class="${sortMode === k ? 'on' : ''}" onclick="sendAction('inv',{k:'sort',s:'${k}'})">${l}</button>`).join('')}
        </div>
        <div class="ls" onkeydown="if(event.key==='ArrowDown'||event.key==='ArrowUp'){const rows=Array.from(this.querySelectorAll('button.it:not(:disabled)'));const i=rows.indexOf(event.target);if(i>=0){event.preventDefault();event.stopPropagation();rows[i+(event.key==='ArrowDown'?1:-1)]?.focus()}}">${list}</div>
      </div>
      <div class="hg-card" id="hgc-${String(sel).replace(/[^a-z0-9]/gi, '_')}">${pane(s, sel, eqKey)}</div>
    </div>

    <div class="hg-ft">
      <span class="hint"><kbd>↑ ↓</kbd>browse</span><span class="hint"><kbd>Enter</kbd>inspect</span><span class="hint"><kbd>0–9</kbd>assign quick slot</span>
      <span class="c">${s.kills ?? 0} kills · LV ${lv} · holding ${eq.name}</span>
      <button onclick="sendAction('inv',{k:'close'})"><kbd>I</kbd>CLOSE</button>
    </div>
  </div></div>`
}

function bagRows(s) { // what you carry that a fridge holds: [token, name, count]
  const AWK = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }, out = []
  for (const [c, k] of Object.entries(AWK)) if ((s[k] ?? 0) > 0) out.push([`almond:${c}`, AW[c]?.name ?? 'Almond Water', s[k]])
  for (const [k, n] of Object.entries(s.snacks ?? {})) if (n > 0 && SNACKS[k]) out.push([`snack:${k}`, SNACKS[k].name, n])
  for (const [k, n] of Object.entries(s.meat ?? {})) if (n > 0 && MEAT[k]) out.push([`meat:${k}`, MEAT[k].name, n])
  if (s.lootName === 'Steamer trunk') for (const [k, n] of Object.entries(s.furn ?? {})) if (n > 0 && FURN.pieces?.[k]) out.push([`furn:${k}`, FURN.pieces[k].name, n]) // your trunk keeps furniture too
  return out
}
function storage(s, key) { // your fridge: two sides, one press moves one thing
  const items = itemsOf(s.lootList), nameOf = (t) => t.startsWith('furn:') ? (FURN.pieces?.[t.slice(5)]?.name ?? 'Furniture') : t.startsWith('almond:') && AW[t.slice(7)]?.name ? AW[t.slice(7)].name : describe(t).name
  const groups = {}; items.forEach((t, i) => { (groups[t] ??= { t, i, n: 0 }).n++ })
  const row = (label, n, act, btn) => `<div style="display:flex;align-items:center;gap:10px;padding:5px 2px;border-bottom:1px solid rgba(255,190,90,.12)"><span style="flex:1">${label}</span><span style="opacity:.6;min-width:34px;text-align:right">x${n}</span><button onclick="sendAction('loot',${act})" style="padding:3px 10px;border:1px solid rgba(255,190,90,.6);background:rgba(255,190,90,.08);color:inherit;font:inherit;cursor:pointer">${btn}</button></div>`
  const left = Object.values(groups).map((g) => row(nameOf(g.t), g.n, `{k:'take',i:${g.i}}`, 'TAKE')).join('') || '<div class="em">Empty.</div>'
  const right = bagRows(s).map(([t, nm, n]) => row(nm, n, `{k:'store',t:'${t}'}`, 'PUT IN')).join('') || (s.lootName === 'Steamer trunk' ? '<div class="em">Nothing to stow.</div>' : '<div class="em">No food or drinks on you.</div>')
  const col = (title, body) => `<div style="flex:1;min-width:0"><div style="opacity:.7;letter-spacing:.15em;margin-bottom:6px">${title}</div><div style="max-height:46vh;overflow:auto">${body}</div></div>`
  return `<div class="pbw pb"><div class="pbp" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('loot',{k:'close'})}">
    <div class="nv-top"><div class="nv-top-left"><h2>${esc(s.lootName || 'STORAGE')}</h2></div><div class="nv-vitals"><span><b>SPACE</b>${items.length}/30</span></div></div>
    <div style="display:flex;gap:28px;margin-top:10px">${col('INSIDE', left)}${col('YOUR BAG', right)}</div>
    <div class="ft">
      ${items.length ? `<button onclick="sendAction('loot',{k:'all'})"><kbd>R</kbd>Take all</button>` : ''}
      <button onclick="sendAction('loot',{k:'close'})"><kbd>${key}</kbd>Close</button>
    </div>
  </div></div>`
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
      <span class="nm" style="color:${t.startsWith('weapon:') ? d.color : 'inherit'}">${t.startsWith('almond:') && AW[t.slice(7)]?.name ? AW[t.slice(7)].name : d.name}</span>
      <span class="stat-r">${t.startsWith('weapon:') || t.startsWith('cloth:') ? cndMini(c) : ''}<span>${t === 'ammo' ? `+${W.ammo.perPickup}` : t === 'shells' ? `+${W.shells.perPickup}` : t === 'cells' ? `+${W.cells.perPickup}` : ''}</span></span>
      ${detail(t, s, false)}
    </button>`
  }).join('')

  const n = owned(s).length - 1
  const carry = `Carrying ${n} weapon${n === 1 ? '' : 's'} · almond ${s.almonds ?? 0} · rounds ${s.ammo ?? 0} · shells ${s.shells ?? 0}`

  // Nov 12 (Shelly: the case's list fell into squashed columns): the list keeps its own half; the item card takes the rest and never squeezes it
  const col = (title, body) => `<div style="flex:0 0 44%;min-width:0;display:flex;flex-direction:column"><div style="font-size:11px;letter-spacing:.2em;opacity:.7;border-bottom:1px solid currentColor;padding-bottom:4px;margin-bottom:6px;white-space:nowrap">${title}</div><div class="ls" style="display:block;flex:1 1 auto;max-height:340px;overflow-y:auto;overflow-x:hidden">${body}</div></div>`
  const left = col(`INSIDE · ${items.length}`, rows.replace(/<span class="stat-r">/g, '<span class="stat-r"><span style="opacity:.6">TAKE&nbsp;</span>') || '<div class="em">Empty.</div>')
  const right = items[0] ? detail(items[0], s, true) : ''
  return `<div class="pbw pb"><div class="pbp" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('loot',{k:'close'})}">
    <div class="nv-top"><div class="nv-top-left"><h2>${esc(s.lootName || 'CONTAINER')}</h2></div></div>
    <div style="display:flex;gap:18px;margin-top:8px;min-height:0;flex:1 1 auto;overflow:hidden">${left}<div style="flex:1 1 0;min-width:0;display:flex;overflow:hidden">${right}</div></div>
    <div class="ft">
      <span class="c">${carry}</span>
      ${items.length ? `<button onclick="sendAction('loot',{k:'all'})"><kbd>R</kbd>Take all</button>` : ''}
      <button onclick="sendAction('loot',{k:'close'})"><kbd>${key}</kbd>Close</button>
    </div>
  </div></div>`
}

const promptText=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
function interactPrompt(f,key){
  const verb=String(f.verb??'Use').replace(/:\s*$/,''),blocked=/^(Locked|Taken)$/i.test(verb),info=['open','shut'].includes(f.info)?'':f.info
  const tint=/^#[0-9a-f]{3,8}$/i.test(f.color??'')?f.color:'#c9b77c'
  return `<div id="lp"><div id="interaction-${encodeURIComponent(f.id??f.name??'target')}" class="interact-card${blocked?' is-blocked':''}" style="--hint:${blocked?'#cf9684':tint}" role="group" aria-label="${promptText(verb+' '+(f.name??''))}"><button class="interact-key" type="button" data-interactive aria-label="${promptText(verb+' '+(f.name??''))}" onclick="sendAction('interact')">${promptText(key)}</button><div class="interact-copy"><span class="interact-verb">${promptText(verb)}</span><span class="interact-name">${promptText(f.name??'Object')}</span>${info?`<div class="interact-info">${promptText(info)}</div>`:''}</div></div></div>`
}

export function lootUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const key = ctx.world.inputs?.actions?.interact?.label ?? 'E'
  let out = CSS
  if (s.lootOpen) out += s.lootStore ? storage(s, key) : container(s, key)
  else if (s.invOpen) out += inventory(s)
  else if (s.focus && screen(s,player.place)==='play') out+=interactPrompt(s.focus,key)
  return out
}

// what a weapon does beyond its numbers, read off its weapons.yml row (Shelly, Nov 10: passives belong on the card)
function passivesOf(w) {
  const out = []
  if (w.vaporize) out.push(['VAPORIZE', 'KILLS BURN TO ASH'])
  if (w.critBonus) out.push(['STEADY AIM', `+${Math.round(w.critBonus * 100)}% CRIT CHANCE`])
  if (w.critMul && w.critMul !== 2) out.push(['CRIT DAMAGE', `x${w.critMul}`])
  if (w.stun) out.push(['STUN', 'HITS STAGGER'])
  if (w.sneak && w.sneak > 1) out.push(['ASSASSIN', `x${w.sneak} SNEAK DAMAGE`])
  if (w.pen) out.push(['PIERCING', `${Math.round(w.pen * 100)}% ARMOR IGNORED`])
  return out
}
