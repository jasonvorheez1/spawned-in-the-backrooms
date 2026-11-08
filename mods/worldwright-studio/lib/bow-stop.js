import {SAMPLES} from './data/ldk1609.js';
import {BOW_STOP as P} from './data/bow-stop.js';
import {connect} from './instrument-process.js';
import * as HELD from './held-bow-level.js';
const ARTS=new Map(['short','sustain','vibrato'].map(art=>[art,new Map(SAMPLES.filter(r=>r.art===art).map(r=>[r.root,r]))]));
const BODY=new WeakMap();
export function profile(s){return s?.bowStop===P.version&&s.bank==='ldk1609'&&s.articulation==='short'&&s.performance==='compact'&&s.clip===ARTS.get('short').get(72).ref&&s.mode==='pitched'&&s.root===72&&s.start===0&&s.end==null&&!s.loop&&!s.reverse&&(!s.channel||s.channel==='stereo')?{kind:'violin',bank:'ldk1609',bowStop:P.version}:null;}
export function choose(n){if(!profile(n.sample))return null;const length=n.length??((n.duration??1)+(n.age||0)),key=n.key??72,art=length<=P.shortSeconds?'short':'sustain',row=ARTS.get(art).get(key)||(art==='sustain'?ARTS.get('vibrato').get(key):null);
 if(!row)throw Error('No exact-pitch ldk1609 '+art+' bow for MIDI '+key);
 const rate=2**((n.sample.tune||0)/1200);return {row,art:row.art,kind:'violin',bank:'ldk1609',layer:'recorded',index:0,variation:1,rate};}
// A deliberately authored long release uses the smooth cosine tail. Default
// 16/24 ms bow stops stay crisp; this never extends or selects any written note.
export function shape(n){const s=n.sample||{},length=n.length??((n.duration??1)+(n.age||0)),hard=length>P.tinySeconds&&(s.release==null||s.release<=P.hardRelease),held=length>P.shortSeconds,attack=s.attack??P.attack,release=hard&&(s.release==null||s.release===P.release)?P.hardRelease:(s.release??P.release);if(length<=attack+release+P.gap)throw Error('This bow needs room for its attack, damping and stop; no envelope was compressed');return {length,attack,release,gap:P.gap,finish:length-P.gap,hard,held};}
// Preload, never the audio-clock scheduler: no waveform scans on a note attack.
export async function prepare(buffers,notes){const jobs=new Map();for(const n of notes||[]){if(n.instrument!=='clip'||!profile(n.sample)||!shape(n).held||n.velocity===0)continue;const c=choose(n),b=buffers.get(c.row.ref);if(!b)throw Error('Missing held bow '+c.row.id);jobs.set(b,Math.max(jobs.get(b)||0,shape(n).finish*c.rate));}await HELD.prepare([...jobs].map(([buffer,to])=>({buffer,to})));}
export function assertFits(notes){const groups=new Map();for(const n of notes||[]){if(n.instrument!=='clip'||!profile(n.sample)||n.velocity===0)continue;const c=choose(n),g=shape(n);if(c.row.duration/c.rate+1e-6<g.finish)throw Error('The recorded bow is too short for this held note; no looping or stretching was used');const id=n.mixKey||'bow-stop-voice',list=groups.get(id)||[];list.push(n);groups.set(id,list);}
 for(const list of groups.values()){list.sort((a,b)=>(a.at||0)-(b.at||0));for(let i=1;i<list.length;i++){const prev=list[i-1];if((prev.at||0)+(prev.length??prev.duration)-(prev.age||0)>(list[i].at||0)+1e-6)throw Error('This violin overlaps its own next note. Separate the written notes before previewing; no attack was dropped.');}}}
function bodyGain(b){if(BODY.has(b))return BODY.get(b);const count=Math.min(b.length,Math.round(P.bodySeconds*b.sampleRate));let sum=0;for(let c=0;c<b.numberOfChannels;c++){const d=b.getChannelData(c);for(let i=0;i<count;i++)sum+=d[i]*d[i];}const rms=Math.sqrt(sum/(count*b.numberOfChannels));if(!(rms>0))throw Error('The recorded bow has a silent attack/body');const value=P.bodyRms/rms;BODY.set(b,value);return value;}
function curve(a,b,fn){const out=new Float32Array(P.curvePoints);for(let i=0;i<out.length;i++)out[i]=fn(a+(b-a)*i/(out.length-1));return out;}
export function noteOn(ctx,out,buffers,n,start,end,pitch=1){const c=choose(n);if(!c)return null;const b=buffers.get(c.row.ref);if(!b)throw Error('Missing recorded bow '+c.row.id);const g=shape(n),sr=ctx.sampleRate,age=Math.max(0,n.age||0),remaining=(Math.round(g.length/pitch*sr)-Math.round(g.gap/pitch*sr))/sr-age/pitch;start=Math.round(start*sr)/sr;
 if(!(remaining>0)||!(n.velocity??.8)||!n.sample.gain)return null;
 const available=Math.min(remaining,n.duration,end-start,(b.duration-age*c.rate)/(c.rate*pitch));if(!(available>0))return null;
 const finish=start+available,zero=Math.max(start,finish-1/sr),off=Math.max(start,finish-Math.round(g.release/pitch*sr)/sr),level=n.sample.gain*Math.max(0,Math.min(1,n.velocity??.8))*(g.held?1:bodyGain(b)),source=ctx.createBufferSource(),gain=ctx.createGain();
 source.buffer=b;source.playbackRate.setValueAtTime(c.rate*pitch,start);const leveler=g.held?ctx.createGain():null,nodes=connect(ctx,source,leveler||gain,n.sample,start);if(leveler){HELD.schedule(leveler.gain,b,age*c.rate,c.rate*pitch,start,finish);leveler.connect(gain);nodes.push(leveler);}gain.connect(out);
 // Seek/resume retains the original sample age, not a fresh bow attack.
 const riseEnd=Math.min(off,start+Math.max(0,(Math.round(g.attack/pitch*sr)-1)/sr-age/pitch));
 if(riseEnd>start&&g.attack>0)gain.gain.setValueCurveAtTime(curve(age,age+(riseEnd-start)*pitch,t=>level*(.5-.5*Math.cos(Math.PI*t/Math.max(1/sr,(Math.round(g.attack/pitch*sr)-1)*pitch/sr)))),start,riseEnd-start);
 else gain.gain.setValueAtTime(level,start);
 if(off>riseEnd)gain.gain.setValueAtTime(level,off);
 if(zero>off&&g.release>0){const phase=age>g.finish-g.release?(age-(g.finish-g.release))/g.release:0;gain.gain.setValueCurveAtTime(curve(phase,1,t=>level*(g.hard?(Math.exp(-P.hardExponent*t)-Math.exp(-P.hardExponent))/(1-Math.exp(-P.hardExponent)):(.5+.5*Math.cos(Math.PI*t)))),off,zero-off);}else gain.gain.setValueAtTime(0,finish);
 source.start(start,age*c.rate);source.stop(finish);source.onended=()=>{source.disconnect();gain.disconnect();nodes.forEach(x=>x.disconnect());};
 return {source,gain,start,finish,off,attack:g.attack/pitch,level,children:[],performance:{kind:'violin',bank:'ldk1609',art:c.art,bowStop:P.version,stop:g.hard?'firm':'tiny',heldLevelled:g.held,ref:c.row.ref,recordedAlternates:false}};
}
