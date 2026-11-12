// Block Panic's screen: a CRT in its cabinet, drawn from player.state.arcade (scripts/arcade-play.js).
const COL = { I: '#36e0ff', O: '#ffe14a', T: '#c35bff', S: '#4cff6a', Z: '#ff4a6a', J: '#4a7bff', L: '#ff9b2e' }
const SHAPES = { I: [[0,1],[1,1],[2,1],[3,1]], O: [[0,0],[1,0],[0,1],[1,1]], T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]] }
const pad = (n, w = 6) => String(n ?? 0).padStart(w, '0')
const cell = (c, sz) => c === '.' ? `<i style="width:${sz}px;height:${sz}px;background:#0a0b1c;box-shadow:inset 0 0 0 1px #15183a"></i>`
  : c === '*' ? `<i style="width:${sz}px;height:${sz}px;background:#0a0b1c;box-shadow:inset 0 0 0 2px #ffffff40"></i>`
  : `<i style="width:${sz}px;height:${sz}px;background:${COL[c]};box-shadow:inset 3px 3px 0 #ffffff70,inset -3px -3px 0 #00000055,0 0 8px ${COL[c]}88"></i>`
const CSS = `<style>#arc{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#0b0718ee,#020108f8);pointer-events:none;font-family:'Geist Pixel Square',monospace}
#arc .cab{background:linear-gradient(#17121f,#0b0910);border-radius:18px;padding:18px 22px 14px;box-shadow:0 30px 70px #000c,inset 0 2px 2px #ffffff18}
#arc .scr{display:flex;gap:18px;background:#05050f;border:5px solid #000;border-radius:10px;padding:16px;position:relative;box-shadow:inset 0 0 40px #000,0 0 30px #3a2bff40}
#arc .scr::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0004 0 1px,transparent 1px 3px);pointer-events:none;border-radius:6px}
#arc .well{display:grid;grid-template-columns:repeat(10,auto);gap:1px;background:#1e2250;border:3px solid #6b6bff;box-shadow:0 0 14px #6b6bffaa}
#arc .side{display:flex;flex-direction:column;gap:12px;color:#fff;min-width:130px}
#arc .lab{font-size:11px;letter-spacing:.2em;color:#ff5fd2}
#arc .num{font-size:22px;color:#fff;text-shadow:0 0 8px #36e0ff}
#arc .nxt{display:grid;grid-template-columns:repeat(4,16px);gap:1px;margin-top:4px}
#arc .msg{position:absolute;left:16px;top:16px;width:233px;height:463px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#05050fd0;color:#fff;text-align:center}
#arc .msg b{font-size:30px;color:#ffe14a;text-shadow:0 0 12px #ff4a6a}
#arc .blink{animation:arcb 1s steps(2) infinite;font-size:13px;letter-spacing:.15em;color:#36e0ff}@keyframes arcb{50%{opacity:0}}
#arc .keys{font-size:10px;color:#9a93c0;line-height:1.7;letter-spacing:.08em}
#arc .clr{color:#ffe14a;font-size:15px;text-shadow:0 0 10px #ff9b2e}</style>`
export function arcadeUi(ctx, player) {
  const a = player.state?.arcade
  if (!a) return ''
  const v = a.view ?? '.'.repeat(200)
  const well = [...v].map((c) => cell(c, 22)).join('')
  const nx = a.next && SHAPES[a.next] ? (() => { const g = new Array(8).fill('.'); for (const [x, y] of SHAPES[a.next]) g[y * 4 + x] = a.next; return g.map((c) => cell(c, 16)).join('') })() : ''
  const fl = a.flash && ctx.now() - (a.flash.at ?? 0) < 900 ? `<div class="clr">${['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'BLOCK PANIC!'][a.flash.n]}</div>` : '<div class="clr">&nbsp;</div>'
  const msg = a.phase === 'attract' ? `<div class="msg"><b>BLOCK<br>PANIC</b><div class="blink">PRESS SPACE</div><div class="keys">INSERT COIN</div></div>`
    : a.phase === 'over' ? `<div class="msg"><b>GAME<br>OVER</b><div class="keys">SCORE ${pad(a.score)}</div><div class="blink">SPACE: AGAIN</div></div>` : ''
  return `${CSS}<div id="arc"><div class="cab"><div class="scr"><div class="well">${well}</div>${msg}<div class="side">
<div><div class="lab">SCORE</div><div class="num">${pad(a.score)}</div></div>
<div><div class="lab">HI</div><div class="num">${pad(Math.max(player.state.arcadeBest ?? 0, a.score ?? 0))}</div></div>
<div><div class="lab">LINES</div><div class="num">${a.lines ?? 0}</div></div>
<div><div class="lab">LEVEL</div><div class="num">${a.level ?? 0}</div></div>
<div><div class="lab">NEXT</div><div class="nxt">${nx}</div></div>${fl}
<div class="keys">A D  MOVE<br>W  ROTATE<br>S  SOFT DROP<br>SPACE  DROP<br>E  LEAVE</div></div></div></div></div>`
}
