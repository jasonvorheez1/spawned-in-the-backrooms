# Clean cloth pass on a shipped human body glb (Shelly Nov 9: "make the characters less creepy ... redoing all the clothes",
# "realistic clothing construction"). Runs last, after art/human-face/expressions.py: in.glb -> out.glb
#  1. every garment hem, cuff and collar is relaxed along itself: the face-pick sawtooth that read as torn cloth becomes a straight sewn edge
#  2. the cloth surface is smoothed with volume kept: lumps from the skin underneath (ribs, navel, bust seams) iron out into fabric
#  3. the change rides every shape key as a delta, so Bust and the face keys stay lined up
# blender -b --factory-startup --python-exit-code 1 --python art/human-cloth/tailor.py -- in.glb out.glb
import bpy, bmesh, sys
a = sys.argv[sys.argv.index("--") + 1:]; src, dst = a[0], a[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, bone_heuristic="BLENDER")
# per garment family: (boundary relax passes, surface smooth passes, smooth strength). Savi's picks
PLAN = {"Top_": (30, 6, 0.5), "Bot_pants": (20, 4, 0.4), "Bot_shorts": (20, 4, 0.4), "Bot_pjpants": (20, 5, 0.5), "Bot_overalls": (20, 4, 0.4),
        "Bot_skirt": (14, 2, 0.3), "Bot_longskirt": (14, 2, 0.3), "Under_": (16, 2, 0.3), "Neck_scarf": (10, 3, 0.4), "Neck_cape": (14, 2, 0.3)}
def plan(n): return next((v for k, v in PLAN.items() if n.startswith(k)), None)
moved = {}
for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    P = plan(o.name)
    if not P: continue
    me = o.data; nv = len(me.vertices)
    base = [v.co.copy() for v in me.vertices]
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    layer = bm.verts.layers.shape.get("Basis") if me.shape_keys else None
    co = lambda v: v[layer] if layer else v.co
    # 1. hems: relax each open edge loop along itself (a solidified rim has two loops per hem; both move the same way)
    B = [v for v in bm.verts if v.is_boundary]; Bs = set(B)
    for _ in range(P[0]):
        mv = {}
        for v in B:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary and e.other_vert(v) in Bs]
            if len(nb) == 2: mv[v] = co(v) * 0.5 + (co(nb[0]) + co(nb[1])) * 0.25
        for v, c in mv.items(): v.co = c.copy(); (layer and v.__setitem__(layer, c.copy()))
    # ease the row next to a hem toward it so the cuff doesn't kink
    for _ in range(4):
        for v in bm.verts:
            if v in Bs: continue
            nb = [e.other_vert(v) for e in v.link_edges]
            if any(w in Bs for w in nb):
                c = co(v) * 0.5 + sum((co(w) for w in nb), co(v) * 0) * (0.5 / len(nb))
                v.co = c.copy(); (layer and v.__setitem__(layer, c.copy()))
    # 2. surface: laplacian smooth, volume kept, hems pinned
    inner = [v for v in bm.verts if v not in Bs]
    for _ in range(P[1]):
        bmesh.ops.smooth_laplacian_vert(bm, verts=inner, lambda_factor=P[2], lambda_border=0.0, use_x=True, use_y=True, use_z=True, preserve_volume=True)
        if layer:
            for v in inner: v[layer] = v.co.copy()
    bm.to_mesh(me); bm.free()
    # 3. carry the move into every key
    d = [me.vertices[i].co - base[i] for i in range(nv)]
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            if kb.name == "Basis": continue
            for i in range(nv): kb.data[i].co = kb.data[i].co + d[i]
        for i in range(nv): me.shape_keys.key_blocks["Basis"].data[i].co = me.vertices[i].co
    for p in me.polygons: p.use_smooth = True
    moved[o.name] = round(max((x.length for x in d), default=0) * 1000, 1)
print("TAILORED", moved)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_morph=True, export_skins=True, export_animations=False)
