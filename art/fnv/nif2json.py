# FNV .nif (+ .dds) -> one json per mesh: every shape in world space (mod units), its uv, tris, diffuse png, alpha flag. build.py makes the glb.
# usage: python3 nif2json.py <pack src dir> <out dir> [substring filter ...]
import time; time.clock = time.perf_counter
import sys, glob, os, json, subprocess
import numpy as np
from pyffi.formats.nif import NifFormat
SRC, OUT = sys.argv[1], sys.argv[2]; FILT = [f.lower() for f in sys.argv[3:]]
os.makedirs(OUT, exist_ok=True)
dds = {}
for p in glob.glob(SRC + "/**/*.dds", recursive=True): dds.setdefault(os.path.basename(p).lower(), p)
def mat(b):
    r = b.rotation; M = np.eye(4)
    M[:3, :3] = np.array([[r.m_11, r.m_12, r.m_13], [r.m_21, r.m_22, r.m_23], [r.m_31, r.m_32, r.m_33]]) * b.scale
    M[3, :3] = [b.translation.x, b.translation.y, b.translation.z]; return M  # row-vector convention: v' = v @ M
def texof(shape):
    for p in shape.bs_properties if hasattr(shape, "bs_properties") else []:
        pass
    for p in list(shape.properties) + list(getattr(shape, "bs_properties", []) or []):
        if p is None: continue
        ts = getattr(p, "texture_set", None)
        if ts is not None and ts.textures: return ts.textures[0].decode(errors="ignore").split("\\")[-1].lower()
        if type(p).__name__ == "NiTexturingProperty" and p.has_base_texture and p.base_texture.source:
            return p.base_texture.source.file_name.decode(errors="ignore").split("\\")[-1].lower()
    return None
def alphaof(shape):
    return any(p is not None and type(p).__name__ == "NiAlphaProperty" for p in shape.properties)
done = []
for f in sorted(glob.glob(SRC + "/**/*.nif", recursive=True)):
    name = os.path.splitext(os.path.basename(f))[0].lower().replace(" ", "")
    if FILT and not any(k in f.lower() for k in FILT): continue
    d = NifFormat.Data()
    try: d.read(open(f, "rb"))
    except Exception as e: print("SKIP", name, e); continue
    parent = {}
    for b in d.blocks:
        for c in getattr(b, "children", []) or []:
            if c is not None: parent[id(c)] = b
    shapes = []
    for b in d.blocks:
        if type(b).__name__ not in ("NiTriShape", "NiTriStrips"): continue
        if b.flags & 1: continue  # hidden
        g = b.data
        if g is None or not g.num_vertices or not g.has_uv: continue
        M = mat(b); p = parent.get(id(b))
        while p is not None: M = M @ mat(p); p = parent.get(id(p))
        V = np.array([[v.x, v.y, v.z, 1] for v in g.vertices]) @ M
        tex = texof(b); png = None
        if tex and tex in dds:
            png = f"{OUT}/{os.path.splitext(tex)[0]}.png"
            if not os.path.exists(png): subprocess.run(["convert", dds[tex], png], check=False)
        col = [1, 1, 1]
        if g.has_vertex_colors: c = g.vertex_colors[0]; col = [c.r, c.g, c.b]
        shapes.append({"v": V[:, :3].round(4).tolist(), "uv": [[t.u, 1 - t.v] for t in g.uv_sets[0]], "tris": [list(t) for t in g.get_triangles()], "png": png, "tex": tex, "alpha": alphaof(b)})
    if not shapes: print("EMPTY", name); continue
    allv = np.concatenate([np.array(s["v"]) for s in shapes]); ext = (allv.max(0) - allv.min(0)).round(1).tolist()
    json.dump({"name": name, "shapes": shapes}, open(f"{OUT}/{name}.json", "w"))
    print(name, len(shapes), "shapes", ext, sum(len(s["tris"]) for s in shapes), "tris", [s["tex"] for s in shapes][:4])
