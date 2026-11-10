"""Clean brows: the Brow strip on each human body's Head is redrawn as a smooth tapered arch,
same vertices and faces, so skin weights and every shape key (X_Brow*, head types) still ride it.
python3 art/human-face/brows.py in.glb out.glb"""
import sys, json, struct, numpy as np
src, dst = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
jl = struct.unpack_from('<I', d, 12)[0]; J = json.loads(d[20:20+jl]); off = 20+jl
bl = struct.unpack_from('<I', d, off)[0]; B = bytearray(d[off+8:off+8+bl])
mats = [m.get('name') for m in J['materials']]
def view(ai):
    a = J['accessors'][ai]; v = J['bufferViews'][a['bufferView']]
    o = v.get('byteOffset', 0)+a.get('byteOffset', 0); st = v.get('byteStride', 12)
    return np.ndarray((a['count'], 3), '<f4', B, o, (st, 4))
done = 0
for mesh in J['meshes']:
    for pr in mesh['primitives']:
        if mats[pr.get('material', -1)] not in ('Brow',) or 'Brow' not in mats: continue
        P = view(pr['attributes']['POSITION'])
        for side in (-1, 1):
            k = np.where(np.sign(P[:, 0]) == side)[0]
            if len(k) < 4: continue
            x = np.abs(P[k, 0]); x0, x1 = x.min(), x.max(); t = (x-x0)/(x1-x0)
            cy = np.polyval(np.polyfit(x, P[k, 1], 2), x)
            cz = np.polyval(np.polyfit(x, P[k, 2], 2), x)
            up = np.sign(P[k, 1]-cy); up[up == 0] = 1
            base = P[k, 1].mean()
            arch = base + 0.0045*np.sin(np.pi*np.clip(t*0.95+0.05, 0, 1)**0.75) - 0.0015  # rises toward the outer third, drops at the tail
            hw = 0.0026*(1-t)**0.7 + 0.0007                                                    # full at the inner end, tapering out
            P[k, 1] = arch + up*hw
            P[k, 2] = cz + 0.0006                                                             # a hair off the skin, no z-fight
        a = J['accessors'][pr['attributes']['POSITION']]; a['min'] = P.min(0).tolist(); a['max'] = P.max(0).tolist()
        done += 1
print('brow primitives', done)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' '*(-len(js) % 4); B += b'\0'*(-len(B) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out)
