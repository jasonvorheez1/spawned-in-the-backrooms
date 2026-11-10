import{test,expect}from'bun:test'
import{readFileSync}from'node:fs'
import A from'../scripts/lib/data/interactive-props.yml'
import P from'../scripts/lib/data/l2props.yml'
import{interactiveSpec,upgradeProp,containerPose,toggleLamp}from'../scripts/lib/prop-interactions.js'
import{MOTION_MS,sampleMotion,propFrames}from'../scripts/lib/prop-easing.js'
import{spawnProp}from'../scripts/lib/l2props.js'
const spec=kind=>({id:'box',tags:['container','breakable'],model:{id:P.containers[kind]??P.kinds[kind].id},physics:{body:'static',collider:'box'},behavior:'custom.js',state:{kind,items:'ammo,kit',lock:'lockpick:35',owner:'npc',refillAt:1000}})
test('seven storage profiles retain inventory, locks, ownership and colliders',()=>{
 for(const kind of Object.keys(A)){const old=spec(kind),s=interactiveSpec(old);expect(s.state.items).toBe(old.state.items);expect(s.state.lock).toBe(old.state.lock);expect(s.state.owner).toBe('npc');expect(s.physics).toBe(old.physics);expect(s.behavior).toBe(old.behavior);expect(s.children.length).toBe(1+A[kind].parts.length);for(const p of s.children.slice(1)){expect(p.state.goal).toBe(0);expect(p.children[0].pivot).toBe('center');expect(p.children[0].model).toStartWith('/cdn/value.')}}
})
test('custom interactions and unknown models remain untouched; chairs and benches work',()=>{
 for(const tags of [['door'],['npc'],['usable'],['seat']]){const o={...spec('cabinet'),tags};expect(interactiveSpec(o)).toBe(o)}
 const custom={...spec('cabinet'),model:'/cdn/custom.glb'};expect(interactiveSpec(custom)).toBe(custom)
 for(const[k,tag]of[['chair','seat'],['stackchair','seat'],['bench','bench']]){const o={tags:['l2prop'],model:P.kinds[k].id,state:{kind:k},physics:'static'};expect(interactiveSpec(o).tags).toContain(tag);expect(interactiveSpec(o).physics).toBe('static')}
 let spawned;spawnProp({spawn:d=>(spawned=d,'id')},'bench',{x:0,z:0},0);expect(spawned.tags).toContain('bench')
})
test('a failed part spawn retries without discarding the original prop',()=>{
 const o=spec('cabinet'),map=new Map();let fail=true;const ctx={getObject:id=>map.get(id),spawn:(id,s)=>{if(fail){fail=false;throw Error('retry')}map.set(s.parent+'/'+id,s)}}
 expect(()=>upgradeProp(ctx,o)).toThrow();expect(o.state.interactiveV).toBeUndefined();expect(o.model.id).toBe(P.containers.cabinet);expect(upgradeProp(ctx,o)).toBe(true);expect(o.state.lock).toBe('lockpick:35');expect(upgradeProp(ctx,o)).toBe(false)
})
test('containers close only after the last viewer leaves',()=>{
 const o={...interactiveSpec(spec('cabinet')),feetPosition:{x:0,y:0,z:0}},map=new Map(o.children.map(c=>[o.id+'/'+c.id,c])),ctx={self:{id:'p1'},place:{players:[{id:'p2',state:{lootOpen:o.id}}]},getObject:id=>map.get(id)}
 containerPose(ctx,o,true);containerPose(ctx,o,false);expect(o.state.containerOpen).toBe(true);ctx.place.players=[];containerPose(ctx,o,false);expect(o.state.containerOpen).toBe(false);for(const p of A.cabinet.parts)expect(map.get(o.id+'/prop-motion-'+p.id).state.goal).toBe(0)
})
test('lamps toggle their light, retain their model and reject remote use',()=>{
 const o=interactiveSpec({id:'lamp',tags:['l2prop'],model:P.kinds.lantern.id,state:{kind:'lantern'}});o.feetPosition={x:1,y:0,z:0};const light={state:{goal:0}},ctx={self:{feetPosition:{x:0,y:0,z:0}},now:()=>2000,getObject:()=>light,emit(){}}
 expect(o.model).toBe(P.kinds.lantern.id);expect(toggleLamp(ctx,o)).toBe(true);expect(o.state.verb).toBe('Turn off');expect(light.state.goal).toBe(1);expect(toggleLamp(ctx,o)).toBe(false);ctx.self.feetPosition.x=50;expect(toggleLamp(ctx,o)).toBe(false)
})
const source=readFileSync(new URL('../scripts/prop-part.js',import.meta.url),'utf8')
test('native easing reverses from the current pose and settles exactly once',()=>{
 let now=0;const calls=[],update=Function('animate','MOTION_MS','sampleMotion','propFrames',source.slice(source.indexOf('export function update')).replace('export function','function')+';return update')((...args)=>calls.push(args),MOTION_MS,sampleMotion,propFrames),state={axis:'yaw',travel:106,value:0,goal:1},ctx={self:{id:'door',state,session:{},rotation:{yaw:0}},now:()=>now,sleep(){}}
 update(ctx);expect(calls).toHaveLength(1);now=240;const from=sampleMotion(state.motion,now);state.goal=0;update(ctx);expect(calls[1][2]['rotation.yaw'][0]).toBeCloseTo(from*106);now=720;update(ctx);expect(ctx.self.rotation.yaw).toBe(0);expect(state.motion).toBeNull();update(ctx);expect(calls).toHaveLength(2)
 expect(propFrames({axis:'slide',rest:{z:.2},travel:-.32},0,1)['feetPosition.z'][1]).toBeCloseTo(-.12);expect(propFrames({axis:'light',power:1.4},0,1)).toEqual({'light.intensity':[0,1.4]})
})
