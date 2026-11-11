# The fitted Tripo hairstyles (/workspace/hair/cat/<sex>_<style>.glb) live in the Tripo head sculpt's space (/workspace/hair/tripo8/<female|male>.glb).
# Register that sculpt onto the current cat's Head mesh (24 axis turns x uniform scale, then similarity ICP), carry each hairstyle by the same transform,
# skin it to mixamorig:Head and export /workspace/cathair/<style>-<sex>.glb. Prints the fit error so a bad registration shows.
import bpy, glob, os, itertools, numpy as np
from mathutils import Matrix
from mathutils.kdtree import KDTree
class cKDTree:
    def __init__(self, P):
        self.P = np.asarray(P); self.k = KDTree(len(self.P))
        for i, q in enumerate(self.P): self.k.insert(q, i)
        self.k.balance()
    def query(self, Q):
        r = [self.k.find(q) for q in np.asarray(Q)]
        return np.array([x[2] for x in r]), np.array([x[1] for x in r])
SRC = {"f": "/tmp/fl/f.glb", "m": "/tmp/fl/m.glb"}; SCULPT = {"f": "/workspace/hair/tripo8/female.glb", "m": "/workspace/hair/tripo8/male.glb"}
os.makedirs("/workspace/cathair", exist_ok=True)
def verts(o): M = np.array(o.matrix_world); v = np.array([tuple(x.co) for x in o.data.vertices]); return v @ M[:3, :3].T + M[:3, 3]
def load_mesh(p, name=None):
    bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=p)
    ms = [o for o in bpy.data.objects if o.type == "MESH"]
    return verts(next(o for o in ms if o.name == name) if name else max(ms, key=lambda o: len(o.data.vertices)))
def rots():
    out = []
    for perm in itertools.permutations(range(3)):
        for sg in itertools.product((1, -1), repeat=3):
            R = np.zeros((3, 3)); [R.__setitem__((i, perm[i]), sg[i]) for i in range(3)]
            if np.linalg.det(R) > 0: out.append(R)
    return out
def umeyama(A, B):
    ma, mb = A.mean(0), B.mean(0); a, b = A - ma, B - mb
    U, S, Vt = np.linalg.svd(b.T @ a / len(A)); D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt; s = (S * np.diag(D)).sum() / (a ** 2).sum() * len(A); return s, R, mb - s * R @ ma
T = {}
for sex in ("f", "m"):
    tgt = load_mesh(SRC[sex], "Head"); tgt = tgt[np.random.default_rng(1).choice(len(tgt), min(4000, len(tgt)), replace=False)]; src = load_mesh(SCULPT[sex])
    rng = np.random.default_rng(0); src_s = src[rng.choice(len(src), min(1500, len(src)), replace=False)]
    kd = cKDTree(tgt); best = None
    lo, hi = tgt.min(0), tgt.max(0)
    for R0 in rots():   # each axis turn: the sculpt's box stretched onto the head's box per axis, scored by two-way chamfer
        p = src_s @ R0.T; pl, ph = p.min(0), p.max(0); k = (hi - lo) / (ph - pl); cur = (p - pl) * k + lo
        d, _ = kd.query(cur); d2, _ = cKDTree(cur).query(tgt); e = float(np.mean(d) + np.mean(d2))
        if best is None or e < best[0]: best = (e, R0, k, pl, lo)
    e, R0, k, pl, lo2 = best
    T[sex] = (R0, k, pl, lo2, tgt)
    print("REG", sex, "err_m", round(e, 4), "k", k.round(2))
for sex in ("f", "m"):
    R0, k, pl, lo2, tgt = T[sex]; kdh = cKDTree(tgt); ctr = (tgt.min(0) + tgt.max(0)) / 2
    for hp in sorted(glob.glob(f"/workspace/hair/cat/{sex}_*.glb")):
        if hp.endswith("-raw.glb"): continue
        st = os.path.basename(hp)[2:-4]
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC[sex])
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        if arm.animation_data: arm.animation_data.action = None
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
        for o in list(bpy.data.objects):
            if o.type == "MESH": bpy.data.objects.remove(o)
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=hp)
        hair = [o for o in bpy.data.objects if o not in before and o.type == "MESH"][0]
        for o in [o for o in bpy.data.objects if o not in before and o is not hair]: bpy.data.objects.remove(o)
        M = hair.matrix_world.copy(); hair.parent = None; hair.data.transform(M); hair.matrix_world.identity()
        V = np.array([tuple(v.co) for v in hair.data.vertices]); V = ((V @ R0.T) - pl) * k + lo2
        # lift any strand the stretch sank into the skull: out along the centre ray until 6 mm clear
        d, i = kdh.query(V); dirs = V - ctr; dirs /= np.linalg.norm(dirs, axis=1, keepdims=True) + 1e-9
        inside = np.einsum("ij,ij->i", V - tgt[i], dirs) < 0.006
        V[inside] = tgt[i][inside] + dirs[inside] * 0.006 + (V[inside] - tgt[i][inside]) * 0.15
        for v, c in zip(hair.data.vertices, V): v.co = c
        hair.data.update()
        hair.name = "hair"; hair.vertex_groups.clear()
        g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")
        hair.parent = arm; hair.modifiers.new("skin", "ARMATURE").object = arm
        for m in hair.data.materials: m.name = "hair"
        bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"/workspace/cathair/{st}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False, export_image_format="JPEG")
        print("HAIR", sex, st)
