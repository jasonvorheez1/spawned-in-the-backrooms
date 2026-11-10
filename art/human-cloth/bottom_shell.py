"""Bottoms (pants/shorts/skirt base) grown the tee way: waist cut above the hips, cuff cut across each leg (CUFF: 0 = knee, 1 = ankle, negative = up the thigh).
Usage: WARD=Ward_pants CUFF=0.92 blender -b -P bottom_shell.py -- body.glb out.glb
Tee grown (Nov 10 redo, Shelly: "the clothing really needs a do over"; built off tank_shell): short sleeves cut square across the upper arm, a crew neck, a hem at the hip. Tank top grown from the body's own skin (Nov 10): the Body mesh is cut by clean planes (hem, scoop neck, armholes),
pushed out along its normals per shape key, cleavage bridged, the edges rolled into a lip. Same weights + Bust key as the skin
under it, so it bends exactly with the body and can't poke or float. Skin stays drawn underneath (no jagged holes).
Usage: blender -b --python-exit-code 1 -P tank_shell.py -- body.glb out.glb"""
import bpy, bmesh, sys, os
NAME = os.environ.get('WARD', 'Ward_pants'); SLEEVE = float(os.environ.get('SLEEVE', '0.42')); FLARE = float(os.environ.get('FLARE', '0.007')); STRAP = float(os.environ.get('STRAP', '0.66')); NECKD = float(os.environ.get('NECKD', '1')); HEM = float(os.environ.get('HEM', '-0.035'))  # a vest: WARD=Ward_vest STRAP=0.86 NECKD=0.6
from mathutils import Vector
TANK = os.environ.get('TANK') == '1'  # TANK=1 WARD=Ward_tank: armholes from the strap line (armlim) instead of sleeves, deeper scoop via NECKD
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]
T = float(os.environ.get('STANDOFF', '0.008'))  # cloth stand-off, metres (a vest sits thicker)
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
body.name = body.data.name = NAME
hipz, neckz, ax, sy = J['Hips'].z, J['Neck'].z, J['LeftArm'].x, J['Spine2'].y
s = neckz / 1.276
hem = J['Spine'].z + HEM * s  # just under the navel: pants take it from there
xstrap, xpit, zpit = ax * STRAP, ax * 1.06, J['LeftArm'].z - 0.075 * s
slope = (xpit - xstrap) / (neckz - 0.03 * s - zpit)
def armlim(z): return xstrap + max(0.0, slope * (neckz - 0.03 * s - z))
def sleeve(p):  # >0 on the tee side of a cut square across the upper arm, SLEEVE of the way to the elbow
    side = 'Left' if p.x > 0 else 'Right'
    A, E = J[side + 'Arm'], J[side + 'ForeArm']; d = E - A; L = d.length; d = d / L
    return SLEEVE * L - (p - A).dot(d)
def armt(p):  # 0 at the shoulder joint .. 1 at the sleeve hem: the sleeve opens out a little toward its hem
    side = 'Left' if p.x > 0 else 'Right'
    A, E = J[side + 'Arm'], J[side + 'ForeArm']; d = E - A; L = d.length
    return max(0.0, min(1.0, (p - A).dot(d / L) / (SLEEVE * L)))
# measured off this body: the neck's own half-width just above its base, and the shoulder line beside it
_P = [body.matrix_world @ v.co for v in body.data.vertices]
_top = max(p.z for p in _P)
neckR = max(abs(p.x) for p in _P if _top - 0.035 * s < p.z < _top - 0.005)  # the neck tube where the head file takes over
_mz = min((neckz + J['Head'].z) / 2, _top - 0.01)
_nk = [abs(p.x) for p in _P if abs(p.z - _mz) < 0.006]
_tw = [abs(p.x) for p in _P if abs(p.z - (_top - 0.005)) < 0.004]
neckR = max(_tw) if _tw else neckR  # the neck tube's own half-width at its top, before it flares into the trapezius
NW = (neckR + 0.022) / s
print('JZ', {k: round(J[k].z, 3) for k in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head')}, 'neckR', round(neckR, 3))  # half-width of the neck opening; outside it the straps run over the shoulder
_sh = [p.z for p in _P if NW * s < abs(p.x) < xstrap and p.z < neckz + 0.08 * s]
shz = (max(_sh) + 0.012 * s) if _sh else _top + 0.01  # the shoulder's own top: straps lie on it, never ride up the neck tube
capz = _top + 0.01  # straps run up and over until this body's own edge  # over the shoulder top; the neck line when this body splits there
print('NECK', round(neckR, 3), 'cap', round(capz, 3))
def necklim(x, y):  # a U scoop, deep in front, shallow at the back
    u = ((x - J['Neck'].x) ** 2 + ((y - J['Neck'].y) * 1.15) ** 2) ** 0.5 / (NW * s)  # round, around the neck's own axis
    if u >= 1: return neckz + (0.035 + 0.02 * min(1.0, (u - 1) * 2)) * s  # a crew collar: the trapezius stays covered, the neck tube above stays bare
    front = max(0.0, min(1.0, (sy - y) / (0.06 * s) + 0.5))
    depth = (0.01 + 0.035 * front) * s * NECKD
    return neckz + 0.035 * s - depth * (1 - u * u) ** 0.5
me = body.data
CUFF = float(os.environ.get('CUFF', '0.92')); WAIST = float(os.environ.get('WAIST', '0.03'))
waistz = J['Spine'].z + WAIST * s
BIB = float(os.environ.get('BIB', '0'))
def cuff(p):
    side = 'Left' if p.x > 0 else 'Right'
    K, A = J[side + 'Leg'], J[side + 'Foot']
    if CUFF >= 0: z = K.z + (A.z - K.z) * CUFF
    else: U = J[side + 'UpLeg']; z = K.z + (U.z - K.z) * -CUFF
    return p.z - z
if os.environ.get('DBG'):
    sy0=sy
    for zz in [1.47,1.45,1.43,1.41,1.39,1.37,1.35,1.33,1.31,1.29,1.27,1.25]:
        row=''
        for i in range(0,16):
            x=i*0.01
            c=[p for p in _P if abs(p.x-x)<0.005 and abs(p.z-zz)<0.01 and p.y>sy0+0.02]
            if not c: row+=' '; continue
            p=max(c,key=lambda p:p.y)
            v=min(p.z-hem, armlim(p.z)-abs(p.x), necklim(p.x,p.y)-p.z)
            row+='#' if v>0 else ('a' if armlim(p.z)-abs(p.x)<=0 else 'n')
        print('ROW',zz,row)
    print('neckz',neckz,'sy',sy,'NW',NW*s,'shz',shz,'xstrap',xstrap)
M = body.matrix_world.copy(); Mi = M.inverted(); R = Mi.to_3x3()
W = lambda co: M @ co   # the tests run in world space (glTF bodies sit under a rotated armature)
bm = bmesh.new(); bm.from_mesh(me)
def cut(co, no): bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Mi @ Vector(co), plane_no=(R @ Vector(no)).normalized())
# clean cut lines: bisect along the hem, both armholes and a fan of planes for the scoop
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=4e-4)  # the mirrored halves meet at x=0: weld, or the push opens a seam down the spine
sk = bm.verts.layers.shape; keys = list(sk.keys())
# a coarse body (the male base) has faces wider than a strap: a cut through one deletes it whole and the strap floats off the back panel. Split the upper body finer first.
_up = [e for e in bm.edges if max(W(v.co).z for v in e.verts) < (neckz + 0.06 * s if BIB > 0 else waistz + 0.05 * s) and min(W(v.co).z for v in e.verts) > J['LeftFoot'].z]
bmesh.ops.subdivide_edges(bm, edges=_up, cuts=1, use_grid_fill=True)
if BIB > 0:
    _up2 = [e for e in bm.edges if min(W(v.co).z for v in e.verts) > waistz - 0.03 * s and max(W(v.co).z for v in e.verts) < neckz + 0.06 * s]
    bmesh.ops.subdivide_edges(bm, edges=_up2, cuts=2, use_grid_fill=True)
def F(co):  # >0 inside the garment, the cut is its zero line (a contour, so every edge is drawn, not stepped)
    p = W(co)
    top = waistz
    if BIB > 0:  # overalls: a bib up the front to the chest, straps over each shoulder to the back
        fr = J['Spine'].y - p.y  # >0 in front of the spine
        bx = 0.085 * s
        if fr > -0.01 * s and abs(p.x) < bx: top = J['Spine2'].z + BIB * s
        sx = abs(abs(p.x) - 0.07 * s)
        if sx < 0.028 * s: top = neckz + 0.05 * s  # the strap runs up over the shoulder top
    return min(top - p.z, cuff(p))
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
feather = {0: 1.0, 1: 1.0, 2: 1.0}  # a tee's hem stands off like the rest (no taper back to the skin): the lip below closes it
AT = {v: (0.0 if True else armt(W(v.co)) if abs(W(v.co).x) > xpit * 0.85 else 0.0) for v in bm.verts}
def coords(layer): return {v: (v[layer].copy() if layer is not None else v.co.copy()) for v in bm.verts}
def normals(C):
    n = {v: Vector() for v in bm.verts}
    for f in bm.faces:
        vs = f.verts; c = [C[v] for v in vs]; fn = Vector()
        for i in range(len(c)): fn += c[i].cross(c[(i + 1) % len(c)])
        for v in vs: n[v] += fn
    out = {v: (x.normalized() if x.length > 1e-12 else Vector((0, 0, 1))) for v, x in n.items()}
    M3 = M.to_3x3()
    for v, x in out.items():  # leg parts come wound either way: the push always points away from the leg's own bone line
        q = W(C[v])
        side = 'Left' if q.x > 0 else 'Right'
        best = None
        for a_, b_ in ((J[side + 'UpLeg'], J[side + 'Leg']), (J[side + 'Leg'], J[side + 'Foot']), (J['Hips'], J['Spine'])):
            d = b_ - a_; t = max(0.0, min(1.0, (q - a_).dot(d) / d.length_squared)); c = a_ + d * t
            if best is None or (q - c).length < (q - best).length: best = c
        if (M3 @ x).dot(q - best) < 0: out[v] = -x
    return out
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
    C = {v: C[v] + N[v] * (T + FLARE * AT[v]) * feather.get(ring.get(v, 9), 1.0) for v in bm.verts}
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
for _m in list(bpy.data.materials):
    if _m.name.startswith('cloth_'): _m.name = 'old_' + _m.name  # the body file carries cloth_* slots: free the name or ours exports as .001
me.materials.clear(); me.materials.append(bpy.data.materials.new('cloth_bottom'))
me.materials[0].name = 'cloth_bottom'
print('TEE', len(me.vertices), 'hem', round(hem, 3), 'strap', round(xstrap, 3), 'pit', round(xpit, 3), round(zpit, 3), 'keys', keys)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_skins=True, export_morph=True, export_animations=False, export_apply=False)
