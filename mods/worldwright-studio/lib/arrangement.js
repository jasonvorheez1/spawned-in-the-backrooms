const STREAM=require('lib/arrangement-stream.js');
const FILES=require('lib/arrangement-render.js');
const D=require('lib/arrangement-data.js'),C=require('lib/cards.js'),P=require('lib/pianoroll.js'),S=require('lib/arrangement-store.js');
const PROJECTS=require('lib/studio-projects.js'),EDITORS=require('lib/editor-registry.js'),NATIVE=require('lib/sound-document.js');
const F=require('lib/writefence.js'),PEN=require('lib/pagelock.js'),CONFIG=require('lib/config.js'),PL=require('lib/pagelayout.js');
const SAVING={},RECOVERING=new Map();
// A private source cache can disappear on a module wake without the browser
// document changing. Refill that cache, never invoke open/close or patch UI.
export async function recoverSources(api){
 const start=state(api),key=start.loadKey,seat=String(api.id||api.self?.id||''),held=RECOVERING.get(seat);
 if(!start.open||start.loading||STREAM.resident(api,key))return;
 if(held?.key===key)return held.promise;
 const check=()=>current(api,key)&&state(api).cardId===start.cardId&&(!api.editorCurrent||api.editorCurrent());
 const entry={key};entry.promise=(async()=>{
  const sources=[];let notes=0;
  for(let i=0;i<(start.sources||[]).length;i+=4){
   const rows=await Promise.all(start.sources.slice(i,i+4).map(async previous=>{
    const card=await C.getCard(api,D.BOOK,previous.id);if(!check())return null;
    const row=card&&!await C.isTrashed(api,card.id)?await source(api,card):null;
    if(!row)throw Error('A source score is unavailable. Your arrangement is kept; reopen it when ready.');
    if(previous.sourceKey&&previous.sourceKey!==row.sourceKey)throw Error('A source score changed while preview was open. Your arrangement is kept; reopen it when ready.');
    return row;
   }));
   if(!check())return;
   for(const row of rows){notes+=row.roll?.notes.length||0;if(notes>D.LIMITS.sourceNotes)throw Error('Source buffer exceeds the arrangement limit');sources.push(row);}
  }
  if(check()&&!STREAM.resident(api,key))STREAM.seed(api,key,sources,true);
 })();RECOVERING.set(seat,entry);
 try{return await entry.promise;}finally{if(RECOVERING.get(seat)===entry)RECOVERING.delete(seat);}
}
function sourceKey(roll){const text=JSON.stringify(roll);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return text.length+':'+(h>>>0).toString(16);}
export function state(api){return api.getState().ui?.arrangement||{};}
function patch(api,changes){const ui=api.getState().ui||{};api.patchState({ui:{...ui,arrangement:{...ui.arrangement,...changes}}});}
export function fail(api,error){patch(api,{loading:false,busy:false,error:String(error?.message||error),receipt:(state(api).receipt||0)+1,ok:false});}
export function close(api){STREAM.clear(api);const s=state(api);patch(api,{open:false,loading:false,loadKey:(s.loadKey||0)+1,sources:[],previewReply:null,data:null});}
function current(api,key){const s=state(api);return s.open&&s.loadKey===key;}
// Only explicit navigation opens a document. A shelf/pen/status refresh checks
// the saved baseline in the repository cache, not the browser's private draft.
export function resident(api){const s=state(api);return s.open&&!s.loading&&STREAM.resident(api,s.loadKey);}
export async function refresh(api){
 const start=state(api),key=start.loadKey;
 if(!start.open||start.loading||start.busy||!start.cardId)return;
 const check=()=>current(api,key)&&state(api).cardId===start.cardId&&(!api.editorCurrent||api.editorCurrent());
 const card=await C.getCard(api,D.BOOK,start.cardId);if(!check())return;
 let notice='',pages=null;
 if(!card||card.folderId!==start.folderId||card.editor!==(start.editor||''))notice='This arrangement moved or changed editor. Reopen it when ready; your current arrangement is kept.';
 else {
  pages=await C.listPages(api,D.BOOK,start.cardId);if(!check())return;
  try{if(JSON.stringify(D.read(pages)||D.blank())!==JSON.stringify(start.data))notice='The saved arrangement changed elsewhere. Reopen it when ready; your current arrangement is kept.';}
  catch(e){notice='The saved arrangement could not be refreshed. Your current arrangement is kept. '+String(e.message||e);}
 }
 if(!check()||state(api).busy||state(api).receipt!==start.receipt)return;
 const changes={},s=state(api),readOnly=!F.mayWrite();
 if((s.refreshNotice||'')!==notice)changes.refreshNotice=notice;
 if(!!s.readOnly!==readOnly)changes.readOnly=readOnly;
 if(!notice&&pages&&D.fingerprint(pages)!==D.fingerprint(s.pages||[]))changes.pages=pages;
 if(Object.keys(changes).length)patch(api,changes);
 return {kept:true,changed:!!notice};
}
async function discover(api,root,check){
 const folders=[root],seen=new Set(),cards=[],warnings=[];let rootCards=[];
 while(folders.length){if(!check())return null;const id=folders.shift();if(seen.has(id))throw Error('A project folder cycle was found');seen.add(id);if(seen.size>D.LIMITS.folders)throw Error('Project exceeds 256 folders; use Files to narrow it');
 const [items,children]=await Promise.all([C.listFolder(api,D.BOOK,id),C.listFolders(api,D.BOOK,id)]);if(!check())return null;
 if(id===root)rootCards=items;for(const row of items){cards.push(row);if(cards.length>D.LIMITS.cards)throw Error('Project exceeds 1024 cards; nothing was silently omitted');}for(const f of children)folders.push(f.id);
 }
 return {cards,rootCards,warnings};
}
async function source(api,row){
 // Source view changes the editor, not an existing native score's audio identity.
 if(row.editor&&!['piano','source'].includes(row.editor))return null;
 const pages=await C.listPages(api,D.BOOK,row.id),sections=await C.listSections(api,D.BOOK,row.id);
 if(pages.some(p=>NATIVE.isInstrumentRef(p.content)))return null;
 const doc=P.document(sections,pages);if(doc.missing&&row.editor!=='piano')return null;
 if(doc.error)return {id:row.id,name:row.name,error:doc.error};
 const normalized=P.normalize(doc.data);if(normalized.error)return {id:row.id,name:row.name,error:normalized.error};
 return {sourceKey:sourceKey(normalized.roll),pageStarts:pages.map(p=>Math.min(...(P.parseDocument(p.content,sections).data?.tracks||[]).flatMap(t=>t.notes).map(n=>n.at))).filter(Number.isFinite),tail:require('lib/roll-transport.js').releaseTail(normalized.roll),id:row.id,name:row.name,beats:doc.data.beats,bpm:doc.data.bpm||120,roll:normalized.roll,triggered:!!doc.data.settings?.on||normalized.roll.notes.some(n=>n.on),instruments:[...new Set(normalized.roll.notes.map(n=>n.instrument))].join(' / ')||'Empty score',empty:!normalized.roll.notes.length};
}
export async function open(api,args){
 STREAM.clear(api);const prior=state(api),key=(prior.loadKey||0)+1;
 patch(api,{open:true,loading:true,busy:false,error:'',refreshNotice:'',ok:false,bookId:D.BOOK,folderId:String(args?.folderId||''),cardId:String(args?.cardId||''),name:String(args?.name||'Sound project'),loadKey:key,receipt:0,data:null,sources:[],previewReply:null,warnings:[],pages:[],recovery:prior.recovery||{},readOnly:!F.mayWrite()});
 const check=()=>current(api,key);
 try{
 if(args?.bookId!==D.BOOK||!args.folderId||args.folderId===D.BOOK)throw Error('Choose a Sound Studio Music or SFX folder');
 const root=await C.getFolder(api,D.BOOK,args.folderId);if(!check())return;if(!root||!await PROJECTS.rootFor(api,D.BOOK,root.id))throw Error('The selected folder is not inside a Sound Studio project');
 const found=await discover(api,root.id,check);if(!found||!check())return;
 const arrangements=found.rootCards.filter(c=>c.editor==='arrangement');
 let cardId=args.cardId||state(api).recovery?.[root.id]||'';
 if(!cardId&&arrangements.length>1)throw Error('This project contains several arrangements. Open the intended card from Files; no documents were merged');
 if(!cardId)cardId=arrangements[0]?.id||'';
 let card=null,pages=[],data=D.blank();
 if(cardId){card=await C.getCard(api,D.BOOK,cardId);if(!check())return;
 if(!card||card.folderId!==root.id)throw Error('The arrangement is missing or outside this project');
 pages=await C.listPages(api,D.BOOK,cardId);
 if(EDITORS.resolve(card,pages).editor!=='arrangement'&&state(api).recovery?.[root.id]!==cardId)throw Error('This card is not an Arrangement document');
 data=D.read(pages)||D.blank();}
 const sources=[];let notes=0;for(let i=0;i<found.cards.length;i+=4){const batch=await Promise.all(found.cards.slice(i,i+4).map(c=>source(api,c)));if(!check())return;for(const s of batch)if(s){notes+=s.roll?.notes.length||0;if(notes>D.LIMITS.sourceNotes)throw Error('Project source buffer exceeds 16384 notes; use a smaller project');sources.push(s);}}
 if(!check())return;STREAM.seed(api,key,sources);patch(api,{loading:false,cardId,editor:card?.editor||'',name:root.name||args.name||'Sound project',pages,data,sources:sources.map(({roll,...s})=>({...s,noteCount:roll?.notes.length||0})),warnings:[...sources.filter(s=>s.error).map(s=>s.name+': '+s.error),...D.warnings(data,sources)],readOnly:!F.mayWrite()});
 }catch(e){if(check())fail(api,e);}
}
async function save(api,args){
 const start=state(api),key=start.loadKey,seat=String(api.id||api.self?.id||'seat'),check=()=>current(api,key)&&state(api).folderId===start.folderId;
 if(!check()||start.loading||!start.data)throw Error('Wait for the arrangement to open');
 if(args.loadKey!==key||args.folderId!==start.folderId||args.cardId!==(start.cardId||''))throw Error('That arrangement save belongs to an older opening');
 if(SAVING[seat])throw Error('An arrangement save is already running');if(!F.mayWrite())throw Error('This shelf is read-only; draft kept');
 const data=D.validate(args.data),requestId=String(args.requestId||'');SAVING[seat]=true;patch(api,{busy:true,error:'',ok:false,requestId});let cardId=start.cardId||'',pen=null;
 try{
 const config=await CONFIG.getBook(api,D.BOOK),plan=start.pages?.length&&JSON.stringify(D.read(start.pages))===JSON.stringify(data)?start.pages:D.paginate(data,config.pageSpec||PL.DEFAULT_SPEC);if(!check()||!F.mayWrite())throw Error('The arrangement changed before Save');
 if(!cardId){
 // Ordinary optimistic create returns its ID BEFORE SQL. Keep it before waiting for
 // metadata or pages, so partial first saves retry that very card, never mint another.
 const rootCards=await C.listFolder(api,D.BOOK,start.folderId);if(!check())throw Error('Opening changed');
 if(rootCards.some(c=>c.editor==='arrangement'))throw Error('Another arrangement now exists; reopen the project before saving');
 const row=await C.createCardRow(api,D.BOOK,{folderId:start.folderId,name:'Arrangement'});cardId=row.id;
 const s=state(api);patch(api,{recovery:{...s.recovery,[start.folderId]:cardId},...(check()?{cardId}: {})});
 }
 const settled=await C.settleOf(D.BOOK,cardId);if(settled?.ok===false)throw Error(settled.error||'Arrangement creation did not finish');
 await C.landed(api,D.BOOK,'card',cardId);
 if(!check()||!F.mayWrite())throw Error('Opening changed; reserved arrangement '+cardId+' is kept for retry');
 let card=await C.getCard(api,D.BOOK,cardId);
 if(card.folderId!==start.folderId)throw Error('Arrangement moved to another project');
 const baseline=await C.listPages(api,D.BOOK,cardId);
 if(state(api).recovery?.[start.folderId]===cardId&&!card.editor&&!baseline.some(p=>(p.content||'').trim())){
 await C.setMeta(api,D.BOOK,cardId,{editor:'arrangement'});await C.landed(api,D.BOOK,'card',cardId,{editor:'arrangement'});card={...card,editor:'arrangement'};
 }else if(card.editor!==(start.editor||'')||EDITORS.resolve(card,baseline).editor!=='arrangement')throw Error('Card editor changed; your draft is kept');
 if(D.fingerprint(start.pages||[])!==D.fingerprint(baseline))throw Error('Arrangement pages changed since opening; draft kept');
 if(!check()||!F.mayWrite())throw Error('Save cancelled before acquiring the pen');
 const who=PEN.identity(api);pen=await PEN.acquire(api,D.BOOK,cardId,who.id,who.name);
 if(!pen.mine||pen.degraded||pen.parked)throw Error('Arrangement pen belongs to '+(pen.holderName||'another author')+'; draft kept');
 const saved=await S.save(api,cardId,start.folderId,baseline,plan,pen,check,card.editor||'');
 if(check())patch(api,{data:D.read(saved),pages:saved,cardId,editor:card.editor||'',busy:false,error:'',ok:true,requestId,receipt:(state(api).receipt||0)+1});
 }catch(e){
 // A post-commit history/readback fault must remain retryable on the same pages.
 if(cardId&&check())try{const live=await C.listPages(api,D.BOOK,cardId);if(JSON.stringify(D.read(live))===JSON.stringify(data))patch(api,{pages:live});}catch(ignore){}
 if(check())fail(api,e);else throw e;
 }finally{delete SAVING[seat];if(pen?.mine&&!pen.degraded)try{await PEN.release(api,D.BOOK,cardId,pen.holder);}catch(e){api.log?.('Arrangement pen release: '+e.message);}}
}
export async function handle(api,args){
 if(args?.op==='previewWindow')return STREAM.handle(api,args,()=>recoverSources(api));
 if(String(args?.op||'').startsWith('render'))return FILES.handle(api,args);
 const key=state(api).loadKey;if(args?.op==='save'){if(args.loadKey!==key)return;patch(api,{requestId:String(args.requestId||'')});}
 try{if(args?.op==='save')return await save(api,args);if(args?.op==='close')return close(api);if(args?.op==='open')return await open(api,args);throw Error('Unknown arrangement action');}
 catch(e){if(state(api).loadKey===key)fail(api,e);}
}
