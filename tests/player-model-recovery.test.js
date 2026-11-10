import {test,expect,mock} from 'bun:test'
mock.module('../scripts/lib/seat.js',()=>({standUp(){}}))
mock.module('builtin/tween',()=>({animate(){}}))
const {update}=await import('../scripts/critter.js')
const {default:C}=await import('../scripts/lib/data/critter.yml')
function fixture(){
 const objects=new Map(),self={id:'tester',state:{look:{...C.default,sex:'m',hair:'m_crop'},hp:100,level:1,equipped:'fists'},session:{},anim:{},feetPosition:{x:0,y:0,z:0},place:'main',isLocal:true,camera:{rotation:{yaw:0}},children:[]}
 objects.set(self.id,self)
 const ctx={self,session:{},place:{id:'main',players:[self],state:{},objects:{}},world:{state:{bodyStyle:'human'}},now:()=>1000,random:()=>.99,after(){},log(){},query:()=>[],getObject:id=>objects.get(id),destroy:id=>objects.delete(id),spawn:(key,spec)=>{if(typeof key==='object'){spec=key;key=spec.id??'object'+objects.size}const id=spec.parent?spec.parent+'/'+key:key;objects.set(id,{...spec,id,state:{},session:{},anim:{},children:[]});return id}}
 return {ctx,self,objects}
}
test('unexpected avatar restamps are repaired without changing the saved look',()=>{
 const {ctx,self}=fixture();update(ctx);const model=self.model.id,look=self.state.look
 self.model={id:'/cdn/unexpected-avatar.glb'};update(ctx)
 expect(self.model.id).toBe(model);expect(self.state.look).toBe(look)
})
test('a deleted held weapon is recreated without an equipment change',()=>{
 const {ctx,self,objects}=fixture();self.state.equipped='crowbar';update(ctx)
 const id=self.session.heldObj;expect(objects.has(id)).toBe(true);objects.delete(id);update(ctx)
 expect(objects.has(self.session.heldObj)).toBe(true);expect(self.state.equipped).toBe('crowbar')
})
test('the human wardrobe mirror follows facial expressions and repairs a recreated mirror',()=>{
 const {ctx,self,objects}=fixture();self.state.wardrobeOpen=true;update(ctx)
 const mirror=objects.get(self.session.mirror);expect(mirror.morph).toEqual(self.morph)
 const previous=JSON.stringify(mirror.morph);self.state.face={expr:'sad',until:10000};update(ctx)
 expect(mirror.morph).toEqual(self.morph);expect(JSON.stringify(mirror.morph)).not.toBe(previous)
 objects.delete(self.session.mirror);update(ctx);expect(objects.get(self.session.mirror).morph).toEqual(self.morph)
})
