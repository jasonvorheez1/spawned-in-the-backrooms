// The conversation card and the trader's shop (scripts/talk.js writes the state they read).
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, faction, buyPrice, sellPrice, sellables } from './lib/npc-talk.js'
import { describe } from './lib/items.js'
import { skillsOf } from './lib/stats.js'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const q = (t) => esc(String(t ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"))
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

const CINE = `<style>
@keyframes tkbar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes tkin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes tkdot{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes nvType{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.tc{position:fixed;inset:0;pointer-events:none;font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;color:#ffb642;--a:#ffb642;--ad:rgba(255,182,66,.55)}
.tc .bar{position:absolute;left:0;right:0;height:9vh;background:#000;animation:tkbar .4s ease-out both}
.tc .bt{top:0;transform-origin:top}.tc .bb{display:none}
.tc .who{position:absolute;top:calc(9vh + 14px);left:0;right:0;text-align:center;text-transform:uppercase;letter-spacing:.14em;text-shadow:0 2px 6px #000;animation:tkin .5s .15s both}
.tc .who b{display:block;font-size:26px;font-weight:400;color:var(--a);letter-spacing:.1em}
.tc .who span{font-size:11px;color:var(--ad)}
.tc .low{position:absolute;left:50%;translate:-50% 0;bottom:3vh;width:min(880px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));max-height:min(58vh,520px);display:flex;flex-direction:column;gap:8px;pointer-events:auto;background:linear-gradient(rgba(12,8,2,.88),rgba(6,4,1,.94));border:2px solid var(--ad);box-shadow:0 0 0 1px #000,0 0 24px rgba(255,160,30,.15) inset;padding:14px 18px 10px;animation:tkin .35s ease-out both}
.tc .low::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(rgba(0,0,0,.22) 0 1px,transparent 1px 3px)}
.tc .sub{display:flex;flex-direction:column;gap:4px;padding-bottom:8px;border-bottom:1px solid var(--ad)}
.tc .old{font-size:13px;color:var(--ad);opacity:.7}
.tc .now{font-size:19px;line-height:1.4;color:#ffc25a;text-shadow:0 0 6px rgba(255,160,30,.45);animation:nvType .9s steps(40) both}
.tc .now i{display:none}
.tc .chk{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c6f060;animation:tkin .4s both}
.tc .dots span{animation:tkdot 1s infinite}.tc .dots span:nth-child(2){animation-delay:.2s}.tc .dots span:nth-child(3){animation-delay:.4s}
.tc .choices{display:flex;flex-direction:column;gap:1px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--ad) transparent}
.tc .ch{background:none;border:0;color:var(--a);font:inherit;font-size:16px;padding:3px 8px;cursor:pointer;display:flex;align-items:baseline;gap:8px;text-align:left;text-shadow:0 0 4px rgba(255,160,30,.35)}
.tc .ch:hover,.tc .ch:focus{background:rgba(255,182,66,.18);outline:1px solid var(--ad);color:#ffe0a0}
.tc .ch b.n{color:var(--ad);font-weight:400;min-width:18px}
.tc .ch span.tag{font-size:15px;color:#ffe0a0;white-space:nowrap}
.tc .ch span.tag.lore{color:#9fc8ff}.tc .ch span.tag.med{color:#c6f060}.tc .ch span.tag.surv{color:#f0a060}
.tc .ch span.txt{flex:1}
.tc .ch.sys span.txt{opacity:.85}
.tc .busy .choices{opacity:.35;pointer-events:none}
.tc .busy form{opacity:.35;pointer-events:none}
.tc form{display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,182,66,.25);padding:4px 0 0}
.tc form em{color:var(--ad);font-style:normal}
.tc input{flex:1;background:none;border:0;outline:0;color:#ffe0a0;font:inherit;font-size:14px}
.tc input::placeholder{color:rgba(255,182,66,.35)}
.tc .opts{display:flex;justify-content:flex-end;font-size:11px;letter-spacing:.14em}
.tc .feel{margin-left:auto}
</style>`
export function talkUi(ctx, player) {
  const s = player?.state ?? {}
  const id = s.shopOpen ?? s.talkWith; if (!id) return ''
  const it = ctx.place?.objects?.[id] ?? ctx.getObject?.(id); if (!it) return ''
  if (s.shopOpen) return `${CSS}<div class="tk tkw" data-modal>${shopUi({ self: player }, s, it)}</div>`
  const role = it.state?.role, key = player.userId ?? player.id, r = it.state?.rapport?.[key] ?? 0
  const log = (s.talks?.[String(it.id).split('/').pop()] ?? []).slice(-T.log)
  const who = esc(nameOf(it)), mood = s.talkMood ?? 'calm', col = MOOD[mood] ?? MOOD.calm
  // the newest exchange is the subtitle; the two lines before it fade above; a skill check flashes as its own line
  let lastN = -1; for (let i = log.length - 1; i >= 0; i--) if (log[i][0] !== 'p') { lastN = i; break }
  const shown = lastN >= 0 ? log[lastN] : null, prior = log.slice(Math.max(0, lastN - 2), Math.max(0, lastN)).filter((l) => l[0] !== 'x')
  const old = prior.map(([w, t]) => `<div class="old">${w === 'p' ? 'you: ' : ''}${esc(t)}</div>`).join('')
  const now = s.talkBusy ? `<div class="now dots" style="color:${col}"><i>${who.toUpperCase()}</i><span>.</span><span>.</span><span>.</span></div>`
    : shown ? (shown[0] === 'x' ? `<div class="chk" id="c${lastN}">${esc(shown[1])}</div>` : `<div class="now" id="n${lastN}-${log.length}" style="color:${col}"><i>${who.toUpperCase()}</i>${esc(shown[1])}</div>`)
    : `<div class="now" style="opacity:.6"><i>${who.toUpperCase()}</i>…</div>`
  const SYS = { svc: SVC[role], trade: 'Let me see what you have to trade.', leave: 'Goodbye.' }
  const sys = [SVC[role] ? ['svc', `[${role === 'medic' ? 'Medicine' : 'Ask'}]`, SVC[role] + '.'] : null, isTrader(it) ? ['trade', '[Barter]', SYS.trade] : null, ...(it.state?.offers ?? []).map(([k, tx]) => [k, '', tx]), ['leave', '', SYS.leave]].filter(Boolean)
  const opts = ''
  const send = `const i=document.getElementById('tkin');if(i&&i.value.trim()){sendAction('talk',{id:'${q(it.id)}',text:i.value});i.value=''}`
  const choices = Array.isArray(s.talkChoices) ? s.talkChoices : []
  const chItems = choices.map((c, i) => {
    const txt = typeof c === 'string' ? c : c.text
    const tag = typeof c === 'object' && c.tag ? c.tag : ''
    const low = tag.toLowerCase()
    const tagCls = low.includes('speech') ? 'speech' : low.includes('barter') ? 'barter' : low.includes('lore') ? 'lore' : low.includes('med') ? 'med' : low.includes('surv') ? 'surv' : 'gen'
    return `<button class="ch" data-interactive onclick="sendAction('talk',{id:'${q(it.id)}',text:'${q(txt)}'})"><b class="n">${i + 1}.</b>${tag ? `<span class="tag ${tagCls}">[${esc(tag)}]</span>` : ''}<span class="txt">${esc(txt)}</span></button>`
  }).join('')
  // the strip: their line, up to four replies, then one small row: type a line, the side asks, bye
  const top = chItems.split('</button>').filter(Boolean).slice(0, 4).map((b) => b + '</button>').join('')
  const small = sys.map(([k, tag, tx]) => `<button data-interactive onclick="sendAction('talkdo',{k:'${q(k)}'})">${esc(k === 'leave' ? 'Bye' : k === 'trade' ? 'Trade' : k === 'svc' ? (SVC[role] ?? 'Ask') : tx.slice(0, 22))}</button>`).join('')
  const kd = `if(event.key==='Escape'){sendAction('talkdo',{k:'leave'})}else if(event.target.id!=='tkin'&&event.key>='1'&&event.key<='9'){const c=document.querySelectorAll('.tc .ch');const b=c[parseInt(event.key)-1];if(b)b.click()}`
  return `${CINE}<div class="tc" data-modal tabindex="0" onkeydown="${kd}">
    <div class="low ${s.talkBusy ? 'busy' : ''}"><div class="sub">${now}</div>
      <div class="choices">${top}</div>
      <form class="row" data-interactive onsubmit="event.preventDefault();${send}"><em>&gt;</em><input id="tkin" data-interactive maxlength="${T.maxText}" autocomplete="off" placeholder="say something…"/>${small}<span class="feel" style="color:${col}">${feel(r)}</span></form>
    </div></div>`
}
