# Tripo anime hair (Shelly, Nov 9: "make new meshes (tripo) for anime hair") fitted to the live human heads.
# Each Tripo mesh: crown band measured, scaled so the crown wraps the head a little wider than the skull, crown top set just over the head top,
# skinned whole to Head, one tintable material named "hair". A hatted copy drops what sits above the brim.
# blender -b --factory-startup --python art/tripo-hair/fit.py -- <m|f>
import bpy, bmesh, sys, os, glob
from mathutils import Vector, Matrix
SEX = sys.argv[sys.argv.index("--") + 1]
ONLY = sys.argv[sys.argv.index("--") + 2:]  # optional style keys: fit only these
BODY = f"/workspace/human/ht/{SEX}.glb"; SRC = "/workspace/tripo-hair"; OUT = "/workspace/tripo-hair/out"; os.makedirs(OUT, exist_ok=True)
NAMES = {"long_straight_anime_hair_with_": "t_long", "short_spiky_anime_hair__male": "t_spiky", "anime_twin_ponytails_hair_with": "t_twintails",
         "messy_medium_anime_hair__male_": "t_messy", "anime_bob_cut_hair_with_blunt_": "t_bob", "anime_high_ponytail_hair_with_": "t_ponytail",
         "anime_silver_long_hair_with_": "t_silver",
         "anime_soft_bob": "t_softbob"}  # johnadams2 Nov 9: soft clumped wavy bob off his bob sheet (/cdn/image-u06qves5w.webp)  # johnadams2 Nov 9: long silver curtain from his reference (/cdn/image-u60fav89f.webp)
# per style: overall width against the skull width, crown lift over the head top, shift back (m) — tuned from the proof renders
FIT = {"t_bob": (1.42, 0.03, 0.01), "t_long": (1.45, 0.03, 0.02), "t_messy": (1.6, 0.035, 0.01), "t_ponytail": (1.5, 0.03, 0.03),
       "t_spiky": (1.55, 0.04, 0.01), "t_twintails": (2.9, 0.03, 0.01)}
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
    if stem not in NAMES or (ONLY and NAMES[stem] not in ONLY): continue
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before]
    parts = [o for o in new if o.type == "MESH"]
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new(NAMES[stem]); bm = bmesh.new()
    for o in parts:
        m2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); m2.transform(o.matrix_world); bm.from_mesh(m2)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    key = NAMES[stem]
    vs = [v.co for v in bm.verts]
    if (max(v.y for v in vs) - min(v.y for v in vs)) > 1.3 * (max(v.z for v in vs) - min(v.z for v in vs)):  # Tripo laid it down: stand it up, the tail hanging
        bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector(), matrix=Matrix.Rotation(-1.5708, 3, "X")); vs = [v.co for v in bm.verts]
    # scale from the CROWN, never the whole silhouette (tails and twintails hang wide): the top 18% of the mesh is the skull cover
    t = max(v.z for v in vs); b0 = min(v.z for v in vs); hgt = t - b0
    crown = sorted([v for v in vs if v.z > t - 0.18 * hgt], key=lambda v: v.x)
    q = lambda arr, f: arr[min(len(arr) - 1, int(f * len(arr)))]
    cw = q([v.x for v in crown], 0.97) - q([v.x for v in crown], 0.03)
    cys = sorted(v.y for v in crown); ccx = (q([v.x for v in crown], 0.97) + q([v.x for v in crown], 0.03)) / 2; ccy = (cys[0] + cys[-1]) / 2
    W = {"t_twintails": 1.05, "t_long": 1.1, "t_silver": 1.1}.get(key, 1.18)
    s = (2 * rx * W) / max(cw, 1e-4)
    # the crown band is the top 18%, so its width runs a little under the skull's: the push-out below seats whatever lands inside
    M = Matrix.Translation(Vector((0, cy + 0.004, top + 0.014))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-ccx, -ccy, -t)))
    bm.to_mesh(me); bm.free(); me.transform(M)
    # face it the right way: of yaw 0 and 180, keep the one that leaves the face window (brow to chin, in front of the eyes) clearest
    fz0, fz1 = hz + 0.02, top - 0.075
    def blocked(mm): return sum(1 for v in mm.vertices if fz0 < v.co.z < fz1 and v.co.y < y0 + 0.05 and abs(v.co.x) < rx * 0.55)
    R = Matrix.Translation(Vector((0, cy, 0))) @ Matrix.Rotation(3.14159, 4, "Z") @ Matrix.Translation(Vector((0, -cy, 0)))
    b0n = blocked(me); me.transform(R); b1n = blocked(me)
    if b1n >= b0n: me.transform(R)
    print("face", key, b0n, b1n)
    # a lopsided Tripo mesh: its fuller side mirrored onto the other, so the curtain falls even on both shoulders
    if key in ("t_silver", "t_softbob"):
        side = 1 if sum(1 for v in me.vertices if v.co.x > 0) >= sum(1 for v in me.vertices if v.co.x < 0) else -1
        bmS = bmesh.new(); bmS.from_mesh(me)
        bmesh.ops.symmetrize(bmS, input=bmS.verts[:] + bmS.edges[:] + bmS.faces[:], direction="X" if side > 0 else "-X", dist=0.0005)
        bmS.to_mesh(me); bmS.free(); print("mirrored", key, side)
    # the long curtain parts round the face: strands hanging in front of the face and throat swing out to frame it, side locks down the chest
    if key in ("t_silver",):
        for v in me.vertices:
            c = v.co
            if hz - 0.14 < c.z < fz1 - 0.01 and c.y < cy - 0.02 and abs(c.x) < rx * 0.78:
                sgn = 1 if c.x >= 0 else -1; k = min(1.0, (c.z - (hz - 0.14)) / 0.08)
                c.x = c.x + (sgn * rx * (0.78 + 0.1 * abs(c.x) / rx) - c.x) * k
    # a painted wig leaves Tripo a filled face mask inside the hair: for these, what hangs in front of the face is cut away, not folded
    if key in ("t_softbob",):
        bmC = bmesh.new(); bmC.from_mesh(me)
        cut = [f for f in bmC.faces if (lambda c: hz - 0.13 < c.z < fz1 - 0.005 and c.y < cy - 0.01 and abs(c.x) < rx * 0.8)(f.calc_center_median())]
        bmesh.ops.delete(bmC, geom=cut, context="FACES"); bmesh.ops.delete(bmC, geom=[v for v in bmC.verts if not v.link_faces], context="VERTS")
        bmC.to_mesh(me); bmC.free(); print("cut face mask", key, len(cut))
    # whatever still hangs over the face folds up into a fringe that ends at the brow, no holes cut
    for v in me.vertices:
        c = v.co
        if fz0 < c.z < fz1 and c.y < cy - 0.02 and abs(c.x) < rx * 0.62:
            k = max(0.0, 1 - abs(c.x) / (rx * 0.62))  # the middle rises to the brow, the temples keep some length
            c.z = c.z + (fz1 + 0.004 - c.z) * min(1.0, 0.35 + k)
    if len(me.polygons) > 9000:
        o = bpy.data.objects.new("tmp", me); bpy.context.scene.collection.objects.link(o)
        d = o.modifiers.new("d", "DECIMATE"); d.ratio = 9000 / len(me.polygons); bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="d"); bpy.data.objects.remove(o)
    # no hair inside the head: every vertex within 7 mm of the skin (or under it) is pushed out along the skin normal
    from mathutils.bvhtree import BVHTree
    hm0 = bpy.data.meshes.new_from_object(head.evaluated_get(dg)); hm0.transform(head.matrix_world)
    hb0 = bmesh.new(); hb0.from_mesh(hm0); tree = BVHTree.FromBMesh(hb0)
    for v in me.vertices:
        loc, nrm, idx, dist = tree.find_nearest(v.co)
        if loc is None: continue
        d = (v.co - loc).dot(nrm)
        if d < 0.007: v.co = loc + nrm * 0.007
    hb0.free()
    # the scalp: the head's own skin above the hairline, lifted 3 mm, in the hair's colour, so no skin shows between strands
    bz = sorted((head.matrix_world @ v.co).z for v in head.data.vertices); z0h = bz[0]; Hh = top - z0h
    cap = bpy.data.meshes.new("cap"); hb = bmesh.new(); hm = bpy.data.meshes.new_from_object(head.evaluated_get(dg))
    hm.transform(head.matrix_world); hb.from_mesh(hm)
    fy0 = min(v.co.y for v in hb.verts); by0 = max(v.co.y for v in hb.verts)
    line = lambda co: z0h + Hh * (0.72 - 0.42 * max(0.0, min(1.0, (co.y - fy0) / (by0 - fy0) - 0.35) / 0.65))  # forehead hairline at 72%, down the back to the nape
    ear = lambda co: abs(co.x) > rx * 0.86 and z0h + Hh * 0.36 < co.z < z0h + Hh * 0.62
    bmesh.ops.delete(hb, geom=[f for f in hb.faces if any(v.co.z < line(v.co) or ear(v.co) for v in f.verts) or f.material_index != 0], context="FACES")
    bmesh.ops.delete(hb, geom=[v for v in hb.verts if not v.link_faces], context="VERTS")
    hb.normal_update()
    for v in hb.verts: v.co += v.normal * 0.003
    bm2 = bmesh.new(); bm2.from_mesh(me); hb.to_mesh(cap); bm2.from_mesh(cap); bm2.to_mesh(me); bm2.free(); hb.free()
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
