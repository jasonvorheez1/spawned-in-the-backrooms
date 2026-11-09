import {test,expect,mock} from 'bun:test'
let hit=null,call
mock.module('builtin/physics',()=>({raycast:(...args)=>{call=args;return hit}}))
const {clearSight}=await import('../scripts/lib/sight.js')
test('sight ray reaches the actual target height and includes doors',()=>{
 hit=null
 expect(clearSight({}, {x:0,y:0.7,z:0},{x:3,y:1.7,z:4},['hunter','victim'])).toBe(true)
 const [,o,d,opts]=call
 expect(opts.bodies).toBe('all')
 expect(opts.ignoreEntities).toEqual(['hunter','victim'])
 expect(o.y+d.y*opts.distance).toBeCloseTo(1.7)
 hit={id:'closed-door',distance:1}
 expect(clearSight({},o,{x:3,y:1.7,z:4})).toBe(false)
 hit=null
 expect(clearSight({},o,{x:3,y:1.7,z:4})).toBe(true)
})
import {readFileSync} from 'node:fs'
test('NPCs require a sighting, retain visible targets, and forget hidden ones',()=>{
 const src=readFileSync(new URL('../scripts/meg-agent.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')
 const start=src.indexOf('function inView('),end=src.indexOf('\n}',start)+2
 let visible=false,now=0
 const inView=Function('seesIt',src.slice(start,end)+';return inView')(()=>visible)
 const ctx={now:()=>now},m={},target={id:'victim'}
 expect(inView(ctx,{},m,target,5)).toBe(false)
 visible=true;now=501;expect(inView(ctx,{},m,target,5)).toBe(true)
 now=10000;expect(inView(ctx,{},m,target,5)).toBe(true)
 visible=false;now=10501;expect(inView(ctx,{},m,target,5)).toBe(true)
 now=16000;expect(inView(ctx,{},m,target,5)).toBe(false)
})
