import {test,expect} from 'bun:test'
import {assignQuick,quickItems} from '../scripts/lib/quick-items.js'
import {clothToken} from '../scripts/lib/clothes.js'
test('only carried usable items bind, and each item occupies one slot',()=>{
 const s={almonds:2}
 expect(assignQuick(s,0,'almond:grey')).toBe(true)
 expect(assignQuick(s,9,'almond:grey')).toBe(true)
 expect(s.quickSlots).toEqual({9:'almond:grey'})
 expect(assignQuick(s,10,'almond:grey')).toBe(false)
 expect(assignQuick(s,1,'almond:blue')).toBe(false)
 expect(assignQuick(s,1,'weapon:pistol')).toBe(false)
 s.almonds=0
 expect(quickItems(s).find(x=>x.id===s.quickSlots[9]).count).toBe(0)
 expect(assignQuick(s,9,'')).toBe(true)
 expect(s.quickSlots).toEqual({})
})
test('weapons bind and unavailable weapons retain their slot',()=>{
 const s={weapons:'pistol,shotgun'}
 expect(assignQuick(s,1,'weapon:pistol')).toBe(true)
 expect(quickItems(s).find(x=>x.id==='weapon:pistol').action).toEqual({k:'equip',w:'pistol'})
 s.weapons='shotgun'
 expect(quickItems(s).find(x=>x.id==='weapon:pistol').count).toBe(0)
 expect(s.quickSlots[1]).toBe('weapon:pistol')
})
test('armor slots respect whether clothing is available',()=>{
 const armor=clothToken('topw','tee','f4f1ea'), s={clothes:armor}
 expect(assignQuick(s,2,armor)).toBe(true)
 const item=quickItems(s).find(x=>x.id===armor)
 expect(item.action).toEqual({k:'wear',w:armor})
})
test('malformed saved quick slots do not break the inventory',()=>{
 expect(()=>quickItems({quickSlots:{0:null,1:42}})).not.toThrow()
})
