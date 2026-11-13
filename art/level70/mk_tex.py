import os, glob, random, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S="/workspace/l70c/tex/"; O="/tmp/l70tex/"; os.makedirs(O,exist_ok=True)
K=dict(wains="wainscot",brick="brick",cork="cork",ice="glacier",oak="dark-oak",snow="powder",galv="galvanized",canvas="canvas",rope="rope",gfloor="oil-stained",paper="yellowed",tin="pressed-tin",marble="marble",conc="poured-concrete",steel="rusted-painted",drum="oil-drum",logs="firewood",barn="barn-wood",cinder="cinder")
for k,s in K.items():
    f=[p for p in glob.glob(S+"*.png") if s in p][0]
    Image.open(f).convert("RGB").resize((1024,1024)).save(O+k+".jpg",quality=88)
R=random.Random(7); F="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
if not os.path.exists(F): F=[p for p in glob.glob("/usr/share/fonts/**/*.ttf",recursive=True) if "Bold" in p][0]
# banner
cv=Image.open(O+"canvas.jpg"); W,H=2048,288; im=Image.new("RGB",(W,H))
for x in range(0,W,512): im.paste(cv.resize((512,512)),(x,-60))
ink=Image.new("L",(W,H),0); x=150
for ch in "NOAHTOWN":
    fs=R.randint(170,205); f=ImageFont.truetype(F,fs); t=Image.new("L",(260,280),0); ImageDraw.Draw(t).text((30,20),ch,font=f,fill=255)
    t=t.rotate(R.uniform(-7,7),resample=Image.BICUBIC); ink.paste(t,(x,R.randint(-8,22)),t)
    d=ImageDraw.Draw(ink)
    for _ in range(R.randint(0,2)):
        dx=x+R.randint(60,170); d.line([(dx,190),(dx,190+R.randint(30,90))],fill=200,width=R.randint(4,8))
    x+=R.randint(205,228)
d=ImageDraw.Draw(ink)
for cx in (80,1975):
    for a in range(6):
        an=a*math.pi/3+.2; d.line([(cx,144),(cx+52*math.cos(an),144+52*math.sin(an))],fill=230,width=11)
ink=ink.filter(ImageFilter.GaussianBlur(1.6))
nz=Image.effect_noise((W//3,H//3),70).resize((W,H)).point(lambda v:255 if v>88 else 90)
ink=Image.composite(ink,Image.new("L",(W,H),0),nz.filter(ImageFilter.GaussianBlur(1)))
im=Image.composite(Image.new("RGB",(W,H),(128,26,22)),im,ink)
im.save(O+"banner.jpg",quality=90)
# pipe label
im=Image.new("RGB",(768,160),(214,170,40)); d=ImageDraw.Draw(im); f=ImageFont.truetype(F,78)
d.text((22,34),"ALMOND WATER",font=f,fill=(24,22,20)); d.polygon([(680,50),(680,110),(752,80)],fill=(24,22,20)); d.rectangle([4,4,763,155],outline=(24,22,20),width=6)
g=Image.effect_noise((768,160),40).convert("RGB"); im=Image.blend(im,g,.22); fr=Image.open(O+"galv.jpg").resize((768,160)); im=Image.blend(im,fr,.18); im.save(O+"label.jpg",quality=90)
# dial
im=Image.new("RGB",(256,256),(232,228,214)); d=ImageDraw.Draw(im); f=ImageFont.truetype(F,20)
for i in range(31):
    a=math.radians(225-i*9); r0=92 if i%5 else 80
    d.line([(128+r0*math.cos(a),128-r0*math.sin(a)),(128+108*math.cos(a),128-108*math.sin(a))],fill=(20,20,20),width=3 if i%5==0 else 1)
d.arc([24,24,232,232],start=-45-0,end=-45+54,fill=(190,30,24),width=9)
d.text((104,168),"kPa",font=f,fill=(30,30,30)); a=math.radians(228); d.line([(128,128),(128+86*math.cos(a),128-86*math.sin(a))],fill=(170,20,16),width=5); d.ellipse([116,116,140,140],fill=(30,30,30))
im=Image.blend(im,Image.effect_noise((256,256),30).convert("RGB"),.12); im.save(O+"dial.jpg",quality=90)
print("tex ok",len(os.listdir(O)))
