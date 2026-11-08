// Spamton's arena HUD (places/spamton): his health across the top, his taunts, and when he stops to talk, his line with
// SPARE (lit after enough talks) and KEEP FIGHTING. Reads ctx.place.state.spam, written by scripts/spamton-boss.js.
import F from './lib/data/spamton.yml'
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const links = (t) => esc(t).replace(/\[\[(.+?)\]\]/g, '<span style="color:#ffe14d">[[$1]]</span>')

export function spamArenaUi(ctx, player) {
  const b = ctx.place?.state?.spam
  if (!b || player?.place && player.place !== 'spamton') return ''
  const pct = Math.max(0, Math.min(100, (b.hp / (b.max || 1)) * 100)), now = ctx.now()
  const talk = b.phase === 'talk', need = b.need ?? F.arena.spareAfter, talks = b.talks ?? 0
  const showLine = b.line && (talk || b.over || b.phase === 'intro' || now - (b.lineAt ?? 0) < 4000)
  const showTaunt = !talk && !b.over && b.taunt && now - (b.tauntAt ?? 0) < 1800
  const font = "font-family:'Determination Mono','Courier New',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase"
  return `
<div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);width:min(520px,calc(100vw - 150px));${font};color:#fff;text-align:center;pointer-events:none">
  <div style="font-size:14px;text-shadow:0 0 6px #ff2bd0">SPAMTON G. SPAMTON <span style="color:#ffe14d">[[$$ ${Math.round(b.hp ?? 0)} $$]]</span></div>
  <div style="height:12px;margin-top:4px;background:#3a0030;border:2px solid #fff;position:relative"><div style="position:absolute;inset:0;width:${pct}%;background:linear-gradient(90deg,#ff2bd0,#ffe14d)"></div></div>
  <div style="font-size:11px;margin-top:3px;color:${talks >= need ? '#7fe39a' : '#ff9adf'}">${talks >= need ? 'HE MIGHT TAKE A [[DEAL]] NOW · WAIT FOR HIM TO TALK' : `LISTEN TO HIM · ${talks}/${need} TALKS`}</div>
  ${showTaunt ? `<div style="margin-top:8px;font-size:18px;color:#ffe14d;text-shadow:0 0 8px #ff2bd0">${links(b.taunt)}</div>` : ''}
</div>
${showLine ? `<div ${talk ? 'data-modal' : ''} style="position:absolute;left:50%;bottom:${talk ? 70 : 110}px;transform:translateX(-50%);width:min(620px,calc(100vw - 150px));${font};pointer-events:${talk ? 'auto' : 'none'}">
  <div style="background:#000;border:4px solid #fff;padding:12px 16px;color:#fff;font-size:16px;line-height:1.4">${links(b.line)}</div>
  ${talk ? `<div style="display:flex;gap:12px;justify-content:center;margin-top:10px;flex-wrap:wrap">
    <button onclick="sendAction('spam',{k:'spare'})" ${talks >= need ? '' : 'disabled'} style="background:#000;color:${talks >= need ? '#ffe14d' : '#666'};border:3px solid ${talks >= need ? '#ffe14d' : '#444'};padding:8px 18px;font:inherit;font-size:16px;cursor:${talks >= need ? 'pointer' : 'default'}">❤ SPARE${talks >= need ? '' : ` (${talks}/${need})`}</button>
    <button onclick="sendAction('spam',{k:'fight'})" style="background:#000;color:#ff9a1f;border:3px solid #ff9a1f;padding:8px 18px;font:inherit;font-size:16px;cursor:pointer">KEEP FIGHTING</button>
  </div>` : ''}
</div>` : ''}
${!b.over ? `<button onclick="sendAction('spam',{k:'leave'})" style="position:absolute;right:70px;bottom:150px;background:rgba(0,0,0,.5);border:2px solid #555;color:#aaa;${font};font-size:11px;padding:4px 10px;pointer-events:auto;cursor:pointer">BACK OUT</button>` : ''}`
}
