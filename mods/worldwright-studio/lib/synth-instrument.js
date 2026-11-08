import { validate } from "./synth-data.js";
// The same bounded patch voice runs in auditions, streamed scores and OfflineAudioContext.
export function heldLevel(p,age){if(p.attack>0&&age<p.attack)return Math.max(0,age/p.attack);if(p.decay>0&&age<p.attack+p.decay)return 1-(1-p.sustain)*(age-p.attack)/p.decay;return p.sustain;}
export function noteOn(ctx,out,n,start,end,pitch=1){
  const r=validate(n.synth);if(r.error)throw Error(r.error);const p=r.synth,level=.12*n.velocity*p.gain;if(!level||!(n.duration>0))return null;
  const age=n.age||0,off=start+n.duration,release=p.release/pitch,finish=Math.max(start,Math.min(off+Math.max(.004,release),end));
  const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner();
  source.type=p.wave;source.frequency.setValueAtTime(440*2**((n.key-69)/12)*pitch,start);source.detune.setValueAtTime(p.detune,start);
  filter.type='lowpass';filter.frequency.setValueAtTime(Math.min(p.cutoff,ctx.sampleRate*.49),start);filter.Q.setValueAtTime(p.resonance,start);pan.pan.setValueAtTime(p.pan,start);
  const on=(time)=>level*heldLevel(p,age+(time-start)*pitch),attack=Math.min(.004,n.duration/3);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(on(start+attack),start+attack);
  for(const t of [p.attack,p.attack+p.decay]){const at=start+(t-age)/pitch;if(at>start+attack&&at<off)gain.gain.linearRampToValueAtTime(level*heldLevel(p,t),at);}
  gain.gain.linearRampToValueAtTime(on(off),off);gain.gain.linearRampToValueAtTime(0,finish);
  source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(out);source.start(start);source.stop(finish);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
  return {source,gain,start,off,finish,level,attack};
}
