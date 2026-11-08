const MIX=require('lib/arrangement-transport.js'),WIRE=require('lib/arrangement-wire.js'),CFG=require('lib/data/arrangement-preview.js');
const {ringTail}=require('lib/clip-instrument-data.js');
const CACHE=new Map(),seat=api=>String(api.id||api.self?.id||'');
export function resident(api,key){return CACHE.get(seat(api))?.loadKey===key;}
export function clear(api){CACHE.delete(seat(api));}
export function seed(api,loadKey,sources,recovered=false){CACHE.set(seat(api),{loadKey,sources,recovered});}
export async function handle(api,a,recover){
 const s=api.getState().ui?.arrangement;let c=CACHE.get(seat(api));
 if(!s?.open||s.loading||s.loadKey!==a.loadKey||s.cardId!==a.cardId||s.folderId!==a.folderId)return;
 const base={requestId:a.requestId,loadKey:a.loadKey,cardId:a.cardId,folderId:a.folderId};let packets;
 try{
  if((!c||c.loadKey!==s.loadKey)&&recover){await recover();const now=api.getState().ui?.arrangement;if(!now?.open||now.loadKey!==s.loadKey||now.cardId!==s.cardId)return;c=CACHE.get(seat(api));}
  if(!c||c.loadKey!==s.loadKey)throw Error('Reopen the arrangement to refresh its source pages');
  let roll;
  if(a.mode==='initial'||a.mode==='more'){
   if(typeof a.previewId!=='string'||a.previewId.length>120)throw Error('Invalid preview session');
   if(a.mode==='initial'||!c.preview&&c.recovered){c.preview={id:a.previewId,from:a.from,roll:MIX.compile(a.data,c.sources,{maxNotes:16384}).roll};c.recovered=false;}
   const preview=c.preview;if(!preview||preview.id!==a.previewId||preview.from!==a.from)throw Error('Preview changed; press Play again');
   roll=noteBatch(preview.roll,a.from,a.index||0,a.mode==='initial');
  }else{
   if(!Number.isFinite(a.from)||!Number.isFinite(a.to)||a.from<0||a.to<=a.from||a.to-a.from>CFG.barSeconds(a.data)+.001)throw Error('Invalid preview note window');
   roll=MIX.compile(a.data,c.sources,{maxNotes:16384,window:{from:a.from,to:a.to,held:!!a.held}}).roll;
  }
  packets=WIRE.previewPackets(roll,base,CFG.PREVIEW);
 }catch(e){packets=[{...base,kind:'error',message:String(e.message||e).slice(0,500)}];}
 // The reader subscribes before requesting. These are private transient replies,
 // not document state: no SQL, shared-state replication or whole-HUD repaint.
 for(const payload of packets)api.emit('uiEvent',{name:'wws-arrangement-window',payload},{audience:{player:seat(api).replace(/^god\//,'')}});
}

// The sorted compiler output is immutable. A boundary never splits a chord.
export function noteBatch(roll,from,index=0,initial=false){
 if(!Number.isFinite(from)||from<0||from>=roll.duration||!Number.isInteger(index)||index<0)throw Error('Invalid preview cursor');
 const notes=roll.notes.filter(n=>n.at+n.length+ringTail(n)>from),total=notes.length;
 if(index>total||initial&&index!==0)throw Error('Invalid preview note offset');
 let end=Math.min(total,index+(initial?Math.ceil(total/2):CFG.PREVIEW.feedNotes));
 while(end<total&&end>index&&(notes[end].at<=from||notes[end].at===notes[end-1].at))end++;
 return {...roll,notes:notes.slice(index,end),prepared:{index,next:end,total,until:end<total?notes[end].at:roll.duration,done:end===total}};
}
