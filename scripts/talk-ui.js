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
@keyframes tcOpen{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
@keyframes tcPulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes tcGlow{0%,100%{box-shadow:0 0 16px rgba(255,182,66,.2)}50%{box-shadow:0 0 24px rgba(255,182,66,.4)}}
@keyframes tcType{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes tcQuest{0%,100%{border-color:#ffd700;box-shadow:0 0 8px rgba(255,215,0,.3)}50%{border-color:#fff275;box-shadow:0 0 14px rgba(255,215,0,.6)}}

.tkw{position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;background:linear-gradient(0deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 38%);pointer-events:none;font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;z-index:90}
.tc-chassis{position:relative;width:min(1180px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 20px)));max-height:min(38vh,340px);box-sizing:border-box;display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(16,11,4,.97) 0%,rgba(8,5,2,.98) 100%);border:2px solid #ffb642;box-shadow:0 0 0 1px #000,0 8px 32px rgba(0,0,0,.8),0 0 24px rgba(255,182,66,.18) inset;padding:8px 16px 7px;pointer-events:auto;animation:tcOpen .3s cubic-bezier(.16,1,.3,1) both;color:#ffb642}
.tc-chassis::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(rgba(0,0,0,.2) 0 1px,transparent 1px 3px);z-index:2}
.tc-corner{position:absolute;width:8px;height:8px;border-color:#ffe2a8;pointer-events:none;z-index:3}
.tc-c-tl{top:-2px;left:-2px;border-top:3px solid #ffe2a8;border-left:3px solid #ffe2a8}
.tc-c-tr{top:-2px;right:-2px;border-top:3px solid #ffe2a8;border-right:3px solid #ffe2a8}
.tc-c-bl{bottom:-2px;left:-2px;border-bottom:3px solid #ffe2a8;border-left:3px solid #ffe2a8}
.tc-c-br{bottom:-2px;right:-2px;border-bottom:3px solid #ffe2a8;border-right:3px solid #ffe2a8}

/* Header */
.tc-hdr{display:flex;align-items:center;gap:12px;padding-bottom:8px;border-bottom:1px solid rgba(255,182,66,.35);position:relative;z-index:3}
.tc-name-grp{display:flex;flex-direction:column;gap:2px}
.tc-name{font-size:20px;font-weight:400;color:#ffe2a8;letter-spacing:.08em;margin:0;text-shadow:0 0 8px rgba(255,182,66,.5)}
.tc-subhead{display:flex;align-items:center;gap:8px;font-size:11px;color:rgba(255,182,66,.65);text-transform:uppercase;letter-spacing:.06em}
.tc-badge{background:rgba(255,182,66,.12);border:1px solid rgba(255,182,66,.3);padding:1px 6px;color:#ffcf87;border-radius:2px}
.tc-rep-grp{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.tc-rep-lbl{font-size:11px;letter-spacing:.12em;font-weight:400;display:flex;align-items:center;gap:6px}
.tc-rep-bar-wrap{width:110px;height:5px;background:#000;border:1px solid rgba(255,182,66,.3);position:relative;overflow:hidden}
.tc-rep-bar-fill{height:100%;transition:width .3s}
.tc-close-btn{background:none;border:1px solid rgba(255,182,66,.35);color:#ffb642;font:inherit;font-size:11px;padding:3px 8px;cursor:pointer;letter-spacing:.1em;text-transform:uppercase;margin-left:8px}
.tc-close-btn:hover{background:#ffb642;color:#100b04;box-shadow:0 0 8px rgba(255,182,66,.6)}

/* Transcript Stream */
.tc-stream{display:flex;flex-direction:column;gap:4px;max-height:52px;overflow-y:auto;padding:2px 0;scrollbar-width:thin;scrollbar-color:rgba(255,182,66,.4) transparent;position:relative;z-index:3}
.tc-hist-line{font-size:13px;line-height:1.35;opacity:.65;transition:opacity .2s}
.tc-hist-line:hover{opacity:1}
.tc-hist-line.p{color:#f5ebcf}.tc-hist-line.p b{color:rgba(255,182,66,.6);font-weight:400}
.tc-hist-line.n{color:#ffcf87}.tc-hist-line.n b{color:rgba(255,182,66,.7);font-weight:400}
.tc-chk-banner{font-size:12px;padding:2px 8px;margin:2px 0;letter-spacing:.08em;text-transform:uppercase;border-left:3px solid;background:rgba(0,0,0,.4);width:fit-content}
.tc-chk-pass{color:#60ff90;border-color:#60ff90;text-shadow:0 0 6px rgba(96,255,144,.4)}
.tc-chk-fail{color:#ff5a4a;border-color:#ff5a4a;text-shadow:0 0 6px rgba(255,90,74,.4)}
.tc-chk-info{color:#7cd2ff;border-color:#7cd2ff}

/* Active Line */
.tc-active-line{padding:8px 10px;background:rgba(255,182,66,.06);border:1px solid rgba(255,182,66,.2);margin:4px 0 8px;position:relative;z-index:3}
.tc-now-spk{font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px;opacity:.75}
.tc-now-txt{font-size:17px;line-height:1.42;color:#ffe2a8;text-shadow:0 0 4px rgba(255,180,50,.35)}
.tc-dots span{animation:tcPulse 1.2s infinite;font-size:22px}.tc-dots span:nth-child(2){animation-delay:.2s}.tc-dots span:nth-child(3){animation-delay:.4s}

/* Choices Grid */
.tc-choices-hdr{font-size:11px;letter-spacing:.16em;color:rgba(255,182,66,.6);text-transform:uppercase;margin-bottom:4px;display:flex;align-items:center;gap:6px;position:relative;z-index:3}
.tc-choices-hdr::after{content:"";flex:1;height:1px;background:rgba(255,182,66,.2)}
.tc-choices-list{display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;max-height:96px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,182,66,.4) transparent;position:relative;z-index:3}
.tc-choice{background:rgba(255,182,66,.03);border:1px solid rgba(255,182,66,.18);color:#ffe2a8;font:inherit;font-size:15px;padding:5px 10px;cursor:pointer;display:flex;align-items:baseline;gap:8px;text-align:left;text-shadow:0 0 2px rgba(255,170,40,.25);transition:all .15s ease}
.tc-choice:hover,.tc-choice:focus{background:linear-gradient(90deg,rgba(255,182,66,.22) 0%,rgba(255,182,66,.08) 100%);border-color:#ffb642;outline:none;transform:translateX(3px);box-shadow:0 0 10px rgba(255,182,66,.2)}
.tc-ch-num{color:#ffb642;font-size:13px;font-weight:400;min-width:20px}
.tc-ch-tag{font-size:12px;padding:1px 6px;border-radius:2px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;font-weight:400}
.tc-tag-quest{background:rgba(255,215,0,.18);border:1px solid #ffd700;color:#fff275;animation:tcQuest 2s infinite}
.tc-tag-speech{background:rgba(255,182,66,.18);border:1px solid #ffb642;color:#ffe2a8}
.tc-tag-barter{background:rgba(96,255,144,.15);border:1px solid #60ff90;color:#9affb8}
.tc-tag-med{background:rgba(124,210,255,.15);border:1px solid #7cd2ff;color:#a8e5ff}
.tc-tag-surv{background:rgba(255,150,70,.18);border:1px solid #ff9646;color:#ffbe90}
.tc-tag-guns{background:rgba(255,90,74,.18);border:1px solid #ff5a4a;color:#ffa094}
.tc-tag-sci{background:rgba(190,140,255,.18);border:1px solid #be8cff;color:#e2caff}
.tc-tag-sneak{background:rgba(215,120,255,.18);border:1px solid #d778ff;color:#ecc2ff}
.tc-tag-lore{background:rgba(140,180,255,.15);border:1px solid #8cb4ff;color:#bdd4ff}
.tc-tag-help{background:rgba(120,220,180,.15);border:1px solid #78dcb4;color:#abf0d4}
.tc-ch-txt{flex:1;line-height:1.35}

/* Prompt Bar */
.tc-prompt-bar{display:flex;align-items:center;gap:8px;padding-top:7px;border-top:1px solid rgba(255,182,66,.25);position:relative;z-index:3}
.tc-prompt-glyph{color:#ffb642;font-size:13px;letter-spacing:.1em;white-space:nowrap}
.tc-prompt-inp{flex:1;background:rgba(0,0,0,.45);border:1px solid rgba(255,182,66,.3);color:#ffe2a8;font:inherit;font-size:14px;padding:5px 8px;outline:none;border-radius:2px}
.tc-prompt-inp:focus{border-color:#ffb642;box-shadow:0 0 6px rgba(255,182,66,.3)}
.tc-prompt-inp::placeholder{color:rgba(255,182,66,.35)}
.tc-send-btn{background:rgba(255,182,66,.12);border:1px solid rgba(255,182,66,.4);color:#ffe2a8;font:inherit;font-size:12px;padding:5px 12px;cursor:pointer;letter-spacing:.08em;text-transform:uppercase}
.tc-send-btn:hover{background:#ffb642;color:#100b04}

/* Action Deck */
.tc-deck{display:flex;gap:5px;flex-wrap:wrap;align-items:center;padding-top:5px;position:relative;z-index:3}
.tc-act-btn{background:none;border:1px solid rgba(255,182,66,.3);color:#ffb642;font:inherit;font-size:11px;padding:3px 9px;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;transition:all .15s}
.tc-act-btn:hover{background:rgba(255,182,66,.2);border-color:#ffb642;color:#fff}
.tc-act-btn.gold{border-color:#ffd700;color:#ffd700;background:rgba(255,215,0,.1)}
.tc-act-btn.gold:hover{background:#ffd700;color:#100b04}
.tc-act-btn.cyan{border-color:#7cd2ff;color:#7cd2ff;background:rgba(124,210,255,.1)}
.tc-act-btn.cyan:hover{background:#7cd2ff;color:#100b04}
.tc-act-btn.leave{margin-left:auto;border-color:rgba(255,90,74,.4);color:#ff9080}
.tc-act-btn.leave:hover{background:#ff5a4a;color:#fff}

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
  const repPct = Math.max(0, Math.min(100, Math.round((r + 100) / 2)))

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
      <div class="tc-now-spk" style="color:${col}">${who} · FORMULATING RESPONSE...</div>
      <div class="tc-now-txt tc-dots" style="color:${col}"><span>◉</span> <span>◉</span> <span>◉</span></div>
    </div>`
  } else if (activeLine) {
    nowHtml = `<div class="tc-active-line">
      <div class="tc-now-spk" style="color:${col}">${who} [${mood.toUpperCase()}]</div>
      <div class="tc-now-txt" style="color:${col}">"${esc(activeLine)}"</div>
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
      <span class="tc-ch-num">[${i + 1}]</span>
      ${tag ? `<span class="tc-ch-tag ${tagCls}">${esc(tag)}</span>` : ''}
      <span class="tc-ch-txt">${esc(txt)}</span>
    </button>`
  }).join('')

  // Contextual system actions
  const sysActions = []
  if (isTrader(it)) {
    sysActions.push(`<button class="tc-act-btn gold" data-interactive onclick="sendAction('talkdo',{k:'trade'})">🛒 Trade Goods</button>`)
  }
  if (SVC[role]) {
    sysActions.push(`<button class="tc-act-btn cyan" data-interactive onclick="sendAction('talkdo',{k:'svc'})">✚ ${esc(SVC[role])}</button>`)
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
    sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'crecruit'})">🤝 Recruit</button>`)
  }

  // NPC special custom offers (e.g. Samantha, Level 5 hotel residents)
  if (Array.isArray(it.state?.offers)) {
    for (const [k, tx] of it.state.offers) {
      sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'${q(k)}'})">${esc(tx)}</button>`)
    }
  }

  // Social gestures
  sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'wave'})">👋 Wave</button>`)
  sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'gift'})">🎁 Gift</button>`)
  sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'dance'})">💃 Dance</button>`)
  sysActions.push(`<button class="tc-act-btn" data-interactive onclick="sendAction('talkdo',{k:'insult'})">⚡ Insult</button>`)
  sysActions.push(`<button class="tc-act-btn leave" data-interactive onclick="sendAction('talkdo',{k:'leave'})">🚪 Leave</button>`)

  const factionName = esc(it.state?.factionName ?? faction(it, ctx.self?.place ?? ''))
  const roleName = esc(it.state?.role ?? 'wanderer').toUpperCase()
  const hpCurr = Math.max(0, Math.round(it.state?.hp ?? 100))
  const hpMax = Math.round(it.state?.maxHp ?? 100)

  const kd = `if(event.key==='Escape'){sendAction('talkdo',{k:'leave'})}else if(event.target.id!=='tkin'&&event.key>='1'&&event.key<='5'){const c=document.querySelectorAll('.tc-choice');const b=c[parseInt(event.key)-1];if(b)b.click()}`

  return `${CSS}
  <div class="tkw" data-modal tabindex="0" onkeydown="${kd}">
    <div class="tc-chassis">
      <div class="tc-corner tc-c-tl"></div>
      <div class="tc-corner tc-c-tr"></div>
      <div class="tc-corner tc-c-bl"></div>
      <div class="tc-corner tc-c-br"></div>

      <!-- Header & Dossier -->
      <div class="tc-hdr">
        <div class="tc-name-grp">
          <h2 class="tc-name">${who}</h2>
          <div class="tc-subhead">
            <span class="tc-badge">${factionName}</span>
            <span class="tc-badge">${roleName}</span>
            <span>HP ${hpCurr}/${hpMax}</span>
            ${isCompanion ? `<span class="tc-badge" style="color:#60ff90">⭐ ${esc(perk?.name ?? 'Companion')} (${Math.round(it.state.loyal ?? 50)}% Loyalty)</span>` : ''}
          </div>
        </div>

        <div class="tc-rep-grp">
          <div class="tc-rep-lbl" style="color:${feelCol}">
            <span>${feelStatus}</span>
            <span>(${r > 0 ? '+' : ''}${Math.round(r)})</span>
          </div>
          <div class="tc-rep-bar-wrap">
            <div class="tc-rep-bar-fill" style="width:${repPct}%;background:${feelCol}"></div>
          </div>
        </div>

        <button class="tc-close-btn" data-interactive onclick="sendAction('talkdo',{k:'leave'})">✕ [ESC]</button>
      </div>

      <!-- Transcript History -->
      ${histHtml ? `<div class="tc-stream" data-interactive><div style="margin-top:auto"></div>${histHtml}</div>` : ''}

      <!-- Live NPC Speech / Busy Indicator -->
      ${nowHtml}

      <!-- Interactive Choices -->
      <div class="tc-choices-hdr">
        <span>Responses [Press 1-${Math.max(1, choices.length)} or Click]</span>
      </div>
      <div class="tc-choices-list" data-interactive>
        ${choiceItems || '<div style="font-size:13px;opacity:.6;padding:8px 10px">No scripted responses available. Use the command prompt below.</div>'}
      </div>

      <!-- Freeform Text Command Line -->
      <div class="tc-prompt-bar" data-interactive>
        <span class="tc-prompt-glyph">PROMPT &gt;</span>
        <input id="tkin" class="tc-prompt-inp" data-interactive maxlength="${T.maxText}" autocomplete="off" placeholder="Type a custom inquiry or message..." onkeydown="if(event.key==='Enter'&&this.value.trim()){event.stopPropagation();sendAction('talk',{id:'${q(it.id)}',text:this.value});this.value=''}else if(event.key==='Escape'){this.blur()}else if(!this.value&&event.key>='1'&&event.key<='5'){event.preventDefault();event.stopPropagation();const b=document.querySelectorAll('.tc-choice')[parseInt(event.key)-1];if(b)b.click()}else{event.stopPropagation()}"/>
        <button class="tc-send-btn" data-interactive onclick="const i=document.getElementById('tkin');if(i&&i.value.trim()){sendAction('talk',{id:'${q(it.id)}',text:i.value});i.value=''}">Send [↵]</button>
      </div>

      <!-- Actions & Gestures Deck -->
      <div class="tc-deck" data-interactive>
        ${sysActions.join('')}
      </div>
    </div>
  </div>`
}
