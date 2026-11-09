// The critter creator (C): tabs for body, face, clothes and saved outfits. Every button sends one 'dress' action.
import C from './lib/data/critter.yml'
const NAMES = { m: 'boy', f: 'girl', none: 'none', tee: 't-shirt', tank: 'tank top', longsleeve: 'long sleeve', hoodie: 'hoodie', sweater: 'sweater', jacket: 'jacket', pajamas: 'pyjama top', apron: 'apron', dress: 'dress', pants: 'pants', shorts: 'shorts', pjpants: 'pyjama pants', overalls: 'overalls', skirt: 'skirt', longskirt: 'long skirt', sneakers: 'sneakers', boots: 'boots', slippers: 'slippers', bow: 'bow', flower: 'flower', cap: 'cap', beanie: 'beanie', tophat: 'top hat', crown: 'crown', headphones: 'headphones', partyhat: 'party hat', tuft: 'hair tuft', glasses: 'glasses', shades: 'sunglasses', scarf: 'scarf', bowtie: 'bow tie', bell: 'bell collar', cape: 'cape', round: 'round', tall: 'tall', wide: 'wide', freckles: 'freckles', stripes: 'stripes', patch: 'eye patch', heart: 'heart', stubble: 'stubble', mustache: 'mustache', goatee: 'goatee', handlebars: 'handlebars', fullbeard: 'full beard', chinstrap: 'chin strap', anchor: 'anchor', burly: 'burly', rugged: 'rugged', diamond: 'diamond' }
const TABS = [['body', 'BODY', '01'], ['face', 'FACE', '02'], ['clothes', 'CLOTHES', '03'], ['outfits', 'OUTFITS', '04']]
const CSS = `<style>
@media (max-width:700px){#hud{visibility:hidden}}
@keyframes ccIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
@keyframes ccScan{from{transform:translateY(-6px)}to{transform:translateY(0)}}
#cc{--a:#ffb347;--a2:#ffcf87;--ink:#16140e;--bg:oklch(0.17 0.025 75 / .97);position:absolute;left:24px;top:24px;bottom:24px;width:min(560px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px)));display:flex;flex-direction:column;background:var(--bg);border:2px solid var(--a);box-shadow:8px 8px 0 rgba(0,0,0,0.7),0 0 30px rgba(255,170,40,.18) inset,0 0 0 1px rgba(255,179,71,.25);color:var(--a2);font-family:'Geist Pixel Square',ui-monospace,monospace;animation:ccIn .18s ease-out;overflow:hidden}
#cc:before{content:'';position:absolute;inset:-6px 0 0 0;will-change:transform;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 3px,#0003 3px 6px);animation:ccScan 1.2s linear infinite;opacity:.35}
#cc .hd{display:flex;align-items:stretch;border-bottom:2px solid var(--a);background:oklch(0.14 0.025 75)}
#cc .hd .ttl{flex:1;padding:12px 16px 10px}
#cc h2{font-size:22px;margin:0;letter-spacing:.18em;color:var(--a);text-shadow:0 0 8px rgba(255,170,40,.55)}
#cc .sub{font-size:10.5px;letter-spacing:.2em;opacity:.75;margin-top:3px;text-transform:uppercase}
#cc .hd .x{width:52px;border:0;border-left:2px solid var(--a);background:none;font-size:18px;color:var(--a);cursor:pointer}
#cc .hd .x:hover{background:rgba(255,179,71,.2)}
#cc .main{flex:1;display:flex;min-height:0}
#cc .tabs{display:flex;flex-direction:column;width:92px;border-right:2px solid var(--a);background:oklch(0.15 0.02 75)}
#cc .tabs button{border:0;border-bottom:1px solid #ffb34740;background:none;padding:14px 0;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;text-align:center;color:var(--a2);cursor:pointer}
#cc .tabs button .n{display:block;font-size:20px;line-height:1;margin-bottom:4px;opacity:.75}
#cc .tabs button.on{background:var(--a);color:var(--ink);text-shadow:none;font-weight:bold;box-shadow:inset 3px 0 0 #fff}
#cc .tabs button.on .n{opacity:1}
#cc .bd{flex:1;overflow:auto;padding:6px 16px 14px;scrollbar-color:var(--a) transparent}
#cc .sec{font-size:10.5px;letter-spacing:.2em;color:var(--a);margin:16px 0 7px;display:flex;justify-content:space-between;align-items:center;gap:8px;text-transform:uppercase}
#cc .sec:after{content:'';flex:1;height:1px;background:#ffb34755;order:1}
#cc .sec span:last-child{order:2;color:var(--a2);opacity:.85;letter-spacing:.08em;text-transform:lowercase}
#cc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:5px}
#cc button{font:inherit;font-size:12.5px;color:var(--a2);background:oklch(0.24 0.03 78);border:1px solid #ffb34766;padding:8px 6px;cursor:pointer;text-transform:lowercase;transition:background .1s,transform .08s}
#cc button:hover{border-color:var(--a);background:oklch(0.3 0.045 78)}
#cc button:active{transform:translateY(1px)}
#cc button.on{background:var(--a);color:var(--ink);border-color:#fff3d6;box-shadow:0 0 10px rgba(255,170,40,.45);font-weight:600}
#cc .sws{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
#cc button.sw{width:26px;height:26px;padding:0;border:2px solid #000a;box-shadow:0 1px 3px rgba(0,0,0,.5);border-radius:3px;transition:transform .1s;font-size:10px;line-height:22px;text-align:center;color:#fff;overflow:hidden;font-weight:bold}
#cc button.sw:hover{transform:scale(1.15);z-index:2}
#cc button.sw.on{border:2px solid #fff;outline:2px solid var(--a);outline-offset:1px;transform:scale(1.08)}
#cc .slot{border:1px solid #ffb34740;border-left:3px solid var(--a);padding:6px 10px 10px;margin-top:10px;background:oklch(0.2 0.02 78 / .7)}
#cc .ft{display:flex;gap:6px;padding:10px 14px;border-top:2px solid var(--a);flex-wrap:wrap;background:oklch(0.14 0.02 75)}
#cc .ft button{flex:1;min-width:76px;letter-spacing:.1em;text-transform:uppercase;font-size:11.5px}
#cc .ft .go{background:var(--a);color:var(--ink);font-weight:bold}
#cc .hint{font-size:11px;opacity:.65;margin-top:14px;line-height:1.5;border-top:1px dashed #ffb34740;padding-top:8px}
#cc .fit{display:flex;gap:6px;align-items:center;margin-top:8px}
#cc .fit .nm{flex:1;font-size:12px;opacity:.9}
#cc .sl{display:grid;grid-template-columns:62px 28px 1fr 28px 44px;align-items:center;gap:6px;margin-top:6px}
#cc .sl .nm{font-size:12px;text-transform:uppercase;letter-spacing:.08em}
#cc .sl .bar{position:relative;height:10px;border:1px solid #ffb34780;background:rgba(0,0,0,0.45);box-shadow:inset 0 1px 3px rgba(0,0,0,0.6);border-radius:2px;overflow:visible}
#cc .sl .bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#b36814,var(--a));border-radius:1px}
#cc .sl .bar b{position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff3d6;left:var(--mid);opacity:0.85;box-shadow:0 0 2px #000;pointer-events:none}
#cc .sl .bar .th{position:absolute;top:50%;width:8px;height:14px;background:#fff5db;border:1px solid #945308;transform:translate(-50%,-50%);border-radius:1px;box-shadow:0 0 4px rgba(255,170,40,0.8);pointer-events:none}
#cc .sl button{width:28px;padding:3px 0}
#cc .sl .v{text-align:right;font-size:11.5px}
#cc .big .sl{grid-template-columns:62px 32px 1fr 32px 48px}
#cc .big .sl .bar{height:14px}
#cc .big .sl .bar .th{width:10px;height:18px}
</style>`
const act = (k, v = '') => `sendAction('dress',{k:'${k}',v:'${v}'})`
const HN = (v) => !v || v === 'none' ? 'none' : ({ afropuff: 'afro puff', curtainmid: 'curtains', halfup: 'half up', messybun: 'messy bun', sidebraid: 'side braid', sidetail: 'side tail', spacebuns: 'space buns', twinbraids: 'twin braids', twintails: 'twin tails', wolfcut: 'wolf cut', curlytop: 'curly top', sidepart: 'side part', manbun: 'man bun', silver: 'cascade' })[v.slice(2)] || v.slice(2)
const tile = (k, v, on, label) => `<button class="${on ? 'on' : ''}" onclick="${act(k, v)}">${label}</button>`
const sw = (k, v, on) => {
  let bg = v || 'conic-gradient(#f2a65a,#9a6440,#f4efe9,#6f7d93,#f2a65a)';
  let title = v || 'natural';
  let icon = '';
  if (k === 'blush') {
    if (v === 'none') { bg = 'repeating-linear-gradient(45deg,#2b232a,#2b232a 4px,#633a46 4px,#633a46 8px)'; title = 'no blush'; icon = '✕'; }
    else if (v === 'heart') { bg = '#ff6588'; title = 'heart sticker'; icon = '♥'; }
    else if (v === 'star') { bg = '#ff9f6a'; title = 'star sticker'; icon = '★'; }
    else if (v === 'hash') { bg = '#e870b0'; title = 'hash sticker'; icon = '///'; }
    else if (v === 'soft') { bg = '#ff8a9a'; title = 'soft cheek'; icon = '●'; }
  }
  return `<button class="sw ${on ? 'on' : ''}" style="background:${bg}" title="${title}" onclick="${act(k, v)}">${icon}</button>`;
}
function sliderRows(rows, l) {
  return rows.map(([k, nm, lo, hi]) => {
    const v = Number(SL_LOOK[k]) || 1, pct = Math.max(0, Math.min(100, Math.round((v - lo) / (hi - lo) * 100))), mid = Math.max(0, Math.min(100, Math.round((1 - lo) / (hi - lo) * 100)))
    const clickBar = `(function(el,ev){const r=el.getBoundingClientRect(),p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),val=(${lo}+p*(${hi-lo})).toFixed(2);sendAction('dress',{k:'sz',v:'${k}:'+val})})(this,event)`
    return `<div class="sl"><span class="nm">${nm}</span><button onclick="${act('sz', k + ':-')}" title="Decrease">−</button><div class="bar" style="--mid:${mid}%;cursor:pointer" onclick="${clickBar}" title="Click to set ${nm}"><i style="width:${pct}%"></i><b></b><span class="th" style="left:${pct}%"></span></div><button onclick="${act('sz', k + ':+')}" title="Increase">+</button><span class="v">${Math.round(v * 100)}%</span></div>`
  }).join('')
}
let SL_LOOK = {}
export function wardrobe(ctx, player) {
  const st = player.state
  if (!st.wardrobeOpen) return ''
  const l = { ...C.default, ...(st.look || {}) }
  SL_LOOK = l
  const human = (st.bodyStyle ?? ctx.world.state?.bodyStyle) !== 'furry' // human mode: no animal, fur, ears, snout or tail
  const FURRY_SL = ['earS', 'snoutS', 'tailS', 'waistS', 'hipS', 'headS'], FURRY_FT = ['snouty', 'foxlike'] // the human bodies carry no keys for these
  const tabs = st.wrMenu ? TABS.slice(0, 2) : TABS // from the main menu: body and face only, clothes come from the world
  const tab = st.wrMenu && !['body', 'face'].includes(st.wrTab) ? 'body' : (st.wrTab || 'body')
  const grid = (k, list, names = NAMES) => `<div class="grid">${list.map((v) => tile(k, v, l[k] === v, names[v] || v)).join('')}</div>`
  const sws = (k, list) => `<div class="sws">${list.map((v) => sw(k, v, l[k] === v)).join('')}</div>`
  const slot = (title, k, colourKey) => `<div class="slot"><div class="sec" style="margin-top:2px"><span>${title}</span><span>${NAMES[l[k]] || l[k]}</span></div>${grid(k, C[k])}${colourKey && l[k] !== 'none' ? sws(colourKey, C.cloth) : ''}</div>`
  let body = ''
  if (tab === 'body') body = `
    ${human ? '' : `<div class="sec"><span>ANIMAL</span><span>${l.species}</span></div>${grid('species', C.species)}`}
    <div class="sec"><span>BODY</span></div>${grid('sex', C.sex)}
    <div class="sec"><span>STATURE</span><span>${Math.round(170 * (Number(l.heightS) || 1))} cm</span></div><div class="big">${sliderRows(C.sliders.filter((r) => ['heightS', 'buildS'].includes(r[0])))}</div>
    ${human ? `<div class="sec"><span>SKIN</span></div>${sws('skin', C.skin)}` : `<div class="sec"><span>FUR</span></div>${sws('fur', C.fur)}`}
    <div class="sec"><span>MARKINGS</span></div>${grid('marks', human ? C.marks.filter((m) => ['none', 'freckles'].includes(m)) : C.marks)}
    <div class="sec"><span>HAIR</span><span>${HN(l.hair)}</span></div><div class="grid">${['none', ...(l.sex === 'f' ? C.hairF : C.hairM)].map((v) => tile('hair', v, (l.hair || 'none') === v, HN(v))).join('')}</div>
    ${l.hair && l.hair !== 'none' ? `<div class="sec"><span>HAIR COLOUR</span></div>${sws('hairc', C.hairc)}` : ''}
    <div class="sec"><span>PROPORTIONS</span></div>${sliderRows(C.sliders.filter((r) => !['heightS', 'buildS'].includes(r[0]) && !(human && FURRY_SL.includes(r[0])) && (l.sex === 'f' || !['hipS', 'bustS'].includes(r[0]))))}
    <div class="sec"><span>IMPORTED MODELS</span><span>${l.modelUrl ? 'your upload' : l.model ? C.models[l.model]?.name || '' : human ? 'yours' : 'critter'}</span></div><div class="grid">${tile('model', '', !l.model && !l.modelUrl, human ? 'your body' : 'critter')}${Object.entries(C.models || {}).map(([k, m]) => tile('model', k, l.model === k, m.name)).join('')}</div>
    <div style="font-size:11px;line-height:1.5;opacity:.85;margin:4px 0 6px;text-transform:none;letter-spacing:.02em">HOW TO GET A PLYMODEL<br>1. install <a href="https://developer.valvesoftware.com/wiki/SteamCMD" target="_blank" rel="noopener" style="color:#ffb642;text-decoration:underline;pointer-events:auto">SteamCMD</a> and open it<br>2. type <b>login anonymous</b> and press enter<br>3. on the <a href="https://steamcommunity.com/app/394690/workshop/" target="_blank" rel="noopener" style="color:#ffb642;text-decoration:underline;pointer-events:auto">Tower Unite workshop</a>, copy the link of the playermodel you want<br>4. paste it into <a href="https://steamworkshopdownloader.io/" target="_blank" rel="noopener" style="color:#ffb642;text-decoration:underline;pointer-events:auto">steamworkshopdownloader.io</a>, copy the line it gives you and paste that into SteamCMD<br>5. SteamCMD says where it saved it (steamapps/workshop/content/394690/...). press upload below and pick the .plymodel in that folder</div>
    <div class="sl"><button style="flex:1;width:auto;padding:6px 0" onclick="this.nextElementSibling.click()">⬆ upload .plymodel</button><input type="file" accept=".plymodel" style="display:none" onchange="plyUpload(this)"></div><div id="ply-st" style="font-size:11px;opacity:.75;margin-top:4px">${l.modelUrl ? 'wearing your upload' : 'any tower unite .plymodel, worn as your body'}</div>`
  else if (tab === 'face') body = `
    <div class="sec"><span>EYE SHAPE</span></div>${grid('eyes', C.eyes)}
    <div class="sec"><span>EYE COLOUR</span></div>${sws('eye', C.eye)}
    <div class="sec"><span>FACE SHAPE</span><span>${human && FURRY_FT.includes(l.ftype) ? 'mixed' : l.ftype || 'oval'}</span></div>${grid('ftype', human ? C.ftype.filter((f) => !FURRY_FT.includes(f)) : C.ftype)}
    <div class="sec"><span>DEMEANOR</span><span>${NAMES[l.trait] || l.trait || 'placid'}</span></div>${grid('trait', C.trait)}
    ${l.sex !== 'f' || !human ? `<div class="sec"><span>BEARD / MOUSTACHE</span><span>${NAMES[l.beard] || l.beard || 'none'}</span></div>${grid('beard', C.beard || ['none', 'stubble', 'mustache', 'goatee', 'handlebars', 'fullbeard', 'chinstrap', 'anchor'])}${l.beard && l.beard !== 'none' ? `<div class="sec"><span>BEARD COLOUR</span></div>${sws('beardc', C.hairc)}` : ''}` : ''}
    <div class="sec"><span>CHEEKS</span></div>${sws('blush', C.blush)}
    ${human ? '' : `<div class="sec"><span>NOSE</span><span>${l.nose ? '' : 'the animal’s own'}</span></div>${sws('nose', C.nose)}`}
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
      const nm = f ? `${human ? '' : f.species + ' · '}${NAMES[f.topw] || f.topw || '?'} · ${NAMES[f.botw] || f.botw || '?'}` : 'empty'
      return `<div class="fit slot"><span class="nm">${i + 1}. ${nm}</span>${f ? `<button class="on" onclick="${act('wear', i)}">wear</button>` : ''}<button onclick="${act('save', i)}">save here</button></div>`
    }).join('') + `<div class="hint">saving keeps your whole look: ${human ? 'skin' : 'animal'}, colours, face and clothes. wear it again in one click.</div>`
  }
  return `${CSS}<div id="cc" data-modal>
  <div class="hd"><div class="ttl"><h2>${human ? 'CHARACTER CREATOR' : 'CRITTER CREATOR'}</h2><div class="sub">${human ? '' : l.species + ' · '}${NAMES[l.sex] || l.sex} · ${Math.round(170 * (Number(l.heightS) || 1))} cm · M.E.G. intake form 7-B</div></div><button class="x" onclick="${act('close')}">✕</button></div>
  <div class="main"><div class="tabs">${tabs.map(([k, n, i]) => `<button class="${tab === k ? 'on' : ''}" onclick="${act('tab', k)}"><span class="n">${i}</span>${n}</button>`).join('')}</div>
  <div class="bd">${body}</div></div>
  <div class="ft"><button onclick="${act('spin', -45)}">◀ turn</button><button onclick="${act('spin', 45)}">turn ▶</button><button onclick="${act('random', 'all')}">randomize</button><button onclick="${act('reset')}">reset</button><button class="go" onclick="${act('close')}">done</button></div>
</div>`
}
