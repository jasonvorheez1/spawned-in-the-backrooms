"""Refit the demo cats' existing garment shells against both Idle and Walk.

Blender -b --factory-startup --python fit_motion.py -- DECODED_GLB_DIR OUTPUT_DIR
Input names: cat-f/m.glb and hoodie/jacket/skirt/boots-f/m.glb.
"""
import json
import sys
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0,str(Path(__file__).parent))
from profile_fit import load, save

# Keep the actual skin under the fabric, including the full Chest morph.
POSES = [("Idle", 0, 0), ("Idle", .5, 1)] + [("Walk", f/8, 1) for f in range(8)]

def mesh_points(obj, graph):
    evaluated = obj.evaluated_get(graph)
    return [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]

def sample_rig(rig, body, scene, graphs):
    skin = body.data
    skin.calc_loop_triangles()
    tail = {g.index for g in body.vertex_groups if "Tail" in g.name}
    on_tail = [sum(g.weight for g in v.groups if g.group in tail) > .2 for v in skin.vertices]
    triangles = [tuple(t.vertices) for t in skin.loop_triangles
                 if not any(on_tail[i] for i in t.vertices)]
    bind = [body.matrix_world @ v.co for v in skin.vertices]
    bones = rig.pose.bones
    takes = {}
    anim = rig.animation_data
    anim.action = None
    tracks = {t.name: t for t in anim.nla_tracks}
    for name, fraction, chest in POSES:
        for t in tracks.values():
            t.mute = t.name != name
        clip = tracks[name].strips[0]
        scene.frame_set(round(clip.frame_start + fraction*(clip.frame_end-clip.frame_start)))
        body.data.shape_keys.key_blocks["Chest"].value = chest
        bpy.context.view_layer.update()
        posed = mesh_points(body, graphs)
        transforms = {b.name: rig.matrix_world @ b.matrix @ b.bone.matrix_local.inverted()
                      @ rig.matrix_world.inverted() for b in bones}
        def tree(filtered):
            return BVHTree.FromPolygons(posed, filtered, all_triangles=True)
        takes[name,fraction,chest] = (tree(triangles), transforms, {
            s: tree([t for t in triangles if all(sign*bind[i].x > .005 and bind[i].z < .20 for i in t)])
            for s,sign in (("Left",1),("Right",-1))
        })
    return takes

def fit(garment, takes, kind):
    gm = garment.data
    shape = gm.shape_keys.key_blocks if gm.shape_keys else None
    basis = shape[0].data if shape else gm.vertices
    world = garment.matrix_world
    linear = world.inverted().to_3x3()
    verts = [world @ v.co for v in basis]
    chest = [world @ v.co for v in shape["Chest"].data] if shape and "Chest" in shape else verts
    weights = [[(garment.vertex_groups[g.group].name, g.weight) for g in v.groups] for v in gm.vertices]
    poses = []
    for (_, _, full), (body, transforms, feet) in takes.items():
        deform = [sum((transforms[n]*w for n,w in ws if n in transforms),Matrix(((0,0,0,0),)*4))
                  if ws else Matrix.Identity(4) for ws in weights]
        poses.append((body, feet, deform, [m.inverted_safe().to_3x3() for m in deform], chest if full else verts))
    sides = [max(("Left","Right"),key=lambda side:sum(w for n,w in ws if ":"+side in n)) for ws in weights]
    deltas = [Vector() for _ in verts]
    tolerance = .0025 if kind == "boots" else .004
    def contacts(repair=False):
        deep = 0
        for body, feet, deform, reverse, points in poses:
            for i, p in enumerate(points):
                if kind == "boots" and p.z < .025:
                    continue
                at = deform[i] @ (p+deltas[i])
                hit, n, _, distance = (feet[sides[i]] if kind=="boots" else body).find_nearest(at)
                if hit is None or distance > .048:
                    continue
                signed = (at-hit).dot(n)
                deep += signed < -.003
                if repair and signed < -0.001:
                    move = reverse[i] @ (n * min(.011, tolerance-signed))
                    deltas[i] += move
                    limit = .022 if kind == "boots" else .037
                    if deltas[i].length > limit:
                        deltas[i].length = limit
        return deep
    before = contacts()
    for _ in range(3):
        contacts(True)
    # GLB splits shared points at UV seams. Move those copies together so a
    # clearance correction can't pull apart the seam it is meant to protect.
    seams = {}
    for i,p in enumerate(verts):
        seams.setdefault(tuple(round(x,5) for x in p), []).append(i)
    def weld_deltas():
        for ids in seams.values():
            if len(ids) < 2:
                continue
            center = sum((deltas[i] for i in ids), Vector()) / len(ids)
            for i in ids:
                deltas[i] = center.copy()
    weld_deltas()
    # Feather the edge of a correction without flattening seams or pleats.
    neighbors = [set() for _ in verts]
    for e in gm.edges:
        a,b = e.vertices
        neighbors[a].add(b)
        neighbors[b].add(a)
    for _ in range(3):
        deltas[:] = [d.lerp(sum((deltas[j] for j in neighbors[i]),Vector())/len(neighbors[i]),.36)
                     if neighbors[i] else d for i,d in enumerate(deltas)]
        weld_deltas()
    after = contacts()
    if after >= before or before < 15:
        return {"before":before, "after":before, "changed":False}
    for i,d in enumerate(deltas):
        move = linear @ d
        if shape:
            for key in shape:
                key.data[i].co += move
        else:
            gm.vertices[i].co += move
    gm.update()
    return {"before":before,"after":after,"changed":True}

def main():
    source, out = map(Path,sys.argv[-2:])
    out.mkdir(parents=True,exist_ok=True)
    results = {}
    for sex in "fm":
        bpy.ops.wm.read_factory_settings(use_empty=True)
        cat = load(source/f"cat-{sex}.glb")
        body = bpy.data.objects["Body"]
        rig = next(o for o in cat if o.type=="ARMATURE")
        takes = sample_rig(rig,body,bpy.context.scene,bpy.context.evaluated_depsgraph_get())
        for kind in ("hoodie","jacket","skirt","boots"):
            file=f"{kind}-{sex}.glb"
            objects=load(source/file)
            garment=next(o for o in objects if o.type=="MESH" and o.vertex_groups)
            result=fit(garment,takes,kind)
            results[file]=result
            print(file,result,flush=True)
            if result["changed"]:
                garment.data.materials[0].name="cloth"
                save(out/file,objects)
            for o in objects:
                bpy.data.objects.remove(o,do_unlink=True)
            for mesh in list(bpy.data.meshes):
                if not mesh.users:
                    bpy.data.meshes.remove(mesh)
            for m in list(bpy.data.materials):
                if not m.users:
                    bpy.data.materials.remove(m)
    (out/"motion-check.json").write_text(json.dumps(results,indent=2))

if __name__=="__main__":
    main()
