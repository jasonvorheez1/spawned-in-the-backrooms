import { esc, uiPrefsOf, SCALE_LABELS } from './lib/ui-kit.js'
import { PLACE_NAMES } from './lib/quests.js'
import { OPTS, PRESETS, cleanPick } from './lib/run-opts.js'

const CSS = `<style>
#mm{--mm-ink:#eee9d8;--mm-dim:#aaa995;--mm-gold:#d8bc7b;position:fixed;inset:0;overflow:hidden;pointer-events:auto;color:var(--mm-ink);font-family:var(--ui-font,'Segoe UI',Arial,sans-serif);background:linear-gradient(90deg,rgba(12,14,11,.97) 0%,rgba(12,14,11,.88) 29%,rgba(12,14,11,.40) 58%,rgba(12,14,11,.10) 100%),linear-gradient(0deg,rgba(8,10,8,.78),transparent 35%,rgba(8,10,8,.22));isolation:isolate}
#mm:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,238,181,.018) 4px);opacity:.7}
#mm:after{content:'';position:absolute;left:0;right:0;top:-20%;height:18%;z-index:-1;pointer-events:none;background:linear-gradient(transparent,rgba(230,205,142,.025),transparent);animation:mm-sweep 14s linear infinite}
#mm .mm-frame{position:absolute;inset:24px calc(var(--spawn-chrome-reservation-right-inset,50px) + 14px) 24px 24px;border-top:1px solid rgba(221,207,163,.34);border-bottom:1px solid rgba(221,207,163,.24);pointer-events:none}
#mm .mm-top{position:absolute;top:35px;left:clamp(34px,6vw,96px);right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 28px);display:flex;align-items:center;justify-content:space-between;gap:20px;color:#c5b88e;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
#mm .mm-top span:last-child{color:#aaa995;letter-spacing:.12em;text-align:right}
#mm .col{position:absolute;left:clamp(34px,7vw,112px);top:50%;transform:translateY(-47%);width:min(440px,calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 70px));max-height:calc(100dvh - 145px);overflow-y:auto;scrollbar-color:#867550 transparent;animation:mm-enter .65s ease-out both}
#mm .mm-eyebrow{display:flex;align-items:center;gap:12px;margin-bottom:17px;color:var(--mm-gold);font-size:10px;font-weight:700;letter-spacing:.23em;text-transform:uppercase}
#mm .mm-eyebrow:before{content:'';width:28px;height:1px;background:var(--mm-gold)}
#mm h1{margin:0;color:#f5f0df;font-family:Georgia,serif;font-weight:400;font-size:clamp(48px,6.4vw,94px);line-height:.88;letter-spacing:-.055em;text-shadow:0 4px 32px #0009}
#mm h1 span{display:block}
#mm .mm-subline{display:flex;align-items:center;gap:10px;margin:21px 0 28px;color:#c4bc9f;font-size:11px;font-weight:600;letter-spacing:.13em;text-transform:uppercase}
#mm .mm-subline:before{content:'';width:5px;height:5px;flex:none;background:var(--mm-gold);transform:rotate(45deg)}
#mm .mm-nav{width:min(340px,100%);border-top:1px solid #c1b58b55}
#mm .mm-nav button{display:flex;align-items:center;width:100%;min-height:49px;gap:13px;padding:8px 10px;border:0;border-bottom:1px solid #c1b58b30;background:transparent;color:#d0cfbe;text-align:left;font:600 14px var(--ui-font,'Segoe UI',Arial,sans-serif);cursor:pointer;transition:background .2s,color .2s,padding .2s}
#mm .mm-nav button:hover,#mm .mm-nav button:focus-visible{background:#d3b87220;color:#fff4d6;padding-left:16px;outline:1px solid #d8bc7b80;outline-offset:-1px}
#mm .mm-nav .mm-primary{min-height:61px;color:#f9edc8;font-size:17px}
#mm .mm-number{width:22px;color:#9b906e;font:10px monospace;letter-spacing:.04em}
#mm .mm-arrow{margin-left:auto;color:var(--mm-gold);font-size:20px;font-weight:400;transition:transform .2s}
#mm button:hover .mm-arrow,#mm button:focus-visible .mm-arrow{transform:translateX(5px)}
#mm .mm-footer{position:absolute;left:clamp(34px,7vw,112px);bottom:37px;display:flex;gap:12px;align-items:center;color:#aaa58d;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
#mm .mm-footer b{color:#d9bd7b;font-weight:600}
#mm .mm-index{position:absolute;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 35px);bottom:37px;color:#d2c49c99;font:10px monospace;letter-spacing:.12em}
#mm .mm-sub{box-sizing:border-box;width:100%;max-height:none;overflow:visible;padding:26px;background:rgba(17,20,16,.95);border:1px solid #a3976b70;border-top:2px solid var(--mm-gold);box-shadow:0 24px 90px #000a}
#mm .mm-sub h2{margin:0 0 18px;padding-bottom:14px;border-bottom:1px solid #b1a27655;color:#f4edda;font:400 32px Georgia,serif}
#mm .mm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #b1a2762a;color:#e7e1d0;font-size:13px}
#mm .mm-row small{display:block;margin-top:4px;color:#aaa995;font-size:11px;line-height:1.4}
#mm .mm-seg{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px}
#mm .mm-seg button,#mm .mm-back{min-height:34px;padding:6px 10px;border:1px solid #998b5c70;background:#282c22;color:#ded9c7;font:600 12px var(--ui-font,'Segoe UI',Arial,sans-serif);cursor:pointer}
#mm .mm-seg button.on{background:var(--mm-gold);border-color:var(--mm-gold);color:#171a12}
#mm .mm-seg button:focus-visible,#mm .mm-back:focus-visible{outline:2px solid #f5d690;outline-offset:2px}
#mm .mm-back{margin-top:18px;padding:8px 15px}
#mm .mm-sub .mm-primary{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:44px;margin-top:18px;padding:10px 14px;border:0;background:var(--mm-gold);color:#171a12;font-weight:700;cursor:pointer}
#mm .mm-meta{color:#aaa995;font-size:12px;line-height:1.5}
@keyframes mm-enter{from{opacity:0;transform:translateY(calc(-47% + 12px))}to{opacity:1;transform:translateY(-47%)}}
@keyframes mm-sweep{to{transform:translateY(800%)}}
@media(max-width:640px){#mm .mm-top span:last-child,#mm .mm-index{display:none}#mm .col{left:28px;width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 44px);max-height:calc(100dvh - 130px)}#mm h1{font-size:clamp(43px,11vw,68px)}#mm .mm-row{align-items:flex-start;flex-direction:column}#mm .mm-seg{justify-content:flex-start}#mm .mm-footer{left:28px}}
@media(max-height:570px){#mm .col{top:76px;bottom:60px;transform:none;max-height:none;animation:none}#mm h1{font-size:48px}#mm .mm-eyebrow{margin-bottom:8px}#mm .mm-subline{margin:12px 0}#mm .mm-nav button{min-height:38px}#mm .mm-nav .mm-primary{min-height:42px}}
@media(prefers-reduced-motion:reduce){#mm:after,#mm .col{animation:none}#mm button,#mm .mm-arrow{transition:none}}
#mm.mm-reduced:after,#mm.mm-reduced .col{animation:none}#mm.mm-reduced button,#mm.mm-reduced .mm-arrow{transition:none}
</style>`

function settingsView(ctx, player, prefs) {
  const body = (player.state?.bodyStyle ?? ctx.world.state?.bodyStyle) === 'human' ? 'human' : 'furry'
  const seg = (label, active, action) => `<button class="${active ? 'on' : ''}" onclick="sendAction('mmenu',${action})">${label}</button>`
  return `<div class="mm-sub" role="region" aria-label="Settings">
    <h2>Settings</h2>
    <div class="mm-row">
      <div><strong>Character Body Style</strong><small>Applies to characters across the world</small></div>
      <div class="mm-seg">
        ${seg('Human', body === 'human', "{k:'style',v:'human'}")}
        ${seg('Furry', body === 'furry', "{k:'style',v:'furry'}")}
      </div>
    </div>
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
    const name = r ? `${esc(PLACE_NAMES[r.place] ?? r.place ?? 'Level 0')} · Level ${r.level ?? 1}` : 'Empty'
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
  } else {
    content = `<div class="col">
      <div class="mm-eyebrow">${pause ? 'Field menu' : 'Expedition'}</div>
      <h1><span>The</span><span>Backrooms</span></h1>
      <div class="mm-subline">${pause ? `Paused · ${esc(placeName)} · Level ${esc(s.level ?? 1)}` : returning ? `Level ${esc(s.level ?? 1)} · ${esc(placeName)}` : 'Level 0 · The Lobby'}</div>
      <nav class="mm-nav" aria-label="${pause ? 'Pause menu' : 'Main menu'}">
        <button class="mm-primary" onclick="sendAction('mmenu',{k:'${k}'},{relockPointer:true})"><span class="mm-number">01</span>${primaryLabel}<span class="mm-arrow" aria-hidden="true">→</span></button>
        ${pause ? '' : `<button onclick="sendAction('mmenu',{k:'view',v:'newgame'})"><span class="mm-number">02</span>${returning ? 'New Expedition' : 'Custom Expedition'}<span class="mm-arrow" aria-hidden="true">›</span></button>`}
        <button onclick="sendAction('mmenu',{k:'view',v:'saves'})"><span class="mm-number">${pause ? '02' : '03'}</span>Save Manager<span class="mm-arrow" aria-hidden="true">›</span></button>
        <button onclick="sendAction('mmenu',{k:'view',v:'settings'})"><span class="mm-number">${pause ? '03' : '04'}</span>Settings<span class="mm-arrow" aria-hidden="true">›</span></button>
        <button onclick="sendAction('mmenu',{k:'view',v:'controls'})"><span class="mm-number">${pause ? '04' : '05'}</span>Controls &amp; Guide<span class="mm-arrow" aria-hidden="true">›</span></button>
        ${pause ? `<button onclick="sendAction('mmenu',{k:'title'})"><span class="mm-number">05</span>Return to Title<span class="mm-arrow" aria-hidden="true">›</span></button>` : ''}
      </nav>
    </div>`
  }

  return `${CSS}<div id="mm" class="${prefs.motion === 'reduced' ? 'mm-reduced' : ''}" data-modal tabindex="0" ${kd ? `onkeydown="${kd}"` : ''}><div class="mm-frame" aria-hidden="true"></div><div class="mm-top"><span>The Backrooms</span><span>${pause ? 'Expedition paused' : 'Field record · 01'}</span></div>${content}<div class="mm-footer"><b>●</b> ${view ? 'Escape to go back' : pause ? 'Escape to resume' : 'Progress saves automatically'}</div><div class="mm-index" aria-hidden="true">${pause ? 'PAUSE / 01' : 'ENTRY / 01'}</div></div>`
}
