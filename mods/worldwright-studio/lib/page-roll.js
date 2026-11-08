const INSTRUMENT=require("lib/instrument-data.js");
const PIANO=require("lib/pianoroll.js");
const C=require("lib/cards.js");
const EDITOR=require("lib/editor-registry.js");
const FENCE=require("lib/writefence.js");
const PIN=require("lib/pinned.js");
export async function choice(api,book,card){return EDITOR.value((await C.getCard(api,book,card))?.editor);}
export async function mode(api,doc){
 if(!doc||!doc.cardId||doc.bookId===PIN.ID)return false;
 const card=await C.getCard(api,doc.bookId,doc.cardId);
 if(!card)throw Error('The card no longer exists');
 const result=EDITOR.resolve(card);
 if(result.error)throw Error(result.error);
 return result.editor==='piano';
}
export function validateMode(doc,on){
  if(!doc||!doc.cardId||!doc.bookId)throw Error("Open a card first");
  if(!FENCE.mayWrite()||PIN.isLocked(doc.bookId)||doc.pen&&doc.pen.mine===false)throw Error("Pick up this page’s pen before changing its editor");
  if(on&&doc.bookId===PIN.ID)throw Error("Research is for prose. Create the score in Sound studio.");
  const text=String(doc.page&&doc.page.content||"");
  if(on&&text.trim()&&(!INSTRUMENT.isDocument(text)&&(!PIANO.isScoreText(text)||PIANO.parseDocument(text,doc.sections).error)))throw Error("This page contains prose or invalid notes. Use a blank page or correct its score first; nothing was replaced.");
  return true;
}
export async function setMode(api,doc,on,assetMode=""){
  const sections=on&&doc?.cardId&&doc?.bookId?await C.listSections(api,doc.bookId,doc.cardId):[];
  validateMode({...doc,sections},on);
  const editor=EDITOR.validate(assetMode||(on?'piano':'source'));
  const before=await C.getCard(api,doc.bookId,doc.cardId);
  if(!before)throw Error('The card no longer exists');
  if(before.editor!==editor)await C.setMeta(api,doc.bookId,doc.cardId,{editor});
  await C.landed(api,doc.bookId,'card',doc.cardId,{editor});
  const ui=api.getState().ui||{},cards=ui.cards||{};
  if(cards.card?.id===doc.cardId&&cards.pageDoc?.bookId===doc.bookId)api.patchState({ui:{...ui,cards:{...cards,card:{...cards.card,editor},meta:cards.meta?.card?.id===doc.cardId?{...cards.meta,card:{...cards.meta.card,editor}}:cards.meta,pageDoc:{...cards.pageDoc,editor}}}});
  return on;
}

export function navigationMode(previous,bookId,cardId,explicit){
  if(explicit!==undefined)return explicit;
  // Navigation re-reads the card; a previous page cannot override its metadata.
  return undefined;
}
