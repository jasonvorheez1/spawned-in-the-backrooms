"""Bonus mall furniture. Run with Blender -b --factory-startup --python props.py -- OUTPUT."""
import bpy
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, rough=.4, metal=0, glow=0):
    m = bpy.data.materials.new(name)
    rgb = tuple(int(color[i:i+2], 16) / 255 for i in (0, 2, 4))
    rgba = tuple(c / 12.92 if c < .04045 else ((c+.055)/1.055)**2.4 for c in rgb) + (1,)
    m.diffuse_color = rgba
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    for key, value in {"Base Color": rgba, "Roughness": rough, "Metallic": metal,
                       "Emission Color": rgba, "Emission Strength": glow}.items():
        bs.inputs[key].default_value = value
    return m

chrome = material("Satin aluminum", "aebec6", .26, .75)
dark = material("Graphite", "212334", .55)
teal = material("Sea glass enamel", "387c80", .32, .25)
pink = material("Orchid enamel", "a65480", .38, .18)
ceramic = material("Ivory terrazzo", "e2d4c2", .36)
wood = material("Honey ash", "b78156", .45)
soil = material("Dark mulch", "3a2925", .96)
shell = material("shell", "3f395e", .38)
screen = material("screen", "233f58", .17, 0, .32)
marquee = material("marquee", "d67cbd", .28, 0, .8)
cyan = material("Cyan light", "67e4df", .28, 0, 1.35)
amber = material("Amber lamp", "ffc36f", .32, 0, .9)

def finish(o, name, mat, bevel=0):
    o.name = name
    o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new("Edge radius", "BEVEL")
        mod.width, mod.segments = bevel, 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for face in o.data.polygons:
            face.use_smooth = True
        mod = o.modifiers.new("Face normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def block(name, loc, size, mat, edge=.015, tilt=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.rotation_euler.x = tilt
    return finish(o, name, mat, edge)

def lathe(name, profile, mat, loc=(0,0,0), sx=1, sy=1, steps=40):
    verts = [(sx*r*math.cos(a),sy*r*math.sin(a),z) for r,z in profile
             for a in (2*math.pi*i/steps for i in range(steps))]
    faces = [tuple(reversed(range(steps)))]
    for j in range(len(profile)-1):
        for i in range(steps):
            n = (i+1)%steps
            faces.append((j*steps+i, j*steps+n, (j+1)*steps+n, (j+1)*steps+i))
    faces.append(tuple(range((len(profile)-1)*steps,len(profile)*steps)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.data.materials.append(mat)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices) == 4
    return o

def profile(name, outline, width, mat, edge=.02):
    # Side outline is in (depth, height), counterclockwise viewed from +X.
    verts = [(x,y,z) for x in (-width/2,width/2) for y,z in outline]
    n = len(outline)
    faces = [tuple(reversed(range(n))), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return finish(o,name,mat,edge)

def display(name, width, height, loc, mat, lean=0, bulge=0):
    n = 8
    verts, uvs = [], []
    for j in range(n+1):
        v = j/n
        for i in range(n+1):
            u = i/n
            verts.append(((u-.5)*width,(v-.5)*height*lean-bulge*math.sin(math.pi*u)*math.sin(math.pi*v),(v-.5)*height))
            uvs.append((u,v))
    faces = [(j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i)
             for j in range(n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new()
    for loop in mesh.loops:
        uv.data[loop.index].uv = uvs[loop.vertex_index]
    o = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.data.materials.append(mat)

def rod(name,a,b,r,mat):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    finish(o,name,mat,.006)

def bench():
    for x in (-.76,.76):
        for y in (-.24,.22):
            rod("Raked leg",(x*1.09,y*1.15,0),(x,y*.76,.43),.035,chrome)
        rod("Back support",(x,.19,.36),(x,.29,.88),.032,chrome)
    block("Seat subframe",(0,0,.4),(1.65,.42,.065),dark,.027)
    for i,y in enumerate((-.222,-.11,.004,.118,.232)):
        block("Seat slat",(0,y,.464+(i-2)**2*.003),(1.94,.103,.071),wood,.028)
    for z,y in ((.62,.23),(.737,.256),(.854,.281)):
        block("Back slat",(0,y,z),(1.94,.064,.111),wood,.027,-.17)

def planter():
    lathe("Recessed foot",[(.58,0),(.62,.022),(.62,.09)],dark)
    lathe("Tapered ceramic",[(.62,.07),(.66,.083),(.7,.14),(.79,.48),(.825,.61),(.82,.67),(.74,.67),(.74,.64)],ceramic)
    lathe("Glazed rolled rim",[(.795,.59),(.833,.606),(.845,.64),(.842,.679),(.823,.704),(.779,.704),(.763,.683),(.763,.646)],teal)
    lathe("Mulch",[(.74,.643),(.758,.652),(.757,.663)],soil)

def pedestal():
    lathe("Weighted plinth",[(.26,0),(.315,.016),(.327,.038),(.318,.058),(.263,.078)],dark)
    lathe("Tulip stem",[(.25,.068),(.184,.10),(.11,.17),(.075,.28),(.087,.39),(.15,.49),(.20,.515)],teal)
    lathe("Terrazzo top",[(.29,.50),(.322,.516),(.327,.537),(.318,.56)],ceramic)

def cabinet():
    outline=[(-.29,.065),(-.38,.78),(-.48,.89),(-.477,.995),(-.35,1.08),
             (-.225,1.51),(-.34,1.57),(-.325,1.72),(-.23,1.79),(.25,1.79),
             (.373,1.66),(.39,.12),(.33,.065)]
    profile("Molded cabinet",outline,.755,shell,.028)
    block("Kick plate",(0,.004,.083),(.76,.76,.166),dark,.035)
    block("Coin door",(0,-.36,.46),(.365,.067,.33),dark,.025,-.10)
    for x in (-.075,.075):
        block("Coin return",(x,-.409,.51),(.058,.023,.071),chrome,.008)
        block("Coin slot",(x,-.424,.52),(.008,.006,.035),dark,.002)
    block("CRT surround",(0,-.294,1.29),(.655,.081,.46),dark,.041,-.284)
    display("CRT glass",.529,.359,(0,-.341,1.296),screen,.292,.024)
    block("Lightbox surround",(0,-.324,1.656),(.663,.067,.172),dark,.026)
    display("Marquee",.603,.119,(0,-.363,1.656),marquee,0,.008)
    block("Control shelf",(0,-.444,.968),(.722,.241,.10),dark,.035,.16)
    for x in (-.235,.06):
        rod("Joystick",(x,-.458,1.008),(x,-.453,1.108),.012,chrome)
        lathe("Ball grip",[(.015,1.085),(.029,1.101),(.029,1.124),(.016,1.138)],pink,(x,-.453,0),steps=14)
        for dx,dy,m in ((.083,-.028,amber),(.13,-.005,cyan),(.176,.013,pink)):
            lathe("Pushbutton",[(.019,1.005),(.021,1.012),(.019,1.024)],m,(x+dx,-.452+dy,0),steps=12)
    for x in (-.341,.341):
        block("Side light",(x,-.413,.986),(.029,.21,.025),cyan,.01,.16)

def kiosk():
    lathe("Rubber foot",[(.39,0),(.413,.018),(.413,.061),(.39,.082)],dark,sx=1.12,sy=.91)
    lathe("Cast pedestal",[(.37,.071),(.34,.11),(.24,.23),(.18,.44),(.18,.75),(.23,.95),(.28,1.05)],teal,sx=1.1,sy=.86)
    block("Screen housing",(0,-.035,1.22),(.79,.43,.65),ceramic,.13,-.29)
    block("Inset fascia",(0,-.243,1.25),(.683,.079,.496),dark,.073,-.29)
    display("Navigator glass",.551,.338,(0,-.291,1.27),screen,.29,.009)
    # A simple route schematic is baked into the screen, with raised status lights below.
    for x in (-.17,0,.17):
        lathe("Route stop",[(.018,0),(.018,.009)],cyan,(x,-.307,1.26),steps=16).rotation_euler.x=math.pi/2
    rod("Route line",(-.17,-.306,1.264),(.17,-.306,1.264),.008,cyan)
    for x in (-.23,.23):
        lathe("Ready light",[(.012,0),(.012,.006)],amber,(x,-.333,1.08),steps=12).rotation_euler.x=math.pi/2
    block("Ticket outlet",(0,-.229,.91),(.255,.037,.036),dark,.012)

def prize():
    # Separate shelves leave negative space behind the illuminated merchandise.
    block("Rounded plinth",(0,0,.128),(1.82,.66,.256),teal,.11)
    for x in (-.75,.75):
        rod("Upright",(x,.16,.19),(x,.16,1.61),.035,chrome)
        rod("Front upright",(x,-.23,.19),(x,-.23,1.61),.027,chrome)
    for j,z in enumerate((.39,.79,1.19,1.57)):
        block("Shelf",(0,0,z),(1.71,.562,.062),ceramic,.031)
        if j==3:
            block("Lightbox",(0,-.05,1.675),(1.69,.48,.19),pink,.078)
            block("Light diffuser",(0,-.283,1.665),(1.51,.025,.048),cyan,.011)
            break
        for i,x in enumerate((-.53,-.19,.19,.53)):
            m = (pink,teal,amber,ceramic)[(i+j)%4]
            if j==0:
                block("Prize box",(x,.03,z+.137),(.26,.29,.213),m,.026)
                block("Paper label",(x,-.119,z+.148),(.175,.012,.075),ceramic,.004)
            else:
                lathe("Capsule prize",[(.079,z+.031),(.102,z+.057),(.105,z+.133),(.091,z+.198),(.056,z+.237),(.019,z+.248)],m,(x,.032,0),steps=20)

builders={"bench":bench,"planter":planter,"pedestal":pedestal,"cabinet":cabinet,"kiosk":kiosk,"prize":prize}
manifest = {}
for name, build in builders.items():
    bpy.ops.object.select_all(action="DESELECT")
    before=set(bpy.data.objects)
    build()
    parts=set(bpy.data.objects)-before
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
    xyz=[(p.x,p.z,-p.y) for p in points]
    bounds=[[round(f(p[i] for p in xyz),4) for i in range(3)] for f in (min,max)]
    assert abs(bounds[0][1]) < .01 and all(a<b for a,b in zip(*bounds)), (name,bounds)
    for o in parts:
        o.select_set(True)
    # Join each prop so glTF has one mesh with named materials for screen and cabinet variants.
    bpy.context.view_layer.objects.active = sorted(parts,key=lambda o:o.name)[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=name
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    file=out/(name+".glb")
    bpy.ops.export_scene.gltf(filepath=str(file),use_selection=True,export_yup=True,export_apply=True)
    obj.location=(3.5*((len(manifest))%3),3.6*(len(manifest)//3),0)
    manifest[name]={"min":bounds[0],"max":bounds[1],"bytes":file.stat().st_size}

scene=bpy.context.scene
scene.world=bpy.data.worlds.new("Studio")
scene.world.color=(.07,.08,.11)
bpy.ops.object.camera_add(location=(10,-15,10))
cam=bpy.context.object
cam.rotation_euler=(Vector((3.45,1.65,.54))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=10.2
scene.camera=cam
scene.render.engine='BLENDER_WORKBENCH'
sh=scene.display.shading
sh.light='STUDIO'
sh.color_type='MATERIAL'
sh.show_shadows=True
sh.show_cavity=True
sh.cavity_type='BOTH'
sh.background_type='WORLD'
scene.render.resolution_x=1250
scene.render.resolution_y=720
scene.render.resolution_percentage=100
scene.render.filepath=str(out/"props.png")
bpy.ops.wm.save_as_mainfile(filepath=str(out/"bonus-mall-props.blend"))
bpy.ops.render.render(write_still=True)
(out/"manifest.json").write_text(json.dumps(manifest,indent=2))
