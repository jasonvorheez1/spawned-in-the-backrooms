// Rename everywhere: one name changed across the whole book, the board and the journal.
// p.state.loomRen = { from, to, hits:[{k,id,f,title,snip}] } while the creator reviews; apply writes only the ticked hits.
const clip=(v,n)=>String(v??'').replace(/[<>]/g,'').slice(0,n);
const reOf=from=>new RegExp(`(?<![\\w])${from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\w])`,'gi');
const fit=(m,to,from)=>m===from?to:m===m.toUpperCase()&&m!==m.toLowerCase()?to.toUpperCase():m[0]===m[0].toUpperCase()&&m[0]!==m[0].toLowerCase()&&to[0]?to[0].toUpperCase()+to.slice(1):to;
const FIELDS={page:['t','sec','body','feat'],card:['t','note','accept'],note:['t'],chapter:['name']};
function* spots(L,plan){
 for(const c of L.chapters||[])yield ['chapter',c,c.name];
 for(const p of L.pages||[])yield ['page',p,p.t];
 for(const c of plan.cards||[])yield ['card',c,c.t];
 for(const n of plan.diary||[])yield ['note',n,String(n.t).slice(0,40)];
}
export function scan(L,plan,from){
 from=clip(from,60).trim();if(from.length<2)return [];const re=reOf(from),hits=[];
 for(const [k,o,title] of spots(L,plan))for(const f of FIELDS[k]){const v=String(o[f]??'');re.lastIndex=0;const m=re.exec(v);if(!m)continue;const n=(v.match(re)||[]).length;
  hits.push({k,id:o.id,f,title:clip(title,60),n,snip:clip(v.slice(Math.max(0,m.index-40),m.index+from.length+40).replace(/\s+/g,' '),120),at:Math.min(40,m.index)});}
 return hits.slice(0,300);
}
export function apply(L,plan,from,to,keys){
 from=clip(from,60).trim();to=clip(to,60);if(from.length<2)return 0;const re=reOf(from),want=keys?new Set(keys):null;let n=0;
 for(const [k,o] of spots(L,plan))for(const f of FIELDS[k]){if(want&&!want.has(`${k}|${o.id}|${f}`))continue;const v=o[f];if(typeof v!=='string')continue;const w=v.replace(re,m=>{n++;return fit(m,to,from);});if(w!==v)o[f]=w;}
 return n;
}
