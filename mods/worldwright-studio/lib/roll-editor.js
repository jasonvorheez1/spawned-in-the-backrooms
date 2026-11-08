const PACKAGE_PATH=require("lib/package-path.js");
const INSTRUMENT=require("lib/instrument-data.js"),INSTRUMENTS=require("lib/instrument-library.js");
const SOUND=require("lib/sound-document.js");
const SOURCES={};
const STREAM=require("lib/roll-stream.js");
const FILE_RENDER=require("lib/roll-render.js");
const SETTINGS=require("lib/roll-settings.js");
const GRAPH=require("lib/graph.js");
const CARDS=require("lib/cards.js");
const RESEARCH=require("lib/research.js");
const FENCE=require("lib/writefence.js");
const PEN=require("lib/pagelock.js");
const ROWS=require("lib/game-owner.js");
const PIANO=require("lib/pianoroll.js");
const PAGE_FIT=require("lib/pagelayout.js");
const BOOK_CONFIG=require("lib/config.js");
export const BOOK=require("lib/data/music-book.yml").id;
export const TAG="wws-roll-preview";
const DEFAULTS=require("lib/data/piano-editor.yml");
const BUSY={};
export function blank() {return {version:1,bpm:DEFAULTS.bpm,beats:DEFAULTS.beats,tracks:[{instrument:"piano",notes:[]}]};}
export function seat(api){return String(api.id||(api.self&&api.self.id)||"");}
export function state(api){return (api.getState().ui||{}).pianoRoll||{};}
export function patch(api,change){const ui=api.getState().ui||{};api.patchState({ui:{...ui,pianoRoll:{...ui.pianoRoll,...change}}});}
export function fail(api,e){patch(api,{busy:false,loading:false,error:String(e&&e.message||e),receipt:(state(api).receipt||0)+1});}
export function stop(api){for(const row of api.query({tags:[TAG]}))if(row.state&&row.state.rollOwner===seat(api))api.destroy(row.id);}
export async function folders(api) {
  await CARDS.settleDesk(api,BOOK);
  GRAPH.invalidate(BOOK);
  await RESEARCH.seed(api,BOOK);
  GRAPH.invalidate(BOOK);
  let rows=await CARDS.allFolders(api,BOOK);
  const root=rows.find(f=>f.folderId===BOOK&&f.name.toLowerCase()==="piano rolls");
  if(root&&FENCE.mayWrite())for(const name of ["Music","SFX"]){
    if(rows.some(f=>f.folderId===root.id&&f.name===name))continue;
    const id=await CARDS.createFolder(api,BOOK,{folderId:root.id,name});const wait=CARDS.folderSettleOf(BOOK,id);if(wait)await wait;
  }
  await CARDS.settleDesk(api,BOOK);GRAPH.invalidate(BOOK);
  rows=await CARDS.allFolders(api,BOOK);const byId={};for(const f of rows)byId[f.id]=f;
  function path(f){const out=[f.name],seen={[f.id]:true};let p=byId[f.folderId];while(p&&!seen[p.id]){seen[p.id]=true;out.unshift(p.name);p=byId[p.folderId];}return out.join(" / ");}
  return rows.map(f=>({id:f.id,name:path(f)})).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function library(api){
  const [cards,pages,sections]=await Promise.all([CARDS.allCards(api,BOOK),CARDS.allPages(api,BOOK),CARDS.allSections(api,BOOK)]);
  const ids={};for(const p of pages)if(PIANO.isPage(p))ids[p.cardId]=true;
  
  return cards.filter(c=>c.id===c.stackId&&ids[c.id]).map(c=>({id:c.id,name:c.name,folderId:c.folderId}));
}
export async function open(api,args){
  stop(api);patch(api,{open:true,busy:true,loading:true,data:null,error:"",message:"Opening Sound Studio scores…"});
  const fs=await folders(api), cards=await library(api), home=fs.find(f=>f.name==="Piano Rolls / Music")||fs.find(f=>f.name==="Piano Rolls")||fs[0];
  let data=blank(), cardId="", pageId="", baseline="", source="", name="Untitled roll", folderId=home?home.id:"", bookId=BOOK;
  if(args.cardId){
    const targetBook=String(args.bookId||BOOK), card=await CARDS.getCard(api,targetBook,String(args.cardId));
    if(!card)throw Error("That card is missing or was deleted");
    const [pages,sections]=await Promise.all([CARDS.listPages(api,targetBook,card.id),CARDS.listSections(api,targetBook,card.id)]);
    const snapshot=await CARDS.readSoundDocument(api,targetBook,card.id);SOURCES[seat(api)]=snapshot;
    const doc=PIANO.document(snapshot.sections,snapshot.pages);
    if(doc.source==="pages")throw Error("Open one numbered score page from the card; its roll reference plays all pages");
    if(doc.error&&!doc.missing)throw Error(doc.error+" — correct the native document before opening this score");
    if(!doc.missing){data=doc.data;cardId=card.id;pageId=doc.pageId;baseline=doc.content;source=doc.source;name=card.name;bookId=targetBook;folderId=card.folderId;}
    else {cardId=card.id;bookId=targetBook;folderId=card.folderId===BOOK?folderId:card.folderId;name=card.name+" — sound";}
  }
  let rollHeader=null;if(pageId){const heads=await CARDS.listPageHeaders(api,bookId,cardId);rollHeader=heads[0]||null;}
  const settings=SETTINGS.validate(data.settings||{bpm:data.bpm??120});data={...data,bpm:settings.bpm,settings};
  const ro=!FENCE.mayWrite()||CARDS.isLockedBook(bookId);
  patch(api,{instrumentDocument:false,instrumentCard:null,open:true,busy:false,loading:false,error:"",message:"Save writes a native score and named instrument metadata together.",folders:fs,cards,folderId,bookId,cardId,pageId,baseline,source,name,data,settings,settingsPageId:rollHeader&&rollHeader.id,headerBaseline:rollHeader&&rollHeader.header||"",readOnly:ro,loadKey:(state(api).loadKey||0)+1,receipt:(state(api).receipt||0)+1});
}
export function beginPage(api,doc){
  stop(api);
  const loadSeq=(state(api).loadSeq||0)+1;
  patch(api,{open:true,inline:true,busy:true,loading:true,error:"",data:null,previewSeconds:0,loadSeq,bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId,name:doc.cardName||"Piano roll",message:"Loading DAW notes…"});
  return loadSeq;
}
export async function openPage(api,doc,knownCard){
  const loadSeq=beginPage(api,doc);
  const current=()=>{const s=state(api),c=(api.getState().ui||{}).cards||{},p=c.pageDoc;return s.open&&s.loadSeq===loadSeq&&c.view==="page"&&p&&p.pageId===doc.pageId&&p.cardId===doc.cardId&&p.bookId===doc.bookId&&p.pianoRoll;};
  try {
    const snapshot=await CARDS.readSoundDocument(api,doc.bookId,doc.cardId);if(!current())return;
    const raw=doc.pageId?snapshot.pages.find(p=>p.id===doc.pageId):null;if(doc.pageId&&!raw)throw Error("The score page is missing");
    const complete=PIANO.document(snapshot.sections,snapshot.pages);if(complete.error&&!complete.missing)throw Error(complete.error);
    SOURCES[seat(api)]=snapshot;
    const text=String(raw?.content||""),instrumentDocument=INSTRUMENT.isDocument(text),instrument=instrumentDocument?INSTRUMENT.read(text,snapshot.sections):null,parsed=instrumentDocument?(instrument.error?instrument:{data:{...blank(),tracks:[{instrument:"clip",sample:instrument.sample,notes:[]}]}}):text.trim()?PIANO.parseDocument(text,snapshot.sections):{data:blank()};
    if(parsed.error)throw Error(parsed.error+" — choose Prose / source in Metadata to correct the score text");
    const card=knownCard&&String(knownCard.id)===String(doc.cardId)?knownCard:await CARDS.getCard(api,doc.bookId,doc.cardId);
    if(!current())return;
    if(!card)throw Error("The page’s card is missing");
    let root=doc.rollHeader;if(!root){if(!parsed.data.part||parsed.data.part.index===1)root={id:doc.pageId,header:doc.page?.header||""};else {const heads=await CARDS.listPageHeaders(api,doc.bookId,doc.cardId);root=heads[0];}}
    if(!root)throw Error("The first score page is missing");
    const settings=SETTINGS.validate(parsed.data.settings||{bpm:parsed.data.bpm??120});parsed.data={...parsed.data,bpm:settings.bpm,settings};
    const checked=PIANO.normalize(parsed.data);if(checked.error)throw Error(checked.error);if(!current())return;

    const fileRecord=instrumentDocument||!doc.pageId?null:await FILE_RENDER.record(api,doc.bookId,doc.cardId);if(!current())return;
    const instrumentCard=instrumentDocument?INSTRUMENTS.prime(api,card,raw,snapshot):null;
    patch(api,{instrumentDocument,instrumentCard,fileRecord,fileCardKey:doc.bookId+"/"+doc.cardId,fileReply:null,open:true,inline:true,busy:false,loading:false,error:"",message:"Tempo, fade and trigger save in native score settings",settings,settingsPageId:root.id,headerBaseline:root.header||"",bookId:doc.bookId,cardId:doc.cardId,pageId:doc.pageId,
      baseline:text,source:doc.pageId?"page":"empty",name:card.name,folderId:card.folderId,data:parsed.data,readOnly:!FENCE.mayWrite()||!!(doc.pen&&doc.pen.mine===false)||CARDS.isLockedBook(doc.bookId),
      loadKey:(state(api).loadKey||0)+1,receipt:(state(api).receipt||0)+1});
  } catch(e){if(current())fail(api,e);}
}
export async function save(api,args,sourceState=null){
 const s=sourceState||state(api),bookId=s.bookId||BOOK,key=seat(api);
 if(!FENCE.mayWrite()||s.readOnly||CARDS.isLockedBook(bookId))throw Error("This sound document is read-only; draft kept");
 if(String(args.cardId||'')!==String(s.cardId||'')||String(args.pageId||'')!==String(s.pageId||''))throw Error("The open score changed; draft kept");
 if(s.instrumentDocument)throw Error("Use Save instrument; score Save never overwrites an instrument page");
 let cardId=s.cardId,before=SOURCES[key],created=false,held=false;const who=PEN.identity(api),ui=api.getState().ui||{},doc=ui.cards?.pageDoc,keepPen=doc?.cardId===cardId&&doc.pen?.mine;
 const current=()=>{const r=state(api),d=api.getState().ui?.cards?.pageDoc;return r.open&&r.loadKey===s.loadKey&&r.cardId===s.cardId&&r.pageId===s.pageId&&(!s.inline||d?.cardId===s.cardId&&d?.pageId===s.pageId&&d?.pianoRoll)&&!r.readOnly;};
 if(!current())throw Error("This writable sound opening expired; draft kept");
 patch(api,{busy:true,error:'',message:'Saving score and instrument metadata…'});stop(api);
 try{
  if(!cardId){const folderId=String(args.folderId||'');if(!(await CARDS.allFolders(api,bookId)).some(f=>f.id===folderId))throw Error("Choose an existing Sound Studio folder");cardId=await CARDS.createCard(api,bookId,{name:String(args.name||'Untitled score'),folderId,editor:'piano'});const settle=CARDS.settleOf(bookId,cardId);if(settle)await settle;await CARDS.settleDesk(api,bookId);created=true;before=await CARDS.readSoundDocument(api,bookId,cardId);}
  if(!before||before.card.id!==cardId)throw Error("Reopen the score to capture its complete source baseline; draft kept");
  if(args.drafts)for(const d of args.drafts){const base=before.pages.find(p=>p.id===d.pageId);if(!base)throw Error("A numbered draft belongs to another score");}
  const pen=await PEN.acquire(api,bookId,cardId,who.id,who.name);held=pen.mine&&!pen.degraded;if(!held||pen.parked||pen.stale)throw Error("A verified held score pen is required");
  const plan=SOUND.prepareSave(before,{...args,pageId:s.pageId,settings:args.settings||s.settings,...(s.inline?{name:before.card.name,folderId:before.card.folderId}:{})});
  const out=await CARDS.setSoundDocument(api,bookId,cardId,before,plan.after,{authority:pen,beforeWrite:current,readOnly:s.readOnly});SOURCES[key]=out.snapshot;
  const saved=out.snapshot.pages.find(p=>p.id===plan.targetId)||out.snapshot.pages.find(p=>!before.pages.some(b=>b.id===p.id))||out.snapshot.sections.find(p=>p.id===plan.targetId);if(!saved)throw Error("The native score readback has no target; draft kept");
  const complete=PIANO.document(out.snapshot.sections,out.snapshot.pages);if(complete.error)throw Error(complete.error);const parsed=PIANO.parseDocument(saved.content,out.snapshot.sections);if(parsed.error)throw Error(parsed.error);
  const pageId=out.snapshot.pages.some(p=>p.id===saved.id)?saved.id:'',root=out.snapshot.pages.filter(PIANO.isPage)[0],savedPages=out.snapshot.pages.filter(PIANO.isPage).map(p=>({pageId:p.id,content:p.content}));
  for(const p of savedPages){const d=PIANO.parseDocument(p.content,out.snapshot.sections);if(!d.error)STREAM.saved(api,p.pageId,p.content,d.data,out.snapshot.sections);}
  if(s.inline&&current()){const u=api.getState().ui||{},c=u.cards||{},d=c.pageDoc;api.patchState({ui:{...u,cards:{...c,pageDoc:{...d,pageId,page:saved,rollHeader:root?{id:root.id,header:root.header}:null,count:out.snapshot.pages.length,pages:out.snapshot.pages.map(p=>({id:p.id,title:p.title}))}}}});}
  if(current()||s.inline&&state(api).loadKey===s.loadKey)patch(api,{busy:false,error:'',saveReply:{id:String(args.requestId||''),ok:true,pageId,cardId,savedPages,receipt:out.receipt},message:'Native score and instrument metadata saved and verified',cardId,pageId,baseline:saved.content,source:pageId?'page':'section',name:out.snapshot.card.name,folderId:out.snapshot.card.folderId,settings:plan.settings,settingsPageId:root?.id||'',headerBaseline:root?.header||'',data:parsed.data,loadKey:(s.loadKey||0)+1,receipt:(state(api).receipt||0)+1});
  return {cardId,pageId,content:saved.content,headerBaseline:root?.header||'',settingsPageId:root?.id||'',receipt:out.receipt};
 }catch(e){if(created){SOURCES[key]=before;patch(api,{cardId});e.message+=' · new draft card '+cardId+' retained';}patch(api,{busy:false,error:String(e.message||e),saveReply:{id:String(args.requestId||''),ok:false,error:String(e.message||e),recoveryReceipt:e.receipt||''},receipt:(state(api).receipt||0)+1});throw e;
 }finally{if(held&&!keepPen)await PEN.release(api,bookId,cardId,who.id);}
}
export async function saveSet(api,args){try{return await save(api,args);}catch(e){return null;}}
export function preview(api,args){
  stop(api);const n=PIANO.normalize(args.data);if(n.error)throw Error(n.error);
  const owner=seat(api), bodyId=owner.indexOf("god/")===0?owner.slice(4):owner;
  const player=(api.getPlayers()||[]).find(p=>ROWS.rowId(p)===bodyId);
  if(!player)throw Error("Join this room to hear a private preview");
  const from=Number(args.from||0), to=args.to==null?n.duration:Number(args.to);
  if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to<=from||to>n.duration)throw Error("Preview end must follow start inside the roll (seconds)");
  const duration=to-from, prefix=PACKAGE_PATH.resolve(api,"roll-audio.js");
  const guard=prefix.replace(/roll-audio\.js$/,"roll-preview.js");
  const fade=PIANO.fadeSeconds(args.fade==null?0:args.fade);if(fade===null)throw Error("Fade is 0–300 seconds");
  api.spawn({tags:[TAG],audience:"local",scope:"session",visible:false,lifetime:duration+0.2,feetPosition:{x:0,y:0,z:0},behavior:[guard,prefix.replace(/roll-audio\.js$/,"sound-cue.js")],state:{rollOwner:owner,soundOwner:bodyId,listeners:[bodyId],epoch:api.now(),pageId:state(api).pageId,
    item:{kind:"roll",roll:n.roll,start:0,until:duration,from,to,fade,pitch:1,loop:false,gain:0.6,emitter:{kind:"screen"},bus:"Music"}}});
  patch(api,{error:"",message:"Previewing "+from+"–"+to+" seconds · private to you",previewAt:api.now(),previewSeconds:duration,previewFrom:from,previewAudition:!!args.audition});
}
export async function handle(api,args){
  const op=String(args.op||"open"), id=seat(api);
  if(op.startsWith("instrument"))return INSTRUMENTS.handle(api,args);
  if(op.startsWith("stream"))return STREAM.handle(api,args);
  if(op.startsWith("render"))return FILE_RENDER.handle(api,args,state(api));
  if(op==="trigger"){
    const event=PIANO.eventName(args.event);if(!event)throw Error("Choose an event name");
    const bodyId=id.indexOf("god/")===0?id.slice(4):id;api.emit(event,{soundOwner:bodyId});return;
  }
  if(op==="stop"){stop(api);patch(api,{previewSeconds:0,message:"Preview stopped"});return;}
  if(BUSY[id])return;
  if(op==="close"){stop(api);patch(api,{open:false,previewSeconds:0});return;}
  BUSY[id]=true;
  try {if(op==="open"||op==="new")await open(api,op==="new"?{}:args);else if(op==="save")return await save(api,args);else if(op==="saveSet")return await saveSet(api,args);else if(op==="preview")preview(api,args);else throw Error("Unknown piano-roll action");}
  catch(e){fail(api,e);if(op==="save"||op==="saveSet")patch(api,{saveReply:{id:String(args.requestId||""),ok:false,error:String(e&&e.message||e),pageId:state(api).pageId}});return null;}finally{delete BUSY[id];}
}
