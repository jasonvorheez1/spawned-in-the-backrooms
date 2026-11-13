// The conversation card and the trader's shop (scripts/talk.js writes the state they read).
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, faction, buyPrice, sellPrice, sellables, repairables, repairPrice, SECTIONS, sectionOf, money } from './lib/npc-talk.js'
import { band, bandColor } from './lib/condition.js'
import { repDisc, standing, tierOf, tierColor } from './lib/rep.js'
import { PERKS, perkOf, isMine } from './lib/companion.js'
import { describe } from './lib/items.js'
import { skillsOf } from './lib/stats.js'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const q = (t) => esc(String(t ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"))

function checkBanner(text){
 const lower=String(text).toLowerCase(),kind=lower.includes('succeeded')||lower.includes('passed')?'pass':lower.includes('failed')?'fail':'info';
 return `<div class="tc-chk-banner tc-chk-${kind}">${esc(text)}</div>`;
}
const feel = (r) => (r <= -60 ? 'HOSTILE' : r <= -25 ? 'COLD' : r < 10 ? 'WARY' : r < 40 ? 'OKAY' : r < 70 ? 'FRIENDLY' : 'TRUSTS YOU')
const SVC = { scout: 'Ask for tactical tips', medic: 'Medical triage & healing', quarter: 'Collect ration supplies', smith: 'Repair damaged gear' }

const CSS = `<style>
@keyframes tcOpen{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes tcLine{from{opacity:0}to{opacity:1}}@keyframes tcYou{0%{opacity:0}12%{opacity:1}100%{opacity:.55}}@keyframes tcIn{0%,100%{opacity:0}}@keyframes tcGate{0%,99%{pointer-events:none}100%{pointer-events:auto}}.tc-you{font-size:17px;line-height:1.4;color:#ffe2a8;opacity:.55;margin-bottom:8px;animation:tcYou 1s ease-out}.tc-you b{font-weight:400;opacity:.7;margin-right:6px}.tc-seq .tc-now-txt{animation:tcIn .9s step-end,tcLine .35s ease-out .9s both}.tc-seq-choices{animation:tcIn 1.5s step-end,tcLine .3s ease-out 1.5s both,tcGate 1.5s step-end}
@keyframes tcPulse{0%,100%{opacity:.35}50%{opacity:1}}
.tkw{--amb:#ffb642;--amb2:#ffcf87;--ink:#0b0803;position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:14px;padding:0 calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px) 26px;background:linear-gradient(0deg,rgba(0,0,0,.42),transparent 48%);pointer-events:none;font-family:'Monofonto','Share Tech Mono','Consolas',monospace;z-index:90;color:var(--amb)}
.tc-who{position:absolute;top:24px;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);text-align:right;text-shadow:0 0 6px rgba(255,182,66,.45),1px 1px 0 #000;pointer-events:none}
.tc-name{font-size:24px;letter-spacing:.03em;color:var(--amb2);margin:0;font-weight:400}.tc-subhead{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,182,66,.75);margin-top:2px}.tc-badge+.tc-badge:before{content:' · '}.tc-stance{font-size:12px;letter-spacing:.12em;margin-top:2px}
.tc-line{width:min(820px,100%);box-sizing:border-box;background:rgba(6,4,1,.78);padding:14px 22px;box-shadow:0 0 0 1px rgba(0,0,0,.6);animation:tcLine .25s ease-out}
.tc-now-txt{font-size:20px;line-height:1.42;color:var(--amb2);text-shadow:0 0 6px rgba(255,182,66,.35);overflow-wrap:anywhere}.tc-waiting span{animation:tcPulse 1.1s infinite}.tc-waiting span:nth-child(2){animation-delay:.18s}.tc-waiting span:nth-child(3){animation-delay:.36s}
.tc-chk-banner{font-size:14px;letter-spacing:.04em;margin-bottom:6px}.tc-chk-pass{color:#9dff9d}.tc-chk-fail{color:#ff8a70}.tc-chk-info{color:#9fd3ff}
.tc-box{width:min(860px,100%);box-sizing:border-box;max-height:min(52vh,460px);overflow-y:auto;background:rgba(14,10,3,.9);border:2px solid var(--amb);box-shadow:0 0 0 1px #000,0 0 18px rgba(255,182,66,.18) inset,0 10px 30px rgba(0,0,0,.6);padding:10px 12px;pointer-events:auto;animation:tcOpen .2s ease-out;scrollbar-width:thin;scrollbar-color:rgba(255,182,66,.5) transparent}
.tc-choices-list{display:flex;flex-direction:column;gap:2px}
.tc-choice{width:100%;background:transparent;border:2px solid transparent;color:var(--amb);font:inherit;font-size:19px;line-height:1.3;padding:5px 12px;cursor:pointer;display:flex;align-items:baseline;gap:8px;text-align:left;text-shadow:0 0 5px rgba(255,182,66,.3)}
.tc-choice:hover,.tc-choice:focus-visible{border-color:var(--amb);background:rgba(255,182,66,.1);color:#ffe2a8;outline:none}.tc-choice:disabled{opacity:.4}
.tc-ch-num{display:none}.tc-ch-tag{white-space:nowrap}.tc-ch-txt{flex:1;min-width:0;overflow-wrap:anywhere}
.tc-tag-quest{color:#ffe28a}.tc-tag-speech,.tc-tag-barter,.tc-tag-med,.tc-tag-surv,.tc-tag-guns,.tc-tag-sci,.tc-tag-sneak{color:var(--amb2)}
.tc-foot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,182,66,.35)}
.tc-act-btn,.tc-close-btn{background:rgba(255,182,66,.06);border:1px solid rgba(255,182,66,.4);color:var(--amb);font:inherit;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;cursor:pointer}
.tc-act-btn:hover,.tc-act-btn:focus-visible,.tc-close-btn:hover,.tc-close-btn:focus-visible{background:var(--amb);color:var(--ink);outline:none}.tc-close-btn{margin-left:auto}
.tc-extra{font-size:13px;color:rgba(255,182,66,.8)}.tc-extra summary{cursor:pointer;padding:4px 0;letter-spacing:.06em;text-transform:uppercase}.tc-stream{max-height:130px;overflow-y:auto;padding:4px 0}.tc-hist-line{font-size:14px;line-height:1.45;margin:2px 0;color:rgba(255,207,135,.8)}.tc-hist-line b{font-weight:400;color:var(--amb)}
@media(max-width:600px){.tkw{padding:0 10px 10px;gap:8px}.tc-who{top:12px;right:12px}.tc-name{font-size:18px}.tc-now-txt{font-size:16px}.tc-choice{font-size:16px;padding:6px 8px;min-height:44px}.tc-line{padding:10px 12px}}
@media(prefers-reduced-motion:reduce){.tc-box,.tc-line,.tc-waiting span{animation:none}}

/* Shop Modal */
.tkp{background:linear-gradient(180deg,rgba(16,11,4,.98) 0%,rgba(8,5,2,.99) 100%);padding:14px 20px 12px;width:min(660px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));max-height:min(580px,88vh);box-sizing:border-box;display:flex;flex-direction:column;gap:8px;border:2px solid #ffb642;box-shadow:0 0 0 1px #000,0 8px 32px rgba(0,0,0,.85),0 0 24px rgba(255,182,66,.15) inset;color:#ffb642}
.tkh{display:flex;align-items:flex-end;gap:12px;border-bottom:2px solid #ffb642;padding-bottom:6px;text-transform:uppercase}
.tkh h2{font-size:22px;margin:0;font-weight:400;letter-spacing:.06em;color:#ffe2a8}
.tkh .f{font-size:12px;color:rgba(255,182,66,.7)}.tkh .r{margin-left:auto;font-size:16px;color:#60ff90;text-shadow:0 0 6px rgba(96,255,144,.4)}
.tkb{display:flex;gap:6px;flex-wrap:wrap}.tkb .lv{margin-left:auto}
.tkb button{background:rgba(255,182,66,.08);border:1px solid rgba(255,182,66,.35);color:#ffb642;font:inherit;font-size:13px;padding:5px 14px;cursor:pointer;text-transform:uppercase;letter-spacing:.06em}
.tkb button:hover{background:#ffb642;color:#100b04}
.tks{display:flex;gap:18px;flex:1;min-height:0}
.tks>div{flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(255,182,66,.4) transparent}
.tks h4{font-size:11px;color:#ffcf87;margin:10px 0 4px;padding-bottom:2px;border-bottom:1px solid rgba(255,182,66,.25);font-weight:400;letter-spacing:.1em;text-transform:uppercase}
.tks button{display:flex;width:100%;gap:8px;align-items:center;text-align:left;border:1px solid rgba(255,182,66,.12);background:rgba(255,182,66,.02);color:#ffe2a8;font:inherit;font-size:14px;text-transform:none;padding:5px 8px;margin-bottom:2px;cursor:pointer;transition:all .15s}
.tks button:hover{background:rgba(255,182,66,.18);border-color:#ffb642}
.tks button .c{margin-left:auto;white-space:nowrap;font-weight:400}
.tks button.buy-c .c{color:#ffcf87}.tks button.sell-c .c{color:#60ff90}
.tks .no{opacity:.35;pointer-events:none}
.tks .em{font-size:13px;opacity:.55;padding:12px 0;text-align:center}
</style>`

// The Shop: BUY / SELL / REPAIR tabs, goods in sections, your Backdollars beside each price
function shopUi(ctx, s, it) {
  const barter = skillsOf(s).barter ?? 0
  const disc = (it.state?.discount?.[keyOf(ctx.self ?? {})] ?? 0) + repDisc(s, it)
  const cash = s.cents ?? 0
  const tab = s.shopTab === 'sell' ? 'sell' : s.shopTab === 'repair' && it.state?.role === 'smith' ? 'repair' : 'buy'

  const rows = tab === 'repair' ? [] : tab === 'buy'
    ? Object.entries(it.state?.stock ?? {}).map(([t, [n, base]]) => ({ t, n, p: buyPrice(base, barter, disc) }))
    : sellables(s).map(([t, n, base]) => ({ t, n, p: sellPrice(base, barter) }))

  let list = ''
  for (const [sec, title] of SECTIONS) {
    const here = rows.filter((r) => sectionOf(r.t) === sec).sort((a, b) => a.p - b.p)
    if (!here.length) continue
    list += `<h4>${title}</h4>` + here.map(({ t, n, p }) => {
      const d = describe(t)
      const no = tab === 'buy' && (n < 1 || p * 100 > cash)
      return `<button class="${no ? 'no' : ''} ${tab === 'buy' ? 'buy-c' : 'sell-c'}" ${no?'disabled':''} data-interactive onclick="sendAction('shop',{k:'${tab}',t:'${q(t)}'})" title="${esc(d.info ?? '')}"><span style="color:${d.color}">${esc(d.name)}</span><span style="opacity:.6;font-size:12px">${tab === 'buy' ? (n < 1 ? 'SOLD OUT' : n + ' left') : '×' + n}</span><span class="c">${tab === 'sell' ? '+' : ''}$${p}.00</span></button>`
    }).join('')
  }
  if (tab === 'repair') {
    list = repairables(s).map(([t, c, base]) => {
      const d = describe(t)
      const p = repairPrice(base, c, barter)
      const no = p * 100 > cash
      return `<button class="${no ? 'no' : ''}" ${no?'disabled':''} data-interactive onclick="sendAction('shop',{k:'repair',t:'${q(t)}'})" title="Brings it back to 100%"><span style="color:${d.color}">${esc(d.name)}</span><span style="color:${bandColor(c)};font-size:12px">${Math.round(c)}% ${band(c)}</span><span class="c">$${p}.00</span></button>`
    }).join('')
    if (!list) list = '<div class="em">Nothing in your inventory needs repairing.</div>'
  }
  if (!list) list = `<div class="em">${tab === 'buy' ? 'Shelves are currently bare. Check back later.' : 'They have no interest in your current items.'}</div>`

  const tb = (k, l) => `<button class="${tab===k?'is-active':''}" aria-pressed="${tab===k}" data-interactive onclick="sendAction('talkdo',{k:'stab',t:'${k}'})">${l}</button>`

  return `<div class="tkp">
    <div class="tkh">
      <h2>${esc(nameOf(it))}</h2>
      <span class="f">BARTER ${barter}${disc > 0 ? ` · ${Math.round(disc * 100)}% OFF` : ''}${standing(s, it) ? ` · <b style="color:${tierColor(standing(s, it))}">${tierOf(standing(s, it)).toUpperCase()}</b>` : ''}</span>
      <span class="r">${money(cash)}</span>
    </div>
    <div class="tkb">${tb('buy', 'Buy Goods')}${tb('sell', 'Sell Loot')}${it.state?.role === 'smith' ? tb('repair', 'Repair Gear') : ''}</div>
    <div class="tks"><div data-interactive>${list}</div></div>
    <div class="tkb">
      <button data-interactive onclick="sendAction('talkdo',{k:'back'})">← Back to Conversation</button>
      <button class="lv" data-interactive onclick="sendAction('talkdo',{k:'leave'})">✕ Close</button>
    </div>
  </div>`
}

export function talkUi(ctx, player) {
  const s = player?.state ?? {}
  const id = s.shopOpen ?? s.talkWith
  if (!id) return ''
  const it = ctx.place?.objects?.[id] ?? ctx.getObject?.(id)
  if (!it) return ''

  if (s.shopOpen) {
    return `${CSS}<div class="tkw" data-modal>${shopUi({ self: player }, s, it)}</div>`
  }

  const role = it.state?.role ?? 'survivor'
  const key = player.userId ?? player.id
  const r = it.state?.rapport?.[key] ?? 0
  const who = esc(nameOf(it))
  const feelStatus = feel(r)

  const isCompanion = isMine(it, player)
  const perk = isCompanion ? PERKS[perkOf(it)] : null

  // Process conversation history log
  const rawLog = s.talks?.[String(it.id).split('/').pop()] ?? []
  const log = rawLog.slice(-Math.max(6, T.log ?? 8))

  // Find latest active NPC line and preceding history
  let lastNpcIndex = -1
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i][0] === 'n') {
      lastNpcIndex = i
      break
    }
  }

  const activeIdx = (!s.talkBusy && lastNpcIndex >= 0) ? lastNpcIndex : -1
  const activeLine = activeIdx >= 0 ? log[activeIdx][1] : null
  const historyLines = log.filter((_, idx) => idx !== activeIdx).slice(-5)

  // Render history messages
  const histHtml = historyLines.map(([kind, text]) => {
    if (kind === 'p') {
      return `<div class="tc-hist-line p"><b>YOU:</b> ${esc(text)}</div>`
    }
    if (kind === 'x') return checkBanner(text)
    return `<div class="tc-hist-line n"><b>${who}:</b> ${esc(text)}</div>`
  }).join('')

  const lastPlayer=log.map(row=>row[0]).lastIndexOf('p');
  const latestCheck=log.slice(lastPlayer+1).find(([kind])=>kind==='x');
  // Render current speaker response or busy state
  let nowHtml = ''
  if (s.talkBusy) {
    nowHtml = `<div class="tc-line" role="status" aria-live="polite"><div class="tc-now-txt tc-waiting"><span>.</span><span>.</span><span>.</span></div></div>`
  } else if (activeLine) {
    const asked = activeIdx > 0 && log[activeIdx - 1][0] === 'p' ? log[activeIdx - 1][1] : null // FNV order: the line you picked, then his answer, then your next choices
    nowHtml = `<div class="tc-line${asked ? ' tc-seq' : ''}" id="tcl${activeIdx}-${String(activeLine).length}" aria-live="polite" aria-atomic="true">
      ${asked ? `<div class="tc-you"><b>YOU</b>${esc(asked)}</div>` : ''}${latestCheck ? checkBanner(latestCheck[1]) : ''}<div class="tc-now-txt">${esc(activeLine)}</div>
    </div>`
  } else {
    nowHtml = ''
  }

  // Choices list
  const choices = Array.isArray(s.talkChoices) ? s.talkChoices.slice(0, 5) : []
  const choiceItems = choices.map((c, i) => {
    const txt = typeof c === 'string' ? c : c.text
    const ck = typeof c === 'object' && c.check?.skill ? c.check : null
    const pct = ck ? Math.max(0, Math.min(100, Math.round((T.roll - (ck.difficulty - (skillsOf(s)[ck.skill] ?? 0)) + 1) / T.roll * 100))) : null
    let tag = ''
    let tagCls = 'tc-tag-lore'

    if (typeof c === 'object' && c.tag) {
      const rawTag = String(c.tag).toLowerCase()
      if (rawTag.includes('quest')) {
        tag = `◆ ${c.tag}`
        tagCls = 'tc-tag-quest'
      } else if (ck) {
        tag = `${ck.skill.toUpperCase()} ${pct}%`
      } else {
        tag = c.tag
      }
    } else if (ck) {
      tag = `${ck.skill.toUpperCase()} ${pct}%`
    }

    if (ck) {
      const sk = ck.skill.toLowerCase()
      if (sk === 'speech') tagCls = 'tc-tag-speech'
      else if (sk === 'barter') tagCls = 'tc-tag-barter'
      else if (sk === 'medicine') tagCls = 'tc-tag-med'
      else if (sk === 'survival') tagCls = 'tc-tag-surv'
      else if (sk === 'guns') tagCls = 'tc-tag-guns'
      else if (sk === 'science') tagCls = 'tc-tag-sci'
      else if (sk === 'sneak') tagCls = 'tc-tag-sneak'
    } else if (!tagCls.includes('quest')) {
      const low = (tag || '').toLowerCase()
      if (low.includes('help')) tagCls = 'tc-tag-help'
      else if (low.includes('lore')) tagCls = 'tc-tag-lore'
    }

    const clickAction = `sendAction('talk',{id:'${q(it.id)}',text:'${q(txt)}'${ck ? `,check:{skill:'${q(ck.skill)}',difficulty:${Number(ck.difficulty) || 50}}` : ''}})`

    return `<button class="tc-choice" data-interactive ${s.talkBusy?'disabled':''} onclick="${clickAction}">
      <span class="tc-ch-num">${i + 1}.</span>
      ${tag && tag.toLowerCase() !== 'reply' ? `<span class="tc-ch-tag ${tagCls}">[${esc(tag.replace(/^◆ /, ''))}]</span>` : ''}
      <span class="tc-ch-txt">${esc(txt)}</span>
    </button>`
  }).join('')

  // Contextual system actions
  const sysActions = []
  if (isTrader(it)) {
    sysActions.push(`<button class="tc-act-btn gold" data-interactive onclick="sendAction('talkdo',{k:'trade'})">Trade</button>`)
  }
  if (SVC[role]) {
    sysActions.push(`<button class="tc-act-btn cyan" data-interactive onclick="sendAction('talkdo',{k:'svc'})">${esc(SVC[role])}</button>`)
  }
  if (isCompanion) {
    const isWaiting = it.state.cmd === 'wait'
    const isHoldFire = it.state.cstance === 'hold'
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${isWaiting ? 'cfollow' : 'cwait'}'})">${isWaiting ? 'Follow Me' : 'Wait Here'}</button>`)
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${isHoldFire ? 'cfree' : 'chold'}'})">${isHoldFire ? 'Free Fire' : 'Hold Fire'}</button>`)
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'cgive'})">Give Weapon</button>`)
    if (it.state.gaveArm) {
      sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'ctake'})">Take Weapon</button>`)
    }
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'cdismiss'})">Dismiss</button>`)
  } else if (!isTrader(it) && !['smith', 'quarter'].includes(role) && !it.tags?.includes?.('faceling')) {
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'crecruit'})">Recruit</button>`)
  }

  // NPC special custom offers (e.g. Samantha, Level 5 hotel residents)
  if (Array.isArray(it.state?.offers)) {
    for (const [k, tx] of it.state.offers) {
      sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${q(k)}'})">${esc(tx)}</button>`)
    }
  }

  const factionName = esc(it.state?.factionName ?? faction(it, ctx.self?.place ?? ''))
  const roleName = esc(it.state?.role ?? 'wanderer').toUpperCase()

  const kd = `if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('talkdo',{k:'leave'})}else if(event.target.tagName!=='INPUT'&&(event.key==='ArrowDown'||event.key==='ArrowUp')){const c=Array.from(this.querySelectorAll('.tc-choice:not(:disabled)'));const down=event.key==='ArrowDown';let i=c.indexOf(event.target.closest('.tc-choice'));i=i<0?(down?0:c.length-1):Math.max(0,Math.min(c.length-1,i+(down?1:-1)));if(c[i])c[i].focus();event.preventDefault();event.stopPropagation()}else if(event.target.id!=='tkin'&&event.key>='1'&&event.key<='5'){const c=this.querySelectorAll('.tc-choice');const b=c[parseInt(event.key)-1];if(b)b.click()}`

  return `${CSS}
  <div class="tkw" data-modal tabindex="0" onkeydown="${kd}">
    <div class="tc-who">
      <h2 class="tc-name">${who}</h2>
      <div class="tc-subhead"><span class="tc-badge">${factionName}</span><span class="tc-badge">${roleName}</span>${isCompanion ? `<span class="tc-badge" style="color:#60ff90">${esc(perk?.name ?? 'Companion')} ${Math.round(it.state.loyal ?? 50)}%</span>` : ''}</div>
      <div class="tc-stance">${feelStatus}</div>
    </div>
    ${nowHtml}
    <div class="tc-box" data-interactive>
      <div class="tc-choices-list${activeIdx > 0 && log[activeIdx - 1][0] === 'p' ? ' tc-seq-choices' : ''}" id="tcc${activeIdx}-${String(activeLine ?? '').length}" data-interactive>
        ${choiceItems || '<div style="font-size:16px;opacity:.6;padding:6px 12px">...</div>'}
      </div>
      <div class="tc-foot" data-interactive>
        ${sysActions.join('')}
        ${histHtml ? `<details class="tc-extra" data-interactive><summary>Log</summary><div class="tc-stream">${histHtml}</div></details>` : ''}
        <button class="tc-close-btn" data-interactive onclick="sendAction('talkdo',{k:'leave'})" aria-label="Leave conversation">Leave · Esc</button>
      </div>
    </div>
  </div>`
}
