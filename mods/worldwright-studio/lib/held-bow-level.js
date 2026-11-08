import {HELD_LEVEL as P} from './data/bow-stop.js';
// Weak keys follow the decoded audio bank's lifetime. At most one tiny gain
// table per source, grown only through requested note endings. No PCM copies.
const CACHE=new WeakMap();
const count=(b,to)=>Math.ceil(Math.min(b.duration,to)/P.step)+1;
function extend(b,to){
 if(!(b.duration>0)||b.duration>P.maxSeconds||!b.numberOfChannels)throw Error('Held bow recording exceeds the bounded analysis range');
 let s=CACHE.get(b);if(!s){s={levels:[],lo:0,hi:0,sum:0};CACHE.set(b,s);}
 const wanted=count(b,to),end=Math.min(wanted,s.levels.length+P.warmKnots),channels=Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i));
 const energy=i=>{let v=0;for(const d of channels)v+=d[i]*d[i];return v/channels.length;};
 for(let k=s.levels.length;k<end;k++){
  const t=k*P.step,lo=Math.max(0,Math.min(b.length,Math.round((t-P.radius)*b.sampleRate))),hi=Math.max(lo,Math.min(b.length,Math.round((t+P.radius)*b.sampleRate)));
  while(s.hi<hi)s.sum+=energy(s.hi++);while(s.lo<lo)s.sum-=energy(s.lo++);
  const rms=Math.sqrt(Math.max(0,s.sum)/Math.max(1,hi-lo));s.levels.push(Math.min(P.maxGain,P.targetRms/Math.max(P.rmsFloor,rms)));
 }
 return s.levels.length>=wanted;
}
const ready=(b,to)=>(CACHE.get(b)?.levels.length||0)>=count(b,to);
export async function prepare(jobs,yieldUI=()=>new Promise(r=>setTimeout(r,0))){
 let worked=false;for(const {buffer,to} of jobs){if(ready(buffer,to))continue;if(worked)await yieldUI();while(!extend(buffer,to))await yieldUI();worked=true;}
}
function level(s,t){const p=Math.max(0,t/P.step),i=Math.min(s.levels.length-1,Math.floor(p)),j=Math.min(s.levels.length-1,i+1),f=Math.min(1,p-i);return s.levels[i]*(1-f)+s.levels[j]*f;}
export function schedule(param,b,age,rate,start,finish){
 const to=age+(finish-start)*rate;if(!ready(b,to-1/b.sampleRate))throw Error('Held bow gain is not prepared; preload it before scheduling');
 const s=CACHE.get(b);param.setValueAtTime(level(s,age),start);
 for(let k=Math.floor(age/P.step)+1;k<s.levels.length;k++){const t=start+(k*P.step-age)/rate;if(t>=finish)break;param.linearRampToValueAtTime(s.levels[k],t);}
 param.linearRampToValueAtTime(level(s,to),finish);
}
export function measure(b){const s=CACHE.get(b);return {knots:s?.levels.length||0,throughSeconds:(s?.hi||0)/(b.sampleRate||1),pcmCopies:0};}
