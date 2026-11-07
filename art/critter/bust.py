# Adds a "Bust" shape key to the female critter body and every top that covers the chest, so each NPC
# (and player) can wear its own bust size: morph Bust 0 = the body as built, 1 = fuller, -0.6 ≈ smaller.
import bpy, math, mathutils
SRC, OUT = '/workspace/art-tmp/body_f.glb', '/workspace/art-tmp/body_f_bust.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
body = bpy.data.objects['Body']; M = body.matrix_world
vs = [M @ v.co for v in body.data.vertices]
# the chest: the front-most band between the ribs and the collarbone
best = None
for zi in range(80, 96):
    z = zi / 100
    band = [v for v in vs if abs(v.z - z) < 0.006 and 0.03 < abs(v.x) < 0.11 and v.y < 0]
    if band:
        f = min(band, key=lambda v: v.y)
        if best is None or f.y < best[1]: best = (z, f.y, abs(f.x))
CZ, CY, CX = best; print('CHEST', best)
R = 0.075   # falloff radius (m)
def key(o):
    Mw = o.matrix_world; Mi = Mw.inverted()
    if not o.data.shape_keys: o.shape_key_add(name='Basis', from_mix=False)
    k = o.shape_key_add(name='Bust', from_mix=False); n = 0
    for i, v in enumerate(o.data.vertices):
        p = Mw @ v.co
        if p.y > 0.02: continue   # back half untouched
        w = 0
        for sx in (-1, 1):
            d = math.dist((p.x, p.z), (sx * CX, CZ))
            w = max(w, math.exp(-(d / R) ** 2 * 2.2))
        if w < 0.02: continue
        front = max(0.0, min(1.0, (0.02 - p.y) / 0.08))
        sx = 1 if p.x >= 0 else -1
        off = mathutils.Vector((sx * 0.012 * w, -0.045 * w * front, -0.008 * w))
        k.data[i].co = Mi @ (p + off); n += 1
    print('KEY', o.name, n)
key(body)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith('Top_') or o.name in ('Bot_overalls', 'Neck_scarf', 'Neck_bowtie'):
        if o.type == 'MESH': key(o)
# proof: side view, base vs full
scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.samples = 8
scene.render.resolution_x = scene.render.resolution_y = 500
for o in bpy.data.objects:
    if o.type == 'MESH': o.hide_render = not (o.name in ('Body', 'Top_tee'))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.location = (1.4, -0.6, 0.85); cam.rotation_euler = (math.radians(90), 0, math.radians(68)); cam.data.lens = 70
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); scene.collection.objects.link(sun); sun.rotation_euler = (0.9, 0.3, 1.2); sun.data.energy = 4
w = bpy.data.worlds.new('w'); scene.world = w; w.color = (0.5, 0.5, 0.55)
for val, nm in ((0, 'a'), (1, 'b')):
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.shape_keys and 'Bust' in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks['Bust'].value = val
    scene.render.filepath = f'/tmp/bust/{nm}.png'; bpy.ops.render.render(write_still=True)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.data.shape_keys: o.data.shape_keys.key_blocks['Bust'].value = 0
    o.hide_render = False
bpy.ops.export_scene.gltf(filepath=OUT, export_morph=True, export_skins=True, export_animations=False)
print('DONE')
