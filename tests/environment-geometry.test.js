import {test,expect} from 'bun:test'
import {rounded} from '../scripts/lib/shapes.js'
import {geometry as office} from '../scripts/l4-office-geo.js'
import {geometry as props} from '../scripts/l4-prop-geo.js'
import {geometry as room} from '../scripts/l7-room-geo.js'
function capture(lod,kind){
 const triangles=[],base={lod,params:{kind},tri(...v){triangles.push(v)},quad(...v){triangles.push([...v.slice(0,9)],[...v.slice(0,3),...v.slice(6,12)])}}
 return {triangles,ctx:new Proxy(base,{get:(o,k)=>k in o?o[k]:()=>{}})}
}
test('padded forms are closed, outward and bounded at every detail level',()=>{
 let close;
 for(const lod of [0,1,2,3,4]){
  const {ctx,triangles}=capture(lod);rounded(ctx,[0,0,0],[.24,.04,.23],.038)
  const edges=new Map(),bounds=[0,0,0];
  for(const t of triangles){expect(t.every(Number.isFinite)).toBe(true);const p=[t.slice(0,3),t.slice(3,6),t.slice(6,9)],a=p[1].map((n,i)=>n-p[0][i]),b=p[2].map((n,i)=>n-p[0][i]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],c=p[0].map((v,i)=>(v+p[1][i]+p[2][i])/3);
   expect(n.reduce((s,v,i)=>s+v*c[i],0)).toBeGreaterThan(0)
   for(let i=0;i<3;i++){for(let j=0;j<3;j++)bounds[j]=Math.max(bounds[j],Math.abs(p[i][j]));const key=[p[i],p[(i+1)%3]].map(v=>v.map(n=>n.toFixed(6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)??0)+1)}
  }
  expect(bounds).toEqual([.24,.04,.23]);expect([...edges.values()].every(n=>n===2)).toBe(true)
  if(lod===0)close=triangles.length;if(lod>=3)expect(triangles.length).toBeLessThan(close)
 }
})
test('office and flooded-room furnishings remain finite with cheaper distant geometry',()=>{
 for(const [fn,kinds]of [[office,['island','terminal','printer']],[props,['chair','boxes','plant','panel','cabinet']],[room,['table','drawers','armoire','chair','troffer','boulder','pedestal','wirerack','hearth']]])for(const kind of kinds){
  const counts=[];for(const lod of [0,3]){const {ctx,triangles}=capture(lod,kind);fn(ctx);expect(triangles.length).toBeGreaterThan(0);expect(triangles.every(t=>t.length===9&&t.every(Number.isFinite)),fn.name+":"+kind+":"+lod).toBe(true);counts.push(triangles.length)}
  expect(counts[1]).toBeLessThanOrEqual(counts[0])
 }
})

import {geometry as warehouse} from '../scripts/level1-props-geo.js'
import {geometry as electrical} from '../scripts/level3-geo.js'
import {geometry as camp} from '../scripts/meg-camp-geo.js'
test('large environment meshes stay finite and within the detail budget',()=>{
 for(const fn of [warehouse,electrical,camp])for(const lod of [0,3]){
  let triangles=0,invalid=0;const emit=(p,n)=>{triangles+=n;if(!p.every(Number.isFinite))invalid++};
  const base={lod,params:{},tri(...p){emit(p,1)},quad(...p){emit(p,2)}};fn(new Proxy(base,{get:(o,k)=>k in o?o[k]:()=>{}}));
  expect(invalid).toBe(0);expect(triangles).toBeLessThan(lod===3?130000:230000)
 }
})
