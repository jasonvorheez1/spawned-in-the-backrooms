// Event-bound revision checks. No timers, interval, SQL or extra DOM observer.
// The existing editor-host scan calls mount as the studio markup arrives.
export function mount(){
 if(typeof window==='undefined'||typeof document==='undefined')return;
 const marker=document.getElementById('wws-data-watch');
 let data;try{data=JSON.parse(marker?.textContent||'{}');}catch(_){return;}
 let watcher=window.__wwsDataWatch;
 if(!watcher){
  let lastBook='',lastSent=-Infinity;
  const check=(reason)=>{
   const node=document.getElementById('wws-data-watch');let next;
   try{next=JSON.parse(node?.textContent||'{}');}catch(_){return;}
   if(!next.bookId||next.booting||document.visibilityState==='hidden')return;
   const now=performance.now();
   if(next.bookId===lastBook&&now-lastSent<1000)return;
   if(typeof sendAction!=='function')return;
   lastBook=next.bookId;lastSent=now;
   sendAction('repositoryCheck',{bookId:next.bookId,reason});
  };
  const focus=()=>check('focus');
  const visible=()=>{if(document.visibilityState!=='hidden')check('visible');};
  const resume=()=>check('resume');
  watcher={book:'',ready:false,check,dispose(){window.removeEventListener('focus',focus);window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pagehide',watcher.dispose);if(window.__wwsDataWatch===watcher)delete window.__wwsDataWatch;}};
  window.__wwsDataWatch=watcher;
  window.addEventListener('focus',focus);window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',visible);window.addEventListener('pagehide',watcher.dispose);
 }
 if(data.bookId&&!data.booting&&(watcher.book!==data.bookId||!watcher.ready))watcher.check('open');
 watcher.book=data.bookId||'';watcher.ready=!data.booting;
}
