import {assertFits as assertBowStopFits,prepare as prepareBowStops} from './bow-stop.js';
import {assertFits as assertRecordedViolinFits} from './ldk-violin.js';
import * as LIVE from './string-performance.js';
import {region,connect} from "./instrument-process.js";
import { SOUND } from "./data/piano-samples.js";
import { validate, ringTail } from "./clip-instrument-data.js";
// Decoded clips and in-flight requests belong to the engine-owned audio context.
const CACHE="__wwsClipBank1";
export const CLIP={attack:0.004,release:0.012};
export function descriptor(sample) {
  if(!sample||typeof sample.clip!=="string"||!sample.clip.trim())throw Error("Missing clip recording");
  const v=validate(sample);if(v.error)throw Error("Invalid clip recording "+sample.clip+": "+v.error);
  return v.sample;
}
function key(s){return s.clip.startsWith("/")?s.clip:"/"+s.clip;}
function interval(s,b) {
  if(!b||!Number.isFinite(b.duration)||!(b.duration>0)||(b.length!=null&&!(b.length>0))||(b.numberOfChannels!=null&&!(b.numberOfChannels>0)))throw Error("Empty clip recording: "+(s.name||s.clip));
  const end=s.end===null?b.duration:s.end;
  if(s.start>=b.duration||end>b.duration||end<=s.start)throw Error("Invalid clip trim: "+(s.name||s.clip)+" (interval must lie inside "+b.duration+" source seconds)");
  return end;
}
function bank(ctx){return ctx[CACHE]||(ctx[CACHE]={buffers:new Map(),active:0,jobs:[]});}
function pump(c) {
  while(c.active<SOUND.fetchConcurrency&&c.jobs.length){const job=c.jobs.shift();c.active++;job().then(()=>{c.active--;pump(c);},()=>{c.active--;pump(c);});}
}
function load(ctx,s,loadBuffer) {
  const c=bank(ctx),id=key(s);if(c.buffers.has(id))return c.buffers.get(id);
  let resolve,reject;const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});c.buffers.set(id,pending);
  c.jobs.push(async()=>{try {
    const b=await loadBuffer({clip:s.clip,url:id,ref:id,note:s.name||s.clip});
    // Check the recording, not this caller's trim: another note may use another interval.
    interval({...s,start:0,end:null},b);resolve(b);
  }catch(e){if(c.buffers.get(id)===pending)c.buffers.delete(id);reject(Error("Clip recording "+(s.name||s.clip)+" failed: "+String(e&&e.message||e)));}});
  pump(c);return pending;
}
// Only used clip notes warm; no voice is ever made here. Failed URLs remain retryable.
export async function preload(ctx,notes,loadBuffer) {
  assertRecordedViolinFits(notes);
  assertBowStopFits(notes);
  const samples=(notes||[]).filter(n=>n.instrument==="clip").map(n=>{const s=descriptor(n.sample),p=LIVE.choose({...n,sample:s});return p?{...s,clip:p.row.ref,start:0,end:null}:s;}),unique=new Map();
  for(const s of samples)if(!unique.has(key(s)))unique.set(key(s),s);
  const buffers=new Map(await Promise.all([...unique].map(async([id,s])=>[id,await load(ctx,s,loadBuffer)])));
  for(const s of samples)interval(s,buffers.get(key(s)));
  await prepareBowStops(buffers,notes);
  return buffers;
}
export function noteOn(ctx,out,buffers,n,start,end,pitch=1) {
  const s=descriptor(n.sample);if(LIVE.profile(s))return LIVE.noteOn(ctx,out,buffers,{...n,sample:s},start,end,pitch);const b=buffers.get(key(s));
  if(!b)throw Error("Missing loaded clip recording: "+(s.name||s.clip));
  const trimEnd=interval(s,b),span=trimEnd-s.start,ratio=(s.mode==="pitched"?2**((n.key-s.root)/12):1)*2**((s.tune||0)/1200),rate=ratio*pitch,age=Math.max(0,n.age||0)*ratio;
  if(!(rate>0)||!Number.isFinite(rate))throw Error("Invalid clip playback rate");
  // age is source-score time, already advanced by global pitch by the scheduler.
  if(!s.loop&&age>=span)return null;
  const offset=s.start+(s.loop?age%span:age),tail=ringTail({...n,sample:s}),audible=tail?Math.max(0,((n.length??n.duration)+tail-Math.max(0,n.age||0))/pitch):n.duration,finish=Math.min(start+audible,end,s.loop?Infinity:start+(trimEnd-offset)/rate),duration=finish-start,level=s.gain*Math.max(0,Math.min(1,n.velocity==null?0.8:n.velocity));
  if(!(duration>0)||!level)return null;
  const edited=region(ctx,b,s,trimEnd),source=ctx.createBufferSource(),gain=ctx.createGain(),editedEnvelope=s.attack!=null||s.release!=null,a=s.attack==null?CLIP.attack:s.attack,r=s.release==null?CLIP.release:s.release,fit=Math.min(1,duration/(a+r||1)),attack=editedEnvelope?a*fit:Math.min(a,duration/3),off=finish-(editedEnvelope?r*fit:Math.min(r,duration/3));
  source.buffer=edited.buffer;source.loop=s.loop;if(s.loop){source.loopStart=edited.start;source.loopEnd=edited.end;}source.playbackRate.setValueAtTime(rate,start);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+attack);gain.gain.linearRampToValueAtTime(level,off);gain.gain.linearRampToValueAtTime(0,finish);
  const nodes=connect(ctx,source,gain,s,start);gain.connect(out);source.onended=()=>{source.disconnect();gain.disconnect();for(const node of nodes)node.disconnect();};source.start(start,edited.start+offset-s.start);source.stop(finish);
  return {source,gain,start,finish,off,attack,level};
}
