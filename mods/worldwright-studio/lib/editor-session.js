// One generation fences both opening replies and adapter save acknowledgements.
export const FIELDS=['bookId','cardId','pageId','editor','kind','phase','generation','error'];
export const PHASES=['loading','ready','error','closed'];
export function state(api){return (api.editorRoot||api).getState().ui?.editorSession||{bookId:'',cardId:'',pageId:'',editor:'',kind:'',phase:'closed',generation:0,error:''};}
function write(api,s){const root=api.editorRoot||api,ui=root.getState().ui||{};root.patchState({ui:{...ui,editorSession:s}});return s;}
export function same(api,token){return !!token&&state(api).generation===token.generation;}
export function current(api,token){return same(api,token)&&state(api).phase!=='closed';}
export function begin(api,target){return write(api,{bookId:String(target.bookId||''),cardId:String(target.cardId||''),pageId:String(target.pageId||''),editor:target.editor||'',kind:target.kind||'',phase:'loading',generation:state(api).generation+1,error:''});}
export function turnPage(api){const s=state(api);if(s.phase!=='ready'||s.editor!=='source')return null;return write(api,{...s,generation:s.generation+1,error:''});}
export function select(api,token,destination){if(!current(api,token))return false;return write(api,{...state(api),editor:destination.editor||'',kind:destination.kind||'',error:destination.error||''});}
export function ready(api,token,identity){if(!current(api,token))return false;const s=state(api);return write(api,{...s,cardId:String(identity?.cardId??s.cardId),pageId:String(identity?.pageId??s.pageId),phase:'ready',error:''});}
export function fail(api,token,error){if(!current(api,token))return false;return write(api,{...state(api),phase:'error',error:String(error?.message||error||'Could not open this document')});}
export function closed(previous){return {...previous,phase:'closed',generation:(previous.generation||0)+1,error:''};}
export function close(api){return write(api,closed(state(api)));}
export function scope(api,token=state(api),allowClosed=false){
 const root=api.editorRoot||api,check=()=>same(root,token)&&(allowClosed||current(root,token));
 // Engine handles expose capabilities through getters/proxies, not enumerable fields.
 const scoped={editorRoot:root,editorGeneration:token.generation,editorCurrent:check,
  getState:()=>{const s=root.getState();if(check())return s;const ui=s.ui||{};return {...s,ui:{...ui,cards:{...ui.cards,view:'folder',card:null,pageDoc:null},pianoRoll:{...ui.pianoRoll,open:false,loading:false},workbench:{...ui.workbench,open:false},arrangement:{...ui.arrangement,open:false,loading:false}}};},
  patchState:delta=>{if(!check())return;const session=state(root);if(!delta.ui)return root.patchState(delta);
   const doc=delta.ui.cards?.pageDoc,arr=delta.ui.arrangement;
   const identity=session.phase!=='ready'?{}:session.editor==='arrangement'&&arr?.open?{cardId:arr.cardId||session.cardId,pageId:arr.pages?.[0]?.id||''}:doc?.bookId===session.bookId&&doc?.cardId===session.cardId?{pageId:doc.pageId||''}:{};
   return root.patchState({...delta,ui:{...delta.ui,editorSession:{...session,...identity}}});}
 };
 for(const key of ['emit','spawn','destroy'])if(typeof root[key]==='function')scoped[key]=(...args)=>check()?root[key](...args):undefined;
 const bound=new Map();
 return new Proxy(scoped,{
  get(target,key){
   if(Object.prototype.hasOwnProperty.call(target,key))return target[key];
   const value=Reflect.get(root,key,root);if(typeof value!=='function')return value;
   const old=bound.get(key);if(old?.source===value)return old.call;
   const call=value.bind(root);bound.set(key,{source:value,call});return call;
  },
  has(target,key){return key in target||key in root;}
 });
}

// Reference navigation belongs to this seat's editor session, never to a saved card.
export const MAX_REFERENCE_TRAIL=32;
export function referenceTrail(cards){return Array.isArray(cards?.referenceTrail)?cards.referenceTrail.slice(-MAX_REFERENCE_TRAIL):[];}
export function referenceOrigin(cards){
 const d=cards?.pageDoc;
 if(cards?.view!=='page'||!d||d.loading||!d.bookId||!d.cardId)return null;
 return {bookId:String(d.bookId),bookName:String(d.bookName||''),cardId:String(d.cardId),cardName:String(d.cardName||cards.card?.name||'Untitled card'),pageId:String(d.pageId||''),folderId:String(cards.folderId||d.bookId),
  folderPath:(cards.folderPath||[]).map(p=>typeof p==='object'?String(p?.name||''):String(p||'')),
  folderTrail:(cards.folderTrail||[]).map(p=>typeof p==='object'?{id:String(p?.id||''),name:String(p?.name||'')}:String(p||''))};
}
export function referenceTrailForOpen(cards,target){
 if(Array.isArray(target.referenceTrail))return target.referenceTrail.slice(-MAX_REFERENCE_TRAIL);
 const d=cards?.pageDoc;
 return cards?.view==='page'&&d?.cardId===target.cardId&&d?.bookId===target.bookId?referenceTrail(cards):[];
}
