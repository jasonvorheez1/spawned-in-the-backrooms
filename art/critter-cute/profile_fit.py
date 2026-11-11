"""Refine the published Tripo cat rigs and wardrobe in Blender.

Decode meshopt GLBs before use. Run Blender with:
  -b --factory-startup --python profile_fit.py -- INPUT_DIR OUTPUT_DIR
INPUT_DIR contains cat-f/m.glb and hoodie/jacket/skirt/boots-f/m.glb.
The game supplies the fur and face images separately in cat-wardrobe.js.
"""
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

def smoothstep(lo, hi, value):
    t = min(1, max(0, (value - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)

def spline(points, i, t, closed=False):
    def at(j):
        return Vector(points[j % len(points)] if closed else points[max(0,min(j,len(points)-1))])
    a,b,c,d = (at(i+j) for j in (-1,0,1,2))
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)

def rebuild_head(head, sex):
    """Round skull, tapered jaw and cupped ears on the original Head bone."""
    female = sex == "f"
    # Height, half-width, half-depth, depth center. The neck connection stays at bind height.
    rings = ([(.609,.057,.056,-.042),(.649,.123,.112,-.031),(.69,.178,.159,-.023),
              (.75,.231,.207,.005),(.83,.244,.216,.011),(.91,.225,.205,.012),
              (.982,.193,.168,.008),(1.033,.117,.105,.006),(1.052,.001,.001,.005)]
             if female else
             [(.724,.058,.059,-.078),(.756,.090,.081,-.081),(.790,.137,.121,-.087),(.832,.182,.163,-.090),
              (.876,.219,.193,-.090),(.939,.225,.203,-.086),(.996,.204,.180,-.080),
              (1.051,.153,.130,-.073),(1.087,.085,.079,-.069),(1.105,.001,.001,-.068)])
    verts,faces,mats = [],[],[]
    def face(indices, material=0):
        faces.append(indices)
        mats.append(material)
    levels=[spline(rings,i,j/7) for i in range(len(rings)-1) for j in range(7)]+[Vector(rings[-1])]
    seg=64
    from math import cos,sin,pi
    for z,rx,ry,cy in levels:
        for i in range(seg):
            a=2*pi*i/seg
            x,y=rx*cos(a),cy+ry*sin(a)
            # Keep the orbital surface round. The muzzle sits below the eyes and
            # only the narrow center of the nose rises between their lower corners.
            lo, mid, tip, brow = (.729, .774, .799, .829) if female else (.779, .828, .850, .880)
            rise = smoothstep(lo, mid, z)
            fall = 1 - smoothstep(tip, brow, z)
            cheek = 1 - smoothstep(.034, .118 if female else .130, abs(x))
            nose_z = .810 if female else .867
            nose = (1 - smoothstep(.003, .027, abs(z - nose_z))) * (1 - smoothstep(.014, .043, abs(x)))
            if sin(a) < 0:
                y -= (.027 if female else .048) * rise * fall * cheek
                y -= (.009 if female else .017) * nose
            verts.append((x,y,z))
    face(tuple(reversed(range(seg))))
    for j in range(len(levels)-1):
        for i in range(seg):
            n=(i+1)%seg
            face((j*seg+i,j*seg+n,(j+1)*seg+n,(j+1)*seg+i))
    face(tuple(range((len(levels)-1)*seg,len(levels)*seg)))

    # Outline from inner root to tip and down the outer rim. The inner cup is recessed
    # within the rim and the curved back seats under the skull at the roots.
    outline = ([(.075,.981),(.113,1.066),(.186,1.150),(.266,1.201),(.287,1.181),
                (.281,1.106),(.260,1.004),(.227,.944),(.154,.940)] if female else
               [(.061,1.015),(.090,1.100),(.147,1.168),(.220,1.200),(.246,1.179),
                (.244,1.109),(.229,1.017),(.195,.966),(.126,.960)])
    edge=[spline(outline,i,j/5,True) for i in range(len(outline)) for j in range(5)]
    center=sum(edge,Vector((0,0)))/len(edge)
    count=len(edge)
    for side in (-1,1):
        start=len(verts)
        for r, yoff in ((.015,.028),(.38,.022),(.68,.004),(.88,-.018),(1,-.003),(.84,.049),(.51,.080),(.015,.094)):
            for p in edge:
                x,z=center.lerp(p,r)
                depth=(-.019 if female else -.085)+.11*(z-center.y)+yoff
                verts.append((side*x,depth,z))
        face(tuple(start+i for i in range(count)),1)
        for j in range(7):
            for i in range(count):
                n=(i+1)%count
                face((start+j*count+i,start+j*count+n,start+(j+1)*count+n,start+(j+1)*count+i),1 if j<2 else 0)
        face(tuple(start+7*count+i for i in reversed(range(count))))

    old=head.data
    mesh=bpy.data.meshes.new("Head profile")
    inv=head.matrix_world.inverted()
    mesh.from_pydata([inv@Vector(v) for v in verts],[],faces)
    mesh.materials.append(bpy.data.materials.new("headFur"))
    ear = bpy.data.materials.new("innerEar")
    ear.diffuse_color = (.56,.18,.16,1)
    mesh.materials.append(ear)
    for poly,material in zip(mesh.polygons,mats):
        poly.material_index=material
        poly.use_smooth=True
    bm=bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    head.data=mesh
    bpy.data.meshes.remove(old)
    for g in list(head.vertex_groups):
        head.vertex_groups.remove(g)
    g=head.vertex_groups.new(name="mixamorig:Head")
    g.add(list(range(len(mesh.vertices))),1,"REPLACE")

def trim_old_jaw(body, sex):
    # The original split left a second jaw on the torso, especially on the male.
    # Retain the neck core so it overlaps the new head even in the idle pose.
    bm = bmesh.new()
    bm.from_mesh(body.data)
    remove = []
    for v in bm.verts:
        x,y,z = body.matrix_world @ v.co
        if sex == "f":
            old_jaw = abs(x) < .19 and z > .633 and abs(x) > .06
        else:
            old_jaw = z > .741 or (z > .705 and y < -.151)
        if old_jaw:
            remove.append(v)
    bmesh.ops.delete(bm,geom=remove,context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    body.data.update()

def load(file):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(file))
    return set(bpy.data.objects) - before

def save(file, objects, animations=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(file), use_selection=True,
                              export_animations=animations, export_animation_mode="NLA_TRACKS",
                              export_morph=True, export_skins=True,
                              export_def_bones=False)

def close_small_tears(garment, kind):
    # Keep the neck, cuffs, waist and hem open. Only repair small disconnected tears.
    mesh = garment.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.00006)
    pending = {edge for edge in bm.edges if edge.is_boundary}
    while pending:
        edge = pending.pop()
        stack = list(edge.verts)
        verts = set(stack)
        edges = [edge]
        while stack:
            v = stack.pop()
            for e in v.link_edges:
                if e not in pending:
                    continue
                pending.remove(e)
                edges.append(e)
                other = e.other_vert(v)
                if other not in verts:
                    verts.add(other)
                    stack.append(other)
        center = sum((v.co for v in verts),Vector()) / len(verts)
        radius = max((v.co-center).length for v in verts)
        if len(edges) >= 3 and radius < (.016 if kind == "boots" else .023):
            patches = bmesh.ops.holes_fill(bm,edges=edges).get("faces", [])
            if patches:
                bmesh.ops.triangulate(bm,faces=patches)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

def fit_garment(body, garment, kind):
    """Keep the garment cut and match local skin motion across its openings."""
    close_small_tears(garment,kind)
    mesh, gm = body.data, garment.data
    names = [g.name for g in body.vertex_groups]
    points = [body.matrix_world @ v.co for v in mesh.vertices]
    weights = [{names[g.group]: g.weight for g in v.groups} for v in mesh.vertices]
    mesh.calc_loop_triangles()
    tris = [tuple(t.vertices) for t in mesh.loop_triangles
            if all(sum(w for n,w in weights[i].items() if 'Tail' in n) < .2 for i in t.vertices)]
    skin = BVHTree.FromPolygons(points, tris, all_triangles=True)
    feet = {}
    if kind == "boots":
        for side,sign in (("Left",1),("Right",-1)):
            foot_tris = [t for t in tris if all(sign*points[i].x > .005 and points[i].z < .20 for i in t)]
            feet[side] = (BVHTree.FromPolygons(points,foot_tris,all_triangles=True),foot_tris)
    inv = garment.matrix_world.inverted()
    clearance = {"hoodie": .018, "jacket": .018, "boots": .011, "skirt": .012}[kind]
    top = kind in ("hoodie", "jacket")
    for name in names:
        if "Tail" not in name and name not in garment.vertex_groups:
            garment.vertex_groups.new(name=name)
    groups = {g.name: g for g in garment.vertex_groups}
    keys = gm.shape_keys.key_blocks if gm.shape_keys else None
    gm.update()
    samples = []
    for v in gm.vertices:
        world = garment.matrix_world @ v.co
        old = {garment.vertex_groups[g.group].name:g.weight for g in v.groups}
        side = None
        tree, triangles = skin, tris
        if kind == "boots":
            # Use the foot assigned by the original boot rig, even where the inner
            # sole is physically closer to the other foot. Otherwise it tears in a stride.
            sides = ("Left","Right")
            side = max(sides,key=lambda s:sum(w for name,w in old.items() if ":"+s in name))
            tree, triangles = feet[side]
        p, n, face, distance = tree.find_nearest(world)
        samples.append((world,p,n,triangles[face] if face is not None else None,distance,old,side))
    adjusted = 0
    for v, (world,p,n,ids,distance,old,boot_side) in zip(gm.vertices,samples):
        if kind == "skirt":
            # Give the pleats room to clear a forward knee without making the waistband baggy.
            flare = .032 * (1-smoothstep(.255,.43,world.z))
            radial = Vector((world.x,world.y+.034,0))
            if radial.length > .001:
                v.co += inv.to_3x3() @ (flare * radial.normalized())
        if p is None or distance > .10:
            continue
        # Keep the flat tread and the shape of a freely hanging skirt hem.
        use_clearance = kind != "boots" or world.z > .012
        signed = (world-p).dot(n)
        if use_clearance and signed < clearance:
            move = inv.to_3x3() @ (n * min(.022, clearance-signed))
            if keys:
                for key in keys:
                    key.data[v.index].co += move
            else:
                v.co += move
            adjusted += 1

        if kind == "skirt":
            side = "Left" if world.x > 0 else "Right"
            leg = groups.get("mixamorig:" + side + "UpLeg")
            hips = groups.get("mixamorig:Hips")
            t = .64 * (1-smoothstep(.24,.445,world.z))
            if leg and hips:
                for entry in list(v.groups):
                    garment.vertex_groups[entry.group].remove([v.index])
                leg.add([v.index], t, "REPLACE")
                hips.add([v.index], 1-t, "REPLACE")
            continue
        factors = poly_3d_calc([points[i] for i in ids], p)
        target = {}
        for i,factor in zip(ids,factors):
            for name,w in weights[i].items():
                if name in groups and "Tail" not in name and (not boot_side or ":"+boot_side in name):
                    target[name] = target.get(name,0) + max(0,factor)*w
        total = sum(target.values())
        if total < .4:
            continue
        # Keep some of the authored drape on a hood, but follow the same arm and foot weights as the skin.
        follow = .93 * (1-smoothstep(.044,.085,distance)) if top else .98
        mix = {n: (1-follow)*old.get(n,0) + follow*target.get(n,0)/total for n in old.keys() | target.keys()}
        chosen = sorted(mix.items(),key=lambda kv:(-kv[1],kv[0]))[:4]
        norm = sum(w for _,w in chosen)
        for name in old:
            groups[name].remove([v.index])
        for name,w in chosen:
            if w > 1e-6:
                groups[name].add([v.index],w/norm,"REPLACE")
    for mat in gm.materials:
        if not mat or not mat.use_nodes:
            continue
        for node in list(mat.node_tree.nodes):
            if node.type == "TEX_IMAGE" and (not node.image or not node.image.has_data):
                mat.node_tree.nodes.remove(node)
    gm.update()
    print(kind, "clearance adjusted", adjusted, "/", len(gm.vertices))

def main():
    source, out = map(Path, sys.argv[sys.argv.index("--")+1:])
    out.mkdir(parents=True, exist_ok=True)
    for sex in "fm":
        bpy.ops.wm.read_factory_settings(use_empty=True)
        cat = load(source / f"cat-{sex}.glb")
        head = bpy.data.objects["Head"]
        rebuild_head(head, sex)
        body = bpy.data.objects["Body"]
        trim_old_jaw(body,sex)
        keep = {o for o in cat if o.name not in ("Face","ClothTop","ClothBottom")}
        save(out / f"cat-{sex}.glb", keep, True)
        for kind in ("hoodie","jacket","skirt","boots"):
            clothes = load(source / f"{kind}-{sex}.glb")
            garment = next(o for o in clothes if o.type=="MESH" and o.vertex_groups)
            fit_garment(body, garment, kind)
            save(out / f"{kind}-{sex}.glb",clothes)
            for o in clothes:
                if o.type == "MESH":
                    mesh = o.data
                    bpy.data.objects.remove(o,do_unlink=True)
                    bpy.data.meshes.remove(mesh)
                else:
                    bpy.data.objects.remove(o,do_unlink=True)
            for material in list(bpy.data.materials):
                if not material.users:
                    bpy.data.materials.remove(material)

if __name__=="__main__":
    main()
