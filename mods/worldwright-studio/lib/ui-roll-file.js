import {saveBeforeRender,fileError} from './render-save.js';
import { renderFile, clipToWav } from "./roll-file.js";
import { filename, soundTag } from "./roll-render-data.js";
export function mount(getAudio){
  if(window.__wwsRollFiles)window.__wwsRollFiles.dispose();
  let replyStamp="";const mountId=(window.__wwsFileMountId=(window.__wwsFileMountId||0)+1);
  let dead=false,key="",serial=0,requestId="",lookupId="",busy=false,message="",record=null,local=null,objectUrl="",controller=null,voice=null,playToken=0,rendering=null,saving=false,saveGeneration=0;
  const editor=()=>window.__WWROLL,context=()=>{const e=editor(),s=e&&e.state&&e.state.server;return s&&s.open&&!s.loading&&s.data?s:null;},esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function send(op,id=requestId,extra={}){const s=context();if(s)sendAction("pianoRoll",{op,requestId:id,bookId:s.bookId,cardId:s.cardId,pageId:s.pageId,loadKey:s.loadKey,...extra});}
  function stop(){playToken++;if(voice){try{voice.stop();}catch(e){}voice.disconnect();voice=null;}draw();}
  function clearLocal(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl="";local=null;}
  function cancel(){saveGeneration++;saving=false;if(controller)controller.abort();controller=null;if(requestId)send("renderCancel");requestId="";busy=false;message="Render cancelled";draw();}
  function draw(){if(dead)return;const el=document.getElementById("wwr-filetools"),s=context();if(!el||!s)return;const e=editor(),dirty=e&&e.dirty(),button=(op,label,disabled=false)=>`<button type="button" data-file-op="${op}" ${disabled?"disabled":""}>${label}</button>`;
    const html=button("render",saving?"Saving…":busy?"Rendering…":dirty?"Save & Render":"Render WAV",saving||busy||!!rendering||s.busy||s.readOnly)+(busy?button("cancel","Cancel"):"")+button("play",voice?"Playing file…":"▶ Play file",!record&&!local||busy||!!voice)+button("stop","■",!voice)+button("download","Download WAV",!record&&!local||busy)+button("copy","Copy sound tag",!record||busy)+button("remove","Remove render",!record&&!local||busy||saving||s.readOnly)+`<span role="status">${esc(message||(dirty?"Save & Render verifies your changes, then renders the whole song":record?"Attached: "+record.name+" · "+Math.round(record.duration)+"s · "+record.notes+" notes":"Render attaches a WAV to this score · Download saves to your device"))}</span>`;
    if(el.__wwsFileHTML!==html||!el.querySelector("[data-file-op]")){el.__wwsFileHTML=html;el.innerHTML=html;}
  }
  async function begin(){let s=context();const e=editor();if(!s||busy||rendering||saving||s.busy||s.readOnly)return;
    if(e.dirty()){saving=true;const mine=++saveGeneration;message='Saving and verifying before rendering…';draw();try{s=await saveBeforeRender(e,context,()=>!dead&&mine===saveGeneration);if(dead||mine!==saveGeneration)return;}catch(err){if(!dead&&mine===saveGeneration){saving=false;message=fileError(err);draw();}return;}saving=false;}
    stop();window.__wwsRollSound?.stop();busy=true;message='Reading saved notes and instruments…';requestId='file:'+mountId+':'+s.loadKey+':'+(++serial);send('renderPrepare');draw();}
  function remove(){const s=context();if(!s||s.readOnly||s.busy||busy||saving)return;stop();clearLocal();if(!record){message='Local render removed · score kept';draw();return;}busy=true;requestId='remove:'+mountId+':'+s.loadKey+':'+(++serial);message='Removing the render, not the score…';send('renderRemove',requestId,{url:record.url});draw();}
  async function onEvent(name,p){if(name!=="wws-roll-file"||dead||!p)return;const s=context();if(!s||p.bookId!==s.bookId||p.cardId!==s.cardId||p.pageId!==s.pageId||p.loadKey!==s.loadKey)return;
    if(p.kind==="record"&&p.requestId===lookupId){if(!busy&&!local){record=p.record;draw();}return;}
    if(p.requestId!==requestId)return;
    if(p.kind==="removed"){clearLocal();record=null;busy=false;message="Render removed · score kept · Render WAV makes a fresh file";draw();return;}
    if(p.kind==="error"){busy=false;message=p.message+(local?" · WAV available with Download":"");draw();return;}
    if(p.kind==="ready"){if(p.reused)clearLocal();record=p.record;busy=false;message=p.reused?"Score unchanged — using the existing audio file":"WAV attached to this score · Download WAV saves a copy to your device";draw();return;}
    if(p.kind!=="source"||rendering)return;
    send("renderReceipt",p.requestId);
    const req=requestId,currentKey=key,abort=new AbortController();controller=abort;
    const valid=()=>!dead&&!abort.signal.aborted&&requestId===req&&key===currentKey;
    rendering=true;(async()=>{try{
      const env=getAudio(),out=await renderFile(p.source.packed,{signal:abort.signal,loadBuffer:row=>env.buffer(row.ref),yieldUI:()=>new Promise(resolve=>window.requestAnimationFrame(resolve)),progress:text=>{if(valid()){message=text;draw();}}});if(!valid())return;
      clearLocal();record=null;local={...out,name:filename(p.source.title)};objectUrl=URL.createObjectURL(out.blob);message="Uploading "+(out.rate/1000)+" kHz stereo WAV…";draw();
      const uploaded=await window.spawn.assets.upload({blob:out.blob,name:local.name,contentType:"audio/wav"});if(!valid())return;
      message="Saving the file link to this card…";send("renderFinish",req,{url:uploaded.url});draw();
    }catch(e){if(valid()){busy=false;message=(local?"WAV ready; upload failed — Download still works. ":"")+fileError(e);draw();}}finally{rendering=null;if(valid())controller=null;draw();}})();
  }
  async function play(){if(!local&&!record)return;stop();if(window.__wwsRollSound)window.__wwsRollSound.stop();const token=playToken,env=getAudio();if(env.context.state==="suspended")env.context.resume().catch(()=>{});message="Loading one audio file…";draw();try{const buffer=local?await env.context.decodeAudioData(await local.blob.arrayBuffer()):await env.buffer(record.url);if(dead||token!==playToken)return;const v=env.context.createBufferSource();v.buffer=buffer;v.connect(env.bus("Music"));voice=v;v.onended=()=>{v.disconnect();if(voice===v){voice=null;message="File playback finished";draw();}};v.start();message="Playing one rendered audio file";draw();}catch(e){if(token===playToken){message=fileError(e);draw();}}}
  async function download(){
    if(!objectUrl){if(!record||busy)return;const mine=key,abort=new AbortController();controller=abort;busy=true;message="Preparing WAV download…";draw();
      try{const buffer=await getAudio().buffer(record.url);if(dead||key!==mine||abort.signal.aborted)return;const out=await clipToWav(buffer,{signal:abort.signal,yieldUI:()=>new Promise(r=>window.requestAnimationFrame(r)),progress:t=>{if(!dead&&key===mine&&!abort.signal.aborted){message=t;draw();}}});if(dead||key!==mine||abort.signal.aborted)return;local={...out,name:filename(record.name.replace(/\.(wav|mp3|ogg|flac)$/i,""))};objectUrl=URL.createObjectURL(out.blob);message="WAV ready — Download WAV saves it to your device";}
      catch(e){if(!dead&&key===mine&&!abort.signal.aborted)message=fileError(e);}
      finally{if(key===mine&&controller===abort){busy=false;controller=null;draw();}}
    }
    if(!objectUrl||dead)return;const a=document.createElement("a");a.href=objectUrl;a.download=local.name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
  }

  function copy(){if(!record)return;const box=document.createElement("textarea");box.value=soundTag(record);document.body.appendChild(box);box.select();let ok=false;try{ok=document.execCommand("copy");}catch(e){}box.remove();message=ok?"One-file sound tag copied":soundTag(record);draw();}
  function click(e){const b=e.target.closest&&e.target.closest("#wwr-filetools [data-file-op]");if(!b||b.disabled)return;e.stopPropagation();const op=b.dataset.fileOp;if(op==="render")begin();else if(op==="cancel")cancel();else if(op==="play")play();else if(op==="stop")stop();else if(op==="download")download();else if(op==="copy")copy();else if(op==="remove")remove();}
  function sync(){if(dead)return;if(!document.getElementById("wwr-host")){api.dispose();return;}const s=context();if(!s){if(controller)controller.abort();controller=null;stop();clearLocal();record=null;requestId="";busy=false;key="";return;}const cardKey=s.bookId+"/"+s.cardId,next=cardKey+"/"+s.pageId+"/"+s.loadKey;if(next!==key){if(controller)controller.abort();stop();clearLocal();busy=false;requestId="";record=s.fileCardKey===cardKey?s.fileRecord||null:null;key=next;message="";lookupId="lookup:"+mountId+":"+s.loadKey+":"+(++serial);if(s.fileCardKey!==cardKey)send("renderLookup",lookupId);}if(s.fileCardKey===cardKey&&s.fileRecord&&!record&&!busy&&!local)record=s.fileRecord;const r=s.fileReply,stamp=r&&r.requestId+":"+r.kind;if(r&&stamp!==replyStamp){replyStamp=stamp;onEvent("wws-roll-file",r);}draw();}
  const unsub=window.spawn.on("event",onEvent),observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener("click",click,true);
  const api={stop,refresh:sync,dispose(){if(dead)return;saveGeneration++;saving=false;dead=true;if(controller)controller.abort();if(requestId)send("renderCancel");stop();clearLocal();observer.disconnect();unsub();document.removeEventListener("click",click,true);window.removeEventListener("pagehide",api.dispose);if(window.__wwsRollFiles===api)delete window.__wwsRollFiles;}};
  window.__wwsRollFiles=api;window.addEventListener("pagehide",api.dispose);sync();return api.dispose;
}
