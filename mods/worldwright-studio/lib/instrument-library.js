const C=require('lib/cards.js'),J=require('lib/journal.js'),R=require('lib/research.js'),PEN=require('lib/pagelock.js'),FENCE=require('lib/writefence.js'),D=require('lib/instrument-data.js');
export const BOOK='0MUSIC00BOOK0';
const OPEN={},BUSY={},NEW={};
const seat=api=>String(api.id||api.self&&api.self.id||'');
const state=api=>(api.getState().ui||{}).pianoRoll||{};
function patch(api,reply){const ui=api.getState().ui||{};api.patchState({ui:{...ui,pianoRoll:{...ui.pianoRoll,instrumentReply:reply}}});}
export function prime(api,card,page,snapshot){const parsed=D.read(page.content,snapshot.sections);if(parsed.error)throw Error(parsed.error);(OPEN[seat(api)]||(OPEN[seat(api)]={}))[card.id]={snapshot,instrumentId:parsed.instrumentId,pageId:page.id};return {cardId:card.id,pageId:page.id,name:card.name,sample:parsed.sample,content:page.content};}
export async function folder(api){await R.seed(api,BOOK);const folders=await C.listFolders(api,BOOK,BOOK),f=folders.find(f=>require('lib/studio-project-data.js').shared(BOOK,f));if(!f)throw Error('The Custom Instruments folder is missing — restore it from Trash');await J.flush(api,BOOK);return f.id;}
export async function list(api){const id=await folder(api);return (await C.listFolder(api,BOOK,id)).slice(0,200).map(c=>({id:c.id,name:c.name}));}
export async function load(api,id){const snapshot=await C.readSoundDocument(api,BOOK,id),page=snapshot.pages.find(p=>D.isDocument(p.content));if(!page)throw Error('This card has no native Instrument page');return prime(api,snapshot.card,page,snapshot);}
export async function save(api,args){
 if(!FENCE.mayWrite()||state(api).readOnly)throw Error('This instrument is read-only; draft kept');
 const draftKey=seat(api)+'/'+state(api).bookId+'/'+state(api).cardId+'/'+state(api).pageId,id=String(args.instrumentCardId||''),pending=!id&&NEW[draftKey],base=(OPEN[seat(api)]||{})[id];if(id&&!base)throw Error('Load this instrument before saving; draft kept');
 const v=require('lib/clip-instrument-data.js').validate(args.sample);if(v.error)throw Error(v.error);
 let cardId=id||pending?.cardId,before=base?.snapshot||pending?.snapshot,held=false;const who=PEN.identity(api),doc=api.getState().ui?.cards?.pageDoc,keepPen=doc?.cardId===id&&doc.pen?.mine;
 try{if(!cardId){cardId=await C.createCard(api,BOOK,{folderId:await folder(api),name:v.sample.name,editor:'piano'});const settled=C.settleOf(BOOK,cardId);if(settled)await settled;await C.settleDesk(api,BOOK);before=await C.readSoundDocument(api,BOOK,cardId);NEW[draftKey]={cardId,snapshot:before};}
 const pen=await PEN.acquire(api,BOOK,cardId,who.id,who.name);held=pen.mine&&!pen.degraded;if(!held||pen.parked||pen.stale)throw Error('A verified held instrument pen is required');
 const S=require('lib/sound-document.js'),IDS=require('lib/ids.js'),after=JSON.parse(JSON.stringify(before)),encoded=D.write({...v.sample,cardId},base?.instrumentId||cardId+'.i1',before.sections);
 after.card.name=v.sample.name;let page=after.pages.find(p=>p.id===base?.pageId);if(!page){page={id:'@instrument-page',cardId,sortKey:IDS.keyBetween(null,null),title:D.TITLE,content:'',header:'',footer:''};after.pages.push(page);}page.content=encoded.content;
 after.sections=S.mergeSections(before.sections,encoded.instrumentSections,rows=>({id:'@instrument-section',cardId,lineLimit:0,sortKey:IDS.keyBetween(rows.at(-1)?.sortKey||null,null)}));
 const result=await C.setSoundDocument(api,BOOK,cardId,before,after,{authority:pen,readOnly:state(api).readOnly,beforeWrite:()=>FENCE.mayWrite()&&!state(api).readOnly});const saved=prime(api,result.snapshot.card,result.snapshot.pages.find(p=>D.isDocument(p.content)),result.snapshot);if(!id)delete NEW[draftKey];return saved;
 }finally{if(held&&!keepPen)await PEN.release(api,BOOK,cardId,who.id);}
}
export async function handle(api,args){const key=seat(api),s=state(api),requestId=String(args.requestId||''),context=String(args.context||'');
  const live=()=>{const r=state(api);return r.open&&context===r.bookId+'/'+r.cardId+'/'+r.pageId;};
  if(!live())return;
  try {if(BUSY[key])throw Error('An instrument request is already running');BUSY[key]=requestId;
    let result;if(args.op==='instrumentList')result={rows:await list(api)};else if(args.op==='instrumentLoad')result={card:await load(api,String(args.instrumentCardId||''))};else if(args.op==='instrumentSave')result={card:await save(api,args),saved:true};else throw Error('Unknown instrument action');
    if(live()&&result.saved&&s.instrumentDocument&&result.card.cardId===s.cardId){const ui=api.getState().ui||{},cards=ui.cards||{},doc=cards.pageDoc,content=result.card.content;api.patchState({ui:{...ui,pianoRoll:{...ui.pianoRoll,baseline:content,instrumentCard:result.card,data:{...ui.pianoRoll.data,tracks:[{instrument:'clip',sample:result.card.sample,notes:[]}]}},...(doc&&doc.cardId===s.cardId?{cards:{...cards,pageDoc:{...doc,page:{...doc.page,content}}}}:{})}});}
    if(live())patch(api,{requestId,context,ok:true,...result});return result;
  }catch(e){if(live())patch(api,{requestId,context,ok:false,error:String(e&&e.message||e)});return null;}finally{if(BUSY[key]===requestId)delete BUSY[key];}
}
