import {toolsOp} from './tools.js';
import {seed as loomSeed} from './loom.js';
// STUDIO: the game's asset room. Its truth is files in the world (studio/assets/*.json, studio/concepts.json, docs/*.md, design.md);
// a sync copies them into world.state.studio so the tablet can draw them. Savi and her crew write the files; the tablet reads.
// world.state.studio = { at, docs:[{path,t,md}], concepts:[{name,url,group,at,prompt}], assets:[record] }
// Per player: state.studioView ('assets'|'concepts'|'docs'), state.studioOpen (asset id or doc path), state.studioFilter.
import {KILN_WORKFLOWS,KILN_LIMITS} from './kiln-default.js';
// a turnaround counts only when it was drawn from a concept or sourced refs, never from the model it guides
export function turnOk(t){const f=Array.isArray(t?.from)?t.from:[];return !!(t&&t.sheet&&(t.source==='reference'||t.source==='concept')&&f.length&&!f.some(x=>/proof|render|blockout|\.glb|model/i.test(String(x))));}
export const STEPS=['concept','turnaround','research','blockout','sculpt','retopo','bake','materials','lod','export','placed'];
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
export function syncStudio(ctx){
 const F=ctx.files,all=ctx.world.files||[],read=p=>{try{return F.read(p);}catch(e){return null;}};
 const json=p=>{const t=read(p);if(!t)return null;try{return JSON.parse(t);}catch(e){return null;}};
 const docs=all.filter(p=>/^docs\/.*\.md$/.test(p)||p==='design.md'||/^studio\/.*\.md$/.test(p)||/^art\/[^/]+\/[^/]+\.md$/.test(p)||p==='mods/slate/docs/DESIGN-SYSTEM.md').sort().map(p=>{const md=read(p)||'';const h=(md.match(/^#\s+(.+)$/m)||[])[1];return {path:p,t:clip(h||p.split('/').pop().replace(/\.md$/,''),80)};});
 const c=json('studio/concepts.json');const concepts=(Array.isArray(c)?c:c?.concepts||[]).filter(x=>x&&x.url).map(x=>({name:clip(x.name,80),url:clip(x.url,200),group:clip(x.group||'concept',30),at:clip(x.at,24),prompt:clip(x.prompt,400)}));
 const assets=all.filter(p=>/^studio\/assets\/.*\.json$/.test(p)).sort().map(p=>{const r=json(p);if(!r)return null;const m=r.model||{};return {file:p,id:r.id,title:r.title,status:r.status,room:r.room,wave:r.wave,tags:Array.isArray(r.tags)?r.tags:[],model:{glb:m.glb,tris:m.tris},render:Array.isArray(r.render)?r.render.slice(0,1):[],turnaround:r.turnaround?.sheet?{sheet:r.turnaround.sheet,ok:turnOk(r.turnaround)}:undefined,design:r.design?.concept?{concept:r.design.concept}:undefined};}).filter(Boolean); // the list rides the room; a whole receipt is read on open
 for(const w of [...KILN_WORKFLOWS,{id:'ENGINE-LIMITS',name:'Engine limits',md:KILN_LIMITS}]){const own='docs/kiln/'+w.id+'.md';if(docs.some(d=>d.path===own))continue;docs.push({path:'Kiln · '+w.name,t:'Kiln · '+w.name,kiln:w.id});}
 // every receipt's concept art and drawings join the Concepts tab, grouped by the piece (any workflow)
 for(const p of all.filter(p=>/^studio\/assets\/.*\.json$/.test(p))){const r=json(p);if(!r||!r.id)continue;const g=clip(r.title||r.id,30),pics=[[r.design?.concept,'concept'],[r.turnaround?.sheet,'turnaround'],[r.turnaround?.parts,'parts sheet'],...(Array.isArray(r.files)?r.files:[]).filter(f=>f&&['concept','drawing'].includes(f.kind)).map(f=>[f.url,f.t||f.kind])];
  for(const [u,n] of pics){if(!/^\/cdn\//.test(String(u||''))||concepts.some(c=>c.url===u))continue;concepts.push({name:clip(String(n).includes(g)?n:g+' · '+n,80),url:clip(u,200),group:g,at:clip(r.at||'',24),prompt:clip(r.brief||'',400),asset:clip(r.id,60)});}}
 ctx.world.state.studio={at:ctx.now(),docs,concepts,assets};
 try{fileAssets(ctx,all,json);}catch(e){ctx.log?.('slate: fileAssets failed',String(e));}
 syncTome(ctx);
 return {docs:docs.length,concepts:concepts.length,assets:assets.length};
}
// KILN → SLATE, for every workflow: a receipt in studio/assets/<id>.json is the one thing any pipeline writes (3D, textures, music, sfx,
// voices, 2D, in-game art, your own); this files it everywhere Slate looks: Workbench (the receipt itself), Gallery (every picture),
// Loom (one page per piece: brief, sounds, links, what's open) and Planner (a ticket that follows the status).
// Receipt: { id, title, pipeline, status, room, brief, design:{concept}, turnaround:{sheet,parts}, render:[url], files:[{url,kind,t}],
//   research:[{t,url}], model:{glb,tris}, open:[text], log }. files[].kind: concept|drawing|reference|render|output|photo (pictures → Gallery),
//   audio|video|doc|model (→ the Loom page as links). Idempotent: rows keyed by asset id and url; a card or page the creator changed stays theirs.
const LIVE=new Set(['landed','placed','in-game','shipped']);
const PIPE={'3d-assets':'3D','2d-assets':'2D','in-game-art':'Art',textures:'Texture',music:'Music','sound-effects':'SFX',voices:'Voice'};
const PICS=new Set(['concept','drawing','reference','render','output','photo']);
export function fileAssets(ctx,all,json){
 const recs=(all||ctx.world.files||[]).filter(p=>/^studio\/assets\/.*\.json$/.test(p)).map(p=>({p,r:json(p)})).filter(x=>x.r&&x.r.id);
 if(!recs.length)return 0;
 const plan=JSON.parse(JSON.stringify(ctx.world.state.plan||{cards:[],ms:[],tab:'board'}));plan.cards=plan.cards||[];plan.shots=plan.shots||[];
 const L0=ctx.world.state.loom,L=JSON.parse(JSON.stringify(L0||loomSeed()));L.pages=L.pages||[];L.chapters=L.chapters||[];
 let dirtyP=false,dirtyL=false;const now=ctx.now(),cdn=u=>/^\/cdn\//.test(String(u||''));
 for(const {p,r} of recs){
  const id=clip(r.id,60),title=clip(r.title||r.id,80),cid='c-asset-'+id,pid='p-asset-'+id,pipe=clip(r.pipeline||(r.model?.glb?'3d-assets':''),40),tag=PIPE[pipe]||'Kiln';
  const items=[];const add=(url,kind,t)=>{if(cdn(url)&&!items.some(x=>x.url===url))items.push({url:clip(url,240),kind,t:clip(t,100)});};
  add(r.placement?.look,'output',title+' · in game');add(r.design?.concept,'concept',title+' · concept');add(r.turnaround?.sheet,'drawing',title+' · turnaround');add(r.turnaround?.parts,'drawing',title+' · parts sheet');
  (Array.isArray(r.render)?r.render:[]).forEach((u,i)=>add(u,'render',title+' · proof '+(i+1)));
  (Array.isArray(r.files)?r.files:[]).forEach((f,i)=>f&&add(f.url,String(f.kind||'output'),f.t||title+' · '+(f.kind||'file')+' '+(i+1)));
  if(r.model?.glb)add(r.model.glb,'model',title+' · model');
  for(const x of items){if(!PICS.has(x.kind))continue;const sid='g-'+id+'-'+x.url.replace(/.*value\.([0-9a-f]{10}).*/,'$1');const had=plan.shots.find(s=>s.id===sid||s.url===x.url);
   if(had){if(!had.asset){had.asset=id;had.kind=had.kind||x.kind;dirtyP=true;}if(x.kind==='output'&&had.kind!=='output'&&had.by==='Kiln'){had.kind='output';had.title=x.t;dirtyP=true;}continue;}
   plan.shots.unshift({id:sid,url:x.url,at:now,by:'Kiln',place:r.placement?.place||'',kind:x.kind,asset:id,title:x.t,card:cid,loom:pid});dirtyP=true;}
  const best=items.find(x=>x.kind==='output')?.url||items.find(x=>x.kind==='render')?.url||items.find(x=>PICS.has(x.kind))?.url,gates=[r.limits?'Engine limits: '+(r.limits.ok?'ok':r.limits.waived?'waived ('+clip(r.limits.waived,120)+')':'over')+(r.limits.note?' · '+clip(r.limits.note,240):''):'',r.review?'Review: '+(r.review.pass?'pass':'fail')+(r.review.by?' by '+clip(r.review.by,40):'')+(r.review.note?' · '+clip(String(r.review.note).split('\n')[0],240):''):''].filter(Boolean).join('\n');
  const live=LIVE.has(r.status),col=live?'test':'doing',open=(Array.isArray(r.open)?r.open:[]).map(o=>'- '+clip(o,200)).join('\n');
  const note=tag+' · '+clip(r.status||'started',20)+(r.model?.tris?' · '+r.model.tris+' tris':'')+(r.model?.glb?'\nmodel: '+clip(r.model.glb,200):'')+(gates?'\n'+gates:'')+'\nreceipt: '+p+(r.log?'\nlog: '+clip(r.log,120):'')+(open?'\n\nStill open:\n'+open:'');
  let c=plan.cards.find(x=>x.id===cid);
  if(!c){plan.cards.push({id:cid,t:tag+': '+title,col,by:'Kiln',at:now,tag:'asset',note,auto:col,shot:best});dirtyP=true;}
  else{if(c.note!==note){c.note=note;dirtyP=true;}if(best&&(!c.shot||c.shotAuto)&&c.shot!==best){c.shot=best;c.shotAuto=true;dirtyP=true;}if(c.col===c.auto&&c.col!==col){c.col=col;c.auto=col;dirtyP=true;}}
  let ch=['assets','look'].find(k=>L.chapters.some(c=>c.id===k));if(!ch){L.chapters.push({id:'assets',name:'Assets'});ch='assets';dirtyL=true;}
  const links=items.filter(x=>!PICS.has(x.kind)).map(x=>'- ['+x.t+']('+x.url+')').join('\n'),pics=items.filter(x=>PICS.has(x.kind)&&x.kind!=='concept').map(x=>'!['+x.kind+']('+x.url+')').join('\n');
  const research=(Array.isArray(r.research)?r.research:[]).filter(x=>x&&/^https?:\/\//.test(String(x.url||x))).map(x=>'- ['+clip(x.t||x.title||x.url||x,80)+']('+clip(x.url||x,300)+')'+(x.usedFor?' · '+clip(x.usedFor,120):'')).join('\n');
  const body=[r.brief?clip(r.brief,600):'',[pipe?'Workflow: '+clip(pipe,40):'',r.status?'Status: '+clip(r.status,20):'',r.room?'Where: '+clip(r.room,120):'',r.model?.size?'Size: '+clip(r.model.size,60):''].filter(Boolean).join(' · '),
   r.wear?.level?'Wear: '+clip(r.wear.level,20)+(Array.isArray(r.wear.kinds)?' ('+r.wear.kinds.map(k=>clip(k,40)).join(', ')+')':''):'',gates,links?'Files:\n'+links:'',research?'Research:\n'+research:'',open?'Still open:\n'+open:'',pics,r.log?'Kiln log: '+clip(r.log,120):''].filter(Boolean).join('\n\n');
  const img=r.design?.concept||items.find(x=>PICS.has(x.kind))?.url||null;let pg=L.pages.find(x=>x.id===pid);
  if(!pg){L.pages.push({id:pid,ch,t:title,body,img,hero:false,feat:'',tix:[cid],by:'Kiln',kiln:true});dirtyL=true;}
  else if(pg.kiln&&(pg.body!==body||pg.img!==img)){pg.body=body;pg.img=img;dirtyL=true;}
 }
 if(dirtyP)ctx.world.state.plan=plan;if(dirtyL)ctx.world.state.loom=L;
 for(const pl of ctx.world.players||[]){const o=pl.state?.studioAsset;if(!o?.id)continue;const x=recs.find(z=>z.r.id===o.id);if(x&&JSON.stringify(x.r)!==JSON.stringify(o))pl.state.studioAsset=x.r;} // an open Workbench page shows the receipt as it is now
 return recs.length;
}
// THE SLATE GATE: the last gate of every workflow. Re-files, then checks one piece is in every app; pass = nothing missing.
export function slateGate(ctx,id){
 syncStudio(ctx);const miss=[],sid=String(id||'');let r=null;try{r=JSON.parse(ctx.files.read('studio/assets/'+sid+'.json')||'null');}catch(e){}
 if(!r)return {pass:false,missing:['receipt studio/assets/'+sid+'.json']};
 const pl=ctx.world.state.plan||{},L=ctx.world.state.loom||{},w=ctx.world.state.studio||{};
 if(!(w.assets||[]).some(a=>a.id===sid))miss.push('Workbench entry');
 const c=(pl.cards||[]).find(x=>x.id==='c-asset-'+sid);if(!c)miss.push('Planner ticket');else if(!['test','done'].includes(c.col))miss.push('Planner ticket still in '+c.col);
 if(!(L.pages||[]).some(x=>x.id==='p-asset-'+sid))miss.push('Loom page');
 const shots=(pl.shots||[]).filter(x=>x.asset===sid);if(!shots.length)miss.push('Gallery pictures');
 if(!['landed','placed','in-game','shipped'].includes(r.status))miss.push('receipt status is "'+(r.status||'none')+'", not landed');
 if(!r.pipeline)miss.push('receipt pipeline');
 if((r.pipeline==='3d-assets'||r.model?.glb)&&!(r.materials&&Object.keys(r.materials).length))miss.push('materials on the receipt (each slot with its maps)');
 if(!(r.design?.concept||(r.files||[]).some(f=>f?.kind==='concept')))miss.push('concept on the receipt');
 // closing gates (every workflow): engine limits, fresh-eyes review, in-game proof
 const F=Array.isArray(r.files)?r.files:[],lim=r.limits,rv=r.review,waived=lim&&typeof lim.waived==='string'&&lim.waived.trim()?lim.waived.trim():null;
 if(!lim||typeof lim!=='object')miss.push('engine limits: no limits on the receipt (limits: { ok, note } with the numbers)');
 else if(lim.ok!==true&&!waived)miss.push('engine limits not met: '+(lim.note||('limits.ok is '+lim.ok))+(lim.ok===false?' (only the creator can waive it: limits.waived = their words)':''));
 if(!rv||typeof rv!=='object')miss.push('fresh-eyes review: no review on the receipt (review: { pass, by, note })');
 else if(rv.pass!==true)miss.push('fresh-eyes review not passed'+(rv.by?' ('+rv.by+')':'')+': '+(rv.note||'no note'));
 else if(!rv.by)miss.push('fresh-eyes review names no reviewer (review.by)');
 const stepRows=Array.isArray(r.steps)?r.steps.map(x=>[x?.name||x?.step||x?.id||'?',x?.status??x?.result??x?.state??'']):(r.steps&&typeof r.steps==='object'?Object.entries(r.steps).map(([k,v])=>[k,typeof v==='object'&&v?(v.status??v.result??''):v]):[]);
 const failed=stepRows.filter(([,v])=>/^\s*fail/i.test(String(v||'')));
 if(failed.length)miss.push('failed steps: '+failed.map(([k,v])=>k+' ('+String(v).replace(/^\s*fail(ed)?:?\s*/i,'')+')').join('; ')+'. Fix and re-run each step; a failed step never passes the gate');
 const hasConcept=!!(r.design?.concept||F.some(f=>f?.kind==='concept')||r.turnaround?.from?.length),cm=r.conceptMatch;
 if(hasConcept&&!/^(music|sound-effects|voices)$/.test(String(r.pipeline||''))){
  if(!cm||typeof cm!=='object')miss.push('concept match: no conceptMatch on the receipt (a reviewer, not the builder, ticks five or more of the concept\'s features against a render at its angle)');
  else{const fs=Array.isArray(cm.features)?cm.features:[];if(!cm.by)miss.push('concept match names no reviewer');if(!cm.render)miss.push('concept match has no side-by-side render');if(fs.length<5)miss.push('concept match lists '+fs.length+' features, needs 5 or more');const off=fs.filter(f=>f?.match!==true);if(off.length)miss.push('concept match misses: '+off.map(f=>f.name).join(', '));}}
 const sound=/^(music|sound-effects|voices)$/.test(String(r.pipeline||''))||(!r.model?.glb&&F.some(f=>f?.kind==='audio')&&!r.placement?.look);
 if(sound){if(!(F.some(f=>f?.kind==='audio'&&f.url)&&r.placement&&(r.placement.id||r.placement.position)))miss.push('in-game proof: the sound file (files kind audio) and placement (its real source in the game)');}
 else if(!r.placement?.look)miss.push("in-game proof: placement.look (a look in the game at the place's real hour)");
 return {pass:!miss.length,missing:miss,ticket:c?.col,gallery:shots.length,limits:lim?{ok:lim.ok===true,waived:!!waived}:null,review:rv?{pass:rv.pass===true,by:rv.by||null}:null,conceptMatch:cm?{by:cm.by||null,features:(cm.features||[]).length,misses:(cm.features||[]).filter(f=>f?.match!==true).length}:null};
}
function loadAsset(ctx,p,id){const a=(ctx.world.state.studio?.assets||[]).find(x=>x.id===id);p.state.studioAsset=null;if(!a?.file)return;try{const t=ctx.files.read(a.file);if(t&&t.length<120000)p.state.studioAsset=JSON.parse(t);}catch(e){}}
function getView(ctx,id){try{return ctx.getObject(id);}catch(e){return null;}}
export function studioOp(ctx,p,d){
 const op=d.op;
 if(/^tool[A-Z]/.test(String(op))){toolsOp(ctx,p,d);return;}
 if(op==='view'){p.state.studioView=['assets','concepts','docs'].includes(d.v)?d.v:'assets';p.state.studioOpen=null;return;}
 if(op==='open'){p.state.studioOpen=d.id?clip(d.id,120):null;if(d.v)p.state.studioView=d.v;p.state.studioDoc=null;if(d.id&&d.v==='docs'){const id=String(d.id);let md=null;if(id.startsWith('Kiln · ')){const w=[...KILN_WORKFLOWS,{id:'ENGINE-LIMITS',name:'Engine limits',md:KILN_LIMITS}].find(w=>'Kiln · '+w.name===id);md=w?.md;}else if((ctx.world.files||[]).includes(id)){try{md=ctx.files.read(id);}catch(e){}}p.state.studioDoc={path:clip(id,120),md:clip(md||'(empty)',60000)};}if(d.id&&d.v!=='docs')loadAsset(ctx,p,String(d.id));return;} // a doc's text rides the opener's own state, read on open
 if(op==='m3d'){ // the final-model viewer: one turntable per player, at their camera; m3d with no glb closes it
  const vid='slate-viewer-'+String(p.id).replace(/[^a-z0-9]/gi,'').slice(-24), had=getView(ctx,vid);
  const glb=d.glb?String(d.glb).replace(/[<>"\s]/g,'').slice(0,300):null;
  if(!glb||!/^\/cdn\/value\.[0-9a-f]+\.glb/.test(glb)){if(had)ctx.destroy(vid);p.state.slateView=null;return;}
  if(had&&had.state?.glb===glb&&d.spin==null){ctx.destroy(vid);p.state.slateView=null;return;}
  if(had&&had.state?.glb===glb){had.state.spin=+d.spin||0;if(d.pitch!=null)had.state.pitch=Math.max(-60,Math.min(60,+d.pitch||0));p.state.slateView={glb,spin:had.state.spin,pitch:had.state.pitch||0};return;}
  if(had)ctx.destroy(vid);
  ctx.spawn(vid,{tags:['slate','slate-viewer'],visibleTo:'editors',scope:'session',feetPosition:{x:0.3,y:1.15,z:-5.75},
   model:glb,pivot:'center',castShadow:false,
   behavior:'scripts/slate-viewer.js',state:{glb,spin:30,yaw:0,pitch:0,fit:false},
   children:[{feetPosition:{x:0.35,y:0.45,z:0.6},light:{kind:'point',color:'#fff4ea',intensity:0.7,distance:3}},
    {feetPosition:{x:-0.45,y:0.1,z:0.3},light:{kind:'point',color:'#b9ccff',intensity:0.3,distance:3}}]});
  p.state.slateView={glb,spin:30,pitch:0};return;}
 if(op==='lb'){const u=d.u?String(d.u).replace(/[<>"]/g,'').slice(0,600):null;p.state.slateLb=u&&/^(\/cdn\/|https?:\/\/)/.test(u)?{u,t:clip(d.t,160)}:null;return;} // lightbox: a picture or link held open over Slate
 if(op==='filter'){p.state.studioFilter=d.f?clip(d.f,30):null;return;}
 if(op==='sync'){syncStudio(ctx);return;}
 if(op==='set'){p.state.tomeSet=d.id?clip(d.id,60):null;p.state.tomePick=null;p.state.tomeEdit=null;return;}
 if(op==='gameSub'){p.state.slateGameSub=['diary','board','studio'].includes(d.sub)?d.sub:null;return;} // the GAME app's open sub-app
 if(op==='game'){p.state.tomeGame=d.slug?clip(d.slug,80):null;return;} // STUDIO: the game a box tap opened in the GAME app
 if(op==='edit'){p.state.tomeEdit=d.on?true:null;if(d.tab)p.state.tomeTab=clip(d.tab,12);return;} // STUDIO: the set's editor open, and its tab
 if(op==='pick'){p.state.tomePick=d.id?clip(d.id,60):null;if(d.id)p.state.tomeSet=null;else if(d.back)p.state.tomeSet=clip(d.back,60);return;} // STUDIO: the box set pulled off the shelf
 if(String(op).startsWith('set'))return setOp(ctx,p,d);
}
// BOX SETS: the creator organises them on the tablet. Truth is studio/tome.json .sets, mirrored to world.state.tome.sets.
// set = { id, name, tag, games:[slug], cover?, options?:[url], design?:{ mode:'art'|'compose', bg, emblem, color, font }, paintAsked?, paintPrompt? }
export const EMBLEMS=['✦','☾','✺','❂','◈','❖','✧','☄','⚘','♜','⚔','☀'];
export const COLORS=['#f0d9a6','#ecdec3','#7ce0ce','#ab88ed','#d06e65','#c29c62','#9fd36a'];
export const FONTS={serif:"Georgia,'Cormorant Garamond',serif",display:"'Arial Black',Impact,sans-serif",script:"'Brush Script MT','Segoe Script',cursive",mono:"'Courier New',monospace"};
function setOp(ctx,p,d){
 if(!p?.isEditor)return;
 const sig=JSON.stringify(d),lp=ctx.session.setPress;if(lp&&lp.sig===sig&&ctx.now()-lp.at<400)return;ctx.session.setPress={sig,at:ctx.now()};
 let file=null;try{file=JSON.parse(ctx.files.read('studio/tome.json')||'null');}catch(e){}
 if(!file?.shelves)return;
 const sets=Array.isArray(file.sets)?file.sets:(file.sets=[]);
 const slugs=new Set([...(file.shelves.published||[]),...(file.shelves.unlisted||[])].map(g=>g.slug));
 const S=sets.find(x=>x.id===d.id),slug=clip(d.slug,80),op=d.op;
 if(op==='setNew'){const id='set-'+Math.floor(ctx.now()).toString(36);sets.push({id,name:'New Box Set',tag:'',games:slugs.has(slug)?[slug]:[],design:{mode:'compose',emblem:'✦',color:'#f0d9a6',font:'serif',bg:slugs.has(slug)?slug:null}});if(slugs.has(slug))p.state.tomeSet=id;else{p.state.tomePick=id;p.state.tomeSet=null;}}
 else if(!S)return;
 else if(op==='setAdd'){if(slugs.has(slug)&&!S.games.includes(slug))S.games.push(slug);}
 else if(op==='setDel'){S.games=S.games.filter(g=>g!==slug);}
 else if(op==='setMove'){const b=clip(d.before,80);if(!S.games.includes(slug)||slug===b)return;S.games=S.games.filter(g=>g!==slug);const i=S.games.indexOf(b);S.games.splice(i<0?S.games.length:i,0,slug);}
 else if(op==='setMeta'){if(d.name!=null)S.name=clip(d.name,40)||'Untitled Set';if(d.tag!=null)S.tag=clip(d.tag,60);}
 else if(op==='setDesign'){const g=S.design||{};const n={...g,mode:'compose'};if(d.emblem!=null)n.emblem=EMBLEMS.includes(d.emblem)?d.emblem:'';if(d.color&&/^#[0-9a-fA-F]{6}$/.test(d.color))n.color=d.color.toLowerCase();if(d.font&&FONTS[d.font])n.font=d.font;if(d.bg!==undefined)n.bg=d.bg?clip(d.bg,200):null;S.design=n;}
 else if(op==='setCover'){const u=clip(d.url,200);if(!/^\/cdn\//.test(u))return;S.cover=u;S.design={...(S.design||{}),mode:'art'};}
 else if(op==='setPaint'){const pr=clip(d.prompt,400)||`a cover in the spirit of its games (${S.games.join(', ')}), one striking scene`;if(S.paintAsked&&ctx.now()-S.paintAsked<60000)return;S.paintAsked=ctx.now();S.paintPrompt=pr;
  try{ctx.notifyDm(`STUDIO box set cover from ${p.displayName||'the creator'}: paint 4 vertical slipcase covers (no text on the art) for the box set "${S.name}" (id ${S.id}, games: ${S.games.join(', ')}). Their brief: "${pr}". Write the four /cdn/ urls to studio/tome.json sets[id=${S.id}].options, delete paintAsked, then syncTome.`,{wake:true});}catch(e){}}
 else if(op==='setRemove'){file.sets=sets.filter(x=>x!==S);p.state.tomeSet=null;}
 file.at=file.at||null;
 ctx.files.write('studio/tome.json',JSON.stringify(file,null,1));
 const prev=ctx.world.state.tome||{};ctx.world.state.tome={...prev,sets:file.sets,at:ctx.now()};
}

// TOME's shelves: studio/tome.json (Savi writes it from the platform shelf) -> world.state.tome
export function syncTome(ctx){let t=null;try{t=JSON.parse(ctx.files.read('studio/tome.json')||'null');}catch(e){}if(!t?.shelves)return false;const prev=ctx.world.state.tome||{};ctx.world.state.tome={...prev,shelves:t.shelves,sets:Array.isArray(t.sets)?t.sets:[],shotAt:t.at||null,at:ctx.now()};return true;}
// wake Savi to re-snapshot the shelf: on the ⟳ press, or when an editor opens TOME and the snapshot is a day old. At most once an hour.
export function askTome(ctx,p,force){
 if(!p?.isEditor)return false;const T=ctx.world.state.tome||{},now=ctx.now();
 const age=T.shotAt?now-Date.parse(T.shotAt):Infinity;
 if(!force&&age<86400000)return false;if(T.askedAt&&now-T.askedAt<3600000)return false;
 ctx.world.state.tome={...T,askedAt:now};
 try{ctx.notifyDm(`TOME refresh: ${p.displayName||'the creator'} wants their Slate shelves updated. Run \`spawn shelf --mods\`, rewrite studio/tome.json (published/unlisted/mods, this game here:true; keep existing cover fields). Covers: for each game with no cover, read its page https://spawn.co/@<handle>/<slug> HTML and take the spawnfile.io URL containing "box-art-" (the printed box front); \`spawn fetch\` it and set cover:"/cdn/…", coverKind:"box". No printed box (unlisted/draft): use the page's seo-thumbnail as coverKind:"page". Then syncTome.`,{wake:true});}catch(e){}
 return true;}
