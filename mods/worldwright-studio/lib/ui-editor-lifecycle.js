// Browser-only editor mounting and keyboard ownership. Each operation retains its disposal contract.
// A DOM event handoff, not a timer: late modules and late editor markup meet here.
export function watchEditors(entries){
 if(typeof window==='undefined'||typeof document==='undefined')return null;
 window.__wwsEditorHost?.dispose();
 let frame=0,dead=false;const seen=new Map(),errors=[];
 function scan(){frame=0;if(dead)return;for(const entry of entries){const node=document.getElementById(entry.id);if(!node){seen.delete(entry.id);continue;}if(seen.get(entry.id)===node)continue;seen.set(entry.id,node);try{entry.mount();}catch(e){errors.push({editor:entry.id,message:String(e?.message||e)});if(errors.length>8)errors.shift();node.dataset.editorMountError=String(e?.message||e);}}}
 function schedule(){if(!dead&&!frame)frame=requestAnimationFrame(scan);}
 const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true});
 const host={scan,errors,dispose(){if(dead)return;dead=true;observer.disconnect();if(frame)cancelAnimationFrame(frame);window.removeEventListener('pagehide',host.dispose);if(window.__wwsEditorHost===host)delete window.__wwsEditorHost;}};
 window.__wwsEditorHost=host;window.addEventListener('pagehide',host.dispose);scan();return host;
}

// One keyboard owner for prose, piano and asset editors. The engine clears held movement on focus.
export const CODE = `(function(){
 if(window.__SBEDITORFOCUS){window.__SBEDITORFOCUS.sync();return;}
 let lastKey='';
 function root(){return document.querySelector('#sb-app[data-editor-key]');}
 function sync(){const r=root(),key=r&&r.dataset.editorKey||'';if(key===lastKey)return;lastKey=key;if(key&&!r.contains(document.activeElement))r.focus({preventScroll:true});}
 function down(e){const r=root();if(!r||!r.contains(e.target))return;const native=e.target.closest('input,textarea,select,[contenteditable],button,a,[tabindex]');if(!native||native===r)r.focus({preventScroll:true});}
 function key(e){const r=root();if(e.key==='Escape'&&r&&r.contains(document.activeElement)){document.activeElement.blur();}}
 const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);
 window.__SBEDITORFOCUS={sync,off(){observer.disconnect();document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key);delete window.__SBEDITORFOCUS;}};sync();
})();`;
