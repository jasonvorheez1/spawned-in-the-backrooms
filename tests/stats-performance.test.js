import {test,expect} from 'bun:test'
import {derived,dmgMul,skillsOf,sneakMul} from '../scripts/lib/stats.js'
test('focused enemy stealth and reused damage calculations match existing rules',()=>{
 for(let i=0;i<100;i++){
  const s={attr:Array.from({length:7},(_,j)=>(i+j)%10+1).join(','),skl:Array.from({length:13},(_,j)=>(i*j)%90).join(','),sanity:i%2?0:100,tags:i%3?'sneak,guns':'',look:{}}
  const d=derived(s)
  expect(sneakMul(s)).toBe(Math.max(0.35,1-(skillsOf(s).sneak-15)*0.0065))
  expect(d.melee).toBe(dmgMul(s,{damage:1}))
  expect(d.gun).toBe(dmgMul(s,{ranged:true}))
 }
})
