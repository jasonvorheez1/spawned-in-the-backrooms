import {tail as performanceTail} from './string-performance.js';
import { noteOn as synthOn } from "./synth-instrument.js";
import { INSTRUMENTS, LIMITS, schedule } from "./pianoroll.js";
import { preload, noteOn, cancelVoice } from "./piano-instrument.js";
import { preload as preloadClips, noteOn as clipOn } from "./clip-instrument.js";
import { SOUND } from "./data/piano-samples.js";
import { envelope } from "./audio-envelope.js";
export function releaseTail(roll,pitch=1){return Math.max(SOUND.baseTail/pitch,...(roll.notes||[]).map(n=>n.instrument==="piano"?SOUND.release/pitch:n.instrument==="synth"&&n.synth?n.synth.release/pitch:n.instrument==="clip"&&n.sample?Math.max(n.sample.release||0,n.sample.ringOut||0,performanceTail(n))/pitch:0));}
// A bounded score is submitted to WebAudio in one pass. RAF is never the note clock.
export function createTransport(ctx,out,loadBuffer) {
  const mixLevels=new Map();
  let generation=0,voices=[],buses=[],run=null,disposed=false;
  const sampled=roll=>(roll.notes||[]).some(n=>n.instrument==="piano"||n.instrument==="clip");
  function warm(roll) {
    if(!roll)return preload(ctx,loadBuffer); // legacy explicit piano-bank warm
    const notes=roll.notes||[],piano=notes.some(n=>n.instrument==="piano")?preload(ctx,loadBuffer,notes):new Map();
    if(!notes.some(n=>n.instrument==="clip"))return Promise.resolve(piano);
    return Promise.all([piano,preloadClips(ctx,notes,loadBuffer)]).then(([p,c])=>new Map([...p,...c]));
  }
  const copyNote=n=>n.instrument==="clip"?{...n,sample:n.sample&&{...n.sample}}:n.synth?{...n,synth:{...n.synth}}:{...n};
  function clear(){for(const v of voices)cancelVoice(ctx,v);voices=[];for(const b of buses){const p=b.gain,t=ctx.currentTime;if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(1,t);}p.linearRampToValueAtTime(0,t+SOUND.stop);}buses=[];}
  function stop(){generation++;clear();run=null;}
  function position(){if(!run)return 0;return run.paused?run.position:Math.max(0,Math.min(run.p.seconds,ctx.currentTime-run.at));}
  function queue(p,buffers,at,seconds) {
    const master=ctx.createGain();envelope(master.gain,at,seconds,p.fade||0,p.elapsed||0);master.connect(out);buses.push(master);let owned=0;
    const releaseMaster=()=>{master.disconnect();const i=buses.indexOf(master);if(i>=0)buses.splice(i,1);};
    const end=p.hardEnd===false?at+seconds+releaseTail(p.roll,p.pitch||1):at+seconds-(p.catchUp?SOUND.lead:0);
    for(const n of schedule(p.roll,p.from,p.to,seconds,p.pitch||1,p.loop,p.offset||0)) {
      const start=at+n.at,edge=ctx.createGain();envelope(edge.gain,start,n.duration,n.fade||0);const mix=ctx.createGain();mix.gain.value=mixLevels.get(n.mixKey)??n.mixGain??1;edge.connect(mix);mix.connect(master);
      let v;
      if(n.instrument==="piano")v=noteOn(ctx,edge,buffers,n,start,end,p.pitch||1);
      else if(n.instrument==="clip")v=clipOn(ctx,edge,buffers,n,start,end,p.pitch||1);
      else if(n.instrument==="synth"&&n.synth)v=synthOn(ctx,edge,n,start,end,p.pitch||1);
      else {
        const timbre=INSTRUMENTS[n.instrument],source=ctx.createOscillator(),gain=ctx.createGain(),off=start+n.duration,attack=Math.min(timbre.attack/(p.pitch||1),n.duration/3),level=0.12*n.velocity*Math.exp(-n.age/timbre.decay);
        source.type=timbre.wave;source.frequency.value=440*2**((n.key-69)/12)*(p.pitch||1);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(Math.max(0.00001,level),start+attack);gain.gain.exponentialRampToValueAtTime(Math.max(0.00001,level*Math.exp(-n.duration*(p.pitch||1)/timbre.decay)),Math.max(start+attack,off-0.002));gain.gain.linearRampToValueAtTime(0,off);source.connect(gain);gain.connect(edge);source.start(start);source.stop(off);v={source,gain,start,finish:off,off,attack,level};
      }
      if(v){v.mix=mix;v.mixKey=n.mixKey;owned++;voices.push(v);const parts=[v,...(v.children||[])];let sounding=parts.length;for(const part of parts){const previousEnded=part.source.onended;part.source.onended=()=>{if(previousEnded)previousEnded();part.source.disconnect();part.gain.disconnect();if(--sounding)return;edge.disconnect();mix.disconnect();const i=voices.indexOf(v);if(i>=0)voices.splice(i,1);owned--;if(!owned)releaseMaster();};}}else {edge.disconnect();mix.disconnect();}
    }
    if(!owned)releaseMaster();
  }
  async function start(p) {
    stop();if(disposed)throw Error("Piano transport is closed");const token=generation,requested=ctx.currentTime;
    // Snapshot descriptors before any asynchronous fetch, as append does for pages.
    if((p.roll.notes||[]).some(n=>n.instrument==="clip"||n.synth))p={...p,roll:{...p.roll,notes:p.roll.notes.map(copyNote)}};
    let buffers;
    try{buffers=sampled(p.roll)?await warm(p.roll):new Map();}catch(e){if(disposed||token!==generation)return null;throw e;}
    if(disposed||token!==generation)return null;
    // Private preview waits; scene playback keeps its deadline and seeks past late work.
    const late=p.catchUp?Math.max(0,ctx.currentTime-requested):0,seconds=p.seconds-late;
    if(!(seconds>0))return null;
    const actual={...p,seconds,offset:(p.offset||0)+late*(p.pitch||1),elapsed:(p.elapsed||0)+late};
    const at=ctx.currentTime+SOUND.lead;run={p:actual,at,position:0,paused:false,buffers,fired:new Set(),groups:[],pages:{seen:new Set(p.pageKey==null?[]:[p.pageKey]),pending:new Set()}};queue(actual,buffers,at,seconds);
    return {at,seconds,context:ctx};
  }
  // Only the newly accepted page is queued. Seeking the remaining slice keeps
  // absolute future attacks and the original fade/end; expired notes never backlog.
  function queueTail(p,buffers,epoch,limit=p.seconds) {
    const at=Math.max(epoch,ctx.currentTime),used=at-epoch,seconds=limit-used;
    if(seconds>0)queue({...p,seconds,offset:(p.offset||0)+used*(p.pitch||1),elapsed:(p.elapsed||0)+used},buffers,at,seconds);
  }
  // append(normalizedRoll, pageKey) -> true when merged, false for a duplicate or invalidated run. Invalid duration/limits or a live sample-load failure reject; the key remains retryable. An already-fired event joins its existing group clock, seeking held notes and skipping expired ones; it never fires again.
  async function append(roll,key) {
    if(!run||disposed)return false;
    if(key==null)throw Error("Piano append needs a page key");
    const pages=run.pages;
    if(pages.seen.has(key)||pages.pending.has(key))return false;
    // Copy caller data before the asynchronous warm; neither caller nor transport
    // can accidentally mutate a submitted page while its samples are loading.
    if(!roll||!Array.isArray(roll.notes))throw Error("Piano append needs a normalized roll");
    const page={...roll,notes:roll.notes.map(copyNote)};
    function validate() {
      if(page.duration!==run.p.roll.duration)throw Error("Piano append duration must match the full score");
      if(run.p.roll.notes.length+page.notes.length>(run.p.streaming?16384:LIMITS.notes))throw Error("Piano roll exceeds "+LIMITS.notes+" notes");
      const events=new Set([...run.p.roll.notes,...page.notes].filter(n=>n.on).map(n=>n.on));
      if(events.size>LIMITS.events)throw Error("Piano roll exceeds "+LIMITS.events+" trigger events");
    }
    const current=()=>!disposed&&run&&run.pages===pages;
    validate();pages.pending.add(key);
    try {
      const buffers=sampled(page)?await warm(page):run.buffers;
      if(!current())return false;
      // Another page or a pause/resume may have landed while warming. Lifetime is
      // the pages identity (retained by resume), not the pause generation counter.
      validate();const r=run;
      if(r.p.streaming)r.buffers=buffers;else if(buffers.size)r.buffers=new Map([...r.buffers,...buffers]);
      r.p={...r.p,roll:{...r.p.roll,notes:[...r.p.roll.notes,...page.notes].sort((a,b)=>a.at-b.at||a.key-b.key)}};
      if(r.p.streaming)pages.seen.clear();pages.seen.add(key);
      if(!r.paused)queueTail({...r.p,roll:page},r.buffers,r.at);
      for(const g of r.groups) {
        const notes=page.notes.filter(n=>n.on===g.name).map(n=>({...n,on:""}));
        if(!notes.length)continue;
        g.p={...g.p,roll:{...g.p.roll,notes:[...g.p.roll.notes,...notes]}};
        if(!r.paused)queueTail({...g.p,roll:{...page,notes}},r.buffers,g.at,Math.min(g.p.seconds,r.at+r.p.seconds-g.at));
      }
      return true;
    }catch(e){if(!current())return false;throw e;}
    finally{pages.pending.delete(key);}
  }
  function pause(){if(run&&run.paused)return;if(!run){stop();return;}const pos=position();for(const g of run.groups){const used=Math.max(0,ctx.currentTime-g.at);g.p={...g.p,seconds:g.p.seconds-used,offset:(g.p.offset||0)+used*(g.p.pitch||1),elapsed:(g.p.elapsed||0)+used};}generation++;clear();run.position=pos;run.paused=true;}
  function resume(){if(!run||!run.paused)return null;const r=run,used=r.position,at=ctx.currentTime+SOUND.lead;const p={...r.p,seconds:r.p.seconds-used,offset:(r.p.offset||0)+used*(r.p.pitch||1),elapsed:(r.p.elapsed||0)+used};if(!(p.seconds>0)){stop();return null;}run={...r,p,at,position:0,paused:false};queue(p,r.buffers,at,p.seconds);for(const g of run.groups){g.at=at;if(g.p.seconds>0)queue(g.p,r.buffers,at,Math.min(g.p.seconds,p.seconds));}return {at,seconds:p.seconds,context:ctx};}
  function trigger(name){if(!run||run.paused||run.fired.has(name))return;const notes=run.p.roll.notes.filter(n=>n.on===name);if(!notes.length)return;const left=run.p.seconds-position()-SOUND.lead;if(!(left>0))return;run.fired.add(name);const g={name,p:{...run.p,roll:{...run.p.roll,notes:notes.map(n=>({...n,on:""}))},offset:0,elapsed:0,seconds:left},at:ctx.currentTime+SOUND.lead};run.groups.push(g);queue(g.p,run.buffers,g.at,left);}
  function setMix(levels){for(const [key,value]of Object.entries(levels||{})){mixLevels.set(key,value);for(const v of voices)if(v.mixKey===key){v.mix.gain.cancelScheduledValues(ctx.currentTime);v.mix.gain.setTargetAtTime(value,ctx.currentTime,SOUND.mixRamp);}}}
  function prune(before){if(!run||run.p.loop||run.groups.length)return;run.p.roll={...run.p.roll,notes:run.p.roll.notes.filter(n=>n.at+n.length+releaseTail({notes:[n]})>=before)};}
  return {warm,start,append,stop,pause,resume,position,trigger,setMix,prune,measure:()=>({residentNotes:run?.p.roll.notes.length||0,voices:voices.length}),get playing(){return !!run&&!run.paused&&position()<run.p.seconds;},dispose(){stop();disposed=true;}};
}
