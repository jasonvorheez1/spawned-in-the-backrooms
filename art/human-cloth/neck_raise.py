# Men's long sleeve: lift the scoop neckline up to a snug crew collar so it covers the
# body's neck/collar seam (its jagged triangle edge read as white teeth, Nov 11).
# blender -b -P neck_raise.py -- body.glb in.glb out.glb
import bpy, bmesh, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
body_p, in_p, out_p = sys.argv[sys.argv.index('--')+1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body_p)
vs=[];fs=[]
for o in [o for o in bpy.data.objects if o.type=='MESH' and (o.name.startswith('Skin_') or o.name in ('Body','Head'))]:
  off=len(vs); vs+=[o.matrix_world@v.co for v in o.data.vertices]; fs+=[[off+i for i in p.vertices] for p in o.data.polygons]
T=BVHTree.FromPolygons(vs,fs)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.materials): m.name=m.name+'_body'
bpy.ops.import_scene.gltf(filepath=in_p)
G=next(o for o in bpy.data.objects if o.type=='MESH')
for m in G.data.materials:
  if m and '.' in m.name: m.name=m.name.split('.')[0]
mw=G.matrix_world; inv=mw.inverted()
P=[mw@v.co for v in G.data.vertices]
key=lambda p:(round(p.x,4),round(p.y,4),round(p.z,4))
bm=bmesh.new(); bm.from_mesh(G.data); bm.verts.ensure_lookup_table()
for v in bm.verts: v.co=mw@v.co
bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=0.0002)
bnd=[v.co.copy() for v in bm.verts if any(e.is_boundary for e in v.link_edges) and v.co.z>1.3]
bm.free()
print('neck boundary verts',len(bnd), 'z range',min(p.z for p in bnd),max(p.z for p in bnd))
# neck axis at collar height from the body's own cross-section
ZT=1.445
cs=[Vector(v) for v in vs if abs(v.z-ZT)<0.01 and abs(v.x)<0.09]
c=sum(cs,Vector())/len(cs); c.z=ZT
print('neck centre',tuple(round(x,3) for x in c))
def target(p):
  d=Vector((p.x-c.x,p.y-c.y,0)); d.normalize()
  hit=T.ray_cast(c+d*0.2,-d,0.4)  # from outside inward: the neck's outer skin
  r=(hit[0]-c).xy.length if hit[0] else 0.065
  return Vector((c.x+d.x*(r+0.010),c.y+d.y*(r+0.010),max(p.z,ZT-0.012*abs(d.y))))
B=[(b,target(b)-b) for b in bnd]
R=0.07; moved=0
for i,p in enumerate(P):
  if p.z<1.25: continue
  bb,dd=min(B,key=lambda t:(t[0]-p).length); dist=(bb-p).length
  if dist>R: continue
  w=1-dist/R; w=w*w*(3-2*w)
  q=p+dd*w
  loc,n,_,_=T.find_nearest(q)
  if loc is not None and (q-loc).dot(n)<0.008: q=loc+n*0.008
  G.data.vertices[i].co=inv@q; moved+=1
print('MOVED',moved)
G.data.update()
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=out_p,export_format='GLB',export_skins=True,export_morph=True,export_apply=False,export_animations=False,export_yup=True,use_selection=True)
