// Lossless UI transport only. Shared instrument settings are interned; source pages never change.
export function packSources(sources=[]){
 const voices=[],index=new Map();
 return {version:1,voices,sources:sources.map(source=>{
  if(!source.roll)return source;
  const notes=source.roll.notes.map(note=>{
   if(!['key','at','length','velocity'].every(k=>Object.prototype.hasOwnProperty.call(note,k)))return {raw:note};
   const {key,at,length,velocity,...voice}=note,text=JSON.stringify(voice);let id=index.get(text);
   if(id===undefined){id=voices.length;index.set(text,id);voices.push(voice);}
   return [id,key,at,length,velocity];
  });
  return {...source,roll:{...source.roll,notes}};
 })};
}
export function unpackSources(wire){
 if(!wire||wire.version!==1||!Array.isArray(wire.voices)||!Array.isArray(wire.sources))throw Error('Unsupported arrangement data; reopen the project');
 return wire.sources.map(source=>{
  if(!source.roll)return source;
  return {...source,roll:{...source.roll,notes:source.roll.notes.map(row=>{
   if(row&&Object.prototype.hasOwnProperty.call(row,'raw'))return row.raw;
   if(!Array.isArray(row)||row.length!==5||!Number.isInteger(row[0])||!wire.voices[row[0]])throw Error('Incomplete arrangement data; source notes are safe');
   return {...wire.voices[row[0]],key:row[1],at:row[2],length:row[3],velocity:row[4]};
  })}};
 });
}

// Browser contract: compiled notes and display fields, never duplicate source pages/drafts.
export function viewSources(sources=[]){
 const fields=['id','name','beats','bpm','roll','error','triggered','instruments','noteCount','pageStarts','tail'];
 return sources.map(source=>{const out={};for(const key of fields)if(Object.prototype.hasOwnProperty.call(source,key))out[key]=source[key];return out;});
}

export function wireBytes(value){let n=0;for(const c of JSON.stringify(value)){const p=c.codePointAt(0);n+=p<128?1:p<2048?2:p<65536?3:4;}return n;}
// Preflight the complete reply before sending any part; never truncate a dense chord.
export function previewPackets(roll,base,limits){const parts=[];
 function add(notes){const packed=packSources([{id:'window',roll:{...roll,notes}}]),p={...base,kind:'window',part:limits.packetParts,parts:limits.packetParts,packed};
  if(wireBytes({name:'wws-arrangement-window',payload:p})>limits.packetBytes){if(notes.length<2)throw Error('One preview instrument exceeds the note-packet limit; source kept');const mid=Math.floor(notes.length/2);add(notes.slice(0,mid));add(notes.slice(mid));return;}
  parts.push(packed);if(parts.length>limits.packetParts)throw Error('This preview slice exceeds the bounded packet count; source kept');
 }
 if(!roll.notes.length)add([]);else for(let i=0;i<roll.notes.length;i+=limits.batch)add(roll.notes.slice(i,i+limits.batch));
 return parts.map((packed,part)=>({...base,kind:'window',part,parts:parts.length,packed}));
}
