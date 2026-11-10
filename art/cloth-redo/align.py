# Tripo garment -> the redo body's T-pose: turn, scale, lift the drooped sleeves level (Shelly Nov 10 #177592: remesh, then refit)
# blender -b --factory-startup --python-exit-code 1 --python align.py -- <body.glb> <tripo.glb> <out.glb> <body top name>
import bpy, sys, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; BODY, SRC, OUT, REF = a
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=BODY)
ref = bpy.data.objects[REF]; rp = [ref.matrix_world @ v.co for v in ref.data.vertices]
R = {k: (min(p[i] for p in rp), max(p[i] for p in rp)) for i, k in enumerate('xyz')}
core = [p for p in rp if abs(p.x) < 0.14]; CY = sum(p.y for p in core) / len(core)
print('REF', R)
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
g = next(o for o in bpy.data.objects if o.type == 'MESH'); g.parent = None
bpy.context.view_layer.objects.active = g; g.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = g.data
ps = [v.co.copy() for v in me.vertices]
# sleeves run along the wider horizontal axis: make that X
if (max(p.y for p in ps) - min(p.y for p in ps)) > (max(p.x for p in ps) - min(p.x for p in ps)):
    M = Matrix.Rotation(math.radians(-90), 4, 'Z'); me.transform(M); ps = [v.co.copy() for v in me.vertices]
# front: the body faces -Y; tripo's front faces -Z in glTF = +Y in blender? keep chest bulge on -Y: test neckline depth later by proof
zr = (min(p.z for p in ps), max(p.z for p in ps)); h = zr[1] - zr[0]
s = (R['z'][1] - R['z'][0]) / h
me.transform(Matrix.Scale(s, 4)); ps = [v.co.copy() for v in me.vertices]
torso = [p for p in ps if abs(p.x) < 0.1]
cx = sum(p.x for p in ps) / len(ps); cy = sum(p.y for p in torso) / len(torso)
me.transform(Matrix.Translation(Vector((-cx, CY - cy, R['z'][0] - min(p.z for p in ps)))))
# level the sleeves: past the shoulder, verts turn about the shoulder point onto the body's arm line
SH = 0.15; ARMZ = 1.18
for side in (1, -1):
    vs = [v for v in me.vertices if v.co.x * side > SH + 0.08]
    if not vs: continue
    far = max(vs, key=lambda v: v.co.x * side); piv = Vector((side * SH, CY, ARMZ))
    ang = math.atan2(far.co.z - piv.z, abs(far.co.x - piv.x))
    for v in me.vertices:
        d = v.co.x * side - SH
        if d <= 0: continue
        t = min(1.0, d / 0.08)  # ease in over the shoulder cap
        rot = Matrix.Rotation(-side * ang * t * -1, 4, 'Y')
        v.co = piv + (rot @ (v.co - piv))
    print('sleeve', side, 'droop deg', round(math.degrees(ang), 1))
# sleeve length to the body's
ps = [v.co for v in me.vertices]; span = max(p.x for p in ps)
k = R['x'][1] / span
for v in me.vertices:
    if abs(v.co.x) > SH: v.co.x = math.copysign(SH + (abs(v.co.x) - SH) * ((R['x'][1] - SH) / (span - SH)), v.co.x)
g.name = 'Top_sweater'
for m in me.materials: m.name = 'cloth_top'
ps = [v.co for v in me.vertices]
print('OUT', [round(min(p[i] for p in ps), 3) for i in range(3)], [round(max(p[i] for p in ps), 3) for i in range(3)])
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=False, export_apply=True)
