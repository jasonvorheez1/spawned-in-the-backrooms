const C=require('lib/cards.js'),P=require('lib/pianoroll.js'),D=require('lib/roll-render-data.js'),FENCE=require('lib/writefence.js'),PIN=require('lib/pinned.js'),T=require('lib/roll-transport.js');
const JOBS={};
const seat=api=>String(api.id||api.self?.id||'');
const same=(s,a)=>!!s?.open&&s.bookId===a.bookId&&s.cardId===a.cardId&&s.pageId===a.pageId&&s.loadKey===a.loadKey;
function active(api,a,write=false){const s=api.getState().ui?.pianoRoll;if(!same(s,a))return false;return !write||FENCE.mayWrite()&&!s.readOnly&&!PIN.isLocked(s.bookId);}
function reply(api,args,body){if(!active(api,args))return;const id=seat(api),player=id.startsWith('god/')?id.slice(4):id,payload={requestId:args.requestId,bookId:args.bookId,cardId:args.cardId,pageId:args.pageId,loadKey:args.loadKey,...body},ui=api.getState().ui||{};
 api.patchState({ui:{...ui,pianoRoll:{...ui.pianoRoll,fileReply:payload,...(Object.prototype.hasOwnProperty.call(body,'record')?{fileRecord:body.record,fileCardKey:args.bookId+'/'+args.cardId}:{})}}});api.emit('uiEvent',{name:'wws-roll-file',payload},{audience:{player}});
}
export async function record(api,book,card){const key='pianoRender:'+card,r=await api.sql`SELECT value FROM book_settings WHERE bookId=${book} AND key=${key}`;try{const v=JSON.parse(r.rows[0].value);return v&&D.audioRef(v.url)&&v.format==='wav'&&typeof v.name==='string'&&typeof v.fingerprint==='string'&&Number.isFinite(v.duration)&&Number.isFinite(v.notes)?v:null;}catch(e){return null;}}
export async function source(api,book,card){
 await C.settleDesk(api,book);const snapshot=await C.readSoundDocument(api,book,card),row=snapshot.card;
 if(row.editor&&row.editor!=='piano')throw Error('This card is no longer a DAW score');
 const doc=P.document(snapshot.sections,snapshot.pages);if(doc.error||!doc.data)throw Error(doc.error||'This card has no saved score');
 const n=P.normalize(doc.data);if(n.error)throw Error(n.error);if(!n.roll.notes.length)throw Error('Add and save notes before rendering');
 if(n.roll.notes.some(v=>v.on))throw Error('This score has event-triggered notes. Give them fixed beat positions before rendering a file; nothing was omitted.');
 const packed=D.pack(doc.data);return {packed,credits:D.credits(doc.data),fingerprint:D.fingerprint(packed),duration:n.duration,renderDuration:n.duration+T.releaseTail(n.roll),notes:n.roll.notes.length,pages:snapshot.pages.length,title:row.name,bpm:doc.data.bpm,trigger:doc.data.settings?.on||'',snapshot};
}
export async function store(api,book,card,result,guard){
 if(!guard?.snapshot||guard.beforeWrite()!==true)throw Error('The writable render changed; the WAV can still be downloaded');
 const before=guard.snapshot,ps=JSON.stringify(before.pages),ss=JSON.stringify(before.sections),key='pianoRender:'+card,value=JSON.stringify(result);
 const r=await api.sql`INSERT INTO book_settings(bookId,key,value)
 SELECT ${book},${key},${value}
 WHERE EXISTS(SELECT 1 FROM cards WHERE id=${card} AND bookId=${book} AND COALESCE(editor,'')=${before.card.editor||''} AND COALESCE((SELECT name FROM card_names WHERE cardId=cards.id),'')=${before.card.name})
 AND (SELECT COUNT(*) FROM pages WHERE bookId=${book} AND cardId=${card})=${before.pages.length}
 AND (SELECT COUNT(*) FROM sections WHERE bookId=${book} AND cardId=${card})=${before.sections.length}
 AND NOT EXISTS(SELECT 1 FROM json_each(${ps}) j LEFT JOIN pages p ON p.id=json_extract(j.value,'$.id') AND p.bookId=${book} AND p.cardId=${card}
 WHERE p.id IS NULL OR p.content<>COALESCE(json_extract(j.value,'$.content'),'') OR p.title<>json_extract(j.value,'$.title') OR p.sortKey<>json_extract(j.value,'$.sortKey') OR COALESCE(p.header,'')<>COALESCE(json_extract(j.value,'$.header'),'') OR COALESCE(p.footer,'')<>COALESCE(json_extract(j.value,'$.footer'),''))
 AND NOT EXISTS(SELECT 1 FROM json_each(${ss}) j LEFT JOIN sections s ON s.id=json_extract(j.value,'$.id') AND s.bookId=${book} AND s.cardId=${card}
 WHERE s.id IS NULL OR s.content<>COALESCE(json_extract(j.value,'$.content'),'') OR s.name<>json_extract(j.value,'$.name') OR s.sortKey<>json_extract(j.value,'$.sortKey'))
 AND COALESCE((SELECT json(value) FROM book_settings WHERE bookId=${book} AND key=${key}),'')=${guard.renderBaseline||''}
 ON CONFLICT(bookId,key) DO UPDATE SET value=excluded.value RETURNING value`;
 if(r.rows?.length!==1||r.rows[0].value!==value)throw Error('The score changed before its file link could save. Download keeps the rendered snapshot; render again for the latest score');return result;
}
export async function handle(api,args,state){const id=seat(api);
 if(args.op==='renderCancel'){const j=JOBS[id];if(j&&j.requestId===args.requestId&&j.loadKey===args.loadKey)delete JOBS[id];return;}
 if(!same(state,args)||!active(api,args))return;
 if(args.op==='renderReceipt'){const ui=api.getState().ui,s=ui.pianoRoll;if(s.fileReply?.requestId===args.requestId&&s.fileReply.kind==='source')api.patchState({ui:{...ui,pianoRoll:{...s,fileReply:{...s.fileReply,source:null,kind:'received'}}}});return;}
 try{
  if(args.op==='renderLookup'){const saved=await record(api,args.bookId,args.cardId);reply(api,args,{kind:'record',record:saved});return;}
  if(!active(api,args,true))throw Error('This score is read-only');
  if(args.op==='renderRemove'){
   if(!D.audioRef(args.url))throw Error('Load the attached WAV before removing it');delete JOBS[id];const key='pianoRender:'+args.cardId;
   const removed=await api.sql`DELETE FROM book_settings WHERE bookId=${args.bookId} AND key=${key} AND json_extract(value,'$.url')=${args.url} RETURNING key`;
   if(!removed.rows?.length)throw Error('The attached render changed. Reopen this score before removing it.');reply(api,args,{kind:'removed',record:null});return;
  }
  if(args.op==='renderPrepare'){
   const job={...args,at:api.now()};JOBS[id]=job;
   const s=await source(api,args.bookId,args.cardId),old=await record(api,args.bookId,args.cardId);
   if(JOBS[id]!==job||!active(api,args,true))return;
   if(old?.fingerprint===s.fingerprint){delete JOBS[id];reply(api,args,{kind:'ready',record:old,reused:true});return;}
   Object.assign(job,s,{renderBaseline:old?JSON.stringify(old):""});const {snapshot,...publicSource}=s;reply(api,args,{kind:'source',source:publicSource});return;
  }
  if(args.op==='renderFinish'){
   const job=JOBS[id];if(!job||job.requestId!==args.requestId||job.loadKey!==args.loadKey||!job.snapshot||api.now()-job.at>D.RENDER.ttl)throw Error('That render expired; render the score again');
   if(!D.audioRef(args.url))throw Error('The render must be an uploaded WAV file');
   const result={url:args.url,fingerprint:job.fingerprint,name:D.filename(job.title),format:'wav',duration:job.renderDuration,notes:job.notes,pages:job.pages,bpm:job.bpm,trigger:job.trigger,at:api.now(),credits:job.credits||D.CREDITS};
   await store(api,args.bookId,args.cardId,result,{snapshot:job.snapshot,renderBaseline:job.renderBaseline,beforeWrite:()=>active(api,args,true)&&JOBS[id]===job});
   if(JOBS[id]===job)delete JOBS[id];reply(api,args,{kind:'ready',record:result});return;
  }
  throw Error('Unknown audio-render action');
 }catch(e){if(JOBS[id]?.requestId===args.requestId&&JOBS[id]?.loadKey===args.loadKey)delete JOBS[id];reply(api,args,{kind:'error',message:String(e?.message||e)});}
}
