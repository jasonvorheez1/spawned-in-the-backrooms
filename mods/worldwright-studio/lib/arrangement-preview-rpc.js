import {unpackSources} from './arrangement-wire.js';
import {PREVIEW} from './data/arrangement-preview.js';
export function createPageReader(context){
 const identity=window.__wwarrReaderSerial=(window.__wwarrReaderSerial||0)+1;let serial=0,closed=false,previewId="";const pending=new Map();
 function consume(p){const q=p&&pending.get(p.requestId);if(!q)return;const s=context();if(p.cardId!==s.cardId||p.folderId!==s.folderId||p.loadKey!==s.loadKey)return;
  function finish(error,value){pending.delete(p.requestId);clearTimeout(q.timer);if(error)q.reject(error);else q.resolve(value);}
  if(p.kind==='error'){finish(Error(p.message));return;}
  try{const count=p.parts??1,index=p.part??0;if(!Number.isInteger(count)||count<1||count>PREVIEW.packetParts||!Number.isInteger(index)||index<0||index>=count||q.count&&q.count!==count)throw Error('Incomplete preview slice');q.count=count;
   if(q.parts.has(index))return;const roll=unpackSources(p.packed)[0]?.roll;if(!roll)throw Error('Missing preview notes');q.parts.set(index,roll);
   if(q.parts.size!==count)return;const chunks=Array.from({length:count},(_,i)=>q.parts.get(i)),first=chunks[0];if(chunks.some(r=>r.duration!==first.duration||r.bpm!==first.bpm||r.beats!==first.beats))throw Error('Mismatched preview slice');finish(null,{...first,notes:chunks.flatMap(r=>r.notes)});
  }catch(e){finish(e);}
 }
 const off=window.spawn.on('event',(name,p)=>{if(name==='wws-arrangement-window')consume(p);});
 function cancel(){previewId='';for(const q of pending.values()){clearTimeout(q.timer);q.reject(Error('Preview cancelled'));}pending.clear();}
 function request(data,from,extra){if(closed)return Promise.reject(Error('Preview closed'));const s=context(),requestId=identity+':'+s.loadKey+':'+(++serial);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Notes timed out — press Play to retry'));},PREVIEW.requestMs);pending.set(requestId,{resolve,reject,timer,count:0,parts:new Map()});window.sendAction('arrangement',{op:'previewWindow',requestId,loadKey:s.loadKey,cardId:s.cardId,folderId:s.folderId,data,from,...extra});});}
 return {consume,cancel,read:(data,from,to,held)=>request(data,from,{to,held}),readBatch(data,from,index,initial){if(initial)previewId=identity+':batch:'+(serial+1);return request(data,from,{mode:initial?'initial':'more',previewId,index});},dispose(){closed=true;cancel();off();}};
}
