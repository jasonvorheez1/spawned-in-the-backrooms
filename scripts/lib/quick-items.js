import SNACKS from './data/snacks.yml'
import { MEAT } from './items.js'
export function quickItems(s) {
  const rows = [['grey','almonds'],['green','almondsG'],['red','almondsR'],['blue','almondsB']].map(([c,k]) => ({id:'almond:'+c,name:c+' almond water',count:s[k]??0,action:{k:'drink',c}}))
  for (const [c,v] of Object.entries(MEAT)) rows.push({id:'meat:'+c,name:v.name,count:s.meat?.[c]??0,action:{k:'eat',c}})
  for (const [c,v] of Object.entries(SNACKS)) rows.push({id:'snack:'+c,name:v.name,count:s.snacks?.[c]??0,action:{k:'snack',c}})
  rows.push({id:'compass',name:'Old compass',count:s.compass??0,action:{k:'compass'}},{id:'firesalt',name:'Firesalt',count:s.firesalt??0,action:{k:'firesalt'}},{id:'soup',name:'Bowl of soup',count:s.equipped==='soup_bowl'?1:0,action:{k:'soupEat'}})
  return rows
}
export function assignQuick(s, slot, id) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 9) return false
  if (id && !quickItems(s).some(x=>x.id===id && x.count>0)) return false
  const slots={...(s.quickSlots??{})}
  if(id) for(const k of Object.keys(slots)) if(slots[k]===id) delete slots[k]
  if(id) slots[slot]=id; else delete slots[slot]
  s.quickSlots=slots; return true
}
