// The Drain Smiler (Level 34): hunched under foul sewer water until a beam or splash wakes it.
import { stepAmbushSmiler } from "./lib/ambush-smiler.js";

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const CFG = {
  stats: { sight: 18, near: 2.2, walk: 0.9, run: 5.2, bite: 1.1, biteCd: 1300, biteDmg: 18, biteSan: 8, loseMs: 1200, ignoreMs: 9000, downPitch: -28 },
  hideWhileLurking: true,
  navHeight: 1.1,
  wakeSfx: SND("smiler-wet-giggle-hiss-stalking"),
  retreatSfx: "/cdn/moodboard-gothic-horror/sfx-something-sinking-into-sewer-water-glug.mp3",
  eyesFx: `fx
local
pop eyeL n=1 pos=<.16,.86,-.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,.86,.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,.76,0> size=.14 asp=3.2 col=hdr(3,2.8,.8)*flick(2,.2) a=.9 sz=$size r=sprite(soft-disc,add)
pop drip rate=3 on=box(.5,.2,.4).c(.6) life=.5..0.8 v=up(-.4) size=.02..0.035 acc=grav() col=<.35,.33,.15> a=.8>0 r=sprite(soft-disc,alpha)`,
  lurkFx: `fx
local
pop grin n=1 pos=<.2,.06,0> size=.16 asp=3.2 col=hdr(2.4,2.2,.6)*flick(1.2,.35) a=.8 sz=$size r=sprite(soft-disc,add)
pop bub rate=2.5 on=disc(.35).c(.04) life=.4..0.7 v=up(.15..0.3) size=.025..0.05 col=<.45,.43,.2> a=.7>0 sz=$size*(1>1.6) r=sprite(soft-disc,alpha)`,
  splashFx: `fx
pop spray burst=26 on=disc(.4) life=.5..0.9 v=up(2..3.4)+sdir()*(.5..1.2) size=.03..0.07 acc=grav() col=<.5,.47,.22> a=.9>0 floor=die r=sprite(soft-disc,alpha)`,
};

export function update(ctx, dt) { stepAmbushSmiler(ctx, dt, CFG); }
