"""Puff a garment .glb off the skin in place: every POSITION moves D metres along its own NORMAL where y > Y0 (glTF y-up).
No Blender round trip, so vertex order, normals, skins, morph targets and slots stay byte-identical.
Usage: python3 puff.py in.glb out.glb [D=0.004] [Y0=0.85]"""
import json, struct, sys, numpy as np
src, out = sys.argv[1], sys.argv[2]; D = float(sys.argv[3]) if len(sys.argv) > 3 else 0.004; Y0 = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
d = bytearray(open(src, 'rb').read()); jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl]); B = 20 + jl + 8
def view(ai):
    a = J['accessors'][ai]; bv = J['bufferViews'][a['bufferView']]; o = B + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    assert a['componentType'] == 5126 and bv.get('byteStride', 12) == 12
    return o, a['count']
n = 0
for m in J['meshes']:
    for p in m['primitives']:
        po, c = view(p['attributes']['POSITION']); no, _ = view(p['attributes']['NORMAL'])
        P = np.frombuffer(d, np.float32, c * 3, po).reshape(-1, 3).copy(); N = np.frombuffer(d, np.float32, c * 3, no).reshape(-1, 3)
        k = np.round(P / 1e-4).astype(np.int64); _, inv = np.unique(k, axis=0, return_inverse=True); inv = inv.ravel()
        A = np.zeros((inv.max() + 1, 3)); np.add.at(A, inv, N); A /= np.linalg.norm(A, axis=1, keepdims=True) + 1e-9; N = A[inv]  # welded: split seams move together, no tears
        w = np.clip((P[:, 1] - Y0) / 0.05, 0, 1)[:, None]
        P += N * D * w; d[po:po + c * 12] = P.astype(np.float32).tobytes(); n += int((w > 0).sum())
        a = J['accessors'][p['attributes']['POSITION']]; a['min'] = P.min(0).tolist(); a['max'] = P.max(0).tolist()
j = json.dumps(J, separators=(',', ':')).encode(); j += b' ' * (-len(j) % 4)
open(out, 'wb').write(d[:12] + struct.pack('<I', len(j)) + b'JSON' + j + d[20 + jl:]); struct.pack_into('<I', (o := bytearray(open(out, 'rb').read())), 8, len(o)); open(out, 'wb').write(o)
print('puffed', n, 'verts by', D)
