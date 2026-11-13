import { wristNav } from './lib/wrist-nav.js'
// The character sheet (K), the carry-weight chip and the creature read-out. All from player.state
// (written by scripts/stats.js): attr, skl, apts, spts, sheetOpen, target. Buttons send the 'stat' action.
import { GROUPS, tierOf, tierColor, repOf, karmaOf, karmaTitle, karmaColor, titleOf, titleColor, fameOf, infamyOf, megRank } from './lib/rep.js'
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import { ATTRS, SKILLS, ATTR_MAX, SKILL_MAX, attrsOf, skillsOf, spentOf, tagsOf, dmgMul, derived, carried, burden, handling, reqText } from './lib/stats.js'

const escT = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const FIG = `<svg viewBox="0 0 120 180" fill="none" stroke="#ffb347" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M38 30 L34 8 L50 22 M82 30 L86 8 L70 22"/><circle cx="60" cy="42" r="24"/>
<path d="M50 40 q3 -4 6 0 M64 40 q3 -4 6 0"/><path d="M55 52 q5 5 10 0"/><path d="M57 47 h6"/>
<path d="M46 66 q14 8 28 0 L80 110 q-20 6 -40 0 Z"/>
<path d="M46 74 L22 92 L14 82 M74 74 L96 54 L104 60"/><circle cx="14" cy="80" r="4"/><circle cx="105" cy="58" r="4"/>
<path d="M50 112 L46 160 L36 166 M70 112 L74 160 L84 166"/>
<path d="M80 104 q22 6 18 -18 q-2 -8 6 -10"/></svg>`
const pct = (v, m) => Math.max(0, Math.min(100, Math.round(100 * (v ?? m) / (m || 1))))
const hmL = (sec) => { const m = Math.ceil(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }
function statusPanel(s, maxHp, maxSan) {
  const bar = (lbl, v, pos) => `<div class="cb${v < 30 ? ' lo' : ''}" style="${pos}">${lbl}<i><u style="width:${v}%"></u></i></div>`
  const ef = []
  const b = s.smoothieBuff
  if (b) ef.push(`<div class="e"><span class="sw" style="background:${b.col || '#ff77b7'};color:${b.col || '#ff77b7'}"></span><div><b>${escT(b.name)}</b><div style="opacity:.8">${[b.hp ? `+${b.hp} HP` : '', b.san ? `+${b.san} SAN` : '', b.food ? 'keeps you fed' : ''].filter(Boolean).join(' · ') || escT(b.desc)}</div></div><span class="t">${hmL(b.left)}</span></div>`)
  if ((s.hunger ?? 100) < 25) ef.push(`<div class="e"><span class="sw" style="background:#ff8a5a;color:#ff8a5a"></span><div><b>Hungry</b><div style="opacity:.8">eat something</div></div></div>`)
  if ((s.thirst ?? 100) < 25) ef.push(`<div class="e"><span class="sw" style="background:#ff8a5a;color:#ff8a5a"></span><div><b>Thirsty</b><div style="opacity:.8">drink something</div></div></div>`)
  return `<div class="st"><div class="fig">${FIG}
${bar('HP', pct(s.hp, maxHp), 'left:0;top:14px')}${bar('SAN', pct(s.sanity, maxSan), 'right:0;top:14px')}
${bar('FOOD', pct(s.hunger, 100), 'left:0;top:120px')}${bar('WATER', pct(s.thirst, 100), 'right:0;top:120px')}
<div style="position:absolute;left:0;right:0;bottom:-4px;text-align:center;font-size:11px;letter-spacing:.14em;color:#ffcf87">· LEVEL ${s.level ?? 1} ·</div></div>
<div class="ef"><div class="sec" style="padding:0 0 4px">EFFECTS</div>${ef.join('') || '<div style="opacity:.6;padding:6px 0">Nothing active. Squeeze Play in the Bonus Room sells smoothies.</div>'}</div></div>`
}
const CSS = `<style>
#wt{position:fixed;left:22px;bottom:128px;font-size:11px;letter-spacing:.14em;color:#ffcf87;text-shadow:0 1px 3px #000;pointer-events:none;opacity:.85}
#wt.hv{color:#ff9a6a;opacity:1}
#wt.ov{color:#ff5a4a;opacity:1}
#tg{position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:60vw;top:36%;text-align:center;pointer-events:none;letter-spacing:.08em;padding:6px 12px 7px;background:oklch(0.16 0.02 78 / .82);border:1px solid #ffb34788;box-shadow:3px 3px 0 #000}
#tg b{font-size:15px;color:#ffe2a8}
#tg i{font-style:normal;margin-left:10px;color:#ffb347;font-size:12px}
#tg .bar{width:140px;height:5px;margin:4px auto 0;background:#0009;border:1px solid #ffb34766}
#tg .bar u{display:block;height:100%;background:#d9503a}
#tg .at{font-size:10.5px;opacity:.8;margin-top:5px;letter-spacing:.1em}
#tg .bar{width:160px;margin-top:6px}
@keyframes halRaise{0%{transform:translate(-50%,40%) perspective(900px) rotateX(38deg) scale(.82);opacity:0;filter:brightness(3) blur(3px)}55%{transform:translate(-50%,-52%) perspective(900px) rotateX(-4deg) scale(1.01);opacity:1;filter:brightness(1.6) blur(0)}72%{filter:brightness(.6)}78%{filter:brightness(1.4)}100%{transform:translate(-50%,-50%) perspective(900px) rotateX(0) scale(1);filter:none}}
@keyframes halRoll{0%{transform:translateY(-120%)}100%{transform:translateY(560%)}}
@keyframes halRows{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
#sh{animation:halRaise .55s cubic-bezier(.2,.9,.25,1) both}
#sh::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(rgba(0,0,0,.18) 0 1px,transparent 1px 3px);z-index:2}
#sh::after{content:"";position:absolute;left:0;right:0;top:0;height:18%;pointer-events:none;background:linear-gradient(transparent,rgba(255,190,90,.07),transparent);animation:halRoll 4s linear infinite;z-index:2}
#sh .row{animation:halRows .3s ease-out both}
#sh .row:nth-child(2){animation-delay:.04s}#sh .row:nth-child(3){animation-delay:.08s}#sh .row:nth-child(4){animation-delay:.12s}#sh .row:nth-child(5){animation-delay:.16s}#sh .row:nth-child(6){animation-delay:.2s}#sh .row:nth-child(7){animation-delay:.24s}#sh .row:nth-child(n+8){animation-delay:.28s}
#sh{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));max-height:calc(100vh - 40px);overflow:auto;background:linear-gradient(oklch(0.2 0.02 78 / .97),oklch(0.15 0.02 78 / .97));border:1px solid #ffb347;box-shadow:0 0 0 1px #000,6px 6px 0 #000;color:#ffcf87;pointer-events:auto;font-family:inherit}
#sh .hd{display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid #ffb34755}
#sh h2{margin:0;font-size:19px;letter-spacing:.2em;color:#ffb347;flex:1;text-shadow:0 0 6px rgba(255,170,40,.6)}
#sh .pt{font-size:12px;letter-spacing:.1em}
#sh .pt b{color:#ffe2a8;font-size:15px}
#sh .cols{display:grid;grid-template-columns:1fr 1fr;gap:0}
#sh .col{padding:10px 16px 14px}
#sh .col+.col{border-left:1px solid #ffb34744}
#sh .sec{font-size:10.5px;letter-spacing:.2em;opacity:.75;margin:2px 0 8px}
#sh .row{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dotted #ffb34733}
#sh .row .n{flex:1}
#sh .row .n small{display:block;font-size:10.5px;opacity:.6;letter-spacing:.04em}
#sh .row .v{width:44px;text-align:right;font-size:17px;color:#ffe2a8}
#sh .pips{display:flex;gap:2px}
#sh .pips i{width:7px;height:11px;background:#ffb34730}
#sh .pips i.on{background:#ffb347}
#sh button{font:inherit;font-size:14px;width:26px;height:26px;padding:0;color:#16140e;background:#ffb347;border:1px solid #fff3d6;cursor:pointer}
#sh button:disabled{opacity:.25;cursor:default}
#sh .dv{display:grid;grid-template-columns:1fr 1fr;gap:3px 14px;font-size:12px;padding:8px 16px 12px;border-top:1px solid #ffb34744}
#sh .dv span b{color:#ffe2a8;float:right}
#sh .ft{display:flex;justify-content:flex-end;padding:8px 16px;border-top:1px solid #ffb34755}
#sh .ft button{width:auto;padding:0 14px;height:30px;letter-spacing:.1em}
#sh .st{display:grid;grid-template-columns:260px 1fr;gap:14px;padding:10px 16px;border-bottom:1px solid #ffb34744}
#sh .fig{position:relative;height:190px}
#sh .fig svg{position:absolute;left:50%;top:6px;width:120px;height:180px;margin-left:-60px;filter:drop-shadow(0 0 4px #ffb34788)}
#sh .cb{position:absolute;width:62px;font-size:9px;letter-spacing:.12em;color:#ffcf87}
#sh .cb i{display:block;height:6px;margin-top:2px;background:#ffb34733;box-shadow:inset 0 0 0 1px #ffb34799}
#sh .cb i u{display:block;height:100%;background:#ffb347;box-shadow:0 0 6px #ffb347}
#sh .cb.lo i u{background:#ff8a5a}
#sh .ef{font-size:12px}
#sh .ef .e{display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px dashed #ffb34733}
#sh .ef .e b{color:#ffe2a8}
#sh .ef .e .t{margin-left:auto;opacity:.75;font-size:11px}
#sh .ef .sw{width:10px;height:10px;flex:none;box-shadow:0 0 6px currentColor}
@keyframes figBob{50%{transform:translateY(-2px)}}
#sh .fig svg{animation:figBob 2.6s ease-in-out infinite}
@media (max-width:640px){#sh .st{grid-template-columns:1fr}}
@media (max-width:640px){#sh .cols{grid-template-columns:1fr}#sh .col+.col{border-left:0;border-top:1px solid #ffb34744}}
</style>`


export function statsUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null || s.attr == null) return ''
  let out = CSS
  const cap = derived(s).carry, kg = carried(s)
  if (s.target && !s.sheetOpen) {
    const t = s.target
    out += `<div id="tg"><b>${t.title ? escT(t.title) + ' ' : ''}${escT(t.name)}</b>${t.info ? `<i>${escT(t.info)}</i>` : ''}${t.hp >= 0 ? `<div class="bar"><u style="width:${Math.max(0, Math.min(100, (t.hp / (t.mx || 1)) * 100))}%"></u></div>` : ''}${t.attr ? `<div class="at">${ATTRS.map((a, i) => `${a.short} ${t.attr.split(',')[i]}`).join(' · ')}</div>` : ''}</div>`
  }
  if (!s.sheetOpen) return out
  const at = attrsOf(s), sk = skillsOf(s), sp = spentOf(s), d = derived(s), apts = s.apts ?? 0, spts = s.spts ?? 0
  const attrRows = ATTRS.map((a, i) => `<div class="row"><div class="n">${a.name}<small>${a.info}</small></div><div class="pips">${Array.from({ length: ATTR_MAX }, (_, q) => `<i class="${q < at[a.k] ? 'on' : ''}"></i>`).join('')}</div><div class="v">${at[a.k]}</div>${s.creating ? `<button ${at[a.k] > 1 ? '' : 'disabled'} onclick="sendAction('stat',{k:'attrDown',i:${i}})">&minus;</button>` : ''}<button ${apts > 0 && at[a.k] < ATTR_MAX ? '' : 'disabled'} onclick="sendAction('stat',{k:'attr',i:${i}})">+</button></div>`).join('')
  const tg = tagsOf(s), tl = s.tagsLeft ?? 0
  const skillRows = SKILLS.map((k, i) => `<div class="row"><div class="n">${tg.includes(k.k) ? '<b style="color:#ffe2a8">★ </b>' : ''}${k.name}<small>${k.info}</small></div><div class="v">${sk[k.k]}</div>${tl > 0 && !tg.includes(k.k) ? `<button style="width:34px;font-size:10px" onclick="sendAction('stat',{k:'tag',i:${i}})">TAG</button>` : ''}<button ${spts > 0 && sk[k.k] < SKILL_MAX ? '' : 'disabled'} onclick="sendAction('stat',{k:'skill',i:${i}})">+</button></div>`).join('')
  const slow = burden(s) < 1
  const wp = W[s.equipped] ?? W.fists
  const dam = (w) => Math.round((w.damage + (s.level - 1) * L.perLevel.damage * (w.levelScale ?? 1)) * dmgMul(s, w))
  out += `<div id="sh" data-modal>
    <div class="hd"><h2>${s.creating ? 'Create character' : `Character · Level ${s.level}`}</h2>${s.creating ? `<div class="pt" style="color:#ffe2a8">LOWER ONE TO RAISE ANOTHER · TAG ${s.tagsLeft ?? 0} SKILLS</div>` : (apts > 0 || spts > 0) ? `<div class="pt" style="color:#ffe2a8;">Points available</div><style>@keyframes halBlink{50%{opacity:.3}}</style>` : ""}<div class="pt">ATTRIBUTE POINTS <b>${apts}</b></div><div class="pt">SKILL POINTS <b>${spts}</b></div>${tl > 0 ? `<div class="pt">TAG <b>${tl}</b> MORE</div>` : ''}</div>
    ${s.creating ? '' : wristNav('sheet')}
    ${s.creating ? '' : statusPanel(s, L.hp + (s.level - 1) * L.perLevel.hp + d.hpBonus, L.sanity + (s.level - 1) * L.perLevel.sanity + d.sanBonus)}
    <div class="cols"><div class="col"><div class="sec">ATTRIBUTES</div>${attrRows}</div><div class="col"><div class="sec">SKILLS</div>${skillRows}</div></div>
    <div class="dv">
      <span>Max HP <b>${L.hp + (s.level - 1) * L.perLevel.hp + d.hpBonus}</b></span><span>Max sanity <b>${L.sanity + (s.level - 1) * L.perLevel.sanity + d.sanBonus}</b></span>
      <span>Carry weight <b>${kg.toFixed(1)} / ${Number.isFinite(cap) ? cap : "∞"} kg${slow ? ' (slowed)' : ''}</b></span><span>Stamina <b>${Math.round(d.staMax)}</b></span>
      <span>Karma <b style="color:${karmaColor(karmaOf(s))}">${karmaTitle(karmaOf(s))} (${karmaOf(s)})</b></span>${Object.keys(GROUPS).map((g) => `<span>${GROUPS[g].name} <b style="color:${titleColor(s, g)}">${titleOf(s, g)}</b>${g === 'meg' && s.megMember ? ' <b style="color:#b6e04a">· Volunteer</b>' : ''}${g === 'meg' && megRank(s) ? ` <b style="color:#b6e04a">· ${megRank(s)} standing</b>` : ''} <i style="opacity:.7;font-style:normal">fame ${fameOf(s, g)} · infamy ${infamyOf(s, g)}</i></span>`).join('')}
      ${s.repHistory?.length ? `<span><b>Recent faction changes</b></span>${s.repHistory.slice().reverse().map((h) => `<span>${escT(GROUPS[h.group]?.name ?? h.group)} · ${escT(h.kind)} +${escT(h.amount)} <small>${escT(h.reason)}</small></span>`).join('')}` : ''}
      <span>Damage resist <b>DR ${d.dr}</b></span><span>Clothes find <b>×${d.clothFind.toFixed(2)}</b></span>
      <span>${wp.name} DAM <b>${dam(wp)}</b></span><span>DPS <b>${Math.round(dam(wp) * (wp.pellets ? 1 : 1) / (wp.cooldown * (wp.ranged ? 1 : d.swing)))}</b></span>
      ${wp.req ? `<span>${wp.name} needs <b>${reqText(wp)}</b></span><span>${handling(s, wp).notes.length ? `<b style="color:#ff9a8a">${handling(s, wp).notes.join(' · ')}</b>` : 'You can handle it'}${wp.ranged ? ` · spread ×${handling(s, wp).spread.toFixed(2)} · kick ×${handling(s, wp).recoil.toFixed(2)}` : ''}</span>` : ''}
      <span>Unarmed DAM <b>${dam(W.fists)}</b></span><span>Crit chance <b>${Math.round(d.crit * 100)}%</b></span>
      ${wp.ranged ? `<span>Reload <b>${(wp.reloadTime ?? (wp.reloadStart + wp.reloadShell * wp.magSize)).toFixed(1) * 1 && ((wp.reloadTime ?? (wp.reloadStart + wp.reloadShell * wp.magSize)) * d.reload).toFixed(1)} s</b></span>` : `<span>Swing <b>${(wp.cooldown * d.swing).toFixed(2)} s</b></span>`}<span>Find chance <b>${Math.round(d.scav * 100)}%</b></span><span>${wp.name} condition <b>${Math.round(s['cnd_' + s.equipped] ?? 100)}%</b></span>
    </div>
    <div class="ft"><button style="color:#16140e" ${s.creating && (apts > 0 || (s.tagsLeft ?? 0) > 0) ? 'disabled' : ''} onclick="sendAction('stat',{k:'close'})">${s.creating ? 'DONE' : 'CLOSE (K)'}</button></div>
  </div>`
  return out
}
