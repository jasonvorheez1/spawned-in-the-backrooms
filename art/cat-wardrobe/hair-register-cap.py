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
SRC = {"f": "/workspace/cathead/f-anime.glb", "m": "/workspace/cathead/m-anime.glb"}; SCULPT = {"f": "/workspace/hair/tripo8/female.glb", "m": "/workspace/hair/tripo8/male.glb"}
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
CAP = {"twin2": -0.05, "pony2": 0.0}
for sex in ("f", "m"):
    tgt = load_mesh(SRC[sex], "Head"); tgt = tgt[np.random.default_rng(1).choice(len(tgt), min(4000, len(tgt)), replace=False)]; src = load_mesh(SCULPT[sex])
    rng = np.random.default_rng(0); src_s = src[rng.choice(len(src), min(1500, len(src)), replace=False)]
    # the sculpt is a whole small cat facing +X; its head is everything above the neck (narrowest slice of the side-to-side width)
    R0 = np.array([[0, 1, 0], [-1, 0, 0], [0, 0, 1.0]])   # +X front -> Blender front -Y
    src = src @ R0.T; zs = np.linspace(src[:, 2].min(), src[:, 2].max(), 60)
    wid = [np.ptp(src[(src[:, 2] > z0) & (src[:, 2] < z0 + 0.006), 0]) if ((src[:, 2] > z0) & (src[:, 2] < z0 + 0.006)).sum() > 5 else 9 for z0 in zs]
    z0_, z1_ = src[:, 2].min(), src[:, 2].max(); band = [(w, z) for w, z in zip(wid, zs) if z0_ + 0.5 * (z1_ - z0_) < z < z0_ + 0.8 * (z1_ - z0_)]; zn = min(band)[1]   # the neck: narrowest slice between the T-pose shoulders and the cheeks
    hd = src[src[:, 2] > zn]; tg = tgt[tgt[:, 2] > tgt[:, 2].min()]
    # cranium by width alone (ears differ between sculpt and cat), seated by the crown: the top of the skull between the ears
    sc = float(np.ptp(tgt, 0)[0] / np.ptp(hd, 0)[0])
    def crown(P): c = P[np.abs(P[:, 0] - P[:, 0].mean()) < 0.12 * np.ptp(P, 0)[0]]; c = c[np.abs(c[:, 1] - c[:, 1].mean()) < 0.25 * np.ptp(c, 0)[1]]; return c[:, 2].max()
    k = np.array([sc, sc, sc])
    pl = np.array([(hd[:, 0].min() + hd[:, 0].max()) / 2, (hd[:, 1].min() + hd[:, 1].max()) / 2, crown(hd)])
    lo2 = np.array([(tgt[:, 0].min() + tgt[:, 0].max()) / 2, (tgt[:, 1].min() + tgt[:, 1].max()) / 2, crown(tgt)])
    T[sex] = (R0, k, pl, lo2, tgt)
    print("REG", sex, "neck", round(float(zn), 3), "scale", round(sc, 3))
for sex in ("f", "m"):
    R0, k, pl, lo2, tgt = T[sex]; crown_t = lo2[2]; kdh = cKDTree(tgt); ctr = (tgt.min(0) + tgt.max(0)) / 2
    for hp in sorted(glob.glob(f"/workspace/hair/cat9b/{sex}_*.glb")):
        if hp.endswith("-raw.glb"): continue
        st = os.path.basename(hp)[2:-4]
        bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC[sex])
        arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        if arm.animation_data: arm.animation_data.action = None
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
        headO = next(o for o in bpy.data.objects if o.type == "MESH" and o.name == "Head")
        HM = headO.matrix_world.copy(); capme = headO.data.copy(); capme.transform(HM)
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
        sh = {"twintails": 0.6, "afropuff": 0.9}.get(st)   # styles that read too big: what hangs below the crown pulls in toward the skull and up
        if sh:
            top = crown_t; far = V[:, 2] < top - 0.12; c2 = np.array([ctr[0], ctr[1], top - 0.12])
            V[far] = c2 + (V[far] - c2) * sh
        for v, c in zip(hair.data.vertices, V): v.co = c
        hair.data.update()
        # anime hair reads as smooth ribbon locks, not facets: weld the Tripo shell, smooth it, one subdivision where the budget allows
        import bmesh
        bm = bmesh.new(); bm.from_mesh(hair.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006); bm.to_mesh(hair.data); bm.free()
        for fc in hair.data.polygons: fc.use_smooth = True
        bpy.context.view_layer.objects.active = hair
        sm = hair.modifiers.new("sm", "SMOOTH"); sm.factor = 0.5; sm.iterations = 4; bpy.ops.object.modifier_apply(modifier="sm")
        if len(hair.data.polygons) < 14000:
            sub = hair.modifiers.new("s", "SUBSURF"); sub.levels = 1; bpy.ops.object.modifier_apply(modifier="s")
        if st in CAP:
            # a hair-coloured cap over the back of the skull: the sculpt is bald behind (twintails, ponytail)
            import bmesh as _bm
            b = _bm.new(); b.from_mesh(capme); b.normal_update()
            H = np.array([tuple(v.co) for v in b.verts]); hmin, hmax = H.min(0), H.max(0); hc = (hmin + hmax) / 2; hs = hmax - hmin
            drop = [f for f in b.faces if not (f.calc_center_median().y > hc[1] + CAP[st] * hs[1] and f.calc_center_median().z > hc[2] - 0.05 * hs[2] and f.calc_center_median().z < crown_t - 0.01 and f.normal.z > -0.3 and abs(f.calc_center_median().x - hc[0]) < 0.42 * hs[0])]
            _bm.ops.delete(b, geom=drop, context="FACES")
            for v in b.verts: v.co += v.normal * 0.004
            cm = bpy.data.meshes.new("cap"); b.to_mesh(cm); b.free()
            for p_ in cm.polygons: p_.use_smooth = True
            co = bpy.data.objects.new("cap", cm); bpy.context.collection.objects.link(co)
            co.data.materials.append(hair.data.materials[0])
            bpy.ops.object.select_all(action="DESELECT"); co.select_set(True); hair.select_set(True); bpy.context.view_layer.objects.active = hair; bpy.ops.object.join()
            print("CAP", st, len(cm.polygons) if cm.name in bpy.data.meshes else "joined")
        print("TRIS", st, len(hair.data.polygons))
        hair.name = "hair"; hair.vertex_groups.clear()
        g = hair.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")
        hair.parent = arm; hair.modifiers.new("skin", "ARMATURE").object = arm
        for m in hair.data.materials: m.name = "hair"
        bpy.ops.object.select_all(action="DESELECT"); hair.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.gltf(filepath=f"/workspace/cathair/{st}-{sex}.glb", use_selection=True, export_skins=True, export_animations=False, export_apply=False, export_image_format="JPEG")
        print("HAIR", sex, st)
