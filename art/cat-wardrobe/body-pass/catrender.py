# blender -b --python catrender.py -- <body.glb> <out_prefix> <keys json> [extra.glb ...] [--pose walk|bend|none] [--views front,side,back] [--zoom head|tail|body]
import bpy, sys, json, math, os
from mathutils import Vector, Euler
a = sys.argv[sys.argv.index('--') + 1:]
opts = {}
pos = []
i = 0
while i < len(a):
    if a[i].startswith('--'): opts[a[i][2:]] = a[i + 1]; i += 2
    else: pos.append(a[i]); i += 1
body, outp, keys = pos[0], pos[1], json.loads(pos[2]); extras = pos[3:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=body)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for e in extras:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=e)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'MESH':
            for m in o.modifiers:
                if m.type == 'ARMATURE': m.object = arm
            o.parent = arm
    for o in new:
        if o.type == 'ARMATURE': bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks[1:]: kb.value = keys.get(kb.name, 0)
# colours
col = {'fur': (0.95, 0.62, 0.32, 1), 'fur2': (1, 0.95, 0.88, 1), 'headFur': (0.95, 0.62, 0.32, 1), 'innerEar': (0.95, 0.6, 0.65, 1), 'earFur': (0.9, 0.55, 0.3, 1), 'earInner': (0.96, 0.55, 0.72, 1), 'earTuft': (1, 0.9, 0.75, 1)}
for m in bpy.data.materials:
    base = m.name.split('.')[0]
    m.diffuse_color = col.get(base, (0.6, 0.6, 0.65, 1))
    m.use_backface_culling = os.environ.get('CULL') == '1'
pose = opts.get('pose', 'none')
pb = arm.pose.bones
def rot(name, x=0, y=0, z=0):
    b = pb.get('mixamorig:' + name)
    if b: b.rotation_mode = 'XYZ'; b.rotation_euler = Euler((math.radians(x), math.radians(y), math.radians(z)))
if pose == 'bend':     # every big joint bent hard: shoulder down and forward, elbow 100, hip flex 70, knee 100, tail swung
    rot('LeftArm', 0, 0, 0); rot('RightArm', 0, 0, 0)
    for s, sg in (('Left', 1), ('Right', -1)):
        rot(s + 'Arm', 40, 0, 0)   # placeholder; tuned below by axis probe
if pose != 'none':
    # bone-local axes differ per rig: bend each joint about the axis that moves its child the most in the asked world direction
    bpy.context.view_layer.update()
    def bend(name, world_axis, deg):
        b = pb.get('mixamorig:' + name)
        if not b: return
        M = (arm.matrix_world @ b.matrix).to_3x3()
        ax = M.inverted() @ Vector(world_axis)
        b.rotation_mode = 'QUATERNION'
        from mathutils import Quaternion
        b.rotation_quaternion = Quaternion(ax.normalized(), math.radians(deg)) @ b.rotation_quaternion
        bpy.context.view_layer.update()
    for n in [k for k in pb.keys()]: pb[n].rotation_mode = 'QUATERNION'; pb[n].rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()
    if pose == 'bend':
        bend('LeftArm', (0, 1, 0), 65); bend('RightArm', (0, 1, 0), -65)     # arms down from T
        bend('LeftArm', (0, 0, 1), -35); bend('RightArm', (0, 0, 1), 35)     # and forward
        bend('LeftForeArm', (0, 0, 1), -95); bend('RightForeArm', (0, 0, 1), 95)
        bend('LeftUpLeg', (1, 0, 0), -70); bend('LeftLeg', (1, 0, 0), 100)
        bend('RightUpLeg', (1, 0, 0), 30); bend('RightLeg', (1, 0, 0), 30)
        bend('Tail1', (0, 0, 1), 30); bend('Tail2', (0, 0, 1), 25)
    if pose == 'walk':
        bend('LeftArm', (0, 1, 0), 72); bend('RightArm', (0, 1, 0), -72)
        bend('LeftArm', (0, 0, 1), -25); bend('RightArm', (0, 0, 1), -25)
        bend('LeftForeArm', (0, 0, 1), -35); bend('RightForeArm', (0, 0, 1), 35)
        bend('LeftUpLeg', (1, 0, 0), -35); bend('LeftLeg', (1, 0, 0), 25)
        bend('RightUpLeg', (1, 0, 0), 25); bend('RightLeg', (1, 0, 0), 45)
scn = bpy.context.scene
scn.render.engine = 'BLENDER_WORKBENCH'
scn.display.shading.light = 'STUDIO'; scn.display.shading.color_type = 'MATERIAL'; scn.display.shading.show_backface_culling = os.environ.get('CULL') == '1'
scn.display.shading.show_cavity = True; scn.display.shading.cavity_type = 'WORLD'
scn.display.shading.show_object_outline = True
scn.render.resolution_x, scn.render.resolution_y = 520, 720
scn.world = bpy.data.worlds.new('w'); scn.world.color = (0.55, 0.56, 0.6)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
pts = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        e = o.evaluated_get(dg); me = e.to_mesh()
        pts += [e.matrix_world @ v.co for v in me.vertices]; e.to_mesh_clear()
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
ctr = (mn + mx) / 2; ext = (mx.z - mn.z) * 1.08
zoom = opts.get('zoom', 'body')
if zoom == 'head': ctr = Vector((ctr.x, ctr.y, mn.z + (mx.z - mn.z) * 0.86)); ext *= 0.5
if zoom == 'tail': ctr = Vector((ctr.x, ctr.y, mn.z + (mx.z - mn.z) * 0.38)); ext *= 0.55
if zoom == 'torso': ctr = Vector((ctr.x, ctr.y, mn.z + (mx.z - mn.z) * 0.45)); ext *= 0.6
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = ext
cam = bpy.data.objects.new('c', cd); scn.collection.objects.link(cam); scn.camera = cam
views = {'front': (0, -1, 0), 'side': (1, 0, 0), 'back': (0, 1, 0), 'q': (0.7, -0.7, 0), 'bq': (-0.6, 0.8, 0.15)}
for v in opts.get('views', 'front,side,back').split(','):
    d = Vector(views[v]).normalized()
    cam.location = ctr + d * 5
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    scn.render.filepath = f'{outp}_{v}.png'
    bpy.ops.render.render(write_still=True)
print('RENDERED', outp)
