import {test,expect,afterEach} from 'bun:test'
import {setStyle,bodyModel,seatHead,clearAppearance,humanBodyMorph,humanMorph,restyle,HEAD_ID,HAIR_ID} from '../scripts/lib/critter-model.js'
import C from '../scripts/lib/data/critter.yml'
afterEach(()=>setStyle('human'))
function fixture(){
 const objects=new Map(),destroyed=[],obj={id:'player/test',state:{},children:[]}
 objects.set(obj.id,obj)
 const ctx={getObject:id=>objects.get(id),destroy:id=>{destroyed.push(id);objects.delete(id)},spawn:(key,spec)=>{if(typeof key==='object'){spec=key;key=spec.id}const id=spec.parent+'/'+key;objects.set(id,{...spec,id,state:{}});return id}}
 return {ctx,obj,objects,destroyed}
}
test('body morphs omit unsupported male Bust while garments keep their flat-chest override',()=>{
 expect(humanBodyMorph({sex:'m'}).Bust).toBeUndefined();expect(humanMorph({sex:'m'}).Bust).toBe(0)
 expect(humanBodyMorph({sex:'f',bust:.42}).Bust).toBe(.42)
})
test('human/furry and sex changes rebind appearance to the new body without deleting equipment',()=>{
 const {ctx,obj,objects,destroyed}=fixture(),base={...C.default,hair:'m_crop',hat:'none'}
 objects.set(obj.id+'/gun',{id:obj.id+'/gun'})
 setStyle('human');let look={...base,sex:'m'};obj.model=bodyModel(look);seatHead(ctx,obj,look)
 const hair=objects.get(obj.id+'/'+HAIR_ID)
 expect(hair).toBeDefined();expect(obj.morph.Bust).toBeUndefined()
 look={...look,sex:'f'};obj.model=bodyModel(look);seatHead(ctx,obj,look)
 expect(destroyed).toContain(hair.id);expect(objects.get(hair.id)).not.toBe(hair)
 setStyle('furry');obj.model=bodyModel(look);seatHead(ctx,obj,look)
 expect(objects.has(obj.id+'/'+HEAD_ID)).toBe(true)
 expect([...objects.keys()].filter(id=>id.startsWith(obj.id+'/critter-ward-'))).toHaveLength(0)
 setStyle('human');obj.model=bodyModel(look);seatHead(ctx,obj,look)
 expect(objects.has(obj.id+'/'+HEAD_ID)).toBe(false);expect(objects.has(obj.id+'/gun')).toBe(true)
 clearAppearance(ctx,obj);expect(objects.has(obj.id+'/'+HAIR_ID)).toBe(false);expect(objects.has(obj.id+'/gun')).toBe(true)
})

test('standing human models repair stale morphs and attachments after a hot update',()=>{
 const {ctx,obj}=fixture();setStyle('human');obj.state.wear={...C.default,sex:'m',hair:'m_crop',hat:'none'};obj.model=bodyModel(obj.state.wear);obj.morph={Bust:1}
 expect(restyle(ctx,obj)).toBe(true);expect(obj.morph.Bust).toBeUndefined();expect(obj.state.headBody).toBe(obj.model.id)
})
