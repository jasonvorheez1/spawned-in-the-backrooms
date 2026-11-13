# python -I reshape.py <sex> <body_dump.json> <body_edits_out.json> [garment_dump.json garment_edits_out.json]...
# The cat body pass (glTF space: y up, +z front, +x the cat's left).
#  1. weights: the seat and tail root (Tail1 had the buttocks at 100%, beside thigh verts at 100%: the seat tore when a leg swung) and the
#     shoulders (the back of the shoulder fell 95% -> 70% across 7 mm and stretched 4x when the arm reached forward) are re-blended.
#  2. shape (female): a waist, wider hips and fuller outer thighs, a rounder seat; one smooth field of rest position, so every garment takes the same move.
#  3. garments: the body's weight change is carried onto each garment at its nearest body points; the shape field moves it like the body.
import sys, json, math
import numpy as np
from scipy.spatial import cKDTree

SEX = sys.argv[1]
def load(f): return json.load(open(f))
def sm(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

body = load(sys.argv[2])
JN = [j.replace('mixamorig:', '') for j in body['prims'][0]['joints']]
JP = {n: np.array(p) for n, p in zip(JN, body['prims'][0]['jointPos'])}
NJ = len(JN); ji = {n: i for i, n in enumerate(JN)}

def dense(p):
    n = len(p['pos']) // 3
    Wd = np.zeros((n, NJ)); J = np.array(p['J']).reshape(-1, 4).astype(int); W = np.array(p['W']).reshape(-1, 4)
    for k in range(4): np.add.at(Wd, (np.arange(n), J[:, k]), W[:, k])
    return Wd
def sparse(Wd):
    o = np.argsort(-Wd, 1)[:, :4]; w = np.take_along_axis(Wd, o, 1); w[w < 0.004] = 0
    s = w.sum(1, keepdims=True); s[s == 0] = 1; w = w / s
    o[w == 0] = 0
    return o, w

# ---------- body: all four primitives welded by position (Body fur, Body fur2, Head, Head profile) ----------
prims = body['prims']
isBody = [p['mesh'] == 'Body' for p in prims]
P = [np.array(p['pos']).reshape(-1, 3) for p in prims]
Wd = [dense(p) for p in prims]
off = np.cumsum([0] + [len(x) for x in P])
PA = np.concatenate(P); WA = np.concatenate(Wd); bodyMask = np.concatenate([np.full(len(x), b) for x, b in zip(P, isBody)])
key = np.round(PA / 1e-5).astype(np.int64)
_, cid, inv_counts = np.unique(key, axis=0, return_inverse=True, return_counts=True)
cid = cid.ravel(); NC = cid.max() + 1
# cluster data
CP = np.zeros((NC, 3)); np.add.at(CP, cid, PA); CP /= np.bincount(cid, minlength=NC)[:, None]
CW = np.zeros((NC, NJ)); np.add.at(CW, cid, WA); CW /= np.bincount(cid, minlength=NC)[:, None]
fixedC = np.zeros(NC, bool); np.logical_or.at(fixedC, cid, ~bodyMask)   # a cluster touching the head stays as it is (the neck seam)
# adjacency from triangles
edges = []
for k, p in enumerate(prims):
    idx = np.array(p['idx']).reshape(-1, 3) + off[k]
    for a, b in ((0, 1), (1, 2), (2, 0)): edges.append(np.stack([cid[idx[:, a]], cid[idx[:, b]]], 1))
E = np.unique(np.sort(np.concatenate(edges), 1), axis=0); E = E[E[:, 0] != E[:, 1]]
deg = np.bincount(E.ravel(), minlength=NC).astype(float)

def smooth(W, region, bones, iters, lam=0.5, pin=None):
    """Laplacian smoothing of the weights of `bones` inside `region` (per cluster), keeping each vertex's share for that bone set."""
    b = [ji[x] for x in bones if x in ji]
    S = W[:, b].copy(); tot = S.sum(1, keepdims=True)
    mov = region & ~fixedC & (tot[:, 0] > 1e-4)
    if pin is not None: mov &= ~pin
    for _ in range(iters):
        acc = np.zeros_like(S); np.add.at(acc, E[:, 0], S[E[:, 1]]); np.add.at(acc, E[:, 1], S[E[:, 0]])
        nb = acc / np.maximum(deg, 1)[:, None]
        nbt = nb.sum(1, keepdims=True); nb = np.where(nbt > 1e-6, nb / np.maximum(nbt, 1e-9) * tot, S)
        S[mov] = (1 - lam) * S[mov] + lam * nb[mov]
    W = W.copy(); W[:, b] = S
    return W

W0 = CW.copy(); W1 = CW.copy()
X, Y, Z = CP[:, 0], CP[:, 1], CP[:, 2]
H = JP['Head'][1]   # head joint height: the body scale
# --- tail tube: distance to the tail chain; Tail weight that sits on the body (the seat) goes to Hips ---
chain = [JP['Tail1'], JP['Tail2'], JP['Tail3'], JP['Tail3'] + (JP['Tail3'] - JP['Tail2']) * 1.2]
def chain_dist(Q):
    best = np.full(len(Q), 1e9); along = np.zeros(len(Q))
    acc = 0
    for a, b in zip(chain[:-1], chain[1:]):
        ab = b - a; L = np.linalg.norm(ab); t = np.clip(((Q - a) @ ab) / (L * L), 0, 1)
        d = np.linalg.norm(Q - (a + t[:, None] * ab), axis=1)
        m = d < best; best[m] = d[m]; along[m] = acc + t[m] * L; acc += L
    return best, along
tw = W1[:, [ji['Tail1'], ji['Tail2'], ji['Tail3']]].sum(1)
td, ta = chain_dist(CP)
r_tail = np.median(td[(W1[:, ji['Tail2']] > 0.8)])
tube = (td < 1.3 * r_tail) & (Z < JP['Tail1'][2])
far_tail = W1[:, ji['Tail2']] + W1[:, ji['Tail3']]
off_tube = (tw > 0) & ~tube & (far_tail < 0.2)   # only the seat round the root: the tail's own length keeps its bones
moved = W1[off_tube][:, [ji['Tail1'], ji['Tail2'], ji['Tail3']]].sum(1)
W1[off_tube, ji['Hips']] += moved
for t in ('Tail1', 'Tail2', 'Tail3'): W1[off_tube, ji[t]] = 0
print('tail r %.3f: tube clusters %d, seat clusters freed of tail weight %d (mean %.2f)' % (r_tail, tube.sum(), off_tube.sum(), moved.mean() if len(moved) else 0))
# --- pelvis blend: Hips / both UpLegs / Tail1 / Spine, from the waist to mid-thigh; the tail past its root keeps its weights ---
hy = JP['Hips'][1]; ky = JP['LeftLeg'][1]
# a thigh bone never pulls the waist: its weight fades out just above the hip joint, handed to Hips
legw = W1[:, ji['LeftUpLeg']] + W1[:, ji['RightUpLeg']]
fade = sm((Y - (hy + 0.03)) / 0.04) * (~fixedC)
for b in ('LeftUpLeg', 'RightUpLeg'): W1[:, ji['Hips']] += W1[:, ji[b]] * fade; W1[:, ji[b]] *= 1 - fade
print('thigh weight lifted off the waist on %d clusters' % ((legw * fade) > 0.02).sum())
pel = (Y < hy + 0.55 * (JP['Spine1'][1] - hy) + 0.02) & (Y > ky + 0.45 * (hy - ky)) & ~(tube & (ta > 0.6 * r_tail)) & (np.abs(X) < JP['LeftUpLeg'][0] * 3.2)
W1 = smooth(W1, pel, ['Hips', 'LeftUpLeg', 'RightUpLeg', 'Tail1', 'Spine'], 26, 0.5)
# --- shoulders: Spine1/Spine2/Shoulder/Arm around each shoulder joint; the hands and the neck seam stay ---
sh = np.zeros(NC, bool)
for s in ('Left', 'Right'):
    A = JP[s + 'Arm']; R = 0.55 * np.linalg.norm(JP[s + 'ForeArm'] - A)
    sh |= (np.linalg.norm(CP - A, axis=1) < R)
nax = JP['Neck']; rxz = np.hypot(X - nax[0], Z - nax[2])
stalk = ((W1[:, ji['Neck']] + W1[:, ji['Head']]) > 0.5) & (rxz < 0.06)      # the neck itself stays as it is
W1 = smooth(W1, sh, ['Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'], 22, 0.5, pin=stalk)
# keep 4 influences, renormalise
o, w = sparse(W1); W1 = np.zeros_like(W1)
for k in range(4): np.add.at(W1, (np.arange(len(W1)), o[:, k]), w[:, k])   # additive: padded slots point at joint 0 (Hips) with weight 0
assert (W1.sum(1) > 0.99).all(), 'a vertex lost its weights'
dW = W1 - W0
print('weights changed on %d clusters (max %.2f)' % ((np.abs(dW).max(1) > 0.01).sum(), np.abs(dW).max()))

# ---------- the female shape field ----------
def field(Q, tube_mask=None):
    d = np.zeros_like(Q)
    if SEX != 'f': return d
    x, y, z = Q[:, 0], Q[:, 1], Q[:, 2]; ax = np.abs(x); sx = np.sign(x)
    hy, sy, s1y, s2y, ky = JP['Hips'][1], JP['Spine'][1], JP['Spine1'][1], JP['Spine2'][1], JP['LeftLeg'][1]
    zc = JP['Spine'][2]                          # the torso's own centre line front-back
    behind_tail = z < JP['Tail1'][2] + 0.01      # the tail and what is behind its root: left alone
    arm = (ax > JP['LeftArm'][0] - 0.01) & (y > s2y - 0.02)   # T-pose arms
    keep = ~(behind_tail & (y > hy - 0.02) & (ax < 0.05)) & ~arm
    # waist: a soft nip round the narrowest band between Spine and Spine1 (sides more than front/back)
    wy = 0.5 * (sy + s1y) + 0.006
    wb = np.exp(-0.5 * ((y - wy) / 0.028) ** 2)
    d[:, 0] += -x * 0.16 * wb
    d[:, 2] += -(z - zc) * 0.05 * wb
    # hips: widest just under the Hips joint, a shelf the waist flows into; fades to the knee and into the waist
    hc = hy - 0.018
    up = np.exp(-0.5 * (np.maximum(y - hc, 0) / 0.035) ** 2)
    dn = 1 - sm((hc - y) / (hc - ky - 0.01))
    hb = np.where(y > hc, up, dn)
    d[:, 0] += x * 0.09 * hb
    # outer thigh fullness: the outside of each thigh, from the hip to above the knee
    lx = JP['LeftUpLeg'][0]
    outer = sm((ax - lx) / 0.03)
    tb = np.where(y > hc, up, 1 - sm((hc - y) / (0.75 * (hc - ky))))
    d[:, 0] += sx * 0.006 * outer * tb
    # seat: the back of the pelvis rounds out under the tail root
    back = sm((zc - z - 0.02) / 0.05)
    seat = np.exp(-0.5 * ((y - (hy - 0.03)) / 0.035) ** 2) * np.exp(-0.5 * ((ax - lx * 0.9) / 0.05) ** 2)
    d[:, 2] += -0.012 * back * seat
    d[~keep] = 0
    d *= (1 - sm((ax - 0.19) / 0.03))[:, None]
    if tube_mask is not None: d[tube_mask] = 0
    return d

D = field(CP, tube)
D[W1[:, [ji['Tail1'], ji['Tail2'], ji['Tail3']]].sum(1) > 0.02] = 0
D[fixedC] = 0
print('shape: max move %.4f m, clusters moved > 1 mm: %d' % (np.linalg.norm(D, axis=1).max(), (np.linalg.norm(D, axis=1) > 0.001).sum()))

def recompute_normals(pos, idx, nrm0, moved):
    if not moved.any(): return nrm0
    tri = idx.reshape(-1, 3); a, b, c = pos[tri[:, 0]], pos[tri[:, 1]], pos[tri[:, 2]]
    fn = np.cross(b - a, c - a)
    N = np.zeros_like(pos)
    for k in range(3): np.add.at(N, tri[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
    # only where the shape moved; welded seams average by cluster later
    out = nrm0.copy(); out[moved] = N[moved]; return out

edits = {}
for k, p in enumerate(prims):
    if not isBody[k]: continue
    c = cid[off[k]:off[k + 1]]
    pos = P[k] + D[c]
    o, w = sparse(W1[c])
    nrm0 = np.array(p['nrm']).reshape(-1, 3)
    edits[f"{p['mesh']}#{p['pi']}"] = dict(pos=pos.ravel().tolist(), J=o.ravel().tolist(), W=w.ravel().tolist(), nrm=nrm0.ravel().tolist(), _moved=(np.linalg.norm(D[c], axis=1) > 2e-4))
# normals: face normals of the moved body, averaged per welded cluster so seams stay smooth (unmoved verts keep their own)
NA = np.zeros((NC, 3));
for k, p in enumerate(prims):
    if not isBody[k]: continue
    e = edits[f"{p['mesh']}#{p['pi']}"]; pos = np.array(e['pos']).reshape(-1, 3); tri = np.array(p['idx']).reshape(-1, 3)
    fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
    for j in range(3): np.add.at(NA, cid[off[k]:off[k + 1]][tri[:, j]], fn)
NA /= np.maximum(np.linalg.norm(NA, axis=1, keepdims=True), 1e-12)
for k, p in enumerate(prims):
    if not isBody[k]: continue
    e = edits[f"{p['mesh']}#{p['pi']}"]; c = cid[off[k]:off[k + 1]]; n0 = np.array(e['nrm']).reshape(-1, 3); mv = e.pop('_moved')
    n0[mv] = NA[c][mv]; e['nrm'] = n0.ravel().tolist()
for e in edits.values(): assert (np.array(e['W']).reshape(-1, 4).sum(1) > 0.99).all(), 'zero weights in the body edits'
json.dump(edits, open(sys.argv[3], 'w'))
# for the checks: the moved body
np.save(sys.argv[3] + '.dw.npy', dW)

# ---------- garments ----------
tree = cKDTree(CP)
args = sys.argv[4:]
for gi in range(0, len(args), 2):
    g = load(args[gi]); ged = {}; rep = []
    for p in g['prims']:
        if not p['joints']: continue
        gJ = [j.replace('mixamorig:', '') for j in p['joints']]
        Q = np.array(p['pos']).reshape(-1, 3); n = len(Q)
        Gd = np.zeros((n, len(gJ))); J = np.array(p['J']).reshape(-1, 4).astype(int); Wg = np.array(p['W']).reshape(-1, 4)
        for k in range(4): np.add.at(Gd, (np.arange(n), J[:, k]), Wg[:, k])
        dist, nn = tree.query(Q, k=6)
        wt = 1 / np.maximum(dist, 1e-4) ** 2; wt /= wt.sum(1, keepdims=True)
        dWg = (dW[nn] * wt[:, :, None]).sum(1)                  # body joints order
        fall = 1 - sm((dist.min(1) - 0.03) / 0.03)              # a garment point far from the body (a cape's hem) keeps its own weights
        dWg *= fall[:, None]
        G2 = Gd.copy()
        for bn, bi in ji.items():
            if bn in gJ: G2[:, gJ.index(bn)] += dWg[:, bi]
            elif np.abs(dWg[:, bi]).max() > 0.01: rep.append('missing joint ' + bn)
        G2 = np.clip(G2, 0, None); s = G2.sum(1, keepdims=True); s[s == 0] = 1; G2 /= s
        o = np.argsort(-G2, 1)[:, :4]; w = np.take_along_axis(G2, o, 1); w[w < 0.004] = 0; w /= np.maximum(w.sum(1, keepdims=True), 1e-9); o[w == 0] = 0
        assert (w.sum(1) > 0.99).all(), 'garment vertex lost its weights'
        Dg = field(Q)
        # the field as the body has it at its nearest points, where the garment hugs the body; its own value further out
        Db = (D[nn] * wt[:, :, None]).sum(1)
        hug = 1 - sm((dist.min(1) - 0.01) / 0.03)
        Dg = hug[:, None] * Db + (1 - hug[:, None]) * Dg
        pos = Q + Dg
        nrm0 = np.array(p['nrm']).reshape(-1, 3) if p['nrm'] else None
        e = dict(pos=pos.ravel().tolist(), J=o.ravel().tolist(), W=w.ravel().tolist())
        if nrm0 is not None and p['idx']:
            mv = np.linalg.norm(Dg, axis=1) > 2e-4
            if mv.any():
                tri = np.array(p['idx']).reshape(-1, 3); fn = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
                key = np.round(Q / 1e-5).astype(np.int64); _, gc = np.unique(key, axis=0, return_inverse=True); gc = gc.ravel()
                NG = np.zeros((gc.max() + 1, 3))
                for j in range(3): np.add.at(NG, gc[tri[:, j]], fn)
                NG /= np.maximum(np.linalg.norm(NG, axis=1, keepdims=True), 1e-12)
                # keep the sign of the old normal (a garment can be single-sided with inward-facing panels)
                nn_ = NG[gc]; flip = (nn_ * nrm0).sum(1) < 0; nn_[flip] *= -1
                nrm0 = nrm0.copy(); nrm0[mv] = nn_[mv]
            e['nrm'] = nrm0.ravel().tolist()
        ged[f"{p['mesh']}#{p['pi']}"] = e
        rep.append('%s v%d dW>0.01:%d move max %.4f' % (p['mesh'][:20], n, (np.abs(dWg).max(1) > 0.01).sum(), np.linalg.norm(Dg, axis=1).max()))
    json.dump(ged, open(args[gi + 1], 'w'))
    print('garment', args[gi], '; '.join(sorted(set(rep))))
