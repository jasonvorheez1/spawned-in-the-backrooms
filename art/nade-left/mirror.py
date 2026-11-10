# Mirror the overhand throw clip left<->right so the grenade leaves the LEFT hand.
# Works on the glb directly: swaps Left*/Right* channel targets and mirrors each key across X
# (rotation (x,y,z,w) -> (x,-y,-z,w), translation (x,y,z) -> (-x,y,z)), rest poses mirrored the same way.
import json, struct, sys, numpy as np
SRC, OUT = sys.argv[1], sys.argv[2]
b = open(SRC, "rb").read()
jl = struct.unpack_from("<I", b, 12)[0]; J = json.loads(b[20:20 + jl]); off = 20 + jl
bl = struct.unpack_from("<I", b, off)[0]; BIN = bytearray(b[off + 8: off + 8 + bl])
def acc(i):
    a = J["accessors"][i]; v = J["bufferViews"][a["bufferView"]]
    n = {"VEC3": 3, "VEC4": 4, "SCALAR": 1}[a["type"]]
    st = v.get("byteOffset", 0) + a.get("byteOffset", 0)
    return st, n, a["count"]
def mirror(i, path):
    st, n, c = acc(i); ct = J["accessors"][i]["componentType"]
    dt = {5126: np.float32, 5122: np.int16, 5120: np.int8}[ct]  # rotations may be normalized shorts
    arr = np.frombuffer(BIN, dt, c * n, st).reshape(c, n).copy()
    if dt is not np.float32: arr = np.maximum(arr, -np.iinfo(dt).max)
    if path == "rotation": arr[:, 1] *= -1; arr[:, 2] *= -1
    elif path == "translation": arr[:, 0] *= -1
    BIN[st: st + arr.nbytes] = arr.tobytes()
names = {i: n.get("name", "") for i, n in enumerate(J["nodes"])}
byname = {v: k for k, v in names.items()}
def flip(n):
    if n.startswith("Left"): return "Right" + n[4:]
    if n.startswith("Right"): return "Left" + n[5:]
    return n
for anim in J["animations"]:
    for ch in anim["channels"]:
        t = ch["target"]; nm = names[t["node"]]
        t["node"] = byname.get(flip(nm), t["node"])
        s = anim["samplers"][ch["sampler"]]
        if t["path"] in ("rotation", "translation"): mirror(s["output"], t["path"])
    anim["name"] = anim.get("name", "throw") + "-left"
done = set()
for anim in J["animations"]:
    for s in anim["samplers"]:
        pass
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((4 - len(js) % 4) % 4)
out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(BIN)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(BIN), 0x004E4942) + bytes(BIN)
open(OUT, "wb").write(out); print("wrote", OUT, len(out))
