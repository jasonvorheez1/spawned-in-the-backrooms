const SYNTH=require('lib/synth-data.js');
const CLIPS=require("lib/clip-instrument-data.js");
const ROLL_SETTINGS=require("lib/roll-settings.js");
const SCORE_WIDTH=require("lib/score-width.js");
// Native score data and runtime scheduling.
export const VERSION=1;
export const LIMITS={tracks:8,notes:2048,chordNotes:10,tagColumns:72,seconds:300,events:32,bpmMin:20,bpmMax:400};
export const INSTRUMENTS={piano:{sampled:true},bell:{wave:"sine",attack:0.002,decay:0.8},synth:{wave:"sawtooth",attack:0.008,decay:0.7},clip:{sampled:true,custom:true}};
export function fadeSeconds(value) {
  if(typeof value==="number")return Number.isFinite(value)&&value>=0&&value<=LIMITS.seconds?value:null;
  const m=/^(\d+(?:\.\d+)?|\.\d+)(ms|s)?$/i.exec(String(value).trim());
  const n=m?Number(m[1])/(m[2]&&m[2].toLowerCase()==="ms"?1000:1):NaN;
  return Number.isFinite(n)&&n>=0&&n<=LIMITS.seconds?n:null;
}
export function eventName(value) {
  const name=String(value==null?"":value).trim().replace(/^event:/i,"");
  return !name||/^[A-Za-z0-9_][A-Za-z0-9_:./-]{0,79}$/.test(name)?name:null;
}
export function isScoreText(content){return require("lib/sound-document.js").isNative(content);}
export function isPage(page){return isScoreText(page?.content||page?.body||"");}
export function noteName(key) { return ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][((key%12)+12)%12]; }
export function parseDocument(text,sections){return require("lib/sound-document.js").decode(text,sections);}
export function serialize(data,options){return require("lib/sound-document.js").encode(data,options).content;}
export function serializeNative(data,options){return require("lib/sound-document.js").encode(data,options);}
export function document(sections,pages) {
  const found=(pages||[]).filter(isPage);
  const sectionScores=(sections||[]).filter(s=>require("lib/sound-document.js").isNative(s.content));
  if(sectionScores.length>1)return {error:"Several section scores are ambiguous; no documents were merged"};
  if(found.length&&sectionScores.some(s=>require("lib/sound-document.js").isNative(s.content)))return {error:"Both native page and section scores exist; choose the source explicitly"};
  if(found.length>1){
    const parts=found.map(row=>({row,parsed:parseDocument(row.content==null?row.body||"":row.content,sections)}));
    for(const p of parts)if(p.parsed.error)return {error:p.parsed.error};
    if(parts.some(p=>!p.parsed.data.part))return {error:"multiple score pages need native part markers; independent rolls cannot be silently merged"};
    parts.sort((a,b)=>a.parsed.data.part.index-b.parsed.data.part.index);
    const first=parts[0].parsed.data,data={...first,tracks:first.tracks.map(t=>({...t,notes:[]})),pauses:[]};delete data.part;
    for(let i=0;i<parts.length;i++){const d=parts[i].parsed.data;if(d.part.index!==i+1||d.part.count!==parts.length||d.beats!==first.beats||d.bpm!==first.bpm||d.tracks.length!==first.tracks.length||(parts[0].parsed.native&&require("lib/sound-document.js").canonical(d.settings)!==require("lib/sound-document.js").canonical(first.settings))||d.tracks.some((t,j)=>t.instrumentId!==first.tracks[j].instrumentId||t.instrument!==first.tracks[j].instrument||t.instrument==="clip"&&CLIPS.signature(t.sample)!==CLIPS.signature(first.tracks[j].sample)||t.instrument==="synth"&&SYNTH.signature(t.synth)!==SYNTH.signature(first.tracks[j].synth)))return {error:"score pages are missing, duplicated or have conflicting beats/instrument references"};for(let j=0;j<d.tracks.length;j++)data.tracks[j].notes.push(...d.tracks[j].notes);data.pauses.push(...(d.pauses||[]));}
    let configured;try{configured=ROLL_SETTINGS.apply(data,parts[0].row.header);}catch(e){return {error:e.message};}
    const v=normalize(configured);if(v.error)return v;
    return {data:configured,content:"",pageId:parts[0].row.id||"",pageIds:parts.map(p=>p.row.id),source:"pages"};
  }
  const row=found[0]||sectionScores[0];
  if(!row)return {error:"the sound card needs a native Score page",missing:true};
  const content=String(row.content==null?row.body||"":row.content),parsed=parseDocument(content,sections);
  if(parsed.data&&parsed.data.part&&parsed.data.part.count!==1)return {error:"the other numbered score pages are missing"};
  if(parsed.data){try{parsed.data=ROLL_SETTINGS.apply(parsed.data,row.header);}catch(e){return {error:e.message};}}
  return {...parsed,content,pageId:found[0]?row.id||"":"",source:found[0]?"page":"section"};
}
export function read(sections,pages) {
  const doc=document(sections,pages);return doc.error?{error:doc.error}:normalize(doc.data);
}
export function normalize(data) {
  const fail=error=>({error}); const d=data||{}, bpm=d.bpm==null?120:d.bpm;
  if(d.version!==VERSION) return fail("unsupported piano-roll version; expected 1");
  if(d.part&&(!Number.isInteger(d.part.index)||!Number.isInteger(d.part.count)||d.part.index<1||d.part.count<1||d.part.index>d.part.count))return fail("invalid score page part number");
  if(!Number.isFinite(bpm)||bpm<LIMITS.bpmMin||bpm>LIMITS.bpmMax) return fail("piano-roll bpm must be 20–400");
  const duration=d.beats*60/bpm;
  if(!Number.isFinite(d.beats)||!(duration>0)||duration>LIMITS.seconds) return fail("piano roll must last above 0 and at most 300 seconds");
  if(!Array.isArray(d.tracks)||!d.tracks.length||d.tracks.length>LIMITS.tracks) return fail("piano roll needs 1–8 tracks");
  const notes=[], events=new Set();
  for(const t of d.tracks) {
    if(!t || !Object.prototype.hasOwnProperty.call(INSTRUMENTS,t.instrument) || !Array.isArray(t.notes)) return fail("each roll track needs a supported instrument and notes");
    const custom=t.instrument==="clip"?CLIPS.validate(t.sample):null;if(custom&&custom.error)return fail(custom.error);
    const synth=t.instrument==="synth"&&t.synth!==undefined?SYNTH.validate(t.synth):null;if(synth&&synth.error)return fail(synth.error);
    if(t.synth!==undefined&&t.instrument!=="synth")return fail("A synth patch needs a synth track");
    for(const n of t.notes) {
      if(!n || !Number.isInteger(n.key)||n.key<0||n.key>127 || !Number.isFinite(n.at)||n.at<0 || !Number.isFinite(n.length)||n.length<=0 || n.at+n.length>d.beats+1e-8 || (n.velocity!=null&&(!Number.isFinite(n.velocity)||n.velocity<0||n.velocity>1))) return fail("invalid note: use MIDI key 0–127, nonnegative beat, positive length inside the roll, velocity 0–1");
      const fade=fadeSeconds(n.fade==null?0:n.fade), on=eventName(n.on);
      if(fade===null||on===null)return fail("note fade must be 0–300 seconds and trigger must be a simple event name");
      if(on)events.add(on);if(events.size>LIMITS.events)return fail("a roll can hold at most 32 distinct trigger events");
      notes.push({instrument:t.instrument,key:n.key,at:n.at*60/bpm,length:n.length*60/bpm,velocity:n.velocity==null?0.8:n.velocity,fade,on,...(custom?{sample:custom.sample}:{}),...(synth?{synth:synth.synth}:{})});
      if(notes.length>LIMITS.notes) return fail("piano roll exceeds "+LIMITS.notes+" notes");
    }
  }
  const pauses=d.pauses||[];
  if(!Array.isArray(pauses))return fail("pauses must be an array");
  for(const r of pauses)if(!r||r.pause!==true||!Number.isFinite(r.at)||r.at<0||!Number.isFinite(r.length)||r.length<=0||r.at+r.length>d.beats+1e-8||!Number.isInteger(r.track||1)||(r.track||1)<1||(r.track||1)>d.tracks.length)return fail("pause must fit inside its roll and track");
  if(notes.length+pauses.length>LIMITS.notes)return fail("piano roll exceeds "+LIMITS.notes+" notes/pauses");
  notes.sort((a,b)=>a.at-b.at||a.key-b.key);
  return {kind:"roll",duration,settings:d.settings||{bpm,fade:0,on:""},roll:{version:VERSION,bpm,beats:d.beats,duration,notes}};
}
export function retime(source,tempo) {
  if(!source||source.kind!=="roll"||tempo==null)return source;
  if(!Number.isFinite(tempo)||tempo<LIMITS.bpmMin||tempo>LIMITS.bpmMax)return {error:"roll tempo must be 20–400 BPM"};
  const ratio=(source.roll.bpm||120)/tempo, duration=source.duration*ratio;
  if(duration>LIMITS.seconds)return {error:"roll at this tempo exceeds 300 seconds"};
  return {...source,duration,roll:{...source.roll,bpm:tempo,duration,notes:source.roll.notes.map(n=>({...n,at:n.at*ratio,length:n.length*ratio}))}};
}
// Schedule intersections, including notes already held at the slice's start. No source is fetched.
export function schedule(roll, from, to, seconds, pitch, loop, offset = 0) {
  const span=to-from, out=[]; if(!(span>0&&seconds>0&&pitch>0)) return out;
  const cycle=span/pitch, shift=loop?(offset%span)/pitch:offset/pitch, cycles=loop?Math.ceil((seconds+shift)/cycle):1;
  if(cycles>4096) throw Error("Roll loop is too short for this scene");
  for(let c=0;c<cycles;c++) for(const n of roll.notes||[]) {
    if(n.on)continue;
    const start=Math.max(from,n.at), end=Math.min(to,n.at+n.length+CLIPS.ringTail(n));
    const rawAt=c*cycle+(start-from)/pitch-shift, at=Math.max(0,rawAt), skipped=Math.max(0,-rawAt);
    const duration=Math.min((end-start)/pitch-skipped,seconds-at);
    if(!(duration>0) || n.velocity===0) continue;
    out.push({...n,performanceAt:n.performanceAt??n.at,at,duration,age:start-n.at+skipped*pitch});
    if(out.length>4096) throw Error("Roll cue exceeds 4096 scheduled notes; shorten the cue or simplify the roll");
  }
  return out;
}
