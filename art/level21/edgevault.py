# Level 2.1, The Edges: the blasted-rock vault from the creator's tunnel photo. One 9 m stretch of pale grey rock that rises from the floor,
# bulges, and curves over into the ceiling. Seamless along X (periodic noise), so four stand end to end down the 36 m lane.
# Blender: X along the tunnel (-4.5..4.5), wall plane at y=0, the tunnel at -Y (game +Z), floor z=0. Out: /workspace/out/edgevault_<v>.glb
import bpy, bmesh, math, os, sys
from mathutils import Vector, noise
L = 9.0; OUT = "/workspace/out"; os.makedirs(OUT, exist_ok=True)
PROF = [(-0.25, -0.05), (0.35, 0.0), (0.7, 0.7), (0.95, 1.6), (0.85, 2.5), (1.15, 3.25), (1.9, 3.95), (2.9, 4.38), (4.0, 4.56), (5.0, 4.64)]  # (offset into the tunnel, height)

def prof(t):  # catmull-rom along the profile, t in 0..1
    n = len(PROF) - 1; f = t * n; i = min(int(f), n - 1); u = f - i
    p = [Vector(PROF[max(0, min(n, j))]) for j in (i - 1, i, i + 1, i + 2)]
    return 0.5 * ((2 * p[1]) + (-p[0] + p[2]) * u + (2 * p[0] - 5 * p[1] + 4 * p[2] - p[3]) * u * u + (-p[0] + 3 * p[1] - 3 * p[2] + p[3]) * u ** 3)

def build(v, seed):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    nu, nv = 90, 80; me = bpy.data.meshes.new("vault"); bm = bmesh.new(); grid = []; disp = []
    R = L / (2 * math.pi)
    for j in range(nv + 1):
        t = j / nv; p = prof(t); q = prof(min(1, t + 0.01)) - prof(max(0, t - 0.01)); nrm2 = Vector((q.y, -q.x)).normalized()  # profile normal, pointing into the tunnel
        row = []
        for i in range(nu):
            x = -L / 2 + L * i / nu; a = 2 * math.pi * i / nu
            P = Vector((math.cos(a) * R, math.sin(a) * R, p.y * 0.9 + p.x * 0.6)) + Vector((seed * 17.3, seed * 5.1, 0))
            big = noise.fractal(P * 0.32, 1.0, 2.0, 3) * 0.42          # blasted bulges
            mid = noise.fractal(P * 1.1 + Vector((3, 1, 7)), 1.0, 2.1, 3) * 0.13
            ridge = abs(noise.noise(Vector((P.x * 0.7, P.y * 0.7, P.z * 2.6)))) * -0.12  # horizontal drill-blast ledges
            fine = noise.noise(P * 4.0) * 0.03
            fade = min(1.0, t / 0.08) * min(1.0, (1 - t) / 0.12)
            d = (big + mid + ridge + fine) * fade
            off = p.x + nrm2.x * d; h = p.y + nrm2.y * d
            row.append(bm.verts.new((x, -off, h))); disp.append(d)
        grid.append(row)
    for j in range(nv):
        for i in range(nu - 1): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(f"edgevault_{v}", me); bpy.context.scene.collection.objects.link(ob)
    # vertex colour: pale grey rock, darker in the hollows and toward the foot, faint warm and cold mottling
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    for k, vt in enumerate(me.vertices):
        d = disp[k]; z = vt.co.z; m = noise.noise(vt.co * 1.7 + Vector((seed, 0, 0)))
        g = 0.47 + d * 0.45 + m * 0.05 + min(z, 1.2) * 0.03; g = max(0.18, min(0.66, g))
        col.data[k].color = (g * 0.98, g, g * 1.03, 1)
    for f in me.polygons: f.use_smooth = True
    # make sure faces look into the tunnel (-Y)
    if sum(p.normal.y for p in me.polygons) > 0:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    mat = bpy.data.materials.new("rock"); mat.use_nodes = True; nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"; nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.93; ob.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/edgevault_{v}.glb", use_selection=True, export_apply=True)
    return ob

for v, s in (("a", 1), ("b", 2)): ob = build(v, s)
# proof: look down the tunnel at variant b
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.render.resolution_x, sc.render.resolution_y = 960, 540
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (-6, -3.5, 1.6); cam.rotation_euler = (math.radians(88), 0, math.radians(-62))
li = bpy.data.objects.new("l", bpy.data.lights.new("l", "POINT")); li.data.energy = 3000; li.location = (-3, -4, 3.5); sc.collection.objects.link(li)
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[1].default_value = 0.3
sc.render.filepath = f"{OUT}/edgevault_proof.png"; bpy.ops.render.render(write_still=True)
