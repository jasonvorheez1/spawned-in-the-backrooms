# Ears for the new cat (Shelly #221580 "massively improve ears too"): the head's own ears were thin flat shells.
# Each type is a sculpted anime ear: thick rim, cupped pink bowl, soft rounded tip, a cream tuft in the bowl; skinned to the head bone.
# The head's own ear is shrunk under it (Ear_Small key; Ear_Wide for the airplane type) so only these show.
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/ears.py
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix
SRC = {"f": "/tmp/ears/f.glb", "m": "/tmp/ears/m.glb"}   # the live bodies (CAT_BODY in scripts/lib/cat-wardrobe.js), fetched ?raw
OUT = "/workspace/catears"; os.makedirs(OUT + "/proof", exist_ok=True)
# type: height x, width x, lean out (deg), fold forward (deg, from foldAt up), tip roundness, old head key under it
TYPES = {
    "upright": dict(h=1.05, w=1.0, lean=8,  fold=0,   foldAt=1,    round=0.55, key="Ear_Small"),
    "tall":    dict(h=1.42, w=0.86, lean=12, fold=0,  foldAt=1,    round=0.4,  key="Ear_Small"),
    "small":   dict(h=0.72, w=0.95, lean=6,  fold=0,  foldAt=1,    round=0.9,  key="Ear_Small"),
    "fold":    dict(h=0.98, w=1.04, lean=4,  fold=95, foldAt=0.5,  round=0.8,  key="Ear_Small"),
    "wide":    dict(h=1.0,  w=1.02, lean=6,  fold=0,  foldAt=1,    round=0.6,  key="Ear_Wide", tip=-58),
}

def load(sex):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC[sex])
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    if arm.animation_data: arm.animation_data.action = None
    H = bpy.data.objects["Head"]
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name not in ("Body", "Head"): bpy.data.objects.remove(o)
    return arm, H

def measure(H):
    M = H.matrix_world
    V = np.array([M @ v.co for v in H.data.vertices]); x, y, z = V[:, 0], V[:, 1], V[:, 2]
    mid = V[np.abs(x) < 0.015]; low = mid[mid[:, 2] < z.min() + 0.5 * (z.max() - z.min())]
    zp = low[np.argmin(low[:, 1]), 2]; S = (zp - z.min()) / 0.17; crown = mid[:, 2].max()
    ear = np.clip((z - (crown - 0.07 * S)) / (0.06 * S), 0, 1) * np.clip((np.abs(x) - 0.11 * S) / (0.05 * S), 0, 1)
    E = ear > 0; base_z = np.percentile(z[E], 8)
    out = {}
    for sx in (1, -1):
        m = E & (np.sign(x) == sx); P = V[m]
        tip = Vector(P[np.argmax(P[:, 2])]); C = Vector((P[:, 0].mean(), P[:, 1].mean(), base_z))
        # the old ear's own frame: up = base to tip, thin = its flattest direction (its face normal), across = the rest
        up = (tip - C).normalized(); Q = P - P.mean(0); Q = Q - np.outer(Q @ np.array(up), np.array(up))
        ev, evec = np.linalg.eigh(Q.T @ Q); thin = Vector(evec[:, 0]).normalized()
        if thin.y > 0: thin = -thin                       # facing out of the front (-Y)
        thin = (thin - up * thin.dot(up)).normalized(); across = up.cross(thin).normalized()
        if across.x * sx < 0: across = -across
        proj = Q @ np.array(across); band = P[P[:, 2] < base_z + 0.3 * (tip.z - base_z)]
        bq = (band - P.mean(0)) @ np.array(across)
        out[sx] = dict(C=C, tip=tip, up=up, fr=thin, ac=across, hw=(bq.max() - bq.min()) / 2, hd=0)
    head_bone = max(H.vertex_groups, key=lambda g: sum(1 for v in H.data.vertices for e in v.groups if e.group == g.index and e.weight > 0.5)).name
    return out, S, head_bone

def ear(bm, E, T, sx, mats):
    C, tip = E["C"], E["tip"]; h = (tip.z - C.z) * T["h"]
    W0 = E["hw"] * 1.18 * T["w"]; D0 = W0 * 0.55
    up = Vector((0, 0, 1)); f = Vector((0, -1, 0)); s = Vector((sx, 0, 0))
    lean = math.radians(T["lean"])
    N, R = 28, 22
    rings = []
    for j in range(R + 1):
        t = -0.3 + 1.3 * j / R; tt = max(t, 0)
        taper = (1 - tt) ** 0.8 * (1 + 0.12 * math.sin(math.pi * tt))
        taper = taper * (1 - T["round"] * 0.0) if tt < 0.85 else taper
        w = W0 * max(taper, 0); d = D0 * max((1 - tt) ** 0.7, 0)
        if tt > 0.82: k = (tt - 0.82) / 0.18; w *= 1 - (1 - math.cos(k * math.pi / 2)) * (1 - T["round"] * 0.4) * 0.15; d *= 1 - k * 0.2
        w = max(w, 0.0015); d = max(d, 0.0012)
        cup = 1.25 * (1 - 0.55 * tt) if t > -0.05 else 0
        ring = []
        for i in range(N):
            th = 2 * math.pi * i / N; c, sn = math.cos(th), math.sin(th)
            fc = d * (sn - cup * max(0.0, sn) ** 3)
            # a soft S-curve in the outline: a kemono ear bulges on the outer edge, straight on the inner
            wc = w * c * (1.06 if c * 1 > 0 else 0.94)
            ring.append((wc, fc, t))
        rings.append(ring)
    verts = []
    for ring in rings:
        rv = []
        for (wc, fc, t) in ring:
            z = t * h; tt = max(t, 0)
            p = Vector((wc, fc, z))
            # lean out at the tip, a slight back sweep
            p = Matrix.Rotation(-lean * sx * tt, 3, "Y") @ p
            p.y -= 0.1 * h * tt * tt
            if T["fold"] and tt > T["foldAt"]:
                piv = Vector((0, 0.0, T["foldAt"] * h)); k = (tt - T["foldAt"]) / (1 - T["foldAt"])
                p = piv + Matrix.Rotation(-math.radians(T["fold"]) * min(1, k * 1.6), 3, "X") @ (p - piv)
            if T.get("tip"):
                p = Matrix.Rotation(math.radians(T["tip"] * sx), 3, "Y") @ p
            rv.append(bm.verts.new(C + E["ac"] * (p.x * sx * sx) + E["fr"] * p.y + E["up"] * p.z))
        verts.append(rv)
    faces = []
    for j in range(R):
        for i in range(N):
            a, b = verts[j][i], verts[j][(i + 1) % N]; c2, d2 = verts[j + 1][(i + 1) % N], verts[j + 1][i]
            fc = bm.faces.new((a, b, c2, d2))
            th = 2 * math.pi * (i + 0.5) / N; t = -0.3 + 1.3 * (j + 0.5) / R
            fc.material_index = 1 if (math.sin(th) > 0.55 and 0.02 < t < 0.86) else 0
    top = bm.verts.new(sum((v.co for v in verts[-1]), Vector()) / N)
    for i in range(N): bm.faces.new((verts[-1][i], verts[-1][(i + 1) % N], top)).material_index = 0
    bot = bm.verts.new(sum((v.co for v in verts[0]), Vector()) / N)
    for i in range(N): bm.faces.new((verts[0][(i + 1) % N], verts[0][i], bot)).material_index = 0
    # the tuft: three soft cream locks rising out of the bowl
    for k, (ox, L, ang) in enumerate(((-0.25, 0.5, 6), (0.12, 0.62, -4), (0.4, 0.42, -12))):
        root = Vector((ox * W0 * sx, D0 * 0.25, 0.08 * h))
        dirv = Matrix.Rotation(math.radians(ang * sx), 3, "Y") @ Vector((0, 0.38, 1)).normalized()
        if T.get("tip"): pass
        segs, ringn = 7, 8; prev = None; rr = W0 * 0.16
        rowsv = []
        for i in range(segs + 1):
            u = i / segs; pc = root + dirv * (L * h * u) + Vector((0, 0.18 * h * u * u, 0))
            rad = rr * (1 - u) ** 0.9 + 0.0008
            row = [bm.verts.new(C + E["ac"] * ((pc.x * sx + math.cos(2 * math.pi * q / ringn) * rad) ) + E["fr"] * ((pc.y + math.sin(2 * math.pi * q / ringn) * rad * 0.6)) + E["up"] * pc.z) for q in range(ringn)]
            rowsv.append(row)
        for i in range(segs):
            for q in range(ringn):
                bm.faces.new((rowsv[i][q], rowsv[i][(q + 1) % ringn], rowsv[i + 1][(q + 1) % ringn], rowsv[i + 1][q])).material_index = 2
        tipv = bm.verts.new(rowsv[-1][0].co.copy())
        for q in range(ringn): bm.faces.new((rowsv[-1][q], rowsv[-1][(q + 1) % ringn], tipv)).material_index = 2
    return

def build(sex, kind, arm, H, meas, bone):
    T = TYPES[kind]; me = bpy.data.meshes.new(f"ears-{kind}"); bm = bmesh.new()
    for sx in (1, -1): ear(bm, meas[sx], T, sx, None)
    if T.get("tip"):
        pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(f"ears-{kind}", me); bpy.context.collection.objects.link(o)
    for n, col in (("earFur", (0.95, 0.75, 0.5, 1)), ("earInner", (0.84, 0.55, 0.54, 1)), ("earTuft", (1, 0.96, 0.9, 1))):
        mt = bpy.data.materials.new(n); mt.diffuse_color = col; mt.use_nodes = True
        mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = col; me.materials.append(mt)
    sub = o.modifiers.new("s", "SUBSURF"); sub.levels = 1
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier="s")
    for p in me.polygons: p.use_smooth = True
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode="OBJECT")
    g = o.vertex_groups.new(name=bone); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
    o.parent = arm; o.modifiers.new("skin", "ARMATURE").object = arm
    return o

HIDE = 2.4   # Ear_Small past 1 presses the head's own ear flat into the crown, under the new ear (cat-wardrobe.js catMorph sends the same)
def proof(sex, objs, H, meas):
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 360
    w = bpy.data.worlds.new("w"); sc.world = w; w.color = (0.3, 0.3, 0.33)
    Cz = meas[1]["C"].z
    cams = [((0, -0.9, Cz + 0.1), (90, 0, 0)), ((0.9, -0.25, Cz + 0.1), (90, 0, 74)), ((0.55, 0.65, Cz + 0.35), (68, 0, 140))]
    files = []
    for kind, o in objs.items():
        for x in objs.values(): x.hide_render = x is not o
        for k in H.data.shape_keys.key_blocks:
            if k.name.startswith("Ear_"): k.slider_max = 3; k.value = HIDE if k.name == "Ear_Small" else 0
        for i, (p, r) in enumerate(cams):
            c = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(c); c.location = p
            c.rotation_euler = [math.radians(a) for a in r]; c.data.type = "ORTHO"; c.data.ortho_scale = 0.6
            l = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); l.data.energy = 3.5; l.rotation_euler = c.rotation_euler; sc.collection.objects.link(l)
            sc.camera = c; fn = f"{OUT}/proof/{sex}-{kind}-{i}.png"; sc.render.filepath = fn; bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(l); bpy.data.objects.remove(c); files.append(fn)

for sex in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["f", "m"]):
    arm, H = load(sex); meas, S, bone = measure(H); print("EARS", sex, bone, {k: (round(v["hw"], 3), round(v["hd"], 3), round(v["tip"].z - v["C"].z, 3)) for k, v in meas.items()})
    objs = {k: build(sex, k, arm, H, meas, bone) for k in TYPES}
    for kind, o in objs.items():
        for x in bpy.data.objects: x.select_set(False)
        o.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False)
    if "noproof" not in sys.argv: proof(sex, objs, H, meas)
