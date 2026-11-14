# splits the two Tripo market stalls into props: frame+counter, tarp roof, counter goods, ground clutter
import bpy, mathutils, sys, os, json
OUT = "/workspace/stall/out"; os.makedirs(OUT, exist_ok=True)
rep = {}
for f in [sys.argv[-1]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/stall/{f}.glb")
    o = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.parent = None
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    parts = [p for p in bpy.context.scene.objects if p.type == "MESH"]
    def bb(p):
        vs = [p.matrix_world @ v.co for v in p.data.vertices]
        return mathutils.Vector([min(v[i] for v in vs) for i in range(3)]), mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
    B = {p.name: bb(p) for p in parts}
    zmin = min(b[0].z for b in B.values()); zmax = max(b[1].z for b in B.values()); H = zmax - zmin
    xs = [b[0].x for b in B.values()] + [b[1].x for b in B.values()]; ys = [b[0].y for b in B.values()] + [b[1].y for b in B.values()]
    # the counter top: the widest island's top below 70% height
    big = sorted(((b[1]-b[0]).x*(b[1]-b[0]).y, n) for n, b in B.items() if b[1].z < zmin + 0.7*H)
    groups = {"frame": [], "tarp": [], "goods": [], "clutter": []}
    # tarp: the island with the highest top that spans wide, plus everything sitting wholly above 72%
    for n, b in B.items():
        s = b[1] - b[0]; lo = (b[0].z - zmin)/H; hi = (b[1].z - zmin)/H; mx = max(s)/H
        if lo > 0.66 and s.z/H < 0.3: g = "tarp"
        elif s.z/H > 0.45 or mx > 0.35: g = "frame"
        elif lo > 0.35 and hi < 0.72: g = "goods"
        elif lo < 0.06 and mx < 0.3: g = "clutter"
        else: g = "frame"
        groups[g].append(n)
    rep[f] = {k: len(v) for k, v in groups.items()}; rep[f]["H"] = H
    objs = {}
    for g, names in groups.items():
        if not names: continue
        bpy.ops.object.select_all(action="DESELECT")
        for n in names: bpy.data.objects[n].select_set(True)
        bpy.context.view_layer.objects.active = bpy.data.objects[names[0]]
        bpy.ops.object.join(); j = bpy.context.view_layer.objects.active; j.name = f"{f}_{g}"; objs[g] = j
    # the tarp is welded to the beams: carve it from the frame by face colour above the eave
    fr = objs["frame"]; me = fr.data
    img = next(n.image for m in me.materials for n in m.node_tree.nodes if n.type == "TEX_IMAGE")
    import numpy as np; W, Hh = img.size; px = np.empty(W*Hh*4, dtype=np.float32); img.pixels.foreach_get(px)
    uv = me.uv_layers.active.data
    import colorsys
    for p in me.polygons:
        z = (fr.matrix_world @ p.center).z
        u = sum(uv[l].uv[0] for l in p.loop_indices)/p.loop_total; v = sum(uv[l].uv[1] for l in p.loop_indices)/p.loop_total
        i = (int((v % 1)*(Hh-1))*W + int((u % 1)*(W-1)))*4; r, g, b = (float(x) for x in px[i:i+3])
        h, sat, val = colorsys.rgb_to_hsv(r, g, b)
        wood = 0.02 < h < 0.13 and sat > 0.3 and val < 0.55
        p.select = (z - zmin)/H > 0.62 and not wood
    bpy.ops.object.select_all(action="DESELECT"); fr.select_set(True); bpy.context.view_layer.objects.active = fr
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.separate(type="SELECTED"); bpy.ops.object.mode_set(mode="OBJECT")
    t = [o for o in bpy.context.selected_objects if o != fr][0]; t.name = f"{f}_tarp"; objs["tarp"] = t
    # the stall's own origin: bottom centre of the frame, shared by every part so they reassemble at one feetPosition
    fb = bb(objs["frame"]); ox, oy = (fb[0].x+fb[1].x)/2, (fb[0].y+fb[1].y)/2
    for g, j in objs.items():
        j.data.transform(mathutils.Matrix.Translation((-ox, -oy, -zmin)))
        bpy.ops.object.select_all(action="DESELECT"); j.select_set(True); bpy.context.view_layer.objects.active = j
        bpy.ops.object.shade_smooth()
        bpy.ops.export_scene.gltf(filepath=f"{OUT}/{f}_{g}.glb", use_selection=True, export_apply=True)
        b = bb(j); rep[f][g+"_box"] = [round(x, 3) for x in (*b[0], *b[1])]
    # proof: each group alone, side by side
    s = bpy.context.scene; s.render.engine = "CYCLES"; s.cycles.samples = 8; s.render.resolution_x = 1400; s.render.resolution_y = 420
    w = bpy.data.worlds.new("w"); s.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 2.5
    for i, (g, j) in enumerate(objs.items()): j.location.x = i * H * 1.3
    c = bpy.data.objects.new("c", bpy.data.cameras.new("c")); s.collection.objects.link(c); s.camera = c; c.data.type = "ORTHO"; c.data.ortho_scale = H*1.3*len(objs)
    mid = mathutils.Vector((H*1.3*(len(objs)-1)/2, 0, H*0.45)); c.location = mid + mathutils.Vector((H*0.8, -H*3, H*0.9)); c.rotation_euler = (mid - c.location).to_track_quat('-Z','Y').to_euler()
    s.render.filepath = f"/tmp/split_{f}.png"; bpy.ops.render.render(write_still=True)
print("REP", json.dumps(rep))
