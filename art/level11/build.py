# Level 11 "The Infinite City": the modelled kit (Shelly: improve Level 11, realistic, not blocky, interesting).
# Buildings with real window grids, cornices, setbacks, fire escapes and awnings; street furniture; trees; cars. One mesh per model, a material per surface kind
# (the game re-textures brick / stone / concrete by name). Front is +Y in Blender (glTF -Z, so the sim says forward "-z"); each model stands on z = 0, centred on x/y.
# UVs are box-projected in metres (one tile = TILE m) so a texture keeps its scale on any wall.
# Run: blender -b --factory-startup --python art/level11/build.py -- glass_a glass_b stone brick_a brick_b mall house lamp hydrant bench shelter tree sedan van bin box
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix, Euler
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out"); os.makedirs(OUT, exist_ok=True)
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["glass_a", "glass_b", "stone", "brick_a", "brick_b", "mall", "house", "lamp", "hydrant", "bench", "shelter", "tree", "sedan", "van", "bin", "box"]
TILE = 3.0

# ---- materials: flat colours here, the game dresses the textured ones by name
MATS = {
    "stone": ((0.78, 0.74, 0.66), 0.8, 0, 0), "brick": ((0.55, 0.22, 0.14), 0.85, 0, 0), "concrete": ((0.62, 0.61, 0.58), 0.85, 0, 0), "trim": ((0.86, 0.83, 0.76), 0.7, 0, 0),
    "glass": ((0.07, 0.1, 0.13), 0.08, 0.6, 0), "glassLit": ((1.0, 0.82, 0.5), 0.2, 0, 0.9), "glassBlue": ((0.2, 0.34, 0.42), 0.06, 0.7, 0), "metal": ((0.35, 0.36, 0.38), 0.45, 0.8, 0), "dark": ((0.04, 0.04, 0.045), 0.7, 0.3, 0),
    "roof": ((0.18, 0.17, 0.17), 0.9, 0, 0), "wood": ((0.38, 0.24, 0.13), 0.7, 0, 0), "awnA": ((0.18, 0.28, 0.55), 0.9, 0, 0), "awnB": ((0.2, 0.42, 0.24), 0.9, 0, 0), "awnC": ((0.62, 0.16, 0.14), 0.9, 0, 0),
    "leafA": ((0.2, 0.42, 0.16), 0.85, 0, 0), "leafB": ((0.3, 0.5, 0.18), 0.85, 0, 0), "bark": ((0.26, 0.2, 0.15), 0.9, 0, 0), "paint": ((0.7, 0.1, 0.08), 0.35, 0.2, 0), "tire": ((0.03, 0.03, 0.03), 0.9, 0, 0),
    "chrome": ((0.8, 0.8, 0.82), 0.2, 1.0, 0), "lamp": ((1.0, 0.86, 0.55), 0.3, 0, 3.0), "red": ((0.8, 0.08, 0.06), 0.4, 0.1, 0), "white": ((0.9, 0.9, 0.88), 0.5, 0, 0), "green": ((0.12, 0.3, 0.18), 0.55, 0.3, 0), "tail": ((0.9, 0.05, 0.04), 0.3, 0, 1.2),
}
def get_mat(n):
    m = bpy.data.materials.get(n)
    if m: return m
    c, r, mt, em = MATS[n]; m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; b.inputs["Metallic"].default_value = mt
    if em: b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = em
    m.diffuse_color = (*c, 1); return m

class Mesh:
    """one bmesh per material; boxes, cylinders and prisms appended directly (fast), UVs box-projected at the end"""
    def __init__(self): self.b = {}
    def bm(self, m): return self.b.setdefault(m, bmesh.new())
    def box(self, m, c, s, rot=None):
        bm = self.bm(m); r = bmesh.ops.create_cube(bm, size=1.0)
        mx = Matrix.Translation(c) @ (Euler(rot, "XYZ").to_matrix().to_4x4() if rot else Matrix.Identity(4)) @ Matrix.Diagonal((s[0], s[1], s[2], 1))
        bmesh.ops.transform(bm, matrix=mx, verts=r["verts"])
    def cyl(self, m, c, r, h, r2=None, seg=14, rot=None):
        bm = self.bm(m); res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        mx = Matrix.Translation(c) @ (Euler(rot, "XYZ").to_matrix().to_4x4() if rot else Matrix.Identity(4))
        bmesh.ops.transform(bm, matrix=mx, verts=res["verts"])
    def sph(self, m, c, r, sc=(1, 1, 1), seg=10, noise=0.0, rnd=None):
        bm = self.bm(m); res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(5, seg // 2), radius=r)
        if noise and rnd:
            for v in res["verts"]: v.co *= 1 + rnd.uniform(-noise, noise)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ Matrix.Diagonal((sc[0], sc[1], sc[2], 1)), verts=res["verts"])
    def hull(self, m, pts):
        bm = self.bm(m); vs = [bm.verts.new(p) for p in pts]; bmesh.ops.convex_hull(bm, input=vs, use_existing_faces=False)
        bmesh.ops.delete(bm, geom=[v for v in vs if not v.link_faces], context="VERTS")
    def profile(self, m, prof):
        """prof = [(y, z, halfwidth)...]: the solid whose side outline is the points and whose width tapers per point"""
        self.hull(m, [(sx * hw, y, z) for (y, z, hw) in prof for sx in (-1, 1)])
    def prism(self, m, pts, z0, z1):
        """a vertical prism over a polygon [(x,y)...] (ccw), from z0 to z1"""
        bm = self.bm(m); lo = [bm.verts.new((x, y, z0)) for x, y in pts]; hi = [bm.verts.new((x, y, z1)) for x, y in pts]
        bm.faces.new(lo[::-1]); bm.faces.new(hi)
        for i in range(len(pts)): j = (i + 1) % len(pts); bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    def finish(self, name, uv=True, up=None):
        objs = []
        for m, bm in self.b.items():
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
            if uv:
                lay = bm.loops.layers.uv.verify()
                for f in bm.faces:
                    n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
                    for l in f.loops:
                        p = l.vert.co; a, b = ((p.y, p.z), (p.x, p.z), (p.x, p.y))[ax] if ax != 1 else ((p.x, p.z))
                        if ax == 0: a, b = p.y, p.z
                        elif ax == 1: a, b = p.x, p.z
                        else: a, b = p.x, p.y
                        l[lay].uv = (a / TILE, b / TILE)
            me = bpy.data.meshes.new(name + "_" + m); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name + "_" + m, me); bpy.context.collection.objects.link(o)
            o.data.materials.append(get_mat(m))
            for p in me.polygons: p.use_smooth = m in ("leafA", "leafB", "bark", "paint", "chrome", "tire", "lamp")
            objs.append(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
        # centre on x/y, stand on z = 0
        bb = [Vector(c) for c in ob.bound_box]; cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2; cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2; zmin = min(v.z for v in bb)
        ob.data.transform(Matrix.Translation((-cx, -cy, -zmin))); ob.location = (0, 0, 0)
        bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        path = os.path.join(OUT, name + ".glb"); bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
        print("exported", name, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions)); return ob

def preview(name, ob, az=35, el=0.28, dist=1.6):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 760; sc.render.resolution_y = 760
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.62, 0.7, 0.8)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 38
    d = max(ob.dimensions.x, ob.dimensions.y, ob.dimensions.z); t = Vector((0, 0, ob.dimensions.z * 0.45)); a = math.radians(az); cam.location = t + Vector((math.sin(a) * d * dist, math.cos(a) * d * dist, d * el))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler(); sc.render.filepath = os.path.join(OUT, "preview_%s.png" % name); bpy.ops.render.render(write_still=True)

# ---- facade helpers
def face_windows(M, rnd, face, w, d, z0, floors, fh, bay, ww, wh, sill, mat_pane="glass", lit=0.16, frame="trim", lintel=True, skip_floors=(), cols_skip=(), proud=0.0):
    """windows on one face: face '+y','-y','+x','-x' of a w x d box centred on the origin; rows start at z0, one per floor"""
    span = w if face in ("+y", "-y") else d; n = max(1, int(span // bay)); step = span / n
    for fl in range(floors):
        if fl in skip_floors: continue
        for i in range(n):
            if i in cols_skip: continue
            u = -span / 2 + step * (i + 0.5); z = z0 + fl * fh + sill + wh / 2
            lit_p = mat_pane if rnd.random() > lit else "glassLit"
            if face == "+y": c = (u, d / 2, z); s = (ww, 0.16 + proud, wh); fs = (ww + 0.34, 0.1 + proud, wh + 0.3)
            elif face == "-y": c = (u, -d / 2, z); s = (ww, 0.16 + proud, wh); fs = (ww + 0.34, 0.1 + proud, wh + 0.3)
            elif face == "+x": c = (w / 2, u, z); s = (0.16 + proud, ww, wh); fs = (0.1 + proud, ww + 0.34, wh + 0.3)
            else: c = (-w / 2, u, z); s = (0.16 + proud, ww, wh); fs = (0.1 + proud, ww + 0.34, wh + 0.3)
            M.box(frame, c, fs); M.box(lit_p, (c[0] + (0.03 if face == "+x" else -0.03 if face == "-x" else 0), c[1] + (0.03 if face == "+y" else -0.03 if face == "-y" else 0), c[2]), (s[0] + (0.04 if face in ("+x", "-x") else 0), s[1] + (0.04 if face in ("+y", "-y") else 0), s[2]))
            # sill and lintel, a window is a thing with depth
            sx, sy = (ww + 0.5, 0.3) if face in ("+y", "-y") else (0.3, ww + 0.5)
            off = (0.12 if face == "+y" else -0.12 if face == "-y" else 0, 0.12 if face == "+x" else -0.12 if face == "-x" else 0)
            if face in ("+x", "-x"): off = (0.12 if face == "+x" else -0.12, 0)
            else: off = (0, 0.12 if face == "+y" else -0.12)
            M.box("trim", (c[0] + off[0], c[1] + off[1], c[2] - wh / 2 - 0.1), (sx, sy, 0.14))
            if lintel: M.box("trim", (c[0] + off[0] * 0.8, c[1] + off[1] * 0.8, c[2] + wh / 2 + 0.12), (sx - 0.1 if face in ("+y", "-y") else 0.26, 0.26 if face in ("+y", "-y") else sy - 0.1, 0.18))

def curtain(M, rnd, w, d, z0, z1, fh, bay, mat="glassBlue", lit=0.18):
    """a glass curtain wall on all four faces of a w x d block from z0 to z1: panes, vertical mullions, a spandrel band per floor"""
    floors = int((z1 - z0) // fh)
    for face in ("+y", "-y", "+x", "-x"):
        span = w if face in ("+y", "-y") else d; n = max(1, int(span // bay)); step = span / n
        for fl in range(floors):
            for i in range(n):
                u = -span / 2 + step * (i + 0.5); z = z0 + fl * fh + fh * 0.55
                m = "glassLit" if rnd.random() < lit else mat
                if face == "+y": M.box(m, (u, d / 2 + 0.05, z), (step - 0.18, 0.1, fh * 0.62))
                elif face == "-y": M.box(m, (u, -d / 2 - 0.05, z), (step - 0.18, 0.1, fh * 0.62))
                elif face == "+x": M.box(m, (w / 2 + 0.05, u, z), (0.1, step - 0.18, fh * 0.62))
                else: M.box(m, (-w / 2 - 0.05, u, z), (0.1, step - 0.18, fh * 0.62))
            zb = z0 + fl * fh + fh * 0.04
            if face == "+y": M.box("concrete", (0, d / 2 + 0.07, zb + 0.12), (w + 0.3, 0.16, 0.34))
            elif face == "-y": M.box("concrete", (0, -d / 2 - 0.07, zb + 0.12), (w + 0.3, 0.16, 0.34))
            elif face == "+x": M.box("concrete", (w / 2 + 0.07, 0, zb + 0.12), (0.16, d + 0.3, 0.34))
            else: M.box("concrete", (-w / 2 - 0.07, 0, zb + 0.12), (0.16, d + 0.3, 0.34))
        for i in range(n + 1):
            u = -span / 2 + step * i
            if face == "+y": M.box("metal", (u, d / 2 + 0.1, (z0 + z1) / 2), (0.14, 0.2, z1 - z0))
            elif face == "-y": M.box("metal", (u, -d / 2 - 0.1, (z0 + z1) / 2), (0.14, 0.2, z1 - z0))
            elif face == "+x": M.box("metal", (w / 2 + 0.1, u, (z0 + z1) / 2), (0.2, 0.14, z1 - z0))
            else: M.box("metal", (-w / 2 - 0.1, u, (z0 + z1) / 2), (0.2, 0.14, z1 - z0))
    M.box("concrete", (0, 0, (z0 + z1) / 2), (w - 0.2, d - 0.2, z1 - z0))   # the core behind the glass (so it is solid from outside)

def roof_kit(M, rnd, w, d, z, hvac=3, tank=False):
    M.box("roof", (0, 0, z + 0.1), (w + 0.2, d + 0.2, 0.2)); M.box("concrete", (0, 0, z + 0.55), (w + 0.5, 0.25, 0.9)) if False else None
    for k in range(hvac):
        x, y = rnd.uniform(-w * 0.3, w * 0.3), rnd.uniform(-d * 0.3, d * 0.3); s = (rnd.uniform(1.4, 2.6), rnd.uniform(1.2, 2.2), rnd.uniform(0.8, 1.6))
        M.box("metal", (x, y, z + 0.2 + s[2] / 2), s); M.cyl("dark", (x, y, z + 0.2 + s[2] + 0.1), 0.45, 0.16, seg=12)
    if tank:
        x, y = w * 0.25, -d * 0.2
        M.cyl("wood", (x, y, z + 3.1), 1.3, 2.6, seg=16); M.cyl("roof", (x, y, z + 4.6), 1.45, 0.5, r2=0.1, seg=16)
        for sx in (-0.9, 0.9):
            for sy in (-0.9, 0.9): M.box("metal", (x + sx, y + sy, z + 0.9), (0.14, 0.14, 1.8))
def parapet(M, w, d, z, h=0.9, t=0.3, mat="trim"):
    M.box(mat, (0, d / 2 - t / 2, z + h / 2), (w, t, h)); M.box(mat, (0, -d / 2 + t / 2, z + h / 2), (w, t, h)); M.box(mat, (w / 2 - t / 2, 0, z + h / 2), (t, d - 2 * t, h)); M.box(mat, (-w / 2 + t / 2, 0, z + h / 2), (t, d - 2 * t, h))
def cornice(M, w, d, z, proj=0.9, h=0.5, mat="trim"):
    M.box(mat, (0, 0, z + h / 2), (w + proj, d + proj, h)); M.box(mat, (0, 0, z - 0.25), (w + proj * 0.5, d + proj * 0.5, 0.3)); M.box(mat, (0, 0, z + h + 0.12), (w + proj * 0.3, d + proj * 0.3, 0.24))

# ============================================================== buildings
def glass_a():
    M = Mesh(); rnd = random.Random(11)
    M.box("concrete", (0, 0, 0.5), (23, 23, 1.0)); M.box("stone", (0, 0, 2.6), (22, 22, 4.4))   # plinth and the lobby
    for sx in range(-4, 5): M.box("glass", (sx * 2.4, 11.05, 2.6), (2.0, 0.1, 3.4)); M.box("metal", (sx * 2.4 + 1.2, 11.1, 2.6), (0.12, 0.18, 3.6))
    M.box("metal", (0, 11.5, 4.9), (23.6, 2.6, 0.3)); M.box("metal", (0, 12.7, 4.6), (23.6, 0.14, 0.7))      # the canopy over the entrance
    z = 4.8; curtain(M, rnd, 22, 22, z, 40.8, 4.0, 2.4); z = 40.8
    M.box("trim", (0, 0, z + 0.3), (22.6, 22.6, 0.6)); z += 0.6
    curtain(M, rnd, 18, 18, z, z + 28, 4.0, 2.25); z += 28
    M.box("trim", (0, 0, z + 0.3), (18.6, 18.6, 0.6)); z += 0.6
    curtain(M, rnd, 12, 12, z, z + 16, 4.0, 2.0); z += 16
    M.box("concrete", (0, 0, z + 0.3), (12.6, 12.6, 0.6)); z += 0.6
    M.box("metal", (0, 0, z + 2), (7, 7, 4)); M.box("dark", (0, 0, z + 4.3), (7.3, 7.3, 0.3))
    for k in range(4): M.box("metal", (-2.5 + k * 1.7, 2.0, z + 4.9), (0.9, 1.2, 1.2))
    M.cyl("metal", (0, 0, z + 9), 0.14, 10, r2=0.04, seg=8); M.cyl("red", (0, 0, z + 14.2), 0.2, 0.3, seg=8)
    for sx in (-1, 1): M.box("concrete", (sx * 11.2, 0, 8), (0.5, 22.4, 16)) if False else None
    ob = M.finish("l11_glass_a"); preview("glass_a", ob, 30, 0.2, 1.3); return ob
def glass_b():
    M = Mesh(); rnd = random.Random(23)
    M.box("concrete", (0, 0, 0.6), (17, 17, 1.2)); curtain(M, rnd, 16, 16, 1.2, 77.2, 3.8, 2.0, mat="glass", lit=0.12)
    for z in (26.4, 52.0): M.box("metal", (0, 0, z), (16.5, 16.5, 0.5))
    M.box("concrete", (0, 0, 77.6), (16.6, 16.6, 0.8))
    M.box("glass", (0, 0, 83.6), (12, 12, 11.2), rot=None); M.prism("metal", [(-8, -8), (8, -8), (8, 8), (-8, 8)], 78.0, 78.2)
    M.box("metal", (0, 0, 91), (6, 6, 4)); M.cyl("metal", (0, 0, 99), 0.18, 12, r2=0.05, seg=8); M.cyl("red", (0, 0, 105), 0.25, 0.4, seg=8)
    ob = M.finish("l11_glass_b"); preview("glass_b", ob, 30, 0.25, 1.1); return ob
def stone():
    M = Mesh(); rnd = random.Random(31); W, Dp = 21, 19
    M.box("stone", (0, 0, 6), (W, Dp, 12))                                              # the rusticated base, two storeys
    for z in (3.0, 6.0, 9.0): M.box("trim", (0, 0, z), (W + 0.2, Dp + 0.2, 0.1))
    # arched ground-floor openings on the front and back
    for face_y in (Dp / 2, -Dp / 2):
        for i in range(-3, 4):
            x = i * 2.7
            if face_y > 0 and i == 0: M.box("dark", (x, face_y + 0.02, 1.9), (2.0, 0.2, 3.8)); M.cyl("dark", (x, face_y + 0.02, 3.8), 1.0, 0.2, seg=16, rot=(math.pi / 2, 0, 0)); continue
            M.box("glass", (x, face_y + 0.04, 2.1), (1.8, 0.2, 3.2)); M.cyl("glass", (x, face_y + 0.04, 3.7), 0.9, 0.2, seg=16, rot=(math.pi / 2, 0, 0))
            M.box("trim", (x, face_y + 0.1, 2.1), (2.2, 0.1, 0.2)); M.cyl("trim", (x, face_y + 0.1, 3.7), 1.12, 0.1, seg=16, rot=(math.pi / 2, 0, 0)) if False else None
    for sx in (-1, 1):                                                                  # the entrance portico: two columns and a pediment
        for k in range(2): M.cyl("trim", (sx * 2.2, Dp / 2 + 1.2, 2.6), 0.42, 5.2, seg=14) if k == 0 else None
    M.box("trim", (0, Dp / 2 + 1.2, 5.4), (6.4, 2.6, 0.5)); M.box("stone", (0, Dp / 2 + 1.0, 0.3), (7.0, 3.0, 0.6))
    M.prism("trim", [(-3.2, Dp / 2 + 0.0), (3.2, Dp / 2 + 0.0), (3.2, Dp / 2 + 2.4), (-3.2, Dp / 2 + 2.4)], 5.6, 5.9) if False else None
    M.box("stone", (0, 0, 12 + 14.4 / 2), (W - 1.2, Dp - 1.2, 14.4))                   # the shaft, four floors
    for face in ("+y", "-y"): face_windows(M, rnd, face, W - 1.2, Dp - 1.2, 12.3, 4, 3.6, 2.5, 1.2, 2.0, 0.6, lit=0.2)
    for face in ("+x", "-x"): face_windows(M, rnd, face, W - 1.2, Dp - 1.2, 12.3, 4, 3.6, 2.7, 1.2, 2.0, 0.6, lit=0.2)
    cornice(M, W - 1.2, Dp - 1.2, 26.4, 1.0, 0.5)
    M.box("stone", (0, 0, 26.9 + 8.0 / 2), (W - 2.6, Dp - 2.6, 8.0))                   # the upper block
    for face in ("+y", "-y"): face_windows(M, rnd, face, W - 2.6, Dp - 2.6, 27.1, 2, 3.4, 2.5, 1.2, 1.9, 0.6, lit=0.2)
    for face in ("+x", "-x"): face_windows(M, rnd, face, W - 2.6, Dp - 2.6, 27.1, 2, 3.4, 2.7, 1.2, 1.9, 0.6, lit=0.2)
    cornice(M, W - 2.6, Dp - 2.6, 34.9, 1.2, 0.6)
    # a flat terrace on top, the skydeck: a floor, a balustrade round it, an elevator head house, and the water tower on stilts in a corner
    M.box("concrete", (0, 0, 35.45), (W - 2.9, Dp - 2.9, 0.4)); T0 = 35.66
    sx0, sy0 = (W - 2.9) / 2, (Dp - 2.9) / 2
    for k in range(-5, 6):
        M.box("trim", (k * (sx0 * 2 / 11), sy0 - 0.12, T0 + 0.55), (0.18, 0.24, 1.1)); M.box("trim", (k * (sx0 * 2 / 11), -sy0 + 0.12, T0 + 0.55), (0.18, 0.24, 1.1))
    for k in range(-4, 5):
        M.box("trim", (sx0 - 0.12, k * (sy0 * 2 / 9), T0 + 0.55), (0.24, 0.18, 1.1)); M.box("trim", (-sx0 + 0.12, k * (sy0 * 2 / 9), T0 + 0.55), (0.24, 0.18, 1.1))
    for (a, b, c, d) in ((0, sy0 - 0.12, sx0 * 2, 0.34), (0, -sy0 + 0.12, sx0 * 2, 0.34)): M.box("trim", (a, b, T0 + 1.15), (c, d, 0.16))
    for (a, b, c, d) in ((sx0 - 0.12, 0, 0.34, sy0 * 2), (-sx0 + 0.12, 0, 0.34, sy0 * 2)): M.box("trim", (a, b, T0 + 1.15), (c, d, 0.16))
    M.box("stone", (-5.6, -3.6, T0 + 1.7), (3.2, 3.2, 3.4)); M.box("glass", (-5.6, -3.6 + 1.62, T0 + 1.4), (1.2, 0.1, 2.2)); M.box("roof", (-5.6, -3.6, T0 + 3.5), (3.6, 3.6, 0.25))
    wx, wy = 5.2, -4.2
    M.cyl("wood", (wx, wy, T0 + 5.0), 1.5, 3.0, seg=16); M.cyl("roof", (wx, wy, T0 + 6.9), 1.65, 0.8, r2=0.1, seg=16)
    for sx in (-1, 1):
        for sy in (-1, 1): M.box("metal", (wx + sx * 1.1, wy + sy * 1.1, T0 + 1.7), (0.18, 0.18, 3.4))
    M.box("metal", (wx, wy, T0 + 3.4), (2.6, 2.6, 0.14))
    ob = M.finish("l11_stone"); preview("stone", ob, 30, 0.2, 1.3); return ob
def brick_a():
    M = Mesh(); rnd = random.Random(41); W, Dp = 18, 14; fh = 3.2
    M.box("brick", (0, 0, 10.2), (W, Dp, 20.4)); M.box("concrete", (0, 0, 0.5), (W + 0.3, Dp + 0.3, 1.0))
    for f in ("+y", "-y"): face_windows(M, rnd, f, W, Dp, 1.2, 6, fh, 2.9, 1.1, 1.7, 0.9, lit=0.25)
    for f in ("+x", "-x"): face_windows(M, rnd, f, W, Dp, 1.2, 6, fh, 3.2, 1.1, 1.7, 0.9, lit=0.25)
    for z in (4.8, 11.2, 17.6) if False else (): pass
    for k in range(3): M.box("trim", (0, 0, 1.2 + (k + 1) * 2 * fh - 0.2), (W + 0.25, Dp + 0.25, 0.22))
    cornice(M, W, Dp, 19.9, 0.8, 0.5)
    parapet(M, W + 0.2, Dp + 0.2, 20.9, 0.6, 0.35, "brick")
    # a door with a stoop and awning on the front, a shop-sign band
    M.box("dark", (0, Dp / 2 + 0.02, 1.6), (1.9, 0.2, 2.6)); M.box("trim", (0, Dp / 2 + 0.12, 3.0), (2.8, 0.25, 0.3)); M.box("concrete", (0, Dp / 2 + 1.0, 0.35), (3.4, 2.0, 0.7))
    for i in range(3): M.box("concrete", (0, Dp / 2 + 1.7 - i * 0.55, 0.15 + i * 0.22), (3.0, 0.5, 0.3))
    # a fire escape zigzagging up the left side wall (platforms, stairs, rails)
    x = -W / 2 - 0.5
    for fl in range(1, 6):
        z = 1.2 + fl * fh; M.box("metal", (x, 0.0, z), (1.0, 3.0, 0.1)); M.box("metal", (x - 0.5, 0.0, z + 0.5), (0.05, 3.0, 0.9)); M.box("metal", (x, 1.5, z + 0.5), (1.0, 0.05, 0.9))
        M.box("metal", (x, -0.9 if fl % 2 else 0.9, z - fh / 2), (0.9, 0.12, 0.1), rot=(0, 0.0, 0)) if False else None
        M.box("metal", (x + 0.1, (-1.1 if fl % 2 else 1.1), z - fh / 2), (0.7, 0.9, 0.1), rot=(0.62 * (1 if fl % 2 else -1), 0, 0)) if False else None
    for sy in (-1.4, 1.4): M.box("metal", (-W / 2 - 0.5, sy, 10.5), (0.06, 0.06, 18.5))
    roof_kit(M, rnd, W, Dp, 21.5, hvac=3, tank=True)
    ob = M.finish("l11_brick_a"); preview("brick_a", ob, 35, 0.2, 1.5); return ob
def brick_b():
    M = Mesh(); rnd = random.Random(53); W, Dp = 12, 11; fh = 3.1
    M.box("brick", (0, 0, 6.3), (W, Dp, 12.6)); M.box("concrete", (0, 0, 0.4), (W + 0.3, Dp + 0.3, 0.8))
    for f in ("+y", "-y"): face_windows(M, rnd, f, W, Dp, 1.3, 4, fh, 2.6, 1.0, 1.6, 0.9, lit=0.28)
    for f in ("+x", "-x"): face_windows(M, rnd, f, W, Dp, 1.3, 4, fh, 3.0, 1.0, 1.6, 0.9, lit=0.28)
    cornice(M, W, Dp, 12.4, 0.7, 0.4); parapet(M, W + 0.2, Dp + 0.2, 13.3, 0.5, 0.3, "brick")
    M.box("dark", (-2.2, Dp / 2 + 0.02, 1.4), (1.2, 0.2, 2.0)); M.box("glass", (2.2, Dp / 2 + 0.03, 1.5), (3.0, 0.2, 2.2)); M.box("awnA", (2.2, Dp / 2 + 0.7, 2.9), (3.4, 1.4, 0.15), rot=(-0.22, 0, 0))
    roof_kit(M, rnd, W, Dp, 13.9, hvac=2)
    ob = M.finish("l11_brick_b"); preview("brick_b", ob, 35, 0.2, 1.6); return ob
def mall():
    M = Mesh(); rnd = random.Random(61); W, Dp = 24, 13
    M.box("brick", (0, 0, 2.6), (W, Dp, 5.2)); M.box("concrete", (0, 0, 0.12), (W + 0.4, Dp + 0.4, 0.24)); M.box("trim", (0, 0, 5.4), (W + 0.5, Dp + 0.5, 0.4))
    shops = [("awnA", 0.5), ("awnC", 0.5), ("awnB", 0.5), ("awnA", 0.5)]
    for i in range(4):
        x = -W / 2 + 3 + i * (W - 6) / 3
        M.box("glass", (x, Dp / 2 + 0.05, 1.6), (4.0, 0.12, 2.4)); M.box("metal", (x - 2.05, Dp / 2 + 0.08, 1.6), (0.12, 0.16, 2.6)); M.box("metal", (x + 2.05, Dp / 2 + 0.08, 1.6), (0.12, 0.16, 2.6)); M.box("metal", (x, Dp / 2 + 0.08, 2.85), (4.2, 0.16, 0.14))
        M.box("dark", (x + 1.4, Dp / 2 + 0.07, 1.1), (1.1, 0.14, 2.1))
        M.box(shops[i][0], (x, Dp / 2 + 1.0, 3.35), (4.6, 2.0, 0.12), rot=(-0.3, 0, 0))   # the striped awning
        for k in range(4): M.box("white", (x - 1.7 + k * 1.15, Dp / 2 + 1.0, 3.39), (0.5, 2.0, 0.13), rot=(-0.3, 0, 0))
        M.box("trim", (x, Dp / 2 + 0.2, 4.6), (4.2, 0.2, 0.9)); M.box("dark", (x, Dp / 2 + 0.32, 4.6), (3.6, 0.06, 0.55))   # the sign band
    roof_kit(M, rnd, W, Dp, 5.6, hvac=4)
    ob = M.finish("l11_mall"); preview("mall", ob, 30, 0.22, 1.3); return ob
def house():
    M = Mesh(); rnd = random.Random(73); W, Dp = 9, 8
    M.box("concrete", (0, 0, 0.3), (W + 0.4, Dp + 0.4, 0.6)); M.box("stone", (0, 0, 3.3), (W, Dp, 5.4))
    for f in ("+y", "-y"): face_windows(M, rnd, f, W, Dp, 0.7, 2, 2.8, 3.0, 1.1, 1.4, 0.8, lit=0.3, skip_floors=())
    for f in ("+x", "-x"): face_windows(M, rnd, f, W, Dp, 0.7, 2, 2.8, 3.5, 1.0, 1.4, 0.8, lit=0.3)
    # gable roof: a solid wedge over the walls, eaves overhanging, a ridge along the length; a dormer and a chimney
    M.hull("roof", [(-W / 2 - 0.6, -Dp / 2 - 0.7, 5.9), (W / 2 + 0.6, -Dp / 2 - 0.7, 5.9), (-W / 2 - 0.6, Dp / 2 + 0.7, 5.9), (W / 2 + 0.6, Dp / 2 + 0.7, 5.9), (-W / 2 - 0.6, 0, 8.4), (W / 2 + 0.6, 0, 8.4), (-W / 2 - 0.6, -Dp / 2 - 0.7, 5.75), (W / 2 + 0.6, -Dp / 2 - 0.7, 5.75), (-W / 2 - 0.6, Dp / 2 + 0.7, 5.75), (W / 2 + 0.6, Dp / 2 + 0.7, 5.75)])
    for sx in (-1, 1): M.hull("stone", [(sx * W / 2, -Dp / 2, 6.0), (sx * W / 2, Dp / 2, 6.0), (sx * W / 2, 0, 8.2)])
    M.box("trim", (1.8, Dp / 2 - 0.9, 7.0), (1.6, 1.4, 1.5)); M.box("glass", (1.8, Dp / 2 - 0.19, 7.0), (0.9, 0.1, 0.9)); M.hull("roof", [(1.0, Dp / 2 - 1.7, 7.7), (2.6, Dp / 2 - 1.7, 7.7), (1.0, Dp / 2 - 0.1, 7.7), (2.6, Dp / 2 - 0.1, 7.7), (1.8, Dp / 2 - 1.7, 8.4), (1.8, Dp / 2 - 0.1, 8.4)])
    M.box("brick", (-2.5, 1.0, 7.9), (0.9, 0.9, 3.4))
    M.box("dark", (0, Dp / 2 + 0.03, 1.4), (1.1, 0.16, 1.9)); M.box("wood", (0, Dp / 2 + 1.5, 0.5), (3.2, 3.0, 0.2)); M.box("trim", (0, Dp / 2 + 2.9, 2.4), (3.4, 0.2, 0.2))
    for sx in (-1.5, 1.5): M.cyl("trim", (sx, Dp / 2 + 2.9, 1.3), 0.1, 2.2, seg=8)
    ob = M.finish("l11_house"); preview("house", ob, 35, 0.25, 1.7); return ob

# ============================================================== street
def lamp():
    M = Mesh()
    M.cyl("metal", (0, 0, 0.4), 0.2, 0.8, r2=0.14, seg=10); M.cyl("metal", (0, 0, 3.2), 0.1, 5.2, r2=0.07, seg=10)
    for k in range(7):
        a0, a1 = math.pi * 0.0 + k * math.pi * 0.5 / 7, math.pi * 0.5 / 7 * (k + 1); r = 1.4
        c0 = (0, r - r * math.cos(a0), 5.8 + r * math.sin(a0)); c1 = (0, r - r * math.cos(a1), 5.8 + r * math.sin(a1))
        mid = ((c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2); ln = math.dist(c0, c1)
        M.cyl("metal", mid, 0.055, ln * 1.05, seg=8, rot=(math.atan2(c1[1] - c0[1], c1[2] - c0[2]) * -1 + 0.0, 0, 0))
    M.box("metal", (0, 1.4, 7.0), (0.5, 1.2, 0.15)); M.box("dark", (0, 1.4, 6.95), (0.5, 1.0, 0.08)); M.box("lamp", (0, 1.45, 6.9), (0.38, 0.8, 0.06))
    ob = M.finish("l11_lamp"); preview("lamp", ob, 60, 0.0, 1.2); return ob
def hydrant():
    M = Mesh(); M.cyl("red", (0, 0, 0.25), 0.17, 0.5, r2=0.15, seg=14); M.cyl("red", (0, 0, 0.55), 0.19, 0.1, seg=14); M.sph("red", (0, 0, 0.7), 0.15, (1, 1, 0.9), 12)
    M.cyl("red", (0, 0, 0.82), 0.04, 0.1, seg=8); M.cyl("chrome", (0.2, 0, 0.4), 0.07, 0.14, seg=10, rot=(0, math.pi / 2, 0)); M.cyl("chrome", (-0.2, 0, 0.4), 0.07, 0.14, seg=10, rot=(0, math.pi / 2, 0)); M.cyl("chrome", (0, 0.2, 0.36), 0.09, 0.14, seg=10, rot=(math.pi / 2, 0, 0))
    M.cyl("dark", (0, 0, 0.04), 0.22, 0.08, seg=14)
    ob = M.finish("l11_hydrant"); preview("hydrant", ob, 35, 0.2, 3.0); return ob
def bench():
    M = Mesh()
    for sx in (-0.8, 0.8):
        M.box("metal", (sx, 0, 0.22), (0.07, 0.5, 0.44)); M.box("metal", (sx, -0.28, 0.6), (0.07, 0.07, 0.5), rot=(0.2, 0, 0)); M.box("metal", (sx, 0, 0.45), (0.09, 0.55, 0.05))
    for k in range(4): M.box("wood", (0, -0.2 + k * 0.14, 0.47), (1.8, 0.11, 0.05))
    for k in range(3): M.box("wood", (0, -0.3, 0.62 + k * 0.13), (1.8, 0.04, 0.1), rot=(0.2, 0, 0))
    ob = M.finish("l11_bench"); preview("bench", ob, 35, 0.3, 2.2); return ob
def shelter():
    M = Mesh()
    for sx in (-1.5, 1.5): M.box("metal", (sx, -0.7, 1.2), (0.1, 0.1, 2.4)); M.box("metal", (sx, 0.7, 1.15), (0.1, 0.1, 2.3))
    M.box("metal", (0, 0, 2.5), (3.4, 1.9, 0.12), rot=(0.04, 0, 0)); M.box("glass", (0, -0.7, 1.2), (3.0, 0.05, 2.1)); M.box("glass", (-1.5, 0, 1.2), (0.05, 1.4, 2.1)); M.box("white", (0, -0.64, 2.3), (2.9, 0.04, 0.3))
    M.box("wood", (0, -0.45, 0.45), (2.4, 0.4, 0.06)); M.box("metal", (0, -0.45, 0.22), (2.3, 0.1, 0.4)); M.box("awnA", (1.55, 0.2, 1.4), (0.08, 0.7, 1.0)); M.box("white", (1.55, 0.2, 1.4), (0.1, 0.55, 0.85))
    ob = M.finish("l11_shelter"); preview("shelter", ob, 35, 0.2, 1.7); return ob
def tree():
    M = Mesh(); rnd = random.Random(5)
    M.cyl("bark", (0, 0, 1.6), 0.28, 3.2, r2=0.17, seg=10)
    for i in range(5):
        a = i / 5 * math.tau + rnd.uniform(-0.3, 0.3); ln = rnd.uniform(1.4, 2.0)
        M.cyl("bark", (math.cos(a) * ln * 0.3, math.sin(a) * ln * 0.3, 3.4 + ln * 0.3), 0.07, ln, r2=0.04, seg=6, rot=(math.sin(a) * 0.9, -math.cos(a) * 0.9, 0))
    for c in [(0, 0, 5.4, 1.9), (1.4, 0.4, 4.6, 1.4), (-1.3, -0.6, 4.8, 1.5), (0.4, 1.4, 4.7, 1.4), (-0.5, -1.4, 4.5, 1.3), (0.2, 0.0, 6.4, 1.3)]:
        M.sph("leafA" if rnd.random() < 0.6 else "leafB", (c[0], c[1], c[2]), c[3], (1, 1, 0.82), 12, 0.16, rnd)
    ob = M.finish("l11_tree"); preview("tree", ob, 35, 0.15, 1.5); return ob
def car(name, L, W, H, cab0, cab1, hood, van=False):
    M = Mesh(); hl = L / 2; hw = W / 2
    if not van:
        M.profile("paint", [(-hl, .3, hw), (hl, .3, hw), (hl + .03, .62, hw), (hl * .78, .84, hw * .97), (hl * .4, .88, hw * .95), (-hl * .66, .88, hw * .95), (-hl + .08, .8, hw * .98), (-hl - .03, .56, hw)])
        M.profile("glass", [(-hl * .62, .84, hw * .86), (hl * .38, .84, hw * .88), (hl * .06, 1.4, hw * .76), (-hl * .42, 1.4, hw * .76)])
        M.profile("paint", [(-hl * .46, 1.38, hw * .8), (hl * .1, 1.38, hw * .8), (hl * .08, 1.46, hw * .72), (-hl * .43, 1.46, hw * .72)])
        for sx in (-1, 1): M.box("paint", (sx * hw * .8, -hl * .18, 1.12), (0.07, 0.07, 0.56)) if False else None
    else:
        M.profile("paint", [(-hl, .3, hw), (hl, .3, hw), (hl + .03, .7, hw), (hl * .8, .96, hw * .98), (hl * .62, 1.78, hw * .94), (-hl * .98, 1.92, hw * .96), (-hl - .03, .8, hw)])
        M.profile("glass", [(hl * .78, 1.0, hw * .93), (hl * .6, 1.74, hw * .92), (hl * .56, 1.74, hw * .93), (hl * .74, 1.0, hw * .94)])
        for sx in (-1, 1): M.box("glass", (sx * (hw - 0.01), hl * .34, 1.5), (0.05, 1.1, 0.5)); M.box("glass", (sx * (hw - 0.01), -hl * .1, 1.5), (0.05, 1.6, 0.5))
    for sx in (-1, 1):
        for sy in (-L * 0.31, L * 0.3):
            M.cyl("tire", (sx * (hw - 0.04), sy, 0.34), 0.34, 0.24, seg=16, rot=(0, math.pi / 2, 0)); M.cyl("chrome", (sx * (hw + 0.04), sy, 0.34), 0.19, 0.05, seg=12, rot=(0, math.pi / 2, 0))
        M.box("lamp", (sx * (hw - 0.3), hl + 0.03, 0.66), (0.3, 0.06, 0.14)); M.box("tail", (sx * (hw - 0.3), -hl - 0.04, 0.7), (0.3, 0.06, 0.14))
    M.box("chrome", (0, hl + 0.04, 0.4), (W - 0.2, 0.08, 0.1)); M.box("dark", (0, hl + 0.04, 0.6), (0.7, 0.05, 0.2)); M.box("chrome", (0, -hl - 0.05, 0.4), (W - 0.2, 0.08, 0.1)); M.box("white", (0, -hl - 0.05, 0.56), (0.5, 0.04, 0.12))
    ob = M.finish(name); preview(name.replace("l11_", ""), ob, 35, 0.2, 2.4); return ob
def sedan(): return car("l11_sedan", 4.5, 1.8, 1.45, 0, 0, 0)
def van(): return car("l11_van", 5.2, 2.0, 2.0, 0, 0, 0, van=True)
def bin_():
    M = Mesh(); M.cyl("green", (0, 0, 0.45), 0.3, 0.9, r2=0.27, seg=14); M.cyl("metal", (0, 0, 0.93), 0.32, 0.06, seg=14); M.sph("green", (0, 0, 0.93), 0.3, (1, 1, 0.3), 12)
    for k in range(6): M.box("metal", (math.cos(k) * 0.3, math.sin(k) * 0.3, 0.45), (0.03, 0.03, 0.8)) if False else None
    M.cyl("metal", (0, 0, 0.12), 0.3, 0.04, seg=14)
    ob = M.finish("l11_bin"); preview("bin", ob, 35, 0.2, 3.2); return ob
def box_():   # a newspaper box
    M = Mesh(); M.box("red", (0, 0, 0.5), (0.5, 0.45, 0.9)); M.box("glass", (0, 0.226, 0.65), (0.32, 0.03, 0.34)); M.box("dark", (0, 0.226, 0.34), (0.2, 0.03, 0.1)); M.box("metal", (0, 0, 0.05), (0.52, 0.47, 0.1)); M.box("chrome", (0.1, 0.23, 0.18), (0.12, 0.03, 0.04))
    ob = M.finish("l11_box"); preview("box", ob, 35, 0.2, 4); return ob

FUNCS = {"glass_a": glass_a, "glass_b": glass_b, "stone": stone, "brick_a": brick_a, "brick_b": brick_b, "mall": mall, "house": house, "lamp": lamp, "hydrant": hydrant, "bench": bench, "shelter": shelter, "tree": tree, "sedan": sedan, "van": van, "bin": bin_, "box": box_}
for n in only:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    FUNCS[n]()
