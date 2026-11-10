# Anime hair rebuilt as one clean shell per style (Shelly #170057: "make the hair visually decent").
# Each pack style keeps its silhouette: the hem height per direction is measured off the old fitted hair,
# then a smooth layered shell is grown over the live head (crown ~1.2 cm off the skull), split into clumps
# that bulge and end in pointed tips; solid 7 mm thick, no cap, no gaps, no strands through each other.
# blender -b --factory-startup --python-exit-code 1 --python build.py -- <in.glb> <out.glb> <f|m> <hat 0|1> [proof.png]
import bpy, bmesh, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT, SEX, HAT = a[0], a[1], a[2], a[3] == "1"
PROOF = a[4] if len(a) > 4 else None
HEAD = {"f": dict(x=0.112, top=0.254, front=0.101, back=0.134), "m": dict(x=0.123, top=0.274, front=0.112, back=0.145)}[SEX]
OFF = 0.012
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
H = rig.matrix_world @ rig.data.bones["Head"].head_local
olds = [o for o in bpy.context.scene.objects if o.type == "MESH"]
mats = [m for o in olds for m in o.data.materials if m]
hm = next((m for m in mats if "hair" in m.name.lower() and "cap" not in m.name.lower()), mats[0] if mats else None)
# the style's hem: lowest point of the old hair per direction (0 = front, +x right)
NB = 48; hem = [None] * NB
for o in olds:
    dg = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
    for v in dg.data.vertices:
        p = o.matrix_world @ v.co - H
        if p.z < -0.25: continue
        th = math.atan2(p.x, -p.y) % (2 * math.pi); b = int(th / (2 * math.pi) * NB) % NB
        hem[b] = p.z if hem[b] is None else min(hem[b], p.z)
for i in range(NB):
    if hem[i] is None: hem[i] = 0.1
sm = [sorted([hem[(i + k) % NB] for k in (-2, -1, 0, 1, 2)])[2] for i in range(NB)]
ax, ay = HEAD["x"] + OFF, (HEAD["front"] + HEAD["back"]) / 2 + OFF
yc = (HEAD["back"] - HEAD["front"]) / 2; az = 0.135 + OFF; zc = HEAD["top"] - 0.135
BROW = 0.128 if SEX == "f" else 0.140
def hemz(th):
    f = th / (2 * math.pi) * NB - 0.5; i = int(math.floor(f)); t = f - i
    z = sm[i % NB] * (1 - t) + sm[(i + 1) % NB] * t
    fr = math.cos(th)  # 1 at the face
    if fr > 0.55: z = max(z, BROW - 0.01)            # bangs stop at the brows
    elif fr > 0.2: z = max(z, BROW - 0.075)          # temples frame the face
    return min(z, zc - 0.03)
NT, NV = 144, 40
CL = 20  # clumps round the head
def clump(th):
    u = (th / (2 * math.pi) * CL) % 1.0
    if math.cos(th) > 0.55: u = (th / (2 * math.pi) * CL * 1.6) % 1.0  # finer bangs
    return u
verts = []
for i in range(NT):
    th = 2 * math.pi * i / NT; s_, c_ = math.sin(th), math.cos(th)
    u = clump(th); tipd = 1 - abs(2 * u - 1)            # 1 at a clump's middle
    zh = hemz(th) - (0.045 if c_ < 0.55 else 0.022) * tipd ** 1.6
    # arc: ellipse quarter from the crown to the equator, then straight down to the hem
    for j in range(NV + 1):
        v = j / NV
        zt = HEAD["top"] + OFF - (HEAD["top"] + OFF - zh) * v
        if zt >= zc:
            k = math.sqrt(max(0.0, 1 - ((zt - zc) / az) ** 2))
        else:
            k = 1.0 - 0.05 * min(1.0, (zc - zt) / 0.15) * (1 if c_ < -0.3 else 0.4)
        bulge = 1 + (0.06 * math.sin(math.pi * u) ** 0.6 - 0.02) * min(1.0, v * 1.6)
        r = k * bulge
        x, y = ax * r * s_, yc - ay * r * c_
        z = zt
        if HAT: z = min(z, HEAD["top"] - 0.065)
        verts.append(Vector((x, y, z)))
faces = []
for i in range(NT):
    for j in range(NV):
        a0 = i * (NV + 1) + j; b0 = ((i + 1) % NT) * (NV + 1) + j
        faces.append((a0, b0, b0 + 1, a0 + 1))
me = bpy.data.meshes.new("AnimeHair"); me.from_pydata([p + H for p in verts], [], faces); me.update()
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
for o in olds: bpy.data.objects.remove(o, do_unlink=True)
ob = bpy.data.objects.new("AnimeHair", me); bpy.context.collection.objects.link(ob)
if hm:
    # the old hair picture was painted for the old strands' UVs; on this shell it reads as white blotches: flat colour, the game tints it
    if hm.use_nodes:
        bsdf = next((n for n in hm.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf:
            for l in list(bsdf.inputs["Base Color"].links): hm.node_tree.links.remove(l)
            bsdf.inputs["Base Color"].default_value = (0.82, 0.82, 0.82, 1); bsdf.inputs["Roughness"].default_value = 0.55
        for n in [n for n in hm.node_tree.nodes if n.type == "TEX_IMAGE"]: hm.node_tree.nodes.remove(n)
    me.materials.append(hm)
for p in me.polygons: p.use_smooth = True
bpy.context.view_layer.objects.active = ob; ob.select_set(True)
sol = ob.modifiers.new("Sol", "SOLIDIFY"); sol.thickness = 0.007; sol.offset = -1; sol.use_even_offset = True
bpy.ops.object.modifier_apply(modifier="Sol")
ob.vertex_groups.new(name="Head").add(list(range(len(me.vertices))), 1.0, "REPLACE")
ob.parent = rig; mod = ob.modifiers.new("Rig", "ARMATURE"); mod.object = rig
bpy.ops.object.select_all(action="DESELECT"); rig.select_set(True); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=False, export_skins=True, export_apply=False, export_yup=True)
print("HAIR", OUT, len(me.vertices), [round(x, 3) for x in sm[::6]])
if PROOF:
    sc = bpy.context.scene; sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "CYCLES"
    sc.render.resolution_x = sc.render.resolution_y = 600
    w = bpy.data.worlds.new("w"); w.color = (0.6, 0.6, 0.6); sc.world = w
    L = bpy.data.lights.new("l", "SUN"); L.energy = 4; lo = bpy.data.objects.new("l", L); lo.rotation_euler = (0.8, 0.2, 0.6); sc.collection.objects.link(lo)
    cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); sc.collection.objects.link(co); sc.camera = co
    tgt = H + Vector((0, 0, 0.13)); co.location = tgt + Vector((0.45, -0.6, 0.15)); co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = PROOF; bpy.ops.render.render(write_still=True)
