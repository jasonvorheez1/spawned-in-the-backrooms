import { BANK, SOUND } from "./data/piano-samples.js";
import {PIANO_TAKES,PIANO_FEEL as FEEL} from './data/piano-performances.js';
const CACHE="__wwsSalamanderBank3",SOFT=PIANO_TAKES.filter(r=>r.kind==='soft'),RELEASES=PIANO_TAKES.filter(r=>r.kind==='release');
const key=r=>r.bankKey??r.midi;
function closest(rows,midi){let best=rows[0];for(const row of rows)if(Math.abs(row.midi-midi)<Math.abs(best.midi-midi))best=row;return best;}
export function nearest(midi,velocity=1){return closest(velocity<FEEL.softVelocity?SOFT:BANK,midi);}
export function playbackRate(midi,sample,pitch=1){return 2**((midi-sample.midi)/12-(sample.cents||0)/1200)*pitch;}
// Context-owned promises deduplicate used recordings across previews and exports.
export async function preload(ctx,loadBuffer,notes){const c=ctx[CACHE]||(ctx[CACHE]={buffers:new Map(),pending:new Map(),jobs:[],active:0});
 const rows=notes?[...new Map(notes.filter(n=>n.instrument==='piano'&&n.velocity!==0).flatMap(n=>[nearest(n.key,n.velocity??.8),closest(RELEASES,n.key)]).map(r=>[key(r),r])).values()]:BANK;
 function pump(){while(c.active<SOUND.fetchConcurrency&&c.jobs.length){c.active++;c.jobs.shift()().finally(()=>{c.active--;pump();});}}
 function load(row){const k=key(row);if(c.buffers.has(k))return c.buffers.get(k);if(c.pending.has(k))return c.pending.get(k);let yes,no;const promise=new Promise((a,b)=>{yes=a;no=b;});c.pending.set(k,promise);c.jobs.push(async()=>{try{const b=await loadBuffer(row);if(!b||!(b.duration>0))throw Error('Empty piano recording: '+row.note);c.buffers.set(k,b);yes(b);}catch(e){no(e);}finally{c.pending.delete(k);}});pump();return promise;}
 await Promise.all(rows.map(load));return c.buffers;
}
export function noteOn(ctx,out,buffers,n,start,end,pitch=1) {
 const sample=nearest(n.key,n.velocity??.8),buffer=buffers.get(key(sample)),ratio=playbackRate(n.key,sample),rate=ratio*pitch;
 const offset=(n.age||0)*ratio,duration=n.duration,level=SOUND.gain*Math.max(0,Math.min(1,n.velocity??.8))**SOUND.velocityPower;
 if(!buffer||offset>=buffer.duration||!(duration>0)||!level)return null;
 const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=false;source.playbackRate.setValueAtTime(rate,start);
 const off=start+duration,finish=Math.min(off+SOUND.release/pitch,end,(buffer.duration-offset)/rate+start),attack=Math.min(SOUND.attack,duration/2),children=[];
 gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);gain.gain.linearRampToValueAtTime(level,Math.min(off,finish));gain.gain.exponentialRampToValueAtTime(Math.max(0.0000001,level*SOUND.releaseFloor),finish);gain.gain.setValueAtTime(0,finish);
 source.connect(gain);gain.connect(out);source.start(start,offset);source.stop(finish);
 const release=closest(RELEASES,n.key),rb=buffers.get(key(release));
 if(rb&&off<finish){const rs=ctx.createBufferSource(),rg=ctx.createGain(),stop=Math.min(finish,off+FEEL.keyTail/pitch,off+rb.duration),ra=Math.min(FEEL.keyAttack,(stop-off)/3),rl=level*FEEL.keyGain;rs.buffer=rb;rg.gain.setValueAtTime(0,off);rg.gain.linearRampToValueAtTime(rl,off+ra);rg.gain.linearRampToValueAtTime(0,stop);rs.connect(rg);rg.connect(out);rs.start(off);rs.stop(stop);rs.onended=()=>{rs.disconnect();rg.disconnect();};children.push({source:rs,gain:rg,start:off,finish:stop,off:off+ra,attack:ra,level:rl});}
 const voice={source,gain,start,finish,level,attack,off,children,performance:{layer:sample.kind==='soft'?'soft':'normal',release:!!children.length}};
 source.onended=()=>{source.disconnect();gain.disconnect();};return voice;
}
export function cancelVoice(ctx,v) {
  if(!v)return;for(const child of v.children||[])cancelVoice(ctx,child);const at=ctx.currentTime;
  try {
    if(v.start>at){v.source.stop(at);v.source.disconnect();v.gain.disconnect();return;}
    if(v.gain.gain.cancelAndHoldAtTime)v.gain.gain.cancelAndHoldAtTime(at);
    else {const level=v.level*Math.max(0,Math.min(1,(at-v.start)/v.attack,(v.finish-at)/Math.max(0.001,v.finish-v.off)));v.gain.gain.cancelScheduledValues(at);v.gain.gain.setValueAtTime(level,at);}
    v.gain.gain.linearRampToValueAtTime(0,at+SOUND.stop);v.source.stop(at+SOUND.stop);
  }catch(e){v.source.disconnect();v.gain.disconnect();}
}
