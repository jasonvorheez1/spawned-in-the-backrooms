// The conversation card and the trader's shop (scripts/talk.js writes the state they read).
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, faction, buyPrice, sellPrice, sellables } from './lib/npc-talk.js'
import { describe } from './lib/items.js'
import { skillsOf } from './lib/stats.js'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const q = (t) => esc(t).replace(/'/g, '&#39;')
const MOOD = { calm: '#d9c79a', happy: '#9fe07a', annoyed: '#f2b14e', angry: '#ff6a4f', scared: '#9fc8ff' }
const feel = (r) => (r <= -60 ? 'HOSTILE' : r <= -25 ? 'COLD' : r < 10 ? 'WARY' : r < 40 ? 'OKAY' : r < 70 ? 'FRIENDLY' : 'TRUSTS YOU')
const SVC = { scout: 'Ask for tips', medic: 'Get patched up', quarter: 'Collect rations' }
const CSS = `<style>
.tk{--a:#ffb642;--ad:rgba(255,182,66,.45);color:var(--a);font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;text-shadow:0 0 2px rgba(255,160,30,.45)}
.tkw{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(0,0,0,.55),rgba(0,0,0,.25) 70%)}
.tkp{background:rgba(10,7,2,.95);padding:14px 20px 12px;width:min(620px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));max-height:min(540px,86vh);box-sizing:border-box;display:flex;flex-direction:column;gap:8px;border-left:2px solid var(--ad);border-right:2px solid var(--ad)}
.tkh{display:flex;align-items:flex-end;gap:12px;border-bottom:2px solid var(--a);padding-bottom:5px;text-transform:uppercase}
.tkh h2{font-size:22px;margin:0;font-weight:400;letter-spacing:.04em}
.tkh .f{font-size:12px;color:var(--ad)}.tkh .r{margin-left:auto;font-size:12px}
.tkl{flex:1;min-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;font-size:15px;scrollbar-width:thin;scrollbar-color:var(--ad) transparent}
.tkl .p{color:#e9dfc4;opacity:.8}.tkl .p b{color:var(--ad);font-weight:400}
.tkl .n b{font-weight:400;color:var(--ad)}.tkl .x{font-size:12px;color:#c6f060;opacity:.85;text-transform:uppercase}
.tkl .w{opacity:.55;font-style:italic}
.tkf{display:flex;gap:6px}
.tkf input{flex:1;background:#140f06;border:1px solid var(--ad);color:#f3e7c6;font:inherit;font-size:15px;padding:6px 8px;outline:none}
.tkf input:focus{border-color:var(--a)}
.tk button{background:none;border:1px solid var(--ad);color:var(--a);font:inherit;font-size:13px;padding:5px 12px;cursor:pointer;text-transform:uppercase}
.tk button:hover{background:var(--a);color:#140f06;text-shadow:none}
.tkb{display:flex;gap:6px;flex-wrap:wrap}.tkb .lv{margin-left:auto}
.tks{display:flex;gap:18px;flex:1;min-height:0}
.tks>div{flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:var(--ad) transparent}
.tks h4{font-size:11px;color:var(--ad);margin:0 0 4px;font-weight:400;letter-spacing:.08em;text-transform:uppercase}
.tks button{display:flex;width:100%;gap:8px;text-align:left;border-color:transparent;font-size:14px;text-transform:none;padding:3px 6px}
.tks button .c{margin-left:auto;white-space:nowrap}.tks .no{opacity:.4;pointer-events:none}
.tks .em{font-size:13px;opacity:.5}
</style>`

function shopUi(ctx, s, it) {
  const barter = skillsOf(s).barter ?? 0, disc = it.state?.discount?.[keyOf(ctx.self ?? {})] ?? 0, cash = s.almonds ?? 0
  const stock = Object.entries(it.state?.stock ?? {})
  const buy = stock.map(([t, [n, base]]) => { const p = buyPrice(base, barter, disc), d = describe(t)
    return `<button class="${n < 1 || p > cash ? 'no' : ''}" onclick="sendAction('shop',{k:'buy',t:'${q(t)}'})"><span style="color:${d.color}">${esc(d.name)}</span><span style="opacity:.6">×${n}</span><span class="c">${p} AW</span></button>` }).join('') || '<div class="em">Shelves are bare.</div>'
  const sell = sellables(s).map(([t, n, base]) => { const d = describe(t)
    return `<button onclick="sendAction('shop',{k:'sell',t:'${q(t)}'})"><span style="color:${d.color}">${esc(d.name)}</span><span style="opacity:.6">×${n}</span><span class="c">+${sellPrice(base, barter)} AW</span></button>` }).join('') || '<div class="em">Nothing they want.</div>'
  return `<div class="tkp"><div class="tkh"><h2>${esc(nameOf(it))}'s stock</h2><span class="f">BARTER ${barter}${disc ? ` · ${Math.round(disc * 100)}% OFF` : ''}</span><span class="r">ALMOND WATER ${cash}</span></div>
    <div class="tks"><div><h4>Buy</h4>${buy}</div><div><h4>Sell</h4>${sell}</div></div>
    <div class="tkb"><button onclick="sendAction('talkdo',{k:'back'})">Back to talking</button><button class="lv" onclick="sendAction('talkdo',{k:'leave'})">Leave</button></div></div>`
}

export function talkUi(ctx, player) {
  const s = player?.state ?? {}
  const id = s.shopOpen ?? s.talkWith; if (!id) return ''
  const it = ctx.getObject ? ctx.getObject(id) : ctx.place?.objects?.[id]; if (!it) return ''
  if (s.shopOpen) return `${CSS}<div class="tk tkw" data-modal>${shopUi({ self: player }, s, it)}</div>`
  const role = it.state?.role, key = player.userId ?? player.id, r = it.state?.rapport?.[key] ?? 0
  const log = (s.talks?.[String(it.id).split('/').pop()] ?? []).slice(-T.log)
  const who = esc(nameOf(it)), mood = s.talkMood ?? 'calm'
  const lines = log.map(([w, t]) => w === 'p' ? `<div class="p"><b>YOU:</b> ${esc(t)}</div>` : w === 'n' ? `<div class="n" style="color:${MOOD[mood] ?? MOOD.calm}"><b>${who.toUpperCase()}:</b> ${esc(t)}</div>` : `<div class="x">${esc(t)}</div>`).join('') || `<div class="w">${who} looks at you, waiting.</div>`
  const busy = s.talkBusy ? `<div class="w">${who} is thinking…</div>` : ''
  const btn = [SVC[role] ? `<button onclick="sendAction('talkdo',{k:'svc'})">${SVC[role]}</button>` : '', isTrader(it) ? `<button onclick="sendAction('talkdo',{k:'trade'})">Trade</button>` : ''].join('')
  const send = `const i=document.getElementById('tkin');if(i&&i.value.trim()){sendAction('talk',{id:'${q(it.id)}',text:i.value});i.value=''}`
  return `${CSS}<div class="tk tkw" data-modal><div class="tkp">
    <div class="tkh"><h2>${who}</h2><span class="f">${faction(it, player.place)} · ${esc(role ?? 'drifter')}${it.state?.follow === player.id ? ' · WITH YOU' : ''}</span><span class="r" style="color:${MOOD[mood] ?? MOOD.calm}">${feel(r)}</span></div>
    <div class="tkl">${lines}${busy}</div>
    <form class="tkf" data-interactive onsubmit="event.preventDefault();${send}"><input id="tkin" data-interactive maxlength="${T.maxText}" autocomplete="off" placeholder="say something to ${who.toLowerCase()}…"/><button type="submit">Send</button></form>
    <div class="tkb">${btn}<button class="lv" onclick="sendAction('talkdo',{k:'leave'})">Leave</button></div></div></div>`
}
