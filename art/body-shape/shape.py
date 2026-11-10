# Pass 2 (Shelly Nov 10 #175156/#176667 "whatever helps"): ours vs her refs (blue-hair girl, Zhongli) at one height:
# our arms ran ~75% thicker than the girl's, the women's waist wide, the men's chest narrow. Reshapes at bind pose about the
# bone axes and the spine, writes the same delta field fill.py's garment mode moves every outfit with.
#   python3 shape.py <m|f> <in-plain.glb> <out.glb> <field.npz>
import sys, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from fill import load, acc, put, worlds, prims, ss, save
# my picks: women slimmer arms and a nipped waist (curves kept: bust, hips, thighs untouched); men a broader chest and back tapering to the waist
AMT = {'f': dict(upper=-.30, fore=-.20, waist=-.10, chest=0.0), 'm': dict(upper=-.14, fore=-.08, waist=-.05, chest=.11)}
def run(sex, src, out, fld):
    d, J, b0 = load(src); W = worlds(J); A = AMT[sex]; pts = []; dls = []
    names = {i: n.get('name', '') for i, n in enumerate(J['nodes'])}
    def jn(nm):
        for i, n in names.items():
            if n.split(':')[-1] == nm: return W[i][:3, 3]
    seg = {}
    for s in ('Left', 'Right'):
        seg[s + 'Arm'] = (jn(s + 'Arm'), jn(s + 'ForeArm'), 'upper'); seg[s + 'ForeArm'] = (jn(s + 'ForeArm'), jn(s + 'Hand'), 'fore')
    yS, yS1, yS2, yN = jn('Spine')[1], jn('Spine1')[1], jn('Spine2')[1], jn('Neck')[1]; xA = abs(jn('LeftArm')[0])
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
        D = np.zeros_like(Pw)
        for k in range(4):
            for v in range(len(P)):
                w = Wt[v, k]
                if w < 1e-4: continue
                b = joints[int(Jt[v, k])]
                if b in seg:
                    h, t, kind = seg[b]; ax = t - h; L = ax @ ax; u = np.clip((Pw[v] - h) @ ax / L, 0, 1); r = Pw[v] - (h + ax * u)
                    prof = ss(.0, .3, u) * (1 - .4 * ss(.8, 1, u)) if kind == 'upper' else ss(0, .15, u) * (1 - .5 * ss(.6, 1, u))
                    D[v] += w * A[kind] * prof * r
        # torso: x-scale bands by height, off past the shoulder joint so the arm root and shoulder tip never peak
        y = Pw[:, 1]; ax_ = np.abs(Pw[:, 0]); inside = 1 - ss(xA * .7, xA * 1.05, ax_)
        waist = ss(yS - .06, yS + .02, y) * (1 - ss(yS1 + .02, yS1 + .10, y))
        chest = ss(yS2 - .02, yS2 + .09, y) * (1 - ss(yN - .07, yN - .01, y))   # armpit height up: started at Spine1 it read as a belly
        f = (A['waist'] * waist + A['chest'] * chest) * inside
        D[:, 0] += f * Pw[:, 0]; D[:, 2] += .35 * A['chest'] * chest * inside * Pw[:, 2] * (Pw[:, 2] < 0)   # a man's back fills a little behind, no front change to the chest
        Dl = np.einsum('vij,vj->vi', np.linalg.inv(M[:, :3, :3]), D); NP = P + Dl; put(d, off, st, NP)
        a = J['accessors'][at['POSITION']]; a['min'] = NP.min(0).tolist(); a['max'] = NP.max(0).tolist()
        pts.append(Pw); dls.append(D)
    save(d, J, b0, out); np.savez(fld, p=np.vstack(pts), d=np.vstack(dls)); print('shape', sex, 'max delta mm', round(float(np.abs(np.vstack(dls)).max()) * 1000, 1))
if __name__ == '__main__': run(*sys.argv[1:5])
