# Tower Unite .plymodel -> .glb: every section with its own embedded texture.
# Read off the file: section table at 0x4b (start, count, material, n) x4; u32 indices from 0x1c48 to the
# "01 01 2c" vertex header; 44-byte vertices (pos f32x3, packed normal 8, uv f32x2, bones 8, weights 8);
# then one TGA per material, in material order. UE4 UVs are top-left origin like glTF: used as-is.
import struct, io, sys, json, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
d = open(src, 'rb').read()
nsec = d[0x4a]
secs = [struct.unpack_from('<4I', d, 0x4b + 16 * i) for i in range(nsec)]
vh = d.find(b'\x01\x01\x2c\x00\x00\x00')
I = np.frombuffer(d[0x1c48:vh], dtype='<u4').astype(np.int64)
vs = vh + 9
n = int(I.max()) + 1
V = np.frombuffer(d[vs:vs + n * 44], dtype=np.uint8).reshape(n, 44)
P = np.frombuffer(V[:, 0:12].tobytes(), dtype='<f4').reshape(n, 3).astype(np.float64)
UV = np.frombuffer(V[:, 20:28].tobytes(), dtype='<f4').reshape(n, 2).copy()
s = 1.8 / (P[:, 1].max() - P[:, 1].min())
P = np.stack([P[:, 0], -P[:, 1], -P[:, 2]], 1) * s
P[:, 1] -= P[:, 1].min()
F = I[: len(I) // 3 * 3].reshape(-1, 3)
N = np.zeros_like(P)
fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
for k in range(3): np.add.at(N, F[:, k], fn)
N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
texs = []; o = vs + n * 44
while o < len(d) - 18 and len(texs) < 16:
    if d[o + 1] == 0 and d[o + 2] in (2, 10) and d[o + 16] in (24, 32) and d[o + 12:o + 14] != b'\0\0':
        try:
            im = Image.open(io.BytesIO(d[o:])); im.load(); b = io.BytesIO(); im.convert('RGBA').save(b, 'PNG'); texs.append(b.getvalue()); o += 100; continue
        except Exception: pass
    o += 1
def pad(b): return b + b'\0' * ((4 - len(b) % 4) % 4)
bin_ = b''; views = []; acc = []
def add(b, target=None):
    global bin_
    views.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": len(b), **({"target": target} if target else {})}); bin_ += pad(b); return len(views) - 1
def accessor(view, ctype, count, typ, **kw):
    acc.append({"bufferView": view, "componentType": ctype, "count": count, "type": typ, **kw}); return len(acc) - 1
aP = accessor(add(P.astype('<f4').tobytes(), 34962), 5126, n, "VEC3", min=P.min(0).tolist(), max=P.max(0).tolist())
aN = accessor(add(N.astype('<f4').tobytes(), 34962), 5126, n, "VEC3")
aU = accessor(add(UV.astype('<f4').tobytes(), 34962), 5126, n, "VEC2")
images = [{"bufferView": add(t), "mimeType": "image/png"} for t in texs]
prims = []; mats = []
for (start, count, mat, _) in secs:
    ai = accessor(add(I[start:start + count].astype('<u4').tobytes(), 34963), 5125, count, "SCALAR")
    m = len(mats)
    mats.append({"name": f"mat{mat}", "pbrMetallicRoughness": {"baseColorTexture": {"index": min(mat, len(texs) - 1)}, "metallicFactor": 0, "roughnessFactor": 0.75}, "alphaMode": "MASK", "alphaCutoff": 0.4, "doubleSided": True})
    prims.append({"attributes": {"POSITION": aP, "NORMAL": aN, "TEXCOORD_0": aU}, "indices": ai, "material": m})
g = {"asset": {"version": "2.0"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0, "name": "model"}], "meshes": [{"primitives": prims}],
     "materials": mats, "textures": [{"source": i, "sampler": 0} for i in range(len(texs))], "samplers": [{"wrapS": 10497, "wrapT": 10497}],
     "images": images, "accessors": acc, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
j = pad(json.dumps(g).encode()).replace(b'\0', b' ')
open(out, 'wb').write(struct.pack('<III', 0x46546C67, 2, 28 + len(j) + len(bin_)) + struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(bin_), 0x004E4942) + bin_)
print(n, 'verts', len(F), 'tris', len(secs), 'sections', secs, len(texs), 'textures')
