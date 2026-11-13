// STUDIO screens: ASSETS (each asset's pipeline trail), CONCEPTS (every image made), DOCS (the markdown, readable).
import {STEPS,turnOk} from './studio.js';
const arr=v=>Array.isArray(v)?v:(v==null||v===''?[]:[v]);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c',brass='#c9a56a',cyan='#53d9e5',ember='#ff9156',acc='#b0864a';
const sub=`font-size:10px;letter-spacing:.16em;color:#bdc7c7`;
const btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:3px 9px;font-size:11px;border-radius:6px`;
const S=o=>esc(`sendAction('planStudio',${JSON.stringify(o)})`);
const pill=(on,label,n,o)=>`<button onclick="${S(o)}" style="${btn};border-radius:12px;${on?`background:${acc};color:#111b2c;border-color:${acc};font-weight:700`:''}">${esc(label)}${n!=null?` <span style="opacity:.75">${n}</span>`:''}</button>`;
const LB=(u,t)=>esc(`event.preventDefault();event.stopPropagation();sendAction('planStudio',${JSON.stringify({op:'lb',u,t:t||''})})`);
const zoom=u=>` href="${esc(u)}" onclick="${LB(u)}" style="cursor:zoom-in;`;
const IMG=/\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
const COPY=`var i=this.parentNode.querySelector('input');i.value=new URL(i.value,location.href).href;i.select();try{navigator.clipboard.writeText(i.value)}catch(e){};try{document.execCommand('copy')}catch(e){};this.textContent='copied ✓'`;
export function lightbox(player){const L=player?.state?.slateLb;if(!L?.u)return '';const u=L.u,img=IMG.test(u)||/^\/cdn\/value\./.test(u)&&!/\.(glb|md|json|mp3)(\?|$)/i.test(u),close=esc(`event.stopPropagation();sendAction('planStudio',{op:'lb',u:null})`);
 return `<div id="sl-lb" onclick="if(event.target===this){${close}}" style="position:fixed;inset:0;z-index:99999;pointer-events:auto;background:#05080ded;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;cursor:zoom-out;user-select:text">
 ${img?`<img src="${esc(u)}" style="max-width:92vw;max-height:76vh;border-radius:8px;box-shadow:0 10px 40px #000;cursor:default">`:`<div style="font-size:15px;color:#f1e6cf;max-width:70vw;text-align:center;cursor:default">🔗 ${esc(L.t||u)}</div>`}
 <div style="display:flex;gap:8px;align-items:center;cursor:default" onclick="event.stopPropagation()">
  <input readonly value="${esc(u)}" onfocus="this.value=new URL(this.value,location.href).href;this.select()" onclick="this.select()" style="width:min(560px,60vw);background:#0a111c;border:1px solid #2c3b4c;color:#9fe3ea;font:12px monospace;padding:7px 9px;border-radius:6px;user-select:text">
  <button onclick="${esc(COPY)}" style="${btn};padding:7px 14px;font-size:12px;border-color:${brass};color:#ffd79a">⧉ copy link</button>
  <a href="${esc(u)}" ${img?`download`:''} target="_blank" rel="noopener" onclick="event.stopPropagation()" style="${btn};padding:7px 14px;font-size:12px;border-color:${brass};color:#ffd79a;text-decoration:none">${img?'⬇ download':'↗ open'}</a>
  <button onclick="${close}" style="${btn};padding:7px 12px;font-size:12px">✕</button>
 </div>
 <div style="font:10.5px sans-serif;color:${dim}">click the link box to select it · esc-free: click outside to close</div></div>`;}
const isUrl=u=>typeof u==='string'&&/^(\/cdn\/|https:\/\/)/.test(u);
const imgOf=a=>[a?.render?.[0]?.url||a?.render?.[0],a?.turnaround?.sheet,a?.design?.concept].find(isUrl);
const stepIdx=a=>Math.max(0,STEPS.indexOf(a?.status));
function rail(a,big){const k=stepIdx(a);return `<div style="display:flex;gap:${big?6:3}px;align-items:center">${STEPS.map((s,i)=>`<span title="${s}" style="width:${big?11:7}px;height:${big?11:7}px;border-radius:50%;background:${i<k?brass:i===k?cyan:'#26313f'};${i===k?`box-shadow:0 0 6px ${cyan}`:''}"></span>`).join('')}</div>`;}
function md(src){
 const out=[];let list=false,code=false,tbl=false;const close=()=>{if(list){out.push('</ul>');list=false;}if(tbl){out.push('</table>');tbl=false;}};
 const inl=t=>esc(t).replace(/`([^`]+)`/g,'<code style="background:#0a111c;color:#9fe3ea;padding:0 4px;border-radius:3px">$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b style="color:#f1e6cf">$1</b>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" style="color:'+cyan+'">$1</a>').replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g,'$1<a href="$2" target="_blank" style="color:'+cyan+'">$2</a>');
 for(const raw of String(src).split('\n')){const l=raw.replace(/\s+$/,'');
  if(/^```/.test(l)){close();out.push(code?'</pre>':'<pre style="background:#0a111c;border:1px solid '+line+';padding:8px;border-radius:6px;white-space:pre-wrap;font-size:11px;color:#bfe9ec">');code=!code;continue;}
  if(code){out.push(esc(l)+'\n');continue;}
  let m;
  if(m=l.match(/^(#{1,4})\s+(.*)/)){close();const n=m[1].length;out.push(`<div style="margin:${n<3?16:10}px 0 6px;color:${n<3?brass:'#e8dcc0'};font-size:${[0,20,16,13.5,12.5][n]}px;${n===2?`border-bottom:1px solid ${line};padding-bottom:4px`:''}">${inl(m[2])}</div>`);continue;}
  if(/^\|/.test(l)){if(/^\|[\s:|-]+\|$/.test(l))continue;if(!tbl){close();out.push(`<table style="border-collapse:collapse;margin:6px 0;font-size:11.5px">`);tbl=true;}out.push('<tr>'+l.replace(/^\||\|$/g,'').split('|').map(c=>`<td style="border:1px solid ${line};padding:3px 7px;vertical-align:top">${inl(c.trim())}</td>`).join('')+'</tr>');continue;}
  if(m=l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/)){if(tbl)close();if(!list){out.push('<ul style="margin:4px 0 4px 18px;padding:0">');list=true;}out.push(`<li style="margin:2px 0">${inl(m[1])}</li>`);continue;}
  if(!l.trim()){close();continue;}
  close();out.push(`<p style="margin:5px 0">${inl(l)}</p>`);}
 close();if(code)out.push('</pre>');return out.join('');
}
function field(label,v){return `<div style="margin:10px 0 0"><div style="${sub};color:${brass};margin-bottom:4px">${label}</div>${v}</div>`;}
const none=`<span style="color:${dim};font-size:11.5px">not yet</span>`;
const thumb=(u,cap)=>`<a title="${esc(cap||'open full size')}"${zoom(u)}display:inline-block;margin:0 6px 6px 0"><img src="${esc(u)}" style="height:92px;border-radius:6px;border:1px solid ${line};display:block"></a>`;
// ── concept layout: list left, pipeline timeline right, tabs along the bottom ──
const STC={concept:'#e0733a',design:'#e0733a',turnaround:'#3fb6c4',research:'#3fb6c4',blockout:'#d9a441',sculpt:'#d9a441',retopo:'#d9a441',bake:'#8b6cf0',materials:'#8b6cf0',export:'#5b8def',placed:'#3fae74',done:'#3fae74'};
const stPill=(st,big)=>{const c=STC[st]||'#53d9e5';return `<span style="display:inline-block;background:${c};color:#0d1522;font-weight:800;letter-spacing:.12em;font-size:${big?11:9.5}px;padding:${big?'5px 12px':'3px 9px'};border-radius:5px">${esc(String(st||'?').toUpperCase())}</span>`;};
const shortName=(a,k,ext)=>`${(a.id||'asset').replace(/^cabin-/,'').replace(/-/g,'_')}_${k}.${ext}`;
function listRow(a,on){const im=imgOf(a);return `<button data-sname="${esc((a.title+' '+a.id+' '+(a.room||'')).toLowerCase())}" onclick="${S({op:'open',id:a.id})}" style="display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:${on?'#13263a':'#111c2b'};border:${on?'2px solid #53d9e5':'1px solid #1f2c3c'};border-radius:10px;padding:${on?'7px':'8px'};margin-bottom:8px;cursor:pointer;color:${ink};${on?'box-shadow:0 0 14px #53d9e544':''}">
 <div style="width:92px;height:66px;flex:none;border-radius:6px;background:#0a111c center/cover no-repeat ${im?`url('${esc(im)}')`:''}"></div>
 <div style="flex:1;min-width:0"><div style="font-size:13.5px;color:#f1e6cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.title||a.id)}</div><div style="font-size:10.5px;color:${dim};margin:2px 0 6px">${esc(a.id)}</div>${stPill(a.status)}</div></button>`;}
function tlRow(title,cap,body,done){return `<div style="display:flex;gap:0;position:relative;padding:0 0 16px">
 <div style="width:26px;flex:none;display:flex;justify-content:center"><span style="width:16px;height:16px;border-radius:50%;margin-top:2px;position:relative;z-index:1;${done?`background:${brass};box-shadow:0 0 8px ${brass}88`:`background:#0d1522;border:2px solid ${brass}`}"></span></div>
 <div style="width:150px;flex:none;padding-left:8px"><div style="color:${brass};letter-spacing:.2em;font-size:12.5px;font-weight:700">${title}</div><div style="color:${dim};font-size:10.5px;line-height:1.35;margin-top:3px">${cap}</div></div>
 <div style="flex:1;min-width:0">${body}</div></div>`;}
const fileTile=(u,name,meta,wide)=>`<div style="display:flex;gap:12px;align-items:center"><a${zoom(u)}flex:none;display:block;width:${wide?300:150}px;height:${wide?64:64}px;border-radius:6px;border:1px solid ${line};background:#0a111c center/cover no-repeat url('${esc(u)}')"></a><div><div style="font-size:12px;color:#f1e6cf">${esc(name)}</div>${meta?`<div style="font-size:10.5px;color:${dim}">${esc(meta)}</div>`:''}</div></div>`;
const nada=`<div style="font-size:11px;color:${dim};border:1px dashed #2c3b4c;border-radius:6px;padding:8px 10px">not yet</div>`;
let VW=null // the player's open 3D view, set per render by studioView
// every material slot an asset carries, whatever shape its receipt wrote: matMaps (read from the shipped glb) first,
// then materials as a flat map set, a dict of slots, a list of names/specs, or { slots: [...] }
const MAPK=[['baseColor','Base Colour',['base','albedo','basecolor']],['normal','Normal',[]],['orm','ORM',['metallicRoughness']],['roughness','Roughness',[]],['ao','AO',['occlusion']],['emissive','Emissive',[]]];
function slotsOf(a){
 const mm=a.matMaps?.slots;if(mm&&typeof mm==='object')return Object.entries(mm).map(([n,r])=>({name:n,maps:r}));
 const m=a.materials;if(!m)return [];
 const one=o=>{const r={};for(const [k,,al] of MAPK){const key=[k,...al].find(x=>x in o);if(key)r[k]=o[key];}return r;};
 const fromStr=x=>{const t=String(x),u=(t.match(/(\/?cdn\/[\w./-]+\.(?:png|jpg|webp))/)||[])[1];return {name:t.replace(/\s*\(.*$/,'').slice(0,40),maps:u?{baseColor:u.startsWith('/')?u:'/'+u}:{},note:t};};
 if(Array.isArray(m))return m.map(x=>typeof x==='string'?fromStr(x):{name:x.name||x.id||'material',maps:one(x),note:x.note});
 if(typeof m!=='object')return [fromStr(m)];
 if(Array.isArray(m.slots))return m.slots.map(n=>({name:String(n),maps:{},note:m.note}));
 if(MAPK.some(([k,,al])=>[k,...al].some(x=>x in m)))return [{name:'material',maps:one(m)}];
 return Object.entries(m).map(([n,v])=>v&&typeof v==='object'?{name:n,maps:one(v)}:{name:n,maps:{},note:String(v)});}
function matsView(a){
 const sl=slotsOf(a);if(!sl.length)return nada;
 const cell=(v,l)=>{const u=isUrl(v),sw=!u&&typeof v==='string'&&/^#[0-9a-f]{6}/i.test(v);return `<div style="text-align:center;width:78px"><${u?`a${zoom(v).replace(/ style="[^"]*$/,'')}`:'div'} title="${esc(typeof v==='string'?v:JSON.stringify(v))}" style="cursor:${u?'zoom-in':'default'};display:block;width:78px;height:60px;border-radius:5px;border:1px solid ${line};background:${sw?v.slice(0,7):'#05080d'} center/cover no-repeat ${u?`url('${esc(v)}')`:''}">${!u&&!sw&&v!=null?`<div style="font-size:9px;color:${dim};padding:6px 4px;line-height:1.25;overflow:hidden;height:48px">${esc(String(v).slice(0,60))}</div>`:''}</${u?'a':'div'}><div style="font-size:10.5px;color:${dim};margin-top:4px">${l}</div></div>`;};
 const src=a.matMaps?.from?`<div style="font-size:10.5px;color:${dim};margin-bottom:6px">maps read from the shipped model · ${sl.length} slot${sl.length>1?'s':''}</div>`:'';
 return src+sl.map(x=>{const ks=MAPK.filter(([k])=>x.maps[k]!=null);return `<div style="margin-bottom:10px"><div style="font-size:11.5px;color:#f1e6cf;margin-bottom:5px">${esc(x.name)}</div>${ks.length?`<div style="display:flex;gap:10px;flex-wrap:wrap">${ks.map(([k,l])=>cell(x.maps[k],l)).join('')}</div>`:''}${x.note&&(!ks.length||x.note!==x.name)?`<div style="font-size:10.5px;color:${dim};margin-top:3px">${esc(x.note)}</div>`:''}</div>`;}).join('');}
function assetPage(a){
 const r=arr(a.research),ren=arr(a.render).map(x=>isUrl(x)?{url:x}:x).filter(x=>isUrl(x?.url)),m=a.materials||{},mo=a.model||{},hero=imgOf(a);
 const tags=[a.room,a.wave,mo.tris?`${mo.tris} tris`:'',...arr(a.tags)].filter(Boolean);
 const desc=a.description||a.design?.note||'';
 const res=r.length?`<div style="background:#111c2b;border:1px solid #1f2c3c;border-radius:8px;padding:4px 10px">${r.map(x=>{const t=typeof x==='string'?x:(x.title||x.url||'');const u=typeof x==='object'&&x.url;return `<div style="display:flex;gap:8px;align-items:center;padding:5px 0;font-size:11.5px;border-bottom:1px solid #ffffff08"><span style="color:${dim}">🔗</span>${u?`<a href="${esc(u)}" onclick="${LB(u,t)}" style="flex:1;color:${ink};text-decoration:none;cursor:pointer;user-select:text" title="${esc(x.usedFor||x.note||'')}">${esc(t)}</a><button onclick="${LB(u,t)}" title="open / copy link" style="${btn};padding:1px 7px">⧉</button>`:`<span style="flex:1">${esc(t)}</span>`}</div>`;}).join('')}${a.technique?`<div style="font-size:10.5px;color:${dim};padding:6px 0 4px;line-height:1.4">${esc(a.technique)}</div>`:''}</div>`:nada;
 const MAPS=[['baseColor','Base Colour'],['normal','Normal'],['orm','ORM'],['roughness','Roughness'],['ao','AO'],['emissive','Emissive']];
 const mats=matsView(a);
 const lods=Array.isArray(mo.lods)&&mo.lods.length?mo.lods.filter(x=>x&&typeof x==='object'):(mo.tris?[{name:'LOD0',tris:mo.tris}]:[]);
 const kt=n=>n>=1000?(Math.round(n/100)/10).toString().replace(/\.0$/,'')+'K':String(n??'');
 const sp=a.spin&&isUrl(a.spin.sheet)?a.spin:null,SPX=300,SN=sp?Number(sp.frames)||36:0; // Kiln turntable sheet (art/lib/turntable.py): one row of frames, stepped by CSS, hover holds it
 const spin=sp?`<style>@keyframes slTurn{to{background-position:-${SPX*SN}px 0}}.sl-turn{animation:slTurn ${(SN/12).toFixed(1)}s steps(${SN}) infinite}.sl-turn:hover{animation-play-state:paused}</style><div style="display:flex;justify-content:center;background:#05080d;border:1px solid #1f2c3c;border-radius:8px;padding:8px;margin-bottom:8px"><div class="sl-turn" title="hover to hold" style="width:${SPX}px;height:${SPX}px;border-radius:6px;background:url('${esc(sp.sheet)}') 0 0/${SPX*SN}px ${SPX}px no-repeat"></div></div>`:(mo.glb?`<div style="font-size:10.5px;color:${dim};margin-bottom:6px">turntable not rendered yet (Kiln export step: art/lib/turntable.py)</div>`:'');
 const model=mo.glb?spin+`<div style="display:flex;gap:12px;align-items:center;background:#111c2b;border:1px solid #1f2c3c;border-radius:8px;padding:10px 12px"><span style="font-size:24px">📄</span><div style="flex:1"><a href="${esc(mo.glb)}" target="_blank" style="color:#f1e6cf;font-size:12.5px;text-decoration:none">${esc(shortName(a,'01','glb'))}</a>${/^\/cdn\/value\./.test(mo.glb)?'':'<div style="font-size:10.5px;color:#d98a53;margin:4px 0">not uploaded yet</div>'}<div style="font-size:10.5px;color:${dim}">${mo.tris?`${Number(mo.tris).toLocaleString()} triangles`:''}${mo.bytes?` · ${(mo.bytes/1048576).toFixed(1)} MB`:''}</div></div>${lods.map((l,i)=>{const o=typeof l==='object'?l:{name:String(l)};return `<span style="font-size:10.5px;letter-spacing:.06em;padding:4px 9px;border-radius:5px;${i===0?'background:#53d9e5;color:#0d1522;font-weight:700':'background:#16243a;color:#cbd5d5;border:1px solid #2c3b4c'}">${esc(o.name||'LOD'+i)} ${esc(kt(o.tris))}</span>`;}).join('')}</div>`:nada;
 const pl=a.placement;
 const place=pl?`<div style="font-size:11px;color:${ink}">${pl.position?`📍 ${esc(pl.id||a.id)} at (${[pl.position.x,pl.position.y,pl.position.z].join(', ')})${pl.rotation!=null?` · yaw ${esc(pl.rotation)}`:''}`:esc(typeof pl==='string'?pl:JSON.stringify(pl))}${pl.note?`<div style="color:${dim};font-size:10.5px;margin-top:2px">${esc(pl.note)}</div>`:''}</div>`:nada;
 const log=[...(a.log||[])].reverse();
 const okPill=(ok,t)=>`<span style="font-size:9.5px;letter-spacing:.12em;padding:2px 7px;border-radius:999px;border:1px solid ${ok?'#3fae74':'#c96a5a'};color:${ok?'#8fd6a8':'#e6a090'}">${t||(ok?'PASS':'FAIL')}</span>`;
 const sil=a.silhouette||{},sv=arr(sil.views).filter(v=>v&&(isUrl(v.sheet)||v.overlap!=null));
 const silBody=sv.length?sv.map(v=>`<div style="display:flex;gap:12px;align-items:center">${isUrl(v.sheet)?`<a${zoom(v.sheet)}flex:none;display:block;width:300px;height:64px;border-radius:6px;border:1px solid ${line};background:#0a111c center/cover no-repeat url('${esc(v.sheet)}')"></a>`:''}<div style="font-size:11px;color:${ink};display:flex;flex-direction:column;gap:3px"><div><span style="color:#f1e6cf">${esc(v.view||'view')}</span> ${okPill(v.pass??(v.overlap>=(sil.gate||0.85)))}</div><div style="color:${dim}">overlap ${v.overlap!=null?Number(v.overlap).toFixed(3):'?'} / ${sil.gate||0.85}${v.worst?` · worst band ${esc(v.worst.band)} ${v.worst.delta!=null?(v.worst.delta>0?'+':'')+Number(v.worst.delta).toFixed(3):''}`:''}${sil.px?` · at ${esc(sil.px)} px`:''}</div>${v.note?`<div style="color:${dim}">${esc(v.note)}</div>`:''}</div></div>`).join('<div style="height:6px"></div>'):nada;
 const silOk=sv.length>0&&sv.every(v=>v.pass??(v.overlap>=(sil.gate||0.85)));
 const val=a.values||{};const valBody=isUrl(val.sheet)||val.note?`<div style="display:flex;gap:12px;align-items:center">${isUrl(val.sheet)?fileTile(val.sheet,shortName(a,'values','png'),'greyscale check'):''}${val.pass!=null?okPill(val.pass):''}${val.note?`<div style="font-size:11px;color:${dim}">${esc(val.note)}</div>`:''}</div>`:nada;
 const lim=a.limits||{};const LIMS=[['tex','textures'],['maps','maps'],['mats','materials'],['glbKB','.glb KB'],['tris','tris'],['baked','shaders baked']];
 const limBody=Object.keys(lim).length?`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${LIMS.filter(([k])=>k in lim).map(([k,l])=>`<span style="background:#16243a;border:1px solid #22324a;color:#d9e0d9;font-size:11px;padding:3px 9px;border-radius:6px">${esc(l)} <b style="color:#f1e6cf;font-weight:600">${esc(lim[k]===true?'yes':lim[k]===false?'no':lim[k])}</b></span>`).join('')}${lim.ok!=null?okPill(lim.ok,lim.ok?'IN LIMITS':'OVER'):''}${lim.ok!==true&&typeof lim.waived==='string'&&lim.waived.trim()?okPill(true,'WAIVED BY CREATOR'):''}</div>${lim.note?`<div style="font-size:10.5px;color:${dim};margin-top:4px">${esc(lim.note)}</div>`:''}${lim.ok!==true&&typeof lim.waived==='string'&&lim.waived.trim()?`<div style="font-size:10.5px;color:#8fd6a8;margin-top:4px">waived: “${esc(lim.waived)}”</div>`:''}`:nada;
 const rv=a.review&&typeof a.review==='object'?a.review:null;const revBody=rv?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${okPill(rv.pass===true)}${rv.by?`<span style="font-size:11px;color:#d9e0d9">by ${esc(rv.by)}</span>`:''}</div>${rv.note?`<div style="font-size:11px;color:${dim};margin-top:4px">${esc(rv.note)}</div>`:''}`:nada;
 const stp=a.steps&&typeof a.steps==='object'?Object.entries(a.steps):[];const stpBody=stp.length?`<div style="display:flex;flex-direction:column;gap:3px">${stp.map(([k,v])=>{const t=String(v??''),c=/^pass/i.test(t)?'#8fd6a8':/^fail/i.test(t)?'#e6a090':'#c9a56a';return `<div style="display:flex;gap:8px;font-size:11px"><span style="color:#d9e0d9;min-width:90px">${esc(k)}</span><span style="color:${c}">${esc(t)}</span></div>`;}).join('')}</div>`:nada;
 const stpOk=stp.length>0&&stp.every(([k,v])=>!/^fail/i.test(String(v??'')));
 const look=pl&&isUrl(pl.look)?fileTile(pl.look,shortName(a,'in_game','png'),'signed off in the engine, from the player\'s eye',true):'';
 const inf=arr(a.inferred);const infBody=inf.length?`<div style="font-size:11px;color:${ink}">${inf.map(x=>`<div style="padding:2px 0">· ${esc(x)}</div>`).join('')}</div>`:'';
 return `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:18px">
  <${hero?`a${zoom(hero)}`:'div style="'}width:250px;height:150px;flex:none;display:block;border-radius:8px;border:1px solid #3a4a5c;background:#0a111c center/cover no-repeat ${hero?`url('${esc(hero)}')`:''};box-shadow:0 6px 18px #0008"></${hero?'a':'div'}>
  <div style="flex:1;min-width:0"><div style="display:flex;align-items:flex-start;gap:10px"><div style="flex:1"><div style="font-size:24px;color:#f6efe0">${esc(a.title||a.id)}</div><div style="font-size:12px;color:${dim};margin-top:2px">${esc(a.id)}</div></div>${stPill(a.status,true)}</div>
  ${desc?`<div style="font-size:12px;color:#c9d0cc;margin:10px 0">${esc(desc)}</div>`:''}
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${tags.map(t=>`<span style="background:#16243a;border:1px solid #22324a;color:#d9e0d9;font-size:11px;padding:4px 10px;border-radius:6px">${esc(t)}</span>`).join('')}</div></div></div>
 <div style="position:relative"><div style="position:absolute;left:12px;top:8px;bottom:24px;width:2px;background:${brass}66"></div>
 ${tlRow('DESIGN','Initial concept and visual direction.',isUrl(a.design?.concept)?fileTile(a.design.concept,shortName(a,'concept','jpg'),'region of the room concept'):nada,isUrl(a.design?.concept))}
 ${tlRow('TURNAROUND','Orthographic views, drawn from the concept or sourced refs, never from the model.',isUrl(a.turnaround?.sheet)?fileTile(a.turnaround.sheet,shortName(a,'turnaround','png'),turnOk(a.turnaround)?'four-view sheet · from '+esc(a.turnaround.from.join(', ')):'four-view sheet',true)+(turnOk(a.turnaround)?'':`<div style="margin-top:6px;font-size:11px;color:#e08a7a;border:1px solid #e08a7a66;border-radius:6px;padding:6px 9px">not counted: no source. A turnaround needs source: reference or concept and from: the pictures it was drawn from. Redraw it from the concept, never from a render of the model.</div>`):nada,isUrl(a.turnaround?.sheet)&&turnOk(a.turnaround))}
 ${tlRow('RESEARCH','Useful tutorials and references.',res,r.length>0)}
 ${tlRow('SILHOUETTE','Black matte vs the sheet at play size. No detail until it passes.',silBody,silOk)}
 ${tlRow('RENDER','Proof render before final polish.',ren.length?ren.map((x,i)=>fileTile(x.url,shortName(a,'proof_render'+(i?'_'+(i+1):''),'png'),x.what||x.note||'')).join('<div style="height:6px"></div>'):nada,ren.length>0)}
 ${tlRow('MATERIALS','PBR texture maps.',mats,Object.values(m).some(isUrl))}
 ${tlRow('VALUES','Reads in greyscale, not only by colour.',valBody,val.pass===true)}
 ${tlRow('FINAL MODEL','Optimized and ready for use in engine.',model,!!mo.glb)}
 ${tlRow('ENGINE LIMITS','Inside Kiln\'s engine limits page.',limBody,lim.ok===true)}
 ${tlRow('PLACEMENT','Where it stands in the world, and how it looks in the engine.',place+(look?'<div style="height:6px"></div>'+look:''),!!pl)}
 ${tlRow('REVIEW','Fresh eyes: someone who did not make it looked in the game.',revBody,rv?.pass===true)}
 ${tlRow('STEPS','Each workflow step: pass, fail or skipped, and why.',stpBody,stpOk)}
 ${infBody?tlRow('INFERRED','Sides the sheets never showed, filled by judgement.',infBody,true):''}
 </div>
 ${log.length?`<details style="margin:4px 0 0 34px"><summary style="cursor:pointer;color:${brass};letter-spacing:.16em;font-size:11px">WORKFLOW LOG · ${log.length}</summary>${log.map(e=>`<div style="display:flex;gap:8px;font-size:11px;padding:3px 0;border-top:1px solid #ffffff0d"><span style="color:${dim};white-space:nowrap">${esc(String(e.at||'').replace('T',' ').slice(0,16))}</span><span style="color:${brass};white-space:nowrap">${esc(e.step||'')}</span><span>${esc(e.note||'')}</span></div>`).join('')}</details>`:''}`;}
function assetsSplit(A,open,f,when,player){
 const sts=STEPS.filter(s=>A.some(x=>x.status===s));const L=f&&sts.includes(f)?A.filter(x=>x.status===f):A;
 const a0=A.find(x=>x.id===open)||L[0]||A[0];const full=player?.state?.studioAsset;const a=a0&&full&&full.id===a0.id?{...full,file:a0.file}:a0;
 const filt=`if(!this.value){document.querySelectorAll('[data-sname]').forEach(function(e){e.style.display='flex'});return}var q=this.value.toLowerCase();document.querySelectorAll('[data-sname]').forEach(function(e){e.style.display=e.getAttribute('data-sname').indexOf(q)<0?'none':'flex'})`;
 return `<div style="display:flex;min-height:0;flex:1">
 <div style="width:330px;flex:none;border-right:1px solid #1f2c3c;padding:14px 14px 0;display:flex;flex-direction:column;min-height:0">
  <div style="font-size:17px;letter-spacing:.3em;color:#e8e2d2;padding:2px 4px 12px;border-bottom:1px solid #1f2c3c;margin-bottom:12px;display:flex;align-items:center;gap:10px">ASSETS<span style="flex:1"></span><span style="font-size:9.5px;letter-spacing:.04em;color:${dim}">${when==null?'never synced':'synced '+(when?when+' min ago':'just now')}</span><button onclick="${S({op:'sync'})}" style="${btn};letter-spacing:.06em" title="re-read studio/ and docs/ from the world's files">↻ sync</button></div>
  <div style="display:flex;gap:6px;margin-bottom:8px"><div style="flex:1;display:flex;align-items:center;gap:8px;background:#0e1826;border:1px solid #1f2c3c;border-radius:8px;padding:7px 10px"><span style="color:${dim}">⌕</span><input placeholder="Search assets..." oninput="${esc(filt)}" onkeydown="event.stopPropagation()" style="flex:1;background:transparent;border:none;outline:none;color:${ink};font-size:12.5px"></div></div>
  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">${pill(!f||!sts.includes(f),'all',A.length,{op:'filter',f:null})}${sts.map(s=>pill(f===s,s,A.filter(x=>x.status===s).length,{op:'filter',f:s})).join('')}</div>
  <div style="overflow:auto;flex:1;min-height:0;padding-right:4px">${L.map(x=>listRow(x,a&&x.id===a.id)).join('')}</div>
 </div>
 <div style="flex:1;min-width:0;min-height:0;overflow:auto;padding:16px 20px">${a?assetPage(a)+(a===a0?`<div style="font-size:11px;color:${dim};margin-top:10px">tap the asset in the list to load its full receipts</div>`:''):''}</div></div>`;}
function bottomTabs(v,A,C,D){const t=(k,ic,l,n)=>`<button onclick="${S({op:'view',v:k})}" style="flex:1;background:none;border:none;border-top:3px solid ${v===k?cyan:'transparent'};color:${v===k?cyan:'#9aa6ad'};cursor:pointer;padding:12px 0 10px;font-size:13px;letter-spacing:.26em;display:flex;gap:10px;align-items:center;justify-content:center"><span style="font-size:17px;letter-spacing:0">${ic}</span>${l}<span style="font-size:10px;letter-spacing:.05em;opacity:.6">${n}</span></button>`;
 return `<div style="display:flex;border-top:1px solid #1f2c3c;background:#0b1422">${t('docs','🗎','DOCS',D.length)}${t('assets','⬢','ASSETS',A.length)}${t('concepts','💡','CONCEPTS',C.length)}</div>`;}
function studioInner(ctx,player){
 const st=ctx?.world?.state?.studio||{},v=player?.state?.studioView||'assets',open=player?.state?.studioOpen,f=player?.state?.studioFilter;
 const A=st.assets||[],C=st.concepts||[],D=st.docs||[];
 const when=st.at&&ctx.now?Math.max(0,Math.round((ctx.now()-st.at)/60000)):null;
 const top=`<div style="display:flex;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid ${line};flex-wrap:wrap">${pill(v==='assets','ASSETS',A.length,{op:'view',v:'assets'})}${pill(v==='concepts','CONCEPTS',C.length,{op:'view',v:'concepts'})}${pill(v==='docs','DOCS',D.length,{op:'view',v:'docs'})}<span style="flex:1"></span><span style="font-size:10px;color:${dim}">${when==null?'never synced':'synced '+(when?when+' min ago':'just now')}</span><button onclick="${S({op:'sync'})}" style="${btn}" title="re-read studio/ and docs/ from the world's files">↻ sync</button></div>`;
 if(!A.length&&!C.length&&!D.length)return top+`<div style="padding:30px;text-align:center;color:${dim}">nothing here yet. ↻ sync reads studio/ and docs/ from your world.</div>`;
 if(v==='docs'){const d=open&&D.find(x=>x.path===open);
  if(d)return top+`<div style="padding:10px 16px;font-size:12.5px;line-height:1.5;color:${ink}"><div style="display:flex;gap:10px;align-items:center"><button onclick="${S({op:'open',id:null,v:'docs'})}" style="${btn}">‹ docs</button><span style="font-size:10px;color:${dim}">${esc(d.path)}</span></div>${md(d.md??(player?.state?.studioDoc?.path===d.path?player.state.studioDoc.md:'loading…'))}</div>`;
  return top+`<div style="padding:8px 12px;display:flex;flex-direction:column;gap:6px">${D.map(d=>`<button onclick="${S({op:'open',id:d.path,v:'docs'})}" style="${btn};text-align:left;padding:9px 12px;display:flex;gap:10px;align-items:center;border-radius:8px"><span style="font-size:16px">📄</span><span style="flex:1"><div style="font-size:13px">${esc(d.t)}</div><div style="font-size:10px;color:${dim}">${esc(d.kiln?'Kiln workflow':d.path)}</div></span><span style="color:${brass}">›</span></button>`).join('')}</div>`;}
 if(v==='concepts'){const groups=[...new Set(C.map(c=>c.group))];const L=(f&&groups.includes(f)?C.filter(c=>c.group===f):C).slice().sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  return top+`<div style="display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap">${pill(!f||!groups.includes(f),'all',C.length,{op:'filter',f:null})}${groups.map(g=>pill(f===g,g,C.filter(c=>c.group===g).length,{op:'filter',f:g})).join('')}</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:4px 12px 14px">${L.map(c=>`<a title="${esc(c.prompt)}"${zoom(c.url)}background:#152234;border:1px solid ${line};border-radius:8px;overflow:hidden;text-decoration:none;color:${ink}"><img src="${esc(c.url)}" loading="lazy" style="width:100%;height:110px;object-fit:cover;display:block"><div style="padding:5px 7px"><div style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</div><div style="font-size:9.5px;color:${dim}">${esc(c.group)} · ${esc(String(c.at).slice(0,10))}</div></div></a>`).join('')}</div>`;}
 return {split:assetsSplit(A,open,f,when,player)};
}

export function studioView(ctx,player){VW=player?.state?.slateView||null;
 const st=ctx?.world?.state?.studio||{},v=player?.state?.studioView||'assets';
 const A=st.assets||[],C=st.concepts||[],D=st.docs||[];
 const when=st.at&&ctx.now?Math.max(0,Math.round((ctx.now()-st.at)/60000)):null;
 const r=studioInner(ctx,player);
 const head=typeof r!=='string'?'':`<div style="display:flex;align-items:center;gap:10px;padding:6px 14px;border-bottom:1px solid #1f2c3c;font-size:10px;color:${dim}"><span style="flex:1"></span>${when==null?'never synced':'synced '+(when?when+' min ago':'just now')}<button onclick="${S({op:'sync'})}" style="${btn}" title="re-read studio/ and docs/ from the world's files">↻ sync</button></div>`;
 // non-asset views keep their pill bar minus the view pills (the tabs are at the bottom now)
 const body=typeof r==='string'?r:r.split;
 return `<div class="sl-wb" style="display:flex;flex-direction:column;background:#0d1724;overflow:hidden;flex:1;min-height:0;height:100%">${head}<div style="flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto">${body}</div>${bottomTabs(v,A,C,D)}</div>`;}
