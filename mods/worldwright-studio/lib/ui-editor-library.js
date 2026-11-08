import {shelfMarkup,createShelf} from './workbench-shelf-client.js';
import {CSS} from './workbench-shelf-style.js';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VERSION=4;
export function mount(tune){
 if(window.__WWEditorLibrary?.version===VERSION)return window.__WWEditorLibrary;
 window.__WWEditorLibrary?.dispose();
 const D=document;let picker=null,outlet=null,root=null,options=null,s=null,serial=0,dead=false,scheduled=false,context='',removers=[];
 const read=()=>{try{return JSON.parse(D.getElementById('wws-library-data')?.textContent||'{}');}catch(e){return {};}};
 const live=()=>!dead&&read().context===context&&options?.live?.()!==false;
 const el=id=>id==='wwa-dom'?root:id==='wwa-library'?outlet?.querySelector('[data-library-return]'):D.getElementById(id.replace('wwa-','wwl-'));
 const listen=(n,type,fn,opts)=>{n?.addEventListener(type,fn,opts);removers.push(()=>n?.removeEventListener(type,fn,opts));};
 function clear(){picker?.dispose();picker=null;for(const off of removers)off();removers=[];outlet?.remove();outlet=null;}
 function open(o){
  if(dead)return;clear();const data=read();if(!data.context)return;
  root=D.getElementById('sb-app');if(!root)return;options=o;context=data.context;
  s={data:{mode:o.mode},server:{cardId:data.cardId},shelf:{open:false,query:'',mode:o.mode,page:0,sequence:++serial*100000,request:''}};
  attach();picker.toggle(o.mode);
 }
 function attach(){
  root=D.getElementById('sb-app');const o=options;
  outlet=D.createElement('div');outlet.id='wwl-outlet';outlet.setAttribute('data-interactive','');outlet.style.pointerEvents='none';
  outlet.innerHTML='<style>'+CSS.replaceAll('wwa','wwl')+`#wwl-outlet [hidden]{display:none!important}#wwl-outlet{font:inherit;font-size:12px;color:var(--sb-ink,#e7e3db)}#wwl-shelf-layer{position:fixed;inset:0;z-index:1000;background:#0004}#wwl-shelf{inset:58px max(76px,calc(var(--spawn-chrome-reservation-right-inset,50px) + 20px)) 32px 12px;max-width:900px;margin-left:auto;margin-right:auto}#wwl-outlet .wwl-bar{display:flex;align-items:center;gap:8px;padding:8px;flex-wrap:wrap}#wwl-outlet button,#wwl-outlet input{font:inherit;color:inherit;background:var(--sb-field,#1c2325);border:1px solid var(--sb-line,#46515a);min-height:40px;padding:6px;max-width:100%;box-sizing:border-box}#wwl-outlet button:disabled{opacity:.45}#wwl-outlet button{cursor:pointer}#wwl-outlet .wwl-spacer{flex:1}@media(pointer:coarse){#wwl-outlet button,#wwl-outlet input{min-height:44px}}`+'</style><span data-library-return tabindex="-1"></span>'+shelfMarkup().replaceAll('wwa','wwl');
  const theme=getComputedStyle(root);for(let i=0;i<theme.length;i++){const k=theme[i];if(k.startsWith('--sb-')||k.startsWith('--spawn-chrome-'))outlet.style.setProperty(k,theme.getPropertyValue(k));}outlet.style.font=theme.font;
  D.body.appendChild(outlet);el('wwa-shelf-layer').setAttribute('data-holds-keyboard','');
  picker=createShelf({prefix:'wwl',el,E,listen,state:()=>s,status:msg=>options?.status?.(msg),groups:tune.shelfGroups,delay:tune.shelfSearchDelayMs,waitMs:tune.shelfReplyTimeoutMs,dismissMs:tune.shelfDismissGuardMs,
   writable:()=>live()&&o.writable(),fingerprint:()=>o.fingerprint?.(),send:p=>window.sendAction('editorLibrary',{...p,context}),
   use:async row=>{if(!live()||!o.writable())throw Error('The editor changed; your draft was kept');await o.use(row);}});
 }
 function sync(){scheduled=false;if(dead||!picker)return;if(!live()){clear();options?.status?.('The editor changed; Asset Library closed without changing the draft');return;}const r=read().library;if(r?.context===context)s.server.library=r;if(root!==D.getElementById('sb-app')||!outlet?.isConnected){clear();attach();}picker.paint();}
 const observer=new MutationObserver(()=>{if(scheduled||dead)return;scheduled=true;queueMicrotask(sync);});observer.observe(D.body,{subtree:true,childList:true,characterData:true});
 function key(e){if(!s?.shelf.open)return;if(e.key==='Escape'){e.preventDefault();picker.close(e);}e.stopImmediatePropagation();}
 D.addEventListener('keydown',key,true);
 function source(){
  const selected=D.activeElement?.matches('textarea[data-page-field]')?D.activeElement:D.getElementById('sb-raw-body');
  const id=selected?.id,page=selected?.dataset.pageId,baseline=selected?.value,start=selected?.selectionStart??0,end=selected?.selectionEnd??start;
  let inserted=false;
  const target=()=>D.getElementById(id),writable=()=>{const n=target();return !!n&&n.dataset.pageId===page&&!n.readOnly&&!n.disabled;};
  const status=message=>{const n=D.getElementById('sb-save-chip');if(n)n.textContent=message;};
  open({mode:'source',writable,fingerprint:()=>target()?.value,live:()=>!!target()&&target().dataset.pageId===page,status,use:row=>{
   const n=target();if(!writable()||n.value!==baseline)throw Error('The page changed; the reference was not inserted');
   const token=row.id||row.path;if(!token||/[\[\]\r\n]/.test(token))throw Error('This asset has no safe reference identifier');
   const text='#[asset: '+token+']';n.setRangeText(text,start,end,'end');n.dispatchEvent(new Event('input',{bubbles:true}));
   inserted=n.value!==baseline;status(inserted?'Asset reference inserted · Save page to keep it':'The reference did not fit; the page was kept');
  }});
 }
 const api={version:VERSION,open,source,state:()=>s,dispose(){if(dead)return;dead=true;clear();observer.disconnect();D.removeEventListener('keydown',key,true);window.removeEventListener('pagehide',api.dispose);if(window.__WWEditorLibrary===api)delete window.__WWEditorLibrary;}};
 window.__WWEditorLibrary=api;window.addEventListener('pagehide',api.dispose);return api;
}
