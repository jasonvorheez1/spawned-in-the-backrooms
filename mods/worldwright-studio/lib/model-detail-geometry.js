import {LIMITS, validateOperation} from './model-detail-data.js';

// All coordinates are in the selected mesh's frame. This is a surface editor, NOT a
// voxel model: only two transient scalar slabs tessellate a continuous brush SDF.
// No sampled representation of the source model is made or stored.
export const KERNEL_LIMITS = Object.freeze({
  inputTriangles:300000, outputTriangles:600000, brushTriangles:110000,
  bytes:128*1024*1024, attributes:12, materials:256, refinementPasses:8,
  intersectionPairs:180000, workerMilliseconds:120000, maxCoordinate:99999
});
const TYPES={Float32Array,Float64Array,Uint32Array,Int32Array,Uint16Array,Int16Array,Uint8Array,Int8Array,Uint8ClampedArray};
const fail=message=>{throw Error(message);};
export function triangleCount(g){return Math.min(g.index?.count??g.attributes.position.count,g.drawRange?.count??Infinity)/3;}
export function geometryBytes(g){return Object.values(g.attributes).reduce((n,a)=>n+a.count*a.itemSize*(a.array||a.data?.array).BYTES_PER_ELEMENT,0)+(g.index?.array.byteLength||0);}
export function basicSupport(mesh){
  if(!mesh?.isMesh)return 'Select an imported rigid mesh, not a group or joint';
  if((mesh.isSkinnedMesh||mesh.geometry?.attributes?.skinIndex||mesh.geometry?.attributes?.skinWeight)&&(!mesh.geometry?.attributes?.skinIndex||!mesh.geometry?.attributes?.skinWeight||mesh.geometry.attributes.skinIndex.itemSize!==4||mesh.geometry.attributes.skinWeight.itemSize!==4))return 'The rig needs matching four-influence skin indices and weights';
  if(mesh.isInstancedMesh)return 'Instanced mesh: make an independent rigid source part first';
  const g=mesh.geometry;
  if(!g?.isBufferGeometry||!g.attributes.position)return 'This node has no editable triangle geometry';
  if(Object.values(g.morphAttributes||{}).some(a=>a.length))return 'Morph-target mesh: detail reshaping would discard morph data. Other rigid parts remain editable';
  if(g.attributes.position.itemSize!==3)return 'Positions must have three XYZ components';
  if(g.drawRange.start!==0||Number.isFinite(g.drawRange.count)&&g.drawRange.count!==(g.index?.count??g.attributes.position.count))return 'Partial draw ranges are not supported; export a complete rigid mesh first';
  if(triangleCount(g)>KERNEL_LIMITS.inputTriangles)return 'Selected mesh exceeds '+KERNEL_LIMITS.inputTriangles+' input triangles; split this part first';
  if(geometryBytes(g)>KERNEL_LIMITS.bytes)return 'Selected mesh exceeds the 128 MiB detail buffer budget';
  const keys=Object.keys(g.attributes);
  if(keys.length>KERNEL_LIMITS.attributes)return 'Too many vertex attributes for a bounded detail operation';
  for(const key of keys){const a=g.attributes[key],arr=a.array||a.data?.array;
    if(!TYPES[arr?.constructor.name]||a.isFloat16BufferAttribute||a.itemSize<1||a.itemSize>4||key.startsWith('_ww'))return 'Unsupported vertex attribute '+key+'; the source is preserved';
    if(a.count!==g.attributes.position.count)return 'Vertex attribute counts do not match';
  }
  return '';
}
export function packGeometry(g,copy=true){
  if(geometryBytes(g)>KERNEL_LIMITS.bytes)fail('Geometry exceeds the detail buffer budget');
  const attributes={};
  for(const [name,a] of Object.entries(g.attributes)){
    const array=a.array||a.data.array;let values;
    if(name==='position'&&(!(array instanceof Float32Array)||a.normalized)){values=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){values[i*3]=a.getX(i);values[i*3+1]=a.getY(i);values[i*3+2]=a.getZ(i);}}
    else if(a.isInterleavedBufferAttribute){values=new array.constructor(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=array[i*a.data.stride+a.offset+k];}
    else values=copy?array.slice():array;
    attributes[name]={array:values,itemSize:a.itemSize,normalized:name==='position'?false:a.normalized};
  }
  return {attributes,index:g.index?(copy?g.index.array.slice():g.index.array):null,groups:g.groups.map(x=>({...x})),drawRange:{start:g.drawRange.start,count:Number.isFinite(g.drawRange.count)?g.drawRange.count:null}};
}
// Copy into transferable storage without detaching the immutable source. Chunking
// also covers interleaved importer attributes, where a native slice is not enough.
export async function packGeometryAsync(g,valid=()=>true){
  if(geometryBytes(g)>KERNEL_LIMITS.bytes)fail('Geometry exceeds the detail buffer budget');
  const attributes={},pause=()=>new Promise(r=>setTimeout(r,0)),check=()=>{if(!valid())throw Object.assign(Error('Detail work cancelled'),{cancelled:true});};
  for(const [name,a]of Object.entries(g.attributes)){
    check();const src=a.array||a.data.array,decode=name==='position'&&(!(src instanceof Float32Array)||a.normalized),dst=decode?new Float32Array(a.count*3):new src.constructor(a.count*a.itemSize);
    if(decode){for(let start=0;start<a.count;start+=8192){check();for(let i=start,end=Math.min(a.count,start+8192);i<end;i++){dst[i*3]=a.getX(i);dst[i*3+1]=a.getY(i);dst[i*3+2]=a.getZ(i);}await pause();}}
    else if(a.isInterleavedBufferAttribute){for(let start=0;start<a.count;start+=8192){check();for(let i=start,end=Math.min(a.count,start+8192);i<end;i++)for(let k=0;k<a.itemSize;k++)dst[i*a.itemSize+k]=src[i*a.data.stride+a.offset+k];await pause();}}
    else for(let start=0;start<src.length;start+=262144){check();dst.set(src.subarray(start,Math.min(src.length,start+262144)),start);await pause();}
    attributes[name]={array:dst,itemSize:a.itemSize,normalized:name==='position'?false:a.normalized};
  }
  let index=null;if(g.index){const src=g.index.array;index=new src.constructor(src.length);for(let start=0;start<src.length;start+=262144){check();index.set(src.subarray(start,Math.min(src.length,start+262144)),start);await pause();}}
  check();return {attributes,index,groups:g.groups.map(x=>({...x})),drawRange:{start:g.drawRange.start,count:Number.isFinite(g.drawRange.count)?g.drawRange.count:null}};
}
export function unpackGeometry(T,p){
  const g=new T.BufferGeometry();
  for(const [key,a]of Object.entries(p.attributes))g.setAttribute(key,new T.BufferAttribute(a.array,a.itemSize,!!a.normalized));
  if(p.index)g.setIndex(new T.BufferAttribute(p.index,1));
  for(const group of p.groups||[])g.addGroup(group.start,group.count,group.materialIndex);
  g.setDrawRange(p.drawRange?.start||0,p.drawRange?.count??Infinity);return g;
}
export function transferGeometry(p){return [...new Set([...Object.values(p.attributes).map(a=>a.array.buffer),...(p.index?[p.index.buffer]:[])])];}
export function signedVolume(g){const p=g.attributes.position,index=g.index;let total=0;for(let i=0,n=triangleCount(g)*3;i<n;i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;const ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),bx=p.getX(b),by=p.getY(b),bz=p.getZ(b),cx=p.getX(c),cy=p.getY(c),cz=p.getZ(c);total+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;}return total;}

export function createDetailKernel(T,D){
  const {Brush,Evaluator,GeometryBuilder,HalfEdgeMap,ADDITION,SUBTRACTION,edgeTable,triTable}=D;
  const yieldTurn=()=>new Promise(r=>setTimeout(r,0));
  const p3=(a,i)=>new T.Vector3().fromBufferAttribute(a,i);
  const ix=(g,i)=>g.index?g.index.getX(i):i;
  const materialIds=g=>{const ids=new Uint16Array(triangleCount(g));for(const r of g.groups)ids.fill(r.materialIndex,r.start/3,(r.start+r.count)/3);return ids;};
  function finite(g,max=KERNEL_LIMITS.outputTriangles){
    const n=triangleCount(g);if(!Number.isInteger(n)||n>max)fail('Detail triangle budget exceeded');
    if(geometryBytes(g)>KERNEL_LIMITS.bytes)fail('Detail byte budget exceeded');
    for(const [key,a]of Object.entries(g.attributes)){for(const value of a.array)if(!Number.isFinite(value))fail('Non-finite '+key+'; source geometry retained');}
    const p=g.attributes.position;for(const value of p.array)if(Math.abs(value)>KERNEL_LIMITS.maxCoordinate)fail('Detail is outside the local coordinate budget');
    if(g.index)for(const i of g.index.array)if(!Number.isInteger(i)||i<0||i>=p.count)fail('Invalid triangle index');
    let end=0;for(const r of g.groups){if(r.start!==end||r.start%3||r.count%3||r.materialIndex<0||r.materialIndex>=KERNEL_LIMITS.materials)fail('Overlapping, incomplete or invalid material groups');end+=r.count;}if(g.groups.length&&end!==n*3)fail('Material groups must cover the complete mesh');
    return n;
  }
  function weld(g){
    const p=g.attributes.position;g.computeBoundingBox();const span=Math.max(1e-7,g.boundingBox.getSize(new T.Vector3()).length()),eps=span*1e-7;
    const map=new Map(),ids=new Uint32Array(p.count),points=[];
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/eps)).join(',');let id=map.get(key);if(id===undefined){id=points.length;map.set(key,id);points.push(p3(p,i));}ids[i]=id;}
    return {ids,points,eps,span};
  }
  // Position-welded topology bridges UV and hard-normal seams without welding their attributes.
  function topology(g,withNeighbors=false){
    const w=weld(g),parent=Int32Array.from(w.points,(_,i)=>i),neighbors=withNeighbors?w.points.map(()=>new Set()):null;
    const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
    const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
    const edges=new Map();let degenerate=0,volume=0;
    for(let i=0,n=triangleCount(g)*3;i<n;i+=3){const a=w.ids[ix(g,i)],b=w.ids[ix(g,i+1)],c=w.ids[ix(g,i+2)];if(a===b||b===c||a===c){degenerate++;continue;}join(a,b);join(b,c);
      const pa=w.points[a],pb=w.points[b],pc=w.points[c];volume+=pa.dot(new T.Vector3().crossVectors(pb,pc))/6;
      for(const [u,v]of [[a,b],[b,c],[c,a]]){neighbors?.[u].add(v);neighbors?.[v].add(u);const k=u<v?u+':'+v:v+':'+u,e=edges.get(k)||{count:0,orientation:0};e.count++;e.orientation+=u<v?1:-1;edges.set(k,e);}
    }
    let open=0,nonManifold=0;for(const e of edges.values()){if(e.count===1)open++;else if(e.count!==2||e.orientation!==0)nonManifold++;}
    if(open&&!nonManifold&&HalfEdgeMap){const half=new HalfEdgeMap();half.matchDisjointEdges=true;half.degenerateEpsilon=w.eps;half.updateFrom(g);open=half.unmatchedEdges;}
    const component=Int32Array.from(parent,(_,i)=>find(i));return {...w,component,neighbors,open,nonManifold,degenerate,volume};
  }
  async function inspect(g){
    finite(g,KERNEL_LIMITS.inputTriangles);await yieldTurn();
    if(g.attributes.skinIndex&&g.attributes.skinWeight)return {supported:true,sculptOnly:true,reason:'',kinds:['inflate','smooth','flatten'],triangles:triangleCount(g),vertices:g.attributes.position.count};
    if(!triangleCount(g))return {supported:true,reason:'Empty result: Add can create a new closed detail; Clear restores the source',triangles:0,vertices:0,components:0,volume:0};
    const t=topology(g);const reason=t.nonManifold?'Non-manifold or inconsistent winding: solid detail needs an oriented closed surface':t.open?'Open surface ('+t.open+' boundary edges): solid detail needs a closed source mesh':t.volume<=t.span**3*1e-12?'Inside-out or zero-volume surface: repair source winding before solid detail':'';
    return {supported:!reason,reason,triangles:triangleCount(g),vertices:g.attributes.position.count,components:new Set(t.component).size,volume:t.volume,boundaryEdges:t.open,nonManifoldEdges:t.nonManifold};
  }
  function frame(op){const normal=new T.Vector3().fromArray(op.normal).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal);return {q,inv:q.clone().invert(),normal,center:new T.Vector3().fromArray(op.center)};}
  function sdfLocal(x,y,z,r,shape){if(shape==='sphere')return Math.hypot(x,y,z)-r;const a=Math.abs(x)-r,b=Math.abs(y)-r,c=Math.abs(z)-r;return Math.hypot(Math.max(a,0),Math.max(b,0),Math.max(c,0))+Math.min(Math.max(a,b,c),0);}
  function fallbackUV(p,n,r,center){const d=p.clone().sub(center).multiplyScalar(1/(2*r));const a=[Math.abs(n.x),Math.abs(n.y),Math.abs(n.z)],axis=a.indexOf(Math.max(...a));return axis===0?[d.z+.5,d.y+.5]:axis===1?[d.x+.5,d.z+.5]:[d.x+.5,d.y+.5];}
  async function brushGeometry(op,progress=()=>{}){
    const n=op.resolution,r=op.radius*Math.cbrt(op.strength),extent=r*1.037,step=2*extent/n,side=n+1,f=frame(op);
    if(r<Math.max(1e-8,...op.center.map(x=>Math.abs(x)*2e-7)))fail('Brush radius is below the precision of these mesh-local coordinates');
    const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    let total=0,write=0,positions,normals,uvs;const values=new Float64Array(8),verts=Array.from({length:12},()=>new T.Vector3());
    // Count before allocation; only two slabs, never a volume of the model or a saved grid.
    for(let pass=0;pass<2;pass++){
      let lo=new Float64Array(side*side),hi=new Float64Array(side*side);
      const slab=(arr,z)=>{for(let y=0;y<=n;y++)for(let x=0;x<=n;x++)arr[y*side+x]=sdfLocal(-extent+x*step,-extent+y*step,-extent+z*step,r,op.shape);};slab(lo,0);
      for(let z=0;z<n;z++){slab(hi,z+1);
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){
          let mask=0;for(let k=0;k<8;k++){const c=corners[k],v=(c[2]?hi:lo)[(y+c[1])*side+x+c[0]];values[k]=v;if(v<0)mask|=1<<k;}if(!edgeTable[mask])continue;
          if(pass)for(let e=0;e<12;e++)if(edgeTable[mask]&(1<<e)){const [a,b]=edges[e],u=values[a]/(values[a]-values[b]),c=corners[a],d=corners[b];verts[e].set(-extent+(x+c[0]+u*(d[0]-c[0]))*step,-extent+(y+c[1]+u*(d[1]-c[1]))*step,-extent+(z+c[2]+u*(d[2]-c[2]))*step);}
          for(let k=mask*16;triTable[k]!==-1;k+=3){if(!pass){if(++total>KERNEL_LIMITS.brushTriangles)fail('Brush tessellation exceeds its triangle budget');continue;}
            const vs=[verts[triTable[k]].clone(),verts[triTable[k+1]].clone(),verts[triTable[k+2]].clone()];
            const face=new T.Vector3().subVectors(vs[1],vs[0]).cross(new T.Vector3().subVectors(vs[2],vs[0])),mid=vs[0].clone().add(vs[1]).add(vs[2]);if(face.dot(mid)<0){[vs[1],vs[2]]=[vs[2],vs[1]];face.negate();}face.normalize();
            for(const v of vs){const norm=(op.shape==='sphere'?v.clone().normalize():face.clone()).applyQuaternion(f.q),pos=v.applyQuaternion(f.q).add(f.center),uv=fallbackUV(pos,norm,r,f.center);positions.set(pos.toArray(),write*3);normals.set(norm.toArray(),write*3);uvs.set(uv,write*2);write++;}
          }
        }
        [lo,hi]=[hi,lo];if(z%8===7){progress('Tessellating analytic '+op.shape+' · '+Math.round((pass*n+z+1)/(2*n)*100)+'%');await yieldTurn();}
      }
      if(!pass){if(total*3*32>KERNEL_LIMITS.bytes/2)fail('Brush exceeds buffer budget');positions=new Float32Array(total*9);normals=new Float32Array(total*9);uvs=new Float32Array(total*6);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));return g;
  }
  function read(a,i,k){return a.getComponent(i,k);}
  function set(a,i,k,v){a.setComponent(i,k,v);}
  function floatGeometry(g,source=false){
    const out=new T.BufferGeometry();for(const [key,a]of Object.entries(g.attributes)){const data=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=read(a,i,k);out.setAttribute(key==='tangent'?'_wwTangent':key,new T.BufferAttribute(data,a.itemSize));}
    if(g.index)out.setIndex(g.index.clone());for(const r of g.groups)out.addGroup(r.start,r.count,r.materialIndex);
    if(!out.attributes.normal)out.computeVertexNormals();if(!out.attributes.uv)out.setAttribute('uv',new T.BufferAttribute(new Float32Array(out.attributes.position.count*2),2));
    const ids=new Float32Array(out.attributes.position.count);ids.fill(-1);if(source)for(let i=0;i<ids.length;i++)ids[i]=i;out.setAttribute('_wwSource',new T.BufferAttribute(ids,1));return out;
  }
  function matchBrushAttributes(brush,reference,op){
    for(const [key,a]of Object.entries(reference.attributes)){if(brush.attributes[key])continue;const data=new Float32Array(brush.attributes.position.count*a.itemSize),attr=new T.BufferAttribute(data,a.itemSize);
      for(let i=0;i<attr.count;i++){if(key.startsWith('uv')){set(attr,i,0,brush.attributes.uv.getX(i));if(a.itemSize>1)set(attr,i,1,brush.attributes.uv.getY(i));}else if(key==='color'){for(let j=0;j<a.itemSize;j++)set(attr,i,j,1);}else if(key==='_wwTangent'){const normal=p3(brush.attributes.normal,i),axis=Math.abs(normal.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0),t=axis.cross(normal).normalize();for(let j=0;j<3;j++)set(attr,i,j,t.getComponent(j));if(a.itemSize===4)set(attr,i,3,1);}else if(key==='_wwSource')set(attr,i,0,-1);}
      brush.setAttribute(key,attr);
    }
    for(const key of Object.keys(brush.attributes))if(!reference.attributes[key])brush.deleteAttribute(key);
  }
  // Normalize only new/interpolated normals. A single short interpolated normal
  // otherwise makes GLTFExporter renormalize the ENTIRE attribute, including
  // immutable source corners whose Float32 bytes must remain untouched.
  function unitNormal(a,i){if(!a)return;const x=read(a,i,0),y=read(a,i,1),z=read(a,i,2),l=Math.hypot(x,y,z);if(l>1e-20){set(a,i,0,x/l);set(a,i,1,y/l);set(a,i,2,z/l);}}
  function restoreAttributeTypes(out,original){
    const restored=new T.BufferGeometry(),id=out.attributes._wwSource,p=out.attributes.position,sp=original.attributes.position;
    for(const [name,a]of Object.entries(out.attributes)){if(name==='_wwSource')continue;const key=name==='_wwTangent'?'tangent':name,old=original.attributes[key],array=old?new old.array.constructor(a.count*a.itemSize):new Float32Array(a.count*a.itemSize),next=new T.BufferAttribute(array,a.itemSize,old?.normalized||false);
      for(let i=0;i<a.count;i++){const s=id.getX(i),exact=old&&Number.isInteger(s)&&s>=0&&s<sp.count&&p.getX(i)===sp.getX(s)&&p.getY(i)===sp.getY(s)&&p.getZ(i)===sp.getZ(s);
        for(let k=0;k<a.itemSize;k++){if(exact)array[i*a.itemSize+k]=old.array[s*a.itemSize+k];else set(next,i,k,read(a,i,k));}if(!exact&&key==='normal')unitNormal(next,i);
      }restored.setAttribute(key,next);
    }
    if(out.index)restored.setIndex(out.index.clone());for(const r of out.groups)restored.addGroup(r.start,r.count,r.materialIndex);restored.setDrawRange(0,triangleCount(out)*3);return restored;
  }
  class LimitedBuilder extends GeometryBuilder{
    initFromGeometry(...args){super.initFromGeometry(...args);this.written=0;const stride=Object.values(this.attributeData).reduce((n,a)=>n+a.itemSize*4,4);this.cap=Math.min(KERNEL_LIMITS.outputTriangles*3,Math.floor(KERNEL_LIMITS.bytes/(stride*2)));}
    check(){if(++this.written>this.cap)fail('Boolean output allocation budget exceeded; use a smaller brush or split the part');}
    appendIndexFromGeometry(...args){this.check();return super.appendIndexFromGeometry(...args);}
    appendInterpolatedAttributeData(...args){this.check();return super.appendInterpolatedAttributeData(...args);}
  }
  async function boolean(g,palette,op,progress){
    if(op.strength===0)return {geometry:g,palette,changed:false,reason:'Zero strength'};
    const before=Math.abs(signedVolume(g));const raw=await brushGeometry(op,progress),brush=floatGeometry(raw),source=floatGeometry(g,true);raw.dispose();matchBrushAttributes(brush,source,op);
    const mats=palette.map((p,i)=>({slot:i})),cutter={slot:mats.length},a=new Brush(source,mats),b=new Brush(brush,cutter),evaluator=new Evaluator();a.updateMatrixWorld(true);b.updateMatrixWorld(true);
    evaluator.geometryBuilders=[new LimitedBuilder()];evaluator.attributes=Object.keys(source.attributes);evaluator.useGroups=true;evaluator.removeUnusedMaterials=false;evaluator.useCDTClipping=true;
    let result,out;
    try{
      progress('Stitching local brush intersections…');await yieldTurn();
      // Guard the BVH pair walk before its intersection arrays grow. This is a
      // pinned MIT dependency surface (three-bvh-csg 0.0.18 / mesh-bvh 0.9.15).
      a.prepareGeometry();b.prepareGeometry();let pairs=0;const tree=source.boundsTree,cast=tree.bvhcast.bind(tree);
      tree.bvhcast=(other,matrix,callbacks)=>cast(other,matrix,{...callbacks,intersectsTriangles:(...args)=>{if(++pairs>KERNEL_LIMITS.intersectionPairs)fail('Too many local triangle intersections; reduce resolution or radius');return callbacks.intersectsTriangles(...args);}});
      result=evaluator.evaluate(a,b,op.kind==='add'?ADDITION:SUBTRACTION);
      finite(result.geometry);out=restoreAttributeTypes(result.geometry,g);finite(out);
      const after=Math.abs(signedVolume(out)),delta=after-before,tolerance=Math.max(1e-12,before*1e-9);
      if(Math.abs(delta)<=tolerance){out.dispose();return {geometry:g,palette,changed:false,reason:op.kind==='cut'?'Brush removes no volume (outside the solid, tangent, or inside an existing void)':'Brush adds no volume (inside existing solid)'};}
      if(op.kind==='cut'&&delta>tolerance||op.kind==='add'&&delta< -tolerance){out.dispose();fail('Boolean winding did not produce a valid volume; original detail retained');}
      const nextPalette=[...palette,{color:op.color,role:op.kind==='cut'?'cut-surface':'added-surface',uv:'dominant-axis mesh-local projection'}];
      // Evaluator keeps full input material slots, including slots not used by a group.
      for(const r of out.groups)r.materialIndex=result.material[r.materialIndex].slot;
      return {geometry:out,palette:nextPalette,changed:true,volumeBefore:before,volumeAfter:after,deltaVolume:delta,triangles:triangleCount(out),intersections:pairs,empty:!triangleCount(out)};
    }finally{a.disposeCacheData();b.disposeCacheData();source.dispose();brush.dispose();result?.geometry.dispose();}
  }
  function pushGroup(g,start,count,material){const last=g.groups[g.groups.length-1];if(last&&last.materialIndex===material)last.count+=count;else g.addGroup(start,count,material);}
  async function refine(g,op,progress,selectedMask){
    const radius=op.radius,target=2*radius/op.resolution,f=frame(op);let current=g;
    const tri=new T.Triangle(),near=new T.Vector3();
    for(let pass=0;pass<KERNEL_LIMITS.refinementPasses;pass++){
      const topo=weld(current),p=current.attributes.position,marks=new Set(),edge=(a,b)=>{a=topo.ids[a];b=topo.ids[b];return a<b?a+':'+b:b+':'+a;};
      for(let i=0,n=triangleCount(current)*3;i<n;i+=3){const ids=[ix(current,i),ix(current,i+1),ix(current,i+2)];if(!selectedMask[ids[0]])continue;tri.set(...ids.map(j=>p3(p,j)));tri.closestPointToPoint(f.center,near);if(near.distanceToSquared(f.center)>radius*radius*(op.shape==='box'?3:1))continue;
        for(const [a,b]of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]])if(p3(p,a).distanceToSquared(p3(p,b))>target*target)marks.add(edge(a,b));
      }
      if(!marks.size)return current;
      const midpoints=new Map();let triangles=0;
      const key=(a,b)=>a<b?a+':'+b:b+':'+a;
      for(let i=0,n=triangleCount(current)*3;i<n;i+=3){const a=ix(current,i),b=ix(current,i+1),c=ix(current,i+2);triangles++;for(const [u,v]of [[a,b],[b,c],[c,a]])if(marks.has(edge(u,v))){triangles++;const k=key(u,v);if(!midpoints.has(k))midpoints.set(k,{a:u,b:v,id:p.count+midpoints.size});}}
      const count=p.count+midpoints.size,stride=Object.values(current.attributes).reduce((n,a)=>n+a.itemSize*a.array.BYTES_PER_ELEMENT,0);
      if(triangles>KERNEL_LIMITS.outputTriangles||(count*stride+triangles*12)*2>KERNEL_LIMITS.bytes)fail('Local detail refinement exceeds its allocation budget; lower resolution or radius');
      const next=new T.BufferGeometry(),nextMask=new Uint8Array(count);nextMask.set(selectedMask);for(const {a,b,id}of midpoints.values())nextMask[id]=selectedMask[a]&&selectedMask[b]?1:0;selectedMask=nextMask;
      for(const [name,a]of Object.entries(current.attributes)){const arr=new a.array.constructor(count*a.itemSize),attr=new T.BufferAttribute(arr,a.itemSize,a.normalized);arr.set(a.array);for(const {a:u,b:v,id}of midpoints.values()){for(let k=0;k<a.itemSize;k++)set(attr,id,k,(read(a,u,k)+read(a,v,k))*.5);if(name==='normal'){const normal=p3(attr,id).normalize();attr.setXYZ(id,...normal.toArray());}}next.setAttribute(name,attr);}
      const indices=new Uint32Array(triangles*3),slots=materialIds(current);let at=0;
      const put=(a,b,c)=>{indices[at++]=a;indices[at++]=b;indices[at++]=c;};
      for(let i=0,n=triangleCount(current)*3;i<n;i+=3){let a=ix(current,i),b=ix(current,i+1),c=ix(current,i+2),ab=midpoints.get(key(a,b))?.id,bc=midpoints.get(key(b,c))?.id,ca=midpoints.get(key(c,a))?.id;const start=at,num=Number(ab!==undefined)+Number(bc!==undefined)+Number(ca!==undefined);
        if(num===0)put(a,b,c);
        else if(num===3){put(a,ab,ca);put(ab,b,bc);put(ca,bc,c);put(ab,bc,ca);}
        else {if(num===1){if(bc!==undefined){[a,b,c]=[b,c,a];ab=bc;}else if(ca!==undefined){[a,b,c]=[c,a,b];ab=ca;}put(a,ab,c);put(ab,b,c);}else {if(ab===undefined){[a,b,c]=[b,c,a];[ab,bc]=[bc,ca];}else if(bc===undefined){[a,b,c]=[c,a,b];[ab,bc]=[ca,ab];}put(b,bc,ab);put(a,ab,c);put(ab,bc,c);}}
        pushGroup(next,start,at-start,slots[i/3]);
      }
      for(let i=current.attributes.position.count;i<next.attributes.position.count;i++)unitNormal(next.attributes.normal,i);next.setIndex(new T.BufferAttribute(indices,1));if(current!==g)current.dispose();current=next;progress('Refining only the brush footprint · pass '+(pass+1));await yieldTurn();
    }
    return current;
  }
  async function deform(g,palette,op,progress){
    if(!triangleCount(g)||op.strength===0)return {geometry:g,palette,changed:false,reason:'No surface or zero strength'};
    // Pick a connected surface by triangle distance, not vertex density. Refine
    // only that component, even if another disconnected part lies inside the brush.
    const f=frame(op),initial=topology(g),tri=new T.Triangle(),near=new T.Vector3();let seed=0,best=Infinity;
    for(let i=0,n=triangleCount(g)*3;i<n;i+=3){const ids=[ix(g,i),ix(g,i+1),ix(g,i+2)];tri.set(...ids.map(j=>p3(g.attributes.position,j)));tri.closestPointToPoint(f.center,near);const d=near.distanceToSquared(f.center);if(d<best){best=d;seed=ids[0];}}
    const component=initial.component[initial.ids[seed]],mask=Uint8Array.from(initial.ids,id=>initial.component[id]===component?1:0);
    const refined=g.attributes.skinIndex?g:await refine(g,op,progress,mask),t=topology(refined,true),r=op.radius,closest=t.component[t.ids[seed]],weights=new Float64Array(t.points.length),normals=t.points.map(()=>new T.Vector3()),shortest=new Float64Array(t.points.length).fill(Infinity);
    for(let i=0,n=triangleCount(refined)*3;i<n;i+=3){const ids=[0,1,2].map(k=>t.ids[ix(refined,i+k)]),[a,b,c]=ids.map(j=>t.points[j]),normal=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));for(const id of ids)normals[id].add(normal);}
    for(let i=0;i<t.points.length;i++){if(t.component[i]!==closest)continue;const p=t.points[i].clone().sub(f.center).applyQuaternion(f.inv),distance=op.shape==='box'?Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z)):p.length(),u=Math.max(0,1-(distance/r)**2);weights[i]=u*u;normals[i].normalize();for(const j of t.neighbors[i])shortest[i]=Math.min(shortest[i],t.points[i].distanceTo(t.points[j]));}
    const positions=t.points.map(p=>p.clone()),iterations=op.kind==='smooth'?4:1;let moved=0;
    for(let pass=0;pass<iterations;pass++){const deltas=positions.map(()=>new T.Vector3());for(let i=0;i<positions.length;i++){if(weights[i]===0)continue;const delta=deltas[i],p=positions[i],w=weights[i]*op.strength;
        if(op.kind==='inflate')delta.copy(normals[i]).multiplyScalar(r*.18*w);
        else if(op.kind==='flatten')delta.copy(f.normal).multiplyScalar(-p.clone().sub(f.center).dot(f.normal)*w);
        else {for(const j of t.neighbors[i])delta.add(positions[j]);delta.multiplyScalar(1/Math.max(1,t.neighbors[i].size)).sub(p).multiplyScalar((pass%2===0?.46:-.48)*w);}
        delta.clampLength(0,Math.min(r*.2,shortest[i]*.35)/iterations);
      }for(let i=0;i<positions.length;i++)positions[i].add(deltas[i]);await yieldTurn();}
    const requested=positions.map((p,i)=>p.clone().sub(t.points[i]));let appliedScale=1,safe=false;
    const f32=p=>new T.Vector3(Math.fround(p.x),Math.fround(p.y),Math.fround(p.z));
    for(let attempt=0;attempt<13;attempt++,appliedScale*=.5){
      for(let i=0;i<positions.length;i++)positions[i].copy(t.points[i]).addScaledVector(requested[i],appliedScale);
      safe=true;for(let i=0,n=triangleCount(refined)*3;i<n;i+=3){const ids=[0,1,2].map(k=>t.ids[ix(refined,i+k)]),a=ids.map(j=>t.points[j]),b=ids.map(j=>f32(positions[j])),old=new T.Vector3().subVectors(a[1],a[0]).cross(new T.Vector3().subVectors(a[2],a[0])),next=new T.Vector3().subVectors(b[1],b[0]).cross(new T.Vector3().subVectors(b[2],b[0]));if(old.lengthSq()>t.span**4*1e-24&&next.dot(old)<=old.lengthSq()*1e-6){safe=false;break;}}
      if(safe)break;await yieldTurn();
    }
    if(!safe){if(refined!==g)refined.dispose();fail('This surface has no safe displacement at this brush size; use a smaller footprint');}
    const out=refined.clone(),p=out.attributes.position,changed=new Uint8Array(p.count),normalGroups=new Map(),cluster=[];
    for(let i=0;i<p.count;i++){const position=positions[t.ids[i]],previous=p3(p,i);if(position.distanceToSquared(previous)>t.span*t.span*1e-18){p.setXYZ(i,...position.toArray());changed[i]=1;moved++;}const n=refined.attributes.normal?p3(refined.attributes.normal,i):new T.Vector3();const key=t.ids[i]+':'+n.toArray().map(v=>Math.round(v*10000)).join(',');cluster[i]=key;if(!normalGroups.has(key))normalGroups.set(key,{sum:new T.Vector3(),changed:false});}
    if(!moved){out.dispose();if(refined!==g)refined.dispose();return {geometry:g,palette,changed:false,reason:'No vertices move inside this brush footprint'};}
    for(let i=0,n=triangleCount(out)*3;i<n;i+=3){const ids=[0,1,2].map(k=>ix(out,i+k)),a=ids.map(j=>p3(refined.attributes.position,j)),b=ids.map(j=>p3(p,j)),old=new T.Vector3().subVectors(a[1],a[0]).cross(new T.Vector3().subVectors(a[2],a[0])),next=new T.Vector3().subVectors(b[1],b[0]).cross(new T.Vector3().subVectors(b[2],b[0]));if(old.lengthSq()>t.span**4*1e-24&&next.dot(old)<=0){out.dispose();if(refined!==g)refined.dispose();fail('This stamp would fold a surface triangle; reduce strength');}const touched=ids.some(j=>changed[j]);for(const j of ids){const group=normalGroups.get(cluster[j]);group.sum.add(next);group.changed||=touched;}}
    if(!out.attributes.normal)out.setAttribute('normal',new T.BufferAttribute(new Float32Array(p.count*3),3));
    for(let i=0;i<p.count;i++){const group=normalGroups.get(cluster[i]);if(group.changed)out.attributes.normal.setXYZ(i,...group.sum.clone().normalize().toArray());}
    // Existing tangent handedness survives; re-orthogonalize only altered normal clusters.
    const tangent=out.attributes.tangent;if(tangent)for(let i=0;i<p.count;i++)if(normalGroups.get(cluster[i]).changed){const n=p3(out.attributes.normal,i),v=p3(tangent,i);v.addScaledVector(n,-v.dot(n)).normalize();tangent.setXYZ(i,...v.toArray());}
    if(refined!==g)refined.dispose();finite(out);return {geometry:out,palette,changed:true,movedVertices:moved,appliedStrength:op.strength*appliedScale,limited:appliedScale<1,volumeBefore:Math.abs(signedVolume(g)),volumeAfter:Math.abs(signedVolume(out)),triangles:triangleCount(out)};
  }
  async function apply(g,palette,operation,progress=()=>{}){
    const op=validateOperation(operation);finite(g);if(g.attributes.skinIndex&&['add','cut'].includes(op.kind))fail('Add/Cut need new skin weights; use Inflate, Smooth or Flatten to preserve this rig');if(palette.length>=KERNEL_LIMITS.materials)fail('Detail material-slot limit reached');
    return op.kind==='add'||op.kind==='cut'?boolean(g,palette,op,progress):deform(g,palette,op,progress);
  }
  async function replay(base,palette,operations,options={}){
    if(operations.length>LIMITS.maxOperations)fail('Too many detail operations');const support=await inspect(base);if(!support.supported)fail(support.reason);
    let geometry=base,materials=palette;const receipts=[];
    try{for(let i=0;i<operations.length;i++){if(options.cancelled?.())fail('Detail work cancelled');options.progress?.('Replaying detail '+(i+1)+' / '+operations.length);const r=await apply(geometry,materials,operations[i],options.progress);if(r.geometry!==geometry&&geometry!==base)geometry.dispose();geometry=r.geometry;materials=r.palette;const {geometry:unused,palette:unusedPalette,...receipt}=r;receipts.push(receipt);await yieldTurn();}return {geometry,palette:materials,receipts,support};}
    catch(error){if(geometry!==base)geometry.dispose();throw error;}
  }
  return {inspect,apply,replay,brushGeometry,topology};
}
