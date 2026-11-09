# New Vegas .kf -> world joint positions of the whole Biped (third person), JSON. Decoder from art/nv-melee/kf2pos.py.
# New Vegas .kf (Gamebryo 20.2, Shelly's melee pack) -> world joint positions per frame, JSON.
# Decodes NiTransformInterpolator keys and NiBSplineCompTransformInterpolator (cubic open-uniform B-spline,
# value = bias + multiplier * short/32767), then runs FK down the Biped tree.
# usage: python3 kf2pos.py <in.kf> <out.json>
import sys, json, math, time; time.clock = time.perf_counter
from pyffi.formats.nif import NifFormat
FPS = 30
PARENT0 = {"Bip01 NonAccum": "Bip01", "Bip01 Pelvis": "Bip01 NonAccum", "Bip01 Spine": "Bip01 Pelvis", "Bip01 Spine1": "Bip01 Spine",
          "Bip01 Spine2": "Bip01 Spine1", "Bip01 Neck": "Bip01 Spine2", "Bip01 Neck1": "Bip01 Neck", "Bip01 Head": "Bip01 Neck1",
          "Weapon": "Bip01 R Hand"}
PARENT = PARENT0
for s in "LR":
    PARENT.update({f"Bip01 {s} Clavicle": "Bip01 Neck", f"Bip01 {s} UpperArm": f"Bip01 {s} Clavicle", f"Bip01 {s} Forearm": f"Bip01 {s} UpperArm",
                   f"Bip01 {s} Hand": f"Bip01 {s} Forearm", f"Bip01 {s} Finger2": f"Bip01 {s} Hand", f"Bip01 {s} Finger21": f"Bip01 {s} Finger2"})
def qmul(a, b):
    w1, x1, y1, z1 = a; w2, x2, y2, z2 = b
    return (w1*w2-x1*x2-y1*y2-z1*z2, w1*x2+x1*w2+y1*z2-z1*y2, w1*y2-x1*z2+y1*w2+z1*x2, w1*z2+x1*y2-y1*x2+z1*w2)
def qrot(q, v):
    w, x, y, z = q; p = qmul(qmul(q, (0, *v)), (w, -x, -y, -z)); return p[1:]
def qnorm(q):
    n = math.sqrt(sum(c*c for c in q)) or 1; return tuple(c/n for c in q)
def nlerp(a, b, t):
    if sum(x*y for x, y in zip(a, b)) < 0: b = tuple(-c for c in b)
    return qnorm(tuple(x + (y-x)*t for x, y in zip(a, b)))
def bspline(ctrl, n, u):  # open uniform cubic, u in [0,1]
    deg = 3; m = n - deg  # knot spans
    knots = [0]*(deg+1) + [i/m for i in range(1, m)] + [1]*(deg+1)
    u = min(max(u, 0), 1 - 1e-9)
    def N(i, k, u):
        if k == 0: return 1.0 if knots[i] <= u < knots[i+1] else 0.0
        a = 0 if knots[i+k] == knots[i] else (u-knots[i])/(knots[i+k]-knots[i])*N(i, k-1, u)
        b = 0 if knots[i+k+1] == knots[i+1] else (knots[i+k+1]-u)/(knots[i+k+1]-knots[i+1])*N(i+1, k-1, u)
        return a + b
    dim = len(ctrl[0]); out = [0.0]*dim
    for i in range(n):
        w = N(i, deg, u)
        if w:
            for d in range(dim): out[d] += w*ctrl[i][d]
    return out
def channel(i, off, bias, mul, dim):
    if off == 65535: return None
    pts = i.spline_data.short_control_points; n = i.basis_data.num_control_points
    return [[bias + mul*(pts[off + k*dim + d]/32767.0) for d in range(dim)] for k in range(n)], n
def sampler(i):
    t0, t1 = i.start_time if hasattr(i, "start_time") else 0, None
    if type(i).__name__ == "NiTransformInterpolator":
        k = i.data; tr0 = tuple(i.translation.as_list()); ro0 = (i.rotation.w, i.rotation.x, i.rotation.y, i.rotation.z)
        rk = [(q.time, (q.value.w, q.value.x, q.value.y, q.value.z)) for q in k.quaternion_keys] if k else []
        tk = [(q.time, tuple(q.value.as_list())) for q in k.translations.keys] if k else []
        def at(keys, t, dflt, rot):
            if not keys: return dflt
            if t <= keys[0][0]: return keys[0][1]
            for (ta, a), (tb, b) in zip(keys, keys[1:]):
                if t <= tb:
                    f = (t-ta)/((tb-ta) or 1)
                    return nlerp(a, b, f) if rot else tuple(x+(y-x)*f for x, y in zip(a, b))
            return keys[-1][1]
        return lambda t: (at(tk, t, tr0, False), at(rk, t, ro0, True))
    R = channel(i, i.rotation_offset, i.rotation_bias, i.rotation_multiplier, 4)
    T = channel(i, i.translation_offset, i.translation_bias, i.translation_multiplier, 3)
    ro = (i.rotation.w, i.rotation.x, i.rotation.y, i.rotation.z); tr = tuple(i.translation.as_list())
    span = (i.stop_time - i.start_time) or 1
    def f(t):
        u = (t - i.start_time)/span
        q = qnorm(tuple(bspline(R[0], R[1], u))) if R else ro
        p = tuple(bspline(T[0], T[1], u)) if T else tr
        return p, q
    return f

# third person: every Biped joint the human rig has, legs and fingers too
for s in "LR":
    PARENT.update({f"Bip01 {s} Thigh": "Bip01 Pelvis", f"Bip01 {s} Calf": f"Bip01 {s} Thigh", f"Bip01 {s} Foot": f"Bip01 {s} Calf", f"Bip01 {s} Toe0": f"Bip01 {s} Foot",
                   f"Bip01 {s} Thumb1": f"Bip01 {s} Hand", f"Bip01 {s} Thumb11": f"Bip01 {s} Thumb1", f"Bip01 {s} Thumb12": f"Bip01 {s} Thumb11"})
    for k in "1234":
        PARENT.update({f"Bip01 {s} Finger{k}": f"Bip01 {s} Hand", f"Bip01 {s} Finger{k}1": f"Bip01 {s} Finger{k}", f"Bip01 {s} Finger{k}2": f"Bip01 {s} Finger{k}1"})
d = NifFormat.Data(); d.read(open(sys.argv[1], "rb")); seq = d.roots[0]
S = {}
for cb in seq.controlled_blocks:
    nm = cb.get_node_name().decode(); ip = cb.interpolator
    if ip and type(ip).__name__ in ("NiTransformInterpolator", "NiBSplineCompTransformInterpolator") and (nm in PARENT or nm == "Bip01") and nm not in S: S[nm] = sampler(ip)
dur = seq.stop_time - seq.start_time; nf = max(2, round(dur*FPS) + 1)
frames = []
for fi in range(nf):
    t = seq.start_time + dur*fi/(nf-1); W = {}
    def world(n):
        if n in W: return W[n]
        p, q = S[n](t) if n in S else ((0, 0, 0), (1, 0, 0, 0))
        if any(abs(c) > 1e30 for c in p): p = (0, 0, 0)
        if any(abs(c) > 1e30 for c in q): q = (1, 0, 0, 0)
        par = PARENT.get(n)
        if par:
            pp, pq = world(par); p = tuple(a+b for a, b in zip(pp, qrot(pq, p))); q = qmul(pq, q)
        W[n] = (p, q); return W[n]
    frames.append({n: [round(c, 4) for c in world(n)[0]] for n in PARENT if n in S})
json.dump({"name": seq.name.decode(), "fps": FPS, "duration": dur, "cycle": seq.cycle_type, "has": sorted(S), "frames": frames}, open(sys.argv[2], "w"))
print("OK", seq.name.decode(), nf, "frames", len(S), "bones")
