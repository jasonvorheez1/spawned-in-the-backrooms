import {test,expect}from'bun:test'
import{geometry as canal,collider}from'../scripts/l11-masonry.js'
import{geometry as reno}from'../scripts/l11-reno.js'
import{layCity,RADIUS}from'../scripts/lib/level11-city.js'
import M from'../scripts/lib/data/level11-models.yml'
function collect(fn,params,lod=0){
 const faces=[];let color='';const check=(v)=>{expect(v.every(Number.isFinite)).toBe(true);faces.push({v,color})};const base={params,lod,color(c){color=c},tri(...p){check(p)},quad(...p){check(p)}};fn(new Proxy(base,{get:(o,k)=>k in o?o[k]:()=>{}}));return faces
}
test('modern bridges retain their clear boat channel and match beam collision',()=>{
 for(const kind of ['arch','parapet','quay']){
  const args={kind,L:24,t:kind==='parapet'?.4:1.2,H:kind==='parapet'?.95:4.2,S:17,r:2.9};
  const near=collect(canal,args),far=collect(canal,args,4);expect(near.length).toBeGreaterThan(0);expect(far.length).toBeLessThanOrEqual(near.length)
  const boxes=[collider({params:args})].flat();for(const b of boxes)expect([b.width,b.height,b.depth,...b.center].every(Number.isFinite)).toBe(true)
  if(kind==='arch'){
   // A 1.6 m high boat above y=.2 must fit through the 17 m water opening.
   for(const b of boxes)expect(Math.abs(b.center[2])+b.depth/2<=8.5||Math.abs(b.center[2])-b.depth/2>=8.5||b.center[1]-b.height/2>1.8).toBe(true)
   expect(Math.max(...near.flatMap(f=>f.v.filter((_,i)=>i%3===1)))).toBeCloseTo(2.9)
   expect(Math.max(...boxes.map(b=>b.center[1]+b.height/2))).toBeCloseTo(2.9)
  }
 }
})
test('stripped office ceiling bays stay open and cables retain head clearance',()=>{
 const faces=collect(reno,{kind:'shell'}),tiles=faces.filter(f=>f.color==='oklch(0.86 0.02 90)');expect(tiles.length).toBeGreaterThan(0);expect(tiles.length/6).toBeLessThan(392/3)
 for(const f of tiles){const x=f.v.filter((_,i)=>i%3===0),cx=x.reduce((n,v)=>n+v,0)/x.length;expect(cx< -3.6||cx>2.4).toBe(true)}
 for(const f of faces.filter(f=>f.color==='oklch(0.2 0.01 250)'))expect(Math.min(...f.v.filter((_,i)=>i%3===1))).toBeGreaterThan(3)
})
test('all density tiers appear without resizing the enterable tower',()=>{
 const build=()=>{const rows=new Map();layCity({}, {sp:(id,s)=>rows.set(id,s),bx(){}});return rows},a=build(),b=build();expect([...a]).toEqual([...b]);expect(RADIUS).toBe(190)
 const houses=[...a].filter(([id,s])=>id.startsWith('l11-b-')&&s.model.id===M.house);expect(houses.length).toBeGreaterThan(0);for(const [,s]of houses)expect(Math.hypot(s.feetPosition.x,s.feetPosition.z-20)).toBeGreaterThan(130)
 const scales=[...a].filter(([id,s])=>id.startsWith('l11-b-')&&s.scale).map(([,s])=>s.scale);expect(new Set(scales.map(s=>s.y)).size).toBeGreaterThan(5);for(const s of scales){expect(s.x).toBe(1);expect(s.z).toBe(1);expect(s.y).toBeGreaterThanOrEqual(.86);expect(s.y).toBeLessThanOrEqual(1.08)}
 expect(a.get('l11-ntower').scale).toBeUndefined();expect(a.get('l11-ntower').feetPosition).toEqual({x:27,y:0,z:31})
})
test('the canal water and subway opening are not covered by the city under-slab',()=>{
 const rows=[];layCity({}, {sp(){},bx:(id,x,y,z,w,h,d)=>rows.push({id,x,y,z,w,h,d})});const grounds=rows.filter(r=>r.id.startsWith('l11-ground'));
 const covered=(x,z)=>grounds.some(r=>x>r.x-r.w/2+.001&&x<r.x+r.w/2-.001&&z>r.z-r.d/2+.001&&z<r.z+r.d/2-.001);
 for(const x of [-245,-100,0,100,245])for(const z of [-39,-30,-21])expect(covered(x,z)).toBe(false)
 expect(covered(13.6,60.5)).toBe(false);for(const [x,z]of [[0,0],[0,-60],[0,100],[-280,-30],[280,-30],[10,60.5],[17,60.5]])expect(covered(x,z)).toBe(true)
})
import {readFileSync}from'node:fs'
test('existing rooms receive new bridge dimensions and model fitting without losing object state',()=>{
 const source=readFileSync(new URL('../places/level11/sim.js',import.meta.url),'utf8'),tick=Function('V','LAY_STEP','WALKERS',source.slice(source.indexOf('export function tick(ctx)')).replace('export function tick','function tick')+';return tick')(134,1,[]);
 const old={id:'deck',feetPosition:{x:0,y:-.45,z:-30},primitive:{kind:'box',width:17,height:.6,depth:24},physics:'static',state:{open:true,items:'kept'}},primitive={kind:'box',width:32,height:.6,depth:24},place={players:[{}],state:{lq:{i:0}},objects:{deck:old}},ctx={place,session:{l11q:{v:134,sorted:true,rows:[['deck',{feetPosition:old.feetPosition,primitive,layout:{box:{min:{x:-16,y:0,z:-12},max:{x:16,y:.6,z:12}}}}]],keep:{deck:true}}},now:()=>0,spawn(){},destroy(){throw Error('unexpected replacement')}};
 tick(ctx);expect(old.primitive).toEqual(primitive);expect(old.layout.box.max.x).toBe(16);expect(old.state).toEqual({open:true,items:'kept'});expect(place.state.builtV).toBe(134)
})

test('bank coping leaves the outer bridge roadways clear',()=>{
 const rows=[];layCity({}, {sp(){},bx:(id,x,y,z,w,h,d)=>{if(id.startsWith('l11-canal-cope'))rows.push({x,z,w,d})}});
 for(const x of [-140,-70,70,140])for(const z of [-40.5,-19.5])expect(rows.some(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)).toBe(false)
 expect(collect(reno,{kind:'workstand'}).length).toBeGreaterThan(0)
})
