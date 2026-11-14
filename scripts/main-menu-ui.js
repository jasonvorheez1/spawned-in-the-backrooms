import { esc, uiPrefsOf, SCALE_LABELS } from './lib/ui-kit.js'
import { PLACE_NAMES } from './lib/quests.js'
import { OPTS, PRESETS, cleanPick } from './lib/run-opts.js'

const CSS = `<style>
#mm{position:fixed;inset:0;pointer-events:auto;background:linear-gradient(90deg,#0b0e0be8 0%,#0b0e0b70 48%,#0b0e0b00 82%),linear-gradient(0deg,#0b0e0bbd,transparent 46%);font-family:var(--ui-font,'Segoe UI',Arial,sans-serif);color:#eeeadd}
#mm .col{position:absolute;left:7vw;bottom:10vh;max-width:min(460px,calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 10vw))}
#mm h1{margin:0;font-weight:500;font-size:clamp(40px,5.8vw,82px);line-height:1.04;letter-spacing:-.04em;padding-bottom:16px;border-bottom:1px solid #b8b69578;text-wrap:balance}
#mm .mm-subline{margin:10px 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#aab09f}
#mm .col>button{display:flex;align-items:center;justify-content:space-between;width:min(280px,100%);gap:12px;margin-top:10px;background:none;border:0;padding:8px 2px;color:#eeeadd;font:inherit;font-size:16px;cursor:pointer;text-align:left;border-bottom:1px solid #b8b69538}
#mm .col>button:hover,#mm .col>button:focus-visible{color:#fff;border-bottom-color:#d5b77b}
#mm .mm-primary{margin-top:20px!important;background:#d5b77b!important;color:#171a12!important;padding:10px 16px!important;min-height:48px;font-weight:650;border:0!important;border-radius:2px}
#mm .mm-primary:hover{background:#f0d49a!important}
#mm .mm-primary span{font-size:21px}
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
      <h1>The Backrooms</h1>
      <div class="mm-subline">${pause ? `Paused · ${esc(placeName)} · Level ${s.level ?? 1}` : returning ? `Level ${s.level ?? 1} · ${esc(placeName)}` : 'Level 0 — The Lobby'}</div>
      <button class="mm-primary" onclick="sendAction('mmenu',{k:'${k}'},{relockPointer:true})">${primaryLabel}<span aria-hidden="true">→</span></button>
      ${pause ? '' : `<button onclick="sendAction('mmenu',{k:'view',v:'newgame'})">${returning ? 'New Expedition' : 'Custom Expedition'}</button>`}
      <button onclick="sendAction('mmenu',{k:'view',v:'saves'})">Save Manager</button>
      <button onclick="sendAction('mmenu',{k:'view',v:'settings'})">Settings</button>
      <button onclick="sendAction('mmenu',{k:'view',v:'controls'})">Controls & Guide</button>
      ${pause ? `<button onclick="sendAction('mmenu',{k:'title'})">Return to Title</button>` : ''}
    </div>`
  }

  return `${CSS}<div id="mm" data-modal tabindex="0" ${kd ? `onkeydown="${kd}"` : ''}>${content}</div>`
}
