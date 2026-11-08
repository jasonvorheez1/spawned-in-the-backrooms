# packs each kit module (scripts/lib/l2kit-data/<part>.js as build.py wrote it, or /workspace/l2kit/<part>.json)
# into a 16-bit greyscale PNG stream the geometry reads as params.mesh = { samples: <png> } (decoder: scripts/lib/l2kit.js)
import json, sys, os, numpy as np
from PIL import Image
MATS = ["concrete","dark","floor","paint","ceil","lag","galv","steel","green","red","housing","brass","band","rubber","stain","orange"]
W = 512
def pack(d, out):
    groups = d["hi"] + d["lo"]
    head = [0x4B31, len(groups), len(d["hi"])]
    body = []
    for g in groups:
        nv = len(g["p"]) // 3; ni = len(g["i"])
        head += [MATS.index(g["m"]), nv, ni & 0xFFFF, ni >> 16]
        q = lambda a, o, s: np.clip(np.round((np.array(a, float) + o) * s), 0, 65535).astype(np.uint16)
        body += [q(g["p"], 8, 4000), q(g["n"], 1, 32767.5), q(g["u"], 16, 2000), q(g["c"], 0, 65535), np.array(g["i"], np.uint16)]
    s = np.concatenate([np.array(head, np.uint16)] + body)
    h = (len(s) + W - 1) // W
    a = np.zeros(W * h, np.uint16); a[:len(s)] = s
    Image.fromarray(a.reshape(h, W), mode="I;16").save(out)
    return len(s), os.path.getsize(out)
for f in sys.argv[1:]:
    t = open(f).read(); d = json.loads(t[t.index("{"):].rstrip().rstrip(";"))
    part = os.path.basename(f).split(".")[0]
    print(part, *pack(d, f"/workspace/l2kit/{part}.png"))
