# Tripo hats fitted to the new cat heads (Shelly Nov 12: "the hats arent being worn correctly").
# Each source is first turned by its own `orient` (yaw, roll: degrees) so it enters the fit Z-up, opening down, front on -Y. Then by type:
#   wrap    the opening (measured by rays inside the hat's own cavity) hugs the skull's oval at `band` (share of head height below the crown),
#           near-uniform scale (<= 15 % between axes), the inside of the crown resting 1 cm over the skull, the rim never below the band
#   enclose a helmet round the whole head, uniform scale, face opening on -Y
#   perch   sized as `w` x head width, set down on the dome under its own base verts (`seat` 0 = first touch .. 1 = every base vert down), sunk `sink`
#   band    headphones: the inside of the band on the crown, the cups pressed to the skull's sides
# Last, verts just inside the skull slide out by a clearance; the displacement is smoothed over neighbours so no face tears. Skinned to mixamorig:Head.
# run: cd /workspace && blender -b --factory-startup --python-exit-code 1 --python <world>/art/cat-wardrobe/hats.py -- [kinds...]
import bpy, bmesh, os, sys, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
SRC = "/workspace/hats"; OUT = "/workspace/hats/out"; BODY = "/workspace/catrev/body%s.glb"; os.makedirs(OUT, exist_ok=True)
R = {
  "cap":        dict(fit="wrap", band=0.30, ease=1.03, tilt=-8),
  "beanie":     dict(fit="wrap", band=0.36, ease=1.03, tilt=-10, orient=dict(roll=13)),
  "souwester":  dict(fit="wrap", band=0.34, ease=1.04, tilt=-8),
  "chitinhelm": dict(fit="wrap", band=0.40, ease=1.05, tilt=-4, orient=dict(yaw=-90)),
  "beret":      dict(fit="wrap", band=0.20, ease=1.02, tilt=-10, roll=10, dx=0.015),
  "divehelm":   dict(fit="enclose", ease=1.22, orient=dict(yaw=-90)),
  "tophat":     dict(fit="perch", w=0.70, seat=0.6, sink=0.012, tilt=-7),
  "crown":      dict(fit="perch", w=0.65, seat=0.5, sink=0.012, tilt=-6),
  "partyhat":   dict(fit="perch", w=0.40, seat=0.6, sink=0.012, tilt=-8, dx=0.07, roll=14),
  "bow":        dict(fit="perch", w=0.45, seat=0.3, sink=0.015, tilt=-18, dy=0.04, orient=dict(yaw=-90)),
  "flower":     dict(fit="perch", w=0.30, seat=0.3, sink=0.012, tilt=-8, dx=0.14, roll=32, orient=dict(yaw=-90)),
  "headphones": dict(fit="band", ease=1.0, orient=dict(yaw=90)),
}
CLEARS = dict(wrap=0.014, perch=0.004, band=0.006, enclose=0.0)   # wrap leaves room for the pressed-flat hair
SHELL = 0.04    # only verts this deep inside the skull are slid out; deeper ones are hidden in the head and stay put
only = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(R)
rad = math.radians
def body(sex):
    bpy.ops.import_scene.gltf(filepath=BODY % sex)
    arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    head = bpy.data.objects["Head"]
    kb = head.data.shape_keys.key_blocks if head.data.shape_keys else {}
    if "Ear_Hide" in kb: kb["Ear_Hide"].value = 1   # the skull alone: ears pass through or are hidden, they never shape a hat
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); me = head.evaluated_get(dg).to_mesh()
    g = head.vertex_groups.get("mixamorig:Head")
    W = {v.index: max([e.weight for e in v.groups if e.group == g.index] or [0]) for v in head.data.vertices}
    pts = [head.matrix_world @ v.co for v in me.vertices if W.get(v.index, 0) > 0.5]
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(head.matrix_world); bvh = BVHTree.FromBMesh(bm)
    return arm, pts, bvh
def headinfo(pts):
    bot = min(p.z for p in pts); top = max(p.z for p in pts if abs(p.x) < 0.02)
    band = [p for p in pts if p.z > top - (top - bot) * 0.45 and p.z < top + 0.005]
    xs = sorted(abs(p.x) for p in band); half = xs[int(len(xs) * 0.97)]
    ys = [p.y for p in band if abs(p.x) < half * 0.5]
    return dict(top=top, bot=bot, h=top - bot, half=half, ymin=min(ys), ymax=max(ys))
def load_hat(kind, r):
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{kind}.glb")
    ms = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    orr = r.get("orient", {})
    bm.transform(Matrix.Rotation(rad(orr.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(orr.get("yaw", 0)), 4, "Z"))
    if r.get("cut"):   # drop what hangs under the hat (a chin cord)
        z0 = min(v.co.z for v in bm.verts); z1 = max(v.co.z for v in bm.verts); zc = z0 + (z1 - z0) * r["cut"]
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, zc)), plane_no=Vector((0, 0, -1)), clear_outer=True)
    bm.to_mesh(o.data); bm.free()
    d = o.modifiers.new("d", "DECIMATE"); d.ratio = min(1.0, 9000 / max(1, len(o.data.polygons)))
    bpy.ops.object.modifier_apply(modifier="d")
    m = o.modifiers.new("s", "CORRECTIVE_SMOOTH"); m.iterations = 4; m.smooth_type = "LENGTH_WEIGHTED"
    bpy.ops.object.modifier_apply(modifier="s")
    for p in o.data.polygons: p.use_smooth = True
    o.name = "Hat_" + kind
    for s in o.material_slots:
        if s.material: s.material.name = "cloth"
    return o
def bbox(hat):
    vs = [v.co for v in hat.data.vertices]
    return Vector([min(v[i] for v in vs) for i in range(3)]), Vector([max(v[i] for v in vs) for i in range(3)])
def xf(hat, M): hat.data.transform(M); hat.data.update()
def cavity(hat):
    """the hat's hollow, in a frame where the bbox floor is z 0: centre x,y, width, depth, crown-inside height (0 = no hollow found)"""
    a, b = bbox(hat); hgt = b.z - a.z
    hb = BVHTree.FromObject(hat, bpy.context.evaluated_depsgraph_get())
    cx, cy = (a.x + b.x) / 2, (a.y + b.y) / 2; W = D = dep = 0
    for _ in range(3):
        up = hb.ray_cast(Vector((cx, cy, a.z - 0.001)), Vector((0, 0, 1)))[0]
        dep = (up.z - a.z) if up is not None else 0
        if dep < hgt * 0.2: dep = 0; break
        o = Vector((cx, cy, a.z + dep * 0.3))
        h = [hb.ray_cast(o, Vector(d))[0] for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0))]
        if any(x is None for x in h): dep = 0; break
        W, D = h[0].x - h[1].x, h[2].y - h[3].y; cx, cy = (h[0].x + h[1].x) / 2, (h[2].y + h[3].y) / 2
    if not dep:   # a solid or flat-bottomed source: the rim band's outside, less its thickness
        rim = [v.co for v in hat.data.vertices if v.co.z < a.z + hgt * 0.1]
        x0, x1 = min(v.x for v in rim), max(v.x for v in rim); y0, y1 = min(v.y for v in rim), max(v.y for v in rim)
        W, D, cx, cy = (x1 - x0) * 0.88, (y1 - y0) * 0.88, (x0 + x1) / 2, (y0 + y1) / 2
    return cx, cy, a.z, W, D, dep, hgt
def push_out(hat, bvh, clear):
    me = hat.data; n = len(me.vertices); req = [None] * n; disp = [Vector((0, 0, 0)) for _ in range(n)]; cnt = 0
    for v in me.vertices:
        loc, nor, i, d = bvh.find_nearest(v.co)
        if loc is None: continue
        inside = (v.co - loc).dot(nor) < 0
        if (inside and d < SHELL) or (not inside and d < clear):
            req[v.index] = loc + nor * clear - v.co; disp[v.index] = req[v.index].copy(); cnt += 1
    nb = [[] for _ in range(n)]
    for e in me.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
    for _ in range(4):   # the push fades over the neighbours: no face is torn off its ring
        nd = []
        for i in range(n):
            if req[i] is not None or not nb[i]: nd.append(disp[i]); continue
            s = Vector((0, 0, 0))
            for j in nb[i]: s += disp[j]
            nd.append(s / len(nb[i]))
        disp = nd
    for v in me.vertices: v.co = v.co + disp[v.index]
    me.update(); return cnt
for sex in ("f", "m"):
    for kind in only:
        if not os.path.exists(f"{SRC}/{kind}.glb"): print("MISSING", kind); continue
        bpy.ops.wm.read_factory_settings(use_empty=True); arm, pts, bvh = body(sex); H = headinfo(pts); r = R[kind]; fit = r["fit"]
        hat = load_hat(kind, r)
        def oval(z, tol=0.012):
            sl = [p for p in pts if abs(p.z - z) < tol and p.y > -0.26]
            if len(sl) < 12: return None
            xs = sorted(abs(p.x) for p in sl); hw = xs[int(len(xs) * 0.98)]
            ys = [p.y for p in sl if abs(p.x) < hw * 0.5]
            return hw, min(ys), max(ys)
        ycen = (H["ymin"] + H["ymax"]) / 2; S = (1, 1, 1)
        if fit == "wrap":
            cx, cy, z0, W, D, dep, hgt = cavity(hat); xf(hat, Matrix.Translation(Vector((-cx, -cy, -z0))))
            zb = H["top"] - H["h"] * r["band"]; zr = zb; e = r.get("ease", 1.03)
            for _ in range(4):
                hw, y0, y1 = oval(zr) or oval(zb)
                sx, sy = 2 * hw * e / W, (y1 - y0) * e / D
                hi = max(sx, sy); lo = max(min(sx, sy), hi / 1.15); sx, sy = (hi, lo) if sx >= sy else (lo, hi); sz = (hi * lo) ** 0.5
                zr = max(zb, H["top"] + 0.01 - sz * dep) if dep else max(zb, H["top"] + 0.025 - sz * hgt)
            S = (sx, sy, sz)
            M = Matrix.Translation(Vector((r.get("dx", 0), (y0 + y1) / 2 + r.get("dy", 0), zr))) @ Matrix.Rotation(rad(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Diagonal(Vector((sx, sy, sz, 1)))
            xf(hat, M)
        elif fit == "enclose":
            a, b = bbox(hat); s = max(2 * H["half"] * r["ease"] / (b.x - a.x), H["h"] * 1.1 / (b.z - a.z)); S = (s, s, s)
            xf(hat, Matrix.Translation(Vector((0, ycen + r.get("dy", 0), H["top"] + r.get("lift", 0.04)))) @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(a.x + b.x) / 2, -(a.y + b.y) / 2, -b.z))))
        elif fit == "perch":
            a, b = bbox(hat); s = 2 * H["half"] * r["w"] / (b.x - a.x); S = (s, s, s)
            base = [v.index for v in hat.data.vertices if v.co.z < a.z + (b.z - a.z) * 0.08]
            xf(hat, Matrix.Rotation(rad(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(a.x + b.x) / 2, -(a.y + b.y) / 2, -a.z))))
            cx, cy = r.get("dx", 0), ycen + r.get("dy", 0); ds = []
            for i in base:
                c = hat.data.vertices[i].co
                loc = bvh.ray_cast(Vector((cx + c.x, cy + c.y, H["top"] + 1)), Vector((0, 0, -1)))[0]
                if loc is not None: ds.append(loc.z - c.z)
            ds.sort(reverse=True); rest = ds[min(len(ds) - 1, int(len(ds) * r.get("seat", 0)))] if ds else H["top"]
            xf(hat, Matrix.Translation(Vector((cx, cy, rest - r.get("sink", 0)))))
        else:   # band
            a, b = bbox(hat); xf(hat, Matrix.Translation(Vector((-(a.x + b.x) / 2, -(a.y + b.y) / 2, -a.z)))); hgt = b.z - a.z
            hb = BVHTree.FromObject(hat, bpy.context.evaluated_depsgraph_get())
            up = hb.ray_cast(Vector((0, 0, hgt * 0.3)), Vector((0, 0, 1)))[0]; zt = up.z if up is not None else hgt * 0.92
            zq = hgt * 0.22; hx = [hb.ray_cast(Vector((0, 0, zq)), Vector(d))[0] for d in ((1, 0, 0), (-1, 0, 0))]
            g = (hx[0].x - hx[1].x) if all(x is not None for x in hx) else (b.x - a.x) * 0.75
            s = 2 * H["half"] / g
            for _ in range(4):
                zc = H["top"] + 0.006 - s * (zt - zq); ov = oval(zc, 0.02) or (H["half"], 0, 0); s = 2 * ov[0] * r.get("ease", 1) / g
            S = (s, s, s)
            xf(hat, Matrix.Translation(Vector((0, ycen + r.get("dy", 0), H["top"] + 0.006 - s * zt))) @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Scale(s, 4))
        pushed = push_out(hat, bvh, CLEARS[fit]) if CLEARS[fit] else 0
        for o in list(bpy.context.scene.objects):
            if o.type == "MESH" and o != hat: bpy.data.objects.remove(o)
        if arm.animation_data: arm.animation_data.action = None
        for ac in list(bpy.data.actions): bpy.data.actions.remove(ac)
        g = hat.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hat.data.vertices))), 1.0, "REPLACE")
        hat.parent = arm; hat.modifiers.new("skin", "ARMATURE").object = arm
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{kind}-{sex}.glb", export_skins=True, export_animations=False, export_apply=False)
        a, b = bbox(hat)
        print("HAT", kind, sex, "scale", [round(x, 3) for x in S], "ratio", round(max(S) / min(S), 3), "z", round(a.z, 3), round(b.z, 3), "headtop", round(H["top"], 3), "pushed", pushed, "tris", sum(len(p.vertices) - 2 for p in hat.data.polygons))
