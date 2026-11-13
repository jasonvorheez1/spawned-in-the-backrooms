import {emptyState,clearBoardFilters,syncBoardEmpty} from './ui-empty.js';
// Planner board, flow-first (Kanban Guide flow metrics + modern tracker patterns). Ported from @dandalruss/awoken's Slate.
// WIP limits per column, work-item age on every card, blocked flags, Linear-style priority, swimlanes,
// a live flow strip (WIP · throughput · cycle time · blocked · oldest), instant search + quick filters,
// and a smart quick-add: "fix canoe #bug !1 @Valley". Starbloom: the + New button wears house gold (#a37d45, themed).
import {COLS,TAGS} from './plan.js';
import {COLN,COLI,TAGC,PRI,cfgOf,LOCKED,applyCfg} from './board-cfg.js';
import {ic} from './icons.js';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export {TAGC};
const DAY=864e5;
// cards made before timestamps existed: the id opens with the creation time in base36
export const madeOf=c=>{if(c.made)return c.made;const t=parseInt(String(c.id||'').slice(0,8),36);return t>1.6e12&&t<4e12?t:0;};
const priIcon=p=>{const [n,col]=PRI[p]||PRI[0];if(p===1)return `<svg width="14" height="14" viewBox="0 0 16 16" style="display:block"><rect x="1" y="1" width="14" height="14" rx="4" fill="${col}"/><path d="M8 4.2v4.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="11.6" r="1.1" fill="#fff"/></svg>`;
 if(!p)return `<svg width="14" height="14" viewBox="0 0 16 16" style="display:block"><g fill="${col}"><circle cx="3.5" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12.5" cy="8" r="1.2"/></g></svg>`;
 const L=PRI.length-1,lit=L<=2?3-(p-1):Math.max(1,Math.min(3,Math.round((L-p+1)*3/(L-1))));return `<svg width="14" height="14" viewBox="0 0 16 16" style="display:block">${[0,1,2].map(i=>`<rect x="${2+i*4.6}" y="${11-i*3.6}" width="3" height="${3+i*3.6}" rx="1" fill="${i<lit?col:'rgba(235,235,245,.22)'}"/>`).join('')}</svg>`;};
const ago=ms=>ms<36e5?Math.max(1,Math.round(ms/6e4))+'m':ms<DAY?Math.round(ms/36e5)+'h':Math.round(ms/DAY)+'d';
const FILTER=`(function(){var r=(document.getElementById('kb-q')||{}).value||'',q='',ok='abcdefghijklmnopqrstuvwxyz0123456789 _.-',s=document.getElementById('kb-qs');r=r.trim().toLowerCase();for(var i=0;i<r.length;i++){if(ok.indexOf(r.charAt(i))>=0)q+=r.charAt(i);}if(!s){s=document.createElement('style');s.id='kb-qs';document.head.appendChild(s);}var Q=String.fromCharCode(34);s.textContent=q?'#vwp-tablet .vwp-card:not([data-k*='+Q+q+Q+' i]){display:none!important}#vwp-tablet .kb-lane:not(:has(.vwp-card[data-k*='+Q+q+Q+' i])){display:none!important}':'';})();${syncBoardEmpty}`;
const chipJS=f=>`var H=document.documentElement;H.dataset.kbf=(H.dataset.kbf==='${f}'||'${f}'==='all')?'':'${f}';${syncBoardEmpty}`;
// PROJECTS: one board, many workstreams (the game, each mod, the tools). A card, epic or release carries proj;
// the bar scopes Planner and Roadmap to one project, or All with a project badge on every card.
export const projOf=(plan,id)=>(plan.projects||[]).find(p=>p.id===id&&p.kind!=='sprint-old'); // sprint-old: pre-1.5 sprint projects, kept one release, never a scope
export function scopePlan(plan,player){const id=player?.state?.planProj||'';if(!id||!projOf(plan,id))return plan;
 const keep=x=>(x.proj||'')===id;return {...plan,cards:(plan.cards||[]).filter(keep),ms:(plan.ms||[]).filter(keep),rel:(plan.rel||[]).filter(keep)};}
export function projBar(plan,player){const P=(plan.projects||[]).filter(p=>p.kind!=='sprint-old');if(!P.length&&!player?.isEditor)return '';
 const cur=projOf(plan,player?.state?.planProj)?player.state.planProj:'',cards=plan.cards||[];
 const n=id=>cards.filter(c=>(id?c.proj===id:true)&&c.col!=='done').length;
 const b=(id,name,col,kind)=>`<button class="pj${cur===id?' on':''}" style="--c:${col||'#fff'}" title="${esc(kind||'every project')}" onclick="sendAction('planFlow',{proj:'${id}'})">${id?'<i></i>':''}${esc(name)} <em>${n(id)}</em></button>`;
 const add=`<button class="pj pj-add" title="New project" onclick="var v=prompt('New project name (a game, a mod, a tool)','');if(v&&v.trim())sendAction('planFlow',{projAdd:{name:v.trim()}})">${ic('plus',13)}</button>`;
 const cp=projOf(plan,cur);
 return `<style>${PCSS}</style><div class="pj-bar">${reviewButton(scopePlan(plan,player))}${b('','All')}${P.map(p=>b(p.id,p.name,p.color,p.kind)).join('')}${add}</div>${cp&&cp.goal?`<div class="pj-goal"><b>${esc(cp.kind||'')}</b> ${esc(cp.goal)}</div>`:''}`;}
export const PCSS=`#vwp-tablet .pj-bar{display:flex;gap:6px;overflow-x:auto;margin:0 0 8px;padding-bottom:2px;scrollbar-width:none}
#vwp-tablet .pj{--c:#fff;flex:none;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:15px;border:0;background:rgba(118,118,128,.2);color:rgba(235,235,245,.85);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap}
#vwp-tablet .pj i{width:8px;height:8px;border-radius:50%;background:var(--c)}
#vwp-tablet .pj em{font-style:normal;font-size:11px;opacity:.55;font-variant-numeric:tabular-nums}
#vwp-tablet .pj.on{background:rgba(255,255,255,.92);color:#000}#vwp-tablet .pj.on em{opacity:.6}
#vwp-tablet .pj-add{width:30px;padding:0;justify-content:center}
#vwp-tablet .pj-goal{font-size:11.5px;color:rgba(235,235,245,.6);margin:-2px 2px 10px}#vwp-tablet .pj-goal b{color:rgba(235,235,245,.85);font-weight:600;text-transform:capitalize;margin-right:4px}
#vwp-tablet .kb-pj{--c:#8e8e93;white-space:nowrap;padding:1px 6px;border-radius:6px;background:color-mix(in srgb,var(--c) 22%,transparent);color:var(--c)}`;
export function boardView(plan,player,ctx,CDRAG){
 const now=(ctx&&typeof ctx.now==='function')?ctx.now():0,me=player?.displayName||'';
 const cards=plan.cards||[],ms=plan.ms||[],wip=plan.wip||{},group=player?.state?.planGroup||'';const FRESH=new Set(player?.state?.slateFresh?.app==='board'?(player.state.slateFresh.ids||[]).map(i=>String(i).split('~')[0]):[]); // 1.1.0: the cards that changed since you last opened the board
 if(!cards.length){const full=ctx?.world?.state?.plan||plan;
 const sprint=player?.state?.planSprint,proj=player?.state?.planProj;
 const filtered=!!(full.cards||[]).length;
 return emptyState(filtered?{title:'No matching tasks',text:'No tasks in this selection. Clear the active scope to see your work.',primary:{label:'Clear task filters',click:clearBoardFilters+";sendAction('planSprint',{op:'view',id:''});sendAction('planFlow',{proj:''})"}}:{title:'Turn your next idea into a task',text:'Track the work that brings your world to life.',example:'Add a campsite lantern',detail:'Create a warm light source for the cabin area.',primary:{label:'Create your first ticket',click:"sendAction('planAdd',{blank:true})"},secondary:{label:'Browse Design board',click:"sendAction('planTab',{tab:'diary'});sendAction('planLoom',{op:'open',ch:'journal',id:null})"}});
 }
 // flow metrics
 const live=cards.filter(c=>c.col==='doing'||c.col==='test');
 const done=cards.filter(c=>c.col==='done'&&c.doneAt);
 const thru=done.filter(c=>now-c.doneAt<7*DAY).length;
 const cyc=done.slice().sort((a,b)=>b.doneAt-a.doneAt).slice(0,20).map(c=>c.doneAt-(c.started||madeOf(c))).filter(v=>v>0);
 const cycle=cyc.length?cyc.reduce((a,b)=>a+b,0)/cyc.length:0;
 const blocked=cards.filter(c=>c.blocked&&c.col!=='done').length;
 const ageOf=c=>now&&(c.moved||madeOf(c))?now-(c.moved||madeOf(c)):0;
 const oldest=live.slice().sort((a,b)=>ageOf(b)-ageOf(a))[0];
 const heat=c=>{const a=ageOf(c);if(!a||c.col==='done'||c.col==='idea')return 0;const lim=c.col==='todo'?[14,30]:[3,7];return a>lim[1]*DAY?2:a>lim[0]*DAY?1:0;};
 const stat=(label,val,hint,col)=>`<div class="kb-stat" title="${hint}"><b style="${col?`color:${col}`:''}">${val}</b><span>${label}</span></div>`;
 const flow=`<div class="kb-flow">
  ${stat('in progress',live.length,'Work in progress: cards in Doing + Testing. Fewer at once finishes more.')}
  ${stat('done / 7 days',thru,'Throughput: cards finished in the last 7 days.')}
  ${stat('cycle time',cycle?ago(cycle):'—','Average time from first Doing to Done, last 20 cards.')}
  ${stat('blocked',blocked,'Cards flagged as blocked.',blocked?'#ff453a':'')}
  ${oldest&&ageOf(oldest)>DAY?`<div class="kb-stat kb-old" onclick="sendAction('planOpen',{id:'${oldest.id}'})" title="Oldest card in progress: open it"><b style="color:${heat(oldest)===2?'#ff453a':heat(oldest)?'#ff9f0a':''}">${ago(ageOf(oldest))}</b><span>oldest · ${esc(oldest.t.slice(0,28))}</span></div>`:''}
 </div>`;
 // toolbar: search, quick filters, group by, new
 const seg=(v,l)=>`<button class="kb-seg${group===v?' on':''}" onclick="sendAction('planFlow',{group:'${v}'})">${l}</button>`;
 const chip=(f,l,n,col)=>`<button class="kb-chip" data-f="${f}" onclick="${chipJS(f)}" ${col?`style="--c:${col}"`:''}>${l}${n!==undefined?` <i>${n}</i>`:''}</button>`;
 const omni=`(function(e,el){var v=el.value,m=/^\\s*!add\\b\\s*/i;if(e.key==='Escape'){el.value='';${FILTER};return}if(e.key!=='Enter')return;if(m.test(v)){var t=v.replace(m,'').trim();if(t)sendAction('planFlow',{quick:t});el.value='';${FILTER};}else if(/^\\s*!new\\s*$/i.test(v)){el.value='';${FILTER};sendAction('planAdd',{blank:true})}})(event,this)`;
 const filt=`(function(el){if(/^\\s*!/.test(el.value)){var s=document.getElementById('kb-qs');if(s)s.textContent='';el.parentNode.classList.add('add');return}el.parentNode.classList.remove('add');${FILTER}})(this)`;
 const tools=`<div class="kb-tools">
  <label class="kb-search kb-omni" title="type to search · start with !add to make a ticket · !new opens a full form">${ic('search',14)}<input id="kb-q" placeholder="Search, or !add fix canoe #bug !1 @epic" oninput="${filt}" onkeydown="${omni}"><span class="kb-omni-hint">↵ add</span></label>
  <div class="kb-segs" title="swimlanes">${seg('','Columns')}${seg('ms','Epic')}${seg('pri','Priority')}${seg('tag','Type')}</div>
  <button class="kb-cust${player?.state?.planCustom?' on':''}" onclick="sendAction('planFlow',{custom:${!player?.state?.planCustom}})" title="Customize columns, ticket types and priorities">${ic('pencil',14)}<span>Customize</span></button>
  <button class="kb-new" onclick="sendAction('planAdd',{blank:true})" title="New ticket with every field">${ic('plus',15)}</button>
 </div>
 <div class="kb-chips">${chip('all','All')}${chip('mine','Mine',cards.filter(c=>c.by===me).length)}${chip('blocked','Blocked',blocked,'#ff453a')}${chip('aging','Aging',cards.filter(c=>heat(c)).length,'#ff9f0a')}${chip('urgent',esc(PRI[1]?PRI[1][0]:'Urgent'),cards.filter(c=>c.pri===1&&c.col!=='done').length,PRI[1]?PRI[1][1]:'#ff453a')}<span class="kb-sep"></span>${TAGS.map(t=>chip('t-'+t,esc(t),cards.filter(c=>c.tag===t).length,TAGC[t])).join('')}</div>`;
 const custom=player?.state?.planCustom?customView(plan):'';
 const allP=!(player?.state?.planProj&&projOf(plan,player.state.planProj))?(plan.projects||[]):[];
 const card=x=>{const h=heat(x),a=ageOf(x),p=x.pri|0,isDone=x.col==='done';
  const k=esc(((projOf(plan,x.proj)?.name||'')+' '+x.t+' '+(x.note||'')+' '+(x.tag||'')+' '+(x.ms||'')+' '+(x.by||'')).toLowerCase());
  return `<div class="vwp-card kb-card${x.blocked?' kb-blocked':''}${FRESH.has(x.id)?' kb-fresh':''}" data-id="${x.id}" data-tag="${x.tag}" data-k="${k}" ${x.by===me?'data-mine':''} ${x.blocked&&!isDone?'data-blocked':''} ${h?'data-aging':''} ${p===1&&!isDone?'data-urgent':''} title="drag to move · click to open" onclick="if(window.__vwpDragged)return;if(!event.target.closest('button,select,input,[contenteditable]'))sendAction('planOpen',{id:'${x.id}'})">
   ${x.shot?`<img src="${esc(x.marked||x.shot)}" class="kb-shot">`:''}
   <div class="kb-top"><button class="kb-pri" title="Priority: ${(PRI[p]||PRI[0])[0]} · click to change" onclick="sendAction('planFlow',{id:'${x.id}',pri:${(p+1)%PRI.length}})">${priIcon(p)}</button>
    <div class="kb-title" contenteditable="true" spellcheck="false" title="click to rename" data-v="${esc(x.t)}" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="const v=this.innerText.trim();if(v&&v!==this.dataset.v)sendAction('planEdit',{id:'${x.id}',t:v})" style="${isDone?'text-decoration:line-through;opacity:.55':''}">${esc(x.t)}</div></div>
   ${x.blocked&&!isDone?`<div class="kb-why">${ic('xmark',12)}${esc(x.blocked===true?'blocked':x.blocked)}</div>`:''}
   <div class="kb-meta">${(()=>{const pp=allP.find(p=>p.id===x.proj);return pp?`<span class="kb-pj" style="--c:${pp.color}">${esc(pp.short||pp.name)}</span>`:'';})()}${(()=>{const sp=x.sprint&&(plan.sprints||[]).find(s=>s.id===x.sprint);return sp?`<span class="kb-pj" title="sprint ${esc(sp.name)}" style="--c:${sp.color||'#a37d45'}">${esc(sp.key||sp.id)}</span>`:'';})()}<span class="kb-tag" style="--c:${TAGC[x.tag]||'#8e8e93'}">${x.tag}</span>${x.ms?`<span class="kb-ms" title="epic">${esc(x.ms)}</span>`:''}${x.at?`<span title="${esc(x.place)} ${x.at.x}, ${x.at.y}, ${x.at.z}">📍</span>`:''}${x.by==='Savi'?'<span title="written by Savi" style="color:#ffd79a">✦</span>':''}
    <span style="flex:1"></span>${a&&!isDone&&x.col!=='idea'?`<span class="kb-age h${h}" title="${h?'aging: ':''}${ago(a)} in ${esc(COLN[x.col]||x.col)}">${ago(a)}</span>`:''}${isDone&&x.doneAt?`<span class="kb-age" title="finished">${ago(now-x.doneAt)} ago</span>`:''}</div>
   ${isDone?'':`<div class="kb-acts"><button title="${x.blocked?'Unblock':'Flag as blocked'}" onclick="var r=${x.blocked?'false':`prompt('What is it waiting on?','')`};if(r!==null)sendAction('planFlow',{id:'${x.id}',blocked:r===false?false:(r||true)})" class="${x.blocked?'on':''}">${ic(x.blocked?'check':'flag',13)}<span>${x.blocked?'Unblock':'Block'}</span></button><button title="${x.asked?'Asked Savi · send again':'Ask Savi to build this'}" onclick="sendAction('planAsk',{id:'${x.id}'})">${ic(x.asked?'check':'sparkles',13)}<span>${x.asked?'Asked':'Savi'}</span></button><button title="Move forward" onclick="sendAction('planMove',{id:'${x.id}',dir:1})">${ic('right',13)}</button></div>`}
  </div>`;};
 const colOf=(c,list)=>{const n=list.length,all=cards.filter(x=>x.col===c).length,lim=wip[c]|0,over=lim&&all>lim,full=lim&&all===lim;
  const shown=c==='done'?list.slice().sort((a,b)=>(b.doneAt||0)-(a.doneAt||0)).slice(0,12):list.slice().sort((a,b)=>(a.pri===1?0:1)-(b.pri===1?0:1));
  return `<div class="vwp-col kb-col${over?' over-wip':''}" data-col="${c}">
   <div class="kb-head"><span class="kb-hi">${ic(COLI[c]||'list',14)}</span><b>${esc(COLN[c]||c)}</b><span class="kb-n">${n}</span><span style="flex:1"></span>
    ${c==='idea'||c==='done'?'':`<label class="kb-wip${over?' over':full?' full':''}" title="WIP limit: the most cards ${COLN[c]} should hold (0 = none)">${lim?`${all}/`:'limit '}<input type="number" min="0" max="99" value="${lim||''}" placeholder="–" onchange="sendAction('planFlow',{wip:{col:'${c}',n:+this.value||0}})"></label>`}</div>
   ${over?`<div class="kb-warn">Over limit: finish one before starting another</div>`:''}
   ${shown.map(card).join('')||`<div class="kb-empty">Drop cards here</div>`}
   ${c==='done'&&n>12?`<div class="kb-empty">+${n-12} older finished</div>`:''}
  </div>`;};
 const lanes=!group?[['',cards]]:(()=>{const key=c=>group==='ms'?(c.ms||''):group==='pri'?String(c.pri|0):c.tag||'';
  const order=group==='ms'?[...ms.map(m=>m.name),'']:group==='pri'?[...PRI.map((_,i)=>String(i)).slice(1),'0']:TAGS;
  const m=new Map(order.map(o=>[o,[]]));for(const c of cards){const k=key(c);if(!m.has(k))m.set(k,[]);m.get(k).push(c);}
  return [...m].filter(([,l])=>l.length);})();
 const laneName=k=>group==='ms'?(k||'No epic'):group==='pri'?(PRI[+k]||PRI[0])[0]:k;
 const body=lanes.map(([k,list])=>{const grid=`<div class="vwp-cols kb-cols">${COLS.map(c=>colOf(c,list.filter(x=>x.col===c))).join('')}</div>`;
  if(!group)return grid;const d=list.filter(c=>c.col==='done').length;
  return `<details class="kb-lane" open><summary>${group==='pri'?priIcon(+k):group==='tag'?`<span class="kb-tag" style="--c:${TAGC[k]}">${k}</span>`:ic('flag',14)}<b>${esc(group==='tag'?'':laneName(k))}</b><span class="kb-n">${list.length}</span><span class="kb-prog"><i style="width:${list.length?Math.round(d/list.length*100):0}%"></i></span><span class="kb-n">${list.length?Math.round(d/list.length*100):0}% done</span></summary>${grid}</details>`;}).join('');
 const TCSS=TAGS.map(t=>`html[data-kbf="t-${t}"] #vwp-tablet .kb-chip[data-f="t-${t}"]{background:var(--c);color:#000}html[data-kbf="t-${t}"] #vwp-tablet .kb-card:not([data-tag="${t}"]){display:none!important}html[data-kbf="t-${t}"] #vwp-tablet .kb-lane:not(:has(.kb-card[data-tag="${t}"])){display:none!important}`).join('')+`#vwp-tablet .kb-cols{grid-template-columns:repeat(${COLS.length},minmax(180px,1fr))!important}`;
 return `<style>${CSS}${TCSS}</style>${tools}${custom}${flow}${emptyState({id:'sl-board-filter-empty',hidden:true,title:'No matching tasks',text:'Try another search or clear the task filters.',primary:{label:'Clear task filters',click:clearBoardFilters}})}<div onpointerdown="${CDRAG}">${body}</div>`;
}
const CSS=`
#vwp-tablet .kb-tools{display:flex;gap:8px;align-items:center;margin-bottom:8px}
#vwp-tablet .kb-search{flex:1;display:flex;align-items:center;gap:6px;padding:0 10px;height:32px;border-radius:10px;background:rgba(118,118,128,.24);color:rgba(235,235,245,.6)}
#vwp-tablet .kb-search input{flex:1;background:transparent!important;border:0!important;box-shadow:none!important;color:#fff;font-size:13px;padding:0!important;height:30px;outline:none}
#vwp-tablet .kb-segs{display:flex;padding:2px;border-radius:9px;background:rgba(118,118,128,.24)}
#vwp-tablet .kb-seg{background:transparent;border:0;color:rgba(235,235,245,.75);font-size:12px;font-weight:500;padding:5px 11px;border-radius:7px;cursor:pointer}
#vwp-tablet .kb-seg.on{background:rgba(255,255,255,.2);color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25)}
#vwp-tablet .kb-new{display:flex;align-items:center;gap:5px;background:#a37d45;border:0;color:#fff;font-weight:600;font-size:13px;height:32px;padding:0 13px 0 10px;border-radius:16px;cursor:pointer}
#vwp-tablet .kb-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;align-items:center}
#vwp-tablet .kb-chip{--c:#d1d1d6;background:rgba(118,118,128,.18);border:0;color:rgba(235,235,245,.85);font-size:11.5px;padding:4px 10px;border-radius:13px;cursor:pointer;text-transform:capitalize}
#vwp-tablet .kb-chip i{font-style:normal;opacity:.55;margin-left:2px}
#vwp-tablet .kb-sep{width:1px;height:16px;background:rgba(255,255,255,.15);margin:0 2px}
html:not([data-kbf]) #vwp-tablet .kb-chip[data-f=all],html[data-kbf=""] #vwp-tablet .kb-chip[data-f=all]{background:#fff;color:#000}
${['mine','blocked','aging','urgent'].map(f=>`html[data-kbf=${f}] #vwp-tablet .kb-chip[data-f=${f}]{background:var(--c);color:#000}html[data-kbf=${f}] #vwp-tablet .kb-card:not([data-${f}]){display:none!important}html[data-kbf=${f}] #vwp-tablet .kb-lane:not(:has(.kb-card[data-${f}])){display:none!important}`).join('')}
#vwp-tablet .kb-quick{width:100%;box-sizing:border-box;margin-bottom:10px;height:34px;font-size:13px;padding:0 12px!important}
#vwp-tablet .kb-flow{display:flex;gap:8px;margin-bottom:12px;overflow-x:auto}
#vwp-tablet .kb-stat{flex:none;display:flex;flex-direction:column;gap:1px;padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.1);min-width:74px}
#vwp-tablet .kb-stat b{font-size:17px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
#vwp-tablet .kb-stat span{font-size:10.5px;color:rgba(235,235,245,.55);white-space:nowrap}
#vwp-tablet .kb-old{cursor:pointer;flex:1;min-width:0}#vwp-tablet .kb-old span{overflow:hidden;text-overflow:ellipsis}
#vwp-tablet .kb-old:hover{background:rgba(255,255,255,.1)}
#vwp-tablet .kb-cols{justify-content:stretch!important}
#vwp-tablet .kb-col{padding:0 7px 7px!important}
#vwp-tablet .kb-col.over-wip{box-shadow:inset 0 0 0 1.5px rgba(255,69,58,.7)!important;background:rgba(255,69,58,.07)!important}
#vwp-tablet .kb-head{display:flex;align-items:center;gap:6px;padding:9px 3px 6px;position:sticky;top:0;z-index:1;font-size:12.5px;color:#fff}
#vwp-tablet .kb-hi{color:rgba(235,235,245,.6)}
#vwp-tablet .kb-n{font-size:11px;color:rgba(235,235,245,.5);font-variant-numeric:tabular-nums}
#vwp-tablet .kb-wip{display:flex;align-items:center;font-size:10.5px;color:rgba(235,235,245,.5);padding:1px 2px 1px 7px;border-radius:8px;background:rgba(118,118,128,.18)}
#vwp-tablet .kb-wip input{width:24px!important;height:18px!important;padding:0 2px!important;font-size:10.5px!important;background:transparent!important;text-align:center;-moz-appearance:textfield;color:inherit}
#vwp-tablet .kb-wip input::-webkit-inner-spin-button{display:none}
#vwp-tablet .kb-wip.full{color:#ffd60a}#vwp-tablet .kb-wip.over{color:#fff;background:#ff453a}
#vwp-tablet .kb-warn{font-size:10.5px;color:#ff6961;padding:0 3px 4px}
#vwp-tablet .kb-empty{font-size:11px;color:rgba(235,235,245,.35);padding:14px 4px;text-align:center;border:1px dashed rgba(255,255,255,.1);border-radius:12px;margin-top:4px}
#vwp-tablet .kb-fresh::after{content:'';position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:50%;background:#0a84ff;box-shadow:0 0 6px #0a84ff}.kb-card{background:rgba(255,255,255,.08)!important;margin:6px 0;padding:9px 10px 8px;cursor:grab;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.08);position:relative;overflow:hidden}
#vwp-tablet .kb-card[data-urgent]{box-shadow:inset 3px 0 0 #ff453a,inset 0 0 0 .5px rgba(255,255,255,.08)}
#vwp-tablet .kb-blocked{background:rgba(255,69,58,.12)!important;box-shadow:inset 0 0 0 1px rgba(255,69,58,.45)!important}
#vwp-tablet .kb-shot{width:calc(100% + 20px);margin:-9px -10px 8px;height:70px;object-fit:cover;display:block}
#vwp-tablet .kb-top{display:flex;gap:7px;align-items:flex-start}
#vwp-tablet .kb-pri{background:transparent!important;border:0!important;padding:2px!important;margin:-1px 0 0 -2px;cursor:pointer;border-radius:5px!important;flex:none}
#vwp-tablet .kb-pri:hover{background:rgba(255,255,255,.12)!important}
#vwp-tablet .kb-title{flex:1;min-width:0;outline:none;cursor:text;font-size:13px;line-height:1.32;overflow-wrap:anywhere;color:#fff;font-weight:500}
#vwp-tablet .kb-why{display:flex;align-items:center;gap:4px;font-size:11px;color:#ff6961;margin:5px 0 0 21px}
#vwp-tablet .kb-meta{display:flex;gap:6px;align-items:center;margin:7px 0 0 21px;font-size:10.5px;color:rgba(235,235,245,.55);min-width:0}
#vwp-tablet .kb-tag{--c:#8e8e93;display:inline-flex;align-items:center;gap:4px;color:rgba(235,235,245,.8);white-space:nowrap;text-transform:capitalize}
#vwp-tablet .kb-tag::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--c)}
#vwp-tablet .kb-ms{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,.08)}
#vwp-tablet .kb-age{font-variant-numeric:tabular-nums;white-space:nowrap;padding:1px 6px;border-radius:6px}
#vwp-tablet .kb-age.h1{background:rgba(255,159,10,.2);color:#ffb340}#vwp-tablet .kb-age.h2{background:rgba(255,69,58,.22);color:#ff6961}
#vwp-tablet .kb-acts{display:flex;gap:4px;margin:0 0 0 17px;max-height:0;opacity:0;overflow:hidden;transition:max-height .2s,opacity .15s,margin .2s}
#vwp-tablet .kb-card:hover .kb-acts,#vwp-tablet .kb-card:focus-within .kb-acts{max-height:30px;opacity:1;margin-top:7px}
#vwp-tablet .kb-acts button{display:inline-flex;align-items:center;gap:3px;background:rgba(118,118,128,.24)!important;border:0!important;color:rgba(235,235,245,.85)!important;font-size:11px!important;padding:3px 8px!important;border-radius:9px!important;cursor:pointer;height:auto!important;width:auto!important}
#vwp-tablet .kb-acts button:hover{background:rgba(118,118,128,.4)!important;color:#fff!important}
#vwp-tablet .kb-acts button.on{color:#30d158!important}
#vwp-tablet .kb-lane{margin-bottom:12px;border-radius:16px;background:rgba(255,255,255,.03);padding:2px 6px 6px}
#vwp-tablet .kb-lane>summary{display:flex;align-items:center;gap:8px;padding:8px 6px;cursor:pointer;list-style:none;font-size:13px;color:#fff}
#vwp-tablet .kb-lane>summary::-webkit-details-marker{display:none}
#vwp-tablet .kb-prog{width:80px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}#vwp-tablet .kb-prog i{display:block;height:100%;background:#30d158;border-radius:2px}
@container slate (max-width:700px){#vwp-tablet .kb-cols{grid-template-columns:repeat(5,minmax(200px,1fr))!important;overflow-x:auto}#vwp-tablet .kb-segs{display:none}}
@media (hover:none){#vwp-tablet .kb-acts{max-height:30px;opacity:1;margin-top:7px}}

#vwp-tablet .kb-omni{flex:0 1 340px;min-width:180px;height:30px;position:relative}
#vwp-tablet .kb-omni-hint{display:none;font-size:10.5px;color:#a37d45;white-space:nowrap}
#vwp-tablet .kb-omni.add{box-shadow:inset 0 0 0 1px #a37d45;color:#a37d45}#vwp-tablet .kb-omni.add .kb-omni-hint{display:inline}
#vwp-tablet .kb-tools .kb-segs{margin-left:auto}
#vwp-tablet .kb-new{width:30px;height:30px;padding:0!important;justify-content:center}
#vwp-tablet .kb-cust{display:flex;align-items:center;gap:5px;height:30px;padding:0 11px;border-radius:15px;border:0;background:rgba(118,118,128,.24);color:rgba(235,235,245,.85);font-size:12px;cursor:pointer}
#vwp-tablet .kb-cust.on{background:rgba(255,255,255,.92);color:#000}
#vwp-tablet .kb-custom{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:0 0 12px}
#vwp-tablet .cz-box{border-radius:14px;background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.1);padding:10px}
#vwp-tablet .cz-box header{display:flex;align-items:baseline;gap:8px;margin:0 2px 8px}#vwp-tablet .cz-box header b{font-size:13px;color:#fff;font-weight:600}#vwp-tablet .cz-box header span{flex:1;font-size:10.5px;color:rgba(235,235,245,.5)}
#vwp-tablet .cz-reset{background:none!important;border:0!important;color:rgba(235,235,245,.45)!important;font-size:10.5px!important;cursor:pointer;padding:0!important}#vwp-tablet .cz-reset:hover{color:#fff!important}
#vwp-tablet .cz-row{display:flex;align-items:center;gap:6px;padding:3px 2px}
#vwp-tablet .cz-ico{width:22px;display:flex;justify-content:center;color:rgba(235,235,245,.6)}
#vwp-tablet .cz-col{width:22px!important;height:22px!important;padding:0!important;border:0!important;border-radius:50%!important;background:none!important;cursor:pointer;flex:none}
#vwp-tablet .cz-col::-webkit-color-swatch-wrapper{padding:0}#vwp-tablet .cz-col::-webkit-color-swatch{border:0;border-radius:50%}#vwp-tablet .cz-col::-moz-color-swatch{border:0;border-radius:50%}
#vwp-tablet .cz-name{flex:1;min-width:0;height:26px!important;font-size:12.5px!important;padding:0 8px!important;border-radius:8px!important;background:rgba(118,118,128,.18)!important;border:0!important;color:#fff;display:flex;align-items:center}
#vwp-tablet span.cz-name{background:transparent!important;color:rgba(235,235,245,.5)}
#vwp-tablet .cz-n{font-size:10.5px;color:rgba(235,235,245,.45);min-width:18px;text-align:right;font-variant-numeric:tabular-nums}
#vwp-tablet .cz-ic{width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;background:transparent!important;border:0!important;border-radius:6px!important;color:rgba(235,235,245,.6)!important;cursor:pointer;padding:0!important}
#vwp-tablet .cz-ic:hover:not([disabled]){background:rgba(255,255,255,.1)!important;color:#fff!important}#vwp-tablet .cz-ic[disabled]{opacity:.2;cursor:default}
#vwp-tablet .cz-del:hover{color:#ff6961!important}
#vwp-tablet .cz-lock{font-size:9.5px;color:rgba(235,235,245,.35);width:22px;text-align:center}
#vwp-tablet .cz-add{width:100%;box-sizing:border-box;margin-top:6px;height:28px!important;font-size:12px!important;padding:0 9px!important;border-radius:8px!important;background:transparent!important;border:1px dashed rgba(255,255,255,.15)!important;color:#fff}`;

// REVIEW ROUND: Testing cards one at a time, Tinder-style. Right = approved (Done), left = needs a fix (back to Doing,
// your note on it, Savi told), up = later. One card is drawn at a time, so the deck costs what one card costs.
const SWIPE="if(event.button||event.target.closest('button,textarea'))return;var el=event.currentTarget,sx=event.clientX,sy=event.clientY,dx=0,dy=0,id=el.dataset.id;el.style.transition='none';try{el.setPointerCapture(event.pointerId)}catch(_){}function mv(e){dx=e.clientX-sx;dy=e.clientY-sy;el.style.transform='translate('+dx+'px,'+(dy*0.35)+'px) rotate('+(dx*0.05).toFixed(2)+'deg)';el.dataset.lean=dx>50?'yes':(dx<-50?'no':(dy<-70?'skip':''));}function up(){el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.style.transition='transform .22s ease';var v=dx>120?'yes':(dx<-120?'no':(dy<-120&&Math.abs(dx)<120?'skip':''));if(!v){el.style.transform='';el.dataset.lean='';return}el.style.transform=v==='yes'?'translate(130%,0) rotate(16deg)':(v==='no'?'translate(-130%,0) rotate(-16deg)':'translate(0,-120%)');var n=(document.getElementById('rv-note')||{}).value||'';setTimeout(function(){sendAction('planFlow',{rv:{id:id,v:v,note:n}})},170)}el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);";
export function reviewDeck(plan,scoped,player){
 const skip=player?.state?.planRvSkip||[],all=(scoped.cards||[]).filter(c=>c.col==='test'),left=all.filter(c=>!skip.includes(c.id)),c=left[0];
 const last=player?.state?.planRvLast,tally=player?.state?.planRvTally||{yes:0,no:0};
 const top=`<div class="rv-top"><button class="rv-x" title="Back to the board" onclick="sendAction('planFlow',{review:false})">${ic('left',14)} Board</button><span class="rv-count">${left.length?`${left.length} to review`:'all reviewed'}${skip.length?` · ${skip.length} later`:''}</span><span class="rv-tally"><b class="g">${tally.yes}✓</b> <b class="r">${tally.no}✕</b></span>${last?`<button class="rv-x" title="Undo the last swipe" onclick="sendAction('planFlow',{rvUndo:true})">${ic('undo',13)} Undo</button>`:''}</div>`;
 if(!c)return `<style>${RCSS}</style><div class="rv">${top}<div class="rv-empty"><div style="font-size:42px">✓</div><div>Testing is clear${all.length?'':' in this project'}.</div>${skip.length?`<button class="rv-btn" onclick="sendAction('planFlow',{rvReset:true})">Review the ${skip.length} you saved for later</button>`:''}</div></div>`;
 const pp=(plan.projects||[]).find(p=>p.id===c.proj),img=c.marked||c.shot;
 const next=left[1];
 return `<style>${RCSS}</style><div class="rv">${top}<div class="rv-stage">${next?`<div class="rv-card rv-under"><div class="rv-t">${esc(next.t)}</div></div>`:''}
 <div class="rv-card" data-id="${esc(c.id)}" onpointerdown="${SWIPE}">
  <div class="rv-stamp yes">APPROVE</div><div class="rv-stamp no">FIX</div><div class="rv-stamp skip">LATER</div>
  ${img?`<img class="rv-img" src="${esc(img)}" draggable="false">`:''}
  <div class="rv-meta">${pp?`<span class="kb-pj" style="--c:${pp.color}">${esc(pp.short||pp.name)}</span>`:''}${c.ms?`<span class="rv-ms">${esc(c.ms)}</span>`:''}<span class="kb-tag" style="--c:${TAGC[c.tag]||'#8e8e93'}">${esc(c.tag)}</span></div>
  <div class="rv-t">${esc(c.t)}</div>
  ${c.note?`<div class="rv-n">${esc(c.note)}</div>`:''}${c.accept?`<div class="rv-n"><b>Done when:</b> ${esc(c.accept)}</div>`:''}
  <textarea id="rv-note" class="rv-note" rows="2" placeholder="What needs fixing? (goes with a left swipe)"></textarea>
 </div></div>
 <div class="rv-acts"><button class="rv-b no" title="Needs a fix: back to Doing with your note" onclick="sendAction('planFlow',{rv:{id:'${esc(c.id)}',v:'no',note:(document.getElementById('rv-note')||{}).value||''}})">✕</button><button class="rv-b skip" title="Later" onclick="sendAction('planFlow',{rv:{id:'${esc(c.id)}',v:'skip'}})">${ic('up',18)}</button><button class="rv-b open" title="Open the full ticket" onclick="sendAction('planOpen',{id:'${esc(c.id)}'})">${ic('eye',18)}</button><button class="rv-b yes" title="Approve: Done" onclick="sendAction('planFlow',{rv:{id:'${esc(c.id)}',v:'yes'}})">✓</button></div>
 <div class="rv-hint">drag right to approve · left to send back · up for later</div></div>`;}
export function reviewButton(scoped){const n=(scoped.cards||[]).filter(c=>c.col==='test').length;return `<button class="pj pj-rv${n?'':' dim'}" title="Review round: swipe through Testing" onclick="sendAction('planFlow',{review:true})">${ic('eye',13)} Review <em>${n}</em></button>`;}
const RCSS=`#vwp-tablet .pj-rv{background:linear-gradient(135deg,rgba(48,209,88,.35),rgba(10,132,255,.35));color:#fff;font-weight:600}#vwp-tablet .pj-rv.dim{opacity:.5}
#vwp-tablet .rv{display:flex;flex-direction:column;align-items:center;gap:12px;padding:4px 0 10px;user-select:none}
#vwp-tablet .rv-top{display:flex;align-items:center;gap:10px;width:100%;max-width:520px;font-size:12.5px;color:rgba(235,235,245,.7)}
#vwp-tablet .rv-count{flex:1;text-align:center}#vwp-tablet .rv-tally .g{color:#30d158}#vwp-tablet .rv-tally .r{color:#ff453a}
#vwp-tablet .rv-x{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 10px;border:0;border-radius:14px;background:rgba(118,118,128,.24);color:#fff;font-size:12px;cursor:pointer}
#vwp-tablet .rv-stage{position:relative;width:100%;max-width:440px;min-height:340px}
#vwp-tablet .rv-card{position:relative;z-index:2;box-sizing:border-box;width:100%;min-height:340px;padding:18px;border-radius:24px;background:rgba(44,44,52,.82);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);box-shadow:0 20px 50px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.14);cursor:grab;touch-action:none;display:flex;flex-direction:column;gap:10px;overflow:hidden}
#vwp-tablet .rv-under{position:absolute;inset:0;z-index:1;transform:scale(.94) translateY(14px);opacity:.55;cursor:default;pointer-events:none}
#vwp-tablet .rv-img{width:calc(100% + 36px);margin:-18px -18px 0;max-height:220px;object-fit:cover;pointer-events:none}
#vwp-tablet .rv-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:11px}#vwp-tablet .rv-ms{color:rgba(235,235,245,.6)}
#vwp-tablet .rv-t{font-size:21px;font-weight:700;line-height:1.2;color:#fff;letter-spacing:-.01em}
#vwp-tablet .rv-n{font-size:13.5px;line-height:1.45;color:rgba(235,235,245,.78)}
#vwp-tablet .rv-note{margin-top:auto;width:100%;box-sizing:border-box;resize:none;border:0;border-radius:12px;padding:9px 11px;background:rgba(0,0,0,.28);color:#fff;font:inherit;font-size:13px}
#vwp-tablet .rv-stamp{position:absolute;top:22px;padding:4px 12px;border:3px solid;border-radius:10px;font-weight:800;font-size:20px;letter-spacing:.06em;opacity:0;transition:opacity .1s;pointer-events:none;z-index:3}
#vwp-tablet .rv-stamp.yes{left:20px;color:#30d158;transform:rotate(-12deg)}#vwp-tablet .rv-stamp.no{right:20px;color:#ff453a;transform:rotate(12deg)}#vwp-tablet .rv-stamp.skip{left:50%;margin-left:-44px;color:#ffd60a}
#vwp-tablet .rv-card[data-lean=yes] .rv-stamp.yes,#vwp-tablet .rv-card[data-lean=no] .rv-stamp.no,#vwp-tablet .rv-card[data-lean=skip] .rv-stamp.skip{opacity:1}
#vwp-tablet .rv-acts{display:flex;gap:18px;align-items:center}
#vwp-tablet .rv-b{width:54px;height:54px;border-radius:50%;border:0;display:grid;place-items:center;font-size:24px;font-weight:700;cursor:pointer;background:rgba(118,118,128,.26);color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.35)}
#vwp-tablet .rv-b.yes{width:64px;height:64px;background:#30d158}#vwp-tablet .rv-b.no{width:64px;height:64px;background:#ff453a}
#vwp-tablet .rv-b:active{transform:scale(.92)}#vwp-tablet .rv-hint{font-size:11px;color:rgba(235,235,245,.45)}
#vwp-tablet .rv-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 0;color:rgba(235,235,245,.8);font-size:15px}
#vwp-tablet .rv-btn{height:34px;padding:0 16px;border:0;border-radius:17px;background:#0a84ff;color:#fff;font-size:13px;cursor:pointer}`;

// CUSTOMIZE: the board's own words. columns, ticket types, priority levels; every edit is planFlow {cfg:{op,…}}
function customView(plan){const {cols,tags,pri}=cfgOf(plan),cards=plan.cards||[];
 const F=o=>esc(`sendAction('planFlow',{cfg:${JSON.stringify(o)}})`);
 const Fv=(o,key)=>esc(`sendAction('planFlow',{cfg:Object.assign(${JSON.stringify(o)},{${key}:this.value})})`);
 const arrows=(o,i,n)=>`<button class="cz-ic" ${i?'':'disabled'} title="move up" onclick="${F({...o,dir:-1})}">${ic('up',12)}</button><button class="cz-ic" ${i<n-1?'':'disabled'} title="move down" onclick="${F({...o,dir:1})}">${ic('down',12)}</button>`;
 const add=(ph,op,extra)=>`<input class="cz-add" placeholder="${ph}" onkeydown="if(event.key==='Enter'&&this.value.trim()){sendAction('planFlow',{cfg:{op:'${op}',name:this.value.trim()}});this.value=''}">`;
 const colRows=cols.map((c,i)=>{const n=cards.filter(x=>x.col===c.id).length,lock=LOCKED.includes(c.id);return `<div class="cz-row"><span class="cz-ico">${ic(c.icon||'list',13)}</span><input class="cz-name" value="${esc(c.name||c.id)}" onchange="${Fv({op:'colRen',id:c.id},'name')}"><span class="cz-n">${n}</span>${arrows({op:'colMove',id:c.id},i,cols.length)}${lock?`<span class="cz-lock" title="${c.id==='test'?'Review reads this column':'flow stats read this column'}: rename or move it, it stays">fixed</span>`:`<button class="cz-ic cz-del" title="remove · its ${n} card${n===1?'':'s'} move left" onclick="if(${n}===0||confirm('Remove this column? Its ${n} card${n===1?'':'s'} move to the column before it.'))${F({op:'colDel',id:c.id})}">${ic('xmark',12)}</button>`}</div>`;}).join('');
 const tagRows=tags.map((t,i)=>{const n=cards.filter(x=>x.tag===t.id).length;return `<div class="cz-row"><input type="color" class="cz-col" value="${esc(t.color)}" onchange="${Fv({op:'tagCol',id:t.id},'color')}"><input class="cz-name" value="${esc(t.id)}" onchange="${Fv({op:'tagRen',id:t.id},'name')}"><span class="cz-n">${n}</span>${arrows({op:'tagMove',id:t.id},i,tags.length)}<button class="cz-ic cz-del" title="remove · its cards become notes" onclick="if(${n}===0||confirm('Remove this type? Its ${n} card${n===1?'':'s'} change type.'))${F({op:'tagDel',id:t.id})}">${ic('xmark',12)}</button></div>`;}).join('');
 const priRows=`<div class="cz-row cz-none"><span class="cz-ico">${priIcon(0)}</span><span class="cz-name">None</span><span class="cz-n">${cards.filter(x=>!(x.pri|0)).length}</span></div>`+pri.map((q,k)=>{const i=k+1,n=cards.filter(x=>(x.pri|0)===i).length;return `<div class="cz-row"><input type="color" class="cz-col" value="${esc(q.color)}" onchange="${Fv({op:'priCol',i},'color')}"><input class="cz-name" value="${esc(q.name)}" onchange="${Fv({op:'priRen',i},'name')}"><span class="cz-n">${n}</span>${arrows({op:'priMove',i},k,pri.length)}<button class="cz-ic cz-del" title="remove · its cards drop to None" onclick="if(${n}===0||confirm('Remove this level? Its ${n} card${n===1?'':'s'} drop to None.'))${F({op:'priDel',i})}">${ic('xmark',12)}</button></div>`;}).join('');
 const box=(title,hint,rows,addEl,what)=>`<section class="cz-box"><header><b>${title}</b><span>${hint}</span><button class="cz-reset" onclick="if(confirm('Put the default ${title.toLowerCase()} back?'))${F({op:'reset',what})}">reset</button></header>${rows}${addEl}</section>`;
 return `<div class="kb-custom">${box('Columns','left to right, as the board reads',colRows,add('+ new column, Enter','colAdd'),'cols')}${box('Ticket types','the colour dot on every card',tagRows,add('+ new type, Enter','tagAdd'),'tags')}${box('Priorities','top row is the loudest',priRows,pri.length<6?add('+ new level, Enter','priAdd'):'','pri')}</div>`;}
