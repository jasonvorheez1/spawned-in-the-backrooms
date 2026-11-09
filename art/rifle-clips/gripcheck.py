# Reads a body glb + clip glb the way the engine poses them (clip local rotations on nodes by name), and reports
# the RightHand / LeftHand world frames at time t, plus where a held gun's axes point with a given heldRot.
import json, struct, sys, math
def glb(p):
    b = open(p, 'rb').read(); n = struct.unpack_from('<I', b, 12)[0]; J = json.loads(b[20:20+n])
    off = 20 + n; bin_ = b[off+8:] if len(b) > off else b''
    return J, bin_
def acc(J, B, i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    k = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]; return [struct.unpack_from('<%df' % k, B, o + j*4*k) for j in range(a['count'])]
def qm(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return (aw*bx+ax*bw+ay*bz-az*by, aw*by-ax*bz+ay*bw+az*bx, aw*bz+ax*by-ay*bx+az*bw, aw*bw-ax*bx-ay*by-az*bz)
def qv(q, v):
    x, y, z, w = q; u = (x, y, z)
    c = lambda a, b: (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
    t = tuple(2*e for e in c(u, v)); r = c(u, t); return tuple(v[i] + w*t[i] + r[i] for i in range(3))
def qinv(q): return (-q[0], -q[1], -q[2], q[3])
body, clip, t = sys.argv[1], sys.argv[2], float(sys.argv[3])
J, B = glb(body); C, CB = glb(clip)
nodes = J['nodes']; name = {i: n.get('name') for i, n in enumerate(nodes)}; par = {}
for i, n in enumerate(nodes):
    for c in n.get('children', []): par[c] = i
anim = {}
for ch in C['animations'][0]['channels']:
    if ch['target']['path'] != 'rotation': continue
    s = C['animations'][0]['samplers'][ch['sampler']]; ts = acc(C, CB, s['input']); vs = acc(C, CB, s['output'])
    k = min(range(len(ts)), key=lambda j: abs(ts[j][0]-t)); anim[C['nodes'][ch['target']['node']]['name']] = vs[k]
def world(i):
    chain = []
    while i is not None: chain.append(i); i = par.get(i)
    q = (0, 0, 0, 1); p = (0, 0, 0)
    for j in reversed(chain):
        n = nodes[j]; lr = anim.get(n.get('name'), n.get('rotation', [0, 0, 0, 1])); lt = n.get('translation', [0, 0, 0]); s = n.get('scale', [1, 1, 1])
        lt = tuple(lt[k]*1 for k in range(3)); d = qv(q, lt); p = tuple(p[k]+d[k] for k in range(3)); q = qm(q, tuple(lr))
    return q, p
idx = {v: k for k, v in name.items()}
R = world(idx['RightHand']); L = world(idx['LeftHand']); S = world(idx['RightArm']); H = world(idx['Head'])
f = lambda v: '(' + ', '.join('%.3f' % x for x in v) + ')'
print('RH pos', f(R[1]), 'LH pos', f(L[1]), 'Rshoulder', f(S[1]), 'head', f(H[1]))
d = tuple(L[1][k]-R[1][k] for k in range(3)); print('R->L', f(d))
held = json.loads(sys.argv[4]) if len(sys.argv) > 4 else [-0.352, 0.433, 0.342, 0.756]
gq = qm(R[0], tuple(held))
for ax, v in (('+X', (1, 0, 0)), ('+Y', (0, 1, 0)), ('+Z', (0, 0, 1))): print('gun', ax, f(qv(gq, v)))
print('RHq', f(R[0]))
