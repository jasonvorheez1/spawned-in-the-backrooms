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
