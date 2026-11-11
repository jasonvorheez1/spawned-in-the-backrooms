# Twintails for the new cats (Shelly #219050: "the twnitails especially are kinida bad").
# A swept cap of locks over the skull, a fringe, and two long pigtails tied high behind the ears with a scrunchie, falling past the shoulders.
# Reuses fluff.py's lock/grow (surface-rooted tapered locks, skinned to mixamorig:Head). One glb per sex, slot "hair" (tinted by look.hairc).
# blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/twintails.py [-- --proof]
import bpy, bmesh, math, os, random, sys
from mathutils import Vector
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fluff.py")).read()
exec(src[:src.index("def build(")])
exec(src[src.index("def proof("):src.index("KINDS =")])
OUT = "/workspace/cattwin"
globals()["OUT"] = OUT; os.makedirs(OUT + "/proof", exist_ok=True)

def build(sex, arm):
    H = bpy.data.objects["Head"]; hv = [H.matrix_world @ v.co for v in H.data.vertices]
    hb = bvh_of(H); rng = random.Random(3)
    sk = [v for v in hv if abs(v.x) < 0.2]; crown = max(v.z for v in sk); z0 = min(v.z for v in sk)
    C = Vector((0, sum(v.y for v in sk) / len(sk), (z0 + crown) / 2)); S = (crown - z0) / 0.45
    bm = bmesh.new()
    def hit(d):
        d = Vector(d).normalized(); h, n, _, _ = hb.ray_cast(C + d * 0.8, -d, 1.6); return h, n
    # cap: locks rooted along the crown part line, combed down over the skull and lying flat on it
    for i in range(22):
        a = (i / 21) * 2 - 1                      # -1 left .. 1 right
        for row, (fy, fz) in enumerate(((-0.25, 1), (0.25, 1), (0.6, 0.8))):
            h, n = hit((a * 0.9, fy, fz))
            if h is None: continue
            down = Vector((a * 0.9, 0.35 + fy * 0.4, -0.55)).normalized()
            d = (n * 0.18 + down * 0.82).normalized()
            lock(bm, h, d, 0.16 * S * rng.uniform(.85, 1.1), 0.05 * S, down * 1.4, 0, rng)
    # fringe: pointed bangs over the brow
    for x, L in ((-0.5, .75), (-0.3, 1), (-0.12, 1.15), (0.06, 1.05), (0.24, 1.1), (0.42, .85)):
        h, n = hit((x, -0.45, 1))
        if h is None: continue
        dv = Vector((x * 0.25, -0.5, -1)).normalized()
        lock(bm, h, (n * 0.15 + dv).normalized(), 0.28 * L * S, 0.055 * S, dv * 0.9, 0, rng)
    # pigtails: tied high at the back-sides of the skull, a fat bundle swinging out then falling
    for sx in (-1, 1):
        tie, n = hit((sx * 0.85, 0.55, 0.55))
        tie = tie + n * 0.012 * S
        for k in range(9):
            ang = k / 9 * 2 * math.pi; off = Vector((math.cos(ang) * 0.02, math.sin(ang) * 0.02, math.sin(ang) * 0.015)) * S
            d = Vector((sx * 0.8, 0.35, 0.2)).normalized()
            lock(bm, tie + off, d, (0.62 + 0.08 * math.sin(k * 2.3)) * S, 0.05 * S, Vector((sx * -0.25, 0.25, -1.9)), 0, rng, segs=9, ring=6)
        # scrunchie ring: a short fat torus of locks around the tie
        for k in range(10):
            ang = k / 10 * 2 * math.pi
            p = tie + Vector((math.cos(ang) * 0.028, 0, math.sin(ang) * 0.028)) * S
            lock(bm, p, Vector((sx, 0.2, 0)).normalized(), 0.05 * S, 0.03 * S, Vector((0, 0, 0)), 0, rng, segs=3)
    me = bpy.data.meshes.new("hair"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("hair", me); bpy.context.collection.objects.link(o)
    for p in me.polygons: p.use_smooth = True
    sub = o.modifiers.new("s", "SUBSURF"); sub.levels = 1
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.modifier_apply(modifier="s")
    mat = bpy.data.materials.new("hair"); mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.22, 0.15, 1)
    me.materials.append(mat)
    g = o.vertex_groups.new(name="mixamorig:Head"); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
    o.parent = arm; o.modifiers.new("skin", "ARMATURE").object = arm
    return o, len(me.polygons)

for sex in ("f", "m"):
    arm = load(sex); o, nf = build(sex, arm)
    for x in bpy.data.objects: x.select_set(False)
    o.select_set(True); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/twintails-{sex}.glb", use_selection=True, export_skins=True, export_animations=False)
    print("TWIN", sex, nf)
    if "--proof" in sys.argv: proof(sex, [o], f"twin-{sex}")
