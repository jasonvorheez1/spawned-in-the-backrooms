import {test,expect}from'bun:test'
import C from '../scripts/lib/data/critter.yml'
import M from '../scripts/lib/data/critter-models.yml'
import H from '../scripts/lib/data/hair.yml'
import {humanMorph,humanFace,humanHairOf,speciesOf,speciesFor}from'../scripts/lib/critter-model.js'
import {speciesFor as npcSpecies,npcLook}from'../scripts/lib/clothes.js'

test('curated species affect new rolls and keep saved species readable',()=>{
 const core=C.species.filter(s=>!['human','faceling'].includes(s))
 expect(core).toEqual(['cat','dog','fox','bunny','bear','deer','wolf'])
 for(let i=0;i<120;i++){
  expect(core.includes(speciesFor('person'+i))).toBe(true)
  expect(C.species.includes(npcSpecies('person'+i,'meg','guard'))).toBe(true)
 }
 for(const species of Object.keys(M.species))expect(speciesOf({species})).toBe(species)
})
test('each offered hairstyle fits both bodies with a separate hat cut',()=>{
 for(const sex of ['f','m'])for(const hair of [...C.hairF,...C.hairM]){
  const bare=humanHairOf({species:'human',sex,hair,hat:'none'}),hat=humanHairOf({species:'human',sex,hair,hat:'cap'})
  expect(bare).toBe(H.human[sex][H.humanPick[hair]].free)
  expect(hat).not.toBe(bare)
 }
 expect(humanHairOf({species:'faceling',hair:'m_crop'})).toBeNull()
})
test('human identity rolls are stable and do not stack extreme noses and jaws',()=>{
 for(const sex of ['m','f'])for(let fseed=0;fseed<80;fseed++){
  const look={sex,fseed,bust:.42},m=humanMorph(look)
  expect(m).toEqual(humanMorph(look))
  expect(m.NoseBig).toBeLessThanOrEqual(.45)
  expect(m.JawWide).toBeLessThanOrEqual(.6)
  expect(m.Bust).toBe(sex==='m'?0:.42)
  if(sex==='m'){expect(m.M_Jaw).toBeLessThanOrEqual(.53);expect(m.M_Chin).toBeLessThanOrEqual(.47)}
 }
 expect(humanFace('neutral',true,null).X_Blink).toBe(1)
 expect(humanFace('talking',false,[.5,.3,.1]).X_Open).toBeGreaterThan(0)
})
