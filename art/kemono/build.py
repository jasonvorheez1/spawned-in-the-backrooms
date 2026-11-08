# Kemono foundation bodies (Shelly #50108 + "make sure they can be outfitted"): a Tripo-rigged kemono base,
# turned to face -Y, scaled to the critter rig's hip height, bones renamed to the critter rig's names, its faces
# sorted by their painted colour into the critter material slots (fur/belly/limb/mark/pad/nose/eyewhite/eyeink),
# and every garment of the old critter body re-fitted onto it bone by bone, weights copied off the new skin.
# run: blender -b --factory-startup --python-exit-code 1 --python art/kemono/build.py -- <sex m|f> <rigged base glb> <old body glb> <out dir>
import bpy, bmesh, sys, math, json, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
A = sys.argv[sys.argv.index('--') + 1:]
SEX, NEWF, OLDF, OUT = A[0], A[1], A[2], A[3]
os.makedirs(OUT, exist_ok=True)
HIPS_Z = 0.64  # the critter rig's hip height: garments keep their bone-relative fit
REN = {'Spine1': 'Spine01', 'Spine2': 'Spine02', 'Neck': 'neck'}
# painted colour → slot, per base (Savi's picks from the two paintings)
PAL = {
  'm': [('fur', '#e9792f'), ('fur', '#d9662a'), ('belly', '#f6e6d6'), ('belly', '#ffffff'), ('limb', '#5c3a26'), ('limb', '#3e281c'), ('nose', '#121010'), ('inner', '#f2d0c2')],
  'f': [('fur', '#f3dfc4'), ('fur', '#ead2b2'), ('mark', '#d39a63'), ('mark', '#c58650'), ('pad', '#ec8c8c'), ('inner', '#e89a96'), ('nose', '#141012'), ('belly', '#fbf1e4'), ('under', '#a9a9ad'), ('under', '#8e8e94')],
}
COLS = {'fur': '#e9792f', 'belly': '#f6e6d6', 'limb': '#5c3a26', 'mark': '#d39a63', 'pad': '#ff9fb4', 'inner': '#f2b8b8', 'nose': '#141012', 'under': '#9a9aa0', 'eyewhite': '#fffaf2'}
def hexc(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
def lin(c): return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def imp(f):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f); new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'MESH' and not o.vertex_groups and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    return [o for o in bpy.data.objects if o not in before]
old = imp(OLDF)
oldRig = next(o for o in old if o.type == 'ARMATURE'); oldBody = next(o for o in old if o.name == 'Body')
garments = [o for o in old if o.type == 'MESH' and o.name.split('_')[0] in ('Top', 'Bot', 'Shoes', 'Hat', 'Eyew', 'Neck')]
new = imp(NEWF)
rig = next(o for o in new if o.type == 'ARMATURE')
parts = [o for o in new if o.type == 'MESH' and o.vertex_groups]
# one skin
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
if len(parts) > 1: bpy.ops.object.join()
body = parts[0]; body.name = 'Body'; body.data.name = 'Body'
# rename bones (and their vertex groups)
for b in rig.data.bones:
    n = b.name.replace('mixamorig:', ''); n = REN.get(n, n)
    vg = body.vertex_groups.get(b.name)
    b.name = n
    if vg: vg.name = n
# turn to face -Y (Tripo rigs face +X) and scale hips to HIPS_Z, feet on 0
hips = rig.matrix_world @ rig.data.bones['Hips'].head_local
s = HIPS_Z / hips.z
M = Matrix.Translation((0, 0, 0)) @ Matrix.Rotation(-math.pi / 2, 4, 'Z') @ Matrix.Scale(s, 4)
rig.matrix_world = M @ rig.matrix_world
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# centre on the hips in X/Y, lowest vertex on 0
dg = bpy.context.evaluated_depsgraph_get()
ws = [body.matrix_world @ v.co for v in body.data.vertices]
hp = rig.matrix_world @ rig.data.bones['Hips'].head_local
off = Vector((-hp.x, -hp.y, -min(w.z for w in ws)))
rig.location += off; bpy.ops.object.transform_apply(location=True)
print('height', round(max(w.z for w in ws) - min(w.z for w in ws), 3))

# ---- paint → slots: sample the base colour texture at each face's UV centre
mat0 = body.data.materials[0]
img = next(n.image for n in mat0.node_tree.nodes if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for l in n.outputs[0].links)) if any(n.type == 'TEX_IMAGE' for n in mat0.node_tree.nodes) else None
W, H = img.size; px = list(img.pixels[:])
def samp(u, v):
    x = min(W - 1, max(0, int((u % 1) * W))); y = min(H - 1, max(0, int((v % 1) * H))); i = (y * W + x) * 4
    return px[i:i + 3]
pal = [(k, lin(hexc(h))) for k, h in PAL[SEX]]
uv = body.data.uv_layers.active.data
slots = ['fur', 'belly', 'limb', 'mark', 'pad', 'inner', 'nose', 'eyewhite', 'under']
body.data.materials.clear()
for k in slots:
    m = bpy.data.materials.new(k); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*lin(hexc(COLS[k])), 1); b.inputs['Roughness'].default_value = 0.85
    body.data.materials.append(m)
cnt = {}
for p in body.data.polygons:
    cs = [samp(*uv[li].uv) for li in p.loop_indices]
    c = [sum(x[i] for x in cs) / len(cs) for i in range(3)]
    lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    sat = max(c) - min(c)
    # bright, colourless = eye white (only on the head); else the nearest painted colour
    hz = sum((body.data.vertices[vi].co.z for vi in p.vertices)) / len(p.vertices)
    if lum > 0.8 and sat < 0.06 and hz > 1.05: k = 'eyewhite'
    else: k = min(pal, key=lambda kv: sum((kv[1][i] - c[i]) ** 2 for i in range(3)))[0]
    p.material_index = slots.index(k); cnt[k] = cnt.get(k, 0) + 1
print('slots', cnt)
# bust shape key on the female (the critter's Bust morph slider)
def chest_key(o, centre_z, half):
    if not o.data.shape_keys: o.shape_key_add(name='Basis')
    k = o.shape_key_add(name='Bust'); bs = o.data.shape_keys.key_blocks['Basis']
    for i, v in enumerate(bs.data):
        p = v.co
        if p.y < -0.02 and abs(p.z - centre_z) < half and abs(p.x) < 0.2:
            f = (1 - abs(p.z - centre_z) / half) ** 1.5 * max(0, 1 - abs(abs(p.x) - 0.075) / 0.11)
            k.data[i].co = p + Vector((math.copysign(0.012, p.x) * f, -0.045 * f, -0.008 * f))
sp2 = rig.data.bones['Spine02']; chestZ = (rig.matrix_world @ sp2.head_local).z
if SEX == 'f': chest_key(body, chestZ + 0.01, 0.08)

# ---- garments: posed from the old rest onto the new one by their own bone weights (each bone's segment carried
# onto the new bone: along-bone scaled by length, across kept), then tight pieces shrink onto the new skin with a
# small gap and loose ones (dress, skirt, cape, hats, glasses) only pushed out where they sink in
def segs(r):
    return {b.name: (r.matrix_world @ b.head_local, r.matrix_world @ b.tail_local) for b in r.data.bones}
OS, NS = segs(oldRig), segs(rig)
FALL = {'EarL': 'Head', 'EarR': 'Head', 'Tail': 'Hips', 'Tail1': 'Hips', 'Root': 'Hips'}
def top_of(o, r):
    ws = [o.matrix_world @ v.co for v in o.data.vertices]; return max(w.z for w in ws) - (r.matrix_world @ r.data.bones['Head'].head_local).z
HEADK = top_of(body, rig) / (OS['Head'][1] - OS['Head'][0]).length  # the old body's head is its own model: its bone spans the skull  # a head is sized by the skull, not its short bone
print('head ratio', round(HEADK, 3))
def carry(n, p):
    h, t = OS[n]; h2, t2 = NS[n]; d, d2 = t - h, t2 - h2
    if n == 'Head': return h2 + (p - h) * HEADK
    L, L2 = d.length or 1e-6, d2.length or 1e-6; ax = d / L
    v = p - h; along = v.dot(ax); perp = v - ax * along
    q = d.normalized().rotation_difference(d2.normalized())
    return h2 + q @ (ax * along * (L2 / L) + perp)
LOOSE = ('Top_dress', 'Bot_skirt', 'Bot_longskirt', 'Neck_cape', 'Eyew_glasses', 'Eyew_shades') 
def refit(o):
    me = o.data; mw = o.matrix_world.copy()
    if me.shape_keys: o.shape_key_clear()
    gname = {g.index: FALL.get(g.name, g.name) for g in o.vertex_groups}
    for v in me.vertices:
        p = mw @ v.co; acc = Vector(); tw = 0
        for ge in v.groups:
            n = gname.get(ge.group)
            if n in OS and n in NS and ge.weight > 0: acc += carry(n, p) * ge.weight; tw += ge.weight
        v.co = acc / tw if tw else p
    for m in list(o.modifiers): o.modifiers.remove(m)
    o.parent = None; o.matrix_world = Matrix.Identity(4); me.update()
    bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    kind = o.name.split('_')[0]
    if kind in ('Top', 'Bot', 'Shoes', 'Neck', 'Hat') and o.name not in LOOSE:
        sw = o.modifiers.new('fit', 'SHRINKWRAP'); sw.target = body; sw.wrap_method = 'NEAREST_SURFACEPOINT'
        sw.wrap_mode = 'OUTSIDE' if kind in ('Hat', 'Neck') or o.name in ('Top_hoodie', 'Top_jacket', 'Top_sweater', 'Bot_overalls') else 'ON_SURFACE'
        sw.offset = 0.012 if kind in ('Top', 'Bot') else 0.008
        if sw.wrap_mode == 'OUTSIDE': sw.offset = 0.015
        bpy.ops.object.modifier_apply(modifier='fit')
        sm = o.modifiers.new('sm', 'CORRECTIVE_SMOOTH'); sm.iterations = 6; sm.smooth_type = 'LENGTH_WEIGHTED'; sm.use_only_smooth = True
        bpy.ops.object.modifier_apply(modifier='sm')
        sw = o.modifiers.new('fit2', 'SHRINKWRAP'); sw.target = body; sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.wrap_mode = 'OUTSIDE'; sw.offset = 0.01
        bpy.ops.object.modifier_apply(modifier='fit2')
    else:
        sw = o.modifiers.new('fit', 'SHRINKWRAP'); sw.target = body; sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.wrap_mode = 'OUTSIDE'; sw.offset = 0.01
        bpy.ops.object.modifier_apply(modifier='fit')
    # weights off the new skin
    o.vertex_groups.clear()
    dt = o.modifiers.new('w', 'DATA_TRANSFER'); dt.object = body; dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.datalayout_transfer(modifier='w'); bpy.ops.object.modifier_apply(modifier='w')
    o.parent = rig; am = o.modifiers.new('skin', 'ARMATURE'); am.object = rig
    for p in me.polygons: p.use_smooth = True
    if SEX == 'f' and (kind == 'Top' or o.name == 'Bot_overalls'): chest_key(o, chestZ + 0.01, 0.08)
for g in garments: refit(g)
# old critter out
for o in [oldRig, oldBody]: bpy.data.objects.remove(o, do_unlink=True)
for o in list(bpy.data.objects):
    if o.type == 'ARMATURE' and o is not rig: bpy.data.objects.remove(o, do_unlink=True)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o is not body and o not in garments: bpy.data.objects.remove(o, do_unlink=True)
for p in body.data.polygons: p.use_smooth = True

# ---- proof: base + one outfit, front and 3/4
def light(): 
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.75, 0.75, 0.78, 1)
    l = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); l.data.energy = 3; l.rotation_euler = (0.8, 0, -0.5); sc.collection.objects.link(l)
light()
sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.render.resolution_x = 500; sc.render.resolution_y = 700
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
def shot(name, pos, show):
    for g in garments: g.hide_render = g.name not in show
    cam.location = pos; d = Vector((0, 0, 0.8)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f'{OUT}/proof_{name}.png'; bpy.ops.render.render(write_still=True)
OUTFIT = ['Top_hoodie', 'Bot_pants', 'Shoes_sneakers', 'Hat_beanie'] if SEX == 'm' else ['Top_tee', 'Bot_skirt', 'Shoes_boots', 'Neck_scarf']
shot('a_base', (0, -3.4, 1.0), [])
shot('b_outfit', (2.2, -2.6, 1.1), OUTFIT)
shot('c_outfit2', (-2.2, -2.6, 1.1), ['Top_dress', 'Shoes_slippers', 'Hat_bow'] if SEX == 'f' else ['Top_jacket', 'Bot_shorts', 'Shoes_boots', 'Eyew_shades'])
for g in garments: g.hide_render = False
bpy.ops.object.select_all(action='DESELECT')
for o in [rig, body] + garments: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=f'{OUT}/kemono-{SEX}.glb', use_selection=True, export_apply=False, export_skins=True, export_morph=True, export_animations=False)
print('DONE', len(garments), 'garments')
