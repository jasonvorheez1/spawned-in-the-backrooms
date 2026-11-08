# Level 2 kit, compaction pass: each module (from build.py's json, /workspace/l2kit/src/<part>.json) welded,
# decimated per RATIO, re-normalled by angle, and written to /workspace/l2kit/out/<part>.json for encode.py.
import bpy, bmesh, json, math, os, sys
RATIO = {"piperun": (0.5, 0.6), "tray": (0.65, 0.7), "wall": (0.9, 1.0)}
SRC, OUT = "/workspace/l2kit/src", "/workspace/l2kit/out"
os.makedirs(OUT, exist_ok=True)
parts = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [f[:-5] for f in os.listdir(SRC)]
def group(g, ratio):
    nv = len(g["p"]) // 3
    me = bpy.data.meshes.new("m")
    me.from_pydata([tuple(g["p"][v*3:v*3+3]) for v in range(nv)], [], [tuple(g["i"][k:k+3]) for k in range(0, len(g["i"]), 3)])
    uv = me.uv_layers.new(name="uv"); col = me.color_attributes.new("c", "FLOAT_COLOR", "CORNER")
    for li, lp in enumerate(me.loops):
        v = lp.vertex_index; uv.data[li].uv = (g["u"][v*2], g["u"][v*2+1]); col.data[li].color = (*g["c"][v*3:v*3+3], 1)
    ob = bpy.data.objects.new("o", me); bpy.context.scene.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006); bm.to_mesh(me); bm.free()
    if ratio < 1:
        m = ob.modifiers.new("d", "DECIMATE"); m.ratio = ratio; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier="d")
    me.set_sharp_from_angle(angle=math.radians(62)); me.calc_loop_triangles()
    uv = me.uv_layers["uv"].data; col = me.color_attributes["c"].data; cn = me.corner_normals
    P, N, U, C, I, seen = [], [], [], [], [], {}
    for t in me.loop_triangles:
        for li in t.loops:
            co = me.vertices[me.loops[li].vertex_index].co; n = cn[li].vector; u = uv[li].uv; c = col[li].color
            key = (*(round(x, 4) for x in co), *(round(x, 1) for x in n), *(round(x, 2) for x in u), *(round(x, 1) for x in c[:3]))
            if key not in seen:
                seen[key] = len(P) // 3; P += list(co); N += list(n); U += list(u); C += list(c[:3])
            I.append(seen[key])
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    return {"m": g["m"], "p": P, "n": N, "u": U, "c": C, "i": I}
for part in parts:
    d = json.load(open(f"{SRC}/{part}.json")); rh, rl = RATIO.get(part, (1, 1))
    out = {"hi": [group(g, rh) for g in d["hi"]], "lo": [group(g, rl) for g in d["lo"]]}
    json.dump(out, open(f"{OUT}/{part}.json", "w"))
    for k in ("hi", "lo"): print(part, k, sum(len(g["p"]) // 3 for g in d[k]), "->", sum(len(g["p"]) // 3 for g in out[k]), "verts,", sum(len(g["i"]) for g in out[k]) // 3, "tris")
