// A deathmoth swarm: three Blender moths (art/deathmoth/build.py) wheeling round an invisible body the
// player's swing finds, plus a haze of small ones and dust. One manager (scripts/deathmoths.js) steps every
// swarm: it turns the root to wheel them, and plays each moth's clips (Flutter, Dive, Bite, Death).
export const MOTH_GLB = "/cdn/value.8e9386d8001e19b546d8d0a87e9f02782b9d85837e4b3673a847f18b1bfa463f.glb";
export const SWARM_FX = `fx
pop moths n=?mobile:10|18 local on=sphere(.6) life=1.4..2.8 v=sdir()*(.5..1.2) size=.03..0.05 tint=oklch(.34 .025 65)..oklch(.56 .03 78)
  acc=curl(1.2)*2.4+attract(7)+drag(1.1) sz=$size*flick(14,.5) asp=1.7*flick(18,.65) col=$tint a=(0>.1:1>.85:1>0) rot=spin(1.5) r=sprite(petal,alpha)
pop dust rate=4 local on=sphere(.6) life=1..1.8 v=sdir()*.15 size=.015..0.03 acc=grav()*.15+drag(1) col=<.55,.5,.42> a=0>.2:.5>0 r=sprite(mote,alpha)`;
// three moths on a 0.75 m ring, each turned along the ring so they chase one another as the root spins
const RING = [0, 120, 240].map((a, i) => ({
  id: `m${i}`, model: { id: MOTH_GLB, forward: "+z" }, castShadow: false,
  feetPosition: { x: Math.cos(a * Math.PI / 180) * 0.75, y: [-0.1, 0.25, 0.05][i], z: Math.sin(a * Math.PI / 180) * 0.75 },
  rotation: { yaw: -a, roll: [-14, 10, -6][i] },
  scale: [1, 0.85, 0.92][i],
}));
export const swarm = {
  tags: ["moths"],
  physics: { body: "kinematic", collider: "sphere" },
  primitive: { kind: "sphere", radius: 0.5 }, // the body the player's swing finds; drawn invisible
  material: { color: "#000000", transparent: true, opacity: 0 },
  castShadow: false,
  fx: { script: SWARM_FX },
  audio: { clip: "/cdn/moodboard-realistic-gritty/sfx-dry-moth-wings-fluttering-loop.mp3", gain: 0.2, loop: true, spatial: true, maxDistance: 14 },
  state: { kind: "moths" },
  children: RING,
};
