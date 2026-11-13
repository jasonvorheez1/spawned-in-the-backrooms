// FLOW: the game as the player walks it. Phases left to right; each phase plays its beats like a song
// and names its mechanics, its cast, their lines, and the tickets that build it.
// L.flow = [{ id, t, sub, hue, mech:[str], beats:[pageId], chars:[pageId], lines:[{id,who,text,clip}], tix:[cardId] }]
// L.lanes = [{id,name}] — separate flows (campaign, a mode); a phase's lane defaults to the first.
// Per player: state.flowSel (open phase), state.flowLane (open flow).
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
const okClip=u=>typeof u==='string'&&/^(\/?cdn\/|https:\/\/[\w.-]+\.spawnfile\.io\/)/.test(u)&&!/["'<>\s]/.test(u);
const mv=(a,i,j)=>{if(j<0||j>=a.length)return a;const b=[...a];const [x]=b.splice(i,1);b.splice(j,0,x);return b;};
export const TEMPLATE=[
 {t:'First steps',sub:'where the player wakes, what they learn first',hue:150},
 {t:'The core loop',sub:'the thing they do again and again',hue:220},
 {t:'The big moment',sub:'the boss, the reveal, the win',hue:30},
];
export function flowOp(ctx,p,d,L,plan,id,V){V=V||p.state;
 const op=d.op;L.flow=Array.isArray(L.flow)?L.flow:[];
 if(!Array.isArray(L.lanes)||!L.lanes.length)L.lanes=[{id:'campaign',name:'Campaign'}];
 const lane0=L.lanes[0].id,laneOf=x=>L.lanes.some(l=>l.id===x.lane)?x.lane:lane0,cur=L.lanes.some(l=>l.id===V.flowLane)?V.flowLane:lane0;
 if(op==='flowLane'){V.flowLane=L.lanes.some(l=>l.id===d.lane)?d.lane:lane0;V.flowSel=null;V.loomCh='flow';V.loomPage=null;return 'nosave';}
 if(op==='flowLaneAdd'){const n=clip(d.name,40).trim();if(!n)return 'nosave';const l={id:id(),name:n};L.lanes.push(l);V.flowLane=l.id;V.flowSel=null;return;}
 if(op==='flowLaneRen'){const l=L.lanes.find(x=>x.id===d.lane),n=clip(d.name,40).trim();if(!l||!n)return 'nosave';l.name=n;return;}
 if(op==='flowLaneDel'){if(d.lane===lane0)return 'nosave';for(const x of L.flow)if(x.lane===d.lane)x.lane=lane0;L.lanes=L.lanes.filter(l=>l.id!==d.lane);V.flowLane=lane0;return;}
 const ph=d.ph&&L.flow.find(x=>x.id===d.ph);
 if(op==='flowSel'){V.flowSel=d.ph?clip(d.ph,40):null;V.loomCh='flow';V.loomPage=null;return 'nosave';}
 if(op==='flowAdd'){const n={id:id(),t:clip(d.t,60).trim()||'New phase',sub:'',hue:Math.round((L.flow.length*67+150)%360),lane:cur,mech:[],beats:[],chars:[],lines:[],tix:[]};L.flow.push(n);V.flowSel=n.id;return;}
 if(!ph)return 'nosave';
 if(op==='flowEdit'){if(d.t!==undefined&&clip(d.t,60).trim())ph.t=clip(d.t,60).trim();if(d.sub!==undefined)ph.sub=clip(d.sub,160);if(Number.isFinite(+d.hue))ph.hue=Math.round(+d.hue)%360;return;}
 if(op==='flowMove'){const same=L.flow.filter(x=>laneOf(x)===laneOf(ph)),k=same.indexOf(ph),o=same[k+(d.dir<0?-1:1)];if(!o)return 'nosave';const i=L.flow.indexOf(ph),j=L.flow.indexOf(o);L.flow[i]=o;L.flow[j]=ph;return;}
 if(op==='flowToLane'){if(!L.lanes.some(l=>l.id===d.lane))return 'nosave';ph.lane=d.lane;V.flowLane=d.lane;return;}
 if(op==='flowDel'){L.flow=L.flow.filter(x=>x!==ph);if(V.flowSel===ph.id)V.flowSel=null;return;}
 const list=k=>{ph[k]=Array.isArray(ph[k])?ph[k]:[];return ph[k];};
 if(op==='flowTicket'){const t=clip(d.t,120).trim();if(!t)return 'nosave';const c={id:id(),t,col:'idea',tag:'feature',ms:ph.ms||'',by:p.displayName,phase:ph.id,sourceRefs:['f:'+ph.id]};if(ph.proj)c.proj=ph.proj;plan.cards.push(c);ph.tix=[...list('tix'),c.id];V.planOpen=c.id;return 'plan';}
 if(op==='flowPush'){const k=d.k;if(!['mech','beats','chars','tix'].includes(k))return 'nosave';const v=clip(d.v,k==='mech'?60:40).trim();if(!v)return 'nosave';const a=list(k);if(!a.includes(v))a.push(v);ph[k]=a;return;}
 if(op==='flowPull'){const k=d.k;if(!['mech','beats','chars','tix'].includes(k))return 'nosave';ph[k]=list(k).filter(x=>x!==d.v);return;}
 if(op==='flowShift'){const k=d.k;if(!['beats','mech'].includes(k))return 'nosave';const a=list(k),i=a.indexOf(d.v);ph[k]=mv(a,i,i+(d.dir<0?-1:1));return;}
 if(op==='flowNewBeat'){const t=clip(d.t,120).trim();if(!t||!L.chapters.some(c=>c.id===d.ch))return 'nosave';const pid=id();L.pages.push({id:pid,ch:d.ch,sec:clip(ph.t,40),t,body:'',hero:false,feat:'',tix:[],by:p.displayName,at:ctx.now()});const a=list('beats');a.push(pid);ph.beats=a;return;}
 if(op==='flowMusic'){const a=list('music');
  if(d.del){ph.music=a.filter(x=>x.id!==d.del);return;}
  if(d.mid){const m=a.find(x=>x.id===d.mid);if(!m)return 'nosave';if(d.note!==undefined)m.note=clip(d.note,120);return;}
  const c=String(d.clip||'').trim();if(!okClip(c))return 'nosave';a.push({id:id(),clip:c,note:clip(d.note,120)});ph.music=a;return;}
 if(op==='flowLine'){const a=list('lines');
  if(d.del){ph.lines=a.filter(x=>x.id!==d.del);return;}
  if(d.lid){const l=a.find(x=>x.id===d.lid);if(!l)return 'nosave';if(d.text!==undefined)l.text=clip(d.text,300);if(d.who!==undefined)l.who=clip(d.who,40);if(d.clip!==undefined)l.clip=okClip(d.clip)?d.clip:'';return;}
  const text=clip(d.text,300).trim();if(!text)return 'nosave';a.push({id:id(),who:clip(d.who,40),text,clip:''});ph.lines=a;return;}
 if(op==='flowVoice'){const l=list('lines').find(x=>x.id===d.lid);if(!l)return 'nosave';l.asked=ctx.now();
  const who=L.pages.find(x=>x.id===l.who)?.t||l.who||'narrator';
  ctx.notifyDm(`FLOW voice ask from ${p.displayName}: voice this line for ${who} (phase "${ph.t}"), keep that character's one voice. Line: "${l.text}". Then set world.state.loom.flow[id=${ph.id}].lines[id=${l.id}].clip to the /cdn/ address.`);return;}
 return 'nosave';
}
