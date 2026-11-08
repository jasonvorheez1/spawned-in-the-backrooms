// Spec builders for the moving things (scripts/ambient-anim.js) and their particle effects, shared by the levels' sims.
const A = "scripts/ambient-anim.js";

// a ceiling exhaust fan: a dark housing and a cross of blades that turns
export const fan = (p, sec = 0.9, phase = 0) => ({
  feetPosition: { x: p.x, y: p.y, z: p.z }, behavior: A, state: { anim: { kind: "spin", sec, phase } },
  primitive: { kind: "box", width: 0.8, height: 0.014, depth: 0.075 }, material: { color: "oklch(0.2 0.01 250)", metalness: 0.6, roughness: 0.4 },
  children: [
    { feetPosition: { x: 0, y: 0, z: 0 }, primitive: { kind: "box", width: 0.075, height: 0.014, depth: 0.8 }, material: { color: "oklch(0.2 0.01 250)", metalness: 0.6, roughness: 0.4 } },
    { feetPosition: { x: 0, y: 0.01, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.07, radiusBottom: 0.07, height: 0.05 }, material: { color: "oklch(0.35 0.01 250)", metalness: 0.7, roughness: 0.35 } },
  ],
});
export const fanHousing = (p) => ({ feetPosition: { x: p.x, y: p.y + 0.03, z: p.z }, primitive: { kind: "box", width: 1.0, height: 0.06, depth: 1.0 }, material: { color: "oklch(0.55 0.01 90)", roughness: 0.7 } });

// a cable or a bit of conduit that came loose and hangs: swings a few degrees about where it is fixed
export const cable = (p, seed = 0, len = 0.9) => ({
  feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: (seed * 97) % 360 }, behavior: A, state: { anim: { kind: "sway", deg: 5 + (seed % 4), sec: 2.2 + (seed % 7) * 0.3, axis: seed % 2 ? "roll" : "pitch", phase: (seed % 10) / 10 } },
  primitive: { kind: "sphere", radius: 0.02 }, material: { color: "oklch(0.12 0.005 250)", roughness: 0.8 },
  children: [
    { feetPosition: { x: 0, y: -len / 2, z: 0 }, primitive: { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: len }, material: { color: "oklch(0.14 0.005 250)", roughness: 0.8 } },
    { feetPosition: { x: 0, y: -len, z: 0 }, primitive: { kind: "box", width: 0.05, height: 0.07, depth: 0.03 }, material: { color: "oklch(0.8 0.1 95)", roughness: 0.6 } },
  ],
});

// the particle effects (the engine's fx script text; see places/level2/sim.js for the dialect)
// a drip from a leaking pipe: one bead falls from the emitter every second or two and dies on the floor, throwing a small ring of spray
export const DRIP = `fx
pop bead rate=0.6 on=point() life=2 v=<0,0,0> size=.02..0.03 acc=grav()*.5 col=oklch(.78 .02 220) a=.9 sz=$size floor=die r=sprite(soft-disc,alpha)
pop shine rate=0.6 on=point() life=.12 v=<0,0,0> size=.03 col=<.9,.95,1> a=.5>0 sz=$size r=sprite(soft-disc,add)`;
// warm, stale, humid air in a lit room: a few motes drifting in the light
export const DUST = `fx
pop mote rate=5 on=box(2.2,1.4,2.2) life=5..9 v=sdir()*.05 size=.012..0.024 acc=curl(.4)*.06 col=<.95,.9,.78> a=0>.35:.25>.35:.75>0 r=sprite(mote,alpha)`;
// a slow fog of damp breath rolling along the rock of The Edges
export const MIST = `fx
pop breath rate=2.5 on=box(3,.4,3) life=6..10 v=sdir()*.08 size=.8..1.4 acc=curl(.2)*.05 col=<.5,.56,.55> a=0>.08:.3>.08:.7>0 sz=$size*(.7>1.6) r=sprite(smoke-puff,alpha)`;
// spores lifting off a glowing fungus
export const SPORES = `fx
pop spore rate=2.2 on=sphere(.18) life=3..5.5 v=up(.12)+sdir()*.05 size=.012..0.022 acc=curl(.5)*.05 col=hdr(.35,2,1.8) a=0>.9:.3>.9:.75>0 sz=$size r=sprite(soft-disc,add)`;
// a pool of tar: slow black bubbles rise, swell, and burst into a spit of tar
export const BUBBLES = `fx
pop bubble rate=2.2 on=disc(2.6) life=1.1..1.8 v=up(.16) size=.1..0.34 col=<.03,.03,.04> a=.9>.9:.8>0 sz=$size*(.2>1) r=sprite(soft-disc,alpha)
pop shine rate=2.2 on=disc(2.6) life=.2 v=up(.1) size=.12..0.2 col=<.5,.45,.6> a=.6>0 sz=$size r=sprite(soft-disc,add)`;
// a drip landing in a pool: rings that spread and fade
export const RIPPLE = `fx
pop ring rate=0.8 on=disc(.5) life=1.6 v=<0,0,0> size=.05 col=<.75,.8,.7> a=.5>0 sz=$size*(1>12) r=sprite(soft-disc,alpha)`;
