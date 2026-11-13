// Slate context, not Discussion membership. Pure reconciliation mutates only context fields.
// Numeric bounds are centralized here; no project names or host-world identifiers.
export const CONTEXT_VERSION=1;
export const LIMITS={connections:4,candidates:64,posting:48,tokens:64,text:5000,pollRows:32};
const STOP=new Set(('a an and are as at be been but by can could do for from has have how if in into is it its of on or our should that the their them then there these they this to use using was we were what when where which who will with without you your not new ticket tickets task tasks feature features implement implementation update updates support add make build built done todo doing testing test tests testing fix fixed check checks status release approved preserve existing source sources page pages plan planner note notes world game player players system generic context acceptance criteria must keep work works').split(' '));
const refs=v=>Array.isArray(v)?v.filter(x=>typeof x==='string'):typeof v==='string'?[v]:[];
const sorted=v=>[...new Set(v)].sort();
export const pairKey=(a,b)=>JSON.stringify([a,b].sort());
export const automaticId=(a,b)=>'ac:'+encodeURIComponent(pairKey(a,b));
export function manualParent(c,value){c.autoContext={...(c.autoContext||{}),version:CONTEXT_VERSION,parent:{mode:'manual',value:value||'',reason:value?'Chosen by user':'Cleared by user'}};}
export function suppressPair(plan,a,b){const m=plan.autoContext||{};plan.autoContext={...m,suppressed:sorted([...(m.suppressed||[]),pairKey(a,b)])};}
export function allowPair(plan,a,b){if(plan.autoContext?.suppressed)plan.autoContext={...plan.autoContext,suppressed:plan.autoContext.suppressed.filter(x=>x!==pairKey(a,b))};}
export function scopeOf(plan,c){return c?.proj||(plan.ms||[]).find(m=>m.id===c?.ms||m.name===c?.ms)?.proj||'';}
function terms(text){return sorted(String(text||'').toLowerCase().replace(/(?:https?:\/\/\S+)|(?:\/?[\w.-]+\/)+[\w./-]+|\b\S*\d\S*\b|\b[pcdf]:[\w:.-]+\b/g,' ').match(/[a-z]{3,}/g)||[]).filter(w=>!STOP.has(w)).slice(0,LIMITS.tokens);}
function files(text){return sorted(String(text||'').match(/(?:\/?[\w.-]+\/)+[\w.-]+\.[a-zA-Z0-9]+/g)||[]).filter(x=>!x.includes('/cdn/')).slice(0,24);}
function setSame(o,k,v){if(JSON.stringify(o[k])!==JSON.stringify(v))o[k]=v;}
function contextStamp(c){return JSON.stringify([c.id,c.t,c.title,c.name,c.tag,c.note,c.accept,c.proj,c.ms,c.parent,c.lore,c.sourceRefs,c.sources,c.files,c.sourcePaths,c.breakdownOf,c.feature,c.featureTicket,c.phase,c.flowPhase,c.tix,c.card,c.page,c.body,c.feat,c.beats,c.chars]);}
export function reconcileContext(plan,loom={}){
 const before=JSON.stringify(plan),cards=(plan.cards||[]).filter(c=>c&&c.id),ordered=[...cards].sort((a,b)=>a.id.localeCompare(b.id)),byId=new Map(cards.map(c=>[c.id,c]));
 const sources=new Map(),direct=new Map(cards.map(c=>[c.id,new Set()]));
 const add=(id,ref)=>{if(direct.has(id)&&sources.has(ref))direct.get(id).add(ref);};
 for(const [kind,rows] of [['p',loom.pages||[]],['d',plan.diary||[]],['f',loom.flow||[]]])for(const row of rows)if(row?.id)sources.set(kind+':'+row.id,row);
 for(const [ref,row] of sources){for(const id of row.tix||[])add(id,ref);if(ref.startsWith('d:')&&row.card)add(row.card,ref);}
 // Legacy explicit links retain provenance without treating every related ticket as a source.
 for(const l of plan.links||[])if(!l.auto){if(l.a?.startsWith('c:'))add(l.a.slice(2),l.b);if(l.b?.startsWith('c:'))add(l.b.slice(2),l.a);}
 for(const c of cards){for(const r of [...refs(c.sourceRefs),...refs(c.sources)])add(c.id,r);if(c.lore)add(c.id,'p:'+c.lore);if(c.phase||c.flowPhase)add(c.id,'f:'+(c.phase||c.flowPhase));}
 // Phase membership and Design->Loom provenance are explicit, never semantic guesses.
 for(const [ref,row] of sources)if(ref.startsWith('f:'))for(const page of [...(row.beats||[]),...(row.chars||[])]){
  const pg=sources.get('p:'+page);for(const id of pg?.tix||[])add(id,ref);
 }
 // Follow bounded, explicit source ancestry, including Design -> Loom -> tickets.
 // This is provenance only; it never creates or joins a Discussion thread.
 const ancestry=new Map([...sources].map(([r,s])=>[r,new Set([...refs(s.sourceRefs),...refs(s.sources)].filter(x=>sources.has(x)))]));
 for(const [r,s] of sources)if(r.startsWith('d:')&&sources.has('p:'+s.page)){ancestry.get(r).add('p:'+s.page);ancestry.get('p:'+s.page).add(r);}
 for(const c of cards){const set=direct.get(c.id),queue=[...set].sort();for(let i=0;i<queue.length&&i<LIMITS.tokens;i++)for(const r of ancestry.get(queue[i])||[]){if(!set.has(r)&&set.size<LIMITS.tokens){set.add(r);queue.push(r);}}}
 const validParent=(c,p,allowMissingScope=false)=>{if(!p||p.id===c.id)return false;const a=scopeOf(plan,c),b=scopeOf(plan,p);if(a!==b&&!(allowMissingScope&&!a))return false;const seen=new Set([c.id]);for(let x=p;x;x=byId.get(x.parent)){if(seen.has(x.id))return false;seen.add(x.id);}return true;};
 const assignParent=(c,p,reason)=>{c.parent=p.id;c.autoContext={...(c.autoContext||{}),version:CONTEXT_VERSION,parent:{mode:'auto',value:p.id,version:CONTEXT_VERSION,reason}};};
 const done=new Set(),walking=new Set();
 function inherit(c){if(done.has(c.id)||walking.has(c.id))return;walking.add(c.id);
  const old=c.autoContext||{},pm=old.parent;
  // Out-of-band parent changes are also a correction, including deleting an automatic parent.
  if(pm&&pm.value!==(c.parent||''))manualParent(c,c.parent);
  else if(c.parent&&!pm)manualParent(c,c.parent);
  if(c.autoContext?.parent?.mode==='auto'&&c.parent){const p=byId.get(c.parent),a=terms(c.t||c.title||c.name),b=terms(p?.t||p?.title||p?.name);const explicit=c.breakdownOf===p?.id||c.featureTicket===p?.id||[...direct.get(c.id)].some(r=>sources.get(r)?.featureTicket===p?.id);const specific=p?.tag==='feature'&&b.length>=2&&b.length<a.length&&b.every(w=>a.includes(w))&&(c.feature&&c.feature===p.feature||[...direct.get(c.id)].some(r=>direct.get(p.id)?.has(r)));if(!validParent(c,p,true)||!(explicit||specific)){delete c.parent;delete c.autoContext.parent;}}
  if(!c.parent&&c.autoContext?.parent?.mode!=='manual'){
   const explicit=byId.get(c.breakdownOf)||byId.get(c.featureTicket)||[...direct.get(c.id)].map(r=>byId.get(sources.get(r)?.featureTicket)).find(Boolean);
   if(validParent(c,explicit,true))assignParent(c,explicit,'Explicit source feature breakdown');
  }
  const par=byId.get(c.parent);if(par){inherit(par);if(!scopeOf(plan,c)||scopeOf(plan,c)===scopeOf(plan,par)){if(!c.proj&&par.proj)c.proj=par.proj;if(!c.ms&&par.ms)c.ms=par.ms;for(const r of direct.get(par.id)||[])direct.get(c.id).add(r);}}
  const sr=[...direct.get(c.id)].sort();
  // Only unambiguous missing context is inherited. Never overwrite an authored project/epic.
  const ps=sorted(sr.map(r=>scopeOf(plan,sources.get(r))).filter(Boolean));if(!c.proj&&!scopeOf(plan,c)&&ps.length===1)c.proj=ps[0];
  const scope=scopeOf(plan,c),eligible=sr.filter(r=>!scopeOf(plan,sources.get(r))||scopeOf(plan,sources.get(r))===scope);
  const ms=sorted(eligible.map(r=>sources.get(r)?.ms).filter(Boolean));if(!c.ms&&ms.length===1)c.ms=ms[0];
  direct.set(c.id,new Set(eligible));
  setSame(c,'autoContext',{...(c.autoContext||{}),version:CONTEXT_VERSION,sources:eligible});
  walking.delete(c.id);done.add(c.id);
 }
 for(const c of ordered)inherit(c);
 // Title terms are indexed once. A hierarchy needs a feature's full title plus explicit
 // provenance; merely being the highest-scoring neighbour never makes a parent.
 const titles=new Map(ordered.map(c=>[c.id,terms(c.t||c.title||c.name)])),features=new Map();
 const featureKeys=c=>[...direct.get(c.id)].map(r=>scopeOf(plan,c)+'|s|'+r).concat(c.feature?[scopeOf(plan,c)+'|h|'+c.feature]:[]);
 for(const c of ordered)if(c.tag==='feature'&&titles.get(c.id).length>=2)for(const key of featureKeys(c)){if(!features.has(key))features.set(key,[]);features.get(key).push(c);}
 for(const c of ordered)if(!c.parent&&c.autoContext?.parent?.mode!=='manual'){
  const title=titles.get(c.id),options=new Map();for(const key of featureKeys(c)){for(const candidate of (features.get(key)||[]).slice(0,LIMITS.posting)){options.set(candidate.id,candidate);if(options.size>=LIMITS.candidates)break;}if(options.size>=LIMITS.candidates)break;}
  const par=[...options.values()].filter(b=>{const t=titles.get(b.id);return t.length<title.length&&t.every(w=>title.includes(w))&&validParent(c,b);}).sort((a,b)=>titles.get(b.id).length-titles.get(a.id).length||a.id.localeCompare(b.id))[0];
  if(par)assignParent(c,par,'More specific task within a shared-source feature');
 }
 // Finish all inheritance before scoring: a second pass is byte-for-byte idempotent.
 done.clear();walking.clear();for(const c of ordered)inherit(c);
 const entries=new Map(),post=new Map(),sizes=new Map();
 const put=(key,id)=>{if(!post.has(key))post.set(key,[]);post.get(key).push(id);};
 for(const c of ordered){const scope=scopeOf(plan,c),title=titles.get(c.id),text=String(c.note||'').slice(0,LIMITS.text)+' '+String(c.accept||'').slice(0,800),tok=new Set([...title,...terms(text)].slice(0,LIMITS.tokens)),fs=files((c.t||'')+' '+text+' '+[...refs(c.sourceRefs),...refs(c.sources),...refs(c.files),...refs(c.sourcePaths)].join(' ')),sr=direct.get(c.id),e={c,scope,title,tok,fs,sr};entries.set(c.id,e);sizes.set(scope,(sizes.get(scope)||0)+1);
  for(const t of tok)put(scope+'|t|'+t,c.id);for(const r of sr)put(scope+'|s|'+r,c.id);for(const f of fs)put(scope+'|f|'+f,c.id);if(c.feature)put(scope+'|h|'+c.feature,c.id);
 }
 const proposals=new Map(),suppressed=new Set(plan.autoContext?.suppressed||[]),manual=new Set((plan.links||[]).filter(l=>!l.auto).map(l=>pairKey(l.a,l.b)));
 const propose=(a,b,score,reason)=>{const k=pairKey(a,b);if(a===b||suppressed.has(k)||manual.has(k))return;const l={id:automaticId(a,b),a:[a,b].sort()[0],b:[a,b].sort()[1],rel:'related',auto:{version:CONTEXT_VERSION,reason,score}};if(!proposals.has(k)||proposals.get(k).auto.score<score)proposals.set(k,l);};
 let comparisons=0,maxCandidates=0;
 for(const e of entries.values()){
  const {c,scope,tok,sr}=e;
  for(const r of sr)propose('c:'+c.id,r,100,'Created from or explicitly linked to '+r);
  if(c.ms){const m=(plan.ms||[]).find(m=>m.id===c.ms||m.name===c.ms);if(m&&(!m.proj||m.proj===scope))propose('c:'+c.id,'c:epic:'+m.id,90,'Member of epic '+m.name);}
  const keys=[...sr].map(r=>scope+'|s|'+r).concat(e.fs.map(f=>scope+'|f|'+f),c.feature?[scope+'|h|'+c.feature]:[],[...tok].filter(t=>(post.get(scope+'|t|'+t)?.length||0)<=Math.max(8,(sizes.get(scope)||1)*.3)).sort((a,b)=>(post.get(scope+'|t|'+a)?.length||0)-(post.get(scope+'|t|'+b)?.length||0)||a.localeCompare(b)).map(t=>scope+'|t|'+t));
  const candidates=new Set();for(const key of keys){const list=post.get(key)||[],start=Math.max(0,list.indexOf(c.id)-Math.floor(LIMITS.posting/2));for(const id of list.slice(start,start+LIMITS.posting)){if(id!==c.id)candidates.add(id);if(candidates.size>=LIMITS.candidates)break;}if(candidates.size>=LIMITS.candidates)break;}
  maxCandidates=Math.max(maxCandidates,candidates.size);
  for(const id of candidates){comparisons++;const b=entries.get(id);if(!b||scope!==b.scope)continue;
   const shared=[...sr].filter(r=>b.sr.has(r)),ff=e.fs.filter(f=>b.fs.includes(f)),tt=[...tok].filter(t=>b.tok.has(t)&&(post.get(scope+'|t|'+t)?.length||0)<=Math.max(8,(sizes.get(scope)||1)*.3)),title=tt.filter(t=>e.title.includes(t)&&b.title.includes(t)),feat=c.feature&&c.feature===b.c.feature;
   const score=Math.min(30,shared.reduce((n,r)=>n+8+Math.log(1+(sizes.get(scope)||1)/(post.get(scope+'|s|'+r)?.length||1))*3,0))+Math.min(30,ff.length*10)+(feat?9:0)+(c.ms&&c.ms===b.c.ms?2:0)+tt.reduce((n,t)=>n+Math.log(1+(sizes.get(scope)||1)/(post.get(scope+'|t|'+t)?.length||1))*(title.includes(t)?2:1),0);
   if(!(shared.length||ff.length||feat||title.length>=2&&score>=2.5))continue;
   const reason=shared.length?'Shared source '+shared.slice(0,2).join(', '):ff.length?'Shared file '+ff[0]:feat?'Same explicit feature':'Specific shared topic: '+title.slice(0,4).join(', ');
   propose('c:'+c.id,'c:'+id,Math.round(score*100)/100,reason);
  }

 }
 // Global endpoint degree cap prevents one popular feature becoming an all-to-all hub.
 const degree=new Map(),auto=[];for(const l of [...proposals.values()].sort((a,b)=>b.auto.score-a.auto.score||a.id.localeCompare(b.id))){const endpoints=[l.a,l.b].filter(r=>r.startsWith('c:')&&!r.startsWith('c:epic:'));if(endpoints.some(r=>(degree.get(r)||0)>=LIMITS.connections))continue;auto.push(l);for(const r of endpoints)degree.set(r,(degree.get(r)||0)+1);}
 const keep=(plan.links||[]).filter(l=>!l.auto);setSame(plan,'links',[...keep,...auto]);
 setSame(plan,'autoContext',{...(plan.autoContext||{}),version:CONTEXT_VERSION});
 return {changed:before!==JSON.stringify(plan),tickets:cards.length,automaticLinks:auto.length,automaticParents:cards.filter(c=>c.autoContext?.parent?.mode==='auto').length,comparisons,maxCandidates,maxDegree:Math.max(0,...degree.values())};
}
// Called from the editor's existing 30-second maintenance cadence, never from render.
// Checks 32 input rows per call, carries a cursor in machine-local session, one reconcile
// only when a changed row is encountered. A producer can set plan.contextRevision for immediate detection.
export function pollContext(ctx){
 const p=ctx.world.state.plan;if(!p?.cards)return null;const L=ctx.world.state.loom||{},s=ctx.session.slateContext||(ctx.session.slateContext={cursor:0,stamps:{}}),rows=[p.cards,L.pages||[],p.diary||[],L.flow||[],p.ms||[]],total=rows.reduce((n,a)=>n+a.length,0);
 let dirty=p.autoContext?.version!==CONTEXT_VERSION||s.revision!==p.contextRevision||s.total!==total;s.revision=p.contextRevision;s.total=total;
 for(let i=0;i<Math.min(LIMITS.pollRows,total);i++){const at=s.cursor++%total;let j=at,k=0;while(j>=rows[k].length){j-=rows[k].length;k++;}const row=rows[k][j],key=k+':'+row.id,value=contextStamp(row);if(s.stamps[key]!==value){dirty=true;s.stamps[key]=value;}}
 if(!dirty)return null;const fresh=JSON.parse(JSON.stringify(ctx.world.state.plan));const result=reconcileContext(fresh,ctx.world.state.loom||{});if(result.changed)ctx.world.state.plan=fresh;return result;
}
