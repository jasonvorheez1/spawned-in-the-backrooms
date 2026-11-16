"""HAND SPLIT: the old single hand zone cut into three, so a fingerless glove can hide the palm and leave the fingers.
  wrist_   = from the hand cut (6 cm up the forearm) to the wrist joint
  palm_    = wrist joint to the knuckles, the thumb up to its own knuckle (MCP)
  fingers_ = everything past the knuckles: four fingers and the thumb past its MCP
Each cut is a straight PLANE bisected through the mesh (clean rings, no zigzag):
  the wrist plane is square to the forearm at the wrist joint;
  each long finger has its own knuckle plane square to its proximal bone; a face goes to the finger whose bone it is nearest;
  the thumb plane sits at the thumb's MCP, square to its proximal bone, and judges thumb-weighted faces only.
The knuckle on a chain is picked by reach, not by bone index (rigs differ: Mixamo has no metacarpals, MakeHuman does):
  the joint whose distance from the wrist is nearest KNUCKLE x the wrist->middle-fingertip length (thumb: THUMB_MCP)."""
import bmesh, numpy as np
from mathutils import Vector

KNUCKLE = 0.42; THUMB_MCP = 0.33; WRIST_IN = 0.0   # metres past the wrist joint the wrist zone reaches (x S), 0 = at the joint
NAMES = ('wrist', 'palm', 'fingers')

def nrm(v):
    n = np.linalg.norm(v); return v / n if n > 1e-9 else v

def seg_d(p, a, b):
    ab = b - a; t = np.clip(np.dot(p - a, ab) / max(np.dot(ab, ab), 1e-12), 0, 1); return np.linalg.norm(p - (a + ab * t))

def planes(J, side, S=1.0):
    """J: wrist.<s>, elbow.<s>, finger<f>.<s> = [joint, ..., tip] (world). -> dict of planes and finger segments"""
    wr, el = J[f'wrist.{side}'], J[f'elbow.{side}']
    fa = nrm(wr - el)
    out = {'wrist': (wr + fa * WRIST_IN * S, fa), 'fingers': {}}
    mid = J.get(f'finger3.{side}')
    reach = np.linalg.norm(mid[-1] - wr) if mid else 0.18 * S
    for f in range(1, 6):
        ch = J.get(f'finger{f}.{side}')
        if not ch or len(ch) < 2: continue
        tgt = (THUMB_MCP if f == 1 else KNUCKLE) * reach
        i = int(np.argmin([abs(np.linalg.norm(j - wr) - tgt) for j in ch[:-1]]))
        k, nx = ch[i], ch[i + 1]
        out['fingers'][f] = {'at': k, 'normal': nrm(nx - k), 'seg': (ch[max(i - 1, 0)], ch[-1]), 'chain': ch}
    return out

def near_finger(P, p):
    best, bd = None, 1e9
    for f, d in P['fingers'].items():
        if f == 1: continue
        dd = seg_d(p, *d['seg'])
        if dd < bd: best, bd = f, dd
    return best

def which(P, p, thumb):
    """one point (world) of a hand face -> 'wrist' | 'palm' | 'fingers'; thumb = the face is weighted to the thumb"""
    if np.dot(p - P['wrist'][0], P['wrist'][1]) <= 0: return 'wrist'
    k = 1 if (thumb and 1 in P['fingers']) else near_finger(P, p)
    d = P['fingers'].get(k)
    return 'fingers' if d is not None and np.dot(p - d['at'], d['normal']) > 0 else 'palm'

def split(bm, faces, M, P, frole):
    """bm: bmesh; faces: the hand faces to split (one side); M: world matrix (np 4x4); P: planes(); frole(face) -> 'thumb' | 'finger<n>' | other.
    Bisects in place and returns {face.index: 'wrist'|'palm'|'fingers'} over the (new) hand faces."""
    Mi = np.linalg.inv(M); R = M[:3, :3]
    loc = lambda o, n: (Vector((Mi @ np.append(o, 1))[:3]), Vector(nrm(Mi[:3, :3] @ n)))
    W = lambda f: (M @ np.append(np.array(f.calc_center_median()), 1))[:3]
    hand = set(faces)
    def bisect(group, o, n):
        if not group: return
        geom = set()
        for f in group: geom.add(f); geom.update(f.edges); geom.update(f.verts)
        lo, ln = loc(o, n)
        r = bmesh.ops.bisect_plane(bm, geom=list(geom), plane_co=lo, plane_no=ln, dist=1e-6)
        for g in r['geom']:
            if isinstance(g, bmesh.types.BMFace): hand.add(g)
    # 1. wrist plane over the whole hand
    bisect([f for f in hand if f.is_valid], *P['wrist'])
    hand = {f for f in hand if f.is_valid}
    # 2. thumb plane over thumb faces; each long finger's plane over the faces nearest it
    groups = {}
    for f in hand:
        p = W(f)
        if np.dot(p - P['wrist'][0], P['wrist'][1]) <= 0: continue
        k = 1 if (frole(f) == 'thumb' and 1 in P['fingers']) else near_finger(P, p)
        if k is not None: groups.setdefault(k, []).append(f)
    for k, g in groups.items():
        d = P['fingers'][k]; bisect([f for f in g if f.is_valid], d['at'], d['normal'])
    hand = {f for f in hand if f.is_valid}
    # 3. classify (keyed by face index: bmesh face wrappers are not stable dict keys across bisects)
    bm.faces.index_update(); out = {}
    for f in hand: out[f.index] = which(P, W(f), frole(f) == 'thumb')
    print('HANDS split', {n: sum(1 for v in out.values() if v == n) for n in NAMES}, 'of', len(out))
    return out
