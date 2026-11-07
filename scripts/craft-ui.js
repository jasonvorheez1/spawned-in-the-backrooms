// The needs bars (hunger, thirst) and the crafting menu. All from player.state (written by scripts/craft.js): hunger, thirst, craftOpen, craftTab, scrap.
// Buttons send the 'make' action: {k:'make', id, n: 1 | 5 | 'max'}, {k:'tab', c}, {k:'close'}.
// Layout: tabs across the top, the scrap you carry as chips, then recipes, the ones you can make first.
import C from './lib/data/craft.yml'
import B from './lib/data/breakables.yml'
import { skillsOf, SKILLS } from './lib/stats.js'
import { recipeStatus, maxMakes, CATS } from './lib/craft.js'

const SKN = Object.fromEntries(SKILLS.map((k) => [k.k, k.name]))
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
#cr .row.no{opacity:.55}#cr .row.lk{opacity:.32}
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
</style>`
const ORDER = { weapons: 0, ammo: 1, aid: 2, tools: 3, armor: 4 }
const TITLE = { weapons: 'WEAPONS', ammo: 'AMMO', aid: 'AID & REPAIR', tools: 'TOOLS & KEYS', armor: 'ARMOR' }

export function craftUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null || s.hunger == null) return ''
  const lo = C.needs.low
  let out = CSS + `<div id="nd"><div class="r h ${s.hunger < lo ? 'lo' : ''}"><span>FOOD</span><div class="b"><u style="width:${s.hunger}%"></u></div></div><div class="r ${s.thirst < lo ? 'lo' : ''}"><span>WATER</span><div class="b"><u style="width:${s.thirst}%"></u></div></div></div>`
  if (s.l4task) out += `<div id="tk">TASK · ${s.l4task.text} <b>${s.l4task.have ?? 0}/${s.l4task.need}</b></div>` // Level 4's office task (scripts/l4-office.js)
  if (!s.craftOpen) return out
  const sc = s.scrap ?? {}, sk = skillsOf(s), bench = s.craftOpen === 'bench', tab = s.craftTab || 'all'
  const all = Object.entries(C.recipes).map(([id, r]) => ({ id, r, st: recipeStatus(s, id), mx: maxMakes(s, id), cat: r.cat ?? 'tools' }))
  const ready = all.filter((x) => x.st.ok).length
  const tabs = CATS.map(([c, l]) => { const n = c === 'ready' ? ready : c === 'all' ? 0 : all.filter((x) => x.cat === c && x.st.ok).length
    return `<button class="${tab === c ? 'on' : ''}" onclick="sendAction('make',{k:'tab',c:'${c}'})">${l}${n ? `<i>${n}</i>` : ''}</button>` }).join('')
  const stock = Object.entries(B.scrap).filter(([k]) => (sc[k] ?? 0) > 0).map(([k, v]) => `<span>${v.name} <b>${sc[k]}</b></span>`).join('') || '<span>No scrap yet. Break walls, furniture and machines down.</span>'
  const shown = all.filter((x) => tab === 'all' || (tab === 'ready' ? x.st.ok : x.cat === tab))
  // ready first, then the ones you only lack scrap for, then the ones a skill or the bench locks
  const rank = (x) => (x.st.ok ? 0 : x.st.skillOk && x.st.benchOk ? 1 : 2)
  shown.sort((a, b) => (ORDER[a.cat] - ORDER[b.cat]) || rank(a) - rank(b) || a.r.name.localeCompare(b.r.name))
  let last = '', rows = ''
  for (const { id, r, st, mx, cat } of shown) {
    if (tab === 'all' || tab === 'ready') { if (cat !== last) { rows += `<div class="sh">${TITLE[cat] ?? cat.toUpperCase()}</div>`; last = cat } }
    const ins = Object.entries(r.in).map(([k, n]) => `<i class="${(sc[k] ?? 0) < n ? 'lack' : ''}">${B.scrap[k]?.name ?? k} ${sc[k] ?? 0}/${n}</i>`).join('')
    const req = [r.skill ? `<span class="${st.skillOk ? '' : 'bad'}">${SKN[r.skill[0]]} ${r.skill[1]} (you ${sk[r.skill[0]] ?? 0})</span>` : '', r.bench ? `<span class="${st.benchOk ? '' : 'bad'}">WORKBENCH</span>` : ''].filter(Boolean).join(' · ')
    const per = r.out.length > 1 ? `<em>×${r.out.length}</em>` : ''
    const cls = st.ok ? '' : st.skillOk && st.benchOk ? 'no' : 'lk'
    rows += `<div class="row ${cls}"><div class="n">${r.name}${per}<small>${r.desc}</small><div class="in">${ins}</div>${req ? `<div class="rq">${req}</div>` : ''}</div>
      <div class="bt"><button ${st.ok ? '' : 'disabled'} onclick="sendAction('make',{k:'make',id:'${id}',n:1})">MAKE</button>${st.ok && mx >= 5 ? `<button class="s" onclick="sendAction('make',{k:'make',id:'${id}',n:5})">×5</button>` : ''}${st.ok && mx >= 2 ? `<button class="s" onclick="sendAction('make',{k:'make',id:'${id}',n:'max'})">MAX ${mx}</button>` : ''}</div></div>`
  }
  if (!rows) rows = `<div class="em">${tab === 'ready' ? 'Nothing you can make yet. The red parts are what you are short of.' : 'Nothing here.'}</div>`
  return out + `<div id="cr" data-modal><div class="hd"><h2>${bench ? 'WORKBENCH' : 'FIELD CRAFTING'}</h2><span class="md">${bench ? 'ALL RECIPES' : 'HANDS ONLY · BUILD A WORKBENCH (B) FOR THE REST'}</span></div>
    <div class="tb">${tabs}</div><div class="sc">${stock}</div><div class="ls">${rows}</div>
    <div class="ft"><span>${ready} READY OF ${all.length}</span><button onclick="sendAction('make',{k:'close'})">CLOSE (Y)</button></div></div>`
}
