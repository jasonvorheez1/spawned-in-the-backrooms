# python -I tailfix.py <sex> <body_dump.json> <body_edits.json (in/out)>
# The cat tail (one tube on Body#0, bones Tail1-3; type keys Tail_Fluffy/Bob/Puff/Whip/Curl):
#  - the root, crumpled where the tube meets the seat, is relaxed (Taubin, no shrink) on the basis and on every tail key;
#  - Tail_Bob (a crumpled lump), Tail_Puff (a flat crinkled fan) and Tail_Curl (a ring through itself, against the seat) are rebuilt
#    from the tube's own coordinates (arc length, angle round, radius): a round stub, a full pom, an open spiral clear of itself and the body.
import sys, json, math
import numpy as np
from scipy.spatial import cKDTree
SEX, DUMP, ED = sys.argv[1], sys.argv[2], sys.argv[3]
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
d = json.load(open(DUMP)); ed = json.load(open(ED))
p = d['prims'][0]; assert p['mesh'] == 'Body'
k0 = f"{p['mesh']}#{p['pi']}"
JN = [j.replace('mixamorig:', '') for j in p['joints']]; JP = {n: np.array(x) for n, x in zip(JN, p['jointPos'])}; ji = {n: i for i, n in enumerate(JN)}
B = np.array(ed[k0]['pos']).reshape(-1, 3)                       # basis after the body pass
names = [t['name'] for t in p['targets']]
T0d = {t['name']: (np.array(t['pos']).reshape(-1, 3) if t['pos'] else np.zeros_like(B)) for t in p['targets']}
Jn = np.array(p['J']).reshape(-1, 4).astype(int); Wt = np.array(p['W']).reshape(-1, 4)
# the tube by its original weights, less the seat patch the body pass freed (the same chain test as reshape.py)
P0 = np.array(p['pos']).reshape(-1, 3)
_ch = [JP['Tail1'], JP['Tail2'], JP['Tail3'], JP['Tail3'] + (JP['Tail3'] - JP['Tail2']) * 1.2]
def _cd(Q):
    best = np.full(len(Q), 1e9)
    for a_, b_ in zip(_ch[:-1], _ch[1:]):
        ab = b_ - a_; t_ = np.clip(((Q - a_) @ ab) / (ab @ ab), 0, 1); best = np.minimum(best, np.linalg.norm(Q - (a_ + t_[:, None] * ab), axis=1))
    return best
_tw0 = sum(np.where(Jn == ji[t], Wt, 0).sum(1) for t in ('Tail1', 'Tail2', 'Tail3'))
_far = sum(np.where(Jn == ji[t], Wt, 0).sum(1) for t in ('Tail2', 'Tail3'))
_r = np.median(_cd(P0)[_far > 0.8])
SEAT = (_tw0 > 0) & ~((_cd(P0) < 1.3 * _r) & (P0[:, 2] < JP['Tail1'][2])) & (_far < 0.2)
tw = sum(np.where(Jn == ji[t], Wt, 0).sum(1) for t in ('Tail1', 'Tail2', 'Tail3'))
n = len(B)
# welded clusters + edges (this primitive only: the tail never reaches fur2)
key = np.round(np.array(p['pos']).reshape(-1, 3) / 1e-5).astype(np.int64)
_, cid = np.unique(key, axis=0, return_inverse=True); cid = cid.ravel(); NC = cid.max() + 1
tri = np.array(p['idx']).reshape(-1, 3)
E = np.unique(np.sort(np.concatenate([np.stack([cid[tri[:, a]], cid[tri[:, b]]], 1) for a, b in ((0, 1), (1, 2), (2, 0))]), 1), axis=0); E = E[E[:, 0] != E[:, 1]]
deg = np.bincount(E.ravel(), minlength=NC).astype(float)
def toC(V): C = np.zeros((NC, 3)); np.add.at(C, cid, V); return C / np.bincount(cid, minlength=NC)[:, None]
def lap(C):
    acc = np.zeros_like(C); np.add.at(acc, E[:, 0], C[E[:, 1]]); np.add.at(acc, E[:, 1], C[E[:, 0]]); return acc / np.maximum(deg, 1)[:, None] - C
root = JP['Tail1']
def relax(V, w, it=14):
    C = toC(V); wc = toC(np.repeat(w[:, None], 3, 1))[:, 0]
    for _ in range(it):
        C = C + 0.55 * wc[:, None] * lap(C)
        C = C - 0.58 * wc[:, None] * lap(C)
    return C[cid]
# 1. the root: everything within 6.5 cm of the Tail1 head, full strength inside 3.5 cm
rw = 1 - sm((np.linalg.norm(B - root, axis=1) - 0.035) / 0.03)
Bn = relax(B, rw)
mv = np.linalg.norm(Bn - B, axis=1); print('root relax basis: max %.4f m, verts moved >0.5 mm %d' % (mv.max(), (mv > 5e-4).sum()))
abs_keys = {nm: B + T0d[nm] for nm in names}
newabs = {}
for nm in names:
    if not nm.startswith('Tail_'): continue
    A = abs_keys[nm]; ra = 1 - sm((np.linalg.norm(A - root, axis=1) - 0.035) / 0.03)
    newabs[nm] = relax(A, np.maximum(ra, rw))
# 2. the tube's own coordinates on the (relaxed) basis
T = (tw > 0.5) & ~SEAT
print('tube verts %d (seat patch left out %d)' % (T.sum(), ((tw > 0.5) & SEAT).sum()))
TP = Bn[T]
# centreline: project on the bone chain, then the centroids of arc-length bins, twice
chain = np.array([JP['Tail1'], JP['Tail2'], JP['Tail3'], JP['Tail3'] + (JP['Tail3'] - JP['Tail2']) * 1.4])
def project(Q, L):
    seg = L[1:] - L[:-1]; sl = np.linalg.norm(seg, axis=1); cum = np.concatenate([[0], np.cumsum(sl)])
    best = np.full(len(Q), 1e9); s = np.zeros(len(Q)); foot = np.zeros_like(Q)
    for i in range(len(seg)):
        t = np.clip(((Q - L[i]) @ seg[i]) / (sl[i] ** 2), 0, 1); f = L[i] + t[:, None] * seg[i]; dd = np.linalg.norm(Q - f, axis=1)
        m = dd < best; best[m] = dd[m]; s[m] = cum[i] + t[m] * sl[i]; foot[m] = f[m]
    return s, best, foot, cum[-1]
L = chain
for _ in range(3):
    s, dist, _, tot = project(TP, L)
    bins = np.linspace(0, s.max() + 1e-6, 15)
    cen = [root]
    for a, b in zip(bins[:-1], bins[1:]):
        m = (s >= a) & (s < b)
        if m.sum() > 6: cen.append(TP[m].mean(0))
    cen = np.array(cen)
    # light smoothing of the polyline, root fixed
    for _ in range(3): cen[1:-1] = 0.5 * cen[1:-1] + 0.25 * (cen[:-2] + cen[2:])
    dl = cen[-1] - cen[-2]; dl /= np.linalg.norm(dl); L = np.vstack([cen, cen[-1] + dl * 0.6 * (bins[1] - bins[0])])   # end on the tube's own axis; the cap rides past it
s, rho, foot, Ltot = project(TP, L)
seg = L[1:] - L[:-1]; sl = np.linalg.norm(seg, axis=1); cum = np.concatenate([[0], np.cumsum(sl)])
def tangent_at(sv):
    i = np.clip(np.searchsorted(cum, sv, side='right') - 1, 0, len(seg) - 1); return seg[i] / sl[i][:, None] if np.ndim(sv) else seg[i] / sl[i]
up = np.array([0, 1, 0.])
def frames(path, T0):
    # parallel transport along a sampled path; N starts as world up made square to the first tangent
    N0 = up - T0 * (up @ T0); N0 /= np.linalg.norm(N0)
    Ts = np.gradient(path, axis=0); Ts /= np.linalg.norm(Ts, axis=1, keepdims=True)
    Ns = [N0];
    for i in range(1, len(path)):
        nv = Ns[-1] - Ts[i] * (Ns[-1] @ Ts[i]); nv /= np.linalg.norm(nv); Ns.append(nv)
    Ns = np.array(Ns); Bs = np.cross(Ts, Ns); return Ts, Ns, Bs
# the original centreline sampled finely, with frames: each tube vertex gets (s, phi, rho)
S = np.linspace(0, Ltot, 200)
def at(Lpts, sv):
    seg_ = Lpts[1:] - Lpts[:-1]; sl_ = np.linalg.norm(seg_, axis=1); cum_ = np.concatenate([[0], np.cumsum(sl_)])
    i = np.clip(np.searchsorted(cum_, sv, side='right') - 1, 0, len(seg_) - 1); t = (sv - cum_[i]) / sl_[i]
    return Lpts[i] + t[:, None] * seg_[i]
path0 = at(L, S); Tt0 = tangent_at(1e-4)
Ts0, Ns0, Bs0 = frames(path0, Tt0)
si = np.clip(np.searchsorted(S, s), 0, len(S) - 1)
off = TP - path0[si]
along_off = np.einsum('ij,ij->i', off, Ts0[si])   # past the centreline's end (the tip cap) this carries the cap's own length
phi = np.arctan2(off @ np.zeros(3) + np.einsum('ij,ij->i', off, Bs0[si]), np.einsum('ij,ij->i', off, Ns0[si]))
# where the tube leaves the seat: the first centreline point clear of the body's own surface
rmid = np.median(rho[(s / Ltot > 0.3) & (s / Ltot < 0.6)])
# the back of the body at each centreline point's height and side: the tube has left once it is behind that skin
NB = Bn[~T & ~SEAT]; kxy = cKDTree(NB[:, :2])
backz = np.array([NB[kxy.query_ball_point(q[:2], 0.03)][:, 2].min() if len(kxy.query_ball_point(q[:2], 0.03)) else 1e9 for q in path0])
ex = int(np.argmax(path0[:, 2] < backz + 0.45 * rmid)); s_exit = S[ex]
root = path0[ex]; Tt0 = Ts0[ex]
u = np.clip((s - s_exit) / (Ltot - s_exit), 0, 1)
inside = s < s_exit
rroot = np.median(rho[(s >= s_exit) & (s < s_exit + 0.05)])
print('tube leaves the body at s %.3f (%.0f%% of the tail)' % (s_exit, 100 * s_exit / Ltot))
print('tail: length %.3f m, root radius %.3f, mid radius %.3f, %d tube verts' % (Ltot, rroot, rmid, T.sum()))
body_far = cKDTree(Bn[(~T) & ~SEAT & (np.linalg.norm(Bn - root, axis=1) > 0.03)])
def place(path, rad, blend_u=0.14):
    """tube verts on a new path: same s (scaled to the path), same angle round, radius by profile; the root blends into the relaxed basis."""
    Sn = np.linspace(0, 1, len(path))
    Ts, Ns, Bs = frames(path, Tt0)
    j = np.clip(np.round(u * (len(path) - 1)).astype(int), 0, len(path) - 1)
    # each vertex keeps its own radius relative to the tube's at its place along the tail: the closed tip stays closed
    bins_ = np.linspace(0, 1, 25); bi = np.clip(np.digitize(u, bins_) - 1, 0, 23)
    med = np.array([np.median(rho[bi == k]) if (bi == k).sum() > 3 else np.nan for k in range(24)])
    med = np.where(np.isnan(med), np.nanmedian(med), med)
    ratio = np.clip(rho / med[bi], 0, 1.25)
    q = path[j] + (rad(u) * ratio)[:, None] * (np.cos(phi)[:, None] * Ns[j] + np.sin(phi)[:, None] * Bs[j])
    q = q + along_off[:, None] * Ts[j]
    b = (sm(u / blend_u) * (~inside))[:, None]
    return (1 - b) * TP + b * q
def path_of(fn, m=200):
    return np.array([fn(t) for t in np.linspace(0, 1, m)])
side = np.cross(up, Tt0); side /= np.linalg.norm(side)
upT = up - Tt0 * (up @ Tt0); upT /= np.linalg.norm(upT)
rb = rho / np.maximum(np.interp(u, np.sort(u), np.maximum.accumulate(np.ones_like(u)) * 1), 1)   # unused guard
lump = lambda uu: 1.0
def ball(R, lift, out):
    # a sphere of radius R whose back pole lies `out` beyond the root along the first tangent tilted up by `lift`
    ax = Tt0 * math.cos(lift) + upT * math.sin(lift); ax /= np.linalg.norm(ax)
    c = root + ax * (out + R * 0.55)
    th0 = math.asin(min(0.98, rroot / R))
    th = th0 + (math.pi - th0) * sm(np.clip(u, 0, 1) * 1.02)
    Nax = upT - ax * (upT @ ax); Nax /= np.linalg.norm(Nax); Bax = np.cross(ax, Nax)
    radial = np.cos(phi)[:, None] * Nax + np.sin(phi)[:, None] * Bax
    q = c - np.cos(th)[:, None] * ax * R + np.sin(th)[:, None] * radial * R
    b = (sm(u / 0.10) * (~inside))[:, None]
    return (1 - b) * TP + b * q
new = {}
# Bob: a short round stub, a little bigger than the tube, tipped up
new['Tail_Bob'] = ball(1.25 * rmid, math.radians(25), 0.004)
# Puff: a full pom, twice the tube, held up off the seat
new['Tail_Puff'] = ball(1.8 * rmid, math.radians(35), 0.010)
# Curl: an open spiral that rises off the root and curls over, each turn inside the last and stepped sideways
best = None
for R0 in np.linspace(0.05, 0.11, 13):
    for turn in (1.35, 1.5, 1.65):
        for drift in (0.6, 1.0, 1.4):
            Lc = (Ltot - s_exit) * 1.0; m = 220; ss = np.linspace(0, Lc, m); h = np.zeros(m); P_ = np.zeros((m, 3)); P_[0] = root
            # curvature grows along the tail so the curl tightens; total heading = turn * pi
            kap = (ss / Lc) ** 1.2; kap = kap / np.trapezoid(kap, ss) * turn * math.pi if hasattr(np, 'trapezoid') else kap / np.trapz(kap, ss) * turn * math.pi
            h = np.concatenate([[0], np.cumsum(0.5 * (kap[1:] + kap[:-1]) * np.diff(ss))])
            lift0 = math.radians(20)
            dirs = (np.cos(h + lift0)[:, None] * Tt0 + np.sin(h + lift0)[:, None] * upT)
            dirs = dirs + side * (drift * rmid / Lc) * np.sign(Tt0 @ np.array([1, 0, 0]) + 1e-6)
            dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
            P_[1:] = root + np.cumsum(0.5 * (dirs[1:] + dirs[:-1]) * np.diff(ss)[:, None], 0)
            rad = lambda uu: np.interp(uu, [0, 0.15, 0.85, 1], [rroot, rmid * 1.05, rmid * 0.75, rmid * 0.45])
            rr = rad(np.linspace(0, 1, m))
            # self clearance: pairs far apart along the tail
            Dm = np.linalg.norm(P_[:, None] - P_[None], axis=2); sep = np.abs(ss[:, None] - ss[None]); need = rr[:, None] + rr[None] + 0.006
            bad = (sep > 4 * rmid) & (Dm < need)
            selfc = (Dm - need)[sep > 4 * rmid].min()
            bodyc = (body_far.query(P_[m // 6:])[0] - rr[m // 6:] - 0.006).min()
            score = min(selfc, bodyc)
            if best is None or score > best[0]: best = (score, R0, turn, drift, P_, rad, selfc, bodyc)
score, R0, turn, drift, Pc, radc, selfc, bodyc = best
print('curl: turn %.2f pi, drift %.1f, clearance self %.4f body %.4f' % (turn, drift, selfc, bodyc))
new['Tail_Curl'] = place(Pc, radc, 0.28)
# write: basis (relaxed root), every key re-expressed against the new basis
B2 = Bn.copy()
tk = {}
for nm in names:
    A = newabs[nm] if nm in newabs else (abs_keys[nm] - B + Bn)     # non-tail keys keep their deltas
    if nm in new:
        A = A.copy(); A[T] = new[nm]; A[SEAT] = Bn[SEAT]   # the seat skin stays on the seat
    tk[nm] = A - B2
ed[k0]['pos'] = B2.ravel().tolist()
ed[k0]['targets'] = [tk[nm].ravel().tolist() for nm in names]
# normals of the basis where the root moved
moved = np.linalg.norm(Bn - B, axis=1) > 2e-4
if moved.any():
    fn = np.cross(B2[tri[:, 1]] - B2[tri[:, 0]], B2[tri[:, 2]] - B2[tri[:, 0]]); NA = np.zeros((NC, 3))
    for j in range(3): np.add.at(NA, cid[tri[:, j]], fn)
    NA /= np.maximum(np.linalg.norm(NA, axis=1, keepdims=True), 1e-12)
    nr = np.array(ed[k0]['nrm']).reshape(-1, 3); nr[moved] = NA[cid][moved]; ed[k0]['nrm'] = nr.ravel().tolist()
json.dump(ed, open(ED, 'w'))
for nm in ('Tail_Bob', 'Tail_Puff', 'Tail_Curl'):
    print('%s: max delta %.3f' % (nm, np.linalg.norm(tk[nm], axis=1).max()))
if '--debug' in sys.argv:
    Tidx = np.where(T)[0]; pos_in_T = -np.ones(n, int); pos_in_T[Tidx] = np.arange(len(Tidx))
    tt = tri[(pos_in_T[tri] >= 0).all(1)]
    for nm in ('Tail_Curl', 'Tail_Bob'):
        A = np.array(Bn); A[T] = new[nm]
        el = lambda X: np.stack([np.linalg.norm(X[tt[:, a]] - X[tt[:, b]], axis=1) for a, b in ((0, 1), (1, 2), (2, 0))], 1)
        r = (el(A) / np.maximum(el(Bn), 1e-9)).max(1)
        w = np.argsort(-r)[:8]
        for k in w:
            vs = pos_in_T[tt[k]]
            print(nm, 'ratio %.2f u %s s %s rho %s along %s' % (r[k], np.round(u[vs], 3), np.round(s[vs], 3), np.round(rho[vs], 3), np.round(along_off[vs], 3)))
