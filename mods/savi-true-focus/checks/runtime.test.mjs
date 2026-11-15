// Node-only unit tests: mocks prove control logic, not the game's renderer or chat dispatch.
const assert = {
  equal(a,b){ if(a!==b) throw new Error(`Expected ${JSON.stringify(a)} to equal ${JSON.stringify(b)}`); },
  deepEqual(a,b){ if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error('Deep equality failed'); },
  ok(a){ if(!a) throw new Error('Expected truthy value'); }
};
// Built dynamically so these inert fixtures are never mistaken for assets to generate.
const fixtureModel = name => ['/', 'cdn', '/', name, '.glb'].join('');
import { start, stop, onDestroy, refitBook, maintain } from '../lib/controller.js';
import { snapshot, restoreActor, loadWardrobe } from '../lib/wardrobe-runtime.js';
import { SETTINGS as S } from '../lib/settings.js';
import { prepare } from '../lib/wardrobe-owner.js';
import { onSpawn as wardrobeSpawn, retryDress } from '../lib/wardrobe-driver.js';
const report = [];
function test(name, body) { body(); report.push({name, result:'passed', evidence:'mocked unit execution'}); }
const data = {
 avatarModel:fixtureModel('test-avatar'), suitModel:fixtureModel('test-suit'), bookModel:fixtureModel('test-book'),
 hideParts:['shirt','pants'],handBone:'hand_l',avatarForward:'-z',
 bookAttachment:{position:{x:0,y:0,z:0},rotation:{yaw:0,pitch:0,roll:0},scale:1},
 clips:{read:'FocusRead',turn:'FocusPageTurn',think:'FocusThink',bookTurn:'PageTurn'},
 durations:{read:4,turn:2,think:3,bookTurn:2}
};
function fixture(text=JSON.stringify(data)) {
 const helper = {id:'helper-example',tags:['helper'],behavior:[S.presenceBehavior],state:{},model:{id:fixtureModel('original'),parts:{hair:{color:'#fff'}}},bones:null,anim:{idle:{clip:'Idle',loop:'loop'}}};
 const human = {id:'human-example',tags:['player'],behavior:['human.js'],state:{},model:fixtureModel('human'),anim:{},bones:null};
 const registry={id:'controller-example',state:{wearers:{},enabled:{}}};
 const objects=new Map([[helper.id,helper],[human.id,human],[registry.id,registry]]);
 let count=0;
 const ctx={self:registry,world:{players:[human]},files:{read:()=>text},getObject:id=>objects.get(id)||null,
  spawn:spec=>{count++; const id=spec.parent+'/'+spec.id; objects.set(id,{anim:{},...spec,id}); return id;},
  emit:(name,payload,opts)=>{if(name==='savi-true-focus:repair' && opts.to===helper.id) prepare({...ctx,self:helper});},
  after:()=>"timer-example", cancel:()=>{},
  destroy:id=>objects.delete(id)
 };
 return {ctx,helper,human,registry,objects,count:()=>count};
}
test('missing explicit target is rejected without spawning',()=>{const f=fixture(); assert.equal(start(f.ctx,{}).ok,false); assert.equal(f.count(),0);});
test('human avatar is rejected and unchanged',()=>{const f=fixture(),before=JSON.stringify(f.human); assert.equal(start(f.ctx,{target:f.human.id}).ok,false); assert.equal(JSON.stringify(f.human),before); assert.equal(f.count(),0);});
test('non-Savi helper is rejected',()=>{const f=fixture(); f.helper.behavior=['wisp.js']; assert.equal(start(f.ctx,{target:f.helper.id}).ok,false);});
test('missing wardrobe keeps focus enabled but presentation pending',()=>{const f=fixture(null),before=JSON.stringify(f.helper); const r=start(f.ctx,{target:f.helper.id}); assert.equal(r.enabled,true); assert.equal(r.presentation,'pending'); assert.equal(JSON.stringify(f.helper),before); assert.equal(f.count(),0);});
test('malformed wardrobe does not dress anyone',()=>{const f=fixture('{broken'); const r=start(f.ctx,{target:f.helper.id}); assert.equal(r.reason,'invalid-wardrobe-data'); assert.equal(f.count(),0);});
test('complete data creates exactly one helper-owned wearer',()=>{const f=fixture(); const r=start(f.ctx,{target:f.helper.id}); assert.equal(r.enabled,true); assert.equal(f.count(),1); const d=f.objects.get(f.helper.id+'/'+S.childId); assert.equal(d.parent,f.helper.id); assert.deepEqual(d.state.original.model,f.helper.model);});
test('repeated activation does not duplicate an active wearer',()=>{const f=fixture(); start(f.ctx,{target:f.helper.id}); const id=f.registry.state.wearers[f.helper.id]; f.helper.state.saviTrueFocus={driver:id}; const r=start(f.ctx,{target:f.helper.id}); assert.equal(r.alreadyActive,true); assert.equal(f.count(),1);});
test('repeated activation before the wearer spawn hook runs does not duplicate it',()=>{const f=fixture(); start(f.ctx,{target:f.helper.id}); const r=start(f.ctx,{target:f.helper.id}); assert.equal(r.alreadyActive,true); assert.equal(r.phase,'loading'); assert.equal(f.helper.state.saviTrueFocus.phase,'queued'); assert.equal(f.count(),1);});
test('turning off pending presentation clears the enabled flag',()=>{const f=fixture(null); start(f.ctx,{target:f.helper.id}); assert.equal(stop(f.ctx,{target:f.helper.id}).enabled,false); assert.equal(f.registry.state.enabled[f.helper.id],undefined);});
function wornFixture(){const f=fixture(); start(f.ctx,{target:f.helper.id}); const d=f.objects.get(f.registry.state.wearers[f.helper.id]); f.helper.state.saviTrueFocus={driver:d.id,original:d.state.original,avatarModel:data.avatarModel}; f.helper.model={id:data.avatarModel,parts:{shirt:{visible:false}}}; f.helper.behavior=[]; f.helper.anim[S.channel]={clip:data.clips.read}; d.state.accessories=['suit-example','book-example']; for(const id of d.state.accessories) f.objects.set(id,{id}); return {...f,driver:d};}
test('off restores the original model and native behavior, removes owned visuals',()=>{const f=wornFixture(); const r=stop(f.ctx,{target:f.helper.id}); assert.equal(r.restored,true); assert.deepEqual(f.helper.model,f.driver.state.original.model); assert.ok(f.helper.behavior.includes(S.presenceBehavior)); assert.equal(f.helper.state.saviTrueFocus,undefined); assert.equal(f.objects.has(f.driver.id),false); assert.equal(f.objects.has('book-example'),false);});
test('restoration does not overwrite a newer external avatar change',()=>{const f=wornFixture(); f.helper.model=fixtureModel('a-new-explicit-look'); stop(f.ctx,{target:f.helper.id}); assert.equal(f.helper.model,fixtureModel('a-new-explicit-look'));});
test('restoration cannot dress a human even with a copied marker',()=>{const f=wornFixture(); const before=JSON.stringify(f.human); assert.equal(restoreActor(f.ctx,f.human,f.helper.state.saviTrueFocus),false); assert.equal(JSON.stringify(f.human),before);});
test('controller destruction restores its active wearer',()=>{const f=wornFixture(); onDestroy(f.ctx); assert.deepEqual(f.helper.model,f.driver.state.original.model); assert.equal(f.objects.has(f.driver.id),false);});
test('normalized quaternion fit is accepted',()=>{const d=JSON.parse(JSON.stringify(data));d.bookAttachment.rotation={x:0,y:0,z:0,w:1};assert.equal(loadWardrobe(fixture(JSON.stringify(d)).ctx).ok,true);});
test('invalid quaternion fit is rejected',()=>{const d=JSON.parse(JSON.stringify(data));d.bookAttachment.rotation={x:0,y:0,z:0,w:0};assert.equal(loadWardrobe(fixture(JSON.stringify(d)).ctx).ok,false);});
test('reading clip is queued before model-readiness callbacks',()=>{const f=fixture();start(f.ctx,{target:f.helper.id});const d=f.objects.get(f.registry.state.wearers[f.helper.id]);const before=JSON.stringify(f.human);let seen=null;wardrobeSpawn({...f.ctx,self:d,after:()=>1,onModelReady:()=>{seen=f.helper.anim[S.channel].clip;}});assert.equal(seen,data.clips.read);assert.equal(JSON.stringify(f.human),before);});
test('book refit refuses a human and leaves the human unchanged',()=>{const f=fixture();const before=JSON.stringify(f.human);assert.equal(refitBook(f.ctx,{target:f.human.id}).ok,false);assert.equal(JSON.stringify(f.human),before);assert.equal(f.count(),0);});
test('book refit changes only the existing book and creates no wearer',()=>{const f=wornFixture();const book=f.objects.get('book-example');book.tags=[S.accessoryTag];book.state={driver:f.driver.id};f.driver.state.book=book.id;const d=JSON.parse(JSON.stringify(data));d.bookAttachment.rotation={x:0,y:0,z:0,w:1};f.ctx.files.read=()=>JSON.stringify(d);const before=JSON.stringify(f.helper),human=JSON.stringify(f.human),count=f.count();const result=refitBook(f.ctx,{target:f.helper.id});assert.equal(result.bookRefitted,true);assert.deepEqual(book.rotation,d.bookAttachment.rotation);assert.equal(JSON.stringify(f.helper),before);assert.equal(JSON.stringify(f.human),human);assert.equal(f.count(),count);});
test('a missing driver is repaired once by its own helper without changing the model',()=>{const f=wornFixture();f.objects.delete(f.driver.id);const count=f.count();const result=start(f.ctx,{target:f.helper.id});assert.equal(result.alreadyActive,true);assert.equal(result.presentation,'pending-sync');assert.equal(f.count(),count+1);assert.equal(f.helper.model.id,data.avatarModel);});
test('focus exit removes only the owned motion behavior',()=>{const f=wornFixture();f.helper.behavior=[S.motionBehavior,'scripts/unrelated.js'];stop(f.ctx,{target:f.helper.id});assert.equal(f.helper.behavior.includes(S.motionBehavior),false);assert.equal(f.helper.behavior.includes(S.presenceBehavior),true);assert.equal(f.helper.behavior.includes('scripts/unrelated.js'),true);});
test('a human with a helper tag is still protected during restoration',()=>{const f=fixture();f.human.tags.push('helper');const marker={driver:'fake',avatarModel:'fake.glb',original:snapshot(f.helper)};f.human.state.saviTrueFocus=marker;const before=JSON.stringify(f.human);assert.equal(restoreActor(f.ctx,f.human,marker),false);assert.equal(JSON.stringify(f.human),before);});
test('owner delivery repeated twice creates no second driver',()=>{const f=fixture();start(f.ctx,{target:f.helper.id});const count=f.count();prepare({...f.ctx,self:f.helper});prepare({...f.ctx,self:f.helper});assert.equal(f.count(),count);});
test('owner repair never overwrites an unrelated child',()=>{const f=wornFixture();f.objects.set(f.driver.id,{id:f.driver.id,tags:['unrelated'],state:{}});const count=f.count();const r=prepare({...f.ctx,self:f.helper});assert.equal(r.ok,false);assert.equal(f.count(),count);});
test('owner repair refuses a human even with copied focus state',()=>{const f=wornFixture();f.human.tags.push('helper');f.human.state.saviTrueFocus=JSON.parse(JSON.stringify(f.helper.state.saviTrueFocus));const before=JSON.stringify(f.human);assert.equal(prepare({...f.ctx,self:f.human}).ok,false);assert.equal(JSON.stringify(f.human),before);});
test('a native helper respawn resumes the enabled outfit without duplicating the body',()=>{const f=wornFixture();f.objects.delete(f.driver.id);f.helper.model=JSON.parse(JSON.stringify(f.driver.state.original.model));f.helper.behavior=[S.presenceBehavior];const before=JSON.stringify(f.human);maintain(f.ctx);assert.equal(f.helper.state.saviTrueFocus.phase,'queued');assert.ok(f.helper.behavior.includes(S.motionBehavior));assert.ok(f.objects.has(f.driver.id));assert.equal(JSON.stringify(f.human),before);});
test('reconnect recovery preserves a genuinely different outside model',()=>{const f=wornFixture();f.helper.model=fixtureModel('outside-choice');maintain(f.ctx);assert.equal(f.helper.model,fixtureModel('outside-choice'));assert.equal(f.helper.state.saviTrueFocus,undefined);assert.equal(f.registry.state.enabled[f.helper.id],undefined);});
test('no enabled focus leaves the recovery timer asleep',()=>{const f=fixture();maintain(f.ctx);assert.equal(f.registry.state.reconnectTimer,undefined);});
test('late hand skeleton retries dressing instead of stranding the avatar',()=>{const f=fixture();start(f.ctx,{target:f.helper.id});const d=f.objects.get(f.registry.state.wearers[f.helper.id]);let bones=[],callbacks=[],timers=[];const ctx={...f.ctx,self:d,onModelReady:(id,fn)=>callbacks.push(fn),getObjectBoneNames:()=>bones,after:(time,name)=>{timers.push(name);return name;}};wardrobeSpawn(ctx);callbacks[0]();assert.equal(d.state.phase,'waiting-for-hand-rig');assert.ok(timers.includes('retryDress'));bones=['hand_l'];retryDress(ctx);assert.equal(d.state.dressed,true);assert.equal(d.state.accessories.length,2);});
console.log(JSON.stringify({scope:'MOCKED UNIT TESTS — not engine or chat end-to-end',passed:report.length,cases:report},null,2));
