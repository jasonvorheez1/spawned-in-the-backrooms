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
        ia = J['accessors'][pr['indices']]; iv = J['bufferViews'][ia['bufferView']]
        I = np.frombuffer(B, {5125: '<u4', 5123: '<u2'}[ia['componentType']], ia['count'], iv.get('byteOffset', 0)+ia.get('byteOffset', 0)).reshape(-1, 3)
        from collections import Counter, defaultdict
        ec = Counter(tuple(sorted(e)) for t in I for e in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])))
        nb = defaultdict(set)
        for (a_, b_), n in ec.items():
            if n == 1: nb[a_].add(b_); nb[b_].add(a_)
        # welded copies (uv seams) share a position: group by position so the loop walks across them
        for side in (-1, 1):
            k = np.where(np.sign(P[:, 0]) == side)[0]
            if len(k) < 4: continue
            ks = set(k.tolist()); bnd = [v for v in k if v in nb]
            x = np.abs(P[:, 0])
            inner = min(bnd, key=lambda v: x[v]); outer = max(bnd, key=lambda v: x[v])
            # two walks from inner to outer along the boundary: the upper chain and the lower chain
            chains = []
            for first in list(nb[inner])[:2]:
                path = [inner, first]; seen = {inner, first}
                while path[-1] != outer:
                    nxt = [n for n in nb[path[-1]] if n not in seen and n in ks]
                    if not nxt: break
                    path.append(nxt[0]); seen.add(nxt[0])
                chains.append(path)
            if len(chains) < 2: print('side', side, 'no loop'); continue
            top, bot = sorted(chains, key=lambda c: -P[c, 1].mean())
            def env(c):
                c = sorted(c, key=lambda v: x[v]); return x[c], P[c, 1]
            tx, ty = env(top); bx, by = env(bot)
            x0, x1 = x[inner], x[outer]
            yt = np.interp(x[k], tx, ty); yb = np.interp(x[k], bx, by)
            rel = np.clip((P[k, 1]-yb)/np.maximum(yt-yb, 1e-6), 0, 1)
            rel[np.isin(k, top)] = 1; rel[np.isin(k, bot)] = 0
            t = np.clip((x[k]-x0)/(x1-x0), 0, 1)
            mid = np.polyval(np.polyfit(x[k], (P[k, 1]+0)*1, 1), x[k]) * 0 + P[k, 1].mean()
            arch = mid + 0.0040*np.sin(np.pi*np.clip(t*0.9+0.08, 0, 1)) - 0.0012*t
            hw = 0.0024*(1-t)**0.8 + 0.0006
            P[k, 1] = arch - hw + 2*hw*rel
            P[k, 2] = P[k, 2] + 0.0004
        a = J['accessors'][pr['attributes']['POSITION']]; a['min'] = P.min(0).tolist(); a['max'] = P.max(0).tolist()
        done += 1
print('brow primitives', done)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' '*(-len(js) % 4); B += b'\0'*(-len(B) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12+8+len(js)+8+len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out)
