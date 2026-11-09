# Post-pass on the exported human GLB: every joint keeps its world position but takes a world-aligned (identity) frame,
# the same frames the library clips are authored on, and its inverse bind matrix is recomputed so the rest mesh is unchanged.
# python3 art/human-base/identity.py in.glb out.glb
import json, struct, sys, numpy as np
src, dst = sys.argv[1], sys.argv[2]
b = open(src, "rb").read()
jl = struct.unpack("<I", b[12:16])[0]; J = json.loads(b[20:20 + jl]); bin_off = 20 + jl
bl = struct.unpack("<I", b[bin_off:bin_off + 4])[0]; BIN = bytearray(b[bin_off + 8:bin_off + 8 + bl])
N = J["nodes"]; par = {}
for i, n in enumerate(N):
    for c in n.get("children", []): par[c] = i
def q2m(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
def local(n):
    M = np.eye(4)
    if "matrix" in n: return np.array(n["matrix"]).reshape(4, 4).T
    S = np.diag(n.get("scale", [1, 1, 1])); M[:3, :3] = q2m(n.get("rotation", [0, 0, 0, 1])) @ S; M[:3, 3] = n.get("translation", [0, 0, 0]); return M
cache = {}
def world(i):
    if i not in cache: cache[i] = (world(par[i]) if i in par else np.eye(4)) @ local(N[i])
    return cache[i]
skin = J["skins"][0]; joints = skin["joints"]; jset = set(joints)
W = {i: world(i) for i in range(len(N))}
newW = {}
for i in joints:
    M = np.eye(4); M[:3, 3] = W[i][:3, 3]
    p = par.get(i)
    if p is not None and p not in jset: M[:3, :3] = W[p][:3, :3]  # the armature root's own axis turn stays above the joints
    newW[i] = M
for i in joints:
    p = par.get(i); PW = newW[p] if p in jset else W[p] if p is not None else np.eye(4)
    L = np.linalg.inv(PW) @ newW[i]
    n = N[i]; n.pop("matrix", None); n.pop("scale", None)
    n["rotation"] = [0, 0, 0, 1]; n["translation"] = [float(x) for x in L[:3, 3]]
    if p is not None and p not in jset:  # root joint under a turned armature node: keep that node's turn out of the joint
        n["translation"] = [float(x) for x in (np.linalg.inv(W[p]) @ newW[i])[:3, 3]]; R = (np.linalg.inv(W[p]) @ newW[i])[:3, :3]
        if not np.allclose(R, np.eye(3), atol=1e-4): raise SystemExit("root joint frame not identity under armature")
acc = J["accessors"][skin["inverseBindMatrices"]]; bv = J["bufferViews"][acc["bufferView"]]
off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
old = np.frombuffer(bytes(BIN[off:off + 64 * len(joints)]), dtype="<f4").reshape(-1, 4, 4).transpose(0, 2, 1)
# mesh-space bind: IBM_old maps mesh space to joint space with the old joint world J_old; skinning = J_world * IBM. keep J_new*IBM_new = J_old*IBM_old
for k, i in enumerate(joints):
    ibm = np.linalg.inv(newW[i]) @ W[i] @ old[k]
    BIN[off + 64 * k: off + 64 * (k + 1)] = ibm.T.astype("<f4").tobytes()
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((4 - len(js) % 4) % 4)
out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(BIN)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(BIN)) + b"BIN\x00" + bytes(BIN)
open(dst, "wb").write(out); print("identity joints", len(joints), "->", dst)
