# Clean cloth pass on a shipped human body glb (Shelly Nov 9: "make the characters less creepy ... redoing all the clothes",
# "realistic clothing construction"). Runs last, after art/human-face/expressions.py: in.glb -> out.glb
# Works on the welded surface (a glTF splits vertices at every UV seam; those splits are not hems):
#  1. every true hem, cuff and collar loop is relaxed along itself: the face-pick sawtooth that read as torn cloth becomes a sewn edge
#  2. the cloth surface is Taubin-smoothed (no shrink): lumps from the skin underneath iron out into fabric
#  3. the move rides every shape key as a delta, so Bust and the face keys stay lined up
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/tailor.py -- in.glb out.glb
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
# family: (hem relax passes, taubin passes). Savi's picks
PLAN = {"Top_": (30, 8), "Bot_": (20, 5), "Under_": (14, 3), "Neck_scarf": (10, 4), "Neck_cape": (14, 3)}
def plan(n): return next((v for k, v in PLAN.items() if n.startswith(k)), None)
moved = {}
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    P = plan(o.name)
    if not P: continue
    me = o.data; V = me.vertices; nv = len(V)
    key = lambda c: (round(c.x * 2e4), round(c.y * 2e4), round(c.z * 2e4))
    gid = {}; G = []
    for i in range(nv):
        k = key(V[i].co)
        if k not in gid: gid[k] = len(G); G.append([])
        G[gid[k]].append(i)
    g_of = [gid[key(V[i].co)] for i in range(nv)]
    pos = [V[m[0]].co.copy() for m in G]; n = len(G)
    nbr = [set() for _ in range(n)]; ecount = {}
    for p in me.polygons:
        vs = [g_of[i] for i in p.vertices]
        for j in range(len(vs)):
            x, y = vs[j], vs[(j + 1) % len(vs)]
            if x == y: continue
            nbr[x].add(y); nbr[y].add(x); e = (min(x, y), max(x, y)); ecount[e] = ecount.get(e, 0) + 1
    bnb = [set() for _ in range(n)]
    for (x, y), c in ecount.items():
        if c == 1: bnb[x].add(y); bnb[y].add(x)
    # a solidified hem has no open edge: its rim is a crease loop. creases (faces meeting past 55 deg) count as hems too
    fn = {}
    for p in me.polygons:
        vs = [g_of[i] for i in p.vertices]
        for j in range(len(vs)):
            x, y = vs[j], vs[(j + 1) % len(vs)]
            if x != y: fn.setdefault((min(x, y), max(x, y)), []).append(p.normal.copy())
    for (x, y), ns in fn.items():
        if len(ns) == 2 and ns[0].dot(ns[1]) < 0.57: bnb[x].add(y); bnb[y].add(x)
    B = [g for g in range(n) if len(bnb[g]) == 2]; Bs = set(g for g in range(n) if bnb[g])
    p0 = [c.copy() for c in pos]
    for _ in range(P[0]):
        new = {g: pos[g] * 0.5 + (pos[list(bnb[g])[0]] + pos[list(bnb[g])[1]]) * 0.25 for g in B}
        for g, c in new.items(): pos[g] = c
    inner = [g for g in range(n) if g not in Bs and nbr[g]]
    def lap(f):
        new = {}
        for g in inner:
            s = Vector((0, 0, 0))
            for h in nbr[g]: s += pos[h]
            new[g] = pos[g] + (s / len(nbr[g]) - pos[g]) * f
        for g, c in new.items(): pos[g] = c
    for _ in range(P[1]): lap(0.5); lap(-0.53)
    d = [pos[g] - p0[g] for g in range(n)]
    for i in range(nv): V[i].co = V[i].co + d[g_of[i]]
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for i in range(nv): kb.data[i].co = kb.data[i].co + d[g_of[i]]
    for p in me.polygons: p.use_smooth = True
    moved[o.name] = (len(B), round(max((x.length for x in d), default=0) * 1000, 1))
print("TAILORED", moved)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
