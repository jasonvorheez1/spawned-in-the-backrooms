const PIANO=require("lib/pianoroll.js");
// Universal cue metadata and ordinary document references. Pure: no reads or playback.
const DOCUMENT=require("lib/document-reference.js"),NATIVE=require("lib/sound-document.js"),SCENE=require("lib/shootspec.js");
export const VERSION = 6;
const ORIGIN=require("lib/sound-origin.js");
export const SOUND_SECTION_NAMES = ["sound", "audio", "sfx", "sound design"];
export const SOUND_RE = /#\[\s*sound\s*:\s*([^\[\]]*?)\s*\]/gi;
export const DEFAULT_PITCH = 1;
export const DEFAULT_GAIN = 0.8;
export const MAX_CUES = 60;
const SLUG_CAP = 28;
export const CLAUSES = {
  tempo: { words:["tempo","bpm"], takes:"number" },
  fade: { words:["fade"], takes:"time" }, trigger: { words:["trigger"], takes:"event" },
  on: { words:["on"], takes:"event" }, loop: { words:["loop"], takes:"flag" },
  stop: { words:["stop"], takes:"stop" }, pitch: { words:["pitch"], takes:"number" },
  gain: { words:["gain"], takes:"number" }, at: { words:["at"], takes:"time" },
  until: { words:["until"], takes:"time" }, from: { words:["from","start"], takes:"time" },
  to: { words:["to","end"], takes:"time" },
  speaker:{words:["speaker"],takes:"speaker"}, position:{words:["position"],takes:"point"}, range:{words:["range"],takes:"number"},
};
export function s(v) { return v == null ? "" : String(v); }
export function low(v) { return s(v).trim().toLowerCase(); }
export function slug(v) { return low(v).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
export function clauseOf(word) { const w=low(word); for(const k in CLAUSES) if(CLAUSES[k].words.indexOf(w)>=0) return k; return ""; }
export function seconds(value) {
  const v=low(value); let n;
  if (/^\d+(?::[0-5]\d){1,2}(?:\.\d+)?$/.test(v)) n=v.split(":").reduce((a,b)=>a*60+Number(b),0);
  else { const m=v.match(/^(\d+(?:\.\d+)?|\.\d+)(ms|s)?$/); if(!m) return null; n=Number(m[1])/(m[2]==="ms"?1000:1); }
  return Number.isFinite(n) && n>=0 ? n : null;
}
export function parseCue(line){return parseUniversalCue(line);}
export function parseUniversalCue(line) {
  const raw=s(line), match=raw.match(/#\[\s*sound\s*:\s*([^\[\]]*?)\s*\]/i);
  const inner=(raw.indexOf("#[")>=0 ? (match ? match[1] : "") : raw).trim();
  const cue={source:"",sourceKind:"",onShot:"",loop:false,stopShot:"",pitch:DEFAULT_PITCH,gain:DEFAULT_GAIN,fade:0,tempo:null,trigger:"",at:0,until:null,from:0,to:null,speaker:"self",position:null,range:ORIGIN.DEFAULT_RANGE,line:raw.trim().replace(/\s+/g," ").slice(0,140),warnings:[],invalid:false};
  function bad(t) { cue.invalid=true; cue.warnings.push('Sound cue "'+cue.line+'" — '+t+'; left silent.'); }
  const words=inner.replace(/\bposition\s+(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/gi,"position $1,$2,$3").split(/\s+/), first=words.shift()||"";
  if(!first || clauseOf(first)) { bad("name a sound first"); return cue; }
  cue.source=first;
  cue.sourceKind=(DOCUMENT.idOf(first)?"card":(/^\/?cdn\//i.test(first)||/\.(mp3|wav|ogg|flac|m4a|opus)(?:[?#].*)?$/i.test(first)?"path":"word"));
  const seen={};
  for(let i=0;i<words.length;i++) {
    let key=clauseOf(words[i]);
    if(!key) { bad('unknown word "'+words[i]+'"'); continue; }
    if(key==="loop") { cue.loop=true; continue; }
    if(key==="stop") {
      const join=low(words[++i]);
      if(join!=="on"&&join!=="at") { bad('write "stop on <shot>" or "stop at <time>"'); continue; }
      key=join==="on"?"stopShot":"until";
    } else if(key==="on") key="onShot";
    const arg=words[i+1];
    if(!arg || clauseOf(arg)) { bad('missing value after "'+words[i]+'"'); continue; }
    i++;
    if(seen[key]) { bad('duplicate '+key); continue; } seen[key]=true;cue.specified=seen;
    if(key==="speaker") { cue.speaker=low(arg); continue; }
    if(key==="position") {
      const coords=arg.split(",");
      if(coords.length!==3||coords.some(v=>!/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(v)||!Number.isFinite(Number(v)))) bad("position needs X,Y,Z coordinates");
      else cue.position={x:Number(coords[0]),y:Number(coords[1]),z:Number(coords[2])};
      continue;
    }
    if(key==="range") { const n=Number(arg); if(!Number.isFinite(n)||n<=0||n>ORIGIN.MAX_RANGE) bad("range must be above 0 through "+ORIGIN.MAX_RANGE+" metres"); else cue.range=n; continue; }
    if(key==="tempo"){const n=Number(arg);if(!Number.isFinite(n)||n<20||n>400)bad("tempo must be 20–400 BPM");else cue.tempo=n;continue;}
    if(key==="trigger"){const name=PIANO.eventName(arg);if(!name)bad("invalid trigger event");else cue.trigger=name;continue;}
    if(key==="onShot"||key==="stopShot") { cue[key]=arg; continue; }
    if(key==="pitch"||key==="gain") {
      const n=/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(arg)?Number(arg):NaN;
      if(!Number.isFinite(n)||(key==="pitch"&&(n<=0||n>4))) { bad(key+" needs "+(key==="pitch"?"a number above 0 through 4":"a nonnegative number")); continue; }
      cue[key]=key==="gain"?Math.min(1,n):n;
    } else { const n=seconds(arg); if(n===null) bad('invalid time "'+arg+'"'); else cue[key]=n; }
  }
  if(cue.fade>PIANO.LIMITS.seconds)bad("fade must be 0–300 seconds");
  if(cue.trigger&&cue.onShot)bad("choose on OR trigger, not both");
  if(seen.speaker&&seen.position) bad("choose speaker OR position, not both");
  if(cue.to!==null && cue.to<=cue.from) bad("source end must be after source start");
  return cue;
}
// Only top-level, argument-free ordinary links qualify. Set placements and nested targets do not.
export function referencesIn(text){
 const value=s(text),out=[],code=/```[\s\S]*?```|`[^`\r\n]*`/g,ranges=[];let m;
 while((m=code.exec(value)))ranges.push([m.index,code.lastIndex]);
 let i=0;
 while((i=value.indexOf("#[",i))>=0){
  const start=i;let depth=1;i+=2;
  while(i<value.length&&depth){if(value.slice(i,i+2)==="#["){depth++;i+=2;}else if(value[i++]==="]")depth--;}
  if(depth)break;
  const raw=value.slice(start,i),id=DOCUMENT.idOf(raw);
  if(id&&!ranges.some(r=>start>=r[0]&&start<r[1]))out.push({...parseUniversalCue(id),source:id,sourceKind:"card",line:raw,raw,start,end:i,ordinary:true});
 }
 return out;
}
export function linkReferences(track,referenceOf){
 const out={...track,cues:[...(track.cues||[])],warnings:[...(track.warnings||[])],references:[],ordinaryReferences:[...(track.ordinaryReferences||[])]};
 if(typeof referenceOf!=="function"){out.references=track.references||[];return out;}
 for(const ref of track.references||[]){
  let resolved;try{resolved=referenceOf(ref.source);}catch(e){resolved={error:s(e.message||e)};}
  if(!resolved?.ok){out.warnings.push('Reference "'+ref.line+'" — '+(resolved?.error||"document was not loaded")+'; not played.');out.ordinaryReferences.push(ref);}
  else if(resolved.sound&&resolved.source)out.cues.push(ref);
  else out.ordinaryReferences.push(ref);
 }
 if(out.cues.length>MAX_CUES){out.cues.length=MAX_CUES;out.warnings.push("Sound track limit is "+MAX_CUES+" cues; remaining sound references were not played.");}
 out.found=!!(out.found||out.cues.length);return out;
}
export function parseSound(text,options) {
 const o=options||{},out={cues:[],warnings:[],references:[]},re=new RegExp(SOUND_RE.source,"gi");let m;
 let count=0;
 while((m=re.exec(s(text)))) {
  if(++count>MAX_CUES){out.warnings.push("Sound track limit is "+MAX_CUES+" cues; remaining cues were not read.");break;}
  const c=parseCue(m[0]);
  c.raw=m[0];c.start=m.index;c.end=re.lastIndex;
  if(!c.pause)out.cues.push(c);out.warnings.push(...c.warnings);
 }
 if(o.bare!==false)out.references=referencesIn(text);
 return o.referenceOf?linkReferences(out,o.referenceOf):out;
}
export function parseCard(card,options) {
 const out={cues:[],warnings:[],references:[],found:false};if(!card)return out;
 const texts=[];
 for(const sec of card.sections||[]){
  if(/^Instrument:/i.test(s(sec.name))||NATIVE.isNative(sec.content)||NATIVE.isInstrumentRef(sec.content))continue;
  if(SOUND_SECTION_NAMES.indexOf(low(sec.name))>=0)out.found=true;
  texts.push({text:s(sec.content),bare:!SCENE.setNameOf(sec.name),scope:{kind:"section",id:sec.id||"",field:"content"}});
 }
 for(const p of card.pages||[]){
  const content=s(p.body==null?p.content:p.body);
  if(NATIVE.isNative(content)||NATIVE.isInstrumentRef(content))continue;
  texts.push({text:[p.header,content,p.footer].map(s).join("\n"),bare:true,scope:{kind:"page",id:p.id||"",field:"header+content+footer"}});
 }
 for(const item of texts){
  const parsed=parseSound(item.text,{bare:item.bare}),own=c=>({...c,ownerCardId:card.id||"",scope:{...item.scope,bookId:card.bookId||"",cardId:card.id||"",start:c.start,end:c.end}});
  out.cues.push(...parsed.cues.map(own));out.references.push(...parsed.references.map(own));out.warnings.push(...parsed.warnings);
 }
 if(out.cues.length)out.found=true;
 if(out.cues.length>MAX_CUES){out.cues.length=MAX_CUES;out.warnings.push("Sound track limit is "+MAX_CUES+" cues.");}
 return options?.referenceOf?linkReferences(out,options.referenceOf):out;
}
export function identities(shots) {
  var list = Array.isArray(shots) ? shots : [];
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var label = s(list[i] && list[i].label);
    var full = slug(label);
    var capped = full.slice(0, SLUG_CAP);
    out.push({
      index: i,
      ordinal: String(i + 1),
      slugFull: full,
      slugCapped: capped,
      node: "cn-" + (capped || "shot") + "-" + (i + 1),
      target: low(list[i] && list[i].target),
      label: label,
    });
  }
  return out;
}

// Which shot a cue's event names. Tiers, exact before loose: ordinal, then a whole identity, then an identity worn as a node id (cn-…-3), then the tail of a shot's own words ("the-door" naming "close on The Door"). A tier that answers twice is AMBIGUOUS — the first shot holds and the caller says so out loud.
export function matchEvent(token, ids) {
  var want = low(token);
  var out = { index: -1, tied: [] };
  if (!want || !ids.length) return out;

  if (/^\d+$/.test(want)) {
    var n = parseInt(want, 10);
    out.index = n >= 1 && n <= ids.length ? n - 1 : -1;
    return out;
  }

  var w = slug(want);
  if (!w) return out;
  var bare = w.replace(/^cn-/, "").replace(/-\d+$/, "");

  var tiers = [
    function (id) {
      return w === id.node || w === id.slugFull || w === id.slugCapped || (id.target && w === id.target);
    },
    function (id) {
      return bare && (bare === id.slugFull || bare === id.slugCapped);
    },
    function (id) {
      return id.slugFull && (id.slugFull === w || id.slugFull.slice(-(w.length + 1)) === "-" + w);
    },
  ];
  for (var t = 0; t < tiers.length; t++) {
    var hits = [];
    for (var i = 0; i < ids.length; i++) if (tiers[t](ids[i])) hits.push(i);
    if (hits.length) {
      out.index = hits[0];
      out.tied = hits;
      return out;
    }
  }
  return out;
}

export function attach(cues, shots, timing, opts) {
  const o=opts||{}, ids=identities(shots), times=(timing&&timing.times)||[], total=Number(timing&&timing.total)||0;
  const out={cues:[],effects:[],warnings:[]};
  for(let i=0;i<(cues||[]).length;i++) {
    let c=cues[i]; if(!c.source||c.invalid) continue;
    const warn=t=>out.warnings.push('Sound cue "'+(c.line||c.source)+'" — '+t+'.');
    let source=c.inline||(c.sourceKind==="path"?c.source:null);
    if(!source && o.sourceOf) { try { source=o.sourceOf(c); } catch(e) { warn(s(e.message||e)); } }
    if(source&&source.kind==="roll"&&source.settings){const flags=c.specified||{};c={...c,fade:flags.fade?c.fade:source.settings.fade,trigger:flags.trigger||flags.onShot?c.trigger:source.settings.on};}
    if(source&&source.kind==="roll"&&c.tempo!=null)source=PIANO.retime(source,c.tempo);
    if(typeof source==="string") source={kind:"clip",clip:source};
    if(!source || source.error || !(source.clip || source.kind==="roll"&&source.roll)) { warn(source&&source.error || "sound not found; use a native sound-card link, audio path or shelf sound"); continue; }
    if(!ids.length) { warn("there are no shots to time this cue against"); continue; }
    const event=(v)=>{ const hit=matchEvent(v,ids); if(hit.tied.length>1) warn('shot "'+v+'" is ambiguous; the first match holds'); return hit.index; };
    let trigger=c.trigger||"", on=0;
    if(c.onShot){
      if(/^event:/i.test(c.onShot))trigger=PIANO.eventName(c.onShot);
      else on=event(c.onShot);
    }
    if((on<0&&!trigger)||trigger===null) { warn("start shot or trigger not found; left silent"); continue; }
    const stop=c.stopShot?event(c.stopShot):-1;
    if(c.stopShot && stop<0) { warn("stop shot not found; left silent"); continue; }
    const time=trigger?(Number(c.ownerStart)||0):(c.onShot?(Number(times[on])||0):(Number(c.ownerStart)||0))+(c.at||0);
    let until=Math.min(total,c.until==null?total:c.until,stop<0?total:(Number(times[stop])||0));
    const from=c.from||0, duration=Number(source.duration)||0;
    let to=c.to==null?(duration>0?duration:null):c.to;
    if(duration>0 && to>duration) { to=duration; warn("source end clamped to the sound length"); }
    if(to!==null && from>=to) { warn("source range is empty or beyond the sound; left silent"); continue; }
    if(c.loop && source.kind!=="roll" && (from>0 || c.to!=null)) { warn("trimmed file looping is not supported by the engine; remove loop or use a native score"); continue; }
    const pitch=c.pitch||DEFAULT_PITCH;
    if(!trigger && !c.loop && to!==null) until=Math.min(until,time+(to-from)/pitch);
    if(!(until>time)) { warn("stop must be after start and within the scene; left silent"); continue; }
    if(c.ownerStart!=null&&(time<c.ownerStart||time>=c.ownerEnd)) { warn("cue is outside its body's set interval; left silent"); continue; }
    const emitter=o.emitterOf?o.emitterOf(c,time):c.position?{kind:"point",position:c.position,range:c.range}:c.speaker==="screen"?{kind:"screen"}:{kind:"card",cardId:c.speaker==="self"?c.ownerCardId:c.speaker,range:c.range};
    if(!emitter||emitter.error) {warn(emitter&&emitter.error||"speaker could not be resolved; left silent");continue;}
    if(emitter.cutAt!=null) until=Math.min(until,emitter.cutAt);
    if(c.ownerEnd!=null) until=Math.min(until,c.ownerEnd);
    if(!(until>time)) continue;
    const id="sfx-"+(i+1), clip=source.clip||"";
    const params={clip,tempo:c.tempo,volume:c.gain,fade:c.fade||0,trigger,delay:trigger?(c.at||0):0,pitch,loop:!!c.loop,from,to,until,sourceKind:source.kind||"clip",emitter,bus:/\/voice-/i.test(clip)?"Voice":c.loop?"Music":"SFX"};
    if(source.kind==="roll") params.roll=source.roll;
    else if(c.fade){warn("fade currently needs a native score source; left silent");continue;}
    out.effects.push({id,type:c.loop?"musicShift":"playSound",time,duration:until-time,params});
    out.cues.push({id,source:c.source,sourceKind:params.sourceKind,clip,tempo:c.tempo,fade:c.fade||0,trigger,onShot:c.onShot||"",onIndex:on,shot:trigger?"event: "+trigger:c.onShot?ids[on].label:c.ownerStart!=null?"set arrival":"scene start",loop:!!c.loop,stopShot:c.stopShot||"",stopIndex:stop,time,until,from,to,pitch,gain:c.gain,emitter,ownerCardId:c.ownerCardId||"",scope:c.scope,line:c.line});
  }
  return out;
}
export function contract(){return [
 "Ordinary #[card-id] links in cinematic prose play only positively resolved native sound documents. Prose, instrument and asset links remain ordinary references; set sections and placement tails retain their set-piece meaning.",
 "Explicit saved editor metadata wins. Piano requires wws-score plus named Instrument sections. Unsupported arrangements, missing or ambiguous sources warn and stay silent; they never fall back to a shelf sound.",
 "Optional universal metadata: #[sound: <ordinary-card-id|audio-path|shelf-name> [on <shot>] [at <time>] [until <time>] [from <time>] [to <time>] [tempo N] [fade <time>] [trigger <event>] [loop] [stop on <shot>] [pitch N] [gain N] [speaker self|screen|card-id] [position X,Y,Z] [range N]]",
 "Defaults: gain .8, pitch 1, at/from 0, speaker self, range 30; native score settings supply tempo/fade/trigger unless explicitly overridden. No staged body: choose screen, another body, or a fixed point; never a listener fallback.",
 "Body cues keep their owning instance and set interval. Unanchored at is relative to arrival. until/stop-at is absolute scene time. from/to select seconds inside the source; end exclusive. Earliest source/scene/body/explicit stop wins.",
 "Times accept decimals, ms, s, m:ss or h:mm:ss. Negative/backwards timing refuses. on event:<name> or trigger <name> waits for that event; shot anchoring remains explicit.",
 "Trimmed recorded-file looping is refused. Native note ends use the audio clock; recorded stops use the simulation tick. Sample references are never rewritten.",
 "Scores and instruments use native pages and named Instrument metadata. Refer to a saved sound card by its ordinary card ID."
 ].join("\n");}
