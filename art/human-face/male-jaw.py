"""Male face shapes (Shelly Nov 9: "face shape tech could be different for men"):
adds M_Jaw (square, wider jaw with a real angle) and M_Chin (broad chin, lower and forward)
to every face mesh that already carries the head keys (Head, Beard_*, Blush_*).
The female-base V chin stays the rest; men lean on these keys in scripts/lib/critter-model.js.
usage: python3 art/human-face/male-jaw.py in.glb out.glb   (run from the world root)
"""
import sys, json, struct, hashlib, numpy as np
src = open('art/human-head/revamp.py').read()
exec(src[src.index('DT={'):src.index('def fetch(')])

def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def jaw(p):  # gltf space: +y up, +z face front; chin ~1.47, mouth 1.53, eyes 1.61
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    ax = np.abs(x); sgn = np.sign(x)
    face = ss(-0.19, -0.06, z)                       # back of skull and neck seam stay put
    band = ss(1.45, 1.50, y) * (1 - ss(1.53, 1.63, y))   # long soft fade up the cheek: no crease
    lat = ss(0.006, 0.05, ax)                         # the centre line stays, the sides fill out
    D = 0.013 * (1 - ss(1.50, 1.60, y))
    gon = np.exp(-(((y - 1.53) / 0.03) ** 2 + ((z + 0.07) / 0.05) ** 2)) * 0.006   # the jaw angle
    d = np.zeros_like(p)
    d[:, 0] = sgn * (D * lat * band + gon * lat) * face
    d[:, 1] = -0.002 * lat * band * face * (1 - ss(1.50, 1.54, y))   # a flatter, lower jaw line
    return d

def chin(p):
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    ax = np.abs(x); sgn = np.sign(x)
    front = ss(-0.07, -0.015, z)
    low = 1 - ss(1.49, 1.525, y)
    d = np.zeros_like(p)
    d[:, 1] = -0.007 * front * low
    d[:, 2] = 0.005 * front * low
    d[:, 0] = sgn * 0.010 * ss(0.004, 0.02, ax) * front * low   # broad, not pointed
    return d

KEYS = {'M_Jaw': jaw, 'M_Chin': chin}

def trim_lashes(g):
    # the base's flared, winged lashes read feminine (Shelly #121141): each lash vertex is pulled 70% onto
    # the nearest point of the eyeball's upper half, leaving a thin dark lid line; blink keys still ride it
    for m in g.j['meshes']:
        if 'X_Blink' not in m.get('extras', {}).get('targetNames', []): continue
        mats = {g.j['materials'][pr['material']]['name']: pr for pr in m['primitives'] if 'material' in pr}
        if 'Lash' not in mats or 'Eye' not in mats: continue
        e = g.get(mats['Eye']['attributes']['POSITION']).astype(np.float64)
        e = e[e[:, 1] > np.median(e[:, 1])]
        pr = mats['Lash']; acc = pr['attributes']['POSITION']
        p = g.get(acc).astype(np.float64)
        near = e[np.argmin(((p[:, None, :] - e[None, :, :]) ** 2).sum(2), axis=1)]
        q = near + (p - near) * 0.3
        pr['attributes']['POSITION'] = g.add(q.astype('<f4'))
        return True
    return False

def run(src_path, dst_path):
    g = GLB(open(src_path, 'rb').read())
    print('lashes trimmed', trim_lashes(g))
    done = 0
    for m in g.j['meshes']:
        tn = m.get('extras', {}).get('targetNames', [])
        if 'JawWide' not in tn: continue
        for name in KEYS:
            if name in tn: raise SystemExit(f'{m["name"]} already has {name}')
        for pr in m['primitives']:
            p = g.get(pr['attributes']['POSITION']).astype(np.float64)
            tri = g.get(pr['indices']).reshape(-1, 3).astype(np.int64)
            n0 = normals(p, tri)
            for name, fn in KEYS.items():
                dp = fn(p); n1 = normals(p + dp, tri)
                pr['targets'].append({'POSITION': g.add(dp.astype('<f4')), 'NORMAL': g.add((n1 - n0).astype('<f4'))})
        m['extras']['targetNames'] = tn + list(KEYS)
        if 'weights' in m: m['weights'] = m['weights'] + [0.0] * len(KEYS)
        done += 1
    open(dst_path, 'wb').write(g.bytes())
    print('meshes keyed', done)

def normals(p, tri):
    n = np.zeros_like(p); f = np.cross(p[tri[:, 1]] - p[tri[:, 0]], p[tri[:, 2]] - p[tri[:, 0]])
    for k in range(3): np.add.at(n, tri[:, k], f)
    _, inv = np.unique(np.round(p, 6), axis=0, return_inverse=True); inv = inv.reshape(-1)
    merged = np.zeros((inv.max() + 1, 3)); np.add.at(merged, inv, n); n = merged[inv]
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)

if __name__ == '__main__': run(sys.argv[1], sys.argv[2])
