import {peekModel} from './workbench-arrival.js';
const T={intervalMs:2500,jsonBytes:2000000,modelBytes:30000000,requestTimeoutMs:12000,maxWatchMs:90000};
// Ephemeral UI state only. No model address is fetched before an explicit confirmation.
export function createPreview(o){
 let w=null,timer=0,controller=null,serial=0,dead=false;
 const current=(a,s)=>!dead&&w===a&&serial===s&&o.active()&&o.identity()===a.identity&&o.item(a.id)?.ref===a.path;
 function halt(){serial++;clearTimeout(timer);timer=0;controller?.abort();controller=null;}
 function paint(){const panel=o.el('wwl-preview-panel');if(!panel)return;const n=o.selected();if(!n||n.kind!=='model')return;const a=w?.id===n.id?w:null,button=(op,label)=>'<button type="button" data-ll="preview:'+op+'">'+label+'</button>';let text='Original materials and source reference stay unchanged.',buttons=button('open','Preview / request model');
  if(a){text=a.message;buttons=button('cancel','Cancel watcher');if(a.phase==='confirm')buttons=button('confirm','Confirm preview / request')+buttons;if(['error','paused'].includes(a.phase))buttons=button('open','Retry preview')+buttons;if(a.phase==='ready')buttons=button('load','Load preview')+buttons;if(a.phase==='done')buttons=button('open','Reload preview');}
  const html='<p class="ll-note" role="status">'+o.E(text)+'</p><div class="ll-actions">'+buttons+'</div>';if(panel.innerHTML!==html)panel.innerHTML=html;panel.dataset.phase=a?.phase||'idle';panel.setAttribute('aria-busy',String(['requesting','waiting','checking','loading'].includes(a?.phase)));
 }
 function cancel(){if(w)o.cancelLoad(w.id);halt();w=null;paint();}
 function fail(a,text){halt();a.phase='error';a.message=text+' Your source and layout are retained.';paint();}
 function schedule(a,delay=T.intervalMs){clearTimeout(timer);if(!dead&&w===a)timer=setTimeout(()=>check(a),delay);}
 async function check(a){if(!current(a,serial))return;if(document.hidden){a.phase='paused';a.message='Preview paused while hidden. Retry when ready.';paint();return;}if(performance.now()-a.started>T.maxWatchMs){a.phase='paused';a.message='No finished model within 90 seconds. Retry to request again; nothing was placed.';paint();return;}
  const s=++serial,c=new AbortController();controller=c;a.phase='checking';a.message='Checking the explicitly requested model…';paint();const timeout=setTimeout(()=>c.abort(),T.requestTimeoutMs);
  try{const result=await peekModel(a.path,c.signal,T);if(!current(a,s))return;if(result.pending||!result.meshes){a.phase='waiting';a.message=(result.message||'Waiting for actual mesh geometry')+' · cancel stops this editor’s watcher, not an already submitted generation.';paint();schedule(a,result.delay);}
   else{a.phase='ready';a.message='Model bytes are available. Loading an unchanged private preview…';paint();load(a);}}
  catch(e){if(current(a,s))fail(a,e.name==='AbortError'?'Model check timed out.':e.message);}
  finally{clearTimeout(timeout);if(controller===c)controller=null;}
 }
 function load(a){if(!current(a,serial))return;if(!o.load(a.id)){a.phase='ready';a.message='Viewer is still loading or unavailable. Load preview when it is ready.';paint();return;}a.phase='loading';a.message='Loading original mesh and materials into this private canvas…';paint();}
 function sync(){if(w&&(!o.active()||w.identity!==o.identity()||o.item(w.id)?.ref!==w.path)){cancel();return;}const a=w;if(a){const reply=o.server().modelRequest;if(a.phase==='requesting'&&reply?.request===a.request&&reply.path===a.path){clearTimeout(timer);if(reply.status==='error')return fail(a,reply.message||'Model request was refused.');if(reply.status==='requested'){a.phase='waiting';a.message=reply.message||'Request submitted; waiting for model bytes.';schedule(a,1);}}
   if(a.phase==='loading'){const status=o.modelStatus(a.id);if(status?.startsWith('Loaded')){a.phase='done';a.message=status+' · preview only, document unchanged.';}else if(status?.startsWith('Placeholder'))return fail(a,status);}}
  paint();
 }
 function press(op){if(op==='cancel')return cancel();const n=o.selected();if(!n||n.kind!=='model')return;if(op==='open'){cancel();w={identity:o.identity(),id:n.id,path:n.ref,phase:'confirm',message:'Preview this source? Confirm asks the engine to load or generate it and may spend the asset budget if it is not ready. No world object will be placed. Cancel cannot undo a submitted generation.'};paint();return;}
  const a=w;if(!a||a.id!==n.id)return;if(op==='confirm'){if(!o.writable()){a.phase='error';a.message='This card is read-only. Model generation was not requested.';paint();return;}halt();a.request='level-'+crypto.randomUUID();a.started=performance.now();a.phase='requesting';a.message='Request sent. Waiting for the engine acknowledgement…';o.request({op:'requestModel',mode:'level',cardId:o.server().cardId,path:a.path,request:a.request});paint();timer=setTimeout(()=>{if(w===a&&a.phase==='requesting')fail(a,'The engine did not acknowledge this request.');},T.requestTimeoutMs);}else if(op==='load'&&a.phase==='ready')load(a);
 }
 function visibility(){if(document.hidden&&w&&['requesting','waiting','checking','loading'].includes(w.phase)){o.cancelLoad(w.id);halt();w.phase='paused';w.message='Preview paused while hidden. Retry when ready; the layout was not changed.';paint();}}
 document.addEventListener('visibilitychange',visibility);
 return {press,sync,paint,cancel,state:()=>w?{...w}:null,dispose(){cancel();dead=true;document.removeEventListener('visibilitychange',visibility);}};
}
