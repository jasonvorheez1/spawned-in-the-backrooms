# The new cat's fur picture, remade (Shelly Nov 11 "remake the textures for the cat too"): the Tripo atlas carried skin patches and black specks.
# Baked on the body's own UVMap: white fur (the shader tints it), soft strands falling down the body, a lighter fluffy chest/belly and inner arms, a touch darker at the back.
# run: blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/fur-bake.py -- f|m
import bpy, sys
W = [a for a in sys.argv if a in ("f", "m")][-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=f"/workspace/cathead/{W}-keys.glb")
B = bpy.data.objects["Body"]
img = bpy.data.images.new(f"fur-{W}", 2048, 2048, alpha=False)
mat = bpy.data.materials.new("bake"); mat.use_nodes = True; nt = mat.node_tree; N = nt.nodes; L = nt.links
for n in list(N): N.remove(n)
out = N.new("ShaderNodeOutputMaterial"); em = N.new("ShaderNodeEmission"); L.new(em.outputs[0], out.inputs[0])
tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
def mul(a, b, op="MULTIPLY"):
    m = N.new("ShaderNodeMath"); m.operation = op
    for i, v in enumerate((a, b)):
        if isinstance(v, (int, float)): m.inputs[i].default_value = v
        else: L.new(v, m.inputs[i])
    return m.outputs[0]
# strands: noise stretched along the body's height so the grain falls down, two scales
comb = N.new("ShaderNodeCombineXYZ")
L.new(mul(sep.outputs[0], 1.0), comb.inputs[0]); L.new(mul(sep.outputs[1], 1.0), comb.inputs[1]); L.new(mul(sep.outputs[2], 0.18), comb.inputs[2])
def noise(scale, detail):
    n = N.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = 0.55
    L.new(comb.outputs[0], n.inputs["Vector"]); return n.outputs["Fac"]
fine = noise(260, 4); broad = noise(40, 3)
strand = mul(mul(fine, 0.5, "SUBTRACT"), 0.16)          # ±8 % fine grain
clump = mul(mul(broad, 0.5, "SUBTRACT"), 0.10)          # ±5 % soft clumps
# front (−Y in Blender = her chest) a little lighter, the back a little deeper
front = N.new("ShaderNodeMapRange"); L.new(sep.outputs[1], front.inputs[0]); front.inputs[1].default_value = 0.08; front.inputs[2].default_value = -0.12; front.inputs[3].default_value = -0.05; front.inputs[4].default_value = 0.04
v = mul(mul(mul(0.93, strand, "ADD"), clump, "ADD"), front.outputs[0], "ADD")
v = mul(v, 1.0, "MINIMUM")
warm = N.new("ShaderNodeCombineColor"); L.new(v, warm.inputs[0]); L.new(v, warm.inputs[1]); L.new(mul(v, 0.975), warm.inputs[2])
L.new(warm.outputs[0], em.inputs[0])
it = N.new("ShaderNodeTexImage"); it.image = img; N.active = it
B.data.materials.clear(); B.data.materials.append(mat)
for o in bpy.data.objects: o.select_set(o == B)
bpy.context.view_layer.objects.active = B
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 4
sc.render.bake.margin = 24
bpy.ops.object.bake(type="EMIT")
img.filepath_raw = f"/workspace/cathead/fur-{W}.png"; img.file_format = "PNG"; img.save()
print("BAKED", img.filepath_raw)
