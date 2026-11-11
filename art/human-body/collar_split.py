"""Collar split (Nov 11): under a long-sleeve shirt the whole torso skin stayed drawn so its open neck wouldn't show a hole,
and that skin poked through the shoulders and under scarves as jagged teeth. This cuts the torso faces the shirt does NOT cover
(the skin seen through its neckline) into their own part, Skin_collar, so the code can hide the rest under the shirt.
Usage: -- body.glb shirt.glb zlo out.glb"""
import bpy, bmesh, sys
from mathutils.bvhtree import BVHTree
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; bodyf, shirtf, zlo, out = a[0], a[1], float(a[2]), a[3]; XW = float(a[4]) if len(a) > 4 else 0.085
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=shirtf)
sh = [o for o in bpy.data.objects if o.type == 'MESH']
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for o in sh:
    t = bmesh.new(); t.from_object(o, dg); t.transform(o.matrix_world); m = bpy.data.meshes.new('t'); t.to_mesh(m); bm.from_mesh(m)
tree = BVHTree.FromBMesh(bm)
for o in sh: bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=bodyf)
to = bpy.data.objects['Skin_torso']; mw = to.matrix_world
sel = 0
for p in to.data.polygons:
    c = mw @ p.center; n = (mw.to_3x3() @ p.normal).normalized()
    hit = tree.ray_cast(c + n * 0.002, n, 0.08)[0] or tree.find_nearest(c, 0.012)[0]
    p.select = (c.z > zlo and abs(c.x) < 0.14)  # the neckline band, copied whole; its shoulder edge is tucked below
    sel += p.select
KEEP = {p.index for p in to.data.polygons if p.select}
for o in bpy.context.selected_objects: o.select_set(False)
bpy.context.view_layer.objects.active = to; to.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(use_extend=False, type='FACE')
eb = bmesh.from_edit_mesh(to.data); eb.faces.ensure_lookup_table()
for f in eb.faces: f.select_set(False)
for f in eb.faces:
    if f.index in KEEP: f.select_set(True)
eb.select_flush_mode(); bmesh.update_edit_mesh(to.data)
bpy.ops.mesh.duplicate(); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
new = [o for o in bpy.context.selected_objects if o is not to][0]; new.name = 'Skin_collar'; new.data.name = 'Skin_collar'
nw = new.matrix_world; inv = nw.inverted()
new.data.calc_normals_split() if hasattr(new.data, 'calc_normals_split') else None
bas = new.data.shape_keys.key_blocks if new.data.shape_keys else None
for i, v in enumerate(new.data.vertices):
    w = nw @ v.co; t = min(1.0, max(0.0, (abs(w.x) - XW) / 0.03))  # 0 at the neck, 1 out at the shoulder
    if t <= 0: continue
    n = (nw.to_3x3() @ v.normal).normalized(); d = inv.to_3x3() @ (-n * 0.022 * t + Vector((0, 0, -0.012 * t)))
    v.co += d
    if bas:
        for kb in bas: kb.data[i].co += d
print('COLLAR', sel, len(new.data.vertices), round(min((new.matrix_world @ v.co).z for v in new.data.vertices), 3))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_morph=True, export_apply=False, export_animations=False, export_yup=True)
