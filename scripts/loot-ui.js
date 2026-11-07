// The looting HUD: the prompt under the crosshair when you look at something you can use, the loot menu
// when you have a container open, and a short notice when something could not be taken.
// player.state: focus {name, info, verb, color}, lootOpen, lootName, lootList, notice {text, at}
// (all written by scripts/interact.js). Buttons send the 'loot' action: {k:'take', i}, {k:'all'}, {k:'close'}.
import { describe, itemsOf } from './lib/items.js'

const CSS = `<style>
#lp{position:fixed;left:50%;top:57%;transform:translateX(-50%);text-align:center;pointer-events:none;font-family:inherit;letter-spacing:.04em;text-shadow:0 1px 3px #000,0 0 8px #000}
#lp .key{display:inline-block;min-width:22px;padding:1px 6px;margin-right:8px;border:1px solid #fff9;border-radius:3px;background:#0008;font-size:13px}
#lp .nm{font-size:19px;font-weight:600}
#lp .in{font-size:12px;opacity:.78;margin-top:2px}
#ln{position:fixed;left:50%;top:66%;transform:translateX(-50%);padding:5px 12px;background:#000a;border:1px solid #fff4;font-size:13px;pointer-events:none}
#lm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));background:oklch(0.2 0.02 80 / .95);border:2px solid oklch(0.78 0.1 85);box-shadow:5px 5px 0 #000;padding:14px 16px;color:oklch(0.95 0.03 90);pointer-events:auto}
#lm h2{font-size:20px;margin:0 0 8px;color:oklch(0.88 0.13 85);letter-spacing:.06em}
#lm .it{display:flex;align-items:center;gap:10px;padding:7px 8px;margin-bottom:4px;background:oklch(0.28 0.02 80);border:1px solid oklch(0.4 0.03 85);cursor:pointer;font:inherit;color:inherit;width:100%;text-align:left}
#lm .it:hover{background:oklch(0.36 0.04 85);border-color:oklch(0.8 0.1 85)}
#lm .it b{font-size:15px}
#lm .it small{opacity:.7;margin-left:auto}
#lm .row{display:flex;gap:8px;margin-top:10px}
#lm .row button{flex:1;font:inherit;font-size:14px;padding:7px;background:oklch(0.3 0.03 80);color:inherit;border:1px solid oklch(0.55 0.06 85);cursor:pointer}
#lm .row button:hover{background:oklch(0.82 0.13 85);color:#16140e}
#lm .em{opacity:.6;padding:14px 4px;text-align:center}
</style>`

export function lootUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const acts = ctx.world.inputs?.actions ?? {}
  const key = acts.interact?.label ?? 'E'
  const now = ctx.now()
  let out = CSS
  if (s.lootOpen) {
    const items = itemsOf(s.lootList)
    const rows = items.map((t, i) => {
      const d = describe(t)
      return `<button class="it" onclick="sendAction('loot',{k:'take',i:${i}})"><b style="color:${d.color}">${d.name}</b><small>${d.info}</small></button>`
    }).join('')
    out += `<div id="lm" data-modal><h2>${s.lootName || 'Container'}</h2>${rows || '<div class="em">Nothing left.</div>'}
      <div class="row">${items.length ? `<button onclick="sendAction('loot',{k:'all'})">Take all (R)</button>` : ''}<button onclick="sendAction('loot',{k:'close'})">Close (${key})</button></div></div>`
  } else if (s.focus) {
    const f = s.focus
    out += `<div id="lp"><div class="nm" style="color:${f.color || '#fff'}"><span class="key">${key}</span>${f.verb} ${f.name}</div><div class="in">${f.info || ''}</div></div>`
  }
  if (s.notice && now - s.notice.at < 2200) out += `<div id="ln">${s.notice.text}</div>`
  return out
}
