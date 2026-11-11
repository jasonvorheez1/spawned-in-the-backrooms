"""Neck shorten (Nov 11, Shelly: "anything on the body you can fix?" -> the neck read as a long thin stalk from the side).
Everything from the jaw up (head, face, brows, beards, blush, the body's own eyewear and hats) drops by D; the neck between its
base and the jaw compresses smoothly (0 at base+2 cm, full at the Head joint). Shape keys get the same field from their basis
position, so face and head-type keys keep their deltas. The Head bone and everything under it drops by D; the Neck tail with it.
Split garments (hair, hats, glasses) ride the Head bone, so they drop with it.
Usage: blender -b --python-exit-code 1 -P neck_short.py -- in.glb out.glb D [proof.png]"""
import bpy, sys, math
a = sys.argv[sys.argv.index('--') + 1:]; src, out, D = a[0], a[1], float(a[2]); proof = a[3] if len(a) > 3 else None
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
R = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); RW = R.matrix_world
z0 = (RW @ R.data.bones['Neck'].head_local).z + 0.02; z1 = (RW @ R.data.bones['Head'].head_local).z
def ss(x): t = max(0.0, min(1.0, (x - z0) / (z1 - z0))); return t * t * (3 - 2 * t)
import os
K = float(os.environ.get('THICK', '1.0'))      # front-back/side growth of the neck column, peaking mid-neck, nothing at base or jaw
cy = (RW @ R.data.bones['Neck'].head_local).y
def bump(z): t = max(0.0, min(1.0, (z - z0) / (z1 - z0))); return math.sin(t * math.pi)
def f(p): return 0.0 if abs(p.x) > 0.16 else D * ss(p.z)
def g(p):
    if abs(p.x) > 0.07 or abs(p.y - cy) > 0.08 or p.z < z0 or p.z > z1: return 1.0
    return 1.0 + (K - 1.0) * bump(p.z)
n = 0
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    mw = o.matrix_world; inv = mw.inverted(); me = o.data
    base = [mw @ v.co for v in me.vertices]; dz = [f(p) for p in base]; gk = [g(p) for p in base]
    if not any(dz) and all(k == 1.0 for k in gk): continue
    from mathutils import Vector
    def mv(q, i): k = gk[i]; return Vector((q.x * k, cy + (q.y - cy) * k, q.z - dz[i]))
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i, d in enumerate(dz):
                if d or gk[i] != 1.0: kb.data[i].co = inv @ mv(mw @ kb.data[i].co, i)
    else:
        for i, d in enumerate(dz):
            if d or gk[i] != 1.0: me.vertices[i].co = inv @ mv(base[i], i)
    me.update(); n += 1
bpy.context.view_layer.objects.active = R; bpy.ops.object.mode_set(mode='EDIT')
from mathutils import Vector
L = R.matrix_world.inverted().to_3x3() @ Vector((0, 0, -D))
eb = R.data.edit_bones; H = eb['Head']; moved = [H] + list(H.children_recursive)
for b in moved: b.head += L; b.tail += L
eb['Neck'].tail = H.head.copy()
bpy.ops.object.mode_set(mode='OBJECT')
print('NECK', round(z0, 3), round(z1, 3), 'D', D, 'meshes', n, 'bones', len(moved))
if proof:
    for o in bpy.data.objects:
        if o.type == 'MESH' and not (o.name in ('Body', 'Head') or o.name.startswith('Skin_') or o.name == 'Top_tee'): o.hide_render = True
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 500; sc.render.resolution_y = 600
    c = bpy.data.cameras.new('c'); c.lens = 85; ob = bpy.data.objects.new('c', c); sc.collection.objects.link(ob)
    ob.location = (0.9, cy, z1 - 0.02); ob.rotation_euler = (math.radians(90), 0, math.radians(90)); sc.camera = ob
    sc.render.filepath = proof; bpy.ops.render.render(write_still=True)
bpy.ops.export_scene.gltf(filepath=out, export_apply=False, export_animation_mode='ACTIONS', export_morph=True, export_skins=True)
