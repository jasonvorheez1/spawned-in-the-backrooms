import bpy,math,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
SIZES={'filing':(.48,1.32,.62),'desk':(1.4,.76,.7),'cabinet':(.9,1.1,.42),'locker':(.5,1.9,.5),'toolbox':(.62,.32,.3),'fridge':(.8,1.85,.75),'fuse':(.7,.95,.24)}
manifest={}
def material(name,c,rough=.5,metal=.15):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
def box(name,loc,size,mat,b=.005):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if b:mod=o.modifiers.new('Rolled edges','BEVEL');mod.width=min(b,min(size)*.3);mod.segments=3;o.modifiers.new('Face normals','WEIGHTED_NORMAL')
 return o
def bounds(objs):
 pts=[o.matrix_world@Vector(v) for o in objs for v in o.bound_box];return Vector([min(v[i]for v in pts)for i in range(3)]),Vector([max(v[i]for v in pts)for i in range(3)])
def export(objs,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objs:
  o.select_set(True);bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.view_layer.update();a,b=bounds([o]);center=(a+b)/2
 # glTF geometry is centered, and the runtime explicitly uses a center pivot.
 o.data.transform(Matrix.Translation(-center)@o.matrix_world);o.matrix_world=Matrix.Identity(4)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT')
 o.location=center;return o,center
for kind,(w,h,d)in SIZES.items():
 bpy.ops.wm.read_factory_settings(use_empty=True)
 paint=material('paint',(.45,.49,.43)if kind!='fridge' else(.8,.81,.76),.44,.25);metal=material('metal',(.40,.43,.44),.3,.8);dark=material('dark',(.065,.077,.068),.85,.05);liner=material('interior',(.21,.25,.21)if kind!='fridge'else(.67,.7,.63),.65,.05);wood=material('wood',(.25,.16,.085),.62,0);paper=material('label',(.66,.64,.49),.95,0)
 body=[];moving=[];t=.022;front=d/2+.012
 def B(n,x,y,z,a,b,c,m=paint,bevel=.005,parts=body):
  o=box(n,(x,y,z),(a,b,c),m,bevel);parts.append(o);return o
 def handle(parts,x,y,z,width=.12):
  B('Handle socket',x-width/2,y,z,.014,.034,.024,metal,parts=parts);B('Handle socket',x+width/2,y,z,.014,.034,.024,metal,parts=parts);B('Handle',x,y+.024,z,width+.012,.016,.018,metal,.007,parts)
 def shell():
  B('Left side',-w/2+t/2,0,h/2,t,d,h);B('Right side',w/2-t/2,0,h/2,t,d,h);B('Back',0,-d/2+t/2,h/2,w,t,h);B('Bottom',0,0,.045,w,d,.07);B('Top',0,0,h-.02,w,d,.04)
  B('Recessed plinth',0,-.018,.035,w-.065,d-.03,.07,dark)
 def door(name,x,z,dw,dh,pivot,angle=106):
  ps=[];B(name,x,front,z,dw,.03,dh,paint,.012,ps);B('Inner liner',x,front-.022,z,dw-.045,.018,dh-.045,liner,.006,ps);handle(ps,x+dw*.30,front+.025,z)
  B('Inset label',x-dw*.15,front+.018,z+dh*.31,dw*.24,.004,.037,paper,.001,ps)
  for zz in [z-dh*.32,z+dh*.32]:B('Hinge barrel',pivot[0],front,zz,.022,.025,.075,metal,.007)
  moving.append((name,ps,pivot,'yaw',angle))
 def drawer(index,x,z,dw,dh,move):
  ps=[] if move else body
  B('Drawer front',x,front,z,dw,.025,dh,paint if kind!='desk'else wood,.007,ps);handle(ps,x,front+.025,z,width=min(.14,dw*.4));B('Label surround',x,front+.016,z+dh*.28,.12,.005,.028,metal,.001,ps);B('Label card',x,front+.020,z+dh*.28,.105,.003,.02,paper,.001,ps)
  if move:
   B('Drawer tray',x,0,z-dh/2+.018,dw-.025,d-.05,.015,liner,.002,ps)
   for sx in [-1,1]:B('Drawer side',x+sx*(dw/2-.02),0,z,.014,d-.045,dh-.025,liner,.003,ps)
   B('Drawer rear',x,-d/2+.035,z,dw-.03,.014,dh-.025,liner,.003,ps)
   for yy in [-.12,-.04,.045,.12]:B('File divider',x,yy,z-.015,dw*.85,.008,dh*.6,paper,.001,ps)
   moving.append(('drawer',ps,(x,0,z),'slide',-.32 if kind=='filing'else-.25))
 if kind in ['filing','cabinet','locker','fridge','fuse']:shell()
 if kind=='filing':
  for i in range(4):drawer(i,0,.205+i*.305,w-.038,.289,i==3)
 elif kind=='desk':
  B('Desk top',0,0,h-.025,w,d,.05,wood,.014)
  for x in [-w/2+.035,w/2-.035]:B('Leg frame',x,-.015,(h-.05)/2,.042,d-.08,h-.05,metal,.006)
  B('Privacy panel',0,-d/2+.04,h*.52,w-.06,.026,h*.50,wood,.008)
  x=w/2-.25
  for xx in [x-.215,x+.215]:B('Drawer pedestal',xx,0,.36,.025,d-.04,.66,wood,.007)
  for i in range(3):drawer(i,x,.18+i*.21,.405,.195,i==2)
 elif kind=='cabinet':
  for z in [.35,.7]:B('Shelf',0,0,z,w-.05,d-.045,.018,liner,.003)
  for side in [-1,1]:door('left_door'if side<0 else'right_door',side*w/4,h*.52,w/2-.025,h-.14,(side*(w/2-.02),front,h*.52),106 if side<0 else-106)
 elif kind=='locker':
  B('Top shelf',0,0,h-.29,w-.05,d-.04,.018,liner,.003);B('Coat rail',0,.02,h-.42,w-.09,.022,.025,metal,.008)
  door('door',0,h*.51,w-.038,h-.14,(-w/2+.02,front,h*.51))
  ps=moving[-1][1]
  for z0 in [.24,h-.39]:
   for i in range(5):B('Louvre',-.01,front+.02,z0+i*.035,w-.17,.008,.012,dark,.002,ps)
 elif kind=='fridge':
  for z in [.28,.66,1.03,1.48]:B('Glass shelf',0,0,z,w-.07,d-.065,.014,liner,.003)
  for z,dh in [(.70,1.25),(1.60,.43)]:door('main_door'if z<1 else'freezer_door',0,z,w-.035,dh,(-w/2+.022,front,z))
 elif kind=='fuse':
  B('Panel backing',0,-.015,h/2,w-.065,.022,h-.10,dark,.002)
  for x in [-.2,0,.2]:
   B('Fuse carrier',x,.03,.49,.10,.065,.24,liner,.006)
   for z in [.40,.58]:B('Fuse terminal',x,.055,z,.065,.06,.028,metal,.003)
  door('door',0,h*.52,w-.04,h-.12,(-w/2+.02,front,h*.52),100)
 elif kind=='toolbox':
  bh=.225
  B('Base',0,0,.02,w,d,.04,paint,.01)
  for x in [-w/2+.014,w/2-.014]:B('Side',x,0,bh/2,.026,d,bh,paint,.009)
  for y in [-d/2+.014,d/2-.014]:B('Side',0,y,bh/2,w,.026,bh,paint,.009)
  B('Tray',0,0,.09,w-.05,d-.05,.016,liner,.003)
  ps=[];B('Lid',0,0,.27,w+.008,d+.008,.086,paint,.016,ps)
  for x in [-.075,.075]:B('Handle foot',x,0,.325,.018,.035,.045,dark,.007,ps)
  B('Handle',0,0,.345,.17,.03,.022,dark,.009,ps)
  for x in [-.20,.20]:B('Latch',x,front+.007,.23,.045,.018,.065,metal,.006,ps)
  moving.append(('lid',ps,(0,-d/2,.225),'pitch',105))
 shell_obj,shell_center=export(body,kind+'-body');parts=[];parents=[]
 for name,objs,pivot,axis,travel in moving:
  ob,center=export(objs,kind+'-'+name);offset=center-Vector(pivot)
  bpy.ops.object.empty_add(location=pivot);par=bpy.context.object;par.name='hinge_'+name;ob.parent=par;ob.location=offset;parents.append((par,axis,travel))
  cv=lambda v:[round(v[0],6),round(v[2],6),round(-v[1],6)]
  parts.append({'id':name,'file':kind+'-'+name+'.glb','pivot':cv(pivot),'offset':cv(offset),'axis':axis,'travel':travel})
 manifest[kind]={'size':[w,h,d],'body':kind+'-body.glb','center':[round(shell_center.x,6),round(shell_center.z,6),round(-shell_center.y,6)],'parts':parts}
 # Editable movement cycle and representative closed/open views.
 for par,axis,travel in parents:
  par.rotation_mode='XYZ';par.keyframe_insert(data_path='location'if axis=='slide'else'rotation_euler',frame=1)
  if axis=='slide':par.location.y-=travel
  else:par.rotation_euler[2 if axis=='yaw'else 0]=math.radians(travel)
  par.keyframe_insert(data_path='location'if axis=='slide'else'rotation_euler',frame=25)
 sc=bpy.context.scene;sc.frame_end=25;sc.render.engine='CYCLES';sc.cycles.samples=24;sc.render.resolution_x=720;sc.render.resolution_y=720;sc.render.resolution_percentage=100
 sc.world=bpy.data.worlds.new('World');sc.world.color=(.16,.16,.16)
 for loc,power,size in [((2,3,4),550,3),((-3,1,2),350,2),((0,-3,3),400,2)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,h*.5))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(material('floor',(.12,.14,.12),.9,0))
 bpy.ops.object.camera_add(location=(w*2.4+1,d*2.5+1.3,h*.85+.5));cam=bpy.context.object;target=Vector((0,0,h*.5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(w*1.9,h*1.55,1.3);sc.camera=cam
 for frame,pose in [(1,'closed'),(25,'open')]:sc.frame_set(frame);sc.render.filepath=str(OUT/(kind+'-'+pose+'.png'));bpy.ops.render.render(write_still=True)
 sc.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(kind+'.blend')))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2));print('BUILT',len(manifest),'articulated props')
