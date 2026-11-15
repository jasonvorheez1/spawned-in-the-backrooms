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
  "cap":        dict(fit="wrap", band=0.30, ease=0.96, tilt=-14, at=0.5, rim="back"),
  "beanie":     dict(fit="wrap", band=0.52, ease=0.99, tilt=-8, at=0.12, squash=1.0, orient=dict(roll=13)),   # Shelly Nov 13 "mesh fitting": it rode high off the skull; cuff now down at the brow, snug
  "souwester":  dict(fit="wrap", band=0.40, ease=1.04, tilt=-12, at=0.6, rim="wide", cut="auto"),   # cut: the chin cord under the brim
  "chitinhelm": dict(fit="wrap", band=0.40, ease=1.05, tilt=-4, orient=dict(yaw=-90)),
  "beret":      dict(fit="perch", w=1.12, seat=1.0, sink=0.045, tilt=-10, roll=10, dx=0.02),   # soft and wider than its band: sized whole, set down on the dome, rolled to one side
  "divehelm":   dict(fit="enclose", ease=1.2, lift=0.05, tilt=-16, orient=dict(yaw=-90)),
  "tophat":     dict(fit="perch", w=0.70, seat=0.6, sink=0.012, tilt=-7),
  "crown":      dict(fit="perch", w=0.65, seat=0.5, sink=0.012, tilt=-6),
  "partyhat":   dict(fit="perch", w=0.40, seat=0.6, sink=0.012, tilt=-8, dx=0.07, roll=14),
  "bow":        dict(fit="perch", w=0.45, seat=1.0, sink=0.035, tilt=-58, dy=0.07, orient=dict(yaw=-90)),   # Shelly Nov 12 "doesnt fit her head": it stood upright on its knot over the hair; now laid back on the crown, knot sunk in the hair
  "flower":     dict(fit="perch", w=0.30, seat=0.3, sink=0.012, tilt=-8, dx=0.14, roll=32, orient=dict(yaw=-90)),
  "headphones": dict(fit="band", ease=1.0, orient=dict(yaw=90)),
  "wwhelmet":   dict(fit="wrap", band=0.50, ease=1.08, tilt=-4, at=0.55, rim="wide", squash=1.15, orient=dict(yaw=180)),   # Shelly Nov 13 "wearing the helmet backwards": Tripo shell came in front on +Y   # Nov 13 refit 2: rode high and flat on the crown (Shelly "your fitting is bad"); rim down at the brow, rounder shell   # at: the Tripo shell has a padded liner, so the cavity probe read a tiny hole and blew it up to 3 m (Shelly Nov 13 "your fitting is bad")   # Nov 13 M.E.G. Wild Warriors helmet (Tripo): a combat shell down to the brow
  "bntgcap":    dict(fit="wrap", band=0.32, ease=0.98, tilt=-12, at=0.5, rim="back"),   # Nov 13 B.N.T.G. courier flat cap (Tripo), brass scale badge front
  "cowboy":     dict(fit="perch", w=1.38, seat=0.5, sink=0.012, tilt=-3),   # Nov 15 refit: at w 1.95 the crown opening was as wide as the skull and the hat dropped to the eyes; now the opening sits on the upper dome, brim level   # Nov 15 Backrooms Robotics gunslingers (art/cowboy-hat/build.py): pinched crown, sides rolled up
  "hachimaki":  dict(fit="wrap", band=0.30, ease=1.0, tilt=-6, at=0.5, squash=3.2, ring=True),   # Nov 15 Kyoto Dreams headband (Tripo): a cloth band hugging the brow, knot at the back; under the ears' roots so any haircut or ribbon rides over it
  "pilgrimhat": dict(fit="perch", w=1.75, seat=0.85, sink=0.07, tilt=-8),   # Nov 12 Brother Wat: felt pilgrim hat, scallop shell on the front; wrap sank the brim over the eyes
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
        zs = [v.co.z for v in bm.verts]; z0 = min(zs); z1 = max(zs)
        if r["cut"] == "auto":   # the thin slices under the hat hold few verts: cut below the first full one
            NB = 40; cnt = [0] * NB
            for z in zs: cnt[min(NB - 1, int((z - z0) / (z1 - z0) * NB))] += 1
            nz = sorted(c for c in cnt if c); med = nz[len(nz) // 2]
            i = next((i for i in range(NB - 1) if cnt[i] >= med * 0.3 and cnt[i + 1] >= med * 0.3), 0)
            zc = z0 + (z1 - z0) * i / NB; print("CUT", kind, round(i / NB, 3))
        else: zc = z0 + (z1 - z0) * r["cut"]
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
            if r.get("at") is not None:   # the shell's own width at a set height, less its thickness; the rim plane by `rim`
                a, b = bbox(hat); hgt = b.z - a.z; vs = [v.co for v in hat.data.vertices]
                tol = 0.04; sl = []
                while len(sl) < 8 and tol < 0.3:   # a low-poly crown wall has few verts at one height: widen the band till it holds a ring
                    sl = [v for v in vs if abs(v.z - (a.z + hgt * r["at"])) < hgt * tol]; tol *= 1.6
                x0, x1 = min(v.x for v in sl), max(v.x for v in sl); yy0, yy1 = min(v.y for v in sl), max(v.y for v in sl)
                cx, cy, W, D, dep = (x0 + x1) / 2, (yy0 + yy1) / 2, (x1 - x0) * 0.92, None, 0
                if r.get("rim") == "back": z0 = min(v.z for v in vs if v.y > cy + (yy1 - cy) * 0.3)
                elif r.get("rim") == "wide":
                    best = (0, a.z)
                    for i in range(30):
                        zz = a.z + hgt * (i + 0.5) / 30; bx = [v.x for v in vs if abs(v.z - zz) < hgt / 60]
                        if bx and max(bx) - min(bx) > best[0]: best = (max(bx) - min(bx), zz)
                    z0 = best[1]
                else: z0 = a.z
                hgt = b.z - z0
            else: cx, cy, z0, W, D, dep, hgt = cavity(hat)
            xf(hat, Matrix.Translation(Vector((-cx, -cy, -z0))))
            zb = H["top"] - H["h"] * r["band"]; zr = zb; e = r.get("ease", 1.03)
            for _ in range(4):
                hw, y0, y1 = oval(zr) or oval(zb)
                if D is None: sx = sy = 2 * hw * e / W; sz = sx / r.get("squash", 1)
                else:
                    sx, sy = 2 * hw * e / W, (y1 - y0) * e / D
                    hi = max(sx, sy); lo = max(min(sx, sy), hi / 1.15); sx, sy = (hi, lo) if sx >= sy else (lo, hi); sz = (hi * lo) ** 0.5
                zr = zb if r.get("ring") else max(zb, H["top"] + 0.01 - sz * dep) if dep else max(zb, H["top"] + 0.025 - sz * hgt)   # ring: a headband has no crown to rest, its lower edge sits on the band line
            S = (sx, sy, sz)
            M = Matrix.Translation(Vector((r.get("dx", 0), (y0 + y1) / 2 + r.get("dy", 0), zr))) @ Matrix.Rotation(rad(r.get("roll", 0)), 4, "Y") @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Diagonal(Vector((sx, sy, sz, 1)))
            xf(hat, M)
        elif fit == "enclose":
            a, b = bbox(hat); s = 2 * H["half"] * r["ease"] / (b.x - a.x); S = (s, s, s)
            xf(hat, Matrix.Translation(Vector((0, ycen + r.get("dy", 0), H["top"] + r.get("lift", 0.04)))) @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(a.x + b.x) / 2, -(a.y + b.y) / 2, -b.z))))
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
            up = hb.ray_cast(Vector((0, 0, hgt * 0.3)), Vector((0, 0, 1)))[0]; zt = up.z if up is not None and up.z > hgt * 0.6 else hgt * 0.93
            zq = hgt * 0.22; hx = [hb.ray_cast(Vector((0, 0, zq)), Vector(d))[0] for d in ((1, 0, 0), (-1, 0, 0))]
            g = (b.x - a.x) * 0.72   # the gap between the cups: the outside width less two cups
            s = 2 * H["half"] / g
            for _ in range(4):
                zc = H["top"] + 0.006 - s / 1.15 * (zt - zq); ov = oval(zc, 0.02) or (H["half"], 0, 0); s = 2 * ov[0] * r.get("ease", 1) / g
            S = (s, s, s / 1.15); print("CUPS z", round(H["top"] + 0.006 - s / 1.15 * (zt - zq), 3), "head", round(H["bot"], 3), round(H["top"], 3))
            xf(hat, Matrix.Translation(Vector((0, ycen + r.get("dy", 0), H["top"] + 0.006 - s / 1.15 * zt))) @ Matrix.Rotation(rad(r.get("tilt", 0)), 4, "X") @ Matrix.Diagonal(Vector((s, s, s / 1.15, 1))))
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
