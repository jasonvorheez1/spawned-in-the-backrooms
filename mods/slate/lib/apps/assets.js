// Slate built-in app: every asset this world USES (models, sounds, textures, pictures), with a preview and its link.
// Contract: lib/apps/index.js. The index is built by op('scan') on the editor's body, where ctx.files.read works:
// it reads the scene cells, templates, scripts and configs, collects every cdn path and keeps
// world.state.slateAppData.assets = { at, items:[{u,kind,name,b,uses:[≤5 paths],n}], files, err }.
// Photos and Workbench pictures stay in Gallery (lib/ui-gallery.js): any url Gallery shows is left out here.
// One person's view (kind filter, search, pages shown) is player.state.slateApp_assets.
export const APP={id:'assets',name:'ASSETS',glyph:'⬡',color:'#4f7a5a',sub:'models, sounds, pictures',about:'Every model, sound, texture and picture this world uses, with a preview and its link. Pictures you took stay in Gallery.'};
import {THUMBS} from './asset-thumbs.js';
import {SPINS} from './asset-spins.js';
const ID='assets',CAP=600,PAGE=120,MAXF=900;
const KINDS=[['model','MODELS','⬡'],['sound','SOUNDS','♪'],['texture','TEXTURES','▦'],['image','IMAGES','▣'],['other','OTHER','◇']];
const ink='#d9e0d9',dim='#8a9aa0',line='#2c3b4c',gold='#a37d45',brass='#c9a56a',cyan='#53d9e5',ember='#ff9156',navy='#111b2c',accent='#4f7a5a';
const sub=`font-size:10px;letter-spacing:.16em;color:#bdc7c7`;
const btn=`background:#1a2b3d;border:1px solid ${line};color:${ink};cursor:pointer;padding:3px 7px;font-size:11px;border-radius:3px`;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const A=o=>esc(`sendAction('planApp',${JSON.stringify({id:ID,...o})})`);
// ---------- scan ----------
const RX=/(^|[^A-Za-z0-9_.\-\/])(\/?cdn\/[A-Za-z0-9._\-\/]+\.[A-Za-z0-9]{2,5})(?![A-Za-z0-9])/g;
const RXG=/scripts\/gen\/[A-Za-z0-9_\-\/]+\.js/g; // hand-built models: scripted geometry the scenes and templates place
const WANT=f=>/^places\/[^\/]+\/cells\/[^\/]+\.scene$/.test(f)||/^places\/[^\/]+\/config\.yaml$/.test(f)||/^templates\/.+\.js$/.test(f)||/^scripts\/.+\.(js|json|ya?ml)$/.test(f)||f==='world.config.yaml'||/^places\/[^\/]+\/(sim|ui)\.js$/.test(f)||f==='ui.js'||f==='sim.js';
const extOf=u=>(u.match(/\.([a-z0-9]+)$/i)?.[1]||'').toLowerCase();
function kindOf(u,meta){
 const e=extOf(u),nm=String(meta?.name||'').toLowerCase();
 if(/^(glb|gltf|bgeo|fbx|obj|vrm)$/.test(e))return 'model';
 if(/^(mp3|ogg|wav|m4a|flac)$/.test(e))return 'sound';
 if(/^(png|jpe?g|webp|gif|avif|ktx2|hdr|exr)$/.test(e))return /\/texture-/.test(u)||/albedo|normal|rough|texture|diffuse|height|ao\b|-ao|-arm|tile|seamless/.test(nm)?'texture':'image';
 return 'other';
}
// names from world.assets.yaml: "/cdn/value.x.glb": {bytes: 1, kind: model, name: spruce-a-lod1, ...}
function metaOf(txt){
 const M={};if(!txt)return M;
 for(const ln of String(txt).split('\n')){const m=ln.match(/"?(\/cdn\/[^"\s:]+)"?\s*:\s*\{(.*)\}/);if(!m)continue;
  const b=m[2].match(/bytes:\s*(\d+)/),n=m[2].match(/name:\s*("?)([^,}"]+)\1/);M[m[1]]={b:b?+b[1]:0,name:n?n[2].trim():''};}
 return M;
}
const norm=u=>u.startsWith('/')?u:'/'+u;
const gallerySet=(ctx,plan)=>{
 const S=new Set();for(const s of plan?.shots||ctx?.world?.state?.plan?.shots||[])if(s?.url)S.add(String(s.url).split('?')[0]);
 for(const a of ctx?.world?.state?.studio?.assets||[]){for(const u of [a?.design?.concept,a?.turnaround?.sheet,a?.placement?.look,...(a?.render||[]).map(r=>typeof r==='string'?r:r?.url),...(a?.silhouette?.views||[]).map(v=>v?.sheet)])if(typeof u==='string')S.add(u.split('?')[0]);}
 return S;
};
function scan(ctx,plan){
 const rd=ctx?.files?.read;const old=ctx.world.state.slateAppData||{};
 if(typeof rd!=='function'){ctx.world.state.slateAppData={...old,[ID]:{...(old[ID]||{}),err:'files cannot be read from here; open Slate in the build room as an editor and press scan',errAt:ctx.now()}};return;}
 const files=(ctx.world.files||[]).filter(WANT).slice(0,MXF());
 let meta={};try{meta=metaOf(ctx.files.read('world.assets.yaml'));}catch(e){}
 const gal=gallerySet(ctx,plan),map=new Map();let read=0,hidden=0;
 for(const f of files){let t=null;try{t=ctx.files.read(f);}catch(e){}if(!t)continue;read++;RX.lastIndex=0;const here=new Set();let m;
  if(!/^scripts\/gen\//.test(f)){RXG.lastIndex=0;while((m=RXG.exec(t))){const u=m[0];if(here.has(u))continue;here.add(u);let it=map.get(u);if(!it){it={u,uses:[],n:0,built:1};map.set(u,it);}it.n++;if(it.uses.length<5)it.uses.push(f);}}
  while((m=RX.exec(t))){const u=norm(m[2]);if(here.has(u))continue;here.add(u);let it=map.get(u);if(!it){it={u,uses:[],n:0};map.set(u,it);}it.n++;if(it.uses.length<5)it.uses.push(f);}}
 const items=[];
 for(const it of map.values()){if(gal.has(it.u)){hidden++;continue;}const mt=meta[it.u];const o={u:it.u,kind:it.built?'model':kindOf(it.u,mt),uses:it.uses,n:it.n};if(it.built)o.built=1;if(mt?.name)o.name=mt.name;if(mt?.b)o.b=mt.b;items.push(o);}
 const ord=Object.fromEntries(KINDS.map((k,i)=>[k[0],i]));
 items.sort((a,b)=>(ord[a.kind]-ord[b.kind])||(b.n-a.n)||String(label(a)).localeCompare(label(b)));
 ctx.world.state.slateAppData={...old,[ID]:{at:ctx.now(),items:items.slice(0,CAP),total:items.length,files:read,hidden}};
}
function MXF(){return MAXF;}
// ---------- naming ----------
function label(it){
 if(it.name)return it.name;
 if(it.built)return String(it.u).split('/').pop().replace(/\.js$/,'').replace(/-/g,' ');
 const f=String(it.u).split('/').pop().replace(/\?.*$/,'').replace(/\.[a-z0-9]+$/i,'');
 if(/^voice-/.test(f)){const s=f.split('-saying-');return 'voice · '+(s[1]||f).replace(/-/g,' ').slice(0,60);}
 if(/^value\./.test(f))return 'upload '+f.slice(6,14);
 return f.replace(/^(texture|sfx|music)-/,'').replace(/-/g,' ');
}
function family(it){const m=String(it.u).match(/\/cdn\/moodboard-([^\/]+)\/(sfx|music)-/);return m?(m[2]==='music'?'music · ':'sfx · ')+m[1].replace(/-/g,' '):'';}
const size=b=>!b?'':b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';
const ago=(now,at)=>{const m=Math.max(0,(now-at)/60000);return m<1?'just now':m<60?Math.round(m)+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago';};
// ---------- page ----------
// one delegated click on the grid: copy link (clipboard, else a selected field), open picture big; search filters the drawn tiles
const GRIDJS=esc(`var t=event.target.closest('[data-cp],[data-big],[data-spin]');if(!t)return;event.stopPropagation();if(t.dataset.spin!==undefined&&!t.dataset.cp){var S=t.dataset.spin,N=16,o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:99999;background:radial-gradient(circle at 50% 45%,#1f3a2cee,#05090fee 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-family:inherit;color:#e8e2d6;user-select:none';var nm=document.createElement('div');nm.textContent=t.dataset.nm||'model';nm.style.cssText='font-size:13px;letter-spacing:.08em';var v=document.createElement('div');var sz=Math.min(420,innerWidth*.7,innerHeight*.62);v.style.cssText='width:'+sz+'px;height:'+sz+'px;cursor:grab;background-repeat:no-repeat;touch-action:none;transition:transform .15s';var h=document.createElement('div');h.style.cssText='font-size:11px;opacity:.6';var x=document.createElement('button');x.textContent='✕ close';x.style.cssText='background:#0d1724;border:1px solid #2c3b4c;color:#e8e2d6;border-radius:6px;padding:5px 14px;cursor:pointer;font-size:12px';var f=0,auto=1,drag=null,z=1,raf=0,last=0;var draw=function(){v.style.backgroundPosition=(Math.round(f)%N*100/(N-1))+'% 0'};if(S){v.style.backgroundImage='url("'+S+'")';v.style.backgroundSize=(N*100)+'% 100%';h.textContent='drag to turn · scroll to zoom';draw();var tick=function(ts){if(!o.isConnected)return;if(auto&&ts-last>110){f=(f+1)%N;last=ts;draw()}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);v.onpointerdown=function(e){drag={x:e.clientX,f:f};auto=0;v.style.cursor='grabbing';try{v.setPointerCapture(e.pointerId)}catch(_){}};v.onpointermove=function(e){if(!drag)return;f=((drag.f-(e.clientX-drag.x)/18)%N+N)%N;draw()};v.onpointerup=v.onpointercancel=function(){drag=null;v.style.cursor='grab'};v.onwheel=function(e){e.preventDefault();e.stopPropagation();z=Math.max(.6,Math.min(2.4,z*(e.deltaY<0?1.12:.89)));v.style.transform='scale('+z+')'}}else{v.style.background='url("'+(t.dataset.th||'')+'") center/contain no-repeat';h.textContent='the turntable for this one is still rendering'}var close=function(){cancelAnimationFrame(raf);o.remove()};x.onclick=close;o.onclick=function(e){if(e.target===o)close()};o.append(nm,v,h,x);document.body.appendChild(o);return}if(t.dataset.big){var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:99999;background:#000d;display:flex;align-items:center;justify-content:center;cursor:zoom-out';o.onclick=function(){o.remove()};var im=document.createElement('img');im.src=t.dataset.big;im.style.cssText='max-width:92vw;max-height:88vh;border:6px solid #fff;box-shadow:0 10px 40px #000';o.appendChild(im);document.body.appendChild(o);return}var b=t,u=location.origin+b.dataset.cp;var done=function(){b.textContent='copied ✓';setTimeout(function(){b.textContent='⧉ copy link'},1400)};var fb=function(){var s=b.nextElementSibling;if(!s){s=document.createElement('input');s.readOnly=true;s.value=u;s.onclick=function(ev){ev.stopPropagation();this.select()};s.title='copied, paste it in your browser';b.after(s)}s.select();try{document.execCommand('copy');done()}catch(e){b.textContent='select + ctrl-c'}};try{navigator.clipboard.writeText(u).then(done,fb)}catch(e){fb()}`);
const SEARCHJS=esc(`var q=this.value.toLowerCase().trim(),g=this.closest('.as-root').querySelectorAll('.as-t'),n=0;for(var i=0;i<g.length;i++){var h=!q||g[i].dataset.q.indexOf(q)>=0;g[i].style.display=h?'':'none';if(h)n++}var c=this.closest('.as-root').querySelector('.as-shown');if(c)c.textContent=q?n+' match':'';`);
const CSS=`<style>.as-t{background:#0d1724;border:1px solid #2c3b4c;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;min-width:0}.as-p{height:110px;background:#0a121e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden}.as-p img{max-width:100%;max-height:100%;object-fit:contain;pointer-events:none}.as-z{cursor:zoom-in}.as-x{background-position:center;background-size:50%;background-repeat:repeat}.as-s{background:linear-gradient(160deg,#16263a,#0a121e);padding:0 6px}.as-s audio{width:100%;max-width:200px;height:28px}.as-m{background:radial-gradient(circle at 50% 40%,#1f3a2c,#0a121e 70%)}.as-g{font-size:34px;line-height:1}.as-e{font-size:10px;letter-spacing:.12em;color:#8a9aa0}.as-b{padding:6px 7px 7px;display:flex;flex-direction:column;gap:4px;min-width:0}.as-n,.as-k,.as-u span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.as-n{font-size:12px;color:#d9e0d9}.as-k{font-size:10px;color:#8a9aa0}.as-u{font-size:10.5px;color:#8a9aa0}.as-u summary{cursor:pointer;list-style:none;color:#9fb3c0}.as-u div{display:flex;flex-direction:column;gap:2px;margin-top:3px}.as-u span{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:#bdc7c7;direction:rtl;text-align:left}.as-c{background:#1a2b3d;border:1px solid #2c3b4c;color:#d9e0d9;cursor:pointer;padding:3px 7px;font-size:10px;border-radius:3px;align-self:flex-start}.as-c+input{font-size:10px;background:#111b2c;color:#ffd79a;border:1px solid #a37d45;padding:1px 4px}</style>`;
const KC={model:'#7fb08c',sound:cyan,texture:brass,image:'#e9c9a0',other:dim};
function preview(it){
 const u=esc(it.u),k=it.kind;
 if(k==='image')return `<div class="as-p as-z" data-big="${u}" title="view big"><img src="${u}" loading="lazy" alt=""></div>`;
 if(k==='texture')return `<div class="as-p as-z as-x" data-big="${u}" title="view big · tiled to show the seam" style="background-image:url('${u}')"></div>`;
 if(k==='sound')return `<div class="as-p as-s"><div class="as-g" style="color:${cyan};font-size:24px">${/\/music-/.test(it.u)?'♫':/voice-/.test(it.u)?'❝':'♪'}</div><audio controls preload="none" src="${u}"></audio></div>`;
 if(it.built)return `<div class="as-p as-m"><div class="as-g" style="color:#c9a56a;font-size:40px">✎</div><div class="as-e">BUILT IN CODE</div></div>`;
 if(k==='model'){const th=THUMBS[it.u];return th?`<div class="as-p as-m as-z" data-big="${esc(th)}" title="view big" style="position:relative"><img src="${esc(th)}" loading="lazy" alt=""><div class="as-e" style="position:absolute;right:5px;bottom:4px;background:#0a121ecc;padding:1px 5px;border-radius:3px">GLB${it.b?' · '+size(it.b):''}</div></div>`:`<div class="as-p as-m"><div class="as-g" style="color:#7fb08c;font-size:40px">⬡</div><div class="as-e">${esc(extOf(it.u).toUpperCase())}${it.b?' · '+size(it.b):''}</div></div>`;}
 return `<div class="as-p"><div class="as-g" style="color:${dim}">◇</div><div class="as-e">${esc(extOf(it.u).toUpperCase())}</div></div>`;
}
function card(it){
 const nm=label(it),fam=family(it),q=(nm+' '+it.u.replace(/^\/cdn\//,'')+' '+(it.uses||[]).join(' ')+' '+fam).toLowerCase();
 const us=it.uses||[];
 return `<div class="as-t" data-q="${esc(q)}">${preview(it)}<div class="as-b"><div class="as-n" title="${esc(nm)}">${esc(nm)}</div><div class="as-k"><span style="color:${KC[it.kind]||dim}">${it.kind}</span>${fam?' · '+esc(fam):''}${it.kind!=='model'&&it.b?' · '+size(it.b):''}</div><details class="as-u"><summary>▸ used in ${it.n} file${it.n===1?'':'s'}</summary><div>${us.map(f=>`<span title="${esc(f)}">${esc(f)}</span>`).join('')}${it.n>us.length?`<span>+ ${it.n-us.length} more</span>`:''}</div></details>${it.built?`<div class="as-e" style="padding:4px 0;opacity:.7" title="the script that draws it">${esc(it.u)}</div>`:`${it.kind==='model'&&/\.glb(\?|$)/.test(it.u)?`<button class="as-c" data-spin="${esc(SPINS[it.u]||'')}" data-th="${esc(THUMBS[it.u]||'')}" data-nm="${esc(label(it))}" title="spin it in 3D right here in slate" style="margin-bottom:3px">◎ view in 3D</button><button class="as-c" onclick="event.stopPropagation();${A({op:'v3d',u:it.u})}" title="stand it in the world in front of you" style="margin-bottom:3px;opacity:.75">⌖ place in world</button>`:''}<button class="as-c" data-cp="${esc(it.u)}" title="copy the full link">⧉ copy link</button>`}</div></div>`;
}
export function page(ctx,player,plan){
 const D=ctx?.world?.state?.slateAppData?.[ID]||null,me=player?.state?.slateApp_assets||{},now=ctx?.now?.()||0;
 const gal=gallerySet(ctx,plan),all=(Array.isArray(D?.items)?D.items:[]).filter(it=>it&&it.u&&!gal.has(it.u));
 const cnt={};for(const it of all)cnt[it.kind]=(cnt[it.kind]||0)+1;
 const k=KINDS.some(x=>x[0]===me.k)?me.k:'all',q=String(me.q||'').toLowerCase().slice(0,80);
 let list=k==='all'?all:all.filter(it=>it.kind===k);
 if(q)list=list.filter(it=>(label(it)+' '+it.u+' '+(it.uses||[]).join(' ')+' '+family(it)).toLowerCase().includes(q));
 const pages=Math.max(1,Math.min(20,+me.pg||1)),shown=list.slice(0,pages*PAGE);
 const pill=(id,lab,n,g)=>`<button onclick="${A({op:'kind',k:id})}" style="${btn};border-radius:999px;padding:4px 11px;${k===id?`background:${accent};border-color:${accent};color:#fff;font-weight:600`:''}">${g?g+' ':''}${lab} <span style="opacity:.62;font-size:10px">${n}</span></button>`;
 const head=`<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
<div style="display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 200px"><div style="${sub};color:${brass}">WHAT THIS WORLD USES</div>
<div style="font-size:11px;color:${dim}">${D?.at?`scanned ${ago(now,D.at)} · ${D.files||0} files read · ${all.length} assets${D.total>CAP?` (first ${CAP} of ${D.total})`:''}`:'not scanned yet'}</div></div>
<button onclick="${A({op:'scan'})};this.textContent='scanning…'" title="read the world's scenes, templates, scripts and configs again" style="${btn};background:${gold};border-color:${gold};color:${navy};font-weight:700;padding:5px 12px">↻ ${D?.at?'RESCAN':'SCAN'}</button></div>`;
 const galNote=`<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 9px;border:1px dashed ${line};border-radius:6px;font-size:11px;color:${dim}"><span>▣ your photos live in Gallery${D?.hidden?` · ${D.hidden} picture${D.hidden===1?'':'s'} left out here`:''}</span><span style="flex:1"></span><button onclick="${esc(`sendAction('planTab',{tab:'gallery'})`)}" style="${btn}">open Gallery →</button></div>`;
 const err=D?.err&&(!D.at||(D.errAt||0)>D.at)?`<div style="color:${ember};font-size:11px">${esc(D.err)}</div>`:'';
 if(!all.length)return `<div class="as-root" style="padding:12px;display:flex;flex-direction:column;gap:12px;color:${ink};max-width:1100px;margin:0 auto">${head}${err}<div style="padding:34px 12px;text-align:center;border:1px solid ${line};border-radius:8px;background:#0d1724"><div style="font-size:34px;color:#7fb08c">⬡</div><div style="font-size:14px;margin:6px 0 4px">${D?.at?'no assets found':'press scan'}</div><div style="font-size:11px;color:${dim};max-width:320px;margin:0 auto">${D?.at?'nothing in the scenes, templates or scripts points at a cdn file yet.':'Slate reads every scene, template, script and config and lists each model, sound, texture and picture they point at.'}</div></div>${galNote}</div>`;
 const pills=`<div style="display:flex;flex-wrap:wrap;gap:5px">${pill('all','ALL',all.length,'')}${KINDS.map(x=>pill(x[0],x[1],cnt[x[0]]||0,x[2])).join('')}</div>`;
 const search=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="search" value="${esc(me.q||'')}" placeholder="search name, link or file… (enter searches every page)" onkeydown="event.stopPropagation();if(event.key==='Enter')${A({op:'q'}).replace(/\}\)$/,",q:this.value})")}" onkeyup="event.stopPropagation()" oninput="${SEARCHJS}" style="flex:1 1 220px;min-width:0;max-width:340px;background:${navy};border:1px solid ${line};color:${ink};padding:5px 8px;font-size:12px;border-radius:4px"><span class="as-shown" style="font-size:10.5px;color:${cyan}"></span>${q?`<button onclick="${A({op:'q',q:''})}" style="${btn}">✕ clear “${esc(q)}”</button>`:''}<span style="flex:1"></span><span style="font-size:10.5px;color:${dim}">${shown.length} of ${list.length}</span></div>`;
 const grid=`<div onclick="${GRIDJS}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${shown.map(card).join('')}</div>`;
 const more=list.length>shown.length?`<div style="text-align:center"><button onclick="${A({op:'more'})}" style="${btn};padding:6px 16px">show ${Math.min(PAGE,list.length-shown.length)} more · ${list.length-shown.length} left</button></div>`:'';
 const none=!list.length?`<div style="padding:20px;text-align:center;color:${dim};font-size:12px">nothing here${q?` matches “${esc(q)}”`:''}.</div>`:'';
 const V=player?.state?.slateView,vbar=V?.glb?`<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid ${accent};border-radius:6px;background:#12261c"><span style="font-size:11px;color:#9fd0ac">◎ in front of you: <b style="color:${ink}">${esc(V.name||'model')}</b></span><span style="flex:1"></span>${[['⏸',0],['slow',15],['spin',30],['fast',75]].map(([l,v])=>`<button onclick="${A({op:'v3dSpin',spin:v})}" style="${btn};${(V.spin??30)===v?`background:${accent};color:#fff`:''}">${l}</button>`).join('')}<button onclick="${A({op:'v3dTurn',by:-45})}" style="${btn}">⟲ 45°</button><button onclick="${A({op:'v3dTurn',by:45})}" style="${btn}">⟳ 45°</button><button onclick="${A({op:'v3d',u:''})}" style="${btn};border-color:${ember};color:${ember}">✕ close</button></div>`:'';
 return `${CSS}<div class="as-root" style="padding:12px;display:flex;flex-direction:column;gap:10px;color:${ink};max-width:1100px;margin:0 auto;box-sizing:border-box">${head}${vbar}${err}${pills}${search}${grid}${none}${more}${galNote}</div>`;
}
// ---------- 3D viewer: one turntable per editor, a metre and a half in front of their eyes ----------
const vidOf=p=>'slate-viewer-'+String(p.id).replace(/[^a-z0-9]/gi,'').slice(-24);
function getV(ctx,p){try{return ctx.getObject(vidOf(p));}catch(e){return null;}}
function view3d(ctx,p,u){
 const vid=vidOf(p),had=getV(ctx,p);u=u?String(u).replace(/[<>"\s]/g,'').slice(0,300):'';
 if(had){const same=had.state?.glb===u;ctx.destroy(vid);if(same||!u){p.state.slateView=null;return;}}
 if(!/^\/cdn\/value\.[0-9a-f]+\.glb/.test(u)){p.state.slateView=null;return;}
 const f=p.feetPosition||{x:0,y:0,z:0},r=p.rotation||{},yaw=typeof r==='number'?r*Math.PI/180:r.w!=null?Math.atan2(2*(r.w*r.y+r.x*r.z),1-2*(r.x*r.x+r.y*r.y)):(r.yaw??0)*Math.PI/180; // the body's facing; it turns with the look
 const fx=-Math.sin(yaw),fz=-Math.cos(yaw),D=1.8;
 const home={x:f.x,y:f.y,z:f.z};
 ctx.spawn(vid,{tags:['slate','slate-viewer'],visibleTo:'editors',scope:'session',
  feetPosition:{x:f.x+fx*D,y:f.y+0.75,z:f.z+fz*D},model:u,pivot:'center',castShadow:false,
  layout:{minExtents:{x:-0.45,y:0,z:-0.45},maxExtents:{x:0.45,y:0.9,z:0.45}},
  behavior:'scripts/slate-viewer.js',state:{glb:u,spin:30,yaw:0,pitch:0,owner:p.id,home},
  children:[{feetPosition:{x:0.8,y:1.2,z:1},light:{kind:'point',color:'#fff4ea',intensity:2.2,distance:4}},
   {feetPosition:{x:-0.9,y:0.6,z:0.6},light:{kind:'point',color:'#b9ccff',intensity:1,distance:4}},
   {feetPosition:{x:0,y:-0.02,z:0},primitive:{kind:'cylinder',radiusTop:0.55,radiusBottom:0.58,height:0.04,radialSegments:48},material:{color:'oklch(0.32 0.03 70)',roughness:0.6,metalness:0.2}}]});
 p.state.slateView={glb:u,spin:30,name:String((ctx.world.state.slateAppData?.[ID]?.items||[]).find(i=>i.u===u)?.name||'model').slice(0,60)};
 p.state.slateGodTucked=true;if(p.state.slate==='open')p.state.slate='tab'; // Slate tucks away so the model stands clear
}
export function op(ctx,player,d,plan){
 const st=player.state.slateApp_assets||{};
 if(d.op==='scan'){scan(ctx,plan);player.state.slateApp_assets={...st,pg:1};return false;}
 if(d.op==='kind'){const k=KINDS.some(x=>x[0]===d.k)?d.k:'all';player.state.slateApp_assets={...st,k,pg:1};return false;}
 if(d.op==='q'){player.state.slateApp_assets={...st,q:String(d.q||'').slice(0,80),pg:1};return false;}
 if(d.op==='v3d'){view3d(ctx,player,d.u);return false;}
 if(d.op==='v3dSpin'){const v=getV(ctx,player);if(v){v.state.spin=Math.max(-120,Math.min(120,+d.spin||0));player.state.slateView={...(player.state.slateView||{}),spin:v.state.spin};}return false;}
 if(d.op==='v3dTurn'){const v=getV(ctx,player);if(v){v.state.yaw=((v.state.yaw||0)+(+d.by||0))%360;}return false;}
 if(d.op==='more'){player.state.slateApp_assets={...st,pg:Math.min(20,(+st.pg||1)+1)};return false;}
 return false;
}
export function tile(ctx,player){
 const D=ctx?.world?.state?.slateAppData?.[ID];if(!D?.items?.length)return 'press scan';
 const c={};for(const it of D.items)c[it.kind]=(c[it.kind]||0)+1;
 return `${c.model||0} models · ${c.sound||0} sounds · ${(c.texture||0)+(c.image||0)} pictures`;
}
