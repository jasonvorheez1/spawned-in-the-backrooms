// title screen (revamp, johnadams2, Nov 8): a 2006 camcorder tape running over the live halls.
// REC light, tape counter and date stamp in the corners, VHS grain and tracking roll, the title buzzing like a troffer.
// Left: the menu and the save on this tape. Bottom: the line every wanderer heard before they fell through.
const PLACE = { main: 'LEVEL 0 · THE LOBBY', level1: 'LEVEL 1 · HABITABLE ZONE', level2: 'LEVEL 2 · PIPE DREAMS', level3: 'LEVEL 3 · ELECTRICAL STATION', gamma: 'M.E.G. BASE GAMMA', level4: 'LEVEL 4 · ABANDONED OFFICE', level5: 'LEVEL 5 · TERROR HOTEL', level6: 'LEVEL 6 · LIGHTS OUT', level61: 'LEVEL 6.1 · SNACKROOMS', level7: 'LEVEL 7 · THALASSOPHOBIA', level8: 'LEVEL 8 · CAVE SYSTEMS', level10: 'LEVEL 10 · BUMPER CROP', level11: 'LEVEL 11 · INFINITE CITY', home11: 'LEVEL 11 · HOME', level21: 'LEVEL 2.1 · LOCKED', debug: 'DEBUG ROOM' }
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const CSS = `<style>
#mm{position:fixed;inset:0;pointer-events:auto;overflow:hidden;color:#f4e6b8;font-family:'VCR OSD Mono','Share Tech Mono','Monofonto',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;animation:mm-in 1.1s ease-out both}
#mm .shade{position:absolute;inset:0;background:radial-gradient(ellipse 120% 95% at 62% 48%,rgba(0,0,0,0) 38%,rgba(8,6,2,.55) 78%,rgba(4,3,1,.9) 100%),linear-gradient(90deg,rgba(9,7,2,.86) 0,rgba(9,7,2,.6) 30%,rgba(9,7,2,0) 62%)}
#mm .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,rgba(0,0,0,0) 1px 3px);mix-blend-mode:multiply;pointer-events:none}
#mm .grain{position:absolute;inset:-50%;background-image:radial-gradient(rgba(255,240,200,.07) 1px,transparent 1.2px),radial-gradient(rgba(0,0,0,.18) 1px,transparent 1.2px);background-size:3px 3px,5px 5px;background-position:0 0,1px 2px;animation:mm-grain .5s steps(4) infinite;pointer-events:none;opacity:.8}
#mm .roll{position:absolute;left:0;right:0;height:9vh;top:-12vh;background:linear-gradient(180deg,rgba(255,250,220,0),rgba(255,250,220,.07) 40%,rgba(255,255,255,.13) 52%,rgba(255,250,220,0));filter:blur(1px);animation:mm-roll 9s linear infinite;pointer-events:none}
#mm .osd{position:absolute;font-size:clamp(14px,1.6vw,22px);color:#fffbe8;text-shadow:2px 2px 0 rgba(0,0,0,.75),0 0 6px rgba(255,255,255,.25);letter-spacing:.1em}
#mm .rec{top:4.5vh;right:4vw;display:flex;align-items:center;gap:.5em}
#mm .rec i{width:.62em;height:.62em;border-radius:50%;background:#ff2a1a;box-shadow:0 0 10px #ff2a1a;animation:mm-blink 1.4s steps(1) infinite}
#mm .ctr{top:calc(4.5vh + 1.8em);right:4vw;opacity:.85;font-size:clamp(11px,1.1vw,15px)}
#mm .date{bottom:5vh;right:4vw;color:#ffb43a;text-align:right;line-height:1.25;text-shadow:2px 2px 0 rgba(0,0,0,.8),0 0 8px rgba(255,150,30,.35)}
#mm .play{top:4.5vh;left:4vw}
#mm .bat{bottom:5vh;left:4vw;display:flex;align-items:center;gap:6px;font-size:clamp(10px,.9vw,13px)}
#mm .bat b{display:inline-block;width:30px;height:13px;border:2px solid #fffbe8;position:relative;box-shadow:2px 2px 0 rgba(0,0,0,.7)}
#mm .bat b:after{content:'';position:absolute;right:-6px;top:2px;width:3px;height:5px;background:#fffbe8}
#mm .bat b i{position:absolute;left:2px;top:2px;bottom:2px;width:6px;background:#fffbe8;animation:mm-blink 1.8s steps(1) infinite}
#mm .col{position:absolute;left:7vw;top:50%;transform:translateY(-52%);width:min(500px,84vw)}
#mm .tag{display:inline-block;font-size:11px;letter-spacing:.24em;color:#1a1306;background:#e9c45a;padding:3px 9px 2px;margin-bottom:14px;box-shadow:3px 3px 0 rgba(0,0,0,.6)}
#mm h1{margin:0;font-family:'Arial Narrow','Helvetica Neue',Arial,sans-serif;font-weight:900;font-size:clamp(46px,7.4vw,108px);line-height:.86;letter-spacing:-.01em;color:#fff7d6;text-shadow:-2px 0 0 rgba(255,40,40,.55),2px 0 0 rgba(40,220,255,.45),0 0 22px rgba(255,214,110,.55),0 0 60px rgba(255,190,60,.25);animation:mm-buzz 7s infinite}
#mm h1 span{display:block;font-size:.34em;letter-spacing:.42em;font-weight:700;color:#e9c45a;margin-bottom:.18em;text-shadow:0 0 12px rgba(255,190,60,.5)}
#mm .where{margin:16px 0 28px;font-size:13px;letter-spacing:.18em;color:#e9c45a;display:flex;align-items:center;gap:10px}
#mm .where:before{content:'';width:28px;height:2px;background:#e9c45a;box-shadow:0 0 8px #e9c45a}
#mm button{display:flex;align-items:baseline;gap:14px;width:100%;text-align:left;background:none;border:0;color:#f4e6b8;font:inherit;font-size:clamp(20px,2vw,28px);padding:8px 0;cursor:pointer;letter-spacing:.14em;transition:color .12s,transform .12s}
#mm button em{font-style:normal;font-size:.55em;color:#e9c45a;opacity:.0;width:1em;transition:opacity .12s}
#mm button small{font-size:11px;letter-spacing:.1em;opacity:.45;text-transform:none;margin-left:auto}
#mm button:hover{color:#fff;transform:translateX(6px);text-shadow:0 0 12px rgba(255,214,110,.8),-1px 0 0 rgba(255,40,40,.5),1px 0 0 rgba(40,220,255,.4)}
#mm button:hover em{opacity:1;animation:mm-blink .8s steps(1) infinite}
#mm button:hover small{opacity:.8}
#mm .save{margin-top:26px;display:grid;grid-template-columns:repeat(4,auto);gap:4px 22px;justify-content:start;padding:12px 14px;border:1px solid rgba(233,196,90,.35);background:rgba(20,14,4,.45);box-shadow:inset 0 0 18px rgba(0,0,0,.5);font-size:10.5px;letter-spacing:.16em;color:rgba(233,196,90,.7)}
#mm .save b{display:block;font-weight:400;font-size:17px;letter-spacing:.06em;color:#fff3cf;margin-top:2px}
#mm .save .cash{color:#a9d98f}
#mm .quote{position:absolute;left:50%;bottom:5.2vh;transform:translateX(-50%);width:min(620px,60vw);text-align:center;font-family:Georgia,'Times New Roman',serif;font-style:italic;text-transform:none;letter-spacing:.02em;font-size:clamp(11px,1vw,14px);color:rgba(255,246,220,.55);text-shadow:1px 1px 0 rgba(0,0,0,.8)}
@keyframes mm-in{0%{opacity:0;filter:brightness(3) blur(3px)}12%{opacity:1;filter:brightness(2) blur(1px)}20%{filter:brightness(.6)}100%{filter:none}}
@keyframes mm-grain{0%{transform:translate(0,0)}25%{transform:translate(-7%,4%)}50%{transform:translate(5%,-6%)}75%{transform:translate(-3%,7%)}100%{transform:translate(6%,-2%)}}
@keyframes mm-roll{0%{top:-12vh}55%{top:112vh}100%{top:112vh}}
@keyframes mm-blink{0%{opacity:1}50%{opacity:0}}
@keyframes mm-buzz{0%,88%,100%{opacity:1}89%{opacity:.35}90%{opacity:1}91.5%{opacity:.55}93%{opacity:1}96%{opacity:.85}}
@media (max-width:700px){#mm .col{left:6vw;top:46%}#mm .quote{display:none}#mm .save{grid-template-columns:repeat(2,auto)}#mm .shade{background:linear-gradient(90deg,rgba(9,7,2,.85),rgba(9,7,2,.35))}}
</style>`
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0')
export function mainMenu(ctx, player) {
  const s = player.state ?? {}, place = ctx.place?.id ?? player.place, where = PLACE[place] ?? 'THE BACKROOMS'
  const d = new Date(), h = d.getHours(), ap = h < 12 ? 'AM' : 'PM'
  const tape = (ctx.now() / 1000) % 7200 // the tape counter: how long this tape has run
  const almond = (s.almonds ?? 0) + (s.almondsG ?? 0) + (s.almondsR ?? 0) + (s.almondsB ?? 0)
  const go = (k, t, sub, lock) => `<button onclick="sendAction('mmenu',{k:'${k}'}${lock ? ',{relockPointer:true}' : ''})"><em>▶</em>${t}<small>${sub}</small></button>`
  return `${CSS}<div id="mm" data-modal>
    <div class="shade"></div><div class="grain"></div><div class="scan"></div><div class="roll"></div>
    <div class="osd play">PLAY ▶</div>
    <div class="osd rec"><i></i>REC</div>
    <div class="osd ctr">SP ${pad(tape / 3600, 1)}:${pad((tape / 60) % 60)}:${pad(tape % 60)}</div>
    <div class="osd bat"><b><i></i></b></div>
    <div class="osd date">${pad(((h + 11) % 12) + 1)}:${pad(d.getMinutes())} ${ap}<br>${MON[d.getMonth()]}. ${pad(d.getDate())} 2006</div>
    <div class="col">
      <div class="tag">FOUND TAPE · M.E.G. ARCHIVE</div>
      <h1><span>THE</span>BACKROOMS</h1>
      <div class="where">${where}</div>
      ${go('play', 'Continue', 'wake up where you were', true)}
      ${go('char', 'Character', 'M.E.G. intake form 7-B')}
      ${go('settings', 'Settings', 'sound · look · keys')}
      <div class="save">
        <div>LEVEL<b>${s.level ?? 1}</b></div>
        <div>CASH<b class="cash">$${((s.cents ?? 0) / 100).toFixed(2)}</b></div>
        <div>ALMOND<b>${almond}</b></div>
        <div>KARMA<b>${s.karma ?? 0}</b></div>
      </div>
    </div>
    <div class="quote">"If you're not careful and you noclip out of reality in the wrong areas, you'll end up in the Backrooms."</div>
  </div>`
}
