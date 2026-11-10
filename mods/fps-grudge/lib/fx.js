// ASHLINE effect programs: emitted inline (ctx.emit('fx', { script: FX.x, params })).
export const tracer = `fx
pop t burst=1 life=%life|0.06 v=%vel|<0,0,-400> size=.018 col=hdr(5,3.2,1.2) a=1>.6 sz=$size r=sprite(ember,add,velocity,.0025)`;
// a round in flight: hot core + dim halo on the same arc (acc = %g), life = the flight time; the smoke variant sheds a faint wisp line
export const tracerHot = `fx
pop core burst=1 life=%life|0.06 v=%vel|<0,0,-800> acc=%g|<0,-9.81,0> size=.022 col=hdr(7,4.2,1.6) a=1 sz=$size r=sprite(ember,add,velocity,.003)
pop halo burst=1 life=%life|0.06 v=%vel|<0,0,-800> acc=%g|<0,-9.81,0> size=.09 col=hdr(1.2,.6,.22) a=.4 sz=$size r=sprite(soft-disc,add,velocity,.004)`;
export const tracerSmoke = tracerHot + `
pop wisp on=@core.lives(260) inh=v:$v*.004 life=.35..0.45 size=.05..0.08 col=<.8,.77,.72> a=.13>0 sz=$size*(1>2.4) r=sprite(smoke-puff,alpha,velocity,1)`;
export const muzzle = `fx
pop flash burst=6 life=.035..0.05 v=%dir|<0,0,-1>*(1..4)+sdir()*.4 size=.04..0.1 col=hdr(6,3.5,1.2) a=1>0 sz=$size*(1>1.6) rot=spin(3) r=sprite(flame-wisp,add)
pop smoke burst=2 life=.4..0.7 v=%dir|<0,0,-1>*(.5..1)+up(.3) size=.06..0.1 acc=buoy(.4)+drag(2) col=<.6,.56,.5> a=0>.18:.2>0 sz=$size*(1>3) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.05 r=light(<1,.7,.35>,8,6)`;
export const impact = `fx
pop sparks burst=4..8 life=.12..0.3 v=%normal|<0,1,0>*(2..5)+sdir()*(1.5..3) size=.012..0.022 acc=grav()*.8 col=hdr(5,2.8,.8) a=1>0 sz=$size r=sprite(ember,add,velocity,.02)
pop chunks burst=5..9 life=.7..1.4 v=%normal|<0,1,0>*(2..4.5)+sdir()*(1..2)+up(.5..1.5) size=.012..0.035 spin=-14..14 tint=<.5,.47,.42>..<.7,.66,.6> acc=grav() col=$tint a=1 sz=$size rot=$age*$spin floor=bounce(.25) r=mesh(box,1,.6,.8)
pop grit burst=10..16 life=.3..0.6 v=%normal|<0,1,0>*(3..6)+sdir()*(1.5..3) size=.006..0.012 acc=grav()+drag(.8) col=<.62,.58,.52> a=1>0 sz=$size r=sprite(grain,alpha,velocity,.015)
pop dust burst=3..4 life=.9..1.6 v=%normal|<0,1,0>*(.5..1.2)+sdir()*.35 size=.12..0.2 acc=buoy(.15)+drag(1.6)+curl(.3)*.2 col=<.64,.58,.5> a=0>.45:.25>.6:.12>0 sz=$size*(.6>3) rot=spin(.25) r=sprite(smoke-puff,alpha)
pop fall on=@chunks?.5 life=.6..1 v=up(.1..0.3) size=.06..0.1 acc=buoy(.1)+drag(2) col=<.6,.55,.48> a=0>.25:.3>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
export const blood = `fx
pop spray burst=14..22 life=.3..0.6 v=%normal|<0,0,1>*(1.8..4)+sdir()*(.6..1.4) size=.012..0.03 acc=grav() col=<.42,.02,.02> a=1 sz=$size floor=stick r=mesh(sphere)
pop exit burst=16..26 life=.35..0.7 v=%dir|<0,0,-1>*(3..6.5)+sdir()*(.8..1.8) size=.01..0.028 acc=grav()+drag(.4) col=<.38,.01,.01> a=1 sz=$size floor=stick collide=stick r=mesh(sphere)
pop mist burst=3..4 life=.35..0.6 v=%dir|<0,0,-1>*(.8..1.6)+sdir()*.3 size=.14..0.24 acc=drag(3) col=<.5,.04,.03> a=.6>0 sz=$size*(1>2.4) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop puff burst=1..2 life=.25..0.4 v=%normal|<0,0,1>*(.5..1) size=.1..0.16 acc=drag(3) col=<.55,.05,.04> a=.5>0 sz=$size*(1>2) r=sprite(smoke-puff,alpha)`;
export const dust = `fx
pop dust burst=10..14 life=.5..0.9 on=disc(.4) v=up(.4..0.9)+sdir()*1.2 size=.2..0.35 acc=buoy(.3)+drag(1.6) col=<.62,.55,.45> a=0>.4:.3>.7:.1>0 sz=$size*(.6>2) rot=spin(.3) r=sprite(smoke-puff,alpha)`;
// frag grenade: flash + fireball, a debris volley off the blast, dust ring, smoke column off dying flame, one flash light
export const explosion = `fx
pop flash burst=1 life=.12 size=3.6 col=hdr(9,6.5,3) a=1>0 sz=$size*(.6>1.5) r=sprite(soft-disc,add)
pop fire burst=26..36 on=sphere(.5) life=.25..0.6 v=sdir()*(3..8)+up(1.8) size=.5..1.1 acc=drag(4)+buoy(3) col=hdr(6,3.8,1.4)>.35:hdr(3.4,1.3,.3)>hdr(.8,.2,.05) a=1>.6:.9>0 sz=$size*(.6>1.7) rot=spin(.4) r=sprite(flame-wisp,add)
pop sparks burst=36..52 life=.3..0.9 v=sdir()*(9..20)+up(3) size=.015..0.03 acc=grav()*.7+drag(.6) col=hdr(6,3,.8)>hdr(2,.6,.1) a=1>0 sz=$size floor=bounce(.3) r=sprite(ember,add,velocity,.02)
pop chunks burst=18..28 life=1.4..2.6 v=sdir()*(3..8)+up(5..10) size=.04..0.14 spin=-9..9 tint=<.42,.39,.34>..<.66,.62,.56> acc=grav() col=$tint a=1 sz=$size rot=$age*$spin floor=bounce(.22) r=mesh(box,1,.55,.8)
pop shards burst=12..18 life=1..2 v=sdir()*(6..12)+up(3..6) size=.03..0.07 spin=-14..14 col=<.2,.17,.14> a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=mesh(box,1,.2,.5)
pop trail on=@chunks.lives(14) inh=v:$v*.05 life=.5..0.9 size=.1..0.18 acc=buoy(.3)+drag(1.5) col=<.3,.27,.24> a=.35>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)
pop ring burst=16..22 on=disc(.6) life=1.2..2 v=radial(5..8)+up(.2..0.5) size=.6..1 acc=drag(2.2)+buoy(.15) col=<.6,.53,.43> a=0>.5:.3>.6:.25>0 sz=$size*(.6>3) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop smoke on=@fire?.55 inh=p;v:$v*.2 life=3..5 size=.7..1.1 acc=buoy(1.2)+curl(.4)*.6+drag(1) col=<.16,.14,.13>><.32,.3,.28> a=0>.6:.2>.65:.35>0 sz=$size*(.8>3.6) rot=spin(.12) r=sprite(smoke-puff,alpha)
pop haze burst=3 life=.35..0.5 size=1.6..2.2 col=<.006,.006,0> a=1>0 sz=$size*(.6>1.8) r=sprite(soft-disc,distort)
pop chunkdust on=@chunks?.7 life=.8..1.5 v=up(.3..0.6) size=.2..0.38 acc=buoy(.2)+drag(1.5) col=<.62,.57,.5> a=0>.4:.3>.6:.15>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)
pop embers burst=10..16 life=1.5..3 v=sdir()*(1.5..4)+up(2..4) size=.02..0.04 acc=grav()*.25+curl(.6)+drag(.8) col=hdr(5,2.2,.5)>hdr(1.4,.3,.05) a=(1>.6:.9>0)*flick(9,.4) r=sprite(ember,add)
pop glow burst=1 life=.4 at=point().c(.8) g=1>.3:.5>0 r=light(<1,.6,.28>,$g*80,18)`;

export const impactDirt = `fx
pop clods burst=6..10 life=.5..1 v=%normal|<0,1,0>*(2..4.5)+sdir()*1.3+up(.5) size=.015..0.04 spin=-10..10 tint=<.3,.24,.17>..<.46,.38,.27> acc=grav() col=$tint a=1 sz=$size rot=$age*$spin floor=stick r=mesh(sphere,1,.7,1)
pop spurt burst=4..6 life=.6..1.2 v=%normal|<0,1,0>*(1.2..2.6)+up(.8) size=.12..0.24 acc=buoy(.1)+drag(2)+curl(.3)*.2 col=<.56,.48,.36> a=0>.5:.2>.7:.12>0 sz=$size*(.5>2.8) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop grit burst=8..12 life=.3..0.6 v=%normal|<0,1,0>*(2.5..5)+sdir()*1.5 size=.006..0.012 acc=grav() col=<.42,.35,.26> a=1 sz=$size floor=stick r=sprite(grain,alpha,velocity,.015)`;
export const impactMetal = `fx
pop sparks burst=12..20 life=.12..0.35 v=%normal|<0,1,0>*(3..8)+sdir()*(2..4.5) size=.008..0.02 acc=grav()*.9 col=hdr(7,3.8,1.1)>hdr(2.4,.7,.12) a=1>0 sz=$size floor=bounce(.45) r=sprite(ember,add,velocity,.025)
pop flash burst=1 life=.05 size=.22 col=hdr(5,3,1.2) a=1>0 r=sprite(soft-disc,add)
pop flakes burst=2..4 life=.5..0.9 v=%normal|<0,1,0>*(1.5..3)+sdir()*1.2 size=.01..0.02 spin=-20..20 col=<.42,.25,.14> a=1 sz=$size rot=$age*$spin floor=bounce(.3) r=mesh(card,1,1,.1)
pop puff burst=1..2 life=.5..0.8 v=%normal|<0,1,0>*.5 size=.06..0.1 acc=drag(2) col=<.5,.48,.45> a=.3>0 sz=$size*(1>2.6) r=sprite(smoke-puff,alpha)
pop glow burst=1 life=.06 r=light(<1,.65,.3>,4,3)`;
