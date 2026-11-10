"""Neck weights (Nov 10, Shelly "the neck is off"): the head mesh's whole neck was 100% on the Head bone while the body's
neck ring rides Neck/Spine2, so every idle nod swung the head's neck off the collar as a rigid post. Head_Skin vertices
below the Head joint now blend Head -> Neck across the joint and take Spine2 at the base, matching the body's ring.
Positions don't move. Usage: blender -b --python-exit-code 1 -P neck_weights.py -- in.glb out.glb [proof.png]"""
import bpy, sys, math, mathutils
a = sys.argv[sys.argv.index('--') + 1:]; src, out = a[0], a[1]; proof = a[2] if len(a) > 2 else None
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bz = lambda n: (arm.matrix_world @ arm.data.bones[n].head_local).z
jz, nz = bz('Head'), bz('Neck')
def ss(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
H = bpy.data.objects['Head']; mw = H.matrix_world
vg = {n: (H.vertex_groups.get(n) or H.vertex_groups.new(name=n)) for n in ('Head', 'Neck', 'Spine2')}
n = 0
for v in H.data.vertices:
    z = (mw @ v.co).z
    if z >= jz + 0.03: continue
    head = ss(jz - 0.03, jz + 0.03, z)            # 1 above the jaw line, 0 down the neck
    sp = (1 - head) * 0.3 * (1 - ss(nz, nz + 0.07, z))   # the base shares Spine2 like the body's ring
    neck = 1 - head - sp
    for g in list(v.groups): H.vertex_groups[g.group].remove([v.index])
    for name, w in (('Head', head), ('Neck', neck), ('Spine2', sp)):
        if w > 1e-3: vg[name].add([v.index], w, 'REPLACE')
    n += 1
print('NECKW joint', round(jz, 3), 'neck', round(nz, 3), 'verts', n)
if proof:  # bend check: neck and head pitched forward 20 deg each, side view, the seam must hold
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 8; sc.render.resolution_x = sc.render.resolution_y = 500
    for o in bpy.data.objects:
        if o.type == 'MESH' and not (o.name in ('Head', 'Body') or o.name.startswith('Skin_')): o.hide_render = True
    for b in ('Neck', 'Head'):
        pb = arm.pose.bones[b]; pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(20), 0, 0)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    ld = bpy.data.lights.new('l', 'SUN'); lo = bpy.data.objects.new('l', ld); sc.collection.objects.link(lo); lo.rotation_euler = (0.8, 0, 0.6); ld.energy = 3
    cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 0.5; cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
    files = []
    for nm, pos in (('side', (2, 0, jz)), ('q', (1.4, -1.4, jz))):
        cam.location = pos; cam.rotation_euler = (mathutils.Vector((0, 0, jz)) - mathutils.Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        f = f'/tmp/nw_{nm}.png'; sc.render.filepath = f; bpy.ops.render.render(write_still=True); files.append(f)
    import subprocess; subprocess.run(['montage', *files, '-tile', '2x1', '-geometry', '+2+2', proof])
    for b in ('Neck', 'Head'): arm.pose.bones[b].rotation_euler = (0, 0, 0)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
