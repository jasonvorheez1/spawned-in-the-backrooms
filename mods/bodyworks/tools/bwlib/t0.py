"""T0 ZONES: the body's skin cut into 37 named parts, each its own mesh, so model.parts.<zone>.visible:false hides it.
Limbs are cut by straight PLANES square to their bones (bisected through the mesh, so seams are clean rings, no zigzag):
  hand = wrist + 6 cm up the forearm, then split three ways by hands.py: wrist_ (to the wrist joint) | palm_ (to the knuckles,
  thumb to its MCP) | fingers_ (past the knuckles), so a fingerless glove hides wrist + palm and leaves the fingers; foot = ankle + 9 cm up the shin; thigh | knee | shin at the T1 pant hems minus 2 cm give.
The torso is cut by measured landmarks: upperchest / breast_l / cleavage / breast_r / chest (under-bust strip) / belly / waist /
pelvis in front, upperback behind; shoulder_ = clavicle-weighted skin; head and neck by their bones.
Then the ARMHOLE RING (sector()): side_ (ribs under the arm), armpit_front_ (pec edge by the arm), armpit_back_ (shoulder-blade edge)
are cut out of the torso zones by angle round the torso and reach out from its centre, so a sleeveless top hides the centre
zones and leaves the armhole ring drawn. Same logic for every body, different numbers for a full bust (RING['full']): there the
breast never gives faces to the front ring, the ring starts above the bust, and the side band is narrower.
Every length is a T1 metre times S (this body's neck height / T1's)."""
import bpy, bmesh, math, numpy as np, collections
from mathutils import Vector
from . import hands

ZONES = ['head', 'neck', 'upperchest', 'breast_l', 'breast_r', 'cleavage', 'chest', 'upperback', 'belly', 'waist', 'pelvis',
         'shoulder_l', 'shoulder_r', 'upperarm_l', 'upperarm_r', 'forearm_l', 'forearm_r', 'wrist_l', 'wrist_r', 'palm_l', 'palm_r', 'fingers_l', 'fingers_r',
         'thigh_l', 'thigh_r', 'knee_l', 'knee_r', 'shin_l', 'shin_r', 'foot_l', 'foot_r',
         'side_l', 'side_r', 'armpit_front_l', 'armpit_front_r', 'armpit_back_l', 'armpit_back_r']
TORSO_RING = ('upperchest', 'breast_l', 'breast_r', 'cleavage', 'chest', 'upperback')
# theta: degrees round the torso from straight front (0) to straight back (180); u: |x| / torso half-width at that height;
# heights in S-metres off the armpit (a) or the under-bust strip's bottom (c). Tuned on man-v2 (flat) and woman-v5 (full) 2026-11-05.
RING = {
    'flat': dict(side=(68, 118, ('c', 0), ('a', 0.03)), front=(68, 0.72, ('a', -0.03), ('a', 0.14), ('breast_l', 'breast_r', 'upperchest')),
                 back=(118, 0.56, ('a', -0.03), ('a', 0.14))),
    'full': dict(side=(72, 118, ('c', 0), ('a', 0.03)), front=(72, 0.62, ('a', 0.06), ('a', 0.10), ('upperchest',)),
                 back=(118, 0.56, ('a', -0.04), ('a', 0.10))),
}
# the same numbers the T1 cage hems use (cage u: hip 0, knee 1, ankle 2)
HEM = dict(shorts=0.45, knee=1.12)
GIVE = 0.02; HAND = 0.06; FOOT = 0.09; CLEAV = 0.035; UPCHEST = 0.06; UNDER = 0.05

def nrm(v):
    n = np.linalg.norm(v); return v / n if n > 1e-9 else v

def planes(body):
    J = body.rig.J; S = body.S; P = {}
    for s in 'LR':
        sh, el, wr = J[f'shoulder.{s}'], J[f'elbow.{s}'], J[f'wrist.{s}']
        fa = nrm(wr - el); P[f'hand.{s}'] = (wr - fa * HAND * S, fa)
        hp, kn, an = J[f'hip.{s}'], J[f'knee.{s}'], J[f'ankle.{s}']
        th = nrm(kn - hp); sn = nrm(an - kn)
        P[f'foot.{s}'] = (an - sn * FOOT * S, sn)
        P[f'shorts.{s}'] = (hp + (kn - hp) * HEM['shorts'] - th * GIVE * S, th)
        P[f'kneehem.{s}'] = (kn + (an - kn) * (HEM['knee'] - 1) - sn * GIVE * S, sn)
    return P

def classify(body, P, p, k, geo=()):
    L = body.L; S = body.S; J = body.rig.J
    side = k[-1] if k[-2:] in ('.L', '.R') else ('L' if p[0] > 0 else 'R')
    sl = side.lower(); r = k.split('.')[0]
    if r.startswith('finger'): r = 'hand'
    # GEOMETRIC FALLBACKS: an auto-rigger (Mixamo) paints the neck onto Head/Spine2 and gives the clavicle a sliver, so a zone
    # read off weights comes back empty or thin. run() retries with these when it does: the neck is the column between the
    # neck base and the head joint; the shoulder is the cap within reach of the shoulder joint, above the armpit.
    if 'neck' in geo and r in ('head', 'neck', 'spine', 'chest', 'clavicle', 'none'):
        hd = J['head']
        if L['neckBase'] - 0.01 * S <= p[2] <= hd[2] + 0.015 * S and math.hypot(p[0] - hd[0], p[1] - hd[1]) < 0.075 * S: return 'neck'
    if 'shoulder' in geo and r in ('clavicle', 'upperarm', 'spine', 'chest', 'neck', 'none'):
        sh = J['shoulder.' + side]
        if np.linalg.norm(p - sh) < 0.10 * S and p[2] > L['armpit'] and abs(p[0]) > abs(J['neckBase'][0]) + 0.07 * S:
            return 'shoulder_' + sl
    if r == 'head': return 'head'
    if r == 'neck': return 'neck'
    if r == 'clavicle': return 'shoulder_' + sl
    if r in ('upperarm', 'forearm', 'hand'):
        o, n = P['hand.' + side]
        if np.dot(p - o, n) > 0: return 'hand_' + sl
        return ('upperarm_' if r == 'upperarm' else 'forearm_') + sl
    if r in ('thigh', 'shin', 'foot', 'toe') or (r == 'hips' and p[2] < L['crotch'] and abs(p[0]) > 0.02 * S):
        o, n = P['foot.' + side]
        if np.dot(p - o, n) > 0: return 'foot_' + sl
        o, n = P['kneehem.' + side]
        if np.dot(p - o, n) > 0: return 'shin_' + sl
        o, n = P['shorts.' + side]
        if np.dot(p - o, n) > 0: return 'knee_' + sl
        return 'thigh_' + sl
    # torso (spine / hips / unweighted)
    z = p[2]; front = p[1] < body.yc
    if z > L['armpit'] + UPCHEST * S: return 'upperchest' if front else 'upperback'
    if z >= L['underbust']:
        if not front: return 'upperback'
        return 'cleavage' if abs(p[0]) < CLEAV * S else 'breast_' + sl
    if z >= L['underbust'] - UNDER * S: return 'chest'
    if z >= L['waist'] + 0.03 * S: return 'belly'
    if z >= L['waist'] - 0.05 * S: return 'waist'
    return 'pelvis'

def sector(body, z0, c, hw, bust):
    """the armhole ring: re-zone one torso face (zone z0, centre c) into side_/armpit_front_/armpit_back_, or keep z0"""
    if z0 not in TORSO_RING: return z0
    L = body.L; S = body.S; R = RING[bust]; x, y, z = c
    h = lambda t: (L['armpit'] if t[0] == 'a' else L['underbust'] - UNDER * S) + t[1] * S
    th = math.degrees(math.atan2(abs(x), body.yc - y)); u = abs(x) / max(hw(z), 1e-6); sl = 'l' if x > 0 else 'r'
    a0, a1, lo, hi = R['side']
    if a0 <= th < a1 and h(lo) <= z < h(hi) and z0 != 'cleavage': return 'side_' + sl
    amax, umin, lo, hi, src = R['front']
    if th < amax and u >= umin and h(lo) <= z < h(hi) and z0 in src: return 'armpit_front_' + sl
    amin, umin, lo, hi = R['back']
    if th >= amin and u >= umin and h(lo) <= z < h(hi) and z0 == 'upperback': return 'armpit_back_' + sl
    return z0

def run(body, DOC, a):
    S = body.S
    # 1. one skinned mesh (the source meshes joined; materials kept)
    bpy.ops.object.select_all(action='DESELECT')
    for o in body.skin: o.select_set(True)
    bpy.context.view_layer.objects.active = body.skin[0]
    if len(body.skin) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = 'BWBody'
    me = ob.data; GN = {g.index: g.name for g in ob.vertex_groups}
    key = {i: body.rig.key(n) for i, n in GN.items()}
    P = planes(body)
    bm = bmesh.new(); bm.from_mesh(me)
    dl = bm.verts.layers.deform.verify()
    M = np.array(ob.matrix_world); Mi = np.linalg.inv(M)
    def vkey(v):
        w = {}
        for g, x in v[dl].items():
            kk = key.get(g, 'none'); w[kk] = w.get(kk, 0) + x
        return max(w, key=w.get) if w else 'none'
    def fam(kk, s):
        r = kk.split('.')[0]
        return (kk.endswith('.' + s) and r in ('upperarm', 'forearm', 'hand')) if s[0] == 'a' else None
    # 2. straight cuts: each plane bisects only its own limb's faces
    cuts = []
    for s in 'LR':
        cuts += [(f'hand.{s}', ('upperarm', 'forearm', 'hand', 'finger1', 'finger2', 'finger3', 'finger4', 'finger5'), s), (f'foot.{s}', ('thigh', 'shin', 'foot', 'toe'), s),
                 (f'kneehem.{s}', ('thigh', 'shin', 'foot', 'toe'), s), (f'shorts.{s}', ('thigh', 'shin', 'hips'), s)]
    nb = 0
    for name, roles, s in cuts:
        bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
        vk = {v.index: vkey(v) for v in bm.verts}
        o, n = P[name]
        lo = (Mi @ np.append(o, 1))[:3]; ln = nrm(Mi[:3, :3] @ n)
        geom = set()
        for f in bm.faces:
            ks = [vk[v.index] for v in f.verts]
            if all(kk.split('.')[0] in roles and (kk.endswith('.' + s) or (kk == 'hips' and (np.sign((M @ np.append(np.array(v.co), 1))[0]) == (1 if s == 'L' else -1)))) for kk, v in zip(ks, f.verts)):
                d = [np.dot(np.array(v.co) - lo, ln) for v in f.verts]
                if min(d) < 0 < max(d) and max(abs(x) for x in d) < 0.25 * S:
                    geom.add(f); geom.update(f.edges); geom.update(f.verts)
        if geom:
            r = bmesh.ops.bisect_plane(bm, geom=list(geom), plane_co=Vector(lo), plane_no=Vector(ln), dist=1e-6)
            nb += len([g for g in r['geom_cut'] if isinstance(g, bmesh.types.BMVert)])
    print('BODYWORKS T0: plane cuts added %d seam verts' % nb)
    # 2b. the hand's own cuts (wrist joint, each knuckle, the thumb's MCP), over the faces the hand plane put in the hand
    HP = {s: hands.planes(body.rig.J, s, S) for s in 'LR'}
    for s in 'LR':
        bm.faces.ensure_lookup_table()
        hf = []
        for f in bm.faces:
            w = {}
            for v in f.verts:
                for g, x in v[dl].items():
                    kk = key.get(g, 'none'); w[kk] = w.get(kk, 0) + x
            kk = max(w, key=w.get) if w else 'none'
            c = (M @ np.append(np.array(f.calc_center_median()), 1))[:3]
            if classify(body, P, c, kk) == 'hand_' + s.lower(): hf.append(f)
        thumbf = lambda f, s=s: (lambda w: (max(w, key=w.get) if w else '').startswith('finger1'))(
            {kk: sum(x for g, x in v[dl].items() if key.get(g, 'none') == kk) for v in f.verts for kk in {key.get(g, 'none') for g in v[dl].keys()}})
        hands.split(bm, hf, M, HP[s], lambda f: 'thumb' if thumbf(f) else '')
    # 3. a zone for every face, from its centre and its summed weights
    bm.faces.ensure_lookup_table()
    ZI = {z: i for i, z in enumerate(ZONES)}
    zl = bm.faces.layers.int.new('bw_zone')
    FK = []
    for f in bm.faces:
        w = {}
        for v in f.verts:
            for g, x in v[dl].items():
                kk = key.get(g, 'none'); w[kk] = w.get(kk, 0) + x
        FK.append((max(w, key=w.get) if w else 'none', (M @ np.append(np.array(f.calc_center_median()), 1))[:3]))
    def zone_all(geo):
        out = []
        for kk, c in FK:
            z = classify(body, P, c, kk, geo)
            if z.startswith('hand_'): z = hands.which(HP[z[-1].upper()], c, kk.startswith('finger1')) + z[-2:]
            out.append(z)
        return out
    ZF = zone_all(()); cnt = collections.Counter(ZF); NF = max(len(ZF), 1)
    # armhole ring: torso half-width per 1.5 cm band (99th pct of |x| over torso faces), bust read from the breast's reach forward
    tor = np.array([c for (kk, c), z in zip(FK, ZF) if z in TORSO_RING])
    bins = {}
    for c in tor: bins.setdefault(int(c[2] / 0.015), []).append(abs(c[0]))
    HW = {b: float(np.percentile(v, 99)) for b, v in bins.items()}
    hw = lambda zz: HW.get(int(zz / 0.015)) or max(HW.values())
    br = np.array([c for (kk, c), z in zip(FK, ZF) if z in ('breast_l', 'breast_r')]); ch = np.array([c for (kk, c), z in zip(FK, ZF) if z == 'chest'])
    reach = (ch[:, 1].min() - br[:, 1].min()) / body.S if len(br) and len(ch) else 0.0
    bust = getattr(a, 'bust', 'auto') or 'auto'
    if bust == 'auto': bust = 'full' if reach > 0.045 else 'flat'
    print('BODYWORKS T0 ring: bust reach %.3f m/S -> %s' % (reach, bust))
    ZF = [sector(body, z, c, hw, bust) for (kk, c), z in zip(FK, ZF)]; cnt = collections.Counter(ZF)
    # shares measured on NB (MakeHuman weights): neck 0.9 %, each shoulder 3.4 %. Well under = the rig's weights don't carry that zone
    geo = tuple(g for g, low in (('neck', cnt['neck'] < 0.004 * NF), ('shoulder', min(cnt['shoulder_l'], cnt['shoulder_r']) < 0.026 * NF)) if low)
    if geo:
        print('BODYWORKS T0: weights too thin for %s (neck %.1f%%, shoulders %.1f/%.1f%%): cut by geometry instead' % (', '.join(geo), 100 * cnt['neck'] / NF, 100 * cnt['shoulder_l'] / NF, 100 * cnt['shoulder_r'] / NF))
        ZF = [sector(body, z, c, hw, bust) for (kk, c), z in zip(FK, zone_all(geo))]; cnt = collections.Counter(ZF)
    for f, z in zip(bm.faces, ZF): f[zl] = ZI[z]
    bm.to_mesh(me); bm.free()
    # 4. one mesh per zone
    zobj = {}
    for z in ZONES:
        if cnt[z] == 0: continue
        bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_mode(type='FACE'); bpy.ops.mesh.select_all(action='DESELECT')
        bme = bmesh.from_edit_mesh(ob.data); lay = bme.faces.layers.int['bw_zone']; n = 0
        for f in bme.faces:
            f.select = f[lay] == ZI[z]; n += f.select
        bmesh.update_edit_mesh(ob.data)
        if n == len(bme.faces):
            bpy.ops.object.mode_set(mode='OBJECT'); po = ob
        else:
            bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
            po = [o for o in bpy.context.selected_objects if o != ob][0]
        po.name = z; po.data.name = z; zobj[z] = po
    if 'BWBody' in bpy.data.objects and bpy.data.objects['BWBody'].data.polygons.__len__() == 0:
        bpy.data.objects.remove(bpy.data.objects['BWBody'])
    missing = [z for z in ZONES if z not in zobj]
    print('BODYWORKS T0 zones:', {z: cnt[z] for z in ZONES}, 'missing', missing)
    # side check: every _l zone sits at +X
    bad = []
    for z, o in zobj.items():
        if z[-2:] in ('_l', '_r'):
            xs = np.array([(o.matrix_world @ v.co).x for v in o.data.vertices])
            if (xs.mean() > 0) != (z[-1] == 'l'): bad.append(z)
    if bad: raise SystemExit('BODYWORKS T0: zones on the wrong side: ' + ', '.join(bad))
    body.skin = [zobj[z] for z in ZONES if z in zobj]; body.read()
    DOC['t0'] = {'zones': [z for z in ZONES if z in zobj], 'faces': {z: cnt[z] for z in ZONES}, 'missing': missing,
                 'cuts_m': {'hand': HAND * S, 'knuckle_reach': hands.KNUCKLE, 'thumb_mcp_reach': hands.THUMB_MCP, 'foot': FOOT * S, 'give': GIVE * S, 'cleavage': CLEAV * S}, 'ring': {'bust': bust, 'reach': float(reach), 'rules': RING[bust]},
                 'planes': {k: {'at': [float(x) for x in o], 'normal': [float(x) for x in n]} for k, (o, n) in P.items()}}
    return zobj
