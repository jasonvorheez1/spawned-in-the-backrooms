// One arrival/error surface for every metadata-selected editor. Never fall through to pages.
const EDITOR=require('lib/editor-registry.js'),SELECT=require('lib/editor-select.js');
const E=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function render(doc,selected,error){
 doc=doc||{};
 const session=doc.editorSession||doc.session||(doc.phase?doc:null);
 selected=session?.editor||selected;error=session?.phase==='error'?session.error||error:error;
 const mode=EDITOR.value(selected),name=mode?EDITOR.label(mode):session?.kind==='ambiguous'?'Automatic editor':'Card editor';
 return `<section class="ww-editor-arrival" style="display:flex;flex-direction:column;flex:1;min-height:0;padding:12px;gap:14px;background:var(--sb-center,#222527);color:var(--sb-ink,#e7e3db)" aria-busy="${!error}"><header style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" style="min-height:44px" onclick="sendAction('cardAct',{op:'backToFolder'})">‹ Back</button><strong>${E(name)} · ${E(doc.cardName)}</strong>${error&&mode&&doc.cardId?SELECT.render(doc,mode,'ww-arrival-editor',doc.pen?.mine===false):''}</header><div role="${error?'alert':'status'}"><h3>${error?'Could not open '+E(name):'Opening '+E(name)+'…'}</h3><p>${E(error||'Loading this card into its selected editor')}</p>${error?'<p>Your saved content is unchanged. Choose Prose / source in Metadata to inspect it, or go back.</p>':'<span class="kid-wheel" aria-hidden="true"></span>'}</div></section>`;
}
