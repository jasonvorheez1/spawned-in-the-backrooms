// The build menu (B), in the Pip-Boy amber of scripts/loot-ui.js: the pieces, their scrap cost, what you carry.
import B from './lib/data/breakables.yml'
const CSS = `<style>#bm{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 14px);top:50%;transform:translateY(-50%);width:250px;background:rgba(10,7,2,.9);border:1px solid rgba(255,182,66,.45);padding:8px 10px;color:#ffb642;font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;text-transform:uppercase;text-shadow:0 0 2px rgba(255,160,30,.45);pointer-events:none;font-size:13px}
#bm h3{margin:0 0 6px;font-weight:400;font-size:17px;border-bottom:2px solid #ffb642;padding-bottom:3px}
#bm .r{display:flex;justify-content:space-between;padding:2px 6px;border:1px solid transparent}#bm .r.on{border-color:#ffb642}#bm .r.no{color:rgba(255,182,66,.45)}
#bm .c{font-size:10px;color:rgba(255,182,66,.6);padding:0 6px 3px}#bm .k{display:inline-block;border:1px solid #ffb642;padding:0 4px;margin-right:4px;font-size:10px}
#bm .sc{margin-top:6px;border-top:1px solid rgba(255,182,66,.45);padding-top:4px;font-size:11px;display:flex;flex-wrap:wrap;gap:4px 10px}#bm .ft{margin-top:6px;font-size:10px;color:rgba(255,182,66,.7)}</style>`
export function buildUi(ctx, player) {
  const s = player?.state ?? {}
  if (!s.building || !B.pieces[s.building]) return ''
  const has = (k) => s.scrap?.[k] ?? 0
  const rows = B.order.map((id) => { const pc = B.pieces[id], ok = Object.entries(pc.cost).every(([k, n]) => has(k) >= n)
    return `<div class="r ${id === s.building ? 'on' : ''} ${ok ? '' : 'no'}"><span>${pc.name}</span><span>${pc.hp} HP</span></div>${id === s.building ? `<div class="c">${Object.entries(pc.cost).map(([k, n]) => `${B.scrap[k].name} ${has(k)}/${n}`).join(' · ')}</div>` : ''}` }).join('')
  return `${CSS}<div id="bm"><h3>Build</h3>${rows}<div class="sc">${Object.keys(B.scrap).map((k) => `<span>${B.scrap[k].name} ${has(k)}</span>`).join('')}</div><div class="ft"><span class="k">LMB</span>place <span class="k">R</span>turn <span class="k">X</span>piece <span class="k">B</span>exit</div></div>`
}
