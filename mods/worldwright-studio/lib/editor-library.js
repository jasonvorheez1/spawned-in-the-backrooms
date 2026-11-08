// One bounded, read-only reply lane for page and sound editors. Workbench uses
// the same shelf adapter and browser component; no partner runtime is invoked.
const SHELF=require('lib/workbench-shelf.js');
export function handle(api,args){
 const ui=api.getState().ui||{},doc=ui.cards?.pageDoc;
 if(ui.cards?.view!=='page'||!doc||args.context!==[doc.bookId,doc.cardId,doc.pageId].join('/')||!['source','sound'].includes(args.mode))return;
 let library;
 try{library={...SHELF.page(api,args),context:args.context};}
 catch(e){library={source:args.source==='world'?'world':'library',mode:args.mode,context:args.context,request:String(args.request||''),rows:[],count:0,page:0,pages:1,error:'Asset Library could not be read: '+String(e.message||e)};}
 api.patchState({ui:{...ui,editorLibrary:library}});
}
