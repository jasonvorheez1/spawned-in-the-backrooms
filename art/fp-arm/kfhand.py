# New Vegas 1st-person .kf -> the right arm and hand pose in the 1st-person camera's frame (Shelly's melee pack).
# usage: python3 kfhand.py <in.kf> <out.json> [time 0..1]
import sys, json, math, time; time.clock = time.perf_counter
sys.path.insert(0, "/workspace/world/art/nv-melee")
from pyffi.formats.nif import NifFormat
import importlib.util
spec = importlib.util.spec_from_file_location("kp", "/workspace/world/art/nv-melee/kf2pos.py")
src = open("/workspace/world/art/nv-melee/kf2pos.py").read().split("d = NifFormat.Data()")[0]
ns = {}; exec(src, ns)
qmul, qrot, sampler = ns["qmul"], ns["qrot"], ns["sampler"]
P = {"Bip01 NonAccum": "Bip01", "Bip01 Pelvis": "Bip01 NonAccum", "Bip01 Spine": "Bip01 Pelvis", "Bip01 Spine1": "Bip01 Spine",
     "Bip01 Spine2": "Bip01 Spine1", "Bip01 Neck": "Bip01 Spine2", "Bip01 Neck1": "Bip01 Neck", "Bip01 Head": "Bip01 Neck1",
     "Camera1st": "Bip01 Head", "Weapon": "Bip01 R Hand"}
for s in "LR":
    P.update({f"Bip01 {s} Clavicle": "Bip01 Neck", f"Bip01 {s} UpperArm": f"Bip01 {s} Clavicle", f"Bip01 {s} Forearm": f"Bip01 {s} UpperArm",
              f"Bip01 {s} Hand": f"Bip01 {s} Forearm", f"Bip01 {s} Thumb1": f"Bip01 {s} Hand"})
    for f in "1234":
        P[f"Bip01 {s} Finger{f}"] = f"Bip01 {s} Hand"; P[f"Bip01 {s} Finger{f}1"] = f"Bip01 {s} Finger{f}"; P[f"Bip01 {s} Finger{f}2"] = f"Bip01 {s} Finger{f}1"
    P[f"Bip01 {s} Thumb11"] = f"Bip01 {s} Thumb1"; P[f"Bip01 {s} Thumb12"] = f"Bip01 {s} Thumb11"
d = NifFormat.Data(); d.read(open(sys.argv[1], "rb")); seq = d.roots[0]
S = {}
for cb in seq.controlled_blocks:
    nm = cb.get_node_name().decode()
    if cb.interpolator: S[nm] = sampler(cb.interpolator)
u = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
t = seq.start_time + (seq.stop_time - seq.start_time) * u
W = {}
def world(n):
    if n in W: return W[n]
    p, q = S[n](t) if n in S else ((0, 0, 0), (1, 0, 0, 0))
    if any(abs(c) > 1e30 for c in p): p = (0, 0, 0)
    if any(abs(c) > 1e30 for c in q): q = (1, 0, 0, 0)
    par = P.get(n)
    if par:
        pp, pq = world(par); p = tuple(a+b for a, b in zip(pp, qrot(pq, p))); q = qmul(pq, q)
    W[n] = (p, q); return W[n]
cp, cq = world("Camera1st"); ci = (cq[0], -cq[1], -cq[2], -cq[3])
out = {}
for n in P:
    if n == "Bip01": continue
    p, q = world(n)
    out[n] = {"p": [round(c, 4) for c in qrot(ci, tuple(a - b for a, b in zip(p, cp)))], "q": [round(c, 5) for c in qmul(ci, q)], "keyed": n in S}
json.dump(out, open(sys.argv[2], "w"), indent=0)
for n in ["Bip01 Head", "Bip01 R Clavicle", "Bip01 R UpperArm", "Bip01 R Forearm", "Bip01 R Hand", "Bip01 R Finger2", "Bip01 R Finger21", "Bip01 R Finger22", "Bip01 R Thumb1", "Bip01 R Thumb12", "Weapon", "Bip01 L Hand"]:
    print(f"{n:20s}", out[n]["p"], out[n]["keyed"])
