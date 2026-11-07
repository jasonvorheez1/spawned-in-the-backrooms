// The blackout HUD: the countdown, the red tint and kill count while the lights are out, the result. From player.state (scripts/horde.js).
const CSS = `<style>
#hd{position:fixed;left:50%;top:92px;transform:translateX(-50%);text-align:center;pointer-events:none;text-shadow:0 1px 4px #000,0 0 10px #000;letter-spacing:.18em}
#hd b{display:block;font-size:22px;color:#ffcf87}
#hd small{display:block;font-size:12px;opacity:.85;margin-top:3px;letter-spacing:.1em}
#hd.w b{animation:hdp 1s steps(2) infinite}
#hd.n b{color:#ff6a5a}
@keyframes hdp{50%{opacity:.35}}
#hv{position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 160px 40px rgba(120,10,0,.55);background:rgba(0,0,0,.22)}
</style>`
const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

export function hordeUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now()
  if (s.horde === 'warn') return CSS + `<div id="hd" class="w"><b>BLACKOUT IN ${fmt(s.hordeIn ?? 0)}</b><small>Reinforce your base. Stock ammo. Get to high ground.</small></div>`
  if (s.horde === 'night') return CSS + `<div id="hv"></div><div id="hd" class="n"><b>BLACKOUT</b><small>${s.hordeAlive ? s.hordeAlive + ' coming for you' : 'They are gathering...'}</small></div>`
  if (s.hordeResult && now - s.hordeResult.at < 7000) return CSS + `<div id="hd"><b>${s.hordeResult.text}</b>${s.hordeResult.sub ? `<small>${s.hordeResult.sub}</small>` : ''}</div>`
  return ''
}
