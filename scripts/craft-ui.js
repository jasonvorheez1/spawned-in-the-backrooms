// The needs bars (hunger, thirst) and the crafting menu. All from player.state (written by scripts/craft.js): hunger, thirst, craftOpen, scrap.
// Buttons send the 'make' action: {k:'make', id} or {k:'close'}.
import C from './lib/data/craft.yml'
import B from './lib/data/breakables.yml'
import { skillsOf, SKILLS } from './lib/stats.js'
import { recipeStatus } from './lib/craft.js'

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
#cr{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(640px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));max-height:calc(100vh - 40px);overflow:auto;background:linear-gradient(oklch(0.2 0.02 78 / .97),oklch(0.15 0.02 78 / .97));border:1px solid #ffb347;box-shadow:0 0 0 1px #000,6px 6px 0 #000;color:#ffcf87;pointer-events:auto;font-family:inherit}
#cr .hd{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #ffb34755}
#cr h2{margin:0;font-size:19px;letter-spacing:.2em;color:#ffb347;flex:1;text-shadow:0 0 6px rgba(255,170,40,.6)}
#cr .sc{padding:8px 16px;font-size:11.5px;border-bottom:1px solid #ffb34733;display:flex;flex-wrap:wrap;gap:4px 14px;opacity:.9}
#cr .sc b{color:#ffe2a8}
#cr .row{display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px dotted #ffb34733}
#cr .row.no{opacity:.5}
#cr .n{flex:1}
#cr .n small{display:block;font-size:11px;opacity:.7;letter-spacing:.03em}
#cr .in{font-size:11.5px;margin-top:2px}
#cr .in i{font-style:normal;margin-right:10px}
#cr .in i.lack{color:#ff7a5a}
#cr button{font:inherit;font-size:13px;letter-spacing:.1em;padding:6px 14px;color:#16140e;background:#ffb347;border:1px solid #fff3d6;cursor:pointer}
#cr button:disabled{opacity:.3;cursor:default}
#cr .ft{display:flex;justify-content:flex-end;padding:8px 16px}
</style>`

export function craftUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null || s.hunger == null) return ''
  const lo = C.needs.low
  let out = CSS + `<div id="nd"><div class="r h ${s.hunger < lo ? 'lo' : ''}"><span>FOOD</span><div class="b"><u style="width:${s.hunger}%"></u></div></div><div class="r ${s.thirst < lo ? 'lo' : ''}"><span>WATER</span><div class="b"><u style="width:${s.thirst}%"></u></div></div></div>`
  if (s.l4task) out += `<div id="tk">TASK · ${s.l4task.text} <b>${s.l4task.have ?? 0}/${s.l4task.need}</b></div>` // Level 4's office task (scripts/l4-office.js)
  if (!s.craftOpen) return out
  const sc = s.scrap ?? {}, sk = skillsOf(s), bench = s.craftOpen === 'bench'
  const stock = Object.entries(B.scrap).filter(([k]) => (sc[k] ?? 0) > 0).map(([k, v]) => `<span>${v.name} <b>${sc[k]}</b></span>`).join('') || '<span>No scrap yet. Hit walls, furniture and machines to break them down.</span>'
  const rows = Object.entries(C.recipes).map(([id, r]) => {
    const st = recipeStatus(s, id)
    const ins = Object.entries(r.in).map(([k, n]) => `<i class="${(sc[k] ?? 0) < n ? 'lack' : ''}">${B.scrap[k]?.name ?? k} ${sc[k] ?? 0}/${n}</i>`).join('')
    const req = [r.skill ? `${SKN[r.skill[0]]} ${r.skill[1]} (${sk[r.skill[0]]})` : '', r.bench ? 'Workbench' : ''].filter(Boolean).join(' · ')
    return `<div class="row ${st.ok ? '' : 'no'}"><div class="n">${r.name}<small>${r.desc}${req ? ' · ' + req : ''}</small><div class="in">${ins}</div></div><button ${st.ok ? '' : 'disabled'} onclick="sendAction('make',{k:'make',id:'${id}'})">MAKE</button></div>`
  }).join('')
  return out + `<div id="cr" data-modal><div class="hd"><h2>${bench ? 'WORKBENCH' : 'CRAFTING'}</h2></div><div class="sc">${stock}</div>${rows}<div class="ft"><button onclick="sendAction('make',{k:'close'})">CLOSE (Y)</button></div></div>`
}
