// The HALOGEN's Radio tab: one station for now, Radio Backrooms (scripts/lib/data/radio.yml).
import { wristNav } from './lib/wrist-nav.js'
import { onAir, STATION } from './lib/radio.js'
import { escKeyHandler } from './lib/ui-kit.js'
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const CSS = `<style>
#radio{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,4,1,.55);pointer-events:auto;font-family:'Courier New',monospace;color:#ffb642}
#radio .rp{width:min(620px,92vw);background:rgba(14,9,2,.94);border:1px solid rgba(255,182,66,.45);box-shadow:0 0 30px rgba(255,150,30,.18) inset;padding:18px 22px 22px}
#radio header{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}#radio h1{font-size:22px;letter-spacing:.14em;margin:0}
#radio header button{margin-left:auto}#radio button{font:700 13px 'Courier New',monospace;letter-spacing:.1em;color:#ffb642;background:transparent;border:1px solid rgba(255,182,66,.5);padding:6px 12px;cursor:pointer}
#radio button:hover{background:rgba(255,182,66,.15)}#radio .st{display:flex;align-items:center;gap:14px;margin-top:16px;padding:14px;border:1px solid rgba(255,182,66,.3)}
#radio .dial{flex:1}#radio .nm{font-size:20px;font-weight:700;letter-spacing:.08em}#radio .fq{opacity:.65;font-size:13px}
#radio .on{background:rgba(255,182,66,.85);color:#140c02}#radio .np{margin-top:14px;font-size:14px;line-height:1.6}#radio .np b{letter-spacing:.06em}
#radio .np small{opacity:.6}#radio .wave{display:flex;gap:3px;height:22px;align-items:flex-end;margin-top:10px}
#radio .wave i{width:5px;background:#ffb642;animation:rb 1s ease-in-out infinite alternate}#radio .off .wave i{animation:none;height:2px!important;opacity:.3}
@keyframes rb{from{height:3px}to{height:22px}}
</style>`
export function radioUi(ctx, player) {
  const s = player.state ?? {}; if (!s.radioOpen) return ''
  const air = onAir(ctx.now())
  const what = (seg) => seg.kind === 'host' ? `${esc(STATION.host)} · ${esc(seg.title)}` : `♪ ${esc(seg.title)}`
  const bars = Array.from({ length: 24 }, (_, i) => `<i style="animation-delay:-${((i * 37) % 100) / 100}s;height:${4 + (i * 7) % 18}px"></i>`).join('')
  return `${CSS}<div id="radio" data-modal tabindex="0" onkeydown="${escKeyHandler("sendAction('radio')")}"><section class="rp ${s.radioOn ? '' : 'off'}">
    <header><h1>RADIO</h1><span style="opacity:.6">HALOGEN · 1 station in range</span><button onclick="sendAction('radio')">Close</button></header>
    ${wristNav('radio')}
    <div class="st"><div class="dial"><div class="nm">${esc(STATION.name)}</div><div class="fq">${esc(STATION.freq)} · hosted by ${esc(STATION.host)}</div></div>
      <button class="${s.radioOn ? 'on' : ''}" onclick="sendAction('radio',{k:'power'})">${s.radioOn ? 'TUNED IN' : 'TUNE IN'}</button></div>
    <div class="np">${s.radioOn ? `<b>NOW</b> ${what(air.seg)}<br><small>NEXT · ${what(air.next)}</small>` : '<small>Static. Turn the dial to listen.</small>'}
      <div class="wave">${bars}</div></div>
  </section></div>`
}
