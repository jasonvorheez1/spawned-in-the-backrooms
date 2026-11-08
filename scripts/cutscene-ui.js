// letterbox and fades over the intro (scripts/lib/intro-cut.js); timed off state.cut so a re-render picks up where it was
export function cutUi(ctx, player) {
  const e = ctx.now() - (player.state.cut || ctx.now())
  const d = (ms) => `${ms - e}ms`
  return `<style>
@keyframes cb-in{from{height:0}to{height:11vh}} @keyframes cf-out{from{opacity:1}to{opacity:0}} @keyframes cf-in{from{opacity:0}to{opacity:1}}
@keyframes cc{0%{opacity:0}15%{opacity:.85}80%{opacity:.85}100%{opacity:0}}
.cb{position:fixed;left:0;right:0;height:11vh;background:#000;z-index:50;animation:cb-in 1.2s ease-out both;animation-delay:${d(0)}}
.cfa{position:fixed;inset:0;background:#000;z-index:49;animation:cf-out 2.2s ease-out both;animation-delay:${d(0)}}
.cfy{position:fixed;inset:0;background:#f4e39a;z-index:49;opacity:0;animation:cf-in 2.6s ease-in forwards;animation-delay:${d(21600)}}
.cc{position:fixed;left:6vw;bottom:14vh;z-index:51;color:#f2ead8;font:400 15px/1.4 Georgia,serif;letter-spacing:.08em;opacity:0;animation:cc 5s ease both;animation-delay:${d(1200)}}
</style><div class="cfa"></div><div class="cb" style="top:0"></div><div class="cb" style="bottom:0"></div><div class="cfy"></div><div class="cc">a tuesday night, 2006</div>`
}
