# First-person arms cut from the player's own body GLBs (CAT_BODY f/m): the same skinned mesh, same rig, same
# material slots and bind pose (so the skin shader's painted sleeves land the same), with every vertex that is not
# arm, forearm or hand deleted: no torso, head, legs or tail to fill the view. Prints the bind-pose bounds and shoulders (glTF frame).
import bpy, json, sys
SRC = {"f": "/workspace/catarm/f.glb", "m": "/workspace/catarm/m.glb"}
KEEP = [s + p for s in ("mixamorig:Right", "mixamorig:Left") for p in ("Arm", "ForeArm", "Hand")]
out = {}
for sex, path in SRC.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name != "Body": bpy.data.objects.remove(o)
    body = bpy.data.objects["Body"]; me = body.data
    gi = {g.name: g.index for g in body.vertex_groups}; keep = {gi[k] for k in KEEP}
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    dl = me.vertices
    dele = [bm.verts[v.index] for v in dl if sum(g.weight for g in v.groups if g.group in keep) < 0.5]
    bmesh.ops.delete(bm, geom=dele, context="VERTS"); bm.to_mesh(me); bm.free()
    mw = body.matrix_world
    pts = [mw @ v.co for v in me.vertices]
    g = lambda p: (p.x, p.z, -p.y)   # blender -> glTF
    G = [g(p) for p in pts]
    mn = [min(c[i] for c in G) for i in range(3)]; mx = [max(c[i] for c in G) for i in range(3)]
    sh = {n: g(rig.matrix_world @ rig.data.bones["mixamorig:" + n].head_local) for n in ("RightArm", "LeftArm", "RightHand", "LeftHand")}
    out[sex] = {"verts": len(me.vertices), "min": mn, "max": mx, "bc": [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2], **sh}
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=f"/workspace/catarm/out/arm-{sex}.glb", export_skins=True, export_morph=True, export_animations=False)
print("RESULT", json.dumps(out))
