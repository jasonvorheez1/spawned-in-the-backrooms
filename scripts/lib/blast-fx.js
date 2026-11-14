// One blast for every grenade, rocket and launcher round (Shelly Nov 14: "the blasts ... are very pitiful and should be grandiose").
// %s scales it: 1 = a frag, 1.5 = a rocket. No white flash sprite and no strobing light: the fire unfolds, the light eases out
// over a second (her "this is seizure inducing" note stands).
export const BLAST = `fx
pop core burst=?mobile:18|34 life=.5..0.9 v=sdir()*(1.5..3.5)*%s|1+up(1.2) size=1.2..2.2 acc=drag(2.6)+buoy(1.4) sz=$size*%s|1*(.35>.25:1.6>2.4) col=hdr(4.2,2.4,.8)>.35:hdr(2.6,.9,.2)>.7:hdr(.6,.18,.05)>hdr(.1,.03,.01) a=0>.06:1>.6:.8>0 rot=spin(.4) r=sprite(flame-wisp,add)
pop tongues burst=?mobile:16|36 life=.4..0.8 v=sdir()*(6..12)*%s|1+up(1.5) size=.5..1 acc=drag(3.2)+buoy(1.2) sz=$size*%s|1*(.6>1.8) col=hdr(4,2,.6)>hdr(1.2,.35,.08) a=1>0 rot=spin(.5) r=sprite(flame-wisp,add)
pop shell burst=?mobile:14|26 life=2.5..4 v=sdir()*(3..6)*%s|1+up(1.5) size=1..1.8 acc=drag(2.2)+buoy(.7)+curl(.35) sz=$size*%s|1*(.6>3.4) col=<.09,.08,.07>><.24,.23,.22> a=0>.12:.85>.5:.6>0 rot=spin(.12) r=sprite(smoke-puff,alpha)
pop column burst=?mobile:10|20 on=disc(.6) life=5..8 v=up(2.5..4.5)*%s|1+sdir()*(.3..0.8) size=1.4..2.4 acc=drag(.7)+buoy(.5)+curl(.2) sz=$size*%s|1*(.5>4) col=<.12,.11,.1>><.32,.31,.3> a=0>.15:.7>.6:.5>0 rot=spin(.06) r=sprite(smoke-puff,alpha)
pop ring burst=?mobile:22|44 on=disc(1) life=1.2..2.2 v=sdir()*<1,0,1>*(8..14)*%s|1+up(.3) size=.6..1.1 acc=drag(2.2)+buoy(.15) sz=$size*%s|1*(.6>3) col=<.46,.42,.35> a=0>.6:.12>.6:.4>0 rot=spin(.1) r=sprite(smoke-puff,alpha)
pop sparks burst=?mobile:50|120 life=.6..1.6 v=sdir()*(10..24)*%s|1 size=.02..0.05 acc=grav()*.8+drag(.7) col=hdr(6,3.4,1)>hdr(1.6,.4,.1) a=1>0 floor=bounce(.35) r=sprite(ember,add,velocity,.035)
pop chunks burst=?mobile:14|30 life=1.6..2.8 v=sdir()*(5..12)*%s|1+up(4..8) size=.06..0.16 spin=-10..10 acc=grav()+drag(.25) col=<.2,.18,.15>..<.5,.46,.38> a=1 rot=$age*$spin floor=bounce(.25) r=mesh(box,1,.6,.8)
pop trails on=@chunks.lives(16) life=.6..1.1 size=.1..0.18 acc=buoy(.3)+drag(1.2) sz=$size*(.6>2.4) col=<.28,.26,.24> a=0>.45:.2>.6:.15>0 r=sprite(smoke-puff,alpha)
pop burn on=@chunks.lives(10) life=.25..0.45 size=.12..0.22 acc=buoy(.8) sz=$size*(1>.3) col=hdr(3,1.4,.3) a=1>0 r=sprite(flame-wisp,add)
pop fires burst=?mobile:4|8 on=disc(1.6) life=3..6 size=.35..0.7 sz=$size*%s|1*(.4>.1:1>.8:1>0) col=hdr(3,1.3,.3)*flick(5,.25) a=0>.1:.9>.8:.8>0 r=sprite(flame-wisp,add)
pop embers burst=?mobile:16|36 life=2..4 v=sdir()*(1..3.5)+up(2..4) size=.02..0.04 acc=curl(.8)+grav()*.12+drag(.7) col=hdr(5,2.4,.6)>hdr(1.2,.3,.05) a=(1>.7:1>0)*flick(6,.3) r=sprite(ember,add,velocity,.02)
pop grit burst=?mobile:20|50 on=disc(3).c(2.4) life=1.5..3 size=.02..0.05 spin=-6..6 acc=grav()*.6+drag(1.4) col=<.55,.52,.46> a=1>.8:1>0 rot=$age*$spin floor=die r=sprite(grain,alpha)
pop dust on=@grit?.3 life=.6..1 v=up(.3) size=.2..0.4 acc=buoy(.2)+drag(1.4) sz=$size*(.6>2) col=<.5,.47,.42> a=0>.3:.3>.7:.1>0 r=sprite(smoke-puff,alpha)
pop haze burst=?mobile:1|3 life=.5..0.8 v=sdir()*.5 size=4..6 sz=$size*%s|1*(.4>1.4) col=<.004,.004,0> a=.8>0 r=sprite(soft-disc,distort)
pop glow burst=1 life=1.2 r=light(<1,.55,.25>,70*%s|1*(1>.12:.7>.5:.25>0),20*%s|1)`;

// what a body near the blast feels: a shake that rolls out with distance, one punch away from the fireball, and close in a ringing ear
export function feelBlast(ctx, c, s = 1) {
  const reach = 18 * s;
  for (const pl of ctx.place.players) {
    const f = pl.feetPosition, dx = f.x - c.x, dz = f.z - c.z, dd = Math.hypot(dx, f.y - c.y, dz); if (dd >= reach) continue;
    const k = 1 - dd / reach, to = { audience: { player: pl.id } };
    ctx.emit("screenShake", { intensity: 1.6 * s * k, duration: 0.6 + 0.6 * k }, to);
    ctx.emit("cameraPunch", { direction: { x: dx / (dd || 1), y: 0.3, z: dz / (dd || 1) }, intensity: 0.9 * k }, to);
    if (dd < 7 * s) ctx.emit("playSound", { clip: "/cdn/moodboard-realistic-gritty/sfx-ear-ringing-tinnitus-high-whine-after-explosion-fading.mp3", volume: 0.45 * k, bus: "SFX" }, to);
  }
}
