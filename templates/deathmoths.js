// A deathmoth swarm: a loose ball of grey-brown moths around an invisible body. One manager
// (scripts/deathmoths.js) steps every swarm; this row is only the look, the sound and the body.
export const SWARM_FX = `fx
pop moths n=?mobile:40|60 local on=sphere(.4) life=1.4..2.8 v=sdir()*(.5..1.2) size=.035..0.06 tint=oklch(.34 .025 65)..oklch(.56 .03 78)
  acc=curl(1.2)*2.4+attract(7)+drag(1.1) sz=$size*flick(14,.5) asp=1.7*flick(18,.65) col=$tint a=(0>.1:1>.85:1>0) rot=spin(1.5) r=sprite(petal,alpha)
pop dust rate=3 local on=sphere(.4) life=1..1.8 v=sdir()*.15 size=.015..0.03 acc=grav()*.15+drag(1) col=<.55,.5,.42> a=0>.2:.5>0 r=sprite(mote,alpha)`;
export const swarm = {
  tags: ["moths"],
  physics: { body: "kinematic", collider: "sphere" },
  primitive: { kind: "sphere", radius: 0.35 }, // the body the player's swing finds; drawn invisible
  material: { color: "#000000", transparent: true, opacity: 0 },
  castShadow: false,
  fx: { script: SWARM_FX },
  audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-dry-moth-wings-fluttering-loop.mp3", gain: 0.18, loop: true, spatial: true, maxDistance: 14 },
  state: { kind: "moths" },
};
