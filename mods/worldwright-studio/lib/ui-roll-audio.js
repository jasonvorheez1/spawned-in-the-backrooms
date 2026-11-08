import { createTransport } from "./roll-transport.js";
import { normalize } from "./pianoroll.js";
// Mounted once per Studio tab. The instrument owns audio; the grid only asks it to play.
export function mount(getAudio) {
  if(window.__wwsRollSound)window.__wwsRollSound.dispose();
  const editor=window.__WWROLL;if(editor){editor.state.playRequest=(editor.state.playRequest||0)+1;editor.state.audioLoading=false;editor.state.audioPaused=null;editor.state.preview=0;editor.state.playback=null;}
  let transport=null,ctx=null,bus=null,warming=null,dead=false;
  function ensure(){if(!transport){const env=getAudio();ctx=env.context;if(!ctx)throw Error("Audio is unavailable on this device");bus=ctx.createGain();bus.gain.value=0.6;bus.connect(env.bus("Music"));transport=createTransport(ctx,bus,row=>env.buffer(row.ref||row.clip||row.url));}return transport;}
  function warm(data){try{const e=window.__WWROLL,n=normalize(data||(e&&e.state.data));if(n.error)return Promise.reject(Error(n.error));warming=ensure().warm(n.roll);warming.catch(()=>{warming=null;});return warming;}catch(e){return Promise.reject(e);}}
  const api={warm,async start(data,opts){const n=normalize(data);if(n.error)throw Error(n.error);const t=ensure();if(ctx.state==="suspended")ctx.resume().catch(()=>{});return t.start({roll:n.roll,from:opts.from||0,to:opts.to==null?n.duration:opts.to,seconds:(opts.to==null?n.duration:opts.to)-(opts.from||0),pitch:1,loop:false,fade:opts.fade||0,hardEnd:false,pageKey:opts.pageKey});},async append(data,key){const n=normalize(data);if(n.error)throw Error(n.error);return ensure().append(n.roll,key);},stop(){if(transport)transport.stop();},trigger(name){if(transport)transport.trigger(name);},pause(){if(transport)transport.pause();},resume(){return transport&&transport.resume();},dispose(){if(dead)return;dead=true;observer.disconnect();window.removeEventListener("pagehide",api.dispose);if(transport)transport.dispose();if(bus)bus.disconnect();if(window.__wwsRollSound===api)delete window.__wwsRollSound;}};
  const observer=new MutationObserver(()=>{if(document.getElementById("wwr-host")){if(!warming)warm().catch(()=>{});}else api.dispose();});observer.observe(document.body,{childList:true,subtree:true});
  window.__wwsRollSound=api;window.addEventListener("pagehide",api.dispose);if(document.getElementById("wwr-host"))warm().catch(()=>{});
  return api.dispose;
}
