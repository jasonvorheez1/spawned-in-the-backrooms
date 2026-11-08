# Warrior walk/run onto Mixamo names: bake each source node's world motion onto a fresh Mixamo-shaped empty skeleton.
import bpy, sys, mathutils
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
O = {o.name.rsplit("_", 1)[0] if o.name.startswith("BND_") else o.name: o for o in bpy.data.objects}
def S(n): return next(o for o in bpy.data.objects if o.name.startswith(n + "_0") and not o.name[len(n)+1:].count("_"))
MAP = [("Hips", None, "BND_C_Pelvis1"), ("Spine", "Hips", "BND_C_Spine3"), ("Spine1", "Spine", "BND_C_Spine3"), ("Spine2", "Spine1", "BND_C_Spine4"),
       ("Neck", "Spine2", "BND_C_Neck1"), ("Head", "Neck", "BND_C_Head")]
for side, L in (("Left", "L"), ("Right", "R")):
    MAP += [(side+"Shoulder", "Spine2", f"BND_{L}_Clav1"), (side+"Arm", side+"Shoulder", f"BND_{L}_Arm1"), (side+"ForeArm", side+"Arm", f"BND_{L}_Arm2"), (side+"Hand", side+"ForeArm", f"BND_{L}_Arm3"),
            (side+"UpLeg", "Hips", f"BND_{L}_Leg1"), (side+"Leg", side+"UpLeg", f"BND_{L}_Leg2"), (side+"Foot", side+"Leg", f"BND_{L}_Leg3")]
    try: S(f"BND_{L}_Leg4"); MAP.append((side+"ToeBase", side+"Foot", f"BND_{L}_Leg4"))
    except StopIteration: pass
srcs = {m: S(s) for m, _, s in MAP}
act = next(a for a in bpy.data.actions)
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
def unscaled(M):
    l, r, s = M.decompose(); return mathutils.Matrix.LocRotScale(l, r, (1, 1, 1))
sc = bpy.context.scene
rec = {}
for f in range(f0, f1 + 1):
    sc.frame_set(f); rec[f] = {m: unscaled(o.matrix_world.copy()) for m, o in srcs.items()}
new = {}
for m, p, _ in MAP:
    e = bpy.data.objects.new(m, None); sc.collection.objects.link(e); new[m] = e
for m, p, _ in MAP:
    if p: new[m].parent = new[p]
for o in list(bpy.data.objects):
    if o.name not in new: bpy.data.objects.remove(o)
for m, p, _ in MAP: new[m].matrix_world = rec[f0][m]   # rest = first frame
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    for m, p, _ in MAP:
        e = new[m]; W = rec[f][m]
        e.matrix_world = W if not p else new[p].matrix_world @ (new[p].matrix_world.inverted() @ W)
        bpy.context.view_layer.update()
        e.keyframe_insert("location", frame=f); e.rotation_mode = "QUATERNION"; e.keyframe_insert("rotation_quaternion", frame=f)
sc.frame_start, sc.frame_end = f0, f1
bpy.ops.export_scene.gltf(filepath=out, export_animations=True, export_force_sampling=True, export_frame_range=True)
print("BAKED", len(MAP), "bones", f0, f1)
