// The conversation card and the trader's shop (scripts/talk.js writes the state they read).
import T from './lib/data/talk.yml'
import { nameOf, keyOf, isTrader, buyPrice, sellPrice, sellables, repairables, repairPrice, SECTIONS, sectionOf, money } from './lib/npc-talk.js'
import { band, bandColor } from './lib/condition.js'
import { repDisc, titleOf, titleColor, groupOf } from './lib/rep.js'
import { isMine } from './lib/companion.js'
import { describe } from './lib/items.js'
import { skillsOf } from './lib/stats.js'
import { parseCheck, checkOdds } from './lib/skill-check.js'
import { esc, jsStr as q } from './lib/ui-kit.js'

function checkBanner(text, isCurrent = false) {
  const lower = String(text).toLowerCase()
  const kind = lower.includes('succeeded') || lower.includes('passed') ? 'pass' : lower.includes('failed') ? 'fail' : 'info'
  return `<div class="tc-chk-banner tc-chk-${kind}${isCurrent ? ' tc-check-current' : ''}">${esc(text)}</div>`
}
const SVC = { scout: 'Tactical tips', medic: 'Medical triage', quarter: 'Collect rations', smith: 'Repair gear' }

// Minimal fallback styles; primary visual system lives in scripts/lib/ui-theme.js
const CSS = `<style>
.tkw{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:16px calc(var(--spawn-chrome-reservation-right-inset,50px) + 20px) 22px;pointer-events:none;z-index:90}
.tc-chassis{pointer-events:none;width:min(660px,100%);display:flex;flex-direction:column;gap:12px}
.tc-speech-region,.tc-responses-region{pointer-events:auto}
.tc-waiting span{animation:tcPulse 1.1s infinite}.tc-waiting span:nth-child(2){animation-delay:.18s}.tc-waiting span:nth-child(3){animation-delay:.36s}
@keyframes tcPulse{0%,100%{opacity:.35}50%{opacity:1}}
.tkp{display:flex;flex-direction:column;gap:8px;width:min(860px,100%);max-height:80dvh}
.tkh{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid #3f473b;padding-bottom:10px}
.tkh h2{margin:0}.tkh .r{margin-left:auto}
.tkb{display:flex;gap:8px;flex-wrap:wrap}.tkb .lv{margin-left:auto}
.tks{display:flex;flex:1;min-height:0;overflow:auto}.tks>div{flex:1}
.tks button{display:flex;width:100%;gap:10px;align-items:center;text-align:left;padding:8px 10px;cursor:pointer}
.tks button .c{margin-left:auto;white-space:nowrap}
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
      return `<button class="${no ? 'no' : ''} ${tab === 'buy' ? 'buy-c' : 'sell-c'}" ${no ? 'disabled' : ''} data-interactive onclick="sendAction('shop',{k:'${tab}',t:'${q(t)}'})" title="${esc(d.info ?? '')}"><span style="color:${d.color}">${esc(d.name)}</span><span style="opacity:.65;font-size:12px">${tab === 'buy' ? (n < 1 ? 'SOLD OUT' : n + ' left') : '×' + n}</span><span class="c">${tab === 'sell' ? '+' : ''}$${p}.00</span></button>`
    }).join('')
  }
  if (tab === 'repair') {
    list = repairables(s).map(([t, c, base]) => {
      const d = describe(t)
      const p = repairPrice(base, c, barter)
      const no = p * 100 > cash
      return `<button class="${no ? 'no' : ''}" ${no ? 'disabled' : ''} data-interactive onclick="sendAction('shop',{k:'repair',t:'${q(t)}'})" title="Brings it back to 100%"><span style="color:${d.color}">${esc(d.name)}</span><span style="color:${bandColor(c)};font-size:12px">${Math.round(c)}% ${band(c)}</span><span class="c">$${p}.00</span></button>`
    }).join('')
    if (!list) list = '<div class="em">Nothing in your inventory needs repairing.</div>'
  }
  if (!list) list = `<div class="em">${tab === 'buy' ? 'Shelves are currently bare. Check back later.' : 'They have no interest in your current items.'}</div>`

  const tb = (k, l) => `<button class="${tab === k ? 'is-active' : ''}" aria-pressed="${tab === k}" data-interactive onclick="sendAction('talkdo',{k:'stab',t:'${k}'})">${l}</button>`
  const standingTitle = titleOf(s, groupOf(it))

  return `<div class="tkp" onkeydown="if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('talkdo',{k:'leave'})}">
    <div class="tkh">
      <h2>${esc(nameOf(it))}</h2>
      <span class="f">BARTER ${barter}${disc > 0 ? ` · ${Math.round(disc * 100)}% OFF` : ''}${standingTitle !== 'Neutral' ? ` · <b style="color:${titleColor(s, groupOf(it))}">${standingTitle.toUpperCase()}</b>` : ''}</span>
      <span class="r">${money(cash)}</span>
    </div>
    <div class="tkb">${tb('buy', 'Buy Goods')}${tb('sell', 'Sell Loot')}${it.state?.role === 'smith' ? tb('repair', 'Repair Gear') : ''}</div>
    <div class="tks"><div data-interactive>${list}</div></div>
    <div class="tkb">
      <button data-interactive onclick="sendAction('talkdo',{k:'back'})">← Back to Conversation</button>
      <button class="lv" data-interactive onclick="sendAction('talkdo',{k:'leave'})">Close · Esc</button>
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
  const who = esc(nameOf(it))
  const isCompanion = isMine(it, player)

  // Current conversation turn (latest check + active NPC line)
  const rawLog = s.talks?.[String(it.id).split('/').pop()] ?? []
  const log = rawLog.slice(-Math.max(6, T.log ?? 8))

  let lastNpcIndex = -1
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i][0] === 'n') {
      lastNpcIndex = i
      break
    }
  }

  const activeIdx = (!s.talkBusy && lastNpcIndex >= 0) ? lastNpcIndex : -1
  const activeLine = activeIdx >= 0 ? log[activeIdx][1] : null
  const lastPlayer = log.map((row) => row[0]).lastIndexOf('p')
  const latestCheck = log.slice(lastPlayer + 1).find(([kind]) => kind === 'x')
  const speakerLabel = `${who}${isCompanion ? ' · Companion' : ''}`

  // Upper region: subtle floating Fallout-style NPC subtitle over open world
  let nowHtml = ''
  if (s.talkBusy) {
    nowHtml = `<div class="tc-speech-region" role="status" aria-live="polite">
      <div class="tc-speaker-tag">${speakerLabel}</div>
      <div class="tc-now-txt tc-waiting">Waiting for a response<span>.</span><span>.</span><span>.</span></div>
    </div>`
  } else if (activeLine) {
    nowHtml = `<div class="tc-speech-region" id="tcl${activeIdx}-${String(activeLine).length}" aria-live="polite" aria-atomic="true">
      <div class="tc-speaker-tag">${speakerLabel}</div>
      ${latestCheck ? checkBanner(latestCheck[1], true) : ''}
      <div class="tc-now-txt">${esc(activeLine)}</div>
    </div>`
  } else {
    nowHtml = `<div class="tc-speech-region tc-speech-empty">
      <div class="tc-speaker-tag">${speakerLabel}</div>
    </div>`
  }

  // Lower region: Player responses
  const choices = Array.isArray(s.talkChoices) ? s.talkChoices.slice(0, 5) : []
  const choiceItems = choices.map((c, i) => {
    const txt = typeof c === 'string' ? c : c.text
    const ck = typeof c === 'object' ? parseCheck(c) : null
    const odds = ck ? checkOdds(s, ck, T.roll) : null
    const pct = odds ? odds.pct : null
    let tag = ''
    let tagCls = 'tc-tag-lore'

    if (typeof c === 'object' && c.tag) {
      const rawTag = String(c.tag).toLowerCase()
      if (rawTag.includes('quest')) {
        tag = c.tag
        tagCls = 'tc-tag-quest'
      } else if (ck) {
        tag = `${ck.skill.toUpperCase()} ${ck.difficulty} · ${pct}%`
      } else {
        tag = c.tag
      }
    } else if (ck) {
      tag = `${ck.skill.toUpperCase()} ${ck.difficulty} · ${pct}%`
    }

    if (ck) {
      const sk = ck.skill.toLowerCase()
      if (pct < 35) tagCls = 'tc-tag-fail'
      else if (pct === 100) tagCls = 'tc-tag-pass'
      else if (sk === 'speech') tagCls = 'tc-tag-speech'
      else if (sk === 'barter') tagCls = 'tc-tag-barter'
      else if (sk === 'medicine') tagCls = 'tc-tag-med'
      else if (sk === 'survival') tagCls = 'tc-tag-surv'
      else if (sk === 'guns') tagCls = 'tc-tag-guns'
      else if (sk === 'science') tagCls = 'tc-tag-sci'
      else if (sk === 'sneak') tagCls = 'tc-tag-sneak'
      else if (sk === 'repair') tagCls = 'tc-tag-repair'
      else if (sk === 'lockpick') tagCls = 'tc-tag-lockpick'
    }

    const clickAction = `sendAction('talk',{id:'${q(it.id)}',text:'${q(txt)}'${ck ? `,check:{skill:'${q(ck.skill)}',difficulty:${Number(ck.difficulty) || 50}}` : ''}})`
    const unlikelyCls = ck && pct < 35 ? ' is-unlikely' : ''

    return `<button class="tc-choice${unlikelyCls}" data-interactive ${s.talkBusy ? 'disabled' : ''} onclick="${clickAction}">
      <span class="tc-ch-num">${i + 1}.</span>
      ${tag && tag.toLowerCase() !== 'reply' ? `<span class="tc-ch-tag ${tagCls}">[${esc(tag.replace(/^◆ /, ''))}]</span>` : ''}
      <span class="tc-ch-txt">${esc(txt)}</span>
    </button>`
  }).join('')

  // Minimal contextual actions (only shown when relevant)
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
    const orderBtns = [
      `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${isWaiting ? 'cfollow' : 'cwait'}'})">${isWaiting ? 'Follow Me' : 'Wait Here'}</button>`,
      `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${isHoldFire ? 'cfree' : 'chold'}'})">${isHoldFire ? 'Free Fire' : 'Hold Fire'}</button>`,
      `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'cgive'})">Give Weapon</button>`,
      it.state.gaveArm ? `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'ctake'})">Take Weapon</button>` : '',
      `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'cdismiss'})">Dismiss</button>`,
    ].join('')
    sysActions.push(`<details class="tc-orders" data-interactive><summary class="tc-act-btn">Orders</summary><div class="tc-orders-list">${orderBtns}</div></details>`)
  } else if (!isTrader(it) && !['smith', 'quarter'].includes(role) && !it.tags?.includes?.('faceling')) {
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'crecruit'})">Recruit</button>`)
  }

  if (Array.isArray(it.state?.offers)) {
    for (const [k, tx] of it.state.offers) {
      sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${q(k)}'})">${esc(tx)}</button>`)
    }
  }

  const kd = `if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('talkdo',{k:'leave'})}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){const c=Array.from(this.querySelectorAll('.tc-choice:not(:disabled)'));const down=event.key==='ArrowDown';let i=c.indexOf(event.target.closest('.tc-choice'));i=i<0?(down?0:c.length-1):Math.max(0,Math.min(c.length-1,i+(down?1:-1)));if(c[i])c[i].focus();event.preventDefault();event.stopPropagation()}else if(event.key>='1'&&event.key<='5'){const c=this.querySelectorAll('.tc-choice:not(:disabled)');const b=c[parseInt(event.key)-1];if(b)b.click()}`

  return `${CSS}
  <div class="tkw" data-modal tabindex="0" onkeydown="${kd}">
    <section class="tc-chassis" aria-label="Conversation with ${who}">
      ${nowHtml}
      <div class="tc-responses-region" data-interactive>
        <div class="tc-choices-list${activeIdx > 0 && log[activeIdx - 1][0] === 'p' ? ' tc-seq-choices' : ''}" id="tcc${activeIdx}-${String(activeLine ?? '').length}" data-interactive>
          ${choiceItems || '<div class="ui-empty">...</div>'}
        </div>
        <div class="tc-foot" data-interactive>
          ${sysActions.join('')}
          <button class="tc-close-btn" data-interactive onclick="sendAction('talkdo',{k:'leave'})" aria-label="Leave conversation">Esc · Leave</button>
        </div>
      </div>
    </section>
  </div>`
}
