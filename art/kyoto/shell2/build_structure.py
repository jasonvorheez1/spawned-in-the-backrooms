# Level 178 shell, structure pass 2: real carpentry at the old kit's exact frames.
# blender -b --factory-startup --python-exit-code 1 --python art/kyoto/shell2/build_structure.py -- [module ...]
import sys, os, math, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from kit import reset, mat, B, M, finish, blob
import bpy, bmesh
from mathutils import Vector, Matrix, noise
OUT = "/workspace/kyoto/shell2/glb"; PROOF = "/workspace/kyoto/shell2/proof"; os.makedirs(OUT, exist_ok=True); os.makedirs(PROOF, exist_ok=True)
V3 = lambda *a: Vector(a[0] if len(a) == 1 else a)
def Bd(v): return Vector((v[0], -v[2], v[1]))
def frame_axes(d, up):
    d = d.normalized(); s = Vector(up).cross(d)
    if s.length < 1e-6: s = Vector((0, 0, 1)).cross(d)
    s.normalize(); return d, s, d.cross(s).normalized()
def obj(bm, m, sa=40, name="p"):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); me.materials.append(mat(m)); o["node"] = "body"; o["sa"] = sa
    for p in me.polygons: p.use_smooth = True
    return o
def sweep(m, prof, p0, p1, up=(0, 1, 0), closed=True, caps=True, seg=1, taper=0.0, wob=0.0, tile=None, inside=(0, 0), seed=None, sa=40, ends=True):
    """profile [(a, b)] across (side, up) swept p0 -> p1 (engine coords); u runs with the grain."""
    P0, P1 = Vector(p0), Vector(p1); L = (P1 - P0).length; d, s, u = frame_axes(P1 - P0, up)
    tile = tile or M[m][1]; rnd = random.Random(seed if seed is not None else random.random()); ox, oy = rnd.random() * 7, rnd.random() * 7
    n = len(prof); bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap"); rings = []
    for k in range(seg + 1):
        t = k / seg; c = P0 + (P1 - P0) * t
        if wob: c = c + s * wob * noise.noise(Vector((t * 2.3 + ox, oy, .5))) + u * wob * noise.noise(Vector((oy, t * 2.3 + ox, 1.5)))
        sc = 1 - taper * t; rings.append([bm.verts.new(B(c + s * (a * sc) + u * (b * sc))) for a, b in prof])
    per = [0.0]
    for i in range(1, n + (1 if closed else 0)): per.append(per[-1] + (Vector(prof[i % n]) - Vector(prof[i - 1])).length)
    ins = Vector(inside)
    for i in range(n if closed else n - 1):
        j = (i + 1) % n; e = Vector(prof[j]) - Vector(prof[i]); n2 = Vector((e.y, -e.x)); mid = (Vector(prof[i]) + Vector(prof[j])) / 2
        if n2.dot(mid - ins) < 0: n2 = -n2
        n3 = Bd(s * n2.x + u * n2.y)
        for k in range(seg):
            vs = (rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]); u0, u1 = k / seg * L / tile + ox, (k + 1) / seg * L / tile + ox
            uv = {vs[0]: (u0, per[i] / tile + oy), vs[1]: (u0, per[i + 1] / tile + oy), vs[2]: (u1, per[i + 1] / tile + oy), vs[3]: (u1, per[i] / tile + oy)}
            f = bm.faces.new(vs); f.normal_update()
            if f.normal.dot(n3) < 0: f.normal_flip()
            for l in f.loops: l[uvl].uv = uv[l.vert]
    if closed and caps:
        for k, sg in ((0, -1), (seg, 1)):
            f = bm.faces.new(rings[k]); f.normal_update()
            if f.normal.dot(Bd(d * sg)) < 0: f.normal_flip()
            for l in f.loops:   # end grain: the board's fibres squeezed into fine rings
                a, b = prof[rings[k].index(l.vert)]; l[uvl].uv = (a * .18 / tile + ox + 3, b * 2.5 / tile + oy)
    return obj(bm, m, sa)
def ch(w, h, c, top_only=False):
    c = min(c, w * .3, h * .3)
    if top_only: return [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2 - c), (w / 2 - c, h / 2), (-w / 2 + c, h / 2), (-w / 2, h / 2 - c)]
    return [(-w / 2 + c, -h / 2), (w / 2 - c, -h / 2), (w / 2, -h / 2 + c), (w / 2, h / 2 - c), (w / 2 - c, h / 2), (-w / 2 + c, h / 2), (-w / 2, h / 2 - c), (-w / 2, -h / 2 + c)]
def circ(r, n=12, ry=None): return [(r * math.cos(2 * math.pi * i / n), (ry or r) * math.sin(2 * math.pi * i / n)) for i in range(n)]
def rrect(w, h, r, n=3, tl=True, tr=True, bl=False, br=False):
    pts = []
    for (cx, cy, a0, on) in ((w / 2 - r, -h / 2 + r, -90, br), (w / 2 - r, h / 2 - r, 0, tr), (-w / 2 + r, h / 2 - r, 90, tl), (-w / 2 + r, -h / 2 + r, 180, bl)):
        if on: pts += [(cx + r * math.cos(math.radians(a0 + 90 * i / n)), cy + r * math.sin(math.radians(a0 + 90 * i / n))) for i in range(n + 1)]
        else:
            ccx, ccy = cx + r * math.cos(math.radians(a0 + 45)) * 1.4142, cy + r * math.sin(math.radians(a0 + 45)) * 1.4142; pts.append((ccx, ccy))
    return pts
def timber(m, p0, p1, w, h, up=(0, 1, 0), c=.007, seg=3, taper=.004, wob=.0012, **k):
    return sweep(m, ch(w, h, c), p0, p1, up, seg=seg, taper=taper, wob=wob, **k)
def prism(m, poly, x0, x1, bevel=.005, grain="z", sa=40):
    """poly [(z, y)] extruded across engine x from x0 to x1"""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(B((x0, y, z))) for z, y in poly])
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); vs = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((x1 - x0, 0, 0)), verts=vs); o = finish(bm, "pr", m, grain, "body", bevel); o["sa"] = sa
    for p in o.data.polygons: p.use_smooth = True
    return o
def stone(sx, sy, sz, at, amp=.008, seed=0, m="stone"):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(sx, sz, sy), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(.03, sy * .2), segments=2, affect="EDGES", clamp_overlap=True)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if e.calc_length() > .25], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        if v.co.z < -sy / 2 + 1e-4: continue
        nrm = Vector((v.co.x / sx, v.co.y / sz, v.co.z / sy)).normalized(); q = v.co * 3.1 + Vector((seed, seed * .7, 0))
        v.co += nrm * amp * (noise.noise(q) + .5 * noise.noise(q * 3))
    bmesh.ops.translate(bm, vec=B((at[0], at[1] + sy / 2, at[2])), verts=bm.verts)
    o = finish(bm, "st", m, "x", "body", 0); o["sa"] = 55
    for p in o.data.polygons: p.use_smooth = True
    return o
def clip_mitre(objs):
    for o in objs:
        bm = bmesh.new(); bm.from_mesh(o.data)
        for no in ((1, -1, 0), (-1, -1, 0)):
            bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), plane_co=(0, 0, 0), plane_no=no, clear_outer=True)
        bm.to_mesh(o.data); bm.free()
# ---------------------------------------------------------------- export + proof
def strip_images():
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
        for n in [n for n in nt.nodes if n.type == "TEX_IMAGE"]:
            px = list(n.image.pixels[:])[::97]; c = [sum(px[i::4]) / max(1, len(px[i::4])) for i in range(3)] if px else (.5, .5, .5)
            if b: b.inputs["Base Color"].default_value = (*c, 1)
            nt.nodes.remove(n)
def shoot(name, views):
    sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = 900, 640; sc.cycles.samples = 16
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun); sun.data.energy = 3.2; sun.rotation_euler = (math.radians(48), 0, math.radians(30))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    for i, (eye, tgt, lens) in enumerate(views):
        cam.data.lens = lens; cam.location = B(eye); cam.rotation_euler = (B(tgt) - B(eye)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"{PROOF}/{name}_{i}.png"; bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True); bpy.data.objects.remove(sun, do_unlink=True)
def export(name, views, embed=False):
    sc = bpy.context.scene; obs = [o for o in sc.objects if o.type == "MESH"]
    for o in obs: o.data.set_sharp_from_angle(angle=math.radians(o.get("sa", 40)))
    shoot(name, views)
    if not embed: strip_images()
    else:
        for im in bpy.data.images:
            if im.size[0] > 256: im.scale(256, 256)
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active; ob.name = name
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(ob.data); bm.free()
    ob.data.calc_loop_triangles(); vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    lo = [min(v[i] for v in vs) for i in range(3)]; hi = [max(v[i] for v in vs) for i in range(3)]
    path = f"{OUT}/{name}.glb"
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True, export_yup=True, export_image_format="JPEG", export_jpeg_quality=80,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7, export_draco_position_quantization=14,
        export_draco_normal_quantization=10, export_draco_texcoord_quantization=12)
    print("MOD", name, "tris", len(ob.data.loop_triangles), "min", [round(lo[0], 3), round(lo[2], 3), round(-hi[1], 3)], "max", [round(hi[0], 3), round(hi[2], 3), round(-lo[1], 3)], "kb", os.path.getsize(path) // 1024, "slots", [m.name for m in ob.data.materials])
# ---------------------------------------------------------------- modules
def roofY(d): return 2.9 + (d - 6.5) * 0.303 if d <= 13.1 else 4.9 - (d - 13.1) * 0.303
def tatami_mat(cx, cz, rot=False):
    L, Wd, T = 1.816, .906, .03; ax = Vector((0, 0, 1)) if rot else Vector((1, 0, 0)); sd = Vector((1, 0, 0)) if rot else Vector((0, 0, 1)); C = Vector((cx, 0, cz))
    # the rush body: rounded at the cut ends, crowned a hair
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(L if not rot else Wd, Wd if not rot else L, T), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, T / 2), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if all(v.co.z > T * .9 for v in e.verts)], offset=.007, segments=3, profile=.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.translate(bm, vec=B(C), verts=bm.verts); o = finish(bm, "tat", "tatami", "z" if rot else "x", "body", 0); o["sa"] = 50
    for p in o.data.polygons: p.use_smooth = True
    # heri: brocade wrapped over each long edge, standing 2.5 mm proud
    e = Wd / 2
    prof = [(e - .036, .028), (e - .035, .0318), (e - .031, .0334), (e - .012, .0336), (e - .003, .0328), (e + .0012, .029), (e + .0016, .016), (e + .0012, .001)]
    for sg in (-1, 1):
        pr = [(a * sg, b) for a, b in prof]; p0 = C - ax * (L / 2 + .001); p1 = C + ax * (L / 2 + .001)
        up = (0, 1, 0)
        # side vector of sweep along +x is -z; flip the profile so it lands on the right edge
        d, s, u = frame_axes(p1 - p0, up); f = 1 if s.dot(sd) > 0 else -1
        sweep("border", [(a * f, b) for a, b in pr], p0, p1, closed=False, inside=(0, -1), tile=.5, sa=60)
def build_tatami():
    reset(); tatami_mat(0, 0)
    export("tatami", [((.9, .5, .9), (.1, 0, 0), 40), ((-.75, .12, .62), (-.85, .02, .42), 50)], embed=True)
def build_tatami8():
    reset()
    for cx, cz, r in ((-.91, -1.365, 0), (.91, -1.365, 0), (-1.365, 0, 1), (1.365, 0, 1), (0, -.455, 0), (0, .455, 0), (-.91, 1.365, 0), (.91, 1.365, 0)): tatami_mat(cx, cz, r)
    export("tatami8", [((2.6, 2.2, 2.9), (0, 0, 0), 35), ((.5, .22, -.25), (.1, .02, -.6), 45)])
def build_floor():
    reset(); rnd = random.Random(178)
    ws = [rnd.uniform(.13, .23) for _ in range(44)]; tot = 0; rows = []
    for w in ws:
        if tot + w > 7.8 - .1: rows.append(7.8 - tot); break
        rows.append(w); tot += w
    z = -3.9
    for w in rows:
        cuts = [-1.82] + ([rnd.uniform(-1.3, 1.3)] if rnd.random() < .7 else []) + [1.82]
        for a, b in zip(cuts, cuts[1:]):
            sweep("wood_dark", ch(w - .001, .04, .0035, top_only=True), (a + .0005, .43, z + w / 2), (b - .0005, .43, z + w / 2), seg=1, wob=0)
        z += w
    # dodai sills on the stone plinth, the stone set back with its joints showing
    for sz in (-1, 1): timber("wood_dark", (-1.82, .36, sz * 3.84), (1.82, .36, sz * 3.84), .12, .1, c=.008, seg=2, wob=.0008)
    for sx in (-1, 1): timber("wood_dark", (sx * 1.76, .36, -3.78), (sx * 1.76, .36, 3.78), .12, .1, c=.008, seg=4, wob=.0008)
    for i, (z0, z1) in enumerate(((-3.88, -1.3), (-1.28, 1.3), (1.32, 3.88))):
        stone(3.6, .31, z1 - z0, (0, 0, (z0 + z1) / 2), .009, seed=i * 3)
    export("floor", [((4.2, 2.3, 5.2), (0, .3, 0), 30), ((2.4, .9, 4.6), (1.4, .38, 3.6), 40)])
def build_ceiling():
    reset(); rnd = random.Random(29)
    ws = []; tot = 0
    while tot < 3.64 - .55: w = rnd.uniform(.36, .52); ws.append(w); tot += w
    ws.append(3.64 - tot); x = -1.82
    for i, w in enumerate(ws):   # hagasane: each board laps the next, its lower edge eased
        y = .006 if i % 2 else 0
        sweep("wood_mid", ch(w + .014, .011, .0025), (x + w / 2, y + .0055, -3.9), (x + w / 2, y + .0055, 3.9), seg=1, tile=1.4)
        x += w
    for i in range(17):   # sao battens every 0.46 m
        zc = -3.9 + 7.8 / 17 * (i + .5)
        timber("wood_dark", (-1.76, -.02, zc), (1.82, -.02, zc), .034, .04, c=.006, seg=3, taper=0, wob=.0008)
    # mawaribuchi cornice: a two-stepped moulding along the wall, eased arrises
    poly = [(-1.88, .0), (-1.76, .0), (-1.76, -.07), (-1.775, -.085), (-1.79, -.085), (-1.79, -.155), (-1.80, -.18), (-1.88, -.18)]
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(B((xx, y, -3.9))) for xx, y in poly])
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); vs = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=B((0, 0, 7.8)) - B((0, 0, 0)), verts=vs); o = finish(bm, "mb", "wood_dark", "z", "body", .004); o["sa"] = 35
    for p in o.data.polygons: p.use_smooth = True
    export("ceiling", [((2.2, -2.2, 3.4), (0, 0, .8), 30), ((-.6, -.7, 2.3), (-1.6, -.05, 1.6), 40)])
def build_engawa():
    reset(); rnd = random.Random(8)
    n = 18; pw = 2.2 / n
    for i in range(n):
        zc = -1.1 + pw * (i + .5); cuts = [-1.2] + ([rnd.uniform(-.8, .8)] if i % 4 == 2 else []) + [1.2]
        for a, b in zip(cuts, cuts[1:]):
            if i == 0:   # the nosing board: rounded over the garden edge
                pr = rrect(pw - .001 + .02, .035, .014, 4, tl=False, tr=True)
                pr = [(-aa, bb) for aa, bb in pr]   # rounded corner toward the garden (-z)
                sweep("wood_wet", pr, (a + .0005, .4325, zc - .01), (b - .0005, .4325, zc - .01), seg=1, inside=(0, 0))
            else: sweep("wood_wet", ch(pw - .001, .035, .003, top_only=True), (a + .0005, .4325, zc), (b - .0005, .4325, zc), seg=1)
    timber("wood_dark", (-1.2, .36, -1.045), (1.2, .36, -1.045), .09, .11, c=.008, seg=3, wob=.001)           # engeta edge beam
    for zc in (-.55, .1, .75): timber("wood_dark", (-1.2, .385, zc), (1.2, .385, zc), .07, .06, c=.006, seg=2)  # neda joists
    for x in (0.0,):
        stone(.26, .1, .24, (x, -.02, -1.0), .012, seed=4); timber("wood_dark", (x, .08, -1.0), (x, .305, -1.0), .09, .09, up=(0, 0, 1), c=.008, seg=1, wob=0)
    stone(2.4, .31, 1.6, (0, -.01, .3), .01, seed=9)                                                             # set-back stone plinth
    blob(.16, (-1.2, .03, -1.0), "stone", (1, .45, 1), .15, seed=3)
    sweep("wood_mid", circ(.078, 16), (-1.2, .07, -1.0), (-1.2, 2.88, -1.0), up=(0, 0, 1), seg=6, taper=.08, wob=.004, sa=60)   # round post on its footing stone
    sweep("wood_mid", circ(.082, 16, .086), (-1.2, 2.87, -1.0), (1.2, 2.87, -1.0), seg=6, wob=.005, sa=60, tile=1.6)            # keta beam log
    def ry(z): return roofY(z + 8.1)
    k = .303; nrm = Vector((0, 1, k)).normalized()   # roof rises toward +z here
    for i in range(8):   # taruki every 0.3 m, tails running out to the eave
        x = -1.05 + .3 * i; z0, z1 = -1.585, 1.1
        p0 = Vector((x, ry(z0) - .074, z0)) - nrm * .03; p1 = Vector((x, ry(z1) - .074, z1)) - nrm * .03
        timber("wood_dark", p0, p1, .045, .06, up=nrm, c=.006, seg=3, taper=0, wob=.001)
    z = -1.6
    while z < 1.1 - 1e-3:   # nojiita boards on the rafters, seams showing between them
        w = min(rnd.uniform(.17, .23), 1.1 - z); zc = z + w / 2
        sweep("wood_mid", ch(2.4, .012, .002), (-1.2, ry(zc) - .068, zc), (1.2, ry(zc) - .068, zc), up=nrm, seg=1, tile=1.4)
        z += w + .0
    export("engawa", [((3.2, 2.6, -4.2), (0, .9, 0), 30), ((-.3, .95, -2.4), (-.9, .45, -1.0), 38), ((.6, 1.7, -2.3), (0, 2.8, -1.0), 30)])
def build_stair():
    reset()
    k = 1.4 / 1.82
    for i in range(7):   # treads with nosing, risers set back, housed between the stringers
        top = .2 * (i + 1); zf = .131 - i * .26
        sweep("wood_mid", rrect(.27, .03, .008, 3, tl=False, tr=True), (-.42, top - .015, zf - .135), (.42, top - .015, zf - .135), seg=1)
    for i in range(8):
        top = .2 * (i + 1); zf = .131 - i * .26 - .022; y0 = top - .2 if i else 0
        sweep("wood_dark", ch(.012, .2 - (.03 if i < 7 else 0), .002), (-.42, y0, zf - .006), (.42, y0, zf - .006), seg=1) if False else None
        timber("wood_dark", (-.42, (y0 + top - .03) / 2, zf - .006), (.42, (y0 + top - .03) / 2, zf - .006), .012, top - .03 - y0, c=.002, seg=1, taper=0, wob=0)
    for sx in (-1, 1):   # stringers
        prism("wood_dark", [(.131, 0), (.131, .25), (-1.95, 1.80), (-1.95, 1.50), (.001, 0)], sx * .45 - (.03 if sx > 0 else 0), sx * .45 + (0 if sx > 0 else .03), .005)
    # landing: a planked box on corner posts
    for x in (-.405, .405):
        for z in (-1.995, -2.905): timber("wood_dark", (x, 0, z), (x, 1.6, z), .09, .09, up=(0, 0, 1), c=.008, seg=3, wob=.001)
    for z in (-1.995, -2.905): timber("wood_dark", (-.45, 1.5, z), (.45, 1.5, z), .09, .12, c=.008)
    for x in (-.405, .405): timber("wood_dark", (x, 1.5, -1.95), (x, 1.5, -2.95), .09, .12, c=.008)
    for i in range(5): sweep("wood_mid", ch(.199, .03, .003, top_only=True), (-.45, 1.585, -1.95 - .2 * (i + .5)), (.45, 1.585, -1.95 - .2 * (i + .5)), seg=1)
    for side, n in (("x", 5), ("z", 4)):
        for sg in (-1, 1) if side == "x" else (1,):
            for j in range(n):
                if side == "x": zc = -1.95 - 1.0 * (j + .5) / n; timber("wood_mid", (sg * .44, 0, zc), (sg * .44, 1.44, zc), 1.0 / n - .004, .018, up=(1, 0, 0), c=.003, seg=1, taper=0, wob=0)
                else: xc = -.36 + .72 * (j + .5) / n; timber("wood_mid", (xc, 0, -2.94), (xc, 1.44, -2.94), .72 / n - .004, .018, up=(0, 0, 1), c=.003, seg=1, taper=0, wob=0)
    for sg in (-1, 1): timber("wood_dark", (sg * .45, .9, -1.95), (sg * .45, .9, -2.95), .025, .05, c=.004)   # battens over the board joints
    # handrail up the open side
    timber("wood_dark", (.405, 0, .04), (.405, 1.07, .04), .07, .07, up=(0, 0, 1), c=.007, seg=2)
    sweep("wood_dark", circ(.03, 4), (.405, 1.07, .04), (.405, 1.07, .065), up=(0, 0, 1), seg=1)
    timber("wood_dark", (.405, 1.6, -1.995), (.405, 2.4, -1.995), .09, .09, up=(0, 0, 1), c=.008, seg=1)
    r0, r1 = Vector((.405, 1.04, .04)), Vector((.405, 2.36, -1.995))
    sweep("wood_mid", rrect(.05, .045, .015, 3, True, True, True, True), r0, r1, seg=4, wob=.001, sa=55)
    timber("wood_dark", r0 + Vector((0, -.45, 0)), r1 + Vector((0, -.45, 0)), .03, .04, c=.005, seg=2)
    export("stair", [((2.4, 2.4, 1.4), (0, .9, -1.3), 32), ((-1.6, 2.0, -.2), (0, .9, -1.5), 32)], embed=True)
def build_roof():
    reset(); L = 18.2; P = .3
    def f(x): t = 2 * math.pi * x / P; return .03 * math.sin(t) + .009 * math.sin(2 * t)
    sheets = []
    for (eave, ridge, sp, dsign) in (((2.9, -6.5), (4.9, -13.1), .3, 1), ((roofY(17.7), -17.7), (4.9, -13.1), .42, -1)):
        E = Vector((0, eave[0], eave[1])); R = Vector((0, ridge[0], ridge[1])); S = (R - E); sl = S.length; S.normalize()
        Nn = Vector((0, abs(S.z), abs(S.y) * (1 if dsign > 0 else -1))).normalized()
        if Nn.y < 0: Nn = -Nn
        nc = int(sl / sp + .999)
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
        for k in range(nc):
            s0 = k * sp; s1 = min(sl + .05, s0 + sp + .05)
            dmax = max(abs((E + S * s).z) for s in (s0, s1)) + .35; nx = int(2 * dmax / P * 4) + 1
            xs = [-dmax + i * P / 4 for i in range(nx)]
            row0 = [bm.verts.new(B(E + S * s0 + Nn * (f(x) + .028) + Vector((x, 0, 0)))) for x in xs]
            row1 = [bm.verts.new(B(E + S * s1 + Nn * (f(x) + .0) + Vector((x, 0, 0)))) for x in xs]
            lip = [bm.verts.new(B(E + S * s0 + Nn * (f(x) - .004) + Vector((x, 0, 0)))) for x in xs] if k == 0 else None
            for i in range(nx - 1):
                fc = bm.faces.new((row0[i], row0[i + 1], row1[i + 1], row1[i])); fc.normal_update()
                if fc.normal.dot(Bd(Nn)) < 0: fc.normal_flip()
                for l in fc.loops:
                    co = l.vert.co; l[uvl].uv = (co.x / 1.2, (s0 if l.vert in row0 else s1) / 1.2 + k * .37)
                if lip:
                    fc = bm.faces.new((lip[i], lip[i + 1], row0[i + 1], row0[i])); fc.normal_update()
                    if fc.normal.dot(Bd(-S)) < 0: fc.normal_flip()
                    for l in fc.loops: l[uvl].uv = (l.vert.co.x / 1.2, l.vert.co.z / 1.2)
        sheets.append(obj(bm, "kawara", 70, "tiles"))
        # underside boards and fascia
        dmax = max(abs(E.z), abs(R.z)) + .5
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
        vs = [bm.verts.new(B(p)) for p in (E + Vector((-dmax, 0, 0)) - Nn * .05, E + Vector((dmax, 0, 0)) - Nn * .05, R + Vector((dmax, 0, 0)) - Nn * .05, R + Vector((-dmax, 0, 0)) - Nn * .05)]
        fc = bm.faces.new(vs); fc.normal_update()
        if fc.normal.dot(Bd(-Nn)) < 0: fc.normal_flip()
        for l in fc.loops: l[uvl].uv = (l.vert.co.x / 1.4, l.vert.co.y / 1.4)
        sheets.append(obj(bm, "wood_dark", 30, "soffit"))
        fz = E.z + (.035 if dsign > 0 else -.035) * (1 if E.z > -10 else 1)
        sheets.append(timber("wood_dark", (-abs(E.z) - .5, E.y - .07, E.z + (.02 if dsign > 0 else -.02)), (abs(E.z) + .5, E.y - .07, E.z + (.02 if dsign > 0 else -.02)), .035, .12, c=.006, seg=6, taper=0, wob=.002))
        # nokigawara: a round tomoe end on every roll, a karakusa lip between
        d0 = abs(E.z); x = -d0 + P / 4
        while x < d0 - .06:
            xr = round((x - P / 4) / P) * P + P / 4
            if abs(xr) < d0 - .06:
                c = E + Nn * (f(xr) + .006) + Vector((xr, 0, 0)) - S * .015
                sweep("kawara", circ(.052, 10), c, c - S * .03 + Vector((0, -.006, 0)), up=(0, 1, 0), seg=1, tile=.4, sa=50)
                sweep("kawara", circ(.03, 8), c - S * .03, c - S * .036, up=(0, 1, 0), seg=1, tile=.4, sa=50)
            x += P
        # taruki under the outer eave
        if dsign < 0:
            for i in range(int(2 * L / .3)):
                xx = -L + .3 * (i + .5)
                if abs(xx) > abs(E.z) - .1: continue
                p0 = E - Nn * .085 + Vector((xx, 0, 0)) + S * .02; p1 = p0 + S * .95
                timber("wood_dark", p0, p1, .045, .06, up=Nn, c=.006, seg=1, taper=0, wob=0)
    clip_mitre(sheets)
    # ridge: three courses of noshi tile under a round crown, tile by tile
    def ridge(p0, p1, base_up=(0, 1, 0)):
        p0, p1 = Vector(p0), Vector(p1); Lr = (p1 - p0).length; d = (p1 - p0).normalized(); n = max(1, int(Lr / .3))
        for lay, (w, y) in enumerate(((.34, .0), (.29, .045), (.24, .09))):
            for i in range(n):
                a = p0 + d * (Lr * i / n + .004); b = p0 + d * (Lr * (i + 1) / n - .004); o = Vector((0, y + .02, 0))
                sweep("kawara", ch(w, .04, .006), a + o, b + o, seg=1, tile=.6, sa=40)
        sweep("kawara", circ(.085, 12, .07), p0 + Vector((0, .155, 0)), p1 + Vector((0, .155, 0)), seg=1, tile=.6, sa=50)
        for i in range(n + 1):
            c = p0 + d * (Lr * i / n) + Vector((0, .155, 0)); sweep("kawara", circ(.092, 12, .077), c - d * .018, c + d * .018, seg=1, tile=.5, sa=50)
    ridge((-13.1, 4.86, -13.1), (13.1, 4.86, -13.1))
    for s in (-1, 1): ridge((s * 13.1, 4.86, -13.1), (s * 17.62, roofY(17.62) - .03, -17.62))
    oni = "/workspace/kyoto/shell2/tripo/onigawara.glb"
    if os.path.exists(oni):
        for s in (-1, 1):
            before = set(bpy.context.scene.objects); bpy.ops.import_scene.gltf(filepath=oni); new = [o for o in bpy.context.scene.objects if o not in before]
            ms = [o for o in new if o.type == "MESH"]
            for o in new:
                if o.type != "MESH": bpy.data.objects.remove(o, do_unlink=True)
            bpy.ops.object.select_all(action="DESELECT")
            for o in ms: o.select_set(True)
            bpy.context.view_layer.objects.active = ms[0]
            if len(ms) > 1: bpy.ops.object.join()
            o = bpy.context.view_layer.objects.active; o.parent = None; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            dm = o.modifiers.new("d", "DECIMATE"); dm.ratio = min(1, 1600 / max(1, len(o.data.polygons))); bpy.ops.object.modifier_apply(modifier="d")
            vs = [v.co for v in o.data.vertices]; lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
            sc = .42 / max(hi.z - lo.z, 1e-6); ctr = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
            foot = Vector((s * 17.66, roofY(17.66) + .08, -17.66)); yaw = math.atan2(s, 1)   # face outward along the hip
            o.data.transform(Matrix.Translation(B(foot)) @ Matrix.Rotation(-yaw if s > 0 else -yaw, 4, "Z") @ Matrix.Scale(sc, 4) @ Matrix.Translation(-ctr))
            o.data.materials.clear(); o.data.materials.append(mat("kawara")); o["node"] = "body"; o["sa"] = 60
            for p in o.data.polygons: p.use_smooth = True
            uv = o.data.uv_layers[0] if o.data.uv_layers else o.data.uv_layers.new(name="UVMap")
            for p in o.data.polygons:
                for li in p.loop_indices: co = o.data.vertices[o.data.loops[li].vertex_index].co; uv.data[li].uv = (co.x / .4 + co.y / .4, co.z / .4)
            while len(o.data.uv_layers) > 1: o.data.uv_layers.remove(o.data.uv_layers[1])
    export("roof_side", [((0, 9.5, -1.5), (0, 3.6, -11), 26), ((5.5, 3.1, -4.6), (4.2, 2.95, -6.5), 40), ((22, 7.5, -23), (16, 4.0, -16.5), 30)])
BUILD = {"tatami": build_tatami, "tatami8": build_tatami8, "floor": build_floor, "ceiling": build_ceiling, "engawa": build_engawa, "stair": build_stair, "roof_side": build_roof}
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(BUILD)
for a in args: BUILD[a]()
