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
HEAD_BVH = BVHTree.FromBMesh(_hb); HEAD_P = [v.co.copy() for v in _hb.verts]
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
CAPTEX = "/workspace/hair/captex.png"   # art/human-hair/captex.py: the pack's strands as a root band, alpha breaking into strands at the hairline
def capmat():
    global CAPMAT
    if CAPMAT is None:
        CAPMAT = bpy.data.materials.new("scalp_cap"); CAPMAT.use_nodes = True; t = CAPMAT.node_tree
        b = t.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.85
        im = t.nodes.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(CAPTEX); im.image.alpha_mode = "STRAIGHT"
        rd = t.nodes.new("ShaderNodeMath"); rd.operation = "ROUND"          # glTF alpha MASK: the edge is cut strand by strand, no sorting
        t.links.new(im.outputs["Color"], b.inputs["Base Color"]); t.links.new(im.outputs["Alpha"], rd.inputs[0]); t.links.new(rd.outputs[0], b.inputs["Alpha"])
    return CAPMAT

def _cr(p0, p1, p2, p3, t):
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
# the hairline: height above the Head bone as a share of the skull's height (top - hz), by azimuth |a| from the face (0) round to the nape (180)
HAIRLINE = {
    "f": [(0, 0.735), (10, 0.75), (24, 0.762), (40, 0.75), (54, 0.70), (64, 0.60), (72, 0.50), (80, 0.47), (100, 0.47), (118, 0.44), (135, 0.33), (155, 0.21), (180, 0.17)],
    "m": [(0, 0.765), (10, 0.775), (24, 0.79), (38, 0.795), (50, 0.74), (60, 0.62), (70, 0.48), (78, 0.43), (100, 0.45), (118, 0.42), (135, 0.30), (155, 0.18), (180, 0.14)],
}
def hairline_frac(a):
    a = abs(((a + 180) % 360) - 180)
    P = HAIRLINE[SEX]; P = [(-x, y) for x, y in reversed(P[1:])] + P + [(360 - x, y) for x, y in reversed(P[:-1])]
    for i in range(len(P) - 1):
        if P[i][0] <= a <= P[i + 1][0]:
            t = (a - P[i][0]) / max(1e-6, P[i + 1][0] - P[i][0])
            return _cr(P[max(0, i - 1)][1], P[i][1], P[i + 1][1], P[min(len(P) - 1, i + 2)][1], t)
    return P[-1][1]
def make_cap(hatted, mat):
    # Shelly Nov 9 ("this is ugly fix hairs"): the old cap was the head's own faces cut out, so its edge stair-stepped across the forehead.
    # Now a fresh shell: rays from the skull centre find the skin, the shell rides 3 mm off it, rows end on a smooth drawn hairline
    # (widow's dip, rounded temples, a short sideburn, lifted clear over the ears, down to the nape), the last rows tuck under the skin,
    # and its texture's alpha breaks the edge into single strands.
    mat = capmat()
    hh = H["top"] - H["hz"]; C = Vector((0, H["cy"], H["hz"] + 0.40 * hh))
    def hit(az, el):
        d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        loc, n, i, dist = HEAD_BVH.ray_cast(C + d * 0.5, -d, 0.5)
        if loc is None: return None, d, None
        return loc, d, n
    # the ears: where the head mesh stands out past the skull's side; the hairline lifts 1.4 cm clear of their top
    ear = [p for p in HEAD_P if H["hz"] + 0.03 < p.z < H["hz"] + 0.6 * hh and abs(p.x) > H["rx"] + 0.004]
    etop = max((p.z for p in ear), default=H["hz"] + 0.45 * hh)
    eaz = [abs(math.degrees(math.atan2(abs(p.x), -(p.y - C.y)))) for p in ear]
    ea0, ea1 = (min(eaz), max(eaz)) if eaz else (80, 110)
    print("ears top", round(etop - H["hz"], 3), "az", round(ea0), round(ea1))
    NA, NR = 144, 34
    zl = []
    for j in range(NA):
        ad = j * 360.0 / NA; aa = abs(((ad + 180) % 360) - 180)
        z = H["hz"] + hairline_frac(ad) * hh
        if ea0 - 14 <= aa <= ea1 + 10: z = max(z, etop + 0.014)
        zl.append(z)
    for _ in range(6): zl = [(zl[j - 1] + 2 * zl[j] + zl[(j + 1) % NA]) / 4 for j in range(NA)]   # round every corner
    ztop = H["top"] - 0.075 if hatted else None
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    grid = []; R = 14
    for j in range(NA):
        az = math.radians(j * 360.0 / NA)
        def zat(el):
            loc, d, n = hit(az, el); return loc.z if loc else C.z + 0.2 * math.sin(el)
        lo, hi = math.radians(-60), math.radians(88)                 # the elevation where this azimuth's skin meets the hairline
        for _ in range(30):
            mid = (lo + hi) / 2
            if zat(mid) > zl[j]: hi = mid
            else: lo = mid
        el_end = hi
        el_start = math.radians(88.5)
        if ztop is not None:
            lo2, hi2 = el_end, math.radians(88.5)
            for _ in range(30):
                mid = (lo2 + hi2) / 2
                if zat(mid) > ztop: hi2 = mid
                else: lo2 = mid
            el_start = hi2
        col = []
        for r in range(NR + 1):
            t = r / NR; el = el_start + (el_end - el_start) * t
            loc, d, n = hit(az, el)
            if loc is None: loc = C + d * 0.1; n = d
            w = max(0.0, min(1.0, (t - 0.86) / 0.14)); w = w * w * (3 - 2 * w)
            off = 0.0032 * (1 - w) - 0.0012 * w                            # 3 mm off the skin, the last rows tuck 1 mm under it
            off /= max(0.6, d.dot(n))
            col.append((bm.verts.new(loc + d * off), t))
        grid.append(col)
    pole = None
    if ztop is None:
        loc, d, n = hit(0, math.radians(90)); pole = bm.verts.new((loc or C + Vector((0, 0, 0.15))) + Vector((0, 0, 0.0032)))
    for j in range(NA):
        j2 = (j + 1) % NA; u0, u1 = j * R / NA, (j + 1) * R / NA
        for r in range(NR):
            q = [grid[j][r], grid[j][r + 1], grid[j2][r + 1], grid[j2][r]]
            f = bm.faces.new([v for v, t in q]); f.smooth = True
            for lp, (uu, tt) in zip(f.loops, [(u0, q[0][1]), (u0, q[1][1]), (u1, q[2][1]), (u1, q[3][1])]): lp[uvl].uv = (uu, 1 - tt)
        if pole is not None:
            f = bm.faces.new([pole, grid[j2][0][0], grid[j][0][0]]); f.smooth = True
            for lp, uu in zip(f.loops, [(u0 + u1) / 2, u1, u0]): lp[uvl].uv = (uu, 1.0)
    bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - C) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    me = bpy.data.meshes.new("scalpcap"); bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    o = bpy.data.objects.new("scalpcap", me); bpy.context.scene.collection.objects.link(o)
    return o

def export(k, hatted):
    bpy.ops.object.select_all(action="DESELECT")
    keep = []
    for kind, o in made[k]:
        if kind == "scalp": continue   # the pack's scalp patch (its own stepped edge) gives way to the drawn cap
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
