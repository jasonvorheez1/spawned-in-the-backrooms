"""Jeans tucked into boots (Nov 11): the straight jeans leg is wider than the boot shaft, so its hem poked out mid-stride.
This cut pulls each leg inside the boot's wall (CLEAR inside it) below the boot top, fading back to the open leg over FADE above it.
Worn only with boots (critter-model wardChildren picks Ward_<n>_tuck when the shoes are boots).
Usage: jeans_tuck.py jeans.glb boots.glb out.glb [clear] [fade]"""
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index('--') + 1:]
jsrc, bsrc, out = a[:3]; CLEAR = float(a[3]) if len(a) > 3 else 0.006; FADE = float(a[4]) if len(a) > 4 else 0.05
NA = 36
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=bsrc)
B = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
bm = [m.name for m in B.data.materials]; bp = [B.matrix_world @ v.co for v in B.data.vertices]
shell = set()
for f in B.data.polygons:
    if not bm or bm[f.material_index] != 'button': shell.update(f.vertices)
samp = []
for e in B.data.edges:
    if e.vertices[0] in shell and e.vertices[1] in shell:
        p0, p1 = bp[e.vertices[0]], bp[e.vertices[1]]; n = max(1, int((p1 - p0).length / 0.006))
        samp += [p0.lerp(p1, i / n) for i in range(n + 1)]
TOP = max(p.z for p in bp)
AX = {}
for s in (1, -1):
    up = [p for p in samp if p.x * s > 0 and p.z > TOP - 0.03]
    AX[s] = mathutils.Vector(((min(p.x for p in up) + max(p.x for p in up)) / 2, (min(p.y for p in up) + max(p.y for p in up)) / 2, 0))
def polar(p):
    s = 1 if p.x >= 0 else -1; c = AX[s]; dx, dy = p.x - c.x, p.y - c.y
    return s, dx, dy, math.hypot(dx, dy), int((math.atan2(dy, dx) + math.pi) / (2 * math.pi / NA)) % NA
wall = {}  # innermost boot wall radius per side, 1 cm band, angle
for p in samp:
    if p.z < 0.1: continue
    s, dx, dy, r, ai = polar(p); k = (s, int(p.z / 0.01), ai)
    if r > 0.02: wall[k] = min(wall.get(k, 9), r)
def wall_at(s, z, ai):
    zi = int(min(z, TOP - 0.005) / 0.01)
    for dz in (0, -1, 1, -2, 2):
        v = [wall.get((s, zi + dz, (ai + da) % NA)) for da in (0, -1, 1)]; v = [x for x in v if x]
        if v: return min(v)
    return None
print("TOP", round(TOP, 3), "AX", {s: (round(c.x, 3), round(c.y, 3)) for s, c in AX.items()})
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=jsrc)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
J = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Ward_')][0]
mw = J.matrix_world; inv = mw.inverted(); jp = [mw @ v.co for v in J.data.vertices]
delta = {}; worst = 0
for i, p in enumerate(jp):
    if p.z > TOP + FADE: continue
    s, dx, dy, r, ai = polar(p)
    if r < 1e-4: continue
    wr = wall_at(s, p.z, ai)
    if not wr: continue
    deep = min(1, max(0, (TOP - 0.03 - p.z) / 0.06))  # lower in the shaft the leg is wrapped tighter: the foot bends the boot there and the hem flicked out
    want = max(0.028, wr - CLEAR - 0.022 * deep)
    if r <= want: continue
    t = 1.0 if p.z <= TOP else 1 - (p.z - TOP) / FADE; t = t * t * (3 - 2 * t)
    k = 1 + (want / r - 1) * t; worst = max(worst, r - want)
    delta[i] = (dx * (k - 1), dy * (k - 1))
def apply(rows):
    for i, (ddx, ddy) in delta.items():
        w = mw @ rows[i].co; w.x += ddx; w.y += ddy; rows[i].co = inv @ w
if J.data.shape_keys:
    for kb in J.data.shape_keys.key_blocks: apply(kb.data)
else: apply(J.data.vertices)
# below the shaft's top the leg is hidden in the boot: its faces go, so a hem that rides the foot's weights cannot flick out through the leather
import bmesh
bmj = bmesh.new(); bmj.from_mesh(J.data); bmj.verts.ensure_lookup_table()
cut = TOP - 0.035
dead = [f for f in bmj.faces if all((mw @ v.co).z < cut for v in f.verts)]
bmesh.ops.delete(bmj, geom=dead, context='FACES'); bmj.to_mesh(J.data); bmj.free()
print("CUT", len(dead), "faces below", round(cut, 3))
print("TUCKED", len(delta), "of", len(jp), "pulled in up to", round(worst, 3), "m")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
