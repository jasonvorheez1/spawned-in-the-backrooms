import { createTransport, releaseTail } from './roll-transport.js';
import { SOUND } from './data/piano-samples.js';
import { PREVIEW } from './data/arrangement-preview.js';
// A note belongs to exactly one group and plays to its end. PCM overlaps add,
// rather than cutting time into slices that would restart envelopes at seams.
export async function mixRoll(roll,opts={}){
 const Offline=opts.Offline||globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 if(!Offline)throw Error('Offline mixing is unavailable');
 const rate=opts.rate||44100,channels=opts.channels||2,seconds=roll.duration+(opts.tail||0),lead=Math.round(SOUND.lead*rate),frames=Math.ceil(seconds*rate)+lead;
 const allocator=new Offline(channels,1,rate),buffer=allocator.createBuffer(channels,frames,rate),out=Array.from({length:channels},(_,i)=>buffer.getChannelData(i)),bank=new Map();
 const check=()=>{if(opts.signal?.aborted)throw Error('Render cancelled');opts.check?.();},yieldUI=opts.yieldUI||(()=>new Promise(r=>setTimeout(r,0))),load=row=>{const key=row.ref||row.clip||row.url||row.midi;if(!bank.has(key))bank.set(key,Promise.resolve(opts.loadBuffer(row)));return bank.get(key);};
 let group=[],origin=0,done=0;
 async function render(){if(!group.length)return;check();const notes=group,offset=Math.floor(origin*rate),from=offset/rate,end=Math.min(seconds,Math.max(...notes.map(n=>n.at+n.length))+releaseTail({notes})),length=Math.max(1,Math.ceil((end-from)*rate)+lead),ctx=new Offline(channels,length,rate),bus=ctx.createGain();bus.gain.value=opts.gain??1;bus.connect(ctx.destination);
  const part={...roll,duration:roll.duration-from,notes:notes.map(n=>({...n,performanceAt:n.performanceAt??n.at,at:n.at-from}))},t=createTransport(ctx,bus,load);
  try{opts.progress?.('Mixing full arrangement · '+Math.round(done/roll.notes.length*100)+'%');await t.start({roll:part,from:0,to:part.duration,seconds:part.duration,pitch:1,loop:false,hardEnd:opts.hardEnd!==false,pageKey:0});check();const chunk=await ctx.startRendering();check();
   const count=Math.min(chunk.length,frames-offset);for(let c=0;c<channels;c++){const input=chunk.getChannelData(c),output=out[c];for(let i=0;i<count;i++)output[offset+i]+=input[i];}
   done+=notes.length;opts.progress?.('Mixing full arrangement · '+Math.round(done/roll.notes.length*100)+'%');
  }finally{t.dispose();bus.disconnect();}await yieldUI();check();
 }
 for(const n of roll.notes){if(group.length&&(group.length>=PREVIEW.batch||n.at-origin>=PREVIEW.offlineWindow)){await render();group=[];}if(!group.length)origin=n.at;group.push(n);}await render();return {buffer,offset:lead/rate,frames:frames-lead,rate,channels};
}
