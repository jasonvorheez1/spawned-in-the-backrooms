import A from './data/interactive-props.yml'
import P from './data/l2props.yml'
import F from './data/furniture.yml'
const VERSION=3,PART='prop-motion-',SHELL='prop-shell'
const models=new Map(Object.entries(P.containers).map(([kind,id])=>[id,kind]))
models.set('/cdn/value.c6241c9ef9004df7d80aae0e234ed284e1f3e9ea13a77cc4183bbf4f92977eca.glb','locker')
for(const kind of ['fuse','bench','chair','stackchair','lantern'])if(P.kinds[kind])models.set(P.kinds[kind].id,kind)
if(F.pieces.floor_lamp)models.set(F.pieces.floor_lamp.model,'lamp')
if(F.pieces.fridge)models.set(F.pieces.fridge.model,'fridge')
const interactive=new Set(['usable','seat','bench','npc','door'])
export function propKind(o){
 const id=o.model?.id??o.model,known=models.get(id)
 if(known)return known
 if(o.state?.propArt&&Object.hasOwn(A,o.state.propArt))return o.state.propArt
 if(o.state?.propLamp)return 'lamp'
 if(['scripts/l2-props-geo.js','scripts/loot-bags-geo.js'].includes(o.primitive?.script)){const kind=o.primitive.params?.kind??o.state?.kind;if(Object.hasOwn(A,kind))return kind}
 return null
}
const vector=(a)=>({x:a[0],y:a[1],z:a[2]})
function sizeOf(o,kind){const b=o.layout?.box;if(b?.min&&b?.max){const a=['x','y','z'].map(k=>b.max[k]-b.min[k]);if(a.every(n=>Number.isFinite(n)&&n>0))return a}return A[kind]?.size??P.kinds[kind]?.size??[.5,1.8,.5]}
export function interactiveSpec(o){
 if(o.state?.interactiveV===VERSION||o.state?.broke||o.state?.dead||o.state?.taken||o.state?.hp!=null&&o.state.hp<=0)return o
 const kind=propKind(o),tags=o.tags??[];if(!kind||tags.some(t=>interactive.has(t)))return o
 const state={...(o.state??{}),interactiveV:VERSION},children=[...(o.children??[])],out={...o,state,children}
 state.name??=P.kinds[kind]?.name??({filing:'Filing cabinet',desk:'Desk drawers',cabinet:'Supply cabinet',locker:'Locker',fridge:'Fridge',fuse:'Fuse cabinet',toolbox:'Toolbox',lamp:'Lamp'}[kind]??kind)
 if(kind==='chair'||kind==='stackchair'){out.tags=[...tags,'seat'];state.seat??={w:1,d:0,y:.1};return out}
 if(kind==='bench'){out.tags=[...tags,'bench'];return out}
 if(kind==='lamp'||kind==='lantern'){
  out.tags=[...tags,'usable'];state.propLamp=true;state.lampOn=o.light?(o.light.intensity??1)>0:false;state.verb=state.lampOn?'Turn off':'Turn on';state.info='';out.light=null
  const power=Math.max(.1,Math.min(3,o.light?.intensity??(kind==='lamp'?1.4:.8))),height=kind==='lamp'?1.65:.24
  children.push({id:PART+'light',physics:'none',feetPosition:{x:0,y:height,z:0},light:{kind:'point',color:o.light?.color??'#ffe0a6',intensity:state.lampOn?power:0,distance:kind==='lamp'?5:4},behavior:'scripts/prop-part.js',state:{axis:'light',power,goal:state.lampOn?1:0,value:state.lampOn?1:0}})
  return out
 }
 const row=A[kind];if(!row)return o
 const size=sizeOf(o,kind),rs=Array.isArray(row.size)?row.size:size,ratio=size.map((n,i)=>n/(rs[i]||n||1)),scaled=(v)=>vector(v.map((n,i)=>n*ratio[i])),goal=state.containerOpen?1:0
 out.tags=[...new Set([...tags,'container'])];state.propArt=kind;state.items??='';out.model=null;out.primitive=null
 out.layout={box:{min:{x:-size[0]/2,y:0,z:-size[2]/2},max:{x:size[0]/2,y:size[1],z:size[2]/2}}}
 const orig=P.containers?.[kind]??(typeof o.model==='string'?o.model:o.model?.id) // Shelly Nov 12: the split code body read blocky; the detailed model stays whole, nothing swaps on a search
 if(orig||!row.body||!Array.isArray(row.parts)){if(!orig)return o;children.push({id:SHELL,physics:'none',model:orig,layout:{box:{min:{x:-size[0]/2,y:0,z:-size[2]/2},max:{x:size[0]/2,y:size[1],z:size[2]/2}}},castShadow:true});return out}
 children.push({id:SHELL,physics:'none',model:row.body,scale:vector(ratio),feetPosition:scaled([row.center[0],row.center[1]-row.height/2,row.center[2]]),castShadow:true})
 for(const part of row.parts){const pivot=scaled(part.pivot),travel=part.axis==='slide'?part.travel*ratio[2]:part.travel
  children.push({id:PART+part.id,physics:'none',feetPosition:{...pivot,...(part.axis==='slide'?{z:pivot.z+travel*goal}:{})},rotation:part.axis==='slide'?0:{[part.axis]:travel*goal},behavior:'scripts/prop-part.js',state:{axis:part.axis,travel,rest:pivot,goal,value:goal},children:[{id:'mesh',physics:'none',model:part.file,feetPosition:scaled([part.offset[0],part.offset[1]-part.height/2,part.offset[2]]),scale:vector(ratio),castShadow:true}]})
 }
 return out
}
export function upgradeProp(ctx,o){
 const spec=interactiveSpec({id:o.id,tags:o.tags,state:o.state,model:o.model,primitive:o.primitive,layout:o.layout,light:o.light})
 if(spec.state===o.state)return false
 // Keep the existing collider, transform, behavior, lock, ownership and inventory.
 if(o.state.interactiveV!==VERSION){const row=A[spec.state?.propArt];for(const part of row?.parts??[]){const id=o.id+'/'+PART+part.id;if(ctx.getObject(id)&&!spec.children.some(c=>c.id===PART+part.id))ctx.destroy(id)}}
 for(const child of spec.children){const id=o.id+'/'+child.id;const old=ctx.getObject(id);if(old&&o.state.interactiveV!==VERSION)ctx.destroy(id);if(!ctx.getObject(id))ctx.spawn(child.id,{...child,parent:o.id})}
 for(const k of ['tags','model','primitive','layout','light'])if(Object.hasOwn(spec,k)&&spec[k]!==o[k])o[k]=spec[k]
 for(const[k,v]of Object.entries(spec.state))if(o.state[k]!==v)o.state[k]=v
 return true
}
export function containerPose(ctx,o,open){
 const row=A[o.state?.propArt];if(!row)return
 if(!open&&(ctx.place.players??[]).some(p=>p.id!==ctx.self.id&&p.state?.lootOpen===o.id))return
 o.state.containerOpen=!!open
 for(const part of row.parts){const child=ctx.getObject(o.id+'/'+PART+part.id);if(child)child.state.goal=open?1:0}
}
export function toggleLamp(ctx,o){
 const a=ctx.self.worldFeetPosition??ctx.self.feetPosition,b=o.worldFeetPosition??o.feetPosition
 if(!o.state.propLamp||!a||!b||Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>4.5||ctx.now()-(o.state.lampAt??-1e9)<150)return false
 const light=ctx.getObject(o.id+'/'+PART+'light');if(!light)return false
 o.state.lampAt=ctx.now();o.state.lampOn=!o.state.lampOn;o.state.verb=o.state.lampOn?'Turn off':'Turn on';light.state.goal=o.state.lampOn?1:0
 ctx.emit('playSound',{clip:'/cdn/moodboard-realistic-gritty/sfx-lock-picking-click.mp3',position:b,volume:.25,maxDistance:8});return true
}
export function upgradeNearby(ctx){
 const m=ctx.self.session;if(ctx.now()<(m.propScanAt??0))return;m.propScanAt=ctx.now()+1000
 let changed=0
 for(const o of ctx.query({anyTags:['container','l2prop','homefurn','furniture'],radius:20})){
  if(o.state?.propArt&&o.state.containerOpen&&!(ctx.place.players??[]).some(p=>p.state?.lootOpen===o.id))containerPose(ctx,o,false)
  if(changed<3&&upgradeProp(ctx,o))changed++
 }
}
