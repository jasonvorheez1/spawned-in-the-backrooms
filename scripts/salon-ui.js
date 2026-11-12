// Glow Up Salon (Bonus Room, east ground floor): the in-world makeover menu. A salon service card, not the intake form.
// Every button sends the same 'dress' action scripts/critter.js already handles; 'stab' picks the service tab.
import C from './lib/data/critter.yml'
import M from './lib/data/critter-models.yml'
const PICKS = ['cat', 'dog', 'fox', 'bunny', 'wolf', 'mouse'].filter((s) => M.species?.[s]) // Shelly's six (Nov 11)
const SERVICES = [['hair', 'Hair', '✂'], ['face', 'Face', '✿'], ['body', 'Body', '◐'], ['wear', 'Clothes', '♡']]
const NM = { m: 'boy', f: 'girl', none: 'none', longsleeve: 'long sleeve', pjpants: 'pj pants', pajamas: 'pj top', longskirt: 'long skirt', tophat: 'top hat', partyhat: 'party hat', bowtie: 'bow tie', fullbeard: 'full beard' }
const nice = (v) => NM[v] ?? String(v ?? 'none').replace(/^[mf]_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
const act = (k, v = '') => `sendAction('dress',{k:'${k}',v:'${v}'})`
const CSS = `<style>
@keyframes glIn{from{opacity:0;transform:translateX(-18px) scale(.98)}to{opacity:1;transform:none}}
@keyframes glSheen{0%{background-position:-200% 0}100%{background-position:200% 0}}
#gl{position:absolute;left:28px;top:28px;bottom:28px;width:min(520px,calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 28px)));display:flex;flex-direction:column;pointer-events:auto;animation:glIn .25s ease-out;
 font-family:'Trebuchet MS',sans-serif;color:#3a1d3f;background:linear-gradient(160deg,#fff4fb 0%,#ffe3f2 55%,#dff8f7 100%);border-radius:26px;border:3px solid #fff;box-shadow:0 0 0 2px #ff71ce,0 0 26px #ff71ce88,0 18px 40px #3a1d3f55;overflow:hidden}
#gl .hd{padding:16px 22px 12px;background:linear-gradient(90deg,#ff71ce,#b967ff 55%,#01cdfe);color:#fff;position:relative}
#gl .hd:after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,#fff0 40%,#fff6 50%,#fff0 60%);background-size:200% 100%;animation:glSheen 4s linear infinite;pointer-events:none}
#gl h2{margin:0;font-size:26px;letter-spacing:.06em;font-style:italic;text-shadow:0 2px 0 #7a2f8a,0 0 12px #fff8}
#gl .sub{font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.92;margin-top:2px}
#gl .x{position:absolute;right:14px;top:14px;width:34px;height:34px;border-radius:50%;border:2px solid #fff;background:#fff3;color:#fff;font-size:16px;cursor:pointer;z-index:2}
#gl .svc{display:flex;gap:6px;padding:12px 14px 4px}
#gl .svc button{flex:1;border:2px solid #ffb3e1;background:#fff;border-radius:16px;padding:8px 4px 6px;cursor:pointer;color:#7a2f8a;font:inherit;font-size:12px;font-weight:bold;transition:transform .1s}
#gl .svc button .i{display:block;font-size:20px;line-height:1.1}
#gl .svc button:hover{transform:translateY(-2px)}
#gl .svc button.on{background:linear-gradient(180deg,#ff71ce,#d65bd0);color:#fff;border-color:#fff;box-shadow:0 4px 12px #ff71ce77}
#gl .bd{flex:1;overflow:auto;padding:4px 18px 14px;scrollbar-color:#ff71ce transparent}
#gl .row{display:flex;justify-content:space-between;align-items:baseline;margin:14px 0 6px;font-size:12px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#b0368f;border-bottom:1px dotted #ff71ce88;padding-bottom:3px}
#gl .row i{font-style:normal;letter-spacing:.04em;text-transform:none;color:#3a1d3f;font-weight:normal}
#gl .chips{display:flex;flex-wrap:wrap;gap:6px}
#gl .chips button{font:inherit;font-size:12.5px;border:1.5px solid #e9b8dc;background:#fff;color:#5a2d60;border-radius:999px;padding:6px 12px;cursor:pointer}
#gl .chips button:hover{border-color:#ff71ce}
#gl .chips button.on{background:#3a1d3f;color:#fff;border-color:#3a1d3f}
#gl .dots{display:flex;flex-wrap:wrap;gap:7px}
#gl .dots button{width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1.5px #e9b8dc;cursor:pointer;padding:0;color:#fff;font-size:11px}
#gl .dots button.on{box-shadow:0 0 0 3px #ff71ce,0 0 10px #ff71ce;transform:scale(1.1)}
#gl .sl{display:grid;grid-template-columns:90px 30px 1fr 30px 42px;gap:6px;align-items:center;margin-top:7px;font-size:12px}
#gl .sl button{border:1.5px solid #e9b8dc;background:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;color:#b0368f;font-weight:bold}
#gl .sl .bar{height:10px;border-radius:6px;background:#f6d6ea;overflow:hidden;cursor:pointer}
#gl .sl .bar i{display:block;height:100%;background:linear-gradient(90deg,#01cdfe,#ff71ce);border-radius:6px}
#gl .sl .v{text-align:right;color:#7a2f8a}
#gl .card{background:#fff9;border:1.5px solid #ffd1ec;border-radius:16px;padding:4px 12px 10px;margin-top:10px}
#gl .ft{display:flex;gap:8px;padding:12px 16px;background:#fff8;border-top:2px dashed #ffb3e1}
#gl .ft button{flex:1;font:inherit;font-size:12px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;border:2px solid #ffb3e1;background:#fff;color:#7a2f8a;border-radius:14px;padding:9px 0;cursor:pointer}
#gl .ft .go{background:linear-gradient(90deg,#ff71ce,#b967ff);color:#fff;border-color:#fff;box-shadow:0 4px 14px #b967ff66}
#gl .q{margin:8px 14px 0;padding:7px 12px;border-radius:12px;background:#fff;border:1.5px solid #ff71ce;color:#b0368f;font-size:12px;font-weight:bold}
#gl .q.wait{border-style:dashed;color:#7a5a80;font-weight:normal}
#gl .tip{font-size:11.5px;color:#7a5a80;margin-top:14px;font-style:italic}
</style>`
export function salon(ctx, player) {
  const st = player.state
  const l = { ...C.default, ...(st.look || {}) }
  const human = (st.bodyStyle ?? ctx.world.state?.bodyStyle) === 'human'
  const tab = SERVICES.some(([k]) => k === st.salonTab) ? st.salonTab : 'hair'
  const chips = (k, list) => `<div class="chips">${list.map((v) => `<button class="${(l[k] ?? 'none') === v ? 'on' : ''}" onclick="${act(k, v)}">${nice(v)}</button>`).join('')}</div>`
  const dots = (k, list) => `<div class="dots">${(list || []).map((v) => `<button class="${l[k] === v ? 'on' : ''}" style="background:${/^#|^oklch|^rgb/.test(v) ? v : '#ff9fc8'}" title="${v}" onclick="${act(k, v)}">${/^#|^oklch|^rgb/.test(v) ? '' : v === 'none' ? '✕' : '♥'}</button>`).join('')}</div>`
  const row = (t, v) => `<div class="row"><span>${t}</span><i>${v ?? ''}</i></div>`
  const sliders = (keep) => (C.sliders || []).filter((r) => keep(r[0])).map(([k, nm, lo, hi]) => {
    const v = Number(l[k]) || 1, pct = Math.max(0, Math.min(100, Math.round((v - lo) / (hi - lo) * 100)))
    const click = `(function(el,ev){const r=el.getBoundingClientRect(),p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));sendAction('dress',{k:'sz',v:'${k}:'+(${lo}+p*${hi - lo}).toFixed(2)})})(this,event)`
    return `<div class="sl"><span>${nm}</span><button onclick="${act('sz', k + ':-')}">−</button><div class="bar" onclick="${click}"><i style="width:${pct}%"></i></div><button onclick="${act('sz', k + ':+')}">+</button><span class="v">${Math.round(v * 100)}%</span></div>`
  }).join('')
  let body = ''
  if (tab === 'hair') {
    body = row('The cut', nice(l.hair)) + chips('hair', ['none', ...(l.sex === 'f' ? C.hairF : C.hairM)])
      + (l.hair && l.hair !== 'none' ? row('Colour', '') + dots('hairc', C.hairc) : '')
      + (l.sex !== 'f' || !human ? row('Beard', nice(l.beard)) + chips('beard', C.beard || ['none', 'stubble', 'mustache', 'goatee', 'fullbeard']) + (l.beard && l.beard !== 'none' ? row('Beard colour', '') + dots('beardc', C.hairc) : '') : '')
  } else if (tab === 'face') {
    const FT = ['snouty', 'foxlike']
    body = row('Eyes', nice(l.eyes)) + chips('eyes', C.eyes) + row('Eye colour', '') + dots('eye', C.eye)
      + row('Face shape', nice(l.ftype || 'oval')) + chips('ftype', human ? C.ftype.filter((f) => !FT.includes(f)) : C.ftype)
      + row('Cheeks', '') + dots('blush', C.blush) + row('Resting face', nice(l.expr)) + chips('expr', C.expr) + row('Demeanor', nice(l.trait)) + chips('trait', C.trait)
  } else if (tab === 'body') {
    const FURRY = ['earS', 'snoutS', 'tailS', 'waistS', 'hipS', 'headS']
    body = row('Body', nice(l.sex)) + chips('sex', C.sex)
      + row('Stature', `${Math.round(170 * (Number(l.heightS) || 1))} cm`) + `<div class="card">${sliders((k) => k === 'heightS' || k === 'buildS')}</div>`
      + (human ? row('Skin', '') + dots('skin', C.skin) : row('Fur', '') + dots('fur', C.fur))
      + row('Markings', nice(l.marks)) + chips('marks', human ? C.marks.filter((m) => ['none', 'freckles'].includes(m)) : C.marks)
      + row('Proportions', '') + `<div class="card">${sliders((k) => !['heightS', 'buildS'].includes(k) && !(human && FURRY.includes(k)) && (l.sex === 'f' || !['hipS', 'bustS'].includes(k)))}</div>`
      + row('Custom model', l.modelUrl ? 'your plymodel' : l.model ? (C.models?.[l.model]?.name ?? '') : 'none')
      + `<div class="card"><div class="chips" style="margin-top:8px"><button class="${!l.model && !l.modelUrl ? 'on' : ''}" onclick="${act('model', '')}">${human ? 'your body' : 'critter'}</button>${Object.entries(C.models || {}).map(([k, m]) => `<button class="${l.model === k ? 'on' : ''}" onclick="${act('model', k)}">${m.name}</button>`).join('')}${l.modelUrl ? `<button class="on">your plymodel</button>` : ''}</div>`
      + `<div class="chips" style="margin-top:8px"><button onclick="this.nextElementSibling.click()">⬆ upload .plymodel</button><input type="file" accept=".plymodel" style="display:none" onchange="plyUpload(this)"></div><div id="ply-st" class="tip" style="margin-top:6px">any tower unite .plymodel, worn as your body</div></div>`
  } else {
    const slot = (t, k, ck) => `<div class="card">${row(t, nice(l[k]))}${chips(k, C[k])}${ck && l[k] !== 'none' ? `<div style="margin-top:7px">${dots(ck, C.cloth)}</div>` : ''}</div>`
    const fits = st.outfits || []
    body = slot('Top', 'topw', 'top') + slot('Bottom', 'botw', 'bottom') + slot('Shoes', 'shoes', 'shoec') + slot('Hat', 'hat', 'hatc') + slot('Glasses', 'eyew') + slot('Neck', 'neck', 'neckc')
      + row('Saved looks', '') + Array.from({ length: C.outfitSlots || 0 }, (_, i) => `<div class="sl" style="grid-template-columns:1fr auto auto"><span>${i + 1}. ${fits[i] ? `${nice(fits[i].topw)} · ${nice(fits[i].botw)}` : 'empty'}</span>${fits[i] ? `<button style="width:auto;border-radius:12px;padding:0 10px" onclick="${act('wear', i)}">wear</button>` : '<span></span>'}<button style="width:auto;border-radius:12px;padding:0 10px" onclick="${act('save', i)}">save</button></div>`).join('')
  }
  const gina = ctx.place.objects?.['bonus-stylist'], q = gina?.state?.queue ?? [], qi = q.indexOf(player.id)
  if (gina && gina.state?.with !== player.id) { // not her turn yet, or she's still walking over: a small plate, the chair keeps the cursor
    const w = qi > 0 ? `You're ${qi === 1 ? 'next' : '#' + (qi + 1)} in line` : 'Gina is on her way'
    return `${CSS}<div id="glw" style="position:absolute;left:50%;bottom:120px;translate:-50% 0;padding:12px 20px;background:#2a1030;color:#ffe3f4;border:3px solid #ff71ce;box-shadow:4px 4px 0 #120616;font-size:20px;text-align:center;pointer-events:none"><div style="font-size:24px">✂ ${w}</div><div style="opacity:.75;font-size:15px;margin-top:4px">${qi > 0 ? 'Gina will come to your chair' : 'Sit tight'} · ${ctx.world.inputs?.actions?.interact?.label ?? 'E'} to get up</div></div>`
  }
  const line = qi === 0 ? `<div class="q">✂ Gina is doing your hair</div>` : qi > 0 ? `<div class="q wait">Gina's finishing up with someone. You're ${qi === 1 ? 'next' : '#' + (qi + 1) + ' in line'}, change away meanwhile.</div>` : ''
  return `${CSS}<div id="gl" data-modal>
  <div class="hd"><h2>Glow Up Salon</h2><button class="x" onclick="${act('close')}">✕</button></div>
  <div class="svc">${SERVICES.map(([k, n, i]) => `<button class="${tab === k ? 'on' : ''}" onclick="${act('stab', k)}"><span class="i">${i}</span>${n}</button>`).join('')}</div>
  ${line}<div class="bd">${body}</div>
  <div class="ft"><button onclick="${act('spin', -45)}">◀ turn</button><button onclick="${act('spin', 45)}">turn ▶</button><button onclick="${act('random', 'all')}">random</button><button class="go" onclick="${act('close')}">done</button></div>
</div>`
}
