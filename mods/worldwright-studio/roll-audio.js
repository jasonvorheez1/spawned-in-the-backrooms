import { createTransport } from "./lib/roll-transport.js";
// Scene/player lane. Same recorded instrument as private editor previews, through the engine voice/bus/spatial chain.
export function setup({ctx,out,params,paused}) {
  const transport=createTransport(ctx,out,async row=>{const response=await fetch(row.url);if(!response.ok)throw Error("Piano recording "+row.note+": HTTP "+response.status);return ctx.decodeAudioData(await response.arrayBuffer());});
  let key="",held=false,dead=false;
  function fault(e){if(!dead)console.error("[Worldwright piano] "+String(e&&e.message||e));}
  function update(p,isPaused){const next=JSON.stringify(p);if(next!==key){key=next;transport.stop();if(p.roll&&!isPaused)transport.start({...p,catchUp:true}).catch(fault);held=!!isPaused;return;}if(isPaused&&!held)transport.pause();else if(!isPaused&&held){if(!transport.resume()&&p.roll)transport.start({...p,catchUp:true}).catch(fault);}held=!!isPaused;}
  update(params,paused);return {update,dispose(){dead=true;transport.dispose();}};
}
