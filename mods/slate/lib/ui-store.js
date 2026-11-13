// SLATE APPS storefront: hero carousel, what's new, the app grid, and a page per app. Mods carry on below (ui-addons.js).
import {BUILTIN,appOn} from './apps/index.js';
import {META} from './apps/store-meta.js';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c',panel='#1a2b3d',gold='#c9a56a',brass='#a37d45',cyan='#53d9e5';
const P=(op,id)=>`sendAction('planApp',{id:'${id}',op:'${op}'})`;
const nice=n=>String(n||'').toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
const icon=(a,s=56)=>`<div class="ss-ic" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.46)}px;background:linear-gradient(150deg,${esc(a.color)},#0a121e 140%)">${esc(a.glyph)}</div>`;
const btn=(ctx,player,a,big)=>{const on=appOn(ctx,a.id),arm=player?.state?.slateAppArm===a.id,c=big?'ss-b big':'ss-b';
 if(arm)return `<button class="${c} red" onclick="event.stopPropagation();${P('uninstall',a.id)}">Uninstall</button><button class="${c} ghost" onclick="event.stopPropagation();${P('disarm',a.id)}">Keep</button>`;
 return on?`<button class="${c}" onclick="event.stopPropagation();${P('open',a.id)}">Open</button>${big?`<button class="${c} ghost" onclick="event.stopPropagation();${P('arm',a.id)}">Uninstall</button>`:''}`
  :`<button class="${c}" onclick="event.stopPropagation();${P('install',a.id)}">Get</button>`;};
const CSS=`<style>
.ss{max-width:1000px;margin:0 auto;color:${ink}}
.ss h3{font-family:Georgia,serif;font-weight:normal;font-size:15px;letter-spacing:.08em;color:${gold};margin:22px 2px 10px;display:flex;align-items:center;gap:10px}
.ss h3 span{font-size:10px;letter-spacing:.16em;color:${dim}}
.ss-ic{flex:none;border-radius:24%;display:flex;align-items:center;justify-content:center;color:#fbf3e2;box-shadow:inset 0 1px 0 #ffffff40,0 4px 12px #0007}
.ss-b{background:${brass};color:#111b2c;border:0;border-radius:999px;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.04em}
.ss-b.big{padding:9px 26px;font-size:13px}.ss-b.ghost{background:transparent;color:${ink};border:1px solid ${line};font-weight:normal}.ss-b.red{background:#e5675a}
.ss-b:hover{filter:brightness(1.12)}
.ss-hero{position:relative;height:clamp(170px,30vw,280px);border-radius:16px;overflow:hidden;border:1px solid ${line};background:#0a121e}
.ss-sl{position:absolute;inset:0;opacity:0;animation:ssfade var(--T) infinite;cursor:pointer;background-size:cover;background-position:center}
.ss-sl:first-child{opacity:1}
.ss-hero:hover .ss-sl{animation-play-state:paused}
@keyframes ssfade{0%{opacity:0}3%{opacity:1}20%{opacity:1}23%{opacity:0}100%{opacity:0}}
.ss-cap{position:absolute;left:0;right:0;bottom:0;padding:40px 18px 16px;background:linear-gradient(transparent,#05080dee);display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.ss-cap .t{flex:1;min-width:150px}.ss-cap .n{font-family:Georgia,serif;font-size:20px;color:#fbf3e2;text-shadow:0 2px 6px #000}.ss-cap .g{font-size:12px;color:#e8dcc4;margin-top:3px}
.ss-dots{position:absolute;top:12px;right:14px;display:flex;gap:6px}.ss-dots i{width:7px;height:7px;border-radius:50%;background:#ffffff55;animation:ssdot var(--T) infinite}
@keyframes ssdot{0%,22%{background:#fff}23%,100%{background:#ffffff55}}
.ss-tag{position:absolute;top:12px;left:14px;font-size:10px;letter-spacing:.2em;background:#05080dcc;color:${gold};padding:4px 9px;border-radius:999px}
.ss-row{display:flex;gap:12px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x mandatory}
.ss-new{flex:0 0 min(260px,78%);scroll-snap-align:start;background:${panel};border:1px solid ${line};border-radius:12px;overflow:hidden;cursor:pointer}
.ss-new .im{height:96px;background-size:cover;background-position:center}.ss-new .tx{padding:9px 11px;font-size:12px;line-height:1.4}
.ss-new .k{font-size:9.5px;letter-spacing:.18em;color:${cyan};margin-bottom:3px}
.ss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:12px}
.ss-card{background:${panel};border:1px solid ${line};border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:9px;cursor:pointer;transition:transform .15s,border-color .15s}
.ss-card:hover{transform:translateY(-2px);border-color:${brass}}
.ss-card .hd{display:flex;gap:11px;align-items:center}.ss-card .nm{font-size:14px;font-weight:600}.ss-card .ct{font-size:11px;color:${dim};margin-top:2px}
.ss-card .ds{font-size:12px;color:${dim};line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:34px}
.ss-card .ft{display:flex;align-items:center;justify-content:space-between;gap:8px}.ss-on{font-size:10.5px;color:${cyan}}
.ss-back{background:transparent;border:0;color:${gold};cursor:pointer;font-size:13px;padding:4px 2px;margin-bottom:8px}
.ss-pg .ban{height:clamp(150px,26vw,250px);border-radius:16px;background-size:cover;background-position:center;border:1px solid ${line}}
.ss-pg .top{display:flex;gap:16px;align-items:flex-end;margin:-38px 18px 0;position:relative;flex-wrap:wrap}
.ss-pg .top .t{flex:1;min-width:160px;padding-bottom:4px}.ss-pg .nm{font-family:Georgia,serif;font-size:24px}.ss-pg .by{font-size:12px;color:${dim};margin-top:3px}
.ss-chips{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 0}.ss-chips div{background:${panel};border:1px solid ${line};border-radius:10px;padding:7px 12px;font-size:11px;color:${dim};text-align:center}
.ss-chips b{display:block;color:${ink};font-size:13px;font-weight:600;margin-bottom:1px}
.ss-box{background:${panel};border:1px solid ${line};border-radius:12px;padding:13px 15px;font-size:12.5px;line-height:1.55}
.ss-box ul{margin:6px 0 0;padding-left:18px}.ss-box li{margin:3px 0}
.ss-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:12px}
</style>`;
function page(ctx,player,a){const m=META[a.id]||{},on=appOn(ctx,a.id),more=BUILTIN.filter(x=>x.id!==a.id);
 return `${CSS}<div class="ss ss-pg"><button class="ss-back" onclick="${P('storeBack',a.id)}">‹ Slate Apps</button>
 <div class="ban" style="background-image:linear-gradient(transparent 55%,#111b2c),url('${esc(m.banner||'')}')"></div>
 <div class="top">${icon(a,84)}<div class="t"><div class="nm">${esc(nice(a.name))}</div><div class="by">${esc(m.tagline||a.sub)}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${btn(ctx,player,a,true)}</div></div>
 <div class="ss-chips"><div><b>${esc(m.category||'App')}</b>category</div><div><b>${esc(m.version||'1.0')}</b>version</div><div><b>Psyko</b>studios</div><div><b>${on?'Installed':'Free'}</b>${on?'on your home screen':'for every Slate'}</div></div>
 <div class="ss-two" style="margin-top:14px"><div class="ss-box"><div style="font-size:10px;letter-spacing:.18em;color:${cyan}">WHAT’S NEW · ${esc(m.version||'1.0')}</div><ul>${(m.news||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
 <div class="ss-box"><div style="font-size:10px;letter-spacing:.18em;color:${dim}">ABOUT THIS APP</div><div style="margin-top:6px">${esc(a.about)}</div><ul>${(m.features||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>
 <h3>More Slate apps</h3><div class="ss-row">${more.map(x=>newCard(x)).join('')}</div></div>`;}
const newCard=(a)=>{const m=META[a.id]||{};return `<div class="ss-new" onclick="${P('storePage',a.id)}"><div class="im" style="background-image:url('${esc(m.banner||'')}')"></div><div class="tx"><div class="k">${esc((m.category||'APP').toUpperCase())}</div><b>${esc(nice(a.name))}</b> · ${esc((m.news||[])[0]||m.tagline||'')}</div></div>`;};
export function storeView(ctx,player){
 const open=player?.state?.slateStorePage,oa=BUILTIN.find(a=>a.id===open);if(oa)return page(ctx,player,oa);
 const n=BUILTIN.length,T=n*6;
 const hero=`<div class="ss-hero" style="--T:${T}s">${BUILTIN.map((a,i)=>{const m=META[a.id]||{};return `<div class="ss-sl" onclick="${P('storePage',a.id)}" style="background-image:url('${esc(m.banner||'')}');animation-delay:${i*6-0.001}s"><div class="ss-cap">${icon(a,52)}<div class="t"><div class="n">${esc(nice(a.name))}</div><div class="g">${esc(m.tagline||a.sub)}</div></div>${btn(ctx,player,a)}</div></div>`;}).join('')}
  <div class="ss-tag">FEATURED</div><div class="ss-dots">${BUILTIN.map((a,i)=>`<i style="animation-delay:${i*6}s"></i>`).join('')}</div></div>`;
 const grid=`<div class="ss-grid">${BUILTIN.map(a=>{const m=META[a.id]||{},on=appOn(ctx,a.id);return `<div class="ss-card" data-app-row="${esc(a.id)}" onclick="${P('storePage',a.id)}"><div class="hd">${icon(a,52)}<div><div class="nm">${esc(nice(a.name))}</div><div class="ct">${esc(m.category||'App')}</div></div></div><div class="ds">${esc(a.about)}</div><div class="ft"><span class="ss-on">${on?'✓ installed':''}</span><span>${btn(ctx,player,a)}</span></div></div>`;}).join('')}</div>`;
 const mine=BUILTIN.filter(a=>appOn(ctx,a.id)).length;
 return `${CSS}<div class="ss">${hero}<h3>What’s new <span>${n} UPDATES</span></h3><div class="ss-row">${BUILTIN.map(newCard).join('')}</div>
 <h3>Slate apps <span>${mine} OF ${n} INSTALLED · STUDIO, LOOM, PLANNER, KILN AND WORKBENCH ALWAYS STAY</span></h3>${grid}<h3>Mods for Slate <span>ANY MOD WITH A PANEL CAN LIVE HERE</span></h3></div>`;
}
