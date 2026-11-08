import {LIMITS,blankDetail,validateDetail,validateOperation} from './model-detail-data.js';
import {KERNEL_LIMITS,basicSupport,geometryBytes,triangleCount,packGeometryAsync,unpackGeometry,transferGeometry} from './model-detail-geometry.js';
import {detailWorkerSource} from './model-detail-worker-source.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const cancelled=()=>Object.assign(Error('Detail work cancelled; committed edits are unchanged'),{cancelled:true});
export async function detailSourceHash(bytes){
  if(!globalThis.crypto?.subtle)return ''; // Ordinary GLB/pose editors still load; detail alone explains the missing capability.
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
// DOM/renderer-independent controller. The optional run() is a numerical-test seam;
// production uses a real disposable Worker, never a synchronous CSG on the UI thread.
export function createDetailView(T,o){
  const events=o.events||{};let state=blankDetail(),sourceHash='',entries=new Map(),epoch=0,job=null,tool=null,original=false,exporting=false,dead=false,loadError='';
  const support=new WeakMap();
  const materials=n=>Array.isArray(n.material)?n.material:[n.material];
  const writable=()=>!dead&&events.writable?.()!==false;
  const busy=()=>!!job||exporting;
  const selected=()=>o.selected?.();
  const nodeId=n=>{const id=o.nodes().indexOf(n);return id>=0&&o.imported(n)?String(id):null;};
  const current=t=>!dead&&t===epoch;
  const protectedPart=n=>{for(let p=n;p;p=p.parent){const id=nodeId(p);if(id!==null&&state.protectedNodes.includes(id))return true;}return false;};
  function info(){
    const n=selected(),id=nodeId(n),entry=entries.get(id),g=entry?.edited||n?.geometry;
    const why=!n||id===null?'Select an imported rigid mesh; local components keep their existing editor':basicSupport(n)||loadError||(!sourceHash?'Detail needs secure source-byte verification; ordinary model editors remain available':'')||(support.get(n)?.supported===false?support.get(n).reason:'')||(!support.has(n)?'Checking this part for a closed, oriented surface…':'');
    if(g&&!g.boundingBox)g.computeBoundingBox();const sculptOnly=!!n?.isSkinnedMesh;
    return {sculptOnly,kinds:sculptOnly?['inflate','smooth','flatten']:['add','cut','inflate','smooth','flatten'],radiusHint:g?.boundingBox?Math.max(1e-6,g.boundingBox.getSize(new T.Vector3()).length()*.075):.25,node:id,name:n?.name||(id===null?'':'Node '+id),supported:id!==null&&!why,reason:why,busy:busy(),operations:state.operations.filter(p=>p.node===id).length,triangles:g?.attributes?.position?triangleCount(g):0,protected:id!==null&&protectedPart(n)};
  }
  function notify(){if(dead)return;o.lock?.(busy()||!!tool||original);events.detail?.(info());o.inspect?.();o.draw?.();}
  function disarm(){tool=null;o.ghost?.(null);o.lock?.(busy()||original);}
  function status(message){if(!dead)events.status?.(message);}
  function cancelWork(){epoch++;const previous=job;job=null;previous?.stop?.();}
  function cancel(){cancelWork();disarm();notify();}
  function guard(){if(!writable())throw Error('Read-only or unavailable editor: model detail cannot change');if(original)throw Error('Original is a preview. Choose Edited before changing detail');if(exporting)throw Error('Finish the GLB export before changing model detail');if(loadError)throw Error(loadError);if(!sourceHash)throw Error('Detail needs secure source-byte verification; ordinary model editors remain available');}
  function begin(role){
    if(job&&job.role!=='inspect')throw Error('Detail work is already running; wait or cancel');
    cancelWork();disarm();const token=epoch;job={role,token,stop:null};notify();return token;
  }
  async function run(kind,n,operations,token,valid=()=>true){
    if(!current(token)||!valid())throw cancelled();
    const reason=basicSupport(n);if(reason)throw Error(reason);
    const geometry=await packGeometryAsync(n.geometry,()=>current(token)&&valid()),palette=materials(n).map((_,source)=>({source}));
    const args={id:token,kind,geometry,palette,operations};
    const progress=message=>{if(current(token)&&valid())status(message);};
    if(o.run){const answer=await o.run(args,{progress,cancelled:()=>!current(token)||!valid()});if(!current(token)||!valid())throw cancelled();return answer;}
    const source=await detailWorkerSource();if(!current(token)||!valid())throw cancelled();
    return new Promise((resolve,reject)=>{
      let worker,url,timer,done=false;
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);if(current(token)&&job)job.stop=null;error?reject(error):resolve(value);};
      try{
        url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));worker=new Worker(url);
        job.stop=()=>finish(cancelled());
        timer=setTimeout(()=>finish(Error('Detail exceeded its 120-second worker budget; reduce resolution or split this part')),KERNEL_LIMITS.workerMilliseconds);
        worker.onerror=e=>finish(Error('Detail worker: '+(e.message||'unavailable; the source is preserved')));
        worker.onmessage=({data})=>{if(!current(token)||!valid()){finish(cancelled());return;}if(data.progress){progress(data.progress);return;}if(data.id!==token)return;data.ok?finish(null,data):finish(Error(data.error||'Detail worker refused this geometry'));};
        worker.postMessage(args,transferGeometry(geometry));
      }catch(error){finish(error);}
    });
  }
  function finish(token){if(current(token)){job=null;notify();}}
  function entry(n,id){let e=entries.get(id);if(!e){e={node:n,base:n.geometry,baseMaterials:n.material,edited:null,editedMaterials:null,owned:[]};entries.set(id,e);}return e;}
  function show(e,preview=original){e.node.geometry=preview||!e.edited?e.base:e.edited;e.node.material=preview||!e.editedMaterials?e.baseMaterials:e.editedMaterials;if(e.node.isSkinnedMesh){e.node.boundingBox=null;e.node.boundingSphere=null;}}
  function releaseEdit(e){e.node.geometry=e.base;e.node.material=e.baseMaterials;e.edited?.dispose();for(const m of e.owned)m.dispose();e.edited=null;e.editedMaterials=null;e.owned=[];}
  function installEdit(e,g,palette){
    releaseEdit(e);g.name=e.base.name;g.userData=copy(e.base.userData||{});e.edited=g;
    const base=Array.isArray(e.baseMaterials)?e.baseMaterials:[e.baseMaterials];
    const edited=palette.map(p=>{if(p.source!==undefined)return base[p.source];const m=new T.MeshStandardMaterial({color:p.color,roughness:.68,metalness:0,vertexColors:!!g.attributes.color});m.name='Studio '+p.role+' · mesh-local projected UV';e.owned.push(m);return m;});
    e.editedMaterials=Array.isArray(e.baseMaterials)||edited.length>1?edited:edited[0];
    show(e);
  }
  function checkBytes(g,id,extra=0){let bytes=geometryBytes(g)+extra;for(const [key,e]of entries)if(key!==id&&e.edited)bytes+=geometryBytes(e.edited);if(bytes>KERNEL_LIMITS.bytes)throw Error('The edited model exceeds its 128 MiB geometry-buffer budget');}
  // Prepare completely before workbench-view retires its previous source. Neither
  // source references nor scene nodes change on a failed or stale load.
  async function prepare(root,value,hash,valid=()=>true){
    cancelWork();disarm();const token=epoch,recipe=value===undefined?blankDetail():validateDetail(value),all=[];root?.traverse(n=>all.push(n));
    if(recipe.operations.length&&!hash)throw Error('Saved detail needs secure source-byte verification; the previous model is retained');
    if(recipe.sourceHash&&recipe.sourceHash.toLowerCase()!==hash.toLowerCase())throw Error('Source GLB bytes changed. The existing source and recipe are retained; explicitly replace the source to discard detail in the new draft');
    for(const id of recipe.protectedNodes)if(!all[Number(id)])throw Error('Protected source node '+id+' is missing; the previous model is retained');
    job={role:'load',token,stop:null};notify();const edits=[];let bytes=0;
    try{
      const ids=[...new Set(recipe.operations.map(p=>p.node))];
      for(const id of ids){const n=all[Number(id)];if(!n)throw Error('Detail source node '+id+' is missing');const answer=await run('replay',n,recipe.operations.filter(p=>p.node===id),token,valid),g=unpackGeometry(T,answer.geometry);bytes+=geometryBytes(g);if(bytes>KERNEL_LIMITS.bytes){g.dispose();throw Error('Detail replay exceeds the 128 MiB model buffer budget');}edits.push({id,geometry:g,palette:answer.palette,support:answer.support});}
      if(!current(token)||!valid())throw cancelled();
      return {recipe,hash,edits,token};
    }catch(error){for(const e of edits)e.geometry.dispose();throw error;}
    finally{finish(token);}
  }
  function discard(prepared){for(const e of prepared?.edits||[])e.geometry.dispose();}
  function detach(){for(const e of entries.values())releaseEdit(e);entries.clear();original=false;loadError='';}
  function install(prepared){
    detach();state=prepared.recipe;sourceHash=prepared.hash;
    for(const e of prepared.edits){const n=o.nodes()[Number(e.id)];installEdit(entry(n,e.id),e.geometry,e.palette);support.set(n,e.support);}
    notify();
  }
  async function selectionChanged(){
    disarm();notify();const n=selected(),id=nodeId(n);if(id===null||basicSupport(n)||support.has(n)||job||exporting||loadError)return;
    const token=begin('inspect');
    try{const e=entries.get(id),source=e?{...n,geometry:e.base,isMesh:true,isSkinnedMesh:n.isSkinnedMesh,isInstancedMesh:n.isInstancedMesh}:n;const answer=await run('inspect',source,[],token);if(current(token))support.set(n,answer.support);}
    catch(error){if(current(token)&&!error.cancelled){support.set(n,{supported:false,reason:error.message});status(error.message);}}
    finally{finish(token);}
  }
  async function apply(operation){return applyMany([operation]);}
  // One brush stroke = several dabs, one worker replay, one Undo boundary.
  async function applyMany(list){
    let token,g;
    try{
      guard();if(!Array.isArray(list)||!list.length)throw Error('A stroke needs at least one dab');const ops=list.map(validateOperation),op=ops[0];if(ops.some(x=>x.node!==op.node))throw Error('A stroke stays on one mesh');const n=o.nodes()[Number(op.node)];if(!n||nodeId(n)!==op.node)throw Error('Detail targets an imported mesh ID, never a local component');
      if(protectedPart(n))throw Error('This part is protected; unprotect it before a new edit');if(state.operations.length+ops.length>LIMITS.maxOperations)throw Error(LIMITS.maxOperations+' detail operations reached; Undo or clear a part first');
      const reason=basicSupport(n);if(reason)throw Error(reason);
      token=begin('apply');const generation=o.generation?.(),valid=()=>generation===o.generation?.();const e=entry(n,op.node),source=Object.create(n);source.geometry=e.base;source.material=e.baseMaterials;
      const answer=await run('replay',source,[...state.operations.filter(p=>p.node===op.node),...ops],token,valid);
      const tail=answer.receipts.slice(-ops.length),receipt={...tail[tail.length-1],changed:tail.some(r=>r.changed),reason:tail.find(r=>!r.changed)?.reason||tail[tail.length-1].reason};
      if(!receipt.changed){status(receipt.reason||'This stamp changes no volume or surface');return {ok:true,changed:false,...receipt};}
      if(!current(token)||!valid())throw cancelled();guard();
      g=unpackGeometry(T,answer.geometry);checkBytes(g,op.node);
      const next=validateDetail({...state,operations:[...state.operations,...ops],...(sourceHash?{sourceHash}: {})});
      // Exactly one normal Undo boundary, at commit—not when a slow job starts.
      events.before?.();if(!current(token)||!valid())throw cancelled();guard();
      installEdit(e,g,answer.palette);g=null;state=next;support.set(n,answer.support);events.change?.();notify();status(op.kind+(ops.length>1?' stroke · '+ops.length+' dabs':'')+' committed · '+receipt.triangles+' triangles · original GLB unchanged');
      return {ok:true,node:op.node,...receipt};
    }catch(error){g?.dispose();if(error.cancelled)return {ok:false,cancelled:true,reason:error.message};status(error.message);throw error;}
    finally{if(token!==undefined)finish(token);}
  }
  function protect(id,value){
    guard();if(busy())throw Error('Wait for detail work or cancel first');id=String(id);const n=o.nodes()[Number(id)];if(!n||nodeId(n)!==id)throw Error('Protect an imported node');
    if(state.protectedNodes.includes(id)===!!value)return {ok:true,changed:false};
    const next=validateDetail({...state,protectedNodes:value?[...state.protectedNodes,id]:state.protectedNodes.filter(x=>x!==id),...(sourceHash?{sourceHash}:{})});
    disarm();const generation=o.generation?.();events.before?.();guard();if(generation!==o.generation?.())return {ok:false,superseded:true};state=next;events.change?.();notify();return {ok:true,changed:true};
  }
  function clear(id){
    guard();if(busy())throw Error('Wait for detail work or cancel first');if(id!==undefined)id=String(id);
    const operations=id===undefined?[]:state.operations.filter(p=>p.node!==id);if(operations.length===state.operations.length)return {ok:true,changed:false};
    const next=validateDetail({...state,operations});disarm();const generation=o.generation?.();events.before?.();guard();if(generation!==o.generation?.())return {ok:false,superseded:true};
    for(const [key,e]of entries)if(id===undefined||id===key)releaseEdit(e);state=next;events.change?.();notify();return {ok:true,changed:true};
  }
  function arm(settings){
    if(settings===null){disarm();notify();return;}
    guard();if(busy())throw Error('Wait for detail work or cancel first');const n=info();if(!n.supported)throw Error(n.reason);if(n.sculptOnly&&['add','cut'].includes(settings.kind))throw Error('Add/Cut need new skin weights; use Inflate, Smooth or Flatten');if(n.protected)throw Error('This part is protected');if(state.operations.length>=LIMITS.maxOperations)throw Error(LIMITS.maxOperations+' detail operations reached');
    const op=validateOperation({...settings,node:n.node,center:[0,0,0],normal:[0,0,1]});const {center,normal,node,...settingsOnly}=op;tool={...settingsOnly,node};notify();
  }
  // Hit point is world-space. Normals are covectors: M^-T to world and M^T
  // back to the brush's mesh frame, including nonuniform and mirrored parents.
  function localHit(hit){
    const n=selected();if(!n||hit?.object!==n||!hit.face)return null;n.updateWorldMatrix(true,false);if(Math.abs(n.matrixWorld.determinant())<1e-15)throw Error('Zero-scale mesh cannot receive a detail stamp');
    const at=n.worldToLocal(hit.point.clone()),ids=[hit.face.a,hit.face.b,hit.face.c];
    if(n.isSkinnedMesh){n.skeleton.update();const posed=ids.map(i=>n.getVertexPosition(i,new T.Vector3())),weights=new T.Triangle(...posed).getBarycoord(at,new T.Vector3());if(!weights)throw Error('Degenerate posed triangle');const base=ids.map(i=>new T.Vector3().fromBufferAttribute(n.geometry.attributes.position,i)),center=base[0].clone().multiplyScalar(weights.x).addScaledVector(base[1],weights.y).addScaledVector(base[2],weights.z),normal=new T.Triangle(...base).getNormal(new T.Vector3());return {center:center.toArray(),normal:normal.toArray(),displayCenter:at.toArray(),displayNormal:new T.Triangle(...posed).getNormal(new T.Vector3()).toArray()};}
    return {center:at.toArray(),normal:hit.face.normal.clone().normalize().toArray()};
  }
  function hover(ray){if(!tool)return;const hit=ray.intersectObject(selected(),false)[0],local=hit&&localHit(hit);o.ghost?.(local?{...tool,...local,mesh:selected()}:null);}
  function probe(ray){if(!tool)return null;const n=selected(),hit=n&&ray.intersectObject(n,false)[0],local=hit&&localHit(hit);return local?{...local,world:hit.point.clone()}:null;}
  async function stroke(dabs){if(!tool||!dabs?.length)return false;const settings=tool,n=selected();try{if(settings.node!==nodeId(n))throw Error('Selection changed; arm the selected mesh again');tool=null;o.ghost?.(null);await applyMany(dabs.map(d=>({...settings,center:d.center,normal:d.normal})));}catch(error){status(error.message);}finally{notify();}return true;}
  async function stamp(ray){if(!tool)return false;const settings=tool,n=selected();disarm();try{if(settings.node!==nodeId(n))throw Error('Selection changed; arm the selected mesh again');const hit=ray.intersectObject(n,false)[0],local=hit&&localHit(hit);if(!local)throw Error('No hit on the selected mesh; no edit was made');await apply({...settings,center:local.center,normal:local.normal});}catch(error){status(error.message);}finally{notify();}return true;}
  function preview(value){if(busy())throw Error('Wait for detail work or cancel before comparing');disarm();original=!!value;for(const e of entries.values())show(e);notify();}
  async function withExport(fn){
    if(busy())throw Error('Wait for detail work or cancel before exporting');if(loadError)throw Error(loadError);
    const generation=o.generation?.();exporting=true;disarm();for(const e of entries.values())show(e,false);notify();
    try{const result=await fn();if(dead||generation!==o.generation?.())throw cancelled();return result;}
    finally{exporting=false;if(!dead)for(const e of entries.values())show(e);notify();}
  }
  return {detailState:()=>copy(state),detailInfo:info,detailTool:arm,detailApply:apply,detailProtect:protect,detailOriginal:preview,detailClear:clear,detailCancel:cancel,detailBusy:busy,
    prepare,install,discard,detach,selectionChanged,localHit,hover,stamp,probe,stroke,tool:()=>tool&&{...tool},withExport,armed:()=>!!tool,locked:()=>busy()||!!tool||original,
    dispose(){cancelWork();disarm();detach();dead=true;}};
}
