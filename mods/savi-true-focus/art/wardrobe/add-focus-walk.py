"""Compose Savi's native lower-body motion with her book-holding upper body.
No mesh, skin, material, facial morph or original animation is redesigned.
"""
import copy,json,struct
from pathlib import Path
ROOT=Path('/workspace/savi-focus')
def read(path):
 b=path.read_bytes();n,_=struct.unpack_from('<II',b,12);doc=json.loads(b[20:20+n]);off=20+n;size,_=struct.unpack_from('<II',b,off);return doc,bytearray(b[off+8:off+8+size])
def values(doc,binary,idx):
 a=doc['accessors'][idx];v=doc['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0)
 assert a['componentType']==5126 and a['type']=='SCALAR'
 return list(struct.unpack_from('<'+'f'*a['count'],binary,off))
def append_times(doc,binary,times):
 while len(binary)%4:binary.append(0)
 vi=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(times)*4})
 binary.extend(struct.pack('<'+'f'*len(times),*times));idx=len(doc['accessors']);doc['accessors'].append({'bufferView':vi,'componentType':5126,'count':len(times),'type':'SCALAR','min':[min(times)],'max':[max(times)]});return idx
doc,binary=read(ROOT/'savi-focus-avatar.glb');original,_=read(ROOT/'original.glb');before={k:copy.deepcopy(doc[k]) for k in ('nodes','meshes','skins','materials')}
assert len(doc['nodes'])==len(original['nodes'])
byname={n.get('name'):i for i,n in enumerate(doc['nodes'])};lower={byname['pelvis']}
def descend(i):
 lower.add(i)
 for c in doc['nodes'][i].get('children',[]):descend(c)
for name in ('thigh_l','thigh_r'):descend(byname[name])
readclip=next(a for a in doc['animations'] if a['name']=='FocusRead');report={}
for source,name in [('Walk','FocusWalk'),('Run','FocusJog')]:
 native=next(a for a in original['animations'] if a['name']==source);clip={'name':name,'samplers':[],'channels':[]}
 channels=[c for c in native['channels'] if c['target']['node'] in lower];duration=max(max(values(doc,binary,native['samplers'][c['sampler']]['input'])) for c in channels)
 for base,chs,retime in [(native,channels,False),(readclip,[c for c in readclip['channels'] if c['target']['node'] not in lower],True)]:
  for ch in chs:
   sampler=copy.deepcopy(base['samplers'][ch['sampler']])
   if retime:
    t=values(doc,binary,sampler['input']);sampler['input']=append_times(doc,binary,[v*duration/4 for v in t])
   n=copy.deepcopy(ch);n['sampler']=len(clip['samplers']);clip['samplers'].append(sampler);clip['channels'].append(n)
 assert len({(c['target']['node'],c['target']['path']) for c in clip['channels']})==len(clip['channels'])
 doc['animations'].append(clip);report[name]={'seconds':duration,'channels':len(clip['channels']),'nativeLowerBody':source,'upperBody':'FocusRead'}
existing={a['name'] for a in doc['animations']}
for clip in original['animations']:
 if clip['name'] not in existing:doc['animations'].append(copy.deepcopy(clip))
for k,v in before.items():assert doc[k]==v,k+' changed'
# The original avatar remains untouched for restoration. Its focus variant has no
# drawable native shirt/trousers/ties, so later material refreshes cannot unhide them.
removed_names={'Savi_TShirt_001','Savi_pants_001','Savi_Hair_Tie_Wrist','Savi_Hair_Tie_Gathered'}
removed=[]
for i,node in enumerate(doc['nodes']):
 if node.get('name') in removed_names and 'mesh' in node:
  removed.append(i)
  for key in ('mesh','skin','weights'):node.pop(key,None)
assert len(removed)==4
for clip in doc['animations']:
 clip['channels']=[c for c in clip['channels'] if not (c['target'].get('node') in removed and c['target']['path']=='weights')]
report['removedNativeGarments']=[doc['nodes'][i]['name'] for i in removed]
report['preservedFaceHairAndBody']=True
doc['buffers']=[{'byteLength':len(binary)}];j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
(ROOT/'savi-focus-moving.glb').write_bytes(out);report['allClips']=[a['name'] for a in doc['animations']];report['unchanged']=['meshes','skins','materials'];report['nodeChanges']='four obsolete garment mesh bindings removed';(ROOT/'movement-export-audit.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
