import{test,expect}from'bun:test'
import C from'../scripts/lib/data/craft.yml'
import{recipeStatus,maxMakes,craftOne,benchAvailable,CRAFT_LIMIT}from'../scripts/lib/craft.js'
import{canCarry,inventoryWeight,derived,pickupWeight,carried}from'../scripts/lib/stats.js'
const player=(scrap={})=>({level:1,xp:0,skl:Array(13).fill(100).join(','),attr:'5,5,5,5,5,5,5',scrap,craftOpen:'bench',ammo:0,shells:0,weapons:''})
const give=(draft,t)=>{const ok=canCarry(draft,t);if(!ok.ok)return ok;if(t==='scrap_metal'||t==='bolts'||t==='nails')draft.scrap={...draft.scrap,[t]:(draft.scrap[t]??0)+1};else draft.snacks={...draft.snacks,[t]:(draft.snacks[t]??0)+1};return{ok:true}}
test('complete outputs are committed only when every grant succeeds',()=>{
 const s=player({wire:3,nails:3}),before=JSON.stringify(s);let n=0
 const result=craftOne(s,'bobbypin',(draft,t)=>{give(draft,t);return ++n===2?{ok:false,msg:'Bag full'}:{ok:true}})
 expect(result.ok).toBe(false);expect(result.msg).toBe('Bag full');expect(JSON.stringify(s)).toBe(before)
 const success=craftOne(s,'bobbypin',give)
 expect(success.ok).toBe(true);expect(success.state.scrap.wire).toBe(2);expect(success.state.snacks.bobbypin).toBe(3);expect(JSON.stringify(s)).toBe(before)
})
test('consumed materials free capacity before crafting checks output space',()=>{
 const s=player({wire:1,nails:1}),cap=derived(s).carry
 s.ammo=Math.floor((cap-inventoryWeight(s))/.03)
 expect(recipeStatus(s,'bobbypin').ok).toBe(true)
 expect(craftOne(s,'bobbypin',give).ok).toBe(true)
})
test('a multi-output recipe cannot consume material when its full output will not fit',()=>{
 const s=player({ironstone:2,pitch:1});s.carryBonus=-derived(s).carry+.5
 const before=JSON.stringify(s),st=recipeStatus(s,'smelt')
 expect(st.roomOk).toBe(false);expect(maxMakes(s,'smelt')).toBe(0);expect(craftOne(s,'smelt',give).ok).toBe(false);expect(JSON.stringify(s)).toBe(before)
})
test('bonus output is optional and a rejected bonus does not lose the base batch',()=>{
 const s=player({wire:1,nails:1});let calls=0
 const result=craftOne(s,'bobbypin',(draft,t)=>++calls===4?{ok:false,msg:'No bonus room'}:give(draft,t),true)
 expect(result.ok).toBe(true);expect(result.extra).toBe(0);expect(result.state.snacks.bobbypin).toBe(3);expect(result.state.scrap.wire).toBe(0)
})
test('invalid recipes/counts and huge MAX requests remain bounded',()=>{
 expect(maxMakes(player(),'not-a-recipe')).toBe(0);expect(recipeStatus(player(),'not-a-recipe').ok).toBe(false)
 expect(maxMakes(player({wire:NaN,nails:10}),'bobbypin')).toBe(0)
 expect(maxMakes(player({wire:Infinity,nails:10}),'bobbypin')).toBe(0)
 expect(maxMakes(player({wire:1000000,nails:1000000}),'bobbypin')).toBe(CRAFT_LIMIT)
 for(const [id,r]of Object.entries(C.recipes))expect(recipeStatus(player(r.in),id).need).toBeGreaterThanOrEqual(0)
})
test('workstations must be real, present and reachable on the same floor',()=>{
 const p={feetPosition:{x:0,y:0,z:0}},b={tags:['bench'],feetPosition:{x:2,y:0,z:0},state:{}}
 expect(benchAvailable(p,b)).toBe(true);expect(benchAvailable(p,{...b,tags:['chair']})).toBe(false)
 expect(benchAvailable(p,{...b,feetPosition:{x:0,y:6,z:0}})).toBe(false);expect(benchAvailable(p,{...b,state:{broke:true}})).toBe(false)
 expect(benchAvailable(p,null)).toBe(false)
})
test('weight checks use actual weight at capacity, with weightless tools unchanged',()=>{
 const s=player();s.ammo=100;s.carryBonus=-derived(s).carry+3.17
 expect(inventoryWeight(s)).toBeCloseTo(3);expect(carried(s)).toBe(3);expect(canCarry(s,'ammo').ok).toBe(false)
 expect(pickupWeight('bobbypin')).toBe(0);expect(pickupWeight('ammo')).toBeCloseTo(.18)
})

import {readFileSync} from 'node:fs'
import {craftUi} from '../scripts/craft-ui.js'
import {canOpen} from '../scripts/lib/screen.js'
import {CATS} from '../scripts/lib/craft.js'
const source=readFileSync(new URL('../scripts/craft.js',import.meta.url),'utf8')
const actionSource=source.slice(source.indexOf('function act('),source.indexOf('export function update('))
function action(grant,reachable=true){
 return Function('C','CATS','recipeStatus','maxMakes','craftOne','CRAFT_LIMIT','canOpen','liveBench','note','heard','SND','SKN','B','takeToken','gain',actionSource+';return act')(
 C,CATS,recipeStatus,maxMakes,craftOne,CRAFT_LIMIT,canOpen,()=>reachable,(s,ctx,text)=>s.notice={text},()=>{},n=>n,{}, {scrap:{}},grant,ctx=>ctx.self.state.craftXp=true)
}
function context(s){const events=[];return {self:{id:'tester',state:s,feetPosition:{x:0,y:0,z:0},place:'main'},now:()=>1000,random:()=>1,emit:(...args)=>events.push(args),events}}
test('action rolls back rejected output, including queued effects and XP',()=>{
 const s=player({wire:1,nails:1}),ctx=context(s);let calls=0
 action((draftCtx,t)=>{draftCtx.emit('playSound',{clip:'pickup'});give(draftCtx.self.state,t);return {ok:++calls!==2}})(ctx,s,{k:'make',id:'bobbypin',n:1})
 expect(s.scrap.wire).toBe(1);expect(s.snacks).toBeUndefined();expect(s.craftXp).toBeUndefined();expect(ctx.events).toHaveLength(0)
})
test('action rejects unavailable workbenches before consuming materials',()=>{
 const s=player({scrap_metal:2,springs:1}),ctx=context(s);let calls=0
 action(()=>{calls++;return{ok:true}},false)(ctx,s,{k:'make',id:'ammo',n:1})
 expect(calls).toBe(0);expect(s.scrap.scrap_metal).toBe(2);expect(s.craftOpen).toBe('')
})
test('MAX crafts bounded batches and emits a single pickup sound',()=>{
 const s=player({wire:1000,nails:1000}),ctx=context(s)
 action((draftCtx,t)=>{draftCtx.emit('playSound',{clip:'pickup'});return give(draftCtx.self.state,t)})(ctx,s,{k:'make',id:'bobbypin',n:'max'})
 expect(s.scrap.wire).toBe(900);expect(s.snacks.bobbypin).toBe(300);expect(ctx.events).toHaveLength(1);expect(s.craftXp).toBe(true)
})
test('workbench visibility uses a solid-body ray to the bench',()=>{
 const live=Function('benchAvailable','raycast',source.slice(source.indexOf('function liveBench('))+';return liveBench')
 const bench={id:'bench',tags:['bench'],feetPosition:{x:2,y:0,z:0},state:{}},ctx={self:{id:'tester',feetPosition:{x:0,y:0,z:0}},getObject:()=>bench};let opts
 expect(live(benchAvailable,(ctx,from,dir,o)=>{opts=o;return null})(ctx,{craftBench:'bench'})).toBe(true)
 expect(opts.physicsOnly).toBe(true);expect(opts.bodies).toBe('all');expect(opts.ignoreEntities).toEqual(['tester','bench'])
 expect(live(benchAvailable,()=>({distance:1}))(ctx,{craftBench:'bench'})).toBe(false)
})
test('craft menu explains exact outputs, shortages, and supports narrow screens',()=>{
 const s={...player({scrap_metal:1,springs:1}),craftStation:'ammo',hunger:100,thirst:100,l4task:{text:'<bad>',have:0,need:1}},html=craftUi({}, {state:s})
 expect(html).toContain('Makes 12 pistol rounds');expect(html).toContain('Scrap metal 1/2 · 1 short');expect(html).toContain('>Craft</button>');expect(html).toContain('Materials on hand');expect(html).toContain('@media(max-width:650px)');expect(html).toContain('&lt;bad&gt;')
})

test('crafted weapons retain the maker skill-based condition',()=>{
 const [id,r]=Object.entries(C.recipes).find(([id,r])=>r.out[0].startsWith('weapon:')&&r.skill),s=player(r.in),ctx=context(s),key=r.out[0].slice(7)
 action((draftCtx,t)=>{draftCtx.self.state.weapons=t.slice(7);return{ok:true}})(ctx,s,{k:'make',id,n:1})
 expect(s['cnd_'+key]).toBe(100)
 s.scrap={...r.in};s['cnd_'+key]=71
 action(()=>({ok:true}))(ctx,s,{k:'make',id,n:1})
 expect(s['cnd_'+key]).toBe(71)
})

test('prototype names and malformed recipe definitions cannot crash crafting actions',()=>{
 const s=player({wire:1,nails:1}),ctx=context(s),before=JSON.stringify(s)
 for(const id of ['constructor','toString','__proto__','hasOwnProperty']){
  expect(()=>action(()=>({ok:true}))(ctx,s,{k:'make',id,n:1})).not.toThrow()
  expect(craftOne(s,id,()=>({ok:true})).ok).toBe(false)
 }
 expect(JSON.stringify(s)).toBe(before)
 C.recipes.test_bad_recipe={in:{wire:1},out:[]}
 try{expect(()=>action(()=>({ok:true}))(ctx,s,{k:'make',id:'test_bad_recipe',n:1})).not.toThrow();expect(s.scrap.wire).toBe(1)}finally{delete C.recipes.test_bad_recipe}
})

test('leaving a bench closes crafting even where hunger drain is disabled',()=>{
 const run=Function('C','liveBench','L21H','gain','takeToken',source.slice(source.indexOf('export function update('),source.indexOf('function liveBench(')).replace('export function','function')+';return update')(C,()=>false,{},()=>{},()=>{})
 for(const place of ['level6','bonus']){const s={...player(),craftBench:'old-bench',hunger:60,thirst:70},ctx=context(s);ctx.self.session={};ctx.self.place=place;run(ctx,.5);expect(s.craftOpen).toBe('');expect(s.craftBench).toBe('');expect(s.hunger).toBe(60);expect(s.thirst).toBe(70)}
})
