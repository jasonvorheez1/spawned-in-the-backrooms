# nv-swings.js rows -> continuous rows. swings.py wrote each turn as an axis-angle vector read as pitch/yaw/roll;
# past ~180 deg the vector flips sign (slash2 jumped 308 deg in one row, club 93). Here each row's turn becomes a
# quaternion, is kept on the previous row's hemisphere, decomposed to YXZ euler, and unwrapped against the last row.
# usage: python3 art/nv-melee/smooth.py scripts/lib/data/nv-swings.js
import json, math, sys
f = sys.argv[1]; src = open(f).read(); head, body = src.split("export const NV_SWINGS = ")
J = json.loads(body.strip())
def q_of(rv):
    a = math.radians(math.sqrt(sum(c*c for c in rv)))
    if a < 1e-9: return (1, 0, 0, 0)
    n = [math.radians(c)/a for c in rv]; s = math.sin(a/2); return (math.cos(a/2), n[0]*s, n[1]*s, n[2]*s)
def yxz(q):  # euler (x pitch, y yaw, z roll) for R = Ry * Rx * Rz
    w, x, y, z = q
    m12 = 2*(y*z - w*x); m02 = 2*(x*z + w*y); m22 = 1 - 2*(x*x + y*y); m10 = 2*(x*y + w*z); m11 = 1 - 2*(x*x + z*z)
    p = math.asin(max(-1, min(1, -m12))); yw = math.atan2(m02, m22); r = math.atan2(m10, m11)
    return [math.degrees(p), math.degrees(yw), math.degrees(r)]
def near(a, ref): return a + 360*round((ref - a)/360)
for k, v in J.items():
    prev_q, prev_e = None, None
    for row in v["f"]:
        q = q_of(row[4:7])
        if prev_q and sum(a*b for a, b in zip(q, prev_q)) < 0: q = tuple(-c for c in q)
        e = yxz(q)
        if prev_e:
            alt = [180 - e[0], e[1] + 180, e[2] + 180]
            cand = [[near(c, r) for c, r in zip(x, prev_e)] for x in (e, alt)]
            e = min(cand, key=lambda x: sum((a-b)**2 for a, b in zip(x, prev_e)))
        row[4:7] = [round(c, 1) for c in e]; prev_q, prev_e = q, e
    mx = max(max(abs(a[c]-b[c]) for c in (4, 5, 6)) for a, b in zip(v["f"], v["f"][1:]))
    print(k, "max step", round(mx, 1))
open(f, "w").write(head + "export const NV_SWINGS = " + json.dumps(J, separators=(",", ":")) + "\n")
