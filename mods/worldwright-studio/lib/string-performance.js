import * as BOW from './bow-stop.js';
import * as LDK from './ldk-violin.js';
import {STRINGS,PERFORMANCE as P} from './data/string-performances.js';
import {connect} from './instrument-process.js';
export function profile(s){if(BOW.profile(s))return BOW.profile(s);if(LDK.profile(s))return LDK.profile(s);const p=STRINGS[s?.clip];return p&&s.performance!=='compact'&&s.mode==='pitched'&&(!s.channel||s.channel==='stereo')&&!s.loop&&!s.reverse&&s.start===0&&s.end===3.9&&s.root===p.root?p:null;}
export function choose(n){if(BOW.profile(n.sample))return BOW.choose(n);if(LDK.profile(n.sample))return LDK.choose(n);const p=profile(n.sample);if(!p)return null;const at=n.performanceAt??n.at??0,length=n.length??n.duration??1,art=length<=(p.kind==='violin'?P.violinShortSeconds:P.shortSeconds)?'short':'sustain',layer=(n.velocity??.8)<P.softVelocity?'soft':'strong',index=Math.abs(Math.round(at/Math.max(.05,length))+n.key+Math.round((n.sample.pan||0)*10))%2,row=art==='short'?p.short[layer][index]:p.sustain[layer];return {row,art,layer,index,kind:p.kind,variation:1+P.variation*Math.sin(at*17.71+n.key*3.1)};}
export function tail(n){if(BOW.profile(n.sample))return 0;if(LDK.profile(n.sample))return LDK.tail(n);const c=choose(n);if(!c)return 0;const ratio=2**((n.key-n.sample.root)/12+(n.sample.tune||0)/1200);return c.art==='short'?Math.max(0,c.row.duration/ratio-(n.length??n.duration??0)):(c.row.duration-c.row.releaseAt)/ratio;}
export function noteOn(ctx,out,buffers,n,start,end,pitch=1){
 if(BOW.profile(n.sample))return BOW.noteOn(ctx,out,buffers,n,start,end,pitch);
 if(LDK.profile(n.sample))return LDK.noteOn(ctx,out,buffers,n,start,end,pitch);
 const choice=choose(n);if(!choice)return null;const s=n.sample,row=choice.row,b=buffers.get(row.ref);if(!b)throw Error('Missing recorded '+choice.kind+' '+choice.art+' bow');
 const ratio=2**((n.key-s.root)/12+(s.tune||0)/1200),rate=ratio*pitch,offset=Math.max(0,n.age||0)*ratio,level=s.gain*Math.max(0,Math.min(1,n.velocity??.8))*choice.variation;
 if(!(n.duration>0)||!level||offset>=b.duration)return null;
 const off=start+n.duration,naturalEnd=start+(b.duration-offset)/rate,children=[],source=ctx.createBufferSource(),gain=ctx.createGain();
 source.buffer=b;source.playbackRate.setValueAtTime(rate,start);const nodes=connect(ctx,source,gain,s,start);gain.connect(out);
 let finish=Math.min(end,naturalEnd),fall=Math.max(start,finish-P.declick),attack=Math.min(P.attack,Math.max(0,finish-start)/2);
 if(choice.art==='sustain'&&off<finish&&offset+n.duration*rate<row.releaseAt){
  const rs=ctx.createBufferSource(),rg=ctx.createGain(),stop=Math.min(end,off+(b.duration-row.releaseAt)/rate),cross=Math.min(P.crossfade,Math.max(0,stop-off)/2),releaseLevel=level*P.releaseGain;
  rs.buffer=b;rs.playbackRate.setValueAtTime(rate,off);rg.gain.setValueAtTime(0,off);rg.gain.linearRampToValueAtTime(releaseLevel,off+cross);rg.gain.setValueAtTime(releaseLevel,Math.max(off+cross,stop-P.declick));rg.gain.linearRampToValueAtTime(0,stop);
  const rn=connect(ctx,rs,rg,s,off);rg.connect(out);rs.start(off,row.releaseAt);rs.stop(stop);rs.onended=()=>{rs.disconnect();rg.disconnect();rn.forEach(x=>x.disconnect());};children.push({source:rs,gain:rg,start:off,finish:stop,off:Math.max(off+cross,stop-P.declick),attack:cross,level:releaseLevel});
  finish=Math.min(finish,off+cross);fall=off;
 }
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);gain.gain.setValueAtTime(level,Math.max(start+attack,fall));gain.gain.linearRampToValueAtTime(0,finish);source.start(start,offset);source.stop(finish);
 source.onended=()=>{source.disconnect();gain.disconnect();nodes.forEach(x=>x.disconnect());};return {source,gain,start,finish,off:fall,attack,level,children,performance:{kind:choice.kind,art:choice.art,layer:choice.layer,rr:choice.index,ref:row.ref}};
}
