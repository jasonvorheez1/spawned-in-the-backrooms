const CHOICE=require('lib/editor-registry.js');
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function run(api,target,task){
 api=api.editorRoot||api;const ui=api.getState().ui||{},prior=ui.editorSwitch||{};
 const token={seq:(prior.seq||0)+1,bookId:target.bookId||ui.cards?.pageDoc?.bookId,cardId:target.cardId||ui.cards?.pageDoc?.cardId,editor:target.editor||'',pending:true,message:'Opening '+(CHOICE.label(target.editor)||'linked file')+'…',error:'',choices:[]};
 const patch=value=>{const now=api.getState().ui||{};api.patchState({ui:{...now,editorSwitch:value}});};patch(token);
 try{
  const result=await task(),now=api.getState().ui||{};
  if(now.editorSwitch?.seq===token.seq){const w=now.workbench||{},error=now.editorSession?.phase==='error'?now.editorSession.error:'';patch({...token,pending:false,error,message:error?'Could not open '+CHOICE.label(target.editor):w.linkNotice||'',choices:w.linkChoices||[],source:w.linkChoiceSource});}
  return result;
 }catch(e){if(api.getState().ui?.editorSwitch?.seq===token.seq)patch({...token,pending:false,message:'Could not open '+CHOICE.label(target.editor),error:String(e.message||e)});throw e;}
}
export function render(ui){
 const s=ui.editorSwitch||{},doc=ui.cards?.pageDoc,show=doc&&doc.bookId===s.bookId&&doc.cardId===s.cardId&&(s.pending||s.error||s.message),source=s.source||{};
 return `<style>#ww-editor-switch{flex-shrink:0;padding:10px 12px;background:var(--sb-panel,#2a2e2f);color:var(--sb-ink,#e7e3db);border-bottom:2px solid var(--sb-accent,#d9b879);font-size:13px;line-height:1.4}#ww-editor-switch[hidden]{display:none}#ww-editor-switch[aria-busy=true]::before{content:'';display:inline-block;width:12px;height:12px;margin-right:8px;border:2px solid var(--sb-line,#464b4b);border-top-color:var(--sb-accent,#d9b879);border-radius:50%;animation:ww-editor-switch-spin .8s linear infinite}#ww-editor-switch button{min-height:44px;margin:6px 6px 0 0}@keyframes ww-editor-switch-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#ww-editor-switch::before{animation:none!important}}</style><div id="ww-editor-switch" role="${s.error?'alert':'status'}" aria-live="polite" aria-busy="${!!s.pending}" ${show?'':'hidden'}>${E(s.message||'')}${s.error?'<br>'+E(s.error):''}${(s.choices||[]).map(c=>'<button type="button" onclick="'+E('sendAction("studioWorkspace",'+JSON.stringify({...source,op:'linked',tag:c.tag||'#['+c.cardId+']'})+')')+'">'+E(c.name||CHOICE.label(c.editor))+'</button>').join('')}</div>`;
}
