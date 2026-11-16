"""PROOF: front, side and back orthographic sheets the reviewer reads before anything is placed:
  zones.png   - every T0 zone its own colour
  cages.png   - zones grey, every T1 cage in its slot colour (one image per slot variant group: top/legs/feet/gloves/skirt/neck)
  bubbles.png - zones grey + the T2 capsules as wire-shaded solids
Workbench, flat light, no shadows: model faults read, nothing else does."""
import bpy, os, math, colorsys, numpy as np
from mathutils import Vector, Matrix

def cam(h, cz, ang, name):
    c = bpy.data.cameras.new(name); c.type = 'ORTHO'; c.ortho_scale = h * 1.12
    o = bpy.data.objects.new(name, c); bpy.context.scene.collection.objects.link(o)
    d = 4.0; o.location = (math.sin(ang) * d, -math.cos(ang) * d, cz); o.rotation_euler = (math.pi / 2, 0, ang); return o
def shot(objs_visible, path, body):
    sc = bpy.context.scene
    for o in sc.objects:
        if o.type == 'MESH': o.hide_render = o not in objs_visible
    imgs = []
    for k, ang in enumerate((0, math.pi / 2, math.pi)):
        sc.camera = cam(body.h, body.z0 + body.h / 2, ang, 'bwcam%d' % k)
        p = path.replace('.png', '_%d.png' % k); sc.render.filepath = p; bpy.ops.render.render(write_still=True); imgs.append(p)
    os.system('convert %s +append %s && rm %s' % (' '.join(imgs), path, ' '.join(imgs)))
def colour(o, rgb):
    o.color = (*rgb, 1)
def run(body, ZONES, CAGES, DOC, a):
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.display.shading.light = 'STUDIO'
    sc.display.shading.color_type = 'OBJECT'; sc.display.shading.show_shadows = False; sc.display.shading.show_cavity = True
    sc.render.resolution_x = 600; sc.render.resolution_y = 900; sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new('w'); sc.world.color = (0.18, 0.18, 0.2)
    Z = list(ZONES.values())
    for i, o in enumerate(Z): colour(o, colorsys.hsv_to_rgb((i * 0.618) % 1, 0.55, 0.9))
    shot(Z, os.path.join(a.out, 'zones.png'), body)
    for o in Z: colour(o, (0.55, 0.55, 0.55))
    if CAGES:
        groups = {}
        for name, (ob, col) in CAGES['cage'].items():
            h = col.lstrip('#'); colour(ob, tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))); groups.setdefault(name.split('_')[0], []).append(ob)
        for g, obs in groups.items(): shot(Z + obs, os.path.join(a.out, 'cages_%s.png' % g), body)
    caps = []
    for z, c in (DOC.get('t2', {}).get('capsules') or {}).items():
        A = Vector(c['worldA']); B = Vector(c['worldB']); r = c['radius']; L = (B - A).length
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=max(L, 1e-4), vertices=24, location=(A + B) / 2)
        cy = bpy.context.active_object
        if L > 1e-5: cy.rotation_euler = (B - A).to_track_quat('Z', 'Y').to_euler()
        parts = [cy]
        for P in (A, B):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=24, ring_count=12, location=P); parts.append(bpy.context.active_object)
        for p in parts: colour(p, (0.2, 0.8, 1.0)); caps.append(p)
    if caps:
        shot(Z + caps, os.path.join(a.out, 'bubbles.png'), body)
    DOC['proof'] = sorted(f for f in os.listdir(a.out) if f.endswith('.png'))
    print('BODYWORKS proof:', DOC['proof'])
