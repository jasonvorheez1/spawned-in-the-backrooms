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

const MOOD = {
  calm: '#e0c896',
  happy: '#88f070',
  annoyed: '#f2a844',
  angry: '#ff5544',
  scared: '#7cd2ff',
}

const FEEL_COLOR = {
  'HOSTILE': '#ff4444',
  'COLD': '#ff8844',
  'WARY': '#ffd455',
  'OKAY': '#d9c79a',
  'FRIENDLY': '#88e060',
  'TRUSTS YOU': '#40ff90',
}

const feel = (r) => (r <= -60 ? 'HOSTILE' : r <= -25 ? 'COLD' : r < 10 ? 'WARY' : r < 40 ? 'OKAY' : r < 70 ? 'FRIENDLY' : 'TRUSTS YOU')
const SVC = { scout: 'Ask for tactical tips', medic: 'Medical triage & healing', quarter: 'Collect ration supplies', smith: 'Repair damaged gear' }

const CSS = `<style>
@keyframes tcOpen{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes tcPulse{0%,100%{opacity:.4}50%{opacity:1}}
.tkw{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:0 calc(var(--spawn-chrome-reservation-right-inset, 50px) + 12px) 18px;background:linear-gradient(0deg,rgba(0,0,0,.34),transparent 55%);pointer-events:none;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;z-index:90}
.tc-chassis{width:min(780px,100%);max-height:min(78vh,640px);overflow-y:auto;box-sizing:border-box;background:rgba(20,17,13,.97);border:1px solid rgba(218,177,107,.6);border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.55);padding:18px 22px;pointer-events:auto;animation:tcOpen .2s ease-out;color:#eee4d2;scrollbar-width:thin;scrollbar-color:#8e7650 transparent}
.tc-hdr{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.tc-name-grp{min-width:0}.tc-name{font-size:18px;font-weight:650;color:#fff4df;letter-spacing:.01em;margin:0}.tc-subhead{font-size:12px;color:#b8a98f;margin-top:3px}.tc-badge+.tc-badge:before{content:' · ';color:#7f725f}
.tc-rep-grp{margin-left:auto;color:#c2ae88;font-size:12px;white-space:nowrap}.tc-rep-lbl{display:flex;gap:5px}.tc-rep-bar-wrap{display:none}
.tc-close-btn{border:0;background:transparent;color:#cbbda7;font:inherit;font-size:13px;padding:8px;cursor:pointer}.tc-close-btn:hover,.tc-close-btn:focus-visible{color:#fff;background:#473b2a;border-radius:4px;outline:2px solid #d1ad70}
.tc-stream{max-height:140px;overflow-y:auto;scrollbar-width:thin;padding:8px 0;color:#b9aa91}.tc-hist-line{font-size:13px;line-height:1.5;margin:3px 0}.tc-hist-line b{font-weight:600;color:#e6c68f}.tc-chk-banner{font-size:12px;padding:4px 0}.tc-chk-pass{color:#9dd9aa}.tc-chk-fail{color:#ef9a8c}.tc-chk-info{color:#a8c5d8}
.tc-active-line{border-left:2px solid #c9a36c;padding:2px 0 2px 16px;margin:0 0 18px}.tc-now-spk{font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;color:#cbb48f}.tc-now-txt{font-size:18px;line-height:1.45;color:#fff2dd;overflow-wrap:anywhere}.tc-dots span{animation:tcPulse 1.2s infinite}.tc-dots span:nth-child(2){animation-delay:.2s}.tc-dots span:nth-child(3){animation-delay:.4s}
.tc-choices-hdr{font-size:11px;letter-spacing:.1em;color:#b7a487;text-transform:uppercase;margin-bottom:8px}.tc-choices-list{display:flex;flex-direction:column;gap:5px}
.tc-choice{width:100%;background:rgba(255,255,255,.035);border:1px solid rgba(218,177,107,.18);border-radius:4px;color:#f3e5cf;font:inherit;font-size:14px;line-height:1.35;padding:9px 11px;cursor:pointer;display:flex;align-items:baseline;gap:10px;text-align:left}
.tc-choice:hover,.tc-choice:focus-visible{background:rgba(218,177,107,.16);border-color:#d6b77d;outline:2px solid transparent}.tc-ch-num{color:#caa96f;font-size:12px;min-width:16px}.tc-ch-tag{font-size:11px;letter-spacing:.03em;color:#e4bf7f;white-space:nowrap}.tc-ch-txt{flex:1;min-width:0;overflow-wrap:anywhere}
.tc-extra{margin-top:10px;color:#cbb99b;font-size:13px}.tc-extra summary{cursor:pointer;width:fit-content;padding:5px 0}.tc-extra summary:hover,.tc-extra summary:focus-visible{color:#fff1da;outline-color:#d1ad70}
.tc-prompt-bar{display:flex;align-items:center;gap:8px;margin-top:12px}.tc-prompt-inp{flex:1;min-width:0;background:rgba(0,0,0,.26);border:1px solid #75644b;color:#fff4df;font:inherit;font-size:14px;padding:9px 10px;border-radius:4px}.tc-prompt-inp:focus{outline:2px solid #d1ad70;outline-offset:1px}.tc-prompt-inp::placeholder{color:#9b8e79}.tc-send-btn{background:#d5b57f;border:1px solid #d5b57f;border-radius:4px;color:#241b10;font:inherit;font-size:13px;font-weight:650;padding:9px 13px;cursor:pointer}.tc-send-btn:hover,.tc-send-btn:focus-visible{background:#f0d4a1;outline:2px solid #f0d4a1}
.tc-deck{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:12px}.tc-act-btn{background:transparent;border:1px solid #6c5d47;border-radius:4px;color:#decaab;font:inherit;font-size:12px;padding:7px 10px;cursor:pointer}.tc-act-btn:hover,.tc-act-btn:focus-visible{background:#55442d;border-color:#d7b77f;color:#fff;outline:2px solid transparent}.tc-act-btn.gold,.tc-act-btn.cyan{color:#f3d39d;border-color:#aa8957}.tc-social{display:flex;gap:6px;flex-wrap:wrap;padding-top:5px}
@media(max-width:600px){.tkw{padding:0 10px 10px}.tc-chassis{max-height:78vh;padding:14px}.tc-name{font-size:16px}.tc-now-txt{font-size:16px}.tc-choice{padding:8px}.tc-rep-grp{font-size:11px}}
@media(prefers-reduced-motion:reduce){.tc-chassis,.tc-dots span{animation:none}}

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
      return `<button class="${no ? 'no' : ''} ${tab === 'buy' ? 'buy-c' : 'sell-c'}" data-interactive onclick="sendAction('shop',{k:'${tab}',t:'${q(t)}'})" title="${esc(d.info ?? '')}"><span style="color:${d.color}">${esc(d.name)}</span><span style="opacity:.6;font-size:12px">${tab === 'buy' ? (n < 1 ? 'SOLD OUT' : n + ' left') : '×' + n}</span><span class="c">${tab === 'sell' ? '+' : ''}$${p}.00</span></button>`
    }).join('')
  }
  if (tab === 'repair') {
    list = repairables(s).map(([t, c, base]) => {
      const d = describe(t)
      const p = repairPrice(base, c, barter)
      const no = p * 100 > cash
      return `<button class="${no ? 'no' : ''}" data-interactive onclick="sendAction('shop',{k:'repair',t:'${q(t)}'})" title="Brings it back to 100%"><span style="color:${d.color}">${esc(d.name)}</span><span style="color:${bandColor(c)};font-size:12px">${Math.round(c)}% ${band(c)}</span><span class="c">$${p}.00</span></button>`
    }).join('')
    if (!list) list = '<div class="em">Nothing in your inventory needs repairing.</div>'
  }
  if (!list) list = `<div class="em">${tab === 'buy' ? 'Shelves are currently bare. Check back later.' : 'They have no interest in your current items.'}</div>`

  const tb = (k, l) => `<button data-interactive style="${tab === k ? 'background:#ffb642;color:#100b04;box-shadow:0 0 8px rgba(255,182,66,.5)' : ''}" onclick="sendAction('talkdo',{k:'stab',t:'${k}'})">${l}</button>`

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
  const mood = s.talkMood ?? 'calm'
  const col = MOOD[mood] ?? MOOD.calm
  const feelStatus = feel(r)
  const feelCol = FEEL_COLOR[feelStatus] ?? col

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
    if (kind === 'x') {
      const isPass = text.includes('SUCCEEDED') || text.includes('passed')
      const isFail = text.includes('FAILED') || text.includes('failed')
      const cls = isPass ? 'tc-chk-pass' : isFail ? 'tc-chk-fail' : 'tc-chk-info'
      return `<div class="tc-chk-banner ${cls}">${isPass ? '✓ ' : isFail ? '✕ ' : '★ '}${esc(text)}</div>`
    }
    return `<div class="tc-hist-line n"><b>${who}:</b> ${esc(text)}</div>`
  }).join('')

  // Render current speaker response or busy state
  let nowHtml = ''
  if (s.talkBusy) {
    nowHtml = `<div class="tc-active-line">
      <div class="tc-now-spk" style="color:${col}">${who} is thinking</div>
      <div class="tc-now-txt tc-dots" style="color:${col}"><span>·</span> <span>·</span> <span>·</span></div>
    </div>`
  } else if (activeLine) {
    nowHtml = `<div class="tc-active-line">
      <div class="tc-now-txt">${esc(activeLine)}</div>
    </div>`
  } else {
    nowHtml = `<div class="tc-active-line" style="opacity:.6">
      <div class="tc-now-spk" style="color:${col}">${who}</div>
      <div class="tc-now-txt" style="color:${col}">...</div>
    </div>`
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

    return `<button class="tc-choice" data-interactive onclick="${clickAction}">
      <span class="tc-ch-num">${i + 1}.</span>
      ${tag && tag.toLowerCase() !== 'reply' ? `<span class="tc-ch-tag ${tagCls}">${esc(tag)}</span>` : ''}
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

  const socialActions = [
    ['wave', 'Wave'], ['gift', 'Give a gift'], ['dance', 'Dance'], ['insult', 'Insult'],
  ].map(([k, label]) => `<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${k}'})">${label}</button>`).join('')

  const factionName = esc(it.state?.factionName ?? faction(it, ctx.self?.place ?? ''))
  const roleName = esc(it.state?.role ?? 'wanderer').toUpperCase()

  const kd = `if(event.key==='Escape'){sendAction('talkdo',{k:'leave'})}else if(event.target.id!=='tkin'&&event.key>='1'&&event.key<='5'){const c=document.querySelectorAll('.tc-choice');const b=c[parseInt(event.key)-1];if(b)b.click()}`

  return `${CSS}
  <div class="tkw" data-modal tabindex="0" onkeydown="${kd}">
    <div class="tc-chassis" data-interactive>
      <!-- Header & Dossier -->
      <div class="tc-hdr">
        <div class="tc-name-grp">
          <h2 class="tc-name">${who}</h2>
          <div class="tc-subhead">
            <span class="tc-badge">${factionName}</span>
            <span class="tc-badge">${roleName}</span>
            ${isCompanion ? `<span class="tc-badge" style="color:#60ff90">${esc(perk?.name ?? 'Companion')} · ${Math.round(it.state.loyal ?? 50)}% loyalty</span>` : ''}
          </div>
        </div>

        <div class="tc-rep-grp">
          <div class="tc-rep-lbl" style="color:${feelCol}">
            <span>${feelStatus}</span>
            <span>(${r > 0 ? '+' : ''}${Math.round(r)})</span>
          </div>
        </div>

        <button class="tc-close-btn" data-interactive onclick="sendAction('talkdo',{k:'leave'})" aria-label="Leave conversation">Leave · Esc</button>
      </div>

      <!-- Transcript History -->
      ${histHtml ? `<details class="tc-extra" data-interactive><summary>Conversation history</summary><div class="tc-stream">${histHtml}</div></details>` : ''}

      <!-- Live NPC Speech / Busy Indicator -->
      ${nowHtml}

      <!-- Interactive Choices -->
      <div class="tc-choices-hdr">
        <span>Choose a response${choices.length ? ` · 1–${choices.length}` : ''}</span>
      </div>
      <div class="tc-choices-list" data-interactive>
        ${choiceItems || '<div style="font-size:13px;opacity:.6;padding:8px 10px">Ask a question below to continue.</div>'}
      </div>

      <!-- Freeform Text Command Line -->
      <div class="tc-prompt-bar" data-interactive>
        <input id="tkin" class="tc-prompt-inp" data-interactive maxlength="${T.maxText}" autocomplete="off" aria-label="Say something" placeholder="Say something…" onkeydown="if(event.key==='Enter'&&this.value.trim()){event.stopPropagation();sendAction('talk',{id:'${q(it.id)}',text:this.value});this.value=''}else if(event.key==='Escape'){event.stopPropagation();this.blur()}else if(!this.value&&event.key>='1'&&event.key<='5'){event.preventDefault();event.stopPropagation();const b=document.querySelectorAll('.tc-choice')[parseInt(event.key)-1];if(b)b.click()}else{event.stopPropagation()}"/>
        <button class="tc-send-btn" data-interactive onclick="const i=document.getElementById('tkin');if(i&&i.value.trim()){sendAction('talk',{id:'${q(it.id)}',text:i.value});i.value=''}">Send</button>
      </div>

      <!-- Actions & Gestures Deck -->
      ${sysActions.length ? `<div class="tc-deck" data-interactive>${sysActions.join('')}</div>` : ''}
      <details class="tc-extra" data-interactive><summary>More actions</summary><div class="tc-social">${socialActions}</div></details>
    </div>
  </div>`
}
