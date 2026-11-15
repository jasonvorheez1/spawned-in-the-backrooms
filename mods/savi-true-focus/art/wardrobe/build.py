"""Savi True Focus wardrobe. Original-source inspection and reproducible build.
Source avatar is never remodelled or re-rigged. Binaries live outside the mod.
"""
import bpy, json, math, os, struct, sys, subprocess, copy
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler
ROOT = Path('/workspace/savi-focus')
SOURCE = ROOT / 'original.glb'
SOURCE_URL = 'https://spawnfile.io/prod/character-assets/1789226154528-savi-reduced-fitted.glb'

def glb_read(path):
    data = Path(path).read_bytes()
    off = 12; doc = None; binary = b''
    while off < len(data):
        length, tag = struct.unpack_from('<II', data, off); off += 8
        chunk = data[off:off+length]; off += length
        if tag == 0x4E4F534A: doc = json.loads(chunk)
        elif tag == 0x004E4942: binary = chunk
    return doc, binary

def glb_write(path, doc, binary):
    js = json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf8')
    js += b' ' * ((-len(js)) % 4); binary += b'\0' * ((-len(binary)) % 4)
    Path(path).write_bytes(struct.pack('<III',0x46546C67,2,28+len(js)+len(binary)) + struct.pack('<II',len(js),0x4E4F534A) + js + struct.pack('<II',len(binary),0x004E4942) + binary)

def decode_for_blender():
    target = ROOT/'decoded.glb'
    if target.exists(): return target
    # Meshoptimizer 1.2.0 decodes vertices without changing them. Its decoder
    # is installed at tools/node_modules; KTX-Software 4.4.2 extracts textures.
    program = r"""
import fs from 'node:fs';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const p='/workspace/savi-focus/';
const b=fs.readFileSync(p+'original.glb');
const l=b.readUInt32LE(12), j=JSON.parse(b.subarray(20,20+l));
const bin=b.subarray(28+l,28+l+b.readUInt32LE(20+l));
let chunks=[bin], off=bin.length;
for (const v of j.bufferViews) {
 const e=v.extensions?.EXT_meshopt_compression;
 if (!e) continue;
 const pad=(4-off%4)%4; if(pad){chunks.push(Buffer.alloc(pad));off+=pad;}
 const a=new Uint8Array(e.count*e.byteStride);
 MeshoptDecoder.decodeGltfBuffer(a,e.count,e.byteStride,bin.subarray(e.byteOffset,e.byteOffset+e.byteLength),e.mode,e.filter);
 v.buffer=0;v.byteOffset=off;v.byteLength=a.length;
 delete v.extensions.EXT_meshopt_compression;if(!Object.keys(v.extensions).length)delete v.extensions;
 chunks.push(Buffer.from(a));off+=a.length;
}
j.buffers=[{byteLength:off}];
for(const k of ['extensionsUsed','extensionsRequired'])if(j[k])j[k]=j[k].filter(x=>x!=='EXT_meshopt_compression');
fs.writeFileSync(p+'decoded-stage.json',JSON.stringify(j));
fs.writeFileSync(p+'decoded-stage.bin',Buffer.concat(chunks));
"""
    tool=ROOT/'tools/decode.mjs'; tool.write_text(program)
    subprocess.run(['bun',str(tool)],check=True)
    doc=json.loads((ROOT/'decoded-stage.json').read_text()); binary=(ROOT/'decoded-stage.bin').read_bytes()
    for i,image in enumerate(doc.get('images',[])):
        if image.get('mimeType')!='image/ktx2': continue
        v=doc['bufferViews'][image['bufferView']]; ktx=ROOT/f'texture-{i}.ktx2'; png=ROOT/f'texture-{i}.png'
        ktx.write_bytes(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
        subprocess.run([str(ROOT/'tools/ktx/bin/ktx'),'extract','--transcode','rgba8',str(ktx),str(png)],check=True)
        binary+=b'\0'*((-len(binary))%4)
        a=png.read_bytes();image['bufferView']=len(doc['bufferViews']);image['mimeType']='image/png'
        doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(a)});binary+=a
    for texture in doc.get('textures',[]):
        ext=texture.get('extensions',{}).pop('KHR_texture_basisu',None)
        if ext:texture['source']=ext['source']
        if not texture.get('extensions'):texture.pop('extensions',None)
    for k in ('extensionsUsed','extensionsRequired'):
        if k in doc:doc[k]=[x for x in doc[k] if x!='KHR_texture_basisu']
    doc['buffers'][0]['byteLength']=len(binary)
    glb_write(target,doc,binary)
    return target

def vec(v): return [round(float(x), 7) for x in v]

def evaluated_bounds(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    eo = obj.evaluated_get(dg)
    vs = [eo.matrix_world @ v.co for v in eo.data.vertices]
    return {'min': [min(v[i] for v in vs) for i in range(3)],
            'max': [max(v[i] for v in vs) for i in range(3)]}

def import_original():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    doc,binary=glb_read(decode_for_blender())
    # Original toys have zero-scale visibility gates. Blender cannot import
    # zero-scale armatures. Workshop ONLY: isolate the avatar + original hair,
    # and author from rest; final augmented avatar keeps the full source file.
    doc['scenes']=[{'name':'WardrobeWorkbench','nodes':[97]}];doc['scene']=0
    for i,n in enumerate(doc['nodes']):
        if i>=235:doc['nodes'][i]={'name':n.get('name','Unused')}
        elif 'children' in n:n['children']=[c for c in n['children'] if c<235]
    doc['skins']=doc['skins'][:4];doc['animations']=[]
    glb_write(ROOT/'workbench.glb',doc,binary)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'workbench.glb'))
    return next(o for o in bpy.context.scene.objects if o.type=='ARMATURE' and 'hand_l' in o.data.bones)


def point_at(obj, p):
    obj.rotation_euler = (Vector(p)-obj.location).to_track_quat('-Z','Y').to_euler()

def studio(target=(0,0,0.95), camera=(3,-5,2.35), size=850):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('ProofWorld')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.19,.21,.25,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
    for name, loc, power, scale, color in [
        ('ProofKey',(-3,-4,4),500,4,(1,.94,.87)),
        ('ProofFill',(3,-2,2),320,3,(.82,.9,1)),
        ('ProofRim',(0,3,3),450,3,(1,1,1))]:
        d = bpy.data.lights.new(name, 'AREA'); d.energy = power; d.shape='DISK'; d.size=scale; d.color=color
        o = bpy.data.objects.new(name,d); scene.collection.objects.link(o); o.location=loc; point_at(o,target)
    d=bpy.data.cameras.new('ProofCamera'); o=bpy.data.objects.new('ProofCamera',d); scene.collection.objects.link(o)
    o.location=camera; point_at(o,target); d.type='ORTHO'; d.ortho_scale=2.3; scene.camera=o
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    return o

def inspect():
    rig=import_original()
    data,binchunk=glb_read(SOURCE)
    report={'source':SOURCE_URL,'armature':rig.name,'rigMatrix':[vec(r) for r in rig.matrix_world],
        'meshes':[], 'bones':[], 'actions':[], 'materials':[],
        'gltfNodes':[{'i':i,**{k:n[k] for k in ('name','mesh','skin','translation','rotation','scale') if k in n}} for i,n in enumerate(data.get('nodes',[]))],
        'gltfAnimations':[{'name':a.get('name'),'channels':len(a['channels'])} for a in data.get('animations',[])]}
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            o.data.calc_loop_triangles()
            report['meshes'].append({'name':o.name,'verts':len(o.data.vertices),'tris':len(o.data.loop_triangles),
                'bounds':evaluated_bounds(o),'matrix':[vec(r) for r in o.matrix_world],
                'materials':[s.material.name if s.material else None for s in o.material_slots],
                'groups':[g.name for g in o.vertex_groups],
                'shapeKeys':list(o.data.shape_keys.key_blocks.keys()) if o.data.shape_keys else []})
    for b in rig.data.bones:
        report['bones'].append({'name':b.name,'parent':b.parent.name if b.parent else None,
            'head':vec(rig.matrix_world @ b.head_local),'tail':vec(rig.matrix_world @ b.tail_local),
            'matrix':[vec(r) for r in b.matrix_local], 'pose':[vec(r) for r in rig.pose.bones[b.name].matrix]})
    for a in bpy.data.actions:
        report['actions'].append({'name':a.name,'range':vec(a.frame_range),'slots':[s.identifier for s in a.slots]})
    for m in bpy.data.materials:
        report['materials'].append({'name':m.name, 'diffuse':vec(m.diffuse_color),
            'images':[{'name':n.image.name,'size':list(n.image.size)} for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image] if m.node_tree else []})
    (ROOT/'inspection.json').write_text(json.dumps(report,indent=2))
    print('RIG',rig.name,'MATRIX',report['rigMatrix'])
    print('Mesh count',len(report['meshes']))
    print('Bone count',len(report['bones']))
    print('ACTIONS',json.dumps(report['actions']))
    print('Material count',len(report['materials']))
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source-inspected.blend'))
    cam=studio()
    bpy.context.scene.render.filepath=str(ROOT/'source-front.png'); bpy.ops.render.render(write_still=True)
    cam.location=(3,5,2.35); point_at(cam,(0,0,.95))
    bpy.context.scene.render.filepath=str(ROOT/'source-back.png'); bpy.ops.render.render(write_still=True)


# ---------- Tailoring and original hand-keyed animation ----------
from mathutils.bvhtree import BVHTree
from mathutils import geometry as mg
import numpy as np
FPS=30
DURATIONS={'FocusRead':4.0,'FocusPageTurn':2.4,'FocusThink':3.2,'PageTurn':2.4}
C=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1))) # Blender Z-up -> glTF Y-up
SUIT=[]; BOOK=[]; MATERIALS={}; RIG=None; DONOR=None; BOOK_ROOT=None; HINGE=None; PAGE=None
RAW=None; RAW_W=None; RAW_PARENT=None; RAW_NAME=None; REST_B=None; ATTACH=None; SOURCE_POSE={}


def srgb(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c)


def surface(name, color, rough=.6, metal=0, weave=False):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF');base=srgb(color)
    n.inputs['Base Color'].default_value=(*base,1)
    n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
    m.diffuse_color=(*base,1)
    if weave:
        size=256;yy,xx=np.mgrid[0:size,0:size]
        # Fine diagonal twill and deterministic thread grain, baked as pixels.
        thread=(np.sin((xx+yy)*math.pi/3)*.04 + np.sin(xx*math.pi)*.018)
        grain=np.random.default_rng(143).normal(0,.013,(size,size))
        rgb=np.clip(np.array(base)[None,None,:]*(1+thread[:,:,None]+grain[:,:,None]),0,1)
        a=np.ones((size,size,4),dtype=np.float32);a[:,:,:3]=rgb
        im=bpy.data.images.new(name+'_cloth',width=size,height=size,alpha=True)
        im.pixels.foreach_set(a.ravel());im.filepath_raw=str(ROOT/(name+'.png'));im.file_format='PNG';im.save();im.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT'
        m.node_tree.links.new(tex.outputs['Color'],n.inputs['Base Color'])
        m['texturePath']=im.filepath_raw
    MATERIALS[name]=m
    return m


def make_mesh(name, verts, faces, material, lane=None, smooth=True, weights=None):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(o)
    if material:o.data.materials.append(material)
    for p in mesh.polygons:p.use_smooth=smooth
    uv=mesh.uv_layers.new(name='TailoredUV')
    for f in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(f.normal[i]))
        axes=[i for i in range(3) if i!=axis]
        for li in f.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]*8,co[axes[1]]*8)
    if weights:apply_weights(o,weights)
    if lane is not None:lane.append(o)
    return o


def apply_weights(o, weights):
    for i,row in enumerate(weights):
        for name,w in row.items():
            g=o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
            g.add([i],float(w),'REPLACE')
    mod=o.modifiers.new('Savi_original_skin','ARMATURE');mod.object=RIG
    mod.use_deform_preserve_volume=False


class Donor:
    """Barycentric skin transfer from her real body and fitted clothing."""
    def __init__(self, objects):
        self.points=[];self.tris=[];self.weights=[]
        for o in objects:
            base=len(self.points);o.data.calc_loop_triangles()
            self.points += [o.matrix_world@v.co for v in o.data.vertices]
            for v in o.data.vertices:
                self.weights.append({o.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>1e-6})
            self.tris += [tuple(base+i for i in t.vertices) for t in o.data.loop_triangles]
        self.tree=BVHTree.FromPolygons(self.points,self.tris,all_triangles=True)
    def weight(self,p):
        hit,normal,ti,d=self.tree.find_nearest(Vector(p))
        ids=self.tris[ti];a,b,c=[self.points[i] for i in ids]
        uv=mg.barycentric_transform(hit,a,b,c,Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1)))
        row={}
        for i,w in zip(ids,uv):
            for k,v in self.weights[i].items():row[k]=row.get(k,0)+max(0,w)*v
        row=dict(sorted(row.items(),key=lambda kv:kv[1],reverse=True)[:4]);total=sum(row.values())
        return {k:v/total for k,v in row.items()} if total else {'pelvis':1}
    def fit(self,p,offset=.006):
        loc,n,idx,d=self.tree.find_nearest(Vector(p))
        return loc+n*offset


def cloth(name,verts,faces,mat,smooth=True):
    return make_mesh(name,verts,faces,mat,SUIT,smooth,[DONOR.weight(v) for v in verts])


def solid_patch(name,points,mat,thickness=.003,skin=True):
    # Notched outlines tessellated in X/Z, then fitted across her convex chest.
    # Subdivision prevents the ivory inset disappearing inside the shell.
    from mathutils.geometry import tessellate_polygon
    pts=[Vector((p[0],0,p[2])) for p in points]
    extra=sum(p[1]-front(p[0],p[2]) for p in points)/len(points)
    tris=tessellate_polygon([pts]);verts=[];faces=[];lookup={};N=5
    def vert(p):
        key=(round(p.x,7),round(p.z,7))
        if key not in lookup:
            lookup[key]=len(verts);verts.append((p.x,front(p.x,p.z,extra),p.z))
        return lookup[key]
    for a,b,c in tris:
        if not isinstance(a,Vector):a,b,c=pts[a],pts[b],pts[c]
        grid={}
        for i in range(N+1):
            for j in range(N+1-i):grid[i,j]=vert(a+(b-a)*(i/N)+(c-a)*(j/N))
        for i in range(N):
            for j in range(N-i):
                faces.append((grid[i,j],grid[i+1,j],grid[i,j+1]))
                if i+j<N-1:faces.append((grid[i+1,j],grid[i+1,j+1],grid[i,j+1]))
    for i,f in enumerate(faces):
        a,b,c=[Vector(verts[k]) for k in f]
        if (b-a).cross(c-a).y<0:faces[i]=tuple(reversed(f))
    edges={}
    for f in faces:
        for a,b in zip(f,f[1:]+f[:1]):
            k=tuple(sorted((a,b)));edges[k]=edges.get(k,0)+1
    n=len(verts);verts += [(x,y-thickness,z) for x,y,z in verts]
    faces += [tuple(k+n for k in reversed(f)) for f in faces.copy()]
    for (a,b),count in edges.items():
        if count==1:faces.append((a,b,b+n,a+n))
    return cloth(name,verts,faces,mat,True)


def derived_region(name, source, planes, offset, material):
    """Cut a cloth panel from the real skinned donor, interpolating its weights.
    The source is read only. Plane clipping makes clean wrist/ankle seams.
    """
    source.data.calc_loop_triangles();verts=[];faces=[];weights=[];lookup={}
    transform=source.matrix_world;normal_transform=transform.to_3x3().inverted().transposed()
    def mix(a,b,t):
        p=a[0].lerp(b[0],t);n=a[1].lerp(b[1],t).normalized();row={}
        for k,v in a[2].items():row[k]=row.get(k,0)+v*(1-t)
        for k,v in b[2].items():row[k]=row.get(k,0)+v*t
        return (p,n,row)
    for tri in source.data.loop_triangles:
        poly=[]
        for index in tri.vertices:
            v=source.data.vertices[index]
            poly.append((transform@v.co,(normal_transform@v.normal).normalized(),
                         {source.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>1e-6}))
        for axis,sign,value in planes:
            clipped=[]
            for a,b in zip(poly,poly[1:]+poly[:1]):
                da=sign*(a[0][axis]-value);db=sign*(b[0][axis]-value)
                if da>=0:clipped.append(a)
                if (da>=0)!=(db>=0):clipped.append(mix(a,b,da/(da-db)))
            poly=clipped
            if not poly:break
        if len(poly)<3:continue
        ids=[]
        for p,n,w in poly:
            p=p+n*offset;k=tuple(round(x,6) for x in p)
            if k not in lookup:
                lookup[k]=len(verts);verts.append(tuple(p));weights.append(w)
            ids.append(lookup[k])
        for i in range(1,len(ids)-1):faces.append((ids[0],ids[i],ids[i+1]))
    return make_mesh(name,verts,faces,material,SUIT,True,weights)


def tube(name,path,radius,mat,skin=True,sides=8):
    points=[Vector(p) for p in path];vs=[];fs=[]
    for i,p in enumerate(points):
        d=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        a=d.cross(Vector((0,0,1)))
        if a.length<.1:a=d.cross(Vector((1,0,0)))
        a.normalize();b=d.cross(a).normalized()
        for j in range(sides):
            v=p+radius*(math.cos(j*2*math.pi/sides)*a+math.sin(j*2*math.pi/sides)*b);vs.append(tuple(v))
    for i in range(len(points)-1):
        for j in range(sides):fs.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    fs += [tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+j for j in range(sides))]
    return cloth(name,vs,fs,mat) if skin else make_mesh(name,vs,fs,mat,BOOK)


def jewel(name,center,scale,mat,skin=True,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=center)
    o=bpy.context.object;o.name=name
    for v in o.data.vertices:v.co=Vector(center)+Vector((v.co.x*scale[0],v.co.y*scale[1],v.co.z*scale[2]))
    o.location=(0,0,0);o.data.materials.append(mat)
    if skin:apply_weights(o,[DONOR.weight(v.co) for v in o.data.vertices]);SUIT.append(o)
    else:BOOK.append(o)
    for p in o.data.polygons:p.use_smooth=True
    return o


PROFILE=[(.94,.153,.104,.010),(.98,.153,.112,.010),(1.03,.133,.104,.013),(1.09,.115,.090,.022),
         (1.15,.122,.095,.022),(1.21,.146,.112,.005),(1.27,.157,.119,.006),(1.32,.175,.116,.004),
         (1.36,.180,.101,-.008),(1.405,.183,.082,-.032)]


def torso_section(z):
    if z<=PROFILE[0][0]:return PROFILE[0][1:]
    if z>=PROFILE[-1][0]:return PROFILE[-1][1:]
    for a,b in zip(PROFILE,PROFILE[1:]):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);return tuple(a[k]*(1-t)+b[k]*t for k in range(1,4))


def front(x,z,extra=0):
    w,ry,cy=torso_section(z)
    # Convex chest front retained from the fitted tee, with space for facing.
    return cy+ry*math.sqrt(max(.04,1-(x/w)**2))+extra


def make_suit():
    wool=surface('Suit_ink_navy_wool','#202d40',.76,weave=True)
    satin=surface('Suit_lapel_satin','#2c3c50',.39,weave=True)
    ivory=surface('Suit_ivory_shirting','#f4edda',.73,weave=True)
    cyan=surface('Suit_cyan_silk','#00cfe9',.32)
    silver=surface('Suit_silver_hardware','#d9dce8',.28,.85)
    pink=surface('Suit_pink_pin','#ff2fa0',.34,.22)
    seam=surface('Suit_tailored_seams','#3b4b60',.75)
    # Fitted shaped torso, real cloth thickness at hem, shaped shoulders.
    N=48;verts=[];faces=[]
    for z,w,ry,cy in PROFILE:
        for i in range(N):
            a=2*math.pi*i/N
            verts.append((w*math.sin(a),cy+ry*math.cos(a),z))
    for r in range(len(PROFILE)-1):
        for i in range(N):faces.append((r*N+i,r*N+(i+1)%N,(r+1)*N+(i+1)%N,(r+1)*N+i))
    # Seat top into the neck instead of leaving a round tee collar.
    for i in range(N):
        a=2*math.pi*i/N;verts.append((.058*math.sin(a),-.020+.043*math.cos(a),1.438))
    for i in range(N):faces.append(((len(PROFILE)-1)*N+i,(len(PROFILE)-1)*N+(i+1)%N,len(PROFILE)*N+(i+1)%N,len(PROFILE)*N+i))
    jacket=cloth('Focus_Blazer_Shell',verts,faces,wool)
    # Source trousers provide the exact leg cut and original weights.
    source=bpy.data.objects['Savi_pants_001'];copyob=source.copy();copyob.data=source.data.copy();bpy.context.scene.collection.objects.link(copyob)
    copyob.name='Focus_Tailored_Trousers'
    for mod in list(copyob.modifiers):copyob.modifiers.remove(mod)
    for v in copyob.data.vertices:
        v.co=source.matrix_world@v.co + (source.matrix_world.to_3x3()@v.normal).normalized()*.005
    copyob.parent=None;copyob.matrix_parent_inverse=Matrix.Identity(4);copyob.matrix_world=Matrix.Identity(4);copyob.data.materials.clear();copyob.data.materials.append(wool)
    mod=copyob.modifiers.new('Savi_original_skin','ARMATURE');mod.object=RIG
    for poly in copyob.data.polygons:poly.use_smooth=True
    SUIT.append(copyob)
    # The original pants are shorts: matching full-length tailored legs are
    # taken from the real lower-body surface, not recoloured exposed skin.
    body=bpy.data.objects['Savi_Body.001']
    derived_region('Focus_Trouser_Legs',body,[(2,1,.165),(2,-1,.971)],.009,wool)
    # Long sleeves inherit every bend weight from Savi's actual arm surface.
    for side in (-1,1):
        planes=[(0,side,side*.139),(0,-side,side*.607),(2,1,1.20)]
        derived_region('Focus_Fitted_Sleeve_'+str(side),body,planes,.011,wool)
        n=24
        # Sleeve hem and an intentional ivory cuff at the actual wrist.
        for name,x0,x1,ry,rz,mat in [('Cuff',.600,.628,.029,.029,ivory),('SleeveBinding',.590,.609,.034,.035,wool)]:
            v=[];f=[]
            for x in (x0,x1):
                for k in range(n):
                    a=k*2*math.pi/n;v.append((side*x,-.044+ry*math.cos(a),1.374+rz*math.sin(a)))
            for k in range(n):f.append((k,(k+1)%n,n+(k+1)%n,n+k))
            cloth('Focus_'+name+'_'+str(side),v,f,mat)
        for j in range(3):jewel('Cuff_button',(side*(.564+j*.013),-.010,1.37),(.004,.0017,.004),silver)
    # Ivory V inset and point collar, sewn above the fitted body.
    p=[(-.057,1.43),(.057,1.43),(.071,1.376),(.022,1.185),(-.022,1.185),(-.071,1.376)]
    solid_patch('Focus_Shirt_Inset',[(x,front(x,z,.008),z) for x,z in p],ivory,.002)
    for s in (-1,1):
        points=[(.011,1.404),(.045,1.365),(.065,1.416),(.036,1.438)]
        solid_patch('Focus_Point_Collar',[(s*x,front(s*x,z,.017),z) for x,z in points],ivory,.002)
        # A concave polygon cuts a genuine notch between collar and peak.
        lapel=[(.017,1.181),(.042,1.288),(.059,1.379),(.043,1.432),(.087,1.408),
               (.116,1.383),(.091,1.365),(.132,1.350),(.086,1.257)]
        solid_patch('Focus_Notched_Lapel',[(s*x,front(s*x,z,.020),z) for x,z in lapel],satin,.0035)
        roll=[(.017,1.185),(.042,1.288),(.059,1.379)]
        tube('Lapel_roll',[(s*x,front(s*x,z,.022),z) for x,z in roll],.0012,seam)
        # Jetted pockets follow the cloth contour, not floating badges.
        pocket=[(.067,1.075),(.14,1.066),(.138,1.047),(.067,1.055)]
        solid_patch('Focus_Pocket_Flap',[(s*x,front(s*x,z,.004),z) for x,z in pocket],wool,.002)
        tube('Pocket_welt',[(s*x,front(s*x,z,.006),z) for x,z in pocket[:2]],.0015,seam)
        # Cuffs at the trouser/boot junction, following the donor exactly.
        pv=[];pf=[]
        for z in (.179,.202):
            for k in range(24):
                a=k*2*math.pi/24;p=Vector((s*.080+.054*math.sin(a),.02+.057*math.cos(a),z));p=DONOR.fit(p,.006)
                pv.append(tuple(p))
        for k in range(24):pf.append((k,(k+1)%24,24+(k+1)%24,24+k))
        cloth('Focus_Trouser_Cuff',pv,pf,wool)
    tie=[(-.008,1.394),(.008,1.394),(.009,1.229),(0,1.216),(-.009,1.229)]
    solid_patch('Focus_Cyan_Silk_Strip',[(x,front(x,z,.024),z) for x,z in tie],cyan,.002)
    knot=[(-.011,1.409),(.011,1.409),(.007,1.388),(-.007,1.388)]
    solid_patch('Focus_Tie_Knot',[(x,front(x,z,.027),z) for x,z in knot],cyan,.0025)
    for z in (1.141,1.090):jewel('Blazer_button',(.009,front(.009,z,.006),z),(.005,.002,.005),silver)
    # Small silver lozenge and inset pink enamel, never a luminous replacement.
    x=-.087;z=1.351;y=front(x,z,.026)
    jewel('Focus_Silver_Lapel_Pin',(x,y,z),(.009,.0028,.014),silver,sub=1)
    jewel('Focus_Pink_Pin_Inlay',(x,y+.0026,z),(.0038,.0012,.006),pink,sub=1)
    # Subtle hem stitching, small enough to read as tailoring rather than trim.
    path=[]
    for k in range(49):
        a=k*2*math.pi/48;path.append((.154*math.sin(a),.01+.105*math.cos(a),.947))
    tube('Focus_Hem_Stitch',path,.0007,seam)
    # All cloth lives under one mesh, with a single skin and semantic slots.
    bpy.ops.object.select_all(action='DESELECT')
    for o in SUIT:o.select_set(True)
    bpy.context.view_layer.objects.active=jacket;bpy.ops.object.join()
    SUIT.clear();SUIT.append(jacket);jacket.name='Focus_Tailored_Suit'
    for n in ('Savi_TShirt_001','Savi_pants_001'):bpy.data.objects[n].hide_render=True
    return jacket


def raw_worlds(doc):
    parents={c:i for i,n in enumerate(doc['nodes']) for c in n.get('children',[])};cache={}
    def get(i):
        if i in cache:return cache[i]
        n=doc['nodes'][i]
        if 'matrix' in n:m=Matrix([n['matrix'][k:k+4] for k in range(0,16,4)]).transposed()
        else:
            q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
        cache[i]=(get(parents[i])@m) if i in parents else m
        return cache[i]
    for i in range(len(doc['nodes'])):get(i)
    return cache,parents


def init_pose(rig):
    global RAW,RAW_W,RAW_PARENT,RAW_NAME,REST_B,SOURCE_POSE
    RAW,_=glb_read(SOURCE);RAW_W,RAW_PARENT=raw_worlds(RAW)
    RAW_NAME={n.get('name'):i for i,n in enumerate(RAW['nodes'])}
    # The original has object and bone both called SAVI; other target names unique.
    SOURCE_POSE={b.name:b.matrix_basis.copy() for b in rig.pose.bones}
    REST_B={b.name:rig.matrix_world@b.matrix for b in rig.pose.bones}



def raw_pose_matrix(name):
    i=RAW_NAME[name];delta=RIG.matrix_world@RIG.pose.bones[name].matrix@REST_B[name].inverted()
    return C@delta@C.inverted()@RAW_W[i]


def normalized(m):
    loc,rot,scale=m.decompose();return Matrix.LocRotScale(loc,rot,Vector((1,1,1)))


def bone_world(name):return RIG.matrix_world@RIG.pose.bones[name].matrix


def place_bone(name,world_rotation,head=None):
    pb=RIG.pose.bones[name];old=bone_world(name);_,_,sc=old.decompose()
    m=Matrix.LocRotScale(old.translation if head is None else Vector(head),world_rotation,sc)
    pb.matrix=RIG.matrix_world.inverted()@m
    bpy.context.view_layer.update()


def rotate_bone_world(name,axis,angle):
    if abs(angle)<1e-9:return
    old=bone_world(name);place_bone(name,Quaternion(Vector(axis),math.radians(angle))@old.to_quaternion())


def solve_arm(side, wrist, finger_direction, palm_normal):
    upper='upperarm_'+side;lower='lowerarm_'+side;hand='hand_'+side
    shoulder=bone_world(upper).translation
    U=REST_B[lower].translation-REST_B[upper].translation;L=REST_B[hand].translation-REST_B[lower].translation
    a,b=U.length,L.length;v=Vector(wrist)-shoulder;d=min(a+b-.003,max(.08,v.length));direction=v.normalized()
    # Pole chosen anatomically outside and a little behind the chest, keeping
    # the elbow beneath the hand instead of making a canned robot pose.
    s=-1 if side=='l' else 1
    pole=Vector((s*.34,-.012,1.055))-shoulder
    bend=(pole-direction*pole.dot(direction)).normalized()
    along=(a*a-b*b+d*d)/(2*d);height=math.sqrt(max(0,a*a-along*along))
    elbow=shoulder+direction*along+bend*height
    q=U.normalized().rotation_difference((elbow-shoulder).normalized())@REST_B[upper].to_quaternion()
    place_bone(upper,q,shoulder)
    # Moving the upper bone brought the lower head to the solved elbow.
    q=L.normalized().rotation_difference((Vector(wrist)-elbow).normalized())@REST_B[lower].to_quaternion()
    place_bone(lower,q,elbow)
    # Fit the real palm's axes: wrist -> middle root, thumb side, palm normal.
    origin=REST_B[hand].translation
    rd=(REST_B['middle_01_'+side].translation-origin).normalized()
    rt=REST_B['index_01_'+side].translation-REST_B['pinky_01_'+side].translation
    rt=(rt-rd*rt.dot(rd)).normalized();rn=rd.cross(rt).normalized()
    # For the right hand the thumb/finger ordering reverses the handed normal.
    if side=='r':rn=-rn;rt=-rt
    dn=Vector(palm_normal).normalized();dd=Vector(finger_direction);dd=(dd-dn*dd.dot(dn)).normalized();dt=dn.cross(dd).normalized()
    rb=Matrix((rd,rt,rn)).transposed();db=Matrix((dd,dt,dn)).transposed()
    q=(db@rb.inverted()@REST_B[hand].to_3x3().normalized()).to_quaternion()
    place_bone(hand,q,Vector(wrist))


def curl_fingers(side,angle=5,thinking=False):
    # Hand-local curl around each finger's transverse axis, derived from its
    # actual rest orientation; no extra rig, no constraints shipped.
    hand='hand_'+side
    rd=(REST_B['middle_01_'+side].translation-REST_B[hand].translation).normalized()
    rt=(REST_B['index_01_'+side].translation-REST_B['pinky_01_'+side].translation).normalized()
    delta=bone_world(hand).to_quaternion()@REST_B[hand].to_quaternion().inverted()
    axis=delta@rt
    for f in ('index','middle','ring','pinky'):
        amount=angle if not thinking or f=='index' else 23
        for j,m in ((1,.6),(2,1),(3,.6)):
            rotate_bone_world(f'{f}_{j:02d}_{side}',axis,-amount*m if side=='l' else amount*m)


def smoothtrack(keys,t):
    if t<=keys[0][0]:return keys[0][1]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:
            u=(t-a)/(b-a);u=u*u*(3-2*u)
            if isinstance(x,(tuple,list,Vector)):return Vector(x).lerp(Vector(y),u)
            return x+(y-x)*u
    return keys[-1][1]


def page_angle(t):return smoothtrack([(0,0),(.32,0),(.72,48),(1.12,104),(1.65,174),(1.90,180),(2.16,180),(2.31,0),(2.4,0)],t)


def apply_pose(kind='FocusRead',t=0,book=True):
    for pb in RIG.pose.bones:pb.matrix_basis=SOURCE_POSE[pb.name].copy()
    bpy.context.view_layer.update()
    period=DURATIONS[kind];breath=math.sin(2*math.pi*t/period)
    think=smoothtrack([(0,0),(.55,0),(1.05,1),(1.90,1),(2.75,0),(3.2,0)],t) if kind=='FocusThink' else 0
    rotate_bone_world('spine_03',(1,0,0),-1.0+.30*breath)
    rotate_bone_world('neck_01',(1,0,0),-3+think*2)
    rotate_bone_world('head',(1,0,0),-10+think*7+.35*breath)
    rotate_bone_world('head',(0,0,1),think*-4)
    for eye in ('CC_Base_L_Eye','CC_Base_R_Eye'):rotate_bone_world(eye,(1,0,0),-15+think*11)
    normal=Vector((0,-math.sin(math.radians(15)),math.cos(math.radians(15))))
    solve_arm('l',(-.174,.248,1.157),(.985,.14,.04),normal)
    curl_fingers('l',4)
    if ATTACH is not None:
        bm=C.inverted()@normalized(raw_pose_matrix('hand_l'))@ATTACH@C
    else:
        bm=Matrix.Translation((-.025,.275,1.178))@Matrix.Rotation(math.radians(15),4,'X')
    # Author fingers on the page's actual travelling fore-edge.
    a=page_angle(t) if kind=='FocusPageTurn' else 0
    rot=Matrix.Rotation(math.radians(-a),3,'Y')
    tip=Vector((.124,.042,.08*.124*math.cos(math.radians(a))))
    point=rot@tip+Vector((0,0,.022))
    d=rot@Vector((-.20,.98,0)).normalized();n=rot@Vector((0,0,1))
    wrist=point-d*.165+n*.012
    if kind=='FocusPageTurn' and t>1.85:
        q=smoothtrack([(1.85,0),(2.30,1),(2.4,1)],t)
        base=Vector((.124,.042,.032))-Vector((-.20,.98,0)).normalized()*.165+Vector((0,0,.012))
        wrist=wrist.lerp(base,q);d=d.lerp(Vector((-.20,.98,0)).normalized(),q).normalized();n=n.lerp(Vector((0,0,1)),q).normalized()
    wrist=bm@wrist;dd=bm.to_3x3()@d;nn=-(bm.to_3x3()@n)
    if think:
        wrist=wrist.lerp(Vector((.117,.177,1.348)),think)
        dd=dd.lerp(Vector((-.35,-.26,.9)).normalized(),think).normalized()
        nn=nn.lerp(Vector((-.82,.55,-.15)).normalized(),think).normalized()
    solve_arm('r',wrist,dd,nn);curl_fingers('r',2,thinking=think>.6)
    if BOOK_ROOT is not None and book:
        BOOK_ROOT.matrix_world=bm
        set_page(t if kind=='FocusPageTurn' else 0)
    bpy.context.view_layer.update()
    return bm


def measure_attachment():
    global ATTACH
    apply_pose('FocusRead',0,False)
    body=bpy.data.objects['Savi_Body.001'];dg=bpy.context.evaluated_depsgraph_get();eo=body.evaluated_get(dg)
    hand=REST_B['hand_l'].translation;d=(REST_B['middle_01_l'].translation-hand).normalized()
    n=Vector((0,-math.sin(math.radians(15)),math.cos(math.radians(15))))
    candidates=[]
    for v in body.data.vertices:
        p=body.matrix_world@v.co;along=(p-hand).dot(d)
        if .043<along<.074 and -.082<p.y<-.015:
            candidates.append(eo.matrix_world@eo.data.vertices[v.index].co)
    contact=max(candidates,key=lambda p:p.dot(n))
    R=Matrix.Rotation(math.radians(15),4,'X')
    # The top of her palm sits 0.7 mm under the left cover, at x=-0.093 m.
    local=Vector((-.093,0,.08*.093));position=contact+n*.0007-R.to_3x3()@local
    bm=Matrix.Translation(position)@R
    ATTACH=normalized(raw_pose_matrix('hand_l')).inverted()@C@bm@C.inverted()
    (ROOT/'attachment-measurement.json').write_text(json.dumps({'palmContactBlender':vec(contact),'bookRootBlender':vec(position),'gapMeters':.0007,'rawBoneScale':vec(raw_pose_matrix('hand_l').decompose()[2]),'attachmentMatrix':[vec(r) for r in ATTACH]},indent=2))
    return bm


def book_box(name,verts,mat):
    # Eight corners: bottom around +Z then corresponding top.
    fs=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return make_mesh(name,verts,fs,mat,BOOK,False)


def make_book():
    global BOOK_ROOT,HINGE,PAGE
    cover=surface('Book_ink_violet_cloth','#27233f',.64,weave=True)
    paper=surface('Book_warm_cream_paper','#f3e7c6',.88,weave=True)
    edge=surface('Book_page_edges','#b6a887',.8)
    gold=surface('Book_gold_corners','#d4b765',.27,.8)
    ribbon=surface('Book_pink_ribbon','#ff2fa0',.53)
    ink=surface('Book_abstract_ink','#596779',.78)
    BOOK_ROOT=bpy.data.objects.new('Focus_Open_Book',None);bpy.context.scene.collection.objects.link(BOOK_ROOT)
    # Total cover span .300 m; top to bottom .210 m; max thickness .035 m.
    for s in (-1,1):
        xs=(.004,.150) if s==1 else (-.150,-.004)
        verts=[]
        for height in (0,.003):
            for x,y in [(xs[0],-.105),(xs[1],-.105),(xs[1],.105),(xs[0],.105)]:verts.append((x,y,.08*abs(x)+height))
        book_box('Book_Hard_Cover',verts,cover)
        xs=(.005,.144) if s==1 else (-.144,-.005)
        verts=[]
        for height in (.0035,.0225):
            for x,y in [(xs[0],-.100),(xs[1],-.100),(xs[1],.100),(xs[0],.100)]:verts.append((x,y,.08*abs(x)+height))
        book_box('Book_Cream_Page_Block',verts,paper)
        # Actual thin parallel lines all around the exposed block edge.
        for i in range(1,10):
            z=.0035+i*.0018
            path=[(xs[0],-.1003,z+.08*abs(xs[0])),(xs[1],-.1003,z+.08*abs(xs[1])),(xs[1],.1003,z+.08*abs(xs[1])),(xs[0],.1003,z+.08*abs(xs[0]))]
            tube('Book_Page_Edge_Lines',path,.00022,edge,False,4)
        # Gold corner brackets seated on the covers.
        for ysign in (-1,1):
            y=ysign*.103;x=s*.148
            path=[(x-s*.018,y,.0038+.08*abs(x-s*.018)),(x,y,.0038+.08*abs(x)),(x,y-ysign*.018,.0038+.08*abs(x))]
            tube('Book_Gold_Corner',path,.0014,gold,False,6)
        # Quiet abstract print, no names, words or private-thought content.
        for line in range(13):
            y=-.073+line*.0114;x0=s*.025;x1=s*(.125 if line%4 else .105)
            path=[(x0,y,.0231+.08*abs(x0)),(x1,y,.0231+.08*abs(x1))]
            tube('Book_Abstract_Rule',path,.00035,ink,False,4)
        # A small boxed diagram at each page's upper margin.
        path=[(s*.035,.076,.0233+.08*.035),(s*.071,.076,.0233+.08*.071),(s*.071,.092,.0233+.08*.071),(s*.035,.092,.0233+.08*.035),(s*.035,.076,.0233+.08*.035)]
        tube('Book_Abstract_Diagram',path,.00042,gold,False,4)
    tube('Book_Cloth_Spine',[(0,-.105,.002),(0,.105,.002)],.004,cover,False,10)
    # Ribbon comes out at the gutter, curls over the lower edge and hangs.
    path=[(0,.080,.025),(0,0,.024),(-.001,-.096,.024),(-.004,-.111,.018),(-.013,-.129,-.015),(-.016,-.135,-.030)]
    vs=[]
    for x,y,z in path:vs.extend([(x-.004,y,z),(x+.004,y,z)])
    make_mesh('Book_Ribbon_Bookmark',vs,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)],ribbon,BOOK,False)
    # Turning leaf: a real spine hinge plus two authored camber keys.
    HINGE=bpy.data.objects.new('Book_Page_Hinge',None);bpy.context.scene.collection.objects.link(HINGE);HINGE.location=(0,0,.024)
    v=[];f=[];N=16
    for y in (-.099,.099):
        for i in range(N+1):
            x=.004+(.14/N)*i;v.append((x,y,.08*x))
    for i in range(N):f.append((i,i+1,N+2+i,N+1+i))
    PAGE=make_mesh('Book_Turning_Page',v,f,paper,BOOK,False)
    PAGE.data.materials.append(ink)
    # Print on the thin page as small strips in the SAME deforming mesh.
    extra=[];efs=[]
    for line in range(12):
        y=-.073+line*.012
        for j in range(8):
            x0=.024+j*.012;x1=x0+.012;start=len(v)+len(extra)
            extra += [(x0,y-.00045,.08*x0+.00035),(x1,y-.00045,.08*x1+.00035),(x1,y+.00045,.08*x1+.00035),(x0,y+.00045,.08*x0+.00035)]
            efs.append((start,start+1,start+2,start+3))
    PAGE.data.clear_geometry();PAGE.data.from_pydata(v+extra,[],f+efs);PAGE.data.update()
    for p in PAGE.data.polygons:p.material_index=0 if p.index<len(f) else 1
    PAGE.shape_key_add(name='Basis')
    reverse=PAGE.shape_key_add(name='ReverseCamber');curl=PAGE.shape_key_add(name='CrossoverCurl')
    for i,p in enumerate(v+extra):
        reverse.data[i].co.z-=.16*p[0]
        curl.data[i].co.z+=.020*math.sin(math.pi*max(0,min(1,p[0]/.144)))
    for o in BOOK:
        o.parent=BOOK_ROOT
    HINGE.parent=BOOK_ROOT;PAGE.parent=HINGE
    BOOK.append(HINGE);BOOK.append(BOOK_ROOT)
    return BOOK_ROOT


def set_page(t):
    a=page_angle(t)
    HINGE.rotation_mode='XYZ';HINGE.rotation_euler=(0,math.radians(-a),0)
    HINGE.scale=(1,1,1) if t<2.10 or t>=2.34 else (.00001,.00001,.00001)
    PAGE.data.shape_keys.key_blocks['ReverseCamber'].value=(1-math.cos(math.radians(a)))/2
    PAGE.data.shape_keys.key_blocks['CrossoverCurl'].value=max(0,math.sin(math.radians(a)))


def proof_render():
    cam=studio(target=(-.015,.04,.96),camera=(2.5,6.2,2.35),size=1000)
    cam.data.ortho_scale=2.21
    scene=bpy.context.scene
    # Neutral floor exists ONLY on the workshop proof, never in the world.
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.0005));floor=bpy.context.object;floor.name='ProofFloor'
    floor.data.materials.append(surface('Proof_matte_backdrop','#9599a2',.85))
    # Source imported bone-parented ties have a Blender cm-parent quirk; the
    # body/hair are untouched. These near-zero or remote accessories are not
    # part of the requested wardrobe and remain untouched in the shipped copy.
    for n in ('Savi_Hair_Tie_Wrist','Savi_Hair_Tie_Gathered'):
        o=bpy.data.objects.get(n)
        if o:o.hide_render=True
    for name,t in [('FocusRead',0),('FocusPageTurn',1.02),('FocusThink',1.50)]:
        apply_pose(name,t)
        scene.render.filepath=str(ROOT/(name+'.png'));bpy.ops.render.render(write_still=True)
    # Close proof resolves the notched lapels, ink/cyan tailoring, and contact.
    cam.data.ortho_scale=1.14;cam.location=(2.2,5.0,2.20);point_at(cam,(0,.12,1.32))
    apply_pose('FocusRead',0)
    scene.render.filepath=str(ROOT/'FocusRead-detail.png');bpy.ops.render.render(write_still=True)


def construct():
    global RIG,DONOR,ATTACH
    SUIT.clear();BOOK.clear();MATERIALS.clear();ATTACH=None
    RIG=import_original()
    # Work in her real .01 rig frame; never apply/rescale the source armature.
    DONOR=Donor([bpy.data.objects[n] for n in ('Savi_Body.001','Savi_TShirt_001','Savi_pants_001')])
    init_pose(RIG)
    suit=make_suit();bm=measure_attachment();make_book();apply_pose()
    print("FITTED SUIT BOUNDS",json.dumps(evaluated_bounds(suit)))
    # Record true drawn height and all measured integration inputs.
    rest_mats={b.name:b.matrix_basis.copy() for b in RIG.pose.bones}
    for pb in RIG.pose.bones:pb.matrix_basis=SOURCE_POSE[pb.name].copy()
    bpy.context.view_layer.update()
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name.startswith(('Savi_Body','Savi_Locked_Hair','Savi_Braid','Savi_shoes'))) and o.hide_render==False]
    bounds=[evaluated_bounds(o) for o in meshes]
    avatar_height=max(x['max'][2] for x in bounds)-min(x['min'][2] for x in bounds)
    for n,m in rest_mats.items():RIG.pose.bones[n].matrix_basis=m
    bpy.context.view_layer.update()
    suit.data.calc_loop_triangles()
    pos,rot,scale=ATTACH.decompose();e=rot.to_euler('YXZ')
    measured={'avatarHeight':avatar_height,'suitTriangles':len(suit.data.loop_triangles),'bookWidth':.300,
        'avatarForward':'-z','handBone':'hand_l','hideParts':['Savi_TShirt_001','Savi_pants_001'],
        'bookAttachment':{'position':dict(zip(('x','y','z'),vec(pos))),
                          'rotation':dict(zip(('x','y','z','w'),(rot.x,rot.y,rot.z,rot.w))),'scale':1},
        'sourceAnimations':[a.get('name') for a in RAW.get('animations',[])],
        'durations':DURATIONS,'suitMaterials':[m.name for m in suit.data.materials]}
    (ROOT/'measurements.json').write_text(json.dumps(measured,indent=2))
    print('MEASUREMENTS',json.dumps(measured))
    return measured



# ---------- Export: no avatar round trip, no lost old clips or textures ----------
class Gltf:
    def __init__(self,doc=None,binary=b''):
        self.doc=copy.deepcopy(doc) if doc else {'asset':{'version':'2.0','generator':'Savi True Focus / Blender 5.1 source build'},'scene':0,'scenes':[{'nodes':[]}], 'nodes':[],'meshes':[],'materials':[],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]}
        self.data=bytearray(binary);self.material_ids={};self.images={}
    def view(self,data,target=None):
        self.data.extend(b'\0'*((-len(self.data))%4));start=len(self.data);self.data.extend(data)
        v={'buffer':0,'byteOffset':start,'byteLength':len(data)}
        if target:v['target']=target
        i=len(self.doc['bufferViews']);self.doc['bufferViews'].append(v);return i
    def access(self,rows,kind='VEC3',ctype=5126,bounds=False,target=None):
        n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[kind]
        a=np.asarray(rows,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[ctype]).reshape((-1,n))
        v=self.view(a.tobytes(),target)
        acc={'bufferView':v,'componentType':ctype,'count':len(a),'type':kind}
        if bounds:acc['min']=a.min(axis=0).tolist();acc['max']=a.max(axis=0).tolist()
        i=len(self.doc['accessors']);self.doc['accessors'].append(acc);return i
    def mat(self,m):
        if m.name in self.material_ids:return self.material_ids[m.name]
        n=m.node_tree.nodes.get('Principled BSDF');color=list(n.inputs['Base Color'].default_value)
        pbr={'baseColorFactor':color,'roughnessFactor':float(n.inputs['Roughness'].default_value),'metallicFactor':float(n.inputs['Metallic'].default_value)}
        if 'texturePath' in m:
            path=m['texturePath'];image=len(self.doc.setdefault('images',[]))
            self.doc['images'].append({'name':m.name+'_fabric','mimeType':'image/png','bufferView':self.view(Path(path).read_bytes())})
            tex=len(self.doc.setdefault('textures',[]));self.doc['textures'].append({'source':image,'sampler':0})
            self.doc['samplers']=[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}]
            pbr['baseColorTexture']={'index':tex};pbr['baseColorFactor']=[1,1,1,1]
        index=len(self.doc['materials']);self.doc['materials'].append({'name':m.name,'pbrMetallicRoughness':pbr,'doubleSided':True})
        self.material_ids[m.name]=index;return index
    def mesh(self,obj,transform=None,skin_map=None,morphs=False):
        mesh=obj.data;mesh.calc_loop_triangles()
        transform=transform or Matrix.Identity(4)
        normal_matrix=transform.to_3x3().inverted().transposed()
        primitives=[]
        for material_index,material in enumerate(mesh.materials):
            pos=[];norm=[];uv=[];joint=[];weight=[];targets=[[],[]]
            for tri in mesh.loop_triangles:
                if tri.material_index!=material_index:continue
                for vi,li in zip(tri.vertices,tri.loops):
                    v=mesh.vertices[vi];pos.append(tuple(transform@v.co))
                    no=v.normal if mesh.polygons[tri.polygon_index].use_smooth else tri.normal
                    norm.append(tuple((normal_matrix@no).normalized()))
                    uv.append(tuple(mesh.uv_layers.active.data[li].uv) if mesh.uv_layers.active and len(mesh.uv_layers.active.data)>li else (float(v.co.x)*8,float(v.co.y)*8))
                    if skin_map is not None:
                        rows=sorted([(skin_map[obj.vertex_groups[g.group].name],g.weight) for g in v.groups if g.weight>1e-8 and obj.vertex_groups[g.group].name in skin_map],key=lambda r:r[1],reverse=True)[:4]
                        total=sum(w for _,w in rows)
                        if not total:raise ValueError('Unweighted suit vertex '+str(vi))
                        rows=[(j,w/total) for j,w in rows]+[(0,0)]*(4-len(rows))
                        joint.append([j for j,w in rows]);weight.append([w for j,w in rows])
                    if morphs:
                        for i,key in enumerate(mesh.shape_keys.key_blocks[1:]):targets[i].append(tuple(transform.to_3x3()@(key.data[vi].co-v.co)))
            if not pos:continue
            attr={'POSITION':self.access(pos,'VEC3',bounds=True,target=34962),'NORMAL':self.access(norm,'VEC3',target=34962),'TEXCOORD_0':self.access(uv,'VEC2',target=34962)}
            if skin_map is not None:
                attr['JOINTS_0']=self.access(joint,'VEC4',5123,target=34962);attr['WEIGHTS_0']=self.access(weight,'VEC4',target=34962)
            p={'attributes':attr,'material':self.mat(material),'mode':4}
            if morphs:p['targets']=[{'POSITION':self.access(t,'VEC3',target=34962)} for t in targets]
            primitives.append(p)
        data={'name':obj.name,'primitives':primitives}
        if morphs:data['weights']=[0,0];data['extras']={'targetNames':['ReverseCamber','CrossoverCurl']}
        i=len(self.doc['meshes']);self.doc['meshes'].append(data);return i
    def channel(self,anim,node,path,input_index,values,kind,interpolation='LINEAR'):
        out=self.access(values,kind);si=len(anim['samplers'])
        anim['samplers'].append({'input':input_index,'output':out,'interpolation':interpolation})
        anim['channels'].append({'sampler':si,'target':{'node':node,'path':path}})
    def save(self,path):
        self.doc['buffers'][0]['byteLength']=len(self.data);glb_write(path,self.doc,bytes(self.data))


def augment_avatar():
    source,binary=glb_read(SOURCE);g=Gltf(source,binary)
    # Map original node indices explicitly. SAVI is both the object and root
    # bone; untouched duplicate roots are excluded from pose authoring.
    nodes={i:n['name'] for i,n in enumerate(source['nodes']) if n.get('name') in RIG.data.bones and n.get('name')!='SAVI' and i<235}
    g.doc['animations']=[] # Native Savi posing pauses during focus; source stays untouched.
    foot_reference={n:REST_B[n].translation.copy() for n in ('foot_l','foot_r')}
    foot_error=0;clip_reports={}
    for kind in ('FocusRead','FocusPageTurn','FocusThink'):
        duration=DURATIONS[kind];times=[i/FPS for i in range(round(duration*FPS)+1)]
        rotations={i:[] for i in nodes};translations={i:[] for i in nodes};scales={i:[] for i in nodes}
        for t in times:
            apply_pose(kind,t,False)
            pose={i:raw_pose_matrix(name) for i,name in nodes.items()}
            for i,name in nodes.items():
                parent=RAW_PARENT.get(i);parent_world=pose.get(parent,RAW_W.get(parent,Matrix.Identity(4)))
                local=parent_world.inverted_safe()@pose[i];v,q,s=local.decompose()
                # Antipodal quaternion signs must be continuous across keys.
                qv=[q.x,q.y,q.z,q.w]
                if rotations[i] and sum(a*b for a,b in zip(qv,rotations[i][-1]))<0:qv=[-v for v in qv]
                rotations[i].append(qv);translations[i].append(tuple(v));scales[i].append(tuple(s))
            for n,p in foot_reference.items():foot_error=max(foot_error,(bone_world(n).translation-p).length)
        anim={'name':kind,'samplers':[],'channels':[]};input_index=g.access(times,'SCALAR',bounds=True)
        for i in nodes:
            g.channel(anim,i,'rotation',input_index,rotations[i],'VEC4')
            # Planted root / feet, source rest translations, measured arm bends.
            g.channel(anim,i,'translation',input_index,translations[i],'VEC3')
            # Source gate scales are retained as authored; no new skeleton scale.
        g.doc['animations'].append(anim)
        clip_reports[kind]={'duration':duration,'channels':len(anim['channels']),'samples':len(times)}
    path=ROOT/'savi-focus-avatar.glb';g.save(path)
    exported,exported_binary=glb_read(path)
    assert exported_binary[:len(binary)]==binary
    for key in ('nodes','meshes','materials','skins','images','textures','scenes'):
        assert exported.get(key)==source.get(key),'Changed original '+key
    assert {a['name'] for a in exported['animations']}=={'FocusRead','FocusPageTurn','FocusThink'}
    assert foot_error<.00001,foot_error
    return {'originalAnimationsInUntouchedRestorationSource':len(source['animations']),'originalBinaryBytesPreserved':len(binary),'newClips':clip_reports,'maximumPlantedFootDriftMeters':foot_error}


def export_suit():
    g=Gltf();src=RAW
    used={o.vertex_groups[v.group].name for o in SUIT for vertex in o.data.vertices for v in vertex.groups if v.weight>1e-8}
    # Preserve raw glTF frames, not Blender's automatic display-bone re-roll.
    joint_ids=[i for i in src['skins'][0]['joints'] if src['nodes'][i].get('name') in used]
    assert used.issubset({src['nodes'][i].get('name') for i in joint_ids}),used-set(src['nodes'][i].get('name') for i in joint_ids)
    # The skin names needed by this garment; ancestors carry the original rest
    # matrices, so skin:true maps into precisely the existing helper skeleton.
    keep=set(joint_ids)
    for i in list(keep):
        while i in RAW_PARENT:i=RAW_PARENT[i];keep.add(i)
    order=sorted(keep);mapped={old:new for new,old in enumerate(order)}
    for i in order:
        n=src['nodes'][i]
        out={k:copy.deepcopy(v) for k,v in n.items() if k in ('name','matrix','translation','rotation','scale')}
        kids=[mapped[c] for c in n.get('children',[]) if c in keep]
        if kids:out['children']=kids
        g.doc['nodes'].append(out)
        if RAW_PARENT.get(i) not in keep:g.doc['scenes'][0]['nodes'].append(mapped[i])
    skin_map={src['nodes'][i]['name']:j for j,i in enumerate(joint_ids)}
    matrices=[[float(x) for col in RAW_W[i].inverted().transposed() for x in col] for i in joint_ids]
    # MAT4 accessor is column-major; transpose iteration writes its columns.
    accessor=g.access(matrices,'MAT4')
    g.doc['skins']=[{'name':'Savi_Focus_Garment_Skin','joints':[mapped[i] for i in joint_ids],'inverseBindMatrices':accessor}]
    suit=SUIT[0]
    mesh=g.mesh(suit,C@suit.matrix_world,skin_map=skin_map)
    node=len(g.doc['nodes']);g.doc['nodes'].append({'name':'Focus_Tailored_Suit','mesh':mesh,'skin':0});g.doc['scenes'][0]['nodes'].append(node)
    g.save(ROOT/'savi-focus-suit.glb')
    return {'skinJoints':list(skin_map),'triangles':sum(g.doc['accessors'][p['attributes']['POSITION']]['count']//3 for p in g.doc['meshes'][mesh]['primitives']),'materials':[m['name'] for m in g.doc['materials']]}


def export_book(measured):
    global ATTACH
    # Merge the static book to six material batches; one additional turning
    # page under one hinge, not a node/update per line of print.
    BOOK_ROOT.matrix_world=Matrix.Identity(4);set_page(0);bpy.context.view_layer.update()
    static=[o for o in BOOK if o.type=='MESH' and o!=PAGE]
    bpy.ops.object.select_all(action='DESELECT')
    for o in static:o.select_set(True)
    bpy.context.view_layer.objects.active=static[0];bpy.ops.object.join();body=static[0];body.name='Book_Covers_And_Page_Blocks'
    bpy.context.view_layer.update()
    points=[body.matrix_world@v.co for v in body.data.vertices]+[PAGE.matrix_world@v.co for v in PAGE.data.vertices]
    lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)))
    origin=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    shift=Matrix.Translation(-origin)
    g=Gltf();static_mesh=g.mesh(body,C@shift@body.matrix_world)
    page_mesh=g.mesh(PAGE,C,morphs=True)
    hinge_base=Vector(C@shift@Vector((0,0,.024)))
    g.doc['nodes']=[{'name':'Focus_Open_Book','children':[1,2]},
                    {'name':'Book_Covers_And_Page_Blocks','mesh':static_mesh},
                    {'name':'Book_Page_Hinge','translation':list(hinge_base),'children':[3]},
                    {'name':'Book_Turning_Page','mesh':page_mesh,'weights':[0,0]}]
    g.doc['scenes'][0]['nodes']=[0]
    times=[i/FPS for i in range(round(DURATIONS['PageTurn']*FPS)+1)]
    rotations=[];scale=[];weights=[]
    for t in times:
        set_page(t)
        q=(C@HINGE.rotation_euler.to_matrix().to_4x4()@C.inverted()).to_quaternion()
        qv=[q.x,q.y,q.z,q.w]
        if rotations and sum(a*b for a,b in zip(qv,rotations[-1]))<0:qv=[-x for x in qv]
        rotations.append(qv);scale.append(tuple(HINGE.scale))
        weights.extend([PAGE.data.shape_keys.key_blocks['ReverseCamber'].value,PAGE.data.shape_keys.key_blocks['CrossoverCurl'].value])
    anim={'name':'PageTurn','samplers':[],'channels':[]};input_index=g.access(times,'SCALAR',bounds=True)
    g.channel(anim,2,'rotation',input_index,rotations,'VEC4')
    g.channel(anim,2,'scale',input_index,scale,'VEC3','STEP')
    g.channel(anim,3,'weights',input_index,weights,'SCALAR')
    g.doc['animations']=[anim];g.save(ROOT/'savi-focus-book.glb')
    # Book root is its measured bottom center, matching model placement rules.
    # The inverse shift in hand-local space preserves the rendered contact.
    final_attach=ATTACH@C@Matrix.Translation(origin)@C.inverted()
    p,q,s=final_attach.decompose();e=q.to_euler('YXZ')
    measured['bookAttachment']={'position':dict(zip(('x','y','z'),[float(x) for x in p])),
        'rotation':dict(zip(('x','y','z','w'),(q.x,q.y,q.z,q.w))),'scale':1}
    (ROOT/'measurements.json').write_text(json.dumps(measured,indent=2))
    return {'width':hi.x-lo.x,'coverDimensions':[.30,.21,.035],'restBoundsBeforeBottomCenter':{'min':vec(lo),'max':vec(hi)},'originInProofCoordinates':vec(origin),'triangleCount':sum(g.doc['accessors'][p['attributes']['POSITION']]['count']//3 for mesh in g.doc['meshes'] for p in mesh['primitives']),'pageClipDuration':DURATIONS['PageTurn'],'nodes':4,'materialBatches':sum(len(m['primitives']) for m in g.doc['meshes'])}


def read_accessor(doc,binary,index):
    a=doc['accessors'][index]
    types={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1',5122:'<i2',5120:'i1'}
    dtype=types[a['componentType']]
    count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
    size=np.dtype(dtype).itemsize
    out=np.zeros((a['count'],count),dtype=dtype)
    if 'bufferView' in a:
        v=doc['bufferViews'][a['bufferView']]
        assert 'EXT_meshopt_compression' not in v.get('extensions',{}),'Use decoded source for old compressed accessors'
        stride=v.get('byteStride',size*count);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        out[:]=np.ndarray(out.shape,dtype=dtype,buffer=binary,offset=offset,strides=(stride,size))
    sparse=a.get('sparse')
    if sparse:
        ii=sparse['indices'];iv=doc['bufferViews'][ii['bufferView']]
        indices=np.frombuffer(binary,dtype=types[ii['componentType']],count=sparse['count'],offset=iv.get('byteOffset',0)+ii.get('byteOffset',0))
        vv=sparse['values'];view=doc['bufferViews'][vv['bufferView']]
        values=np.frombuffer(binary,dtype=dtype,count=sparse['count']*count,offset=view.get('byteOffset',0)+vv.get('byteOffset',0)).reshape((-1,count))
        out[indices]=values
    return out


def audit_exports():
    report={};source,source_binary=glb_read(SOURCE)
    for name in ('avatar','suit','book'):
        path=ROOT/f'savi-focus-{name}.glb';doc,binary=glb_read(path)
        clips={}
        for animation in doc.get('animations',[]):
            if animation['name'] not in DURATIONS:continue
            times=[read_accessor(doc,binary,s['input'])[:,0] for s in animation['samplers']]
            clips[animation['name']]=float(max(t.max() for t in times)-min(t.min() for t in times))
        joints=sorted({doc['nodes'][n]['name'] for skin in doc.get('skins',[]) for n in skin['joints']})
        row={'file':str(path),'bytes':path.stat().st_size,'clips':clips,'joints':joints,'materials':[m.get('name') for m in doc.get('materials',[])]}
        if name=='avatar':
            assert all(k in clips for k in ('FocusRead','FocusPageTurn','FocusThink'))
            assert 'hand_l' in joints
            assert binary[:len(source_binary)]==source_binary
            assert {a['name'] for a in doc['animations']}=={'FocusRead','FocusPageTurn','FocusThink'}
            for key in ('nodes','skins','meshes','materials','textures','images','scenes'):assert doc.get(key)==source.get(key)
            row['restorationSourceOldClips']=len(source['animations']);row['originalMeshes']=len(source['meshes']);row['preservedSourceBytes']=len(source_binary)
        if name=='suit':
            triangles=sum((doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3) for m in doc['meshes'] for p in m['primitives'])
            assert triangles<=20000
            assert 'hand_l' in joints
            # Rest-pose skinning audit: inverse binds return the original points.
            worlds,_=raw_worlds(doc);skin=doc['skins'][0];ib=read_accessor(doc,binary,skin['inverseBindMatrices'])
            err=0
            for j,idx in enumerate(skin['joints']):
                matrix=Matrix(ib[j].reshape(4,4).T.tolist());diff=worlds[idx]@matrix-Matrix.Identity(4)
                err=max(err,max(abs(v) for row2 in diff for v in row2))
            assert err<1e-4,err
            row['triangles']=triangles;row['restSkinMatrixError']=err
        if name=='book':
            assert 'PageTurn' in clips
            assert {'Book_Page_Hinge','Book_Turning_Page'}.issubset({n.get('name') for n in doc['nodes']})
            row['triangles']=sum(doc['accessors'][p['attributes']['POSITION']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
            positions=[read_accessor(doc,binary,p['attributes']['POSITION']) for p in doc['meshes'][0]['primitives']]
            a=np.concatenate(positions);row['width']=float(np.max(a[:,0])-np.min(a[:,0]));row['bottom']=float(np.min(a[:,1]))
            assert abs(row['width']-.30)<.003 and abs(row['bottom'])<1e-6
        report[name]=row
    (ROOT/'export-audit.json').write_text(json.dumps(report,indent=2))
    print('EXPORT AUDIT',json.dumps({k:{f:v for f,v in row.items() if f not in ('joints','materials')} for k,row in report.items()},indent=2))
    return report



def sample_export(doc,binary,name,t):
    animation=next(a for a in doc['animations'] if a['name']==name)
    nodes=copy.deepcopy(doc['nodes'])
    for ch in animation['channels']:
        sampler=animation['samplers'][ch['sampler']];times=read_accessor(doc,binary,sampler['input'])[:,0]
        values=read_accessor(doc,binary,sampler['output'])
        index=int(np.argmin(np.abs(times-t)))
        target=ch['target'];path=target['path']
        if path=='weights':value=values.reshape((len(times),-1))[index].tolist()
        else:value=values[index].tolist()
        nodes[target['node']][path]=value
    return nodes,raw_worlds({'nodes':nodes})[0]


def verify_visual_exports():
    global RIG
    # Avatar meshes/materials are decoded from the original unchanged bytes;
    # every animation matrix below comes from the EXPORTED focus GLB.
    RIG=import_original();init_pose(RIG)
    avatar,ab=glb_read(ROOT/'savi-focus-avatar.glb')
    suitdoc,sb=glb_read(ROOT/'savi-focus-suit.glb');suitworld,_=raw_worlds(suitdoc)
    bookdoc,bb=glb_read(ROOT/'savi-focus-book.glb')
    avatar_defaults={b.name:RIG.matrix_world@b.matrix for b in RIG.pose.bones}
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'savi-focus-suit.glb'))
    imported=set(bpy.context.scene.objects)-before
    suit_rig=next(o for o in imported if o.type=='ARMATURE')
    suit_defaults={b.name:suit_rig.matrix_world@b.matrix for b in suit_rig.pose.bones}
    suitnames={n.get('name'):i for i,n in enumerate(suitdoc['nodes'])}
    suitmesh=next(o for o in imported if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers))
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'savi-focus-book.glb'))
    root=bpy.data.objects['Focus_Open_Book'];hinge=bpy.data.objects['Book_Page_Hinge'];page=bpy.data.objects['Book_Turning_Page']
    measurements=json.loads((ROOT/'measurements.json').read_text());a=measurements['bookAttachment']
    q=attachment_rotation(a['rotation'])
    attachment=Matrix.LocRotScale(Vector(tuple(a['position'][k] for k in ('x','y','z'))),q,Vector((1,1,1)))
    for name in ('Savi_TShirt_001','Savi_pants_001','Savi_Hair_Tie_Wrist','Savi_Hair_Tie_Gathered'):
        bpy.data.objects[name].hide_render=True
    scene=bpy.context.scene
    cam=studio(target=(-.015,.04,.96),camera=(2.5,6.2,2.35),size=1000);cam.data.ortho_scale=2.21
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.0005));floor=bpy.context.object;floor.name='ProofFloor'
    floor.data.materials.append(surface('Proof_matte_backdrop','#9599a2',.85))
    checks={}
    def pose(clip,t):
        nodes,worlds=sample_export(avatar,ab,clip,t)
        for rig,defaults,restworld,names in [(RIG,avatar_defaults,RAW_W,RAW_NAME),(suit_rig,suit_defaults,suitworld,suitnames)]:
            for pb in rig.pose.bones:
                name=pb.name
                if name not in names or name not in RAW_NAME or name=='SAVI':continue
                raw_id=RAW_NAME[name];rest_id=names[name]
                # Original raw node IDs are retained exactly by the avatar.
                delta=C.inverted()@worlds[raw_id]@restworld[rest_id].inverted()@C
                pb.matrix=rig.matrix_world.inverted()@delta@defaults[name]
                bpy.context.view_layer.update()
        root.matrix_world=C.inverted()@normalized(worlds[RAW_NAME['hand_l']])@attachment@C
        booknodes,_=sample_export(bookdoc,bb,'PageTurn',t if clip=='FocusPageTurn' else 0)
        h=booknodes[2];r=h.get('rotation',[0,0,0,1])
        local=Matrix.LocRotScale(Vector(h['translation']),Quaternion((r[3],r[0],r[1],r[2])),Vector(h.get('scale',[1,1,1])))
        hinge.matrix_basis=C.inverted()@local@C
        for key,value in zip(page.data.shape_keys.key_blocks[1:],booknodes[3]['weights']):key.value=value
        bpy.context.view_layer.update()
        sbounds=evaluated_bounds(suitmesh)
        assert sbounds['max'][2]<1.7 and sbounds['min'][2]>.10,sbounds
        checks[clip]={'sampleTime':t,'suitBounds':sbounds,'handWorld':vec(normalized(worlds[RAW_NAME['hand_l']]).translation)}
    for clip,t in [('FocusRead',0),('FocusPageTurn',31/FPS),('FocusThink',1.5)]:
        pose(clip,t);scene.render.filepath=str(ROOT/(clip+'.png'));bpy.ops.render.render(write_still=True)
    cam.data.ortho_scale=1.14;cam.location=(2.2,5.0,2.20);point_at(cam,(0,.12,1.32))
    pose('FocusRead',0);scene.render.filepath=str(ROOT/'FocusRead-detail.png');bpy.ops.render.render(write_still=True)
    cam.data.ortho_scale=.65;cam.location=(1.0,2.0,2.3);point_at(cam,(-.025,.24,1.18))
    pose('FocusPageTurn',31/FPS);scene.render.filepath=str(ROOT/'FocusPageTurn-detail.png');bpy.ops.render.render(write_still=True)
    (ROOT/'visual-export-audit.json').write_text(json.dumps(checks,indent=2))
    print('EXPORTED VISUALS',json.dumps(checks))



def accessor_float(doc,binary,index):
    a=doc['accessors'][index];v=read_accessor(doc,binary,index)
    if a.get('normalized') and a['componentType']!=5126:
        limit=np.iinfo(v.dtype).max;v=v.astype(np.float64)/limit
        if a['componentType'] in (5120,5122):v=np.maximum(v,-1)
    return v


def raw_primitive(doc,binary,node_index,primitive,worlds,nodes):
    node=nodes[node_index];base=doc['meshes'][node['mesh']]
    pos=accessor_float(doc,binary,primitive['attributes']['POSITION']).astype(np.float64)
    normal=accessor_float(doc,binary,primitive['attributes']['NORMAL']).astype(np.float64)
    weights=node.get('weights',base.get('weights',[]))
    for w,target in zip(weights,primitive.get('targets',[])):
        if abs(w)<1e-12:continue
        if 'POSITION' in target:pos+=w*accessor_float(doc,binary,target['POSITION'])
        if 'NORMAL' in target:normal+=w*accessor_float(doc,binary,target['NORMAL'])
    h=np.ones((len(pos),4));h[:,:3]=pos
    if 'skin' in node:
        skin=doc['skins'][node['skin']]
        ib=accessor_float(doc,binary,skin['inverseBindMatrices']).reshape((-1,4,4)).transpose((0,2,1))
        jm=np.array([np.asarray(worlds[j],dtype=np.float64)@ib[k] for k,j in enumerate(skin['joints'])])
        out=np.zeros((len(pos),4));nn=np.zeros((len(pos),3))
        for k in range(2):
            jref=primitive['attributes'].get('JOINTS_'+str(k));wref=primitive['attributes'].get('WEIGHTS_'+str(k))
            if jref is None:continue
            joints=read_accessor(doc,binary,jref).astype(np.int64);w=accessor_float(doc,binary,wref)
            mats=jm[joints]
            out+=np.einsum('vi,vijk,vk->vj',w,mats,h)
            nn+=np.einsum('vi,vijk,vk->vj',w,mats[:,:,:3,:3],normal)
        pos=out[:,:3];normal=nn
    else:
        transform=np.asarray(worlds[node_index],dtype=np.float64)
        pos=(h@transform.T)[:,:3];normal=normal@np.linalg.inv(transform[:3,:3])
    return pos,normal


def face_diagnostics():
    # This is a READ-only evaluation of source geometry, source texture,
    # authored node/morph defaults, and exported animation matrices.
    # It does not replace, edit, simplify or bake the avatar's meshes.
    original_rig=import_original()
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.hide_render=True
    doc,binary=glb_read(decode_for_blender());focus,fb=glb_read(ROOT/'savi-focus-avatar.glb')
    sw,sp=raw_worlds(doc);head=next(i for i,n in enumerate(doc['nodes']) if n.get('name')=='head')
    facial_names=[n.get('name') for n in doc['nodes'] if any(k in n.get('name','').lower() for k in ('jaw','tongue','lip','eye')) and 'mesh' not in n and doc['nodes'].index(n)<235]
    selected=[i for i,n in enumerate(doc['nodes']) if i<235 and 'mesh' in n and (n.get('skin') in (0,1,2,3)) and n.get('name') not in ('Savi_TShirt_001','Savi_pants_001','Savi_shoes_001')]
    cam=studio(target=(0,.047,1.638),camera=(.35,4,1.67),size=900);cam.data.ortho_scale=.48
    # Light the face from its actual forward (+Y in Blender), not behind it.
    for name,loc,power in [('ProofKey',(-2,3,3.5),340),('ProofFill',(2.5,2,1.7),210),('ProofRim',(0,-2,3),250)]:
        o=bpy.data.objects[name];o.location=loc;o.data.energy=power;point_at(o,(0,0,1.65))
    baseline_camera=cam.matrix_world.copy();stage=[];references={};report={'source':SOURCE_URL,'states':{},'method':'glTF jointWorld * inverseBind, node/mesh morph defaults; head-aligned studio closeups'}
    cases=[('SourceRest',None,0),('SourceIdle','SaviIdle',2.0),('FocusRead','FocusRead',0),('FocusPageTurn','FocusPageTurn',31/FPS),('FocusThink','FocusThink',1.5)]
    for label,clip,t in cases:
        for o in stage:bpy.data.objects.remove(o,do_unlink=True)
        stage=[]
        if clip is None:nodes=doc['nodes'];worlds=sw
        elif label=='SourceIdle':nodes,worlds=sample_export(doc,binary,clip,t)
        else:nodes,worlds=sample_export(focus,fb,clip,t)
        align=np.asarray(sw[head]@worlds[head].inverted(),dtype=np.float64)
        maximum=0;body_max=0;teeth_max=0;head_samples=0
        for ni in selected:
            n=nodes[ni]
            for pi,primitive in enumerate(doc['meshes'][n['mesh']]['primitives']):
                pos,normal=raw_primitive(doc,binary,ni,primitive,worlds,nodes)
                key=(ni,pi)
                h=np.ones((len(pos),4));h[:,:3]=pos;aligned=(h@align.T)[:,:3]
                if label=='SourceRest':references[key]=aligned.copy()
                ref=references[key];region=(ref[:,1]>1.49)&(np.abs(ref[:,0])<.18)&(ref[:,2]<.02)
                if region.any():
                    error=np.linalg.norm(aligned[region]-ref[region],axis=1);maximum=max(maximum,float(error.max()));head_samples+=len(error)
                    if ni==87:body_max=max(body_max,float(error.max()))
                    if ni==93:teeth_max=max(teeth_max,float(error.max()))
                # Head-align the proof geometry, removing only rigid gaze tilt.
                # Local mouth / lip / jaw deformation is therefore directly visible.
                pos=(np.column_stack((aligned,np.ones(len(aligned))))@np.asarray(C.inverted()).T)[:,:3]
                normal=normal@align[:3,:3].T@np.asarray(C.inverted())[:3,:3].T
                normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-12)
                indices=read_accessor(doc,binary,primitive['indices']).reshape(-1).astype(int) if 'indices' in primitive else np.arange(len(pos))
                faces=indices.reshape((-1,3)).tolist();mesh=bpy.data.meshes.new('FaceAudit_'+n['name']);mesh.from_pydata(pos.tolist(),[],faces);mesh.update()
                ob=bpy.data.objects.new('FaceAudit_'+n['name'],mesh);bpy.context.scene.collection.objects.link(ob);stage.append(ob)
                matname=doc['materials'][primitive['material']]['name'];mat=bpy.data.materials.get(matname);assert mat is not None,matname;mesh.materials.append(mat)
                for p in mesh.polygons:p.use_smooth=True
                if 'TEXCOORD_0' in primitive['attributes']:
                    uv=accessor_float(doc,binary,primitive['attributes']['TEXCOORD_0']);layer=mesh.uv_layers.new(name='UVMap')
                    for li,loop in enumerate(mesh.loops):
                        u,v=uv[loop.vertex_index];layer.data[li].uv=(u,1-v) # glTF top-left UV to Blender bottom-left UV
                mesh.normals_split_custom_set_from_vertices(normal.tolist())
        changed=[]
        for name in facial_names:
            i=next(j for j,n in enumerate(doc['nodes']) if n.get('name')==name)
            for path,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]:
                a=np.array(doc['nodes'][i].get(path,default));b=np.array(nodes[i].get(path,default));error=min(np.linalg.norm(a-b),np.linalg.norm(a+b)) if path=='rotation' else np.linalg.norm(a-b)
                if error>1e-4:changed.append({'bone':name,'path':path,'difference':float(error)})
        report['states'][label]={'time':t,'headRegionVertices':head_samples,'maximumHeadAlignedDisplacementMeters':maximum,'faceBodyDisplacementMeters':body_max,'teethDisplacementMeters':teeth_max,'changedFacialTransforms':changed}
        bpy.context.scene.render.filepath=str(ROOT/(label+'-face.png'));bpy.ops.render.render(write_still=True)
    (ROOT/'face-audit.json').write_text(json.dumps(report,indent=2));print('FACE AUDIT',json.dumps(report))


def final_export_proofs():
    import_original()
    original,ob=glb_read(decode_for_blender());avatar,ab=glb_read(ROOT/'savi-focus-avatar.glb')
    suit,sb=glb_read(ROOT/'savi-focus-suit.glb');book,bb=glb_read(ROOT/'savi-focus-book.glb')
    for name in ('suit','book'):bpy.ops.import_scene.gltf(filepath=str(ROOT/f'savi-focus-{name}.glb'))
    for o in bpy.context.scene.objects:
        if o.type=='MESH':o.hide_render=True
    names={n.get('name'):i for i,n in enumerate(avatar['nodes']) if i<235}
    at=json.loads((ROOT/'measurements.json').read_text())['bookAttachment'];r=at['rotation']
    q=attachment_rotation(r)
    attach=Matrix.LocRotScale(Vector(tuple(at['position'][k] for k in ('x','y','z'))),q,Vector((1,1,1)))
    cam=studio(target=(0,.08,.98),camera=(2.4,6.0,2.35),size=1000);cam.data.ortho_scale=2.20
    for n,loc,power in [('ProofKey',(-2,3,3.5),340),('ProofFill',(2.5,2,1.7),210),('ProofRim',(0,-2,3),250)]:
        o=bpy.data.objects[n];o.location=loc;o.data.energy=power;point_at(o,(0,0,1.1))
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));bpy.context.object.data.materials.append(surface('Final_backdrop','#9599a2',.85))
    stage=[]
    def draw(doc,binary,nodes,worlds,select):
        for i in select:
            node=nodes[i]
            for prim in doc['meshes'][node['mesh']]['primitives']:
                pos,norm=raw_primitive(doc,binary,i,prim,worlds,nodes)
                pos=(np.column_stack((pos,np.ones(len(pos))))@np.asarray(C.inverted()).T)[:,:3]
                norm=norm@np.asarray(C.inverted())[:3,:3].T;norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-12)
                ix=read_accessor(doc,binary,prim['indices']).reshape(-1) if 'indices' in prim else np.arange(len(pos))
                mesh=bpy.data.meshes.new('ExportProof');mesh.from_pydata(pos.tolist(),[],ix.reshape(-1,3).tolist());mesh.update()
                o=bpy.data.objects.new('ExportProof',mesh);bpy.context.scene.collection.objects.link(o);stage.append(o)
                mesh.materials.append(bpy.data.materials[doc['materials'][prim['material']]['name']])
                for f in mesh.polygons:f.use_smooth=True
                if 'TEXCOORD_0' in prim['attributes']:
                    uv=accessor_float(doc,binary,prim['attributes']['TEXCOORD_0']);layer=mesh.uv_layers.new(name='UVMap')
                    for j,loop in enumerate(mesh.loops):
                        u,v=uv[loop.vertex_index];layer.data[j].uv=(u,1-v)
                mesh.normals_split_custom_set_from_vertices(norm.tolist())
    hidden={'Savi_TShirt_001','Savi_pants_001','Savi_Hair_Tie_Wrist','Savi_Hair_Tie_Gathered'}
    for clip,t in [('FocusRead',0),('FocusPageTurn',31/FPS),('FocusThink',1.5)]:
        for o in stage:bpy.data.objects.remove(o,do_unlink=True)
        stage=[];nodes,worlds=sample_export(avatar,ab,clip,t)
        draw(original,ob,nodes,worlds,[i for i,n in enumerate(nodes) if i<235 and 'mesh' in n and n.get('name') not in hidden])
        sw,_=raw_worlds(suit)
        for i,n in enumerate(suit['nodes']):
            if n.get('name') in names:sw[i]=worlds[names[n['name']]]
        draw(suit,sb,suit['nodes'],sw,[i for i,n in enumerate(suit['nodes']) if 'mesh' in n])
        bn,bw=sample_export(book,bb,'PageTurn',t if clip=='FocusPageTurn' else 0)
        root=normalized(worlds[names['hand_l']])@attach
        draw(book,bb,bn,{i:root@m for i,m in bw.items()},[i for i,n in enumerate(bn) if 'mesh' in n])
        bpy.context.scene.render.filepath=str(ROOT/(clip+'-final.png'));bpy.ops.render.render(write_still=True)
    print('FINAL_PROOFS: exported avatar joints, original sparse morphs and textures; parent-joint suit; measured book attachment')


def attachment_rotation(r):
    if 'w' in r:return Quaternion(tuple(r[k] for k in ('w','x','y','z'))).normalized()
    # Legacy measurements were Blender Euler angles, not engine Euler angles.
    return Euler(tuple(math.radians(r[k]) for k in ('pitch','yaw','roll')),'YXZ').to_quaternion()


def fix_book_rotation():
    path=ROOT/'measurements.json';data=json.loads(path.read_text())
    old=data['bookAttachment']['rotation'];q=attachment_rotation(old)
    data['bookAttachment']['rotation']=dict(zip(('x','y','z','w'),(q.x,q.y,q.z,q.w)))
    path.write_text(json.dumps(data,indent=2))
    print('BOOK_ROTATION',json.dumps(data['bookAttachment']['rotation']))


def portable_avatar():
    # Same geometry and clips; remove codec dependencies from the delivery.
    source,source_bin=glb_read(SOURCE)
    packed,pb=glb_read(ROOT/'savi-focus-avatar.glb')
    if 'EXT_meshopt_compression' not in packed.get('extensionsUsed',[]):
        return
    doc,binary=glb_read(decode_for_blender())
    base_views=len(source['bufferViews']);base_accessors=len(source['accessors'])
    view_shift=len(doc['bufferViews'])-base_views
    byte_shift=len(binary)-len(source_bin)
    for v in copy.deepcopy(packed['bufferViews'][base_views:]):
        v['byteOffset']=v.get('byteOffset',0)+byte_shift;doc['bufferViews'].append(v)
    for a in copy.deepcopy(packed['accessors'][base_accessors:]):
        if 'bufferView' in a:a['bufferView']+=view_shift
        doc['accessors'].append(a)
    doc['animations']=packed['animations']
    binary=binary+pb[len(source_bin):]
    doc['buffers']=[{'byteLength':len(binary)}]
    for key in ('nodes','meshes','skins','materials','scenes'):assert doc[key]==packed[key],key
    # Prove every pose sample survives the transfer exactly.
    for anim in packed['animations']:
        for sampler in anim['samplers']:
            for slot in ('input','output'):
                i=sampler[slot];assert np.array_equal(read_accessor(packed,pb,i),read_accessor(doc,binary,i)),(anim['name'],i)
    glb_write(ROOT/'savi-focus-avatar.glb',doc,binary)
    print('PORTABLE AVATAR: original geometry and every focus keyframe unchanged; meshopt/basis codecs removed')


if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['--proof']
    if '--inspect' in args:inspect()
    elif '--audit' in args:audit_exports()
    elif '--portable-avatar' in args:portable_avatar()
    elif '--fix-book-rotation' in args:fix_book_rotation()
    elif '--verify-visual' in args:final_export_proofs()
    elif '--face-audit' in args:face_diagnostics()
    else:
        measurements=construct()
        if '--export' in args:
            receipt={'avatar':augment_avatar(),'suit':export_suit(),'book':export_book(measurements)}
            (ROOT/'export-receipt.json').write_text(json.dumps(receipt,indent=2))
            portable_avatar()
            audit_exports()
        else:
            proof_render()
            bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'focus-proof.blend'))
