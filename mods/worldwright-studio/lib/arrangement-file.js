import { mixRoll } from './roll-offline-mix.js';
import { releaseTail } from './roll-transport.js';
import { wav } from './roll-file.js';
import { RENDER, renderRate } from './roll-render-data.js';
import { unpackSources } from './arrangement-wire.js';
export async function renderArrangement(source,opts={}){
 const roll=unpackSources(source.packed)[0]?.roll;if(!roll?.notes?.length)throw Error('The arrangement has no audible notes');
 const check=()=>{if(opts.signal?.aborted)throw Error('Render cancelled');},yieldUI=opts.yieldUI||(()=>new Promise(r=>setTimeout(r,0)));
 const seconds=roll.duration+releaseTail(roll),rate=renderRate(seconds),frames=Math.ceil(seconds*rate);
 if(frames*4+4096>RENDER.maxBytes)throw Error('This arrangement exceeds the WAV file limit. Shorten it or compile separate arrangements.');
 const Offline=opts.Offline||globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;if(!Offline)throw Error('Offline rendering is unavailable in this browser');
 const mixed=await mixRoll(roll,{...opts,Offline,rate,gain:.6,tail:releaseTail(roll),hardEnd:false,check,yieldUI});check();
 return await wav(mixed.buffer,Math.round(mixed.offset*rate),frames,{...opts,yieldUI,credits:source.credits});
}
