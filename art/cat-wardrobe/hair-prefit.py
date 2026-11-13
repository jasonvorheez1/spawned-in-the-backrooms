import os
# A Tripo wig on a grey mannequin -> hair only, retargeted head-to-head onto the cat skull (mannequin skull box mapped to the cat's), ready for hair-rebuild.py.
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/hair-prefit.py -- <raw.glb> <out.glb> <f|m>
import bpy, bmesh, sys
import numpy as np
from mathutils import Vector, Matrix
raw, out, sex = sys.argv[sys.argv.index("--")+1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/catrev/body{sex}.glb")
head = bpy.data.objects["Head"]; kb = head.data.shape_keys.key_blocks
for k in kb: k.value = 0
kb["Ear_Hide"].value = 1
bh = bmesh.new(); bh.from_object(head, bpy.context.evaluated_depsgraph_get()); bh.transform(head.matrix_world)
hp = np.array([v.co[:] for v in bh.verts])
top = hp[np.abs(hp[:, 0]) < 0.02][:, 2].max(); bot = hp[:, 2].min(); hw = np.percentile(np.abs(hp[:, 0]), 97)
band = hp[hp[:, 2] > top - 0.2]; cy0, cy1 = np.percentile(band[:, 1], 2), band[:, 1].max()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=raw)
o = [x for x in bpy.data.objects if x.type == "MESH"][0]
o.data.transform(o.matrix_world); o.parent = None; o.matrix_world = Matrix()
me = o.data; img = None
for m in me.materials:
    for n in m.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and (img is None or "base" in n.image.name.lower() or "color" in n.image.name.lower()): img = n.image
W, Hh = img.size; px = np.array(img.pixels[:]).reshape(Hh, W, -1)[:, :, :3]
uv = me.uv_layers.active.data
lab = np.zeros(len(me.polygons), bool)
for p in me.polygons:
    c = np.zeros(3)
    for li in p.loop_indices:
        u = uv[li].uv; c += px[int((u.y % 1) * (Hh - 1)), int((u.x % 1) * (W - 1))]
    c /= p.loop_total; mx, mn = c.max(), c.min()
    lab[p.index] = not (mx > 0.42 and (mx - mn) / max(mx, 1e-5) < 0.22)   # hair = dark or coloured; mannequin = bright grey
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
for _ in range(3):   # majority vote over neighbours
    nl = lab.copy()
    for f in bm.faces:
        nb = [g.index for e in f.edges for g in e.link_faces if g is not f]
        if nb:
            s = sum(lab[i] for i in nb)
            if s == len(nb): nl[f.index] = True
            elif s == 0: nl[f.index] = False
    lab = nl
P = np.array([v.co[:] for v in bm.verts])
mv = np.zeros(len(P), bool); hv = np.zeros(len(P), bool)
for f in bm.faces:
    for v in f.verts: (hv if lab[f.index] else mv)[v.index] = True
M, Hr = P[mv & ~hv], P[hv]
# the wig hugs the skull: measure the skull from the hair's crown band with human head ratios (depth 1.27 w, height 1.5 w)
ztop = Hr[:, 2].max() - float(os.environ.get('PREFIT_DROP', 0)) * (Hr[:, 2].max() - Hr[:, 2].min()); E = min(np.percentile(Hr[:, 0], 99) - np.percentile(Hr[:, 0], 1), np.percentile(Hr[:, 1], 99) - np.percentile(Hr[:, 1], 1)) / 2
hb = Hr[Hr[:, 2] > ztop - 0.7 * E]; c0 = np.array([np.median(hb[:, 0]), np.median(hb[:, 1])])
F = M[(M[:, 2] > ztop - 2.4 * E) & (M[:, 2] < ztop - 0.6 * E)]; d = F[:, :2].mean(0) - c0   # the bare face looks out of the hair
ax = 0 if abs(d[0]) > abs(d[1]) else 1; ang = {(0, 1): -1.5708, (0, -1): 1.5708, (1, 1): 3.14159, (1, -1): 0}[(ax, 1 if d[ax] > 0 else -1)]
ang = float(os.environ['PREFIT_ANG']) if 'PREFIT_ANG' in os.environ else ang  # a sculpt whose face reads wrong gets its turn by hand
R = np.array(Matrix.Rotation(ang, 3, "Z")); P = P @ R.T; Hr = P[hv]
hb = Hr[Hr[:, 2] > ztop - 0.7 * E]; cx = np.median(hb[:, 0]); w = 0.88 * np.percentile(np.abs(hb[:, 0] - cx), 97)
my0, my1 = np.percentile(hb[:, 1], 1), np.percentile(hb[:, 1], 99); crown = ztop - 0.10 * w
sx = hw / w; sy = (cy1 - cy0) / (2.55 * w); sz = (top - bot) / (3.0 * w)
print("PREFIT", raw, "ang", ang, "manW", round(w, 3), "scale", round(sx, 3), round(sy, 3), round(sz, 3), "hairfaces", int(lab.sum()), "/", len(lab))
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not lab[f.index]], context="FACES")
for v in bm.verts:
    p = R @ np.array(v.co[:])
    v.co = Vector(((p[0] - cx) * sx, (p[1] - (my0 + my1) / 2) * sy + (cy0 + cy1) / 2, (p[2] - crown) * sz + top))
bm.to_mesh(me); me.shape_keys and o.shape_key_clear()
bpy.ops.export_scene.gltf(filepath=out, export_apply=True)
