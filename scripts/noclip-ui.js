// The noclipping screens, drawn from timestamps on player.state so every frame is deterministic:
//   noclipIn  you fall into Level 0 (7.4 s): static, a glitching title, a plunge through yellow wallpaper, an impact, the world swims into focus, a title card
//   exitAt    you clip out through the flickering wall (5.2 s): a white tear opens like a door, the world is on the other side
// Animations are started with a negative delay (the time already passed) so a re-render never restarts them.
import L from './lib/data/level0.yml'

const IN = 7.4, OUT = 5.2

const CSS = `<style>
.nc{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:50;font-family:inherit}
.nc *{box-sizing:border-box}
@keyframes nc-black{0%,24%{opacity:1}30%,100%{opacity:0}}
@keyframes nc-static{0%{background-position:0 0,2px 3px}25%{background-position:-37px 21px,-30px 25px}50%{background-position:19px -43px,23px -40px}75%{background-position:-11px 8px,-8px 12px}100%{background-position:0 0,2px 3px}}
@keyframes nc-scan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
@keyframes nc-word{0%,4%{opacity:0}6%,22%{opacity:1}24%{opacity:.2}26%,30%{opacity:1}32%,100%{opacity:0}}
@keyframes nc-jit{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,2px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-3px,-2px)}80%{transform:translate(4px,3px)}}
@keyframes nc-fall{0%{background-position:0 0}100%{background-position:0 -306px}}
@keyframes nc-fallA{0%,20%{opacity:0}30%{opacity:1}54%{opacity:1}55%,100%{opacity:0}}
@keyframes nc-flash{0%,53%{opacity:0}54.5%{opacity:1}60%{opacity:.65}72%,100%{opacity:0}}
@keyframes nc-blur{0%,54%{backdrop-filter:blur(22px) saturate(.4);background:rgba(240,220,150,.55)}100%{backdrop-filter:blur(0) saturate(1);background:rgba(240,220,150,0)}}
@keyframes nc-card{0%,66%{opacity:0;letter-spacing:.6em}74%{opacity:1;letter-spacing:.32em}92%{opacity:1}100%{opacity:0}}
@keyframes nc-sub{0%,72%{opacity:0;transform:translateY(8px)}80%,92%{opacity:1;transform:none}100%{opacity:0}}
@keyframes nc-shake{0%,52%{transform:none}54%{transform:translate(10px,-14px)}56%{transform:translate(-9px,10px)}58%{transform:translate(6px,-5px)}62%,100%{transform:none}}
@keyframes nc-wh{0%,6%{opacity:1}8%{opacity:.25}10%{opacity:1}13%{opacity:.4}16%,40%{opacity:1}100%{opacity:0}}
@keyframes nc-L{0%,24%{transform:translateX(0)}60%,100%{transform:translateX(-102%)}}
@keyframes nc-R{0%,24%{transform:translateX(0)}60%,100%{transform:translateX(102%)}}
@keyframes nc-glow{0%,22%{opacity:0;width:2px}30%{opacity:1;width:6px}58%{opacity:1;width:46vw}100%{opacity:0;width:60vw}}
@keyframes nc-oc{0%,40%{opacity:0;transform:translateY(10px)}52%,84%{opacity:1;transform:none}100%{opacity:0}}
.nc .rgb{text-shadow:-3px 0 #f0f,3px 0 #0ff,0 0 14px #fff8}
.nc .stat{position:absolute;inset:-40px;background-image:radial-gradient(#fff 1px,transparent 1.4px),radial-gradient(#9aa 1px,transparent 1.5px);background-size:5px 5px,7px 7px;background-position:0 0,2px 3px;opacity:.45;animation:nc-static .18s steps(4) infinite}
.nc .scan{position:absolute;left:0;right:0;top:0;height:22%;background:linear-gradient(transparent,rgba(255,255,255,.14),transparent);animation:nc-scan 1.1s linear infinite}
.nc .fall{position:absolute;inset:0;background-image:
  repeating-linear-gradient(90deg,rgba(0,0,0,0) 0 38px,rgba(90,60,10,.55) 38px 42px,rgba(0,0,0,0) 42px 80px),
  repeating-linear-gradient(0deg,oklch(.82 .13 92) 0 120px,oklch(.62 .1 80) 120px 130px,oklch(.74 .12 88) 130px 300px,oklch(.45 .07 70) 300px 306px)}
.nc .streak{position:absolute;inset:0;background-image:repeating-linear-gradient(90deg,transparent 0 11px,rgba(255,250,200,.35) 11px 12px,transparent 12px 29px);mix-blend-mode:screen}
</style>`

const delay = (t) => `animation-delay:-${t.toFixed(2)}s`

export function noclipUi(ctx, player) {
  const s = player.state ?? {}
  if (s.level == null) return ''
  const now = ctx.now()
  let out = ''
  const ti = s.noclipIn != null ? (now - s.noclipIn) / 1000 : -1
  const to = s.exitAt ? (now - s.exitAt) / 1000 : 1e9
  if (ti >= 0 && ti < IN) {
    const d = delay(ti), a = (name, dur, extra = 'linear forwards') => `animation:${name} ${dur}s ${extra};${d}`
    // the two layered animations of a fall layer each need their own delay, so they are written out in full
    const fallAnim = (spd) => `animation:nc-fall ${spd}s linear infinite,nc-fallA ${IN}s linear forwards;animation-delay:0s,-${ti.toFixed(2)}s`
    out += `${CSS}<div class="nc" style="${a('nc-shake', IN)}">
      <div class="fall" style="${fallAnim(0.35)}"></div><div class="streak" style="${fallAnim(0.12)}"></div>
      <div style="position:absolute;inset:0;${a('nc-blur', IN)}"></div>
      <div style="position:absolute;inset:0;background:#000;${a('nc-black', IN)}"><div class="stat"></div><div class="scan"></div></div>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${a('nc-word', IN)}">
        <div class="rgb" style="font-size:min(14vw,110px);font-weight:700;color:#fff;letter-spacing:.12em;animation:nc-jit .14s steps(2) infinite">NO CLIP</div></div>
      <div style="position:absolute;inset:0;background:#fffbe0;${a('nc-flash', IN)}"></div>
      <div style="position:absolute;left:0;right:0;top:36%;text-align:center;${a('nc-card', IN)}">
        <div style="font-size:min(9vw,64px);font-weight:600;color:#fff7cf;letter-spacing:.32em;text-shadow:0 0 24px #000,0 2px 0 #000">LEVEL 0</div>
        <div style="${a('nc-sub', IN)};margin-top:10px;font-size:15px;color:#f2e6a8;letter-spacing:.18em;text-shadow:0 1px 4px #000">THE LOBBY<br><span style="opacity:.7;font-size:12px;letter-spacing:.1em">Habitable. Do not trust the quiet.</span></div>
      </div></div>`
  } else if (to >= 0 && to < OUT) {
    const d = delay(to), a = (name, dur) => `animation:${name} ${dur}s linear forwards;${d}`
    out += `${CSS}<div class="nc">
      <div style="position:absolute;inset:0;background:#fff;${a('nc-wh', OUT)}"></div>
      <div style="position:absolute;top:0;bottom:0;left:50%;width:6px;transform:translateX(-50%);background:#fff;box-shadow:0 0 60px 30px #fff6c0,0 0 140px 70px #ffd75a88;${a('nc-glow', OUT)}"></div>
      <div style="position:absolute;top:0;bottom:0;left:0;width:50%;background:linear-gradient(90deg,oklch(.84 .12 92),oklch(.7 .1 85));clip-path:polygon(0 0,100% 0,96% 12%,100% 25%,94% 38%,100% 52%,95% 66%,100% 80%,96% 92%,100% 100%,0 100%);${a('nc-L', OUT)}"></div>
      <div style="position:absolute;top:0;bottom:0;right:0;width:50%;background:linear-gradient(270deg,oklch(.84 .12 92),oklch(.7 .1 85));clip-path:polygon(0 0,100% 0,100% 100%,0 100%,4% 90%,0 76%,6% 62%,0 48%,5% 34%,0 20%,4% 8%);${a('nc-R', OUT)}"></div>
      <div style="position:absolute;left:0;right:0;top:34%;text-align:center;${a('nc-oc', OUT)}">
        <div style="font-size:min(7vw,46px);font-weight:600;color:#fff;text-shadow:0 0 20px #000,0 2px 0 #000">You clipped through.</div>
        <div style="margin-top:8px;font-size:14px;color:#f6e9a8;letter-spacing:.12em;text-shadow:0 1px 4px #000">+${L.xpExit} XP · Level 1, The Habitable Zone</div>
      </div></div>`
  }
  return out
}
