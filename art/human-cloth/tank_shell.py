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
# the skin is split into parts (Body + Skin_*): join them so straps can run up over the shoulder, the cut drops the rest
parts = [o for o in bpy.data.objects if o.type == 'MESH' and o != body and o.name.startswith('Skin_')]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o != body and o not in parts: bpy.data.objects.remove(o, do_unlink=True)
if parts:
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    body.select_set(True); bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
print('JOINED', len(parts))
body.name = body.data.name = 'Ward_tank'
hipz, neckz, ax, sy = J['Hips'].z, J['Neck'].z, J['LeftArm'].x, J['Spine2'].y
s = neckz / 1.276
hem = J['Spine'].z + 0.07 * s  # just under the navel: pants take it from there
xstrap, xpit, zpit = ax * 0.66, ax * 1.06, J['LeftArm'].z - 0.075 * s
slope = (xpit - xstrap) / (neckz - 0.03 * s - zpit)
def armlim(z): return xstrap + max(0.0, slope * (neckz - 0.03 * s - z))  # straps keep their width up and over
# measured off this body: the neck's own half-width just above its base, and the shoulder line beside it
_P = [body.matrix_world @ v.co for v in body.data.vertices]
_top = max(p.z for p in _P)
neckR = max(abs(p.x) for p in _P if _top - 0.035 * s < p.z < _top - 0.005)  # the neck tube where the head file takes over
NW = min((neckR + 0.012) / s, 0.62 * xstrap / s)  # half-width of the neck opening; outside it the straps run over the shoulder
_sh = [p.z for p in _P if NW * s < abs(p.x) < xstrap and p.z < neckz + 0.08 * s]
shz = (max(_sh) + 0.004) if _sh else _top + 0.01  # the shoulder's own top: straps lie on it, never ride up the neck tube
capz = _top + 0.01  # straps run up and over until this body's own edge  # over the shoulder top; the neck line when this body splits there
print('NECK', round(neckR, 3), 'cap', round(capz, 3))
def necklim(x, y):  # a U scoop, deep in front, shallow at the back
    u = abs(x) / (NW * s)
    base = min(capz, neckz + 0.01 * s)
    if u >= 1:  # past the scoop the strap's inner edge rises in a smooth shoulder curve: a step here was the square notch
        t = min(1.0, (u - 1) / 0.45); t = t * t * (3 - 2 * t)
        return base + (min(capz, shz) - base) * t
    front = max(0.0, min(1.0, (sy - y) / (0.06 * s) + 0.5))
    depth = (0.025 + 0.05 * front) * s
    return min(capz, neckz + 0.01 * s) - depth * (1 - u * u) ** 0.5
me = body.data
M = body.matrix_world.copy(); Mi = M.inverted(); R = Mi.to_3x3()
W = lambda co: M @ co   # the tests run in world space (glTF bodies sit under a rotated armature)
bm = bmesh.new(); bm.from_mesh(me)
def cut(co, no): bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Mi @ Vector(co), plane_no=(R @ Vector(no)).normalized())
# clean cut lines: bisect along the hem, both armholes and a fan of planes for the scoop
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=2e-5)  # the mirrored halves meet at x=0: weld, or the push opens a seam down the spine
sk = bm.verts.layers.shape; keys = list(sk.keys())
def F(co):  # >0 inside the garment, the cut is its zero line (a contour, so every edge is drawn, not stepped)
    p = W(co)
    return min(p.z - hem, armlim(p.z) - abs(p.x), necklim(p.x, p.y) - p.z)
f = {v: F(v.co) for v in bm.verts}
cross = [e for e in bm.edges if (f[e.verts[0]] > 0) != (f[e.verts[1]] > 0)]
made = set()
for e in cross:
    v0, v1 = e.verts; a0, a1 = f[v0], f[v1]
    t = a0 / (a0 - a1)
    ne, nv = bmesh.utils.edge_split(e, v0, t)
    f[nv] = 0.0; made.add(nv)
for face in list(bm.faces):
    cv = [v for v in face.verts if v in made]
    if len(cv) == 2 and not any(cv[1] in [e.other_vert(cv[0]) for e in cv[0].link_edges if face in e.link_faces] for _ in [0]):
        try: bmesh.ops.connect_verts(bm, verts=cv)
        except Exception: pass
dead = [fc for fc in bm.faces if sum(f.get(v, F(v.co)) for v in fc.verts) / len(fc.verts) < -1e-6 or any(f.get(v, 0) < -1e-6 for v in fc.verts)]
bmesh.ops.delete(bm, geom=dead, context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.verts.ensure_lookup_table()
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
