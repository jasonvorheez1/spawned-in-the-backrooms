"""T1 CAGES: the layered shells every garment is authored on, skinned to the body's own rig.
Port of the T1 cage (art/body-t1/cage.py, Medi 2026-10-09/10) that speaks ROLES and measured landmarks instead of one rig's
bone names, and scales every length by S. Every slot is a TUBE of rings along the body's chains (arm: shoulder u0 -> elbow u1
-> wrist u2 -> fingers u3+; leg: hip u0 -> knee u1 -> ankle u2; torso, pelvis, skirt u = height; foot u = y). Ring points are
ray hits on the skin pushed out by the slot's layer; quads that cut a bulge are pushed out until they clear it; weights come
from the skin triangle under each point. Tubes are cut into SEGMENTS that neighbouring variants share; a variant is a list of
segments (data/slots.json)."""
import bpy, bmesh, numpy as np, math, json, os, re
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SLOTDEF = json.load(open(os.path.join(HERE, '..', 'data', 'slots.json')))

def nrm(v):
    n = np.linalg.norm(v); return v / n if n > 1e-9 else v
def sm(x):
    x = min(max(x, 0), 1); return x * x * (3 - 2 * x)

def run(body, ZONES, DOC, a):
    V = body.V; T = body.T; VW = body.VW; NV = body.NV; VD = body.VK; TD = body.TK; VZ = body.vobj
    bvh = body.bvh; J = body.rig.J; L = body.L; S = body.S
    OFF = {k: v * (0.5 + 0.5 * S) for k, v in SLOTDEF['layers_m'].items()}   # layers are cloth thickness: half of it scales
    COL = SLOTDEF['colors']
    tor_fam = lambda n: n in ('hips', 'spine', 'neck', 'none') or n.startswith('clavicle')
    TORM = np.array([tor_fam(d) for d in VD])
    z_crotch, z_waist, z_underbust, z_armpit, z_neck = L['crotch'], L['waist'], L['underbust'], L['armpit'], L['neckBase']
    FWD = np.array([0, -1.0, 0]); UP = np.array([0, 0, 1.0]); X = np.array([1.0, 0, 0])
    SIDES = (('L', 1), ('R', -1))
    isarm = lambda s: (lambda n: n in (f'upperarm.{s}', f'forearm.{s}'))
    isleg = lambda s: (lambda n: n in (f'thigh.{s}', f'shin.{s}'))
    isfoot = lambda s: (lambda n: n in (f'foot.{s}', f'toe.{s}'))
    ispalm = lambda s: (lambda n: n == f'hand.{s}')
    # a finger tube accepts ANY skin of that hand: rigs weight thumbs to metacarpals and swap neighbour fingers (NB's R index
    # reads as finger3), and a ray from the finger's own axis meets that finger's skin first anyway (maxr is a finger's width)
    isfing = lambda s, k: (lambda n: n == f'hand.{s}' or (n.startswith('finger') and n.endswith('.' + s)))
    anyarm = lambda n: n.split('.')[0] in ('upperarm', 'forearm', 'hand') or n.startswith('finger')

    ZONE_NAMES = [False]   # True while a tube casts against T0 zone names instead of rig roles
    # a low-poly skin (the hero body: ~2.7 cm edges) aliases against the 2 cm ring spacing: ray hits jump facet to facet ring by
    # ring and the cage comes out pleated. Smooth such a body's rings longer along the tube; push-out puts back any skin it uncovers
    _TT = np.asarray(T); _e = np.linalg.norm(V[_TT[:, 0]] - V[_TT[:, 1]], axis=1)
    MED_EDGE = float(np.median(_e)); LP = int(min(4, max(0, round((MED_EDGE / S - 0.012) / 0.005))))
    print('BODYWORKS T1: median edge %.1f mm -> %d extra smoothing passes along tubes' % (MED_EDGE * 1000, LP))
    # ---------- ray machinery (unchanged from T1) ----------
    def cast(o, d, maxr, ok, hole=lambda n: False, inward=False):
        p = Vector(o); dv = Vector(d); left = maxr
        for _ in range(6):
            loc, n, ti, dist = bvh.ray_cast(p, dv, left)
            if loc is None: return ('miss',)
            good = (n.dot(dv) < 0) if inward else (n.dot(dv) > 0)
            if good:
                name = TD[ti] if not ZONE_NAMES[0] else body.TO[ti]
                if ok(name): return ('hit', np.array(loc), ti)
                if hole(name): return ('hole',)
                if not inward: return ('miss',)
            left -= dist + 1e-4; p = loc + dv * 1e-4
            if left <= 0: return ('miss',)
        return ('miss',)
    def frame(t, ref):
        r = ref - np.dot(ref, t) * t
        if np.linalg.norm(r) < 1e-3: r = np.array([0, 0, 1.0]) - t[2] * t
        r = nrm(r); return r, np.cross(t, r)
    def chain_samples(P, step, blend=0.04, u0=None, u1=None):
        step *= S; blend *= S
        segs = [(P[i], P[i + 1]) for i in range(len(P) - 1)]; out = []
        for i, (a_, b_) in enumerate(segs):
            Ln = np.linalg.norm(b_ - a_); n = max(2, int(math.ceil(Ln / step)))
            for k in range(n + (1 if i == len(segs) - 1 else 0)):
                f = k / n; u = i + f
                if (u0 is not None and u < u0 - 1e-6) or (u1 is not None and u > u1 + 1e-6): continue
                p = a_ + (b_ - a_) * f; t = nrm(b_ - a_); dJ = f * Ln
                if i > 0 and dJ < blend: tp = nrm(segs[i - 1][1] - segs[i - 1][0]); w = 0.5 + 0.5 * sm(dJ / blend); t = nrm(tp * (1 - w) + t * w)
                if i < len(segs) - 1 and (Ln - dJ) < blend: tn = nrm(segs[i + 1][1] - segs[i + 1][0]); w = 0.5 * (1 - sm((Ln - dJ) / blend)); t = nrm(t * (1 - w) + tn * w)
                out.append((u, p, t))
        def at(u):
            i = min(int(u), len(segs) - 1); f = u - i; a_, b_ = segs[i]; return (u, a_ + (b_ - a_) * f, nrm(b_ - a_))
        if u0 is not None and (not out or out[0][0] > u0 + 1e-6): out.insert(0, at(u0))
        if u1 is not None and (not out or out[-1][0] < u1 - 1e-6): out.append(at(u1))
        return out
    def recentre(p, t, step, ok, maxr):
        step *= S; maxr *= S
        d = V - p; along = d @ t; m = (np.abs(along) < step * 0.6) & (np.linalg.norm(d - np.outer(along, t), axis=1) < maxr)
        idx = [i for i in np.where(m)[0] if ok(VD[i])]
        if len(idx) < 12: return p
        c = V[idx].mean(0); return p + (c - p) - np.dot(c - p, t) * t

    class Tube:
        def __init__(s, name, slot, off, nth, color): s.name = name; s.slot = slot; s.off = off; s.nth = nth; s.color = color; s.rings = []; s.cap = None; s.own = None
        def ring(s, u, o, dirs, ok, hole=lambda n: False, maxr=0.25, inward=False):
            maxr *= S
            r = np.full(len(dirs), np.nan); tri = [-1] * len(dirs); kind = ['miss'] * len(dirs)
            for j, d in enumerate(dirs):
                h = cast(o + d * maxr, -d, maxr, ok, hole, True) if inward else cast(o, d, maxr, ok, hole)
                kind[j] = h[0]
                if h[0] == 'hit': r[j] = (maxr - np.linalg.norm(h[1] - (o + d * maxr))) if inward else np.linalg.norm(h[1] - o); tri[j] = h[2]
            s.rings.append(dict(u=u, o=np.array(o), dirs=np.array(dirs), r=r, tri=tri, kind=kind))
            s.own = s.own or ok
        def finish(s, smooth=1):
            if len(s.rings) < 2: raise SystemExit('BODYWORKS T1: tube %s found %d rings on this body' % (s.name, len(s.rings)))
            R = np.array([g['r'] for g in s.rings]); n = s.nth
            for i in range(len(R)):
                row = R[i]; ok = ~np.isnan(row)
                if ok.sum() >= max(3, n // 4):
                    idx = np.where(ok)[0]; xs = np.concatenate([idx - n, idx, idx + n]); ys = np.concatenate([row[idx]] * 3)
                    R[i] = np.interp(np.arange(n), xs, ys)
                else: R[i] = np.nan
            for j in range(n):
                col = R[:, j]; ok = ~np.isnan(col)
                if ok.any(): R[:, j] = np.interp(np.arange(len(col)), np.where(ok)[0], col[ok])
            if np.isnan(R).any(): raise SystemExit('BODYWORKS T1: tube %s has no skin under it (check the rig map: is this limb mapped?)' % s.name)
            for _ in range(smooth):
                R = 0.5 * R + 0.25 * (np.roll(R, 1, 1) + np.roll(R, -1, 1))
                if len(R) > 2: R[1:-1] = 0.6 * R[1:-1] + 0.2 * (R[:-2] + R[2:])
            s.R = R
            s.P = np.array([[g['o'] + g['dirs'][j] * (R[i, j] + s.off) for j in range(n)] for i, g in enumerate(s.rings)])
            s.S = np.array([[g['o'] + g['dirs'][j] * R[i, j] for j in range(n)] for i, g in enumerate(s.rings)])
            s.hole = np.array([[g['kind'][j] == 'hole' for j in range(n)] for g in s.rings])
            s.u = np.array([g['u'] for g in s.rings])
    TUBES = {}
    def add(t): TUBES[t.name] = t; return t
    def around(n, r, b):
        return [nrm(math.cos(2 * math.pi * j / n) * r + math.sin(2 * math.pi * j / n) * b) for j in range(n)]
    def zslab(z, half, xw, mask=None):
        m = (np.abs(V[:, 2] - z) < half * S) & (np.abs(V[:, 0]) < xw * S)
        if mask is not None: m &= mask
        return m

    # ---------- TOP: torso + yoke + sleeves ----------
    t = add(Tube('top_torso', 'top', OFF['top'], 40, COL['top']))
    okT = lambda n: tor_fam(n) or n.startswith('thigh')
    # ring centres from the slab's front/back extent, smoothed over height: a vertex MEAN jumps ring to ring on a low-poly
    # mesh (the hero body: 7k verts) and the radius smoothing then folds the tube into pleats
    zs_t = np.arange(z_crotch + 0.10 * S, z_armpit + 0.02 * S + 1e-6, 0.02 * S); ycs = []
    for z in zs_t:
        m = zslab(z, 0.015, 0.2, TORM); ycs.append(0.5 * (float(V[m][:, 1].min()) + float(V[m][:, 1].max())) if m.sum() > 10 else body.yc)
    ycs = np.array(ycs)
    for _ in range(3): ycs[1:-1] = 0.5 * ycs[1:-1] + 0.25 * (ycs[:-2] + ycs[2:])
    for z, yc in zip(zs_t, ycs):
        t.ring(float(z), np.array([0, float(yc), z]), around(40, FWD, X), okT, hole=anyarm, maxr=0.3)
    if __import__('os').environ.get('BW_DEBUG'):
        for g in t.rings:
            from collections import Counter
            rr = g['r']; print('DBG torso z %.3f yc %.3f %s rF %.3f rB %.3f rS %.3f' % (g['u'], g['o'][1], dict(Counter(g['kind'])), rr[0], rr[20], rr[10]))
    t.finish(2)
    # the yoke reads T0 ZONE names, not rig roles: an auto-rigger's Head weights spill onto the collarbones (Mixamo) and
    # would punch the yoke full of holes; the zones were already cut by shape where the weights were thin
    YOKEZ = ('upperchest', 'breast_l', 'breast_r', 'cleavage', 'chest', 'upperback', 'shoulder_l', 'shoulder_r', 'upperarm_l', 'upperarm_r')
    okY = lambda n: n in YOKEZ
    holeY = lambda n: n in ('neck', 'head')
    HX, HY = float(J['head'][0]), float(J['head'][1])
    sh = J['shoulder.L']; JX = float(abs(sh[0])); JZ = float(sh[2]); JY = float(sh[1])
    ma = zslab(z_armpit, 0.01, 9, TORM); yc0 = float(V[ma][:, 1].mean()); xw = float(np.percentile(np.abs(V[ma][:, 0]), 92)) - 0.02 * S
    NY = 40; yk = add(Tube('top_yoke', 'top', OFF['top'], NY, COL['top']))
    for x in np.arange(-(JX + 0.03 * S), JX + 0.03 * S + 1e-6, 0.012 * S):
        f = sm((abs(x) - xw) / max(JX - xw, 1e-3))
        o = np.array([x, yc0 + (JY - yc0) * f, z_armpit + (JZ - 0.03 * S - z_armpit) * f])
        dirs = [nrm(math.cos(math.pi * k / (NY - 1)) * FWD + math.sin(math.pi * k / (NY - 1)) * UP) for k in range(NY)]
        ZONE_NAMES[0] = True
        yk.ring(float(x), o, dirs, okY, hole=holeY, maxr=0.35, inward=True)
        ZONE_NAMES[0] = False
        g = yk.rings[-1]
        for k in range(NY):
            if g['kind'][k] != 'hit': g['kind'][k] = 'hole'; g['r'][k] = np.nan; continue
            q = o + g['dirs'][k] * g['r'][k]
            if q[2] < z_armpit - 0.004 * S or (q[2] > z_neck + 0.004 * S and math.hypot(q[0] - HX, q[1] - HY) < 0.075 * S): g['kind'][k] = 'hole'; g['r'][k] = np.nan
        if sum(1 for k in range(NY) if g['kind'][k] == 'hit') < NY // 3: yk.rings.pop()
    yk.own = okY; yk.zoned = True; yk.finish(2); yk.wrap = False
    for s, sg in SIDES:
        P = [J[f'shoulder.{s}'], J[f'elbow.{s}'], J[f'wrist.{s}']]
        a_ = add(Tube(f'top_sleeve_{s}', 'top', OFF['top'], 24, COL['top']))
        u0s = 0.0 * min(0.3, 0.11 * S * 0.3 / max(float(np.linalg.norm(np.array(P[1]) - np.array(P[0]))), 1e-6))   # the yoke owns the shoulder cap to 0.8 capR: the sleeve starts just inside it, never flared over the deltoid
        for u, p, tg in chain_samples(P, 0.025, u0=u0s, u1=2.0):
            r, b = frame(tg, FWD); o = recentre(p, tg, 0.025, isarm(s), 0.08)
            a_.ring(u, o, around(24, r, b), (lambda n, s=s: isarm(s)(n) or n.startswith('clavicle') or n in ('spine', 'none')) if u < 0.35 else isarm(s), maxr=0.12)   # near the joint the deltoid top is weighted to the clavicle: an arm-only ring left that skin bare behind the shoulder
        for g_ in a_.rings:   # the seam flares over the shirt's arm-hole edge: flush, a notch of skin showed behind the shoulder between them
            t_ = max(0.0, (g_['u'] - u0s) / 0.22)
            if t_ < 1: g_['r'] = np.asarray(g_['r'], float) * (1 + 0.10 * (1 - t_) ** 2)
        a_.finish(1)
    # ---------- GLOVES ----------
    HAND = {'L': 'shell', 'R': 'shell'}   # the hand itself is an offset shell of the three hand zones welded (below): fingers follow the skin, never the rig's finger bones
    for s, sg in SIDES:
        P = [J[f'shoulder.{s}'], J[f'elbow.{s}'], J[f'wrist.{s}']]
        c = add(Tube(f'gloves_cuff_{s}', 'gloves', OFF['gloves'], 24, COL['gloves']))
        for u, p, tg in chain_samples(P, 0.02, u0=1.12, u1=2.0):
            r, b = frame(tg, FWD); o = recentre(p, tg, 0.02, isarm(s), 0.08)
            c.ring(u, o, around(24, r, b), lambda n, s=s: isarm(s)(n) or ispalm(s)(n), maxr=0.1)
        c.finish(1)
    # ---------- LEGS ----------
    pv = add(Tube('legs_pelvis', 'legs', OFF['legs'], 40, COL['legs']))
    okL = lambda n: tor_fam(n) or n.startswith('thigh')
    for z in np.arange(z_crotch + 0.005 * S, z_waist + 0.06 * S + 1e-6, 0.015 * S):   # waistband over the hip bones: below the waist, the body's painted underwear showed above it
        m = zslab(z, 0.01, 0.25); yc = float(V[m][:, 1].mean()) if m.sum() > 10 else body.yc
        pv.ring(float(z), np.array([0, yc, z]), around(40, FWD, X), okL, hole=anyarm, maxr=0.3)
    pv.finish(1)
    LEGP = {}
    for s, sg in SIDES:
        Hh, Kk, A = J[f'hip.{s}'], J[f'knee.{s}'], J[f'ankle.{s}']
        u_top = float((Hh[2] - (z_crotch + 0.03 * S)) / (Hh[2] - Kk[2])); LEGP[s] = (Hh, Kk, A, u_top)   # the leg starts 3 cm inside the seat: started at the crotch, a slit of thigh showed between them
        lg = add(Tube(f'legs_leg_{s}', 'legs', OFF['legs'], 28, COL['legs']))
        okLeg = lambda n, s=s: isleg(s)(n) or n == 'hips'
        for u, p, tg in chain_samples([Hh, Kk, A], 0.025, u0=u_top, u1=1.94):
            r, b = frame(tg, FWD); o = recentre(p, tg, 0.025, isleg(s), 0.12)
            lg.ring(u, o, around(28, r, b), okLeg, maxr=0.16)
        lg.finish(1)
    # ---------- FEET ----------
    for s, sg in SIDES:
        Hh, Kk, A, _ = LEGP[s]
        shf = add(Tube(f'feet_shaft_{s}', 'feet', OFF['feet'], 28, COL['feet']))
        for u, p, tg in chain_samples([Hh, Kk, A], 0.025, u0=1.08, u1=2.0):
            r, b = frame(tg, FWD); o = recentre(p, tg, 0.025, isleg(s), 0.12)
            shf.ring(u, o, around(28, r, b), lambda n, s=s: isleg(s)(n) or isfoot(s)(n), maxr=0.14)
        shf.finish(1)
    # ---------- SKIRT ----------
    sk = add(Tube('skirt_bell', 'skirt', OFF['skirt'], 48, COL['skirt']))
    z_ankle = float((J['ankle.L'][2] + J['ankle.R'][2]) / 2)
    NOARM = np.array([not (z.startswith('upperarm') or z.startswith('forearm') or z.startswith('wrist') or z.startswith('palm') or z.startswith('fingers')) for z in VZ])
    NOARM &= np.array([sum(w for k, w in vw.items() if 'tail' in k.lower()) < 0.2 for vw in VW])   # the tail is no hip: a skirt hulled round it stands out like a lampshade
    for z in np.arange(z_waist + 0.06 * S, z_ankle + 0.02 * S - 1e-6, -0.03 * S):
        rel = V - np.array([0, body.yc, z]); m = NOARM & (np.abs(rel[:, 2]) < 0.012 * S); Rl = rel[m]; Rl[:, 2] = 0; dist = np.linalg.norm(Rl, axis=1)
        dirs = around(48, FWD, X); r = np.full(48, np.nan)
        if len(Rl) > 20:   # support function of the slab: the convex hull a cloth wraps, no notches between the legs
            r = (Rl @ np.array(dirs).T).max(0)
        sk.rings.append(dict(u=float(z), o=np.array([0, body.yc, z]), dirs=np.array(dirs), r=r, tri=[-1] * 48, kind=['hit' if not np.isnan(x) else 'miss' for x in r]))
    sk.own = lambda n: True
    sk.finish(0)
    R = sk.R.copy()
    for i in range(1, len(R)): R[i] = np.maximum(R[i], R[i - 1])
    # an A-line flare: below the widest hip ring the hem grows ~0.22 m per metre of drop, so it hangs like cloth, not a drum
    _zs = np.array([rg['u'] for rg in sk.rings]); _hip = int(np.argmax(np.nanmean(sk.R, 1)))
    for i in range(_hip + 1, len(R)): R[i] = R[i] + 0.10 * (_zs[_hip] - _zs[i])
    for _ in range(6): R = 0.5 * R + 0.25 * (np.roll(R, 1, 1) + np.roll(R, -1, 1))   # several passes: one left a faceted, pleat-like silhouette
    for _ in range(2): R[1:-1] = 0.5 * R[1:-1] + 0.25 * (R[:-2] + R[2:])
    dz = np.array([g['o'][2] for g in sk.rings]); R += ((z_waist - dz) * 0.02)[:, None]
    sk.R = R; sk.P = np.array([[g['o'] + g['dirs'][j] * (R[i, j] + sk.off) for j in range(48)] for i, g in enumerate(sk.rings)]); sk.S = sk.P
    sk.hole = np.zeros_like(sk.hole)
    # the tail's exit: where tail skin pokes out past the bell, open the cloth (one ring and column of margin) so the tail
    # passes through a clean hole instead of clipping through the fabric
    TAILV = np.array([sum(w for k, w in vw.items() if 'tail' in k.lower()) >= 0.6 for vw in VW])   # the tail itself, not the rump it blends into
    if TAILV.any():
        TV = V[TAILV]
        for i, g in enumerate(sk.rings):
            rel = TV - g['o']; m = np.abs(rel[:, 2]) < 0.02 * S
            if not m.any(): continue
            Rl = rel[m].copy(); Rl[:, 2] = 0; Lt = np.linalg.norm(Rl, axis=1) + 1e-9
            for j, d in enumerate(g['dirs']):
                cone = (Rl @ d) / Lt > 0.985
                if cone.any() and Lt[cone].max() > R[i, j] + 0.004 * S: sk.hole[i, j] = True
        # keep only where the tail leaves the body: per column, the first holed ring from the waist and the one under it;
        # a tail that hangs down behind the cloth below that is covered, not cut round
        for j in range(sk.hole.shape[1]):
            rows = np.where(sk.hole[:, j])[0]
            if len(rows): sk.hole[:, j] = False; sk.hole[rows[0]:rows[0] + 2, j] = True
        h = sk.hole.copy()
        for dj in (-1, 1): h |= np.roll(sk.hole, dj, 1)   # one column of margin each side, no extra rows
        sk.hole = h
        print('BODYWORKS T1 skirt tail hole cells', int(sk.hole.sum()))
    # ---------- NECK ----------
    okN = lambda n: not anyarm(n)
    def wrap_ring(tb, u, c, dirs, R0, nrm_=None, band=0.005):
        nv = nrm_ if nrm_ is not None else UP
        rel = V - c; h = rel @ nv; m = (np.abs(h) < band * S); Rl0 = rel[m] - np.outer(h[m], nv); dist0 = np.linalg.norm(Rl0, axis=1)
        need = max(3, len(dirs) // 4)
        for grow in (1.0, 1.25, 1.55, 1.9):   # a thick neck (hero builds) sits outside the slim default radius: widen until the ring finds its skin
            keep = dist0 < R0 * grow * S; Rl = Rl0[keep]; dist = dist0[keep]
            r = np.full(len(dirs), np.nan); kind = ['miss'] * len(dirs)
            for k, d in enumerate(dirs):
                cs = (Rl @ d) / np.maximum(dist, 1e-9); w = cs > math.cos(math.pi / len(dirs) * 1.2)
                if w.any(): r[k] = float(dist[w].max()); kind[k] = 'hit'
            if (~np.isnan(r)).sum() >= need: break
        if grow > 1.0: print('BODYWORKS T1: %s ring widened x%.2f to reach a thick neck' % (tb.name, grow))
        tb.rings.append(dict(u=u, o=np.array(c), dirs=np.array(dirs), r=r, tri=[-1] * len(dirs), kind=kind))
    NA = J['neckBase']; nyc = float(NA[1])
    nb_ = add(Tube('neck_band', 'neck', OFF['neck'], 28, COL['neck'])); nb_.own = okN
    zs_ = np.linspace(z_neck + 0.018 * S, float(J['head'][2]) - 0.012 * S, 7)
    for k_, z in enumerate(zs_):
        mm_ = (np.abs(V[:, 2] - z) < 0.004 * S) & (np.abs(V[:, 0]) < 0.012 * S) & (np.abs(V[:, 1] - nyc) < 0.1 * S)
        cy = 0.5 * (V[mm_][:, 1].min() + V[mm_][:, 1].max()) if mm_.sum() > 1 else nyc
        # cast from the neck's own axis onto the T0 NECK zone (cut by shape, so thin auto-rig weights don't matter) and
        # keep the outermost hit: a fixed radius sank into the hero's 11 cm neck and flared onto his traps
        ZONE_NAMES[0] = True
        nb_.ring(float(k_) / (len(zs_) - 1), np.array([0.0, cy, z]), around(28, X, FWD), lambda n: n in ('neck', 'head'), maxr=0.16)
        ZONE_NAMES[0] = False
        if (~np.isnan(nb_.rings[-1]['r'])).sum() < 7:
            nb_.rings.pop(); wrap_ring(nb_, float(k_) / (len(zs_) - 1), np.array([0.0, cy, z]), around(28, X, FWD), 0.068)
    nb_.finish(1)
    tl = math.radians(30); nl = nrm(UP * math.cos(tl) + FWD * math.sin(tl)); fl = nrm(FWD - np.dot(FWD, nl) * nl); sl = np.cross(nl, fl)
    lc = np.array([0.0, nyc - 0.004 * S, z_neck + 0.004 * S])
    la = add(Tube('neck_lace', 'neck', OFF['neck'] * 0.6, 40, COL['neck'])); la.own = okN
    for k, dd in enumerate(np.arange(-0.006, 0.0061, 0.003)):
        ZONE_NAMES[0] = True   # the lace lies where the neck meets the collar/trap skin, whatever that skin is called
        la.ring(float(k), lc + nl * dd * S, around(40, sl, fl), lambda n: n in ('neck', 'upperchest', 'cleavage', 'chest', 'breast_l', 'breast_r', 'upperback', 'shoulder_l', 'shoulder_r'), maxr=0.2)
        ZONE_NAMES[0] = False
        if (~np.isnan(la.rings[-1]['r'])).sum() < 10:   # zones unreachable from here (a dense multi-shell body): old fixed wrap
            la.rings.pop(); wrap_ring(la, float(k), lc + nl * dd * S, around(40, sl, fl), 0.085, nrm_=nl, band=0.004)
    la.finish(1)
    # ---------- PUSH-OUT ----------
    def pushout(tb, iters=24, ns=4):
        n = tb.nth; P = tb.P; want = tb.off * 0.85; NR = len(tb.rings); own = tb.own; P0 = P.copy(); CAPM = 0.04 * S; it = 0; worst = 0
        for it in range(iters):
            acc = np.zeros(P.shape[:2]); accv = np.zeros(P.shape); worst = 0.0
            for i in range(NR - 1):
                for j in range(n):
                    if tb.hole[i, j] or tb.hole[i + 1, j] or tb.hole[i, (j + 1) % n] or tb.hole[i + 1, (j + 1) % n]: continue
                    if not getattr(tb, 'wrap', True) and j == n - 1: continue
                    c = [(i, j), (i, (j + 1) % n), (i + 1, (j + 1) % n), (i + 1, j)]
                    for a2 in range(ns + 1):
                        for b2 in range(ns + 1):
                            u = a2 / ns; v = b2 / ns; w = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v]
                            p = sum(wk * P[ck] for wk, ck in zip(w, c))
                            loc, nn, ti, _ = bvh.find_nearest(Vector(p), 0.06 * S)
                            if loc is None or not own(body.TO[ti] if getattr(tb, 'zoned', False) else TD[ti]): continue
                            d = want - (Vector(p) - loc).dot(nn)
                            if d > 1e-4:
                                worst = max(worst, d)
                                for wk, ck in zip(w, c):
                                    if wk > 0.05:
                                        m_ = d * min(1.0, wk * 2.2)
                                        if m_ > acc[ck]: acc[ck] = m_; accv[ck] = np.array(nn) * m_
            if worst < 2e-4: break
            P = P + accv * 0.9
            mv = P - P0; Ln = np.linalg.norm(mv, axis=2); over = Ln > CAPM
            P[over] = P0[over] + mv[over] * (CAPM / Ln[over])[:, None]
        tb.P = P; tb.pushWorst = worst
    for nm, tb in TUBES.items():
        if tb.slot in ('top', 'legs', 'feet') or nm.startswith('gloves_cuff'): pushout(tb)
    # ---------- SEGMENTS ----------
    SEG = {}
    def seg(name, tube, lo, hi, mask=None):
        if tube not in TUBES: return
        tb = TUBES[tube]; near = lambda c: int(np.argmin(np.abs(tb.u - c)))
        a_, b_ = sorted((near(max(lo, tb.u.min())), near(min(hi, tb.u.max()))))
        if lo <= tb.u.min() + 1e-6 or lo < -5: a_ = min(a_, int(np.argmin(tb.u)))
        if hi >= tb.u.max() - 1e-6 or hi > 5: b_ = max(b_, int(np.argmax(tb.u)))
        a_, b_ = sorted((a_, b_))
        if b_ - a_ < 1: print('BODYWORKS T1 WARN empty segment', name, tube); return
        SEG.setdefault(name, []).append((tb, a_, b_, mask))
    BIG = 99
    seg('top_midriff', 'top_torso', -BIG, z_underbust + 0.035 * S)   # top_chest is a zone shell (below): a tube can't wrap the top of a bust
    # top_yoke: an offset shell of the upper-chest, upper-back and shoulder zones (below), not the old x-swept tube that left
    # gaps at the collarbone and the sleeve seam on every body tried
    seg('neck_collar', 'neck_band', -9, 0.5); seg('neck_choker', 'neck_band', 0.5, 99); seg('neck_lace', 'neck_lace', -9, 99)
    H = SLOTDEF['hems_u']
    for s in 'LR':
        seg('top_sleeve_short', 'top_sleeve_' + s, 0.0, H['sleeve_short']); seg('top_sleeve_long', 'top_sleeve_' + s, H['sleeve_short'], 2.0)
        seg('gloves_cuff_short', 'gloves_cuff_' + s, H['glove_short'], 2.0); seg('gloves_cuff_long', 'gloves_cuff_' + s, 1.12, H['glove_short'])
        ut = LEGP[s][3]
        seg('legs_short', 'legs_leg_' + s, ut, H['shorts']); seg('legs_knee', 'legs_leg_' + s, H['shorts'], H['knee']); seg('legs_long', 'legs_leg_' + s, H['knee'], 1.94)
        seg('feet_boot', 'feet_shaft_' + s, H['boot'], 2.0); seg('feet_tall', 'feet_shaft_' + s, 1.08, H['boot'])
    seg('legs_seat', 'legs_pelvis', -BIG, BIG)
    hz = (J['hip.L'][2] + J['hip.R'][2]) / 2; kz = (J['knee.L'][2] + J['knee.R'][2]) / 2
    z_mini = float(hz * 0.45 + kz * 0.55); z_knee = float(kz - 0.04 * S)
    seg('skirt_mini', 'skirt_bell', z_mini, BIG); seg('skirt_knee', 'skirt_bell', z_knee, z_mini); seg('skirt_long', 'skirt_bell', -BIG, z_knee)
    VARIANTS = {sl_: {vn: [sg for sg in segs if sg in SEG] for vn, segs in vs.items()} for sl_, vs in SLOTDEF['variants'].items()}
    # ---------- weights ----------
    SKB = [b.name for b in body.arm.data.bones if 'skirt' in b.name.lower()]
    AW = np.array(body.arm.matrix_world)
    SK_A = np.array([(AW @ np.append(np.array(body.arm.data.bones[n].head_local), 1))[:3] for n in SKB]) if SKB else None
    SK_B = np.array([(AW @ np.append(np.array(body.arm.data.bones[n].tail_local), 1))[:3] for n in SKB]) if SKB else None
    def w_body(pt, tri=-1):
        if tri < 0:
            loc, n, tri, d = bvh.find_nearest(Vector(pt))
            if tri is None: return {}
            pt = np.array(loc)
        a_, b_, c_ = V[T[tri]]; v0 = b_ - a_; v1 = c_ - a_; v2 = pt - a_
        d00 = v0 @ v0; d01 = v0 @ v1; d11 = v1 @ v1; d20 = v2 @ v0; d21 = v2 @ v1; den = d00 * d11 - d01 * d01 or 1e-12
        l1 = (d11 * d20 - d01 * d21) / den; l2 = (d00 * d21 - d01 * d20) / den
        Lb = np.clip([1 - l1 - l2, l1, l2], 0, 1); Lb /= Lb.sum() or 1
        w = {}
        for i, l in zip(T[tri], Lb):
            for k, x in VW[i].items(): w[k] = w.get(k, 0) + x * l
        return w
    HIPB = body.rig.M['hips']; THB = {s: body.rig.M[f'thigh.{s}'] for s in 'LR'}; SHB = {s: body.rig.M[f'shin.{s}'] for s in 'LR'}
    def w_skirt(pt):
        if SKB:
            ab = SK_B - SK_A; t_ = np.clip(((pt - SK_A) * ab).sum(1) / (ab * ab).sum(1), 0, 1); q = SK_A + ab * t_[:, None]
            d = np.linalg.norm(q - pt, axis=1); o = np.argsort(d)[:4]; w = 1 / (d[o] ** 6 + 1e-12); w /= w.sum()
            return {SKB[i]: float(x) for i, x in zip(o, w)}
        # no skirt bones: the bell rides the hips and leans toward each thigh by how far it hangs and how far to that side
        drop = sm((z_waist - pt[2]) / max(z_waist - kz, 1e-3)); lat = sm(abs(pt[0]) / (0.12 * S))
        s = 'L' if pt[0] > 0 else 'R'; th = 0.45 * drop * (0.4 + 0.6 * lat)
        return {HIPB: 1 - th, THB[s]: th}
    # ---------- meshes ----------
    def build_seg(name):
        verts = []; faces = []; wts = []; col = None
        for tb, i0, i1, mask in SEG[name]:
            col = tb.color; n = tb.nth; idx = {}
            dz = [g['dirs'][:, 2] for g in tb.rings]
            def useq(i, j):
                if not getattr(tb, 'wrap', True) and j == n - 1: return False
                if tb.hole[i, j] or tb.hole[i + 1, j] or tb.hole[i, (j + 1) % n] or tb.hole[i + 1, (j + 1) % n]: return False
                if mask:
                    zz = (dz[i][j] + dz[i][(j + 1) % n]) / 2
                    return (zz < -0.25) if mask == 'down' else (zz >= -0.25)
                return True
            Q = [(i, j) for i in range(i0, i1) for j in range(n) if useq(i, j)]
            def vid(i, j):
                if (i, j) not in idx:
                    idx[(i, j)] = len(verts); verts.append(tuple(tb.P[i, j]))
                    if tb.slot == 'skirt': wts.append(w_skirt(tb.P[i, j]))
                    elif tb.slot == 'neck':
                        w = w_body(tb.S[i, j], tb.rings[i]['tri'][j]); w = {k: x for k, x in w.items() if body.rig.key(k) in ('neck', 'spine') or body.rig.key(k).startswith('clavicle')}
                        wts.append(w or {body.rig.M['neck'] or body.rig.M['head']: 1.0})
                    else: wts.append(w_body(tb.S[i, j], tb.rings[i]['tri'][j]))
                return idx[(i, j)]
            for i, j in Q: faces.append((vid(i, j), vid(i, (j + 1) % n), vid(i + 1, (j + 1) % n), vid(i + 1, j)))
            if tb.cap == 'both' and i0 == 0 and mask != 'down':
                g = tb.rings[0]; tip = g['o'] + nrm(g['o'] - tb.rings[1]['o']) * (np.nanmean(tb.R[0]) * 0.6 + tb.off)
                ti = len(verts); verts.append(tuple(tip)); wts.append(w_body(tb.S[0, 0], -1))
                for j in range(n): faces.append((vid(0, (j + 1) % n), vid(0, j), ti))
            if tb.cap and i1 == len(tb.rings) - 1 and mask != 'down':
                g = tb.rings[-1]; tip = g['o'] + nrm(g['o'] - tb.rings[-2]['o']) * (np.nanmean(tb.R[-1]) + tb.off)
                ti = len(verts); verts.append(tuple(tip)); wts.append(w_body(tb.S[-1, 0], -1))
                for j in range(n): faces.append((vid(i1, j), vid(i1, (j + 1) % n), ti))
        me = bpy.data.meshes.new('cage_' + name); me.from_pydata(verts, [], faces); me.update()
        ob = bpy.data.objects.new('cage_' + name, me); bpy.context.scene.collection.objects.link(ob)
        for k, w in enumerate(wts):
            tot = sum(w.values()) or 1
            for bn, x in sorted(w.items(), key=lambda kv: -kv[1])[:4]:
                g = ob.vertex_groups.get(bn) or ob.vertex_groups.new(name=bn); g.add([k], x / tot, 'REPLACE')
        return ob, col
    CAGE = {name: build_seg(name) for name in SEG}
    # SKIN SHELLS: the glove hand and the shoe are the T0 zones themselves, decimated and pushed out along their normals: every
    # finger, thumb, knuckle and toe is covered whatever the rig's bones say (NB's thumb bones sit 2-5 cm off its skin); the
    # skin's own weights ride along. Shoe faces split by their normal: down-facing = sole, the rest = upper.
    def shell(zns, off, name, split=None, zmin=None, keepf=None, cuts=None):
        parts = []
        for zn in zns:
            if isinstance(zn, tuple):   # several zones as one skin (the hand: wrist + palm + fingers), welded before the decimate so no seam opens
                srcs = [ZONES[z] for z in zn if ZONES.get(z) is not None]
                if not srcs: continue
                cps = []
                for z_, src in [(z, ZONES[z]) for z in zn if ZONES.get(z) is not None]:
                    c_ = src.copy(); c_.data = src.data.copy(); bpy.context.scene.collection.objects.link(c_); cps.append(c_)
                    if keepf and z_ in keepf and z_ != zn[0]:   # trim a member zone BEFORE the weld (the head's neck band): its border welds to the torso's, no tear
                        import bmesh as _bm2
                        b2 = _bm2.new(); b2.from_mesh(c_.data); MW2 = c_.matrix_world
                        _bm2.ops.delete(b2, geom=[f for f in b2.faces if not keepf[z_](np.array(MW2 @ f.calc_center_median()))], context='FACES')
                        b2.to_mesh(c_.data); b2.free(); c_.data.update()
                bpy.ops.object.select_all(action='DESELECT')
                for c_ in cps: c_.select_set(True)
                bpy.context.view_layer.objects.active = cps[0]
                if len(cps) > 1: bpy.ops.object.join()
                ob = bpy.context.view_layer.objects.active
                import bmesh as _bm
                b_ = _bm.new(); b_.from_mesh(ob.data); _bm.ops.remove_doubles(b_, verts=b_.verts, dist=1e-5); b_.to_mesh(ob.data); b_.free()
                zn = zn[0]
            else:
                src = ZONES.get(zn)
                if src is None: continue
                ob = src.copy(); ob.data = src.data.copy(); bpy.context.scene.collection.objects.link(ob)
            for m in list(ob.modifiers): ob.modifiers.remove(m)
            if ob.data.shape_keys:   # a body with morphs (the heavy-set): bake the CURRENT mix into the shell, never the slim basis
                ob.shape_key_add(name='bw_mix', from_mix=True)
                mix = [tuple(k.co) for k in ob.data.shape_keys.key_blocks['bw_mix'].data]
                ob.shape_key_clear()
                for v, c in zip(ob.data.vertices, mix): v.co = c
            mw = ob.matrix_world.copy(); ob.parent = None; ob.matrix_world = mw
            dec = ob.modifiers.new('dec', 'DECIMATE'); dec.ratio = min(1.0, 2500 / max(len(ob.data.polygons), 1))
            bpy.context.view_layer.objects.active = ob; bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
            bpy.ops.object.modifier_apply(modifier='dec'); ob.data.materials.clear(); me = ob.data; me.update()
            d = off / max(ob.matrix_world.to_scale()[0], 1e-6)
            nv = [v.normal.copy() for v in me.vertices]
            for v, n_ in zip(me.vertices, nv): v.co += n_ * d
            if zmin is not None or (keepf and zn in keepf):   # keep only faces above zmin / passing that zone's test (world face centre)
                import bmesh
                bm = bmesh.new(); bm.from_mesh(me); MW = ob.matrix_world
                bmesh.ops.delete(bm, geom=[f for f in bm.faces if ((zmin is not None and (MW @ f.calc_center_median()).z < zmin) or (keepf and zn in keepf and not keepf[zn](np.array(MW @ f.calc_center_median()))))], context='FACES')
                bm.to_mesh(me); bm.free(); me.update()
            if cuts and zn in cuts:   # a level plane through the welded skin: a straight hem, never the zone's own stair-stepped border
                import bmesh
                for cut_ in cuts[zn]:
                    if len(cut_) == 3: pco, pno, keep_below = cut_   # any plane: (point, normal, keep the side the normal points away from)
                    else: zc, keep_below = cut_; pco, pno = (0.0, 0.0, zc), (0.0, 0.0, 1.0)
                    MI = ob.matrix_world.inverted(); co = MI @ Vector(tuple(map(float, pco))); no = (MI.to_3x3() @ Vector(tuple(map(float, pno)))).normalized()
                    bm = bmesh.new(); bm.from_mesh(me)
                    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=keep_below, clear_inner=not keep_below)
                    bm.to_mesh(me); bm.free(); me.update()
            parts.append(ob)
        if not parts: return {}
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join(); ob = bpy.context.active_object
        if not split: ob.name = ob.data.name = 'cage_' + name; return {name: ob}
        import bmesh
        out = {}
        N3 = ob.matrix_world.to_3x3()
        for nm_, keep in split.items():
            o2 = ob.copy(); o2.data = ob.data.copy(); bpy.context.scene.collection.objects.link(o2); o2.name = o2.data.name = 'cage_' + nm_
            bm = bmesh.new(); bm.from_mesh(o2.data)
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep((N3 @ f.normal).normalized().z)], context='FACES')
            bm.to_mesh(o2.data); bm.free(); out[nm_] = o2
        bpy.data.objects.remove(ob); return out
    for nm_, ob in shell([('wrist_l', 'palm_l', 'fingers_l'), ('wrist_r', 'palm_r', 'fingers_r')], OFF['gloves'] * 0.6, 'gloves_hand').items(): CAGE[nm_] = (ob, COL['gloves']); SEG[nm_] = []
    TUBES.pop('top_yoke', None); CAGE.pop('top_yoke', None)
    # the sleeve tube starts at the shoulder joint; on a body whose deltoid sits outside that joint and outside the shoulder
    # zone (heavy-set) the cap showed between yoke and sleeve, so the yoke also takes the upper arm skin near the joint
    capR = 0.11 * S
    near_sh = {f'upperarm_{s.lower()}': (lambda p, s=s: float(np.linalg.norm(p - np.array(J[f'shoulder.{s}']))) < capR) for s in 'LR'}
    # the cap ends on a plane square to the arm, not the sphere's stair-stepped rim (that rim read as a ragged neckline)
    def _cap(s):
        sh, el = np.array(J[f'shoulder.{s}'], float), np.array(J[f'elbow.{s}'], float); ax = (el - sh) / max(np.linalg.norm(el - sh), 1e-6)
        return [(tuple(sh + ax * capR * 0.8), tuple(ax), True)]
    sleeve_cap = {f'upperarm_{s.lower()}': _cap(s) for s in 'LR'}
    # the collar line sits where the neck skin starts, not at the neck joint: on a short-necked body the joint is below the
    # collarbone and a cut there bared the whole upper chest
    _nk = ZONES.get('neck'); z_collar = z_neck + 0.006 * S
    if _nk is not None and len(_nk.data.vertices):
        _zs = [(_nk.matrix_world @ v.co).z for v in _nk.data.vertices]
        z_collar = max(z_collar, min(_zs) + 0.55 * (max(_zs) - min(_zs)))   # a crew collar part-way up the neck: the shoulder tops rise to the neck, a lower level cut bared them
    near_sh = {k: (lambda p, f=f: True) for k, f in near_sh.items()}   # the plane does the trimming now
    # a mock collar: the level cut sits just over the highest shoulder skin, so the traps (which rise above the neck base on a short neck) stay covered;
    # the neck zone's own border was a stair-stepped, gap-toothed neckline
    _shz = [(o.matrix_world @ v.co).z for k in ('shoulder_l', 'shoulder_r') if ZONES.get(k) is not None for o in [ZONES[k]] for v in o.data.vertices]
    z_mock = max([z_collar] + [z + 0.004 * S for z in _shz])
    # the collar tilts up toward the back (+Y): the nape skin sits higher than the throat, a level cut bared a strip behind the neck
    _cy = float(np.mean([(ZONES['neck'].matrix_world @ v.co).y for v in ZONES['neck'].data.vertices])) if ZONES.get('neck') is not None else 0.0
    collar_cut = ((0.0, _cy, z_mock), (0.0, -0.45, 1.0), True)
    collar_cap = (z_mock + 0.01 * S, True)   # one level collar 1 cm over the shoulders; a cut tilted up to the nape climbed the back of the head (fit27-28)   # one level collar 1 cm over the shoulders: the tilted cut dipped at the front and bared the shoulder tops
    # ONE welded shell, collar to hem: the yoke and chest as two shells met on stair-stepped zone borders at the same offset and tore into slivers there
    _ZT = ('upperchest', 'shoulder_l', 'shoulder_r', 'neck', 'head', 'breast_l', 'breast_r', 'cleavage', 'upperback', 'chest', 'belly', 'side_l', 'side_r', 'armpit_front_l', 'armpit_front_r', 'armpit_back_l', 'armpit_back_r', 'upperarm_l', 'upperarm_r')
    # the head zone spills down onto the neck base (472 verts under the collar on the cute body): it pokes through as skin teeth unless the top takes that band too
    for nm_, ob in shell([_ZT], OFF['top'], 'top_chest', keepf={'head': lambda p: p[2] < z_mock + 0.012 * S and math.hypot(p[0], p[1] - _cy) < 0.115 * S}, cuts={'upperchest': [collar_cap, (z_underbust - 0.07 * S, False)] + sleeve_cap['upperarm_l'] + sleeve_cap['upperarm_r']}).items():
        CAGE[nm_] = (ob, COL['top']); SEG[nm_] = []
        if nm_ == 'top_chest':   # the neck _nkBand welds four zones whose offsets disagree: a dent stood in the nape. Relax that _nkBand, then hold it off the skin
            import bmesh as _bm3
            from mathutils.bvhtree import BVHTree as _BVH
            _nkMW = ob.matrix_world; _nkMI = _nkMW.inverted()
            _nkB = _bm3.new(); _nkB.from_mesh(ob.data)
            _nkBand = [_nkV for _nkV in _nkB.verts if (_nkMW @ _nkV.co).z > z_mock - 0.05 * S and not _nkV.is_boundary]
            for _ in range(6): _bm3.ops.smooth_vert(_nkB, verts=_nkBand, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            _nkSk = [ZONES[z] for z in ('neck', 'upperchest', 'upperback', 'shoulder_l', 'shoulder_r', 'head') if ZONES.get(z) is not None]
            _nkTr = []
            for _nkZo in _nkSk:
                _nkDg = bpy.context.evaluated_depsgraph_get(); _nkBz = _bm3.new(); _nkBz.from_mesh(_nkZo.data); _nkBz.transform(_nkZo.matrix_world); _nkTr.append(_BVH.FromBMesh(_nkBz)); _nkBz.free()
            _nkGap = OFF['top'] * 0.8
            _nkAll = [_nkV for _nkV in _nkB.verts if (_nkMW @ _nkV.co).z > z_mock - 0.05 * S]   # the open collar edge too, or the nape skin pokes over it
            for _nkV in _nkAll:
                _nkW = _nkMW @ _nkV.co; _nkBest = None
                for _nkT in _nkTr:
                    _nkHit = _nkT.find_nearest(_nkW)
                    if _nkHit[0] is not None and (_nkBest is None or _nkHit[3] < _nkBest[3]): _nkBest = _nkHit
                if _nkBest is None: continue
                _nkLoc, _nkN, _, _nkD = _nkBest
                _nkSide = (_nkW - _nkLoc).dot(_nkN)
                if _nkSide < _nkGap: _nkV.co = _nkMI @ (_nkLoc + _nkN.normalized() * _nkGap)
            # a short lip up from the collar edge, held off the skin: the nape rose over the level edge as a sliver of skin
            _nkE = [e for e in _nkB.edges if e.is_boundary and min((_nkMW @ x.co).z for x in e.verts) > z_mock - 0.01 * S]
            if _nkE:
                _nkX = _bm3.ops.extrude_edge_only(_nkB, edges=_nkE)
                _nkNV = [g for g in _nkX['geom'] if isinstance(g, _bm3.types.BMVert)]
                for _nkV in _nkNV:
                    _nkW = _nkMW @ _nkV.co; _nkW.z += 0.012 * S; _nkBest = None
                    for _nkT in _nkTr:
                        _nkHit = _nkT.find_nearest(_nkW)
                        if _nkHit[0] is not None and (_nkBest is None or _nkHit[3] < _nkBest[3]): _nkBest = _nkHit
                    if _nkBest is not None:
                        _nkLoc, _nkN, _, _nkD = _nkBest
                        if (_nkW - _nkLoc).dot(_nkN) < _nkGap: _nkW = _nkLoc + _nkN.normalized() * _nkGap
                    _nkV.co = _nkMI @ _nkW
            _nkB.to_mesh(ob.data); _nkB.free(); ob.data.update()
    for nm_, ob in shell(['foot_l', 'foot_r'], OFF['feet'], 'feet', {'feet_sole': lambda z: z < -0.5, 'feet_upper': lambda z: z >= -0.5}).items():
        CAGE[nm_] = (ob, COL['feet']); SEG[nm_] = []
    VARIANTS = {sl_: {vn: [sg for sg in segs if sg in CAGE] for vn, segs in vs.items()} for sl_, vs in SLOTDEF['variants'].items()}
    # skin each cage to the rig (parent without moving)
    for name, (ob, col) in CAGE.items():
        mw = ob.matrix_world.copy(); ob.parent = body.arm; ob.matrix_world = mw
        am = ob.modifiers.new('Armature', 'ARMATURE'); am.object = body.arm
        mat = bpy.data.materials.new('cage_' + name.split('_')[0]); mat.use_nodes = True
        h = col.lstrip('#'); rgb = tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        bs = mat.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = (*rgb, 1)
        bs.inputs['Emission Color'].default_value = (*rgb, 1); bs.inputs['Emission Strength'].default_value = 1.5
        ob.data.materials.append(mat)
    report = {nm: {'rings': len(tb.rings), 'holes': int(tb.hole.sum()), 'pushWorst_mm': round(getattr(tb, 'pushWorst', 0) * 1000, 2)} for nm, tb in TUBES.items()}
    print('BODYWORKS T1: %d tubes, %d segments' % (len(TUBES), len(CAGE)))
    for nm, r in report.items(): print('   ', nm.ljust(18), r)
    DOC['t1'] = {'hands': HAND, 'layers_m': OFF, 'landmarks': dict(L, mini=z_mini, kneeHem=z_knee), 'tubes': report,
                 'tubeU': {tb.name: {'slot': tb.slot, 'around': tb.nth, 'u': [round(float(x), 4) for x in tb.u]} for tb in TUBES.values()},
                 'segments': {n: {'part': 'cage_' + n, 'tubes': [tb.name for tb, _, _, _ in SEG[n]] or ['hand zones, offset shell']} for n in SEG}}
    return {'cage': CAGE, 'variants': VARIANTS, 'tubes': TUBES, 'seg': SEG}
