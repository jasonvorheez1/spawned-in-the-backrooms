# Level 2 kit, last pass: each module -> scripts/lib/l2kit-data/<part>.js as a compact base64 record
# (decoded by unpack() in scripts/lib/l2kit.js). Heavy parts come welded and decimated from compact.py
# (/workspace/l2kit/out, triplanar uvs), the rest from build.py's json (/workspace/l2kit/src, their own uvs).
# Per group, little-endian: positions u16x3 (group box), normals octahedral u8x2, colour rgb565 u16, [uv u16x2], indices u16.
import json, os, base64, struct, math
COMPACT = ["piperun", "tray", "wall"]
# a module with no low copy draws its leading FAR groups as the far level (the long pipes; brackets, bands and stains drop)
FAR = {"piperun": ["lag", "green", "red"]}
def oct(n):
    x, y, z = n; s = abs(x) + abs(y) + abs(z) or 1; x, y, z = x / s, y / s, z / s
    if z < 0: x, y = (1 - abs(y)) * (1 if x >= 0 else -1), (1 - abs(x)) * (1 if y >= 0 else -1)
    return [max(0, min(255, round((x * 0.5 + 0.5) * 255))), max(0, min(255, round((y * 0.5 + 0.5) * 255)))]
def q(v, lo, hi): return max(0, min(65535, round((v - lo) / ((hi - lo) or 1) * 65535)))
for part in sorted(f[:-5] for f in os.listdir("/workspace/l2kit/src")):
    uv = part not in COMPACT
    d = json.load(open(f"/workspace/l2kit/{'out' if not uv else 'src'}/{part}.json"))
    heads, buf = [], bytearray()
    if part in FAR: d = {"hi": sorted(d["hi"], key=lambda g: FAR[part].index(g["m"]) if g["m"] in FAR[part] else 9), "lo": []}
    for lv, k in enumerate(("hi", "lo")):
        for g in d[k]:
            nv, ni = len(g["p"]) // 3, len(g["i"])
            P = [g["p"][a::3] for a in range(3)]; bb = [round(min(c) - 1e-4, 4) for c in P] + [round(max(c) + 1e-4, 4) for c in P]
            h = [lv, g["m"], nv, ni, *bb]
            for v in range(nv): buf += struct.pack("<3H", *(q(g["p"][v * 3 + a], bb[a], bb[a + 3]) for a in range(3)))
            for v in range(nv): buf += bytes(oct(g["n"][v * 3:v * 3 + 3]))
            for v in range(nv):
                r, gg, b = (max(0, min(1, c)) for c in g["c"][v * 3:v * 3 + 3])
                buf += struct.pack("<H", (round(r * 31) << 11) | (round(gg * 63) << 5) | round(b * 31))
            if uv:
                U = [g["u"][0::2], g["u"][1::2]]; ub = [round(min(c) - 1e-4, 4) for c in U] + [round(max(c) + 1e-4, 4) for c in U]; h += ub
                for v in range(nv): buf += struct.pack("<2H", q(g["u"][v * 2], ub[0], ub[2]), q(g["u"][v * 2 + 1], ub[1], ub[3]))
            buf += struct.pack(f"<{ni}H", *g["i"])
            heads.append(h)
    js = (f"// Level 2 kit module \"{part}\", packed by art/level2/encode.py (decoder: unpack in scripts/lib/l2kit.js). Do not hand-edit.\n"
          f"export default {{ uv: {'true' if uv else 'false'}, far: {len(FAR.get(part, []))}, g: {json.dumps(heads, separators=(',', ':'))}, b: \"{base64.b64encode(bytes(buf)).decode()}\" }};\n")
    open(f"scripts/lib/l2kit-data/{part}.js", "w").write(js)
    print(part, len(js))
