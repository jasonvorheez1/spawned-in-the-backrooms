# Level 11 crawl kit (Nov 10): the props that dress the service tunnels under the dead subway, so the run reads as
# built concrete and steel, not boxes. One GLB per model in art/l11crawl/out/ (gitignored), uploaded by upload.py.
# Front is +Y in Blender (glTF -Z: the game says forward "-z"); each model stands on z = 0, centred on x/y.
# Materials are named so the game can re-texture them: "concrete" takes the tunnel's wet-concrete texture.
# Run: "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" -b --factory-startup --python art/l11crawl/build.py
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix, Euler
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, "out"); os.makedirs(OUT, exist_ok=True)
ALL = ["lamp", "rubble", "pipes", "portal", "case", "pillar", "generator", "breaker", "locker"]
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ALL
TILE = 2.0

MATS = {  # colour, roughness, metal, emission, alpha
    "concrete": ((0.5, 0.49, 0.45), 0.9, 0, 0, 1), "iron": ((0.13, 0.13, 0.12), 0.55, 0.85, 0, 1), "rust": ((0.32, 0.15, 0.07), 0.8, 0.5, 0, 1),
    "paintGreen": ((0.16, 0.3, 0.22), 0.6, 0.35, 0, 1), "paintCream": ((0.72, 0.68, 0.55), 0.7, 0.1, 0, 1), "hazard": ((0.85, 0.62, 0.05), 0.6, 0.1, 0, 1),
    "black": ((0.02, 0.02, 0.02), 0.6, 0.2, 0, 1), "glow": ((1.0, 0.8, 0.5), 0.3, 0, 4.0, 1), "glass": ((0.75, 0.85, 0.85), 0.05, 0, 0, 0.18),
    "brass": ((0.7, 0.5, 0.2), 0.3, 1.0, 0, 1), "wood": ((0.28, 0.14, 0.07), 0.55, 0, 0, 1), "velvet": ((0.35, 0.03, 0.04), 0.95, 0, 0, 1),
    "rebar": ((0.25, 0.12, 0.06), 0.85, 0.6, 0, 1), "redGlow": ((1.0, 0.12, 0.06), 0.4, 0, 3.0, 1), "copper": ((0.72, 0.36, 0.2), 0.4, 1.0, 0, 1),
}
def get_mat(n):
    m = bpy.data.materials.get(n)
    if m: return m
    c, r, mt, em, a = MATS[n]; m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; b.inputs["Metallic"].default_value = mt
    if em: b.inputs["Emission Color"].default_value = (*c, 1); b.inputs["Emission Strength"].default_value = em
    if a < 1:
        b.inputs["Alpha"].default_value = a
        try: m.blend_method = "BLEND"
        except Exception: pass
    m.diffuse_color = (*c, a); return m

SMOOTH = {"glass", "glow", "brass", "iron", "copper", "rebar", "velvet", "redGlow"}
class Mesh:
    def __init__(self): self.b = {}
    def bm(self, m): return self.b.setdefault(m, bmesh.new())
    def _t(self, c, rot): return Matrix.Translation(c) @ (Euler(rot, "XYZ").to_matrix().to_4x4() if rot else Matrix.Identity(4))
    def box(self, m, c, s, rot=None, bevel=0.0):
        bm = bmesh.new() if bevel else self.bm(m); r = bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.transform(bm, matrix=Matrix.Diagonal((s[0], s[1], s[2], 1)), verts=r["verts"])
        if bevel:
            bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=1, affect="EDGES")
            bmesh.ops.transform(bm, matrix=self._t(c, rot), verts=bm.verts[:]); self._merge(m, bm); return
        bmesh.ops.transform(bm, matrix=self._t(c, rot), verts=r["verts"])
    def _merge(self, m, src):
        me = bpy.data.meshes.new("tmp"); src.to_mesh(me); src.free(); self.bm(m).from_mesh(me); bpy.data.meshes.remove(me)
    def cyl(self, m, c, r, h, r2=None, seg=16, rot=None):
        bm = self.bm(m); res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        bmesh.ops.transform(bm, matrix=self._t(c, rot), verts=res["verts"])
    def sph(self, m, c, r, sc=(1, 1, 1), seg=12, noise=0.0, rnd=None):
        bm = self.bm(m); res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(5, seg // 2), radius=r)
        if noise and rnd:
            for v in res["verts"]: v.co *= 1 + rnd.uniform(-noise, noise)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ Matrix.Diagonal((sc[0], sc[1], sc[2], 1)), verts=res["verts"])
    def rock(self, m, c, r, sc, rnd, rot=None):
        bm = bmesh.new(); res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        for v in res["verts"]: v.co *= 1 + rnd.uniform(-0.28, 0.2)
        bmesh.ops.transform(bm, matrix=self._t(c, rot) @ Matrix.Diagonal((sc[0], sc[1], sc[2], 1)), verts=bm.verts[:]); self._merge(m, bm)
    def rod(self, m, pts, r, seg=6):  # a bent bar through points
        for a, b in zip(pts, pts[1:]):
            a, b = Vector(a), Vector(b); d = b - a; L = d.length
            if L < 1e-4: continue
            q = d.normalized().to_track_quat("Z", "Y")
            bm = self.bm(m); res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=L)
            bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4(), verts=res["verts"])
    def ring(self, m, c, R, r, rot=None, seg=20):
        pts = [(c[0] + R * math.cos(t), c[1] + R * math.sin(t), c[2]) for t in [i / seg * 2 * math.pi for i in range(seg + 1)]]
        if rot:
            M = Euler(rot, "XYZ").to_matrix(); pts = [tuple(Vector(c) + M @ (Vector(p) - Vector(c))) for p in pts]
        self.rod(m, pts, r, 5)
    def finish(self, name):
        objs = []
        for m, bm in self.b.items():
            bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0005)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
            lay = bm.loops.layers.uv.verify()
            for f in bm.faces:
                n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
                for l in f.loops:
                    p = l.vert.co; a, b = ((p.y, p.z), (p.x, p.z), (p.x, p.y))[ax]
                    l[lay].uv = (a / TILE, b / TILE)
            me = bpy.data.meshes.new(name + "_" + m); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name + "_" + m, me); bpy.context.collection.objects.link(o)
            o.data.materials.append(get_mat(m))
            for p in me.polygons: p.use_smooth = m in SMOOTH
            objs.append(o)
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.active_object; ob.name = name
        bb = [Vector(c) for c in ob.bound_box]; cx = (min(v.x for v in bb) + max(v.x for v in bb)) / 2; cy = (min(v.y for v in bb) + max(v.y for v in bb)) / 2; zmin = min(v.z for v in bb)
        ob.data.transform(Matrix.Translation((-cx, -cy, -zmin))); ob.location = (0, 0, 0)
        bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        path = os.path.join(OUT, "l11c_" + name + ".glb"); bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
        print("exported", name, "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons), "dims", tuple(round(x, 2) for x in ob.dimensions))
        preview(name, ob); return ob

def preview(name, ob):
    sc = bpy.context.scene; sc.render.engine = "BLENDER_WORKBENCH"; sc.render.resolution_x = 520; sc.render.resolution_y = 520
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    r = max(ob.dimensions) * 1.25 + 0.3; h = ob.dimensions.z / 2
    cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); bpy.context.collection.objects.link(co); sc.camera = co
    co.location = (r * math.sin(0.7), -r * math.cos(0.7), h + r * 0.45)
    co.rotation_euler = (Vector((0, 0, h)) - co.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(OUT, "preview_" + name + ".png"); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(co)

def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)

# ---------------- models
def lamp():  # a caged bulkhead lamp hung from a junction box: cast-iron dome, glass globe, a wire cage (0.42 m)
    M = Mesh(); M.box("iron", (0, 0, 0.4), (0.16, 0.16, 0.05), bevel=0.01)       # junction box on the slab
    M.cyl("iron", (0, 0, 0.33), 0.022, 0.12)                                       # conduit drop
    M.cyl("iron", (0, 0, 0.255), 0.13, 0.05, r2=0.06, seg=20)                      # the dome
    M.cyl("iron", (0, 0, 0.22), 0.135, 0.025, seg=20)                              # the rim
    M.sph("glow", (0, 0, 0.12), 0.085, (1, 1, 1.15), 16)                            # the globe
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        M.rod("iron", [(0.12 * math.cos(a), 0.12 * math.sin(a), 0.215), (0.11 * math.cos(a), 0.11 * math.sin(a), 0.1), (0.04 * math.cos(a), 0.04 * math.sin(a), 0.0)], 0.006)
    M.ring("iron", (0, 0, 0.12), 0.112, 0.006); M.ring("iron", (0, 0, 0.04), 0.07, 0.006)
    M.finish("lamp")

def rubble():  # a fallen section of the vault: cracked slabs leaning on a heap, chunks and bent rebar (2.3 x 2.6 x 1.5)
    rnd = random.Random(11); M = Mesh()
    M.box("concrete", (0.1, 0.0, 0.55), (2.0, 1.2, 0.22), rot=(0.42, 0.12, 0.05), bevel=0.03)
    M.box("concrete", (-0.4, 0.7, 0.35), (1.3, 0.9, 0.2), rot=(-0.3, 0.25, 0.4), bevel=0.03)
    M.box("concrete", (0.6, -0.8, 0.25), (1.0, 0.8, 0.18), rot=(0.2, -0.35, -0.3), bevel=0.03)
    for i in range(22):
        r = rnd.uniform(0.08, 0.32); M.rock("concrete", (rnd.uniform(-1.0, 1.0), rnd.uniform(-1.2, 1.2), r * 0.6 + rnd.uniform(0, 0.25)), r, (1, rnd.uniform(0.7, 1.3), rnd.uniform(0.5, 0.9)), rnd, (rnd.random(), rnd.random(), rnd.random()))
    for i in range(7):
        x0, y0 = rnd.uniform(-0.8, 0.8), rnd.uniform(-0.6, 0.6)
        M.rod("rebar", [(x0, y0, 0.5), (x0 + rnd.uniform(-0.3, 0.3), y0 + rnd.uniform(-0.3, 0.3), 0.9 + rnd.uniform(0, 0.4)), (x0 + rnd.uniform(-0.5, 0.5), y0 + rnd.uniform(-0.5, 0.5), 1.1 + rnd.uniform(0, 0.4))], 0.012)
    M.finish("rubble")

def pipes():  # a 4 m run of two service mains on wall brackets: flanged joints, valve wheel, rust at the seams (along +Y)
    M = Mesh()
    for k, (z, r, mat) in enumerate([(0.0, 0.11, "paintGreen"), (0.32, 0.075, "rust")]):
        M.cyl(mat, (0, 0, z + 0.2), r, 4.0, rot=(math.pi / 2, 0, 0))
        for y in (-2.0, 0.0, 2.0):
            M.cyl("iron", (0, y, z + 0.2), r + 0.03, 0.06, rot=(math.pi / 2, 0, 0), seg=18)
            for b in range(6):
                a = b / 6 * 2 * math.pi; M.cyl("iron", ((r + 0.018) * math.cos(a), y, z + 0.2 + (r + 0.018) * math.sin(a)), 0.008, 0.08, rot=(math.pi / 2, 0, 0), seg=6)
    for y in (-1.0, 1.0):  # angle-iron brackets back to the wall (-X)
        M.box("rust", (-0.2, y, 0.06), (0.4, 0.05, 0.04)); M.box("rust", (-0.2, y, 0.38), (0.4, 0.05, 0.04)); M.box("rust", (-0.4, y, 0.25), (0.04, 0.06, 0.55))
    M.cyl("iron", (0.13, 0.9, 0.2), 0.03, 0.12, rot=(0, math.pi / 2, 0)); M.ring("iron", (0.2, 0.9, 0.2), 0.08, 0.009, rot=(0, math.pi / 2, 0))
    for s in range(3): a = s * math.pi / 3; M.rod("iron", [(0.2, 0.9 - 0.08 * math.cos(a), 0.2 - 0.08 * math.sin(a)), (0.2, 0.9 + 0.08 * math.cos(a), 0.2 + 0.08 * math.sin(a))], 0.007)
    M.finish("pipes")

def portal():  # a poured bulkhead frame between sections: chamfered jambs, riveted I-beam lintel, hazard-striped edges
    M = Mesh(); W, H, T = 3.2, 2.6, 0.5  # opening
    for s in (-1, 1):
        M.box("concrete", (s * (W / 2 + 0.3), 0, 1.65), (0.6, T, 3.3), bevel=0.04)
        for i in range(7):  # yellow and black bands on the jamb edges, knee to shoulder
            M.box("hazard" if i % 2 == 0 else "black", (s * (W / 2 + 0.005), 0, 0.2 + i * 0.22 + 0.11), (0.03, T + 0.02, 0.22))
    M.box("concrete", (0, 0, H + 0.35), (W + 1.2, T, 0.7), bevel=0.03)
    M.box("iron", (0, 0, H + 0.03), (W + 0.4, T + 0.1, 0.06)); M.box("iron", (0, 0, H - 0.18), (W + 0.4, 0.06, 0.4)); M.box("iron", (0, 0, H - 0.38), (W + 0.4, T + 0.1, 0.06))
    for x in [-1.6 + i * 0.4 for i in range(9)]:
        for y in (-0.3, 0.3): M.sph("iron", (x, y, H - 0.18), 0.018, seg=6)
    M.box("rust", (0, -(T / 2 + 0.01), H + 0.45), (0.9, 0.02, 0.28))  # the blank stencil plate the game writes on
    M.finish("portal")

def case():  # the R-55 display: a walnut plinth with brass kick plate, a velvet cradle under a glass hood, brass corner posts
    M = Mesh()
    M.box("wood", (0, 0, 0.45), (0.9, 0.6, 0.9), bevel=0.015); M.box("brass", (0, -0.301, 0.06), (0.9, 0.01, 0.1))
    M.box("wood", (0, 0, 0.92), (0.98, 0.68, 0.05), bevel=0.01)
    M.box("velvet", (0, 0, 0.98), (0.7, 0.42, 0.07), bevel=0.02)
    for x in (-0.18, 0.18): M.box("velvet", (x, 0, 1.04), (0.05, 0.3, 0.06), bevel=0.02)  # the two saddles the gun lies across
    M.box("glass", (0, 0, 1.24), (0.9, 0.6, 0.6))
    for x in (-0.45, 0.45):
        for y in (-0.3, 0.3): M.box("brass", (x, y, 1.24), (0.025, 0.025, 0.6))
    for z in (0.95, 1.54):
        for y in (-0.3, 0.3): M.box("brass", (0, y, z), (0.92, 0.025, 0.025))
        for x in (-0.45, 0.45): M.box("brass", (x, 0, z), (0.025, 0.62, 0.025))
    M.box("brass", (0, -0.31, 0.72), (0.34, 0.012, 0.12), bevel=0.004)  # the plaque
    M.finish("case")

def pillar():  # a machine-hall column: chamfered shaft, haunched capital into the slab, a painted band and a scuffed base
    M = Mesh(); M.box("concrete", (0, 0, 1.7), (0.6, 0.6, 3.4), bevel=0.06)
    M.box("concrete", (0, 0, 3.55), (0.95, 0.95, 0.3), bevel=0.05); M.box("concrete", (0, 0, 3.3), (0.75, 0.75, 0.2), bevel=0.05)
    M.box("concrete", (0, 0, 0.12), (0.72, 0.72, 0.24), bevel=0.04)
    M.box("paintGreen", (0, 0, 0.75), (0.615, 0.615, 0.9)); M.box("hazard", (0, 0, 1.25), (0.62, 0.62, 0.1))
    M.box("iron", (0.31, 0, 2.2), (0.04, 0.12, 0.2)); M.cyl("iron", (0.31, 0, 2.95), 0.018, 1.3)  # a conduit running up one face
    M.finish("pillar")

def generator():  # a 1950s diesel set on skids: block, cylinder heads, flywheel, radiator, exhaust stack (3.2 x 1.3 x 2.0)
    M = Mesh()
    for y in (-0.5, 0.5): M.box("iron", (0, y, 0.08), (3.2, 0.14, 0.16))
    M.box("paintGreen", (-0.3, 0, 0.7), (1.9, 0.9, 1.0), bevel=0.05)
    for i in range(4): M.box("paintGreen", (-1.0 + i * 0.47, 0, 1.32), (0.38, 0.6, 0.28), bevel=0.04)
    M.cyl("iron", (-0.3, 0.3, 1.55), 0.06, 1.6, rot=(0, math.pi / 2, 0))
    M.cyl("iron", (0.95, 0, 0.75), 0.6, 0.18, rot=(0, math.pi / 2, 0), seg=28); M.cyl("rust", (0.95, 0, 0.75), 0.15, 0.3, rot=(0, math.pi / 2, 0))
    M.box("paintCream", (1.3, 0, 0.7), (0.5, 1.0, 1.1), bevel=0.03)  # the alternator housing
    M.box("black", (-1.35, 0, 0.75), (0.12, 1.1, 1.2));
    for z in range(9): M.box("iron", (-1.42, 0, 0.25 + z * 0.12), (0.02, 1.08, 0.02))
    M.cyl("rust", (-0.6, -0.3, 2.0), 0.09, 1.0); M.cyl("rust", (-0.6, -0.3, 2.5), 0.12, 0.08)
    M.box("iron", (1.3, -0.52, 0.95), (0.3, 0.05, 0.3)); M.cyl("paintCream", (1.25, -0.56, 0.98), 0.05, 0.02, rot=(math.pi / 2, 0, 0)); M.cyl("paintCream", (1.38, -0.56, 0.98), 0.05, 0.02, rot=(math.pi / 2, 0, 0))
    M.sph("redGlow", (1.3, -0.56, 0.86), 0.02, seg=8)
    M.finish("generator")

def breaker():  # a wall switch cabinet: steel box, a knife switch on a slate panel, conduits up into the slab (0.9 x 0.35 x 3.0)
    M = Mesh()
    M.box("paintCream", (0, 0, 1.4), (0.9, 0.3, 1.1), bevel=0.02); M.box("black", (0, -0.155, 1.4), (0.7, 0.02, 0.85))
    M.rod("copper", [(-0.2, -0.17, 1.15), (-0.2, -0.17, 1.65)], 0.012); M.rod("copper", [(0.2, -0.17, 1.15), (0.2, -0.17, 1.65)], 0.012)
    M.rod("iron", [(-0.25, -0.2, 1.62), (0.25, -0.2, 1.62)], 0.02); M.cyl("black", (0.3, -0.2, 1.62), 0.035, 0.12, rot=(0, math.pi / 2, 0))
    for x in (-0.3, 0, 0.3): M.cyl("iron", (x, 0, 2.4), 0.025, 1.2)
    M.sph("redGlow", (0.32, -0.16, 1.88), 0.022, seg=8); M.box("hazard", (0, -0.152, 1.06), (0.5, 0.01, 0.08))
    M.finish("breaker")

def locker():  # a dented steel tool locker, door ajar (0.6 x 0.5 x 1.9)
    M = Mesh(); M.box("paintGreen", (0, 0, 0.95), (0.6, 0.5, 1.9), bevel=0.01)
    M.box("paintGreen", (0.3, -0.42, 0.95), (0.02, 0.56, 1.8), rot=(0, 0, -0.5)); M.box("black", (0, -0.24, 0.95), (0.54, 0.02, 1.78))
    for z in (1.6, 1.7, 1.8): M.box("black", (0.42, -0.6, z), (0.005, 0.2, 0.025), rot=(0, 0, -0.5))
    M.box("rust", (0, -0.05, 1.2), (0.54, 0.4, 0.02)); M.box("rust", (0, -0.05, 0.6), (0.54, 0.4, 0.02))
    M.finish("locker")

for n in only:
    clear(); globals()[n]()
