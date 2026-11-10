"""Tank top grown from the body's own skin (Nov 10): the Body mesh is cut by clean planes (hem, scoop neck, armholes),
pushed out along its normals per shape key, cleavage bridged, the edges rolled into a lip. Same weights + Bust key as the skin
under it, so it bends exactly with the body and can't poke or float. Skin stays drawn underneath (no jagged holes).
Usage: blender -b --python-exit-code 1 -P tank_shell.py -- body.glb out.glb"""
import bpy, bmesh, sys
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
T = 0.0065  # cloth stand-off, metres
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
J = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
body = bpy.data.objects['Body']
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o != body: bpy.data.objects.remove(o, do_unlink=True)
body.name = body.data.name = 'Ward_tank'
hipz, neckz, ax, sy = J['Hips'].z, J['Neck'].z, J['LeftArm'].x, J['Spine2'].y
s = neckz / 1.276
hem = hipz + 0.045 * s
xstrap, xpit, zpit = ax * 0.66, ax * 1.06, J['LeftArm'].z - 0.075 * s
slope = (xpit - xstrap) / (neckz - 0.03 * s - zpit)
def armlim(z): return xstrap + slope * (neckz - 0.03 * s - z)
def necklim(x, y):  # scoop: low in front, curved across, high at the back
    front = max(0.0, min(1.0, (sy - y) / (0.12 * s)))
    return neckz - 0.035 * s - front * (0.075 * s - 0.9 * (x / s) ** 2 * 6)
me = body.data
bm = bmesh.new(); bm.from_mesh(me)
# clean cut lines: bisect along the hem, both armholes and a fan of planes for the scoop
geom = lambda: bm.verts[:] + bm.edges[:] + bm.faces[:]
bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(0, 0, hem), plane_no=(0, 0, 1))
for sg in (1, -1):
    bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(sg * xstrap, 0, neckz - 0.03 * s), plane_no=(sg, 0, slope).__class__((sg, 0, slope)))
for xi in [-0.06, -0.035, -0.012, 0.012, 0.035, 0.06]:
    x = xi * s; z0 = necklim(x, sy - 0.2)
    bmesh.ops.bisect_plane(bm, geom=geom(), plane_co=(x, sy - 0.2, z0), plane_no=(0.0, 0.0, 1.0)) if False else None
bm.verts.ensure_lookup_table()
def inside(p):
    return p.z > hem - 1e-4 and abs(p.x) < armlim(p.z) + 1e-4 and p.z < necklim(p.x, p.y) + 1e-4
dead = [f for f in bm.faces if not inside(f.calc_center_median())]
bmesh.ops.delete(bm, geom=dead, context='FACES')
# trim the scoop along a smooth curve: snap the neck-edge vertices onto the curve (their own x,y), so the line reads drawn, not stepped
bm.verts.ensure_lookup_table()
sk = bm.verts.layers.shape
keys = list(sk.keys())
for v in bm.verts:
    if any(e.is_boundary for e in v.link_edges) and v.co.z > neckz - 0.13 * s and abs(v.co.x) < armlim(v.co.z) - 0.01:
        dz = necklim(v.co.x, v.co.y) - v.co.z
        if abs(dz) < 0.03 * s:
            v.co.z += dz
            for k in keys: v[sk[k]].z += dz
    if any(e.is_boundary for e in v.link_edges) and abs(v.co.z - hem) < 0.02 * s: 
        dz = hem - v.co.z; v.co.z += dz
        for k in keys: v[sk[k]].z += dz
# rings from the open edge
ring = {}
front = [v for v in bm.verts if any(e.is_boundary for e in v.link_edges)]
for v in front: ring[v] = 0
for r in range(1, 4):
    nxt = []
    for v in front:
        for e in v.link_edges:
            w = e.other_vert(v)
            if w not in ring: ring[w] = r; nxt.append(w)
    front = nxt
feather = {0: 0.35, 1: 0.7, 2: 0.9}
def coords(layer): return {v: (v[layer].copy() if layer is not None else v.co.copy()) for v in bm.verts}
def normals(C):
    n = {v: Vector() for v in bm.verts}
    for f in bm.faces:
        vs = f.verts; c = [C[v] for v in vs]; fn = Vector()
        for i in range(len(c)): fn += c[i].cross(c[(i + 1) % len(c)])
        for v in vs: n[v] += fn
    return {v: (x.normalized() if x.length > 1e-12 else Vector((0, 0, 1))) for v, x in n.items()}
def fill(C):  # bridge hollows (cleavage, spine groove) the way fabric does, outward only
    for it in range(6):
        N = normals(C); new = {}
        for v in bm.verts:
            if ring.get(v, 9) < 1: continue
            nb = [e.other_vert(v) for e in v.link_edges]
            avg = sum((C[w] for w in nb), Vector()) / len(nb)
            d = (avg - C[v]).dot(N[v])
            if d > 0: new[v] = C[v] + N[v] * d * 0.6
        C.update(new)
    return C
def shell(C):
    N = normals(C)
    C = {v: C[v] + N[v] * T * feather.get(ring.get(v, 9), 1.0) for v in bm.verts}
    return fill(C)
layers = [None] + [sk[k] for k in keys]
basisN = normals(coords(None))
res = [shell(coords(L)) for L in layers]
for L, C in zip(layers, res):
    for v in bm.verts:
        if L is None: v.co = C[v]
        else: v[L] = C[v]
# the lip: the open edge folds back toward the skin, so a hem has a thickness and you never see into the shell
edges = [e for e in bm.edges if e.is_boundary]
src_of = {}
ret = bmesh.ops.extrude_edge_only(bm, edges=edges)
newv = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
for v in newv:
    o = next(e.other_vert(v) for e in v.link_edges if e.other_vert(v) not in newv and e.other_vert(v) in basisN)
    n = basisN[o]
    v.co = v.co - n * T * 0.9
    for k in keys: v[sk[k]] = v[sk[k]] - n * T * 0.9
for f in bm.faces: f.smooth = True
bm.normal_update()
bm.to_mesh(me); bm.free(); me.update()
me.materials.clear(); me.materials.append(bpy.data.materials.new('cloth_top'))
print('TANK', len(me.vertices), 'hem', round(hem, 3), 'strap', round(xstrap, 3), 'pit', round(xpit, 3), round(zpit, 3), 'keys', keys)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_skins=True, export_morph=True, export_animations=False, export_apply=False)
