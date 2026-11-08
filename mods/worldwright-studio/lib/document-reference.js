// Ordinary card links. Immutable, already-loaded snapshots in; no SQL, fetch or ticks.
const IDS=require('lib/ids.js'),NATIVE=require('lib/sound-document.js'),PIANO=require('lib/pianoroll.js');
export const VERSION=1;
export const MAX_SOURCES=256;
const ASSET_EDITORS=['pose','model','set','level','texture','material','path'];
const copy=v=>JSON.parse(JSON.stringify(v));
const text=v=>String(v==null?'':v);
export function idOf(value){
 const raw=text(value).trim(),m=/^#\[\s*([a-z0-9]+)\s*\]$/i.exec(raw),id=m?m[1]:raw;
 return IDS.isValidId(id)||IDS.isValidId(id.toLowerCase())?id.toLowerCase():'';
}
function result(card,kind,sound,extra){return {ok:true,id:idOf(card?.id),bookId:text(card?.bookId),editor:text(card?.editor),kind,sound,...extra};}
function refused(card,kind,code,error,sound=false){return result(card,kind,sound,{ok:false,code,error});}
function body(row){if(row.content!=null&&row.body!=null&&row.content!==row.body)throw Error('Conflicting content/body fields');return text(row.content??row.body);}
function family(row){
 const s=body(row).trim();if(!s)return 'empty';
 if(/^WWS Arrangement\b/.test(s))return 'arrangement';
 if(s[0]!=='{')return 'prose';
 if(NATIVE.isNative(s))return 'score';
 if(NATIVE.isInstrumentRef(s))return 'instrument';
 let d;try{d=NATIVE.parseJSON(s);}catch(e){return 'unknown';}
 if(d.version===1&&Array.isArray(d.tracks)&&Array.isArray(d.clips))return 'arrangement';
 if(ASSET_EDITORS.includes(d.mode))return 'asset';
 return 'unknown';
}
function frozen(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);for(const k of Object.keys(v))frozen(v[k]);}return v;}
export function resolveCard(snapshot){
 const card=snapshot?.card;
 if(!card||!idOf(card.id))return refused(card,'missing','missing-card','Card was not loaded or is missing.');
 if(snapshot.error)return refused(card,'unavailable','read-failed',text(snapshot.error));
 if(snapshot.trashed||card.trashed)return refused(card,'missing','trashed-card','Card is in Trash.');
 if(card.editor!=null&&typeof card.editor!=='string')return refused(card,'ambiguous','invalid-editor','Saved editor metadata is malformed.');
 const editor=text(card.editor);
 // Explicit Prose/asset choices never inspect their contents for an audio fallback.
 if(editor==='source')return result(card,'prose',false);
 if(ASSET_EDITORS.includes(editor))return result(card,'asset',false,{assetType:editor});
 if(editor&&!['piano','arrangement'].includes(editor))return refused(card,'unsupported','unknown-editor','Unknown saved editor "'+editor+'"; no audio fallback.');
 try{
  const pages=snapshot.pages,sections=snapshot.sections;
  if(!Array.isArray(pages)||!Array.isArray(sections))throw Error('A complete page/section snapshot is required.');
  if(pages.length>NATIVE.LIMITS.pages||sections.length>NATIVE.LIMITS.sections||NATIVE.bytes(JSON.stringify(snapshot))>NATIVE.LIMITS.snapshotBytes)throw Error('Document snapshot exceeds its bounded read size.');
  for(const rows of [pages,sections]){const ids=new Set();for(const row of rows){if(!row||typeof row!=='object')throw Error('Malformed document row.');if(row.cardId&&idOf(row.cardId)!==idOf(card.id))throw Error('Cross-card document row.');if(row.id&&ids.has(row.id))throw Error('Duplicate document row identity.');if(row.id)ids.add(row.id);if(NATIVE.bytes(body(row))>NATIVE.LIMITS.bytes)throw Error('Document row is too large.');}}
  const pageKinds=pages.map(family),sourceSections=sections.filter(s=>!/^Instrument:/i.test(text(s.name))),sectionKinds=sourceSections.map(family);
  const kinds=[...new Set([...pageKinds,...sectionKinds].filter(k=>!['empty','prose','unknown'].includes(k)))];
  if(kinds.length>1)return refused(card,'ambiguous','ambiguous-document','Several structured document types exist on this card; choose an authoritative source.');
  const kind=kinds[0]||'';
  if(editor==='arrangement'){
   if(kind&&kind!=='arrangement')return refused(card,'ambiguous','editor-conflict','Saved Arrangement editor conflicts with its structured document.');
   return refused(card,'arrangement','arrangement-playback-unsupported','Arrangement scene playback is not supported: no validated compiled-arrangement source is available. Export an approved recording explicitly; no clip is guessed.',true);
  }
  if(editor==='piano'&&kind&&kind!=='score'&&kind!=='instrument')return refused(card,'ambiguous','editor-conflict','Saved DAW editor conflicts with its structured document.');
  if(kind==='arrangement')return refused(card,'arrangement','arrangement-playback-unsupported','Arrangement scene playback needs a validated compiled-arrangement source; none is wired.',true);
  if(kind==='asset')return result(card,'asset',false);
  if(kind==='instrument'||!kind&&sections.some(s=>/^Instrument:/i.test(text(s.name)))){
   NATIVE.catalog(sections);
   for(const row of [...pages,...sourceSections])if(family(row)==='instrument'){
    const s=body(row),v=NATIVE.decodeInstrument(s,sections);
    if(v.error)throw Error(v.error);
   }
   return result(card,'instrument',false);
  }
  if(kind!=='score'){
   if(editor==='piano')return refused(card,'score','native-score-required','DAW links require a valid wws-score document and named Instrument sections. Save a native score first.',true);
   if(pageKinds.includes('unknown')||sectionKinds.includes('unknown'))return refused(card,'unsupported','unknown-document','Malformed or unsupported structured data; no audio fallback.');
   return result(card,'prose',false);
  }
  // Score pages contain only native score data.
  if(pageKinds.some(k=>k!=='empty'&&k!=='score'))return refused(card,'ambiguous','mixed-score-source','Native score and non-native source pages/sections cannot be silently merged.');
  const doc=PIANO.document(sections,pages);if(doc.error)throw Error(doc.error);
  const source=PIANO.normalize(doc.data);if(source.error)throw Error(source.error);
  return result(card,'score',true,{format:NATIVE.FORMAT,source,data:doc.data,pageIds:doc.pageIds||[doc.pageId].filter(Boolean)});
 }catch(e){return refused(card,editor==='piano'?'score':'invalid','invalid-document',text(e.message||e),editor==='piano');}
}
export function audioOf(resolved){
 if(!resolved?.ok)return {error:resolved?.error||'Card source was not loaded.'};
 if(!resolved.sound||!resolved.source)return {error:'Card '+resolved.id+' is '+resolved.kind+', not a playable sound document; no audio fallback.'};
 return resolved.source;
}
export function createResolver(snapshots){
 if(!Array.isArray(snapshots)||snapshots.length>MAX_SOURCES)throw Error('Supply at most '+MAX_SOURCES+' document snapshots per compile.');
 const rows=new Map(),cache=new Map(),counts={requests:0,classified:0,cacheHits:0,sql:0};
 for(const snapshot of snapshots){const id=idOf(snapshot?.card?.id);if(!id)throw Error('Document snapshot needs its stable card ID.');rows.set(id,rows.has(id)?{card:{id},error:'Ambiguous duplicate card snapshots.'}:copy(snapshot));}
 function resolve(ref){
  counts.requests++;const id=idOf(ref);
  if(cache.has(id)){counts.cacheHits++;return cache.get(id);}
  counts.classified++;const value=frozen(id?resolveCard(rows.get(id)||{card:{id},error:'Card '+id+' is missing or was not loaded.'}):refused(null,'missing','invalid-reference','Use one ordinary saved card ID, not a typed source or display name.'));
  cache.set(id,value);return value;
 }
 return {resolve,source:cue=>audioOf(resolve(typeof cue==='string'?cue:cue?.source)),receipt:()=>({...counts,snapshots:rows.size,cached:cache.size})};
}
export function contract(){return {version:VERSION,input:'{card:{id,bookId,editor},pages,sections}[]; one immutable snapshot per card per compile',precedence:'explicit editor, then unambiguous structured format; no legacy parsing',score:NATIVE.FORMAT,instruments:'Instrument: <stable-id>',arrangement:'visibly refused: compiled scene source not wired',nonSound:['prose','asset','instrument'],maxSources:MAX_SOURCES,sql:0,tickWork:0};}
