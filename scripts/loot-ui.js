// The looting HUD and the inventory, after Shelly's Fallout NV reference (#1134): amber lines on dark, one list on the
// left, the hovered item's numbers on the right (the equipped weapon / first item when nothing is hovered).
// player.state: focus, lootOpen, lootName, lootList, notice (scripts/interact.js); invOpen, weapons, equipped,
// almonds, ammo, shells (scripts/player.js). Loot buttons send 'loot' {k:'take',i}|{k:'all'}|{k:'close'};
// inventory buttons send 'inv' {k:'equip',w}|{k:'drop',w}|{k:'drink'}|{k:'close'}|{k:'wear',w:cloth token}|{k:'unwear',w:slot}.
import AW from './lib/data/almond.yml'
import { describe, itemsOf, MEAT } from './lib/items.js'
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'

const CSS = `<style>
.pb{--a:#ffb642;--ad:rgba(255,182,66,.45);--al:rgba(255,182,66,.22);color:var(--a);font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;text-transform:uppercase;text-shadow:0 0 2px rgba(255,160,30,.45)}
#lp{position:fixed;inset-inline:0;top:57%;display:flex;flex-direction:column;align-items:center;pointer-events:none}
#lp .nm{font-size:17px;display:flex;align-items:center;gap:8px;text-shadow:0 1px 2px #000,0 0 2px rgba(255,160,30,.45)}
#lp .key{display:inline-block;min-width:18px;padding:0 4px;border:1px solid var(--a);font-size:12px;text-align:center}
#lp .in{font-size:12px;opacity:.8;margin-top:2px;text-shadow:0 1px 2px #000,0 0 3px #000}
#ln{position:fixed;inset-inline:0;top:66%;display:flex;justify-content:center;pointer-events:none}
#ln span{padding:3px 12px;background:rgba(10,7,2,.92);border-left:2px solid var(--a);border-right:2px solid var(--a);font-size:12px}
.pbw{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;background:radial-gradient(ellipse at center,rgba(0,0,0,.55),rgba(0,0,0,.25) 70%)}
.pbp{pointer-events:auto;position:relative;background:rgba(10,7,2,.94);padding:14px 20px 12px;width:min(760px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));min-height:300px;max-height:min(520px,84vh);box-sizing:border-box;display:flex;flex-direction:column}
.hd{display:flex;align-items:flex-end;gap:14px;position:relative;padding:0 10px 5px;border-bottom:2px solid var(--a)}
.hd::before,.hd::after{content:'';position:absolute;bottom:-2px;width:2px;height:10px;background:var(--a);transform:translateY(100%)}
.hd::before{left:0}.hd::after{right:0}
.hd h2{font-size:22px;margin:0;font-weight:400;letter-spacing:.04em}
.hd .st{margin-left:auto;display:flex;gap:16px;font-size:13px}
.hd .st b{font-weight:400;color:var(--ad);margin-right:5px}
.bd{display:flex;gap:22px;flex:1;min-height:0;padding:12px 10px 8px}
.ls{flex:0 0 52%;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin;scrollbar-color:var(--ad) transparent}
.sec{font-size:11px;color:var(--ad);margin:8px 0 3px;letter-spacing:.08em}
.sec:first-child{margin-top:0}
.it{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;padding:3px 8px;background:none;border:1px solid transparent;color:inherit;font:inherit;font-size:16px;text-align:left;text-transform:inherit;text-shadow:inherit;cursor:default}
button.it{cursor:pointer}
.it:hover{border-color:var(--a)}
.it .eq{width:9px;height:9px;flex:none;border:1px solid transparent}
.it.on .eq{background:var(--a)}
.it .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.it .n{margin-left:auto;color:var(--ad);font-size:13px;flex:none}
.ft{flex-wrap:wrap}
.it.lock{color:var(--ad)}
.dt{display:none;position:absolute;right:30px;top:62px;width:calc(48% - 52px);pointer-events:none}
.it:hover .dt,.def{display:block}
.pbp:has(.ls .it:hover) .def{display:none}
.dt h4{font-size:18px;font-weight:400;margin:0 0 2px;white-space:normal}
.dt .r{font-size:11px;letter-spacing:.08em;margin-bottom:10px}
.g{display:grid;grid-template-columns:1fr 1fr;column-gap:12px}
.g div{display:flex;justify-content:space-between;font-size:14px;padding:4px 2px 3px;border-bottom:1px solid var(--al)}
.g div span{color:var(--ad)}
.g .w{grid-column:1/3}
.up{color:#9ee08a}.dn{color:#e07a5a}
.ft{display:flex;align-items:center;gap:18px;padding:6px 10px 0;border-top:2px solid var(--a);font-size:13px;position:relative}
.ft::before,.ft::after{content:'';position:absolute;top:-2px;width:2px;height:10px;background:var(--a);transform:translateY(-100%)}
.ft::before{left:0}.ft::after{right:0}
.ft button{font:inherit;text-transform:inherit;text-shadow:inherit;color:var(--a);background:none;border:none;padding:2px 0;cursor:pointer}
.ft button:hover{text-decoration:underline;text-underline-offset:3px}
.ft kbd{font-family:inherit;font-size:11px;border:1px solid var(--a);padding:0 4px;margin-right:6px}
.ft .c{color:var(--ad);margin-right:auto;font-size:12px}
.em{color:var(--ad);font-size:14px;padding:6px 8px}
@media (max-width:560px){.ls{flex:1 1 auto}.dt,.def{display:none!important}.hd .st{display:none}}
</style>`

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',').filter(Boolean) : [])]
import { derived as dv } from './lib/stats.js'
import { parseCloth, wornTokens, wornDR, fullLook, SLOTS, SLOT_NAME, rowOf, CLOTHES } from './lib/clothes.js'
const worn = (s, slot) => { const l = fullLook(s.look), c = CLOTHES.colourKey[slot]; return rowOf(slot, l[slot], c ? l[c] : '') }
const maxHp = (lv, s) => L.hp + (lv - 1) * L.perLevel.hp + (s?.attr ? dv(s).hpBonus : 0)
const maxSan = (lv, s) => L.sanity + (lv - 1) * L.perLevel.sanity + (s?.attr ? dv(s).sanBonus : 0)
const cell = (k, v, wide) => `<div${wide ? ' class="w"' : ''}><span>${k}</span>${v}</div>`

// the right-hand pane for one item token; s = the player's state (to compare against what they hold)
function detail(t, s, def) {
  const cls = `dt${def ? ' def' : ''}`
  if (t.startsWith('weapon:') || W[t]?.damage != null) {
    const k = t.startsWith('weapon:') ? t.slice(7) : t, w = W[k]
    if (!w) return ''
    const r = W.rarities?.[w.rarity], cur = W[s.equipped] ?? W.fists, d = w.damage - cur.damage
    const cmp = k !== (s.equipped ?? 'fists') && d ? ` <i class="${d > 0 ? 'up' : 'dn'}" style="font-style:normal">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</i>` : ''
    const lvOk = true
    return `<div class="${cls}"><h4>${w.name}</h4><div class="r" style="color:${r?.color ?? 'var(--ad)'}">${r?.label ?? 'STANDARD'}${w.ranged ? ' · FIREARM' : ' · MELEE'}</div><div class="g">
      ${cell('DAM', `${w.damage}${cmp}`)}${cell('SPD', `${(1 / w.cooldown).toFixed(1)}/S`)}
      ${cell(w.ranged ? 'RNG' : 'REACH', `${w.ranged ? w.range : w.reach}M`)}${cell('AP', w.stamina)}
      ${w.ranged ? cell('MAG', `${s['loaded_' + k] ?? 0}/${w.magSize}`) + cell(w.ammoType === 'shells' ? 'SHELLS' : 'ROUNDS', s[w.ammoType ?? 'ammo'] ?? 0) : ''}
</div></div>`
  }
  if (t.startsWith('cloth:')) { // a garment: its DR against what's worn in that slot now
    const p = parseCloth(t); if (!p) return ''
    const r = CLOTHES.rarity[p.row.rarity] ?? {}, cur = worn(s, p.slot), d = p.row.dr - (cur?.dr ?? 0)
    const cmp = d ? ` <i class="${d > 0 ? 'up' : 'dn'}" style="font-style:normal">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</i>` : ''
    return `<div class="${cls}"><h4>${p.row.name}</h4><div class="r" style="color:${r.color ?? 'var(--ad)'}">${(r.label ?? '').toUpperCase()} · APPAREL</div><div class="g">
      ${cell('DR', `${p.row.dr}${cmp}`)}${cell('SLOT', SLOT_NAME[p.slot].toUpperCase())}${cell('WG', `${p.row.kg}KG`)}${cell('COLOR', `<span style="display:inline-block;width:12px;height:12px;background:#${p.colour};border:1px solid var(--ad)"></span>`)}
      ${cell('WORN', cur ? `${cur.name} · DR ${cur.dr}` : 'NOTHING', true)}</div></div>`
  }
  if (t.startsWith('almond:')) { const c = t.slice(7), a = AW[c], key = { grey: 'almonds', green: 'almondsG', red: 'almondsR', blue: 'almondsB' }[c]
    return `<div class="${cls}"><h4>${a.name}</h4><div class="r" style="color:${a.color}">AID</div><div class="g">${cell('HP', `+${a.hp}`)}${cell('SAN', `+${a.sanity}`)}${cell('CARRIED', s[key] ?? 0)}${cell('NOTE', a.note, true)}</div></div>` }
  if (t === 'almond') return `<div class="${cls}"><h4>Almond water</h4><div class="r" style="color:var(--ad)">AID</div><div class="g">${cell('HP', `+${L.almondHp}`)}${cell('SAN', `+${L.almondSanity}`)}${cell('CARRIED', s.almonds ?? 0, true)}</div></div>`
  if (t === 'ammo' || t === 'shells') {
    const a = W[t], nm = t === 'ammo' ? 'Pistol rounds' : 'Shotgun shells'
    return `<div class="${cls}"><h4>${nm}</h4><div class="r" style="color:var(--ad)">AMMO</div><div class="g">${cell('QTY', `+${a.perPickup}`)}${cell('FOR', t === 'ammo' ? 'PISTOL' : 'SHOTGUN')}${cell('CARRIED', s[t] ?? 0, true)}</div></div>`
  }
  if (t === 'bobbypin') {
    return `<div class="${cls}"><h4>Bobby pin</h4><div class="r" style="color:var(--ad)">TOOL</div><div class="g">${cell('USE', 'LOCKPICKING')}${cell('CARRIED', s.bobbypins != null ? s.bobbypins : 6, true)}</div></div>`
  }
  return ''
}

const HALRAISE = `<style>@keyframes halRaiseI{0%{transform:perspective(900px) translateY(45%) rotateX(38deg) scale(.82);opacity:0;filter:brightness(3) blur(3px)}55%{transform:perspective(900px) translateY(-2%) rotateX(-4deg);opacity:1;filter:brightness(1.6)}72%{filter:brightness(.6)}78%{filter:brightness(1.4)}100%{transform:none;filter:none}}.halinv .pbp{animation:halRaiseI .55s cubic-bezier(.2,.9,.25,1) both;position:relative}.halinv .pbp::before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(rgba(0,0,0,.18) 0 1px,transparent 1px 3px);z-index:2}</style>`
function inventory(s) {
  const lv = s.level ?? 1, eqKey = s.equipped ?? 'fists'
  const weapons = (W.order ?? []).filter((k) => owned(s).includes(k)).map((k) => {
    const w = W[k], on = k === eqKey, ok = true
    const cnt = owned(s).filter((x) => x === k).length
    const inner = `<span class="eq"></span><span class="nm">${w.name}${cnt > 1 ? ` ×${cnt}` : ''}</span><span class="n">${ok ? (w.ranged ? `${s['loaded_' + k] ?? 0}/${s[w.ammoType ?? 'ammo'] ?? 0}` : '') : `LV ${w.minLevel}`}</span>${detail(k, s, false)}`
    return ok && !on ? `<button class="it" onclick="sendAction('inv',{k:'equip',w:'${k}'})">${inner}</button>` : `<div class="it${on ? ' on' : ''}${ok ? '' : ' lock'}">${inner}</div>`
  }).join('')
  const AWK = [['grey', 'almonds', 'Grey almond water', '#b9bcb4'], ['green', 'almondsG', 'Green almond water', '#7fcf6a'], ['red', 'almondsR', 'Red almond water', '#d0574a'], ['blue', 'almondsB', 'Blue almond water', '#6f9be0']]
  const anyAw = AWK.some(([, k]) => s[k])
  const meatRows = Object.entries(s.meat ?? {}).filter(([c, n]) => n > 0 && MEAT[c]).map(([c, n]) => `<button class="it" onclick="sendAction('inv',{k:'eat',c:'${c}'})"><span class="eq" style="background:${MEAT[c].color}"></span><span class="nm" style="color:${MEAT[c].color}">${MEAT[c].name}</span><span class="n">${n}</span><span class="dt">${MEAT[c].tier} · eat +${MEAT[c].hp} HP</span></button>`).join('')
  const aid0 = anyAw ? AWK.filter(([, k]) => s[k]).map(([c, k, nm, col]) => `<button class="it" onclick="sendAction('inv',{k:'drink',c:'${c}'})"><span class="eq" style="background:${col}"></span><span class="nm" style="color:${col}">${nm}</span><span class="n">${s[k]}</span>${detail('almond:' + c, s, false)}</button>`).join('') + `<button class="it" onclick="sendAction('inv',{k:'splash'})"><span class="eq"></span><span class="nm">Splash a bottle</span><span class="n">J</span></button>` : '<div class="em">None.</div>'
  const aid = aid0 + meatRows
  const ammo = ['ammo', 'shells'].filter((t) => s[t]).map((t) => `<div class="it"><span class="eq"></span><span class="nm">${t === 'ammo' ? 'Pistol rounds' : 'Shotgun shells'}</span><span class="n">${s[t]}</span>${detail(t, s, false)}</div>`).join('') || '<div class="em">None.</div>'
  const on = wornTokens(s.look), bag = (s.clothes ? s.clothes.split(',').filter(Boolean) : [])
  const app = on.map((t) => { const p = parseCloth(t); return `<button class="it on" onclick="sendAction('inv',{k:'unwear',w:'${p.slot}'})"><span class="eq"></span><span class="nm">${p.row.name}</span><span class="n">DR ${p.row.dr}</span>${detail(t, s, false)}</button>` }).join('')
    + [...new Set(bag)].map((t) => { const p = parseCloth(t); if (!p) return ''; const n = bag.filter((x) => x === t).length
      return `<button class="it" onclick="sendAction('inv',{k:'wear',w:'${t}'})"><span class="eq"></span><span class="nm">${p.row.name}${n > 1 ? ` ×${n}` : ''}</span><span class="n">DR ${p.row.dr}</span>${detail(t, s, false)}</button>` }).join('') || '<div class="em">Nothing on.</div>'
  const eq = W[eqKey] ?? W.fists
  const drop = eqKey !== 'fists' ? `<button onclick="sendAction('inv',{k:'drop',w:'${eqKey}'})">Drop ${eq.name}</button>` : ''
  return HALRAISE + `<div class="pbw pb halinv"><div class="pbp" data-modal>
    <div class="hd"><h2>HALOGEN&trade; · INVENTORY</h2><div class="st"><span><b>LVL</b>${lv}</span><span><b>HP</b>${Math.round(s.hp ?? 0)}/${maxHp(lv, s)}</span><span><b>SAN</b>${Math.round(s.sanity ?? 0)}/${maxSan(lv, s)}</span><span><b>XP</b>${s.xp ?? 0}/${L.xpBase * lv}</span><span><b>DR</b>${wornDR(s.look)}</span></div></div>
    <div class="bd"><div class="ls"><div class="sec">Weapons</div>${weapons}<div class="sec">Aid</div>${aid}${s.compass > 0 ? `<button class="it" onclick="sendAction('inv',{k:'compass'})"><span class="eq"></span><span class="nm" style="color:#d8b56a">Old compass</span><span class="n">${s.compass} reads</span></button>` : ''}${s.firesalt > 0 ? `<button class="it" onclick="sendAction('inv',{k:'firesalt'})"><span class="eq"></span><span class="nm" style="color:#ff8a3a">Firesalt · Rub on weapon</span><span class="n">${s.firesalt}</span></button>` : ''}<div class="sec">Ammo</div>${ammo}<div class="sec">Apparel</div>${app}${s.pages ? `<div class="sec">Notes</div>${String(s.pages).split(',').filter(Boolean).sort((x, y) => x - y).map((n) => `<button class="it" onclick="sendAction('inv',{k:'read',n:${+n}})"><span class="eq"></span><span class="nm" style="color:#e8dcc0">Torn notebook page ${+n}</span><span class="n">read</span></button>`).join('')}` : ''}</div>${detail(eqKey, s, true)}</div>
    <div class="ft"><span class="c">${s.kills ?? 0} kills</span>${drop}<button onclick="sendAction('inv',{k:'close'})"><kbd>I</kbd>Close</button></div>
  </div></div>`
}

function container(s, key) {
  const items = itemsOf(s.lootList)
  const rows = items.map((t, i) => `<button class="it" onclick="sendAction('loot',{k:'take',i:${i}})"><span class="eq"></span><span class="nm" style="color:${t.startsWith('weapon:') ? describe(t).color : 'inherit'}">${describe(t).name}</span><span class="n">${t === 'ammo' ? W.ammo.perPickup : t === 'shells' ? W.shells.perPickup : ''}</span>${detail(t, s, false)}</button>`).join('')
  const n = owned(s).length - 1
  const carry = `Carrying ${n} weapon${n === 1 ? '' : 's'} · almond ${s.almonds ?? 0} · rounds ${s.ammo ?? 0} · shells ${s.shells ?? 0}${s.firesalt ? ` · firesalt ${s.firesalt}` : ''}`
  return `<div class="pbw pb"><div class="pbp" data-modal>
    <div class="hd"><h2>${s.lootName || 'Container'}</h2><div class="st"><span><b>ITEMS</b>${items.length}</span></div></div>
    <div class="bd"><div class="ls">${rows || '<div class="em">Empty.</div>'}</div>${items[0] ? detail(items[0], s, true) : ''}</div>
    <div class="ft"><span class="c">${carry}</span>${items.length ? `<button onclick="sendAction('loot',{k:'all'})"><kbd>R</kbd>Take all</button>` : ''}<button onclick="sendAction('loot',{k:'close'})"><kbd>${key}</kbd>Close</button></div>
  </div></div>`
}

export function lootUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const key = ctx.world.inputs?.actions?.interact?.label ?? 'E'
  let out = CSS
  if (s.lootOpen) out += container(s, key)
  else if (s.invOpen) out += inventory(s)
  else if (s.focus) {
    const f = s.focus
    out += `<div id="lp" class="pb"><div class="nm"><span class="key">${key}</span><span>${f.verb}</span><span style="color:${f.color || 'inherit'}">${f.name}</span></div><div class="in">${f.info || ''}</div></div>`
  }
  if (s.notice && ctx.now() - s.notice.at < 2200) out += `<div id="ln" class="pb"><span>${s.notice.text}</span></div>`
  return out
}
