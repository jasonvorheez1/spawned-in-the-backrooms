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
    def finish(self, name, uv=True, up=None, center=True):
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
            for p in me.polygons: p.use_smooth = m in ("leafA", "leafB", "bark", "paint", "chrome", "tire", "lamp", "rope", "burlap", "corr", "rust", "plastic")
            objs.append(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
        # centre on x/y, stand on z = 0
        bb = [Vector(c) for c in ob.bound_box]; cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2; cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2; zmin = min(v.z for v in bb)
        ob.data.transform(Matrix.Translation((-cx, -cy, -zmin) if center else (0, 0, -zmin))); ob.location = (0, 0, 0)
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

def pane(M, m, pts):
    bm = M.bm(m); vs = [bm.verts.new(p) for p in pts]; bm.faces.new(vs)
def curtain(M, rnd, w, d, z0, z1, fh, bay, mat="glassBlue", lit=0.18):
    """a glass curtain wall on all four faces of a w x d block from z0 to z1: panes, vertical mullions, a spandrel band per floor"""
    floors = int((z1 - z0) // fh)
    for face in ("+y", "-y", "+x", "-x"):
        span = w if face in ("+y", "-y") else d; n = max(1, int(span // bay)); step = span / n
        for fl in range(floors):
            for i in range(n):
                u = -span / 2 + step * (i + 0.5); z = z0 + fl * fh + fh * 0.55
                m = "glassLit" if rnd.random() < lit else mat
                pw, ph = (step - 0.18) / 2, fh * 0.31   # one outward quad per pane (perf, lagscope #109-113: a box was 12 triangles, 10 never seen)
                if face == "+y": pane(M, m, [(u - pw, d / 2 + 0.06, z - ph), (u + pw, d / 2 + 0.06, z - ph), (u + pw, d / 2 + 0.06, z + ph), (u - pw, d / 2 + 0.06, z + ph)])
                elif face == "-y": pane(M, m, [(u + pw, -d / 2 - 0.06, z - ph), (u - pw, -d / 2 - 0.06, z - ph), (u - pw, -d / 2 - 0.06, z + ph), (u + pw, -d / 2 - 0.06, z + ph)])
                elif face == "+x": pane(M, m, [(w / 2 + 0.06, u + pw, z - ph), (w / 2 + 0.06, u - pw, z - ph), (w / 2 + 0.06, u - pw, z + ph), (w / 2 + 0.06, u + pw, z + ph)])
                else: pane(M, m, [(-w / 2 - 0.06, u - pw, z - ph), (-w / 2 - 0.06, u + pw, z - ph), (-w / 2 - 0.06, u + pw, z + ph), (-w / 2 - 0.06, u - pw, z + ph)])
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

# ============================================================== Level 11 set dressing (replaces the primitive boxes in places/level11/sim.js)
# worn, chamfered, real-proportioned props; same frame as the kit: front +Y, origin bottom centre (reno_office and spam_alley keep their authored origin)
MATS.update({
    "woodOld": ((0.3, 0.22, 0.15), 0.85, 0, 0), "rope": ((0.6, 0.52, 0.36), 0.9, 0, 0), "burlap": ((0.58, 0.5, 0.36), 0.95, 0, 0),
    "corr": ((0.52, 0.53, 0.52), 0.55, 0.7, 0), "rust": ((0.42, 0.22, 0.1), 0.85, 0.3, 0), "olive": ((0.24, 0.27, 0.16), 0.6, 0.3, 0),
    "door": ((0.2, 0.24, 0.28), 0.5, 0.6, 0), "plastic": ((0.85, 0.87, 0.86), 0.3, 0, 0),
})
SMOOTH_EXTRA = ("rope", "burlap", "corr", "rust", "plastic")

def _merge(M, m, tmp, mx):
    bm = M.bm(m); tmp.verts.index_update(); nv = [bm.verts.new(mx @ v.co) for v in tmp.verts]
    for f in tmp.faces:
        try: bm.faces.new([nv[v.index] for v in f.verts])
        except ValueError: pass
    tmp.free()
def cbox(M, m, c, s, bev=0.015, rot=None, P=None, jit=0.0, rnd=None):
    """a chamfered box: size s, centred c, rotated rot (XYZ radians), then carried by P"""
    tmp = bmesh.new(); r = bmesh.ops.create_cube(tmp, size=1.0); bmesh.ops.scale(tmp, vec=s, verts=r["verts"])
    b = min(bev, min(s) * 0.4)
    if b > 0.0015: bmesh.ops.bevel(tmp, geom=tmp.verts[:] + tmp.edges[:], offset=b, segments=1, affect="EDGES", profile=0.5)
    if jit and rnd:
        for v in tmp.verts: v.co += Vector((rnd.uniform(-jit, jit), rnd.uniform(-jit, jit), rnd.uniform(-jit, jit)))
    mx = (P or Matrix.Identity(4)) @ Matrix.Translation(c) @ (Euler(rot, "XYZ").to_matrix().to_4x4() if rot else Matrix.Identity(4))
    _merge(M, m, tmp, mx)
def tube(M, m, pts, r, seg=6, closed=False, caps=True):
    bm = M.bm(m); pts = [Vector(p) for p in pts]; n = len(pts); rings = []
    for i, p in enumerate(pts):
        a = pts[i - 1] if (closed or i > 0) else p; b = pts[(i + 1) % n] if (closed or i < n - 1) else p
        t = (b - a).normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)); u = t.cross(up).normalized(); w = t.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(k * 2 * math.pi / seg) + w * math.sin(k * 2 * math.pi / seg)) * r) for k in range(seg)])
    for i in range(n if closed else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(seg): bm.faces.new((A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]))
    if caps and not closed: bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
def rmat(cols):   # a rotation from its three column vectors
    return Matrix(((cols[0][0], cols[1][0], cols[2][0], 0), (cols[0][1], cols[1][1], cols[2][1], 0), (cols[0][2], cols[1][2], cols[2][2], 0), (0, 0, 0, 1)))
def turnaround(name, ob, azs=(35, 150, 260), el=0.35, dist=1.5, tgt=None):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = sc.render.resolution_y = 656
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"; sc.display.shading.show_cavity = True; sc.display.shading.show_shadows = True
    sc.world = bpy.data.worlds.new("w"); sc.world.color = (0.62, 0.7, 0.8)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam; cd.lens = 35
    d = max(ob.dimensions); t = Vector(tgt) if tgt else Vector((0, 0, ob.dimensions.z * 0.45)); files = []
    for i, az in enumerate(azs):
        a = math.radians(az); cam.location = t + Vector((math.sin(a) * d * dist, math.cos(a) * d * dist, d * el))
        cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler(); f = "/tmp/l11proof/%s_%d.png" % (name, i); sc.render.filepath = f; bpy.ops.render.render(write_still=True); files.append(f)
    os.system("montage %s -tile %dx1 -geometry +4+4 /tmp/l11proof/%s.png" % (" ".join(files), len(files), name))

# ---- 1. a pallet barricade: seven EUR pallets stood on end and edge, braced behind, lashed with rope, a 2x4 nailed across
def pallet(M, rnd, P):
    """one 1.2 x 1.0 x 0.144 pallet in its own frame (x long, y wide, z up from 0); some boards missing, some greyed and crooked"""
    W = lambda: "woodOld" if rnd.random() < 0.35 else "wood"
    for v in (-0.45, 0, 0.45): cbox(M, W(), (0, v, 0.011), (1.2, 0.1, 0.022), 0.004, (0, 0, rnd.uniform(-0.02, 0.02)), P, 0.002, rnd)
    for u in (-0.5275, 0, 0.5275):
        for v in (-0.45, 0, 0.45): cbox(M, W(), (u, v, 0.061), (0.145, 0.1 if v else 0.145, 0.078), 0.006, None, P, 0.003, rnd)
        cbox(M, W(), (u, 0, 0.111), (0.145, 1.0, 0.022), 0.004, None, P, 0.002, rnd)
    for k, v in enumerate((-0.4275, -0.28, -0.14, 0, 0.14, 0.28, 0.4275)):
        if 0 < k < 6 and rnd.random() < 0.12: continue                     # a board kicked out
        w = 0.145 if k in (0, 3, 6) else 0.1
        cbox(M, W(), (rnd.uniform(-0.01, 0.01), v, 0.133), (1.2 - rnd.uniform(0, 0.03), w, 0.022), 0.004, (rnd.uniform(-0.03, 0.03), 0, rnd.uniform(-0.015, 0.015)), P, 0.002, rnd)
def barricade_pallets():
    M = Mesh(); rnd = random.Random(808)
    TALL = rmat(((0, 0, 1), (0, 1, 0), (-1, 0, 0)))     # pallet x -> up, faces +-x
    EDGE = rmat(((0, 1, 0), (0, 0, 1), (1, 0, 0)))      # pallet x -> along y, y -> up
    xf = 0.18
    for y in (-1.3, 0.0, 1.3):                          # lower course: on end, 1.2 tall
        P = Matrix.Translation((xf + 0.144, y, 0.6)) @ Euler((rnd.uniform(-0.03, 0.03), rnd.uniform(-0.04, 0.02), rnd.uniform(-0.04, 0.04)), "XYZ").to_matrix().to_4x4() @ TALL
        pallet(M, rnd, P)
    for y in (-0.66, 0.66):                             # upper course: on edge, to 2.2
        P = Matrix.Translation((xf + 0.01, y, 1.21)) @ Euler((rnd.uniform(-0.04, 0.04), rnd.uniform(-0.05, 0.0), 0), "XYZ").to_matrix().to_4x4() @ Matrix.Translation((0, 0, 0.5)) @ EDGE @ Matrix.Translation((0, 0, 0))
        pallet(M, rnd, P)
    for y in (-0.9, 0.95):                              # braces leaning in behind
        P = Matrix.Translation((-0.55, y, 0.02)) @ Euler((0, math.radians(24), rnd.uniform(-0.1, 0.1)), "XYZ").to_matrix().to_4x4() @ Matrix.Translation((0, 0, 0.6)) @ TALL
        pallet(M, rnd, P)
    # rope lashings round the lower course and over the upper one
    x0, x1 = xf - 0.03, xf + 0.175
    for z in (0.32, 0.95):
        pts = [(x1, -1.86, z), (x1 + 0.01, 0, z + 0.02), (x1, 1.86, z), (x1 - 0.06, 1.9, z), (x0 + 0.03, 1.9, z), (x0, 1.86, z), (x0 - 0.01, 0, z - 0.02), (x0, -1.86, z), (x0 + 0.03, -1.9, z), (x1 - 0.06, -1.9, z)]
        tube(M, "rope", pts, 0.012, 6, closed=True)
    for y in (-0.7, 0.72):
        pts = [(x1 + 0.03, y, 0.7), (x1 + 0.02, y, 2.24), (xf + 0.07, y + 0.02, 2.27), (x0 - 0.02, y, 2.24), (x0 - 0.04, y, 0.7)]
        tube(M, "rope", pts + [(xf + 0.07, y, 0.66)], 0.012, 6, closed=True)
    tube(M, "rope", [(x1 + 0.02, 1.86, 0.95), (x1 + 0.07, 1.9, 0.8), (x1 + 0.1, 1.95, 0.55), (x1 + 0.09, 1.93, 0.42)], 0.012, 6)   # the loose tail
    tube(M, "rope", [(-0.5, -0.9, 0.55), (x0 - 0.01, -1.1, 0.9)], 0.011, 6); tube(M, "rope", [(-0.48, 0.95, 0.55), (x0 - 0.01, 1.2, 0.9)], 0.011, 6)
    cbox(M, "woodOld", (x1 + 0.03, 0, 1.75), (0.045, 2.5, 0.09), 0.006, (math.radians(14), 0, 0), None, 0.004, rnd)   # a 2x4 nailed across the top course
    ob = M.finish("l11_barricade_pallets"); turnaround("barricade_pallets", ob, (60, 150, 250)); return ob

# ---- 2. corrugated sheet wall on steel posts, rust-streaked from its fixings and its foot
def corrugated():
    M = Mesh(); rnd = random.Random(52); L = 8.5; wav = 0.135; amp = 0.017
    starts = [-4.25, -2.15, -0.06, 2.04]
    for si, y0 in enumerate(starts):
        y1 = min(4.25, y0 + 2.21); xo = 0.03 if si % 2 else 0.0; zb = rnd.uniform(0.26, 0.36); zt = rnd.uniform(2.62, 2.74); bow = rnd.uniform(-0.03, 0.03)
        dent = (rnd.uniform(y0 + 0.4, y1 - 0.4), rnd.uniform(0.7, 1.8), rnd.uniform(0.03, 0.06)) if rnd.random() < 0.6 else None
        nc = int((y1 - y0) / wav * 8); zs = [zb, zb + 0.18, (zb + zt) / 2 - 0.4, (zb + zt) / 2 + 0.4, zt - 0.18, zt]
        streak = set(); 
        for k in range(rnd.randint(2, 4)): c = rnd.randint(4, nc - 6); streak.update(range(c, c + rnd.randint(3, 7)))
        grid = []
        for i in range(nc + 1):
            y = y0 + (y1 - y0) * i / nc; col = []
            for z in zs:
                x = xo + amp * math.sin(2 * math.pi * (y - y0) / wav) + bow * math.sin(math.pi * (z - zb) / (zt - zb))
                if dent: x -= dent[2] * math.exp(-((y - dent[0]) ** 2 + (z - dent[1]) ** 2) / 0.12)
                if z == zb and si == 2: x += 0.04 * max(0, (y - y1 + 0.6) / 0.6)    # a foot corner kicked out
                col.append((x, y, z))
            grid.append(col)
        for i in range(nc):
            for j in range(len(zs) - 1):
                rust = (j == 0) or (j == 1 and rnd.random() < 0.3) or (i in streak and j >= 3) or (i in streak and j == 2 and rnd.random() < 0.6)
                bm = M.bm("rust" if rust else "corr"); vs = [bm.verts.new(p) for p in (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])]; bm.faces.new(vs)
        for z in (zb + 0.45, zt - 0.3):                              # fixings: hex heads along the rails
            for k in range(6): cbox(M, "metal", (xo + amp + 0.006, y0 + 0.15 + k * (y1 - y0 - 0.3) / 5, z), (0.012, 0.022, 0.022), 0.003)
    for y in (-4.1, -2.1, 0.0, 2.1, 4.1):                           # posts behind, set in concrete pads
        cbox(M, "metal", (-0.07, y, 1.4), (0.08, 0.08, 2.8), 0.008, (rnd.uniform(-0.02, 0.02), rnd.uniform(-0.015, 0.015), 0), None, 0.002, rnd)
        cbox(M, "concrete", (-0.07, y, 0.06), (0.36, 0.36, 0.12), 0.04, (0, 0, rnd.uniform(0, 1)), None, 0.01, rnd)
        cbox(M, "rust", (-0.07, y, 0.2), (0.085, 0.085, 0.18), 0.008)
    for z in (0.75, 2.35): cbox(M, "metal", (-0.04, 0, z), (0.05, 8.4, 0.05), 0.006)
    ob = M.finish("l11_corrugated"); turnaround("corrugated", ob, (70, 115, 250), 0.25, 0.9); return ob

# ---- 3. sandbags: a shallow curved wall, two bags deep, three courses, each bag its own stuffed, tied, sagging shape
def sandbag(M, rnd, c, yaw, L=0.58, Wd=0.3, H=0.27):
    tmp = bmesh.new(); bmesh.ops.create_uvsphere(tmp, u_segments=12, v_segments=7, radius=1.0)
    for v in tmp.verts:
        x, y, z = v.co; sq = lambda a, e: math.copysign(abs(a) ** e, a)
        x2 = sq(x, 0.38); y2 = sq(y, 0.6); z2 = z * (0.55 + 0.45 * (1 - abs(x2) ** 4))
        if z2 < 0: z2 *= 0.55
        v.co = Vector((x2 * L / 2, y2 * Wd / 2, z2 * H / 2 + 0.0)) + Vector((rnd.uniform(-0.008, 0.008), rnd.uniform(-0.008, 0.008), rnd.uniform(-0.01, 0.01)))
    mx = Matrix.Translation(c) @ Euler((rnd.uniform(-0.04, 0.04), rnd.uniform(-0.05, 0.05), yaw + rnd.uniform(-0.08, 0.08)), "XYZ").to_matrix().to_4x4()
    _merge(M, "burlap", tmp, mx)
    e = 1 if rnd.random() < 0.5 else -1                               # the tied neck
    M.bm("burlap"); tmp = bmesh.new(); bmesh.ops.create_cone(tmp, cap_ends=True, segments=6, radius1=0.035, radius2=0.012, depth=0.07)
    _merge(M, "burlap", tmp, mx @ Matrix.Translation((e * (L / 2 + 0.02), 0, 0.02)) @ Euler((0, e * math.pi / 2, 0), "XYZ").to_matrix().to_4x4())
def sandbags():
    M = Mesh(); rnd = random.Random(14); half = 1.75; bulge = 0.35; H = 0.33
    cx = lambda y: -bulge * (1 - (y / half) ** 2)
    for course in range(3):
        z = 0.12 + course * (H - 0.03)
        for row in (-1, 1):
            if course == 2 and row == 1 and False: continue
            n0 = 0.29 * (course % 2) - 0.0
            y = -half + 0.3 + n0 * (1 if row < 0 else 0.6)
            while y <= half - 0.27:
                slope = -2 * bulge * (-y / half ** 2); tang = Vector((slope, 1, 0)).normalized(); nrm = Vector((tang.y, -tang.x, 0))
                p = Vector((cx(y), y, z)) + nrm * (row * 0.15) * (0.9 if course == 2 else 1)
                sandbag(M, rnd, p, math.atan2(tang.y, tang.x), H=H + rnd.uniform(-0.02, 0.02)); y += 0.6 + rnd.uniform(-0.02, 0.03)
    ob = M.finish("l11_sandbags"); turnaround("sandbags", ob, (250, 300, 60), 0.35, 1.0); return ob

# ---- 4. the M.E.G. field table (folding steel legs, olive top, worn) and its supply crate
def meg_table():
    M = Mesh(); rnd = random.Random(4); Wt, Dt, Ht = 2.2, 1.2, 0.85
    cbox(M, "olive", (0, 0, Ht - 0.02), (Wt, Dt, 0.04), 0.012)
    for sy in (-1, 1): cbox(M, "metal", (0, sy * (Dt / 2 - 0.03), Ht - 0.07), (Wt - 0.08, 0.025, 0.06), 0.004)
    for sx in (-1, 1): cbox(M, "metal", (sx * (Wt / 2 - 0.03), 0, Ht - 0.07), (0.025, Dt - 0.08, 0.06), 0.004)
    for sx in (-1, 1):
        x = sx * (Wt / 2 - 0.22)
        tube(M, "metal", [(x, -0.5, 0.02), (x, -0.5, Ht - 0.1), (x, 0.5, Ht - 0.1), (x, 0.5, 0.02)], 0.016, 8)          # the U leg frame
        tube(M, "metal", [(x, -0.5, 0.14), (x, 0.5, 0.14)], 0.011, 6)
        tube(M, "metal", [(x, -0.02, Ht - 0.1), (x + sx * -0.02, 0, 0.45)], 0.01, 6)
        tube(M, "metal", [(x - sx * 0.5, 0, Ht - 0.09), (x, 0, 0.45)], 0.012, 6)                                       # folding brace to the centre
        cbox(M, "metal", (x - sx * 0.5, 0, Ht - 0.085), (0.08, 0.06, 0.03), 0.005)
        for sy in (-1, 1): M.cyl("dark", (x, sy * 0.5, 0.018), 0.022, 0.036, seg=8)
    cbox(M, "metal", (0, 0, Ht - 0.1), (Wt - 0.5, 0.05, 0.03), 0.005)
    cbox(M, "dark", (0.62, 0.18, Ht + 0.002), (0.42, 0.3, 0.004), 0.001, (0, 0, 0.2))                                    # a scuffed rubber mat
    ob = M.finish("l11_meg_table"); turnaround("meg_table", ob, (35, 150, 260), 0.45, 1.1); return ob
def meg_cache():
    M = Mesh(); rnd = random.Random(9); W, Dd, H = 0.9, 0.6, 0.55
    cbox(M, "olive", (0, 0, 0.04 + 0.19), (W - 0.04, Dd - 0.04, 0.38), 0.02, None, None, 0.002, rnd)
    cbox(M, "olive", (0, 0, 0.42 + 0.065), (W, Dd, 0.13), 0.022, None, None, 0.002, rnd)
    cbox(M, "dark", (0, 0, 0.42), (W - 0.02, Dd - 0.02, 0.012), 0.002)
    for z in (0.12, 0.3): cbox(M, "olive", (0, 0, z), (W - 0.015, Dd - 0.015, 0.03), 0.008)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cbox(M, "metal", (sx * (W / 2 - 0.03), sy * (Dd / 2 - 0.03), 0.28), (0.07, 0.07, 0.5), 0.01)
        cbox(M, "olive", (sx * 0.3, 0, 0.02), (0.08, Dd - 0.02, 0.04), 0.01)
        cbox(M, "metal", (sx * 0.26, Dd / 2 - 0.005, 0.42), (0.06, 0.03, 0.09), 0.006)                     # latches
        cbox(M, "rust", (sx * 0.26, Dd / 2 - 0.003, 0.37), (0.04, 0.02, 0.03), 0.004)
        tube(M, "metal", [(sx * (W / 2 + 0.005), -0.1, 0.33), (sx * (W / 2 + 0.035), -0.09, 0.3), (sx * (W / 2 + 0.035), 0.09, 0.3), (sx * (W / 2 + 0.005), 0.1, 0.33)], 0.008, 6)
    cbox(M, "trim", (0, Dd / 2 - 0.012, 0.22), (0.4, 0.006, 0.14), 0.002)                                   # the stencil plate
    ob = M.finish("l11_meg_cache"); turnaround("meg_cache", ob, (35, 150, 260), 0.45, 1.3); return ob

# ---- walls with real openings: a wall along y (axis "y", at x = pos) or along x (axis "x", at y = pos), holes [(a0, a1, z0, z1)]
def wall(M, m, axis, p0, p1, u0, u1, z0, z1, holes, bev=0.0):
    cuts = sorted({u0, u1, *[h[0] for h in holes], *[h[1] for h in holes]}); cuts = [c for c in cuts if u0 <= c <= u1]; cols = []
    for a, b in zip(cuts, cuts[1:]):
        hz = sorted((h[2], h[3]) for h in holes if h[0] <= a + 1e-6 and h[1] >= b - 1e-6); spans = []; z = z0
        for h0, h1 in hz:
            if h0 > z: spans.append((z, h0))
            z = max(z, h1)
        if z < z1: spans.append((z, z1))
        if cols and cols[-1][2] == spans: cols[-1][1] = b
        else: cols.append([a, b, spans])
    for a, b, spans in cols:
        for s0, s1 in spans:
            if axis == "y": M.box(m, ((p0 + p1) / 2, (a + b) / 2, (s0 + s1) / 2), (abs(p1 - p0), b - a, s1 - s0))
            else: M.box(m, ((a + b) / 2, (p0 + p1) / 2, (s0 + s1) / 2), (b - a, abs(p1 - p0), s1 - s0))

# ---- 5. the renovation office: an 18 x 18 m two-storey brick block, hollow, storefront and open doorway on its east (+x) face
FACES = {"S": (lambda u, n, z: (u, 9 + n, z), lambda su, sn, sz: (su, sn, sz)), "N": (lambda u, n, z: (u, -9 - n, z), lambda su, sn, sz: (su, sn, sz)),
         "W": (lambda u, n, z: (-9 - n, u, z), lambda su, sn, sz: (sn, su, sz)), "E": (lambda u, n, z: (9 + n, u, z), lambda su, sn, sz: (sn, su, sz))}
def fbox(M, m, face, u, n, z, su, sn, sz, bev=0.0):
    P, S = FACES[face]
    if bev: cbox(M, m, P(u, n, z), S(su, sn, sz), bev)
    else: M.box(m, P(u, n, z), S(su, sn, sz))
def window(M, rnd, face, u, z0, z1, w, t=0.4):
    """a set-in double-hung window: frame, sashes, meeting rail, glass, stone sill and a soldier-course lintel"""
    h = z1 - z0; n = -0.16
    for s in (-1, 1): fbox(M, "trim", face, u + s * (w / 2 - 0.04), n, (z0 + z1) / 2, 0.08, 0.12, h)
    fbox(M, "trim", face, u, n, z1 - 0.04, w, 0.12, 0.08); fbox(M, "trim", face, u, n, z0 + 0.04, w, 0.12, 0.08)
    fbox(M, "trim", face, u, n - 0.02, (z0 + z1) / 2, w - 0.1, 0.07, 0.06); fbox(M, "trim", face, u, n - 0.02, (z0 + z1) / 2, 0.05, 0.07, h - 0.1)
    fbox(M, "glassLit" if rnd.random() < 0.08 else "glass", face, u, n - 0.03, (z0 + z1) / 2, w - 0.1, 0.02, h - 0.1)
    fbox(M, "trim", face, u, 0.03, z0 - 0.05, w + 0.24, 0.16, 0.1, 0.012)
    fbox(M, "trim", face, u, 0.015, z1 + 0.13, w + 0.3, 0.06, 0.26, 0.01)
def reno_office():
    M = Mesh(); rnd = random.Random(7); t = 0.4; Hw = 7.6; G0, G1, U0, U1 = 1.0, 3.4, 5.2, 7.0; ww = 1.6; cols = (-6, -3, 0, 3, 6)
    wh = [(c - ww / 2, c + ww / 2, G0, G1) for c in cols] + [(c - ww / 2, c + ww / 2, U0, U1) for c in cols]
    wall(M, "brick", "x", 9 - t, 9, -9, 9, 0, Hw, wh); wall(M, "brick", "x", -9, -9 + t, -9, 9, 0, Hw, wh)       # south (+y), north (-y)
    wall(M, "brick", "y", -9, -9 + t, -9 + t, 9 - t, 0, Hw, wh)                                                       # west
    wall(M, "brick", "y", 9 - t, 9, -9 + t, 9 - t, 0, Hw, [(-8.0, 8.0, 0, 4.4)] + [(c - ww / 2, c + ww / 2, U0, U1) for c in cols])   # east: storefront below
    for f in ("S", "N", "W", "E"):
        for c in cols:
            if f != "E": window(M, rnd, f, c, G0, G1, ww)
            window(M, rnd, f, c, U0, U1, ww)
        span = 18 if f in ("S", "N") else 18
        if f != "E": fbox(M, "concrete", f, 0, 0.0, 0.25, span + 0.08, 0.08, 0.5, 0.01); fbox(M, "trim", f, 0, 0.0, 4.45, span + 0.06, 0.08, 0.2, 0.01)
    # the storefront: aluminium mullions, a transom bar, kick panels, glass, the open door with its transom over
    for y in (-8, -6, -4, -2, 0, 2, 4, 6, 8): fbox(M, "metal", "E", y, -0.2, 2.2, 0.08 if y not in (0, 2) else 0.12, 0.14, 4.4)
    for (a, b) in ((-8, 0), (2, 8)):
        fbox(M, "metal", "E", (a + b) / 2, -0.2, 0.2, b - a, 0.14, 0.4); fbox(M, "metal", "E", (a + b) / 2, -0.2, 3.35, b - a, 0.14, 0.08)
        for k in range(int(b - a) // 2):
            yc = a + 1 + 2 * k; lit = "glassLit" if rnd.random() < 0.0 else "glass"
            fbox(M, lit, "E", yc, -0.2, 1.87, 1.92, 0.02, 2.9); fbox(M, lit, "E", yc, -0.2, 3.86, 1.92, 0.02, 0.94)
    fbox(M, "metal", "E", 1, -0.2, 2.7, 2.0, 0.14, 0.1); fbox(M, "glass", "E", 1, -0.2, 3.55, 1.92, 0.02, 1.6); fbox(M, "metal", "E", 0, -0.2, 4.36, 18 - 2, 0.14, 0.08)
    fbox(M, "dark", "E", 0, 0.06, 4.75, 17.6, 0.12, 0.62, 0.02); fbox(M, "trim", "E", 0, 0.12, 4.44, 18.1, 0.12, 0.08, 0.01); fbox(M, "trim", "E", 0, 0.12, 5.06, 18.1, 0.12, 0.08, 0.01)
    for s in (-1, 1): fbox(M, "concrete", "E", s * 8.5, 0.02, 0.25, 1.06, 0.06, 0.5, 0.01)
    # roof, cornice, parapet
    M.box("roof", (0, 0, 7.45), (18 - 2 * t, 18 - 2 * t, 0.3))
    cbox(M, "trim", (0, 0, Hw + 0.08), (18.24, 18.24, 0.16), 0.02); cbox(M, "trim", (0, 0, Hw + 0.29), (18.7, 18.7, 0.26), 0.05); cbox(M, "trim", (0, 0, Hw + 0.47), (18.5, 18.5, 0.1), 0.02)
    for k in range(-17, 18):                                                                     # dentils under the corona
        for f in ("S", "N", "W", "E"): fbox(M, "trim", f, k * 0.5, 0.17, Hw + 0.12, 0.16, 0.14, 0.12)
    z = Hw + 0.52; ph = 0.38
    M.box("brick", (0, 8.85, z + ph / 2), (17.9, 0.3, ph)); M.box("brick", (0, -8.85, z + ph / 2), (17.9, 0.3, ph)); M.box("brick", (8.85, 0, z + ph / 2), (0.3, 17.4, ph)); M.box("brick", (-8.85, 0, z + ph / 2), (0.3, 17.4, ph))
    for (c, s) in (((0, 8.85), (18.0, 0.4)), ((0, -8.85), (18.0, 0.4)), ((8.85, 0), (0.4, 17.3)), ((-8.85, 0), (0.4, 17.3))): cbox(M, "trim", (c[0], c[1], z + ph + 0.04), (s[0], s[1], 0.08), 0.015)
    M.box("roof", (0, 0, z + 0.03), (17.4, 17.4, 0.06)); cbox(M, "metal", (-3, -2, z + 0.5), (2.0, 1.4, 0.9), 0.04); M.cyl("dark", (-3, -2, z + 1.0), 0.4, 0.14, seg=12); cbox(M, "metal", (4, 3, z + 0.3), (1.0, 1.0, 0.5), 0.03)
    # renovation: tube-and-fitting scaffold over three bays of the south face, plank decks, toe boards, and plastic over one upper window
    sy0, sy1 = 9.35, 10.4; xs = (-7.6, -4.6, -1.6, 1.4)
    for x in xs:
        for y in (sy0, sy1):
            tube(M, "metal", [(x, y, 0.02), (x, y, 7.9)], 0.024, 8); cbox(M, "metal", (x, y, 0.01), (0.15, 0.15, 0.02), 0.003)
        cbox(M, "woodOld", (x, (sy0 + sy1) / 2, 0.03), (0.24, 1.5, 0.05), 0.008, (0, 0, rnd.uniform(-0.05, 0.05)), None, 0.004, rnd)
        for z in (2.0, 4.6, 7.0): tube(M, "metal", [(x, sy0 - 0.25, z + 0.05), (x, sy1 + 0.1, z + 0.05)], 0.022, 8)
    for y in (sy0, sy1):
        for z in (2.0, 4.6, 7.0): tube(M, "metal", [(xs[0] - 0.15, y, z), (xs[-1] + 0.15, y, z)], 0.022, 8)
    for z in (3.0, 5.6): tube(M, "metal", [(xs[0] - 0.1, sy1 + 0.05, z), (xs[-1] + 0.1, sy1 + 0.05, z)], 0.022, 8)
    tube(M, "metal", [(xs[0], sy1 + 0.05, 0.3), (xs[2], sy1 + 0.05, 4.4)], 0.022, 8); tube(M, "metal", [(xs[2], sy1 + 0.05, 4.6), (xs[3], sy1 + 0.05, 6.9)], 0.022, 8)
    for z in (2.1, 4.7):
        for b in range(3):
            for k in range(4):
                cbox(M, "wood" if rnd.random() < 0.6 else "woodOld", (xs[b] + 1.5 + rnd.uniform(-0.1, 0.1), sy0 + 0.13 + k * 0.26, z + 0.025 + (b % 2) * 0.05), (3.25, 0.22, 0.05), 0.008, (0, 0, rnd.uniform(-0.01, 0.01)), None, 0.004, rnd)
        cbox(M, "woodOld", ((xs[0] + xs[-1]) / 2, sy1 + 0.1, z + 0.2), (9.0, 0.04, 0.18), 0.006)
    # plastic sheeting over the upper window at x = -3 (behind the scaffold), stapled to a batten, sagging and pleated
    bm = M.bm("plastic"); nx, nz = 10, 8; grid = []
    for i in range(nx + 1):
        row = []
        for j in range(nz + 1):
            u = -3 - 1.15 + 2.3 * i / nx; zz = U1 + 0.35 - 2.6 * j / nz; pleat = 0.04 * math.sin(i * 1.7 + j * 0.3) * (j / nz)
            row.append(bm.verts.new((u + 0.05 * math.sin(j * 0.9) * (j / nz), 9.08 + pleat + 0.06 * (j / nz) ** 2, zz)))
        grid.append(row)
    for i in range(nx):
        for j in range(nz): bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    cbox(M, "wood", (-3, 9.07, U1 + 0.36), (2.4, 0.04, 0.06), 0.005)
    ob = M.finish("l11_reno_office", center=False); turnaround("reno_office", ob, (65, 150, 300), 0.35, 1.1); return ob

# ---- 6. Spamton's alley: three grimy brick walls (W, E, back) with a bricked-up window, a steel back door, a drainpipe and a fire-escape ladder stub
def spam_alley():
    M = Mesh(); rnd = random.Random(66); W, L, H = 4.2, 13.0, 7.0; xi, xo = W / 2, W / 2 + 0.6; yb = -L / 2
    door = (-2.0, -1.0, 0, 2.25)
    wall(M, "brick", "y", -xo, -xi, yb - 0.6, L / 2, 0, H, [(-2.0, -0.4, 3.2, 5.0)])                          # west, the bricked-up window
    M.box("brick", (-xi - 0.1, -1.2, 4.1), (0.2, 1.6, 1.8))
    cbox(M, "trim", (-xi + 0.02, -1.2, 3.12), (0.12, 1.8, 0.14), 0.01); cbox(M, "trim", (-xi + 0.01, -1.2, 5.12), (0.08, 1.9, 0.24), 0.01)
    wall(M, "brick", "y", xi, xo, yb - 0.6, L / 2, 0, H, [door])                                              # east, the door
    M.box("brick", (0, yb - 0.3, H / 2), (W, 0.6, H))                                                        # back
    for x0, x1 in ((-xo, -xi), (xi, xo)): cbox(M, "trim", ((x0 + x1) / 2, (yb - 0.6 + L / 2) / 2, H + 0.06), (0.7, L + 0.66, 0.12), 0.015)
    cbox(M, "trim", (0, yb - 0.3, H + 0.06), (W + 0.02, 0.7, 0.12), 0.015)
    for x, sx in ((-xi, 1), (xi, -1)):                                                                        # concrete footing, inside
        M.box("concrete", (x + sx * 0.02, 0, 0.18), (0.05, L, 0.36)) if x < 0 else (M.box("concrete", (x - 0.02, (door[1] + L / 2) / 2, 0.18), (0.05, L / 2 - door[1], 0.36)), M.box("concrete", (x - 0.02, (yb + door[0]) / 2, 0.18), (0.05, door[0] - yb, 0.36)))
    M.box("concrete", (0, yb + 0.02, 0.18), (W, 0.05, 0.36))
    for k in range(5):                                                                                       # patched brick and grime streaks
        cbox(M, "rust", (-xi + 0.004, rnd.uniform(-5.5, 5.5), rnd.uniform(3.0, 6.5)), (0.01, rnd.uniform(0.08, 0.2), rnd.uniform(0.8, 2.0)), 0.002)
    # the steel back door in its reveal
    dy = (door[0] + door[1]) / 2
    for s in (-1, 1): cbox(M, "metal", (xi + 0.07, dy + s * 0.47, 1.12), (0.14, 0.06, 2.25), 0.008)
    cbox(M, "metal", (xi + 0.07, dy, 2.22), (0.14, 1.0, 0.06), 0.008)
    cbox(M, "door", (xi + 0.12, dy, 1.1), (0.05, 0.9, 2.16), 0.01)
    for z in (0.6, 1.5): cbox(M, "door", (xi + 0.09, dy, z), (0.01, 0.82, 0.05), 0.003)
    cbox(M, "metal", (xi + 0.09, dy, 0.17), (0.012, 0.86, 0.3), 0.003); cbox(M, "rust", (xi + 0.085, dy, 0.05), (0.01, 0.86, 0.08), 0.002)
    cbox(M, "chrome", (xi + 0.08, dy + 0.34, 1.05), (0.03, 0.08, 0.14), 0.005); tube(M, "chrome", [(xi + 0.07, dy + 0.34, 1.0), (xi + 0.03, dy + 0.34, 1.0), (xi + 0.03, dy + 0.22, 1.0)], 0.012, 6)
    cbox(M, "metal", (xi + 0.04, dy + 0.25, 2.12), (0.06, 0.32, 0.07), 0.008); tube(M, "metal", [(xi + 0.03, dy + 0.1, 2.12), (xi - 0.05, dy - 0.2, 2.17)], 0.012, 6)
    cbox(M, "concrete", (xi - 0.12, dy, 0.07), (0.3, 1.3, 0.14), 0.02)                                       # the step
    # the drainpipe down the back wall: hopper head, brackets, shoe kicked out at the foot
    px, py = 1.55, yb + 0.12
    cbox(M, "metal", (px, py + 0.02, 6.75), (0.28, 0.22, 0.22), 0.02); tube(M, "metal", [(px, yb + 0.02, 6.98), (px, py + 0.05, 6.98)], 0.04, 8)
    tube(M, "metal", [(px, py, 6.65), (px, py, 0.45), (px, py + 0.08, 0.3), (px, py + 0.24, 0.2)], 0.055, 10)
    for z in (1.4, 3.2, 5.0): cbox(M, "metal", (px, py, z), (0.13, 0.13, 0.04), 0.01); cbox(M, "rust", (px, py - 0.08, z), (0.05, 0.06, 0.03), 0.004)
    cbox(M, "rust", (px, py + 0.01, 0.55), (0.12, 0.12, 0.25), 0.02)
    # a fire-escape drop-ladder stub on the west wall, hanging out of reach under a cut-off landing bracket
    lx = -xi + 0.2; ly0, ly1 = 1.7, 2.15
    for y in (ly0, ly1): tube(M, "metal", [(lx, y, 2.6), (lx, y, 6.55)], 0.018, 6)
    for k in range(13): tube(M, "metal", [(lx, ly0, 2.75 + k * 0.3), (lx, ly1, 2.75 + k * 0.3)], 0.011, 6, caps=False)
    for z in (3.6, 5.4):
        for y in (ly0, ly1): cbox(M, "metal", (-xi + 0.1, y, z), (0.2, 0.03, 0.05), 0.005)
    cbox(M, "metal", (-xi + 0.42, (ly0 + ly1) / 2, 6.6), (0.84, 1.1, 0.05), 0.01)
    for k in range(6): cbox(M, "dark", (-xi + 0.42, ly0 - 0.32 + k * 0.17, 6.63), (0.8, 0.04, 0.02), 0.003)
    for y in (ly0 - 0.35, ly1 + 0.35): tube(M, "metal", [(-xi + 0.02, y, 6.0), (-xi + 0.78, y, 6.58)], 0.016, 6); tube(M, "metal", [(-xi + 0.82, y, 6.6), (-xi + 0.82, y, 7.3)], 0.015, 6)
    tube(M, "metal", [(-xi + 0.82, ly0 - 0.35, 7.3), (-xi + 0.82, ly1 + 0.35, 7.3)], 0.015, 6)
    cbox(M, "rust", (lx, (ly0 + ly1) / 2, 2.62), (0.05, 0.5, 0.04), 0.005)
    # a dead air-conditioner over the door, its drip stain
    cbox(M, "metal", (xi - 0.3, 0.6, 4.4), (0.55, 0.7, 0.45), 0.03); cbox(M, "dark", (xi - 0.58, 0.6, 4.42), (0.02, 0.6, 0.36), 0.005)
    for s in (-1, 1): tube(M, "metal", [(xi, 0.6 + s * 0.3, 3.9), (xi - 0.5, 0.6 + s * 0.3, 4.17)], 0.015, 6)
    cbox(M, "rust", (xi - 0.004, 0.75, 2.9), (0.01, 0.12, 2.0), 0.002)
    ob = M.finish("l11_spam_alley", center=False); turnaround("spam_alley", ob, (20, 340, 90), 0.5, 0.9, (0, -1, 2.5)); return ob

exec(open(os.path.join(D, "street_kit.py")).read())
FUNCS_NEW = {"barricade_pallets": barricade_pallets, "corrugated": corrugated, "sandbags": sandbags, "meg_table": meg_table, "meg_cache": meg_cache, "reno_office": reno_office, "spam_alley": spam_alley}

FUNCS = {"glass_a": glass_a, "glass_b": glass_b, "stone": stone, "brick_a": brick_a, "brick_b": brick_b, "mall": mall, "house": house, "lamp": lamp, "hydrant": hydrant, "bench": bench, "shelter": shelter, "tree": tree, "sedan": sedan, "van": van, "bin": bin_, "box": box_, **FUNCS_NEW, **FUNCS_ST}
exec(open(os.path.join(D, "tower_kit.py")).read()); FUNCS.update(FUNCS_TK)
for n in only:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    FUNCS[n]()
