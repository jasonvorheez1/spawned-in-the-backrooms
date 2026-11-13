import {SECTIONS} from './settings.js';
import {navigate,capture,record} from './wayfinding.js';
import {reconcileContext,manualParent} from './auto-context.js';
export {pollContext} from './auto-context.js';
import {ticketNotesOp} from './ticket-notes.js';
import {issue,canParent} from './plan-tree.js';
import {APP_OF,markSeen,idsOf} from './seen.js';
import {addShot,galOp} from './gallery.js';
import {loomOp} from './loom.js';
import {worldScan} from './worldscan.js';
import {kilnLoad} from './kiln.js';
import {fillOp} from './fill.js';
import {studioOp,syncTome,askTome,syncStudio} from './studio.js';

// Slate: the planning tablet's one shared row. one row, world.state.plan = { cards:[{id,t,col,ms,tag,note,at,place}], ms:[{id,name,goal}], tab }
import {COLS,TAGS,PRI,applyCfg,cfgOp} from './board-cfg.js';
import {sprintOp,stampSprints} from './sprint.js';
import {addonOp,settleAsks} from './addons.js';
import {appOp} from './apps/index.js';
export {COLS,TAGS};
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n).trim();
export const KEYS=['planAdd','planMove','planDel','planEdit','planMs','planMsDel','planTab','planAsk','planNote','planNoteDel','planOrb','planPocket','planShot','planOpen','planRel','planRelDel','planRn','planEpicRel','planWorld','planLoom','planGal','planStudio','planFlow','planSprint','planAddon','planApp'];
// A card another hand wrote (a script, Savi, an old version) may carry title/name instead of t, a missing col, or no id; every reader sees the healed shape.
export function normCard(c,i){if(!c||typeof c!=='object')c={t:String(c??'')};const t=c.t??c.title??c.name??c.text;const o={...c,t:typeof t==='string'&&t.trim()?t:String(t??'untitled')||'untitled'};if(!COLS.includes(o.col))o.col=COLS.includes('todo')?'todo':COLS[0];if(!o.id)o.id='tkt-n'+i;if(o.tag&&!TAGS.includes(o.tag))o.tag=TAGS.includes('note')?'note':TAGS[0];delete o.title;return o;}
export function normPlan(pl){const p=pl&&typeof pl==='object'?pl:{cards:[],ms:[],tab:'board'};applyCfg(p);/* starbloom: an old ordinal 'made' (creation counter) is not a time; drop it so age reads off the id */const cs=Array.isArray(p.cards)?p.cards.map(normCard):[];for(const c of cs)if(c.made!==undefined&&!(+c.made>1e12))delete c.made;return {...p,cards:cs,ms:Array.isArray(p.ms)?p.ms.filter(Boolean):[],rel:Array.isArray(p.rel)?p.rel.filter(Boolean):[],projects:Array.isArray(p.projects)?p.projects.filter(Boolean):[]};}
// psypher5 10-16 (MOG, Raceway) "make slate seperate for builders too so screens dont change randomly": the open screen is each builder's own (player.state.slateTab).
// The reducer below still reads and writes plan.tab; handle() lends it the presser's screen and hands the world's row back untouched.
export function handle(ctx,p,pressed,data){
 if(pressed.planTab&&(data.planTab?.route||data.planTab?.op==='back')){const sig=JSON.stringify(data.planTab),at=ctx.now(),last=ctx.session.slateRoutePress;if(last&&last.player===p.id&&last.sig===sig&&at-last.at<150)return true;ctx.session.slateRoutePress={player:p.id,sig,at};return navigate(ctx,p,data.planTab);}
 const before=capture(p,ctx);
 // Settings navigation and pocket state are personal; do not normalise or reconcile content.
 if(pressed.planLoom&&(['settingsPage','tabPosition'].includes(data.planLoom?.op)||/^theme(?!World)/.test(String(data.planLoom?.op)))){if(p.isEditor)loomOp(ctx,p,data.planLoom);record(p,before,capture(p,ctx));return true;}
 if(pressed.planTab&&['settings','world'].includes(data.planTab?.tab)){if(!p.isEditor)return false;p.state.slateTab='settings';p.state.planOpen=null;const section=data.planTab.tab==='world'?'ENVIRONMENT':data.planTab.section;if(SECTIONS.includes(section))p.state.slateSettingsPage=section;record(p,before,capture(p,ctx));return true;}
 if(pressed.planPocket){if(!p.isEditor)return false;const d=data.planPocket||{};if(['phone','tablet'].includes(d.size))p.state.slateSize=d.size;if(d.mode==='open'&&p.state.slate!=='open'&&d.home!==false){p.state.slateTab='home';p.state.planOpen=null;delete p.state.slateDraft;}p.state.slate=['tab','orb','open'].includes(d.mode)?d.mode:'tab';if(p.camera)p.camera.pointerLock=p.state.slate!=='open';record(p,before,capture(p,ctx));return true;}
 const r=handlePersonal(ctx,p,pressed,data);if(!ctx.session?.slateNavBatch)record(p,before,capture(p,ctx));return r;
}
function handlePersonal(ctx,p,pressed,data){
 if(pressed.planOpen)return handle0(ctx,p,pressed,data);
 const S=ctx.world.state,had=S.plan&&typeof S.plan==='object',base=had?S.plan.tab:undefined,mine=p.state.slateTab||base;
 if(had&&mine!==base)S.plan.tab=mine;
 let r;try{r=handle0(ctx,p,pressed,data);}finally{const pl=S.plan;if(pl&&typeof pl==='object'){const now=pl.tab;if(now!==undefined&&now!==mine)p.state.slateTab=now;else if(!p.state.slateTab&&now)p.state.slateTab=now;if(base!==undefined&&now!==base)S.plan.tab=base;}}
 // Context is data, never a render side effect. Re-read after the reducer; Loom may save on an early return.
 const key=KEYS.find(k=>pressed[k]),d=data[key]||{};
 const relevant=key==='planEdit'&&!String(d.op||'').startsWith('ticketNote')||['planAdd','planShot','planGal','planRn','planMs','planMsDel','planDel','planNote','planNoteDel'].includes(key)||key==='planFlow'&&!!d.quick||key==='planLoom'&&!['open','noteOpen','flowSel','flowLane','view','chOpen','search','ask'].includes(d.op);
 if(relevant&&ctx.world.state.plan?.cards){const pl=JSON.parse(JSON.stringify(ctx.world.state.plan));const result=reconcileContext(pl,ctx.world.state.loom||{});if(result.changed)ctx.world.state.plan=pl;}
 return r;
}
function handle0(ctx,p,pressed,data){
 const k=KEYS.find(k=>pressed[k]);if(!k)return false;
 if(k==='planOpen'){const d=data[k]||{};p.state.planOpen=d.id&&(issue(ctx.world.state.plan||{},String(d.id))||p.state.slateBlank?.id===d.id)?String(d.id):null;if(p.state.slateBlank&&p.state.slateBlank.id!==p.state.planOpen)delete p.state.slateBlank;delete p.state.slateDraft;return true;}
 const d=data[k]||{};
 if(k==='planEdit'&&typeof d.op==='string'&&d.op.startsWith('ticketNote')){ticketNotesOp(ctx,p,d,()=>Math.floor(ctx.now()).toString(36)+Math.floor(ctx.random()*1e6).toString(36));return true;}
 if(k==='planStudio'||k==='planApp'||!ctx.world.state.studio){try{if(!ctx.world.state.studio)syncStudio(ctx);}catch(e){}}if(k==='planTab'&&['studio','tome','gallery','board','diary','kiln','home'].includes(d?.tab)&&ctx.now()-(ctx.world.state.studio?.at||0)>15000){try{syncStudio(ctx);}catch(e){}}/* opening an app re-files Kiln receipts, at most every 15 s */if(k==='planStudio'){studioOp(ctx,p,d);return true;}const plan=normPlan(JSON.parse(JSON.stringify(ctx.world.state.plan||{cards:[],ms:[],tab:'board'})));
 // one press can reach the walking body and the god seat both: the second copy of the same press inside a second is dropped
 {const sig=k+'|'+JSON.stringify(d),lp=ctx.session.slatePress;if(lp&&lp.sig===sig&&ctx.now()-lp.at<150)return true;ctx.session.slatePress={sig,at:ctx.now()};}
 const id=()=>Math.floor(ctx.now()).toString(36)+Math.floor(ctx.random()*1e4).toString(36);
 // A blank form belongs to its author until they add something or explicitly use it.
 const before=new Map(plan.cards.map(c=>[c.id,c.col]));const bs=new Map(plan.cards.map(c=>[c.id,c.sprint]));{const q=(plan.projects||[]).find(x=>x.id===p.state.planProj);if(q&&q.kind==='sprint-old')p.state.planProj='';}const msB=new Set(plan.ms.map(m=>m.id)),relB=new Set((plan.rel||[]).map(r=>r.id));
 const blank=p.state.slateBlank;
 if(blank&&d.id===blank.id&&(k==='planAsk'||k==='planEdit'&&(d.keep||clip(d.t,120)||clip(d.note,1200)||clip(d.accept,800)||d.shot||d.col&&d.col!==blank.col||d.tag&&d.tag!==blank.tag||d.ms))){plan.cards.push({...blank,t:clip(d.t,120)||'new ticket'});delete p.state.slateBlank;}
 if(blank&&(k==='planOpen'&&d.id!==blank.id||k==='planTab'||k==='planDel'&&d.id===blank.id||k==='planPocket'&&d.mode!=='open'))delete p.state.slateBlank;
 if(k==='planPocket'){if(['phone','tablet'].includes(d.size))p.state.slateSize=d.size;if(d.mode==='open'&&p.state.slate!=='open'&&d.home!==false){ctx.world.state.plan={...plan,tab:'home'};p.state.planOpen=null;delete p.state.slateDraft;}p.state.slate=['tab','orb','open'].includes(d.mode)?d.mode:'tab';if(p.camera)p.camera.pointerLock=p.state.slate!=='open';return true;}
 if(k==='planOrb'){const n=(v,a,b,f)=>Math.max(a,Math.min(b,Number.isFinite(+v)?Math.round(+v):f));plan.orb={x:n(d.x,2,96,3),y:n(d.y,4,94,50)};}
 
 if(k==='planShot'){const u=String(d.url||'');const to=d.to&&plan.cards.find(c=>c.id===d.to);if(to&&u.startsWith('/cdn/')){to.shot=u;delete to.ink;delete to.marked;p.state.planOpen=to.id;p.state.slateFiled={id:to.id,at:ctx.now()};if(plan.tab==='cam')plan.tab='board';}else if(u.startsWith('/cdn/')&&!d.ticket){addShot(ctx,p,plan,id,u);}else if(u.startsWith('/cdn/')){const f=p.feetPosition||{},c={id:id(),t:clip(d.t,120)||'Snapshot '+new Date(ctx.now()).toISOString().slice(11,16),col:'todo',ms:'',tag:TAGS.includes(d.tag)?d.tag:'bug',by:p.displayName,place:ctx.place?.id||'',shot:u,at:{x:Math.round(f.x*10)/10,y:Math.round(f.y*10)/10,z:Math.round(f.z*10)/10}};plan.cards.push(c);p.state.planOpen=c.id;p.state.slateFiled={id:c.id,at:ctx.now()};p.state.slateDraft=c.id;p.state.slate='open';if(p.camera)p.camera.pointerLock=false;if(plan.tab==='cam')plan.tab='board';}}
 if(k==='planShot'){const u=String(d.url||''),c=u.startsWith('/cdn/')&&!(plan.shots||[]).some(s=>s.url===u)&&plan.cards.find(c=>c.shot===u);if(c){const f=p.feetPosition||{},r=v=>Math.round((v||0)*10)/10;plan.shots=[{id:id(),url:u,at:ctx.now(),by:p.displayName,place:ctx.place?.id||'',pos:{x:r(f.x),y:r(f.y),z:r(f.z)},card:c.id},...(plan.shots||[])];}} // a ticket's snap is in the gallery too
 if(k==='planAddon'){const ok=addonOp(ctx,p,d,plan);if(ok){ctx.world.state.plan=plan;}return true;}
 if(k==='planApp'){const ch=appOp(ctx,p,d,plan);if(ch){ctx.world.state.plan=plan;}return true;}
 if(k==='planTab'&&/^ao-/.test(String(d.tab||''))){addonOp(ctx,p,{op:'open',id:String(d.tab).slice(3)},plan);ctx.world.state.plan=plan;return true;}
 if(k==='planTab'){if(d.tab==='tome'&&!d.studio&&!d.refresh){d.tab='game';d.studio='active';d.here=true;}if(['active','published','drafts','mods','tools','savi'].includes(d.studio))p.state.studioTab=d.studio;if(d.here)p.state.tomeGame=null;if(d.tab==='addons')p.state.slateAddon=null;
 p.state.planOpen=null;
 const section=d.tab==='world'?'ENVIRONMENT':d.section;
 if((d.tab==='settings'||d.tab==='world')&&['ENVIRONMENT','GAME RULES','ARCHIVE','ABOUT SLATE','SHORTCUTS','PLAY-MODE ORB','CAMERA','NOTIFICATIONS'].includes(section))p.state.slateSettingsOpen=[...new Set([...(p.state.slateSettingsOpen||[]).map(x=>x==='WORLD RULES'?'GAME RULES':x),section])];
if(d.tab==='tome'){syncTome(ctx);askTome(ctx,p,!!d.refresh);}if(d.tab==='kiln')kilnLoad(ctx);const a=APP_OF[d.tab];if(a){const L=ctx.world.state.loom,was=new Set(p.state.slateSeen?.[a]||[]);p.state.slateFresh=p.state.slateSeen?.[a]?{app:a,ids:idsOf(a,plan,L).filter(i=>!was.has(i)).slice(-60)}:null;markSeen(p,[a],plan,L);}}if(k==='planWorld'){const W={hour:['timeOfDay',0,24],fogNear:['fog.near',0,2000],fogFar:['fog.far',100,4000],wind:['wind.speed',0,30]};const PK=d.place||ctx.place?.id||'main';const pl=ctx.world.places[PK];if(pl){const set=()=>{if(d.key==='keepAll'){const a=pl.atmosphere;pl.atmosphere={...a,fog:{...(a.fog||{})},wind:{...(a.wind||{})}};return;}if(d.key==='reset'){const b=plan.worldBase&&plan.worldBase[PK];if(b)for(const kk in W){const w=W[kk],pa=w[0].split('.');if(b[kk]===undefined)continue;if(pa.length>1)pl.atmosphere[pa[0]]={...(pl.atmosphere[pa[0]]||{}),[pa[1]]:b[kk]};else pl.atmosphere[pa[0]]=b[kk];}return;}const w=W[d.key];if(!w)return;const v=Math.max(w[1],Math.min(w[2],+d.value||0)),pa=w[0].split('.');if(pa.length>1)pl.atmosphere[pa[0]]={...(pl.atmosphere[pa[0]]||{}),[pa[1]]:v};else pl.atmosphere[pa[0]]=v;};if(d.keep){ctx.commit('slate: keep this place’s environment as the default',set);}else set();}}if(k==='planTab')plan.tab=d.tab==='world'?'settings':['board','miles','balance','diary','cam','crowd','game','world','home','selfie','gallery','settings','archive','studio','tome','kiln','sprints','addons'].includes(d.tab)||/^app-[a-z0-9-]{1,40}$/.test(String(d.tab||''))?d.tab:'board';
 if(k==='planNote'){const t=clip(d.text,1200)||(d.shot?'📷':'');if(t){plan.diary=plan.diary||[];plan.diary.unshift({id:id(),date:clip(d.date,10),t,by:p.displayName,...(['spark','question','ref','savi','decided'].includes(d.kind)?{kind:d.kind}:{}),...(/^\d\d:\d\d$/.test(String(d.time||''))?{time:d.time}:{}),...(typeof d.shot==='string'&&/^(\/cdn\/|https:\/\/[\w.-]+\.spawnfile\.io\/)/.test(d.shot)?{shot:clip(d.shot,400)}:{})});if(d.shot&&plan.tab==='selfie')plan.tab='diary';}}
 if(k==='planNoteDel')plan.diary=(plan.diary||[]).filter(e=>e.id!==d.id);
 if(k==='planAdd'&&d.blank){const f=p.feetPosition||{},nid=id();p.state.slateBlank={id:nid,t:'',col:'todo',ms:'',tag:'feature',by:p.displayName,place:ctx.place?.id||'',at:{x:Math.round(f.x*10)/10,y:Math.round(f.y*10)/10,z:Math.round(f.z*10)/10}};plan.tab='board';p.state.planOpen=nid;delete p.state.slateDraft;}
if(k==='planAdd'){const t=clip(d.t,120);if(t){const f=p.feetPosition||{};const par=issue(plan,d.parent),row={id:id(),t,col:COLS.includes(d.col)?d.col:'todo',ms:par?.ms||clip(d.ms,40),tag:TAGS.includes(d.tag)?d.tag:'feature',by:p.displayName,place:ctx.place?.id||'',at:d.here?{x:Math.round(f.x*10)/10,y:Math.round(f.y*10)/10,z:Math.round(f.z*10)/10}:null};if(par){if(!par.epicId){row.parent=par.id;manualParent(row,par.id);}if(par.proj)row.proj=par.proj;if(par.sprint)row.sprint=par.sprint;}else if(d.parent==='')manualParent(row,'');plan.cards.push(row);}}
 if(k==='planMove'){const c=plan.cards.find(c=>c.id===d.id);if(c){if(COLS.includes(d.col)){c.col=d.col;if(d.before!==undefined&&d.before!==c.id){plan.cards=plan.cards.filter(x=>x!==c);const j=plan.cards.findIndex(x=>x.id===d.before);if(j<0)plan.cards.push(c);else plan.cards.splice(j,0,c);}}else{const i=COLS.indexOf(c.col)+(d.dir|0);if(COLS[i])c.col=COLS[i];}}}
 if(k==='planEdit'){const c=plan.cards.find(c=>c.id===d.id);if(c){if(TAGS.includes(d.tag))c.tag=d.tag;if(d.ms!==undefined)c.ms=clip(d.ms,40);if(d.parent!==undefined&&(!d.parent||canParent(plan,c.id,d.parent))){if(!d.parent)delete c.parent;else c.parent=d.parent;manualParent(c,d.parent);}if(d.flow!==undefined)c.flow=clip(d.flow,120);if(d.note!==undefined)c.note=String(d.note);if(d.t!==undefined&&clip(d.t,120))c.t=clip(d.t,120);if(d.accept!==undefined)c.accept=String(d.accept);if(typeof d.marked==='string'){if(d.marked.startsWith('/cdn/'))c.marked=d.marked;else if(d.marked==='')delete c.marked;}if(typeof d.shot==='string'&&(d.shot===''||d.shot.startsWith('/cdn/')))c.shot=d.shot;if(Array.isArray(d.ink))c.ink=d.ink.slice(0,60).map(st=>({c:clip(st.c,9)||'#ff3b3b',p:(Array.isArray(st.p)?st.p:[]).slice(0,400).map(v=>Math.round(Math.max(0,Math.min(1,+v||0))*1000)/1000)}));if(d.col&&COLS.includes(d.col))c.col=d.col;if(d.proj!==undefined&&(d.proj===''||(plan.projects||[]).some(q=>q.id===d.proj)))c.proj=d.proj;}}
 if(k==='planDel'){plan.cards=plan.cards.filter(c=>c.id!==d.id);if(p.state.slateDraft===d.id)delete p.state.slateDraft;}
 if(k==='planMs'){const name=clip(d.name,40);if(name&&!plan.ms.some(m=>m.name===name))plan.ms.push({id:id(),name,goal:clip(d.goal,160)});}
 if(k==='planMsDel')plan.ms=plan.ms.filter(m=>m.id!==d.id);
 plan.rel=plan.rel||[];
 if(k==='planMs'&&d.rel){const m=plan.ms.find(m=>m.name===clip(d.name,40));if(m)m.rel=String(d.rel).slice(0,40);}
 if(k==='planRel'){const name=clip(d.name,40);if(name&&!plan.rel.some(r=>r.name===name))plan.rel.push({id:id(),name,goal:clip(d.goal,160)});}
 if(k==='planRelDel'){plan.rel=plan.rel.filter(r=>r.id!==d.id);for(const m of plan.ms)if(m.rel===d.id)delete m.rel;}
 if(k==='planEpicRel'){const m=plan.ms.find(m=>m.id===d.id);if(m){if(plan.rel.some(r=>r.id===d.rel))m.rel=d.rel;else delete m.rel;}}
 if(k==='planRn'){const list=d.kind==='rel'?plan.rel:plan.ms,m=list.find(m=>m.id===d.id);if(m){if(d.name!==undefined){const n=clip(d.name,40);if(n&&!list.some(o=>o!==m&&o.name===n)){if(d.kind!=='rel')for(const c of plan.cards)if(c.ms===m.name)c.ms=n;m.name=n;}}if(d.goal!==undefined)m.goal=String(d.goal);if(d.kind!=='rel'){if(d.note!==undefined)m.note=String(d.note);if(d.accept!==undefined)m.accept=String(d.accept);if(d.proj!==undefined&&(d.proj===''||plan.projects.some(q=>q.id===d.proj)))m.proj=d.proj;}}}
 if(k==='planGal'){if(!galOp(ctx,p,d,plan,id))return true;}
 if(k==='planSprint'){const r=sprintOp(ctx,p,d,plan,id);if(!r)return true;if(r==='commit'){if(ctx.commit)ctx.commit('Slate: sprints from the S1..S7 projects',()=>{ctx.world.state.plan=plan;});else ctx.world.state.plan=plan;return true;}}
 if(k==='planLoom'&&d.op==='worldScan'){try{worldScan(ctx,p.displayName);}catch(e){ctx.log?.('slate: world scan failed',{e:String(e?.message||e)});}return true;}
 if(k==='planLoom'&&/^fill/.test(String(d.op))){const r=fillOp(ctx,p,d,plan);if(!r)return true;if(r!=='plan'){if(!loomOp(ctx,p,r,plan,id))return true;}}
 else if(k==='planLoom'){if(!loomOp(ctx,p,d,plan,id))return true;}
 if(k==='planAsk'){const c=plan.cards.find(c=>c.id===d.id);if(c){p.state.planOpen=c.id;p.state.slateTicketTalk={ref:'c:'+c.id,message:'Ask in Discussion; your question is posted through moderated chat first.',busy:false};}return true;}
 
 if(k==='planFlow'){
  if(d.review!==undefined){p.state.planReview=!!d.review;if(d.review){p.state.planRvSkip=[];p.state.planRvTally={yes:0,no:0};delete p.state.planRvLast;}else rvTell(ctx,p);return true;}
  if(d.rvReset){p.state.planRvSkip=[];return true;}
  if(d.rvUndo){const L=p.state.planRvLast,c=L&&plan.cards.find(c=>c.id===L.id);if(L){if(c&&L.v!=='skip'){c.col=L.col;if(L.note!==undefined)c.note=L.note;else delete c.note;delete c.verdict;const t=p.state.planRvTally||{yes:0,no:0};t[L.v]=Math.max(0,(t[L.v]||0)-1);p.state.planRvTally={...t};if(L.v==='no')p.state.planRvNo=(p.state.planRvNo||[]).filter(x=>x.id!==L.id);}p.state.planRvSkip=(p.state.planRvSkip||[]).filter(x=>x!==L.id);delete p.state.planRvLast;}}
  if(d.rv){const c=plan.cards.find(c=>c.id===d.rv.id);if(c&&c.col==='test'){const v=d.rv.v;
   if(v==='skip'){p.state.planRvSkip=[...new Set([...(p.state.planRvSkip||[]),c.id])];p.state.planRvLast={id:c.id,v};return true;}
   if(v==='yes'||v==='no'){p.state.planRvLast={id:c.id,v,col:c.col,note:c.note};const t=p.state.planRvTally||{yes:0,no:0};t[v]=(t[v]||0)+1;p.state.planRvTally={...t};c.verdict={v,at:ctx.now(),by:p.displayName};
    if(v==='yes')c.col='done';else{const n=clip(d.rv.note,400);c.col='doing';if(n)c.note=`Fix (${p.displayName}): ${n}${c.note?'\n\n'+c.note:''}`;c.asked=ctx.now();p.state.planRvNo=[...(p.state.planRvNo||[]),{id:c.id,t:c.t,n}].slice(-40);}
    if(!plan.cards.some(x=>x.col==='test'&&x.id!==c.id&&!(p.state.planRvSkip||[]).includes(x.id)&&(!p.state.planProj||x.proj===p.state.planProj)))rvTell(ctx,p);}}}
  if(d.proj!==undefined){p.state.planProj=(plan.projects||[]).some(q=>q.id===d.proj)?d.proj:'';const sp=(plan.sprints||[]).find(x=>x.id===p.state.planSprint);if(sp&&sp.proj&&sp.proj!==p.state.planProj)delete p.state.planSprint;return true;}
  if(d.projAdd){const name=clip(d.projAdd.name,40);if(name&&!(plan.projects||[]).some(q=>q.name===name)){const pid='pj-'+id();plan.projects=[...(plan.projects||[]),{id:pid,name,kind:clip(d.projAdd.kind,20)||'project',color:['#64d2ff','#30d158','#ff9f0a','#bf5af2','#ff6482','#ffd60a'][(plan.projects||[]).length%6]}];p.state.planProj=pid;}}
  if(d.custom!==undefined){p.state.planCustom=!!d.custom;return true;}
  if(d.cfg){if(!cfgOp(plan,d.cfg))return true;}
  if(d.group!==undefined){p.state.planGroup=['','ms','tag','pri'].includes(d.group)?d.group:'';return true;}
  if(d.wip&&COLS.includes(d.wip.col)){plan.wip={...(plan.wip||{})};const n=Math.max(0,Math.min(99,d.wip.n|0));if(n)plan.wip[d.wip.col]=n;else delete plan.wip[d.wip.col];}
  const c=d.id&&plan.cards.find(c=>c.id===d.id);
  if(c&&d.pri!==undefined)c.pri=Math.max(0,Math.min(PRI.length-1,d.pri|0));
  if(c&&d.blocked!==undefined){if(d.blocked)c.blocked=d.blocked===true?true:(clip(d.blocked,120)||true);else delete c.blocked;}
  if(d.quick){let t=String(d.quick),tag=TAGS.includes('feature')?'feature':TAGS[0],pri=0,m='';
   t=t.replace(/(^|\s)#(\w+)/g,(x,a,w)=>{const f=TAGS.find(g=>g.startsWith(w.toLowerCase()));if(f)tag=f;return f?a:x;});
   t=t.replace(/(^|\s)!([0-9])\b/g,(x,a,n)=>{pri=Math.min(PRI.length-1,+n);return a;});
   t=t.replace(/(^|\s)@(\S+)/g,(x,a,w)=>{const e=plan.ms.find(e=>e.name.toLowerCase().replace(/\s+/g,'').startsWith(w.toLowerCase()));if(e)m=e.name;return e?a:x;});
   t=clip(t.replace(/\s+/g,' '),120);if(t)plan.cards.push({id:id(),t,col:COLS.includes('todo')?'todo':COLS[0],ms:m,tag,pri,by:p.displayName,place:ctx.place?.id||'',at:null});}
 }
 // what is made while a project is in scope belongs to it
 {const pj=p.state.planProj;if(pj&&(plan.projects||[]).some(q=>q.id===pj)){for(const c of plan.cards)if(!before.has(c.id)&&!c.proj)c.proj=pj;for(const m of plan.ms)if(!msB.has(m.id)&&!m.proj)m.proj=pj;for(const r of plan.rel||[])if(!relB.has(r.id)&&!r.proj)r.proj=pj;}}
 // flow stamps: when a card is born, enters a column, first starts, finishes
 {const now=ctx.now();for(const c of plan.cards){const was=before.get(c.id);if(was===undefined&&!c.made){c.made=now;c.moved=now;}else if(was!==undefined&&was!==c.col)c.moved=now;if(c.col==='doing'&&!c.started)c.started=now;if(c.col==='done'){if(!c.doneAt||was!==c.col&&was!==undefined)c.doneAt=c.doneAt&&was==='done'?c.doneAt:now;}else delete c.doneAt;}}
 stampSprints(ctx,p,plan,before,bs);
 kilnTickets(ctx,plan,before);
 ctx.world.state.plan=plan;return true;
}
// a review round's send-backs reach Savi as one message when the deck runs out or is closed, never one per swipe
function rvTell(ctx,p){const no=p.state.planRvNo||[];if(!no.length)return;delete p.state.planRvNo;
 ctx.notifyDm(`REVIEW ROUND from ${p.displayName}: ${no.length} card${no.length>1?'s':''} sent back to Doing:\n${no.map(x=>`- "${x.t}" [${x.id}]${x.n?': '+x.n:''}`).join('\n')}\nFix each, then move it back to TESTING.`,{wake:true});}



// KILN INTAKE (psypher5 2026-10-03: "everything is going to go through kiln ... done on its ticket when it goes into todo / doing")
// An art ticket (tag art, or a title opening "Kiln:") that enters To Do or Doing gets a receipt per asset in studio/assets/<id>.json, so Workbench lists it.
// card.asset names the asset id (or ids); absent, the id is slugged from the title. An existing receipt is never touched.
const slug=t=>String(t||'').replace(/^kiln\s*:\s*/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
export function kilnTickets(ctx,plan,before){
 const all=ctx.world.files||[];let made=0;
 for(const c of plan.cards||[]){
  if(c.col!=='todo'&&c.col!=='doing')continue;
  if(before&&before.get(c.id)===c.col)continue;
  if(c.tag!=='art'&&!/^kiln\s*:/i.test(c.t||''))continue;
  const ids=(Array.isArray(c.asset)?c.asset:[c.asset||slug(c.t)]).map(slug).filter(Boolean);
  for(const id of ids){const f='studio/assets/'+id+'.json';if(all.includes(f))continue;
   try{ctx.files.write(f,JSON.stringify({id,title:c.asset?id.replace(/-/g,' '):String(c.t).replace(/^kiln\s*:\s*/i,''),status:'intake',class:c.kclass||'unset: pick hero / character / prop / environment ()',card:c.id,opened:new Date(ctx.now()).toISOString().slice(0,10),steps:{concept:null,turnaround:null,research:null,blockout:null,uv:null,bake:null,lod:null,export:null,review:null,placed:null}},null,1));made++;}catch(e){}}
  if(!c.asset)c.asset=ids.length===1?ids[0]:ids;
 }
 if(made)try{syncStudio(ctx);}catch(e){}
 return made;
}
