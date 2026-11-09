"""Blender garment construction pass. Each catalog row becomes Ward_<id>.
Input meshes supply fitted sleeve/leg blocks, weights and body-shape keys.
Distinct cuts, shells, pockets, collars and hardware are built as real meshes.
Run: blender -b --factory-startup --python wardrobe.py -- body.glb catalog.json output.glb
"""
import bpy,bmesh,json,math,sys,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
src,catalog,dst=sys.argv[sys.argv.index('--')+1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=src)
R=next(o for o in bpy.data.objects if o.type=='ARMATURE')
sources={o.name:o for o in bpy.data.objects if o.type=='MESH'}
prefix={'topw':'Top','botw':'Bot','shoes':'Shoes','hat':'Hat','neck':'Neck','eyew':'Eyew'}
rows=json.loads(Path(catalog).read_text())['rows']; made=[]; report=[]
def sm(a,b,x):
 t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)
def material(name):
 m=bpy.data.materials.get(name)
 if m: return m
 m=bpy.data.materials.new(name); m.diffuse_color=(.34,.34,.34,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(.34,.34,.34,1); p.inputs['Roughness'].default_value=.8
 return m
def detail(name,verts,faces,base,mat='cloth_top',thickness=.003):
 mesh=bpy.data.meshes.new(name); inv=base.matrix_world.inverted(); mesh.from_pydata([inv@Vector(v) for v in verts],[],faces); mesh.update()
 o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); o.matrix_world=base.matrix_world.copy(); o.data.materials.append(material(mat))
 bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
 if thickness:
  mod=o.modifiers.new('Sewn edge thickness','SOLIDIFY'); mod.thickness=thickness; mod.offset=0; bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons: p.use_smooth=True
 return o
def weights(o,base,kd):
 groups={g.index:g.name for g in base.vertex_groups}; acc={}
 for v in o.data.vertices:
  _,i,_=kd.find(o.matrix_world@v.co); bv=base.data.vertices[i]
  for w in bv.groups:
   if w.weight>.005: acc.setdefault(groups[w.group],[]).append((v.index,w.weight))
 for name,vs in acc.items():
  g=o.vertex_groups.new(name=name)
  for i,w in vs:g.add([i],w,'REPLACE')
 if base.data.shape_keys:
  o.shape_key_add(name='Basis')
  for key in list(base.data.shape_keys.key_blocks)[1:]:
   k=o.shape_key_add(name=key.name)
   for v in o.data.vertices:
    _,i,_=kd.find(o.matrix_world@v.co); delta=key.data[i].co-base.data.vertices[i].co; k.data[v.index].co=v.co+delta
 mw=o.matrix_world.copy();o.parent=R;o.matrix_world=mw
 arm=o.modifiers.new('Clothing skin','ARMATURE'); arm.object=R
def clean_top(row,old):
 """Pattern-cut lofts replace the skin-derived torso rather than tracing it."""
 kind=row['kind']; rid=row['id']; pts=[old.matrix_world@v.co for v in old.data.vertices]
 armgroups={g.index for g in old.vertex_groups if any(t in g.name for t in ['Arm','ForeArm'])}
 armpts=[old.matrix_world@v.co for v in old.data.vertices if sum(w.weight for w in v.groups if w.group in armgroups)>.5]
 if rid in ['platevest','chitinplate','abysshauberk']:kind='armor'
 zmax=max(p.z for p in pts); zmin=min(p.z for p in pts); cy=(max(p.y for p in pts)+min(p.y for p in pts))/2
 isdress=kind=='dress'; isapron=kind=='apron'; bottom=zmax-.54
 if kind in ['tee','tank','longsleeve']:bottom=zmax-.51
 if isdress:bottom=zmax-.50
 if isapron:bottom=zmax-.42
 # Fit dimensions come from the torso block, with ease independent of skin creases.
 sexscale=zmax/1.48; sx=sexscale; ry=.114*sx; width=.170*sx
 rings=[(bottom,width*.95,ry*.91),(bottom+.04,width*.95,ry*.92),(zmax-.38,width*.94,ry*.93),(zmax-.23,width*1.05,ry*1.04),(zmax-.12,width*1.06,ry),(zmax-.055,width*.94,ry*.83),(zmax,.064*sx,.061*sx)]
 if kind=='sweater':rings=[(z,w*1.045,d*1.045) for z,w,d in rings]
 if isdress:rings=[(z,w*(.91 if z<zmax-.25 else 1),d) for z,w,d in rings]
 verts=[];faces=[]
 def loft(profiles,n=48,pleat=0):
  start=len(verts)
  for z,w,d in profiles:
   sample=[p for p in pts if abs(p.z-z)<.035 and abs(p.x)<.17*sexscale]
   ringcy=cy
   if sample:
    front=min(cy-d,min(p.y for p in sample)-.008);back=max(cy+d,max(p.y for p in sample)+.008);ringcy=(front+back)/2;d=(back-front)/2
   for k in range(n):
    a=2*math.pi*k/n; fold=1+pleat*math.cos(12*a);verts.append([w*math.cos(a)*fold,ringcy+d*math.sin(a)*fold,z])
  for j in range(len(profiles)-1):
   for k in range(n):a=start+j*n+k;b=start+j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
 loft(rings)
 if kind not in ['tank','dress','apron','armor']:
  length=max(abs(p.x) for p in pts); length=min(length,.65*sx)
  for side in [-1,1]:
   start=len(verts); n=24
   for j in range(9):
    t=j/8; x=(.135*sx+(length-.135*sx)*t)*side
    sample=[p for p in armpts if abs(p.x-x)<.035 and abs(p.x)>.18*sx]
    if not sample:sample=sorted(pts,key=lambda p:abs(p.x-x))[:24]
    z=(min(p.z for p in sample)+max(p.z for p in sample))/2; yc=(min(p.y for p in sample)+max(p.y for p in sample))/2
    cap=(.069 if kind in ['hoodie','sweater','jacket'] else .059)*sx
    rz=min(cap,max(.034*sx,(max(p.z for p in sample)-min(p.z for p in sample))/2+.005))
    ryarm=min(cap,max(.034*sx,(max(p.y for p in sample)-min(p.y for p in sample))/2+.005))
    for k in range(n):
     a=2*math.pi*k/n; verts.append([x,yc+math.sin(a)*ryarm,z+math.cos(a)*rz])
   for j in range(8):
    for k in range(n):a=start+j*n+k;b=start+j*n+(k+1)%n;faces.append((a,a+n,b+n,b) if side>0 else (a,b,b+n,a+n))
 if isdress:
  waist=bottom+.03; hem=zmin
  loft([(waist,width*.94,ry*.95)]+[(waist+(hem-waist)*j/12,width*(.94+.56*j/12),ry*(.95+.7*j/12)) for j in range(1,13)],48,.018)
 if isapron:
  # Aprons are open-backed panels, not a tube around the torso.
  faces=[f for f in faces if sum(verts[i][1] for i in f)/len(f)<cy+.02]
  start=len(verts); hem=zmin
  for z,w in [(bottom+.06,width*.7),(hem,width*1.12)]:
   for k in range(17):x=-w+2*w*k/16;verts.append([x,cy-ry-.015,z])
  for k in range(16):faces.append((start+k,start+k+1,start+k+18,start+k+17))
 ob=detail('Clean garment block',verts,faces,old,'cloth_top',0)
 if not isapron:
  # Union the torso and sleeve blocks into a continuous shoulder surface.
  bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0);bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:]);bm.to_mesh(ob.data);bm.free()
  bpy.context.view_layer.objects.active=ob
  rm=ob.modifiers.new('Continuous sewn shoulder','REMESH');rm.mode='VOXEL';rm.voxel_size=.007;rm.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rm.name)
  bm=bmesh.new();bm.from_mesh(ob.data);bm.transform(ob.matrix_world)
  cutplanes=[((0,0,(zmin if isdress else bottom)+.006),(0,0,-1)),((0,0,zmax-.004),(0,0,1))]
  if kind not in ['tank','dress','armor']:
   cutplanes.extend([((s*(length-.006),0,0),(s,0,0)) for s in [-1,1]])
  for point,normal in cutplanes:bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.0001,plane_co=point,plane_no=normal,clear_outer=True)
  bm.transform(ob.matrix_world.inverted());bm.to_mesh(ob.data);bm.free()
  # Small construction folds at cuffs and waist; loose cloth does not print anatomy.
  for v in ob.data.vertices:
   p=ob.matrix_world@v.co;ax=abs(p.x)
   crease=math.exp(-((p.z-(bottom+.055))/.04)**2)*(.0025*math.cos(p.x*87))
   if ax>.22:crease+=.002*math.sin(ax*110)*math.exp(-((ax-.42)/.08)**2)
   v.co.y+=crease
  tris=sum(len(p.vertices)-2 for p in ob.data.polygons)
  if tris>4200:
   dc=ob.modifiers.new('Game topology budget','DECIMATE');dc.ratio=4200/tris;bpy.ops.object.modifier_apply(modifier=dc.name)
  # Keep cut edges sewn and planar after remeshing/decimation.
  bm=bmesh.new();bm.from_mesh(ob.data);bm.transform(ob.matrix_world)
  for point,normal in cutplanes:
   point=Vector(point);normal=Vector(normal)
   for v in bm.verts:
    if v.is_boundary and abs((v.co-point).dot(normal))<.02:v.co-=normal*(v.co-point).dot(normal)
  bm.transform(ob.matrix_world.inverted());bm.to_mesh(ob.data);bm.free()
  so=ob.modifiers.new('Fabric shell and sewn edges','SOLIDIFY');so.thickness=.0035;so.offset=0;bpy.ops.object.modifier_apply(modifier=so.name)
  for p in ob.data.polygons:p.use_smooth=True
 kd=KDTree(len(pts))
 for i,p in enumerate(pts):kd.insert(p,i)
 kd.balance();weights(ob,old,kd)
 return ob
def clean_shoes(row,old):
 pts=[old.matrix_world@v.co for v in old.data.vertices];verts=[];faces=[];n=40
 for side in [-1,1]:
  ps=[p for p in pts if p.x*side>0];cx=sum(p.x for p in ps)/len(ps);y0=min(p.y for p in ps);y1=max(p.y for p in ps);z0=min(p.z for p in ps);z1=max(p.z for p in ps);cy=(y0+y1)/2;rx=(max(p.x for p in ps)-min(p.x for p in ps))/2+.006;ry=(y1-y0)/2+.007
  heelcy=y1-.045;shaft=row['kind']=='boots';start=len(verts)
  profiles=[(z0,rx*1.07,ry*1.04,cy),(z0+.018,rx*1.07,ry*1.04,cy),(z0+.024,rx,ry,cy),(z0+.064,rx*.96,ry*.94,cy+.005),(z0+.09,rx*.83,ry*.60,cy+.025)]
  if shaft:profiles.extend([(z0+.13,rx*.83,.055,heelcy),(z1-.015,rx*.92,.06,heelcy),(z1,rx*.98,.064,heelcy)])
  for z,w,d,yc in profiles:
   for k in range(n):
    a=2*math.pi*k/n;c=math.cos(a);s=math.sin(a);verts.append([cx+w*math.copysign(abs(c)**.72,c),yc+d*math.copysign(abs(s)**.72,s),z])
  for j in range(len(profiles)-1):
   for k in range(n):a=start+j*n+k;b=start+j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
  faces.append(tuple(start+k for k in reversed(range(n))))
 ob=detail('Constructed sole toe box and shaft',verts,faces,old,'cloth_shoes',.004)
 kd=KDTree(len(pts))
 for i,p in enumerate(pts):kd.insert(p,i)
 kd.balance();weights(ob,old,kd);return ob
def construct(row):
 rid=row['id']; slot=row['slot']; kind=row['kind']; source=prefix[slot]+'_'+kind
 if rid in ['platevest','chitinplate','abysshauberk']:source='Top_plate'
 if source=='Top_plate' and source not in sources:source='Top_tank'
 if source not in sources: return None
 original=sources[source]
 if slot=='topw':base=clean_top(row,original)
 elif slot=='shoes':base=clean_shoes(row,original)
 else:
  base=original.copy(); base.data=original.data.copy(); bpy.context.collection.objects.link(base)
 base.name='Ward_'+rid
 pts=[base.matrix_world@v.co for v in base.data.vertices]; lo=Vector(tuple(min(p[i] for p in pts) for i in range(3))); hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)))
 height=hi.z-lo.z; center=(hi+lo)/2; mat={'topw':'cloth_top','botw':'cloth_bottom','shoes':'cloth_shoes','hat':'cloth_hat','neck':'cloth_neck','eyew':'metal'}[slot]
 # The silhouette changes are design-specific; colour variants keep their cut.
 specs={
 'tee':(1.02,1.01,0),'tank':(.98,1,0),'longsleeve':(1.01,1,0),'pajamas':(1.07,1.06,-.015),'sweater':(1.08,1.08,-.015),'hoodie':(1.12,1.12,-.025),
 'jacket':(1.10,1.15,-.025),'megjacket':(1.14,1.18,-.05),'officeshirt':(.99,1.02,.025),'padjacket':(1.18,1.22,-.04),'wirehood':(1.08,1.10,-.015),
 'bellhop':(1.01,1.09,.025),'tailcoat':(1.03,1.11,-.23),'hotelrobe':(1.16,1.20,-.30),'pgcoat':(1.16,1.16,-.28),'seawatchsuit':(1.19,1.24,-.12),'oilskin':(1.21,1.24,-.10),
 'dress':(1.01,1.03,0),'gown':(1.24,1.10,-.30),'maidapron':(1.12,1.05,-.035),'platevest':(1.06,1.15,.06),'chitinplate':(1.12,1.20,.03),'abysshauberk':(1.15,1.22,-.15),
 'pants':(1.03,1.04,0),'slacks':(.96,1.01,.015),'cargo':(1.16,1.10,-.005),'pinstripe':(.97,1.02,.005),'pjpants':(1.13,1.09,-.01),'shorts':(1.07,1.05,.02),
 'skirt':(1.06,1.05,.01),'longskirt':(1.11,1.08,-.015),'canvasskirt':(1.15,1.10,.055),'velvetskirt':(1.30,1.16,-.025),'tarwaders':(1.14,1.18,-.035),
 'boots':(1.07,1.06,0),'steeltoe':(1.17,1.10,.04),'ballastboots':(1.25,1.19,.055),'pitchboots':(1.11,1.13,.025),'hotelslip':(1.10,1.15,0),
 'opera':(1.04,1.04,.04),'padbeanie':(1.10,1.10,.015),'souwester':(1.14,1.21,-.02),'divehelm':(1.13,1.16,.02),'chitinhelm':(1.10,1.12,.015),
 'carpetponcho':(1.22,1.15,.15),'silkcloak':(1.08,1.09,-.12),'lifemantle':(1.20,1.18,.36),'balltie':(1.25,1.15,.005),
 'pphoodie':(1.10,1.14,-.035),'pghoodie':(1.16,1.16,-.055),'gmhoodie':(1.09,1.12,-.02)}
 sx,sy,hem=specs.get(rid,(1,1,0)); mw=base.matrix_world; inv=mw.inverted()
 def change(p):
  p=mw@p; q=p.copy()
  if slot=='topw':
   torso=1-sm(.16,.27,abs(p.x)); lower=1-sm(lo.z+.08,hi.z-.12,p.z)
   q.x*=1+(sx-1)*(.55+.45*torso); q.y=center.y+(p.y-center.y)*sy; q.z+=hem*lower*torso
   if rid=='tailcoat': q.z+=(-.16 if p.y>center.y else .11)*lower*torso
   if rid in ['gown','dress']:q.x*=1+.2*lower
  elif slot=='botw':
   legcenter=.075*(1 if p.x>=0 else -1); lower=1-sm(lo.z+.08,hi.z-.06,p.z)
   q.x=legcenter+(p.x-legcenter)*(1+(sx-1)*lower); q.y=center.y+(p.y-center.y)*(1+(sy-1)*lower); q.z+=hem*lower
  elif slot=='shoes':
   cx=.08*(1 if p.x>=0 else -1); q.x=cx+(p.x-cx)*sx; q.y=center.y+(p.y-center.y)*sy; q.z+=hem*sm(lo.z,hi.z,p.z)
  else:q.x*=sx; q.y=center.y+(p.y-center.y)*sy; q.z+=hem*sm(lo.z,hi.z,p.z)
  return inv@q
 if base.data.shape_keys:
  snapshots={key.name:[v.co.copy() for v in key.data] for key in base.data.shape_keys.key_blocks}
  for v,co in zip(base.data.vertices,snapshots['Basis']):v.co=change(co)
  for key in base.data.shape_keys.key_blocks:
   for v,co in zip(key.data,snapshots[key.name]):v.co=change(co)
 else:
  for v in base.data.vertices:v.co=change(v.co)
 base.data.update(); parts=[base]
 if rid in ['jacket','megjacket','padjacket','tailcoat','pgcoat','seawatchsuit','hotelrobe']:
  # Cut an actual opening through the front shell; lapels are not decals.
  cut=bmesh.new(); cut.from_mesh(base.data); cut.transform(mw)
  for x in [-.009,.009]: bmesh.ops.bisect_plane(cut,geom=list(cut.verts)+list(cut.edges)+list(cut.faces),dist=.00001,plane_co=(x,0,0),plane_no=(1,0,0))
  front0=min(p.y for p in pts); bottom0=min(p.z for p in pts)
  remove=[f for f in cut.faces if abs(f.calc_center_median().x)<.0089 and f.calc_center_median().y<front0+.07 and f.calc_center_median().z>bottom0+.015]
  bmesh.ops.delete(cut,geom=remove,context='FACES'); cut.transform(inv); cut.to_mesh(base.data); cut.free(); base.data.update()
 pts=[mw@v.co for v in base.data.vertices]; kd=KDTree(len(pts))
 for i,p in enumerate(pts):kd.insert(p,i)
 kd.balance(); bm=bmesh.new(); bm.from_mesh(base.data); bm.transform(mw); bvh=BVHTree.FromBMesh(bm)
 zmin=min(p.z for p in pts); zmax=max(p.z for p in pts); front=min(p.y for p in pts); torsox=min(.14,max(abs(p.x) for p in pts)*.75)
 def surface(x,z,offset=.005):
  hit,normal,fi,dist=bvh.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
  if hit is None or hit.y>center.y:hit=Vector((x,front,z)) if slot=='topw' else kd.find(Vector((x,front,z)))[0]
  return [hit.x,hit.y-offset,hit.z]
 def panel(name,x0,x1,z0,z1,offset=.007,material_name=None):
  verts=[surface(x,z,offset) for z in [z0,z1] for x in [x0,x1]]
  ob=detail(name,verts,[(0,1,3,2)],base,material_name or mat); weights(ob,base,kd); parts.append(ob)
 def polygon(name,xz,offset=.008,material_name=None):
  ob=detail(name,[surface(x,z,offset) for x,z in xz],[tuple(range(len(xz)))],base,material_name or mat); weights(ob,base,kd); parts.append(ob)
 def trim(name,coords,radius=.003,material_name=None):
  curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.bevel_depth=radius; curve.bevel_resolution=2; poly=curve.splines.new('POLY'); poly.points.add(len(coords)-1)
  for p,v in zip(poly.points,coords):p.co=(*v,1)
  ob=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(ob); ob.data.materials.append(material(material_name or mat)); bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active=ob; bpy.ops.object.convert(target='MESH'); ob=bpy.context.object; weights(ob,base,kd); parts.append(ob)
 def pocket(x,z,w=.062,h=.065,flap=True):
  panel('Pocket bag',x-w/2,x+w/2,z-h/2,z+h/2,.010)
  trim('Stitched pocket opening',[surface(x-w/2,z+h/2,.014),surface(x+w/2,z+h/2,.014)],.002)
  if flap:polygon('Pocket flap',[(x-w*.55,z+h*.5),(x+w*.55,z+h*.5),(x+w*.45,z+h*.22),(x,z+h*.12),(x-w*.45,z+h*.22)],.015)
 def buttons(z0,z1,n=4,x=0):
  for i in range(n):
   z=z0+(z1-z0)*i/max(1,n-1); c=surface(x,z,.015); verts=[]
   for k in range(12):a=k*2*math.pi/12; verts.append([c[0]+.004*math.cos(a),c[1],c[2]+.004*math.sin(a)])
   ob=detail('Button',verts,[tuple(range(12))],base,'button',.002); weights(ob,base,kd); parts.append(ob)
 if slot=='topw':
  chest=zmax-.16; waist=max(zmin+.08,zmax-.43)
  if rid in ['jacket','megjacket','padjacket','bellhop','tailcoat','pgcoat','seawatchsuit','officeshirt','pajamas','hotelrobe']:
   for s in [-1,1]:polygon('Folded collar and lapel',[(s*.015,zmax-.015),(s*.07,zmax-.035),(s*.09,zmax-.13),(s*.025,zmax-.22)],.011)
   buttons(waist,chest,6 if rid in ['bellhop','tailcoat'] else 4,x=.020 if rid in ['jacket','megjacket','padjacket','tailcoat','pgcoat','seawatchsuit','hotelrobe'] else 0)
  if rid in ['jacket','megjacket','padjacket','seawatchsuit','officeshirt','pajamas']:
   pocket(-.075,chest,.06,.066,rid!='pajamas')
   if rid!='officeshirt':pocket(.075,chest,.06,.066)
  if kind=='hoodie':
   polygon('Kangaroo pocket',[(-.105,waist+.025),(-.075,waist+.12),(.075,waist+.12),(.105,waist+.025)],.013)
   for s in [-1,1]:trim('Hood drawcord',[surface(s*.025,zmax-.06,.020),surface(s*.03,zmax-.18,.026)],.0025,'strap')
   # A down hood has a hollow opening and a thick rolled edge behind the neck.
   verts=[]; faces=[]; hz=zmax+.03
   for j in range(10):
    v=j/9
    for k in range(25):
     a=math.pi*k/24; verts.append([.105*math.cos(a)*(1-.3*v),center.y+.04+.11*math.sin(a),hz-.15*v])
   for j in range(9):
    for k in range(24):a=j*25+k;faces.append((a,a+1,a+26,a+25))
   ob=detail('Hollow down hood',verts,faces,base,mat,.006); weights(ob,base,kd); parts.append(ob)
  if rid in ['platevest','chitinplate','abysshauberk']:
   for i in range(3 if rid!='abysshauberk' else 6):
    z=waist+.12+i*(.07 if rid!='abysshauberk' else .04); polygon('Overlapping armor lame',[(-.12,z+.04),(.12,z+.04),(.10,z-.012),(0,z-.025),(-.10,z-.012)],.025+i*.001)
   for s in [-1,1]:panel('Armor shoulder strap',s*.09-.012,s*.09+.012,chest,zmax-.03,.023,'strap')
  if rid in ['apron','maidapron','hotelrobe','gown','dress']:panel('Waist sash',-.13,.13,waist+.08,waist+.105,.013)
  if rid in ['apron','maidapron']:pocket(0,waist+.09,.14,.08,False)
  if rid in ['sweater','hoodie','wirehood','pphoodie','pghoodie','gmhoodie']:
   trim('Ribbed hem',[surface(x,waist-.045,.008) for x in [-.13,-.09,-.04,0,.04,.09,.13]],.006)
  if rid=='wirehood':
   for x in [-.10,-.06,-.02,.02,.06,.10]:trim('Protective wire strand',[surface(x,z,.017) for z in [waist+.03,waist+.10,waist+.17,chest]],.0018,'metal')
   for i in range(5):trim('Protective wire cross strand',[surface(x,waist+.04+i*.045,.017) for x in [-.10,-.05,0,.05,.10]],.0018,'metal')
  if rid=='padjacket':
   for s in [-1,1]:panel('Quilted shoulder reinforcement',s*.12-.035,s*.12+.035,chest-.035,chest+.075,.022)
  if rid=='megjacket':
   for z in [chest-.07,waist+.10]:panel('Raised reflective safety tape',-.14,.14,z-.009,z+.009,.014,'button')
 elif slot=='botw':
  panel('Waistband',-.13,.13,zmax-.034,zmax-.008,.009)
  if rid in ['pants','cargo','overalls','tarwaders','slacks','pinstripe','shorts']:
   for s in [-1,1]:pocket(s*.08,zmax-.10,.055,.075,rid in ['cargo','overalls','tarwaders'])
  if rid=='cargo':
   for s in [-1,1]:
    z=zmin+(zmax-zmin)*.58;x=s*.172
    ob=detail('Outer-thigh cargo pouch',[(x,.015,z-.05),(x,.14,z-.05),(x,.14,z+.05),(x,.015,z+.05)],[(0,1,2,3)],base,mat,.018);weights(ob,base,kd);parts.append(ob)
  if rid in ['slacks','pinstripe']:
   for s in [-1,1]:trim('Pressed trouser crease',[surface(s*.08,z,.003) for z in [zmin+.025,zmax-.18]],.0015)
  if rid in ['pants','cargo','slacks','pinstripe','shorts']:
   for x in [-.105,-.045,.045,.105]:panel('Belt loop',x-.004,x+.004,zmax-.045,zmax-.004,.013)
 elif slot=='shoes':
  for s in [-1,1]:
   if rid not in ['slippers','hotelslip']:
    for i in range(4):
     z=zmin+(zmax-zmin)*(.38+i*.11); trim('Lace crossover',[surface(s*.08-.020,z,.009),surface(s*.08+.020,z+.009,.009)],.002,'strap')
   if rid in ['steeltoe','ballastboots','pitchboots']:pocket(s*.08,zmin+.045,.09,.035,False)
 elif slot=='hat':
  if rid in ['cap','divehelm','chitinhelm','souwester']:
   trim('Reinforced brow brim',[surface(x,zmin+.035,.012) for x in [-.11,-.06,0,.06,.11]],.006,'metal' if rid=='divehelm' else mat)
  if rid=='padbeanie':
   for s in [-1,1]:panel('Padded temple panel',s*.10-.025,s*.10+.025,zmin+.02,zmin+.12,.015)
  if rid=='divehelm':buttons(zmin+.05,zmax-.06,5)
  if rid in ['beanie','tophat','opera','crown','partyhat']:
   verts=[];faces=[];n=48;cx=(lo.x+hi.x)/2;cyh=(lo.y+hi.y)/2;rx=(hi.x-lo.x)*.49;ryh=(hi.y-lo.y)*.49;z=zmin+.025
   for zz in [z-.007,z+.007]:
    for k in range(n):a=2*math.pi*k/n;verts.append([cx+rx*math.cos(a),cyh+ryh*math.sin(a),zz])
   for k in range(n):faces.append((k,(k+1)%n,(k+1)%n+n,k+n))
   ob=detail('Folded cuff or hatband',verts,faces,base,mat,.004);weights(ob,base,kd);parts.append(ob)
  if rid in ['bow','flower']:
   panel('Ribbon knot wrap' if rid=='bow' else 'Metal hair clip',center.x-.007,center.x+.007,center.z-.016,center.z+.016,.007,'metal' if rid=='flower' else mat)
  if rid=='headphones':
   for s in [-1,1]:
    x=s*(hi.x-lo.x)*.42;z=center.z-.06
    ob=detail('Padded ear cushion',[(x,center.y-.035,z-.025),(x,center.y+.035,z-.025),(x,center.y+.035,z+.025),(x,center.y-.035,z+.025)],[(0,1,2,3)],base,mat,.015);weights(ob,base,kd);parts.append(ob)
 elif slot=='eyew':
  for s in [-1,1]:panel('Silicone nose rest',s*.018-.004,s*.018+.004,center.z-.008,center.z+.005,.004,'metal')
  if rid=='shades':
   for s in [-1,1]:
    x=s*(hi.x-lo.x)*.46
    ob=detail('Protective side shield',[(x,center.y-.015,center.z-.02),(x,center.y+.04,center.z-.02),(x,center.y+.04,center.z+.02),(x,center.y-.015,center.z+.02)],[(0,1,2,3)],base,'lens',.002);weights(ob,base,kd);parts.append(ob)
 elif slot=='neck':
  if rid=='lifemantle':
   for x in [-.12,-.06,0,.06,.12]:panel('Cork float',x-.022,x+.022,zmin+.02,zmax-.03,.025)
  elif rid in ['cape','silkcloak','carpetponcho']:buttons(zmax-.13,zmax-.06,2)
  elif rid in ['bowtie','balltie']:panel('Knot wrap',-.009,.009,center.z-.013,center.z+.013,.009)
  elif rid=='bell':panel('Collar buckle',-.012,.012,zmax-.018,zmax-.004,.010,'metal')
  elif rid=='scarf':
   for x in [-.025,-.012,0,.012,.025]:
    a=surface(x,zmin+.018,.006);trim('Woven scarf fringe',[a,[a[0],a[1],a[2]-.020]],.0018)
 # Features carry the garment's actual rig and body-shape keys.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=base
 if len(parts)>1:bpy.ops.object.join()
 base.name='Ward_'+rid; base.data.name=base.name
 bpy.context.view_layer.objects.active=base; bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(island_margin=.02); bpy.ops.object.mode_set(mode='OBJECT')
 for p in base.data.polygons:p.use_smooth=True
 bm.free(); made.append(base)
 report.append({'id':rid,'name':base.name,'source':source,'triangles':sum(len(p.vertices)-2 for p in base.data.polygons),'vertices':len(base.data.vertices),'components':len(parts),'cut':[sx,sy,hem]})
 return base
for row in rows:
 ob=construct(row)
 if ob is None:report.append({'id':row['id'],'externalMask':row.get('mask'),'status':'external asset must be audited separately'})
bpy.ops.object.select_all(action='DESELECT'); R.select_set(True)
for o in made:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',use_selection=True,export_animations=False,export_morph=True,export_skins=True)
Path(dst+'.audit.json').write_text(json.dumps(report,indent=2)); bpy.ops.wm.save_as_mainfile(filepath=dst+'.blend')
print('CONSTRUCTED',len(made),'catalog-specific garments')
