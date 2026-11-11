# Tripo cat body preview (Shelly #206589/#206618). CHEST: bust push, a bit fuller, PG and cartoonish (#205392, 13:11 "a bit bigger").
import bpy, math, os, mathutils
from mathutils import Vector
SRC = os.environ.get("BODY", "/workspace/tripo-cat/cat-body.glb"); CHEST = float(os.environ.get("CHEST", "1"))
OUT = "/workspace/art/critter-cute/proof"; os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
ms = [o for o in bpy.data.objects if o.type == "MESH"]
pts = [o.matrix_world @ v.co for o in ms for v in o.data.vertices]
zmin = min(p.z for p in pts); zmax = max(p.z for p in pts); h = zmax - zmin
# the torso band: find the narrowest-width row under the head to locate the chest front
def band(z0, z1): return [p for p in pts if z0 < p.z < z1 and abs(p.y) < .03]
cz = zmin + h * float(os.environ.get("CZ", ".47"))
row = band(cz - .004, cz + .004); fx = max(p.x for p in row) if row else .03
print("CHEST z", round(cz, 4), "front x", round(fx, 4), "h", round(h, 4))
R = h * .05; A = h * .05 * CHEST; SX = h * .07
for o in ms:
    mw = o.matrix_world; inv = mw.inverted()
    for v in o.data.vertices:
        p = mw @ v.co
        if p.x < fx - h * .07: continue
        for s in (-1, 1):
            c = Vector((fx, s * SX * .5, cz))
            d2 = ((p.y - c.y) ** 2 + ((p.z - c.z) * 1.15) ** 2) / (R * R)
            if d2 > 4: continue
            w = math.exp(-d2 * 1.6) * max(0, 1 - (fx - p.x) / (h * .07))
            p = p + Vector((A * w, s * A * .15 * w, -A * .25 * w))
        v.co = inv @ p
    o.data.update()

# BACK: Shelly 13:13 "the back should be solid (its using the same color as the belly)": cream texels on back-facing torso and the tail go fur orange
import numpy as np
def base_image(o):
    for m in o.data.materials:
        bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        for l in m.node_tree.links:
            if l.to_socket == bsdf.inputs["Base Color"]:
                n = l.from_node
                while n.type != "TEX_IMAGE": n = n.inputs[0].links[0].from_node
                return n.image
for o in ms:
    img = base_image(o); W, H = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(H, W, 4)
    mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
    me = o.data; me.calc_loop_triangles(); uv = me.uv_layers.active.data
    tris = []
    for t in me.loop_triangles:
        c = mw @ t.center; n = (nm @ t.normal).normalized(); k = (c.z - zmin) / h
        tail = c.x < -.012 and k < .45
        if (n.x < -.15 and .2 < k < .56) or tail: tris.append([uv[l].uv[:] for l in t.loops])
    mask = np.zeros((H, W), bool)
    for T in tris:
        P = np.array(T) * [W, H]
        x0, y0 = np.floor(P.min(0)).astype(int) - 1; x1, y1 = np.ceil(P.max(0)).astype(int) + 1
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 <= x0 or y1 <= y0: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        (ax, ay), (bx, by), (cx_, cy_) = P
        d = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
        if abs(d) < 1e-9: continue
        l1 = ((by - cy_) * (X - cx_) + (cx_ - bx) * (Y - cy_)) / d; l2 = ((cy_ - ay) * (X - cx_) + (ax - cx_) * (Y - cy_)) / d; l3 = 1 - l1 - l2
        e = -.08
        mask[y0:y1 + 1, x0:x1 + 1] |= (l1 >= e) & (l2 >= e) & (l3 >= e)
    rgb = px[..., :3]; mx = rgb.max(-1); mn = rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-4)
    fur = mask & (sat > .45) & (mx > .3); cream = mask & (sat < .38) & (mx > .45)
    col = np.median(rgb[fur], axis=0)
    # keep the fur's own shading: scale the orange by the cream texel's brightness against the cream's median
    lum = mx[cream] / np.median(mx[cream])
    rgb[cream] = np.clip(col[None, :] * lum[:, None], 0, 1)
    px[..., :3] = rgb; img.pixels.foreach_set(px.ravel()); img.pack()
    print("BACK texels", int(cream.sum()), "fur", [round(float(v), 3) for v in col], "tris", len(tris))

sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.render.resolution_x = 420; sc.render.resolution_y = 560
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.85, .84, .82, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.2
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
L = bpy.data.objects.new("l", bpy.data.lights.new("l", "SUN")); sc.collection.objects.link(L); L.data.energy = 3
c = Vector((0, 0, zmin + h * .5))
for i, yaw in enumerate((0, 90, 45, 180, 135)):
    a = math.radians(yaw); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = c + d * 2.0 * h; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler(); L.rotation_euler = cam.rotation_euler
    sc.render.filepath = f"{OUT}/body_chest_{i}.png"; bpy.ops.render.render(write_still=True)
if os.environ.get("EXPORT"): bpy.ops.export_scene.gltf(filepath="/workspace/tripo-cat/cat-body-chest.glb", export_apply=True)
