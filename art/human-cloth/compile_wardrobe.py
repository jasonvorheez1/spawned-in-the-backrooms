"""Merge Blender-built garments into the existing body without re-exporting its rig/head."""
import ast,copy,json,sys,pathlib,numpy as np,yaml
root=pathlib.Path(__file__).resolve().parents[2]; src=(root/'art/human-head/revamp.py').read_text(); tree=ast.parse(src)
nodes=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.ClassDef)) or isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ['DT','NC'] for t in n.targets)]
ns={};exec(compile(ast.Module(body=nodes,type_ignores=[]),'asset-reader','exec'),ns);GLB=ns['GLB']
body,wardrobe,dst=map(pathlib.Path,sys.argv[1:4]);g=GLB(body.read_bytes());w=GLB(wardrobe.read_bytes())
J=g.j;W=w.j
original_skin=J['skins'][0]; old_joint_names=[J['nodes'][i]['name'] for i in original_skin['joints']]
template=next(n for n in J['nodes'] if n.get('name')=='Top_jacket'); ti=J['nodes'].index(template)
parent=next(n for n in J['nodes'] if ti in n.get('children',[]))
material_index={m['name']:i for i,m in enumerate(J['materials'])}
created=[]
for node in W['nodes']:
 if not node.get('name','').startswith('Ward_') or 'mesh' not in node:continue
 if any(k in node for k in ['translation','rotation','scale','matrix']):raise ValueError('Unexpected garment bind-space transform: '+node['name'])
 skin=W['skins'][node['skin']];names=[W['nodes'][i]['name'] for i in skin['joints']];remap=np.array([old_joint_names.index(n) for n in names],dtype='<u2')
 m=copy.deepcopy(W['meshes'][node['mesh']]);m['name']=node['name']
 for p in m['primitives']:
  name=W['materials'][p['material']]['name'];name=name.split('.')[0]
  if name not in material_index:
   mat=copy.deepcopy(W['materials'][p['material']]);mat['name']=name
   mat.get('pbrMetallicRoughness',{}).pop('baseColorTexture',None);mat.pop('normalTexture',None);mat.pop('occlusionTexture',None)
   material_index[name]=len(J['materials']);J['materials'].append(mat)
  p['material']=material_index[name]
  for key,idx in list(p['attributes'].items()):
   data=w.get(idx)
   if key.startswith('JOINTS_'):data=remap[data]
   p['attributes'][key]=g.add(data)
  p['indices']=g.add(w.get(p['indices']))
  for target in p.get('targets',[]):
   for key,idx in list(target.items()):target[key]=g.add(w.get(idx))
 mi=len(J['meshes']);J['meshes'].append(m);new=copy.deepcopy(template);new['name']=node['name'];new['mesh']=mi;new.pop('children',None)
 ni=len(J['nodes']);J['nodes'].append(new);parent['children'].append(ni);created.append(node['name'])
expected=yaml.safe_load((root/'scripts/lib/data/wardrobe.yml').read_text())['parts'];assert set(created)==set(expected),(len(created),len(expected))
# Split the underlying skin into equipment masks, retaining the same indices,
# weights and morph targets. Hands/neck and uncovered limbs remain independent.
bn=next(n for n in J['nodes'] if n.get('name')=='Body'); bi=J['nodes'].index(bn);bp=next(n for n in J['nodes'] if bi in n.get('children',[]));bm=J['meshes'][bn['mesh']]
regions={}
for pr in bm['primitives']:
 positions=g.get(pr['attributes']['POSITION']);joints=g.get(pr['attributes']['JOINTS_0']);weights=g.get(pr['attributes']['WEIGHTS_0']);tri=g.get(pr['indices']).reshape(-1,3)
 dominant=joints[np.arange(len(joints)),weights.argmax(1)];scale=float(positions[:,1].max())/1.48
 for t in tri:
  names=[old_joint_names[int(dominant[v])] for v in t];name=max(set(names),key=names.count);y=float(positions[t,1].mean())
  if 'Hand' in name or any(k in name for k in ['Thumb','Index','Middle','Ring','Pinky']):region='hands'
  elif 'Foot' in name or 'Toe' in name:region='feet'
  elif 'ForeArm' in name:region='forearms'
  elif 'Arm' in name or 'Shoulder' in name:region='upperarms'
  elif 'UpLeg' in name:region='thigh_hi' if y>.60*scale else 'thigh_low'
  elif 'Leg' in name:region='shin_low' if y<.30*scale else 'shin_hi'
  elif name=='Hips':region='hips'
  elif 'Neck' in name or 'Head' in name:region='neck' if float(np.abs(positions[t,0]).max())<.085*scale else 'torso'
  else:
   front=float(positions[t,2].mean())>-.08*scale
   region='torso_upper_front' if front and y>float(positions[:,1].max())-.19*scale else 'torso_front' if abs(float(positions[t,0].mean()))<.035*scale and front else 'torso'
  regions.setdefault((region,id(pr)),(pr,[]))[1].append(t)
for (region,_),(pr,tris) in regions.items():
 p=copy.deepcopy(pr);p['indices']=g.add(np.asarray(tris,dtype='<u4').reshape(-1,1));m={k:copy.deepcopy(v) for k,v in bm.items() if k!='primitives'};m['name']='Skin_'+region;m['primitives']=[p]
 mi=len(J['meshes']);J['meshes'].append(m);n=copy.deepcopy(bn);n['name']='Skin_'+region;n['mesh']=mi;n.pop('children',None);ni=len(J['nodes']);J['nodes'].append(n);bp['children'].append(ni)
dst.write_bytes(g.bytes());dst.with_suffix('.parts.json').write_text(json.dumps(created,indent=2));print('Compiled',len(created),'garments into',dst,'with original body/rig/head retained')
