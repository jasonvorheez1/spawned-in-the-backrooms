import { wristNav } from './lib/wrist-nav.js'
// The needs bars (hunger, thirst) and the crafting menu. All from player.state (written by scripts/craft.js): hunger, thirst, craftOpen, craftTab, scrap.
// Buttons send the 'make' action: {k:'make', id, n: 1 | 5 | 'max'}, {k:'tab', c}, {k:'close'}.
// Layout: tabs across the top, the scrap you carry as chips, then recipes, the ones you can make first.
import C from './lib/data/craft.yml'
import B from './lib/data/breakables.yml'
import { skillsOf } from './lib/stats.js'
import { SKILL_NAMES as SKN } from './lib/skill-check.js'
import { recipeStatus, maxMakes, scrapCount, CRAFT_LIMIT, CATS, stationOf } from './lib/craft.js'

import {describe} from './lib/items.js'
import W from './lib/weapons.js'
import { parseCloth } from './lib/clothes.js'
// what a recipe makes, in a line: a weapon's numbers, a garment's armor, or how many of the thing you carry already
const OWN = { ammo: ['ammo', 'rounds'], shells: ['shells', 'shells'], kit: ['kits', 'weapon kits'], akit: ['akits', 'armor kits'], tape: ['tapes', 'tape'], bobbypin: ['bobbypins', 'pins'], fuse: ['fuses', 'fuses'], valve: ['valves', 'valves'], compass: ['compass', 'reads'] }
function makes(s, r) {
  const o = String(r.out[0])
  if (o.startsWith('weapon:')) { const k = o.slice(7), w = W[k]; if (!w) return ''; const own = String(s.weapons ?? '').split(',').includes(k); return `${w.damage} dmg · reach ${w.reach} m · ${(w.cooldown ?? 0).toFixed(2)} s${own ? ' · you have one' : ''}` }
  if (o.startsWith('cloth:')) { const c = parseCloth(o); return c ? `armor ${c.row.dr} · ${c.slot === 'topw' ? 'top' : c.slot}` : '' }
  const n = OWN[o]; return n ? `you carry ${s[n[0]] ?? 0} ${n[1]}` : ''
}

const esc=(text)=>String(text??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
const outputs=(r)=>{const counts=new Map();for(const t of r.out)counts.set(t,(counts.get(t)??0)+1);return [...counts].map(([t,n])=>esc(t==='ammo'?`${n*W.ammo.perPickup} pistol rounds`:t==='shells'?`${n*W.shells.perPickup} shotgun shells`:`${describe(t).name}${n>1?' ×'+n:''}`)).join(' · ')}
const CSS = `<style>
#tk{position:fixed;left:22px;bottom:192px;max-width:300px;pointer-events:none;font-size:11px;letter-spacing:.08em;color:#f2c14e;text-shadow:0 1px 3px #000}
#tk b{color:#fff3d6}
#nd{position:fixed;left:22px;bottom:192px;width:150px;pointer-events:none;font-size:10.5px;letter-spacing:.14em;color:#ffcf87;text-shadow:0 1px 3px #000}
#nd .r{display:flex;align-items:center;gap:6px;margin-top:3px}
#nd .r span{width:34px}
#nd .b{flex:1;height:5px;background:#0009;border:1px solid #ffb34755}
#nd .b u{display:block;height:100%;background:#7fc4e8}
#nd .r.h .b u{background:#d9a35a}
#nd .r.lo{color:#ff7a5a}#nd .r.lo .b u{background:#e0644f}
#cr{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));height:min(600px,calc(100vh - 40px));display:flex;flex-direction:column;background:rgba(10,7,2,.95);border-left:2px solid #ffb34777;border-right:2px solid #ffb34777;color:#ffb347;font-family:'Monofonto','Share Tech Mono',ui-monospace,monospace;text-shadow:0 0 2px rgba(255,160,30,.45)}
#cr .hd{display:flex;align-items:flex-end;gap:12px;padding:12px 16px 6px;border-bottom:2px solid #ffb347}
#cr h2{margin:0;font-size:21px;font-weight:400;letter-spacing:.14em;flex:1}
#cr .md{font-size:11px;opacity:.75;letter-spacing:.08em}
#cr .tb{display:flex;gap:2px;padding:6px 12px 0;flex-wrap:wrap}
#cr .tb button{border:1px solid transparent;background:none;color:#ffb347;opacity:.6;font:inherit;font-size:12px;letter-spacing:.1em;padding:4px 9px;cursor:pointer}
#cr .tb button.on{opacity:1;border-color:#ffb34799;background:#ffb34718}
#cr .tb button i{font-style:normal;color:#9fe07a;margin-left:4px}
#cr .sc{padding:6px 16px;font-size:11px;border-bottom:1px solid #ffb34733;display:flex;flex-wrap:wrap;gap:3px 6px}
#cr .sc span{padding:1px 6px;border:1px solid #ffb34733;color:#e9dfc4}
#cr .sc b{color:#ffe2a8;font-weight:400}
#cr .ls{flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:#ffb34777 transparent}
#cr .sh{padding:6px 16px 2px;font-size:10.5px;letter-spacing:.14em;color:#ffb34799}
#cr .row{display:flex;align-items:center;gap:10px;padding:7px 16px;border-bottom:1px dotted #ffb34726}
#cr .row.no{opacity:.85}#cr .row.lk{opacity:.65}
#cr .n{flex:1;min-width:0;font-size:14.5px;color:#ffd79a}
#cr .n em{font-style:normal;font-size:11px;color:#9fe07a;margin-left:6px}
#cr .n small{display:block;font-size:11px;opacity:.7;color:#e9dfc4}
#cr .in{font-size:11px;margin-top:3px;display:flex;flex-wrap:wrap;gap:3px 10px}
#cr .in i{font-style:normal;color:#cfc4a4}
#cr .in i.lack{color:#ff7a5a}
#cr .rq{font-size:10.5px;letter-spacing:.06em;margin-top:2px;color:#ffb347aa}
#cr .rq .bad{color:#ff7a5a}
#cr .bt{display:flex;gap:4px}
#cr .bt button,#cr .ft button{font:inherit;font-size:12px;letter-spacing:.1em;padding:5px 10px;color:#140f06;background:#ffb347;border:1px solid #fff3d6;cursor:pointer}
#cr .bt button.s{background:none;color:#ffb347;border-color:#ffb34799}
#cr .bt button:disabled{opacity:.25;cursor:default}
#cr .em{padding:20px 16px;font-size:13px;opacity:.6}
#cr .ft{display:flex;justify-content:space-between;align-items:center;padding:8px 16px;border-top:1px solid #ffb34744;font-size:11px;opacity:.85}
#cr .result{color:#9fe07a;font-size:11px;margin-top:4px;line-height:1.5}
#cr .in i.lack{color:#ff9c83}#cr button:focus-visible{outline:2px solid #fff3d6;outline-offset:2px}
@media(max-width:650px){#cr .row{flex-direction:column;align-items:stretch;gap:7px}#cr .bt{flex-wrap:wrap}#cr .hd{align-items:flex-start;flex-direction:column;gap:5px}#cr .md{line-height:1.5}#cr .ft{flex-wrap:wrap;gap:8px}#cr .tb button{padding:7px 8px}}
</style>`
const ORDER = { weapons: 0, ammo: 1, aid: 2, food: 3, tools: 4, armor: 5 }
const TITLE = { weapons: 'WEAPONS', ammo: 'AMMO', aid: 'AID & REPAIR', tools: 'TOOLS & KEYS', armor: 'ARMOR', food: 'FOOD & WATER' }

export function craftUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null || s.hunger == null) return ''
  const lo = C.needs.low
  let out = CSS + `<div id="nd"><div class="r h ${s.hunger < lo ? 'lo' : ''}"><span>FOOD</span><div class="b"><u style="width:${s.hunger}%"></u></div></div><div class="r ${s.thirst < lo ? 'lo' : ''}"><span>WATER</span><div class="b"><u style="width:${s.thirst}%"></u></div></div></div>`
  if (s.l4task) out += `<div id="tk">TASK · ${esc(s.l4task.text)} <b>${s.l4task.have ?? 0}/${s.l4task.need}</b></div>` // Level 4's office task (scripts/l4-office.js)
  if (!s.craftOpen) return out
  const sk = skillsOf(s), bench = s.craftOpen === 'bench', tab = CATS.some(([k])=>k===s.craftTab) ? s.craftTab : 'all'
  const station = bench ? (s.craftStation ?? 'bench') : 'hand'
  const all = Object.entries(C.recipes).filter(([, r]) => !bench || stationOf(r) === station).map(([id, r]) => ({ id, r, st: recipeStatus(s, id), mx: maxMakes(s, id), cat: r.cat ?? 'tools' })) // a station shows only its own recipes; the hands list them all so you can see what a bench would give you
  const ready = all.filter((x) => x.st.ok).length
  const tabs = CATS.filter(([c]) => c === 'all' || c === 'ready' || all.some((x) => x.cat === c)).map(([c, l]) => { const n = c === 'ready' ? ready : c === 'all' ? 0 : all.filter((x) => x.cat === c && x.st.ok).length
    return `<button class="${tab === c ? 'on' : ''}" onclick="sendAction('make',{k:'tab',c:'${c}'})">${l}${n ? `<i>${n}</i>` : ''}</button>` }).join('')
  const stock = Object.entries(B.scrap).filter(([k]) => scrapCount(s,k) > 0).map(([k, v]) => `<span>${esc(v.name)} <b>${scrapCount(s,k)}</b></span>`).join('') || '<span>No scrap yet. Break walls, furniture and machines down.</span>'
  const shown = all.filter((x) => tab === 'all' || (tab === 'ready' ? x.st.ok : x.cat === tab))
  // ready first, then the ones you only lack scrap for, then the ones a skill or the bench locks
  const rank = (x) => (x.st.ok ? 0 : x.st.skillOk && x.st.benchOk ? 1 : 2)
  shown.sort((a, b) => (ORDER[a.cat] - ORDER[b.cat]) || rank(a) - rank(b) || a.r.name.localeCompare(b.r.name))
  let last = '', rows = ''
  for (const { id, r, st, mx, cat } of shown) {
    if (tab === 'all' || tab === 'ready') { if (cat !== last) { rows += `<div class="sh">${TITLE[cat] ?? cat.toUpperCase()}</div>`; last = cat } }
    const ins = Object.entries(r.in).map(([k,n])=>{const have=scrapCount(s,k);return `<i class="${have<n?'lack':''}">${esc(B.scrap[k]?.name??k)} ${have}/${n}${have<n?' · '+(n-have)+' short':''}</i>`}).join('')
    const req = [r.skill ? `<span class="${st.skillOk ? '' : 'bad'}">${SKN[r.skill[0]]} ${r.skill[1]} (you ${sk[r.skill[0]] ?? 0})</span>` : '', r.bench ? `<span class="${st.benchOk ? '' : 'bad'}">${stationOf(r) === 'cook' ? 'COOKING FIRE' : stationOf(r) === 'ammo' ? 'RELOADING BENCH' : 'WORKBENCH'}</span>` : ''].filter(Boolean).join(' · ')
    const per = st.bonusChance>0 ? `<em>${Math.round(st.bonusChance*100)}% bonus chance</em>` : ''
    const cls = st.ok ? '' : st.skillOk && st.benchOk ? 'no' : 'lk'
    rows += `<div class="row ${cls}"><div class="n">${esc(r.name)}${per}<small>${esc(r.desc)}</small><div class="result">Makes ${outputs(r)}</div>${makes(s,r)?`<small class="mk">${esc(makes(s,r))}</small>`:''}<div class="in">${ins}</div>${req ? `<div class="rq">${req}</div>` : ''}${!st.roomOk?'<div class="rq"><span class="bad">No room for the complete output</span></div>':''}</div>
      <div class="bt"><button ${st.ok ? '' : 'disabled'} onclick="sendAction('make',{k:'make',id:'${id}',n:1})">Craft</button>${st.ok && mx > 5 ? `<button class="s" onclick="sendAction('make',{k:'make',id:'${id}',n:5})">Make 5</button>` : ''}${st.ok && mx >= 2 ? `<button class="s" onclick="sendAction('make',{k:'make',id:'${id}',n:'max'})">Make ${mx}</button>` : ''}</div></div>`
  }
  if (!rows) rows = `<div class="em">${tab === 'ready' ? 'Nothing you can make yet. Check All for recipe requirements.' : 'Nothing here.'}</div>`
  return out + `<div id="cr" data-modal tabindex="0" onkeydown="if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('make',{k:'close'})}"><div class="hd"><h2>${bench ? ({ cook: 'Cooking fire', ammo: 'Reloading bench' }[station] ?? 'Workbench') : 'Crafting'}</h2><span class="md">${bench ? 'This station only' : 'Everything · stations (B) unlock the rest'}</span></div>
    ${wristNav('craft')}<div class="tb">${tabs}</div><details class="craft-stock"><summary>Materials on hand</summary><div class="sc">${stock}</div></details><div class="ls">${rows}</div>
    <div class="ft"><span>${ready} of ${all.length} recipes ready · Batch limit ${CRAFT_LIMIT}</span><button onclick="sendAction('make',{k:'close'})">Close · Y</button></div></div>`
}
