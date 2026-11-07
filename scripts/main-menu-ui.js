// main menu: a HALOGEN-amber title over the live world, left-hand list, M to return later
const PLACE = { main: 'LEVEL 0 · THE LOBBY', level1: 'LEVEL 1 · HABITABLE ZONE', level2: 'LEVEL 2 · PIPE DREAMS', level3: 'LEVEL 3 · ELECTRICAL STATION', gamma: 'M.E.G. BASE GAMMA', level4: 'LEVEL 4 · ABANDONED OFFICE', level5: 'LEVEL 5 · TERROR HOTEL', level6: 'LEVEL 6 · LIGHTS OUT', level7: 'LEVEL 7 · THALASSOPHOBIA', debug: 'DEBUG ROOM' }
const CSS = `<style>
#mm{position:fixed;inset:0;pointer-events:auto;background:linear-gradient(90deg,rgba(10,7,2,.92) 0,rgba(10,7,2,.75) 34%,rgba(10,7,2,.15) 70%,rgba(10,7,2,0));color:#ffb642;font-family:'Monofonto','Share Tech Mono','Geist Pixel',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase}
#mm .col{position:absolute;left:7vw;top:50%;transform:translateY(-50%);max-width:min(520px,80vw)}
#mm h1{font-size:clamp(34px,5vw,64px);line-height:.95;margin:0;color:#ffd27a;text-shadow:0 0 14px rgba(255,170,40,.55),3px 3px 0 #1a1004;animation:mmf 6s infinite}
#mm .sub{font-size:13px;opacity:.6;margin:10px 0 34px;text-transform:none;letter-spacing:.1em;font-style:italic}
#mm button{display:block;width:100%;text-align:left;background:none;border:0;border-left:3px solid transparent;color:#ffb642;font:inherit;font-size:22px;padding:9px 16px;cursor:pointer;letter-spacing:.12em}
#mm button:hover{border-left-color:#ffb642;background:rgba(255,182,66,.12);color:#ffe1a3;text-shadow:0 0 8px rgba(255,170,40,.7)}
#mm button small{display:block;font-size:11px;opacity:.5;letter-spacing:.08em;margin-top:2px}
#mm .foot{margin-top:34px;font-size:11px;opacity:.45;border-top:1px solid rgba(255,182,66,.3);padding-top:10px;display:flex;justify-content:space-between;gap:16px}
@keyframes mmf{0%,92%,100%{opacity:1}93%{opacity:.55}95%{opacity:1}97%{opacity:.7}}
</style>`
export function mainMenu(ctx, player) {
  const s = player.state ?? {}, where = PLACE[ctx.place?.id ?? player.place] ?? 'THE BACKROOMS'
  const m = (k, t, sub) => `<button onclick="sendAction('mmenu',{k:'${k}'},{relockPointer:true})">${t}<small>${sub}</small></button>`
  return `${CSS}<div id="mm" data-modal><div class="col">
    <h1>THE<br>BACKROOMS</h1><div class="sub">You've been here before.</div>
    ${m('play', 'Continue', `${where} · LV ${s.level ?? 1}`)}
    <button onclick="sendAction('mmenu',{k:'char'})">Character<small>critter creator · M.E.G. intake form 7-B</small></button>
    <div class="foot"><span>BACKROOMS ROBOTICS · HALOGEN</span><span>M · MENU</span></div>
  </div></div>`
}
