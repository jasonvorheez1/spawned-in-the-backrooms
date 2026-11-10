import {test,expect} from 'bun:test'
import {geometry as mall} from '../scripts/l11-mall.js'
test('reference canopy keeps a shallow silhouette, finite surfaces and bounded detail',()=>{
 const counts=[];
 for(const lod of [0,3])for(const d of [5.5,7]){
  let metal=0;let triangles=0,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  const check=p=>{expect(p.every(Number.isFinite)).toBe(true);for(let i=0;i<p.length;i+=3){if(metal>.4&&p[i]>=0&&p[i]<=2)expect(p[i+1]).toBeLessThan(-.34*p[i]/2-.035*Math.sin(p[i]*Math.PI/2));maxX=Math.max(maxX,p[i]);minY=Math.min(minY,p[i+1]);maxY=Math.max(maxY,p[i+1])}};
  const base={lod,metalness(v){metal=v},params:{kind:'awning',p:2,r:.85,d},tri(...p){triangles++;check(p)},quad(...p){triangles+=2;check(p)}};
  mall(new Proxy(base,{get:(o,k)=>k in o?o[k]:()=>{}}));expect(maxX).toBeCloseTo(2.015);expect(minY).toBeGreaterThan(-.7);expect(maxY).toBeLessThanOrEqual(.001);expect(triangles).toBeLessThan(1200);counts.push(triangles)
 }
 expect(counts[2]).toBeLessThan(counts[0]);expect(counts[3]).toBeLessThan(counts[1])
})
