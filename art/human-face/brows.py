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
        # the strip's UVs lay it out as three clean rows (v ~0.978 bottom, ~0.987 middle, ~0.995 top) along u:
        # the mesh's own zigzag is a placement mistake, so each vertex goes back to its row on a smooth arch
        ua = J['accessors'][pr['attributes']['TEXCOORD_0']]; uvv = J['bufferViews'][ua['bufferView']]
        UV = np.ndarray((ua['count'], 2), '<f4', B, uvv.get('byteOffset', 0)+ua.get('byteOffset', 0), (uvv.get('byteStride', 8), 4))
        for side in (-1, 1):
            k = np.where(np.sign(P[:, 0]) == side)[0]
            if len(k) < 4: continue
            x = np.abs(P[k, 0]); x0, x1 = x.min(), x.max()
            v = UV[k, 1]; lo, hi = np.percentile(v, 3), np.percentile(v, 97)
            rel = np.clip((v-lo)/(hi-lo), 0, 1)
            t = (x-x0)/(x1-x0)
            zfit = np.polyval(np.polyfit(x, P[k, 2], 2), x)
            base = np.median(P[k, 1])
            arch = base + 0.0035*np.sin(np.pi*np.clip(0.12+0.88*t, 0, 1)**0.85) - 0.0010*t
            hw = 0.0022*(1-t)**0.9 + 0.0005
            P[k, 0] = side*(x0 + (x1-x0)*t)
            P[k, 1] = arch - hw + 2*hw*rel
            P[k, 2] = zfit + 0.0005
        a = J['accessors'][pr['attributes']['POSITION']]; a['min'] = P.min(0).tolist(); a['max'] = P.max(0).tolist()
        done += 1
print('brow primitives', done)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' '*(-len(js) % 4); B += b'\0'*(-len(B) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out)
