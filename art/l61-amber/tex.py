# crate texture: weathered plank faces with a CAMP AMBER stencil, scuffs
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random, numpy as np
random.seed(7); S=1024
img=np.zeros((S,S,3),np.float32)
rng=np.random.default_rng(3)
planks=4; ph=S//planks
for i in range(planks):
    base=np.array([0.55,0.40,0.24])*(0.85+0.3*rng.random())
    y0=i*ph
    yy,xx=np.mgrid[0:ph,0:S]
    grain=0.5+0.5*np.sin(xx*0.02+np.sin(yy*0.08+i)*3+rng.random()*6)
    n=rng.random((ph,S))*0.12
    v=0.82+0.18*grain-n
    img[y0:y0+ph]=base[None,None,:]*v[...,None]
    img[y0:y0+4]*=0.35; img[y0+ph-4:y0+ph]*=0.45
im=Image.fromarray((np.clip(img,0,1)*255).astype(np.uint8))
d=ImageDraw.Draw(im)
f=ImageFont.truetype("DejaVuSans-Bold.ttf",130)
txt=Image.new("L",(S,S),0); dt=ImageDraw.Draw(txt)
dt.text((S/2,S*0.42),"CAMP",font=f,anchor="mm",fill=255); dt.text((S/2,S*0.6),"AMBER",font=f,anchor="mm",fill=255)
# stencil bridges
for x in range(0,S,60): dt.line([(x,S*0.36),(x,S*0.66)],fill=0,width=6) if random.random()<0.3 else None
noise=Image.fromarray((rng.random((S,S))*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
mask=Image.fromarray((np.array(txt)*(np.array(noise)>110)).astype(np.uint8))
im.paste((40,26,18),mask=mask)
for _ in range(60):  # scuffs
    x,y=random.randrange(S),random.randrange(S); l=random.randrange(20,120)
    d.line([(x,y),(x+l,y+random.randrange(-8,8))],fill=(170,140,100),width=random.randrange(1,4))
im=im.filter(ImageFilter.GaussianBlur(0.6))
im.save("/workspace/amber/crate.png")
