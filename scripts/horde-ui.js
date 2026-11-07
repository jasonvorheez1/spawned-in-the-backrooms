// The blackout HUD: the countdown, the red tint and kill count while the lights are out, the result. From player.state (scripts/horde.js).
const CSS = `<style>
#hd{position:fixed;left:50%;top:82px;transform:translateX(-50%);text-align:center;pointer-events:none;text-shadow:0 1px 4px #000,0 0 12px #000;letter-spacing:.16em;font-family:'Geist Pixel Square',ui-monospace,monospace;z-index:40;max-width:min(640px,calc(100vw - 40px))}
#hd .banner{background:oklch(0.14 0.02 70 / .92);border:2px solid;padding:10px 22px 9px;box-shadow:0 6px 20px rgba(0,0,0,.75);display:inline-block}
#hd b{display:block;font-size:20px;line-height:1.2}
#hd small{display:block;font-size:11.5px;opacity:.9;margin-top:5px;letter-spacing:.09em;text-transform:uppercase}
#hd.w .banner{border-color:#ffb347;color:#ffcf87;box-shadow:0 0 18px rgba(255,179,71,.25),0 8px 24px #000}
#hd.w b{animation:hdp 1.2s steps(2) infinite}
#hd.n .banner{border-color:#ff4a36;color:#ff7d6b;box-shadow:0 0 24px rgba(255,74,54,.35),0 8px 28px #000}
#hd.n b{text-shadow:0 0 12px #ff4a36}
#hd.r .banner{border-color:#7fcf6a;color:#d5ffd0;box-shadow:0 0 20px rgba(127,207,106,.3),0 8px 24px #000}
@keyframes hdp{50%{opacity:.45}}
@keyframes horde-beat{0%,100%{opacity:.7}50%{opacity:.98}}
#hv{position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 180px 50px rgba(160,15,0,.65);background:rgba(12,2,0,.32);animation:horde-beat 2.2s ease-in-out infinite;z-index:35}
</style>`
const fmt = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

export function hordeUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now()
  if (s.horde === 'warn') return CSS + `<div id="hd" class="w"><div class="banner"><b>⚠ BLACKOUT IN ${fmt(s.hordeIn ?? 0)} ⚠</b><small>Reinforce your base · Stock ammo · Get to high ground</small></div></div>`
  if (s.horde === 'night') return CSS + `<div id="hv"></div><div id="hd" class="n"><div class="banner"><b>⚠ TOTAL BLACKOUT IN PROGRESS ⚠</b><small>${s.hordeAlive ? s.hordeAlive + ' entities hunting you' : 'They are gathering in the dark...'}</small></div></div>`
  if (s.hordeResult && now - s.hordeResult.at < 7000) return CSS + `<div id="hd" class="r"><div class="banner"><b>${s.hordeResult.text}</b>${s.hordeResult.sub ? `<small>${s.hordeResult.sub}</small>` : ''}</div></div>`
  return ''
}
