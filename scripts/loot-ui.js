// The looting HUD and the inventory, in the HUD's amber terminal look (scripts/ui.js #hud, Shelly's reference #1134):
// the prompt under the crosshair, the container menu (its contents left, what you carry right), the inventory (I),
// and a short notice when something could not be taken.
// player.state: focus, lootOpen, lootName, lootList, notice (scripts/interact.js); invOpen, weapons, equipped,
// almonds, ammo, shells (scripts/player.js). Loot buttons send 'loot' {k:'take',i}|{k:'all'}|{k:'close'};
// inventory buttons send 'inv' {k:'equip',w}|{k:'drop',w}|{k:'drink'}|{k:'close'}.
import { describe, itemsOf } from './lib/items.js'
import L from './lib/data/level0.yml'
import W from './lib/data/weapons.yml'

const CSS = `<style>
.pb{--a:#ffb642;--ad:rgba(255,182,66,.38);--bg:rgba(14,9,2,.93);color:var(--a);font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 4px rgba(255,170,40,.7),0 1px 2px #000}
#lp{position:fixed;inset-inline:0;top:57%;display:flex;flex-direction:column;align-items:center;pointer-events:none}
#lp .nm{font-size:17px;display:flex;align-items:center;gap:8px}
#lp .key{display:inline-block;min-width:20px;padding:0 5px;border:1px solid var(--a);font-size:12px;text-align:center}
#lp .in{font-size:11px;color:var(--ad);margin-top:2px}
#ln{position:fixed;inset-inline:0;top:66%;display:flex;justify-content:center;pointer-events:none}
#ln span{padding:3px 12px;background:var(--bg);border:1px solid var(--ad);font-size:12px}
.pbw{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.pbp{pointer-events:auto;background:var(--bg);border:1px solid var(--ad);box-shadow:inset 0 0 40px rgba(255,150,30,.08),0 0 0 1px #000;padding:12px 16px 10px;width:min(640px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));max-height:min(560px,86vh);display:flex;flex-direction:column;position:relative;overflow:hidden}
.pbp::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}
.pbh{display:flex;align-items:flex-end;gap:12px;border-bottom:2px solid var(--a);padding-bottom:4px;margin-bottom:8px}
.pbh h2{font-size:20px;margin:0;font-weight:400}
.pbh .sub{margin-left:auto;font-size:11px;color:var(--ad)}
.cols{display:flex;gap:14px;min-height:0;flex:1}
.col{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0}
.col h3{font-size:11px;font-weight:400;color:var(--ad);margin:0 0 4px;border-bottom:1px solid var(--ad);padding-bottom:2px}
.ls{overflow-y:auto;min-height:0}
.it{display:flex;align-items:center;gap:8px;width:100%;padding:4px 6px;margin:1px 0;background:none;border:1px solid transparent;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer;text-transform:inherit;letter-spacing:inherit;text-shadow:inherit}
.it:hover{background:var(--a);color:#140c02;text-shadow:none}
.it:hover small,.it:hover .q{color:#140c02}
.it .dot{width:6px;height:6px;flex:none;background:currentColor}
.it.on .dot{box-shadow:0 0 0 2px var(--bg),0 0 0 3px currentColor}
.it small{margin-left:auto;font-size:10px;color:var(--ad);white-space:nowrap}
.it .q{color:var(--ad)}
.it.dim{opacity:.45;cursor:default}
.it.dim:hover{background:none;color:inherit}
.row{display:flex;justify-content:space-between;font-size:12px;padding:2px 6px}
.row b{font-weight:400}
.bar{height:6px;border:1px solid var(--ad);margin:1px 6px 5px}
.bar i{display:block;height:100%;background:var(--a)}
.em{color:var(--ad);font-size:12px;padding:12px 6px}
.ft{display:flex;gap:8px;margin-top:8px;border-top:1px solid var(--ad);padding-top:6px;flex-wrap:wrap}
.ft button{font:inherit;font-size:12px;letter-spacing:inherit;text-transform:inherit;color:var(--a);background:none;border:1px solid var(--a);padding:3px 10px;cursor:pointer;text-shadow:inherit}
.ft button:hover{background:var(--a);color:#140c02;text-shadow:none}
.ft .sp{flex:1}
.ft .x{border-color:var(--ad);color:var(--ad)}
@media (max-width:560px){.cols{flex-direction:column}}
</style>`

const owned = (s) => ['fists', ...(s.weapons ? s.weapons.split(',').filter(Boolean) : [])]
const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity
const pct = (v, m) => Math.max(0, Math.min(100, Math.round((v / m) * 100)))

function carried(s, act) {
  // what you carry, as rows; act = true makes them buttons (the inventory), false a read (beside a container)
  const rows = []
  for (const k of (W.order ?? owned(s)).filter((k) => owned(s).includes(k))) {
    const w = W[k], r = W.rarities?.[w.rarity], on = s.equipped === k || (!s.equipped && k === 'fists'), ok = (s.level ?? 1) >= (w.minLevel ?? 1)
    const info = `${w.ranged ? `${s['loaded_' + k] ?? 0}/${s[w.ammoType ?? 'ammo'] ?? 0} · ` : ''}DMG ${w.damage}${ok ? '' : ` · LV ${w.minLevel}`}`
    const tag = `<span class="dot"></span><span style="color:${r?.color ?? 'inherit'}">${w.name}</span><small>${on ? 'EQUIPPED · ' : ''}${info}</small>`
    rows.push(act && ok && !on ? `<button class="it" onclick="sendAction('inv',{k:'equip',w:'${k}'})">${tag}</button>` : `<div class="it ${on ? 'on' : ''} ${act && !ok ? 'dim' : ''}" style="cursor:default">${tag}</div>`)
  }
  return rows.join('')
}

function aid(s, act) {
  const a = s.almonds ?? 0
  const almond = `<span class="dot"></span><span>Almond water <span class="q">(${a}/${L.almondMax})</span></span><small>+${L.almondHp} HP · +${L.almondSanity} SAN</small>`
  return (a ? (act ? `<button class="it" onclick="sendAction('inv',{k:'drink'})">${almond}</button>` : `<div class="it">${almond}</div>`) : '')
    + `<div class="it" style="cursor:default"><span class="dot"></span><span>Pistol rounds</span><small>${s.ammo ?? 0}/${W.ammo.max}</small></div>`
    + `<div class="it" style="cursor:default"><span class="dot"></span><span>Shotgun shells</span><small>${s.shells ?? 0}/${W.shells.max}</small></div>`
}

function inventory(s) {
  const lv = s.level ?? 1, mh = maxHp(lv), ms = maxSan(lv)
  const eq = W[s.equipped] ?? W.fists
  const drop = s.equipped && s.equipped !== 'fists' ? `<button onclick="sendAction('inv',{k:'drop',w:'${s.equipped}'})">Drop ${eq.name}</button>` : ''
  return `<div class="pbw pb"><div class="pbp" data-modal>
    <div class="pbh"><h2>Inventory</h2><span class="sub">LV ${lv} · ${s.kills ?? 0} kills</span></div>
    <div class="cols">
      <div class="col"><h3>Weapons</h3><div class="ls">${carried(s, true)}</div></div>
      <div class="col"><h3>Aid &amp; ammo</h3><div class="ls">${aid(s, true)}</div>
        <h3 style="margin-top:10px">Status</h3>
        <div class="row"><span>HP</span><b>${Math.round(s.hp ?? 0)}/${mh}</b></div><div class="bar"><i style="width:${pct(s.hp ?? 0, mh)}%"></i></div>
        <div class="row"><span>Sanity</span><b>${Math.round(s.sanity ?? 0)}/${ms}</b></div><div class="bar"><i style="width:${pct(s.sanity ?? 0, ms)}%"></i></div>
        <div class="row"><span>XP</span><b>${s.xp ?? 0}/${L.xpBase * lv}</b></div><div class="bar"><i style="width:${pct(s.xp ?? 0, L.xpBase * lv)}%"></i></div>
      </div>
    </div>
    <div class="ft">${drop}<span class="sp"></span><button class="x" onclick="sendAction('inv',{k:'close'})">Close (I)</button></div>
  </div></div>`
}

export function lootUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const key = ctx.world.inputs?.actions?.interact?.label ?? 'E'
  let out = CSS
  if (s.lootOpen) {
    const items = itemsOf(s.lootList)
    const rows = items.map((t, i) => {
      const d = describe(t)
      return `<button class="it" onclick="sendAction('loot',{k:'take',i:${i}})"><span class="dot"></span><span style="color:${d.color}">${d.name}</span><small>${d.info}</small></button>`
    }).join('')
    out += `<div class="pbw pb"><div class="pbp" data-modal>
      <div class="pbh"><h2>${s.lootName || 'Container'}</h2><span class="sub">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
      <div class="cols">
        <div class="col"><h3>Inside</h3><div class="ls">${rows || '<div class="em">Nothing left.</div>'}</div></div>
        <div class="col"><h3>You carry</h3><div class="ls">${carried(s, false)}${aid(s, false)}</div></div>
      </div>
      <div class="ft">${items.length ? `<button onclick="sendAction('loot',{k:'all'})">Take all (R)</button>` : ''}<span class="sp"></span><button class="x" onclick="sendAction('loot',{k:'close'})">Close (${key})</button></div>
    </div></div>`
  } else if (s.invOpen) {
    out += inventory(s)
  } else if (s.focus) {
    const f = s.focus
    out += `<div id="lp" class="pb"><div class="nm"><span class="key">${key}</span><span>${f.verb}</span><span style="color:${f.color || 'inherit'}">${f.name}</span></div><div class="in">${f.info || ''}</div></div>`
  }
  if (s.notice && ctx.now() - s.notice.at < 2200) out += `<div id="ln" class="pb"><span>${s.notice.text}</span></div>`
  return out
}
