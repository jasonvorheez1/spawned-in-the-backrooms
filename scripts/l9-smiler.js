// The House Smiler (Level 9): stands full height inside a dark house and keeps within its leash.
import { stepAmbushSmiler } from "./lib/ambush-smiler.js";

const SND = (n) => `/cdn/moodboard-gothic-horror/sfx-${n}.mp3`;
const CFG = {
  stats: { sight: 14, near: 2.2, walk: 0.9, run: 4.6, bite: 1.1, biteCd: 1300, biteDmg: 16, biteSan: 8, loseMs: 1200, ignoreMs: 9000, downPitch: -28 },
  hideWhileLurking: false,
  navHeight: 1.7,
  wakeSfx: SND("smiler-wet-giggle-hiss-stalking"),
  retreatSfx: SND("smiler-giggle-fading-into-dark-room"),
  playerAllowed: (st, p) => !st.home || Math.hypot(p.feetPosition.x - st.home.x, p.feetPosition.z - st.home.z) <= (st.leash ?? 6),
  eyesFx: `fx
local
pop eyeL n=1 pos=<.16,1.5,-.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,1.5,.08> size=.045 col=hdr(3.6,3.4,.9)*flick(3,.15) a=1 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,1.36,0> size=.14 asp=3.2 col=hdr(3,2.8,.8)*flick(2,.2) a=.9 sz=$size r=sprite(soft-disc,add)`,
  lurkFx: `fx
local
pop eyeL n=1 pos=<.16,1.5,-.08> size=.03 col=hdr(1.6,1.5,.5)*flick(.6,.4) a=.7 sz=$size r=sprite(soft-disc,add)
pop eyeR n=1 pos=<.16,1.5,.08> size=.03 col=hdr(1.6,1.5,.5)*flick(.6,.4) a=.7 sz=$size r=sprite(soft-disc,add)
pop grin n=1 pos=<.2,1.36,0> size=.12 asp=3.2 col=hdr(1.8,1.7,.5)*flick(.8,.35) a=.6 sz=$size r=sprite(soft-disc,add)`,
};

export function update(ctx, dt) { stepAmbushSmiler(ctx, dt, CFG); }
