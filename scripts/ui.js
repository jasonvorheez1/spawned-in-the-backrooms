// Level 0's HUD: what a wanderer needs this second. Bars bottom-left, level top-left,
// almond water + battery bottom-right, the zone you just stepped into, top-centre.
import L from './lib/data/level0.yml'
import { ZONE_NAMES } from './lib/maze.js'

const THEME = `<style>
#hud{--ink:oklch(.18 .03 80);--paper:oklch(.93 .06 95);--hp:oklch(.62 .2 28);--san:oklch(.7 .12 290);--sta:oklch(.85 .14 95);color:var(--paper);text-shadow:2px 2px var(--ink);font-size:18px}
.plate{background:oklch(.93 .06 95 / .92);color:var(--ink);box-shadow:0 0 0 3px var(--ink),4px 4px 0 3px var(--ink);text-shadow:none;padding:8px 12px}
.lbl{font-size:13px;letter-spacing:.1em;opacity:.75}
.bar{height:14px;background:oklch(.3 .03 80);box-shadow:inset 0 0 0 2px var(--ink);position:relative;overflow:hidden}
.fill{position:absolute;inset:2px auto 2px 2px;transition:width .25s}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
@media (max-width:640px){#hud .bl,#hud .br{bottom:auto;top:24px;transform:scale(.8);transform-origin:top left}#hud .br{transform-origin:top right;top:150px}#hud .tl{display:none}}
@keyframes fade{0%{opacity:0}10%{opacity:1}75%{opacity:1}100%{opacity:0;visibility:hidden}}
@keyframes pulse{50%{opacity:.55}}
@keyframes kick{40%{scale:1.25}}
</style>`

const maxHp = (lv) => L.hp + (lv - 1) * L.perLevel.hp
const maxSan = (lv) => L.sanity + (lv - 1) * L.perLevel.sanity

function bar(label, v, max, color) {
  const pct = Math.max(0, Math.min(100, (v / max) * 100))
  return `<div style="margin-top:6px"><div class="row"><span class="lbl">${label}</span><span style="font-size:14px">${Math.ceil(v)}</span></div><div class="bar"><div class="fill" style="width:calc(${pct}% - 4px);background:${color}"></div></div></div>`
}

export default function render(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now(), lv = s.level, mh = maxHp(lv), ms = maxSan(lv)
  const hpF = s.hp / mh, sanF = s.sanity / ms
  const zone = s.zone ?? 'hub'
  const acts = ctx.world.inputs?.actions ?? {}
  const lab = (n, d) => acts[n]?.label ?? d
  const down = s.downAt && now - s.downAt < 3500
  const out = s.exitAt && now - s.exitAt < 4500
  const lvl = s.leveledAt && now - s.leveledAt < 3000
  return `${THEME}<div id="hud" style="position:fixed;inset:0;pointer-events:none">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,oklch(.08 .02 290) 100%);opacity:${(1 - sanF) * 0.9}"></div>
  ${hpF < 0.35 ? `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,oklch(.35 .2 25) 100%);animation:pulse 1.1s infinite;opacity:${(0.35 - hpF) * 2.6}"></div>` : ''}
  <div class="plate tl" style="position:absolute;left:24px;top:24px;min-width:190px">
    <div class="row"><span class="lbl">WANDERER</span><span id="lv${lv}" style="font-size:30px;line-height:1;animation:kick .4s">LV ${lv}</span></div>
    ${bar('XP', s.xp, L.xpBase * lv, 'var(--sta)')}
    <div class="lbl" style="margin-top:6px">${s.explored ?? 0} ROOMS · ${s.kills ?? 0} SMILERS · ${s.escapes ?? 0} EXITS</div>
  </div>
  <div class="plate bl" style="position:absolute;left:24px;bottom:24px;width:min(250px,45vw)">
    ${bar('HEALTH', s.hp, mh, 'var(--hp)')}
    ${bar('SANITY', s.sanity, ms, 'var(--san)')}
    ${bar('STAMINA', s.stamina, L.stamina, 'var(--sta)')}
  </div>
  <div class="plate br" style="position:absolute;bottom:24px;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);min-width:170px">
    <div class="row"><span class="lbl">ALMOND WATER</span><span id="al${s.almonds}" style="font-size:30px;line-height:1;animation:kick .3s">${s.almonds}/${L.almondMax}</span></div>
    <div class="lbl" style="margin-top:4px">${lab('drink', 'Q')} TO DRINK</div>
    ${bar(s.light ? 'FLASHLIGHT · ON' : 'FLASHLIGHT', s.battery, L.battery, s.light ? 'oklch(.95 .05 95)' : 'oklch(.6 .03 95)')}
  </div>
  <div id="z-${zone}" style="position:absolute;left:0;right:0;text-align:center;top:150px;animation:fade 4s forwards">
    <div style="font-size:14px;letter-spacing:.3em">LEVEL 0 · THE THRESHOLD</div>
    <div style="font-size:44px;line-height:1.1;color:${zone === 'red' ? 'oklch(.7 .2 28)' : 'var(--paper)'}">${ZONE_NAMES[zone] ?? ''}</div>
    ${zone === 'hub' ? '<div style="font-size:16px">sanity returns here. nothing follows you in.</div>' : zone === 'dark' ? `<div style="font-size:16px">${lab('flashlight', 'F')} for your flashlight</div>` : ''}
  </div>
  ${down ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:oklch(.05 .01 290 / .6);animation:fade 3.5s forwards"><div class="plate" style="text-align:center;padding:18px 30px"><div style="font-size:48px;line-height:1">YOU WERE TAKEN</div><div class="lbl" style="margin-top:6px">woke in the safe room · almond water lost · your level stays</div></div></div>` : ''}
  ${out ? `<div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:38%;animation:fade 4.5s forwards"><div class="plate" style="text-align:center;padding:16px 28px"><div style="font-size:40px;line-height:1">YOU FOUND THE WAY OUT</div><div class="lbl" style="margin-top:6px">+${L.xpExit} XP · level 1 is still forming. the halls pull you back.</div></div></div>` : ''}
  ${lvl ? `<div style="position:absolute;left:0;right:0;display:flex;justify-content:center;top:24%;animation:fade 3s forwards"><div style="font-size:52px;color:var(--sta)">LEVEL ${lv}</div></div>` : ''}
  <div id="hint" style="position:absolute;left:0;right:0;text-align:center;padding:0 calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);bottom:220px;font-size:17px;animation:fade 9s 1s forwards;opacity:0">${lab('attack', 'click')} swing · ${lab('sprint', 'shift')} sprint · ${lab('flashlight', 'F')} light · find the flickering wall</div>
</div>`
}
