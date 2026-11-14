import {test,expect,mock} from 'bun:test'
let calls=0,answer={ok:true,partial:true,points:[{x:0,y:0,z:0},{x:1,y:0,z:0}]},shouldThrow=false
mock.module('builtin/nav',()=>({findPath:()=>{calls++;if(shouldThrow)throw new Error('navmesh loading');return answer}}))
const {navPath,NAV}=await import('../scripts/lib/nav.js')
let now=100;const ctx={self:{place:'test'},now:()=>now},a={x:0,z:0},b={x:10,z:0}
test('cached routes retain partial status and cannot be mutated by another walker',()=>{
 const first=navPath(ctx,a,b);first.points.shift();first.points[0].x=99
 const second=navPath(ctx,a,b)
 expect(second.partial).toBe(true);expect(second.points.length).toBe(2);expect(second.points[1].x).toBe(1);expect(calls).toBe(1)
})
test('cache distinguishes endpoints and body radius and respects budget',()=>{
 now=200
 navPath(ctx,{x:0.1,z:0},b);navPath(ctx,{x:0.2,z:0},b);navPath(ctx,a,b,{radius:0.6})
 expect(calls).toBe(4)
 expect(navPath(ctx,a,{x:20,z:0}).wait).toBe(true)
})
test('expired and explicitly fresh routes are recalculated',()=>{
 now=1000;navPath(ctx,a,b);const count=calls
 navPath(ctx,a,b,{fresh:true});expect(calls).toBe(count+1)
 now+=NAV.cacheMs+1;navPath(ctx,a,b);expect(calls).toBe(count+2)
})
test('navmesh loading, null returns, and thrown errors yield wait without poisoning cache',()=>{
 const dest={x:42,z:12}
 for (const state of ['throw', null, {ok:false,loading:true}, {ok:false,ready:false}, {ok:false,status:'loading'}]) {
  now+=50
  shouldThrow = state==='throw'
  answer = state==='throw' ? null : state
  const res = navPath(ctx,a,dest)
  expect(res.wait).toBe(true)
  expect(res.loading).toBe(true)
  expect(res.points).toBeNull()
 }
 shouldThrow=false
 answer={ok:true,partial:false,points:[{x:0,y:0,z:0},{x:42,y:0,z:12}]}
 now+=50
 const ready=navPath(ctx,a,dest)
 expect(ready.ok).toBe(true);expect(ready.wait).toBeUndefined();expect(ready.points.length).toBe(2)
})
test('missing or non-finite coordinates safely return no path without invoking nav engine',()=>{
 const before=calls
 expect(navPath(ctx,null,b).ok).toBe(false)
 expect(navPath(ctx,a,{x:NaN,z:0}).ok).toBe(false)
 expect(calls).toBe(before)
})
