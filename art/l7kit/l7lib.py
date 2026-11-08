# A fast mesh kit for Level 7 Blender builds: every part goes into one bmesh by material slot (no bpy.ops per part), then one object,
# box-projected UVs in metres, a smooth-by-angle pass, a glb export and a Cycles proof. Blender axes: +Z up, front -Y (glTF +Z).
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector, Euler

class Kit:
    def __init__(self, seed=7):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.bm = bmesh.new(); self.mats = []; self.R = random.Random(seed)
    def mat(self, name, rgb, rough=0.7, metal=0.0, emit=None, alpha=1.0):
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
        if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = 3.0
        self.mats.append(m); return len(self.mats) - 1
    def _add(self, verts, faces, mi, M):
        vs = [self.bm.verts.new(M @ Vector(v)) for v in verts]
        for f in faces:
            try: self.bm.faces.new([vs[i] for i in f]).material_index = mi
            except ValueError: pass
    def M(self, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
        return Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))
    def box(self, loc, size, mi, rot=(0, 0, 0), M=None):
        sx, sy, sz = (s / 2 for s in size)
        v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        self._add(v, f, mi, (M or Matrix()) @ self.M(loc, rot))
    def cyl(self, loc, r, depth, mi, rot=(0, 0, 0), verts=12, r2=None, M=None, cap=True):
        r2 = r if r2 is None else r2; h = depth / 2
        v = [(math.cos(a) * r, math.sin(a) * r, -h) for a in (i / verts * math.tau for i in range(verts))] + [(math.cos(a) * r2, math.sin(a) * r2, h) for a in (i / verts * math.tau for i in range(verts))]
        f = [(i, (i + 1) % verts, verts + (i + 1) % verts, verts + i) for i in range(verts)]
        if cap: f += [tuple(reversed(range(verts))), tuple(range(verts, 2 * verts))]
        self._add(v, f, mi, (M or Matrix()) @ self.M(loc, rot))
    def sph(self, loc, scale, mi, seg=10, rings=7, M=None):
        v = [(0, 0, -1)]; f = []
        for j in range(1, rings):
            t = math.pi * j / rings - math.pi / 2
            for i in range(seg): a = i / seg * math.tau; v.append((math.cos(a) * math.cos(t), math.sin(a) * math.cos(t), math.sin(t)))
        v.append((0, 0, 1)); top = len(v) - 1
        for i in range(seg): f.append((0, 1 + (i + 1) % seg, 1 + i))
        for j in range(rings - 2):
            for i in range(seg):
                a, b = 1 + j * seg + i, 1 + j * seg + (i + 1) % seg
                f.append((a, b, b + seg, a + seg))
        for i in range(seg): f.append((top, 1 + (rings - 2) * seg + i, 1 + (rings - 2) * seg + (i + 1) % seg))
        self._add(v, f, mi, (M or Matrix()) @ self.M(loc, scale=scale))
    def poly(self, pts, mi, thick=0.02, M=None):  # a flat polygon in its XZ plane (y = 0), extruded along y
        n = len(pts); v = [(x, -thick / 2, z) for x, z in pts] + [(x, thick / 2, z) for x, z in pts]
        f = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        self._add(v, f, mi, M or Matrix())
    def finish(self, name, uv_scale=0.5):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
        bm.normal_update()
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            n = f.normal; ax = max(range(3), key=lambda k: abs(n[k]))
            for l in f.loops:
                c = l.vert.co; u, w = (c.x, c.y) if ax == 2 else (c.y, c.z) if ax == 0 else (c.x, c.z)
                l[uv].uv = (u * uv_scale, w * uv_scale)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        for m in self.mats: me.materials.append(m)
        ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
        for p in me.polygons: p.use_smooth = False
        self.ob = ob; return ob
    def export(self, path):
        bpy.ops.object.select_all(action="DESELECT"); self.ob.select_set(True); bpy.context.view_layer.objects.active = self.ob
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_materials="EXPORT")
        print("exported", path, "tris", sum(len(p.vertices) - 2 for p in self.ob.data.polygons), "dims", tuple(round(x, 2) for x in self.ob.dimensions))
    def proof(self, out, views, res=656, samples=12):
        sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = samples; sc.cycles.device = "CPU"
        sc.render.resolution_x = res; sc.render.resolution_y = res
        w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.55, 0.6, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
        for tag, (eye, tgt) in views.items():
            sd = bpy.data.lights.new("s", "SUN"); sd.energy = 3.5; sun = bpy.data.objects.new("s", sd); bpy.context.collection.objects.link(sun)
            sun.rotation_euler = (Vector(tgt) - Vector(eye)).to_track_quat("-Z", "Y").to_euler(); sun.rotation_euler.x -= 0.4
            cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); bpy.context.collection.objects.link(cam)
            cam.location = eye; cam.rotation_euler = (Vector(tgt) - Vector(eye)).to_track_quat("-Z", "Y").to_euler(); cd.lens = 28; sc.camera = cam
            sc.render.filepath = os.path.join(out, tag + ".png"); bpy.ops.render.render(write_still=True)
            bpy.data.objects.remove(sun)
