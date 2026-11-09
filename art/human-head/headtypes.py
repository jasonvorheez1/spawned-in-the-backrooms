# Human head types (Shelly, Nov 9: "craft new head types for human characters"): real skull and face shapes as morph targets
# written straight into the live body GLBs (no Blender round trip, so the rig and clips stay byte-identical).
# Each HT_ key is a whole head: jaw, cheekbones, chin, skull height and width. Hats and eyewear take the skull part so they still sit.
# python3 art/human-head/types.py <in.glb> <out.glb>
import json, struct, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl]); bo = 20 + jl
bl = struct.unpack('<I', d[bo:bo + 4])[0]; B = bytearray(d[bo + 8:bo + 8 + bl])
def acc(i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]
    o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bytes(B[o:o + a['count'] * 12]), dtype='<f4').reshape(-1, 3).copy()
def add(arr):
    global B
    while len(B) % 4: B.append(0)
    o = len(B); B += arr.astype('<f4').tobytes()
    J['bufferViews'].append({'buffer': 0, 'byteOffset': o, 'byteLength': arr.nbytes})
    J['accessors'].append({'bufferView': len(J['bufferViews']) - 1, 'componentType': 5126, 'count': len(arr), 'type': 'VEC3',
                           'min': arr.min(0).tolist(), 'max': arr.max(0).tolist()})
    return len(J['accessors']) - 1
head = next(m for m in J['meshes'] if 'JawWide' in (m.get('extras') or {}).get('targetNames', []))
P = np.concatenate([acc(p['attributes']['POSITION']) for p in head['primitives']])
# blender frame: X, Y = -gltf z (front is -Y), Z = gltf y
X, Y, Z = P[:, 0], -P[:, 2], P[:, 1]
z0, z1 = Z.min(), Z.max(); Hh = z1 - z0; fy = Y.min(); by = Y.max(); cy = (fy + by) / 2
print('head', round(z0, 3), round(z1, 3), 'front', round(fy, 3), 'back', round(by, 3))
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def bump(a, b, c, e, x): return sm(a, b, x) * (1 - sm(c, e, x))
# u: 0 neck .. .18 chin .. .47 eyes .. 1 crown; f: 1 at the face, 0 at the back of the skull
def field(x, y, z, skull_only):
    u = (z - z0) / Hh; f = 1 - sm(cy - 0.03, cy + 0.04, y); neck = sm(0.12, 0.2, u)
    jaw = bump(0.15, 0.22, 0.34, 0.42, u) * neck; cheek = bump(0.36, 0.42, 0.5, 0.56, u); temple = bump(0.5, 0.58, 0.72, 0.8, u)
    crown = sm(0.6, 1.0, u); chin = bump(0.12, 0.17, 0.24, 0.3, u) * f * neck; brow = bump(0.53, 0.56, 0.6, 0.64, u) * f
    zero = np.zeros_like(x)
    def v(dx, dy, dz): return np.stack([dx + zero, dy + zero, dz + zero], 1)
    out = {}
    # SQUARE: broad flat jaw, squared chin, heavy brow, flatter crown
    out['HT_Square'] = v(x * (0.2 * jaw + 0.05 * cheek) * (0 if skull_only else 1) + x * 0.04 * temple,
                         (-0.008 * brow - 0.004 * chin) * (0 if skull_only else 1), -(z - z0 - 0.82 * Hh).clip(0) * 0.25 * crown)
    # LONG: taller skull and face, narrow cheeks, chin dropped forward
    out['HT_Long'] = v(x * (-0.09 * cheek - 0.08 * jaw - 0.03 * temple) * (0 if skull_only else 1) - x * 0.03 * temple * skull_only,
                       -0.006 * chin * (0 if skull_only else 1), 0.11 * Hh * sm(0.45, 1.0, u) - (0 if skull_only else 1) * 0.045 * Hh * chin)
    # ANGULAR: high cheekbones out, hollows under them, narrow pointed chin pushed forward, brow ridge
    hollow = bump(0.24, 0.3, 0.36, 0.4, u) * (1 - sm(0.0, 0.03, -np.abs(x) + 0.03)) * neck
    out['HT_Angular'] = v(x * (0.13 * cheek - 0.1 * hollow - 0.14 * jaw * (1 - sm(0.02, 0.06, np.abs(x))) * 0 - 0.12 * jaw) * (0 if skull_only else 1),
                          (-0.012 * chin - 0.007 * brow + 0.004 * hollow * f) * (0 if skull_only else 1), -0.012 * chin * (0 if skull_only else 1))
    # BROAD: a wide heavy skull: everything above the neck wider and deeper, short face
    out['HT_Broad'] = v(x * 0.15 * neck, (y - cy) * 0.08 * neck, -0.03 * Hh * sm(0.5, 1, u) + (0 if skull_only else 1) * 0.02 * Hh * chin)
    # ROUND: full cheeks, soft short chin, round crown
    out['HT_Round'] = v(x * (0.14 * cheek + 0.12 * jaw + 0.05 * temple) * (0 if skull_only else 1) + x * 0.05 * temple * skull_only,
                        (y - cy) * 0.05 * crown + (0 if skull_only else 1) * 0.004 * chin, (0 if skull_only else 1) * 0.03 * Hh * chin)
    # HEART: wide temples and brow, narrow tapering jaw to a small pointed chin
    taper = (1 - sm(0.0, 0.05, np.abs(x)))
    out['HT_Heart'] = v(x * (0.12 * temple + 0.06 * cheek * 0 - 0.2 * jaw - 0.25 * chin) * (0 if skull_only else 1) + x * 0.12 * temple * skull_only,
                        -0.008 * chin * taper * (0 if skull_only else 1), 0.01 * Hh * chin * (0 if skull_only else 1))
    return out
KEYS = ['HT_Square', 'HT_Long', 'HT_Angular', 'HT_Broad', 'HT_Round', 'HT_Heart']
def apply(mesh, skull_only):
    ex = mesh.setdefault('extras', {}); names = ex.setdefault('targetNames', [])
    if 'HT_Square' in names: return
    for p in mesh['primitives']:
        q = acc(p['attributes']['POSITION']); x, y, z = q[:, 0], -q[:, 2], q[:, 1]
        F = field(x, y, z, 1 if skull_only else 0)
        p.setdefault('targets', [])
        for k in KEYS:
            dv = F[k]; g = np.stack([dv[:, 0], dv[:, 2], -dv[:, 1]], 1)  # back to glTF
            p['targets'].append({'POSITION': add(g)})
    names += KEYS; mesh['weights'] = (mesh.get('weights') or [0] * (len(names) - len(KEYS))) + [0] * len(KEYS)
apply(head, False)
for m in J['meshes']:
    if m is not head and m['name'].startswith(('Hat_', 'Eyew_')): apply(m, True)
J['buffers'][0]['byteLength'] = len(B)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
while len(B) % 4: B.append(0)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out); print('wrote', dst, len(out))
