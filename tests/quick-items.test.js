import {test,expect} from 'bun:test'
import {assignQuick,quickItems} from '../scripts/lib/quick-items.js'
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
import {wornTokens,fullLook} from '../scripts/lib/clothes.js'
test('equipment binds and unavailable equipment retains its slot',()=>{
 const look=fullLook({}), armor=wornTokens(look)[0], s={weapons:'pistol,shotgun',look,clothes:''}
 expect(assignQuick(s,1,'weapon:pistol')).toBe(true)
 expect(assignQuick(s,2,armor)).toBe(true)
 expect(quickItems(s).find(x=>x.id==='weapon:pistol').action).toEqual({k:'equip',w:'pistol'})
 expect(quickItems(s).find(x=>x.id===armor).action).toEqual({k:'wear',w:armor})
 s.weapons='shotgun'
 expect(quickItems(s).find(x=>x.id==='weapon:pistol').count).toBe(0)
 expect(s.quickSlots[1]).toBe('weapon:pistol')
})
