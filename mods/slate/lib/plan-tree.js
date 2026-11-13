import {scopeOf} from './auto-context.js';
// Generic hierarchy adapted from @robot/mog; epics remain canonical plan.ms rows.
export const epicKey=id=>'epic:'+id;
export function issue(plan,id){const c=(plan.cards||[]).find(c=>c.id===id);if(c)return c;const m=(plan.ms||[]).find(m=>epicKey(m.id)===id);return m?{...m,id:epicKey(m.id),epicId:m.id,t:m.name,tag:'epic',ms:m.name}:null;}
export function canParent(plan,id,to){if(!to)return true;const map=new Map((plan.cards||[]).map(c=>[c.id,c])),seen=new Set([id]);const a=map.get(id),b=map.get(to);if(a&&b&&scopeOf(plan,a)&&scopeOf(plan,a)!==scopeOf(plan,b))return false;let p=to;for(let n=0;n<=map.size;n++){if(!p)return true;if(seen.has(p)||!map.has(p))return false;seen.add(p);p=map.get(p).parent;}return false;}
export function children(plan,c){return (plan.cards||[]).filter(k=>k.id!==c.id&&(c.epicId?k.ms===c.ms:k.parent===c.id));}
export function progress(plan,c){const map=new Map();for(const k of plan.cards||[]){if(!map.has(k.parent))map.set(k.parent,[]);map.get(k.parent).push(k);}const seen=new Set([c.id]),queue=children(plan,c).slice(),out=[];for(let i=0;i<queue.length;i++){const k=queue[i];if(seen.has(k.id))continue;seen.add(k.id);out.push(k);for(const ch of map.get(k.id)||[])if(!seen.has(ch.id))queue.push(ch);}return {total:out.length,done:out.filter(k=>k.col==='done').length};}
