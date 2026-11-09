// Fort Surrender, pass 2 (Nov 9, Shelly: "massively improve level 7 of backrooms especially fort surrender").
// The fort read as black boxes: no textures on its slots, five dim lamps. This lays its fire and its sound:
// burning tar on the gate posts and the palisade post tops, a smoke column you see from the shore, textures on every slot,
// and the noise of the place (fire, tar, wind in the rags, the worshippers murmuring at the altar). Ids start l7f- so a rebuild can clear them.
const FC = { x: -70, y: 10.95, z: -93 }; // the fort model's feet; Blender (x, y) lands at world (FC.x + x, FC.z - y)
const G = (n) => `/cdn/moodboard-realistic-gritty/sfx-${n}.mp3`;
const T = (w) => `cdn/texture-${w}.png`;

// one texture per surface kind; the four furniture paints share one chipped-paint picture under four tints
export const FORT_MATS = {
  plank: { texture: T("weathered-grey-sea-soaked-wood-planks"), color: "oklch(0.62 0.03 70)", roughness: 0.9 },
  wood: { texture: T("dark-tarred-weathered-log-bark-wood"), color: "oklch(0.6 0.03 60)", roughness: 0.9 },
  tar: { texture: T("glossy-black-roofing-tar-pitch-with-drips"), color: "oklch(0.55 0.01 280)", roughness: 0.2, metalness: 0.1 },
  paint1: { texture: T("chipped-peeling-old-painted-furniture-wood"), color: "oklch(0.52 0.06 150)", roughness: 0.85 },
  paint2: { texture: T("chipped-peeling-old-painted-furniture-wood"), color: "oklch(0.55 0.06 70)", roughness: 0.85 },
  paint3: { texture: T("chipped-peeling-old-painted-furniture-wood"), color: "oklch(0.5 0.05 235)", roughness: 0.85 },
  paint4: { texture: T("chipped-peeling-old-painted-furniture-wood"), color: "oklch(0.45 0.1 30)", roughness: 0.85 },
  corr: { texture: T("rusted-corrugated-sheet-metal"), color: "oklch(0.7 0.03 60)", roughness: 0.75, metalness: 0.4 },
  rope: { texture: T("frayed-hemp-rope-fibers"), color: "oklch(0.7 0.04 75)", roughness: 0.95 },
  cloth: { texture: T("stained-grimy-canvas-rag-cloth"), color: "oklch(0.68 0.03 80)", roughness: 0.95 },
  bone: { texture: T("old-yellowed-bone-surface"), color: "oklch(0.9 0.02 90)", roughness: 0.8 },
  metal: { texture: T("dark-pitted-iron-metal"), color: "oklch(0.7 0.01 250)", roughness: 0.5, metalness: 0.8 },
};

// burning tar: a flame that flickers, embers, a little black smoke, and its own flickering light
export const TARFIRE = `fx
pop flame rate=flick(.45,.2)*%n|26 on=disc(%w|.08) life=.35..0.6 v=up(1.1)+cone(18)*(.2..0.5) size=%s|.14..%s2|.26 acc=curl(.5)+buoy(1.8)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.0,1.2)>.3:hdr(3.2,1.3,.3)>.65:hdr(1.6,.45,.1)>hdr(.5,.1,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=2 on=disc(.08) life=.6..1.3 v=up(1.7)+cone(30)*(.3..0.8) size=.015..0.035 acc=curl(.8)+grav()*.4+drag(.5) col=hdr(5,2.6,.7)>hdr(1,.2,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.18 inh=p;v:$v*.4 life=1.4..2.6 size=.14..0.24 acc=buoy(.8)+curl(.3)*.5+drag(.8) sz=$size*(.7>3) col=<.07,.065,.06> a=0>.35:.4>.7:.2>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.05).c(.25) glo=fire()*(#flame/14)~ r=light(<1,.5,.2>,$glo*%i|9,%d|13)`;

// the column of black smoke from the ritual brazier: the thing you see from the entrance rock before you see the fort
const COLUMN = `fx
pop col rate=?mobile:3|5 on=disc(.4) life=9..13 v=up(1.3..1.8)+sdir()*.15 size=.8..1.3 acc=buoy(.15)+curl(.25)*.4+wind()*.08+drag(.2) sz=$size*(1>4.5) col=<.06,.06,.065>><.12,.12,.13> a=0>.06:.32>.6:.18>0 rot=spin(.05) r=sprite(smoke-puff,alpha)`;

const W = (a, r) => ({ x: FC.x + Math.cos(a) * r, z: FC.z - Math.sin(a) * r }); // a point at Blender angle a, radius r

export function layFort2(ctx) {
  const sp = (id, spec) => ctx.spawn(`l7f-${id}`, spec);
  // the fort's own surfaces: textures on every slot (the model's UVs are box-projected, 2 m a tile)
  const f = ctx.place.objects["l7-fort"];
  if (f) { try { f.model = { id: f.model?.id ?? f.model, materials: FORT_MATS }; } catch (e) {} }

  // solid walls (Shelly: "the fort had no collision"): the model's own mesh collider holds nothing, so plain invisible blocks stand in it:
  // the palisade and the furniture stacked on it (radius 8.6 to 9.4 in the model), the gate posts, the watchtower's legs and deck
  for (let i = 0; i < 48; i++) {
    const a = ((i + 0.5) / 48) * Math.PI * 2, deg = (a * 180) / Math.PI;
    if (Math.abs(deg - 270) < 17) continue; // the gate gap faces the wharf
    const p = W(a, 8.95);
    sp(`col-wall-${i}`, { feetPosition: { x: p.x, y: FC.y - 0.3, z: p.z }, rotation: { yaw: -deg }, primitive: { kind: "box", width: 1.3, height: 3.6, depth: 1.3 }, physics: "static", visible: false });
  }
  [-2.6, 2.6].forEach((x, i) => sp(`col-gatepost-${i}`, { feetPosition: { x: FC.x + x, y: FC.y, z: FC.z + 8.6 }, primitive: { kind: "box", width: 0.45, height: 4.2, depth: 0.45 }, physics: "static", visible: false }));
  [[-1.2, 6.8], [1.2, 6.8], [-1.2, 9.2], [1.2, 9.2]].forEach(([x, y], i) => sp(`col-towerleg-${i}`, { feetPosition: { x: FC.x + x, y: FC.y, z: FC.z - y }, primitive: { kind: "box", width: 0.3, height: 6.0, depth: 0.3 }, physics: "static", visible: false }));
  sp("col-towerdeck", { feetPosition: { x: FC.x, y: FC.y + 5.95, z: FC.z - 8 }, primitive: { kind: "box", width: 3.1, height: 0.12, depth: 3.1 }, physics: "static", visible: false });

  // burning tar on both gate posts (Blender (±2.6, -8.6), cap at 3.9 m): the gate reads from the wharf
  [-2.6, 2.6].forEach((x, i) => sp(`gatefire-${i}`, { feetPosition: { x: FC.x + x, y: FC.y + 3.95, z: FC.z + 8.6 }, fx: { script: TARFIRE, params: { n: 38, w: 0.13, i: 26, d: 20 } } }));
  // and on six of the palisade's post tops (posts at radius 8.44, top 2.8 m), skipping the gate gap and the tower
  [0, 2, 4, 7, 9, 11, 13, 16, 19, 21].forEach((k, i) => {
    const a = ((k + 0.5) / 22) * Math.PI * 2, p = W(a, 8.44);
    sp(`postfire-${i}`, { feetPosition: { x: p.x, y: FC.y + 2.85, z: p.z }, fx: { script: TARFIRE, params: { n: 24, i: 18, d: 15 } } });
  });
  // the ritual brazier's smoke column and its fire's crackle
  sp("column", { feetPosition: { x: FC.x, y: FC.y + 1.6, z: FC.z - 0.5 }, fx: { script: COLUMN }, audio: { clip: G("crackling-tar-and-driftwood-bonfire-loop"), loop: true, gain: 0.32, spatial: true, refDistance: 3, maxDistance: 20 } });

  // the place's sound: tar bubbling in the pit, wind through the palisade and its rags, the worshippers murmuring at the altar, the tower's ropes
  sp("snd-tar", { feetPosition: { x: FC.x - 5.2, y: FC.y + 0.3, z: FC.z + 1.5 }, audio: { clip: G("thick-black-tar-bubbling-and-popping-in-a-pit-loop"), loop: true, gain: 0.28, spatial: true, refDistance: 2, maxDistance: 11 } });
  sp("snd-wind", { feetPosition: { x: FC.x, y: FC.y + 2.5, z: FC.z }, audio: { clip: G("cold-sea-wind-gusting-through-plank-palisade-and-flapping-rags-loop"), loop: true, gain: 0.22, spatial: true, refDistance: 8, maxDistance: 40 } });
  sp("snd-chant", { feetPosition: { x: FC.x, y: FC.y + 1.2, z: FC.z - 8 }, audio: { clip: G("low-murmured-group-chant-of-hushed-worshippers-under-wind-loop"), loop: true, gain: 0.16, spatial: true, refDistance: 3, maxDistance: 22 } });
  sp("snd-tower", { feetPosition: { x: FC.x, y: FC.y + 6.5, z: FC.z - 8 }, audio: { clip: G("old-rope-and-timber-creaking-in-sea-wind-loop"), loop: true, gain: 0.14, spatial: true, refDistance: 3, maxDistance: 18 } });
}
