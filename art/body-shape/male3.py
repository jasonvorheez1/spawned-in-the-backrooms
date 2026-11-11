# Pass 3, men (Shelly Nov 11 "male bodies need a bit of a makeover"): the male base still carried the female base's bust and hips.
# Savi's picks: the bust flattened toward the sternum line (a pec shelf of ~1 cm kept), hips and the outer pelvis narrowed,
# the upper back and lats widened into a taper, the deltoid filled a little (rounded, never pointy). Writes the delta field
# fill.py's garment mode moves every men's outfit with, so clothes keep their clearance.
#   python3 male3.py <in-plain.glb> <out.glb> <field.npz>
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from fill import load, acc, put, worlds, prims, ss, save
FLAT, PEC, HIP, LAT, DELT = .80, .010, -.11, .06, .07
def run(src, out, fld):
    d, J, b0 = load(src); W = worlds(J); pts = []; dls = []
    names = {i: n.get('name', '') for i, n in enumerate(J['nodes'])}
    def jn(nm):
        for i, n in names.items():
            if n.split(':')[-1] == nm: return W[i][:3, 3]
    yS, yS1, yS2, yN, yH, yL = jn('Spine')[1], jn('Spine1')[1], jn('Spine2')[1], jn('Neck')[1], jn('Hips')[1], jn('LeftUpLeg')[1]
    xA = abs(jn('LeftArm')[0]); print('joints y', [round(v, 3) for v in (yL, yH, yS, yS1, yS2, yN)], 'xA', round(xA, 3))
    seg = {s + 'Arm': (jn(s + 'Arm'), jn(s + 'ForeArm')) for s in ('Left', 'Right')}
    # sternum line: front-most z of the body near x=0, per height (from the torso skin)
    allP = []
    prs = []
    done = set()
    for ni, n, p in prims(J):
        at = p['attributes']; sk = J['skins'][n['skin']] if 'skin' in n else None
        if sk is None or 'JOINTS_0' not in at: continue
        P, off, st, _ = acc(d, J, b0, at['POSITION'])
        if off in done: continue
        done.add(off)
        Jt, *_ = acc(d, J, b0, at['JOINTS_0']); Wt, *_ = acc(d, J, b0, at['WEIGHTS_0'])
        joints = [names[j].split(':')[-1] for j in sk['joints']]
        IBM = acc(d, J, b0, sk['inverseBindMatrices'])[0].reshape(-1, 4, 4).transpose(0, 2, 1)
        SK = np.array([W[j] @ IBM[k] for k, j in enumerate(sk['joints'])])
        M = np.einsum('vk,vkij->vij', Wt, SK[Jt.astype(int)]); Pw = np.einsum('vij,vj->vi', M, np.c_[P, np.ones(len(P))])[:, :3]
        prs.append((J['meshes'][n['mesh']].get('name', ''), P, off, st, at, Jt, Wt, joints, M, Pw))
        if J['meshes'][n['mesh']].get('name', '').startswith('Skin_torso'): allP.append(Pw)
    T = np.vstack(allP); bins = np.linspace(yS1 - .05, yN + .02, 30)
    mid = np.abs(T[:, 0]) < .025; zs = []
    for a, b in zip(bins[:-1], bins[1:]):
        m = mid & (T[:, 1] >= a) & (T[:, 1] < b); zs.append(T[m, 2].max() if m.any() else np.nan)
    zs = np.array(zs); zs = np.where(np.isnan(zs), np.nanmax(zs), zs); yc = (bins[:-1] + bins[1:]) / 2
    print('sternum z range', round(float(zs.min()), 3), round(float(zs.max()), 3))
    for name, P, off, st, at, Jt, Wt, joints, M, Pw in prs:
        D = np.zeros_like(Pw); x, y, z = Pw[:, 0], Pw[:, 1], Pw[:, 2]; ax_ = np.abs(x)
        inside = 1 - ss(xA * .75, xA * 1.05, ax_)
        # bust: front skin ahead of the sternum line + a pec shelf comes back toward it
        chestB = ss(yS1 - .02, yS2 - .02, y) * (1 - ss(yS2 + .07, yN - .03, y))
        zline = np.interp(y, yc, zs) + PEC * ss(.02, .07, ax_) * (1 - ss(.12, .16, ax_))
        over = np.maximum(0, z - zline) * (z > 0)
        D[:, 2] -= FLAT * over * chestB * inside
        # hips: the outer pelvis (past 6 cm from centre) pulled in; fades by mid thigh and above the waist
        hipB = ss(yL - .16, yL - .04, y) * (1 - ss(yS - .02, yS + .06, y))
        outer = np.maximum(0, ax_ - .06)
        D[:, 0] += HIP * hipB * outer * np.sign(x) * (1 - ss(xA * .8, xA * 1.0, ax_))
        D[:, 2] += HIP * .35 * hipB * np.minimum(z, 0) * (z < -.04)   # a flatter seat
        # lats/upper back: wider under the arms, tapering down to the waist
        latB = ss(yS1 + .02, yS2, y) * (1 - ss(yS2 + .08, yN - .04, y))
        D[:, 0] += LAT * latB * x * inside * (1 - .5 * (z > 0))
        # deltoid: radial swell near the shoulder about the arm bone, by Arm weight
        for k in range(4):
            for b, (h, t) in seg.items():
                ji = joints.index(b) if b in joints else -1
                if ji < 0: continue
                w = Wt[:, k] * (Jt[:, k] == ji)
                if not w.any(): continue
                ax = t - h; L = ax @ ax; u = np.clip((Pw - h) @ ax / L, 0, 1); r = Pw - (h + np.outer(u, ax))
                rn = r / (np.linalg.norm(r, axis=1, keepdims=True) + 1e-9)
                prof = ss(0, .12, u) * (1 - ss(.25, .55, u)) * (.4 + .6 * np.clip(rn[:, 1], 0, 1) + .3 * np.abs(rn[:, 2]))  # top/front/back, not the pit
                D += (w * DELT * prof)[:, None] * r
        Dl = np.einsum('vij,vj->vi', np.linalg.inv(M[:, :3, :3]), D); NP = P + Dl; put(d, off, st, NP)
        a = J['accessors'][at['POSITION']]; a['min'] = NP.min(0).tolist(); a['max'] = NP.max(0).tolist()
        pts.append(Pw); dls.append(D)
    save(d, J, b0, out); np.savez(fld, p=np.vstack(pts), d=np.vstack(dls)); print('male3 max delta mm', round(float(np.abs(np.vstack(dls)).max()) * 1000, 1))
if __name__ == '__main__': run(*sys.argv[1:4])
