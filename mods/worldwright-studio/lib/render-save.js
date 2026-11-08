// Shared by the two file toolbars. A render may follow only its own save receipt.
export function saveBeforeRender(editor,context,valid){
 const original=context(),key=s=>[s?.bookId,s?.folderId,s?.pageId,s?.loadKey].join('/');
 const originalKey=key(original),originalCard=original?.cardId;
 if(!original||!editor?.saveForLeave)return Promise.reject(Error('Reopen this editor before saving'));
 return new Promise((resolve,reject)=>{
  let settled=false;const timer=setTimeout(()=>finish({ok:false,error:'Save did not confirm. Your draft is kept; retry after the save finishes.'}),30000);
  function finish(reply){if(settled)return;settled=true;clearTimeout(timer);const now=context();
   if(!valid()||!now||key(now)!==originalKey||originalCard&&now.cardId!==originalCard){reject(Error('Editor changed; compilation cancelled'));return;}
   if(!reply?.ok){reject(Error(reply?.error||'Save failed; draft kept'));return;}
   if(editor.dirty()||!now.cardId){reject(Error('There are newer unsaved changes; press Save & Compile again'));return;}
   resolve(now);
  }
  try{editor.saveForLeave(finish);}catch(e){finish({ok:false,error:e.message});}
 });
}
export function fileError(e){const s=String(e?.message||e);return /33554432|relay cap/i.test(s)?'This older WAV exceeds the playback size limit. Remove render, then compile again; new WAVs fit the limit.':s;}
