// The build menu (B), in the Pip-Boy amber of scripts/loot-ui.js: tabs on 1-7, the pieces in this tab with their cost,
// why the ghost is red, and what a tool is aimed at.
import B from './lib/data/breakables.yml'
import { pieceOf, tabsFor } from './lib/build-piece.js'
const CSS = `<style>#bm{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 14px);top:50%;transform:translateY(-50%);width:300px;max-width:42vw;background:rgba(10,7,2,.9);border:1px solid rgba(255,182,66,.45);padding:8px 10px;color:#ffb642;font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;text-transform:uppercase;text-shadow:0 0 2px rgba(255,160,30,.45);pointer-events:none;font-size:13px}
#bm h3{margin:0 0 5px;font-weight:400;font-size:17px;border-bottom:2px solid #ffb642;padding-bottom:3px;display:flex;justify-content:space-between}#bm h3 small{font-size:10px;opacity:.7;align-self:flex-end}
#bm .tb{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}#bm .tb span{font-size:9.5px;padding:1px 4px;border:1px solid rgba(255,182,66,.3);color:rgba(255,182,66,.55)}#bm .tb span.on{border-color:#ffb642;color:#ffb642;background:rgba(255,182,66,.12)}#bm .tb b{font-weight:400;margin-right:3px;opacity:.7}
#bm .r{display:flex;justify-content:space-between;padding:2px 6px;border:1px solid transparent}#bm .r.on{border-color:#ffb642;background:rgba(255,182,66,.08)}#bm .r.no{color:rgba(255,182,66,.42)}
#bm .c{font-size:10px;padding:1px 6px 4px;display:flex;flex-wrap:wrap;gap:2px 8px}#bm .c .x{color:#ff7a5a}#bm .i{font-size:10px;color:rgba(255,182,66,.7);padding:1px 6px 4px;text-transform:none}
#bm .w{margin-top:5px;padding:3px 6px;font-size:11px;border-left:2px solid #ff7a5a;color:#ff9a7a}#bm .g{margin-top:5px;padding:3px 6px;font-size:11px;border-left:2px solid #7fd1a0;color:#9fe1b8}
#bm .sc{margin-top:6px;border-top:1px solid rgba(255,182,66,.45);padding-top:4px;font-size:10.5px;display:flex;flex-wrap:wrap;gap:3px 10px}#bm .ft{margin-top:6px;font-size:9.5px;color:rgba(255,182,66,.7)}#bm .k{display:inline-block;border:1px solid #ffb642;padding:0 3px;margin:0 2px 0 6px;font-size:9px}#bm .k:first-child{margin-left:0}</style>`
const nm = (k) => B.scrap[k]?.name ?? k
export function buildUi(ctx, player) {
  const s = player?.state ?? {}, k = s.building
  if (!k || !(pieceOf(k) || B.tools?.[k])) return ''
  const has = (x) => s.scrap?.[x] ?? 0, T = tabsFor(s), ti = Math.max(0, T.findIndex((t) => t.pieces.includes(k)))
  const tabs = T.map((t, i) => `<span class="${i === ti ? 'on' : ''}"><b>${i + 1}</b>${t.name}</span>`).join('')
  const rows = T[ti].pieces.map((id) => {
    const tool = B.tools?.[id], pc = pieceOf(id), on = id === k
    if (tool) return `<div class="r ${on ? 'on' : ''}"><span>${tool.name}</span><span></span></div>${on ? `<div class="i">${tool.info}</div>` : ''}`
    if (pc.furn) { const n = s.furn?.[pc.furn] ?? 0; return `<div class="r ${on ? 'on' : ''}"><span>${pc.name}</span><span>x${n}</span></div>` }
    const ok = Object.entries(pc.cost).every(([c, n]) => has(c) >= n)
    return `<div class="r ${on ? 'on' : ''} ${ok ? '' : 'no'}"><span>${pc.name}</span><span>${pc.hp} HP</span></div>${on ? `<div class="c">${Object.entries(pc.cost).map(([c, n]) => `<span class="${has(c) >= n ? '' : 'x'}">${nm(c)} ${has(c)}/${n}</span>`).join('')}</div>${pc.up ? `<div class="i">Upgrades to ${pieceOf(pc.up)?.name}</div>` : ''}` : ''}`
  }).join('')
  let status = ''
  if (B.tools?.[k]) { const t = s.buildTarget; status = t ? `<div class="g">${t.name} · ${t.hp}/${t.max} HP${k === 'tool_upgrade' ? (t.up ? ` → ${t.up}` : ' · top tier') : ''}${!t.mine && k !== 'tool_repair' ? ' · not yours' : ''}</div>` : `<div class="w">Aim at something you built</div>` }
  else if (s.buildWhy) status = `<div class="w">${s.buildWhy}</div>`
  const carried = Object.keys(B.scrap).filter((c) => has(c) > 0)
  const sc = carried.length ? carried.map((c) => `<span>${nm(c)} ${has(c)}</span>`).join('') : '<span>No scrap. Break things for it.</span>'
  return `${CSS}<div id="bm"><h3><span>Build</span><small>${T[ti].name}</small></h3><div class="tb">${tabs}</div>${rows}${status}<div class="sc">${sc}</div><div class="ft"><span class="k">LMB</span>${B.tools?.[k] ? 'use' : 'build'}<span class="k">R</span>turn<span class="k">X</span>next<span class="k">1-${T.length}</span>tab<span class="k">B</span>exit</div></div>`
}
