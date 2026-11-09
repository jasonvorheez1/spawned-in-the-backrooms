# Tripo anime hair (Shelly, Nov 9: "make new meshes (tripo) for anime hair") fitted to the live human heads.
# Each Tripo mesh: crown band measured, scaled so the crown wraps the head a little wider than the skull, crown top set just over the head top,
# skinned whole to Head, one tintable material named "hair". A hatted copy drops what sits above the brim.
# blender -b --factory-startup --python art/tripo-hair/fit.py -- <m|f>
import bpy, bmesh, sys, os, glob
from mathutils import Vector, Matrix
SEX = sys.argv[sys.argv.index("--") + 1]
BODY = f"/workspace/human/live_{SEX}.glb"; SRC = "/workspace/tripo-hair"; OUT = "/workspace/tripo-hair/out"; os.makedirs(OUT, exist_ok=True)
NAMES = {"long_straight_anime_hair_with_": "t_long", "short_spiky_anime_hair__male": "t_spiky", "anime_twin_ponytails_hair_with": "t_twintails",
         "messy_medium_anime_hair__male_": "t_messy", "anime_bob_cut_hair_with_blunt_": "t_bob", "anime_high_ponytail_hair_with_": "t_ponytail"}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=BODY)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
head = next((o for o in meshes if o.name.lower().startswith("head")), None)
hz = (rig.matrix_world @ rig.data.bones["Head"].head_local).z
P = [o.matrix_world @ v.co for o in ([head] if head else meshes) for v in o.data.vertices]
P = [p for p in P if p.z > hz]
top = max(p.z for p in P); band = [p for p in P if p.z > top - 0.09]
rx = max(abs(p.x) for p in band); y0 = min(p.y for p in band); y1 = max(p.y for p in band); cy = (y0 + y1) / 2
print("head", round(top, 3), round(hz, 3), round(rx, 3), round(y0, 3), round(y1, 3))
for o in meshes: o.hide_set(True)
mat = bpy.data.materials.new("hair"); mat.use_nodes = True
b = mat.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1); b.inputs["Roughness"].default_value = 0.5
for f in sorted(glob.glob(f"{SRC}/*.glb")):
    stem = os.path.basename(f)[:-4]
    if stem not in NAMES: continue
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    parts = [o for o in new if o.type == "MESH"]
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new(NAMES[stem]); bm = bmesh.new()
    for o in parts:
        m2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); m2.transform(o.matrix_world); bm.from_mesh(m2)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    vs = [v.co for v in bm.verts]
    t = max(v.z for v in vs); z0 = min(v.z for v in vs); crown = [v for v in vs if v.z > t - (t - z0) * 0.3]
    cx0, cx1 = min(v.x for v in crown), max(v.x for v in crown); cy0, cy1 = min(v.y for v in crown), max(v.y for v in crown)
    s = (2 * rx * 1.18) / (cx1 - cx0)
    M = Matrix.Translation(Vector((0, cy + 0.004, top + 0.012))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(cx0 + cx1) / 2, -(cy0 + cy1) / 2, -t)))
    bm.to_mesh(me); bm.free(); me.transform(M)
    if len(me.polygons) > 9000:
        o = bpy.data.objects.new("tmp", me); bpy.context.scene.collection.objects.link(o)
        d = o.modifiers.new("d", "DECIMATE"); d.ratio = 9000 / len(me.polygons); bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="d"); bpy.data.objects.remove(o)
    me.materials.clear(); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    for hat in (False, True):
        m = me.copy()
        if hat:
            bm = bmesh.new(); bm.from_mesh(m); line = top - 0.075
            bmesh.ops.delete(bm, geom=[fc for fc in bm.faces if any(v.co.z > line for v in fc.verts)], context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS"); bm.to_mesh(m); bm.free()
        o = bpy.data.objects.new(NAMES[stem], m); bpy.context.scene.collection.objects.link(o)
        vg = o.vertex_groups.new(name="Head"); vg.add(list(range(len(m.vertices))), 1.0, "REPLACE")
        o.parent = rig; mod = o.modifiers.new("skin", "ARMATURE"); mod.object = rig
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); rig.select_set(True)
        p = f"{OUT}/{SEX}_{NAMES[stem]}{'_hat' if hat else ''}.glb"
        bpy.ops.export_scene.gltf(filepath=p, use_selection=True, export_animations=False)
        print("exported", p, len(m.polygons), "scale", round(s, 3))
        # proof render
        bpy.data.objects.remove(o, do_unlink=True)
