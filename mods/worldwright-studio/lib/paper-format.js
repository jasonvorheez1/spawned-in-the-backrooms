const GRAPH=require('lib/graph.js');
const C=require('lib/cards.js'),P=require('lib/pianoroll.js'),PP=require('lib/sound-document.js'),PL=require('lib/pagelayout.js');
// A format change may reflow the open score, never somebody else's prose or pen.
export async function plan(api,bookId,cardId,spec){
  await C.settleDesk(api,bookId);
  const all=(await C.tableOf(bookId).pagesAll(api)).rows||[];let reflow=false;
  for(const p of all){for(const zone of ['header','footer'])if(!PL.zoneFit(p[zone]||'',spec,zone).ok)throw Error('The '+zone+' of “'+p.title+'” will not fit. Shorten it before changing paper; nothing changed.');
    if(!PL.zoneFit(p.content||'',spec,'body').ok){if(p.cardId!==cardId)throw Error('Another card has pages too full for this paper. Reflow that card first; the book has not changed.');reflow=true;}}
  if(!reflow)return null;
  const before=await C.listPages(api,bookId,cardId),doc=P.document([],before);if(doc.error||!doc.data||before.some(p=>!P.isScoreText(p.content)))throw Error('These source pages need pagination before the paper can shrink. Nothing was clipped or changed.');
  const result=PP.paginate(doc.data,spec);
  if(result.pages.length<before.length)throw Error('This reflow would remove existing page identities. Paginate the source explicitly before changing paper.');
  return {bookId,cardId,before,pages:result.pages,notes:result.noteCount};
}
export async function apply(api,plan){
  if(!plan)return 0;const {bookId,cardId,before,pages}=plan;
  for(const p of before){const live=await C.getPage(api,bookId,p.id);if(!live||live.content!==p.content||live.header!==p.header||live.footer!==p.footer)throw Error('The score changed during paper preflight. Try again; no reflow was started.');}
  try{await C.silently(async()=>{for(let i=0;i<pages.length;i++){const id=before[i]?.id||await C.createPage(api,bookId,cardId,{title:pages[i].title});await C.setPageContent(api,bookId,id,pages[i].content);}});await C.settleDesk(api,bookId);return await C.listPages(api,bookId,cardId);}catch(e){await restore(api,bookId,before);throw e;}
}

export async function restore(api,bookId,pages,expected){
  if(!pages?.length)return;const cardId=pages[0].cardId;
  if(expected){const now=await C.listPages(api,bookId,cardId);if(now.length!==expected.length||expected.some(p=>{const n=now.find(r=>r.id===p.id);return !n||n.content!==p.content||n.header!==p.header||n.footer!==p.footer;}))throw Error('The reformatted score has newer edits. They were kept; paper undo was refused.');}
  const packed=JSON.stringify(pages);
  await api.sql`DELETE FROM pages WHERE bookId=${bookId} AND cardId=${cardId} AND id NOT IN (SELECT json_extract(value,'$.id') FROM json_each(${packed}));
    INSERT OR REPLACE INTO pages (id,bookId,cardId,sortKey,title,content,header,footer)
    SELECT json_extract(value,'$.id'),${bookId},${cardId},json_extract(value,'$.sortKey'),json_extract(value,'$.title'),json_extract(value,'$.content'),COALESCE(json_extract(value,'$.header'),''),COALESCE(json_extract(value,'$.footer'),'') FROM json_each(${packed});`;
  GRAPH.invalidate(bookId);await C.reindexNow(api,bookId,cardId);
}
