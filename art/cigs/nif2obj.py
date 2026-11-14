# the creator's FNV cigarette mod (nif + dds) -> obj + png per item, for build.py
import time; time.clock = time.perf_counter
import glob, os, subprocess, json
from pyffi.formats.nif import NifFormat
SRC = "/workspace/art/cigs/src"; OUT = "/workspace/art/cigs/obj"; os.makedirs(OUT, exist_ok=True)
dds = {os.path.basename(p).lower(): p for p in glob.glob(SRC + "/**/*.dds", recursive=True)}
FIX = {}  # the mod names its old gold diffuse maps _n and its normal maps plain; the nif slots are right as they stand
items = []
for f in sorted(glob.glob(SRC + "/**/*.nif", recursive=True)):
    rel = f.split("Cigarettes/")[1][:-4]
    name = rel.replace("/", "-").lower()
    d = NifFormat.Data(); d.read(open(f, "rb"))
    tex = next(b.textures[0].decode().split("\\")[-1].lower() for b in d.blocks if type(b).__name__ == "BSShaderTextureSet")
    tex = FIX.get(tex, tex)
    geo = next(b for b in d.blocks if type(b).__name__ in ("NiTriShapeData", "NiTriStripsData"))
    shape = next(b for b in d.blocks if type(b).__name__ in ("NiTriShape", "NiTriStrips"))
    v = [(p.x, p.y, p.z) for p in geo.vertices]; uv = [(t.u, 1 - t.v) for t in geo.uv_sets[0]]
    tris = geo.get_triangles()
    with open(f"{OUT}/{name}.obj", "w") as o:
        o.write(f"mtllib {name}.mtl\nusemtl {name}\n")
        for p in v: o.write("v %f %f %f\n" % p)
        for t in uv: o.write("vt %f %f\n" % t)
        for a, b, c in tris: o.write(f"f {a+1}/{a+1} {b+1}/{b+1} {c+1}/{c+1}\n")
    subprocess.run(["convert", dds[tex], f"{OUT}/{name}.png"], check=True)
    open(f"{OUT}/{name}.mtl", "w").write(f"newmtl {name}\nmap_Kd {name}.png\n")
    xs = [p[i] for p in v for i in range(3)]
    ext = [max(p[i] for p in v) - min(p[i] for p in v) for i in range(3)]
    items.append({"name": name, "kind": "carton" if "cart" in name else "pack", "tex": tex, "ext": ext})
json.dump(items, open(f"{OUT}/items.json", "w"), indent=1)
for i in items: print(i["name"], i["kind"], [round(e, 1) for e in i["ext"]])
