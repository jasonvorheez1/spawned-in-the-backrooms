// The character sheet (K), the carry-weight chip and the creature read-out. All from player.state
// (written by scripts/stats.js): attr, skl, apts, spts, sheetOpen, target. Buttons send the 'stat' action.
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import { ATTRS, SKILLS, ATTR_MAX, SKILL_MAX, attrsOf, skillsOf, spentOf, tagsOf, dmgMul, derived, carried, burden } from './lib/stats.js'

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
@media (max-width:640px){#sh .cols{grid-template-columns:1fr}#sh .col+.col{border-left:0;border-top:1px solid #ffb34744}}
</style>`


export function statsUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null || s.attr == null) return ''
  let out = CSS
  const cap = derived(s).carry, kg = carried(s)
  if (s.target && !s.sheetOpen) {
    const t = s.target
    out += `<div id="tg"><b>${t.title ? t.title + ' ' : ''}${t.name}</b>${t.info ? `<i>${t.info}</i>` : ''}${t.hp >= 0 ? `<div class="bar"><u style="width:${Math.max(0, Math.min(100, (t.hp / (t.mx || 1)) * 100))}%"></u></div>` : ''}${t.attr ? `<div class="at">${ATTRS.map((a, i) => `${a.short} ${t.attr.split(',')[i]}`).join(' · ')}</div>` : ''}</div>`
  }
  if (!s.sheetOpen) return out
  const at = attrsOf(s), sk = skillsOf(s), sp = spentOf(s), d = derived(s), apts = s.apts ?? 0, spts = s.spts ?? 0
  const attrRows = ATTRS.map((a, i) => `<div class="row"><div class="n">${a.name}<small>${a.info}</small></div><div class="pips">${Array.from({ length: ATTR_MAX }, (_, q) => `<i class="${q < at[a.k] ? 'on' : ''}"></i>`).join('')}</div><div class="v">${at[a.k]}</div><button ${apts > 0 && at[a.k] < ATTR_MAX ? '' : 'disabled'} onclick="sendAction('stat',{k:'attr',i:${i}})">+</button></div>`).join('')
  const tg = tagsOf(s), tl = s.tagsLeft ?? 0
  const skillRows = SKILLS.map((k, i) => `<div class="row"><div class="n">${tg.includes(k.k) ? '<b style="color:#ffe2a8">★ </b>' : ''}${k.name}<small>${k.info}</small></div><div class="v">${sk[k.k]}</div>${tl > 0 && !tg.includes(k.k) ? `<button style="width:34px;font-size:10px" onclick="sendAction('stat',{k:'tag',i:${i}})">TAG</button>` : ''}<button ${spts > 0 && sk[k.k] < SKILL_MAX ? '' : 'disabled'} onclick="sendAction('stat',{k:'skill',i:${i}})">+</button></div>`).join('')
  const slow = burden(s) < 1
  const wp = W[s.equipped] ?? W.fists
  const dam = (w) => Math.round((w.damage + (s.level - 1) * L.perLevel.damage * (w.levelScale ?? 1)) * dmgMul(s, w))
  out += `<div id="sh" data-modal>
    <div class="hd"><h2>HALOGEN · LEVEL ${s.level}</h2><div class="pt">ATTRIBUTE POINTS <b>${apts}</b></div><div class="pt">SKILL POINTS <b>${spts}</b></div>${tl > 0 ? `<div class="pt">TAG <b>${tl}</b> MORE</div>` : ''}</div>
    <div class="cols"><div class="col"><div class="sec">ATTRIBUTES</div>${attrRows}</div><div class="col"><div class="sec">SKILLS</div>${skillRows}</div></div>
    <div class="dv">
      <span>Max HP <b>${L.hp + (s.level - 1) * L.perLevel.hp + d.hpBonus}</b></span><span>Max sanity <b>${L.sanity + (s.level - 1) * L.perLevel.sanity + d.sanBonus}</b></span>
      <span>Carry weight <b>${kg.toFixed(1)} / ${cap} kg${slow ? ' (slowed)' : ''}</b></span><span>Stamina <b>${Math.round(d.staMax)}</b></span>
      <span>${wp.name} DAM <b>${dam(wp)}</b></span><span>DPS <b>${Math.round(dam(wp) * (wp.pellets ? 1 : 1) / (wp.cooldown * (wp.ranged ? 1 : d.swing)))}</b></span>
      <span>Unarmed DAM <b>${dam(W.fists)}</b></span><span>Crit chance <b>${Math.round(d.crit * 100)}%</b></span>
      ${wp.ranged ? `<span>Reload <b>${(wp.reloadTime ?? (wp.reloadStart + wp.reloadShell * wp.magSize)).toFixed(1) * 1 && ((wp.reloadTime ?? (wp.reloadStart + wp.reloadShell * wp.magSize)) * d.reload).toFixed(1)} s</b></span>` : `<span>Swing <b>${(wp.cooldown * d.swing).toFixed(2)} s</b></span>`}<span>Find chance <b>${Math.round(d.scav * 100)}%</b></span><span>${wp.name} condition <b>${Math.round(s['cnd_' + s.equipped] ?? 100)}%</b></span>
    </div>
    <div class="ft"><button style="color:#16140e" onclick="sendAction('stat',{k:'close'})">CLOSE (K)</button></div>
  </div>`
  return out
}
