// letterbox and fades over the intro (scripts/lib/intro-cut.js); timed off state.cut so a re-render picks up where it was
export function cutUi(ctx, player) {
  if (player.state.t0cut) return t0Ui(ctx, player)
  if (player.state.arrive || player.state.arrivePending) return arriveUi(ctx, player)
  const e = ctx.now() - (player.state.cut || ctx.now())
  const d = (ms) => `${ms - e}ms`
  return `<style>
@keyframes cb-in{from{height:0}to{height:11vh}} @keyframes cf-out{from{opacity:1}to{opacity:0}} @keyframes cf-in{from{opacity:0}to{opacity:1}}
@keyframes cc{0%{opacity:0}15%{opacity:.85}80%{opacity:.85}100%{opacity:0}}
.cb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:50;animation:cb-in 1.2s ease-out both;animation-delay:${d(0)}}
.cfa{position:fixed;inset:0;background:#000;z-index:49;animation:cf-out 2.2s ease-out both;animation-delay:${d(0)}}
.cfy{position:fixed;inset:0;background:#f4e39a;z-index:49;opacity:0;animation:cf-in 2.6s ease-in forwards;animation-delay:${d(37600)}}
.cc{position:fixed;left:6vw;bottom:14vh;z-index:51;color:#f2ead8;font:400 15px/1.4 Georgia,serif;letter-spacing:.08em;opacity:0;animation:cc 5s ease both;animation-delay:${d(1200)}}
</style><div class="cfa"></div><div class="cb" style="top:0"></div><div class="cb" style="bottom:0"></div>${e > 37300 ? '<div class="cfy"></div>' : ''}`
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
<div class="at"><div style="font-size:44px">LEVEL 0</div><div style="font-size:16px;letter-spacing:.3em;opacity:.75;margin-top:6px">THE LOBBY</div></div>`
}

// the tutorial Level 0's cutscenes (scripts/lib/tut0-cut.js): letterbox, captions, and the title at the end
const T0CAP = { // plain and useful, said once: what it is, what to do
  almond: [[1400, 3600, "Almond water. Drink it when you're hurt."]],
  halogen: [[3700, 2200, "Backrooms Robotics HALOGEN unit. Still works."]],
  smiler: [[9400, 2800, "Smilers stay in the dark. Stay under the lights."]],
  shift: [[2000, 3000, "The way back is gone."]],
  final: [],
}
function t0Ui(ctx, player) {
  const c = player.state.t0cut, e = ctx.now() - c.at, d = (ms) => `${ms - e}ms`, fin = c.id === "final"
  const caps = (T0CAP[c.id] || []).map(([at, len, txt]) => `<div class="tcc" style="animation-duration:${len}ms;animation-delay:${d(at)}">${txt}</div>`).join("")
  return `<style>
@keyframes tb-in{from{height:0}to{height:11vh}} @keyframes tcc{0%{opacity:0}12%{opacity:.9}85%{opacity:.9}100%{opacity:0}}
@keyframes tblack{from{opacity:0}to{opacity:1}} @keyframes ttitle{0%{opacity:0;letter-spacing:.6em;filter:blur(6px)}25%{opacity:1;letter-spacing:.32em;filter:blur(0)}82%{opacity:1}100%{opacity:0}}
@keyframes tsub{0%{opacity:0}30%{opacity:.6}82%{opacity:.6}100%{opacity:0}}
.tb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:50;animation:tb-in .7s ease-out both;animation-delay:${d(0)}}
.tcc{position:fixed;left:0;right:0;bottom:14vh;text-align:center;z-index:53;color:#f2ead8;font:400 16px/1.4 Georgia,serif;letter-spacing:.06em;text-shadow:1px 1px 3px #000;opacity:0;animation-name:tcc;animation-fill-mode:both;animation-timing-function:ease}
.tbk{position:fixed;inset:0;background:#000;z-index:51;opacity:0;animation:tblack 1.1s ease-in both;animation-delay:${d(8600)}}
.tt{position:fixed;left:0;right:0;top:41%;text-align:center;z-index:54;color:#f2c14e;font:400 46px/1.1 Georgia,serif;text-shadow:0 0 18px rgba(242,193,78,.35);opacity:0;animation:ttitle 9s ease both;animation-delay:${d(13700)}}
.ts{position:fixed;left:0;right:0;top:calc(41% + 64px);text-align:center;z-index:54;color:#d9cfae;font:400 13px/1 Georgia,serif;letter-spacing:.5em;opacity:0;animation:tsub 8.2s ease both;animation-delay:${d(14700)}}
</style><div class="tb" style="top:0"></div><div class="tb" style="bottom:0"></div>${fin ? `<div class="tbk"></div><div class="tt">SPAWN IN THE BACKROOMS</div><div class="ts">LEVEL 1 · HABITABLE ZONE</div>` : ""}${caps}`
}
export function t0Fade(ctx, player) {
  const f = player.state.t0fade; if (!f || ctx.now() - f > 3000) return ""
  return `<style>@keyframes t0f{from{opacity:1}to{opacity:0}}</style><div style="position:fixed;inset:0;background:#000;z-index:60;pointer-events:none;animation:t0f 2.6s ease-in both;animation-delay:${f - ctx.now()}ms"></div>`
}
