import {LIMITS} from './level-data.js';
// Private WebGL only. Never calls the engine, generates an asset or edits a model part.
const UPLOAD=/^\/?cdn\/value\.[a-f0-9]{64}\.glb$/i;
const BASIS='/cdn/value.0b3b2185b7e99cf6a986f805f112097b4d1486fbc11f29faf07ac54b18fa60b1.txt';
export function create(T,GLTFLoader,OrbitControls,TransformControls,MeshoptDecoder,KTX2Loader,canvas,events){
 const scene=new T.Scene();scene.background=new T.Color('#202a32');
 const camera=new T.PerspectiveCamera(42,1,.05,25000),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=false;camera.position.set(13,12,16);orbit.target.set(0,0,0);orbit.update();
 scene.add(new T.HemisphereLight(0xcbe4fa,0x343239,2));const sun=new T.DirectionalLight(0xfff2dc,3);sun.position.set(-6,14,8);scene.add(sun);
 const root=new T.Group();scene.add(root);const control=new TransformControls(camera,canvas);control.setSize(.85);scene.add(control.getHelper());
 // Cyan axes keep the gizmo distinct from amber semantic markers.
 control.getHelper().traverse(n=>{if(n.material&&/^[XYZ]+$/.test(n.name)){for(const m of Array.isArray(n.material)?n.material:[n.material])m.color?.set('#59ddec');}});
 const nodes=new Map(),jobs=new Map(),queue=[],urls=new Set(),ray=new T.Raycaster(),pointer=new T.Vector2();
 ray.params.Line.threshold=.06;
 let dead=false,frame=0,draws=0,selected='',data=null,grid=null,gridSize=0,drag=false,before=null,enabled=true,running=0,decoder=null,decoderJob=null,decoderAbort=null;
 let selection=new T.Box3Helper(new T.Box3(),0x55dbea);scene.add(selection);selection.visible=false;
 const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.77,metalness:.06,...extra});
 function release(obj){const geos=new Set(),mats=new Set(),textures=new Set();obj.traverse(n=>{if(n.geometry)geos.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){mats.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});for(const g of geos)g.dispose();for(const t of textures)t.dispose();for(const m of mats)m.dispose();}
 function box(w=1,h=1,d=1){const g=new T.BoxGeometry(w,h,d);g.translate(0,h/2,0);return g;}
 function mesh(g,color,extra){return new T.Mesh(g,material(color,extra));}
 function outline(m,color='#334955'){const e=new T.LineSegments(new T.EdgesGeometry(m.geometry),new T.LineBasicMaterial({color,transparent:true,opacity:.6}));m.add(e);}
 function ramp(){const g=new T.BufferGeometry(),v=[[-.5,0,-.5],[.5,0,-.5],[-.5,0,.5],[.5,0,.5],[-.5,1,-.5],[.5,1,-.5]],ix=[0,1,3,0,3,2,0,4,5,0,5,1,0,2,4,1,5,3,2,3,5,2,5,4];g.setAttribute('position',new T.Float32BufferAttribute(ix.flatMap(i=>v[i]),3));g.computeVertexNormals();return g;}
 function visible(n){let at=n;while(at){if(!at.visible)return false;at=data?.items.find(x=>x.id===at.parent);}return true;}
 function editable(n){let at=n;while(at){if(at.locked)return false;at=data?.items.find(x=>x.id===at.parent);}return enabled;}
 function bounds(obj){root.updateMatrixWorld(true);return new T.Box3().setFromObject(obj,true);}
 function refreshSelection(){const entry=nodes.get(selected),n=data?.items.find(n=>n.id===selected);if(entry&&n&&visible(n)){const b=bounds(entry.obj);selection.visible=!b.isEmpty();selection.box.copy(b);if(editable(n))control.attach(entry.obj);else control.detach();}else{selection.visible=false;control.detach();}}
 function draw(){if(dead||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(dead)return;root.updateMatrixWorld(true);if(selection.visible&&nodes.has(selected))selection.box.copy(bounds(nodes.get(selected).obj));renderer.render(scene,camera);draws++;});}
 function resize(){if(dead)return;const b=canvas.parentElement.getBoundingClientRect();if(b.width<2||b.height<2)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();draw();}
 const ro=new ResizeObserver(resize);ro.observe(canvas.parentElement);orbit.addEventListener('change',draw);control.addEventListener('change',draw);
 function pose(obj){return {p:obj.position.toArray(),r:[obj.rotation.x,obj.rotation.y,obj.rotation.z].map(x=>x*180/Math.PI),s:obj.scale.toArray()};}
 control.addEventListener('mouseDown',()=>{drag=true;before=pose(control.object);events.begin?.(selected);});
 control.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;});
 control.addEventListener('objectChange',()=>{events.preview?.(pose(control.object));draw();});
 control.addEventListener('mouseUp',()=>{if(!drag)return;drag=false;const p=pose(control.object);before=null;events.transform?.(selected,p);refreshSelection();draw();});
 function cancelTransform(){if(drag&&control.object&&before){control.reset();control.object.position.fromArray(before.p);control.object.rotation.set(...before.r.map(x=>x*Math.PI/180),'YXZ');control.object.scale.fromArray(before.s);}drag=false;before=null;control.dragging=false;orbit.enabled=true;draw();}
 let down=null;
 function press(e){down={x:e.clientX,y:e.clientY};}
 function pick(e){if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||control.axis||drag){down=null;return;}down=null;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);let id='';for(const h of ray.intersectObject(root,true)){let n=h.object;while(n&&!n.userData.levelId)n=n.parent;const entry=data?.items.find(x=>x.id===n?.userData.levelId);if(entry&&visible(entry)){id=entry.id;break;}}events.select?.(id);}
 canvas.addEventListener('pointerdown',press);canvas.addEventListener('pointerup',pick);
 async function codecs(loader,json){if(!(json.extensionsUsed||[]).includes('KHR_texture_basisu'))return;if(!decoderJob){decoderAbort=new AbortController();decoderJob=(async()=>{const r=await fetch(BASIS,{signal:decoderAbort.signal,credentials:'omit'});if(!r.ok)throw Error('Texture decoder unavailable');const src=await r.json();if(dead)throw Error('Viewer closed');const js=URL.createObjectURL(new Blob([src.js],{type:'text/javascript'})),wasm=URL.createObjectURL(new Blob([Uint8Array.from(atob(src.wasmBase64),c=>c.charCodeAt(0))],{type:'application/wasm'}));urls.add(js);urls.add(wasm);const m=new T.LoadingManager();m.setURLModifier(u=>u.endsWith('.js')?js:u.endsWith('.wasm')?wasm:u);decoder=new KTX2Loader(m).setTranscoderPath('/wwl-basis/').setWorkerLimit(1).detectSupport(renderer);return decoder;})();}loader.setKTX2Loader(await decoderJob);}
 async function bytes(response,signal){if(!response.ok||response.status===202)throw Error('Model unavailable (HTTP '+response.status+'); no generation requested');if(Number(response.headers.get('content-length'))>LIMITS.modelBytes)throw Error('Model exceeds 30 MB');const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(signal.aborted)throw Error('Request cancelled');if(size>LIMITS.modelBytes)throw Error('Model exceeds 30 MB');chunks.push(r.value);}}finally{await reader.cancel().catch(()=>{});}const out=new Uint8Array(size);let at=0;for(const c of chunks){out.set(c,at);at+=c.length;}return out.buffer;}
 function report(entry,text){if(dead||nodes.get(entry.id)!==entry)return;entry.status=text;events.inspect?.();draw();}
 async function load(entry){const abort=new AbortController();jobs.set(entry.id,abort);const timeout=setTimeout(()=>abort.abort(),20000);const valid=()=>!dead&&!abort.signal.aborted&&nodes.get(entry.id)===entry;
  try{report(entry,'Loading original GLB…');const r=await fetch(entry.ref.startsWith('/')?entry.ref:'/'+entry.ref,{signal:abort.signal,credentials:'omit'}),b=await bytes(r,abort.signal);if(!valid())return;const h=new DataView(b);if(b.byteLength<20||h.getUint32(0,true)!==0x46546c67||h.getUint32(4,true)!==2||h.getUint32(16,true)!==0x4e4f534a||h.getUint32(12,true)>b.byteLength-20)throw Error('Invalid GLB');const json=JSON.parse(new TextDecoder().decode(new Uint8Array(b,20,h.getUint32(12,true))).trim());
   if([...(json.buffers||[]),...(json.images||[])].some(n=>n.uri&&!n.uri.startsWith('data:')))throw Error('External GLB resources refused; use a self-contained upload');
   if((json.extensionsUsed||[]).includes('KHR_draco_mesh_compression'))throw Error('Draco compression unsupported; export Meshopt or uncompressed GLB');
   const manager=new T.LoadingManager();manager.setURLModifier(u=>{if(u.startsWith('data:')||u.startsWith('blob:'))return u;throw Error('External model fetch blocked');});const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);await codecs(loader,json);if(!valid())return;const gltf=await loader.parseAsync(b,'');if(!valid()){release(gltf.scene);return;}
   let meshes=0;gltf.scene.traverse(n=>{if(n.isMesh)meshes++;});const extent=new T.Box3().setFromObject(gltf.scene,true);if(!meshes||extent.isEmpty()){release(gltf.scene);throw Error('No drawable model geometry');}const center=extent.getCenter(new T.Vector3());gltf.scene.position.x-=center.x;gltf.scene.position.y-=extent.min.y;gltf.scene.position.z-=center.z;entry.obj.remove(entry.visual);release(entry.visual);entry.visual=gltf.scene;entry.obj.add(gltf.scene);entry.clips=(gltf.animations||[]).map(c=>c.name);report(entry,'Loaded · original materials · '+meshes+' meshes'+(entry.clips.length?' · '+entry.clips.length+' clips (static preview)':''));refreshSelection();
  }catch(e){if(valid())report(entry,'Placeholder · '+e.message);else if(!dead&&nodes.get(entry.id)===entry&&abort.signal.aborted)report(entry,'Placeholder · load cancelled or timed out');}
  finally{clearTimeout(timeout);if(jobs.get(entry.id)===abort)jobs.delete(entry.id);running--;pump();}
 }
 function pump(){while(!dead&&running<2&&queue.length){const e=queue.shift();if(nodes.get(e.id)!==e)continue;running++;load(e);}}
 function make(n){const obj=new T.Group();obj.userData.levelId=n.id;obj.rotation.order='YXZ';const visual=new T.Group();obj.add(visual);const entry={id:n.id,kind:n.kind,ref:n.ref,obj,visual,status:'',clips:[]};
  if(['block','ramp'].includes(n.kind)){const m=mesh(n.kind==='block'?box():ramp(),n.color);outline(m);visual.add(m);entry.paint=m.material;}
  if(n.kind==='group'){const marker=new T.LineSegments(new T.EdgesGeometry(box(.35,.35,.35)),new T.LineBasicMaterial({color:'#6d8597'}));visual.add(marker);}
  if(n.kind==='zone'){visual.add(mesh(box(),n.color,{transparent:true,opacity:.08,depthWrite:false}));const wire=new T.LineSegments(new T.EdgesGeometry(box()),new T.LineBasicMaterial({color:n.color,transparent:true,opacity:.8}));visual.add(wire);entry.paint=wire.material;entry.status='Zone marker only · no gameplay';}
  if(n.kind==='spawn'){const m=mesh(new T.TorusGeometry(.4,.03,6,32),'#ffc16e',{emissive:'#af6008',emissiveIntensity:.55});m.rotation.x=Math.PI/2;m.position.y=.035;visual.add(m);const stem=mesh(new T.CylinderGeometry(.022,.022,1,6),'#ffc16e');stem.position.y=.55;visual.add(stem);const beacon=mesh(new T.ConeGeometry(.16,.28,4),'#ffd598',{emissive:'#b86d17',emissiveIntensity:.4});beacon.position.set(0,1.12,0);beacon.rotation.x=Math.PI;visual.add(beacon);const arrow=mesh(new T.ConeGeometry(.12,.34,3),'#ffc16e');arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.06,-.5);visual.add(arrow);entry.status='Spawn beacon · facing −Z · marker only, no gameplay';}
  if(n.kind==='light'){const m=mesh(new T.OctahedronGeometry(.16),n.color,{emissive:n.color,emissiveIntensity:.7});m.position.y=.18;visual.add(m);entry.paint=m.material;entry.light=new T.PointLight(n.color,n.intensity,n.range);obj.add(entry.light);entry.status='Point light · first four visible lights previewed';}
  if(n.kind==='model'){const m=mesh(box(), '#536474',{wireframe:true});visual.add(m);const badge=mesh(new T.OctahedronGeometry(.15),'#ffc16e');badge.position.y=.5;visual.add(badge);entry.status=UPLOAD.test(n.ref)?'Queued uploaded GLB…':'Placeholder · preview withheld until you explicitly confirm Preview / request model.';}
  return entry;
 }
 function set(next){if(dead)return;data=next;const alive=new Set(next.items.map(n=>n.id));control.detach();for(const [id,e]of nodes){const n=next.items.find(n=>n.id===id);if(!alive.has(id)||e.kind!==n.kind||e.ref!==n.ref){jobs.get(id)?.abort();e.obj.removeFromParent();release(e.visual);nodes.delete(id);}}
  for(const n of next.items)if(!nodes.has(n.id)){const e=make(n);nodes.set(n.id,e);if(n.kind==='model'&&UPLOAD.test(n.ref))queue.push(e);}
  let lightCount=0;for(const n of next.items){const e=nodes.get(n.id),parent=nodes.get(n.parent)?.obj||root;if(e.obj.parent!==parent)parent.add(e.obj);e.obj.position.fromArray(n.p);e.obj.rotation.set(...n.r.map(x=>x*Math.PI/180),'YXZ');e.obj.scale.fromArray(n.s);e.obj.visible=n.visible;e.paint?.color.set(n.color);if(e.light){e.light.color.set(n.color);e.light.intensity=n.intensity;e.light.distance=n.range;e.light.visible=visible(n)&&lightCount++<4;}}
  if(gridSize!==next.grid){if(grid){scene.remove(grid);release(grid);}gridSize=next.grid;const divisions=Math.min(200,Math.max(20,Math.round(40/gridSize)));grid=new T.GridHelper(divisions*gridSize,divisions,0x6c8796,0x394b58);grid.position.y=-.012;scene.add(grid);}
  snap(snapOn);refreshSelection();pump();draw();
 }
 let snapOn=true;
 function snap(on){snapOn=on;control.setTranslationSnap(on?data?.grid||1:null);control.setRotationSnap(on?Math.PI/12:null);control.setScaleSnap(on?.1:null);}
 function select(id){selected=id||'';refreshSelection();draw();}
 function inspect(){const e=nodes.get(selected);if(!e)return null;const b=bounds(e.obj),size=b.isEmpty()?new T.Vector3():b.getSize(new T.Vector3());return {id:selected,dimensions:e.kind==='model'&&!e.status.startsWith('Loaded')?null:size.toArray(),status:e.status,ref:e.ref,clips:e.clips};}
 function fit(all=false){const e=nodes.get(selected);let b=bounds(!all&&e?e.obj:root);if(b.isEmpty())b=new T.Box3(new T.Vector3(-4,0,-4),new T.Vector3(4,3,4));const c=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3()),d=Math.max(size.x,size.y,size.z,2)*1.8;orbit.target.copy(c);camera.position.copy(c).add(new T.Vector3(.8,.7,1).normalize().multiplyScalar(d));orbit.update();draw();}
 function cancelRequest(id){jobs.get(id)?.abort();for(let i=queue.length-1;i>=0;i--)if(queue[i].id===id)queue.splice(i,1);}
 function preview(id){const e=nodes.get(id);if(!e||e.kind!=='model'||dead)return false;if(!jobs.has(id)&&!queue.includes(e)){queue.push(e);pump();}return true;}
 function cancelRequests(){for(const a of jobs.values())a.abort();queue.length=0;}
 function measure(){const project=p=>{const v=p.clone().project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};};return {dead,draws,pendingFrame:!!frame,modelRequests:jobs.size,queued:queue.length,selected,dragging:drag,objects:[...nodes.values()].map(e=>({id:e.id,status:e.status,ref:e.ref,clips:e.clips,point:project(bounds(e.obj).getCenter(new T.Vector3()))})),gizmo:control.getHelper().children.filter(x=>x.visible).flatMap(x=>{const a=[];x.traverse(n=>{if(n.isMesh&&n.name==='X'&&n.visible){n.updateWorldMatrix(true,false);a.push(project(n.getWorldPosition(new T.Vector3())));}});return a;})};}
 resize();return {set,select,inspect,fit,snap,preview,cancelRequest,mode:m=>{control.setMode(m);draw();},space:s=>{control.setSpace(s);draw();},editable:v=>{enabled=v;refreshSelection();draw();},cancelTransform,cancelRequests,transforming:()=>drag,measure,
  dispose(){if(dead)return;dead=true;cancelAnimationFrame(frame);frame=0;cancelRequests();decoderAbort?.abort();decoder?.dispose();for(const u of urls)URL.revokeObjectURL(u);urls.clear();ro.disconnect();canvas.removeEventListener('pointerdown',press);canvas.removeEventListener('pointerup',pick);orbit.removeEventListener('change',draw);orbit.dispose();control.dispose();release(scene);nodes.clear();renderer.dispose();renderer.forceContextLoss();}
 };
}
