const D=require('lib/arrangement-data.js'),C=require('lib/cards.js'),P=require('lib/pianoroll.js'),WIRE=require('lib/arrangement-wire.js'),MIX=require('lib/arrangement-transport.js'),R=require('lib/roll-render-data.js'),T=require('lib/roll-transport.js'),F=require('lib/writefence.js');
const JOBS={};
const seat=api=>String(api.id||api.self?.id||''),state=api=>api.getState().ui?.arrangement;
function active(api,a,write=false){const s=state(api);return !!s?.open&&!s.loading&&s.loadKey===a.loadKey&&s.cardId===a.cardId&&s.folderId===a.folderId&&s.bookId===D.BOOK&&(!write||F.mayWrite()&&!s.readOnly);}
function reply(api,a,body){if(!active(api,a))return;const ui=api.getState().ui,p={...body,requestId:a.requestId,bookId:D.BOOK,cardId:a.cardId,folderId:a.folderId,loadKey:a.loadKey};api.patchState({ui:{...ui,arrangement:{...ui.arrangement,fileReply:p,...(Object.prototype.hasOwnProperty.call(body,'record')?{fileRecord:body.record,fileCardKey:a.cardId}:{})}}});api.emit('uiEvent',{name:'wws-arrangement-file',payload:p},{audience:{player:seat(api).replace(/^god\//,'')}});}
export async function record(api,card){const key='arrangementRender:'+card,r=await api.sql`SELECT value FROM book_settings WHERE bookId=${D.BOOK} AND key=${key}`;return decode(r.rows?.[0]?.value);}
function decode(text){try{const v=JSON.parse(text);return R.audioRef(v.url)&&v.format==='wav'&&typeof v.name==='string'&&typeof v.fingerprint==='string'&&Number.isFinite(v.duration)&&Number.isFinite(v.notes)?v:null;}catch{return null;}}
export async function source(api,a){
 const wanted=D.validate(a.data),ids=JSON.stringify([...new Set([a.cardId,...wanted.clips.map(c=>c.cardId)])]),key='arrangementRender:'+a.cardId;
 await C.settleDesk(api,D.BOOK);
 const result=await api.sql`SELECT c.id,c.editor,c.folderId,COALESCE(n.name,'') AS name,
 (SELECT json_group_array(json_object('id',p.id,'title',p.title,'content',p.content,'sortKey',p.sortKey,'header',p.header,'footer',p.footer)) FROM pages p WHERE p.bookId=c.bookId AND p.cardId=c.id) AS pages,
 (SELECT json_group_array(json_object('id',s.id,'name',s.name,'content',s.content,'sortKey',s.sortKey)) FROM sections s WHERE s.bookId=c.bookId AND s.cardId=c.id) AS sections,
 CASE WHEN c.id=${a.cardId} THEN (SELECT value FROM book_settings WHERE bookId=c.bookId AND key=${key}) END AS rendered
 FROM cards c LEFT JOIN card_names n ON n.cardId=c.id WHERE c.bookId=${D.BOOK} AND c.id IN (SELECT value FROM json_each(${ids}))`;
 const snapshots=result.rows.map(r=>({...r,pages:JSON.parse(r.pages||'[]').sort((a,b)=>a.sortKey<b.sortKey?-1:a.sortKey>b.sortKey?1:0),sections:JSON.parse(r.sections||'[]').sort((a,b)=>a.sortKey<b.sortKey?-1:a.sortKey>b.sortKey?1:0)})),arr=snapshots.find(r=>r.id===a.cardId);
 if(!arr||arr.folderId!==a.folderId||arr.editor!=='arrangement')throw Error('The saved arrangement changed or moved. Reopen it before compiling.');
 const data=D.read(arr.pages);if(JSON.stringify(data)!==JSON.stringify(wanted))throw Error('Save or reopen the arrangement before compiling its file.');
 const sources=snapshots.filter(r=>r.id!==a.cardId).map(r=>{if(r.editor&&!['piano','source'].includes(r.editor))throw Error(r.name+' is no longer a DAW score');const doc=P.document(r.sections,r.pages);if(doc.error||!doc.data)throw Error(r.name+': '+(doc.error||'Missing native score'));const n=P.normalize(doc.data);if(n.error)throw Error(r.name+': '+n.error);return {id:r.id,name:r.name,bpm:doc.data.bpm,beats:doc.data.beats,roll:n.roll,triggered:!!doc.data.settings?.on||n.roll.notes.some(n=>n.on),credits:R.credits(doc.data,'')+'\n'+r.sections.filter(s=>/credit|license|attribution/i.test(s.name)).map(s=>s.content).join('\n')};});
 const {roll}=MIX.compile(data,sources,{maxNotes:D.LIMITS.sourceNotes}),packed=WIRE.packSources([{id:'mix',roll}]),credits='Worldwright Studio · full arrangement\n'+[...new Set(sources.map(s=>s.credits).filter(Boolean))].join('\n')+(roll.notes.some(n=>n.instrument==='piano')?'\n'+R.CREDITS:'');
 return {snapshots,packed,credits,fingerprint:R.fingerprint(packed),title:arr.name||'Arrangement',duration:roll.duration+T.releaseTail(roll),notes:roll.notes.length,bpm:data.bpm,old:decode(arr.rendered)};
}
export async function store(api,a,result,job,check){
 if(!check())throw Error('The editor opening changed; Download still keeps your WAV');
 const snapshot=JSON.stringify(job.snapshots),key='arrangementRender:'+a.cardId,value=JSON.stringify(result);
 const r=await api.sql`INSERT INTO book_settings(bookId,key,value) SELECT ${D.BOOK},${key},${value}
 WHERE NOT EXISTS(SELECT 1 FROM json_each(${snapshot}) j LEFT JOIN cards c ON c.id=json_extract(j.value,'$.id') AND c.bookId=${D.BOOK}
 WHERE c.id IS NULL OR COALESCE(c.editor,'')<>COALESCE(json_extract(j.value,'$.editor'),'') OR c.folderId<>json_extract(j.value,'$.folderId') OR COALESCE((SELECT name FROM card_names WHERE cardId=c.id),'')<>json_extract(j.value,'$.name')
 OR (SELECT COUNT(*) FROM pages WHERE bookId=c.bookId AND cardId=c.id)<>json_array_length(j.value,'$.pages')
 OR (SELECT COUNT(*) FROM sections WHERE bookId=c.bookId AND cardId=c.id)<>json_array_length(j.value,'$.sections')
 OR EXISTS(SELECT 1 FROM json_each(j.value,'$.pages') k LEFT JOIN pages p ON p.id=json_extract(k.value,'$.id') AND p.bookId=c.bookId AND p.cardId=c.id WHERE p.id IS NULL OR p.title<>json_extract(k.value,'$.title') OR COALESCE(p.content,'')<>COALESCE(json_extract(k.value,'$.content'),'') OR p.sortKey<>json_extract(k.value,'$.sortKey') OR COALESCE(p.header,'')<>COALESCE(json_extract(k.value,'$.header'),'') OR COALESCE(p.footer,'')<>COALESCE(json_extract(k.value,'$.footer'),''))
 OR EXISTS(SELECT 1 FROM json_each(j.value,'$.sections') k LEFT JOIN sections s ON s.id=json_extract(k.value,'$.id') AND s.bookId=c.bookId AND s.cardId=c.id WHERE s.id IS NULL OR s.name<>json_extract(k.value,'$.name') OR COALESCE(s.content,'')<>COALESCE(json_extract(k.value,'$.content'),'') OR s.sortKey<>json_extract(k.value,'$.sortKey')))
 AND COALESCE((SELECT value FROM book_settings WHERE bookId=${D.BOOK} AND key=${key}),'')=${job.snapshots.find(r=>r.id===a.cardId)?.rendered||''}
 ON CONFLICT(bookId,key) DO UPDATE SET value=excluded.value RETURNING value`;
 if(r.rows?.[0]?.value!==value)throw Error('The arrangement or a source score changed during compilation. Download keeps this snapshot; compile again to attach the latest.');return result;
}
export async function handle(api,a){const id=seat(api);if(a.op==='renderCancel'){if(JOBS[id]?.requestId===a.requestId&&JOBS[id]?.loadKey===a.loadKey)delete JOBS[id];return;}if(!active(api,a))return;
 try{
  if(a.op==='renderLookup'){reply(api,a,{kind:'record',record:await record(api,a.cardId)});return;}
  if(a.op==='renderReceipt'){const ui=api.getState().ui;if(ui.arrangement.fileReply?.requestId===a.requestId)api.patchState({ui:{...ui,arrangement:{...ui.arrangement,fileReply:{requestId:a.requestId,kind:'received'}}}});return;}
  if(!active(api,a,true))throw Error('This arrangement is read-only');
  if(a.op==='renderRemove'){
   if(!R.audioRef(a.url))throw Error('Load the attached WAV before removing it');delete JOBS[id];
   const key='arrangementRender:'+a.cardId;
   const removed=await api.sql`DELETE FROM book_settings WHERE bookId=${D.BOOK} AND key=${key} AND json_extract(value,'$.url')=${a.url} RETURNING key`;
   if(!removed.rows?.length)throw Error('The attached render changed. Use Saved WAV before removing it.');reply(api,a,{kind:'removed',record:null});return;
  }
  if(a.op==='renderPrepare'){const job={...a,at:api.now()};JOBS[id]=job;const s=await source(api,a);if(JOBS[id]!==job||!active(api,a,true))return;Object.assign(job,s);if(s.old?.fingerprint===s.fingerprint){delete JOBS[id];reply(api,a,{kind:'ready',record:s.old,reused:true});return;}const {snapshots,old,...publicSource}=s;reply(api,a,{kind:'source',source:publicSource});return;}
  if(a.op==='renderFinish'){const job=JOBS[id];if(!job?.snapshots||job.requestId!==a.requestId||job.loadKey!==a.loadKey||api.now()-job.at>R.RENDER.ttl)throw Error('That render expired; compile again');if(!R.audioRef(a.url))throw Error('An uploaded WAV is required');
   const result={url:a.url,name:R.filename(job.title),format:'wav',duration:job.duration,notes:job.notes,bpm:job.bpm,credits:job.credits,fingerprint:job.fingerprint,at:api.now()};await store(api,a,result,job,()=>active(api,a,true)&&JOBS[id]===job);if(JOBS[id]===job)delete JOBS[id];reply(api,a,{kind:'ready',record:result});return;}
  throw Error('Unknown arrangement file action');
 }catch(e){if(JOBS[id]?.requestId===a.requestId)delete JOBS[id];reply(api,a,{kind:'error',message:String(e?.message||e)});}
}
