// Call in the press itself. A suspended browser must never hold preparation hostage.
export function wakeAudio(ctx){
 if(!ctx||ctx.state==='closed')throw Error('Audio is unavailable. Reopen the Studio tab.');
 if(ctx.state!=='running')Promise.resolve(ctx.resume()).catch(()=>{});
}
export async function audioReady(ctx,ms=1800){
 if(ctx.state==='running')return;
 await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);ctx.removeEventListener?.('statechange',changed);resolve();},changed=()=>{if(ctx.state==='running'||ctx.state==='closed')finish();},timer=setTimeout(finish,ms);ctx.addEventListener?.('statechange',changed);changed();});
 if(ctx.state!=='running')throw Error('Audio is paused by the browser. Preview is prepared — tap Play again to enable sound.');
}
