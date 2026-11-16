# Level 325 bamboo scaffold kit. One pass: Tripo sources -> textures -> pieces -> proofs -> glb.
# blender -b --factory-startup --python-exit-code 1 --python art/l325-bamboo/build.py -- [tex|build|all]
import bpy, bmesh, sys, os, math, random, json
import numpy as np
from mathutils import Vector, Matrix
W = "/workspace/l325-bamboo"; SRC = W + "/src"; TEX = W + "/tex"; OUT = W + "/out"; PROOF = "/tmp/l325-bamboo"
for d in (TEX, OUT, PROOF): os.makedirs(d, exist_ok=True)
MODE = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "all"

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"; s.cycles.samples = 8; s.cycles.device = "CPU"
    s.view_settings.view_transform = "Standard"
    return s

def load(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{SRC}/{name}.glb")
    obs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    if len(obs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

def emissive(o):
    for m in o.data.materials:
        nt = m.node_tree; img = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and n.outputs[0].links), None)
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        e = nt.nodes.new("ShaderNodeEmission")
        if img: nt.links.new(img.outputs[0], e.inputs[0])
        nt.links.new(e.outputs[0], out.inputs[0])

def ortho(name, loc, rot, scale, rx, ry):
    s = bpy.context.scene
    cd = bpy.data.cameras.new(name); cd.type = "ORTHO"; cd.ortho_scale = scale; cd.clip_end = 500
    c = bpy.data.objects.new(name, cd); s.collection.objects.link(c); c.location = loc; c.rotation_euler = rot
    s.camera = c; s.render.resolution_x, s.render.resolution_y = rx, ry
    s.render.film_transparent = True; s.render.image_settings.color_mode = "RGBA"
    s.render.filepath = f"{TEX}/raw_{name}.png"; bpy.ops.render.render(write_still=True)

def bounds(o):
    v = np.array([o.matrix_world @ x.co for x in o.data.vertices]); return v.min(0), v.max(0)

def make_raw():
    s = reset()
    # pole: align its long axis to Z by PCA, look along Y
    o = load("polerun"); emissive(o)
    v = np.array([x.co for x in o.data.vertices]); c = v.mean(0)
    w, vec = np.linalg.eigh(np.cov((v - c).T)); ax = Vector(vec[:, 2])
    o.matrix_world = ax.rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4() @ Matrix.Translation(-Vector(c))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    lo, hi = bounds(o); L = hi[2] - lo[2]
    ortho("pole", (0, -5, (lo[2] + hi[2]) / 2), (math.pi / 2, 0, 0), L, 512, 4096)
    print("POLE len", L, "bounds", lo, hi)
    bpy.data.objects.remove(o)
    o = load("net"); emissive(o); lo, hi = bounds(o); print("NET", lo, hi)
    ortho("net", (0, -5, (lo[2] + hi[2]) / 2), (math.pi / 2, 0, 0), max(hi[0] - lo[0], hi[2] - lo[2]), 1024, 1024)
    bpy.data.objects.remove(o)
    o = load("platform"); emissive(o); lo, hi = bounds(o); print("PLAT", lo, hi)
    ortho("plat", ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, 5), (0, 0, 0), max(hi[0] - lo[0], hi[1] - lo[1]), 1024, 1024)
    bpy.data.objects.remove(o)
    o = load("joint"); emissive(o); lo, hi = bounds(o); print("JOINT", lo, hi)
    ortho("joint", ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, 5), (0, 0, 0), max(hi[0] - lo[0], hi[1] - lo[1]), 1024, 1024)
    o = load("tangle"); lo, hi = bounds(o); print("TANGLE", lo, hi, len(o.data.polygons))

if MODE in ("raw",): make_raw()
