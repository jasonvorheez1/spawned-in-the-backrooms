# Nov 16 (Shelly "then readjust all clothing type fits"): one pass over every Tripo garment on the CURRENT bodies (cheek-filled).
# Measures each garment vertex against the skin at rest: inside the body (clipping) or floating far off it. Any vertex inside or
# closer than MARGIN is pushed out along the skin normal to MARGIN; weights, UVs, slots stay. Exports only garments that moved.
# blender -b -P fit-pass.py -- <f|m> <dir>   -> <dir>/out/<name>_<sex>.glb + <dir>/report_<sex>.json
import bpy, sys, os, glob, json
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index("--") + 1:]; SEX, D = A
MARGIN = 0.004   # 4 mm over the fur: Savi's pick
os.makedirs(f"{D}/out", exist_ok=True)
rep = {}
for f in sorted(glob.glob(f"{D}/g_*_{SEX}.glb")):
    name = os.path.basename(f)[2:-6]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{D}/body-{SEX}.glb")
    base = set(bpy.data.objects)
    for o in base:
        if o.type == "ARMATURE": o.data.pose_position = "REST"
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    bodies = [o for o in base if o.type == "MESH"]
    body = max(bodies, key=lambda o: len(o.data.vertices))
    bev = body.evaluated_get(dg); bm = bev.to_mesh()
    verts = [body.matrix_world @ v.co for v in bm.vertices]
    bvh = BVHTree.FromPolygons(verts, [p.vertices[:] for p in bm.polygons])
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in base]
    for o in new:
        if o.type == "ARMATURE": o.data.pose_position = "REST"
    bpy.context.view_layer.update()
    tot = inside = near = moved = 0; deep = 0.0; far = []
    for o in new:
        if o.type != "MESH": continue
        mw = o.matrix_world; mi = mw.inverted()
        for v in o.data.vertices:
            p = mw @ v.co; loc, nrm, _, dist = bvh.find_nearest(p)
            if loc is None: continue
            tot += 1; sd = (p - loc).dot(nrm)
            far.append(dist)
            if sd < 0: inside += 1; deep = max(deep, -sd)
            elif sd < MARGIN: near += 1
            if sd < MARGIN and dist < 0.06:   # only skin-hugging verts; a brim or lens 6 cm off is left as made
                v.co = mi @ (loc + nrm * MARGIN); moved += 1
    far.sort()
    rep[name] = dict(verts=tot, inside=inside, near=near, moved=moved, deepest_mm=round(deep * 1000, 1),
                     median_gap_mm=round(far[len(far) // 2] * 1000, 1) if far else None)
    if moved:
        bpy.ops.object.select_all(action="DESELECT")
        for o in new: o.select_set(True)
        bpy.context.view_layer.objects.active = next(o for o in new if o.type == "MESH")
        bpy.ops.export_scene.gltf(filepath=f"{D}/out/{name}_{SEX}.glb", use_selection=True, export_skins=True, export_animations=False)
json.dump(rep, open(f"{D}/report_{SEX}.json", "w"), indent=1)
