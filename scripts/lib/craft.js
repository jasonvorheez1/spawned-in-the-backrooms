// Recipe rules shared by crafting actions and their menu.
import C from './data/craft.yml'
import {skillsOf,derived,inventoryWeight,pickupWeight,tokenWeight} from './stats.js'
import {knowsRecipe,manualKind,MANUALS} from './manuals.js'
export const CRAFT_LIMIT=100
const LOOSE={baubles:1} // counted at the top of player.state, not in scrap: the Glass Bauble (Shelly: the ornament weapons are made of ornaments)
export const scrapCount=(s,k)=>{const n=Number((LOOSE[k]?s[k]:s.scrap?.[k])??0);return Number.isFinite(n)&&n>0?Math.floor(n):0}
const valid=(r)=>r && Array.isArray(r.out) && r.out.length && r.out.every(t=>typeof t==='string'&&t.length) && Object.keys(r.in??{}).length && Object.values(r.in).every(n=>Number.isInteger(n)&&n>0)
const weights=(r)=>({input:Object.entries(r.in).reduce((kg,[k,n])=>kg+tokenWeight(k)*n,0),output:r.out.reduce((kg,t)=>kg+pickupWeight(t),0)})
export const stationOf=(r)=>!r.bench?'hand':r.bench===true?'bench':r.bench
export const STATION_NAMES={hand:'your hands',bench:'a workbench',cook:'a cooking fire',ammo:'a reloading bench'}
export function recipeStatus(s,id) {
  const r=Object.hasOwn(C.recipes,id)?C.recipes[id]:null
  if(!valid(r))return {ok:false,lack:[],skillOk:false,benchOk:false,roomOk:false,got:0,need:0,bonusChance:0,reason:'Recipe unavailable',known:false}
  const lack=Object.entries(r.in).filter(([k,n])=>scrapCount(s,k)<n).map(([k])=>k),sk=skillsOf(s),need=r.skill?.[1]??0,got=r.skill?(sk[r.skill[0]]??0):0,skillOk=got>=need,benchOk=!r.bench||(s.craftOpen==='bench'&&(s.craftStation??'bench')===stationOf(r)),w=weights(r)
  const known=knowsRecipe(s,r),roomOk=w.output===0 || inventoryWeight(s)-w.input+w.output<=derived(s).carry+1e-6
  return {ok:known&&!lack.length&&skillOk&&benchOk&&roomOk,known,manual:manualKind(r),lack,skillOk,benchOk,roomOk,got,need,bonusChance:r.skill?Math.max(0,Math.min(1,(got-need)/100)):0,reason:!known?'Find the '+MANUALS[manualKind(r)].name:!benchOk?'Needs '+STATION_NAMES[stationOf(r)]:!skillOk?'Skill too low':lack.length?'Missing ingredients':!roomOk?'No room for the complete output':''}
}
export function maxMakes(s,id) {
  const r=Object.hasOwn(C.recipes,id)?C.recipes[id]:null
  if(!valid(r))return 0
  const materials=Math.min(CRAFT_LIMIT,...Object.entries(r.in).map(([k,n])=>Math.floor(scrapCount(s,k)/n)))
  if(!materials)return 0
  const w=weights(r),now=inventoryWeight(s),cap=derived(s).carry
  if(!w.output)return materials
  let count=0
  for(let n=1;n<=materials;n++){
    if(now+n*(w.output-w.input)>cap+1e-6)break
    count=n
  }
  return count
}
export function craftOne(s,id,give,bonus=false) {
  const status=recipeStatus(s,id),r=Object.hasOwn(C.recipes,id)?C.recipes[id]:null
  if(!status.ok)return {ok:false,msg:status.reason}
  // Inventory grants use copy-on-write state; nothing reaches the live player until the whole recipe succeeds.
  let draft={...s,scrap:{...(s.scrap??{})},snacks:{...(s.snacks??{})},meat:{...(s.meat??{})}}
  for(const [k,n]of Object.entries(r.in)){if(LOOSE[k])draft[k]=scrapCount(s,k)-n;else draft.scrap[k]=scrapCount(s,k)-n}
  for(const token of r.out){const result=give(draft,token);if(!result?.ok)return {ok:false,msg:result?.msg||result?.why||'Output could not be stored'}}
  let extra=0
  if(bonus){const candidate={...draft,scrap:{...draft.scrap},snacks:{...draft.snacks},meat:{...draft.meat}};if(give(candidate,r.out[0])?.ok){draft=candidate;extra=1}}
  return {ok:true,state:draft,extra}
}
export function benchAvailable(player,bench) {
  if(!bench || !bench.tags?.includes('bench') || bench.visible===false || bench.state?.broke || bench.state?.hp!=null&&bench.state.hp<=0)return false
  const a=player.worldFeetPosition??player.feetPosition,b=bench.worldFeetPosition??bench.feetPosition
  return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=4.5
}
export const CATS=[['all','ALL'],['ready','READY'],['weapons','WEAPONS'],['ammo','AMMO'],['aid','AID'],['tools','TOOLS'],['armor','ARMOR'],['food','FOOD']]
