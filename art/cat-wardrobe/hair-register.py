# The fitted Tripo hairstyles (/workspace/hair/cat/<sex>_<style>.glb) live in the Tripo head sculpt's space (/workspace/hair/tripo8/<female|male>.glb).
# Register that sculpt onto the current cat's Head mesh (24 axis turns x uniform scale, then similarity ICP), carry each hairstyle by the same transform,
# skin it to mixamorig:Head and export /workspace/cathair/<style>-<sex>.glb. Prints the fit error so a bad registration shows.
import bpy, glob, os, itertools, numpy as np
from mathutils import Matrix
from scipy.spatial import cKDTree
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
    tgt = load_mesh(SRC[sex], "Head"); src = load_mesh(SCULPT[sex])
    rng = np.random.default_rng(0); src_s = src[rng.choice(len(src), min(3000, len(src)), replace=False)]
    kd = cKDTree(tgt); best = None
    for R0 in rots():
        p = src_s @ R0.T; s0 = np.ptp(tgt, 0).max() / np.ptp(p, 0).max(); p = (p - p.mean(0)) * s0 + tgt.mean(0)
        s, R, t = s0, R0, None; cur = p
        for _ in range(30):
            d, i = kd.query(cur); s2, R2, t2 = umeyama(cur, tgt[i]); cur = s2 * cur @ R2.T + t2
        d, _ = kd.query(cur); e = np.median(d)
        # also the reverse error (target covered), so a shrunken fit can't win
        d2, _ = cKDTree(cur).query(tgt); e += np.median(d2)
        if best is None or e < best[0]: best = (e, src_s, cur)
    e, A, B = best; s, R, t = umeyama(A, B); T[sex] = (s, R, t)
    print("REG", sex, "err_m", round(float(e), 4), "scale", round(float(s), 3))
for sex in ("f", "m"):
    s, R, t = T[sex]
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
        S = Matrix([list(s * R[i]) + [t[i]] for i in range(3)] + [[0, 0, 0, 1]]); hair.data.transform(S); hair.data.update()
        hair.name = "hair"; hair.vertex_groups.clear()
        g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")
        hair.parent = arm; hair.modifiers.new("skin", "ARMATURE").object = arm
        for m in hair.data.materials: m.name = "hair"
        bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"/workspace/cathair/{st}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False, export_image_format="JPEG")
        print("HAIR", sex, st)
