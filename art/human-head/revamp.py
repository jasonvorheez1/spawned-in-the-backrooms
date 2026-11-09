"""Rebuild human head surfaces, fitted facial-hair/blush parts and hair finishes.
Run from the world root with --work <asset cache> [--upload]. No secrets in outputs.
Skeletons, animations, clothing and all named expression targets are preserved.
"""
import argparse, concurrent.futures as cf, copy, hashlib, json, os, pathlib, re, struct, urllib.request
import numpy as np
import yaml

ap=argparse.ArgumentParser(); ap.add_argument('--work',required=True); ap.add_argument('--upload',action='store_true'); ap.add_argument('--bodies-only',action='store_true'); args=ap.parse_args()
cache=pathlib.Path(args.work); cache.mkdir(parents=True,exist_ok=True)
ROOT=pathlib.Path('.'); WID='1396599f-f852-4004-a2e6-87336fcb919c'
DT={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}; NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
class GLB:
 def __init__(self,data):
  l=struct.unpack_from('<I',data,12)[0]; self.j=json.loads(data[20:20+l]); off=20+l; n=struct.unpack_from('<I',data,off)[0]; self.b=bytearray(data[off+8:off+8+n])
 def get(self,i):
  a=self.j['accessors'][i]; dt=np.dtype(DT[a['componentType']]); count=NC[a['type']]
  out=np.zeros((a['count'],count),dtype=dt)
  if 'bufferView' in a:
   v=self.j['bufferViews'][a['bufferView']]; off=v.get('byteOffset',0)+a.get('byteOffset',0)
   out=np.ndarray((a['count'],count),dtype=dt,buffer=self.b,offset=off,strides=(v.get('byteStride',dt.itemsize*count),dt.itemsize)).copy()
  if 'sparse' in a:
   s=a['sparse']; si=s['indices']; sv=s['values']; vi=self.j['bufferViews'][si['bufferView']]; vv=self.j['bufferViews'][sv['bufferView']]
   ids=np.frombuffer(self.b,dtype=DT[si['componentType']],count=s['count'],offset=vi.get('byteOffset',0)+si.get('byteOffset',0))
   vals=np.frombuffer(self.b,dtype=dt,count=s['count']*count,offset=vv.get('byteOffset',0)+sv.get('byteOffset',0)).reshape(-1,count); out[ids]=vals
  return out
 def add(self,p):
  p=np.ascontiguousarray(p); self.b.extend(b'\0'*(-len(self.b)%4)); off=len(self.b); self.b.extend(p.tobytes()); j=self.j
  j['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':p.nbytes}); typ={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[p.shape[1]]
  a={'bufferView':len(j['bufferViews'])-1,'componentType':5126 if p.dtype.kind=='f' else 5125 if p.dtype.itemsize==4 else 5123 if p.dtype.itemsize==2 else 5121,'count':len(p),'type':typ}
  if p.dtype.kind=='f': a.update(min=p.min(0).tolist(),max=p.max(0).tolist())
  j['accessors'].append(a); return len(j['accessors'])-1
 def bytes(self):
  # Drop replaced geometry and store mostly-zero morph targets sparsely.
  refs=[]
  for mesh in self.j['meshes']:
   for pr in mesh['primitives']:
    refs.extend((pr['attributes'],k) for k in pr['attributes'])
    if 'indices' in pr: refs.append((pr,'indices'))
    for t in pr.get('targets',[]): refs.extend((t,k) for k in t)
  for skin in self.j.get('skins',[]):
   if 'inverseBindMatrices' in skin: refs.append((skin,'inverseBindMatrices'))
  for anim in self.j.get('animations',[]):
   for sampler in anim['samplers']: refs.extend([(sampler,'input'),(sampler,'output')])
  newacc=[]; views=[]; binary=bytearray(); lookup={}; remap={}
  def store(data):
   binary.extend(b'\0'*(-len(binary)%4)); off=len(binary); binary.extend(data); views.append({'buffer':0,'byteOffset':off,'byteLength':len(data)}); return len(views)-1
  for ob,key in refs:
   old=ob[key]
   if old not in remap:
    arr=self.get(old); a=self.j['accessors'][old]; signature=(arr.dtype.str,arr.shape,a.get('normalized',False),hashlib.sha256(arr.tobytes()).digest())
    if signature in lookup: remap[old]=lookup[signature]
    else:
     na={k:v for k,v in a.items() if k not in ['bufferView','byteOffset','sparse']}; nonzero=np.where(np.any(arr!=0,axis=1))[0]
     if len(nonzero)==0: pass
     elif arr.dtype.kind=='f' and len(nonzero)<len(arr)*.5:
      ids=nonzero.astype('<u4'); vals=np.ascontiguousarray(arr[nonzero]); na['sparse']={'count':len(ids),'indices':{'bufferView':store(ids.tobytes()),'componentType':5125},'values':{'bufferView':store(vals.tobytes())}}
     else: na['bufferView']=store(arr.tobytes())
     remap[old]=len(newacc); lookup[signature]=len(newacc); newacc.append(na)
   ob[key]=remap[old]
  for img in self.j.get('images',[]):
   if 'bufferView' in img:
    v=self.j['bufferViews'][img['bufferView']]; off=v.get('byteOffset',0); img['bufferView']=store(self.b[off:off+v['byteLength']])
  self.j['accessors']=newacc; self.j['bufferViews']=views; self.b=binary
  self.j['buffers'][0]['byteLength']=len(self.b); js=json.dumps(self.j,separators=(',',':')).encode(); js+=b' '*(-len(js)%4); self.b.extend(b'\0'*(-len(self.b)%4))
  return struct.pack('<III',0x46546c67,2,28+len(js)+len(self.b))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(self.b),0x004e4942)+self.b

def fetch(ref):
 h=re.search(r'value\.([a-f0-9]+)\.glb',ref).group(1); p=cache/(h+'.glb')
 if not p.exists(): p.write_bytes(urllib.request.urlopen('https://spawnfile.io/dev/magic-assets/v5/values/'+h+'.glb',timeout=90).read())
 return p.read_bytes()
def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def normals(p,tri):
 n=np.zeros_like(p); f=np.cross(p[tri[:,1]]-p[tri[:,0]],p[tri[:,2]]-p[tri[:,0]])
 for k in range(3): np.add.at(n,tri[:,k],f)
 _,inv=np.unique(np.round(p,6),axis=0,return_inverse=True); merged=np.zeros((inv.max()+1,3),dtype=p.dtype); np.add.at(merged,inv,n); n=merged[inv]
 return n/np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
def subdiv(g,pr):
 tri=g.get(pr['indices']).reshape(-1,3); edges=np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1); edges,inv=np.unique(edges,axis=0,return_inverse=True)
 n=len(g.get(pr['attributes']['POSITION'])); ab,bc,ca=(inv.reshape(3,-1)+n); a,b,c=tri.T
 out=np.concatenate([np.stack([a,ab,ca],1),np.stack([ab,b,bc],1),np.stack([ca,bc,c],1),np.stack([ab,bc,ca],1)]).astype('<u4')
 def split(idx,key):
  p=g.get(idx); mid=p[edges[:,0]] if key.startswith('JOINTS') else (p[edges[:,0]].astype(float)+p[edges[:,1]])/2
  return g.add(np.concatenate([p,mid]).astype(p.dtype))
 pr['attributes']={k:split(v,k) for k,v in pr['attributes'].items()}
 for t in pr.get('targets',[]):
  for k,v in list(t.items()): t[k]=split(v,k)
 pr['indices']=g.add(out.reshape(-1,1)); return out

def rebuild_body(ref,sex):
 g=GLB(fetch(ref)); j=g.j
 mi=next(i for i,m in enumerate(j['meshes']) if any(j['materials'][p['material']].get('name')=='Head_Skin' for p in m['primitives']))
 head=j['meshes'][mi]; node=next(n for n in j['nodes'] if n.get('mesh')==mi); male=sex=='m'
 iris=g.get(next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Iris')['attributes']['POSITION'])
 mouth=g.get(next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Mouth')['attributes']['POSITION'])
 ey=float(iris[:,1].mean()); my=float(mouth[:,1].mean()); ys=.08/(ey-my); xs=.05/float(np.abs(iris[:,0]).mean())
 def canonical(p):
  q=p.copy(); q[:,0]*=xs; q[:,1]=(q[:,1]-ey)*ys+1.605; return q
 def sculpt(p):
  orig=p; p=canonical(p); x,y,z=p.T; q=p.copy(); face=smooth(-.15,-.05,z); low=np.exp(-((y-1.51)/.047)**2)*face
  # Distinct male skull: firm jaw corners, longer chin, narrower eye opening,
  # developed nasal bridge and brow; crown/neck anchors stay fixed for hats.
  q[:,0]+=x*low*(-.16 if male else -.025)
  q[:,1]-=(.004 if male else .002)*np.exp(-((y-1.49)/.04)**2)*face
  q[:,2]+=(.009 if male else .003)*np.exp(-((y-1.62)/.018)**2)*np.exp(-(x/.025)**2)*face
  q[:,2]+=(.005 if male else .0015)*np.exp(-((y-1.646)/.014)**2)*face
  eye=smooth(.004,.018,np.abs(x))*(1-smooth(.085,.105,np.abs(x)))*smooth(1.545,1.570,y)*(1-smooth(1.632,1.655,y))*face
  q[:,1]+=((1.605-y)*.50+.010)*eye if male else (1.605-y)*eye*.035
  if male:
   lower=smooth(1.455,1.49,y)*(1-smooth(1.590,1.620,y))*face
   q[:,1]+=(1.615-y)*.16*lower
   lean=np.exp(-((y-1.555)/.060)**4)*face
   q[:,0]-=x*.13*lean
   q[:,0]+=(np.sign(x)*.05-x)*.08*eye
   lip=np.exp(-((y-1.525)/.014)**4)*np.exp(-(x/.036)**4)*face
   q[:,0]+=x*.30*lip
   q[:,2]+=.014*np.exp(-((y-1.599)/.027)**2)*np.exp(-(x/.012)**2)*face
   q[:,2]+=.004*np.exp(-((y-1.490)/.018)**2)*np.exp(-(x/.032)**2)*face
   cheek=np.exp(-((y-1.57)/.023)**2)*np.exp(-((np.abs(x)-.074)/.022)**2)*face
   q[:,2]+=.004*cheek
  q[:,0]/=xs; q[:,1]=(q[:,1]-1.605)/ys+ey
  return q
 for pr in head['primitives']:
  tri=subdiv(g,pr)
  old=g.get(pr['attributes']['POSITION']); new=sculpt(old); pr['attributes']['POSITION']=g.add(new)
  relax=lambda a:a
  if male and j['materials'][pr['material']]['name']=='Head_Skin':
   _,gid=np.unique(np.round(old,6),axis=0,return_inverse=True); ng=gid.max()+1
   edge=np.unique(np.sort(gid[np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]])],axis=1),axis=0); edge=edge[edge[:,0]!=edge[:,1]]
   nc=np.bincount(gid,minlength=ng)[:,None]; degree=np.bincount(edge.ravel(),minlength=ng)[:,None]
   cp=canonical(old); w=smooth(1.455,1.48,cp[:,1])*(1-smooth(1.51,1.535,cp[:,1]))*smooth(-.13,-.04,old[:,2])
   wg=np.zeros(ng); np.add.at(wg,gid,w); wg=(wg/nc[:,0])[:,None]
   def relax(a):
    pp=np.zeros((ng,3)); np.add.at(pp,gid,a); pp/=nc
    for _ in range(8):
     total=np.zeros_like(pp); np.add.at(total,edge[:,0],pp[edge[:,1]]); np.add.at(total,edge[:,1],pp[edge[:,0]])
     pp+=(total/np.maximum(degree,1)-pp)*wg*.24
    return pp[gid].astype('<f4')
   new=relax(new); pr['attributes']['POSITION']=g.add(new)
  if male and j['materials'][pr['material']]['name']=='Brow':
   def brows(a):
    q=a.copy(); q[:,1]=1.642+(q[:,1]-1.642)*1.35+.004*(np.abs(q[:,0])-.05)/.035; return q
   new=brows(new); pr['attributes']['POSITION']=g.add(new)
  for target in pr.get('targets',[]):
   if 'POSITION' in target:
    shaped=relax(sculpt(old+g.get(target['POSITION'])))
    if male and j['materials'][pr['material']]['name']=='Brow': shaped=brows(shaped)
    target['POSITION']=g.add(shaped-new)
  pr['attributes']['NORMAL']=g.add(normals(new,tri))
 head['name']='Human_Male_Dedicated_Head' if male else 'Human_Female_Refined_Head'
 if male:
  irispr=next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Iris')
  pupil=copy.deepcopy(irispr); j['materials'].append({'name':'Pupil','pbrMetallicRoughness':{'baseColorFactor':[.015,.012,.018,1],'metallicFactor':0,'roughnessFactor':.65}}); pupil['material']=len(j['materials'])-1
  old=g.get(pupil['attributes']['POSITION']); center=np.array([np.abs(old[:,0]).mean(),old[:,1].mean(),0])
  def pupilshape(a):
   b=a.copy(); b[:,0]=np.sign(a[:,0])*center[0]+(a[:,0]-np.sign(a[:,0])*center[0])*.38; b[:,1]=center[1]+(a[:,1]-center[1])*.65; b[:,2]+=.0012; return b
  new=pupilshape(old); pupil['attributes']['POSITION']=g.add(new)
  for t in pupil.get('targets',[]):
   if 'POSITION' in t: t['POSITION']=g.add(pupilshape(old+g.get(t['POSITION']))-new)
  head['primitives'].append(pupil)
  im=j['materials'][irispr['material']]; im['pbrMetallicRoughness'].pop('baseColorTexture',None)
 iris=g.get(next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Iris')['attributes']['POSITION'])
 mouth=g.get(next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Mouth')['attributes']['POSITION'])
 ey=float(iris[:,1].mean()); my=float(mouth[:,1].mean()); ys=.08/(ey-my); xs=.05/float(np.abs(iris[:,0]).mean())
 skinpr=next(p for p in head['primitives'] if j['materials'][p['material']]['name']=='Head_Skin')
 p=g.get(skinpr['attributes']['POSITION']); tri=g.get(skinpr['indices']).reshape(-1,3); cent=canonical(p[tri].mean(1)); x,y,z=cent.T; ax=np.abs(x); front=z>-.065
 n=g.get(skinpr['attributes']['NORMAL']); base=p+n*.0018; base_index=g.add(base)
 # Surface patches inherit skinning and every morph target, so makeup/beards
 # follow face shape, blinks, smiles and speech rather than floating on a bone.
 def part(name,mask,color):
  idx=tri[mask]
  if not len(idx): raise ValueError('empty appearance part '+name)
  mat=len(j['materials']); j['materials'].append({'name':name.split('_')[0], 'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':.83},'doubleSided':True})
  pr=copy.deepcopy(skinpr); pr['material']=mat; pr['indices']=g.add(idx.astype('<u4').reshape(-1,1)); pr['attributes']['POSITION']=base_index
  if name.startswith('Blush_'):
   kind=name[6:]; points=[]; faces=[]
   for side in [-1,1]:
    start=len(points); points.append([side*.065,1.566])
    for ring in range(1,5):
     for k in range(64):
      t=2*np.pi*k/64; r=ring/4
      if kind=='heart': dx=np.sin(t)**3; dy=(13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t))/16
      elif kind=='star': radius=.72+.28*np.cos(5*t); dx=np.sin(t)*radius; dy=np.cos(t)*radius
      else: dx=np.sin(t); dy=np.cos(t)
      points.append([side*.065+dx*.021*r,1.566+dy*.015*r])
    for k in range(64): faces.append([start,start+1+k,start+1+(k+1)%64])
    for ring in range(3):
     a=start+1+ring*64; b=a+64
     for k in range(64):
      nk=(k+1)%64; faces.extend([[a+k,b+k,b+nk],[a+k,b+nk,a+nk]])
   if kind=='hash':
    points=[]; faces=[]
    for side in [-1,1]:
     start=len(points)
     for iy in range(21):
      for ix in range(21): points.append([side*.065+(ix/10-1)*.021,1.566+(iy/10-1)*.015])
     for iy in range(20):
      for ix in range(20):
       dx=(ix+.5)/10-1; dy=(iy+.5)/10-1
       if abs(abs(dx)-.4)<.14 or abs(abs(dy)-.4)<.14:
        a=start+iy*21+ix; faces.extend([[a,a+1,a+22],[a,a+22,a+21]])
    faces=[v[::-1] for v in faces]
   cp=canonical(p); vv=cp[tri]; a=vv[:,0,:2]; b=vv[:,1,:2]; c=vv[:,2,:2]; den=(b[:,1]-c[:,1])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,1]-c[:,1]); den=np.where(np.abs(den)<1e-12,1e-12,den)
   ids=[]; bary=[]
   for px,py in points:
    u=((b[:,1]-c[:,1])*(px-c[:,0])+(c[:,0]-b[:,0])*(py-c[:,1]))/den; v=((c[:,1]-a[:,1])*(px-c[:,0])+(a[:,0]-c[:,0])*(py-c[:,1]))/den; w=1-u-v
    valid=(u>=-1e-5)&(v>=-1e-5)&(w>=-1e-5); depth=vv[:,0,2]*u+vv[:,1,2]*v+vv[:,2,2]*w; ii=int(np.argmax(np.where(valid,depth,-1e9)))
    if not valid[ii]:
     distance=((vv[:,:,:2].mean(1)-[px,py])**2).sum(1); ii=int(np.argmin(np.where(vv[:,:,2].mean(1)>-.065,distance,1e9)))
     weights=np.maximum([u[ii],v[ii],w[ii]],0); weights/=weights.sum(); u[ii],v[ii],w[ii]=weights
    ids.append(tri[ii]); bary.append([u[ii],v[ii],w[ii]])
   ids=np.array(ids); bary=np.array(bary)
   def interpolate(index,key):
    arr=g.get(index); out=arr[ids[:,0]] if key.startswith('JOINTS') else (arr[ids]*bary[:,:,None]).sum(1)
    if key=='POSITION': out=out+(n[ids]*bary[:,:,None]).sum(1)*.002
    return g.add(out.astype(arr.dtype))
   pr['attributes']={k:interpolate(v,k) for k,v in skinpr['attributes'].items()}
   pr['targets']=[{k:g.add((g.get(v)[ids]*bary[:,:,None]).sum(1).astype('<f4')) for k,v in t.items()} for t in skinpr.get('targets',[])]
   pr['indices']=g.add(np.array(faces,dtype='<u4')[:,::-1].copy().reshape(-1,1))
  mesh={**{k:copy.deepcopy(v) for k,v in head.items() if k!='primitives'},'name':name,'primitives':[pr]}
  j['meshes'].append(mesh); nn=copy.deepcopy(node); nn['name']=name; nn['mesh']=len(j['meshes'])-1; nn.pop('children',None); j['nodes'].append(nn); ni=len(j['nodes'])-1
  parent=next((v for v in j['nodes'][:-1] if j['nodes'].index(node) in v.get('children',[])),None)
  if parent is not None: parent['children'].append(ni)
  else:
   for sc in j['scenes']:
    if j['nodes'].index(node) in sc['nodes']: sc['nodes'].append(ni)
 upper=(y>1.534)&(y<1.551)&(ax<.042); chin=(y<1.515)&(y>1.469)&(ax<.043); jaw=(y<1.557)&(y>1.463)&(ax>.037)&(ax<.108)
 masks={'stubble':(y<1.557)&(y>1.47)&~((ax<.028)&(y>1.514)&(y<1.535)), 'mustache':upper, 'handlebars':upper|((ax>.03)&(ax<.058)&(y>1.537)&(y<1.56)), 'goatee':chin|upper,'fullbeard':jaw|chin|upper,'chinstrap':jaw&(y<1.51),'anchor':chin|upper|(jaw&(y<1.49))}
 for name,mask in masks.items(): part('Beard_'+name,front&mask,[.18,.10,.055,1])
 for name in ['soft','heart','star','hash']:
  dx=(ax-.065)/.028; dy=(y-1.566)/.018
  if name=='heart': mask=(dx*dx+dy*dy-1)**3-dx*dx*dy**3<0
  elif name=='star':
   angle=np.arctan2(dy,dx); mask=np.sqrt(dx*dx+dy*dy)<(.67+.25*np.cos(5*angle))
  elif name=='hash': mask=(np.abs(dx)<1)&(np.abs(dy)<1)&((np.abs(np.abs(dx)-.4)<.18)|(np.abs(np.abs(dy)-.4)<.18))
  else: mask=dx*dx+dy*dy<1
  part('Blush_'+name,front&mask,[1,.36,.46,1])
 return g.bytes()

def rebuild_hair(ref):
 g=GLB(fetch(ref)); done=set()
 for mesh in g.j['meshes']:
  for pr in mesh['primitives']:
   a=pr['attributes']; i=a.get('POSITION')
   if i is None or i in done: continue
   done.add(i); p=g.get(i); q=p.copy(); crown=smooth(1.60,1.75,p[:,1]); q[:,0]*=1+.018*crown; q[:,2]+=(p[:,2]+.09)*.018*crown
   a['POSITION']=g.add(q)
   if 'indices' in pr and 'NORMAL' in a: a['NORMAL']=g.add(normals(q,g.get(pr['indices']).reshape(-1,3)))
 for mat in g.j.get('materials',[]):
  pm=mat.setdefault('pbrMetallicRoughness',{}); pm['metallicFactor']=0; pm['roughnessFactor']=.68
  mat['doubleSided']=True
 return g.bytes()

models=ROOT/'scripts/lib/data/critter-models.yml'; hairpath=ROOT/'scripts/lib/data/hair.yml'
md=yaml.safe_load(models.read_text()); hd=yaml.safe_load(hairpath.read_text()); jobs=[('body_'+s,ref,s) for s,ref in md['human'].items()]
refs=sorted(set(re.findall(r'/cdn/value\.[a-f0-9]+\.glb',hairpath.read_text())))
jobs += [('hair_'+str(i),r,None) for i,r in enumerate(refs)]
if args.bodies_only:
 original=json.loads((cache/'manifest.json').read_text()); jobs=[(n,r,n[-1]) for n,r,p in original if n.startswith('body_')]
def build(job):
 name,ref,sex=job; dst=cache/(name+'_revamp.glb')
 if not dst.exists(): dst.write_bytes(rebuild_body(ref,sex) if sex else rebuild_hair(ref))
 return name,ref,str(dst)
with cf.ThreadPoolExecutor(max_workers=5) as pool: results=list(pool.map(build,jobs))
if not args.bodies_only: (cache/'manifest.json').write_text(json.dumps(results,indent=2))
print('Built',len(results),'assets',flush=True)
if args.upload:
 token=pathlib.Path(os.environ.get('SPAWN_TOKEN_FILE',str(pathlib.Path.home()/'.spawn/token'))).read_text().strip()
 mapping={}
 def upload(row):
  name,ref,path=row; data=pathlib.Path(path).read_bytes(); asset='value.'+hashlib.sha256(data).hexdigest()+'.glb'; url=f'https://www.spawn.co/api/sdk/v1/{WID}/assets/'+asset
  if len(data)>4400000:
   req=urllib.request.Request(f'https://www.spawn.co/api/sdk/v1/{WID}/assets/upload-target',data=json.dumps({'name':asset,'sizeBytes':len(data)}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
   target=json.load(urllib.request.urlopen(req,timeout=90)); (cache/('upload-keys-'+name+'.json')).write_text(json.dumps(list(target.keys())))
   puturl=target.get('uploadUrl') or target.get('url'); urllib.request.urlopen(urllib.request.Request(puturl,data=data,method='PUT',headers={'Content-Type':'model/gltf-binary'}),timeout=120).read()
   data=json.dumps({'tempPath':target['tempPath']}).encode(); ctype='application/json'
  else: ctype='model/gltf-binary'
  req=urllib.request.Request(url,data=data,method='PUT',headers={'Authorization':'Bearer '+token,'Content-Type':ctype}); urllib.request.urlopen(req,timeout=120).read()
  return ref,'/cdn/'+asset
 with cf.ThreadPoolExecutor(max_workers=4) as pool:
  for old,new in pool.map(upload,results): mapping[old]=new
 for path in [models,hairpath]:
  text=path.read_text()
  if args.bodies_only and path==models:
   for name,old,pp in results:
    text=text.replace(md['human'][name[-1]],mapping[old])
  for old,new in mapping.items(): text=text.replace(old,new)
  path.write_text(text)
 (cache/'uploaded.json').write_text(json.dumps(mapping,indent=2)); print('Uploaded and wired',len(mapping),'assets')
