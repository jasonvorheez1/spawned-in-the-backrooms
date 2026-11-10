import {test,expect} from 'bun:test'
import {stepToward} from '../scripts/lib/maze0path.js'
import {N,cellCenter,inHub,hasPit} from '../scripts/lib/maze.js'
test('same-cell steering cannot enter a safe room or pit',()=>{
 let checked=0
 for(let x=0;x<N;x++)for(let z=0;z<N;z++)if(inHub(x,z)||hasPit(x,z)) {
  const p=cellCenter(x,z);expect(stepToward(p.x,p.z,p.x+0.1,p.z+0.1)).toBeNull();checked++
 }
 expect(checked).toBeGreaterThan(0)
})
test('shared maze routes return independent waypoints',()=>{
 for(let x=0;x<N-1;x++)for(let z=0;z<N;z++){
  const a=cellCenter(x,z),b=cellCenter(x+1,z),r=stepToward(a.x,a.z,b.x,b.z,1)
  if(r?.cells){const old=r.next.x;r.next.x=999;expect(stepToward(a.x,a.z,b.x,b.z,1).next.x).toBe(old);return}
 }
 throw Error('No route found')
})
