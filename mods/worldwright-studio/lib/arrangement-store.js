// Narrow page CAS: cards.setAssetPages refuses non-Asset-Studio titles in D.read(before).
// No schema, migrations, source writes, or separate tables. Ordinary repository history.
const C=require('lib/cards.js'),D=require('lib/arrangement-data.js'),F=require('lib/writefence.js'),IDS=require('lib/ids.js');
const GRAPH=require('lib/graph.js'),LOG=require('lib/changelog.js'),REV=require('lib/bookrev.js'),SCHEMA=require('lib/schema.js'),LIB=require('lib/library.js');
export async function save(api,cardId,folderId,before,plan,authority,check,expectedEditor='arrangement'){
 if(!F.mayWrite()||C.isLockedBook(D.BOOK))throw Error('This shelf is read-only; your arrangement draft is kept');
 if(!authority?.holder||!Number.isFinite(authority.takenAt)||authority.takenAt<0)throw Error('Missing arrangement pen authority');
 const card=await C.getCard(api,D.BOOK,cardId);if(!card||card.folderId!==folderId||(card.editor||'')!==expectedEditor)throw Error('Arrangement metadata or project changed');
 D.read(before);const live=await C.listPages(api,D.BOOK,cardId);if(D.fingerprint(before)!==D.fingerprint(live))throw Error('Arrangement pages changed; reopen before saving. Your draft is kept');
 const ms=await LIB.nowMs(api),after=[],seen=new Set(before.map(p=>p.id));
 for(let i=0;i<Math.max(before.length,plan.length);i++){
 const old=before[i],next=plan[i];let id=old?.id;
 if(!id){for(let attempt=0;attempt<8;attempt++){const candidate=IDS.uid(api,ms);if(!seen.has(candidate)){id=candidate;seen.add(id);break;}}if(!id)throw Error('Could not mint an arrangement page ID');}
 after.push({id,bookId:D.BOOK,cardId,sortKey:old?.sortKey||IDS.keyBetween(after.at(-1)?.sortKey||null,null),title:old?.title||D.TITLE,content:next?.content||'',header:old?.header||'',footer:old?.footer||''});
 }
 if(!after.length)throw Error('No arrangement pages');const oldRows=JSON.stringify(before),newRows=JSON.stringify(after),count=before.length,bookId=D.BOOK;
 if(!F.mayWrite()||check()===false)throw Error('The writable arrangement changed; draft kept');
 const result=await api.sql`WITH old AS (SELECT value FROM json_each(${oldRows})),
 permit AS MATERIALIZED (SELECT COUNT(*) AS n FROM old JOIN pages p ON p.id=json_extract(old.value,'$.id')
 AND p.bookId=${bookId} AND p.cardId=${cardId} AND p.content=COALESCE(json_extract(old.value,'$.content'),'')
 AND COALESCE(p.header,'')=COALESCE(json_extract(old.value,'$.header'),'') AND COALESCE(p.footer,'')=COALESCE(json_extract(old.value,'$.footer'),'')
 AND p.title=json_extract(old.value,'$.title') AND p.sortKey=json_extract(old.value,'$.sortKey'))
 INSERT INTO pages(id,bookId,cardId,sortKey,title,content,header,footer)
 SELECT json_extract(value,'$.id'),${bookId},${cardId},json_extract(value,'$.sortKey'),json_extract(value,'$.title'),json_extract(value,'$.content'),json_extract(value,'$.header'),json_extract(value,'$.footer') FROM json_each(${newRows})
 WHERE (SELECT n FROM permit)=${count} AND (SELECT COUNT(*) FROM pages WHERE bookId=${bookId} AND cardId=${cardId})=${count}
 AND EXISTS(SELECT 1 FROM cards WHERE id=${cardId} AND bookId=${bookId} AND folderId=${folderId} AND COALESCE(editor,'')=${expectedEditor})
 AND EXISTS(SELECT 1 FROM page_pen WHERE bookId=${bookId} AND cardId=${cardId} AND holderId=${authority.holder} AND takenAt=${authority.takenAt} AND renewedAt>unixepoch()-45)
 ON CONFLICT(id) DO UPDATE SET content=excluded.content,title=excluded.title,header=excluded.header,footer=excluded.footer RETURNING id`;
 if((result?.rows||[]).length!==after.length)throw Error('A newer edit, metadata choice or pen won; your complete draft is kept');
 GRAPH.invalidate(bookId);
 // Unknown command types are deliberately journal-only; local arrangement Undo/Redo owns edits.
 await REV.touch(api,bookId,String(api.userId||''));
 await LOG.record(api,{projectId:SCHEMA.PROJECT_ID,bookId,type:'SET_ARRANGEMENT_PAGES',targetId:cardId,targetType:'card',before:{pages:before},after:{pages:after},undoable:false});
 const saved=await C.listPages(api,bookId,cardId);if(D.fingerprint(saved)!==D.fingerprint(after))throw Error('Arrangement save readback differs; keep your draft');return saved;
}
