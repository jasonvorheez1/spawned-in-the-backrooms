# Shelly's Fallout sneak .kf clips (Gamebryo, Bip01) retargeted onto the game's humanoid clip skeleton (cdn/clip-fall-loop.glb names, +Z forward, Y up, metres).
# usage: python3 kf2glb.py skeletonEM.nif target.glb in.kf out.glb
import sys, time, json, struct, math
time.clock = time.perf_counter
import numpy as np
from pyffi.formats.nif import NifFormat

def qm(w, x, y, z):
    n = math.sqrt(w*w+x*x+y*y+z*z); w, x, y, z = w/n, x/n, y/n, z/n
    return np.array([[1-2*(y*y+z*z), 2*(x*y-w*z), 2*(x*z+w*y)], [2*(x*y+w*z), 1-2*(x*x+z*z), 2*(y*z-w*x)], [2*(x*z-w*y), 2*(y*z+w*x), 1-2*(x*x+y*y)]])
def mq(R):  # -> x,y,z,w
    t = np.trace(R)
    if t > 0: s = math.sqrt(t+1)*2; return [(R[2,1]-R[1,2])/s, (R[0,2]-R[2,0])/s, (R[1,0]-R[0,1])/s, 0.25*s]
    i = int(np.argmax([R[0,0], R[1,1], R[2,2]]))
    if i == 0: s = math.sqrt(1+R[0,0]-R[1,1]-R[2,2])*2; return [0.25*s, (R[0,1]+R[1,0])/s, (R[0,2]+R[2,0])/s, (R[2,1]-R[1,2])/s]
    if i == 1: s = math.sqrt(1+R[1,1]-R[0,0]-R[2,2])*2; return [(R[0,1]+R[1,0])/s, 0.25*s, (R[1,2]+R[2,1])/s, (R[0,2]-R[2,0])/s]
    s = math.sqrt(1+R[2,2]-R[0,0]-R[1,1])*2; return [(R[0,2]+R[2,0])/s, (R[1,2]+R[2,1])/s, 0.25*s, (R[1,0]-R[0,1])/s]
def align(a, b):  # rotation taking unit a to unit b
    a = a/np.linalg.norm(a); b = b/np.linalg.norm(b); v = np.cross(a, b); c = float(np.dot(a, b))
    if c < -0.9999: return -np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]]); return np.eye(3) + K + K@K/(1+c)

skel_p, tgt_p, kf_p, out_p = sys.argv[1:5]
# ---- source skeleton rest
d = NifFormat.Data(); d.read(open(skel_p, 'rb'))
SP, SL = {}, {}
def walk(n, par):
    if not isinstance(n, NifFormat.NiNode): return
    nm = n.name.decode(); SP[nm] = par
    SL[nm] = (np.array(n.rotation.as_list()), np.array([n.translation.x, n.translation.y, n.translation.z]))
    for c in n.children:
        if c: walk(c, nm)
for r in d.roots: walk(r, None)
# ---- clip
k = NifFormat.Data(); k.read(open(kf_p, 'rb'))
seq = [b for b in k.roots if isinstance(b, NifFormat.NiControllerSequence)][0]
tracks, times = {}, None
for cb in seq.controlled_blocks:
    it = cb.interpolator; nm = cb.get_node_name().decode()
    if isinstance(it, NifFormat.NiBSplineCompTransformInterpolator):
        rots = list(it.get_rotations()); trs = list(it.get_translations()); ts = list(it.get_times())
        times = times or ts
        tracks[nm] = ([qm(*q) for q in rots] if rots else None, [np.array(t) for t in trs] if trs else None)
    elif isinstance(it, NifFormat.NiTransformInterpolator):
        R = qm(it.rotation.w, it.rotation.x, it.rotation.y, it.rotation.z); t = np.array([it.translation.x, it.translation.y, it.translation.z])
        tracks[nm] = ([R], [t])
F = len(times)
def src_world(f):
    W = {}
    def get(nm):
        if nm in W: return W[nm]
        R, t = SL[nm]
        if f is not None and nm in tracks:
            rs, ts = tracks[nm]
            if rs: R = rs[min(f, len(rs)-1)]
            if ts: t = ts[min(f, len(ts)-1)]
        p = SP.get(nm)
        if p is None or p not in SL: W[nm] = (R, t)
        else: PR, Pt = get(p); W[nm] = (PR@R, PR@t+Pt)
        return W[nm]
    for nm in SL: get(nm)
    return W
C = np.array([[-1, 0, 0], [0, 0, 1], [0, 1, 0]], float)  # gamebryo (Z up, +Y fwd) -> glTF (Y up, +Z fwd)
# ---- target
g = open(tgt_p, 'rb').read(); jl = struct.unpack('<I', g[12:16])[0]; J = json.loads(g[20:20+jl])
bo = 20+jl; bl = struct.unpack('<I', g[bo:bo+4])[0]; BIN = bytearray(g[bo+8:bo+8+bl])
N = J['nodes']; TP = {}
for i, n in enumerate(N):
    for c in n.get('children', []): TP[c] = i
name = {n['name']: i for i, n in enumerate(N)}
def tl(i):
    n = N[i]; q = n.get('rotation', [0, 0, 0, 1]); return qm(q[3], q[0], q[1], q[2]), np.array(n.get('translation', [0, 0, 0]), float)
TW = {}
def tw(i):
    if i in TW: return TW[i]
    R, t = tl(i)
    if i in TP: PR, Pt = tw(TP[i]); TW[i] = (PR@R, PR@t+Pt)
    else: TW[i] = (R, t)
    return TW[i]
for i in range(len(N)): tw(i)
MAP = {'Hips': 'Bip01 Pelvis', 'Spine': 'Bip01 Spine', 'Spine1': 'Bip01 Spine1', 'Spine2': 'Bip01 Spine2', 'Neck': 'Bip01 Neck', 'Head': 'Bip01 Head',
       'LeftShoulder': 'Bip01 L Clavicle', 'LeftArm': 'Bip01 L UpperArm', 'LeftForeArm': 'Bip01 L Forearm', 'LeftHand': 'Bip01 L Hand',
       'RightShoulder': 'Bip01 R Clavicle', 'RightArm': 'Bip01 R UpperArm', 'RightForeArm': 'Bip01 R Forearm', 'RightHand': 'Bip01 R Hand',
       'LeftUpLeg': 'Bip01 L Thigh', 'LeftLeg': 'Bip01 L Calf', 'LeftFoot': 'Bip01 L Foot', 'LeftToeBase': 'Bip01 L Toe0',
       'RightUpLeg': 'Bip01 R Thigh', 'RightLeg': 'Bip01 R Calf', 'RightFoot': 'Bip01 R Foot', 'RightToeBase': 'Bip01 R Toe0'}
SCHILD = {'Bip01 Pelvis': 'Bip01 Spine', 'Bip01 Spine': 'Bip01 Spine1', 'Bip01 Spine1': 'Bip01 Spine2', 'Bip01 Spine2': 'Bip01 Neck', 'Bip01 Neck': 'Bip01 Head',
          'Bip01 L Clavicle': 'Bip01 L UpperArm', 'Bip01 L UpperArm': 'Bip01 L Forearm', 'Bip01 L Forearm': 'Bip01 L Hand',
          'Bip01 R Clavicle': 'Bip01 R UpperArm', 'Bip01 R UpperArm': 'Bip01 R Forearm', 'Bip01 R Forearm': 'Bip01 R Hand',
          'Bip01 L Thigh': 'Bip01 L Calf', 'Bip01 L Calf': 'Bip01 L Foot', 'Bip01 L Foot': 'Bip01 L Toe0',
          'Bip01 R Thigh': 'Bip01 R Calf', 'Bip01 R Calf': 'Bip01 R Foot', 'Bip01 R Foot': 'Bip01 R Toe0'}
TCHILD = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Spine3', 'Neck': 'Head', 'LeftShoulder': 'LeftArm', 'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'LeftHand': 'LeftHandEnd',
          'RightShoulder': 'RightArm', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand', 'RightHand': 'RightHandEnd',
          'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase', 'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase'}
SR = src_world(None)
sw = lambda W, nm: (C@W[nm][0]@C.T, C@W[nm][1])
A = {}
for tn, sn in MAP.items():
    if tn in TCHILD and sn in SCHILD:
        dt = tw(name[TCHILD[tn]])[1]-tw(name[tn])[1]; ds = sw(SR, SCHILD[sn])[1]-sw(SR, sn)[1]
        A[tn] = align(dt, ds)
    else: A[tn] = np.eye(3)
# report: rest heights, facing
sp = sw(SR, 'Bip01 Pelvis')[1]; sf = sw(SR, 'Bip01 L Foot')[1]; stoe = sw(SR, 'Bip01 L Toe0')[1]; sh = sw(SR, 'Bip01 Head')[1]
print('src rest pelvis', sp.round(1), 'Lfoot', sf.round(1), 'Ltoe', stoe.round(1), 'head', sh.round(1))
scale = tw(name['Hips'])[1][1] / max(1e-6, sp[1]-sf[1]+ (tw(name['LeftFoot'])[1][1]))
scale = (tw(name['Hips'])[1][1]-tw(name['LeftFoot'])[1][1]) / (sp[1]-sf[1])
print('scale m/unit', round(scale, 4))
rot_out = {tn: [] for tn in name}; hips_t = []
for f in range(F):
    W = src_world(f); TWf = {}
    def tworld(i):
        if i in TWf: return TWf[i]
        nm = N[i]['name']
        if nm in MAP:
            R0 = tw(i)[0]; Sr0 = sw(SR, MAP[nm])[0]; Sr = sw(W, MAP[nm])[0]
            R = Sr@Sr0.T@A[nm]@R0
        else:
            PR = tworld(TP[i])[0] if i in TP else np.eye(3); R = PR@tl(i)[0]
        TWf[i] = (R,); return TWf[i]
    for i in range(len(N)):
        R = tworld(i)[0]; PR = tworld(TP[i])[0] if i in TP else np.eye(3)
        rot_out[N[i]['name']].append(mq(PR.T@R))
    p = sw(W, 'Bip01 Pelvis')[1]; hips_t.append(p)
hips_t = np.array(hips_t); base = tw(name['Hips'])[1]
foot0 = sf[1]
ht = [[base[0]+(p[0]-hips_t[:, 0].mean())*scale, base[1]+(p[1]-sp[1])*scale, base[2]+(p[2]-hips_t[:, 2].mean())*scale] for p in hips_t]
print('frames', F, 'dur', round(times[-1], 3), 'hips y min/max', round(min(h[1] for h in ht), 3), round(max(h[1] for h in ht), 3), 'rest', round(base[1], 3))
# ---- write: same nodes, new animation
acc, bvs = [], []
def add(arr, typ):
    a = np.asarray(arr, np.float32); off = len(BIN)
    while len(BIN) % 4: BIN.append(0)
    off = len(BIN); BIN.extend(a.tobytes()); bvs.append({'buffer': 0, 'byteOffset': off, 'byteLength': a.nbytes})
    e = {'bufferView': len(J['bufferViews'])+len(bvs)-1, 'componentType': 5126, 'count': a.shape[0], 'type': typ}
    if typ == 'SCALAR': e['min'] = [float(a.min())]; e['max'] = [float(a.max())]
    acc.append(e); return len(J['accessors'])+len(acc)-1
tacc = add(np.array(times)-times[0], 'SCALAR')
ch, sm = [], []
for tn, qs in rot_out.items():
    qs = np.array(qs)
    for f in range(1, len(qs)):
        if np.dot(qs[f], qs[f-1]) < 0: qs[f] = -qs[f]
    sm.append({'input': tacc, 'output': add(qs, 'VEC4'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(sm)-1, 'target': {'node': name[tn], 'path': 'rotation'}})
sm.append({'input': tacc, 'output': add(ht, 'VEC3'), 'interpolation': 'LINEAR'}); ch.append({'sampler': len(sm)-1, 'target': {'node': name['Hips'], 'path': 'translation'}})
J['accessors'] += acc; J['bufferViews'] += bvs; J['buffers'][0]['byteLength'] = len(BIN)
J['animations'] = [{'name': seq.name.decode(), 'channels': ch, 'samplers': sm}]
while len(BIN) % 4: BIN.append(0)
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
out = b'glTF' + struct.pack('<II', 2, 12+8+len(js)+8+len(BIN)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(BIN)) + b'BIN\x00' + bytes(BIN)
open(out_p, 'wb').write(out); print('wrote', out_p, len(out))
