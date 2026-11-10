# Shelly Nov 10 (#175046, #175156): "body looks thin"; her refs (anime girl) run ~25% fuller in thigh/calf than ours.
# Fills the human bodies out about the bone axes at bind pose (thighs, calves, upper arms, hips), byte-for-byte otherwise
# (morph targets are deltas, so they ride unchanged). The same delta field moves every fitted garment, so clothes keep their clearance.
#   body:    python3 fill.py body <m|f> <in-plain.glb> <out.glb> <field.npz>
#   garment: python3 fill.py garment <field.npz> <in-plain.glb> <out.glb>
import sys, json, struct, numpy as np
CT = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
# her pick: fuller but not the ref's full exaggeration; men less in the legs, same in the arms
AMT = {'f': dict(thigh=.38, calf=.24, arm=.16, hip=.07), 'm': dict(thigh=.24, calf=.18, arm=.22, hip=.0)}
def load(p):
    d = bytearray(open(p, 'rb').read()); jl = struct.unpack_from('<I', d, 12)[0]
    J = json.loads(d[20:20 + jl]); b0 = 20 + jl + 8; return d, J, b0
def acc(d, J, b0, i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]; dt = CT[a['componentType']]; n = NC[a['type']]
    off = b0 + v.get('byteOffset', 0) + a.get('byteOffset', 0); st = v.get('byteStride', 0) or n * np.dtype(dt).itemsize
    raw = np.frombuffer(bytes(d[off: off + st * (a['count'] - 1) + n * np.dtype(dt).itemsize]), np.uint8)
    arr = np.lib.stride_tricks.as_strided(raw.view(dt) if st == n * np.dtype(dt).itemsize else np.frombuffer(raw.tobytes() + b'\0' * (st - n * np.dtype(dt).itemsize), dt), (a['count'], n), (st, np.dtype(dt).itemsize)).copy()
    if a.get('normalized'): arr = arr / float(np.iinfo(dt).max)
    return arr.astype(np.float64), off, st, dt
def put(d, off, st, arr):
    for k, row in enumerate(arr.astype(np.float32)): d[off + k * st: off + k * st + 12] = row.tobytes()
def mat(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1]); x, y, z, w = r
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    M = np.eye(4); M[:3, :3] = R * s; M[:3, 3] = t; return M
def worlds(J):
    par = {}; [par.__setitem__(c, i) for i, n in enumerate(J['nodes']) for c in n.get('children', [])]; W = {}
    def w(i):
        if i not in W: W[i] = (w(par[i]) if i in par else np.eye(4)) @ mat(J['nodes'][i])
        return W[i]
    for i in range(len(J['nodes'])): w(i)
    return W
def prims(J):
    for ni, n in enumerate(J['nodes']):
        if 'mesh' in n:
            for p in J['meshes'][n['mesh']]['primitives']: yield ni, n, p
def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def body(sex, src, out, fld):
    d, J, b0 = load(src); W = worlds(J); A = AMT[sex]; pts = []; dls = []
    names = {i: n.get('name', '') for i, n in enumerate(J['nodes'])}
    def jn(nm):
        for i, n in names.items():
            if n.split(':')[-1] == nm: return W[i][:3, 3]
    seg = {}
    for s in ('Left', 'Right'):
        seg[s + 'UpLeg'] = (jn(s + 'UpLeg'), jn(s + 'Leg'), 'thigh'); seg[s + 'Leg'] = (jn(s + 'Leg'), jn(s + 'Foot'), 'calf'); seg[s + 'Arm'] = (jn(s + 'Arm'), jn(s + 'ForeArm'), 'arm')
    hipY = jn('Hips')[1]; legY = jn('LeftUpLeg')[1]; kneeY = jn('LeftLeg')[1]
    done = set()
    for ni, n, p in prims(J):
        at = p['attributes']; sk = J['skins'][n['skin']] if 'skin' in n else None
        if sk is None or 'JOINTS_0' not in at: continue
        P, off, st, _ = acc(d, J, b0, at['POSITION'])
        if off in done: continue
        done.add(off)
        Jt, *_ = acc(d, J, b0, at['JOINTS_0']); Wt, *_ = acc(d, J, b0, at['WEIGHTS_0'])
        joints = [names[j].split(':')[-1] for j in sk['joints']]
        IBM = acc(d, J, b0, sk['inverseBindMatrices'])[0].reshape(-1, 4, 4).transpose(0, 2, 1)
        SK = np.array([W[j] @ IBM[k] for k, j in enumerate(sk['joints'])])
        Ph = np.c_[P, np.ones(len(P))]; M = np.einsum('vk,vkij->vij', Wt, SK[Jt.astype(int)]); Pw = np.einsum('vij,vj->vi', M, Ph)[:, :3]
        D = np.zeros_like(Pw)
        for k in range(4):
            for v in range(len(P)):
                w = Wt[v, k]
                if w < 1e-4: continue
                b = joints[int(Jt[v, k])]
                if b in seg:
                    h, t, kind = seg[b]; ax = t - h; L = ax @ ax; u = np.clip((Pw[v] - h) @ ax / L, 0, 1); r = Pw[v] - (h + ax * u)
                    if kind == 'thigh': prof = ss(0, .25, u) * (1 - .45 * ss(.65, 1, u))      # full mid-thigh, easing at crotch and knee
                    elif kind == 'calf': prof = ss(0, .18, u) * (1 - .85 * ss(.35, .9, u))      # calf belly high, slim ankle
                    else: prof = ss(.12, .35, u) * (1 - .5 * ss(.7, 1, u))                     # biceps, deltoid left alone (no pointy shoulder)
                    if kind != 'arm':
                        side = np.sign(h[0]); rn = r / (np.linalg.norm(r) + 1e-9); prof *= .55 + .45 * (rn[0] * side)   # inner thigh grows less: no gap closing
                    D[v] += w * A[kind] * prof * r
                elif b.endswith('Hips') and A['hip']:
                    f = ss(legY - .10, legY, Pw[v, 1]) * (1 - ss(hipY + .02, hipY + .12, Pw[v, 1]))
                    D[v, 0] += w * A['hip'] * f * Pw[v, 0]; D[v, 2] += w * A['hip'] * .5 * f * Pw[v, 2]
        Minv = np.linalg.inv(M[:, :3, :3]); Dl = np.einsum('vij,vj->vi', Minv, D)
        put(d, off, st, P + Dl)
        a = J['accessors'][at['POSITION']]; NP = P + Dl; a['min'] = NP.min(0).tolist(); a['max'] = NP.max(0).tolist()
        pts.append(Pw); dls.append(D)
    save(d, J, b0, out); np.savez(fld, p=np.vstack(pts), d=np.vstack(dls)); print('body', sex, 'max delta mm', round(float(np.abs(np.vstack(dls)).max()) * 1000, 1))
def save(d, J, b0, out):
    js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4); bin_ = bytes(d[b0 - 8:])
    o = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + bin_
    open(out, 'wb').write(o)
def garment(fld, src, out):
    from scipy.spatial import cKDTree
    F = np.load(fld); kd = cKDTree(F['p']); d, J, b0 = load(src); W = worlds(J); done = set(); mx = 0
    for ni, n, p in prims(J):
        at = p['attributes']; P, off, st, _ = acc(d, J, b0, at['POSITION'])
        if off in done: continue
        done.add(off)
        if 'skin' in n and 'JOINTS_0' in at:
            sk = J['skins'][n['skin']]; Jt, *_ = acc(d, J, b0, at['JOINTS_0']); Wt, *_ = acc(d, J, b0, at['WEIGHTS_0'])
            IBM = acc(d, J, b0, sk['inverseBindMatrices'])[0].reshape(-1, 4, 4).transpose(0, 2, 1); SK = np.array([W[j] @ IBM[k] for k, j in enumerate(sk['joints'])])
            M = np.einsum('vk,vkij->vij', Wt, SK[Jt.astype(int)])
        else: M = np.repeat(W[ni][None], len(P), 0)
        Pw = np.einsum('vij,vj->vi', M, np.c_[P, np.ones(len(P))])[:, :3]
        dist, idx = kd.query(Pw, 3); w = 1 / np.maximum(dist, .002) ** 2; D = (F['d'][idx] * w[..., None]).sum(1) / w.sum(1)[:, None]
        D *= (1 - ss(.045, .065, dist[:, 0]))[:, None]
        Dl = np.einsum('vij,vj->vi', np.linalg.inv(M[:, :3, :3]), D); NP = P + Dl; put(d, off, st, NP)
        a = J['accessors'][at['POSITION']]; a['min'] = NP.min(0).tolist(); a['max'] = NP.max(0).tolist(); mx = max(mx, float(np.abs(D).max()))
    save(d, J, b0, out); print('garment', src.split('/')[-1], 'max mm', round(mx * 1000, 1))
if __name__ == '__main__':
    if sys.argv[1] == 'body': body(*sys.argv[2:6])
    else: garment(*sys.argv[2:5])
