// Studio › TOOLS: the app store. Every installed mod can live inside Slate (add-on layer by @dandalruss: lib/addons*.js),
// an add-on's own app drawn natively, and the strip that shows an add-on's pages inside Slate's own apps.
import {catalog,suggested,installed,isHosted,live,contribs,HOSTED,endpointsOf,onHome} from './addons.js';
import {BUDGET} from './addons-generic.js';
import {hidesTab} from './addons-setup.js';
import {BUILTIN,CORE,appOn} from './apps/index.js';
import {storeView} from './ui-store.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gold='#c9a56a',ink='#ecdec3',dim='#8d8676',line='#3a3226';
const B=`background:#1a150f;border:1px solid ${line};border-radius:4px;color:${ink};cursor:pointer;font-size:11px;padding:6px 11px`;
const SLATE={ink:'#d9e0d9',accent:'#53d9e5',onAccent:'#111b2c',glass:'rgba(255,255,255,.06)',edge:'rgba(255,255,255,.1)',edge2:'rgba(255,255,255,.14)',lift:'rgba(255,255,255,.09)',well:'rgba(0,0,0,.28)',field:'rgba(0,0,0,.25)'};
const SKINS={};
function skinOf(a){
 if(!a)return '';if(SKINS[a.id]!=null)return SKINS[a.id];
 const t=a.c.theme;if(!t?.root)return SKINS[a.id]='';
 const R='.sl-ao '+t.root,at=sel=>String(sel).split(',').map(x=>x.trim().startsWith('&')?R+x.trim().slice(1):R+' '+x.trim()).join(','),P=t.parts||{},I='!important';
 const css=[
  `${R}{${Object.entries(t.tokens||{}).map(([k,v])=>`--${k}:${v}`).join(';')};font-size:13px;color:${SLATE.ink}}`,
  t.hide?.length&&`${at(t.hide.join(','))}{display:none${I}}`,
  t.unframe?.length&&`${at(t.unframe.join(','))}{position:relative${I};inset:auto${I};left:auto${I};top:auto${I};width:auto${I};height:auto${I};min-height:0${I};max-height:none${I};background:transparent${I};box-shadow:none${I};transform:none${I};display:block${I}}`,
  t.flow?.length&&`${at(t.flow.join(','))}{overflow:visible${I};max-height:none${I};padding:0${I};background:transparent${I}}`,
  P.card&&`${at(P.card)}{background:${SLATE.glass}${I};border:1px solid ${SLATE.edge}${I};border-radius:12px${I};box-shadow:none${I}}`,
  P.button&&`${at(P.button)}{border-radius:9px${I};background:${SLATE.lift}${I};color:${SLATE.ink}${I};border:1px solid ${SLATE.edge2}${I};box-shadow:none${I}}`,
  P.accent&&`${at(P.accent)}{background:${SLATE.accent}${I};color:${SLATE.onAccent}${I};border-color:${SLATE.accent}${I}}`,
  P.code&&`${at(P.code)}{background:${SLATE.well}${I};color:${SLATE.ink}${I};border-radius:10px}`,
  P.field&&`${at(P.field)}{background:${SLATE.field}${I};color:${SLATE.ink}${I};border:1px solid ${SLATE.edge2}${I};border-radius:9px${I}}`,
 ].filter(Boolean).join('\n');
 return SKINS[a.id]=`<style>${css}</style>`;
}
const STRIP=`<style>.sl-aot{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 10px}.sl-aot button{${B};padding:5px 11px;border-radius:999px}.sl-aot button.on{background:${gold};color:#15120e;border-color:${gold};font-weight:700}</style>`;
const draw=(a,ctx,player,k)=>{try{const h=String(a.c.page(ctx,player,k)??'');
 if(h.length>BUDGET)return `<div style="padding:14px;color:#ffc46b;line-height:1.5">${esc(a.name)} drew ${Math.round(h.length/1000)} KB of page in one frame, past Slate's ${Math.round(BUDGET/1000)} KB limit, so Slate isn't drawing it here. Show its rail tab from Tools to use it there.</div>`;
 return h}catch(e){return `<div style="padding:14px;color:#ff9156">${esc(a.name)} could not draw: ${esc(e?.message||e)}</div>`}};
export function addonApp(ctx,player,id){
 const a=live(ctx).find(x=>x.id===id);if(!a)return null;
 const own=a.c.pages.filter(p=>p.app==='own'),cur=a.c.current(ctx,player),k=own.some(p=>p.k===cur)?cur:own[0]?.k;
 return `${STRIP}${skinOf(a)}<div class="sl-aot"><button onclick="sendAction('planAddon',{op:'close',id:'${esc(a.id)}'})">‹ tools</button>${own.length>1?own.map(p=>`<button class="${p.k===k?'on':''}" onclick="${a.c.go(p.k,player)}">${esc(p.label)}</button>`).join(''):''}</div><div class="sl-ao">${draw(a,ctx,player,k)}</div>`;
}
// the strip at the top of a Slate app an add-on has pages for; a press shows that page in place of the app's body
export function contribStrip(ctx,player,app,body){
 const cs=contribs(ctx,app);if(!cs.length)return body;
 const sel=player?.state?.slateContrib,on=sel&&sel.app===app&&cs.find(c=>c.id===sel.id&&c.k===sel.k);
 const chip=(c)=>`<button class="${on===c?'on':''}" onclick="sendAction('planAddon',{op:'contrib',id:'${c.id}',k:'${on===c?'':c.k}',app:'${app}'})">${c.glyph} ${esc(c.label)}</button>`;
 const strip=`<div class="sl-aot" style="margin-top:2px">${on?`<button onclick="sendAction('planAddon',{op:'contrib',id:'${on.id}',k:'',app:'${app}'})">‹ back</button>`:''}${cs.map(chip).join('')}</div>`;
 if(!on)return STRIP+strip+body;
 const a=live(ctx).find(x=>x.id===on.id);
 return STRIP+skinOf(a)+strip+`<div class="sl-ao">${draw(a,ctx,player,on.k)}</div>`;
}
export function addonsView(ctx,player,plan){
 const open=player?.state?.slateAddon;
 if(open){const h=addonApp(ctx,player,open);if(h)return h;}
 const clash=ctx?.world?.state?.slateAoClash||{};
 const A=(op,id,extra='')=>`sendAction('planAddon',{op:'${op}',id:'${id}'${extra}})`;
 const ACC=(c)=>`${B};background:${c};color:#15120e;border-color:${c};font-weight:700`;
 const row=x=>{const on=installed(ctx,x.id),inS=on&&isHosted(ctx,x.id),wired=inS&&!!HOSTED[x.id],ask=plan.addons?.[x.id];
  const state=ask?(ask.op==='remove'?'removing… Savi is on it':'installing… Savi is on it')
   :inS&&!wired?'Slate is wiring it in (a few seconds)':inS?`in Slate${onHome(ctx,x.id)?' · on home':''} · rail tab ${hidesTab(ctx,x.id)?'hidden':'shown'}`:on&&!x.hostable?'no panel to show in Slate':'';
  const btns=ask?`<button disabled style="${B};opacity:.6">${ask.op==='remove'?'removing':'installing'}</button>`
   :on&&player?.state?.slateAoArm===x.id?`<span style="font-size:11px;color:#e8a196;align-self:center">Remove from this world?</span><button onclick="${A('remove',x.id)}" style="${ACC('#e5675a')}">Uninstall</button><button onclick="${A('disarm',x.id)}" style="${B}">Cancel</button>`
   :inS?`${wired?`<button onclick="${A('open',x.id)}" style="${ACC(gold)}">Open</button>`:''}<button onclick="${A('homeapp',x.id)}" style="${B}">${onHome(ctx,x.id)?'Off home':'On home'}</button><button onclick="${A('railtab',x.id)}" style="${B}" title="its own tab on the god-mode rail">${hidesTab(ctx,x.id)?'Show rail tab':'Hide rail tab'}</button><button onclick="${A('unhost',x.id)}" style="${B}">Take out of Slate</button><button onclick="${A('arm',x.id)}" style="${B}">Uninstall</button>`
   :on?`${x.hostable?`<button onclick="${A('host',x.id)}" style="${ACC(gold)}">Add to Slate</button>`:''}<button onclick="${A('arm',x.id)}" style="${B}">Uninstall</button>`
   :`<button onclick="${A('install',x.id)}" style="${ACC(gold)}">Install</button>`;
  const eps=wired?endpointsOf(ctx,x.id):[];
  return `<div style="display:flex;gap:12px;align-items:center;background:#1a150f;border:1px solid ${line};border-radius:8px;padding:12px;margin:0 0 10px;flex-wrap:wrap">
   <div style="width:52px;height:52px;flex:none;border-radius:12px;background:linear-gradient(150deg,${esc(x.color)},#120e0a 130%);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:inset 0 1px 0 #ffffff33,0 0 0 1px ${line}">${x.image?`<img src="${esc(x.image)}" alt="" style="width:80%;height:80%;object-fit:contain">`:esc(x.glyph)}</div>
   <div style="flex:1;min-width:160px"><div style="font-family:Georgia,serif;font-size:14px;letter-spacing:.1em;color:${gold}">${esc(x.name)}${x.version?` <span style="font-family:inherit;color:${dim};font-size:11px;letter-spacing:0">v${esc(x.version)}</span>`:''}</div><div style="font-size:11.5px;color:${dim};line-height:1.4;margin-top:3px">${esc(x.about)}</div>${state?`<div style="font-size:10.5px;color:#53d9e5;margin-top:4px">${state}</div>`:''}${clash[x.id]?.length?`<div style="font-size:10.5px;color:#ffc46b;margin-top:4px">buttons named ${clash[x.id].map(esc).join(', ')} clash with Slate or another add-on and won't work inside Slate</div>`:''}${eps.length?`<div style="font-size:10.5px;color:${dim};margin-top:4px">endpoints: ${eps.map(e=>`<span style="color:${ink}">${esc(e.name)}</span>${e.write?' ✎':''}`).join(' · ')}</div>`:''}</div>
   <div style="display:flex;gap:6px;flex:none;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:320px">${btns}</div></div>`;};
 const H=(t,n)=>`<div style="display:flex;align-items:center;gap:10px;margin:16px 2px 8px"><span style="font-size:9px;letter-spacing:.22em;color:${dim}">${t}</span>${n!=null?`<span style="font-size:9px;color:${gold}">${n}</span>`:''}<span style="flex:1;height:1px;background:${line}"></span></div>`;
 const all=(c=>[...c,...live(ctx).filter(l=>!c.some(x=>x.id===l.id))])(catalog(ctx)),inS=all.filter(x=>isHosted(ctx,x.id)),rest=all.filter(x=>!isHosted(ctx,x.id)).sort((a,b)=>(b.hostable-a.hostable)),sug=suggested(ctx);
 const pending=Object.entries(plan.addons||{}).filter(([id,v])=>v.op==='install'&&!installed(ctx,id)&&!sug.some(s=>s.id===id)).map(([id])=>({id,name:id.toUpperCase(),glyph:'◫',color:'#3c4a5c',about:'',hostable:true}));
 const field=`<div style="display:flex;gap:6px;margin:0 0 10px"><input id="slAoName" onkeydown="event.stopPropagation();if(event.key==='Escape'){this.blur();event.preventDefault()}" placeholder="install any mod by its name, e.g. advanced-transform" style="flex:1;min-width:0;background:#15110c;border:1px solid ${line};border-radius:4px;color:${ink};padding:7px 10px;font-size:12px"><button onclick="(function(){var v=(document.getElementById('slAoName').value||'').trim().toLowerCase();if(/^[a-z0-9][a-z0-9-]{0,63}$/.test(v))sendAction('planAddon',{op:'install',id:v})})()" style="${ACC(gold)}">Install</button></div>`;
 const P=(op,id)=>`sendAction('planApp',{id:'${id}',op:'${op}'})`;
 const appRow=x=>{const on=appOn(ctx,x.id),arm=player?.state?.slateAppArm===x.id;
  const btns=arm?`<span style="font-size:11px;color:#e8a196;align-self:center">Take it off Slate?</span><button onclick="${P('uninstall',x.id)}" style="${ACC('#e5675a')}">Uninstall</button><button onclick="${P('disarm',x.id)}" style="${B}">Cancel</button>`
   :on?`<button onclick="${P('open',x.id)}" style="${ACC(gold)}">Open</button><button onclick="${P('arm',x.id)}" style="${B}">Uninstall</button>`
   :`<button onclick="${P('install',x.id)}" style="${ACC(gold)}">Install</button>`;
  return `<div data-app-row="${esc(x.id)}" style="display:flex;gap:12px;align-items:center;background:#1a150f;border:1px solid ${line};border-radius:8px;padding:12px;margin:0 0 10px;flex-wrap:wrap">
   <div style="width:52px;height:52px;flex:none;border-radius:12px;background:linear-gradient(150deg,${esc(x.color)},#120e0a 130%);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:inset 0 1px 0 #ffffff33,0 0 0 1px ${line}">${x.image?`<img src="${esc(x.image)}" alt="" style="width:80%;height:80%;object-fit:contain">`:esc(x.glyph)}</div>
   <div style="flex:1;min-width:160px"><div style="font-family:Georgia,serif;font-size:14px;letter-spacing:.1em;color:${gold}">${esc(x.name)}</div><div style="font-size:11.5px;color:${dim};line-height:1.4;margin-top:3px">${esc(x.about)}</div>${on?`<div style="font-size:10.5px;color:#53d9e5;margin-top:4px">installed · on your home screen</div>`:''}</div>
   <div style="display:flex;gap:6px;flex:none;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:320px">${btns}</div></div>`;};
 const slateApps=H('SLATE APPS',BUILTIN.length)+`<div style="font-size:11px;color:${dim};margin:0 2px 10px;line-height:1.5">${CORE.map(c=>c[1]).join(', ')} are Slate itself and always stay. These you add and take away as you like.</div>`+BUILTIN.map(appRow).join('');
 if(player?.state?.slateStorePage)return storeView(ctx,player);
 const rows=storeView(ctx,player)+(inS.length?H('IN SLATE',inS.length)+inS.map(row).join(''):'')+(rest.length?H('IN THIS WORLD',rest.length)+rest.map(row).join(''):'')+H('GET MORE')+field+[...pending,...sug].map(row).join('');
 return `<div style="max-width:720px;margin:0 auto"><div style="font-size:11.5px;color:${dim};margin:2px 0 6px;line-height:1.5">Any mod can live inside Slate as an app. <b style="color:${ink}">Add to Slate</b> draws its panel here and puts it on your home screen; its own rail tab tucks away until you take it out again.</div>${rows}<div style="font-size:10px;color:${dim};margin-top:18px;text-align:center">add-on system by @dandalruss</div></div>`;
}
