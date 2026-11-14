# Nov 14, Shelly: "fitting with the tail when they shouldnt": the Tripo armor/vests kept a hem bulge where the tail sat.
# Pull every lower-hem vertex that juts past the garment's mirrored side extent, or past its mid-torso back, back in.
# blender -b --factory-startup --python tailclear.py -- in.glb out.glb
import bpy, sys
a = sys.argv[sys.argv.index("--") + 1:]; IN, OUT = a[:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=IN)
sm = lambda t: 0 if t <= 0 else 1 if t >= 1 else t * t * (3 - 2 * t)
moved = 0
for o in bpy.context.scene.objects:
    if o.type != "MESH" or o.name.startswith("Icosphere"): continue
    me = o.data; MW = o.matrix_world; MI = MW.inverted()
    W = [MW @ v.co for v in me.vertices]
    z0 = min(w.z for w in W); z1 = max(w.z for w in W); h = z1 - z0
    mid = [w for w in W if z0 + h * 0.45 < w.z < z0 + h * 0.65]
    cx = sum(w.x for w in mid) / len(mid)
    back = max(w.y for w in mid) + 0.012          # Blender front is -Y: +Y is the back, where the tail is
    side = max(max(w.x for w in mid) - cx, cx - min(w.x for w in mid)) + 0.02
    blocks = me.shape_keys.key_blocks if me.shape_keys else None
    for i, w in enumerate(W):
        t = sm(((z0 + h * 0.45) - w.z) / (h * 0.25))   # 0 at mid torso, 1 in the lowest 20 %
        if t <= 0: continue
        n = w.copy()
        if n.y > back: n.y = back + (n.y - back) * (1 - t)
        dx = n.x - cx
        if abs(dx) > side: n.x = cx + (side + (abs(dx) - side) * (1 - t)) * (1 if dx > 0 else -1)
        if (n - w).length < 1e-5: continue
        d = MI.to_3x3() @ (n - w); moved += 1
        me.vertices[i].co += d
        if blocks:
            for k in blocks: k.data[i].co += d
print("CLEAR", IN.split("/")[-1], "moved", moved)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_skins=True, export_morph=True, export_yup=True)
