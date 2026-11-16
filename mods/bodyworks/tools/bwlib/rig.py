"""BodyWorks rig reader: any humanoid armature -> canonical roles and joints.
Every later stage speaks ROLES (hips, spine, chest, neck, head, clavicle, upperarm, forearm, hand, finger,
thigh, shin, foot, toe) and SIDES (L = the body's left = +X in Blender after facing -Y), never a rig's own names."""
import re, json, os, math
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALIAS = json.load(open(os.path.join(HERE, '..', 'data', 'bonemap.json')))

def norm(name):
    """strip a rig's prefix: 'mixamorig:', 'DEF-', 'J_Bip_', 'CC_Base_', 'Bip01 ', 'rig_' ... only when a separator follows it,
    so 'Right' keeps its 'Rig' (that bug once hid every Mixamo right-side bone)"""
    n = name.split(':')[-1].split('|')[-1]
    return re.sub(r'(?i)^(def|org|mch|drv|j_bip|j_sec|bip0?1|bip|mixamorig\d*|cc_base|rig)[ _.\-]+', '', n)

def split_side(n):
    """-> (side 'L'|'R'|None, name with the side token removed)"""
    for rx, s in ((r'^(left|l)(?=[A-Z])', None), ):
        pass
    m = re.match(r'^(Left|Right)(?=[A-Z_.\- ]|$)', n)
    if m: return ('L' if m.group(1) == 'Left' else 'R'), n[m.end():]
    m = re.search(r'(Left|Right)$', n)
    if m: return ('L' if m.group(1) == 'Left' else 'R'), n[:m.start()]
    m = re.match(r'^([LRClrc])[._\- ]', n)
    if m: return ({'l':'L','r':'R'}.get(m.group(1).lower())), n[2:]
    m = re.search(r'[._\- ]([LRlr])(\d*)$', n)
    if m: return m.group(1).upper(), n[:m.start()] + m.group(2)
    m = re.search(r'[._\- ]([LRlr])[._\- ]', n)
    if m: return m.group(1).upper(), n[:m.start()] + '_' + n[m.end():]
    m = re.search(r'(?i)(^|[._\- ])(left|right)([._\- ]|$)', n)
    if m: return ('L' if m.group(2).lower() == 'left' else 'R'), n[:m.start()] + '_' + n[m.end():]
    m = re.match(r'^([lr])(?=[A-Z])', n)
    if m: return m.group(1).upper(), n[1:]
    return None, n

def role_of(n):
    """n: side-free name -> (role, finger index 1..5 or 0); None = not a body part (hair, skirt, breast, face, prop)"""
    low = re.sub(r'[^a-z0-9]', '', n.lower())
    for rx in ALIAS['ignore']:
        if re.search(rx, low): return None, 0
    for f, words in ALIAS['fingers'].items():
        for w in words:
            if re.search(w, low): return 'finger', int(f)
    for role in ALIAS['order']:
        for w in ALIAS['roles'][role]:
            if re.search(w, low): return role, 0
    return None, 0

class Rig:
    def __init__(self, arm, skin_objs):
        self.arm = arm; self.mw = arm.matrix_world.copy()
        B = arm.data.bones; self.B = B
        self.role = {}; self.side = {}; self.finger = {}
        self.weighted = set()
        for o in skin_objs or []:
            gi = {g.index: g.name for g in o.vertex_groups}
            for v in o.data.vertices:
                for g in v.groups:
                    if g.weight > 0.01 and g.group in gi: self.weighted.add(gi[g.group])
        for b in B:
            s, n = split_side(norm(b.name)); r, f = role_of(n)
            if r is None: continue
            if r in ('clavicle','upperarm','forearm','hand','finger','thigh','shin','foot','toe') and s is None:
                x = (self.mw @ b.head_local).x
                s = 'L' if x > 0 else 'R'   # unnamed side: read it off the body (left = +X)
            self.role[b.name] = r; self.side[b.name] = s; self.finger[b.name] = f
        # unmapped deform bones inherit the role of their nearest mapped ancestor (twist, roll, breast, skirt -> hips/chest...)
        self.inherit = {}
        for b in B:
            p = b; while_guard = 0
            while p is not None and p.name not in self.role and while_guard < 64: p = p.parent; while_guard += 1
            if p is not None and b.name not in self.role:
                self.inherit[b.name] = (self.role[p.name], self.side[p.name], self.finger[p.name])
        self.pick_chain()

    def P(self, name, tail=False):
        b = self.B[name]; return np.array(self.mw @ (b.tail_local if tail else b.head_local))

    def bones_of(self, role, side=None, finger=None, inherit=True):
        out = [n for n, r in self.role.items() if r == role and (side is None or self.side[n] == side) and (finger is None or self.finger[n] == finger)]
        if inherit:
            out += [n for n, (r, s, f) in self.inherit.items() if r == role and (side is None or s == side) and (finger is None or f == finger)]
        return out

    def depth(self, name):
        d = 0; b = self.B[name]
        while b.parent: d += 1; b = b.parent
        return d

    def main(self, role, side=None):
        c = [n for n, r in self.role.items() if r == role and (side is None or self.side[n] == side)]
        if len(c) > 1 and self.weighted:
            w = [n for n in c if n in self.weighted]   # a UE/game 'root' at the floor carries no skin: the weighted one is the real joint
            if w: c = w
        return min(c, key=self.depth) if c else None

    def pick_chain(self):
        J = {}; M = {}; miss = []
        for r in ('hips','neck','head'):
            M[r] = self.main(r)
        sp = sorted([n for n, r in self.role.items() if r in ('spine','chest')], key=self.depth)
        M['spine'] = sp
        for s in 'LR':
            for r in ('clavicle','upperarm','forearm','hand','thigh','shin','foot','toe'):
                M[f'{r}.{s}'] = self.main(r, s)
            for f in range(1, 6):
                M[f'finger{f}.{s}'] = sorted([n for n in self.role if self.role[n] == 'finger' and self.side[n] == s and self.finger[n] == f], key=self.depth)
        need = ['hips','head','upperarm.L','forearm.L','hand.L','thigh.L','shin.L','foot.L','upperarm.R','forearm.R','hand.R','thigh.R','shin.R','foot.R']
        miss = [k for k in need if not M.get(k)]
        if miss: raise SystemExit('BODYWORKS RIG: cannot find ' + ', '.join(miss) + ' -- add the rig\'s bone names to data/bonemap.json (see skills/bodyworks.md, step 1)')
        if not M.get('neck'):   # some rigs go spine -> head
            M['neck'] = None
        self.M = M
        g = lambda k: self.P(M[k])
        for s in 'LR':
            J[f'shoulder.{s}'] = g(f'upperarm.{s}'); J[f'elbow.{s}'] = g(f'forearm.{s}'); J[f'wrist.{s}'] = g(f'hand.{s}')
            J[f'hip.{s}'] = g(f'thigh.{s}'); J[f'knee.{s}'] = g(f'shin.{s}'); J[f'ankle.{s}'] = g(f'foot.{s}')
            J[f'ball.{s}'] = g(f'toe.{s}') if M.get(f'toe.{s}') else self.P(M[f'foot.{s}'], tail=True)
            for f in range(1, 6):
                ch = M[f'finger{f}.{s}']
                if ch: J[f'finger{f}.{s}'] = [self.P(n) for n in ch] + [self.P(ch[-1], tail=True)]
        J['hips'] = g('hips'); J['head'] = g('head')
        J['neckBase'] = g('neck') if M['neck'] else (J['head'] + (J['shoulder.L'] + J['shoulder.R']) / 2) / 2 - np.array([0, 0, 0.03])
        J['spine'] = [self.P(n) for n in M['spine']]
        self.J = J
        # sanity: left is +X
        if J['shoulder.L'][0] < J['shoulder.R'][0]:
            raise SystemExit('BODYWORKS RIG: the rig\'s L side stands at -X. The body faces +Y or its sides are named swapped; bw.py --flip turns it')

    def report(self):
        M = self.M
        return {'main': {k: v for k, v in M.items()}, 'mapped': len(self.role), 'inherited': len(self.inherit),
                'unmapped': [b.name for b in self.B if b.name not in self.role and b.name not in self.inherit]}

    # role key used by zones / cages for a weight bone
    def key(self, bone):
        if bone in self.role: r, s, f = self.role[bone], self.side[bone], self.finger[bone]
        elif bone in self.inherit: r, s, f = self.inherit[bone]
        else: return 'none'
        if r in ('spine','chest'): return 'spine'
        if r == 'finger': return 'finger%d.%s' % (f, s)
        if r == 'hips': return 'hips'
        return r + ('.' + s if s else '')
