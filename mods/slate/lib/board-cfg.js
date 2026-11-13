// Planner's own vocabulary: columns, ticket types and priority levels, set per world in world.state.plan.cfg.
// COLS/TAGS/COLN/COLI/TAGC/PRI are live: applyCfg(plan) rewrites them in place, so every importer reads this board's words.
// 'test' (Review reads it) and 'done' (flow metrics read it) can be renamed and moved but never removed.
export const DEF_COLS=[{id:'idea',name:'Ideas',icon:'sparkles'},{id:'todo',name:'To Do',icon:'list'},{id:'doing',name:'Doing',icon:'sync'},{id:'test',name:'Testing',icon:'eye'},{id:'done',name:'Done',icon:'check'}];
export const DEF_TAGS=[{id:'feature',color:'#64d2ff'},{id:'bug',color:'#ff9f0a'},{id:'polish',color:'#d1d1d6'},{id:'balance',color:'#c9a56a'},{id:'lore',color:'#bf5af2'},{id:'note',color:'#ffd60a'},{id:'community',color:'#ff6482'},{id:'savinotes',color:'#ffd79a'}];
export const DEF_PRI=[{name:'Urgent',color:'#ff453a'},{name:'High',color:'#ff9f0a'},{name:'Medium',color:'#ffd60a'},{name:'Low',color:'#64d2ff'}];
export const LOCKED=['test','done'];
export const COLS=[],TAGS=[],PRI=[],COLN={},COLI={},TAGC={};
const clip=(v,n)=>String(v??'').replace(/[<>"'`\\]/g,'').slice(0,n).trim();
const hex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():null;
const slug=v=>clip(v,24).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const PAL=['#64d2ff','#30d158','#ff9f0a','#bf5af2','#ff6482','#ffd60a','#5e5ce6','#ff453a','#66d4cf','#c9a56a'];
export function cfgOf(plan){const c=plan&&plan.cfg||{};
 let cols=Array.isArray(c.cols)&&c.cols.length?c.cols.filter(x=>x&&x.id):DEF_COLS;
 for(const l of LOCKED)if(!cols.some(x=>x.id===l))cols=[...cols,DEF_COLS.find(x=>x.id===l)];
 const tags=Array.isArray(c.tags)&&c.tags.length?c.tags.filter(x=>x&&x.id):DEF_TAGS;
 const pri=Array.isArray(c.pri)&&c.pri.length?c.pri.filter(Boolean).slice(0,6):DEF_PRI;
 return {cols,tags,pri};}
export function applyCfg(plan){const {cols,tags,pri}=cfgOf(plan);
 COLS.splice(0,COLS.length,...cols.map(x=>x.id));for(const k in COLN)delete COLN[k];for(const k in COLI)delete COLI[k];
 for(const x of cols){COLN[x.id]=x.name||x.id;COLI[x.id]=x.icon||'list';}
 TAGS.splice(0,TAGS.length,...tags.map(x=>x.id));for(const k in TAGC)delete TAGC[k];for(const x of tags)TAGC[x.id]=x.color||'#8e8e93';
 PRI.splice(0,PRI.length,['None','#8e8e93'],...pri.map(x=>[x.name||'Level',x.color||'#8e8e93']));}
applyCfg(null);
// an edit from the Customize panel; returns true when the plan changed
export function cfgOp(plan,d){const cur=cfgOf(plan),cfg={cols:cur.cols.map(x=>({...x})),tags:cur.tags.map(x=>({...x})),pri:cur.pri.map(x=>({...x}))};
 const op=String(d.op||''),cards=plan.cards||[];let ok=true;
 const mv=(list,i,dir)=>{const j=i+(dir|0);if(i<0||j<0||j>=list.length)return false;[list[i],list[j]]=[list[j],list[i]];return true;};
 if(op==='colAdd'){const name=clip(d.name,24);let id=slug(name)||'col';if(!name)return false;while(cfg.cols.some(x=>x.id===id))id+='-2';cfg.cols.splice(Math.max(0,cfg.cols.findIndex(x=>x.id==='done')),0,{id,name,icon:'list'});}
 else if(op==='colRen'){const c=cfg.cols.find(x=>x.id===d.id),n=clip(d.name,24);if(!c||!n)return false;c.name=n;}
 else if(op==='colMove'){ok=mv(cfg.cols,cfg.cols.findIndex(x=>x.id===d.id),d.dir);}
 else if(op==='colDel'){if(LOCKED.includes(d.id)||cfg.cols.length<=2)return false;const i=cfg.cols.findIndex(x=>x.id===d.id);if(i<0)return false;cfg.cols.splice(i,1);
  const to=cfg.cols[Math.max(0,i-1)].id;for(const c of cards)if(c.col===d.id)c.col=to;if(plan.wip)delete plan.wip[d.id];}
 else if(op==='tagAdd'){const id=slug(d.name);if(!id||cfg.tags.some(x=>x.id===id)||cfg.tags.length>=16)return false;cfg.tags.push({id,color:hex(d.color)||PAL[cfg.tags.length%PAL.length]});}
 else if(op==='tagRen'){const t=cfg.tags.find(x=>x.id===d.id),id=slug(d.name);if(!t||!id||id===t.id||cfg.tags.some(x=>x.id===id))return false;for(const c of cards)if(c.tag===t.id)c.tag=id;if(plan.wip)void 0;t.id=id;}
 else if(op==='tagCol'){const t=cfg.tags.find(x=>x.id===d.id),c=hex(d.color);if(!t||!c)return false;t.color=c;}
 else if(op==='tagMove'){ok=mv(cfg.tags,cfg.tags.findIndex(x=>x.id===d.id),d.dir);}
 else if(op==='tagDel'){if(cfg.tags.length<=1)return false;const i=cfg.tags.findIndex(x=>x.id===d.id);if(i<0)return false;cfg.tags.splice(i,1);const to=(cfg.tags.find(x=>x.id==='note')||cfg.tags[0]).id;for(const c of cards)if(c.tag===d.id)c.tag=to;}
 else if(op==='priAdd'){if(cfg.pri.length>=6)return false;cfg.pri.push({name:clip(d.name,16)||'Level '+(cfg.pri.length+1),color:hex(d.color)||'#8e8e93'});}
 else if(op==='priRen'){const p=cfg.pri[(d.i|0)-1],n=clip(d.name,16);if(!p||!n)return false;p.name=n;}
 else if(op==='priCol'){const p=cfg.pri[(d.i|0)-1],c=hex(d.color);if(!p||!c)return false;p.color=c;}
 else if(op==='priMove'){const i=(d.i|0)-1,j=i+(d.dir|0);ok=mv(cfg.pri,i,d.dir);if(ok)for(const c of cards){const v=c.pri|0;if(v===i+1)c.pri=j+1;else if(v===j+1)c.pri=i+1;}}
 else if(op==='priDel'){const i=d.i|0;if(cfg.pri.length<=1||!cfg.pri[i-1])return false;cfg.pri.splice(i-1,1);for(const c of cards){const v=c.pri|0;if(v===i)c.pri=0;else if(v>i)c.pri=v-1;}}
 else if(op==='reset'){if(d.what==='cols'){cfg.cols=DEF_COLS.map(x=>({...x}));for(const c of cards)if(!cfg.cols.some(x=>x.id===c.col))c.col='todo';}
  else if(d.what==='tags'){cfg.tags=DEF_TAGS.map(x=>({...x}));for(const c of cards)if(!cfg.tags.some(x=>x.id===c.tag))c.tag='note';}
  else if(d.what==='pri'){cfg.pri=DEF_PRI.map(x=>({...x}));for(const c of cards)if((c.pri|0)>4)c.pri=4;}else return false;}
 else return false;
 if(!ok)return false;plan.cfg=cfg;applyCfg(plan);return true;}
