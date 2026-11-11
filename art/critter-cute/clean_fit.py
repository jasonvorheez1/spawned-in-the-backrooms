"""Build continuous hoodies and pleated skirts on the existing demo rigs.

Run in Blender: -b --factory-startup --python clean_fit.py -- DECODED_BODY_DIR OUTPUT_DIR
Inputs are cat-f.glb and cat-m.glb from the active wardrobe, decoded before import.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0,str(Path(__file__).parent))
from profile_fit import load, save, smoothstep

P = "mixamorig:"

def attach(obj, rig, cloth):
    obj.data.materials.clear()
    obj.data.materials.append(cloth)
    for face in obj.data.polygons:
        face.use_smooth = True
        face.material_index = 0
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.matrix_world = world
    mod = obj.modifiers.new("Skin", "ARMATURE")
    mod.object = rig

def shell(body, rig, sex, cloth):
    female = sex == "f"
    hem, neck, cuff = (.432,.633,.342) if female else (.466,.727,.385)
    g = body.copy()
    g.data = body.data.copy()
    g.name = "Hoodie"
    bpy.context.collection.objects.link(g)
    g.parent = None
    g.matrix_world = body.matrix_world.copy()
    g.modifiers.clear()
    bm = bmesh.new()
    bm.from_mesh(g.data)
    groups = {vg.index:vg.name for vg in g.vertex_groups}
    tail = {idx for idx,name in groups.items() if "Tail" in name}
    deform = bm.verts.layers.deform.active
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if sum(v[deform].get(i,0) for i in tail)>.24],context="VERTS")
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00006)
    inv = g.matrix_world.inverted()
    for point,n in (((0,0,hem),(0,0,-1)),((0,0,neck),(0,0,1)),
                    ((cuff,0,0),(1,0,0)),((-cuff,0,0),(-1,0,0))):
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                              dist=.00001,plane_co=inv@Vector(point),
                              plane_no=g.matrix_world.to_3x3().transposed()@Vector(n),clear_outer=True)
    # The neckline cut follows the upper torso instead of carrying old neck fragments.
    for e in list(bm.edges):
        if e.is_valid and not e.link_faces:
            bm.edges.remove(e)
    for v in list(bm.verts):
        if v.is_valid and not v.link_faces:
            bm.verts.remove(v)
    # Smooth just the cloth form. Preserve the body-derived skin weights and morph deltas.
    layers = list(bm.verts.layers.shape.values())
    before = {v:v.co.copy() for v in bm.verts}
    bm.normal_update()
    for _ in range(4):
        bmesh.ops.smooth_vert(bm,verts=[v for v in bm.verts if not v.is_boundary],
                              factor=.37,use_axis_x=True,use_axis_y=True,use_axis_z=True)
    bm.normal_update()
    for v in bm.verts:
        x,y,z = g.matrix_world @ v.co
        arm = smoothstep(.105,.22,abs(x))
        waist_rib = 1-smoothstep(.008,.021,z-hem)
        cuff_rib = arm*(1-smoothstep(.006,.020,cuff-abs(x)))
        # A slight hang over the stomach and fuller upper sleeves.
        n = v.normal
        room = .015 + .006*arm + .005*max(waist_rib,cuff_rib)
        forward = max(0,-n.y)*(1-arm)*smoothstep(hem,hem+.04,z)*(1-smoothstep(neck-.060,neck-.010,z))
        v.co += n*room + inv.to_3x3()@Vector((0,-.007*forward,0))
        d = v.co-before[v]
        for layer in layers:
            v[layer] += d
    if female:
        sew_neckline(bm,g,inv,neck,deform,layers)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(g.data)
    bm.free()
    attach(g,rig,cloth)
    return g

def sew_neckline(bm, garment, inv, neck, deform, layers):
    # Join the inherited shoulder rim to one small collar opening. The original
    # female body has a wide neck cut which leaves skin visible at the shoulder.
    world = garment.matrix_world
    edges = {e for e in bm.edges if e.is_boundary and all(
        abs((world@v.co).x)<.25 and (world@v.co).z > neck-.066 for v in e.verts)}
    if not edges:
        return
    seed = max(edges,key=lambda e:sum((world@v.co).z for v in e.verts))
    start = seed.verts[0]
    ring = [start]
    edge = seed
    while True:
        v = edge.other_vert(ring[-1])
        if v == start:
            break
        if v in ring:
            raise ValueError("Collar boundary crosses itself")
        ring.append(v)
        choices = [e for e in v.link_edges if e in edges and e != edge]
        if len(choices) != 1:
            raise ValueError("Expected a closed neck boundary")
        edge = choices[0]
    coords = [world@v.co for v in ring]
    center_y = -.045
    angle = math.atan2(coords[0].y-center_y,coords[0].x)
    area = sum(p.x*q.y-p.y*q.x for p,q in zip(coords,coords[1:]+coords[:1]))
    sign = 1 if area>0 else -1
    spine = garment.vertex_groups[P+"Spine2"].index
    inner = []
    for i,v in enumerate(ring):
        t=angle+sign*2*math.pi*i/len(ring)
        co=inv@Vector((.062*math.cos(t),center_y+.052*math.sin(t),neck+.001+.008*math.sin(t)))
        u=bm.verts.new(co)
        u[deform][spine]=1
        for layer in layers:
            u[layer]=co
        inner.append(u)
    for i,v in enumerate(ring):
        n=(i+1)%len(ring)
        bm.faces.new((v,ring[n],inner[n],inner[i]))

def mesh_obj(name, verts, faces, rig, cloth):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    o = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    attach(o,rig,cloth)
    return o

def hood(rig, sex, cloth):
    """A collapsed U-shaped hood behind the neck, folded down at the rear."""
    female = sex=="f"
    h = .617 if female else .706
    yc = -.047 if female else -.086
    verts,faces = [],[]
    for i in range(37):
        t=i/36
        a=-.13+math.pi*1.08*t
        back=max(0,math.sin(a))
        center=Vector((.092*math.cos(a),yc+.076*math.sin(a),h-.042*back))
        radial=Vector((math.cos(a),math.sin(a),0))
        for j in range(12):
            b=2*math.pi*j/12
            point=center+radial*(.021*math.cos(b))+Vector((0,0,.018*math.sin(b)))
            verts.append(point)
        if i:
            for j in range(12):
                k=(j+1)%12
                faces.append(((i-1)*12+j,(i-1)*12+k,i*12+k,i*12+j))
    faces += [tuple(reversed(range(12))),tuple(range(36*12,37*12))]
    o=mesh_obj("FoldedHood",verts,faces,rig,cloth)
    g=o.vertex_groups.new(name=P+"Spine2")
    g.add(list(range(len(verts))),1,"REPLACE")
    return o

def skirt(rig, sex, cloth):
    female = sex=="f"
    waist, hem = (.444,.290) if female else (.481,.320)
    cy = -.039 if female else -.076
    width,depth = (.157,.118) if female else (.166,.130)
    verts,faces,legmix = [],[],[]
    seg=112
    # Wide enough for stride. Pleats fan out below a quiet, level waistband.
    for j in range(12):
        t=j/11
        z=waist-(waist-hem)*t
        for i in range(seg):
            a=2*math.pi*i/seg
            pleat = (.004+.012*t)*(.55+.45*math.cos(14*a))
            rx = width + .069*t + pleat + (.006 if j<2 else 0)
            ry = depth + .084*t + pleat + (.006 if j<2 else 0)
            x,y=rx*math.cos(a),cy+ry*math.sin(a)
            # Shape a rear vent around the tail's sweep, rather than letting it
            # punch through the fabric. Keep the waistband joined above it.
            center = 1.34 if female else 1.15
            vent_width = .64 if female else .70
            vent = (.133 if female else .146)*t*(1-smoothstep(.20,vent_width,abs(a-center)))
            verts.append((x,y,z+vent))
            legmix.append((.62*t,smoothstep(-.085,.085,x)))
    for j in range(11):
        for i in range(seg):
            n=(i+1)%seg
            faces.append((j*seg+i,(j+1)*seg+i,(j+1)*seg+n,j*seg+n))
    o=mesh_obj("PleatedSkirt",verts,faces,rig,cloth)
    hips,left,right=[o.vertex_groups.new(name=P+s) for s in ("Hips","LeftUpLeg","RightUpLeg")]
    for i,(leg,side) in enumerate(legmix):
        hips.add([i],1-leg,"REPLACE")
        if leg*side>0:left.add([i],leg*side,"REPLACE")
        if leg*(1-side)>0:right.add([i],leg*(1-side),"REPLACE")
    return o

def main():
    src,out=map(Path,sys.argv[-2:])
    out.mkdir(parents=True,exist_ok=True)
    for sex in "fm":
        bpy.ops.wm.read_factory_settings(use_empty=True)
        cat=load(src/f"cat-{sex}.glb")
        body=bpy.data.objects["Body"]
        rig=next(o for o in cat if o.type=="ARMATURE")
        # Export the bind-pose shell with the same skeleton and the body's Chest delta.
        rig.animation_data_clear()
        cloth=bpy.data.materials.new("cloth")
        top=shell(body,rig,sex,cloth)
        save(out/f"hoodie-{sex}.glb",{rig,top,hood(rig,sex,cloth)})
        save(out/f"skirt-{sex}.glb",{rig,skirt(rig,sex,cloth)})

if __name__=="__main__":
    main()
