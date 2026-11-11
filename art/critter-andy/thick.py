# Adult furry body, Andy's thick limbs (Shelly #203319 + "a adult with thick limbs").
# Adds a thickening field on top of each mesh's Dandy key (skin + every garment, so clothes keep fit).
# Usage: blender -b --python thick.py -- <in.glb> <out.glb> [arm=0.35] [leg=0.2] [torso=0.2] [deltoid=0.8]
import bpy, sys, math
from mathutils import Vector
a = sys.argv[sys.argv.index("--")+1:]; SRC, OUT = a[0], a[1]
ARM = float(a[2]) if len(a) > 2 else 0.35; LEG = float(a[3]) if len(a) > 3 else 0.2
TOR = float(a[4]) if len(a) > 4 else 0.2
DEL = float(a[5]) if len(a) > 5 else 0.8
PAW = float(a[6]) if len(a) > 6 else 0.32
def sm(e0, e1, x): t = max(0, min(1, (x-e0)/(e1-e0))); return t*t*(3-2*t)
def bump(a_, b, c, d, x): return sm(a_, b, x)*(1-sm(c, d, x))
SHY = 0.955; LX = 0.09
def thick(ax, a0, k): return a0+(ax-a0)*k if ax >= a0 else ax+((k-1)/a0)*ax*(ax-a0)
def field(x, y, z):  # glTF frame: y up, front -z
  X, Y, Z = x, y, z; s = -1 if x < 0 else 1; ax = abs(x)
  arm = sm(0.11, 0.22, ax)*bump(0.8, 0.86, 1.08, 1.14, y)  # a wider blend at the joint: the narrow one pinched the shoulder
  w = bump(0.56, 0.64, 0.93, 1.0, y)*(1-arm)
  if w > 0:  # torso: a rounder bean, soft belly forward (front is -z)
    X *= 1+TOR*0.4*w*sm(0.62, 0.8, y); Z *= 1+TOR*w
    belly = math.exp(-(((y-0.72)/0.1)**2))*w
    if Z < 0: Z -= TOR*0.12*belly*sm(0, -0.05, z)
  if arm > 0:
    delt = math.exp(-(((ax-0.175)/0.045)**2))*sm(0.125, 0.15, ax)/max(arm, 0.05)  # the Dandy key leaves the arm root thin: a deltoid fill, full strength at the joint whatever the arm blend there
    paw = sm(0.46, 0.56, ax)  # mitten paws: the hand scaled up whole about the arm's axis
    k = 1+arm*(ARM*(0.75+0.25*sm(0.2, 0.32, ax))+DEL*delt+PAW*paw); Y = SHY+(Y-SHY)*k; Z = Z*k
  legW = 1-sm(0.56, 0.66, y)
  if legW > 0 and ax < 0.32:
    k = 1+legW*LEG*(0.6+0.4*sm(0.25, 0.5, y))
    kx = 1+(k-1)*(1-sm(0.4, 0.52, y)); X = s*thick(ax, LX, kx); Z = Z*(1+(k-1)*(1-0.7*sm(0.42, 0.55, y)))
  return X, Y, Z
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
dg = bpy.context.evaluated_depsgraph_get(); n = 0
for o in bpy.context.scene.objects:
  if o.type != 'MESH' or not o.data.shape_keys or 'Dandy' not in o.data.shape_keys.key_blocks: continue
  kd = o.data.shape_keys.key_blocks['Dandy']; M = o.matrix_world; Mi = M.inverted()
  for i, p in enumerate(kd.data):
    w = M @ p.co; gx, gy, gz = w.x, w.z, -w.y
    fx, fy, fz = field(gx, gy, gz)
    p.co = Mi @ Vector((fx, -fz, fy))
  n += 1
print("THICK on", n)
bpy.ops.export_scene.gltf(filepath=OUT, export_morph=True, export_skins=True, export_animations=False)
