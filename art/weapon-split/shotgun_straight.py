# Straightens the Tripo shotgun (it was baked on a diagonal): barrel along Blender +Y (glTF -Z = muzzle forward),
# top up +Z, stock behind, so the viewmodel holds it like a long gun. Box matched to art/weapons/fit.json shotgun.
import bpy, numpy as np, mathutils as mu
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/wpn/shotgun.glb")
o=[o for o in bpy.context.scene.objects if o.type=="MESH"][0]
bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
V=np.array([tuple(v.co) for v in o.data.vertices]); c=V.mean(0)
_,_,vt=np.linalg.svd(V-c,full_matrices=False); L,H,W=vt
t=(V-c)@L
# muzzle end is the thin end: the stock end has the larger cross-section
def spread(m): P=V[m]-c; return np.ptp(P@H)
if spread(t>np.percentile(t,90)) < spread(t<np.percentile(t,10)): pass
else: L=-L
t=(V-c)@L; h=(V-c)@H
mid=(t>np.percentile(t,35))&(t<np.percentile(t,65))
base=np.median(h[mid])
if (h[mid].max()-base) > (base-h[mid].min()): H=-H   # trigger guard / grip protrude downward
W=np.cross(L,H)
R=mu.Matrix((tuple(W),tuple(L),tuple(H)))   # rows: new x, new y(forward), new z(up)
o.data.transform(R.to_4x4()); o.data.update()
V=np.array([tuple(v.co) for v in o.data.vertices])
# level the bore: the barrel's top edge across the front 35% of the length runs flat
y=V[:,1]; front=y>np.percentile(y,65) if np.ptp(V[y>np.percentile(y,65)][:,2])<np.ptp(V[y<np.percentile(y,35)][:,2]) else y<np.percentile(y,35)
bins=np.linspace(y[front].min(),y[front].max(),12); ys=[];zs=[]
for a,b in zip(bins[:-1],bins[1:]):
    m=front&(y>=a)&(y<b)
    if m.sum()>5: ys.append((a+b)/2); zs.append(np.percentile(V[m][:,2],50))
k=np.polyfit(ys,zs,1)[0]; ang=-np.arctan(k); print("LEVEL deg",np.degrees(ang).round(2), "muzzle +y" if y[front].mean()>0 else "muzzle -y")
o.data.transform(mu.Matrix.Rotation(ang,4,'X')); o.data.update()
if y[front].mean()<0: o.data.transform(mu.Matrix.Rotation(np.pi,4,'Z')); o.data.update()
V=np.array([tuple(v.co) for v in o.data.vertices]); s_=0.974/np.ptp(V[:,1]); o.data.transform(mu.Matrix.Scale(s_,4)); o.data.update(); print("SCALE",round(s_,3))
V=np.array([tuple(v.co) for v in o.data.vertices]); mn,mx=V.min(0),V.max(0)
o.data.transform(mu.Matrix.Translation((-(mn[0]+mx[0])/2,-(mn[1]+mx[1])/2,-mn[2]))); o.data.update()
V=np.array([tuple(v.co) for v in o.data.vertices]); print("BOX",V.min(0).round(3),V.max(0).round(3))
sc=bpy.context.scene; sc.render.engine="CYCLES"; sc.cycles.samples=8; sc.render.resolution_x=900; sc.render.resolution_y=400
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[1].default_value=3
cd=bpy.data.cameras.new("c"); cd.type="ORTHO"; cd.ortho_scale=1.15; cam=bpy.data.objects.new("c",cd); sc.collection.objects.link(cam)
cam.location=(2,0,0.06); cam.rotation_euler=(1.5708,0,1.5708); sc.camera=cam; sc.render.filepath="/tmp/sg_side.png"; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath="/workspace/wpn/shotgun_straight.glb", export_apply=True)
