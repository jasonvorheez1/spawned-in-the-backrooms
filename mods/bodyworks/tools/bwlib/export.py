"""EXPORT: one .glb with the rig, the T0 zone meshes (named by zone: hide one by part name) and every T1 cage segment (named
cage_<segment>, skinned to the same rig), ready to upload and place; bodyworks.json + capsules.json beside it."""
import bpy, os

def run(body, ZONES, CAGES, DOC, a):
    bpy.ops.object.select_all(action='DESELECT')
    keep = [body.arm] + list(ZONES.values()) + ([ob for ob, _ in CAGES['cage'].values()] if CAGES else [])
    for o in keep: o.select_set(True)
    path = os.path.join(a.out, DOC['name'] + '-bodyworks.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                              export_morph=True, export_apply=False)
    DOC['export'] = {'glb': os.path.basename(path), 'zones': list(ZONES), 'cages': ['cage_' + n for n in (CAGES['cage'] if CAGES else {})],
                     'MB': round(os.path.getsize(path) / 1e6, 2)}
    print('BODYWORKS export ->', path, DOC['export']['MB'], 'MB')
