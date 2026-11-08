// Private level layout: metres, feet pivots; rotations [pitch,yaw,roll] in degrees.
export const LIMITS={items:256,depth:16,position:10000,size:4096,history:60,gridMin:.1,gridMax:10,modelBytes:30000000};
export const KINDS=['group','block','ramp','model','light','spawn','zone'];
const color=/^#[0-9a-f]{6}$/i,ref=/^\/?cdn\/[A-Za-z0-9_./%+@-]+\.glb(?:\?[^\s<>"']*)?$/i;
export function blank(){return {version:1,grid:1,items:[]};}
const copy=x=>JSON.parse(JSON.stringify(x));
function exact(x,keys,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!keys.includes(k)))throw Error('Unknown '+label+' fields; original document kept');}
function vec(v,min,max,label){if(!Array.isArray(v)||v.length!==3||v.some(x=>!Number.isFinite(x)||x<min||x>max))throw Error('Invalid '+label);}
export function validate(x){
 exact(x,['version','grid','items'],'level');if(x.version!==1)throw Error('Unsupported level version');
 if(!Number.isFinite(x.grid)||x.grid<LIMITS.gridMin||x.grid>LIMITS.gridMax)throw Error('Grid is 0.1–10 metres');
 if(!Array.isArray(x.items)||x.items.length>LIMITS.items)throw Error('A level card holds up to 256 objects');
 const ids=new Set();for(const n of x.items){exact(n,['id','kind','name','parent','p','r','s','color','collidable','visible','locked','ref','intensity','range'],'level object');
 if(!/^l[1-9][0-9]{0,8}$/.test(n.id)||ids.has(n.id))throw Error('Missing or duplicate level object ID');ids.add(n.id);
 if(!KINDS.includes(n.kind)||typeof n.name!=='string'||n.name.length>80||typeof n.parent!=='string')throw Error('Invalid level object kind, name or parent');
 vec(n.p,-LIMITS.position,LIMITS.position,'position');vec(n.r,-36000,36000,'rotation');vec(n.s,.01,LIMITS.size,'size');
 if(!color.test(n.color)||typeof n.visible!=='boolean'||typeof n.locked!=='boolean'||typeof n.collidable!=='boolean')throw Error('Invalid appearance or collision flag');
 if(typeof n.ref!=='string'||n.ref.length>2048||n.ref&&(!ref.test(n.ref)||n.ref.includes('..'))||n.kind==='model'&&!n.ref)throw Error('A model requires an uploaded/CDN GLB reference');
 if(!Number.isFinite(n.intensity)||n.intensity<0||n.intensity>20||!Number.isFinite(n.range)||n.range<.1||n.range>500)throw Error('Light intensity is 0–20; range is 0.1–500 metres');
 }
 const byId=new Map(x.items.map(n=>[n.id,n]));for(const n of x.items){let at=n,depth=0;const seen=new Set([n.id]);while(at.parent){if(!byId.has(at.parent)||seen.has(at.parent))throw Error('Level parent is missing or cyclic');seen.add(at.parent);at=byId.get(at.parent);if(at.kind!=='group')throw Error('Only groups can parent level objects');if(++depth>LIMITS.depth)throw Error('Group nesting exceeds 16');}}
 return copy(x);
}
export function nextId(d){let n=1;const ids=new Set(d.items.map(x=>x.id));while(ids.has('l'+n))n++;return 'l'+n;}
export function item(d,kind,overrides={}){if(!KINDS.includes(kind))throw Error('Unknown level object');return {id:nextId(d),kind,name:kind==='spawn'?'Spawn point':kind==='zone'?'Zone':kind[0].toUpperCase()+kind.slice(1),parent:'',p:[0,0,0],r:[0,0,0],s:kind==='block'?[4,.25,4]:kind==='ramp'?[4,2,4]:kind==='zone'?[4,3,4]:[1,1,1],color:kind==='spawn'?'#62dcb6':kind==='zone'?'#bd99f5':kind==='light'?'#ffe0a6':'#7c90a1',collidable:['block','ramp','model'].includes(kind),visible:true,locked:false,ref:'',intensity:2,range:12,...overrides};}
export function add(d,kind,overrides={}){if(overrides.parent)editable(d,overrides.parent);const out=copy(d),n=item(out,kind,overrides);out.items.push(n);return {data:validate(out),id:n.id};}
export function descendants(d,id){const out=new Set([id]);let changed=true;while(changed){changed=false;for(const n of d.items)if(out.has(n.parent)&&!out.has(n.id)){out.add(n.id);changed=true;}}return out;}
export function editable(d,id){const n=d.items.find(n=>n.id===id);if(!n)throw Error('Select a level object');let at=n;while(at){if(at.locked)throw Error('This object or its group is locked');at=d.items.find(x=>x.id===at.parent);}return n;}
export function update(d,id,patch){editable(d,id);if(patch.parent)editable(d,patch.parent);const out=copy(d),n=out.items.find(n=>n.id===id);if(patch.id!==undefined||patch.kind!==undefined)throw Error('Object identity cannot be rewritten');Object.assign(n,patch);return validate(out);}
export function remove(d,id){editable(d,id);const cut=descendants(d,id);if(d.items.some(n=>cut.has(n.id)&&n.locked))throw Error('Unprotect locked group members before deleting');return validate({...d,items:d.items.filter(n=>!cut.has(n.id))});}
export function duplicate(d,id){editable(d,id);const out=copy(d),set=descendants(d,id),remap=new Map();for(const old of d.items.filter(n=>set.has(n.id))){const n=copy(old);n.id=nextId(out);n.locked=false;n.name=(old.name+' copy').slice(0,80);remap.set(old.id,n.id);out.items.push(n);}for(const oldId of set){const n=out.items.find(n=>n.id===remap.get(oldId));if(!n)continue;n.parent=remap.get(n.parent)||n.parent;if(oldId===id)n.p[0]+=d.grid;}return {data:validate(out),id:remap.get(id)};}
export function room(d){let out=add(d,'group',{name:'Room · 8 × 8 m'});const id=out.id;for(const [name,p,s] of [['Floor',[0,-.25,0],[8,.25,8]],['Back wall',[0,0,-4],[8,3.2,.25]],['Left wall',[-4,0,0],[.25,3.2,8]],['Right wall',[4,0,0],[.25,3.2,8]],['Door left',[-2.5,0,4],[3,3.2,.25]],['Door right',[2.5,0,4],[3,3.2,.25]],['Door lintel',[0,2.4,4],[2,.8,.25]]])out=add(out.data,'block',{name,parent:id,p,s,color:name==='Floor'?'#647780':'#aab6bc'});return {data:out.data,id};}
export function warnings(d){const a=validate(d),out=[];if(!a.items.some(n=>n.kind==='spawn'&&n.visible))out.push('No visible spawn marker');if(!a.items.some(n=>n.kind!=='group'&&n.collidable&&n.visible))out.push('No collidable layout geometry');for(const n of a.items)if(n.kind==='model')out.push(n.name+': model preview/load must succeed; export keeps its source reference');return out;}
function spec(n){const base={id:n.id,tags:['wws-level',...(n.kind==='spawn'?['level-spawn']:n.kind==='zone'?['level-zone']:[])],feetPosition:{x:n.p[0],y:n.p[1],z:n.p[2]},rotation:{pitch:n.r[0],yaw:n.r[1],roll:n.r[2]},scale:{x:n.s[0],y:n.s[1],z:n.s[2]},visible:n.visible,state:{levelName:n.name}};
 if(n.kind==='block')base.primitive={kind:'box',width:1,height:1,depth:1};
 // Engine wedge is an isosceles prism, not a one-sided ramp. A rotated right-triangle extrude matches the private viewport.
 if(n.kind==='ramp')base.children=[{id:'ramp-geometry',feetPosition:{x:0,y:0,z:0},rotation:{yaw:90},primitive:{kind:'extrude',shape:[[-.5,0],[.5,0],[.5,1]],depth:1,bevelEnabled:false},material:{color:n.color,roughness:.85},...(n.collidable?{physics:'static'}:{})}];
 if(n.kind==='block')base.material={color:n.color,roughness:.85};
 if(n.kind==='model')base.model=n.ref;
 if(['block','model'].includes(n.kind)&&n.collidable)base.physics='static';
 if(n.kind==='light')base.light={kind:'point',color:n.color,intensity:n.intensity,distance:n.range};
 if(n.kind==='spawn'||n.kind==='zone'){base.visibleTo='editors';base.state.marker=n.kind;base.state.size=n.s;delete base.scale;}
 return base;}
export function exportPlan(d){const a=validate(d);const build=parent=>a.items.filter(n=>n.parent===parent).map(n=>{const s=spec(n),children=build(n.id);if(children.length)s.children=children;return s;});return {format:'wws-level-plan',version:1,units:'metres',rotation:'degrees',terrain:'off',objects:build(''),markers:a.items.filter(n=>['spawn','zone'].includes(n.kind)).map(copy),warnings:warnings(a),note:'Private layout export. Nothing is placed automatically; spawn/zone markers do not implement gameplay.'};}
