import { xpNeedFor } from './lib/progression.js'
import { wristNav } from './lib/wrist-nav.js'
// The character sheet (K), the carry-weight chip and the creature read-out. All from player.state
// (written by scripts/stats.js): attr, skl, apts, spts, sheetOpen, target. Buttons send the 'stat' action.
import { GROUPS, karmaOf, karmaTitle, karmaColor, titleOf, titleColor, fameOf, infamyOf, megRank } from './lib/rep.js'
import L from './lib/data/level0.yml'
import W from './lib/weapons.js'
import { ATTRS, SKILLS, ATTR_MAX, SKILL_MAX, baseAttrsOf, attrsOf, permanentSkillsOf, skillsOf, tagsOf, spentOf, baseSkill, dmgMul, derived, carried, burden, handling, reqText } from './lib/stats.js'
import { collectModifiers, formatModsList, formatGameMinutes } from './lib/modifiers.js'
import { esc as escT, escKeyHandler } from './lib/ui-kit.js'

const FIG = `<svg viewBox="0 0 120 180" fill="none" stroke="#d5b77b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M38 30 L34 8 L50 22 M82 30 L86 8 L70 22"/><circle cx="60" cy="42" r="24"/>
<path d="M50 40 q3 -4 6 0 M64 40 q3 -4 6 0"/><path d="M55 52 q5 5 10 0"/><path d="M57 47 h6"/>
<path d="M46 66 q14 8 28 0 L80 110 q-20 6 -40 0 Z"/>
<path d="M46 74 L22 92 L14 82 M74 74 L96 54 L104 60"/><circle cx="14" cy="80" r="4"/><circle cx="105" cy="58" r="4"/>
<path d="M50 112 L46 160 L36 166 M70 112 L74 160 L84 166"/>
<path d="M80 104 q22 6 18 -18 q-2 -8 6 -10"/></svg>`
const pct = (v, m) => Math.max(0, Math.min(100, Math.round(100 * (v ?? m) / (m || 1))))
const hmL = (sec) => { const m = Math.ceil(sec / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m` }

function modSummaryText(e) {
  const parts = formatModsList(e.mods)
  if (e.debuff?.hpPerSec) parts.push(`${e.debuff.hpPerSec > 0 ? '+' : ''}${e.debuff.hpPerSec} HP/s`)
  if (e.debuff?.sanityPerSec) parts.push(`${e.debuff.sanityPerSec > 0 ? '+' : ''}${e.debuff.sanityPerSec} SAN/s`)
  if (!parts.length && e.note) parts.push(e.note)
  return parts.join(' · ')
}

function statusPanel(s, maxHp, maxSan, mods, d) {
  const bar = (lbl, v, pos) => `<div class="cb${v < 30 ? ' lo' : ''}" style="${pos}">${lbl}<i><u style="width:${v}%"></u></i></div>`
  const ef = []
  const b = s.smoothieBuff
  if (b) ef.push(`<div class="e"><span class="sw" style="background:${b.col || '#ff77b7'};color:${b.col || '#ff77b7'}"></span><div><b>${escT(b.name)}</b><div style="opacity:.8">${[b.hp ? `+${b.hp} HP` : '', b.san ? `+${b.san} SAN` : '', b.food ? 'keeps you fed' : ''].filter(Boolean).join(' · ') || escT(b.desc)}</div></div><span class="t">${hmL(b.left)}</span></div>`)
  for (const e of mods.active) {
    const col = e.kind === 'magazine' ? '#d5b77b' : e.positive === false ? '#e07a5a' : '#8fd67c'
    const desc = modSummaryText(e)
    const timeStr = e.leftGameMin != null ? formatGameMinutes(e.leftGameMin) : ''
    ef.push(`<div class="e"><span class="sw" style="background:${col};color:${col}"></span><div><b>${escT(e.name)}</b><div style="opacity:.8">${escT(desc)}</div></div>${timeStr ? `<span class="t">${escT(timeStr)}</span>` : ''}</div>`)
  }
  if ((s.hunger ?? 100) < 25) ef.push(`<div class="e"><span class="sw" style="background:#ff8a5a;color:#ff8a5a"></span><div><b>Hungry</b><div style="opacity:.8">Eat something to restore fullness</div></div></div>`)
  if ((s.thirst ?? 100) < 25) ef.push(`<div class="e"><span class="sw" style="background:#ff8a5a;color:#ff8a5a"></span><div><b>Thirsty</b><div style="opacity:.8">Drink water or almond water</div></div></div>`)
  if ((s.cold ?? 0) >= 40) ef.push(`<div class="e"><span class="sw" style="background:#7fc4e8;color:#7fc4e8"></span><div><b>${s.cold >= 70 ? 'Freezing' : 'Chilly'}</b><div style="opacity:.8">Find warmth or insulated gear</div></div></div>`)
  if ((s.heat ?? 0) >= 40) ef.push(`<div class="e"><span class="sw" style="background:#e07a5a;color:#e07a5a"></span><div><b>${s.heat >= 70 ? 'Scalding Heat' : 'Sweltering'}</b><div style="opacity:.8">Move away from boiler heat</div></div></div>`)

  const gearLines = []
  const byGear = new Map()
  for (const [k, arr] of Object.entries(mods.sources)) {
    for (const src of arr) {
      if (src.kind !== 'gear') continue
      if (!byGear.has(src.label)) byGear.set(src.label, {})
      byGear.get(src.label)[k] = (byGear.get(src.label)[k] ?? 0) + src.val
    }
  }
  for (const [name, gmods] of byGear) {
    const txt = formatModsList(gmods).join(' · ')
    if (txt) gearLines.push(`<div class="e"><span class="sw" style="background:#d5b77b;color:#d5b77b"></span><div><b>${escT(name)}</b><div style="opacity:.8">${escT(txt)}</div></div><span class="t">GEAR</span></div>`)
  }
  const bookTotal = Object.values(mods.bookSkills).reduce((a, n) => a + (n || 0), 0)
  const bookCount = Object.keys(s.readBooks ?? {}).length + Object.values(s.genericBooksRead ?? {}).reduce((a, n) => a + (n || 0), 0)

  return `<div class="st"><div class="fig">${FIG}
${bar('HP', pct(s.hp, maxHp), 'left:0;top:14px')}${bar('SAN', pct(s.sanity, maxSan), 'right:0;top:14px')}
${bar('FOOD', pct(s.hunger, 100), 'left:0;top:120px')}${bar('WATER', pct(s.thirst, 100), 'right:0;top:120px')}
<div style="position:absolute;left:0;right:0;bottom:-4px;text-align:center;font-size:11px;letter-spacing:.14em;color:#d5b77b">· LEVEL ${s.level ?? 1} ·</div></div>
<div class="ef"><div class="sec" style="padding:0 0 4px">ACTIVE EFFECTS & CONDITIONS</div>${ef.join('') || '<div style="opacity:.65;padding:6px 0">No active timed effects or ailments.</div>'}
<div class="sec" style="padding:12px 0 4px">GEAR & SURVIVAL PROTECTION · COLD ${d.coldResist}% · HEAT ${d.heatResist}%${d.bleedImmune ? ' · BLEED IMMUNE' : ''}</div>${gearLines.join('') || '<div style="opacity:.65;padding:4px 0">No passive gear modifiers active.</div>'}
${bookCount > 0 ? `<div style="margin-top:10px;font-size:11px;color:#d5b77b;opacity:.9">Skill Books Read: ${bookCount} (+${bookTotal} permanent skill points)</div>` : ''}
</div></div>`
}

const CSS = `<style>
#wt{position:fixed;left:22px;bottom:128px;font-size:11px;letter-spacing:.14em;color:#ffcf87;text-shadow:0 1px 3px #000;pointer-events:none;opacity:.85}
#wt.hv{color:#ff9a6a;opacity:1}
#wt.ov{color:#ff5a4a;opacity:1}
#tg{position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:60vw;top:36%;text-align:center;pointer-events:none;letter-spacing:.08em;padding:6px 12px 7px;background:oklch(0.16 0.02 78 / .82);border:1px solid #d5b77b88;box-shadow:3px 3px 0 #000}
#tg b{font-size:15px;color:#ffe2a8}
#tg i{font-style:normal;margin-left:10px;color:#d5b77b;font-size:12px}
#tg .bar{width:160px;height:5px;margin:6px auto 0;background:#0009;border:1px solid #d5b77b66}
#tg .bar u{display:block;height:100%;background:#d9503a}
#tg .at{font-size:10.5px;opacity:.8;margin-top:5px;letter-spacing:.1em}
#sh{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)));height:min(680px,calc(100dvh - 48px));display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;font-family:inherit}
#sh .hd{display:flex;align-items:center;gap:14px;padding:18px 24px 14px;border-bottom:1px solid #3f473b;flex:none}
#sh h2{margin:0;flex:1}
#sh .pt{font-size:12px}
#sh .cols{display:grid;grid-template-columns:1fr 1fr;gap:0;flex:1;min-height:0;overflow:auto}
#sh .col{padding:18px 24px}
#sh .col+.col{border-left:1px solid #3f473b}
#sh .sec{font-size:10px;letter-spacing:.12em;margin:2px 0 10px;color:#aab09f}
#sh .row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #2c3128}
#sh .row .n{flex:1;min-width:0}
#sh .row .n small{display:block;font-size:11px;color:#aab09f;margin-top:2px;line-height:1.4}
#sh .row .v{width:44px;text-align:right;font-size:18px;font-variant-numeric:tabular-nums}
#sh .skill-meter{height:4px;margin-top:6px;max-width:220px;background:#30372b;overflow:hidden}
#sh .skill-meter i{display:block;height:100%;background:var(--ui-accent,#d5b77b);transition:width .25s ease}
#sh .skill-meta{font-size:10px;color:#aab09f;letter-spacing:.04em}
#sh .xp-wrap{display:flex;align-items:center;gap:12px;min-width:0}
#sh .xp-bar{width:110px;height:5px;background:#30372b;overflow:hidden}
#sh .xp-bar i{display:block;height:100%;background:var(--ui-accent,#d5b77b);transition:width .3s ease}
#sh button:focus-visible{outline:2px solid #ffe2a8;outline-offset:2px}
@media (prefers-reduced-motion:reduce){#sh .skill-meter i,#sh .xp-bar i{transition:none}}
@media (max-width:680px){#sh .xp-bar{width:50px}#sh .row{gap:6px}#sh .skill-meta{font-size:9px}}

#sh .pips{display:flex;gap:2px}
#sh .pips i{width:7px;height:11px;background:#3e4637}
#sh .pips i.on{background:#d5b77b}
#sh button{font:inherit;font-size:14px;min-width:28px;height:28px;padding:0 6px;cursor:pointer}
#sh button:disabled{opacity:.25;cursor:default}
#sh .dv{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12px;padding:16px 24px;border-top:1px solid #3f473b}
#sh .dv span{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #262b23}
#sh .dv span b{color:#eeeadd}
#sh .ft{display:flex;justify-content:space-between;align-items:center;padding:12px 24px;border-top:1px solid #3f473b;flex:none}
#sh .ft button{width:auto;padding:0 14px;height:32px}
#sh .st{display:grid;grid-template-columns:260px 1fr;gap:20px}
#sh .fig{position:relative;height:190px}
#sh .fig svg{position:absolute;left:50%;top:6px;width:120px;height:180px;margin-left:-60px}
#sh .cb{position:absolute;width:62px;font-size:9px;letter-spacing:.12em;color:#d5b77b}
#sh .cb i{display:block;height:6px;margin-top:2px;background:#30372b;border:1px solid #3f473b}
#sh .cb i u{display:block;height:100%;background:#d5b77b}
#sh .cb.lo i u{background:#e07a5a}
#sh .ef{font-size:13px}
#sh .ef .e{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #2c3128}
#sh .ef .e b{color:#eeeadd}
#sh .ef .e .t{margin-left:auto;color:#aab09f;font-size:11px}
#sh .ef .sw{width:10px;height:10px;flex:none;border-radius:1px}
@media (max-width:680px){#sh .st{grid-template-columns:1fr}#sh .cols,#sh .dv{grid-template-columns:1fr}#sh .col+.col{border-left:0;border-top:1px solid #3f473b}}
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

  const mods = collectModifiers(s, s._clockNow)
  const baseAt = baseAttrsOf(s), at = attrsOf(s), permSk = permanentSkillsOf(s), sk = skillsOf(s), d = derived(s), apts = s.apts ?? 0, spts = s.spts ?? 0
  const tg = tagsOf(s), tl = s.tagsLeft ?? 0
  const attrRows = ATTRS.map((a, i) => {
    const delta = at[a.k] - baseAt[a.k]
    const colStyle = delta > 0 ? ' style="color:#8fd67c"' : delta < 0 ? ' style="color:#e07a5a"' : ''
    const srcText = delta ? ` · Base ${baseAt[a.k]} (${(mods.sources[a.k] ?? []).map((x) => `${x.label} ${x.val > 0 ? '+' : ''}${x.val}`).join(', ')})` : ''
    return `<div class="row"><div class="n">${a.name}<small>${a.info}${srcText ? `<span${colStyle}>${escT(srcText)}</span>` : ''}</small></div><div class="pips">${Array.from({ length: ATTR_MAX }, (_, q) => `<i class="${q < at[a.k] ? 'on' : ''}"></i>`).join('')}</div><div class="v"${colStyle}>${at[a.k]}</div>${s.creating ? `<button ${at[a.k] > 1 ? '' : 'disabled'} onclick="sendAction('stat',{k:'attrDown',i:${i}})">&minus;</button>` : ''}<button ${apts > 0 && baseAt[a.k] < ATTR_MAX ? '' : 'disabled'} onclick="sendAction('stat',{k:'attr',i:${i}})">+</button></div>`
  }).join('')
  const spent = spentOf(s)
  const skillRows = SKILLS.map((k, i) => {
    const tagged = tg.includes(k.k), available = spts > 0 && permSk[k.k] < SKILL_MAX
    const bookB = mods.bookSkills[k.k] ?? 0
    const tempB = (mods.effectSkills[k.k] ?? 0) + (mods.gearSkills[k.k] ?? 0)
    const valCol = tempB > 0 ? '#8fd67c' : tempB < 0 ? '#e07a5a' : bookB > 0 ? '#d5b77b' : ''
    const bits = []
    if (bookB) bits.push(`<span style="color:#d5b77b">+${bookB} book${bookB === 3 ? '' : 's'}</span>`)
    if (tempB) {
      const tempSrc = (mods.sources[k.k] ?? []).filter((x) => x.kind !== 'book').map((x) => `${escT(x.label)} ${x.val > 0 ? '+' : ''}${x.val}`).join(', ')
      bits.push(`<span style="color:${tempB > 0 ? '#8fd67c' : '#e07a5a'}">${tempB > 0 ? '+' : ''}${tempB} (${tempSrc})</span>`)
    }
    const tagButton = s.creating && tagged ? `<button aria-label="Remove ${k.name} tag" onclick="sendAction('stat',{k:'untag',i:${i}})">★</button>` : tl > 0 && !tagged ? `<button aria-label="Tag ${k.name}" onclick="sendAction('stat',{k:'tag',i:${i}})">TAG</button>` : ''
    return `<div class="row"><div class="n">${tagged ? '<b style="color:#d5b77b">★ </b>' : ''}${k.name}<small>${k.info}${bits.length ? ' · ' + bits.join(' · ') : ''}</small><div class="skill-meter" aria-hidden="true"><i style="width:${sk[k.k]}%"></i></div><div class="skill-meta">Base ${baseSkill(at, k)}${tagged ? ' · Tag +15' : ''} · Invested ${spent[i]}</div></div><div class="v"${valCol ? ` style="color:${valCol}"` : ''}>${sk[k.k]}<small style="font-size:10px;color:#aab09f">/100</small></div>${tagButton}${s.creating ? '' : `<button aria-label="Add one point to ${k.name}" ${available ? '' : 'disabled'} onclick="sendAction('stat',{k:'skill',i:${i}})">+1</button><button aria-label="Add up to five points to ${k.name}" ${available ? '' : 'disabled'} onclick="sendAction('stat',{k:'skill',i:${i},amount:5})">+5</button>`}</div>`
  }).join('')

  const slow = burden(s) < 1
  const wp = W[s.equipped] ?? W.fists
  const dam = (w) => Math.round((w.damage + (s.level - 1) * L.perLevel.damage * (w.levelScale ?? 1)) * dmgMul(s, w))
  const mh = L.hp + (s.level - 1) * L.perLevel.hp + d.hpBonus
  const ms = L.sanity + (s.level - 1) * L.perLevel.sanity + d.sanBonus

  let bodyHtml = ''
  if (s.creating) {
    bodyHtml = `<div class="cols"><div class="col"><div class="sec">ATTRIBUTES</div>${attrRows}</div><div class="col"><div class="sec">SKILLS</div>${skillRows}</div></div>`
  } else {
    const tab = ['stats', 'skills', 'status', 'rep'].includes(s.sheetTab) ? s.sheetTab : 'stats'
    const tabBtn = (k, label) => `<button class="${tab === k ? 'on' : ''}" onclick="sendAction('stat',{k:'tab',t:'${k}'})">${label}</button>`
    const tabsBar = `<div class="sh-tabs" role="tablist" aria-label="Character sections">
      ${tabBtn('stats', `Statistics${apts > 0 ? ` (+${apts})` : ''}`)}
      ${tabBtn('skills', `Skills${spts > 0 ? ` (+${spts})` : ''}`)}
      ${tabBtn('status', 'Status')}
      ${tabBtn('rep', 'Reputation')}
    </div>`

    if (tab === 'stats') {
      bodyHtml = `${tabsBar}<div class="sh-panel">
        <div class="sec">ATTRIBUTES</div>${attrRows}
        <div class="sec" style="margin-top:18px">DERIVED COMBAT & SURVIVAL</div>
        <div class="dv" style="padding:0;border-top:0">
          <span>Max HP <b>${mh}</b></span><span>Max Sanity <b>${ms}</b></span>
          <span>Carry Weight <b>${kg.toFixed(1)} / ${Number.isFinite(cap) ? cap : '∞'} kg${slow ? ' (slowed)' : ''}</b></span><span>Stamina <b>${Math.round(d.staMax)}</b></span>
          <span>Damage Resist <b>DR ${d.dr}</b></span><span>Crit Chance <b>${Math.round(d.crit * 100)}%</b></span>
          <span>${escT(wp.name)} DAM <b>${dam(wp)}</b></span><span>DPS <b>${Math.round(dam(wp) / (wp.cooldown * (wp.ranged ? 1 : d.swing)))}</b></span>
          <span>Unarmed DAM <b>${dam(W.fists)}</b></span><span>Thermal Resist <b>Cold ${d.coldResist}% · Heat ${d.heatResist}%</b></span>
          <span>Scavenge / Find <b>${Math.round(d.scav * 100)}% · ×${d.clothFind.toFixed(2)}</b></span>${d.bleedImmune ? `<span>Bleed Guard <b>Immune</b></span>` : ''}
          ${wp.req ? `<span>${escT(wp.name)} Needs <b>${reqText(wp)}</b></span><span>${handling(s, wp).notes.length ? `<b style="color:#e07a5a">${escT(handling(s, wp).notes.join(' · '))}</b>` : 'You can handle it'}${wp.ranged ? ` · spread ×${handling(s, wp).spread.toFixed(2)}` : ''}</span>` : ''}
        </div>
      </div>`
    } else if (tab === 'skills') {
      bodyHtml = `${tabsBar}<div class="sh-panel"><div class="sec">SKILLS · ★ TAGGED (+15) · ${spts} POINTS AVAILABLE</div><p class="skill-meta">Gain ${d.skillPerLevel} points per level · +5 spends only what you have room for.</p>${skillRows}</div>`
    } else if (tab === 'status') {
      bodyHtml = `${tabsBar}<div class="sh-panel">${statusPanel(s, mh, ms, mods, d)}</div>`
    } else {
      const repCards = Object.keys(GROUPS).map((g) => `<div class="sh-rep-card">
        <h4>${escT(GROUPS[g].name)}</h4>
        <div class="sh-rep-tier" style="color:${titleColor(s, g)}">${escT(titleOf(s, g))}${g === 'meg' && s.megMember ? ' · Volunteer' : ''}${g === 'meg' && megRank(s) ? ` · ${escT(megRank(s))}` : ''}</div>
        <div class="sh-rep-nums">Fame ${fameOf(s, g)} · Infamy ${infamyOf(s, g)}</div>
      </div>`).join('')
      const hist = s.repHistory?.length
        ? `<div class="sec" style="margin-top:20px">RECENT FACTION CHANGES</div><div class="dv" style="padding:0;border-top:0">${s.repHistory.slice().reverse().map((h) => `<span>${escT(GROUPS[h.group]?.name ?? h.group)} · ${escT(h.kind)} +${escT(h.amount)} <b>${escT(h.reason)}</b></span>`).join('')}</div>`
        : ''
      bodyHtml = `${tabsBar}<div class="sh-panel">
        <div class="sec">KARMA & STANDING</div>
        <div class="sh-rep-card" style="margin-bottom:14px">
          <h4>Overall Karma</h4>
          <div class="sh-rep-tier" style="color:${karmaColor(karmaOf(s))}">${escT(karmaTitle(karmaOf(s)))} (${karmaOf(s)})</div>
        </div>
        <div class="sec">FACTIONS</div>
        <div class="sh-rep-grid">${repCards}</div>
        ${hist}
      </div>`
    }
  }

  const kd = s.creating ? '' : escKeyHandler("sendAction('stat',{k:'close'})")
  out += `<div id="sh" data-modal tabindex="0" ${kd ? `onkeydown="${kd}"` : ''}>
    <div class="hd">
      <h2>${s.creating ? 'Create Character' : `Character · Level ${s.level}`}</h2>
      ${s.creating ? `<div class="pt" style="color:#d5b77b">Lower one to raise another · Tag ${s.tagsLeft ?? 0} skills</div>` : (apts > 0 || spts > 0) ? `<div class="pt" style="color:#d5b77b">Points available</div>` : ''}
      <div class="pt">ATTR <b>${apts}</b></div><div class="pt">SKILL <b>${spts}</b></div>${tl > 0 ? `<div class="pt">TAG <b>${tl}</b></div>` : ''}
    </div>
    ${s.creating ? '' : wristNav('sheet')}
    ${bodyHtml}
    <div class="ft">
      <span class="xp-wrap">${s.creating ? 'Allocate all Attribute & Tag points to begin' : `<span>XP ${s.xp ?? 0} / ${xpNeedFor(s)} · ${Math.max(0, xpNeedFor(s) - (s.xp ?? 0))} to next level</span><span class="xp-bar" aria-hidden="true"><i style="width:${pct(s.xp ?? 0, xpNeedFor(s))}%"></i></span>`}</span>
      <button ${s.creating && (apts > 0 || (s.tagsLeft ?? 0) > 0) ? 'disabled' : ''} onclick="sendAction('stat',{k:'close'})">${s.creating ? 'Done' : 'Close · Esc'}</button>
    </div>
  </div>`
  return out
}
