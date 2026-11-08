import { normalize } from "./pianoroll.js";
import { createTransport, releaseTail } from "./roll-transport.js";
import { SOUND } from "./data/piano-samples.js";
import { RENDER, renderRate, CREDITS, unpack, credits } from "./roll-render-data.js";
function check(signal){if(signal&&signal.aborted)throw Error("Render cancelled");}
function text(view,at,s){for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));}
// PCM stereo, explicit attribution in RIFF INFO. No data URLs and no realtime recorder.
export async function wav(buffer,start,frames,opts={}){
  const yieldUI=opts.yieldUI||(()=>Promise.resolve()),signal=opts.signal,rate=buffer.sampleRate,channels=buffer.numberOfChannels,pcm=frames*channels*2;
  const credit=new TextEncoder().encode(opts.credits||CREDITS),creditN=credit.length+1,padded=creditN+(creditN%2),infoBytes=12+8+padded,bytes=44+pcm+infoBytes;
  if(bytes>RENDER.maxBytes)throw Error("The rendered WAV exceeds the upload limit");
  const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let peak=0;
  const step=rate*4;
  for(let base=0;base<frames;base+=step){check(signal);for(let i=base;i<Math.min(base+step,frames);i++)for(const c of samples)peak=Math.max(peak,Math.abs(c[start+i]||0));await yieldUI();}
  const scale=peak>RENDER.peak?RENDER.peak/peak:1,ab=new ArrayBuffer(bytes),v=new DataView(ab);text(v,0,"RIFF");v.setUint32(4,bytes-8,true);text(v,8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);text(v,36,"data");v.setUint32(40,pcm,true);
  let offset=44;
  for(let base=0;base<frames;base+=step){check(signal);for(let i=base;i<Math.min(base+step,frames);i++)for(const c of samples){const x=Math.max(-1,Math.min(1,(c[start+i]||0)*scale));v.setInt16(offset,Math.round(x*(x<0?32768:32767)),true);offset+=2;}if(opts.progress)opts.progress("Encoding WAV · "+Math.min(100,Math.round((base+step)/frames*100))+"%");await yieldUI();}
  text(v,offset,"LIST");v.setUint32(offset+4,infoBytes-8,true);text(v,offset+8,"INFOICMT");v.setUint32(offset+16,creditN,true);new Uint8Array(ab,offset+20,credit.length).set(credit);
  return {blob:new Blob([ab],{type:"audio/wav"}),frames,rate,channels,seconds:frames/rate,peak,gain:scale};
}
export async function renderFile(packed,opts={}){
  const data=unpack(packed),n=normalize(data);if(n.error)throw Error(n.error);if(n.roll.notes.some(v=>v.on))throw Error("Event-triggered notes need a fixed timeline before file rendering");
  const Offline=opts.Offline||globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw Error("Offline audio rendering is unavailable in this browser");
  const seconds=n.duration+releaseTail(n.roll),rate=renderRate(seconds),lead=Math.round(SOUND.lead*rate),frames=Math.ceil(seconds*rate),ctx=new Offline(2,frames+lead,rate);
  const bus=ctx.createGain();bus.gain.value=.6;bus.connect(ctx.destination);const t=createTransport(ctx,bus,opts.loadBuffer);
  try{check(opts.signal);if(opts.progress)opts.progress("Loading score recordings…");await t.warm(n.roll);check(opts.signal);if(opts.progress)opts.progress("Rendering the whole song…");await t.start({roll:n.roll,from:0,to:n.duration,seconds:n.duration,pitch:1,loop:false,fade:data.settings&&data.settings.fade||0,hardEnd:false});check(opts.signal);const buffer=await ctx.startRendering();check(opts.signal);return await wav(buffer,lead,frames,{...opts,credits:credits(data,opts.credits||CREDITS)});}finally{t.dispose();bus.disconnect();}
}
// A saved clip needs no score or instrument bank to download. Decode through the
// engine's authenticated audio door; realm-local PCM avoids cross-origin links.
export async function clipToWav(buffer,opts={}){
  check(opts.signal);const seconds=buffer.duration,rate=renderRate(seconds),frames=Math.ceil(seconds*rate),Offline=opts.Offline||globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
  if(!Offline)throw Error("WAV download is unavailable in this browser");
  const ctx=new Offline(2,frames,rate),source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);source.start(0);const out=await ctx.startRendering();source.disconnect();check(opts.signal);return wav(out,0,frames,opts);
}
