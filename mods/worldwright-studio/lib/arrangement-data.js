const PL=require('lib/pagelayout.js'),W=require('lib/score-width.js');
export const BOOK='0MUSIC00BOOK0';
export const LIMITS={tracks:16,clips:128,bpmMin:30,bpmMax:300,beats:4096,folders:256,cards:1024,sourceNotes:16384,previewNotes:4096,pages:256,bytes:131072,history:100,beatPixels:28,rowHeight:52,maxGain:4};
export const TITLE='Arrangement';
export function blank(){return {version:1,bpm:120,tracks:Array.from({length:8},()=>({mute:false,solo:false})),clips:[]};}
function exact(o,keys,label){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))throw Error('Unknown '+label+' fields; nothing was replaced');}
function num(n,min,max,label){if(!Number.isFinite(n)||n<min||n>max)throw Error(label+' must be '+min+'–'+max);}
export function validate(input){
 exact(input,['version','bpm','tracks','clips'],'arrangement');if(input.version!==1)throw Error('Unsupported arrangement version');
 num(input.bpm,30,300,'Tempo');if(!Array.isArray(input.tracks)||(input.tracks.length<1||input.tracks.length>LIMITS.tracks))throw Error('An arrangement needs 1–16 tracks');
 for(const t of input.tracks){exact(t,['mute','solo'],'track');if(typeof t.mute!=='boolean'||typeof t.solo!=='boolean')throw Error('Mute and solo must be booleans');}
 if(!Array.isArray(input.clips)||input.clips.length>128)throw Error('An arrangement holds up to 128 clips');
 const ids=new Set();for(const c of input.clips){exact(c,['id','cardId','start','length','track','gain'],'clip');
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(c.id)||ids.has(c.id))throw Error('Missing or duplicate clip ID');ids.add(c.id);
 if(typeof c.cardId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(c.cardId))throw Error('A clip needs its original card ID');
 num(c.start,0,4096,'Start');num(c.length,1/64,4096,'Length');if(c.start+c.length>4096)throw Error('The clip ends beyond beat 4096');
 num(c.track,1,input.tracks.length,'Track');if(!Number.isInteger(c.track))throw Error('Track must be an integer');num(c.gain,0,LIMITS.maxGain,'Gain');}
 return JSON.parse(JSON.stringify(input));
}
export function fingerprint(pages){return JSON.stringify(pages.map(p=>({id:p.id,cardId:p.cardId,bookId:p.bookId||BOOK,sortKey:p.sortKey,title:p.title,content:p.content||'',header:p.header||'',footer:p.footer||''})));}
// Readable, one JSON field per line. Every page is numbered; continuation pages are never dropped.
export function paginate(data,spec){
 const d=validate(data),lines=JSON.stringify(d,null,2).split('\n');if(lines.some(l=>!W.fits(l,spec)))throw Error('This paper is too narrow for an arrangement reference');
 const chunks=[];let chunk=[];const head='WWS Arrangement 1\nPart: 256/256\n';
 for(const l of lines){if(!PL.zoneFit(head+[...chunk,l].join('\n'),spec,'body').ok){if(!chunk.length)throw Error('This paper is too short for an arrangement');chunks.push(chunk);chunk=[];}chunk.push(l);}
 if(chunk.length)chunks.push(chunk);if(chunks.length>LIMITS.pages)throw Error('Arrangement exceeds 256 numbered pages');
 const pages=chunks.map((c,i)=>({title:TITLE,content:'WWS Arrangement 1\nPart: '+(i+1)+'/'+chunks.length+'\n'+c.join('\n')}));
 if(pages.some(p=>!PL.zoneFit(p.content,spec,'body').ok))throw Error('Arrangement does not fit the page');return pages;
}
export function read(pages){
 if(!pages.length||pages.every(p=>!(p.content||'').trim()))return null;
 if(pages.length>LIMITS.pages)throw Error('Too many arrangement pages');let bytes=0,parts=[];
 for(const p of pages){const text=String(p.content||'');bytes+=text.length;if(bytes>LIMITS.bytes)throw Error('Arrangement document is too large');if(!text.trim())continue;
 const m=/^WWS Arrangement 1\r?\nPart: (\d+)\/(\d+)\r?\n([\s\S]*)$/.exec(text);if(!m)throw Error('This card contains an older, unknown or invalid document; source pages kept');parts.push({index:+m[1],count:+m[2],text:m[3]});}
 parts.sort((a,b)=>a.index-b.index);if(parts.some((p,i)=>p.index!==i+1||p.count!==parts.length))throw Error('Missing or duplicate arrangement part');return validate(JSON.parse(parts.map(p=>p.text).join('\n')));
}
export function warnings(data,sources){const byId=new Map((sources||[]).map(s=>[s.id,s])),out=[];
 for(const c of data.clips){const s=byId.get(c.cardId),prefix='Clip '+c.id+': ';if(!s)out.push(prefix+'missing source '+c.cardId);else if(s.error)out.push(prefix+s.error);else {if(c.length>s.beats)out.push(prefix+'length extends beyond source; remaining beats are silent');if(s.triggered)out.push(prefix+'event-triggered notes require scene events; preview refused');}}
 return out;
}
