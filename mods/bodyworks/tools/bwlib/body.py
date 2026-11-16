"""BodyWorks body: import a rigged humanoid .glb, square it up (feet on z 0, facing -Y, left at +X) and read it as one
triangle soup with per-vertex ROLE weights. Landmarks (crotch, waist, under-bust, armpit, neck base) are measured off
the skin, never typed in, so every number later scales with the body in hand."""
import bpy, bmesh, math, re, collections
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from .rig import Rig

def nrm(v):
    n = np.linalg.norm(v); return v / n if n > 1e-9 else v

class Body:
    def __init__(self, path, skin_re=None, exclude_re=r'^(cage_|hair|wear|cloth|Icosphere)|eye|brow|lash|teeth|tongue|beard|mustache', flip=False):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
        arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
        if not arms: raise SystemExit('BODYWORKS: no armature in ' + path)
        self.arm = max(arms, key=lambda a: len(a.data.bones))
        for a in arms:
            if a.animation_data: a.animation_data.action = None
            for pb in a.pose.bones: pb.matrix_basis.identity()
        meshes = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
        ex = re.compile(exclude_re, re.I) if exclude_re else None
        sk = re.compile(skin_re, re.I) if skin_re else None
        self.extras = [o for o in meshes if (ex and ex.search(o.name)) or (sk and not sk.search(o.name))]
        self.skin = [o for o in meshes if o not in self.extras]
        if not self.skin: raise SystemExit('BODYWORKS: no skinned body mesh found (check --skin / --exclude)')
        bpy.context.view_layer.update()
        for o in self.skin:   # an exporter that splits every triangle (Mixamo's FBX: 3 verts a tri) leaves no shared edges: weld it first
            me = o.data
            if len(me.vertices) > 1.4 * max(len(me.polygons), 1):
                bm = bmesh.new(); bm.from_mesh(me); n0 = len(bm.verts)
                bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bm.to_mesh(me); bm.free(); me.update()
                print('BODYWORKS: welded %s %d -> %d verts (it came split per triangle)' % (o.name, n0, len(me.vertices)))
        self.rig = Rig(self.arm, self.skin) if not flip else None
        if flip or self._faces_back():
            self._turn()
        self.rig = Rig(self.arm, self.skin)
        self.read()
        self.landmarks()

    def _faces_back(self):
        r = Rig(self.arm, self.skin) if self.rig is None else self.rig
        toe = r.J['ball.L'] - r.J['ankle.L']
        return toe[1] > 0     # toes point +Y: the body faces +Y in Blender (-Z in glTF)

    def _turn(self):
        R = Matrix.Rotation(math.pi, 4, 'Z')
        for o in bpy.data.objects:
            if o.parent is None: o.matrix_world = R @ o.matrix_world
        bpy.context.view_layer.update()
        print('BODYWORKS: turned the body 180 deg so it faces -Y (glTF +Z)')

    def read(self):
        rig = self.rig; V = []; T = []; KW = []; VW = []; TO = []; off = 0; self.vobj = []
        for o in self.skin:
            me = o.data; mw = o.matrix_world; GN = {g.index: g.name for g in o.vertex_groups}
            bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:])
            co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
            M = np.array(mw); co = co @ M[:3, :3].T + M[:3, 3]
            V.append(co)
            for v in me.vertices:
                w = {}; raw = {}
                for g in v.groups:
                    if g.weight < 1e-4 or g.group not in GN: continue
                    raw[GN[g.group]] = g.weight
                    k = rig.key(GN[g.group]); w[k] = w.get(k, 0) + g.weight
                KW.append(w); VW.append(raw)
            for f in bm.faces: T.append([off + v.index for v in f.verts]); TO.append(o.name)
            self.vobj += [o.name] * len(me.vertices)
            off += len(me.vertices); bm.free()
        self.V = np.concatenate(V); self.T = np.array(T); self.KW = KW; self.VW = VW; self.TO = TO; self.NV = len(self.V)
        self.VK = [max(w, key=w.get) if w else 'none' for w in KW]
        TK = []
        for t in self.T:
            s = {}
            for i in t:
                for k, x in KW[i].items(): s[k] = s.get(k, 0) + x
            TK.append(max(s, key=s.get) if s else 'none')
        self.TK = TK
        self.bvh = BVHTree.FromPolygons(self.V.tolist(), self.T.tolist())
        z = self.V[:, 2]; self.z0 = float(z.min()); self.h = float(z.max() - z.min())
        self.S = 1.0                # set from the neck base in landmarks(): hair and hats never change it
        print('BODYWORKS body: %d verts, %d tris, height %.3f m (S %.3f), %d skin meshes, %d extras' % (self.NV, len(self.T), self.h, self.S, len(self.skin), len(self.extras)))

    def mask(self, pred):
        return np.array([pred(k) for k in self.VK])

    def landmarks(self):
        V = self.V; J = self.rig.J
        self.S = S = float((J['neckBase'][2] - self.z0) / 1.629)   # every length tuned on the T1 body (neck base 1.629 m) scales by S
        torso = self.mask(lambda k: k in ('hips', 'spine', 'neck') or k.startswith('clavicle'))
        hipz = (J['hip.L'][2] + J['hip.R'][2]) / 2; kneez = (J['knee.L'][2] + J['knee.R'][2]) / 2
        mid = np.abs(V[:, 0]) < 0.006 * S
        band = mid & (V[:, 2] > kneez) & (V[:, 2] < hipz + 0.1 * S)
        # crotch: the lowest midline skin point between the legs (no torso vertex there? fall back to the hips)
        cand = V[band & ~torso] if (band & ~torso).sum() > 3 else V[band]
        z_crotch = float(cand[:, 2].min()) if len(cand) else float(hipz - 0.08 * S)
        shz = (J['shoulder.L'][2] + J['shoulder.R'][2]) / 2
        z_armpit = float(shz - 0.09 * S)
        # bust: the most forward torso point between armpit and 60% down to the crotch; under-bust: where the front comes back
        prof = []
        for z in np.arange(z_crotch + 0.1 * S, z_armpit, 0.005 * S):
            m = torso & (np.abs(V[:, 2] - z) < 0.003 * S) & (np.abs(V[:, 0]) < 0.12 * S)
            if m.sum() > 6: prof.append((z, float(V[m][:, 1].min()), float(V[m][:, 1].max())))
        prof = np.array(prof)
        hi = prof[:, 0] > z_crotch + 0.55 * (z_armpit - z_crotch)
        ib = np.argmin(np.where(hi, prof[:, 1], 9)); z_bust = prof[ib, 0]; y_bust = prof[ib, 1]
        lo = prof[(prof[:, 0] < z_bust) & (prof[:, 0] > z_crotch + 0.3 * (z_armpit - z_crotch))]
        y_belly = float(lo[:, 1].max()) if len(lo) else y_bust + 0.03 * S
        depth = y_belly - y_bust
        z_under = z_bust - 0.05 * S
        for z, yf, yb in prof[::-1]:
            if z < z_bust and yf > y_bust + 0.6 * depth: z_under = z; break
        z_under = float(min(max(z_under, z_armpit - 0.16 * S), z_armpit - 0.07 * S))   # flat chests (no bust to find) land in the T1 band
        z_waist = float(z_crotch + 0.62 * (z_under - z_crotch))
        nb = J['neckBase']; z_neck = float(nb[2])
        self.yc = float((J['hips'][1] + J['neckBase'][1]) / 2)
        self.L = dict(crotch=z_crotch, waist=z_waist, underbust=float(z_under), bust=float(z_bust), bustDepth=float(depth),
                      armpit=z_armpit, neckBase=z_neck, head=float(J['head'][2]), hip=float(hipz), knee=float(kneez), feet=self.z0, height=self.h)
        print('BODYWORKS landmarks', {k: round(v, 3) for k, v in self.L.items()})
