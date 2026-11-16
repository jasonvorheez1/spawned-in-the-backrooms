"""T2 BUBBLES: exactly one collider capsule per T0 zone, the v2 fit Medi accepted (art/body-t2/capsules2.py, 2026-10-10):
both segment ends free, radius = farthest skin vertex of the zone (100 % of the zone inside), smallest volume, a penalty for
cap tips past the zone's own ends. Each rides the bone that carries most of its zone (head/hands forced to head/wrist);
a/b are in that bone's REST-LOCAL metres (Y along the bone) like scripts/lib/data/body-capsules.json, so outfit-snap reads
the output as-is. Flags: overshoot > 15 % of the zone length, or a capsule longer than 1.4x its zone = review it."""
import numpy as np, json, os

def segdist(P, A, B):
    d = B - A; L2 = d @ d
    if L2 < 1e-12: return np.linalg.norm(P - A, axis=1)
    t = np.clip((P - A) @ d / L2, 0, 1); return np.linalg.norm(P - (A + t[:, None] * d), axis=1)
def cost(x, P, ext):
    A, B = x[:3], x[3:]; r = segdist(P, A, B).max(); L = np.linalg.norm(B - A)
    vol = np.pi * r * r * L + 4 / 3 * np.pi * r ** 3
    if L > 1e-6:
        d = (B - A) / L; ta, tb = sorted([A @ d, B @ d]); pt = P @ d
        over = max(0, pt.min() - (ta - r)) + max(0, (tb + r) - pt.max())
    else: over = max(0, 2 * r - ext)
    return vol * (1 + 1.5 * over / max(ext, 1e-3))
def nm(f, x0, step, iters=2500):
    n = len(x0); S = [x0] + [x0 + np.eye(n)[i] * step for i in range(n)]; F = [f(s) for s in S]
    for _ in range(iters):
        o = np.argsort(F); S = [S[i] for i in o]; F = [F[i] for i in o]
        if abs(F[-1] - F[0]) < 1e-10 * max(1, abs(F[0])) and np.ptp(np.array(S), 0).max() < 1e-6: break
        c = np.mean(S[:-1], 0); xr = c + (c - S[-1]); fr = f(xr)
        if fr < F[0]:
            xe = c + 2 * (c - S[-1]); fe = f(xe); S[-1], F[-1] = (xe, fe) if fe < fr else (xr, fr)
        elif fr < F[-2]: S[-1], F[-1] = xr, fr
        else:
            xc = c + 0.5 * (S[-1] - c); fc = f(xc)
            if fc < F[-1]: S[-1], F[-1] = xc, fc
            else: S = [S[0]] + [S[0] + 0.5 * (s - S[0]) for s in S[1:]]; F = [F[0]] + [f(s) for s in S[1:]]
    i = int(np.argmin(F)); return S[i], F[i]

def run(body, ZONES, DOC, a):
    arm = body.arm; AW = np.array(arm.matrix_world); M = body.rig.M
    FORCE = {'head': (M.get('head') or [None])}
    for s_ in 'LR':   # palm and fingers ride the hand bone (one bubble each); the wrist picks its own (forearm or hand)
        for z_ in ('palm', 'fingers'): FORCE[f'{z_}_{s_.lower()}'] = (M.get(f'hand.{s_}') or [None])
    out = {}
    for z, o in ZONES.items():
        Mo = np.array(o.matrix_world); co = np.array([v.co for v in o.data.vertices]); P = co @ Mo[:3, :3].T + Mo[:3, 3]
        if len(P) > 4000: P = P[np.linspace(0, len(P) - 1, 4000).astype(int)]
        f = FORCE.get(z); bone = f[0] if isinstance(f, list) else f
        if not bone:
            tally = {}
            gn = {g.index: g.name for g in o.vertex_groups}
            for v in o.data.vertices:
                for g in v.groups:
                    n = gn.get(g.group)
                    if n and n in arm.data.bones and body.rig.key(n) != 'none': tally[n] = tally.get(n, 0) + g.weight
            bone = max(tally, key=tally.get)
        bl = arm.data.bones[bone]
        m = P.mean(0); C = P - m; w, Vv = np.linalg.eigh(C.T @ C)
        BM = AW @ np.array(bl.matrix_local); bax = BM[:3, 1] / np.linalg.norm(BM[:3, 1])
        ext = np.ptp(C @ Vv[:, 2]); starts = []
        for ax in [Vv[:, 2], bax, Vv[:, 1]]:
            t = C @ ax; lo, hi = t.min(), t.max()
            for fr in (0.15, 0.3, 0.45): starts.append(np.concatenate([m + ax * (lo + (hi - lo) * fr), m + ax * (hi - (hi - lo) * fr)]))
        starts.append(np.concatenate([m, m + 1e-4])); best = None
        fc = lambda x: cost(x, P, ext)
        for s in starts:
            x, fx = nm(fc, s, ext * 0.08); x, fx = nm(fc, x, ext * 0.02)
            if best is None or fx < best[1]: best = (x, fx)
        A, B = best[0][:3], best[0][3:]; r = segdist(P, A, B).max() + 0.0005
        inv = np.linalg.inv(BM); loc = lambda p: (inv @ np.append(p, 1))[:3]
        L = np.linalg.norm(B - A); d = (B - A) / L if L > 1e-6 else Vv[:, 2]; pt = P @ d
        over = max(0, pt.min() - (min(A @ d, B @ d) - r)) + max(0, (max(A @ d, B @ d) + r) - pt.max())
        zl = float(np.ptp(pt)); flag = []
        if over > 0.15 * zl: flag.append('overshoot')
        if L + 2 * r > 1.4 * zl: flag.append('long')
        out[z] = {'zone': z, 'bone': bone, 'a': [round(float(x), 4) for x in loc(A)], 'b': [round(float(x), 4) for x in loc(B)],
                  'radius': round(float(r), 4), 'length': round(float(L + 2 * r), 4), 'zoneLength': round(zl, 4),
                  'overshoot': round(float(over), 4), 'verts': len(P), 'worldA': [round(float(x), 4) for x in A], 'worldB': [round(float(x), 4) for x in B]}
        if flag: out[z]['review'] = flag
        print('BODYWORKS T2 %-12s %-16s r %.3f len %.3f zone %.3f over %.3f %s' % (z, bone, r, L + 2 * r, zl, over, flag or ''))
    DOC['t2'] = {'capsules': out}
    json.dump({'_doc': "BodyWorks T2 capsules for %s: one per T0 zone, every zone vertex inside. a/b = segment ends in the bone's rest-local metres (Y along the bone), radius metres; same shape as scripts/lib/data/body-capsules.json. review: overshoot/long = look before using. off: true disables one." % DOC['name'],
               'capsules': {z: {k: v for k, v in c.items() if not k.startswith('world')} for z, c in out.items()}},
              open(os.path.join(a.out, 'capsules.json'), 'w'), indent=1)
    return out
