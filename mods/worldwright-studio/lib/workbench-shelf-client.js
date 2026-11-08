import * as INPUT from './asset-input-data.js';
// Browser-local navigation; the server sends only one bounded page of shelf references.
export function shelfMarkup(){return '<div id="wwa-shelf-layer" hidden data-interactive tabindex="-1"><section id="wwa-shelf" hidden role="dialog" aria-modal="true" data-interactive aria-label="Asset browser"><header class="wwa-bar"><strong>Choose asset</strong><span class="wwa-spacer"></span><button id="wwa-shelf-refresh">Refresh</button><button id="wwa-shelf-close" aria-label="Close asset picker">Close ×</button></header><div class="wwa-bar"><button id="wwa-shelf-library" aria-pressed="true">Asset Library</button><button id="wwa-shelf-world" aria-pressed="false">This world</button><button id="wwa-shelf-file-button">Choose file…</button><input id="wwa-shelf-file" type="file" hidden aria-label="Choose a compatible asset from your device"></div><div id="wwa-shelf-upload-status" role="status" aria-live="polite"></div><div class="wwa-bar"><input id="wwa-shelf-search" type="search" placeholder="Search name, tag or ID" aria-label="Search assets"><strong id="wwa-shelf-group"></strong></div><div id="wwa-shelf-info" role="status"></div><div id="wwa-shelf-rows"></div><footer class="wwa-bar"><button id="wwa-shelf-prev">← Previous</button><span id="wwa-shelf-page"></span><button id="wwa-shelf-next">Next →</button></footer></section></div>';}
export function createShelf(o){
 const {el,E,listen,state,status}=o;
 let timer=0,waitTimer=0,releaseTimer=0,last='',dead=false,fileSeq=0;
 const blocked=new Map(),uploads=new Map();
 const nav=()=>{const s=state();return s.shelf||(s.shelf={open:false,query:'',mode:'',page:0,source:'library',sequence:0,request:''});};
 const swallowing=()=>performance.now()<(nav().dismissUntil||0);
 function eat(e){if(!e)return;if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();}
 function block(){
  const root=el('wwa-dom');if(!root)return;
  root.classList.add('shelf-open');el('wwa-shelf-layer').hidden=false;
  for(const child of root.children){if(child===el('wwa-shelf-layer'))continue;if(!blocked.has(child))blocked.set(child,child.inert);child.inert=true;}
  // Inert protects pointer targeting; disabled also prevents a forwarded/programmatic file click.
  for(const input of root.querySelectorAll('input[type=file]')){if(el('wwa-shelf-layer')?.contains(input))continue;if(!uploads.has(input))uploads.set(input,input.disabled);input.disabled=true;}
 }
 function unblock(){
  el('wwa-dom')?.classList.remove('shelf-open');if(el('wwa-shelf-layer'))el('wwa-shelf-layer').hidden=true;
  for(const [node,prior]of blocked)node.inert=prior;blocked.clear();
  for(const [node,prior]of uploads)node.disabled=prior;uploads.clear();
 }
 function release(){
  clearTimeout(releaseTimer);if(dead||nav().open)return;
  if(swallowing()){block();releaseTimer=setTimeout(release,Math.max(1,nav().dismissUntil-performance.now()));return;}
  unblock();el('wwa-library')?.focus({preventScroll:true});
 }
 function waiting(){
  const n=nav(),rows=el('wwa-shelf-rows');rows.dataset.request=n.request;rows.dataset.reply=state().server.library?.request||'';
  el('wwa-shelf-info').textContent=n.source==='world'?'Reading this world’s assets…':'Reading Asset Library…';rows.setAttribute('aria-busy','true');rows.innerHTML='';
  el('wwa-shelf-prev').disabled=true;el('wwa-shelf-next').disabled=true;
  clearTimeout(waitTimer);
  waitTimer=setTimeout(()=>{if(dead||!nav().open)return;rows.removeAttribute('aria-busy');el('wwa-shelf-info').textContent='The library has not replied yet. Press Refresh to retry; your draft is safe.';},Math.max(1,o.waitMs-(performance.now()-(n.requestAt||performance.now()))));
 }
 function request(refresh=false){
  if(dead||!nav().open)return;
  const s=state(),n=nav();n.request=String(++n.sequence);n.requestAt=performance.now();last='';waiting();
  o.send({op:'shelf',cardId:s.server.cardId,query:n.query,mode:n.mode,source:n.source||'library',refresh,page:n.page,request:n.request});
 }
 function close(e){
  eat(e);clearTimeout(timer);clearTimeout(waitTimer);
  const n=nav();fileSeq++;n.uploading=false;n.open=false;n.dismissUntil=performance.now()+o.dismissMs;
  el('wwa-shelf').hidden=true;el('wwa-library')?.setAttribute('aria-expanded','false');
  // Keep a hit shield until this tap's compatibility click has finished, including across redraw.
  block();el('wwa-shelf-layer').focus({preventScroll:true});release();
 }
 function toggle(purpose){
  if(swallowing())return;
  const n=nav(),mode=purpose||state().data.mode;
  if(n.open){close();return;}
  if(n.mode!==mode){n.mode=mode;n.query='';n.page=0;last='';}
  n.source=n.source||'library';n.open=true;block();el('wwa-shelf').hidden=false;el('wwa-library')?.setAttribute('aria-expanded','true');
  if(el('wwa-shelf-group').textContent!==(o.groups[n.mode]?.label||'Asset Library'))el('wwa-shelf-group').textContent=o.groups[n.mode]?.label||'Asset Library';el('wwa-shelf-search').value=n.query;
  controls();request(true);el('wwa-shelf-search')?.focus();
 }
 function paint(force=false){
  const s=state(),n=nav(),r=s.server.library;if(!n.open)return;controls();
  block();el('wwa-shelf').hidden=false;el('wwa-library')?.setAttribute('aria-expanded','true');
  if(el('wwa-shelf-group').textContent!==(o.groups[n.mode]?.label||'Asset Library'))el('wwa-shelf-group').textContent=o.groups[n.mode]?.label||'Asset Library';
  const rows=el('wwa-shelf-rows');rows.dataset.request=n.request;rows.dataset.reply=r?.request||'';
  if(!r||r.mode!==n.mode||r.request!==n.request||(r.source||'library')!==(n.source||'library'))return;
  clearTimeout(waitTimer);const stamp=JSON.stringify(r)+':'+o.writable()+':'+!!n.uploading;if(last===stamp&&!force)return;last=stamp;
  el('wwa-shelf-info').textContent=r.error||(n.source==='world'?'This world · '+r.count+' assets in its scene and files · no library needed':!r.version?'Asset Library is not installed. Your saved references stay intact.':'Asset Library '+r.version+' · '+r.count+' matches · source shelf stays unchanged');
  el('wwa-shelf-page').textContent=(r.page+1)+' / '+r.pages;el('wwa-shelf-prev').disabled=!r.page;el('wwa-shelf-next').disabled=r.page+1>=r.pages;
  rows.removeAttribute('aria-busy');rows.innerHTML=r.rows.map((a,i)=>'<article class="'+(o.prefix||'wwa')+'-shelf-row">'+(/^\/?cdn\//.test(a.thumb)?'<img loading="lazy" alt="" src="'+E(a.thumb)+'">':'<span class="'+(o.prefix||'wwa')+'-shelf-icon">'+E(a.kind)+'</span>')+'<div><strong>'+E(a.name)+'</strong><small>'+E(a.note)+'</small><small title="'+E(a.path)+'">'+E(a.path)+'</small></div><button data-shelf-index="'+i+'" '+(!a.use||!o.writable()||n.uploading?'disabled':'')+'>'+(!a.use?'Unavailable':'Use')+'</button></article>').join('')||'<p class="'+(o.prefix||'wwa')+'-shelf-empty">'+(r.error?'Refresh to retry.':n.source==='world'?'No compatible assets found in the scene or files. Choose a file from your device.':r.version?'No matching assets. Try another search.':'Asset Library is optional. Choose This world or Choose file instead.')+'</p>';
 }
 function controls(){
  const n=nav(),world=n.source==='world',busy=!!n.uploading;
  for(const [id,on]of [['wwa-shelf-library',!world],['wwa-shelf-world',world]]){const b=el(id);if(b.getAttribute('aria-pressed')!==String(on))b.setAttribute('aria-pressed',String(on));b.disabled=busy;}
  const input=el('wwa-shelf-file'),accept=INPUT.accept(n.mode);if(input.accept!==accept)input.accept=accept;input.disabled=busy||!o.writable();el('wwa-shelf-file-button').disabled=input.disabled;
  const note=el('wwa-shelf-upload-status'),msg=n.fileMessage||'Choose a file from your device; the current draft stays open.';if(note.textContent!==msg)note.textContent=msg;
 }
 function fileMessage(message){nav().fileMessage=message;controls();}
 async function uploadFile(file){
  const n=nav();if(!file||dead||!n.open||n.uploading||!o.writable())return;
  const mode=n.mode,key=state().server.cardId,snapshot=o.fingerprint?.(),seq=++fileSeq;let dispatched=false;
  const valid=()=>!dead&&seq===fileSeq&&n.open&&n.mode===mode&&state().server.cardId===key&&o.writable()&&o.fingerprint?.()===snapshot;
  try{
   const spec=INPUT.fileSpec(file,mode);n.uploading=true;fileMessage('Uploading '+file.name+'…');paint(true);
   const upload=window.spawn?.assets?.upload;if(!upload)throw Error('File upload is unavailable here; your draft is unchanged');
   const result=await upload({blob:file,name:file.name,contentType:spec.contentType});
   if(!valid()){if(!dead&&n.open)fileMessage('Upload finished, but the editor changed. Your newer draft was kept.');return;}
   const row=INPUT.rowFor(result?.url,file.name,mode);n.uploading=false;fileMessage('File uploaded · opening in this editor');close();dispatched=true;await o.use(row);
  }catch(err){if(!dead&&(seq===fileSeq||dispatched)){fileMessage(String(err.message||err));status(String(err.message||err));}}
  finally{if(!dead&&seq===fileSeq){n.uploading=false;el('wwa-shelf-file').value='';paint(true);}}
 }
 for(const source of ['library','world'])listen(el('wwa-shelf-'+source),'click',()=>{if(nav().uploading)return;nav().source=source;nav().query='';nav().page=0;el('wwa-shelf-search').value='';controls();request(true);});
 listen(el('wwa-shelf-file-button'),'click',e=>{e.preventDefault();if(!o.writable()||nav().uploading)return;const input=el('wwa-shelf-file');input.value='';input.click();});
 listen(el('wwa-shelf-file'),'change',e=>{e.stopPropagation();uploadFile(e.target.files?.[0]);});
 const types=['pointerdown','pointerup','pointercancel','mousedown','mouseup','touchstart','touchend','touchcancel','click','dblclick','wheel'];
 for(const type of types){
  listen(el('wwa-dom'),type,e=>{if(swallowing()||nav().open&&!el('wwa-shelf-layer').contains(e.target))eat(e);},{capture:true,passive:false});
  listen(el('wwa-shelf-layer'),type,e=>e.stopPropagation());
 }
 listen(el('wwa-shelf-close'),'click',close);
 listen(el('wwa-shelf-refresh'),'click',()=>{clearTimeout(timer);request(true);});
 listen(el('wwa-shelf-search'),'input',()=>{const n=nav();n.query=el('wwa-shelf-search').value;n.page=0;clearTimeout(timer);timer=setTimeout(request,o.delay);});
 for(const [id,step]of [['wwa-shelf-prev',-1],['wwa-shelf-next',1]])listen(el(id),'click',()=>{nav().page=Math.max(0,nav().page+step);clearTimeout(timer);request();});
 listen(el('wwa-shelf'),'keydown',e=>{if(e.key==='Escape')close(e);});
 listen(el('wwa-shelf-rows'),'click',async e=>{
  const b=e.target.closest('[data-shelf-index]');if(!b||b.disabled)return;
  const r=state().server.library,n=nav();if(!r||r.mode!==n.mode||r.request!==n.request||(r.source||'library')!==(n.source||'library'))return;
  const row=r.rows[Number(b.dataset.shelfIndex)];if(!row?.use||!o.writable()||n.uploading)return;
  try{close(e);await o.use(row);}catch(err){status(err.message);}
 });
 // A realm/panel redraw restores the same transaction. It must NEVER launch another read.
 // Otherwise every reply redraws the panel, and each redraw hides the reply behind a new spinner.
 if(nav().open){
  if(!nav().mode)nav().mode=state().data.mode;
  el('wwa-shelf-search').value=nav().query;waiting();paint(true);
  if(!nav().request)request();
 }else if(swallowing()){block();release();}
 return {toggle,close,paint,dispose(){dead=true;fileSeq++;if(nav().uploading){nav().uploading=false;nav().fileMessage='The picker refreshed during upload; no draft was replaced. Choose the file again if needed.';}clearTimeout(timer);clearTimeout(waitTimer);clearTimeout(releaseTimer);unblock();}};
}
