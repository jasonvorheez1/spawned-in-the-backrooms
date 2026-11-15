// The HALOGEN's Radio tab: every station in scripts/lib/radio.js, one tuned at a time.
// Wears the journal's frame (scripts/lib/ui-theme.js styles :is(#journal,#radio) .journal-panel) so every wrist tab reads as one device.
import { wristNav } from './lib/wrist-nav.js'
import { onAir, STATIONS, stationOf } from './lib/radio.js'
import { escKeyHandler } from './lib/ui-kit.js'
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const CSS = `<style>
#radio .rb{flex:1;overflow:auto;padding:18px 22px;display:flex;flex-direction:column;gap:16px}
#radio .st{display:flex;align-items:center;gap:16px;padding:14px 16px;border:1px solid var(--ui-line);background:#ffffff06}
#radio .dial{flex:1;min-width:0}#radio .nm{font:500 22px var(--ui-display)}#radio .fq{color:var(--ui-muted);font-size:12px;margin-top:2px}
#radio .tune[aria-pressed=true]{background:var(--ui-accent);color:var(--ui-bg);border-color:var(--ui-accent)}
#radio .st.on{border-color:var(--ui-accent)}#radio .np{line-height:1.6}#radio .np .k{color:var(--ui-muted);font-size:11px;letter-spacing:.08em;margin-right:8px}
#radio .wave{display:flex;gap:3px;height:22px;align-items:flex-end}
#radio .wave i{width:5px;background:var(--ui-accent);opacity:.8;transform-origin:bottom;animation:rb 1s ease-in-out infinite alternate}
#radio .off .wave i{animation:none;transform:scaleY(.1);opacity:.3}
@keyframes rb{from{transform:scaleY(.15)}to{transform:scaleY(1)}}
</style>`
export function radioUi(ctx, player) {
  const s = player.state ?? {}; if (!s.radioOpen) return ''
  const cur = stationOf(s.radioSt), air = onAir(ctx.now(), cur)
  const what = (seg) => seg.kind === 'host' ? `${esc(cur.host)} · ${esc(seg.title)}` : 'Music' // no song names on the dial (Shelly, Nov 15: "remove the song names in radios")
  const bars = Array.from({ length: 28 }, (_, i) => `<i style="height:22px;animation-delay:-${((i * 37) % 100) / 100}s"></i>`).join('')
  const dial = (st) => { const on = !!s.radioOn && cur.key === st.key
    return `<div class="st ${on ? 'on' : ''}"><div class="dial"><div class="nm">${esc(st.name)}</div><div class="fq">${esc(st.freq)} · hosted by ${esc(st.host)}</div></div>
      <button class="tune" aria-pressed="${on}" onclick="sendAction('radio',{k:'tune',st:${st.key}})">${on ? 'Tuned in' : 'Tune in'}</button></div>` }
  return `${CSS}<div id="radio" data-modal tabindex="0" onkeydown="${escKeyHandler("sendAction('radio')")}"><section class="journal-panel ${s.radioOn ? '' : 'off'}" aria-labelledby="radio-title">
    <header class="journal-header"><h1 id="radio-title">Radio</h1><span>${STATIONS.length} stations in range</span><button class="journal-close" onclick="sendAction('radio')">Close <kbd>Esc</kbd></button></header>
    ${wristNav('radio')}
    <div class="rb">
      ${STATIONS.map(dial).join('')}
      <div class="np">${s.radioOn ? `<div><span class="k">NOW</span>${what(air.seg)}</div><div style="color:var(--ui-muted)"><span class="k">NEXT</span>${what(air.next)}</div>` : '<div style="color:var(--ui-muted)">Static. Tune in to listen.</div>'}</div>
      <div class="wave">${bars}</div>
    </div>
  </section></div>`
}
