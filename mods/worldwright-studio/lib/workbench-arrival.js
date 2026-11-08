// Observe bytes anonymously; explicit confirmation asks the god-seat engine to preload the model.
export function modelAddress(source){
 const ref=String(source||'').trim();
 if(!/^\/?cdn\/[A-Za-z0-9_./%+@-]+\.(glb|png|jpe?g|webp)(?:\?[^\s]*)?$/i.test(ref)||ref.includes('..'))throw Error('Use a CDN model or source image');
 const at=ref.indexOf('?'),path=at<0?ref:ref.slice(0,at),query=at<0?'':ref.slice(at);
 return /\.glb$/i.test(path)?{path:ref,image:''}:{path:path+'.glb'+query,image:ref};
}
export function modelFacts(json){
 const nodes=json.nodes||[],meshes=json.meshes||[],skins=json.skins||[];
 let meshCount=0,rigCount=0;const joints=new Set();
 for(const n of nodes){const primitives=meshes[n.mesh]?.primitives||[];if(!primitives.some(p=>p.attributes?.POSITION!=null))continue;meshCount++;
  const skin=skins[n.skin];if(skin?.joints?.length&&primitives.some(p=>p.attributes?.JOINTS_0!=null&&p.attributes?.WEIGHTS_0!=null)&&skin.joints.every(i=>nodes[i])){rigCount++;for(const i of skin.joints)joints.add(i);}}
 return {meshes:meshCount,rigs:rigCount,joints:joints.size};
}
function delayOf(r,t){const raw=r.headers.get('Retry-After'),seconds=Number(raw);return Math.max(t.intervalMs,Number.isFinite(seconds)&&seconds>0?seconds*1000:0);}
async function prefix(response,t){
 const reader=response.body?.getReader();if(!reader)throw Error('Streaming model checks are unavailable in this browser');
 const out=new Uint8Array(t.jsonBytes+20);let used=0,needed=20;
 try{while(used<needed){const {value,done}=await reader.read();if(done)break;const n=Math.min(value.length,out.length-used);out.set(value.subarray(0,n),used);used+=n;
  if(used>=20){const d=new DataView(out.buffer);if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(16,true)!==0x4e4f534a)throw Error('The address is not serving a GLB model');
   if(d.getUint32(8,true)>t.modelBytes)throw Error('Model exceeds the editor size limit');needed=20+d.getUint32(12,true);if(needed>out.length)throw Error('Model metadata exceeds the editor limit');}}
  if(used<needed)throw Error('The model response is incomplete');return modelFacts(JSON.parse(new TextDecoder().decode(out.subarray(20,needed)).trim()));
 }finally{await reader.cancel().catch(()=>{});}
}
export async function peekModel(ref,signal,t,request=fetch){
 if(!/^\/?cdn\/[A-Za-z0-9_./%+@-]+\.glb(?:\?[^\s]*)?$/i.test(ref)||ref.includes('..'))throw Error('Use an original CDN GLB reference');
 const response=await request(ref.startsWith('/')?ref:'/'+ref,{signal,credentials:'omit',cache:'no-cache',headers:{Range:'bytes=0-'+(t.jsonBytes+19)}}),delay=delayOf(response,t),code=response.status;
 if(code!==200&&code!==206){await response.body?.cancel().catch(()=>{});
  if(code===202){const queued=response.headers.get('x-cook-state')==='quota'||Number(response.headers.get('x-cook-queue-ahead'))>0;return {pending:true,delay,message:queued?'Generation is queued':'Generation is in progress'};}
  if([401,403,404].includes(code))return {pending:true,delay,message:'The CDN has not returned this model yet (HTTP '+code+'). Your draft remains unchanged'};
  if(code===429||code>=500)return {pending:true,delay,message:'Asset host is busy; waiting for its retry window'};
  throw Error('Asset host returned '+code);
 }
 return {...await prefix(response,t),delay};
}
export function arrivalMarkup(){return '<section id="wwa-arrival" hidden aria-label="Model arrival" data-interactive></section>';}
export function createArrival(o){
 const {el,E,state,tune:t}=o;let timer=0,deadline=0,controller=null,dead=false,serial=0,last='';
 const current=()=>state().arrival,visible=()=>!document.hidden&&o.active();
 const isCurrent=(w,id)=>!dead&&current()===w&&serial===id;
 function paint(){const n=el('wwa-arrival'),w=current();if(!n)return;n.hidden=!w;if(!w)return;const reply=state().server?.modelRequest;if(w.requestId&&reply?.request===w.requestId&&!w.requestReceipt){w.requestReceipt=reply.status;if(reply.status==='error'){halt();w.phase='error';w.message=reply.message;}}
  const mark=JSON.stringify(w)+':'+o.writable();if(mark===last)return;last=mark;n.dataset.phase=w.phase;n.setAttribute('aria-busy',String(['checking','waiting','applying'].includes(w.phase)));
  const thumb=/^\/?cdn\/[\w./%+@-]+\.(png|jpe?g|webp)(?:\?[^\s]*)?$/i.test(w.row.thumb||'')&&!w.row.thumb.includes('..');
  n.innerHTML='<header><strong>'+E(w.row.name||'Model arrival')+'</strong><button data-arrival="cancel" aria-label="Dismiss model watcher">×</button></header>'+(thumb?'<img crossorigin="anonymous" src="'+E(w.row.thumb)+'" alt="Library preview — not proof of a finished model">':'')+'<div role="status"><b>'+E({checking:'Checking model…',confirm:'Request this model?',waiting:'Watching for model…',ready:'Model is available',applying:'Loading model…',done:w.requireRig?'Ready · joints detected':'Ready · mesh loaded',error:'Model check stopped',paused:'Still waiting'}[w.phase]||'Model arrival')+'</b><p>'+E(w.message||'Your current draft stays in place.')+'</p></div><footer>'+(['confirm','paused'].includes(w.phase)?'<button data-arrival="watch" class="primary">'+(!w.confirmed?'Request model':'Keep watching')+'</button>':'')+(w.phase==='ready'?'<button data-arrival="apply" class="primary" '+(!o.writable()?'disabled':'')+'>Use model</button>':'')+(w.phase==='error'?'<button data-arrival="retry">Retry check</button>':'')+(['confirm','checking','waiting','paused','ready','error'].includes(w.phase)?'<button data-arrival="cancel">'+(w.phase==='waiting'?'Stop watching':'Cancel')+'</button>':'')+'</footer>';
  const image=n.querySelector('img');if(image)image.onerror=()=>{image.hidden=true;};
 }
 function halt(){serial++;clearTimeout(timer);clearTimeout(deadline);controller?.abort();controller=null;}
 function cancel(){halt();state().arrival=null;last='';paint();}
 function schedule(w){clearTimeout(timer);if(dead||!visible()||!w.confirmed||!['checking','waiting'].includes(w.phase))return;timer=setTimeout(check,Math.max(1,(w.nextAt||0)-performance.now()));}
 async function apply(w){if(!w||!o.writable()||!visible())return;clearTimeout(timer);clearTimeout(deadline);controller?.abort();const c=new AbortController();controller=c;const timeout=setTimeout(()=>c.abort(),t.loadTimeoutMs);deadline=timeout;const id=++serial;w.phase='applying';w.message='Checking the loaded scene before replacing the draft…';paint();
  try{const result=await o.apply(w,()=>isCurrent(w,id)&&!c.signal.aborted,c.signal);if(!isCurrent(w,id))return;if(result?.deferred){w.phase='ready';w.message='Your draft changed or the editor is busy. Press Use model when ready.';}else{w.phase='done';w.message=w.requireRig?result.joints+' joints loaded. Save to keep this model in the card.':'Mesh loaded. Save to keep this model in the card.';}}
  catch(e){if(!isCurrent(w,id))return;w.phase='error';w.message=e.message+' · your previous source is safe.';}finally{clearTimeout(timeout);if(controller===c)controller=null;}paint();
 }
 async function check(){timer=0;const w=current();if(!w||dead||!visible())return;if(w.confirmed&&performance.now()-w.startedAt>t.maxWatchMs){w.phase='paused';w.message='No finished model yet. Keep watching to extend the wait; nothing was replaced.';paint();return;}
  clearTimeout(timer);const id=++serial;controller?.abort();controller=new AbortController();const c=controller;w.phase='checking';paint();const timeout=setTimeout(()=>c.abort(),t.requestTimeoutMs);deadline=timeout;
  try{const r=await peekModel(w.row.path,c.signal,t);clearTimeout(timeout);if(!isCurrent(w,id))return;w.failures=0;w.checkedAt=performance.now();w.nextAt=w.checkedAt+r.delay;
   const rigMissing=w.requireRig&&(!r.rigs||!r.joints),pending=r.pending||!r.meshes||rigMissing;
   if(pending){w.phase=w.confirmed?'waiting':'confirm';w.message=r.message||(rigMissing?'The model is present; waiting for a usable skeleton and joints.':'Waiting for actual mesh geometry.');if(!w.confirmed)w.message+=' Request model asks the engine to load or generate it; your draft stays in place.';paint();schedule(w);}
   else{w.phase='ready';w.message='Model bytes are available; the loaded scene is checked next.';paint();if(o.unchanged(w)&&o.writable())await apply(w);}
  }catch(e){if(!isCurrent(w,id))return;w.failures=(w.failures||0)+1;w.phase=w.confirmed&&w.failures<t.maxFailures?'waiting':'error';w.message=e.name==='AbortError'?'The asset check timed out. Your draft is unchanged.':e.message;w.nextAt=performance.now()+t.intervalMs;paint();schedule(w);}
  finally{clearTimeout(timeout);if(controller===c)controller=null;}
 }
 function select(row){const address=modelAddress(row.path);halt();const s=state();s.arrival={row:{path:address.path,name:row.name,thumb:row.thumb||address.image,kind:row.kind},sourceImage:address.image,requireRig:row.kind==='animation'||s.data.mode==='pose',mode:s.data.mode,original:o.fingerprint(),phase:address.image?'confirm':'checking',confirmed:false,startedAt:performance.now(),nextAt:0,message:address.image?'Request a 3D model from this image? Model address: '+address.path:'Reading the model, not its preview image…'};last='';paint();if(!address.image)return check();}
 function press(e){const b=e.target.closest('[data-arrival]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();const op=b.dataset.arrival,w=current();if(!w)return;
  if(op==='cancel')return cancel();if(op==='apply')return void apply(w);
  if(op==='watch'){if(!o.writable())return;if(!w.confirmed){w.requestId=String(performance.now())+'-'+String(serial);try{o.request?.(w);}catch(e){w.phase='error';w.message=e.message;paint();return;}}w.confirmed=true;w.startedAt=performance.now();w.phase='waiting';w.message='Request sent to the engine; waiting for model bytes. Nothing has been placed in the world.';paint();schedule(w);}else if(op==='retry'){if(performance.now()<(w.nextAt||0))return;w.failures=0;void check();}
 }
 const panel=el('wwa-arrival');panel.addEventListener('click',press);
 function visibility(){if(!visible()){halt();const w=current();if(w?.phase==='applying'){w.phase='ready';w.message='Download paused while the editor was hidden. Your draft is unchanged.';}else if(w?.phase==='checking'&&w.confirmed)w.phase='waiting';paint();return;}const w=current();if(w){if(w.phase==='checking'&&!w.confirmed)void check();else schedule(w);}}
 document.addEventListener('visibilitychange',visibility);paint();const w=current();if(w){if(w.phase==='checking'||w.phase==='applying'){w.phase=w.confirmed?'waiting':'checking';paint();}if(w.phase==='checking')timer=setTimeout(check,0);else schedule(w);}
 return {select,cancel,paint,dispose(){dead=true;halt();panel.removeEventListener('click',press);document.removeEventListener('visibilitychange',visibility);}};
}
