const WIDTH=require('lib/score-width.js');
export const LIMITS={name:64,seconds:300,gain:2,root:60,uploadBytes:49000000};
export const EDITS={tune:[-1200,1200,0],attack:[0,5,0.004],release:[0,10,0.012],highpass:[0,23999,0],lowpass:[20,24000,24000],pan:[-1,1,0]};
export function validate(value){
  const s=value||{},clip=String(s.clip||'').trim(),name=String(s.name||'Clip').trim(),mode=s.mode||'sfx',root=s.root==null?60:s.root,start=s.start==null?0:s.start,end=s.end==null?null:s.end,gain=s.gain==null?1:s.gain,loop=s.loop==null?false:s.loop;
  if(!/^\/?cdn\/[A-Za-z0-9_./%+@-]+\.(?:mp3|wav|ogg|flac|m4a|aac|webm)(?:\?[A-Za-z0-9_./%+@=&:-]+)?$/i.test(clip)||clip.includes('..'))return {error:'Use an uploaded or CDN audio reference (.mp3, .wav, .ogg, .flac, .m4a, .aac or .webm)'};
  if(!name||name.length>LIMITS.name||/[,\[\]\r\n]/.test(name))return {error:'Clip name is 1–64 characters without commas or brackets'};
  if(!['sfx','pitched'].includes(mode))return {error:'Clip mode must be sfx or pitched'};
  if(!Number.isInteger(root)||root<0||root>127)return {error:'Root pitch is MIDI 0–127'};
  if(!Number.isFinite(start)||start<0||start>=LIMITS.seconds||end!==null&&(!Number.isFinite(end)||end<=start||end>LIMITS.seconds))return {error:'Trim start/end are seconds within 0–300; end must follow start'};
  if(!Number.isFinite(gain)||gain<0||gain>LIMITS.gain||typeof loop!=='boolean')return {error:'Clip gain is 0–2 and loop is true or false'};
  const sample={clip,name,mode,root,start,end,gain,loop};
  if(s.ringOut!=null){if(!Number.isFinite(s.ringOut)||s.ringOut<0||s.ringOut>10||loop||s.bank)return {error:'Ring-out is 0–10 seconds on a non-looping custom recording, not a recorded-bank recipe'};sample.ringOut=s.ringOut;}
  if(s.bowStop!=null){if(s.bowStop!==1||s.bank!=='ldk1609')return {error:'Unknown bow-stop recipe'};sample.bowStop=s.bowStop;}
  if(s.performance!=null){if(!['natural','compact'].includes(s.performance))return {error:'Performance is natural or compact'};sample.performance=s.performance;}
  if(s.bank!=null){if(s.bank!=="ldk1609"||!require("lib/data/ldk1609.js").ARTICULATIONS.includes(s.articulation))return {error:"Unknown recorded violin bank or articulation"};sample.bank=s.bank;sample.articulation=s.articulation;}else if(s.articulation!=null)return {error:"An articulation needs its recorded bank"};
  for(const k of Object.keys(EDITS))if(s[k]!=null){const [lo,hi]=EDITS[k];if(!Number.isFinite(s[k])||s[k]<lo||s[k]>hi)return {error:k+" must be "+lo+"–"+hi};sample[k]=s[k];}
  if((sample.highpass||0)>=(sample.lowpass||24000))return {error:'High-pass must be below low-pass'};
  if(s.reverse!=null){if(typeof s.reverse!=="boolean")return {error:'Reverse must be true or false'};sample.reverse=s.reverse;}
  if(s.channel!=null){if(!['stereo','mono','left','right'].includes(s.channel))return {error:'Choose stereo, mono, left or right'};sample.channel=s.channel;}
  if(s.cardId!=null){if(!/^[A-Za-z0-9_-]{1,96}$/.test(s.cardId))return {error:'Invalid instrument card reference'};sample.cardId=s.cardId;}
  return {sample};
}
export function ringTail(n){const s=n?.sample,v=s?.ringOut;return n?.instrument==='clip'&&!s.loop&&!s.bank&&Number.isFinite(v)&&v>0&&v<=10?v:0;}
export function signature(value){const v=validate(value);return v.error?'invalid:'+v.error:JSON.stringify(v.sample);}
export function read(text){const samples={},re=/#\[instrument\s*:[^\]]*\]/gi;let m,count=0;while((m=re.exec(text))){count++;const fields=m[0].replace(/^#\[instrument\s*:/i,'').slice(0,-1).split(',').map(x=>x.trim()),head=/^track\s+([1-8])$/i.exec(fields.shift()||'');if(!head)return {error:'Instrument declaration starts with track 1–8'};const track=Number(head[1]);if(samples[track])return {error:'Repeated clip instrument declaration for track '+track};const s={},seen=new Set();for(const field of fields){const f=/^(clip|name|mode|root|start|end|gain|loop|tune|attack|release|highpass|lowpass|pan|reverse|channel|cardId)\s+(.+)$/i.exec(field);if(!f)return {error:'Unknown clip instrument field: '+field};const k=f[1].toLowerCase()==='cardid'?'cardId':f[1].toLowerCase(),raw=f[2].replace(/\s+/g,' ').trim();if(seen.has(k))return {error:'Repeated clip instrument field: '+k};seen.add(k);s[k]=['root','start','gain',...Object.keys(EDITS)].includes(k)?Number(raw):k==='end'?(raw==='natural'?null:Number(raw)):['loop','reverse'].includes(k)?(raw==='true'?true:raw==='false'?false:raw):raw;}const v=validate(s);if(v.error)return v;samples[track]=v.sample;}if((String(text).match(/#\[instrument\s*:/gi)||[]).length!==count)return {error:'Unclosed clip instrument declaration'};return {samples};}
export function declarations(tracks,spec){const out=[];for(let i=0;i<tracks.length;i++){const t=tracks[i];if(t.instrument!=='clip')continue;const v=validate(t.sample);if(v.error)throw Error(v.error);const s=v.sample,tag=`#[instrument: track ${i+1}, clip ${s.clip}, name ${s.name}, mode ${s.mode}, root ${s.root}, start ${s.start}, end ${s.end==null?'natural':s.end}, gain ${s.gain}, loop ${s.loop}${[...Object.keys(EDITS),"reverse","channel","cardId"].filter(k=>s[k]!=null).map(k=>", "+k+" "+s[k]).join("")}]`;out.push(spec?WIDTH.wrap(tag,spec):tag);}return out;}
