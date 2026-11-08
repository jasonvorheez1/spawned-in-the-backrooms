// letterbox and fades over the intro (scripts/lib/intro-cut.js); timed off state.cut so a re-render picks up where it was
export function cutUi(ctx, player) {
  if (player.state.arrive || player.state.arrivePending) return arriveUi(ctx, player)
  const e = ctx.now() - (player.state.cut || ctx.now())
  const d = (ms) => `${ms - e}ms`
  return `<style>
@keyframes cb-in{from{height:0}to{height:11vh}} @keyframes cf-out{from{opacity:1}to{opacity:0}} @keyframes cf-in{from{opacity:0}to{opacity:1}}
@keyframes cc{0%{opacity:0}15%{opacity:.85}80%{opacity:.85}100%{opacity:0}}
.cb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:50;animation:cb-in 1.2s ease-out both;animation-delay:${d(0)}}
.cfa{position:fixed;inset:0;background:#000;z-index:49;animation:cf-out 2.2s ease-out both;animation-delay:${d(0)}}
.cfy{position:fixed;inset:0;background:#f4e39a;z-index:49;opacity:0;animation:cf-in 2.6s ease-in forwards;animation-delay:${d(31600)}}
.cc{position:fixed;left:6vw;bottom:14vh;z-index:51;color:#f2ead8;font:400 15px/1.4 Georgia,serif;letter-spacing:.08em;opacity:0;animation:cc 5s ease both;animation-delay:${d(1200)}}
</style><div class="cfa"></div><div class="cb" style="top:0"></div><div class="cb" style="bottom:0"></div>${e > 31300 ? '<div class="cfy"></div>' : ''}<div class="cc">a tuesday night, 2006</div><div class="cc" style="animation-delay:${d(5200)}">that humming again.</div>`
}

// the Level 0 arrival (scripts/lib/arrive-cut.js): the yellow lifts, letterbox, a caption, then the title card as the camera settles
function arriveUi(ctx, player) {
  const e = player.state.arrive ? ctx.now() - player.state.arrive : 0
  const d = (ms) => `${ms - e}ms`
  if (!player.state.arrive) return `<div style="position:fixed;inset:0;background:#f4e39a;z-index:49"></div>`
  return `<style>
@keyframes ay-out{from{opacity:1}to{opacity:0}} @keyframes ab-out{from{height:11vh}to{height:0}}
@keyframes acc{0%{opacity:0}15%{opacity:.85}80%{opacity:.85}100%{opacity:0}}
@keyframes atitle{0%{opacity:0;letter-spacing:.5em}20%{opacity:1}80%{opacity:1}100%{opacity:0;letter-spacing:.3em}}
.ab{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:50;animation:ab-out 1.4s ease-in both;animation-delay:${d(15800)}}
.ay{position:fixed;inset:0;background:#f4e39a;z-index:49;animation:ay-out 2.4s ease-out both;animation-delay:${d(0)}}
.acc{position:fixed;left:6vw;bottom:14vh;z-index:51;color:#f2ead8;font:400 15px/1.4 Georgia,serif;letter-spacing:.08em;opacity:0;animation:acc 4.6s ease both}
.at{position:fixed;left:0;right:0;top:40%;text-align:center;z-index:51;color:#f2c14e;text-shadow:2px 2px #000;opacity:0;animation:atitle 4.2s ease both;animation-delay:${d(13600)}}
</style><div class="ay"></div><div class="ab" style="top:0"></div><div class="ab" style="bottom:0"></div>
<div class="acc" style="animation-delay:${d(5600)}">the carpet is wet. it smells like old rain.</div>
<div class="acc" style="animation-delay:${d(10200)}">and the lights. the lights never stop humming.</div>
<div class="at"><div style="font-size:44px">LEVEL 0</div><div style="font-size:16px;letter-spacing:.3em;opacity:.75;margin-top:6px">THE LOBBY</div></div>`
}
