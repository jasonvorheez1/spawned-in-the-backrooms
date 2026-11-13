# blender -b --python fitcheck.py -- <body.glb> <garment.glb> <label> : garment points under the skin, at rest and in three poses
import bpy, sys, math, json
import numpy as np
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a[0]); armname = next(o.name for o in bpy.data.objects if o.type == 'ARMATURE')
for nm in [o.name for o in bpy.data.objects if o.type == 'MESH' and o.name != 'Body' and not o.name.startswith('Head')]: bpy.data.objects.remove(bpy.data.objects[nm])
have = set(o.name for o in bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=a[1])
newn = [o.name for o in bpy.data.objects if o.name not in have]
arm = bpy.data.objects[armname]; body = bpy.data.objects['Body']
garn = [nm for nm in newn if bpy.data.objects[nm].type == 'MESH' and not nm.startswith('Icosphere')]
for nm in garn:
    o = bpy.data.objects[nm]; mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for m in o.modifiers:
        if m.type == 'ARMATURE': m.object = arm
for nm in newn:
    if nm not in garn and nm in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[nm])
for nm in [o.name for o in bpy.data.objects if o.name.startswith('Icosphere')]: bpy.data.objects.remove(bpy.data.objects[nm])
gar = [bpy.data.objects[nm] for nm in garn]
for o in bpy.data.objects:
    if o.type == 'MESH' and o.data.shape_keys:
        for k in o.data.shape_keys.key_blocks[1:]: k.value = 0   # the game sets every key itself; the file's default weights are not a look
pb = arm.pose.bones
def reset():
    for b in pb: b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
def bend(name, ax, deg):
    b = pb['mixamorig:' + name]; M = (arm.matrix_world @ b.matrix).to_3x3()
    b.rotation_quaternion = Quaternion((M.inverted() @ Vector(ax)).normalized(), math.radians(deg)) @ b.rotation_quaternion
    bpy.context.view_layer.update()
POSES = {'rest': [], 'walk': [('LeftArm', (0, 1, 0), 70), ('RightArm', (0, 1, 0), -70), ('LeftUpLeg', (1, 0, 0), -35), ('RightUpLeg', (1, 0, 0), 25), ('RightLeg', (1, 0, 0), 40)],
         'reach': [('LeftArm', (0, 1, 0), 55), ('LeftArm', (0, 0, 1), -60), ('RightArm', (0, 1, 0), -55), ('RightArm', (0, 0, 1), 60), ('LeftForeArm', (0, 0, 1), -70), ('RightForeArm', (0, 0, 1), 70)],
         'sit': [('LeftUpLeg', (1, 0, 0), -80), ('RightUpLeg', (1, 0, 0), -80), ('LeftLeg', (1, 0, 0), 90), ('RightLeg', (1, 0, 0), 90), ('LeftArm', (0, 1, 0), 70), ('RightArm', (0, 1, 0), -70)]}
out = {}
for name, steps in POSES.items():
    reset()
    for s in steps: bend(*s)
    dg = bpy.context.evaluated_depsgraph_get()
    be = body.evaluated_get(dg); bm = be.to_mesh(); bm.transform(body.matrix_world)
    bvh = BVHTree.FromPolygons([v.co.copy() for v in bm.vertices], [tuple(p.vertices) for p in bm.polygons])
    be.to_mesh_clear()
    inside = 0; near = 0; deep = 0
    for o in gar:
        ge = o.evaluated_get(dg); gm = ge.to_mesh()
        for v in gm.vertices:
            p = o.matrix_world @ v.co
            loc, nrm, idx, dist = bvh.find_nearest(p)
            if loc is None or dist > 0.03: continue
            near += 1
            sd = (p - loc).dot(nrm)
            if sd < -0.002: inside += 1
            if sd < -0.008: deep += 1
        ge.to_mesh_clear()
    out[name] = [near, inside, deep]
print('FIT', a[2], json.dumps(out))
