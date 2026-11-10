// ASHLINE molotov: the throw and the fire patch's spec. throwMolotov(ctx, pose) from the thrower's own body (ctx.self), the frag's arc;
// the flight lives in scripts/molotov.js, the burn in scripts/firepatch.js. Numbers: lib/data/combat.yml molotov.
import C from "./data/combat.yml";
export const MOLOTOV = C.molotov;
const SND = "/cdn/moodboard-realistic-gritty/";
export const BOTTLE = "/cdn/model-molotov-cocktail-bottle-brown-vgvuciq6.glb";
// the fire on the ground: a ring of flame over the patch, licking tongues, embers, smoke off dying flame, one light that IS the flame count
export const FIRE = `fx
pop bed n=?mobile:14|26 on=disc(%r|3) size=.25..0.5 tint=<2.6,1,.25>..<1.2,.35,.08> sz=$size*flick(.6,.15) col=$tint*flick(.9,.3) a=.75 r=sprite(soft-disc,add)
pop flame rate=?mobile:38|70 on=disc(%r|3) life=.45..0.85 v=up(1.6..2.6)+cone(18)*(.2..0.6) size=.35..0.7 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=?mobile:6|12 on=disc(%r|3) life=.8..1.6 v=up(2.4)+cone(35)*(.4..1.4) size=.02..0.05 acc=curl(.8)+grav()*.4+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.12 inh=p;v:$v*.4 life=2..3.4 size=.4..0.7 acc=buoy(1)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.4) col=<.22,.2,.18>><.12,.12,.13> a=0>.3:.35>.7:.2>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.3).c(.6) glo=fire()*(#flame/45)~ r=light(<1,.55,.24>,$glo*45,11)`;
export function patchSpec(pos, state) {
  return {
    tags: ["firepatch"], lifetime: MOLOTOV.burn + 1, state,
    feetPosition: { x: pos.x, y: pos.y, z: pos.z },
    behavior: "mods/fps-grudge/firepatch.js",
    fx: { script: FIRE, params: { r: MOLOTOV.radius } },
    audio: { clip: SND + "sfx-fire-burning-roar-crackle-loop.mp3", gain: 0.55, loop: true, spatial: true, maxDistance: 35 },
  };
}
export function bottleSpec(pos, state) {
  return {
    tags: ["molotov"], lifetime: 6, state,
    feetPosition: { x: pos.x, y: pos.y, z: pos.z },
    behavior: "mods/fps-grudge/molotov.js",
    model: BOTTLE, layout: { maxExtents: { x: 0.3, y: 0.3, z: 0.3 }, minExtents: { y: 0.24 } }, pivot: "center",
    fx: { script: `fx
pop rag rate=?mobile:12|24 at=point() life=.2..0.35 v=up(.6)+sdir()*.3 size=.05..0.09 sz=$size*(1>.3) col=hdr(4,2,.5)>hdr(1.5,.4,.1) a=1>0 r=sprite(flame-wisp,add)` },
    castShadow: true,
  };
}
export function throwMolotov(ctx, pose) {
  const o = pose.o, d = pose.d, a = MOLOTOV.ahead;
  const pos = { x: o.x + d.x * a, y: o.y + d.y * a, z: o.z + d.z * a };
  const vel = { x: d.x * MOLOTOV.speed, y: d.y * MOLOTOV.speed + MOLOTOV.lift, z: d.z * MOLOTOV.speed };
  const id = ctx.spawn(bottleSpec(pos, { vel, ownerId: ctx.self.id, team: ctx.self.state.team ?? "" }));
  ctx.emit("playSound", { clip: SND + "sfx-molotov-lighter-flick-throw.mp3", position: o, volume: 0.8 });
  return id;
}
