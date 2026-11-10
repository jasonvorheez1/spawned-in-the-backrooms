# Shelly Nov 10 ("if im on the new body then you did a horrid job"): the tank's shoulders stood up off the arm when the arms came down.
# The garments kept the OLD body's weights; this gives each top the body's own skin weights (nearest face, interpolated), smoothed,
# so cloth follows exactly the skin under it. Proof: arms lowered 62 deg, body + garment on one rig.
# blender -b --factory-startup --python-exit-code 1 --python weights.py -- <body.glb> <out dir> <proof png prefix|-> <garment.glb>...
import bpy, sys, os, math
from mathutils import Vector
a = sys.argv[sys.argv.index('--') + 1:]; BODY, OUT, PROOF, FILES = a[0], a[1], a[2], a[3:]
def load_body():
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=BODY)
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    skins = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Skin_')]
    for o in bpy.data.objects:
        if o.type == 'MESH' and o not in skins and o.name != 'Head': o.hide_render = True; o.hide_viewport = True
    bpy.ops.object.select_all(action='DESELECT')
    cps = []
    for s in skins:
        c = s.copy(); c.data = s.data.copy(); c.shape_key_clear() if c.data.shape_keys else None
        bpy.context.scene.collection.objects.link(c); cps.append(c)
    for c in cps:
        c.select_set(True)
        for m in list(c.modifiers): c.modifiers.remove(m)
    bpy.context.view_layer.objects.active = cps[0]; bpy.ops.object.join(); src = cps[0]; src.name = 'SRC'; src.hide_render = True
    return rig, src
for f in FILES:
    rig, src = load_body()
    pre = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f); new = set(bpy.data.objects) - pre
    grig = next((o for o in new if o.type == 'ARMATURE'), None)
    for o in new:
        if o.type != 'MESH' or len(o.data.vertices) < 60: continue
        for b in rig.data.bones:
            if b.name not in o.vertex_groups: o.vertex_groups.new(name=b.name)
        sk = o.data.shape_keys; vals = None
        if sk: vals = {k.name: k.value for k in sk.key_blocks}
        bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        m = o.modifiers.new('dt', 'DATA_TRANSFER'); m.object = src; m.use_object_transform = True
        m.use_vert_data = True; m.data_types_verts = {'VGROUP_WEIGHTS'}; m.vert_mapping = 'POLYINTERP_NEAREST'
        m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'
        o.modifiers.move(len(o.modifiers) - 1, 0)
        if sk:  # apply a modifier on a shape-keyed mesh: data transfer only touches groups, so do it via a temp copy's groups
            tmp = o.copy(); tmp.data = o.data.copy(); bpy.context.scene.collection.objects.link(tmp); tmp.shape_key_clear()
            for mm in list(tmp.modifiers):
                if mm.name != 'dt': tmp.modifiers.remove(mm)
            bpy.context.view_layer.objects.active = tmp; bpy.ops.object.modifier_apply(modifier='dt')
            o.modifiers.remove(m)
            for g in o.vertex_groups: 
                tg = tmp.vertex_groups.get(g.name)
                g.remove(list(range(len(o.data.vertices))))
                if tg is None: continue
            idx = {g.name: g.index for g in tmp.vertex_groups}
            for v in tmp.data.vertices:
                for ge in v.groups:
                    nm = tmp.vertex_groups[ge.group].name
                    if ge.weight > 1e-4: o.vertex_groups[nm].add([v.index], ge.weight, 'REPLACE')
            bpy.data.objects.remove(tmp)
        else:
            for g in o.vertex_groups: g.remove(list(range(len(o.data.vertices))))
            bpy.ops.object.modifier_apply(modifier='dt')
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=3)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        for g in list(o.vertex_groups):
            if not any(g.index in [x.group for x in v.groups] for v in o.data.vertices[:0]): pass
        print('W', os.path.basename(f), o.name, flush=True)
    # export the garment alone (its own armature, as it came)
    bpy.ops.object.select_all(action='DESELECT')
    for o in new: o.select_set(o.type in ('ARMATURE', 'MESH'))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, os.path.basename(f)), use_selection=True, export_apply=False, export_animations=False, export_morph=True, export_morph_normal=True, export_skins=True)
    if PROOF != '-':
        for o in new:
            if o.type == 'MESH':
                for mm in o.modifiers:
                    if mm.type == 'ARMATURE': mm.object = rig
        for o in new:
            if o.type == 'MESH' and len(o.data.vertices) < 60: o.hide_render = True
        for side, sg in (('Left', -1), ('Right', 1)):
            pb = rig.pose.bones.get(side + 'Arm')
            if pb: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
        # lower each arm about the body's front axis in world space
        bpy.context.view_layer.update()
        for side, sg in (('Left', 1), ('Right', -1)):
            pb = rig.pose.bones.get(side + 'Arm')
            if not pb: continue
            from mathutils import Matrix
            pivot = rig.matrix_world @ pb.head
            R = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(62) * sg, 4, 'Y') @ Matrix.Translation(-pivot)
            pb.matrix = rig.matrix_world.inverted() @ R @ rig.matrix_world @ pb.matrix
            bpy.context.view_layer.update()
        sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.render.resolution_x = 600; sc.render.resolution_y = 600
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.25, .25, .27, 1)
        for loc, e in (((2, -3, 3), 3), ((-3, 2, 2), 2), ((0, 3, 2), 2)):
            l = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); l.data.energy = e; sc.collection.objects.link(l); l.rotation_euler = (Vector((0, 0, 1)).rotation_difference(Vector(loc).normalized())).to_euler()
        cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
        for i, p in enumerate([(0, -1.5, 1.15), (1.5, 0, 1.15), (1.0, -1.1, 1.25)]):
            cam.location = p; cam.rotation_euler = (Vector((0, 0, 1.1)) - Vector(p)).to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = f'{PROOF}_{os.path.basename(f)[:-4]}_{i}.png'; bpy.ops.render.render(write_still=True)
