// Generic sprint planning adapted from @robot/MOG; no MOG records.
// Sprints: plan.sprints rows, one active per proj ('' = whole board). Ops, the end-of-handle stamp and the burndown snap.
// Imported by plan.js only (input side). Done = col 'done'; open = any other col. Days are UTC.
const day=t=>new Date(t).toISOString().slice(0,10);
const clip=(s,n)=>String(s??'').trim().slice(0,n);
const tm=v=>v===null||v===''||v===undefined?null:Number.isFinite(+v)&&+v>0?+v:(Date.parse(v)||null);
const num=s=>+String(s.key||s.id).replace(/\D/g,'')||0;
export const spCount=(plan,s)=>{let open=0,done=0;for(const c of plan.cards)if(c.sprint===s.id&&(c.proj||'')===(s.proj||''))c.col==='done'?done++:open++;return {open,done};};
const okProj=(plan,pj)=>(plan.projects||[]).some(q=>q.id===pj&&q.kind!=='sprint-old');
// the sprint this player's Board is visibly filtered to, or null
export function spVisible(plan,p){const s=(plan.sprints||[]).find(x=>x.id===p?.state?.planSprint);if(!s)return null;const pj=p.state.planProj||'';return !pj||okProj(plan,pj)&&(s.proj||'')===pj?s:null;}
function snapRow(plan,s,now){const d=day(now);s.snap=[...(s.snap||[]).filter(x=>x.day!==d),{day:d,...spCount(plan,s)}].slice(-90);}
// close: unfinished cards go to `to` (null = backlog); done cards keep s; the report stub counts the window
export function closeSprint(plan,s,to,now){const final=spCount(plan,s);snapRow(plan,s,now);const from=s.startedAt||0;let built=0,passed=0,failed=0;
 for(const c of plan.cards){if(c.sprint!==s.id||(c.proj||'')!==(s.proj||''))continue;if(c.col==='done')built++;else if(to)c.sprint=to.id;else delete c.sprint;const v=c.verdict;if(v&&(v.at||0)>=from&&(v.at||0)<=now){if(v.v==='yes')passed++;else if(v.v==='no')failed++;}}
 s.state='closed';s.closedAt=now;s.report={...final,built,passed,failed,right:'',wrong:'',change:'',bar:''};if(to)snapRow(plan,to,now);}
// Explicit recovery of dangling sprint IDs only. No project rewrites or inferred legacy seeds.
function migrate(ctx,plan,d){
 if(!Array.isArray(d.ids)||!d.ids.length)return false;
 const rows=[];for(const id of [...new Set(d.ids.map(String))]){
 if((plan.sprints||[]).some(s=>s.id===id))continue;
 const cards=plan.cards.filter(c=>c.sprint===id),projs=[...new Set(cards.map(c=>c.proj||''))];
 if(!cards.length||projs.length!==1||projs[0]&&!okProj(plan,projs[0]))return false;
 rows.push({id,key:id,name:id,proj:projs[0],state:'next',goal:'',start:null,end:null,ms:[],cap:10});
 }if(!rows.length)return false;plan.sprints.push(...rows);return true;
}
// returns true = write the plan, false = nothing more to write, 'commit' = write it as one commit
export function sprintOp(ctx,p,d,plan,id){const S=plan.sprints=plan.sprints||[];const say=t=>{p.state.slateSprintMsg=t;return false;};delete p.state.slateSprintMsg;
 const op=d.op;
 if(op==='migrate')return migrate(ctx,plan,d)?'commit':say('Nothing to migrate');
 if(op==='add'){if(d.proj&&!okProj(plan,d.proj))return say('No such project');const name=clip(d.name,40);if(!name)return say('Name the sprint');const n=Math.max(0,...S.map(num))+1;const fields=validated(plan,{proj:d.proj||''},d);if(!fields)return say('Check dates, capacity and milestones');S.push({...fields,id:'sp-'+id(),key:'S'+n,name,chunk:clip(d.chunk,40),goal:clip(d.goal,200),start:tm(d.start),end:tm(d.end),state:'next',proj:okProj(plan,d.proj)?d.proj:''});return true;}
 if(op==='assign'){const c=plan.cards.find(x=>x.id===d.card);if(!c)return say('No such card');if(p.state.planProj&&(p.state.planProj||'')!==(c.proj||''))return say('Choose the card project first');const old=S.find(s=>s.id===c.sprint);if(old?.state==='closed')return say('Closed sprint history stays closed');if(d.sprint===''){delete c.sprint;return true;}const t=S.find(x=>x.id===d.sprint);if(!t)return say('No such sprint');if(t.state==='closed')return say('That sprint is closed');if((c.proj||'')!==(t.proj||''))return say('Sprint and card must share a project');c.sprint=t.id;if(!c.ms&&(t.ms||[]).length===1){const m=(plan.ms||[]).find(m=>m.id===t.ms[0]&&(m.proj||'')===(c.proj||''));if(m)c.ms=m.name;}return true;}
 const s=S.find(x=>x.id===d.id);
 if(op==='view'){p.state.planSprint=s?s.id:'';return false;}
 if(!s)return say('No such sprint');
 if(op==='edit'){const fields=validated(plan,s,d);if(!fields)return say('Check dates, capacity and milestones');Object.assign(s,fields);if(d.name!==undefined)s.name=clip(d.name,40)||s.name;for(const f of ['chunk','goal'])if(d[f]!==undefined)s[f]=clip(d[f],f==='goal'?200:40);for(const f of ['start','end'])if(d[f]!==undefined)s[f]=tm(d[f]);if(s.report&&d.report)for(const f of ['right','wrong','change','bar'])if(d.report[f]!==undefined)s.report[f]=clip(d.report[f],600);return true;}
 if(op==='start'){if(s.state==='closed')return say('Closed sprints stay closed; make a new one');if(s.state==='active')return false;const a=S.find(x=>x!==s&&x.state==='active'&&(x.proj||'')===(s.proj||''));if(a)return say(`${a.key||a.name} is still active here: close it first`);s.state='active';s.startedAt=ctx.now();snapRow(plan,s,ctx.now());return true;}
 if(op==='close'){if(s.state==='closed')return say('Already closed');const to=d.carryTo;if(to===undefined||to===null)return say('Pick where unfinished cards go');const t=to===''?null:S.find(x=>x.id===to);if(to!==''&&(!t||t.state==='closed'||t===s||(t.proj||'')!==(s.proj||'')))return say('Carry to an open sprint or the backlog');closeSprint(plan,s,t,ctx.now());return true;}
 return false;}
// end of handle(): stamp new cards with the visibly-filtered sprint, then overwrite today's snap of every sprint touched
export function stampSprints(ctx,p,plan,before,bs){const S=plan.sprints;if(!S||!S.length)return;
 const v=spVisible(plan,p);if(v&&v.state!=='closed')for(const c of plan.cards)if(!before.has(c.id)&&!c.sprint&&((c.proj||'')===(v.proj||'')))c.sprint=v.id;
 const hit=new Set(),ids=new Set();for(const c of plan.cards){ids.add(c.id);const w=before.get(c.id);if(w===undefined||w!==c.col||bs.get(c.id)!==c.sprint){hit.add(c.sprint);hit.add(bs.get(c.id));}}
 for(const [k,sp] of bs)if(!ids.has(k))hit.add(sp);
 for(const s of S)if(hit.has(s.id)&&s.state!=='closed')snapRow(plan,s,ctx.now());}

function validated(plan,s,d){
 const out={};for(const f of ['start','end'])if(d[f]!==undefined){out[f]=tm(d[f]);if(d[f]!==''&&d[f]!==null&&out[f]===null)return null;}
 const start='start' in out?out.start:s.start,end='end' in out?out.end:s.end;if(end&&start&&end<start)return null;
 if(d.cap!==undefined){const n=Number(d.cap);if(!Number.isInteger(n)||n<1||n>99)return null;out.cap=n;}
 if(d.ms!==undefined){if(!Array.isArray(d.ms)||d.ms.length>8||d.ms.some(id=>!(plan.ms||[]).some(m=>m.id===id&&(m.proj||'')===(s.proj||''))))return null;out.ms=[...new Set(d.ms)];}return out;
}
