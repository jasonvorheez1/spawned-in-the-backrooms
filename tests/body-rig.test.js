import{test,expect}from'bun:test'
import{fullLook}from'../scripts/lib/clothes.js'
import{humanBody}from'../scripts/lib/critter-model.js'
test('equipped waistbands keep a closed pelvis without exposing underwear',()=>{
 for(const sex of ['m','f'])for(const botw of ['shorts','pants','skirt']){
  const parts=humanBody(fullLook({sex,botw,topw:'tank'})).parts
  expect(parts.Skin_hips.visible).toBe(true)
  expect(parts.Under_bottom.visible).toBe(false)
  expect(parts.Under_top.visible).toBe(false)
 }
 for(const sex of ['m','f']){
  const parts=humanBody(fullLook({sex,botw:'none',topw:'none'})).parts
  expect(parts.Skin_hips.visible).toBe(true)
  expect(parts.Under_bottom.visible).toBe(true)
 }
})

test('closed tops keep chest skin behind their collar openings',()=>{
 for(const sex of ['m','f'])for(const topw of ['tee','hoodie','jacket']){
  const parts=humanBody(fullLook({sex,topw})).parts
  expect(parts.Skin_torso_upper_front.visible).toBe(true)
  expect(parts.Under_top.visible).toBe(false)
 }
})
