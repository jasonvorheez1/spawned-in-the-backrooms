import { LABELS } from './editor-registry.js';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CSS='.ww-editor-select{display:inline-flex!important;flex-direction:row!important;align-items:center;gap:6px;max-width:100%;font-size:11px!important}.ww-editor-select select{min-width:0;max-width:180px;font:inherit!important;color:var(--sb-ink)!important;background:var(--sb-field)!important;border:1px solid var(--sb-line);border-radius:3px;min-height:32px;padding:5px 7px}.ww-editor-select select option{color:var(--sb-ink);background:var(--sb-field)}@media(pointer:coarse){.ww-editor-select select{min-height:44px}}';
export function render(doc,mode,id='ww-editor-choice',readOnly=false){
 const payload={op:'pageEditor',bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId};
 const change='event.stopImmediatePropagation();const value=this.value;this.value='+JSON.stringify(mode)+';if(value!=='+JSON.stringify(mode)+')window.sendAction("cardAct",{...'+JSON.stringify(payload)+',value});';
 return '<style>'+CSS+'</style><label class="ww-editor-select"><span>Editor</span><select id="'+E(id)+'" aria-label="Card editor" '+(readOnly?'disabled ':'')+'onchange="'+E(change)+'">'+Object.entries(LABELS).filter(([v])=>v!=='arrangement'||mode==='arrangement').filter(([v])=>doc.bookId!=='RESEARCH0BOOK'||v==='source').map(([v,n])=>'<option value="'+v+'"'+(mode===v?' selected':'')+'>'+E(n)+'</option>').join('')+'</select></label>';
}
