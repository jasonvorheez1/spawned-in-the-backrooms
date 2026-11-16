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
    verts, polys = [], []   # the skin is Body + Head (the placeholder Icosphere is no skin)
    for body in [o for o in base if o.type == "MESH" and o.name in ("Body", "Head")]:
        bm = body.evaluated_get(dg).to_mesh(); n = len(verts)
        verts += [body.matrix_world @ v.co for v in bm.vertices]; polys += [[i + n for i in p.vertices] for p in bm.polygons]
    bvh = BVHTree.FromPolygons(verts, polys)
    bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in base]
    for o in new:
        if o.type == "ARMATURE": o.data.pose_position = "REST"
    bpy.context.view_layer.update()
    tot = inside = near = moved = 0; deep = 0.0; far = []
    import numpy as np
    for o in new:
        if o.type != "MESH" or o.name.startswith("Icosphere"): continue
        mw = o.matrix_world; mi = mw.inverted(); n = len(o.data.vertices)
        PU = np.zeros((n, 3)); fixed = np.zeros(n, bool)
        for v in o.data.vertices:
            p = mw @ v.co; loc, nrm, _, dist = bvh.find_nearest(p)
            if loc is None: continue
            tot += 1; sd = (p - loc).dot(nrm); far.append(dist)
            if dist > 0.03: continue   # a brim, lens or hem hanging free is not skin contact
            if sd < 0: inside += 1; deep = max(deep, -sd)
            elif sd < MARGIN: near += 1
            if sd < MARGIN: PU[v.index] = (nrm * (MARGIN - sd))[:]; fixed[v.index] = True
        # spread the push a few rings so the cloth bulges smoothly instead of denting into spikes
        E = np.array([e.vertices[:] for e in o.data.edges]) if len(o.data.edges) else np.zeros((0, 2), int)
        for _ in range(6):
            acc = np.zeros((n, 3)); cnt = np.zeros(n)
            np.add.at(acc, E[:, 0], PU[E[:, 1]]); np.add.at(acc, E[:, 1], PU[E[:, 0]])
            np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
            avg = acc / np.maximum(cnt, 1)[:, None] * 0.7
            take = (~fixed) & (np.linalg.norm(avg, axis=1) > np.linalg.norm(PU, axis=1))
            PU[take] = avg[take]
        mv = np.linalg.norm(PU, axis=1) > 1e-5; moved += int(mv.sum())
        if os.environ.get("WRITE"):
            R = mi.to_3x3()
            for i in np.nonzero(mv)[0]:
                v = o.data.vertices[int(i)]; v.co = mi @ ((mw @ v.co) + __import__("mathutils").Vector(PU[i]))
    far.sort()
    rep[name] = dict(verts=tot, inside=inside, near=near, moved=moved, deepest_mm=round(deep * 1000, 1),
                     median_gap_mm=round(far[len(far) // 2] * 1000, 1) if far else None)
    if moved and os.environ.get("WRITE"):
        bpy.ops.object.select_all(action="DESELECT")
        for o in new: o.select_set(True)
        bpy.context.view_layer.objects.active = next(o for o in new if o.type == "MESH")
        bpy.ops.export_scene.gltf(filepath=f"{D}/out/{name}_{SEX}.glb", use_selection=True, export_skins=True, export_animations=False)
json.dump(rep, open(f"{D}/report_{SEX}.json", "w"), indent=1)
