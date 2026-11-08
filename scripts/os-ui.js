// Back OS(tm): the screen. A Windows 95 look with only the yellow left (the Object-94 logo): gray bevelled windows, gold title bars, a taskbar with
// a Start button. Drawn from player.state.os (scripts/os.js). Buttons send the 'os' action.
import O from './lib/data/os.yml'
import { mailsOf, filesOf, entriesOf, entryById, forumOf, binOf, PROFILE } from './lib/os.js'

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const A = (o) => `sendAction('os',${JSON.stringify(o).replace(/"/g, "'")})`
const LOGO = (n = 1) => `<svg width="${46 * n}" height="${40 * n}" viewBox="0 0 46 40"><g stroke="#000" stroke-width="1.4"><path d="M12 6 L24 8 L23 20 L11 18Z" fill="#f2c200"/><path d="M26 8.5 L40 10 L38 23 L25 21Z" fill="#f2c200"/><path d="M10.5 21 L22.5 23 L21.5 35 L9.5 33Z" fill="#f2c200"/><path d="M24.5 23.5 L37.5 25.5 L36 38 L23.5 36Z" fill="#f2c200"/></g><g fill="#c98a00"><rect x="1" y="9" width="3" height="3"/><rect x="5" y="12" width="3" height="3"/><rect x="2" y="17" width="3" height="3"/><rect x="6" y="22" width="3" height="3"/><rect x="2" y="27" width="3" height="3"/></g><g fill="#000"><rect x="4" y="5" width="3" height="3"/><rect x="8" y="9" width="2" height="2"/><rect x="1" y="21" width="3" height="3"/><rect x="5" y="30" width="3" height="3"/></g></svg>`
const hashN = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
const CSS = `<style>
#os{position:fixed;inset:0;z-index:70;background:radial-gradient(circle at center,rgba(16,14,8,0.88) 0%,rgba(5,4,2,0.97) 100%);display:flex;align-items:center;justify-content:center;font-family:'MS Sans Serif',Tahoma,'Segoe UI',Arial,sans-serif;color:#000;pointer-events:auto;user-select:none}
#os .bezel{background:#2e2c26;border-radius:14px;padding:16px 16px 10px;box-shadow:0 24px 60px rgba(0,0,0,0.88),inset 0 2px 2px rgba(255,255,255,0.14),inset 0 -3px 8px rgba(0,0,0,0.65);display:flex;flex-direction:column;width:min(880px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 16px)))}
#os .scr{width:100%;height:min(580px,calc(100vh - 64px));background:#584700;border:4px solid #1a1916;border-radius:8px;box-shadow:inset 0 0 50px rgba(0,0,0,0.65),inset 0 0 12px rgba(0,0,0,0.9),0 0 2px rgba(0,0,0,0.8);display:flex;flex-direction:column;position:relative;overflow:hidden}
#os .scr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.14) 0 1px,transparent 1px 3px),radial-gradient(ellipse at center,transparent 65%,rgba(0,0,0,0.32) 100%);pointer-events:none;z-index:4}
#os .bezel-chin{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 2px;font-family:'Geist Pixel Square',monospace,sans-serif;font-size:10px;letter-spacing:0.15em;color:#8a857a;text-shadow:0 1px 0 rgba(0,0,0,0.8)}
#os .bezel-chin .brand{display:flex;align-items:center;gap:6px;font-weight:700;color:#b2ada0}
#os .bezel-chin .led-box{display:flex;align-items:center;gap:6px;font-size:9px}
#os .bezel-chin .led{width:7px;height:7px;border-radius:50%;background:#39ff14;box-shadow:0 0 6px #39ff14,inset 0 1px 1px #fff}
#os .boot{flex:1;background:#000;color:#f2c200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:monospace}
#os .boot .ln{opacity:0;animation:osln .01s forwards;font-size:13px;letter-spacing:.06em}
@keyframes osln{to{opacity:1}}
#os .boot .bar{width:260px;height:14px;border:2px solid #f2c200;padding:2px;margin-top:10px}
#os .boot .bar i{display:block;height:100%;background:repeating-linear-gradient(90deg,#f2c200 0 14px,#000 14px 18px);animation:osbar 3.1s linear forwards}
@keyframes osbar{from{width:0}to{width:100%}}
#os .boot h1{font:700 40px Georgia,serif;color:#fff;margin:6px 0 0;text-shadow:2px 2px 0 #000}
#os .desk{flex:1;display:flex;flex-direction:column;background:#655400;min-height:0;background-image:radial-gradient(circle at 50% 50%,#6f5d00 0%,#544500 100%)}
#os .area{flex:1;position:relative;min-height:0;padding:12px}
#os .icons{display:flex;flex-direction:column;flex-wrap:wrap;gap:16px;height:100%;align-content:flex-start}
#os .ic{width:80px;text-align:center;cursor:pointer;color:#fff;font-size:11px;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;background:none;border:1px solid transparent;padding:3px 2px;border-radius:2px}
#os .ic:hover{background:rgba(255,255,255,0.12);outline:1px dotted rgba(255,255,255,0.6)}
#os .ic .g{font-size:32px;display:block;line-height:1.2;margin-bottom:2px}
#os .win{position:absolute;inset:12px;background:#c0c0c0;border:2px solid;border-color:#dfdfdf #404040 #404040 #dfdfdf;box-shadow:inset 1px 1px 0 #fff,inset -1px -1px 0 #808080,2px 2px 6px rgba(0,0,0,0.5);display:flex;flex-direction:column;min-height:0}
#os .tb{background:linear-gradient(90deg,#785400,#b8860b 45%,#f2c200);color:#000;font-weight:700;font-size:12px;letter-spacing:0.02em;padding:3px 5px;display:flex;align-items:center;gap:6px}
#os .tb span{flex:1;text-shadow:0 1px 0 rgba(255,255,255,0.4)}
#os .tb button{width:18px;height:16px;font:700 11px Tahoma,Arial;background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:inset 1px 1px 0 #dfdfdf;padding:0;line-height:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}
#os .tb button:active{border-color:#404040 #fff #fff #404040;box-shadow:none;padding:1px 0 0 1px}
#os .tb button.close{font-size:10px;margin-left:2px}
#os .body{flex:1;display:flex;min-height:0;background:#fff;margin:3px;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px 0 #000,inset -1px -1px 0 #dfdfdf;overflow:hidden}
#os .lst{width:230px;overflow:auto;border-right:2px solid #808080;background:#fff;scrollbar-width:thin}
#os .lst button{display:block;width:100%;text-align:left;font:12px Tahoma,Arial;padding:6px 8px;border:0;border-bottom:1px solid #e2e2e2;background:#fff;cursor:pointer;color:#000}
#os .lst button.on,#os .lst button:hover{background:#f2c200;font-weight:600}
#os .lst small{display:block;color:#666;font-size:10.5px}
#os .rd{flex:1;overflow:auto;padding:12px 14px;font-size:13px;line-height:1.45}
#os .rd h3{margin:0 0 6px;font-size:16px}
#os .rd .meta{color:#555;font-size:11px;margin-bottom:8px}
#os .rd .weak{margin-top:12px;padding:8px 10px;background:#fff6c4;border:1px solid #b89a00;font-size:12px;box-shadow:inset 0 0 8px rgba(184,154,0,0.15)}
#os .tabs{display:flex;gap:2px;padding:3px 3px 0;background:#c0c0c0}
#os .tabs button{font:11px Tahoma,Arial;padding:3px 10px;border:2px solid;border-color:#fff #404040 #c0c0c0 #fff;background:#c0c0c0;cursor:pointer}
#os .tabs button.on{background:#f2c200;font-weight:700;border-bottom-color:#f2c200}
#os .term{flex:1;background:#000;color:#ffbe1a;font:13px/1.4 'Courier New',Consolas,monospace;text-shadow:0 0 5px rgba(255,190,26,0.6);padding:10px 12px;overflow:auto;display:flex;flex-direction:column;justify-content:flex-end}
#os .term div{white-space:pre-wrap}
#os .cmd{display:flex;background:#000;border-top:1px solid #ffbe1a44}
#os .cmd input{flex:1;background:#000;color:#ffbe1a;text-shadow:0 0 5px rgba(255,190,26,0.6);border:0;outline:0;font:13px/1.4 'Courier New',Consolas,monospace;padding:6px 10px}
#os .q{display:flex;gap:4px;flex-wrap:wrap;padding:6px;background:#000}
#os .q button{font:11px monospace;background:#151206;color:#ffbe1a;border:1px solid #ffbe1a66;padding:2px 8px;cursor:pointer}
#os .q button:hover{background:#ffbe1a;color:#000}
#os .task{height:30px;background:#c0c0c0;border-top:2px solid #fff;display:flex;align-items:center;gap:6px;padding:2px 4px;font-size:12px}
#os .task .st{display:flex;align-items:center;gap:5px;font-weight:700;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:inset 1px 1px 0 #dfdfdf;padding:1px 10px 1px 4px;cursor:pointer;background:#c0c0c0}
#os .task .st:active{border-color:#404040 #fff #fff #404040;box-shadow:none}
#os .task .tw{border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px 0 #000;padding:2px 8px;font-size:12px;background:#d8d8d8;font-weight:600}
#os .task .clk{margin-left:auto;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px 0 #000;padding:2px 8px;font-family:monospace;font-size:11px}
#os .btn{font:12px Tahoma,Arial;padding:4px 16px;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:inset 1px 1px 0 #dfdfdf;background:#c0c0c0;cursor:pointer;color:#000}
#os .btn:active{border-color:#404040 #fff #fff #404040;box-shadow:none;padding:5px 15px 3px 17px}
#os .login{flex:1;display:flex;align-items:center;justify-content:center;background:#655400}
#os .login .win{position:static;width:380px;inset:auto}
#os .login input{width:100%;padding:4px;font:13px monospace;box-sizing:border-box;border:2px solid;border-color:#808080 #fff #fff #808080}
#os .smenu{position:absolute;left:4px;bottom:32px;width:230px;background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;box-shadow:2px 2px 0 #000;display:flex;z-index:3}
#os .smenu .side{width:24px;background:linear-gradient(0deg,#785400,#f2c200);color:#000;font:700 13px Tahoma;writing-mode:vertical-rl;transform:rotate(180deg);padding:6px 3px;letter-spacing:.06em}
#os .smenu .items{flex:1;display:flex;flex-direction:column;padding:2px}
#os .smenu button{display:flex;gap:8px;align-items:center;text-align:left;font:12px Tahoma,Arial;padding:6px 8px;border:0;background:none;cursor:pointer;color:#000}
#os .smenu button:hover{background:#785400;color:#fff}
#os .smenu hr{border:0;border-top:1px solid #808080;border-bottom:1px solid #fff;margin:3px 2px}
#os .off{flex:1;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font:600 22px Tahoma,Arial;color:#f2c200;text-align:center}
#os .off .a{animation:osfade .4s forwards}#os .off .b{opacity:0;animation:osfade .3s 1.1s forwards}
@keyframes osfade{from{opacity:0}to{opacity:1}}
#os .scr.dying::before{content:'';position:absolute;inset:0;background:#000;z-index:5;animation:oscrt 2.2s ease-in forwards;pointer-events:none}
@keyframes oscrt{0%,70%{opacity:0;transform:scaleY(1)}85%{opacity:1;transform:scaleY(1)}100%{opacity:1;transform:scaleY(.004)}}
#os .props{display:grid;grid-template-columns:110px 1fr;gap:4px 12px;font-size:12px;margin:8px 0}
#os .props b{font-weight:400;color:#444}
#os .chg{font:12px/1.5 monospace;background:#fffbe6;border:1px solid #b89a00;padding:8px;margin-top:8px}
#os textarea{flex:1;border:0;outline:0;resize:none;font:13px/1.5 'Courier New',monospace;padding:12px 14px;background:#fefdf6;color:#181610;box-shadow:inset 0 0 25px rgba(184,154,0,0.1)}
#os .hack-wrap{flex:1;background:#0d0902;color:#ffbe1a;font-family:'Courier New',Consolas,monospace;font-size:13px;line-height:1.35;padding:12px 16px;display:flex;flex-direction:column;min-height:0;box-shadow:inset 0 0 50px rgba(0,0,0,0.8),inset 0 0 20px rgba(255,190,26,0.12)}
#os .hack-hdr{border-bottom:2px solid #ffbe1a66;padding-bottom:8px;margin-bottom:8px}
#os .hack-grid{flex:1;display:flex;gap:14px;min-height:0;overflow:hidden}
#os .hack-col{display:flex;flex-direction:column;justify-content:space-between;font-family:'Courier New',Consolas,monospace;font-size:12.5px;letter-spacing:0.04em}
#os .hack-line{white-space:pre}
#os .hack-addr{color:#b8860b;margin-right:6px;user-select:none;font-weight:bold}
#os .hack-word,#os .hack-bracket{cursor:pointer;padding:0 1px;border-radius:1px}
#os .hack-word:hover,#os .hack-bracket:hover{background:#ffbe1a;color:#000;font-weight:900;box-shadow:0 0 8px #ffbe1a}
#os .hack-log{flex:1;min-width:210px;border-left:1px solid #ffbe1a44;padding-left:12px;display:flex;flex-direction:column;justify-content:flex-end;font-size:11.5px;line-height:1.45;overflow:hidden}
#os .hack-cursor{margin-top:6px;color:#ffc857;animation:osln 0.6s infinite alternate}
#os .hack-footer{margin-top:8px;padding-top:6px;border-top:1px solid #ffbe1a44;display:flex;justify-content:space-between;align-items:center}
#os .hack-lockout{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}
</style>`

const ICONS = [['mail', '✉', 'Backmail'], ['db', '📚', 'The Database'], ['files', '🗂', 'BACKDRIVE'], ['forum', '💬', 'Backdoor'], ['term', '⌨', 'Terminal'], ['notes', '📝', 'Notepad'], ['bin', '🗑', 'Recycle Bin'], ['about', '💾', 'This Computer']]
const TITLE = { ctrl: 'Security Panel', mail: 'Backmail', db: 'The Database', files: 'BACKDRIVE', forum: 'Backdoor Forum', term: 'Terminal', about: 'System Properties', notes: 'Notepad', bin: 'Recycle Bin' }

function chrome(title, inner) {
  return `<div class="win"><div class="tb">${LOGO(0.38)}<span>${esc(title)}</span><button onclick="${A({ k: 'app', v: 'desktop' })}" title="Minimize">_</button><button class="close" onclick="${A({ k: 'app', v: 'desktop' })}" title="Close">✕</button></div>${inner}</div>`
}
function list(items, sel, key, fn) { return `<div class="lst">${items.map((it) => `<button class="${fn.id(it) === sel ? 'on' : ''}" onclick="${A({ k: key, [key === 'file' ? 'v' : 'id']: fn.id(it) })}">${fn.html(it)}</button>`).join('')}</div>` }

export function osUi(ctx, player) {
  const s = player.state ?? {}, os = s.os
  if (!os) return ''
  const admin = os.user === 'admin', now = ctx.now()
  let body = ''
  if (os.app === 'off') {
    body = `<div class="off"><div class="a">Back OS is shutting down...</div><div class="b" style="font-size:16px">It is now safe to stand up.</div></div>`
    return CSS + `<div id="os" data-modal><div class="bezel"><div class="scr dying">${body}</div><div class="bezel-chin"><div class="brand">${LOGO(0.28)} OBJECT-94 TERMINAL</div><div class="led-box"><span class="led" style="background:#444;box-shadow:none"></span><span>STANDBY</span></div></div></div></div>`
  }
  if (os.app === 'boot') {
    const t = Math.max(0, (now - os.at) / 1000)
    const lines = O.boot.map((l, i) => `<div class="ln" style="animation-delay:${(i * 0.45 - t).toFixed(2)}s">${esc(l)}</div>`).join('')
    body = `<div class="boot">${LOGO(2.6)}<h1>Back OS<sup style="font-size:14px">™</sup></h1>${lines}<div class="bar"><i style="animation-delay:-${Math.min(t, 3.1).toFixed(2)}s"></i></div></div>`
  } else if (os.app === 'login') {
    body = `<div class="login">${chrome('Welcome to Back OS', `<div style="padding:14px 16px;background:#c0c0c0"><div style="display:flex;gap:14px;align-items:center">${LOGO(1)}<div style="font-size:13px"><b>${esc(O.profiles[PROFILE(os.host)].owner)}</b><br>${esc(os.host)}<br><span style="color:#444">This machine asks for a password.</span></div></div>
      <div style="margin:12px 0 4px;font-size:12px">Password:</div><input id="pw" type="password" data-interactive autocomplete="off" maxlength="40" onkeydown="if(event.key==='Enter')${A({ k: 'pw', v: '__PW__' }).replace("'__PW__'", 'this.value')}">
      ${os.err ? `<div style="color:#a00;font-size:12px;margin-top:6px">${esc(os.err)}</div>` : ''}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" onclick="${A({ k: 'hack' })}">Hack...</button><button class="btn" onclick="${A({ k: 'login' })}">Guest</button><button class="btn" onclick="${A({ k: 'close' })}">Shut down</button></div></div>`)}</div>`
  } else if (os.app === 'hack' && os.hack) {
    const h = os.hack
    if (h.lockedOut && now >= h.lockedUntil) {
      h.lockedOut = false
      h.attempts = h.maxAttempts
      h.log.push('> SYSTEM REBOOT COMPLETE.')
      h.log.push('> LOCKOUT CLEARED. PROCEED.')
    }
    const isLockedOut = h.lockedOut && h.lockedUntil > now
    const lockoutSec = Math.max(0, Math.ceil((h.lockedUntil - now) / 1000))

    const renderTok = (t) => {
      if (t.type === 'text') return `<span>${esc(t.text)}</span>`
      if (t.type === 'word') {
        if (h.dudsRemoved.includes(t.word)) return `<span style="opacity:0.25">${esc('.'.repeat(t.word.length))}</span>`
        return `<span class="hack-word" onclick="${A({ k: 'hack_guess', v: t.word })}">${esc(t.word)}</span>`
      }
      if (t.type === 'bracket') {
        if (h.bracketsUsed.includes(t.bracketId)) return `<span style="opacity:0.25">${esc('.'.repeat(t.text.length))}</span>`
        return `<span class="hack-bracket" onclick="${A({ k: 'hack_bracket', v: t.bracketId })}">${esc(t.text)}</span>`
      }
      return ''
    }

    const renderLine = (l) => `<div class="hack-line"><span class="hack-addr">${esc(l.addr)}</span> ${l.tokens.map(renderTok).join('')}</div>`

    const col0 = h.lines.slice(0, 16)
    const col1 = h.lines.slice(16, 32)
    const attemptsBlocks = Array.from({ length: h.maxAttempts }, (_, i) => i < h.attempts ? '■' : '□').join(' ')

    let mainContent = ''
    if (isLockedOut) {
      mainContent = `<div class="hack-lockout">
        <div style="font-size:24px;font-weight:900;letter-spacing:2px;color:#ff4444;margin-bottom:12px">TERMINAL LOCKED OUT</div>
        <div style="font-size:15px;color:#ffbe1a;margin-bottom:8px">SECURITY TAMPER PROTOCOL ENGAGED</div>
        <div style="font-size:13px;opacity:0.8;margin-bottom:16px">PLEASE CONTACT SYSTEM ADMINISTRATOR</div>
        <div style="font-size:18px;color:#ffc857;letter-spacing:1px">SYSTEM REBOOT IN: ${lockoutSec}s</div>
        <button class="btn" style="margin-top:20px" onclick="${A({ k: 'hack_abort' })}">Return to Login</button>
      </div>`
    } else {
      mainContent = `
        <div class="hack-grid">
          <div class="hack-col">${col0.map(renderLine).join('')}</div>
          <div class="hack-col">${col1.map(renderLine).join('')}</div>
          <div class="hack-log">
            <div style="font-weight:bold;margin-bottom:6px;border-bottom:1px solid #ffbe1a44;padding-bottom:4px">STATUS MONITOR</div>
            ${h.log.slice(-10).map((msg) => `<div>${esc(msg)}</div>`).join('')}
            <div class="hack-cursor">> <span>_</span></div>
          </div>
        </div>
        <div class="hack-footer">
          <div style="font-size:11.5px;opacity:0.85">> SELECT CANDIDATE PASSWORD OR BRACKETS (...) [...] {...} <...> TO PURGE DUDS</div>
          <button class="btn" onclick="${A({ k: 'hack_abort' })}">Abort Intrusion</button>
        </div>
      `
    }

    body = `<div class="hack-wrap">
      <div class="hack-hdr">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><b>ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL</b><br><span style="font-size:11px;opacity:0.85">BACK OS(TM) OBJECT-94 INTRUSION SYSTEM</span></div>
          <div style="text-align:right">HOST: <b>${esc(os.host)}</b><br><span style="font-size:11px;color:#ffc857">[SCIENCE ${h.scienceNeed} LOCK]</span></div>
        </div>
        <div style="margin-top:8px;font-size:14px;font-weight:700;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center">
          <span>${h.attempts} ATTEMPT(S) LEFT: <span style="letter-spacing:3px">${attemptsBlocks}</span></span>
          <span style="font-size:12px;opacity:0.8">PASSWORD LENGTH: ${h.wordLength}</span>
        </div>
      </div>
      ${mainContent}
    </div>`
  } else {
    let win = ''
    if (os.app === 'mail') {
      const ml = mailsOf(os.host, admin), m = ml.find((x) => x.id === os.sel) ?? null
      win = chrome(`Backmail · ${os.host}`, `<div class="body">${list(ml, os.sel, 'mail', { id: (x) => x.id, html: (x) => `<b>${esc(x.from)}</b><small>${esc(x.subj)}</small>` })}<div class="rd">${m ? `<h3>${esc(m.subj)}</h3><div class="meta">From: ${esc(m.from)}</div>${esc(m.body)}` : '<div class="meta">Select a message.</div>'}</div></div>`)
    } else if (os.app === 'db') {
      const all = entriesOf(admin), cats = ['All', ...new Set(all.map((e) => e.cat))], cat = os.cat && os.cat !== 'All' ? os.cat : '', es = cat ? all.filter((e) => e.cat === cat) : all, e = os.sel ? entryById(os.sel) : null
      win = chrome('The Database · M.E.G.', `<div class="tabs">${cats.map((c) => `<button class="${(cat || 'All') === c ? 'on' : ''}" onclick="${A({ k: 'cat', v: c })}">${esc(c)}</button>`).join('')}</div><div class="body">${list(es, os.sel, 'entry', { id: (x) => x.id, html: (x) => `${esc(x.title)}<small>${esc(x.cat)} · ${esc(x.sc)}</small>` })}<div class="rd">${e ? `<h3>${esc(e.title)}</h3><div class="meta">Survival class: <b>${esc(e.sc)}</b>${e.restricted ? ' · <span style="color:#b71c1c;font-weight:700">[RESTRICTED]</span>' : ''}</div>${esc(e.text)}${e.weak ? (admin ? `<div class="weak"><b>Restricted notes:</b> ${esc(e.weak)}</div>` : '<div class="weak">Restricted notes hidden. Admin access required.</div>') : ''}` : '<div class="meta">Select an entry. Reading the creature pages gives you an edge.</div>'}</div></div>`)
    } else if (os.app === 'files') {
      const fs = filesOf(os.host), f = fs.find((x) => x.name === os.sel) ?? null
      win = chrome(`BACKDRIVE · ${os.host}`, `<div class="body">${list(fs, os.sel, 'file', { id: (x) => x.name, html: (x) => `📄 ${esc(x.name)}` })}<div class="rd">${f ? `<h3>${esc(f.name)}</h3><div style="white-space:pre-wrap;font-family:monospace">${esc(f.text)}</div>` : '<div class="meta">Select a file.</div>'}</div></div>`)
    } else if (os.app === 'forum') {
      win = chrome('Backdoor Forum', `<div class="body"><div class="rd">${forumOf(os.host).map((t) => `<h3>${esc(t.title)}</h3><div class="meta">started by ${esc(t.by)}</div>${t.replies.map((r) => `<div style="margin:3px 0 3px 14px;padding-left:8px;border-left:3px solid #f2c200">${esc(r)}</div>`).join('')}<hr>`).join('')}</div></div>`)
    } else if (os.app === 'term') {
      const lines = (os.term?.length ? os.term : [`${O.version}`, `${esc(os.host)} · type help`]).map((l) => `<div>${esc(l)}</div>`).join('')
      win = chrome(`Terminal · ${os.host}${admin ? ' · admin' : ''}`, `<div class="body" style="flex-direction:column;background:#000"><div class="term">${lines}</div><div class="q">${['help', 'ls', 'whoami', 'entities', 'hack', 'blink'].map((c) => `<button onclick="${A({ k: 'cmd', v: c })}">${c}</button>`).join('')}</div><div class="cmd"><span style="color:#ffbe1a;padding:6px 0 6px 10px;font:13px monospace">&gt;</span><input id="tin" data-interactive autocomplete="off" maxlength="120" autofocus onkeydown="if(event.key==='Enter'){${A({ k: 'cmd', v: '__V__' }).replace("'__V__'", 'this.value')};this.value=''}"></div></div>`)
    } else if (os.app === 'ctrl' && CTRL[OPENS[os.host]]) {
      const C = CTRL[OPENS[os.host]]
      win = chrome(C.title, `<div class="body"><div class="rd"><div class="meta">${admin ? 'admin session. every switch is logged.' : 'read-only'}</div>${C.rows.map((r) => `<div style="display:flex;align-items:center;gap:10px;margin:6px 0;padding:6px 8px;border:2px inset #c0c0c0;background:#fff"><b style="flex:1">${esc(r.label)}</b><span class="meta">${os.done?.[r.id] ? 'DONE' : 'READY'}</span><button ${admin ? '' : 'disabled'} onclick="${A({ k: 'ctrl', v: r.id })}">${esc(r.act)}</button></div>`).join('')}</div></div>`)
    } else if (os.app === 'about') {
      const A0 = O.about, days = 11402 + Math.floor(now / 86400000), seat = A0.users[hashN(os.host) % (A0.users.length - 1)]
      win = chrome('System Properties', `<div class="body"><div class="rd"><div style="display:flex;gap:18px;align-items:flex-start">${LOGO(1.6)}<div style="flex:1"><h3>${esc(O.version)}</h3><div class="meta">${esc(A0.origin)}</div>
        <div class="props"><b>Registered to</b><span>${esc(A0.registered)}</span><b>Computer</b><span>${esc(os.host)}</span><b>Processor</b><span>${esc(A0.cpu)}</span><b>Memory</b><span>${esc(A0.ram)}</span><b>Drive</b><span>${esc(A0.disk)}</span>
        <b>Uptime</b><span>${days.toLocaleString('en')} days. The clock says 15:40.</span><b>Last user</b><span>${esc(seat)} (logged out improperly)</span><b>You</b><span>${admin ? 'admin. the machine seems relieved.' : 'guest. the machine is polite about it.'}</span></div></div></div>
        <div class="chg">${A0.notes.map((n) => `<div>${esc(n)}</div>`).join('')}</div><div class="meta" style="margin-top:10px">${esc(A0.footer)}</div></div></div>`)
    } else if (os.app === 'notes') {
      win = chrome('Notepad · untitled.txt', `<div class="body" style="flex-direction:column"><textarea id="osnp" data-interactive maxlength="800" placeholder="Your own notes. They stay with you, not the desk.">${esc(s.osNote ?? '')}</textarea><div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:6px;background:#c0c0c0">${os.saved && now - os.saved < 2500 ? '<span style="font-size:12px">Saved.</span>' : ''}<button class="btn" onclick="sendAction('os',{k:'note',v:document.getElementById('osnp').value})">Save</button></div></div>`)
    } else if (os.app === 'bin') {
      const bs = binOf(), f = bs.find((x) => x.name === os.sel) ?? null
      win = chrome('Recycle Bin', `<div class="body">${list(bs, os.sel, 'bin', { id: (x) => x.name, html: (x) => `🗑 ${esc(x.name)}` })}<div class="rd">${f ? `<h3>${esc(f.name)}</h3><div class="meta">Deleted by: (unknown) · Not emptied</div><div style="white-space:pre-wrap;font-family:monospace">${esc(f.text)}</div>` : `<div class="meta">${bs.length} items. Nobody has emptied it. Emptying is disabled.</div>`}</div></div>`)
    }
    const apps = (CTRL[OPENS[os.host]] ? `<button class="ic" onclick="${A({ k: 'app', v: 'ctrl' })}"><span class="g">🔒</span>Security Panel</button>` : '') + ICONS.map(([k, g, n]) => `<button class="ic" onclick="${A({ k: 'app', v: k })}"><span class="g">${g}</span>${esc(n)}</button>`).join('')
    const tw = os.app !== 'desktop' ? `<div class="tw">${esc(TITLE[os.app] ?? '')}</div>` : ''
    const menu = os.menu ? `<div class="smenu"><div class="side">Back OS 95</div><div class="items">${ICONS.map(([k, g, n]) => `<button onclick="${A({ k: 'app', v: k })}">${g} ${esc(n)}</button>`).join('')}<hr><button onclick="${A({ k: 'off' })}">⏻ Shut Down...</button></div></div>` : ''
    body = `<div class="desk">${menu}<div class="area">${win || `<div class="icons">${apps}</div>`}</div><div class="task"><div class="st" onclick="${A({ k: 'menu' })}" style="${os.menu ? 'border-style:inset' : ''}">${LOGO(0.34)} Start</div>${tw}<div class="clk">15:40</div></div></div>`
  }
  return CSS + `<div id="os" data-modal><div class="bezel"><div class="scr">${body}</div><div class="bezel-chin"><div class="brand">${LOGO(0.28)} OBJECT-94 TERMINAL</div><div class="led-box"><span class="led"></span><span>POWER</span></div></div></div></div>`
}
