// Fix-It Felix Jr.'s screen: the cabinet's CRT, drawn from ctx.session.ffv (scripts/lib/felix-game.js) with sprites cut from Shelly's sheets.
import { GEO } from './felix-game.js'
const ATLAS = '/cdn/value.aa6b76482d548e301e01ff8433d62b85476d2b3f6bbed408e86badbdbe0527d0.png', AW = 512, AH = 353
const A = {"building":[0,0,208,167],"r_up":[210,0,47,72],"r_fall1":[259,0,66,68],"r_angry":[327,0,66,68],"r_fall2":[395,0,68,66],"logo":[0,169,189,66],"r_climb1":[191,169,59,64],"r_climb2":[252,169,61,64],"door":[315,169,39,64],"r_smash1":[356,169,66,58],"r_smash2":[424,169,66,58],"r_walk2":[0,237,43,56],"r_walk1":[45,237,43,55],"r_idle":[90,237,45,54],"cloud":[137,237,90,44],"win2":[229,237,24,39],"win1":[255,237,24,39],"win0":[281,237,24,39],"f_idle":[307,237,15,33],"f_medal":[324,237,15,33],"f_pie":[341,237,18,33],"f_wave":[361,237,22,33],"bubble":[0,295,172,33],"f_walk1":[174,295,19,32],"f_walk2":[195,295,19,32],"f_up":[216,295,22,32],"f_down":[240,295,28,32],"medal":[270,295,30,32],"f_jump":[302,295,21,30],"f_jump2":[325,295,21,30],"f_d2":[348,295,23,29],"r_mud":[373,295,85,28],"f_d1":[460,295,29,23],"f_d3":[0,330,29,23],"r_say":[31,330,161,22],"f_lie":[194,330,32,14],"duck1":[228,330,20,13],"pie":[250,330,11,13],"duck2":[263,330,20,12],"bush":[285,330,16,12],"brick":[303,330,12,8],"head":[317,330,10,7]}
const SC = 1 // sprites are already pixel-doubled by the screen's scale
// a sprite with its feet at (x, y), centred on x; flip mirrors it
const sp = (n, x, y, flip = false, extra = '') => { const [ax, ay, w, h] = A[n]; return `<i style="left:${Math.round(x - w / 2)}px;top:${Math.round(y - h)}px;width:${w}px;height:${h}px;background-position:-${ax}px -${ay}px;${flip ? 'transform:scaleX(-1);' : ''}${extra}"></i>` }
const pad = (n, w = 6) => String(n ?? 0).padStart(w, '0')
const CSS = `<style>#ffj{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#06101ef0,#010206fa);pointer-events:none;font-family:'Geist Pixel Square',monospace}
#ffj .bez{background:linear-gradient(#5ec4f0,#3a9fd6);padding:16px 18px 18px;border-radius:14px;box-shadow:0 30px 70px #000c,inset 0 0 0 4px #fff3,inset 0 0 0 10px #f7d23a}
#ffj .crt{position:relative;width:${GEO.W}px;height:${GEO.H}px;transform:scale(1.85);transform-origin:top left;overflow:hidden;background:#000;image-rendering:pixelated}
#ffj .wrap{width:${GEO.W * 1.85}px;height:${GEO.H * 1.85}px;border:6px solid #000;border-radius:10px;overflow:hidden;position:relative;box-shadow:inset 0 0 40px #000}
#ffj .wrap::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0005 0 1px,transparent 1px 3px),radial-gradient(ellipse,transparent 60%,#0008);pointer-events:none}
#ffj .crt i{position:absolute;display:block;background-image:url(${ATLAS});background-repeat:no-repeat;background-size:${AW}px ${AH}px;image-rendering:pixelated}
#ffj .bld{position:absolute;left:16px;width:288px;top:${GEO.roof}px;bottom:48px;background:#9c3b2a repeating-linear-gradient(0deg,#7a2a1e 0 1px,transparent 1px 6px),#9c3b2a;box-shadow:inset 0 0 0 2px #5a1e14}
#ffj .ledge{position:absolute;left:12px;width:296px;height:5px;background:#c9c3a4;box-shadow:0 2px #6e6a55}
#ffj .street{position:absolute;left:0;right:0;bottom:0;height:48px;background:#3a3f44;border-top:3px solid #9b9b8e}
#ffj .sky{position:absolute;inset:0 0 auto 0;height:${GEO.roof}px;background:linear-gradient(#0a0d2a,#1d2a5c)}
#ffj .bed{position:absolute;width:30px;height:7px;background:#7a3fa8;box-shadow:inset 0 -3px #4d8a2e}
#ffj .sh{position:absolute;width:6px;height:44px;background:#3b6b3a;box-shadow:inset 0 0 0 1px #1d3a1c}
#ffj .hud{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;padding:4px 8px;font-size:9px;color:#fff;text-shadow:1px 1px #000;letter-spacing:.06em}
#ffj .hud b{color:#ff3b3b;font-weight:400}#ffj .hud u{color:#ffd43a;text-decoration:none}
#ffj .msg{position:absolute;left:0;right:0;top:150px;text-align:center;color:#fff;font-size:11px;text-shadow:1px 1px #000;letter-spacing:.08em}
#ffj .msg em{display:block;font-style:normal;color:#ffd43a;font-size:16px;margin-bottom:6px}
#ffj .blink{animation:ffb 1s steps(2) infinite}@keyframes ffb{50%{opacity:0}}
#ffj .inv{animation:ffi .16s steps(2) infinite}@keyframes ffi{50%{opacity:.35}}
@media (max-height:900px){#ffj .bez{zoom:.85}}@media (max-height:760px){#ffj .bez{zoom:.7}}@media (max-height:620px){#ffj .bez{zoom:.58}}@media (max-height:480px){#ffj .bez{zoom:.45}}
#ffj .keys{position:absolute;left:0;right:0;bottom:6px;text-align:center;color:#9fb3c8;font-size:8px;letter-spacing:.1em;text-shadow:1px 1px #000}</style>`

function attract(best) {
  return `<div class="sky" style="height:400px"></div>${sp('logo', 160, 120)}${sp('r_angry', 90, 300)}${sp('f_wave', 220, 300)}
<div class="msg" style="top:200px"><div class="blink">PRESS SPACE</div><div style="margin-top:8px;color:#9fb3c8">INSERT COIN · HI ${pad(best)}</div></div>
<div class="keys">A D  SLIDE · W S  HOP · SPACE  FIX</div><div style="position:fixed;top:24px;left:24px;padding:10px 18px;background:#ffd23f;color:#111;font:700 26px monospace;box-shadow:0 0 0 3px #111,4px 4px 0 3px #111;letter-spacing:.06em">[E] LEAVE</div>`
}

export function felixUi(ctx, player) {
  const a = player.state?.arcade
  if (!a || a.game !== 'felix') return ''
  const v = ctx.session?.ffv
  let body
  if (!v || a.phase === 'attract') body = attract(player.state.felixBest ?? 0)
  else {
    const t = v.t ?? 0, flick = Math.floor(t / 160) % 2
    let h = `<div class="sky"></div><div class="bld"></div><div class="street"></div>`
    for (let r = 0; r < 3; r++) h += `<div class="ledge" style="top:${GEO.feet(r)}px"></div>`
    h += `<div class="ledge" style="top:${GEO.roof}px;height:7px"></div>`
    // windows: digit per window, 0 whole, 1 one pane out, 2 both out
    for (let i = 0; i < 15; i++) {
      const c = i % 5, r = Math.floor(i / 5), x = GEO.colX(c), y = GEO.feet(r)
      if (i === v.door) h += sp('door', x, y + 2)
      else h += sp(['win2', 'win1', 'win0'][+v.w[i]], x, y - 2)
    }
    for (const g of v.beds) { const [c, r] = g.split(',').map(Number); h += `<div class="bed" style="left:${GEO.colX(c) - 15}px;top:${GEO.feet(r) - 84 + 2}px"></div>` }
    for (const g of v.shut) { const [c, r] = g.split(',').map(Number); h += `<div class="sh" style="left:${GEO.colX(c) + 24}px;top:${GEO.feet(r) - 48}px"></div>` }
    if (v.pie) h += sp('pie', GEO.colX(v.pie[0]), GEO.feet(v.pie[1]) - 10)
    // Ralph
    const [rx, rm, rd] = v.ra
    if (v.ph === 'roof') {
      const p = Math.min(1, v.age / 6000)
      h += sp('cloud', 110 - p * 40, 50) + sp('cloud', 210 + p * 40, 50)
      if (p > 0.25) h += sp('medal', 160, Math.min(GEO.roof - 10, 40 + (p - 0.25) * 400))
      h += p < 0.5 ? sp('r_angry', 160, GEO.roof) : p < 0.8 ? sp(flick ? 'r_fall1' : 'r_fall2', 250, GEO.roof - 40 + (p - 0.5) * 900) : sp('r_mud', 250, GEO.H - 2)
      h += sp(p > 0.3 ? 'f_medal' : 'f_wave', 120, GEO.roof)
    } else if (v.ph === 'clear') h += sp(flick ? 'r_climb1' : 'r_climb2', rx, GEO.roof - Math.min(60, v.age / 25))
    else if (v.ph === 'intro') h += sp('r_angry', rx, GEO.roof) + sp('r_say', 160, GEO.roof - 74)
    else h += sp(rm === 'smash' ? (flick ? 'r_smash1' : 'r_smash2') : rm === 'walk' ? (flick ? 'r_walk1' : 'r_walk2') : 'r_idle', rx, GEO.roof, rd < 0)
    for (const [bx, by] of v.b) h += sp('brick', bx, by)
    for (const [dx, dr, dd] of v.d) h += sp(flick ? 'duck1' : 'duck2', dx, GEO.feet(dr) - 40, dd < 0)
    // Felix
    if (v.ph !== 'roof') {
      const [fx, fy, fd, fp] = v.f
      if (v.ph === 'dead') { const ph = Math.floor(v.age / 140); h += v.age < 1000 ? sp(['f_d1', 'f_d2', 'f_d3', 'f_d2'][ph % 4], fx, fy - 4) : sp('f_lie', fx, fy) }
      else h += sp(fp === 'ham' ? 'f_down' : fp === 'walk' ? (flick ? 'f_walk1' : 'f_walk2') : fp === 'jump' ? 'f_jump' : 'f_idle', fx, fy, fd < 0, v.inv ? '' : '').replace('<i ', v.inv ? '<i class="inv" ' : '<i ')
    }
    h += `<div class="hud"><span><b>1UP</b> ${pad(v.score)}</span><span><u>HI</u> ${pad(v.best)}</span><span>R${v.round}·${v.screen + 1}/3 ${'♥'.repeat(Math.max(0, v.lives))}</span></div>`
    if (v.ph === 'intro') h += `<div class="msg"><em>ROUND ${v.round}</em>FIX IT FELIX!</div>`
    if (v.ph === 'clear') h += `<div class="msg"><em>YOU FIXED IT!</em></div>`
    if (v.ph === 'roof') h += `<div class="msg" style="top:120px"><em>THE NICELANDERS THANK YOU</em>+5000</div>`
    if (v.ph === 'over') h += `<div class="msg"><em>GAME OVER</em>SCORE ${pad(v.score)}<div class="blink" style="margin-top:8px">SPACE: AGAIN</div></div>`
    body = h
  }
  return `${CSS}<div id="ffj"><div class="bez"><div class="wrap"><div class="crt">${body}</div></div></div></div>`
}
