"""Blender regression: bust clearance at small, medium and large slider settings.
Run with --python check-bust.py -- <folder containing compiled wardrobe GLBs>.
"""
import bpy, bmesh, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

root = Path(sys.argv[sys.argv.index('--') + 1]).resolve()

def surface(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.transform(obj.matrix_world)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    evaluated.to_mesh_clear()
    return tree

for tag in ['f', 'fur_f']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(root / f'body_{tag}_wardrobe.glb'))
    body = bpy.data.objects['Body']
    rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    hip = (rig.matrix_world @ rig.data.bones['Hips'].head_local).z
    neck = 'Neck' if 'Neck' in rig.data.bones else 'neck'
    scale = ((rig.matrix_world @ rig.data.bones[neck].head_local).z - hip) / .51
    key = body.data.shape_keys.key_blocks['Bust']
    peak = max(body.data.vertices, key=lambda v: (key.data[v.index].co - v.co).length)
    height = (body.matrix_world @ peak.co).z
    spread = abs((body.matrix_world @ peak.co).x)
    names = ['Ward_tank', 'Ward_tee', 'Ward_longsleeve', 'Ward_shirt', 'Ward_jacket', 'Ward_hoodie', 'Ward_dress']
    if bpy.data.objects.get('Under_top'):
        names.append('Under_top')
    for name in names:
        assert bpy.data.objects[name].data.shape_keys.key_blocks['Bust'].value == key.value, f'{tag} {name}: default bust differs from body'
    if tag == 'f':
        neck_skin = bpy.data.objects['Skin_neck']
        neck_key = neck_skin.data.shape_keys.key_blocks['Bust']
        used = {i for polygon in neck_skin.data.polygons for i in polygon.vertices}
        assert max((neck_key.data[i].co - neck_skin.data.vertices[i].co).length for i in used) < .018, 'Breast surface was exposed as neck skin'
    for bust in [.15, .5, 1.0]:
        for obj in bpy.data.objects:
            if obj.type == 'MESH' and obj.data.shape_keys and 'Bust' in obj.data.shape_keys.key_blocks:
                obj.data.shape_keys.key_blocks['Bust'].value = bust
        bpy.context.view_layer.update()
        skin = surface(body)
        for name in names:
            cloth = surface(bpy.data.objects[name])
            clearances = []
            for x in [-1.15 * spread, -.8 * spread, .8 * spread, 1.15 * spread]:
                for dz in [-.02, 0, .02]:
                    origin = Vector((x, -2, height + dz * scale))
                    a = skin.ray_cast(origin, Vector((0, 1, 0)))[0]
                    b = cloth.ray_cast(origin, Vector((0, 1, 0)))[0]
                    assert a is not None and b is not None, f'{tag} {name}: missing bust coverage'
                    clearances.append(a.y - b.y)
            assert min(clearances) > -.002, f'{tag} {name} Bust={bust}: penetrates chest by {-min(clearances):.4f} m'
        print('PASS: bust coverage', tag, bust, flush=True)
