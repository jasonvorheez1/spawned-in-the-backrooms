# Nov 17 weapon batch (Tripo sources in /workspace/tripo8) -> game frame (glTF):
# melee: length along +Z, handle at the origin, head far +Z; guns: muzzle toward -Z, upright, the grip's middle at the origin.
import bpy, sys, os, math, json
import numpy as np
from mathutils import Matrix, Vector
SRC = "/workspace/tripo8"; OUT = "/tmp/w8"; os.makedirs(OUT, exist_ok=True)
CFG = {
  "nail_gun":          dict(t="gun", len=0.36, grip=(0.13, 0.40)),
  "flare_pistol":      dict(t="gun", len=0.25, grip=(0.16, 0.36)),
  "sawn_carbine":      dict(t="gun", len=0.64, grip=(0.36, 0.52)),
  "fire_extinguisher": dict(t="melee", len=0.54, top=True),
  "meat_hook":         dict(t="melee", len=1.15, pca=True),
  "door_ram":          dict(t="melee", len=0.78, ram=True),
  "concierge_key":     dict(t="melee", len=0.64, pca=True, flip=True),
  "wardens_lantern":   dict(t="melee", len=1.25, pca=True),
  "valve_knuckles":    dict(t="knuck", len=0.14),  # worn over the fist: the wheel's face toward +X (the punch), centred on the origin
}
FL = json.loads(os.environ.get("FLIP", "{}"))
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(CFG)
R = lambda a, ax: Matrix.Rotation(math.radians(a), 4, ax)
res = {}
for kind in only:
    c = dict(CFG[kind]); c.update(FL.get(kind, {}))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in bpy.context.scene.objects: o.select_set(o in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(bpy.context.scene.objects):
        if o != ob: bpy.data.objects.remove(o)
    P = lambda: np.array([tuple(v.co) for v in ob.data.vertices])
    T = lambda M: ob.data.transform(M)
    if c.get("pre"): T(R(c["pre"][0], "X") @ R(c["pre"][1], "Y") @ R(c["pre"][2], "Z"))
    if c["t"] == "knuck":
        T(R(90, "Y")); p = P(); lo, hi = p.min(0), p.max(0)
        T(Matrix.Scale(c["len"] / max(hi - lo), 4)); p = P(); lo, hi = p.min(0), p.max(0)
        T(Matrix.Translation(Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -(lo[2] + hi[2]) / 2))))
    elif c["t"] == "gun":
        p = P(); e = p.max(0) - p.min(0)
        if e[0] > e[1]: T(R(90, "Z"))
        p = P(); lo, hi = p.min(0), p.max(0); L = hi[1] - lo[1]
        zr = np.ptp(p[p[:, 1] < lo[1] + 0.3 * L][:, 2]); zf = np.ptp(p[p[:, 1] > hi[1] - 0.3 * L][:, 2])
        if (zf > zr) != bool(c.get("flip")): T(R(180, "Z"))
        s = c["len"] / L; T(Matrix.Scale(s, 4))
        p = P(); lo, hi = p.min(0), p.max(0)
        g = Vector(((lo[0] + hi[0]) / 2, lo[1] + c["grip"][0] * (hi[1] - lo[1]), lo[2] + c["grip"][1] * (hi[2] - lo[2])))
        T(Matrix.Translation(-g))
    else:
        if c.get("pca"):
            p = P(); ctr = p.mean(0); Vt = np.linalg.svd(p - ctr, full_matrices=False)[2]
            if np.linalg.det(Vt) < 0: Vt[2] *= -1
            T(Matrix.Translation(-Vector(ctr.tolist())))
            T(Matrix([list(r) + [0] for r in Vt.tolist()] + [[0, 0, 0, 1]]))  # principal -> X, second -> Y, third -> Z
            T(R(90, "Z"))  # principal -> Y, second -> -X
        elif c.get("top"): T(R(-90, "X"))  # the valve end (up) -> +Y, where the hand goes
        else:
            p = P(); e = p.max(0) - p.min(0)
            if e[0] > e[1]: T(R(90, "Z"))
            T(R(-90, "Y"))  # the carry loops turn toward -X, back at the holder
        p = P(); lo, hi = p.min(0), p.max(0); L = hi[1] - lo[1]
        rad = lambda q: (np.ptp(q[:, 0]) + np.ptp(q[:, 2]))
        a = rad(p[p[:, 1] > hi[1] - 0.25 * L]); b = rad(p[p[:, 1] < lo[1] + 0.25 * L])
        if not c.get("top") and ((a > b) != bool(c.get("flip"))): T(R(180, "Z"))  # the slim end is the handle, at +Y (glTF z = 0)
        s = c["len"] / L; T(Matrix.Scale(s, 4))
        p = P(); lo, hi = p.min(0), p.max(0); L = hi[1] - lo[1]
        if not c.get("ram"):
            hd = p[p[:, 1] < lo[1] + 0.3 * L]
            if hd[:, 0].mean() - p[p[:, 1] > hi[1] - 0.2 * L][:, 0].mean() < 0: T(R(180, "Y")); p = P(); lo, hi = p.min(0), p.max(0)
            h = p[p[:, 1] > hi[1] - (0.12 if not c.get("top") else 0.06) * L]
            cx, cz = (h[:, 0].min() + h[:, 0].max()) / 2, (h[:, 2].min() + h[:, 2].max()) / 2
        else: cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
        T(Matrix.Translation(Vector((-cx, -hi[1], -cz))))
    tris = sum(len(f.vertices) - 2 for f in ob.data.polygons)
    if tris > 5800:
        m = ob.modifiers.new("dec", "DECIMATE"); m.ratio = 5600 / tris
        bpy.ops.object.modifier_apply(modifier="dec"); tris = sum(len(f.vertices) - 2 for f in ob.data.polygons)
    ob.name = kind
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}.glb", export_apply=True)
    p = P(); lo, hi = p.min(0), p.max(0)
    # glTF: x = bx, y = bz, z = -by
    res[kind] = dict(tris=tris, min=[round(float(lo[0]), 4), round(float(lo[2]), 4), round(float(-hi[1]), 4)], max=[round(float(hi[0]), 4), round(float(hi[2]), 4), round(float(-lo[1]), 4)], slot=[m.name for m in ob.data.materials])
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = 700; sc.render.resolution_y = 380
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.6, 0.6, 0.6, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.6; sc.world = w
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(0, 0, 0)); dot = bpy.context.object
    mt = bpy.data.materials.new("m"); mt.use_nodes = True; bs = mt.node_tree.nodes["Principled BSDF"]; bs.inputs["Emission Color"].default_value = (1, 0, 0, 1); bs.inputs["Emission Strength"].default_value = 5; dot.data.materials.append(mt)
    ctr = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2)); span = max(hi - lo)
    bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.type = "ORTHO"; cam.data.ortho_scale = span * 1.15
    # side: seen from glTF +X ... forward (glTF -Z = blender +Y) is at the picture's LEFT; top: seen from above, +X (blade side) at the picture's top
    for tag, loc, rot in [("side", ctr + Vector((3, 0, 0)), (math.radians(90), 0, math.radians(90))), ("top", ctr + Vector((0, 0, 3)), (0, 0, math.radians(-90)))]:
        cam.location = loc; cam.rotation_euler = rot
        sc.render.filepath = f"{OUT}/{kind}-{tag}.png"; bpy.ops.render.render(write_still=True)
json.dump(res, open(f"{OUT}/res-{'-'.join(only)[:40]}.json", "w"))
print("RES", json.dumps(res))
