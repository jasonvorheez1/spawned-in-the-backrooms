# The two shop masks (Partygoer bag, Partypooper shell), skinned whole to the critter body's Head bone so they ride the
# head exactly like the head GLB does (attachment skin). Run: blender -b --factory-startup --python-exit-code 1 --python art/shop-masks/build.py
import bpy, bmesh, math, random, os
from mathutils import Vector, noise
BODY = "/workspace/shop/value.72a8b9bf28216baab5b949a31bbff68251f892d11e4ca39e3b68c27ef0557e76.glb"
HEAD = "/workspace/shop/value.de385f3a252d2dba941dd3db0bc84d2eba7c85f616d69643cdd6db2c1d02cf35.glb"
OUT = "/workspace/shop/out"; os.makedirs(OUT, exist_ok=True)
TEX = "/workspace/shop"

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=BODY)
    rig = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
    return rig

def mat(name, img):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(os.path.join(TEX, img))
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.9
    return m

def uv_front(bm, box, frontcut=-0.35):
    (x0, x1, y0, y1, z0, z1) = box
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        for l in f.loops:
            p = l.vert.co
            v = (p.z - z0) / (z1 - z0)
            if n.y < frontcut:   # face side (-Y in Blender = glTF +Z = the critter's front): the print
                u = (p.x - x0) / (x1 - x0) * 0.5
            else:
                u = 0.5 + ((p.x - x0) / (x1 - x0) * 0.25 + (p.y - y0) / (y1 - y0) * 0.25)
            l[uvl].uv = (u, v)

def skin(ob, rig):
    g = ob.vertex_groups.new(name="Head"); g.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    ob.parent = rig; md = ob.modifiers.new("skin", "ARMATURE"); md.object = rig

def bag(rig):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=9, use_grid_fill=True)
    # rounded box, open at the bottom
    W, D, Z0, Z1, CY = 0.40, 0.40, 0.97, 1.75, -0.09
    random.seed(4)
    for v in bm.verts:
        x, y, z = v.co.x * 2, v.co.y * 2, v.co.z + 0.5   # -1..1, -1..1, 0..1
        # soften the corners like cloth stretched over a head
        r = max(abs(x), abs(y)); k = 0.86 + 0.14 * (1 - r ** 6)
        px, py = x * W * k, y * D * k
        top = z
        pz = Z0 + top * (Z1 - Z0)
        # the crumpled top: one corner pulled up and folded (ref: the bag's top is creased and leans)
        if z > 0.75:
            t = (z - 0.75) / 0.25
            pz += t * (0.06 * x + 0.05 * math.sin(3 * y + 1) - 0.04 * (1 - abs(x)))
            px *= 1 - 0.18 * t * (1 - x) * 0.5
        # cloth wrinkles
        n = noise.noise(Vector((px * 6, py * 6, pz * 6)))
        d = 0.018 * n + 0.012 * noise.noise(Vector((px * 17, py * 17, pz * 17)))
        nrm = Vector((px, py * 1.1, 0)).normalized() if abs(px) + abs(py) > 1e-4 else Vector((0, 0, 1))
        v.co = Vector((px, py + CY, pz)) + nrm * d
        if z > 0.99: v.co.z += 0.02 * n
        # the hem flares out a touch
        if z < 0.08: v.co.x *= 1.05; v.co.y = (v.co.y - CY) * 1.05 + CY
    bottom = [f for f in bm.faces if all(l.vert.co.z < Z0 + 0.001 for l in f.loops)]
    bmesh.ops.delete(bm, geom=bottom, context="FACES")
    bm.normal_update()
    uv_front(bm, (-W, W, -D + CY, D + CY, Z0, Z1), -0.6)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector((0, 0, 0)), matrix=__import__("mathutils").Matrix.Rotation(math.pi, 3, "Z"))  # the critter body faces +Y here
    me = bpy.data.meshes.new("MaskBag"); bm.to_mesh(me); ob = bpy.data.objects.new("MaskBag", me)
    bpy.context.collection.objects.link(ob); me.materials.append(mat("mask_bag", "mask-bag.png"))
    for p in me.polygons: p.use_smooth = True
    s = ob.modifiers.new("thick", "SOLIDIFY"); s.thickness = 0.012; s.offset = 1
    skin(ob, rig); return ob

def shell(rig):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=9, radius=1.0)
    C = Vector((0, -0.08, 1.37)); R = Vector((0.45, 0.48, 0.46))
    for v in bm.verts:
        c = v.co; v.co = Vector((c.x * R.x, c.y * R.y, c.z * R.z)) + C
    # the neck hole: drop the bottom cap
    cut = [f for f in bm.faces if sum(l.vert.co.z for l in f.loops) / len(f.loops) < 0.98]
    bmesh.ops.delete(bm, geom=cut, context="FACES")
    # turn the sphere so a flat facet faces forward like the ref
    bmesh.ops.rotate(bm, verts=bm.verts, cent=C, matrix=__import__("mathutils").Matrix.Rotation(math.radians(15), 3, "Z"))
    bm.normal_update()
    uv_front(bm, (C.x - R.x, C.x + R.x, C.y - R.y, C.y + R.y, C.z - R.z, C.z + R.z), -0.2)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector((0, 0, 0)), matrix=__import__("mathutils").Matrix.Rotation(math.pi, 3, "Z"))  # the critter body faces +Y here
    me = bpy.data.meshes.new("MaskShell"); bm.to_mesh(me); ob = bpy.data.objects.new("MaskShell", me)
    bpy.context.collection.objects.link(ob); me.materials.append(mat("mask_shell", "mask-pooper.png"))
    for p in me.polygons: p.use_smooth = False
    s = ob.modifiers.new("thick", "SOLIDIFY"); s.thickness = 0.015; s.offset = 1
    skin(ob, rig); return ob

def proof(name, ob):
    bpy.ops.import_scene.gltf(filepath=HEAD)
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 12
    sc.render.resolution_x = sc.render.resolution_y = 520
    w = bpy.data.worlds.new("w"); w.color = (0.5, 0.5, 0.52); sc.world = w
    L = bpy.data.lights.new("k", "SUN"); L.energy = 3; lo = bpy.data.objects.new("k", L); lo.rotation_euler = (0.9, 0, -0.5); sc.collection.objects.link(lo)
    cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); sc.collection.objects.link(cam); sc.camera = cam
    for i, (pos) in enumerate([(0.9, 2.0, 1.5), (-1.6, -0.9, 1.6)]):
        cam.location = pos
        d = Vector((0, 0, 1.2)) - Vector(pos); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = f"/tmp/proof/{name}_{i}.png"; bpy.ops.render.render(write_still=True)

for name, fn in (("bag", bag), ("shell", shell)):
    rig = reset()
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o.parent == rig and o.name not in ("MaskBag", "MaskShell"): pass
    ob = fn(rig)
    # export only rig + mask
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and o is not ob and not o.name.startswith(("Body", "Fur")):
            pass
    keep = {ob, rig}
    for o in bpy.context.scene.objects: o.select_set(o in keep)
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/mask-{name}.glb", use_selection=True, export_apply=False, export_skins=True, export_animations=False)
    print("bones", [b.name for b in rig.data.bones][:8], "tris", sum(len(p.vertices) - 2 for p in ob.data.polygons))
    proof(name, ob)
