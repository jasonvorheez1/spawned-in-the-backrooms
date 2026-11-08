import {wakeAudio,audioReady} from './audio-start.js';
import {createTransport,releaseTail} from './roll-transport.js';
import {SOUND} from './data/piano-samples.js';
import {PREVIEW,barSeconds} from './data/arrangement-preview.js';
export function createBufferedPreview(env,compile){
 const ctx=env.context,bus=ctx.createGain();bus.gain.value=.6;bus.connect(env.bus('Music'));
 const live=createTransport(ctx,bus,row=>env.buffer(row.ref||row.clip||row.url));
 let serial=0,closed=false,run=null,timer=0;
 const stats={windows:0,residentNotes:0,peakResidentNotes:0,peakWindowNotes:0,maxPrepareMs:0,preparedNotes:0,mode:'stopped'};
 const current=r=>!closed&&run===r&&r.token===serial;
 function stop(){serial++;clearTimeout(timer);timer=0;live.stop();run=null;stats.mode='stopped';stats.residentNotes=stats.preparedNotes=0;}
 function position(){return run?run.base+live.position():0;}
 function setMix(data){const solo=data.tracks.some(t=>t.solo);live.setMix(Object.fromEntries(data.clips.map(c=>[c.id,data.tracks[c.track-1].mute||(solo&&!data.tracks[c.track-1].solo)?0:c.gain])));if(run)run.data=JSON.parse(JSON.stringify(data));}
 function measureNotes(){stats.residentNotes=live.measure().residentNotes;stats.peakResidentNotes=Math.max(stats.peakResidentNotes,stats.residentNotes);}
 async function prepare(r,from,to,held){
  const began=performance.now();
  const roll=env.sourceWindow?await env.sourceWindow(r.data,from,to,held):compile(r.data,r.sources,{maxNotes:16384,window:{from,to,held}}).roll;
  if(!current(r))return null;
  const notes=roll.notes.filter(n=>!r.accepted.has(n.previewKey));
  // Attack windows never shorten note lengths. WebAudio owns the entire sustain/tail.
  for(let i=0;i<notes.length;i+=PREVIEW.batch){await live.warm({...roll,notes:notes.slice(i,i+PREVIEW.batch)});if(!current(r))return null;}
  stats.windows++;stats.preparedNotes=notes.length;stats.peakWindowNotes=Math.max(stats.peakWindowNotes,notes.length);stats.maxPrepareMs=Math.max(stats.maxPrepareMs,performance.now()-began);
  return {...roll,notes};
 }
 function accept(r,roll){for(const n of roll.notes)r.accepted.set(n.previewKey,n.at+n.length+releaseTail({notes:[n]}));stats.preparedNotes=0;}
 function fail(r,e){if(!current(r))return;stop();r.progress?.(String(e.message||e));r.error?.(e);}
 async function advance(r){
  if(!current(r)||r.scheduling)return;
  const at=position(),bar=Math.floor(at/r.bar),target=Math.min(r.duration,(bar+2)*r.bar);
  if(r.edge>=target)return;
  r.scheduling=true;
  try{
   // A suspended tab seeks into the current bar, not an expired preparation backlog.
   let from=Math.max(r.edge,bar*r.bar);
   while(current(r)&&from<target){const to=Math.min(target,(Math.floor(from/r.bar+1e-8)+1)*r.bar),roll=await prepare(r,from,to,from>r.edge);if(!roll)return;
    if(!await live.append(roll,'bar:'+from))return;if(!current(r))return;accept(r,roll);r.edge=to;from=to;
   }
   measureNotes();
  }catch(e){fail(r,e);}finally{if(current(r))r.scheduling=false;}
 }
 function tick(){clearTimeout(timer);const r=run;if(!r)return;const at=position(),bar=Math.floor(at/r.bar);
  if(bar!==r.prunedBar){live.prune(at);for(const [key,end] of r.accepted)if(end<at)r.accepted.delete(key);r.prunedBar=bar;measureNotes();}
  advance(r);if(current(r)&&at<r.duration+r.tail)timer=setTimeout(tick,PREVIEW.tickMs);
 }
 async function start(data,sources,opts={}){
  stop();if(closed)throw Error('Arrangement audio is closed');const duration=Math.max(4,...data.clips.map(c=>c.start+c.length))*60/data.bpm,from=Number(opts.from||0);if(!Number.isFinite(from)||from<0||from>=duration)throw Error('Cursor is beyond the end of the arrangement');
  const r=run={token:serial,data:JSON.parse(JSON.stringify(data)),sources,duration,bar:barSeconds(data),base:from,edge:from,accepted:new Map(),tail:Math.max(SOUND.baseTail,...sources.map(s=>s.tail??releaseTail(s.roll||{notes:[]}))),progress:opts.progress,error:opts.error};
  stats.windows=stats.preparedNotes=0;stats.mode='preparing';wakeAudio(ctx);opts.progress?.('Preparing current bar + next bar…');
  try{
   const firstEnd=Math.min(duration,(Math.floor(from/r.bar)+1)*r.bar),first=await prepare(r,from,firstEnd,true);if(!first)return null;
   let notes=first.notes;if(firstEnd<duration){const next=await prepare(r,firstEnd,Math.min(duration,firstEnd+r.bar),false);if(!next)return null;notes=[...notes,...next.notes];}
   await audioReady(ctx);if(!current(r))return null;setMix(data);
   const roll={...first,notes},result=await live.start({roll,from:0,to:duration+r.tail,offset:from,seconds:duration-from+r.tail,pitch:1,loop:false,hardEnd:false,pageKey:'bar:'+from,streaming:true});
   if(!result||!current(r))return null;accept(r,roll);r.edge=Math.min(duration,firstEnd+r.bar);stats.mode='bars';measureNotes();tick();return {...result,from,cached:false,mode:'pages'};
  }catch(e){if(!current(r))return null;stop();throw e;}
 }
 return {start,stop,pause:stop,position,setMix,get playing(){return !!run&&stats.mode==='bars'&&position()<run.duration+run.tail;},measure:()=>({...stats,preparing:stats.mode==='preparing',feeding:!!run?.scheduling,bufferedUntil:run?.edge||0,scheduledUntil:run?.edge||0,identities:run?.accepted.size||0,lookAheadSeconds:run?Math.max(0,run.edge-position()):0}),dispose(){if(closed)return;stop();closed=true;live.dispose();setTimeout(()=>bus.disconnect(),Math.ceil(SOUND.stop*1000)+1);}};
}
