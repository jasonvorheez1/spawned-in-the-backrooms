import { esc, uiPrefsOf, SCALE_LABELS } from './lib/ui-kit.js'
import { PLACE_NAMES } from './lib/quests.js'
import { OPTS, PRESETS, cleanPick } from './lib/run-opts.js'

// A drawn corridor gives the title a consistent setting regardless of the player's current level.
const CORRIDOR = `<svg class="mm-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
  <linearGradient id="wall" x2="1" y2=".2"><stop stop-color="#a49a61"/><stop offset="1" stop-color="#514e32"/></linearGradient>
  <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#55503a"/><stop offset="1" stop-color="#211f1a"/></linearGradient>
  <linearGradient id="ceiling" x2="0" y2="1"><stop stop-color="#332f25"/><stop offset="1" stop-color="#9b9060"/></linearGradient>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f6e9b1" stop-opacity=".22"/><stop offset="1" stop-color="#f6e9b1" stop-opacity="0"/></linearGradient>
  <radialGradient id="light"><stop stop-color="#e8dca1" stop-opacity=".45"/><stop offset="1" stop-color="#cab86e" stop-opacity="0"/></radialGradient>
  <pattern id="paper" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M11 2v18M3 11h16M6 6l10 10M16 6L6 16" fill="none" stroke="#514b32" stroke-opacity=".12" stroke-width="1"/></pattern>
  <pattern id="grain" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M1 2h1M5 7h2M8 3h1" stroke="#dbca91" stroke-opacity=".08"/></pattern>
</defs>
<rect width="1600" height="900" fill="#29291f"/><path d="M0 0H1600L1010 300H670Z" fill="url(#ceiling)"/><path d="M0 900H1600L1010 560H670Z" fill="url(#floor)"/>
<path d="M0 0L670 300V560L0 900Z" fill="url(#wall)"/><path d="M1600 0L1010 300V560L1600 900Z" fill="url(#wall)"/>
<path d="M0 0L670 300V560L0 900ZM1600 0L1010 300V560L1600 900Z" fill="url(#paper)"/>
<rect x="670" y="300" width="340" height="260" fill="#716d4e"/><rect x="748" y="345" width="173" height="215" fill="#272a20"/><rect x="762" y="358" width="145" height="202" fill="#414637"/><path d="M811 358v202M762 420h145" stroke="#34382c" stroke-width="7"/>
<path d="M0 34L670 314M0 850L670 547M1600 34L1010 314M1600 850L1010 547" fill="none" stroke="#37382a" stroke-width="14"/>
<path d="M244 108V790M1350 127V790" stroke="#5a583d" stroke-width="28"/><path d="M257 113V781M1337 132V780" stroke="#c0b27d" stroke-opacity=".26" stroke-width="4"/>
<path d="M0 210L670 325M0 425L670 366M1600 210L1010 325M1600 425L1010 366" stroke="#ddd1a0" stroke-opacity=".08" fill="none"/>
<g fill="none" stroke="#d3c797" stroke-opacity=".20" stroke-width="3"><path d="M0 210H1600M0 60H1600M0 0L670 300M400 0L750 300M1200 0L930 300M1600 0L1010 300"/></g>
<g class="mm-lights"><path d="M705 112h276l-50 53H744Z" fill="#ddd4ae"/><path d="M773 235h145l-17 17H790Z" fill="#ece0b8"/><ellipse cx="842" cy="160" rx="400" ry="280" fill="url(#light)"/></g>
<path class="mm-beam" d="M730 145H955L1190 770H480Z" fill="url(#beam)"/>
<g class="mm-dust" fill="#f3e7b6" opacity=".32"><circle cx="560" cy="312" r="2"/><circle cx="690" cy="475" r="1.5"/><circle cx="1060" cy="295" r="2"/><circle cx="1160" cy="510" r="1.3"/><circle cx="830" cy="391" r="1"/><circle cx="1350" cy="660" r="2"/><circle cx="982" cy="610" r="1.3"/><circle cx="430" cy="580" r="1"/></g>
<g class="mm-dust mm-dust-back" fill="#efe0a5" opacity=".2"><circle cx="620" cy="550" r="1"/><circle cx="1020" cy="420" r="1.5"/><circle cx="1250" cy="260" r="1"/><circle cx="750" cy="260" r="1"/><circle cx="1400" cy="390" r="1.5"/></g>
<path d="M0 900H1600L1010 560H670Z" fill="url(#grain)"/><path d="M0 720H1600M0 805H1600M420 900l320-340M1180 900L930 560" stroke="#d1bb81" stroke-opacity=".06" fill="none"/>
</svg>`
const CSS = `<style>
#mm{--mm-gold:#e4d89d;position:fixed;inset:0;isolation:isolate;overflow:hidden;pointer-events:auto;color:#f2efd9;font-family:var(--ui-font,'Segoe UI',Arial,sans-serif);background:#171912}
#mm .mm-scene{position:absolute;inset:-3%;width:106%;height:106%;z-index:-3;animation:mm-drift 24s ease-in-out infinite alternate}
#mm .mm-lights{animation:mm-light 7s infinite}
#mm .mm-beam{transform-origin:840px 145px;animation:mm-beam 11s ease-in-out infinite alternate}
#mm .mm-dust{animation:mm-dust 16s ease-in-out infinite alternate}
#mm .mm-dust-back{animation-duration:23s;animation-direction:alternate-reverse}
#mm:before{content:'';position:absolute;inset:0;z-index:-2;pointer-events:none;background:linear-gradient(90deg,rgba(12,14,11,.96),rgba(12,14,11,.87) 28%,rgba(12,14,11,.36) 68%,rgba(12,14,11,.28)),linear-gradient(0deg,#0c0e0bd9,transparent 45%,#0c0e0b75)}
#mm:after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;background:repeating-linear-gradient(0deg,transparent 0 3px,#f2e9bb09 4px);animation:mm-static 7s steps(2) infinite}
#mm.mm-pause{background:rgba(10,12,10,.68)}
#mm.mm-pause:before{background:linear-gradient(90deg,rgba(11,14,12,.98),rgba(11,14,12,.88) 38%,rgba(11,14,12,.18) 78%)}
#mm.mm-pause:after{opacity:.25}
#mm .mm-shell{position:absolute;inset:0 calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px) 0 0;display:flex;flex-direction:column;min-width:0}
#mm .mm-top{flex:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:clamp(18px,3vh,34px) clamp(24px,5vw,72px) 12px;color:#d0c68e;font:600 10px var(--ui-font,'Segoe UI',sans-serif);letter-spacing:.2em;text-transform:uppercase}
#mm .mm-top span:last-child{color:#aaa784;text-align:right;letter-spacing:.12em}
#mm .mm-main{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#8c8259 transparent;display:flex;align-items:safe center;padding:8px clamp(24px,5vw,72px)}
#mm .col{box-sizing:border-box;width:min(470px,100%);flex:none;padding:16px 4px;animation:mm-enter .6s ease-out both}
#mm .mm-eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 16px;color:#c9be89;font-size:10px;font-weight:700;letter-spacing:.25em;text-transform:uppercase}
#mm .mm-eyebrow:before{content:'';width:30px;height:1px;background:#c9be89}
#mm h1{margin:0;color:#f7f2dd;font-family:var(--ui-font,'Segoe UI',Arial,sans-serif);font-weight:650;font-size:clamp(42px,6vw,82px);line-height:1.05;letter-spacing:-.045em;text-shadow:0 4px 30px #0009}
#mm h1 span{display:block}#mm .mm-pause-title{font-size:clamp(35px,4vw,54px);letter-spacing:-.035em}
#mm .mm-subline{margin:16px 0 22px;color:#beb99e;font-size:11px;line-height:1.5;letter-spacing:.12em;text-transform:uppercase}
#mm .mm-nav{width:min(365px,100%);display:grid;gap:4px;margin-top:26px}
#mm.mm-pause .mm-nav{margin-top:8px}
#mm .mm-nav button{position:relative;display:flex;align-items:center;width:100%;min-height:42px;gap:12px;padding:9px 13px;border:1px solid transparent;background:#e7d9a608;color:#ddd9c8;text-align:left;font:600 14px var(--ui-font,'Segoe UI',Arial,sans-serif);cursor:pointer;transition:background .2s,color .2s,transform .2s,border-color .2s}
#mm.mm-title .mm-nav button{animation:mm-arrive .7s both}
#mm.mm-title .mm-nav button:nth-child(2){animation-delay:.08s}#mm.mm-title .mm-nav button:nth-child(3){animation-delay:.16s}#mm.mm-title .mm-nav button:nth-child(4){animation-delay:.24s}#mm.mm-title .mm-nav button:nth-child(5){animation-delay:.32s}
#mm .mm-nav button:before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:2px;background:#e3d494;opacity:0;transition:opacity .2s}
#mm .mm-nav button:hover,#mm .mm-nav button:focus-visible{background:#d9ca9224;border-color:#e0d4a13b;color:#fffbe8;transform:translateX(5px);outline:0}
#mm .mm-nav button:hover:before,#mm .mm-nav button:focus-visible:before,#mm .mm-nav .mm-primary:before{opacity:1}
#mm .mm-nav .mm-primary{background:#e2d2981c;color:#fff7d3;font-size:16px}
#mm .mm-number{width:20px;color:#a6a07d;font:10px monospace}#mm .mm-arrow{margin-left:auto;color:#e0d298;font-size:18px}
#mm .mm-footer{flex:none;display:flex;justify-content:space-between;gap:12px;padding:12px clamp(24px,5vw,72px) clamp(18px,3vh,30px);color:#a7a387;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
#mm .mm-footer b{color:#d9cc94;font-weight:600}
#mm .mm-sub{box-sizing:border-box;width:100%;padding:22px;background:rgba(18,21,17,.97);border:1px solid #aaa07255;border-top:2px solid #d8ce96;box-shadow:0 20px 65px #0008}
#mm .mm-sub h2{margin:0 0 15px;padding-bottom:12px;border-bottom:1px solid #b1a27655;color:#f4edda;font:600 26px var(--ui-font,'Segoe UI',sans-serif)}
#mm .mm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #b1a2762a;color:#e7e1d0;font-size:13px}#mm .mm-row small{display:block;margin-top:4px;color:#aaa995;font-size:11px;line-height:1.4}
#mm .mm-seg{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px}#mm .mm-seg button,#mm .mm-back{min-height:34px;padding:6px 10px;border:1px solid #998b5c70;background:#282c22;color:#ded9c7;font:600 12px var(--ui-font,'Segoe UI',Arial,sans-serif);cursor:pointer}#mm .mm-seg button.on{background:#d8ce96;border-color:#d8ce96;color:#171a12}#mm .mm-seg button:focus-visible,#mm .mm-back:focus-visible,#mm .mm-sub .mm-primary:focus-visible{outline:2px solid #f5d690;outline-offset:2px}#mm .mm-back{margin-top:18px;padding:8px 15px}
#mm .mm-sub .mm-primary{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:44px;margin-top:18px;padding:10px 14px;border:0;background:#d8ce96;color:#171a12;font-weight:700;cursor:pointer}#mm .mm-meta{color:#aaa995;font-size:12px;line-height:1.5}
@keyframes mm-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes mm-drift{from{transform:scale(1) translateX(0)}to{transform:scale(1.08) translateX(-1.2%)}}@keyframes mm-light{0%,91%,93%,100%{opacity:1}92%{opacity:.72}92.4%{opacity:.94}}@keyframes mm-static{50%{opacity:.32}}
@keyframes mm-arrive{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
@keyframes mm-beam{from{opacity:.45;transform:scaleX(.92)}to{opacity:.95;transform:scaleX(1.08)}}
@keyframes mm-dust{from{transform:translate(0,0);opacity:.18}to{transform:translate(-24px,-55px);opacity:.5}}
@media(max-width:640px){#mm .mm-top span:last-child{display:none}#mm .mm-shell{right:var(--spawn-chrome-reservation-right-inset,50px)}#mm .mm-top,#mm .mm-main,#mm .mm-footer{padding-left:22px;padding-right:10px}#mm .mm-row{align-items:flex-start;flex-direction:column}#mm .mm-seg{justify-content:flex-start}#mm .mm-footer span:last-child{display:none}}
@media(max-height:570px){#mm .mm-top{padding-top:12px;padding-bottom:4px}#mm .col{padding:6px 3px}#mm h1{font-size:38px}#mm .mm-eyebrow{margin-bottom:7px}#mm .mm-subline{margin:8px 0 12px}#mm .mm-nav{gap:1px}#mm .mm-nav button{min-height:34px;padding-top:5px;padding-bottom:5px}#mm .mm-footer{padding-top:5px;padding-bottom:10px}}
@media(prefers-reduced-motion:reduce){#mm .mm-scene,#mm .mm-lights,#mm .mm-beam,#mm .mm-dust,#mm:after,#mm .col,#mm.mm-title .mm-nav button{animation:none}#mm button{transition:none}}#mm.mm-reduced .mm-scene,#mm.mm-reduced .mm-lights,#mm.mm-reduced .mm-beam,#mm.mm-reduced .mm-dust,#mm.mm-reduced:after,#mm.mm-reduced .col,#mm.mm-reduced.mm-title .mm-nav button{animation:none}#mm.mm-reduced button{transition:none}
#mm .mm-photo{position:absolute;inset:-2%;width:104%;height:104%;object-fit:cover;z-index:-3;filter:saturate(.9) contrast(1.05);animation:mm-drift 30s ease-in-out infinite alternate}
#mm.mm-title:before{background:radial-gradient(ellipse 70% 65% at 48% 42%,transparent 30%,#0a0905aa 80%,#050403 100%)}
#mm.mm-title:after{opacity:.35}
#mm .memo{position:relative;z-index:1;box-sizing:border-box;width:min(460px,100%);margin:0 auto;padding:34px 34px 26px;background:#eee7d0;background-image:linear-gradient(170deg,#f4eedb,#e2d8b8);color:#24211a;font:400 15px/28px 'Courier New',Courier,monospace;transform:rotate(-.8deg);box-shadow:0 2px 0 #cfc4a2,0 18px 40px #000a,0 2px 6px #0006;animation:mm-enter .6s ease-out both}
#mm .memo:before,#mm .memo:after{content:'';position:absolute;top:-12px;width:96px;height:26px;background:#d9cfa8cc;box-shadow:0 1px 2px #0003}
#mm .memo:before{left:18px;transform:rotate(-7deg)}#mm .memo:after{right:22px;transform:rotate(5deg)}
#mm .memo h1{margin:14px 0 2px;font:700 30px/1.05 'Courier New',Courier,monospace;letter-spacing:-.01em;color:#1b1914;text-transform:uppercase;text-shadow:none}
#mm .memo h1{margin:0 0 22px;font:700 32px/1.05 'Courier New',Courier,monospace;color:#1b1914;text-transform:uppercase;text-shadow:none;text-align:center}
#mm .memo-go{display:block;width:100%;border:0;cursor:pointer;background:#1f1c16;color:#f2ecd6;padding:14px 18px;font:700 22px/1.1 'Courier New',monospace;letter-spacing:.06em;text-transform:uppercase;text-align:center;transition:background .12s}
#mm .memo-go small{display:block;margin-top:4px;font:400 12px/1.2 'Courier New',monospace;letter-spacing:.04em;text-transform:none;color:#cfc6a8}
#mm .memo-go:hover,#mm .memo-go:focus-visible{outline:0;background:#3a2f12;color:#f5e04a}
#mm .memo-mode{display:grid;grid-template-columns:1fr 1fr;margin-top:12px;border:2px solid #1f1c16}
#mm .memo-mode button{border:0;background:none;padding:9px 0;cursor:pointer;font:700 14px/1 'Courier New',monospace;letter-spacing:.06em;text-transform:uppercase;color:#6f6754}
#mm .memo-mode button.on{background:#1f1c16;color:#f2ecd6;cursor:default}
#mm .memo-mode button:not(.on):hover,#mm .memo-mode button:not(.on):focus-visible{outline:0;background:#f5e04a88;color:#1f1c16}
#mm .memo-hint{margin:6px 0 0;text-align:center;font-size:12px;line-height:16px;color:#6f6754}
#mm .memo-links{display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;margin-top:18px;padding-top:12px;border-top:1px solid #1f1c1633}
#mm .memo-links button{border:0;background:none;padding:6px 4px;cursor:pointer;text-align:left;font:700 14px/1.2 'Courier New',monospace;letter-spacing:.04em;text-transform:uppercase;color:#2a261d}
#mm .memo-links button:hover,#mm .memo-links button:focus-visible{outline:0;background:linear-gradient(100deg,transparent 2%,#f5e04a99 5%,#f5e04a88 94%,transparent 98%)}
@media(max-width:640px){#mm .memo{padding:24px 18px 18px}#mm .memo h1{font-size:24px}#mm .memo-go{font-size:18px}}
@media(max-height:570px){#mm .memo{padding:16px 22px 12px}#mm .memo h1{font-size:22px;margin-bottom:10px}#mm .memo-links{margin-top:8px;padding-top:6px}}
@media(prefers-reduced-motion:reduce){#mm .mm-photo,#mm .memo{animation:none}}#mm.mm-reduced .mm-photo,#mm.mm-reduced .memo{animation:none}
</style>`

function settingsView(ctx, player, prefs) {
  const body = (player.state?.bodyStyle ?? ctx.world.state?.bodyStyle) === 'human' ? 'human' : 'furry'
  const seg = (label, active, action) => `<button class="${active ? 'on' : ''}" onclick="sendAction('mmenu',${action})">${label}</button>`
  return `<div class="mm-sub" role="region" aria-label="Settings">
    <h2>Settings</h2>
    <div class="mm-row">
      <div><strong>Interface Scale</strong><small>Adjust menu and dialogue text size</small></div>
      <div class="mm-seg">
        ${Object.entries(SCALE_LABELS).map(([k, lbl]) => seg(lbl.split(' ')[0], prefs.scale === k, `{k:'pref',key:'scale',val:'${k}'}`)).join('')}
      </div>
    </div>
    <div class="mm-row">
      <div><strong>High Contrast</strong><small>Sharper borders and higher text contrast</small></div>
      <div class="mm-seg">
        ${seg('Standard', prefs.contrast === 'standard', "{k:'pref',key:'contrast',val:'standard'}")}
        ${seg('High', prefs.contrast === 'high', "{k:'pref',key:'contrast',val:'high'}")}
      </div>
    </div>
    <div class="mm-row">
      <div><strong>Motion</strong><small>Disable UI transition animations</small></div>
      <div class="mm-seg">
        ${seg('System', prefs.motion === 'system', "{k:'pref',key:'motion',val:'system'}")}
        ${seg('Reduced', prefs.motion === 'reduced', "{k:'pref',key:'motion',val:'reduced'}")}
      </div>
    </div>
    <div class="mm-row">
      <div><strong>HUD Density</strong><small>Hide secondary HUD hints during exploration</small></div>
      <div class="mm-seg">
        ${seg('Full', !prefs.hudMinimal, "{k:'pref',key:'hudMinimal',val:false}")}
        ${seg('Minimal', prefs.hudMinimal, "{k:'pref',key:'hudMinimal',val:true}")}
      </div>
    </div>
    <button class="mm-back" onclick="sendAction('mmenu',{k:'view',v:''})">← Back</button>
  </div>`
}

function controlsView(ctx) {
  const acts = ctx.world?.inputs?.actions ?? {}
  const key = (n, d) => esc(String(acts[n]?.label ?? acts[n]?.keys?.[0] ?? d).toUpperCase())
  const rows = [
    ['Move / Sprint / Crouch', `WASD · ${key('sprint', 'Shift')} · ${key('crouch', 'C')}`],
    ['Interact / Loot / Talk', key('interact', 'E')],
    ['Attack / Aim / Reload', `LMB · RMB · ${key('reload', 'R')}`],
    ['Flashlight / Cycle Weapon', `${key('flashlight', 'F')} · ${key('cycleWeapon', 'X')}`],
    ['Inventory / Character / Journal / Craft', `${key('inv', 'I')} · ${key('sheet', 'K')} · ${key('journal', 'P')} · ${key('craft', 'Y')}`],
    ['Quick Slots', '0–9'],
    ['Field Guide', key('fieldGuide', 'J')],
    ['Pause Menu', key('mainmenu', 'Backspace')],
  ]
  return `<div class="mm-sub" role="region" aria-label="Controls and Guide">
    <h2>Controls & Field Guide</h2>
    ${rows.map(([lbl, k]) => `<div class="mm-row"><span>${esc(lbl)}</span><strong>${k}</strong></div>`).join('')}
    <p class="mm-meta">Your progress, inventory, and quests are saved automatically per expedition.</p>
    <button class="mm-back" onclick="sendAction('mmenu',{k:'view',v:''})">← Back</button>
  </div>`
}

// New Expedition setup (Shelly Nov 14): presets, then every option row
function newGameView(ctx, player) {
  const s = player.state ?? {}, pick = cleanPick(s.newRun), confirm = !!s.newRun?.confirm
  const btn = (label, on, act) => `<button class="${on ? 'on' : ''}" onclick="sendAction('mmenu',${act})">${esc(label)}</button>`
  const presetOn = (v) => OPTS.every((o) => v[o.key] === pick[o.key])
  return `<div class="mm-sub" role="region" aria-label="New Expedition">
    <h2>New Expedition</h2>
    <div class="mm-row"><div><strong>Preset</strong><small>Start from one, then change anything below</small></div>
      <div class="mm-seg">${Object.entries(PRESETS).map(([k, p]) => btn(p.label, presetOn(p.v), `{k:'preset',v:'${k}'}`)).join('')}</div></div>
    ${OPTS.map((o) => `<div class="mm-row"><div><strong>${esc(o.label)}</strong><small>${esc(o.hint)}</small></div>
      <div class="mm-seg">${o.vals.map(([v, lbl]) => btn(lbl, pick[o.key] === v, `{k:'opt',key:'${o.key}',v:'${v}'}`)).join('')}</div></div>`).join('')}
    ${confirm ? `<p class="mm-meta" style="color:#e8b46a">This replaces your current expedition. Save it in the Save Manager first if you want it back.</p>
      <button class="mm-primary" onclick="sendAction('mmenu',{k:'begin',sure:true},{relockPointer:true})">Replace and begin<span aria-hidden="true">→</span></button>`
      : `<button class="mm-primary" onclick="sendAction('mmenu',{k:'begin'},{relockPointer:true})">Begin<span aria-hidden="true">→</span></button>`}
    <button class="mm-back" onclick="sendAction('mmenu',{k:'view',v:''})">← Back</button>
  </div>`
}

// Save Manager: five slots in the game's database
function savesView(ctx, player) {
  const s = player.state ?? {}, list = s.saveList ?? [], by = Object.fromEntries(list.map((r) => [r.slot, r]))
  const when = (at) => { try { return new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
  const rows = [1, 2, 3, 4, 5].map((n) => {
    const r = by[n]
    const name = r ? `${esc(PLACE_NAMES[r.place] ?? r.place ?? 'Level 0')} · Level ${esc(r.level ?? 1)}` : 'Empty'
    return `<div class="mm-row"><div><strong>Slot ${n} · ${name}</strong><small>${r ? esc(when(r.at)) : 'Nothing saved here yet'}</small></div>
      <div class="mm-seg">
        <button onclick="sendAction('mmenu',{k:'save',slot:${n}})">Save</button>
        ${r ? `<button onclick="sendAction('mmenu',{k:'load',slot:${n}},{relockPointer:true})">Load</button><button onclick="sendAction('mmenu',{k:'del',slot:${n}})">Delete</button>` : ''}
      </div></div>`
  }).join('')
  return `<div class="mm-sub" role="region" aria-label="Save Manager">
    <h2>Save Manager</h2>
    ${rows}
    <p class="mm-meta">${s.saveMsg?.text ? esc(s.saveMsg.text) : 'Your current expedition also saves itself as you play.'}</p>
    <button class="mm-back" onclick="sendAction('mmenu',{k:'view',v:''})">← Back</button>
  </div>`
}

export function mainMenu(ctx, player, launch = false) {
  const s = player?.state ?? {}
  const pause = !launch && s.menuKind === 'pause'
  const k = pause ? 'resume' : 'start'
  const view = s.menuView ?? ''
  const prefs = uiPrefsOf(s)
  const returning = !!(s.madeChar || s.t0Done || (s.level ?? 1) > 1 || (s.xp ?? 0) > 0)
  const placeName = PLACE_NAMES[player?.place] ?? (player?.place ? String(player.place) : 'Level 0')
  const primaryLabel = pause ? 'Resume' : returning ? 'Continue' : 'New Expedition'

  const kd = view
    ? "if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('mmenu',{k:'view',v:''})}"
    : pause
      ? "if(event.key==='Escape'){event.preventDefault();event.stopPropagation();sendAction('mmenu',{k:'resume'},{relockPointer:true})}"
      : ''

  let content = ''
  if (view === 'settings') {
    content = `<div class="col">${settingsView(ctx, player, prefs)}</div>`
  } else if (view === 'newgame') {
    content = `<div class="col">${newGameView(ctx, player)}</div>`
  } else if (view === 'saves') {
    content = `<div class="col">${savesView(ctx, player)}</div>`
  } else if (view === 'controls') {
    content = `<div class="col">${controlsView(ctx)}</div>`
  } else if (!pause) {
    // Title (Shelly Nov 16: "clearer", "not a half life 1/gmod menu", then "too ai slop"): a typed memo taped to the Level 0 wall, the choices are lines on the form
    const multi = s.run?.mode === 'multi'
    const where = multi ? 'Bonus Rooms' : (PLACE_NAMES[s.savePlace ?? player?.place] ?? 'Level 0')
    const go = (act) => `sendAction('mmenu',${act},{relockPointer:true})`
    const md = (v, on, lbl) => `<button class="${on ? 'on' : ''}" ${on ? 'aria-pressed="true"' : `onclick="${go(`{k:'mode',v:'${v}'}`)}"`}>${lbl}</button>`
    const lk = (v, lbl) => `<button onclick="sendAction('mmenu',{k:'view',v:'${v}'})">${lbl}</button>`
    content = `<div class="memo">
      <h1>Spawned in the Backrooms</h1>
      <button class="memo-go" onclick="${go("{k:'start'}")}">▶ ${returning ? 'Continue' : 'Start'}<small>${returning ? `${esc(where)} · level ${esc(s.level ?? 1)}` : (multi ? 'Bonus Rooms' : 'Level 0')}</small></button>
      <div class="memo-mode" role="group" aria-label="Mode">${md('solo', !multi, 'Solo')}${md('multi', multi, 'Multiplayer')}</div>
      <div class="memo-hint">${multi ? 'no story · bring friends' : 'the story · your own run'}</div>
      <div class="memo-links">${lk('newgame', returning ? 'New expedition' : 'Custom start')}${lk('saves', 'Saves')}${lk('settings', 'Settings')}${lk('controls', 'Controls')}</div>
    </div>`
  } else {
    content = `<div class="col">
      ${pause ? '<h1 class="mm-pause-title">Paused</h1>' : '<h1><span>Spawned in the</span><span>Backrooms</span></h1>'}
      ${pause ? `<div class="mm-subline">${esc(placeName)} · Level ${esc(s.level ?? 1)}</div>` : ''}
      <nav class="mm-nav" aria-label="${pause ? 'Pause menu' : 'Main menu'}">
        <button class="mm-primary" onclick="sendAction('mmenu',{k:'${k}'},{relockPointer:true})"><span class="mm-number">01</span>${primaryLabel}<span class="mm-arrow" aria-hidden="true">→</span></button>
        ${pause ? '' : (s.run?.mode === 'multi'
          ? `<button onclick="sendAction('mmenu',{k:'mode',v:'solo'},{relockPointer:true})"><span class="mm-number">↔</span>Play Solo<small style="display:block;opacity:.6;font-size:.7em">your own run, story and all</small><span class="mm-arrow" aria-hidden="true">›</span></button>`
          : `<button onclick="sendAction('mmenu',{k:'mode',v:'multi'},{relockPointer:true})"><span class="mm-number">↔</span>Multiplayer<small style="display:block;opacity:.6;font-size:.7em">no story, starts in the Bonus Rooms, explore with friends</small><span class="mm-arrow" aria-hidden="true">›</span></button>`)}
        ${pause ? '' : `<button onclick="sendAction('mmenu',{k:'view',v:'newgame'})"><span class="mm-number">02</span>${returning ? 'New Expedition' : 'Custom Expedition'}<span class="mm-arrow" aria-hidden="true">›</span></button>`}
        <button onclick="sendAction('mmenu',{k:'view',v:'saves'})"><span class="mm-number">${pause ? '02' : '03'}</span>Save Manager<span class="mm-arrow" aria-hidden="true">›</span></button>
        <button onclick="sendAction('mmenu',{k:'view',v:'settings'})"><span class="mm-number">${pause ? '03' : '04'}</span>Settings<span class="mm-arrow" aria-hidden="true">›</span></button>
        <button onclick="sendAction('mmenu',{k:'view',v:'controls'})"><span class="mm-number">${pause ? '04' : '05'}</span>Controls &amp; Guide<span class="mm-arrow" aria-hidden="true">›</span></button>
        ${pause && s.t0Done ? `<button onclick="sendAction('mmenu',{k:'tobonus'},{relockPointer:true})"><span class="mm-number">05</span>Return to Bonus Rooms<span class="mm-arrow" aria-hidden="true">›</span></button>` : ''}
        ${pause ? `<button onclick="sendAction('mmenu',{k:'title'})"><span class="mm-number">${s.t0Done ? '06' : '05'}</span>Return to Title<span class="mm-arrow" aria-hidden="true">›</span></button>` : ''}
      </nav>
    </div>`
  }

  return `${CSS}<div id="mm" class="${pause ? 'mm-pause' : 'mm-title'} ${prefs.motion === 'reduced' ? 'mm-reduced' : ''}" data-modal tabindex="0" ${kd ? `onkeydown="${kd}"` : ''}>${pause ? '' : '<img class="mm-photo" src="/cdn/value.4fb815a046e587dbc7b003dc61bb80d70af1fb91676ceb5d74bef5ecf1be8721.png" alt="">'}<div class="mm-shell"><div class="mm-main">${content}</div>${view || pause ? `<div class="mm-footer"><span>${view ? 'Escape to go back' : 'Escape to resume'}</span></div>` : ''}</div></div>`
}
