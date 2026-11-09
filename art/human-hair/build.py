# Shelly's hair pack (#101894, /cdn/model-hair-pack-part-1-blue-grey-aocfwub6.glb) fitted to the human heads (art/human-base output).
# Per sex, per pack style: the hair (+ its scalp cap) turned to face -Y, scaled to the head, skinned whole to Head, exported on the body's rig.
# A hatted copy drops what a hat covers so the hair falls out from under the brim (#91693).
# blender -b --factory-startup --python-exit-code 1 --python art/human-hair/build.py -- <m|f>
import bpy, bmesh, sys, math, json
from mathutils import Vector, Matrix
SEX = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "f"
PACK = "/workspace/hair/pack.glb"; OUT = "/workspace/hair/human"; import os; os.makedirs(OUT, exist_ok=True)
BODY = f"/workspace/human/human_{'male' if SEX == 'm' else 'female'}.glb"

def clean():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def styles():
    bpy.ops.import_scene.gltf(filepath=PACK)
    dg = bpy.context.evaluated_depsgraph_get(); out = {}
    for o in list(bpy.data.objects):
        if o.type != "MESH" or o.name.startswith("Icosphere") or not o.material_slots: continue
        par = o.parent; 
        while par and not par.name.startswith("GLTF_created_"): par = par.parent
        if not par: continue
        k = int(par.name.split("_")[-1].split(".")[0])
        mname = o.material_slots[0].material.name
        kind = "scalp" if mname.startswith("Scalp") else "hair"
        e = o.evaluated_get(dg); me = bpy.data.meshes.new_from_object(e, preserve_all_data_layers=True, depsgraph=dg)
        me.transform(o.matrix_world)
        out.setdefault(k, []).append((kind, me, o.material_slots[0].material))
    return out

def head_dims(rig, head):
    P = [head.matrix_world @ v.co for v in head.data.vertices]
    top = max(p.z for p in P); hz = (rig.matrix_world @ rig.data.bones["Head"].head_local).z
    band = [p for p in P if p.z > top - 0.09]
    rx = max(abs(p.x) for p in band); y0 = min(p.y for p in band); y1 = max(p.y for p in band)
    return dict(top=top, hz=hz, rx=rx, y0=y0, y1=y1, cy=(y0 + y1) / 2)

clean()
ST = styles()
# keep the pack's meshes as data, drop its objects
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=BODY)
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
head = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Head"))
H = head_dims(rig, head); print("head", {k: round(v, 3) for k, v in H.items()})
for o in list(bpy.data.objects):
    if o.type == "MESH": o.hide_render = True; o.hide_set(True)
def borrow(dst, src):
    t = dst.node_tree; t.nodes.clear()
    for n in src.node_tree.nodes: pass
    dst.node_tree.nodes.clear()
    # copy by duplicating the source material's tree
    return src
from mathutils.bvhtree import BVHTree
_hb = bmesh.new(); _hm = bpy.data.meshes.new_from_object(head.evaluated_get(bpy.context.evaluated_depsgraph_get())); _hb.from_mesh(_hm); _hb.transform(head.matrix_world); bpy.data.meshes.remove(_hm)
HEAD_BVH = BVHTree.FromBMesh(_hb)
def refit(k, objs):
    # Shelly: "either the hair is too big to fit my character or too small". The bbox fit left styles floating off the skull or cutting the ears.
    # Shrink-to-fit about the skull centre: the smallest scale where under 2% of the near verts sink into the head, then push the stragglers out 4 mm.
    C = Vector((0, H["cy"], H["hz"] + 0.035))
    pts = [(o, v) for kind, o in objs for v in o.data.vertices]
    def inside(q):
        loc, n, i, d = HEAD_BVH.find_nearest(q)
        return loc is not None and d < 0.05 and (q - loc).dot(n) < 0
    near = [(o, v) for o, v in pts if (HEAD_BVH.find_nearest(v.co)[3] or 1) < 0.05]
    sample = near[:: max(1, len(near) // 1500)] or pts[:: max(1, len(pts) // 1500)]
    best = 1.0
    for f in [0.70 + i * 0.025 for i in range(21)]:
        bad = sum(1 for o, v in sample if inside(C + (v.co - C) * f))
        if bad / max(1, len(sample)) < 0.02: best = f; break
    for o, v in pts: v.co = C + (v.co - C) * best
    pushed = 0
    for o, v in pts:
        loc, n, i, d = HEAD_BVH.find_nearest(v.co)
        if loc is not None and d < 0.05 and (v.co - loc).dot(n) < 0.003: v.co = loc + n * 0.004; pushed += 1
    for kind, o in objs: o.data.update()
    print("refit", k, "scale", round(best, 3), "pushed", pushed, "of", len(pts))
made = {}
ROT = Matrix.Rotation(math.radians(90), 4, "Z")  # pack faces -X; ours faces -Y
for k, parts in sorted(ST.items()):
    sc = [me for kind, me, m in parts if kind == "scalp"] or [me for kind, me, m in parts]
    vs = [ROT @ v.co for me in sc for v in me.vertices]
    sx0, sx1 = min(v.x for v in vs), max(v.x for v in vs); sy0, sy1 = min(v.y for v in vs), max(v.y for v in vs); stop = max(v.z for v in vs)
    s = (2 * H["rx"] * 1.04) / (sx1 - sx0)
    sy = (H["y1"] - H["y0"]) * 1.02 / (sy1 - sy0)
    s = (s + min(sy, s * 1.15)) / 2
    M = Matrix.Translation(Vector((0, H["cy"], H["top"] + 0.006))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(sx0 + sx1) / 2, -(sy0 + sy1) / 2, -stop))) @ ROT
    objs = []
    for kind, me, m in parts:
        me2 = me.copy(); me2.transform(M)
        mat = m.copy(); mat.name = f"{kind}_{k}"
        me2.materials.clear(); me2.materials.append(mat)
        o = bpy.data.objects.new(f"{kind}_{k}", me2); bpy.context.scene.collection.objects.link(o); objs.append((kind, o))
    refit(k, objs)
    made[k] = objs

def finish(o):
    vg = o.vertex_groups.new(name="Head"); vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    o.parent = rig; mod = o.modifiers.new("skin", "ARMATURE"); mod.object = rig

CAPMAT = None
def capmat():
    global CAPMAT
    if CAPMAT is None:
        CAPMAT = bpy.data.materials.new("scalp_cap"); CAPMAT.use_nodes = True
        b = CAPMAT.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.42, 0.40, 0.38, 1); b.inputs["Roughness"].default_value = 0.85
    return CAPMAT
def make_cap(hatted, mat):
    # a painted scalp under every cut: the head's crown and back, pushed out 4 mm, so no skin shows between strands (Andrew's bald patches, Nov 9)
    global CAPMAT
    mat = capmat()
    if False:
        if CAPMAT is None:
            CAPMAT = bpy.data.materials.new("scalp_cap"); CAPMAT.use_nodes = True
            CAPMAT.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.09, 0.06, 0.04, 1)
            CAPMAT.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        mat = CAPMAT
    dg = bpy.context.evaluated_depsgraph_get(); hm = bpy.data.meshes.new_from_object(head.evaluated_get(dg), depsgraph=dg)
    bm = bmesh.new(); bm.from_mesh(hm); bm.transform(head.matrix_world); bpy.data.meshes.remove(hm)   # the head as it draws, not its rest data
    depth = H["y1"] - H["y0"]
    def keepf(f):
        c = f.calc_center_median()
        if c.z < H["hz"] + 0.035: return False            # above the ears only
        front = (c.y - H["y0"]) / depth                     # 0 = face, 1 = back of head
        hairline = H["top"] - 0.03                           # forehead stays skin; the cap ends behind the bangs (Shelly's jagged hairline, Nov 9)
        if front < 0.5 and c.z < hairline: return False
        if abs(c.x) > H["rx"] * 0.93 and front < 0.55 and c.z < H["top"] - 0.07: return False  # temples
        if hatted and c.z > H["top"] - 0.075: return False
        return True
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keepf(f)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    if not bm.faces: bm.free(); return None
    bm.normal_update()
    ctr = Vector((0, H["cy"], H["hz"] + 0.02))
    edge = {v for e in bm.edges if e.is_boundary for v in e.verts}
    ring = {o for v in edge for e in v.link_edges for o in e.verts} - edge
    for v in bm.verts: v.co += (v.co - ctr).normalized() * (-0.002 if v in edge else 0.004 if v in ring else 0.008)   # radial; the rim tucks under the skin so its stepped outline never draws as a line
    me = bpy.data.meshes.new("scalpcap"); bm.to_mesh(me); bm.free()
    me.validate(clean_customdata=True)
    for a in [a.name for a in me.attributes if a.name not in ("position", ".edge_verts", ".corner_vert", ".corner_edge", "sharp_face") and not a.name.startswith(".") and a.domain != "CORNER"]: me.attributes.remove(me.attributes[a])
    me.materials.append(mat)
    o = bpy.data.objects.new("scalpcap", me); bpy.context.scene.collection.objects.link(o)
    return o

def export(k, hatted):
    bpy.ops.object.select_all(action="DESELECT")
    keep = []
    for kind, o in made[k]:
        c = o.copy(); c.data = o.data.copy(); bpy.context.scene.collection.objects.link(c)
        first = next(o2 for kd, o2 in made[k] if kd == kind)  # one material per kind: the engine tints the slot named hair
        c.data.materials.clear(); c.data.materials.append(capmat() if kind == "scalp" else first.data.materials[0])  # the pack's scalp texture is skin-toned: tinted it read as bald patches
        if hatted:
            bm = bmesh.new(); bm.from_mesh(c.data)
            line = H["top"] - 0.075  # the brim: what's above sits inside the hat
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(v.co.z > line for v in f.verts)], context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
            bm.to_mesh(c.data); bm.free()
        if len(c.data.polygons) == 0: bpy.data.objects.remove(c); continue
        if kind == "hair" and len(c.data.polygons) > 7000:
            d = c.modifiers.new("dec", "DECIMATE"); d.ratio = 7000 / len(c.data.polygons)
            bpy.context.view_layer.objects.active = c; bpy.ops.object.modifier_apply(modifier="dec")
        finish(c); c.select_set(True); keep.append(c)
    cap = make_cap(hatted, next((c.data.materials[0] for c in keep if c.data.materials[0].name.startswith("scalp")), None))
    if cap: finish(cap); cap.select_set(True); keep.append(cap)
    if not keep: return None
    rig.select_set(True)
    # materials named for the tint: hair / scalp
    saved = []
    for m in {c.data.materials[0] for c in keep}:
        saved.append((m, m.name)); m.name = "hair" if m.name.startswith("hair") else "scalp"
    p = f"{OUT}/{SEX}_p{k}{'_hat' if hatted else ''}.glb"
    bpy.ops.export_scene.gltf(filepath=p, use_selection=True, export_apply=False, export_animations=False, export_image_format="JPEG", export_jpeg_quality=85)
    for m, n in saved: m.name = n
    for c in keep: bpy.data.objects.remove(c, do_unlink=True)
    return p

if "--proof" not in sys.argv:
    for k in made:
        for hat in (False, True): print("exported", export(k, hat))
if "--noproof" in sys.argv: sys.exit(0)
# proof: every style on this head, a 3/4 front, in a grid
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.render.resolution_x = sc.render.resolution_y = 400
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.6, 0.55, 1)
for o in bpy.data.objects:
    if o.type == "MESH" and (o.name.startswith("Head") or o.name.startswith("Body")): o.hide_render = False
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 85
bpy.ops.object.light_add(type="SUN"); bpy.context.object.rotation_euler = (0.7, 0.2, -0.6); bpy.context.object.data.energy = 3
tgt = Vector((0, H["cy"], H["top"] - 0.12))
os.makedirs("/tmp/hh", exist_ok=True)
for k in made:
    for kk in made:
        for kind, o in made[kk]: o.hide_render = kk != k
    for tag, d in (("a", Vector((-0.55, -1.0, 0.15))), ("b", Vector((0.7, 0.8, 0.2)))):
        cam.location = tgt + d.normalized() * 0.9; cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/hh/{SEX}_{k:02d}{tag}.png"; bpy.ops.render.render(write_still=True)
