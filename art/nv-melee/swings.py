# NV melee clips -> vmpose SWING rows: the right hand's path and turn in camera space, relative to the clip's first frame.
# rows [t, x right m, y up m, depth fwd m, pitch°, yaw°, roll°]; NV units are ~1.43 cm; S scales a body arm to our viewmodel.
import json, sys, math
U = 0.0143 * 0.75
def qmul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return (w1*w2-x1*x2-y1*y2-z1*z2, w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2)
def conj(q): return (q[0], -q[1], -q[2], -q[3])
def norm(v): n = math.sqrt(sum(c*c for c in v)) or 1; return [c/n for c in v]
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def dot(a, b): return sum(x*y for x, y in zip(a, b))
def rot(q, v): return list(qmul(qmul(q, (0, *v)), conj(q))[1:])
out = {}
for arg in sys.argv[1:]:
    name, f = arg.split("=")
    J = json.load(open(f)); F = J["frames"]
    up = norm(J["axes"]["up"])
    hs = [sum(fr["_neck"]["RHandPos"][i] + fr["_neck"]["LHandPos"][i] for fr in F) for i in range(3)]
    fwd = norm([h - up[i]*dot(hs, up) for i, h in enumerate(hs)]); right = cross(fwd, up)
    B = lambda v: [dot(v, right), dot(v, up), dot(v, fwd)]
    p0 = F[0]["_neck"]["RHandPos"]; q0 = F[0]["_neck"]["RHandQ"]
    rows = []
    for i, fr in enumerate(F):
        p = fr["_neck"]["RHandPos"]; q = fr["_neck"]["RHandQ"]
        dp = B([a - b for a, b in zip(p, p0)])
        dq = qmul(q, conj(q0))  # world-ish delta in neck frame
        ax = B(list(dq[1:])); w = dq[0]
        # small-angle euler in camera basis: pitch about x(right), yaw about y(up), roll about z(fwd)
        ang = 2*math.atan2(math.sqrt(sum(c*c for c in ax)), w); n = norm(ax) if ang > 1e-6 else [0, 0, 0]
        if ang > math.pi: ang -= 2*math.pi
        e = [math.degrees(ang)*c for c in n]
        rows.append([round(i/(len(F)-1), 3), round(dp[0]*U, 3), round(dp[1]*U, 3), round(dp[2]*U, 3), round(e[0], 1), round(e[1], 1), round(-e[2], 1)])
    keep = [r for i, r in enumerate(rows) if i % 3 == 0 or i == len(rows)-1]
    keep[-1] = [1, 0, 0, 0, 0, 0, 0]  # settle home to the carried pose
    out[name] = {"dur": round(J["duration"], 3), "f": keep}
    peak = max(rows, key=lambda r: abs(r[4]) + abs(r[5]) + abs(r[6]))
    print(name, "dur", round(J["duration"], 2), "frames", len(F), "peak", peak, "maxdepth", max(r[3] for r in rows), "minx", min(r[1] for r in rows))
json.dump(out, open("/tmp/swings.json", "w"))
