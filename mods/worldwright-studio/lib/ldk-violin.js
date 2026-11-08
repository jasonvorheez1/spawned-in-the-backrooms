import {SAMPLES,ARTICULATIONS} from './data/ldk1609.js';
import {connect} from './instrument-process.js';
const BY_ART=new Map(ARTICULATIONS.filter(a=>a!=='auto').map(a=>[a,new Map(SAMPLES.filter(s=>s.art===a).map(s=>[s.root,s]))]));
export function representative(art='auto'){return BY_ART.get(art==='auto'?'sustain':art)?.get(72)||null;}
export function profile(s){const row=representative(s?.articulation);return s?.bank==='ldk1609'&&row&&s.clip===row.ref&&s.performance!=='compact'&&s.mode==='pitched'&&(!s.channel||s.channel==='stereo')&&s.root===72&&s.start===0&&s.end==null&&!s.loop&&!s.reverse?{kind:'violin',bank:'ldk1609',root:72,articulation:s.articulation}:null;}
export function choose(n){const p=profile(n.sample);if(!p)return null;const length=n.length??n.duration??12,key=n.key??72,arts=p.articulation==='auto'?['short','sustain','vibrato']:[p.articulation],rows=arts.map(a=>BY_ART.get(a)?.get(key)).filter(Boolean);
 if(!rows.length)throw Error('ldk1609 has no '+p.articulation+' recording for MIDI '+key+'; choose another recorded articulation');
 const rate=2**((n.sample.tune||0)/1200),rank=r=>Math.abs(r.duration/rate-length),fitting=rows.filter(r=>r.duration/rate<=length+1e-6),row=(fitting.length?fitting:rows).slice().sort((a,b)=>fitting.length?rank(a)-rank(b):a.duration-b.duration)[0];
 return {row,art:row.art,layer:'recorded',index:0,kind:'violin',bank:'ldk1609',variation:1,rate};
}
export function tail(n){const c=choose(n);return c?Math.max(0,c.row.duration/c.rate-(n.length??n.duration??0)):0;}
export function assertFits(notes){const groups=new Map();for(const n of notes||[]){if(n.instrument!=='clip'||!profile(n.sample)||n.velocity===0)continue;const id=n.mixKey||'ldk1609-voice',list=groups.get(id)||[];list.push(n);groups.set(id,list);}
 for(const list of groups.values()){list.sort((a,b)=>(a.at||0)-(b.at||0));for(let i=0;i<list.length;i++){const n=list[i],c=choose(n),age=Math.max(0,n.age||0),needed=Math.max(0,c.row.duration/c.rate-age),next=list[i+1],available=Math.min(n.duration??n.length??12,next?(next.at||0)-(n.at||0):Infinity);if(needed>available+1e-6)throw Error('ldk1609 '+c.art+' MIDI '+n.key+' needs '+needed.toFixed(3)+'s intact; only '+available.toFixed(3)+'s is written here. No tail was cut or overlapped. Choose a genuinely shorter performance before rendering.');}}
}
export function noteOn(ctx,out,buffers,n,start,end,pitch=1){const c=choose(n);if(!c)return null;const b=buffers.get(c.row.ref);if(!b)throw Error('Missing ldk1609 recording '+c.row.id);const rate=c.rate*pitch,offset=Math.max(0,n.age||0)*c.rate,remaining=(b.duration-offset)/rate;if(remaining<=0||!n.velocity||!n.sample.gain)return null;
 if(remaining>n.duration+1e-6||start+remaining>end+1e-6)throw Error('This ldk1609 recording cannot finish naturally inside this note; playback stopped before making a cut.');
 const source=ctx.createBufferSource(),gain=ctx.createGain(),level=n.sample.gain*Math.max(0,Math.min(1,n.velocity)),finish=start+remaining;source.buffer=b;source.playbackRate.setValueAtTime(rate,start);gain.gain.setValueAtTime(level,start);const nodes=connect(ctx,source,gain,n.sample,start);gain.connect(out);source.start(start,offset);source.stop(finish);source.onended=()=>{source.disconnect();gain.disconnect();nodes.forEach(x=>x.disconnect());};
 return {source,gain,start,finish,off:finish,attack:0,level,children:[],performance:{kind:'violin',bank:'ldk1609',art:c.art,layer:'recorded',rr:0,ref:c.row.ref}};
}
