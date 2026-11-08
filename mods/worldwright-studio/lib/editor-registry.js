// Opening reads card metadata only. Structural parsing below is an explicit
// inspection helper, never automatic editor routing; adapters validate after selection.
export const EDITORS=[
 {editor:'source',kind:'source',window:'source',label:'Prose / source'},
 {editor:'piano',kind:'score',window:'piano',label:'Sound Studio / DAW'},
 {editor:'arrangement',kind:'arrangement',window:'arrangement',label:'DAW arrangement'},
 ...[['pose','Pose / animation'],['model','Model'],['set','Object set'],['level','Level Design'],['texture','2D / texture'],['material','Material'],['path','3D path']].map(([editor,label])=>({editor,kind:editor,window:'asset',label}))
];
export function get(editor){return EDITORS.find(e=>e.editor===editor)||null;}
function result(editor,extra){return {...(get(editor)||{editor:'',kind:'ambiguous',window:''}),error:'',...extra};}
function refusal(message){return result('',{error:'Automatic: '+message+'. Choose an editor in Metadata; saved content is unchanged.'});}
function candidates(d){
 if(!d||typeof d!=='object'||Array.isArray(d))return [];
 const found=[];
 if(d.format==='wws-score'&&d.version===1)found.push('piano');
 if(d.version===1&&Array.isArray(d.tracks)&&Array.isArray(d.clips))found.push('arrangement');
 if(d.version===1&&get(d.mode)?.window==='asset')found.push(d.mode);
 if(d.format==='wws-instrument-ref'&&d.version===1)found.push('piano');
 return [...new Set(found)];
}
function parse(text){const d=JSON.parse(text);return d?.encoding==='wws-asset-json/1'&&Array.isArray(d.chunks)&&d.chunks.every(c=>typeof c==='string')?JSON.parse(d.chunks.join('')):d;}
export function classify(pages){
 const texts=(pages||[]).map(p=>String(p.content??p.body??'').trim()).filter(Boolean);
 if(!texts.length)return result('source');
 const envelopes=texts.map(t=>/^WWS Arrangement 1\r?\nPart: (\d+)\/(\d+)\r?\n([\s\S]*)$/.exec(t));
 if(envelopes.some(Boolean)){
  if(envelopes.some(m=>!m))return refusal('mixed arrangement and other content');
  envelopes.sort((a,b)=>+a[1]-+b[1]);
  if(envelopes.some((m,i)=>+m[1]!==i+1||+m[2]!==envelopes.length))return refusal('missing or duplicate arrangement parts');
  try{const found=candidates(parse(envelopes.map(m=>m[3]).join('\n')));return found.length===1&&found[0]==='arrangement'?result('arrangement'):refusal('ambiguous arrangement structure');}catch(e){return refusal('invalid arrangement structure');}
 }
 const structural=texts.map(t=>/^[{[]/.test(t));
 if(!structural.some(Boolean))return result('source'); // Fenced examples and prose stay prose.
 let docs;
 try{docs=[parse(texts.join('\n'))];}catch(e){
  if(!structural.every(Boolean))return refusal('structured data is mixed with prose or incomplete parts');
  try{docs=texts.map(parse);}catch(e){return refusal('invalid or incomplete structured document');}
 }
 const matches=docs.map(candidates),unique=[...new Set(matches.flat())];
 if(matches.some(m=>m.length!==1)||unique.length!==1)return refusal('document structure is unknown or matches several editors');
 return result(unique[0]);
}
export function resolve(card,pages){
 const selected=String(card?.editor||'');
 if(selected){const entry=get(selected);if(!entry)throw Error('Unknown card editor: '+selected);return {...entry,selected,error:''};}
 return {...result('source'),selected:''};
}

// Metadata choices and labels share the same registry as routing.
export const LABELS=Object.fromEntries(EDITORS.map(e=>[e.editor,e.label]));
export function value(v){return get(String(v||''))?String(v):'';}
export function validate(v){const s=String(v??'');if(s&&!value(s))throw Error('Unknown card editor');return s;}
export function label(v){return LABELS[value(v)]||'Automatic';}
export function route(card){validate(card?.editor||'');return resolve(card);}
