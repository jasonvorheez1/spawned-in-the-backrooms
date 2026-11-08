// Native document repository and verified Save receipts.
const C=require('lib/cards.js'),D=require('lib/sound-document.js'),STORE=require('lib/store.js');
export async function snapshot(api,bookId,cardId){return C.readSoundDocument(api,String(bookId),String(cardId));}
export async function receipt(api,options){const o=options||{},rows=(await STORE.soundReceipt(api,o.bookId,o.cardId,o.id)).rows||[];if(rows.length!==1)return {ok:false,status:rows.length?'ambiguous':'not-found',receipt:o.id};
 const row=rows[0],before=JSON.parse(row.before),after=JSON.parse(row.after),live=await snapshot(api,o.bookId,o.cardId);return {ok:row.lamport===0&&D.canonical(live)===D.canonical(after),status:row.lamport===0?(D.canonical(live)===D.canonical(after)?'verified':'superseded'):'unknown',receipt:row.id,before,after};
}
