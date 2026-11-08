const SYNTH=require('lib/synth-data.js');
const C=require('lib/cards.js'),P=require('lib/pianoroll.js'),CL=require('lib/clip-instrument-data.js'),PL=require('lib/pagelayout.js'),CONFIG=require('lib/config.js'),SETTINGS=require('lib/roll-settings.js'),PEN=require('lib/pagelock.js'),FENCE=require('lib/writefence.js'),GRAPH=require('lib/graph.js'),STREAM=require('lib/roll-stream.js');
export function schema(data){return JSON.stringify((data?.tracks||[]).map(t=>({instrument:t.instrument,...(t.instrument==='clip'?{sample:CL.signature(t.sample)}:{}),...(t.instrument==='synth'?{synth:SYNTH.signature(t.synth)}:{})})));}
export function needed(data,baseline){return baseline?.part?.count>1&&schema(data)!==schema(baseline);}
// The complete roster and every old body/header are checked once, before any row changes.
export async function swap(api,bookId,cardId,before,after){
  if(before.length!==after.length||before.some((p,i)=>p.id!==after[i].id))throw Error('The score page roster changed; nothing was overwritten');
  const rows=before.map((p,i)=>({id:p.id,oldContent:p.content||'',oldHeader:p.header||'',oldFooter:p.footer||'',oldTitle:p.title,sortKey:p.sortKey,content:after[i].content||'',header:after[i].header||''})),packed=JSON.stringify(rows),count=rows.length;
  const result=await api.sql`WITH supplied AS (SELECT value FROM json_each(${packed})),
    permit AS MATERIALIZED (SELECT COUNT(*) AS n FROM supplied AS s JOIN pages AS p
      ON p.id=json_extract(s.value,'$.id') AND p.bookId=${bookId} AND p.cardId=${cardId}
      AND COALESCE(p.content,'')=json_extract(s.value,'$.oldContent') AND COALESCE(p.header,'')=json_extract(s.value,'$.oldHeader')
      AND COALESCE(p.footer,'')=json_extract(s.value,'$.oldFooter') AND p.title=json_extract(s.value,'$.oldTitle') AND p.sortKey=json_extract(s.value,'$.sortKey'))
    UPDATE pages SET content=(SELECT json_extract(value,'$.content') FROM supplied WHERE json_extract(value,'$.id')=pages.id),
      header=(SELECT json_extract(value,'$.header') FROM supplied WHERE json_extract(value,'$.id')=pages.id)
    WHERE bookId=${bookId} AND cardId=${cardId} AND (SELECT n FROM permit)=${count}
      AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=${count} RETURNING id`;
  if((result.rows||[]).length!==count)throw Error('A score page changed since opening; all pages and your draft were kept');
  GRAPH.invalidate(bookId);await C.reindexNow(api,bookId,cardId);STREAM.invalidate(api);
}
export function plan(before,args,s,spec,baselines){
  const settings=SETTINGS.validate(args.settings||s.settings),drafts=new Map((args.drafts||[]).map(d=>[d.pageId,d.data]));drafts.set(s.pageId,args.data);
  if(before[0]?.id!==s.settingsPageId||String(before[0]?.header||'')!==String(s.headerBaseline||''))throw Error('The first-page header changed; your draft is kept');
  if(args.data.tracks.length<s.data.tracks.length)throw Error('Remove a track in the source pages together; hidden notes were kept');
  if(JSON.stringify(args.data.part)!==JSON.stringify(s.data.part))throw Error('The page numbering changed');
  for(const [id] of drafts){const p=before.find(p=>p.id===id);if(!p||p.content!==baselines[id])throw Error('A score page changed since opening; your drafts were kept');}
  const after=before.map((row,index)=>{const parsed=P.parseDocument(row.content);if(parsed.error)throw Error(parsed.error);let data=drafts.get(row.id)||parsed.data;
    if(JSON.stringify(data.part)!==JSON.stringify(parsed.data.part)||data.beats!==args.data.beats)throw Error('The numbered timeline must stay consistent');
    data={...data,bpm:settings.bpm,tracks:args.data.tracks.map((t,i)=>({...t,notes:data.tracks[i]?.notes||[]}))};const checked=P.normalize(data);if(checked.error)throw Error(checked.error);
    const content=P.serialize(data,{pageSpec:spec}),fit=PL.zoneFit(content,spec,'body');if(!fit.ok)throw Error('Instrument declarations fill page '+(index+1)+' ('+fit.used+'/'+fit.capacity+' lines). Reorganize the source pages or use wider paper; nothing was saved.');
    return {...row,content,header:index===0?SETTINGS.write(row.header,settings):row.header};});
  const fit=PL.zoneFit(after[0].header,spec,'header');if(!fit.ok)throw Error('The first-page settings do not fit the header');
  const complete=P.document([],after);if(complete.error)throw Error(complete.error);return {after,settings};
}
export async function save(api,args,s){
  if(!FENCE.mayWrite()||s.readOnly||String(args.cardId)!==String(s.cardId)||String(args.pageId)!==String(s.pageId))throw Error('The writable score changed; your draft is kept');
  const ui=api.getState().ui||{},doc=ui.cards?.pageDoc;if(s.inline&&(!doc||doc.cardId!==s.cardId||!doc.pianoRoll))throw Error('This score is no longer open');
  const id=PEN.identity(api),keep=doc?.pen?.mine;let held=false;
  const patch=p=>{const u=api.getState().ui||{};if(u.pianoRoll?.cardId!==s.cardId||u.pianoRoll?.pageId!==s.pageId)return;const cards=p.saveReply?.instrumentSet&&u.cards?.pageDoc?.cardId===s.cardId?{...u.cards,pageDoc:{...u.cards.pageDoc,warm:{}}}:u.cards;api.patchState({ui:{...u,cards,pianoRoll:{...u.pianoRoll,...p}}});};
  patch({busy:true,error:'',message:'Saving instruments across the score…'});
  try{
    const pen=await PEN.acquire(api,s.bookId,s.cardId,id.id,id.name);if(!pen.mine||pen.degraded)throw Error('The score pen belongs to another editor');held=true;
    await C.settleDesk(api,s.bookId);const before=await C.listPages(api,s.bookId,s.cardId),spec=(await CONFIG.getBook(api,s.bookId)).pageSpec||PL.DEFAULT_SPEC,baselines={[s.pageId]:s.baseline};
    for(const d of args.drafts||[])if(d.pageId!==s.pageId)baselines[d.pageId]=STREAM.sourceState(api,d.pageId).baseline;
    const {after,settings}=plan(before,args,s,spec,baselines);await swap(api,s.bookId,s.cardId,before,after);
    await C.record(api,s.bookId,{type:'SET_SCORE_INSTRUMENTS',targetId:s.cardId,targetType:'card',before:{pages:before},after:{pages:after}});
    const active=after.find(p=>p.id===s.pageId),data={...P.parseDocument(active.content).data,bpm:settings.bpm,settings};
    patch({busy:false,error:'',baseline:active.content,headerBaseline:after[0].header,settings,data,loadKey:(s.loadKey||0)+1,receipt:(s.receipt||0)+1,saveReply:{id:String(args.requestId||''),ok:true,pageId:s.pageId,instrumentSet:true,savedPages:after.map(p=>({pageId:p.id,content:p.content}))},message:'Instruments saved across '+after.length+' score pages'});
    return {instrumentSet:true,cardId:s.cardId,pageId:s.pageId,content:active.content,headerBaseline:after[0].header,settingsPageId:s.settingsPageId};
  }finally{if(held&&!keep)await PEN.release(api,s.bookId,s.cardId,id.id);}
}
