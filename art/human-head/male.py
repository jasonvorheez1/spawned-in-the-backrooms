# Male face proportions (Shelly, Nov 9: "why are they so squished looking?"): the male body wore the female anime head,
# a big cranium over a face packed into its lower third. This lengthens the face below the eyes, widens and squares
# the jaw and gives the nose bridge some height, written into the head's base shape in the live GLB (rig and clips untouched).
# Skull, ears and crown stay put, so hair and hats still sit. python3 art/human-head/male.py <in.glb> <out.glb>
import json, struct, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
LEN, JAW, NOSE = 0.30, 0.12, 0.004   # lower face +30 %, jaw +12 % wide, bridge 4 mm out (my picks)
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl]); bo = 20 + jl
bl = struct.unpack('<I', d[bo:bo + 4])[0]; B = bytearray(d[bo + 8:bo + 8 + bl])
def view(i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return a, o
def get(i): a, o = view(i); return np.frombuffer(bytes(B[o:o + a['count'] * 12]), dtype='<f4').reshape(-1, 3).copy()
def put(i, arr):
    a, o = view(i); B[o:o + arr.nbytes] = arr.astype('<f4').tobytes(); a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
head = next(m for m in J['meshes'] if m['name'] == 'Head')
mats = [J['materials'][p['material']]['name'] for p in head['primitives']]
skin = get(head['primitives'][mats.index('Head_Skin')]['attributes']['POSITION'])
iris = get(head['primitives'][mats.index('Iris')]['attributes']['POSITION'])
eye = float(iris[:, 1].mean()); front = float(skin[:, 2].max())
mid = skin[(np.abs(skin[:, 0]) < 0.012) & (skin[:, 2] > front - 0.05) & (skin[:, 1] < eye)]
chin = float(mid[:, 1].min()); neck = 1.47
print('eye', round(eye, 3), 'chin', round(chin, 3), 'front', round(front, 3))
def sm(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def warp(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    f = sm(-0.15, -0.07, z)                               # 1 over the face, 0 behind the jaw angle and ears
    drop = np.where(y >= chin, (eye - y).clip(0) * LEN, (eye - chin) * LEN * sm(neck, chin, y))  # under the jaw fades into the neck
    lowx = sm(eye - 0.01, eye - 0.05, y) * sm(neck, chin + 0.01, y)     # cheeks down to the jaw line
    nose = np.exp(-((y - (eye - 0.02)) / 0.018) ** 2) * np.exp(-(x / 0.012) ** 2) * sm(front - 0.03, front, z)
    Q = P.copy()
    Q[:, 1] = y - drop * f
    Q[:, 0] = x * (1 + JAW * lowx * f)
    Q[:, 2] = z + NOSE * nose
    return Q
for p in head['primitives']:
    i = p['attributes']['POSITION']; put(i, warp(get(i)))
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
while len(B) % 4: B.append(0)
out = struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out); print('wrote', dst, len(out))
