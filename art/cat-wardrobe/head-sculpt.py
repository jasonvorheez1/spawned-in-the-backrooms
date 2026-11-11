# Anime pass on the in-game cat heads: a button snout and a tucked chin, so the profile reads as a snout, not a jowl.
# Vertices move ONLY along the face axis (Blender -Y = glTF +z): the painted face is projected in bind x/y, so it stays registered.
# run: blender -b --factory-startup --python-exit-code 1 --python art/cat-wardrobe/head-sculpt.py -- f|m
import bpy, sys, numpy as np, os
W = sys.argv[-1]; SRC = f"/workspace/cathead/{W}.glb"; OUT = f"/workspace/cathead/{W}-anime.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"): bpy.data.objects.remove(o)
H = bpy.data.objects["Head"]; M = H.matrix_world; Mi = M.inverted()
V = np.array([M @ v.co for v in H.data.vertices])
mid = V[np.abs(V[:, 0]) < 0.015]
low = mid[mid[:, 2] < V[:, 2].min() + 0.5 * (V[:, 2].max() - V[:, 2].min())]
zp = low[np.argmin(low[:, 1]), 2]; yp = low[:, 1].min()           # the snout's tip
z0 = V[:, 2].min(); S = (zp - z0) / 0.17                          # 1 on the girl
print("SNOUT", W, round(zp, 3), round(yp, 3), "scale", round(S, 3))
g = lambda d, s: np.exp(-(d / s) ** 2)
x, y, z = V[:, 0], V[:, 1], V[:, 2]
front = np.clip((-y - 0.04) / 0.06, 0, 1)                         # only the face side moves
tip = g(z - (zp + 0.006 * S), 0.03 * S) * g(x, 0.055 * S)          # button tip: rounder, a touch further out
chin = g(z - (zp - 0.075 * S), 0.045 * S) * g(x, 0.13 * S)         # the sag under the snout pulls back in
bridge = g(z - (zp + 0.05 * S), 0.022 * S) * g(x, 0.045 * S)        # a soft bridge from snout to brow, no dent
dy = front * (-0.011 * S * tip + 0.022 * S * chin - 0.006 * S * bridge)
for i, v in enumerate(H.data.vertices):
    if dy[i]: v.co = Mi @ (M @ v.co + __import__("mathutils").Vector((0, dy[i], 0)))
H.data.update()
print("MOVED", int((np.abs(dy) > 1e-4).sum()), "max", round(float(np.abs(dy).max()), 4))
# proof: profile + 3/4, before is the source
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_apply=False, export_animation_mode="ACTIONS", export_morph=True, export_skins=True, use_selection=False)
print("OUT", OUT)
