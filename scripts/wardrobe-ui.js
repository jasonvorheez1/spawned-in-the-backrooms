// The critter creator (C): tabs for body, face, clothes and saved outfits. Every button sends one 'dress' action.
import C from './lib/data/critter.yml'
const NAMES = { m: 'boy', f: 'girl', none: 'none', tee: 't-shirt', tank: 'tank top', longsleeve: 'long sleeve', hoodie: 'hoodie', sweater: 'sweater', jacket: 'jacket', pajamas: 'pyjama top', apron: 'apron', dress: 'dress', pants: 'pants', shorts: 'shorts', pjpants: 'pyjama pants', overalls: 'overalls', skirt: 'skirt', longskirt: 'long skirt', sneakers: 'sneakers', boots: 'boots', slippers: 'slippers', bow: 'bow', flower: 'flower', cap: 'cap', beanie: 'beanie', tophat: 'top hat', crown: 'crown', headphones: 'headphones', partyhat: 'party hat', tuft: 'hair tuft', glasses: 'glasses', shades: 'sunglasses', scarf: 'scarf', bowtie: 'bow tie', bell: 'bell collar', cape: 'cape', round: 'round', tall: 'tall', wide: 'wide', freckles: 'freckles', stripes: 'stripes', patch: 'eye patch', heart: 'heart' }
const TABS = [['body', 'BODY'], ['face', 'FACE'], ['clothes', 'CLOTHES'], ['outfits', 'OUTFITS']]
const CSS = `<style>
@media (max-width:700px){#hud{visibility:hidden}}
#cc{position:absolute;left:20px;top:20px;bottom:20px;width:min(440px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 20px)));display:flex;flex-direction:column;background:linear-gradient(180deg,oklch(0.2 0.03 80 / .96),oklch(0.16 0.025 75 / .96));border:2px solid #ffb347;box-shadow:0 0 0 1px #000,6px 6px 0 #000a,0 0 24px rgba(255,170,40,.18);color:#ffcf87;pointer-events:auto;font-family:ui-monospace,Menlo,Consolas,monospace}
#cc .hd{padding:12px 14px 8px;border-bottom:1px solid #ffb34755;display:flex;align-items:center;gap:8px}
#cc h2{font-size:19px;margin:0;letter-spacing:.14em;color:#ffb347;text-shadow:0 0 6px rgba(255,170,40,.6);flex:1}
#cc .tabs{display:flex;border-bottom:1px solid #ffb34755}
#cc .tabs button{flex:1;border:0;border-right:1px solid #ffb34733;background:none;padding:9px 0;font-size:12px;letter-spacing:.12em}
#cc .tabs button.on{background:#ffb347;color:#16140e;text-shadow:none}
#cc .bd{flex:1;overflow:auto;padding:4px 14px 12px}
#cc .sec{font-size:10.5px;letter-spacing:.18em;color:#ffb347;opacity:.8;margin:14px 0 6px;display:flex;justify-content:space-between}
#cc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:5px}
#cc button{font:inherit;font-size:12.5px;color:#ffcf87;background:oklch(0.26 0.03 78);border:1px solid #ffb34755;padding:7px 6px;cursor:pointer;text-transform:lowercase}
#cc button:hover{border-color:#ffb347;background:oklch(0.31 0.04 78)}
#cc button.on{background:#ffb347;color:#16140e;border-color:#fff3d6;box-shadow:0 0 8px rgba(255,170,40,.5)}
#cc .sws{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
#cc button.sw{width:22px;height:22px;padding:0;border:2px solid #0008;box-shadow:none}
#cc button.sw.on{border:2px solid #fff;outline:2px solid #ffb347}
#cc .slot{border:1px solid #ffb34730;padding:6px 8px 8px;margin-top:8px;background:oklch(0.19 0.02 78 / .6)}
#cc .ft{display:flex;gap:6px;padding:10px 14px;border-top:1px solid #ffb34755;flex-wrap:wrap}
#cc .ft button{flex:1;min-width:70px;letter-spacing:.08em}
#cc .ft .go{background:#ffb347;color:#16140e}
#cc .hint{font-size:11px;opacity:.55;margin-top:12px;line-height:1.4}
#cc .fit{display:flex;gap:6px;align-items:center;margin-top:8px}
#cc .fit .nm{flex:1;font-size:12px;opacity:.85}
#cc .sl{display:flex;align-items:center;gap:6px;margin-top:5px}
#cc .sl .nm{width:52px;font-size:12px}
#cc .sl input{flex:1;accent-color:#ffb347}
#cc .sl button{width:26px;padding:3px 0}
#cc .sl .v{width:38px;text-align:right;font-size:11px;opacity:.75}
</style>`
const act = (k, v = '') => `sendAction('dress',{k:'${k}',v:'${v}'})`
const tile = (k, v, on, label) => `<button class="${on ? 'on' : ''}" onclick="${act(k, v)}">${label}</button>`
const sw = (k, v, on) => `<button class="sw ${on ? 'on' : ''}" style="background:${v || 'conic-gradient(#f2a65a,#9a6440,#f4efe9,#6f7d93,#f2a65a)'}" title="${v || 'natural'}" onclick="${act(k, v)}"></button>`
export function wardrobe(ctx, player) {
  const st = player.state
  if (!st.wardrobeOpen) return ''
  const l = { ...C.default, ...(st.look || {}) }
  const tab = st.wrTab || 'body'
  const grid = (k, list, names = NAMES) => `<div class="grid">${list.map((v) => tile(k, v, l[k] === v, names[v] || v)).join('')}</div>`
  const sws = (k, list) => `<div class="sws">${list.map((v) => sw(k, v, l[k] === v)).join('')}</div>`
  const slot = (title, k, colourKey) => `<div class="slot"><div class="sec" style="margin-top:2px"><span>${title}</span><span>${NAMES[l[k]] || l[k]}</span></div>${grid(k, C[k])}${colourKey && l[k] !== 'none' ? sws(colourKey, C.cloth) : ''}</div>`
  let body = ''
  if (tab === 'body') body = `
    <div class="sec"><span>ANIMAL</span><span>${l.species}</span></div>${grid('species', C.species)}
    <div class="sec"><span>BODY</span></div>${grid('sex', C.sex)}
    <div class="sec"><span>FUR</span></div>${sws('fur', C.fur)}
    <div class="sec"><span>MARKINGS</span></div>${grid('marks', C.marks)}
    <div class="sec"><span>SHAPE</span><span>${l.model ? 'critter only' : ''}</span></div>${C.sliders.map(([k, nm, lo, hi]) => { const v = Number(l[k]) || 1; return `<div class="sl"><span class="nm">${nm}</span><button onclick="${act('sz', k + ':-')}">−</button><input type="range" min="${lo}" max="${hi}" step="${C.sliderStep}" value="${v}" onchange="sendAction('dress',{k:'sz',v:'${k}:'+this.value})"><button onclick="${act('sz', k + ':+')}">+</button><span class="v">${Math.round(v * 100)}%</span></div>` }).join('')}
    <div class="sec"><span>IMPORTED MODELS</span><span>${l.model ? C.models[l.model]?.name || '' : 'critter'}</span></div><div class="grid">${tile('model', '', !l.model, 'critter')}${Object.entries(C.models || {}).map(([k, m]) => tile('model', k, l.model === k, m.name)).join('')}</div>`
  else if (tab === 'face') body = `
    <div class="sec"><span>EYE SHAPE</span></div>${grid('eyes', C.eyes)}
    <div class="sec"><span>EYE COLOUR</span></div>${sws('eye', C.eye)}
    <div class="sec"><span>RESTING FACE</span><span>${l.expr}</span></div>${grid('expr', C.expr, {})}
    <div class="hint">T cycles faces while you play. getting hit, low hp and low sanity show on your face on their own.</div>`
  else if (tab === 'clothes') body = `
    ${slot('TOP', 'topw', 'top')}${slot('BOTTOM', 'botw', 'bottom')}${slot('SHOES', 'shoes', 'shoec')}
    ${slot('HAT', 'hat', 'hatc')}${slot('GLASSES', 'eyew')}${slot('NECK', 'neck', 'neckc')}
    <div class="ft" style="padding:10px 0 0;border:0"><button onclick="${act('random', 'clothes')}">shuffle clothes</button><button onclick="${act('strip')}">clear clothes</button></div>`
  else {
    const fits = st.outfits || []
    body = `<div class="sec"><span>SAVED OUTFITS</span></div>` + Array.from({ length: C.outfitSlots }, (_, i) => {
      const f = fits[i]
      const nm = f ? `${f.species} · ${NAMES[f.topw] || f.topw || '?'} · ${NAMES[f.botw] || f.botw || '?'}` : 'empty'
      return `<div class="fit slot"><span class="nm">${i + 1}. ${nm}</span>${f ? `<button class="on" onclick="${act('wear', i)}">wear</button>` : ''}<button onclick="${act('save', i)}">save here</button></div>`
    }).join('') + `<div class="hint">saving keeps your whole look: animal, colours, face and clothes. wear it again in one click.</div>`
  }
  return `${CSS}<div id="cc" data-modal>
  <div class="hd"><h2>CRITTER CREATOR</h2><button onclick="${act('close')}">✕</button></div>
  <div class="tabs">${TABS.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="${act('tab', k)}">${n}</button>`).join('')}</div>
  <div class="bd">${body}</div>
  <div class="ft"><button onclick="${act('spin', -45)}">◀ turn</button><button onclick="${act('spin', 45)}">turn ▶</button><button onclick="${act('random', 'all')}">randomize</button><button onclick="${act('reset')}">reset</button><button class="go" onclick="${act('close')}">done</button></div>
</div>`
}
