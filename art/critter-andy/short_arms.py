# Shelly #204431 "the arms look stretched": shortens upper arm and forearm along their length, hands kept their size.
# Bakes every mesh's every shape key through the posed rig, then makes the pose the rest pose.
# Usage: blender -b --python short_arms.py -- <in.glb> <out.glb> [s=0.82]
import bpy, sys
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT = a[0], a[1]; S = float(a[2]) if len(a) > 2 else 0.82
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
pb = arm.pose.bones
def find(k): return [b for b in pb if b.name.split(':')[-1] in (f'Left{k}', f'Right{k}')]
up, fore, hand = find('Arm'), find('ForeArm'), find('Hand')
print("BONES", [b.name for b in up + fore + hand])
for b in fore + hand: arm.data.bones[b.name].inherit_scale = 'NONE'
for b in up + fore: b.scale = (1, S, 1)
# hand children (fingers) keep scale via hand inherit NONE
bpy.context.view_layer.update()
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
baked = {}
dg = bpy.context.evaluated_depsgraph_get()
for o in meshes:
  ks = o.data.shape_keys.key_blocks if o.data.shape_keys else None
  names = [k.name for k in ks] if ks else [None]
  saved = {k.name: k.value for k in ks} if ks else {}
  res = {}
  for n in names:
    if ks:
      for k in ks: k.value = 0
      if n != ks[0].name: ks[n].value = 1
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    e = o.evaluated_get(dg); me = e.to_mesh()
    if len(me.vertices) != len(o.data.vertices): raise SystemExit(f"topology changed on {o.name}")
    res[n] = [Vector(v.co) for v in me.vertices]; e.to_mesh_clear()
  if ks:
    for k in ks: k.value = saved[k.name]
  baked[o.name] = res
  print("MESH", o.name, len(o.data.vertices))
# armature-space eval coords are in the mesh's local space (modifier output); make pose the rest
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
for b in fore + hand: arm.data.bones[b.name].inherit_scale = 'FULL'
for o in meshes:
  res = baked[o.name]; ks = o.data.shape_keys.key_blocks if o.data.shape_keys else None
  if ks:
    for k in ks:
      co = res[k.name]
      for i, p in enumerate(k.data): p.co = co[i]
  base = res[ks[0].name] if ks else res[None]
  for i, v in enumerate(o.data.vertices): v.co = base[i]
bpy.ops.export_scene.gltf(filepath=OUT, export_morph=True, export_skins=True, export_animations=False)
print("DONE", OUT)
