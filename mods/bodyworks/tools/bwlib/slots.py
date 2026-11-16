"""SLOTS from the cages: which T0 zones each garment variant HIDES. Same rule as the T1 cage Medi worked on (art/body-t1/cage.py):
from each zone vertex a ray goes out along the skin normal; it meets the variant's cage within 3 cm -> covered.
hides = >= 90 % covered (switch the zone off under that garment); partial = >= 25 % (the zone stays on).
Skirts stand off the legs, so rays miss them: a skirt covers the THIGHS only (Medi 2026-10-09: pelvis, knees, shins stay),
by the share of thigh verts between its hem and the waist."""
import bpy
from mathutils.bvhtree import BVHTree

def run(body, ZONES, CAGES, DOC, a):
    S = body.S; bvh = {}
    for name, (ob, col) in CAGES['cage'].items():
        M = ob.matrix_world; bvh[name] = BVHTree.FromPolygons([M @ v.co for v in ob.data.vertices], [tuple(p.vertices) for p in ob.data.polygons])
    samp = {}
    for z, o in ZONES.items():
        M = o.matrix_world; N3 = M.to_3x3(); me = o.data; st = max(1, len(me.vertices) // 600)
        samp[z] = [(M @ me.vertices[i].co, (N3 @ me.vertices[i].normal).normalized()) for i in range(0, len(me.vertices), st)]
    res = {}
    for slot, vs in CAGES['variants'].items():
        res[slot] = {}
        for vn, segs in vs.items():
            if not segs: continue
            hides, part = [], {}
            if slot == 'skirt':
                zs = [(CAGES['cage'][sg][0].matrix_world @ v.co).z for sg in segs for v in CAGES['cage'][sg][0].data.vertices]; lo, hi = min(zs), max(zs)
                for z, P in samp.items():
                    if not z.startswith('thigh'): continue
                    f = sum(lo <= p.z <= hi for p, n in P) / len(P)
                    if f >= 0.85: hides.append(z)
                    elif f > 0.05: part[z] = round(f, 2)
            else:
                for z, P in samp.items():
                    hit = 0
                    for p, n in P:
                        for sg in segs:
                            if bvh[sg].ray_cast(p + n * 0.0005, n, 0.03 * S)[0] is not None: hit += 1; break
                    f = hit / len(P)
                    if f >= 0.9: hides.append(z)
                    elif f >= 0.25: part[z] = round(f, 2)
            res[slot][vn] = {'segments': segs, 'hides': sorted(hides), 'partial': part}
            print('BODYWORKS slot %-8s %-8s hides %s partial %s' % (slot, vn, sorted(hides), part))
    DOC['slots'] = res
    return res
