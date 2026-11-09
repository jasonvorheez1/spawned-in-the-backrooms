# Hats seat on the male head (Shelly, Nov 9: the top hat floated above the hair). The male GLB's top hat, crown and
# party hat sat 5-6 cm over the brim-cut hair with a crown far wider than the skull. This narrows each about its own
# centre and drops it onto the hair line, head-type morph deltas narrowed alike. python3 art/human-head/hats.py <in> <out>
import json, struct, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
FIT = {'Hat_tophat': (0.95, 1.684), 'Hat_crown': (0.92, 1.742), 'Hat_partyhat': (1.0, 1.748)}  # (xz scale, bottom y): my picks
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]; J = json.loads(d[20:20 + jl]); bo = 20 + jl
bl = struct.unpack('<I', d[bo:bo + 4])[0]; B = bytearray(d[bo + 8:bo + 8 + bl])
def off(i):
    a = J['accessors'][i]; v = J['bufferViews'][a['bufferView']]; return a, v.get('byteOffset', 0) + a.get('byteOffset', 0), v.get('byteStride', 12)
def get(i):
    a, o, s = off(i); assert s == 12 or s is None
    return np.frombuffer(bytes(B[o:o + a['count'] * 12]), dtype='<f4').reshape(-1, 3).copy()
def put(i, arr):
    a, o, _ = off(i); B[o:o + arr.nbytes] = arr.astype('<f4').tobytes(); a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
for node in J['nodes']:
    if node.get('name') not in FIT or 'mesh' not in node: continue
    k, bottom = FIT[node['name']]; mesh = J['meshes'][node['mesh']]
    P = np.concatenate([get(p['attributes']['POSITION']) for p in mesh['primitives']])
    c = P.mean(0); dy = bottom - P[:, 1].min()
    for p in mesh['primitives']:
        i = p['attributes']['POSITION']; Q = get(i)
        Q[:, 0] = c[0] + (Q[:, 0] - c[0]) * k; Q[:, 2] = c[2] + (Q[:, 2] - c[2]) * k; Q[:, 1] += dy; put(i, Q)
        for t in p.get('targets', []):
            if 'POSITION' in t: D = get(t['POSITION']); D[:, 0] *= k; D[:, 2] *= k; put(t['POSITION'], D)
    print(node['name'], 'scale', k, 'drop %.3f' % -dy)
js = json.dumps(J, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
while len(B) % 4: B.append(0)
out = struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(B), 0x004E4942) + bytes(B)
open(dst, 'wb').write(out)
