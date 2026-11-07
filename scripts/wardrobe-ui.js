// The wardrobe panel (C): pick your critter. Every button sends one 'dress' action.
import C from './lib/data/critter.yml'
const NAMES = { m: 'boy', f: 'girl', none: 'none', tee: 'tee', hoodie: 'hoodie', sweater: 'sweater', overalls: 'overalls', skirt: 'skirt', dress: 'dress', bow: 'bow', flower: 'flower', cap: 'cap', glasses: 'glasses', scarf: 'scarf', tuft: 'tuft', jacket: 'jacket', apron: 'apron', pajamas: 'pyjamas', beanie: 'beanie', crown: 'crown', headphones: 'headphones', partyhat: 'party hat', shades: 'sunglasses', round: 'round', tall: 'big & tall', wide: 'wide', freckles: 'freckles', stripes: 'stripes', patch: 'eye patch', heart: 'heart' }
const CSS = `<style>
#wr{position:absolute;left:24px;top:24px;bottom:24px;width:min(420px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));overflow:auto;background:oklch(0.22 0.03 80 / .94);border:2px solid oklch(0.8 0.12 85);box-shadow:5px 5px 0 #000;padding:14px 16px;color:oklch(0.95 0.03 90);pointer-events:auto}
#wr h2{font-size:22px;margin:0 0 4px;color:oklch(0.88 0.14 85);letter-spacing:.06em}
#wr .sec{font-size:11px;letter-spacing:.14em;opacity:.65;margin:12px 0 5px}
#wr .row{display:flex;flex-wrap:wrap;gap:5px}
#wr button{font:inherit;font-size:13px;padding:5px 9px;background:oklch(0.3 0.03 80);color:inherit;border:1px solid oklch(0.5 0.05 85);cursor:pointer}
#wr button.on{background:oklch(0.82 0.13 85);color:#16140e;border-color:#fff}
#wr button.sw{width:26px;height:26px;padding:0;border:2px solid #0006}
#wr button.sw.on{border:3px solid #fff;outline:2px solid #000}
#wr .x{position:absolute;right:10px;top:10px}
</style>`
const btn = (k, v, on, label) => `<button class="${on ? 'on' : ''}" onclick="sendAction('dress',{k:'${k}',v:'${v}'})">${label}</button>`
const sw = (k, v, on) => `<button class="sw ${on ? 'on' : ''}" style="background:${v || 'conic-gradient(#f2a65a,#9a6440,#f4efe9,#6f7d93,#f2a65a)'}" title="${v || 'species colour'}" onclick="sendAction('dress',{k:'${k}',v:'${v}'})"></button>`
export function wardrobe(ctx, player) {
  if (!player.state.wardrobeOpen) return ''
  const l = { ...C.default, ...(player.state.look || {}) }
  const row = (k, list) => `<div class="row">${list.map((v) => btn(k, v, l[k] === v, NAMES[v] || v)).join('')}</div>`
  const swr = (k, list) => `<div class="row">${list.map((v) => sw(k, v, l[k] === v)).join('')}</div>`
  return `${CSS}<div id="wr" data-modal>
  <button class="x" onclick="sendAction('dress',{k:'close'})">✕ close</button>
  <h2>WARDROBE</h2><div style="font-size:12px;opacity:.7">that's you on the right. everyone sees it.</div>
  <div class="sec">ANIMAL</div>${row('species', C.species)}
  <div class="sec">BODY</div>${row('sex', C.sex)}
  <div class="sec">FUR</div>${swr('fur', C.fur)}
  <div class="sec">EYES</div>${swr('eye', C.eye)}
  <div class="sec">EYE SHAPE</div>${row('eyes', C.eyes)}
  <div class="sec">FACE MARKS</div>${row('marks', C.marks)}
  <div class="sec">OUTFIT</div>${row('outfit', C.outfit)}
  <div class="sec">TOP COLOUR</div>${swr('top', C.cloth)}
  <div class="sec">BOTTOM COLOUR</div>${swr('bottom', C.cloth)}
  <div class="sec">EXTRA</div>${row('acc', C.acc)}
  <div class="sec">RESTING FACE</div>${row('expr', C.expr)}
  <div style="font-size:12px;opacity:.6;margin-top:12px">T swaps your face in play · hits and fear show on it</div>
</div>`
}
